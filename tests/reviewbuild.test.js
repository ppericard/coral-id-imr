require('./slot.js').testGuard();
// Photos › Photo review, one frame for every subject (docs/reviews/2026-11-19-admin-one-engine.md §5 step 6, Dup-4 and Dup-5):
// admin.js renderReview draws any subject's band pages (Quality and Growth form; Ease and Phase & framing) and renderDiff
// its By difficulty, and what differs between subjects is its builder in REVIEW_BUILD, picked by the data shape the subject
// declares (SUBJECTS flat, rule S1), never by its rank or its name. These tests run the `// review build: begin` / `end`
// block of admin.js on stubs: every subject gets a builder, both answer the same questions, the review views a subject has
// are the axes of its builder, the frame draws a planted subject's bands, tiles, zoom, ×, drag and keys from the builder's
// parts alone, the frame names no subject, and the growth-form axis (rule C4) stays the corals' hook.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  block = require('./block.js');

const ROOT = path.join(__dirname, '..'),
  src = f => fs.readFileSync(path.join(ROOT, f), 'utf8'),
  {SUBJECTS} = require('../core.js'),
  ADMIN = src('admin.js'),
  plain = x => JSON.parse(JSON.stringify(x));

// An element that takes clicks and answers the few questions the frame asks of it.
const el = (over = {}) => ({
  onclick: null,
  dataset: {},
  classList: {add() {}, remove() {}},
  prepend() {},
  closest: () => null,
  ...over
});
// The page: `all` gives the lists querySelectorAll answers.
const page = () => {
  const all = {};
  return {all, v: Object.assign(el(), {innerHTML: '', querySelectorAll: sel => all[sel] || []})};
};

// The block on stubs; the tree build's block gives the real treeShape.
const glue = (ctx = {}) => {
  const pg = page(),
    calls = [],
    c = vm.createContext({
      ASUBJ: null,
      cur: 'photos/review/quality',
      $v: pg.v,
      store: {get: (k, d) => d, set: (k, v) => calls.push(['store', k, v])},
      status: () => calls.push('status'),
      render: () => calls.push('render'),
      tileKeys: (p, fn) => calls.push(['keys', p, typeof fn]),
      pointerDrag: (tiles, hover, drop, cancel) => (c.drag = {tiles, hover, drop, cancel}),
      bindStats: () => calls.push('bindStats'),
      segBtns: (k, L) => `<span class="seg">${k}${L.length}</span>`,
      DIFF_ORDER: 'hard',
      esc: s => String(s),
      ...ctx
    });
  vm.runInContext(
    block(ADMIN, '// tree build: begin', '// tree build: end', {file: 'admin.js'}) +
      '\n' +
      block(ADMIN, '// review build: begin', '// review build: end', {file: 'admin.js'}) +
      '\nthis.REVIEW_BUILD = REVIEW_BUILD; this.reviewBuild = reviewBuild; this.reviewAxis = reviewAxis;' +
      ' this.renderReview = renderReview; this.renderDiff = renderDiff;',
    c
  );
  c.pg = pg;
  c.calls = calls;
  return c;
};

const flatS = SUBJECTS.find(S => S.flat),
  treeS = SUBJECTS.find(S => !S.flat),
  // A subject the engine has never heard of, at genus rank, as benthos would be.
  NEW = {id: 'benthos', rank: 'genus', unitRank: 'genus', sheets: {genus: 'g:'}};

test('every subject gets a builder by the data shape it declares, never by its rank', () => {
  const c = glue();
  assert.deepStrictEqual(Object.keys(c.REVIEW_BUILD).sort(), ['flat', 'tree']);
  SUBJECTS.forEach(S => assert.strictEqual(c.reviewBuild(S), c.REVIEW_BUILD[S.flat ? 'flat' : 'tree'], S.id));
  assert.ok(flatS && treeS, 'a flat subject (the corals) and tree subjects (the fish, the sea slugs)');
  // a tree subject whose units are genera gets the tree builder; a flat one with families, the flat one
  assert.strictEqual(c.reviewBuild(NEW), c.REVIEW_BUILD.tree);
  assert.strictEqual(c.reviewBuild({id: 'x', rank: 'family', flat: true}), c.REVIEW_BUILD.flat);
});

