// Staged copy test (architecture review of 2026-11-18, R4): plays the site as the deploy builds it (tools/build_site.py:
// the players' curation, the stamps, the scripts minified by terser with source maps), so a minifier bug or a broken
// stamp fails here, before the copy goes live, rather than on the players' phones. The other smokes serve the source and
// several cut core.js as they serve it, so they cannot run on a minified copy; this one serves the copy as it is.
// Checks, with every host but the local server refused (the photos' hosts answered by tests/photostub.js; rule D1):
// 1. each subject (core.js SUBJECTS): Home drawn, then one question of its quiz answered right (tests/answer.js);
// 2. the Lab: the identification key, its module loaded through the stamped LAB_V (proto/lab.js);
// 3. the admin demo (admin.html?demo, the admin's minified scripts, its analysis worker's file);
// 4. the service worker installed from the copy: its shell cache holds every SHELL address, and index.html's scripts are
//    among them (sw.js V and the ?v= agree);
// 5. the source maps: a position in each minified script goes back to its original line (tools/unminify.js).
// Each page: no page error, no Content-Security-Policy refusal, no address of the copy answered 404.
// Run:
//   STAGED_DIR=<dir> node tests/staged.smoke.js   a copy already built (pages.yml, after tools/build_site.py)
//   node tests/staged.smoke.js                    builds one from HEAD (git archive, committed changes only) in a
//                                                 temporary folder; needs terser on NODE_PATH, as tools/minify.js says
//                                                 (npm install --no-save --prefix <folder> terser@<tools/minify.js TERSER>)
const http = require('http'),
  fs = require('fs'),
  os = require('os'),
  path = require('path'),
  {execFileSync, execSync} = require('child_process');
const {chromium} = require('./calm.js'); // playwright; contexts in reduced motion by default
const slot = require('./slot.js');
const qa = require('./answer.js'); // waits for and answers the question on screen, whatever its format
const ROOT = path.join(__dirname, '..');
const C = require('../core.js');
const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.map': 'application/json',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json'
};

// The copy: STAGED_DIR, or one built here from HEAD (its photos left out: img/ is answered from the checkout).
function stage() {
  if (process.env.STAGED_DIR) return {dir: path.resolve(process.env.STAGED_DIR), own: false};
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'reefid-staged-'));
  execSync(`git archive HEAD -- . ':(exclude)img' | tar -x -C "${dir}"`, {cwd: ROOT, stdio: 'inherit'});
  execFileSync('python3', [path.join(ROOT, 'tools', 'build_site.py'), dir, '--build', '0'], {stdio: ['ignore', 'ignore', 'inherit']});
  return {dir, own: true};
}

const serve = DIR =>
  http.createServer((req, res) => {
    const u = decodeURIComponent(new URL(req.url, 'http://x').pathname),
      rel = u.endsWith('/') ? u + 'index.html' : u;
    let f = path.join(DIR, rel);
    if (!f.startsWith(DIR)) return (res.writeHead(403), res.end());
    if (!fs.existsSync(f) && u.startsWith('/img/')) f = path.join(ROOT, rel); // a copy built here has no photos
    fs.readFile(f, (e, b) => {
      if (e) return (res.writeHead(404), res.end());
      res.writeHead(200, {'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream'});
      res.end(b);
    });
  });

// A context where nothing leaves the machine: every other host refused, the photos' hosts answered from the checkout.
async function context(b, base, init, opts = {}, arg) {
  const ctx = await b.newContext({viewport: {width: 1280, height: 800}, serviceWorkers: 'block', ...opts}),
    stub = require('./photostub.js')(ROOT);
  await ctx.route(
    u => !u.href.startsWith(base),
    r => r.abort()
  );
  await stub.r2(ctx);
  await stub.inat(ctx);
  await ctx.addInitScript(qa.PAGE);
  if (init) await ctx.addInitScript(init, arg);
  const p = await ctx.newPage(),
    errs = [];
  p.on('pageerror', e => errs.push(`page error: ${e.message}`));
  p.on('console', m => m.type() === 'error' && /Content Security Policy|Refused to/.test(m.text()) && errs.push(`CSP: ${m.text()}`));
  p.on('response', r => r.url().startsWith(base) && r.status() === 404 && errs.push(`404: ${r.url().slice(base.length)}`));
  return {ctx, p, errs};
}

// Start-up's one-time cards out of the way (as tests/fish.smoke.js settle): each closed by its first button.
async function settle(p) {
  for (let i = 0; i < 8; i++) {
    if (
      !(await p
        .waitForFunction(() => window.CARDS_SAID, null, {timeout: 25000})
        .then(
          () => 1,
          () => 0
        ))
    )
      return 'start-up never settled its cards';
    if (!(await p.$('.unlock'))) return '';
    await p.click('.unlock [data-b="1"]');
  }
  return 'start-up cards kept coming';
}

const ready = p => p.waitForFunction(() => window.APP_READY, null, {timeout: 30000});

