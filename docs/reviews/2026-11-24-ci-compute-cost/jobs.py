#!/usr/bin/env python3
"""Fetch the jobs (all attempts) of every run in runs.jsonl, resumable, pausing at GitHub's rate limit.

Usage: jobs.py DATADIR   (appends to DATADIR/jobs_by_run.jsonl, skips runs already there; writes DATADIR/jobs.jsonl
at the end). Read-only GETs through `gh api`.
"""
import json
import os
import subprocess
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor

REPO = "ppericard/coral-id-imr"
JKEEP = ("id", "run_id", "run_attempt", "name", "status", "conclusion", "created_at", "started_at", "completed_at",
         "labels", "runner_name", "runner_group_name", "workflow_name", "head_branch")
lock = threading.Lock()


def gh(path):
    for attempt in range(6):
        out = subprocess.run(["gh", "api", path], capture_output=True, text=True)
        if out.returncode == 0:
            return json.loads(out.stdout)
        err = out.stderr
        if "rate limit" in err.lower() or "403" in err or "429" in err:
            with lock:
                rl = json.loads(subprocess.run(["gh", "api", "rate_limit"], capture_output=True, text=True).stdout)
                reset = rl["resources"]["core"]["reset"]
                wait = max(5, reset - time.time() + 5)
                print(f"rate limit: waiting {wait:.0f} s", file=sys.stderr, flush=True)
                time.sleep(wait)
            continue
        if "404" in err:
            return None
        time.sleep(2 * (attempt + 1))
    raise RuntimeError(f"{path}: {err}")


def jobs_of(run_id):
    jobs, page = [], 1
    while True:
        got = gh(f"repos/{REPO}/actions/runs/{run_id}/jobs?filter=all&per_page=100&page={page}")
        if got is None:
            return None
        jobs += got["jobs"]
        if len(jobs) >= got["total_count"] or not got["jobs"]:
            return jobs
        page += 1


def main():
    d = sys.argv[1]
    runs = [json.loads(l) for l in open(os.path.join(d, "runs.jsonl"))]
    part = os.path.join(d, "jobs_by_run.jsonl")
    done = set()
    if os.path.exists(part):
        for l in open(part):
            try:
                done.add(json.loads(l)["run_id"])
            except ValueError:
                pass
    todo = [r["id"] for r in runs if r["id"] not in done]
    print(f"{len(done)} done, {len(todo)} to fetch", file=sys.stderr, flush=True)
    count = [0]

    def one(rid):
        jobs = jobs_of(rid)
        row = {"run_id": rid, "missing": jobs is None,
               "jobs": [{k: j.get(k) for k in JKEEP} for j in (jobs or [])]}
        with lock:
            with open(part, "a") as f:
                f.write(json.dumps(row) + "\n")
            count[0] += 1
            if count[0] % 500 == 0:
                print(f"{count[0]} fetched", file=sys.stderr, flush=True)

    with ThreadPoolExecutor(max_workers=8) as ex:
        list(ex.map(one, todo))
    n = 0
    with open(os.path.join(d, "jobs.jsonl"), "w") as f:
        seen = set()
        for l in open(part):
            row = json.loads(l)
            if row["run_id"] in seen:
                continue
            seen.add(row["run_id"])
            for j in row["jobs"]:
                f.write(json.dumps(j) + "\n")
                n += 1
    print(f"jobs {n}", file=sys.stderr, flush=True)


if __name__ == "__main__":
    main()
