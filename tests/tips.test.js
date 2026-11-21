require('./slot.js').testGuard();
// tips.js: the "Did you know?" tips' state, targeting and caps (docs/ARCHITECTURE.md "Did you know? tips"). The card
// and the break at Next are checked in Chromium by tests/pages.smoke.js.
const test = require('node:test'),
  assert = require('node:assert');
const {TIPR, TIPS, tipsInit, tipNote, tipUse, tipDue, tipShown} = require('../tips.js');

const MIN = 60000;
// n answers a minute apart from t0, with z photos enlarged before any of them. By default the player has opened the
// Custom quiz and the Duel tab (c 1, d 1), so only the zoom tip is in play; the other tips' tests start from a state
// that has not used their feature.
function played(n, z = 0, st = tipsInit({u: {c: 1, d: 1}}), t0 = 1e12) {
  for (let i = 0; i < z; i++) st = tipUse(st, 'z');
  for (let i = 0; i < n; i++) st = tipNote(st, t0 + i * MIN);
  return st;
}
const MISS = {ctx: 'quiz', miss: true, zm: false},
  RIGHT = {ctx: 'quiz', miss: false, zm: false};

test('tipsInit: empty, malformed, and seeded once from the device answers', () => {
  assert.deepStrictEqual(tipsInit(null, []), {u: {q: 0, z: 0, k: 0, c: 0, d: 0, m: 0, i: 0}, s: {}, v: {t: 0, n: 0, tip: 0}});
  assert.deepStrictEqual(tipsInit('x', null).u, {q: 0, z: 0, k: 0, c: 0, d: 0, m: 0, i: 0});
  assert.deepStrictEqual(tipsInit({u: {q: -3, z: 'a'}, s: {zoom: 'x'}, v: 5}, null), {
    u: {q: 0, z: 0, c: 0, d: 0, m: 0, i: 0, k: 0},
    s: {zoom: []},
    v: {t: 0, n: 0, tip: 0}
  });
  // The seed: the answers' count and their zm flags; never once a state exists.
  const log = [{zm: 1}, {zm: 0}, {}, {zm: 1}, null];
  assert.deepStrictEqual(tipsInit(null, log).u, {q: 4, z: 2, k: 0, c: 0, d: 0, m: 0, i: 0});
  assert.deepStrictEqual(tipsInit({u: {q: 7, z: 0}}, log).u, {q: 7, z: 0, c: 0, d: 0, m: 0, i: 0, k: 0});
});

test('tipNote: a visit is answers less than 30 minutes apart; a tip shown holds for the visit only', () => {
  let st = played(5);
  assert.strictEqual(st.v.n, 5);
  assert.strictEqual(st.u.q, 5);
  st = tipShown(st, 'zoom');
  st = tipNote(st, st.v.t + TIPR.GAP - 1);
  assert.deepStrictEqual([st.v.n, st.v.tip], [6, 1]);
  st = tipNote(st, st.v.t + TIPR.GAP);
  assert.deepStrictEqual([st.v.n, st.v.tip], [1, 0]);
  // A clock that went back starts a new visit.
  st = tipNote(played(3), 0);
  assert.strictEqual(st.v.n, 1);
});

test('zoom tip: not before 20 questions, never in the first 10 answers of a visit, at a miss on a photo not enlarged', () => {
  assert.strictEqual(tipDue(played(19), MISS), null);
  assert.strictEqual(tipDue(played(20), MISS).id, 'zoom');
  assert.strictEqual(tipDue(played(20), {...MISS, zm: true}), null); // enlarged before answering
  assert.strictEqual(tipDue(played(20), RIGHT), null); // a right answer before 40: not the moment
  // 25 questions, then a break: the new visit's first 9 answers never show it.
  let st = played(25);
  st = played(9, 0, st, st.v.t + TIPR.GAP);
  assert.strictEqual(tipDue(st, MISS), null);
  assert.strictEqual(tipDue(tipNote(st, st.v.t + MIN), MISS).id, 'zoom');
});

test('zoom tip: any break from 40 questions; its games only', () => {
  assert.strictEqual(tipDue(played(39), RIGHT), null);
  assert.strictEqual(tipDue(played(40), RIGHT).id, 'zoom');
  for (const ctx of ['quiz', 'quiz-custom', 'quiz-duel']) assert.ok(tipDue(played(40), {...RIGHT, ctx}), ctx);
  assert.strictEqual(tipDue(played(40), {...RIGHT, ctx: 'genera'}), null);
});

