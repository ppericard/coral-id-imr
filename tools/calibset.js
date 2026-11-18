#!/usr/bin/env node
// The coral calibration set (Pierre, 2026-11-18: the placement test starts with a calibration set; docs/decisions/
// 2026-11-18-coral-calibration-set.md, docs/LEARNING.md "The calibration set"): writes calibration-set.json, a fixed set
// of about TARGET coral game photos that the draw shows a little more often (model.js setBonus) until each has GOAL
// answers, so that a later placement test can ask photos whose difficulty is measured, not guessed.
//
// The rule:
//   - Eligible: a game photo of a slate genus (core.js slateOf: the 39 IMR genera and Millepora; the bonus genera are
//     opt-in, so their photos come to few players) in a view every question shows (wide and medium; a two-level genus's
//     wide and its close-up, macro): a corallites photo of a three-level genus only shows as the hint or alone, so it
//     would gather answers slowly. Never a several-corals photo, a photo rated Poor (Pierre's rating, else the automatic
//     one; an IMR lecture photo is never automatically Poor, as in core.js applySlots), a Colony photo whose growth form
//     is not visible (model.js photoSet never shows it as one), or an off-slate genus's photo the games refuse (core.js
//     POOLS slots: Research Grade only). Only objective qualities (rule P1): never the source, licence or observer, nor
//     the answers a photo already has.
//   - How many per genus: TARGET spread over the slate, one each and the rest to the genera with the most eligible
//     colonies (the commonest in play), ties in a fixed hash order. The genera span the slate's range of difficulty, so
//     the set does too; the views alternate across the genera (a hash order), so it holds colony and close-up photos.
//   - Which photo: in its genus and view, the first in a fixed hash order (sha256 of SALT and the file), one per colony
//     (a question shows one colony: two members of one colony would share their answers).
//   - Sticky: a member stays while it is eligible, even when its genus's count falls (the set may then hold a few more
//     than TARGET); a genus short of its count (a member out of play, Poor, or removed) takes the next eligible photo by
//     the same order. A redraw would throw away the answers the members gathered.
//
//   node tools/calibset.js                       write calibration-set.json (sticky) from data.json, curation.json,
//                                                quality.json, forms.json and the file itself
//   node tools/calibset.js --check               exit 1 when a run would change the file (a member gone, a genus short)
//   node tools/calibset.js --progress STATS      each member's answers from a saved ?stats=1 reply (the sync sheet's
//                                                public photo statistics, the read the app makes), the members at GOAL,
//                                                the least answered; what it can conclude (rule A5)
const fs = require('fs'),
  path = require('path'),
  crypto = require('crypto');
const ROOT = path.join(__dirname, '..');
const C = require(path.join(ROOT, 'core.js'));
const {built} = require(path.join(__dirname, 'game_forms.js'));

const OUT = 'calibration-set.json',
  SUBJECT = 'coral',
  TARGET = 50,
  GOAL = 20, // model.js CSET.N: the answers each member is drawn more often until (tests/calibset.test.js holds them together)
  SALT = 'calibration-set';
const RULE = {target: TARGET, goal: GOAL, genera: 'slate', views: 'shown', quality: 'not Poor', salt: SALT};
const ABOUT =
  'the coral calibration set (tools/calibset.js; docs/LEARNING.md "The calibration set"): game photos the draw shows a ' +
  'little more often until each has ' +
  GOAL +
  ' answers, for a placement test built on measured difficulties';

const read = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const hash = s => crypto.createHash('sha256').update(SALT + ':' + s).digest('hex');
const byHash = (a, b) => (hash(a) < hash(b) ? -1 : hash(a) > hash(b) ? 1 : 0);
const letter = v => (v || '').replace(/[pn]/g, '');
const colonyOf = p => String(p.o || p.f);

// The views a question shows of genus g (model.js photoSet shownV): colony and close-up; a two-level genus's colony and
// close-up (its macro list).
const shownOf = g => (g && g.levels === 2 ? ['wide', 'macro'] : ['wide', 'medium']);

