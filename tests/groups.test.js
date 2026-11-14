'use strict';
// Confusion groups (Pierre, 2026-11-14, Q350; docs/LEARNING.md "Confusion groups"; model.js GROUP, groupsOfRank,
// openPick, examOn): look-alike units grouped (declared pairs first and never split by the data, then average linkage on
// the pooled score at CONF.TRAP, at most GROUP.MAX), a group's other members the next openings once one is met, a
// declared pair the cap kept apart pulling its partner next, and a unit's exam waiting for its group partners. model.js
// runs whole in the rated world's vm (tools/ratedworld.js engine), the app's globals around it.
const test = require('node:test'),
  assert = require('node:assert'),
  vm = require('vm');
const RW = require('../tools/ratedworld.js');

const coral = (seed = 1) => {
    const U = RW.unitsOf('coral');
    return RW.engine(U, RW.world(U, 1), {seed});
  },
  run = (e, js) => vm.runInContext(js, e.ctx),
  // The pooled confusions (?stats=1 conf: pair -> [offered together, mixed up]), the groups recomputed.
  setConf = (e, conf) => run(e, `PCONF = ${JSON.stringify(conf)}; GROUPS = null;`),
  groups = e => run(e, 'groupMap()'),
  same = (G, a, b) => (G[a] || []).includes(b),
  sizeOf = (G, n) => (G[n] || [n]).length,
  pairs = (e, L) => L.flatMap((a, i) => L.slice(i + 1).map(b => [a, b])),
  draws = (e, fresh, met, k = 100) => Array.from({length: k}, () => e.M.openPick(fresh.slice(), fresh.slice(), n => met.includes(n)));

test('declared pairs always stay grouped: merged first, split only by the cap, never by the data', () => {
  const e = coral(),
    L = e.ctx.slateGenera(),
    D = pairs(e, L).filter(([a, b]) => run(e, `declared(${JSON.stringify(a)}, ${JSON.stringify(b)})`));
  assert.ok(D.length > 30, 'the corals declare their look-alikes (data.json look)');
  // Every declared look-alike of a coral genus is never mixed up with it in 500 offers: the pairs still group, as the cap allows.
  setConf(e, Object.fromEntries(D.map(([x, y]) => [x < y ? x + '|' + y : y + '|' + x, [500, 0]])));
  const G = groups(e);
  // A declared pair alone (the fish Lizardfishes and Sandperches, IMR's): the data never split it.
  const U = RW.unitsOf('fish'),
    f = RW.engine(U, RW.world(U, 1), {seed: 1});
  setConf(f, {'f:Lizardfishes|f:Sandperches': [500, 0]});
  assert.ok(same(groups(f), 'f:Lizardfishes', 'f:Sandperches'), 'declared, never mixed up in 500 offers: still one group');
  Object.values(G).forEach(g => assert.ok(g.length <= run(e, 'GROUP.MAX'), 'at most GROUP.MAX: ' + g));
  // Every declared pair is in one group, or the cap kept them apart (their two groups would not fit in one).
  D.forEach(([x, y]) => assert.ok(same(G, x, y) || sizeOf(G, x) + sizeOf(G, y) > run(e, 'GROUP.MAX'), `${x} / ${y} split with room left`));
});

test('pairs from the data: joined at CONF.TRAP by average linkage, not under it', () => {
  const e = coral(),
    G0 = groups(e),
    L = e.ctx.slateGenera(),
    lone = L.filter(n => !G0[n]);
  // Two lone units with no declared link between them.
  const [a, b] = pairs(e, lone).find(([x, y]) => !run(e, `declared(${JSON.stringify(x)}, ${JSON.stringify(y)})`));
  const k = a < b ? a + '|' + b : b + '|' + a;
  setConf(e, {[k]: [100, 40]}); // 0.38 with the prior: a look-alike from the data
  assert.ok(same(groups(e), a, b), `${a} + ${b}, mixed up 40 times in 100: grouped`);
  setConf(e, {[k]: [100, 10]}); // about 0.1: under the trap level
  assert.ok(!same(groups(e), a, b), `${a} / ${b}, mixed up 10 times in 100: apart`);
});

