require('./slot.js').testGuard();
// The fish juveniles per species (Pierre, 2026-11-19, Q435: four classes become a per-species label for the analyses,
// with no effect on the game; 15:35: source every juvenile that external sources describe): tools/fish_juveniles.json,
// built into fish.json species jv {c, line, src, look} by tools/build_fish.py (juveniles), the line shown on the species
// sheet with its sources (learn.js juvNote, shared with the family sheet's juvenile note). The label never reaches the
// draw, the ease or the judging.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  os = require('os'),
  path = require('path'),
  vm = require('vm'),
  {spawnSync} = require('child_process'),
  block = require('./block.js');
const ROOT = path.join(__dirname, '..'),
  src = f => fs.readFileSync(path.join(ROOT, f), 'utf8'),
  json = f => JSON.parse(src(f));
const F = json('fish.json'),
  J = json('tools/fish_juveniles.json'),
  BY = Object.fromEntries(F.species.map(s => [s.name, s])),
  SID = Object.fromEntries(F.species.map(s => [s.id, s])),
  CLS = ['off', 'finer', 'bold', 'like'];

test('tools/fish_juveniles.json: four classes, every class by source and every line with a quoted https source', () => {
  assert.deepStrictEqual(Object.keys(J.classes).sort(), [...CLS].sort());
  const n = Object.keys(J.species).length;
  assert.ok(n >= 200, `${n} species`);
  for (const [name, x] of Object.entries(J.species)) {
    assert.ok(BY[name] && BY[name].circle, `${name}: a game species`);
    assert.ok(x.cls || x.line, `${name}: a class or a line`);
    if (x.cls) assert.ok(CLS.includes(x.cls), `${name}: ${x.cls}`);
    if (x.by === 'source' || x.line) {
      assert.ok((x.src || []).length, `${name}: a source`);
      for (const r of x.src) {
        assert.match(r.u, /^https:\/\//, `${name}: ${r.u}`);
        assert.ok(r.t && r.q && r.q.trim().length > 8, `${name}: a title and its quote`);
      }
    }
    if (x.by === 'entry') assert.match(x.entry, /^t\d\d$/, `${name}: the entry it takes its class from`);
  }
  for (const name of J.none) assert.ok(BY[name] && !J.species[name], `none: ${name}`);
});

test('fish.json species jv: as the file gives it, the look-alikes game species present in the Philippines', () => {
  const withJv = F.species.filter(s => s.jv);
  assert.strictEqual(withJv.length, Object.keys(J.species).length);
  for (const s of withJv) {
    const x = J.species[s.name];
    assert.strictEqual(s.jv.c, x.cls || undefined, s.name);
    assert.strictEqual(s.jv.line, x.line || undefined, s.name);
    if (s.jv.line)
      assert.deepStrictEqual(
        s.jv.src.map(r => r.u),
        [...new Set(x.src.map(r => r.u))],
        s.name
      );
    if (s.jv.look) {
      const L = SID[s.jv.look];
      assert.ok(L && L.circle && L.present.ph && L.name === x.look, `${s.name}: look ${s.jv.look}`);
    }
    // never an entry class (A, B, C, mixed, ns): those stay the draw's (fish.json juv)
    assert.ok(!s.jv.c || CLS.includes(s.jv.c));
  }
  // the counts as the PR states them (a harmonised class for 189 species; 57 described, not rated)
  const by = {};
  for (const s of withJv) by[s.jv.c || 'none'] = (by[s.jv.c || 'none'] || 0) + 1;
  assert.deepStrictEqual(by, {off: 38, finer: 40, bold: 32, like: 79, none: 57});
});

test('the build stops on a line without a source, a look-alike out of the game, a class by entry not its entry', () => {
  const run = m => {
    const tmp = path.join(os.tmpdir(), `fishjuv.${process.pid}.${Math.random().toString(36).slice(2)}.json`);
    fs.writeFileSync(tmp, JSON.stringify(m));
    try {
      const r = spawnSync('python3', [path.join(ROOT, 'tools/build_fish.py'), '--regroup', '--check', '--juveniles', tmp], {
        cwd: ROOT,
        encoding: 'utf8'
      });
      return {status: r.status, out: r.stdout + r.stderr};
    } finally {
      fs.unlinkSync(tmp);
    }
  };
  assert.strictEqual(run(J).status, 0, 'the file as it is passes');
  const edit = (name, f) => {
    const m = JSON.parse(JSON.stringify(J));
    f(m.species[name]);
    return run(m);
  };
  let r = edit('Iniistius pavo', x => delete x.src);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.out, /Iniistius pavo: a class by source needs a sourced quote/);
  r = edit('Acanthurus olivaceus', x => (x.src = []));
  assert.match(r.out, /Acanthurus olivaceus: line without a sourced quote/);
  r = edit('Acanthurus pyroferus', x => (x.look = 'Centropyge vrolikii'));
  assert.match(r.out, /look Centropyge vrolikii: not a game species present in the Philippines/);
  r = edit('Chlorurus spilurus', x => (x.cls = 'like'));
  assert.match(r.out, /Chlorurus spilurus: a class by entry is its entry's \(off, t08\)/);
  r = edit('Acanthurus olivaceus', x => (x.cls = 'B'));
  assert.match(r.out, /cls is one of off, finer, bold, like/);
  // a line naming a species of a game genus that is not a game species present in the Philippines (rule C6)
  r = edit('Anyperodon leucogrammicus', x => (x.line = 'Blue and gold stripes, like Halichoeres purpurescens.'));
  assert.match(r.out, /its line names Halichoeres purpurescens, not a game species present in the Philippines/);
});

test('no effect on the game: the draw, the ease and the judging never read jv; the photos in play are the same without it', () => {
  // Only the species sheet reads it (learn.js) and only the build writes it (tools/build_fish.py).
  const READ = /\.jv\b|\[['"]jv['"]\]|\bjv\s*:|\.get\(['"]jv['"]\)/;
  const files = [
    ...fs.readdirSync(ROOT).filter(f => /\.js$/.test(f)),
    ...fs
      .readdirSync(path.join(ROOT, 'tools'))
      .filter(f => /\.(py|js)$/.test(f))
      .map(f => 'tools/' + f)
  ].filter(f => !['learn.js', 'tools/build_fish.py'].includes(f));
  assert.ok(files.includes('model.js') && files.includes('core.js') && files.includes('tools/fish_judge.py'));
  for (const f of files) assert.ok(!READ.test(src(f)), `${f} reads the juvenile label`);
  // tools/fish_game.py plan (every photo in play with its ease and tags, the judging's caps) from fish.json as it is,
  // without jv, and with every jv another class: the same.
  const r = spawnSync('python3', [path.join(__dirname, 'fishjuv_noeffect.py')], {cwd: ROOT, encoding: 'utf8'});
  assert.strictEqual(r.status, 0, r.stderr);
  const o = JSON.parse(r.stdout.trim().split('\n').pop());
  assert.ok(o.same, 'the plan changed with the label');
  assert.ok(o.labels > 200 && o.size > 1e6, JSON.stringify(o));
});

test('the species sheet shows the juvenile line with its numbered sources, one helper with the family note (rule S1)', () => {
  const learn = src('learn.js'),
    ctx = {esc: s => String(s).replace(/</g, '&lt;'), safeUrl: u => u};
  vm.runInNewContext(
    block(learn, 'const juvNote = ', "\n    .join('')}${extra}</p>`;", {through: 1, file: 'learn.js'}) + '\nthis.juvNote = juvNote;',
    ctx
  );
  const s = BY['Iniistius pavo'],
    h = ctx.juvNote(s.jv.line, s.jv.src, {lead: '<b>Juvenile:</b> '});
  assert.ok(h.startsWith('<p class="fjuv"><b>Juvenile:</b> Small razorfish'), h);
  assert.strictEqual((h.match(/class="srcn"/g) || []).length, s.jv.src.length);
  assert.match(h, /href="https:\/\/www\.fishbase\.se\/summary\/Iniistius-pavo\.html"[^>]*title="FishBase">\[1\]/);
  // the family note's URL list still numbers "Source n"
  assert.match(ctx.juvNote('x', ['https://a.example/p']), /title="Source 1">\[1\]<\/a><\/p>$/);
  const sp = block(learn, 'function fishSpecies(s) {', '\n}\n');
  assert.ok(sp.includes("${s.jv && s.jv.line ? juvNote(s.jv.line, s.jv.src, {lead: '<b>Juvenile:</b> '}) : ''}"));
  assert.ok(learn.includes("f.juv && f.juv.note ? juvNote(f.juv.note, f.juv.src, {extra: esrcIn(f, 'juv.note')}) : ''"));
});
