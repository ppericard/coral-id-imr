require('./slot.js').testGuard();
// The sea-slug subject's game data (tools/seaslug_game.py; study docs/reviews/2026-11-15-nudibranch-mode-study.md §9,
// step 5): the tree in fish.json's shape, scientific names only, its commonness over the Philippines, the photos in
// play from the judged candidates under the photo target, and the committed files as the tool
// writes them from tools/seaslugs.json, data/seaslug-cand.json and data/suggest.json "seaslug" (a re-judge must rebuild them).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  os = require('os'),
  path = require('path'),
  {spawnSync} = require('child_process'),
  C = require('../core.js');
const ROOT = path.join(__dirname, '..'),
  TOOLS = path.join(ROOT, 'tools'),
  json = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
// The tool's output (its last line, as JSON: a run prints its failures first).
const pyraw = body => {
  const code = `import json, sys\nsys.path.insert(0, ${JSON.stringify(TOOLS)})\nimport seaslug_game as g\n${body}`;
  const r = spawnSync('python3', ['-c', code], {encoding: 'utf8', maxBuffer: 64 << 20});
  assert.strictEqual(r.status, 0, r.stderr);
  return r.stdout.trim().split('\n').pop();
};
const py = body => JSON.parse(pyraw(body));

test('the committed seaslug.json and seaslug-game.json are what the tool builds (--check)', () => {
  const r = spawnSync('python3', [path.join(TOOLS, 'seaslug_game.py'), '--check'], {encoding: 'utf8'});
  assert.strictEqual(r.status, 0, r.stderr);
});

// Made-up list: three species of two families, one with a documented juvenile form; the target start 2, cap 2, +1.
const LIST = {
  area: {inatPlace: 6873, name: 'Philippines'},
  centre: {name: 'Dauin'},
  photoTarget: {start: 2, gameCap: 2, perJuvenileForm: 1, juvenile: {'Aa bb': 'documented'}},
  lookalikes: [{pair: ['Aa bb', 'Aa cc']}],
  species: [
    {
      rank: 2,
      name: 'Aa cc',
      inat: 2,
      family: 'Afam',
      genus: 'Aa',
      group: 'Nudibranchia',
      circle: 1,
      observers: 50,
      near: true,
      nearObservers: 3,
      nearObs: 4,
      worms: {aphia: 20, accepted: 'Aa cc'}
    },
    {
      rank: 1,
      name: 'Aa bb',
      inat: 1,
      family: 'Afam',
      genus: 'Aa',
      group: 'Nudibranchia',
      circle: 1,
      star: true,
      observers: 90,
      near: false,
      worms: {aphia: 10, aphiaAcc: 11, accepted: 'Zz bb'}
    },
    {rank: 3, name: 'Bb dd', inat: 3, family: 'Bfam', genus: 'Bb', group: 'Sacoglossa', circle: 1, observers: 9, worms: {}},
    {rank: 4, name: 'Cc ee', inat: 4, family: 'Cfam', genus: 'Cc', group: 'Nudibranchia', circle: 2, observers: 8, worms: {}},
    // circle 3 in a circle-1 family (its family stays circle 1, a new genus of circle 3), and circle 4 (no candidates)
    {rank: 5, name: 'Aa ff', inat: 5, family: 'Afam', genus: 'Ab', group: 'Nudibranchia', circle: 3, observers: 7, worms: {}},
    {rank: 6, name: 'Dd gg', inat: 6, family: 'Dfam', genus: 'Dd', group: 'Nudibranchia', circle: 4, observers: 2, worms: {}}
  ]
};
const cand = (id, n) => ({
  f: `seaslug-${id}-cand-${n}`,
  o: `https://www.inaturalist.org/observations/${n}`,
  src: `https://x/${n}.jpg`,
  a: 'A',
  lic: 'cc-by',
  t: 'T',
  loc: 'ph'
});
const CAND = {cand: {1: [1, 2, 3, 4, 5, 6].map(n => cand(1, n)), 2: [7, 8, 9].map(n => cand(2, n)), 3: [10, 11].map(n => cand(3, n))}};
const SUG = {
  'seaslug-1-cand-1': {jt: 'd1g0sl1', e: 5, k: 'best'},
  'seaslug-1-cand-2': {jt: 'o1g0sm1', e: 4},
  'seaslug-1-cand-3': {jt: 'p1g0sl1', e: 3, k: 'best'},
  'seaslug-1-cand-4': {jt: 'd1g0sl1j', e: 2, k: 'best'}, // a juvenile: the documented form's +1
  'seaslug-1-cand-5': {jt: 'd1g0sl1j', e: 1, k: 'best'}, // a second one: beyond the +1
  'seaslug-1-cand-6': {egg: true},
  'seaslug-2-cand-7': {jt: 'd1g0sl1', e: 5, k: 'best', u: ['code'], n: 'unsure'},
  'seaslug-2-cand-8': {jt: 'd1g0slk', e: 4, k: 'best'}, // another species one could take for it (rule P3)
  'seaslug-2-cand-9': {jt: 'v1g0sl1', e: 3, k: 'dup'},
  'seaslug-3-cand-10': {jt: 'd1g0slo', e: 4, k: 'best'},
  'seaslug-3-cand-11': {jt: 'd1g0sl1a', e: 3, k: 'alt'} // out of the water
};

