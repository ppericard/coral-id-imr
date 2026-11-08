#!/usr/bin/env python3
"""presence.json: whether each coral species named on a photo (game photos, Key photos, candidates) is confirmed in the
Philippines by the presence rule (tools/presence.py, rule C8; Pierre, 2026-11-04). The admin reads it to flag
a photo taken abroad (loc world) of a species not confirmed here as "out of rule" (core.js outOfRule): flagged, never
removed automatically; Pierre decides. Computed once here, not in each admin session (rule L12).

presence.json = {v, date, sp: {species name (as iNaturalist writes it on the photo, t): {ok, by, rg, chk}}}: ok =
confirmed, by = the rule's reasons (observers, checklist, near), rg = Research Grade observations in the Philippines, chk =
Corals of the World lists it for a Philippine ecoregion. One species per line.

iNaturalist: every genus (its taxon as tools/taxonomy.json gives it: no search by name) at once, two batched species
counts (the Philippines, 40 km around Dauin) and the distinct observers only of a species neither the checklist nor near
Dauin settles, counted together for the species with few observations (tools/presence.py species_presence_many); through
tools/inat.py (about one request a second, the project's User-Agent, 429 / 5xx retried after a pause; rule C7), every
reply cached in tools/.cache/presence.json (git-ignored): a rerun is offline and identical; --refresh asks again,
--offline never asks.
Usage: python3 tools/coral_presence.py [--offline | --refresh]
"""
import datetime
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
from datajson import load_all  # noqa: E402
import inat  # noqa: E402  (the one paced, retried iNaturalist client)
from presence import listed, species_presence_many  # noqa: E402
from taxonomy import inat_taxon  # noqa: E402  (the iNaturalist taxon of each genus, tools/taxonomy.json)

OUT = ROOT / "presence.json"
CACHE = ROOT / "tools" / ".cache" / "presence.json"


class Net:
    def __init__(self, offline, refresh):
        self.offline, self.refresh = offline, refresh
        self.c = json.loads(CACHE.read_text(encoding="utf-8")) if CACHE.exists() else {}
        self.asked = set()

    def get(self, url):
        if url in self.c and not (self.refresh and url not in self.asked):
            return self.c[url]
        if self.offline:
            sys.exit(f"--offline: not cached: {url}")
        v = inat.get(url)  # paced, 429 / 5xx retried after a pause (rule C7)
        self.c[url], _ = v, self.asked.add(url)
        return v

    def save(self):
        CACHE.parent.mkdir(parents=True, exist_ok=True)
        CACHE.write_text(json.dumps(self.c, sort_keys=True, separators=(",", ":")), encoding="utf-8")


def photo_species(d):
    """{genus: set of species names} on the photos of every genus (views, more, candidates)."""
    gen = {**d["gen"], **((d.get("x") or {}).get("gen") or {})}
    out = {}
    lists = [(g, L) for g, x in gen.items() for L in [*(x.get("views") or {}).values(), *(x.get("more") or {}).values()]]
    lists += list((d.get("cand") or {}).items())
    for g, L in lists:
        for p in L:
            t = (p.get("t") or "").split()
            if len(t) >= 2 and t[1][0].islower():
                out.setdefault(g, set()).add(" ".join(t[:2]))
    return out, gen


def build(net):
    d = load_all()
    names, _ = photo_species(d)
    sp = {}
    tids = {g: inat_taxon(g, "coral") for g in sorted(names)}
    # Every genus at once (rule C7): the same counts as one genus at a time, in a few requests.
    many = species_presence_many(net.get, [t for t in tids.values() if t], "coral", "&captive=false")
    for g in sorted(names):
        tid = tids[g]
        if not tid:
            print(f"{g}: no active iNaturalist taxon in tools/taxonomy.json (run python3 tools/taxonomy.py)", file=sys.stderr)
        pres = many.get(tid, {}) if tid else {}
        for n in sorted(names[g]):
            v = pres.get(n) or {"rg": 0, "chk": listed("coral", [n]), "by": []}
            sp[n] = {"ok": bool(v["by"]), "by": v["by"], "rg": v["rg"], "chk": v["chk"]}
    return sp


def write(sp):
    lines = [f"{json.dumps(k)}:{json.dumps(v, separators=(',', ':'))}" for k, v in sorted(sp.items())]
    head = f'{{"v":1,"date":"{datetime.date.today().isoformat()}","sp":{{\n'
    OUT.write_text(head + ",\n".join(lines) + "\n}}\n", encoding="utf-8")


def main():
    a = sys.argv[1:]
    net = Net("--offline" in a, "--refresh" in a)
    try:
        sp = build(net)
    finally:
        net.save()
    write(sp)
    bad = sorted(n for n, v in sp.items() if not v["ok"])
    print(f"{len(sp)} species on photos, {len(bad)} not confirmed in the Philippines: {', '.join(bad)}")


if __name__ == "__main__":
    main()
