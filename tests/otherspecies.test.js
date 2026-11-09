// Other species in view, split in two (Pierre, 2026-11-09, Q323; judging/FISH.md "Tags", count): o (no risk of taking
// another fish for the subject at the game's rank: in play) and k (confusion possible: never in play, rule P3); m, the
// code before the split, reads as not sorted yet, so as k until sorted. Both automatic routes (autosort.js fishSure,
// tools/fish_game.py judged_sure) and the pre-fetch mirrors (tools/fetch_fish.py sure_add, sure_out) follow one rule;
// Pierre's adds follow the count in force (core.js fishCount, fishOther; tools/fish_game.py count_of, other_out); the
// re-judge of the photos with m lands where it was classified.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  {execFileSync} = require('child_process');
const C = require('../core.js'),
  {fishSure, fishPlay, fishQueue} = require('../autosort.js');
const ROOT = path.join(__dirname, '..');
const read = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const py = code =>
  JSON.parse(
    execFileSync('python3', ['-c', `import sys, json; sys.path.insert(0, 'tools')\n${code}`], {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 64 << 20
    })
  );

// Every count, with and without the flags that matter (out of the water, a juvenile, the reference flag), every ease,
// every keep, sure or not.
const CASES = [];
for (const n of '1smxok')
  for (const fl of ['', 'j', 'a', 'r', 'ca'])
    for (const e of [1, 3, 5])
      for (const k of ['best', 'alt', 'dup'])
        for (const u of [null, ['code']]) CASES.push({jt: 'p1g0sm' + n + fl, e, k, ...(u ? {u} : {})});

test('the two automatic routes agree on every count: o may be in play, k never, the legacy m never until sorted', () => {
  const P = py(`import fish_game as G, fetch_fish as FF
L = json.loads(${JSON.stringify(JSON.stringify(CASES))})
print(json.dumps([[G.cand_sure(j), G.judged_sure(j['jt'], j['e']), FF.sure_add(j), FF.sure_out(j)] for j in L]))`);
  CASES.forEach((j, i) => {
    const s = fishSure(j),
      add = !!s && s.keep === 'add',
      [cand, sure, sAdd, sOut] = P[i],
      at = JSON.stringify(j);
    assert.strictEqual(cand, add, `${at}: fish_game.py cand_sure against autosort.js fishSure`);
    assert.strictEqual(sAdd, add, `${at}: fetch_fish.py sure_add against fishSure`);
    assert.strictEqual(sOut, !!s && s.keep === 'reject', `${at}: fetch_fish.py sure_out against fishSure's rejects`);
    if (!j.u && j.k !== 'dup') assert.strictEqual(sure, add, `${at}: judged_sure, the rubric's part`);
    const c = j.jt[6];
    if (c === 'k' || c === 'm') assert.ok(!add && !sure, `${at}: other species, confusion possible or not sorted: never in play`);
    if (c === 'k' && !j.u) assert.deepStrictEqual(s, {keep: 'reject', why: j.k === 'dup' ? 'dup' : 'other species'}, at);
    if (c === 'm' && !j.u && j.k !== 'dup' && !j.jt.includes('a'))
      assert.strictEqual(s, null, `${at}: not sorted: Pierre's, never decided`);
    if (c === 'o' && !j.u && j.k !== 'dup' && !j.jt.slice(7).includes('a')) assert.ok(add && sure, `${at}: no risk: in play like one fish`);
  });
  assert.deepStrictEqual([...C.FISH_COUNT.play].sort(), ['1', 'o', 's']);
  assert.deepStrictEqual(py('import fish_game as G\nprint(json.dumps([G.PLAY_COUNT, G.OTHER_COUNT]))'), [
    C.FISH_COUNT.play,
    C.FISH_COUNT.other
  ]);
});

test('the count in force: Pierre’s tag first, his legacy m refined by the pass’s o or k, the same in core.js and fish_game.py', () => {
  const tags = [null, '', 'p1g0sm1', 'p1g0sms', 'p1g0smm', 'p1g0smo', 'p1g0smk', 'p1g0smx', 'p1g0smmj'];
  const pairs = tags.flatMap(a => tags.map(b => [a, b]));
  const P = py(`import fish_game as G
L = json.loads(${JSON.stringify(JSON.stringify(pairs))})
print(json.dumps([[G.count_of(a, b), G.other_out(a, b), G.refined(a, b)] for a, b in L]))`);
  pairs.forEach(([a, b], i) => {
    assert.strictEqual(C.fishCount(a, b), P[i][0], `count of ${a} / ${b}`);
    assert.strictEqual(C.fishOther(a, b), P[i][1], `other out of ${a} / ${b}`);
  });
  assert.strictEqual(C.fishCount('p1g0smm', 'p1g0smo'), 'o', 'his legacy m sorted by the pass: no risk');
  assert.strictEqual(C.fishCount('p1g0smm', 'p1g0smk'), 'k');
  assert.strictEqual(C.fishCount('p1g0smm', null), 'm', 'not sorted yet');
  assert.ok(C.fishOther('p1g0smm', null) && C.fishOther('p1g0smm', 'p1g0smm'), 'legacy m, not sorted: out (conservative)');
  assert.ok(!C.fishOther('p1g0smo', 'p1g0smk'), 'his own o stands over the pass');
  assert.ok(C.fishOther('p1g0smk', 'p1g0smo'), 'his own k stands over the pass');
  assert.ok(!C.fishOther('p1g0smx', null), 'an unclear subject he added is not this rule');
  assert.ok(!C.fishOther(null, null), 'no tag: as before');
  assert.strictEqual(py('import fish_game as G\nprint(json.dumps(G.refined("p1g0smmj", "p1g0smoj")))'), 'p1g0smoj');
});

