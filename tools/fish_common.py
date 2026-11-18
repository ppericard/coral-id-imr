#!/usr/bin/env python3
"""Curated common names of the fish species, 1 to 3 each (Pierre, 2026-11-04, docs/FISH_PATH.md "Common names: a short
curated list per species": "1 to 3 well-used common names, never more, never a full reference list"). Published
without his prior check (Pierre, 2026-11-08, Q313: "Publie, je corrige à l'usage"): tools/build_fish.py writes the lists
into fish.json (species `cn`, `cni`, `cnr`), and he corrects them in use.

Which name comes first (Pierre, 2026-11-15, Q376, on the questions of
docs/reviews/2026-11-15-common-name-sources-study.md): (a) the main name, iNaturalist's default English name (FishBase's
main name where iNaturalist has none), first for every player but an IMR one, who sees the IMR name first; both always
accepted; (b) the main name fills the species' one unit (Q362), any other listed name is accepted and credits it too;
(c) the regional standard names (the Australian ones) are accepted when typed, never shown.

Sources (every name keeps the sources it was found in):
- pdf: the IMR reference PDF's common name (fish.json `common`, "as in the PDF, never corrected": rules C1 and
  S2); slides, dauin, wink instead for a species not in the PDF (fish.json species `src`: the IMR presentation, the
  Dauin sources of circle 3, a wink).
- fb: FishBase (Froese & Pauly, eds., www.fishbase.org; the rfishbase snapshot v25.04 of its tables `species` (FBname,
  the FishBase main English name) and `comnames` (every English common name with the country or reference it was
  recorded for), via https://huggingface.co/datasets/cboettig/fishbase, CC BY-NC); fbMain = FBname, fbN = the number
  of English records of that name for the species (countries / references: how widely it is used).
- inat: iNaturalist's taxon names (api.inaturalist.org /v1/taxa, all_names, English lexicon); inatMain = the default
  English name (preferred_common_name, locale en); inat:Australia = the default English name under the Australia
  place preference (preferred_place_id 6744: the Australian standard names, Swallowtail Puller), kept when it is not
  the default itself.

Selection, at most 3 names (names compared without case, spaces, hyphens or apostrophe style):
1. the main name: iNaturalist's default English name, else FishBase's main English name, else fish.json `common`;
2. fish.json `common` (the PDF name, IMR's wording, rule C1; or its slides, Dauin or wink source), when not the main
   name already;
3. the FishBase main English name and the iNaturalist default English name, when not already listed (each is the main
   name of a major public reference), but only when it recurs: found in both FishBase (its main name counts, with or
   without a comnames record) and iNaturalist;
(no other name: Pierre, 2026-11-05, dropped the rule that added a name recorded 3+ times by FishBase).
Order, deterministic: the main name first, then the species' own name, then the most shared: found in the most
references, then the main name of the most, then the most FishBase records, then FishBase's main name before
iNaturalist's, then by name. `imr`: the place of the IMR name (the PDF's or the IMR presentation's) in the list, for
the players at IMR. `regional`: the regional names not listed (accepted when typed only), dropped where another game
species has that name or a spelling of it (`dropped`, `regional`).
Spellings of one name count as one name (2 letters apart at most, a trailing "fish", or one the other's first words:
Pearl-scaled / Pearlscale angelfish, Neon damsel / damselfish, Indo-Pacific sergeant / sergeant major; a spelling
that links two groups merges them): the form shown
is the PDF's, else FishBase's main, else its most recorded; the others are kept in `alt` (to accept when typed). A main
name of either reference that is not proposed is listed in `left`.
A species with no name of its own whose main name is in one reference only is flagged (`single`); a species no
reference names keeps none (Pierre, 2026-11-08, Q247: it has no common-name unit; a name is never invented). Two
species may carry the same common name (Pierre, 2026-11-15, Q381, replacing Q319's ownership rule): a name proposed for
two game species, any of its spellings counted, stays on both, a main name too (iNaturalist's default "Longnose
butterflyfish" of Forcipiger longirostris is also F. flavissimus's IMR name), flagged `shared` with the other species and
listed in the file's top-level `shared` (name -> species ids); the app keeps two choices of one label apart, accepts the
name typed for the species asked, and the species sheet says "Also used for …". The summary
lists every main name that changed and every name newly listed, to look at before it ships. Spelling and capitals: FishBase's
form when it has the name (sentence case: "Ternate chromis"), else iNaturalist's with the words after the first in
lower case unless capitalised in a FishBase name of these species (a person or place: "Bennett's"). A PDF name flagged
`check` in fish.json (a likely slip) shows FishBase's spelling, the PDF form kept in alt (accepted when typed; Pierre,
2026-11-05).

Usage:
  python3 tools/fish_common.py --inat               iNaturalist names of every game species (about 1 request a second,
                                                     30 taxa a request) into tools/fish_common_src.json, then
                                                     --regional
  python3 tools/fish_common.py --regional           the regional names alone (REGIONS, the same pacing)
  python3 tools/fish_common.py --fishbase DIR      FishBase names from DIR/species.parquet and DIR/comnames.parquet
                                                     (needs pyarrow) into tools/fish_common_src.json
  python3 tools/fish_common.py                      offline: the selection, tools/fish_common.json, and a summary
  python3 tools/fish_common.py --check              fail when tools/fish_common.json is not what the selection gives
"""
import argparse
import json
import re
import sys
import time
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import inat  # noqa: E402  (the one paced, retried iNaturalist client; rule C7)

