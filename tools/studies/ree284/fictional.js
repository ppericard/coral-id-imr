'use strict';
// The fictional-edition probe (REE-284 "Local test of content portability"; A27/F27 reconciliation item 5: a fictional
// second edition on localhost before any real one). It builds two tiny, wholly synthetic editions of the player app
// (tools/studies/ree284/course.js: invented organisation words, genera, text and photos; no admin, no IMR media, no
// remote progress service), serves them on 127.0.0.1 with every other destination blocked, plays them headless in the
// pre-installed Chromium, and reports what still ties an edition to IMR:
//
//   1. the files: which shared code files the edition is served, which IMR content files its pages still ask for, and
//      the IMR words its visible pages show;
//   2. the network: every destination outside 127.0.0.1 a page or its service worker tried (all blocked), and whether
//      any of them is the production sheet (PR #1626: a copy not served from the deployed site never reaches it);
//   3. the caches: Cache Storage, localStorage and IndexedDB after a play, and what a second edition on the same origin
//      (path /b/ beside /a/) does to the first (A27's finding at sw.js activate: one origin per organisation);
//   4. a synthetic export in the legacy format (the storage names before the rename, LEGACY_KEYS) loaded into the
//      fictional edition: what it keeps, what it drops, and what it sends where.
//
//   node tools/studies/ree284/fictional.js                 # exit 1 when a check fails or a dependency is new
//   node tools/studies/ree284/fictional.js --json out.json # the full findings as JSON too
//   node tools/studies/ree284/fictional.js --keep          # keep the built editions and screenshots (path printed)
//
// No app file changes: the editions are built in a temporary folder, from the repository's published code files as they
// are, with core.js ORG replaced and the static pages rewritten by tools/rename_app.py (the fork procedure core/keys.js
// documents), and the edition's own content files beside them. Nothing reaches the sheet, R2, GitHub or any other host
// (rule D1): Playwright aborts every request that is not for 127.0.0.1 and Chromium resolves no other host name, with no
// proxy. Takes the machine slot (rule W24). Findings: docs/reviews/2026-11-27-fictional-edition.md.
const fs = require('fs'),
  os = require('os'),
  path = require('path'),
  http = require('http'),
  {execFileSync} = require('child_process');
const slot = require('../../../tests/slot.js');
const answer = require('../../../tests/answer.js');
const {edition} = require('./course.js');

const ROOT = path.join(__dirname, '..', '..', '..');
const args = process.argv.slice(2),
  KEEP = args.includes('--keep'),
  JSON_OUT = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;

// ---- What counts as an IMR dependency -------------------------------------------------------------------------------
// The words and identifiers of the IMR edition. A visible page of a fictional edition that shows one, a code file that
// holds one, or a request that names one, is a dependency the edition did not choose.
const IMR_DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'data.json'), 'utf8'));
const IMR_GENERA = [...Object.keys(IMR_DATA.gen), ...Object.keys((IMR_DATA.x || {}).gen || {})];
const MARKERS = [
  ['IMR', /\bIMR\b/],
  ['Institute for Marine Research', /Institute for Marine Research/],
  ['Dauin', /Dauin/],
  ['Pierre', /\bPierre\b/],
  ['Coral Finder', /Coral Finder/],
  ['Corals of the World', /Corals of the World/],
  ['ReefCloud', /ReefCloud/],
  ['ppericard', /ppericard/],
  ['coral-id-imr', /coral-id-imr/]
];
const genusHit = text => IMR_GENERA.filter(g => new RegExp(`\\b${g}\\b`).test(text));

