#!/usr/bin/env python3
"""Sea-slug candidate photos from iNaturalist, into data/seaslug-cand.json: data only, for the later judging and admin tools
(no app subject yet; nothing downloaded, nothing judged, nothing uploaded).

The sea-slug counterpart of tools/fetch_fish.py, whose searches, cache, pacing and record shape it reuses, with the
sea-slug decisions:
- Species: tools/seaslugs.json (tools/build_seaslugs.py), the circle(s) asked (--circle, default 1: the 45 of Q377).
  Scientific names only (Pierre, 2026-11-15, Q369 d). Every species there is confirmed in the Philippines (rule C8).
- How many (Pierre, 2026-11-15, Q377; tools/seaslugs.json photoTarget): `candidates` (20) per species, + `perJuvenileForm`
  (5) for a species whose different-looking juvenile a source documents (photoTarget.juvenile: Hexabranchus lacer,
  docs/reviews/2026-11-15-seaslug-sources.md 1.5, applied here as #970 proposed), never above `max` (30). The 5 are held
  for observations annotated Life Stage: Juvenile (searched on their own, as fetch_fish.py fills a phase room); what
  iNaturalist cannot fill stays open, never adults in a juvenile's place. A species of a very variable genus
  (photoTarget.maxGenera: Chromodoris, Phyllidia; Q377's "30 at most", docs/reviews/2026-11-15-seaslug-list.md 5.3, a
  photo target per species) has the ceiling `max` (30) as its target, as the fish's cap rises with what makes a species
  vary (fetch_fish.cap_of), never above `max`. To revisit after the first judging pass.
- One photo per observation (rule P4: an observation counts once; for variety): the observation's first photo with a
  usable licence, in the observer's order. Unlike the fish (every photo of an observation since 2026-11-08, Q226), a
  candidate is one observation.
- What counts against the target: the candidates still usable, as the fish's cap counts them (fetch_fish.species_room):
  a candidate the judging pass found an egg mass (data/suggest.json "seaslug" {egg: 1}, the egg rule's filter 2) frees its
  place. Its observation keeps it first (rule P4: the egg-only photo goes, not the observation's other photos): an
  observation whose every candidate is an egg mass brings its next usable photo, asked again by id (eggs_back, every
  list of the run in one request), under the same rules as a new candidate (still that taxon, Research Grade or agreed,
  never annotated Egg or Dead, the licences); one without one leaves the place to the next observation. Still one photo
  per observation in play: the egg-mass record stays (its judgement keeps it out), its replacement is the only other.
- Identity: Research Grade at the species level (or below), never captive. Pierre's own observations (iNaturalist user
  ppericard): the fish's rule (Pierre, 2026-11-16, Q386: "la même règle que pour les poissons ... y compris en needs
  ID"; rule P1's fish exception, rule S2): one identified to the species (the observation's taxon at species level or
  below, whoever named it) is usable even when Needs ID, and his photo even without a licence, as fetch_fish.usable_obs
  reads them (this tool calls it). They are asked on their own search (fetch_fish.queries "own": Research Grade and
  Needs ID, any place, abroad kept inside the Indo-West Pacific) and taken first, as fetch_fish.select takes them, so
  none is left out: within the photo target on a new list, and on a list already full (filled before 2026-11-16) on
  top of it, up to the ceiling `max` (30), since a candidate already there is never removed. Never boosted: they wait
  for the judging pass like any candidate, on the same rubric, and play by their judged ease. `own` marks them, `ni`
  the Needs ID ones (as fetch_fish.record).
- Licences (rule P1): CC0, CC BY, CC BY-NC only, never share-alike nor ND (Pierre's own photos whatever their licence,
  as the fish's); the licence is the last tie-break (an open one or his own before CC BY-NC), after the variety below.
- Eggs (Pierre, 2026-11-15; photoTarget.exclude, sources note 1.4), filter 1: an observation annotated with one of
  exclude.annotations (Life Stage: Egg, Evidence of Presence: Egg) is dropped, read from its own annotations (no request
  parameter removes them exactly); an annotation voted down (vote score below 0) does not count, as fetch_fish.trim
  reads them. Filter 2 (an egg mass photo nobody annotated) is the judging's. Juveniles stay in. An observation
  annotated Dead is dropped too, as for the fish.
- Where (Pierre, 2026-11-15, Q369 b: the subject's area is the whole Philippines): the Philippines first, as one pool
  (not nearest Dauin first, as the fish), then abroad, only when the Philippine search was read to its end and the
  species is still short: the Indo-West Pacific box of the fish (fetch_fish.IWP: 30 S - 30 N, 90 E - 170 E), the
  region of the regional ID guides. `loc` still says dauin (within 40 km), ph or world.
- Order: Pierre's own first (above); then the least represented observer first, then the least represented life stage,
  then the licence, then a fixed hash of the observation id (fetch_fish.hord: no votes or quality order). A rerun keeps
  every candidate already there and only fills the room left; a photo or an observation is never taken twice.

data/seaslug-cand.json is shaped like data/fish-cand.json, so the fish's judging and admin tools can be pointed at it:
{"v": 1, "cand": {species key: [record, ...]}}, one species per line (tools/datajson.py layout), the species in
tools/seaslugs.json order. The record fields are the fish's (fetch_fish.record): f, a, lic, o, t, own, loc, src, r
(r: 1, the photo stays remote at `src`), plus st (the observer's Life Stage annotation) when there is one and ni (Pierre's
own Needs ID observation). The differences, as no sea-slug subject exists yet:
- the species key is the species' iNaturalist taxon id (a string; tools/seaslugs.json `inat`), the one stable id it has
  (its rank moves with each build);
- f is "seaslug-<taxon id>-cand-<photo id>" (fish: "fish-<species id>-cand-<photo id>"), so the photo id still ends it
  (fetch_fish.pid, core.js);
- never `rep` or `via` (no covers, no FishBase).

Network: iNaturalist API v2, read only, through tools/inat.py (rule C7: about one request a second, a User-Agent, paced
retries): fetch_fish.py's searches of Pierre's own, the Philippines and abroad (its `queries`), the small species asked
together (its `prefetch`), the juvenile searches (its `phase_obs`). Every reply is cached, trimmed, in
tools/.cache/seaslug_photos.json (git-ignored): a rerun is offline and gives the same file; --refresh asks again,
--offline never asks. --own asks Pierre's own search only (a few requests for every species together) and adds his
observations, nothing else.

Two more kinds of candidate (Pierre, 2026-11-17, Q389; study docs/reviews/2026-11-17-seaslug-undescribed-species-study.md
§4 (c) and (d)), asked with --informal and --genus-level (--informal first: an observation is never taken twice):
- **A species with no name yet** (tools/seaslug_informal.json, Q389 (2): Goniobranchus sp. 5 of Soong et al. 2020): its
  presence measured (the distinct observers of the observations carrying its label, the Philippines and near Dauin:
  tools/presence.py label_confirmed, written into the file's `presence`), then its candidates as a species' (the photo
  target, the order, one photo per observation, eggs and Dead out), from the observations in the Philippines carrying
  its label (the observation field), at its genus and agreed there (`agreed`, below). Keyed by its `key`; never asked
  for a species that fails the presence rule.
- **Genus-level photos of the genus units** (Q389 (1): "les observations au genre bien identifiées ... deviennent des
  photos des genres du jeu"): for each genus of the game (the genera of the circles' species, tools/seaslug_game.py
  CIRCLES), the observations in the Philippines identified at that genus (rank genus, Research Grade or Needs ID) and
  `agreed`: Research Grade at the genus, or at least AGREE (2) current identifications at the genus or below it and none
  that disagrees (a current identification off the genus's line; a coarser one on its line, the observer's "Nudibranchs",
  does not disagree, as rule P1's trusted identifications read). The species' photo target per genus (photoTarget
  `candidates`, 20, never above `max`, 30: Q377; the very variable genera's 30, maxGenera, also
  applies to their own genus-level list: the integrator's call of 2026-11-17, the colours vary there as much), the same order, licences, egg and Dead filters,
  one photo per observation. Keyed by the genus's name ("Goniobranchus"; the species are keyed by taxon id), each record marked
  `gl: 1`: a photo of the genus, never counted for a species (tools/seaslug_game.py puts it in play for its genus unit,
  sp "g:<genus>"). Pierre's own observations follow the same rule (no own search: the species' Q386 rule is about photos
  named to the species). The genus ids are read from iNaturalist (one species of each genus, its ancestors, batched).

    python3 tools/fetch_seaslugs.py [--circle 1] [--only "Jorunna parva,119434"] [--own] [--refresh | --offline]
    python3 tools/fetch_seaslugs.py --informal [--genus-level] [--refresh | --offline]
    python3 tools/fetch_seaslugs.py --genus-level [--only "Goniobranchus,Phyllidiella"] [--refresh | --offline]
    (--suggest PATH: the judgements read for the egg masses, default data/suggest.json)
Tests: node --test tests/seaslugcand.test.js (stubbed network).
"""
import argparse
import json
import sys
import urllib.parse
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
from datajson import dump  # noqa: E402  one species per line
from rights import rights_rank  # noqa: E402  0 own or open, 1 NC
from fetch_fish import (API, DEAD, FIELDS, LICENCES, LOC, PH, STAGE, TAXA, Net, hord, lic_ok, obs_url, pages,  # noqa: E402
                        phase_obs, prefetch, queries, tier_of, trim, usable_obs)
