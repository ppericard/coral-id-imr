"""The one writer of data.json's layout (code re-review 2026-11-01, M5). Every script that writes data.json uses dump().

Layout: valid JSON, one top-level key per line; inside `gen`, `course`, `cand`, `x` and `x.gen` one entry (one
genus) per line. Within a line: compact separators, ensure_ascii=False, key order as in memory. Two edits to
different genera no longer conflict, and writing an unchanged file gives the same bytes.

    from datajson import load, dump       # scripts in tools/ (python3 tools/x.py puts tools/ on sys.path)
    python3 tools/datajson.py             # rewrite data.json in this layout
    python3 tools/datajson.py --check     # exit 1 when data.json or data/cand.json is not in this layout (checks.yml)
    python3 tools/datajson.py --split     # move the candidates curation.json doesn't name from data.json to data/cand.json

The instance's layer (tools/instance.py; design note docs/reviews/2026-11-14-sheet-overlay-design.md v2, step 5): the
IMR instance's coral fields (imrg, and each genus's ig, imr and mn) and its lecture's look-alike pairs (their look and
lsrc entries) live in the coral layer file tools/instance.json names (today tools/instances/imr/coral.json), and
data.json carries a copy where it always had them. dump() to data.json
lays the layer on, and stops when the data it is given changes one of those fields (an edit belongs in the layer file);
the rewrite lays the layer on (after an edit of the layer file); --check fails when data.json is not as its layers give
it, byte for byte.
"""
import json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import instance  # noqa: E402  (the instance's coral layer)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, 'data.json')
# Dicts written one entry per line, as key paths from the top (the top level itself always is).
SPLIT = {('gen',), ('course',), ('cand',), ('x',), ('x', 'gen'), ('photos',)}  # photos: data/excluded.json


def _c(v):
    return json.dumps(v, ensure_ascii=False, separators=(',', ':'))


def _render(v, path=()):
    if isinstance(v, dict) and v and (not path or path in SPLIT):
        return '{\n' + ',\n'.join(_c(k) + ':' + _render(x, path + (k,)) for k, x in v.items()) + '\n}'
    return _c(v)


def dumps(d):
    return _render(d) + '\n'


# Candidates waiting for the admin live in data/cand.json (same layout, top key "cand"), out of data.json, which every player
# downloads (a big backlog of candidates must not weigh on the app). data.json keeps the candidates
# curation.json names (added, moved, sent to another genus...): the app needs those to apply the curation.
CAND_PATH = os.path.join(ROOT, 'data/cand.json')
CUR_PATH = os.path.join(ROOT, 'curation.json')


def curated(cur_path=CUR_PATH):
    """Every photo id curation.json names under its genera (add, move, out, hide, feat, cover...), except the excluded
    ones (curation.json "exclude"): an excluded photo is used nowhere, so it is not kept. Pierre's own exclusion takes
    the candidate out of every list (tools/excluded.py drop_excluded); the auto-sort's stays in data/cand.json, for its Undo."""
    out = set()
    def walk(v):
        if isinstance(v, dict):
            for k, x in v.items():
                out.add(k); walk(x)
        elif isinstance(v, list):
            for x in v: walk(x)
        elif isinstance(v, str):
            out.add(v)
    try:
        cur = json.load(open(cur_path, encoding='utf-8'))
    except FileNotFoundError:
        return out
    walk(cur.get('genera') or {})
    return out - set(cur.get('exclude') or {})


def load_all(path=PATH, cand_path=CAND_PATH):
    """data.json with every candidate (its own and data/cand.json's) in d['cand'], as before the split."""
    d = load(path)
    if os.path.exists(cand_path):
        c = load(cand_path).get('cand') or {}
        mine = d.setdefault('cand', {})
        for g, L in c.items():
            have = {p['f'] for p in mine.get(g, [])}
            mine.setdefault(g, []).extend(p for p in L if p['f'] not in have)
    return d


def dump_all(d, path=PATH, cand_path=CAND_PATH, keep=None):
    """Writes d back split: candidates curation.json names stay in data.json, the others go to data/cand.json."""
    keep = curated() if keep is None else keep
    inside, waiting = {}, {}
    for g, L in (d.get('cand') or {}).items():
        a = [p for p in L if p['f'] in keep]
        b = [p for p in L if p['f'] not in keep]
        if a: inside[g] = a
        if b: waiting[g] = b
    d = dict(d)
    if inside: d['cand'] = inside
    else: d.pop('cand', None)
    dump(d, path)
    dump({'cand': waiting}, cand_path)


def load(path=PATH):
    with open(path, encoding='utf-8') as fh:
        return json.load(fh)


def is_data(path):
    """path names the repository's data.json (the file the instance's coral layer is laid on)."""
    return os.path.realpath(path) == os.path.realpath(PATH)


def dump(d, path=PATH):
    if is_data(path) and isinstance(d, dict) and 'gen' in d:
        d = instance.coral_layered(d)
    with open(path, 'w', encoding='utf-8', newline='\n') as fh:
        fh.write(dumps(d))


if __name__ == '__main__':
    if '--split' in sys.argv[1:]:
        dump_all(load_all())
        print('candidates split: data.json keeps the curated ones, data/cand.json the others')
        sys.exit(0)
    bad = []
    for path in (PATH, CAND_PATH):
        if not os.path.exists(path): continue
        with open(path, encoding='utf-8', newline='') as fh:
            s = fh.read()
        d = json.loads(s)
        if is_data(path):
            d = instance.coral_compose(d, instance.load_layer('coral'))  # the layer wins: an edit of the layer file
        good = dumps(d)
        name = os.path.basename(path)
        if '--check' in sys.argv[1:]:
            if s != good: bad.append(name)
            else: print(name, 'layout OK' + (', as its layers give it' if is_data(path) else ''))
        elif s != good:
            with open(path, 'w', encoding='utf-8', newline='\n') as fh:
                fh.write(good)
            print(name, 'rewritten')
        else:
            print(name, 'already in layout')
    if bad:
        sys.exit(', '.join(bad) + ' not in the canonical layout, or not as its layers give it (data.json: the coral '
                 'layer, tools/instance.py): run python3 tools/datajson.py (and write it with tools/datajson.py dump(), '
                 'never json.dump)')
