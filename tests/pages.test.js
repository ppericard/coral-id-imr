require('./slot.js').testGuard();
// Pages opened in a visit (core.js PAGES, the sheet's 'pages'): the tally the app keeps and the summary it sends.
// node --test tests/
const test = require('node:test'),
  assert = require('node:assert');
const C = require('../core.js');

const plain = o => JSON.parse(JSON.stringify(o));

test('page names: the address without its things, genus sheets, look-alikes, home', () => {
  const N = C.pageName;
  assert.strictEqual(N(''), 'home');
  assert.strictEqual(N('#home'), 'home');
  assert.strictEqual(N('g-Acropora'), 'learn.genus');
  assert.strictEqual(N('g-%E0'), 'learn.genus');
  assert.strictEqual(N('cmp'), 'learn.look-alikes');
  assert.strictEqual(N('cmp|Pocillopora|Stylophora'), 'learn.look-alikes');
  assert.strictEqual(N('cmp-Pocillopora|Stylophora'), 'learn.compare');
  assert.strictEqual(N('quiz-custom|play'), 'practice.custom');
  assert.strictEqual(N('quiz-duel|Foo|Bar'), 'practice.duels');
  assert.strictEqual(N('idkey|form=b;box=b1'), 'identify.key');
  assert.strictEqual(N('lab-anatomy|walls'), 'tools.anatomy');
  assert.strictEqual(N('<script>'), 'other');
  assert.strictEqual(N('__proto__'), 'other');
  assert.strictEqual(N('x'.repeat(60)), 'other');
});

// A fish page is told apart from a coral one: drawn with Fish on screen it is fish.<page>; the corals keep the plain names; the sheet's cleaning keeps it; the admin reads it back.
test('page names carry the subject on screen: fish.<page>, the corals plain', () => {
  const N = C.pageName,
    F = C.subjectOf('fish').pv;
  assert.strictEqual(C.subjectOf('coral').pv, '');
  assert.strictEqual(F, 'fish.');
  assert.strictEqual(N('quiz', F), 'fish.practice.quiz');
  assert.strictEqual(N('', F), 'fish.home');
  assert.strictEqual(N('progress', F), 'fish.progress');
  assert.strictEqual(N('genera', F), 'fish.learn.genera');
  assert.strictEqual(N('x'.repeat(39), F), 'fish.other');
  assert.strictEqual(N('quiz', ''), 'practice.quiz');
  assert.strictEqual(N('quiz'), 'practice.quiz');
  const S = C.pagesNew();
  C.pagesOpen(S, 'quiz', 1e6);
  C.pagesOpen(S, 'quiz', 1e6 + 2000, {pre: F});
  C.pagesOpen(S, 'genera', 1e6 + 5000, {pre: F});
  const sum = C.pagesTake(S, 1e6 + 6000);
  assert.deepStrictEqual(plain(sum.r), {'practice.quiz': [1, 2], 'fish.practice.quiz': [1, 3], 'fish.learn.genera': [1, 1]});
  assert.deepStrictEqual(plain(C.pagesClean(sum).r), plain(sum.r));
  assert.deepStrictEqual(C.pageSubj('fish.practice.quiz'), ['fish', 'practice.quiz']);
  assert.deepStrictEqual(C.pageSubj('practice.quiz'), ['coral', 'practice.quiz']);
  assert.deepStrictEqual(C.pageSubj('tools.anatomy'), ['coral', 'tools.anatomy']);
  assert.deepStrictEqual(C.pageSubj('coral.quiz'), ['coral', 'coral.quiz']);
});

test('how a sheet was reached: quiz, learn, progress, other', () => {
  const F = C.pageFrom;
  assert.deepStrictEqual(
    ['quiz', 'quiz-custom|play', 'quiz-duel', 'genera', 'g-Porites', 'cmp', 'cmp-A|B', 'progress', 'ach', 'idkey', '', 'lab'].map(F),
    ['quiz', 'quiz', 'quiz', 'learn', 'learn', 'learn', 'learn', 'progress', 'progress', 'other', 'other', 'other']
  );
});

test('the summary counts openings and seconds in view, keeps how each sheet was first reached', () => {
  const S = C.pagesNew();
  let t = 1e6;
  C.pagesOpen(S, '', t); // home, 5 s
  C.pagesOpen(S, 'quiz', (t += 5000)); // quiz, 60 s
  C.pagesOpen(S, 'g-Acropora', (t += 60000), {genus: 'Acropora', from: 'quiz', asked: true}); // 20 s
  C.pagesOpen(S, 'quiz', (t += 20000)); // quiz again, 30 s, of which 10 s hidden
  C.pagesStop(S, (t += 20000));
  t += 10000; // hidden: not counted
  C.pagesResume(S, t);
  C.pagesOpen(S, 'genera', (t += 10000)); // 4 s
  C.pagesOpen(S, 'g-Porites', (t += 4000), {genus: 'Porites', from: 'learn', asked: false}); // 7 s
  C.pagesOpen(S, 'g-Acropora', (t += 7000), {genus: 'Acropora', from: 'learn', asked: true}); // 3.4 s
  const out = C.pagesTake(S, (t += 3400));
  assert.deepStrictEqual(plain(out), {
    r: {'practice.quiz': [2, 90], 'learn.genus': [3, 30], home: [1, 5], 'learn.genera': [1, 4]},
    // Acropora: opened twice, from the quiz first (the origin of its first opening is kept), already asked.
    g: {Acropora: [2, 23, 'quiz', 1], Porites: [1, 7, 'learn', 0]}
  });
  // A fresh tally for the rest of the visit: the page in view goes on, with no new opening.
  C.pagesResume(S, t);
  const more = C.pagesTake(S, (t += 2000));
  assert.deepStrictEqual(plain(more), {r: {'learn.genus': [0, 2]}, g: {Acropora: [0, 2, 'quiz', 1]}});
  assert.strictEqual(C.pagesTake(S, t), null, 'nothing new: no summary');
});

