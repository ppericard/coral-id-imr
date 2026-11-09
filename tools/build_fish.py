#!/usr/bin/env python3
"""Builds fish.json, the content of the fish mode, from tools/fish_source.json plus WoRMS and iNaturalist lookups.

Decided with Pierre, 2026-11-03: one engine for corals and fish, with a taxonomy made of two trees.
1. Reference tree (`ref`), from WoRMS (World Register of Marine Species, https://www.marinespecies.org/rest/). No fixed
   ranks: each node keeps its WoRMS rank as given (Order, Suborder, Family, Subfamily, Tribe, Genus, Species...), unranked
   or odd clades are kept, missing ranks are simply skipped. A node is {name: accepted name, rank, parent, syn: WoRMS
   synonyms (old names stay accepted when typed), inat: iNaturalist taxon id (photos), iname: iNaturalist's name when it
   differs from WoRMS}. Nodes run from the WoRMS class (Teleostei, Elasmobranchii...) down to the species.
2. Teaching tree (`teach`), what the game asks: level 1 = the 27 family-level entries of the IMR fish presentation in its
   order, then the other circles; level 2 = species. Each teaching node points to one or more reference nodes (`ref`,
   minus `not`): Unicornfish = genus Naso, Surgeonfish = the rest of Acanthuridae,
   Parrotfish = subfamily Scarinae, Wrasse = Labridae without Scarinae, Sweetlips = Plectorhinchus + Diagramma...
   A species belongs to the teaching node whose `ref` holds its nearest ancestor (the most specific wins), its genus
   being the genus of its PDF name: Chromis agilis stays under Chromis though WoRMS now has it in Pycnochromis.
   `sub` holds the sub-entries IMR names inside an entry (Chromis / Dascyllus / Pomacentrus, Surgeonfish / Unicornfish).
Circles: 1 = IMR core (the 27 entries, their species from the EventMeasure reference PDF "Common Filipino Fishes",
cheatsheet first, and the species the slides name); 2 = seen sometimes on SVS video (barracudas; trumpetfishes,
shrimpfishes and sweepers since Q216, 2026-11-08); 3 = opt-in
"beyond IMR", not PDF-based (Pierre, 2026-11-03): the fish families divers want to recognise, muck diving above all
(sources in the source file's `sources`, reason in each node's `why`), with their species confirmed near Dauin (near_dauin), plus winks
(`wink`: unmistakable species, fun to meet, a light bonus rather than ID training). Silvery/pelagic groups are not circle 1.
A species takes its family's circle, the circle of its teaching node, whatever its source (Pierre, 2026-11-08, Q214:
"the circle holds families, so every species of the family"); a species off the IMR list (src dauin, wink) needs, like
every circle-3 species, to be confirmed near Dauin (needs_near; until 2026-11-08 a dauin or wink species was circle 3).

Identification groups (Pierre, 2026-11-04; rule S3): the regional identification key in force (the source's
`deploy.key`, one of its `keys`; for the Indo-Pacific, the index of a reef fish ID book) is the reference for fish groups.
Every teaching node gets the group of its key (`group`, the key's group number): the first key label met walking up WoRMS
from each of its references (a subfamily label wins over its family's), the same for all of them. The build fails, naming
the node, when a node in the game (any circle, winks aside) has no group or spans two groups, unless the source makes the
choice explicit (`keyGroup`; null with `keyWhy` while a node waits for a decision, listed by the build). A region with no
key has no such rule. fish.json `key` = the key in force (id, region, cite, short, groups without their labels).

Names (Pierre, 2026-11-03): the name shown and expected is the PDF's, i.e. EventMeasure's (a fixed pick list that may lag
WoRMS). The WoRMS accepted name goes beside it in `now` ("now X in WoRMS"); both are accepted when typed, and the WoRMS
synonyms too. Each name is checked against WoRMS: an exact match on the name as written (or its hand fix `as`), else
WoRMS's fuzzy match (TAXAMATCH). A spelling WoRMS does not know at all is a likely slip in the PDF: kept as written and
flagged in `check` for Pierre to check against EventMeasure (common-name slips too, from the source's `check`). Two PDF
species that WoRMS treats as one stay two entries. The build prints all of these, the WoRMS / iNaturalist mismatches
and a cross-check of the PDF sections against the teaching nodes.

Presence (rule C8, Pierre 2026-11-04: "the same scientific rigour for everyone, me included"; the rule is
defined once in tools/presence.py): confirmed near Dauin (present.near, reasons in nearBy) = Research Grade observations
within 40 km of Dauin (9.19, 123.26) by at least 2 distinct observers, or the IMR reference PDF list; confirmed in the
Philippines (present.ph, reasons in phBy) = Research Grade observations there (place 6873) by at least 3 distinct
observers, or at least 1 there and FishBase's Philippine checklist (Table 1) lists it, or confirmed near Dauin. Pierre's
own observations (user ppericard), two halves: photos identified to the species stay usable as that species even when
Needs ID (rule S2: he names a species only when nearly sure); presence: he is one observer like anyone, Research Grade
only, and his observations no longer confirm anything on their own (until 2026-11-04 they did). present = {dauin, dauinNI,
dauinU, near, nearBy, rg, phU, chk, ph, phBy, own} (presence()); circle 3 and every species off the IMR list also need near. --near recomputes dauinU and
near on the existing fish.json, then ph and phBy (they depend on near), taking out of the game a species no
longer confirmed (the rest of the build and its counts unchanged). A species not confirmed
in the Philippines leaves the game but stays in fish.json with `out` (a future Fish ID Key for EventMeasure must hold
every PDF species, unfiltered), as does a PDF species whose family is in no circle.

Each species: {id, name (PDF / source), now (WoRMS accepted, when it differs), common, ref (AphiaID), inat (iNaturalist
taxon of its PDF name, else of the WoRMS name), circle (in the game) or out (why not), r (rank order: the PDF
cheatsheet's 24 most sighted first, then the source order, i.e. PDF order, then the slides, winks, Dauin species),
cmi (commonness index, 0-1, within its teaching entry: tools/fish_commonness.py), present, src (slides, dauin, wink; PDF when absent), sec (PDF section), pdf (pages), cs (cheatsheet rank), sl (slide),
check, cn (the curated common names, 1 to 3, from tools/fish_common.json: add_families)}. fish.json vn: the name index's
kind words (razorfish, toby: tools/fish_names.py, add_families). A teaching node's `species` (and its sub-entries') are in commonness order, the most commonly met around Dauin
first (Pierre, 2026-11-04: "common beats easy" to start; fish_commonness.apply(), its inputs in
tools/fish_commonness.json and tools/fish_commonness_inat.json; docs/FISH_PATH.md). Ids are stable and never names: they live in the source file (teaching nodes t01..., species s001...), never
reuse or renumber one (`retired` lists the ids taken out).

Network: WoRMS and iNaturalist, read only, through tools/inat.py (0.3 s between WoRMS requests, 1 s between iNaturalist
ones, the project's User-Agent, 429 / 5xx retried after a pause; rule C7); the presence counts of every species are asked
together (presence_prefetch: species_counts 100 taxa a request, the observers of the species with few observations
read together), each count exactly what its one-species request answers, a species the batch cannot count exactly
asked alone. Every reply is cached in
tools/.cache/fish.json (git-ignored), so a rerun is offline and gives the same file; --refresh asks again (counts and
names move over time), --offline fails instead of asking. The output is deterministic: one record per line, sorted.

Usage: python3 tools/build_fish.py [--offline | --refresh] [--dry]   (--dry: print the report, leave fish.json as it is)
       python3 tools/build_fish.py --regroup   (offline, no WoRMS call: re-applies the key in force to fish.json as it is,
       from its own reference tree; after an edit of `keys`, `deploy` or `keyGroup`, or to settle a merge of fish.json)
       python3 tools/build_fish.py --commonness   (offline: re-applies the commonness index and order to fish.json as it is,
       after an edit of tools/fish_commonness.json or a fish_commonness.py --fetch; --check: fail when fish.json differs)
Check: node --test tests/fish.test.js
"""
import argparse
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

