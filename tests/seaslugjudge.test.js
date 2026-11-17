require('./slot.js').testGuard();
// Sea slug photo judging (judging/SEASLUG.md; Pierre, 2026-11-15, Q369, Q373, Q377 and #970's egg rule): the fish's
// judging tools with a subject (tools/judging_fish.py --subject seaslug, tools/fish_judge.py RUBRICS "seaslug"), the fish
// left as they were. The rubric's code and caps (a dorsal view a good view, ventral capped, the juvenile cap, f and w
// capping nothing), the judging files' check (keep optional, the egg rule, no phase or box), the import into suggest.json
// "seaslug" beside the fish's. Offline: made-up fixtures in a temporary folder; nothing is downloaded. Needs python3.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  os = require('os'),
  path = require('path'),
  {execFileSync, spawnSync} = require('child_process');
const ROOT = path.join(__dirname, '..');
const J = code =>
  JSON.parse(
    execFileSync('python3', ['-c', `import sys, json; sys.path.insert(0, ${JSON.stringify(path.join(ROOT, 'tools'))})\n${code}`], {
      cwd: ROOT,
      encoding: 'utf8'
    })
  );

test('the sea slug rubric: the fish code shape; a dorsal view caps nothing, a ventral one 3; juveniles 2; f and w cap nothing', () => {
  const out = J(`from fish_judge import cap, with_flag, RUBRICS
S = lambda c: list(cap(c, False, subject='seaslug'))
F = lambda c: list(cap(c, False))
ok = lambda s, c: bool(RUBRICS[s]['code'].match(c))
print(json.dumps({
  'slug': [S('d1g0sl15'), S('p1g0sl15'), S('o1g0sl15'), S('v1g0sl15'), S('h1g0sl15'), S('d0g0sl15'), S('d1g0sl1j5'),
           S('d1g0sl1f5'), S('d1g0sl1w5'), S('d1g0sl1c5'), S('d1g2sl15'), S('d1g3sl15'), S('d1g0slx5'), S('d1d0sl15')],
  'fish': [F('d1g0sl15'), F('p1g0sl1j5')],
  'codes': [ok('seaslug', 'd1g0sl1jcawf4'), ok('seaslug', 'd1n0sl15'), ok('seaslug', 'd1g0slm5'), ok('seaslug', 'd1g0sl1p5'),
            ok('fish', 'v1g0sl15'), ok('fish', 'p1g0sl1f5'), ok('fish', 'p1n0slm5')],
  'flag': [with_flag('d1g0sl1w4', 'j', 'seaslug'), with_flag('d1g0sl1j4', 'f', 'seaslug'), with_flag('p1g0sl1w4', 'j')]}))`);
  assert.deepStrictEqual(out.slug, [
    [5, 'd1g0sl1'], // dorsal: a good view for a sea slug
    [5, 'p1g0sl1'],
    [5, 'o1g0sl1'],
    [3, 'v1g0sl1'], // ventral (the foot)
    [3, 'h1g0sl1'],
    [3, 'd0g0sl1'], // partial
    [2, 'd1g0sl1j'], // a juvenile: no juvenile class for sea slugs
    [5, 'd1g0sl1f'], // rhinophores or gills hidden: the ease scale's, not a cap
    [5, 'd1g0sl1w'], // watermark (Q373)
    [3, 'd1g0sl1c'],
    [3, 'd1g2sl1'],
    [2, 'd1g3sl1'],
    [2, 'd1g0slx'],
    [5, 'd1d0sl1'] // dim light: a mild shortfall the judge reads, no cap
  ]);
  assert.deepStrictEqual(
    out.fish,
    [
      [3, 'd1g0sl1'],
      [2, 'p1g0sl1j']
    ],
    'the fish caps unchanged: a top view at most 3'
  );
  // No night livery, no legacy count m, no tool flag typed for sea slugs; the fish never take v or f.
  assert.deepStrictEqual(out.codes, [true, false, false, false, false, false, true]);
  assert.deepStrictEqual(out.flag, ['d1g0sl1jw4', 'd1g0sl1jf4', 'p1g0sl1jw4']);
});

