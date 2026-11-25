#!/usr/bin/env python3
"""The instance and its layer (design note docs/reviews/2026-11-14-sheet-overlay-design.md, v2, section 1 and step 5).

The built files (fish.json, data.json) are three layers' first two, resolved at build: the sources (WoRMS, the key, our
own sourced lines: tools/fish_source.json, data.json's other fields) and the instance's layer, the content that one
organisation decides (its circles, its declared look-alikes and their words, its course texts, its starter core). The
third layer, the content editor's edits, stays in curation.json and is laid over at load (core.js contentApply), never
here (rule A1).

tools/instance.json names the instance (id, name), its centre (presence near it: tools/presence.py, rule C8), the
identification key in force there (key: the deployment's choice, laid by fish_source as deploy.key, rule S3) and its
layer files, one per subject (SUBJECTS key: fish, coral). Today the IMR instance's, in tools/instances/imr/:

- fish: start (the starter core), look (the declared look-alike groups of families), nodes {teaching node id:
  {circle, src, sign, sl, cues, look, phase}} (a sub-entry: sl, cues, look, phase) and species {species id: {common,
  sec, pdf, cs, src, sl}}. src is the IMR tag ("imr": the entries of the IMR fish presentation), sign: false marks an
  entry off the presentation's dive-sign list, sl the presentation's slides. A species' pdf (the PDF's pages) marks it
  as the PDF's, the IMR reference list (the EventMeasure PDF); only then it has the PDF's common name (never
  corrected), sec (its section) and cs (its rank on the cheatsheet); src: "slides" marks a species only the
  presentation names. fish_source() lays them on tools/fish_source.json, and tools/build_fish.py reads the result. The
  base never carries them (its src is the other sources': pdf, diver, wink; a species' common name is the base's unless
  the layer marks it as the PDF's): a node or species of the base with one of them, or a layer node or species the
  base does not hold, stops the build. A teaching node's names (name, fam), pdf, ref and species stay in the base: the
  IMR names are the entries the tag marks, and an edition without the layer has no IMR tag, slide or cue on its
  entries, and no PDF name, section or rank on its species.
- coral: imrg (the IMR lecture's groups), gen {genus: {n, ig, imr, mn, sl, rsl, qt}} (its slate number, its lecture
  group, its lecture notes verbatim, its mnemonic, its lecture slides and review slides, its ID tips: the tips of a
  genus with a Coral Finder heading, tl, stay in data.json, condensed from the book) and pairs {"A|B": {src, look}} (the lecture's look-alike pairs: their lsrc line on both genera, and each
  side's place in its genus's look, a side whose look does not list the other left out; the Coral Finder's pairs stay in
  data.json alone). data.json is both the corals' source and their built file: it carries them too, written there by
  tools/datajson.py (dump() and its rewrite), the one writer of data.json (rule W16). An edit goes to the layer file,
  then python3 tools/datajson.py; dump() refuses a data.json whose fields, or a pair's line or direction, differ from the
  layer, so an edit made in data.json is never lost silently. A pair taken out of the layer stays in data.json until it
  is taken out there too (data.json alone cannot tell it from a Coral Finder pair; tests/instance.test.js fails on a
  lecture line left in the sources).

Another instance gets its own instance.json and layer files; a subject with no layer file builds with no layer (fish:
every node in circle 1 by the build's default, no declared pair, no starter core).

    python3 tools/instance.py --fish-source   print tools/fish_source.json with the layer laid on (tests read it)
    python3 tools/instance.py --check         instance.json's fields, the layer files in their layout, the fish source
                                              composes (data.json as its layers give it: tools/datajson.py --check)
Tests: tests/instance.test.js.
"""
import copy
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INSTANCE_PATH = ROOT / "tools" / "instance.json"
FISH_SOURCE = ROOT / "tools" / "fish_source.json"
DATA = ROOT / "data.json"