import fish_commonness
import fish_names

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "tools" / "fish_source.json"
SHEETS = ROOT / "tools" / "fish_sheets.json"  # the family sheets' own lines (add_families)
FACTS = ROOT / "tools" / "fish_facts.json"  # the species' size and depth (add_families; tools/fish_facts.py)
GNAMES = ROOT / "tools" / "fish_genus_names.json"  # the genus common names and their sources (add_families)
CNAMES = ROOT / "tools" / "fish_common.json"  # the species' curated common names, 1 to 3 (add_families; tools/fish_common.py)
WINKP = ROOT / "tools" / "fish_wink_photos.json"  # the surprise cards' own photos (add_families: wink_photos)
OUT = ROOT / "fish.json"
CACHE = ROOT / "tools" / ".cache" / "fish.json"
V = 1  # fish.json format version

WORMS = "https://www.marinespecies.org/rest/"
INAT = "https://api.inaturalist.org/v1/"
DAUIN = "lat=9.19&lng=123.26&radius=40"
PH = "place_id=6873"
PIERRE = "ppericard"  # his observations: usable photos (rule S2); one observer like anyone for presence (2026-11-04)
CHORDATA = 2  # iNaturalist
INAT_RANKS = {"class", "subclass", "infraclass", "superorder", "order", "suborder", "infraorder", "superfamily", "family",
              "subfamily", "supertribe", "tribe", "subtribe", "genus", "subgenus", "species"}
sys.path.insert(0, str(Path(__file__).resolve().parent))
from presence import NEAR_OBSERVERS, PH_OBSERVERS, listed, near_dauin, ph_confirmed  # noqa: E402  (the rule, once)
import inat  # noqa: E402  (the one paced, retried client: WoRMS 0.3 s, iNaturalist 1 s between requests; rule C7)

LOW = {"Subspecies", "Variety", "Forma", "Natio", "Mutatio"}  # synonyms below the species: not kept


class Net:
    """GET JSON with a cache (one file, {url: reply}); None for an empty reply (WoRMS answers 204 when nothing matches)."""

    def __init__(self, offline=False, refresh=False):
        self.offline, self.refresh, self.new, self.asked = offline, refresh, 0, set()
        self.c = json.loads(CACHE.read_text(encoding="utf-8")) if CACHE.exists() else {}

    def get(self, url):
        if url in self.c and not (self.refresh and url not in self.asked):
            return self.c[url]
        if self.offline:
            sys.exit(f"--offline: not cached: {url}")
        try:
            v = inat.get(url, missing=True)  # paced per host, 429 / 5xx retried after a pause; 204 / 404: None
        except (OSError, ValueError) as e:
            raise RuntimeError(f"failed: {url} ({e})") from e
        self.c[url] = v
        self.asked.add(url)
        self.new += 1
        if self.new % 40 == 0:
            self.save()
        return v

    def save(self):
        CACHE.parent.mkdir(parents=True, exist_ok=True)
        tmp = CACHE.with_suffix(".tmp")
        tmp.write_text(json.dumps(self.c, sort_keys=True, separators=(",", ":")), encoding="utf-8")
        tmp.replace(CACHE)


NET = None
q = urllib.parse.quote


def chordate(recs):
    return [r for r in recs or [] if r.get("phylum") == "Chordata"]


def worms_record(aid):
    return NET.get(f"{WORMS}AphiaRecordByAphiaID/{aid}")


def accepted(rec):
    """Follow valid_AphiaID until an accepted record (WoRMS chains are short)."""
    for _ in range(5):
        if rec["status"] == "accepted" or not rec.get("valid_AphiaID") or rec["valid_AphiaID"] == rec["AphiaID"]:
            return rec
        rec = worms_record(rec["valid_AphiaID"])
    return rec


def worms_name(name):
    """(record as matched, how) for a name in Chordata: exact match first, then WoRMS's fuzzy match (TAXAMATCH)."""
    recs = chordate(NET.get(f"{WORMS}AphiaRecordsByName/{q(name)}?like=false&marine_only=true"))
    if not recs:
        recs = chordate(NET.get(f"{WORMS}AphiaRecordsByName/{q(name)}?like=false&marine_only=false"))
    if recs:
        same = [r for r in recs if r["scientificname"] == name] or recs
        best = sorted(same, key=lambda r: (r["status"] != "accepted", r["AphiaID"]))[0]
        return best, "exact"
    m = NET.get(f"{WORMS}AphiaRecordsByMatchNames?scientificnames[]={q(name)}&marine_only=true") or [[]]
    recs = chordate(m[0] if m else [])
    valid = sorted({r["valid_AphiaID"] for r in recs if r.get("valid_AphiaID")})
    if len(valid) == 1:
        return recs[0], "fuzzy"
    return None, ("ambiguous: " + ", ".join(sorted({r["scientificname"] for r in recs}))) if recs else "no match"


def classification(aid):
    """[(AphiaID, name, rank)] from the deepest WoRMS class down to the taxon itself."""
    node, out = NET.get(f"{WORMS}AphiaClassificationByAphiaID/{aid}"), []
    while node:
        out.append((node["AphiaID"], node["scientificname"], node["rank"]))
        node = node.get("child")
    cls = [i for i, x in enumerate(out) if x[2] == "Class"]
    return out[cls[-1]:] if cls else out


def synonyms(aid):
    names, off = set(), 1
    while True:
        rs = NET.get(f"{WORMS}AphiaSynonymsByAphiaID/{aid}?offset={off}") or []
        names |= {r["scientificname"] for r in rs if r.get("rank") not in LOW and r.get("scientificname")}
        if len(rs) < 50:
            return names
        off += 50


def inat_taxon(name, rank, alt=()):
    """(iNat id, iNat name) of the taxon named `name` in Chordata; for a species, else the species iNat files that name
    (or an old name, `alt`) under. Above the species only the exact name counts: iNaturalist's other matches there are
    another rank (Scarini -> Scarinae, Caesionidae -> Lutjaninae). (None, None) when iNaturalist has nothing."""
    for k, n in enumerate([name, *alt]):
        exact = []
        # The search, then the autocomplete when the search misses a short name (Foa fo: its search returns 30 "foam"
        # taxa, 2026-11-08); a name the search finds is never asked twice.
        for ep in ("taxa?q=", "taxa/autocomplete?q="):
            rs = (NET.get(f"{INAT}{ep}{q(n)}&per_page=30") or {}).get("results") or []
            rs = [r for r in rs if CHORDATA in (r.get("ancestor_ids") or [])]
            exact = [r for r in rs if r["name"] == n]
            if not exact and rank == "Species":
                exact = [r for r in rs if r.get("matched_term") == n]
            if exact:
                break
        if exact:
            r = sorted(exact, key=lambda r: (r["rank"] != rank.lower(), r["id"]))[0]
            if k == 0 or r["rank"] == rank.lower():
                return r["id"], r["name"]
    return None, None


def inat_count(tid, where, grade="research"):
    """Observations of a taxon (and below it); grade "" = any quality grade. From the batch when presence_prefetch
    counted it."""
    if (tid, where, grade) in PRE:
        return PRE[tid, where, grade]
    g = f"&quality_grade={grade}" if grade else ""
    return (NET.get(f"{INAT}observations?taxon_id={tid}{g}&{where}&per_page=0") or {}).get("total_results", 0)


# The presence counts of every species, asked together before the species loop (rule C7; #784): {(taxon, where, grade): observations, ("u", taxon, where): distinct Research Grade observers}, each
# what the one-species request (inat_count, observers) answers; what is not in it is asked alone, as before.
PRE = {}
COUNTS = ((f"user_login={PIERRE}", ""), (PH, "research"), (DAUIN, "research"), (DAUIN, "needs_id"))


class _Miss(Exception):
    pass


