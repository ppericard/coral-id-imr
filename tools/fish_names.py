#!/usr/bin/env python3
"""The fish name index's kind words (Pierre, 2026-11-09, Q319 and Q320; docs/reviews/2026-11-09-shared-common-names.md):
the head words of the species' common names ("razorfish", "toby", "spinefoot") with the families whose species carry
them, written into fish.json `vn` by tools/build_fish.py (add_families, every mode, --commonness included), never by hand.

A kind word is taken from each name shown (fish.json species `cn`, the first form of each listed name; never a recorded
other spelling, which holds FishBase typos such as "Scrawled tilefish"; never a "False ..." name, which says it is not
one): its longest ending of 1 to 3 words that is a family's name (the book's labels, IMR's names and their parts, the
regional key's labels, each in both numbers), else a family name ending its last word ("shrimpgoby": goby), else its last
word; singular, letters only to compare. Its owners: each family whose game species carry it, with n (how many of them)
and of (how many game species the family has). Role `k` (accepted at a family question, Q320) when at least 2 of the
family's species carry it, or all of them; role `w` (known: never read as a slip of another family's name, but not a
name of that family, unless Pierre turns it on in curation.json fish.names) otherwise. A kind word that is already a
name of its only family (wrasse, grouper) is left out: core.js reads the families' own names.

fish.json vn: [[the word as shown, [[family id, role, n, of], ...]], ...], sorted by the word. The app adds the rest of the
index from fish.json itself (core.js fishNameIndex: the species' listed names, their scientific names, the genera's
scientific and common names) and Pierre's exceptions (curation.json fish.names).

Usage: python3 tools/fish_names.py   (offline: a summary of the kind words, the shared ones first; fish.json unchanged)
"""
import json
import re
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FISH = ROOT / "fish.json"
SRC = ROOT / "tools" / "fish_source.json"


def norm(s):
    """core.js typeNormAll: letters only, lower case, accents dropped."""
    s = unicodedata.normalize("NFD", str(s or "").lower())
    return re.sub(r"[^a-z]", "", s)


def singular(w):
    """A word in the singular (the reverse of core.js typeForms' plural): Gobies -> Goby, Pipefishes -> Pipefish."""
    if re.search(r"fishes$", w, re.I):
        return w[:-2]
    if re.search(r"ies$", w, re.I):
        return w[:-3] + "y"
    if re.search(r"(ch|sh|x|ss)es$", w, re.I):
        return w[:-2]
    if re.search(r"(ss|us|is|as)$", w, re.I):
        return w
    if re.search(r"s$", w, re.I):
        return w[:-1]
    return w


def words(s):
    return [x for x in re.split(r"[\s\-‐‑/&]+", re.sub(r"['’`]", "", str(s or ""))) if x]


def fold(s):
    w = words(s)
    if not w:
        return ""
    w[-1] = singular(w[-1])
    return norm("".join(w))


def family_names(o, src):
    """Every name a family goes by, folded: its own (book label, IMR's, their parts, scientific) per family id, and every
    label of the regional key (game or not)."""
    own = {}
    teach = {t["id"]: t for t in o.get("teach", [])}
    sp = {s["id"]: s for s in o["species"]}
    for f in o["families"]:
        L = [f.get("name"), f.get("imr"), *re.split(r"\s*&\s*|\s+and\s+", f.get("imr") or ""), *(f.get("sci") or [])]
        own[f["id"]] = {fold(x) for x in L if x}
    for t in teach.values():
        fams = {sp[i]["family"] for i in t.get("species", []) if i in sp and sp[i].get("family")}
        names = [t.get("name"), *(t.get("aka") or []), *(t.get("often") or [])]
        for u in t.get("sub", []):
            names += [u.get("name"), *(u.get("aka") or []), *(u.get("often") or [])]
        for f in fams:
            own.setdefault(f, set()).update(fold(x) for x in names if x)
    every = set().union(*own.values()) if own else set()
    for k in src.get("keys", []):
        for g in k.get("groups", []):
            for lab in g.get("labels", []):
                every.update(fold(p) for p in lab[0].split("/"))
    return own, {x for x in every if len(x) >= 4}


def kind_of(name, labels):
    """The kind word of a name shown: (the word as written, singular; its folded key), or None for a "False ..." name."""
    if re.match(r"false\b", name, re.I):
        return None
    w = words(name)
    for n in range(min(3, len(w)), 0, -1):
        k = fold(" ".join(w[-n:]))
        if k in labels:
            return " ".join(w[-n:-1] + [singular(w[-1])]), k
    last = singular(w[-1])
    k = norm(last)
    end = sorted((x for x in labels if k.endswith(x) and k != x), key=len, reverse=True)
    if end:
        return end[0], end[0]
    return last, k


def index(o, src):
    """fish.json vn from the species' names shown: [[word, [[family id, role, n, of], ...]], ...]."""
    own, labels = family_names(o, src)
    game = [s for s in o["species"] if s.get("circle") and not s.get("out") and s.get("family")]
    size = {}
    for s in game:
        size[s["family"]] = size.get(s["family"], 0) + 1
    by = {}  # key -> {"x": {form: count}, "f": {family: set(species)}}
    for s in game:
        for L in s.get("cn") or []:
            if not L:
                continue
            r = kind_of(L[0], labels)
            if not r or len(r[1]) < 3:
                continue
            x, k = r
            e = by.setdefault(k, {"x": {}, "f": {}})
            x = x.lower()
            e["x"][x] = e["x"].get(x, 0) + 1
            e["f"].setdefault(s["family"], set()).add(s["id"])
    out = []
    for k, e in by.items():
        fams = sorted(e["f"])
        if len(fams) == 1 and k in own.get(fams[0], set()):
            continue  # a name of its only family already
        owners = []
        for f in fams:
            n, of = len(e["f"][f]), size[f]
            owners.append([f, "k" if n >= 2 or n == of else "w", n, of])
        x = sorted(e["x"].items(), key=lambda kv: (-kv[1], kv[0]))[0][0]
        out.append([x, owners])
    return sorted(out, key=lambda r: (norm(r[0]), r[0]))


def apply(o, src):
    o["vn"] = index(o, src)


def main():
    o = json.loads(FISH.read_text(encoding="utf-8"))
    src = json.loads(SRC.read_text(encoding="utf-8"))
    vn = index(o, src)
    fam = {f["id"]: f["name"] for f in o["families"]}
    shared = [r for r in vn if sum(1 for x in r[1] if x[1] == "k") > 1]
    k = [r for r in vn if any(x[1] == "k" for x in r[1])]
    w = [r for r in vn if not any(x[1] == "k" for x in r[1])]
    print(f"{len(vn)} kind words: {len(k)} accepted for a family (role k), {len(shared)} of them for several, "
          f"{len(w)} known only (role w)")
    for r in shared + k + w:
        print(f"  {r[0]}: " + ", ".join(f"{fam.get(f, f)} {x} {n}/{of}" for f, x, n, of in r[1]))
    if "--check" in sys.argv and o.get("vn") != vn:
        sys.exit("fish.json vn is not what the species' names give: run python3 tools/build_fish.py --commonness")


if __name__ == "__main__":
    main()
