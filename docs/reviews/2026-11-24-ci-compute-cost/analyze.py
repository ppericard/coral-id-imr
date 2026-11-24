#!/usr/bin/env python3
"""Sum this month's Actions job minutes for the CI compute cost study.

Usage: analyze.py DATADIR   (reads runs.jsonl and jobs.jsonl written by fetch.py; prints Markdown-ish tables)
Billed minutes follow GitHub's rule: each job's duration rounded up to a whole minute
(https://docs.github.com/en/billing/reference/actions-runner-pricing). Raw minutes are the unrounded sum.
"""
import collections
import datetime as dt
import json
import math
import os
import re
import sys

RATE = 0.006  # Linux 2-core x64, the standard private-repository runner


def ts(s):
    return dt.datetime.fromisoformat(s.replace("Z", "+00:00")) if s else None


def load(path):
    with open(path) as f:
        return [json.loads(line) for line in f if line.strip()]


def wfname(run):
    path = run.get("path") or ""
    if path.startswith("dynamic/"):
        return "dynamic: " + path.split("/")[1]  # github-code-scanning, pages, dependabot, copilot-swe-agent, agents
    return run.get("name") or "?"


def trigger(run):
    ev, br = run["event"], run["head_branch"] or ""
    actor = run.get("actor") or ""
    name = run.get("name") or ""
    if ev == "dynamic":
        if name.startswith("PR #"):
            return "PR push"
        if name.startswith("Push on main"):
            return "main push"
        if br.startswith("train/"):
            return "train push"
        return "dynamic other: " + re.sub(r"[#\d]+", "", name).strip()[:40]
    if actor.endswith("[bot]") and actor not in ("github-actions[bot]",):
        return f"bot:{actor}"
    if ev in ("pull_request", "pull_request_target"):
        return "PR push"
    if ev == "push" and br.startswith("train/"):
        return "train push"
    if ev == "push" and br == "main":
        return "main push"
    if ev == "push":
        return f"push other ({'release' if br == 'release' else 'branch'})"
    return ev


def jobkey(name):
    name = re.sub(r"\s+", " ", name)
    return name


def main():
    d = sys.argv[1]
    runs = {r["id"]: r for r in load(os.path.join(d, "runs.jsonl"))}
    jobs = load(os.path.join(d, "jobs.jsonl"))
    rows = []
    for j in jobs:
        s, e = ts(j["started_at"]), ts(j["completed_at"])
        if not s or not e or e < s:
            secs = 0.0
        else:
            secs = (e - s).total_seconds()
        # A job skipped by its `if` has started == completed and no runner: GitHub bills nothing for it.
        billed = 0 if secs == 0 or not j.get("runner_name") else math.ceil(secs / 60)
        r = runs.get(j["run_id"], {})
        rows.append(dict(j=j, r=r, secs=secs, billed=billed))
    tot_b = sum(x["billed"] for x in rows)
    tot_raw = sum(x["secs"] for x in rows) / 60
    print(f"runs {len(runs)}, jobs {len(jobs)}, billed min {tot_b}, raw min {tot_raw:.0f}, "
          f"x$0.006 = ${tot_b * RATE:.2f}; $1012.20/billed = {1012.20 / tot_b:.5f} $/min")

    def table(title, keyf, top=None):
        agg = collections.defaultdict(lambda: [0, 0, 0.0, set()])
        for x in rows:
            k = keyf(x)
            a = agg[k]
            a[0] += 1
            a[1] += x["billed"]
            a[2] += x["secs"] / 60
            a[3].add(x["j"]["run_id"])
        print(f"\n## {title}\n| key | runs | jobs | billed min | raw min | share | $ at 0.006 |")
        print("|---|---:|---:|---:|---:|---:|---:|")
        items = sorted(agg.items(), key=lambda kv: -kv[1][1])
        for k, (n, b, raw, rs) in items[:top] if top else items:
            print(f"| {k} | {len(rs)} | {n} | {b} | {raw:.0f} | {100 * b / tot_b:.1f}% | {b * RATE:.2f} |")

    table("By workflow", lambda x: wfname(x["r"]))
    table("By trigger", lambda x: trigger(x["r"]))
    table("By workflow x trigger", lambda x: f"{wfname(x["r"])} / {trigger(x['r'])}")
    table("By job (top 40)", lambda x: f"{wfname(x["r"])}: {jobkey(x['j']['name'])}", top=40)
    table("By runner labels", lambda x: ",".join(x["j"].get("labels") or []) or "(none)")
    table("By runner group", lambda x: x["j"].get("runner_group_name") or "(none)")
    table("By conclusion", lambda x: f"{wfname(x["r"])} / {x['j'].get('conclusion')}", top=30)
    table("By run attempt", lambda x: f"attempt {x['j'].get('run_attempt')}")
    table("By UTC day", lambda x: (x["j"].get("started_at") or "????-??-??")[:10])


if __name__ == "__main__":
    main()
