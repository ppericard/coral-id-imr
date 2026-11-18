require('./slot.js').testGuard();
// Pages opened in a visit (core.js PAGES, sheet v30 'pages'): the tally the app keeps and the summary it sends.
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

// A fish page is told apart from a coral one (fish UX study, 2026-11-04: the fish quiz was logged as 'quiz'): drawn with
// Fish on screen it is fish.<page>; the corals keep the plain names; the sheet's cleaning keeps it; the admin reads it back.
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
// rule D4); before, the summary as it always was. No other field is added.
test('pagesSend: the rounded screen in the summary from VIEWPORT_SHEET, nothing before', () => {
  const fs = require('fs'),
    path = require('path'),
    vm = require('vm'),
    block = require('./block.js'),
    src = fs.readFileSync(path.join(__dirname, '..', 'sync.js'), 'utf8'),
    N = Number(/const VIEWPORT_SHEET = (\d+);/.exec(src)[1]),
    run = v => {
      const sent = [],
        ctx = {
          window: {innerWidth: 393, innerHeight: 659.5, devicePixelRatio: 2.625, navigator: {userAgent: 'secret UA'}},
          viewportOf: C.viewportOf,
          pagesTake: () => ({r: {'practice.quiz': [1, 30]}, g: {}}),
          PV: {},
          PAGES: C.PAGES,
          SHEETV: 'sv',
          store: {get: () => v},
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
        block(src, 'const viewportOn = ', '\nfunction pagesSend() {', {file: 'sync.js'}) +
          block(src, 'function pagesSend() {', '\n}\n', {through: 1, file: 'sync.js'}) +
          '\npagesSend();',
        ctx
      );
      return sent;
    };
  const base = {vi: 'visit0001', na: 12, r: {'practice.quiz': [1, 30]}, g: {}, o: 'a:dev0000001'};
  assert.deepStrictEqual(plain(run(N)), [['pages', {...base, vp: {w: 390, h: 660, d: 2.6, o: 'p', b: 2}}]]);
  assert.deepStrictEqual(plain(run(N + 3)), [['pages', {...base, vp: {w: 390, h: 660, d: 2.6, o: 'p', b: 2}}]]);
  assert.deepStrictEqual(plain(run(N - 1)), [['pages', base]], 'an older script: the summary as before');
  assert.deepStrictEqual(plain(run(C.PAGES.SHEET - 1)), [], 'before the Pages tab: nothing');
  // What the sheet keeps of it is what was sent (pagesClean takes the app's rounded values as they are).
  const [[, sent]] = run(N);
  assert.deepStrictEqual(plain(C.pagesClean(sent)).vp, sent.vp);
  assert.ok(!/secret UA/.test(JSON.stringify(sent)), 'no user agent in the summary');
});

// The screen of a summary (core.js VIEWPORT, viewportOf; Pierre, 2026-11-18): coarse, so it adds no fingerprint.
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
