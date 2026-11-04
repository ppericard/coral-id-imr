// Every account counts in the admin's stats (Pierre, 2026-11-04: his account is a real player's, the "Without me",
// "Others / Me" and "This is also me" exceptions are gone; the leaderboard's "hidden" filters nothing either). The admin's
// answer rows are the whole log (statRows), the photo ratings the sheet's (photoStats), and no code path drops answers by
// who sent them: a source check, since these are the pages' own lines.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  block = require('./block');
const ROOT = path.join(__dirname, '..'),
  read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

test('statRows is every answer and photoStats the sheet ratings, whoever answered', () => {
  const src = read('admin.js'),
    ctx = {
      ANS: {
        rows: [
          ['me', 1],
          ['ana', 2],
          ['ana', 3]
        ]
      },
      STATS: {p: [0, 1]},
      MEID: 'me'
    };
  vm.runInNewContext(
    [
      block(src, 'const isMe = ', '\n', {file: 'admin.js', through: true}),
      block(src, 'const photoStats = ', '\n', {file: 'admin.js', through: true}),
      block(src, 'const statRows = ', '\n', {file: 'admin.js', through: true}),
      'this.r = [statRows().length, photoStats() === STATS, isMe("me"), isMe("ana")];'
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