def presence_prefetch(items):
    """Fills PRE for items [(taxon, imr, names)] (presence()'s arguments), in presence()'s order of need: the four counts
    (species_counts, 100 taxa a request), the observers near Dauin of the species with Research Grade observations there,
    then those in the Philippines of the species the rule still needs them for. An --offline run whose cache lacks a
    batched reply leaves PRE empty (every count then asked alone, from the cache)."""
    PRE.clear()

    def get(url):
        if NET.offline and url not in NET.c:
            raise _Miss(url)
        return NET.get(url)

    tids = sorted({t for t, _, _ in items})
    try:
        for where, grade in COUNTS:
            q = (f"quality_grade={grade}&" if grade else "") + where
            for t, n in inat.leaf_counts(get, tids, q).items():
                if n is not None:
                    PRE[t, where, grade] = n
        rg_p = {t: inat_count(t, PH) for t in tids}
        rg_d = {t: inat_count(t, DAUIN) if rg_p[t] else 0 for t in tids}
        solo = lambda where: lambda t: observers(t, where)[0]  # noqa: E731
        for t, n in inat.observer_counts(get, {t: rg_d[t] for t in tids if rg_d[t]}, f"quality_grade=research&{DAUIN}",
                                         solo(DAUIN)).items():
            PRE["u", t, DAUIN] = n
        need = {t for t, imr, names in items if rg_p[t] >= PH_OBSERVERS and not listed("fish", names)
                and not near_dauin(PRE.get(("u", t, DAUIN), 0), imr)}
        for t, n in inat.observer_counts(get, {t: rg_p[t] for t in sorted(need)}, f"quality_grade=research&{PH}", solo(PH)).items():
            PRE["u", t, PH] = n
    except _Miss:
        PRE.clear()


def observer_count(tid, where):
    """Distinct observers of Research Grade observations of a taxon in a place (observers()), from the batch when
    presence_prefetch counted them."""
    return PRE["u", tid, where] if ("u", tid, where) in PRE else observers(tid, where)[0]


def presence(tid, imr=False, names=()):
    """present for an iNaturalist species taxon, by the presence rule (tools/presence.py, rule C8; Pierre,
    2026-11-04: "the same scientific rigour for everyone, me included"). Querying by the species taxon returns
    observations identified to it or below, so a genus-level observation never counts. dauin = Research Grade observations
    within 40 km of Dauin; dauinNI = the Needs ID observations there ("not confirmed near Dauin", never "never seen");
    dauinU = their distinct Research Grade observers; near / nearBy = confirmed near Dauin and why (near_dauin); rg =
    Research Grade observations in the Philippines; phU = their distinct observers (asked only when rg >= PH_OBSERVERS
    and nothing else confirms it); chk = the checklist (FishBase Table 1) lists it for the Philippines (`names`: the PDF
    name, the WoRMS name, iNaturalist's, the synonyms); ph / phBy = confirmed in the Philippines and why (ph_confirmed);
    own = all of Pierre's observations of it, anywhere: usable photos (rule S2), no longer a confirmation by itself."""
    own = inat_count(tid, f"user_login={PIERRE}", "")
    rg_p = inat_count(tid, PH)
    rg_d = inat_count(tid, DAUIN) if rg_p else 0
    ni_d = inat_count(tid, DAUIN, "needs_id")
    p = {"dauin": rg_d, "dauinNI": ni_d}
    if own:
        p["own"] = own
    p.update(near_fields(tid, p, imr))
    chk = listed("fish", names)
    u = observer_count(tid, PH) if rg_p >= PH_OBSERVERS and not (chk or p["near"]) else None
    why = ph_confirmed(rg_p, u, chk, p["near"])
    p.update({"rg": rg_p, "chk": chk, "ph": bool(why), "phBy": why})
    if u is not None:
        p["phU"] = u
    return p


# A species off the IMR list (src dauin or wink) or of a circle-3 node must be confirmed near Dauin (Pierre, 2026-11-03;
# since Q214, 2026-11-08, it takes its family's circle, the near-Dauin bar unchanged), by the same rule.
NEAR_OUT = "not confirmed near Dauin"


def needs_near(src, circle):
    """True for a species that is in the game only once confirmed near Dauin: off the IMR list, or of circle 3."""
    return src in ("dauin", "wink") or circle == 3


def observers(tid, where):
    """(distinct observers of Research Grade observations, their logins: the first 10) of a taxon in a place."""
    d = NET.get(f"{INAT}observations/observers?taxon_id={tid}&quality_grade=research&{where}&per_page=10") or {}
    return d.get("total_results", 0), [r["user"]["login"] for r in d.get("results") or []]


def near_fields(tid, p, imr=False):
    """present.dauinU (distinct Research Grade observers within 40 km of Dauin), near (near_dauin) and nearBy (why)."""
    n = observer_count(tid, DAUIN) if p.get("dauin") else 0
    why = near_dauin(n, imr)
    return {"dauinU": n, "near": bool(why), "nearBy": why}


def update_near(path=OUT):
    """--near: (re)compute present.dauinU, near and nearBy on the species of an existing fish.json, then ph and phBy
    (rule C8: they depend on near), take out of the game a species no longer confirmed in the Philippines and a species that
    needs near (needs_near) not confirmed near Dauin (out: NEAR_OUT, also out of its teaching node's lists), nothing else
    (the rest of the build unchanged, so its WoRMS and iNaturalist counts do not move). A species taken out comes back
    with a full build once confirmed. Returns (fish.json, changes of near, species and nodes taken out)."""
    o = json.loads(Path(path).read_text(encoding="utf-8"))
    changed, left = [], []
    for s in o["species"]:
        p = s.get("present")
        if not p or not s.get("inat"):
            continue
        old = p.get("near")
        p.pop("near", None)
        p.pop("nearBy", None)
        p.update(near_fields(s["inat"], p, "pdf" in s))
        # National presence depends on near (rule C8): recompute it from the stored rg and chk, asking the national
        # observers when the rule needs them; a species no longer confirmed leaves the game (Codex review #496). A species
        # newly confirmed comes in with a full build (its circle comes from the source).
        if "rg" in p:
            u = p.get("phU")
            if u is None and p["rg"] >= PH_OBSERVERS and not (p["chk"] or p["near"]):
                u = p["phU"] = observers(s["inat"], PH)[0]
            why = ph_confirmed(p["rg"], u, p["chk"], p["near"])
            if s.get("circle") and not why:
                left.append(f"{s['id']} {s['name']}: no longer confirmed in the Philippines")
                del s["circle"]
                s["out"] = "not confirmed in the Philippines"
            p["ph"], p["phBy"] = bool(why), why
        who = None
        drop = s.get("circle") and needs_near(s.get("src"), s["circle"]) and not p["near"]
        if p["near"] != old or drop:
            _, who = observers(s["inat"], DAUIN) if p.get("dauin") else (0, [])
        if p["near"] != old:
            changed.append(f"{s['id']} {s['name']} (circle {s.get('circle', 'out')}): {p['dauin']} confirmed near Dauin, "
                           f"observers {', '.join(who) or 'none'} -> "
                           f"{'confirmed (' + ', '.join(p['nearBy']) + ')' if p['near'] else 'not confirmed'}")
        if drop:
            left.append(f"{s['id']} {s['name']}: {p['dauin']} Research Grade near Dauin, {p['dauinU']} observer(s) "
                        f"({', '.join(who) or 'none'})")
            del s["circle"]
            s["out"] = NEAR_OUT
    game = {s["id"] for s in o["species"] if s.get("circle")}
    keep = []
    for t in o["teach"]:
        t["species"] = [x for x in t.get("species", []) if x in game]
        for u in t.get("sub", []):
            u["species"] = [x for x in u.get("species", []) if x in game]
        if t["species"]:
            keep.append(t)
        else:
            left.append(f"teaching node {t['id']} {t['name']}: no species left, left out")
    o["teach"] = keep
    return o, changed, left


