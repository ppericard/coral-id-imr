// The 11-18 placement study's model, reimplemented: an adaptive test of 4-choice questions, each next question at the
// current estimate (core.js levelFit; 0.5 before any answer), each question's rating off by N(0, s^2); the right-band
// rate at 15, 20 and 25 questions for players at -0.5, 0.56 and 1.5 (bands 0.25 / 0.875). Common random numbers across s.
// usage: node bands.js <tests per cell> <s,s,...>
const C = require('/home/user/coral-id-imr/.claude/worktrees/placement-shrinkage/core.js');
const NT = Number(process.argv[2] || 20000),
  SS = (process.argv[3] || '0,0.8').split(',').map(Number);
const LV = [-0.5, 0.56, 1.5],
  NQ = 25,
  AT = [15, 20, 25],
  G = 0.25;
const GRID = [];
for (let i = 0, lo = -1.5; lo + i * 0.02 <= 3 + 1e-9; i++) GRID.push(lo + i * 0.02);
const sig = x => 1 / (1 + Math.exp(-x));
const band = x => (x < 0.25 ? 0 : x <= 0.875 ? 1 : 2);
function rng(seed) {
  let a = seed >>> 0;
  const u = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {u, n: () => Math.sqrt(-2 * Math.log(1 - u())) * Math.cos(2 * Math.PI * u())};
}
// check the incremental fit against core.js levelFit on a few random answer sets
{
  const R = rng(5);
  for (let t = 0; t < 200; t++) {
    const A = [];
    for (let k = 0; k < 1 + (t % 25); k++) A.push([R.n(), G, R.u() < 0.6 ? 1 : 0]);
    const ll = new Float64Array(GRID.length);
    A.forEach(a => GRID.forEach((th, i) => (ll[i] += Math.log(a[2] ? G + (1 - G) * sig(th - a[0]) : 1 - (G + (1 - G) * sig(th - a[0]))))));
    let bi = 0;
    for (let i = 1; i < GRID.length; i++) if (ll[i] > ll[bi]) bi = i;
    if (Math.abs(Math.round(GRID[bi] * 100) / 100 - C.levelFit(A)[0]) > 1e-9) throw new Error('fit mismatch');
  }
}
const res = {};
SS.forEach(s => (res[s] = LV.map(() => AT.map(() => 0))));
LV.forEach((th, li) => {
  for (let t = 0; t < NT; t++) {
    const R = rng(1e6 * li + t + 1);
    const U = [],
      Zn = [];
    for (let q = 0; q < NQ; q++) ((U[q] = R.u()), (Zn[q] = R.n()));
    SS.forEach(s => {
      const ll = new Float64Array(GRID.length);
      let est = 0.5;
      for (let q = 0; q < NQ; q++) {
        const d = est,
          p = G + (1 - G) * sig(th - d - s * Zn[q]),
          y = U[q] < p ? 1 : 0;
        for (let i = 0; i < GRID.length; i++) {
          const pp = G + (1 - G) * sig(GRID[i] - d);
          ll[i] += Math.log(y ? pp : 1 - pp);
        }
        let bi = 0;
        for (let i = 1; i < GRID.length; i++) if (ll[i] > ll[bi]) bi = i;
        est = Math.round(GRID[bi] * 100) / 100;
        const k = AT.indexOf(q + 1);
        if (k >= 0 && band(est) === band(th)) res[s][li][k]++;
      }
    });
  }
});
SS.forEach(s => AT.forEach((n, k) => console.log('s', s, 'questions', n, LV.map((th, li) => (res[s][li][k] / NT).toFixed(3)).join(' / '))));
