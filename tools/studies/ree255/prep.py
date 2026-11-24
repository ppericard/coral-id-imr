"""REE-255 prep: the photo-quiz answers of the pseudonymised Answers extract, one row per answer with what the offset
fit needs: the player label, the unit shown, right or not, the format (core.js fmtOf), the guess rate (core.js
guessOf), the app's logged expectation e and its log-odds x (analysis.js prep), the format offset the game scored with
(the scoring record's o), the ability on the unit (the Ability column), and what the question showed:
- corals: the view of each photo (data.json views, with Pierre's adds and moves in curation.json genera), the kind
  'wide' / 'medium' / 'macro' alone or 'multi' (several views of one colony);
- fish and sea slugs: one photo per question; its judged framing (the game file's jt: first letter the view, p profile,
  o oblique, h head-on, t tail, d from above; second the whole fish 1 or a part 0).
Read-only; writes the rows (labels only, never a name: rule D2) to the output path, which stays outside the repository.

usage: python3 -I prep.py <answers.json> <repo checkout> <rows.json>
answers.json: [row index, player label, then the Answers tab's columns from Time on] (pseudo.py).
"""
import json
import math
import os
import re
import sys
from collections import Counter

ANS, REPO, OUT = sys.argv[1:4]
A = json.load(open(ANS))
J = lambda f: json.load(open(os.path.join(REPO, f), encoding='utf-8'))  # noqa: E731
data, cur = J('data.json'), J('curation.json')
VIEWS = ('wide', 'medium', 'macro')

# Corals: each photo's view, as REE-252's coral_views.py read it (data.json views, then Pierre's adds and moves).
VIEW = {}


def walk(d):
    # a lecture photo carries its view (course: {f, v}); a game photo is listed under its genus's views
    if isinstance(d, list):
        for x in d:
            walk(x)
    elif isinstance(d, dict):
        if isinstance(d.get('f'), str) and d.get('v') in VIEWS:
            VIEW.setdefault(d['f'], d['v'])
        for v, L in (d.get('views') or {}).items() if isinstance(d.get('views'), dict) else []:
            for p in L or []:
                if isinstance(p, dict) and p.get('f') and v in VIEWS:
                    VIEW[p['f']] = v
        for x in d.values():
            walk(x)


walk(data)
for g, c in (cur.get('genera') or {}).items():
    for key in ('add', 'move'):
        for f, v in ((c or {}).get(key) or {}).items():
            if isinstance(v, str) and v in VIEWS:
                VIEW[f] = v
STEM = re.compile(r'-(wide|medium|macro)-')


def view_of(f):
    if f in VIEW:
        return VIEW[f]
    m = STEM.search(f)
    return m.group(1) if m else None


# Fish and sea slugs: each game photo's judged tags (jt) and ease (e).
JT = {}
for sid, fn in (('fish', 'fish-game.json'), ('seaslug', 'seaslug-game.json')):
    try:
        G = J(fn)
    except FileNotFoundError:
        continue
    for L in (G.get('photos') or {}).values():
        for p in L if isinstance(L, list) else []:
            if isinstance(p, dict) and p.get('f'):
                JT[(sid, p['f'])] = (str(p.get('jt') or ''), p.get('e'))

TYPED = re.compile(r'\|t(\||$)')


def fmt_of(m, nch):  # core.js fmtOf
    if TYPED.search(m):
        return 'typed'
    if m.startswith('quiz-duel'):
        return 'duel'
    if re.search(r'\|d(\||$)', m):
        return 'qduel'
    if re.search(r'\|f(\||$)', m):
        return 'find'
    if re.search(r'\|x(\||$)', m):
        return 'exam'
    if nch == 2:
        return 'again'
    k = re.search(r'\|k(\d)', m)
    return ('k3' if int(k.group(1)) >= 3 else 'k2') if k and int(k.group(1)) < 4 else 'k4'


def guess_of(m, ch):  # core.js guessOf
    if TYPED.search(m):
        return 0.0
    k = re.search(r'\|k(\d)$', m)
    if k:
        return 1 / int(k.group(1))
    if m.startswith('quiz-duel'):
        return 0.5
    n = len(str(ch or '').split())
    return 1 / n if 2 <= n < 4 else 0.25


def num(x):
    try:
        v = float(x)
        return v if math.isfinite(v) else None
    except (TypeError, ValueError):
        return None


rows, skip = [], Counter()
# How many earlier answers (every player, any game) each photo of the subject had: the photo ratings learn from them
# (exploratory, after the declared fit: whether an excess sits on photos with few answers). Tab order between equal times.
seen, PN = Counter(), {}
for r in sorted(A, key=lambda r: (str(r[2]), r[0])):
    s = (r[18] if len(r) > 18 else '') or 'coral'
    fs = str(r[7]).split()
    if fs:
        PN[r[0]] = sum(seen[(s, f)] for f in fs) / len(fs)
        for f in fs:
            seen[(s, f)] += 1
for r in A:
    r = list(r) + [''] * (24 - len(r))
    subj = r[18] or 'coral'
    m = str(r[6])
    if not m.startswith('quiz') or re.search(r'\|f(\||$)', m):
        skip['not a photo-quiz question (or a Find the X)'] += 1
        continue
    fs = str(r[7]).split()
    if not fs or not r[3]:
        skip['no photo or no unit shown'] += 1
        continue
    e = num(r[9])
    if e is None:
        skip['no logged expectation'] += 1
        continue
    ch = str(r[12] or '')
    g = guess_of(m, ch)
    sc = {}
    if r[23]:
        try:
            sc = json.loads(r[23])
        except ValueError:
            sc = {}
    R = num(sc.get('r'))
    R = R if R and 0 < R <= 1 else 1.0  # the comeback recall: e = g + (1 - g) R sig(x)
    q = min(0.99, max(0.01, (e - g) / ((1 - g) * R) if g < 1 else 0.5))
    row = {'i': r[0], 'p': r[1], 't': r[2], 's': subj, 'u': r[3], 'y': 1 if str(r[5]) in ('1', 'TRUE', 'true') else 0, 'm': m,
           'f': fmt_of(m, len(ch.split())), 'g': round(g, 4), 'R': R, 'e': e, 'x': round(math.log(q / (1 - q)), 4),
           'o': num(sc.get('o')) or 0.0, 'has_sc': 1 if sc else 0, 'ab': num(r[10]), 'n': len(fs), 'fs': fs, 'pn': PN.get(r[0], 0)}
    if subj == 'coral':
        vs = [view_of(f) for f in fs]
        if None in vs:
            skip['coral photo with no known view'] += 1
            continue
        row['views'] = '+'.join(sorted(vs))
        row['vs'] = vs
        row['k'] = vs[0] if len(fs) == 1 else 'multi'
    else:
        tg = JT.get((subj, fs[0]))
        row['k'] = 'one photo'
        row['jt'] = tg[0][:2] if tg else None
        row['ease'] = tg[1] if tg else None
    rows.append(row)
json.dump(rows, open(OUT, 'w'))
print('rows', len(rows), 'skipped', dict(skip))
for s in ('coral', 'fish', 'seaslug'):
    R = [x for x in rows if x['s'] == s]
    print(s, len(R), 'players', len({x['p'] for x in R}), 'kinds', Counter(x['k'] for x in R).most_common(),
          'formats', Counter(x['f'] for x in R).most_common(), 'with scoring record', sum(x['has_sc'] for x in R))
F = [x for x in rows if x['s'] != 'coral']
print('fish/seaslug framing tags', Counter((x['s'], (x.get('jt') or '??')[:2]) for x in F).most_common(20))
