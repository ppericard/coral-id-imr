#!/usr/bin/env python3
"""Refreshes tools/taxonomy.json, the build-time reference of names: for each genus the app touches, the name each
authority accepts now (WoRMS, iNaturalist), the former genus names, the species rows that pay, and a watch list.

Decided with Pierre, 2026-11-05 (Q49, from docs/reviews/2026-11-05-coral-taxonomy-study.md section 5, its small form):
- **Build time only**: the app never loads it (Pierre: "it must not weigh on the app"). Tools read it, through the
  readers at the end of this file (second PR, docs/ROADMAP.md "Taxonomy reference"): tools/fetch_local.py,
  tools/cand_gaps.py and tools/coral_presence.py search the iNaturalist taxon it gives a genus (`inat_taxon`: no name
  search, no homonym guard), and tools/presence.py matches checklist names through its species rows (`aliases`). The
  admin never loads it either: it reads data/names.json, the small extract this tool writes beside it (`names_extract`), to
  flag a photo or candidate whose name is a former combination, a moved genus or an iNaturalist spelling WoRMS writes
  otherwise (presence.js nameFlag).
- **It never changes the IMR wording** (rule C1): `app` is copied verbatim from data.json (the family the app
  shows, the IMR lecture's own "formerly..." lines), and a difference from WoRMS is reported, never applied.
- **Watch list** (Q51): the items of taxonomy.json `watch` are reported when WoRMS or iNaturalist moves on them; that
  never changes the app either (rule C1: the app follows IMR's wording).

The file, one section per subject (core.js SUBJECTS ids, through SUBJECTS below, with no subject named in the engine).
A subject whose unit is the genus (the corals) has this section:
  {"v", "doc", "refs": {key: citation}, "<subject>": {
     "refreshed": {"worms", "inat", "checklist"}: the dates of the data (the last network fetch of each source),
     "gen": {genus: {role, app: {fam, imr?}, worms: {id, st, now?, fam, mod, spp}, inat: {id, now?, fam, act?, miss?,
             extra?}, flags?}}, one genus per line: every genus of data.json (gen and x.gen), role = slate | benthic |
             bonus | key (tools/genera.py);
     "old": {former genus name: {worms: {id, st, now, mod}, inat: {id, act, now?}, into?: {app genus: species}}}: the
             hand-listed former genera plus WoRMS's genus synonyms of the app genera still met (an inactive
             iNaturalist taxon, a checklist or photo genus); a name once listed stays;
     "spp": {species name: {now, id, src, iname?, inat?, by?}}: a species row only where it pays: a WoRMS move into an
             app genus whose old name iNaturalist knows (src worms), a checklist name (Corals of the World, src cotw) or a
             photo name (served, or a candidate: src photo) that WoRMS writes differently;
             iname = iNaturalist's spelling when it differs, inat: false when iNaturalist has no active taxon for it,
             by: "checklist" when the mapping is a decision of tools/presence_checklists.json (`decided`), not WoRMS's;
     "watch": [{id, what, ref, names, genera, seen}]: hand-written but `seen` (what the sources say now, per name);
     "log": [{date, what}]: one line per change found by a refresh, dated with the data}}
A subject whose unit is the species (the fish: ROADMAP "Taxonomy reference" step (d); build_species) has the same
section with a `species` part beside `gen`, from its own file (fish.json: tools/build_fish.py names each species' WoRMS
AphiaID and iNaturalist taxon): "species": {name: {app: {id}, worms: {id, st, now?, acc?, exact?}, inat: {id, name?,
act?, now?}, flags?}} for every species of the file, in the game or out; `gen` without the WoRMS species lists; `spp`
rows only for the names met that resolve to one of its species (its own names, src app; the photo names, src photo;
the checklist's, src checklist); `old` the genera of those names WoRMS no longer accepts; no watch list yet. Its
WoRMS synonyms stay in the file's own `ref` (syn). Every species flag says what differs (rule C1: reported, never
applied, never a change of a game name: rule C5): "WoRMS: <status> -> <name> (spelling | genus | species)", "WoRMS: no
record of this spelling", "iNaturalist: <name> (... of WoRMS <name>)", "iNaturalist: inactive taxon", "stale: the file
has <name> (<AphiaID>), WoRMS now ...". `python3 tools/taxonomy.py --subject fish` refreshes that section only.
Hand-kept (the tool reads them and never rewrites them): `refs`, `watch` (but `seen`) and the names in `old`. All the
rest is written by the refresh.

Network: WoRMS REST (batched AphiaRecordsByNames, 50 names a call; children and synonyms by AphiaID, 50 a page) and the
iNaturalist API v1 (the genera and species of the subject's root taxa in bulk, 500 a page; the other taxa by name, with
an ancestor guard against homonyms; details 30 ids a call), sequential, about one request per second for iNaturalist and
0.3 s for WoRMS, a User-Agent naming the app, retries on 429 / 5xx after a pause (Retry-After when given; rule
C7). Every reply is cached in tools/.cache/taxonomy.json (git-ignored): a rerun is offline and writes the same file;
--refresh asks again; --offline fails instead of asking.

data/names.json (the admin's extract, written with the file, never edited by hand): {"v", "doc", "<subject>": {"date",
  "sp": {species name: {now, iname?, inat?}}: the species rows; "gen": {former genus: the genus WoRMS (else iNaturalist)
  accepts now}: the `old` names that are no longer a genus of their own; "worms": {app genus: {id, fam}}: each genus's
  WoRMS AphiaID and the family WoRMS files it under (gen.<genus>.worms), for the WoRMS view of the admin's Photos › Tree
  (admin-coraltree.js ctWormsOf; not for a subject whose Tree reads its own file: SUBJECTS names_worms)}}. The admin
  reads every subject's section (admin.js nameTag: the coral photos, the fish tiles and the fish Candidates card).

Usage: python3 tools/taxonomy.py [--offline | --refresh] [--dry] [--subject S...]   (--dry: print the report, leave the
       files as they are; --subject: refresh only that section, the others kept as they are)
       python3 tools/taxonomy.py --names   (offline: write data/names.json again from taxonomy.json)
       python3 tools/taxonomy.py --check   (offline, no cache needed: the layout, data/names.json in step, and every genus
       and its `app` and `role` as data.json and core.js say now; tests/taxonomy.test.js runs it)
"""
import argparse
import json
import re
import signal
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
import genera  # noqa: E402  (the game genera, defined once in core.js)
import inat  # noqa: E402  (the one paced, retried client, rule C7: WoRMS 0.3 s, iNaturalist 1 s between requests)
from datajson import load_all  # noqa: E402  (data.json with the candidates of data/cand.json)

OUT = ROOT / "tools" / "taxonomy.json"
NAMES = ROOT / "data/names.json"  # the admin's extract (names_extract)
CACHE = ROOT / "tools" / ".cache" / "taxonomy.json"
CHECKLISTS = ROOT / "tools" / "presence_checklists.json"
V = 1
WORMS = "https://www.marinespecies.org/rest/"
INAT = "https://api.inaturalist.org/v1/"
BATCH_WORMS, BATCH_INAT, PAGE_INAT = 50, 30, 500
IMR_SAYS = re.compile(r"\bformerly\b|\bnow includes?\b", re.I)  # the IMR lecture's own lines about former names