test('fish: families from the declared groups; genera from their IMR sub-entry, not from every sibling', () => {
  const U = RW.unitsOf('fish'),
    e = RW.engine(U, RW.world(U, 1), {seed: 1});
  e.ctx.bonusList = () => U.extra; // every scientific genus in play
  const G = groups(e);
  assert.ok(
    same(G, 'f:Butterflyfishes', 'f:Angelfishes') && same(G, 'f:Snappers', 'f:Emperors') && same(G, 'f:Triggerfishes', 'f:Filefishes')
  );
  // The Surgeonfish of IMR (Acanthurus, Ctenochaetus, Zebrasoma) are one group; Naso (IMR's Unicornfish), a sibling, is not in it.
  assert.strictEqual(G['g:Acanthurus'].join(' '), 'g:Acanthurus g:Ctenochaetus g:Zebrasoma');
  assert.ok(!G['g:Naso'] && !G['g:Chromis'], 'siblings alone are not declared (the family prior, under the trap level)');
  assert.ok(
    Object.keys(G).every(n => G[n].every(m => (e.G[m].rank || '') === (e.G[n].rank || ''))),
    'one rank a group'
  );
});

test('opening: a group partner of a unit met first; a declared pair the cap split pulls nothing; then a new group', () => {
  const e = coral(),
    G = groups(e),
    L = e.ctx.slateGenera(),
    decl = (a, b) => run(e, `declared(${JSON.stringify(a)}, ${JSON.stringify(b)})`);
  // 1. One member of a group of 3 met: its two partners are the only openings.
  const g = Object.values(G).find(x => x.length === 3),
    rest = L.filter(n => !g.includes(n));
  const one = draws(
    e,
    L.filter(n => n !== g[0]),
    [g[0]]
  );
  assert.ok(
    one.every(n => g.includes(n)),
    'partners first: ' + [...new Set(one)]
  );
  // 2. The whole group met: a declared partner of it that the cap kept out is not pulled (Pierre, Q355, "ok pour B"); the
  // next opening is a new group or lone unit, drawn among everything left.
  const out = rest.filter(n => g.some(m => decl(m, n)));
  assert.ok(out.length, 'a declared pair split by the cap');
  const two = draws(e, rest, g, 300);
  assert.ok(
    two.some(n => !out.includes(n)),
    'no pull: ' + [...new Set(two)]
  );
  // 3. Nothing met: a new group or lone unit, the first member drawn by the easy-first weight.
  const three = draws(e, L, [], 300);
  assert.ok(new Set(three).size > 10, 'many units can open first');
});

test('from zero: the first cards are drawn unit by unit; from the next card, a group partner of theirs first', () => {
  const e = coral(3),
    start = e.M.INTRO.START;
  let together = 0;
  for (let s = 0; s < 40; s++) {
    let fresh = e.ctx.slateGenera().slice();
    const met = [],
      pick = first => {
        const n = e.M.openPick(fresh.slice(), fresh.slice(), x => met.includes(x), {first});
        met.push(n);
        fresh = fresh.filter(x => x !== n);
        return n;
      };
    while (met.length < start) pick(true);
    const G = groups(e);
    if (met.slice(1).some(n => (G[met[0]] || []).includes(n))) together++;
    // The next card: a partner, of a first card's group, that may open (a ★ genus waits for its reference), when one is left.
    const ok = fresh.filter(
      x =>
        met.some(m => (G[m] || []).includes(x)) &&
        !e.ctx.starRefs(e.ctx.DATA, x).some(r => !met.includes(r) && e.ctx.slateGenera().includes(r))
    );
    const n = pick(false);
    if (ok.length) assert.ok(ok.includes(n), `after ${met.slice(0, start)}: ${n}, not a partner of theirs`);
  }
  // Drawn unit by unit (Q355), the first cards are seldom a group: the first unit's partner among them in few runs.
  assert.ok(together < 20, `first cards with the first unit's partner: ${together} of 40`);
});