ROOT = Path(__file__).resolve().parent.parent
FISH = ROOT / "fish.json"
SRC = ROOT / "tools" / "fish_common_src.json"
OUT = ROOT / "tools" / "fish_common.json"
API = "https://api.inaturalist.org/v1/taxa/"
MAX = 3
OWN = ("pdf", "slides", "dauin", "wink")  # fish.json `common` by its species' src: kept as written, always listed
IMR = ("pdf", "slides")  # the IMR names among them (the reference PDF, the IMR fish presentation): `imr`
REGIONS = {"Australia": 6744}  # iNaturalist places whose preferred English name is a regional standard


def norm(name):
    return re.sub(r"[\s\-‐‑'’`]", "", name.lower())


def game_species():
    f = json.loads(FISH.read_text())
    return [s for s in f["species"] if s.get("circle")]


def load_src():
    return json.loads(SRC.read_text()) if SRC.exists() else {"_doc": __doc__.split("\n\n")[0], "species": {}}


def save_src(src):
    """One species per line, so a refetch shows as a readable diff."""
    src["species"] = dict(sorted(src["species"].items()))
    rows = []
    for k, v in src.items():
        if k == "species":
            rows.append(f' "species": {{\n' + ",\n".join(
                f"  {json.dumps(i)}: {json.dumps(r, ensure_ascii=False, separators=(',', ':'))}" for i, r in v.items()) + "\n }")
        else:
            rows.append(f" {json.dumps(k)}: {json.dumps(v, ensure_ascii=False)}")
    SRC.write_text("{\n" + ",\n".join(rows) + "\n}\n")


def get(url):
    """Through tools/inat.py: about one request a second, the project's User-Agent, 429 / 5xx retried after a pause."""
    try:
        return inat.get(url)
    except (OSError, ValueError) as e:
        sys.exit(f"iNaturalist did not answer: {url} ({e})")


def fetch_inat():
    src = load_src()
    sp = game_species()
    by = {}
    for s in sp:
        by.setdefault(s["inat"], []).append(s["id"])
    ids = list(by)
    for i in range(0, len(ids), 30):
        d = get(API + ",".join(map(str, ids[i:i + 30])) + "?all_names=true&locale=en&per_page=30")
        for r in d["results"]:
            eng = [n["name"] for n in sorted(r.get("names", []), key=lambda n: n.get("position", 0))
                   if (n.get("lexicon") or "").lower() == "english" and n.get("is_valid", True)]
            for sid in by.get(r["id"], []):
                rec = src["species"].setdefault(sid, {})
                rec["inat"] = {"id": r["id"], "main": r.get("preferred_common_name"), "names": eng}
        print(f"  iNaturalist: {min(i + 30, len(ids))} / {len(ids)} taxa", file=sys.stderr)
    save_src(src)


