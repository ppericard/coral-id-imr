// The app's addresses (URL refonte, Pierre 2026-11-05, Q53-Q56; docs/reviews/2026-11-05-url-scheme-study.md 3.2): every
// page key and its address, both ways; the subject prefix; split before decoding; old and unknown addresses.
// node --test tests/
const test = require('node:test'),
  assert = require('node:assert');
const C = require('../core.js');
const FISH = C.SUBJECTS.find(s => s.hash),
  CORAL = C.SUBJECTS.find(s => !s.hash);

// [page key, address] for the corals: the study's table 3.2.
const PAIRS = [
  ['', ''],
  ['basics', 'learn/basics'],
  ['basics|polyp', 'learn/basics/polyp'],
  ['basics|walls|top', 'learn/basics/walls/top'],
  ['basics|Septa', 'learn/basics/Septa'],
  ['basics|words', 'learn/basics/words'],
  ['basics|walls|top|edit', 'learn/basics/walls/top?edit=1'],
  ['genera', 'learn/genera'],
  ['g-Acropora', 'learn/genus/Acropora'],
  ['cmp', 'learn/look-alikes'],
  ['cmp|Pocillopora|Stylophora', 'learn/look-alikes/Pocillopora/Stylophora'],
  ['cmp-Pocillopora|Stylophora', 'learn/compare/Pocillopora/Stylophora'],
  ['quiz', 'practice/quiz'],
  ['quiz-custom', 'practice/custom'],
  ['quiz-custom|play', 'practice/custom/play'],
  ['quiz-duel', 'practice/duels'],
  ['quiz-duel|Favia|Dipsastraea', 'practice/duels/Favia/Dipsastraea'],
  ['pairs', 'practice/memory'],
  ['idkey', 'identify/key'],
  ['idkey|form=B;box=B1;not=wall.plo,sep.x', 'identify/key?form=B&box=B1&not=wall.plo,sep.x'],
  ['idkey|q=big%20polyps', 'identify/key?q=big%20polyps'],
  ['progress', 'progress'],
  ['board', 'leaderboard'],
  ['ach', 'leaderboard/achievements'],
  ['about', 'about'],
  // Delete my account (#603), reached from About, and its state once deleted.
  ['delete-account', 'about/delete-account'],
  ['delete-account|done', 'about/delete-account/done'],
  ['lab', 'tools'],
  ['lab-anatomy', 'tools/anatomy'],
  ['lab-anatomy|arr|plo', 'tools/anatomy/arr/plo'],
  ['lab-zoom|Acropora', 'tools/zoom/Acropora'],
  ['lab-cards|toast', 'tools/cards/toast']
];

test('every page key has its address in the words on screen, and back', () => {
  for (const [k, h] of PAIRS) {
    assert.strictEqual(C.routeOut(k), h, `out ${k}`);
    const r = C.routeIn('#' + h);
    assert.strictEqual(r.key, k, `in ${h}`);
    assert.strictEqual(r.S, CORAL, h);
    assert.strictEqual(r.bare, true, h);
  }
  assert.strictEqual(C.routeOut('home'), '');
});

test('a subject other than the corals: its prefix on the pages that follow the subject, its words for its units', () => {
  assert.strictEqual(C.routeOut('genera', FISH), 'fish/learn/' + FISH.many);
  assert.strictEqual(C.routeOut('quiz', FISH), 'fish/practice/quiz');
  assert.strictEqual(C.routeOut('progress', FISH), 'fish/progress');
  assert.strictEqual(C.routeOut('fishkey', FISH), 'fish/identify/key');
  // Not the subject's: the leaderboard, the Tools, About and Home carry no prefix.
  for (const k of ['board', 'ach', 'lab', 'lab-anatomy', 'about', '']) assert.strictEqual(C.routeOut(k, FISH), C.routeOut(k));
  let r = C.routeIn('#fish/learn/' + FISH.many);
  assert.deepStrictEqual([r.S, r.bare, r.key], [FISH, false, 'genera']);
  r = C.routeIn('#fish/identify/key', S => (S === FISH ? 'fishkey' : 'idkey'));
  assert.strictEqual(r.key, 'fishkey');
  assert.strictEqual(C.routeIn('#identify/key', S => (S === FISH ? 'fishkey' : 'idkey')).key, 'idkey');
  // The corals' words are not the fish's, and a prefix on a page that does not follow the subject means nothing.
  assert.strictEqual(C.routeIn('#fish/learn/genera').key, null);
  assert.strictEqual(C.routeIn('#learn/' + FISH.many).key, null);
  assert.strictEqual(C.routeIn('#fish/leaderboard').key, null);
  assert.strictEqual(C.routeIn('#fish/tools').key, null);
});

