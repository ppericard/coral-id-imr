# Writes the short ID tips (tools/id_tips.txt) into data.json as gen[g]['qt'].
import json, os
from datajson import dump  # the one data.json layout (one genus per line)
H = os.path.dirname(os.path.abspath(__file__)); D = os.path.join(H, '..', 'data.json')
d = json.load(open(D))
Q = {}
for l in open(os.path.join(H, 'id_tips.txt')):
    if not l.strip() or l.startswith('#'): continue
    g, t = l.rstrip('\n').split('\t')
    Q[g] = [x.strip() for x in t.split('|')]
# In place: a genus keeps its key order, so a re-run changes only the lines of the tips that changed (2026-11-03).
for n, g in d['gen'].items():
    if n in Q: g['qt'] = Q[n]
    else: g.pop('qt', None)
dump(d, D)
