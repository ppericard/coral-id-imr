// REE-255, the replay (README.md, declared before the fit): the sheet's photo Elo (core.js eloReplay, the rules of
// tools/sync/Code.gs statsStep_) replayed over the coral answers with the single-view offset as an input, one value per
// view, and each answer's expectation before its own step scored as next-answer log-loss, per player. Read-only: reads
// the pseudonymised extract and prep.py's rows, writes aggregates only (no player label) to the output file.
//
//   node tools/studies/ree255/replay.js <answers.json> <rows.json> <out.json>
//
// answers.json: [row index, player label, then the Answers tab's columns from Time on] (pseudo.py); rows.json: prep.py's
// (the answers scored: coral photo-quiz questions, typed and exam left out, and each photo's view).
// The expectation is the sheet's (the player's one level, the photo and genus ratings, the photo memory), not the app's
// (its per-genus ability): it shows what the photo ratings make of each offset.
'use strict';
const fs = require('fs'),
  path = require('path');
const C = require(path.join(__dirname, '..', '..', '..', 'core.js'));
const [IN, ROWS, OUT] = process.argv.slice(2);
if (!IN || !ROWS || !OUT) {
  console.error('usage: node replay.js <answers.json> <rows.json> <out.json>');
  process.exit(2);
}
const A = JSON.parse(fs.readFileSync(IN, 'utf8')),
  P = JSON.parse(fs.readFileSync(ROWS, 'utf8'));
// The coral rows as the sheet's readAnswers serves them: [id, time ms, shown, answered, right 0|1, mode, photos, expected,
// ability, new photos, choices, anonymous, seconds, enlarged, …, subject (17), rank (18)], in the tab's order.
const ms = s => Date.parse(String(s).replace(' ', 'T') + ':00') || 0,
  num = x => (x === '' || x == null || !isFinite(Number(x)) ? null : Number(x));
const rows = A.map(r => {
  const o = [r[1], ms(r[2]), r[3], r[4], Number(r[5]) ? 1 : 0, String(r[6] || ''), String(r[7] || ''), num(r[9]), num(r[10]), r[11], String(r[12] || ''), 0, num(r[13]), num(r[14])];
  o[17] = String(r[18] || '');
  o[18] = String(r[19] || '');
  o.tab = r[0];
  return o;
}).filter(r => C.rowSubject(r) === 'coral' && r[5] !== 'wink');
const VIEW = {},
  SCORED = new Map();
P.filter(r => r.s === 'coral').forEach(r => {
  r.fs.forEach((f, i) => (VIEW[f] = r.vs[i]));
  if (!['typed', 'exam'].includes(r.f)) SCORED.set(r.i, r);
});
const KINDS = ['wide', 'medium', 'macro'];

