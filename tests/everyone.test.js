// Every account counts in the admin's stats (Pierre, 2026-11-04: his account is a real player's, the "Without me",
// "Others / Me" and "This is also me" exceptions are gone; the leaderboard's "hidden" filters nothing either). The admin's
// answer rows are the whole log (playerRows; rowsOf, a subject's), the photo ratings the sheet's (photoStats), and no code path drops answers by
// who sent them: a source check, since these are the pages' own lines.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  block = require('./block');
const ROOT = path.join(__dirname, '..'),
  read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

// The one exception (Pierre, 2026-11-05, Q86): the answers a deleted account left (sheet v55, anonymous flag 2) are no
// player anywhere; they only rate the photos (photoStats, the sheet's).
test('playerRows is every answer and photoStats the sheet ratings, whoever answered (but a deleted account)', () => {
  const src = read('admin.js'),
    ctx = {
      ANS: {
        rows: [
          ['me', 1],
          ['ana', 2],
          ['ana', 3],
          ['del', 4, '', '', 0, '', '', null, null, null, '', 2]
        ]
      },
      STATS: {p: [0, 1]},
      MEID: 'me'
    };
  vm.runInNewContext(
    [
      block(src, 'const isMe = ', '\n', {file: 'admin.js', through: true}),
      block(src, 'const photoStats = ', '\n', {file: 'admin.js', through: true}),
      block(src, 'const goneRow = ', '\n', {file: 'admin.js', through: true}),
      block(src, 'const playerRows = ', '\n', {file: 'admin.js', through: true}),
      'this.r = [playerRows().length, photoStats() === STATS, isMe("me"), isMe("ana")];'
    ].join('\n'),
    ctx
  );
  assert.deepStrictEqual(JSON.parse(JSON.stringify(ctx.r)), [3, true, true, false]);
});

test('no admin page filters answers or players by who they are (isMe is a mark only; the board flag filters nothing)', () => {
  const files = ['admin.js', 'admin-journey.js', 'admin-analyses.js', 'analysis.js'];
  for (const f of files) {
    const src = read(f);
    for (const bad of [
      'myIds',
      'ME_KEY',
      'ELO_NOME',
      'noneButMe',
      'eloSeg',
      'SF.who',
      'SF.elo',
      'data-ume=',
      'reefid-admin-me',
      'Without me'
    ])
      assert.ok(!src.includes(bad), `${f} still has ${bad}`);
    src.split('\n').forEach((l, i) => {
      assert.ok(!/\.filter\([^)]*isMe\(/.test(l), `${f}:${i + 1} filters by isMe: ${l.trim()}`);
      assert.ok(!/\.filter\([^)]*board\s*===?\s*-1/.test(l), `${f}:${i + 1} filters by the leaderboard flag: ${l.trim()}`);
    });
  }
});

// Codex review #600: the Inbox's Health line (healthLine0) reads the player rows, never the answers a deleted account
// left (sheet v55 flag 2), as the Health page does.
test('the Health line reads the player rows, not a deleted account', () => {
  const src = read('admin.js'),
    b = block(src, 'function healthLine0() {', '\n}', {file: 'admin.js', through: true});
  assert.match(b, /playerRows\(\)/);
  assert.doesNotMatch(b, /ANS\.rows/);
});

// Codex review #600: an answer log dropped while the Analyses pages read it (a delete or merge: sheetAgain) is read
// again by the redraw that follows: the guard is cleared before the redraw, not after it.
test('Analyses: an answer log dropped during its read is read again', async () => {
  const src = read('admin-analyses.js'),
    ctx = {TOKEN: 't', ANS: null, ANREP: {}, cur: 'analyses/overview', anPage: p => p.startsWith('analyses/'), calls: 0, Promise};
  ctx.loadStats = () => {
    ctx.calls++;
    return Promise.resolve().then(() => {
      // the first read lands, then a delete drops it again (sheetAgain('ans')) before the redraw
      ctx.ANS = ctx.calls === 1 ? null : {rows: []};
    });
  };
  ctx.render = () => ctx.anAnsLoad();
  vm.runInNewContext(
    [
      block(src, 'let anAnsP = ', '\n', {file: 'admin-analyses.js', through: true}),
      block(src, 'function anAnsLoad() {', '\n}', {file: 'admin-analyses.js', through: true}),
      'this.anAnsLoad = anAnsLoad;'
    ].join('\n'),
    ctx
  );
  ctx.anAnsLoad();
  for (let i = 0; i < 10; i++) await Promise.resolve();
  assert.strictEqual(ctx.calls, 2, 'read again');
  assert.ok(ctx.ANS && ctx.ANS.rows);
});