// ---- What this probe found at its first run (2026-11-27, origin/main ba94c261) -------------------------------------
// A ratchet: a dependency found that is not listed here fails the run (a new tie to IMR), and one listed that is no longer
// found fails it too, so the list is taken down in the PR that removes it. The report explains each:
// docs/reviews/2026-11-27-fictional-edition.md.
const KNOWN = {
  // Hosts outside 127.0.0.1 the pages or the worker tried (all blocked): IMR's R2 bucket (core.js PHOTO_BASE, sw.js R2).
  hosts: ['pub-934250f83b884a4f890497f2027ce251.r2.dev'],
  // Files of the IMR edition the shared code asked an edition for, which it does not hold (404), without the edition's
  // prefix: during the play, then at the service worker's install (sw.js SHELL).
  missingInPlay: ['/img/reefcloud-example-m.webp', '/seaslug.json'],
  missingAtInstall: ['/fish-game.json', '/fish-photos.json', '/fish.json'],
  // IMR words or genera on the visible pages of edition a (and Home of edition b).
  pages: {
    tour: ['Pierre', 'ReefCloud'],
    home: ['Pierre'],
    genera: [],
    sheet: ['Coral Finder'],
    quiz: [],
    progress: [],
    leaderboard: [],
    about: ['Dauin', 'Pierre', 'Coral Finder', 'Corals of the World'],
    tools: ['Coral Finder'],
    bHome: ['Pierre']
  },
  // Two editions on one origin (/a/ and /b/): whether b's worker left a's shell cache, whether one photo cache holds both
  // editions' photos, and whether b's pages read a's progress.
  isolation: {aShellKept: false, photoCacheShared: true, storageShared: true},
  // The legacy-format export: a unit the edition does not hold is kept in the player's progress (and so in the account).
  legacyForeignKept: true
};
// The differences between what a run found and KNOWN, each as a failure line.
function ratchet(found) {
  const out = [],
    diff = (what, got, want) => {
      const neu = got.filter(x => !want.includes(x)),
        gone = want.filter(x => !got.includes(x));
      if (neu.length) out.push(`${what}: new IMR dependency ${neu.join(', ')} (fix it, or add it to KNOWN with its reason in the report)`);
      if (gone.length) out.push(`${what}: ${gone.join(', ')} no longer found (take it out of KNOWN and the report)`);
    };
  diff('blocked hosts', found.hosts, KNOWN.hosts);
  diff('files asked in play', found.missingInPlay, KNOWN.missingInPlay);
  diff('files asked at install', found.missingAtInstall, KNOWN.missingAtInstall);
  for (const [pg, want] of Object.entries(KNOWN.pages)) diff(`page ${pg}`, found.pages[pg] || [], want);
  for (const [k, v] of Object.entries(KNOWN.isolation))
    if (found.isolation[k] !== v) out.push(`isolation ${k}: ${found.isolation[k]} where KNOWN says ${v} (update KNOWN and the report)`);
  if (found.legacyForeignKept !== KNOWN.legacyForeignKept)
    out.push(`legacy export: a foreign unit kept ${found.legacyForeignKept} where KNOWN says ${KNOWN.legacyForeignKept}`);
  return out;
}

