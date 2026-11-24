"""REE-255: the single-view offset per view on the real answer log (the method: README.md, declared before the fit).

    P(right) = g + (1 - g) R sig(x + d_format + l_band + b_kind + a_player + b_genus [+ c_photo])

x the app's logged log-odds (prep.py), d_format fixed per format (k4 = 0), l_band fixed per band of the logged ability
on the genus, b_kind the excess of each view alone over several views (multi = 0), a and b (and c) normal random
intercepts whose SDs come from the Laplace approximation's marginal likelihood on a grid. Fitted by Fisher scoring
(numpy). Players are the unit: leave-one-player-out log-loss with an exact sign-flip test, a bootstrap over players.
Read-only: reads prep.py's rows, writes aggregates only (no player label) to the output file.

    python3 -I fit.py rows.json out.json [--boot 2000]
"""
import itertools
import json
import math
import sys
from collections import Counter, defaultdict

import os

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
import slot  # noqa: E402

if len(sys.argv) < 3:
    sys.exit('usage: python3 -I fit.py rows.json out.json [--boot 2000]')
slot.guard('tools/studies/ree255/fit.py')  # one heavy run at a time on the machine (rule W24)
ROWS, OUT = sys.argv[1], sys.argv[2]
BOOT = int(sys.argv[sys.argv.index('--boot') + 1]) if '--boot' in sys.argv else 2000
ALL = json.load(open(ROWS))
FIX_SD = 10.0
BANDS = ['under 0.5', '0.5 to 1.5', '1.5 and over']
KINDS = ['wide', 'medium', 'macro']
LABEL = {'wide': 'colony alone', 'medium': 'close-up alone', 'macro': 'corallites alone', 'multi': 'several views'}
STRUCT = {  # the kinds' fixed-effect columns: each a list of the kinds that share one coefficient
    'today': [],
    'shared': [['wide', 'medium', 'macro']],
    'two': [['wide', 'medium'], ['macro']],
    'per-view': [['wide'], ['medium'], ['macro']],
}


def band(a):
    if a is None:
        return 'no ability logged'
    return BANDS[0] if a < 0.5 else BANDS[1] if a < 1.5 else BANDS[2]


def sig(z):
    return 1 / (1 + np.exp(-z))


class Design:
    """The model's columns for a set of rows: fixed effects (bands, formats, kinds) then random intercepts."""

    def __init__(self, rows, groups, struct, rand=('p', 'u'), fmts=None, bands=None, ref_fmt='k4', xo=False,
                 kindcol=None):
        self.rows = rows
        kindcol = kindcol or (lambda r: r['k'])
        self.fmts = fmts or sorted({r['f'] for r in rows if r['f'] != ref_fmt})
        self.bands = bands or sorted({band(r['ab']) for r in rows}, key=lambda b: (b not in BANDS, BANDS.index(b) if b in BANDS else 9))
        cols = [('band', b) for b in self.bands] + [('fmt', f) for f in self.fmts] + [('kind', '+'.join(g)) for g in groups]
        self.nfix = len(cols)
        self.levels = {}
        for k in rand:
            # 'photo': each photo shown, 1/n each for a question with n photos (the question's difficulty is their mean)
            L = sorted({f for r in rows for f in r['fs']}) if k == 'photo' else sorted({r[k] for r in rows})
            self.levels[k] = L
            cols += [(k, v) for v in L]
        self.cols = cols
        idx = {c: i for i, c in enumerate(cols)}
        n = len(rows)
        X = np.zeros((n, len(cols)))
        for i, r in enumerate(rows):
            X[i, idx[('band', band(r['ab']))]] = 1
            if r['f'] != ref_fmt:
                X[i, idx[('fmt', r['f'])]] = 1
            for gk in groups:
                if kindcol(r) in gk:
                    X[i, idx[('kind', '+'.join(gk))]] = 1
            for k in rand:
                if k == 'photo':
                    for f in r['fs']:
                        X[i, idx[(k, f)]] += 1 / len(r['fs'])
                else:
                    X[i, idx[(k, r[k])]] = 1
        self.X = X
        self.x = np.array([r['x'] + (r['o'] if xo else 0) for r in rows])
        self.y = np.array([r['y'] for r in rows], float)
        self.g = np.array([r['g'] for r in rows])
        self.R = np.array([r['R'] for r in rows])
        self.rand = rand

    def prec(self, sds):
        lam = np.full(len(self.cols), 1 / FIX_SD ** 2)
        for i, c in enumerate(self.cols):
            if c[0] in sds:
                lam[i] = 1 / sds[c[0]] ** 2
        return lam


