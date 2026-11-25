"""Credit the IMR lecture photos traced to their original source (Pierre, 2026-11-15, after the study
docs/reviews/2026-11-15-imr-lecture-photo-sources-study.md, #925: "credit the photos now with their original sources").

From tools/instances/imr/imr_sources.json, each lecture photo found as an original (Corals of the World, its photographer named on the
species page) gets, on its course record:
  a   its credit, "<photographer> / Corals of the World" (no licence in it: the site states none per picture, so
      core.js licOf reads none);
  pg  the page that states the credit (the species page), the link of the credit.
Never `o` (the engine's observation, the colony a question's photos come from and the photo memory's key: two lecture
photos of one species page are two colonies) nor `src` (the online original, written by tools/apply_imr_originals.py).
`imr: true` stays (rule P1's order and the IMR origin are unchanged). A photo found only as copies, or not found, is left
as it is: the admin marks it "source unknown".

The course records are data.json `course` (the photos in play) and the ones Pierre's exclusions archived in data/excluded.json
(tools/excluded.py drop_excluded: "in": "course"), so a photo excluded keeps its credit and a Restore brings it back
credited (Codex review #939). Idempotent; writes both through tools/datajson.py (rule W16).

    python3 tools/apply_imr_sources.py           # write
    python3 tools/apply_imr_sources.py --check   # exit 1 when a file differs from what it would write
"""
import json, os, sys
from datajson import load, dump, dumps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'tools', 'instances', 'imr', 'imr_sources.json')
GONE = os.path.join(ROOT, 'data/excluded.json')


def traced(S):
    """{photo: its source}, the lecture photos found as originals."""
    return {f: r['source'] for f, r in S['photos'].items() if r.get('found') == 'original' and r.get('source')}


def records(d, X):
    """Every course record: data.json course, and the ones data/excluded.json archived from it."""
    for L in d['course'].values():
        yield from L
    for x in ((X or {}).get('photos') or {}).values():
        if x.get('in') == 'course' and x.get('p'):
            yield x['p']


def apply(d, X, S):
    """d: data.json; X: data/excluded.json (or None); S: imr_sources.json. Credits every traced record; returns their files."""
    want, done = traced(S), set()
    for p in records(d, X):
        s = want.get(p.get('f'))
        if s:
            p['a'] = f"{s['author']} / {s['site']}"
            p['pg'] = s['page']
            done.add(p['f'])
    return done


def main():
    S = json.load(open(SRC))
    d = load()
    X = load(GONE) if os.path.exists(GONE) else None
    before = (dumps(d), X and dumps(X))
    done = apply(d, X, S)
    missing = sorted(set(traced(S)) - done)
    if missing:
        sys.exit('in neither data.json course nor data/excluded.json: ' + ', '.join(missing))
    if '--check' in sys.argv:
        ok = (dumps(d), X and dumps(X)) == before
        sys.exit(0 if ok else 'the IMR lecture credits are not applied (python3 tools/apply_imr_sources.py)')
    dump(d)
    if X is not None:
        dump(X, GONE)
    print(f'{len(done)} IMR lecture photos credited')


if __name__ == '__main__':
    main()
