require('./slot.js').testGuard();
// The deploy's build (tools/build_site.py, tools/minify.js; architecture review of 2026-11-18, R4), without terser: a
// stand-in "terser" module (the pinned version, its minify a reversible change of the bytes) shows the order of the
// steps and what each stamp sees; the real minifier runs in the staged smoke (tests/staged.smoke.js) on CI and at deploy.
const test = require('node:test'),
  assert = require('node:assert'),
  crypto = require('crypto'),
  fs = require('fs'),
  os = require('os'),
  path = require('path'),
  {spawnSync} = require('child_process');

const ROOT = path.join(__dirname, '..'),
  M = require('../tools/minify.js'),
  yml = f => fs.readFileSync(path.join(ROOT, '.github', 'workflows', f), 'utf8');

// The temporary folders, removed at the end.
const TMP = [],
  tmp = p => (TMP.push(fs.mkdtempSync(path.join(os.tmpdir(), p))), TMP[TMP.length - 1]);
test.after(() => TMP.forEach(d => fs.rmSync(d, {recursive: true, force: true})));
// What the deploy publishes and the build reads: the files at the root, the Lab and the fonts (as tests/versions.test.js).
const copy = () => {
  const d = tmp('build-');
  for (const f of fs.readdirSync(ROOT)) {
    const p = path.join(ROOT, f);
    if (fs.statSync(p).isFile()) fs.copyFileSync(p, path.join(d, f));
  }
  for (const dir of ['proto', 'fonts']) fs.cpSync(path.join(ROOT, dir), path.join(d, dir), {recursive: true});
  return d;
};
// A stand-in terser in a node_modules of its own: minify(code) = a comment line in front (body: what it does instead).
const fakeTerser = (version, body = "code = '/*min*/' + code") => {
  const d = tmp('terser-'),
    t = path.join(d, 'node_modules', 'terser');
  fs.mkdirSync(t, {recursive: true});
  fs.writeFileSync(path.join(t, 'package.json'), JSON.stringify({name: 'terser', version, main: 'index.js'}));
  fs.writeFileSync(
    path.join(t, 'index.js'),
    `exports.minify = async (files, o) => { let [code] = Object.values(files); ${body};
      return {code: code + '\\n//# sourceMappingURL=' + o.sourceMap.url, map: JSON.stringify({version: 3, file: o.sourceMap.filename})}; };`
  );
  return path.join(d, 'node_modules');
};
const build = (d, nodePath, ...a) =>
  spawnSync('python3', [path.join(ROOT, 'tools', 'build_site.py'), d, ...a], {
    encoding: 'utf8',
    env: {...process.env, NODE_PATH: nodePath || ''}
  });
const read = (d, f) => fs.readFileSync(path.join(d, f), 'utf8');
const sha = (d, f) =>
  crypto
    .createHash('sha256')
    .update(fs.readFileSync(path.join(d, f)))
    .digest('hex')
    .slice(0, 10);

test('build_site: minified with a map, every ?v= the hash of the bytes served, sw.js and the Lab loader and the pages left as they are', () => {
  const d = copy(),
    r = build(d, fakeTerser(M.TERSER), '--build', '9');
  assert.strictEqual(r.status, 0, r.stderr + r.stdout);
  assert.match(r.stdout, /\| core\.js \|/);
  assert.match(r.stdout, /Versions OK/);
  for (const f of ['core.js', 'app.js', 'admin.js', 'proto/idkey.js']) {
    assert.ok(read(d, f).startsWith('/*min*/'), `${f} not minified`);
    assert.ok(read(d, f).endsWith(`//# sourceMappingURL=${path.basename(f)}.map`), `${f}: no map address`);
    assert.ok(fs.existsSync(path.join(d, f + '.map')), `${f}.map missing`);
  }
  for (const f of ['sw.js', 'proto/lab.js', 'index.html', 'admin.html']) assert.ok(!read(d, f).includes('/*min*/'), `${f} minified`);
  // The second stamp ran on the minified bytes: index.html names each script by the hash of what is served.
  const idx = read(d, 'index.html');
  for (const f of ['core.js', 'app.js', 'quiz.js'])
    assert.ok(idx.includes(`${f}?v=${sha(d, f)}`), `${f}: ?v= is not the served file's hash`);
  assert.match(idx, /<meta name="build" content="9">/);
  // sw.js keeps the same address the page loads.
  assert.ok(read(d, 'sw.js').includes(`'core.js?v=${sha(d, 'core.js')}'`));
});

