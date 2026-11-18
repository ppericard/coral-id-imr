require('./slot.js').testGuard();
// The mimicry class (docs/LEARNING.md "The mimicry class"): the pairs where a source says one species resembles another
// (tools/fish_lookalikes.json, written into fish.json lookalikes by tools/build_fish.py lookalikes), the entries app.js
// mimLay puts on their families, the draw's gate (model.js mimOf, mimAt in varOf: from Open Water once a unit of the
// species resembled is met, at Advanced otherwise) and the card's photos (quiz.js mimPics, mimCardOf).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  {spawnSync} = require('child_process');
const C = require('../core.js');
const cut = require('./block.js');
const {engine} = require('./rareease.js');
const ROOT = path.join(__dirname, '..'),
  rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const F = JSON.parse(rd('fish.json')),
  SRC = JSON.parse(rd('tools/fish_lookalikes.json'));

test('fish.json lookalikes: the decided pairs M1-M7, each a resemblance between two game species, every mark sourced', () => {
  const sp = new Map(F.species.map(s => [s.id, s])),
    L = F.lookalikes || [];
  assert.deepStrictEqual(
    L.map(r => r.id),
    ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7']
  );
  const want = {
    M1: 'Acanthurus pyroferus|Centropyge vroliki',
    M2: 'Paraluteres prionurus|Canthigaster valentini',
    M3: 'Aspidontus taeniatus|Labroides dimidiatus',
    M4: 'Plagiotremus rhinorhynchos|Labroides dimidiatus',
    M5: 'Petroscirtes breviceps|Meiacanthus grammistes',
    M6: 'Scolopsis bilineata|Meiacanthus grammistes',
    M7: 'Pholidichthys leucotaenia|Plotosus lineatus'
  };
  L.forEach(r => {
    assert.strictEqual(sp.get(r.a).name + '|' + sp.get(r.b).name, want[r.id], r.id);
    assert.ok(sp.get(r.a).circle && sp.get(r.b).circle, `${r.id}: both in the game`);
    assert.strictEqual(r.kind, 'resembles');
    assert.ok(r.says.length > 0 && r.marks.length > 0, `${r.id}: its sources and at least one mark`);
    r.marks.forEach(m => {
      assert.ok(m.src.length > 0 && m.src.every(s => s.t), `${r.id}: '${m.t}' sourced`);
      assert.ok(!/\d/.test(m.t) && !/mimic/i.test(m.t), `${r.id}: '${m.t}': no digit, never "mimic"`);
    });
  });
  // The stages the sources name: the juveniles of the surgeonfish, the fangblenny, the bream and the convict blenny
  assert.deepStrictEqual(
    L.filter(r => r.st.a === 'juvenile').map(r => r.id),
    ['M1', 'M4', 'M6', 'M7']
  );
  // Every quote is in the hand-kept file, never in fish.json
  SRC.pairs.forEach(r => [...r.says, ...r.marks].forEach(x => assert.ok(String(x.q || '').trim(), `${r.id}: a quote`)));
  assert.ok(!rd('fish.json').includes('"q":'));
  // The out-of-region flag: the surgeonfish, the cleaner wrasse and the false cleanerfish, each with its reason and sources
  const reg = F.species.filter(s => s.region);
  assert.deepStrictEqual(reg.map(s => s.id).sort(), ['s035', 's272', 's485']);
  assert.ok(reg.every(s => s.region.why && s.region.src.length > 0));
});

