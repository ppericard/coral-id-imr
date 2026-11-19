'use strict';
require('./slot.js').testGuard();
// tools/unminify.js: a reported frame mapped back to the original line. The fixture is a small script minified by terser
// with tools/minify.js's options (a real map, written once: no terser here, the Checks job has none); the round trip on
// the real scripts of a built copy is tests/staged.smoke.js. Local files and a local server only, no network.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  os = require('os'),
  path = require('path'),
  http = require('http'),
  {spawnSync} = require('child_process');
const U = require('../tools/unminify.js');

const SRC =
  "// A made-up script for the test of tools/unminify.js\nconst greeting = 'hello';\nfunction shout(message) {\n  const loud = message.toUpperCase();\n  if (loud.length > 40) throw new Error('too long: ' + loud);\n  return loud + '!';\n}\nconst result = shout(greeting);\ndocument.title = result;\n";
const CODE =
  "const greeting='hello';function shout(t){const o=t.toUpperCase();if(o.length>40)throw new Error('too long: '+o);return o+'!'}const result=shout(\"hello\");document.title=result;\n//# sourceMappingURL=app.js.map";
const MAP = {
  version: 3,
  file: 'app.js',
  names: ['greeting', 'shout', 'message', 'loud', 'toUpperCase', 'length', 'Error', 'result', 'document', 'title'],
  sources: ['app.js'],
  sourcesContent: [SRC],
  mappings:
    'AACA,MAAMA,SAAW,QACjB,SAASC,MAAMC,GACb,MAAMC,EAAOD,EAAQE,cACrB,GAAID,EAAKE,OAAS,GAAI,MAAM,IAAIC,MAAM,aAAeH,GACrD,OAAOA,EAAO,GAChB,CACA,MAAMI,OAASN,MANE,SAOjBO,SAASC,MAAQF',
  ignoreList: []
};
const HASH = U.h10(Buffer.from(CODE)); // what the deploy stamps as app.js?v=

