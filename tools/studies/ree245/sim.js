// REE-245 design study: the draw before Open Water with a continuous weight by ease instead of the RARE bar
// (docs/reviews/2026-11-23-continuous-ease-draw.md). Read-only: nothing in the app or the tests changes.
//
//   node tools/studies/ree245/sim.js [--draws 1000] [--runs 200] [--out file.json]
//   node tools/studies/ree245/sim.js --only climb [--draws 1000]      (a player climbing the bar: climb, below)
//
// It reuses the harness of tests/rareease.js (model.js photoSet in a vm, the game stubbed) and runs it on several arms:
//   main    - model.js as it is (#1391: the bar at ease 4, the floor of RARE.FEW 12, the cap RARE.SHARE 0.1);
//   none    - the RARE step taken out, nothing in its place (the targeting, its lean, the photo memory alone);
//   K,S     - the continuous rule: every photo with a judged ease weighs exp(-lam * (5 - ease)), lam = K * max(0,
//             1 - bar / S) on the unit's bar (genScore), applied last (after the variety and the floor), to the choice of
//             the observation and of its photo; no bar, no FEW, no SHARE, no Open Water switch.
// An arm other than main is made by patching the text of model.js before the harness reads it (fs.readFileSync wrapped
// for that one path while tests/rareease.js loads); each patch must match exactly once, or the script stops.
// Two measures:
//   stationary - the draws of one state, nothing remembered between them (#1391's table): effective number of
//                observations (1 / the sum of the squared shares), the most drawn, the share under ease 4, ease 1-2;
//   sequence   - 15 questions on the unit in a session, 3 other questions between each (the session window, SEENQ),
//                the photo memory (s.ps) and the last two observations (s.ro) updated as an answer does, right with
//                chance 0.85; distinct observations in 15 and the share under ease 4 over them; --runs runs.
// Takes the machine slot (tests/slot.js, rule W24).
'use strict';
const fs = require('fs'),
  path = require('path');
const ROOT = path.join(__dirname, '..', '..', '..'),
  MODEL = path.join(ROOT, 'model.js'),
  HARNESS = path.join(ROOT, 'tests', 'rareease.js');

const arg = (k, d) => {
  const i = process.argv.indexOf(k);
  return i > 0 ? process.argv[i + 1] : d;
};
const DRAWS = +arg('--draws', 1000),
  RUNS = +arg('--runs', 200),
  OUT = arg('--out', null);

// The continuous rule as a patch of model.js's text (two places in photoSet).
const once = (src, a, b) => {
  const i = src.indexOf(a);
  if (i < 0 || src.indexOf(a, i + 1) >= 0) throw new Error(`patch: ${JSON.stringify(a.slice(0, 60))} must occur once`);
  return src.slice(0, i) + b + src.slice(i + a.length);
};
function patched(src, K, S) {
  let s = once(
    src,
    '    rare = es.length > 0 && rareOn(n) && genScore(n) + 1e-9 < LV_AT[0],\n    hs = {};',
    `    rare = false,\n    hs = {},\n    lam = es.length > 0 && rareOn(n) ? ${K} * Math.max(0, 1 - genScore(n) / ${S}) : 0,\n` +
      '    ef = p => (lam > 0 && p.e > 0 ? Math.exp(-lam * (5 - p.e)) : 1);'
  );
  s = once(
    s,
    '  if (rare) {\n    hardF = rareCap(keys, sc, k => hs[k]);\n    if (hardF < 1) keys.forEach(k => (sc[k] *= 1 - hs[k] + hardF * hs[k]));\n  }',
    '  if (lam > 0) {\n' +
      '    const t = k => ph(k).reduce((a, p) => a + w(p), 0),\n' +
      '      fk = Object.fromEntries(keys.map(k => [k, t(k) ? ph(k).reduce((a, p) => a + w(p) * ef(p), 0) / t(k) : 1]));\n' +
      '    keys.forEach(k => (sc[k] *= fk[k]));\n' +
      '    hardF = 0;\n' +
      '    hard = p => 1 - ef(p);\n' +
      '  }'
  );
  return s;
}
// The harness loaded on one arm's model.js text.
function harness(text) {
  const read = fs.readFileSync;
  delete require.cache[require.resolve(HARNESS)];
  fs.readFileSync = (p, ...a) => (path.resolve(String(p)) === MODEL && text !== null ? text : read(p, ...a));
  try {
    return require(HARNESS);
  } finally {
    fs.readFileSync = read;
  }
}

