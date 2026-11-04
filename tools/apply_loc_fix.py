# Location labels corrected by hand (Pierre, 2026-11-04, after the presence analysis): game photos whose `loc` says the
# Philippines but whose iNaturalist observation is elsewhere. The five Anacropora photos below come from observations by
# tomas_cedhagen in Sabah, Malaysia (place guesses "Sabah, MY", "Kampong Mantanani, Sabah", "Baik Island, Malaysia";
# iNaturalist's places for them do not include the Philippines, place 6873, checked 2026-11-04). They become `world`, so
# the presence rule applies to them as to any photo taken abroad (admin "out of rule" flag, presence.js). Re-runnable:
#   python3 tools/apply_loc_fix.py
import json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from datajson import dump  # the one data.json layout

P = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data.json')
# iNaturalist observation id -> the right loc
FIX = {'149984703': 'world', '149988595': 'world', '149999806': 'world', '149999809': 'world', '150013033': 'world'}


def main():
    d = json.load(open(P, encoding='utf-8'))
    gen = {**d['gen'], **((d.get('x') or {}).get('gen') or {})}
    n = 0
    for g in gen.values():
        for L in [*(g.get('views') or {}).values(), *(g.get('more') or {}).values()]:
            for p in L:
                m = re.search(r'observations/(\d+)', p.get('o') or '')
                if m and m.group(1) in FIX and p.get('loc') != FIX[m.group(1)]:
                    p['loc'] = FIX[m.group(1)]
                    n += 1
    for L in (d.get('cand') or {}).values():
        for p in L:
            m = re.search(r'observations/(\d+)', p.get('o') or '')
            if m and m.group(1) in FIX and p.get('loc') != FIX[m.group(1)]:
                p['loc'] = FIX[m.group(1)]
                n += 1
    dump(d, P)
    print(f'{n} photo(s) relabelled')


if __name__ == '__main__':
    main()