import inat  # noqa: E402  the batched counts (rule C7)
from presence import NEAR_AREA, label_confirmed, near_dauin  # noqa: E402  rule C8 and the label rule beside it

SRC = ROOT / "tools" / "seaslugs.json"
INFORMAL = ROOT / "tools" / "seaslug_informal.json"
CAND = ROOT / "data/seaslug-cand.json"
CACHE = ROOT / "tools" / ".cache" / "seaslug_photos.json"
PREFIX = "seaslug"
CIRCLES = (1, 2, 3)  # the circles in the game (tools/seaslug_game.py CIRCLES): their genera are the genus units
AGREE = 2  # current identifications at the genus or below it that make a genus-level observation agreed
GL_FIELDS = FIELDS + ",taxon.ancestor_ids,identifications.current,identifications.taxon.id,identifications.taxon.ancestor_ids"
GL_BATCH = 30  # genera a genus-level search asks at once (rule C7)
GL_PAGES = 60  # pages of 200 a genus-level search reads at most (the Philippines: some 6,800 genus-level observations)
EGG_BATCH = 200  # observations asked again by id in one request (eggs_back; rule C7)
# eggs_back's fields: GL_FIELDS and the observation fields, whose label says a species with no name
ID_FIELDS = GL_FIELDS + ",ofvs.field_id,ofvs.name,ofvs.value"
SUGGEST = ROOT / "data/suggest.json"  # the judgements: data/suggest.json "seaslug" (tools/judging_fish.py --subject seaslug)