const arg = x => `json.loads(${JSON.stringify(JSON.stringify(x))})`;
test('the tree: circles 1 to 3, fish.json shape, scientific names, the area commonness, the decided pair', () => {
  const o = py(`print(json.dumps(g.build(${arg(LIST)}, ${arg(CAND)}, ${arg(SUG)})))`);
  const [T, G, todo] = o;
  assert.deepStrictEqual(
    T.families.map(f => [f.id, f.name, f.circle, f.species, f.genera]),
    [
      ['f:Afam', 'Afam', 1, ['s1', 's2', 's5'], ['g:Aa', 'g:Ab']],
      ['f:Bfam', 'Bfam', 1, ['s3'], ['g:Bb']],
      ['f:Cfam', 'Cfam', 2, ['s4'], ['g:Cc']]
    ],
    'by circle, then their most common species; a family takes its best species circle; circle 4 left out'
  );
  assert.deepStrictEqual(
    T.genera.map(x => [x.id, x.circle]),
    [
      ['g:Aa', 1],
      ['g:Bb', 1],
      ['g:Cc', 2],
      ['g:Ab', 3]
    ]
  );
  assert.deepStrictEqual(
    T.species.map(s => [s.id, s.circle]),
    [
      ['s1', 1],
      ['s2', 1],
      ['s3', 1],
      ['s4', 2],
      ['s5', 3]
    ]
  );
  assert.strictEqual(T.key, null, 'no identification key (rule S3: none for this region yet)');
  assert.deepStrictEqual(T.area, LIST.area);
  const s1 = T.species[0];
  assert.deepStrictEqual(
    [s1.id, s1.name, s1.now, s1.ref, s1.star, s1.look, s1.present],
    ['s1', 'Aa bb', 'Zz bb', 11, true, ['s2'], {area: 90, near: false, nearU: 0, nearN: 0}]
  );
  assert.ok(
    T.species.every(s => !('common' in s) && !('cn' in s)),
    'no English name in the game (Q369 d)'
  );
  // The photos: only sure judgements, cap 2 adults + 1 juvenile for the documented form; a species under start 2: none.
  // The juvenile carries the fish's phase word (tools/fish_game.py phase: the j flag), the adults none.
  assert.deepStrictEqual(
    G.photos['f:Afam'].map(p => [p.f.split('-').pop(), p.sp, p.e, p.r, p.auto, p.ph]),
    [
      ['1', 's1', 5, 1, 'cand', undefined],
      ['2', 's1', 4, 1, 'cand', undefined],
      ['4', 's1', 2, 1, 'cand', 'juvenile']
    ],
    'Aa cc has no sure photo (unsure, k, dup): out; Aa ff (circle 3) not judged yet: none'
  );
  assert.ok(!G.photos['f:Bfam'], 'one sure photo (o counts, a never): under the start, not played');
  assert.deepStrictEqual(
    todo.map(([r, c, iv]) => [r.f, c, iv]),
    G.photos['f:Afam'].map(p => [p.f, null, 0]),
    'nothing on R2 yet: every photo in play is to download, remote (r: 1) until then'
  );
});

// The sea slugs without a species name: a species defined by a paper, present by its label's observers
// (tools/presence.py label_confirmed: 3), a sheet of its genus whose photos play for the genus; and the genus-level
// photos (gl), in play for their genus unit only, never for a species, once the genus reaches the start.
// Pierre's curation reaches the sea slugs' game (curation.json seaslug, core.js SUBJECTS seaslug admin.cur: the admin's
// Photos › Tree and a report's photo tools write it), as the fish part reaches fish-game.json (tools/fish_game.py
// in_play, record): what he removed, excluded or moved leaves and the next sure photo takes its place; his adds enter,
// named after the species he moved them to; his ease, tags, crop and rotation are the record's and the download's.
test("Pierre's curation of the sea slugs reaches the game file: removed, excluded, moved, added, ease, tags, crop, rotation", () => {
  const cur = {
      exclude: {'seaslug-1-cand-4': 1}, // the juvenile excluded for good: the next one (5) takes the documented +1
      seaslug: {
        seen: {'seaslug-1-cand-1': 1}, // removed: cand 3 fills the cap
        out: {'seaslug-3-cand-11': 's1'}, // Not this, from Bb dd to Aa bb, then his add there
        add: {'seaslug-3-cand-11': 's1', 'seaslug-2-cand-7': 's2', 'seaslug-2-cand-9': 's2'},
        ease: {'seaslug-1-cand-2': 2},
        tags: {'seaslug-2-cand-9': 'd1g0sl1'},
        crop: {'seaslug-1-cand-3': [0.1, 0.2, 0.9, 0.8]},
        rot: {'seaslug-1-cand-3': 90}
      }
    },
    prev = {photos: {'f:Afam': [{f: 'seaslug-1-cand-3', src: 'https://x/3.jpg', ar: 1.5, sp: 's1'}]}};
  const [, G, todo] = py(`t, gm, todo = g.build(${arg(LIST)}, ${arg(CAND)}, ${arg(SUG)}, ${arg(prev)}, None, None, None, cur=${arg(cur)})
print(json.dumps([t, gm, todo]))`);
  assert.deepStrictEqual(
    G.photos['f:Afam'].map(p => [p.f.split('-').pop(), p.sp, p.t, p.e, p.jt, p.auto || '']),
    [
      ['11', 's1', 'Aa bb', 3, 'd1g0sl1a', ''], // his add: in whatever its judgement, named after its new species
      ['3', 's1', 'T', 3, 'p1g0sl1', 'cand'], // the cap's one place left: 3 (ease 3) before 2 (his ease 2)
      ['5', 's1', 'T', 1, 'd1g0sl1j', 'cand'],
      ['7', 's2', 'T', 5, 'd1g0sl1', ''], // his adds: an unsure and a dup judgement, his tags over the pass's
      ['9', 's2', 'T', 3, 'd1g0sl1', '']
    ]
  );
  assert.deepStrictEqual(
    todo.map(([r, c, iv, ro]) => [r.f.split('-').pop(), c, iv, ro]),
    [
      ['11', null, 0, 0],
      ['3', [0.1, 0.2, 0.9, 0.8], 1, 90], // on R2 without his crop and rotation: made again, its rewrite count bumped
      ['5', null, 0, 0],
      ['7', null, 0, 0],
      ['9', null, 0, 0]
    ]
  );
  // A count he set to another species one could take for it takes a photo out, his add or not (rule P3).
  const k = {seaslug: {tags: {'seaslug-1-cand-1': 'd1g0slk'}}},
    [, G2] = py(`print(json.dumps(g.build(${arg(LIST)}, ${arg(CAND)}, ${arg(SUG)}, None, None, None, None, cur=${arg(k)})))`);
  assert.deepStrictEqual(
    G2.photos['f:Afam'].map(p => p.f.split('-').pop()),
    ['2', '3', '4']
  );
  // No sea-slug part: the build without curation (the fish part never read).
  const [, G3] = py(
    `print(json.dumps(g.build(${arg(LIST)}, ${arg(CAND)}, ${arg(SUG)}, None, None, None, None, cur=${arg({fish: cur.seaslug})})))`
  );
  assert.deepStrictEqual(
    G3.photos['f:Afam'].map(p => p.f.split('-').pop()),
    ['1', '2', '4']
  );
});

