#!/usr/bin/env python3
"""Which later PR heads followed a Codex finding: the head before them got an inline comment from Codex.

Usage: codexfix.py DATADIR MIRROR FIRST_DAY LAST_DAY
For every PR with CI in the window, its heads in order (as dup.py finds them). A later head that is not a catch-up
merge counts as "after a Codex finding" when the head before it carries an inline review comment from
chatgpt-codex-connector[bot] (`pulls/N/comments`, matched on commit_id or original_commit_id), and as "after red CI"
when the head before it had a failed Checks or Smokes run; both can hold. Read-only GETs through `gh api`.
"""
import collections
import json
import math
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from analyze import ts  # noqa: E402
from dup import Git, load  # noqa: E402

REPO = "ppericard/coral-id-imr"
CODEX = "chatgpt-codex-connector[bot]"


def gh_all(path):
    out = subprocess.run(["gh", "api", path, "--paginate", "-q", ".[] | @json"], capture_output=True, text=True)
    return [json.loads(l) for l in out.stdout.splitlines() if l.strip()]


d, mirror, first, last = sys.argv[1:5]
g = Git(mirror)
runs = [r for r in load(os.path.join(d, "runs.jsonl"))
        if first <= r["created_at"][:10] <= last and r["event"] == "pull_request" and r["name"] in ("Checks", "Smokes")]
billed = collections.Counter()
ids = {r["id"] for r in runs}
for l in open(os.path.join(d, "jobs.jsonl")):
    j = json.loads(l)
    if j["run_id"] in ids:
        s, e = ts(j["started_at"]), ts(j["completed_at"])
        if s and e and e > s and j.get("runner_name"):
            billed[j["run_id"]] += math.ceil((e - s).total_seconds() / 60)
pulls = collections.defaultdict(list)
for p in load(os.path.join(d, "pulls.jsonl")):
    pulls[p["ref"]].append(p)
bypr = collections.defaultdict(list)
for r in runs:
    for p in pulls.get(r["head_branch"], []):
        if p["created"] <= r["created_at"] and (not p["closed"] or r["created_at"] <= p["closed"]):
            bypr[p["n"]].append(r)
cnt = collections.Counter()
mins = collections.Counter()
for n, rs in sorted(bypr.items()):
    order = []
    for r in sorted(rs, key=lambda r: r["created_at"]):
        if r["head_sha"] not in order:
            order.append(r["head_sha"])
    if len(order) < 2:
        continue
    codex = set()
    for c in gh_all(f"repos/{REPO}/pulls/{n}/comments?per_page=100"):
        if (c.get("user") or {}).get("login") == CODEX:
            codex.add(c.get("commit_id"))
            codex.add(c.get("original_commit_id"))
    red = {r["head_sha"] for r in rs if r["conclusion"] == "failure"}
    for prev, sha in zip(order, order[1:]):
        if g.have(sha):
            ps = g.parents(sha)
            if len(ps) >= 2 and any(g.anc(p, "refs/heads/main") for p in ps[1:]):
                continue
        k = ("codex" if prev in codex else "") + ("+red" if prev in red else "")
        k = k.strip("+") or "neither"
        cnt[k] += 1
        mins[k] += sum(billed[r["id"]] for r in rs if r["head_sha"] == sha)
for k in sorted(cnt):
    print(f"{k}: {cnt[k]} heads, {mins[k]} runner-min")
