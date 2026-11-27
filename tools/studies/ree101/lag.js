// REE-101: the photo-memory lag table (docs/reviews/2026-11-25-photo-memory-lag-table-2.md; the method is the plan of
// docs/reviews/2026-11-15-photo-memory-lag-table.md, rewritten from its description). Read-only: reads the pseudonymised
// extract (pseudo.py), prints aggregates and writes them to the output file, with no player label.
//
//   node tools/studies/ree101/lag.js <answers.json> <out.json> [--secondary] [--until "YYYY-MM-DD HH:MM"]
//        [--mem coral=0,0.35,-0.68,-1.17] [--subjects coral,fish,seaslug]
//
// answers.json: [tab row, player label, then the Answers tab's columns from Time (B) to Scoring (W)].
// --secondary: the logged Expected as it is, on every row with one (the plan's robustness run).
// --until: rows up to that minute only (the reproduction of the 2026-11-15 read). --mem: a subject's offsets for the
// swap instead of photoMemOf on the read (corals) or MEM.PRIOR (every other subject, as model.js pmem).
'use strict';
const fs = require('fs'),
  path = require('path');
const C = require(path.join(__dirname, '..', '..', '..', 'core.js'));

const argv = process.argv.slice(2),
  opt = k => {
    const i = argv.indexOf(k);
    return i >= 0 ? argv[i + 1] : null;
  };
const [IN, OUT] = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && ['--until', '--mem', '--subjects', '--seed', '--draws'].includes(argv[i - 1])));
if (!IN || !OUT) {
  console.error('usage: node lag.js <answers.json> <out.json> [--secondary] [--until T] [--mem subj=a,b,c,d] [--subjects a,b]');
  process.exit(2);
}
const SECONDARY = argv.includes('--secondary'),
  UNTIL = opt('--until'),
  MEMARG = {},
  SUBJ = (opt('--subjects') || 'coral,fish,seaslug').split(','),
  SEED = Number(opt('--seed') || 1),
  NDRAWS = Number(opt('--draws') || 2000);
(opt('--mem') || '')
  .split(';')
  .filter(Boolean)
  .forEach(s => {
    const [k, v] = s.split('=');
    MEMARG[k] = v.split(',').map(Number);
  });

// Time: "YYYY-MM-DD HH:MM" Manila, read as UTC (only differences are used).
const ms = s => {
    const m = /^(\d{4})-(\d\d)-(\d\d) (\d\d):(\d\d)$/.exec(String(s));
    return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) : NaN;
  },
  num = x => (x === '' || x == null || !isFinite(Number(x)) ? null : Number(x));
const A = JSON.parse(fs.readFileSync(IN, 'utf8'));
let badTime = 0;
// The rows as the sheet's readAnswers serves them: [player, time ms, shown, answered, right 0|1, mode, photos, expected,
// ability, new photos, choices, anonymous, …, subject (17), …, scoring (22)]; tab: the tab row (ties: sheet order).
const ALL = A.map(r => {
  const o = [r[1], ms(r[2]), String(r[3] || ''), '', Number(r[5]) ? 1 : 0, String(r[6] || ''), String(r[7] || ''), num(r[9]), num(r[10]), '', String(r[12] || ''), 0];
  o[17] = String(r[18] || '');
  o[22] = r[23] || null;
  o.tab = r[0];
  o.T = r[2];
  if (!isFinite(o[1])) badTime++;
  return o;
})
  .filter(r => !UNTIL || r.T <= UNTIL)
  .sort((a, b) => a[1] - b[1] || a.tab - b.tab);

const BANDS = ['< 10 min', '10 min-1 h', '1 h-1 day', '1-7 days', '> 7 days'],
  bandOf = m => (m < 10 ? 0 : m < 60 ? 1 : m < 1440 ? 2 : m < 10080 ? 3 : 4),
  BUCKETS = ['new photo', 'shown never right', 'right once', 'right 2+'],
  sig = x => 1 / (1 + Math.exp(-x)),
  logit = p => Math.log(p / (1 - p));