test('build_site: another minifier output changes the ?v= and sw.js V (a terser bump or a rollback reaches the caches)', () => {
  const a = copy(),
    b = copy();
  assert.strictEqual(build(a, fakeTerser(M.TERSER)).status, 0);
  assert.strictEqual(build(b, fakeTerser(M.TERSER, "code = '/*other*/' + code")).status, 0);
  const V = d => /const V = '([^']+)'/.exec(read(d, 'sw.js'))[1];
  assert.notStrictEqual(V(a), V(b));
  assert.notStrictEqual(sha(a, 'core.js'), sha(b, 'core.js'));
  // The JSON files did not move: their ?v= stays (no new download of the data for a new minifier).
  const v = (d, f) => read(d, 'sw.js').split(`'${f}?v=`)[1].slice(0, 10);
  assert.strictEqual(v(a, 'data.json'), v(b, 'data.json'));
});

test('build_site fails, and nothing is half-built silently: no terser, another version, a ?v= lost in minifying', () => {
  let r = build(copy(), '');
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /terser not found/);
  r = build(copy(), fakeTerser('5.0.0'));
  assert.notStrictEqual(r.status, 0);
  assert.ok(r.stderr.includes(`terser 5.0.0 found, ${M.TERSER} pinned`), r.stderr);
  r = build(copy(), fakeTerser(M.TERSER, "code = code.replace(/data\\.json\\?v=/g, 'data.json?w=')"));
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /app\.js: its \?v= references changed when minified/);
});

test('minify: the scripts it takes, the references it counts', () => {
  const d = copy(),
    s = M.scripts(d);
  assert.ok(s.includes('core.js') && s.includes('admin.js') && s.includes('proto/idkey.js'));
  assert.ok(!s.includes('sw.js') && !s.includes('proto/lab.js'));
  assert.ok(s.every(f => f.endsWith('.js')));
  assert.deepStrictEqual(M.refs('json(\'fish.json?v=4fa868d7d2\'),x="app.js?v=12";`proto/${f}.js?v=1`'), [
    'app.js?v=12',
    'fish.json?v=4fa868d7d2'
  ]);
  // Never toplevel or module: the scripts share their top-level names.
  assert.ok(!('toplevel' in M.OPTIONS) && !('module' in M.OPTIONS) && M.OPTIONS.format.quote_style === 3);
});

test('the workflows: terser pinned as in tools/minify.js; the deploy builds, plays the copy, then uploads', () => {
  for (const f of ['pages.yml', 'smokes.yml']) {
    const pins = [...yml(f).matchAll(/terser@([\d.]+)/g)].map(m => m[1]);
    assert.ok(pins.length && pins.every(v => v === M.TERSER), `${f}: terser@${pins} vs tools/minify.js ${M.TERSER}`);
  }
  const p = yml('pages.yml'),
    at = s => {
      const i = p.indexOf(s);
      assert.ok(i > 0, `pages.yml: no "${s}"`);
      return i;
    };
  const order = [
    'git archive HEAD',
    'tools/build_site.py "$RUNNER_TEMP/pages"',
    'node tests/staged.smoke.js',
    'actions/upload-pages-artifact'
  ].map(at);
  assert.deepStrictEqual(
    order,
    [...order].sort((a, b) => a - b),
    'pages.yml: stage, build, play the copy, then upload'
  );
  assert.ok(
    !/stamp_versions\.py|curplay\.py "\$RUNNER_TEMP/.test(p.replace(/^\s*#.*$/gm, '')),
    'pages.yml: the stamps run in tools/build_site.py only'
  );
});
