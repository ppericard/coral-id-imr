require('./slot.js').testGuard();
// The leaderboard recalculated with today's rules (sheet v118; Pierre, 2026-11-09, rule D8: "whenever progress is
// recalculated, the leaderboard must be recalculated automatically, even if people do not reconnect"): a player whose
// saved copy applied an older rules version of a subject is ranked on that subject's board by the progress their app
// will hold once it adopts the replay of their log (core.js replayAdopted), from the replay kept in the Replayed tab
// (made ahead by the 15-minute trigger, Code.gs boardWarm_); a player up to date keeps their saved values. Made-up names.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const {loadCodeGs, madeBefore} = require('./gas.js');
const C = require('../core.js');

const ROOT = path.join(__dirname, '..'),
  CODE = fs.readFileSync(path.join(ROOT, 'tools', 'sync', 'Code.gs'), 'utf8'),
  DJSON = fs.readFileSync(path.join(ROOT, 'data.json'), 'utf8'),
  FJSON = fs.readFileSync(path.join(ROOT, 'fish.json'), 'utf8'),
  SJSON = fs.readFileSync(path.join(ROOT, 'seaslug.json'), 'utf8'),
  CJSON = fs.readFileSync(path.join(ROOT, 'curation.json'), 'utf8'),
  TOK = 'ghp_write000000000000000000';
const resp = (code, body) => ({
  getResponseCode: () => code,
  getContentText: () => (typeof body === 'string' ? body : JSON.stringify(body))
});
// data.json and fish.json from GitHub (counted), and the script itself at the same version: autoUpdate finds itself up
// to date and runs the leaderboard's replays (boardWarm_).
// hook.data: run at the first fetch of data.json (inside the first coral replay the trigger makes, outside the lock).
const withAll = (n = {data: 0, fish: 0, seaslug: 0}, hook = {}) => ({
  n,
  fetch: url =>
    /\/main\/data\.json$/.test(url)
      ? (n.data++ || !hook.data || hook.data(), resp(200, DJSON))
      : /\/main\/fish\.json$/.test(url)
        ? (n.fish++, resp(200, FJSON))
        : /\/main\/seaslug\.json$/.test(url) // the sea slugs' replay units (core.js SUBJECTS seaslug replayed file)
          ? ((n.seaslug = (n.seaslug || 0) + 1), resp(200, SJSON))
          : /\/main\/curation\.json$/.test(url) // the content editor's structure the fish replay applies (Code.gs subjCur_)
            ? resp(200, CJSON)
            : /\/release\/tools\/sync\/Code\.gs/.test(url) // the script installs from the release branch (rule D3)
              ? resp(200, CODE)
              : /\/release\/tools\/sync\/appsscript\.json/.test(url)
                ? resp(200, '{}')
                : null
});
const ans = (id, x) => ({id, t: '2026-11-01T00:00:00Z', g: 'Acropora', a: 'Acropora', ok: 1, m: 'quiz', ph: 'acropora-1', ...x});
// Coral answers, 1 in 4 a mix-up with Montipora.
const qa = (id, i) =>
  ans(id, {
    t: new Date(Date.UTC(2026, 10, 3, 6, 0, i)).toISOString(),
    a: i % 4 === 3 ? 'Montipora' : 'Acropora',
    ok: i % 4 === 3 ? 0 : 1,
    ph: 'acropora-wide-' + (i % 5),
    ch: 'Acropora Montipora Porites Pocillopora',
    e: 0.8,
    th: 1
  });
// Fish answers as the app logs them, 1 in 3 a mix-up with the butterflyfishes.
const fa = (id, i) =>
  ans(id, {
    t: new Date(Date.UTC(2026, 10, 7, 6, 0, i)).toISOString(),
    s: 'fish',
    rk: 'family',
    g: 'f:Damselfishes',
    a: i % 3 === 2 ? 'f:Butterflyfishes' : 'f:Damselfishes',
    ok: i % 3 === 2 ? 0 : 1,
    m: 'quiz|c',
    ph: 'fi' + (100 + (i % 4)),
    ch: 'f:Damselfishes f:Butterflyfishes f:Angelfishes f:Wrasses',
    e: 0.8,
    th: 1,
    sc: {d: 0, r: 1}
  });
