// autosort.js: the sure rule per field, the 1-in-20 Check sampling, the log codes, agreement and auto-off, retests,
// metric flags (Pierre, 2026-11-03; docs/ARCHITECTURE.md "Auto-sort").
const test = require('node:test'),
  assert = require('node:assert'),
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
  autoSigs,
  autoStamp,
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

// Not measured on the real cand.json: what is left there is not a random sample of names. The auto-sort's adds leave
// cand.json at the next candidate refill (approved-photos workflow), while its Checks stay there until Pierre answers
// them, so the share of Checks among the candidates left grows with every run (5.0% of 1746 before the first refill,
// 7.8% of 1229 after it, 2026-11-03). The hash itself is checked on fixed names and on a large generated set.
test('1 in 20 Checks: deterministic per photo, 5% of candidate names', () => {
  // Fixed names, fixed answers: a change to the hash or the rule would make other photos Checks on Pierre's data.
  ['montipora-cand-260314187', 'pocillopora-cand-263351328', 'montipora-cand-265341179', 'fungia-cand-266074282'].forEach(f =>
    assert.strictEqual(autoCheck(f), true, f)
  );
  ['acropora-cand-260000000', 'porites-cand-260104729', 'pocillopora-cand-260209458', 'fungia-cand-260418916', 'acropora-cand-1'].forEach(
    f => assert.strictEqual(autoCheck(f), false, f)
  );
  // Independent of anything but the name (no device seed, no order).
  assert.strictEqual(autoCheck('acropora-cand-1'), autoCheck('acropora-cand-1'));
  // 100,000 names shaped like the real ones (genus-cand-<iNaturalist photo id>) over 8 genera: 1 in 20 overall
  // (binomial sd 0.07 points) and in each genus (sd 0.2 points), on a second pass too.
  const G = ['acropora', 'porites', 'pocillopora', 'montipora', 'fungia', 'favites', 'goniopora', 'turbinaria'],
    F = Array.from({length: 100000}, (_, i) => `${G[i % G.length]}-cand-${100000000 + i * 7919}`),
    n = F.filter(autoCheck).length,
    again = F.filter(autoCheck).length;
  assert.strictEqual(n, again, 'same photos on a second pass');
  assert.ok(Math.abs(n / F.length - 1 / AUTO.every) < 0.003, `checks ${((100 * n) / F.length).toFixed(2)}% of ${F.length}`);
  G.forEach(g => {
    const L = F.filter(f => f.startsWith(g + '-')),
      r = L.filter(autoCheck).length / L.length;
    assert.ok(Math.abs(r - 1 / AUTO.every) < 0.006, `${g}: checks ${(100 * r).toFixed(2)}% of ${L.length}`);
  });
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

test('an auto add Pierre removed (Remove on its genus page: add gone, reject mark) is a Keep disagreement', () => {
  // admin.js ACT.hide on an auto-added photo deletes its add and writes the reject mark (Codex review #400).
  const cur = {auto: {'2026-11-03': {a1: 'aw2B', a2: 'aw2B'}}, genera: {G: {add: {a2: 'wide'}}}, seen: {'cand:a1': 1}};
  assert.strictEqual(pierreOf(cur, curIdx(cur), 'a1').keep, 'reject');
  const C = autoCompare(cur);
  assert.deepStrictEqual(
    C.map(c => [c.f, c.field, c.ok, c.how]),
    [['a1', 'keep', false, 'fix']]
  );
  assert.strictEqual(autoState(C).keep.ok, 0);
});

test('a photo two devices logged on different days counts once (the latest entry, as autoIdx)', () => {
  // merge3 keeps both daily maps when two drafts logged the same photo on different days (Codex review #400).
  const cur = {
    auto: {'2026-11-03': {c: '?aw2B', a: 'r'}, '2026-11-04': {c: '?aw2B', a: '-r'}},
    genera: {G: {add: {c: 'wide', a: 'medium'}}},
    quality: {c: 2},
    gf: {c: 'B'}
  };
  const C = autoCompare(cur);
  assert.deepStrictEqual(C.map(c => `${c.f}.${c.field}.${c.ok ? 'ok' : 'no'}.${c.how}`).sort(), [
    'a.keep.no.fix',
    'c.form.ok.check',
    'c.keep.ok.check',
    'c.quality.ok.check',
    'c.view.ok.check'
  ]);
  assert.strictEqual(C.find(c => c.f === 'a').day, '2026-11-04', 'the latest entry is the one compared');
  assert.strictEqual(autoState(C).keep.n, 2);
});

test('an auto add sent to another genus ("Not this") and added there is a Keep disagreement', () => {
  // ACT.out drops the add in its own genus and writes out; Pierre then adds it in the genus it went to (Codex review
  // #400): the auto added it to the wrong genus, so the add elsewhere is no agreement.
  const cur = {
    auto: {'2026-11-03': {a1: 'aw2B', c1: '?aw2B'}},
    genera: {A: {out: {a1: 'B', c1: 'B'}}, B: {add: {a1: 'wide', c1: 'wide'}}},
    quality: {a1: 2, c1: 2},
    gf: {a1: 'B', c1: 'B'}
  };
  const ci = curIdx(cur);
  assert.strictEqual(pierreOf(cur, ci, 'a1').keep, 'reject');
  assert.deepStrictEqual(
    autoCompare(cur).map(c => [c.f, c.field, c.ok, c.how]),
    [
      ['a1', 'keep', false, 'fix'],
      ['c1', 'keep', false, 'check']
    ]
  );
});

test('agreement window in the order Pierre answered: a Check of an older run answered now is among the latest', () => {
  assert.strictEqual(autoParse('?aw2B@t5a1kq').t, parseInt('t5a1kq', 36));
  assert.strictEqual(autoParse('-r@1').undone, true);
  assert.strictEqual(autoParse('r@'), null);
  // 40 Checks of a newer run, answered (in agreement) before he gets to the old one; then the old run's Check, answered
  // last, in disagreement on keep.
  const day2 = {};
  for (let i = 0; i < AUTO.win; i++) {
    const f = 'n' + String(i).padStart(2, '0');
    day2[f] = '?r@' + (1000 + i).toString(36);
  }
  const cur = {
    auto: {'2026-11-03': {old: '?r@' + (5000).toString(36), legacy: '?r'}, '2026-11-04': day2},
    genera: {G: {add: {old: 'wide'}}},
    seen: Object.fromEntries([...Object.keys(day2), 'legacy'].map(f => ['cand:' + f, 1]))
  };
  const C = autoCompare(cur).filter(c => c.field === 'keep');
  // Untimed (logged before the stamps) first, in the log's order; then by time.
  assert.deepStrictEqual(
    [C[0].f, C[1].f, C[C.length - 1].f],
    ['legacy', 'n00', 'old'],
    'oldest first by answer time, the untimed entry before every timed one'
  );
  const S = autoState(autoCompare(cur));
  assert.strictEqual(S.keep.n, AUTO.win);
  assert.strictEqual(S.keep.ok, AUTO.win - 1, 'the old run answered last is in the window (it used to fall out at once)');
});

test('autoStamp: the time goes on the photos Pierre just answered or corrected, only those', () => {
  const before = {
      auto: {'2026-11-03': {c1: '?aw2B', c2: '?r', a1: 'aw2B@1', a2: 'aw2B'}},
      genera: {G: {add: {c1: 'wide', a1: 'wide', a2: 'wide'}}},
      quality: {c1: 2, a1: 3},
      seen: {}
    },
    sig = autoSigs(before);
  assert.deepStrictEqual(Object.keys(sig).sort(), ['a1', 'c1']);
  assert.strictEqual(autoStamp(before, sig, 99), null, 'nothing changed: nothing stamped');
  // He answers the Check c2 (adds it) and corrects a1 again (Fair -> Poor): both stamped, c1 and a2 untouched.
  const after = JSON.parse(JSON.stringify(before));
  after.genera.G.add.c2 = 'medium';
  after.quality.a1 = 1;
  const A = autoStamp(after, sig, 36 * 36);
  assert.deepStrictEqual(A['2026-11-03'], {c1: '?aw2B', c2: '?r@100', a1: 'aw2B@100', a2: 'aw2B'});
  assert.notStrictEqual(A, after.auto, 'a new map: the draft is not changed in place');
  // An answer taken back (no comparison left): its code stays as it is.
  const back = JSON.parse(JSON.stringify(before));
  delete back.genera.G.add.c1;
  assert.strictEqual(autoStamp(back, sig, 5), null);
});

test('candidate refill: an auto-excluded candidate keeps its entry, so its Undo can bring it back (tools/excluded.py)', () => {
  const {execFileSync} = require('child_process');
  const py = `
import json, sys
sys.path.insert(0, 'tools')
import excluded as X
X.EX = {'acropora-cand-1': 'auto', 'acropora-cand-2': 'excluded', 'porites-3': 'auto'}
X.IDS = {X.pid(f) for f in X.EX} - {None}
d = {'gen': {'Porites': {'views': {'wide': [{'f': 'porites-3'}, {'f': 'porites-4'}]}}},
     'cand': {'Acropora': [{'f': 'acropora-cand-1', 'src': 'u1'}, {'f': 'acropora-cand-2'}, {'f': 'acropora-cand-5'}]}}
X.drop_excluded(d)
print(json.dumps({'cand': [p['f'] for p in d['cand']['Acropora']], 'views': [p['f'] for p in d['gen']['Porites']['views']['wide']]}))`;
  const R = JSON.parse(execFileSync('python3', ['-c', py], {cwd: path.join(__dirname, '..'), encoding: 'utf8'}));
  assert.deepStrictEqual(R.cand, ['acropora-cand-1', 'acropora-cand-5'], "the auto exclusion's entry stays, Pierre's own goes");
  assert.deepStrictEqual(R.views, ['porites-4'], 'an excluded photo still leaves every photo list on the site');
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
