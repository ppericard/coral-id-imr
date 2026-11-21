require('./slot.js').testGuard();
// Learn's list, one page for every subject (docs/reviews/2026-11-19-admin-one-engine.md §5 step 9, Dup-13): learn.js viewList
// draws any subject's list, and what differs between subjects is its builder in LIST_BUILD, picked by the data shape the
// subject declares (SUBJECTS flat, rule S1), never by its name. These tests run the `// list build: begin` / `end` block of
// learn.js on stubs: every subject gets a builder, both builders have the same members, the frame draws a planted
// subject's lead, grid and foot from the builder's parts alone (the grid's id, its class, the redraw, the packing), the
// shared block and basics block are the same markup for both, the tree builder groups by the key, and the frame names no
// subject.
// node --test tests/listbuild.test.js
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  block = require('./block.js');

const ROOT = path.join(__dirname, '..'),
  LEARN = fs.readFileSync(path.join(ROOT, 'learn.js'), 'utf8'),
  {SUBJECTS} = require('../core.js'),
  BLOCK = block(LEARN, '// list build: begin', '// list build: end', {file: 'learn.js'});

// The page: its view and the one grid the frame finds in it. `calls` records what the frame did, in order.
const glue = (ctx = {}) => {
  const calls = [],
    grid = {innerHTML: '', className: ''},
    $v = {innerHTML: '', querySelector: sel => (calls.push(['find', sel]), grid)},
    c = vm.createContext({
      $v,
      SUBJ: null,
      esc: s => String(s),
      basicsWords: () => ({name: 'Basics'}),
      basicsCard: tips => `<card tips=${tips}>`,
      packGroups: g => calls.push(['pack', g.className]),
      ...ctx
    });
  vm.runInContext(BLOCK + '\nthis.LIST_BUILD = LIST_BUILD; this.listBuild = listBuild; this.viewList = viewList;', c);
  c.calls = calls;
  c.grid = grid;
  return c;
};
const MEMBERS = ['after', 'bind', 'blocks', 'foot', 'grid', 'lead'];

test('every subject has a builder, picked by the data shape it declares', () => {
  const c = glue();
  assert.deepStrictEqual(Object.keys(c.LIST_BUILD).sort(), ['flat', 'tree']);
  for (const S of SUBJECTS) assert.strictEqual(c.listBuild(S), c.LIST_BUILD[S.flat ? 'flat' : 'tree'], S.id);
  assert.ok(SUBJECTS.some(S => S.flat) && SUBJECTS.some(S => !S.flat), 'both shapes are in use');
  for (const k of Object.keys(c.LIST_BUILD)) assert.deepStrictEqual(Object.keys(c.LIST_BUILD[k]).sort(), MEMBERS, k);
});

test('the frame draws a planted subject from its builder: lead, an empty grid, the redraw, the foot', () => {
  const c = glue(),
    log = [];
  let n = 0;
  c.LIST_BUILD.tree = {
    lead: () => '<p class="lede">L</p>',
    grid: () => ({id: 'g1', cls: shown => 'grid' + (shown ? ' gpack' : '')}),
    blocks: () => ({html: `<b>${++n}</b>`, shown: n > 1}),
    foot: () => '<p>F</p>',
    bind: draw => (log.push('bind'), (c.redraw = draw)),
    after: g => log.push('after:' + g.innerHTML)
  };
  c.SUBJ = {id: 'x'};
  c.viewList();
  assert.strictEqual(c.$v.innerHTML, '<p class="lede">L</p><div class="grid" id="g1"></div><p>F</p>', 'the page, the grid empty');
  assert.deepStrictEqual(c.calls[0], ['find', ':scope > .tiplist, :scope > .grid']);
  // the first draw: bound first, then drawn; the class says whether a block is shown; the groups packed; the folds bound
  assert.deepStrictEqual(log, ['bind', 'after:<b>1</b>']);
  assert.strictEqual(c.grid.innerHTML, '<b>1</b>');
  assert.strictEqual(c.grid.className, 'grid');
  // a filter redraws the grid alone
  c.redraw();
  assert.strictEqual(c.grid.innerHTML, '<b>2</b>');
  assert.strictEqual(c.grid.className, 'grid gpack');
  assert.deepStrictEqual(
    c.calls.filter(x => x[0] === 'pack').map(x => x[1]),
    ['grid', 'grid gpack']
  );
  assert.strictEqual(c.$v.innerHTML, '<p class="lede">L</p><div class="grid" id="g1"></div><p>F</p>', 'the page itself is not redrawn');
  // a grid with no id (the tree subjects') has none in its markup
  c.LIST_BUILD.tree.grid = () => ({id: '', cls: () => 'tiplist gpack'});
  c.viewList();
  assert.strictEqual(c.$v.innerHTML, '<p class="lede">L</p><div class="tiplist gpack"></div><p>F</p>');
});

