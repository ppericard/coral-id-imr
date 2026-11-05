// The judge of a progress bar (2026-11-06, Pierre Q127-Q130; docs/reviews/2026-11-06-progress-metric-research.md;
// docs/LEARNING.md "The judge"). Offline: reads tools/learnsim.js --out files, sends nothing.
//
//   node tools/barjudge.js run.json [run2.json ...] [--bar live|<name>] [--core path/to/core.js] [--stats stats.json]
//   node tools/barjudge.js --log answers.json
//
// Simulated runs. The error of a bar on genus g is E(g) = bar(g) - D*(g), D* the learner's true domain score (learnsim
// rows f.ds: its success naming a photo of g alone, with no choices, over g's theoretical photo distribution). Per file
// and profile, at q100, q300, q600, q1000: the mean E over the genera met (all), over the genera the profile knows and
// the others (known, unknown: the profiles whose genera differ), and at the end of a Custom-N drill over the drilled
// genera and the others (sel, notsel); mean |E|; the time to credit (learnsim credit: per genus, the questions from its
// first answer until its bar reached 50% and 80%, median over the genera the profile knows; and the question at which
// the mean bar of the genera it knows did). Means with 95% t intervals over the seeds.
// --bar live (default): the bar the run showed (rows f.gs, credit). --bar <name> with --core: another rule's bar, computed
// on the same answers by replaying each run's answer log (alog) with that core.js: 'scoreOf' (core.scoreOf, a check:
// it must give back the live bar) or 'field' (core.barOf with core.fieldOf over the slate and the --stats pooled
// confusions: PR #611's rule). Approximation, said in the output: the replay plays the run's own answers, so a rule that
// changes what the game asks (the exam's entry, a typed answer's guess rate) is judged on answers it would not all have
// given; the learned marks are the run's (learnedAt).
//
// --log answers.json (the sheet's Answers tab, read-only copy; tools/abilityeval.js normalise): is the app's predicted
// success calibrated across photo difficulty? Every coral answer with the app's logged expectation e and ability th:
// x = th - d, d recovered from e (e = 1/k + (1 - 1/k) sig(th - d)), the answers cut in terciles of x (hard, middle, easy
// for the player). Per tercile: each player's mean (right - e), then the mean over players (players as the unit) with a
// 95% t interval and a sign-flip p over players; and leave one player out: a logistic recalibration logit p = a + b
// logit e fitted on the other players' answers of the tercile, the held-out player's log-loss with it minus without
// (negative: the app's forecast is off there in a way the others' data can correct).
const fs = require('fs'),
  path = require('path');
const {normalise, kOf, signFlip, tQuantile} = require('./abilityeval.js');

const args = process.argv.slice(2),
  opt = (k, d) => {
    const i = args.indexOf('--' + k);
    return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : d;
  },
  files = args.filter((a, i) => !a.startsWith('--') && !(i && args[i - 1].startsWith('--')));
const mean = v => (v.length ? v.reduce((a, x) => a + x, 0) / v.length : NaN),
  sd = v => Math.sqrt(v.reduce((a, x) => a + (x - mean(v)) ** 2, 0) / Math.max(1, v.length - 1)),
  num = x => typeof x === 'number' && isFinite(x),
  median = v => {
    const s = v.filter(x => typeof x === 'number' && !isNaN(x)).sort((a, b) => a - b);
    return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : NaN;
  },
  f = (x, d = 3) => (num(x) ? (x >= 0 ? '+' : '') + x.toFixed(d) : '   -  ');
function ci(v) {
  v = v.filter(num);
  if (!v.length) return {n: 0};
  const m = mean(v),
    h = v.length > 1 ? (tQuantile(0.975, v.length - 1) * sd(v)) / Math.sqrt(v.length) : NaN;
  return {n: v.length, m, lo: m - h, hi: m + h};
}
const cis = (c, d = 3) => (c.n ? `${f(c.m, d)} [${f(c.lo, d)}, ${f(c.hi, d)}]` : '-');

