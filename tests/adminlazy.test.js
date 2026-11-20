require('./slot.js').testGuard();
// The admin's lazy scripts (admin.js lazyLoad, lazyPage; admin.html's inert tags; Pierre, 2026-11-19: the admin on his phone
// "takes longer and longer to open"): analysis.js, admin-analyses.js and admin-demo.js are fetched when a page needs them,
// not by every visit. Tags in order, once per file, a failed file asked for again, the page waiting says Loading… and one
// request however many times render() runs; the boot of ?demo waits for the demo; a file loads only after the one before it
// (a failed dependency never runs its dependent); the fish auto-sort still runs at every load (rule A1), at idle, and a
// Publish before it runs it. admin-heatmap.js stays a plain tag: it puts heatLab, heatUp… in the
// global scope, which admin-journey.js names (found by the smoke: "heatLab is not defined" on a Journey).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  block = require('./block.js');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'admin.html'), 'utf8'),
  src = fs.readFileSync(path.join(ROOT, 'admin.js'), 'utf8');

// The inert tags of admin.html as the page has them: [{src, lazy}] in document order.
const inert = [...html.matchAll(/<script type="text\/plain" data-lazy="([^"]+)" src="([^"]+)"><\/script>/g)].map(m => ({
  lazy: m[1],
  src: m[2]
}));

// admin.js's block with a fake document: createElement gives a script that, once appended to head, loads (or fails) on a
// timer, in the order appended, as dynamic scripts with async = false run.
// selfDraw: the Analyses script, once loaded with its partner, draws the page on screen over the note (its last line).
function world(fail = new Set(), selfDraw = false) {
  const W = {inserted: [], rendered: 0, warned: [], v: {innerHTML: ''}};
  const tags = inert.map(t => ({dataset: {lazy: t.lazy}, getAttribute: () => t.src}));
  const ctx = {
    document: {
      querySelectorAll: sel => {
        assert.strictEqual(sel, 'script[type="text/plain"][data-lazy]');
        return tags;
      },
      createElement: () => ({
        remove() {
          this.removed = true;
        }
      }),
      head: {
        appendChild: s => {
          W.inserted.push(s);
          setTimeout(() => {
            if (fail.has(s.src)) return s.onerror();
            if (selfDraw && /^admin-analyses\.js/.test(s.src)) W.v.innerHTML = '<div>the page</div>';
            s.onload();
          }, 1);
        }
      }
    },
    $v: W.v,
    cur: 'analyses/overview',
    render: () => W.rendered++,
    console: {warn: m => W.warned.push(m)}
  };
  vm.createContext(ctx);
  vm.runInContext(
    block(src, 'const LAZY = {};', '\nfunction render() {', {file: 'admin.js'}) +
      '\nthis.M = {lazyLoad, lazyPage, LAZY_WAIT, analysesIn, LAZYMAP: LAZY};',
    ctx
  );
  return Object.assign(W, {ctx, ...ctx.M});
}
const tick = (n = 10) => new Promise(ok => setTimeout(ok, n));
const bare = s => s.replace(/\?.*$/, '');

test('admin.html: the lazy scripts are inert tags, in the order they ran in, with the versions the stamping reads', () => {
  assert.deepStrictEqual(
    inert.map(t => bare(t.src)),
    ['analysis.js', 'admin-demo.js', 'admin-analyses.js']
  );
  inert.forEach(t => {
    assert.match(t.src, /^[\w-]+\.js\?v=\d+$/, t.src);
    assert.ok(fs.existsSync(path.join(ROOT, bare(t.src))), t.src);
    // never also a real tag: a file fetched by every visit is what this moves away from
    assert.ok(!html.includes(`<script src="${t.src}"`), `${t.src} is also loaded by every visit`);
  });
  // the groups: the Analyses pages, the demo (which builds its made-up log with analysis.js)
  assert.deepStrictEqual(
    inert.map(t => t.lazy),
    ['analyses demo', 'demo', 'analyses']
  );
  // every one stands before admin.js: its start (or lazyAhead, at once) may ask for a group while the page is still being
  // parsed, and a tag below admin.js might not be in the page yet (found by the smoke: an Analyses address opened straight
  // stayed on Loading…, the admin-analyses.js tag not yet parsed when the group was asked for)
  const at = f => html.indexOf(f);
  assert.ok(at('src="core.js?') < at('src="analysis.js?'));
  inert.forEach(t => assert.ok(at(`src="${t.src}"`) < at('src="admin.js?'), `${t.src} below admin.js`));
  // the heatmap's globals (heatLab...) are named by the Journey: a plain tag, not a lazy one
  assert.match(html, /<script src="admin-heatmap\.js\?v=\d+"><\/script>/);
});

