'use strict';
require('./slot.js').testGuard();
// The load order's tiers (index.html, app.js pageTier and need; docs/spec/loading.md "Load order in tiers") load what each
// page needs, read from the files themselves:
// - a script of the quiz's tier never needs a name only a later tier declares (unless it asks `typeof` first);
// - each page's tier holds the scripts that draw it: the Learn pages learn.js, the Tools the Lab;
// - proto/lab.css comes with the last tier, in its old place in the cascade, and no rule of it matches the markup of the
//   pages before that tier (those rules are at the end of app.css);
// - the look-alike helpers model.js holds for the quiz and the Learn pages give the results they gave in learn.js.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const block = require('./block.js');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const file = u => u.replace(/[?#].*$/, '');
const HTML = read('index.html');

// The page's files by tier: scripts {file: tier} (tier 1 preloaded, later ones bare data-tier links) and the stylesheets
// in document order, each {file, tier} (rel=stylesheet: 1; a bare data-css=N link: N).
function tiers() {
  const scripts = {},
    css = [];
  for (const m of HTML.matchAll(/<link\b([^>]*)>/gi)) {
    const a = m[1],
      href = (/\bhref="([^"]+)"/.exec(a) || [])[1],
      t = /\bdata-tier="(\d+)"/.exec(a),
      c = /\bdata-css="(\d+)"/.exec(a);
    if (!href) continue;
    if (t) scripts[file(href)] = +t[1];
    else if (c) css.push({file: file(href), tier: +c[1], rel: /\brel=/.test(a)});
    else if (/\brel="stylesheet"/.test(a)) css.push({file: file(href), tier: 1, rel: true});
  }
  return {scripts, css};
}
const strip = s =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map(l => l.replace(/(^|[^:'"`\\])\/\/.*$/, '$1'))
    .join('\n');
// A script's top-level names: declarations at column 0, and the other names of a multi-name const / let.
function declared(src) {
  const names = new Set();
  let multi = false;
  for (const l of src.split('\n')) {
    const m = /^(?:async )?function\*? ?([\w$]+)/.exec(l) || /^(?:const|let|var|class) ([\w$]+)/.exec(l);
    if (m) names.add(m[1]);
    if (/^(?:const|let|var) /.test(l)) multi = true;
    else if (/^\S/.test(l)) multi = false;
    const k = multi && /^ {2}([\w$]+) = /.exec(l);
    if (k) names.add(k[1]);
  }
  return names;
}
const uses = (src, n) => new RegExp('(^|[^\\w$.])' + n.replace(/\$/g, '\\$') + '(?![\\w$])(?!\\s*:(?!:))').test(src);

test('index.html: learn.js after the quiz, the Lab and its stylesheet last, every tier in order', () => {
  const {scripts, css} = tiers();
  assert.strictEqual(scripts['model.js'], 2);
  assert.strictEqual(scripts['quiz.js'], 2);
  assert.strictEqual(scripts['progress.js'], 2);
  assert.strictEqual(scripts['learn.js'], 3, 'learn.js comes after the quiz: the quiz never needs it');
  assert.strictEqual(scripts['proto/lab.js'], 5);
  const lab = css.find(x => x.file === 'proto/lab.css');
  assert.ok(lab && lab.tier === 5 && !lab.rel, 'proto/lab.css is a bare <link data-css="5">: nothing fetched before tier 5');
  // In its old place, between app.css and home.css: the cascade keeps its order once it is a stylesheet.
  assert.deepStrictEqual(
    css.map(x => x.file),
    ['app.css', 'proto/lab.css', 'home.css']
  );
  // A stylesheet never carries data-tier: the inline loader would run it as a script (and bootMax count it).
  assert.ok(!/<link\b[^>]*data-tier="\d+"[^>]*\.css/.test(HTML), 'no stylesheet in a data-tier link');
});

test('a script of the quiz’s tier needs no name that only a later tier declares, unless it asks typeof first', () => {
  const {scripts} = tiers();
  const pre = ['core.js', 'app.js', 'sync.js', 'home-art.js', 'home.js', 'tour.js'];
  assert.ok(
    pre.every(f => new RegExp(`href="${f.replace('.', '\\.')}\\?v=\\d+" as="script" data-tier="1"`).test(HTML)),
    'tier 1 as listed'
  );
  const tierOf = f => (pre.includes(f) ? 1 : scripts[f]);
  const all = [...pre, ...Object.keys(scripts)],
    decl = Object.fromEntries(all.map(f => [f, declared(read(f))]));
  const bad = [];
  for (const f of all.filter(f => tierOf(f) === 2)) {
    const src = strip(read(f));
    for (const g of all.filter(g => tierOf(g) > 2))
      for (const n of decl[g]) {
        if (all.some(h => tierOf(h) <= 2 && decl[h].has(n))) continue; // declared by an earlier tier too
        if (uses(src, n) && !new RegExp('typeof ' + n.replace(/\$/g, '\\$') + '\\b').test(src))
          bad.push(`${f} uses ${n} (${g}, tier ${tierOf(g)})`);
      }
  }
  assert.deepStrictEqual(bad, []);
});

test('app.js pageTier: each page’s tier holds the script that draws it', () => {
  const {scripts} = tiers();
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(
    'const ' + block(read('app.js'), 'pageTier = h =>', ',\n  // Steps of the loading bar', {file: 'app.js'}) + ';\nthis.f = pageTier;',
    ctx
  );
  const pageTier = ctx.f;
  for (const h of ['', 'home', 'about', 'delete-account']) assert.strictEqual(pageTier(h), 1, h);
  for (const h of ['quiz', 'quiz-duel', 'quiz-custom', 'progress', 'board', 'ach', 'live'])
    assert.ok(pageTier(h) >= scripts['quiz.js'] && pageTier(h) >= scripts['progress.js'] && pageTier(h) < scripts['learn.js'], h);
  for (const h of ['genera', 'g-Acropora', 'cmp', 'cmp|Pocillopora|Stylophora', 'cmp-Pocillopora|Stylophora'])
    assert.strictEqual(pageTier(h), scripts['learn.js'], h);
  for (const h of ['lab', 'lab-idkey', 'idkey', 'pairs', 'basics']) assert.strictEqual(pageTier(h), scripts['proto/lab.js'], h);
});

// The class names and ids the pages before tier 5 draw (index.html and the scripts of tiers 1-3): those in a class="…" or
// id="…" attribute (a template's ${…} parts left out), and those a script adds or looks up by name.
function mainMarkup() {
  const {scripts} = tiers();
  const files = [
    'index.html',
    'core.js',
    'app.js',
    'sync.js',
    'home-art.js',
    'home.js',
    'tour.js',
    ...Object.keys(scripts).filter(f => scripts[f] <= 3)
  ];
  const cls = new Set(),
    ids = new Set();
  for (const f of files) {
    const s = read(f);
    for (const m of s.matchAll(/\bclass(?:Name)?=\\?["']([^"']*)/g))
      m[1]
        .replace(/\$\{[^}]*\}/g, ' ')
        .split(/\s+/)
        .forEach(c => c && cls.add(c));
    for (const m of s.matchAll(/classList\.(?:add|toggle|contains)\(\s*'([\w-]+)'/g)) cls.add(m[1]);
    for (const m of s.matchAll(/\bid=\\?["']([\w-]+)/g)) ids.add(m[1]);
    for (const m of s.matchAll(/getElementById\('([\w-]+)'\)/g)) ids.add(m[1]);
  }
  return {cls, ids};
}
// The selectors of a stylesheet, each with its line.
function selectors(css) {
  const out = [],
    src = css.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '));
  let buf = '',
    from = 0;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === '{') {
      const sel = buf.trim();
      if (sel && !sel.startsWith('@') && !/^(from|to|\d+%)$/.test(sel)) {
        const line = src.slice(0, from).split('\n').length;
        sel.split(/,(?![^(]*\))/).forEach(s => out.push({sel: s.trim(), line}));
      }
      buf = '';
      from = i + 1;
    } else if (c === '}' || c === ';') {
      buf = '';
      from = i + 1;
    } else buf += c;
  }
  return out;
}

test('proto/lab.css: no rule for the pages before tier 5 (they are at the end of app.css)', () => {
  const {cls, ids} = mainMarkup();
  assert.ok(cls.has('pgame') && cls.has('gside') && cls.has('pgrid') && ids.has('lightbox'), 'the main pages’ markup is read');
  // Kept on purpose, each also in app.css: in the Lab's games (Reveal) it must come after `.lab .chips`, as before.
  const KEEP = new Set(['.gside .chips']);
  // The concept drawings' colours (--hl), set on the enlarged view too: only the Lab's labels read them (DESIGN.md).
  const VARS_ONLY = new Set(['#lightbox', ":root[data-theme='dark'] :is(.lab, .a2lay, #lightbox)"]);
  const hits = selectors(read('proto/lab.css')).filter(({sel}) => {
    if (KEEP.has(sel) || VARS_ONLY.has(sel)) return false;
    const c = [...sel.replace(/\[[^\]]*\]/g, '').matchAll(/\.([\w-]+)/g)].map(m => m[1]),
      i = [...sel.matchAll(/#([\w-]+)/g)].map(m => m[1]);
    return c.length + i.length > 0 && c.every(x => cls.has(x)) && i.every(x => ids.has(x));
  });
  assert.deepStrictEqual(
    hits.map(h => `line ${h.line}: ${h.sel}`),
    []
  );
  // And the rules moved are in app.css, after its own (lab.css came right after it).
  const app = read('app.css'),
    at =
      app.indexOf('From the Lab’s stylesheet') >= 0 ? app.indexOf('From the Lab’s stylesheet') : app.indexOf("From the Lab's stylesheet");
  assert.ok(at > 0, 'app.css holds the block taken from proto/lab.css');
  for (const s of ['\n.pgrid {', '\n.pgame {', '\n.gside {', '\n.gside .chips {', '\n.pgame .gside {', '\n.ikn {', '\n.ikxtag {'])
    assert.ok(app.indexOf(s, at) > at, `${s.trim()} in app.css's block`);
});

// The look-alike helpers model.js holds (pairs, lsrcOf, isClassic, mixedUp, photoPair, shownGroup, starNote), run on the
// real data.json against the rules they implement; tests/photopair.test.js has photoPair's own cases.
test('model.js look-alike helpers on the real data: pairs, classic pairs, mix-ups, groups and ★ notes', () => {
  const core = require(path.join(ROOT, 'core.js'));
  const D = JSON.parse(read('data.json'));
  const DATA = {...D, gen: D.gen};
  const ctx = {
    DATA,
    P: {Acropora: {conf: {Montipora: 2}}, Montipora: {conf: {Acropora: 1}}},
    GX: n => DATA.gen[n] || (DATA.x && DATA.x.gen[n]),
    lectureGroup: core.lectureGroup,
    starRefs: core.starRefs,
    esc: s => String(s)
  };
  vm.createContext(ctx);
  vm.runInContext(
    block(read('model.js'), '// ---------- Look-alike pairs, shared by the quiz and the Learn pages', '// Once the whole file is in', {
      file: 'model.js'
    }) + '\nthis.M = {pairs, lsrcOf, isClassic, mixedUp, photoPair, shownGroup, starNote};',
    ctx
  );
  const M = ctx.M,
    G = DATA.gen,
    P = M.pairs().map(p => [...p]);
  // Every look-alike listed on either side, between two slate genera, once, in alphabetical order.
  const want = new Set();
  Object.keys(G).forEach(a => G[a].look.forEach(b => G[b] && want.add([a, b].sort().join('|'))));
  assert.deepStrictEqual(new Set(P.map(p => p.join('|'))), want);
  assert.strictEqual(P.length, want.size, 'each pair once');
  assert.ok(P.every(([a, b]) => a < b));
  // Classic: a source comparing them in so many words, on whichever side it is written.
  const classic = P.filter(([a, b]) => M.isClassic(a, b));
  assert.ok(classic.length >= 15, `the classic pairs: ${classic.length}`);
  for (const [a, b] of P) {
    const s = (G[a].lsrc || {})[b] || (G[b].lsrc || {})[a] || '';
    assert.strictEqual(M.lsrcOf(a, b), s);
    assert.strictEqual(M.lsrcOf(b, a), (G[b].lsrc || {})[a] || (G[a].lsrc || {})[b] || '');
    assert.strictEqual(M.isClassic(a, b), /^(IMR|Coral Finder p)/.test(M.lsrcOf(a, b)));
  }
  assert.ok(M.isClassic('Pocillopora', 'Stylophora') && M.isClassic('Stylophora', 'Pocillopora'));
  // The player's mix-ups, both ways.
  assert.strictEqual(M.mixedUp('Acropora', 'Montipora'), 3);
  assert.strictEqual(M.mixedUp('Montipora', 'Acropora'), 3);
  assert.strictEqual(M.mixedUp('Acropora', 'Porites'), 0);
  // The lecture group and the ★ line, as core.js reads them.
  for (const n of Object.keys(G)) {
    assert.strictEqual(M.shownGroup(n), core.lectureGroup(DATA, n));
    const L = core.starRefs(DATA, n);
    assert.strictEqual(M.starNote(n), L.length ? `★ look-alike of ${L.map(b => `<i>${b}</i>`).join(', ')}` : '');
  }
  assert.ok(
    Object.keys(G).some(n => M.starNote(n)),
    'some genus has a ★ line'
  );
});
