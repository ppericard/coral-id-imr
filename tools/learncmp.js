// The paired comparison of two learnsim runs (rule L11; docs/LEARNING.md "Validating a learning change"): reads two
// tools/learnsim.js --out files made on the same seeds (before and after a change), pairs their runs by (profile, seed)
// and judges every guardrail of LEARNING.md's table at the checkpoints both files reach, and the primary measure the PR
// declared before running. It replaces the per-PR scratch scripts. Offline, reads two files, writes nothing but --json.
//
//   node tools/learncmp.js before.json after.json [--primary hard@300:down] [--cost met@100:-3,know@300:-0.03]
//                          [--looks 1] [--subject coral|fish] [--json out.json]
//   node tools/learncmp.js --list            the measures and the guardrails, their margins and checkpoints
//
// --primary MEASURE@CHECKPOINT:up|down: the one primary measure, its checkpoint and its direction (rule L11). Tested
// pooled over the profiles with a stratified sign-flip test on the (profile, seed) pairs: each pair's difference after -
// before divided by its profile's root mean square difference (so a profile with a large spread does not outweigh the
// others; a scale that a sign flip leaves unchanged keeps the test exact: the statistics study §3.2 standardises by the
// profile's spread), T their sum, p two-sided over every sign pattern up to 20 pairs, else 100,000 draws from a fixed
// seed (as the study and #729 read it). Clear when p <= 0.05 / looks and T goes the declared way. Only then, per profile:
// the paired t's two-sided p, Holm over the profiles.
// --cost MEASURE@CHECKPOINT:BOUND,...: a cost the change is expected to bring, declared before running (rule L11): that
// guardrail is judged against the accepted bound (signed, on the side of harm) instead of its margin, and says so.
// --looks K: the looks declared before running (rule L11, progressive): each look reads the one-sided bound at
// 1 - 0.10 / K and the primary at 0.05 / K (Bonferroni). Default 1: 90% bounds, the primary at 0.05.
// --subject: only for files written before learnsim recorded it (the corals' units met keep their margin of 2 genera).
//
// Guardrails (GUARDRAILS below, LEARNING.md's table): per guardrail, checkpoint and profile, the paired difference after
// - before over the seeds, its one-sided bound on the side of harm (paired t on n - 1 degrees of freedom), and the
// verdict: held when the bound stays inside the margin, breached when the mean itself crosses it, unclear otherwise
// (one step up, rule L11). A guardrail no measure of these files reads is listed as not measured. r: the correlation of
// before and after over the seeds (near 0, the pairing bought nothing: the study §3.1).
const fs = require('fs');
const {signFlip, tQuantile, tCdf} = require('./abilityeval.js');
const {holm} = require('./fieldeval.js');

const num = x => typeof x === 'number' && isFinite(x),
  mean = v => (v.length ? v.reduce((a, x) => a + x, 0) / v.length : NaN),
  sd = v => {
    const m = mean(v);
    return v.length > 1 ? Math.sqrt(v.reduce((a, x) => a + (x - m) ** 2, 0) / (v.length - 1)) : NaN;
  };
