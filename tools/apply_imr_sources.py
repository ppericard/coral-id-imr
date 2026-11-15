"""Credit the IMR lecture photos traced to their original source (Pierre, 2026-11-15, after the study
docs/reviews/2026-11-15-imr-lecture-photo-sources-study.md, #925: "credit the photos now with their original sources").

From tools/imr_sources.json, each lecture photo found as an original (Corals of the World, its photographer named on the
species page) gets, on its data.json `course` record:
  a   its credit, "<photographer> / Corals of the World" (no licence in it: the site states none per picture, so
      core.js licOf reads none);
  pg  the page that states the credit (the species page), the link of the credit.
Never `o` (the engine's observation, the colony a question's photos come from and the photo memory's key: two lecture
photos of one species page are two colonies) nor `src` (an online original the app would read once R2 fails).
`imr: true` stays (rule P1's order and the IMR origin are unchanged). A photo found only as copies, or not found, is left
as it is: the admin marks it "source unknown". Idempotent; writes data.json through tools/datajson.py (rule W16).

    python3 tools/apply_imr_sources.py           # write
    python3 tools/apply_imr_sources.py --check   # exit 1 when data.json differs from what it would write
"""
import json, os, sys
from datajson import load, dump, dumps, PATH

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'tools', 'imr_sources.json')


def credit(s):
    return f"{s['author']} / {s['site']}"


def apply(d, S):
    """d: data.json; S: imr_sources.json. Returns the files credited."""
    want = {f: r['source'] for f, r in S['photos'].items() if r.get('found') == 'original' and r.get('source')}
    done = set()
    for L in d['course'].values():
        for p in L:
            s = want.get(p.get('f'))
            if not s:
                continue
            p['a'] = credit(s)
            p['pg'] = s['page']
            done.add(p['f'])
    return done


def main():
    S = json.load(open(SRC))
    d = load()
    before = dumps(d)
    done = apply(d, S)
    want = {f for f, r in S['photos'].items() if r.get('found') == 'original' and r.get('source')}
    missing = sorted(want - done)
    if missing:
        sys.exit('not in data.json course: ' + ', '.join(missing))
    if '--check' in sys.argv:
        sys.exit(0 if dumps(d) == before else 'data.json: the IMR lecture credits are not applied (python3 tools/apply_imr_sources.py)')
    dump(d)
    print(f'{len(done)} IMR lecture photos credited')


if __name__ == '__main__':
    main()
