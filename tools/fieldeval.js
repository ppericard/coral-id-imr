// Progress against the whole slate (2026-11-05, docs/LEARNING.md "Field learner"): reads tools/learnsim.js --out files
// and reports, per profile and checkpoint, the pre-declared measures with 95% intervals over the seeds, and each file
// against the first on the same seeds (paired). With --log, a read-only check on the real answer log instead: does the
// number of genera a player has met predict right or wrong beyond the app's own expectation? Offline, reads files,
// sends nothing, prints counts and statistics only (no player name or id).
//
//   node tools/fieldeval.js base.json other.json [...] [--at 300,600,1000]
//   node tools/fieldeval.js --log answers.json [--min 30]
//
// Simulated measures (learnsim's field row f, both learners; the truth pOpen is each learner's own success on an average
// photo of a genus with every slate genus a possible answer):
// - over: per run, mean over the genera met of (bar shown, genScore) - pOpen. Primary at 600 questions. > 0: the bar
//   claims more than the player can do against the whole slate.
// - precL: per run, the share of Learned genera whose pOpen is learnsim's LEARNER.PREC (0.8) or more. Primary at 1000
//   questions; a run with no Learned genus has none (left out, the runs counted shown as n).
// - Secondary, descriptive: over+ (max(0, bar - pOpen), the study's form), openMet, bar, learned; with --custom, the
//   selection's own bar, pOpen and over at the end of the drill.
// Means with a 95% t interval over the seeds; paired: the mean of the per-seed differences (file - first file, same
// profile and seed), its 95% t interval, the two-sided sign-flip p over the seeds (tools/abilityeval.js signFlip), and
// Holm over the profiles for each primary (docs/reviews/2026-11-05-stats-methods-study.md). Other cells are exploratory.
//
// --log (tier 3, read-only): the answer log (the admin's readAnswers rows or the sheet's Answers tab, as
// tools/abilityeval.js reads them), coral game genera, answers with the app's logged expectation e. x = log2 of the
// genera the player had been asked so far, this one included (the log records no cards: a genus opened but not yet asked
// is left out). Two models on top of the expectation, each fitted on the other players and scored on the player left
// out: M0 logit p = logit e + a (a calibration shift), M1 logit p = logit e + a + b x. Primary: the mean over players of
// their mean log-loss difference M1 - M0 (each player one vote), 95% t interval, sign-flip p over players; declared
// direction: M1 lower, with b < 0 (more genera in mind, fewer right than expected). Descriptive: b fitted on every
// player, the players' own b (players with --min answers or more), the same split typed / choices (exploratory).
const fs = require('fs');
const {signFlip, tQuantile, normalise, kOf, GAME} = require('./abilityeval.js');

const args = process.argv.slice(2),
  opt = (k, d) => {
    const i = args.indexOf('--' + k);
    return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : d;
  },
  files = args.filter((a, i) => !a.startsWith('--') && !(i && args[i - 1].startsWith('--')));
const mean = v => v.reduce((a, x) => a + x, 0) / v.length,
  sd = v => Math.sqrt(v.reduce((a, x) => a + (x - mean(v)) ** 2, 0) / (v.length - 1)),
  num = x => typeof x === 'number' && isFinite(x),
  f = (x, d = 3) => (num(x) ? (x >= 0 ? ' ' : '') + x.toFixed(d) : '-');
// Mean and 95% t interval of a list.
function ci(v) {
  v = v.filter(num);
  if (!v.length) return {n: 0};
  const m = mean(v),
    h = v.length > 1 ? (tQuantile(0.975, v.length - 1) * sd(v)) / Math.sqrt(v.length) : NaN;
  return {n: v.length, m, lo: m - h, hi: m + h};
}
const cis = (c, clip) => (c.n ? `${f(c.m)} [${f(clip ? Math.max(0, c.lo) : c.lo)}, ${f(clip ? Math.min(1, c.hi) : c.hi)}]` : '-');
// precL is a share: its interval is shown clipped to [0, 1] (a t interval on few runs near 1 runs past it).
// Holm's step-down adjustment of a list of p.
function holm(ps) {
  const o = ps.map((p, i) => [p, i]).filter(x => num(x[0])).sort((a, b) => a[0] - b[0]),
    out = ps.map(() => NaN);
  let run = 0;
  o.forEach(([p, i], k) => (out[i] = run = Math.min(1, Math.max(run, (o.length - k) * p))));
  return out;
}

