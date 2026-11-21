require('./slot.js').testGuard();
// The pending question (quiz.js PEND; docs/spec/quiz.md "The pending question"): a question shown and not answered is kept
// per subject and game, built again from the current data when the player comes back, and forgotten once answered or when
// its genus or photo left the draw. quiz.js's own code run in Node on stubs (the store, the data, the units in play);
// the page's behaviour (leave to Learn and back, a reload) is tests/pending.smoke.js.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const block = require('./block.js');
const core = require('../core.js');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'quiz.js'), 'utf8');
const SYNC = fs.readFileSync(path.join(__dirname, '..', 'sync.js'), 'utf8');

// Units A-E, each with photos in two views; hidden photos are taken out of the data by the test.
const unitPics = n => ({
  wide: [
    {f: n + '-w1', o: n + '-o1'},
    {f: n + '-w2', o: n + '-o2'}
  ],
  medium: [{f: n + '-m1', o: n + '-o1'}],
  macro: [{f: n + '-c1', o: n + '-o1'}]
});
function world({
  S = core.subjectOf('coral'),
  play = ['A', 'B', 'C', 'D', 'E'],
  met = play,
  open = play,
  sel = null,
  examOk = true,
  hidden = [],
  held = [] // photos the player's reserve holds back from the games (core.js heldOf), asked by the mastery exam only
} = {}) {
  const saved = {},
    ctx = {
      SUBJ: S,
      CUSTOM_H: 'quiz-custom|play',
      VIEWS: [
        ['wide', 'Colony'],
        ['medium', 'Close-up'],
        ['macro', 'Corallites']
      ],
      store: {get: (k, d) => (k in saved ? JSON.parse(saved[k]) : d), set: (k, v) => (saved[k] = JSON.stringify(v))},
      sDev: name => core.subjDev(S.id, name),
      GX: n => (['A', 'B', 'C', 'D', 'E'].includes(n) ? {n, one: 'genus', views: unitPics(n)} : undefined),
      gamePics: (n, v) => (unitPics(n)[v] || []).filter(p => !hidden.includes(p.f) && !held.includes(p.f)),
      heldOf: (g, v) => (unitPics(g.n)[v] || []).filter(p => held.includes(p.f)).map(p => ({...p, ho: 1})),
      gamePhotoOk: () => true,
      uname: n => n,
      pool: () => play,
      introduced: n => met.includes(n),
      unlocked: list => list.filter(n => open.includes(n)),
      customSel: () => sel,
      examReady: () => examOk,
      SEENQ: [],
      qPhotos: q => {
        const set = q[4];
        return set.find ? set.find.map(x => x.p) : [...set.shown, ...(set.hint ? [set.hint] : []), ...(set.reveal || [])];
      },
      QCLOCK: {zm: 0, pre: 0},
      qclockRead: () => ctx.NOW,
      NOW: 4.2,
      $v: {
        querySelector: () => ({
          get isConnected() {
            return ctx.ON;
          }
        })
      },
      ON: true,
      saved
    };
  vm.createContext(ctx);
  vm.runInContext(
    block(SRC, '// The prompts of the formats as the planners', "// The planned questions' photos,", {file: 'quiz.js'}) +
      'this.L = {QPROMPT, PEND, pendKey, pendAll, pendRec, pendBuild, pendOk, pendTake, pendDrop, pendShow, pendDone, pendClock, pendSeen, get PENDQ() {return PENDQ;}};',
    ctx
  );
  return ctx;
}
const ph = (n, k, view) => ({...unitPics(n)[k][0], view});
// A question as the draw makes it (planPhoto and its siblings), by kind.
function make(kind, cur = 'quiz') {
  const q = (t, c, prompt, set, k = 0) => [cur, t, c, prompt, set, k],
    one = (t, view = 'wide') => ({shown: [ph(t, 'wide', 'wide'), ph(t, 'medium', 'medium')], hint: ph(t, 'macro', 'macro')}),
    L = {
      which: () => q('A', ['B', 'A', 'C', 'D'], 'Which genus?', one('A'), 3),
      single: () =>
        q('A', ['B', 'A', 'C', 'D'], 'Which genus?', {shown: [ph('A', 'wide', 'wide')], hint: null, reveal: [ph('A', 'macro', 'macro')]}),
      two: () => q('B', ['B', 'A', 'C', 'D'], 'Which genus?', {shown: [ph('B', 'wide', 'wide'), ph('B', 'macro', 'close')], hint: null}),
      type: () => q('A', ['A', 'B', 'C', 'D'], 'Which genus? Type it', {...one('A'), typed: 1}),
      exam: () => q('C', ['A', 'B', 'C', 'D'], 'Which genus?', {shown: [ph('C', 'wide', 'wide')], hint: null, reveal: [], exam: true}),
      again: () => Object.assign(q('B', ['B', 'A'], 'Again: A or B?', one('B')), {again: 1, pr: ['A', 'B']}),
      look: () => Object.assign(q('B', ['B', 'A'], 'Look-alikes: A or B?', one('B')), {auto: 'A|B', pr: ['A', 'B']}),
      find: () =>
        Object.assign(
          q('C', ['D', 'C', 'A', 'B'], 'Find the C', {
            shown: [ph('C', 'wide', 'wide')],
            hint: null,
            reveal: [],
            find: ['D', 'C', 'A', 'B'].map(n => ({n, p: ph(n, 'wide', 'wide')}))
          }),
          {findx: 1}
        ),
      duel: () => q('B', ['A', 'B'], 'A or B?', one('B')),
      custom: () => Object.assign(q('A', ['B', 'A'], 'Which genus?', one('A'), 2), {custom: 1}),
      warm: () => Object.assign(q('A', ['B', 'A', 'C', 'D'], 'Which genus?', one('A'), 3), {warm: 1, cb: 0.62})
    };
  return L[kind]();
}
// Arrays with named properties: compared as the array and its flags.
const flat = q => JSON.stringify([...q]) + JSON.stringify(Object.fromEntries(Object.entries(q)));