// #1391's family (tests/rareease-floor.test.js): nEasy easy adults (ease 5, then 4), an easy juvenile its ramp holds
// back, m3 observations at ease 3 and low under it (ease 1-2).
const family = (nEasy, m3 = 20, low = 15) => {
  const L = [];
  for (let i = 0; i < nEasy; i++) L.push({f: `a${i}`, o: `a${i}`, e: i ? 4 : 5});
  L.push({f: 'j', o: 'j', e: 4, ph: 'juvenile'});
  for (let i = 0; i < m3; i++) L.push({f: `m${i}`, o: `m${i}`, e: 3});
  for (let i = 0; i < low; i++) L.push({f: `h${i}`, o: `h${i}`, e: 1 + (i % 2)});
  return L;
};
// A big family (tests/rareease.js pool): 12 easy photos against 240 under ease 4.
const big = () => {
  const L = [];
  for (let i = 0; i < 12; i++) L.push({f: `easy${i}`, o: `oe${i}`, e: 4 + (i % 2)});
  for (let i = 0; i < 240; i++) L.push({f: `hard${i}`, o: `oh${i}`, e: 1 + (i % 3)});
  return L;
};
const PLAYER = {th: 2.2, score: 0.3, ok: 6}, // #1391's table
  BEGINNER = {th: 0.5, score: 0.05, ok: 1};

function stationary(H, L, opt, N = DRAWS) {
  const E = H.engine('fish', L, opt),
    e = Object.fromEntries(L.map(p => [p.f, p.e])),
    by = {};
  let tot = 0,
    under = 0,
    low = 0;
  for (let i = 0; i < N; i++)
    E.photoSet('u', null, 0, 4, 'k4').shown.forEach(x => {
      tot++;
      by[x.o] = (by[x.o] || 0) + 1;
      if (e[x.f] < 4) under++;
      if (e[x.f] <= 2) low++;
    });
  const sh = Object.values(by).map(k => k / tot);
  return {eff: 1 / sh.reduce((t, s) => t + s * s, 0), top: Math.max(...sh), under: under / tot, low: low / tot};
}
function sequence(H, L, opt, Q = 15, R = RUNS) {
  const E = H.engine('fish', L, opt),
    e = Object.fromEntries(L.map(p => [p.f, p.e])),
    u = E.P.u;
  let s = 777;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  let distinct = 0,
    under = 0,
    tot = 0,
    maxRep = 0;
  const other = i => E.seenAdd([null, 'x', null, null, {shown: [{f: `x${i}`, o: `x${i}`}]}]);
  for (let r = 0; r < R; r++) {
    u.ps = {};
    u.ro = [];
    for (let i = 0; i < 10; i++) other(`flush${r}-${i}`); // empty the session window
    const seen = {};
    for (let q = 0; q < Q; q++) {
      const set = E.photoSet('u', null, 0, 4, 'k4'),
        p = set.shown[0];
      E.seenAdd([null, 'u', null, null, set]);
      if (p) {
        const h = u.ps[p.f] || [0, 0];
        u.ps[p.f] = [h[0] + 1, h[1] + (rnd() < 0.85 ? 1 : 0)];
        u.ro = [...u.ro.filter(o => o !== p.o), p.o].slice(-2);
        seen[p.o] = (seen[p.o] || 0) + 1;
        tot++;
        if (e[p.f] < 4) under++;
      }
      for (let k = 0; k < 3; k++) other(`${r}-${q}-${k}`);
    }
    distinct += Object.keys(seen).length;
    maxRep = Math.max(maxRep, ...Object.values(seen));
  }
  return {distinct: distinct / R, under: under / tot, maxRep};
}