test('the build refuses a mark with a digit or the word mimic, an unsourced mark, and a species out of the game', () => {
  const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'mim-')),
    run = pairs => {
      const f = path.join(tmp, 'looks.json');
      fs.writeFileSync(f, JSON.stringify({src: {s: {t: 'A source', u: 'https://example.org/'}}, pairs}));
      const code = `import json, sys\nsys.path.insert(0, ${JSON.stringify(path.join(ROOT, 'tools'))})\nimport build_fish as b\no = json.load(open(${JSON.stringify(path.join(ROOT, 'fish.json'))}))\nb.lookalikes(o, ${JSON.stringify(f)})\nprint(json.dumps(o.get('lookalikes')))`;
      return spawnSync('python3', ['-c', code], {encoding: 'utf8'});
    },
    pair = mark => [
      {id: 'X1', a: 's035', b: 's027', kind: 'resembles', st: {a: 'juvenile', b: 'all'}, says: [{src: 's', q: 'a quote'}], marks: [mark]}
    ];
  const ok = run(pair({side: 'b', t: 'A spine on the cheek', src: ['s'], q: 'a quote'}));
  assert.strictEqual(ok.status, 0, ok.stderr);
  assert.deepStrictEqual(JSON.parse(ok.stdout)[0].marks, [
    {side: 'b', t: 'A spine on the cheek', src: [{t: 'A source', u: 'https://example.org/'}]}
  ]);
  for (const [why, mark] of [
    ['a digit', {side: 'b', t: 'Has 2 stripes', src: ['s'], q: 'q'}],
    ['mimic', {side: 'a', t: 'A mimic of the angelfish', src: ['s'], q: 'q'}],
    ['no source', {side: 'b', t: 'A spine', src: [], q: 'q'}],
    ['no quote', {side: 'b', t: 'A spine', src: ['s']}]
  ])
    assert.notStrictEqual(run(pair(mark)).status, 0, why);
  const out = run([{...pair({side: 'b', t: 'A spine', src: ['s'], q: 'q'})[0], b: 's999'}]);
  assert.notStrictEqual(out.status, 0, 'a species not in fish.json');
  fs.rmSync(tmp, {recursive: true, force: true});
});

// app.js mimLay on fish.json, over a units' table holding its families.
const mimLay = new Function(cut(rd('app.js'), 'function mimLay(X, f) {', '\n}\n', {through: 1, file: 'app.js'}) + '\nreturn mimLay;')();

test('mimLay: each resembling species on its family, with the units of the species it resembles', () => {
  const X = {gen: Object.fromEntries(F.families.map(f => [f.id, {id: f.id}]))};
  mimLay(X, F);
  const m = X.gen['f:Surgeonfishes'].mim;
  assert.strictEqual(m.length, 1);
  assert.deepStrictEqual(
    {sp: m[0].sp, st: m[0].st, m: m[0].m, fb: m[0].fb, ra: m[0].ra, rb: m[0].rb, na: m[0].na.sci, nb: m[0].nb.sci},
    {
      sp: 's035',
      st: 'juvenile',
      m: ['s027', 'g:Centropyge', 'f:Angelfishes'],
      fb: 'f:Angelfishes',
      ra: true,
      rb: false,
      na: 'Acanthurus pyroferus',
      nb: 'Centropyge vroliki'
    }
  );
  assert.deepStrictEqual(
    X.gen['f:Blennies'].mim.map(x => x.pair.id),
    ['M3', 'M4', 'M5']
  );
  assert.ok(!X.gen['f:Angelfishes'].mim, 'the species resembled carries nothing');
  // A subject whose file has no pairs (the sea slugs today): nothing laid
  const Y = {gen: {a: {}}};
  mimLay(Y, {species: []});
  assert.ok(!Y.gen.a.mim);
});

// A family's pool: 40 observations of other species, 20 adults and 20 juveniles of the resembling species s1.
const pool = () => {
  const L = [];
  for (let i = 0; i < 40; i++) L.push({f: `o${i}`, o: `oo${i}`, e: 4, jt: 'p1g0sl14', sp: 's0', t: 'Xus o'});
  for (let i = 0; i < 40; i++)
    L.push({f: `m${i}`, o: `om${i}`, e: 4, jt: 'p1g0sl14', sp: 's1', t: 'Yus m', ...(i % 2 ? {ph: 'juvenile'} : {})});
  return L;
};
const ent = st => [{sp: 's1', st, m: ['s9', 'g:Zus', 'f:Z'], fb: 'f:Z', pair: {id: 'X1', b: 's9', st: {a: st, b: 'all'}}}];
const share = (E, N = 400) => {
  const n = {adult: 0, juv: 0};
  for (let i = 0; i < N; i++)
    E.photoSet('u', null, 0, 4, 'k4').shown.forEach(x => {
      if (/^m/.test(x.f)) n[Number(x.f.slice(1)) % 2 ? 'juv' : 'adult']++;
    });
  return {adult: n.adult / N, juv: n.juv / N};
};

