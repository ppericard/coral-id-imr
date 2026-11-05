#!/usr/bin/env python3
"""Fish candidate photos from iNaturalist, for Pierre to curate in the admin, into fish-cand.json.
(The admin's fish Candidates page comes with the admin plan's PR 5, docs/ROADMAP.md "Admin for every subject".)

The fish counterpart of tools/fetch_local.py (corals), with Pierre's decisions for fish photos (2026-11-03):
- Unit: the species of fish.json (`species`, PDF / EventMeasure names), grouped under the teaching entries (`teach`).
  A photo belongs to the most precise taxon its observation names: the species (iNaturalist's taxon query includes
  subspecies). Only species in the game (with a `circle`, never `out`), circle 1 by default (--circle).
- Identity: Research Grade at the species level; Pierre's own observations (iNaturalist user ppericard) identified to
  the species are usable as that species even when Needs ID (AGENTS.md rule 6a: he names a species only when nearly
  sure), nobody else's. That is photo use only: they no longer confirm presence on their own (rule 6g; fish.json
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
    IMR list): photos from anywhere in the Philippines and the IWP, ordered by licence (CC0 / CC BY before NC), not by distance;
  - any other species: the Philippines first, by licence then nearest (within 40 km of Dauin, within REGION_KM = 250 km,
    the rest of the country), and abroad only for a species confirmed in the Philippines (present.ph, the presence rule of tools/presence.py), only when the
    Philippines are exhausted (every Philippine observation the search can see is taken and room is left; when the one
    page read is not all of them, later pages may still hold some, so nothing from abroad), by licence too.
- Quality varied on purpose (Pierre: poor iNaturalist photos stand in for SVS video frames, on which EventMeasure
  identifications are made): no ordering by votes (that favours the best photos), no quality filter. The order is a
  fixed hash of the observation id (neutral, reproducible), then the least represented observer and life stage first
  (iNaturalist annotations Juvenile / Adult / Female / Male, kept as `st`: a hint for the pre-sort's phase).
- Photos per species (Pierre, 2026-11-04, admin plan): 8 observations in play per circle-1 species, 12 for the PDF's 24
  most sighted, at most 20 for now (30-40 later). Each species keeps up to CAP (20) observations that are still usable
  (added by Pierre, set in by the pre-sort, or waiting); what Pierre rejects, excludes or sends elsewhere, and what the
  pre-sort sets aside without doubt, frees room for the next run. Each observation brings up to PER_OBS photos (fish
  observations rarely hold several individuals; more photos of one fish are near-duplicates).
- Candidates stay remote (r: 1, shown from `src` straight from iNaturalist), like coral candidates: nothing is downloaded,
  never commit a photo. Record shape as coral candidates (data.json "cand"): f, a, lic, o, t, own, loc (dauin/ph/world),
  src, r, plus st (life stage / sex annotations) and ni (Pierre's own Needs ID observation, confirmed by rule 6a).
  fish-cand.json = {"v": 1, "cand": {species id: [photo, ...]}}, one species per line (tools/datajson.py layout).
- Curation: curation.json "fish" (written by the admin only, never here; its full shape is the admin plan's PR 4): add
  {f: 1}, seen {f: 1} (rejected), exclude {f: reason}, out {f: species id or "x"}. The top-level "exclude" (corals) is honoured too, by iNaturalist photo id.
- Pre-sort: suggest.json "fish" (tools/judging_fish.py, judging/FISH.md "Candidates").
- Reference photos (Pierre, 2026-11-05): --rep tags each candidate whose photo is its taxon's iNaturalist cover (the
  taxon's default photo, what iNaturalist shows to represent the species) with rep: "inaturalist" (judging/FISH.md
  "Reference photos": its ease gets a bonus), 30 taxa a request, and refills nothing; run it after a refill. FishBase
  candidates (via: "fishbase", tools/fetch_fishbase.py) carry their own tag.

Network: iNaturalist API v2 (only the fields used), read only, a pause of PAUSE s between calls, generic User-Agent.
Every reply is cached, trimmed, in tools/.cache/fish_photos.json (git-ignored): a rerun is offline and gives the same
file; --refresh asks again (new observations), --offline never asks (fails on a reply not cached), --plan prints as JSON
what a run would add per species and source, from the cache only, and writes nothing.

    python3 tools/fetch_fish.py [--circle 1] [--cap 20] [--only s091,t05] [--refresh | --offline | --plan] [--rep]
Tests: node --test tests/fishphotos.test.js (offline fixtures).
"""
import argparse
import hashlib
import json
import math
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