// 1. Each subject: Home, then one question answered.
async function subjects(b, base, fails) {
  for (const s of C.SUBJECTS) {
    const {ctx, p, errs} = await context(
      b,
      base,
      ([id, starts, admin]) => {
        try {
          if (sessionStorage.getItem('staged')) return;
          sessionStorage.setItem('staged', '1');
          localStorage.setItem('reefid-tour', '"done"');
          localStorage.setItem('reefid-sync-subject', JSON.stringify(id));
          for (const k of starts) localStorage.setItem(k, '{"c":"new","t":1}');
          if (admin) localStorage.setItem('reefid-admin-vault', 'smoke'); // a subject open to a group: the admin sees it
        } catch (e) {}
      },
      {},
      [s.id, C.SUBJECTS.map(x => C.startKey(x.id)), s.open === 'group']
    );
    try {
      await p.goto(base + '#' + s.hash + 'home');
      await ready(p);
      const no = await settle(p);
      if (no) fails.push(`${s.id}: ${no}`);
      const home = await p
        .waitForFunction(() => document.querySelector('#view .hdoors'), null, {timeout: 15000})
        .then(
          () => true,
          () => false
        );
      if (!home) fails.push(`${s.id}: Home not drawn (#view .hdoors)`);
      await p.evaluate(h => (location.hash = '#' + h + 'practice/quiz'), s.hash);
      await qa.ready(p);
      const a = await p.evaluate(() => smokeAnswer());
      if (!a.t || a.given !== a.t) fails.push(`${s.id}: the right answer was not given: ${JSON.stringify(a)}`);
      const at = await p.evaluate(() => (typeof SUBJ !== 'undefined' && SUBJ && SUBJ.id) || null);
      if (at !== s.id) fails.push(`${s.id}: the quiz played ${at}`);
    } catch (e) {
      fails.push(`${s.id}: ${e.message.split('\n')[0]}`);
    }
    fails.push(...errs.map(e => `${s.id}: ${e}`));
    await ctx.close();
  }
}

// 2. The Lab: the identification key's module, loaded by proto/lab.js with the stamped LAB_V.
async function lab(b, base, fails) {
  const {ctx, p, errs} = await context(b, base, () => {
    try {
      localStorage.setItem('reefid-tour', '"done"');
      localStorage.setItem('reefid-sync-coral-start', '{"c":"new","t":1}');
    } catch (e) {}
  });
  const got = [];
  p.on('response', r => /\/proto\/\w+\.js\?v=/.test(r.url()) && got.push(`${r.url().slice(base.length)} ${r.status()}`));
  try {
    await p.goto(base + '#' + C.routeOut('idkey'));
    await ready(p);
    const ok = await p
      .waitForFunction(
        // Drawn at its address with no Lab module still loading (as tests/pages.smoke.js drawn; LAB is no window property).
        () => typeof LAB !== 'undefined' && LAB.pending === 0 && typeof hashNow === 'function' && window.ROUTED === hashNow(),
        null,
        {timeout: 20000}
      )
      .then(
        () => true,
        () => false
      );
    if (!ok) fails.push('Lab: the identification key never drew');
    if (!got.some(x => /^proto\/idkey\.js\?v=[0-9a-f]{10} 200$/.test(x))) fails.push(`Lab: proto/idkey.js not loaded: ${got.join(', ')}`);
  } catch (e) {
    fails.push(`Lab: ${e.message.split('\n')[0]}`);
  }
  fails.push(...errs.map(e => `Lab: ${e}`));
  await ctx.close();
}

// 3. The admin demo: its scripts run (DRAFT is the curation it drew from), no error.
async function admin(b, base, fails) {
  const {ctx, p, errs} = await context(b, base);
  try {
    await p.goto(base + 'admin.html?demo');
    await p.waitForFunction(() => typeof DRAFT !== 'undefined' && DRAFT && DRAFT.genera, null, {timeout: 30000});
  } catch (e) {
    fails.push(`admin: ${e.message.split('\n')[0]}`);
  }
  fails.push(...errs.map(e => `admin: ${e}`));
  await ctx.close();
}

// 4. The service worker (registered by the app on https only: registered here, as tests/net.smoke.js does).
async function worker(b, base, dir, fails) {
  const sw = fs.readFileSync(path.join(dir, 'sw.js'), 'utf8'),
    V = /const V = '([^']+)';/.exec(sw)[1],
    i = sw.indexOf('const SHELL'),
    SHELL = new Function(sw.slice(i, sw.indexOf('];', i) + 2) + '; return SHELL;')(),
    html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8'),
    loads = [...html.matchAll(/href="([\w./-]+\.js\?v=[0-9a-f]{10})"/g)].map(m => m[1]);
  const {ctx, p, errs} = await context(b, base, null, {serviceWorkers: 'allow'});
  try {
    await p.goto(base);
    await ready(p);
    await p.evaluate(() => navigator.serviceWorker.register('sw.js').then(() => navigator.serviceWorker.ready));
    const kept = await p.evaluate(async v => {
      const c = await caches.open(v);
      return (await c.keys()).map(r => r.url);
    }, V);
    const rel = kept.map(u => u.slice(base.length)),
      want = SHELL.map(u => (u === './' ? '' : u));
    const missing = want.filter(u => !rel.includes(u));
    if (missing.length) fails.push(`worker: the shell cache ${V} lacks ${missing.join(', ')}`);
    const unshelled = loads.filter(u => !want.includes(u));
    if (unshelled.length) fails.push(`worker: index.html loads what SHELL does not keep: ${unshelled.join(', ')}`);
  } catch (e) {
    fails.push(`worker: ${e.message.split('\n')[0]}`);
  }
  fails.push(...errs.map(e => `worker: ${e}`));
  await ctx.close();
}