// Sea slug answers as the app logs them (its genera from the start: rk genus), 1 in 3 a mix-up with a sibling genus.
const sa = (id, i) =>
  ans(id, {
    t: new Date(Date.UTC(2026, 10, 17, 6, 0, i)).toISOString(),
    s: 'seaslug',
    rk: 'genus',
    g: 'g:Chromodoris',
    a: i % 3 === 2 ? 'g:Hypselodoris' : 'g:Chromodoris',
    ok: i % 3 === 2 ? 0 : 1,
    m: 'quiz|c',
    ph: 'seaslug-' + (100 + (i % 4)),
    ch: 'g:Chromodoris g:Hypselodoris g:Goniobranchus g:Glossodoris',
    e: 0.8,
    th: 1,
    sc: {d: 0, r: 1}
  });
const GENERA = {Acropora: 'mid', Montipora: 'new', Porites: 'new', Pocillopora: 'new'},
  CLIST = Object.keys(GENERA),
  FUNITS = ['f:Damselfishes', 'f:Butterflyfishes', 'f:Angelfishes', 'f:Wrasses'],
  SUNITS = ['g:Chromodoris', 'g:Hypselodoris', 'g:Goniobranchus', 'g:Glossodoris'];
// Each subject with a leaderboard and rules versions, its fixtures: its saved progress key, a saved copy whose bars the
// replay of its answers moves, those answers, the summary that sends its board's units, the units its % is over.
const FIX = {
  coral: {
    saved: {Acropora: {ok: 9, ko: 0, h: '111111111', pg: 0.95}, '~level': {ok: 260, ko: 0, th: 2.5}},
    answers: n => Array.from({length: 12}, (_, i) => qa(n + i, i)),
    summary: {genera: GENERA, board: 1},
    units: CLIST
  },
  fish: {
    saved: {'f:Damselfishes': {ok: 1, ko: 0, h: '1', pg: 0.1}, 'f:Angelfishes': {ok: 1, ko: 0, h: '1', pg: 0.2}},
    answers: n => Array.from({length: 9}, (_, i) => fa(n + i, i)),
    summary: {board: 1, boards: {fish: FUNITS}},
    units: FUNITS
  },
  seaslug: {
    saved: {'g:Chromodoris': {ok: 1, ko: 0, h: '1', pg: 0.1}, 'g:Glossodoris': {ok: 1, ko: 0, h: '1', pg: 0.2}},
    answers: n => Array.from({length: 9}, (_, i) => sa(n + i, i)),
    summary: {board: 1, boards: {seaslug: SUNITS}},
    units: SUNITS
  }
};
const BOARDED = C.SUBJECTS.filter(S => S.board && C.rvsOf(S.id).length);
// A player's saved data: each subject's progress, and the rules version each applied (rv: {subject: version}; none: 0).
const dataOf = (P, rv = {}) =>
  Object.fromEntries(
    BOARDED.flatMap(S => [
      [C.subjKey(S.id, 'progress'), JSON.stringify(P[S.id] || {})],
      ...(rv[S.id] !== undefined ? [[C.subjKey(S.id, 'rv'), JSON.stringify(rv[S.id])]] : [])
    ])
  );
