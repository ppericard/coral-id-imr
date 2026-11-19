require('./slot.js').testGuard();
// The fish species' own ID marks, adults, agent drafts until Pierre validates them (ROADMAP "Fish sheets at three
// levels"): tools/fish_species_marks.json, built into fish.json species marks, msrc, mby and mdraft by
// tools/build_fish.py add_families (species_marks), shown on the species sheet by learn.js marksBox, the genus marks'
// box, with its "Draft" label. Every line has a source and the page's words it rests on (rule C2); a species named is a
// game species of its genus, a look-alike one confirmed in the Philippines (rule C6).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  os = require('os'),
  path = require('path'),
  vm = require('vm'),
  {spawnSync} = require('child_process'),
  block = require('./block.js');
const C = require('../core.js');
const ROOT = path.join(__dirname, '..'),
  src = f => fs.readFileSync(path.join(ROOT, f), 'utf8'),
  json = f => JSON.parse(src(f));
const F = json('fish.json'),
  M = json('tools/fish_species_marks.json'),
  APP = src('app.js'),
  LEARN = src('learn.js');
const BY = Object.fromEntries(F.species.map(s => [s.name, s])),
  GAME = F.species.filter(s => s.circle);
// The public pages the species marks were written from, each by https.
const HOSTS = /^https:\/\/(www\.fishbase\.se|fishesofaustralia\.net\.au|reeflifesurvey\.com)\//;
const copy = o => JSON.parse(JSON.stringify(o));

test('every line has its sources, each a src key and the words of the page it rests on; every source is cited', () => {
  for (const [k, s] of Object.entries(M.src)) {
    assert.ok(typeof s.t === 'string' && s.t.split(',')[0].trim(), `${k}: a label, its short name before a comma`);
    assert.match(s.u, HOSTS, `${k}: ${s.u}`);
  }
  const used = new Set();
  const refs = (n, what, rr) => {
    assert.ok(Array.isArray(rr) && rr.length, `${n}: ${what} has no source`);
    for (const [key, words] of rr) {
      assert.ok(M.src[key], `${n}: ${what} cites ${key}, not a source of src`);
      assert.ok(typeof words === 'string' && words.trim().length > 3, `${n}: ${what} gives no words of ${key}`);
      used.add(key);
    }
  };
  for (const [n, x] of Object.entries(M.species)) {
    for (const [words, rr] of x.marks) refs(n, words, rr);
    for (const [other, rr] of x.look || []) refs(n, other, rr);
    if (x.ease) refs(n, 'ease', [x.ease]);
  }
  assert.deepStrictEqual([...used].sort(), Object.keys(M.src).sort(), 'every source is cited');
});

test('every game species has its marks or a reason, never both; the file names game species only', () => {
  for (const s of GAME) {
    const has = !!M.species[s.name],
      why = M.none[s.name];
    assert.ok(has !== !!why, `${s.name}: marks or a reason in none, one of them`);
  }
  for (const n of [...Object.keys(M.species), ...Object.keys(M.none)]) assert.ok(BY[n] && BY[n].circle, `${n}: a game species`);
  for (const [n, why] of Object.entries(M.none)) assert.ok(typeof why === 'string' && why.trim(), n);
  // Most of them have marks.
  assert.ok(Object.keys(M.species).length > GAME.length * 0.8);
});

test('built into fish.json as written: marks, msrc each source once, mby, mdraft while the file says draft', () => {
  assert.strictEqual(M.draft, true, 'agent drafts until Pierre validates them');
  for (const [n, x] of Object.entries(M.species)) {
    const s = BY[n];
    assert.deepStrictEqual(
      s.marks,
      x.marks.map(m => m[0]),
      n
    );
    assert.strictEqual(s.mdraft, 1, n);
    assert.strictEqual(new Set(s.msrc.map(e => e.u + e.t)).size, s.msrc.length, `${n}: each source once`);
    x.marks.forEach(([, rr], i) =>
      assert.deepStrictEqual(
        s.mby.marks[i].map(j => s.msrc[j]),
        [...new Map(rr.map(([k]) => [k, {t: M.src[k].t, u: M.src[k].u}])).values()],
        `${n}: mark ${i}`
      )
    );
  }
  // The look-alikes and the ease words stay in the file: not shown yet.
  for (const s of F.species) {
    if (!M.species[s.name]) for (const k of ['marks', 'msrc', 'mby', 'mdraft']) assert.ok(!(k in s), `${s.name}: ${k}`);
    assert.ok(!('look' in s) && !('ease' in s), s.name);
  }
});

test('a mark is short and seen on a photo; a species named is a game species of its genus; a look-alike is found in the Philippines (C3, C6)', () => {
  for (const [n, x] of Object.entries(M.species)) {
    const g = n.split(' ')[0];
    assert.ok(x.marks.length >= 1 && x.marks.length <= 3, `${n}: 1 to 3 marks`);
    for (const [words] of x.marks) {
      assert.ok(words.length <= 80, `${n}: '${words}' is long for a mark`);
      assert.doesNotMatch(words, /\d/, `${n}: '${words}': a count is not a photo cue`);
      for (const [, ini, ep] of words.matchAll(/\b([A-Z])\. ([a-z]+)/g)) {
        const s = BY[`${g} ${ep}`];
        assert.ok(ini === g[0] && s && s.circle, `${n}: '${ini}. ${ep}' is not a game species of ${g}`);
      }
    }
    for (const [other] of x.look || []) {
      const s = BY[other];
      assert.ok(s && s.present && s.present.ph && other !== n, `${n}: look-alike ${other} not confirmed in the Philippines`);
    }
  }
});

