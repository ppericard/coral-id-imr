// The global fish score's formula on simulated players (docs/FISH_PATH.md "My progress (fish)", approved by Pierre on
// 2026-11-04; docs/LEARNING.md "Fish: the global score, simulated"). The formula is not in the app yet (the species
// level is not built); this tool checks it before it ships, as the design asks (rule L11): the 80 / 85 / 100% anchors,
// the entries' 25% share, the genus's half credit, and no long plateau on the curve. Not run by CI (numbers for
// reading); tests/fishscore.test.js checks the anchors.
//
//   node tools/fishscore.js [--seeds 5] [--answers 120000] [--names tools/fish_common.json] [--json out.json]
//
// The formula (FISH_PATH, unchanged here):
// - units, each with the progress engine's mastery m (0 to 1, the bar: core.js scoreOf over the moving average pgStep,
//   1 once the unit's exam is passed): each circle-1 entry (family), each scientific genus (the first word of the PDF
//   name), each species by scientific name, each listed common name of a species (1 to 3; --names: a file of proposed
//   lists, {species: {sNNN: {names: [...]}}}; without it one name each, fish.json `common`);
// - per species: C = the mean mastery of its listed common names, S = max(species mastery, ½ × its genus's mastery),
//   credit = a·C + b·S + (1 − a − b)·C·S, b = 0.80, a = 11/15 (≈ 0.73: the value that puts "every common name" on 80%);
// - global = 25% × the entries' mean mastery + 75% × the mean credit of every circle-1 species (unopened units at 0).
//
// Part A, fixed states: what a player who knows a given set of units (mastery 1, the rest 0) scores, exactly.
// Part B, simulated players: a deliberately simple model of the path (not the app: the species level is not built, so
// tools/learnsim.js, which drives the real app, cannot play it yet), the same seeds for every variant:
// - the tree (FISH_PATH "Levels"): entries are the trunk; an entry's species common names (branch A) and its scientific
//   genera (branch B) become eligible when the entry reaches Advanced (bar 0.8, model.js LV_AT); a species' scientific
//   name when its genus reaches Advanced, and, for a player learning both names, when the species' common names are
//   half-way (the name-display schedule shows the scientific name from progress 0.5);
// - opening: one unit at a time, the next eligible one in the data's order (entries: the starter core, then fish.json
//   order; species: commonness order, `cmi`), while fewer than OPEN_SHAKY open units are under 0.5 on the bar (the
//   app's "new units only while few are shaky", model.js OPEN); a first-meeting card teaches like one right answer;
// - the question: an open unit drawn with weight (1 − bar) + FLOOR (weak units first, learned ones still come back);
// - the learner: a true chance k per unit; right with probability k; feedback teaches, k += R × (1 − k) after a right
//   answer, R × MISS × (1 − k) after a miss; R per kind of unit (RATE: a scientific name is learned more slowly than a
//   common one, Pierre 2026-11-03: "Latin is harder"); a species' scientific k starts at GENUS_HELP × its genus's k;
// - the progress engine is the app's own: core.js pgStep (A 0.15, every answer weighing 1: look-alikes in play) and
//   scoreOf; the exam: from PROG.M, EXAM_N right answers in a row on the unit pass it (a miss restarts it), kept while
//   mxKeeps holds.
// Measures per profile (mean ± sd over the seeds): the score and its three parts (entries; common names, the mean C;
// scientific names, the mean S) at checkpoints; the answer at which the score reaches 25 / 50 / 75 / 80 / 85 / 95%;
// the entries' share of the score when every entry is at Advanced; plateaus (the answers each point of the score takes,
// the median and the longest, from 26% to 95% of the profile's ceiling); and, for the scientific-names profile, the
// same seeds without the genus's half credit. Two profiles learn one kind of names, then turn the other on (`then`)
// once every name of the first kind is known.

'use strict';
const fs = require('fs');
const path = require('path');
const CORE = require(path.join(__dirname, '..', 'core.js'));

