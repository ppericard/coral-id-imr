#!/usr/bin/env python3
"""Fish candidate photos from iNaturalist, for Pierre to curate in the admin, into fish-cand.json.
(The admin's fish Candidates page comes with the admin plan's PR 5, docs/ROADMAP.md "Admin for every subject".)

The fish counterpart of tools/fetch_local.py (corals), with Pierre's decisions for fish photos (2026-11-03):
- Unit: the species of fish.json (`species`, PDF / EventMeasure names), grouped under the teaching entries (`teach`).
  A photo belongs to the most precise taxon its observation names: the species (iNaturalist's taxon query includes
  subspecies). Only species in the game (with a `circle`, never `out`), circle 1 by default (--circle).
- Identity: Research Grade at the species level; Pierre's own observations (iNaturalist user ppericard) identified to
  the species are usable as that species even when Needs ID (rule S2: he names a species only when nearly
  sure), nobody else's. That is photo use only: they no longer confirm presence on their own (rule C8; fish.json
  present.ph decides which species are in the game and which may have photos from abroad). Never captive (captive=false),
  never an observation annotated "Dead" (fish markets; the pre-sort sets aside the unannotated ones).
- Licences (Pierre, 2026-11-03; fish prefer free licences, corals keep NC): only CC0, CC BY and CC BY-NC. Never a
  share-alike licence (CC BY-SA, CC BY-NC-SA: it would block a later commercial reuse) nor ND (crops are derivatives).
  Each photo keeps its licence (`lic`): a commercial version could keep only CC0 / CC BY and Pierre's own.
- Abroad = the Indo-West Pacific only (IWP, a 30 S - 30 N, 90 E - 170 E box around the Coral Triangle; Pierre,
  2026-11-03: the region of IMR's ID books, other oceans have other colour forms), for every search abroad and for
  Pierre's own observations abroad too.
- Order (`select`, Pierre, 2026-11-03): Pierre's own observations FIRST for every species, whatever their licence (his
  are CC BY or CC BY-NC, credited "Pierre Pericard"), in the Philippines or the IWP. Then:
  - a species confirmed near Dauin (fish.json present.near: Research Grade by 2+ observers within 40 km, or the
    IMR list): photos from anywhere in the Philippines and the IWP, not by distance;
  - any other species: the Philippines first, nearest first (within 40 km of Dauin, within REGION_KM = 250 km,
    the rest of the country), and abroad only for a species confirmed in the Philippines (present.ph, the presence rule of tools/presence.py), only when the
    Philippines are exhausted (every Philippine observation the search can see is taken and room is left; when the one
    page read is not all of them, later pages may still hold some, so nothing from abroad).
  The licence (CC0 / CC BY before NC) is only the last tie-break, after the variety below (Pierre, 2026-11-08, Q284:
  "je ne veux pas que ça soit au coût de la variété"; from 2026-11-03 it came before the distance and the variety).
- Quality varied on purpose (Pierre: poor iNaturalist photos stand in for SVS video frames, on which EventMeasure
  identifications are made): no ordering by votes (that favours the best photos), no quality filter. The order is a
  fixed hash of the observation id (neutral, reproducible), then the least represented observer and life stage first
  (iNaturalist annotations Juvenile / Adult / Female / Male, kept as `st`: a hint for the pre-sort's phase).
- Photos per species (Pierre, 2026-11-05, Q36): the cap is weighted by how variable the species looks: 30 photos for a
  stable species, +10 per extra phase (juvenile, intermediate phase, male or terminal phase, female) as the judging tags
  and the sources record them, at most 60 (cap_of; the phases: species_phases). Each extra phase holds PER_PHASE (10) of
  them for photos of that phase, the rest is free (phase_room), and the search fills each phase first: per phase where
  iNaturalist can filter it (Life Stage Juvenile, Sex Male, Sex Female annotations: INAT_PHASE; batched over the species,
  rule C7), so a species with very different juveniles does not end up with 30 adults and no juvenile; FishBase
  (tools/fetch_fishbase.py) fills what is left, phases first. The cap counts the photos still usable (added by Pierre,
  set in by the pre-sort, or waiting); what Pierre rejects, excludes or sends elsewhere, and what the pre-sort sets aside
  without doubt, frees room for the next run. Each observation brings ALL its photos (Pierre, 2026-11-08: no limit per
  observation any more, 4 until then; the judging pass marks the near-duplicates within an observation, judging/FISH.md
  keep), and its photos count against the cap by weight (Pierre, 2026-11-08, Q226, option b): its first photo 1, each
  further photo EXTRA_W (0.5) (obs_cost), so an observation with many photos takes less room than as many observations;
  a refill brings the photos an observation already among the candidates still has. One function for both tools: species_room.
- Candidates stay remote (r: 1, shown from `src` straight from iNaturalist), like coral candidates: nothing is downloaded,
  never commit a photo. Record shape as coral candidates (data.json "cand"): f, a, lic, o, t, own, loc (dauin/ph/world),
  src, r, plus st (life stage / sex annotations) and ni (Pierre's own Needs ID observation, confirmed by rule S2).
  fish-cand.json = {"v": 1, "cand": {species id: [photo, ...]}}, one species per line (tools/datajson.py layout).
- Curation: curation.json "fish" (written by the admin only, never here; its full shape is the admin plan's PR 4): add
  {f: 1}, seen {f: 1} (rejected), exclude {f: reason}, out {f: species id or "x"}. The top-level "exclude" (corals) is honoured too, by iNaturalist photo id.
- Pre-sort: suggest.json "fish" (tools/judging_fish.py, judging/FISH.md "Candidates").
- Reference photos (Pierre, 2026-11-05): --rep tags each candidate whose photo is its taxon's iNaturalist cover (the
  taxon's default photo, what iNaturalist shows to represent the species) with rep: "inaturalist" (judging/FISH.md
  "Reference photos": its ease gets a bonus), 30 taxa a request, and refills nothing; run it after a refill. FishBase
  candidates (via: "fishbase", tools/fetch_fishbase.py) carry their own tag.
- Automatic refill (Pierre, 2026-11-06, Q171: "no more candidates is no more candidates"): --refill, run by the
  "Candidate photos" workflow after each Publish, refills the short species only, with the rules above. Short
  (`shortness`): below its cap (the room of species_room: the cap net of what Pierre rejected, excluded or sent
  elsewhere and of what the pre-sort set aside), or fewer than EASY_NEED observations with a very easy photo (ease >=
  EASY_E) in play or sure to come (Pierre's adds, the pre-sort's sure adds, the game photos). Only a species with room
  is refilled (the cap holds: Q36); at most REFILL_MAX a run, the shortest first (short of easy photos with nothing
  waiting for the judging pass, then the largest share of its cap missing), each search paged (id_below, up to
  GEN_PAGES pages) while it brings too few usable photos. Exhaustion is remembered in tools/fish_refill.json per species
  and part of its room ("free", or a phase iNaturalist can search on): a part still open after a run whose searches were
  read to their end, or which got nothing, is "searched to the end" on that day; the species is skipped while every
  open part of its room was searched to the end less than RECHECK_DAYS ago. Then FishBase fills what iNaturalist left
  (tools/fetch_fishbase.py, offline) and --rep tags the covers, for the refilled species only. The new candidates wait
  for the judging pass (python3 tools/judging_fish.py todo), whose sure decisions the admin's auto-sort applies.
  --refill --plan prints, offline, the short species, the pick and the skipped ones; it writes nothing. A refill first
  runs --topup over every species of its circles: the other photos of the observations fetched under the old limit of 4
  per observation (topup; one request per 200 such observations).

Network: iNaturalist API v2 (only the fields used), read only, through tools/inat.py (about one request a second, the
project's User-Agent, 429 / 5xx retried after a pause; rule C7). The general searches of many species are asked together
(prefetch: taxon_id=a,b,c, BATCH_PAGES pages at most), each species' share answering its own search exactly as
iNaturalist would; a species with many observations keeps its own search.
Every reply is cached, trimmed, in tools/.cache/fish_photos.json (git-ignored): a rerun is offline and gives the same
file; --refresh asks again (new observations), --offline never asks (fails on a reply not cached), --plan prints as JSON,
offline, per species its cap, its phases (with what records each), the photos it keeps per phase and the room per phase,
and what a run would add per source and phase from the cache (a species not cached says "cached": false); it writes
nothing.

    python3 tools/fetch_fish.py [--circle 1] [--cap N] [--only s091,t05] [--refresh | --offline | --plan] [--rep]
    python3 tools/fetch_fish.py --refill [--circle 1 --circle 2 --circle 3] [--max N] [--today YYYY-MM-DD] [--plan]
    python3 tools/fetch_fish.py --topup [--circle 1 ...] [--only s091] [--offline | --plan]
(--cap N: one fixed cap for every species instead of cap_of, for a test or a one-off; the phase rooms still apply.)
Tests: node --test tests/fishphotos.test.js (offline fixtures).
"""
import argparse
import datetime
import hashlib
import json
import math
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
from datajson import dump  # noqa: E402  one species per line, as cand.json
from rights import rights_rank  # noqa: E402  the rights of a photo, as core.js rightsRank (Q270)