test('Q389: a species with no name yet in the tree by its label rule; genus-level photos in play for their genus only', () => {
  const INF = {
    species: [
      {
        key: 'aa-sp1',
        name: 'Aa sp. 1',
        genus: 'Aa',
        src: 'Someone 2020',
        cite: 'Someone (2020). A paper.',
        doi: '10/x',
        field: {id: 7, name: 'Aa sp. 1?', value: 'Yes'},
        presence: {observers: 3, near: true, nearObservers: 2, nearObs: 4}
      },
      {
        key: 'aa-sp2',
        name: 'Aa sp. 2',
        genus: 'Aa',
        src: 'S',
        cite: 'S',
        field: {id: 8, name: 'x', value: 'Yes'},
        presence: {observers: 2}
      },
      {
        key: 'zz-sp1',
        name: 'Zz sp. 1',
        genus: 'Zz',
        src: 'S',
        cite: 'S',
        field: {id: 9, name: 'y', value: 'Yes'},
        presence: {observers: 50}
      }
    ]
  };
  const C2 = {
      cand: {
        ...CAND.cand,
        'aa-sp1': [30, 31].map(n => cand('aa-sp1', n)),
        Aa: [40, 41, 42].map(n => ({...cand('Aa', n), gl: 1})),
        Bb: [50, 51, 52, 53, 54].map(n => ({...cand('Bb', n), gl: 1}))
      }
    },
    S2 = {
      ...SUG,
      'seaslug-aa-sp1-cand-30': {jt: 'd1g0sl1', e: 5, k: 'best'},
      'seaslug-aa-sp1-cand-31': {jt: 'd1g0sm1', e: 3},
      'seaslug-Aa-cand-40': {jt: 'd1g0sl1', e: 5},
      'seaslug-Aa-cand-41': {jt: 'p1g0sl1', e: 4},
      'seaslug-Aa-cand-42': {jt: 'p1g0sl1', e: 2, u: ['code'], n: 'unsure'},
      ...Object.fromEntries([50, 51, 52, 53, 54].map(n => [`seaslug-Bb-cand-${n}`, {jt: 'd1g0sl1', e: 55 - n}]))
    };
  const [T, G] = py(`print(json.dumps(g.build(${arg(LIST)}, ${arg(C2)}, ${arg(S2)}, None, None, ${arg(INF)})))`);
  const x = T.species.find(s => s.id === 'x:aa-sp1');
  assert.deepStrictEqual(
    [x.name, x.inf, x.src, x.doi, x.field, x.circle, x.family, x.genus, x.group, x.present, 'inat' in x, 'ref' in x],
    ['Aa sp. 1', 1, 'Someone 2020', '10/x', 7, 1, 'f:Afam', 'g:Aa', 'Nudibranchia', {area: 3, near: true, nearU: 2, nearN: 4}, false, false]
  );
  assert.strictEqual(x.r, 5.5, 'the rank its 3 label observers give it: after the 5 listed species with more');
  assert.ok(!T.species.some(s => s.id === 'x:aa-sp2'), '2 observers with the label: under the rule, out');
  assert.ok(!T.species.some(s => s.id === 'x:zz-sp1'), 'its genus is not in the tree: out');
  assert.ok(T.genera.find(g => g.id === 'g:Aa').species.includes('x:aa-sp1'));
  assert.ok(T.families.find(f => f.id === 'f:Afam').species.includes('x:aa-sp1'));
  const A = G.photos['f:Afam'];
  assert.deepStrictEqual(
    A.filter(p => p.sp === 'x:aa-sp1').map(p => p.f.split('-').pop()),
    ['30', '31'],
    'its photos, by the species rule (start 2)'
  );
  assert.deepStrictEqual(
    A.filter(p => p.gl).map(p => [p.f.split('-').pop(), p.sp, p.gl]),
    [
      ['40', 'g:Aa', 1],
      ['41', 'g:Aa', 1]
    ],
    'the sure genus-level photos of Aa, for the genus (never an unsure one)'
  );
  assert.deepStrictEqual(
    (G.photos['f:Bfam'] || []).map(p => [p.f.split('-').pop(), p.sp]),
    [
      ['50', 'g:Bb'],
      ['51', 'g:Bb']
    ],
    'Bb: its species under the start, its genus-level photos reach it (cap 2, the easiest first)'
  );
  // core.js: a gl photo goes to its genus unit, never to a species' photos, never to another genus of the family
  const X = C.treeGen(T, G.photos, undefined, 'genus');
  assert.deepStrictEqual(
    X.gen['g:Aa'].views.wide
      .filter(p => p.gl)
      .map(p => p.f.split('-').pop())
      .sort(),
    ['40', '41']
  );
  assert.ok(!X.gen['g:Ab'].views.wide.some(p => p.gl), 'not for the sibling genus');
  assert.deepStrictEqual(
    X.gen['g:Bb'].views.wide.map(p => p.sp),
    ['g:Bb', 'g:Bb']
  );
  assert.strictEqual(C.treeGlOf(A.find(p => p.gl)), 'g:Aa');
  assert.strictEqual(C.treeGlOf(A.find(p => !p.gl)), '');
  // the label rule (tools/presence.py): 3 observers with the label in the Philippines
  const pr = spawnSync(
    'python3',
    [
      '-c',
      `import sys; sys.path.insert(0, ${JSON.stringify(TOOLS)})\nimport presence as P\nprint([P.label_confirmed(n) for n in (None, 2, 3, 180)])`
    ],
    {
      encoding: 'utf8'
    }
  );
  assert.strictEqual(pr.stdout.trim(), '[False, False, True, True]', pr.stderr);
});