def prob(D, th, X=None, x=None, g=None, R=None):
    X = D.X if X is None else X
    x = D.x if x is None else x
    g = D.g if g is None else g
    R = D.R if R is None else R
    s = sig(x + X @ th)
    p = g + (1 - g) * R * s
    return np.clip(p, 1e-9, 1 - 1e-9), s


def fit(D, sds, w=None, th0=None, it=60):
    """MAP by Fisher scoring with step halving. w: row weights (the bootstrap's counts). Returns theta, H, loglik."""
    lam = D.prec(sds)
    w = np.ones(len(D.y)) if w is None else w
    th = np.zeros(len(D.cols)) if th0 is None else th0.copy()

    def obj(t):
        p, _ = prob(D, t)
        return float(np.sum(w * (D.y * np.log(p) + (1 - D.y) * np.log(1 - p))) - 0.5 * np.sum(lam * t * t))

    cur = obj(th)
    for _ in range(it):
        p, s = prob(D, th)
        dp = (1 - D.g) * D.R * s * (1 - s)
        gr = D.X.T @ (w * (D.y - p) / (p * (1 - p)) * dp) - lam * th
        W = w * dp * dp / (p * (1 - p))
        H = (D.X.T * W) @ D.X + np.diag(lam)
        step = np.linalg.solve(H, gr)
        t = 1.0
        while t > 1e-4:
            nt = th + t * step
            no = obj(nt)
            if no >= cur - 1e-10:
                break
            t /= 2
        th, old, cur = nt, cur, no
        if abs(cur - old) < 1e-8:
            break
    p, s = prob(D, th)
    dp = (1 - D.g) * D.R * s * (1 - s)
    H = (D.X.T * (w * dp * dp / (p * (1 - p)))) @ D.X + np.diag(lam)
    ll = float(np.sum(w * (D.y * np.log(p) + (1 - D.y) * np.log(1 - p))))
    return th, H, ll


def laplace(D, sds):
    th, H, ll = fit(D, sds)
    lam = D.prec(sds)
    sign, logdet = np.linalg.slogdet(H)
    return ll - 0.5 * float(np.sum(lam * th * th)) + 0.5 * float(np.sum(np.log(lam))) - 0.5 * logdet, th, H


def choose_sds(D, grid=(0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.8, 1.0, 1.5)):
    """The random-effect SDs maximising the Laplace marginal likelihood, one coordinate at a time on the grid."""
    sds = {k: 0.4 for k in D.rand}
    best = laplace(D, sds)[0]
    for _ in range(4):
        moved = False
        for k in D.rand:
            for v in grid:
                t = dict(sds, **{k: v})
                m = laplace(D, t)[0]
                if m > best + 1e-6:
                    best, sds, moved = m, t, True
        if not moved:
            break
    return sds, best


def kind_coefs(D, th, H=None):
    out = {}
    for i, c in enumerate(D.cols):
        if c[0] == 'kind':
            out[c[1]] = {'b': round(float(th[i]), 3)}
            if H is not None:
                out[c[1]]['se'] = round(float(math.sqrt(np.linalg.inv(H)[i, i])), 3)
    return out


def coefs(D, th, kind):
    return {c[1]: round(float(th[i]), 3) for i, c in enumerate(D.cols) if c[0] == kind}


def boot(rows, groups, sds, B, seed=255, **kw):
    """Percentile intervals of the kind coefficients over players (a player drawn twice counts twice)."""
    D = Design(rows, groups, None, **kw)
    th, _, _ = fit(D, sds)
    players = sorted({r['p'] for r in rows})
    pidx = defaultdict(list)
    for i, r in enumerate(rows):
        pidx[r['p']].append(i)
    rng = np.random.default_rng(seed)
    ki = [i for i, c in enumerate(D.cols) if c[0] == 'kind']
    draws = []
    for _ in range(B):
        cnt = Counter(rng.choice(players, len(players)))
        w = np.zeros(len(rows))
        for p, c in cnt.items():
            w[pidx[p]] = c
        t, _, _ = fit(D, sds, w=w, th0=th, it=25)
        draws.append(t[ki])
    A = np.array(draws)
    return {D.cols[i][1]: [round(float(np.percentile(A[:, j], 2.5)), 3), round(float(np.percentile(A[:, j], 97.5)), 3)]
            for j, i in enumerate(ki)}, A


