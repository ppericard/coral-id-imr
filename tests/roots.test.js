require('./slot.js').testGuard();
// Name roots on the genus sheets: data.json `root` (tools/apply_name_roots.py), shown by
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

// Fish genera: tools/fish_genus_roots.json, read from The ETYFish Project, built into
// fish.json genera `root` by tools/build_fish.py add_families (genus_root) and shown by the same rootLine, on the one
// sheet the genus opens (learn.js treeRoot).
const FISH = JSON.parse(fs.readFileSync(path.join(ROOT, 'fish.json'), 'utf8'));
const FR = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'fish_genus_roots.json'), 'utf8'));
const FG = Object.fromEntries(FISH.genera.map(g => [g.name, g]));
const ETY = /^https:\/\/etyfish\.org\/[a-z]+\d*\/$/;
const rootLineIn = () => {
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
  return ctx.rootLine;
};

test('every fish genus root has its ETYFish source: each meaning and word verbatim in the entry kept beside it', () => {
  const rooted = FISH.genera.filter(g => g.root).map(g => g.name);
  assert.deepStrictEqual(
    [...rooted].sort(),
    Object.keys(FR.genera).sort(),
    'fish.json roots are the tool file’s (build_fish.py --regroup)'
  );
  assert.ok(rooted.length >= 140, `${rooted.length} fish roots`);
  for (const n of rooted) {
    const r = FG[n].root,
      x = FR.genera[n];
    assert.strictEqual(r.src.length, 1, n);
    assert.strictEqual(r.src[0].u, `https://etyfish.org/${x.page}/`, n);
    assert.match(r.src[0].u, ETY, n);
    assert.strictEqual(r.src[0].t, `The ETYFish Project (${n})`, n);
    assert.strictEqual(r.p.map(q => q[0]).join(''), n, `${n}: the parts spell the name`);
    assert.ok(
      r.p.some(q => q[1]),
      `${n}: no part has a meaning`
    );
    for (const [form, gloss, word, src, kind] of r.p) {
      if (!gloss) {
        assert.ok(!word && !src.length && !kind, `${n}: ${form} has a word, a source or a kind but no meaning`);
        continue;
      }
      assert.deepStrictEqual(src, [0], `${n}: ${form} cites its ETYFish entry`);
      assert.ok(x.ety.includes(gloss), `${n}: “${gloss}” is not in its ETYFish entry`);
      if (word) assert.ok(x.ety.includes(word), `${n}: ${word} is not in its ETYFish entry`);
      assert.ok([undefined, 'genus', 'honours'].includes(kind), `${n}: ${kind}`);
      if (kind === 'genus') assert.ok(gloss.toLowerCase().startsWith(form.toLowerCase()), `${n}: ${form} does not spell ${gloss}`);
    }
    if (r.fit) assert.ok((FG[n].cues || []).includes(r.fit), `${n}: "${r.fit}" is not one of its IMR cues`);
  }
});

test('every fish genus (circles 1-3) has a root or a reason in skip, never both', () => {
  for (const g of FISH.genera) assert.ok(g.name in FR.genera !== g.name in FR.skip, `${g.name}: a root or a reason`);
  assert.ok(
    FISH.genera.some(g => g.circle === 3 && g.root) && FISH.genera.some(g => g.circle === 2 && g.root),
    'circles 2 and 3 have roots'
  );
  for (const n of Object.keys(FR.skip)) assert.ok(FG[n] && FR.skip[n].trim(), `skip ${n}`);
});

test('rootLine for fish: a word-less meaning, another genus, a person honoured, the shared ending among the fish', () => {
  const rootLine = rootLineIn(),
    names = FISH.genera.map(g => g.name),
    line = n => rootLine(FG[n], names, 'among the fish');
  assert.match(
    line('Naso'),
    /^<p class="nameroot"><b>Name roots:<\/b> <i>Naso<\/i>: “nose”\. <span class="rsrc"><a href="https:\/\/etyfish\.org\//
  );
  assert.match(line('Neopomacentrus'), /<i>Neo·pomacentrus<\/i>: “new” \(neo-\) \+ the genus <i>Pomacentrus<\/i>\./);
  assert.ok(line('Neopomacentrus').includes(' 3 genera among the fish end in -pomacentrus: the ending alone does not tell them apart.'));
  assert.match(line('Wetmorella'), /<i>Wetmor·ella<\/i>: honours Alexander Wetmore \+ “diminutive” \(–ella\)\./);
  assert.match(
    line('Acanthurus'),
    /“thorn or spine” \(acanthus\) \+ “tail” \(oura\)\. It fits the ID tip “One scalpel on the tail base”\./
  );
  // Circles 2 and 3: a word-less part kept, the same shapes.
  assert.match(line('Gymnothorax'), /<i>Gymno·thorax<\/i>: “bare or naked” \(gymnós\) \+ “breast or chest” \(thṓrax\)\./);
  assert.match(line('Eurypegasus'), /<i>Eury·pegasus<\/i>: “wide” \(eury\)\./);
  assert.match(
    line('Koumansetta'),
    /<i>Koumans·etta<\/i>: honours Frederik Petrus Koumans \+ “diminutive connoting endearment” \(-etta\)\./
  );
  const odon = names.filter(n => /odon$/.test(n)).length;
  assert.ok(line('Chaetodon').includes(` ${odon} genera among the fish end in -odon:`), line('Chaetodon'));
  // The corals keep their wording.
  assert.match(rootLine(G.Seriatopora, slateOf(DATA)), / genera on the slate end in -pora:/);
});

test('a fish genus root shows on the one sheet the genus opens: its page, its one species’ sheet, or its family’s', () => {
  const learn = fs.readFileSync(path.join(ROOT, 'learn.js'), 'utf8');
  assert.ok(block(learn, 'function treeGenus(g) {', '\n}\n').includes('${treeRoot(g, g.id)}'));
  assert.ok(block(learn, 'function fishSpecies(s) {', '\n}\n').includes("${treeRoot(g, 's:' + s.name)}"));
  assert.ok(block(learn, 'function treeFamily(f) {', '\n}\n').includes("${G.map(g => treeRoot(g, f.id)).join('')}"));
  assert.ok(block(learn, 'const treeRoot = ', "\n    : '';\n").includes('treeGo(g.id) === at'));
  const T = require('../core.js').treeSheets(FISH);
  for (const g of FISH.genera.filter(x => x.root)) assert.ok(T.go(g.id), `${g.name} opens no sheet`);
});