const ROOT = path.join(__dirname, '..');
const B_SCI = 0.8; // b: every scientific name, no common name → 25 + 75 × 0.8 = 85%
const A_COM = 11 / 15; // a: every common name, no scientific name → 25 + 75 × 11/15 = 80%
const W_ENTRY = 0.25;

// The model's constants (Part B). Assumptions, not measurements: no fish species answer exists yet.
const RATE = {entry: 0.1, name: 0.08, genus: 0.08, sci: 0.05};
const MISS = 0.5;
const GENUS_HELP = 0.3;
const OPEN_SHAKY = 3;
const FLOOR = 0.05;
const ADVANCED = 0.8;
const HALF = 0.5;
const EXAM_N = 5;
const PLATEAU = {PTS: 1, EVERY: 50};
const PROFILES = {
  common: {learn: 'common', k0: {entry: 0.15, name: 0.1}, why: 'a diver learning common names only'},
  scientific: {learn: 'scientific', k0: {entry: 0.15, genus: 0.05, sci: 0}, why: 'scientific names only'},
  both: {learn: 'both', k0: {entry: 0.3, name: 0.1, genus: 0.05, sci: 0}, why: 'an IMR RA, both names'},
  bothSlowSci: {
    learn: 'both',
    k0: {entry: 0.3, name: 0.1, genus: 0.05, sci: 0},
    rate: {genus: 0.04, sci: 0.025},
    why: 'both names, scientific names learned at half the rate'
  },
  commonThenScientific: {
    learn: 'common',
    then: 'both',
    k0: {entry: 0.15, name: 0.1, genus: 0.05, sci: 0},
    why: 'common names first, scientific names turned on once every common name is known'
  },
  scientificThenCommon: {
    learn: 'scientific',
    then: 'both',
    k0: {entry: 0.15, name: 0.1, genus: 0.05, sci: 0},
    why: 'scientific names first, common names turned on once every scientific name is known'
  }
};

function args(argv) {
  const o = {seeds: 5, answers: 120000, names: null, json: null};
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i].replace(/^--/, '');
    if (k in o) o[k] = argv[++i];
  }
  o.seeds = +o.seeds;
  o.answers = +o.answers;
  return o;
}

// The circle-1 world: entries, their species in commonness order, genera, the number of listed common names.
function world(fish, names) {
  const sp = new Map(fish.species.map(s => [s.id, s]));
  const start = fish.start || [];
  const entries = fish.teach.filter(t => t.circle === 1 && t.level === 1);
  const rank = t => (start.includes(t.id) ? start.indexOf(t.id) : start.length);
  entries.sort((x, y) => rank(x) - rank(y)); // the starter core first (fish.json start), then fish.json order (a stable sort)
  const species = [];
  const genera = new Map();
  // Circle 1 only: an IMR entry may also hold Dauin species of circle 3, which never count (FISH_PATH).
  const c1 = t => t.species.filter(id => sp.get(id).circle === 1);
  for (const t of entries)
    for (const id of c1(t)) {
      const s = sp.get(id);
      const g = s.name.split(/\s+/)[0];
      if (!genera.has(g)) genera.set(g, {g, entry: t.id, species: []});
      genera.get(g).species.push(id);
      const n = names && names[id] && names[id].names ? names[id].names.length : 1;
      species.push({id, entry: t.id, genus: g, names: Math.max(1, Math.min(3, n)), cs: s.cs || 0});
    }
  return {entries: entries.map(t => ({id: t.id, name: t.name, species: c1(t)})), species, genera: [...genera.values()]};
}

