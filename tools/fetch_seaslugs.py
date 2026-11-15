#!/usr/bin/env python3
"""Sea-slug candidate photos from iNaturalist, into seaslug-cand.json: data only, for the later judging and admin tools
(no app subject yet; nothing downloaded, nothing judged, nothing uploaded).

The sea-slug counterpart of tools/fetch_fish.py, whose searches, cache, pacing and record shape it reuses, with the
sea-slug decisions:
- Species: tools/seaslugs.json (tools/build_seaslugs.py), the circle(s) asked (--circle, default 1: the 45 of Q377).
  Scientific names only (Pierre, 2026-11-15, Q369 d). Every species there is confirmed in the Philippines (rule C8).
- How many (Pierre, 2026-11-15, Q377; tools/seaslugs.json photoTarget): `candidates` (20) per species, + `perJuvenileForm`
  (5) for a species whose different-looking juvenile a source documents (photoTarget.juvenile: Hexabranchus lacer,
  docs/reviews/2026-11-15-seaslug-sources.md 1.5, applied here as #970 proposed), never above `max` (30). The 5 are held
  for observations annotated Life Stage: Juvenile (searched on their own, as fetch_fish.py fills a phase room); what
  iNaturalist cannot fill stays open, never adults in a juvenile's place. The higher ceiling Q377 gives very variable
  genera (Chromodoris, Phyllidia: 30 at most) is not used yet: 20 for them too, to revisit after the first judging pass.
- One photo per observation (rule P4: an observation counts once; for variety): the observation's first photo with a
  usable licence, in the observer's order. Unlike the fish (every photo of an observation since 2026-11-08, Q226), a
  candidate is one observation.
- Identity: Research Grade at the species level (or below), never captive. Pierre's own observations (iNaturalist user
  ppericard) are taken like anyone's, Research Grade only and with no priority: P1's fish exception (each of his
  compatible photos in the pool, his Needs ID ones too) is a fish rule. `own` still marks them.
- Licences (rule P1): CC0, CC BY, CC BY-NC only, never share-alike nor ND; the licence is the last tie-break (an open one
  before CC BY-NC), after the variety below.
- Eggs (Pierre, 2026-11-15; photoTarget.exclude, sources note 1.4), filter 1: an observation annotated with one of
  exclude.annotations (Life Stage: Egg, Evidence of Presence: Egg) is dropped, read from its own annotations (no request
  parameter removes them exactly); an annotation voted down (vote score below 0) does not count, as fetch_fish.trim
  reads them. Filter 2 (an egg mass photo nobody annotated) is the judging's. Juveniles stay in. An observation
  annotated Dead is dropped too, as for the fish.
- Where (Pierre, 2026-11-15, Q369 b: the subject's area is the whole Philippines): the Philippines first, as one pool
  (not nearest Dauin first, as the fish), then abroad, only when the Philippine search was read to its end and the
  species is still short: the Indo-West Pacific box of the fish (fetch_fish.IWP: 30 S - 30 N, 90 E - 170 E), the
  region of the regional ID guides. `loc` still says dauin (within 40 km), ph or world.
- Order: the least represented observer first, then the least represented life stage, then the licence, then a fixed
  hash of the observation id (fetch_fish.hord: no votes or quality order). A rerun keeps every candidate already there
  and only fills the room left; a photo or an observation is never taken twice.

seaslug-cand.json is shaped like fish-cand.json, so the fish's judging and admin tools can be pointed at it:
{"v": 1, "cand": {species key: [record, ...]}}, one species per line (tools/datajson.py layout), the species in
tools/seaslugs.json order. The record fields are the fish's (fetch_fish.record): f, a, lic, o, t, own, loc, src, r
(r: 1, the photo stays remote at `src`), plus st (the observer's Life Stage annotation) when there is one. The
differences, as no sea-slug subject exists yet:
- the species key is the species' iNaturalist taxon id (a string; tools/seaslugs.json `inat`), the one stable id it has
  (its rank moves with each build);
- f is "seaslug-<taxon id>-cand-<photo id>" (fish: "fish-<species id>-cand-<photo id>"), so the photo id still ends it
  (fetch_fish.pid, core.js);
- never `ni` (only Research Grade) nor `rep` or `via` (no covers, no FishBase).

Network: iNaturalist API v2, read only, through tools/inat.py (rule C7: about one request a second, a User-Agent, paced
retries): fetch_fish.py's Philippine and abroad searches (its `queries`), the small species asked together (its
`prefetch`), the juvenile searches (its `phase_obs`). Every reply is cached, trimmed, in tools/.cache/seaslug_photos.json
(git-ignored): a rerun is offline and gives the same file; --refresh asks again, --offline never asks.

    python3 tools/fetch_seaslugs.py [--circle 1] [--only "Jorunna parva,119434"] [--refresh | --offline]
Tests: node --test tests/seaslugcand.test.js (stubbed network).
"""
import argparse
import json
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
from datajson import dump  # noqa: E402  one species per line
from rights import rights_rank  # noqa: E402  0 own or open, 1 NC (Q270)
from fetch_fish import (DEAD, LOC, OK, STAGE, Net, hord, in_iwp, obs_url, pages, phase_obs, prefetch,  # noqa: E402
                        queries, tier_of)