test('Pierre’s adds: legacy m out until sorted, o in play with the refined tag, k out; the app reads the same (core.js fishIn)', () => {
  const cand = (sp, id) => ({
    f: `fish-${sp}-cand-${id}`,
    a: '(c) Someone, some rights reserved (CC BY)',
    lic: 'cc-by',
    o: `https://www.inaturalist.org/observations/9${id}`,
    t: 'Fishus ' + sp,
    src: `https://inaturalist-open-data.s3.amazonaws.com/photos/${id}/original.jpg`
  });
  const ids = [1, 2, 3, 4, 5, 6, 7];
  const CAND = {cand: {s001: ids.map(i => cand('s001', i))}};
  const f = i => `fish-s001-cand-${i}`;
  // 1 legacy m, no pass; 2 legacy m, the pass says o; 3 legacy m, the pass says k; 4 his own o; 5 his own k (the pass
  // says o); 6 one fish; 7 a waiting candidate the pass says o (enters by itself).
  const CUR = {
    fish: {
      add: Object.fromEntries([1, 2, 3, 4, 5, 6].map(i => [f(i), 's001'])),
      tags: {[f(1)]: 'p1g0smm', [f(2)]: 'p1g0smm', [f(3)]: 'p1g0smm', [f(4)]: 'p1g0smo', [f(5)]: 'p1g0smk', [f(6)]: 'p1g0sm1'}
    }
  };
  const SUG = {
    [f(2)]: {jt: 'p1g0smo', e: 4, k: 'best'},
    [f(3)]: {jt: 'p1g0smk', e: 4, k: 'best'},
    [f(5)]: {jt: 'p1g0smo', e: 4, k: 'best'},
    [f(7)]: {jt: 'p1g0smo', e: 4, k: 'best'}
  };
  const R = py(`import fish_game as G
cur, cand, sug = json.loads(${JSON.stringify(JSON.stringify(CUR))}), json.loads(${JSON.stringify(JSON.stringify(CAND))}), json.loads(${JSON.stringify(JSON.stringify(SUG))})
print(json.dumps([G.record(s, p, cur['fish'], sug, o, None, r) for s, p, o, r in G.in_play(cur, cand, sug)]))`);
  assert.deepStrictEqual(
    R.map(r => r.f),
    [f(2), f(4), f(6), f(7)],
    'in play: the legacy m sorted o, his o, one fish, the sure candidate with o'
  );
  assert.strictEqual(R[0].jt, 'p1g0smo', 'the game record carries the sorted count');
  // The app, on the records the build wrote and on the ones it left out (an older list), reads the same.
  const gone = C.fishGone(CUR);
  const rec = (i, jt, auto) => ({f: f(i), sp: 's001', jt, ...(auto ? {auto} : {})});
  const recs = [
    rec(1, 'p1g0smm'),
    rec(2, 'p1g0smo'),
    rec(3, 'p1g0smk'),
    rec(4, 'p1g0smo'),
    rec(5, 'p1g0smk'),
    rec(6, 'p1g0sm1'),
    rec(7, 'p1g0smo', 'cand')
  ];
  assert.deepStrictEqual(
    recs.filter(p => C.fishIn(CUR.fish, p, gone, CUR.fish.tags[p.f])).map(p => p.f),
    [f(2), f(4), f(6), f(7)]
  );
  // An older list still holding his legacy m (before the build sorted it): out until the build runs (conservative).
  assert.ok(!C.fishIn(CUR.fish, rec(2, 'p1g0smm'), gone));
  // The players' copy has no tags (tools/curplay.py): the record's count alone decides, the same result on the built list.
  assert.deepStrictEqual(
    recs.filter(p => C.fishIn({...CUR.fish, tags: undefined}, p, gone)).map(p => p.f),
    [f(2), f(4), f(6), f(7)]
  );
  // A stopgap photo with k never joins; with o it does.
  const P = C.fishPhotos(
    {
      t01: [
        {f: 'fi1', sp: 's001', src: 'x', jt: 'p1g0smk'},
        {f: 'fi2', sp: 's001', src: 'x', jt: 'p1g0smo'}
      ]
    },
    {},
    {fish: {}}
  );
  assert.deepStrictEqual(
    P.t01.map(p => p.f),
    ['fi2']
  );
});

