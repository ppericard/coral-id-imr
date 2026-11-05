#!/usr/bin/env python3
"""Refreshes tools/taxonomy.json, the build-time reference of names: for each genus the app touches, the name each
authority accepts now (WoRMS, iNaturalist), the former genus names, the species rows that pay, and a watch list.

Decided with Pierre, 2026-11-05 (Q49, from docs/reviews/2026-11-05-coral-taxonomy-study.md section 5, its small form):
- **Build time only**: the app never loads it (Pierre: "it must not weigh on the app"). Tools read it, through the
  readers at the end of this file (second PR, docs/ROADMAP.md "Taxonomy reference"): tools/fetch_local.py,
  tools/cand_gaps.py and tools/coral_presence.py search the iNaturalist taxon it gives a genus (`inat_taxon`: no name
  search, no homonym guard), and tools/presence.py matches checklist names through its species rows (`aliases`). The
  admin never loads it either: it reads names.json, the small extract this tool writes beside it (`names_extract`), to
  flag a photo or candidate whose name is a former combination, a moved genus or an iNaturalist spelling WoRMS writes
  otherwise (presence.js nameFlag).
- **It never changes the IMR wording** (rule C1): `app` is copied verbatim from data.json (the family the app
  shows, the IMR lecture's own "formerly..." lines), and a difference from WoRMS is reported, never applied.
- **Watch list** (Q51): the items of taxonomy.json `watch` are reported when WoRMS or iNaturalist moves on them; that
  never changes the app either (rule C1: the app follows IMR's wording).

The file, one section per subject (core.js SUBJECTS ids; only "coral" now, fish later, through SUBJECTS below, with no
subject named in the engine):
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
Hand-kept (the tool reads them and never rewrites them): `refs`, `watch` (but `seen`) and the names in `old`. All the
rest is written by the refresh.

Network: WoRMS REST (batched AphiaRecordsByNames, 50 names a call; children and synonyms by AphiaID, 50 a page) and the
iNaturalist API v1 (the genera and species of the subject's root taxa in bulk, 500 a page; the other taxa by name, with
an ancestor guard against homonyms; details 30 ids a call), sequential, about one request per second for iNaturalist and
0.3 s for WoRMS, a User-Agent naming the app, retries on 429 / 5xx after a pause (Retry-After when given; rule
C7). Every reply is cached in tools/.cache/taxonomy.json (git-ignored): a rerun is offline and writes the same file;
--refresh asks again; --offline fails instead of asking.

names.json (the admin's extract, written with the file, never edited by hand): {"v", "doc", "<subject>": {"date",
  "sp": {species name: {now, iname?, inat?}}: the species rows; "gen": {former genus: the genus WoRMS (else iNaturalist)
  accepts now}: the `old` names that are no longer a genus of their own}}.

Usage: python3 tools/taxonomy.py [--offline | --refresh] [--dry]   (--dry: print the report, leave the files as they are)
       python3 tools/taxonomy.py --names   (offline: write names.json again from taxonomy.json)
       python3 tools/taxonomy.py --check   (offline, no cache needed: the layout, names.json in step, and every genus
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
from datajson import load_all  # noqa: E402  (data.json with the candidates of cand.json)

OUT = ROOT / "tools" / "taxonomy.json"
NAMES = ROOT / "names.json"  # the admin's extract (names_extract)
CACHE = ROOT / "tools" / ".cache" / "taxonomy.json"
CHECKLISTS = ROOT / "tools" / "presence_checklists.json"
V = 1
UA = {"User-Agent": "coral-id-imr/1.0 (IMR Reef ID; tools/taxonomy.py)", "Accept": "application/json"}
WORMS = "https://www.marinespecies.org/rest/"
INAT = "https://api.inaturalist.org/v1/"
PAUSE = {WORMS: 0.3, INAT: 1.0}
WAITS = (5, 15, 30, 60, 120)
BATCH_WORMS, BATCH_INAT, PAGE_INAT = 50, 30, 500
IMR_SAYS = re.compile(r"\bformerly\b|\bnow includes?\b", re.I)  # the IMR lecture's own lines about former names


def coral_inputs():
    """The coral subject's inputs: its genera (data.json gen + x.gen, role from core.js through tools/genera.py, `app`
    verbatim), the photo names (data.json views and more, and every candidate, approved or waiting in cand.json: the
    admin flags a candidate's name too, names.json), the checklist (Corals of the World's Philippine list)."""
    d = load_all(str(ROOT / "data.json"), str(ROOT / "cand.json"))
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


# A subject = where its genera come from and how to recognise its taxa (the fish get an entry later: genera from
# fish.json, phylum Chordata, their own iNaturalist roots and checklist). Nothing below names a subject.
SUBJECTS = {
    "coral": {
        "inputs": coral_inputs,
        "phylum": "Cnidaria",  # WoRMS: records of another phylum are homonyms (Astrea the snail)
        "roots": [47532],  # iNaturalist taxa whose genera and species are listed in bulk (Scleractinia)
        "guard": 47534,  # an iNaturalist ancestor of every taxon of the subject (Cnidaria): the homonym guard elsewhere
    },
}


class Net:
    """GET JSON with a cache ({url: reply}, plus "_dates": {source: the date of its last fetch}); None for an empty
    reply (WoRMS answers 204 when nothing matches) or a 404."""

    def __init__(self, offline=False, refresh=False, path=CACHE, today=None):
        self.offline, self.refresh, self.path, self.new, self.asked = offline, refresh, Path(path), 0, set()
        self.c = json.loads(self.path.read_text(encoding="utf-8")) if self.path.exists() else {}
        self.today = today or time.strftime("%Y-%m-%d")
        self.last = 0.0

    def dates(self):
        return dict(self.c.get("_dates") or {})

    def get(self, url):
        if url in self.c and not (self.refresh and url not in self.asked):
            return self.c[url]
        if self.offline:
            sys.exit(f"--offline: not cached: {url}")
        base = WORMS if url.startswith(WORMS) else INAT
        for k in range(len(WAITS) + 1):
            time.sleep(max(0.0, self.last + PAUSE[base] - time.time()))
            self.last = time.time()
            try:
                with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=90) as r:
                    body = r.read()
                v = json.loads(body) if body.strip() else None
                break
            except urllib.error.HTTPError as e:
                if e.code in (204, 404):
                    v = None
                    break
                if k == len(WAITS) or not (e.code == 429 or e.code >= 500):
                    raise
                ra = (e.headers or {}).get("Retry-After")
                wait = int(ra) if ra and str(ra).isdigit() else WAITS[k]
            except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
                if k == len(WAITS):
                    raise
                wait = WAITS[k]
            print(f"  busy, waiting {wait} s: {url[:100]}", file=sys.stderr)
            time.sleep(wait)
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
    """Changes from section a to section b (gen, old, spp, watch), as short lines."""
    out = []
    for part in ("gen", "old", "spp"):
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
        ch = [f"first build: {len(sec['gen'])} genera, {len(sec['old'])} former genus names, {len(sec['spp'])} species rows, "
              f"{len(sec['watch'])} watched items"]
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
        for part in ("gen", "old", "spp"):
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
    """Offline: the layout, names.json in step, and every genus with the role and `app` data.json and core.js give it
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
        G, F = sub["inputs"]()["genera"], o[s]["gen"]
        for n in sorted(set(G) - set(F)):
            errs.append(f"{s}: {n} is in data.json, not in taxonomy.json")
        for n in sorted(set(F) - set(G)):
            errs.append(f"{s}: {n} is in taxonomy.json, no longer in data.json")
        for n in sorted(set(G) & set(F)):
            for k in ("role", "app"):
                if F[n].get(k) != G[n][k]:
                    errs.append(f"{s}: {n} {k}: taxonomy.json {F[n].get(k)}, data.json / core.js {G[n][k]}")
    return errs


