require('./slot.js').testGuard();
// Photo stats › Difficulty for a subject with ratings of its own (fish admin at parity, rule S1): one page for every subject
// (statsPhotos, diffHtml), each subject's numbers in one shape (diffMain, diffOwn); the sheet's own ratings read as the app
// reads them (ownRead: the reply names the subject and comes from SUBJECTS stats' script version), the rated photos as the
// registry holds them (diffRows), the photos in play (treePlayOf); the page among every subject's pages.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  block = require('./block');
const {SUBJECTS} = require('../core.js');
const ROOT = path.join(__dirname, '..'),
  read = f => fs.readFileSync(path.join(ROOT, f), 'utf8'),
  src = read('admin.js');

const run = code => {
  const ctx = {treePid: require('../core.js').treePid};
  vm.runInNewContext(
    [
      block(src, 'const nAns = ', '\n', {file: 'admin.js', through: true}),
      block(src, 'const origin = ', '\n', {file: 'admin.js', through: true}),
      block(src, 'function ownRead(j, S) {', '\n}\n', {file: 'admin.js', through: true}),
      block(src, 'function ownMerge(ST, G, key, rowOf) {', '\n}\n', {file: 'admin.js', through: true}),
      block(src, 'function diffRows(ST, ph, min, lane) {', '\n}\n', {file: 'admin.js', through: true}),
      block(src, 'const treePlayOf = ', '\n  );\n', {file: 'admin.js', through: true}),
      code
    ].join('\n'),
    ctx
  );
  return JSON.parse(JSON.stringify(ctx.r));
};

test('ownRead: the reply names the subject and comes from the script version that serves its ratings; any other is "old"', () => {
  const S = {id: 'fish', stats: 189},
    j = {ok: true, s: 'fish', v: 196, photos: {fa: [0.1, 1, 1, 2, 'f:A']}, gd: {'f:A': [0.2, 9]}};
  const r = o => run(`this.r = ownRead(${JSON.stringify(o)}, ${JSON.stringify(S)});`);
  assert.deepStrictEqual(r(j), {photos: j.photos, gd: j.gd, v: 196});
  assert.deepStrictEqual(r({ok: true, s: 'fish', v: 189, photos: {}}), {photos: {}, gd: {}, v: 189}, 'the version itself is enough');
  assert.deepStrictEqual(
    r({ok: true, v: 196, photos: {}}),
    {old: true, v: 196, err: 'script'},
    'no subject named: the corals’ reply of an older script'
  );
  assert.deepStrictEqual(r({...j, s: 'seaslug'}), {old: true, v: 196, err: 'script'}, 'another subject’s');
  assert.deepStrictEqual(r({...j, v: 188}), {old: true, v: 188, err: 'script'}, 'before the version');
  assert.deepStrictEqual(r({ok: false, v: 196}), {old: true, v: 196, err: 'script'});
  assert.deepStrictEqual(r(null), {old: true, err: 'offline'});
});

test('diffRows: the rated photos the registry holds with min answers or more, each in its unit’s row and the subject’s one view', () => {
  const ST = {
      a: [0.5, 2.1, 1, 3, 'f:A'],
      b: [-0.3, 0.4, 0.4, 1, 'g:X'],
      gone: [1, 5, 1, 6, 'f:A'], // not in the registry: left out
      c: [0.1, 5, 4, 6] // an older reply: no fifth element
    },
    ph = {a: {entry: 'f:A', loc: 'dauin'}, b: {entry: 'f:A', own: 1}, c: {entry: 'f:B'}};
  const L = (min, S = ST) =>
    run(`this.r = diffRows(${JSON.stringify(S)}, ${JSON.stringify(ph)}, ${min}, 'wide');`).map(p => [p.f, p.u, p.src, p.d, p.n, p.ok, p.a]);
  assert.deepStrictEqual(L(1), [
    ['a', 'f:A', 'dauin', 0.5, 2.1, 1, 3],
    ['b', 'f:A', 'own', -0.3, 0.4, 0.4, 1],
    ['c', 'f:B', 'world', 0.1, 5, 4, 6]
  ]);
  assert.deepStrictEqual(
    L(3).map(x => x[0]),
    ['a', 'c'],
    'the filter reads the answers (the 4th element), not the weighed count'
  );
  assert.strictEqual(run(`this.r = diffRows(null, {}, 1, 'wide');`).length, 0);
  assert.ok(run(`this.r = diffRows(${JSON.stringify(ST)}, ${JSON.stringify(ph)}, 1, 'wide');`).every(p => p.lane === 'wide'));
});

