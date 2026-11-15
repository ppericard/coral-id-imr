#!/usr/bin/env python3
"""The instance and its layer (design note docs/reviews/2026-11-14-sheet-overlay-design.md, v2, section 1 and step 5).

The built files (fish.json, data.json) are three layers' first two, resolved at build: the sources (WoRMS, the key, our
own sourced lines: tools/fish_source.json, data.json's other fields) and the instance's layer, the content that one
organisation decides (its circles, its declared look-alikes and their words, its course texts, its starter core). The
third layer, the content editor's edits, stays in curation.json and is laid over at load (core.js contentApply), never
here (rule A1).

tools/instance.json names the instance (id, name), its centre (presence near it: tools/presence.py, rule C8) and its
layer files, one per subject (SUBJECTS key: fish, coral). Today the IMR instance's, in tools/instances/imr/:

- fish: start (the starter core), look (the declared look-alike groups of families) and nodes {teaching node id:
  {circle, cues, look, phase}} (a sub-entry: cues, look, phase). fish_source() lays them on tools/fish_source.json, and
  tools/build_fish.py reads the result, the same source it read before step 5. The base never carries them: a node of
  the base with one of them, or a layer node the base does not hold, stops the build.
- coral: imrg (the IMR lecture's groups) and gen {genus: {ig, imr, mn}} (its lecture group, its lecture notes verbatim,
  its mnemonic). data.json is both the corals' source and their built file: it carries them too, written there by
  tools/datajson.py (dump() and its rewrite), the one writer of data.json (rule W16). An edit goes to the layer file,
  then python3 tools/datajson.py; dump() refuses a data.json whose fields differ from the layer, so an edit made in
  data.json is never lost silently.

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

FISH_NODE = ("circle", "cues", "look", "phase")  # a teaching node's fields that are the instance's
FISH_SUB = ("cues", "look", "phase")  # a sub-entry's (a sub-entry takes its entry's circle)
FISH_TOP = ("start", "look")
CORAL_AFTER = {"ig": "n", "imr": "ig", "mn": "imr"}  # a genus's fields that are the instance's, and where they sit
CORAL_TOP_AFTER = {"imrg": "key"}
SPLIT = ("nodes", "gen")  # a layer file's maps written one entry per line


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

def fish_compose(base, lay):
    """tools/fish_source.json (base) with the instance's layer laid on: the source tools/build_fish.py reads. Stops when
    the base still carries a field of the layer (an edit made in the old place, say by a merge) or the layer names a
    node the base does not hold."""
    src, bad = copy.deepcopy(base), []
    for k in FISH_TOP:
        if k in src:
            bad.append(f"tools/fish_source.json {k}: the instance's (its layer file)")
    by = {}
    for t in src.get("teach", []):
        by[t["id"]] = (t, FISH_NODE)
        for u in t.get("sub", []):
            by[u["id"]] = (u, FISH_SUB)
    for n, (rec, keys) in by.items():
        for k in keys:
            if k in rec:
                bad.append(f"tools/fish_source.json {n} {k}: the instance's (its layer file)")
    for n, x in (lay.get("nodes") or {}).items():
        if n not in by:
            bad.append(f"layer node {n}: no teaching node or sub-entry of tools/fish_source.json")
            continue
        rec, keys = by[n]
        for k, v in x.items():
            if k not in keys:
                bad.append(f"layer node {n} {k}: not a field of the layer ({', '.join(keys)})")
            else:
                rec[k] = copy.deepcopy(v)
    if bad:
        sys.exit("the instance's layer (tools/instance.py):\n  " + "\n  ".join(bad))
    for k in FISH_TOP:
        if k in lay:
            src[k] = copy.deepcopy(lay[k])
    return src


def fish_source(base_path=None, lay_path=None):
    """The fish source as the build reads it: tools/fish_source.json (or base_path) with the layer (or lay_path)."""
    base = json.loads(Path(base_path or FISH_SOURCE).read_text(encoding="utf-8"))
    return fish_compose(base, load_layer("fish", lay_path))


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


def coral_compose(d, lay):
    """data.json (d) with the instance's coral layer laid on, its fields where data.json has always had them (a genus's
    ig, imr and mn after n; imrg after key). A new copy; a layer genus data.json does not hold stops."""
    d = copy.deepcopy(d)
    gen = d.get("gen") or {}
    lost = [g for g in (lay.get("gen") or {}) if g not in gen]
    if lost:
        sys.exit(f"the instance's coral layer: not genera of data.json gen: {', '.join(lost)}")
    for k, after in CORAL_TOP_AFTER.items():
        if k in lay:
            _put(d, k, copy.deepcopy(lay[k]), after)
    for g, x in (lay.get("gen") or {}).items():
        for k, after in CORAL_AFTER.items():
            if k in x:
                _put(gen[g], k, copy.deepcopy(x[k]), after)
    return d


def coral_strip(d):
    """data.json without the instance's fields (the corals' sources alone): a copy."""
    d = copy.deepcopy(d)
    for k in CORAL_TOP_AFTER:
        d.pop(k, None)
    for rec in (d.get("gen") or {}).values():
        for k in CORAL_AFTER:
            rec.pop(k, None)
    return d


def coral_conflicts(d, lay):
    """The instance's fields that data.json (d) holds with another value than the layer's: an edit made in data.json."""
    out, lg = [], lay.get("gen") or {}
    for k in CORAL_TOP_AFTER:
        if k in d and d[k] != lay.get(k):
            out.append(k)
    for g, rec in (d.get("gen") or {}).items():
        for k in CORAL_AFTER:
            if k in rec and rec[k] != (lg.get(g) or {}).get(k):
                out.append(f"gen {g} {k}")
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
    fish_source()  # stops on a stale base or an unknown node
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
