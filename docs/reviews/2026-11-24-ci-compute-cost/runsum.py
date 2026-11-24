#!/usr/bin/env python3
"""Count runs by workflow, event, branch class and actor. Usage: runsum.py DATADIR"""
import collections
import json
import os
import sys

d = sys.argv[1]
runs = [json.loads(l) for l in open(os.path.join(d, "runs.jsonl"))]
c = collections.Counter()
a = collections.Counter()
pr_empty = collections.Counter()
for r in runs:
    br = r["head_branch"] or ""
    cls = "train" if br.startswith("train/") else ("main" if br == "main" else "other")
    c[(r["name"], r["event"], cls)] += 1
    a[(r["name"], r["actor"])] += 1
    if r["event"] == "pull_request":
        pr_empty[bool(r["pull_requests"])] += 1
print("runs", len(runs), "first", min(r["created_at"] for r in runs), "last", max(r["created_at"] for r in runs))
for k, v in sorted(c.items(), key=lambda kv: -kv[1]):
    print(v, *k, sep="\t")
print("\nactors")
for k, v in sorted(a.items(), key=lambda kv: -kv[1])[:40]:
    print(v, *k, sep="\t")
print("\npull_request runs with a PR number:", dict(pr_empty))
