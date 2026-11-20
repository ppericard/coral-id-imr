require('./slot.js').testGuard();
// Every unit in play met and none may open now: the player is told they have seen everything and what comes next
// (docs/FISH_PATH.md; quiz.js allMetDue, allMetNone; app.js UNITS fish done, fishNextOf): the condition on the
// opening's own candidates, and the card's reason and words for each state of the fish path. The card itself, at the
// break at Next, once per reason, is in tests/fish.smoke.js; its layout and keys in the pages smoke's card loop.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  block = require('./block.js');

const ROOT = path.join(__dirname, '..'),
  app = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8'),
  quiz = fs.readFileSync(path.join(ROOT, 'quiz.js'), 'utf8'),
  ctx = {};
vm.createContext(ctx);
vm.runInContext(
  block(app, 'const fishNextOf = ', "// The tree subjects' shared units", {file: 'app.js'}) +
    block(quiz, 'const allMetNone = ', 'const allMetTok', {file: 'quiz.js'}) +
    '\nthis.next = fishNextOf; this.slug = slugNextOf; this.none = allMetNone;',
  ctx
);
const {next, slug, none} = ctx;

test('allMetNone: nothing left to open, every unit met already asked', () => {
  const met = new Set(['a', 'b']),
    asked = new Set(['a', 'b']),
    shut = new Set(['c']),
    f = (L, A = asked) =>
      none(
        L,
        n => met.has(n),
        n => A.has(n),
        n => !shut.has(n)
      );
  assert.ok(f(['a', 'b', 'c']), 'a and b met and asked, c may not open: none left');
  assert.ok(!f(['a', 'b', 'c', 'd']), 'd not met and may open: not before');
  assert.ok(!f(['a', 'b', 'c'], new Set(['a'])), 'b met on a card, not asked yet: still opening (circle 2 waits for it)');
  assert.ok(!f([]), 'no unit in play: nothing to say');
});

const base = {c3: 0, c3due: true, c3row: false, wait: 0, sci: true, sciDue: true, sciLeft: false};

test('fishNextOf: circle 3 not reached says what it takes', () => {
  const r = next({...base, c3: 33, c3due: false, sci: false, sciDue: false});
  assert.strictEqual(r.k, 'c3');
  assert.strictEqual(r.lines.length, 2, 'one line: no word of genus names before circle 3');
  assert.match(r.lines[1], /^Next: 33 families beyond the IMR course\. .*about Open Water on average/);
  assert.match(r.title, /seen them all, for now/);
  assert.match(r.lines[0], /Every fish family open to you is in your game/);
});

test('fishNextOf: circle 3 declined points to My progress, once its offer will not come back', () => {
  assert.strictEqual(next({...base, c3: 33, c3row: true, c3back: true}), null, 'after a first Not now its offer comes back: no card');
  const r = next({...base, c3: 33, c3row: true});
  assert.strictEqual(r.k, 'beyond');
  assert.match(r.lines[1], /The 33 families beyond the IMR course wait for you: open them in My progress, any time\./);
  assert.match(next({...base, c3: 1, c3row: true}).lines[1], /^The family beyond the IMR course waits for you: open it in My progress/);
});

test('fishNextOf: every family met: the families on their way, then the scientific genus names, else the exams', () => {
  const w = next({...base, wait: 17, sciLeft: true});
  assert.strictEqual(w.k, 'all');
  assert.deepStrictEqual(
    [...w.lines.slice(1)],
    [
      '17 more families join the game as soon as their photos are in.',
      'The scientific genus names of each family come as you reach Advanced on it.'
    ]
  );
  assert.match(next({...base, wait: 1}).lines[1], /^1 more family joins the game as soon as its photos are in\.$/);
  assert.match(next({...base, sci: false}).lines[1], /scientific genus names\. Turn them on in My progress or ⚙ Settings/);
  assert.match(next({...base, sci: false, sciDue: false}).lines[1], /once a family is at Advanced, its scientific genus names are offered/);
  assert.deepStrictEqual([...next(base).lines.slice(1)], ['What’s left: take each family to Instructor, through its mastery exam.']);
  // Circle 3 on but still due and left with photos (its families may open: allMetNone keeps the card away): read as all.
  assert.strictEqual(next({...base, c3: 3}).k, 'all');
});