def target(s, T):
    """(candidates, of which held for juveniles) for species s under the photo target T (photoTarget): `candidates` (20),
    or the ceiling `max` (30) for a species of a very variable genus (maxGenera, Q377), + `perJuvenileForm` for a
    documented juvenile form, never above `max`."""
    juv = T.get("perJuvenileForm", 0) if s["name"] in (T.get("juvenile") or {}) else 0
    base = T.get("max", T["candidates"]) if s.get("genus") in (T.get("maxGenera") or ()) else T["candidates"]
    return min(T.get("max", 1e9), base + juv), juv


def egg_set(sug):
    """The candidates judged an egg mass (data/suggest.json "seaslug" {f: {egg: 1}}: the egg rule's filter 2)."""
    return {f for f, j in ((sug or {}).get("seaslug") or {}).items() if isinstance(j, dict) and j.get("egg")}


def held(L, egg=frozenset()):
    """The candidates of list L that count against its target: every one but those judged an egg mass."""
    return sum(1 for p in L if p["f"] not in egg)


def egg_only(L, egg):
    """The observations (URLs) of list L whose every candidate is judged an egg mass, in list order."""
    by = {}
    for p in L:
        by.setdefault(p["o"], []).append(p["f"] in egg)
    return [o for o, e in by.items() if e and all(e)]


def is_egg(o, pairs):
    """The observation carries one of the egg annotations ([term, value] pairs, photoTarget.exclude.annotations)."""
    an = {tuple(a) for a in o.get("an") or []}
    return any(tuple(p) in an for p in pairs)


def usable(o, pairs, used=frozenset(), taken=frozenset()):
    """One observation (as fetch_fish.trim keeps it) as a selection item, or None: the fish's rule (fetch_fish.usable_obs:
    the species level or below, Research Grade or Pierre's own, never annotated Dead, abroad only inside the Indo-West
    Pacific, CC0 / CC BY / CC BY-NC photos or his own whatever their licence), no egg annotation, not among the
    candidates (taken: observation URLs), with a usable photo not taken yet (used: photo ids). The item carries that one
    photo (p): the observation's first usable one."""
    if is_egg(o, pairs) or obs_url(o["id"]) in taken:
        return None
    x = usable_obs({**o, "an": o.get("an") or [], "ph": o.get("ph") or []}, used, ())
    if not x:
        return None
    p = x["P"][0]
    return {"id": o["id"], "u": o.get("u"), "t": o.get("t"), "g": o.get("g"), "own": x["own"], "tier": x["tier"],
            "st": x["st"], "h": x["h"], "cls": rights_rank({"lic": p[2], "own": x["own"]}), "p": p}


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
    """A candidate, in data/fish-cand.json's fields (fetch_fish.record)."""
    p = o["p"]
    r = {"f": f"{PREFIX}-{key}-cand-{p[0]}", "a": p[3] or (f"(c) {o['u']}" if o["u"] else ""),
         "lic": p[2] or ("own" if o["own"] else ""), "o": obs_url(o["id"]), "t": o["t"], "own": o["own"],
         "loc": LOC[o["tier"]], "src": p[1].replace("/square.", "/original."), "r": 1}
    if o["st"]:
        r["st"] = o["st"]
    if o["own"] and o.get("g") != "research":
        r["ni"] = 1
    return r


