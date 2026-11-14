// The pooled stats built incrementally (sheet vNEXT; Q123 j, Pierre 2026-11-14): the trigger's fold (Code.gs statsFold_)
// serves exactly what the whole log gives (stats_), run after run, at any number of rows a run, through every rebuild.
// Against the in-memory sheet of tests/gas.js only: nothing leaves this process (rule D1).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const {loadCodeGs} = require('./gas.js');

const TOK = 'ghp_write000000000000000000';
const CODE = fs.readFileSync(path.join(__dirname, '..', 'tools', 'sync', 'Code.gs'), 'utf8');
const run = (s, js) => vm.runInContext(js, s.ctx);
const H = 36e5,
  BASE = Date.UTC(2026, 10, 1, 0, 0, 0);
// A small seeded generator, so a failure replays.
const rng = seed => () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;

// The games' photos (pools_'s cache): three coral genera and a fish unit.
const POOL = {
  coral: {
    Acropora: [['acropora-1', 'acropora-2'], ['acropora-3']],
    Porites: [['porites-1', 'porites-2']],
    Favia: [['favia-1'], ['favia-2']]
  },
  fish: {'f:Damselfishes': [['fi123']]}
};
const pools = (s, P = POOL) => Object.entries(P).forEach(([k, v]) => (s.cache['pool2' + k] = JSON.stringify({p: v, u: {}})));
const G = ['Acropora', 'Porites', 'Favia'];
const MODES = ['quiz', 'quiz|k2', 'quiz|k3', 'quiz-duel', 'quiz|t', 'quiz|x', 'quiz|d'];

// Who plays: their chance of a right answer (by day for Dee, who starts at random and then learns: trusted only later).
const WHO = [
  {name: 'Ana', pin: '1111', p: () => 0.85},
  {name: 'Ben', pin: '2222', p: () => 0.8},
  {name: 'Cal', pin: '3333', p: () => 0.3},
  {name: 'Dee', pin: '4444', p: d => (d < 2 ? 0.05 : 0.95)},
  {name: 'Eve', pin: '5555', p: () => 0.8},
  {anon: 'device0001', p: () => 0.8},
  {anon: 'device0002', p: () => 0.9, bot: true}
];
let ID = 0;
// One session of answers at time t (ms): right per the player's chance, some at the same second, a few fish answers, a
// surprise card, photos of another genus (the bot), a photo in no pool, a photo twice.
function session(R, w, t, day) {
  const n = 6 + Math.floor(R() * 10),
    out = [];
  for (let i = 0; i < n; i++) {
    const g = G[Math.floor(R() * 3)],
      ok = R() < w.p(day),
      m = MODES[Math.floor(R() * MODES.length)],
      others = G.filter(x => x !== g),
      wrong = others[Math.floor(R() * 2)];
    const k = m === 'quiz-duel' || m === 'quiz|d' ? 2 : m === 'quiz|t' ? 0 : 2 + Math.floor(R() * 2);
    const ch = k ? [g, ...others].slice(0, k).sort() : [];
    const pick = () => g.toLowerCase() + '-' + (1 + Math.floor(R() * 3));
    let ph = [pick()];
    if (R() < 0.4) ph.push(pick());
    if (w.bot) ph = ['porites-1'];
    else if (R() < 0.05) ph = ['zzz-' + Math.floor(R() * 3)];
    const tt = t + Math.floor(i / (R() < 0.2 ? 1 : 2)) * 30000;
    const a = {
      id: 'x' + ID++,
      t: new Date(tt).toISOString(),
      g,
      a: ok ? g : k ? ch.find(x => x !== g) || wrong : wrong,
      ok: ok ? 1 : 0,
      m,
      ph: ph.join(' '),
      ch: ch.join(' ')
    };
    if (R() < 0.85) a.e = Math.round((0.3 + R() * 0.6) * 100) / 100;
    if (R() < 0.04) Object.assign(a, {s: 'fish', g: 'f:Damselfishes', a: 'f:Damselfishes', ph: 'fi123', ch: ''});
    if (R() < 0.03) a.m = 'wink';
    out.push(a);
  }
  return out;
}
// The posts of a few days, in the order they reach the sheet: mostly as played, some an hour or two late (a slower
// device), one two days late, a few at the same time as another's.
function fixture(seed) {
  const R = rng(seed),
    L = [];
  for (let d = 0; d < 5; d++)
    for (let k = 0; k < 9; k++) {
      // Dee every third session: random on the first two days, trusted from the third.
      const w = k % 3 === 1 ? WHO[3] : WHO[Math.floor(R() * WHO.length)],
        t = BASE + d * 24 * H + k * 1.5 * H + Math.floor(R() * H),
        x = R();
      L.push({w, t, at: t + (x < 0.15 ? 2 * H : x < 0.2 ? 40 * H : 0.2 * H), answers: session(R, w, t, d)});
    }
  return L.sort((a, b) => a.at - b.at);
}
const post = (s, p) =>
  p.w.anon
    ? s.post({anon: p.w.anon, anonAnswers: p.answers})
    : s.post({name: p.w.name, pin: p.w.pin, data: {}, summary: {}, answers: p.answers});