test('zoom tip: the target, at most 2 photos enlarged', () => {
  assert.ok(tipDue(played(30, 2), MISS));
  assert.strictEqual(tipDue(played(30, 3), MISS), null);
  assert.strictEqual(tipDue(played(300, 3), RIGHT), null);
});

test('zoom tip: once a visit, twice ever, the second 100 questions after the first and only while still targeted', () => {
  let st = tipShown(played(30), 'zoom');
  assert.deepStrictEqual(st.s.zoom, [30]);
  assert.strictEqual(tipDue(st, MISS), null); // same visit
  // Next visits: not before 130 questions; at a miss from 130, any break from 150.
  const visit = (st, n) => played(n, 0, st, st.v.t + TIPR.GAP);
  st = visit(st, 99);
  assert.strictEqual(st.u.q, 129);
  assert.strictEqual(tipDue(st, MISS), null);
  st = visit(st, 1);
  assert.strictEqual(tipDue(st, MISS), null); // a new visit: its first 10 answers
  st = played(9, 0, st, st.v.t + MIN);
  assert.strictEqual(st.u.q, 139);
  assert.strictEqual(tipDue(st, MISS).id, 'zoom');
  assert.strictEqual(tipDue(st, RIGHT), null);
  assert.strictEqual(tipDue(played(11, 0, st, st.v.t + MIN), RIGHT).id, 'zoom');
  // 3 photos enlarged since: never again.
  assert.ok(tipDue(tipUse(tipUse(st, 'z'), 'z'), MISS));
  assert.strictEqual(tipDue(tipUse(tipUse(tipUse(st, 'z'), 'z'), 'z'), MISS), null);
  // Shown twice: never a third time.
  st = tipShown(st, 'zoom');
  st = visit(st, 500);
  assert.deepStrictEqual(st.s.zoom, [30, 139]);
  assert.strictEqual(tipDue(st, MISS), null);
});

test('registry: every tip is complete', () => {
  const ids = new Set();
  for (const t of TIPS) {
    assert.ok(t.id && !ids.has(t.id), t.id);
    ids.add(t.id);
    assert.ok(Array.isArray(t.ctx) && t.ctx.length, t.id);
    for (const k of ['target', 'now']) assert.strictEqual(typeof t[k], 'function', t.id + ' ' + k);
    for (const k of ['from', 'wait', 'max', 'every']) assert.ok(Number.isInteger(t[k]) && t[k] >= 0, t.id + ' ' + k);
    assert.ok(t.card && t.card.kick && typeof t.card.body === 'function' && typeof t.card.title === 'function', t.id);
    if (t.act === 'zoom') {
      assert.match(t.card.title({mouse: true}), /^Click/);
      assert.match(t.card.title({mouse: false}), /^Tap/);
    }
  }
});

test('custom quiz tip: for a player who never opened it, from 100 questions, in the Quiz, any break', () => {
  const fresh = (n, z = 3) => played(n, z, tipsInit({u: {d: 1}}));
  assert.strictEqual(tipDue(fresh(99), RIGHT), null);
  assert.strictEqual(tipDue(fresh(100), RIGHT).id, 'custom');
  assert.strictEqual(tipDue(fresh(100), MISS).id, 'custom');
  // Its game is the Quiz: not the custom quiz itself, the duels or another page.
  for (const ctx of ['quiz-custom', 'quiz-duel', 'genera']) assert.strictEqual(tipDue(fresh(150), {...RIGHT, ctx}), null, ctx);
  // Opened once (a count, or a saved selection folded in by quiz.js): never.
  assert.strictEqual(tipDue(tipUse(fresh(150), 'c'), RIGHT), null);
  assert.strictEqual(tipDue(played(150, 3, tipsInit({u: {c: 1, d: 1}})), RIGHT), null);
  // The seed from the log leaves c at 0; a malformed c counts as 0.
  assert.strictEqual(tipsInit(null, [{}, {}]).u.c, 0);
  assert.strictEqual(tipsInit({u: {c: 'x'}}).u.c, 0);
});