API = "https://api.inaturalist.org/v2/observations?"
TAXA = "https://api.inaturalist.org/v2/taxa/"
FIELDS = ("id,quality_grade,location,place_ids,taxon.id,taxon.name,taxon.rank,user.login,photos.id,photos.url,"
          "photos.license_code,photos.attribution,annotations.controlled_attribute_id,annotations.controlled_value_id,"
          "annotations.vote_score")
UA = {"User-Agent": "coral-id-imr/1.0", "Accept": "application/json"}
PAUSE = 1.0  # iNaturalist asks for at most about one request per second
DAUIN = (9.19, 123.26)
DAUIN_KM, REGION_KM = 40, 250  # as tools/fetch_local.py
PH = 6873  # iNaturalist place: the Philippines
PIERRE = "ppericard"
# CAP: Pierre's cap of observations per species (2026-11-04: 20 for now, 30-40 later); 30 on the first run of 2026-11-03.
CAP, PER_OBS = 20, 4
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


def lic_class(lic, own):
    """0 Pierre's own (whatever its licence), 1 CC0 / CC BY, 2 NC: the order fish photos are taken in (Pierre, 2026-11-03)."""
    if own:
        return 0
    return 1 if lic in ("cc0", "cc-by") else 2


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
    return {"id": o["id"], "g": o.get("quality_grade"), "ll": ll, "inph": PH in (o.get("place_ids") or []),
            "t": t.get("name"), "rk": t.get("rank"), "u": (o.get("user") or {}).get("login"), "an": an,
            "ph": [[p["id"], p.get("url"), p.get("license_code"), p.get("attribution")] for p in o.get("photos") or []]}


class Net:
    """GET iNaturalist v2 with a cache of trimmed replies ({url: {total, results}})."""

    def __init__(self, cache, offline=False, refresh=False, plan=False):
        self.path, self.offline, self.refresh, self.plan = Path(cache), offline, refresh, plan
        self.c = json.loads(self.path.read_text(encoding="utf-8")) if self.path.exists() else {}
        self.asked, self.new, self.missing = set(), 0, 0

    def get(self, q):
        return self.fetch(API + q + "&fields=" + FIELDS,
                          lambda d: {"total": d.get("total_results", 0), "results": [trim(o) for o in d.get("results") or []]})

    def fetch(self, url, keep):
        """The reply to url, kept as keep(reply) in the cache (asked again with --refresh, never with --offline)."""
        if url in self.c and not (self.refresh and url not in self.asked):
            return self.c[url]
        if self.plan:
            self.missing += 1
            return None
        if self.offline:
            sys.exit(f"--offline: not cached: {url}")
        for k in range(6):
            time.sleep(PAUSE)
            try:
                with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=90) as r:
                    d = json.load(r)
                break
            except (OSError, ValueError) as e:  # URLError, a reset connection, a timeout, bad JSON: retried
                print(f"  retry {q[:80]} ({e})", file=sys.stderr)
                time.sleep(10 * (k + 1))
        else:
            raise RuntimeError(f"failed: {url}")
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
    P = P[:PER_OBS]
    st = sorted({STAGE[tuple(a)] for a in o.get("an", []) if tuple(a) in STAGE})
    return {**o, "P": P, "own": own, "cls": min(lic_class(p[2], own) for p in P), "tier": tier_of(o), "st": "/".join(st), "h": hord(o["id"])}


