// The check tools' time budget and level 3's gate (rule L11; Pierre, Q405 2026-11-18 and Q415 2026-11-19; LEARNING.md
// "Validating a learning change", "The cap"). Shared by tools/learnsim.js (both worlds); tests/checkbudget.test.js runs
// it on a fake clock.
//
// - A check plans its jobs, estimates their time (a short calibration run, or a per-job time given with --per-job),
//   refuses to start when the estimate is over the budget (saying which options would fit), and stops cleanly at the
//   budget with the runs it has, marked as cut (`cut` in --out, a banner in the printout, learncmp repeats it).
// - The budget is 40 minutes of compute at every level, on every machine; `--budget MIN` asks for less, never more. The
//   clock starts when the compute does (after the machine slot is held), calibration included.
// - Level 3 (more than 20 seeds, or more than 10,000 answers in the rated world: LEARNING.md's level-2 ceilings) runs
//   only with Pierre's explicit go, `--pierre-go "Q512, 2026-11-20"` (the reference of his go: a Q number or message, and the date), and only on a GitHub runner
//   (GITHUB_ACTIONS=true); anywhere else the tool prints the command that dispatches it there.
'use strict';

const MAX_MIN = 40;
// Level 2's ceilings (LEARNING.md): 10 seeds, 20 when a result is near a margin; 3,000 answers, 10,000 when the change
// reaches genera, species or the score's shape. Above either, the check is level 3.
const LEVEL2 = {seeds: 20, answers: 10000};

// The calibration run cannot be stopped once begun (a few seconds to a minute on a loaded machine): a budget under this
// needs --per-job, so the calibration alone cannot overrun it.
const CALIBRATION_FLOOR_MIN = 1;

// --budget MIN: minutes of compute, more than 0 and at most MAX_MIN; absent, MAX_MIN.
function parseBudget(v) {
  if (v === undefined || v === null) return MAX_MIN;
  const m = Number(v);
  if (!(m > 0) || !isFinite(m)) throw new Error(`--budget ${v}: minutes, a number above 0`);
  if (m > MAX_MIN) throw new Error(`--budget ${v}: a check never runs more than ${MAX_MIN} minutes (rule L11); give ${MAX_MIN} or less`);
  return m;
}

// The wall-clock budget. now, setTimer and clearTimer are injectable (the tests' fake clock).
class Budget {
  constructor(minutes = MAX_MIN, {now = Date.now, setTimer = setTimeout, clearTimer = clearTimeout} = {}) {
    this.minutes = minutes;
    this.now = now;
    this.setTimer = setTimer;
    this.clearTimer = clearTimer;
    this.t0 = now();
    this.cut = false;
  }
  elapsedMs() {
    return this.now() - this.t0;
  }
  leftMs() {
    return Math.max(0, this.minutes * 60000 - this.elapsedMs());
  }
  expired() {
    return this.leftMs() <= 0;
  }
  // Calls fn once when the budget is spent; returns a function that cancels it.
  arm(fn) {
    const id = this.setTimer(fn, this.leftMs());
    if (id && id.unref) id.unref();
    return () => this.clearTimer(id);
  }
}

// Seconds for `jobs` jobs of perJobSec each on `workers` workers (waves of workers jobs).
const estimate = (jobs, workers, perJobSec) => Math.ceil(jobs / Math.max(1, workers)) * perJobSec;
// A job's time at length N, from a calibration of sec seconds at length N0 (time grows with the length: a straight line
// through the origin; the hard stop covers the rest).
const scaled = (sec, N0, N) => (sec * N) / N0;

// The options that would fit in leftSec: {flag, value} for fewer seeds, a shorter run, fewer profiles. P profiles x S
// seeds (perSeed jobs a seed: P, or 1 for the sheet's population), N answers or questions, perJobSec a job's time at N.
function fitOptions({P, S, N, perSeed = P, perJobSec, workers, leftSec, lengthFlag = 'questions'}) {
  const out = [],
    cap = Math.floor(leftSec / perJobSec) * workers; // jobs that fit at the full length
  const s = Math.floor(cap / perSeed);
  if (s >= 1 && s < S) out.push({flag: '--seeds', value: s});
  const waves = Math.ceil((perSeed * S) / workers);
  let n = Math.floor((N * leftSec) / (waves * perJobSec));
  if (n >= 200) n = Math.floor(n / 100) * 100;
  if (n >= 1 && n < N) out.push({flag: `--${lengthFlag}`, value: n});
  if (perSeed === P) {
    const p = Math.floor(cap / S);
    if (p >= 1 && p < P) out.push({flag: '--profiles', value: `the first ${p} of the ${P}`});
  }
  return out;
}

const minText = sec => `${(sec / 60).toFixed(sec < 600 ? 1 : 0)} min`;

