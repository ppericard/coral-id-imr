require('./slot.js').testGuard();
// The engine's cards and notes say in their own data which subject they speak of (rule S1; Pierre, 2026-11-19 15:55:
// keep the templates): core.js subjIn, noteRun, and progress.js RECALC.L read with them by recalcNotice. A note with no
// subj shows in every subject; one with subj only in that subject. The past notes keep the corals' showing.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  block = require('./block.js');
const C = require('../core.js');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'progress.js'), 'utf8'),
  ctx = {};
vm.createContext(ctx);
vm.runInContext(block(SRC, 'const RECALC = {', '\n};\n', {through: true, file: 'progress.js'}) + '\nthis.RECALC = RECALC;', ctx);
const {RECALC} = ctx,
  [a, b] = C.SUBJECTS.map(S => S.id);

test('subjIn: no subj is every subject; a subj, an id or a list, only there', () => {
  assert.ok(C.subjIn({}, a) && C.subjIn({}, b) && C.subjIn(null, a));
  assert.ok(C.subjIn({subj: a}, a) && !C.subjIn({subj: a}, b));
  assert.ok(C.subjIn({subj: [a, b]}, b) && !C.subjIn({subj: []}, a));
});

test('noteRun: the longest run one subject shows, in the subject on screen when it may', () => {
  const n = (id, subj) => ({id, ...(subj ? {subj} : {})}),
    ids = r => [r.sid, r.L.map(x => x.id)];
  assert.deepStrictEqual(ids(C.noteRun([], a)), [a, []]);
  // engine notes: in the subject on screen
  assert.deepStrictEqual(ids(C.noteRun([n(1), n(2)], b)), [b, [1, 2]]);
  // a note about another subject first: in that subject, with the engine notes after it
  assert.deepStrictEqual(ids(C.noteRun([n(1, a), n(2), n(3, b)], b)), [a, [1, 2]]);
  // an engine note first, then one about another subject: the engine note here, the other one on the next card
  assert.deepStrictEqual(ids(C.noteRun([n(1), n(2, a)], b)), [b, [1]]);
  assert.deepStrictEqual(ids(C.noteRun([n(2, a)], b)), [a, [2]]);
});

test('the past notes keep their showing: the corals see every one of them, the others only the engine notes', () => {
  const L = RECALC.L,
    coral = C.SUBJECTS.find(S => S.flat).id,
    notCoral = C.SUBJECTS.filter(S => S.id !== coral).map(S => S.id);
  assert.ok(L.length >= 3 && L.every(x => x.id && x.t && x.p));
  // the two progress notes speak of the corals (genera, Millepora); the typed questions are a mode of every subject
  assert.deepStrictEqual(
    L.map(x => x.subj || ''),
    L.map(x => (/moving-average|millepora/.test(x.id) ? coral : ''))
  );
  for (let seen = -1; seen < L.length; seen++) {
    const due = L.slice(seen + 1);
    // as before: on the corals, or opening on another subject with a coral note due, every note due on one card there
    const r = C.noteRun(due, coral);
    assert.deepStrictEqual([r.sid, r.L], [coral, due], `seen ${seen}, on the corals`);
    for (const s of notCoral) {
      const o = C.noteRun(due, s);
      if (due.length && due[0].subj) assert.deepStrictEqual([o.sid, o.L], [coral, due], `seen ${seen}, on ${s}`);
      else assert.deepStrictEqual([o.sid, o.L], [s, due], `seen ${seen}, on ${s}: the engine notes there`);
    }
  }
});

// progress.js recalcNotice on stubs: subjects with or without answers, the subject on screen, the cards shown.
function notices(played, onScreen, key = '') {
  const fn = block(SRC, '// visit: run inside another subject', '\n}\n', {through: true, file: 'progress.js'}),
    saved = key ? {'reefid-recalc': key} : {},
    shown = [],
    c = {
      RECALC,
      noteRun: C.noteRun,
      SUBJ: {id: onScreen},
      window: {},
      noticeLater: () => false,
      noticeAgain: () => 0,
      toldHas: () => false,
      toldAdd: () => {},
      cardRing: () => '',
      headPct: () => 0,
      store: {get: (k, d) => (k in saved ? saved[k] : d), set: (k, v) => (saved[k] = v)},
      document: {querySelector: () => null},
      cardShow: o => shown.push([c.SUBJ.id, o.title]),
      inSubject: (id, f) => {
        const was = c.SUBJ;
        c.SUBJ = {id};
        try {
          return f();
        } finally {
          c.SUBJ = was;
        }
      }
    };
  c.answersSoFar = () => (played.includes(c.SUBJ.id) ? 50 : 0);
  Object.defineProperty(c, 'P', {get: () => ({})});
  vm.createContext(c);
  vm.runInContext(fn + '\nthis.recalcNotice = recalcNotice;', c);
  c.recalcNotice();
  return {shown, key: saved['reefid-recalc'], said: c.window.RECALC_SAID};
}

test('recalcNotice: the corals as before; a player of another subject alone still gets the engine note there', () => {
  const L = RECALC.L,
    coral = C.SUBJECTS.find(S => S.flat).id,
    other = C.SUBJECTS.find(S => !S.flat).id,
    typed = L.find(x => x.subj == null);
  // a coral player, on either subject: every note due on one card in the corals, newest first (as before)
  for (const on of [coral, other]) {
    const r = notices([coral], on);
    assert.deepStrictEqual(r.shown, [[coral, L[L.length - 1].t]], on);
    assert.strictEqual(r.key, undefined, 'marked by its button only');
  }
  // a new player, nothing played: every note marked seen unshown (as before)
  assert.deepStrictEqual(notices([], coral), {shown: [], key: L[L.length - 1].id, said: 'none'});
  // a player of the other subject alone: the coral notes marked unshown, the engine's note shown in their subject (Codex
  // review #1226)
  const r = notices([other], other);
  assert.deepStrictEqual(r.shown, [[other, typed.t]]);
  assert.strictEqual(r.key, L[L.indexOf(typed) - 1].id);
  // the coral notes seen already: the engine's note in the subject on screen
  assert.deepStrictEqual(notices([coral, other], other, L[L.indexOf(typed) - 1].id).shown, [[other, typed.t]]);
});

test('the apology is an engine template, out of its window', () => {
  assert.ok(!('subj' in C.SORRY));
  assert.ok(Date.now() >= C.SORRY.UNTIL);
  assert.strictEqual(C.sorryDue({felt: {n: 99, h: 9, c: 9}, now: Date.now(), shown: 0}), false);
});