API = "https://api.inaturalist.org/v2/observations?"
TAXA = "https://api.inaturalist.org/v2/taxa/"
FIELDS = ("id,quality_grade,location,place_ids,taxon.id,taxon.name,taxon.rank,user.login,photos.id,photos.url,"
          "photos.license_code,photos.attribution,annotations.controlled_attribute_id,annotations.controlled_value_id,"
          "annotations.vote_score")
import inat  # noqa: E402  the one paced, retried iNaturalist client (rule C7): about one request a second, a User-Agent
DAUIN = (9.19, 123.26)
DAUIN_KM, REGION_KM = 40, 250  # as tools/fetch_local.py
PH = 6873  # iNaturalist place: the Philippines
PIERRE = "ppericard"
# How an observation's photos count against the cap (Pierre, 2026-11-08: every photo of an observation is taken, "weight
# the choice so one observation does not bring too many, never blocking"; Q226, option b: the first photo 1, each further
# photo half, "better for learning on the species already full"): obs_cost.
EXTRA_W = 0.5
OLD_LIMIT = 4  # photos per observation at most until 2026-11-08: the observations --topup completes
# The cap per species (Pierre, 2026-11-05, Q36; before: 20 observations per species, 2026-11-04): 30 photos for a stable
# species, +10 per extra phase, at most 60; each extra phase aims at PER_PHASE photos of its own, the rest is free.
BASE_CAP, PER_PHASE, MAX_CAP = 30, 10, 60
PHASES = ("juvenile", "intermediate", "male", "female")  # the extra phases, in this order; "male" = male or terminal phase
# Words of the judging tags (judging/FISH.md phase values) and of the sources (iNaturalist and FishBase life stage and
# sex; record st) -> phase. "adult" is no extra phase.
PHASE_WORD = {"juvenile": "juvenile", "subadult": "intermediate", "intermediate": "intermediate", "initial": "intermediate",
              "initial phase": "intermediate", "terminal": "male", "terminal phase": "male", "male": "male", "female": "female"}
# The phases iNaturalist can search on: (term_id, term_value_id) of the Life Stage and Sex annotations. No annotation
# says "intermediate phase": its room is filled by the general search (and FishBase's "initial phase").
INAT_PHASE = {"juvenile": (1, 8), "male": (9, 11), "female": (9, 10)}
# Observer annotations (iNaturalist Life Stage or Sex, on distinct candidate observations) needed before they make a
# phase on their own: one stray annotation (a "male" on a species whose sexes look alike) does not.
MIN_ANNOT = 2
PHASE_BATCH, PHASE_PAGES = 20, 5  # taxa per phase search, pages of 200 read per batch (id_above) at most
# The searches ask for these (unchanged so the cache stays valid); an observation can mix licences, so each photo is then
# checked against OK: never share-alike, never ND (Pierre, 2026-11-03).
LICENCES = "cc0,cc-by,cc-by-sa,cc-by-nc,cc-by-nc-sa"
OK = ("cc0", "cc-by", "cc-by-nc")
TIERS = ("dauin", "region", "ph")  # the Philippines, nearest first; then "world" (abroad, Indo-West Pacific only)
# Abroad = the Indo-West Pacific around the Coral Triangle only (Pierre, 2026-11-03: the region of the ID books IMR uses;
# the Red Sea, western Indian Ocean and central-eastern Pacific have other colour forms). A bounding box rather than
# iNaturalist places: one generic rule, no country list to keep, and iNaturalist's swlat/swlng/nelat/nelng search takes
# it as is. 30 S - 30 N, 90 E - 170 E: from the Andaman Sea and Sumatra to Vanuatu and New Caledonia, from Taiwan and the
# Ryukyus to the southern Great Barrier Reef and Western Australia's reefs; it leaves out the Maldives, Sri Lanka, the
# Red Sea and East Africa (west of 90 E), Fiji, Samoa, Hawaii and French Polynesia (east of 170 E), mainland Japan.
IWP = {"swlat": -30, "swlng": 90, "nelat": 30, "nelng": 170}
LOC = {"dauin": "dauin", "region": "ph", "ph": "ph", "world": "world"}
# iNaturalist annotations: Life Stage (1) Adult 2, Juvenile 8; Sex (9) Female 10, Male 11; Alive or Dead (17) Dead 19.
STAGE = {(1, 2): "adult", (1, 8): "juvenile", (9, 10): "female", (9, 11): "male"}
DEAD = (17, 19)
# The automatic refill (Pierre, 2026-11-06, Q171; --refill). A species short of easy photos has fewer than EASY_NEED
# observations with a very easy photo (ease >= EASY_E) in play or sure to come: model.js easyFirst shows a unit's very
# easy photos (PDIFF.EARLY, 4) until it reaches Open Water, or its PICKD.VARIETY (3) easiest when it has fewer.
EASY_E, EASY_NEED = 4, 3
REFILL_MAX = 40  # species refilled per run at most (rule C7: about 2 requests each, the general searches batched; the shortest first)
RECHECK_DAYS = 30  # a part of a species' room searched to the end is searched again after this many days
GEN_PAGES = 5  # pages of 200 read per general search in a refill at most (id_below), while it brings too few photos
REFILL = ROOT / "tools" / "fish_refill.json"  # what was searched to the end, per species (in the repo)


def lic_class(lic, own):
    """0 Pierre's own (whatever its licence), 1 CC0 / CC BY, 2 NC (tools/rights.py): select's tie-break between
    observations of equal variety, 0 and 1 alike (Pierre, 2026-11-08, Q270 and Q284; a bucket of the order until then)."""
    if own:
        return 0
    return 1 + rights_rank({"lic": lic})


def lic_ok(lic, own):
    """A photo's licence is usable: CC0, CC BY, CC BY-NC; Pierre's own even without one. Never share-alike or ND."""
    return lic in OK or (own and not lic)


def km(a, b):
    """Great-circle distance in km between two (lat, lng)."""
    la1, lo1, la2, lo2 = map(math.radians, (*a, *b))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 6371 * 2 * math.asin(math.sqrt(h))


def tier_of(o):
    """Where an observation was made: dauin, region, ph or world (by its coordinates and iNaturalist places)."""
    if o.get("ll"):
        d = km(DAUIN, o["ll"])
        if d <= DAUIN_KM:
            return "dauin"
        if d <= REGION_KM and o.get("inph"):
            return "region"
    return "ph" if o.get("inph") else "world"


def in_iwp(ll):
    """A point (lat, lng) is in the Indo-West Pacific box (IWP); no coordinates: not known to be, so no."""
    return bool(ll) and IWP["swlat"] <= ll[0] <= IWP["nelat"] and IWP["swlng"] <= ll[1] <= IWP["nelng"]


def hord(oid):
    """A fixed, neutral order (hash of the observation id): no quality or votes order (Pierre: varied quality)."""
    return hashlib.sha1(str(oid).encode()).hexdigest()[:10]


def trim(o):
    """The fields this script uses, from one iNaturalist v2 observation (what the cache keeps)."""
    loc = o.get("location") or ""
    try:
        ll = [round(float(x), 4) for x in loc.split(",")] if loc else None
    except ValueError:
        ll = None
    an = [[a.get("controlled_attribute_id"), a.get("controlled_value_id")] for a in o.get("annotations") or []
          if (a.get("vote_score") or 0) >= 0]
    t = o.get("taxon") or {}
    r = {"id": o["id"], "g": o.get("quality_grade"), "ll": ll, "inph": PH in (o.get("place_ids") or []),
         "t": t.get("name"), "rk": t.get("rank"), "u": (o.get("user") or {}).get("login"), "an": an,
         "ph": [[p["id"], p.get("url"), p.get("license_code"), p.get("attribution")] for p in o.get("photos") or []]}
    if t.get("ancestor_ids"):  # the phase searches ask for several taxa at once: the taxon and its ancestors say whose
        r["tx"] = [t.get("id"), *t["ancestor_ids"]]
    return r


