'use strict';
// The admin reads curation.json through the GitHub contents API, which sends a file's text only up to 1 MB; above that
// the text must come from the blob (2026-11-04: curation.json passed 1 MB and the admin stopped loading).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'admin.js'), 'utf8');
const body = src.slice(src.indexOf('// ghfile: begin'), src.indexOf('// ghfile: end'));
const b64 = s => Buffer.from(s, 'utf8').toString('base64');
const make = replies => {
  const calls = [];
  const gh = async p => {
    calls.push(p);
    if (!(p in replies)) throw new Error('Not Found');
    return replies[p];
  };
  const fromB64 = s => Buffer.from(s.replace(/\n/g, ''), 'base64').toString('utf8');
  const ghFile = new Function('gh', 'fromB64', 'BRANCH', body + '\nreturn ghFile;')(gh, fromB64, 'main');
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
  assert.deepStrictEqual(calls, ['/contents/c.json?ref=main', '/git/blobs/s2']);
});

test('ghFile: a missing file is null', async () => {
  const {ghFile} = make({});
  assert.strictEqual(await ghFile('c.json'), null);
});