const allSaved = () => Object.fromEntries(BOARDED.map(S => [S.id, FIX[S.id].saved]));
// A player saved with an app that asks for no replay (no rv): their answers logged, their copy as sent.
function play(s, name, pin, rv, extra = {}) {
  // Answer ids from a hash of the name: an id holding "__proto__" is refused when logged (Code.gs protoWord_), and the log
  // is the only reference (rule D9), so such a player would have no answer at all. Short: the sheet keeps an id's first 20
  // characters and logs each once (Code.gs newIds_), so two answers whose ids share them would be one.
  const id = C.hash53(name.toLowerCase()).slice(0, 6),
    answers = BOARDED.flatMap(S => FIX[S.id].answers('p' + id + S.id));
  // each subject's board units joined (boards: {subject: units})
  const summary = Object.assign({}, ...BOARDED.map(S => FIX[S.id].summary), extra, {
    boards: Object.assign({}, ...BOARDED.map(S => FIX[S.id].summary.boards || {}))
  });
  const r = s.post({name, pin, data: dataOf(allSaved(), rv), summary, answers});
  assert.ok(r.ok && !r.replay && !r.replays, JSON.stringify(r).slice(0, 200));
}
const tabOf = sid => (sid === C.replaySubject() ? 'Replayed' : 'Replayed ' + C.subjectOf(sid).name);
const keptOf = (s, sid, name) => {
  const row = (s.sheets[tabOf(sid)] || {rows: []}).rows.find(r => String(r[0]).toLowerCase() === name.toLowerCase());
  if (!row) return null;
  const o = JSON.parse(row.slice(5).join(''));
  return o && o.F ? o.P : o;
};
// What the player's app will show once it adopts the kept replay: core.js replayAdopted over the saved copy.
const shown = (s, S, name, top = C.rvOf(S.id)) => {
  const M = C.replayAdopted(keptOf(s, S.id, name), FIX[S.id].saved, top),
    L = M['~level'];
  return [name, C.pctOf(M, FIX[S.id].units), L && (L.ok || 0) + (L.ko || 0) >= 200 ? L.th : null];
};
const savedRow = (S, name) => {
  const P = FIX[S.id].saved,
    L = P['~level'];
  return [name, C.pctOf(P, FIX[S.id].units), L && L.ok + L.ko >= 200 ? L.th : null];
};
const board = (s, S) => s.get({board: '1', s: S.id}).rows;
const clearBoards = s => Object.keys(s.cache).forEach(k => /^board14/.test(k) && delete s.cache[k]);

test('every subject with a leaderboard and rules versions has its fixtures here (a new one must be checked too)', () => {
  assert.ok(BOARDED.length >= 2, BOARDED.map(S => S.id).join());
  BOARDED.forEach(S => assert.ok(FIX[S.id], 'fixtures for ' + S.id));
  // A subject whose progress the sheet replays has rules versions, so its board follows them (rule D8).
  C.SUBJECTS.filter(S => S.board && (S.replay || S.replayed)).forEach(S => assert.ok(C.rvsOf(S.id).length, S.id));
});

test('a player behind the rules: every board shows the replayed progress and level once the trigger made the replay', () => {
  const f = withAll(),
    s = loadCodeGs({fetch: f.fetch});
  play(s, 'Ana', '1234', {}); // behind every subject's rules (no version applied)
  play(s, 'Ben', '1111', Object.fromEntries(BOARDED.map(S => [S.id, C.rvOf(S.id)]))); // up to date
  // Before the trigger: nothing replayed yet, the saved copies as before; the board fetches nothing and replays nothing.
  const n0 = s.fetched.length;
  BOARDED.forEach(S => {
    assert.deepStrictEqual(
      board(s, S).sort((a, b) => (a[0] < b[0] ? -1 : 1)),
      [savedRow(S, 'Ana'), savedRow(S, 'Ben')]
    );
    assert.ok(!s.sheets[tabOf(S.id)], 'no replay made by the board');
  });
  assert.strictEqual(s.fetched.length, n0, 'the board fetches nothing');
  // The 15-minute trigger, the script up to date: Ana's replays made (one per subject), Ben's not.
  assert.match(s.ctx.autoUpdate(), /^up to date/);
  BOARDED.forEach(S => {
    assert.deepStrictEqual(
      s.sheets[tabOf(S.id)].rows.slice(1).map(r => [r[0], r[1]]),
      [['Ana', C.rvOf(S.id)]]
    );
    const rows = board(s, S),
      ana = rows.find(r => r[0] === 'Ana'),
      want = shown(s, S, 'Ana');
    assert.deepStrictEqual(ana, want, S.id + ': the replayed progress and level, as her app will hold them');
    assert.notDeepStrictEqual(ana, savedRow(S, 'Ana'), S.id + ': the replay moved her');
    assert.deepStrictEqual(
      rows.find(r => r[0] === 'Ben'),
      savedRow(S, 'Ben'),
      S.id + ': up to date, his saved values'
    );
  });
  const log = () => s.sheets['Deploy log'].rows.filter(r => /^leaderboard/.test(String(r[1])));
  assert.strictEqual(log().length, 1);
  assert.match(String(log()[0][1]), new RegExp('^leaderboard: ' + BOARDED.length + ' replays made'));
  // Reused while the rules, rows and reset are the same: the next run makes none, and the board reads the record kept.
  s.ctx.autoUpdate();
  assert.strictEqual(log().length, 1, 'nothing made again');
  // The very record her app gets at her next sync (Code.gs replay_ reuses it): the board shows what she will see.
  const g = s.get({name: 'Ana', pin: '1234', rv: '0', ...Object.fromEntries(BOARDED.filter(S => !S.replay).map(S => ['rv_' + S.id, '0']))});
  BOARDED.forEach(S => {
    const rp = S.replay ? g.replay : g.replays[S.id];
    assert.deepStrictEqual(rp.rec, keptOf(s, S.id, 'Ana'), S.id + ': her sync reuses the record the board ranked her by');
    assert.strictEqual(s.sheets[tabOf(S.id)].rows.length, 2, 'still one row');
  });
});

