require('./slot.js').testGuard();
// "Mystery" tiles on My progress (Pierre, 2026-11-04; docs/ROADMAP.md row built 2026-11-15): a unit the player has never
// met is a masked tile. Who sees them is the subject's (app.js UNITS mystery, from the first-launch answer: every fish
// player, the corals for "I'm new to corals" only); which units, progress.js mysteryOf: never answered and never in the
// intro map (a card, Open all, closed again by "One at a time" all count as met). progress.js runs here on stubs, as
// tests/unlockcount.test.js; the tiles themselves are checked in the pages smoke (corals) and the fish smoke.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  block = require('./block.js');

const ROOT = path.join(__dirname, '..'),
  SRC = fs.readFileSync(path.join(ROOT, 'progress.js'), 'utf8'),
  APP = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');

// The subject's rule, read from app.js UNITS: its mystery function, run on an answer.
const rule = (from, to) => {
  const part = block(APP, from, to, {file: 'app.js'}),
    m = part.match(/\n {4}mystery: ([^\n]+),\n/);
  assert.ok(m, `no mystery in ${from.trim()}`);
  return vm.runInNewContext(`(${m[1]})`);
};

test('UNITS: the corals mask for "new" only, the fish for everyone', () => {
  const coral = rule('const UNITS = {\n  coral: {', '\n  fish: {'),
    fish = rule('\n  fish: {', '\n};\n');
  assert.strictEqual(coral('new'), true, 'a player new to corals sees them');
  for (const c of ['imr', 'know', null]) assert.strictEqual(coral(c), false, `${c}: the genera as before`);
  for (const c of ['new', 'imr', 'know', null]) assert.strictEqual(fish(c), true, `${c}: every fish player`);
});

function run({mystery, start = null, answers = {}, intro = {}}) {
  const code = block(SRC, '// "Mystery" tiles (Pierre, 2026-11-04', '// Header progress pill', {file: 'progress.js'}),
    ctx = {
      SUBJ: {id: 's'},
      UNITS: {s: mystery === undefined ? {} : {mystery}},
      startOf: () => start,
      asked: n => !!answers[n],
      introMap: () => intro
    };
  vm.createContext(ctx);
  vm.runInContext(code + '\nthis.T = {mysteryOn, mysteryOf};', ctx);
  return ctx.T;
}

test('mysteryOn: the subject decides from the answer given', () => {
  const said = [];
  const T = run({mystery: c => (said.push(c), c === 'new'), start: {c: 'new', t: 1}});
  assert.strictEqual(T.mysteryOn(), true);
  assert.deepStrictEqual(said, ['new'], 'the answer given (c), not the eased band');
  assert.strictEqual(run({mystery: c => c === 'new', start: {c: 'imr', t: 1, ease: ['new', 3, 1]}}).mysteryOn(), false, 'eased: still imr');
  assert.strictEqual(run({mystery: c => c === 'new'}).mysteryOn(), false, 'no answer yet: as before');
  assert.strictEqual(run({mystery: () => true}).mysteryOn(), true, 'every player, an answer or not');
  assert.strictEqual(run({}).mysteryOn(), false, 'a subject without the field: never');
});

test('mysteryOf: only the units never met', () => {
  const T = run({
      mystery: () => true,
      answers: {A: 1, B: 1},
      intro: {B: [5, 0, 1, 'b'], C: [3, 1, 1, 'c'], D: [0, 1, 1, 'a']}
    }),
    m = T.mysteryOf();
  assert.strictEqual(m('A'), false, 'answered: never masked, its progress shows');
  assert.strictEqual(m('B'), false, 'closed again by "One at a time": met once, stays shown');
  assert.strictEqual(m('C'), false, 'met on a card, not asked yet');
  assert.strictEqual(m('D'), false, 'opened by Open all');
  assert.strictEqual(m('E'), true, 'never met: a mystery tile');
  assert.strictEqual(T.mysteryOf(false)('E'), false, 'off for this player: every unit shown');
});

test('quizBoard: every view masks through the one rule, and a masked tile names nothing', () => {
  const qb = block(SRC, 'function quizBoard() {', '\n}\n', {through: 1, file: 'progress.js'});
  // the photo wall, the slate and its bonus strip, the groups and their bonus row
  assert.strictEqual((qb.match(/\bmyst\(n\)/g) || []).length, 5, 'the five places a unit is drawn');
  const mk = block(qb, 'mystA = ', ';\n', {file: 'progress.js quizBoard'});
  assert.doesNotMatch(mk, /href|tip\(|\$\{n\}|esc\(n\)/, 'no link, no tooltip, no name');
  const code = block(SRC, '// "Mystery" tiles (Pierre, 2026-11-04', '// Header progress pill')
    .split('\n')
    .filter(l => !l.trim().startsWith('//'))
    .join('\n');
  assert.doesNotMatch(code, /\b(coral|fish|new|imr|know)\b/i, 'the rule names no subject and no answer: UNITS does');
});