test('a page opened while the app is hidden counts its opening, not its time; a genus not named is not a sheet', () => {
  const S = C.pagesNew();
  C.pagesOpen(S, 'g-Acropora', 0, {genus: 'Acropora', hidden: true});
  C.pagesOpen(S, 'g-%E0', 9000, {genus: null});
  C.pagesOpen(S, 'g-acropora', 9000, {genus: 'acropora'});
  assert.deepStrictEqual(plain(C.pagesTake(S, 12000)), {r: {'learn.genus': [3, 3]}, g: {Acropora: [1, 0, 'other', 0]}});
});

test('capped: at most PAGES.GEN genera and PAGES.ROUTES pages, the most opened first; seconds capped', () => {
  const S = C.pagesNew(),
    G = Array.from({length: 40}, (_, i) => 'Genus' + String.fromCharCode(97 + (i % 26)) + String.fromCharCode(97 + Math.floor(i / 26)));
  let t = 0;
  G.forEach((g, i) => {
    for (let k = 0; k < (i === 39 ? 3 : 1); k++) C.pagesOpen(S, 'g-' + g, (t += 1000), {genus: g, from: 'learn'});
  });
  for (let i = 0; i < 40; i++) C.pagesOpen(S, 'lab-tool' + i, (t += 1000));
  C.pagesOpen(S, 'quiz', (t += 1000));
  const out = C.pagesTake(S, (t += 200000 * 1000));
  assert.strictEqual(Object.keys(out.g).length, C.PAGES.GEN);
  assert.ok(out.g[G[39]], 'the genus opened most is kept');
  assert.strictEqual(out.g[G[39]][0], 3);
  assert.strictEqual(Object.keys(out.r).length, C.PAGES.ROUTES);
  assert.strictEqual(out.r['learn.genus'][0], 42);
  assert.strictEqual(out.r['practice.quiz'][1], C.PAGES.MAXS);
  assert.ok(JSON.stringify(out).length < 3000, 'small');
});

test('pagesClean (the sheet side): known shapes only, numbers clamped, no free text', () => {
  const x = C.pagesClean({
    vi: 'ab12cd34',
    na: 57.4,
    // As the sheet gets it, from JSON: "__proto__" is an own key there, and is dropped.
    r: JSON.parse('{"quiz": [3, 125.6], "g-x": [1, 2], "=HYPERLINK(1)": [1, 1], "genus": [-2, 1e9], "bad": "x", "__proto__": [1, 1]}'),
    g: {Acropora: [2, 30, 'quiz', 1], Porites: [1, 5, 'evil', 'yes'], acropora: [1, 1, 'quiz', 0], 'Bad Name': [1, 1]},
    note: 'free text dropped',
    photo: 'https://example.org/x.jpg'
  });
  assert.deepStrictEqual(plain(x), {
    r: {quiz: [3, 126], 'g-x': [1, 2], genus: [0, 86400]},
    g: {Acropora: [2, 30, 'quiz', 1], Porites: [1, 5, 'other', 1]},
    vi: 'ab12cd34',
    na: 57
  });
  assert.strictEqual(Object.getPrototypeOf(x.r), null);
  assert.deepStrictEqual(plain(C.pagesClean({vi: 'NOT OK', r: [], g: null})), {r: {}, g: {}, vi: ''});
  const many = {};
  for (let i = 0; i < 50; i++)
    many['Genus' + String.fromCharCode(97 + (i % 26)) + String.fromCharCode(97 + Math.floor(i / 26))] = [1, 1, 'learn', 0];
  assert.strictEqual(Object.keys(C.pagesClean({g: many}).g).length, C.PAGES.GEN);
});

// The summary the app sends (sync.js pagesSend): the screen, rounded, inside it once the sheet keeps it (VIEWPORT_SHEET,
// rule D4); before, the summary without it. No other field is added.
test('pagesSend: the rounded screen in the summary from VIEWPORT_SHEET, the summary without it before', () => {
  const fs = require('fs'),
    path = require('path'),
    vm = require('vm'),
    block = require('./block.js'),
    src = fs.readFileSync(path.join(__dirname, '..', 'sync.js'), 'utf8'),
    N = Number(/const VIEWPORT_SHEET = (\d+);/.exec(src)[1]),
    run = v => {
      const sent = [],
        ctx = {
          // the kept copy (pvKeep): its id, a stale tally sent first, and its drop (tested below)
          pvId: 'id00000001',
          pvRoll: () => sent.push(['roll']),
          pvDone: () => sent.push(['done']),
          window: {innerWidth: 393, innerHeight: 659.5, devicePixelRatio: 2.625, navigator: {userAgent: 'secret UA'}},
          viewportOf: C.viewportOf,
          pagesTake: () => ({r: {'practice.quiz': [1, 30]}, g: {}}),
          PV: {},
          PVI: 'visit0001',
          answersSoFar: () => 12,
          pvOwner: () => 'a:dev0000001',
          ev: (k, o) => sent.push([k, o]),
          // The gate and the script version the app last saw, as sync.js has them (sheetV: 0 before any reply).
          VIEWPORT_SHEET: N,
          sheetV: () => Number(v) || 0
        };
      vm.createContext(ctx);
      vm.runInContext(
        block(src, 'const viewportOn = ', '// The player active now, as a summary', {file: 'sync.js'}) + '\npagesSend();',
        ctx
      );
      return sent;
    };
  const base = {id: 'id00000001', vi: 'visit0001', na: 12, r: {'practice.quiz': [1, 30]}, g: {}, o: 'a:dev0000001'},
    S0 = ['roll'],
    done = ['done'];
  assert.deepStrictEqual(plain(run(N)), [S0, ['pages', {...base, vp: {w: 390, h: 660, d: 2.6, o: 'p', b: 2}}], done]);
  assert.deepStrictEqual(plain(run(N + 3)), [S0, ['pages', {...base, vp: {w: 390, h: 660, d: 2.6, o: 'p', b: 2}}], done]);
  assert.deepStrictEqual(plain(run(N - 1)), [S0, ['pages', base], done], 'an older script: the summary as before');
  // No gate on the Pages tab: a summary is always sent, without the screen below VIEWPORT_SHEET, also before any reply
  // (no version known yet).
  assert.deepStrictEqual(plain(run(1)), [S0, ['pages', base], done], 'an old script: the summary, no screen');
  assert.deepStrictEqual(plain(run(undefined)), [S0, ['pages', base], done], 'no version yet: the summary, no screen');
  // What the sheet keeps of it is what was sent (pagesClean takes the app's rounded values as they are).
  const [, [, sent]] = run(N);
  assert.deepStrictEqual(plain(C.pagesClean(sent)).vp, sent.vp);
  assert.ok(!/secret UA/.test(JSON.stringify(sent)), 'no user agent in the summary');
});