// A species judged later (as circle 3's last part) enters by itself: its judgements in data/suggest.json "seaslug" are all
// the build needs.
test('a species judged later enters at the next build, by the same rule as circle 1', () => {
  const C3 = {...CAND, cand: {...CAND.cand, 5: [20, 21, 22].map(n => cand(5, n))}},
    S3 = {...SUG, 'seaslug-5-cand-20': {jt: 'p1g0sl1', e: 5, k: 'best'}, 'seaslug-5-cand-21': {jt: 'o1g0sm1', e: 3, k: 'alt'}};
  const [, before] = py(`print(json.dumps(g.build(${arg(LIST)}, ${arg(C3)}, ${arg(SUG)})))`),
    [, after] = py(`print(json.dumps(g.build(${arg(LIST)}, ${arg(C3)}, ${arg(S3)})))`);
  assert.ok(!before.photos['f:Afam'].some(p => p.sp === 's5'), 'not judged: no photo');
  assert.deepStrictEqual(
    after.photos['f:Afam'].filter(p => p.sp === 's5').map(p => p.f.split('-').pop()),
    ['20', '21'],
    'judged: its sure photos, under its family'
  );
  // --check (CI): the file committed before those judgements passes, the species waiting for the workflow's rebuild after
  // the merge; a re-judge of a species already in play does not (its PR rebuilds the file).
  const chk = (sug, committed) =>
    py(`t, gm, _ = g.build(${arg(LIST)}, ${arg(C3)}, ${arg(sug)})
t0, g0, _ = g.build(${arg(LIST)}, ${arg(C3)}, ${arg(committed)})
print(json.dumps(g.check(t, gm, g.dump(t0), g.dump_game(g0))))`);
  assert.deepStrictEqual(chk(S3, SUG), [[], ['s5']]);
  assert.deepStrictEqual(chk(S3, S3), [[], []]);
  assert.deepStrictEqual(chk({...S3, 'seaslug-1-cand-2': {jt: 'o1g0sm1', e: 3, k: 'best'}}, S3), [['seaslug-game.json'], []]);
  assert.deepStrictEqual(
    chk({...S3, 'seaslug-1-cand-1': {egg: true}}, S3),
    [['seaslug-game.json'], []],
    'a photo in play found an egg mass'
  );
});