# A teaching node's fields that are the instance's. src is the IMR tag only ("imr", the presentation's entries): the
# other sources (pdf, diver, wink) are the sources' and stay in tools/fish_source.json. sign: false marks an entry the
# presentation's dive-sign list lacks.
FISH_NODE = ("circle", "src", "sign", "sl", "cues", "look", "phase")
FISH_SUB = ("sl", "cues", "look", "phase")  # a sub-entry's (a sub-entry takes its entry's circle)
# A species' fields that are the instance's: the slide of the presentation that names it (sl); the PDF's own fields, only
# on a species the layer marks as the PDF's by giving its pdf (the PDF's pages): common (the PDF's name for it, never
# corrected), sec (its section) and cs (its rank on the cheatsheet); and the presentation's mark src: "slides" (a
# species the presentation names alone, on a species with no PDF page). A species of another source (dauin, wink) keeps
# its common name, and its src, in the base.
FISH_SPECIES = ("common", "sec", "pdf", "cs", "src", "sl")
FISH_PDF = ("common", "sec", "cs")  # the PDF's fields that need the species' pdf
FISH_TAG = "imr"  # the one value of a node's src the layer holds
FISH_SPECIES_SRC = "slides"  # the one value of a species' src the layer holds
FISH_TOP = ("start", "look")
# A genus's fields that are the instance's, and where they sit in data.json's record: n (its slate number, 0 for a starred
# genus) after tr, then ig, imr and mn after it; sl (its lecture slides) after lsrc, then qt (its ID tips) and rsl (its
# review slides) each right after sl, which puts qt after rsl. The order of the entries is the order they are laid.
CORAL_AFTER = {"n": "tr", "ig": "n", "imr": "ig", "mn": "imr", "sl": "lsrc", "qt": "sl", "rsl": "sl"}
CORAL_TOP_AFTER = {"imrg": "key"}
CORAL_PAIR_AFTER = {"look": "crit", "lsrc": "levels"}  # where a genus's look and lsrc sit, should a record lack them
SPLIT = ("nodes", "species", "gen", "pairs")  # a layer file's maps written one entry per line


def instance(path=INSTANCE_PATH):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def layer_path(subject, inst=None):
    """The layer file of a subject (Path), or None when the instance names none."""
    p = ((inst or instance()).get("layer") or {}).get(subject)
    return ROOT / p if p else None


def load_layer(subject, path=None):
    """The layer of a subject ({} when the instance names none); a layer file named but missing stops (it would build
    as no layer: every fish node in circle 1, no cue)."""
    p = Path(path) if path else layer_path(subject)
    if not p:
        return {}
    if not p.exists():
        sys.exit(f"the instance's {subject} layer: {p} does not exist (tools/instance.json layer)")
    return json.loads(p.read_text(encoding="utf-8"))


def layer_dumps(lay):
    """A layer file's layout: one top-level key per line (the _doc list one line per string), the maps of SPLIT one
    entry per line, so two edits to different nodes or genera merge cleanly."""
    out, keys = ["{"], list(lay)
    for i, k in enumerate(keys):
        v, end = lay[k], ("," if i < len(keys) - 1 else "")
        if k == "_doc" and isinstance(v, list):
            out.append(json.dumps(k) + ": [")
            out += ["  " + json.dumps(x, ensure_ascii=False) + ("," if j < len(v) - 1 else "") for j, x in enumerate(v)]
            out.append("]" + end)
        elif k in SPLIT and isinstance(v, dict):
            out.append(json.dumps(k) + ": {")
            ks = list(v)
            out += [json.dumps(x) + ": " + json.dumps(v[x], ensure_ascii=False) + ("," if j < len(ks) - 1 else "")
                    for j, x in enumerate(ks)]
            out.append("}" + end)
        else:
            out.append(json.dumps(k) + ": " + json.dumps(v, ensure_ascii=False) + end)
    return "\n".join(out) + "\n}\n"


def write_layer(subject, lay, path=None):
    p = Path(path) if path else layer_path(subject)
    p.write_text(layer_dumps(lay), encoding="utf-8", newline="\n")


