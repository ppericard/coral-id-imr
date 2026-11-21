require('./slot.js').testGuard();
// tools/fish_phases_site.py: fish-phases.json (what the Lab's Life stages matched reads) is what the cited list gives, kept to the
// species a source documents an adult stage for, with each verdict's quote and sources (rule C2) and no species whose sources
// disagree (rule C5: the game never picks a side). Made-up lists in a temporary folder, and the real file against the real list.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  os = require('os'),
  path = require('path'),
  {spawnSync} = require('child_process');

const ROOT = path.join(__dirname, '..'),
  TOOL = path.join(ROOT, 'tools', 'fish_phases_site.py');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'phasesite-'));
test.after(() => fs.rmSync(dir, {recursive: true, force: true}));
const run = (...a) => spawnSync('python3', ['-B', TOOL, ...a], {encoding: 'utf8', timeout: 20000});
const entry = (sp, o = {}) => ({
  juv: 'unknown',
  sub: 'unknown',
  ip_tp: 'unknown',
  sex: 'unknown',
  src: {},
  quote: {},
  note: {},
  sp,
  family: 'f:X',
  photos_in_play: {},
  ...o
});
const list = o => ({_doc: 'a list', ...o});
const build = doc => {
  const f = path.join(dir, 'list.json');
  fs.writeFileSync(f, JSON.stringify(doc));
  const r = run('--src', f);
  return {...r, json: r.status === 0 ? JSON.parse(r.stdout) : null};
};

test('a species with a documented adult stage goes in, with its quotes and sources; the others and the `no` verdicts stay out', () => {
  const r = build(
    list({
      'Sex yes': entry('s1', {
        sex: 'yes',
        juv: 'yes',
        src: {
          sex: 'Reef Life Survey <https://reeflifesurvey.com/a/> | FishBase Morphology table (snapshot)',
          juv: 'Fishes of Australia <https://fishesofaustralia.net.au/x>'
        },
        quote: {sex: 'Male blue. | Female yellow.', juv: 'Juveniles barred.'}
      }),
      'Phase yes': entry('s2', {
        ip_tp: 'yes',
        src: {ip_tp: 'FishBase <https://www.fishbase.se/s> Short description; FishBase <https://www.fishbase.se/s>'},
        quote: {ip_tp: 'Terminal phase green.'}
      }),
      'Juvenile only': entry('s3', {juv: 'yes', src: {juv: 'A <https://a.org/>'}, quote: {juv: 'Barred.'}}),
      'No stages': entry('s4', {sex: 'no', juv: 'no'}),
      'Two sources': entry('s6', {
        sex: 'yes',
        src: {
          sex: 'FishBase <https://www.fishbase.se/c> Short description; Reef Life Survey <https://reeflifesurvey.com/c/>; FishBase (Ref. 1)'
        },
        quote: {sex: 'Females red. | Male blue.'}
      }),
      'Unknown': entry('s5')
    })
  );
  assert.strictEqual(r.status, 0, r.stderr);
  assert.deepStrictEqual(Object.keys(r.json.species), ['s1', 's2', 's6']);
  const a = r.json.species.s1;
  // every quote, in the list's order: each may be about another stage (proto/lifestages.js lsQuote says the one naming it)
  assert.deepStrictEqual(a.sex.q, ['Male blue.', 'Female yellow.']);
  assert.deepStrictEqual(a.juv.q, ['Juveniles barred.']);
  assert.deepStrictEqual(a.sex.s, [
    {t: 'Reef Life Survey', u: 'https://reeflifesurvey.com/a/'},
    {t: 'FishBase Morphology table (snapshot)', u: ''}
  ]);
  assert.deepStrictEqual(a.juv.s, [{t: 'Fishes of Australia', u: 'https://fishesofaustralia.net.au/x'}]);
  assert.ok(!('ip_tp' in a), 'a verdict that is not yes is kept out');
  assert.deepStrictEqual(r.json.species.s2.ip_tp.s, [{t: 'FishBase', u: 'https://www.fishbase.se/s'}], 'each address once');
  // sources the list separates with "; " are each kept (the visual check of #1388: Reef Life Survey after "FishBase <…> Short
  // description;" was dropped, so its sentence was cited to FishBase)
  assert.deepStrictEqual(r.json.species.s6.sex.s, [
    {t: 'FishBase', u: 'https://www.fishbase.se/c'},
    {t: 'Reef Life Survey', u: 'https://reeflifesurvey.com/c/'},
    {t: 'FishBase (Ref. 1)', u: ''}
  ]);
  assert.strictEqual(r.json.species.s2.name, 'Phase yes');
});