test("a starter core keeps the group order among its first cards (B')", () => {
  const U = RW.unitsOf('fish'),
    e = RW.engine(U, RW.world(U, 1), {seed: 4}),
    pair = ['f:Angelfishes', 'f:Butterflyfishes'];
  for (let s = 0; s < 30; s++) {
    let fresh = e.ctx.slateGenera().slice();
    const met = [];
    while (met.length < e.M.INTRO.START) {
      const n = e.M.openPick(fresh.slice(), fresh.slice(), x => met.includes(x), {first: true});
      met.push(n);
      fresh = fresh.filter(x => x !== n);
    }
    assert.ok(
      met.every(n => e.G[n].first),
      'the starter core first: ' + met
    );
    // Butterflyfishes and Angelfishes (one group) come one right after the other.
    assert.strictEqual(Math.abs(met.indexOf(pair[0]) - met.indexOf(pair[1])), 1, 'the group in a row: ' + met);
  }
});

test('the exam waits for the group partners that can open; one under way goes on', () => {
  const e = coral(),
    G = groups(e),
    g = Object.values(G).find(x => x.length === 3),
    [n, m, o] = g;
  // At the exam's entry, every declared look-alike compared (core.js examOpen, looksLeft): only the group decides.
  e.ctx.examOpen = () => true;
  e.ctx.looksLeft = () => [];
  e.ctx.unameT = x => x; // app.js
  e.M.introAdd([n], true);
  assert.strictEqual(run(e, `examOn(${JSON.stringify(n)})`), false, 'partners not met: no exam');
  assert.ok(
    run(e, `missing(${JSON.stringify(n)})`).some(x => x.startsWith('meeting its look-alikes')),
    'missing() says what it waits for'
  );
  e.M.introAdd([m], false);
  assert.strictEqual(run(e, `examOn(${JSON.stringify(n)})`), false, 'one partner left');
  // A partner behind a gate (mayOpen false: a fish circle not open yet, say) holds nobody back.
  e.ctx.openShut = x => x === o;
  assert.strictEqual(run(e, `examOn(${JSON.stringify(n)})`), true, 'a partner that cannot open now does not count');
  e.ctx.openShut = () => false;
  e.ctx.P[n] = {...(e.ctx.P[n] || {}), ex: {k: 2, t: 1, at: 0}};
  assert.strictEqual(run(e, `examOn(${JSON.stringify(n)})`), true, 'an exam under way goes on');
  delete e.ctx.P[n].ex;
  e.M.introAdd([o], false);
  assert.strictEqual(run(e, `examOn(${JSON.stringify(n)})`), true, 'the group met: the exam opens');
  assert.ok(!run(e, `missing(${JSON.stringify(n)})`).some(x => x.startsWith('meeting')));
});

test('the groups follow the pooled stats (a new PCONF object) and the units in play', () => {
  const e = coral(),
    a = groups(e);
  assert.strictEqual(groups(e), a, 'kept while nothing changes');
  run(e, 'PCONF = {...PCONF};');
  assert.notStrictEqual(groups(e), a, 'recomputed with the stats');
  assert.strictEqual(JSON.stringify(groups(e)), JSON.stringify(a), 'the same data, the same groups');
  // An answer with the same units in play and the same stats: not built again (Codex review #871, the cost on phones).
  const b = groups(e);
  e.ctx.P['~level'] = {ok: 7, ko: 3};
  assert.strictEqual(groups(e), b, 'kept across answers while the units in play are the same');
  // The bonus genera turned on, then off again, with no answer in between: the groups follow at once.
  const bonus = RW.unitsOf('coral').extra;
  e.ctx.Q.bon = true;
  const on = groups(e);
  assert.ok(
    Object.keys(on).some(n => bonus.includes(n)),
    'bonus genera on: in the groups'
  );
  e.ctx.Q.bon = false;
  assert.ok(!Object.keys(groups(e)).some(n => bonus.includes(n)), 'off again: out of the groups at once');
  assert.ok(
    Object.values(groups(e)).every(g => g.every(n => !bonus.includes(n))),
    'no group keeps one as a partner'
  );
});
