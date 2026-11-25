// REE-193's refit: the aggregates of one run directory, the file committed beside the review (tools/studies/q316/refit/
// README section in tools/studies/q316/README.md). Reads the run's outputs (outside the repository) and keeps only
// subject-level figures: the counts, the SDs and fixed effects with their intervals and verdicts, the acceptance tests'
// figures, 2C's statistics, the Gibbs sampler's posteriors and diagnostics, 2B's comparisons. No row, no player label,
// no per-unit effect.
//
//   node tools/studies/q316/refit/summarise.js <run dir> <out.json> [<cut-log run dir>]
//
// <cut-log run dir>: the reference fits (fit.py --no-accept) of the log cut at an earlier extract's last answer
// (refit/cut.js), to tell the data's growth from the code's changes.
const fs = require('fs'),
  path = require('path');

const read = f => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null);
const r3 = x => (typeof x === 'number' ? Math.round(x * 1000) / 1000 : Array.isArray(x) ? x.map(r3) : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, r3(v)])) : x);

// 2B's comparisons without their per-player lines (labels and differences).
const noPer = x => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).filter(([k]) => k !== 'per').map(([k, v]) => [k, noPer(v)])) : x);

function fitPart(F) {
  if (!F) return null;
  const strip = f => f && {sd: f.sd, fixed: f.fixed, converged: f.converged, seconds: f.seconds};
  const acc = A => A && {done: A.done, reps: A.reps, values: A.values};
  return {
    answers: F.answers,
    players: F.players,
    cut: F.cut,
    minutes: F.minutes,
    fit: strip(F.fit),
    accept_rated: acc(F.accept_rated),
    accept_own: acc(F.accept_own),
    report: F.report,
    fit_shared: strip(F.fit_shared),
    accept_shared: F.accept_shared && {rated: acc(F.accept_shared.rated), own: acc(F.accept_shared.own)},
    report_shared: F.report_shared,
    shares: F.shares
  };
}

function gibbsPart(G) {
  if (!G) return null;
  const acc = A => A && {done: A.done, reps: A.reps, seconds_per_chain: A.seconds_per_chain, values: A.values};
  return {
    answers: G.answers,
    cut: G.cut,
    minutes: G.minutes,
    steps: G.steps,
    chain: G.chain,
    prior: G.prior,
    converge: G.converge,
    fit: G.fit,
    accept_rated: acc(G.accept_rated),
    accept_own: acc(G.accept_own),
    fit_other_prior: G.fit_other_prior,
    report: G.report,
    design: G.design,
    accept: acc(G.accept)
  };
}

function summarise(dir, cutDir) {
  const f = n => path.join(dir, n);
  const out = {};
  for (const s of ['coral', 'fish']) {
    const C = read(f(`checks-${s}.json`)),
      B = read(f(`2b-${s}.json`)),
      ref = read(f(`ref-${s}.json`)),
      cut = cutDir ? read(path.join(cutDir, `ref-${s}.json`)) : null;
    out[s] = {
      reference_fit: ref && ref.fit && {sd: ref.fit.sd, fixed: ref.fit.fixed},
      reference_fit_on_the_cut_log: cut && cut.fit && {answers: cut.answers, sd: cut.fit.sd, fixed: cut.fit.fixed},
      fit: fitPart(read(f(`fit-${s}.json`))),
      sibling: fitPart(read(f(`sib-${s}.json`))),
      centring: C && C.centring,
      gibbs: gibbsPart(read(f(`gibbs-${s}.json`))),
      replay2b:
        B &&
        Object.fromEntries(
          ['logCheck', 'primary', 'allFish', 'genusRank', 'corals', 'armLog', 'arm4b', 'arm4c', 'compression']
            .filter(k => B[k])
            .map(k => [k, noPer(B[k])])
        )
    };
  }
  for (const d of ['fish', 'coral', 'fish-rich', 'coral-large']) {
    const G = read(f(`gibbs-synth-${d}.json`));
    if (G) (out.gibbs_synth = out.gibbs_synth || {})[d] = gibbsPart(G);
  }
  return r3(out);
}

module.exports = {summarise};

if (require.main === module) {
  const [DIR, OUT, CUT] = process.argv.slice(2);
  if (!DIR || !OUT) {
    console.error('usage: node tools/studies/q316/refit/summarise.js <run dir> <out.json> [<cut-log run dir>]');
    process.exit(2);
  }
  fs.writeFileSync(OUT, JSON.stringify(summarise(DIR, CUT), null, 1) + '\n');
  console.log('written ' + path.basename(OUT));
}