// 5. The source maps: an error report's position goes back to its original line (tools/unminify.js), in every minified
// script of the copy. Per script: a string literal of the original that the minified file keeps is found in it (its line
// and column as a browser reports them, from 1), mapped back, and the original line the map names must hold the literal;
// the script ends with its sourceMappingURL. And the premise of the report's `av` check: app.js's hash, as the loader
// names it (index.html app.js?v=), is the hash of the app.js served.
async function maps(dir, fails) {
  const U = require('../tools/unminify.js'),
    scripts = require('../tools/minify.js').scripts(dir);
  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8'),
    named = (/app\.js\?v=([0-9a-f]{10})/.exec(html) || [])[1],
    served = U.h10(fs.readFileSync(path.join(dir, 'app.js')));
  if (named !== served)
    fails.push(`maps: index.html names app.js ${named}, the file served is ${served} (the report's av check relies on it)`);
  let checked = 0;
  for (const f of scripts) {
    const code = fs.readFileSync(path.join(dir, f), 'utf8'),
      base = path.basename(f);
    if (!code.trimEnd().endsWith(`//# sourceMappingURL=${base}.map`)) {
      fails.push(`maps: ${f} does not end with its sourceMappingURL`);
      continue;
    }
    let map;
    try {
      map = JSON.parse(fs.readFileSync(path.join(dir, f + '.map'), 'utf8'));
    } catch (e) {
      fails.push(`maps: ${f}.map: ${e.message}`);
      continue;
    }
    const orig = String((map.sourcesContent || [])[0] || ''),
      lit = [...code.matchAll(/'[A-Za-z][A-Za-z0-9 _:.\/-]{3,59}'/g)].map(m => m[0]).find(s => orig.includes(s));
    if (!lit) {
      fails.push(`maps: ${f} holds no string literal to look for (widen the pattern of tests/staged.smoke.js maps)`);
      continue;
    }
    const at = code.indexOf(lit),
      before = code.slice(0, at).split('\n'),
      pos = `${before.length}:${before[before.length - 1].length + 1}`;
    const r = await U.unminify(U.fromDir(dir), `${f}:${pos}`);
    const to = /-> (\S+):(\d+):(\d+)/.exec(r.lines[0] || '');
    if (r.code !== 0 || !to) {
      fails.push(`maps: ${f}:${pos} (${lit}) not mapped: ${r.lines.join(' | ')}`);
      continue;
    }
    if (!(orig.split('\n')[+to[2] - 1] || '').includes(lit))
      fails.push(`maps: ${f}:${pos} went to ${to[1]}:${to[2]}, which does not hold ${lit}`);
    checked++;
  }
  if (checked !== scripts.length) fails.push(`maps: ${checked} of ${scripts.length} scripts mapped back`);
  return `${checked} of ${scripts.length} scripts mapped back`;
}

(async () => {
  await slot('staged.smoke');
  const {dir, own} = stage(),
    server = serve(dir);
  await new Promise(ok => server.listen(0, '127.0.0.1', ok));
  const base = `http://127.0.0.1:${server.address().port}/`,
    b = await chromium.launch(),
    fails = [];
  // The copy is minified (a check that this smoke plays what the deploy serves, not the source).
  const core = fs.readFileSync(path.join(dir, 'core.js'), 'utf8');
  if (!/sourceMappingURL=core\.js\.map/.test(core) || !fs.existsSync(path.join(dir, 'core.js.map')))
    fails.push('the copy is not minified (core.js has no source map)');
  await subjects(b, base, fails);
  await lab(b, base, fails);
  await admin(b, base, fails);
  await worker(b, base, dir, fails);
  const mapped = await maps(dir, fails);
  await b.close();
  server.close();
  if (own) fs.rmSync(dir, {recursive: true, force: true});
  if (fails.length) {
    console.error([...new Set(fails)].join('\n'));
    process.exit(1);
  }
  console.log(`staged smoke: OK (${C.SUBJECTS.map(s => s.id).join(', ')}, the Lab, the admin, the worker, the source maps: ${mapped})`);
})().catch(e => {
  console.error(e);
  process.exit(1);
});
