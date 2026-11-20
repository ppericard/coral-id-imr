require('./slot.js').testGuard();
// tips.js: the "Did you know?" tips' state, targeting and caps (docs/ARCHITECTURE.md "Did you know? tips"). The card
// and the break at Next are checked in Chromium by tests/pages.smoke.js.
const test = require('node:test'),
  assert = require('node:assert');
const {TIPR, TIPS, tipsInit, tipNote, tipUse, tipDue, tipShown} = require('../tips.js');

const MIN = 60000;
// n answers a minute apart from t0, with z photos enlarged before any of them. By default the player has opened the
// Custom quiz (c 1), so only the zoom tip is in play; the Custom quiz tip's tests start from tipsInit({}).
function played(n, z = 0, st = tipsInit({u: {c: 1}}), t0 = 1e12) {
  for (let i = 0; i < z; i++) st = tipUse(st, 'z');
  for (let i = 0; i < n; i++) st = tipNote(st, t0 + i * MIN);
  return st;
}
const MISS = {ctx: 'quiz', miss: true, zm: false},
  RIGHT = {ctx: 'quiz', miss: false, zm: false};

test('tipsInit: empty, malformed, and seeded once from the device answers', () => {
  assert.deepStrictEqual(tipsInit(null, []), {u: {q: 0, z: 0, c: 0}, s: {}, v: {t: 0, n: 0, tip: 0}});
  assert.deepStrictEqual(tipsInit('x', null).u, {q: 0, z: 0, c: 0});
  assert.deepStrictEqual(tipsInit({u: {q: -3, z: 'a'}, s: {zoom: 'x'}, v: 5}, null), {
    u: {q: 0, z: 0, c: 0},
    s: {zoom: []},
    v: {t: 0, n: 0, tip: 0}
  });
  // The seed: the answers' count and their zm flags; never once a state exists.
  const log = [{zm: 1}, {zm: 0}, {}, {zm: 1}, null];
  assert.deepStrictEqual(tipsInit(null, log).u, {q: 4, z: 2, c: 0});
  assert.deepStrictEqual(tipsInit({u: {q: 7, z: 0}}, log).u, {q: 7, z: 0, c: 0});
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
  const fresh = (n, z = 3) => played(n, z, tipsInit({}));
  assert.strictEqual(tipDue(fresh(99), RIGHT), null);
  assert.strictEqual(tipDue(fresh(100), RIGHT).id, 'custom');
  assert.strictEqual(tipDue(fresh(100), MISS).id, 'custom');
  // Its game is the Quiz: not the custom quiz itself, the duels or another page.
  for (const ctx of ['quiz-custom', 'quiz-duel', 'genera']) assert.strictEqual(tipDue(fresh(150), {...RIGHT, ctx}), null, ctx);
  // Opened once (a count, or a saved selection folded in by quiz.js): never.
  assert.strictEqual(tipDue(tipUse(fresh(150), 'c'), RIGHT), null);
  assert.strictEqual(tipDue(played(150, 3, tipsInit({u: {c: 1}})), RIGHT), null);
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
  const both = played(100, 0, tipsInit({}));
  assert.strictEqual(tipDue(both, MISS).id, 'zoom');
  assert.strictEqual(tipDue(tipShown(visit(both, 12), 'zoom'), RIGHT), null);
  assert.strictEqual(tipDue(visit(tipShown(both, 'zoom'), 12), RIGHT).id, 'custom');
});
const fresh100 = () => played(100, 3, tipsInit({}));

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
  const z = TIPS.find(t => t.id === 'zoom');
  assert.match(z.card.body({subj: subjectOf('coral')}), /corallites/);
  assert.match(z.card.body({subj: subjectOf('fish')}), /markings/);
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'tips.js'), 'utf8');
  assert.doesNotMatch(src, /['"`](coral|fish)['"`]/, 'tips.js names a subject');
});
