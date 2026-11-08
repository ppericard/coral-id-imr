# Corals: no Coral Finder book crop any more (Pierre, 2026-11-08: the crops of the Coral Finder 2022 book,
# (c) R. Kelley / BYOGUIDES, leave the app and the repository). Takes out of data.json every genus's "book" list (the
# crops, extracted by tools/archive/coral_finder_book/) and the Coral ID Key boxes' "ph" (the crops picked as box
# pictures, now drawings: proto/idkey.js BOXART), and any book crop left among the candidates (data.json and cand.json).
# The page citations ("Coral Finder p. N": key leaves "a"/"b", gen "pages"), facts and look-alike sources stay.
# curation.json is never touched (rule A1): its old references to crops match no photo and are dropped by the code.
# Re-runnable: a second run changes nothing. tests/nobook.test.js guards that nothing comes back.
# Run from the repo root: python3 tools/apply_no_book.py
import re
from datajson import load_all, dump_all

CROP = re.compile(r'^[a-z]+-cf-\d')  # a crop's file id: <genus>-cf-<page>-<tag>


def drop_book(d):
    """Removes every book crop record from d in place; returns how many went."""
    n = 0
    for G in [d.get('gen') or {}, (d.get('x') or {}).get('gen') or {}]:
        for g in G.values():
            n += len(g.pop('book', None) or [])
    for k in [*(d.get('key') or []), *((d.get('x') or {}).get('groups') or [])]:
        for l in k.get('leaves') or []:
            n += len(l.pop('ph', None) or [])
    for L in (d.get('cand') or {}).values():
        keep = [p for p in L if not (p.get('cf') == 1 or CROP.match(p.get('f', '')))]
        n += len(L) - len(keep)
        L[:] = keep
    return n


if __name__ == '__main__':
    d = load_all()
    n = drop_book(d)
    dump_all(d)
    print(f'{n} book crop record(s) dropped')
