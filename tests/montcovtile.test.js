require('./slot.js').testGuard();
// Photos › Look-alikes, Coverage › Games and the photo tile, one frame each for every subject (docs/reviews/2026-11-19-admin-
// one-engine.md §5 steps 7 and 8, Dup-6, Dup-7, Dup-8): admin.js renderMont and renderCov draw any subject's page, and what
// differs between subjects is its builder in MONT_BUILD and COV_BUILD, picked by the data shape the subject declares (SUBJECTS
// flat, rule S1), never by its rank or its name; a photo's tile outside its page is drawn by repTile, which asks the
// registries of TILE_BUILD one after the other, and every tile is one tileFrame. These tests run the `// mont build`,
// `// cov build` and `// tile build` blocks of admin.js on stubs: every subject gets a builder, both answer the same
// questions, the frames draw a planted subject from the builder's parts alone, the controls reach the builder and a write that
// changes nothing draws nothing, the frames name no subject.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  block = require('./block.js');

const ROOT = path.join(__dirname, '..'),
  ADMIN = fs.readFileSync(path.join(ROOT, 'admin.js'), 'utf8'),
  {SUBJECTS} = require('../core.js'),
  plain = x => JSON.parse(JSON.stringify(x)),
  flatS = SUBJECTS.find(S => S.flat),
  treeS = SUBJECTS.find(S => !S.flat),
  NEW = {id: 'benthos', rank: 'genus', unitRank: 'genus', sheets: {genus: 'g:'}};

const el = (over = {}) => ({onclick: null, dataset: {}, ...over});
const page = () => {
  const all = {};
  return {all, v: {innerHTML: '', querySelectorAll: sel => all[sel] || []}};
};
const glue = (ctx = {}) => {
  const pg = page(),
    calls = [],
    c = vm.createContext({
      cur: 'photos/look-alikes',
      $v: pg.v,
      window: {scrollY: 40, scrollTo: (x, y) => calls.push(['scroll', y])},
      status: () => calls.push('status'),
      render: () => calls.push('render'),
      rightsLine: () => '<p class="rights"></p>',
      esc: s => String(s),
      ...ctx
    });
  vm.runInContext(
    block(ADMIN, '// tree build: begin', '// tree build: end', {file: 'admin.js'}) +
      '\n' +
      block(ADMIN, '// mont build: begin', '// mont build: end', {file: 'admin.js'}) +
      '\n' +
      block(ADMIN, '// cov build: begin', 'const COV_BUILD', {file: 'admin.js'}) +
      '\nconst COV_BUILD = {flat: {}, tree: {}}, covBuild = S => COV_BUILD[treeShape(S)];' +
      '\nthis.MONT_BUILD = MONT_BUILD; this.montBuild = montBuild; this.renderMont = renderMont;' +
      ' this.COV_BUILD = COV_BUILD; this.renderCov = renderCov;',
    c
  );
  c.pg = pg;
  c.calls = calls;
  return c;
};

// ---- Look-alikes ----

test('every subject gets a montage builder by the data shape it declares, never by its rank', () => {
  const c = glue();
  assert.deepStrictEqual(Object.keys(c.MONT_BUILD).sort(), ['flat', 'tree']);
  SUBJECTS.forEach(S => assert.strictEqual(c.montBuild(S), c.MONT_BUILD[S.flat ? 'flat' : 'tree'], S.id));
  assert.ok(flatS && treeS);
  assert.strictEqual(c.montBuild(NEW), c.MONT_BUILD.tree);
  assert.strictEqual(c.montBuild({id: 'x', rank: 'family', flat: true}), c.MONT_BUILD.flat);
});