def resolve_ref(x, report):
    """A teaching node's ref entry (WoRMS name or AphiaID) -> accepted AphiaID."""
    if isinstance(x, int):
        return accepted(worms_record(x))["AphiaID"]
    rec, how = worms_name(x)
    if not rec:
        sys.exit(f"teaching ref {x!r}: {how}")
    acc = accepted(rec)
    if acc["scientificname"] != x:
        report["refnames"].append(f"{x} -> {acc['scientificname']} ({acc['rank']}, {rec['status']})")
    return acc["AphiaID"]


def key_in_force(src):
    """The identification key of this deployment's region (source `deploy.key` among `keys`), or None when the region has
    none (then no group rule). Its labels' names must be unique across groups."""
    kid = (src.get("deploy") or {}).get("key")
    if not kid:
        return None
    key = next((k for k in src.get("keys", []) if k["id"] == kid), None)
    if key is None:
        sys.exit(f"deploy.key {kid!r}: no such key in keys")
    seen = {}
    for g in key["groups"]:
        for lab in g["labels"]:
            for name in lab[1]:
                if seen.setdefault(name, g["n"]) != g["n"]:
                    sys.exit(f"key {kid}: {name} is under groups {seen[name]} and {g['n']}")
    return key


def key_out(key):
    """The key as fish.json carries it: the app shows group numbers and titles and credits the key (no labels)."""
    if key is None:
        return None
    o = {k: key[k] for k in ("id", "region", "cite", "short")}
    o["groups"] = [{"n": g["n"], "title": g["title"], "pages": g["pages"]} for g in key["groups"]]
    return o


def key_groups(key, units, tree):
    """{unit id: group n or None} under the key in force. units: [{id, name, refs (AphiaIDs), subs: [{id, name, refs}],
    game (in the game: any circle, winks aside), choice (the source's keyGroup for this key, absent: no entry), why}];
    tree: AphiaID -> {name, parent}. A reference's group: the first key label met walking up from it. Fails, naming every
    offending node, when a node in the game has no group, a reference with none, or two groups, without an explicit choice;
    a sub-entry must fall in its entry's group. Returns ({id: n}, [waiting: "id name: why"])."""
    if key is None:
        return {}, []
    label = {name: g["n"] for g in key["groups"] for lab in g["labels"] for name in lab[1]}
    nums = {g["n"] for g in key["groups"]}

    def of(aid):
        while aid is not None:
            n = tree[aid]
            if n["name"] in label:
                return label[n["name"]]
            aid = n["parent"]
        return None

    out, waiting, bad = {}, [], []
    for u in units:
        gs = [of(a) for a in u["refs"]]
        if "choice" in u:
            c = u["choice"]
            if c is None and not u.get("why"):
                bad.append(f"{u['id']} {u['name']}: keyGroup null needs a keyWhy")
            elif c is not None and c not in nums:
                bad.append(f"{u['id']} {u['name']}: keyGroup {c} is not a group of key {key['id']}")
            elif c is None:
                waiting.append(f"{u['id']} {u['name']}: {u['why']}")
            out[u["id"]] = c
        elif None not in gs and len(set(gs)) == 1:
            out[u["id"]] = gs[0]
        else:
            out[u["id"]] = None
            hit = sorted(set(gs) - {None})
            if u["game"]:
                lost = [tree[a]["name"] for a, g in zip(u["refs"], gs) if g is None]
                why = (f"two groups {', '.join(map(str, hit))}" if len(hit) > 1
                       else f"no group for {', '.join(lost)}" if hit else "no group")
                bad.append(f"{u['id']} {u['name']}: {why} in key {key['id']} (add its family to the key, or a keyGroup)")
        for sub in u.get("subs", []):
            sg = {of(a) for a in sub["refs"]}
            if out[u["id"]] is not None and sg != {out[u["id"]]}:
                bad.append(f"{sub['id']} {sub['name']}: group {sorted(sg, key=str)}, its entry {u['id']} {out[u['id']]}")
    if bad:
        sys.exit("identification groups (rule S3):\n  " + "\n  ".join(bad))
    return out, waiting


def family_id(name):
    """A book family's id: f: and its English name with only its letters (f:Damselfishes, f:MoorishIdol), so it passes
    every unit check of the sheet (letters, digits and ':' in Choices) as a genus's g:Chromis does."""
    return "f:" + "".join(c for c in name if c.isalpha())


def wink_photos(o):
    """The surprise cards' photos (Pierre, 2026-11-07: a wink never shows a bad photo, only 2 or 3 really beautiful ones):
    wink.photos on each teaching node with a wink, from tools/fish_wink_photos.json (the most beautiful first), so its
    family carries them too (add_families). A node the table names that has no wink stops the build."""
    tab = json.loads(WINKP.read_text(encoding="utf-8")).get("photos", {}) if WINKP.exists() else {}
    by = {t["id"]: t for t in o["teach"]}
    for tid in tab:
        if not (by.get(tid) or {}).get("wink"):
            sys.exit(f"tools/fish_wink_photos.json: {tid} is no wink of fish.json")
    for t in o["teach"]:
        if t.get("wink"):
            w = {k: v for k, v in t["wink"].items() if k != "photos"}
            if tab.get(t["id"]):
                w["photos"] = list(tab[t["id"]])
            t["wink"] = w