def fetch_regional():
    """The regional standard names (Pierre, 2026-11-15, Q376 (c): accepted when typed, never shown first): iNaturalist's
    default English name of each game taxon under a region's place preference (REGIONS: Australia, whose names are the
    Australian Fish Names Standard AS 5300 / Fishes of Australia ones: Swallowtail Puller, Headband Humbug), batched 30
    taxa a request. Kept in tools/fish_common_src.json species inat.place {region: name} only when it is not the default
    name itself."""
    src = load_src()
    by = {}
    for s in game_species():
        by.setdefault(s["inat"], []).append(s["id"])
    ids = list(by)
    for sid in [i for L in by.values() for i in L]:
        (src["species"].setdefault(sid, {}).get("inat") or {}).pop("place", None)
    for region, place in REGIONS.items():
        for i in range(0, len(ids), 30):
            d = get(API + ",".join(map(str, ids[i:i + 30])) + f"?locale=en&preferred_place_id={place}&per_page=30")
            for r in d["results"]:
                nm = r.get("preferred_common_name")
                for sid in by.get(r["id"], []):
                    rec = src["species"].setdefault(sid, {}).get("inat")
                    if rec and nm and norm(nm) != norm(rec.get("main") or ""):
                        rec.setdefault("place", {})[region] = nm
            print(f"  iNaturalist, {region}: {min(i + 30, len(ids))} / {len(ids)} taxa", file=sys.stderr)
    src["regional"] = "iNaturalist /v1/taxa preferred_common_name under preferred_place_id " + ", ".join(
        f"{p} ({r})" for r, p in REGIONS.items())
    save_src(src)


def fetch_fishbase(d):
    import pyarrow.parquet as pq  # only for this step

    d = Path(d)
    spt = pq.read_table(d / "species.parquet", columns=["SpecCode", "Genus", "Species", "FBname"]).to_pylist()
    code = {f"{r['Genus']} {r['Species']}".lower(): r for r in spt}
    src = load_src()
    want = {}
    for s in game_species():
        for nm in [s["name"], s.get("now")] + list(s.get("syn") or []):
            if nm and nm.lower() in code:
                want[s["id"]] = (code[nm.lower()], nm)
                break
    codes = {r["SpecCode"] for r, _ in want.values()}
    cn = pq.read_table(d / "comnames.parquet", columns=["SpecCode", "ComName", "Language", "C_Code"]).to_pylist()
    eng = {}
    for r in cn:
        if r["SpecCode"] in codes and (r["Language"] or "").strip().lower() == "english" and r["ComName"]:
            eng.setdefault(r["SpecCode"], {}).setdefault(r["ComName"].strip(), set()).add(r["C_Code"])
    for s in game_species():
        rec = src["species"].setdefault(s["id"], {})
        if s["id"] not in want:
            rec["fb"] = None
            continue
        r, nm = want[s["id"]]
        names = eng.get(r["SpecCode"], {})
        rec["fb"] = {"code": r["SpecCode"], "as": nm, "main": r["FBname"],
                     "names": sorted(([n, len(c)] for n, c in names.items()), key=lambda x: (-x[1], x[0]))}
    src["fishbase"] = "rfishbase snapshot v25.04 (huggingface.co/datasets/cboettig/fishbase), tables species and comnames"
    save_src(src)
    print(f"FishBase: {len(want)} of {len(game_species())} game species matched", file=sys.stderr)


def lev(a, b):
    if abs(len(a) - len(b)) > 2:
        return 3
    prev = list(range(len(b) + 1))
    for i, x in enumerate(a, 1):
        cur = [i]
        for j, y in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (x != y)))
        prev = cur
    return prev[-1]


