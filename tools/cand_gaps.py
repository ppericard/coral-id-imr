#!/usr/bin/env python3
"""Genera short of candidate photos, so Pierre can be reminded to run the candidate search.

Pierre, 2026-11-02: the search for new candidates (tools/fetch_local.py) runs on request, not on a schedule; the agent
reminds him when a genus runs short. Run this at the start of a working session and in recaps; if it lists genera,
say so to Pierre and offer to run the search for them. A short genus is only listed when iNaturalist still has
something the search would take, near Dauin or elsewhere in the Philippines (the search goes no further for now;
Pierre: no reminder when it cannot find anything better). It reads cand.json, data.json and curation.json, and asks
iNaturalist (read only) about the short genera; --offline skips that and lists every short genus.

Usage: python3 tools/cand_gaps.py [MIN] [--offline]   (MIN: candidates waiting under which a genus is short; default 5)
"""
import collections
import json
import re
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
from datajson import load_all  # noqa: E402  (data.json + cand.json, as fetch_local.py reads them)
from excluded import excluded, set_aside  # noqa: E402  (photos Pierre excluded for good, set aside by the pre-sort)
from genera import game_genera  # noqa: E402  (core.js gameOf: the slate, Millepora, the bonus genera)


def short(minimum=5):
    """[(genus, candidates waiting, {view guess: count})] for the game genera under `minimum`, fewest first. The
    Key-only genera are left out: tools/fetch_local.py refills them only up to what their sheet can show."""
    d = load_all()
    cand = d.get("cand") or {}
    # Waiting = not decided yet, as fetch_local.py counts them (Codex review #365): not added, not rejected
    # (curation.json seen 'cand:f'), not sent away (out), not excluded.
    cur = json.loads((ROOT / "curation.json").read_text())
    gens = list((cur.get("genera") or {}).values())
    added = {f for k in gens for f in (k.get("add") or {})}
    gone = {f for k in gens for f in (k.get("out") or {})} | {k[5:] for k in (cur.get("seen") or {}) if k.startswith("cand:")}
    out = []
    for g in game_genera(d):
        waiting = [p for p in cand.get(g, []) if p["f"] not in added and p["f"] not in gone and not excluded(p["f"]) and not set_aside(p["f"])]
        if len(waiting) < minimum:
            out.append((g, len(waiting), dict(collections.Counter(p.get("vg", "unsorted") for p in waiting))))
    return sorted(out, key=lambda r: r[1])


# What tools/fetch_local.py would take (its own rules, imported: one definition): the stony-coral genus taxon, near
# Dauin (40 km) or in the Philippines, Research Grade, a genus-level community ID or an undisputed expert ID (ph_ok), an
# accepted licence, never share-alike (LIC, photo_ok), a photo not already on the site or waiting, and not excluded.
from fetch_local import LIC, ph_ok, photo_ok  # noqa: E402

UA = {"User-Agent": "coral-id-imr/1.0"}
SCLERACTINIA = 47532
DAUIN, PHILIPPINES = "lat=9.19&lng=123.26&radius=40", "place_id=6873"
POOR = 15  # fetch_local.py: Philippines candidates only while a genus has fewer Dauin photos than this (or --ph-all)


def _get(u):
    return json.load(urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=60))


def findable(g):
    """(near Dauin, elsewhere in the Philippines): new observations the search could take for genus g; (0, 0): nothing
    to remind Pierre about."""
    d = load_all()
    gen = {**d["gen"], **((d.get("x") or {}).get("gen") or {})}
    used = {re.sub(r"\D", "", p["f"].split("-")[-1]) for x in gen.values() for L in [*x["views"].values(), *(x.get("more") or {}).values()] for p in L}
    used |= {p["f"].split("-")[-1] for L in (d.get("cand") or {}).values() for p in L}
    nonscl = ((gen.get(g) or {}).get("x") or {}).get("nonscl")  # fire and blue coral: matched as animals, as fetch_local.py
    T = [t for t in _get(f"https://api.inaturalist.org/v1/taxa?q={g}&rank=genus&per_page=10")["results"] if t["name"] == g and (SCLERACTINIA in t.get("ancestor_ids", []) or (nonscl and t.get("iconic_taxon_name") == "Animalia"))]
    if not T:
        return 0, 0
    tid, found = T[0]["id"], {DAUIN: set(), PHILIPPINES: set()}
    for where in (DAUIN, PHILIPPINES):
        # The same first page as the fetcher (votes order, 200; Codex review #366).
        url = f"https://api.inaturalist.org/v1/observations?taxon_id={tid}&{where}&quality_grade=research,needs_id&photos=true&photo_license={LIC}&order_by=votes&per_page=200"
        for o in _get(url)["results"]:
            if ph_ok(o, tid) and any(photo_ok(ph) and str(ph["id"]) not in used and not excluded(photo_id=ph["id"]) for ph in o["photos"]):
                found[where].add(o["id"])
        time.sleep(0.5)
    return len(found[DAUIN]), len(found[PHILIPPINES] - found[DAUIN])


def dauin_n(g):
    """Dauin photos of genus g (site + candidates still in the files), as fetch_local.py counts them for POOR."""
    d = load_all()
    x = {**d["gen"], **((d.get("x") or {}).get("gen") or {})}[g]
    site = sum(p.get("loc") == "dauin" or p.get("own") for L in x["views"].values() for p in L)
    return site + sum(p.get("loc") == "dauin" and not excluded(p["f"]) for p in (d.get("cand") or {}).get(g, []))


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    m = int(args[0]) if args else 5
    rows = [(g, n, v, None) for g, n, v in short(m)]
    if "--offline" not in sys.argv:
        rows = [(g, n, v, findable(g)) for g, n, v, _ in rows]
        dry = [g for g, _, _, f in rows if not sum(f)]
        rows = [r for r in rows if sum(r[3])]
        if dry:
            print("Short, but nothing more on iNaturalist near Dauin or in the Philippines (no reminder): " + ", ".join(dry))
    if not rows:
        print(f"Nothing to remind Pierre about (every genus has {m} or more candidates waiting, or nothing more to find).")
    for g, n, views, f in rows:
        more = ""
        if f:
            # The fetcher looks elsewhere in the Philippines only for genera with few Dauin photos, unless --ph-all
            # (Codex review #366): say which command finds them.
            ph_all = f[1] and dauin_n(g) >= POOR
            more = f", new observations: {f[0]} near Dauin, {f[1]} elsewhere in the Philippines; run: python3 tools/fetch_local.py{' --ph-all' if ph_all else ''} {g}"
        print(f"{g}: {n} waiting {views if views else ''}{more}".rstrip())