test('a group is one block of its units, none for no unit; the basics block is the same markup for both', () => {
  const c = glue();
  assert.strictEqual(vm.runInContext("listBlock('<h3>H</h3>', [], x => x)", c), '');
  assert.strictEqual(
    vm.runInContext("listBlock('<h3>H</h3>', ['a', 'b'], x => `<i>${x}</i>`)", c),
    '<section class="gblk" data-n="2"><h3>H</h3><i>a</i><i>b</i></section>'
  );
  assert.strictEqual(
    vm.runInContext("listBasics('genera', 'gtitle', false)", c),
    '<section class="gblk gbasics" data-n="1"><h3 class="gdiv" title="Before the genera"><span class="gn">0</span><span class="gtitle">Basics</span></h3><card tips=false></section>'
  );
  assert.match(
    vm.runInContext("listBasics('groups', 'gt', true)", c),
    /title="Before the groups"><span class="gn">0<\/span><span class="gt">Basics<\/span><\/h3><card tips=true>/
  );
});

test('the tree builder: one block per key group, a last one for the units in none, the key credited under the list', () => {
  const group = {a: 1, b: 2, c: 0},
    c = glue({
      TREEU: {
        key: {short: 'The Key', cite: 'The Key, 2020'},
        groups: [
          {n: 1, title: 'One'},
          {n: 2, title: 'Two'}
        ]
      },
      UNITS: {x: {}},
      GX: n => ({group: group[n], fam: 'F', lk: [], sub: []}),
      slateGenera: () => ['a', 'b', 'c'],
      groupHue: n => n * 10,
      SETS: () => [],
      Q: {},
      listCard: n => `<card ${n}>`,
      cover: () => null,
      vernFirst: () => '',
      altName: s => s,
      unameT: s => s,
      capFirst: s => s,
      SUBJ: {id: 'x', pages: []}
    }),
    t = c.LIST_BUILD.tree,
    o = t.blocks();
  assert.ok(o.shown);
  assert.strictEqual(
    o.html,
    [
      '<section class="gblk" data-n="1"><h3 class="gdiv" style="--g:10"><span class="gn">1</span><span class="gt">One</span></h3><card a></section>',
      '<section class="gblk" data-n="1"><h3 class="gdiv" style="--g:20"><span class="gn">2</span><span class="gt">Two</span></h3><card b></section>',
      '<section class="gblk" data-n="1"><h3 class="gdiv"><span class="gn">?</span><span class="gt">Not in a group yet</span></h3><card c></section>'
    ].join('')
  );
  assert.strictEqual(t.foot(), '<p class="note keycite">Identification groups: The Key, 2020</p>');
  assert.strictEqual(t.grid().id, '', 'no id: this grid is not packed again when the window is resized');
  assert.strictEqual(t.grid().cls(), 'tiplist gpack');
});

test('the frame and the shared parts name no subject: only the declared shape picks a builder', () => {
  const code = t => t.replace(/\/\/.*$/gm, ''),
    frame = code(BLOCK.slice(BLOCK.indexOf('const listBuild = '))),
    parts = code(block(BLOCK, 'const listBlock = ', 'const LIST_BUILD', {file: 'learn.js'}));
  for (const S of SUBJECTS) assert.ok(!new RegExp(`\\b${S.id}\\b`, 'i').test(frame + parts), `${S.id} named in the frame`);
  assert.ok(!/SUBJ\.id|SUBJECTS\.|\.flat\b/.test(parts + frame.replace(/const listBuild = .*\n/, '')));
  assert.strictEqual((BLOCK.match(/\.flat\b/g) || []).length, 1, 'the shape is read in one place');
});