// The R2 step (study §9 step 6) on a fixture, the photo host stubbed (never iNaturalist or R2): the fish's pipeline
// (tools/fish_game.py download: four sizes, the crop), the records then read from R2, the original kept as the fallback.
const pil = spawnSync('python3', ['-c', 'import PIL'], {encoding: 'utf8'}).status === 0;
function world(sug = SUG) {
  const dir = mkTmp('seaslug-r2-'),
    w = (f, o) => fs.writeFileSync(path.join(dir, f), JSON.stringify(o));
  fs.mkdirSync(path.join(dir, 'tools'));
  w('tools/seaslugs.json', LIST);
  w('data/seaslug-cand.json', {
    cand: {
      ...CAND.cand,
      1: CAND.cand[1].map(p => ({...p, src: `https://inaturalist-open-data.s3.amazonaws.com/photos/${p.f.split('-').pop()}/original.jpg`}))
    }
  });
  w('data/suggest.json', {seaslug: sug});
  return dir;
}
const STUB = `
import io, os, urllib.error
from PIL import Image
import seaslug_game as g
calls = []
def get(url):
    calls.append(url)
    if url.endswith('/2/original.jpg') and FAIL:
        raise urllib.error.URLError('down')
    b = io.BytesIO(); Image.new('RGB', (400, 300), (200, 120, 40)).save(b, 'JPEG'); return b.getvalue()
`;
const r2run = (dir, out, {fail = false, limit} = {}) =>
  py(`FAIL = ${fail ? 'True' : 'False'}${STUB}
done, failed, n, wait = g.run(${JSON.stringify(out)}, root=${JSON.stringify(dir)}, get=get, pause=0, workers=2${limit === undefined ? '' : ', limit=' + limit})
print(json.dumps({'done': done, 'failed': failed, 'n': n, 'wait': wait, 'calls': calls}))`);
const game = dir => JSON.parse(fs.readFileSync(path.join(dir, 'seaslug-game.json'), 'utf8'));
const offline = dir => py(`t, gm, todo = g.build(*g.inputs(${JSON.stringify(dir)}))\nprint(json.dumps([g.dump_game(gm), len(todo)]))`);

test(
  'the R2 step: four files a photo, the crop applied, read from R2 with the original as fallback',
  {skip: !pil && 'Pillow missing'},
  () => {
    const sug = {...SUG, 'seaslug-1-cand-1': {...SUG['seaslug-1-cand-1'], c: [0.1, 0.1, 0.9, 0.9]}},
      dir = world(sug),
      out = path.join(dir, 'up');
    // A failing photo stays remote (r: 1), read from iNaturalist until the next run.
    let r = r2run(dir, out, {fail: true});
    assert.deepStrictEqual([r.done, r.failed, r.n, r.wait], [2, ['seaslug-1-cand-2'], 3, 0]);
    assert.ok(
      r.calls.every(u => u.startsWith('https://inaturalist-open-data.s3.amazonaws.com/photos/')),
      'only the photo host'
    );
    let G = game(dir),
      by = Object.fromEntries(G.photos['f:Afam'].map(p => [p.f.split('-').pop(), p]));
    assert.deepStrictEqual(fs.readdirSync(out).sort(), [
      'seaslug-1-cand-1-m.webp',
      'seaslug-1-cand-1-s.webp',
      'seaslug-1-cand-1-t.webp',
      'seaslug-1-cand-1.webp',
      'seaslug-1-cand-4-m.webp',
      'seaslug-1-cand-4-s.webp',
      'seaslug-1-cand-4-t.webp',
      'seaslug-1-cand-4.webp'
    ]);
    // The crop applied (400 x 300 cut to 320 x 240: 1.33), recorded as cr; the original kept (src) for the fallback.
    assert.deepStrictEqual([by[1].r, by[1].ar, by[1].cr, /original\.jpg$/.test(by[1].src)], [undefined, 1.33, [0.1, 0.1, 0.9, 0.9], true]);
    assert.deepStrictEqual([by[4].r, by[4].ar, by[4].cr, by[4].ph], [undefined, 1.33, undefined, 'juvenile']);
    assert.deepStrictEqual([by[2].r, by[2].ar], [1, undefined], 'failed: remote');
    // The offline build (the workflow while SEASLUG_R2 is off, --check) keeps what is on R2: the same file.
    let [text, todo] = offline(dir);
    assert.strictEqual(text, fs.readFileSync(path.join(dir, 'seaslug-game.json'), 'utf8'));
    assert.strictEqual(todo, 1, 'the failed one waits for the next run');
    // tools/photos.py lists the sea slugs' photos on R2 (tools/r2_sync.sh checks the bucket has their files), not the remote one.
    const online = py(`import photos\nprint(json.dumps(sorted(photos.online(photos.records(${JSON.stringify(dir)})))))`);
    assert.deepStrictEqual(online, ['seaslug-1-cand-1', 'seaslug-1-cand-4']);
    // The next run downloads the failed one only.
    r = r2run(dir, path.join(dir, 'up2'));
    assert.deepStrictEqual([r.done, r.failed, r.calls.length], [1, [], 1]);
    // A new crop: listed with its files on R2 until the run makes them again, its rewrite count bumped.
    fs.writeFileSync(
      path.join(dir, 'data/suggest.json'),
      JSON.stringify({seaslug: {...sug, 'seaslug-1-cand-1': {...sug['seaslug-1-cand-1'], c: [0, 0, 0.5, 1]}}})
    );
    [text, todo] = offline(dir);
    assert.strictEqual(todo, 1);
    assert.ok(text.includes('"f":"seaslug-1-cand-1"') && JSON.parse(text).photos['f:Afam'][0].cr.join() === '0.1,0.1,0.9,0.9');
    r = r2run(dir, path.join(dir, 'up3'));
    G = game(dir);
    assert.deepStrictEqual(
      [r.done, G.photos['f:Afam'][0].cr, G.photos['f:Afam'][0].iv, G.photos['f:Afam'][0].ar],
      [1, [0, 0, 0.5, 1], 1, 0.67]
    );
    // Nothing left: a run downloads nothing.
    r = r2run(dir, path.join(dir, 'up4'));
    assert.deepStrictEqual([r.done, r.calls.length], [0, 0]);
  }
);