def coral_inputs():
    """The coral subject's inputs: its genera (data.json gen + x.gen, role from core.js through tools/genera.py, `app`
    verbatim), the photo names (data.json views and more, and every candidate, approved or waiting in data/cand.json: the
    admin flags a candidate's name too, data/names.json), the checklist (Corals of the World's Philippine list)."""
    d = load_all(str(ROOT / "data.json"), str(ROOT / "data/cand.json"))
    X = (d.get("x") or {}).get("gen") or {}
    benthic, bonus = genera.lists()
    gen, names = {}, set()
    for n, g in [*d["gen"].items(), *X.items()]:
        role = "slate" if n not in X else "benthic" if n in benthic else "bonus" if n in bonus else "key"
        app = {"fam": g.get("fam")}
        says = [s for s in g.get("imr") or [] if n not in X and IMR_SAYS.search(s)]
        if says:
            app["imr"] = says
        gen[n] = {"role": role, "app": app}
        for v in [*(g.get("views") or {}).values(), *(g.get("more") or {}).values(), (d.get("cand") or {}).get(n) or []]:
            for p in v:
                w = (p.get("t") or "").split()
                if len(w) >= 2 and w[1][:1].islower():
                    names.add(" ".join(w[:2]))
    c = json.loads(CHECKLISTS.read_text(encoding="utf-8"))["cotw"]
    return {"genera": gen, "photos": sorted(names),
            "checklist": {"names": c["names"], "decided": c.get("decided") or {}, "date": c.get("date")}}


def photo_names(paths):
    """{species name: [the unit ids its photos are filed under]} from photo files {"cand" | "photos": {unit: [photo]}}:
    a photo's name (t, iNaturalist's or FishBase's at fetch time), its first two words when the second is an epithet;
    the unit is the photo's own `sp` when it has one (fish-game.json files photos by teaching entry)."""
    out = {}
    for path in paths:
        d = json.loads(Path(path).read_text(encoding="utf-8"))
        for unit, ps in [*(d.get("cand") or {}).items(), *(d.get("photos") or {}).items()]:
            for p in ps if isinstance(ps, list) else []:
                w = (p.get("t") or "").split() if isinstance(p, dict) else []
                if len(w) >= 2 and w[1][:1].islower():
                    out.setdefault(" ".join(w[:2]), set()).add(p.get("sp") or unit)
    return {k: sorted(v) for k, v in sorted(out.items())}


def fish_inputs():
    """The fish subject's inputs, from fish.json: its genera (`role` its circle, `app` the WoRMS family or families of
    its teaching family, fish.json families sci), its species (every one, in the game or out: `app` = fish.json's id,
    WoRMS AphiaID `ref`, iNaturalist taxon `inat` and WoRMS name `now` as tools/build_fish.py last wrote them; `game`
    = in the game, for the report), the photo names (every candidate, data/fish-cand.json, and every photo in play,
    fish-game.json: the admin flags their names, data/names.json) and the checklist (FishBase's Philippine Table 1)."""
    F = json.loads((ROOT / "fish.json").read_text(encoding="utf-8"))
    sci = {f["id"]: f.get("sci") or [] for f in F.get("families") or []}
    rank = {r["name"]: r.get("rank") for r in (F.get("ref") or {}).values()}
    gen = {}
    for g in F.get("genera") or []:
        fam = sci.get(g.get("family")) or []
        # fams: the teaching family's names WoRMS ranks as a family, the only ones a genus's WoRMS family is compared
        # with (a teaching family may be a subfamily, Scarinae, or a genus, Hippocampus: no family to compare)
        gen[g["name"]] = {"role": f"circle {g['circle']}" if g.get("circle") else "out",
                          "app": {"fam": fam[0] if len(fam) == 1 else fam},
                          "fams": [x for x in fam if rank.get(x) == "Family"]}
    species = {}
    for s in F.get("species") or []:
        app = {k: s[k] for k in ("id", "ref", "inat", "now") if s.get(k) is not None}
        species[s["name"]] = {"app": app, "game": bool(s.get("circle")) and not s.get("out")}
    c = json.loads(CHECKLISTS.read_text(encoding="utf-8"))["fishbase"]
    return {"genera": gen, "species": species,
            "photos": photo_names([ROOT / "data/fish-cand.json", ROOT / "fish-game.json"]),
            "checklist": {"names": {n: [] for n in c["names"]}, "decided": {}, "date": c.get("date")}}


# A subject = where its units come from and how to recognise its taxa. `unit`: the rank the game asks ("genus": one
# record per genus with its WoRMS species, build(); "species": one record per species too, build_species(), whose
# names come from the subject's own file). Nothing below names a subject.
SUBJECTS = {
    "coral": {
        "inputs": coral_inputs,
        "src": "data.json / core.js",  # where its units come from, named by --check
        "unit": "genus",
        "phylum": "Cnidaria",  # WoRMS: records of another phylum are homonyms (Astrea the snail)
        "roots": [47532],  # iNaturalist taxa whose genera and species are listed in bulk (Scleractinia)
        "guard": 47534,  # an iNaturalist ancestor of every taxon of the subject (Cnidaria): the homonym guard elsewhere
    },
    "fish": {
        "inputs": fish_inputs,
        "src": "fish.json",
        "unit": "species",
        "phylum": "Chordata",
        # No bulk roots and no fixed guard: the species' iNaturalist taxa are those fish.json names, and the homonym
        # guard is their deepest common iNaturalist ancestor, read from their records (build_species).
        "names_worms": False,  # its Tree reads fish.json ref, not data/names.json worms
    },
}