// mulberry32, seed 1 (the 2026-11-15 script's generator).
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function runSubject(sid) {
  const rows = C.subjRows(ALL, sid).filter(r => r[6].split(/\s+/).filter(Boolean).length);
  if (!rows.length) return null;
  const trust = C.trustOf(rows),
    players = new Set(rows.map(r => r[0])),
    memToday = MEMARG[sid] || (sid === 'coral' ? C.photoMemOf(rows).mem : C.MEM.PRIOR.slice());
  const H = {}, // player|photo: [shown, right, misses, last show ms]
    U = {}, // player|unit: last answer ms (the control)
    cells = [], // photo-cells: {p, j, b (null: new), w, ok, e, sl (slope de/dx), mi (misses before), ul (unit lag band)}
    chk = {rec: 0, within: 0, skipped: 0, sNot1: 0, oSet: 0, disagreeSeenNoF: 0, disagreeNewF: 0, rows: 0, seenW: 0};
  rows.forEach(r => {
    const fsx = r[6].split(/\s+/).filter(Boolean),
      sc = C.scoreRec(r[22]),
      ok = r[4],
      w = r[0],
      t = r[1],
      k = C.kOf(r[5], r[10]),
      g = isFinite(k) ? 1 / k : 0,
      hs = fsx.map(f => (H[w + '|' + f] = H[w + '|' + f] || [0, 0, 0, null])),
      ukey = w + '|' + r[2],
      ulag = U[ukey] == null ? null : (t - U[ukey]) / 60000;
    let e = null,
      sl = null,
      use = trust[w];
    if (use && !SECONDARY) {
      if (!sc || r[7] == null) use = false;
      else {
        chk.rec++;
        const R = sc.r == null ? 1 : sc.r,
          f = sc.f || 0,
          s = sc.s || 1;
        if (sc.s && sc.s !== 1) chk.sNot1++;
        if (sc.o) chk.oSet++;
        if (r[8] != null) {
          const eb = g + (1 - g) * R * sig(r[8] - sc.d - f - (sc.c || 0));
          if (Math.abs(eb - r[7]) <= 0.01) chk.within++;
        }
        const q = (r[7] - g) / ((1 - g) * R);
        if (!(q > 0 && q < 1)) {
          chk.skipped++;
          use = false;
        } else {
          const fT = C.memFam(hs.map(h => [h[0], h[1]]), memToday),
            x2 = logit(q) + s * (f - fT),
            p = sig(x2);
          e = g + (1 - g) * R * p;
          sl = (1 - g) * R * p * (1 - p);
          const seen = hs.some(h => h[0] > 0);
          if (seen && !f) chk.disagreeSeenNoF++;
          if (!seen && f) chk.disagreeNewF++;
        }
      }
    } else if (use) {
      if (r[7] == null) use = false;
      else {
        e = r[7];
        sl = null;
      }
    }
    if (use) {
      chk.rows++;
      hs.forEach(h => {
        const j = C.memBucket([h[0], h[1]]),
          b = j ? bandOf((t - h[3]) / 60000) : null;
        if (j) chk.seenW += 1 / hs.length;
        cells.push({p: w, j, b, w: 1 / hs.length, ok, e, sl, mi: h[2], ul: j === 0 && ulag != null ? bandOf(ulag) : null, lag: j ? (t - h[3]) / 60000 : null});
      });
    }
    hs.forEach(h => {
      h[0]++;
      h[1] += ok;
      h[2] += ok ? 0 : 1;
      h[3] = t;
    });
    // A corallites hint revealed after the answer: shown, never recognised (core.js scoreAnswer).
    if (sc && sc.h) {
      const h = (H[w + '|' + sc.h] = H[w + '|' + sc.h] || [0, 0, 0, null]);
      h[0]++;
      h[3] = t;
    }
    U[ukey] = t;
  });
  const pl = [...new Set(cells.map(c => c.p))];
  // One cell of the table over the photo-cells matching sel, with its player-cluster bootstrap.
  const R = rng(SEED),
    DRAWS = [];
  for (let i = 0; i < NDRAWS; i++) DRAWS.push(pl.map(() => pl[Math.floor(R() * pl.length)]));
  function cell(sel) {
    const cs = cells.filter(sel),
      by = {};
    cs.forEach(c => {
      const o = (by[c.p] = by[c.p] || [0, 0, 0]);
      o[0] += c.w;
      o[1] += c.w * c.ok;
      o[2] += c.w * c.e;
    });
    const n = cs.reduce((a, c) => a + c.w, 0),
      np = Object.keys(by).length;
    if (!n) return {n: 0, players: 0};
    const ob = cs.reduce((a, c) => a + c.w * c.ok, 0) / n,
      ex = cs.reduce((a, c) => a + c.w * c.e, 0) / n,
      out = {n: +n.toFixed(1), players: np, right: +(100 * ob).toFixed(1), expected: +(100 * ex).toFixed(1), diff: +(100 * (ob - ex)).toFixed(1)};
    if (n >= 20 && np >= 3) {
      const ds = DRAWS.map(d => {
        let a = 0,
          b = 0;
        d.forEach(p => {
          if (by[p]) {
            a += by[p][0];
            b += by[p][1] - by[p][2];
          }
        });
        return a ? (100 * b) / a : null;
      })
        .filter(x => x != null)
        .sort((x, y) => x - y);
      out.lo = +ds[Math.floor(0.025 * ds.length)].toFixed(1);
      out.hi = +ds[Math.ceil(0.975 * ds.length) - 1].toFixed(1);
    } else out.tooFew = true;
    return out;
  }
  const table = [];
  table.push(['new photo (reference)', cell(c => c.j === 0)]);
  for (let j = 1; j <= 3; j++) {
    BANDS.forEach((bn, b) => table.push([BUCKETS[j] + ', ' + bn, cell(c => c.j === j && c.b === b)]));
    table.push([BUCKETS[j] + ', all lags', cell(c => c.j === j)]);
  }
  BANDS.forEach((bn, b) => table.push(['all seen, ' + bn, cell(c => c.j > 0 && c.b === b)]));
  table.push(['all seen, all lags', cell(c => c.j > 0)]);
  // Stop rule.
  const seen = cells.filter(c => c.j > 0),
    seenN = seen.reduce((a, c) => a + c.w, 0),
    bands = BANDS.map((bn, b) => {
      const cs = seen.filter(c => c.b === b),
        n = cs.reduce((a, c) => a + c.w, 0),
        np = new Set(cs.map(c => c.p)).size;
      return {band: bn, n: +n.toFixed(1), share: seenN ? +((100 * n) / seenN).toFixed(0) : 0, top: seenN > 0 && n / seenN >= 0.8, players: np, ok: n >= 30 && np >= 3};
    }),
    stop = bands.some(b => b.top) || bands.filter(b => b.ok).length < 2;
  // Per-player contrast short (< 1 h) minus long (>= 1 day), stratified by stratum; points and logits (mean slope).
  function contrast(cs, strat, bandK) {
    const by = {};
    cs.forEach(c => {
      const b = c[bandK];
      if (b == null || b === 2) return;
      const side = b < 2 ? 0 : 1,
        k = c.p + '|' + strat(c),
        o = (by[k] = by[k] || {p: c.p, s: [
          [0, 0, 0],
          [0, 0, 0]
        ]});
      o.s[side][0] += c.w;
      o.s[side][1] += c.w * (c.ok - c.e);
      o.s[side][2] += c.w * (c.sl == null ? NaN : c.sl);
    });
    const P = {};
    Object.values(by).forEach(o => {
      const [a, b] = o.s;
      if (a[0] < 2 || b[0] < 2) return;
      const m = Math.min(a[0], b[0]),
        x = (P[o.p] = P[o.p] || [0, 0, 0]);
      x[0] += m;
      x[1] += m * (a[1] / a[0] - b[1] / b[0]);
      x[2] += m * ((a[2] + b[2]) / (a[0] + b[0]));
    });
    const D = Object.values(P)
      .filter(x => x[0] >= 3)
      .map(x => ({d: (100 * x[1]) / x[0], slope: x[2] / x[0], w: x[0]}));
    const n = D.length,
      // [D in points, weighted answers] per player, no label, sorted by D.
      out = {players: n, perPlayer: D.map(x => [+x.d.toFixed(1), +x.w.toFixed(1)]).sort((a, b) => a[0] - b[0])};
    if (n < 6) return Object.assign(out, {verdict: 'cannot test'});
    const mean = D.reduce((a, x) => a + x.d, 0) / n,
      sd = Math.sqrt(D.reduce((a, x) => a + (x.d - mean) ** 2, 0) / (n - 1)),
      tq = {5: 2.571, 6: 2.447, 7: 2.365, 8: 2.306, 9: 2.262, 10: 2.228, 11: 2.201, 12: 2.179, 13: 2.16, 14: 2.145}[n - 1] || 1.96;
    let ge = 0;
    for (let m = 0; m < 1 << n; m++) {
      const s = D.reduce((a, x, i) => a + (m & (1 << i) ? -x.d : x.d), 0) / n;
      if (Math.abs(s) >= Math.abs(mean) - 1e-9) ge++;
    }
    const slope = D.reduce((a, x) => a + x.slope, 0) / n;
    return Object.assign(out, {
      mean: +mean.toFixed(1),
      lo: +(mean - (tq * sd) / Math.sqrt(n)).toFixed(1),
      hi: +(mean + (tq * sd) / Math.sqrt(n)).toFixed(1),
      p: +(ge / (1 << n)).toFixed(3),
      meanSlope: isFinite(slope) ? +slope.toFixed(3) : null,
      logits: isFinite(slope) ? +(mean / 100 / slope).toFixed(2) : null,
      logitsLo: isFinite(slope) ? +((mean - (tq * sd) / Math.sqrt(n)) / 100 / slope).toFixed(2) : null,
      logitsHi: isFinite(slope) ? +((mean + (tq * sd) / Math.sqrt(n)) / 100 / slope).toFixed(2) : null
    });
  }
  const primary = contrast(seen, c => c.j, 'b'),
    control = contrast(
      cells.filter(c => c.j === 0),
      () => 0,
      'ul'
    );
  // Post hoc (added after the results, not declared; exploratory): the short (< 1 h) minus long (>= 1 day) residual
  // pooled over players, stratified by bucket (each bucket's difference weighted by the smaller side's answers), with
  // the player-cluster bootstrap; a size that does not need a player on both sides, but mixes players between sides.
  function pooled(cs) {
    const by = {};
    cs.forEach(c => {
      if (c.b === 2) return;
      const o = (by[c.p] = by[c.p] || {});
      const s = (o[c.j] = o[c.j] || [
        [0, 0],
        [0, 0]
      ])[c.b < 2 ? 0 : 1];
      s[0] += c.w;
      s[1] += c.w * (c.ok - c.e);
    });
    const est = ps => {
      let num = 0,
        den = 0;
      for (let j = 1; j <= 3; j++) {
        const a = [0, 0],
          b = [0, 0];
        ps.forEach(p => {
          const x = by[p] && by[p][j];
          if (!x) return;
          a[0] += x[0][0];
          a[1] += x[0][1];
          b[0] += x[1][0];
          b[1] += x[1][1];
        });
        if (a[0] < 2 || b[0] < 2) continue;
        const m = Math.min(a[0], b[0]);
        num += m * (a[1] / a[0] - b[1] / b[0]);
        den += m;
      }
      return den ? (100 * num) / den : null;
    };
    const pe = est(pl),
      ds = DRAWS.map(est)
        .filter(x => x != null)
        .sort((x, y) => x - y);
    return pe == null ? null : {est: +pe.toFixed(1), lo: +ds[Math.floor(0.025 * ds.length)].toFixed(1), hi: +ds[Math.ceil(0.975 * ds.length) - 1].toFixed(1)};
  }
  const pooledShortLong = pooled(seen);
  // Declared directions (exploratory): "shown never right" by prior misses (1 against 2+), short against long.
  const dirs = [];
  [
    ['1 miss', c => c.mi === 1],
    ['2+ misses', c => c.mi >= 2]
  ].forEach(([nm, f]) =>
    [
      ['< 1 h', c => c.b < 2],
      ['>= 1 day', c => c.b > 2]
    ].forEach(([bn, g]) => dirs.push(['shown never right, ' + nm + ', ' + bn, cell(c => c.j === 1 && f(c) && g(c))]))
  );
  const lags = seen.map(c => c.lag).sort((a, b) => a - b),
    q = p => (lags.length ? +lags[Math.floor(p * (lags.length - 1))].toFixed(0) : null);
  return {
    subject: sid,
    answers: rows.length,
    players: players.size,
    trusted: Object.values(trust).filter(Boolean).length,
    scored: chk.rows,
    memToday,
    checks: chk,
    seenAnswers: +seenN.toFixed(1),
    lagMinutes: {p10: q(0.1), p25: q(0.25), median: q(0.5), p75: q(0.75), p90: q(0.9)},
    bands,
    stop,
    table,
    primary,
    pooledShortLong,
    control,
    directions: dirs
  };
}