test('custom quiz tip: once a visit, twice ever 150 questions apart, after the zoom tip', () => {
  let st = fresh100();
  assert.strictEqual(tipDue(st, RIGHT).id, 'custom');
  st = tipShown(st, 'custom');
  assert.deepStrictEqual(st.s.custom, [100]);
  assert.strictEqual(tipDue(st, RIGHT), null); // same visit
  const visit = (st, n) => played(n, 0, st, st.v.t + TIPR.GAP);
  st = visit(st, 149);
  assert.strictEqual(tipDue(st, RIGHT), null); // 249 questions
  st = played(1, 0, st, st.v.t + MIN);
  assert.strictEqual(tipDue(st, RIGHT).id, 'custom'); // 250
  st = tipShown(st, 'custom');
  assert.strictEqual(tipDue(visit(st, 500), RIGHT), null); // never a third time
  // With both due, the zoom tip (first in the registry) goes first, the other at a later visit.
  const both = played(100, 0, tipsInit({u: {d: 1}}));
  assert.strictEqual(tipDue(both, MISS).id, 'zoom');
  assert.strictEqual(tipDue(tipShown(visit(both, 12), 'zoom'), RIGHT), null);
  assert.strictEqual(tipDue(visit(tipShown(both, 'zoom'), 12), RIGHT).id, 'custom');
});
const fresh100 = () => played(100, 3, tipsInit({u: {d: 1}}));

test('look-alike duels tip: for a player who never opened the Duel tab, from 150 questions, in the Quiz', () => {
  const fresh = (n, st = tipsInit({u: {c: 1, z: 3}})) => played(n, 0, st);
  assert.strictEqual(tipDue(fresh(149), MISS), null);
  assert.strictEqual(tipDue(fresh(150), MISS).id, 'duels'); // a miss: a mix-up just made, the moment
  assert.strictEqual(tipDue(fresh(150), RIGHT), null); // a right answer before 170: not the moment
  assert.strictEqual(tipDue(fresh(169), RIGHT), null);
  assert.strictEqual(tipDue(fresh(170), RIGHT).id, 'duels'); // any break from 20 questions later
  // Its game is the Quiz: not the custom quiz, the Duel tab itself or another page.
  for (const ctx of ['quiz-custom', 'quiz-duel', 'genera']) assert.strictEqual(tipDue(fresh(200), {...MISS, ctx}), null, ctx);
  // Opened once (a count, or a duel in the log folded in by quiz.js): never; a malformed d counts as 0.
  assert.strictEqual(tipDue(tipUse(fresh(200), 'd'), MISS), null);
  assert.strictEqual(tipDue(fresh(200, tipsInit({u: {c: 1, z: 3, d: 1}})), MISS), null);
  assert.strictEqual(tipsInit({u: {d: 'x'}}).u.d, 0);
  assert.strictEqual(tipsInit(null, [{}, {}]).u.d, 0);
});

test('look-alike duels tip: once a visit, twice ever 150 questions apart, after the zoom and Custom quiz tips', () => {
  const visit = (st, n) => played(n, 0, st, st.v.t + TIPR.GAP);
  let st = tipShown(fresh150(), 'duels');
  assert.deepStrictEqual(st.s.duels, [150]);
  assert.strictEqual(tipDue(st, MISS), null); // same visit
  st = visit(st, 149);
  assert.strictEqual(st.u.q, 299);
  assert.strictEqual(tipDue(st, MISS), null);
  st = played(1, 0, st, st.v.t + MIN);
  assert.strictEqual(tipDue(st, MISS).id, 'duels'); // 300
  st = tipShown(st, 'duels');
  assert.strictEqual(tipDue(visit(st, 500), MISS), null); // never a third time
  // With all three due, zoom, then Custom quiz, then this one at later visits.
  const all = played(150, 0, tipsInit({}));
  assert.strictEqual(tipDue(all, MISS).id, 'zoom');
  const z = visit(tipShown(all, 'zoom'), 12);
  assert.strictEqual(tipDue(z, MISS).id, 'custom');
  assert.strictEqual(tipDue(visit(tipShown(z, 'custom'), 12), MISS).id, 'duels');
});
const fresh150 = () => played(150, 0, tipsInit({u: {c: 1, z: 3}}));