def words(name):
    return [re.sub(r"fish$", "", w) for w in re.split(r"[\s\-‐‑]+", re.sub(r"['’`]", "", name.lower())) if w]


def variant(a, b):
    """Two spellings of one name: 2 letters apart at most (Pearl-scaled / Pearlscale, Ringtailed / Ringtail), the same
    words but for a trailing "fish" (Neon damsel / Neon damselfish), or one the other's first words (Indo-Pacific
    sergeant / Indo-Pacific sergeant major)."""
    if lev(norm(a), norm(b)) <= 2:
        return True
    wa, wb = words(a), words(b)
    if wa == wb:
        return True
    short, long_ = sorted((wa, wb), key=len)
    return len(short) >= 2 and long_[: len(short)] == short


def select():
    src = load_src()["species"]
    sp = game_species()
    caps = set()  # words FishBase capitalises inside a sentence-case name (a person or a place: Bennett's, Moluccan)
    for s in sp:
        fb = (src.get(s["id"]) or {}).get("fb") or {}
        for n in [fb.get("main") or ""] + [x[0] for x in fb.get("names", [])]:
            w = n.split()[1:]
            if w and not all(x[:1].isupper() for x in w):
                caps.update(x for x in w if x[:1].isupper())

    def tidy(n):
        w = n.split()
        return " ".join([w[0][:1].upper() + w[0][1:]] + [x if x in caps else x.lower() for x in w[1:]])

    out = {}
    for s in sp:
        rec = src.get(s["id"]) or {}
        fb = rec.get("fb") or {}
        inat = rec.get("inat") or {}
        fbForm = {}
        fbRec = {}
        for n, k in fb.get("names", []):
            fbForm.setdefault(norm(n), n)
            fbRec[norm(n)] = fbRec.get(norm(n), 0) + k
        groups = []  # one per name, its spellings merged: {name, alt, own, fbMain, inatMain, fb (records), inat, reg}

        def add(name, **tags):
            if not name:
                return
            hit = [g for g in groups if any(variant(name, x) for x in [g["name"]] + g["alt"])]
            if not hit:
                g = {"name": name, "alt": [], "own": False, "fbMain": False, "inatMain": False, "fb": 0, "inat": False,
                     "reg": False}
                groups.append(g)
            else:
                # A spelling of two groups links them: one name (Striate anglerfish / Striped angler).
                g = hit[0]
                for o in hit[1:]:
                    g["alt"] += [x for x in [o["name"]] + o["alt"] if norm(x) not in [norm(y) for y in [g["name"]] + g["alt"]]]
                    for k in ("own", "fbMain", "inatMain", "inat", "reg"):
                        g[k] = g[k] or o[k]
                    g["fb"] += o["fb"]
                    groups.remove(o)
                if norm(name) not in [norm(x) for x in [g["name"]] + g["alt"]]:
                    g["alt"].append(name)
            for k, v in tags.items():
                g[k] = g[k] + v if k == "fb" else (g[k] or v)

        if s.get("common"):
            add(s["common"], own=s.get("src", "pdf"))
        if fb.get("main"):
            add(fb["main"], fbMain=True)
        for k, n in fbForm.items():
            add(n, fb=fbRec[k])
        if inat.get("main"):
            add(fbForm.get(norm(inat["main"])) or tidy(inat["main"]), inatMain=True, inat=True)
        for n in inat.get("names", []):
            add(fbForm.get(norm(n)) or tidy(n), inat=True)
        for region, n in sorted((inat.get("place") or {}).items()):
            add(fbForm.get(norm(n)) or tidy(n), inat=True, reg=region)
        for g in groups:
            # The form shown: the species' own (PDF) name as written, else FishBase's main name, else its most recorded
            # spelling; the other spellings stay as alt (accepted when typed).
            # A PDF name flagged as a likely slip (fish.json `check`) shows FishBase's spelling instead, the PDF form kept
            # in alt so it is still accepted when typed.
            if g["own"] and not (s.get("check") and g["alt"]):
                continue
            forms = [g["name"]] + g["alt"]
            best = max(forms, key=lambda f: (norm(f) == norm(fb.get("main") or ""), fbRec.get(norm(f), 0)))
            g["alt"] = [f for f in forms if f != best]
            g["name"] = best

        def keep(g):
            # A name besides the species' own: one that recurs in both references (FishBase and iNaturalist), the main
            # name of one of them.
            # FishBase's main name is FishBase evidence even with no comnames record (Chromis agilis). No third rule for
            # other recorded names: only the main names of the two references.
            return (g["fb"] > 0 or g["fbMain"]) and g["inat"] and (g["fbMain"] or g["inatMain"])

        # The main name, shown first to every player but an IMR one: iNaturalist's
        # default English name, else FishBase's main name, else the species' own name. The order, deterministic: the
        # main name first, then the species' own (its IMR name, rule C1, or its Dauin or wink source's), then the most
        # shared: in the most references (FishBase, iNaturalist), then the main name of the most, then the most FishBase
        # records, then FishBase's main name before iNaturalist's, then by name.
        main = (next((g for g in groups if g["inatMain"]), None) or next((g for g in groups if g["fbMain"]), None)
                or next((g for g in groups if g["own"]), None))
        rank = sorted(groups, key=lambda g: (g is not main, not g["own"], -((g["fb"] > 0 or g["fbMain"]) + g["inat"]),
                                             -(g["fbMain"] + g["inatMain"]), -g["fb"], not g["fbMain"], norm(g["name"])))
        pick = [g for g in rank if g is main or g["own"] or keep(g)][:MAX]
        # No name of its own and its main name in one reference only: flagged (Nudiantennarius subteres).
        single = bool(pick) and not any(g["own"] for g in pick) and not keep(main)

        def entry(g):
            e = {"name": g["name"], "from": [x for x in (g["own"] or None, "fbMain" if g["fbMain"] else None,
                                                          f"fb{g['fb']}" if g["fb"] else None,
                                                          "inatMain" if g["inatMain"] else None,
                                                          "inat" if g["inat"] and not g["inatMain"] else None,
                                                          f"inat:{g['reg']}" if g["reg"] else None) if x]}
            if g["alt"]:
                e["alt"] = g["alt"]
            return e

        o = {"sp": s["name"], "names": [entry(g) for g in pick]}
        # The regional standard names: a region's iNaturalist name not listed, accepted when typed only, in
        # the region's own form first (not a FishBase spelling of it: "Swallow-tail puffer").
        regional = []
        for g in rank:
            if g["reg"] and g not in pick:
                e = entry(g)
                n = inat["place"][g["reg"]]
                f = next((x for x in [e["name"]] + e.get("alt", []) if norm(x) == norm(fbForm.get(norm(n)) or tidy(n))), e["name"])
                e["name"], alt = f, [x for x in [e["name"]] + e.get("alt", []) if x != f]
                e.pop("alt", None)
                if alt:
                    e["alt"] = alt
                regional.append(e)
        if regional:
            o["regional"] = regional
        left = [g["name"] for g in rank if g not in pick and (g["fbMain"] or g["inatMain"])]
        if left:
            o["left"] = left  # a main name of FishBase or iNaturalist not proposed (not in both, or over 3)
        if single:
            o["single"] = True  # one reference only
        if s.get("check"):
            o["check"] = s["check"]
        if not fb:
            o["noFishBase"] = True
        out[s["id"]] = o
    # Shared names: one name, two game species or more. Two species may carry the same common name: nothing is dropped
    # for it, each keeps every name its selection gives, a main name too (iNaturalist's default "Longnose butterflyfish" of Forcipiger longirostris
    # is also the IMR name of F. flavissimus). Every spelling counts, the accepted ones (alt) too. Each name shared is
    # flagged `shared` with the other species, and listed in `shared()` (name -> species ids): the app keeps two choices
    # of one label apart, accepts it typed for the species asked, and the sheet says "Also used for …".
    def spell(n):
        return {norm(x) for x in [n["name"]] + n.get("alt", [])}

    def shared(key="names"):
        seen = {}
        for sid, o in out.items():
            for n in o.get(key, []):
                for k in spell(n):
                    if sid not in seen.setdefault(k, []):
                        seen[k].append(sid)
        return seen

    listed = shared()
    for k, ids in listed.items():
        if len(ids) < 2:
            continue
        for sid in ids:
            for n in out[sid]["names"]:
                if k in spell(n):
                    n["shared"] = sorted(set(n.get("shared", [])) | {out[i]["sp"] for i in ids if i != sid})
    # A regional name is only an accepted extra: dropped where another game species lists it, a spelling of it (Pinstripe
    # / Pinstriped wrasse), or has it as a regional name too (a typed name never takes a species' listed name from it).
    every = [(i, x) for i, o in out.items() for key in ("names", "regional") for n in o.get(key, [])
             for x in [n["name"]] + n.get("alt", [])]
    for sid, o in out.items():
        for n in list(o.get("regional", [])):
            other = sorted({out[i]["sp"] for i, x in every if i != sid and any(variant(x, y) for y in [n["name"]] + n.get("alt", []))})
            if other:
                o["regional"].remove(n)
                o.setdefault("dropped", []).append({"name": n["name"], "sharedWith": other, "regional": True})
        if "regional" in o and not o["regional"]:
            del o["regional"]
    # The main name first, among the names kept: iNaturalist's default, else FishBase's main name, else the species' own;
    # the others in their order. The IMR name, marked (shown first to a player at IMR): its place in the list.
    for o in out.values():
        L = o["names"]
        m = next((n for t in ("inatMain", "fbMain") for n in L if t in n["from"]), None) or next(
            (n for n in L if any(t in OWN for t in n["from"])), None)
        if m and m is not L[0]:
            L.remove(m)
            L.insert(0, m)
        i = next((i for i, n in enumerate(o["names"]) if any(t in IMR for t in n["from"])), None)
        if i is not None:
            o["imr"] = i
    return out