function sims() {
  const AT = opt('at', '300,600,1000').split(',').map(Number),
    D = files.map(p => JSON.parse(fs.readFileSync(p, 'utf8'))),
    label = d =>
      `${d.learnerKind || 'item'}${d.tau !== null && d.tau !== undefined ? ' tau ' + d.tau : ''}${d.custom ? ` Custom-${d.custom.n} (${d.custom.drill})` : ' path'}`,
    profiles = Object.keys(D[0].profiles),
    rowAt = (r, q) => (r.rows.find(x => x.q === q) || {}).f || null,
    KS = [
      ['over', 'over (primary at 600)'],
      ['precL', 'precL (primary at 1000)'],
      ['overPos', 'over+'],
      ['openMet', 'openMet'],
      ['bar', 'bar'],
      ['learned', 'learned']
    ];
  console.log(`Field evaluation: ${files.length} files, ${D[0].seeds} seeds; checkpoints ${AT.join(', ')}; 95% t intervals over the seeds`);
  D.forEach((d, i) => console.log(`  [${i}] ${label(d)}: ${files[i]} (${d.runs.length} runs, ${d.questions} questions, commit ${d.commit})`));
  for (const [k, lab] of KS) {
    console.log(`\n${lab}`);
    for (const q of AT) {
      for (const pr of profiles) {
        const cells = D.map(d => d.runs.filter(r => r.profile === pr));
        // precL: also pooled over the runs, the Learned genera with pOpen >= PREC out of all Learned genera.
        const pooled = R => {
            const F = R.map(r => rowAt(r, q)).filter(x => x && x.learned),
              n = F.reduce((a, x) => a + x.learned, 0);
            return n ? `, pooled ${Math.round(F.reduce((a, x) => a + x.precL * x.learned, 0))}/${n}` : '';
          },
          line = cells.map(
            (R, i) => `[${i}] ${cis(ci(R.map(r => (rowAt(r, q) || {})[k])), k === 'precL')} n ${ci(R.map(r => (rowAt(r, q) || {})[k])).n}${k === 'precL' ? pooled(R) : ''}`
          );
        console.log(`  q ${String(q).padStart(4)} ${pr.padEnd(10)} ${line.join('   ')}`);
      }
    }
  }
  // The custom selection at the end of the drill.
  D.forEach((d, i) => {
    if (!d.custom) return;
    console.log(`\n[${i}] ${label(d)}: at the end of the drill (the selection's own, then over the genera met)`);
    for (const pr of profiles) {
      const R = d.runs.filter(r => r.profile === pr && r.custom && r.custom.row).map(r => r.custom.row),
        c = k => cis(ci(R.map(x => x[k])));
      console.log(
        `  ${pr.padEnd(10)} n ${R.length}, question ${f(mean(R.map(x => x.q)), 0)}: selBar ${c('selBar')}  selOpen ${c('selOpen')}  selOver ${c('selOver')}  over ${c('over')}  right% in the drill ${c('right')}`
      );
    }
  });
  // Paired: each file against the first, same profile and seed.
  for (let i = 1; i < D.length; i++) {
    console.log(`\nPaired, [${i}] ${label(D[i])} - [0] ${label(D[0])} (same seeds): mean difference [95% t], sign-flip p, Holm over the profiles`);
    for (const [k, lab] of KS.slice(0, 3))
      for (const q of AT) {
        const res = profiles.map(pr => {
          const d = D[0].runs
            .filter(r => r.profile === pr)
            .map(a => {
              const b = D[i].runs.find(r => r.profile === pr && r.seed === a.seed),
                x = (rowAt(a, q) || {})[k],
                y = b && (rowAt(b, q) || {})[k];
              return num(x) && num(y) ? y - x : null;
            })
            .filter(num);
          return {pr, c: ci(d), p: d.length ? signFlip(d).p : NaN};
        });
        const ph = holm(res.map(r => r.p));
        res.forEach((r, j) =>
          console.log(`  ${lab.padEnd(24)} q ${String(q).padStart(4)} ${r.pr.padEnd(10)} n ${String(r.c.n).padStart(2)} ${cis(r.c)}  p ${f(r.p, 4)}  Holm ${f(ph[j], 4)}`)
        );
      }
  }
}

// Logistic fit with an offset (Newton-Raphson): logit p = o + X . beta.
function fit(rows, cols) {
  let b = cols.map(() => 0);
  for (let it = 0; it < 50; it++) {
    const g = cols.map(() => 0),
      H = cols.map(() => cols.map(() => 0));
    for (const r of rows) {
      const z = r.o + cols.reduce((a, c, j) => a + b[j] * r[c], 0),
        p = 1 / (1 + Math.exp(-z)),
        w = p * (1 - p);
      cols.forEach((c, j) => {
        g[j] += (r.y - p) * r[c];
        cols.forEach((c2, l) => (H[j][l] += w * r[c] * r[c2]));
      });
    }
    // Solve H d = g (1 or 2 unknowns), with a small ridge for safety.
    let d;
    if (cols.length === 1) d = [g[0] / (H[0][0] + 1e-9)];
    else {
      const a = H[0][0] + 1e-9,
        bb = H[0][1],
        c = H[1][0],
        dd = H[1][1] + 1e-9,
        det = a * dd - bb * c;
      d = [(dd * g[0] - bb * g[1]) / det, (a * g[1] - c * g[0]) / det];
    }
    b = b.map((x, j) => x + d[j]);
    if (Math.max(...d.map(Math.abs)) < 1e-9) break;
  }
  return b;
}
const pOf = (r, cols, b) => 1 / (1 + Math.exp(-(r.o + cols.reduce((a, c, j) => a + b[j] * r[c], 0))));
const ll = (r, p) => -(r.y ? Math.log(p) : Math.log(1 - p));