test('the R2 step takes at most --max a run, the rest remote until the next', {skip: !pil && 'Pillow missing'}, () => {
  const dir = world(),
    r = r2run(dir, path.join(dir, 'up'), {limit: 1});
  assert.deepStrictEqual([r.done, r.wait], [1, 2]);
  assert.deepStrictEqual(
    game(dir).photos['f:Afam'].map(p => !!p.r),
    [false, true, true]
  );
});

// The tile (Q437: Find the X for the sea slugs): the fish's cut (tools/fish_game.py tile_crop, tile_write) on a photo whose
// judgement carries the animal's box and whose tags pass the tile rule; no judgement carries one today, so none has a tile.
test(
  'the tiles: made with the download for a boxed photo that passes the rule, alone when the box changes, refused when too small',
  {skip: !pil && 'Pillow missing'},
  () => {
    const box = b => ({
        ...SUG,
        'seaslug-1-cand-1': {...SUG['seaslug-1-cand-1'], bb: [0, 0, 1, 1]}, // a dorsal view: a tile photo (the sea slugs' rule)
        'seaslug-1-cand-4': {...SUG['seaslug-1-cand-4'], bb: [0.05, 0.2, 0.95, 0.8]}, // a juvenile: never a tile photo
        'seaslug-1-cand-2': {...SUG['seaslug-1-cand-2'], bb: b}
      }),
      dir = world(box([0.05, 0.2, 0.95, 0.8])),
      by = () => Object.fromEntries(game(dir).photos['f:Afam'].map(p => [p.f.split('-').pop(), p]));
    let r = r2run(dir, path.join(dir, 'up'));
    assert.deepStrictEqual([r.done, r.failed], [3, []]);
    let B = by();
    assert.deepStrictEqual(B[1].bb, [0, 0, 1, 1], 'a dorsal photo keeps its box');
    assert.strictEqual(B[1].xc.length, 4, 'and its tile');
    assert.strictEqual(B[4].bb, undefined, 'a juvenile: no box kept');
    assert.deepStrictEqual([B[2].bb, B[2].xn, B[2].xc.length], [[0.05, 0.2, 0.95, 0.8], undefined, 4]);
    assert.ok(fs.existsSync(path.join(dir, 'up', 'seaslug-1-cand-2-x.webp')), 'the fifth file');
    assert.ok(fs.existsSync(path.join(dir, 'up', 'seaslug-1-cand-1-x.webp')));
    assert.ok(!fs.existsSync(path.join(dir, 'up', 'seaslug-1-cand-4-x.webp')));
    // Offline (--check): the tile stays, nothing to do.
    let [text, todo] = offline(dir);
    assert.strictEqual(text, fs.readFileSync(path.join(dir, 'seaslug-game.json'), 'utf8'));
    assert.strictEqual(todo, 0);
    // A new box: the tile alone, the four files and their rewrite count as they are.
    fs.writeFileSync(path.join(dir, 'data/suggest.json'), JSON.stringify({seaslug: box([0, 0.1, 1, 0.9])}));
    [text, todo] = offline(dir);
    assert.strictEqual(todo, 1);
    r = r2run(dir, path.join(dir, 'up2'));
    assert.deepStrictEqual([r.done, r.calls.length], [1, 1]);
    assert.deepStrictEqual(fs.readdirSync(path.join(dir, 'up2')), ['seaslug-1-cand-2-x.webp']);
    const was = B[2];
    B = by();
    assert.deepStrictEqual([B[2].bb, B[2].ar, B[2].iv, B[2].xc.length], [[0, 0.1, 1, 0.9], was.ar, was.iv, 4]);
    // A box too small in the original (under 320 px wide): no tile, and why.
    fs.writeFileSync(path.join(dir, 'data/suggest.json'), JSON.stringify({seaslug: box([0.4, 0.4, 0.5, 0.5])}));
    r = r2run(dir, path.join(dir, 'up3'));
    B = by();
    assert.deepStrictEqual([B[2].xc, B[2].xn, fs.readdirSync(path.join(dir, 'up3'))], [undefined, 'res', []]);
    // And nothing more to do afterwards.
    [, todo] = offline(dir);
    assert.strictEqual(todo, 0);
  }
);

test('an unsure box keeps the photo in the ordinary games and out of Find the X; another unsure field still keeps it out', () => {
  const dir = world({
      ...SUG,
      'seaslug-1-cand-1': {...SUG['seaslug-1-cand-1'], bb: [0.05, 0.2, 0.95, 0.8]},
      'seaslug-1-cand-2': {...SUG['seaslug-1-cand-2'], bb: [0.05, 0.2, 0.95, 0.8], u: ['bb'], n: 'the tail may run on'},
      'seaslug-1-cand-4': {...SUG['seaslug-1-cand-4'], u: ['code', 'bb'], n: 'juvenile?'}
    }),
    [text] = offline(dir),
    B = Object.fromEntries(JSON.parse(text).photos['f:Afam'].map(p => [p.f.split('-').pop(), p]));
  assert.deepStrictEqual(B[1].bb, [0.05, 0.2, 0.95, 0.8], 'a sure box: kept, for its tile');
  assert.ok(B[2], 'a doubted box: the photo is in play all the same');
  assert.strictEqual(B[2].bb, undefined, 'but carries no box, so no tile');
  assert.strictEqual(B[4], undefined, 'a doubt on the code too: out, as before');
});