// The screen of a summary (core.js VIEWPORT, viewportOf): coarse, so it adds no fingerprint.
test('viewportOf: the CSS viewport to 10 px, the pixel ratio to one decimal, the orientation, the band of the exact short side', () => {
  const V = C.viewportOf;
  assert.deepStrictEqual(V(360, 800, 3), {w: 360, h: 800, d: 3, o: 'p', b: 0});
  assert.deepStrictEqual(V(412, 783, 2.625), {w: 410, h: 780, d: 2.6, o: 'p', b: 2});
  assert.deepStrictEqual(V(375.5, 667.4, 2), {w: 380, h: 670, d: 2, o: 'p', b: 1});
  // The band is taken from the exact width, not the rounded one: the 10 px grid cannot keep the edges.
  assert.strictEqual(V(393, 659, 3).w, 390);
  assert.strictEqual(V(393, 659, 3).b, 2, 'a 393 px phone is in 391-414, though shown as 390');
  assert.strictEqual(V(390, 664, 3).b, 1);
  assert.strictEqual(V(361, 700, 2).b, 1, '361 is above 360, though it rounds to 360');
  assert.strictEqual(V(414, 800, 3).b, 2);
  assert.strictEqual(V(415, 800, 3).b, 3);
  assert.strictEqual(V(600, 960, 2).b, 3);
  assert.strictEqual(V(601, 960, 2).b, 4);
  // Held sideways: landscape, the band of the short side.
  assert.deepStrictEqual(V(800, 360, 3), {w: 800, h: 360, d: 3, o: 'l', b: 0});
  assert.deepStrictEqual(V(1440, 789, 1.1), {w: 1440, h: 790, d: 1.1, o: 'l', b: 4});
  // Clamped: an absurd window or ratio says no more than the edges.
  assert.deepStrictEqual(V(1e6, 50000, 99), {w: 10000, h: 10000, d: 8, o: 'l', b: 4});
  assert.strictEqual(V(320, 480, 0.01).d, 0.5);
  // Not a screen: nothing.
  for (const bad of [
    [0, 800, 3],
    [360, -1, 3],
    [360, 800, 0],
    [NaN, 800, 3],
    [Infinity, 800, 3],
    ['x', 800, 3],
    [undefined, undefined, undefined]
  ])
    assert.strictEqual(V(...bad), null, JSON.stringify(bad));
  // Every value it sends sits on its grid: few distinct values whatever the device.
  for (let w = 300; w < 1500; w += 7)
    for (const d of [1, 1.25, 1.5, 1.75, 2, 2.625, 2.75, 3, 3.5]) {
      const v = V(w, w * 1.7 + 3, d);
      assert.ok(v.w % 10 === 0 && v.h % 10 === 0 && Math.abs(v.d * 10 - Math.round(v.d * 10)) < 1e-9, JSON.stringify(v));
      assert.deepStrictEqual(Object.keys(v), ['w', 'h', 'd', 'o', 'b']);
    }
});

test('pagesClean keeps the screen only as viewportOf makes it: rounded and clamped again, a band that agrees, nothing else', () => {
  const clean = vp => plain(C.pagesClean({vi: 'ab12cd34', r: {quiz: [1, 5]}, g: {}, vp}));
  // As the app sends it: kept as it is.
  assert.deepStrictEqual(clean({w: 390, h: 660, d: 3, o: 'p', b: 2}).vp, {w: 390, h: 660, d: 3, o: 'p', b: 2});
  // A tampered or older device: exact values rounded, extra fields and free text dropped.
  assert.deepStrictEqual(clean({w: 393.7, h: 851.2, d: 2.6251, o: 'p', b: 2, ua: 'Mozilla/5.0 …', id: 'x'}).vp, {
    w: 390,
    h: 850,
    d: 2.6,
    o: 'p',
    b: 2
  });
  assert.deepStrictEqual(clean({w: 99999, h: 99999, d: 1000, o: 'p', b: 4}).vp, {w: 10000, h: 10000, d: 8, o: 'p', b: 4});
  // The band must agree with the rounded short side (390 covers 385-394: band 1 or 2), else it is taken from it.
  assert.strictEqual(clean({w: 390, h: 660, d: 3, o: 'p', b: 1}).vp.b, 1);
  assert.strictEqual(clean({w: 390, h: 660, d: 3, o: 'p', b: 0}).vp.b, 1, 'a band the size cannot have');
  assert.strictEqual(clean({w: 390, h: 660, d: 3, o: 'p', b: 9}).vp.b, 1);
  assert.strictEqual(clean({w: 390, h: 660, d: 3, o: 'p', b: 1.5}).vp.b, 1);
  assert.strictEqual(clean({w: 390, h: 660, d: 3, o: 'p'}).vp.b, 1, 'no band: from the rounded short side');
  assert.strictEqual(clean({w: 1280, h: 720, d: 1, o: 'l', b: 0}).vp.b, 4);
  // The orientation from a fixed list, else from the size.
  assert.strictEqual(clean({w: 800, h: 360, d: 3, o: '<b>'}).vp.o, 'l');
  assert.strictEqual(clean({w: 800, h: 360, d: 3, o: 'l', b: 0}).vp.o, 'l');
  // Not a screen: no vp at all (an older app's summary is cleaned as it always was).
  for (const bad of [
    undefined,
    null,
    'big',
    [360, 800, 3],
    {},
    {w: 360},
    {w: 360, h: 800},
    {w: 0, h: 800, d: 3},
    {w: '=1+1', h: 800, d: 3}
  ])
    assert.ok(!('vp' in clean(bad)), JSON.stringify(bad));
  assert.deepStrictEqual(clean(undefined), {r: {quiz: [1, 5]}, g: {}, vi: 'ab12cd34'});
  // The prototype stays out of it.
  assert.ok(!('vp' in clean(JSON.parse('{"__proto__": {"w": 360, "h": 800, "d": 3}}'))));
});

