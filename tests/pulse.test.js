// The one-tap question (Pierre, 2026-11-03: varied questions about the same concept, asked now and then): the bank and
// its rotation (core.js PULSEQ, pulsePick, pulseScore) and the spacing (quiz.js PROMPT, promptOk, PULSE, pulseDue, run in
// Node on stubs, as tests/intro.test.js runs model.js).
const test = require('node:test');
const cut = require('./block.js'); // the block of a browser file a test runs, its markers checked
const assert = require('node:assert');
const fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const {PULSEQ, PULSE0, PULSE_SHOWN, PULSE_SKIP, PULSE_NONE, pulseItem, pulseScore, pulsePick} = require('../core.js');

// A seeded generator (mulberry32), so a failure can be replayed.
const rng = seed => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
// n asks in a row on one device: the item ids, the state stored after each.
function asks(n, seed, st = {}) {
  const r = rng(seed),
    out = [];
  for (let i = 0; i < n; i++) {
    const pk = pulsePick(st, r);
    st = {at: i * 40, q: pk.q, left: pk.left};
    out.push(pk.q);
  }
  return out;
}

test('the bank: 4 to 6 one-tap items, each answer on the difficulty or the feel scale, codes the sheet keeps', () => {
  assert.ok(PULSEQ.length >= 4 && PULSEQ.length <= 6);
  assert.strictEqual(new Set(PULSEQ.map(x => x.id)).size, PULSEQ.length, 'ids are unique');
  assert.ok(pulseItem(PULSE0), 'the first item is in the bank');
  for (const it of PULSEQ) {
    assert.match(it.id, /^[a-z]{2,8}$/, 'an id the sheet stores as it is (Where column)');
    assert.ok(it.q.length <= 26, `"${it.q}" fits on a phone row`);
    assert.strictEqual(it.a.length, 3, `${it.id}: three answers, one tap each`);
    assert.strictEqual(new Set(it.a.map(a => a[0])).size, 3);
    for (const [k, t, d, f] of it.a) {
      // The sheet's text_ prefixes = + - @ with a quote: never at the start of a code.
      assert.match(k, /^[a-z]{2,4}$/, `${it.id}: code ${k}`);
      assert.ok(t.length <= 12, `${it.id}: label "${t}" is short`);
      assert.ok(d !== null || f !== null, `${it.id} ${k}: on one scale at least`);
      for (const v of [d, f]) assert.ok(v === null || (v >= -1 && v <= 1));
      assert.deepStrictEqual(pulseScore(it.id, k), {d, f});
    }
    // easy / ok / hard keep their v19 meaning wherever they are used: the sheet's Detail keeps only those three.
    for (const [k, , d] of it.a) if (['easy', 'ok', 'hard'].includes(k)) assert.strictEqual(d, {easy: -1, ok: 0, hard: 1}[k]);
  }
  // Both scales are covered, each by at least two items; difficulty from both sides.
  const on = s => PULSEQ.filter(it => it.a.some(a => a[s] !== null)).length;
  assert.ok(on(2) >= 3 && on(3) >= 2, 'difficulty and feel');
  // The one-sided items balance: "Frustrating?" goes towards hard, "Getting boring?" towards easy, a "no" is 0.
  const sides = PULSEQ.filter(it => it.a.every(a => a[2] === null || a[2] >= 0) && it.a.some(a => a[2] > 0)).length,
    easySides = PULSEQ.filter(it => it.a.every(a => a[2] === null || a[2] <= 0) && it.a.some(a => a[2] < 0)).length;
  assert.strictEqual(sides, easySides, 'as many one-sided items towards hard as towards easy');
  // Rows from before the bank (no item id) are the first item's.
  assert.deepStrictEqual(pulseScore('', 'hard'), {d: 1, f: null});
  assert.deepStrictEqual(pulseScore('nope', 'hard'), {d: null, f: null});
  assert.deepStrictEqual(pulseScore('fun', 'hard'), {d: null, f: null});
  // The prompt's own events (shown, Not now, moved on without a tap) are never an answer of any item, nor scored.
  for (const k of [PULSE_SHOWN, PULSE_SKIP, PULSE_NONE]) {
    assert.match(k, /^[a-z]{4,5}$/);
    for (const it of PULSEQ) assert.deepStrictEqual(pulseScore(it.id, k), {d: null, f: null}, `${it.id} ${k}`);
  }
});