# --- fish ------------------------------------------------------------------------------------------------------------

def fish_compose(base, lay, key=None):
    """tools/fish_source.json (base) with the instance's layer laid on: the source tools/build_fish.py reads. Stops when
    the base still carries a field of the layer (an edit made in the old place, say by a merge; a src other than the
    layer's tags is the base's; a species' common name is the base's unless the layer marks the species as the PDF's) or
    the layer names a node or species the base does not hold. key: the identification key in force (tools/instance.json
    key), laid as deploy.key, where tools/build_fish.py key_in_force reads it; the base holds no deploy."""
    src, bad = copy.deepcopy(base), []
    for k in FISH_TOP:
        if k in src:
            bad.append(f"tools/fish_source.json {k}: the instance's (its layer file)")
    if "deploy" in src:
        bad.append("tools/fish_source.json deploy: the deployment's (tools/instance.json key)")
    by = {}
    for t in src.get("teach", []):
        by[t["id"]] = (t, FISH_NODE)
        for u in t.get("sub", []):
            by[u["id"]] = (u, FISH_SUB)
    sp = {s["id"]: s for s in src.get("species", [])}
    for n, (rec, keys) in by.items():
        for k in keys:
            if k in rec and not (k == "src" and rec[k] != FISH_TAG):
                bad.append(f"tools/fish_source.json {n} {k}: the instance's (its layer file)")
    for n, s in sp.items():
        for k in FISH_SPECIES:
            if k in s and k != "common" and not (k == "src" and s[k] != FISH_SPECIES_SRC):
                bad.append(f"tools/fish_source.json {n} {k}: the instance's (its layer file)")
    for n, x in (lay.get("nodes") or {}).items():
        if n not in by:
            bad.append(f"layer node {n}: no teaching node or sub-entry of tools/fish_source.json")
            continue
        rec, keys = by[n]
        for k, v in x.items():
            if k not in keys:
                bad.append(f"layer node {n} {k}: not a field of the layer ({', '.join(keys)})")
            elif k == "src" and (v != FISH_TAG or "src" in rec):
                bad.append(f"layer node {n} src: only the tag {FISH_TAG!r}, on a node whose source the base does not name")
            else:
                rec[k] = copy.deepcopy(v)
    held = {n: set(s) for n, s in sp.items()}
    for n, x in (lay.get("species") or {}).items():
        if n not in sp:
            bad.append(f"layer species {n}: no species of tools/fish_source.json")
            continue
        rec, own = sp[n], held[n]  # own: the fields the base itself holds
        for k, v in x.items():
            if k not in FISH_SPECIES:
                bad.append(f"layer species {n} {k}: not a field of the layer ({', '.join(FISH_SPECIES)})")
            elif k == "src" and (v != FISH_SPECIES_SRC or "src" in own or "pdf" in x):
                bad.append(f"layer species {n} src: only {FISH_SPECIES_SRC!r}, on a species with no pdf whose source the "
                           "base does not name")
            elif k == "pdf" and "src" in own:
                bad.append(f"layer species {n} pdf: a species of the PDF has no src in the base (it has {rec['src']!r})")
            elif k == "pdf" and "common" in own:
                bad.append(f"layer species {n} pdf: the common name of a species of the PDF is the layer's, "
                           f"tools/fish_source.json {n} gives one too")
            elif k in FISH_PDF and "pdf" not in x:
                bad.append(f"layer species {n} {k}: only on a species of the PDF (the layer gives it a pdf)")
            else:
                rec[k] = copy.deepcopy(v)
    if bad:
        sys.exit("the instance's layer (tools/instance.py):\n  " + "\n  ".join(bad))
    for k in FISH_TOP:
        if k in lay:
            src[k] = copy.deepcopy(lay[k])
    if key:
        src["deploy"] = {"key": key}
    return src