def shared_names(out):
    """The names two game species or more list (Q381: allowed, never dropped), name -> their species ids: every form
    shown of a name flagged `shared` (a spelling shared counts: Blackstripe / Blackstriped cardinalfish), sorted."""
    by = {}
    for sid, o in out.items():
        for n in o["names"]:
            if n.get("shared"):
                by.setdefault(n["name"], set()).add(sid)
                by[n["name"]] |= {i for i, p in out.items() if p["sp"] in n["shared"]}
    return {k: sorted(by[k]) for k in sorted(by, key=norm)}


def shared_groups(out):
    """The shared names counted as names, not forms: the forms of shared_names that share a spelling make one (Twotone /
    Two-tone wrasse). [(forms, species ids)]."""
    groups = []
    for sid, o in out.items():
        for n in o["names"]:
            if not n.get("shared"):
                continue
            keys = {norm(x) for x in [n["name"]] + n.get("alt", [])}
            ids = {sid} | {i for i, p in out.items() if p["sp"] in n["shared"]}
            hit = [g for g in groups if g[0] & keys]
            for g in hit:
                groups.remove(g)
                keys |= g[0]
                ids |= g[2]
            forms = {n["name"]}.union(*[g[1] for g in hit])
            groups.append((keys, forms, ids))
    return [(sorted(f), sorted(i)) for _, f, i in groups]