test('rotation: the first ask is the plain question, never the same wording twice in a row, each item as often', () => {
  for (let seed = 1; seed <= 50; seed++) {
    const L = asks(60, seed);
    assert.strictEqual(L[0], PULSE0, 'first ever: the plain question');
    L.slice(1).forEach((q, i) => assert.notStrictEqual(q, L[i], `seed ${seed}: ${L[i]} twice in a row at ask ${i + 1}`));
    // Rounds: each block of PULSEQ.length asks has every item once.
    for (let r = 0; r + PULSEQ.length <= L.length; r += PULSEQ.length)
      assert.strictEqual(new Set(L.slice(r, r + PULSEQ.length)).size, PULSEQ.length, `seed ${seed}: round at ${r}`);
  }
  // Over many seeds, every item opens a round sometimes: the order is not fixed.
  const firsts = new Set();
  for (let seed = 1; seed <= 200; seed++) firsts.add(asks(PULSEQ.length + 1, seed)[PULSEQ.length]);
  assert.strictEqual(firsts.size, PULSEQ.length);
});

test('rotation from what an older app stored, or a broken store', () => {
  // Before the bank: {at} alone = the plain question was asked; the next one is another.
  const pk = pulsePick({at: 120}, rng(3));
  assert.notStrictEqual(pk.q, PULSE0);
  assert.strictEqual(pk.left.length, PULSEQ.length - 1);
  // A round's list with unknown or repeated ids, or the last item again: cleaned, never the same twice in a row.
  const st = {at: 1, q: 'fun', left: ['fun', 'zzz', 'bored', 'bored', 'are']};
  assert.deepStrictEqual(pulsePick(st, rng(1)), {q: 'bored', left: ['are']});
  assert.notStrictEqual(pulsePick({q: 'fun', left: ['fun']}, rng(1)).q, 'fun');
  assert.ok(pulseItem(pulsePick(null, rng(1)).q));
  assert.ok(pulseItem(pulsePick({left: 'x'}, rng(1)).q));
});

// quiz.js's prompt spacing, on stubs: the answers so far, this visit's answers, the page, what is on screen.
function quiz() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'quiz.js'), 'utf8'),
    block = cut(src, '// Out-of-game prompts ("fewer, better pop-ups"', '// Response rate (Pierre');
  assert.ok(block.length > 500, 'the spacing block is found in quiz.js');
  const saved = {},
    ctx = {
      ...require('./subj.stub.js')(), // the corals as the current subject
      a: 0,
      h: 'quiz',
      onScreen: new Set(),
      achBusy: false,
      session: {n: 0, h: []},
      // A fake clock (ms) and model.js SESSION (the test below checks its gap against the admin's and the tips').
      t: 1e12,
      SESSION: {GAP: 30 * 60000},
      store: {get: (k, d) => (k in saved ? JSON.parse(saved[k]) : d), set: (k, v) => (saved[k] = JSON.stringify(v))}
    };
  ctx.Date = {now: () => ctx.t};
  ctx.answersSoFar = () => ctx.a;
  ctx.hashNow = () => ctx.h;
  // quiz.js photoQuiz: the photo quiz and the custom quiz on the genera the player picks (CUSTOM_H).
  ctx.photoQuiz = h => h === 'quiz' || h === 'quiz-custom|play';
  ctx.document = {querySelector: sel => (sel.split(',').some(s => ctx.onScreen.has(s.trim())) ? {} : null)};
  vm.createContext(ctx);
  vm.runInContext(block + '\nthis.Q = {PROMPT, promptOk, promptMark, PULSE, PULSEK, pulseDue, pulseNote, pulseSess};', ctx);
  return {...ctx.Q, ctx};
}