def split_boot(rows, half, sds, B, seed=2552):
    """Exploratory: β early (before half) less β late, per-view and shared, with percentile intervals over players."""
    E = [r for r in rows if r['t'] < half]
    L = [r for r in rows if r['t'] >= half]
    players = sorted({r['p'] for r in rows})
    res = {}
    for name in ('per-view', 'shared'):
        DE, DL = Design(E, STRUCT[name], None), Design(L, STRUCT[name], None)
        tE, _, _ = fit(DE, sds)
        tL, _, _ = fit(DL, sds)
        kE = [i for i, c in enumerate(DE.cols) if c[0] == 'kind']
        kL = [i for i, c in enumerate(DL.cols) if c[0] == 'kind']
        names = [DE.cols[i][1] for i in kE]
        point = tE[kE] - tL[kL]
        rng = np.random.default_rng(seed)
        pE, pL = np.array([r['p'] for r in E]), np.array([r['p'] for r in L])
        draws = []
        for _ in range(B):
            cnt = Counter(rng.choice(players, len(players)))
            wE = np.array([cnt.get(p, 0) for p in pE], float)
            wL = np.array([cnt.get(p, 0) for p in pL], float)
            a, _, _ = fit(DE, sds, w=wE, th0=tE, it=25)
            b, _, _ = fit(DL, sds, w=wL, th0=tL, it=25)
            draws.append(a[kE] - b[kL])
        A = np.array(draws)
        res[name] = {k: {'diff': round(float(point[j]), 3), 'ci': [round(float(np.percentile(A[:, j], 2.5)), 3),
                                                                    round(float(np.percentile(A[:, j], 97.5)), 3)]}
                     for j, k in enumerate(names)}
    res['players'] = {'early': len({r['p'] for r in E}), 'late': len({r['p'] for r in L}),
                      'both': len({r['p'] for r in E} & {r['p'] for r in L})}
    return res


def lopo(rows, sds, structs, **kw):
    """Leave one player out: per player, the mean log-loss of each structure on their answers."""
    players = sorted({r['p'] for r in rows})
    res = {p: {} for p in players}
    for name, groups in structs.items():
        D = Design(rows, groups, None, **kw)
        pid = np.array([r['p'] for r in rows])
        for p in players:
            tr = pid != p
            w = tr.astype(float)
            th, _, _ = fit(D, sds, w=w)
            pr, _ = prob(D, th)
            te = ~tr
            ll = -(D.y[te] * np.log(pr[te]) + (1 - D.y[te]) * np.log(1 - pr[te]))
            res[p][name] = float(ll.mean())
            res[p]['n'] = int(te.sum())
    return res


def signflip(d):
    """Exact two-sided sign-flip test of the mean of d (one value per player)."""
    d = np.array(d)
    obs = abs(d.mean())
    n = len(d)
    if n > 20:
        rng = np.random.default_rng(255)
        S = rng.choice([-1, 1], size=(100000, n))
        return float(np.mean(np.abs((S * d).mean(1)) >= obs - 1e-15))
    c = 0
    for s in itertools.product((-1, 1), repeat=n):
        c += abs(float(np.dot(s, d)) / n) >= obs - 1e-15
    return c / 2 ** n


def holm(ps):
    order = sorted(range(len(ps)), key=lambda i: ps[i])
    out, run = [None] * len(ps), 0
    for r, i in enumerate(order):
        run = max(run, min(1, (len(ps) - r) * ps[i]))
        out[i] = run
    return out


def pts(D, th, rows, kind_name):
    """The change in the expected success of the rows of one kind if the offset moved by the kind's coefficient
    (percentage points): mean of p(x + b) - p(x), from the app's own x."""
    i = [j for j, c in enumerate(D.cols) if c == ('kind', kind_name)]
    if not i:
        return None
    b = th[i[0]]
    sel = np.array([r['k'] in kind_name.split('+') for r in rows])
    p0 = D.g + (1 - D.g) * D.R * sig(D.x)
    p1 = D.g + (1 - D.g) * D.R * sig(D.x + b)
    return round(100 * float(np.mean((p1 - p0)[sel])), 1)


