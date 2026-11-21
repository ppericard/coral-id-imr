'use strict';
require('./slot.js').testGuard();
// tools/r2_unused.py (the R2 objects nothing uses, READ ONLY; Linear REE-6) on a fixture listing and a made-up repository
// in a temporary folder, and the guards that keep the route read-only: tools/r2_list.sh and .github/workflows/r2-unused.yml
// only list (no write verb, no write permission, the keys in the one listing step, nothing committed).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  os = require('os'),
  path = require('path'),
  {spawnSync} = require('child_process');
const ROOT = path.join(__dirname, '..');
const TOOL = path.join(ROOT, 'tools', 'r2_unused.py');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const roots = [];
test.after(() => roots.forEach(r => fs.rmSync(r, {recursive: true, force: true})));

const NOW = '2026-11-21T09:00:00Z';
const OLD = '2026-10-01T00:00:00.123456789Z';
const put = (root, rel, text) => {
  fs.mkdirSync(path.dirname(path.join(root, rel)), {recursive: true});
  fs.writeFileSync(path.join(root, rel), text);
};
// A repository: live1 (with a tile), live2 (no tile), zz-s (a photo whose name ends in a size), remote1 (r: 1), gitonly
// (its four files in img/), gone1 (in data/excluded.json), cur1 (named in curation.json), judg1 (in the judging files).
const repo = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'r2unused-'));
  roots.push(root);
  const rec = (f, more = {}) => ({f, src: 'https://x/' + f + '/original.jpg', ...more});
  const views = [rec('live1', {xc: [0, 0, 1, 1]}), rec('live2'), rec('zz-s'), rec('remote1', {r: 1}), {f: 'gitonly'}];
  put(root, 'data.json', JSON.stringify({gen: {Acropora: {views: {wide: views}}}}));
  put(root, 'data/excluded.json', JSON.stringify({photos: {gone1: {in: 'gen', p: rec('gone1')}}}));
  put(root, 'curation.json', JSON.stringify({exclude: {cur1: 'excluded'}}));
  put(root, 'judging/manifest.json', JSON.stringify({image: 'https://r2/img/judg1.webp', thumb: 'https://r2/img/judg1-s.webp'}));
  put(root, 'app.js', "const logo = 'img/applogo.webp';\n");
  put(root, 'docs/notes.md', 'The photo doc1 and orphan10 are named here.\n');
  for (const n of ['gitonly.webp', 'gitonly-m.webp', 'gitonly-s.webp', 'gitonly-t.webp']) put(root, 'img/' + n, '');
  return root;
};
const o = (key, size = 1000, mod = OLD) => ({Path: key, Name: key.split('/').pop(), Size: size, ModTime: mod, IsDir: false});
const four = f => ['', '-m', '-s', '-t'].map(s => o(`img/${f}${s}.webp`));
const listing = () => [
  ...four('live1'),
  o('img/live1-x.webp'),
  ...['', '-s', '-t'].map(s => o(`img/live2${s}.webp`)), // -m is missing: the sanity check says so
  o('img/live2-x.webp', 2000), // a tile its record no longer has
  ...four('zz-s'),
  ...four('gitonly'),
  o('img/gone1.webp', 3000),
  o('img/gone1-s.webp', 3000),
  o('img/remote1-s.webp', 4000),
  o('img/cur1.webp', 5000),
  o('img/judg1.webp'),
  o('img/judg1-s.webp'),
  o('img/applogo.webp'),
  o('img/doc1-t.webp'),
  o('img/orphan1.webp', 7000),
  o('img/orphan1-m.webp', 700),
  o('img/orphan10-s.webp'), // named in the docs as orphan10, not orphan1
  o('img/fresh1.webp', 9000, '2026-11-21T01:30:00.000Z'), // 7.5 h before NOW
  o('img/readme.txt', 10),
  o('img/sub/deep.webp', 11),
  o('img/noage.webp', 12, ''),
  o('other/file.bin', 123456),
  {Path: 'img', Name: 'img', Size: -1, IsDir: true}
];
const run = (root, items, extra = []) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'r2unused-out-'));
  roots.push(dir);
  const file = path.join(dir, 'listing.json');
  fs.writeFileSync(file, typeof items === 'string' ? items : JSON.stringify(items));
  const r = spawnSync(
    'python3',
    ['-B', TOOL, '--root', root, '--listing', file, '--out', path.join(dir, 'out'), '--now', NOW, '--label', 'test', ...extra],
    {
      encoding: 'utf8',
      timeout: 30000
    }
  );
  const out = f => (fs.existsSync(path.join(dir, 'out', f)) ? fs.readFileSync(path.join(dir, 'out', f), 'utf8') : null);
  return {r, out};
};
const rows = tsv =>
  (tsv || '')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map(l => l.split('\t'));