test('a kept question comes back as it was: every format, its flags, photos and prompt', () => {
  const kinds = {
    which: 'quiz',
    single: 'quiz',
    two: 'quiz',
    type: 'quiz',
    exam: 'quiz',
    again: 'quiz',
    look: 'quiz',
    find: 'quiz',
    custom: 'quiz-custom|play',
    warm: 'quiz',
    duel: 'quiz-duel'
  };
  for (const [kind, cur] of Object.entries(kinds)) {
    const w = world(),
      q = make(kind, cur),
      r = w.L.pendRec(cur, q);
    assert.ok(r, kind + ': kept');
    const back = w.L.pendBuild(cur, JSON.parse(JSON.stringify(r)));
    assert.ok(back, kind + ': built again');
    assert.strictEqual(flat(back), flat(q), kind);
  }
});

test('the prompts a kept question is built with are the planners: planPhoto, planFind and planDuel write the same words', () => {
  const qp = block(SRC, 'const QPROMPT = {', '\n};\n', {file: 'quiz.js'}),
    rest = SRC.replace(qp, ''),
    lits = [...qp.matchAll(/=> (`[^`]*`)/g)].map(m =>
      m[1].replace(/uname\(a\)/g, 'uname(pair[0])').replace(/uname\(b\)/g, 'uname(pair[1])')
    );
  assert.strictEqual(lits.length, 6, 'the six prompts: which, type, find, again, look, duel');
  for (const l of lits) assert.ok(rest.includes(l), `a planner no longer writes ${l}`);
});

test('a question with a first-meeting card, or a photo with no file name, is not kept', () => {
  const w = world(),
    q = Object.assign(make('which'), {intro: ['A'], start: false});
  assert.strictEqual(w.L.pendRec('quiz', q), null);
  const bad = make('which');
  delete bad[4].shown[0].f;
  assert.strictEqual(w.L.pendRec('quiz', bad), null);
});

test('a kept question is built from the current data: a photo or a genus gone ends it, nothing stored reaches the page unchecked', () => {
  const r = world().L.pendRec('quiz', make('which'));
  assert.ok(world().L.pendBuild('quiz', r));
  // its photo hidden (curation), its hint, a revealed view, a Find the X tile
  assert.strictEqual(world({hidden: ['A-w1']}).L.pendBuild('quiz', r), null);
  assert.strictEqual(world({hidden: ['A-c1']}).L.pendBuild('quiz', r), null);
  const f = world().L.pendRec('quiz', make('find'));
  assert.strictEqual(world({hidden: ['D-w1']}).L.pendBuild('quiz', f), null);
  // a stored unit that is no unit, a prompt or a choice with markup, a format the game does not have
  const bad = x => world().L.pendBuild('quiz', {...r, ...x});
  assert.strictEqual(bad({t: '<img src=x onerror=alert(1)>'}), null);
  assert.strictEqual(bad({c: ['A', '<b>x</b>']}), null);
  assert.strictEqual(bad({kind: 'duel'}), null, 'a duel format in the Quiz');
  assert.strictEqual(bad({kind: 'nothing'}), null);
  assert.strictEqual(bad({sh: []}), null);
  assert.strictEqual(bad({sh: [['A-w1']]})[4].shown[0].view, '', 'a stored photo with no view');
  assert.strictEqual(bad({c: ['A']}), null);
  // the prompt is the game's own words from the units, never stored text
  assert.strictEqual(bad({prompt: '<b>x</b>'})[3], 'Which genus?');
  assert.strictEqual(world().L.pendBuild('quiz-duel', r), null, 'a Quiz question in the Duel tab');
});

test('a mastery exam question on a photo the player reserve holds back comes back; no other question may show one', () => {
  const ex = make('exam'), // its photo: C-w1
    held = {held: ['C-w1']},
    r = world(held).L.pendRec('quiz', ex);
  assert.ok(world(held).L.pendBuild('quiz', r), 'an exam question on a held photo');
  assert.strictEqual(world({hidden: ['C-w1']}).L.pendBuild('quiz', r), null, 'hidden, it is gone');
  assert.strictEqual(world(held).L.pendBuild('quiz', {...r, ex: 0}), null, 'a question that is not an exam one never shows a held photo');
});

test('still askable: the genus in play and met, the custom selection, the Duel tab unlocked, the exam due', () => {
  const q = make('which'),
    ok = (o, cur = 'quiz', x = q) => world(o).L.pendOk(cur, x);
  assert.strictEqual(ok({}), true);
  assert.strictEqual(ok({play: ['B', 'C', 'D', 'E']}), false, 'its genus left the genera in play (a setting, Open all off)');
  assert.strictEqual(ok({play: ['A', 'C', 'D', 'E']}), false, 'a choice left them');
  assert.strictEqual(ok({met: ['B', 'C', 'D', 'E']}), false, 'its genus closed again (One at a time) or reset');
  const cu = make('custom', 'quiz-custom|play');
  assert.strictEqual(ok({sel: ['A', 'B']}, 'quiz-custom|play', cu), true);
  assert.strictEqual(ok({sel: ['B', 'C']}, 'quiz-custom|play', cu), false, 'its genus left the picked ones');
  assert.strictEqual(ok({sel: null}, 'quiz-custom|play', cu), false);
  const du = make('duel', 'quiz-duel');
  assert.strictEqual(ok({}, 'quiz-duel', du), true);
  assert.strictEqual(ok({open: ['A', 'C']}, 'quiz-duel', du), false, 'a genus of the pair not unlocked');
  const ex = make('exam');
  assert.strictEqual(ok({examOk: true}, 'quiz', ex), true);
  assert.strictEqual(ok({examOk: false}, 'quiz', ex), false, 'its exam is not due any more');
});

test('kept per subject and game, until answered: shown, taken, answered; a bad record is forgotten', () => {
  const w = world(),
    L = w.L,
    q = make('which');
  L.pendShow('quiz', q, null);
  assert.deepStrictEqual(Object.keys(w.saved), ['reefid-pending'], 'a device key, the corals');
  assert.strictEqual(L.PENDQ.cur, 'quiz');
  const k = L.pendTake('quiz');
  assert.strictEqual(flat(k.q), flat(q));
  assert.strictEqual(L.pendTake('quiz-duel'), null, 'one question per game');
  // the Duel tab and a pair's drill keep their own
  L.pendShow('quiz-duel', make('duel', 'quiz-duel'), null);
  L.pendShow('quiz-duel|A|B', make('duel', 'quiz-duel|A|B'), null);
  assert.ok(L.pendTake('quiz') && L.pendTake('quiz-duel') && L.pendTake('quiz-duel|A|B'));
  // answered (question's go): nothing kept for the game on screen, the others stay
  L.pendDone();
  assert.strictEqual(L.pendTake('quiz-duel|A|B'), null);
  assert.ok(L.pendTake('quiz'));
  assert.strictEqual(L.PENDQ, null);
  // a record that cannot be built is dropped from the store as it is read
  w.saved['reefid-pending'] = JSON.stringify({quiz: {t: 'Z', c: ['A', 'B'], sh: [['A-w1', 'wide']], kind: 'which'}});
  assert.strictEqual(L.pendTake('quiz'), null);
  assert.deepStrictEqual(JSON.parse(w.saved['reefid-pending']), {});
  // storage holding anything else: no record
  for (const bad of ['"x"', '[1]', 'null', '7']) {
    w.saved['reefid-pending'] = bad;
    assert.strictEqual(L.pendTake('quiz'), null, bad);
  }
  // the fish's own key
  const f = world({S: core.subjectOf('fish')});
  f.L.pendShow('quiz', make('which'), null);
  assert.deepStrictEqual(Object.keys(f.saved), ['reefid-fish-pending']);
});

test('a question that cannot be kept replaces the one kept before it; at most PEND.MAX games are kept', () => {
  const w = world(),
    L = w.L;
  L.pendShow('quiz', make('which'), null);
  L.pendShow('quiz', Object.assign(make('which'), {intro: ['A']}), null);
  assert.strictEqual(L.pendTake('quiz'), null);
  assert.strictEqual(L.PENDQ, null);
  for (let i = 0; i < L.PEND.MAX + 3; i++) L.pendShow(`quiz-duel|A|${i}`, make('duel', `quiz-duel|A|${i}`), null);
  assert.strictEqual(Object.keys(L.pendAll()).length, L.PEND.MAX);
  assert.ok(L.pendAll()[`quiz-duel|A|${L.PEND.MAX + 2}`], 'the newest stay');
});

test('response time: the seconds looked before leaving come back, the time away is not counted', () => {
  const w = world(),
    L = w.L;
  L.pendShow('quiz', make('which'), null);
  w.NOW = 7.3; // the clock's reading when the player leaves (qclockRead: only the time the question was on screen)
  L.pendClock();
  let k = L.pendTake('quiz');
  assert.strictEqual(k.rt, 7.3);
  // back: the clock carries them (QCLOCK.pre, read by qclockRead), the enlarged flag too
  w.QCLOCK.zm = 1;
  L.pendClock();
  k = L.pendTake('quiz');
  L.pendShow('quiz', k.q, k);
  assert.strictEqual(w.QCLOCK.pre, 7.3);
  assert.strictEqual(w.QCLOCK.zm, 1);
  // left again before its first photo is in (the clock has not started: qclockRead is null): the seconds carried stay
  w.NOW = null;
  L.pendClock();
  assert.strictEqual(L.pendTake('quiz').rt, 7.3, 'the seconds carried are not overwritten by a clock that has not started');
  w.NOW = 7.3;
  // another page: no write (the question is not on screen, its clock would count the time away)
  w.ON = false;
  w.NOW = 99;
  L.pendClock();
  assert.strictEqual(L.pendTake('quiz').rt, 7.3);
  // answered: nothing is written
  w.ON = true;
  L.pendDone();
  L.pendClock();
  assert.strictEqual(L.pendTake('quiz'), null);
});

test('response time: the clock adds the seconds looked before to those since, starts over with a new question or a card', () => {
  const src = block(SRC, 'const QCLOCK = {', 'function question(', {file: 'quiz.js'}),
    t = {now: 1000};
  const ctx = {
    performance: {now: () => t.now},
    document: {hidden: false, addEventListener: () => {}},
    addEventListener: () => {},
    pendClock: () => {},
    $v: {querySelectorAll: () => []}
  };
  vm.createContext(ctx);
  vm.runInContext(src + 'this.L = {QCLOCK, qclockStart, qclockRead, qclockArm, qclockGo, qclockAgain};', ctx);
  const {QCLOCK, qclockStart, qclockRead, qclockArm, qclockGo, qclockAgain} = ctx.L;
  qclockStart();
  t.now += 4000;
  assert.strictEqual(qclockRead(), 4);
  QCLOCK.pre = 7.3;
  t.now += 2000;
  assert.strictEqual(qclockRead(), 13.3, 'the seconds before the player left, plus the seconds since');
  QCLOCK.pre = 700;
  assert.strictEqual(qclockRead(), 600, 'capped as it was');
  QCLOCK.pre = 7.3;
  qclockAgain();
  assert.strictEqual(QCLOCK.pre, 0, 'a card closing starts the reading over');
  QCLOCK.pre = 3;
  qclockArm();
  assert.strictEqual(QCLOCK.pre, 0, 'a new question starts at zero');
  assert.strictEqual(qclockRead(), null, 'not started before its first photo is in');
  // a kept question whose photos are not in yet: the seconds carried wait for the first of them (qclockGo)
  QCLOCK.pre = 7.3;
  t.now += 1000;
  qclockGo();
  assert.strictEqual(QCLOCK.pre, 7.3, 'the first photo starting the clock keeps the seconds carried');
  t.now += 2000;
  assert.strictEqual(qclockRead(), 9.3);
});

test('the photos of a kept question replace the window entry of their first showing, never repeat it', () => {
  const w = world(),
    q = make('which'),
    e = qq => ({s: qq[4], L: w.qPhotos(qq)});
  w.SEENQ = [e(make('two')), e(q), e(make('exam'))];
  w.L.pendSeen(q);
  assert.strictEqual(w.SEENQ.length, 2, 'the question shown before is no more in it, question() adds it again');
});

test('sign-out and account deletion clear the kept questions, for every subject', () => {
  const {page, withData, loadCodeGs} = require('./syncpage.js'),
    keys = core.SUBJECTS.map(S => core.subjDev(S.id, 'pending'));
  assert.deepStrictEqual(keys.slice(0, 2), ['reefid-pending', 'reefid-fish-pending']);
  assert.ok(SRC.includes("const PEND = {KEY: 'pending'"), 'the key sync.js clears');
  assert.ok(SYNC.includes("'basics', 'pending']"));
  for (const all of [false, true]) {
    const A = page(loadCodeGs(withData()), {
      SYNC: {name: 'Ana B.', pin: '1230', log: [], base: {}},
      ls: Object.fromEntries(keys.map(k => [k, JSON.stringify({quiz: {t: 'A'}})]))
    });
    if (!('CUSTOM' in A.ctx)) A.ctx.CUSTOM = {KEY: 'reefid-sync-coral-custom'};
    vm.runInContext(`signOutClear(${all})`, A.ctx);
    keys.forEach(k => assert.strictEqual(A.store.get(k, null), null, `${k} left after signOutClear(${all})`));
  }
});
