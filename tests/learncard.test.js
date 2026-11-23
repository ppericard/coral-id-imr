require('./slot.js').testGuard();
// A unit's card on a Learn list (idtips.js listCard; Pierre, 2026-11-20), for every subject: the whole card opens the
// unit's sheet through one link (its name, stretched over the card), with no "Open the sheet" line, no ID marks heading
// and no source under the cues (they are on the sheet, rule C2), and its photo no longer enlarges there. Run from
// idtips.js and learn.js themselves.
// node --test tests/learncard.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const block = require('./block.js');

const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const idtips = read('idtips.js'),
  learn = read('learn.js'),
  css = read('app.css');

// A coral genus with edited tips (their source, qsrc) and two look-alikes, a sea slug genus with sourced ID marks (tl) and
// a summary only.
const GEN = {
  Porites: {qt: ['Small corallites', 'Smooth lumps'], qsrc: {t: 'a made-up guide'}, tl: 'ID tips', fam: 'Poritidae'},
  'g:Chromodoris': {name: 'Chromodoris', qt: ['Dark lines along the back'], tl: 'ID marks (a made-up forum)', fam: 'Chromodorididae'},
  'g:Ardeadoris': {name: 'Ardeadoris', sum: 'A short summary', esrc: {sum: {t: 'a made-up book'}}, fam: 'Chromodorididae'}
};
const ctx = {
  GX: n => GEN[n],
  DATA: {gen: GEN},
  cover: g => (g.qt ? {f: 'x'} : null),
  thumb: p => `src="${p.f}.webp"`,
  uname: n => `<i>${(GEN[n] && GEN[n].name) || n}</i>`,
  hr: k => '#' + k,
  lookOf: n => (n === 'Porites' ? ['Montipora', 'Goniopora'] : []),
  glossAll: L => L.map(x => `<span class="gt" tabindex="0" role="button" data-gt="t">${x}</span>`),
  gloss: x => x,
  esrcHtml: s => s.t,
  esrcTag: g => (g.esrc && g.esrc.sum ? ` <small>(${g.esrc.sum.t})</small>` : ''),
  esc: s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
};
vm.createContext(ctx);
vm.runInContext(
  block(idtips, 'const tipsList = (g, cls', '\nconst tipsText', {file: 'idtips.js'}) +
    '\n' +
    block(idtips, 'const tipCard = n =>', '\n  );\n', {through: 1, file: 'idtips.js'}) +
    '\nthis.M = {tipsList, listCard, tipCard};',
  ctx
);
const {tipsList, listCard, tipCard} = ctx.M;
// The links of a card's markup, each with what it holds; a link inside a link fails.
const links = h => {
  const out = [];
  let at = 0;
  for (;;) {
    const i = h.indexOf('<a ', at);
    if (i < 0) return out;
    const j = h.indexOf('</a>', i);
    assert.ok(j > 0 && !h.slice(i + 1, j).includes('<a '), `a link inside a link: ${h}`);
    out.push(h.slice(i, j));
    at = j;
  }
};
const cards = () => [
  tipCard('Porites'),
  listCard('g:Chromodoris', {f: 'c'}, '<small>Chromodorididae</small>'),
  listCard('g:Ardeadoris', null, '<small>Chromodorididae</small>')
];

test('a Learn list card is one link to its sheet, its name, over the whole card; other links are the notes’ own', () => {
  for (const h of cards()) {
    const L = links(h),
      sheet = L.filter(a => a.includes('class="tipsheet"'));
    assert.strictEqual(sheet.length, 1, h);
    assert.match(sheet[0], /href="#g-[^"]+"/);
    assert.match(sheet[0], /<b><i>[^<]+<\/i><\/b>/, 'the link holds the name');
    assert.ok(h.startsWith('<article class="tipg lcard">'), h);
    // the chevron, decorative
    assert.match(h, /<span class="fgo" aria-hidden="true">›<\/span><\/article>$/);
    // every other link goes elsewhere (the corals' Compare pairs)
    L.filter(a => !a.includes('class="tipsheet"')).forEach(a => assert.match(a, /href="#cmp-/));
  }
  assert.strictEqual(links(cards()[0]).length, 3, 'the coral card: its sheet and its two Compare pages');
  // the stretched link and what sits above it
  assert.match(css, /\.lcard \.tipsheet::after \{[^}]*position: absolute;[^}]*inset: 0;/);
  assert.match(css, /\.lcard a:not\(\.tipsheet\),\n\.lcard \[data-gt\] \{[^}]*z-index: 1;/);
});

test('no "Open the sheet", no ID marks heading and no source on a list card; the sheet keeps them (tipsList)', () => {
  for (const h of cards()) {
    assert.ok(!/Open the sheet/.test(h), h);
    assert.ok(!/class="label"|ID marks|ID tips/.test(h), h);
    assert.ok(!/made-up/.test(h), `a source on the list: ${h}`);
  }
  // the sheets' cues keep their source (rule C2)
  assert.match(tipsList(GEN.Porites), /Source: a made-up guide/);
  assert.match(tipsList(GEN['g:Ardeadoris']), /a made-up book/);
  assert.ok(!/made-up/.test(tipsList(GEN.Porites, '', true)));
});

test('the photo opens the sheet, not the photo viewer, on every subject’s list', () => {
  for (const h of cards()) assert.ok(!/data-z|class="zoom"|<button/.test(h), h);
  const fishList = block(learn, "  // The tree subjects' list:", '\n// The taxonomic groups', {file: 'learn.js'});
  assert.match(fishList, /listCard\(/);
  assert.ok(!/zoom\(|data-z|Open the sheet|g\.tl/.test(fishList), 'the fish and sea slug list: no viewer, no sheet line, no heading');
});