// The formula. m: {entry: {id: mastery}, genus: {g: m}, sci: {sId: m}, name: {sId: [m per listed name]}}.
function credit(C, S) {
  return A_COM * C + B_SCI * S + (1 - A_COM - B_SCI) * C * S;
}
function parts(W, m, opt = {}) {
  const ent = W.entries.reduce((t, e) => t + (m.entry[e.id] || 0), 0) / W.entries.length;
  let cr = 0,
    cs = 0,
    ss = 0;
  for (const s of W.species) {
    const nm = m.name[s.id] || [];
    let C = 0;
    for (let i = 0; i < s.names; i++) C += nm[i] || 0;
    C /= s.names;
    const half = opt.noGenus ? 0 : 0.5 * (m.genus[s.genus] || 0);
    const S = Math.max(m.sci[s.id] || 0, half);
    cr += credit(C, S);
    cs += C;
    ss += S;
  }
  const n = W.species.length;
  return {score: W_ENTRY * ent + (1 - W_ENTRY) * (cr / n), entries: ent, common: cs / n, scientific: ss / n};
}

// Part A: fixed states.
function fixed(W) {
  const all = (pred, v = 1) => Object.fromEntries(pred.map(k => [k, v]));
  const E = all(W.entries.map(e => e.id));
  const G = all(W.genera.map(g => g.g));
  const S = all(W.species.map(s => s.id));
  const N = Object.fromEntries(W.species.map(s => [s.id, Array(s.names).fill(1)]));
  const one = Object.fromEntries(W.species.map(s => [s.id, [1]]));
  const top = new Set(W.species.filter(s => s.cs).map(s => s.id));
  // The most common half of each entry's species (commonness order).
  const half = new Set(W.entries.flatMap(e => e.species.slice(0, Math.ceil(e.species.length / 2))));
  const sub = (o, keep) => Object.fromEntries(Object.entries(o).filter(([k]) => keep.has(k)));
  const gHalf = new Set(W.species.filter(s => half.has(s.id)).map(s => s.genus));
  const v95 = (o, v) => Object.fromEntries(Object.entries(o).map(([k, x]) => [k, Array.isArray(x) ? x.map(() => v) : v]));
  const rows = [
    ['Nothing', {}, {}, {}, {}],
    ['Entries only', E, {}, {}, {}],
    ['Entries + every genus', E, G, {}, {}],
    ['Every common name', E, {}, {}, N],
    ['Every scientific name', E, {}, S, {}],
    ['Every common name + every genus', E, G, {}, N],
    ['Both names of every species', E, G, S, N],
    ['Both names of every species, no entry', {}, G, S, N],
    ['Every unit at the exam entry (bar 0.95), no exam passed', v95(E, 0.95), v95(G, 0.95), v95(S, 0.95), v95(N, 0.95)],
    ['Entries + common names of the IMR 24 most sighted', E, {}, {}, sub(N, top)],
    ['Entries + both names of the IMR 24 most sighted', E, {}, sub(S, top), sub(N, top)],
    ['Entries + common names of the most common half', E, {}, {}, sub(N, half)],
    ['Entries + both names of the most common half', E, sub(G, gHalf), sub(S, half), sub(N, half)],
    ['Entries + every genus + scientific names of the most common half', E, G, sub(S, half), {}],
    ['Every common name + scientific names of the most common half', E, {}, sub(S, half), N],
    ['Entries + the first listed common name of every species', E, {}, {}, one]
  ];
  return rows.map(([label, entry, genus, sci, name]) => ({label, ...parts(W, {entry, genus, sci, name})}));
}

