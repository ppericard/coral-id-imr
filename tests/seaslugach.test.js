require('./slot.js').testGuard();
// The sea slug achievements (first version, then the % ladder to 100%; Pierre, 2026-11-17: "une première version des succès pour les limaces de
// mer"; core.js SEASLUG_ACH; rule L8: learning milestones only, never time): ids of their own in the shared record, each
// reachable on the sea slug snapshot as the app makes it (progress.js achSnap over seaslug.json's genera, families and
// taxonomic groups), none on an empty one, and the snapshot's family and taxonomic-group counts right.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  cut = require('./block.js');
const C = require('../core.js');
const ROOT = path.join(__dirname, '..'),
  SF = JSON.parse(fs.readFileSync(path.join(ROOT, 'seaslug.json'), 'utf8'));
const S = C.subjectOf('seaslug'),
  L = S.achs();

// progress.js achSnap over the sea slugs' units (core.js fishGen at the genus, as the app's), each genus at level lv(n).
function snapOf(lv, pct = 0) {
  const X = C.fishGen(SF, {}, undefined, C.unitRankOf(S)),
    slate = [...X.c1, ...X.c2, ...X.c3],
    ctx = {
      ...C,
      SUBJ: S,
      P: {},
      LEVEL: '~level',
      ELO_MIN: 200,
      GX: n => X.gen[n],
      slateGenera: () => slate,
      lvStep: n => lv(n),
      shownGroup: () => '',
      bonusList: () => [],
      introduced: () => false,
      eloScore: () => 0,
      headPct: () => pct,
      UNITS: {seaslug: {core: () => X.c1, circles: () => [X.c1, X.c2, X.c3], sets: []}},
      store: {get: (k, d) => d, set: () => {}}
    };
  vm.createContext(ctx);
  vm.runInContext(
    cut(fs.readFileSync(path.join(ROOT, 'progress.js'), 'utf8'), 'const achList = ', '\n// Full recount') + '\nthis.achSnap = achSnap;',
    ctx
  );
  // out of the page's realm, so its arrays compare as plain ones
  return {snap: JSON.parse(JSON.stringify(ctx.achSnap({}))), X, slate};
}

test('sea slug achievements: their own ids, a modest first list, plain and well-formed', () => {
  assert.ok(L.length >= 10 && L.length <= 20, String(L.length));
  const ids = [...C.ACH, ...C.FISH_ACH, ...L].map(a => a.id);
  assert.strictEqual(new Set(ids).size, ids.length, 'one id per achievement across subjects');
  L.forEach(a => {
    assert.match(a.id, /^ss[a-z0-9]{1,18}$/, a.id); // the sheet counts ids of [a-z0-9]{1,20} (Code.gs achs_)
    assert.ok(a.kind === 'learn' && [1, 2, 3].includes(a.tier) && a.icon && a.title && a.desc, a.id);
    assert.strictEqual(C.achFind(a.id), a, a.id);
    assert.ok(!/\b(day|days|week|hour|minute|time spent|streak)\b/i.test(a.desc), 'never time: ' + a.id);
  });
  // the learned-based one is taken back with a learned mark (core.js achRevoke)
  assert.ok(C.ACH_LEARN.includes('sslearn1'));
  // the % every 10 points
  assert.deepStrictEqual(
    L.filter(a => a.icon === '📈').map(a => a.id),
    ['sspct10', 'sspct20', 'sspct30', 'sspct40', 'sspct50', 'sspct60', 'sspct70', 'sspct80', 'sspct90', 'sspct100']
  );
  // the climb past 50% is the top tier, each point of its ladder on the headline % and nothing else
  [60, 70, 80, 90, 100].forEach(p => {
    const a = L.find(x => x.id === 'sspct' + p);
    assert.strictEqual(a.tier, 3, a.id);
    assert.ok(a.test({pct: p, total: 5, learned: 5}) && !a.test({pct: p - 1, total: 5, learned: 5}), a.id);
  });
  // 100% is a rounded mean (77 learned and one at 95% make 100): it also asks every genus learned, and goes with a learned mark
  const top = L.find(x => x.id === 'sspct100');
  assert.ok(!top.test({pct: 100, total: 78, learned: 77}) && !top.test({pct: 100, total: 0, learned: 0}));
  assert.ok(C.ACH_LEARN.includes('sspct100'));
});