test('spacing: first at PULSE.FIRST answers, then every PULSE.EVERY, longer after Not now, only in the quiz and duels', () => {
  const Q = quiz(),
    c = Q.ctx,
    // A session far enough along (Q.PULSE.SESS_N answers over Q.PULSE.SESS_MS), kept as it is in what is stored.
    long = () => {
      const st = c.store.get(Q.PULSEK, {});
      c.store.set(Q.PULSEK, {...st, v: {t0: c.t - Q.PULSE.SESS_MS - 60000, t: c.t, n: Q.PULSE.SESS_N + 5}});
    },
    at = n => ((c.a = n), long(), Q.pulseDue());
  assert.strictEqual(at(Q.PULSE.FIRST - 1), false, 'not before PULSE.FIRST answers');
  assert.strictEqual(at(Q.PULSE.FIRST), true);
  // Asked at 35: the next one PULSE.EVERY answers later.
  c.store.set(Q.PULSEK, {at: Q.PULSE.FIRST, q: 'are', left: []});
  assert.strictEqual(at(Q.PULSE.FIRST + Q.PULSE.EVERY - 1), false);
  assert.strictEqual(at(Q.PULSE.FIRST + Q.PULSE.EVERY), true);
  // "Not now": PULSE.AFTERX times longer.
  c.store.set(Q.PULSEK, {at: 100, q: 'fit', left: [], x: 1});
  assert.strictEqual(at(100 + Q.PULSE.EVERY), false);
  assert.strictEqual(at(100 + Q.PULSE.EVERY * Q.PULSE.AFTERX - 1), false);
  assert.strictEqual(at(100 + Q.PULSE.EVERY * Q.PULSE.AFTERX), true);
  // A count that went back (a progress reset) starts the spacing over.
  assert.strictEqual(at(60), true);
  // Never outside the quiz and duels, or with the tour or a card on screen.
  c.store.set(Q.PULSEK, {at: 0});
  c.a = 200;
  long();
  assert.strictEqual(Q.pulseDue(), true);
  assert.strictEqual(Q.pulseDue('quiz-duel|Porites|Goniopora'), true);
  assert.strictEqual(Q.pulseDue('quiz-custom|play'), true, 'the custom quiz is a photo quiz');
  for (const h of ['dquiz', 'type', 'g-Porites', 'home']) assert.strictEqual(Q.pulseDue(h), false, h);
  for (const s of ['#tour', '.unlock']) {
    c.onScreen = new Set([s]);
    assert.strictEqual(Q.pulseDue(), false, s);
  }
  c.onScreen = new Set();
  // An old store with no number (a broken value): asked as if never, once the session allows.
  c.store.set(Q.PULSEK, {at: 'x'});
  assert.strictEqual(Q.pulseDue(), false, 'no session kept: not yet');
  long();
  assert.strictEqual(Q.pulseDue(), true);
});

// A player's answers at the given gaps (seconds between two answers), on the fake clock: each one noted as answer() does
// (pulseNote), then the prompt asked when due, as Next does (pulseAsk stubbed down to what it stores). Returns the answer
// counts at which a prompt showed and, for each, its answer number in the session.
function play(Q, gaps) {
  const c = Q.ctx,
    shown = [];
  let inSess = 0;
  for (const g of gaps) {
    c.t += g * 1000;
    const v0 = c.store.get(Q.PULSEK, {}).v;
    inSess = v0 && c.t - v0.t < c.SESSION.GAP ? inSess + 1 : 1;
    c.a++;
    Q.pulseNote();
    if (Q.pulseDue()) {
      const st = c.store.get(Q.PULSEK, {});
      c.store.set(Q.PULSEK, {at: c.a, q: 'are', left: [], v: st.v});
      shown.push([c.a, inSess]);
    }
  }
  return shown;
}

test('session gate: a prompt due at the start of a new session waits for 15 answers and 5 minutes into it', () => {
  const Q = quiz(),
    c = Q.ctx;
  assert.strictEqual(Q.PULSE.SESS_N, 15);
  assert.strictEqual(Q.PULSE.SESS_MS, 5 * 60000);
  // Yesterday: 100 answers, the last prompt at 60, so the counter is due (100 − 60 ≥ 40) when today's session starts.
  c.a = 100;
  c.store.set(Q.PULSEK, {at: 60, q: 'fun', left: ['bored'], v: {t0: c.t - 3600e3, t: c.t, n: 50}});
  c.t += 14 * 3600e3; // the next morning
  // Quick answers (8 s apart): 15 answers come in 2 min, so the 5 minutes decide.
  const quick = play(Q, Array(60).fill(8));
  assert.strictEqual(quick.length, 1, `one prompt in 60 quick answers: ${JSON.stringify(quick)}`);
  const [a, n] = quick[0];
  assert.ok(n >= Q.PULSE.SESS_N, `not before ${Q.PULSE.SESS_N} answers of the session (at ${n})`);
  assert.strictEqual(n, Math.ceil(Q.PULSE.SESS_MS / 1000 / 8) + 1, 'at the first answer 5 minutes in');
  assert.strictEqual(a, 100 + n);
  // The round and the "Not now" mark are kept as they are by the session's own bookkeeping.
  assert.deepStrictEqual(c.store.get(Q.PULSEK, {}).left, []);
});

test('session gate: slow answers wait for 15 answers; a gap of 30 minutes starts the count over', () => {
  const Q = quiz(),
    c = Q.ctx;
  c.a = 100;
  c.store.set(Q.PULSEK, {at: 0});
  // One answer a minute: 5 minutes pass at the 6th answer, the 15th decides.
  let s = play(Q, Array(20).fill(60));
  assert.deepStrictEqual(
    s.map(x => x[1]),
    [Q.PULSE.SESS_N]
  );
  // A new session after a 31-minute break, the counter due again (40 answers on): nothing in its first 14 answers.
  c.store.set(Q.PULSEK, {...c.store.get(Q.PULSEK, {}), at: c.a - 40});
  s = play(Q, [31 * 60, ...Array(30).fill(60)]);
  assert.deepStrictEqual(
    s.map(x => x[1]),
    [Q.PULSE.SESS_N]
  );
  // 29 minutes between two answers stay in one session: no new floor.
  const v = c.store.get(Q.PULSEK, {}).v;
  c.store.set(Q.PULSEK, {...c.store.get(Q.PULSEK, {}), at: c.a - 40});
  s = play(Q, [29 * 60]);
  assert.strictEqual(s.length, 1, 'still the same session, already long: asked at once');
  assert.strictEqual(c.store.get(Q.PULSEK, {}).v.t0, v.t0);
  // A session that ended (its last answer 30 minutes ago or more) is no reason to ask at Next.
  c.store.set(Q.PULSEK, {...c.store.get(Q.PULSEK, {}), at: c.a - 40});
  c.t += 30 * 60000;
  assert.strictEqual(Q.pulseDue(), false);
});