// Part B.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function simulate(W, prof, seed, answers, opt = {}) {
  const rand = rng(seed);
  const rate = Object.assign({}, RATE, prof.rate || {});
  // The names learned (FISH_PATH "Which names a player learns"); a profile with `then` changes to it once its score is
  // within a point of its first branch's ceiling (a player who turns the other names on in ⚙ after finishing one).
  let learn = prof.learn;
  let com = learn !== 'scientific';
  let sci = learn !== 'common';
  const CEIL1 = {common: 80, scientific: 85};
  const units = new Map(); // key → {kind, ref, k, pg, ex, mx, open}
  const add = (key, kind, ref) => units.set(key, {key, kind, ref, k: prof.k0[kind] || 0, pg: 0, ex: 0, mx: false, open: false});
  for (const e of W.entries) add('e:' + e.id, 'entry', e.id);
  for (const g of W.genera) add('g:' + g.g, 'genus', g.g);
  for (const s of W.species) {
    for (let i = 0; i < s.names; i++) add('n:' + s.id + ':' + i, 'name', s.id);
    add('s:' + s.id, 'sci', s.id);
  }
  const bar = u => CORE.scoreOf({pg: u.pg, mx: u.mx, ex: {k: u.ex}});
  const spOf = new Map(W.species.map(s => [s.id, s]));
  const genOf = new Map(W.genera.map(g => [g.g, g]));
  // Eligibility, in the data's order: entries, then for each entry its genera and species (commonness order).
  const order = [];
  for (const e of W.entries) order.push('e:' + e.id);
  for (const e of W.entries) {
    const gs = [];
    for (const id of e.species) {
      const s = spOf.get(id);
      if (!gs.includes(s.genus)) gs.push(s.genus);
    }
    for (const g of gs) order.push('g:' + g);
    for (const id of e.species) {
      for (let i = 0; i < spOf.get(id).names; i++) order.push('n:' + id + ':' + i);
      order.push('s:' + id);
    }
  }
  const cOf = id => {
    const s = spOf.get(id);
    let c = 0;
    for (let i = 0; i < s.names; i++) c += bar(units.get('n:' + id + ':' + i));
    return c / s.names;
  };
  const eligible = u => {
    if (u.kind === 'entry') return true;
    if (u.kind === 'name' ? !com : !sci) return false;
    const entry = u.kind === 'genus' ? genOf.get(u.ref).entry : spOf.get(u.ref).entry;
    if (bar(units.get('e:' + entry)) < ADVANCED) return false;
    if (u.kind !== 'sci') return true;
    const s = spOf.get(u.ref);
    if (bar(units.get('g:' + s.genus)) < ADVANCED) return false;
    return !com || cOf(u.ref) >= HALF;
  };
  const openList = [];
  const teach = (u, right) => {
    u.k += rate[u.kind] * (right ? 1 : MISS) * (1 - u.k);
  };
  const open = u => {
    u.open = true;
    if (u.kind === 'sci') u.k = Math.max(u.k, GENUS_HELP * units.get('g:' + spOf.get(u.ref).genus).k);
    teach(u, true); // the first-meeting card
    openList.push(u);
  };
  let cursor = 0;
  const tryOpen = () => {
    const shaky = openList.filter(u => bar(u) < HALF).length;
    if (shaky >= OPEN_SHAKY) return;
    for (let i = cursor; i < order.length; i++) {
      const u = units.get(order[i]);
      if (u.open || !eligible(u)) continue;
      open(u);
      if (i === cursor) cursor++;
      return;
    }
  };
  const mastery = () => {
    const m = {entry: {}, genus: {}, sci: {}, name: {}};
    for (const u of units.values()) {
      const b = bar(u);
      if (u.kind === 'name') (m.name[u.ref] = m.name[u.ref] || []).push(b);
      else m[u.kind][u.ref] = b;
    }
    return m;
  };
  const trace = [];
  let entriesAdvancedAt = null;
  let switched = null;
  for (let a = 1; a <= answers; a++) {
    tryOpen();
    let tot = 0;
    const w = openList.map(u => (tot += 1 - bar(u) + FLOOR));
    const r = rand() * tot;
    const u = openList[w.findIndex(x => x >= r)];
    const right = rand() < Math.min(0.98, Math.max(0.02, u.k));
    u.pg = CORE.pgStep(u.pg, right, 1);
    if (right && u.pg >= CORE.PROG.M && !u.mx) u.ex++;
    else if (!right) u.ex = 0;
    if (u.ex >= EXAM_N) u.mx = true;
    if (!right && u.mx && !CORE.mxKeeps(u.pg)) u.mx = false;
    teach(u, right);
    if (a % PLATEAU.EVERY === 0) {
      const p = parts(W, mastery(), opt);
      trace.push({a, ...p});
      if (prof.then && learn !== prof.then && p.score * 100 >= CEIL1[learn] - 1) {
        learn = prof.then;
        com = sci = true;
        switched = a;
        cursor = 0;
      }
      if (entriesAdvancedAt === null && W.entries.every(e => bar(units.get('e:' + e.id)) >= ADVANCED)) entriesAdvancedAt = {a, ...p};
    }
  }
  return {trace, entriesAdvancedAt, switched};
}