def add_families(o, key, declared=()):
    """The game's units above the species (Pierre, 2026-11-06 13:04: "the game's units are not the IMR entries: they are
    the families, the genera and the species"; 13:38: the IMR course is a tag on the families and genera it teaches, not
    a structure of its own; docs/reviews/2026-11-06-fish-units-plan.md).
    o["families"]: the families of the identification key in force, its labels inside its 20 groups (not always one
    taxonomic family: Lizardfishes = Synodontidae and Harpadontidae), named by the book's English label, the scientific
    names they cover as a subtitle (sci: the label's taxa that hold species of the game). Each game species (any circle,
    winks too) goes to the first label met walking up the WoRMS tree from it, so Amphiprion falls in the Damselfishes and
    Diploprion in the Soapfishes (the book wins over the IMR course for organisation); a species with no label (or a
    region with no key) goes to a family named after its teaching node, its WoRMS family as sci.
    A family: {id (family_id), name, sci, group, circle (its species' best), imr (the IMR course's tag: the IMR entry's
    name, on the family that holds most species of that entry, the first in order on a tie), imrWith (the IMR entry
    that teaches its species when another family carries it: the Soapfishes, taught with IMR's Groupers), sl, cues
    (IMR's, verbatim), look ([[family id, IMR's words]]), lsrc ({family id: where the pair comes from}, as data.json
    gen lsrc), phase, dimorph, juv, why, note, wink (the IMR entry's, or the teaching node's for circles 2-3), genera,
    species (in their teaching nodes' order: commonness)}.
    declared: fish_source.json "look", look-alike groups of families declared beyond the IMR course, each {src, key (the
    key whose family labels the ids name; applied only while that key is in force), groups [[family id, ...]], note
    {"a|b": words}} (Pierre, 2026-11-06: "Butterflyfishes and Angelfishes..."). Every pair of a
    group is a look-alike both ways; its source joins the IMR one in lsrc, or starts the pair (IMR words "") when IMR
    does not name it. They seed the traps and the confusion groups until pooled fish answers exist (rule L7).
    o["genera"]: every genus of a game species (the PDF name's first word, rule S2), {id g:<Genus>, name, family,
    circle, imr (the tag: the IMR sub-entry naming it, Anemonefish for Amphiprion; Surgeonfish names three genera), sl,
    cues (the sub-entry's), species}, in the families' order. Each game species gains family and genus (their ids).
"""
    wink_photos(o)
    labels = {}
    if key:
        for g in key["groups"]:
            for lab in g["labels"]:
                for name in lab[1]:
                    labels[name] = (g["n"], lab[0])
    ref = {int(a): n for a, n in o["ref"].items()}
    sp = {s["id"]: s for s in o["species"]}

    def walk(aid):
        a, fam = aid, None
        while a is not None and a in ref:
            n = ref[a]
            if n["name"] in labels:
                return labels[n["name"]], n["name"]
            if fam is None and n["rank"] == "Family":
                fam = n["name"]
            a = n["parent"]
        return None, fam

    fams, by_node, fam_of = {}, {}, {}
    for t in o["teach"]:
        for sid in t["species"]:
            s = sp[sid]
            if "circle" not in s:
                continue
            lab, taxon = walk(s["ref"])
            if lab:
                fid, name, grp = family_id(lab[1]), lab[1], lab[0]
            else:
                fid, name, grp = family_id(t["name"]), t["name"], t.get("group")
            f = fams.setdefault(fid, {"id": fid, "name": name, "sci": [], "group": grp, "circle": s["circle"], "nodes": {}, "species": []})
            if taxon and taxon not in f["sci"]:
                f["sci"].append(taxon)
            f["circle"] = min(f["circle"], s["circle"])
            f["nodes"][t["id"]] = f["nodes"].get(t["id"], 0) + 1
            f["species"].append(sid)
            fam_of[sid] = fid
            by_node.setdefault(t["id"], [])
            if fid not in by_node[t["id"]]:
                by_node[t["id"]].append(fid)
    carry, carried = {}, {}
    for nid, fl in by_node.items():
        best = max(fl, key=lambda fid: (fams[fid]["nodes"][nid], -fl.index(fid)))
        if best not in carry:
            carry[best], carried[nid] = nid, best
    node = {t["id"]: t for t in o["teach"]}
    subs = {}
    for t in o["teach"]:
        for u in t.get("sub", []):
            for sid in u["species"]:
                subs.setdefault(sp[sid]["name"].split()[0], u)
    gens = {}
    for f in fams.values():
        for sid in f["species"]:
            s = sp[sid]
            g = s["name"].split()[0]
            x = gens.setdefault(g, {"id": "g:" + g, "name": g, "family": f["id"], "circle": s["circle"], "species": []})
            x["circle"] = min(x["circle"], s["circle"])
            x["species"].append(sid)
            s["family"], s["genus"] = f["id"], x["id"]
    out = []
    for f in fams.values():
        r = {"id": f["id"], "name": f["name"], "sci": f["sci"]}
        if f["group"] is not None:
            r["group"] = f["group"]
        r["circle"] = f["circle"]
        t = node.get(carry.get(f["id"]))
        if t and t.get("src") == "imr":
            r["imr"] = t["name"]
        elif not t:
            w = [node[n]["name"] for n in f["nodes"] if node[n].get("src") == "imr"]
            if w:
                r["imrWith"] = w[0]
        if t:
            for k in ("sl", "cues"):
                if t.get(k):
                    r[k] = t[k]
            look = [[carried[i[:3]], txt] for i, txt in t.get("look", []) if carried.get(i[:3])]
            if look:
                r["look"] = look
                imr = "IMR fish presentation" + (", slide " + ", ".join(map(str, t["sl"])) if t.get("sl") else "")
                r["lsrc"] = {b: imr for b, _ in look}
            for k in ("phase", "dimorph", "juv", "why", "note", "wink"):
                if t.get(k):
                    r[k] = t[k]
        r["genera"] = list(dict.fromkeys(sp[sid]["genus"] for sid in f["species"]))
        r["species"] = f["species"]
        out.append(r)
    by = {r["id"]: r for r in out}
    for d in declared:
        if d.get("key") != (key["id"] if key else None):
            continue  # family ids of another key (or none): data only, as a key for another region
        for grp in d["groups"]:
            for a in grp:
                if a not in by:
                    sys.exit(f"tools/fish_source.json look: {a} is not a family of fish.json")
            for a in grp:
                r = by[a]
                for b in grp:
                    if b == a:
                        continue
                    note = (d.get("note") or {}).get(f"{a}|{b}") or (d.get("note") or {}).get(f"{b}|{a}")
                    src = d["src"] + (f" ({note})" if note else "")
                    look, ls = r.setdefault("look", []), r.setdefault("lsrc", {})
                    if b not in [x[0] for x in look]:
                        look.append([b, ""])
                    ls[b] = ls[b] + " and " + src if ls.get(b) else src
    # The keys in the order the families have always had them (look and lsrc together).
    for i, r in enumerate(out):
        if "lsrc" in r:
            ls = r.pop("lsrc")
            out[i] = {k2: v for k, v in r.items() for k2, v in ([(k, v), ("lsrc", ls)] if k == "look" else [(k, v)])}
    # The family sheets' own lines (tools/fish_sheets.json: marks, life, apart and their sources, msrc): the families it
    # names that are families of fish.json (another key's families are left aside; tests/fishsheets.test.js checks the
    # file against fish.json); apart only for families of fish.json.
    sheets = json.loads(SHEETS.read_text(encoding="utf-8")).get("families", {}) if SHEETS.exists() else {}
    for r in out:
        x = sheets.get(r["id"])
        if not x:
            continue
        for k in ("marks", "life"):
            if x.get(k):
                r[k] = x[k]
        ap = {b: t for b, t in (x.get("apart") or {}).items() if b in by}
        if ap:
            r["apart"] = ap
        if x.get("src"):
            r["msrc"] = x["src"]
    # The species' size and depth (tools/fish_facts.json, tools/fish_facts.py: Reef Life Survey, else FishBase; Pierre,
    # Q6): size {len (cm), lt (the length type when not total length), src}, depth {m [shallow, deep], src}, src
    # {t, u} naming the page each value comes from.
    facts = json.loads(FACTS.read_text(encoding="utf-8")) if FACTS.exists() else {}
    def fsrc(x, k):
        if x.get(k) == "rls":
            return {"t": "Reef Life Survey", "u": "https://reeflifesurvey.com/species/" + x["rls"] + "/"}
        return {"t": "FishBase", "u": f"https://www.fishbase.se/summary/{x['fb']}"}
    for s in o["species"]:
        s.pop("size", None)
        s.pop("depth", None)
        x = facts.get(s["id"])
        if not x or "family" not in s:
            continue
        if x.get("len") is not None:
            s["size"] = {"len": x["len"], **({"lt": x["lt"]} if x.get("lt") else {}), "src": fsrc(x, "lsrc")}
        if x.get("dep"):
            s["depth"] = {"m": x["dep"], "src": fsrc(x, "dsrc")}
    # The species' curated common names (tools/fish_common.json, tools/fish_common.py; Pierre, 2026-11-04: 1 to 3 per
    # species, never more; published as selected, Pierre, 2026-11-08, Q313): cn, one list per name, the name shown first
    # (the most shared first), then its other spellings, accepted when typed (Pearl-scaled / Pearlscale angelfish; a PDF
    # slip's own form). A game species no reference names has none (Q247). Every source stays in tools/fish_common.json.
    cnames = json.loads(CNAMES.read_text(encoding="utf-8")).get("species", {}) if CNAMES.exists() else {}
    for s in o["species"]:
        s.pop("cn", None)
        L = (cnames.get(s["id"]) or {}).get("names") or []
        if len(L) > 3:
            sys.exit(f"tools/fish_common.json {s['id']}: {len(L)} names, at most 3")
        if L and s.get("circle"):
            s["cn"] = [[n["name"], *n.get("alt", [])] for n in L]
    o["families"] = out
    # The genus common names (tools/fish_genus_names.json; Pierre, 2026-11-07: "some genera have common names. They
    # should be present somewhere"): common (the name) and csrc (its source, in words), checked against the data.
    gnames = dict(json.loads(GNAMES.read_text(encoding="utf-8")).get("genera", {})) if GNAMES.exists() else {}
    go = []
    for g, x in gens.items():
        r = {"id": x["id"], "name": g, "family": x["family"], "circle": x["circle"]}
        u = subs.get(g)
        if u:
            r["imr"] = u["name"]
            for k in ("sl", "cues"):
                if u.get(k):
                    r[k] = u[k]
        gn = gnames.pop(x["id"], None)
        if gn:
            r["common"], r["csrc"] = gn["common"], genus_csrc(x["id"], gn, r, u, [sp[i] for i in x["species"]], sp, fams[x["family"]])
        r["species"] = x["species"]
        go.append(r)
    if gnames:
        sys.exit(f"tools/fish_genus_names.json: not genera of fish.json: {', '.join(gnames)}")
    o["genera"] = go
    # The name index's kind words (tools/fish_names.py; Pierre, 2026-11-09, Q319, Q320): the head words of the species'
    # names shown and the families whose species carry them, fish.json vn.
    fish_names.apply(o, {"keys": [key] if key else []})
    return o


