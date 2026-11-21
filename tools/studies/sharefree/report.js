// The shareFree arm's tables (REE-11): reads arm.js's --out file and prints, per profile, the paired free - empty
// differences declared in docs/reviews/2026-11-21-sharefree-arm.md.
//   node tools/studies/sharefree/report.js results.json
'use strict';
const o = require(require('path').resolve(process.argv[2]));
const med = a => {
    a = a.filter(x => x !== null && isFinite(x)).sort((x, y) => x - y);
    return a.length ? (a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2) : null;
  },
  mean = a => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null),
  sd = a => {
    const m = mean(a);
    return a.length > 1 ? Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)) : null;
  },
  // two-sided 95% t quantiles by degrees of freedom
  T = {1: 12.71, 2: 4.3, 3: 3.18, 4: 2.78, 5: 2.57, 6: 2.45, 7: 2.36, 8: 2.31, 9: 2.26, 10: 2.23, 11: 2.2, 12: 2.18, 13: 2.16, 14: 2.14, 15: 2.13, 19: 2.09},
  ci = d => {
    if (d.length < 2) return '-';
    const m = mean(d),
      h = (T[d.length - 1] || 2.1) * sd(d) / Math.sqrt(d.length);
    return `${m.toFixed(0)} [${(m - h).toFixed(0)}, ${(m + h).toFixed(0)}] sd ${sd(d).toFixed(0)} n ${d.length}`;
  },
  f = x => (x === null ? '-' : Math.round(x).toLocaleString('en'));