test('both montage builders answer the same questions, and the comment above the frame lists them', () => {
  const {flat, tree} = glue().MONT_BUILD,
    MEMBERS = ['attr', 'axisLabel', 'cls', 'load', 'noPhotos', 'none', 'open', 'ready', 'strip', 'thumb'];
  [flat, tree].forEach(B => {
    assert.deepStrictEqual(Object.keys(B).sort(), MEMBERS);
    ['load', 'open', 'ready', 'thumb'].forEach(k => assert.strictEqual(typeof B[k], 'function', k));
    assert.deepStrictEqual(Object.keys(B.attr).sort(), ['auto', 'axis', 'hide']);
  });
  const doc = block(ADMIN, '// mont build: begin', 'function renderMont(', {file: 'admin.js'});
  for (const k of ['cls', 'none', 'axisLabel', 'attr', 'strip', 'noPhotos', 'ready()', 'load()', 'thumb(x)', 'open(S)'])
    assert.ok(doc.includes(k), `${k} is documented`);
  // the data attributes are the ones the smoke test and the styles read, as before
  assert.deepStrictEqual(plain(flat.attr), {axis: 'mv', auto: 'mauto', hide: 'mhide'});
  assert.deepStrictEqual(plain(tree.attr), {axis: 'fmv', auto: 'fmauto', hide: 'fmhide'});
  assert.strictEqual(tree.cls, ' adm-fishmont');
  assert.strictEqual(flat.cls, '');
});

// A planted builder: two pairs, the second without photos in common; its writes log into `log`.
const plantedMont = (log = [], over = {}) => ({
  cls: ' x-mont',
  none: '<p class="none">NONE</p>',
  axisLabel: 'Axis',
  attr: {axis: 'ax', auto: 'au', hide: 'hi'},
  strip: 2,
  noPhotos: 'NO PHOTOS',
  ready: () => true,
  load: () => Promise.resolve(),
  thumb: x => ({title: 'T-' + x.f, img: `src="${x.f}.jpg"`, tag: `<i>${x.f}</i>`}),
  open: () => ({
    rows: [
      {
        k: 'A|B',
        m: {v: 'wide', set: true, hide: false},
        title: '<i>A</i> / <i>B</i>',
        src: 'IMR p1',
        axis: [
          ['wide', 'Wide', true],
          ['macro', 'Close', false]
        ],
        body: () => ({
          pics: [
            ['src="a.jpg"', 'A x'],
            ['src="b.jpg"', 'B']
          ],
          sides: [
            ['<i>A</i>', [{f: 'a1'}, {f: 'a2'}, {f: 'a3'}], 'a2'],
            ['<i>B</i>', [{f: 'b1'}], 'b1']
          ]
        })
      },
      {k: 'C|D', m: {v: null, set: false, hide: true}, title: 'C / D', src: '', axis: [], body: () => assert.fail('no body without a view')}
    ],
    axis: (k, w) => log.push(['axis', k, w]),
    thumb: (k, side, f) => log.push(['thumb', k, side, f]),
    auto: k => (log.push(['auto', k]), k === 'C|D' ? false : undefined),
    hide: (k, h) => (log.push(['hide', k, h]), h ? false : undefined)
  }),
  ...over
});

