# Writes the short ID tips (tools/id_tips.txt) into data.json as gen[g]['qt'].
import json, os
H = os.path.dirname(os.path.abspath(__file__)); D = os.path.join(H, '..', 'data.json')
d = json.load(open(D))
for g in d['gen'].values(): g.pop('qt', None)
for l in open(os.path.join(H, 'id_tips.txt')):
    if not l.strip() or l.startswith('#'): continue
    g, t = l.rstrip('\n').split('\t')
    d['gen'][g]['qt'] = [x.strip() for x in t.split('|')]
s = json.dumps(d, ensure_ascii=False, separators=(',', ':'))
open(D, 'w').write(s)