// The My mix-ups tip: b.mix is the pairs mixed up TIPR.MIX times or more, counted by quiz.js from the player's record.
test('my mix-ups tip: several pairs mixed up, never saw the view, from 100 questions, in the Quiz or the Custom quiz', () => {
  assert.strictEqual(TIPR.MIX, 3);
  const fresh = n => played(n, 0, tipsInit({u: {c: 1, d: 1, z: 3}})),
    MIXED = {...MISS, mix: 2};
  assert.strictEqual(tipDue(fresh(99), MIXED), null);
  assert.strictEqual(tipDue(fresh(100), MIXED).id, 'mixups'); // a miss: a mix-up just made, the moment
  assert.strictEqual(tipDue(fresh(100), {...RIGHT, mix: 2}), null); // a right answer before 120: not the moment
  assert.strictEqual(tipDue(fresh(119), {...RIGHT, mix: 2}), null);
  assert.strictEqual(tipDue(fresh(120), {...RIGHT, mix: 2}).id, 'mixups'); // any break from 20 questions later
  // One pair, none, or not counted (b.mix missing): not for this player.
  for (const mix of [0, 1, undefined]) assert.strictEqual(tipDue(fresh(200), {...MISS, mix}), null, String(mix));
  assert.strictEqual(tipDue(fresh(200), {...MISS, mix: 5}).id, 'mixups');
  // Its games: the Quiz and the Custom quiz; not the Duel tab nor another page.
  assert.strictEqual(tipDue(fresh(200), {...MIXED, ctx: 'quiz-custom'}).id, 'mixups');
  for (const ctx of ['quiz-duel', 'genera']) assert.strictEqual(tipDue(fresh(200), {...MIXED, ctx}), null, ctx);
  // The view drawn once (a count, or a saved choice folded in by quiz.js): never; a malformed m counts as 0.
  assert.strictEqual(tipDue(tipUse(fresh(200), 'm'), MIXED), null);
  assert.strictEqual(tipDue(played(200, 0, tipsInit({u: {c: 1, d: 1, z: 3, m: 1}})), MIXED), null);
  assert.strictEqual(tipsInit({u: {m: 'x'}}).u.m, 0);
  assert.strictEqual(tipsInit(null, [{}, {}]).u.m, 0);
});

test('my mix-ups tip: once a visit, twice ever 150 questions apart, after the zoom, Custom quiz and duels tips', () => {
  const MIXED = {...MISS, mix: 3},
    visit = (st, n) => played(n, 0, st, st.v.t + TIPR.GAP);
  let st = tipShown(played(100, 0, tipsInit({u: {c: 1, d: 1, z: 3}})), 'mixups');
  assert.deepStrictEqual(st.s.mixups, [100]);
  assert.strictEqual(tipDue(st, MIXED), null); // same visit
  st = visit(st, 149);
  assert.strictEqual(st.u.q, 249);
  assert.strictEqual(tipDue(st, MIXED), null);
  st = played(1, 0, st, st.v.t + MIN);
  assert.strictEqual(tipDue(st, MIXED).id, 'mixups'); // 250
  st = tipShown(st, 'mixups');
  assert.strictEqual(tipDue(visit(st, 500), MIXED), null); // never a third time
  // With all four due, zoom, Custom quiz, duels, then this one at later visits.
  const all = played(150, 0, tipsInit({}));
  assert.strictEqual(tipDue(all, MIXED).id, 'zoom');
  const z = visit(tipShown(all, 'zoom'), 12),
    c = visit(tipShown(z, 'custom'), 12),
    d = visit(tipShown(c, 'duels'), 12);
  assert.strictEqual(tipDue(z, MIXED).id, 'custom');
  assert.strictEqual(tipDue(c, MIXED).id, 'duels');
  assert.strictEqual(tipDue(d, MIXED).id, 'mixups');
});

// The basics tip (d): b.bx is the player the subject's first-launch offer of its basics module is for who never opened it
// (quiz.js tipBasics, read from the player's records).
test('basics tip: only for b.bx, from 30 questions, at the Next after a miss, in the Quiz only', () => {
  const fresh = n => played(n, 0, tipsInit({u: {c: 1, d: 1, z: 3, m: 1}})),
    BX = {...MISS, bx: 1};
  assert.strictEqual(tipDue(fresh(29), BX), null);
  assert.strictEqual(tipDue(fresh(30), BX).id, 'basics'); // a miss: the first genera felt hard, the moment
  assert.strictEqual(tipDue(fresh(30), {...RIGHT, bx: 1}), null); // a right answer before 50: not the moment
  assert.strictEqual(tipDue(fresh(49), {...RIGHT, bx: 1}), null);
  assert.strictEqual(tipDue(fresh(50), {...RIGHT, bx: 1}).id, 'basics'); // any break from 20 questions later
  // Not the player of that offer, or not counted (b.bx missing): none, at any size.
  for (const bx of [0, undefined]) assert.strictEqual(tipDue(fresh(400), {...MISS, bx}), null, String(bx));
  assert.strictEqual(tipDue(fresh(400), {ctx: 'quiz', miss: true, zm: false}), null);
  // Its game: the Quiz; not the Custom quiz, the Duel tab nor another page.
  for (const ctx of ['quiz-custom', 'quiz-duel', 'genera']) assert.strictEqual(tipDue(fresh(100), {...BX, ctx}), null, ctx);
  // No counter of its own: the state holds no basics count (the module's page records its opening); the Identify tip's is i.
  assert.deepStrictEqual(Object.keys(tipsInit(null, []).u).sort(), ['c', 'd', 'i', 'k', 'm', 'q', 'z']);
});

