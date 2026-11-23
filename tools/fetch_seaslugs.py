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
- Every photo of an observation (as the fish: docs/decisions/2026-11-24-seaslug-every-photo.md): an observation brings
  all its photos with a usable licence, in the observer's order, each a candidate of its own. Rule P4 is about what a
  question shows, not about what is fetched: the game draws one observation a question, and the judging pass marks the
  other photos of an observation `alt` or `dup` (judging/SEASLUG.md). The extras weigh EXTRA_W (0.5) against the target
  (fetch_fish.obs_cost: an observation's first photo 1), so an observation with many photos takes less room than as
  many observations, and the fish's own `select` picks them (pick).
- What counts against the target: the candidates still usable, weighted as above (held): a candidate the judging pass
  found an egg mass (data/suggest.json "seaslug" {egg: 1}, the egg rule's filter 2) frees its place. Only an egg mass
  does: unlike the fish's cap (fetch_fish.species_room), a candidate Pierre rejects, excludes or sends elsewhere, or the
  judging sets aside as a near-duplicate, still counts. An observation whose every candidate is an egg mass brings its
  next usable photos, asked again by id (eggs_back, every list of the run in one request), under the same rules as a new
  candidate (still that taxon, Research Grade or agreed, never annotated Egg or Dead, the licences); one without one
  leaves the place to the next observation. The egg-mass record stays (its judgement keeps it out).
- A photo of an observation Pierre sent elsewhere or out of a list (curation.json "seaslug" `out`) brings no other photo
  of that observation, as the fish's `known` (his identification is in doubt).
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
  every candidate already there and only fills the room left; a photo is never taken twice, nor an observation by two
  lists (a species with no name, then a genus).

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
observations, nothing else. --topup completes every list already in the file (species, genus-level and species with no
name; --only takes their keys): its observations are asked again by id, 200 a request (rule C7, at most TOPUP_MAX
requests: a larger read stops before it asks), and every usable photo of them not taken yet comes, each for EXTRA_W of
room, never blocking: a list it puts over its target only waits longer for new observations (nothing is removed). It is
the sea slugs' counterpart of `fetch_fish.py --topup`, for the observations fetched when one photo of each was taken.

Two more kinds of candidate (Pierre, 2026-11-17, Q389; study docs/reviews/2026-11-17-seaslug-undescribed-species-study.md
§4 (c) and (d)), asked with --informal and --genus-level (--informal first: an observation is never taken twice):
- **A species with no name yet** (tools/seaslug_informal.json, Q389 (2): Goniobranchus sp. 5 of Soong et al. 2020): its
  presence measured (the distinct observers of the observations carrying its label, the Philippines and near Dauin:
  tools/presence.py label_confirmed, written into the file's `presence`), then its candidates as a species' (the photo
  target, the order, every photo of an observation, eggs and Dead out), from the observations in the Philippines carrying
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
  every photo of an observation. Keyed by the genus's name ("Goniobranchus"; the species are keyed by taxon id), each record marked
  `gl: 1`: a photo of the genus, never counted for a species (tools/seaslug_game.py puts it in play for its genus unit,
  sp "g:<genus>"). Pierre's own observations follow the same rule (no own search: the species' Q386 rule is about photos
  named to the species). The genus ids are read from iNaturalist (one species of each genus, its ancestors, batched).

    python3 tools/fetch_seaslugs.py [--circle 1] [--only "Jorunna parva,119434"] [--own] [--refresh | --offline]
    python3 tools/fetch_seaslugs.py --informal [--genus-level] [--refresh | --offline]
    python3 tools/fetch_seaslugs.py --genus-level [--only "Goniobranchus,Phyllidiella"] [--refresh | --offline]
    python3 tools/fetch_seaslugs.py --topup [--only "601,Goniobranchus"] [--offline]
    (--suggest PATH: the judgements read for the egg masses, default data/suggest.json; --cur PATH: curation.json)
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
from fetch_fish import (API, DEAD, FIELDS, LICENCES, LOC, PH, STAGE, TAXA, Net, hord, lic_class, lic_ok, obs_cost,  # noqa: E402
                        obs_url, pages, phase_obs, prefetch, queries, select, tier_of, trim, usable_obs)
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
EGG_BATCH = 200  # observations asked again by id in one request (eggs_back, topup; rule C7)
TOPUP_MAX = 40  # requests a --topup may ask at most: a larger read stops before it asks (rule C7)
# eggs_back's fields: GL_FIELDS and the observation fields, whose label says a species with no name
ID_FIELDS = GL_FIELDS + ",ofvs.field_id,ofvs.name,ofvs.value"
SUGGEST = ROOT / "data/suggest.json"  # the judgements: data/suggest.json "seaslug" (tools/judging_fish.py --subject seaslug)
CUR = ROOT / "curation.json"  # Pierre's choices, read only: "seaslug" `out` (photos sent elsewhere) stops an observation's other photos


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


def whole(x):
    """x as an int when it is one (the room is counted in halves: an extra photo takes EXTRA_W)."""
    return int(x) if x == int(x) else x


def held(L, egg=frozenset(), only=None):
    """The room the candidates of list L take against its target: those still usable (every one but those judged an egg
    mass), weighted per observation as the fish's cap counts them (fetch_fish.species_room, obs_cost): an observation's
    first usable photo in list order counts 1, each further one EXTRA_W. only: a test of a record; only the ones it accepts
    are summed, the weights still follow the observation."""
    n, room = Counter(), 0
    for p in L:
        if p["f"] in egg:
            continue
        k = obs_cost(n[p["o"]], 1)
        n[p["o"]] += 1
        if only is None or only(p):
            room += k
    return whole(room)


def kept_of(L, egg=frozenset()):
    """{observation URL: its candidates still usable} of list L: what select calls `held`, so an observation among the
    candidates brings its other photos at their weight and its observer and life stage are not counted again."""
    n = Counter()
    for p in L:
        if p["f"] not in egg:
            n[p["o"]] += 1
    return n


def stages(L):
    """Counter of ("s", life stage) over the observations of list L (one count per observation, as select counts them)."""
    n, seen = Counter(), set()
    for p in L:
        if p["o"] not in seen:
            seen.add(p["o"])
            n["s", p.get("st", "")] += 1
    return n


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


def usable(o, pairs, used=frozenset()):
    """One observation (as fetch_fish.trim keeps it) as a selection item, or None: the fish's rule (fetch_fish.usable_obs:
    the species level or below, Research Grade or Pierre's own, never annotated Dead, abroad only inside the Indo-West
    Pacific, CC0 / CC BY / CC BY-NC photos or his own whatever their licence), no egg annotation, with a usable photo not
    taken yet (used: photo ids). The item carries every such photo (P), each a candidate of its own."""
    if is_egg(o, pairs):
        return None
    return usable_obs({**o, "an": o.get("an") or [], "ph": o.get("ph") or []}, used, ())


def pick(items, room, n, used, kept, own_first=True):
    """Up to `room` of room taken from items, in photos, by the fish's own order (fetch_fish.select with photos=True): Pierre's
    own first (own_first; a genus-level list, which has no search of his own, takes his like any other), then the least
    represented observer, then life stage (n: Counter of ("u", login) and ("s", stage) already in the list, updated
    here), then the licence (open first), then the fixed hash. An observation brings every usable photo it has left, its
    first for 1 of room and each further one for EXTRA_W (obs_cost), cut to the room left. used (photo ids) and kept
    (kept_of: the photos each observation already holds) are updated: a photo is taken once. Each item returned carries
    only its own photos (P) and the room it took (cost)."""
    if own_first:
        return select({"ph": items}, room, {}, n, claimed=used, photos=True, held=kept)
    own = {o["id"]: o["own"] for o in items}
    got = select({"ph": [{**o, "own": False} for o in items]}, room, {}, n, claimed=used, photos=True, held=kept)
    return [{**o, "own": own[o["id"]]} for o in got]


def record(key, o, p):
    """A candidate: photo p of observation item o, in data/fish-cand.json's fields (fetch_fish.record)."""
    r = {"f": f"{PREFIX}-{key}-cand-{p[0]}", "a": p[3] or (f"(c) {o['u']}" if o["u"] else ""),
         "lic": p[2] or ("own" if o["own"] else ""), "o": obs_url(o["id"]), "t": o["t"], "own": o["own"],
         "loc": LOC[o["tier"]], "src": p[1].replace("/square.", "/original."), "r": 1}
    if o["st"]:
        r["st"] = o["st"]
    if o["own"] and o.get("g") != "research":
        r["ni"] = 1
    return r


def add_picks(L, key, got, taken, gl=False):
    """The picked items `got` as candidate records of list L (key), one per photo, in the order picked; their
    observations now belong to list key (taken: {observation URL: list key}). gl: genus-level records. Returns the
    records added."""
    new = [{**record(key, o, p), **({"gl": 1} if gl else {})} for o in got for p in o["P"]]
    L += new
    for o in got:
        taken[obs_url(o["id"])] = key
    return new


def spent(got):
    """The room the picked items took."""
    return whole(sum(o["cost"] for o in got))


def mine(items, taken, key):
    """The items not already in another list (taken: {observation URL: list key}): a species with no name and a genus
    never hold the same observation."""
    return [x for x in items if taken.get(obs_url(x["id"]), key) == key]


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


def usable_gl(o, pairs, used=frozenset()):
    """A genus-level observation as a selection item (usable's shape), or None: agreed, in the Philippines, never
    annotated Dead or Egg, with a CC0 / CC BY / CC BY-NC photo not taken yet (Pierre's own: whatever its licence, as
    fetch_fish.lic_ok reads it); the item carries every such photo (P)."""
    an = [tuple(a) for a in o.get("an") or []]
    if not agreed(o) or not o.get("inph") or DEAD in an or is_egg(o, pairs):
        return None
    own = o.get("u") == "ppericard"
    P = [p for p in o.get("ph") or [] if p[1] and lic_ok(p[2], own) and str(p[0]) not in used]
    if not P:
        return None
    return {"id": o["id"], "u": o.get("u"), "t": o.get("t"), "g": o.get("g"), "own": own, "tier": tier_of(o),
            "st": "/".join(sorted({STAGE[a] for a in an if a in STAGE})), "h": hord(o["id"]),
            "cls": min(lic_class(p[2], own) for p in P), "P": P}


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


def informal_run(net, src, inf, have, T, pairs, used, taken, report, egg=frozenset(), known=frozenset()):
    """--informal: each species of tools/seaslug_informal.json, its presence measured (written into inf) and, when
    present, its candidates added to have under its key. known: observation URLs that bring no other photo (sent elsewhere
    by Pierre)."""
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
        items = mine([x for x in (usable_gl(o, pairs, used) for o in gl_obs(net, label_query(gid, s["field"])))
                      if x and obs_url(x["id"]) not in known], taken, s["key"])
        got = pick(items, max(0, cap - held(L, egg)), stages(L), used, kept_of(L, egg), own_first=False)
        new = add_picks(L, s["key"], got, taken)
        report[s["name"]] = {"n": held(L, egg), "target": cap, "new": len(new), "pool": len(items), **s["presence"]}
        print(f"{s['name']:<30} {held(L, egg):>4} / {cap} (+{len(new)}; {len(items)} usable observations with its label; "
              f"presence: {u} observers in the Philippines, {nu} near Dauin)", flush=True)


def gl_target(g, T):
    """A genus's genus-level list target: the species' candidates (20, never above max), the ceiling max (30) for a very
    variable genus (maxGenera, Q377) as its species have (the integrator's call, 2026-11-17, on Pierre's "fais les choix
    tout seul si ils sont faciles à revenir dessus": the colours vary in its genus-level photos as much)."""
    if g in (T.get("maxGenera") or ()):
        return int(T.get("max", T["candidates"]))
    return int(min(T.get("max", 1e9), T["candidates"]))


def genus_level_run(net, src, have, T, pairs, used, taken, report, only=(), egg=frozenset(), known=frozenset()):
    """--genus-level: the genus-level candidates of each genus unit (game_genera; --only: some of them), keyed by genus
    name, marked gl. known: as informal_run's."""
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
        items = mine([x for x in (usable_gl(o, pairs, used) for o in pool[g]) if x and obs_url(x["id"]) not in known], taken, g)
        got = pick(items, max(0, cap - held(L, egg)), stages(L), used, kept_of(L, egg), own_first=False)
        new = add_picks(L, g, got, taken, gl=True)
        report[g] = {"n": held(L, egg), "target": cap, "new": len(new), "pool": len(items), "genus": len(pool[g]),
                     **({"missing": True} if g not in gids else {})}
        print(f"{g:<20} {held(L, egg):>4} / {cap} (+{len(new)}; {len(items)} usable of {len(pool[g])} genus-level observations"
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


num = lambda u: int(u.rsplit("/", 1)[-1])  # noqa: E731  the iNaturalist id of an observation URL


def again(net, ids):
    """{observation id: the observation as trim_id keeps it} for the observation ids asked again by id, EGG_BATCH a
    request (rule C7): the ones iNaturalist still returns (never captive)."""
    obs = {}
    for B in inat.chunks(sorted(ids), EGG_BATCH):
        d = net.fetch(egg_query(B), lambda d: {"results": [trim_id(o) for o in d.get("results") or []]})
        obs.update((o["id"], o) for o in (d or {}).get("results") or [])
    return obs


def still(o, job, pairs, used):
    """Observation o (trim_id), asked again, as an item of the list of job (key, L, cap, kind, genus, label), or None. kind
    "sp": a species keyed by its taxon id; "gl": a genus's genus-level list; "inf": a species with no name, of genus
    `genus`, whose observations carry the label field {id, name, value} (label None for the others). Still that taxon (the
    species or below it; the genus; a species with no name: its genus and still its label, as label_query asks it, never
    one removed or changed since) and usable under the list's rules (usable, usable_gl: Research Grade or agreed, never
    annotated Egg or Dead, the licences); a photo already a candidate never again (used)."""
    key, _, _, kind, genus, label = job
    if kind == "sp":
        return int(key) in (o.get("tx") or [o.get("tid")]) and usable(o, pairs, used) or None
    if kind == "inf" and not (label and labelled(o, label)):
        return None
    return o.get("t") == genus and usable_gl(o, pairs, used) or None


def eggs_back(net, jobs, egg, pairs, used):
    """The egg rule's filter 2: in each list of jobs [(key, L, cap, kind, genus, label)] (still: kind and label), each
    observation whose every candidate is judged an egg mass (egg_only) brings its next usable photos, in list order, while
    the list holds fewer than its target (held), each photo for its weight (fetch_fish.obs_cost; the last cut to the room
    left). The observations are asked again by id, as they are now (again: every list together), under the list's rules
    (still). Asked only when one is wanted, then every observation with an egg-mass candidate in these lists, a set a
    rerun asks the same way (cached: --offline gives the same file). Returns {key: [records added]}."""
    want = {job[0]: egg_only(job[1], egg) for job in jobs if held(job[1], egg) < job[2]}
    ids = {num(p["o"]) for job in jobs for p in job[1] if p["f"] in egg} if any(want.values()) else set()
    obs = again(net, ids)
    out = {}
    for job in jobs:
        key, L, cap = job[:3]
        room = cap - held(L, egg)
        kept = kept_of(L, egg)
        for u in want.get(key, []):
            o = obs.get(num(u))
            x = o and room > 0 and still(o, job, pairs, used)
            if not x:
                continue
            got = pick([x], room, Counter(), used, kept)
            new = [{**record(key, g, p), **({"gl": 1} if job[3] == "gl" else {})} for g in got for p in g["P"]]
            L += new
            out.setdefault(key, []).extend(new)
            room -= spent(got)
    return out


def topup(net, jobs, pairs, used, known=frozenset()):
    """--topup: every observation among the candidates of the lists of jobs (eggs_back's) asked again by id (200 a request,
    rule C7: more than TOPUP_MAX requests to ask stops it before the first) and every photo of it usable and not taken
    yet comes, each for EXTRA_W of room (obs_cost): it never blocks, a list it puts over its target only waits longer
    for new observations (nothing is removed). An observation with a photo Pierre sent elsewhere (known: observation
    URLs), or no longer of that taxon or usable (still), brings nothing more. The same observations are asked again on
    a rerun (cached: --offline gives the same file). Returns ({key: [records added]}, {what was asked and found:
    "asked", "requests" (not cached before), "returned", "gone" (not returned: deleted, captive or merged since),
    "unusable" (returned, no longer usable as that list's), "complete" (usable, every photo a candidate already),
    "brought" (observations that brought photos), "photos"})."""
    ids = {num(p["o"]) for job in jobs for p in job[1] if p["o"] not in known}
    asks = [B for B in inat.chunks(sorted(ids), EGG_BATCH) if net.need(egg_query(B))]
    if len(asks) > TOPUP_MAX:
        sys.exit(f"--topup: {len(ids)} observations would take {len(asks)} requests, more than the {TOPUP_MAX} allowed "
                 "(rule C7); stopped before asking. Ask fewer lists with --only.")
    obs = again(net, ids)
    out, st = {}, Counter(asked=len(ids), returned=len(obs), requests=len(asks))
    st["gone"] = len(ids) - len(obs)
    for job in jobs:
        key, L, _, kind = job[:4]
        for u in dict.fromkeys(p["o"] for p in L if p["o"] not in known):
            o = obs.get(num(u))
            if not o:
                continue
            x = still(o, job, pairs, used)
            if not x:
                # Nothing more to bring: every usable photo is a candidate already, or none is usable any more.
                st["complete" if still(o, job, pairs, frozenset()) else "unusable"] += 1
                continue
            new = [{**record(key, x, p), **({"gl": 1} if kind == "gl" else {})} for p in x["P"]]
            used.update(str(p[0]) for p in x["P"])
            L += new
            out.setdefault(key, []).extend(new)
            st["brought"] += 1
            st["photos"] += len(new)
    return out, dict(st)


def topup_jobs(have, inf, only=()):
    """The lists of the candidate file `have` as topup's jobs (key, L, cap, kind, genus, label), in file order: a species
    (a taxon id), a genus's genus-level list (its records marked gl) or a species with no name (its key in inf). only: the
    keys asked for (every list when empty). The cap is not used (a top-up never blocks)."""
    names = {s["key"]: s for s in inf["species"]}
    jobs = []
    for key, L in have.items():
        if only and key not in only:
            continue
        if key in names:
            jobs.append((key, L, 0, "inf", names[key]["genus"], names[key]["field"]))
        elif any(p.get("gl") for p in L):
            jobs.append((key, L, 0, "gl", key, None))
        elif key.isdigit():
            jobs.append((key, L, 0, "sp", None, None))
    return jobs


def own_room(L, T, egg=frozenset()):
    """The room for Pierre's own observations in a list L: up to the ceiling `max`, so on a list the others already
    filled to its target his still come (a candidate already there is never removed); his count in the target after.
    A candidate judged an egg mass does not count (held)."""
    return max(0, T.get("max", 0) - held(L, egg))


def fill(net, s, L, T, pairs, used, own_only=False, egg=frozenset(), known=frozenset()):
    """The new candidates of species s (L: its candidates already there), in room as the fish's cap counts it (held): Pierre's
    own first (his search, every one usable up to own_room: the fish's select takes his first), then the juvenile room
    (Life Stage: Juvenile observations, the Philippines then abroad), then the rest (the Philippines, then abroad when
    their search was read to its end and room is left). An observation among the candidates brings its other photos,
    at their weight. own_only: his only, nothing else asked. egg: the candidates judged an egg mass, which count against
    nothing (held). known: observation URLs that bring no other photo (sent elsewhere by Pierre). Returns ([items, each
    with its photos P and its cost], {"juvenile": room short by})."""
    tid, Q = s["inat"], queries(s["inat"])
    cap, juv = target(s, T)
    n, kept = stages(L), kept_of(L, egg)
    it = lambda obs: [x for x in (usable(o, pairs, used) for o in obs if obs_url(o["id"]) not in known) if x]  # noqa: E731
    # The room the usable observations of a search would take, counted as pick takes it (obs_cost).
    cost = lambda res: sum(obs_cost(kept.get(obs_url(x["id"]), 0), len(x["P"])) for x in it(res))  # noqa: E731
    got = []
    if own_room(L, T, egg):
        own_obs = pages(net, Q["own"], lambda res: False)
        got += pick([x for x in it(own_obs["results"]) if x["own"]], own_room(L, T, egg), n, used, kept)
    if own_only:
        return got, {}
    have = held(L, egg) + spent(got)
    juvenile = lambda st: "juvenile" in (st or "").split("/")  # noqa: E731
    jr = whole(max(0, min(juv - held(L, egg, lambda p: juvenile(p.get("st"))) - spent([x for x in got if juvenile(x["st"])]),
                          cap - have)))
    free = whole(max(0, cap - have - jr))
    if not jr and not free:
        return got, {}
    ph = pages(net, Q["ph"], lambda res: cost(res) >= jr + free)
    pool = it(ph["results"])
    if jr:
        jobs, jmore = phase_obs(net, "juvenile", [tid], "ph")
        J = [x for x in pool if juvenile(x["st"])] + it(jobs[tid])
        g = pick(J, jr, n, used, kept)
        if spent(g) < jr and not jmore[tid]:
            wobs, _ = phase_obs(net, "juvenile", [tid], "world")
            g += pick([x for x in it(wobs[tid]) if x["tier"] == "world"], jr - spent(g), n, used, kept)
        got += g
        jr = whole(jr - spent(g))
    g = pick(pool, free, n, used, kept)
    got += g
    left = free - spent(g)
    if left > 0 and ph["total"] <= len(ph["results"]):
        w = pages(net, Q["world"], lambda res: cost(res) >= left)
        got += pick([x for x in it(w["results"]) if x["tier"] == "world"], left, n, used, kept)
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
    taken = {p["o"]: key for key, L in have.items() for p in L}  # observation URL -> the list that holds it
    cur_path = Path(getattr(args, "cur", None) or CUR)
    cur = json.loads(cur_path.read_text(encoding="utf-8")) if cur_path.exists() else {}
    moved = set(((cur.get("seaslug") or {}).get("out")) or {})  # photos Pierre sent elsewhere or out
    known = {p["o"] for L in have.values() for p in L if p["f"] in moved}
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
        got = eggs_back(net, jobs, egg, pairs, used)
        if some:
            print(f"egg masses: {len({r['o'] for v in got.values() for r in v})} observations brought their next photos "
                  f"({', '.join(f'{k} {len(v)}' for k, v in got.items()) or 'none'})", flush=True)
        return got

    if getattr(args, "topup", False):
        jobs = topup_jobs(have, inf, only)
        try:
            got, st = topup(net, jobs, pairs, used, known)
        finally:
            net.save()
        kinds = Counter()
        for j in jobs:
            kinds[j[3]] += len(got.get(j[0], []))
        print(f"topup: {st['asked']} observations asked again ({st['requests']} requests), {st['returned']} returned, "
              f"{st['gone']} gone since; {st.get('brought', 0)} brought {st.get('photos', 0)} more photos "
              f"({kinds['sp']} of species, {kinds['gl']} genus-level, {kinds['inf']} of species with no name); "
              f"{st.get('complete', 0)} had every photo already, {st.get('unusable', 0)} no longer usable", flush=True)
        if got:
            out = {k: have[k] for k in sorted(have, key=lambda k: order.index(k) if k in order else 1e9) if have[k]}
            dump({"v": 1, "cand": out}, str(cand_path))
        return {**st, **kinds}

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
                informal_run(net, src, inf, have, T, pairs, used, taken, report, egg, known)
            if args.genus_level:
                genus_level_run(net, src, have, T, pairs, used, taken, report, only, egg, known)
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
            got, short = fill(net, s, L, T, pairs, used, own_only, egg, known)
            add_picks(L, key, got, taken)
            loc = Counter(p["loc"] for p in L if p["f"] not in egg)
            report[s["name"]] = {"n": held(L, egg), "target": target(s, T)[0], "eggBack": len(back_.get(key, [])),
                                 "ph": loc["dauin"] + loc["ph"], "world": loc["world"],
                                 "juvenile": sum(1 for p in L if "juvenile" in (p.get("st") or "")),
                                 "own": sum(1 for p in L if p.get("own")), "ownNew": sum(len(o["P"]) for o in got if o["own"]),
                                 **({"short": short} if short else {})}
            own = f", Pierre's own {report[s['name']]['own']} (+{report[s['name']]['ownNew']})" if report[s["name"]]["own"] else ""
            print(f"{s['name']:<30} {held(L, egg):>4} / {target(s, T)[0]} (Philippines {loc['dauin'] + loc['ph']}, abroad "
                  f"{loc['world']}, juvenile {report[s['name']]['juvenile']}{own}){' short ' + json.dumps(short) if short else ''}",
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
    a.add_argument("--topup", action="store_true",
                   help="the other photos of the observations already among the candidates, asked by id (every list; --only: keys)")
    a.add_argument("--informal-src", default=str(INFORMAL))
    m = a.add_mutually_exclusive_group()
    m.add_argument("--refresh", action="store_true", help="ask iNaturalist again")
    m.add_argument("--offline", action="store_true", help="never ask iNaturalist (fail on a reply not cached)")
    a.add_argument("--src", default=str(SRC))
    a.add_argument("--cand", default=str(CAND))
    a.add_argument("--cache", default=str(CACHE))
    a.add_argument("--suggest", default=str(SUGGEST), help="the judgements whose egg masses free their place")
    a.add_argument("--cur", default=str(CUR), help="curation.json (read only): its seaslug `out` photos' observations bring no more")
    args = a.parse_args(argv)
    args.circle = args.circle or [1]
    return run(args)


if __name__ == "__main__":
    main()
