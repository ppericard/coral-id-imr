#!/usr/bin/env python3
"""What is paid twice: PR heads, catch-up merges, trains, docs-only trains, superseded runs.

Usage: dup.py DATADIR MIRROR [FIRST_DAY LAST_DAY]   (runs.jsonl, jobs.jsonl and pulls.jsonl; MIRROR: a bare blobless
clone holding the PR heads (refs/pull/*), main and the train branches; a missing commit is fetched by SHA). The
optional UTC days limit the runs read. Read-only.
"""
import collections
import datetime as dt
import fnmatch
import json
import math
import os
import subprocess
import sys

RATE = 0.006
DOCS = ("docs/*", ".github/pull_request_template.md", "LICENSE")  # smokes.yml paths-ignore; '*.md' at the root below


def ts(s):
    return dt.datetime.fromisoformat(s.replace("Z", "+00:00")) if s else None


def load(path):
    with open(path) as f:
        return [json.loads(line) for line in f if line.strip()]


class Git:
    def __init__(self, d):
        self.d = d
        self.missing = set()

    def run(self, *a):
        r = subprocess.run(["git", "-C", self.d, *a], capture_output=True, text=True)
        return r.returncode, r.stdout.strip()

    def have(self, sha):
        if sha in self.missing:
            return False
        if self.run("cat-file", "-e", sha + "^{commit}")[0] == 0:
            return True
        self.run("fetch", "-q", "origin", sha)
        if self.run("cat-file", "-e", sha + "^{commit}")[0] == 0:
            return True
        self.missing.add(sha)
        return False

    def parents(self, sha):
        return self.run("rev-list", "--parents", "-n1", sha)[1].split()[1:]

    def subject(self, sha):
        return self.run("log", "-1", "--format=%s", sha)[1]

    def anc(self, a, b):
        return self.run("merge-base", "--is-ancestor", a, b)[0] == 0

    def tree(self, sha):
        return self.run("rev-parse", sha + "^{tree}")[1]

    def files(self, a, b):
        return [f for f in self.run("diff", "--name-only", a, b)[1].splitlines() if f]


def docs_only(files):
    if not files:
        return True
    for f in files:
        if "/" not in f and f.endswith(".md"):
            continue
        if any(fnmatch.fnmatch(f, p) for p in DOCS):
            continue
        return False
    return True


