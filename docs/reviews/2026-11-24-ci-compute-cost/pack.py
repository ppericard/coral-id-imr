#!/usr/bin/env python3
"""Replay Smokes runs with today's 17 jobs packed into fewer runners: billed minutes before and after, longest job.

Usage: pack.py DATADIR FIRST_DAY LAST_DAY [SETUP_S]
A packed runner runs its smokes one after the other and pays one setup (SETUP_S seconds, default 15, the median of
checkout + setup-node + setup-python + cache + install measured on 30 runs) instead of one per smoke.
"""
import collections
import json
import math
import os
import statistics
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from analyze import ts  # noqa: E402

BINS = [
    ["fish fresh"], ["pages rest"], ["admin 1280 rest"], ["admin 1280 main"],
    ["admin 1280 photos", "live"], ["pages main", "draw"], ["fish main", "staged", "profiles"],
    ["pages overlays", "pending"], ["net", "admin 390"], ["seaslug", "pages more"],
]
SHORT = [  # only the four short smokes share a runner; the 13 others stay alone
    ["fish fresh"], ["pages rest"], ["admin 1280 rest"], ["admin 1280 main"], ["admin 1280 photos"], ["pages main"],
    ["fish main"], ["pages overlays"], ["pending"], ["net"], ["admin 390"], ["seaslug"], ["pages more"],
    ["draw", "profiles", "live", "staged"],
]
if len(sys.argv) > 5 and sys.argv[5] == "short":
    BINS = SHORT
NAMES = {n for b in BINS for n in b}
d, first, last = sys.argv[1], sys.argv[2], sys.argv[3]
setup = float(sys.argv[4]) if len(sys.argv) > 4 else 15.0
runs = {}
for l in open(os.path.join(d, "runs.jsonl")):
    r = json.loads(l)
    if r["name"] == "Smokes" and first <= r["created_at"][:10] <= last and r["conclusion"] == "success":
        runs[r["id"]] = r
jobs = collections.defaultdict(dict)
for l in open(os.path.join(d, "jobs.jsonl")):
    j = json.loads(l)
    if j["run_id"] in runs and j["name"].startswith("smoke (") and j["run_attempt"] == runs[j["run_id"]]["run_attempt"]:
        s, e = ts(j["started_at"]), ts(j["completed_at"])
        if s and e and e > s:
            jobs[j["run_id"]][j["name"][7:-1]] = (e - s).total_seconds()
before, after, longest_b, longest_a, n = 0, 0, [], [], 0
for rid, js in jobs.items():
    if set(js) != NAMES:
        continue
    n += 1
    before += sum(math.ceil(t / 60) for t in js.values())
    longest_b.append(max(js.values()))
    packed = [sum(js[x] for x in b) - setup * (len(b) - 1) for b in BINS]
    after += sum(math.ceil(t / 60) for t in packed)
    longest_a.append(max(packed))
print(f"{n} Smokes runs with the 17 current jobs; billed {before} -> {after} min ({100 * (before - after) / before:.1f}% less); "
      f"per run {before / n:.1f} -> {after / n:.1f}; longest job median {statistics.median(longest_b):.0f} s -> "
      f"{statistics.median(longest_a):.0f} s, p90 {sorted(longest_b)[9 * n // 10]:.0f} -> {sorted(longest_a)[9 * n // 10]:.0f} s")