test('both builders answer the same questions, and the frame lists them', () => {
  const {flat, tree} = glue().REVIEW_BUILD,
    MEMBERS = ['axes', 'diff', 'load', 'page', 'ready'],
    DIFF = ['gate', 'help', 'page'];
  [flat, tree].forEach(B => {
    assert.deepStrictEqual(Object.keys(B).sort(), MEMBERS);
    assert.deepStrictEqual(Object.keys(B.diff).sort(), DIFF);
    ['load', 'page', 'ready'].forEach(k => assert.strictEqual(typeof B[k], 'function', k));
    ['gate', 'page'].forEach(k => assert.strictEqual(typeof B.diff[k], 'function', k));
    assert.ok(Array.isArray(B.axes) && B.axes.length);
  });
  // the comment above REVIEW_BUILD documents each member, so a new one is described in one place
  const doc = block(ADMIN, '// review build: begin', 'const REVIEW_BUILD', {file: 'admin.js'});
  for (const k of [...MEMBERS, 'gate(S, again)', 'page(S, again)', 'help']) assert.ok(doc.includes(k), `${k} is documented`);
  // no axis in two builders: an address names one page
  assert.deepStrictEqual(plain(flat.axes.filter(a => tree.axes.includes(a))), []);
});

test('the review views a subject has are the axes of its builder, whatever its rank or its declared pages say', () => {
  const c = glue();
  // the axis each GROUPS review view carries is some builder's, and every builder's axis has a view
  const views = [...ADMIN.matchAll(/\['([\w-]+)', '([^']+)', \{axis: '([\w-]+)'\}\]/g)].map(m => [m[1], m[3]]),
    axes = Object.values(c.REVIEW_BUILD).flatMap(B => B.axes);
  assert.ok(views.length >= 4);
  views.forEach(([v, a]) => assert.strictEqual(v, a, `the view ${v} and its axis`));
  assert.deepStrictEqual(views.map(x => x[1]).sort(), [...axes].sort());
  // a subject that lists its pages lists no review view its builder cannot draw
  SUBJECTS.filter(S => S.admin.pages).forEach(S =>
    S.admin.pages
      .filter(p => p.startsWith('photos/review/') && views.some(([v]) => p === 'photos/review/' + v))
      .forEach(p => assert.ok(c.reviewBuild(S).axes.includes(p.slice(14)), `${S.id} ${p}`))
  );
  // the address names an axis only for a subject that has it
  c.ASUBJ = flatS;
  assert.strictEqual(c.reviewAxis('photos/review/growth-form'), 'growth-form');
  assert.strictEqual(c.reviewAxis('photos/review/ease'), '');
  assert.strictEqual(c.reviewAxis('photos/review/by-difficulty'), '');
  c.ASUBJ = NEW;
  assert.strictEqual(c.reviewAxis('photos/review/phase-framing'), 'phase-framing');
  assert.strictEqual(c.reviewAxis('photos/review/quality'), '');
  assert.strictEqual(c.reviewAxis('photos/tree/key'), '');
});

// A planted builder: a subject's data reduced to the parts the frame draws; its actions log into `log`.
const planted = (log = [], over = {}) => ({
  axes: ['one'],
  ready: () => true,
  load: () => Promise.resolve(),
  page: (S, id) => ({
    cls: {band: ' b-x', grid: ' g-x'},
    top: '<i class="top"></i>',
    bar: '<div class="bar"></div>',
    note: '<p class="n">NOTE</p>',
    empty: '<p class="e">EMPTY</p>',
    bands: [
      {title: 'T1', note: ' · more', tool: ' <button data-tool>Tool</button>', drop: 3, items: [{f: 'a1'}, {f: 'a2'}]},
      {title: 'T2', items: [{f: 'b1'}]},
      {title: 'T3', drop: 0, items: []}
    ],
    tile: p => ({
      cls: ' t-x',
      attrs: ` data-f="${p.f}" data-s="s-${p.f}"`,
      photo: '<img>',
      tools: '<b class="tools"></b>',
      cap: 'CAP-' + p.f,
      acts: 'ACTS',
      actsCls: ' a-x'
    }),
    zoom: p => log.push(['zoom', p.f]),
    exclude: p => log.push(['exclude', p.f]),
    bind: scope => log.push(['bind', id]),
    keys: () => true,
    drop: (t, v) => log.push(['drop', t.dataset.f, v])
  }),
  diff: {help: 'h', gate: () => null, page: () => ({})},
  ...over
});

test("the frame draws a planted subject's bands and tiles from the builder's parts alone", () => {
  const c = glue({ASUBJ: NEW}),
    log = [];
  c.REVIEW_BUILD.tree = planted(log);
  c.renderReview(NEW, 'one');
  const h = c.pg.v.innerHTML;
  assert.ok(h.startsWith('<section class="adm-quality"><i class="top"></i><div class="bar"></div><p class="n">NOTE</p>'), 'top, bar, note');
  assert.match(
    h,
    /<section class="adm-row b-x"><h3>T1 <small>2 photos · more<\/small> <button data-tool>Tool<\/button><\/h3>\s*<div class="adm-grid g-x" data-drop="3">/
  );
  assert.match(
    h,
    /<h3>T2 <small>1 photo<\/small><\/h3>\s*<div class="adm-grid g-x"><figure/,
    'no drop value: no data-drop; one photo, singular'
  );
  assert.match(
    h,
    /<h3>T3 <small>0 photos<\/small><\/h3>\s*<div class="adm-grid g-x" data-drop="0"><\/div>/,
    'a drop value of 0 is still one'
  );
  assert.match(
    h,
    /<figure class="adm-tile t-x" data-f="a1" data-s="s-a1"><button type="button" class="adm-ph" data-act="zoom" aria-label="Enlarge"><img><\/button><b class="tools"><\/b><figcaption>CAP-a1<\/figcaption><div class="adm-acts a-x">ACTS<\/div><\/figure>/
  );
  assert.doesNotMatch(h, /class="e"/, 'the empty note only when no band has a photo');
  assert.deepStrictEqual(plain(log), [['bind', 'one']]);
  // no band at all: the builder's empty note, in place of the bands
  c.REVIEW_BUILD.tree = planted(log, {page: () => ({...planted().page(), bands: []})});
  c.renderReview(NEW, 'one');
  assert.match(c.pg.v.innerHTML, /<p class="n">NOTE<\/p><p class="e">EMPTY<\/p><\/section>$/);
  // a note instead of the page, and the page's own words when it has no top, note or empty
  c.REVIEW_BUILD.tree = planted(log, {page: () => ({msg: '<p class="note">No families yet.</p>'})});
  c.renderReview(NEW, 'one');
  assert.strictEqual(c.pg.v.innerHTML, '<p class="note">No families yet.</p>');
  c.REVIEW_BUILD.tree = planted(log, {page: () => ({...planted().page(), top: undefined, note: undefined, empty: undefined, bands: []})});
  c.renderReview(NEW, 'one');
  assert.strictEqual(c.pg.v.innerHTML, '<section class="adm-quality"><div class="bar"></div></section>');
});

test('the frame wires the zoom, the ×, the keys and the drag to the builder; a builder not ready loads first', async () => {
  const c = glue({ASUBJ: NEW, cur: 'photos/review/one'}),
    log = [];
  c.REVIEW_BUILD.tree = planted(log);
  const tile = f => el({dataset: {f}}),
    btn = f => el({closest: () => tile(f)});
  const z = [btn('a2'), btn('b1')],
    x = [btn('a1')];
  c.pg.all['[data-act="zoom"]'] = z;
  c.pg.all['[data-act="remove"]'] = x;
  c.pg.all['.adm-qt'] = [tile('a1')];
  c.renderReview(NEW, 'one');
  z[1].onclick();
  let stopped = false;
  x[0].onclick({stopPropagation: () => (stopped = true)});
  assert.deepStrictEqual(plain(log.filter(l => l[0] !== 'bind')), [
    ['zoom', 'b1'],
    ['exclude', 'a1']
  ]);
  assert.ok(stopped, 'Remove does not reach the tile');
  assert.deepStrictEqual(
    plain(c.calls.find(l => l[0] === 'keys')),
    ['keys', 'photos/review/one', 'function'],
    'the keys of the page on screen'
  );
  // drag: a drop on a band that carries a value hands it to the builder, then the tile goes to the band; a band without one takes none
  const grid = {dataset: {drop: '3'}, classList: {add() {}, remove() {}}, prepend: t => log.push(['prepend', t.dataset.f])},
    t = tile('a1');
  assert.strictEqual(c.drag.tiles.length, 1);
  c.drag.drop(t, {closest: s => (s === '[data-drop]' ? grid : null)});
  c.drag.drop(t, {closest: () => null});
  assert.deepStrictEqual(plain(log.slice(-2)), [
    ['drop', 'a1', '3'],
    ['prepend', 'a1']
  ]);
  // an axis with no keys and no drop wires neither
  const d = glue({ASUBJ: NEW});
  d.REVIEW_BUILD.tree = planted([], {page: () => ({...planted().page(), keys: undefined, drop: undefined})});
  d.renderReview(NEW, 'one');
  assert.ok(!d.calls.some(l => l[0] === 'keys') && !d.drag);
  // not ready: Loading…, its data are read, then the page is drawn again (only while on a review page)
  const e = glue({ASUBJ: NEW, cur: 'photos/review/one'});
  let ready = false;
  e.REVIEW_BUILD.tree = planted([], {ready: () => ready, load: () => ((ready = true), Promise.resolve())});
  e.renderReview(NEW, 'one');
  assert.match(e.pg.v.innerHTML, /Loading/);
  await new Promise(r => setImmediate(r));
  assert.ok(e.calls.includes('render'), 'drawn again once its data are read');
  const f = glue({ASUBJ: NEW, cur: 'inbox/todo/all'});
  f.REVIEW_BUILD.tree = planted([], {ready: () => false, load: () => Promise.resolve()});
  f.renderReview(NEW, 'one');
  await new Promise(r => setImmediate(r));
  assert.ok(!f.calls.includes('render'), 'not drawn over another page');
});

test('By difficulty: the frame asks the builder for its data, its rows and its tile; the first max are shown, the rest counted', () => {
  const c = glue({ASUBJ: NEW, cur: 'photos/review/by-difficulty'}),
    log = [],
    rows = ['p1', 'p2', 'p3'].map(f => ({f}));
  const diff = (over = {}) => ({
    help: 'h',
    gate: (S, again) => (log.push(['gate', S.id, typeof again]), null),
    page: () => ({cls: ' d-x', grid: ' g-x', rows, max: 2, tile: r => `<i>${r.f}</i>`, bind: scope => log.push(['bind'])}),
    ...over
  });
  c.REVIEW_BUILD.tree = planted(log, {diff: diff()});
  c.renderDiff(NEW);
  const h = c.pg.v.innerHTML;
  assert.match(
    h,
    /^<section class="adm-quality d-x"><div class="adm-shead"><span class="seg">min3<\/span><span class="note">answers<\/span>/
  );
  assert.match(
    h,
    /data-do="hard" aria-pressed="true">Hardest<\/button><button type="button" data-do="easy" aria-pressed="false">Easiest<\/button>/
  );
  assert.match(h, /<div class="adm-grid adm-qgrid g-x"><i>p1<\/i><i>p2<\/i><\/div><p class="note">\+1 more<\/p><\/section>$/);
  assert.deepStrictEqual(plain(log), [['gate', 'benthos', 'function'], ['bind']]);
  assert.ok(c.calls.includes('bindStats'));
  // the order buttons are the frame's: remembered, then drawn again
  const hb = el({dataset: {do: 'easy'}});
  c.pg.all['[data-do]'] = [hb];
  c.renderDiff(NEW);
  hb.onclick();
  assert.strictEqual(c.DIFF_ORDER, 'easy');
  assert.deepStrictEqual(plain(c.calls.filter(l => l[0] === 'store')), [['store', 'reefid-admin-diff', 'easy']]);
  assert.ok(c.calls.includes('render'));
  // no rows: the empty words, no grid; a gate that asked for its data or has a note draws nothing else
  c.REVIEW_BUILD.tree = planted(log, {diff: diff({page: () => ({cls: '', grid: '', rows: [], max: 9, tile: () => '', bind() {}})})});
  c.renderDiff(NEW);
  assert.match(c.pg.v.innerHTML, /<p class="note">No answers yet\.<\/p><\/section>$/);
  assert.doesNotMatch(c.pg.v.innerHTML, /adm-grid/);
  c.REVIEW_BUILD.tree = planted(log, {diff: diff({gate: () => ({})})});
  c.renderDiff(NEW);
  assert.strictEqual(c.pg.v.innerHTML, '<p class="note">Loading…</p>');
  c.REVIEW_BUILD.tree = planted(log, {diff: diff({gate: () => ({msg: '<p class="warn">W</p>'})})});
  c.renderDiff(NEW);
  assert.strictEqual(c.pg.v.innerHTML, '<p class="warn">W</p>');
  // the redraw the gate is given is for this page and this subject only
  let again;
  c.REVIEW_BUILD.tree = planted(log, {diff: diff({gate: (S, a) => ((again = a), null)})});
  c.renderDiff(NEW);
  const n = c.calls.filter(l => l === 'render').length;
  c.cur = 'inbox/todo/all';
  again();
  c.cur = 'photos/review/by-difficulty';
  c.ASUBJ = flatS;
  again();
  assert.strictEqual(c.calls.filter(l => l === 'render').length, n, 'not on another page, not on another subject');
  c.ASUBJ = NEW;
  again();
  assert.strictEqual(c.calls.filter(l => l === 'render').length, n + 1);
});

// The flat builder on stubbed data: three photos, the corals' scales.
const flatCtx = () => {
  const PH = [
      {f: 'p1', genus: 'Acropora', view: 'wide', src: 'u/1'},
      {f: 'p2', genus: 'Porites', view: 'medium', src: 'u/2', hid: true},
      {f: 'p3', genus: 'Acropora', view: 'cand', src: 'u/3'}
    ],
    Q = {p1: 3, p2: 1, p3: 3},
    F = {p1: 'B', p2: 'x'};
  return {
    QUAL: [
      [3, 'Good'],
      [2, 'Fair'],
      [1, 'Poor']
    ],
    VIEWS: [
      ['wide', 'Colony'],
      ['medium', 'Close-up']
    ],
    DATA: {gen: {Acropora: {}, Porites: {}}},
    FORM_ORDER: 'BETUMSF',
    FABBR: {B: 'Br', E: 'En', T: 'Ta', U: 'Mu', M: 'Ma', S: 'Sm', F: 'Fo', x: '∅'},
    LEGACY: {},
    FAG_OPEN: false,
    FSCOPE: [],
    GRIP: '<g></g>',
    RMBTN: '<x></x>',
    allPhotos: () => PH,
    bindBar: () => {},
    bindQ: () => {},
    shown: () => true,
    qOf: f => Q[f],
    qSet: f => f === 'p1',
    qTag: p => '<q></q>',
    qSeg: p => '<qseg></qseg>',
    fSeg: p => '<fseg></fseg>',
    fOf: f => F[f] || '',
    fSet: f => f === 'p1',
    pOf: () => false,
    fName: c => 'Form ' + c,
    cfName: c => 'Book ' + c,
    fRank: () => 0,
    pinOK: p => p.view === 'wide',
    pinBtn: f => '<pin></pin>',
    crSrc: () => 'src="x"',
    srcTag: () => '<s></s>',
    genusHref: g => '#g/' + g,
    FB: {
      origins: () => '<o></o>',
      views: ({key, cur}) => `<v ${key}="${cur}"></v>`,
      viewItems: () => [],
      unit: ({id, cur}) => `<u id="${id}"></u>`,
      check: (id, on, t) => `<c id="${id}">${t}</c>`
    },
    ACT: {exclude: (g, f) => (flatCtx.log = flatCtx.log || []).push(['exclude', g, f])},
    zoom: (g, f) => (flatCtx.log = flatCtx.log || []).push(['zoom', g, f])
  };
};

test("the corals' builder: Quality has a band a level with its drop value, Growth form its rows; the To classify rows take no drop", () => {
  const c = glue({ASUBJ: flatS, ...flatCtx()}),
    B = c.reviewBuild(flatS);
  assert.deepStrictEqual(plain(B.axes), ['quality', 'growth-form']);
  assert.strictEqual(B.ready(), true);
  let P = B.page(flatS, 'quality');
  assert.deepStrictEqual(
    plain(P.bands.map(b => [b.drop, b.items.map(p => p.f)])),
    [
      [3, ['p1', 'p3']],
      [2, []],
      [1, ['p2']]
    ],
    'every level, empty or not'
  );
  assert.deepStrictEqual(plain(P.cls), {band: ' adm-qrow', grid: ' adm-qgrid'});
  const t = P.tile(PHOTO(c, 'p2'));
  assert.match(t.cls, / adm-qt is-hidden$/);
  assert.match(t.attrs, /data-f="p2" data-g="Porites" data-q="1" data-drag tabindex="0"/);
  assert.match(t.cap, /<span class="adm-src multi">hidden<\/span><q><\/q>$/);
  assert.strictEqual(t.acts, '<qseg></qseg><x></x>', 'the tile ends with the one Remove (RMBTN)');
  assert.strictEqual(typeof P.keys, 'function');
  assert.strictEqual(typeof P.drop, 'function');
  // the whole page through the frame: the drop value is the level
  c.renderReview(flatS, 'quality');
  assert.match(c.pg.v.innerHTML, /<div class="adm-grid adm-qgrid" data-drop="3">/);
  assert.match(
    c.pg.v.innerHTML,
    /<div class="adm-filter"><span class="label">View<\/span><v qv="all"><\/v>\s*<u id="qgen"><\/u>\s*<c id="qtodo">Not checked yet<\/c><\/div>/
  );
  // Growth form: a row per form, Form not visible, To classify (an empty one left out); the agreement block first
  P = B.page(flatS, 'growth-form');
  assert.deepStrictEqual(plain(P.bands.slice(0, 2).map(b => [b.drop, b.title])), [
    ['B', '<b class="adm-fl">Br</b> Form B'],
    ['E', '<b class="adm-fl">En</b> Form E']
  ]);
  assert.deepStrictEqual(plain([P.bands[7].drop, P.bands[7].title]), ['x', '<b class="adm-fl">∅</b> Form not visible']);
  const toClassify = P.bands.filter(b => /To classify/.test(b.title));
  assert.ok(toClassify.length >= 1 && toClassify.every(b => b.drop === undefined), 'To classify takes no drop');
  assert.deepStrictEqual(
    plain(toClassify.map(b => b.items.map(p => p.f))),
    [['p3']],
    'the photo with no form, in the one row that has any'
  );
  assert.match(P.top, /^<details class="adm-fagree" id="fagree"><\/details>$/);
  // Validate: a button on a row with a guess still to confirm (p2: a guess of ∅), none on a row with nothing to validate
  assert.match(P.bands[7].tool, /^ <button type="button" class="adm-fok" data-fok="x" title="Validate">✓ Validate 1<\/button>$/);
  assert.strictEqual(P.bands[0].tool, '');
});
const PHOTO = (c, f) => c.allPhotos().find(p => p.f === f);

test('the tree builder: not ready before the family pages are read, a note when the tree has no family', () => {
  const c = glue({ASUBJ: treeS, FISHC: null}),
    B = c.reviewBuild(treeS);
  assert.deepStrictEqual(plain(B.axes), ['ease', 'phase-framing']);
  assert.strictEqual(B.ready(), false);
  c.FISHC = {plays: [], units: []};
  assert.strictEqual(B.ready(), true);
  assert.deepStrictEqual(plain(B.page(treeS, 'ease')), {msg: '<p class="note">No families in fish.json yet.</p>'});
  // By difficulty: asks for the answers, says why they are not there, asks for the tree's data, then is ready
  const asked = [];
  c.loadStats = () => (asked.push('stats'), Promise.resolve());
  c.fishAdmin = () => (asked.push('admin'), Promise.resolve());
  c.ANS = null;
  assert.deepStrictEqual(plain(B.diff.gate(treeS, () => {})), {});
  c.ANS = {old: true, err: 'token'};
  assert.match(B.diff.gate(treeS, () => {}).msg, /GitHub token/);
  c.ANS = {old: true, v: '3'};
  assert.match(B.diff.gate(treeS, () => {}).msg, /Sheet script v3: needs v4/);
  c.ANS = {};
  c.FISHA = null;
  assert.deepStrictEqual(plain(B.diff.gate(treeS, () => {})), {});
  assert.deepStrictEqual(asked, ['stats', 'admin']);
  c.FISHA = {ph: {}};
  assert.strictEqual(
    B.diff.gate(treeS, () => {}),
    null
  );
  assert.strictEqual(B.diff.help, 'fishdiff');
  assert.strictEqual(c.reviewBuild(flatS).diff.help, 'diff');
});

test('the frame names no subject: one renderReview and one renderDiff, their differences only in the builders', () => {
  const frame = block(ADMIN, '\nfunction renderReview(', '// review build: end', {file: 'admin.js'}),
    code = frame
      .split('\n')
      .filter(l => !/^\s*\/\//.test(l))
      .join('\n');
  // no subject, no proxy of one (rank, sheets, curation part, the tree subject's state, the corals' data, the shape itself)
  assert.doesNotMatch(
    code,
    /\.rank\s*===\s*'|\.sheets\b|\.admin\.cur\b|\bFISHS\b|\bFISHC\b|\bFISHA\b|\bDATA\b|\.flat\b|\bTK\b|\bSTATS\b|\bANS\b/
  );
  // no builder's own function or state
  assert.doesNotMatch(
    code,
    /\b(?:allPhotos|qSeg|fSeg|qTag|rateTile|formTile|polTile|bindQ|bindF|agreeFill|treePhotoSet|treeTag|fishRepTile|bindFishTiles|fishLoad|fishAdmin|diffByAnswers|photoStats|photoAnswers|QUAL|FORM_ORDER|FREV)\b/
  );
  SUBJECTS.forEach(S => assert.doesNotMatch(code, new RegExp(`'${S.id}'`), S.id));
  // the dispatch asks the frame, the frame asks the shape and hasPage the builder; the old pages and their state are gone
  assert.match(ADMIN, /if \(reviewAxis\(cur\)\) return renderReview\(ASUBJ, reviewAxis\(cur\)\);/);
  assert.match(ADMIN, /if \(cur === 'photos\/review\/by-difficulty'\) return renderDiff\(ASUBJ\);/);
  assert.match(ADMIN, /reviewBuild = S => REVIEW_BUILD\[treeShape\(S\)\]/);
  assert.match(ADMIN, /o\.axis && !reviewBuild\(S\)\.axes\.includes\(o\.axis\)/);
  assert.doesNotMatch(
    ADMIN,
    /\brenderFishReview\b|\brenderFishDiff\b|\brenderQuality\b|\brenderForm\b|\bFDIFF_MAX\b|\bfrevRow\b|data-frz|data-qdrop|data-fdrop/
  );
});

test("the growth-form axis is the corals' named hook (rule C4): its pieces are in the flat builder only", () => {
  const review = block(ADMIN, '// review build: begin', '// review build: end', {file: 'admin.js'}),
    flat = block(review, '    flat: (() => {', '    // The tree subjects (fish, sea slugs)', {file: 'admin.js'}),
    tree = block(review, '    tree: (() => {', '\n  },\n  // A subject', {file: 'admin.js'});
  for (const k of ['fSeg', 'pinBtn', 'agreeFill', 'data-fok', 'LEGACY', 'FORM_ORDER']) {
    assert.ok(flat.includes(k), `the flat builder has ${k}`);
    assert.ok(!tree.includes(k), `the tree builder does not have ${k}`);
  }
  // the browser keys are the same as before
  for (const k of ['reefid-admin-qfilter', 'reefid-admin-ffilter']) assert.ok(flat.includes(`'${k}'`), k);
  assert.ok(tree.includes("'reefid-admin-fishrev'"));
});