def main():
    d, mirror = sys.argv[1], sys.argv[2]
    g = Git(mirror)
    allruns = {r["id"]: r for r in load(os.path.join(d, "runs.jsonl"))}
    first, last = (sys.argv[3], sys.argv[4]) if len(sys.argv) > 4 else ("0000", "9999")

    def win(r):  # the optional window of UTC days, inclusive: what is counted (a PR's history is read whole)
        return first <= r["created_at"][:10] <= last

    runs = {k: r for k, r in allruns.items() if win(r)}
    billed = collections.Counter()
    for j in load(os.path.join(d, "jobs.jsonl")):
        s, e = ts(j["started_at"]), ts(j["completed_at"])
        if s and e and e > s and j.get("runner_name"):
            billed[j["run_id"]] += math.ceil((e - s).total_seconds() / 60)
    out = {}

    # ---- PR pushes: heads per PR, what each new head was ----
    ci = ("Checks", "Smokes")
    prruns = [r for r in allruns.values() if r["event"] == "pull_request" and r["name"] in ci]
    # pull_requests is empty once a PR is merged, and one session branch carried many PRs in turn: a run belongs to
    # the PR of its branch that was open when the run was created (pulls.jsonl: number, ref, created, closed).
    pulls = collections.defaultdict(list)
    for p in load(os.path.join(d, "pulls.jsonl")):
        pulls[p["ref"]].append(p)
    unmatched = 0
    bypr = collections.defaultdict(list)
    for r in prruns:
        key = None
        for p in pulls.get(r["head_branch"], []):
            if p["created"] <= r["created_at"] and (not p["closed"] or r["created_at"] <= p["closed"]):
                key = p["n"]
        if key is None:
            unmatched += 1
            key = "branch:" + (r["head_branch"] or "?")
        bypr[key].append(r)
    out["PR runs not matched to a PR"] = unmatched
    cat = collections.Counter()  # minutes by head kind
    heads_kind = collections.Counter()
    sup = collections.Counter()  # superseded heads: cancelled vs completed minutes
    docs_pr_smokes = [0, 0]
    head_counts = []
    counted = set()
    for key, allrs in bypr.items():
        order = []
        for r in sorted(allrs, key=lambda r: r["created_at"]):
            if r["head_sha"] not in order:
                order.append(r["head_sha"])
        rs = [r for r in allrs if win(r)]
        if not rs:
            continue
        counted.add(key)
        head_counts.append(len({r["head_sha"] for r in rs}))
        final = order[-1]
        for i, sha in enumerate(order):
            if not any(r["head_sha"] == sha for r in rs):
                continue
            mins = sum(billed[r["id"]] for r in rs if r["head_sha"] == sha)
            if i == 0:
                kind = "first head"
            elif not g.have(sha):
                kind = "later head (commit not found)"
            else:
                ps = g.parents(sha)
                if len(ps) >= 2 and any(g.anc(p, "refs/heads/main") for p in ps[1:]):
                    kind = "later head: merge of main"
                else:
                    kind = "later head: fix or other push"
            cat[kind] += mins
            heads_kind[kind] += 1
            if sha != final:
                for r in rs:
                    if r["head_sha"] == sha:
                        sup[(r["name"], r["conclusion"])] += billed[r["id"]]
        for r in rs:
            if r["name"] == "Smokes" and g.have(r["head_sha"]):
                rc, base = g.run("merge-base", "refs/heads/main", r["head_sha"])
                if rc == 0 and docs_only(g.files(base, r["head_sha"])):
                    docs_pr_smokes[0] += 1
                    docs_pr_smokes[1] += billed[r["id"]]
    out["prs"] = len(counted)
    out["heads per PR"] = collections.Counter(head_counts)
    out["PR CI minutes by head kind"] = dict(cat)
    out["heads by kind"] = dict(heads_kind)
    out["superseded-head minutes (workflow, conclusion)"] = {f"{k[0]}/{k[1]}": v for k, v in sup.items()}
    out["Smokes runs on docs-only PR heads (n, min)"] = docs_pr_smokes

    # ---- trains ----
    trains = collections.defaultdict(list)
    for r in runs.values():
        if r["event"] == "push" and (r["head_branch"] or "").startswith("train/"):
            trains[r["head_sha"]].append(r)
    tstats = collections.Counter()
    tmin = collections.Counter()
    sametree = [0, 0, 0]
    sametree_smokes = [0, 0]
    union = [0, 0, 0, 0]
    npr = collections.Counter()
    for sha, rs in trains.items():
        m = {r["name"]: billed[r["id"]] for r in rs}
        allm = sum(billed[r["id"]] for r in rs)
        concl = "green" if all(r["conclusion"] == "success" for r in rs) else "not green"
        if not g.have(sha):
            tstats["train commit not found"] += 1
            tmin["not found"] += allm
            continue
        heads, cur = [], sha
        while g.subject(cur).startswith("Train: "):
            ps = g.parents(cur)
            heads.append(ps[1])
            cur = ps[0]
        base = cur
        npr[len(heads)] += 1
        kind = "docs-only" if docs_only(g.files(base, sha)) else "code"
        tstats[f"{kind} {concl}"] += 1
        tmin[f"{kind} {concl} Checks"] += m.get("Checks", 0)
        tmin[f"{kind} {concl} Smokes"] += m.get("Smokes", 0)
        if len(heads) == 1:
            # The PR's last CI on this head tested GitHub's merge of the head into main as it was then; the train
            # tested the head merged into `base`. Same tree when main had not moved in between.
            sametree[0] += 1
            prci = [r for r in prruns if r["head_sha"] == heads[0] and r["name"] == "Checks"]
            if prci:
                t = max(r["created_at"] for r in prci)
                main_then = g.run("rev-list", "-1", "--first-parent", f"--before={t}", "refs/heads/main")[1]
                if main_then == base:
                    sametree[1] += 1
                    sametree[2] += allm
                    sametree_smokes[0] += m.get("Smokes", 0)
                    # what the PR head's own CI cost on that head (the run the train repeated)
                    sametree_smokes[1] += sum(billed[r["id"]] for r in prruns if r["head_sha"] == heads[0])
                    union[1] += allm
                    union[3] += m.get("Smokes", 0) if kind == "docs-only" else 0
                    continue
        if kind == "docs-only":
            union[0] += m.get("Smokes", 0)
    out["union: docs-only train Smokes (not same-tree); same-tree train all; overlap docs-only same-tree Smokes"] = [
        union[0], union[1], union[3]]
    out["train commits"] = len(trains)
    out["PRs per train"] = dict(npr)
    out["trains by kind"] = dict(tstats)
    out["train minutes"] = dict(tmin)
    out["single-PR trains; of them main unmoved since the PR's last Checks (same tree); their train minutes"] = sametree
    out["same-tree trains: their Smokes minutes; the PR-head CI minutes on those heads"] = sametree_smokes
    for k, v in out.items():
        print(f"{k}: {v}")


if __name__ == "__main__":
    main()
