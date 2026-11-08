// tools/memstorage.js: the in-memory localStorage that tools/learnsim.js installs in its pages (#734: the browser's own
// storage queued about 1.5 MB an answer in the renderer during learnsim's one long evaluate, until "Target crashed").
// It must behave as the browser's for everything the app and the tool do, and run alone once serialized, as
// Playwright's addInitScript runs it.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const {memStorage, LS_SAFE} = require('../tools/memstorage.js');

// As Playwright runs it: its source alone, in a page of its own (here a fresh global).
const page = () => {
  const g = vm.createContext({});
  vm.runInContext(`(${memStorage})()`, g);
  return g;
};

test('memstorage: the Storage API on strings', () => {
  const ls = page().localStorage;
  assert.strictEqual(ls.getItem('a'), null);
  assert.strictEqual(ls.length, 0);
  ls.setItem('a', 1);
  ls.setItem('b', {x: 1});
  assert.strictEqual(ls.getItem('a'), '1');
  assert.strictEqual(ls.getItem('b'), '[object Object]');
  assert.strictEqual(ls.length, 2);
  ls.setItem('a', 'two');
  assert.strictEqual(ls.length, 2);
  ls.removeItem('a');
  ls.removeItem('missing');
  assert.strictEqual(ls.getItem('a'), null);
  assert.strictEqual(ls.length, 1);
  ls.clear();
  assert.strictEqual(ls.length, 0);
  assert.strictEqual(ls.key(0), null);
});

test("memstorage: key(i) in the browser's order (sorted), items as own properties, methods never shadowed", () => {
  const ls = page().localStorage;
  ['reefid-sync-coral-progress', 'reefid-log0', 'reefid-anonq', 'getItem'].forEach((k, i) => ls.setItem(k, 'v' + i));
  assert.deepStrictEqual(
    Array.from({length: ls.length}, (_, i) => ls.key(i)),
    ['getItem', 'reefid-anonq', 'reefid-log0', 'reefid-sync-coral-progress']
  );
  // learnsim's breaks snapshot ({...localStorage}) and its restore (Object.entries): the items only (an item named as a
  // method is no own property, as in the browser).
  assert.deepStrictEqual({...ls}, {'reefid-anonq': 'v2', 'reefid-log0': 'v1', 'reefid-sync-coral-progress': 'v0'});
  assert.strictEqual(typeof ls.getItem, 'function');
  assert.strictEqual(ls.getItem('getItem'), 'v3');
  assert.strictEqual(ls['reefid-log0'], 'v1');
  assert.ok('reefid-log0' in ls);
  assert.ok(!('nothing' in ls));
  ls['reefid-x'] = 5;
  assert.strictEqual(ls.getItem('reefid-x'), '5');
  delete ls['reefid-x'];
  assert.strictEqual(ls.getItem('reefid-x'), null);
});

test('memstorage: the peak size it held (keys and values), for the quota warning', () => {
  const g = page(),
    ls = g.localStorage;
  ls.setItem('ab', '1234');
  ls.setItem('ab', '12');
  assert.strictEqual(g.__lsPeak, 6);
  ls.setItem('c', 'x'.repeat(10));
  assert.strictEqual(g.__lsPeak, 15);
  ls.clear();
  ls.setItem('d', '1');
  assert.strictEqual(g.__lsPeak, 15);
  assert.ok(LS_SAFE > 2e6 && LS_SAFE < 3e6);
});

test('learnsim installs it before any other init script', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'tools', 'learnsim.js'), 'utf8'),
    at = src.indexOf('addInitScript(memStorage)');
  assert.ok(at > 0, 'tools/learnsim.js: ctx.addInitScript(memStorage)');
  assert.strictEqual(src.indexOf('addInitScript('), at);
});