// The sea slugs' circle 3 opens by itself, with no offer card: before it, the all-met card says what comes next (Pierre,
// 2026-11-20: «Ya pas de carte avant de passer au cercle suivant pour les nudibranches?»), in their words.
test('slugNextOf: before circle 3, what comes next; then the genera on their way, else the exams', () => {
  const r = slug({c3: 32, c3due: false, wait: 4});
  assert.strictEqual(r.k, 'c3');
  assert.strictEqual(r.kick, 'Every genus met');
  assert.match(r.title, /seen them all, for now/);
  assert.deepStrictEqual(
    [...r.lines],
    [
      'Every sea slug genus open to you is in your game: no new one comes for a while.',
      'Next: 32 more genera. They come once you know the genera you have well, about Open Water on average: keep practising them!'
    ]
  );
  assert.match(slug({c3: 1, c3due: false, wait: 0}).lines[1], /^Next: 1 more genus\. /);
  const w = slug({c3: 0, c3due: true, wait: 3});
  assert.strictEqual(w.k, 'all');
  assert.deepStrictEqual([...w.lines.slice(1)], ['3 more genera join the game as soon as their photos are in.']);
  assert.match(slug({c3: 0, c3due: true, wait: 1}).lines[1], /^1 more genus joins the game as soon as its photos are in\.$/);
  assert.deepStrictEqual(
    [...slug({c3: 0, c3due: true, wait: 0}).lines.slice(1)],
    ['What’s left: take each genus to Instructor, through its mastery exam.']
  );
  // No fish word, and no word of the IMR course, on a sea slug card.
  for (const o of [r, w]) assert.ok(!/fish|famil|IMR/i.test(JSON.stringify(o)), JSON.stringify(o));
  // Circle 3 due, its genera opening by themselves (allMetNone keeps the card away): read as all.
  assert.strictEqual(slug({c3: 3, c3due: true, wait: 0}).k, 'all');
});

// The subject's cards (the all-met card, its genus cards: kind SUBJECTS card) draw their medallion from app.js
// CARD_KINDS: every subject's kind has one, else the card shows an empty circle (the sea slugs' did).
test("every subject's card kind has its medallion (app.js CARD_KINDS)", () => {
  const c = {};
  vm.createContext(c);
  vm.runInContext(block(app, 'const CARD_KINDS = ', 'let cardN', {file: 'app.js'}) + '\nthis.K = CARD_KINDS;', c);
  for (const S of require('../core.js').SUBJECTS) assert.ok(S.card && c.K[S.card], `${S.id}: card kind ${S.card}`);
});

test('every tree subject has its all-met card (UNITS done): the fish and the sea slugs', () => {
  const unit = id => {
    const at = app.indexOf(`\n  ${id}: {`);
    assert.ok(at > 0, id);
    return app.slice(at, app.indexOf('\n  },', at));
  };
  assert.match(unit('fish'), /\n {4}done: \(\) => \{[\s\S]*fishNextOf\(/);
  assert.match(unit('seaslug'), /\n {4}done: \(\) => \{[\s\S]*slugNextOf\(/);
});

// Rule D7: the card's device marks are the player's: signing out (and deleting one's own account,
// which clears the device the same way) removes them for every subject and reason, so the next player of a shared device
// gets their own card. The reasons are fishNextOf's k (c3, beyond, all); the key is quiz.js ALLMET.KEY + k.
test('all met: sign-out and account deletion clear its marks, for every subject and reason', () => {
  const core = require('../core.js'),
    {page, withData, loadCodeGs} = require('./syncpage.js'),
    keys = core.SUBJECTS.flatMap(S => ['c3', 'beyond', 'all'].map(k => core.subjDev(S.id, 'allmet-' + k)));
  assert.ok(quiz.includes("const ALLMET = {KEY: 'allmet-'}"), 'the key prefix sync.js clears');
  ['c3', 'beyond', 'all'].forEach(k => assert.ok(app.includes(`k = '${k}'`), `fishNextOf has the reason ${k}`));
  for (const all of [false, true]) {
    const A = page(loadCodeGs(withData()), {
      SYNC: {name: 'Ana B.', pin: '1230', log: [], base: {}},
      ls: Object.fromEntries(keys.map(k => [k, '1']))
    });
    if (!('CUSTOM' in A.ctx)) A.ctx.CUSTOM = {KEY: 'reefid-sync-coral-custom'}; // model.js, not loaded here
    keys.forEach(k => assert.ok(A.store.get(k, null), k + ' set before'));
    vm.runInContext(`signOutClear(${all})`, A.ctx);
    keys.forEach(k => assert.strictEqual(A.store.get(k, null), null, `${k} left after signOutClear(${all})`));
  }
});