def select(pools, room, more, n=None, world=lambda: [], anywhere=False, claimed=None):
    """Pick up to `room` observations (Pierre, 2026-11-03). Pierre's own first (class 0), from any pool. Then, for a
    species confirmed near Dauin (anywhere=True): every place at once, abroad included (world() fetched), by licence
    class (1 CC0 / CC BY, then 2 NC), not by distance. Otherwise: by licence class, and within a class nearest first
    (dauin, region, ph); abroad (world(), fetched only then) only when the Philippines are exhausted: room is left and no
    Philippine search had more results than it read (more[tier]). Within a bucket, the least represented observer and
    life stage first, then the fixed hash order. pools: {tier: [items from usable_obs]} (tier "world": Pierre's own
    abroad); n: Counter of ('u', login) / ('s', stage) already in the species' list. claimed: the iNaturalist photo ids
    already taken (updated here): iNaturalist lets one photo belong to several observations, so a photo is taken once,
    by the first observation picked, and an observation left with no photo of its own is skipped without taking room
    (Codex review #463). Returns [item, ...] in order, each with only its own photos in P."""
    n = Counter() if n is None else n
    claimed = set() if claimed is None else claimed
    taken, seen = [], set()

    def take(L):
        nonlocal room
        L = [o for o in L if o["id"] not in seen]
        while L and room > 0:
            o = min(L, key=lambda o: (n["u", o["u"]], n["s", o["st"]], o["h"]))
            L.remove(o)
            seen.add(o["id"])
            P = [p for p in o["P"] if str(p[0]) not in claimed]
            if not P:
                continue
            o["P"] = P
            claimed.update(str(p[0]) for p in P)
            taken.append(o)
            n["u", o["u"]] += 1
            n["s", o["st"]] += 1
            room -= 1

    allp = [o for t in (*TIERS, "world") for o in pools.get(t, [])]
    take([o for o in allp if o["own"]])
    if anywhere:
        if room > 0:
            allp += world()
        for cls in (1, 2):
            take([o for o in allp if o["cls"] == cls])
        return taken
    for cls in (1, 2):
        for t in TIERS:
            take([o for o in pools.get(t, []) if o["cls"] == cls])
    if room > 0 and not any(more.get(t) for t in TIERS):
        W = world()
        for cls in (1, 2):
            take([o for o in W if o["cls"] == cls])
    return taken


def covers(net, taxa):
    """{iNaturalist taxon id: the photo id of its default photo (the taxon's cover), or None when it has none}, for the
    taxa iNaturalist answered (a taxon missing from the result is unknown: a --plan run, a reply not cached); 30 taxa a
    request (rule 6f)."""
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