function main() {
  require(path.join(ROOT, 'tests', 'slot.js')).guard('tools/studies/ree245/sim.js');
  const src = fs.readFileSync(MODEL, 'utf8'),
    ARMS = [
      {id: 'main', text: null},
      {id: 'none', text: patched(src, 0, 0.5)},
      {id: 'K0.5,S0.5', text: patched(src, 0.5, 0.5)},
      {id: 'K1,S0.5', text: patched(src, 1, 0.5)},
      {id: 'K1.5,S0.5', text: patched(src, 1.5, 0.5)},
      {id: 'K2,S0.5', text: patched(src, 2, 0.5)},
      {id: 'K1,S0.8', text: patched(src, 1, 0.8)}
    ],
    EASY = [0, 1, 2, 3, 4, 6, 8, 10, 12, 16],
    BARS = [0, 0.1, 0.2, 0.3, 0.4, 0.45, 0.49, 0.5, 0.6, 0.8],
    out = {draws: DRAWS, runs: RUNS, arms: {}},
    t0 = Date.now();
  if (arg('--only', '') === 'climb') return climb(ARMS, BARS, t0);
  for (const arm of ARMS) {
    const H = harness(arm.text),
      R = (out.arms[arm.id] = {family: {}, beginner: {}, seq: {}, seqBeginner: {}, bar3: {}, barBig: {}, ease03: {}});
    for (const n of EASY) {
      R.family[n] = stationary(H, family(n), PLAYER);
      R.beginner[n] = stationary(H, family(n), BEGINNER);
      R.seq[n] = sequence(H, family(n), PLAYER);
      R.seqBeginner[n] = sequence(H, family(n), BEGINNER);
      // REE-240's ease weight (about 0.3) instead of today's 0.5.
      R.ease03[n] = stationary(H, family(n), {...PLAYER, calib: {ease: 0.3}});
    }
    R.big = {player: stationary(H, big(), PLAYER), beginner: stationary(H, big(), BEGINNER)};
    for (const b of BARS) {
      R.bar3[b] = stationary(H, family(3), {...PLAYER, score: b});
      R.barBig[b] = stationary(H, big(), {...PLAYER, score: b});
    }
    console.error(`${arm.id}: ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
  if (OUT) fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  report(out, EASY, BARS);
}

// --only climb: a player whose ability and answers rise with the unit's bar, a hypothesis for the reading only (th 0.5 at
// bar 0 to 2.2 at 0.5, then flat; answers 1 + 20 x bar, which the start's lean reads): the share under ease 4 and the
// effective observations, for 3 and 12 easy adults (20 at ease 3, 15 under) and the big family.
function climb(ARMS, BARS, t0) {
  const at = b => ({th: Math.min(2.2, 0.5 + 3.4 * b), score: b, ok: Math.round(1 + 20 * b)}),
    POOLS = [
      ['3 easy adults', () => family(3)],
      ['12 easy adults', () => family(12)],
      ['12 easy, 240 under ease 4', big]
    ],
    res = {};
  for (const arm of ARMS) {
    const H = harness(arm.text);
    res[arm.id] = POOLS.map(([, L]) => BARS.map(b => stationary(H, L(), at(b))));
    console.error(`${arm.id}: ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
  const bh = `| Bar (ability) | ${BARS.map(b => `${b} (${at(b).th.toFixed(1)})`).join(' | ')} |\n| --- | ${BARS.map(() => '---:').join(' | ')} |`;
  POOLS.forEach(([title], i) => {
    for (const [what, field, fmt] of [
      ['under ease 4', 'under', pc],
      ['effective observations', 'eff', f1]
    ]) {
      console.log(`\nClimbing player, ${what}: ${title}\n\n${bh}`);
      for (const id of Object.keys(res)) console.log(`| ${id} | ${res[id][i].map(r => fmt(r[field])).join(' | ')} |`);
    }
  });
}

const pc = x => `${(100 * x).toFixed(0)}%`,
  f1 = x => x.toFixed(1);
function report(out, EASY, BARS) {
  const ids = Object.keys(out.arms),
    row = (label, get) => `| ${label} | ${EASY.map(get).join(' | ')} |`,
    head = `| Easy adults | ${EASY.join(' | ')} |\n| --- | ${EASY.map(() => '---:').join(' | ')} |`;
  const table = (title, key, fmt, field) => {
    console.log(`\n${title}\n\n${head}`);
    for (const id of ids) console.log(row(id, n => fmt(out.arms[id][key][n][field])));
  };
  table('Effective observations (stationary, player th 2.2, bar 0.3)', 'family', f1, 'eff');
  table('Most drawn observation (stationary, player)', 'family', pc, 'top');
  table('Under ease 4 (stationary, player)', 'family', pc, 'under');
  table('Ease 1-2 (stationary, player)', 'family', pc, 'low');
  table('Under ease 4, beginner (th 0.5, bar 0.05, 1 answer)', 'beginner', pc, 'under');
  table('Effective observations, beginner', 'beginner', f1, 'eff');
  table('Most drawn, beginner', 'beginner', pc, 'top');
  table('Distinct observations in 15 questions (sequence, player)', 'seq', f1, 'distinct');
  table('Under ease 4 over 15 questions (sequence, player)', 'seq', pc, 'under');
  table('Distinct observations in 15 questions (sequence, beginner)', 'seqBeginner', f1, 'distinct');
  table('Under ease 4 over 15 questions (sequence, beginner)', 'seqBeginner', pc, 'under');
  table('Most shows of one observation in 15 (sequence, player, worst run)', 'seq', String, 'maxRep');
  table('Effective observations with calib.ease 0.3 (REE-240)', 'ease03', f1, 'eff');
  table('Under ease 4 with calib.ease 0.3 (REE-240)', 'ease03', pc, 'under');
  const bh = `| Bar | ${BARS.join(' | ')} |\n| --- | ${BARS.map(() => '---:').join(' | ')} |`;
  for (const [key, title] of [
    ['bar3', '3 easy adults, 20 at ease 3, 15 under'],
    ['barBig', '12 easy, 240 under ease 4']
  ]) {
    console.log(`\nAlong the bar, under ease 4: ${title} (player th 2.2)\n\n${bh}`);
    for (const id of ids) console.log(`| ${id} | ${BARS.map(b => pc(out.arms[id][key][b].under)).join(' | ')} |`);
  }
  console.log('\nBig family (12 easy, 240 under ease 4): under ease 4, player / beginner\n');
  for (const id of ids) console.log(`| ${id} | ${pc(out.arms[id].big.player.under)} | ${pc(out.arms[id].big.beginner.under)} |`);
}

if (require.main === module) main();
module.exports = {patched, family, big, stationary, sequence, harness};