def fish_source(base_path=None, lay_path=None, inst_path=None):
    """The fish source as the build reads it: tools/fish_source.json (or base_path) with the layer (or lay_path) and the
    key in force of the instance (tools/instance.json, or inst_path)."""
    base = json.loads(Path(base_path or FISH_SOURCE).read_text(encoding="utf-8"))
    inst = instance(inst_path) if inst_path else instance()
    return fish_compose(base, load_layer("fish", lay_path), inst.get("key"))


# --- corals ----------------------------------------------------------------------------------------------------------

def _put(rec, k, v, after):
    """rec with k set to v: in place when it is there, else right after the field after (at the end without it)."""
    if k in rec:
        rec[k] = v
        return
    items = list(rec.items())
    at = next((i + 1 for i, (x, _) in enumerate(items) if x == after), len(items))
    items.insert(at, (k, v))
    rec.clear()
    rec.update(items)


def coral_owns(rec, k):
    """Whether field k of a genus record (data.json gen) is the instance's. All of CORAL_AFTER are, but the ID tips (qt) of
    a genus with a Coral Finder heading (tl): its tips are condensed from the book, not from the lecture, so they stay in
    the sources (tools/apply_id_tips.py)."""
    return k in CORAL_AFTER and not (k == "qt" and "tl" in rec)


def coral_sides(lay):
    """The layer's look-alike pairs (lay pairs {"A|B": {src, look}}), one row per side: (genus, other genus, the line,
    the other genus's place in the genus's look, or None when that look does not list it)."""
    out = []
    for key, x in (lay.get("pairs") or {}).items():
        a, b = key.split("|")
        at = x.get("look") or {}
        out += [(a, b, x.get("src"), at.get(a)), (b, a, x.get("src"), at.get(b))]
    return out


def coral_compose(d, lay):
    """data.json (d) with the instance's coral layer laid on, its fields where data.json has always had them (a genus's
    fields where CORAL_AFTER puts them; imrg after key; a pair's two sides in look at their stored places and in lsrc in gen order,
    the order data.json's lines follow). The fields and pairs the layer owns are taken off first, so a field the layer
    no longer gives (or no layer at all) leaves data.json too (Codex review #984); a pair, which data.json alone cannot
    tell apart from a source's, only when the layer given still names it. A new copy; a layer genus data.json does not
    hold stops."""
    d = coral_strip(d, lay)
    gen = d.get("gen") or {}
    lost = [g for g in (lay.get("gen") or {}) if g not in gen]
    lost += sorted({g for g, *_ in coral_sides(lay) if g not in gen})
    if lost:
        sys.exit(f"the instance's coral layer: not genera of data.json gen: {', '.join(lost)}")
    for k, after in CORAL_TOP_AFTER.items():
        if k in lay:
            _put(d, k, copy.deepcopy(lay[k]), after)
    tips = [g for g, x in (lay.get("gen") or {}).items() if "qt" in x and "tl" in gen[g]]
    if tips:
        sys.exit(f"the instance's coral layer: qt of {', '.join(tips)}: their ID tips come from the Coral Finder (tl), "
                 "the sources' (tools/id_tips.txt)")
    order, look, lines = {g: i for i, g in enumerate(gen)}, {}, {}
    for g, o, src, at in coral_sides(lay):
        lines.setdefault(g, []).append((o, src))
        if at is not None:
            look.setdefault(g, []).append((at, o))
    for g, L in look.items():
        out = list(gen[g].get("look") or [])
        for at, o in sorted(L):
            out.insert(at, o)
        _put(gen[g], "look", out, CORAL_PAIR_AFTER["look"])
    for g, L in lines.items():
        out = list((gen[g].get("lsrc") or {}).items())
        for o, src in L:
            out.insert(next((i for i, (k, _) in enumerate(out) if order.get(k, len(order)) > order[o]), len(out)), (o, src))
        _put(gen[g], "lsrc", dict(out), CORAL_PAIR_AFTER["lsrc"])
    # After the pairs: sl sits after lsrc, which a genus whose every pair is the lecture's only gets from them.
    for g, x in (lay.get("gen") or {}).items():
        for k, after in CORAL_AFTER.items():
            if k in x:
                _put(gen[g], k, copy.deepcopy(x[k]), after)
    return d