test('the gate: from Open Water once the species resembled is met, at Advanced while it is not', () => {
  const met = id => id === 'f:Z',
    none = () => false;
  // Every photo of the species (st all): none before Open Water, met or not
  assert.deepStrictEqual(share(engine('fish', pool(), {score: 0.3, mim: ent('all'), met})), {adult: 0, juv: 0});
  // From Open Water, once met: some, in stages
  const mid = share(engine('fish', pool(), {score: 0.65, mim: ent('all'), met}));
  assert.ok(mid.adult > 0 && mid.juv > 0, JSON.stringify(mid));
  // Not met: none until Advanced, then all
  assert.deepStrictEqual(share(engine('fish', pool(), {score: 0.79, mim: ent('all'), met: none})), {adult: 0, juv: 0});
  const adv = share(engine('fish', pool(), {score: 0.8, mim: ent('all'), met: none}));
  assert.ok(adv.adult > 0.2 && adv.juv > 0.2, JSON.stringify(adv));
  // Its juveniles only (st juvenile): the adults of the species come as any photo, from the start
  const j = share(engine('fish', pool(), {score: 0.3, mim: ent('juvenile'), met}));
  assert.ok(j.adult > 0.2 && j.juv === 0, JSON.stringify(j));
  // A late-class juvenile that resembles another species comes from Open Water once the species is met (the class
  // timing, Advanced, while it is not)
  const late = {cls: 'mixed', late: ['Yus m']};
  assert.ok(share(engine('fish', pool(), {score: 0.65, juv: late, mim: ent('juvenile'), met})).juv > 0);
  assert.strictEqual(share(engine('fish', pool(), {score: 0.65, juv: late, mim: ent('juvenile'), met: none})).juv, 0);
  // A pair inside the unit asked (its model's family is the unit: both blennies asked as the family): nothing held back
  const inside = [{...ent('all')[0], m: ['s9', 'g:Zus', 'u']}];
  const s = share(engine('fish', pool(), {score: 0.3, mim: inside, met: () => true}));
  assert.ok(s.adult > 0.2 && s.juv === 0, `the adults come from the start, the juveniles on their own ramp: ${JSON.stringify(s)}`);
  // The unit asked never opens the gate by itself: its model's other units must be met
  assert.deepStrictEqual(share(engine('fish', pool(), {score: 0.65, mim: ent('all'), met: id => id === 'u'})), {adult: 0, juv: 0});
  assert.strictEqual(JSON.stringify(engine('fish', pool(), {}).MIM_AT), JSON.stringify({met: [0.5, 0.8], alone: [0.8, 0.8]}));
});

test('the draw only: the variant groups for "Learned" and the sheet’s table are the phases’, with or without the class', () => {
  const late = {cls: 'mixed', late: ['Yus m']},
    A = engine('fish', pool(), {score: 0.9, juv: late, mim: ent('all'), met: () => false}),
    B = engine('fish', pool(), {score: 0.9, juv: late});
  assert.deepStrictEqual(A.varUnitOf('u'), B.varUnitOf('u'));
  assert.deepStrictEqual(A.varLeft('u'), B.varLeft('u'));
  assert.deepStrictEqual(A.varLeft('u'), ['juv']);
  // At the exam's bar every photo of the class is in: nothing waits on the species resembled
  const V = A.varOf('u', pool());
  assert.ok(pool().every(p => V.f(p) === 1));
});

// quiz.js mimPhotoOk, mimPics, mimCardOf with the game around them stubbed.
function card(G, seenIds = []) {
  const src = rd('quiz.js'),
    code = cut(src, "const MIMC = {KEY: 'mim'};", '\nfunction mimArm(', {file: 'quiz.js'});
  const stubs = {
    SUBJ: {id: 'fish'},
    store: {get: () => null},
    subjDev: (s, k) => s + k,
    toldHas: t => seenIds.some(id => t.endsWith('-' + id)),
    phaseOf: C.phaseOf,
    GX: n => G[n],
    mimOf: (n, p) => ((G[n] || {}).mim || []).find(m => m.sp === p.sp && (m.st !== 'juvenile' || C.phaseOf(p) === 'juvenile')) || null
  };
  return new Function(...Object.keys(stubs), `${code}\nreturn {mimPhotoOk, mimPics, mimCardOf, mimSeen};`)(...Object.values(stubs));
}