test("the montage frame draws a planted subject's pairs from the builder's parts alone", () => {
  const c = glue({ASUBJ: NEW}),
    log = [];
  c.MONT_BUILD.tree = plantedMont(log);
  c.renderMont(NEW);
  const h = c.pg.v.innerHTML;
  assert.ok(
    h.startsWith(
      '<section class="adm-quality adm-mont x-mont"><article class="adm-mrow set"><div class="adm-mhead"><b><i>A</i> / <i>B</i></b><small>IMR p1</small>'
    )
  );
  assert.match(
    h,
    /aria-label="Axis"><button type="button" data-k="A\|B" data-ax="wide" aria-pressed="true">Wide<\/button><button type="button" data-k="A\|B" data-ax="macro" aria-pressed="false" disabled>Close<\/button>/
  );
  assert.match(
    h,
    /data-k="A\|B" data-au aria-pressed="false" title="Automatic pick">Auto<\/button><button type="button" aria-pressed="true" disabled title="Manual">Manual/
  );
  assert.match(
    h,
    /data-hi="0" aria-pressed="true" title="Shown on the site">Shown<\/button><button type="button" data-k="A\|B" data-hi="1" aria-pressed="false" title="Hidden from the site">Hidden/
  );
  assert.match(h, /<div class="adm-mprev"><img src="a\.jpg" alt="A x"><img src="b\.jpg" alt="B"><\/div>/);
  // a strip shows the builder's most (2 of 3), the chosen one marked, each button from the builder's thumb
  assert.match(
    h,
    /<div><i>A<\/i><div class="adm-mstrip"><button type="button" class="adm-mth" data-k="A\|B" data-side="a" data-f="a1" title="T-a1"><img src="a1\.jpg" alt="" loading="lazy"><i>a1<\/i><\/button><button type="button" class="adm-mth on" data-k="A\|B" data-side="a" data-f="a2" title="T-a2">.*<\/button><\/div><\/div>/
  );
  assert.ok(!h.includes('data-f="a3"'), "the strip stops at the builder's limit");
  assert.match(h, /<div><i>B<\/i><div class="adm-mstrip"><button type="button" class="adm-mth on" data-k="A\|B" data-side="b" data-f="b1"/);
  // a pair without a view: its note, hidden
  assert.match(h, /<article class="adm-mrow off">.*<p class="note">NO PHOTOS<\/p><\/article>/s);
  // no pair: the builder's words
  c.MONT_BUILD.tree = plantedMont(log, {open: () => ({rows: []})});
  c.renderMont(NEW);
  assert.strictEqual(c.pg.v.innerHTML, '<section class="adm-quality adm-mont x-mont"><p class="none">NONE</p></section>');
});

test('the montage controls reach the builder; a write that changes nothing draws nothing; a write keeps the scroll', () => {
  const c = glue({ASUBJ: NEW}),
    log = [];
  c.MONT_BUILD.tree = plantedMont(log);
  const axis = el({dataset: {k: 'A|B', ax: 'wide'}}),
    thumb = el({dataset: {k: 'A|B', side: 'b', f: 'b1'}}),
    auto = el({dataset: {k: 'C|D'}}),
    hide = el({dataset: {k: 'A|B', hi: '1'}}),
    show = el({dataset: {k: 'A|B', hi: '0'}});
  Object.assign(c.pg.all, {'[data-ax]': [axis], '.adm-mth': [thumb], '[data-au]': [auto], '[data-hi]': [hide, show]});
  c.renderMont(NEW);
  const draws = () => c.calls.filter(x => x === 'status').length,
    scrolls = () => c.calls.filter(x => Array.isArray(x) && x[0] === 'scroll').length;
  assert.strictEqual(draws(), 1);
  axis.onclick();
  thumb.onclick();
  assert.deepStrictEqual([draws(), scrolls()], [3, 2], 'a write draws the page again and puts the scroll back');
  auto.onclick(); // the builder says it changed nothing
  hide.onclick(); // so does this one
  assert.deepStrictEqual([draws(), scrolls()], [3, 2], 'a write that changes nothing draws nothing');
  show.onclick();
  assert.deepStrictEqual([draws(), scrolls()], [4, 3]);
  assert.deepStrictEqual(plain(log), [
    ['axis', 'A|B', 'wide'],
    ['thumb', 'A|B', 'b', 'b1'],
    ['auto', 'C|D'],
    ['hide', 'A|B', true],
    ['hide', 'A|B', false]
  ]);
});