// The checkpoint row of a run (learnsim rows: {q, ...} at each checkpoint).
const rowAt = (run, cp) => (run.rows || []).find(r => r.q === cp) || null;
// Mean over the units met at a checkpoint of bar - D* (learnsim's field row f: gs the bar shown, ds the judge's D*).
const overOf = f => {
  if (!f || !f.gs || !f.ds) return null;
  const ks = Object.keys(f.gs).filter(g => num(f.gs[g]) && num(f.ds[g]));
  return ks.length ? mean(ks.map(g => f.gs[g] - f.ds[g])) : null;
};
// The share of photos under ease 4 among the questions 1..cp on a unit under Open Water (learnsim preOW: per question
// [1 if under Open Water, the lowest judged ease shown, 0 for none]); a photo with no judged ease is never one of them
// (model.js RARE). None when no photo of the run has a judged ease (the corals).
const hardShare = (run, cp) => {
  const P = (run.preOW || []).slice(0, cp);
  if (!P.length || !P.some(x => x[1] > 0)) return null;
  const U = P.filter(x => x[0]);
  return U.length ? U.filter(x => x[1] > 0 && x[1] < 4).length / U.length : null;
};
// Every measure learncmp reads, each a function of (run, checkpoint) giving a number or null. kind: 'row' at a learnsim
// checkpoint, 'window' over the questions 1..checkpoint, 'run' over the whole run (checkpoint 'run'). dg: digits shown.
const MEASURES = {
  know: {
    label: 'True knowledge (D*, or knowSlate in the app world)',
    kind: 'row',
    dg: 3,
    get: (r, cp) => {
      const w = rowAt(r, cp);
      return w ? (num(w.dStar) ? w.dStar : num(w.knowSlate) ? w.knowSlate : null) : null;
    }
  },
  over: {label: 'E = bar - D*, units met', kind: 'row', dg: 3, get: (r, cp) => overOf((rowAt(r, cp) || {}).f)},
  met: {label: 'Units met', kind: 'row', dg: 1, get: (r, cp) => (rowAt(r, cp) || {}).met ?? null},
  hard: {label: 'Share under ease 4 before Open Water', kind: 'window', dg: 3, get: hardShare},
  right: {label: 'Right % since the previous checkpoint', kind: 'row', dg: 1, get: (r, cp) => (rowAt(r, cp) || {}).right ?? null},
  prog: {label: "The app's progress %", kind: 'row', dg: 1, get: (r, cp) => (rowAt(r, cp) || {}).prog ?? null},
  thErr: {label: '|Elo - logit(know)|, units met', kind: 'row', dg: 3, get: (r, cp) => (rowAt(r, cp) || {}).thErr ?? null},
  // Measured by learnsim from the measures of ROADMAP "Validation tools", step 2: not in the files yet.
  score: {label: 'The global score as shown', kind: 'row', dg: 1, get: null},
  firstOW: {label: 'Answers to the first unit at Open Water', kind: 'run', dg: 1, get: null},
  unitsOW: {label: 'Units at Open Water', kind: 'row', dg: 1, get: null},
  plateau: {label: 'Longest plateau of the shown score', kind: 'run', dg: 0, get: null}
};
// LEARNING.md "Guardrails and margins": harm -1 when lower is worse, +1 when higher is; the margin is abs, or rel times
// the before mean when larger ("the larger"); coralAbs: the corals' own margin (units met: 2 genera, as before).
const GUARDRAILS = [
  {m: 'know', cps: [300, 600, 1000, 3000], harm: -1, abs: 0.02},
  {m: 'over', cps: [300, 600, 1000, 3000], harm: 1, abs: 0.03},
  {m: 'score', cps: [1000, 3000], harm: -1, abs: 1},
  {m: 'firstOW', cps: ['run'], harm: 1, abs: 10, rel: 0.2},
  {m: 'unitsOW', cps: [300, 1000], harm: -1, abs: 2, rel: 0.05},
  {m: 'plateau', cps: ['run'], harm: 1, abs: 0, rel: 0.2},
  {m: 'hard', cps: [300, 1000], harm: 1, abs: 0.05},
  {m: 'met', cps: [100, 300], harm: -1, abs: 2, rel: 0.05, coralRel: 0}
];
// The margin's size for a guardrail on the before mean b (the larger of abs and rel x |b|).
function marginOf(g, b, subject) {
  const rel = subject === 'coral' && 'coralRel' in g ? g.coralRel : g.rel || 0;
  return Math.max(g.abs || 0, rel * Math.abs(num(b) ? b : 0));
}
// Paired statistics of before / after values (same order): n, the means, the mean difference, its spread and standard
// error, the before/after correlation r, and the one-sided bound at level conf on the side of harm (harm -1: the lower
// bound; +1: the upper), a paired t on n - 1 degrees of freedom.
function paired(B, A, harm, conf = 0.9) {
  const ix = B.map((b, i) => i).filter(i => num(B[i]) && num(A[i])),
    b = ix.map(i => B[i]),
    a = ix.map(i => A[i]),
    d = ix.map(i => A[i] - B[i]),
    n = d.length,
    md = mean(d),
    s = sd(d),
    se = n > 1 ? s / Math.sqrt(n) : NaN,
    t = n > 1 ? tQuantile(conf, n - 1) : NaN,
    sb = sd(b),
    sa = sd(a),
    r = n > 2 && sb > 0 && sa > 0 ? b.reduce((x, v, i) => x + (v - mean(b)) * (a[i] - mean(a)), 0) / (n - 1) / sb / sa : NaN;
  return {n, before: mean(b), after: mean(a), d: md, sd: s, se, r, bound: n > 1 ? md + harm * t * se : NaN, worse: d.filter(x => harm * x > 0).length};
}
// held / unclear / breached for a guardrail with margin size M on the side of harm (rule L11).
function verdict(p, harm, M) {
  if (!p.n) return 'not measured';
  if (harm * p.d > M) return 'breached';
  if (num(p.bound) && harm * p.bound <= M) return 'held';
  return 'unclear';
}
// The stratified sign-flip test of the primary (above): pairs [{profile, d}], two-sided p.
function stratSignFlip(pairs, {exact = 20, draws = 100000, seed = 1} = {}) {
  const by = {};
  pairs.forEach(x => (by[x.profile] = by[x.profile] || []).push(x.d));
  const rms = Object.fromEntries(Object.entries(by).map(([k, v]) => [k, Math.sqrt(mean(v.map(x => x * x)))])),
    z = pairs.map(x => (rms[x.profile] > 0 ? x.d / rms[x.profile] : 0)),
    T = z.reduce((a, x) => a + x, 0),
    sf = signFlip(z, {exact, draws, seed});
  return {n: z.length, T, p: sf.p, exact: sf.exact, draws: sf.draws};
}
// MEASURE@CHECKPOINT (checkpoint a number or 'run').
function parseAt(s) {
  const m = /^(\w+)@(\d+|run)$/.exec(s || '');
  if (!m || !MEASURES[m[1]]) throw new Error(`bad measure ${s}: MEASURE@CHECKPOINT, MEASURE one of ${Object.keys(MEASURES).join(', ')}`);
  return [m[1], m[2] === 'run' ? 'run' : Number(m[2])];
}
const key = (m, cp) => `${m}@${cp}`;

