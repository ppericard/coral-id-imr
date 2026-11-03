// autosort.js: the sure rule per field, the 1-in-20 Check sampling, the log codes, agreement and auto-off, retests,
// metric flags (Pierre, 2026-11-03; docs/ARCHITECTURE.md "Auto-sort").
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path');
const {
  AUTO,
  autoCheck,
  autoSure,
  autoCode,
  autoParse,
  autoIdx,
  pierreOf,
  curIdx,
  autoCompare,
  autoState,
  retestStats,
  metFlag,
  rankPct
} = require('../autosort.js');

test('sure rule: what the pass is sure of, field by field', () => {
  // Any doubt is Pierre's, whatever the field.
  assert.strictEqual(autoSure({k: 'best', v: 'wide', q: 3, fm: 'B', u: ['form']}), null);
  assert.strictEqual(autoSure({g: 'exclude', u: ['genus']}), null);
  assert.strictEqual(autoSure(null), null);
  // A sure add: best of its observation in its view, Fair or Good, view and form given; the crop comes along.
  assert.deepStrictEqual(autoSure({k: 'best', v: 'wide', q: 2, fm: 'Bp', c: [0.1, 0, 1, 1]}), {
    keep: 'add',
    view: 'wide',
    quality: 2,
    form: 'Bp',
    crop: [0.1, 0, 1, 1]
  });
  assert.strictEqual(autoSure({k: 'best', v: 'macro', q: 3, fm: 'x'}).keep, 'add');
  // Not an add: another angle, no form, no view, no quality.
  assert.strictEqual(autoSure({k: 'alt', v: 'wide', q: 3, fm: 'B'}), null);
  assert.strictEqual(autoSure({k: 'best', v: 'wide', q: 3}), null);
  assert.strictEqual(autoSure({k: 'best', q: 3, fm: 'B'}), null);
  assert.strictEqual(autoSure({k: 'best', v: 'wide', fm: 'B'}), null);
  // Sure rejects: the pre-sort's rules (near-duplicate, several corals, Poor), excluded when unusable.
  assert.deepStrictEqual(autoSure({k: 'dup', v: 'wide', q: 3, fm: 'B'}), {keep: 'reject', why: 'dup'});
  assert.deepStrictEqual(autoSure({k: 'best', v: 'wide', q: 2, fm: 'B', m: 1}), {keep: 'reject', why: 'multi'});
  assert.deepStrictEqual(autoSure({k: 'best', v: 'wide', q: 1, fm: 'B'}), {keep: 'reject', why: 'poor'});
  assert.deepStrictEqual(autoSure({g: 'exclude', q: 1, fm: 'x'}), {keep: 'exclude'});
  // Another genus or a comparison image: moving it is Pierre's call.
  assert.strictEqual(autoSure({g: 'Porites', q: 2, fm: 'M'}), null);
  assert.strictEqual(autoSure({g: 'cmp', q: 2, fm: 'M'}), null);
});

test('1 in 20 Checks: deterministic per photo, about 5% of the real candidates', () => {
  const cand = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'cand.json'))).cand,
    F = Object.values(cand)
      .flat()
      .map(p => p.f);
  assert.ok(F.length > 500);
  const n = F.filter(autoCheck).length,
    again = F.filter(autoCheck).length;
  assert.strictEqual(n, again, 'same photos on a second pass');
  const r = n / F.length;
  assert.ok(r > 0.03 && r < 0.07, `checks ${(100 * r).toFixed(1)}% of ${F.length}`);
  // Independent of anything but the name (no device seed, no order).
  assert.strictEqual(autoCheck('acropora-cand-1'), autoCheck('acropora-cand-1'));
  assert.strictEqual(AUTO.every, 20);
});

test('log codes: written and read back', () => {
  const s = autoSure({k: 'best', v: 'medium', q: 3, fm: 'Mp', c: [0.1, 0, 1, 1]});
  assert.strictEqual(autoCode(s, {quality: true, form: true}, false, true), 'am3Mp#');
  assert.strictEqual(autoCode(s, {quality: false, form: true}), 'am.Mp');
  assert.strictEqual(autoCode(s, null, true), '?am3Mp');
  assert.strictEqual(autoCode({keep: 'reject'}), 'r');
  assert.strictEqual(autoCode({keep: 'exclude'}, null, true), '?x');
  assert.deepStrictEqual(autoParse('am3Mp#'), {check: false, undone: false, kind: 'a', view: 'medium', q: 3, fm: 'Mp', crop: true});
  assert.deepStrictEqual(autoParse('-aw.x'), {check: false, undone: true, kind: 'a', view: 'wide', q: undefined, fm: 'x', crop: false});
  assert.strictEqual(autoParse('?r').check, true);
  assert.strictEqual(autoParse('a'), null);
  assert.strictEqual(autoParse('rw2B'), null);
  assert.strictEqual(autoParse('zz'), null);
  const I = autoIdx({auto: {'2026-11-03': {a: 'aw2B'}, '2026-11-04': {b: '?r'}}});
  assert.strictEqual(I.a.day, '2026-11-03');
  assert.strictEqual(I.b.d.check, true);
});

test("Pierre's decision read from the curation", () => {
  const cur = {
    genera: {Acropora: {add: {a: 'wide', h: 'wide', m: 'wide'}, move: {m: 'macro'}, hide: ['h'], out: {o: 'Porites'}}},
    quality: {a: 3},
    gf: {a: 'Bp'},
    exclude: {x: 'excluded'},
    seen: {'cand:r': 1}
  };
  const ci = curIdx(cur);
  assert.deepStrictEqual(pierreOf(cur, ci, 'a'), {keep: 'add', view: 'wide', quality: 3, form: 'B'});
  assert.strictEqual(pierreOf(cur, ci, 'm').view, 'macro');
  ['h', 'x', 'r', 'o'].forEach(f => assert.strictEqual(pierreOf(cur, ci, f).keep, 'reject', f));
  assert.strictEqual(pierreOf(cur, ci, 'z').keep, null);
});

