// REE-191 mechanics (no learner model): how many right answers in a row a unit's bar needs to reach Open Water (50%),
// Advanced (80%) and the exam's entry (85%), by question format, replayed with today's core.js (replayProgress, the
// sheet's own path). A player who is always right: nothing is assumed about how people learn.
//   node mech.js <main worktree>
const path = require('path');
const C = require(path.join(path.resolve(process.argv[2]), 'core.js'));
console.log('DOM', JSON.stringify(C.DOM));
const gen = {A: {look: ['B'], fam: 'x'}, B: {look: ['A'], fam: 'x'}, X: {look: [], fam: 'y'}, Y: {look: [], fam: 'z'}};
// formats: mode string and choices; k from core's kOf
const FMT = {
  '2 plausible of 4 (no trap)': ['quiz|k2', 'A X Y B'],
  '4 plausible (traps)': ['quiz', 'A B X Y'],
  typed: ['quiz|t', '']
};
function run(mode, ch, d, rel, N = 40) {
  const rows = [];
  const res = {};
  for (let i = 0; i < N; i++) {
    rows.push(['p', 1e12 + i * 60000, 'A', 'A', 1, mode, 'a' + i, null, null, 1, ch, null, 3, ...new Array(C.LOG_SC - 13).fill(null), C.scoreRec({d: d, m: rel})]);
    const P = C.replayProgress(rows, {gen})['p'].P;
    const b = C.scoreOf(P.A, P, 'A');
    for (const [k, v] of [['ow', 0.5], ['adv', 0.8], ['ex', 0.85]]) if (b >= v && res[k] == null) res[k] = i + 1;
    if (i === 4) res.b5 = b;
    if (i === 9) res.b10 = b;
  }
  return res;
}
console.log('| Format | photo difficulty vs its genus | right answers to 50% | to 80% | to 85% | bar after 5 right | after 10 |');
for (const [name, [mode, ch]] of Object.entries(FMT))
  for (const [dl, d] of [['average (d = genus offset)', 0], ['1 logit harder', 1], ['1 logit easier', -1]]) {
    const r = run(mode, ch, d, 0);
    console.log(`| ${name} | ${dl} | ${r.ow ?? '>40'} | ${r.adv ?? '>40'} | ${r.ex ?? '>40'} | ${(100 * r.b5).toFixed(0)}% | ${(100 * r.b10).toFixed(0)}% |`);
  }