test('a queued summary is sent only under the player it was queued for (Codex review #423)', () => {
  const pg = (id, o) => ({id, k: 'pages', o, r: {quiz: [1, 1]}, g: {}}),
    q = [{id: 'e1', k: 'err', msg: 'x'}, pg('p1', 'n:ana'), pg('p2', 'a:dev0000001'), pg('p3', 'n:ana'), pg('p4'), {id: 'e2', k: 'load'}];
  // Signed in as Ana: her summaries and the other events; the others never go under her name, they are dropped.
  const A = C.pagesBatch(q, 'n:ana');
  assert.deepStrictEqual(
    A.send.map(x => x.id),
    ['e1', 'p1', 'p3', 'e2']
  );
  assert.ok(
    A.send.every(x => !('o' in x)),
    'the owner stays on the device'
  );
  assert.deepStrictEqual(A.drop, ['p2', 'p4']);
  // Signed out (a new anonymous id): none of Ana's.
  const B = C.pagesBatch(q, 'a:dev0000009');
  assert.deepStrictEqual(
    B.send.map(x => x.id),
    ['e1', 'e2']
  );
  assert.deepStrictEqual(B.drop, ['p1', 'p2', 'p3', 'p4']);
  // At sign-in the device's anonymous summaries become the account's, as its answers do.
  assert.deepStrictEqual(
    C.pagesOwn(q, 'a:dev0000001', 'n:ana')
      .filter(x => x.k === 'pages')
      .map(x => x.o),
    ['n:ana', 'n:ana', 'n:ana', undefined]
  );
  assert.strictEqual(C.pagesOwner({name: 'Ana', pin: '1234'}, 'x'), 'n:ana');
  assert.strictEqual(C.pagesOwner(null, 'dev0000001'), 'a:dev0000001');
});

// The feedback sheet's tally: four numbers a visit in the summary the app already sends: answers whose feedback was
// shown, those where More was opened, the seconds it stayed on screen (each answer's capped) and the taps on a link
// inside it. Counts only; no new event, no gate (an older sheet script drops the field, as it drops any field it does
// not know).
test('the feedback sheet tally: four numbers a visit, counted once, sent with the summary, started again', () => {
  const S = C.pagesNew();
  assert.deepStrictEqual(C.PAGES.FB, ['shown', 'more', 'sec', 'link']);
  C.pagesOpen(S, 'quiz', 0);
  // a summary taken, the page in view going on counting (the app sends one when it is hidden or left, then goes on)
  const take = t => {
    const x = C.pagesTake(S, t);
    C.pagesResume(S, t);
    return x;
  };
  assert.strictEqual(take(1000).fb, undefined, 'no feedback seen: the summary has no fb');
  ['shown', 'shown', 'shown', 'more', 'link'].forEach(k => C.pagesFb(S, k));
  C.pagesFb(S, 'sec', 2.4);
  C.pagesFb(S, 'sec', 5);
  const sum = take(2000);
  assert.deepStrictEqual(plain(sum.fb), [3, 1, 7, 1]);
  // the next summary starts again from nothing
  assert.strictEqual(take(3000).fb, undefined);
  C.pagesFb(S, 'shown');
  assert.deepStrictEqual(plain(take(4000).fb), [1, 0, 0, 0]);
  // each answer's seconds are capped; a zero, a negative, a non-number and an unknown kind count nothing
  C.pagesFb(S, 'sec', 9999);
  C.pagesFb(S, 'sec', 0);
  C.pagesFb(S, 'sec', -4);
  C.pagesFb(S, 'sec', 'x');
  C.pagesFb(S, 'nothing');
  assert.deepStrictEqual(plain(take(5000).fb), [0, 0, C.PAGES.FBSEC, 0]);
  // with no page open there is no summary to carry the numbers: they wait for the next one, none lost
  const T = C.pagesNew();
  C.pagesFb(T, 'shown');
  assert.strictEqual(C.pagesTake(T, 1000), null);
  C.pagesOpen(T, 'quiz', 2000);
  assert.deepStrictEqual(plain(C.pagesTake(T, 3000).fb), [1, 0, 0, 0]);
});

