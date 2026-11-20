require('./slot.js').testGuard();
// Photos › Candidates, one swiper for every subject (docs/reviews/2026-11-19-admin-one-engine.md §5 step 5, Dup-3): admin.js
// renderCand draws any subject's swiper, and what differs between subjects is its builder in CAND_BUILD, picked by the data
// shape the subject declares (SUBJECTS flat, rule S1), never by its rank or its name; the tree subjects' builder lives in
// admin-fish.js. These tests run the `// cand build: begin` / `end` block of admin.js and the `// cand tree: begin` / `end`
// block of admin-fish.js on stubs: every subject gets a builder, both builders answer the same questions, a subject is never
// sent to a builder by its rank, the frame draws a planted subject's card, its toggles and its empty page from the builder's
// parts alone, and the frame names no subject.
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
  TREEJS = src('admin-fish.js'),
  plain = x => JSON.parse(JSON.stringify(x));

// A page that takes clicks: one element per selector, so a test finds the handler the frame bound; `all` gives the lists
// querySelectorAll answers (the Add buttons).
const page = () => {
  const els = {},
    all = {},
    el = () => ({
      onclick: null,
      onchange: null,
      dataset: {},
      isConnected: true,
      addEventListener() {},
      insertAdjacentHTML() {},
      querySelector: sel => (els[sel] = els[sel] || el()),
      querySelectorAll: sel => all[sel] || []
    });
  return {els, all, v: Object.assign(el(), {innerHTML: ''})};
};

// The blocks on stubs. The tree build's block gives the real treeShape; the rest are the names the frame and the builders call.
const glue = (ctx = {}) => {
  const pg = page(),
    calls = [],
    c = vm.createContext({
      ASUBJ: null,
      cur: 'photos/candidates',
      TK: 'fish',
      DRAFT: {},
      SUG: {},
      FISHC: null,
      FQ: 'all',
      $v: pg.v,
      status: () => calls.push('status'),
      render: () => calls.push('render'),
      candKeys: () => calls.push('keys'),
      candFlags: (chips, auto) => (chips || auto ? `<p class="adm-cflags">${chips}${auto}</p>` : ''),
      esc: s => String(s),
      img: p => 'img/' + p.f,
      addEventListener: t => calls.push('listen:' + t),
      Image: function () {},
      // the tree builder's helpers (admin-fish.js, autosort.js, admin.js)
      FISHT: {obs: 8, top: 12, cap: 20, wink: 5},
      candSpecies: () => ({}),
      fishQueue: () => c.ROWS,
      fishGameIn: () => [],
      fishLoad: arg => (calls.push('load:' + arg), Promise.resolve()),
      ROWS: [],
      ...ctx
    });
  vm.runInContext(
    block(ADMIN, '// tree build: begin', '// tree build: end', {file: 'admin.js'}) +
      '\n' +
      block(ADMIN, '// cand build: begin', '// cand build: end', {file: 'admin.js'}) +
      '\nthis.CAND_BUILD = CAND_BUILD; this.candBuild = candBuild; this.cst = cst; this.renderCand = renderCand;',
    c
  );
  c.pg = pg;
  c.calls = calls;
  return c;
};
const withTree = c => {
  vm.runInContext(block(TREEJS, '// cand tree: begin', '// cand tree: end', {file: 'admin-fish.js'}), c);
  return c;
};

const flatS = SUBJECTS.find(S => S.flat),
  treeS = SUBJECTS.find(S => !S.flat);

test('every subject gets a builder by the data shape it declares, never by its rank', () => {
  const c = withTree(glue());
  assert.deepStrictEqual(Object.keys(c.CAND_BUILD).sort(), ['flat', 'tree']);
  SUBJECTS.forEach(S => assert.strictEqual(c.candBuild(S), c.CAND_BUILD[S.flat ? 'flat' : 'tree'], S.id));
  assert.ok(flatS && treeS, 'a flat subject (the corals) and tree subjects (the fish, the sea slugs)');
  // a tree subject whose units are genera (a benthos subject would be) gets the tree builder; a flat one with families, the flat one
  assert.strictEqual(c.candBuild({id: 'benthos', rank: 'genus', unitRank: 'genus', sheets: {genus: 'g:'}}), c.CAND_BUILD.tree);
  assert.strictEqual(c.candBuild({id: 'x', rank: 'family', flat: true}), c.CAND_BUILD.flat);
  // before admin-fish.js (the tree builder's file, loaded after admin.js) has run, a tree subject has none yet: never the other's
  assert.strictEqual(glue().candBuild(treeS), null);
});