// What ?stats=1 sends, from the whole log (stats_ as before vNEXT), and from the snapshot.
const PUB = ['ok', 'photos', 'conf', 'mem', 'memn', 'gd', 'fmt'];
const pub = o => JSON.parse(JSON.stringify(Object.fromEntries(PUB.map(k => [k, o[k]]))));
const full = s => {
  delete s.cache.stats17;
  run(s, 'ROWS_ = null');
  return pub(s.ctx.stats_(true));
};
const snap = s => {
  delete s.cache[run(s, 'statsCacheKey_()')];
  const o = s.ctx.statsServed_();
  return o && pub(o);
};
const fold = (s, now, o = {}) => s.ctx.statsFold_(Object.assign({now, budget: 1e9}, o));
const same = (s, msg) => {
  const a = snap(s);
  assert.ok(a, msg + ': a snapshot is served');
  assert.deepStrictEqual(a, full(s), msg);
};
const load = () => {
  const s = loadCodeGs({stats: true});
  pools(s);
  return s;
};

test('the fold serves what the whole log gives, after every run, at any number of rows a run', () => {
  const posts = fixture(7),
    causes = new Set();
  for (const rows of [6, 90, 100000]) {
    const s = load(),
      R = rng(rows),
      seen = new Set();
    let now = BASE,
      settled = 0,
      pending = 0,
      checks = 0;
    // One run leaves a player out of the statistics from the start (sxSet_).
    if (rows === 90) assert.ok(s.post({statsExclude: s.ctx.aid_('Eve'), on: true, token: TOK}).ok);
    posts.forEach((p, i) => {
      post(s, p);
      now = Math.max(now, p.at);
      if (R() < 0.35 || i === posts.length - 1) {
        // A run at most a few windows long, so a build takes several runs.
        let r = fold(s, now + H, {rows, max: rows * 3});
        seen.add(r.why).add(r.built);
        while (!r.caught) {
          r = fold(s, now + H, {rows, max: rows * 3});
          seen.add(r.why).add(r.built);
        }
        settled += r.settled;
        pending = Math.max(pending, r.pending);
        same(s, rows + ' rows a run, after post ' + i);
        checks++;
      }
    });
    assert.ok(settled > 0 && pending > 0, 'both parts used: ' + settled + ' settled, ' + pending + ' pending');
    seen.forEach(x => causes.add(x));
    assert.ok(checks > 10);
    const F = full(s);
    assert.ok(Object.keys(F.fmt).length >= 3 && Object.keys(F.conf).length >= 3 && F.memn[3] > 0, 'every part of the stats in play');
  }
  // The fixture meets the rebuilds that keep the fold exact (a late answer can take a trust change with it).
  assert.ok(causes.has('missing') && causes.has('late answer') && causes.has('trust changed'), [...causes].join(', '));
});

test('a run is bounded: it stops after its rows and the next run goes on; nothing is served before the end', () => {
  const s = load();
  fixture(3).forEach(p => post(s, p));
  const n = s.sheets.Answers.getLastRow() - 1;
  let r = fold(s, BASE + 9 * 24 * H, {rows: 50, max: 100});
  assert.strictEqual(r.read, 100);
  assert.strictEqual(r.caught, false);
  assert.strictEqual(snap(s), null, 'nothing served while the first build goes on');
  assert.strictEqual(s.get({stats: 1}).photos['acropora-1'][3] > 0, true, '?stats=1 makes the whole log meanwhile');
  let runs = 1;
  while (!r.caught) {
    r = fold(s, BASE + 9 * 24 * H, {rows: 50, max: 100});
    runs++;
    assert.ok(r.read <= 100);
  }
  assert.strictEqual(runs, Math.ceil(n / 100));
  assert.strictEqual(r.why, '');
  same(s, 'built over ' + runs + ' runs');
  // The cursor is in the snapshot and in the Script Property, and the time budget holds a run too.
  assert.strictEqual(JSON.parse(s.props.STATS_FOLD).c, n);
  run(s, 'statsDirty_()');
  r = fold(s, BASE + 9 * 24 * H, {rows: 10, budget: -1});
  assert.strictEqual(r.read, 10, 'one step even past the budget, then stop');
  // Every chunk fits a cell, and the doGet reply is the served one.
  const tab = s.sheets.Stats;
  tab.rows.forEach(row => row.forEach(c => assert.ok(String(c).length <= 45000)));
});