SRC = ROOT / "tools" / "seaslugs.json"
CAND = ROOT / "seaslug-cand.json"
CACHE = ROOT / "tools" / ".cache" / "seaslug_photos.json"
PREFIX = "seaslug"
PIERRE = "ppericard"
RANKS = ("species", "subspecies", "variety", "form")


def target(s, T):
    """(candidates, of which held for juveniles) for species s under the photo target T (photoTarget)."""
    juv = T.get("perJuvenileForm", 0) if s["name"] in (T.get("juvenile") or {}) else 0
    return min(T.get("max", 1e9), T["candidates"] + juv), juv


def is_egg(o, pairs):
    """The observation carries one of the egg annotations ([term, value] pairs, photoTarget.exclude.annotations)."""
    an = {tuple(a) for a in o.get("an") or []}
    return any(tuple(p) in an for p in pairs)


def usable(o, pairs, used=frozenset(), taken=frozenset()):
    """One observation (as fetch_fish.trim keeps it) as a selection item, or None: Research Grade at the species level,
    no egg or Dead annotation, abroad only inside the Indo-West Pacific, not among the candidates (taken: observation
    URLs), with a photo of a usable licence not taken yet (used: photo ids). The item carries that one photo (p): the
    observation's first usable one."""
    if o.get("g") != "research" or o.get("rk") not in RANKS or is_egg(o, pairs) or [*DEAD] in (o.get("an") or []):
        return None
    if obs_url(o["id"]) in taken:
        return None
    tier = tier_of(o)
    if tier == "world" and not in_iwp(o.get("ll")):
        return None
    p = next((p for p in o.get("ph") or [] if p[2] in OK and p[1] and str(p[0]) not in used), None)
    if not p:
        return None
    st = "/".join(sorted({STAGE[tuple(a)] for a in o.get("an") or [] if tuple(a) in STAGE}))
    return {"id": o["id"], "u": o.get("u"), "t": o.get("t"), "own": o.get("u") == PIERRE, "tier": tier, "st": st,
            "h": hord(o["id"]), "cls": rights_rank({"lic": p[2]}), "p": p}


def pick(items, room, n, used, taken):
    """Up to `room` items, one photo each: the least represented observer, then life stage (n: Counter of ("u", login)
    and ("s", stage) already in the species' list, updated here), then the licence (open first), then the fixed hash.
    used / taken (photo ids, observation URLs) are updated: a photo or an observation is taken once."""
    L, out = list(items), []
    while L and room > 0:
        o = min(L, key=lambda o: (n["u", o["u"]], n["s", o["st"]], o["cls"], o["h"]))
        L.remove(o)
        if str(o["p"][0]) in used or obs_url(o["id"]) in taken:
            continue
        out.append(o)
        used.add(str(o["p"][0]))
        taken.add(obs_url(o["id"]))
        n["u", o["u"]] += 1
        n["s", o["st"]] += 1
        room -= 1
    return out


def record(key, o):
    """A candidate, in fish-cand.json's fields (fetch_fish.record)."""
    p = o["p"]
    r = {"f": f"{PREFIX}-{key}-cand-{p[0]}", "a": p[3] or (f"(c) {o['u']}" if o["u"] else ""), "lic": p[2],
         "o": obs_url(o["id"]), "t": o["t"], "own": o["own"], "loc": LOC[o["tier"]],
         "src": p[1].replace("/square.", "/original."), "r": 1}
    if o["st"]:
        r["st"] = o["st"]
    return r


def species_of(src, circles, only=()):
    """The species of the circle(s), in tools/seaslugs.json order; --only takes names or iNaturalist ids."""
    return [s for s in src["species"] if s.get("circle") in circles and s.get("inat")
            and (not only or s["name"] in only or str(s["inat"]) in only)]