test('session gate: in a long session the cadence is unchanged, one prompt every 40 answers (80 after Not now)', () => {
  const Q = quiz(),
    c = Q.ctx;
  // A brand-new player: 35 answers in all first (the session gate is met long before), then every 40.
  const s = play(Q, Array(200).fill(20));
  assert.deepStrictEqual(
    s.map(x => x[0]),
    [35, 75, 115, 155, 195]
  );
  // After a "Not now": the next one 80 answers later, in the same session.
  c.store.set(Q.PULSEK, {...c.store.get(Q.PULSEK, {}), x: 1});
  const after = play(Q, Array(100).fill(20));
  assert.deepStrictEqual(
    after.map(x => x[0]),
    [195 + 80]
  );
});

test('session gate: a reload is no new session; the stored session survives a broken value', () => {
  const Q = quiz(),
    c = Q.ctx;
  Q.pulseNote();
  c.t += 10000;
  Q.pulseNote();
  // A new page (a reload): the session is read back from the device, not from this page's answers.
  const Q2 = quiz();
  Q2.ctx.t = c.t + 10000;
  Q2.ctx.store.set(Q2.PULSEK, c.store.get(Q.PULSEK, {}));
  Q2.pulseNote();
  assert.deepStrictEqual(Q2.ctx.store.get(Q2.PULSEK, {}).v, {t0: 1e12, t: 1e12 + 20000, n: 3});
  // Broken values start a new session; a clock that went back too.
  for (const v of [null, 'x', {t0: 'a', t: 1, n: 1}, {t0: 1, t: c.t + 1e6, n: 4}]) {
    c.store.set(Q.PULSEK, {at: 3, v});
    Q.pulseNote();
    assert.deepStrictEqual(c.store.get(Q.PULSEK, {}), {at: 3, v: {t0: c.t, t: c.t, n: 1}}, JSON.stringify(v));
  }
  c.store.set(Q.PULSEK, 'broken');
  Q.pulseNote();
  assert.deepStrictEqual(c.store.get(Q.PULSEK, {}), {v: {t0: c.t, t: c.t, n: 1}});
  assert.strictEqual(Q.pulseSess(null), false);
});

test("sessions: one gap for the one-tap question, the tips' visits and the admin's sessions (30 min)", () => {
  const rd = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
  const gap = Number((rd('model.js').match(/const SESSION = \{GAP: (\d+) \* 60000\}/) || [])[1]),
    adm = Number((rd('admin.js').match(/\n  GAP: (\d+), \/\/ minutes between two answers/) || [])[1]);
  assert.strictEqual(gap, 30);
  assert.strictEqual(adm, gap, 'admin.js HEALTH.GAP');
  assert.strictEqual(require('../tips.js').TIPR.GAP, gap * 60000, 'tips.js TIPR.GAP');
  assert.strictEqual(quiz().ctx.SESSION.GAP, gap * 60000, 'the stub here');
});

test('spacing: every out-of-game prompt PROMPT.GAP answers apart, never with the tour, a card or a toast', () => {
  const Q = quiz(),
    c = Q.ctx;
  c.a = 20;
  assert.strictEqual(Q.promptOk(), true, 'nothing shown yet');
  Q.promptMark();
  for (let k = 1; k < Q.PROMPT.GAP; k++) {
    c.a = 20 + k;
    assert.strictEqual(Q.promptOk(), false, `${k} answers after the last prompt`);
  }
  c.a = 20 + Q.PROMPT.GAP;
  assert.strictEqual(Q.promptOk(), true);
  for (const s of ['#tour', '.unlock', '.achpop']) {
    c.onScreen = new Set([s]);
    assert.strictEqual(Q.promptOk(), false, s);
  }
  c.onScreen = new Set();
  c.achBusy = true;
  assert.strictEqual(Q.promptOk(), false, 'a toast waiting');
  c.achBusy = false;
  c.a = 5; // the count went back
  assert.strictEqual(Q.promptOk(), true);
});