test('basics tip: once a visit, twice ever 150 questions apart, after the other four tips', () => {
  const BX = {...MISS, bx: 1},
    visit = (st, n) => played(n, 0, st, st.v.t + TIPR.GAP);
  let st = tipShown(played(30, 0, tipsInit({u: {c: 1, d: 1, z: 3, m: 1}})), 'basics');
  assert.deepStrictEqual(st.s.basics, [30]);
  assert.strictEqual(tipDue(st, BX), null); // same visit
  st = visit(st, 149);
  assert.strictEqual(st.u.q, 179);
  assert.strictEqual(tipDue(st, BX), null);
  st = played(1, 0, st, st.v.t + MIN);
  assert.strictEqual(tipDue(st, BX).id, 'basics'); // 180
  st = tipShown(st, 'basics');
  assert.strictEqual(tipDue(visit(st, 500), BX), null); // never a third time
  // With all five due (a "new" player at 150 questions), the others first, at later visits.
  const all = played(150, 0, tipsInit({})),
    MBX = {...BX, mix: 3};
  assert.strictEqual(tipDue(all, MBX).id, 'zoom');
  let s = all;
  for (const id of ['zoom', 'custom', 'duels', 'mixups']) {
    assert.strictEqual(tipDue(s, MBX).id, id);
    s = visit(tipShown(s, id), 12);
  }
  assert.strictEqual(tipDue(s, MBX).id, 'basics');
  // A "new" player's early questions: the zoom tip from 20, so it comes before this one in a visit that has both due.
  assert.strictEqual(tipDue(played(40, 0, tipsInit({u: {c: 1, d: 1, m: 1}})), BX).id, 'zoom');
});

test('basics tip: the card speaks the subject’s basics words and never a subject of its own', () => {
  const t = TIPS.find(x => x.id === 'basics'),
    W = [
      {name: 'Coral basics', ask: 'New to corals?', lo: 'Coral basics shows the few words the ID tips use. About 5 minutes.'},
      {name: 'Fish basics', ask: 'New to reef fish?', lo: 'Fish basics shows what to look at first. About 5 minutes.'}
    ];
  for (const w of W) {
    assert.strictEqual(t.card.title({basics: w}), `${w.ask} Try ${w.name}`);
    assert.strictEqual(t.card.body({basics: w}), `${w.lo} It is in Learn, any time.`);
  }
  // Without its words, a plain text that names no subject.
  assert.match(t.card.title({}) + t.card.body({}), /basics/i);
  assert.doesNotMatch(t.card.title({}) + t.card.body({}), /coral|fish|genus|genera/i);
  assert.strictEqual(t.act, 'basics');
});

// The Identify tip (e): the only tip outside the games, on Home or My progress, with the time given (quiz.js tipOut).
const OUT = {ctx: 'home', miss: false, zm: false, mix: 0, bx: 0, ix: 1};
test('identify tip: only for ix and u.i 0, from 200 questions, on Home or My progress, never in a game', () => {
  const fresh = (n, u = {c: 1, d: 1, z: 3, m: 1}) => played(n, 0, tipsInit({u})),
    due = (st, b = OUT) => tipDue(st, b, TIPS, st.v.t + MIN);
  assert.strictEqual(due(fresh(199)), null);
  assert.strictEqual(due(fresh(200)).id, 'identify');
  assert.strictEqual(due(fresh(200), {...OUT, ctx: 'progress'}).id, 'identify');
  // Not a subject whose Identify tool is not built (ix 0, or not counted), nor a player who opened the tool (i).
  for (const ix of [0, undefined]) assert.strictEqual(due(fresh(400), {...OUT, ix}), null, String(ix));
  assert.strictEqual(due(fresh(400, {c: 1, d: 1, z: 3, m: 1, i: 1})), null);
  // Its pages only: never at a break of a game, nor another page.
  for (const ctx of ['quiz', 'quiz-custom', 'quiz-duel', 'genera', 'about']) assert.strictEqual(due(fresh(400), {...OUT, ctx}), null, ctx);
  // A game's break (no time) never picks it, and its own state holds a count only in u.i.
  assert.strictEqual(tipDue(fresh(400), {...MISS, ix: 1}), null);
  assert.strictEqual(TIPS.find(t => t.id === 'identify').out, true);
  for (const t of TIPS.filter(t => t.id !== 'identify')) assert.ok(!t.out && !t.ctx.includes('home') && !t.ctx.includes('progress'), t.id);
});