class Net:
    """GET iNaturalist v2 with a cache of trimmed replies ({url: {total, results}})."""

    def __init__(self, cache, offline=False, refresh=False, plan=False):
        self.path, self.offline, self.refresh, self.plan = Path(cache), offline, refresh, plan
        self.c = json.loads(self.path.read_text(encoding="utf-8")) if self.path.exists() else {}
        self.asked, self.new, self.missing = set(), 0, 0
        self.virtual = {}  # a one-species search: every observation it holds, newest first (prefetch)

    def need(self, url):
        """url would be asked (not cached, or --refresh and not asked yet in this run)."""
        return url not in self.c or (self.refresh and url not in self.asked)

    def get(self, q, fields=FIELDS):
        url = API + q + "&fields=" + fields
        base, _, below = q.partition("&id_below=")
        if fields == FIELDS and base in self.virtual and self.need(url):
            # Answered from the prefetch, as iNaturalist answers it: newest first, 200 a page, the total from id_below on.
            R = [o for o in self.virtual[base] if not below or o["id"] < int(below)]
            v = self.c[url] = {"total": len(R), "results": R[:200]}
            self.asked.add(url)
            return v
        return self.fetch(url, lambda d: {"total": d.get("total_results", 0), "results": [trim(o) for o in d.get("results") or []]})

    def fetch(self, url, keep):
        """The reply to url, kept as keep(reply) in the cache (asked again with --refresh, never with --offline)."""
        if not self.need(url):
            return self.c[url]
        if self.plan:
            self.missing += 1
            return None
        if self.offline:
            sys.exit(f"--offline: not cached: {url}")
        try:
            d = inat.get(url)  # paced; a 429, a 5xx, a network error or a cut reply retried after a pause
        except (OSError, ValueError) as e:
            raise RuntimeError(f"failed: {url} ({e})") from e
        v = keep(d)
        self.c[url] = v
        self.asked.add(url)
        self.new += 1
        if self.new % 25 == 0:
            self.save()
        return v

    def save(self):
        if self.plan or not self.new:
            return
        self.path.parent.mkdir(parents=True, exist_ok=True)
        tmp = self.path.with_suffix(".tmp")
        tmp.write_text(json.dumps(self.c, sort_keys=True, separators=(",", ":")), encoding="utf-8")
        tmp.replace(self.path)


def pages(net, q, enough, n=GEN_PAGES):
    """The reply to the search q, read on while it has more and enough(results so far) is false, up to n pages of 200
    (the searches are newest first, order_by=id: the next page is id_below the last one read). The total is what the
    search holds, so total > len(results) still means more left to read. A reply not cached in a --plan run stops it."""
    d = net.get(q)
    if not d:
        return d
    res, last = list(d["results"]), d
    while n > 1 and last["results"] and last["total"] > len(last["results"]) and not enough(res):
        last = net.get(q + f"&id_below={min(o['id'] for o in last['results'])}")
        if not last:
            return {"total": len(res) + 1, "results": res}
        res += last["results"]
        n -= 1
    return {"total": len(res) + max(0, last["total"] - len(last["results"])), "results": res}


# The general searches of several species asked together (rule C7; #784): the
# species with at most BATCH_SOLO observations in a search (species_counts says) share one search, read to its end
# (BATCH_PAGES pages of 200 at most, BATCH_TAXA taxa a search), and each one's share answers its own search (Net.virtual):
# the same observations, newest first, as iNaturalist answers the one-species search. The others keep their own search.
BATCH_TAXA, BATCH_PAGES, BATCH_SOLO = 50, 5, 150


def _counts(d):
    """A species_counts reply trimmed to what the prefetch reads (the cache keeps it)."""
    return {"total_results": d.get("total_results", 0), "results": [
        {"count": r.get("count", 0), "taxon": {"id": (r.get("taxon") or {}).get("id"),
                                               "ancestor_ids": (r.get("taxon") or {}).get("ancestor_ids") or []}}
        for r in d.get("results") or []]}


def prefetch(net, taxa, kinds):
    """Asks the searches `kinds` (queries) of the iNaturalist taxa `taxa` together where that saves requests, into
    net.virtual. Only searches a run would ask (Net.need); never in a --plan or --offline run (they read the cache only).
    Returns the number of one-species searches answered this way."""
    if net.plan or net.offline or BATCH_SOLO <= 0:  # BATCH_SOLO 0: every species asks on its own (tests)
        return 0
    done = 0
    for k in kinds:
        url = lambda x, k=k: API + queries(x)[k] + "&fields=" + FIELDS  # noqa: E731
        want = sorted({x for x in taxa if net.need(url(x))})
        if len(want) < 2:
            continue
        est = inat.leaf_counts(lambda u: net.fetch(u, _counts), want, queries("0")[k], estimate=True)
        small = sorted((x for x in want if est[x] <= BATCH_SOLO), key=lambda x: (est[x], x))
        batches, B, n = [], [], 0
        for x in small:
            if B and (n + est[x] > 200 * BATCH_PAGES or len(B) >= BATCH_TAXA):
                batches.append((B, n))
                B, n = [], 0
            B.append(x)
            n += est[x]
        if B:
            batches.append((B, n))
        for B, n in batches:
            if max(1, math.ceil(n / 200)) >= len(B):
                continue  # no fewer requests than each species alone
            q = queries(",".join(map(str, B)))[k]
            got, below, end = {x: [] for x in B}, None, False
            for _ in range(BATCH_PAGES):
                d = net.get(q + (f"&id_below={below}" if below else ""), FIELDS + ",taxon.ancestor_ids")
                if not d or (below is None and d["total"] > 200 * BATCH_PAGES):
                    break  # more than species_counts said (an observed subspecies): each species asks on its own
                if any(not o.get("tx") for o in d["results"]):
                    break  # an observation whose taxon is not said: each species asks on its own
                for o in d["results"]:
                    for x in dict.fromkeys(o["tx"]):
                        if x in got:
                            got[x].append({a: v for a, v in o.items() if a != "tx"})
                if len(d["results"]) < 200 or len(d["results"]) >= d["total"]:
                    end = True
                    break
                below = min(o["id"] for o in d["results"])
            if end:
                for x in B:
                    net.virtual[queries(x)[k]] = got[x]
                done += len(B)
    return done


def queries(tid):
    """The searches of one species (iNaturalist taxon id), by source: Pierre's own (any grade but casual), then Research
    Grade near Dauin, in the region, in the Philippines; abroad (asked only when the Philippines are exhausted)."""
    base = f"taxon_id={tid}&captive=false&photos=true&order_by=id&per_page=200"
    rg = f"{base}&quality_grade=research&photo_license={LICENCES}"
    return {
        "own": f"{base}&quality_grade=research,needs_id&user_login={PIERRE}",
        "dauin": f"{rg}&lat={DAUIN[0]}&lng={DAUIN[1]}&radius={DAUIN_KM}",
        "region": f"{rg}&lat={DAUIN[0]}&lng={DAUIN[1]}&radius={REGION_KM}",
        "ph": f"{rg}&place_id={PH}",
        "world": f"{rg}&not_in_place={PH}&" + "&".join(f"{k}={v}" for k, v in IWP.items()),
    }


def usable_obs(o, used, excl):
    """An observation as a selection item, or None: its usable photos (licensed, or Pierre's own; not used or excluded),
    its licence class (the best of its photos), source tier, life stage. Dead fish and genus-level IDs are left out."""
    if [*DEAD] in o.get("an", []) or o.get("rk") not in ("species", "subspecies", "variety", "form"):
        return None
    own = o.get("u") == PIERRE
    if not own and o.get("g") != "research":
        return None
    if tier_of(o) == "world" and not in_iwp(o.get("ll")):
        return None  # abroad outside the Indo-West Pacific (Pierre's own too: the colour forms differ there)
    P = [p for p in o["ph"] if lic_ok(p[2], own) and str(p[0]) not in used and str(p[0]) not in excl and p[1]]
    if not P:
        return None
    st = sorted({STAGE[tuple(a)] for a in o.get("an", []) if tuple(a) in STAGE})
    return {**o, "P": P, "own": own, "cls": min(lic_class(p[2], own) for p in P), "tier": tier_of(o), "st": "/".join(st), "h": hord(o["id"])}


def obs_url(oid):
    return f"https://www.inaturalist.org/observations/{oid}"


def obs_cost(held, k):
    """The room k more photos of one observation take when it already holds `held` photos of the species (Pierre,
    2026-11-08, Q226, option b): its first photo 1, each further photo EXTRA_W (0.5)."""
    if k <= 0:
        return 0
    return (0 if held else 1 - EXTRA_W) + EXTRA_W * k


