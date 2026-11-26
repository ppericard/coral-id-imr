require('./slot.js').testGuard();
// Rule D1, REE-341: only the deployed site talks to the real sheet (app.js SHEET_SITE, the one opt-in); every other copy
// (a developer's or a review's server, on this computer or the network, file:, a fork, another site on the same origin, a
// browser driven by a program) is a local copy (LOCAL) whose every request to the sheet, reads included (the photo
// statistics, a subject's own, the leaderboard, the achievements' shares), goes through app.js sheetFetch and never
// reaches fetch. The deployed configuration still reaches the sheet: checked here against a stand-in fetch, never the
// real one (nothing leaves this process).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  block = require('./block');

const ROOT = path.join(__dirname, '..'),
  read = f => fs.readFileSync(path.join(ROOT, f), 'utf8'),
  APP = read('app.js'),
  SYNC = read('sync.js'),
  PROG = read('progress.js'),
  INDEX = read('index.html');

// app.js's sheet gate as the page runs it: the sheet's address, the opt-in, LOCAL and sheetFetch.
const GATE = block(APP, 'const SYNC_URL = ', 'local: true}));\n', {file: 'app.js', through: true});
// The reads every page makes without a name: the photo statistics (start-up, every 10 minutes, back to a visible tab),
// a subject's own (a subject switch), the leaderboard and the achievements' shares.
const READS = [
  block(SYNC, 'function loadStats() {', '\n}\n', {file: 'sync.js', through: true}),
  block(SYNC, 'const ownStatsAt = {};', '\n}\n', {file: 'sync.js', through: true}),
  block(PROG, 'const boardAt = {},', '\n  boardP = {};\n', {file: 'progress.js', through: true}),
  block(PROG, 'const loadBoard = ', '\n};\n', {file: 'progress.js', through: true}),
  block(PROG, 'let achsAt = 0,', '\n};\n', {file: 'progress.js', through: true})
].join('\n');

// A page at address href (webdriver: a browser driven by a program): its LOCAL, and every request that reached fetch
// while it loaded the statistics (its own subject's too), the leaderboard and the achievements' shares.
function page(href, {webdriver = false, stub = null} = {}) {
  const u = new URL(href),
    sent = [],
    CORAL = {id: 'coral', board: true}; // the first subject's board (progress.js board0): no &s=
  const ctx = {
    location: {href, origin: u.origin, protocol: u.protocol, hostname: u.hostname, pathname: u.pathname, hash: u.hash},
    navigator: {webdriver, onLine: true},
    window: stub ? {SHEET_STUB: stub} : {},
    fetch: (url, o) => (sent.push({url: String(url), method: (o && o.method) || 'GET'}), new Promise(() => {})),
    performance: {now: () => 0},
    DATA: {},
    SUBJ: {id: 'seaslug', stats: 1},
    sheetV: () => 1,
    appVer: () => 'test',
    devId: () => 'dev',
    store: {get: (k, d) => d, set: () => {}},
    subjDev: (s, k) => s + '-' + k,
    boardSubj: () => CORAL,
    board0: () => CORAL,
    boardOk: () => true
  };
  vm.createContext(ctx);
  vm.runInContext(
    `${GATE}\n${READS}\nthis.LOCAL = LOCAL; this.SYNC_URL = SYNC_URL; loadStats(); loadOwnStats(); loadBoard(); loadAchs();`,
    ctx
  );
  return {local: ctx.LOCAL, sent, url: ctx.SYNC_URL};
}

test('a copy anywhere but the deployed site is local: its sheet reads (statistics, leaderboard, achievements) never reach fetch', () => {
  for (const href of [
    'http://localhost:8000/#home',
    'http://127.0.0.1:8000/',
    'http://[::1]:8000/',
    'file:///home/dev/coral-id-imr/index.html',
    'http://192.168.1.20:8000/', // a review copy opened from a phone on the same network
    'http://reviewer.local:8000/',
    'https://coral.test/', // a made-up host name (rule D1's incident)
    'https://someone.github.io/coral-id-imr/', // a fork's site
    'https://ppericard.github.io/', // another site on the same origin
    'https://ppericard.github.io/coral-id-imr-staging/',
    'https://ppericard.github.io/reefrecall/'
  ]) {
    const r = page(href);
    assert.strictEqual(r.local, true, `${href}: LOCAL`);
    assert.deepStrictEqual(r.sent, [], `${href}: a request reached fetch`);
  }
});

test('a browser driven by a program is local even on the deployed site', () => {
  const r = page('https://ppericard.github.io/coral-id-imr/#home', {webdriver: true});
  assert.strictEqual(r.local, true);
  assert.deepStrictEqual(r.sent, []);
});

test('a local copy reads from a test’s SHEET_STUB only', () => {
  const asked = [];
  const r = page('http://localhost:8000/', {stub: url => (asked.push(String(url).replace(/^[^?]*\?/, '')), new Promise(() => {}))});
  assert.deepStrictEqual(r.sent, []);
  // No device id from a local copy (sync.js loadStats).
  assert.deepStrictEqual(asked, ['stats=1&av=test', 'stats=1&s=seaslug&av=test', 'board=1', 'achs=1']);
});

test('the deployed site (index.html og:url) reaches the sheet: its reads go to fetch at SYNC_URL', () => {
  const site = /<meta property="og:url" content="([^"]+)">/.exec(INDEX)[1];
  assert.strictEqual(/const SHEET_SITE = '([^']+)'/.exec(APP)[1], site, 'SHEET_SITE is the deployed address');
  for (const href of [site, site + '#quiz', site + 'index.html', site.replace('coral-id-imr', 'Coral-ID-IMR')]) {
    const r = page(href);
    assert.strictEqual(r.local, false, `${href}: not LOCAL`);
    assert.deepStrictEqual(
      r.sent.map(x => x.url.replace(r.url, '')),
      ['?stats=1&av=test&dev=dev&up=0', '?stats=1&s=seaslug&av=test', '?board=1', '?achs=1'],
      href
    );
  }
});

// Every script the app's page loads (index.html, the service worker) sends to the sheet through sheetFetch alone: a bare
// fetch (or a beacon) with SYNC_URL would leave a local copy (the photo statistics did, REE-341).
test('every request to the sheet in the app’s scripts goes through sheetFetch', () => {
  const files = [...new Set([...INDEX.matchAll(/(?:src|href)="([^"?#]+\.js)(?=[?#"])/g)].map(m => m[1]).concat('sw.js'))];
  assert.ok(files.includes('sync.js') && files.includes('progress.js') && files.includes('app.js'), files.join(' '));
  const bad = [];
  for (const f of files) {
    const lines = read(f).split('\n');
    lines.forEach((line, i) => {
      if (!/(^|[^\w$])(fetch|sendBeacon)\(/.test(line.replace(/\/\/.*$/, ''))) return;
      // The call's first argument may start on the next line (Prettier): look at both.
      if (/SYNC_URL|script\.google/.test(line + (lines[i + 1] || ''))) bad.push(`${f}:${i + 1}: ${line.trim().slice(0, 100)}`);
    });
  }
  assert.deepStrictEqual(bad, [], 'a request to the sheet that bypasses sheetFetch');
});