test('pagesClean keeps the feedback tally only as four clamped numbers, nothing else', () => {
  const clean = fb => C.pagesClean({r: {quiz: [1, 1]}, fb}).fb;
  assert.deepStrictEqual(plain(clean([12, 3, 90, 2])), [12, 3, 90, 2]);
  assert.deepStrictEqual(plain(clean([12.6, 3.2, 90.5, '2'])), [13, 3, 91, 2]);
  assert.deepStrictEqual(plain(clean([1e9, -5, 1e9, 'x'])), [C.PAGES.FBMAX, 0, C.PAGES.MAXS, 0]);
  // not four numbers, all zero, free text, an object: nothing
  [[1, 2, 3], [1, 2, 3, 4, 5], [0, 0, 0, 0], 'x', {shown: 1}, null, undefined, 7].forEach(x =>
    assert.strictEqual(clean(x), undefined, JSON.stringify(x))
  );
  // the summary the app takes is what the sheet keeps
  const S = C.pagesNew();
  C.pagesOpen(S, 'quiz', 0);
  C.pagesFb(S, 'shown');
  C.pagesFb(S, 'more');
  const sum = C.pagesTake(S, 1000);
  assert.deepStrictEqual(plain(C.pagesClean(sum).fb), plain(sum.fb));
  assert.ok(JSON.stringify(sum).length < 3000, 'small');
});

// The quiz counts it: the sheet drawn, More opened once an answer, the seconds when it leaves, a link tapped (quiz.js fbShown,
// fbMoreBind, fbEnd; sync.js fbTally; the page smoke tests/pages.smoke.js runs it in the app).
test('quiz.js counts the sheet shown, More once an answer, its seconds capped, and leaves nothing else', () => {
  const fs = require('fs'),
    path = require('path'),
    vm = require('vm'),
    block = require('./block.js'),
    quiz = fs.readFileSync(path.join(__dirname, '..', 'quiz.js'), 'utf8');
  const counts = [],
    el = {hidden: true, attrs: {}, text: 'More'},
    btn = {
      setAttribute: (k, v) => (el.attrs[k] = v),
      set textContent(v) {
        el.text = v;
      },
      get textContent() {
        return el.text;
      }
    },
    panel = {
      get hidden() {
        return el.hidden;
      },
      set hidden(v) {
        el.hidden = v;
      },
      querySelector: () => (el.again ? {} : null)
    },
    listeners = [],
    visible = [];
  let now = 1e6,
    told = 0;
  const ctx = {
    PAGES: C.PAGES,
    Date: {now: () => now},
    fbTally: (k, n) => counts.push([k, n]),
    isStacked: () => false,
    fitStage: () => {},
    againTold: () => told++,
    document: {
      visibilityState: 'visible',
      addEventListener: (t, f) => t === 'visibilitychange' && visible.push(f),
      getElementById: id => ({fbmbtn: btn, fbmore: panel, after: {addEventListener: (t, f) => listeners.push(f)}})[id]
    }
  };
  vm.createContext(ctx);
  vm.runInContext(
    block(quiz, 'let FBS = null;', '// More / Less on the sheet', {file: 'quiz.js'}) +
      block(quiz, 'function fbMoreBind() {', '\n}\n', {through: 1, file: 'quiz.js'}) +
      '\nthis.M = {fbShown, fbEnd, fbMoreBind};',
    ctx
  );
  const {fbShown, fbEnd, fbMoreBind} = ctx.M;
  // an answer: shown, More opened twice (counted once, the duel line told once), 10.4 s, left
  el.again = true;
  fbShown();
  fbMoreBind();
  btn.onclick();
  assert.deepStrictEqual([el.hidden, el.attrs['aria-expanded'], el.text], [false, 'true', 'Less']);
  btn.onclick();
  assert.deepStrictEqual([el.hidden, el.attrs['aria-expanded'], el.text], [true, 'false', 'More']);
  btn.onclick();
  now += 10400;
  fbEnd();
  assert.deepStrictEqual(counts, [
    ['shown', undefined],
    ['more', undefined],
    ['sec', 10]
  ]);
  assert.strictEqual(told, 1, 'the duel line is told once, when More is first opened');
  // a link of the app tapped inside the sheet; an outside link or a non-link counts nothing
  listeners[0]({target: {closest: s => (s === 'a[href^="#"]' ? {} : null)}});
  listeners[0]({target: {closest: () => null}});
  assert.strictEqual(counts.filter(c => c[0] === 'link').length, 1);
  // a sheet that never leaves counts at most FBSEC; a second answer ends the first (its seconds counted once)
  counts.length = 0;
  fbShown();
  now += 500 * 1000;
  fbShown();
  now += 3000;
  fbEnd(false);
  now += 3000;
  fbEnd();
  fbEnd(); // nothing on screen: nothing counted
  assert.deepStrictEqual(counts, [
    ['shown', undefined],
    ['sec', C.PAGES.FBSEC],
    ['shown', undefined],
    ['sec', 3],
    ['sec', 3]
  ]);
  // The app hidden stops the clock: 2 s read, 5 minutes in the background, 1 s more: 3 s, not 120
  counts.length = 0;
  fbShown();
  now += 2000;
  ctx.document.visibilityState = 'hidden';
  visible[0](); // the app is hidden: the seconds so far are counted, the clock stops
  now += 300 * 1000;
  fbEnd(false); // a summary taken meanwhile (pagesSend) adds nothing
  ctx.document.visibilityState = 'visible';
  visible[0](); // back: the clock starts again
  now += 1000;
  fbEnd();
  assert.deepStrictEqual(counts, [
    ['shown', undefined],
    ['sec', 2],
    ['sec', 1]
  ]);
});