test('wanted files are used; the rest is unused only when nothing names its photo', () => {
  const {r, out} = run(repo(), listing());
  assert.strictEqual(r.status, 0, r.stderr);
  assert.deepStrictEqual(rows(out('unused.tsv')), [
    ['img/live2-x.webp', '2000', 'stale-tile'],
    ['img/orphan1-m.webp', '700', 'orphan'],
    ['img/orphan1.webp', '7000', 'orphan']
  ]);
  const j = JSON.parse(out('report.json'));
  assert.strictEqual(j.by_state.used.objects, 5 + 3 + 4 + 4); // live1 and its tile, live2, zz-s, the git photo
  assert.deepStrictEqual(j.by_state.unused, {objects: 3, bytes: 9700});
  assert.strictEqual(j.by_state.outside.objects, 1); // other/file.bin; the directory entry is no object
  assert.strictEqual(j.by_top_prefix['other/'].bytes, 123456);
  assert.strictEqual(j.by_img_prefix.orphan.unused, 2);
});

test('the doubtful are kept off the list, each with its reason', () => {
  const {out} = run(repo(), listing());
  const d = Object.fromEntries(rows(out('doubtful.tsv')).map(([k, , why, detail]) => [k, [why, detail]]));
  const why = k => (d[k] || [])[0];
  assert.strictEqual(why('img/gone1.webp'), 'restorable-excluded');
  assert.strictEqual(why('img/gone1-s.webp'), 'restorable-excluded');
  assert.strictEqual(why('img/remote1-s.webp'), 'remote-record');
  assert.strictEqual(why('img/cur1.webp'), 'named-curation');
  assert.strictEqual(why('img/judg1.webp'), 'named-judging');
  assert.strictEqual(why('img/judg1-s.webp'), 'named-judging'); // the name of a size's file finds its photo
  assert.strictEqual(why('img/applogo.webp'), 'named-app');
  assert.strictEqual(why('img/doc1-t.webp'), 'named-docs');
  assert.strictEqual(why('img/orphan10-s.webp'), 'named-docs');
  assert.strictEqual(why('img/fresh1.webp'), 'young');
  assert.strictEqual(why('img/readme.txt'), 'odd-name');
  assert.strictEqual(why('img/sub/deep.webp'), 'odd-name');
  assert.strictEqual(why('img/noage.webp'), 'unknown-age');
  assert.strictEqual(d['img/judg1.webp'][1], 'judging/manifest.json'); // where its name is
  // A whole-word match: orphan10 in the docs never names orphan1.
  assert.ok(!d['img/orphan1.webp'] && !d['img/orphan1-m.webp']);
  // Used files and the outside are in neither list.
  for (const k of ['img/live1.webp', 'img/live1-x.webp', 'img/zz-s-s.webp', 'img/gitonly-t.webp', 'other/file.bin']) assert.ok(!d[k], k);
  assert.ok(!rows(out('unused.tsv')).some(([k]) => d[k]));
});

test('the age limit decides: a young object waits, an older one is judged', () => {
  const young = run(repo(), listing(), ['--min-age-hours', '8']);
  assert.ok(rows(young.out('doubtful.tsv')).some(([k, , why]) => k === 'img/fresh1.webp' && why === 'young'));
  const older = run(repo(), listing(), ['--min-age-hours', '6']);
  assert.ok(rows(older.out('unused.tsv')).some(([k, , why]) => k === 'img/fresh1.webp' && why === 'orphan'));
  assert.ok(!rows(older.out('doubtful.tsv')).some(([k]) => k === 'img/fresh1.webp'));
});

test('the report says what it holds: totals, prefixes, the doubtful, and a file the repository wants but R2 lacks', () => {
  const {out} = run(repo(), listing());
  const md = out('report.md');
  assert.match(md, /Nothing was deleted or changed/);
  assert.match(md, /\| unused \| 3 \|/);
  assert.match(md, /\| other\/ \| 1 \|/);
  assert.match(md, /\*\*restorable-excluded\*\*: `img\/gone1-s\.webp`/);
  assert.match(
    md,
    /1 file\(s\) the repository wants on R2 are absent from the listing \(tools\/r2_sync\.sh would fail on them\): `img\/live2-m\.webp`/
  );
  assert.strictEqual(JSON.parse(out('report.json')).missing_wanted, 1);
  assert.match(md, /Repository state: test\./);
});

test('a listing with no img/ object, or not a listing, writes no report and fails', () => {
  for (const items of [[], [o('other/file.bin')], 'not json', '{"Path": "img/a.webp"}']) {
    const {r, out} = run(repo(), items);
    assert.strictEqual(r.status, 1, JSON.stringify(items));
    assert.strictEqual(out('report.md'), null);
    assert.strictEqual(out('unused.tsv'), null);
  }
});

