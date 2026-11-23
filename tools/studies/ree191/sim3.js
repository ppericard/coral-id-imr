// REE-191 mechanics (no learner model): the corals' shown % of a player who is ALWAYS right, by answers, under
// today's bar (core.js replayProgress + pctOf over 40 units), for three openings:
//   pace  : 4 units at the start, then at most OPEN.MAX (3) new units per OPEN.WIN (15) answers (model.js openPace),
//           a new unit only after a right answer (always here); shaky never holds (a perfect player);
//   fast  : 6 per 15 (a doubled pace);
//   all   : the 40 open at once (the existing "Open all").
// The question asked: the open unit with the fewest own answers (the draw favours units least shown); format 4 plausible
// choices on an average photo of the unit, typed with today's TYPED share (none under a 50% bar, 30% at 80%), seeded.
// A what-if of the rules only: real players miss, and the draw is not round-robin.
//   node sim2.js <main worktree>
const path = require('path');
const C = require(path.join(path.resolve(process.argv[2]), 'core.js'));
const U = Array.from({length: 40}, (_, i) => 'G' + i);
const gen = Object.fromEntries(U.map(u => [u, {look: [], fam: u}]));
let seed = 7;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const typedShare = b => (b < 0.5 ? 0 : b < 0.8 ? (0.3 * (b - 0.5)) / 0.3 : Math.min(0.5, 0.3 + (0.2 * (b - 0.8)) / 0.15));
const CK = [50, 100, 200, 300, 400, 500, 800];
// 'model:θ' — a player whose answers follow the game's own response model with a true ability θ on every unit (relative
// to the unit's offset), asked photos the engine aims at 75% (its aim from a level of 1.5): 4 choices, P(right) =
// 0.25 + 0.75 σ(θ − d), d = θ − logit(2/3); typed: σ(θ − d'), d' the photo aimed at 75% typed. Outcomes drawn, seeded.
// D*: the true domain score of such a player (σ(θ − d) over the unit's photos d ~ N(0, DOM.TAU²), one photo alone
// (+DOM.SINGLE), typed), the value the bar converges to.
const sig = x => 1 / (1 + Math.exp(-x));
const DMAX = Number(process.argv[3] || 1.5);
let RIGHT = 0,
  ASKED = 0;
