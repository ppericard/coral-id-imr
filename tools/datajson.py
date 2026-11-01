"""The one writer of data.json's layout (code re-review 2026-11-01, M5). Every script that writes data.json uses dump().

Layout: valid JSON, one top-level key per line; inside `gen`, `course`, `cand`, `x` and `x.gen` one entry (one
genus) per line. Within a line: compact separators, ensure_ascii=False, key order as in memory. Two edits to
different genera no longer conflict, and writing an unchanged file gives the same bytes.

    from datajson import load, dump       # scripts in tools/ (python3 tools/x.py puts tools/ on sys.path)
    python3 tools/datajson.py             # rewrite data.json in this layout
    python3 tools/datajson.py --check     # exit 1 when data.json is not in this layout (checks.yml)
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


def load(path=PATH):
    with open(path, encoding='utf-8') as fh:
        return json.load(fh)


def dump(d, path=PATH):
    with open(path, 'w', encoding='utf-8', newline='\n') as fh:
        fh.write(dumps(d))


if __name__ == '__main__':
    with open(PATH, encoding='utf-8', newline='') as fh:
        s = fh.read()
    good = dumps(json.loads(s))
    if '--check' in sys.argv[1:]:
        if s != good:
            sys.exit('data.json is not in the canonical layout: run python3 tools/datajson.py (and write it with '
                     'tools/datajson.py dump(), never json.dump)')
        print('data.json layout OK')
    elif s != good:
        dump(json.loads(s))
        print('data.json rewritten')
    else:
        print('data.json already in layout')
