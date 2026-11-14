// Name roots on the genus sheets (Pierre, 2026-11-14, Q124 d): data.json `root` (tools/apply_name_roots.py), shown by
// learn.js rootLine. Every root line has a source for each meaning, never an invented split.
const block = require('./block.js');
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const {slateOf} = require('../core.js');
const ROOT = path.join(__dirname, '..');
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'data.json'), 'utf8'));
const G = {...DATA.gen, ...DATA.x.gen};
const withRoot = Object.keys(G).filter(n => G[n].root);
// The dictionaries a root may cite (tools/apply_name_roots.py): Jaeger's Source-Book on archive.org, Merriam-Webster.
const HOSTS =
  /^https:\/\/(archive\.org\/details\/in\.ernet\.dli\.2015\.350249\/page\/n\d+\/mode\/1up|www\.merriam-webster\.com\/dictionary\/[-A-Za-z]+)$/;

test('the transparent names of the name study have a root, and a good share of the slate does', () => {
  for (const n of ['Acropora', 'Seriatopora', 'Echinopora', 'Tubastraea']) assert.ok(G[n].root, n);
  assert.ok(withRoot.filter(n => slateOf(DATA).includes(n)).length >= 20, `${withRoot.length} roots`);
});

test('every root line has a source: each meaning cites one, each source is a dictionary link with a label', () => {
  for (const n of withRoot) {
    const r = G[n].root;
    assert.ok(Array.isArray(r.src) && r.src.length, `${n}: no source`);
    r.src.forEach(s => {
      assert.ok(typeof s.t === 'string' && s.t.trim(), `${n}: a source without a label`);
      assert.match(s.u, HOSTS, `${n}: ${s.u}`);
    });
    const used = new Set();
    for (const [form, gloss, word, src] of r.p) {
      if (!gloss) {
        assert.ok(!word && !src.length, `${n}: the ending ${form} has a word or a source but no meaning`);
        continue;
      }
      assert.ok(word && word.trim(), `${n}: ${form} has no Latin or Greek word`);
      assert.ok(src.length, `${n}: ${form} has no source`);
      src.forEach(i => (assert.ok(Number.isInteger(i) && r.src[i], `${n}: ${form} cites source ${i}`), used.add(i)));
    }
    assert.strictEqual(used.size, r.src.length, `${n}: a source no part cites`);
  }
});

test('the parts spell the name exactly, with at least one meaning, and a fit is one of its own ID tips', () => {
  for (const n of withRoot) {
    const r = G[n].root;
    assert.strictEqual(
      r.p
        .map(x => x[0])
        .join('')
        .toLowerCase(),
      n.toLowerCase(),
      n
    );
    assert.ok(
      r.p.some(x => x[1]),
      `${n}: no part has a meaning`
    );
    if (r.fit) assert.ok((G[n].qt || []).includes(r.fit), `${n}: "${r.fit}" is not one of its ID tips`);
  }
});

test('rootLine: parts, meanings with their words, the fit, the shared ending counted, the sources; nothing without a root', () => {
  const app = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8'),
    learn = fs.readFileSync(path.join(ROOT, 'learn.js'), 'utf8'),
    ctx = {};
  vm.createContext(ctx);
  vm.runInContext(
    [
      block(app, 'const esc = ', '\n'),
      block(app, 'const safeUrl = ', '\n};\n', {through: 1}),
      block(learn, 'const srcA = ', '\n'),
      block(learn, 'const rootLine = ', '\n};\n', {through: 1}),
      'this.rootLine = rootLine;'
    ].join('\n'),
    ctx
  );
  const slate = slateOf(DATA),
    h = ctx.rootLine(G.Seriatopora, slate);
  assert.match(
    h,
    /^<p class="nameroot"><b>Name roots:<\/b> <i>Seriato·pora<\/i>: “in rows” \(Latin seriatus\) \+ “pore” \(Latin porus\)\./
  );
  assert.match(h, /It fits the ID tip “Corallites in neat rows”\./);
  const pora = slate.filter(n => /pora$/.test(n)).length;
  assert.ok(pora >= 3);
  assert.ok(h.includes(` ${pora} genera on the slate end in -pora: the ending alone does not tell them apart.`), h);
  assert.ok(
    h.includes('<a href="https://archive.org/details/in.ernet.dli.2015.350249/page/n236/mode/1up" target="_blank" rel="noopener">'),
    h
  );
  // An ending with no meaning is spelled but not glossed, and a meaningless last part never counts as a shared ending.
  const f = ctx.rootLine(G.Fungia, slate);
  assert.match(f, /<i>Fung·ia<\/i>: “mushroom” \(Latin fungus\)\. <span/);
  assert.ok(!/genera on the slate/.test(f));
  assert.strictEqual(ctx.rootLine({p: 1}, slate), '');
  assert.strictEqual(ctx.rootLine(undefined, slate), '');
  assert.ok(
    ctx
      .rootLine({root: {p: [['A<b>', 'x & y', 'Greek z', [0]]], src: [{t: 't', u: 'javascript:alert(1)'}]}}, slate)
      .includes('<i>A&lt;b&gt;</i>: “x &amp; y” (Greek z). <span class="rsrc"><a href="#"')
  );
});

test('the genus sheet shows the root line under the ID tips, outside the IMR tips box', () => {
  const learn = fs.readFileSync(path.join(ROOT, 'learn.js'), 'utf8'),
    sheet = block(learn, 'function viewGenus(name) {', '\n}\n');
  const i = sheet.indexOf('${rootLine(g, slateOf(DATA))}');
  assert.ok(i > sheet.indexOf('<b>Mnemonic:</b>') && i < sheet.indexOf('<div class="lnotes">'), 'rootLine sits after the tips box');
});
