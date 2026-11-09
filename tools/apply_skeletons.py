#!/usr/bin/env python3
"""Marks the coral skeleton photos (rule P6, Pierre, 2026-11-09: never shown, the features cannot be seen properly).

    python3 tools/apply_skeletons.py           # skel: 1 on every photo judging/skeletons.json lists, none on the others
    python3 tools/apply_skeletons.py --check   # exit 1 when data.json / cand.json disagree with the list

The list is the judgment of a pass that looked at each photo (judging/skeletons.json). The flag sits on the photo record
wherever it is (genus views and more, IMR lecture photos, comparison images, candidates, the extra genera), so every
reader drops it the same way: core.js applyCuration (the app, the Coral ID Key, the tools that build the pools), the
admin (own, rawCands) and tools/fetch_local.py (colonies, waiting). An id the list names that is in no file (a photo
that left the data) is reported, never an error.
"""
import json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from datajson import load_all, dump_all  # the one data.json / cand.json layout

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIST = os.path.join(ROOT, 'judging', 'skeletons.json')


def listed():
    return set(json.load(open(LIST, encoding='utf-8'))['photos'])


def records(d):
    """Every photo record of data.json (with every candidate), wherever it is."""
    for G in list((d.get('gen') or {}).values()) + list(((d.get('x') or {}).get('gen') or {}).values()):
        for s in ('views', 'more'):
            for L in (G.get(s) or {}).values():
                yield from L
    for k in ('course', 'cand'):
        for L in (d.get(k) or {}).values():
            yield from L
    yield from d.get('cmp') or []


def main(argv):
    S, d = listed(), load_all()
    wrong, seen = [], set()
    for p in records(d):
        want = p['f'] in S
        seen.add(p['f'])
        if bool(p.get('skel')) != want:
            wrong.append(p['f'])
            if want:
                p['skel'] = 1
            else:
                p.pop('skel', None)
    gone = sorted(S - seen)
    if gone:
        print('in no data file (left the data):', ', '.join(gone))
    if '--check' in argv:
        if wrong:
            print('skel flag out of date, run python3 tools/apply_skeletons.py:', ', '.join(sorted(set(wrong))))
            return 1
        return 0
    if wrong:
        dump_all(d)
    print(f'{len(S & seen)} skeleton photos marked, {len(set(wrong))} records changed')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