def describe(rows):
    """REE-252's table, recomputed: right %, mean expected and observed - expected by kind."""
    out = []
    for k in KINDS + ['multi']:
        R = [r for r in rows if r['k'] == k]
        pl = Counter(r['p'] for r in R)
        out.append({'kind': LABEL[k], 'n': len(R), 'players': len(pl), 'players10': sum(v >= 10 for v in pl.values()),
                    'right': round(100 * sum(r['y'] for r in R) / len(R), 1),
                    'expected': round(100 * sum(r['e'] for r in R) / len(R), 1),
                    'obs_minus_exp': round(100 * sum(r['y'] - r['e'] for r in R) / len(R), 1),
                    'formats': dict(Counter(r['f'] for r in R).most_common()),
                    'bands': dict(Counter(band(r['ab']) for r in R).most_common())})
    return out


def main():
    out = {'note': 'aggregates only, no player label (rule D2); method: README.md'}
    C = [r for r in ALL if r['s'] == 'coral' and r['f'] not in ('typed', 'exam')]
    out['rows'] = {'coral answers': len(C), 'players': len({r['p'] for r in C}), 'genera': len({r['u'] for r in C}),
                   'left out (typed, exam)': sum(1 for r in ALL if r['s'] == 'coral' and r['f'] in ('typed', 'exam')),
                   'with a scoring record': sum(r['has_sc'] for r in C),
                   'first, last': [min(r['t'] for r in C), max(r['t'] for r in C)]}
    out['describe'] = describe(C)
    print(json.dumps(out['rows']))
    for x in out['describe']:
        print(x)

    # 1. the SDs on the per-view model, then every structure on the whole log
    Dpv = Design(C, STRUCT['per-view'], None)
    sds, lm = choose_sds(Dpv)
    print('SDs', sds, 'laplace', round(lm, 2))
    out['sds'] = sds
    out['whole'] = {}
    for name, groups in STRUCT.items():
        D = Design(C, groups, None)
        m, th, H = laplace(D, sds)
        out['whole'][name] = {'laplace_loglik': round(m, 2), 'kinds': kind_coefs(D, th, H),
                              'formats': coefs(D, th, 'fmt'), 'bands': coefs(D, th, 'band'),
                              'points': {g: pts(D, th, C, g) for g in ['+'.join(x) for x in groups]}}
        print(name, out['whole'][name])

    # 2. leave one player out (the primary comparison)
    L = lopo(C, sds, STRUCT)
    comp = [('per-view', 'shared'), ('shared', 'today'), ('two', 'per-view')]
    out['lopo'] = {'per structure, mean over players': {s: round(float(np.mean([L[p][s] for p in L])), 5) for s in STRUCT},
                   'tests': []}
    ps = []
    for a, b in comp:
        d = [L[p][a] - L[p][b] for p in sorted(L)]
        p = signflip(d)
        ps.append(p)
        out['lopo']['tests'].append({'a': a, 'b': b, 'mean_diff': round(float(np.mean(d)), 5),
                                     'players_a_lower': int(sum(x < 0 for x in d)), 'players': len(d), 'p': round(p, 4)})
    for t, h in zip(out['lopo']['tests'], holm(ps)):
        t['holm'] = round(h, 4)
    print('lopo', out['lopo'])

    # 3. intervals over players
    out['boot'] = {}
    for name in ('shared', 'two', 'per-view'):
        ci, A = boot(C, STRUCT[name], sds, BOOT)
        out['boot'][name] = ci
        if name == 'per-view':
            K = [c[1] for c in Design(C, STRUCT[name], None).cols if c[0] == 'kind']
            iw, im, ic = K.index('wide'), K.index('medium'), K.index('macro')
            dif = {'wide - macro': A[:, iw] - A[:, ic], 'medium - macro': A[:, im] - A[:, ic],
                   'wide - medium': A[:, iw] - A[:, im]}
            out['boot']['per-view differences'] = {k: [round(float(np.percentile(v, 2.5)), 3),
                                                       round(float(np.percentile(v, 97.5)), 3)] for k, v in dif.items()}
    print('boot', out['boot'])

    # 4. sensitivities (declared, uncorrected): the per-view model unless said
    sens = {}

    def one(label, rows, groups=STRUCT['per-view'], sd=None, **kw):
        D = Design(rows, groups, None, **kw)
        th, H, _ = fit(D, sd or sds)
        sens[label] = {'n': len(rows), 'players': len({r['p'] for r in rows}), 'kinds': kind_coefs(D, th, H)}
        print(label, sens[label])

    one('hint 1: several views without close-up + corallites', [r for r in C if not (r['k'] == 'multi' and r['views'] == 'macro+medium')])
    one('hint 2: several views without any corallites photo', [r for r in C if not (r['k'] == 'multi' and 'macro' in r['views'])])
    one('the game\'s format offset (rows with a scoring record, x + o)', [r for r in C if r['has_sc']], xo=True)
    one('the rows with a scoring record, x alone', [r for r in C if r['has_sc']])
    # a photo intercept beside the genus's: its SD chosen as the others were (the player's and genus's kept)
    Dph = Design(C, STRUCT['per-view'], None, rand=('p', 'u', 'photo'))
    best, psd = None, None
    for v in (0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.8):
        m = laplace(Dph, dict(sds, photo=v))[0]
        if best is None or m > best:
            best, psd = m, v
    out['photo_sd'] = psd
    one('a photo intercept beside the genus\'s (SD %s)' % psd, C, sd=dict(sds, photo=psd), rand=('p', 'u', 'photo'))
    half = sorted(r['t'] for r in C)[len(C) // 2]
    one('early half (before ' + half + ')', [r for r in C if r['t'] < half])
    one('late half (from ' + half + ')', [r for r in C if r['t'] >= half])
    for b in BANDS:
        one('band ' + b, [r for r in C if band(r['ab']) == b])
    Ct = [r for r in ALL if r['s'] == 'coral' and r['f'] != 'exam']
    one('typed answers kept', Ct)
    out['sensitivities'] = sens

    # 4b. exploratory, added after the declared fit (uncorrected): does the excess sit on photos with few earlier
    # answers (the ratings then still near their genus's), as the early/late split suggests?
    sens = {}
    one('photos with under 5 earlier answers (mean over the photos shown)', [r for r in C if r['pn'] < 5])
    one('photos with 5 or more earlier answers', [r for r in C if r['pn'] >= 5])
    one('late half with a photo intercept', [r for r in C if r['t'] >= half], sd=dict(sds, photo=psd), rand=('p', 'u', 'photo'))
    out['exploratory'] = sens
    sc = [r['t'] for r in C if r['has_sc']]
    out['scoring record rows'] = {'first': min(sc), 'last': max(sc), 'rows before the split': sum(t < half for t in sc)}
    # the early - late difference over players (each draw: the players resampled, both halves refitted on them)
    out['early minus late'] = split_boot(C, half, sds, BOOT)
    print('early - late', out['early minus late'], out['scoring record rows'])

    # 5. fish (exploratory): the judged framing in place of the view, profile + whole the reference
    F = [r for r in ALL if r['s'] == 'fish' and r['f'] not in ('typed', 'exam') and r.get('jt')]

    def fr(r):
        t = r['jt']
        if t[1:2] == '0':
            return 'part of the fish'
        return {'p': 'profile', 'o': 'oblique', 'd': 'from above'}.get(t[:1], 'head-on or tail')
    for r in F:
        r['k'] = fr(r)
    groups = [['oblique'], ['from above'], ['part of the fish'], ['head-on or tail']]
    D = Design(F, groups, None)
    fsds, _ = choose_sds(D)
    th, H, _ = fit(D, fsds)
    out['fish_exploratory'] = {'n': len(F), 'players': len({r['p'] for r in F}), 'sds': fsds,
                               'framing counts': dict(Counter(r['k'] for r in F).most_common()),
                               'framing vs profile (logits)': kind_coefs(D, th, H),
                               'no tag (photo no longer in the game file)': sum(1 for r in ALL if r['s'] == 'fish' and not r.get('jt'))}
    S = [r for r in ALL if r['s'] == 'seaslug']
    out['seaslug'] = {'n': len(S), 'players': len({r['p'] for r in S})}
    print('fish', out['fish_exploratory'])
    json.dump(out, open(OUT, 'w'), indent=1)


main()