test('lazyLoad: a group inserts its files in order, each only once the one before it has loaded, once; groups share a file', async () => {
  const w = world();
  const a = w.lazyLoad('analyses');
  await Promise.resolve();
  assert.deepStrictEqual(
    w.inserted.map(s => bare(s.src)),
    ['analysis.js'],
    'the dependent waits for its dependency to load'
  );
  await a;
  assert.deepStrictEqual(
    w.inserted.map(s => s.src),
    inert.filter(t => t.lazy.includes('analyses')).map(t => t.src)
  );
  await w.lazyLoad('analyses');
  assert.strictEqual(w.inserted.length, 2, 'asked again: nothing inserted again');
  // the demo wants analysis.js too: only admin-demo.js is new
  await w.lazyLoad('demo');
  assert.deepStrictEqual(
    w.inserted.map(s => bare(s.src)),
    ['analysis.js', 'admin-analyses.js', 'admin-demo.js']
  );
  // an unknown group loads nothing
  await w.lazyLoad('nothing');
  assert.strictEqual(w.inserted.length, 3);
});

test('lazyLoad: the demo alone loads analysis.js then admin-demo.js, never the Analyses views', async () => {
  const w = world();
  await w.lazyLoad('demo');
  assert.deepStrictEqual(
    w.inserted.map(s => bare(s.src)),
    ['analysis.js', 'admin-demo.js']
  );
});

test('lazyLoad: two calls while a file is on its way share it', async () => {
  const w = world();
  const a = w.lazyLoad('analyses'),
    b = w.lazyLoad('analyses');
  await Promise.all([a, b]);
  assert.strictEqual(w.inserted.length, 2);
});

test('lazyLoad: a file that failed is removed and asked for again, never a cached failure', async () => {
  const bad = inert.find(t => t.src.startsWith('admin-analyses.js')).src,
    fail = new Set([bad]),
    w = world(fail);
  await assert.rejects(w.lazyLoad('analyses'), /admin-analyses\.js\?v=\d+ not loaded/);
  assert.ok(w.inserted[1].removed, 'the failed tag is taken out');
  fail.clear();
  await w.lazyLoad('analyses');
  assert.strictEqual(w.inserted.length, 3, 'only the failed file asked for again');
  assert.strictEqual(bare(w.inserted[2].src), 'admin-analyses.js');
});

test('lazyPage: Loading… at once, one request however often it is asked, no second draw when the script drew the page', async () => {
  const w = world(new Set(), true);
  w.lazyPage('analyses', w.ctx.cur);
  assert.match(w.v.innerHTML, /Loading…/);
  w.lazyPage('analyses', w.ctx.cur);
  w.lazyPage('analyses', w.ctx.cur);
  await tick();
  assert.strictEqual(w.inserted.length, 2);
  // the Analyses script drew its page over the note (its last line): render() is not called again from here
  assert.strictEqual(w.v.innerHTML, '<div>the page</div>');
  assert.strictEqual(w.rendered, 0);
  assert.strictEqual(w.LAZY_WAIT.size, 0);
});

test('lazyPage: the note still on screen once the whole group is in: the page is drawn from here, once', async () => {
  const w = world();
  w.lazyPage('analyses', w.ctx.cur);
  w.lazyPage('analyses', w.ctx.cur);
  await tick();
  assert.strictEqual(w.rendered, 1);
});

test('lazyPage: analysis.js fails: admin-analyses.js is never run, a word on the page, the next visit asks for both and the page is drawn', async () => {
  const first = inert.find(t => t.src.startsWith('analysis.js')).src,
    fail = new Set([first]),
    w = world(fail);
  w.lazyPage('analyses', w.ctx.cur);
  await tick();
  assert.match(w.v.innerHTML, /could not be loaded/);
  // the dependent is not even inserted: it would run, throw at its top level, and be cached as loaded (Codex, P2)
  assert.deepStrictEqual(
    w.inserted.map(s => bare(s.src)),
    ['analysis.js']
  );
  assert.strictEqual(w.analysesIn(), false);
  assert.deepStrictEqual(Object.keys(w.LAZYMAP), [], 'nothing cached: neither a failure nor the dependent as loaded');
  // the next visit: both files are fetched, in order
  fail.clear();
  w.lazyPage('analyses', w.ctx.cur);
  await tick();
  assert.deepStrictEqual(
    w.inserted.map(s => bare(s.src)),
    ['analysis.js', 'analysis.js', 'admin-analyses.js']
  );
  assert.strictEqual(w.rendered, 1, 'nothing drew over the note: drawn from here');
});