// The served code files of an edition read for IMR words and outside addresses, comment lines left out: file → what →
// its first line numbers (the inspection of the files; the report groups them).
function scanCode(dir, files) {
  const out = {};
  for (const rel of new Set(files)) {
    if (isContent(rel.replace(/^\//, '')) || !/\.(js|html|css|webmanifest)$/.test(rel)) continue;
    // Block comments blanked (line numbers kept), then line comments cut: what is left runs or is shown.
    const blank = m => m.replace(/[^\n]/g, ' ');
    const lines = fs
      .readFileSync(path.join(dir, rel), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, blank)
      .replace(/<!--[\s\S]*?-->/g, blank)
      .split('\n')
      .map(l => l.replace(/(^|\s)\/\/.*$/, ''));
    lines.forEach((l, i) => {
      const hits = [...MARKERS.filter(([, re]) => re.test(l)).map(([n]) => n), ...(l.match(/https:\/\/[a-z0-9.-]+/gi) || [])];
      for (const h of new Set(hits)) {
        const o = (out[rel] = out[rel] || {});
        (o[h] = o[h] || []).push(i + 1);
      }
    });
  }
  return out;
}

// ---- The editions -----------------------------------------------------------------------------------------------------
// The files the deploy publishes (pages.yml: git archive, without what .gitattributes marks export-ignore), present here.
const EXPORT_IGNORE = /^(docs|tests|tools|judging|\.github|\.claude|core)\//;
const published = execFileSync('git', ['-C', ROOT, 'ls-files', '-z'], {encoding: 'utf8'})
  .split('\0')
  .filter(f => f && !EXPORT_IGNORE.test(f) && fs.existsSync(path.join(ROOT, f)));
// Code: what an edition shares with IMR unchanged. Content: what an edition brings of its own (data files, photos, the
// link preview). The admin's files are left out: a fictional edition has no admin (and no curator).
const ADMIN = /^(admin[\w-]*\.(js|css|html)|autosort\.js|analysis\.js)$/;
const isContent = f => /\.json$/.test(f) || /^(img|data)\//.test(f) || f === 'og.jpg';
const isCode = f => !isContent(f) && !ADMIN.test(f) && /\.(js|css|html|webmanifest|svg|png|woff2)$/.test(f);
const CODE = published.filter(isCode),
  CONTENT = published.filter(isContent);

const ORG_RE = /const ORG = \{[^}]*\}/;
// ORG as core/keys.js writes it: flat, single-quoted values, which tools/rename_app.py reads with a pattern that allows
// no quote or backslash inside a value. A value outside plain words is refused rather than escaped.
const ORG_VALUE = /^[A-Za-z0-9 .&-]+$/;
const orgLiteral = o => {
  const bad = Object.entries(o).filter(([k, v]) => !/^\w+$/.test(k) || typeof v !== 'string' || !ORG_VALUE.test(v));
  if (bad.length) throw new Error(`course.js: ORG values must be plain words: ${bad.map(([k]) => k).join(', ')}`);
  return '{\n' + Object.entries(o).map(([k, v]) => `    ${k}: '${v}'`).join(',\n') + '\n  }';
};

// The static pages for an edition: tools/rename_app.py run on a throwaway git repository holding the tool, core.js with
// the edition's ORG, and the pages it rewrites (as tests/renameorg.test.js does).
function renamedPages(org, work) {
  const dir = path.join(work, 'rename');
  const files = ['tools/rename_app.py', 'core.js', 'index.html', 'privacy.html', 'admin.html', 'tools/og/og.html', 'manifest.webmanifest'];
  for (const f of files) {
    fs.mkdirSync(path.dirname(path.join(dir, f)), {recursive: true});
    let s = fs.readFileSync(path.join(ROOT, f), 'utf8');
    if (f === 'core.js') s = s.replace(ORG_RE, 'const ORG = ' + orgLiteral(org));
    fs.writeFileSync(path.join(dir, f), s);
  }
  execFileSync('git', ['init', '-q'], {cwd: dir});
  execFileSync('git', ['add', '.'], {cwd: dir});
  const log = execFileSync(
    'python3',
    ['tools/rename_app.py', '--from', 'IMR Reef ID', '--from-short', 'IMR', '--from-name', 'Institute for Marine Research'],
    {cwd: dir, encoding: 'utf8'}
  );
  const out = {};
  for (const f of ['core.js', 'index.html', 'privacy.html', 'manifest.webmanifest']) out[f] = fs.readFileSync(path.join(dir, f), 'utf8');
  fs.rmSync(dir, {recursive: true, force: true});
  return {out, log};
}

// Each photo of an edition drawn in the browser (a coloured card with its label), encoded as WebP at the four sizes
// the app asks for (the full file, -m, -s, -t): no photo of the repository is used.
async function drawPhotos(page, photos) {
  return page.evaluate(async L => {
    const out = {};
    for (const p of L) {
      const c = new OffscreenCanvas(480, 360),
        x = c.getContext('2d');
      x.fillStyle = `hsl(${p.hue} 55% 45%)`;
      x.fillRect(0, 0, 480, 360);
      x.fillStyle = `hsl(${p.hue} 60% 75%)`;
      for (let i = 0; i < 12; i++) x.fillRect(30 + ((i * 37) % 400), 40 + ((i * 53) % 260), 18 + (p.hue % 20), 18 + (p.hue % 20));
      x.fillStyle = '#fff';
      x.font = 'bold 30px sans-serif';
      x.fillText('SYNTHETIC', 20, 330);
      x.font = '20px sans-serif';
      x.fillText(p.label, 20, 290);
      const b = await c.convertToBlob({type: 'image/webp', quality: 0.6}),
        u = new Uint8Array(await b.arrayBuffer());
      let s = '';
      for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
      out[p.f] = btoa(s);
    }
    return out;
  }, photos);
}

async function buildEdition(id, work, page) {
  const E = edition(id),
    dir = path.join(work, id);
  // An invented genus name that the IMR data holds would hide a leak behind a coincidence.
  const clash = E.genera.filter(g => IMR_GENERA.includes(g));
  if (clash.length) throw new Error(`course.js: edition ${id} uses IMR genus names ${clash.join(', ')}`);
  for (const f of CODE) {
    fs.mkdirSync(path.dirname(path.join(dir, f)), {recursive: true});
    fs.copyFileSync(path.join(ROOT, f), path.join(dir, f));
  }
  const {out, log} = renamedPages(E.org, work);
  for (const [f, s] of Object.entries(out)) fs.writeFileSync(path.join(dir, f), s);
  for (const [f, j] of Object.entries(E.files)) {
    fs.mkdirSync(path.dirname(path.join(dir, f)), {recursive: true});
    fs.writeFileSync(path.join(dir, f), JSON.stringify(j));
  }
  fs.mkdirSync(path.join(dir, 'img'), {recursive: true});
  const pics = await drawPhotos(page, E.photos);
  for (const [f, b64] of Object.entries(pics))
    for (const s of ['', '-m', '-s', '-t']) fs.writeFileSync(path.join(dir, 'img', `${f}${s}.webp`), Buffer.from(b64, 'base64'));
  return {E, dir, renameLog: log};
}

// ---- The server -------------------------------------------------------------------------------------------------------
const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json'
};
function serve(dirs, hits) {
  return http.createServer((req, res) => {
    const u = decodeURIComponent(new URL(req.url, 'http://x').pathname),
      m = /^\/([ab])(\/.*)$/.exec(u);
    const done = code => {
      hits.push({ed: m ? m[1] : '', path: m ? m[2] : u, code});
      res.writeHead(code);
      res.end();
    };
    if (!m || !dirs[m[1]]) return done(404);
    const rel = m[2].endsWith('/') ? m[2] + 'index.html' : m[2],
      f = path.join(dirs[m[1]], rel);
    if (!f.startsWith(dirs[m[1]] + path.sep)) return done(403);
    fs.readFile(f, (e, b) => {
      if (e) return done(404);
      hits.push({ed: m[1], path: m[2], code: 200});
      res.writeHead(200, {'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream'});
      res.end(b);
    });
  });
}

// ---- Helpers in the page ----------------------------------------------------------------------------------------------
const storageOf = p =>
  p.evaluate(async () => {
    const ls = {};
    for (let i = 0; i < localStorage.length; i++) ls[localStorage.key(i)] = localStorage.getItem(localStorage.key(i));
    const caches_ = {};
    if (self.caches)
      for (const k of await caches.keys()) caches_[k] = (await (await caches.open(k)).keys()).map(r => r.url);
    const idb = indexedDB.databases ? (await indexedDB.databases()).map(d => d.name) : [];
    return {ls, caches: caches_, idb};
  });
const textOf = p => p.evaluate(() => document.body.innerText + '\n' + document.title);
// The page's service worker registered (the app registers it on https only; a test does it here, as tests/net.smoke.js
// does), waited for at most `ms`: whether it became active, and what its registration holds otherwise.
const register = (p, ms = 15000) =>
  p.evaluate(
    ms =>
      navigator.serviceWorker.register('sw.js').then(reg =>
        Promise.race([navigator.serviceWorker.ready.then(() => 'active'), new Promise(ok => setTimeout(() => ok('not active'), ms))]).then(
          s => ({
            state: s,
            installing: reg.installing ? reg.installing.state : null,
            waiting: reg.waiting ? reg.waiting.state : null,
            active: reg.active ? reg.active.state : null
          })
        )
      ),
    ms
  );
// The files an edition's pages or worker asked for and did not get (404), by edition and path: files of the IMR edition
// the shared code still expects.
const missing = L => {
  const o = {};
  for (const h of L.filter(x => x.code === 404)) o[`/${h.ed}${h.path}`] = (o[`/${h.ed}${h.path}`] || 0) + 1;
  return o;
};
const markersIn = text => [...MARKERS.filter(([, re]) => re.test(text)).map(([n]) => n), ...genusHit(text).map(g => 'genus ' + g)];

// ---- The run ----------------------------------------------------------------------------------------------------------
(async () => {
  const T0 = Date.now();
  await slot('fictional-edition');
  // A hung step never holds the machine slot for long.
  setTimeout(() => {
    console.error('fictional.js: stopped after 5 minutes');
    process.exit(2);
  }, 300000).unref();
  const {chromium} = require('playwright');
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'reefid-fictional-'));
  // No proxy, and no host name resolves but 127.0.0.1: a request that escaped the routes below fails in the browser too.
  const browser = await chromium.launch({args: ['--no-proxy-server', '--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE 127.0.0.1']});
  const fails = [],
    F = {started: new Date(T0).toISOString(), t: {slot: Date.now() - T0}, files: {}, network: {}, caches: {}, legacy: {}, pages: {}},
    mark = n => (F.t[n] = Date.now() - T0);
  const hits = [];
  let server;
  try {
    const blank = await (await browser.newContext()).newPage();
    const A = await buildEdition('a', work, blank),
      B = await buildEdition('b', work, blank);
    // Edition b is deployed after a: its service worker carries a later shell version (a new deploy changes V; rule W15).
    const swB = path.join(B.dir, 'sw.js');
    fs.writeFileSync(swB, fs.readFileSync(swB, 'utf8').replace(/const V = 'reefid-shell-v(\d+)'/, (s, n) => `const V = 'reefid-shell-v${+n + 1}'`));
    server = serve({a: A.dir, b: B.dir}, hits);
    await new Promise(ok => server.listen(0, '127.0.0.1', ok));
    const base = `http://127.0.0.1:${server.address().port}/`;
    F.files.code = CODE.length;
    F.files.contentLeftOut = CONTENT.length;
    F.files.renameLog = A.renameLog.trim().split('\n').slice(0, 20);
    mark('built');

    // Every request of a context: allowed when for this server, otherwise aborted and recorded with who asked.
    const away = [];
    const guard = async ctx => {
      await ctx.route('**/*', r => {
        const u = r.request().url();
        if (u.startsWith(base) || u.startsWith('data:') || u.startsWith('blob:')) return r.fallback();
        away.push({url: u, type: r.request().resourceType(), worker: !!(r.request().serviceWorker && r.request().serviceWorker())});
        return r.abort('blockedbyclient');
      });
      return ctx;
    };
    const newCtx = async (o = {}) => guard(await browser.newContext({viewport: {width: 390, height: 844}, reducedMotion: 'reduce', ...o}));
    const shot = async (p, name) => KEEP && (await p.screenshot({path: path.join(work, `${name}.png`)}).catch(() => {}));
    const ready = p => p.waitForFunction(() => window.APP_READY === true, null, {timeout: 30000});

    // 0. Sub-test "LOCAL by origin alone" (PR #1626): the one context that hides navigator.webdriver, every host but this
    // server blocked as everywhere. The app must still be a local copy by its address alone and ask nothing of the sheet
    // through start-up and the sheet's reads (tier 4). Every other context keeps webdriver as the browser reports it.
    {
      const c = await newCtx();
      await c.addInitScript(() => Object.defineProperty(Navigator.prototype, 'webdriver', {get: () => false, configurable: true}));
      const from = away.length,
        pg = await c.newPage();
      await pg.goto(base + 'a/');
      await ready(pg);
      await pg.waitForTimeout(4000);
      F.network.originOnly = {
        ...(await pg.evaluate(() => ({LOCAL: typeof LOCAL !== 'undefined' ? LOCAL : null, webdriver: navigator.webdriver}))),
        sheetTried: away.slice(from).filter(x => /^https:\/\/script\.google(usercontent)?\.com\//.test(x.url)).length
      };
      const o = F.network.originOnly;
      if (o.webdriver !== false) fails.push('origin sub-test: navigator.webdriver was not hidden');
      if (o.LOCAL !== true) fails.push(`origin sub-test: a copy on 127.0.0.1 is not local by its address alone (LOCAL ${o.LOCAL})`);
      if (o.sheetTried) fails.push(`origin sub-test: ${o.sheetTried} requests to the sheet script`);
      await c.close();
    }

    // 1-2. Edition a opened by a new player: the tour's first step (what it says of the edition), then, the tour done and
    // the course's genera met (their first-meeting cards are not what this probe reads), Home, the Learn pages, a
    // question answered, My progress, the leaderboard, About and Tools.
    const errs = [];
    {
      const c0 = await newCtx(),
        p0 = await c0.newPage();
      p0.on('pageerror', e => errs.push('new player: ' + String(e.message || e).slice(0, 200)));
      await p0.goto(base + 'a/');
      await ready(p0);
      await p0.waitForTimeout(1500);
      F.pages.tour = {markers: markersIn(await textOf(p0))};
      await shot(p0, 'a-tour');
      await c0.close();
    }
    const ctx = await newCtx();
    await ctx.addInitScript(names => {
      try {
        if (localStorage.getItem('reefid-tour')) return;
        localStorage.setItem('reefid-tour', '1');
        localStorage.setItem('reefid-sync-coral-start', '{"c":"new","t":1}');
        localStorage.setItem('reefid-sync-coral-intro', JSON.stringify(Object.fromEntries(names.map(n => [n, [0, 1]]))));
        localStorage.setItem('reefid-sync-coral-quiz', '{"bon":false}');
      } catch (e) {}
    }, A.E.genera);
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(String(e.message || e).slice(0, 200)));
    await p.goto(base + 'a/');
    await ready(p);
    F.network.local = await p.evaluate(() => ({LOCAL: typeof LOCAL !== 'undefined' ? LOCAL : null, webdriver: navigator.webdriver}));
    if (F.network.local.LOCAL !== true) fails.push(`the fictional edition is not a local copy (app.js LOCAL ${F.network.local.LOCAL})`);
    // The play keeps the app's guard against automated runs (navigator.webdriver, app.js LOCAL): only the dedicated
    // sub-test below hides it.
    if (F.network.local.webdriver !== true)
      fails.push(`the play hides navigator.webdriver (${F.network.local.webdriver}): only the origin sub-test may`);
    const ROUTES = [
      ['home', ''],
      ['genera', '#learn/genera'],
      ['sheet', '#learn/genus/' + A.E.genera[0]],
      ['quiz', '#practice/quiz'],
      ['progress', '#progress'],
      ['leaderboard', '#leaderboard'],
      ['about', '#about'],
      ['tools', '#tools']
    ];
    for (const [name, h] of ROUTES) {
      await p.evaluate(x => (location.hash = x), h);
      await p.waitForTimeout(1500);
      const t = await textOf(p);
      F.pages[name] = {markers: markersIn(t), hash: await p.evaluate(() => location.hash), sample: t.replace(/\s+/g, ' ').slice(0, 300)};
      await shot(p, 'a-' + name);
      if (name === 'genera') {
        const missing = A.E.genera.filter(g => !t.includes(g));
        if (missing.length) fails.push(`the Genera page does not show the fictional genera ${missing.join(', ')}`);
      }
      if (name === 'quiz') {
        const ok = await answer.ready(p, {timeout: 15000, optional: true}).catch(e => (fails.push('quiz: ' + e.message.slice(0, 300)), false));
        if (ok) {
          const r = await p.evaluate(() => smokeAnswer());
          F.pages.quiz.answered = r;
          if (!A.E.genera.includes(r.t)) fails.push(`the question asked ${r.t}, not a fictional genus`);
          await p.waitForTimeout(800);
          // The feedback after the answer counts with the question's page.
          F.pages.quiz.markers = [...new Set([...F.pages.quiz.markers, ...markersIn(await textOf(p))])];
          await shot(p, 'a-quiz-answered');
        } else if (!fails.some(f => f.startsWith('quiz'))) fails.push('no question came on the quiz page');
      }
    }
    F.pages.errors = errs;
    mark('played');
    if (errs.length) fails.push('page errors in the fictional edition: ' + errs.slice(0, 3).join(' | '));

    // 3. The caches and storage after the play, then with the edition's service worker (the app registers it on https
    // only; a test registers it here, as tests/net.smoke.js does).
    F.caches.beforeWorker = await storageOf(p);
    // The anonymous answers the app keeps to send (sync.js): queued, never sent from a local copy (no sheet request above).
    F.network.anonQueued = JSON.parse(F.caches.beforeWorker.ls['reefid-anonq'] || '[]').length;
    F.files.missingInPlay = missing(hits);
    const nPlay = hits.length;
    // The worker's install asks for every file of sw.js SHELL; one that fails three times fails the install.
    F.caches.workerAsIs = await register(p);
    F.files.missingAtInstall = missing(hits.slice(nPlay));
    F.caches.shellMissing = {};
    if (F.caches.workerAsIs.state !== 'active') {
      // The shell files the edition lacks, from what the server refused while the worker installed: each gets an empty
      // placeholder ({} for JSON), recorded, so the cache checks below can run. A real edition would have to ship them.
      for (const h of hits.slice(nPlay).filter(x => x.ed === 'a' && x.code === 404)) {
        const rel = h.path.replace(/\?.*$/, '').replace(/^\//, '');
        if (!rel || rel.startsWith('img/') || F.caches.shellMissing[rel]) continue;
        F.caches.shellMissing[rel] = 1;
        for (const d of [A.dir, B.dir]) fs.writeFileSync(path.join(d, rel), rel.endsWith('.json') ? '{}' : '');
      }
      await p.evaluate(() => navigator.serviceWorker.getRegistration().then(r => r && r.unregister()));
      F.caches.workerWithPlaceholders = await register(p);
    }
    await p.reload();
    await ready(p);
    await p.waitForTimeout(1500);
    F.caches.withWorkerA = await storageOf(p);
    F.caches.controlledA = await p.evaluate(() => !!navigator.serviceWorker.controller);
    mark('workerA');

    // The second edition on the same origin, at /b/: what its worker's activation leaves of a's caches, and what its
    // pages read of a's storage.
    const q = await ctx.newPage();
    q.on('pageerror', e => errs.push('b: ' + String(e.message || e).slice(0, 200)));
    await q.goto(base + 'b/');
    await ready(q);
    F.pages.bHome = {markers: markersIn(await textOf(q))};
    const bSees = await q.evaluate(names => {
      const P = JSON.parse(localStorage.getItem('reefid-sync-coral-progress') || '{}');
      return {aUnitsInB: Object.keys(P).filter(k => names.includes(k)), theme: localStorage.getItem('reefid-sync-coral-theme')};
    }, A.E.genera);
    F.caches.workerB = await register(q);
    await q.waitForTimeout(2500);
    F.caches.afterB = await storageOf(q);
    F.caches.bSeesA = bSees;
    await shot(q, 'b-home');
    mark('editionB');

    // 4. The synthetic legacy-format export, on a fresh device of edition a: its device keys under the old names and its
    // account, saved under the old names, answered by a sheet stub (app.js sheetFetch: a local copy reaches only
    // window.SHEET_STUB).
    const lctx = await newCtx();
    const L = A.E.legacy;
    await lctx.addInitScript(
      ([dev, acct, name, pin]) => {
        if (!sessionStorage.getItem('probe-legacy')) {
          sessionStorage.setItem('probe-legacy', '1');
          for (const [k, v] of Object.entries(dev)) localStorage.setItem(k, v);
        }
        window.PROBE_STUB = [];
        window.SHEET_STUB = (u, o) => {
          const q = new URL(String((u && u.url) || u)).searchParams,
            body = o && o.body ? JSON.parse(o.body) : null;
          window.PROBE_STUB.push(body ? {post: 1, keys: Object.keys(body.data || {})} : {get: 1, q: [...q.keys()]});
          const r = body
            ? {ok: true, log: true, rev: 4}
            : q.get('name') === name && q.get('pin') === pin
              ? {ok: true, found: true, updated: '2026-10-20T10:00:00.000Z', rev: 3, data: acct}
              : {ok: false};
          return Promise.resolve(new Response(JSON.stringify(r), {headers: {'Content-Type': 'application/json'}}));
        };
      },
      [L.device, L.account, L.name, L.pin]
    );
    const lp = await lctx.newPage();
    lp.on('pageerror', e => errs.push('legacy: ' + String(e.message || e).slice(0, 200)));
    await lp.goto(base + 'a/');
    await ready(lp);
    await lp.waitForFunction(() => (window.PROBE_STUB || []).some(x => x.post), null, {timeout: 15000}).catch(() => {});
    const leg = await lp.evaluate(() => ({
      old: Object.keys(localStorage).filter(k => k.startsWith('imr-')),
      prog: JSON.parse(localStorage.getItem('reefid-sync-coral-progress') || '{}'),
      account: JSON.parse(localStorage.getItem('reefid-account') || 'null'),
      theme: document.documentElement.dataset.theme,
      stub: window.PROBE_STUB
    }));
    await lp.evaluate(() => (location.hash = '#learn/genera'));
    await lp.waitForTimeout(1200);
    const legText = await textOf(lp);
    F.legacy = {
      oldKeysLeft: leg.old,
      units: Object.keys(leg.prog),
      device: !!leg.prog[L.expect.device],
      account: !!leg.prog[L.expect.account],
      foreignKept: !!leg.prog[L.expect.foreign],
      foreignShown: legText.includes(L.expect.foreign),
      signedIn: !!(leg.account && leg.account.name === L.name),
      theme: leg.theme,
      stub: leg.stub
    };
    if (leg.old.length) fails.push('legacy export: old keys left on the device: ' + leg.old.join(', '));
    if (!F.legacy.device) fails.push("legacy export: the device's progress under the old name was not kept");
    if (!F.legacy.account) fails.push("legacy export: the account's progress saved under the old names was not read");
    if (F.legacy.foreignShown) fails.push('legacy export: a unit the edition does not hold is shown on its Genera page');
    await shot(lp, 'a-legacy-genera');
    mark('legacy');

    // The network: every destination tried, by host.
    const hosts = {};
    for (const x of away) {
      const h = new URL(x.url).host;
      (hosts[h] = hosts[h] || {n: 0, worker: 0, types: {}, eg: x.url.slice(0, 160)}).n++;
      if (x.worker) hosts[h].worker++;
      hosts[h].types[x.type] = (hosts[h].types[x.type] || 0) + 1;
    }
    F.network.blocked = hosts;
    if (Object.keys(hosts).some(h => /script\.google(usercontent)?\.com$/.test(h)))
      fails.push('a fictional edition tried to reach the sheet script (rule D1, PR #1626)');
    F.files.missingAll = missing(hits);
    F.files.served = [...new Set(hits.filter(x => x.code === 200).map(x => x.path.replace(/\?.*$/, '')))].filter(x => !x.startsWith('/img/')).sort();
    F.files.scan = scanCode(
      A.dir,
      F.files.served.map(x => (x === '/' ? '/index.html' : x))
    );
    // What a's shell cache, the photo cache and the storage show once b came.
    const after = F.caches.afterB.caches,
      eds = L => new Set(L.map(u => (new URL(u).pathname.match(/^\/([ab])\//) || [])[1]));
    const strip = o => [...new Set(Object.keys(o).map(k => k.replace(/^\/[ab]/, '')))];
    const found = {
      hosts: Object.keys(hosts),
      missingInPlay: strip(F.files.missingInPlay),
      missingAtInstall: strip(F.files.missingAtInstall),
      pages: Object.fromEntries(Object.entries(F.pages).filter(([, v]) => v && v.markers).map(([k, v]) => [k, v.markers])),
      isolation: {
        aShellKept: Object.entries(after).some(([k, L]) => k.startsWith('reefid-shell-') && eds(L).has('a')),
        photoCacheShared: Object.values(after).some(L => eds(L).size > 1),
        storageShared: F.caches.bSeesA.aUnitsInB.length > 0
      },
      legacyForeignKept: F.legacy.foreignKept
    };
    F.found = found;
    fails.push(...ratchet(found));
    F.ms = Date.now() - T0 - F.t.slot; // the run itself, without the wait for the machine slot
  } catch (e) {
    fails.push('probe stopped: ' + (e.stack || e).toString().slice(0, 600));
  } finally {
    await browser.close().catch(() => {});
    if (server) server.close();
    if (!KEEP) fs.rmSync(work, {recursive: true, force: true});
    else F.kept = work;
  }
  F.fails = fails;
  if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(F, null, 2));
  const fd = F.found || {};
  console.log(
    [
      `fictional editions: ${F.files.code} shared code files, ${F.files.contentLeftOut} IMR content files left out; ${F.ms} ms (slot wait ${F.t.slot} ms)`,
      `sheet: app.js LOCAL ${(F.network.local || {}).LOCAL} in the play (navigator.webdriver ${(F.network.local || {}).webdriver}), ${
        (F.network.originOnly || {}).LOCAL
      } by origin alone (webdriver hidden, ${(F.network.originOnly || {}).sheetTried} sheet requests); ${
        Object.keys(F.network.blocked || {}).some(h => /script\.google/.test(h)) ? 'REQUESTS TO THE SHEET SCRIPT' : 'no request to the sheet script'
      } (${F.network.anonQueued} anonymous answer kept unsent)`,
      `blocked destinations: ${JSON.stringify(Object.fromEntries(Object.entries(F.network.blocked || {}).map(([h, v]) => [h, v.n])))}`,
      `IMR files asked in play: ${(fd.missingInPlay || []).join(', ')}; at the worker's install: ${(fd.missingAtInstall || []).join(', ')}`,
      `question answered: ${JSON.stringify((F.pages.quiz || {}).answered || null)}`,
      `IMR words on the pages: ${JSON.stringify(fd.pages || {})}`,
      `two editions on one origin: ${JSON.stringify(fd.isolation || {})}`,
      `legacy export: ${JSON.stringify({...F.legacy, stub: undefined})}`,
      F.kept ? `kept: ${F.kept}` : ''
    ]
      .filter(Boolean)
      .join('\n')
  );
  console.log(fails.length ? `\nFAIL (${fails.length}):\n- ${fails.join('\n- ')}` : '\nOK');
  process.exit(fails.length ? 1 : 0);
})();
