// Glossary words (app.js GLOSS_PAT, gloss, glossAll; beginner review 2026-11-03): app.js's own code run in Node on the
// real data.json terms.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const DATA = require('../data.json');

function app() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8'),
    pick = (a, b) => src.slice(src.indexOf(a), src.indexOf(b)),
    ctx = {DATA};
  vm.createContext(ctx);
  vm.runInContext(
    src.slice(src.indexOf('const esc = '), src.indexOf('\n', src.indexOf('const esc = '))) +
      '\n' +
      pick('const GLOSS_PAT', 'const $gpop') +
      pick("// A term's text", 'function showGloss') +
      '\nthis.M = {gloss, glossAll, termDef, GLOSS_PAT};',
    ctx
  );
  return ctx.M;
}
const terms = html => [...html.matchAll(/data-gt="([^"]+)">([^<]+)</g)].map(m => [m[1], m[2]]);

test('every pattern names a glossary term, and every term but the plainest has a pattern', () => {
  const {GLOSS_PAT} = app(),
    names = DATA.terms.map(t => t[0]);
  Object.keys(GLOSS_PAT).forEach(k => assert.ok(names.includes(k), k));
  ['Corallite', 'Polyp', 'Septa', 'Coenosteum', 'Monticules', 'Septo-costae', 'Costae', 'Axial corallite'].forEach(k =>
    assert.ok(GLOSS_PAT[k], k)
  );
});

test('corallite, polyp and septal teeth are glossed; each term once per block, at its first occurrence', () => {
  const {gloss, glossAll} = app();
  assert.deepStrictEqual(terms(gloss('Cylindrical corallites standing out · Corallites look like holes')), [['Corallite', 'corallites']]);
  assert.deepStrictEqual(terms(gloss('Large, spiky septal teeth')), [['Septa', 'septal teeth']]);
  assert.deepStrictEqual(terms(gloss('Long polyps out by day')), [['Polyp', 'polyps']]);
  // The longer term wins where both start ("axial corallite", "hooded corallites"); plain "corallites" later still counts.
  assert.deepStrictEqual(terms(gloss('Axial corallite at branch tips · Cup-shaped radial corallites')), [
    ['Axial corallite', 'Axial corallite'],
    ['Corallite', 'corallites']
  ]);
  assert.deepStrictEqual(terms(gloss('No hooded corallites')), [['Hooded corallites', 'hooded corallites']]);
  // One list = one block: the second item's "corallites" is left plain.
  const L = glossAll(['Smooth coenosteum between corallites', 'Corallites 2-3 mm']);
  assert.deepStrictEqual(terms(L.join(' ')), [
    ['Coenosteum', 'coenosteum'],
    ['Corallite', 'corallites']
  ]);
  assert.ok(!/data-gt/.test(L[1]));
  // Inside a button (a Coral Finder box): tappable, but no focus stop of its own.
  assert.ok(/tabindex="0" role="button"/.test(gloss('corallites')));
  assert.ok(!/tabindex|role=/.test(gloss('corallites', undefined, true)));
  // Text is escaped first.
  assert.ok(gloss('<b>septa</b>').startsWith('&lt;b&gt;'));
});

test('a plain-words sentence comes first, the sourced definition and its source unchanged after it', () => {
  const {termDef} = app();
  for (const k of ['Corallite', 'Coenosteum', 'Monticules', 'Septo-costae', 'Costae', 'Axial corallite', 'Polyp']) {
    const t = DATA.terms.find(x => x[0] === k);
    assert.ok(t && t[3] && t[2], k);
    const h = termDef(t);
    assert.ok(h.indexOf(t[3].slice(0, 20)) < h.indexOf('class="gdef"'), k);
    assert.ok(h.includes(t[2]), k);
  }
});