test('--plan prints what the R2 step would download, by circle, and writes nothing', () => {
  const r = spawnSync('python3', [path.join(TOOLS, 'seaslug_game.py'), '--plan'], {encoding: 'utf8'});
  assert.strictEqual(r.status, 0, r.stderr);
  // circle 1: its 45 species, and Goniobranchus sp. 5 (tools/seaslug_informal.json) until its photos are judged
  assert.match(r.stdout, /^circle 1: \d+ photos in play over (45|46) of 46 species/m);
  assert.match(r.stdout, /^circle 2: /m);
  assert.match(r.stdout, /^circle 3: /m);
  assert.match(r.stdout, /^all: \d+ photos in play .* to download: \d+ \(\d+ files, about \d+ MB\)/m);
});

test('the committed files read through the fish engine: three circles, scientific names, photos from iNaturalist or R2', () => {
  const F = json('seaslug.json'),
    GM = C.treeGameRead(json('seaslug-game.json')),
    S = C.subjectOf('seaslug');
  assert.strictEqual(S.id, 'seaslug');
  // As the app reads them: its genera the units (core.js SUBJECTS unitRank; tests/seaslug-genera.test.js).
  const X = C.treeGen(F, C.treePhotos({}, GM.photos, C.treeCur(S, json('curation.json'))), undefined, C.unitRankOf(S));
  // The circles of tools/seaslugs.json 1 to 3 (45, then 60 and 100 by commonness), circle 4 left out.
  const L = json('tools/seaslugs.json').species,
    n = c => L.filter(s => s.circle === c).length;
  // (the species with no name yet, tools/seaslug_informal.json, apart: Goniobranchus sp. 5 in its genus's circle 1)
  assert.deepStrictEqual(
    [1, 2, 3, 4].map(c => F.species.filter(s => s.circle === c && !s.inf).length),
    [n(1), n(2), n(3), 0]
  );
  assert.deepStrictEqual(
    F.species.filter(s => s.inf).map(s => [s.id, s.name, s.circle, s.genus]),
    [['x:goniobranchus-sp5', 'Goniobranchus sp. 5', 1, 'g:Goniobranchus']]
  );
  assert.deepStrictEqual([n(1), n(2), n(3)], [45, 60, 100]);
  assert.strictEqual(X.c1.length + X.c2.length + X.c3.length, F.genera.length);
  assert.deepStrictEqual([X.c1.length > 0, X.c2.length > 0, X.c3.length > 0, X.winks], [true, true, true, []]);
  // A family or a genus takes its best species' circle, as a fish family.
  [...F.families, ...F.genera].forEach(f =>
    assert.strictEqual(f.circle, Math.min(...f.species.map(id => F.species.find(s => s.id === id).circle)), f.id)
  );
  const all = [...X.c1, ...X.c2, ...X.c3];
  assert.ok(
    all.every(n => n.startsWith('g:') && X.gen[n].name === n.slice(2)),
    'a genus is named by its scientific name'
  );
  const played = all.filter(n => X.gen[n].views.wide.length);
  assert.ok(played.length >= 5, played.join());
  // Each photo read from iNaturalist (r: 1) until the R2 step has put it on R2 (ar, no r), the original kept for the fallback.
  played.forEach(n =>
    X.gen[n].views.wide.forEach(p => assert.ok((p.r === 1 || (!p.r && p.ar > 0)) && /^https:\/\/inaturalist-open-data\./.test(p.src), p.f))
  );
  // Every circle plays: circle 1 every species, circles 2 and 3 their species with enough sure photos. The species
  // with no name yet (Goniobranchus sp. 5) counts apart: circle 1's 45 named species, plus it once judged.
  const circ = new Map(F.species.filter(s => !s.inf).map(s => [s.id, s.circle])),
    sp = c =>
      new Set(
        Object.values(GM.photos)
          .flat()
          .filter(p => circ.get(p.sp) === c)
          .map(p => p.sp)
      ).size;
  assert.deepStrictEqual([sp(1), sp(2) > 40, sp(3) > 40], [45, true, true]);
  // Every species with photos has at least the start, at most the cap (+ the documented juvenile form's places).
  const T = json('tools/seaslugs.json').photoTarget,
    by = {};
  Object.values(GM.photos)
    .flat()
    .forEach(p => (by[p.sp] = (by[p.sp] || 0) + 1));
  // A genus's genus-level photos (sp its genus id, gl): at most the cap, in play once they and its species'
  // photos reach the start (tools/seaslug_game.py), so a genus may hold fewer than the start of its own.
  const gen = new Map(F.genera.map(g => [g.id, g]));
  Object.entries(by).forEach(([sp, n]) =>
    gen.has(sp)
      ? assert.ok(n <= T.gameCap && n + gen.get(sp).species.reduce((s, id) => s + (by[id] || 0), 0) >= T.start, `${sp}: ${n}`)
      : assert.ok(n >= T.start && n <= T.gameCap + T.perJuvenileForm, `${sp}: ${n}`)
  );
  // The commonness is the area's: the Chromodorididae, most observed in the Philippines, lead the families,
  // and one of its genera the genera.
  assert.ok(X.gen['f:Chromodorididae'].cm >= Math.max(...F.families.map(f => X.gen[f.id].cm)));
  assert.strictEqual(X.gen[all.reduce((m, n) => (X.gen[n].cm > X.gen[m].cm ? n : m))].parent, 'f:Chromodorididae');
});

