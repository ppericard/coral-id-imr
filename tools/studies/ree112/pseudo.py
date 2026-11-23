"""Pseudonymise the Answers tab extract (Sheets connector JSON) into the q351 format:
[row index, player label P1.., then the tab's columns from Time on]. Labels by first appearance; no name is written.
usage: python3 -I pseudo.py <get_values.json> <out.json>"""
import json, sys

src = json.load(open(sys.argv[1]))
vals = src['values']
assert vals[0][0] == 'Name', vals[0][:3]
lab = {}
out = []
for i, r in enumerate(vals[1:], start=2):
    if not r or not r[0]:
        continue
    k = r[0].strip().lower()
    if k not in lab:
        lab[k] = 'P%d' % (len(lab) + 1)
    out.append([i, lab[k]] + r[1:])
json.dump(out, open(sys.argv[2], 'w'))
print('rows', len(out), 'players', len(lab), 'header', vals[0][1:])