// core.js eloReplay with the single-view offset S {view: offset} (a photo alone of no known view: 0.5, today's) and,
// for each scored row, its expectation before its own step. Kept line for line with eloReplay but for the offset.
function replay(S) {
  const {MEM, PHOTO_W, PLAYER0, GENUS_K, memBucket, memFam, guessOf, trustOf} = C;
  const Pp = {},
    G = {},
    R = Object.create(null),
    H = {},
    trust = trustOf(rows),
    mem = MEM.PRIOR.slice(),
    I = [0, 0, 0, 0],
    infoAt = (x, k) => {
      const s = 1 / (1 + Math.exp(-x)),
        p = 1 / k + (1 - 1 / k) * s;
      return ((1 - 1 / k) * s * (1 - s)) ** 2 / (p * (1 - p));
    },
    tau = MEM.N * infoAt(1, 4),
    sig = x => 1 / (1 + Math.exp(-x)),
    E = new Map();
  rows
    .slice()
    .sort((a, b) => a[1] - b[1])
    .forEach(r => {
      const fs = r[6].split(/\s+/).filter(Boolean);
      if (!r[0] || !fs.length) return;
      const ok = r[4] ? 1 : 0,
        g = guessOf(r[5], r[10]),
        ra = (R[r[0]] = R[r[0]] || [PLAYER0, 0]);
      const gs = String(r[2] || ''),
        go = (G[gs] = G[gs] || [0, 0]),
        ph = fs.map(f => (Pp[f] = Pp[f] || [0, 0, 0, 0])),
        one = fs.length === 1 ? (S[VIEW[fs[0]]] ?? 0.5) : 0,
        b = go[0] + ph.reduce((t, p) => t + p[0], 0) / ph.length + one;
      const hs = fs.map(f => (H[r[0] + '|' + f] = H[r[0] + '|' + f] || [0, 0])),
        s = sig(ra[0] - b - memFam(hs, mem)),
        e = g + (1 - g) * s,
        d = ok - e,
        n = ra[1];
      if (SCORED.has(r.tab)) E.set(r.tab, e);
      if (trust[r[0]]) {
        const w = n / (n + PHOTO_W.N),
          D = (1 - g) * s * (1 - s),
          v = Math.max(1e-6, e * (1 - e)),
          Ab = [0, 0, 0, 0];
        ph.forEach(p => {
          p[0] -= (0.8 / (1 + p[2] / 10) / ph.length) * d * w;
          p[2] += w;
          p[1] += ok * w;
          p[3]++;
        });
        go[0] -= (GENUS_K / (1 + go[1] / 10)) * d * w;
        go[1] += w;
        hs.forEach(h => (Ab[memBucket(h)] += 1 / hs.length));
        for (let j = 1; j < 4; j++)
          if (Ab[j]) {
            I[j] += (w * (D * Ab[j]) ** 2) / v;
            mem[j] -= (w * d * D * Ab[j]) / v / (tau + I[j]);
          }
      }
      ra[0] += (0.6 / (1 + n / 40)) * d;
      ra[1]++;
      hs.forEach(h => {
        h[0]++;
        h[1] += ok;
      });
    });
  return {P: Pp, G, R, E};
}

// 1. The check: at 0.5 for every view the replay gives core.js eloReplay's ratings exactly.
const base = replay({wide: 0.5, medium: 0.5, macro: 0.5}),
  ref = C.eloReplay(rows);
let maxd = 0;
Object.keys(ref.P).forEach(f => (maxd = Math.max(maxd, Math.abs(ref.P[f][0] - base.P[f][0]))));
Object.keys(ref.R).forEach(w => (maxd = Math.max(maxd, Math.abs(ref.R[w][0] - base.R[w][0]))));
console.log('check against core.js eloReplay: largest difference', maxd, '(photos', Object.keys(ref.P).length + ')');
if (maxd > 1e-9) throw new Error('the replay does not match eloReplay');

// 2. Per player, the mean log-loss of the scored answers under an offset setting.
// KEEP: the scored answers read (all of them; the exploratory late-half run reads only those from LATE on: the replay
// itself still runs over the whole log).
let KEEP = () => true,
  players = [...new Set([...SCORED.values()].map(r => r.p))].sort();