if (opt('log', null)) logCheck(opt('log'));
else simJudge();

// ---------- simulated runs ----------
function simJudge() {
  const BAR = opt('bar', 'live'),
    AT = [100, 300, 600, 1000];
  let alt = null;
  if (BAR !== 'live') {
    const C = require(path.resolve(opt('core', path.join(__dirname, '..', 'core.js')))),
      D = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data.json'), 'utf8')),
      st = opt('stats', null) ? JSON.parse(fs.readFileSync(opt('stats'), 'utf8')) : {},
      gen = {};
    [D.gen, (D.x || {}).gen || {}].forEach(G => Object.keys(G).forEach(n => gen[n] || (gen[n] = {look: G[n].look || [], fam: G[n].fam || ''})));
    const slate = C.slateOf(D),
      F = BAR === 'field' ? C.fieldOf(gen, st.conf || {}, slate) : null;
    if (BAR === 'field' && !C.barOf) throw new Error('--bar field needs a core.js with barOf (PR #611)');
    const barOf = (P, g) => (BAR === 'field' ? C.barOf(P, g, F) : C.scoreOf(P[g]));
    // The replayed state at question q, the run's learned marks put back (the replay does not replay the exam).
    alt = {C, gen, st, barOf, slate};
  }
  console.log(`Judge: bar ${BAR}${alt ? ' (replayed from each run\'s answers; see the header of tools/barjudge.js)' : ''}; E = bar - D* (D*: the learner's true domain score); 95% t intervals over the seeds`);
  files.forEach(file => {
    const d = JSON.parse(fs.readFileSync(file, 'utf8')),
      kind = `${d.learnerKind || d.learner || '?'}${d.tau != null ? ' tau ' + d.tau : ''}${d.custom ? ` Custom-${d.custom}` : ''}`;
    console.log(`\n${path.basename(file)}: ${kind}, ${d.runs.length} runs, ${d.questions} questions, commit ${d.commit}`);
    const by = {};
    d.runs.forEach(r => {
      const R = (by[r.profile] = by[r.profile] || {E: {}, abs: {}, credit: {k50: [], k80: [], g50: [], g80: [], r80: []}}),
        known = new Set(r.known || []),
        stops = AT.map(q => ({q, row: (r.rows.find(x => x.q === q) || {}).f})).concat(
          r.custom && r.custom.row ? [{q: 'drill', at: r.custom.to, row: r.custom.row}] : []
        );
      // The bars of the rule judged: the live ones, or replayed.
      let bars = st2 => st2.row.gs;
      let rep = null;
      if (alt) {
        // The replay applies no first-launch prior (o.starts): exact for a run answered "new" (prior 0, learnsim's
        // default --choice), not for another answer (Codex review #624): such runs are refused.
        const ch = typeof r.choice === 'object' && r.choice ? r.choice.c || r.choice.choice : r.choice;
        if (ch && ch !== 'new') throw new Error(`${file}: a run answered the first-launch question "${ch}"; --bar replays only "new" runs`);
        const rows = r.alog.map(x => alt.C.logRow(x[0], 'p'));
        rep = {rows, st: null, at: 0};
        bars = st2 => {
          const at = st2.at || st2.q;
          rep.st = alt.C.replayProgress(rows.slice(rep.at, at), {gen: alt.gen, conf: alt.st.conf, mem: alt.st.mem, start: rep.st ? {p: rep.st} : undefined}).p;
          rep.at = at;
          const P = JSON.parse(JSON.stringify(rep.st.P));
          // A mark passed by question `at`, unless a miss logged after it took it away as the game does (the replay's lm:
          // the last miss that left the progress below the keep rule; Codex review #624).
          Object.entries(r.learnedAt || {}).forEach(([g, x]) => {
            const tq = Date.parse((r.alog[x.q - 1] || [{}])[0].t) || 0;
            if (x.q <= at && P[g] && !(P[g].lm > tq)) P[g].mx = 1;
          });
          return Object.fromEntries(Object.keys(st2.row.ds || {}).map(g => [g, alt.barOf(P, g)]));
        };
      }
      stops
        .sort((a, b) => (a.at || a.q) - (b.at || b.q))
        .forEach(s => {
          if (!s.row || !s.row.ds) return;
          const B = bars(s),
            met = Object.keys(s.row.ds),
            E = g => B[g] - s.row.ds[g],
            put = (k, L) => {
              if (!L.length) return;
              (R.E[s.q + '|' + k] = R.E[s.q + '|' + k] || []).push(mean(L.map(E)));
              if (k === 'all') (R.abs[s.q] = R.abs[s.q] || []).push(mean(L.map(g => Math.abs(E(g)))));
            };
          put('all', met);
          if (known.size > 0 && known.size < 40) {
            put('known', met.filter(g => known.has(g)));
            put('unknown', met.filter(g => !known.has(g)));
          }
          if (s.q === 'drill') {
            put('sel', r.custom.sel);
            put('notsel', met.filter(g => !r.custom.sel.includes(g)));
          }
        });
      // Time to credit (live bar only: the run's own record).
      // Censored, not dropped (Codex review #624): a known genus that never reached the level, or was never answered,
      // counts as not reached (Infinity), so a median over the known genera is a real one or "not reached".
      if (!alt && r.credit) {
        const c = r.credit,
          kg = [...known],
          tt = (g, k) => (c[g] && c[g][k] ? c[g][k] - c[g].first : Infinity);
        R.credit.k50.push(c._k50 || Infinity);
        R.credit.k80.push(c._k80 || Infinity);
        R.credit.g50.push(kg.length ? median(kg.map(g => tt(g, 'q50'))) : NaN);
        R.credit.g80.push(kg.length ? median(kg.map(g => tt(g, 'q80'))) : NaN);
        R.credit.r80.push(kg.length ? kg.filter(g => tt(g, 'q80') < Infinity).length / kg.length : NaN);
      }
    });
    Object.entries(by).forEach(([p, R]) => {
      console.log(`  ${p}`);
      const keys = [...new Set(Object.keys(R.E).map(k => k.split('|')[1]))];
      keys.forEach(k =>
        console.log(
          `    E ${k.padEnd(8)}` +
            [...AT, 'drill']
              .filter(q => R.E[q + '|' + k])
              .map(q => `  q${q}: ${cis(ci(R.E[q + '|' + k]))}`)
              .join('')
        )
      );
      console.log('    |E| all   ' + AT.filter(q => R.abs[q]).map(q => `  q${q}: ${f(mean(R.abs[q]))}`).join(''));
      if (R.credit.k50.length) {
        const c = R.credit,
          reach = v => `${v.filter(num).length}/${v.length}`,
          q = x => (x === Infinity ? 'not reached' : f(x, 0));
        console.log(
          `    credit on the genera it knows (medians over the runs; not reached counted as such): their mean bar 50% at q ${q(median(c.k50))} (reached in ${reach(c.k50)} runs), 80% at q ${q(median(c.k80))} (${reach(c.k80)}); per genus, questions from its first answer to 50% ${q(median(c.g50))}, to 80% ${q(median(c.g80))}; share of known genera at 80% by the end ${f(mean(c.r80.filter(num)), 2)}`
        );
      }
    });
  });
}