// A built copy: app.js and its map, the Lab's own script (a map too, under proto/) and the never-minified ones.
function copy(files = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'unminify-test-'));
  const all = {
    'app.js': CODE,
    'app.js.map': JSON.stringify(MAP),
    'proto/idkey.js': CODE,
    'proto/idkey.js.map': JSON.stringify(MAP),
    'sw.js': "const V = 'x';\n",
    'proto/lab.js': "const LAB = {\n  files: [\n    'idkey'\n  ]\n};\n",
    ...files
  };
  for (const [f, s] of Object.entries(all)) {
    fs.mkdirSync(path.dirname(path.join(dir, f)), {recursive: true});
    fs.writeFileSync(path.join(dir, f), s);
  }
  return dir;
}
const col = s => CODE.indexOf(s) + 1; // a browser's column: from 1, on the one line of a minified file
const run = async (text, opts, dir = copy()) => {
  try {
    return await U.unminify(U.fromDir(dir), text, opts);
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
};

test('the frames of a report, a V8 stack, a Safari or Firefox stack', () => {
  const f = U.frames(
    [
      'app.js:1:23456',
      '    at foo (https://ppericard.github.io/coral-id-imr/quiz.js?v=0123456789:1:2345)',
      '    at https://ppericard.github.io/coral-id-imr/proto/idkey.js:3:4',
      'bar@https://ppericard.github.io/coral-id-imr/sync.js?v=abcdef0123:7:8',
      'no frame here, nor in index.html:3'
    ].join('\n')
  );
  assert.deepStrictEqual(
    f.map(x => [x.base, x.proto, x.hash, x.line, x.col]),
    [
      ['app.js', false, null, 1, 23456],
      ['quiz.js', false, '0123456789', 1, 2345],
      ['idkey.js', true, null, 3, 4],
      ['sync.js', false, 'abcdef0123', 7, 8]
    ]
  );
  assert.deepStrictEqual(U.candidates(f[0]), ['app.js', 'proto/app.js']);
  assert.deepStrictEqual(U.candidates(f[2]), ['proto/idkey.js']);
});

test('the av of a report: the deploy number, then app.js hash', () => {
  assert.deepStrictEqual(U.parseAv('982-a0aeab7eb0'), {build: '982', hash: 'a0aeab7eb0'});
  assert.deepStrictEqual(U.parseAv('a0aeab7eb0'), {build: null, hash: 'a0aeab7eb0'});
  assert.strictEqual(U.parseAv('982'), null);
  assert.strictEqual(U.parseAv('982-xyz'), null);
});

test('a frame goes back to its line, from column 1 as the browsers count', async () => {
  const r = await run(`app.js:1:${col('new Error')}`);
  assert.strictEqual(r.code, 0);
  assert.match(r.lines[0], /^app\.js:1:\d+ -> app\.js:5:\d+/);
  assert.match(r.lines[1], /throw new Error\('too long: ' \+ loud\)/);
  // The one-column slip would land on the token before: the function's name, a mangled parameter's.
  const name = await run(`app.js:1:${col('shout(t)')}`);
  assert.match(name.lines[0], /-> app\.js:3:10 {2}\(shout\)/);
  assert.match(name.lines[1], /^ {4}function shout\(message\) \{$/);
  const param = await run(`app.js:1:${col('(t)') + 1}`);
  assert.match(param.lines[0], /\(message\)/);
});

test('several frames of a stack, in order, the Lab and the never-minified scripts', async () => {
  const r = await run(
    [
      `Error: x\n    at a (https://h/app.js?v=${HASH}:1:${col('new Error')})`,
      `    at https://h/proto/idkey.js:1:${col('shout(t)')}`,
      '    at sw.js:3:5'
    ].join('\n')
  );
  assert.strictEqual(r.code, 0);
  assert.match(r.lines[0], /^app\.js:1:\d+ -> app\.js:5:/);
  assert.match(r.lines[2], /^proto\/idkey\.js:1:\d+ -> proto\/idkey\.js:3:10 {2}\(shout\)/);
  assert.match(r.lines[4], /^sw\.js:3:5 -> sw\.js:3:5 {2}\(never minified/);
});

test('a basename without its folder is looked up in the root, then in proto/, and says when both exist', async () => {
  const dir = copy({'proto/only.js': CODE, 'proto/only.js.map': JSON.stringify(MAP)});
  const only = await run(`only.js:1:${col('new Error')}`, {}, dir);
  assert.match(only.lines[0], /^only\.js:1:\d+ -> proto\/only\.js:5:/);
  const both = await run(`app.js:1:${col('new Error')}`);
  assert.match(both.lines[0], /-> app\.js:5:/);
  assert.doesNotMatch(both.lines[0], /both exist/);
  const two = await run(`idkey.js:1:${col('new Error')}`, {}, copy({'idkey.js': CODE, 'idkey.js.map': JSON.stringify(MAP)}));
  assert.match(two.lines[0], /idkey\.js and proto\/idkey\.js both exist/);
});

test('the report is checked against the build the maps belong to, by app.js hash and not by the deploy number', async () => {
  const f = `app.js:1:${col('new Error')}`;
  // The same hash is the same app.js, whatever the deploy number.
  for (const av of [`982-${HASH}`, `3-${HASH}`, HASH]) assert.strictEqual((await run(f, {av})).code, 0, av);
  const wrong = await run(f, {av: '982-0123456789'});
  assert.strictEqual(wrong.code, 2);
  assert.match(wrong.lines.join('\n'), /not the report's build: its app\.js is 0123456789 \(deploy 982\)/);
  assert.match(wrong.lines.join('\n'), /--commit <sha> --av 982-0123456789/);
  assert.ok(!wrong.lines.some(l => /->/.test(l)), 'no line mapped from the wrong build');
  const forced = await run(f, {av: '982-0123456789', force: true});
  assert.match(forced.lines.join('\n'), /--force: mapped anyway/);
  assert.match(forced.lines.join('\n'), /-> app\.js:5:/);
  assert.strictEqual((await run(f, {av: 'nonsense'})).code, 2);
});

test("a frame's own ?v= is checked against its file", async () => {
  const at = `1:${col('new Error')}`;
  const ok = await run(`at a (https://h/app.js?v=${HASH}:${at})`);
  assert.strictEqual(ok.code, 0);
  const other = await run(`at a (https://h/app.js?v=0123456789:${at})`);
  assert.strictEqual(other.code, 2);
  assert.match(other.lines[0], /another build/);
  assert.strictEqual((await run(`at a (https://h/app.js?v=0123456789:${at})`, {force: true})).code, 0);
});

// Every Lab module is loaded with the one LAB_V, a hash of the names and hashes of all the Lab files
// (tools/stamp_versions.py), not the hash of its own bytes.
test("a Lab module's ?v= is the Lab's version, not its own file's hash", async () => {
  const at = `1:${col('new Error')}`,
    labV = U.h10(Buffer.from('idkey' + HASH)); // proto/lab.js `files` lists idkey alone in the test copy
  const ok = await run(`at a (https://h/coral-id-imr/proto/idkey.js?v=${labV}:${at})`, {av: `982-${HASH}`});
  assert.strictEqual(ok.code, 0);
  assert.doesNotMatch(ok.lines[0], /another build|not verified/);
  const own = await run(`at a (https://h/coral-id-imr/proto/idkey.js?v=${HASH}:${at})`);
  assert.strictEqual(own.code, 2, 'the file own hash is not what the Lab is loaded with');
  assert.match(own.lines[0], /another build/);
  const d = copy();
  try {
    assert.strictEqual(await U.versionOf(U.fromDir(d), 'proto/idkey.js'), labV);
    assert.strictEqual(await U.versionOf(U.fromDir(d), 'proto/nothing.js'), null);
  } finally {
    fs.rmSync(d, {recursive: true, force: true});
  }
});

test('what cannot be mapped is said, and the exit code is 1', async () => {
  const none = await run('other.js:1:5');
  assert.strictEqual(none.code, 1);
  assert.match(none.lines[0], /no map for other\.js/);
  const past = await run('app.js:99:1');
  assert.strictEqual(past.code, 1);
  assert.match(past.lines[0], /no mapping at app\.js:99:1/);
  assert.strictEqual((await run('nothing to find')).code, 2);
});

test('the live site as a source: a plain GET of the files, a 404 is none', async () => {
  const seen = [],
    srv = http.createServer((q, res) => {
      seen.push(q.method + ' ' + q.url);
      const f = {'/app.js': CODE, '/app.js.map': JSON.stringify(MAP)}[q.url];
      res.writeHead(f ? 200 : 404);
      res.end(f || '');
    });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  try {
    const base = `http://127.0.0.1:${srv.address().port}/`,
      r = await U.unminify(U.fromSite(base), `app.js:1:${col('new Error')}`, {av: HASH});
    assert.strictEqual(r.code, 0);
    assert.match(r.lines[0], /-> app\.js:5:/);
    assert.deepStrictEqual([...new Set(seen)].sort(), ['GET /app.js', 'GET /app.js.map', 'GET /proto/app.js.map'].sort());
    assert.strictEqual(await U.fromSite(base).read('nothing.js'), null);
  } finally {
    srv.close();
  }
});

test('the command line: --dir and --src, a usage error, an unknown option', () => {
  const dir = copy(),
    cli = (...a) => spawnSync(process.execPath, [path.join(__dirname, '..', 'tools', 'unminify.js'), ...a], {encoding: 'utf8'});
  try {
    const ok = cli('--dir', dir, '--src', `app.js:1:${col('new Error')}`, '--av', `5-${HASH}`);
    assert.strictEqual(ok.status, 0, ok.stderr);
    assert.match(ok.stdout, /-> app\.js:5:\d+\n {4}if \(loud\.length > 40\) throw new Error/);
    const wrong = cli('--dir', dir, '--src', 'app.js:1:5', '--av', '5-0123456789');
    assert.strictEqual(wrong.status, 2);
    assert.strictEqual(cli().status, 2);
    assert.match(cli('--bogus').stderr, /unknown option --bogus/);
    assert.match(cli('--dir', dir, '--site', 'http://x/', '--src', 'a.js:1:1').stderr, /exclusive/);
    assert.match(cli('--commit', '-x', '--src', 'a.js:1:1').stderr, /not a commit or a branch name/);
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
});

// The report holds app.js's hash and the deploy's number: a frame in another script is proven by its own ?v=, or by a site
// whose build is the report's number; a copy built with --commit or --dir proves nothing by a number the caller chose.
test('a frame in a script other than app.js is marked unless something proves its build', async () => {
  const more = {'sync.js': CODE, 'sync.js.map': JSON.stringify(MAP), 'index.html': '<meta name="build" content="982">\n'},
    at = `1:${col('new Error')}`,
    tag = /\[build not verified/;
  // A built copy: app.js is proven by its hash; sync.js is mapped, and marked; its own ?v= proves it.
  const dir = await run(`app.js:${at}\nsync.js:${at}`, {av: `982-${HASH}`}, copy(more));
  assert.strictEqual(dir.code, 0);
  assert.doesNotMatch(dir.lines[0], tag);
  assert.match(dir.lines[2], /^sync\.js:1:\d+ -> sync\.js:5:\d+.*\[build not verified: only app\.js's hash is in the report\]$/);
  const own = await run(`at f (https://h/sync.js?v=${HASH}:${at})`, {av: `982-${HASH}`}, copy(more));
  assert.doesNotMatch(own.lines[0], tag);
  // The never-minified scripts are the original position: nothing to verify.
  assert.doesNotMatch((await run('sw.js:3:5', {av: `982-${HASH}`})).lines[0], tag);
  // No av: one line says the build was not checked.
  const none = await run(`sync.js:${at}`, {}, copy(more));
  assert.strictEqual(none.code, 0);
  assert.match(none.lines.join('\n'), /\n\nno --av: the maps' build is not checked against the report$/);
  // The live site: its build number is the report's deploy, or it is not.
  const srv = http.createServer((q, res) => {
    const f = Object.fromEntries(
      Object.entries({'app.js': CODE, 'app.js.map': JSON.stringify(MAP), ...more}).map(([k, v]) => ['/' + k, v])
    )[q.url];
    res.writeHead(f ? 200 : 404);
    res.end(f || '');
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  try {
    const site = U.fromSite(`http://127.0.0.1:${srv.address().port}/`);
    const same = await U.unminify(site, `sync.js:${at}`, {av: `982-${HASH}`});
    assert.strictEqual(same.code, 0);
    assert.doesNotMatch(same.lines[0], tag);
    const later = await U.unminify(site, `sync.js:${at}`, {av: `970-${HASH}`});
    assert.strictEqual(later.code, 0);
    assert.match(later.lines[0], tag);
  } finally {
    srv.close();
  }
});