test('both builders answer the same questions, and the frame lists them', () => {
  const {flat, tree} = withTree(glue()).CAND_BUILD,
    members = B => Object.keys(B).sort(),
    MEMBERS = [
      'add',
      'auto',
      'bind',
      'card',
      'crop',
      'exclude',
      'instead',
      'interlude',
      'load',
      'queue',
      'ready',
      'reject',
      'seg',
      'words',
      'zoom'
    ];
  assert.deepStrictEqual(members(flat), MEMBERS);
  assert.deepStrictEqual(members(tree), MEMBERS);
  for (const B of [flat, tree]) Object.values(B).forEach(f => assert.strictEqual(typeof f, 'function'));
  // the comment above CAND_BUILD documents each member (add, reject… on one line), so a new one is described in one place
  const doc = block(ADMIN, '// cand build: begin', 'const CAND_BUILD', {file: 'admin.js'});
  for (const k of MEMBERS) assert.match(doc, new RegExp(`\\b${k}\\(`), `${k} is documented`);
});

// A planted builder: a subject's data shape reduced to the parts the frame draws; its actions log into `log`.
const rowsOf = (...fs) => fs.map(f => ({p: {f, src: 'u/' + f}, full: false, aside: false, chk: false}));
const planted = (rows, log = [], over = {}) => ({
  ready: () => true,
  load: () => Promise.resolve(),
  instead: () => false,
  queue: S => ({S, rows, unjudged: 2}),
  seg: (Q, shown, live) => `<span class="seg">${live.length}</span>`,
  words: () => ({
    lead: '<i class="lead"></i>',
    full: ['at target', 'of species at their target (8 observations)'],
    aside: 'set aside by the pass',
    judge: 'Ask the agent'
  }),
  auto: (det, chip) => (chip ? '<b class="autochip"></b>' : det ? '<u class="autodet"></u>' : ''),
  interlude: () => false,
  card: (Q, c) => ({
    cls: ' adm-x',
    attrs: ` data-s="s-${c.p.f}"`,
    photo: 'src="p.webp"',
    head: '<span class="adm-swg">HEAD</span>',
    caption: 'CAPTION',
    judge: '<p class="adm-judge">J</p>',
    strip: '<div class="strip"></div>',
    rows: '<div class="myrows"></div>',
    not: '<select class="not"></select>',
    tool: '<button type="button" data-tool>Tool</button>',
    crop: true,
    adds: [
      {v: 'a', t: 'Alpha', sug: true},
      {v: 'b', t: 'Beta'}
    ]
  }),
  add: (Q, c, v) => log.push(['add', c.p.f, v]),
  reject: (Q, c) => log.push(['reject', c.p.f]),
  exclude: (Q, c) => log.push(['exclude', c.p.f]),
  zoom: (Q, c) => log.push(['zoom', c.p.f]),
  crop: (Q, c) => log.push(['crop', c.p.f]),
  bind: (Q, scope, c) => log.push(['bind', c ? c.p.f : null]),
  ...over
});
// A subject the engine has never heard of, at genus rank, as benthos would be.
const NEW = {id: 'benthos', rank: 'genus', unitRank: 'genus', sheets: {genus: 'g:'}};

