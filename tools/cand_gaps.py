#!/usr/bin/env python3
"""Genera with few candidate photos waiting (cand.json), so Pierre can be reminded to run the candidate search.

Pierre, 2026-11-02: the search for new candidates (tools/fetch_local.py) runs on request, not on a schedule; the agent
reminds him when a genus runs short. Run it at the start of a working session and in recaps; if it lists genera,
say so to Pierre and offer to run the search for them. It only reads cand.json, data.json and curation.json.

Usage: python3 tools/cand_gaps.py [MIN]   (MIN: candidates waiting under which a genus is listed; default 5)
"""
import collections
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
from excluded import excluded  # noqa: E402  (photos Pierre excluded for good)


def gaps(minimum=5):
    cand = json.loads((ROOT / "cand.json").read_text())["cand"]
    slate = list(json.loads((ROOT / "data.json").read_text())["gen"])
    # Waiting = not decided yet, as fetch_local.py counts them (Codex review #365): not added, not rejected
    # (curation.json seen 'cand:f'), not sent away (out), not excluded.
    cur = json.loads((ROOT / "curation.json").read_text())
    gens = (cur.get("genera") or {}).values()
    added = {f for k in gens for f in (k.get("add") or {})}
    gone = {f for k in gens for f in (k.get("out") or {})} | {k[5:] for k in (cur.get("seen") or {}) if k.startswith("cand:")}
    out = []
    for g in slate:
        waiting = [p for p in cand.get(g, []) if p["f"] not in added and p["f"] not in gone and not excluded(p["f"])]
        if len(waiting) < minimum:
            views = collections.Counter(p.get("vg", "unsorted") for p in waiting)
            out.append((g, len(waiting), dict(views)))
    return sorted(out, key=lambda r: r[1])


if __name__ == "__main__":
    m = int(sys.argv[1]) if len(sys.argv) > 1 else 5
    rows = gaps(m)
    if not rows:
        print(f"Every slate genus has {m} or more candidates waiting.")
    for g, n, views in rows:
        print(f"{g}: {n} waiting {views if views else ''}".rstrip())