def obs_fit(held, room):
    """How many more photos of one observation holding `held` fit in `room` (obs_cost)."""
    return max(0, int((room - (0 if held else 1 - EXTRA_W)) // EXTRA_W))


def select(pools, room, more, n=None, world=lambda: [], anywhere=False, claimed=None, photos=False, held=None):
    """Pick up to `room` observations (Pierre, 2026-11-03). Pierre's own first, from any pool. Then, for a species
    confirmed near Dauin (anywhere=True): every place at once, abroad included (world() fetched), not by distance.
    Otherwise: nearest first (dauin, region, ph); abroad (world(), fetched only then) only when the Philippines are
    exhausted: room is left and no Philippine search had more results than it read (more[tier]). Within a bucket, the
    least represented observer and life stage first, then the licence (an open one before CC BY-NC: rights_rank of its
    best photo, the class `cls` of usable_obs), then the fixed hash order. The licence is only that tie-break (Pierre,
    2026-11-08, Q284: "je ne veux pas que ça soit au coût de la variété"; from 2026-11-03 it was a bucket before the
    distance and the variety). pools: {tier: [items from usable_obs]} (tier "world": Pierre's own
    abroad); n: Counter of ('u', login) / ('s', stage) already in the species' list. claimed: the iNaturalist photo ids
    already taken (updated here): iNaturalist lets one photo belong to several observations, so a photo is taken once,
    by the first observation picked, and an observation left with no photo of its own is skipped without taking room
    (Codex review #463). photos=True: room counts photos (the cap of Q36) as obs_cost does: every photo of an observation is
    taken, the first for 1 and each further one for EXTRA_W, and an observation is cut only to the room left; held
    ({observation url: photos it holds}, updated here) is what the species already keeps, so the other photos of an
    observation among its candidates come at their cost and its observer and life stage are not counted again.
    Otherwise one observation is one unit of room. Returns [item, ...] in order, each with only its own photos in P and
    the room it took in cost."""
    n = Counter() if n is None else n
    claimed = set() if claimed is None else claimed
    held = {} if held is None else held
    taken, seen = [], set()

    def take(L):
        nonlocal room
        L = [o for o in L if o["id"] not in seen]
        while L and room > 0:
            o = min(L, key=lambda o: (n["u", o["u"]], n["s", o["st"]], o["cls"] > 1, o["h"]))
            L.remove(o)
            seen.add(o["id"])
            P = [p for p in o["P"] if str(p[0]) not in claimed]
            h = held.get(obs_url(o["id"]), 0)
            if photos and obs_cost(h, len(P)) > room:
                P = P[:obs_fit(h, room)]  # short of room: what fits (a new observation needs 1 for its first photo)
            if not P:
                continue
            o["P"], o["cost"] = P, obs_cost(h, len(P)) if photos else 1
            claimed.update(str(p[0]) for p in P)
            taken.append(o)
            if not h:
                n["u", o["u"]] += 1
                n["s", o["st"]] += 1
            held[obs_url(o["id"])] = h + len(P)
            room -= o["cost"]

    allp = [o for t in (*TIERS, "world") for o in pools.get(t, [])]
    take([o for o in allp if o["own"]])
    if anywhere:
        if room > 0:
            allp += world()
        take(allp)
        return taken
    for t in TIERS:
        take(pools.get(t, []))
    if room > 0 and not any(more.get(t) for t in TIERS):
        take(world())
    return taken


def topup(args):
    """--topup (Codex review #715 on Pierre's 2026-11-08 decision): the other photos of the observations fetched under the
    old limit of 4 photos per observation, whatever the species' room: an observation holding exactly OLD_LIMIT candidate
    records (whatever their state: a near-duplicate set aside or a photo rejected does not stop it) is asked again by id
    (200 a request, rule C7) and every photo of it not taken yet comes, each for EXTRA_W of room (obs_cost): this never
    blocks; a species it puts over its cap only waits longer for new observations (nothing is removed). One that holds
    any other number was fetched since 2026-11-08, whole or cut by the room (the searches then bring the rest: an
    observation among the candidates is no longer skipped); one with a photo
    Pierre sent elsewhere, or no longer identified as that species on iNaturalist, brings nothing more. The --refill runs it for every species of its circles first. Returns
    {species id: photos added}."""
    rd = lambda a: json.loads(Path(a).read_text(encoding="utf-8")) if Path(a).exists() else {}  # noqa: E731
    fish, cur, sug = rd(args.fish), rd(args.cur), rd(args.suggest)
    have = rd(args.cand).get("cand", {})
    _, excl = state(cur, sug)
    moved = moved_of(cur)
    only = set(filter(None, (args.only or "").split(",")))
    used = {pid(p["f"]) for L in have.values() for p in L} - {None}
    want = {}
    for s, _ in species_list(fish, set(args.circle), only):
        L = have.get(s["id"], [])
        recs = Counter(p["o"] for p in L)
        bad = {p["o"] for p in L if p["f"] in moved}
        for o, k in recs.items():
            tail = o.rsplit("/", 1)[-1]
            if k == OLD_LIMIT and o not in bad and o.startswith(obs_url("")) and tail.isdigit():
                want[int(tail)] = s
    net = Net(args.cache, offline=args.offline, refresh=args.refresh, plan=args.plan)
    added = Counter()
    ids = sorted(want)
    try:
        for i in range(0, len(ids), 200):
            # Never captive, as every search (Codex review #715).
            d = net.get(f"id={','.join(map(str, ids[i:i + 200]))}&captive=false&per_page=200", FIELDS + ",taxon.ancestor_ids")
            for o in (d or {}).get("results", []):
                s = want.get(o["id"])
                # Still identified as that species (its taxon or an ancestor, as phase_obs): one re-identified since
                # brings nothing (Codex review #715).
                it = usable_obs(o, used, excl) if s and s.get("inat") in (o.get("tx") or []) else None
                if not it:
                    continue
                for p in it["P"]:
                    used.add(str(p[0]))
                    have[s["id"]].append(record(s, it, p))
                    added[s["id"]] += 1
    finally:
        net.save()
    print(f"topup: {len(ids)} observations holding {OLD_LIMIT} photos asked again, +{sum(added.values())} photos for "
          f"{len(added)} species", flush=True)
    if added and not args.plan:
        order = [s["id"] for s in fish["species"]]
        dump({"v": 1, "cand": {k: have[k] for k in sorted(have, key=lambda k: order.index(k) if k in order else 1e9) if have[k]}},
             str(args.cand))
    return dict(added)


def cap_of(phases):
    """The cap of one species (Pierre, 2026-11-05, Q36): BASE_CAP (30) photos for a stable species, +PER_PHASE (10) per
    extra phase it shows (PHASES: juvenile, intermediate, male or terminal, female), at most MAX_CAP (60)."""
    return min(MAX_CAP, BASE_CAP + PER_PHASE * len(set(phases) & set(PHASES)))


def written_phases(s, t):
    """{phase: [sources]} from what is written about species s of teaching entry t (fish.json): the IMR presentation's phase
    lines (teach phase: "Males colourful, females dark or dull", "Juvenile, sub-adult and adult look different"...) and
    its dimorph mark ("imr"), and the juvenile classes with their sources (teach juv, FISH_PATH "Juveniles and colour
    phases": class A or B for the whole entry, the early / late genera or species of a mixed entry; "juv")."""
    out = {}
    add = lambda ph, w: out.setdefault(ph, []).append(w) if w not in out.get(ph, []) else None
    for line in t.get("phase") or []:
        low = line.lower()
        for ph, rx in (("juvenile", r"\bjuveniles?\b"), ("intermediate", r"\bintermediate\b|\bsub-?adults?\b"),
                       ("male", r"\bterminal\b|\bmales?\b"), ("female", r"\bfemales?\b")):
            if re.search(rx, low):
                add(ph, "imr")
    if t.get("dimorph"):
        add("male", "imr")
        add("female", "imr")
    j = t.get("juv") or {}
    names = [x for x in (s.get("name"), s.get("now")) if x]
    hit = lambda n: any(x == n or x.split()[0] == n for x in names)
    if j.get("cls") in ("A", "B") or any(hit(n) for n in (j.get("early") or []) + (j.get("late") or [])):
        add("juvenile", "juv")
    return out


def photo_phase(p, j=None):
    """The extra phase one photo shows, or "" (adult, or not known): the judging tags first (j: its suggest.json "fish"
    entry; a game photo carries jt itself): the rubric's phase tag, then its juvenile flag j; else the life stage or sex
    its source annotated (st: iNaturalist or FishBase), juvenile first."""
    j = j or {}
    if PHASE_WORD.get(j.get("ph")):
        return PHASE_WORD[j["ph"]]
    if "j" in (j.get("jt") or p.get("jt") or "")[7:]:
        return "juvenile"
    got = {PHASE_WORD[w] for w in (p.get("st") or "").split("/") if w in PHASE_WORD}
    return next((ph for ph in PHASES if ph in got), "")


def item_phases(o):
    """The phases a selection item (usable_obs) is annotated with on iNaturalist."""
    return {PHASE_WORD[w] for w in (o.get("st") or "").split("/") if w in PHASE_WORD}


def species_phases(s, t, cands=(), sug=None, game=(), fb=(), moved=frozenset()):
    """{phase: [what records it]} for species s of teaching entry t, in PHASES order, only the phases recorded (Pierre,
    2026-11-05, Q36: "as the judging tags and the sources record them"):
    - "imr", "juv": the written sources of its entry (written_phases);
    - "judged": a judging tag on one of its photos (suggest.json "fish" ph or the juvenile flag j on a candidate; jt on a
      game photo of fish-photos.json);
    - "inat:N": the iNaturalist Life Stage or Sex annotation of N distinct candidate observations, N >= MIN_ANNOT;
    - "fishbase:N": N FishBase underwater photos of it labelled with that life stage (tools/fishbase_src.json st).
    cands: its candidates (fish-cand.json); sug: suggest.json "fish"; game: its game and sheet photos; fb: its FishBase
    rows; moved: the candidates Pierre sent to another species (curation.json fish.out), which record nothing here."""
    sug = sug or {}
    why = written_phases(s, t)
    judged, ann = set(), {ph: set() for ph in PHASES}
    for p in cands:
        if p["f"] in moved:
            continue
        j = sug.get(p["f"]) or {}
        if PHASE_WORD.get(j.get("ph")):
            judged.add(PHASE_WORD[j["ph"]])
        if "j" in (j.get("jt") or "")[7:]:
            judged.add("juvenile")
        if not p.get("via"):  # FishBase's labels are counted from its rows below
            for w in (p.get("st") or "").split("/"):
                if w in PHASE_WORD:
                    ann[PHASE_WORD[w]].add(p.get("o"))
    for p in game:
        x = photo_phase({"jt": p.get("jt")}, {"ph": p.get("ph")})
        if x:
            judged.add(x)
    fbn = Counter(PHASE_WORD.get(r.get("st")) for r in fb)
    for ph in PHASES:
        w = why.setdefault(ph, [])
        if ph in judged:
            w.append("judged")
        if len(ann[ph]) >= MIN_ANNOT:
            w.append(f"inat:{len(ann[ph])}")
        if fbn.get(ph):
            w.append(f"fishbase:{fbn[ph]}")
    return {ph: why[ph] for ph in PHASES if why[ph]}


def phase_room(phases, cap, held):
    """The room of one species: {"room": photos still to take (cap - photos kept), "rooms": {phase: photos to take of
    that phase first}, "free": the rest, of any phase}. held: Counter of the photos it keeps by photo_phase ("" adult or
    not known). Each extra phase aims at PER_PHASE photos of its own (the +10 it brings to the cap); when the room is
    shorter than what the phases lack, it is shared out one photo at a time, in PHASES order; a half photo of room left
    (obs_cost) stays free."""
    room = max(0, cap - sum(held.values()))
    need = {ph: max(0, PER_PHASE - held.get(ph, 0)) for ph in PHASES if ph in phases}
    rooms, left = dict.fromkeys(need, 0), room
    while left >= 1 and any(rooms[ph] < need[ph] for ph in need):
        for ph in need:
            if left >= 1 and rooms[ph] < need[ph]:
                rooms[ph] += 1
                left -= 1
    return {"room": room, "rooms": rooms, "free": left}


def species_room(s, t, L, gone, sug=None, game=(), fb=(), moved=frozenset(), cap=None):
    """Everything the cap of Q36 says about species s (entry t), shared by tools/fetch_fish.py and tools/fetch_fishbase.py:
    {"cap", "phases" (species_phases), "have" (photos still usable, weighted per observation: obs_cost), "held"
    ({phase: photos kept of it, counted the same way}), "obs" ({observation: photos still usable}), "room", "rooms",
    "free" (phase_room)}. L: its candidates; gone(f): state(); cap: a fixed cap (--cap) instead of cap_of. An
    observation's first usable photo in list order counts 1, the others EXTRA_W."""
    sug = sug or {}
    phases = species_phases(s, t, L, sug, game, fb, moved)
    c = cap_of(phases) if cap is None else cap
    held, obs = Counter(), Counter()
    for p in L:
        if not gone(p["f"]):
            o = p.get("o") or p["f"]
            x = photo_phase(p, sug.get(p["f"]))
            held[x if x in phases else ""] += obs_cost(obs[o], 1)
            obs[o] += 1
    return {"cap": c, "phases": phases, "have": sum(held.values()), "held": {ph: held[ph] for ph in phases}, "obs": dict(obs),
            **phase_room(phases, c, held)}


def moved_of(cur):
    """The candidates Pierre sent to another species or out of the fish (curation.json fish.out)."""
    return frozenset(((cur or {}).get("fish") or {}).get("out") or {})


def game_photos(fp):
    """{species id: [its game and sheet photos]} from fish-photos.json (photos per entry, sheet per species; each sp)."""
    out = {}
    for part in ("photos", "sheet"):
        for L in ((fp or {}).get(part) or {}).values():
            for p in L:
                if p.get("sp"):
                    out.setdefault(p["sp"], []).append(p)
    return out


def phase_query(ph, taxa, where):
    """The search of one phase (INAT_PHASE) for several species at once (rule C7): Research Grade, the licences of
    LICENCES, in the Philippines (where "ph") or abroad in the Indo-West Pacific ("world"), by id for paging."""
    term, value = INAT_PHASE[ph]
    q = (f"taxon_id={','.join(map(str, taxa))}&term_id={term}&term_value_id={value}&captive=false&photos=true"
         f"&quality_grade=research&photo_license={LICENCES}&order_by=id&order=asc&per_page=200")
    return q + (f"&place_id={PH}" if where == "ph" else f"&not_in_place={PH}&" + "&".join(f"{k}={v}" for k, v in IWP.items()))


def phase_obs(net, ph, taxa, where):
    """({taxon: [observations of that phase]}, {taxon: more}) for the iNaturalist taxa of several species, PHASE_BATCH taxa
    a request and up to PHASE_PAGES pages of 200 a batch (id_above); more = a batch had more than it read (the
    Philippines not exhausted for that phase). An observation belongs to the asked taxon among its taxon and ancestors
    (a subspecies to its species). A reply not cached in a --plan run reads as nothing found, and more."""
    taxa = sorted(set(taxa))
    out, more = {x: [] for x in taxa}, {}
    for i in range(0, len(taxa), PHASE_BATCH):
        B = taxa[i:i + PHASE_BATCH]
        q, above, done = phase_query(ph, B, where), 0, False
        for _ in range(PHASE_PAGES):
            d = net.get(q + (f"&id_above={above}" if above else ""), FIELDS + ",taxon.ancestor_ids")
            if not d:
                break
            for o in d["results"]:
                tx = next((x for x in o.get("tx") or [] if x in out and x in B), None)
                if tx is not None:
                    out[tx].append(o)
            if d["total"] <= len(d["results"]) or not d["results"]:
                done = True
                break
            above = max(o["id"] for o in d["results"])
        more.update(dict.fromkeys(B, not done))
    return out, more


def covers(net, taxa):
    """{iNaturalist taxon id: the photo id of its default photo (the taxon's cover), or None when it has none}, for the
    taxa iNaturalist answered (a taxon missing from the result is unknown: a --plan run, a reply not cached); 30 taxa a
    request (rule C7)."""
    out, taxa = {}, sorted(set(taxa))
    for i in range(0, len(taxa), 30):
        url = TAXA + ",".join(map(str, taxa[i:i + 30])) + "?fields=id,default_photo.id&per_page=30"
        d = net.fetch(url, lambda d: {str(t["id"]): (t.get("default_photo") or {}).get("id") for t in d.get("results") or []})
        out.update({int(k): v for k, v in (d or {}).items()})
    return out


def tag_rep(L, cover):
    """Tags the candidates of one species whose photo is the iNaturalist cover of its taxon (rep: "inaturalist"), and
    untags one that no longer is; a FishBase candidate (via) keeps its own tag. Returns the number tagged."""
    n = 0
    for p in L:
        if p.get("via"):
            continue
        if cover and pid(p["f"]) == str(cover):
            p["rep"] = "inaturalist"
            n += 1
        else:
            p.pop("rep", None)
    return n


def pid(f):
    """iNaturalist photo id of a candidate file name (the number after the last '-'), as tools/excluded.py pid."""
    s = str(f).rsplit("-", 1)[-1].rstrip("cd")
    return s if s.isdigit() else None


def sure_out(j):
    """The pre-sort set it aside without doubt (autosort.js fishSure's rejects): a near-duplicate, the subject not obvious
    (count x) or out of the water (flag a), with no `u` (unsure). Such a candidate no longer holds room."""
    if not j or j.get("u"):
        return False
    jt = j.get("jt") or ""
    return j.get("k") == "dup" or (len(jt) >= 7 and (jt[6] == "x" or "a" in jt[7:]))


FISH_TAGS = re.compile(r"^[pohtd][01][gdn][0-3][smb][lms][1smx][jcapr]*$")  # autosort.js FISH_TAGS


def sure_add(j):
    """The pre-sort's sure add (autosort.js fishSure's adds): best or alt, a rubric code and an ease, no `u`, not a
    reject (sure_out)."""
    if not j or j.get("u") or j.get("k") not in ("best", "alt") or sure_out(j):
        return False
    return bool(FISH_TAGS.match(j.get("jt") or "")) and j.get("e") in (1, 2, 3, 4, 5)


def state(cur, sug):
    """(gone(f), excluded photo ids): gone = rejected, excluded, sent elsewhere by Pierre, or set aside by the pre-sort."""
    F = (cur or {}).get("fish") or {}
    ex = set(F.get("exclude") or {}) | set((cur or {}).get("exclude") or {})
    excl = {pid(f) for f in ex} - {None}
    S = (sug or {}).get("fish") or {}
    gone = lambda f: f in (F.get("seen") or {}) or f in ex or f in (F.get("out") or {}) or (f not in (F.get("add") or {}) and sure_out(S.get(f)))
    return gone, excl


def species_list(fish, circle, only=()):
    """Species of the game in the given circle(s), in teaching order (entries, then the entry's species order),
    each with its teaching entry id; --only takes species or teaching ids."""
    S = {s["id"]: s for s in fish["species"]}
    out, seen = [], set()
    for t in fish["teach"]:
        if t.get("circle") not in circle:
            continue
        for sid in t.get("species") or []:
            s = S.get(sid)
            if not s or sid in seen or s.get("out") or not s.get("circle") or not s.get("inat"):
                continue
            if only and sid not in only and t["id"] not in only:
                continue
            seen.add(sid)
            out.append((s, t))
    return out


def record(s, o, p):
    own = o["own"]
    r = {"f": f"fish-{s['id']}-cand-{p[0]}", "a": p[3] or (f"(c) {o['u']}" if o["u"] else ""), "lic": p[2] or ("own" if own else ""),
         "o": f"https://www.inaturalist.org/observations/{o['id']}", "t": o["t"], "own": own, "loc": LOC[o["tier"]],
         "src": p[1].replace("/square.", "/original."), "r": 1}
    if o["st"]:
        r["st"] = o["st"]
    if own and o.get("g") != "research":
        r["ni"] = 1
    return r


def ends(c):
    """{part: its searches were read to their end} for the parts of one species' room (context c from run): "free" (the
    general searches: Pierre's own, the Philippine tiers and, once asked, abroad) and each phase iNaturalist can search
    on with room (its phase searches, in the Philippines and, once asked, abroad)."""
    out = {"free": not c["omore"] and not any(c["more"].get(t) for t in TIERS) and not c["wm"].get("more")}
    for ph in INAT_PHASE:
        if c["R"]["rooms"].get(ph):
            out[ph] = not c["pmore"].get(ph, True) and not c["pwmore"].get(ph)
    return out


def fill(c, used):
    """The selection of one species (context c from run), in photos: each phase iNaturalist can search on first, up to its
    room, from the observations annotated with it (the general searches' and the phase searches'; abroad only as select
    allows, from the phase search abroad); then, from the general searches as before Q36, the free room and the rooms of
    the phases iNaturalist cannot search on (intermediate: the judging tags tell them later). The room of a searchable
    phase that iNaturalist cannot fill stays open for that phase: FishBase fills it next (tools/fetch_fishbase.py), or a
    later run; never adults in a juvenile's place. Room as obs_cost counts it (held: the photos each observation keeps)."""
    s, R, n, near, held = c["s"], c["R"], c["n"], c["near"], c["held"]
    taken, left = [], R["room"]
    free = R["free"] + sum(r for ph, r in R["rooms"].items() if ph not in INAT_PHASE)
    for ph in PHASES:
        r = min(R["rooms"].get(ph, 0), left)
        if not r or ph not in INAT_PHASE:
            continue
        pools = {}
        for it in c["all"].values():
            if ph in item_phases(it):
                pools.setdefault(it["tier"], []).append(it)
        W = c["pw"].get(ph, [])
        got = select(pools, r, {"ph": c["pmore"].get(ph, True)}, n, lambda: W, anywhere=near, claimed=used, photos=True, held=held)
        for o in got:
            o["phase"] = ph
        taken += got
        left -= sum(o["cost"] for o in got)
    free = min(free, left)
    if free > 0:
        taken += select(c["pools"], free, c["more"], n, c["world"], anywhere=near, claimed=used, photos=True, held=held)
    return taken


def run(args):
    fish = json.loads(Path(args.fish).read_text(encoding="utf-8"))
    cand_path = Path(args.cand)
    have = json.loads(cand_path.read_text(encoding="utf-8")).get("cand", {}) if cand_path.exists() else {}
    cur = json.loads(Path(args.cur).read_text(encoding="utf-8")) if Path(args.cur).exists() else {}
    sug = json.loads(Path(args.suggest).read_text(encoding="utf-8")) if Path(args.suggest).exists() else {}
    fp = json.loads(Path(args.photos).read_text(encoding="utf-8")) if Path(args.photos).exists() else {}
    fbsrc = (json.loads(Path(args.fbsrc).read_text(encoding="utf-8")) if Path(args.fbsrc).exists() else {}).get("species") or {}
    gone, excl = state(cur, sug)
    sugf, moved, game = (sug or {}).get("fish") or {}, moved_of(cur), game_photos(fp)
    net = Net(args.cache, offline=args.offline, refresh=args.refresh, plan=args.plan)
    only = set(filter(None, (args.only or "").split(",")))
    used = {pid(p["f"]) for L in have.values() for p in L} - {None}
    plan, report = {}, {}
    deep = getattr(args, "deep", False)
    if args.rep:
        # Reference photos (Pierre, 2026-11-05): tag the candidates that are their taxon's iNaturalist cover, no refill.
        S = species_list(fish, set(args.circle), only)
        try:
            cov = covers(net, [s["inat"] for s, _ in S])
        finally:
            net.save()
        # Only the species whose cover is known: an unknown one keeps its tags (Codex review #562).
        n = sum(tag_rep(have.get(s["id"], []), cov[s["inat"]]) for s, _ in S if s["inat"] in cov)
        if args.plan:
            print(json.dumps({"missing": net.missing, "covers": len(cov), "tagged": n}))
            return {"covers": len(cov), "tagged": n}
        order = [s["id"] for s in fish["species"]]
        dump({"v": 1, "cand": {k: have[k] for k in sorted(have, key=lambda k: order.index(k) if k in order else 1e9) if have[k]}}, str(cand_path))
        print(f"iNaturalist covers: {sum(1 for v in cov.values() if v)} of {len(S)} taxa; {n} candidates are their taxon's cover (rep)")
        return {"covers": len(cov), "tagged": n}
    ctx = []
    try:
        S = species_list(fish, set(args.circle), only)
        # The general searches of the species with room, asked together where that saves requests (rule C7).
        prefetch(net, [s["inat"] for s, t in S if species_room(s, t, have.get(s["id"], []), gone, sugf, game.get(s["id"], ()),
                                                              (fbsrc.get(s["id"]) or {}).get("photos") or (), moved, args.cap)["room"] > 0],
                 ["own", *TIERS])
        # 1. Per species: its cap, phases and room (species_room), and the general searches.
        for s, t in S:
            sid = s["id"]
            L = have.setdefault(sid, [])
            R = species_room(s, t, L, gone, sugf, game.get(sid, ()), (fbsrc.get(sid) or {}).get("photos") or (), moved, args.cap)
            held = R.pop("obs")
            plan[sid] = {"name": s["name"], "entry": t["id"], **R}
            if R["room"] <= 0:
                plan[sid]["add"] = {}
                continue
            # Every photo of an observation (Pierre, 2026-11-08): one already among the candidates brings its other photos
            # (usable_obs leaves out those taken), unless Pierre sent one of its photos to another species or out of the
            # fish (its identification is in doubt: as before, nothing more of it).
            known = {p["o"] for p in L if p["f"] in moved}
            Q = queries(s["inat"])
            got, more, pools = {}, {}, {}
            # Pierre's own, asked for every species (Codex review #463): fish.json present.own is a count from the last
            # build, so a species he identified since would otherwise never get his photos.
            names = ["own", *TIERS]
            # A refill reads on (pages) while a search brings fewer usable photos than the room, so a species whose
            # newest observations are all known still finds the older ones, and the end of a search is known.
            enough = lambda res, known=known, need=R["room"], held=held: sum(
                obs_cost(held.get(obs_url(o["id"]), 0), len(it["P"])) for o in res if obs_url(o["id"]) not in known
                for it in [usable_obs(o, used, excl)] if it) >= need
            for k in names:
                got[k] = pages(net, Q[k], enough) if deep else net.get(Q[k])
            if args.plan and any(got[k] is None for k in names):
                plan[sid]["cached"] = False
                continue
            byid = {}
            for k in names:
                more[k] = got[k]["total"] > len(got[k]["results"])
                for o in got[k]["results"]:
                    if f"https://www.inaturalist.org/observations/{o['id']}" in known:
                        continue
                    it = usable_obs(o, used, excl)
                    if it and o["id"] not in byid:
                        byid[o["id"]] = it
            omore = more.pop("own", False)
            for it in byid.values():
                pools.setdefault(it["tier"], []).append(it)
            # Life stages already in the list, so a refill keeps varying them (observers: logins are not stored).
            n = Counter()
            for p in L:
                if not gone(p["f"]):
                    n["s", p.get("st", "")] += 1

            wm = {}  # whether the search abroad, once asked, had more than it read

            def world(s=s, Q=Q, known=known, byid=byid, wm=wm, enough=enough):
                if not (s.get("present") or {}).get("ph"):
                    return []  # abroad only for a species confirmed in the Philippines
                w = pages(net, Q["world"], enough) if deep else net.get(Q["world"])
                if w:
                    wm["more"] = w["total"] > len(w["results"])
                out = [usable_obs(o, used, excl) for o in (w or {}).get("results", [])
                       if f"https://www.inaturalist.org/observations/{o['id']}" not in known and o["id"] not in byid]
                return [{**x, "tier": "world"} for x in out if x]

            # Confirmed near Dauin (present.near: 2+ Research Grade observers within 40 km, or the IMR list): photos from
            # anywhere, by licence (Pierre, 2026-11-03).
            ctx.append({"s": s, "t": t, "R": R, "n": n, "held": held, "known": known, "byid": byid, "all": dict(byid), "pools": pools,
                        "more": more, "world": world, "near": bool((s.get("present") or {}).get("near")), "pmore": {}, "pw": {},
                        "omore": omore, "wm": wm, "pwmore": {}})

        # 2. The phase searches (Q36), one phase at a time for every species with room in it, batched (rule C7): the
        # Philippines first, then abroad (Indo-West Pacific) for a species confirmed in the Philippines, when it is
        # confirmed near Dauin (photos from anywhere) or the Philippines are exhausted for that phase and short of its room.
        def items(c, obs, tier=None):
            out = []
            for o in obs:
                if f"https://www.inaturalist.org/observations/{o['id']}" in c["known"]:
                    continue
                if o["id"] in c["all"]:
                    out.append(c["all"][o["id"]])
                    continue
                it = usable_obs(o, used, excl)
                if it:
                    if tier:
                        it["tier"] = tier
                    c["all"][o["id"]] = it
                    out.append(it)
            return out

        for ph in INAT_PHASE:
            C = [c for c in ctx if c["R"]["rooms"].get(ph)]
            if not C:
                continue
            got, more = phase_obs(net, ph, [c["s"]["inat"] for c in C], "ph")
            for c in C:
                items(c, got[c["s"]["inat"]])
                c["pmore"][ph] = more[c["s"]["inat"]]
            # What the Philippines bring to the phase, counted as the room is (obs_cost; Codex review #715).
            have_ph = lambda c: sum(obs_cost(c["held"].get(obs_url(it["id"]), 0), len(it["P"])) for it in c["all"].values()
                                    if ph in item_phases(it) and it["tier"] != "world")
            W = [c for c in C if (c["s"].get("present") or {}).get("ph")
                 and (c["near"] or (not c["pmore"][ph] and have_ph(c) < c["R"]["rooms"][ph]))]
            if W:
                got, wmore = phase_obs(net, ph, [c["s"]["inat"] for c in W], "world")
                for c in W:
                    c["pwmore"][ph] = wmore[c["s"]["inat"]]
                    c["pw"][ph] = [it for it in items(c, got[c["s"]["inat"]], "world") if it["tier"] == "world"]

        # 3. Per species: each phase's room first, then the free room.
        for c in ctx:
            s, t = c["s"], c["t"]
            sid = s["id"]
            taken = fill(c, used)
            add = Counter(LOC[o["tier"]] for o in taken for _ in o["P"])
            spent = Counter({"free": 0})
            for o in taken:
                spent[o.get("phase") or "free"] += o["cost"]
            plan[sid].update({"add": dict(add), "phase_add": dict(Counter(o["phase"] for o in taken for _ in o["P"] if o.get("phase"))),
                              "spent": dict(spent), "end": ends(c)})
            if args.plan:
                continue
            L = have[sid]
            for o in taken:
                for p in o["P"]:
                    used.add(str(p[0]))
                    L.append(record(s, o, p))
            report[sid] = len(taken)
            print(f"{t['name']:<28} {s['name']:<32} +{sum(add.values())} photos ({dict(add)}; phases {plan[sid]['phase_add']}), "
                  f"{len(L)} candidates, cap {c['R']['cap']}", flush=True)
    finally:
        net.save()
    if args.plan:
        caps = Counter(v["cap"] for v in plan.values())
        print(json.dumps({"missing": net.missing, "caps": {str(k): caps[k] for k in sorted(caps)}, "species": plan}))
        return plan
    order = [s["id"] for s in fish["species"]]
    out = {k: have[k] for k in sorted(have, key=lambda k: order.index(k) if k in order else 1e9) if have[k]}
    dump({"v": 1, "cand": out}, str(cand_path))
    print("total", sum(map(len, out.values())), "photos for", len(out), "species")
    return plan


def easy_obs(sid, L, F, sug, game, gone):
    """The observations of species sid with a very easy photo (ease >= EASY_E) in play or sure to come: a candidate
    Pierre added to it (his ease, else the pre-sort's), a candidate the pre-sort adds for sure (sure_add: the auto-sort
    applies it at the next admin load), a game photo of fish-photos.json. One observation counts once."""
    add, ease, out = F.get("add") or {}, F.get("ease") or {}, set()
    for p in L:
        f, j = p["f"], sug.get(p["f"]) or {}
        if gone(f):
            continue
        if add.get(f) == sid:
            e = ease.get(f, j.get("e"))
        elif f not in add and sure_add(j):
            e = j["e"]
        else:
            continue
        if (e or 0) >= EASY_E:
            out.add(p.get("o") or f)
    out |= {p.get("o") or p.get("f") for p in game if (p.get("e") or 0) >= EASY_E}
    return len(out)


def shortness(s, t, L, gone, F, sug, game=(), fb=(), moved=frozenset(), cap=None):
    """Whether species s (entry t) is short of candidates (Pierre, 2026-11-06, Q171), and how: {"cap", "have", "room"
    (species_room: the cap of Q36 net of what Pierre rejected, excluded or sent elsewhere and of what the pre-sort set
    aside), "parts" ({part: room} for the parts with room: "free", the general searches' room, intermediate phase
    included; each phase iNaturalist can search on), "easy" (easy_obs), "unjudged" (candidates waiting for the judging
    pass), "short"}. Short = room left, or fewer than EASY_NEED easy observations. Only room can be refilled: the cap holds."""
    R = species_room(s, t, L, gone, sug, game, fb, moved, cap)
    add = F.get("add") or {}
    parts = {"free": R["free"] + sum(r for ph, r in R["rooms"].items() if ph not in INAT_PHASE),
             **{ph: r for ph, r in R["rooms"].items() if ph in INAT_PHASE}}
    easy = easy_obs(s["id"], L, F, sug, game, gone)
    unjudged = sum(1 for p in L if not gone(p["f"]) and p["f"] not in add and p["f"] not in sug)
    return {"cap": R["cap"], "have": R["have"], "room": R["room"], "parts": {k: v for k, v in parts.items() if v > 0},
            "easy": easy, "unjudged": unjudged, "short": R["room"] > 0 or easy < EASY_NEED}


def fresh(e, today):
    """An exhaustion record ({"at": day, "parts": [...]}) less than RECHECK_DAYS old."""
    try:
        return (today - datetime.date.fromisoformat(e["at"])).days < RECHECK_DAYS
    except (KeyError, TypeError, ValueError):
        return False


def pick_short(rows, mem, today, n=REFILL_MAX):
    """(pick, skip) from {sid: shortness} in teaching order: the species with room, less those whose every open part was
    searched to the end less than RECHECK_DAYS ago (mem); the shortest first: short of easy photos with nothing waiting
    for the judging pass (more candidates are their only way to easy photos), then the largest share of the cap
    missing, then teaching order; at most n."""
    order = {sid: i for i, sid in enumerate(rows)}
    want, skip = [], []
    for sid, r in rows.items():
        if r["room"] <= 0:
            continue
        e = mem.get(sid)
        if e and fresh(e, today) and set(r["parts"]) <= set(e.get("parts") or []):
            skip.append(sid)
            continue
        want.append(sid)
    want.sort(key=lambda k: (not (rows[k]["easy"] < EASY_NEED and not rows[k]["unjudged"]), -rows[k]["room"] / rows[k]["cap"], order[k]))
    return want[:n], skip


def exhausted(P):
    """The parts of a refilled species' room (its plan entry from run) still open after the run and searched to the end:
    their searches read to the end (P["end"]), or nothing found for them. "No more candidates is no more candidates"."""
    padd = P.get("phase_add") or {}
    total = sum((P.get("add") or {}).values())
    got = {"free": total - sum(padd.values()), **padd}
    spent = P.get("spent") or got  # the room taken (obs_cost); photos when not given
    left = {"free": P["free"] + sum(r for ph, r in P["rooms"].items() if ph not in INAT_PHASE) - spent.get("free", 0)}
    for ph in INAT_PHASE:
        if P["rooms"].get(ph):
            left[ph], got[ph] = P["rooms"][ph] - spent.get(ph, 0), padd.get(ph, 0)
    end = P.get("end") or {}
    return sorted(k for k, v in left.items() if v > 0 and (end.get(k) or not got[k]))


def load_mem(path):
    try:
        return json.loads(Path(path).read_text(encoding="utf-8")).get("end") or {}
    except (OSError, ValueError):
        return {}


def save_mem(path, mem):
    doc = ("tools/fetch_fish.py --refill (Pierre, 2026-11-06, Q171): per fish.json species id, the parts of its candidate "
           "room searched to the end on iNaturalist (at: the day; parts: free = the general searches, juvenile / male / "
           "female = the phase searches); skipped while every open part was searched to the end less than "
           f"{RECHECK_DAYS} days ago. Written by the Candidate photos workflow.")
    body = ",\n".join(f" {json.dumps(k)}: {json.dumps(mem[k], sort_keys=True)}" for k in sorted(mem))
    Path(path).write_text("{\"_doc\": " + json.dumps(doc) + ",\n\"end\": {" + ("\n" + body + "\n" if body else "") + "}}\n", encoding="utf-8")


def refill(args):
    """--refill (Pierre, 2026-11-06, Q171): the short species only, at most --max a run, with the rules of run; then the
    exhaustion memory, FishBase (offline) and the iNaturalist covers (--rep) for the species refilled."""
    today = datetime.date.fromisoformat(args.today) if args.today else datetime.datetime.now(datetime.timezone.utc).date()
    if not args.plan:
        topup(argparse.Namespace(**{**vars(args), "only": "", "refresh": not args.offline}))
    rd = lambda a: json.loads(Path(a).read_text(encoding="utf-8")) if Path(a).exists() else {}  # noqa: E731
    fish, cur, sug = rd(args.fish), rd(args.cur), rd(args.suggest)
    have = rd(args.cand).get("cand", {})
    fbsrc = rd(args.fbsrc).get("species") or {}
    gone, _ = state(cur, sug)
    F, sugf, moved, game = (cur or {}).get("fish") or {}, (sug or {}).get("fish") or {}, moved_of(cur), game_photos(rd(args.photos))
    S = species_list(fish, set(args.circle))
    rows = {s["id"]: shortness(s, t, have.get(s["id"], []), gone, F, sugf, game.get(s["id"], ()),
                               (fbsrc.get(s["id"]) or {}).get("photos") or (), moved, args.cap) for s, t in S}
    mem = {k: v for k, v in load_mem(args.memory).items() if k in rows}
    pick, skip = pick_short(rows, mem, today, args.max)
    short = {k: r for k, r in rows.items() if r["short"]}
    if args.plan:
        print(json.dumps({"short": short, "pick": pick, "skip": skip, "at_cap": sorted(k for k, r in short.items() if r["room"] <= 0)}))
        return {"short": short, "pick": pick, "skip": skip}
    print(f"refill: {len(short)} short species ({sum(1 for r in short.values() if r['easy'] < EASY_NEED)} short of easy photos), "
          f"{len(skip)} searched to the end, {len(pick)} refilled now", flush=True)
    if not pick:
        save_mem(args.memory, mem)
        return {"short": short, "pick": pick, "skip": skip}
    a = argparse.Namespace(**{**vars(args), "only": ",".join(pick), "deep": True, "rep": False, "plan": False,
                              "refresh": not args.offline})
    plan = run(a)
    for sid in pick:
        ended = exhausted(plan[sid]) if sid in plan else []
        if ended:
            mem[sid] = {"at": today.isoformat(), "parts": ended}
        else:
            mem.pop(sid, None)
    save_mem(args.memory, mem)
    import fetch_fishbase  # noqa: E402  offline: what FishBase holds fills the room iNaturalist left
    fetch_fishbase.main(["--only", ",".join(pick), "--fish", args.fish, "--cand", args.cand, "--cur", args.cur, "--suggest", args.suggest,
                         "--photos", args.photos, "--src", args.fbsrc, *(["--cap", str(args.cap)] if args.cap else []),
                         *[x for c in args.circle for x in ("--circle", str(c))]])
    if not args.offline:
        run(argparse.Namespace(**{**vars(a), "rep": True, "deep": False}))
    ends_now = sorted(k for k in pick if k in mem)
    print(f"refill: searched to the end today: {', '.join(ends_now) or 'none'}; the new candidates wait for the judging pass "
          "(python3 tools/judging_fish.py todo)")
    return {"short": short, "pick": pick, "skip": skip, "end": ends_now}


def main(argv=None):
    a = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    a.add_argument("--circle", type=int, action="append", help="circle(s) to fetch (default 1)")
    a.add_argument("--cap", type=int, help="one fixed cap of usable photos for every species (default: cap_of, 30-60 by phases)")
    a.add_argument("--only", help="comma-separated species or teaching ids")
    m = a.add_mutually_exclusive_group()
    m.add_argument("--refresh", action="store_true", help="ask iNaturalist again")
    m.add_argument("--offline", action="store_true", help="never ask iNaturalist (fail on a reply not cached)")
    m.add_argument("--plan", action="store_true", help="print what a run would add, from the cache only; write nothing")
    a.add_argument("--rep", action="store_true", help="only tag the candidates that are their taxon's iNaturalist cover (rep)")
    a.add_argument("--refill", action="store_true", help="refill the short species only, at most --max (Q171); runs --topup first")
    a.add_argument("--topup", action="store_true", help="the other photos of observations holding OLD_LIMIT (4) photos, asked by id")
    a.add_argument("--max", type=int, default=REFILL_MAX, help=f"--refill: species refilled at most (default {REFILL_MAX})")
    a.add_argument("--today", help="--refill: the day, YYYY-MM-DD (tests; default today, UTC)")
    a.add_argument("--memory", default=str(REFILL), help="--refill: what was searched to the end (tools/fish_refill.json)")
    a.add_argument("--fish", default=str(ROOT / "fish.json"))
    a.add_argument("--cand", default=str(ROOT / "fish-cand.json"))
    a.add_argument("--cur", default=str(ROOT / "curation.json"))
    a.add_argument("--suggest", default=str(ROOT / "suggest.json"))
    a.add_argument("--photos", default=str(ROOT / "fish-photos.json"), help="the game photos (their judging tags record phases)")
    a.add_argument("--fbsrc", default=str(ROOT / "tools" / "fishbase_src.json"), help="FishBase rows (their life stages record phases)")
    a.add_argument("--cache", default=str(ROOT / "tools" / ".cache" / "fish_photos.json"))
    args = a.parse_args(argv)
    args.circle = args.circle or [1]
    return refill(args) if args.refill else topup(args) if args.topup else run(args)


if __name__ == "__main__":
    main()