// A made-up repository: two sea slug species (taxon ids 900 and 901), their candidates, a curation.json whose fish part
// names a sea slug photo (never read for them), a suggest.json holding fish judgements.
function world(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'slugjudge-'));
  const w = (f, d) => {
    fs.mkdirSync(path.dirname(path.join(dir, f)), {recursive: true});
    fs.writeFileSync(path.join(dir, f), JSON.stringify(d, null, 1) + '\n');
  };
  const c = (k, i, o) => ({
    f: `seaslug-${k}-cand-${i}`,
    o: `https://www.inaturalist.org/observations/${o}`,
    src: 'x',
    t: 'Slugus',
    loc: 'ph'
  });
  w('tools/seaslugs.json', {
    species: [
      {name: 'Slugus primus', inat: 900, circle: 1},
      {name: 'Slugus secundus', inat: 901, circle: 1}
    ]
  });
  w('seaslug-cand.json', {v: 1, cand: {900: [c(900, 1, 11), c(900, 2, 12), c(900, 3, 13)], 901: [c(901, 4, 14)]}});
  w('curation.json', {fish: {seen: {'seaslug-900-cand-1': 1}, add: {'seaslug-900-cand-2': 's001'}}});
  w('suggest.json', {
    v: 1,
    by: {s001: {fish: {by: 'claude', at: '2026-11-01', n: 1}}},
    fish: {'fish-s001-cand-5': {jt: 'p1g0sl1', e: 5, k: 'best'}}
  });
  w('fish.json', {species: [], teach: []});
  for (const [f, d] of Object.entries(files)) w(f, d);
  return dir;
}
const RUN = (dir, code) =>
  J(`import judging_fish as JF
JF.ROOT = ${JSON.stringify(dir)}
JF.use('seaslug')
${code}`);

test('the judging files: keep optional (one photo per observation), the egg rule, no phase or box; the fish curation never read', () => {
  const dir = world({
    'judging/seaslug/900.json': {
      photos: {
        'seaslug-900-cand-1': {code: 'd1g0sl15'},
        'seaslug-900-cand-2': {code: 'p1g0sm1j4', keep: 'best', crop: [0.1, 0.1, 0.9, 0.9], unsure: ['code'], note: 'juvenile?'},
        'seaslug-900-cand-3': {egg: true, note: 'a ribbon, no animal'}
      }
    },
    'judging/seaslug/901.json': {
      photos: {
        'seaslug-901-cand-4': {code: 'p1n0slm15', phase: 'male', bb: [0, 0, 1, 1], unsure: ['egg']}
      }
    }
  });
  const out = RUN(
    dir,
    `E1, j = JF.check('900')
E2, _ = JF.check('901')
bad = {'photos': {'seaslug-901-cand-4': {'egg': True, 'code': 'd1g0sl15'}}}
JF.load, real = (lambda p, d=None: bad if p.endswith('901.json') else real(p, d)), JF.load
E3, _ = JF.check('901')
print(json.dumps([E1, [JF.entry('900', x) for x in j['photos'].values()], E2, E3, [p['f'] for p in JF.cands('900')], JF.ids(['Slugus secundus', '900'])]))`
  );
  const [E1, entries, E2, E3, waiting, ids] = out;
  assert.deepStrictEqual(E1, []);
  assert.deepStrictEqual(entries, [
    {jt: 'd1g0sl1', e: 5, k: 'best'}, // no keep: best, the observation's one photo
    {jt: 'p1g0sm1j', e: 2, k: 'best', c: [0.1, 0.1, 0.9, 0.9], u: ['code'], n: 'juvenile?'},
    {egg: 1, n: 'a ribbon, no animal'} // never in play
  ]);
  const bad = E2.join('\n');
  assert.match(bad, /code must follow judging\/SEASLUG.md "Tags" \(e\.g\. d1g0sl15\)/);
  assert.match(bad, /unknown fields \['bb', 'phase'\]/);
  assert.match(bad, /unsure must be a list of field names/, 'an egg photo is never a doubt: one that cannot be told apart goes');
  assert.match(E3.join('\n'), /an egg-mass photo is \{"egg": true\} \(a note at most\)/);
  // An observation whose only photo is an egg mass needs no best (E1 passes with cand-3 egg only).
  assert.deepStrictEqual(waiting, ['seaslug-900-cand-1', 'seaslug-900-cand-2', 'seaslug-900-cand-3'], "the fish curation is the fish's");
  assert.deepStrictEqual(ids, ['901', '900'], 'a scientific name gives its taxon id');
  fs.rmSync(dir, {recursive: true, force: true});
});