test('split before decoding: a separator inside a thing stays in it; a bad escape does not throw', () => {
  assert.strictEqual(C.routeOut('lab-zoom|A/B?c'), 'tools/zoom/A%2FB%3Fc');
  assert.strictEqual(C.routeIn('#tools/zoom/A%2FB%3Fc').key, 'lab-zoom|A/B?c');
  assert.strictEqual(C.routeIn('#learn/genus/%E0').key, 'g-%E0');
  // The Key keeps its own encoding of its free text: the filter is not decoded on the way in.
  assert.strictEqual(C.routeIn('#identify/key?q=a%26b').key, 'idkey|q=a%26b');
  // A '|' (the page keys' separator) or an empty segment is no address.
  assert.strictEqual(C.routeIn('#learn/genus/A|B').key, null);
  assert.strictEqual(C.routeIn('#learn//genera').key, null);
  assert.strictEqual(C.routeIn('#learn/genera/').key, 'genera');
});

test('old and unknown addresses: no key (rule W3, Q53-Q56); the section page when the first segment is a section, else Home', () => {
  const OLD = [
    'g-Acropora',
    'genera',
    'cmp',
    'cmp-A|B',
    'quiz',
    'quiz-duel|A|B',
    'idkey|form=B',
    'key',
    'k-B',
    'l-B1',
    'tips',
    'credits',
    'board',
    'ach',
    'lab',
    'lab-anatomy',
    'pairs',
    'basics',
    'home',
    'fishkey'
  ];
  for (const h of OLD) {
    const r = C.routeIn('#' + h);
    assert.strictEqual(r.key, null, h);
    assert.strictEqual(r.fall, '', h);
  }
  // (A Tools address names any tool: the app's Tools page knows them, proto/lab.js viewLab.)
  const F = {learn: 'genera', practice: 'quiz', identify: 'idkey', leaderboard: 'board', progress: 'progress', about: 'about'};
  for (const [s, k] of Object.entries(F)) {
    assert.strictEqual(C.routeIn('#' + s + '/nothing/here').fall, k, s);
    if (!['progress', 'about', 'tools'].includes(s)) assert.strictEqual(C.routeIn('#' + s).fall, k, s);
  }
  assert.strictEqual(C.routeIn('#tools').key, 'lab');
  assert.strictEqual(C.routeIn('#learn/genus').fall, 'genera');
  assert.strictEqual(C.routeIn('#fish/practice/nothing').fall, 'quiz');
  assert.strictEqual(C.routeIn('#fish/practice/nothing').S, FISH);
  // routeOut names no page for a key it does not know.
  for (const k of ['key', 'k-B', 'tips', 'credits', 'quiz-board', 'cmp|A', 'quiz-custom|x', 'idkey|a|b'])
    assert.strictEqual(C.routeOut(k), null, k);
});

test('the data under the old addresses and page names moves once (routeRename, pageRename, migrateRoutes)', () => {
  assert.strictEqual(C.routeRename('g-Acropora'), 'learn/genus/Acropora');
  assert.strictEqual(C.routeRename('cmp-A|B'), 'learn/compare/A/B');
  assert.strictEqual(C.routeRename('idkey|form=B;box=B1'), 'identify/key?form=B&box=B1');
  assert.strictEqual(C.routeRename('quiz-board'), 'progress');
  assert.strictEqual(C.routeRename('home'), 'home');
  assert.strictEqual(C.routeRename('learn/genus/A'), 'learn/genus/A', 'idempotent');
  const N = {
    genus: 'learn.genus',
    compare: 'learn.compare',
    lookalikes: 'learn.look-alikes',
    quiz: 'practice.quiz',
    'quiz-duel': 'practice.duels'
  };
  Object.assign(N, {
    'fish.quiz': 'fish.practice.quiz',
    'lab-anatomy': 'tools.anatomy',
    board: 'leaderboard',
    ach: 'leaderboard.achievements',
    pairs: 'practice.memory'
  });
  Object.assign(N, {idkey: 'identify.key', home: 'home', 'learn.genus': 'learn.genus', other: 'other'});
  for (const [a, b] of Object.entries(N)) assert.strictEqual(C.pageRename(a), b, a);
  const mem = {};
  const s = {getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => (mem[k] = String(v)), removeItem: k => delete mem[k]};
  mem['reefid-sync-size'] = JSON.stringify({genera: 's', genus: 'l', pair: 'm', tips: 's', 'learn.genus': 'm', idkey: 's'});
  mem['reefid-evq'] = JSON.stringify([
    {k: 'err', pg: 'g-Acropora'},
    {k: 'pages', pg: 'quiz', r: {quiz: [2, 10], 'practice.quiz': [1, 5], genus: [1, 3]}}
  ]);
  mem['reefid-photo-flags'] = JSON.stringify([
    {f: 'x', where: 'quiz · level 2'},
    {f: 'y', where: 'home'}
  ]);
  assert.deepStrictEqual(C.migrateRoutes(s).sort(), ['reefid-evq', 'reefid-photo-flags', 'reefid-sync-size']);
  assert.deepStrictEqual(JSON.parse(mem['reefid-sync-size']), {
    'learn.genus': 'm',
    'learn.genera': 's',
    'learn.compare': 'm',
    'identify.key': 's'
  });
  assert.deepStrictEqual(JSON.parse(mem['reefid-evq']), [
    {k: 'err', pg: 'learn/genus/Acropora'},
    {k: 'pages', pg: 'practice/quiz', r: {'practice.quiz': [3, 15], 'learn.genus': [1, 3]}}
  ]);
  assert.deepStrictEqual(
    JSON.parse(mem['reefid-photo-flags']).map(x => x.where),
    ['practice/quiz · level 2', 'home']
  );
  assert.deepStrictEqual(C.migrateRoutes(s), [], 'idempotent');
});

