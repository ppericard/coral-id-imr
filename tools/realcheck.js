// Real-data check of the learning model's estimates (owner's rule, 2026-11-03: every algorithm change is checked in
// tools/learnsim.js AND against the real answer log). Reads the sync sheet's Answers tab saved as JSON (a Sheets
// values reply {values: [[header], ...rows]}, or the rows alone; read-only: this tool never talks to the sheet) and
// prints aggregates only, never a player's name:
//   node tools/realcheck.js answers.json
// 1. Calibration of the app's logged expectation (column Expected, the chance the app gave each answer when it was
//    asked) against the real answers: log-loss and expected vs right %, overall, by format (plausible choices k, Again,
//    duel, typed) and by ability band (column Ability). The success the game really got per format is what the one
//    difficulty controller (model.js PICKD.P, aimOff) aims at 80% (docs/LEARNING.md "One difficulty controller").
// 2. The genus draw and "Review" (model.js drawW, level; docs/LEARNING.md "One draw weight"): replayed per player and
//    genus in time order, how well each signal before an answer predicts a miss on it: the old "2 misses in the last 5"
//    Review against the new one (shaky: 1/4 + 3/4 x < OPEN.P), and the new weight drawW = 1 - x m / (m + ELO.n), by the
//    miss rate of the flagged answers and the area under the ROC curve (0.5: no better than chance). x = sig(ability -
//    genus difficulty), the ability as logged, the genus difficulty the mean over its real answers of the photo
//    difficulty those answers imply (ability - logit((e - 1/k) / (1 - 1/k)), as the sheet's photo Elo would rate it).
// 3. Contrast questions (docs/LEARNING.md "One contrast queue"): the Agains and the duels, expected vs right.
// The draw and the opening (which question comes) cannot be replayed: the log holds only the questions asked.
const fs = require('fs');
const file = process.argv[2];
if (!file) throw new Error('usage: node tools/realcheck.js answers.json');
require('../tests/slot.js').guard('tools/realcheck.js');  // one heavy run at a time on the machine (tests/slot.js, rule W24)
const J = JSON.parse(fs.readFileSync(file, 'utf8')),
  V = Array.isArray(J) ? J : J.values || J.rows || [];
const H = Array.isArray(V[0]) && V[0][0] === 'Name' ? V[0] : null,
  col = k => (H ? H.indexOf(k) : ['Name', 'Time', 'Genus shown', 'Answered', 'Right', 'Mode', 'Photos', 'Id', 'Expected', 'Ability'].indexOf(k));
const rows = (H ? V.slice(1) : V)
  .map(r => ({
    who: r[col('Name')],
    t: r[col('Time')],
    g: r[col('Genus shown')],
    a: r[col('Answered')],
    ok: Number(r[col('Right')]) === 1,
    m: String(r[col('Mode')] || ''),
    e: parseFloat(r[col('Expected')]),
    th: parseFloat(r[col('Ability')])
  }))
  .filter(r => r.g && r.who);
const sig = x => 1 / (1 + Math.exp(-x)),
  logit = p => Math.log(p / (1 - p)),
  cl = p => Math.min(0.999, Math.max(0.001, p));
// Plausible choices as the app scored the answer (memreplay.js kOf): typed none, |kN, a duel 2, else 4.
const kOf = m => (/\|t(\||$)/.test(m) ? Infinity : /\|k(\d)/.test(m) ? Number(/\|k(\d)/.exec(m)[1]) : /duel|\|d(\||$)/.test(m) ? 2 : 4);
const fmt = r =>
  /\|t(\||$)/.test(r.m)
    ? 'typed'
    : r.m.startsWith('quiz-duel')
      ? 'duel (Duel tab)'
      : /\|d(\||$)/.test(r.m)
        ? 'duel in the quiz'
        : kOf(r.m) === 2
          ? '2 choices (Again or easy)'
          : kOf(r.m) === 3
            ? '3 plausible choices'
            : '4 choices';
const withE = rows.filter(r => isFinite(r.e));
const cal = L => {
  const n = L.length;
  if (!n) return '-';
  const e = L.reduce((t, r) => t + r.e, 0) / n,
    ok = L.filter(r => r.ok).length / n,
    ll = -L.reduce((t, r) => t + Math.log(r.ok ? cl(r.e) : 1 - cl(r.e)), 0) / n;
  return `n ${n}, expected ${(100 * e).toFixed(0)}%, right ${(100 * ok).toFixed(0)}%, log-loss ${ll.toFixed(3)}`;
};
const group = (L, f) => {
  const m = new Map();
  L.forEach(r => m.set(f(r), [...(m.get(f(r)) || []), r]));
  return [...m.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0])));
};
console.log(`Answers: ${rows.length} (${new Set(rows.map(r => r.who)).size} players), ${withE.length} with the app's expectation logged`);
console.log('\n1. The app\'s expectation against the real answers');
console.log(`  all: ${cal(withE)}`);
group(withE, fmt).forEach(([k, L]) => console.log(`  ${k}: ${cal(L)}`));
// The answers the app expected near the game's target (75-85%): what each format really gave there.
console.log('  expected 75-85% (the target):');
group(
  withE.filter(r => r.e >= 0.75 && r.e <= 0.85),
  fmt
).forEach(([k, L]) => console.log(`    ${k}: ${cal(L)}`));
const band = th => (!isFinite(th) ? 'no ability' : th < 0 ? 'ability < 0' : th < 1 ? 'ability 0-1' : th < 2 ? 'ability 1-2' : 'ability >= 2');
group(withE, r => band(r.th)).forEach(([k, L]) => console.log(`  ${k}: ${cal(L)}`));

