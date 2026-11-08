// The fish units renamed (Pierre, 2026-11-06 13:04: the book's families, not the IMR entries; Q159: what was logged or
// saved under the old ids follows): core.js SUBJECTS renamed and its helpers, checked against fish.json.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path');
const C = require('../core.js');
const F = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'fish.json'), 'utf8'));
const S = C.SUBJECTS.find(x => x.renamed),
  SP = new Map(F.species.map(s => [s.id, s])),
  FAM = new Map(F.families.map(f => [f.id, f]));

test('the old-id map is fish.json’s: every entry’s species land in their family through it, names included', () => {
  assert.ok(S, 'a subject carries the map');
  // Every entry of the switch is mapped; an entry added since (t64 on, 2026-11-08) never was a unit id, so has no old id.
  const atSwitch = Math.max(...Object.keys(S.renamed.ids).map(id => +id.slice(1)));
  F.teach.forEach(t => {
    if (+t.id.slice(1) > atSwitch) return;
    assert.ok(S.renamed.ids[t.id], t.id + ' mapped');
    // A species that came in after the switch (s481 on, 2026-11-08) was never logged under an old entry id.
    t.species
      .map(id => SP.get(id))
      .filter(s => s.family && +s.id.slice(1) <= 480)
      .forEach(s => assert.strictEqual(C.renamedId(S, t.id, s.name), s.family, `${t.id} ${s.name}`));
  });
  Object.entries(S.renamed.names).forEach(([id, n]) => assert.strictEqual((FAM.get(id) || {}).name, n, id));
  // Names serve the renamed log entries: every family an old id or a split leads to has one.
  [...Object.values(S.renamed.ids), ...Object.values(S.renamed.split).flatMap(Object.values)].forEach(id =>
    assert.ok(S.renamed.names[id], id + ' named')
  );
  assert.strictEqual(C.renamedId(S, 't13', 'Diploprion bifasciatum'), 'f:Soapfishes');
  assert.strictEqual(C.renamedId(S, 't13', 'Epinephelus merra, Diploprion bifasciatum'), 'f:Groupers', 'the first species shown decides');
  assert.strictEqual(C.renamedId(S, 'g:Chromis'), 'g:Chromis');
  assert.strictEqual(C.renamedId(C.SUBJECTS[0], 't01'), 't01', 'a subject with no map keeps its ids');
});

test('renameUnits: a progress record or the cards seen under the new ids, inner mix-ups too, the busier record kept', () => {
  const P = {
    t01: {ok: 3, ko: 1, conf: {t13: 2, 'g:Chromis': 1}, off: {t02: 1}},
    'f:Damselfishes': {ok: 1, ko: 0},
    t13: {ok: 2, ko: 0, conf: {t01: 1}},
    'g:Chromis': {ok: 1, ko: 0},
    '~level': {th: 0.4}
  };
  const R = C.renameUnits(S, P);
  assert.deepStrictEqual(Object.keys(R).sort(), ['f:Damselfishes', 'f:Groupers', 'g:Chromis', '~level']);
  assert.deepStrictEqual(R['f:Damselfishes'], {ok: 3, ko: 1, conf: {'f:Groupers': 2, 'g:Chromis': 1}, off: {'f:Butterflyfishes': 1}});
  assert.deepStrictEqual(R['f:Groupers'].conf, {'f:Damselfishes': 1});
  assert.deepStrictEqual(R['~level'], {th: 0.4});
  assert.ok(!('f:Soapfishes' in R), 'the Soapfishes start unmet');
  assert.deepStrictEqual(C.renameUnits(S, {'f:Damselfishes': {ok: 9, ko: 0}, t01: {ok: 2, ko: 0}})['f:Damselfishes'], {ok: 9, ko: 0});
  assert.deepStrictEqual(C.renameUnits(S, {t01: [3, 1]}), {'f:Damselfishes': [3, 1]}, 'the cards seen (unit → [answers, first])');
  const same = {'f:Damselfishes': {ok: 1}};
  assert.strictEqual(C.renameUnits(C.SUBJECTS[0], same), same);
});

test('renameLogEntry: one map per row, so a right answer on a Diploprion photo stays right', () => {
  const a = {g: 't13', a: 't13', ok: 1, ch: 't13 t01', m: 'quiz', tn: 'Groupers', ta: 'Groupers', sp: 'Diploprion bifasciatum'};
  assert.deepStrictEqual(C.renameLogEntry(S, a), {
    ...a,
    g: 'f:Soapfishes',
    a: 'f:Soapfishes',
    ch: 'f:Soapfishes f:Damselfishes',
    tn: 'Soapfishes',
    ta: 'Soapfishes'
  });
  const b = {g: 't01', a: 't13', ch: 't13 t01', m: 'quiz-duel|t01|t13', tn: 'Damselfish', ta: 'Groupers', sp: 'Chromis viridis'};
  assert.deepStrictEqual(C.renameLogEntry(S, b), {
    ...b,
    g: 'f:Damselfishes',
    a: 'f:Groupers',
    ch: 'f:Groupers f:Damselfishes',
    m: 'quiz-duel|f:Damselfishes|f:Groupers',
    tn: 'Damselfishes',
    ta: 'Groupers'
  });
  const c = {g: 'f:Groupers', a: '', ch: 'f:Groupers'};
  assert.strictEqual(C.renameLogEntry(S, c), c, 'new ids: the entry itself');
});