# ---------------------------------------------------------------- names.json, the admin's extract

NAMES_DOC = ("The admin's extract of tools/taxonomy.json, written by tools/taxonomy.py (never by hand): the admin flags a "
             "photo or candidate whose name is a former combination, a moved genus or an iNaturalist spelling WoRMS "
             "writes otherwise (presence.js nameFlag). Flags only: nothing is renamed (rule C1).")


def names_extract(o):
    """names.json from taxonomy.json: per subject, its species rows ({now, iname?, inat?}) and its former genus names
    that are no longer a genus of their own ({name: the genus accepted now}: WoRMS's, else iNaturalist's single current
    taxon; Favia or Montastraea, still accepted genera that lost species, are left out)."""
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
        L += ["}", "}" + ("," if j < len(subs) - 1 else "")]
    L.append("}")
    return "\n".join(x for x in L if x != "") + "\n"


# ---------------------------------------------------------------- readers, for the other tools

_FILE = {}


def section(subject, path=OUT):
    """The subject's section of taxonomy.json ({} for a subject the file does not hold yet: the fish, ROADMAP)."""
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


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--offline", action="store_true")
    ap.add_argument("--refresh", action="store_true")
    ap.add_argument("--dry", action="store_true")
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--names", action="store_true")
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
            prev = o.get(s) or {}
            sec, rep = build(sub, sub["inputs"](), net.get, prev, net.dates)
            date = max(d for d in sec["refreshed"].values() if d)
            changes = log_changes(sec, prev, date)
            report(s, sec, rep, changes)
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