test("the nudibranchs' taxonomic groups are seaslug.json's, and the other groups are named as it names them", () => {
  const G = SF.taxa.groups;
  assert.deepStrictEqual(
    G.filter(g => /^Nudibranchia\b/.test(g.title)).map(g => g.n),
    C.SEA_NUDI
  );
  const other = G.filter(g => !C.SEA_NUDI.includes(g.n)).map(g => g.title),
    desc = C.achFind('ssother').desc;
  other.forEach(t => assert.ok(desc.includes(t), t));
});

test('the sea slug snapshot: genera, families and taxonomic groups from seaslug.json', () => {
  // every genus of the Chromodorididae at Advanced, every other genus met only
  const X0 = C.fishGen(SF, {}, undefined, 'genus'),
    {snap, X, slate} = snapOf(n => (X0.gen[n].parent === 'f:Chromodorididae' ? 3 : 1));
  assert.strictEqual(snap.total, SF.genera.length);
  assert.strictEqual(snap.met, slate.length);
  assert.strictEqual(snap.fam, 1, 'one family with every genus at Advanced');
  const byTax = {};
  slate.forEach(n => {
    const t = X.gen[X.gen[n].parent].tg;
    byTax[t] = (byTax[t] || 0) + 1;
  });
  assert.deepStrictEqual(
    snap.tax.map(t => [t.n, t.total]),
    Object.entries(byTax).map(([n, k]) => [Number(n), k])
  );
  assert.deepStrictEqual(
    snap.tax.map(t => t.n),
    SF.taxa.groups.map(g => g.n),
    'every group, in order'
  );
  const dor = snap.tax.find(t => t.n === 1);
  assert.strictEqual(dor.adv, slate.filter(n => X.gen[n].parent === 'f:Chromodorididae').length);
  assert.strictEqual(dor.met, dor.total);
});

test('none on an empty snapshot, every one at full marks, the levels and groups each where they belong', () => {
  const none = snapOf(() => 0).snap,
    all = snapOf(() => 5, 100).snap;
  assert.deepStrictEqual(C.newAch(none, {}, L), [], 'nothing for opening the app');
  assert.deepStrictEqual(
    C.newAch(all, {}, L),
    L.map(a => a.id),
    'every one reachable'
  );
  // Advanced on every genus, nothing learned, 45%: not the Divemaster, Instructor or 50% ones
  const adv = snapOf(() => 3, 45).snap,
    got = new Set(C.newAch(adv, {}, L));
  ['ssmetall', 'ssq80', 'ssfam5', 'ssc1adv', 'ssnudi', 'ssother', 'sspct40'].forEach(id => assert.ok(got.has(id), id));
  ['ssq95', 'sslearn1', 'sspct50'].forEach(id => assert.ok(!got.has(id), id));
  // 65%: the 60% one, not the 70% one
  const hi = new Set(C.newAch(snapOf(() => 3, 65).snap, {}, L));
  assert.ok(hi.has('sspct60') && !hi.has('sspct70'));
  // Advanced on the nudibranchs only: Naked gills, not Beyond nudibranchs
  const X = C.fishGen(SF, {}, undefined, 'genus'),
    nudi = snapOf(n => (C.SEA_NUDI.includes(X.gen[X.gen[n].parent].tg) ? 3 : 1)).snap,
    g2 = new Set(C.newAch(nudi, {}, L));
  assert.ok(g2.has('ssnudi') && !g2.has('ssother'));
});
