require('./slot.js').testGuard();
// The fish phase flag p from the cited phase list (docs/decisions/2026-11-21-fish-phase-flag-from-cited-list.md):
// tools/fish_judge.py phase_flag (a dimorph entry, or the list's sex or ip_tp verdict "yes"; never a sub-adult alone nor a
// conflict), tools/fish_game.py phased (Pierre's tags get the tool's flag too), tools/build_fish.py phase_sources
// (fish.json species phs: the sources the phase card names), and the repository's own files kept in step with them.
// Offline, on fixture files. Needs python3.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  os = require('os'),
  path = require('path'),
  {execFileSync} = require('child_process');
const ROOT = path.join(__dirname, '..');
const J = (code, ...args) =>
  JSON.parse(
    execFileSync('python3', ['-c', `import sys, json; sys.path.insert(0, 'tools')\n${code}`, ...args], {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 1 << 28
    })
  );
const LIST = {
  _doc: 'fixture',
  'Fishus sexus': {
    juv: 'unknown',
    sub: 'unknown',
    ip_tp: 'unknown',
    sex: 'yes',
    sp: 's1',
    family: 'f:A',
    src: {sex: 'Reef Life Survey <https://rls.example/s1>; FishBase Morphology table (rfishbase snapshot v25.04, morphdat.SexColors)'},
    quote: {sex: 'Males blue, females yellow.'},
    note: {}
  },
  'Fishus phasus': {
    juv: 'unknown',
    sub: 'no',
    ip_tp: 'yes',
    sex: 'unknown',
    sp: 's2',
    family: 'f:A',
    src: {ip_tp: 'Fishes of Australia (as above)', juv: 'Fishes of Australia <https://foa.example/2>'},
    quote: {ip_tp: 'Initial phase brown; terminal phase green.'},
    note: {}
  },
  'Fishus subus': {juv: 'yes', sub: 'yes', ip_tp: 'unknown', sex: 'unknown', sp: 's3', family: 'f:B', src: {}, quote: {}, note: {}},
  'Fishus dubius': {
    juv: 'unknown',
    sub: 'conflict',
    ip_tp: 'unknown',
    sex: 'conflict',
    sp: 's4',
    family: 'f:B',
    src: {},
    quote: {},
    note: {}
  },
  'Fishus nullus': {juv: 'unknown', sub: 'unknown', ip_tp: 'unknown', sex: 'no', sp: 's5', family: 'f:B', src: {}, quote: {}, note: {}}
};
const tmp = obj => {
  const f = path.join(os.tmpdir(), `phaseflag.${process.pid}.${Math.random().toString(36).slice(2)}.json`);
  fs.writeFileSync(f, JSON.stringify(obj));
  return f;
};

test('phase_flag: a dimorph entry, or the list’s sex or ip_tp "yes"; never a sub-adult alone, a conflict or a no', () => {
  const f = tmp(LIST);
  try {
    const out = J(
      `import fish_judge as J
p = sys.argv[1]
print(json.dumps([J.phase_species(p), [J.phase_flag(s, None, p) for s in ('s1', 's2', 's3', 's4', 's5', 's9')],
                  J.phase_flag('s9', {'dimorph': True}, p), J.cap('p1g0sm14', J.phase_flag('s2', None, p))]))`,
      f
    );
    assert.deepStrictEqual(out[0], {s1: ['sex'], s2: ['ip_tp']});
    assert.deepStrictEqual(out[1], [true, true, false, false, false, false]);
    assert.strictEqual(out[2], true, 'an IMR dimorph entry keeps its flag');
    assert.deepStrictEqual(out[3], [4, 'p1g0sm1p'], 'the flag caps nothing');
  } finally {
    fs.unlinkSync(f);
  }
});

test('fish_game.phased: the tool’s flag on any tags of a flagged species, Pierre’s included; never taken off', () => {
  const out = J(
    `import fish_judge as J, fish_game as G
J._PHASE_SP[J.PHASE_LIST] = {'s1': ('sex',)}
print(json.dumps([G.phased('p1g0sm1', 's1'), G.phased('p1g0sm1jr', 's1'), G.phased('p1g0sm1pr', 's1'),
                  G.phased('p1g0sm1', 's2'), G.phased('p1g0sm1p', 's2'), G.phased(None, 's1'), G.phased('p1g0sm1wr', 's1')]))`
  );
  assert.deepStrictEqual(out, ['p1g0sm1p', 'p1g0sm1jpr', 'p1g0sm1pr', 'p1g0sm1', 'p1g0sm1p', null, 'p1g0sm1wpr']);
});

