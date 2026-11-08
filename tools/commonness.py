#!/usr/bin/env python3
"""How common each game genus is near Dauin, from iNaturalist, written to data.json as `cm` on each genus record.

Pierre, 2026-11-03: open the genera "easy and common first": the genera RAs meet all the time on Dauin reefs and in
ReefCloud photos (Acropora, Porites, Pocillopora, Montipora, Millepora...) should come earlier in the progressive
opening, with no list of exceptions kept by hand. The app multiplies the opening weight of each genus not met yet by
sqrt((1 + cm) / (1 + the median cm of those genera)) (model.js weighted, core.js commonFactor; docs/LEARNING.md).
Computed once here, never on the phones (rule L13).

For every game genus (the slate genera of data.json "gen", and BENTHIC and BONUS of core.js, whose records are in
data.json "x.gen"), it asks iNaturalist (read only), within 40 km of Dauin, verifiable observations only:
- observations: observations of the genus taxon (`total_results`);
- observers: distinct observers of the same (`/observations/observers`, `total_results`);
- cm = round(sqrt(observations x observers)), the geometric mean (Pierre's compromise: near Dauin a few systematic
  divers make most of the stony-coral observations, so observation counts follow abundance; observer counts follow
  casual divers, who favour spectacular genera such as Plerogyra and Tubastraea).
The genus taxon is the taxon named exactly like the genus inside Cnidaria. A genus whose own lines in data.json
("crit", "imr") say "formerly X" (Astrea: formerly Montastraea; Dipsastraea: formerly Favia) also counts the
observations still filed under X near Dauin: one query over both taxa, so an observer of both counts once. "Refer to X"
lines are not used (Fungia is still a valid genus).

Usage: python3 tools/commonness.py [--dry]   (--dry: print the table, leave data.json as it is). Re-run it to update.
"""
import json
import math
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
from datajson import dump, load  # noqa: E402  (the one writer of data.json's layout)
import genera  # noqa: E402  (the game genera as core.js gameOf)
import inat  # noqa: E402  (the one paced, retried iNaturalist client)

API = "https://api.inaturalist.org/v1/"
CNIDARIA = 47534  # Millepora is a hydrozoan and Heliopora an octocoral: not under Scleractinia
NEAR = "lat=9.19&lng=123.26&radius=40&verifiable=true"


def _get(path):
    """One iNaturalist call through tools/inat.py: about one a second, the project's User-Agent, 429 / 5xx and network
    errors retried after a pause (rule C7)."""
    return inat.get(API + path)


def taxon(name, inactive=False):
    """The taxon id named exactly `name` inside Cnidaria, or None. inactive: also a name iNaturalist no longer uses
    (its observations have moved to the current name, so it adds none, but it is not mistaken for a plain word)."""
    q = {"q": name, "per_page": 30, **({"is_active": "any"} if inactive else {})}
    rs = _get("taxa?" + urllib.parse.urlencode(q))["results"]
    ids = [t["id"] for t in rs if t["name"] == name and CNIDARIA in (t.get("ancestor_ids") or [])]
    return ids[0] if ids else None


def game_genera(d):
    """[(genus, record)]: the game genera as core.js gameOf (tools/genera.py, which reads BENTHIC and BONUS from core.js):
    the slate genera (data.json "gen"), then those found in "x.gen"."""
    xg = (d.get("x") or {}).get("gen") or {}
    return [(g, d["gen"].get(g) or xg[g]) for g in genera.game_genera(d)]


# "formerly X": X a genus ("Favia"), several ("Montastrea / Phymastrea") or a species ("Turbinaria peltata").
FORMERLY = re.compile(r"\b[Ff]ormerly ((?:[A-Z][a-z]+(?: [a-z]+)?)(?:\s*/\s*[A-Z][a-z]+(?: [a-z]+)?)*)")


def formerly(g, rec):
    """The taxon names a genus's own crit / imr lines say it was formerly called."""
    out = []
    for k in ("crit", "imr"):
        for line in rec.get(k) or []:
            for m in FORMERLY.finditer(line if isinstance(line, str) else ""):
                for x in re.split(r"\s*/\s*", m.group(1)):
                    if x != g and x not in out:
                        out.append(x)
    return out


def counts(ids):
    """(observations, distinct observers) near Dauin over the taxa `ids` together."""
    q = f"taxon_id={','.join(map(str, ids))}&{NEAR}&per_page=0"
    return _get("observations?" + q)["total_results"], _get("observations/observers?" + q)["total_results"]


def main():
    d = load()
    rows = []
    for g, rec in game_genera(d):
        tid = taxon(g)
        if not tid:
            print(f"{g}: no taxon of that name in Cnidaria on iNaturalist; cm left as it is", file=sys.stderr)
            continue
        ids, also = [tid], []
        for x in formerly(g, rec):
            # "Genus epithet" may be a genus followed by an ordinary word: the two words, else the first.
            xs = [x] + ([x.split()[0]] if " " in x else [])
            xid = next((i for i in (taxon(y, inactive=True) for y in xs) if i), None)
            if xid and xid not in ids:
                ids.append(xid)
                also.append(x)
            elif not xid:
                print(f"{g}: formerly {x}: no such taxon in Cnidaria on iNaturalist, not counted", file=sys.stderr)
        n, o = counts(ids)
        cm = round(math.sqrt(n * o))
        rows.append((g, n, o, cm, also))
        rec["cm"] = cm
    rows.sort(key=lambda r: -r[3])
    print(f"{'genus':<16}{'observations':>13}{'observers':>10}{'cm':>6}  (iNaturalist, verifiable, 40 km of Dauin)")
    for g, n, o, cm, also in rows:
        print(f"{g:<16}{n:>13}{o:>10}{cm:>6}" + (f"  + formerly {', '.join(also)}" if also else ""))
    if "--dry" in sys.argv[1:]:
        print("--dry: data.json not written")
    else:
        dump(d)
        print(f"data.json: cm written on {len(rows)} genera")


if __name__ == "__main__":
    main()
