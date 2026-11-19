'use strict';
require('./slot.js').testGuard();
// The admin reads curation.json through the GitHub contents API, which sends a file's text only up to 1 MB; above that
// the text must come from the blob (2026-11-04: curation.json passed 1 MB and the admin stopped loading).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'admin.js'), 'utf8');
const body = src.slice(src.indexOf('// ghfile: begin'), src.indexOf('// ghfile: end'));
const b64 = s => Buffer.from(s, 'utf8').toString('base64');
// A Cache Storage stand-in (one named cache: match, keys, delete, put), shared by the ghFile instances of a test that
// stands for the same browser; `caches` undefined stands for a browser without it.
const fakeCaches = () => {
  const store = new Map();
  const cache = {
    match: async k => (store.has(k) ? new Response(store.get(k)) : undefined),
    keys: async () => [...store.keys()],
    delete: async k => store.delete(k),
    put: async (k, r) => void store.set(k, await r.text())
  };
  return {store, open: async () => cache};
};
// rawFails: the raw media type is refused (the base64 reply is then used). A raw call is logged as 'raw ' + path.
const make = (replies, caches, rawFails) => {
  const calls = [];
  const gh = async p => {
    calls.push(p);
    if (!(p in replies)) throw new Error('Not Found');
    return replies[p];
  };
  const fromB64 = s => Buffer.from(s.replace(/\n/g, ''), 'base64').toString('utf8');
  const ghText = async p => {
    calls.push('raw ' + p);
    if (rawFails || !(p in replies)) throw new Error('GitHub error 415');
    return fromB64(replies[p].content);
  };
  const ghFile = new Function('gh', 'ghText', 'fromB64', 'BRANCH', 'caches', body + '\nreturn ghFile;')(
    gh,
    ghText,
    fromB64,
    'main',
    caches
  );
  return {ghFile, calls};
};

test('ghFile: a small file comes from the contents reply', async () => {
  const {ghFile, calls} = make({'/contents/c.json?ref=main': {encoding: 'base64', content: b64('{"a":1}'), sha: 's1'}});
  assert.deepStrictEqual(await ghFile('c.json'), {text: '{"a":1}', sha: 's1'});
  assert.strictEqual(calls.length, 1);
});

test('ghFile: a file over 1 MB (empty content, encoding none) comes from its blob', async () => {
  const big = JSON.stringify({x: 'é'.repeat(10)});
  const {ghFile, calls} = make({
    '/contents/c.json?ref=main': {encoding: 'none', content: '', sha: 's2'},
    '/git/blobs/s2': {encoding: 'base64', content: b64(big)}
  });
  assert.deepStrictEqual(await ghFile('c.json'), {text: big, sha: 's2'});
  assert.deepStrictEqual(calls, ['/contents/c.json?ref=main', 'raw /git/blobs/s2']);
});

test('ghFile: a missing file is null', async () => {
  const {ghFile} = make({});
  assert.strictEqual(await ghFile('c.json'), null);
});

// A blob never changes under its sha: the admin keeps its text, so the next visit and Publish skip the 600 kB download.
test('ghFile: a big file is downloaded once per sha, then read from the cache; a new sha replaces the entry', async () => {
  const caches = fakeCaches(),
    t1 = JSON.stringify({x: 'é'.repeat(10)}),
    t2 = JSON.stringify({y: 2});
  const R = {
    '/contents/c.json?ref=main': {encoding: 'none', content: '', sha: 's1'},
    '/git/blobs/s1': {content: b64(t1)},
    '/git/blobs/s2': {content: b64(t2)}
  };
  const a = make(R, caches);
  assert.deepStrictEqual(await a.ghFile('c.json'), {text: t1, sha: 's1'});
  assert.deepStrictEqual(a.calls, ['/contents/c.json?ref=main', 'raw /git/blobs/s1']);
  // the next visit: the contents call (the sha), no blob call
  const b = make(R, caches);
  assert.deepStrictEqual(await b.ghFile('c.json'), {text: t1, sha: 's1'});
  assert.deepStrictEqual(b.calls, ['/contents/c.json?ref=main']);
  // published since: the new sha is downloaded, and the old entry goes
  R['/contents/c.json?ref=main'] = {encoding: 'none', content: '', sha: 's2'};
  const c = make(R, caches);
  assert.deepStrictEqual(await c.ghFile('c.json'), {text: t2, sha: 's2'});
  assert.deepStrictEqual(c.calls, ['/contents/c.json?ref=main', 'raw /git/blobs/s2']);
  assert.deepStrictEqual([...caches.store.keys()], ['/__blob/s2']);
});

test('ghFile: a cache that fails, or none, leaves the download as it was', async () => {
  const R = {
    '/contents/c.json?ref=main': {encoding: 'none', content: '', sha: 's1'},
    '/git/blobs/s1': {content: b64('{"a":1}')}
  };
  for (const caches of [
    undefined,
    {
      open: async () => {
        throw new Error('blocked');
      }
    },
    {
      open: async () => ({
        match: async () => undefined,
        keys: async () => [],
        put: async () => {
          throw new Error('quota');
        }
      })
    }
  ]) {
    const {ghFile, calls} = make(R, caches);
    assert.deepStrictEqual(await ghFile('c.json'), {text: '{"a":1}', sha: 's1'});
    assert.deepStrictEqual(calls, ['/contents/c.json?ref=main', 'raw /git/blobs/s1']);
  }
});

test('ghFile: a raw media type that is refused falls back to the base64 reply', async () => {
  const {ghFile, calls} = make(
    {
      '/contents/c.json?ref=main': {encoding: 'none', content: '', sha: 's1'},
      '/git/blobs/s1': {content: b64('{"é":1}')}
    },
    undefined,
    true
  );
  assert.deepStrictEqual(await ghFile('c.json'), {text: '{"é":1}', sha: 's1'});
  assert.deepStrictEqual(calls, ['/contents/c.json?ref=main', 'raw /git/blobs/s1', '/git/blobs/s1']);
});