test('the build stops on a line without a source, a number, a long line, another genus named, a look-alike from abroad, a species left out', () => {
  const run = m => {
    const tmp = path.join(os.tmpdir(), `spmarks.${process.pid}.${Math.random().toString(36).slice(2)}.json`);
    fs.writeFileSync(tmp, JSON.stringify(m));
    try {
      const r = spawnSync('python3', [path.join(ROOT, 'tools/build_fish.py'), '--regroup', '--check', '--spmarks', tmp], {
        cwd: ROOT,
        encoding: 'utf8'
      });
      return {status: r.status, out: r.stdout + r.stderr};
    } finally {
      fs.unlinkSync(tmp);
    }
  };
  assert.strictEqual(run(M).status, 0, 'the file as it is passes');
  const n = 'Pomacentrus moluccensis',
    k = M.species[n].marks[0][1][0][0];
  const stops = (edit, re) => {
    const m = copy(M);
    edit(m);
    const r = run(m);
    assert.notStrictEqual(r.status, 0, String(re));
    assert.match(r.out, re);
  };
  stops(m => (m.species[n].marks[0][1] = []), /has no source/);
  stops(m => (m.species[n].marks[0][1] = [[k, '']]), /a source is \[a key of src, the page's words it rests on\]/);
  stops(m => (m.species[n].marks[0][0] = 'Two black spots at the pectoral fin base'.replace('Two', '2')), /a mark with a number/);
  stops(m => (m.species[n].marks[0][0] = 'A small blue ear spot '.repeat(5).trim()), /a line of at most 80 characters/);
  stops(m => (m.species[n].marks[0][0] = 'Brighter than C. viridis'), /'C\. viridis' is not a game species of Pomacentrus/);
  stops(m => (m.species[n].marks[0][0] = 'Brighter than Chromis viridis'), /'Chromis viridis' is not a game species of Pomacentrus/);
  stops(m => (m.species[n].look = [['Pomacentrus limosus', [[k, 'a made-up quote']]]]), /look-alike Pomacentrus limosus/);
  stops(m => delete m.species[n], /game species with neither marks nor a reason in none: .*Pomacentrus moluccensis/);
  stops(m => (m.none[n] = 'both'), /both marks and a reason in none/);
  stops(m => (m.src['made-up'] = {t: 'Made up', u: 'https://reeflifesurvey.com/'}), /sources never used: made-up/);
});

test('the species sheet: its marks in the genus marks box, each line with its source numbers, labelled a draft', () => {
  const T = C.treeSheets(F);
  const c2 = {
    treeGo: id =>
      T.go(
        C.sheetIdOf(
          C.SUBJECTS.find(s => s.sheets),
          id
        )
      ),
    repBtn: () => '<button>report</button>',
    esrcP: () => ''
  };
  vm.createContext(c2);
  vm.runInContext(
    [
      block(APP, 'const esc = ', '\n'),
      block(APP, 'const safeUrl = ', '\n};\n', {through: 1}),
      block(LEARN, 'const genMarks = ', '\n'),
      block(LEARN, 'const marksBox = ', '\n};\n', {through: 1}),
      'this.genMarks = genMarks; this.marksBox = marksBox;'
    ].join('\n'),
    c2
  );
  const s = BY['Pomacentrus moluccensis'],
    h = c2.marksBox(s);
  assert.ok(
    s.marks.every(m => h.includes(m)),
    'every mark'
  );
  assert.match(h, /ID marks of <i>Pomacentrus moluccensis<\/i> <span class="mdraft">Draft, not yet reviewed<\/span>/);
  assert.strictEqual((h.match(/class="srcn"/g) || []).length, s.mby.marks.flat().length, 'one number per source of each line');
  assert.ok(h.includes(s.msrc[0].u));
  // Not a draft once validated (no mdraft): no label; no marks: nothing.
  assert.doesNotMatch(c2.marksBox({...s, mdraft: undefined}), /mdraft/);
  assert.strictEqual(c2.marksBox(BY['Pomacentrus armillatus']), '');
  // A genus's marks go through the same box, on the sheet the genus opens only.
  const g = F.genera.find(x => x.name === 'Cheilinus');
  assert.strictEqual(c2.genMarks(g, 'g:Cheilinus'), c2.marksBox(g));
  assert.strictEqual(c2.genMarks(g, 'f:Wrasses'), '');
  assert.doesNotMatch(c2.marksBox(g), /mdraft/, 'the genus marks carry no draft flag');
  assert.ok(block(LEARN, 'function fishSpecies(s) {', '\n}\n').includes('${marksBox(s)}'));
});