def genus_csrc(gid, gn, r, u, mine, sp, fam):
    """The source of a genus common name (tools/fish_genus_names.json), in words, once checked: from imr, the IMR
    sub-entry naming this genus alone (Anemonefish for Amphiprion; not Surgeonfish, which names three genera); from
    species, every species of the genus here (2 or more) has a common name ending in word, and no species of another genus
    of its family has one. The build stops otherwise: the name is never kept on a guess (rule C2)."""
    def norm(t):
        return "".join(c for c in (t or "").lower() if c.isalpha())

    def ends(name, word):  # whole words; "ghostpipefish" ends in "ghost pipefish", "disappearing wrasse" not in "ring wrasse"
        n = " " + " ".join("".join(c if c.isalpha() else " " for c in (name or "").lower()).split())
        return n.endswith(" " + word) or n.endswith(" " + word.replace(" ", ""))
    if gn["from"] == "imr":
        if not u or not norm(gn["common"]).startswith(norm(u["name"])) or any(sp[i]["genus"] != gid for i in u["species"]):
            sys.exit(f"tools/fish_genus_names.json {gid}: no IMR sub-entry {gn['common']} for it")
        sl = u.get("sl") or []
        return "IMR fish presentation" + (f", slide{'s' if len(sl) > 1 else ''} " + ", ".join(map(str, sl)) if sl else "") + f" ({u['name']})"
    if gn["from"] == "species":
        w = gn["word"]
        bad = [s["name"] for s in mine if not ends(s.get("common"), w)]
        oth = [sp[i]["name"] for i in fam["species"] if sp[i]["genus"] != gid and ends(sp[i].get("common"), w)]
        if len(mine) < 2 or bad or oth:
            sys.exit(f"tools/fish_genus_names.json {gid}: '{gn['word']}' is not its species' own ({bad or oth or 'one species'})")
        return f"Inferred from its species' common names (IMR reference list, FishBase): {'both' if len(mine) == 2 else f'all {len(mine)}'} here end in “{gn['word']}”"
    sys.exit(f"tools/fish_genus_names.json {gid}: from {gn['from']}?")


def regroup(src_path, check):
    """--regroup: the key in force applied again to fish.json as it is, from its own reference tree (no network).
    --check: write nothing, fail when fish.json differs (tests/fish.test.js runs it)."""
    src = json.loads(src_path.read_text(encoding="utf-8"))
    o = json.loads(OUT.read_text(encoding="utf-8"))
    key = key_in_force(src)
    tree = {int(a): {"name": n["name"], "parent": n["parent"]} for a, n in o["ref"].items()}
    by = {t["id"]: t for t in src["teach"]}
    kid = key["id"] if key else None
    units = [unit(t["ref"], [(u["id"], u["name"], u["ref"]) for u in t.get("sub", [])], by[t["id"]], not t.get("wink"), kid)
             for t in o["teach"]]
    groups, waiting = key_groups(key, units, tree)
    teach = []
    for t in o["teach"]:
        t = {k: v for k, v in t.items() if k != "group"}
        put_group(t, groups.get(t["id"]))
        teach.append(t)
    o["teach"], o["key"] = teach, key_out(key)
    o.pop("groups", None)
    add_families(o, key, src.get("look", []))
    if check:
        if render(o) != OUT.read_text(encoding="utf-8"):
            kid = key["id"] if key else "(none)"
            sys.exit(f"{OUT.relative_to(ROOT)} is not as key {kid} gives it: run python3 tools/build_fish.py --regroup")
        print("fish.json groups: as the key gives them")
        return
    write(o)
    print(f"regrouped {OUT.relative_to(ROOT)} with key {key['id'] if key else '(none)'}")
    for w in waiting:
        print("  waiting on Pierre: " + w)


def commonness(check):
    """--commonness: the commonness index (species cmi) and the order of every teaching node's species re-applied to
    fish.json as it is (offline). --check: write nothing, fail when fish.json differs (tests/fish.test.js runs it)."""
    o = json.loads(OUT.read_text(encoding="utf-8"))
    missing = fish_commonness.apply(o)
    src = json.loads(SRC.read_text(encoding="utf-8"))
    add_families(o, key_in_force(src), src.get("look", []))
    if check:
        if render(o) != OUT.read_text(encoding="utf-8"):
            sys.exit(f"{OUT.relative_to(ROOT)} is not as the commonness index gives it: run python3 tools/build_fish.py --commonness")
        print("fish.json species order: as the commonness index gives it")
        return
    write(o)
    print(f"applied the commonness index to {OUT.relative_to(ROOT)}")
    show_missing(missing)


def show_missing(missing):
    if missing:
        print(f"species with no iNaturalist counts for the commonness index (run python3 tools/fish_commonness.py --fetch): {len(missing)}")
        for x in missing:
            print("  " + x)


def unit(refs, subs, s, game, kid):
    """A teaching node as key_groups reads it (refs: AphiaIDs; s: its source node, whose keyGroup for key kid is the
    explicit choice)."""
    u = {"id": s["id"], "name": s["name"], "refs": refs, "game": game,
         "subs": [{"id": i, "name": n, "refs": r} for i, n, r in subs]}
    kg = s.get("keyGroup") or {}
    if kid in kg:
        u["choice"], u["why"] = kg[kid], s.get("keyWhy", "")
    return u


def put_group(o, g):
    """Insert `group` right after fam / wfam (the record's layout), when the node has one."""
    if g is None:
        return
    items = list(o.items())
    at = next((i + 1 for i, (k, _) in reversed(list(enumerate(items))) if k in ("fam", "wfam")), len(items))
    items.insert(at, ("group", g))
    o.clear()
    o.update(items)


def dumps(o):
    return json.dumps(o, ensure_ascii=False, separators=(",", ":"))


def main():
    global NET
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--offline", action="store_true")
    ap.add_argument("--refresh", action="store_true")
    ap.add_argument("--dry", action="store_true")
    ap.add_argument("--near", action="store_true", help="only (re)compute present.near on the existing fish.json")
    ap.add_argument("--regroup", action="store_true")
    ap.add_argument("--commonness", action="store_true", help="only re-apply the commonness index and order to fish.json")
    ap.add_argument("--check", action="store_true", help="with --regroup / --commonness: fail when fish.json differs")
    ap.add_argument("--src", help=argparse.SUPPRESS)  # tests: another source file
    a = ap.parse_args()
    if a.regroup:
        regroup(Path(a.src) if a.src else SRC, a.check)
        return
    if a.commonness:
        commonness(a.check)
        return
    NET = Net(a.offline, a.refresh)
    if a.near:
        try:
            o, changed, left = update_near()
        finally:
            NET.save()
        print(f"species whose 'confirmed near Dauin' changed: {len(changed)}")
        for x in changed:
            print("  " + x)
        print(f"taken out of the game (not confirmed near Dauin, or in the Philippines): {len(left)}")
        for x in left:
            print("  " + x)
        show_missing(fish_commonness.apply(o))
        src = json.loads(SRC.read_text(encoding="utf-8"))
        add_families(o, key_in_force(src), src.get("look", []))
        if not a.dry:
            write(o)
            print(f"wrote {OUT.relative_to(ROOT)}")
        return
    src = json.loads(SRC.read_text(encoding="utf-8"))
    report = {"waiting": [], "refnames": [], "renamed": [], "typo": [], "lumped": [], "empty": [], "pierre": [], "out": [], "drop": [], "mismatch": [], "noinat": [], "pdf": [], "unplaced": []}
    try:
        out = build(src, report)
    finally:
        NET.save()
    show_missing(fish_commonness.apply(out))
    add_families(out, key_in_force(src), src.get("look", []))
    show(out, report)
    if not a.dry:
        write(out)
        print(f"wrote {OUT.relative_to(ROOT)}")