// 2. Genus difficulty from the real answers, then the draw and Review signals before each answer.
const OPEN_P = 0.6,
  ELO_N = 15;
const dOf = r => {
  const k = kOf(r.m),
    q = cl((r.e - (isFinite(k) ? 1 / k : 0)) / (1 - (isFinite(k) ? 1 / k : 0)));
  return r.th - logit(q);
};
const gd = {};
group(
  withE.filter(r => isFinite(r.th)),
  r => r.g
).forEach(([g, L]) => (gd[g] = L.reduce((t, r) => t + dOf(r), 0) / L.length));
const hist = {},
  sigs = [];
rows
  .slice()
  .sort((a, b) => String(a.t).localeCompare(String(b.t)))
  .forEach(r => {
    const key = r.who + '|' + r.g,
      h = (hist[key] = hist[key] || {res: [], m: 0});
    if (r.m.startsWith('quiz') && isFinite(r.th) && r.g in gd) {
      const x = sig(r.th - gd[r.g]),
        last5 = h.res.slice(-5);
      sigs.push({
        miss: !r.ok,
        oldReview: h.res.length > 0 && last5.filter(v => !v).length >= 2,
        newReview: h.m > 0 && 0.25 + 0.75 * x < OPEN_P,
        x,
        drawW: 1 - (x * h.m) / (h.m + ELO_N),
        old5: last5.filter(v => !v).length,
        seen: h.m > 0
      });
    }
    h.res.push(r.ok);
    h.m++;
    // A wrong answer also counts against the genus answered (rule L2), in its recent results.
    if (!r.ok && r.a && r.a !== r.g) {
      const k2 = r.who + '|' + r.a,
        h2 = (hist[k2] = hist[k2] || {res: [], m: 0});
      h2.res.push(false);
    }
  });
const auc = (L, f) => {
  const pos = L.filter(s => s.miss).map(f),
    neg = L.filter(s => !s.miss).map(f);
  let w = 0;
  pos.forEach(p => neg.forEach(q => (w += p > q ? 1 : p === q ? 0.5 : 0)));
  return pos.length && neg.length ? (w / (pos.length * neg.length)).toFixed(3) : '-';
};
const rate = L => (L.length ? `${L.length} answers, ${((100 * L.filter(s => s.miss).length) / L.length).toFixed(0)}% missed` : '-');
const S = sigs.filter(s => s.seen);
console.log('\n2. Before each answer on a genus already answered: which signal tells a miss is coming');
console.log(`  all: ${rate(S)}`);
console.log(`  old Review (2 misses in the last 5): flagged ${rate(S.filter(s => s.oldReview))}; not ${rate(S.filter(s => !s.oldReview))}`);
console.log(`  new Review (shaky): flagged ${rate(S.filter(s => s.newReview))}; not ${rate(S.filter(s => !s.newReview))}`);
console.log(
  `  area under the ROC curve for a miss: misses in the last 5 ${auc(S, s => s.old5)}, drawW ${auc(S, s => s.drawW)}, 1 - x alone ${auc(S, s => 1 - s.x)}`
);
const q = [0, 0.25, 0.5, 0.75, 1].map(p => {
  const a = S.map(s => s.drawW).sort((x, y) => x - y);
  return a[Math.min(a.length - 1, Math.floor(p * a.length))];
});
for (let i = 0; i < 4; i++) {
  const L = S.filter(s => s.drawW >= q[i] && (i === 3 ? s.drawW <= q[4] : s.drawW < q[i + 1]));
  console.log(`  drawW quarter ${i + 1} (${q[i].toFixed(2)}-${q[i + 1].toFixed(2)}): ${rate(L)}`);
}
console.log('\n3. Contrast questions');
const again = withE.filter(r => r.m.startsWith('quiz') && kOf(r.m) === 2 && !/\|d/.test(r.m) && !/\|t/.test(r.m));
console.log(`  2 choices in the quiz (Agains and easy choices): ${cal(again)}`);
console.log(`  duels in the quiz: ${cal(withE.filter(r => /^quiz\|d/.test(r.m)))}`);
console.log(`  Duel tab: ${cal(withE.filter(r => r.m.startsWith('quiz-duel')))}`);