// The visit's summary kept on the device (sync.js pvKeep, pvRecover, pvRoll, pagesSend;
// docs/decisions/2026-11-23-pages-kept-copy.md): a page killed without a hidden event still sends its summary, and every
// tally reaches the sheet once. Each page is the sync.js code in a vm of its own, all sharing one localStorage (the event
// queue included), on a clock the test moves. sheet() keeps the first row of each event id, as Code.gs events_ does.
test('a page killed without a hidden event: its summary sent by whichever page sees it stale first; each tally once', () => {
  const fs = require('fs'),
    path = require('path'),
    vm = require('vm'),
    block = require('./block.js'),
    src = fs.readFileSync(path.join(__dirname, '..', 'sync.js'), 'utf8'),
    code =
      block(src, 'const fbTally = ', '// The player active now, as a summary', {file: 'sync.js'}) +
      block(src, "// The visit's summary kept on the device", '\npvRecover();\n', {through: 1, file: 'sync.js'}) +
      '\nthis.M = {pagesSend, pvKeep, pvRecover, pvRoll, fbTally, id: () => pvId};';
  const LS = new Map(),
    Q = [];
  let clock = Date.UTC(2026, 10, 23, 2),
    ids = 0,
    refuse = false;
  const FD = function (...a) {
    return new Date(...a);
  };
  FD.now = () => clock;
  FD.parse = Date.parse;
  const store = {
      get: (k, d) => (LS.has(k) ? JSON.parse(LS.get(k)) : d),
      set: (k, v) => refuse || LS.set(k, JSON.stringify(v))
    },
    // localStorage over the same map; writes: every key a page writes or removes, in order
    writes = [],
    localStorage = {
      get length() {
        return LS.size;
      },
      key: i => [...LS.keys()][i] || null,
      removeItem: k => (writes.push(k), LS.delete(k))
    };
  // ev as sync.js has it: into the shared queue (reefid-evq); Q logs every event queued.
  const ev = (k, o) => {
    const x = {k, ...plain(o)};
    Q.push(x);
    LS.set('reefid-evq', JSON.stringify([...store.get('reefid-evq', []), x]));
  };
  const sentOut = () => LS.delete('reefid-evq'), // the queue sent
    sheet = () => Q.filter((x, i) => Q.findIndex(y => y.id === x.id) === i);
  const page = (vi, owner = 'a:dev0000001') => {
    const beats = [],
      shows = [],
      ctx = {
        store: {get: store.get, set: (k, v) => (writes.push(k), store.set(k, v))},
        localStorage,
        Date: FD,
        PV: C.pagesNew(),
        PVI: vi,
        pagesTake: C.pagesTake,
        pagesResume: C.pagesResume,
        pagesFb: C.pagesFb,
        EVQ: 'reefid-evq',
        pagesScreen: () => ({}),
        answersSoFar: () => 3,
        pvOwner: () => owner,
        appVer: () => '7-abc',
        evId: () => 'id' + ++ids,
        location: {hash: '#learn/genera'},
        document: {visibilityState: 'visible'},
        window: {addEventListener: (t, f) => t === 'pageshow' && shows.push(f)},
        ev,
        setInterval: (f, ms) => beats.push([f, ms])
      };
    vm.createContext(ctx);
    vm.runInContext(code, ctx);
    return {
      ctx,
      beats,
      open: h => C.pagesOpen(ctx.PV, h, clock),
      // pagesRoute's order: a stale tally sent first, the opening, the copy kept
      route(h) {
        ctx.M.pvRoll(clock);
        C.pagesOpen(ctx.PV, h, clock);
        ctx.M.pvKeep(clock);
      },
      beat: () => beats.forEach(([f]) => f()),
      show: () => shows.forEach(f => f()),
      ...ctx.M
    };
  };
  const P0 = 'reefid-pv-live-',
    copies = () => Object.fromEntries([...LS.keys()].filter(k => k.startsWith(P0)).map(k => [k.slice(P0.length), JSON.parse(LS.get(k))])),
    live = () => Object.keys(copies()).sort(),
    reset = () => {
      Q.length = 0;
      sentOut();
    };
  // pagesRoute and the return to view roll a stale tally before the tally changes.
  const rsrc = block(src, 'function pagesRoute(h) {', '\n}\n', {through: 1, file: 'sync.js'}),
    vsrc = block(src, '  } else {\n    pvRoll(Date.now());', '});', {file: 'sync.js'});
  assert.ok(rsrc.indexOf('pvRoll(') >= 0 && rsrc.indexOf('pvRoll(') < rsrc.indexOf('pagesOpen('), 'pagesRoute rolls first');
  assert.ok(vsrc.indexOf('pvRoll(') < vsrc.indexOf('pagesResume('), 'back in view: rolled first');
  // The shared map of an earlier build is removed once, at load.
  LS.set('reefid-pv-live', '{}');
  // Page A: the quiz 10 s, Genera 5 s; its copy is kept when a page opens and at each beat (15 s, in view only).
  const A = page('visita');
  assert.ok(!LS.has('reefid-pv-live'));
  assert.deepStrictEqual(
    A.beats.map(([, ms]) => ms),
    [15000]
  );
  A.open('quiz');
  clock += 10000;
  A.open('genera');
  A.pvKeep();
  clock += 5000;
  A.beat();
  assert.deepStrictEqual(live(), ['visita']);
  const copy = copies().visita;
  assert.deepStrictEqual(copy.r, {'practice.quiz': [1, 10], 'learn.genera': [1, 5]});
  assert.deepStrictEqual(
    [copy.k, copy.id, copy.vi, copy.na, copy.o, copy.pg, copy.av, copy.t],
    ['pages', 'id1', 'visita', 3, 'a:dev0000001', 'learn/genera', '7-abc', new Date(clock).toISOString()]
  );
  assert.strictEqual(copy.id, A.id(), 'the copy carries the summary event id');
  // Hidden: no beat. The tally itself went on (the copy is read from a copy of it).
  clock += 5000;
  A.ctx.document.visibilityState = 'hidden';
  A.beat();
  assert.strictEqual(copies().visita.t, copy.t);
  A.ctx.document.visibilityState = 'visible';
  A.beat();
  assert.deepStrictEqual(copies().visita.r, {'practice.quiz': [1, 10], 'learn.genera': [1, 10]});
  // A is killed: no hidden event, no pagehide. Page B opens 20 s later (a reload): A's copy is too fresh to tell from a
  // page still open in another tab, so it waits.
  clock += 20000;
  const B = page('visitb');
  assert.strictEqual(Q.length, 0, 'a copy written 20 s ago is left: it may be a live tab');
  B.open('');
  clock += 15000;
  B.beat();
  assert.strictEqual(Q.length, 0);
  assert.deepStrictEqual(live(), ['visita', 'visitb']);
  // Two minutes without a write: A's copy is stale. B's next beat queues it as it is, with A's id, time and owner.
  const aT = copies().visita.t;
  for (let i = 0; i < 8; i++) {
    clock += 15000; // B in view, beating
    B.beat();
  }
  assert.strictEqual(Q.length, 1);
  const sent = Q[0];
  assert.deepStrictEqual([sent.k, sent.id, sent.vi, sent.o, sent.t, sent.na], ['pages', 'id1', 'visita', 'a:dev0000001', aT, 3]);
  assert.deepStrictEqual(sent.r, {'practice.quiz': [1, 10], 'learn.genera': [1, 10]});
  assert.deepStrictEqual(plain(C.pagesClean(sent).r), sent.r, 'the sheet keeps it as any summary');
  assert.deepStrictEqual(live(), ['visitb']);
  clock += 15000;
  B.beat();
  const B2 = page('visitc');
  assert.strictEqual(Q.length, 1, 'queued once');
  // B left normally (hidden): its summary queued under its copy's id, the copy dropped; nothing is queued again later.
  reset();
  const bid = copies().visitb.id;
  B.pagesSend();
  assert.deepStrictEqual(
    Q.map(x => [x.vi, x.id]),
    [['visitb', bid]]
  );
  assert.deepStrictEqual(live(), []);
  assert.notStrictEqual(B.id(), bid, 'a new tally, a new event id');
  B.pagesSend(); // pagehide after the hidden event: nothing left
  clock += 600000;
  B.show();
  B2.pvRecover();
  page('visitd');
  assert.strictEqual(Q.length, 1, 'a summary queued when the app was left is never queued again');
  // A reload long after a kill: the next page queues the copy at load.
  reset();
  const D = page('visite');
  D.open('quiz');
  clock += 4000;
  D.pvKeep();
  clock += 300000;
  page('visitf');
  assert.deepStrictEqual(
    Q.map(x => [x.vi, x.r]),
    [['visite', {'practice.quiz': [1, 4]}]]
  );
  // A computer asleep with the app in view: another page takes its stale copy out of the store and sends it. Awake, its
  // copy is gone: it does not send it again, and goes on with a new tally under a new id. Whether the other page's send
  // left the queue or not (the sheet's check of recent ids is never needed), each tally is sent once.
  for (const flushed of [false, true]) {
    reset();
    const E = page('visitg' + flushed),
      F = page('visith' + flushed);
    E.open('quiz');
    clock += 8000;
    E.beat();
    const first = E.id();
    clock += 600000; // asleep
    F.beat();
    assert.deepStrictEqual(
      Q.map(x => [x.id, x.r]),
      [[first, {'practice.quiz': [1, 8]}]]
    );
    if (flushed) sentOut();
    E.beat(); // awake
    assert.notStrictEqual(E.id(), first, 'the live page never goes on with a stale tally');
    clock += 3000;
    E.pagesSend();
    assert.deepStrictEqual(
      sheet().map(x => [x.id === first, x.r]),
      [
        [true, {'practice.quiz': [1, 8]}],
        [false, {'practice.quiz': [0, 3]}]
      ]
    );
    assert.strictEqual(Q.length, 2, 'each tally sent once');
    F.pagesSend();
  }
  // Left before its next beat: the stale copy as it is, nothing more.
  reset();
  const G = page('visiti'),
    H = page('visitj');
  G.open('quiz');
  clock += 6000;
  G.beat();
  clock += 600000;
  H.beat();
  G.pagesSend();
  assert.deepStrictEqual(
    sheet().map(x => [x.vi, x.r]),
    [['visiti', {'practice.quiz': [1, 6]}]]
  );
  H.pagesSend();
  // A page whose copy went stale while nobody else was open: back in view (pageshow), it sends it itself.
  reset();
  const W = page('visitu');
  W.open('quiz');
  clock += 5000;
  W.beat();
  clock += 600000;
  W.show();
  assert.deepStrictEqual(
    Q.map(x => [x.vi, x.r]),
    [['visitu', {'practice.quiz': [1, 5]}]]
  );
  clock += 2000;
  W.pagesSend();
  assert.deepStrictEqual(
    sheet().map(x => x.r),
    [{'practice.quiz': [1, 5]}, {'practice.quiz': [0, 2]}]
  );
  // Two pages in view at once (two windows): neither sends the other's copy.
  reset();
  const I = page('visitk'),
    J = page('visitl');
  I.open('quiz');
  J.open('genera');
  for (let i = 0; i < 20; i++) {
    clock += 15000;
    I.beat();
    J.beat();
  }
  assert.strictEqual(Q.length, 0);
  // Codex's interleaving: one window's beat between the other's read and write could drop the other's copy with a shared
  // map. Now a page's beat writes only its own key, so both copies survive any order, and the one killed is sent.
  writes.length = 0;
  I.beat();
  assert.ok(
    writes.every(k => k === P0 + 'visitk'),
    JSON.stringify(writes)
  );
  writes.length = 0;
  J.pvKeep();
  I.pvKeep();
  assert.ok(writes.every(k => k === P0 + 'visitk' || k === P0 + 'visitl'));
  assert.deepStrictEqual(
    live().filter(k => k === 'visitk' || k === 'visitl'),
    ['visitk', 'visitl'],
    'both copies survive'
  );
  const jCopy = copies().visitl;
  for (let i = 0; i < 9; i++) {
    clock += 15000; // J killed; I in view
    I.beat();
  }
  assert.deepStrictEqual(
    Q.map(x => [x.vi, x.id]),
    [['visitl', jCopy.id]]
  );
  reset();
  I.pagesSend();
  // A device whose storage refuses the copy: the app left sends its summary as before.
  reset();
  refuse = true;
  const K = page('visitm');
  K.open('quiz');
  clock += 2000;
  K.beat();
  assert.ok(!live().includes('visitm'));
  K.pagesSend();
  assert.deepStrictEqual(
    Q.map(x => [x.vi, x.r]),
    [['visitm', {'practice.quiz': [1, 2]}]]
  );
  // and, asleep there, it sends its stale tally itself when back (no other page can have it), then a new one
  reset();
  const K2 = page('visitm2');
  K2.open('quiz');
  clock += 3000;
  K2.beat();
  clock += 600000;
  K2.show();
  clock += 1000;
  K2.pagesSend();
  assert.deepStrictEqual(
    Q.map(x => x.r),
    [{'practice.quiz': [1, 3]}, {'practice.quiz': [0, 1]}]
  );
  refuse = false;
  // Two pages opened at the same moment both find the copy: the one already in the shared queue is not queued again.
  reset();
  const M = page('visitn');
  M.open('quiz');
  clock += 2000;
  M.pvKeep();
  ev('pages', copies().visitn);
  Q.length = 0;
  clock += 300000;
  page('visito');
  assert.strictEqual(Q.length, 0);
  assert.ok(!live().includes('visitn'));
  // No copy is ever pushed out by others: eight pages in view each keep theirs.
  reset();
  const N = 8,
    many = [];
  for (let i = 0; i < N; i++) {
    const P = page('many' + i);
    many.push(P);
    P.open('quiz');
    clock += 1000;
    P.pvKeep();
  }
  assert.strictEqual(live().filter(k => k.startsWith('many')).length, N);
  many.forEach(P => P.pagesSend());
  assert.strictEqual(Q.length, N);
  // Codex's sequence: a page's copy sent by another page (asleep), the page resumes, more pages open copies of their own,
  // then it is left: each tally once, the new one under its new id.
  reset();
  const R = page('visitq'),
    S = page('visitr');
  R.open('quiz');
  clock += 7000;
  R.beat();
  const rFirst = R.id();
  clock += 600000; // asleep
  S.beat();
  R.beat(); // awake
  clock += 4000;
  R.beat();
  const newer = [];
  for (let i = 0; i < N; i++) {
    const P = page('newer' + i);
    newer.push(P);
    P.open('genera');
    clock += 1000;
    P.pvKeep();
  }
  assert.ok(live().includes('visitq'), 'its new copy stays');
  clock += 2000;
  R.pagesSend();
  const rs = sheet().filter(x => x.vi === 'visitq');
  assert.deepStrictEqual(
    rs.map(x => [x.id === rFirst, x.r]),
    [
      [true, {'practice.quiz': [1, 7]}],
      [false, {'practice.quiz': [0, 4 + N + 2]}]
    ]
  );
  newer.forEach(P => P.pagesSend());
  S.pagesSend();
  // A page opened after a stale period, before any beat (pagesRoute: rolled first): the opening is in the new tally;
  // left after 5 s or at once, it is there, the stale tally sent once as it was.
  for (const wait of [5000, 0]) {
    reset();
    const T = page('visits' + wait),
      U = page('visitt' + wait);
    T.route('quiz');
    clock += 9000;
    T.beat();
    clock += 600000; // asleep
    U.beat();
    T.route('genera'); // awake, before any beat
    clock += wait;
    T.pagesSend();
    assert.deepStrictEqual(
      sheet().map(x => x.r),
      [{'practice.quiz': [1, 9]}, {'learn.genera': [1, wait / 1000]}],
      `the opening kept, left after ${wait} ms`
    );
    U.pagesSend();
  }
  // Feedback right after resuming, before any beat (fbTally rolls first): the count is in the new tally.
  reset();
  const V = page('visitv'),
    X = page('visitw');
  V.open('quiz');
  V.fbTally('shown');
  clock += 6000;
  V.beat();
  clock += 600000; // asleep
  X.beat();
  V.fbTally('shown'); // awake: a new answer's feedback
  V.fbTally('more');
  clock += 1000;
  V.pagesSend();
  assert.deepStrictEqual(
    sheet().map(x => [x.r, x.fb]),
    [
      [{'practice.quiz': [1, 6]}, [1, 0, 0, 0]],
      [{'practice.quiz': [0, 1]}, [1, 1, 0, 0]]
    ]
  );
  X.pagesSend();
  // The answer's feedback sheet on screen: its seconds so far are in each copy (quiz.js fbEnd(false), counted once).
  reset();
  const FB = page('visitp');
  let fbAt = clock,
    fbCalls = 0;
  FB.ctx.fbEnd = end => {
    fbCalls++;
    assert.strictEqual(end, false, 'the sheet stays open');
    C.pagesFb(FB.ctx.PV, 'sec', Math.round((clock - fbAt) / 1000));
    fbAt = clock;
  };
  FB.open('quiz');
  C.pagesFb(FB.ctx.PV, 'shown');
  clock += 20000;
  FB.beat();
  clock += 15000;
  FB.beat();
  assert.strictEqual(fbCalls, 2);
  assert.deepStrictEqual(copies().visitp.fb, [1, 0, 35, 0]);
});