test('ownMerge: a photo asked under its game id and its candidate id is one photo, each taken to the unit of its row', () => {
  // [difficulty, weighed answers, weighed right, answers, the unit whose offset the difficulty carries]
  const ST = {
      fi100: [1.0, 3, 2, 4, 'f:A'], // the game id
      'fish-s1-cand-100': [2.0, 1, 0, 2, 'f:A'], // the candidate id of the same photo
      fi200: [1.5, 2, 1, 3, 'g:X'], // rated at its genus (offset -0.5); its row is the family (offset 0.25): 1.5 + 0.5 + 0.25
      fi300: [0.7, 2, 1, 3, 'g:Q'], // rated at a genus the sheet gives no offset: stays as served
      fi400: [0.2, 1, 1, 1, 'f:A'] // not in the registry: no row, stays as served
    },
    G = {'f:A': [0.25, 30], 'g:X': [-0.5, 8]};
  const row = {i100: 'f:A', i200: 'f:A', i300: 'f:A'},
    M = run(`this.r = ownMerge(${JSON.stringify(ST)}, ${JSON.stringify(G)}, treePid, k => (${JSON.stringify(row)})[k]);`);
  assert.deepStrictEqual(Object.keys(M).sort(), ['i100', 'i200', 'i300', 'i400'], 'one entry per photo, by treePid');
  // weighed by the weighed answers (3 and 1): (1.0 * 3 + 2.0 * 1) / 4, answers 4 + 2, weighed right 2 + 0
  assert.deepStrictEqual(M.i100, [1.25, 4, 2, 6, 'f:A']);
  assert.deepStrictEqual(M.i200, [2.25, 2, 1, 3, 'f:A'], 'a genus-rated photo read as a family question');
  assert.deepStrictEqual(M.i300, [0.7, 2, 1, 3, 'g:Q']);
  assert.deepStrictEqual(M.i400, [0.2, 1, 1, 1, 'f:A']);
  assert.deepStrictEqual(run(`this.r = ownMerge(null, {}, treePid, () => '');`), {});
  // and the rows read the merged answers: i100 has 6, so it passes a 5-answer filter its two halves each miss
  const ph = {i100: {entry: 'f:A'}, i200: {entry: 'f:A'}};
  assert.deepStrictEqual(
    run(`this.r = diffRows(${JSON.stringify(M)}, ${JSON.stringify(ph)}, 5, 'wide');`).map(p => [p.f, p.a]),
    [['i100', 6]]
  );
});

test('treePlayOf: the species of a family not out and its genera’s genus-level photos, each with its family', () => {
  const units = [
      {id: 'f:A', species: ['s1', 's2', 's3'], genera: [{id: 'g:X'}, {id: 'g:Y'}]},
      {id: 'f:B', species: ['s4'], genera: []}
    ],
    sp = {s1: {}, s2: {out: 1}, s3: {}, s4: {}},
    D = {play: {s1: [{f: 'a'}], s2: [{f: 'b'}], s3: [], s4: [{f: 'd'}], 'g:X': [{f: 'c'}], 's9': [{f: 'z'}]}};
  const r = run(`this.r = treePlayOf(${JSON.stringify(D)}, ${JSON.stringify(units)}, ${JSON.stringify(sp)}).map(x => [x.p.f, x.u.id]);`);
  assert.deepStrictEqual(r, [
    ['a', 'f:A'],
    ['c', 'f:A'],
    ['d', 'f:B']
  ]);
});

test('Photo stats › Difficulty is every subject’s page, read from its own ratings when the subject has them (rule S1, rule D4)', () => {
  const EVERY = /const EVERY = \[([^\]]*)\]/.exec(src)[1];
  assert.match(EVERY, /'photos\/stats\/difficulty'/);
  // a subject names the script version that serves its ratings; the corals' are the sheet's main ?stats=1
  assert.deepStrictEqual(
    SUBJECTS.filter(S => S.stats).map(S => S.id),
    ['fish', 'seaslug']
  );
  assert.ok(!SUBJECTS.find(S => !S.hash).stats, 'the corals read the main ratings');
  assert.match(src, /M = S\.stats \? diffOwn\(S, here\) : diffMain\(\);\n {2}if \(M\) diffHtml\(M\);/);
  // the page reads the ratings alone, not the answer log (the router comes before renderStats)
  const r = src.indexOf("cur === 'photos/stats/difficulty' && ASUBJ.stats"),
    st = src.indexOf("if (modeKey() === 'stats') return renderStats();");
  assert.ok(r > 0 && r < st, 'the own ratings page is routed before renderStats');
  // the shared page names no subject
  const page = block(src, 'function diffHtml(M) {', '\n}\n', {file: 'admin.js', through: true});
  assert.doesNotMatch(page, /VIEW_T|ORIGIN_T|genusHref|\bGD\b|STATS\b|\.sheets\b|DATA\./);
  // the fish page gets its own help; the corals' keep theirs
  assert.match(src, /'photos\/stats\/difficulty': ASUBJ\.stats \? 'ownstatsph' : 'statsph'/);
  // the demo answers &s= with ratings of its own from the version that serves them, else with the corals' like an older script
  const demo = read('admin-demo.js');
  assert.match(demo, /if \(!X \|\| !X\.stats \|\| V < X\.stats \|\| !L\) return stats\(\);/);
});