test('identify tip: a page has no first-answers floor; the visit is the last one, over after 30 minutes', () => {
  const base = tipsInit({u: {c: 1, d: 1, z: 3, m: 1, q: 250}});
  // Nothing answered this visit (n 0, no visit at all): the floor of the games does not hold it.
  assert.strictEqual(tipDue(base, OUT, TIPS, 1e12).id, 'identify');
  // A tip shown in the visit still open (its last answer less than 30 minutes before) holds; once it is over, a new visit.
  let st = {...base, v: {t: 1e12, n: 12, tip: 1}};
  assert.strictEqual(tipDue(st, OUT, TIPS, 1e12 + TIPR.GAP - 1), null);
  assert.strictEqual(tipDue(st, OUT, TIPS, 1e12 + TIPR.GAP).id, 'identify');
  // A clock gone back is not an open visit: it counts as over.
  assert.strictEqual(tipDue(st, OUT, TIPS, 1e12 - 5).id, 'identify');
});

test('identify tip: shown on a page it stamps the visit, so the answers after it bring no second tip', () => {
  const t0 = 1e12;
  let st = played(250, 0, tipsInit({u: {c: 1, d: 1, m: 1}}), t0); // zoom tip due in a game (z 0), 250 questions
  const now = st.v.t + 5 * MIN;
  assert.strictEqual(tipDue(st, MISS).id, 'zoom');
  assert.strictEqual(tipDue(st, OUT, TIPS, now).id, 'identify');
  st = tipShown(st, 'identify', now);
  assert.deepStrictEqual(st.s.identify, [250]);
  assert.deepStrictEqual(st.v, {t: now, n: 250, tip: 1}); // the visit was open: its answers kept, the time stamped
  assert.strictEqual(tipDue(st, OUT, TIPS, now + MIN), null); // same visit
  // The answers that follow, within 30 minutes of each other, are the same visit: no zoom tip after the tip.
  st = tipNote(st, now + 2 * MIN);
  assert.strictEqual(st.v.tip, 1);
  assert.strictEqual(tipDue(st, MISS), null);
  // A visit later (over 30 minutes), two showings at most, the second 150 questions after the first.
  let later = tipNote(st, now + TIPR.GAP + 5 * MIN);
  assert.strictEqual(later.v.tip, 0);
  assert.strictEqual(tipDue(later, OUT, TIPS, later.v.t + MIN), null); // 251: 150 questions not yet
  later = played(150, 0, later, later.v.t + MIN);
  assert.strictEqual(tipDue(later, OUT, TIPS, later.v.t + MIN).id, 'identify');
  later = tipShown(later, 'identify', later.v.t + MIN);
  assert.strictEqual(tipDue(played(500, 0, later, later.v.t + TIPR.GAP + MIN), OUT, TIPS, 1e13), null); // never a third time
  // A visit over when a tip is shown on a page starts the stamp at no answers.
  const old = tipShown({...tipsInit({u: {q: 300}}), v: {t: t0, n: 40, tip: 0}}, 'identify', t0 + TIPR.GAP + 1);
  assert.deepStrictEqual(old.v, {t: t0 + TIPR.GAP + 1, n: 0, tip: 1});
});