test('a species whose sources disagree is left out whole, in a `conflict` or in a note that says so (rule C5)', () => {
  const r = build(
    list({
      Conflict: entry('s1', {sex: 'conflict', src: {sex: 'A <https://a.org/>'}, quote: {sex: 'q'}}),
      Noted: entry('s2', {
        sex: 'yes',
        src: {sex: 'A <https://a.org/>'},
        quote: {sex: 'q'},
        note: {sex: 'sources disagree on the female pattern'}
      }),
      Juvenile: entry('s3', {sex: 'yes', juv: 'conflict', src: {sex: 'A <https://a.org/>'}, quote: {sex: 'q'}}),
      Fine: entry('s4', {sex: 'yes', src: {sex: 'A <https://a.org/>'}, quote: {sex: 'q'}})
    })
  );
  assert.strictEqual(r.status, 0, r.stderr);
  assert.deepStrictEqual(Object.keys(r.json.species), ['s4']);
});

test('a yes with no quote or no source stops the build (rule C2)', () => {
  assert.notStrictEqual(build(list({X: entry('s1', {sex: 'yes', src: {sex: 'A <https://a.org/>'}})})).status, 0);
  assert.notStrictEqual(build(list({X: entry('s1', {sex: 'yes', quote: {sex: 'q'}})})).status, 0);
});

test('fish-phases.json is what tools/fish_phases_site.py gives from tools/fish_phases.json, and holds only what a source documents', () => {
  const r = run('--check');
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  const f = JSON.parse(fs.readFileSync(path.join(ROOT, 'fish-phases.json'), 'utf8')),
    L = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'fish_phases.json'), 'utf8')),
    sp = new Map(
      Object.entries(L)
        .filter(([k]) => !k.startsWith('_'))
        .map(([k, e]) => [e.sp, [k, e]])
    );
  assert.ok(Object.keys(f.species).length >= 50, 'few species: ' + Object.keys(f.species).length);
  for (const [id, x] of Object.entries(f.species)) {
    const [name, e] = sp.get(id);
    assert.strictEqual(x.name, name);
    assert.ok(x.sex || x.ip_tp, `${name}: no adult stage`);
    if (x.sex) assert.strictEqual(e.sex, 'yes', name);
    if (x.ip_tp) assert.strictEqual(e.ip_tp, 'yes', name);
    if (x.juv) assert.strictEqual(e.juv, 'yes', name);
    for (const v of [x.juv, x.sex, x.ip_tp].filter(Boolean))
      assert.ok(
        Array.isArray(v.q) && v.q.length && v.q.every(Boolean) && v.s.length && v.s.every(s => s.t),
        `${name}: a verdict with no quote or source`
      );
    // every address the list gives for a verdict is said (a quote may come from any of them), each once
    for (const k of ['juv', 'sex', 'ip_tp'].filter(k => x[k])) {
      const urls = [...new Set((String(e.src[k]).match(/<https:\/\/[^>\s]+>/g) || []).map(u => u.slice(1, -1)))];
      assert.deepStrictEqual(x[k].s.map(s => s.u).filter(Boolean), urls, `${name} ${k}`);
    }
  }
});