def species_of(src, circles, only=()):
    """The species of the circle(s), in tools/seaslugs.json order; --only takes names or iNaturalist ids."""
    return [s for s in src["species"] if s.get("circle") in circles and s.get("inat")
            and (not only or s["name"] in only or str(s["inat"]) in only)]


# ---------------------------------------------------------------- genus-level photos and the species with no name


def agreement(o):
    """(agreeing, disagreeing) current identifications of an iNaturalist v2 observation asked with GL_FIELDS, against its
    own taxon (a genus): agreeing = at that taxon or below it; disagreeing = off its line (neither below it nor one of its
    ancestors). A coarser identification on its line (the observer's "Nudibranchs") is neither."""
    t = o.get("taxon") or {}
    tid = t.get("id")
    line = set(t.get("ancestor_ids") or []) | {tid}
    ag = dg = 0
    for i in o.get("identifications") or []:
        if not i.get("current"):
            continue
        x = i.get("taxon") or {}
        if x.get("id") == tid or tid in (x.get("ancestor_ids") or []):
            ag += 1
        elif x.get("id") not in line:
            dg += 1
    return ag, dg


def trim_gl(o):
    """A genus-level observation as the cache keeps it: fetch_fish.trim's fields, its taxon id (tid) and its agreement
    (ag, dg), not the identifications themselves."""
    r = trim(o)
    r.pop("tx", None)
    r["tid"] = (o.get("taxon") or {}).get("id")
    r["ag"], r["dg"] = agreement(o)
    return r


def agreed(o):
    """A genus-level observation well agreed at its genus (Q389 (1), the study's "2 identifications d'accord"): identified
    at the genus, and Research Grade there, or AGREE current identifications at the genus or below it and none off its
    line."""
    return o.get("rk") == "genus" and (o.get("g") == "research" or (o.get("ag", 0) >= AGREE and not o.get("dg")))


def usable_gl(o, pairs, used=frozenset(), taken=frozenset()):
    """A genus-level observation as a selection item (usable's shape), or None: agreed, in the Philippines, never
    annotated Dead or Egg, not among the candidates, with a CC0 / CC BY / CC BY-NC photo not taken yet (Pierre's own:
    whatever its licence, as fetch_fish.lic_ok reads it); its first such photo."""
    an = [tuple(a) for a in o.get("an") or []]
    if not agreed(o) or not o.get("inph") or DEAD in an or is_egg(o, pairs) or obs_url(o["id"]) in taken:
        return None
    own = o.get("u") == "ppericard"
    P = [p for p in o.get("ph") or [] if p[1] and lic_ok(p[2], own) and str(p[0]) not in used]
    if not P:
        return None
    p = P[0]
    return {"id": o["id"], "u": o.get("u"), "t": o.get("t"), "g": o.get("g"), "own": own, "tier": tier_of(o),
            "st": "/".join(sorted({STAGE[a] for a in an if a in STAGE})), "h": hord(o["id"]),
            "cls": rights_rank({"lic": p[2], "own": own}), "p": p}


def gl_query(taxa, extra=""):
    """The genus-level search of the iNaturalist genera taxa (ids): their observations in the Philippines identified at
    the genus, Research Grade or Needs ID, with a photo under one of LICENCES (filtered again by usable_gl), by id."""
    return (f"taxon_id={','.join(map(str, taxa))}&rank=genus&place_id={PH}&quality_grade=research,needs_id&captive=false"
            f"&photos=true&photo_license={LICENCES}&order_by=id&per_page=200{extra}")


def gl_obs(net, q, n=GL_PAGES):
    """Every observation of the genus-level search q, read to its end (id_below), at most n pages."""
    keep = lambda d: {"total": d.get("total_results", 0), "results": [trim_gl(o) for o in d.get("results") or []]}  # noqa: E731
    res, below = [], None
    for _ in range(n):
        d = net.fetch(API + q + (f"&id_below={below}" if below else "") + "&fields=" + GL_FIELDS, keep)
        if not d:
            break
        res += d["results"]
        if len(d["results"]) < 200 or d["total"] <= len(d["results"]):
            break
        below = min(o["id"] for o in d["results"])
    return res