// The reason the loads are a chain: the real admin-analyses.js, run without analysis.js, throws at its top level (AN_HELP_COMMON
// reads ANALYSIS.PRIMARY) before it registers its help, and the browser would still fire its load event.
test('admin-analyses.js run without analysis.js throws at its top level (so it never runs after a failed dependency)', () => {
  const ctx = {HELP: {}, document: {}, window: {}, location: {search: ''}, addEventListener() {}, console};
  vm.createContext(ctx);
  assert.throws(() => vm.runInContext(fs.readFileSync(path.join(ROOT, 'admin-analyses.js'), 'utf8'), ctx), /ANALYSIS|not defined/);
  assert.deepStrictEqual(Object.keys(ctx.HELP), [], 'its help was not registered');
});

test('analysesIn: both files are needed, admin-analyses.js alone draws nothing', () => {
  const w = world();
  assert.strictEqual(w.analysesIn(), false);
  w.ctx.renderAnalyses = () => {};
  assert.strictEqual(w.analysesIn(), false, 'without ANALYSIS');
  w.ctx.ANALYSIS = {};
  assert.strictEqual(w.analysesIn(), true);
  assert.match(block(src, 'if (anPage(cur)) {', '\n  }', {file: 'admin.js'}), /if \(analysesIn\(\)\) return renderAnalyses\(\);/);
});

test('lazyPage: a failure says so only on the page that asked, and is asked again by the next visit', async () => {
  const bad = inert.find(t => t.src.startsWith('admin-analyses.js')).src;
  const f = world(new Set([bad]));
  f.ctx.cur = 'analyses/overview';
  f.lazyPage('analyses', f.ctx.cur);
  await tick();
  assert.match(f.v.innerHTML, /could not be loaded/);
  assert.strictEqual(f.LAZY_WAIT.size, 0, 'asked again by the next visit');
  assert.ok(f.warned.length === 1);
  // the admin went to another page meanwhile: that page is left alone
  const g = world(new Set([bad]));
  g.ctx.cur = 'analyses/overview';
  g.lazyPage('analyses', g.ctx.cur);
  g.ctx.cur = 'photos/candidates';
  g.v.innerHTML = 'Candidates';
  await tick();
  assert.strictEqual(g.v.innerHTML, 'Candidates', 'the page on screen is left alone');
});

test('admin.js: the Analyses pages ask for their scripts, the demo boots after its own, and nothing else loads them', () => {
  assert.match(block(src, 'if (anPage(cur)) {', '\n  }', {file: 'admin.js'}), /lazyPage\('analyses', cur\)/);
  const boot = block(src, '  if (DEMO) {\n    // The demo answers', "TOKEN = 'demo';", {file: 'admin.js'});
  assert.match(boot, /await lazyLoad\('demo'\)/);
  // an address that opens on an Analyses page asks for its scripts at once, before the token is checked
  assert.match(block(src, 'const lazyAhead = () => {', '\n};', {file: 'admin.js'}), /anPage\(landing\(\)\)\) lazyLoad\('analyses'\)/);
  assert.match(block(src, '(async () => {\n  lazyAhead();', '  if (DEMO) {', {file: 'admin.js'}), /lazyAhead\(\);/);
  // the demo is the address's, as admin-demo.js reads it (the file is not in yet when admin.js runs)
  assert.match(src, /const DEMO = !!window\.ADMIN_DEMO \|\| \/\[\?&\]demo\\b\/\.test/);
  const demo = fs.readFileSync(path.join(ROOT, 'admin-demo.js'), 'utf8');
  assert.match(demo, /if \(!\/\[\?&\]demo\\b\/\.test\(location\.search\)\) return;/);
  // no code loads the lazy files in any other way
  for (const f of ['analysis.js', 'admin-analyses.js', 'admin-demo.js'])
    assert.ok(!new RegExp(`['"\`]${f.replace('.', '\\.')}\\?v=`).test(src), `${f} named with ?v= in admin.js`);
});

