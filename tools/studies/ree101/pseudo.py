"""REE-101: join the Answers tab ranges read through the Sheets connector (A1:G, I1:L, R1:W, each {range, values})
and pseudonymise them at once: [row index, player label P1.., then the tab's columns from Time (B) to Scoring (W)],
the columns the lag table does not use left blank (Answered, Id, New photos, Seconds to Rank but Subject, the taxa).
Labels by first appearance; no name is written. Rows without a name are dropped (as REE-255's pseudo.py).
usage: python3 -I pseudo.py <A-G.json> <I-L.json> <R-W.json> <out.json>"""
import json
import sys

ag, il, rw = (json.load(open(p))['values'] for p in sys.argv[1:4])
assert ag[0][:2] == ['Name', 'Time'] and ag[0][6] == 'Photos', ag[0][:7]
assert il[0][0] == 'Expected' and il[0][3] == 'Choices', il[0]
assert rw[0][0] == 'Subject' and rw[0][5] == 'Scoring', rw[0]
KEEP = {1, 2, 4, 5, 6, 8, 9, 11, 17, 22}  # Time, Genus shown, Right, Mode, Photos, Expected, Ability, Choices, Subject, Scoring


def cell(rows, i, j):
    r = rows[i] if i < len(rows) else []
    return r[j] if j < len(r) else ''


lab = {}
out = []
for i in range(1, len(ag)):
    name = cell(ag, i, 0)
    if not str(name).strip():
        continue
    k = str(name).strip().lower()
    if k not in lab:
        lab[k] = 'P%d' % (len(lab) + 1)
    full = [cell(ag, i, j) for j in range(7)] + [''] + [cell(il, i, j) for j in range(4)] + [''] * 5 + [cell(rw, i, j) for j in range(6)]
    out.append([i + 1, lab[k]] + [full[c] if c in KEEP else '' for c in range(1, 23)])
json.dump(out, open(sys.argv[4], 'w'))
print('rows', len(out), 'players', len(lab), 'last time', max(r[2] for r in out), 'tab rows', len(ag) - 1, len(il) - 1, len(rw) - 1)