test('judging_fish.py: the phase flag is declared per subject (SUBJECTS flag; rule S1): the fish’s, none for the sea slugs', () => {
  const out = J(
    `import fish_judge as J, judging_fish as JF
J._PHASE_SP[J.PHASE_LIST] = {'s1': ('sex',)}
JF.ENTRY = {}
a = JF.entry('s1', {'code': 'p1g0sm14', 'keep': 'best'})['jt']
JF.use('seaslug')
b = JF.entry('s1', {'code': 'p1g0sm14', 'keep': 'best'})['jt']
print(json.dumps([JF.SUBJECTS['fish']['flag'] is J.phase_flag, JF.SUBJECTS['seaslug']['flag'], a, b]))`
  );
  assert.deepStrictEqual(out, [true, null, 'p1g0sm1p', 'p1g0sm1']);
});

test('build_fish.phase_sources: fish.json species phs {k, src}, each source named once, its page when the list gives one', () => {
  const f = tmp(LIST);
  try {
    const out = J(
      `import build_fish as B
o = {'species': [{'id': s} for s in ('s1', 's2', 's3', 's4', 's5')] + [{'id': 's6', 'phs': {'k': 'sex', 'src': []}}]}
B.phase_sources(o, sys.argv[1])
print(json.dumps({s['id']: s.get('phs') for s in o['species']}))`,
      f
    );
    assert.deepStrictEqual(out, {
      s1: {k: 'sex', src: [{t: 'Reef Life Survey', u: 'https://rls.example/s1'}, {t: 'FishBase Morphology table'}]},
      s2: {k: 'phase', src: [{t: 'Fishes of Australia', u: 'https://foa.example/2'}]},
      s3: null,
      s4: null,
      s5: null,
      s6: null
    });
  } finally {
    fs.unlinkSync(f);
  }
  const bad = tmp({...LIST, 'Fishus sexus': {...LIST['Fishus sexus'], quote: {}}});
  try {
    assert.throws(
      () =>
        execFileSync(
          'python3',
          [
            '-c',
            `import sys; sys.path.insert(0, 'tools')\nimport build_fish as B\nB.phase_sources({'species': [{'id': 's1'}, {'id': 's2'}]}, sys.argv[1])`,
            bad
          ],
          {cwd: ROOT, stdio: 'pipe'}
        ),
      /sex yes without its source and quote/
    );
  } finally {
    fs.unlinkSync(bad);
  }
});

test('the repository: fish.json phs and data/suggest.json tags as the cited phase list gives them', () => {
  const out = J(
    `import fish_judge as J
fish = json.load(open('fish.json', encoding='utf-8'))
sug = json.load(open('data/suggest.json', encoding='utf-8'))['fish']
cand = json.load(open('data/fish-cand.json', encoding='utf-8'))['cand']
dim = {s for t in fish['teach'] if t.get('dimorph') and t.get('level') == 1 for s in t.get('species') or []}
PS = J.phase_species()
phs = {s['id'] for s in fish['species'] if s.get('phs')}
miss = [p['f'] for sid, L in cand.items() if sid in PS for p in L
        if p['f'] in sug and sug[p['f']].get('jt') and 'p' not in sug[p['f']]['jt'][7:]]
extra = [p['f'] for sid, L in cand.items() if sid not in PS and sid not in dim for p in L
         if p['f'] in sug and 'p' in (sug[p['f']].get('jt') or '')[7:]]
print(json.dumps([sorted(PS) == sorted(phs), len(PS), miss[:5], extra[:5]]))`
  );
  assert.strictEqual(out[0], true, 'fish.json species phs: exactly the species the list flags (python3 tools/build_fish.py --regroup)');
  assert.ok(out[1] > 50, `the list flags ${out[1]} species`);
  assert.deepStrictEqual(out[2], [], 'a judged candidate of a flagged species without p: python3 tools/judging_fish.py rep');
  assert.deepStrictEqual(out[3], [], 'p on a judged candidate of a species neither the list nor IMR flags');
});