def write(out, check):
    doc = ("Curated common names per fish species (1 to 3, the main name first, then the species' own, then the most "
           "shared; published, Pierre corrects them in use: Q313; the main name and the IMR name: Q376), written into "
           "fish.json species cn (names), cni (imr) and cnr (regional) by tools/build_fish.py: tools/fish_common.py, "
           "docs/FISH_PATH.md \"Common names\". from: pdf = IMR reference PDF (fish.json common), dauin = circle 3's source "
           "name, fbMain = FishBase main English name, fbN = FishBase English records of the name (countries / references), "
           "inatMain = iNaturalist default English name, inat = another iNaturalist English name, inat:Australia = "
           "iNaturalist's name under the Australia place (a regional standard name). imr = the IMR name's place in names; "
           "regional = regional names accepted when typed only; shared (on a name) = the other game species that list it. "
           "Top-level shared: every name two game species or more list, name -> species ids (Q381: allowed).")
    body = "{\n" + f' "_doc": {json.dumps(doc)},\n "shared": {json.dumps(shared_names(out), ensure_ascii=False)},\n "species": {{\n' + ",\n".join(
        f"  {json.dumps(k)}: {json.dumps(v, ensure_ascii=False, separators=(',', ':'))}" for k, v in out.items()) + "\n }\n}\n"
    if check:
        if not OUT.exists() or OUT.read_text() != body:
            sys.exit("tools/fish_common.json is not what the selection gives: run python3 tools/fish_common.py")
        print("tools/fish_common.json: OK")
        return
    OUT.write_text(body)


