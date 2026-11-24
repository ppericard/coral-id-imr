#!/usr/bin/env python3
"""Setup time against test time per job, on a sample of recent successful runs of a workflow.

Usage: steps.py WORKFLOW_FILE N   (e.g. smokes.yml 40). Read-only GETs through `gh api`.
For each job name: median job seconds, median seconds of each step, and the median rounding loss (billed - raw).
"""
import collections
import datetime as dt
import json
import math
import statistics
import subprocess
import sys

REPO = "ppericard/coral-id-imr"


def gh(path):
    return json.loads(subprocess.run(["gh", "api", path], capture_output=True, text=True, check=True).stdout)


def secs(a, b):
    if not a or not b:
        return 0.0
    f = lambda s: dt.datetime.fromisoformat(s.replace("Z", "+00:00"))
    return max(0.0, (f(b) - f(a)).total_seconds())


def main():
    wf, n = sys.argv[1], int(sys.argv[2])
    runs = gh(f"repos/{REPO}/actions/workflows/{wf}/runs?status=success&per_page={n}")["workflow_runs"]
    job_t = collections.defaultdict(list)
    step_t = collections.defaultdict(lambda: collections.defaultdict(list))
    loss = collections.defaultdict(list)
    for r in runs:
        for j in gh(f"repos/{REPO}/actions/runs/{r['id']}/jobs?per_page=100")["jobs"]:
            t = secs(j["started_at"], j["completed_at"])
            if t == 0:
                continue
            job_t[j["name"]].append(t)
            loss[j["name"]].append(math.ceil(t / 60) * 60 - t)
            for s in j.get("steps") or []:
                step_t[j["name"]][s["name"][:60]].append(secs(s["started_at"], s["completed_at"]))
    print(f"{wf}: {len(runs)} runs")
    allsteps = collections.defaultdict(list)
    for name in sorted(job_t, key=lambda k: -statistics.median(job_t[k])):
        print(f"\n{name}: job median {statistics.median(job_t[name]):.0f} s, billed-raw median "
              f"{statistics.median(loss[name]):.0f} s, n={len(job_t[name])}")
        for s, v in step_t[name].items():
            m = statistics.median(v)
            allsteps[s].append(m)
            if m >= 1:
                print(f"   {m:6.1f}  {s}")
    print("\nsum of step medians over jobs:")
    for s, v in sorted(allsteps.items(), key=lambda kv: -sum(kv[1])):
        print(f"   {sum(v):7.1f}  {s}")


if __name__ == "__main__":
    main()