test('the fish board: the replay of the log as the app adopts it, no floor (Q330): a saved bar above the log comes down', () => {
  const S = C.subjectOf('fish');
  const f = withAll(),
    s = loadCodeGs({fetch: f.fetch});
  play(s, 'Ana', '1234', {});
  s.ctx.autoUpdate();
  const high = FIX.fish.saved,
    rec = C.replayProgress(
      FIX.fish.answers('anafish').map(a => C.logRow(a, 'ana')),
      // the variant table the sheet made and keeps (Code.gs subjVar_, from the cache: nothing fetched again)
      {gen: C.fishReplayGen(JSON.parse(FJSON)), vars: s.ctx.subjVar_('fish')}
    ).ana.P,
    M = C.replayAdopted(rec, high, C.rvOf('fish'));
  assert.deepStrictEqual(keptOf(s, 'fish', 'Ana'), rec, "the sheet's replay, not floored");
  assert.deepStrictEqual(board(s, S), [['Ana', C.pctOf(M, FUNITS), null]]);
  // A unit the log has no answer on, with answers saved (the Angelfishes): its answers go (rule D9).
  FUNITS.filter(u => high[u] && !rec[u] && (high[u].ok || high[u].ko)).forEach(u => assert.ok(!M[u], u));
});

// "Learned" asks each variant group (Pierre, 2026-11-17 10:52 Manila, Q391 b; fish rules version 3): the sheet's replay
// decides from the answer log (rule D9) with the variant table it makes (Code.gs subjVar_, core.js fishVarTable), so the
// fish board follows for every player at once (rule D8), whoever never reconnects.
test('Learned and the variant groups on the fish board: a mark without each group right in the log goes, for every player at once', () => {
  const S = C.subjectOf('fish'),
    f = withAll(),
    s = loadCodeGs({fetch: f.fetch}),
    T = s.ctx.subjVar_('fish'),
    U = T['f:Damselfishes'],
    juv = U.v.find(x => x[1] !== 'ph')[0],
    phs = U.v.find(x => x[1] === 'ph')[0],
    at = Date.UTC(2026, 10, 8), // learned after every answer of the log: no miss after it takes the mark (replayedOf lm)
    learned = {...FIX.fish.saved, 'f:Damselfishes': {...FIX.fish.saved['f:Damselfishes'], mx: at}},
    // Ana's answers on photos with no variant; Ben's the same, his first two right ones on a juvenile and a male photo.
    send = (name, pin, A) => {
      const r = s.post({
        name,
        pin,
        data: dataOf({...allSaved(), fish: learned}, {fish: C.rvOf('fish') - 1}),
        summary: FIX.fish.summary,
        answers: A
      });
      assert.ok(r.ok, JSON.stringify(r).slice(0, 200));
    };
  assert.deepStrictEqual(C.varLeftOf(U, 1, {}), ['juv', 'ph'], 'the Damselfishes have both groups');
  send('Ana', '1234', FIX.fish.answers('anafish'));
  send(
    'Ben',
    '1111',
    FIX.fish.answers('benfish').map((a, i) => (i < 2 ? {...a, ph: i ? phs : juv} : a))
  );
  // Before the trigger: both learned on the board, as their saved copies (behind fish rules version 3) say.
  const pct = P => C.pctOf(P, FUNITS);
  assert.deepStrictEqual(
    board(s, S).map(r => r[1]),
    [pct(learned), pct(learned)]
  );
  // The trigger makes the replays: neither player reconnects.
  s.ctx.autoUpdate();
  clearBoards(s);
  const M = name => C.replayAdopted(keptOf(s, 'fish', name), learned, C.rvOf('fish')),
    rows = Object.fromEntries(board(s, S).map(r => [r[0], r[1]]));
  assert.deepStrictEqual(keptOf(s, 'fish', 'Ana')['f:Damselfishes'].vl, ['juv', 'ph'], 'no group right in her log');
  assert.ok(!M('Ana')['f:Damselfishes'].mx, 'Ana: the mark taken away by the replay');
  assert.deepStrictEqual(
    M('Ana')['f:Damselfishes'].ex,
    {k: C.MX_EXAM.n, t: C.MX_EXAM.typed, v: [], ts: at, at: 0},
    'her exam kept as passed but for the groups'
  );
  assert.strictEqual(rows.Ana, pct(M('Ana')), 'her board follows without her reconnecting');
  assert.ok(!('vl' in keptOf(s, 'fish', 'Ben')['f:Damselfishes']), 'each group right in his log');
  assert.strictEqual(M('Ben')['f:Damselfishes'].mx, at, 'Ben keeps his mark');
  assert.strictEqual(rows.Ben, pct(M('Ben')));
  // The same answers but for the photos: only her learned mark makes the difference.
  assert.strictEqual(M('Ben')['f:Damselfishes'].ok, M('Ana')['f:Damselfishes'].ok);
  assert.ok(rows.Ana < rows.Ben, `Ana ${rows.Ana} under Ben ${rows.Ben}`);
});