def summary(out, before):
    """The counts, then every change of a main name against the file as it was (before), to look at before it ships (a
    refetch can change iNaturalist's default names: the 2026-11-15 study §7.1), and every name newly on a species."""
    from collections import Counter
    n = Counter(len(o["names"]) for o in out.values())
    print(f"{len(out)} game species; names per species: " + ", ".join(f"{k}: {n[k]}" for k in sorted(n)))
    print(f"  PDF name kept: {sum(1 for o in out.values() if any('pdf' in x['from'] for x in o['names']))}; "
          f"IMR name not the main name: {sum(1 for o in out.values() if o.get('imr'))}; "
          f"no FishBase match: {sum(1 for o in out.values() if o.get('noFishBase'))}; "
          f"shared names (Q381): {len(shared_groups(out))} in {sum(1 for o in out.values() for x in o['names'] if x.get('shared'))} "
          f"species' lists; "
          f"regional names: {sum(len(o.get('regional', [])) for o in out.values())} "
          f"({sum(1 for o in out.values() for d in o.get('dropped', []) if d.get('regional'))} dropped, shared)")

    def spells(o, key="names"):
        return {norm(y) for x in o.get(key, []) for y in [x["name"]] + x.get("alt", [])}
    moved = [(k, (before.get(k) or {}).get("names", [{}])[0].get("name"), o["names"][0]["name"]) for k, o in out.items()
             if o["names"] and (before.get(k) or {}).get("names") and before[k]["names"][0]["name"] != o["names"][0]["name"]]
    if moved:
        print(f"  main name changed: {len(moved)}")
        for k, a, b in moved:
            print(f"    {k} {out[k]['sp']}: {a} -> {b}")
    new = [(k, x["name"]) for k, o in out.items() for x in o["names"] if not ({norm(y) for y in [x["name"]] + x.get(
        "alt", [])} & spells(before.get(k) or {}))]
    if new:
        print(f"  names newly listed: {len(new)}")
        for k, x in new:
            others = [o["sp"] for j, o in out.items() if j != k and norm(x) in spells(o) | spells(before.get(j) or {})]
            print(f"    {k} {out[k]['sp']}: {x}" + (f" (also {', '.join(others)}: check by hand)" if others else ""))


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--inat", action="store_true")
    ap.add_argument("--regional", action="store_true")
    ap.add_argument("--fishbase", metavar="DIR")
    ap.add_argument("--check", action="store_true")
    a = ap.parse_args()
    if a.inat:
        fetch_inat()
    if a.inat or a.regional:
        fetch_regional()  # after --inat, which writes each taxon's iNaturalist record afresh
    if a.fishbase:
        fetch_fishbase(a.fishbase)
    if a.inat or a.regional or a.fishbase:
        return
    before = json.loads(OUT.read_text()).get("species", {}) if OUT.exists() else {}
    out = select()
    write(out, a.check)
    if not a.check:
        summary(out, before)


if __name__ == "__main__":
    main()
