require('./slot.js').testGuard();
// The juvenile card follows the photo's judged phase (core.js phaseKind) and nothing else, so a photo judged a juvenile
// brings it and a photo judged no juvenile does not (Pierre, 2026-11-20, on the fish practice quiz: «J'ai eu une carte
// de warning de juvénile sur un goat fish qui ressemblait exactement à l'adulte...»; «Celui là c'est un juvénile qui
// aurait mérité la carte»). The records are the ones tools/fish_game.py builds from judging/fish/ and suggest.json today
// (tests/fishjuvcard_rec.py), not fish-game.json, which the photos workflow rebuilds after a merge.
const test = require('node:test'),
  assert = require('node:assert'),
  path = require('path'),
  {spawnSync} = require('child_process');
const C = require('../core.js');
const ROOT = path.join(__dirname, '..');
const r = spawnSync('python3', [path.join(__dirname, 'fishjuvcard_rec.py')], {cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28});
const REC = r.status === 0 ? JSON.parse(r.stdout.trim().split('\n').pop()) : null;
// A record as the game reads a photo: its tags jt, its phase word ph when it has one.
const photo = f => ({f, ...REC[f], ph: REC[f].ph || undefined});

test('the records build from the judging', () => {
  assert.strictEqual(r.status, 0, r.stderr);
  assert.ok(Object.keys(REC).length > 1000, `${Object.keys(REC).length} records`);
});

test('a juvenile sweetlips judged a sub-adult brings the juvenile card (fish-s597-cand-254656964)', () => {
  const p = photo('fish-s597-cand-254656964');
  assert.strictEqual(C.phaseOf(p), 'juvenile');
  assert.strictEqual(C.phaseKind(p), 'juvenile');
});

test('a goatfish whose judging says it is no juvenile has no j and brings no card (fish-s330-cand-551266134)', () => {
  const p = photo('fish-s330-cand-551266134');
  assert.ok(!/j/.test(p.jt.slice(7)), p.jt);
  assert.strictEqual(C.phaseKind(p), '');
});

test('no photo whose judging note says it is not a juvenile carries the juvenile flag or phase', () => {
  const bad = Object.keys(REC).filter(f => /\bnot a juvenile\b/i.test(REC[f].note) && C.phaseOf(photo(f)) === 'juvenile');
  assert.deepStrictEqual(bad, []);
});