// {genus: {view: [photo]}}: the eligible photos of every slate genus (the rule above). d: data.json built with the
// curation (game_forms.js built); raw: data.json as served; cur: curation.json; autoq: quality.json q; forms: forms.json.
function eligible(d, raw, cur, autoq, forms) {
  const Q = (cur && cur.quality) || {},
    gfCur = (cur && cur.gf) || {},
    gfGuess = (forms && forms.gf) || {},
    poor = f => (Q[f] || (autoq[f] === 1 && /^imrl?-/.test(f) ? 2 : autoq[f] || 2)) === 1,
    hidden = f => letter(gfCur[f]) === 'x' || (!letter(gfCur[f]) && letter(gfGuess[f]) === 'x');
  const out = {};
  C.slateOf(raw).forEach(n => {
    const g = (d.gen || {})[n] || ((d.x || {}).gen || {})[n];
    if (!g) return;
    out[n] = {};
    shownOf(g).forEach(v => {
      out[n][v] = (((g.sl || {})[v] || {}).game || []).filter(
        p => p && p.f && !p.multi && (!g.x || p.own || !p.gid) && !poor(p.f) && !(v === 'wide' && hidden(p.f))
      );
    });
  });
  return out;
}

// {genus: how many members}: TARGET places dealt in rounds over the genera with an eligible photo, the genera with the
// most eligible colonies first (ties in hash order), a genus out of colonies skipped: one each first, the rest to the
// commonest in play.
function quotas(E) {
  const G = Object.keys(E).filter(n => Object.values(E[n]).some(L => L.length)),
    cols = Object.fromEntries(G.map(n => [n, new Set(Object.values(E[n]).flat().map(colonyOf)).size])),
    order = G.slice().sort((a, b) => cols[b] - cols[a] || byHash(a, b)),
    out = Object.fromEntries(G.map(n => [n, 0]));
  for (let k = TARGET, gave = true; k > 0 && gave; ) {
    gave = false;
    for (const n of order)
      if (k > 0 && out[n] < cols[n]) {
        out[n] += 1;
        k -= 1;
        gave = true;
      }
  }
  return out;
}

// {genus: [files]}: the set, sticky from prev ({genus: [files]} of the file, or null).
function build(E, prev) {
  const Qn = quotas(E),
    used = new Set(),
    out = {};
  const where = {};
  Object.entries(E).forEach(([n, V]) => Object.entries(V).forEach(([v, L]) => L.forEach(p => (where[p.f] = {n, v, p}))));
  // The members kept first, in their genus, one per colony, all of them: a genus whose count fell (another genus gained
  // colonies and took one of the extra places) keeps its members, so the set may hold a few more than TARGET.
  Object.entries(prev || {}).forEach(([n, L]) =>
    (L || []).forEach(f => {
      const w = where[f];
      if (!w || w.n !== n || used.has(colonyOf(w.p))) return;
      used.add(colonyOf(w.p));
      (out[n] = out[n] || []).push(f);
    })
  );
  // Then each genus filled up to its count, the genera in hash order, each starting on the view after the last genus's
  // (so the set holds about as many colony photos as close-ups), the next view for each further member.
  Object.keys(Qn)
    .sort(byHash)
    .forEach((n, i) => {
      const views = Object.keys(E[n]),
        M = (out[n] = out[n] || []);
      while (M.length < Qn[n]) {
        let next = null;
        for (let k = 0; k < views.length && !next; k++) {
          const v = views[(i + M.length + k) % views.length];
          next =
            E[n][v]
              .filter(p => !used.has(colonyOf(p)))
              .map(p => p.f)
              .sort(byHash)[0] || null;
        }
        if (!next) break;
        used.add(colonyOf(where[next].p));
        M.push(next);
      }
    });
  return Object.fromEntries(
    Object.keys(E)
      .filter(n => (out[n] || []).length)
      .map(n => [n, out[n].slice().sort()])
  );
}