// The two files compared: {settings, pairs, profiles, guardrails: [...], primary}.
function compare(B, A, {primary = null, costs = {}, looks = 1, subject = null} = {}) {
  const subj = A.subject || B.subject || subject;
  if (!subj) throw new Error('the files do not say their subject (learnsim before it recorded it): pass --subject coral or fish');
  const conf = 1 - 0.1 / looks,
    alpha = 0.05 / looks,
    idx = F => new Map((F.runs || []).map(r => [`${r.profile}:${r.seed}`, r])),
    IB = idx(B),
    IA = idx(A),
    keys = [...IB.keys()].filter(k => IA.has(k)),
    // The profiles in the file's own order (learnsim --profiles), then any other.
    profiles = [...new Set([...Object.keys(B.profiles || {}), ...keys.map(k => IB.get(k).profile)])].filter(p => keys.some(k => IB.get(k).profile === p)),
    only = [...IB.keys()].filter(k => !IA.has(k)).concat([...IA.keys()].filter(k => !IB.has(k)));
  // The settings that should match for a paired comparison (a change under test may differ on purpose: shown, not refused).
  const SET = ['subject', 'questions', 'seeds', 'seed0', 'learnerKind', 'tau', 'truth', 'stats', 'sheetv', 'world'],
    differ = SET.filter(k => JSON.stringify(B[k] ?? null) !== JSON.stringify(A[k] ?? null)).map(k => `${k} ${JSON.stringify(B[k] ?? null)} / ${JSON.stringify(A[k] ?? null)}`);
  const reach = (F, m, cp) => {
    const M = MEASURES[m];
    if (cp === 'run') return M.kind === 'run';
    if (M.kind === 'window') return (F.questions || 0) >= cp;
    return M.kind === 'row' && (F.checkpoints || []).includes(cp);
  };
  const cell = (m, cp, harm, prof) => {
    const K = keys.filter(k => IB.get(k).profile === prof),
      g = MEASURES[m].get;
    return paired(
      K.map(k => g(IB.get(k), cp)),
      K.map(k => g(IA.get(k), cp)),
      harm,
      conf
    );
  };
  const guardrails = GUARDRAILS.map(G => {
    const M = MEASURES[G.m],
      cps = G.cps.filter(cp => reach(B, G.m, cp) && reach(A, G.m, cp));
    // A checkpoint counts as measured only where some profile has a valid pair (Codex review #782: a measure every run
    // gives null for, coral photos with no judged ease or a file without preOW, is not measured, never "held").
    const at = (M.get ? cps : [])
      .map(cp => {
        const cost = costs[key(G.m, cp)],
          per = profiles.map(prof => {
            const p = cell(G.m, cp, G.harm, prof),
              Msize = num(cost) ? G.harm * cost : marginOf(G, p.before, subj);
            return {profile: prof, ...p, margin: G.harm * Msize, cost: num(cost), verdict: verdict(p, G.harm, Msize)};
          });
        return {cp, per};
      })
      .filter(a => a.per.some(x => x.n > 0));
    return {m: G.m, label: M.label, harm: G.harm, measured: at.length > 0, at};
  });
  let prim = null;
  if (primary) {
    const [m, cp] = primary.at,
      dir = primary.dir === 'up' ? 1 : -1,
      g = MEASURES[m].get;
    if (!g) throw new Error(`${m} is not in learnsim's files yet`);
    if (!(reach(B, m, cp) && reach(A, m, cp))) throw new Error(`${key(m, cp)}: a checkpoint the files do not both reach`);
    const P = keys
        .map(k => ({profile: IB.get(k).profile, b: g(IB.get(k), cp), a: g(IA.get(k), cp)}))
        .filter(x => num(x.b) && num(x.a))
        .map(x => ({...x, d: x.a - x.b})),
      sf = stratSignFlip(P),
      clear = sf.p <= alpha && dir * sf.T > 0;
    const per = profiles.map(prof => {
      const p = paired(
          P.filter(x => x.profile === prof).map(x => x.b),
          P.filter(x => x.profile === prof).map(x => x.a),
          -dir,
          conf
        ),
        tt = p.n > 1 ? (p.se > 0 ? p.d / p.se : p.d === 0 ? 0 : Math.sign(p.d) * Infinity) : NaN,
        pt = num(tt) ? 2 * (1 - tCdf(Math.abs(tt), p.n - 1)) : tt === 0 ? 1 : p.n > 1 ? 0 : NaN;
      return {profile: prof, ...p, way: P.filter(x => x.profile === prof && dir * x.d > 0).length, pt};
    });
    const ph = holm(per.map(x => x.pt));
    per.forEach((x, i) => {
      x.holm = clear ? ph[i] : null;
      x.clear = clear && ph[i] <= alpha && dir * x.d > 0;
    });
    prim = {m, cp, dir: primary.dir, label: MEASURES[m].label, alpha, ...sf, way: P.filter(x => dir * x.d > 0).length, clear, per};
  }
  return {subject: subj, looks, conf, alpha, pairs: keys.length, profiles, only, differ, guardrails, primary: prim};
}

