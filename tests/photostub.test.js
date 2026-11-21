require('./slot.js').testGuard();
// tests/photostub.js, the photo hosts the smokes answer from the local files: every file the app asks R2 for, for a fish
// game photo, is answered. A file it leaves a 404 sends that photo to its online original (FishBase's among them, a host
// every smoke cuts off), so a question then loses its photo (tests/pending.smoke.js lost its kept question and its clock
// that way when a Find the X tile came first, back when one 404 gave R2 up for the page: app.js r2Failed now needs
// R2_OUT photos in a row).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path');
const ROOT = path.join(__dirname, '..');
const C = require('../core.js');
const stub = require('./photostub.js')(ROOT);

// The fish photos in play (fish-game.json, its records whole), downloaded (no r: on R2, not on iNaturalist).
const game = () => {
  const out = [];
  const walk = o => {
    if (!o || typeof o !== 'object') return;
    if (Array.isArray(o)) return o.forEach(walk);
    if (typeof o.f === 'string' && typeof o.src === 'string' && !o.r) out.push(o);
    Object.values(o).forEach(walk);
  };
  walk(C.treeGameRead(JSON.parse(fs.readFileSync(path.join(ROOT, 'fish-game.json'), 'utf8'))));
  return out;
};

test('the stub answers every size of a fish game photo on R2', () => {
  const ps = game();
  assert.ok(ps.length > 100, `fish-game.json read: ${ps.length} photos`);
  const miss = ps.flatMap(p => ['', '-t', '-s', '-m'].map(s => `${p.f}${s}.webp`)).filter(n => !stub.file(n));
  assert.deepStrictEqual(miss.slice(0, 5), [], `${miss.length} files R2 holds left a 404`);
});

test('the stub answers the Find the X tile of every fish game photo that has one (xc)', () => {
  const ps = game().filter(p => Array.isArray(p.xc));
  assert.ok(ps.length > 50, `photos with a tile: ${ps.length}`);
  const miss = ps.map(p => `${p.f}-x.webp`).filter(n => !stub.file(n));
  assert.deepStrictEqual(miss.slice(0, 5), [], `${miss.length} tiles R2 holds left a 404`);
});

test('a file R2 does not hold stays a 404', () => {
  assert.strictEqual(stub.file('gone-from-the-data-s.webp'), null);
  assert.strictEqual(stub.file('gone-from-the-data-x.webp'), null);
  const noTile = game().find(p => !Array.isArray(p.xc));
  if (noTile) assert.strictEqual(stub.file(`${noTile.f}-x.webp`), null, `${noTile.f} has no tile`);
});