function realLog(file) {
  const MIN = Number(opt('min', 30)),
    raw = JSON.parse(fs.readFileSync(file, 'utf8')),
    A = normalise(Array.isArray(raw) ? raw : raw.rows || raw.values),
    seen = new Map(),
    rows = [];
  let skipped = 0;
  for (const a of A) {
    if (!GAME.has(a.t)) continue;
    if (!seen.has(a.p)) seen.set(a.p, new Set());
    const S = seen.get(a.p);
    S.add(a.t);
    const e = Number(a.e);
    if (!(e > 0 && e < 1)) {
      skipped++;
      continue;
    }
    rows.push({p: a.p, y: a.ok, o: Math.log(e / (1 - e)), one: 1, x: Math.log2(S.size), typed: !isFinite(kOf(a.mode, a.ch)), n: S.size});
  }
  const players = [...new Set(rows.map(r => r.p))];
  console.log(
    `Real answer log: ${rows.length} coral answers with the app's expectation, ${players.length} players (${skipped} answers without one left out)`
  );
  const nByP = players.map(p => rows.filter(r => r.p === p).length).sort((a, b) => a - b),
    met = players.map(p => Math.max(...rows.filter(r => r.p === p).map(r => r.n))).sort((a, b) => a - b);
  console.log(`  answers per player: ${nByP.join(', ')}`);
  console.log(`  genera asked by the end, per player: ${met.join(', ')}`);
  const run = (R, lab) => {
    const P = [...new Set(R.map(r => r.p))];
    if (P.length < 3) return console.log(`  ${lab}: fewer than 3 players`);
    const dp = P.map(p => {
      const tr = R.filter(r => r.p !== p),
        te = R.filter(r => r.p === p),
        b0 = fit(tr, ['one']),
        b1 = fit(tr, ['one', 'x']);
      return mean(te.map(r => ll(r, pOf(r, ['one', 'x'], b1)) - ll(r, pOf(r, ['one'], b0))));
    });
    const c = ci(dp),
      sf = signFlip(dp),
      ball = fit(R, ['one', 'x']),
      own = P.filter(p => R.filter(r => r.p === p).length >= MIN).map(p => fit(R.filter(r => r.p === p), ['one', 'x'])[1]);
    console.log(`  ${lab}: ${R.length} answers, ${P.length} players`);
    console.log(
      `    log-loss M1 - M0 per player (leave one player out): ${cis(c)}, sign-flip p ${f(sf.p, 4)}${sf.exact ? ' (exact)' : ''}; players where M1 is better: ${dp.filter(x => x < 0).length}/${dp.length}`
    );
    console.log(`    b fitted on every player: ${f(ball[1])} logit per doubling of the genera asked (a ${f(ball[0])})`);
    console.log(
      `    players' own b (${MIN}+ answers, ${own.length} players): ${cis(ci(own))}, negative in ${own.filter(x => x < 0).length}/${own.length}, sign-flip p ${f(signFlip(own).p, 4)}`
    );
    // Calibration by field size: mean expected (e) and mean right, by genera asked so far.
    const bands = [
      [1, 4],
      [5, 8],
      [9, 16],
      [17, 32],
      [33, 99]
    ];
    console.log(
      '    by genera asked so far: ' +
        bands
          .map(([lo, hi]) => {
            const B = R.filter(r => r.n >= lo && r.n <= hi);
            return B.length
              ? `${lo}-${hi}: n ${B.length}, e ${f(mean(B.map(r => 1 / (1 + Math.exp(-r.o)))), 2)}, right ${f(mean(B.map(r => r.y)), 2)}`
              : `${lo}-${hi}: -`;
          })
          .join('; ')
    );
  };
  run(rows, 'all answers (primary)');
  run(
    rows.filter(r => r.typed),
    'typed (exploratory)'
  );
  run(
    rows.filter(r => !r.typed),
    'choices (exploratory)'
  );
}

if (args.includes('--log')) realLog(opt('log'));
else if (files.length) sims();
else console.log('node tools/fieldeval.js base.json other.json [--at 300,600,1000] | --log answers.json [--min 30]');