def coral_strip(d, lay=None):
    """data.json without the instance's fields and pairs (the corals' sources alone): a copy. The pairs taken off are
    those of lay (None: the instance's coral layer file)."""
    lay = load_layer("coral") if lay is None else lay
    d = copy.deepcopy(d)
    for k in CORAL_TOP_AFTER:
        d.pop(k, None)
    gen = d.get("gen") or {}
    for rec in gen.values():
        for k in CORAL_AFTER:
            if coral_owns(rec, k):
                rec.pop(k, None)
    for g, o, _, _ in coral_sides(lay):
        rec = gen.get(g) or {}
        if isinstance(rec.get("look"), list):
            rec["look"] = [x for x in rec["look"] if x != o]
        if isinstance(rec.get("lsrc"), dict):
            rec["lsrc"].pop(o, None)
    return d


def coral_conflicts(d, lay):
    """The instance's fields that data.json (d) holds with another value than the layer's: an edit made in data.json. A
    pair's side conflicts when its line differs or its look lists the other genus where the layer does not (or the
    reverse); its place in look is the layer's (laid on again by coral_compose)."""
    out, lg = [], lay.get("gen") or {}
    for k in CORAL_TOP_AFTER:
        if k in d and d[k] != lay.get(k):
            out.append(k)
    gen = d.get("gen") or {}
    for g, rec in gen.items():
        for k in CORAL_AFTER:
            if k in rec and coral_owns(rec, k) and rec[k] != (lg.get(g) or {}).get(k):
                out.append(f"gen {g} {k}")
    for g, o, src, at in coral_sides(lay):
        rec = gen.get(g) or {}
        if (rec.get("lsrc") or {}).get(o) != src:
            out.append(f"gen {g} lsrc {o}")
        if (o in (rec.get("look") or [])) != (at is not None):
            out.append(f"gen {g} look {o}")
    return out


def coral_layered(d, lay=None):
    """d as dump() writes it to data.json: the layer laid on, after checking that d changes none of its fields."""
    lay = load_layer("coral") if lay is None else lay
    bad = coral_conflicts(d, lay)
    if bad:
        p = layer_path("coral")
        sys.exit(f"data.json: {', '.join(bad[:6])}{' …' if len(bad) > 6 else ''} differ from "
                 f"{p.relative_to(ROOT) if p else 'the coral layer'}: the instance's fields are edited there (then "
                 "python3 tools/datajson.py), never in data.json")
    return coral_compose(d, lay)


def check():
    bad = []
    inst = instance()
    for k in ("id", "name", "centre", "layer"):
        if k not in inst:
            bad.append(f"tools/instance.json: no {k}")
    for subject in (inst.get("layer") or {}):
        p = layer_path(subject, inst)
        if not p.exists():
            bad.append(f"tools/instance.json layer {subject}: {p.relative_to(ROOT)} does not exist")
            continue
        s = p.read_text(encoding="utf-8")
        if s != layer_dumps(json.loads(s)):
            bad.append(f"{p.relative_to(ROOT)}: not in its layout (instance.py layer_dumps)")
    src = fish_source()  # stops on a stale base or an unknown node
    key = inst.get("key")
    if key is not None and key not in [k["id"] for k in src.get("keys", [])]:
        bad.append(f"tools/instance.json key {key!r}: no such key in tools/fish_source.json keys")
    if bad:
        sys.exit("\n".join(bad))
    print("the instance's layer files: in their layout; the fish source composes")


if __name__ == "__main__":
    if "--fish-source" in sys.argv[1:]:
        sys.stdout.write(json.dumps(fish_source(), ensure_ascii=False))
    elif "--check" in sys.argv[1:]:
        check()
    else:
        sys.exit(__doc__)