class Net:
    """GET JSON with a cache ({url: reply}, plus "_dates": {source: the date of its last fetch}); None for an empty
    reply (WoRMS answers 204 when nothing matches) or a 404."""

    def __init__(self, offline=False, refresh=False, path=CACHE, today=None):
        self.offline, self.refresh, self.path, self.new, self.asked = offline, refresh, Path(path), 0, set()
        self.c = json.loads(self.path.read_text(encoding="utf-8")) if self.path.exists() else {}
        self.today = today or time.strftime("%Y-%m-%d")

    def dates(self):
        return dict(self.c.get("_dates") or {})

    def get(self, url):
        if url in self.c and not (self.refresh and url not in self.asked):
            return self.c[url]
        if self.offline:
            sys.exit(f"--offline: not cached: {url}")
        base = WORMS if url.startswith(WORMS) else INAT
        v = inat.get(url, missing=True)  # paced per host, 429 / 5xx retried after a pause (Retry-After when given); 204 / 404: None
        self.c[url] = v
        self.c.setdefault("_dates", {})["worms" if base == WORMS else "inat"] = self.today
        self.asked.add(url)
        self.new += 1
        if self.new % 40 == 0:
            self.save()
        return v

    def save(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        tmp = self.path.with_suffix(".tmp")
        tmp.write_text(json.dumps(self.c, sort_keys=True, separators=(",", ":")), encoding="utf-8")
        tmp.replace(self.path)


q = urllib.parse.quote


def epithet(name):
    w = (name or "").split()
    return w[1] if len(w) > 1 else ""


def norm(name):
    """One spelling for matching a species between WoRMS and iNaturalist: an epithet in -ii and its -i form are one
    (valenciennesii / valenciennesi, as tools/presence.py _norm), and so are its -us / -a / -um endings (pacificus /
    pacifica: the epithet agrees with the genus's gender, and the sources do not always follow a move)."""
    w = (name or "").split()
    if len(w) >= 2:
        e = w[1][:-1] if w[1].endswith("ii") else w[1]
        w[1] = re.sub(r"(us|um|a)$", "", e)
    return " ".join(w[:2])


def chunks(xs, n):
    return [xs[i:i + n] for i in range(0, len(xs), n)]


# ---------------------------------------------------------------- WoRMS

def worms_names(get, names, phylum):
    """{name: [records of the subject's phylum with that exact name]} in batches of BATCH_WORMS names."""
    out = {}
    for ch in chunks(sorted(set(names)), BATCH_WORMS):
        url = WORMS + "AphiaRecordsByNames?" + "&".join("scientificnames[]=" + q(n) for n in ch) + "&like=false&marine_only=false"
        r = get(url) or [[] for _ in ch]
        for n, recs in zip(ch, r):
            out[n] = [x for x in recs or [] if x.get("phylum") == phylum and x.get("scientificname") == n]
    return out


def best(recs, rank):
    """The record that stands for a name: its rank, accepted first, then the lowest AphiaID (stable)."""
    rs = [x for x in recs if x.get("rank") == rank] or recs
    return sorted(rs, key=lambda x: (x.get("status") != "accepted", x["AphiaID"]))[0] if rs else None


def paged(get, url):
    out, off = [], 1
    while True:
        rs = get(f"{url}{'&' if '?' in url else '?'}offset={off}") or []
        out += rs
        if len(rs) < 50:
            return out
        off += 50


def children(get, aid):
    """WoRMS children of a genus (species and subgenera, any status); an accepted subgenus is opened too."""
    out = []
    for x in paged(get, f"{WORMS}AphiaChildrenByAphiaID/{aid}?marine_only=false"):
        if x.get("rank") == "Subgenus" and x.get("status") == "accepted":
            out += children(get, x["AphiaID"])
        else:
            out.append(x)
    return out


def wrec(r, key=None):
    o = {"id": r["AphiaID"], "st": r.get("status") or ""}
    if r.get("valid_name") and r["valid_name"] != (key or r.get("scientificname")):
        o["now"] = r["valid_name"]
    if r.get("family"):
        o["fam"] = r["family"]
    o["mod"] = (r.get("modified") or "")[:10]
    return o


def wstate(r):
    """A name's WoRMS state in one string, for the watch list."""
    if not r:
        return None
    st = r.get("status") or ""
    return st if st == "accepted" else f"{st} -> {r.get('valid_name')}"


# ---------------------------------------------------------------- iNaturalist

def inat_bulk(get, root, rank):
    """Every taxon of a rank under an iNaturalist root, active or not, by ascending id (PAGE_INAT a call)."""
    out, above = [], 0
    while True:
        r = get(f"{INAT}taxa?taxon_id={root}&rank={rank}&is_active=any&order_by=id&order=asc&per_page={PAGE_INAT}&id_above={above}") or {}
        rs = r.get("results") or []
        out += rs
        if len(rs) < PAGE_INAT:
            return out
        above = rs[-1]["id"]


def inat_find(get, name, rank, guard):
    """iNaturalist taxa of a rank with exactly this name under the guard ancestor (active or not)."""
    r = get(f"{INAT}taxa?q={q(name)}&rank={rank}&is_active=any&per_page=30") or {}
    return [t for t in r.get("results") or [] if t.get("name") == name and guard in (t.get("ancestor_ids") or [])]


def pick(ts):
    """The taxon that stands for a name on iNaturalist: the active one, else the inactive one with the lowest id."""
    return sorted(ts, key=lambda t: (not t.get("is_active"), t["id"]))[0] if ts else None


def inat_details(get, ids):
    out = {}
    for ch in chunks(sorted(set(ids)), BATCH_INAT):
        for t in (get(f"{INAT}taxa/{','.join(map(str, ch))}") or {}).get("results") or []:
            out[t["id"]] = t
    return out


def family_of(t):
    return next((a["name"] for a in t.get("ancestors") or [] if a.get("rank") == "family"), None)


# ---------------------------------------------------------------- build

def build(sub, inp, get, prev, dates):
    """The subject's section of taxonomy.json and the report, from its inputs, a `get(url)`, the previous section (its
    hand-kept parts: the `old` names, the watch list) and `dates()`, the date of each source's last fetch, read once
    the build has fetched (Codex review #570: a first run or a --refresh is dated with its own fetch). Pure but for
    `get`."""
    G, phylum = inp["genera"], sub["phylum"]
    prev = prev or {}
    old_names = set(prev.get("old") or {}) - set(G)
    watch = [dict(w) for w in prev.get("watch") or []]
    rep = {"notes": [], "cotw": [], "photos": []}

    # iNaturalist: the genera and species of the roots in bulk.
    ig, isp = {}, {}
    for root in sub["roots"]:
        for t in inat_bulk(get, root, "genus"):
            ig.setdefault(t["name"], []).append(t)
        for t in inat_bulk(get, root, "species"):
            isp.setdefault(t["name"], []).append(t)

    # WoRMS: the app genera, batched by name.
    W = worms_names(get, G, phylum)
    wg = {n: best(W.get(n) or [], "Genus") for n in G}
    # WoRMS's genus synonyms of the app genera are former genus names too, when still met somewhere: an inactive
    # iNaturalist taxon (a name iNaturalist swapped away since 2008), or the genus of a checklist or photo name. The
    # others (about 180 for the coral genera: nineteenth-century synonyms, misspellings) would only weigh on the file.
    met = {n for n, ts in ig.items() if any(not t.get("is_active") for t in ts)}
    met |= {x.split()[0] for x in [*inp["checklist"]["names"], *inp["photos"]]}
    syn = {}
    for n in sorted(G):
        if wg[n] and wg[n].get("status") == "accepted":
            for s in paged(get, f"{WORMS}AphiaSynonymsByAphiaID/{wg[n]['AphiaID']}"):
                if s.get("rank") == "Genus" and s.get("scientificname") not in G and s["scientificname"] in met:
                    syn.setdefault(s["scientificname"], s)
    # The listed former genera WoRMS did not give as synonyms, batched by name (the same batch on a rerun: a name found
    # as a synonym is never asked by name, whether or not the file already lists it).
    W.update(worms_names(get, sorted(old_names - set(syn)), phylum))
    old_names |= set(syn)
    wo = {n: syn.get(n) or best(W.get(n) or [], "Genus") for n in old_names}

    # Children: accepted species of each app genus; a species that crossed into or out of an app genus = a move.
    spp, moves = {}, {}
    for n in sorted(G):
        if not wg[n]:
            continue
        kids = children(get, wg[n]["AphiaID"])
        spp[n] = sorted({epithet(x["scientificname"]) for x in kids if x.get("rank") == "Species" and x.get("status") == "accepted"
                         and x["scientificname"].split()[0] == n})
        for x in kids:
            v = (x.get("valid_name") or "").split()
            if x.get("rank") == "Species" and x.get("status") != "accepted" and v and v[0] != n and v[0] in G:
                moves.setdefault(x["scientificname"], x)
    into = {}
    for n in sorted(old_names):
        if not wo.get(n):
            continue
        for x in children(get, wo[n]["AphiaID"]):
            v = x.get("valid_name") or ""
            if x.get("rank") == "Species" and v and v.split()[0] in G and v.split()[0] != x["scientificname"].split()[0]:
                moves.setdefault(x["scientificname"], x)
                into.setdefault(n, {}).setdefault(v.split()[0], set()).add(v)

    # iNaturalist: the names the roots did not hold, one by one under the guard.
    for n in sorted({*G, *old_names} - set(ig)):
        ig[n] = inat_find(get, n, "genus", sub["guard"])
    for n in sorted(G):
        t = pick(ig.get(n))
        if t and t.get("is_active") and not any(r in (t.get("ancestor_ids") or []) for r in sub["roots"]):
            for s in inat_bulk(get, t["id"], "species"):
                isp.setdefault(s["name"], []).append(s)
    det = inat_details(get, [pick(ig[n])["id"] for n in G if pick(ig.get(n))])
    by_id = {t["id"]: t for ts in [*ig.values(), *isp.values()] for t in ts}
    active_sp = {}
    for name, ts in isp.items():
        t = pick(ts)
        if t and t.get("is_active"):
            active_sp.setdefault(norm(name), []).append(name)

    def inat_sp(name):
        """(iNaturalist's active name for a species, or None)."""
        hits = active_sp.get(norm(name)) or []
        return (name if name in hits else sorted(hits)[0]) if hits else None

    gen = {}
    for n in sorted(G):
        o = {"role": G[n]["role"], "app": G[n]["app"]}
        flags = []
        if wg[n]:
            o["worms"] = {**wrec(wg[n], n), "spp": spp.get(n, [])}
            if wg[n].get("status") != "accepted" and wg[n].get("valid_name") != n:
                flags.append(f"WoRMS: {wg[n].get('status')} -> {wg[n].get('valid_name')}")
            if o["app"].get("fam") and wg[n].get("family") and o["app"]["fam"] != wg[n]["family"]:
                flags.append(f"family: the app says {o['app']['fam']}, WoRMS {wg[n]['family']}")
        else:
            flags.append("not in WoRMS")
        t = pick(ig.get(n))
        if t:
            i = {"id": t["id"]}
            if not t.get("is_active"):
                i["act"] = False
                flags.append("iNaturalist: inactive taxon")
            fam = family_of(det.get(t["id"]) or {})
            if fam:
                i["fam"] = fam
            if wg[n] and fam and wg[n].get("family") and fam != wg[n]["family"]:
                flags.append(f"family: WoRMS {wg[n]['family']}, iNaturalist {fam}")
            if t.get("is_active"):
                mine = {norm(s): s for s, ts in isp.items() if pick(ts) and pick(ts).get("is_active") and t["id"] in (pick(ts).get("ancestor_ids") or [])}
                wn = {norm(f"{n} {e}"): f"{n} {e}" for e in spp.get(n, [])}
                miss = sorted(epithet(wn[k]) for k in set(wn) - set(mine))
                extra = sorted(epithet(mine[k]) for k in set(mine) - set(wn))
                if miss:
                    i["miss"] = miss
                if extra:
                    i["extra"] = extra
            o["inat"] = i
        else:
            flags.append("not on iNaturalist")
        if flags:
            o["flags"] = flags
        gen[n] = o

    old = {}
    for n in sorted(old_names):
        o = {}
        if wo.get(n):
            w = wo[n]
            o["worms"] = {"id": w["AphiaID"], "st": w.get("status") or "", "now": w.get("valid_name") or n, "mod": (w.get("modified") or "")[:10]}
        t = pick(ig.get(n))
        if t:
            i = {"id": t["id"], "act": bool(t.get("is_active"))}
            if not t.get("is_active"):
                now = sorted({by_id[k]["name"] for k in t.get("current_synonymous_taxon_ids") or [] if k in by_id})
                if now:
                    i["now"] = now
            o["inat"] = i
        if n in into:
            o["into"] = {g: len(v) for g, v in sorted(into[n].items())}
        old[n] = o

    # Species rows: WoRMS moves across app genera, checklist names and served photo names WoRMS writes differently.
    rows = {}

    def row(name, now, aid, src, extra=None):
        r = rows.setdefault(name, {"now": now, "id": aid, "src": []})
        if src not in r["src"]:
            r["src"].append(src)
        r.update(extra or {})

    ck = inp["checklist"]
    CW = worms_names(get, [*ck["names"], *[m for acc in ck["names"].values() for m in acc], *inp["photos"]], phylum)
    # A WoRMS move pays when its old name is still met: iNaturalist has (or had) a taxon of that name (the checklist's
    # and the served photos' names get their rows below); the hundreds of older combinations stay out (Lamarck's Astrea
    # alone held half the stony corals).
    for name, x in sorted(moves.items()):
        if name in isp:
            row(name, x["valid_name"], x.get("valid_AphiaID"), "worms")
    for name, acc in sorted(ck["names"].items()):
        r = best(CW.get(name) or [], "Species")
        now = r.get("valid_name") if r else None
        mapped = acc or [name]
        if name in ck["decided"]:  # mapped by a decision recorded in the checklist, not by WoRMS
            mr = best(CW.get(mapped[0]) or [], "Species")
            row(name, mapped[0], mr.get("AphiaID") if mr else None, "cotw", {"by": "checklist"})
            continue
        if now and now != name:
            row(name, now, r.get("valid_AphiaID"), "cotw")
        if now and now not in mapped:
            rep["cotw"].append(f"{name}: WoRMS {now}, the checklist {', '.join(mapped)}")
        for m in mapped:  # every name the checklist gives must still be accepted in WoRMS
            mr = best(CW.get(m) or [], "Species")
            if not mr and not (m == name and now):
                rep["cotw"].append(f"{name}: no exact WoRMS record for {m}")
            elif mr and mr.get("valid_name") != m and m != name:
                rep["cotw"].append(f"{name}: the checklist gives {m}, WoRMS now {mr.get('valid_name')}")
    for name in inp["photos"]:
        r = best(CW.get(name) or [], "Species")
        g = name.split()[0]
        same = [e for e in spp.get(g, []) if norm(f"{g} {e}") == norm(name)]
        if not r and len(same) == 1:  # iNaturalist's spelling of a species WoRMS spells otherwise (valenciennesi)
            row(name, f"{g} {same[0]}", None, "photo")
        elif not r:
            rep["photos"].append(f"{name}: not in WoRMS")
        elif r.get("valid_name") and r["valid_name"] != name:
            row(name, r["valid_name"], r.get("valid_AphiaID"), "photo")
    for name, r in rows.items():
        r["src"].sort()
        i = inat_sp(r["now"]) if r["now"] else None
        if i is None:
            r["inat"] = False
        elif i != r["now"]:
            r["iname"] = i
    rows = {k: rows[k] for k in sorted(rows)}

    # The watch list: what each source says now about its names.
    wn = worms_names(get, [n for w in watch for n in w.get("names") or []], phylum)
    for w in watch:
        seen = {"worms": {}, "inat": {}}
        for n in w.get("names") or []:
            seen["worms"][n] = wstate(best(wn.get(n) or [], "Species" if " " in n else "Genus"))
            alt = inat_sp(n) if " " in n else None  # its iNaturalist spelling, when it differs
            t = pick(isp.get(n) if " " in n else ig.get(n))
            if t is None and " " in n and not alt:
                t = pick(inat_find(get, n, "species", sub["guard"]))
            if alt and not (t and t.get("is_active")):
                seen["inat"][n] = "active" if alt == n else f"active as {alt}"
            elif t is None:
                seen["inat"][n] = None
            elif t.get("is_active"):
                seen["inat"][n] = "active"
            else:
                now = sorted({by_id[k]["name"] for k in t.get("current_synonymous_taxon_ids") or [] if k in by_id})
                seen["inat"][n] = "inactive" + (f" -> {', '.join(now)}" if now else "")
        seen["spp"] = {g: {"worms": len((gen.get(g) or {}).get("worms", {}).get("spp", [])),
                           "inat_miss": (gen.get(g) or {}).get("inat", {}).get("miss", []),
                           "inat_extra": (gen.get(g) or {}).get("inat", {}).get("extra", [])} for g in w.get("genera") or []}
        w["seen"] = seen

    dt = dates()
    out = {"refreshed": {"worms": dt.get("worms"), "inat": dt.get("inat"), "checklist": ck.get("date")},
           "gen": gen, "old": old, "spp": rows, "watch": watch, "log": list(prev.get("log") or [])}
    return out, rep


# ---------------------------------------------------------------- build, a subject whose unit is the species

def worms_ids(get, ids):
    """{AphiaID: its record} in batches of BATCH_WORMS ids (a record WoRMS no longer has is left out)."""
    out = {}
    for ch in chunks(sorted(set(ids)), BATCH_WORMS):
        for r in get(WORMS + "AphiaRecordsByAphiaIDs?" + "&".join(f"aphiaids[]={i}" for i in ch)) or []:
            if r and r.get("AphiaID"):
                out[r["AphiaID"]] = r
    return out


def edits(a, b):
    """The Levenshtein distance between two words."""
    row = list(range(len(b) + 1))
    for i, x in enumerate(a, 1):
        prev, row[0] = row[0], i
        for j, y in enumerate(b, 1):
            prev, row[j] = row[j], min(row[j] + 1, row[j - 1] + 1, prev + (x != y))
    return row[-1]


def kind(name, now):
    """How a name differs from the one a source accepts: None (the same), "spelling" (the same genus, an epithet that
    is another spelling or ending of it: rafflesi / rafflesii, nigricaudus / nigricauda), "genus" (another genus, the
    same epithet but for its ending: Chromis retrofasciata / Pycnochromis retrofasciatus), "species" (another epithet:
    the name is a synonym of another species, Siganus margaritiferus / Siganus fuscescens)."""
    if not name or not now or name == now:
        return None
    a, b = name.split()[:2], now.split()[:2]
    if len(a) < 2 or len(b) < 2:
        return "species"
    same = norm(name).split()[1] == norm(now).split()[1] or edits(a[1], b[1]) <= 2
    return ("spelling" if a[0] == b[0] else "genus") if same else "species"


def build_species(sub, inp, get, prev, dates):
    """The section of a subject whose unit is the species (its file names each species' WoRMS AphiaID and iNaturalist
    taxon: tools/build_fish.py), and the report. Pure but for `get`.
    - species: {name: {app, worms: {id, st, now?, acc?, exact?}, inat: {id, name?, act?, now?}, flags?}} for every
      species of the file (in the game or out): `worms` is the record of the name as written (exact match), else, when
      WoRMS has no record of that spelling (the file's build matched it fuzzily), of the AphiaID the file gives it
      (exact: false); acc = the accepted AphiaID when it differs from id; `inat` the taxon the file gives it, with
      iNaturalist's name when it differs from the species' name, and the taxa it now points to when inactive.
    - gen: {genus: {role, app, worms: {id, st, now?, fam, mod}, inat: {id, fam?, act?}, flags?}} for every genus of the
      file (its name as the file writes it); the iNaturalist genus is the one above its species' taxa, else found by
      name under the guard.
    - spp: a species row ({now, id, src, iname?, inat?}) for every name met that WoRMS writes otherwise and that
      resolves to a species of the file: its own names (src app), the photo names (src photo: a name WoRMS does not
      know at all is iNaturalist's name of the photo's species, its row points to that species' WoRMS name) and the
      checklist's names (src checklist); iname = iNaturalist's name of the species `now` names, when it differs;
      inat: false when iNaturalist has no active taxon for it. Other WoRMS synonyms stay in the file's own ref (syn).
    - old: the genera of those names that WoRMS no longer accepts as a genus (plus the hand-listed ones)."""
    G, S, phylum, ck = inp["genera"], inp["species"], sub["phylum"], inp["checklist"]
    prev = prev or {}
    rep = {"worms": [], "inat": [], "stale": [], "photos": [], "family": []}

    # WoRMS: every name met, by name (exact), and the AphiaIDs the file gives, by id.
    W = worms_names(get, sorted({*S, *G, *(s["app"]["now"] for s in S.values() if s["app"].get("now")), *inp["photos"],
                                 *ck["names"]}), phylum)
    R = worms_ids(get, [s["app"]["ref"] for s in S.values() if s["app"].get("ref")])

    # iNaturalist: the taxa the file gives its species, 30 a call; for an inactive one, the taxa it now points to.
    det = inat_details(get, [s["app"]["inat"] for s in S.values() if s["app"].get("inat")])
    det.update(inat_details(get, [k for t in list(det.values()) if not t.get("is_active")
                                  for k in t.get("current_synonymous_taxon_ids") or [] if k not in det]))
    anc = [t.get("ancestor_ids") or [] for t in det.values() if t.get("rank") == "species"]
    common = set.intersection(*map(set, anc)) if anc else set()
    guard = next((a for a in reversed(anc[0]) if a in common), None) if anc else None

    def inat_now(tid):
        """iNaturalist's active name for the species of a taxon id (an inactive taxon: the one it now points to)."""
        t = det.get(tid) or {}
        if t.get("is_active"):
            return t.get("name")
        cur = [det[k]["name"] for k in t.get("current_synonymous_taxon_ids") or [] if k in det]
        return cur[0] if len(cur) == 1 else None

    species, acc_of, sp_of_acc = {}, {}, {}
    for n in sorted(S):
        a = S[n]["app"]
        o = {"app": {k: a[k] for k in ("id",) if k in a}}
        flags = []
        r = best(W.get(n) or [], "Species")
        exact = bool(r)
        r = r or R.get(a.get("ref"))
        if r:
            acc = r.get("valid_name") or r["scientificname"]
            aid = r.get("valid_AphiaID") or r["AphiaID"]
            w = {"id": r["AphiaID"], "st": r.get("status") or ""}
            if acc != n:
                w["now"] = acc
            if aid != r["AphiaID"]:
                w["acc"] = aid
            if not exact:
                w["exact"] = False
            o["worms"] = w
            acc_of[n] = (acc, aid)
            sp_of_acc.setdefault(acc, []).append(n)
            k = kind(n, acc)
            if not exact:
                flags.append(f"WoRMS: no record of this spelling; the file's AphiaID {r['AphiaID']} is {acc}")
            elif k:
                flags.append(f"WoRMS: {r.get('status')} -> {acc} ({k})")
            if (a.get("now") or n) != acc or (a.get("ref") and a["ref"] != aid):
                flags.append(f"stale: the file has {a.get('now') or n} ({a.get('ref')}), WoRMS now {acc} ({aid})")
        else:
            flags.append("not in WoRMS")
        t = det.get(a.get("inat"))
        if t:
            i = {"id": t["id"]}
            if t.get("name") != n:
                i["name"] = t["name"]
            if not t.get("is_active"):
                i["act"] = False
                i["now"] = sorted(det[k]["name"] for k in t.get("current_synonymous_taxon_ids") or [] if k in det)
                flags.append("iNaturalist: inactive taxon" + (f" -> {', '.join(i['now'])}" if i["now"] else ""))
            o["inat"] = i
            inow = inat_now(t["id"])
            if inow and n in acc_of and kind(inow, acc_of[n][0]):
                flags.append(f"iNaturalist: {inow} ({kind(inow, acc_of[n][0])} of WoRMS {acc_of[n][0]})")
        else:
            flags.append("no iNaturalist taxon in the file" if not a.get("inat") else "iNaturalist: no such taxon")
        if flags:
            o["flags"] = flags
        species[n] = o

    # Genera: WoRMS by name; iNaturalist's genus above the species' taxa of that genus name, else found by name.
    ig = {}
    for t in det.values():
        for x in t.get("ancestors") or []:
            if x.get("rank") == "genus":
                ig.setdefault(x["name"], x)
    for n in sorted(set(G) - set(ig)):
        t = pick(inat_find(get, n, "genus", guard)) if guard else None
        if t:
            ig[n] = t
    gdet = inat_details(get, [ig[n]["id"] for n in G if n in ig])
    gen = {}
    for n in sorted(G):
        o = {"role": G[n]["role"], "app": G[n]["app"]}
        flags = []
        r = best(W.get(n) or [], "Genus")
        fams = G[n].get("fams")
        if fams is None:
            fams = G[n]["app"].get("fam")
            fams = fams if isinstance(fams, list) else [fams] if fams else []
        if r:
            o["worms"] = wrec(r, n)
            if r.get("status") != "accepted" and r.get("valid_name") != n:
                flags.append(f"WoRMS: {r.get('status')} -> {r.get('valid_name')}")
            if fams and r.get("family") and r["family"] not in fams:
                flags.append(f"family: the app says {' / '.join(fams)}, WoRMS {r['family']}")
        else:
            flags.append("not in WoRMS")
        t = ig.get(n)
        if t:
            i = {"id": t["id"]}
            if t.get("is_active") is False:
                i["act"] = False
                flags.append("iNaturalist: inactive taxon")
            fam = family_of(gdet.get(t["id"]) or {})
            if fam:
                i["fam"] = fam
            if r and fam and r.get("family") and fam != r["family"]:
                flags.append(f"family: WoRMS {r['family']}, iNaturalist {fam}")
            o["inat"] = i
        else:
            flags.append("not on iNaturalist")
        if flags:
            o["flags"] = flags
        gen[n] = o

    # Species rows: the names met that WoRMS writes otherwise, when they resolve to a species of the file.
    rows = {}

    def row(name, now, aid, src):
        r = rows.setdefault(name, {"now": now, "id": aid, "src": []})
        if src not in r["src"]:
            r["src"].append(src)

    for n, (acc, aid) in acc_of.items():
        if acc != n:
            row(n, acc, aid, "app")
    for name, units in inp["photos"].items():
        r = best(W.get(name) or [], "Species")
        mine = sorted({acc_of[x][0] for x in S if S[x]["app"].get("id") in units and x in acc_of})
        if r:
            v = r.get("valid_name") or name
            if v != name and v in sp_of_acc:
                row(name, v, r.get("valid_AphiaID"), "photo")
            elif v not in mine and mine:
                rep["photos"].append(f"{name}: WoRMS {v}, a photo of {', '.join(mine)}")
        elif len(mine) == 1:  # iNaturalist's name of a species WoRMS writes otherwise (Concholabrus fasciatus)
            row(name, mine[0], None, "photo")
        else:
            rep["photos"].append(f"{name}: not in WoRMS")
    for name in ck["names"]:
        r = best(W.get(name) or [], "Species")
        v = r.get("valid_name") if r else None
        if v and v != name and v in sp_of_acc:
            row(name, v, r.get("valid_AphiaID"), "checklist")
    by_acc = {}  # the iNaturalist taxon of each WoRMS name: that of the species written so first
    for n, (acc, _) in sorted(acc_of.items(), key=lambda x: (x[0] != x[1][0], x[0])):
        by_acc.setdefault(acc, S[n]["app"].get("inat"))
    for name, r in rows.items():
        r["src"].sort()
        i = inat_now(by_acc.get(r["now"]))
        if i is None:
            r["inat"] = False
        elif i != r["now"]:
            r["iname"] = i
    rows = {k: rows[k] for k in sorted(rows)}

    # Former genera: the genera of the rows' names WoRMS no longer accepts as a genus (and the hand-listed ones).
    cand = (set(prev.get("old") or {}) | {k.split()[0] for k in rows}) - set(G)
    WO = worms_names(get, sorted(cand), phylum)
    old = {}
    for n in sorted(cand):
        r = best(WO.get(n) or [], "Genus")
        if not (n in (prev.get("old") or {}) or (r and r.get("status") != "accepted")):
            continue
        o = {}
        if r:
            o["worms"] = {"id": r["AphiaID"], "st": r.get("status") or "", "now": r.get("valid_name") or n, "mod": (r.get("modified") or "")[:10]}
        t = pick(inat_find(get, n, "genus", guard)) if guard else None
        if t:
            i = {"id": t["id"], "act": bool(t.get("is_active"))}
            if not t.get("is_active"):
                now = sorted(x["name"] for x in inat_details(get, t.get("current_synonymous_taxon_ids") or []).values())
                if now:
                    i["now"] = now
            o["inat"] = i
        old[n] = o

    dt = dates()
    out = {"refreshed": {"worms": dt.get("worms"), "inat": dt.get("inat"), "checklist": ck.get("date")},
           "gen": gen, "species": species, "old": old, "spp": rows, "watch": [dict(w) for w in prev.get("watch") or []],
           "log": list(prev.get("log") or [])}
    rep["game"] = sorted(n for n in S if S[n].get("game"))
    return out, rep


# ---------------------------------------------------------------- diff, report

def flat(o, p=""):
    """{path: value} with lists kept whole (compared as sets)."""
    if isinstance(o, dict):
        r = {}
        for k, v in o.items():
            r.update(flat(v, f"{p}.{k}" if p else str(k)))
        return r
    return {p: o}


def diff(a, b):
    """Changes from section a to section b (gen, species, old, spp, watch), as short lines."""
    out = []
    for part in ("gen", "species", "old", "spp"):
        A, B = (a or {}).get(part) or {}, b.get(part) or {}
        for k in sorted(set(A) | set(B)):
            if k not in A:
                out.append(f"{part} {k}: new")
                continue
            if k not in B:
                out.append(f"{part} {k}: gone")
                continue
            fa, fb = flat(A[k]), flat(B[k])
            for p in sorted(set(fa) | set(fb)):
                x, y = fa.get(p), fb.get(p)
                if x == y or p.endswith(".mod"):
                    continue
                if isinstance(x, list) or isinstance(y, list):
                    sx, sy = set(map(str, x or [])), set(map(str, y or []))
                    ch = [f"+{s}" for s in sorted(sy - sx)] + [f"-{s}" for s in sorted(sx - sy)]
                    if ch:
                        out.append(f"{part} {k} {p}: {' '.join(ch)}")
                else:
                    out.append(f"{part} {k} {p}: {x} -> {y}")
    wa = {w.get("id"): w.get("seen") for w in (a or {}).get("watch") or []}
    for w in b.get("watch") or []:
        if w.get("id") in wa and wa[w["id"]] is not None:
            fa, fb = flat(wa[w["id"]]), flat(w.get("seen") or {})
            for p in sorted(set(fa) | set(fb)):
                if fa.get(p) != fb.get(p):
                    out.append(f"watch {w['id']} {p}: {fa.get(p)} -> {fb.get(p)}")
    return out


def log_changes(sec, prev, date):
    """Appends the changes since `prev` to sec["log"] (the first build gets one line). Returns them."""
    if not (prev or {}).get("gen"):
        ch = [f"first build: {len(sec['gen'])} genera, " + (f"{len(sec['species'])} species, " if "species" in sec else "")
              + f"{len(sec['old'])} former genus names, {len(sec['spp'])} species rows, {len(sec['watch'])} watched items"]
    else:
        ch = diff(prev, sec)
    sec["log"] = list(sec.get("log") or []) + [{"date": date, "what": c} for c in ch]
    return ch


def report(name, sec, rep, changes):
    g = sec["gen"]
    print(f"[{name}] {len(g)} genera, {len(sec['old'])} former genus names, {len(sec['spp'])} species rows; "
          f"data of {sec['refreshed']}")
    print(f"changes since the last refresh: {len(changes)}")
    for c in changes:
        print("  " + c)
    fl = [(n, f) for n, o in g.items() for f in o.get("flags") or []]
    print(f"flags (reported, never applied: rule C1): {len(fl)}")
    for n, f in fl:
        print(f"  {n}: {f}")
    miss = {n: o["inat"]["miss"] for n, o in g.items() if (o.get("inat") or {}).get("miss")}
    print(f"species WoRMS accepts and iNaturalist lacks (or spells otherwise), by genus: {sum(map(len, miss.values()))}")
    for n, m in miss.items():
        print(f"  {n}: {', '.join(m)}")
    sp = [(k, r) for k, r in sec["spp"].items() if r.get("iname") or r.get("inat") is False]
    print(f"species rows where iNaturalist differs from WoRMS: {len(sp)}")
    for k, r in sp:
        print(f"  {k} -> {r['now']}: iNaturalist " + (r["iname"] if r.get("iname") else "has no active taxon"))
    print(f"checklist names WoRMS reads otherwise than the checklist: {len(rep['cotw'])}")
    for x in rep["cotw"]:
        print("  " + x)
    print(f"served photo names unknown to WoRMS: {len(rep['photos'])}")
    for x in rep["photos"]:
        print("  " + x)
    print("watch list (reported only; the app follows IMR's wording):")
    moved = {c.split()[1] for c in changes if c.startswith("watch ")}
    for w in sec["watch"]:
        s = w.get("seen") or {}
        state = "; ".join(f"{n}: WoRMS {s['worms'].get(n)}, iNaturalist {s['inat'].get(n)}" for n in w.get("names") or [])
        gs = "; ".join(f"{gn}: {v['worms']} species in WoRMS" + (f", iNaturalist lacks {', '.join(v['inat_miss'])}" if v["inat_miss"] else "")
                       + (f", iNaturalist also has {', '.join(v['inat_extra'])}" if v["inat_extra"] else "") for gn, v in (s.get("spp") or {}).items())
        print(f"  {w['id']}: {'MOVED' if w['id'] in moved else 'no move since the last refresh'}. {state}" + (f". {gs}" if gs else ""))


def classes(sec, game):
    """The species in the game by what differs, each in one class per comparison (reported, never applied: rule C1):
    {"worms": {class: [line]}: the name the game uses against WoRMS's (spelling, genus, species: kind(); unknown: WoRMS
    has no record of that spelling), "inat": {class: [line]}: iNaturalist's active name against WoRMS's (spelling,
    genus, species; inactive: the taxon the file gives is inactive), "stale": [line]: the subject's file behind WoRMS}."""
    out = {"worms": {}, "inat": {}, "stale": []}
    for n in game:
        o = sec["species"].get(n) or {}
        w, i = o.get("worms") or {}, o.get("inat") or {}
        acc = w.get("now") or n
        c = "unknown" if w.get("exact") is False else kind(n, acc) if w else "not in WoRMS"
        if c:
            out["worms"].setdefault(c, []).append(f"{n} -> {acc}")
        inow = (i.get("name") or n) if i.get("act") is not False else (i.get("now") or [None])[0]
        c = "none" if not i else "inactive" if i.get("act") is False else kind(inow, acc)
        if c:
            out["inat"].setdefault(c, []).append(f"{n}: iNaturalist {inow}, WoRMS {acc}")
        out["stale"] += [f"{n}: {f[len('stale: '):]}" for f in o.get("flags") or [] if f.startswith("stale: ")]
    return out


def report_species(name, sec, rep, changes):
    """The report of a subject whose unit is the species: counts, then every line."""
    game = rep.get("game") or []
    print(f"[{name}] {len(sec['gen'])} genera, {len(sec['species'])} species ({len(game)} in the game), "
          f"{len(sec['old'])} former genus names, {len(sec['spp'])} species rows; data of {sec['refreshed']}")
    print(f"changes since the last refresh: {len(changes)}")
    for c in changes:
        print("  " + c)
    C = classes(sec, game)
    for part, title in (("worms", "species in the game whose name WoRMS writes otherwise"),
                        ("inat", "species in the game whose iNaturalist name differs from WoRMS's")):
        print(f"{title}: {sum(map(len, C[part].values()))} (" + ", ".join(f"{k} {len(v)}" for k, v in sorted(C[part].items())) + ")")
        for k, v in sorted(C[part].items()):
            for x in v:
                print(f"  {k}: {x}")
    print(f"species in the game where the subject's file is behind WoRMS: {len(C['stale'])}")
    for x in C["stale"]:
        print("  " + x)
    fl = [(n, f) for n, o in sec["gen"].items() for f in o.get("flags") or []]
    print(f"genus flags (reported, never applied: rule C1): {len(fl)}")
    for n, f in fl:
        print(f"  {n}: {f}")
    src = {}
    for k, r in sec["spp"].items():
        for s in r["src"]:
            src[s] = src.get(s, 0) + 1
    print(f"species rows: {len(sec['spp'])} (" + ", ".join(f"{k} {v}" for k, v in sorted(src.items())) + ")")
    print(f"photo names that are not their species' WoRMS name and get no row: {len(rep['photos'])}")
    for x in rep["photos"]:
        print("  " + x)


# ---------------------------------------------------------------- file

def dumps(o):
    return json.dumps(o, ensure_ascii=False, separators=(",", ":"))


def render(o):
    """One top-level key per line, and in each subject one genus, former name, species row, watched item or log line
    per line (the tools/datajson.py layout: two refreshes touching different genera merge cleanly)."""
    L = ["{", f'"v":{o["v"]},', f'"doc":{dumps(o["doc"])},', '"refs":{']
    L.append(",\n".join(f"{dumps(k)}:{dumps(v)}" for k, v in o["refs"].items()))
    subs = [k for k in o if k not in ("v", "doc", "refs")]
    L.append("}" + ("," if subs else ""))
    for j, s in enumerate(subs):
        sec = o[s]
        L.append(f"{dumps(s)}:{{")
        L.append(f'"refreshed":{dumps(sec["refreshed"])},')
        for part in ("gen", "species", "old", "spp"):
            if part not in sec:  # species: only a subject whose unit is the species
                continue
            L.append(f'"{part}":{{')
            L.append(",\n".join(f"{dumps(k)}:{dumps(v)}" for k, v in sec[part].items()))
            L.append("},")
        for part, last in (("watch", False), ("log", True)):
            L.append(f'"{part}":[')
            L.append(",\n".join(dumps(x) for x in sec[part]))
            L.append("]" + ("" if last else ","))
        L.append("}" + ("," if j < len(subs) - 1 else ""))
    L.append("}")
    return "\n".join(x for x in L if x != "") + "\n"


def load(path=OUT):
    return json.loads(Path(path).read_text(encoding="utf-8")) if Path(path).exists() else None


def check(path=OUT, names_path=NAMES):
    """Offline: the layout, data/names.json in step, and every genus with the role and `app` data.json and core.js give it
    now."""
    errs = []
    text = Path(path).read_text(encoding="utf-8")
    o = json.loads(text)
    if render(o) != text:
        errs.append(f"{path.name}: not in the layout taxonomy.py writes (run python3 tools/taxonomy.py --offline)")
    names = Path(names_path)
    if not names.exists() or names.read_text(encoding="utf-8") != render_names(names_extract(o)):
        errs.append(f"{names.name}: not in step with {path.name} (run python3 tools/taxonomy.py --names)")
    for s, sub in SUBJECTS.items():
        if s not in o:
            errs.append(f"no section {s}")
            continue
        inp = sub["inputs"]()
        G, F, src = inp["genera"], o[s]["gen"], sub["src"]
        n0 = len(errs)
        for n in sorted(set(G) - set(F)):
            errs.append(f"{s}: {n} is in {src}, not in taxonomy.json")
        for n in sorted(set(F) - set(G)):
            errs.append(f"{s}: {n} is in taxonomy.json, no longer in {src}")
        for n in sorted(set(G) & set(F)):
            for k in ("role", "app"):
                if F[n].get(k) != G[n][k]:
                    errs.append(f"{s}: {n} {k}: taxonomy.json {F[n].get(k)}, {src} {G[n][k]}")
        if "species" in inp:  # every species of the subject's file, under its id (the rest is the refresh's snapshot)
            A, B = inp["species"], o[s].get("species") or {}
            for n in sorted(set(A) - set(B)):
                errs.append(f"{s}: species {n} is in {src}, not in taxonomy.json")
            for n in sorted(set(B) - set(A)):
                errs.append(f"{s}: species {n} is in taxonomy.json, no longer in {src}")
            for n in sorted(set(A) & set(B)):
                if (B[n].get("app") or {}).get("id") != A[n]["app"].get("id"):
                    errs.append(f"{s}: species {n} id: taxonomy.json {(B[n].get('app') or {}).get('id')}, {src} {A[n]['app'].get('id')}")
        if len(errs) > n0:
            errs.append(f"{s}: run python3 tools/taxonomy.py --subject {s} (it asks WoRMS and iNaturalist for what is new)")
    return errs


# ---------------------------------------------------------------- data/names.json, the admin's extract

NAMES_DOC = ("The admin's extract of tools/taxonomy.json, written by tools/taxonomy.py (never by hand): the admin flags a "
             "photo or candidate whose name is a former combination, a moved genus or an iNaturalist spelling WoRMS "
             "writes otherwise (presence.js nameFlag). Flags only: nothing is renamed (rule C1). worms: each genus's "
             "WoRMS id and family, for the WoRMS view of Photos › Tree.")


def names_extract(o):
    """data/names.json from taxonomy.json: per subject, its species rows ({now, iname?, inat?}) and its former genus names
    that are no longer a genus of their own ({name: the genus accepted now}: WoRMS's, else iNaturalist's single current
    taxon; Favia or Montastraea, still accepted genera that lost species, are left out), and each genus's WoRMS AphiaID
    and family ({genus: {id, fam}}, the Tree's WoRMS view; a genus with no WoRMS record or family is left out, and the
    view reports it)."""
    out = {"v": 1, "doc": NAMES_DOC}
    for s in (k for k in o if k not in ("v", "doc", "refs")):
        sec = o[s]
        gen = {}
        for n, r in sec.get("old", {}).items():
            w, i = r.get("worms") or {}, r.get("inat") or {}
            now = w.get("now") if w else (i["now"][0] if len(i.get("now") or []) == 1 else None)
            if now and now != n:
                gen[n] = now
        out[s] = {"date": max((d for d in (sec.get("refreshed") or {}).values() if d), default=None),
                  "sp": {k: {f: r[f] for f in ("now", "iname", "inat") if f in r} for k, r in sec.get("spp", {}).items()},
                  "gen": gen}
        if (SUBJECTS.get(s) or {}).get("names_worms", True):  # a subject whose Tree reads its own file has none
            out[s]["worms"] = {n: {"id": w["id"], "fam": w["fam"]} for n, w in
                               ((n, r.get("worms") or {}) for n, r in sec.get("gen", {}).items()) if w.get("id") and w.get("fam")}
    return out


def render_names(o):
    """One species row or former genus per line, as taxonomy.json."""
    L = ["{", f'"v":{o["v"]},', f'"doc":{dumps(o["doc"])}' + ("," if len(o) > 2 else "")]
    subs = [k for k in o if k not in ("v", "doc")]
    for j, s in enumerate(subs):
        sec = o[s]
        L += [f"{dumps(s)}:{{", f'"date":{dumps(sec["date"])},', '"sp":{']
        L.append(",\n".join(f"{dumps(k)}:{dumps(v)}" for k, v in sec["sp"].items()))
        L += ["},", '"gen":{']
        L.append(",\n".join(f"{dumps(k)}:{dumps(v)}" for k, v in sec["gen"].items()))
        if "worms" in sec:
            L += ["},", '"worms":{']
            L.append(",\n".join(f"{dumps(k)}:{dumps(v)}" for k, v in sec["worms"].items()))
        L += ["}", "}" + ("," if j < len(subs) - 1 else "")]
    L.append("}")
    return "\n".join(x for x in L if x != "") + "\n"


# ---------------------------------------------------------------- readers, for the other tools

_FILE = {}


def section(subject, path=OUT):
    """The subject's section of taxonomy.json ({} for a subject the file does not hold)."""
    key = str(path)
    if key not in _FILE:
        _FILE[key] = load(path) or {}
    return _FILE[key].get(subject) or {}


def inat_taxon(genus, subject="coral", path=OUT):
    """The iNaturalist taxon a photo search asks for a genus: taxonomy.json gen.<genus>.inat.id (ROADMAP "Taxonomy
    reference", Pierre 2026-11-05, Q49), so no search by name and no homonym guard (the Astrea snail, the plant). None
    when the file does not hold the genus (a genus new in data.json: run tools/taxonomy.py) or its taxon is inactive
    (the refresh flags it): the caller says so and skips the genus. Another taxon for a genus (a wider IMR concept, the
    Astrea question) comes only by Pierre's decision."""
    i = ((section(subject, path).get("gen") or {}).get(genus) or {}).get("inat") or {}
    return i["id"] if i.get("id") and i.get("act") is not False else None


def aliases(name, subject="coral", path=OUT):
    """The names a species row of taxonomy.json ties to `name`: the name itself, the name WoRMS accepts now (a former
    combination, a moved genus, another spelling) and iNaturalist's spelling of it. Just the name when the file has no
    row for it."""
    r = (section(subject, path).get("spp") or {}).get(name) or {}
    return [x for x in dict.fromkeys([name, r.get("now"), r.get("iname")]) if x]


BUILD = {"genus": build, "species": build_species}  # by SUBJECTS unit
REPORT = {"genus": report, "species": report_species}


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--offline", action="store_true")
    ap.add_argument("--refresh", action="store_true")
    ap.add_argument("--dry", action="store_true")
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--names", action="store_true")
    ap.add_argument("--subject", action="append", choices=sorted(SUBJECTS),
                    help="refresh only this subject's section (repeatable); the others are kept as they are")
    a = ap.parse_args()
    if a.names:
        NAMES.write_text(render_names(names_extract(load())), encoding="utf-8")
        print(f"wrote {NAMES.relative_to(ROOT)}")
        return
    if a.check:
        errs = check()
        for e in errs:
            print(e, file=sys.stderr)
        sys.exit(1 if errs else 0)
    o = load()
    if not o:
        sys.exit(f"{OUT.relative_to(ROOT)} missing: it holds the hand-kept parts (refs, watch, old names)")
    net = Net(a.offline, a.refresh)
    signal.signal(signal.SIGTERM, lambda *_: sys.exit(143))  # a stopped run keeps the replies it already has
    try:
        for s, sub in SUBJECTS.items():
            if a.subject and s not in a.subject:
                continue
            prev = o.get(s) or {}
            sec, rep = BUILD[sub["unit"]](sub, sub["inputs"](), net.get, prev, net.dates)
            date = max(d for d in sec["refreshed"].values() if d)
            changes = log_changes(sec, prev, date)
            REPORT[sub["unit"]](s, sec, rep, changes)
            o[s] = sec
    finally:
        if not a.offline:
            net.save()
    if not a.dry:
        OUT.write_text(render(o), encoding="utf-8")
        NAMES.write_text(render_names(names_extract(o)), encoding="utf-8")
        print(f"wrote {OUT.relative_to(ROOT)} ({len(render(o).encode()) // 1024} KB) and {NAMES.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