// The plan against what is left of the budget: {ok, estSec, text}. text is the line to print (the refusal lists the options).
function plan({budget, jobs, workers, perJobSec, P, S, N, perSeed, lengthFlag, source}) {
  const leftSec = budget.leftMs() / 1000,
    estSec = estimate(jobs, workers, perJobSec),
    head = `Plan: ${jobs} jobs on ${workers} workers, ${perJobSec.toFixed(1)} s a job (${source}); estimated ${minText(estSec)} of the ${budget.minutes}-minute budget (${minText(leftSec)} left).`;
  if (estSec <= leftSec) return {ok: true, estSec, text: head};
  const opts = fitOptions({P, S, N, perSeed, perJobSec, workers, leftSec, lengthFlag}),
    list = opts.length ? opts.map(o => `${o.flag} ${o.value}`).join(', or ') : 'none: even one seed of one profile does not fit';
  return {
    ok: false,
    estSec,
    text:
      `${head}\nRefused: the estimate is over the budget (rule L11: a check never runs more than ${MAX_MIN} minutes).\n` +
      `Options that would fit: ${list}.\n` +
      "LEARNING.md's level-2 figures are minimums: if no option keeps them, split the check or narrow its worlds to the ones the change touches (rule L11); never lower them to fit."
  };
}

// Runs jobs (an array, consumed) on `workers` loops: exec(job, worker) resolves to a result. When the budget is spent
// the pool stops dispatching, calls onCut() (to kill what is in flight: close the browser, terminate the threads), and
// returns what it has: {results, cut, left} (left: the jobs not finished, in flight ones included). onResult(result) is
// called as each finishes.
async function runPool({jobs, workers, exec, onCut, budget, onResult}) {
  const results = [],
    total = jobs.length;
  let disarm = () => {};
  const loops = Array.from({length: Math.max(1, Math.min(workers, total))}, async (_, w) => {
      for (let j; !budget.cut && (j = jobs.shift()); ) {
        let r;
        try {
          r = await exec(j, w);
        } catch (e) {
          if (budget.cut) return; // killed by the cut
          throw e;
        }
        results.push(r);
        if (onResult) onResult(r, results.length);
      }
    }),
    cutP = new Promise(ok => {
      disarm = budget.arm(() => {
        budget.cut = true;
        Promise.resolve(onCut && onCut()).then(ok, ok);
      });
    }),
    done = Promise.all(loops).then(() => 'done');
  const how = await Promise.race([done, cutP.then(() => 'cut')]);
  disarm();
  if (how === 'cut') loops.forEach(p => p.catch(() => {})); // the killed jobs' rejections
  const finished = how === 'done';
  return {results, cut: !finished, left: total - results.length};
}

// What --out stores and the printout shows for a run that ran to its end or was cut.
function cutInfo(budget, planned, done) {
  return budget.cut ? {cut: true, budgetMin: budget.minutes, elapsedMin: +(budget.elapsedMs() / 60000).toFixed(1), planned, done} : null;
}
const cutBanner = c =>
  `*** CUT at the ${c.budgetMin}-minute budget: ${c.done} of ${c.planned} runs done. The figures rest on those runs only: a partial result, never a verdict that needs the declared seeds (rule L11). ***`;

// Level 3: why this run is one (a string), or null. world 'rated' or 'app'.
function level3Reason({world, seeds, N}) {
  if (seeds > LEVEL2.seeds) return `${seeds} seeds (level 2 stops at ${LEVEL2.seeds})`;
  if (world === 'rated' && N > LEVEL2.answers) return `${N} answers (level 2 stops at ${LEVEL2.answers.toLocaleString('en-US')})`;
  return null;
}

// The command that dispatches the check on a GitHub runner (learncheck.yml); Pierre's go is quoted in pierre_go.
function dispatchCommand({subject, world, seeds, N}) {
  return (
    'gh workflow run learncheck.yml -f after=<branch> -f before=main' +
    ` -f subject=${subject} -f world=${world} -f seeds=${seeds} -f ${world === 'rated' ? 'answers' : 'questions'}=${N}` +
    " -f primary=<MEASURE@CHECKPOINT:up|down> -f pierre_go='<the reference of Pierre's go: a Q number or message, and the date>'"
  );
}

// null when the run may go on; else the refusal text. runner: GITHUB_ACTIONS=true; go: --pierre-go's value.
function level3Gate({reason, go, runner, subject, world, seeds, N}) {
  if (!reason) return null;
  if (!runner)
    return (
      `Level 3 (${reason}) never runs on this machine (rule L11): only with Pierre's explicit go, on a GitHub runner, its duration announced first.\n` +
      `Dispatch it there once he has said go (the reference of his go, a Q number or message and the date, in pierre_go):\n  ${dispatchCommand({subject, world, seeds, N})}`
    );
  if (!go || !String(go).trim())
    return `Level 3 (${reason}) needs Pierre's explicit go (rule L11): pass --pierre-go "Q number or message, date" (the reference of his go). Nothing ran.`;
  return null;
}

module.exports = {MAX_MIN, CALIBRATION_FLOOR_MIN, LEVEL2, parseBudget, Budget, estimate, scaled, fitOptions, plan, runPool, cutInfo, cutBanner, level3Reason, level3Gate, dispatchCommand};