// What the lazy files leave to others: no script that stays on every visit names a top-level name of a lazy one
// (admin.js names anKey and renderAnalyses behind a typeof; the helpers of admin-analyses.js, svg, lines, bars…, are its own).
// It reads top-level declarations only: a file that exports names from inside an IIFE (Object.assign(root, API), as
// admin-heatmap.js does for heatLab, which admin-journey.js names) is not covered, and stays a plain tag for that reason.
test('no always-loaded script names what a lazy script defines, but behind a typeof', () => {
  const lazyFiles = ['admin-analyses.js', 'analysis.js', 'admin-demo.js'];
  const names = new Set();
  for (const f of lazyFiles) {
    const t = fs.readFileSync(path.join(ROOT, f), 'utf8');
    for (const m of t.matchAll(/^(?:async function\*?|function\*?|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm)) names.add(m[1]);
  }
  // names too common to say anything (each file declares its own locals of them), kept by hand: every one is checked below
  const alone = new Set(['svg', 'fit', 'ticks', 'lines', 'bars', 'pc', 'rows', 'd', 'v']);
  const eager = [...html.matchAll(/<script src="([^"?]+)\?v=\d+"><\/script>/g)].map(m => m[1]);
  assert.ok(eager.includes('admin.js') && eager.includes('admin-journey.js') && eager.includes('admin-heatmap.js'));
  const hits = [];
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (const f of eager) {
    const t = fs.readFileSync(path.join(ROOT, f), 'utf8');
    for (const n of names) {
      if (alone.has(n)) continue;
      const re = new RegExp(`(?<![\\w$.'"-])${esc(n)}(?![\\w$'"-])`, 'g');
      for (const m of t.matchAll(re)) {
        const line = t.slice(t.lastIndexOf('\n', m.index) + 1, t.indexOf('\n', m.index));
        if (/^\s*\/\//.test(line) || new RegExp(`typeof ${esc(n)} `).test(line) || /^\s*\/\//.test(line.slice(0, m.index))) continue;
        // a comment's mention, a declaration of its own (a local of the same name), a property
        const own = new RegExp(`(?:function\\s+|const\\s+|let\\s+|var\\s+|,\\s*|\\(\\s*|\\{\\s*)${esc(n)}\\s*(?:=|,|\\)|\\(|;|\\})`).test(
          t
        );
        if (!own && !t.slice(t.lastIndexOf('\n', m.index) + 1, m.index).includes('//'))
          hits.push(`${f}: ${n}: ${line.trim().slice(0, 100)}`);
      }
    }
  }
  // the two guarded references: admin.js names anKey and renderAnalyses behind a typeof
  const known = hits.filter(h => !/^admin\.js: (anKey|renderAnalyses): /.test(h));
  assert.deepStrictEqual(known, []);
  assert.ok(/typeof anKey === 'function' && anKey\(cur\)/.test(src) && /typeof renderAnalyses === 'function'/.test(src));
});

// Rule A1: the fish auto-sort populates the draft at each admin load, whatever page the admin stays on. It is scheduled at idle
// by the laying (sugRun, in both openings), never held for a page, and a Publish that comes first runs it (asortDone).
test('the fish auto-sort runs at every admin load, at idle, whatever the opening; a Publish before it runs it first', () => {
  assert.ok(!/ASORT_WAIT/.test(src), 'no page holds the fish auto-sort back');
  const run = block(src, 'const fishLater = () =>', '  };\n  // Opened on a Players page', {file: 'admin.js'});
  assert.match(run, /ASORT_GO = fishLater;/);
  assert.match(run, /requestIdleCallback\(fishLater, \{timeout: 4000\}\) : setTimeout\(fishLater, 1500\)/);
  assert.ok(!/\blate\b/.test(run), 'the opening does not change when the auto-sort is scheduled');
  // the laying, so the auto-sort with it, runs in both openings: at once, or in SUG_LATE (sugLater: sheet reads in, idle)
  const start = block(src, 'const keep = changed().length;', '\n  else sugRun();', {file: 'admin.js'});
  assert.match(start, /SUG_LATE = \(\) => \{\n\s*sugCands\(\);\n\s*sugRun\(\);/);
  // Publish reads the draft after the auto-sorts of the load are done
  const save = block(src, 'async function save() {', 'const ch = changed(),', {file: 'admin.js'});
  assert.match(save, /if \(TOKEN && \(SUG_LATE \|\| ASORT_GO\)\) await asortDone\(\);/);
});

// asortDone with stubs: the laying first when it is still to come, then the auto-sort (once), never a rejection.
test('asortDone: waits for the suggestions, then runs or joins the fish auto-sort', async () => {
  const calls = [];
  const ctx = {
    SUG_LATE: null,
    ASORT_GO: null,
    sugLoad: () => (calls.push('sug'), ctx.SUG_LATE ? Promise.reject(new Error('x')) : Promise.resolve()),
    console
  };
  vm.createContext(ctx);
  vm.runInContext(
    block(src, 'async function asortDone() {', '\nfunction sugLoad() {', {file: 'admin.js'}) + '\nthis.asortDone = asortDone;',
    ctx
  );
  await ctx.asortDone();
  assert.deepStrictEqual(calls, ['sug'], 'nothing pending: nothing run');
  let n = 0;
  ctx.ASORT_GO = () => (calls.push('fish'), n++, Promise.resolve());
  await ctx.asortDone();
  assert.deepStrictEqual(calls, ['sug', 'sug', 'fish']);
  ctx.SUG_LATE = () => {};
  await ctx.asortDone(); // the laying failed: the auto-sort is still asked, nothing rejects
  assert.strictEqual(n, 2);
});
