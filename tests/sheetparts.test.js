require('./slot.js').testGuard();
// Learn's sheets, one frame and shared parts for every subject (docs/reviews/2026-11-19-admin-one-engine.md §5 step 10,
// Dup-14): the genus sheet of the corals and the family, genus and species sheets of the tree subjects (learn.js) draw their
// page through sheetPage, and write the lines every sheet has (the report line, the "More details" fold, the first photo's
// button, the IMR cues box, "Don't confuse with") with the same parts, so the markup is one in every sheet. These tests run
// the parts' block of learn.js on stubs and check each part's markup, that every sheet draws through the frame and none
// writes the page itself, and that the sheets use each shared part instead of a copy of its markup. Each sheet's sections
// are the parts its subject declares (app.js UNITS sheetParts), drawn in that order by sheetBody from the sheet's builders:
// every declared part has its builder, and every builder is declared.
// node --test tests/sheetparts.test.js
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  block = require('./block.js');

const LEARN = fs.readFileSync(path.join(__dirname, '..', 'learn.js'), 'utf8'),
  PARTS = block(LEARN, '/* ---------- sheets: the frame and the parts every sheet shares ---------- */', '\nfunction viewGenus(name) {', {
    file: 'learn.js'
  });

const ctx = vm.createContext({
  $v: {innerHTML: ''},
  esc: s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'),
  repBtn: (o, t) => `<button data-rep="${o.k}:${o.g}:${o.m}">${t}</button>`,
  ZOOMI: '<i/>',
  img: (p, s) => `${p.f}-${s}.webp`,
  srcset: p => `${p.f} 1x`,
  esrcP: (r, k) => (r.esrc ? `<p class="note esrc">${r.esrc[k]}</p>` : '')
});
vm.runInContext(PARTS + '\nthis.P = {sheetPage, sheetBody, sheetRep, moreDetails, heroBtn, heroPic, cuesBox, looksSection};', ctx);
const P = ctx.P;

test('the frame: the intro, then the article with the body as given', () => {
  P.sheetPage('Intro', 'sheet fsheet', '\n    <p>a</p>\n  ');
  assert.strictEqual(ctx.$v.innerHTML, '<p class="lede">Intro</p>\n  <article class="sheet fsheet">\n    <p>a</p>\n  </article>');
});

test('the shared parts write the same markup in every sheet', () => {
  assert.strictEqual(
    P.sheetRep('f:Damselfishes'),
    '<p class="repline"><button data-rep="sheet:f:Damselfishes:sheet">⚑ Report a problem with this sheet</button></p>'
  );
  assert.strictEqual(P.moreDetails('<p>x</p>'), '<details class="more sheetmore"><summary>More details</summary><p>x</p></details>');
  assert.strictEqual(
    P.heroBtn(3, 'A<b', '<img>'),
    '<button type="button" class="zoom hero-ph" data-z="3" aria-label="Enlarge photo: A&lt;b"><img><i/></button>'
  );
  assert.strictEqual(P.heroPic({f: 'p'}, 'N'), '<img src="p-s.webp" srcset="p 1x" sizes="(max-width: 599.98px) 100vw, 45vw" alt="N">');
  assert.strictEqual(
    P.cuesBox({cues: ['a', 'b<'], esrc: {cues: 'S'}}, 'ID tips (IMR)', 'slides 1'),
    '<div class="tipbox"><h3>ID tips (IMR) <span class="pg">slides 1</span></h3><ul class="crit idtips"><li>a</li><li>b&lt;</li></ul><p class="note esrc">S</p></div>'
  );
  assert.strictEqual(P.looksSection('<a/>'), '<section class="hubsec"><h3>Don\'t confuse with</h3><div class="lrow"><a/></div></section>');
});