function current() {
  try {
    return read(OUT);
  } catch (e) {
    return null;
  }
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const stale = (old, set) => !old || !same(old.rule, RULE) || !same(old[SUBJECT], set);

function inputs() {
  const raw = read('data.json'),
    cur = read('curation.json');
  return eligible(built(raw, cur), raw, cur, read('quality.json').q || {}, read('forms.json'));
}

// The file's text: the header keys one a line, then the set one genus a line.
function render(doc) {
  const head = Object.entries(doc)
    .filter(([k]) => k !== SUBJECT)
    .map(([k, v]) => ` ${JSON.stringify(k)}: ${JSON.stringify(v)}`);
  const body = Object.entries(doc[SUBJECT]).map(([n, L]) => `  ${JSON.stringify(n)}: ${JSON.stringify(L)}`);
  return '{\n' + head.join(',\n') + `,\n ${JSON.stringify(SUBJECT)}: {\n` + body.join(',\n') + '\n }\n}\n';
}

// The members' progress from a ?stats=1 reply: {rows: [[genus, view, file, answers, difficulty]], ...summary}.
function progress(doc, stats, E) {
  const P = (stats && stats.photos) || {},
    view = {};
  Object.values(E).forEach(V => Object.entries(V).forEach(([v, L]) => L.forEach(p => (view[p.f] = v))));
  const rows = Object.entries(doc[SUBJECT] || {}).flatMap(([n, L]) =>
    L.map(f => {
      const o = P[f];
      return [n, view[f] || 'out of play', f, o ? (o[3] ?? o[1] ?? 0) : 0, o ? o[0] : null];
    })
  );
  const n = rows.map(r => r[3]).sort((a, b) => a - b),
    q = (L, x) => (L.length ? L[Math.min(L.length - 1, Math.floor(x * L.length))] : null),
    d = rows
      .map(r => r[4])
      .filter(x => typeof x === 'number')
      .sort((a, b) => a - b);
  return {
    rows,
    members: rows.length,
    inPlay: rows.filter(r => r[1] !== 'out of play').length,
    atGoal: rows.filter(r => r[3] >= GOAL).length,
    answers: {min: n[0] ?? null, median: q(n, 0.5), max: n[n.length - 1] ?? null, total: n.reduce((t, x) => t + x, 0)},
    difficulty: {rated: d.length, p10: q(d, 0.1), median: q(d, 0.5), p90: q(d, 0.9)}
  };
}

function main(argv) {
  const old = current(),
    E = inputs(),
    prev = old && same(old.rule, RULE) ? old[SUBJECT] : null,
    set = build(E, prev),
    count = Object.values(set).flat().length;
  const i = argv.indexOf('--progress');
  if (i >= 0) {
    const file = argv[i + 1];
    if (!file || !old) return console.error(old ? "--progress STATS (the sheet's photo statistics, saved)" : `${OUT} is missing: run the tool`), 2;
    const r = progress(old, JSON.parse(fs.readFileSync(file, 'utf8')), E),
      r2 = x => (x == null ? '-' : Math.round(x * 100) / 100);
    r.rows
      .slice()
      .sort((a, b) => a[3] - b[3] || a[2].localeCompare(b[2]))
      .forEach(([n, v, f, a, dd]) => console.log(`${String(a).padStart(3)}  ${n.padEnd(15)} ${v.padEnd(11)} ${String(r2(dd)).padStart(5)}  ${f}`));
    console.log(
      `\n${r.members} members, ${r.inPlay} in play; ${r.atGoal} at ${GOAL}+ answers; answers min ${r.answers.min}, median ` +
        `${r.answers.median}, max ${r.answers.max}, ${r.answers.total} in all.\nDifficulty of the ${r.difficulty.rated} rated ` +
        `(the sheet's photo Elo, as model.js photoDiff reads it before its prior): 10% ${r2(r.difficulty.p10)}, median ` +
        `${r2(r.difficulty.median)}, 90% ${r2(r.difficulty.p90)}.\nWhat this can conclude (rule A5): how far the set is from ` +
        `${GOAL} answers a member, counted as the sheet counts a photo's plain answers (every player, repeats included). ` +
        `Not how many players answered each (the Answers tab has it, admin-only), nor how well a rating predicts.`
    );
    return 0;
  }
  if (argv.includes('--check')) {
    if (stale(old, set)) {
      console.error(`${OUT} is not what tools/calibset.js writes now (a member out of play, or a genus short): run it`);
      return 1;
    }
    console.log(`${OUT}: ${count} members, as the rule gives`);
    return 0;
  }
  const doc = {v: 1, built: stale(old, set) ? new Date().toISOString().slice(0, 10) : old.built, about: ABOUT, rule: RULE, [SUBJECT]: set};
  fs.writeFileSync(path.join(ROOT, OUT), render(doc));
  console.log(`${OUT}: ${count} members in ${Object.keys(set).length} genera`);
  return 0;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));
module.exports = {eligible, quotas, build, progress, render, shownOf, RULE, TARGET, GOAL, SALT, OUT, SUBJECT};
