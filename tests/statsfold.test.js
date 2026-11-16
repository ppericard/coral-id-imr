require('./slot.js').testGuard();
// The pooled stats built incrementally (sheet v134; Q123 j, Pierre 2026-11-14): the trigger's fold (Code.gs statsFold_)
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

// The games' photos (pools_'s cache): three coral genera, three fish families whose photos are their species' (the fish
// pool groups them by family, a species going up to its family: pools_'s parent units).
const POOL = {
  coral: {
    Acropora: [['acropora-1', 'acropora-2'], ['acropora-3']],
    Porites: [['porites-1', 'porites-2']],
    Favia: [['favia-1'], ['favia-2']]
  },
  fish: {
    'f:Damselfishes': [['fi1'], ['fi2'], ['fi3']],
    'f:Butterflyfishes': [['fi4'], ['fi5']],
    'f:Wrasses': [['fi6'], ['fi7']]
  }
};
const UP = {s091: 'f:Damselfishes', s088: 'f:Damselfishes', s244: 'f:Wrasses'};
const pools = (s, P = POOL) =>
  Object.entries(P).forEach(([k, v]) => (s.cache['pool2' + k] = JSON.stringify({p: v, u: k === 'fish' ? UP : {}})));
const G = ['Acropora', 'Porites', 'Favia'];
// The fish: questions at the family rank, and some at the species rank; each unit's photos.
const FAM = ['f:Damselfishes', 'f:Butterflyfishes', 'f:Wrasses'],
  SPE = ['s091', 's088', 's244'];
