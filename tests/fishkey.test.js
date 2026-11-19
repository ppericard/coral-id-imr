require('./slot.js').testGuard();
// The Fish ID Key for EventMeasure (proto/fishkey.js; ROADMAP "Fish ID Key for EventMeasure"; docs/spec/basics.md "The
// Lab"): its tree and its search, run in Node on the real fish.json, and its wiring. It holds every species of the IMR
// reference PDF, once each, those out of the game too; each under its family, in the group of the key in force (rule
// S3), a species whose family has no record last, under its PDF section; the PDF's names, WoRMS's beside them (rule
// S2), every name findable. In the Lab until Pierre's OK (rule U13): never in GRADUATED. The page itself is looked at in
// pages.smoke.js (fishkey).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const ROOT = path.join(__dirname, '..'),
  read = f => fs.readFileSync(path.join(ROOT, f), 'utf8'),
  F = JSON.parse(read('fish.json'));

function load() {
  const added = [],
    ctx = {LAB: {add: p => added.push(p)}};
  vm.runInNewContext(read('proto/fishkey.js') + '\nthis.FISHKEY = FISHKEY;', ctx);
  return {K: ctx.FISHKEY, tool: added[0]};
}

test('the key holds every species of the IMR reference PDF, once each, out of the game ones too', () => {
  const {K} = load(),
    I = K.index(F),
    pdf = F.species.filter(s => s.pdf),
    inKey = I.fams.flatMap(f => f.gens.flatMap(g => g.sp.map(s => s.id)));
  assert.strictEqual(I.sp.length, pdf.length);
  assert.deepStrictEqual([...inKey].sort(), pdf.map(s => s.id).sort());
  assert.strictEqual(new Set(inKey).size, inKey.length, 'a species shows once');
  // Nothing but the PDF's species: the circle-3 species from other sources are not in it.
  assert.ok(F.species.some(s => !s.pdf) && !inKey.some(id => !F.species.find(s => s.id === id).pdf));
  const out = pdf.filter(s => s.out);
  out.forEach(s => assert.ok(inKey.includes(s.id), `${s.name} (out: ${s.out}) is in the key`));
  // Each family's count is its species shown.
  I.fams.forEach(f =>
    assert.strictEqual(
      f.n,
      f.gens.reduce((n, g) => n + g.sp.length, 0),
      f.id
    )
  );
});

test('groups are the key in force, in its order; each family under its own group; no family record last', () => {
  const {K} = load(),
    I = K.index(F),
    nums = I.groups.filter(g => g.n).map(g => g.n),
    keyN = F.key.groups.map(g => g.n);
  assert.deepStrictEqual(
    [...nums],
    keyN.filter(n => nums.includes(n)),
    'the key order'
  );
  I.groups.forEach(g =>
    g.fams.forEach(f => {
      if (g.n) {
        assert.strictEqual(f.group, g.n, f.id);
        assert.strictEqual(g.title, F.key.groups.find(x => x.n === g.n).title, "the group title is the key's");
      } else assert.ok(!f.group || !keyN.includes(f.group), f.id);
    })
  );
  const last = I.groups[I.groups.length - 1];
  const loose = F.species.filter(s => s.pdf && !(s.family && F.families.some(f => f.id === s.family)));
  if (loose.length) {
    assert.strictEqual(last.n, null, 'the species with no family record come last');
    loose.forEach(s =>
      assert.ok(
        last.fams.some(f => f.id === 'sec:' + s.sec && !f.sheet && f.gens.some(g => g.sp.includes(s))),
        `${s.name} under its PDF section ${s.sec}`
      )
    );
  }
});