function dstar(th) {
  let s = 0,
    n = 0;
  for (let z = -4; z <= 4; z += 0.01) {
    const w = Math.exp(-z * z / 2);
    s += w * sig(th - (z * C.DOM.TAU + C.DOM.SINGLE));
    n += w;
  }
  return s / n;
}
function run(mode, sd = 7) {
  seed = sd;
  const th = /^model:/.test(mode) ? Number(mode.split(':')[1]) : null,
    early = /:early$/.test(mode); // the lever: a typed share of 30% from a unit's first answer
  const rows = [],
    open = [],
    openedAt = [],
    own = {},
    res = {};
  const perWin = mode === 'fast' ? 6 : 3;
  if (mode === 'all') U.forEach(u => open.push(u));
  else U.slice(0, 4).forEach(u => (open.push(u), openedAt.push(-1)));
  let P = {};
  for (let i = 0; i < 800; i++) {
    if (mode !== 'all' && open.length < U.length) {
      const recent = openedAt.filter(t => t > i - 15).length;
      if (recent < perWin) {
        open.push(U[open.length]);
        openedAt.push(i);
      }
    }
    const u = open.slice().sort((a, b) => (own[a] || 0) - (own[b] || 0))[0];
    own[u] = (own[u] || 0) + 1;
    const b = P[u] ? C.scoreOf(P[u], P, u) : 0,
      typed = rnd() < (early ? Math.max(0.3, typedShare(b)) : typedShare(b));
    // three other choices drawn among the open units (else any), so a wrong pick is always one that was offered
    const pool3 = (open.length >= 4 ? open : U).filter(x => x !== u),
      others = [];
    while (others.length < 3) {
      const x = pool3[Math.floor(rnd() * pool3.length)];
      if (!others.includes(x)) others.push(x);
    }
    const ch = typed ? '' : [u, ...others].join(' ');
    let d = 0,
      ok = 1,
      ans = u;
    if (th != null) {
      // aimed at 75%, but no photo harder than DMAX (a unit's hardest photos): a strong player then beats the aim
      d = Math.min(DMAX, typed ? th - Math.log(3) : th - Math.log(2));
      const p = typed ? sig(th - d) : 0.25 + 0.75 * sig(th - d);
      ok = rnd() < p ? 1 : 0;
      // a wrong name: another unit at random (a false alarm on it); typed: none of the units
      if (!ok) ans = typed ? 'zz' : others[Math.floor(rnd() * 3)];
    }
    // the format offsets the game logged on real coral rows (medians): 4 plausible o 0.18, typed o -0.43; t -0.42
    rows.push(['p', 1e12 + i * 60000, u, ans, ok, typed ? 'quiz|t' : 'quiz', 'ph' + i, null, null, 1, ch, null, 3, ...new Array(C.LOG_SC - 13).fill(null), C.scoreRec({d, m: 0, o: typed ? -0.43 : 0.18, t: -0.42})]);
    // replay incrementally is not exact; replay the whole prefix at checkpoints and every 10 answers for the typed share
    if ((i + 1) % 10 === 0 || CK.includes(i + 1)) P = C.replayProgress(rows, {gen})['p'].P;
    if (CK.includes(i + 1)) {
      const bars = U.map(x => (P[x] ? C.scoreOf(P[x], P, x) : 0));
      res[i + 1] = {pct: C.pctOf(P, U), right: Math.round((100 * rows.reduce((t, r) => t + r[4], 0)) / rows.length), open: open.length, ow: bars.filter(b => b >= 0.5).length, adv: bars.filter(b => b >= 0.8).length, ex: bars.filter(b => b >= 0.85).length};
    }
  }
  return res;
}
if (process.argv[4] === 'seeds') {
  // 10 seeds; the same seeds for each variant (the variants share their draws seed by seed); mean (min-max)
  const SEEDS = [11, 23, 37, 41, 53, 67, 71, 83, 97, 101];
  const V = ['pace', 'all', 'model:2.5', 'model:2.5:early', 'model:3.5', 'model:3.5:early'];
  console.log(`DMAX ${DMAX}`);
  console.log('| Answers | ' + V.join(' | ') + ' |');
  const out = Object.fromEntries(V.map(v => [v, SEEDS.map(s => run(v, s))]));
  for (const k of [100, 200, 300, 500, 800])
    console.log(
      `| ${k} | ` +
        V.map(v => {
          const a = out[v].map(r => r[k].pct),
            rr = out[v].map(r => r[k].right);
          return `${(a.reduce((t, x) => t + x, 0) / a.length).toFixed(0)} (${Math.min(...a)}-${Math.max(...a)}); ${(rr.reduce((t, x) => t + x, 0) / rr.length).toFixed(0)}% right`;
        }).join(' | ') +
        ' |'
    );
  process.exit(0);
}
const R =
  process.argv[4] === 'typed'
    ? {pace: run('pace'), 'pace:early': run('pace:early'), 'model:2.5': run('model:2.5'), 'model:2.5:early': run('model:2.5:early'), 'model:3.5': run('model:3.5'), 'model:3.5:early': run('model:3.5:early'), 'model:0.5': run('model:0.5'), 'model:0.5:early': run('model:0.5:early')}
    : {pace: run('pace'), fast: run('fast'), all: run('all'), 'model:1.5': run('model:1.5'), 'model:2.5': run('model:2.5'), 'model:3.5': run('model:3.5')};
console.log('D* (true domain score) at θ 1.5 / 2.5 / 3.5:', [1.5, 2.5, 3.5].map(t => (100 * dstar(t)).toFixed(0) + '%').join(' / '));
console.log('| Answers | ' + Object.keys(R).map(k => k + ': % (open, at 50%, at 80%)').join(' | ') + ' |');
for (const k of CK) console.log(`| ${k} | ` + Object.values(R).map(r => `${r[k].pct}% (${r[k].open}, ${r[k].ow}, ${r[k].adv}; ${r[k].right}% right)`).join(' | ') + ' |');