// The app plays the three circles at the fish's thresholds (app.js UNITS seaslug, from the tree subjects' shared
// members TREE_UNITS: slate, circles, gate treeGate).
test('UNITS seaslug: the three circles on the path, opened by the fish gate', () => {
  const A = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8'),
    T = A.slice(A.indexOf('\nconst TREE_UNITS = {'), A.indexOf('\nconst UNITS = {')),
    U = A.slice(A.indexOf('\n  seaslug: {'), A.indexOf('\ntreeAt(SUBJ.id);'));
  assert.ok(T.length > 100 && U.startsWith('\n  seaslug: {\n    ...TREE_UNITS,\n'), 'the sea slugs start from TREE_UNITS');
  assert.ok(T.includes('slate: () => (TREEU ? [...TREEU.c1, ...TREEU.c2, ...TREEU.c3] : [])'));
  assert.ok(T.includes('circles: () => (TREEU ? [TREEU.c1, TREEU.c2, TREEU.c3] : [])'));
  assert.ok(T.includes('gate: treeGate,'));
  for (const k of ['slate', 'circles', 'gate']) assert.ok(!new RegExp(`\\n {4}${k}: `).test(U), `${k}: not overridden`);
});

// The fish tools' sure rule (autosort.js treeSure, TREE_TAGS; its copies tools/fetch_fish.py sure_add, tools/fish_game.py
// TAGS) reads the sea slugs' codes too: their view v and flag f (judging/SEASLUG.md) never set a sure photo aside. The
// fish's rubric never writes v or f, so no fish judgement is read differently.
test('a sure sea-slug code with f or v is kept by the sure rule; the fish judgements never carry either', () => {
  const {treeSure} = require('../autosort.js');
  ['d1g0sl1f', 'v1g0sl1', 'p1g0sm1jf', 'o1g0slo'].forEach(jt =>
    assert.strictEqual((treeSure({jt, e: 3, k: 'best'}) || {}).keep, 'add', jt)
  );
  const py2 = body => {
    const r = spawnSync('python3', ['-c', `import json, sys\nsys.path.insert(0, ${JSON.stringify(TOOLS)})\n${body}`], {encoding: 'utf8'});
    assert.strictEqual(r.status, 0, r.stderr);
    return JSON.parse(r.stdout);
  };
  assert.deepStrictEqual(
    py2(`import fetch_fish as a, fish_game as b
print(json.dumps([[a.sure_add({'jt': x, 'e': 3, 'k': 'best'}), b.cand_sure({'jt': x, 'e': 3, 'k': 'best'})] for x in ['d1g0sl1f', 'v1g0sl1']]))`),
    [
      [true, true],
      [true, true]
    ]
  );
  // Every fish judgement: the fish rubric's views and flags only, so the wider pattern changes no fish decision.
  const fish = Object.values(json('data/suggest.json').fish || {}).filter(j => j && j.jt);
  assert.ok(fish.length > 1000, String(fish.length));
  const bad = fish.filter(j => j.jt[0] === 'v' || j.jt.slice(7).includes('f')).map(j => j.jt);
  assert.deepStrictEqual(bad, []);
});

// The licence refresh and each Publish rewrite data/seaslug-cand.json and data/suggest.json: the photos workflow builds the game
// data again after them and commits it, so a photo whose licence changed leaves the game too.
test('the photos workflow builds the sea-slug game data again and commits it', () => {
  const W = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'approved-photos.yml'), 'utf8'),
    at = s => W.indexOf(s);
  assert.ok(at('python tools/seaslug_game.py') > at('python tools/licences.py --others'), 'after the licence refresh');
  assert.ok(/git add [^\n]*data\/seaslug-cand\.json seaslug\.json seaslug-game\.json/.test(W), 'staged');
  assert.ok(W.includes('seaslug\\.json|seaslug-game\\.json'), 'allowed in the commit job');
});

// The R2 step is on (Pierre's go): its downloads go into the folder the upload
// step sends to R2, before the commit that lists them; off, the build stays offline.
test('the photos workflow: the sea slugs R2 step on, wired before the upload', () => {
  const W = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'approved-photos.yml'), 'utf8'),
    at = s => W.indexOf(s);
  assert.match(W, /^env:\n {2}SEASLUG_R2: 'on'$/m, 'on');
  assert.ok(W.includes("- if: env.SEASLUG_R2 != 'on'\n        run: python tools/seaslug_game.py\n"), 'offline while off');
  assert.ok(W.includes("- if: env.SEASLUG_R2 == 'on'\n        run: python tools/seaslug_game.py --r2 --out r2-upload\n"), 'R2 once on');
  assert.ok(at('seaslug_game.py --r2 --out r2-upload') < at('run: tools/r2_sync.sh r2-upload'), 'uploaded by the same step');
  assert.ok(at('run: tools/r2_sync.sh r2-upload') < at('name: Prepare the commit'), 'before the commit');
});

// A temporary tree as the repository has it: the tools' and the admin's data live in data/.
function mkTmp(prefix) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  fs.mkdirSync(path.join(d, 'data'));
  return d;
}