test('every rebuild cause starts the fold again and it serves the whole log again', () => {
  const s = load(),
    posts = fixture(11),
    now = Math.max(...posts.map(p => p.at)) + 20 * H, // the last day's answers still pending
    id = n => s.ctx.aid_(n);
  posts.forEach(p => post(s, p));
  const again = (why, act) => {
    act();
    const r = fold(s, now);
    assert.strictEqual(r.why, why, why);
    assert.ok(r.caught, JSON.stringify(r));
    same(s, why);
    assert.strictEqual(fold(s, now).why, '', why + ': then up to date');
  };
  assert.strictEqual(fold(s, now).why, 'missing');
  same(s, 'first build');
  // Nothing new: nothing read, the same served.
  const r0 = fold(s, now);
  assert.deepStrictEqual([r0.why, r0.read, r0.settled], ['', 0, 0]);
  // New answers: read and folded without a rebuild.
  post(s, {w: WHO[0], answers: session(rng(5), WHO[0], now - H, 4)});
  const r1 = fold(s, now);
  assert.strictEqual(r1.why, '');
  assert.ok(r1.read > 0);
  same(s, 'new rows');
  // Who is left out of the statistics changed (the admin's button: rosterChanged_ blanks the fold and the reply served).
  again('missing', () => {
    assert.ok(s.post({statsExclude: id('Eve'), on: true, token: TOK}).ok);
    assert.strictEqual(snap(s), null, 'the snapshot served is dropped at once');
  });
  // The fold also checks the list itself, whatever changed it.
  again('left out changed', () => s.sheets['Stats excluded'].rows.splice(1, 1));
  // A device's anonymous answers move to the name it signs in with: the snapshot served stays meanwhile.
  again('log rewritten', () => {
    s.post({name: 'Ana', pin: '1111', data: {}, summary: {}, answers: [], anon: 'device0001'});
    assert.ok(snap(s));
  });
  again('missing', () => s.post({userDelete: 'Ben', token: TOK}));
  again('account removed', () => (s.props.ROSTER_AT = String(Date.now() + 1000)));
  again('pools changed', () => pools(s, {...POOL, coral: {...POOL.coral, Porites: [['porites-1'], ['acropora-3']]}}));
  again('new version', () => {
    const tab = s.sheets.Stats,
      st = JSON.parse(tab.rows[2].slice(6).join(''));
    st.v--;
    const j = JSON.stringify(st);
    tab.rows[2] = tab.rows[2].slice(0, 6).concat([j]);
  });
  again('missing', () => (s.sheets.Stats.rows[2][7] = 'not json'));
  again('cursor', () => delete s.props.STATS_FOLD);
  again('rows moved', () => s.sheets.Answers.rows.splice(5, 1));
  again('missing', () => s.post({userDelete: 'Cal', answers: true, token: TOK}));
  // A mode no app sends (quiz|k0: an infinite guess rate) is read back as written: no rebuild at every run.
  const k0 = {anon: 'device0009', p: () => 1};
  post(s, {
    w: k0,
    answers: [{id: 'k0', t: new Date(now - H).toISOString(), g: 'Acropora', a: 'Acropora', ok: 1, m: 'quiz|k0', ph: 'acropora-1', ch: ''}]
  });
  post(s, {w: k0, answers: session(rng(4), k0, now - H, 4)});
  assert.strictEqual(fold(s, now).why, '');
  same(s, 'an infinite guess rate, pending');
  const r2 = fold(s, now + 2 * 24 * H);
  assert.ok(r2.settled > 0 && r2.why === '', JSON.stringify(r2));
  // Its settled counters read back as written: more answers do not flip its trust.
  post(s, {w: k0, answers: session(rng(6), k0, now + 2 * 24 * H - H, 4)});
  assert.strictEqual(fold(s, now + 2 * 24 * H).why, '');
  same(s, 'an infinite guess rate, settled');
  // An answer logged older than what is settled: a device two days late.
  again('late answer', () => post(s, {w: WHO[0], answers: session(rng(9), WHO[0], now - 3 * 24 * H, 4)}));
});

// Rule D7: the fold holds per-player data by admin id; any delete, merge or archive blanks it at once.
test('a deleted account leaves nothing in the snapshot, at once and after the rebuild', () => {
  for (const all of [false, true]) {
    const s = load(),
      now = BASE + 9 * 24 * H;
    fixture(5).forEach(p => post(s, p));
    fold(s, now);
    const tabText = () => JSON.stringify(s.sheets.Stats.rows),
      aid = s.ctx.aid_('Dee');
    assert.ok(tabText().includes(aid), 'the fold keeps a player by admin id');
    assert.ok(!/Dee|Ana|device0001/.test(tabText()), 'never a name or a device');
    s.post({userDelete: 'Dee', answers: all, token: TOK});
    assert.ok(!tabText().includes(aid), 'blanked by the delete itself');
    assert.strictEqual(snap(s), null, 'nothing served: ?stats=1 makes the whole log until the fold is rebuilt');
    fold(s, now);
    assert.ok(!tabText().includes(aid), 'rebuilt without them');
    same(s, all ? 'everything deleted' : 'answers kept as ~deleted');
  }
});

