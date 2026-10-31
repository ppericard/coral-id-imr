# Moves the lecture comparison images listed in tools/lecture_cmp.tsv out of course/views/more into data.json "cmp".
import json, os
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
d = json.load(open(f'{R}/data.json'))
cmp = {c['f']: c for c in d.get('cmp', [])}
for l in open(f'{R}/tools/lecture_cmp.tsv'):
    if not l.strip() or l.startswith('#'): continue
    f, gs, cap = l.rstrip('\n').split('\t')
    found = None
    for g, L in d['course'].items():
        for p in [p for p in L if p['f'] == f]: L.remove(p); found = found or p
    for x in d['gen'].values():
        for k in ('views', 'more'):
            for L in (x.get(k) or {}).values():
                for p in [p for p in L if p['f'] == f]: L.remove(p); found = found or p
    base = cmp.get(f) or {k: v for k, v in (found or {}).items() if k in ('f', 'imr', 'slide')} or {'f': f, 'imr': True}
    cmp[f] = {**base, 'g': gs.split(','), 'cap': cap}
d['cmp'] = list(cmp.values())
json.dump(d, open(f'{R}/data.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print(d['cmp'])