test('the opt-out, an admin hide and an archive hold on every board; such a player gets no replay made', () => {
  const f = withAll(),
    s = loadCodeGs({fetch: f.fetch});
  play(s, 'Ana', '1234', {});
  play(s, 'Ana B', '5678', {}, {board: 0}); // opted out
  play(s, 'Cy', '2222', {});
  play(s, 'Dee', '3333', {});
  s.post({userBoard: 'Cy', hide: true, token: TOK});
  s.post({userArchive: {from: 'Dee', into: 'Dee-old'}, token: TOK});
  s.ctx.autoUpdate();
  BOARDED.forEach(S => {
    assert.deepStrictEqual(
      board(s, S).map(r => r[0]),
      ['Ana']
    );
    assert.deepStrictEqual(
      s.sheets[tabOf(S.id)].rows.slice(1).map(r => r[0]),
      ['Ana'],
      'replays made for listed players only'
    );
  });
});

test('no heavy work under the script lock: the replays are made outside it, written only when it is free', () => {
  const f = withAll(),
    s = loadCodeGs({fetch: f.fetch});
  play(s, 'Ana', '1234', {});
  // The one-shot migrations done long ago, as on the live sheet (each takes the lock: Code.gs once_).
  vm.runInContext('Object.keys(ONCE_)', s.ctx).forEach(k => (s.props['ONCE_' + k] = '1'));
  s.lock.busy = true; // another request holds the lock for the whole run
  assert.match(s.ctx.autoUpdate(), /^up to date/);
  assert.ok(f.n.data >= 1 && f.n.fish >= 1, 'the units fetched, the replays made, with the lock held elsewhere');
  BOARDED.forEach(S => assert.ok(!s.sheets[tabOf(S.id)] || s.sheets[tabOf(S.id)].getLastRow() < 2, 'nothing written'));
  // The board itself takes no lock: it answers while the lock is busy, with the saved copies.
  BOARDED.forEach(S => assert.deepStrictEqual(board(s, S), [savedRow(S, 'Ana')]));
  s.lock.busy = false;
  clearBoards(s);
  s.ctx.autoUpdate();
  BOARDED.forEach(S => assert.deepStrictEqual(board(s, S), [shown(s, S, 'Ana')]));
});