function plateau(trace, ceiling) {
  // The answers each point of the score took, from 1 point after the entries are done (the entries' 25% come fast by
  // design) up to 95% of the ceiling: the longest and the median, and where the longest was. A plateau is a point that
  // takes many times the median.
  // A run that ends before 95% of its ceiling counts its last, unfinished point too, up to its last answer (Codex
  // review #519: a run stalled there is exactly what the measure is for).
  const pts = [];
  let last = null,
    done = false;
  const cut = 0.95 * ceiling;
  for (const t of trace) {
    const sc = t.score * 100;
    if (sc < 26) continue;
    if (last === null) last = {a: t.a, p: Math.floor(Math.min(sc, cut))};
    // The points completed up to the cutoff, the last one before it included (Codex review #519: a slow point that
    // ends at the cutoff is the stall the measure is for).
    while (Math.min(sc, cut) >= last.p + PLATEAU.PTS) {
      pts.push({len: t.a - last.a, at: last.p});
      last = {a: t.a, p: last.p + PLATEAU.PTS};
    }
    if (sc >= cut) {
      if (t.a > last.a) pts.push({len: t.a - last.a, at: last.p}); // the part point up to the cutoff
      done = true;
      break;
    }
  }
  if (!done && last && trace.length && trace[trace.length - 1].a > last.a)
    pts.push({len: trace[trace.length - 1].a - last.a, at: last.p, open: true});
  if (!pts.length) return {len: 0, median: 0, at: null};
  const lens = pts.map(x => x.len).sort((x, y) => x - y);
  const top = pts.reduce((b, x) => (x.len > b.len ? x : b));
  return {len: top.len, at: top.at, median: lens[Math.floor(lens.length / 2)]};
}

const mean = xs => xs.reduce((t, x) => t + x, 0) / xs.length;
const sd = xs => Math.sqrt(mean(xs.map(x => (x - mean(xs)) ** 2)));
const pm = (xs, d = 0) => (xs.some(x => x == null) ? `${xs.filter(x => x != null).length}/${xs.length} runs` : `${mean(xs).toFixed(d)} ± ${sd(xs).toFixed(d)}`);

