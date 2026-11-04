#!/usr/bin/env python3
"""presence.json: whether each coral species named on a photo (game photos, Key photos, candidates) is confirmed in the
Philippines by the presence rule (tools/presence.py, AGENTS.md rule 6g; Pierre, 2026-11-04). The admin reads it to flag
a photo taken abroad (loc world) of a species not confirmed here as "out of rule" (core.js outOfRule): flagged, never
removed automatically; Pierre decides. Computed once here, not in each admin session (rule 14g).

presence.json = {v, date, sp: {species name (as iNaturalist writes it on the photo, t): {ok, by, rg, chk}}}: ok =
confirmed, by = the rule's reasons (observers, checklist, near), rg = Research Grade observations in the Philippines, chk =
Corals of the World lists it for a Philippine ecoregion. One species per line.

iNaturalist: per genus, two batched species counts (the Philippines, 40 km around Dauin) and an observers query only for
a species neither the checklist nor near Dauin settles; about one request a second, a User-Agent, every reply cached in
tools/.cache/presence.json (git-ignored): a rerun is offline and identical; --refresh asks again, --offline never asks.
Usage: python3 tools/coral_presence.py [--offline | --refresh]
"""
import datetime
import json
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
from datajson import load_all  # noqa: E402
from presence import listed, species_presence  # noqa: E402

OUT = ROOT / "presence.json"
CACHE = ROOT / "tools" / ".cache" / "presence.json"
UA = {"User-Agent": "coral-id-imr/1.0", "Accept": "application/json"}
SCLERACTINIA = 47532


class Net:
    def __init__(self, offline, refresh):
        self.offline, self.refresh, self.last = offline, refresh, 0.0
        self.c = json.loads(CACHE.read_text(encoding="utf-8")) if CACHE.exists() else {}
        self.asked = set()

    def get(self, url):
        if url in self.c and not (self.refresh and url not in self.asked):
            return self.c[url]
        if self.offline:
            sys.exit(f"--offline: not cached: {url}")
        for wait in (5, 15, 30, 60, 0):
            time.sleep(max(0.0, self.last + 1.0 - time.time()))
            self.last = time.time()
            try:
                with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
                    v = json.load(r)
                break
            except urllib.error.HTTPError as e:
                if not wait or not (e.code == 429 or e.code >= 500):
                    raise
            except (urllib.error.URLError, TimeoutError):
                if not wait:
                    raise
            print(f"  iNaturalist busy, waiting {wait} s", file=sys.stderr)
            time.sleep(wait)
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
    names, gen = photo_species(d)
    sp = {}
    for g in sorted(names):
        nonscl = ((gen.get(g) or {}).get("x") or {}).get("nonscl")
        T = [t for t in net.get(f"https://api.inaturalist.org/v1/taxa?q={g}&rank=genus&per_page=10")["results"]
             if t["name"] == g and (SCLERACTINIA in t.get("ancestor_ids", []) or (nonscl and t.get("iconic_taxon_name") == "Animalia"))]
        pres = species_presence(net.get, T[0]["id"], "coral", "&captive=false") if T else {}
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