def run(args):
    fish = json.loads(Path(args.fish).read_text(encoding="utf-8"))
    cand_path = Path(args.cand)
    have = json.loads(cand_path.read_text(encoding="utf-8")).get("cand", {}) if cand_path.exists() else {}
    cur = json.loads(Path(args.cur).read_text(encoding="utf-8")) if Path(args.cur).exists() else {}
    sug = json.loads(Path(args.suggest).read_text(encoding="utf-8")) if Path(args.suggest).exists() else {}
    gone, excl = state(cur, sug)
    net = Net(args.cache, offline=args.offline, refresh=args.refresh, plan=args.plan)
    only = set(filter(None, (args.only or "").split(",")))
    used = {pid(p["f"]) for L in have.values() for p in L} - {None}
    plan, report = {}, {}
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
    try:
        for s, t in species_list(fish, set(args.circle), only):
            sid = s["id"]
            L = have.setdefault(sid, [])
            keep_obs = {p["o"] for p in L if not gone(p["f"])}
            room = args.cap - len(keep_obs)
            n = Counter()
            known = {p["o"] for p in L}
            if room <= 0:
                plan[sid] = {"name": s["name"], "entry": t["id"], "have": len(keep_obs), "room": 0, "add": {}}
                continue
            Q = queries(s["inat"])
            got, more, pools = {}, {}, {}
            # Pierre's own, asked for every species (Codex review #463): fish.json present.own is a count from the last
            # build, so a species he identified since would otherwise never get his photos.
            names = ["own", *TIERS]
            for k in names:
                got[k] = net.get(Q[k])
            if args.plan and any(got[k] is None for k in names):
                plan[sid] = {"name": s["name"], "entry": t["id"], "have": len(keep_obs), "room": room, "cached": False}
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
            more.pop("own", None)
            for it in byid.values():
                pools.setdefault(it["tier"], []).append(it)
            # Life stages already in the list, so a refill keeps varying them (observers: logins are not stored).
            for p in L:
                if not gone(p["f"]):
                    n["s", p.get("st", "")] += 1
            def world():
                if not (s.get("present") or {}).get("ph"):
                    return []  # abroad only for a species confirmed in the Philippines
                w = net.get(Q["world"])
                out = [usable_obs(o, used, excl) for o in (w or {}).get("results", [])
                       if f"https://www.inaturalist.org/observations/{o['id']}" not in known and o["id"] not in byid]
                return [{**x, "tier": "world"} for x in out if x]

            # Confirmed near Dauin (present.near: 2+ Research Grade observers within 40 km, or the IMR list): photos from anywhere, by licence (Pierre, 2026-11-03).
            taken = select(pools, room, more, n, world, anywhere=bool((s.get("present") or {}).get("near")), claimed=used)
            add = Counter(LOC[o["tier"]] for o in taken)
            plan[sid] = {"name": s["name"], "entry": t["id"], "have": len(keep_obs), "room": room, "add": dict(add)}
            if args.plan:
                continue
            for o in taken:
                for p in o["P"]:
                    used.add(str(p[0]))
                    L.append(record(s, o, p))
            report[sid] = len(taken)
            print(f"{t['name']:<28} {s['name']:<32} +{len(taken)} obs ({dict(add)}), {len(L)} photos", flush=True)
    finally:
        net.save()
    if args.plan:
        print(json.dumps({"missing": net.missing, "species": plan}))
        return plan
    order = [s["id"] for s in fish["species"]]
    out = {k: have[k] for k in sorted(have, key=lambda k: order.index(k) if k in order else 1e9) if have[k]}
    dump({"v": 1, "cand": out}, str(cand_path))
    print("total", sum(map(len, out.values())), "photos for", len(out), "species")
    return plan


def main(argv=None):
    a = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    a.add_argument("--circle", type=int, action="append", help="circle(s) to fetch (default 1)")
    a.add_argument("--cap", type=int, default=CAP, help=f"usable observations kept per species (default {CAP})")
    a.add_argument("--only", help="comma-separated species or teaching ids")
    m = a.add_mutually_exclusive_group()
    m.add_argument("--refresh", action="store_true", help="ask iNaturalist again")
    m.add_argument("--offline", action="store_true", help="never ask iNaturalist (fail on a reply not cached)")
    m.add_argument("--plan", action="store_true", help="print what a run would add, from the cache only; write nothing")
    a.add_argument("--rep", action="store_true", help="only tag the candidates that are their taxon's iNaturalist cover (rep)")
    a.add_argument("--fish", default=str(ROOT / "fish.json"))
    a.add_argument("--cand", default=str(ROOT / "fish-cand.json"))
    a.add_argument("--cur", default=str(ROOT / "curation.json"))
    a.add_argument("--suggest", default=str(ROOT / "suggest.json"))
    a.add_argument("--cache", default=str(ROOT / "tools" / ".cache" / "fish_photos.json"))
    args = a.parse_args(argv)
    args.circle = args.circle or [1]
    return run(args)


if __name__ == "__main__":
    main()