// The report, Markdown ready for a PR.
function report(R, nameB = 'before', nameA = 'after') {
  const f = (x, dg) => (num(x) ? (x >= 0 ? '+' : '') + x.toFixed(dg) : x === Infinity ? '+inf' : x === -Infinity ? '-inf' : '-'),
    v = (x, dg) => (num(x) ? x.toFixed(dg) : '-'),
    pv = p => (!num(p) ? '-' : p < 1e-3 ? p.toExponential(1) : p.toFixed(4)),
    L = [];
  L.push(`Paired comparison: ${nameB} -> ${nameA}, ${R.subject}, ${R.pairs} pairs (${R.profiles.join(', ')})`);
  L.push(`Looks declared: ${R.looks} (one-sided bounds at ${(100 * R.conf).toFixed(1)}%, the primary at ${R.alpha.toFixed(4)})`);
  if (R.differ.length) L.push(`Settings that differ: ${R.differ.join('; ')}`);
  if (R.only.length) L.push(`Runs in one file only, left out: ${R.only.join(', ')}`);
  if (R.primary) {
    const P = R.primary,
      dg = MEASURES[P.m].dg;
    L.push('');
    L.push(`**Primary: ${P.label}, ${key(P.m, P.cp)}, ${P.dir}** (declared before running)`);
    L.push(
      `Pooled stratified sign-flip: T ${f(P.T, 2)}, p ${pv(P.p)} two-sided (${P.exact ? 'exact, ' + P.draws + ' patterns' : P.draws + ' draws'}), ${P.way} of ${P.n} pairs ${P.dir}: ` +
        (P.clear ? `**clear (${P.dir})**` : P.p <= P.alpha ? 'significant against the declared direction: no claim' : 'no clear difference')
    );
    L.push('');
    L.push('| Profile | Before -> after | Paired difference | Pairs ' + P.dir + ' | Paired t p | Holm | Verdict |');
    L.push('|---|---|---|---|---|---|---|');
    P.per.forEach(x =>
      L.push(
        `| ${x.profile} | ${v(x.before, dg)} -> ${v(x.after, dg)} | ${f(x.d, dg)} | ${x.way}/${x.n} | ${pv(x.pt)} | ${x.holm === null ? 'not tested (pooled not clear)' : pv(x.holm)} | ${x.clear ? 'clear' : x.holm === null ? '-' : 'no clear difference'} |`
      )
    );
  }
  L.push('');
  L.push(`**Guardrails** (one-sided ${(100 * R.conf).toFixed(1)}% bound of the paired difference on the side of harm; cell: before -> after, difference [bound], verdict)`);
  L.push('');
  L.push(`| Guardrail | At | Margin | ${R.profiles.join(' | ')} |`);
  L.push(`|---|---|---|${R.profiles.map(() => '---|').join('')}`);
  const bad = [],
    none = [];
  R.guardrails.forEach(G => {
    if (!G.measured) return none.push(G.label);
    const dg = MEASURES[G.m].dg;
    G.at.forEach(({cp, per}) => {
      const ms = [...new Set(per.map(x => f(x.margin, dg) + (x.cost ? ' (cost declared)' : '')))];
      L.push(
        `| ${G.label} | ${cp} | ${ms.length === 1 ? ms[0] : per.map(x => f(x.margin, dg)).join(' / ')} | ` +
          per
            .map(x => {
              if (x.verdict === 'not measured') none.push(`${G.label} at ${cp} for ${x.profile}`);
              else if (x.verdict !== 'held') bad.push(`${G.m}@${cp} ${x.profile}: ${x.verdict}`);
              return x.n ? `${v(x.before, dg)} -> ${v(x.after, dg)}, ${f(x.d, dg)} [${f(x.bound, dg)}] ${x.verdict}` : '-';
            })
            .join(' | ') +
          ' |'
      );
    });
  });
  L.push('');
  L.push(
    bad.length
      ? `Not held: ${bad.join('; ')} (unclear: one step up; breached, or a cost not declared: to Pierre; rule L11).`
      : none.length
        ? 'Every guardrail cell measured is held (some are not measured: below).'
        : 'Every guardrail measured is held.'
  );
  if (none.length) L.push(`Not measured by these files: ${none.join('; ')}.`);
  return L.join('\n');
}

