require('./slot.js').testGuard();
// One judgement per photo (Pierre, 2026-11-15): a fish photo met both as a reference photo (tools/fish_refs.json fi<id>,
// its code in tools/fish_judge.json) and as a candidate (fish-cand.json fish-<species>-cand-<id>, judged in
// judging/fish/<species>.json) is one photo (tools/fish_game.py pid) with one judgement, the candidate's judging file
// (tools/fish_judge.py cand_judgements, one_judgement; tools/fish_game.py inputs). tools/judging_fish.py one copies it
// onto the reference copies, and its --check fails on any divergence: run here on the repository's own files, so a new
// divergence turns the checks red. Offline: made-up fixtures in a temporary folder.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  os = require('os'),
  path = require('path'),
  {execFileSync, spawnSync} = require('child_process');
const ROOT = path.join(__dirname, '..');
const py = (code, cwd = ROOT) =>
  JSON.parse(
    execFileSync('python3', ['-c', `import sys, json; sys.path.insert(0, ${JSON.stringify(path.join(ROOT, 'tools'))})\n${code}`], {
      cwd,
      encoding: 'utf8',
      maxBuffer: 64 << 20
    })
  );

const INAT = id => `https://inaturalist-open-data.s3.amazonaws.com/photos/${id}/original.jpg`;
const FISH = {
  teach: [{id: 't01', name: 'Damselfish', level: 1, circle: 1, species: ['s001']}],
  species: [{id: 's001', name: 'Fishus damselii'}]
};
const REF = (id, o, k = {}) => ({
  f: `fi${id}`,
  o: `https://www.inaturalist.org/observations/${o}`,
  src: INAT(id),
  r: 1,
  a: '(c) Someone, some rights reserved (CC BY)',
  lic: 'cc-by',
  t: 'Fishus damselii',
  sp: 's001',
  loc: 'world',
  rep: 'inaturalist',
  from: 'taxon',
  ...k
});
const CAND = (id, o) => ({
  f: `fish-s001-cand-${id}`,
  o: `https://www.inaturalist.org/observations/${o}`,
  src: INAT(id),
  r: 1,
  t: 'Fishus damselii',
  loc: 'ph'
});

// A world of five photos, each both a reference photo and a candidate, the two copies judged apart (as before 2026-11-15):
// 1 an adult by its candidate judgement, a juvenile by its reference copy; 2 the reverse; 3 a candidate judgement still
// unsure; 4 judged dup of its observation's best as a candidate, alt as a reference photo; 5 only a reference copy.
function world(dir, judge) {
  const w = (f, d) => {
    fs.mkdirSync(path.dirname(path.join(dir, f)), {recursive: true});
    fs.writeFileSync(path.join(dir, f), JSON.stringify(d, null, 1) + '\n');
  };
  w('fish.json', FISH);
  w('curation.json', {fish: {}});
  w('fish-cand.json', {v: 1, cand: {s001: []}});
  w('suggest.json', {fish: {}});
  w('fish-game.json', {photos: {}});
  w('tools/fish_refs.json', {photos: {s001: [REF(1, 91), REF(2, 92), REF(3, 93), REF(4, 94), REF(5, 95), REF(6, 96)]}});
  w('tools/fish_judge.json', judge);
  w('judging/fish/s001.json', {
    photos: {
      'fish-s001-cand-1': {code: 'p1g0sl14', keep: 'best'},
      'fish-s001-cand-2': {code: 'p1g0sl1j2', keep: 'best'},
      'fish-s001-cand-3': {code: 'p1g0sl15', keep: 'best', unsure: ['code'], note: 'juvenile?'},
      'fish-s001-cand-4': {code: 'p1g0sl14', keep: 'dup'},
      'fish-s001-cand-6': {code: 'p1g0sl15', keep: 'best', unsure: ['bb'], note: 'tail fin edge?'}
    }
  });
}
const JUDGE = {
  photos: {t01: {fi1: 'p1g0sl1j2', fi2: 'p1g0sl15', fi3: 'p1g0sl15', fi4: 'p1g0sl14', fi5: 'o1g0sm13', fi6: 'p1g0sl15'}},
  crops: {},
  keep: {fi4: 'alt'}
};