console.log(`commit ${o.commit}, ${o.runs.length} runs (${o.runs.filter(r => r.error).length} failed), ${o.questions} answers, ${o.seconds.toFixed(0)} s${o.cut ? ', CUT' : ''}${o.partial ? ', PARTIAL (still running)' : ''}`);
for (const p of o.profiles) {
  const R = o.runs.filter(r => r.profile === p && !r.error),
    seeds = [...new Set(R.map(r => r.seed))].filter(s => R.some(r => r.seed === s && r.arm === 'free') && R.some(r => r.seed === s && r.arm === 'empty')).sort((a, b) => a - b),
    by = (s, arm) => R.find(r => r.seed === s && r.arm === arm),
    nth = (r, k, n) => {
      const L = Object.entries(r.kinds)
        .filter(([u, x]) => x === k && u in r.advAt)
        .map(([u]) => r.advAt[u])
        .sort((a, b) => a - b);
      return L.length >= n ? L[n - 1] : null;
    },
    nthOW = (r, k, n) => {
      const L = Object.entries(r.kinds)
        .filter(([u, x]) => x === k && u in r.owAt)
        .map(([u]) => r.owAt[u])
        .sort((a, b) => a - b);
      return L.length >= n ? L[n - 1] : null;
    };
  // A partial file (cut at the budget, or a failed run): a profile with no seed run in both arms has no paired estimate.
  if (!seeds.length) {
    console.log(`\n== ${p}: insufficient data (${R.length} successful runs, no seed with both arms)`);
    continue;
  }
  console.log(`\n== ${p}: ${seeds.length} paired seeds; free set seen (max over runs, free arm / empty arm): ${Math.max(...R.filter(r => r.arm === 'free').map(r => r.freeMax))} / ${Math.max(...R.filter(r => r.arm === 'empty').map(r => r.freeMax))}`);
  console.log(`identical sequences: ${seeds.filter(s => by(s, 'free').seq === by(s, 'empty').seq).length} of ${seeds.length}`);
  console.log('\nPrimary: answer at which the nth family reaches Advanced; median free / empty; paired free - empty: mean [95% CI] (positive: today\'s free genera delay the families)');
  for (const n of [5, 10, 15, 20, 25, 30]) {
    const a = seeds.map(s => nth(by(s, 'free'), 'f', n)),
      b = seeds.map(s => nth(by(s, 'empty'), 'f', n)),
      d = seeds.map((s, i) => (a[i] !== null && b[i] !== null ? a[i] - b[i] : null)).filter(x => x !== null);
    console.log(`  ${String(n).padStart(2)}th  ${f(med(a))} / ${f(med(b))}  ${ci(d)}`);
  }
  // Added after the results (not declared): the family answers given before the nth family's Advanced. About equal in both
  // arms: the delay is the answers handed to the free genera (dilution); different: the genera slow the families otherwise.
  console.log('\nAfter the results: family answers before the nth family reaches Advanced; median free / empty; paired free - empty');
  for (const n of [5, 10, 15, 20, 25]) {
    const fa = arm =>
        seeds.map(s => {
          const r = by(s, arm),
            at = nth(r, 'f', n);
          return at === null ? null : [...r.seq.slice(0, at)].filter(c => c === 'f').length;
        }),
      a = fa('free'),
      b = fa('empty'),
      d = seeds.map((s, i) => (a[i] !== null && b[i] !== null ? a[i] - b[i] : null)).filter(x => x !== null);
    console.log(`  ${String(n).padStart(2)}th  ${f(med(a))} / ${f(med(b))}  ${ci(d)}`);
  }
  console.log('\nThe auto IMR genera (a): answer at which the nth reaches Open Water / Advanced; median free / empty; paired free - empty over the complete cases only (both arms reached it by the horizon; censored pairs left out, so no bound on the whole; negative: the cap delays them)');
  const na = Math.max(0, ...R.map(r => Object.values(r.kinds).filter(x => x === 'a').length));
  console.log(`  auto genera: ${na}`);
  for (const n of [1, 3, 5, 10].filter(n => n <= na)) {
    for (const [lab, fn] of [['OW ', nthOW], ['Adv', nth]]) {
      const a = seeds.map(s => fn(by(s, 'free'), 'a', n)),
        b = seeds.map(s => fn(by(s, 'empty'), 'a', n)),
        d = seeds.map((s, i) => (a[i] !== null && b[i] !== null ? a[i] - b[i] : null)).filter(x => x !== null);
      console.log(`  ${String(n).padStart(2)}th ${lab} ${f(med(a))} / ${f(med(b))} (reached ${a.filter(x => x !== null).length} / ${b.filter(x => x !== null).length})  ${ci(d)}`);
    }
  }
  console.log('\nAt the checkpoints, median free / empty: families at Advanced, auto genera at Advanced, shown score; paired score free - empty');
  const cps = R[0].rows.map(x => x.q);
  cps.forEach((q, i) => {
    const row = arm => seeds.map(s => by(s, arm).rows[i]),
      aAdv = arm => seeds.map(s => {
        const r = by(s, arm);
        return Object.entries(r.kinds).filter(([u, x]) => x === 'a' && u in r.advAt && r.advAt[u] <= q).length;
      }),
      sc = seeds.map(s => by(s, 'free').rows[i].score - by(s, 'empty').rows[i].score);
    console.log(
      `  ${String(q).padStart(5)}  fam ${med(row('free').map(x => x.fam))} / ${med(row('empty').map(x => x.fam))}  auto ${med(aAdv('free'))} / ${med(aAdv('empty'))}  score ${med(row('free').map(x => x.score)).toFixed(1)} / ${med(row('empty').map(x => x.score)).toFixed(1)}  diff ${mean(sc).toFixed(2)} (sd ${(sd(sc) || 0).toFixed(2)})`
    );
  });
  console.log('\nShare of answers by kind (f family, g genus by offer, a auto IMR genus, s species common, x species scientific), mean over seeds, %');
  const W = [[1, 300], [301, 1000], [1001, 2000], [2001, 3000], [3001, 5000]].filter(([a]) => a <= o.questions);
  for (const arm of ['free', 'empty'])
    W.forEach(([a, b]) => {
      const cnt = {};
      seeds.forEach(s => {
        const sq = by(s, arm).seq.slice(a - 1, b);
        for (const c of sq) cnt[c] = (cnt[c] || 0) + 1 / sq.length / seeds.length;
      });
      console.log(`  ${arm.padEnd(5)} ${a}-${b}: ${Object.entries(cnt).sort((x, y) => y[1] - x[1]).map(([k, v]) => `${k} ${(100 * v).toFixed(1)}`).join(', ')}`);
    });
}