function main() {
  const o = args(process.argv);
  const fish = JSON.parse(fs.readFileSync(path.join(ROOT, 'fish.json'), 'utf8'));
  const names = o.names ? JSON.parse(fs.readFileSync(path.resolve(o.names), 'utf8')).species : null;
  const W = world(fish, names);
  const nNames = W.species.reduce((t, s) => t + s.names, 0);
  const out = {
    world: {entries: W.entries.length, genera: W.genera.length, species: W.species.length, names: nNames},
    a: A_COM,
    b: B_SCI,
    fixed: fixed(W),
    profiles: {}
  };
  console.log(`Circle 1: ${W.entries.length} entries, ${W.genera.length} genera, ${W.species.length} species, ${nNames} listed common names`);
  console.log(`a = ${A_COM.toFixed(4)}, b = ${B_SCI}, 1 − a − b = ${(1 - A_COM - B_SCI).toFixed(4)}\n`);
  console.log('Part A, fixed states (score; entries / common C / scientific S means)');
  for (const r of out.fixed)
    console.log(
      `  ${r.label.padEnd(64)} ${(100 * r.score).toFixed(1).padStart(5)}%   ${r.entries.toFixed(2)} / ${r.common.toFixed(2)} / ${r.scientific.toFixed(2)}`
    );
  const seeds = [11, 222, 3333, 44444, 555, 6666, 77, 888, 9999, 1010].slice(0, o.seeds);
  const CEIL = {common: 80, scientific: 85, both: 100};
  const ceilOf = p => CEIL[p.then || p.learn];
  const CHECK = [250, 500, 1000, 2000, 3000, 5000, 8000, 12000, 20000, 30000, 40000, 50000, 60000, 80000, 100000, 120000].filter(a => a <= o.answers);
  const REACH = [25, 50, 75, 80, 85, 95];
  const variants = Object.entries(PROFILES).map(([k, p]) => [k, p, {}]);
  variants.push(['scientific, no genus half credit', PROFILES.scientific, {noGenus: true}]);
  for (const [name, prof, opt] of variants) {
    const runs = seeds.map(s => simulate(W, prof, s, o.answers, opt));
    const ceil = ceilOf(prof);
    const at = a => runs.map(r => r.trace.find(t => t.a === a));
    const res = {why: prof.why, checkpoints: {}, reach: {}, entriesAdvanced: null, plateau: null};
    console.log(`\n${name}: ${prof.why}${opt.noGenus ? ' (S = species mastery only)' : ''}; ceiling ${ceil}%`);
    console.log('  answers   score %        entries   common C   scientific S');
    for (const a of CHECK) {
      const xs = at(a);
      res.checkpoints[a] = {
        score: mean(xs.map(x => 100 * x.score)),
        sd: sd(xs.map(x => 100 * x.score)),
        entries: mean(xs.map(x => x.entries)),
        common: mean(xs.map(x => x.common)),
        scientific: mean(xs.map(x => x.scientific))
      };
      const c = res.checkpoints[a];
      console.log(
        `  ${String(a).padStart(6)}   ${pm(xs.map(x => 100 * x.score)).padEnd(12)}   ${c.entries.toFixed(2).padStart(7)}   ${c.common.toFixed(2).padStart(8)}   ${c.scientific.toFixed(2).padStart(12)}`
      );
    }
    const reach = REACH.filter(p => p <= ceil).map(p => [p, runs.map(r => (r.trace.find(t => t.score * 100 >= p - 1e-6) || {}).a)]);
    console.log('  reaches: ' + reach.map(([p, xs]) => `${p}% at ${pm(xs)}`).join('; '));
    for (const [p, xs] of reach) res.reach[p] = xs;
    const ea = runs.map(r => r.entriesAdvancedAt);
    if (ea.every(Boolean)) {
      res.entriesAdvanced = {a: ea.map(x => x.a), score: ea.map(x => 100 * x.score), share: ea.map(x => (W_ENTRY * x.entries) / x.score)};
      console.log(
        `  every entry at Advanced: answer ${pm(res.entriesAdvanced.a)}, score ${pm(res.entriesAdvanced.score, 1)}%, of which entries ${pm(res.entriesAdvanced.share.map(x => 100 * x))}%`
      );
    }
    const pl = runs.map(r => plateau(r.trace, ceil));
    res.plateau = pl;
    console.log(
      `  answers a point takes (from 26% to ${(0.95 * ceil).toFixed(0)}%): median ${pm(pl.map(x => x.median))}, longest ${pm(pl.map(x => x.len))}` +
        ` (at ${pl.map(x => x.at + '%').join(', ')})`
    );
    if (prof.then) {
      res.switched = runs.map(r => r.switched);
      console.log(`  ${prof.then} names turned on at answer ${pm(res.switched)}`);
    }
    out.profiles[name] = res;
  }
  if (o.json) fs.writeFileSync(o.json, JSON.stringify(out, null, 1));
}

if (require.main === module) {
  require('../tests/slot.js').guard('tools/fishscore.js');  // one heavy run at a time on the machine (tests/slot.js, rule W24)
  main();
}
module.exports = {credit, parts, world, fixed, simulate, plateau, A_COM, B_SCI, W_ENTRY};