test('within a family: its genera, then its species, in the order of fish.json (the commonness order)', () => {
  const {K} = load(),
    I = K.index(F);
  I.fams
    .filter(f => f.sheet)
    .forEach(f => {
      const fr = F.families.find(x => x.id === f.id),
        gOrd = f.gens.map(g => fr.genera.indexOf(g.id)).filter(i => i >= 0);
      // (spread: the tool's arrays are of the vm's realm)
      assert.deepStrictEqual(
        [...gOrd],
        [...gOrd].sort((a, b) => a - b),
        `${f.id}: its genera in order`
      );
      f.gens.forEach(g => {
        const o = g.sp.map(s => fr.species.indexOf(s.id)).filter(i => i >= 0);
        assert.deepStrictEqual(
          [...o],
          [...o].sort((a, b) => a - b),
          `${g.id}: its species in order`
        );
        g.sp.forEach(s => assert.strictEqual(s.genus || 'g:' + s.name.split(' ')[0], g.id));
      });
    });
  // A PDF section other than the family's scientific names is said (the Groupers: Serranidae in the PDF).
  const grp = I.fams.find(f => f.sci.includes('Epinephelidae'));
  if (grp) assert.ok(grp.secs.length, 'the PDF section of the groupers is shown');
});

test('the search finds a species by any of its names, its genus or its family; words in any case, accents off', () => {
  const {K} = load(),
    I = K.index(F),
    W = new Map();
  I.fams.forEach(f => f.gens.forEach(g => g.sp.forEach(s => W.set(s.id, K.words(s, f, F)))));
  const find = q => I.sp.filter(s => K.hit(W.get(s.id), q)).map(s => s.name);
  const pick = n => F.species.find(s => s.pdf && s.name === n);
  // The PDF's name, a part of each word, in capitals.
  const ct = pick('Chromis ternatensis');
  assert.ok(ct && find('chromis tern').includes(ct.name) && find('CHROMIS  Ternatensis').includes(ct.name));
  // WoRMS's accepted name finds the PDF's species (rule S2: both accepted when typed), and a WoRMS synonym too.
  const moved = F.species.find(s => s.pdf && s.now && s.now !== s.name);
  assert.ok(moved && find(moved.now).includes(moved.name), `${moved.now} finds ${moved.name}`);
  const syn = (F.ref[ct.ref].syn || [])[0];
  if (syn) assert.ok(find(syn).includes(ct.name), `${syn} finds ${ct.name}`);
  // Its common names.
  const cm = F.species.find(s => s.pdf && s.common);
  assert.ok(find(cm.common.toLowerCase()).includes(cm.name), cm.common);
  // A family's name finds all its species; its scientific name too.
  const fam = I.fams.find(f => f.sheet && f.n > 3);
  const all = fam.gens.flatMap(g => g.sp.map(s => s.name));
  all.forEach(n => assert.ok(find(fam.name).includes(n), `${fam.name} finds ${n}`));
  all.forEach(n => assert.ok(find(fam.sci[0]).includes(n), `${fam.sci[0]} finds ${n}`));
  // Nothing for a word no name has; everything for no word.
  assert.deepStrictEqual(find('zzqx'), []);
  assert.strictEqual(find('  ').length, I.sp.length);
  // A word matches the start of a word only ("tern" is not inside another word's middle).
  assert.ok(!find('romis').includes(ct.name));
});

test('wiring: a Lab tool, cached by the service worker, of the subject that declares it, never graduated (rule U13)', () => {
  const {tool} = load();
  assert.strictEqual(tool.id, 'fishkey');
  const lab = read('proto/lab.js'),
    files = lab.match(/files: \[([\s\S]*?)\]/)[1],
    sw = read('sw.js');
  assert.ok(/'fishkey'/.test(files), 'LAB.files lists it');
  assert.ok(/\n\s+'fishkey',\n/.test(sw.slice(sw.indexOf('Lab prototypes'))), "sw.js's Lab list holds it");
  const grad = lab.match(/const GRADUATED = \{([^}]*)\}/)[1];
  assert.ok(!/fishkey/.test(grad), "not graduated: only with Pierre's OK (rule U13)");
  // One subject declares it (app.js UNITS emkey), never a test on the subject (rule S1).
  assert.strictEqual((read('app.js').match(/^\s+emkey: true,$/gm) || []).length, 1);
  assert.ok(/SUBJECTS\.find\(s => \(UNITS\[s\.id\] \|\| \{\}\)\.emkey\)/.test(read('proto/fishkey.js')));
});
