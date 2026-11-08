#!/usr/bin/env python3
"""Curated common names of the fish species, 1 to 3 each (Pierre, 2026-11-04, docs/FISH_PATH.md "Common names: a short
curated list per species": "1 to 3 well-used common names, never more, never a full reference list"; mastery of a
species' common names needs all its listed names, so every name added makes it harder). Published without his prior
check (Pierre, 2026-11-08, Q313: "Publie, je corrige à l'usage"): tools/build_fish.py writes the lists into fish.json
(species `cn`), and he corrects them in use.

Sources (every name keeps the sources it was found in):
- pdf: the IMR reference PDF's common name (fish.json `common`, "as in the PDF, never corrected": rules C1 and
  S2); slides, dauin, wink instead for a species not in the PDF (fish.json species `src`: the IMR presentation, the
  Dauin sources of circle 3, a wink).
- fb: FishBase (Froese & Pauly, eds., www.fishbase.org; the rfishbase snapshot v25.04 of its tables `species` (FBname,
  the FishBase main English name) and `comnames` (every English common name with the country or reference it was
  recorded for), via https://huggingface.co/datasets/cboettig/fishbase, CC BY-NC); fbMain = FBname, fbN = the number
  of English records of that name for the species (countries / references: how widely it is used).
- inat: iNaturalist's taxon names (api.inaturalist.org /v1/taxa, all_names, English lexicon); inatMain = the default
  English name (preferred_common_name, locale en).

Selection, at most 3 names (names compared without case, spaces, hyphens or apostrophe style):
1. fish.json `common` (the PDF name: IMR's wording first, rule C1; or its slides, Dauin or wink source);
2. the FishBase main English name and the iNaturalist default English name, when not already listed (each is the main
   name of a major public reference), but only when it recurs: found in both FishBase (its main name counts, with or
   without a comnames record) and iNaturalist;
(no other name: Pierre, 2026-11-05, dropped the rule that added a name recorded 3+ times by FishBase).
Order, deterministic: the species' own name first, then the most shared: found in the most references, then the main
name of the most, then the most FishBase records, then FishBase's main name before iNaturalist's, then by name.
Spellings of one name count as one name (2 letters apart at most, a trailing "fish", or one the other's first words:
Pearl-scaled / Pearlscale angelfish, Neon damsel / damselfish, Indo-Pacific sergeant / sergeant major; a spelling
that links two groups merges them): the form shown
is the PDF's, else FishBase's main, else its most recorded; the others are kept in `alt` (to accept when typed). A main
name of either reference that is not proposed is listed in `left`.
A species with no name of its own and none found in both references gets the main name of one (`single`); a species no
reference names keeps none (Pierre, 2026-11-08, Q247: it has no common-name unit; a name is never invented). A name
proposed for two game species, any of its spellings counted, is dropped from each species where it is neither the
PDF's nor the only name (`dropped`); a name still shared then is flagged `shared` (e.g. "Twospot wrasse", FISH_PATH
open question 1). Spelling and capitals: FishBase's
form when it has the name (sentence case: "Ternate chromis"), else iNaturalist's with the words after the first in
lower case unless capitalised in a FishBase name of these species (a person or place: "Bennett's"). A PDF name flagged
`check` in fish.json (a likely slip) shows FishBase's spelling, the PDF form kept in alt (accepted when typed; Pierre,
2026-11-05).

Usage:
  python3 tools/fish_common.py --inat               iNaturalist names of every game species (about 1 request a second,
                                                     30 taxa a request) into tools/fish_common_src.json
  python3 tools/fish_common.py --fishbase DIR       FishBase names from DIR/species.parquet and DIR/comnames.parquet
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
OWN = ("pdf", "slides", "dauin", "wink")  # fish.json `common` by its species' src: kept as written, listed first


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
        groups = []  # one per name, its spellings merged: {name, alt, own, fbMain, inatMain, fb (records), inat}

        def add(name, **tags):
            if not name:
                return
            hit = [g for g in groups if any(variant(name, x) for x in [g["name"]] + g["alt"])]
            if not hit:
                g = {"name": name, "alt": [], "own": False, "fbMain": False, "inatMain": False, "fb": 0, "inat": False}
                groups.append(g)
            else:
                # A spelling of two groups links them: one name (Codex review #522, Striate anglerfish / Striped angler).
                g = hit[0]
                for o in hit[1:]:
                    g["alt"] += [x for x in [o["name"]] + o["alt"] if norm(x) not in [norm(y) for y in [g["name"]] + g["alt"]]]
                    for k in ("own", "fbMain", "inatMain", "inat"):
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
        for g in groups:
            # The form shown: the species' own (PDF) name as written, else FishBase's main name, else its most recorded
            # spelling; the other spellings stay as alt (accepted when typed).
            # A PDF name flagged as a likely slip (fish.json `check`) shows FishBase's spelling instead, the PDF form kept
            # in alt so it is still accepted when typed (Pierre, 2026-11-05).
            if g["own"] and not (s.get("check") and g["alt"]):
                continue
            forms = [g["name"]] + g["alt"]
            best = max(forms, key=lambda f: (norm(f) == norm(fb.get("main") or ""), fbRec.get(norm(f), 0)))
            g["alt"] = [f for f in forms if f != best]
            g["name"] = best

        def keep(g):
            # A name besides the species' own: one that recurs in both references (FishBase and iNaturalist), the main
            # name of one of them.
            # FishBase's main name is FishBase evidence even with no comnames record (Codex review #522, Chromis agilis).
            # No third rule for other recorded names (Pierre, 2026-11-05: only the main names of the two references).
            return (g["fb"] > 0 or g["fbMain"]) and g["inat"] and (g["fbMain"] or g["inatMain"])

        # The order, deterministic: the species' own (PDF) name first (rule C1), then the most shared: in the most
        # references (FishBase, iNaturalist), then the main name of the most, then the most FishBase records, then
        # FishBase's main name before iNaturalist's, then by name.
        rank = sorted(groups, key=lambda g: (not g["own"], -((g["fb"] > 0 or g["fbMain"]) + g["inat"]),
                                             -(g["fbMain"] + g["inatMain"]), -g["fb"], not g["fbMain"], norm(g["name"])))
        pick = [g for g in rank if g["own"] or keep(g)][:MAX]
        single = not pick and any(g["fbMain"] or g["inatMain"] for g in rank)
        if single:  # no name of its own and none in both references: the best main name, flagged
            pick = [next(g for g in rank if g["fbMain"] or g["inatMain"])]
        names = []
        for g in pick:
            o = {"name": g["name"], "from": [x for x in (g["own"] or None, "fbMain" if g["fbMain"] else None,
                                                          f"fb{g['fb']}" if g["fb"] else None,
                                                          "inatMain" if g["inatMain"] else None,
                                                          "inat" if g["inat"] and not g["inatMain"] else None) if x]}
            if g["alt"]:
                o["alt"] = g["alt"]
            names.append(o)
        o = {"sp": s["name"], "names": names}
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
    # Shared names: one name, two game species.
    # Every spelling counts, the accepted ones (alt) too (Codex review #522: a typed answer must not name two species).
    # First drop a shared name from each species where it is neither its own (PDF) name nor its only one, then flag the
    # names still shared.
    def spell(n):
        return {norm(x) for x in [n["name"]] + n.get("alt", [])}

    def shared():
        seen = {}
        for sid, o in out.items():
            for n in o["names"]:
                for k in spell(n):
                    if sid not in seen.setdefault(k, []):
                        seen[k].append(sid)
        return {k: ids for k, ids in seen.items() if len(ids) > 1}

    for k, ids in shared().items():
        for sid in ids:
            o = out[sid]
            for n in list(o["names"]):
                if k in spell(n) and not any(t in OWN for t in n["from"]) and len(o["names"]) > 1:
                    o["names"].remove(n)
                    o.setdefault("dropped", []).append({"name": n["name"], "sharedWith": [out[i]["sp"] for i in ids if i != sid]})
    for k, ids in shared().items():
        for sid in ids:
            for n in out[sid]["names"]:
                if k in spell(n):
                    n["shared"] = sorted(set(n.get("shared", [])) | {out[i]["sp"] for i in ids if i != sid})
    return out


def write(out, check):
    doc = ("Curated common names per fish species (1 to 3, the most shared first; published, Pierre corrects them in use: "
           "Q313), written into fish.json species cn by tools/build_fish.py: tools/fish_common.py, "
           "docs/FISH_PATH.md \"Common names\". from: pdf = IMR reference PDF (fish.json common), dauin = circle 3's source "
           "name, fbMain = FishBase main English name, fbN = FishBase English records of the name (countries / references), "
           "inatMain = iNaturalist default English name, inat = another iNaturalist English name.")
    body = "{\n" + f' "_doc": {json.dumps(doc)},\n "species": {{\n' + ",\n".join(
        f"  {json.dumps(k)}: {json.dumps(v, ensure_ascii=False, separators=(',', ':'))}" for k, v in out.items()) + "\n }\n}\n"
    if check:
        if not OUT.exists() or OUT.read_text() != body:
            sys.exit("tools/fish_common.json is not what the selection gives: run python3 tools/fish_common.py")
        print("tools/fish_common.json: OK")
        return
    OUT.write_text(body)


def summary(out):
    from collections import Counter
    n = Counter(len(o["names"]) for o in out.values())
    print(f"{len(out)} game species; names per species: " + ", ".join(f"{k}: {n[k]}" for k in sorted(n)))
    print(f"  PDF name kept: {sum(1 for o in out.values() if any('pdf' in x['from'] for x in o['names']))}; "
          f"no FishBase match: {sum(1 for o in out.values() if o.get('noFishBase'))}; "
          f"shared names dropped: {sum(len(o.get('dropped', [])) for o in out.values())}; "
          f"shared and kept: {sum(1 for o in out.values() for x in o['names'] if x.get('shared'))}")


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--inat", action="store_true")
    ap.add_argument("--fishbase", metavar="DIR")
    ap.add_argument("--check", action="store_true")
    a = ap.parse_args()
    if a.inat:
        fetch_inat()
    if a.fishbase:
        fetch_fishbase(a.fishbase)
    if a.inat or a.fishbase:
        return
    out = select()
    write(out, a.check)
    if not a.check:
        summary(out)


if __name__ == "__main__":
    main()