const FPH = {
  'f:Damselfishes': ['fi1', 'fi2', 'fi3'],
  'f:Butterflyfishes': ['fi4', 'fi5'],
  'f:Wrasses': ['fi6', 'fi7'],
  s091: ['fi1'],
  s088: ['fi2', 'fi3'],
  s244: ['fi6']
};
const SUBJ = ['coral', 'fish'];
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
// One session of answers at time t (ms), of the corals or the fish (fish: at the family rank, some at the species
// rank): right per the player's chance, some at the same second, a surprise card, photos of another unit (the bot), a
// photo in no pool, a photo twice.
function session(R, w, t, day, subj) {
  const n = 6 + Math.floor(R() * 10),
    fish = (subj || (R() < 0.4 ? 'fish' : 'coral')) === 'fish',
    out = [];
  for (let i = 0; i < n; i++) {
    const U = !fish ? G : R() < 0.3 ? SPE : FAM,
      g = U[Math.floor(R() * 3)],
      ok = R() < w.p(day),
      m = MODES[Math.floor(R() * MODES.length)],
      others = U.filter(x => x !== g),
      wrong = others[Math.floor(R() * 2)];
    const k = m === 'quiz-duel' || m === 'quiz|d' ? 2 : m === 'quiz|t' ? 0 : 2 + Math.floor(R() * 2);
    const ch = k ? [g, ...others].slice(0, k).sort() : [];
    const pick = () => (fish ? FPH[g][Math.floor(R() * FPH[g].length)] : g.toLowerCase() + '-' + (1 + Math.floor(R() * 3)));
    let ph = [pick()];
    if (R() < 0.4) ph.push(pick());
    if (w.bot) ph = [fish ? 'fi4' : 'porites-1'];
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
    if (fish) Object.assign(a, {s: 'fish', rk: U === SPE ? 'species' : 'family'});
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
    for (let k = 0; k < 14; k++) {
      // Dee every third session: random on the first two days, trusted from the third.
      const w = k % 3 === 1 ? WHO[3] : WHO[Math.floor(R() * WHO.length)],
        t = BASE + d * 24 * H + k * 1.5 * H + Math.floor(R() * H),
        x = R();
      L.push({w, t, at: t + (x < 0.15 ? 2 * H : x < 0.23 ? 40 * H : 0.2 * H), answers: session(R, w, t, d)});
    }
  return L.sort((a, b) => a.at - b.at);
}
const post = (s, p) =>
  p.w.anon
    ? s.post({anon: p.w.anon, anonAnswers: p.answers})
    : s.post({name: p.w.name, pin: p.w.pin, data: {}, summary: {}, answers: p.answers});

// What ?stats=1 sends, from the whole log (stats_ as before v134), and from the snapshot.
const PUB = ['ok', 'photos', 'conf', 'mem', 'memn', 'gd', 'fmt'];
const pub = o => JSON.parse(JSON.stringify(Object.fromEntries(PUB.map(k => [k, o[k]]))));
// sid: the subject (Code.gs statsSid_: the corals when none).
const full = (s, sid) => {
  delete s.cache[run(s, `statsKey17_(${JSON.stringify(sid)})`)];
  run(s, 'ROWS_ = null');
  return pub(s.ctx.stats_(true, sid));
};
const snap = (s, sid) => {
  delete s.cache[run(s, `statsCacheKey_(${JSON.stringify(sid)})`)];
  const o = s.ctx.statsServed_(sid);
  return o && pub(o);
};
const fold = (s, now, o = {}) => s.ctx.statsFold_(Object.assign({now, budget: 1e9}, o));
const same = (s, msg, sid) => {
  const a = snap(s, sid);
  assert.ok(a, msg + ': a snapshot is served');
  assert.deepStrictEqual(a, full(s, sid), msg);
};
// Both subjects' folds run, then both compared.
const foldAll = (s, now, o = {}) => SUBJ.map(sid => fold(s, now, Object.assign({sid}, o)));
const sameAll = (s, msg) => SUBJ.forEach(sid => same(s, sid + ': ' + msg, sid));
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
      if (R() < 0.35 || i === posts.length - 1)
        SUBJ.forEach(sid => {
          // A run at most a few windows long, so a build takes several runs.
          let r = fold(s, now + H, {sid, rows, max: rows * 3});
          seen.add(sid + ' ' + r.why).add(sid + ' ' + r.built);
          while (!r.caught) {
            r = fold(s, now + H, {sid, rows, max: rows * 3});
            seen.add(sid + ' ' + r.why).add(sid + ' ' + r.built);
          }
          assert.strictEqual(r.sid, sid);
          settled += r.settled;
          pending = Math.max(pending, r.pending);
          same(s, sid + ', ' + rows + ' rows a run, after post ' + i, sid);
          checks++;
        });
    });
    assert.ok(settled > 0 && pending > 0, 'both parts used: ' + settled + ' settled, ' + pending + ' pending');
    seen.forEach(x => causes.add(x));
    assert.ok(checks > 20);
    for (const sid of SUBJ) {
      const F = full(s, sid);
      assert.ok(
        Object.keys(F.fmt).length >= 3 && Object.keys(F.conf).length >= 3 && F.memn[3] > 0,
        sid + ': every part of the stats in play'
      );
    }
    // The fish at both ranks, the bot's photos of another family flagged.
    const FF = s.ctx.stats_(true, 'fish');
    assert.ok(FF.skip.photos > 0 && SPE.some(u => u in FF.gd) && FAM.some(u => u in FF.gd), JSON.stringify([FF.skip, Object.keys(FF.gd)]));
    // Each subject rates its own photos only.
    assert.ok(Object.keys(full(s, 'fish').photos).every(f => /^(fi|zzz)/.test(f)));
    assert.ok(!Object.keys(full(s, 'coral').photos).some(f => /^fi/.test(f)));
  }
  // The fixture meets the rebuilds that keep the fold exact (a late answer can take a trust change with it).
  for (const sid of SUBJ)
    assert.ok(
      ['missing', 'late answer', 'trust changed'].every(w => causes.has(sid + ' ' + w)),
      [...causes].join(', ')
    );
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
  // why: each subject's reason, the same for both when a string.
  const again = (why, act) => {
    act();
    foldAll(s, now).forEach(r => {
      const w = typeof why === 'string' ? why : why[r.sid] || '';
      assert.strictEqual(r.why, w, r.sid + ': ' + w);
      assert.ok(r.caught, JSON.stringify(r));
      same(s, r.sid + ': ' + w, r.sid);
    });
    foldAll(s, now).forEach(r => assert.strictEqual(r.why, '', r.sid + ': ' + JSON.stringify(why) + ', then up to date'));
  };
  assert.deepStrictEqual(
    foldAll(s, now).map(r => r.why),
    ['missing', 'missing']
  );
  sameAll(s, 'first build');
  // Nothing new: nothing read, the same served.
  const r0 = fold(s, now);
  assert.deepStrictEqual([r0.why, r0.read, r0.settled], ['', 0, 0]);
  // New answers: read and folded without a rebuild.
  for (const sid of SUBJ) {
    post(s, {w: WHO[0], answers: session(rng(5), WHO[0], now - H, 4, sid)});
    const r1 = fold(s, now, {sid});
    assert.strictEqual(r1.why, '');
    assert.ok(r1.read > 0);
    same(s, sid + ': new rows', sid);
  }
  assert.ok(Object.keys(snap(s, 'fish').photos).length > 0 && Object.keys(snap(s, 'fish').conf).length > 0, 'the fish rated');
  // Who is left out of the statistics changed (the admin's button: rosterChanged_ blanks the fold and the reply served).
  again('missing', () => {
    assert.ok(s.post({statsExclude: id('Eve'), on: true, token: TOK}).ok);
    SUBJ.forEach(sid => assert.strictEqual(snap(s, sid), null, sid + ': the snapshot served is dropped at once'));
  });
  // The fold also checks the list itself, whatever changed it.
  again('left out changed', () => s.sheets['Stats excluded'].rows.splice(1, 1));
  // A device's anonymous answers move to the name it signs in with: the snapshot served stays meanwhile.
  again('log rewritten', () => {
    s.post({name: 'Ana', pin: '1111', data: {}, summary: {}, answers: [], anon: 'device0001'});
    SUBJ.forEach(sid => assert.ok(snap(s, sid)));
  });
  again('missing', () => s.post({userDelete: 'Ben', token: TOK}));
  again('account removed', () => (s.props.ROSTER_AT = String(Date.now() + 1000)));
  // A pool change rebuilds the subject whose folded photos it touches, only.
  again({coral: 'pools changed'}, () => pools(s, {...POOL, coral: {...POOL.coral, Porites: [['porites-1'], ['acropora-3']]}}));
  again({fish: 'pools changed'}, () =>
    pools(s, {
      coral: {...POOL.coral, Porites: [['porites-1'], ['acropora-3']]},
      fish: {...POOL.fish, 'f:Wrasses': [['fi6'], ['fi7'], ['fi2']]}
    })
  );
  again({coral: 'new version'}, () => {
    const tab = s.sheets.Stats,
      st = JSON.parse(tab.rows[2].slice(6).join(''));
    st.v--;
    const j = JSON.stringify(st);
    tab.rows[2] = tab.rows[2].slice(0, 6).concat([j]);
  });
  again({fish: 'missing'}, () => (s.sheets['Stats Fish'].rows[2][7] = 'not json'));
  again({coral: 'cursor'}, () => delete s.props.STATS_FOLD);
  again({fish: 'cursor'}, () => delete s.props.STATS_FOLD_fish);
  again('rows moved', () => s.sheets.Answers.rows.splice(5, 1));
  again('missing', () => s.post({userDelete: 'Cal', answers: true, token: TOK}));
  // A mode no app sends (quiz|k0: an infinite guess rate) is read back as written: no rebuild at every run.
  const k0 = {anon: 'device0009', p: () => 1};
  post(s, {
    w: k0,
    answers: [{id: 'k0', t: new Date(now - H).toISOString(), g: 'Acropora', a: 'Acropora', ok: 1, m: 'quiz|k0', ph: 'acropora-1', ch: ''}]
  });
  post(s, {w: k0, answers: session(rng(4), k0, now - H, 4, 'coral')});
  assert.strictEqual(fold(s, now).why, '');
  same(s, 'an infinite guess rate, pending');
  const r2 = fold(s, now + 2 * 24 * H);
  assert.ok(r2.settled > 0 && r2.why === '', JSON.stringify(r2));
  // Its settled counters read back as written: more answers do not flip its trust.
  post(s, {w: k0, answers: session(rng(6), k0, now + 2 * 24 * H - H, 4, 'coral')});
  assert.strictEqual(fold(s, now + 2 * 24 * H).why, '');
  same(s, 'an infinite guess rate, settled');
  // An answer logged older than what is settled: a device two days late, for one subject then the other.
  for (const sid of SUBJ)
    again({[sid]: 'late answer'}, () => post(s, {w: WHO[0], answers: session(rng(9), WHO[0], now - 3 * 24 * H, 4, sid)}));
});

