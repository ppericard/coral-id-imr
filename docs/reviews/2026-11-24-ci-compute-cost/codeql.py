#!/usr/bin/env python3
"""CodeQL and Deploy minutes split by what the commit changed: docs only, data only (no .js/.py/workflow), or code.

Usage: codeql.py DATADIR MIRROR FIRST_DAY LAST_DAY
"""
import collections
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from analyze import ts, wfname, trigger  # noqa: E402
from dup import Git, docs_only  # noqa: E402

CODE_EXT = (".js", ".mjs", ".cjs", ".ts", ".py", ".yml", ".yaml", ".html", ".gs")


def kind(files):
    if docs_only(files):
        return "docs only"
    if not any(f.endswith(CODE_EXT) for f in files):
        return "no JS/Python/workflow/HTML file"
    return "code"


d, mirror, first, last = sys.argv[1:5]
g = Git(mirror)
runs = {}
for l in open(os.path.join(d, "runs.jsonl")):
    r = json.loads(l)
    if first <= r["created_at"][:10] <= last:
        runs[r["id"]] = r
billed = collections.Counter()
for l in open(os.path.join(d, "jobs.jsonl")):
    j = json.loads(l)
    if j["run_id"] not in runs:
        continue
    s, e = ts(j["started_at"]), ts(j["completed_at"])
    if s and e and e > s and j.get("runner_name"):
        billed[j["run_id"]] += math.ceil((e - s).total_seconds() / 60)
agg = collections.Counter()
n = collections.Counter()
for rid, r in runs.items():
    w = wfname(r)
    t = trigger(r)
    if w not in ("dynamic: github-code-scanning", "Deploy Pages", "Checks") or t not in ("PR push", "main push"):
        continue
    sha = r["head_sha"]
    if not g.have(sha):
        k = "commit not found"
    elif t == "main push":
        ps = g.parents(sha)
        k = kind(g.files(ps[0], sha)) if ps else "root"
    else:
        rc, base = g.run("merge-base", "refs/heads/main", sha)
        k = kind(g.files(base, sha)) if rc == 0 else "no merge base"
    agg[(w, t, k)] += billed[rid]
    n[(w, t, k)] += 1
for key in sorted(agg):
    print(*key, n[key], agg[key], sep="\t")