def genus_ids(net, src, names):
    """{genus name: its iNaturalist taxon id} for the genera names, from one species of each (tools/seaslugs.json inat)
    and its ancestors, GL_BATCH species a request; a genus whose species sit under another iNaturalist genus (a name
    the two taxonomies differ on) tries its next species, and is left out (reported) when none matches."""
    by = {}
    for s in src["species"]:
        if s.get("genus") in names and s.get("inat"):
            by.setdefault(s["genus"], []).append(s["inat"])
    out, k = {}, 0
    keep = lambda d: {"results": [{"id": r.get("id"), "anc": [[a.get("id"), a.get("name"), a.get("rank")]  # noqa: E731
                                                          for a in r.get("ancestors") or []]} for r in d.get("results") or []]}
    while True:
        ask = {g: L[k] for g, L in by.items() if g not in out and k < len(L)}
        if not ask:
            break
        for B in inat.chunks(sorted(ask.items()), GL_BATCH):
            d = net.fetch(TAXA + ",".join(str(i) for _, i in B) + "?fields=id,ancestors.id,ancestors.name,ancestors.rank", keep)
            anc = {r["id"]: r["anc"] for r in (d or {}).get("results") or []}
            for g, i in B:
                hit = [a[0] for a in anc.get(i) or [] if a[2] == "genus" and a[1] == g]
                if hit:
                    out[g] = hit[0]
        k += 1
    return out


def game_genera(src, circles=CIRCLES):
    """The genus units of the game: the genera of the circles' species, in tools/seaslugs.json order."""
    return list(dict.fromkeys(s["genus"] for s in src["species"] if s.get("circle") in circles and s.get("genus")))


def label_counts(net, gid, field, near=False):
    """(observations, distinct observers) carrying the label field ({id, name, value}) at or under the genus gid, Research
    Grade or Needs ID, in the Philippines (near: within the centre's radius instead): what label_confirmed reads."""
    f = "field:" + urllib.parse.quote(field["name"]) + "=" + urllib.parse.quote(field["value"])
    q = f"taxon_id={gid}&verifiable=true&{f}&" + (NEAR_AREA if near else f"place_id={PH}")
    tot = lambda d: {"total": d.get("total_results", 0)}  # noqa: E731
    n = net.fetch(f"{inat.V1}observations?{q}&per_page=0", tot)
    u = net.fetch(f"{inat.V1}observations/observers?{q}&per_page=1", tot)
    return (n or {}).get("total", 0), (u or {}).get("total", 0)


def label_query(gid, field):
    """The candidate search of a species with no name: gl_query on its genus, the observations carrying its label."""
    return gl_query([gid], "&field:" + urllib.parse.quote(field["name"]) + "=" + urllib.parse.quote(field["value"]))


def informal_run(net, src, inf, have, T, pairs, used, taken, report, egg=frozenset()):
    """--informal: each species of tools/seaslug_informal.json, its presence measured (written into inf) and, when
    present, its candidates added to have under its key."""
    gids = genus_ids(net, src, {s["genus"] for s in inf["species"]})
    for s in inf["species"]:
        gid = gids.get(s["genus"])
        if not gid:
            print(f"{s['name']}: genus {s['genus']} not found on iNaturalist under that name; skipped")
            continue
        n, u = label_counts(net, gid, s["field"])
        nn, nu = label_counts(net, gid, s["field"], near=True)
        s["presence"] = {"obs": n, "observers": u, "nearObs": nn, "nearObservers": nu, "near": bool(near_dauin(nu)),
                         "confirmed": label_confirmed(u)}
        if not label_confirmed(u):
            print(f"{s['name']}: {u} observers with its label in the Philippines, below the rule; no candidates")
            continue
        L = have.setdefault(s["key"], [])
        cap = target(s, T)[0]
        n_ = Counter(("s", p.get("st", "")) for p in L)
        items = [x for x in (usable_gl(o, pairs, used, taken) for o in gl_obs(net, label_query(gid, s["field"]))) if x]
        got = pick(items, max(0, cap - held(L, egg)), n_, used, taken)
        L += [record(s["key"], o) for o in got]
        report[s["name"]] = {"n": held(L, egg), "target": cap, "new": len(got), "pool": len(items), **s["presence"]}
        print(f"{s['name']:<30} {held(L, egg):>2} / {cap} (+{len(got)}; {len(items)} usable observations with its label; "
              f"presence: {u} observers in the Philippines, {nu} near Dauin)", flush=True)