const res = {
  input: {rows: ALL.length, badTime, first: ALL.length ? ALL[0].T : null, last: ALL.length ? ALL[ALL.length - 1].T : null, secondary: SECONDARY, until: UNTIL},
  subjects: SUBJ.map(runSubject).filter(Boolean)
};
fs.writeFileSync(OUT, JSON.stringify(res, null, 1));
const f = x => (x == null ? '' : x);
console.log('rows', res.input.rows, 'bad time', badTime, 'first', res.input.first, 'last', res.input.last, SECONDARY ? '(secondary)' : '(primary)');
res.subjects.forEach(S => {
  console.log(`\n== ${S.subject}: ${S.answers} answers, ${S.players} players (${S.trusted} trusted); rows used ${S.checks.rows}; mem ${S.memToday.join(' / ')}`);
  console.log('checks', JSON.stringify(S.checks), 'lag min', JSON.stringify(S.lagMinutes));
  console.log('seen answers', S.seenAnswers, 'stop', S.stop);
  S.bands.forEach(b => console.log(`  ${b.band}: ${b.n} (${b.share}%, ${b.players})${b.ok ? ' ok' : ''}`));
  S.table.forEach(([k, c]) => console.log(`  | ${k} | ${f(c.n)} | ${f(c.players)} | ${f(c.right)} | ${f(c.expected)} | ${c.tooFew ? '(' + f(c.diff) + ')' : f(c.diff)} | ${c.tooFew ? 'too few' : c.n ? c.lo + ' to ' + c.hi : ''} |`));
  console.log('  primary', JSON.stringify(S.primary));
  console.log('  pooled short-long (post hoc)', JSON.stringify(S.pooledShortLong));
  console.log('  control',JSON.stringify(S.control));
  S.directions.forEach(([k, c]) => console.log(`  dir | ${k} | ${f(c.n)} | ${f(c.players)} | ${f(c.right)} | ${f(c.expected)} | ${f(c.diff)} |`));
});