test('every sheet draws through the frame and uses the shared parts, none its own copy of their markup', () => {
  const sheets = {
    viewGenus: block(LEARN, 'function viewGenus(name) {', '\n}\n', {file: 'learn.js'}),
    treeFamily: block(LEARN, 'function treeFamily(f) {', '\n}\n', {file: 'learn.js'}),
    treeGenus: block(LEARN, 'function treeGenus(g) {', '\n}\n', {file: 'learn.js'}),
    treeSpecies: block(LEARN, 'function treeSpecies(s) {', '\n}\n', {file: 'learn.js'})
  };
  for (const [fn, body] of Object.entries(sheets)) {
    assert.ok(body.includes('sheetPage('), `${fn} draws through sheetPage`);
    assert.ok(!/\$v\.innerHTML\s*=/.test(body), `${fn} writes the page itself`);
    assert.ok(body.includes('sheetRep(') || /sheetRep\(name\)/.test(body), `${fn}: the report line`);
    assert.ok(
      !/class="repline"|class="more sheetmore"|class="zoom hero-ph"|class="hubsec"><h3>Don't|<div class="tipbox"><h3>ID tips \(IMR/.test(
        body
      ),
      `${fn} holds a copy of a part`
    );
  }
  assert.ok(sheets.viewGenus.includes('moreDetails(') && sheets.viewGenus.includes('heroBtn('), 'the corals: the fold and the first photo');
  assert.ok(
    sheets.treeFamily.includes('cuesBox(f,') && sheets.treeFamily.includes('looksSection('),
    'a family: the cues and the look-alikes'
  );
  assert.ok(sheets.treeGenus.includes('cuesBox(g,') && sheets.treeGenus.includes('looksSection('), 'a genus: the cues and the look-alikes');
  assert.ok(
    sheets.treeSpecies.includes('looksSection(') && sheets.treeSpecies.includes('moreDetails('),
    'a species: the look-alikes and the fold'
  );
});

test("sheetBody: the subject's declared parts, in its order, one to a line; a declared part with no builder throws", () => {
  ctx.SUBJ = {id: 'x'};
  ctx.UNITS = {x: {sheetParts: {genus: ['b', 'a'], family: ['a', 'zz']}}};
  const built = [];
  const S = {a: () => (built.push('a'), 'A'), b: () => (built.push('b'), 'B'), c: () => (built.push('c'), 'C')};
  assert.strictEqual(P.sheetBody('genus', S), '\n    B\n    A\n  ');
  assert.deepStrictEqual(built, ['b', 'a'], 'built in the declared order, an undeclared part never');
  assert.throws(() => P.sheetBody('family', S), /no family part "zz"/);
  // null: the sheet has no such part, no line at all; '' keeps its empty line (the sheets drawn before null existed)
  ctx.UNITS = {x: {sheetParts: {genus: ['a', 'n', 'e', 'b']}}};
  assert.strictEqual(P.sheetBody('genus', {...S, n: () => null, e: () => ''}), '\n    A\n    \n    B\n  ');
});