test("the frame draws a planted subject's card from the builder's parts alone", () => {
  const c = glue({ASUBJ: NEW}),
    log = [];
  c.CAND_BUILD.tree = planted(rowsOf('a1', 'a2', 'a3'), log);
  c.renderCand(NEW);
  const h = c.pg.v.innerHTML;
  assert.match(h, /<section class="adm-sw adm-x" data-f="a1" data-s="s-a1">/, "the first row, the builder's class and attributes");
  assert.match(h, /<span class="seg">3<\/span>/, "the builder's switch, given the live rows");
  assert.match(h, /<i class="lead"><\/i><span class="adm-chip adm-cjudge" title="Ask the agent">2 not judged yet<\/span>/);
  assert.match(h, /<b class="autochip"><\/b>/, 'the Auto chip in the row of toggles');
  assert.match(h, /HEAD<\/span>\s*<button type="button" class="adm-swx" data-x[^>]*>×<\/button>\s*<figcaption>CAPTION<\/figcaption>/);
  assert.match(h, /<p class="adm-judge">J<\/p><div class="strip"><\/div>/);
  assert.match(
    h,
    /<div class="myrows"><\/div><div class="adm-swrow"><select class="not"><\/select><button type="button" class="adm-swcrop on" data-crop aria-pressed="true">Crop<\/button><button type="button" data-tool>Tool<\/button><button type="button" data-skip>Skip<\/button><\/div>/
  );
  assert.match(
    h,
    /data-rej>✕ Reject<\/button><button type="button" class="add sug" data-add="a" title="Suggested · Add \(1\)">\+ Alpha<\/button><button type="button" class="add" data-add="b" title="Add \(2\)">\+ Beta<\/button>/
  );
  assert.match(h, /<u class="autodet"><\/u>$/, 'the auto details after the card');
  assert.ok(c.calls.includes('keys'), 'the keys');
  // a Check is blind in the frame: its tag and its class
  c.CAND_BUILD.tree = planted([{p: {f: 'k1', src: 'u/k1'}, chk: true}], log);
  c.renderCand(NEW);
  assert.match(c.pg.v.innerHTML, /adm-sw adm-x adm-blind" data-f="k1"/);
  assert.match(c.pg.v.innerHTML, /<figcaption><span class="adm-src adm-chk" title="Check">Check<\/span>CAPTION/);
});

test('the frame wires each button to the builder; Skip, the toggles and Show skipped are its own', () => {
  const c = glue({ASUBJ: NEW}),
    rows = rowsOf('a1', 'a2').map((x, i) => ({...x, full: i === 1})),
    log = [];
  c.CAND_BUILD.tree = planted(rows, log);
  c.renderCand(NEW);
  const E = c.pg.els,
    st = c.cst(NEW);
  // the one card (a2 is in a full cell: left out), and the toggle for it
  assert.match(c.pg.v.innerHTML, /data-f="a1"/);
  assert.doesNotMatch(c.pg.v.innerHTML, /data-f="a2"/);
  assert.match(
    c.pg.v.innerHTML,
    /data-cfull aria-pressed="false" title="1 candidate of species at their target \(8 observations\): tap to show them">1 at target<\/button>/
  );
  E['[data-rej]'].onclick();
  E['[data-x]'].onclick();
  E['[data-zoom]'].onclick();
  E['[data-crop]'].onclick();
  assert.deepStrictEqual(plain(log.filter(x => x[0] !== 'bind')), [
    ['reject', 'a1'],
    ['exclude', 'a1'],
    ['zoom', 'a1'],
    ['crop', 'a1']
  ]);
  // Skip: the card is skipped and no longer pinned, drawn again
  st.pin = 'a1';
  E['[data-skip]'].onclick();
  assert.ok(st.skip.has('a1'));
  assert.strictEqual(st.pin, null);
  assert.strictEqual(c.calls.filter(x => x === 'render').length, 1);
  // the toggles flip this subject's state only, and draw again
  c.renderCand(NEW);
  E['[data-cfull]'].onclick();
  assert.strictEqual(st.full, true);
  assert.strictEqual(c.cst(flatS).full, false, "another subject's own state");
  assert.strictEqual(c.calls.filter(x => x === 'render').length, 2);
  // the empty page: the one shown candidate skipped, a2 in its full cell: the count of skipped and the way back
  st.full = false;
  c.renderCand(NEW);
  assert.match(
    c.pg.v.innerHTML,
    /adm-swempty[\s\S]*<p class="note">1 skipped\.<\/p><button type="button" class="adm-btn" data-again>Show the skipped ones<\/button>/
  );
  E['[data-again]'].onclick();
  assert.strictEqual(st.skip.size, 0);
  // nothing at all: No candidate left, no way back
  c.CAND_BUILD.tree = planted([], log);
  c.renderCand(NEW);
  assert.match(c.pg.v.innerHTML, /<p class="note">No candidate left\.<\/p>/);
  assert.doesNotMatch(c.pg.v.innerHTML, /data-again/);
  // the builder's binder is given the card, and none on an empty page
  assert.deepStrictEqual(
    plain(log.filter(x => x[0] === 'bind')).map(x => x[1]),
    ['a1', null, null, null]
  );
});

test("an Add reaches the builder with its button's value, and a decision releases the pinned card", () => {
  const c = glue({ASUBJ: NEW}),
    log = [],
    adds = ['a', 'b'].map(v => ({dataset: {add: v}, onclick: null}));
  c.CAND_BUILD.tree = planted(rowsOf('a1'), log);
  c.pg.all['[data-add]'] = adds;
  const st = c.cst(NEW);
  c.renderCand(NEW);
  st.pin = 'a1';
  adds[1].onclick();
  assert.deepStrictEqual(plain(log.filter(x => x[0] === 'add')), [['add', 'a1', 'b']]);
  assert.strictEqual(st.pin, null);
});

test('a builder that is not ready loads first; one with a page or a card of its own takes the swiper', async () => {
  const c = glue({ASUBJ: NEW});
  let ready = false;
  c.CAND_BUILD.tree = planted(rowsOf('a1'), [], {
    ready: () => ready,
    load: () => ((ready = true), Promise.resolve())
  });
  c.renderCand(NEW);
  assert.match(c.pg.v.innerHTML, /Loading/);
  await new Promise(r => setImmediate(r));
  assert.ok(c.calls.includes('render'), 'drawn again once its files are read');
  // instead: nothing of the frame is drawn
  c.pg.v.innerHTML = 'kept';
  c.CAND_BUILD.tree = planted(rowsOf('a1'), [], {instead: () => true});
  c.renderCand(NEW);
  assert.strictEqual(c.pg.v.innerHTML, 'kept');
  // interlude: it is given the queue's switch, and nothing of the frame is drawn after it
  let seg = null;
  c.CAND_BUILD.tree = planted(rowsOf('a1'), [], {interlude: (Q, s) => ((seg = s), true)});
  c.renderCand(NEW);
  assert.match(seg, /<span class="seg">1<\/span>/);
  assert.strictEqual(c.pg.v.innerHTML, 'kept');
  // no builder yet (admin-fish.js not loaded): waits for the page's load event, never the other shape's
  const d = glue({ASUBJ: NEW});
  d.renderCand(NEW);
  assert.ok(d.calls.includes('listen:load'));
  assert.match(d.pg.v.innerHTML, /Loading/);
});

test("the tree builder's queue shows the Checks only where Checks can exist", () => {
  const c = withTree(glue({ASUBJ: treeS, FISHC: {cand: {}, plays: []}, FQ: 'chk'})),
    B = c.CAND_BUILD.tree,
    row = (f, chk) => ({p: {f}, chk});
  c.ROWS = [row('a'), row('k', true), row('b')];
  const S0 = {...treeS, admin: {...treeS.admin, autosort: true}},
    S1 = {...treeS, admin: {...treeS.admin, autosort: false}};
  let Q = B.queue(S0);
  assert.strictEqual(Q.aqOn, true);
  assert.deepStrictEqual(
    Q.rows.map(x => x.p.f),
    ['k'],
    'an auto-sort: the Checks, as chosen'
  );
  assert.match(
    B.seg(Q, () => true),
    /data-fq="chk" aria-pressed="true"[^>]*>Checks <b>1<\/b>/
  );
  // no auto-sort and no Check: every candidate, whatever FQ another subject left, no switch, a chip beside the others instead
  c.ROWS = [row('a'), row('b')];
  Q = B.queue(S1);
  assert.strictEqual(Q.aqOn, false);
  assert.strictEqual(Q.rows.length, 2);
  assert.strictEqual(
    B.seg(Q, () => true),
    ''
  );
  assert.match(B.words(Q, () => true).lead, /2 to sort/);
  assert.strictEqual(Q.unjudged, 2, 'rows the judging pass has not seen');
});

test('the frame names no subject: one renderCand, its subject differences only in the builders', () => {
  const frame = block(ADMIN, '\nfunction renderCand(', '\n}\n', {through: 1, file: 'admin.js'}),
    code = frame
      .split('\n')
      .filter(l => !/^\s*\/\//.test(l))
      .join('\n');
  // no subject, no proxy of one (rank, sheets, curation part, the tree subject's state, the corals' data, the shape itself),
  // no builder's own function or state
  assert.doesNotMatch(code, /\.rank\s*===\s*'|\.sheets\b|\.admin\.cur\b|\bFISHS\b|\bFISHC\b|\bDATA\b|\.flat\b|\bTK\b/);
  assert.doesNotMatch(
    code,
    /\b(?:candQueue|fishQueue|autoBlock|fishAutoBlock|retestNext|renderRetest|renderRepl|cellFull|capOf|capViews|qSeg|fSeg|fishRows|fishName|CSRC|CREPL|CDONE|FTAGS_OPEN|FQ)\b/
  );
  SUBJECTS.forEach(S => assert.doesNotMatch(code, new RegExp(`'${S.id}'`), S.id));
  // the dispatch asks the frame, the frame asks the shape; the two pages and their state are gone
  assert.match(ADMIN, /if \(cur === 'photos\/candidates'\) return renderCand\(ASUBJ\);/);
  assert.match(ADMIN, /candBuild = S => CAND_BUILD\[treeShape\(S\)\] \|\| null/);
  assert.doesNotMatch(
    ADMIN + TREEJS,
    /renderFishCand|\bFFULL\b|\bFASIDE\b|\bFSKIP\b|\bFPIN\b|\bCSKIP\b|\bCFULL\b|\bCASIDE\b|data-ffull|data-faside|data-fcrop/
  );
});
