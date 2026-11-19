# Writes the short ID tips (tools/id_tips.txt) into data.json as gen[g]['qt'].
# A line with a third column, "Coral Finder", is a genus the lecture slides do not cover: its tips are condensed from its
# Coral Finder criteria, so it also gets gen[g]['tl'], the heading every tips box shows ("ID tips (Coral Finder p. 66)",
# its book pages from gen[g]['pages']), never the IMR heading (rules C1, C2).
import json, os
from datajson import dump  # the one data.json layout (one genus per line)
H = os.path.dirname(os.path.abspath(__file__)); D = os.path.join(H, '..', 'data.json')
d = json.load(open(D))
Q, SRC = {}, {}
for l in open(os.path.join(H, 'id_tips.txt')):
    if not l.strip() or l.startswith('#'): continue
    g, t, *s = l.rstrip('\n').split('\t')
    Q[g] = [x.strip() for x in t.split('|')]
    if s and s[0].strip():
        assert s[0].strip() == 'Coral Finder', (g, s)
        SRC[g] = s[0].strip()
# In place: a genus keeps its key order, so a re-run changes only the lines of the tips that changed.
for n, g in d['gen'].items():
    if n in Q: g['qt'] = Q[n]
    else: g.pop('qt', None)
    if n in SRC:
        assert g.get('pages') and not g.get('imr'), n  # a Coral Finder source is for a genus with book pages and no lecture notes
        g['tl'] = 'ID tips (Coral Finder p. ' + ', '.join(str(p) for p in g['pages']) + ')'
    else: g.pop('tl', None)
dump(d, D)