def build(src, report):
    tree = {}  # AphiaID -> {name, rank, parent}

    def add_chain(aid):
        chain = classification(aid)
        parent = None
        for cid, name, rank in chain:
            tree.setdefault(cid, {"name": name, "rank": rank, "parent": parent})
            parent = cid
        return [c[0] for c in chain][::-1]  # the taxon first, then its ancestors

    # Teaching nodes: refs resolved to accepted AphiaIDs, each with its classification.
    nodes = []
    for t in src["teach"]:
        for u in [t, *t.get("sub", [])]:
            u["_ref"] = [resolve_ref(x, report) for x in u["ref"]]
            u["_not"] = [resolve_ref(x, report) for x in u.get("not", [])]
            for aid in u["_ref"] + u["_not"]:
                add_chain(aid)
        nodes.append(t)
    # The key in force: every label names a WoRMS accepted taxon, as written (a key is matched by name on the tree).
    key = key_in_force(src)
    for g in (key or {}).get("groups", []):
        for lab in g["labels"]:
            for name in lab[1]:
                rec, how = worms_name(name)
                if not rec or how != "exact" or accepted(rec)["scientificname"] != name:
                    sys.exit(f"key {key['id']} group {g['n']} {lab[0]}: {name} is not a WoRMS accepted name ({how})")

    def place(anc, cands):
        best = None
        for t in cands:
            if any(x in t["_not"] for x in anc):
                continue
            hit = [i for i, x in enumerate(anc) if x in t["_ref"]]
            if hit and (best is None or hit[0] < best[0]):
                best = (hit[0], t)
            elif hit and hit[0] == best[0]:
                sys.exit(f"two teaching nodes hold the same reference node: {best[1]['id']} {t['id']}")
        return best[1] if best else None

    # Species. The name shown and expected is the PDF's (EventMeasure's: a fixed pick list that may lag WoRMS, Pierre,
    # 2026-11-03); the WoRMS accepted name goes beside it (`now`), and either is accepted when typed.
    genus_chain = {}

    def pdf_genus(g, worms_genus):
        """The chain of the genus the source name uses, when WoRMS has moved the species out of it (Chromis agilis is
        Pycnochromis agilis in WoRMS: the teaching tree still files it under Chromis). None when it is the same genus."""
        if g == worms_genus:
            return None
        if g not in genus_chain:
            rec, how = worms_name(g)
            ok = rec and how == "exact" and accepted(rec)["rank"] == "Genus"
            genus_chain[g] = add_chain(accepted(rec)["AphiaID"]) if ok else None
        return genus_chain[g]

    species, seen = [], {}
    for i, s in enumerate(src["species"]):
        written = s.get("as") or s["name"]
        rec, how = worms_name(written)
        if not rec:
            report["typo"].append(f"{s['id']} {s['name']}: NOT IN WoRMS ({how})")
            report["drop"].append({"name": s["name"], "why": "not in WoRMS"})
            continue
        acc = accepted(rec)
        now = acc["scientificname"]
        check = [s["check"]] if s.get("check") else []
        if how == "fuzzy" or s.get("as"):  # a spelling WoRMS does not know: likely a slip, to check against EventMeasure
            check.append(f"spelling as in the PDF; WoRMS has {now}")
            report["typo"].append(f"{s['id']} {s['name']}: WoRMS has {now} (fuzzy match {rec['scientificname']})")
        elif now != s["name"]:
            why = f"{rec['status']}{', ' + rec['unacceptreason'] if rec.get('unacceptreason') else ''}"
            report["renamed"].append(f"{s['id']} {s['name']}: now {now} in WoRMS ({why})")
        if s.get("check"):
            report["typo"].append(f"{s['id']} {s['name']}: {s['check']}")
        aid = acc["AphiaID"]
        if aid in seen:  # two PDF species, one WoRMS species: both kept, each under its PDF name (Pierre, 2026-11-03)
            report["lumped"].append(f"{s['id']} {s['name']} and {seen[aid]['s']['id']} {seen[aid]['s']['name']}: one WoRMS species, {now}")
        anc = add_chain(aid)
        gc = pdf_genus(s["name"].split()[0], tree[anc[1]]["name"] if tree[anc[1]]["rank"] == "Genus" else None)
        place_anc = [aid, *gc] if gc else anc
        t = place(place_anc, nodes)
        if not t and s.get("src") in ("dauin", "wink"):  # picked for a teaching node that does not hold it in WoRMS
            report["unplaced"].append(f"{s['id']} {s['name']} ({tree[anc[1]]['name']}...): left out")
            continue
        sub = place(place_anc, t.get("sub", [])) if t else None
        if t and s.get("sec") and s["sec"] not in t.get("pdf", []):
            report["pdf"].append(f"{s['id']} {s['name']}: PDF section {s['sec']} but teaching node {t['id']} {t['name']}")
        x = {"i": i, "s": s, "aid": aid, "now": now, "t": t, "sub": sub, "check": check, "out": []}
        if not t:  # a PDF species whose family is in no circle: kept for the Fish ID Key, out of the game
            x["out"].append("family in no circle")
        seen.setdefault(aid, x)
        species.append(x)

    # iNaturalist: taxon ids for every reference node, then for each species under its PDF name (iNaturalist may keep
    # the name EventMeasure uses), presence counts for species.
    syn = {aid: sorted(synonyms(aid) - {n["name"]}) for aid, n in tree.items()}
    for aid in sorted(tree):
        n = tree[aid]
        alt = syn[aid][:8] if n["rank"] == "Species" else []
        tid, iname = inat_taxon(n["name"], n["rank"], alt)
        n["inat"] = tid
        if tid is None:
            report["noinat"].append(f"{aid} {n['name']} ({n['rank']})")
        elif iname != n["name"]:
            n["iname"] = iname
            if n["rank"] != "Species":  # species are reported below, against their PDF name too
                report["mismatch"].append(f"{n['name']} ({n['rank']}): iNaturalist {iname}")
    for x in species:
        s, node = x["s"], tree[x["aid"]]
        tid, iname = inat_taxon(s["name"], "Species") if s["name"] != node["name"] else (None, None)
        if tid is None:
            tid, iname = node["inat"], node.get("iname") or node["name"]
            if tid and iname != node["name"]:
                node["iname"] = iname
        if tid and iname not in (s["name"], node["name"]):
            report["mismatch"].append(f"{s['name']} (WoRMS {node['name']}): iNaturalist {iname}")
        x["inat"] = tid
        if tid:
            x["_pres"] = (tid, bool(s.get("pdf")), [s["name"], x["now"], tree[x["aid"]]["name"], iname, *syn.get(x["aid"], [])])
    presence_prefetch([x["_pres"] for x in species if x["inat"]])  # every species' counts together (rule C7)
    for x in species:
        s = x["s"]
        tid = x["inat"]
        if tid:
            x["present"] = presence(*x.pop("_pres"))
        else:
            imr = ["imr"] if s.get("pdf") else []
            # Not on iNaturalist: only the IMR list can confirm it (near Dauin, so in the Philippines).
            x["present"] = {"dauin": 0, "dauinNI": 0, "dauinU": 0, "near": bool(imr), "nearBy": imr, "rg": 0, "chk": False,
                            "ph": bool(imr), "phBy": ["near"] if imr else []}
        # Off the IMR list or in circle 3: only once confirmed near Dauin (Pierre, 2026-11-03), by the same rule (near_dauin).
        c3 = needs_near(s.get("src"), (x["t"] or {}).get("circle", 1))
        if c3 and not x["out"] and x["present"]["ph"] and not x["present"]["near"]:
            x["out"].append(NEAR_OUT)
        if x["present"].get("own") and not x["present"]["ph"]:
            report["pierre"].append(f"{s['id']} {s['name']}: Pierre has {x['present']['own']} observation(s), not confirmed")
        if not x["present"]["ph"]:  # kept for the Fish ID Key (every PDF species), out of the game
            x["out"].append("not confirmed in the Philippines")
            report["drop"].append({"name": s["name"], "why": x["out"][-1]})
        if x["out"]:
            report["out"].append(f"{s['id']} {s['name']}: {'; '.join(x['out'])}")
    kept = [x for x in species if not x["out"]]  # in the game

    # Rank order: cheatsheet first, then source order.
    species.sort(key=lambda x: (0, x["s"]["cs"]) if x["s"].get("cs") else (1, x["i"]))
    out_sp = []
    for r, x in enumerate(species, 1):
        s = x["s"]
        o = {"id": s["id"], "name": s["name"]}
        if x["now"] != s["name"]:
            o["now"] = x["now"]
        o.update({"common": s.get("common", ""), "ref": x["aid"], "inat": x["inat"]})
        if not x["out"]:
            # Its family's circle, whatever its source (Pierre, 2026-11-08, Q214: "the circle holds families, so every
            # species of the family"); until then a dauin or wink species was always circle 3.
            o["circle"] = x["t"].get("circle", 1)
        else:
            o["out"] = "; ".join(x["out"])
        o["r"] = r
        o["present"] = x["present"]
        if s.get("src"):
            o["src"] = s["src"]
        for k in ("sec", "pdf", "cs", "sl"):
            if s.get(k):
                o[k] = s[k]
        if x["check"]:
            o["check"] = "; ".join(x["check"])
        out_sp.append(o)
        x["r"] = r

    def fams(u):
        """WoRMS families holding the node's reference nodes (or the reference node itself when it is a family)."""
        f = set()
        for aid in u["_ref"]:
            a = aid
            while a is not None and tree[a]["rank"] != "Family":
                a = tree[a]["parent"]
            if a is not None:
                f.add(tree[a]["name"])
        return sorted(f)

    def teach_out(u, members, top):
        o = {"id": u["id"], "name": u["name"]}
        if top:
            o["fam"] = u.get("fam")
            wf = fams(u)
            if u.get("fam") and wf != [u["fam"]]:
                o["wfam"] = wf
            o["level"] = 1
            o["circle"] = u.get("circle", 1)
            o["src"] = u.get("src", "imr")
            if u.get("wink"):
                o["wink"] = u["wink"]
            if u.get("sign") is False:
                o["sign"] = False
        o["ref"] = u["_ref"]
        if u["_not"]:
            o["not"] = u["_not"]
        o["species"] = [x["s"]["id"] for x in sorted(members, key=lambda x: x["r"])]
        for k in ("aka", "often", "sl", "cues", "look", "phase", "dimorph", "juv", "why", "note"):
            if u.get(k):
                o[k] = u[k]
        return o

    out_t = []
    for t in nodes:
        mem = [x for x in kept if x["t"] is t]
        o = teach_out(t, mem, True)
        if t.get("sub"):
            o["sub"] = [teach_out(u, [x for x in mem if x["sub"] is u], False) for u in t["sub"]]
        if not mem and o["circle"] != 1:  # all its species dropped: left out until one is confirmed (id kept)
            report["empty"].append(f"{t['id']} {t['name']}")
            continue
        out_t.append(o)

    need = set()  # ancestors of the kept species and of the teaching nodes' references (all species, in the game or not)
    for a in [x["aid"] for x in species] + [a for t in nodes for u in [t, *t.get("sub", [])] for a in u["_ref"] + u["_not"]]:
        while a is not None and a not in need:
            need.add(a)
            a = tree[a]["parent"]
    ref = {}
    for aid in sorted(need):
        n = tree[aid]
        o = {"name": n["name"], "rank": n["rank"], "parent": n["parent"]}
        if syn[aid]:
            o["syn"] = syn[aid]
        o["inat"] = n["inat"]
        if n.get("iname"):
            o["iname"] = n["iname"]
        ref[aid] = o
    # Identification groups under the key in force (rule S3): every node in the game has one, or the build stops.
    kept_ids = {o["id"] for o in out_t}
    units = [unit(t["_ref"], [(u["id"], u["name"], u["_ref"]) for u in t.get("sub", [])], t, not t.get("wink"), key["id"] if key else None)
             for t in nodes if t["id"] in kept_ids]
    groups, report["waiting"] = key_groups(key, units, tree)
    for o in out_t:
        put_group(o, groups.get(o["id"]))
    # start: the starter core (fish_source.json _doc), circle-1 entries met first; checked to be kept entries.
    start = [t for t in src.get("start", []) if any(o["id"] == t and o["circle"] == 1 for o in out_t)]
    return {"v": V, "start": start, "key": key_out(key), "teach": out_t, "species": out_sp, "ref": ref}