test('page names: the address without its things and filters, the subject prefix kept', () => {
  const N = C.pageName;
  const W = {
    '': 'home',
    home: 'home',
    'g-Acropora': 'learn.genus',
    'cmp|A|B': 'learn.look-alikes',
    'cmp-A|B': 'learn.compare',
    genera: 'learn.genera'
  };
  Object.assign(W, {
    'quiz-custom|play': 'practice.custom',
    'quiz-duel|A|B': 'practice.duels',
    'idkey|form=b;box=b1': 'identify.key',
    fishkey: 'identify.key'
  });
  Object.assign(W, {
    'lab-anatomy|arr|x': 'tools.anatomy',
    lab: 'tools',
    ach: 'leaderboard.achievements',
    progress: 'progress',
    'basics|walls|top|edit': 'learn.basics'
  });
  Object.assign(W, {'<script>': 'other', __proto__x: 'other', 'quiz-board': 'other'});
  for (const [k, n] of Object.entries(W)) assert.strictEqual(N(k), n, k);
  assert.strictEqual(N('genera', 'fish.'), 'fish.learn.genera');
  assert.strictEqual(N('quiz', 'fish.'), 'fish.practice.quiz');
  assert.strictEqual(C.pageFrom('quiz-duel|A|B'), 'quiz');
  assert.strictEqual(C.pageFrom('g-A'), 'learn');
  assert.strictEqual(C.pageFrom('ach'), 'progress');
  assert.strictEqual(C.pageFrom('lab'), 'other');
});

// As tests/idkey.test.js does for the tool's old name: no address is typed in the app's code any more; every link and every
// address written goes through core.js routeOut (app.js hr), so an old address cannot come back by a typed literal.
test('no address typed in the app: links and addresses written go through routeOut (app.js hr)', () => {
  const fs = require('fs'),
    path = require('path'),
    root = path.join(__dirname, '..'),
    files = [
      ...fs.readdirSync(root).filter(f => /\.js$/.test(f) && !/^admin|^sw\.js$|^core\.js$|^analysis\.js$|^autosort\.js$/.test(f)),
      ...fs
        .readdirSync(path.join(root, 'proto'))
        .filter(f => f.endsWith('.js'))
        .map(f => 'proto/' + f)
    ];
  const bad = [];
  for (const f of files) {
    fs.readFileSync(path.join(root, f), 'utf8')
      .split('\n')
      .forEach((l, i) => {
        if (/^\s*\/\//.test(l)) return;
        // href="#…" for an in-page anchor only (the Key's jump to its shortlist); '#' + …, location.hash = '…' and
        // location.replace('#…') with a typed page.
        const hits = [...l.matchAll(/href="#([^"$]*)/g)].map(m => m[1]).filter(x => x !== 'ikmain');
        if (
          hits.length ||
          /location\.(hash\s*=|replace\()\s*['`]#?[a-z]/.test(l) ||
          /['`]#(g-|cmp|quiz|genera|basics|idkey|lab|board|ach|progress)(?![a-z])/.test(l)
        )
          bad.push(`${f}:${i + 1}: ${l.trim().slice(0, 120)}`);
      });
  }
  assert.deepStrictEqual(bad, []);
});
