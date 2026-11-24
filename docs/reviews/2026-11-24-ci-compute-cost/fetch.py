#!/usr/bin/env python3
"""Fetch this month's workflow runs for the CI compute cost study (their jobs: jobs.py).

Usage: fetch.py OUTDIR [FIRST_DAY LAST_DAY]   (days as YYYY-MM-DD, UTC)
Writes OUTDIR/runs.jsonl. Read-only: GET requests through `gh api` only.
"""
import datetime as dt
import json
import os
import subprocess
import sys

REPO = "ppericard/coral-id-imr"


def gh(path):
    out = subprocess.run(["gh", "api", path], capture_output=True, text=True)
    if out.returncode != 0:
        raise RuntimeError(f"{path}: {out.stderr.strip()}")
    return json.loads(out.stdout)


def runs_window(start, end):
    """Every run created in [start, end] (ISO timestamps); splits the window when it holds 1000 runs or more."""
    q = f"repos/{REPO}/actions/runs?per_page=100&created={start}..{end}"
    first = gh(q + "&page=1")
    total = first["total_count"]
    if total >= 1000:
        a = dt.datetime.fromisoformat(start.replace("Z", "+00:00"))
        b = dt.datetime.fromisoformat(end.replace("Z", "+00:00"))
        mid = a + (b - a) / 2
        fmt = "%Y-%m-%dT%H:%M:%SZ"
        return runs_window(start, mid.strftime(fmt)) + runs_window((mid + dt.timedelta(seconds=1)).strftime(fmt), end)
    runs = list(first["workflow_runs"])
    page = 2
    while len(runs) < total:
        got = gh(q + f"&page={page}")["workflow_runs"]
        if not got:
            break
        runs += got
        page += 1
    return runs


def main():
    outdir = sys.argv[1]
    first = sys.argv[2] if len(sys.argv) > 2 else "2026-11-01"
    last = sys.argv[3] if len(sys.argv) > 3 else dt.date.today().isoformat()
    os.makedirs(outdir, exist_ok=True)
    day = dt.date.fromisoformat(first)
    stop = dt.date.fromisoformat(last)
    runs = []
    while day <= stop:
        got = runs_window(f"{day}T00:00:00Z", f"{day}T23:59:59Z")
        print(day, len(got), file=sys.stderr)
        runs += got
        day += dt.timedelta(days=1)
    seen, uniq = set(), []
    for r in runs:
        if r["id"] not in seen:
            seen.add(r["id"])
            uniq.append(r)
    keep = ("id", "name", "path", "event", "head_branch", "head_sha", "status", "conclusion", "created_at",
            "updated_at", "run_started_at", "run_attempt", "actor", "triggering_actor", "pull_requests")
    with open(os.path.join(outdir, "runs.jsonl"), "w") as f:
        for r in uniq:
            row = {k: r.get(k) for k in keep}
            row["actor"] = (r.get("actor") or {}).get("login")
            row["triggering_actor"] = (r.get("triggering_actor") or {}).get("login")
            row["pull_requests"] = [p.get("number") for p in r.get("pull_requests") or []]
            f.write(json.dumps(row) + "\n")
    print("runs", len(uniq), file=sys.stderr)


if __name__ == "__main__":
    main()
