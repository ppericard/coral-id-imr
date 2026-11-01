"""Write the Coral Finder box illustrations (tools/box_photos.txt) into data.json key leaves as "ph": [photo file, ...].
The files are crops of the book's own box pages (gen[].book, pg within the box's pages); re-runnable."""
import json
from datajson import dump  # the one data.json layout (one genus per line)
d = json.load(open('data.json'))
book = {p['f']: (n, p['pg']) for n, g in d['gen'].items() for p in g.get('book', [])}
pick = {}
for line in open('tools/box_photos.txt'):
    line = line.split('#')[0].strip()
    if line:
        k, v = line.split(':'); pick[k.strip()] = v.split()
for k in d['key']:
    for l in k['leaves']:
        l.pop('ph', None)
        for f in pick.get(l['id'], []):
            n, pg = book[f]
            assert l['a'] <= pg <= l['b'] and n in l['g'], (l['id'], f)
        if l['id'] in pick: l['ph'] = pick[l['id']]
dump(d, 'data.json')
print(len(pick), 'boxes illustrated')