test('the card: its photos from the region, one subject in view; it waits when none may show; once per pair', () => {
  const m = {sp: 's1', st: 'juvenile', fb: 'f:B', ra: true, rb: false, pair: {id: 'M1', b: 's2', st: {a: 'juvenile', b: 'all'}}},
    jw = {f: 'jw', sp: 's1', ph: 'juvenile', loc: 'world', jt: 'p1g0sl1j'},
    jp = {f: 'jp', sp: 's1', ph: 'juvenile', loc: 'ph', jt: 'p1g0sl1j'},
    bj = {f: 'bj', sp: 's2', ph: 'juvenile', loc: 'world'},
    ba = {f: 'ba', sp: 's2', loc: 'world', jt: 'p1g0sl1'},
    bm = {f: 'bm', sp: 's2', loc: 'dauin', jt: 'p1g0sloo'};
  const G = {u: {mim: [m], views: {wide: [jw, jp]}}, 'f:B': {views: {wide: [bj, bm, ba]}}},
    Q = card(G);
  assert.ok(!Q.mimPhotoOk(jw, true) && Q.mimPhotoOk(jw, false), 'a world photo of a regional species: never on the card');
  assert.ok(!Q.mimPhotoOk(bm, false), 'other species in view (rule P3)');
  assert.ok(!Q.mimPhotoOk({f: 'x', multi: 1}, false));
  // The photo answered is from outside the region: the card shows another juvenile of the species, from the region
  assert.deepStrictEqual(
    Q.mimPics(m, jw, 'u').map(p => p.f),
    ['jp', 'ba']
  );
  assert.deepStrictEqual(Q.mimCardOf([{n: 'u', p: jw}], () => false).p.f, 'jw');
  // An adult of the surgeonfish is not of the class: no card
  assert.strictEqual(
    Q.mimCardOf([{n: 'u', p: {f: 'a', sp: 's1'}}], () => false),
    null
  );
  // No photo from the region: the card waits
  const W = card({u: {mim: [m], views: {wide: [jw]}}, 'f:B': {views: {wide: [ba]}}});
  assert.strictEqual(
    W.mimCardOf([{n: 'u', p: jw}], () => false),
    null
  );
  // Seen on another device of the account: not again
  assert.ok(card(G, ['M1']).mimSeen('M1'));
  assert.strictEqual(card(G, ['M1']).mimCardOf([{n: 'u', p: jp}], card(G, ['M1']).mimSeen), null);
  // A regional species: a photo from near Dauin first, even over the photo answered from the Philippines, and even when
  // its subject is small in the frame; no watermark
  assert.ok(!Q.mimPhotoOk({f: 'w', jt: 'p1g0sl1w'}, false), 'a watermark (judged flag w)');
  const jd = {f: 'jd', sp: 's1', ph: 'juvenile', loc: 'dauin', jt: 'p1g0ss1j'},
    D = card({u: {mim: [m], views: {wide: [jw, jp, jd]}}, 'f:B': {views: {wide: [ba]}}});
  assert.deepStrictEqual(
    D.mimPics(m, jp, 'u').map(p => p.f),
    ['jd', 'ba']
  );
  // A pair whose juveniles are the ones resembled shows one of them
  const m4 = {...m, ra: false, pair: {id: 'M4', b: 's2', st: {a: 'juvenile', b: 'juvenile'}}};
  assert.deepStrictEqual(
    Q.mimPics(m4, jw, 'u').map(p => p.f),
    ['jw', 'bj']
  );
});

test('the card’s mark is cleared at sign-out with the account (rule D7) and its words never call it a mimic', () => {
  assert.ok(rd('sync.js').includes("subjDev(S.id, 'mim')"));
  const show = cut(rd('quiz.js'), 'function mimShow(', '\n}\n', {through: 1, file: 'quiz.js'});
  assert.ok(!/mimic/i.test(show.replace(/mim[A-Z]\w*|\bmim\b/g, '')), 'the card says resembles');
});