test('identify tip: the card speaks the subject’s Identify words and names no subject of its own', () => {
  const t = TIPS.find(x => x.id === 'identify'),
    key = {name: 'Coral ID Key', ask: 'Stuck on a coral?', lo: 'Tap the clues.'};
  assert.strictEqual(t.card.title({key}), 'Stuck on a coral? Try the Coral ID Key');
  assert.strictEqual(t.card.body({key}), 'Tap the clues. It is under Identify, any time.');
  assert.doesNotMatch(t.card.title({}) + t.card.body({}), /coral|fish|genus|genera|slug/i);
  assert.strictEqual(t.act, 'identify');
  // The words are declared by the one subject whose Identify tool works (rule S1: one place, no test on the subject).
  const app = require('fs').readFileSync(require('path').join(__dirname, '..', 'app.js'), 'utf8');
  assert.strictEqual((app.match(/^\s+idtip: \{/gm) || []).length, 1);
});

// The typed-answers tip (f): the run of typed questions answered "I don't know" (u.k), counted by tipNote's third argument.
const K = {c: 1, d: 1, z: 3, m: 1, i: 1};
test('typed run: tipNote counts the typed "I don\'t know" in a row; a text typed ends it; other questions leave it', () => {
  let st = tipsInit({u: K});
  const run = (...tys) => tys.forEach(ty => (st = tipNote(st, 1e12 + st.u.q * MIN, ty)));
  run('idk', '', 'idk');
  assert.deepStrictEqual([st.u.q, st.u.k], [3, 2]); // a question not typed between changes nothing
  run('typed');
  assert.deepStrictEqual([st.u.q, st.u.k], [4, 0]); // a wrong, a refused or a close text ends the run
  run('idk', 'idk', 'idk', 'idk');
  assert.strictEqual(st.u.k, 4);
  // No third argument: as before (no run touched).
  assert.strictEqual(tipNote(st, st.v.t + MIN).u.k, 4);
});

test('typed run: tipIdkRun reads the run a log ends with, typed questions only (core.js TYPED_RE, ty, rj)', () => {
  const idk = {m: 'quiz|t', ty: ''},
    txt = {m: 'quiz|t', ty: 'porites'},
    refused = {m: 'quiz|t', ty: '', rj: ['poritez']}, // tried a text the game refused, then gave up: a typed answer
    pick = {m: 'quiz|k2', ty: undefined},
    exam = {m: 'quiz|t|x', ty: ''},
    other = {m: 'quiz|tx'}; // no |t token
  const {tipIdkRun} = require('../tips.js');
  assert.strictEqual(tipIdkRun([]), 0);
  assert.strictEqual(tipIdkRun(null), 0);
  assert.strictEqual(tipIdkRun([pick, pick]), 0);
  assert.strictEqual(tipIdkRun([txt, idk, pick, idk, pick, exam]), 3); // picks between are no typed question
  assert.strictEqual(tipIdkRun([idk, idk, txt]), 0);
  assert.strictEqual(tipIdkRun([idk, idk, refused]), 0);
  assert.strictEqual(tipIdkRun([idk, other, null, idk]), 2);
  // The seed of a state made from the log.
  assert.strictEqual(tipsInit(null, [txt, idk, idk, idk]).u.k, 3);
  assert.strictEqual(tipsInit({u: {q: 4}}, [txt, idk, idk, idk]).u.k, 0); // a state that exists is never reseeded
});

test('typed tip: the last 3 typed questions all "I don\'t know"; any break while the run holds; Quiz and Custom quiz', () => {
  const fresh = (n, k, u = K) => played(n, 0, tipsInit({u: {...u, k}})),
    st = fresh(40, 3);
  assert.strictEqual(TIPR.IDK, 3);
  assert.strictEqual(tipDue(fresh(40, 2), MISS), null); // two in a row are no pattern
  assert.strictEqual(tipDue(st, MISS).id, 'typed');
  assert.strictEqual(tipDue(st, RIGHT).id, 'typed'); // no better moment: the first break is the one after the third
  assert.strictEqual(tipDue(fresh(40, 9), MISS).id, 'typed');
  // From the first question: a typed question needs a unit well on its way, and the run needs three of them (the visit's
  // floor of 10 answers holds as for every tip).
  assert.strictEqual(tipDue(fresh(12, 3), MISS).id, 'typed');
  assert.strictEqual(tipDue(played(9, 0, tipsInit({u: {...K, k: 3}})), MISS), null);
  // Its games: the Quiz and the Custom quiz, not the Duel tab (no typed question there) nor a page.
  assert.strictEqual(tipDue(st, {...MISS, ctx: 'quiz-custom'}).id, 'typed');
  for (const ctx of ['quiz-duel', 'home', 'progress', 'genera']) assert.strictEqual(tipDue(st, {...MISS, ctx}), null, ctx);
  assert.strictEqual(tipDue(st, OUT), null);
  // A text typed ends the audience at once.
  assert.strictEqual(tipDue(tipNote(st, st.v.t + MIN, 'typed'), MISS), null);
  assert.ok(!TIPS.find(t => t.id === 'typed').out);
});

test('typed tip: once a visit, twice ever 150 questions apart, after the other five tips', () => {
  const ALL = {...MISS, mix: 3, bx: 1}, // every other tip's audience too
    IDK = MISS,
    visit = (st, n) => played(n, 0, st, st.v.t + TIPR.GAP);
  let st = tipShown(played(30, 0, tipsInit({u: {...K, k: 3}})), 'typed');
  assert.deepStrictEqual(st.s.typed, [30]);
  assert.strictEqual(tipDue(st, IDK), null); // same visit
  st = visit(st, 149);
  assert.strictEqual(tipDue(st, IDK), null); // 179
  st = played(1, 0, st, st.v.t + MIN);
  assert.strictEqual(tipDue(st, IDK).id, 'typed'); // 180
  st = tipShown(st, 'typed');
  assert.strictEqual(tipDue(visit(st, 500), IDK), null); // never a third time
  // With every tip due, the others first, one a visit.
  let all = played(150, 0, tipsInit({u: {k: 3}}));
  const order = [];
  for (let i = 0; i < 8; i++) {
    const t = tipDue(all, ALL);
    if (!t) break;
    order.push(t.id);
    all = visit(tipShown(all, t.id), 12);
  }
  assert.deepStrictEqual(order, ['zoom', 'custom', 'duels', 'mixups', 'basics', 'typed']);
});

test('typed tip: the card names the subject’s own unit and no subject; nothing to open', () => {
  const {SUBJECTS} = require('../core.js'),
    t = TIPS.find(x => x.id === 'typed');
  assert.strictEqual(t.card.kick, 'Did you know?');
  for (const S of SUBJECTS) {
    const b = t.card.body({subj: S});
    assert.ok(b.includes(`retype the ${S.one} once`), S.id);
    assert.match(b, /close spelling counts as right/);
    assert.match(b, /“I don't know” counts as a miss/);
  }
  assert.match(t.card.body({}), /retype the name once/);
  assert.doesNotMatch(t.card.title({}) + t.card.body({}), /coral|fish|genus|genera|slug/i);
  assert.strictEqual(t.act, undefined); // Got it only: the typed form says it again at a close spelling
  // Every subject that has typed questions is served by the same entry: the unit's word is a field of the subject (S1).
  for (const S of SUBJECTS) assert.ok(typeof S.one === 'string' && S.one, S.id);
});

// The card speaks the subject on screen: a fish player is never told to look at the corallites. Every subject gets a
// text; a fish player's never names a coral part. The wording is the subject's (core.js SUBJECTS zoom): tips.js never
// names a subject (rule S1).
test('registry: the card text follows the subject on screen', () => {
  const {SUBJECTS, subjectOf} = require('../core.js');
  for (const t of TIPS)
    for (const S of SUBJECTS)
      for (const mouse of [true, false]) {
        const o = {mouse, subj: S},
          txt = t.card.title(o) + ' ' + t.card.body(o);
        assert.ok(t.card.body(o).length > 10, `${t.id} ${S.id}`);
        if (S.id !== 'coral') assert.doesNotMatch(txt, /corallite|coral/i, `${t.id} ${S.id}: ${txt}`);
        // The unit's word is the subject's own (SUBJECTS one, many): "genera" only where the subject says so.
        if (S.one !== 'genus') assert.doesNotMatch(txt, /genus|genera/i, `${t.id} ${S.id}: ${txt}`);
      }
  const c = TIPS.find(t => t.id === 'custom');
  for (const S of SUBJECTS) assert.ok(c.card.title({subj: S}).includes(S.many), S.id);
  const d = TIPS.find(t => t.id === 'duels');
  for (const S of SUBJECTS) assert.ok(d.card.title({subj: S}).includes(S.many) && d.card.body({subj: S}).includes(S.many), S.id);
  const m = TIPS.find(t => t.id === 'mixups');
  for (const S of SUBJECTS) assert.ok(m.card.body({subj: S}).includes(S.many), S.id);
  assert.match(m.card.body({mouse: true, subj: SUBJECTS[0]}), /Click All on a group/);
  assert.match(m.card.body({mouse: false, subj: SUBJECTS[0]}), /Tap All on a group/);
  const z = TIPS.find(t => t.id === 'zoom');
  assert.match(z.card.body({subj: subjectOf('coral')}), /corallites/);
  assert.match(z.card.body({subj: subjectOf('fish')}), /markings/);
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'tips.js'), 'utf8');
  assert.doesNotMatch(src, /['"`](coral|fish)['"`]/, 'tips.js names a subject');
});