test('the re-judge of 2026-11-09: every photo with other species is sorted, and lands where it was classified', () => {
  const CUR = read('curation.json'),
    FC = CUR.fish || {},
    S = read('suggest.json').fish || {},
    J = read('tools/fish_judge.json');
  // Pierre's adds with the legacy m: every one sorted by the pass (o or k).
  const legacy = Object.keys(FC.tags || {}).filter(x => FC.tags[x][6] === 'm' && C.fishOn(FC, x, (FC.add || {})[x]));
  legacy.forEach(x => assert.match(String((S[x] || {}).jt || '').charAt(6), /^[ok]$/, `${x}: Pierre's add with m not sorted`));
  // The build plays the o ones and none of the k ones.
  const plan = py(`import fish_game as G
fish, cur, cand, sug, refs, codes, crops, rkeep = G.inputs('.')
todo, keep, _ = G.plan(fish, cur, cand, sug, G.load('.', 'fish-game.json', {'photos': {}}), refs, codes, crops, rkeep=rkeep)
print(json.dumps({r['f']: r.get('jt') for r in [r for r, _, _ in todo] + list(keep.values())}))`);
  legacy.forEach(x => {
    const c = S[x].jt[6];
    assert.strictEqual(x in plan, c === 'o', `${x}: sorted ${c}, ${x in plan ? 'in play' : 'out'}`);
    if (c === 'o') assert.strictEqual(plan[x][6], 'o', `${x}: its game record carries o`);
  });
  Object.entries(plan).forEach(([x, jt]) => assert.ok(!/^[km]$/.test(String(jt || '').charAt(6)), `${x}: ${jt} in play`));
  // No game, reference or stopgap code left unsorted.
  Object.values(J.photos).forEach(m => Object.entries(m).forEach(([x, c]) => assert.notStrictEqual(c[6], 'm', `${x}: ${c}`)));
  // No candidate still waiting with the legacy m (a new judgement never types it: tools/judging_fish.py --check).
  const done = new Set(['add', 'seen', 'exclude', 'out'].flatMap(k => Object.keys(FC[k] || {})));
  const cand = read('fish-cand.json').cand;
  Object.values(cand).forEach(L =>
    L.forEach(p => {
      const j = S[p.f];
      if (j && !done.has(p.f)) assert.notStrictEqual(j.jt[6], 'm', `${p.f}: waiting with the legacy m`);
    })
  );
});

test('the Candidates queue counts no add held out for other species (Codex review #839): it fills the target like fishRun', () => {
  const cands = {s1: Array.from({length: 9}, (_, i) => ({f: 'fish-s1-cand-' + i, o: 'o' + i}))},
    F = {
      add: Object.fromEntries(cands.s1.slice(0, 8).map(p => [p.f, 's1'])),
      tags: Object.fromEntries(cands.s1.slice(0, 8).map((p, i) => [p.f, i < 4 ? 'p1g0smk' : 'p1g0smm']))
    },
    // the pass sorts two of the legacy m: one o (in play), one k
    sug = {'fish-s1-cand-4': {jt: 'p1g0smo', e: 4, k: 'best'}, 'fish-s1-cand-5': {jt: 'p1g0smk', e: 4, k: 'best'}};
  assert.strictEqual(fishPlay(cands, F, null, sug).s1.size, 1, 'only the add sorted o is in play');
  assert.ok(!fishPlay(cands, F).s1, 'with no pass, the legacy m stays out too: nothing in play');
  const q = fishQueue(cands, sug, {s1: {}}, F).find(x => x.p.f === 'fish-s1-cand-8');
  assert.ok(q && q.n === 1 && !q.full, `the waiting candidate is offered under the target: ${JSON.stringify(q && {n: q.n, full: q.full})}`);
});

test('the fetcher frees the room of an add held out for other species (Codex review #839), as the game leaves it out', () => {
  const R = py(`import fetch_fish as FF
cur = {'fish': {'add': {'a': 's1', 'b': 's1', 'c': 's1', 'd': 's1', 'e': 's1'},
                'tags': {'a': 'p1g0smk', 'b': 'p1g0smo', 'c': 'p1g0smm', 'd': 'p1g0smm', 'e': 'p1g0sm1'}}}
sug = {'fish': {'d': {'jt': 'p1g0smo', 'e': 4, 'k': 'best'}, 'e': {'jt': 'p1g0smk', 'e': 4, 'k': 'best'}}}
gone, _ = FF.state(cur, sug)
print(json.dumps({f: gone(f) for f in 'abcde'}))`);
  assert.deepStrictEqual(
    R,
    {a: true, b: false, c: true, d: false, e: false},
    'k and the unsorted m free room; o, a sorted o and his one fish hold it'
  );
});
