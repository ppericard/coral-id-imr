// The shareFree arm (REE-11, ROADMAP "learnsim: long runs crash, and the genus share"; docs/reviews/2026-11-21-sharefree-arm.md).
// Read-only study: the rated world (tools/ratedworld.js), fish, --app truth, learner count, paired seeds, two arms:
//   free  - today's code: app.js shareFree leaves an IMR player's IMR genera (and a set turned on by hand early) outside
//           the rank share (model.js sharesNow free);
//   empty - the same world with shareFree returning [] (every unit with a parent in the game is under the rank share).
// The arm is made by wrapping vm.createContext before tools/ratedworld.js is loaded: the engine's context (the one object
// holding shareFree) gets shareFree () => [] when the worker runs the empty arm. Nothing in the app or the tools changes.
//
//   node tools/studies/sharefree/arm.js [--seeds 10] [--questions 3000] [--profiles lectureRA,beginner] [--workers 4]
//                                       [--budget 40] [--out file.json]
// Per run: each answer's unit kind (f family, g scientific genus under the offer, a auto IMR genus, s species by common
// name, x species by scientific name), advAt / owAt, the checkpoint rows, and the size of the free set seen by the engine
// (a check that the arm took). Takes the machine slot (tests/slot.js, rule W24); stops at the budget (40 minutes at most,
// rule L11) with the runs it has.
'use strict';
const path = require('path'),
  fs = require('fs'),
  vm = require('vm'),
  {Worker, isMainThread, workerData, parentPort} = require('worker_threads');
const ROOT = path.join(__dirname, '..', '..', '..');

// The arm's switch, before ratedworld.js is required (it keeps a reference to the vm module, whose createContext this
// replaces for this process only).
let EMPTY = false;
const cc0 = vm.createContext;
vm.createContext = (o, ...a) => {
  if (EMPTY && o && typeof o.shareFree === 'function') o.shareFree = () => [];
  return cc0.call(vm, o, ...a);
};
const RW = require(path.join(ROOT, 'tools', 'ratedworld.js'));

function runJob({arm, profile, seed, N}) {
  EMPTY = arm === 'empty';
  const U = RW.unitsOf('fish'),
    W = RW.world(U, seed, 'normal'),
    cps = RW.checkpoints(N),
    pl = RW.playerOf(U, W, {profile, seed, N, cps, app: 'truth', learner: 'count'}),
    ctx = pl.ctx,
    G = pl.G,
    sp = new Set(U.sp || []),
    ssp = new Set(U.ssp || []),
    ex = new Set(U.extra),
    kindOf = n => (sp.has(n) ? 's' : ssp.has(n) ? 'x' : ex.has(n) ? (G[n].imrg && ctx.imrSaid() ? 'a' : 'g') : 'f'),
    seq = [];
  let freeMax = 0;
  for (let i = 0; i < N; i++) {
    const q = pl.step(i);
    seq.push(kindOf(q.t));
    if (i % 50 === 49) freeMax = Math.max(freeMax, ctx.shareFree().length);
  }
  const r = pl.result();
  return {
    arm,
    profile,
    seed,
    N,
    freeMax,
    seq: seq.join(''),
    advAt: r.advAt,
    owAt: r.owAt,
    kinds: Object.fromEntries(Object.keys(r.kinds).map(n => [n, kindOf(n)])),
    rows: r.rows.map(x => ({q: x.q, right: x.right, met: x.met, score: x.score.pct, fam: (x.kinds.family || {}).adv}))
  };
}

if (!isMainThread && workerData === 'sharefree')
  parentPort.on('message', j => {
    try {
      parentPort.postMessage(runJob(j));
    } catch (e) {
      parentPort.postMessage({...j, error: String((e && e.stack) || e)}); // one failed run is kept as such, never loses the others
    }
  });
else if (isMainThread) main();

async function main() {
  require(path.join(ROOT, 'tests', 'slot.js')).guard('tools/studies/sharefree/arm.js');
  const arg = (k, d) => {
      const i = process.argv.indexOf('--' + k);
      return i > 0 ? process.argv[i + 1] : d;
    },
    SEEDS = +arg('seeds', 10),
    N = +arg('questions', 3000),
    PROFILES = arg('profiles', 'lectureRA').split(','),
    WORKERS = +arg('workers', 4),
    BUDGET = Math.min(40, +arg('budget', 40)),
    OUT = arg('out', null),
    t0 = Date.now(),
    jobs = [];
  for (let s = 1; s <= SEEDS; s++) for (const profile of PROFILES) for (const arm of ['free', 'empty']) jobs.push({arm, profile, seed: s, N});
  const commit = require('child_process').execFileSync('git', ['rev-parse', '--short', 'HEAD'], {cwd: ROOT}).toString().trim(),
    runs = [],
    save = cut => OUT && fs.writeFileSync(OUT, JSON.stringify({date: new Date().toISOString(), commit, seeds: SEEDS, questions: N, profiles: PROFILES, seconds: (Date.now() - t0) / 1000, cut, partial: !cut && runs.length < SEEDS * PROFILES.length * 2, runs})),
    ws =Array.from({length: Math.min(WORKERS, jobs.length)}, () => new Worker(__filename, {workerData: 'sharefree'})),
    deadline = t0 + BUDGET * 60000;
  let cut = false;
  const all = Promise.all(
      ws.map(
        w =>
          new Promise(done => {
            const next = () => {
              if (!jobs.length || Date.now() > deadline) return done();
              const j = jobs.shift();
              w.once('message', r => {
                runs.push(r);
                save(false); // on each result: a run killed later keeps what it has
                process.stderr.write(`\r${runs.length} runs, ${Math.round((Date.now() - t0) / 1000)} s `);
                next();
              });
              w.postMessage(j);
            };
            next();
          })
      )
    ),
    timer = new Promise(done => setTimeout(() => ((cut = true), done()), Math.max(0, deadline - Date.now())).unref());
  await Promise.race([all, timer]);
  await Promise.all(ws.map(w => w.terminate())); // the jobs in flight at the budget go with the threads
  if (jobs.length) cut = true;
  save(cut);
  const bad = runs.filter(r => r.error);
  bad.forEach(r => console.error(`failed: ${r.arm} ${r.profile} seed ${r.seed}: ${r.error.split('\n')[0]}`));
  console.error(`\n${runs.length} runs (${bad.length} failed) in ${((Date.now() - t0) / 1000).toFixed(0)} s${cut ? ', CUT at the budget' : ''}`);
}