const keep = f => {
  KEEP = f;
  players = [...new Set([...SCORED.values()].filter(KEEP).map(r => r.p))].sort();
};
const lossOf = E => {
  const by = {};
  SCORED.forEach((r, i) => {
    if (!KEEP(r)) return;
    const e = Math.min(1 - 1e-9, Math.max(1e-9, E.get(i))),
      l = -(r.y ? Math.log(e) : Math.log(1 - e));
    (by[r.p] = by[r.p] || []).push(l);
  });
  return Object.fromEntries(players.map(p => [p, by[p].reduce((t, x) => t + x, 0) / by[p].length]));
};
const calib = E => {
  const out = {};
  [...KINDS, 'multi'].forEach(k => {
    const L = [...SCORED.entries()].filter(([, r]) => r.k === k && KEEP(r));
    out[k] = {n: L.length, right: +(L.reduce((t, [, r]) => t + r.y, 0) / L.length).toFixed(3), predicted: +(L.reduce((t, [i]) => t + E.get(i), 0) / L.length).toFixed(3)};
  });
  return out;
};
const run = (grid, label) => {
  const pts = [];
  // shared: one value for every view; per-view: every combination
  grid.forEach(v => pts.push({kind: 'shared', S: {wide: v, medium: v, macro: v}}));
  grid.forEach(a => grid.forEach(b => grid.forEach(c => pts.push({kind: 'per-view', S: {wide: a, medium: b, macro: c}}))));
  pts.forEach(q => (q.L = lossOf(replay(q.S).E)));
  const mean = L => players.reduce((t, p) => t + L[p], 0) / players.length,
    others = (L, p) => players.filter(x => x !== p).reduce((t, x) => t + L[x], 0);
  const today = pts.find(q => q.kind === 'shared' && q.S.wide === 0.5);
  const res = {grid, label, today: {mean: +mean(today.L).toFixed(5), calib: calib(replay(today.S).E)}};
  ['shared', 'per-view'].forEach(kind => {
    const Q = pts.filter(q => q.kind === kind),
      best = Q.reduce((a, q) => (mean(q.L) < mean(a.L) ? q : a));
    // leave one player out: the setting chosen on the others, scored on the held-out player
    const held = players.map(p => {
      const q = Q.reduce((a, x) => (others(x.L, p) < others(a.L, p) ? x : a));
      return {p, S: q.S, l: q.L[p]};
    });
    res[kind] = {
      best_whole_log: best.S,
      best_mean: +mean(best.L).toFixed(5),
      calib_best: calib(replay(best.S).E),
      lopo_mean: +(held.reduce((t, h) => t + h.l, 0) / held.length).toFixed(5),
      lopo_settings: Object.entries(held.reduce((o, h) => ((o[JSON.stringify(h.S)] = (o[JSON.stringify(h.S)] || 0) + 1), o), {})).map(([s, n]) => ({S: JSON.parse(s), players: n})),
      held
    };
  });
  return res;
};
const signflip = d => {
  const n = d.length,
    obs = Math.abs(d.reduce((t, x) => t + x, 0) / n);
  let c = 0;
  for (let m = 0; m < 1 << n; m++) {
    let s = 0;
    for (let i = 0; i < n; i++) s += m & (1 << i) ? -d[i] : d[i];
    if (Math.abs(s / n) >= obs - 1e-15) c++;
  }
  return c / 2 ** n;
};
const out = {note: 'aggregates only, no player label (rule D2); method: README.md', check: maxd, scored: SCORED.size, players: players.length};
const declared = run([0, 0.125, 0.25, 0.375, 0.5], 'declared grid, 0 to 0.5'),
  wider = run([-1, -0.5, -0.25, 0, 0.25, 0.5, 0.75], 'wider grid, exploratory');
// Exploratory, added after the declared fit: the late half of the scored answers alone (fit.py's split), the grid
// declared; the photo ratings learned over the whole log before them.
const LATE = [...SCORED.values()].map(r => r.t).sort()[Math.floor(SCORED.size / 2)];
keep(r => r.t >= LATE);
const late = run([0, 0.125, 0.25, 0.375, 0.5], 'late half (from ' + LATE + '), declared grid, exploratory');
[declared, wider, late].forEach(R => {
  keep(R === late ? r => r.t >= LATE : () => true);
  const t = R.today,
    todayL = lossOf(replay({wide: 0.5, medium: 0.5, macro: 0.5}).E);
  R.tests = ['shared', 'per-view'].map(kind => {
    const d = R[kind].held.map(h => h.l - todayL[h.p]);
    return {vs: 'today', kind, mean_diff: +(d.reduce((a, x) => a + x, 0) / d.length).toFixed(5), players_lower: d.filter(x => x < 0).length, p: +signflip(d).toFixed(4)};
  });
  const ds = R['per-view'].held.map((h, i) => h.l - R.shared.held[i].l);
  R.tests.push({vs: 'shared', kind: 'per-view', mean_diff: +(ds.reduce((a, x) => a + x, 0) / ds.length).toFixed(5), players_lower: ds.filter(x => x < 0).length, p: +signflip(ds).toFixed(4)});
  ['shared', 'per-view'].forEach(k => delete R[k].held); // per-player values stay out of the output
  console.log(R.label, JSON.stringify({today: t, shared: R.shared, perView: R['per-view'], tests: R.tests}, null, 1));
});
out.declared = declared;
out.wider = wider;
out.late = late;
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
