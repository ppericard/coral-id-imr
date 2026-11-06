// The cards that tell a player about a subject (progress.js subjHello, helloDue, helloMode; Pierre, 2026-11-05: "a proper
// card the player closes, shown once, at a calm moment"; 2026-11-06: while fish opens to a group he picks, the card is an
// invitation to test the fish beta, for the players of that group only). helloDue decides, on its inputs only: 'show',
// 'met' (seen without a card) or '' (not now). The card itself, its calm moment and its buttons are in tests/fish.smoke.js.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  block = require('./block.js');

const ROOT = path.join(__dirname, '..'),
  src = fs.readFileSync(path.join(ROOT, 'progress.js'), 'utf8'),
  app = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8'),
  ctx = {subjGroup: S => !!S && S.open === 'group'};
vm.createContext(ctx);
vm.runInContext(
  block(src, 'const HELLO = ', 'let helloT = 0;', {file: 'progress.js'}) + '\nthis.due = helloDue; this.mode = helloMode; this.H = HELLO;',
  ctx
);
const {due, mode, H} = ctx,
  base = {card: {title: 'x'}, member: true, admin: false, seen: false, met: false, answers: H.MIN};

test('helloDue: shown to a settled member, once', () => {
  assert.strictEqual(due(base), 'show');
  assert.strictEqual(due({...base, seen: true}), '', 'once: never again once seen');
});

test('helloDue: never to a non-member, never the admin, never without a card', () => {
  assert.strictEqual(due({...base, member: false}), '', 'only to the players the card is for (the group, for the invitation)');
  assert.strictEqual(due({...base, admin: true}), '', "never in the admin's browser");
  assert.strictEqual(due({...base, card: undefined}), '', 'no words for this way of opening: no card');
});

test('helloDue: a player who has played the subject already is marked seen without a card', () => {
  assert.strictEqual(due({...base, met: true}), 'met');
  assert.strictEqual(due({...base, met: true, answers: 0}), 'met', 'whatever their answers');
  assert.strictEqual(due({...base, met: true, member: false}), '', 'but only a member');
});

test('helloDue: a new player waits until settled (HELLO.MIN answers), nothing marked', () => {
  assert.ok(H.MIN > 0);
  assert.strictEqual(due({...base, answers: 0}), '');
  assert.strictEqual(due({...base, answers: H.MIN - 1}), '');
  assert.strictEqual(due({...base, answers: H.MIN + 50}), 'show');
});

test('helloMode: one card per way the subject opens, each with its own seen mark', () => {
  assert.strictEqual(mode({open: 'group'}), 'group');
  assert.strictEqual(mode({open: 'all'}), 'all');
  assert.strictEqual(mode({}), 'all');
  assert.notStrictEqual(H.KEY + mode({open: 'group'}), H.KEY + mode({open: 'all'}), 'the invitation never hides a later card');
});

test('the invitation: for the group and, open to all, for every player while in beta; no date (Pierre, 2026-11-06, Q158)', () => {
  const hello = block(app, '    hello: {', '\n    },\n', {through: true, file: 'app.js'});
  assert.ok(/\bgroup: \{/.test(hello), 'the group card (the invitation)');
  assert.ok(/\ball: \{/.test(hello), 'the same invitation to every player once the subject opens to all (Q158)');
  assert.ok(!/invited to the group|your group/i.test(hello), 'never "invited to the group"');
  assert.ok(!/everyone|\ball players\b|release|\b20\d\d\b|\bsoon\b/i.test(hello), 'no release, date or "everyone" in its words');
});

test('subjHello: the group card to the group (subjGroups); the all card while in beta only', () => {
  const fn = block(src, 'function subjHello() {', '\n}\n', {through: true, file: 'progress.js'});
  assert.ok(/subjGroups\(\)\.includes\(S\.id\)/.test(fn), 'members of the group only');
  assert.ok(/helloMode\(S\) === 'all' && !S\.beta \? null/.test(fn), "the 'all' card only while the subject keeps its beta label");
  assert.ok(/UNITS\[S\.id\]\.hello/.test(fn), 'the subject with a card is found by its data (UNITS hello)');
  assert.ok(!/SUBJECTS\[\d+\]/.test(fn), 'no subject tested by its place (Codex review #598)');
});
