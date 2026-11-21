require('./slot.js').testGuard();
// Learn's sheets, one frame and shared parts for every subject (docs/reviews/2026-11-19-admin-one-engine.md §5 step 10,
// Dup-14): the genus sheet of the corals and the family, genus and species sheets of the tree subjects (learn.js) draw their
// page through sheetPage, and write the lines every sheet has (the report line, the "More details" fold, the first photo's
// button, the IMR cues box, "Don't confuse with") with the same parts, so the markup is one in every sheet. These tests run
// the parts' block of learn.js on stubs and check each part's markup, that every sheet draws through the frame and none
// writes the page itself, and that the sheets use each shared part instead of a copy of its markup.
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
vm.runInContext(PARTS + '\nthis.P = {sheetPage, sheetRep, moreDetails, heroBtn, heroPic, cuesBox, looksSection};', ctx);
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