// ---------- the real answer log ----------
function logCheck(file) {
  const raw = JSON.parse(fs.readFileSync(file, 'utf8')),
    rows = normalise(Array.isArray(raw) ? raw : raw.values || raw.rows || []),
    sig = x => 1 / (1 + Math.exp(-x)),
    logit = p => Math.log(p / (1 - p)),
    cl = p => Math.min(0.995, Math.max(0.005, p));
  const A = [];
  rows.forEach(r => {
    const e = Number(r.e),
      th = Number(r.th);
    if (!(e > 0 && e < 1) || !isFinite(th) || /^quiz-duel/.test(r.mode || '')) return;
    const k = kOf(r.mode, r.ch),
      q = isFinite(k) ? cl((e - 1 / k) / (1 - 1 / k)) : cl(e);
    A.push({p: r.p, ok: r.ok, e: cl(e), x: logit(q), typed: !isFinite(k)});
  });
  const xs = A.map(a => a.x).sort((a, b) => a - b),
    t1 = xs[Math.floor(xs.length / 3)],
    t2 = xs[Math.floor((2 * xs.length) / 3)],
    terc = a => (a.x < t1 ? 'hard' : a.x < t2 ? 'middle' : 'easy');
  const players = [...new Set(A.map(a => a.p))];
  console.log(`Real answer log: ${A.length} answers with the app's expectation (duels left out), ${players.length} players`);
  console.log(`Terciles of x = ability - photo difficulty (logits): hard < ${t1.toFixed(2)} <= middle < ${t2.toFixed(2)} <= easy`);
  ['hard', 'middle', 'easy', 'all'].forEach(T => {
    const S = A.filter(a => T === 'all' || terc(a) === T),
      per = players.map(p => S.filter(a => a.p === p)).filter(L => L.length >= 5),
      d = per.map(L => mean(L.map(a => a.ok - a.e)));
    // Leave one player out: logit p = a + b logit e fitted (Newton) on the others' answers of this tercile.
    // Newton with step halving on the log-likelihood (Codex review #624: a bare Newton step diverged on flat data).
    const loglik = (L, a, b) => L.reduce((t, r) => t + (r.ok ? Math.log(cl(sig(a + b * logit(r.e)))) : Math.log(1 - cl(sig(a + b * logit(r.e))))), 0);
    const fit = L => {
      let a = 0,
        b = 1,
        cur = loglik(L, a, b);
      for (let it = 0; it < 50; it++) {
        let ga = 0,
          gb = 0,
          haa = 0,
          hab = 0,
          hbb = 0;
        L.forEach(r => {
          const z = logit(r.e),
            p = sig(a + b * z),
            w = p * (1 - p),
            res = r.ok - p;
          ga += res;
          gb += res * z;
          haa += w;
          hab += w * z;
          hbb += w * z * z;
        });
        const det = haa * hbb - hab * hab;
        if (!(det > 1e-9)) break;
        let da = (hbb * ga - hab * gb) / det,
          db = (haa * gb - hab * ga) / det,
          step = 1,
          next;
        while (step > 1e-6 && !((next = loglik(L, a + step * da, b + step * db)) >= cur - 1e-12)) step /= 2;
        if (step <= 1e-6) break;
        a += step * da;
        b += step * db;
        if (next - cur < 1e-10) break;
        cur = next;
      }
      return [a, b];
    };
    const ll = (L, g) => mean(L.map(r => -(r.ok ? Math.log(cl(g(r))) : Math.log(1 - cl(g(r)))))),
      lopo = per.map(L => {
        const [a, b] = fit(S.filter(r => r.p !== L[0].p));
        return ll(L, r => sig(a + b * logit(r.e))) - ll(L, r => r.e);
      });
    const c = ci(d),
      sf = signFlip(d),
      c2 = ci(lopo);
    console.log(
      `  ${T.padEnd(6)} ${String(S.length).padStart(5)} answers, ${per.length} players (5+ answers): predicted ${mean(S.map(a => a.e)).toFixed(3)}, right ${mean(S.map(a => a.ok)).toFixed(3)}; per player right - predicted ${cis(c)}, sign-flip p ${f(sf.p, 3)}; leave one player out, recalibrated log-loss minus the app's ${cis(c2, 4)}`
    );
  });
}