test('the board reads the record kept, cached 5 minutes; a record of another rules version, row count or reset is not read', () => {
  const f = withAll(),
    s = loadCodeGs({fetch: f.fetch});
  play(s, 'Ana', '1234', {});
  s.ctx.autoUpdate();
  const S = C.subjectOf(C.replaySubject()),
    T = s.sheets.Replayed,
    // The record kept, a learned Acropora in it (its level kept: a replay with answers always has one).
    mark = {...JSON.parse(T.rows[1].slice(5).join('')), Acropora: {ok: 30, ko: 0, mx: 1}};
  T.rows[1][5] = JSON.stringify(mark);
  assert.deepStrictEqual(
    board(s, S),
    [shown(s, S, 'Ana')].map(r => [r[0], r[1], r[2]]),
    'cached: as before'
  );
  clearBoards(s);
  const M = C.replayAdopted(mark, FIX.coral.saved, C.RV);
  assert.deepStrictEqual(board(s, S)[0][1], C.pctOf(M, CLIST), 'the record kept, as the app adopts it');
  // Another row count (an answer logged since without a replay adopted): not read, the saved copy until the next run.
  T.rows[1][2] = 99;
  clearBoards(s);
  assert.deepStrictEqual(board(s, S), [savedRow(S, 'Ana')]);
  T.rows[1][2] = 12;
  T.rows[1][1] = C.RV - 1;
  clearBoards(s);
  assert.deepStrictEqual(board(s, S), [savedRow(S, 'Ana')], 'another rules version: not read');
  // The next run makes it again under today's rules.
  s.ctx.autoUpdate();
  assert.strictEqual(T.rows[1][1], C.RV);
  assert.notDeepStrictEqual(board(s, S), [savedRow(S, 'Ana')]);
});

// Rule D8: a new rules version of any subject (its RVS, FISH_RVS, a future subject's rvs) reaches its board for every
// player at once, through the same trigger, with nothing to add per subject or per version.
test('a new rules version of any subject leaves no board stale: the players up to date before it are replayed under it', () => {
  BOARDED.forEach(S => {
    const f = withAll(),
      s = loadCodeGs({fetch: f.fetch}),
      top = C.rvOf(S.id);
    play(s, 'Ben', '1111', Object.fromEntries(BOARDED.map(X => [X.id, C.rvOf(X.id)]))); // up to date
    s.ctx.autoUpdate();
    assert.deepStrictEqual(board(s, S), [savedRow(S, 'Ben')], S.id + ': up to date, nothing replayed');
    assert.ok(!s.sheets[tabOf(S.id)]);
    // A new rules version of this subject only, appended as rule D5 says (core.js rvsOf: the list the app and the script read).
    vm.runInContext(`CORE_.rvsOf(${JSON.stringify(S.id)}).push({v: ${top + 1}, at: '2026-11-09', why: 'test', msg: CORE_.RV_CARD})`, s.ctx);
    assert.strictEqual(vm.runInContext(`CORE_.rvOf(${JSON.stringify(S.id)})`, s.ctx), top + 1);
    clearBoards(s);
    s.ctx.autoUpdate();
    assert.deepStrictEqual(
      s.sheets[tabOf(S.id)].rows.slice(1).map(r => [r[0], r[1]]),
      [['Ben', top + 1]],
      S.id + ': replayed under the new version'
    );
    assert.deepStrictEqual(board(s, S), [shown(s, S, 'Ben', top + 1)], S.id + ': the board follows it');
    assert.notDeepStrictEqual(board(s, S), [savedRow(S, 'Ben')]);
    // The other subjects' boards: their players still up to date, as saved.
    BOARDED.filter(X => X !== S).forEach(X => assert.deepStrictEqual(board(s, X), [savedRow(X, 'Ben')], X.id));
  });
});