def gl_target(g, T):
    """A genus's genus-level list target: the species' candidates (20, never above max), the ceiling max (30) for a very
    variable genus (maxGenera, Q377) as its species have (the integrator's call, 2026-11-17, on Pierre's "fais les choix
    tout seul si ils sont faciles à revenir dessus": the colours vary in its genus-level photos as much)."""
    if g in (T.get("maxGenera") or ()):
        return int(T.get("max", T["candidates"]))
    return int(min(T.get("max", 1e9), T["candidates"]))


def genus_level_run(net, src, have, T, pairs, used, taken, report, only=(), egg=frozenset()):
    """--genus-level: the genus-level candidates of each genus unit (game_genera; --only: some of them), keyed by genus
    name, marked gl."""
    names = [g for g in game_genera(src) if not only or g in only]
    gids = genus_ids(net, src, set(names))
    by_id = {i: g for g, i in gids.items()}
    pool = {g: [] for g in names}
    for B in inat.chunks(sorted(by_id), GL_BATCH):
        for o in gl_obs(net, gl_query(B)):
            g = by_id.get(o.get("tid"))
            if g:
                pool[g].append(o)
    for g in names:
        cap = gl_target(g, T)
        L = have.setdefault(g, [])
        n = Counter()
        for p in L:
            n["s", p.get("st", "")] += 1
        items = [x for x in (usable_gl(o, pairs, used, taken) for o in pool[g]) if x]
        got = pick(items, max(0, cap - held(L, egg)), n, used, taken)
        L += [{**record(g, o), "gl": 1} for o in got]
        report[g] = {"n": held(L, egg), "target": cap, "new": len(got), "pool": len(items), "genus": len(pool[g]),
                     **({"missing": True} if g not in gids else {})}
        print(f"{g:<20} {held(L, egg):>2} / {cap} (+{len(got)}; {len(items)} usable of {len(pool[g])} genus-level observations"
              f"{'; genus not found on iNaturalist' if g not in gids else ''})", flush=True)


def trim_id(o):
    """An observation asked again by id (ID_FIELDS): fetch_fish.trim's fields, its taxon's line (tx), its agreement
    (tid, ag, dg) and its observation fields (of: [field id, name, value]), so one record serves usable (a species),
    usable_gl (a genus) and labelled (a species with no name)."""
    r = trim(o)
    r["tid"] = (o.get("taxon") or {}).get("id")
    r["ag"], r["dg"] = agreement(o)
    r["of"] = [[f.get("field_id"), f.get("name"), f.get("value")] for f in o.get("ofvs") or []]
    return r


def labelled(o, field):
    """The observation (trim_id) still carries the label field ({id, name, value}) as its current value: the field by
    its id or its name, the value as label_query asks it (case and spaces aside)."""
    v = str(field["value"]).strip().lower()
    return any((i == field.get("id") or n == field["name"]) and str(x).strip().lower() == v for i, n, x in o.get("of") or [])


def egg_query(ids):
    """The request that asks the observations ids again, by id. Never captive (captive=false), as every search: an
    observation marked captive since is not returned (Codex review #1046; fetch_fish.py's by-id refill does the same)."""
    return API + f"id={','.join(map(str, ids))}&captive=false&per_page={EGG_BATCH}&order_by=id&fields={ID_FIELDS}"


def eggs_back(net, jobs, egg, pairs, used, taken):
    """Rule P4 with the egg rule's filter 2: in each list of jobs [(key, L, cap, kind, genus, label)] (kind "sp": a species
    keyed by its taxon id; "gl": a genus's genus-level list; "inf": a species with no name, of genus `genus`, whose
    observations carry the label field {id, name, value}; label None for the others), each observation
    whose every candidate is judged an egg mass (egg_only) brings its next usable photo, in list order, while the list
    holds fewer than its target (held). The observations are asked again by id, as they are now (EGG_BATCH a request,
    every list together: rule C7): still that taxon (the species or below it; the genus; a species with no name: its
    genus and still its label, as label_query asks it, never one removed or changed since), and usable under the list's
    rules (usable, usable_gl: Research Grade or agreed, never annotated Egg or Dead, the licences), its own observation
    not counted as taken; a photo already a candidate never again (used). Asked only when one is wanted, then every
    observation with an egg-mass candidate in these lists, a set a rerun asks the same way (cached: --offline gives the
    same file). Returns {key: [records added]}."""
    want = {key: egg_only(L, egg) for key, L, cap, *_ in jobs if held(L, egg) < cap}
    num = lambda u: int(u.rsplit("/", 1)[-1])  # noqa: E731
    ids = sorted({num(p["o"]) for key, L, *_ in jobs for p in L if p["f"] in egg}) if any(want.values()) else []
    obs = {}
    for B in inat.chunks(ids, EGG_BATCH):
        d = net.fetch(egg_query(B), lambda d: {"results": [trim_id(o) for o in d.get("results") or []]})
        obs.update((o["id"], o) for o in (d or {}).get("results") or [])
    out = {}
    for key, L, cap, kind, genus, label in jobs:
        room = cap - held(L, egg)
        for u in want.get(key, []):
            o = obs.get(num(u))
            if room <= 0 or not o:
                continue
            if kind == "sp":
                x = int(key) in (o.get("tx") or [o.get("tid")]) and usable(o, pairs, used, taken - {u})
            elif kind == "inf" and not (label and labelled(o, label)):
                x = None
            else:
                x = o.get("t") == genus and usable_gl(o, pairs, used, taken - {u})
            if not x:
                continue
            r = {**record(key, x), **({"gl": 1} if kind == "gl" else {})}
            L.append(r)
            used.add(str(x["p"][0]))
            out.setdefault(key, []).append(r)
            room -= 1
    return out


