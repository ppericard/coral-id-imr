// Traits found in some species of a genus only (data.json gen[g].trs; Pierre, 2026-11-04, after the Favites report):
// every tool reads `tr` and `trs` through one rule, proto/lab.js trHas (1 the genus, 0.5 some species, 0 no), never
// by genus name. node --test tests/
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  {execFileSync} = require('child_process');
const block = require('./block.js');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const DATA = JSON.parse(read('data.json'));
const LAB = read('proto/lab.js');

// The trait helpers of proto/lab.js, run on the real data.
const helpers = () => {
  const ctx = {DATA};
  vm.createContext(ctx);
  vm.runInContext(
    block(LAB, 'const trOpt = id =>', 'const tag = n =>', {file: 'proto/lab.js'}) + ';this.H = {trHas, trAll, trLabel, trFits, trName};',
    ctx
  );
  return ctx.H;
};

test('trs: known trait ids, never also in tr, only on genera of the data', () => {
  const ids = new Set(DATA.traits.flatMap(t => t.opts.map(o => o.id)));
  const G = {...DATA.gen, ...DATA.x.gen};
  const some = Object.entries(G).filter(([, g]) => g.trs);
  assert.ok(some.length, 'at least one genus has a some-species trait');
  some.forEach(([n, g]) => g.trs.forEach(id => assert.ok(ids.has(id) && !g.tr.includes(id), `${n} trs ${id}`)));
});

test('a some-species trait is half a match, labelled, and never eliminates (e.g. paliform lobes in some Favites)', () => {
  const H = helpers();
  Object.values(DATA.gen)
    .filter(g => g.trs)
    .forEach(g =>
      g.trs.forEach(id => {
        assert.strictEqual(H.trHas(g, id), 0.5);
        assert.ok(H.trFits(g, [id]), 'ticking it keeps the genus');
        assert.ok(H.trAll(g).includes(id));
        assert.match(H.trLabel(g, id), /\(some species\)$/);
      })
    );
  // The case that started it: ticking paliform lobes no longer eliminates Favites.
  assert.ok(H.trFits(DATA.gen.Favites, ['pali']));
  assert.strictEqual(H.trHas(DATA.gen.Goniastrea, 'pali'), 1);
  assert.strictEqual(H.trHas(DATA.gen.Platygyra, 'pali'), 0);
  assert.ok(!H.trFits(DATA.gen.Platygyra, ['pali']));
  assert.ok(H.trFits(DATA.gen.Platygyra, []), 'nothing ticked: everything fits');
});

test('every reader of a genus trait goes through the helpers, and none names a genus', () => {
  const files = execFileSync('git', ['ls-files', '*.js', 'proto/*.js'], {cwd: ROOT, encoding: 'utf8'})
    .split('\n')
    .filter(f => f && !/^(tests|tools)\//.test(f));
  const bad = [];
  files.forEach(f =>
    read(f)
      .split('\n')
      .forEach((l, i) => {
        // Membership in tr is the rule itself: only lab.js trHas tests it.
        if (/\.tr\.includes\(|\.trs\b/.test(l) && !(f === 'proto/lab.js' && /^const tr(Has|All) =/.test(l)))
          bad.push(`${f}:${i + 1}: ${l.trim().slice(0, 100)}`);
      })
  );
  assert.deepStrictEqual(bad, [], 'read tr / trs through proto/lab.js trHas, trAll, trLabel, trFits');
  // The trait tools never name a genus in their code (comments aside): the data decides.
  const names = Object.keys({...DATA.gen, ...DATA.x.gen});
  const tools = [
    'proto/lab.js',
    'proto/idkey.js',
    'proto/elim.js',
    'proto/gallery.js',
    'proto/matrix.js',
    'proto/spot.js',
    'proto/size.js',
    'proto/map.js'
  ];
  tools.forEach(f => {
    const code = read(f)
      .split('\n')
      .map(l => l.replace(/(^|\s)\/\/.*$/, ''))
      .join('\n');
    names.forEach(n => assert.ok(!new RegExp(`\\b${n}\\b`).test(code), `${f} names ${n}`));
  });
});