// Rule D7: the fold holds per-player data by admin id; any delete, merge or archive blanks it at once.
test('a deleted account leaves nothing in the snapshot, at once and after the rebuild', () => {
  for (const all of [false, true]) {
    const s = load(),
      now = BASE + 9 * 24 * H;
    fixture(5).forEach(p => post(s, p));
    foldAll(s, now);
    const tabs = ['Stats', 'Stats Fish'],
      tabText = t => JSON.stringify(s.sheets[t].rows),
      aid = s.ctx.aid_('Dee');
    tabs.forEach(t => assert.ok(tabText(t).includes(aid), t + ': the fold keeps a player by admin id'));
    tabs.forEach(t => assert.ok(!/Dee|Ana|device0001/.test(tabText(t)), t + ': never a name or a device'));
    s.post({userDelete: 'Dee', answers: all, token: TOK});
    tabs.forEach(t => assert.ok(!tabText(t).includes(aid), t + ': blanked by the delete itself'));
    SUBJ.forEach(sid => assert.strictEqual(snap(s, sid), null, sid + ': nothing served until the fold is rebuilt'));
    foldAll(s, now);
    tabs.forEach(t => assert.ok(!tabText(t).includes(aid), t + ': rebuilt without them'));
    sameAll(s, all ? 'everything deleted' : 'answers kept as ~deleted');
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
  const built = n =>
    s.sheets['Deploy log'] && s.sheets['Deploy log'].rows.some(r => new RegExp('pooled stats \\(' + n + '\\): snapshot built').test(r[1]));
  while (!built('corals') || !built('fish')) {
    s.ctx.autoUpdate();
    assert.ok(++k < 50);
  }
  assert.ok(k > 1, 'several runs at 120 rows a run');
  // ?stats=1 the corals' as before, &s=fish the fish's, each from its snapshot; a subject without photos: the corals'.
  assert.deepStrictEqual(pub(s.get({stats: 1})), full(s));
  assert.ok(s.cache[run(s, 'statsCacheKey_()')], 'served from the snapshot, cached');
  assert.deepStrictEqual(pub(s.get({stats: 1, s: 'fish'})), full(s, 'fish'));
  assert.ok(s.cache[run(s, "statsCacheKey_('fish')")]);
  assert.notDeepStrictEqual(full(s, 'fish'), full(s));
  assert.deepStrictEqual(pub(s.get({stats: 1, s: 'nothing'})), full(s));
  // The rest of the trigger's run still happens: a run already long leaves the fold to the next one.
  run(s, 'STATS.UNTIL = -1');
  const before = JSON.stringify([s.sheets.Stats.rows, s.sheets['Stats Fish'].rows]);
  s.post({name: 'Ana', pin: '1111', data: {}, summary: {}, answers: session(rng(2), WHO[0], BASE + 6 * 24 * H, 6)});
  s.ctx.autoUpdate();
  assert.strictEqual(JSON.stringify([s.sheets.Stats.rows, s.sheets['Stats Fish'].rows]), before);
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
  // The fish's: none folded yet, the whole log of the fish.
  assert.strictEqual(snap(s, 'fish'), null);
  assert.deepStrictEqual(pub(s.get({stats: 1, s: 'fish'})), full(s, 'fish'));
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

// v145 (the step #882 and #940 left next; Pierre, 2026-11-15, Q357): the other readers of stats_ read the snapshot too,
// with exactly the numbers of the whole log, and make stats_ only when the snapshot is not served.
// What readStats sends (the admin's reply, with ras, skip and chk), as it goes on the wire.
const wire = o => JSON.parse(JSON.stringify(o));
const fullAdmin = (s, sid) => {
  delete s.cache[run(s, `statsKey17_(${JSON.stringify(sid)})`)];
  run(s, 'ROWS_ = null');
  return wire(s.ctx.stats_(true, sid));
};
// The reply less v, the script version every reply carries (json_).
const readStats = (s, sid) => {
  const {v, ...r} = s.post(Object.assign({readStats: 1, token: TOK}, sid ? {s: sid} : {}));
  assert.strictEqual(v, run(s, 'VERSION'));
  return r;
};
// How many times fn makes the whole log (stats_): none when it reads the snapshot.
const fullReads = (s, fn) => {
  const real = s.ctx.stats_;
  let n = 0;
  s.ctx.stats_ = (...a) => (n++, real(...a));
  try {
    fn();
  } finally {
    s.ctx.stats_ = real;
  }
  return n;
};
// A log with every case the admin's abilities leave out or count apart: a deleted account's answers kept ("~deleted"),
// an archived player, a player left out of the statistics, an infinite guess rate (quiz|k0).
const adminLog = seed => {
  const s = load(),
    posts = fixture(seed),
    now = Math.max(...posts.map(p => p.at)) + 20 * H;
  posts.forEach(p => post(s, p));
  assert.ok(s.post({userDelete: 'Dee', token: TOK}).ok);
  assert.ok(s.post({userArchive: {from: 'Cal', into: 'Cal-old'}, token: TOK}).ok);
  assert.ok(s.post({statsExclude: s.ctx.aid_('Eve'), on: true, token: TOK}).ok);
  const k0 = {anon: 'device0009', p: () => 1};
  post(s, {
    w: k0,
    answers: [{id: 'k0', t: new Date(now - H).toISOString(), g: 'Acropora', a: 'Acropora', ok: 1, m: 'quiz|k0', ph: 'acropora-1', ch: ''}]
  });
  post(s, {w: k0, answers: session(rng(4), k0, now - H, 4, 'coral')});
  return {s, now};
};

test("readStats serves the snapshot: the whole log's reply, abilities included, for each subject", () => {
  const {s, now} = adminLog(29);
  foldAll(s, now);
  const salt = run(s, 'anonSalt_()'),
    dee = run(s, `Object.keys(statsLoad_(SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Stats')).D)`);
  assert.strictEqual(dee.length, 1, 'the deleted account marked in the fold');
  for (const sid of [undefined, ...SUBJ]) {
    let got;
    assert.strictEqual(
      fullReads(s, () => (got = readStats(s, sid))),
      0,
      sid + ': read from the snapshot'
    );
    const want = fullAdmin(s, sid);
    assert.deepStrictEqual(got, want, String(sid));
    assert.ok(Object.keys(want.ras).length >= 4 && want.skip.excluded > 0 && want.chk === 1, JSON.stringify(want.skip));
    // Neither a deleted account's answers nor an archived player get an ability; the archive is in the fold, left out.
    assert.ok(!dee.some(x => x in got.ras));
    assert.ok(!(s.ctx.aid_('Cal-old', salt) in got.ras));
    if (sid !== 'fish') assert.ok(s.sheets.Stats.rows[3].join('').includes(s.ctx.aid_('Cal-old', salt)));
  }
  // The infinite guess rate's ability goes as the whole log sends it (null on the wire).
  assert.ok(Object.values(readStats(s).ras).some(r => r[0] === null));
  // Archived after the fold: nothing served until it is rebuilt, then the same again.
  assert.ok(s.post({userArchive: {from: 'Ana', into: 'Ana-old'}, token: TOK}).ok);
  assert.strictEqual(s.ctx.statsAdmin_(), null);
  assert.deepStrictEqual(readStats(s), fullAdmin(s));
  foldAll(s, now);
  assert.strictEqual(
    fullReads(s, () => readStats(s)),
    0
  );
  assert.deepStrictEqual(readStats(s), fullAdmin(s));
  assert.ok(!(s.ctx.aid_('Ana-old', salt) in readStats(s).ras));
});

test('readStats makes the whole log when the snapshot is missing, stale, of another version or run, or removed', () => {
  const {s, now} = adminLog(31);
  const both = (msg, act, undo) => {
    act();
    assert.strictEqual(s.ctx.statsAdmin_(), null, msg);
    let got;
    assert.strictEqual(
      fullReads(s, () => (got = readStats(s))),
      1,
      msg + ': the whole log'
    );
    assert.deepStrictEqual(got, fullAdmin(s), msg);
    undo();
    assert.ok(s.ctx.statsAdmin_(), msg + ': served again');
  };
  assert.strictEqual(s.ctx.statsAdmin_(), null, 'no snapshot yet');
  assert.deepStrictEqual(readStats(s), fullAdmin(s));
  fold(s, now);
  const tab = s.sheets.Stats;
  assert.ok(s.ctx.statsAdmin_());
  for (const r of [1, 3]) {
    const keep = tab.rows[r].slice(),
      back = () => (tab.rows[r] = keep.slice());
    both('row ' + (r + 1) + ' older than STATS.AGE', () => (tab.rows[r][2] = new Date(Date.now() - 2 * H)), back);
    both('row ' + (r + 1) + ' of another version', () => (tab.rows[r][1] = 1), back);
    both('row ' + (r + 1) + ' of another run', () => (tab.rows[r][5] = 'run 1'), back);
    both('row ' + (r + 1) + ' older than the last removal', () => (tab.rows[r][4] = 0), back);
  }
  const keep4 = tab.rows[3];
  both(
    'no admin part',
    () => (tab.rows[3] = []),
    () => (tab.rows[3] = keep4)
  );
  both(
    'the switch off',
    () => run(s, 'STATS.ON = false'),
    () => run(s, 'STATS.ON = true')
  );
  // A delete blanks the admin part at once (rule D7), then the fold builds it again without the account.
  const aid = s.ctx.aid_('Ana');
  assert.ok(tab.rows[3].join('').includes(aid));
  assert.ok(s.post({userDelete: 'Ana', answers: true, token: TOK}).ok);
  assert.ok(!JSON.stringify(tab.rows).includes(aid), 'blanked by the delete itself');
  assert.strictEqual(s.ctx.statsAdmin_(), null);
  fold(s, now);
  assert.ok(!JSON.stringify(tab.rows).includes(aid), 'rebuilt without them');
  assert.deepStrictEqual(readStats(s), fullAdmin(s));
  assert.strictEqual(
    fullReads(s, () => readStats(s)),
    0
  );
});

test("the replays read the snapshot: each player's record and the admin's list are the whole log's", () => {
  const {s, now} = adminLog(37);
  // The replay's units and the slate (data.json, cached as gen_ and slate_ read them).
  s.cache.gen1 = JSON.stringify({
    Acropora: {look: ['Porites'], fam: 'Acroporidae'},
    Porites: {look: ['Acropora']},
    Favia: {fam: 'Merulinidae'}
  });
  s.cache.slate1 = JSON.stringify(G);
  // Answers the replay rates with the pooled stats: logged with the expectation and the ability (e, th), as the app does.
  const R = rng(41);
  for (const w of [WHO[0], WHO[1], WHO[5]])
    for (let d = 0; d < 3; d++)
      post(s, {w, answers: session(R, w, now - (30 - 6 * d) * H, 4, 'coral').map(a => Object.assign(a, {e: 0.6, th: 0.2 * d}))});
  foldAll(s, now);
  const who = ['ana', 'ben', 'cal-old', '~anon device0001', 'nobody'];
  const recs = () => wire(who.map(w => s.ctx.rplMake_(w, s.ctx.rplMine_(w, 0), 0, null)));
  const list = () => {
    s.sheets.Replayed && s.sheets.Replayed.rows.splice(1); // made again, never reused
    const users = ['Ana', 'Ben', 'Eve'].map(name => ({name}));
    s.ctx.replayedAll_(users, {});
    return users.map(u => u.rp);
  };
  // Both with the whole log (the switch off, as before), each read counted.
  const whole = () => {
    run(s, 'STATS.ON = false');
    delete s.cache.stats17;
    run(s, 'ROWS_ = null');
    let B, M;
    assert.ok(
      fullReads(s, () => {
        B = recs();
        M = list();
      }) > 0
    );
    run(s, 'STATS.ON = true');
    return [B, M];
  };
  let A, L;
  assert.strictEqual(
    fullReads(s, () => {
      A = recs();
      L = list();
    }),
    0,
    'no whole-log read'
  );
  assert.ok(A.some(r => Object.keys(r.rec).length > 3) && L.every(Array.isArray), JSON.stringify(L));
  const [B, M] = whole();
  assert.deepStrictEqual(A, B, 'rplMake_');
  assert.deepStrictEqual(L, M, 'replayedAll_');
  // The records depend on the pooled stats: other offsets in the snapshot give other records.
  const tab = s.sheets.Stats,
    keep = tab.rows[1].slice(),
    st = JSON.parse(keep.slice(6).join(''));
  Object.keys(st.gd).forEach(g => (st.gd[g][0] += 1));
  st.mem = st.mem.map((x, i) => x - i);
  tab.rows[1] = keep.slice(0, 6).concat([JSON.stringify(st)]);
  delete s.cache[run(s, 'statsCacheKey_()')];
  assert.notDeepStrictEqual(recs(), A, 'the replay reads the snapshot');
  tab.rows[1] = keep;
  delete s.cache[run(s, 'statsCacheKey_()')];
  assert.deepStrictEqual(recs(), A);
  // Another subject replays without pooled stats, as before.
  assert.strictEqual(
    fullReads(s, () => s.ctx.rplMake_('ana', s.ctx.rplMine_('ana', 0, 'fish'), 0, null, 'fish')),
    0
  );
  // A delete blanks the snapshot: the replays make the whole log, the same as with the switch off.
  assert.ok(s.post({userDelete: 'Eve', token: TOK}).ok);
  let C, N;
  assert.ok(
    fullReads(s, () => {
      C = recs();
      N = list();
    }) > 0
  );
  const [D, O] = whole();
  assert.deepStrictEqual(C, D);
  assert.deepStrictEqual(N, O);
});
