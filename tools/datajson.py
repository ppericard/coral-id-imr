"""The one writer of data.json's layout (code re-review 2026-11-01, M5). Every script that writes data.json uses dump().

Layout: valid JSON, one top-level key per line; inside `gen`, `course`, `cand`, `x` and `x.gen` one entry (one
genus) per line. Within a line: compact separators, ensure_ascii=False, key order as in memory. Two edits to
different genera no longer conflict, and writing an unchanged file gives the same bytes.

    from datajson import load, dump       # scripts in tools/ (python3 tools/x.py puts tools/ on sys.path)
    python3 tools/datajson.py             # rewrite data.json in this layout
    python3 tools/datajson.py --check     # exit 1 when data.json or cand.json is not in this layout (checks.yml)
    python3 tools/datajson.py --split     # move the candidates curation.json doesn't name from data.json to cand.json
"""
import json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, 'data.json')
# Dicts written one entry per line, as key paths from the top (the top level itself always is).
SPLIT = {('gen',), ('course',), ('cand',), ('x',), ('x', 'gen')}


def _c(v):
    return json.dumps(v, ensure_ascii=False, separators=(',', ':'))


def _render(v, path=()):
    if isinstance(v, dict) and v and (not path or path in SPLIT):
        return '{\n' + ',\n'.join(_c(k) + ':' + _render(x, path + (k,)) for k, x in v.items()) + '\n}'
    return _c(v)


def dumps(d):
    return _render(d) + '\n'


# Candidates waiting for Pierre live in cand.json (same layout, top key "cand"), out of data.json, which every player
# downloads (Pierre, 2026-11-01: a big backlog of candidates must not weigh on the app). data.json keeps the candidates
# curation.json names (added, moved, sent to another genus...): the app needs those to apply the curation.
CAND_PATH = os.path.join(ROOT, 'cand.json')
CUR_PATH = os.path.join(ROOT, 'curation.json')


def curated(cur_path=CUR_PATH):
    """Every photo id curation.json names under its genera (add, move, out, hide, feat, cover...)."""
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
        walk(json.load(open(cur_path, encoding='utf-8')).get('genera') or {})
    except FileNotFoundError:
        pass
    return out


def load_all(path=PATH, cand_path=CAND_PATH):
    """data.json with every candidate (its own and cand.json's) in d['cand'], as before the split."""
    d = load(path)
    if os.path.exists(cand_path):
        c = load(cand_path).get('cand') or {}
        mine = d.setdefault('cand', {})
        for g, L in c.items():
            have = {p['f'] for p in mine.get(g, [])}
            mine.setdefault(g, []).extend(p for p in L if p['f'] not in have)
    return d


def dump_all(d, path=PATH, cand_path=CAND_PATH, keep=None):
    """Writes d back split: candidates curation.json names stay in data.json, the others go to cand.json."""
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


def dump(d, path=PATH):
    with open(path, 'w', encoding='utf-8', newline='\n') as fh:
        fh.write(dumps(d))


if __name__ == '__main__':
    if '--split' in sys.argv[1:]:
        dump_all(load_all())
        print('candidates split: data.json keeps the curated ones, cand.json the others')
        sys.exit(0)
    bad = []
    for path in (PATH, CAND_PATH):
        if not os.path.exists(path): continue
        with open(path, encoding='utf-8', newline='') as fh:
            s = fh.read()
        good = dumps(json.loads(s))
        name = os.path.basename(path)
        if '--check' in sys.argv[1:]:
            if s != good: bad.append(name)
            else: print(name, 'layout OK')
        elif s != good:
            dump(json.loads(s), path)
            print(name, 'rewritten')
        else:
            print(name, 'already in layout')
    if bad:
        sys.exit(', '.join(bad) + ' not in the canonical layout: run python3 tools/datajson.py (and write it with '
                 'tools/datajson.py dump(), never json.dump)')