function list() {
  const L = ['Measures (MEASURE for --primary and --cost; row: at a learnsim checkpoint, window: questions 1..N, run: the whole run):'];
  Object.entries(MEASURES).forEach(([k, M]) => L.push(`  ${k.padEnd(8)} ${M.kind.padEnd(6)} ${M.label}${M.get ? '' : ' (not in the files yet)'}`));
  L.push('Guardrails (LEARNING.md "Guardrails and margins"):');
  GUARDRAILS.forEach(G =>
    L.push(
      `  ${G.m.padEnd(8)} at ${G.cps.join(', ')}; harm ${G.harm < 0 ? 'lower' : 'higher'}; margin ${G.abs || 0}${G.rel ? ` or ${100 * G.rel}% of the before mean, the larger` : ''}${'coralRel' in G ? ' (corals: ' + G.abs + ')' : ''}`
    )
  );
  return L.join('\n');
}

module.exports = {MEASURES, GUARDRAILS, marginOf, paired, verdict, stratSignFlip, parseAt, compare, report, hardShare, overOf};

if (require.main === module) {
  const args = process.argv.slice(2),
    opt = k => {
      const i = args.indexOf('--' + k);
      return i >= 0 ? args[i + 1] : undefined;
    },
    files = args.filter((a, i) => !a.startsWith('--') && !(i && args[i - 1].startsWith('--')));
  if (args.includes('--list')) {
    console.log(list());
    process.exit(0);
  }
  if (files.length !== 2) {
    console.log('node tools/learncmp.js before.json after.json [--primary hard@300:down] [--cost met@100:-3] [--looks 1] [--json out.json] | --list');
    process.exit(1);
  }
  const P = opt('primary'),
    pm = P && /^(.+):(up|down)$/.exec(P);
  if (P && !pm) throw new Error('--primary MEASURE@CHECKPOINT:up|down');
  const costs = Object.fromEntries(
      (opt('cost') || '')
        .split(',')
        .filter(Boolean)
        .map(c => {
          const m = /^(.+):(-?[\d.]+)$/.exec(c);
          if (!m) throw new Error('--cost MEASURE@CHECKPOINT:BOUND');
          const at = parseAt(m[1]),
            G = GUARDRAILS.find(g => g.m === at[0]);
          if (!G || G.harm * Number(m[2]) <= 0) throw new Error(`--cost ${c}: a guardrail's accepted bound, on its side of harm`);
          return [key(...at), Number(m[2])];
        })
    ),
    looks = Number(opt('looks') || 1);
  if (!(looks >= 1 && Number.isInteger(looks))) throw new Error('--looks 1, 2, ...');
  const [B, A] = files.map(f => JSON.parse(fs.readFileSync(f, 'utf8'))),
    R = compare(B, A, {primary: pm ? {at: parseAt(pm[1]), dir: pm[2]} : null, costs, looks, subject: opt('subject') || null});
  console.log(report(R, `${files[0]} (${B.commit || '?'})`, `${files[1]} (${A.commit || '?'})`));
  if (opt('json')) fs.writeFileSync(opt('json'), JSON.stringify(R, null, 1));
}