// A species' sexes or colour phases (learn.js spPhases, REE-54): only for a species the cited phase list flags with a
// source (fish.json phs), its words and sources as the phase card's (quiz.js phaseSrcs), then up to two photos of each
// judged phase in the list's order, each photo's place among the sheet's photos (added when not there yet).
test('spPhases: the cited list says it, with its sources, then two photos of each judged phase', () => {
  const QUIZ = fs.readFileSync(path.join(__dirname, '..', 'quiz.js'), 'utf8'),
    c = vm.createContext({
      esc: ctx.esc,
      safeUrl: u => u,
      phaseOf: p => p.ph || '',
      PHASEC: {WORD: {juvenile: 'Juvenile', male: 'Male', female: 'Female', intermediate: 'Intermediate'}}
    });
  vm.runInContext(
    block(QUIZ, 'const phaseSrcs = ', ';\n', {through: 1, file: 'quiz.js'}) +
      block(LEARN, 'const SP_PHASES = ', '\nfunction treeSpecies(s) {', {file: 'learn.js'}) +
      '\nthis.spPhases = spPhases;',
    c
  );
  const fig = (p, i, big, w) => `[${p.f}:${i}:${w}]`,
    ph = (f, w) => ({f, ph: w}),
    P = [ph('a', ''), ph('m1', 'male'), ph('j', 'juvenile'), ph('f1', 'female'), ph('m2', 'male'), ph('m3', 'male'), ph('t', 'terminal')],
    flat = P.slice(0, 5),
    src = [{t: 'Reef Life Survey', u: 'https://rls.example/s'}, {t: 'FishBase <x>'}];
  assert.strictEqual(c.spPhases({}, P, flat, fig), null, 'not on the list: no section');
  assert.strictEqual(c.spPhases({phs: {k: 'sex', src: []}}, P, flat, fig), null, 'no source: no section (rule C2)');
  const h = c.spPhases({phs: {k: 'sex', src}}, P, flat, fig);
  assert.strictEqual(
    h,
    '<section class="fphases"><h3>Males and females</h3><p class="fjuv">This species’ males and females can look very different.</p>' +
      '<p class="note refs">Sources: <a href="https://rls.example/s" target="_blank" rel="noopener">Reef Life Survey</a>, FishBase &lt;x></p>' +
      '<div class="strip">[f1:3:Female][m1:1:Male][m2:4:Male][t:5:Terminal]</div></section>'
  );
  assert.deepStrictEqual(
    flat.map(p => p.f),
    ['a', 'm1', 'j', 'f1', 'm2', 't'],
    'a phase photo not among the sheet photos is added once'
  );
  const k = c.spPhases({phs: {k: 'phase', src: [{t: 'Fishes of Australia'}]}}, [ph('a', '')], [], fig);
  assert.strictEqual(
    k,
    '<section class="fphases"><h3>Colour phases</h3><p class="fjuv">This species’ colour phases can look very different.</p><p class="note refs">Source: Fishes of Australia</p></section>',
    'no phase photo: the words and the source only'
  );
});

// The declared parts (app.js UNITS sheetParts) and each sheet's builders (its sheetBody call: `name: () =>`).
const APP = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8'),
  declared = {
    coral: vm.runInNewContext('(' + block(APP, '    sheetParts: {genus: [', '},', {through: 0, file: 'app.js'}).slice(16) + '})'),
    tree: vm.runInNewContext('(' + block(APP, '  sheetParts: {\n    family:', '\n  },', {file: 'app.js'}).slice(14) + '\n  })')
  },
  builders = (fn, kind) => {
    const b = block(LEARN, fn, '\n}\n', {file: 'learn.js'}),
      i = b.indexOf(`sheetBody('${kind}', {`);
    assert.ok(i > 0, `${fn} draws its body with sheetBody('${kind}')`);
    return [...b.slice(i).matchAll(/^ {6}(\w+): \(\) =>/gm)].map(m => m[1]);
  };

test('every declared part has its builder in its sheet, and every builder is declared', () => {
  for (const [subj, kind, fn] of [
    ['coral', 'genus', 'function viewGenus(name) {'],
    ['tree', 'family', 'function treeFamily(f) {'],
    ['tree', 'genus', 'function treeGenus(g) {'],
    ['tree', 'species', 'function treeSpecies(s) {']
  ]) {
    const want = declared[subj][kind];
    assert.ok(Array.isArray(want) && want.length, `${subj} declares its ${kind} parts`);
    assert.deepStrictEqual([...builders(fn, kind)].sort(), [...want].sort(), `${subj} ${kind}: the declared parts are the builders`);
    assert.strictEqual(new Set(want).size, want.length, `${subj} ${kind}: a part declared twice`);
  }
  // Every sheet ends with its report line, and the tree sheets open with their names.
  assert.deepStrictEqual(
    [declared.coral.genus, declared.tree.family, declared.tree.genus, declared.tree.species].map(L => L[L.length - 1]),
    ['report', 'report', 'report', 'report']
  );
  assert.deepStrictEqual(
    ['family', 'genus', 'species'].map(k => declared.tree[k][0]),
    ['names', 'names', 'names']
  );
});