def fill(net, s, L, T, pairs, used, taken):
    """The new candidates of species s (L: its candidates already there): the juvenile room first (Life Stage: Juvenile
    observations, the Philippines then abroad), then the rest (the Philippines, then abroad when their search was read to
    its end and room is left). Returns ([items], {"juvenile": short by}) ."""
    tid, Q = s["inat"], queries(s["inat"])
    cap, juv = target(s, T)
    n = Counter()
    for p in L:
        n["s", p.get("st", "")] += 1
    jr = max(0, min(juv - sum(1 for p in L if "juvenile" in (p.get("st") or "").split("/")), cap - len(L)))
    free = max(0, cap - len(L) - jr)
    if not jr and not free:
        return [], {}
    it = lambda obs: [x for x in (usable(o, pairs, used, taken) for o in obs) if x]  # noqa: E731
    enough = lambda res: len(it(res)) >= jr + free  # noqa: E731
    ph = pages(net, Q["ph"], enough)
    pool = it(ph["results"])
    got = []
    if jr:
        jobs, jmore = phase_obs(net, "juvenile", [tid], "ph")
        J = [x for x in pool if "juvenile" in x["st"].split("/")] + it(jobs[tid])
        g = pick(J, jr, n, used, taken)
        if len(g) < jr and not jmore[tid]:
            wobs, _ = phase_obs(net, "juvenile", [tid], "world")
            g += pick([x for x in it(wobs[tid]) if x["tier"] == "world"], jr - len(g), n, used, taken)
        got += g
        jr -= len(g)
    g = pick([x for x in pool if obs_url(x["id"]) not in taken], free, n, used, taken)
    got += g
    if len(g) < free and ph["total"] <= len(ph["results"]):
        w = pages(net, Q["world"], lambda res: len(it(res)) >= free - len(g))
        got += pick([x for x in it(w["results"]) if x["tier"] == "world"], free - len(g), n, used, taken)
    return got, ({"juvenile": jr} if jr else {})


def run(args):
    src = json.loads(Path(args.src).read_text(encoding="utf-8"))
    T = src["photoTarget"]
    pairs = [tuple(p) for p in T["exclude"]["annotations"]]
    cand_path = Path(args.cand)
    have = json.loads(cand_path.read_text(encoding="utf-8")).get("cand", {}) if cand_path.exists() else {}
    only = {x.strip() for x in (args.only or "").split(",") if x.strip()}
    S = species_of(src, set(args.circle), only)
    used = {p["f"].rsplit("-", 1)[-1] for L in have.values() for p in L}
    taken = {p["o"] for L in have.values() for p in L}
    net = Net(args.cache, offline=args.offline, refresh=args.refresh)
    report = {}
    try:
        prefetch(net, [s["inat"] for s in S if len(have.get(str(s["inat"]), [])) < target(s, T)[0]], ["ph"])
        for s in S:
            key = str(s["inat"])
            L = have.setdefault(key, [])
            got, short = fill(net, s, L, T, pairs, used, taken)
            L += [record(key, o) for o in got]
            loc = Counter(p["loc"] for p in L)
            report[s["name"]] = {"n": len(L), "target": target(s, T)[0], "ph": loc["dauin"] + loc["ph"], "world": loc["world"],
                                 "juvenile": sum(1 for p in L if "juvenile" in (p.get("st") or "")), **({"short": short} if short else {})}
            print(f"{s['name']:<30} {len(L):>2} / {target(s, T)[0]} (Philippines {loc['dauin'] + loc['ph']}, abroad "
                  f"{loc['world']}, juvenile {report[s['name']]['juvenile']}){' short ' + json.dumps(short) if short else ''}",
                  flush=True)
    finally:
        net.save()
    order = [str(s["inat"]) for s in src["species"]]
    out = {k: have[k] for k in sorted(have, key=lambda k: order.index(k) if k in order else 1e9) if have[k]}
    dump({"v": 1, "cand": out}, str(cand_path))
    few = sorted(k for k, v in report.items() if v["n"] < T["start"])
    print(f"total {sum(map(len, out.values()))} photos for {len(out)} species; below the start of {T['start']}: "
          f"{', '.join(few) or 'none'}")
    return report


def main(argv=None):
    a = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    a.add_argument("--circle", type=int, action="append", help="circle(s) to fetch (default 1)")
    a.add_argument("--only", help="comma-separated species names or iNaturalist taxon ids")
    m = a.add_mutually_exclusive_group()
    m.add_argument("--refresh", action="store_true", help="ask iNaturalist again")
    m.add_argument("--offline", action="store_true", help="never ask iNaturalist (fail on a reply not cached)")
    a.add_argument("--src", default=str(SRC))
    a.add_argument("--cand", default=str(CAND))
    a.add_argument("--cache", default=str(CACHE))
    args = a.parse_args(argv)
    args.circle = args.circle or [1]
    return run(args)


if __name__ == "__main__":
    main()