test('agreement: Checks count both ways, corrections only as disagreements', () => {
  const cur = {
    auto: {
      '2026-11-03': {
        c1: '?aw2B', // Check, Pierre added to Colony, Fair, Branching: agrees on all four
        c2: '?am3M', // Check, Pierre added to Colony, rated Fair: keep agrees, view and quality differ, form not given
        c3: '?r', // Check, Pierre added it: keep differs
        c4: '?aw2B', // Check not answered yet: nothing
        a1: 'aw2B', // applied, untouched: nothing (silence is not agreement)
        a2: 'aw2B', // applied, Pierre rated it Good: a quality correction
        a3: 'ac.T', // applied without quality (field off): his rating is no correction
        a4: 'r', // applied reject, Pierre added it later: a keep correction
        u1: '-aw2B' // undone, then rejected by Pierre: a keep correction
      }
    },
    genera: {G: {add: {c1: 'wide', c2: 'wide', c3: 'wide', a1: 'wide', a2: 'wide', a3: 'macro', a4: 'medium'}}},
    quality: {c1: 2, c2: 2, a1: 2, a2: 3, a3: 1},
    gf: {c1: 'B', a1: 'B', a2: 'B'},
    seen: {'cand:a4': 1, 'cand:u1': 1}
  };
  const C = autoCompare(cur),
    key = c => `${c.f}.${c.field}.${c.ok ? 'ok' : 'no'}.${c.how}`;
  assert.deepStrictEqual(C.map(key).sort(), [
    'a2.quality.no.fix',
    'a4.keep.no.fix',
    'c1.form.ok.check',
    'c1.keep.ok.check',
    'c1.quality.ok.check',
    'c1.view.ok.check',
    'c2.keep.ok.check',
    'c2.quality.no.check',
    'c2.view.no.check',
    'c3.keep.no.check',
    'u1.keep.no.fix'
  ]);
  const S = autoState(C);
  assert.deepStrictEqual([S.keep.n, S.keep.ok, S.view.n, S.quality.n, S.form.n], [5, 2, 2, 3, 1]);
  // Fewer than AUTO.n0 comparisons: still on, whatever the rate.
  assert.ok(S.keep.on && S.quality.on);
});

test('auto off under the threshold once there are enough comparisons, on again when it recovers', () => {
  const mk = (ok, bad) => [...Array(bad).fill({field: 'quality', ok: false}), ...Array(ok).fill({field: 'quality', ok: true})];
  assert.strictEqual(autoState(mk(5, 4)).quality.on, true, '9 comparisons: too few to switch off');
  assert.strictEqual(autoState(mk(7, 4)).quality.on, false, '7 of 11 = 64% < 73%');
  assert.strictEqual(autoState(mk(11, 4)).quality.on, true, '11 of 15 = 73.3%');
  // The window: 10 old misses, then 40 agreements: only the last 40 count, so it is back on.
  assert.strictEqual(autoState(mk(40, 10)).quality.on, true);
  assert.strictEqual(autoState(mk(30, 10)).quality.n, AUTO.win);
  // Per field: keep needs 90%.
  const k = [...Array(2).fill({field: 'keep', ok: false}), ...Array(10).fill({field: 'keep', ok: true})];
  assert.strictEqual(autoState(k).keep.on, false, '10 of 12 = 83% < 90%');
  assert.strictEqual(autoState(k).view.on, true, 'another field is not touched');
  assert.ok(AUTO.min.keep > AUTO.min.quality && AUTO.min.view > AUTO.min.quality && AUTO.min.quality === 0.73);
});

test('retests: Pierre against himself', () => {
  const S = retestStats({retest: {a: {q: [2, 2], fm: ['B', 'Bp']}, b: {q: [3, 2]}, c: {q: [2, 2]}}});
  assert.deepStrictEqual([S.quality.n, S.quality.ok, S.form.n, S.form.ok], [3, 2, 1, 1]);
  assert.strictEqual(retestStats({}).quality.rate, null);
});

test('metrics: a sanity flag only, never a decision on their own', () => {
  const ref = {lo: 40, hi: 300};
  const add3 = {k: 'best', v: 'wide', q: 3, fm: 'B'},
    poor = {k: 'best', v: 'wide', q: 1, fm: 'B'};
  assert.match(metFlag(autoSure(add3), add3, [100, 0.5, 800, 20], ref), /small for Good/);
  assert.strictEqual(metFlag(autoSure(add3), add3, [30, 0.5, 1600, 20], ref), 'soft for Good');
  assert.strictEqual(metFlag(autoSure(add3), add3, [100, 0.5, 1600, 20], ref), null);
  assert.strictEqual(metFlag(autoSure(poor), poor, [400, 0.5, 1600, 20], ref), 'sharp for Poor');
  // A Fair add, a duplicate, no metrics: nothing to flag.
  const add2 = {...add3, q: 2},
    dup = {...add3, k: 'dup'};
  assert.strictEqual(metFlag(autoSure(add2), add2, [10, 0.5, 600, 20], ref), null);
  assert.strictEqual(metFlag(autoSure(dup), dup, [400, 0.5, 1600, 20], ref), null);
  assert.strictEqual(metFlag(autoSure(add3), add3, undefined, ref), null);
  assert.strictEqual(rankPct([1, 2, 3, 4], 3), 50);
});