def own_room(L, T, egg=frozenset()):
    """The room for Pierre's own observations in a list L: up to the ceiling `max`, so on a list the others already
    filled to its target his still come (a candidate already there is never removed); his count in the target after.
    A candidate judged an egg mass does not count (held)."""
    return max(0, T.get("max", 0) - held(L, egg))


def fill(net, s, L, T, pairs, used, taken, own_only=False, egg=frozenset()):
    """The new candidates of species s (L: its candidates already there): Pierre's own first (his search, every one
    usable up to own_room: the fish's select takes his first), then the juvenile room (Life Stage: Juvenile
    observations, the Philippines then abroad), then the rest (the Philippines, then abroad when their search was read to
    its end and room is left). own_only: his only, nothing else asked. egg: the candidates judged an egg mass, which
    count against nothing (held). Returns ([items], {"juvenile": short by})."""
    tid, Q = s["inat"], queries(s["inat"])
    cap, juv = target(s, T)
    n = Counter()
    for p in L:
        n["s", p.get("st", "")] += 1
    it = lambda obs: [x for x in (usable(o, pairs, used, taken) for o in obs) if x]  # noqa: E731
    got = []
    if own_room(L, T, egg):
        mine = pages(net, Q["own"], lambda res: False)
        got += pick([x for x in it(mine["results"]) if x["own"]], own_room(L, T, egg), n, used, taken)
    if own_only:
        return got, {}
    have = held(L, egg) + len(got)
    jr = max(0, min(juv - sum(1 for p in L if "juvenile" in (p.get("st") or "").split("/") and p["f"] not in egg)
                    - sum(1 for x in got if "juvenile" in x["st"].split("/")), cap - have))
    free = max(0, cap - have - jr)
    if not jr and not free:
        return got, {}
    enough = lambda res: len(it(res)) >= jr + free  # noqa: E731
    ph = pages(net, Q["ph"], enough)
    pool = it(ph["results"])
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
    own_only = getattr(args, "own", False)
    inf_path = Path(getattr(args, "informal_src", None) or INFORMAL)
    inf = json.loads(inf_path.read_text(encoding="utf-8")) if inf_path.exists() else {"species": []}
    order = [str(s["inat"]) for s in src["species"]] + [s["key"] for s in inf["species"]] + game_genera(src)
    sug_path = Path(getattr(args, "suggest", None) or SUGGEST)
    egg = egg_set(json.loads(sug_path.read_text(encoding="utf-8")) if sug_path.exists() else {})

    def back(jobs):
        """eggs_back over the run's lists, its count printed."""
        jobs = [j for j in jobs if j[0] in have]
        some = any(egg_only(j[1], egg) for j in jobs)
        got = eggs_back(net, jobs, egg, pairs, used, taken)
        if some:
            print(f"egg masses: {sum(map(len, got.values()))} observations brought their next photo "
                  f"({', '.join(f'{k} {len(v)}' for k, v in got.items()) or 'none'})", flush=True)
        return got

    if getattr(args, "informal", False) or getattr(args, "genus_level", False):
        try:
            jobs = []
            if args.informal:
                jobs += [(s["key"], have.get(s["key"], []), target(s, T)[0], "inf", s["genus"], s["field"])
                         for s in inf["species"]]
            if args.genus_level:
                # each genus's own target, the very variable genera's 30 included (gl_target)
                jobs += [(g, have.get(g, []), gl_target(g, T), "gl", g, None) for g in game_genera(src) if not only or g in only]
            back(jobs)
            if args.informal:
                informal_run(net, src, inf, have, T, pairs, used, taken, report, egg)
            if args.genus_level:
                genus_level_run(net, src, have, T, pairs, used, taken, report, only, egg)
        finally:
            net.save()
        if args.informal:
            inf_path.write_text(json.dumps(inf, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        out = {k: have[k] for k in sorted(have, key=lambda k: order.index(k) if k in order else 1e9) if have[k]}
        dump({"v": 1, "cand": out}, str(cand_path))
        gl = {k: v for k, v in report.items() if "genus" in v}
        if gl:
            print(f"genus level: {sum(v['new'] for v in gl.values())} candidates added over "
                  f"{sum(1 for v in gl.values() if v['new'])} of {len(gl)} genera; "
                  f"{sum(v['n'] for v in gl.values())} in all")
        return report
    try:
        # The egg masses' observations first (their next photo keeps their place; not with --own: his search only).
        back_ = {} if own_only else back([(str(s["inat"]), have.get(str(s["inat"]), []), target(s, T)[0], "sp",
                                           s.get("genus"), None) for s in S])
        # The admin's own for every species with room for them (his search, asked together: rule C7), then the general one.
        prefetch(net, [s["inat"] for s in S if own_room(have.get(str(s["inat"]), []), T, egg)], ["own"])
        if not own_only:
            prefetch(net, [s["inat"] for s in S if held(have.get(str(s["inat"]), []), egg) < target(s, T)[0]], ["ph"])
        for s in S:
            key = str(s["inat"])
            L = have.setdefault(key, [])
            got, short = fill(net, s, L, T, pairs, used, taken, own_only, egg)
            L += [record(key, o) for o in got]
            loc = Counter(p["loc"] for p in L if p["f"] not in egg)
            report[s["name"]] = {"n": held(L, egg), "target": target(s, T)[0], "eggBack": len(back_.get(key, [])),
                                 "ph": loc["dauin"] + loc["ph"], "world": loc["world"],
                                 "juvenile": sum(1 for p in L if "juvenile" in (p.get("st") or "")),
                                 "own": sum(1 for p in L if p.get("own")), "ownNew": sum(1 for o in got if o["own"]),
                                 **({"short": short} if short else {})}
            mine = f", Pierre's own {report[s['name']]['own']} (+{report[s['name']]['ownNew']})" if report[s["name"]]["own"] else ""
            print(f"{s['name']:<30} {held(L, egg):>2} / {target(s, T)[0]} (Philippines {loc['dauin'] + loc['ph']}, abroad "
                  f"{loc['world']}, juvenile {report[s['name']]['juvenile']}{mine}){' short ' + json.dumps(short) if short else ''}",
                  flush=True)
    finally:
        net.save()
    out = {k: have[k] for k in sorted(have, key=lambda k: order.index(k) if k in order else 1e9) if have[k]}
    dump({"v": 1, "cand": out}, str(cand_path))
    few = sorted(k for k, v in report.items() if v["n"] < T["start"])
    print(f"total {sum(map(len, out.values()))} photos for {len(out)} species; below the start of {T['start']}: "
          f"{', '.join(few) or 'none'}; Pierre's own added this run: {sum(v['ownNew'] for v in report.values())}")
    return report


def main(argv=None):
    a = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    a.add_argument("--circle", type=int, action="append", help="circle(s) to fetch (default 1)")
    a.add_argument("--only", help="comma-separated species names or iNaturalist taxon ids")
    a.add_argument("--own", action="store_true", help="Pierre's own observations only (his search), nothing else asked")
    a.add_argument("--informal", action="store_true",
                   help="the species with no name yet (tools/seaslug_informal.json): presence, then candidates (Q389 (2))")
    a.add_argument("--genus-level", action="store_true",
                   help="the genus units' genus-level candidates, marked gl (Q389 (1)); --only takes genus names")
    a.add_argument("--informal-src", default=str(INFORMAL))
    m = a.add_mutually_exclusive_group()
    m.add_argument("--refresh", action="store_true", help="ask iNaturalist again")
    m.add_argument("--offline", action="store_true", help="never ask iNaturalist (fail on a reply not cached)")
    a.add_argument("--src", default=str(SRC))
    a.add_argument("--cand", default=str(CAND))
    a.add_argument("--cache", default=str(CACHE))
    a.add_argument("--suggest", default=str(SUGGEST), help="the judgements whose egg masses free their place")
    args = a.parse_args(argv)
    args.circle = args.circle or [1]
    return run(args)


if __name__ == "__main__":
    main()