def write(o):
    OUT.write_text(render(o), encoding="utf-8")


def render(o):
    lines = ["{", f'"v":{o["v"]},', f'"start":{dumps(o.get("start", []))},']
    if o.get("key"):  # the key in force, one group per line
        k = o["key"]
        lines.append('"key":' + dumps({x: k[x] for x in k if x != "groups"})[:-1] + ',"groups":[')
        lines.append(",\n".join(dumps(g) for g in k["groups"]))
        lines.append("]},")
    for k in ("teach", "families", "genera", "species"):
        if k not in o:
            continue
        lines.append(f'"{k}":[')
        lines.append(",\n".join(dumps(x) for x in o[k]))
        lines.append("],")
    if "vn" in o:  # the name index's kind words (tools/fish_names.py), one word per line
        lines.append('"vn":[')
        lines.append(",\n".join(dumps(x) for x in o["vn"]))
        lines.append("],")
    lines.append('"ref":{')
    lines.append(",\n".join(f'"{aid}":{dumps(n)}' for aid, n in o["ref"].items()))
    lines.append("}")
    lines.append("}")
    return "\n".join(lines) + "\n"


def show(o, rep):
    sp = o["species"]
    game = [s for s in sp if "out" not in s]
    print(f"teaching nodes: {len(o['teach'])} ({sum(1 for t in o['teach'] if t['circle'] == 1)} in circle 1), "
          f"reference nodes: {len(o['ref'])}, species: {len(sp)} ({len(game)} in the game, {len(sp) - len(game)} out)")
    for c in (1, 2, 3):
        cs = [s for s in game if s["circle"] == c]
        print(f"  circle {c}: {sum(1 for t in o['teach'] if t['circle'] == c)} teaching nodes, {len(cs)} species, "
              f"{sum(1 for s in cs if s['present'].get('near'))} confirmed near Dauin, "
              f"{sum(1 for s in cs if not s['present'].get('near') and (s['present']['dauin'] or s['present']['dauinNI']))} more seen there, not confirmed")
    for k, title in (("waiting", "teaching nodes in the game waiting for an identification group (keyGroup null)"),
                     ("refnames", "teaching refs resolved to another accepted name"),
                     ("renamed", "PDF names WoRMS has since changed (PDF name kept, WoRMS name in `now`)"),
                     ("typo", "likely slips in the PDF, to check against EventMeasure (PDF text kept)"),
                     ("lumped", "PDF species WoRMS treats as one (both kept)"),
                     ("pdf", "PDF section vs teaching node"), ("unplaced", "Dauin species in no teaching node"),
                     ("empty", "teaching nodes left out: no species in the game"),
                     ("pierre", "species Pierre observed, not confirmed (his observations confirm nothing alone)"),
                     ("out", "species out of the game (kept for the Fish ID Key)"),
                     ("mismatch", "WoRMS / iNaturalist name mismatches"), ("noinat", "reference nodes not on iNaturalist")):
        print(f"{title}: {len(rep[k])}")
        for x in rep[k]:
            print("  " + x)


if __name__ == "__main__":
    main()