test('the 15-minute trigger folds and logs the build; ?stats=1 then serves the snapshot', () => {
  const s = loadCodeGs({
    stats: true,
    fetch: url => (/\/tools\/sync\/Code\.gs/.test(url) ? {getResponseCode: () => 200, getContentText: () => CODE} : null)
  });
  pools(s);
  fixture(13).forEach(p => post(s, p));
  run(s, 'STATS.ROWS = 40; STATS.RUN_ROWS = 120');
  let k = 0;
  while (!s.sheets['Deploy log'] || !s.sheets['Deploy log'].rows.some(r => /pooled stats: snapshot built/.test(r[1]))) {
    s.ctx.autoUpdate();
    assert.ok(++k < 50);
  }
  assert.ok(k > 1, 'several runs at 120 rows a run');
  const reply = s.get({stats: 1});
  assert.ok(s.cache[run(s, 'statsCacheKey_()')], 'served from the snapshot, cached');
  assert.deepStrictEqual(pub(reply), full(s));
  // The rest of the trigger's run still happens: a run already long leaves the fold to the next one.
  run(s, 'STATS.UNTIL = -1');
  const before = JSON.stringify(s.sheets.Stats.rows);
  s.post({name: 'Ana', pin: '1111', data: {}, summary: {}, answers: session(rng(2), WHO[0], BASE + 6 * 24 * H, 6)});
  s.ctx.autoUpdate();
  assert.strictEqual(JSON.stringify(s.sheets.Stats.rows), before);
});

test('an old snapshot, another version or the switch off: ?stats=1 makes the whole log as before', () => {
  const s = load();
  fixture(17).forEach(p => post(s, p));
  fold(s, BASE + 9 * 24 * H);
  assert.ok(snap(s));
  const tab = s.sheets.Stats;
  tab.rows[1][2] = new Date(Date.now() - 2 * H);
  assert.strictEqual(snap(s), null, 'older than STATS.AGE');
  tab.rows[1][2] = new Date();
  tab.rows[1][1] = 1;
  assert.strictEqual(snap(s), null, 'made by another version');
  tab.rows[1][1] = run(s, 'VERSION');
  run(s, 'STATS.ON = false');
  assert.strictEqual(snap(s), null);
  assert.deepStrictEqual(pub(s.get({stats: 1})), full(s));
});

test('a tab as narrow as a new one gets the columns a longer snapshot needs', () => {
  const s = load();
  fixture(19).forEach(p => post(s, p));
  const tab = s.ctx.SpreadsheetApp.getActiveSpreadsheet().insertSheet('Stats');
  tab.maxCols = 6; // the parts' first cells only: every chunk needs a column added
  const r = fold(s, BASE + 9 * 24 * H);
  assert.ok(r.caught, JSON.stringify(r));
  assert.ok(tab.maxCols > 6);
  same(s, 'after the grid grew');
});

// Codex review #882: a delete between the fold's last check and its writes must not be undone by them. The writes are
// made under the script lock, which a delete holds: here the delete takes place just before the fold gets the lock.
test('a delete just before the fold writes: nothing written, the account stays gone', () => {
  const s = load(),
    now = BASE + 9 * 24 * H;
  fixture(23).forEach(p => post(s, p));
  fold(s, now);
  post(s, {w: WHO[3], answers: session(rng(3), WHO[3], now - H, 4)});
  const aid = s.ctx.aid_('Dee'),
    real = s.ctx.LockService.getScriptLock;
  let once = true;
  s.ctx.LockService.getScriptLock = () => {
    const l = real();
    return Object.assign({}, l, {
      tryLock: ms => {
        if (once && new Error().stack.includes('statsFold_')) {
          once = false;
          assert.ok(s.post({userDelete: 'Dee', token: TOK}).ok);
        }
        return l.tryLock(ms);
      }
    });
  };
  const r = fold(s, now);
  assert.ok(!once, 'the delete ran inside the fold');
  assert.strictEqual(r.stale, true);
  assert.ok(!JSON.stringify(s.sheets.Stats.rows).includes(aid), 'nothing of the deleted account written back');
  s.ctx.LockService.getScriptLock = real;
  fold(s, now);
  assert.ok(!JSON.stringify(s.sheets.Stats.rows).includes(aid));
  same(s, 'rebuilt after the delete');
  // The lock held by a request: the run writes nothing and the next one goes on.
  s.lock.busy = true;
  assert.strictEqual(fold(s, now).stale, true);
  s.lock.busy = false;
  assert.ok(!fold(s, now).stale);
});