test('the import writes suggest.json "seaslug" beside the fish judgements, which stay as they were; codes re-applies a re-judge', () => {
  const dir = world({
    'judging/seaslug/900.json': {
      photos: {
        'seaslug-900-cand-1': {code: 'd1g0sl15'},
        'seaslug-900-cand-2': {code: 'v1g0sl15'},
        'seaslug-900-cand-3': {egg: true}
      }
    }
  });
  const before = JSON.parse(fs.readFileSync(path.join(dir, 'suggest.json'), 'utf8'));
  const out = RUN(
    dir,
    `import contextlib, io
try:
    with contextlib.redirect_stdout(io.StringIO()):
        JF.cmd_import(['900'], False, 'claude')
except SystemExit as e:
    code = e.code
print(json.dumps(code))`
  );
  assert.strictEqual(out, 0);
  const S = JSON.parse(fs.readFileSync(path.join(dir, 'suggest.json'), 'utf8'));
  assert.deepStrictEqual(S.fish, before.fish);
  assert.deepStrictEqual(S.by.s001, before.by.s001);
  assert.deepStrictEqual(S.seaslug, {
    'seaslug-900-cand-1': {jt: 'd1g0sl1', e: 5, k: 'best'},
    'seaslug-900-cand-2': {jt: 'v1g0sl1', e: 3, k: 'best'},
    'seaslug-900-cand-3': {egg: 1}
  });
  assert.strictEqual(S.by['900'].seaslug.n, 3);
  // A re-judge: cand-3 is the animal after all, cand-1 an egg mass.
  fs.writeFileSync(
    path.join(dir, 'judging/seaslug/900.json'),
    JSON.stringify({
      photos: {'seaslug-900-cand-1': {egg: true}, 'seaslug-900-cand-2': {code: 'v1g0sl15'}, 'seaslug-900-cand-3': {code: 'o1g0sl14'}}
    })
  );
  RUN(
    dir,
    `import contextlib, io
with contextlib.redirect_stdout(io.StringIO()):
    JF.cmd_rep(("jt", "e", "k", "ph", "u", "n", "egg"))
print(1)`
  );
  const S2 = JSON.parse(fs.readFileSync(path.join(dir, 'suggest.json'), 'utf8'));
  assert.deepStrictEqual(S2.seaslug['seaslug-900-cand-1'], {egg: 1});
  assert.deepStrictEqual(S2.seaslug['seaslug-900-cand-3'], {jt: 'o1g0sl1', e: 4, k: 'best'});
  assert.deepStrictEqual(S2.fish, before.fish);
  fs.rmSync(dir, {recursive: true, force: true});
});

test('the command line: --subject and --by take their values; the fish-only commands refuse the sea slugs', () => {
  const out = J(`import judging_fish as JF
print(json.dumps([JF.args(['--subject', 'seaslug', '--check', '900']), JF.args(['--by', 'someone', 's091']), JF.args(['sheets', 't01'])]))`);
  assert.deepStrictEqual(out, [
    [['900'], 'claude', 'seaslug'],
    [['s091'], 'someone', 'fish'],
    [['sheets', 't01'], 'claude', 'fish']
  ]);
  for (const c of ['one', 'watermark', 'rep']) {
    const r = spawnSync('python3', ['tools/judging_fish.py', '--subject', 'seaslug', c], {cwd: ROOT, encoding: 'utf8'});
    assert.strictEqual(r.status, 1, c);
    assert.match(r.stderr, /the fish only/, c);
  }
});

test("the repository's sea slugs: their species by taxon id, from tools/seaslugs.json; every candidate's species among them", () => {
  const out = J(`import judging_fish as JF
JF.use('seaslug')
src = json.load(open('tools/seaslugs.json'))
inf = json.load(open('tools/seaslug_informal.json'))
print(json.dumps([len(JF.SP), sum(1 for s in src['species'] if s.get('inat')) + len(inf['species']) + len({s['genus'] for s in src['species']}),
                  JF.ids(['Chromodoris annae']), JF.SUBJECT, JF.JDIR, [k for k in JF.CAND if k not in JF.SP], len(JF.CAND),
                  JF.ids(['Goniobranchus', 'Goniobranchus sp. 5']), JF.SP['Goniobranchus']['name']]))`);
  // the species by taxon id, the species with no name yet by key, the genus-level lists by genus name (Q389)
  assert.ok(out[0] > 0 && out[0] === out[1]);
  assert.deepStrictEqual(out[2], ['119434']);
  assert.deepStrictEqual(out.slice(3, 5), ['seaslug', path.join('judging', 'seaslug')]);
  assert.deepStrictEqual(out[5], [], 'seaslug-cand.json keys: taxon ids of tools/seaslugs.json, informal keys, genus names');
  assert.ok(out[6] > 0, 'seaslug-cand.json read');
  assert.deepStrictEqual(out.slice(7), [['Goniobranchus', 'goniobranchus-sp5'], 'Goniobranchus (genus level)']);
});