test('a photo judged twice yields one judgement: its candidate judgement, in the build and in the reference copy', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'one-'));
  try {
    world(dir, JUDGE);
    const out = py(
      `import fish_game as G
fish, cur, cand, sug, refs, codes, crops, keep = G.inputs(${JSON.stringify(dir)})
play = G.ref_play(fish, refs, codes)
print(json.dumps({'codes': codes, 'keep': keep, 'play': {r['f']: [r['e'], r['jt']] for _, r in play},
                  'in': sorted(r['f'] for _, r, _, _ in G.in_play(cur, cand, sug, fish, refs, codes, keep))}))`
    );
    // The build reads the candidate judgement, never the reference copy: 1 an adult (4, one point more as a reference
    // photo: 5), 2 a juvenile (capped at 2); 3 waits while its judgement is unsure; 4 keeps its candidate's dup; 5 has
    // no candidate judgement and keeps its own; 6's doubt is on its box only, which withholds no judgement.
    assert.deepStrictEqual(out.codes, {fi1: 'p1g0sl14', fi2: 'p1g0sl1j2', fi4: 'p1g0sl14', fi5: 'o1g0sm13', fi6: 'p1g0sl15'});
    assert.deepStrictEqual(out.keep, {fi1: 'best', fi2: 'best', fi4: 'dup', fi6: 'best'});
    assert.deepStrictEqual(out.play.fi1, [5, 'p1g0sl1r']);
    assert.deepStrictEqual(out.play.fi2, [2, 'p1g0sl1jr']);
    assert.ok(!('fi3' in out.play), 'an unsure candidate judgement leaves its reference copy unjudged');
    assert.deepStrictEqual(out.in, ['fi1', 'fi2', 'fi5', 'fi6'], 'the dup stays out, whatever its reference copy said');

    // The check: three divergences (the codes of 1 and 2, the keep of 4; 3 and 6 agree), then none once the candidate
    // judgement is copied onto the reference copies.
    const run = args =>
      spawnSync(
        'python3',
        [
          '-c',
          `import sys; sys.path.insert(0, ${JSON.stringify(path.join(ROOT, 'tools'))})
import judging_fish as JF
JF.cmd_one(${args.includes('--check') ? 'True' : 'False'}, ${JSON.stringify(dir)})`
        ],
        {cwd: ROOT, encoding: 'utf8'}
      );
    let r = run(['one', '--check']);
    assert.strictEqual(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /fi1 code: tools\/fish_judge.json 'p1g0sl1j2', judging\/fish 'p1g0sl14'/);
    assert.match(r.stdout, /fi2 code: tools\/fish_judge.json 'p1g0sl15', judging\/fish 'p1g0sl1j2'/);
    assert.match(r.stdout, /fi4 keep: tools\/fish_judge.json 'alt', judging\/fish 'dup'/);
    assert.match(r.stdout, /^3 divergence\(s\)/m);
    r = run(['one']);
    assert.strictEqual(r.status, 0, r.stdout + r.stderr);
    const J = JSON.parse(fs.readFileSync(path.join(dir, 'tools', 'fish_judge.json'), 'utf8'));
    assert.deepStrictEqual(J.photos.t01, {...JUDGE.photos.t01, fi1: 'p1g0sl14', fi2: 'p1g0sl1j2'});
    assert.deepStrictEqual(J.keep, {fi4: 'dup'});
    r = run(['one', '--check']);
    assert.strictEqual(r.status, 0, r.stdout + r.stderr);
    // A new divergence (a reference pass types its own code for a photo judged as a candidate) fails the check again.
    fs.writeFileSync(
      path.join(dir, 'tools', 'fish_judge.json'),
      JSON.stringify({...J, photos: {t01: {...J.photos.t01, fi1: 'o1g0sl13'}}}, null, 1)
    );
    r = run(['one', '--check']);
    assert.strictEqual(r.status, 1, r.stdout + r.stderr);
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
});

test('two candidate judgements of one photo that disagree are a divergence, never settled by the tool', () => {
  const out = py(`import fish_judge as FJ
cj = {'i7': {'f': 'fish-s001-cand-7', 'code': 'p1g0sl14', 'keep': 'best', 'unsure': [],
             'also': [{'f': 'fish-s002-cand-7', 'code': 'p1g0sl1j2', 'keep': 'best', 'unsure': []}]}}
print(json.dumps(FJ.one_check({'photos': {}}, cj)))`);
  assert.deepStrictEqual(out, [['fish-s001-cand-7', 'twice', 'fish-s002-cand-7 p1g0sl1j2 best', 'p1g0sl14 best']]);
});

// The repository's own files: every photo judged twice has one judgement (tools/judging_fish.py one --check). A batch that
// judges a reference photo apart from its candidate (or the reverse) fails here: run python3 tools/judging_fish.py one.
test('no photo has two judgements that disagree (tools/judging_fish.py one --check)', () => {
  const r = spawnSync('python3', [path.join(ROOT, 'tools', 'judging_fish.py'), 'one', '--check'], {cwd: ROOT, encoding: 'utf8'});
  assert.strictEqual(r.status, 0, r.stdout.split('\n').slice(-12).join('\n') + r.stderr);
});