test('a montage builder not ready loads first, and the page is drawn again only while on it', async () => {
  const c = glue({ASUBJ: NEW}),
    log = [];
  let ready = false;
  c.MONT_BUILD.tree = plantedMont(log, {ready: () => ready, load: () => ((ready = true), Promise.resolve())});
  c.renderMont(NEW);
  assert.match(c.pg.v.innerHTML, /Loading/);
  await new Promise(r => setImmediate(r));
  assert.ok(c.calls.includes('render'));
  const d = glue({ASUBJ: NEW, cur: 'inbox/todo/all'});
  d.MONT_BUILD.tree = plantedMont([], {ready: () => false});
  d.renderMont(NEW);
  await new Promise(r => setImmediate(r));
  assert.ok(!d.calls.includes('render'), 'not drawn over another page');
});

test('the montage frame names no subject and no builder state; the dispatch asks the frame', () => {
  const code = block(ADMIN, '\nfunction renderMont(', 'const MONT_BUILD', {file: 'admin.js'})
    .split('\n')
    .filter(l => !/^\s*\/\//.test(l))
    .join('\n');
  assert.doesNotMatch(code, /\.rank\s*===\s*'|\.sheets\b|\.admin\.cur\b|\bFISHS\b|\bFISHC\b|\bFISHA\b|\bDATA\b|\.flat\b|\bTK\b|\bDRAFT\b/);
  assert.doesNotMatch(code, /\b(?:montPick|montList|setMont|classicPairs|fishMontPick|fishMontSet|montPairs|fuP|crSrc|srcTag)\b/);
  SUBJECTS.forEach(S => assert.doesNotMatch(code, new RegExp(`'${S.id}'`), S.id));
  assert.match(ADMIN, /if \(cur === 'photos\/look-alikes'\) return renderMont\(ASUBJ\);/);
  assert.match(ADMIN, /montBuild = S => MONT_BUILD\[treeShape\(S\)\]/);
  assert.doesNotMatch(ADMIN, /\brenderFishMont\b|\bFMONT_T\b/);
});

// ---- Coverage ----

test('every subject gets a coverage builder by the data shape it declares; both answer the same questions', () => {
  const src = block(ADMIN, 'const COV_BUILD = {', '// cov build: end', {file: 'admin.js'});
  assert.match(src, /flat: \{ready: \(\) => true, load: \(\) => Promise\.resolve\(\), page: covFlatPage\}/);
  assert.match(src, /tree: \{ready: \(\) => !!\(FISHC && FISHC\.plays\), load: \(\) => fishLoad\(true\), page: covTreePage\}/);
  assert.match(src, /covBuild = S => COV_BUILD\[treeShape\(S\)\]/);
  const doc = block(ADMIN, '// cov build: begin', 'function renderCov(', {file: 'admin.js'});
  for (const k of ['ready()', 'load()', 'page()', 'cls', 'top', 'tcls', 'head', 'rows', 'wrap', 'bind()'])
    assert.ok(doc.includes(k), `${k} is documented`);
  assert.doesNotMatch(ADMIN, /\brenderFishCov\b/);
  assert.match(ADMIN, /if \(cur === 'inbox\/coverage\/games'\) return renderCov\(ASUBJ\);/);
});

test("the coverage frame draws a planted subject's section and table from the builder's page; the page binds itself", async () => {
  const c = glue({ASUBJ: NEW, cur: 'inbox/coverage/games'}),
    log = [];
  c.COV_BUILD.tree = {
    ready: () => true,
    load: () => Promise.resolve(),
    page: () => ({
      cls: ' x-cov',
      top: '<div class="top"></div>',
      tcls: ' x-t',
      head: '<th>H</th>',
      rows: '<tr><td>R</td></tr>',
      wrap: ['<div class="w">', '</div>'],
      bind: () => log.push('bind')
    })
  };
  c.renderCov(NEW);
  assert.strictEqual(
    c.pg.v.innerHTML,
    `<section class="adm-cov x-cov"><p class="rights"></p><div class="top"></div><div class="w"><table class="cov-t x-t"><thead><tr><th>H</th></tr></thead>\n    <tbody><tr><td>R</td></tr></tbody></table></div></section>`
  );
  assert.deepStrictEqual(log, ['bind']);
  // not ready: Loading…, then drawn again on its page only
  let ready = false;
  c.COV_BUILD.tree = {
    ready: () => ready,
    load: () => ((ready = true), Promise.resolve()),
    page: () => assert.fail('not before it is ready')
  };
  c.renderCov(NEW);
  assert.match(c.pg.v.innerHTML, /Loading/);
  await new Promise(r => setImmediate(r));
  assert.ok(c.calls.includes('render'));
  const code = block(ADMIN, '\nfunction renderCov(', 'const COV_BUILD', {file: 'admin.js'})
    .split('\n')
    .filter(l => !/^\s*\/\//.test(l))
    .join('\n');
  assert.doesNotMatch(code, /\.rank\s*===\s*'|\.sheets\b|\.admin\.cur\b|\bFISHS\b|\bFISHC\b|\bFISHA\b|\bDATA\b|\.flat\b|\bTK\b|\bDRAFT\b/);
  SUBJECTS.forEach(S => assert.doesNotMatch(code, new RegExp(`'${S.id}'`), S.id));
});

// ---- The tile ----

const tileCtx = (ctx = {}) => {
  const calls = [],
    c = vm.createContext({
      FISHA: null,
      unitPhOf: () => null,
      fishRepTile: (p, o) => (calls.push(['tree', p.f, o]), '<tree>'),
      unitTile: (u, o) => (calls.push(['read', u.p.f, o]), '<read>'),
      coralRepTile: (f, g, o) => (calls.push(['flat', f, g, o]), '<flat>'),
      bindFishTiles: s => calls.push(['bindTree', s]),
      bindTiles: (s, g) => calls.push(['bindFlat', s, g({dataset: {g: 'G'}})]),
      bindF: s => calls.push(['bindF', s]),
      bindQ: () => calls.push(['bindQ']),
      ...ctx
    });
  vm.runInContext(
    block(ADMIN, '// tile build: begin', '// tile build: end', {file: 'admin.js'}) +
      '\nthis.TILE_BUILD = TILE_BUILD; this.repTile = repTile; this.repBind = repBind;',
    c
  );
  c.calls = calls;
  return c;
};

test('repTile asks the registries one after the other: the subject in force, another read-only, the corals', () => {
  const c = tileCtx({FISHA: {ph: {f1: {f: 'f1'}}}, unitPhOf: f => (f === 'u1' ? {p: {f: 'u1'}} : null)});
  assert.deepStrictEqual(Object.keys(c.TILE_BUILD), ['tree', 'read', 'flat']);
  Object.values(c.TILE_BUILD).forEach(B => assert.deepStrictEqual(Object.keys(B).sort(), ['bind', 'has', 'tile']));
  assert.strictEqual(c.repTile('f1'), '<tree>');
  assert.strictEqual(c.repTile('u1'), '<read>');
  assert.strictEqual(c.repTile('c1', {unit: 'Acropora'}), '<flat>');
  assert.deepStrictEqual(plain(c.calls.map(x => x.slice(0, 2))), [
    ['tree', 'f1'],
    ['read', 'u1'],
    ['flat', 'c1']
  ]);
  assert.strictEqual(c.calls[2][2], 'Acropora', "the corals' tile gets the unit the caller knows");
});

test("the registries' tiles take the same options: the flag, where it was seen, the caption, Done, the record the caller has", () => {
  const c = tileCtx({FISHA: {ph: {f1: {f: 'f1', own: 1}}}, unitPhOf: f => (f === 'u1' ? {p: {f: 'u1'}} : null)});
  c.repTile('f1', {flag: 'k', where: 'W', done: true});
  c.repTile('f1', {p: {f: 'f1', own: 2}, cap: 'CAP'});
  c.repTile('u1', {flag: 'k', where: 'W'});
  c.repTile('c1', {unit: 'U', where: 'W', cap: 'CAP', done: true});
  c.repTile('c1');
  const [a, b, d, e, f] = plain(c.calls);
  assert.deepStrictEqual(a, ['tree', 'f1', {flag: 'k', cap: 'W', extra: '<button type="button" data-act="tdone">Done</button>'}]);
  assert.deepStrictEqual(b[2], {cap: 'CAP', extra: ''}, "no flag, no Done; the caller's record is the one drawn");
  assert.strictEqual(b[1], 'f1');
  assert.deepStrictEqual(d, ['read', 'u1', {flag: 'k', cap: 'W', extra: ''}]);
  assert.deepStrictEqual(e, [
    'flat',
    'c1',
    'U',
    {lead: 'W', cap: 'CAP', extra: '<button type="button" class="adm-tdone" data-tdone>✓ Done</button>'}
  ]);
  assert.deepStrictEqual(f, ['flat', 'c1', null, {extra: ''}], 'no unit known: none (null in the log)');
});

test("repBind binds the tools of every registry's tiles in the scope", () => {
  const c = tileCtx(),
    scope = {s: 1};
  c.repBind(scope);
  assert.deepStrictEqual(
    plain(c.calls.map(x => x[0])),
    ['bindTree', 'bindFlat', 'bindF', 'bindQ'],
    "the tree subjects' tools, then the corals' (a read-only tile has none)"
  );
  assert.strictEqual(c.calls[1][2], 'G', "a coral tile's genus is its dataset's");
});

test('every photo tile is one frame: the figure, the zoom button, the tools, the number, the mark, the caption and the actions', () => {
  const c = vm.createContext({});
  vm.runInContext(
    block(ADMIN, 'const tileFrame = t =>', '\n// Small × on each photo', {file: 'admin.js'}) + '\nthis.tileFrame = tileFrame;',
    c
  );
  assert.strictEqual(
    c.tileFrame({
      cls: ' c',
      attrs: ' data-f="x"',
      zoom: 'data-fu="zoom"',
      photo: '<img>',
      tools: '<b>X</b>',
      num: '<n>1</n>',
      mark: '',
      cap: 'CAP',
      acts: 'ACTS'
    }),
    [
      '<figure class="adm-tile c" data-f="x">',
      '    <button type="button" class="adm-ph" data-fu="zoom" aria-label="Enlarge"><img></button><b>X</b>',
      '    <n>1</n>',
      '    ', // the cover mark, none here
      '    <figcaption>CAP</figcaption>',
      '    <div class="adm-acts">ACTS</div></figure>'
    ].join('\n')
  );
  // both tiles draw through it, and neither keeps a copy of the figure
  assert.strictEqual((ADMIN.match(/return tileFrame\(\{/g) || []).length, 2);
  assert.strictEqual((ADMIN.match(/class="adm-ph" \$\{t\.zoom\}/g) || []).length, 1);
});

test('the door and its callers name no subject; the pages ask it, not their subject', () => {
  const door = block(ADMIN, '  repTile = (f, o = {}) =>', '// tile build: end', {file: 'admin.js'});
  assert.doesNotMatch(door, /\.rank\b|\.sheets\b|\.admin\.cur\b|\bFISHS\b|\bFISHA\b|\bDATA\b|\.flat\b/);
  SUBJECTS.forEach(S => assert.doesNotMatch(door, new RegExp(`'${S.id}'`), S.id));
  // Health draws and binds its tiles by the registry of the photo, not by the subject on screen
  assert.doesNotMatch(ADMIN, /\bfishHTile\b|\bcoralTile\b|\.map\(ASUBJ\.sheets \? /);
  assert.match(ADMIN, /if \(hp\) repBind\(hp\);/);
  assert.match(ADMIN, /\$v\.querySelectorAll\('\.adm-flagged'\)\.forEach\(repBind\);/);
});
