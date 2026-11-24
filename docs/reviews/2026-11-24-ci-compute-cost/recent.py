#!/usr/bin/env python3
"""The last full 7 UTC days (today's layout), scaled to 30 days; round-up loss; per-run medians.

Usage: recent.py DATADIR FIRST_DAY LAST_DAY   (inclusive UTC days, e.g. 2026-11-17 2026-11-23)
"""
import collections
import datetime as dt
import json
import math
import os
import statistics
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from analyze import trigger, wfname, ts  # noqa: E402

RATE = 0.006
d, first, last = sys.argv[1], sys.argv[2], sys.argv[3]
days = (dt.date.fromisoformat(last) - dt.date.fromisoformat(first)).days + 1
runs = {json.loads(l)["id"]: json.loads(l) for l in open(os.path.join(d, "runs.jsonl"))}
per_run = collections.Counter()
raw_run = collections.Counter()
agg = collections.defaultdict(lambda: [0, 0.0])
loss = collections.defaultdict(lambda: [0, 0.0])
for l in open(os.path.join(d, "jobs.jsonl")):
    j = json.loads(l)
    r = runs.get(j["run_id"])
    if not r or not (first <= r["created_at"][:10] <= last):
        continue
    s, e = ts(j["started_at"]), ts(j["completed_at"])
    if not s or not e or e <= s or not j.get("runner_name"):
        continue
    secs = (e - s).total_seconds()
    b = math.ceil(secs / 60)
    per_run[j["run_id"]] += b
    raw_run[j["run_id"]] += secs / 60
    k = (wfname(r), trigger(r))
    agg[k][0] += b
    agg[k][1] += secs / 60
    loss[wfname(r)][0] += b
    loss[wfname(r)][1] += secs / 60
tot = sum(v[0] for v in agg.values())
print(f"{first}..{last} ({days} days): billed {tot} min, ${tot * RATE:.2f}; per 30 days {tot * 30 / days:.0f} min, "
      f"${tot * 30 / days * RATE:.2f}")
print("\n| workflow / trigger | billed min (7 d) | per 30 d | $ per 30 d |\n|---|---:|---:|---:|")
for k, (b, raw) in sorted(agg.items(), key=lambda kv: -kv[1][0]):
    if b >= 20:
        print(f"| {k[0]} / {k[1]} | {b} | {b * 30 / days:.0f} | {b * 30 / days * RATE:.2f} |")
print("\nround-up loss (billed - raw) by workflow, these days:")
for k, (b, raw) in sorted(loss.items(), key=lambda kv: -kv[1][0]):
    if b >= 20:
        print(f"  {k}: billed {b}, raw {raw:.0f}, loss {b - raw:.0f} ({100 * (b - raw) / b:.0f}%)")
print("\nper-run billed minutes (median, p10-p90, n), successful runs, these days:")
groups = collections.defaultdict(list)
for rid, b in per_run.items():
    r = runs[rid]
    if r["conclusion"] == "success":
        groups[(wfname(r), trigger(r))].append(b)
for k, v in sorted(groups.items(), key=lambda kv: -len(kv[1])):
    if len(v) >= 5:
        v.sort()
        print(f"  {k[0]} / {k[1]}: median {statistics.median(v)}, p10 {v[len(v) // 10]}, p90 {v[9 * len(v) // 10]}, n {len(v)}")
