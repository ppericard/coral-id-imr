// core.js: curation merge (admin Publish), progress merge (two devices), photo Elo (same as Code.gs stats_).
const test = require('node:test'), assert = require('node:assert');
const {merge3, mergeOld, mergeProgress, eloOf} = require('../core.js');
const {loadCodeGs} = require('./gas.js');

test('merge3: my changes win, changes published elsewhere are kept', () => {
  const base = {genera: {A: {cover: 'a1', feat: {wide: ['x', 'y']}}}, quality: {f1: 2}};
  const mine = {genera: {A: {cover: 'a2', feat: {wide: ['x', 'y']}}}, quality: {f1: 2, f2: 3}};
  const theirs = {genera: {A: {cover: 'a1', feat: {wide: ['z']}}, B: {ok: true}}, quality: {f1: 1}};
  const conf = [];
  assert.deepStrictEqual(merge3(base, mine, theirs, conf),
    {genera: {A: {cover: 'a2', feat: {wide: ['z']}}, B: {ok: true}}, quality: {f1: 1, f2: 3}});
  assert.deepStrictEqual(conf, []);
});

test('merge3: same key changed on both sides: mine wins and the path is reported', () => {
  const conf = [];
  const out = merge3({quality: {f: 2}}, {quality: {f: 3}}, {quality: {f: 1}}, conf);
  assert.strictEqual(out.quality.f, 3);
  assert.deepStrictEqual(conf, [['quality', 'f']]);
});

test('merge3: a key I removed goes, unless the other side changed it', () => {
  assert.deepStrictEqual(merge3({exclude: {f: 'x'}}, {}, {exclude: {f: 'x'}}), {});
  assert.deepStrictEqual(merge3({exclude: {f: 'x'}}, {}, {exclude: {f: 'y'}}), {});  // conflict: mine (removed) wins
});

test('merge3 never returns objects shared with its inputs', () => {
  const theirs = {quality: {f: 1}}, out = merge3({}, {}, theirs);
  out.quality.f = 3;
  assert.strictEqual(theirs.quality.f, 1);
});

test('mergeOld only adds', () => {
  assert.deepStrictEqual(mergeOld({genera: {A: {cover: 'm'}}}, {genera: {A: {ok: true}, B: {}}}), {genera: {A: {ok: true, cover: 'm'}, B: {}}});
});

test('mergeProgress: answers from both devices add up, nothing counted twice', () => {
  const B = {Acropora: {ok: 10, ko: 2, ps: {p1: [5, 4]}, conf: {Porites: 1}}};
  const P = {Acropora: {ok: 13, ko: 2, ps: {p1: [6, 5], p2: [1, 1]}, conf: {Porites: 1}, th: 0.4, h: '111'}};
  const R = {Acropora: {ok: 15, ko: 3, ps: {p1: [8, 6]}, conf: {Porites: 2}, th: 0.1, h: '110'}, Porites: {ok: 1, ko: 0}};
  const M = mergeProgress(B, P, R);
  assert.strictEqual(M.Acropora.ok, 18); assert.strictEqual(M.Acropora.ko, 3);
  assert.deepStrictEqual(M.Acropora.ps, {p1: [9, 7], p2: [1, 1]});
  assert.deepStrictEqual(M.Acropora.conf, {Porites: 2});
  assert.strictEqual(M.Acropora.th, 0.4, 'this device answered since B: its model wins');
  assert.deepStrictEqual(M.Porites, {ok: 1, ko: 0, streak: 0});
});

test('mergeProgress: untouched locally, the pulled record wins', () => {
  const B = {A: {ok: 1, ko: 0, th: 0}}, P = {A: {ok: 1, ko: 0, th: 0}}, R = {A: {ok: 4, ko: 1, th: 0.7}};
  assert.deepStrictEqual(mergeProgress(B, P, R), {A: {ok: 4, ko: 1, th: 0.7, streak: 0}});
});

test('eloOf gives the same photo ratings as Code.gs stats_', () => {
  const s = loadCodeGs();
  const photos = ['acropora-1', 'acropora-2', 'porites-1', 'porites-2', 'favia-1'];
  let n = 0;
  for (const who of ['Ana', 'Ben']) for (let i = 0; i < 40; i++) {
    const ph = [photos[i % 5], photos[(i * 3 + 1) % 5]].slice(0, 1 + (i % 2));
    s.post({name: who, pin: '1234', data: {}, summary: {}, answers: [{id: 'a' + (n++), t: new Date(Date.UTC(2026, 10, 1, 0, 0, n)).toISOString(), g: 'Acropora', a: i % 3 ? 'Acropora' : 'Porites', ok: i % 3 ? 1 : 0, m: ['quiz-duel', 'quiz', 'quiz|k2', 'quiz|k3'][i % 4], ph: ph.join(' ')}]});
  }
  const rows = s.get({answers: '1'}).rows, sheet = s.get({stats: '1'}).photos;
  assert.deepStrictEqual(eloOf(rows), sheet);
});

test('a quiz question with easy wrong choices (quiz|k2) is rated with a 1/2 guess', () => {
  const row = (m, ok) => ['Ana', 1, 'Acropora', 'Acropora', ok, m, 'acropora-1'];
  // Right on a 2-plausible-choice question proves less than on a 4-choice one: the photo looks less easy.
  assert.ok(eloOf([row('quiz|k2', 1)])['acropora-1'][0] > eloOf([row('quiz', 1)])['acropora-1'][0]);
  assert.strictEqual(eloOf([row('quiz|k2', 1)])['acropora-1'][0], eloOf([row('quiz-duel', 1)])['acropora-1'][0]);
});