// Codex review #810 (rule D7): a replay made outside the lock while the account is deleted never brings its rows back.
test('an account deleted while the trigger replays it: none of its replays written, the other players still are', () => {
  const hook = {},
    f = withAll(undefined, hook),
    s = loadCodeGs({fetch: f.fetch});
  play(s, 'Ana', '1234', {});
  play(s, 'Ben', '1111', {});
  hook.data = () => assert.ok(s.post({selfDelete: 1, dname: 'Ana', dpin: '1234'}).deleted, 'deleted mid-run');
  assert.match(s.ctx.autoUpdate(), /^up to date/);
  assert.strictEqual(f.n.data, 1, 'the delete ran inside the replay');
  BOARDED.forEach(S => {
    assert.deepStrictEqual(
      s.sheets[tabOf(S.id)].rows.slice(1).map(r => r[0]),
      ['Ben'],
      S.id + ': nothing of the deleted account'
    );
    assert.deepStrictEqual(board(s, S), [shown(s, S, 'Ben')]);
  });
  assert.ok(!s.sheets.Answers.rows.some(r => r[0] === 'Ana'));
});

test('answers logged while the trigger replays: that replay dropped, made again over them at the next run', () => {
  const hook = {},
    f = withAll(undefined, hook),
    s = loadCodeGs({fetch: f.fetch}),
    S = C.subjectOf(C.replaySubject());
  play(s, 'Ana', '1234', {});
  // The answer comes in while the trigger makes the first coral replay, outside the lock: from step 8 of the design note
  // the coral units are made before the replays (subjStRefresh_ reads data.json under the content editor's pairs), so the
  // replay itself is where it comes, not data.json's fetch.
  const mk = s.ctx.rplMake_;
  let late = false;
  s.ctx.rplMake_ = (...a) => {
    if (!late && !a[4]) {
      late = true;
      assert.ok(s.post({name: 'Ana', pin: '1234', data: dataOf(allSaved()), summary: {}, at: 1, answers: [qa('late', 40)]}).log);
    }
    return mk(...a);
  };
  s.ctx.autoUpdate();
  assert.ok(late, 'the answer came in during the replay');
  assert.ok(!s.sheets.Replayed || !s.sheets.Replayed.rows.slice(1).some(r => r[0] === 'Ana'), 'made over 12 rows, 13 now: not written');
  s.ctx.autoUpdate();
  assert.deepStrictEqual(
    s.sheets.Replayed.rows.slice(1).map(r => [r[0], r[2]]),
    [['Ana', 13]]
  );
  clearBoards(s);
  assert.deepStrictEqual(board(s, S), [shown(s, S, 'Ana')]);
});

// Codex review #810: a player named after a member of Object.prototype is an entry like any other.
test('players named constructor, __proto__, toString: every board served, their replays made', () => {
  const f = withAll(),
    s = loadCodeGs({fetch: f.fetch}),
    names = ['constructor', '__proto__', 'toString', 'hasOwnProperty'];
  madeBefore(s, () => names.forEach((n, i) => play(s, n, String(2000 + i), {}))); // accounts from before the refusal of reserved names
  play(s, 'Ben', '1111', Object.fromEntries(BOARDED.map(S => [S.id, C.rvOf(S.id)])));
  BOARDED.forEach(S => assert.strictEqual(board(s, S).length, names.length + 1, S.id + ': served before the trigger'));
  assert.match(s.ctx.autoUpdate(), /^up to date/);
  BOARDED.forEach(S => {
    assert.deepStrictEqual(
      s.sheets[tabOf(S.id)].rows
        .slice(1)
        .map(r => r[0])
        .sort(),
      [...names].sort(),
      S.id + ': each replayed'
    );
    const rows = board(s, S);
    names.forEach(n =>
      assert.deepStrictEqual(
        rows.find(r => r[0] === n),
        shown(s, S, n),
        S.id + ' ' + n
      )
    );
    assert.deepStrictEqual(
      rows.find(r => r[0] === 'Ben'),
      savedRow(S, 'Ben')
    );
  });
});