// ---- The route is read only (Pierre, 2026-11-21 05:40: the list first, then deleting, a separate step) ----
const code = f =>
  read(f)
    .split('\n')
    .filter(l => !/^\s*#/.test(l))
    .join('\n');
const WRITE =
  /\brclone\s+(copy|copyto|sync|bisync|move|moveto|delete|deletefile|purge|rmdir|rmdirs|rcat|mkdir|cleanup|mount|serve|touch|settier|setmodtime|backend|config)\b|--delete|\baws\s+s3|\bwrangler\b|\bDELETE\b|\bPUT\b/;

test('tools/r2_list.sh only lists: rclone lsjson, no write verb, and it fails without the credentials', () => {
  const sh = code('tools/r2_list.sh');
  const verbs = new Set([...sh.matchAll(/^\s*rclone\s+([a-z]+)/gm)].map(m => m[1])); // a command, not a word in a message
  assert.deepStrictEqual([...verbs].sort(), ['lsjson', 'version']);
  assert.ok(!WRITE.test(sh), 'a write verb in tools/r2_list.sh');
  // One listing, no request per object: the server's time (the upload time the "young" guard needs), no content type.
  const ls = sh.match(/^\s*rclone lsjson .*$/m)[0];
  for (const flag of ['--use-server-modtime', '--no-mimetype', '--recursive', '--files-only', '--fast-list'])
    assert.ok(ls.includes(flag), flag);
  // No config file with the keys, no trace of them.
  assert.ok(!/\bset -x\b|rclone config|--log-level (DEBUG|INFO)|\s-vv?\s|--dump/.test(sh));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'r2list-'));
  roots.push(dir);
  const env = {PATH: process.env.PATH, HOME: dir};
  const r = spawnSync('bash', [path.join(ROOT, 'tools', 'r2_list.sh'), path.join(dir, 'out.json')], {
    encoding: 'utf8',
    env,
    timeout: 10000
  });
  assert.strictEqual(r.status, 1);
  assert.match(r.stderr, /R2 credentials or bucket not set \(R2_ACCOUNT_ID\): nothing listed/);
  assert.ok(!fs.existsSync(path.join(dir, 'out.json')));
});

test('tools/r2_list.sh takes the rclone pin from tools/r2_sync.sh, the one place it is written', () => {
  const list = read('tools/r2_list.sh');
  const sed = name => list.match(new RegExp(`${name}=\\$\\(sed -n '([^']+)' tools/r2_sync\\.sh\\)`));
  for (const [name, want] of [
    ['RCLONE_VERSION', /^\d+\.\d+\.\d+$/],
    ['RCLONE_SHA256', /^[0-9a-f]{64}$/]
  ]) {
    const m = sed(name);
    assert.ok(m, name + ' is read from tools/r2_sync.sh');
    const r = spawnSync('sed', ['-n', m[1], path.join(ROOT, 'tools', 'r2_sync.sh')], {encoding: 'utf8'});
    assert.match(r.stdout.trim(), want, name);
  }
});

test('the workflow lists and reports only: dispatch by hand, contents: read, the keys in the listing step alone, no commit', () => {
  const y = read('.github/workflows/r2-unused.yml');
  const c = code('.github/workflows/r2-unused.yml');
  assert.match(y, /^on:\n {2}workflow_dispatch:\n(?! {2})/m, 'by hand only');
  assert.match(y, /^permissions:\n {2}contents: read\n(?! {2}\S)/m, 'the one permission is contents: read');
  assert.strictEqual((y.match(/^ {6,}permissions:/gm) || []).length, 0, 'no job asks for more');
  assert.ok(!WRITE.test(c), 'a write verb in the workflow');
  assert.ok(!/git (push|commit|add)|\bgh \w|GITHUB_TOKEN|contents: write/.test(c));
  // The R2 secrets: the three keys and the bucket, in the listing step, before the comparison step, nowhere else.
  const secrets = [...c.matchAll(/secrets\.R2_\w+/g)].map(m => m.index);
  assert.strictEqual(secrets.length, 3);
  const at = s => c.indexOf(s);
  assert.ok(at('name: List the bucket') > 0 && at('name: Compare with the repository') > Math.max(...secrets));
  assert.ok(Math.min(...secrets) > at('name: List the bucket'));
  assert.ok(/tools\/r2_list\.sh/.test(c) && /tools\/r2_unused\.py/.test(c));
  assert.match(c, /upload-artifact@v\d+[\s\S]*name: r2-unused[\s\S]*if-no-files-found: error/);
  // The listing step prints no key: no env dump, no echo of a secret.
  assert.ok(!/\benv\b\s*$|printenv|echo .*(R2_|secrets\.)/m.test(c));
});

test('tools/r2_unused.py has no way to reach the bucket or remove anything', () => {
  const py = code('tools/r2_unused.py');
  assert.ok(!/\b(urllib|requests|http\.client|socket|subprocess|boto3?|botocore)\b/.test(py), 'network or process code');
  assert.ok(!/\b(os\.remove|os\.unlink|os\.rmdir|os\.rename|os\.replace|shutil|rmtree|unlink)\b/.test(py), 'a deletion');
  assert.ok(!/\bopen\([^)]*['"][wa]b?['"]/.test(py.replace(/os\.path\.join\(out, '[a-z.]+'\), 'w'/g, '')), 'a write outside --out');
});
