// Every unit in play met and none may open now (Pierre, 2026-11-12: "on lui dit qu'il a tout vu et ce qui vient ensuite";
// quiz.js allMetDue, allMetNone; app.js UNITS fish done, fishNextOf): the condition on the opening's own candidates, and
// the card's reason and words for each state of the fish path. The card itself, at the break at Next, once per reason, is
// in tests/fish.smoke.js; its layout and keys in the pages smoke's card loop.
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
  block(app, 'const fishNextOf = ', 'const UNITS = {', {file: 'app.js'}) +
    block(quiz, 'const allMetNone = ', 'const allMetTok', {file: 'quiz.js'}) +
    '\nthis.next = fishNextOf; this.none = allMetNone;',
  ctx
);
const {next, none} = ctx;

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
