// Pages opened in a visit (core.js PAGES, sheet v30 'pages'): the tally the app keeps and the summary it sends.
// node --test tests/
const test = require('node:test'),
  assert = require('node:assert');
const C = require('../core.js');

const plain = o => JSON.parse(JSON.stringify(o));

test('page names: routes without their parameters, genus sheets, look-alikes, home', () => {
  const N = C.pageName;
  assert.strictEqual(N(''), 'home');
  assert.strictEqual(N('#home'), 'home');
  assert.strictEqual(N('g-Acropora'), 'genus');
  assert.strictEqual(N('g-%E0'), 'genus');
  assert.strictEqual(N('cmp'), 'lookalikes');
  assert.strictEqual(N('cmp|Pocillopora|Stylophora'), 'lookalikes');
  assert.strictEqual(N('cmp-Pocillopora|Stylophora'), 'compare');
  assert.strictEqual(N('quiz-custom|play'), 'quiz-custom');
  assert.strictEqual(N('quiz-duel|Foo|Bar'), 'quiz-duel');
  assert.strictEqual(N('quiz-board'), 'progress');
  assert.strictEqual(N('idkey|form=b;box=b1'), 'idkey');
  assert.strictEqual(N('lab-basics|walls'), 'lab-basics');
  assert.strictEqual(N('<script>'), 'other');
  assert.strictEqual(N('__proto__'), 'other');
  assert.strictEqual(N('x'.repeat(60)), 'other');
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
    r: {quiz: [2, 90], genus: [3, 30], home: [1, 5], genera: [1, 4]},
    // Acropora: opened twice, from the quiz first (the origin of its first opening is kept), already asked.
    g: {Acropora: [2, 23, 'quiz', 1], Porites: [1, 7, 'learn', 0]}
  });
  // A fresh tally for the rest of the visit: the page in view goes on, with no new opening.
  C.pagesResume(S, t);
  const more = C.pagesTake(S, (t += 2000));
  assert.deepStrictEqual(plain(more), {r: {genus: [0, 2]}, g: {Acropora: [0, 2, 'quiz', 1]}});
  assert.strictEqual(C.pagesTake(S, t), null, 'nothing new: no summary');
});

test('a page opened while the app is hidden counts its opening, not its time; a genus not named is not a sheet', () => {
  const S = C.pagesNew();
  C.pagesOpen(S, 'g-Acropora', 0, {genus: 'Acropora', hidden: true});
  C.pagesOpen(S, 'g-%E0', 9000, {genus: null});
  C.pagesOpen(S, 'g-acropora', 9000, {genus: 'acropora'});
  assert.deepStrictEqual(plain(C.pagesTake(S, 12000)), {r: {genus: [3, 3]}, g: {Acropora: [1, 0, 'other', 0]}});
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
  assert.strictEqual(out.r.genus[0], 42);
  assert.strictEqual(out.r.quiz[1], C.PAGES.MAXS);
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
