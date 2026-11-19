require('./slot.js').testGuard();
// The live mode (docs/reviews/2026-11-18-live-mode-design.md): Code.gs lv_ on the
// in-memory sheet (rule D1): the trainer check (d) by the script's roles, never the page; the session's state machine;
// the scoring (b): a right answer plus a speed bonus, timed from the moment the question reached that student; what a
// student is sent (never the right answer before the reveal); the session in the cache only, never a sheet tab; and the
// app's own module (live.js) for its gate (rule D4) and its pure helpers.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const {loadCodeGs} = require('./gas.js');
const block = require('./block.js');

const ROOT = path.join(__dirname, '..');
const TOK = 'ghp_write000000000000000000';
const IMR = 'instance:imr';
const run = (s, js) => vm.runInContext(js, s.ctx);
const copy = o => JSON.parse(JSON.stringify(o));
const save = (s, name, pin = '1234') => s.post({name, pin, data: {}, summary: {}, answers: []});
const grant = (s, account, role) => s.post({roleGrant: {account, role, scope: IMR}, token: TOK});
// A question as the trainer's page sends it (live.js liveBuild): photos, four choices, the right one's index.
const Q = (k = 1, f = 'acropora-1') => ({
  ph: [{f, u: `img/${f}-m.webp`, v: 'wide'}],
  ch: [
    ['Montipora', 'Montipora'],
    ['Acropora', 'Acropora'],
    ['Porites', 'Porites'],
    ['Pocillopora', 'Pocillopora']
  ],
  k
});
// A sheet with a trainer (Tess, the trainer role), a player with no role (Pat), and the clock under the test's hand.
function setup() {
  const s = loadCodeGs();
  let now = Date.UTC(2026, 10, 18, 2, 0, 0);
  run(s, 'Date.now = () => globalThis.__now();');
  s.ctx.__now = () => now;
  s.tick = ms => (now += ms);
  save(s, 'Tess');
  save(s, 'Pat');
  assert.strictEqual(grant(s, 'Tess', 'trainer').ok, true);
  s.lv = (step, o = {}) => copy(s.post({lv: step, ...o}));
  return s;
}
const start = (s, o = {}) => s.lv('start', {lname: 'Tess', lpin: '1234', s: 'coral', t: 'Group 1', n: 3, lim: 20, ...o});

test('only an account with the trainer role starts a session, checked by the script with its code', () => {
  const s = setup();
  // No role: refused, and one Audit row for the refusal (ids only).
  assert.deepStrictEqual(start(s, {lname: 'Pat'}), {ok: false, error: 'role', v: run(s, 'VERSION')});
  // A wrong code: refused before any role is read, and it counts towards the account's lock (failed_).
  assert.strictEqual(start(s, {lpin: '9999'}).error, 'pin');
  for (let i = 0; i < 5; i++) start(s, {lpin: '9999'});
  assert.strictEqual(start(s).error, 'wait');
  run(s, `CacheService.getScriptCache().remove(failKey_('Tess'))`);
  // No such account, a malformed request, a name / pin pair (a progress save's fields) never taken as the trainer's.
  assert.strictEqual(start(s, {lname: 'Nobody'}).error, 'user');
  assert.strictEqual(s.lv('start', {name: 'Tess', pin: '1234', s: 'coral', n: 3, lim: 20}).error, 'input');
  assert.strictEqual(start(s, {n: 0}).error, 'input');
  assert.strictEqual(start(s, {lim: 500}).error, 'input');
  assert.strictEqual(start(s, {s: 'whales'}).error, 'input');
  // The trainer: a 6-digit code and a key of its own.
  const r = start(s);
  assert.strictEqual(r.ok, true);
  assert.match(r.code, /^\d{6}$/);
  assert.match(r.tk, /^[a-z0-9]{18}$/);
  // Audited: the start and the refusal, by anonymous id, never a name.
  const A = s.sheets.Audit.rows.slice(1).map(x => [x[2], x[3], x[4]]);
  assert.deepStrictEqual(A.slice(-2), [
    ['live start', IMR, 'denied'],
    ['live start', IMR, 'ok']
  ]);
  assert.ok(!JSON.stringify(s.sheets.Audit.rows).includes('Tess'));
  // The right is the trainer role's only: an owner or an editor without it is refused (rights are separate).
  save(s, 'Owen');
  grant(s, 'Owen', 'owner');
  grant(s, 'Owen', 'editor');
  assert.strictEqual(start(s, {lname: 'Owen'}).error, 'role');
  assert.strictEqual(run(s, `ROLES.DEF.trainer.rights.includes('live')`), true);
});

test('a session runs lobby, question, reveal, next, end; students get no right answer before the reveal', () => {
  const s = setup(),
    {code, tk} = start(s),
    host = (o = {}) => s.lv('host', {code, tk, ...o});
  assert.strictEqual(host().ph, 'lobby');
  // A wrong key is no trainer.
  assert.strictEqual(s.lv('host', {code, tk: 'x'.repeat(18), act: 'end'}).error, 'input');
  // Three students join; the same nickname twice gets a number.
  const J = ['Mia', 'Leo', 'mia'].map(nick => s.lv('join', {code, nick}));
  assert.deepStrictEqual(
    J.map(j => j.name),
    ['Mia', 'Leo', 'mia 2']
  );
  J.forEach(j => assert.match(j.pk, /^[a-z0-9]{16}$/));
  assert.deepStrictEqual(host().names, ['Mia', 'Leo', 'mia 2']);
  const poll = j => s.lv('poll', {code, pid: j.pid, pk: j.pk}),
    ans = (j, c, qi = 0) => s.lv('answer', {code, pid: j.pid, pk: j.pk, qi, c});
  assert.strictEqual(poll(J[0]).ph, 'lobby');
  // A reveal or an answer before any question: refused.
  assert.strictEqual(host({act: 'rev'}).error, 'phase');
  assert.strictEqual(ans(J[0], 1).error, 'phase');
  // A question that does not fit is refused, nothing changes.
  assert.strictEqual(host({act: 'q', q: {...Q(), k: 7}}).error, 'input');
  assert.strictEqual(host({act: 'q', q: {...Q(), ch: Q().ch.slice(0, 3)}}).error, 'input');
  assert.strictEqual(host({act: 'q', q: {...Q(), ph: [{f: 'a', u: 'javascript:alert(1)'}]}}).error, 'input');
  assert.strictEqual(host({act: 'q', q: {...Q(), ph: [{f: 'a', u: 'https://x.org/a" onerror="b'}]}}).error, 'input');
  assert.strictEqual(host().ph, 'lobby');
  // The first question: the trainer sees its right answer, a student never.
  const h1 = host({act: 'q', q: Q(1)});
  assert.strictEqual(h1.ph, 'q');
  assert.strictEqual(h1.q.k, 1);
  const p1 = poll(J[0]);
  assert.strictEqual(p1.ph, 'q');
  assert.strictEqual(p1.left, 20000);
  assert.deepStrictEqual(p1.q.ch[1], ['Acropora', 'Acropora']);
  assert.ok(!('k' in p1.q) && !('rev' in p1) && !JSON.stringify(p1).includes('"k"'), JSON.stringify(p1));
  // Answers: Mia right after 5 s of her own clock; Leo wrong; one answer each, the second ignored.
  poll(J[1]);
  s.tick(5000);
  assert.deepStrictEqual(ans(J[0], 1), {ok: true, mine: 1, v: run(s, 'VERSION')});
  assert.strictEqual(ans(J[0], 2).mine, 1);
  assert.strictEqual(ans(J[1], 3).ok, true);
  // Still nothing about right or wrong for the students, and the count for the trainer.
  assert.ok(!('rev' in poll(J[0])));
  assert.strictEqual(host().cnt, 2);
  // A key that is not the student's: refused.
  assert.strictEqual(s.lv('answer', {code, pid: J[2].pid, pk: J[0].pk, qi: 0, c: 1}).error, 'input');
  // The reveal: the right choice, each choice's count, own points, the top 5.
  const r1 = host({act: 'rev'});
  assert.deepStrictEqual(r1.rev.d, [0, 1, 0, 1]);
  assert.strictEqual(r1.rev.tot, 2);
  const v = poll(J[0]);
  assert.strictEqual(v.ph, 'rev');
  assert.strictEqual(v.rev.k, 1);
  assert.strictEqual(v.rev.mine, 1);
  assert.strictEqual(v.rev.pts, 175); // 100 + 100 x 15 s left of 20
  assert.strictEqual(v.rank, 1);
  assert.deepStrictEqual(v.top[0], ['Mia', 175, 1]);
  assert.strictEqual(poll(J[1]).rev.pts, 0);
  // Too late once revealed.
  assert.strictEqual(ans(J[2], 1).error, 'phase');
  // Next question, then the last; no fourth one (3 planned).
  assert.strictEqual(host({act: 'q', q: Q(0, 'montipora-2')}).qi, 1);
  assert.strictEqual(host({act: 'q', q: Q(0)}).error, 'phase');
  host({act: 'rev'});
  host({act: 'q', q: Q(2, 'porites-3')});
  host({act: 'rev'});
  assert.strictEqual(host({act: 'q', q: Q()}).error, 'phase');
  const e = host({act: 'end'});
  assert.strictEqual(e.ph, 'end');
  assert.strictEqual(e.hist.length, 3);
  assert.deepStrictEqual(e.hist[0].d, [0, 1, 0, 1]);
  assert.strictEqual(e.hist[0].t, 'Acropora');
  assert.deepStrictEqual(e.stand[0], ['Mia', 175, 1]);
  assert.strictEqual(poll(J[2]).ph, 'end');
  assert.strictEqual(host({act: 'end'}).error, 'phase');
  // No join once ended.
  assert.strictEqual(s.lv('join', {code, nick: 'Zoe'}).error, 'gone');
  // Nothing of it in any sheet tab: the cache only (the Audit row of the start aside).
  const tabs = JSON.stringify(Object.values(s.sheets).map(t => t.rows));
  ['Mia', 'Leo', code].forEach(w => assert.ok(!tabs.includes(w), w));
});

test('scoring: a right answer and a speed bonus, timed from when the question reached that student', () => {
  const s = setup();
  const pts = (ok, ms, lim) => run(s, `lvPoints_(${ok}, ${ms}, ${lim})`);
  assert.strictEqual(pts(true, 0, 20000), 200);
  assert.strictEqual(pts(true, 10000, 20000), 150);
  assert.strictEqual(pts(true, 20000, 20000), 100);
  assert.strictEqual(pts(true, 25000, 20000), 100);
  assert.strictEqual(pts(false, 0, 20000), 0);
  const {code, tk} = start(s),
    a = s.lv('join', {code, nick: 'Ann'}),
    b = s.lv('join', {code, nick: 'Ben'});
  s.lv('host', {code, tk, act: 'q', q: Q(1)});
  // Ann's phone polls at once; Ben's only 4 s later: each answers 2 s after the question reached them.
  s.lv('poll', {code, pid: a.pid, pk: a.pk});
  s.tick(2000);
  s.lv('answer', {code, pid: a.pid, pk: a.pk, qi: 0, c: 1});
  s.tick(2000);
  s.lv('poll', {code, pid: b.pid, pk: b.pk});
  s.tick(2000);
  s.lv('answer', {code, pid: b.pid, pk: b.pk, qi: 0, c: 1});
  const st = s.lv('host', {code, tk}).stand;
  assert.strictEqual(st[0][1], st[1][1]);
  assert.strictEqual(st[0][1], 190);
  // Past the time and its grace: refused.
  s.lv('host', {code, tk, act: 'rev'});
  s.lv('host', {code, tk, act: 'q', q: Q(1)});
  s.lv('poll', {code, pid: a.pid, pk: a.pk});
  s.tick(20000 + 3001);
  assert.strictEqual(s.lv('answer', {code, pid: a.pid, pk: a.pk, qi: 1, c: 1}).error, 'phase');
});

// The script lock as Apps Script holds it: taken by one request until it lets go (tests/gas.js only knows "held by
// another request", lock.busy, set by hand).
function exclusive(s) {
  const L0 = s.ctx.LockService.getScriptLock;
  s.ctx.LockService.getScriptLock = () => {
    const l = L0();
    let mine = false;
    return {
      waitLock(ms) {
        l.waitLock(ms);
        s.lock.busy = mine = true;
      },
      tryLock(ms) {
        if (!l.tryLock(ms)) return false;
        return (s.lock.busy = mine = true);
      },
      releaseLock() {
        if (mine) s.lock.busy = mine = false;
        l.releaseLock();
      }
    };
  };
}
test('a reveal and an answer never cross: the reveal holds every answer accepted, and none comes after it (Codex review #1049)', () => {
  // The trainer's reveal lands in the middle of a student's answer: once after the answer read the session, once as it
  // writes the student's record.
  const hooks = {
    read: `{ const f = lvMe_; lvMe_ = p => { const r = f(p); if (p.lv === 'answer' && globalThis.__race) { const g = globalThis.__race; globalThis.__race = null; g(); } return r; }; }`,
    write: `{ const f = lvPut_; lvPut_ = (k, o) => { if (/:p:/.test(k) && o.a && o.a[0] && globalThis.__race) { const g = globalThis.__race; globalThis.__race = null; g(); } return f(k, o); }; }`
  };
  for (const [at, hook] of Object.entries(hooks)) {
    const s = setup(),
      {code, tk} = start(s),
      a = s.lv('join', {code, nick: 'Ann'});
    exclusive(s);
    s.lv('host', {code, tk, act: 'q', q: Q(1)});
    s.lv('poll', {code, pid: a.pid, pk: a.pk});
    let mid = null;
    s.ctx.__race = () => (mid = s.lv('host', {code, tk, act: 'rev'}));
    run(s, hook);
    const r = s.lv('answer', {code, pid: a.pid, pk: a.pk, qi: 0, c: 1});
    assert.ok(mid, `${at}: the reveal came in the middle of the answer`);
    // A reveal refused for the lock (the trainer's page tries again) is made once the answer let it go.
    const rev = mid.ok ? mid : s.lv('host', {code, tk, act: 'rev'});
    assert.strictEqual(rev.ok, true, `${at}: ${JSON.stringify(rev)}`);
    const pts = s.lv('host', {code, tk}).stand[0][1],
      p = s.lv('poll', {code, pid: a.pid, pk: a.pk});
    // Either the answer came first and the reveal holds it, or the reveal came first and the answer was too late: never
    // points the reveal does not show.
    assert.strictEqual(rev.rev.tot, r.ok ? 1 : 0, `${at}: answer ${JSON.stringify(r)}, reveal ${JSON.stringify(rev.rev)}`);
    assert.deepStrictEqual(rev.rev.top[0], ['Ann', pts, r.ok ? 1 : 0], at);
    assert.strictEqual(pts, r.ok ? 200 : 0, at);
    assert.strictEqual(p.rev.mine, r.ok ? 1 : -1, at);
    assert.strictEqual(s.lock.busy, false, `${at}: the lock let go`);
  }
});

test('a student is sent their accepted answers once revealed, a reveal missed or not; never one refused (Codex review #1049)', () => {
  const s = setup(),
    {code, tk} = start(s),
    a = s.lv('join', {code, nick: 'Ann'}),
    poll = (hx = 0) => s.lv('poll', {code, pid: a.pid, pk: a.pk, hx}),
    ans = (qi, c) => s.lv('answer', {code, pid: a.pid, pk: a.pk, qi, c});
  // A subject in beta for a group is never hosted (a group subject is made here, whatever the real subjects are).
  run(s, "CORE_.SUBJECTS.find(S => S.id === 'seaslug').open = 'group'");
  assert.strictEqual(start(s, {s: 'seaslug'}).error, 'input');
  run(s, "CORE_.SUBJECTS.find(S => S.id === 'seaslug').open = 'all'");
  s.lv('host', {code, tk, act: 'q', q: Q(1)});
  poll();
  ans(0, 2);
  // Nothing revealed yet: nothing to log, and no right answer in the reply.
  const p0 = poll();
  assert.strictEqual(p0.hn, 0);
  assert.ok(!('past' in p0));
  // Revealed, then the next question opened before Ann's page polled again: her answer still comes, with its right one.
  s.lv('host', {code, tk, act: 'rev'});
  s.lv('host', {code, tk, act: 'q', q: Q(0, 'montipora-2')});
  const p1 = poll();
  assert.strictEqual(p1.ph, 'q');
  assert.strictEqual(p1.hn, 1);
  assert.deepStrictEqual(p1.past, [
    {qi: 0, t: 'Acropora', c: 'Porites', ch: ['Montipora', 'Acropora', 'Porites', 'Pocillopora'], f: ['acropora-1']}
  ]);
  // Once the page has gone through it (hx), not again.
  assert.ok(!('past' in poll(1)));
  // An answer refused (too late) is never sent as hers.
  s.tick(20000 + 3001);
  assert.strictEqual(ans(1, 0).error, 'phase');
  s.lv('host', {code, tk, act: 'rev'});
  const p2 = poll(1);
  assert.strictEqual(p2.rev.mine, -1);
  assert.strictEqual(p2.hn, 2);
  assert.ok(!('past' in p2));
  // At the end, from the start: only question 0.
  s.lv('host', {code, tk, act: 'end'});
  assert.deepStrictEqual(
    poll().past.map(x => x.qi),
    [0]
  );
});

test('joins: a nickname of plain text, at most 40 a session, a session older than 6 hours is gone', () => {
  const s = setup(),
    {code, tk} = start(s);
  assert.strictEqual(s.lv('join', {code, nick: '  '}).error, 'input');
  assert.strictEqual(s.lv('join', {code: '12345', nick: 'A'}).error, 'input');
  assert.strictEqual(s.lv('join', {code: code === '999999' ? '999998' : '999999', nick: 'A'}).error, 'gone');
  assert.strictEqual(s.lv('join', {code, nick: '<b>Kim</b>\u0007 '}).name, 'bKim/b');
  for (let i = 0; i < 39; i++) assert.strictEqual(s.lv('join', {code, nick: 'P' + i}).ok, true);
  assert.strictEqual(s.lv('join', {code, nick: 'Late'}).error, 'full');
  // The script lock held by a save: the join answers 'lock' (the app tries again), nothing written.
  const {code: c2} = start(s);
  s.lock.busy = true;
  assert.strictEqual(s.lv('join', {code: c2, nick: 'Max'}).error, 'lock');
  s.lock.busy = false;
  s.tick(6 * 3600e3 + 1);
  assert.strictEqual(s.lv('host', {code, tk}).error, 'gone');
  // An unknown step, and no session code: input.
  assert.strictEqual(s.lv('dance').error, 'input');
  assert.strictEqual(s.lv('poll', {code: 'abc', pid: 'x', pk: 'y'}).error, 'gone');
});

// The app's module (live.js): its gate on the script's version (rule D4) and the pure helpers its screens use.
function liveModule() {
  const src = fs.readFileSync(path.join(ROOT, 'live.js'), 'utf8'),
    ctx = {console, Math, Date, JSON};
  vm.createContext(ctx);
  const pure = /\/\/ pure: begin[\s\S]*?\/\/ pure: end/.exec(src);
  assert.ok(pure, 'live.js keeps its pure helpers between "// pure: begin" and "// pure: end"');
  vm.runInContext(
    pure[0] + '\nthis.X = {LIVEGAME_SHEET, liveCode, liveShares, liveMissed, qrMake, qrEc, qrFormat, qrLayout, qrSvg, QRV, qrMasks};',
    ctx
  );
  return ctx.X;
}

// A reader of our own, written for the test from the standard (it shares only the function-module map with the encoder):
// the format bits and the mask, the zigzag, the blocks deinterleaved, every block's syndromes checked, the text parsed.
function qrRead(X, m) {
  const n = m.length,
    v = (n - 17) / 4,
    {fn} = X.qrLayout(v);
  const bit = (r, c) => m[r][c];
  let f = 0;
  for (let i = 0; i < 6; i++) f |= bit(i, 8) << i;
  f |= bit(7, 8) << 6;
  f |= bit(8, 8) << 7;
  f |= bit(8, 7) << 8;
  for (let i = 9; i < 15; i++) f |= bit(8, 14 - i) << i;
  let g = 0;
  for (let i = 0; i < 8; i++) g |= bit(8, n - 1 - i) << i;
  for (let i = 8; i < 15; i++) g |= bit(n - 15 + i, 8) << i;
  assert.strictEqual(f, g, 'the two copies of the format bits agree');
  const mask = [0, 1, 2, 3, 4, 5, 6, 7].find(k => X.qrFormat(k) === f);
  assert.ok(mask !== undefined, 'the format bits are one of the eight');
  const bits = [];
  let up = true;
  for (let c = n - 1; c > 0; c -= 2) {
    if (c === 6) c = 5;
    for (let i = 0; i < n; i++) {
      const r = up ? n - 1 - i : i;
      for (let d = 0; d < 2; d++) if (!fn[r][c - d]) bits.push(m[r][c - d] ^ (X.qrMasks[mask](r, c - d) ? 1 : 0));
    }
    up = !up;
  }
  const cw = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) cw.push(parseInt(bits.slice(i, i + 8).join(''), 2));
  const [ec, groups] = [X.QRV[v][0], X.QRV[v][1]],
    lens = groups.flatMap(([cnt, len]) => new Array(cnt).fill(len)),
    blocks = lens.map(() => ({d: [], e: []}));
  let k = 0;
  for (let i = 0; i < Math.max(...lens); i++) lens.forEach((len, b) => i < len && blocks[b].d.push(cw[k++]));
  for (let i = 0; i < ec; i++) blocks.forEach(b => b.e.push(cw[k++]));
  // The syndromes: the block's polynomial (data then ec) is zero at α⁰ … α^(ec-1) when it is a codeword.
  const mul = (a, b) => {
    let r = 0;
    for (; b; b >>= 1, a = a & 128 ? (a << 1) ^ 0x11d : a << 1) if (b & 1) r ^= a;
    return r;
  };
  blocks.forEach(b => {
    for (let i = 0, a = 1; i < ec; i++, a = mul(a, 2)) {
      let s = 0;
      for (const x of [...b.d, ...b.e]) s = mul(s, a) ^ x;
      assert.strictEqual(s, 0, `syndrome ${i} of a block is zero`);
    }
  });
  const data = blocks.flatMap(b => b.d),
    str = data.map(x => x.toString(2).padStart(8, '0')).join('');
  assert.strictEqual(str.slice(0, 4), '0100', 'byte mode');
  const len = parseInt(str.slice(4, 12), 2);
  let out = '';
  for (let i = 0; i < len; i++) out += String.fromCharCode(parseInt(str.slice(12 + 8 * i, 20 + 8 * i), 2));
  return out;
}
test('live.js: the QR code encoder (Reed-Solomon, format bits, layout) reads back to its text', () => {
  const X = liveModule();
  // The worked example every QR tutorial uses (HELLO WORLD, version 1-M): its error-correction codewords.
  assert.deepStrictEqual(
    Array.from(X.qrEc([32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17], 10)),
    [196, 35, 39, 119, 235, 215, 231, 226, 93, 23]
  );
  // The standard's format strings for level M, the eight masks.
  const F = [
    '101010000010010',
    '101000100100101',
    '101111001111100',
    '101101101001011',
    '100010111111001',
    '100000011001110',
    '100111110010111',
    '100101010100000'
  ];
  F.forEach((s, k) => assert.strictEqual(X.qrFormat(k), parseInt(s, 2), `format bits, mask ${k}`));
  // Round trips: every version, its largest text and a short one, then the address the lobby encodes.
  const text = n => Array.from({length: n}, (_, i) => String.fromCharCode(97 + ((i * 7) % 26))).join('');
  const cases = [
    '',
    'A',
    'https://ppericard.github.io/coral-id-imr/#live?code=123456',
    text(14),
    text(26),
    text(42),
    text(62),
    text(84),
    text(106)
  ];
  const sizes = new Set();
  for (const t of cases) {
    const m = X.qrMake(t);
    assert.ok(m, `a code for ${t.length} characters`);
    sizes.add(m.length);
    assert.ok(m.every(r => r.length === m.length && r.every(x => x === 0 || x === 1)));
    assert.strictEqual(qrRead(X, m), t);
    // The three corner squares' corners and the dark module.
    assert.deepStrictEqual([m[0][0], m[0][m.length - 1], m[m.length - 1][0], m[m.length - 8][8]], [1, 1, 1, 1]);
  }
  assert.strictEqual(sizes.size, 6, 'every version 1 to 6 is used');
  assert.strictEqual(X.qrMake('x'.repeat(107)), null, 'too long (version 7 and up are not built): no code');
  assert.strictEqual(X.qrMake('€'), null, 'beyond Latin-1: no code');
  const svg = X.qrSvg(X.qrMake('abc'), 'QR');
  assert.ok(/^<svg class="qr" viewBox="0 0 29 29"/.test(svg) && svg.includes('fill="#fff"') && svg.includes('<path d="M'));
});
test('live.js: the gate is main’s script version + 1 or more; codes, shares and the most-missed questions', () => {
  const X = liveModule();
  const v = Number(/const VERSION = (\d+);/.exec(fs.readFileSync(path.join(ROOT, 'tools/sync/Code.gs'), 'utf8'))[1]);
  assert.ok(X.LIVEGAME_SHEET > 161 && X.LIVEGAME_SHEET <= v + 1, `LIVEGAME_SHEET ${X.LIVEGAME_SHEET}, VERSION ${v}`);
  assert.strictEqual(X.liveCode(' 123 456 '), '123456');
  assert.strictEqual(X.liveCode('12345'), '');
  assert.deepStrictEqual(X.liveShares([3, 1, 0, 4], 8), [38, 13, 0, 50]);
  assert.deepStrictEqual(X.liveShares([0, 0, 0, 0], 0), [0, 0, 0, 0]);
  const hist = [
    {qi: 0, t: 'Acropora', k: 1, d: [2, 6, 0, 0], n: 8, ch: ['Montipora', 'Acropora', 'Porites', 'Pocillopora']},
    {qi: 1, t: 'Favites', k: 0, d: [2, 5, 0, 1], n: 8, ch: ['Favites', 'Dipsastraea', 'Porites', 'Goniastrea']},
    {qi: 2, t: 'Porites', k: 2, d: [0, 0, 8, 0], n: 8, ch: ['Montipora', 'Acropora', 'Porites', 'Pocillopora']}
  ];
  const M = X.liveMissed(hist);
  assert.deepStrictEqual(
    M.map(m => [m.t, m.pct, m.wrong]),
    [
      ['Favites', 25, 'Dipsastraea'],
      ['Acropora', 75, 'Montipora']
    ]
  );
});

// The whole of live.js in a vm, every app global it calls stubbed (rule D1: its channel's sheetFetch answered here): the
// screens' state machines without a browser. reply(body) answers each call: an object, or a Promise (one that rejects is
// a call that never reached the script).
function liveApp(reply, extra = {}) {
  const store = {},
    calls = [],
    els = {},
    btns = [0, 1, 2, 3].map(i => ({dataset: {i: String(i)}, disabled: false, on: false, classList: {}}));
  btns.forEach(b => (b.classList.toggle = (c, on) => (b.on = !!on)));
  const ctx = {
    console,
    setTimeout: () => 0,
    clearTimeout: () => {},
    setImmediate,
    requestAnimationFrame: () => 0,
    cancelAnimationFrame: () => {},
    sessionStorage: {getItem: k => (k in store ? store[k] : null), setItem: (k, v) => (store[k] = v), removeItem: k => delete store[k]},
    SYNC_URL: 'https://script.google.com/macros/s/x/exec',
    SYNC: null,
    sheetFetch: (u, o) => {
      const body = JSON.parse(o.body);
      calls.push(body);
      return Promise.resolve(reply(body)).then(j => ({json: () => ({v: 999, ...j})}));
    },
    hashNow: () => 'live',
    $v: {querySelectorAll: s => (s === '.lvch [data-i]' ? btns : []), querySelector: () => null},
    document: {getElementById: id => els[id] || null},
    subjectOf: id => ({id}),
    subjOpen: () => true,
    ...extra
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'live.js'), 'utf8'), ctx);
  els.lvmsg = {textContent: ''};
  return {ctx, store, calls, btns, els, run: js => vm.runInContext(js, ctx)};
}
const settle = async () => {
  for (let i = 0; i < 20; i++) await new Promise(r => setImmediate(r));
};
const CH4 = [
  ['Acropora', 'Acropora'],
  ['Montipora', 'Montipora'],
  ['Porites', 'Porites'],
  ['Pocillopora', 'Pocillopora']
];
// A student's poll reply on question 0, still open.
const pollQ = mine => ({ok: true, ph: 'q', qi: 0, n: 3, lim: 20, s: 'coral', left: 8000, mine, me: {n: 'Ann', s: 0, r: 0}, hn: 0});
const onQuestion = A =>
  A.run(`LV = {code: '123456', pid: 'p1aaaaaaaa', pk: 'k', name: 'Ann', logged: [], hx: 0, pend: [], mine: {}, right: 0, key: 'q:0', s: 'coral',
    at: {qi: 0, t0: 0, c: -1, q: {ph: [], ch: ${JSON.stringify(CH4)}}, st: ''}}`);

test('live.js: an answer that never reached the script is sent again at the next poll while the question is open (Codex review #1049)', async () => {
  let down = true;
  const A = liveApp(b => (b.lv === 'answer' && down ? Promise.reject(new Error('offline')) : {ok: true, mine: b.c}));
  onQuestion(A);
  A.run('liveAnswer(0, 1)');
  await settle();
  const sent = () => A.calls.filter(b => b.lv === 'answer');
  assert.strictEqual(sent().length, 1);
  assert.ok(A.btns.every(b => b.disabled));
  // The connection is back: the poll says no answer was accepted; the same choice goes again, and is locked in.
  down = false;
  A.run(`liveShow(${JSON.stringify(pollQ(-1))})`);
  await settle();
  assert.deepStrictEqual(
    sent().map(b => [b.qi, b.c]),
    [
      [0, 1],
      [0, 1]
    ]
  );
  assert.strictEqual(A.run('LV.at.c'), 1);
  assert.ok(A.btns.every(b => b.disabled) && A.btns[1].on);
  assert.match(A.els.lvmsg.textContent, /locked in/);
  // Accepted: a later poll sends nothing more.
  A.run(`liveShow(${JSON.stringify(pollQ(1))})`);
  await settle();
  assert.strictEqual(sent().length, 2);
});

test('live.js: a lost reply is reconciled from the poll; nothing is sent again while an answer is on its way or too late', async () => {
  // The answer reached the script but its reply was lost: the poll's mine locks it in, nothing sent again.
  let A = liveApp(b => (b.lv === 'answer' ? Promise.reject(new Error('reply lost')) : {}));
  onQuestion(A);
  A.run('liveAnswer(0, 2)');
  await settle();
  A.run(`liveShow(${JSON.stringify(pollQ(2))})`);
  await settle();
  assert.strictEqual(A.calls.filter(b => b.lv === 'answer').length, 1);
  assert.match(A.els.lvmsg.textContent, /locked in/);
  // An answer still on its way: a poll that went before it says -1; it is not sent twice.
  let hold;
  A = liveApp(b => (b.lv === 'answer' ? new Promise(ok => (hold = ok)) : {}));
  onQuestion(A);
  A.run('liveAnswer(0, 0)');
  await settle();
  A.run(`liveShow(${JSON.stringify(pollQ(-1))})`);
  await settle();
  assert.strictEqual(A.calls.filter(b => b.lv === 'answer').length, 1);
  hold({ok: true, mine: 0});
  await settle();
  assert.match(A.els.lvmsg.textContent, /locked in/);
  // Refused as too late: never sent again; and a failed one is not sent once the time is up.
  A = liveApp(b => (b.lv === 'answer' ? {ok: false, error: 'phase'} : {}));
  onQuestion(A);
  A.run('liveAnswer(0, 3)');
  await settle();
  A.run(`liveShow(${JSON.stringify(pollQ(-1))})`);
  await settle();
  assert.strictEqual(A.calls.filter(b => b.lv === 'answer').length, 1);
  A = liveApp(b => (b.lv === 'answer' ? Promise.reject(new Error('offline')) : {}));
  onQuestion(A);
  A.run('liveAnswer(0, 3)');
  await settle();
  A.run(`liveShow(${JSON.stringify({...pollQ(-1), left: 0})})`);
  await settle();
  assert.strictEqual(A.calls.filter(b => b.lv === 'answer').length, 1);
});

test('live.js: an accepted answer waits, kept per tab, until it is logged; a failed subject load is tried again (Codex review #1049)', async () => {
  let fail = 1;
  const logged = [],
    A = liveApp(() => ({}), {
      SYNC: {name: 'Ann'},
      UNITS: {fish: {load: () => (fail-- > 0 ? Promise.reject(new Error('fish data not loaded')) : Promise.resolve())}}
    });
  // The logging itself (the game's scorer) is checked by tests/live.smoke.js: here, which answers reach it, once each.
  A.ctx.liveLog = (S, o) => (logged.push(o.qi), 'ok');
  onQuestion(A);
  const past = qi => ({qi, t: 'Acropora', c: 'Acropora', ch: CH4.map(c => c[0]), f: ['acropora-1']});
  const rev = (hn, p) => JSON.stringify({ok: true, ph: 'rev', qi: hn - 1, s: 'fish', hn, ...(p ? {past: p} : {})});
  A.run(`liveCatch(${rev(1, [past(0)])})`);
  await settle();
  // The fish data did not come: nothing logged, the answer still waits, saved with the hx that moved past it.
  assert.deepStrictEqual(logged, []);
  const saved = JSON.parse(A.store['reefid-live-me']);
  assert.strictEqual(saved.hx, 1);
  assert.deepStrictEqual(
    saved.pend.map(o => o.qi),
    [0]
  );
  // The next poll (no new answer in it): tried again, logged, gone from the queue.
  A.run(`liveCatch(${rev(1)})`);
  await settle();
  assert.deepStrictEqual(logged, [0]);
  assert.deepStrictEqual(JSON.parse(A.store['reefid-live-me']).pend, []);
  // Two drains at once (a poll and the end screen) log each answer once.
  A.run(`liveCatch(${rev(3, [past(1), past(2)])}); liveFlush(); liveFlush()`);
  await settle();
  assert.deepStrictEqual(logged, [0, 1, 2]);
  // Left out on purpose (a subject the player may not open): out of the queue, never logged, never tried again.
  A.ctx.subjOpen = () => false;
  A.run(`liveCatch(${rev(4, [past(3)])})`);
  await settle();
  assert.deepStrictEqual(logged, [0, 1, 2]);
  assert.strictEqual(A.run('LV.pend.length'), 0);
  // Not signed in: kept for a sign-in, nothing logged.
  A.ctx.subjOpen = () => true;
  A.ctx.SYNC = null;
  A.run(`liveCatch(${rev(5, [past(4)])})`);
  await settle();
  assert.deepStrictEqual(logged, [0, 1, 2]);
  assert.deepStrictEqual(
    JSON.parse(A.store['reefid-live-me']).pend.map(o => o.qi),
    [4]
  );
});

test('live.js: a page redrawn while an answer is being logged never logs it twice (Codex review #1049)', async () => {
  let open;
  const held = new Promise(ok => (open = ok)),
    logged = [],
    A = liveApp(() => ({}), {SYNC: {name: 'Ann'}, UNITS: {fish: {load: () => held}}});
  A.ctx.liveLog = (S, o) => (logged.push(o.qi), 'ok');
  onQuestion(A);
  const past = {qi: 0, t: 'Acropora', c: 'Acropora', ch: CH4.map(c => c[0]), f: ['acropora-1']};
  A.run(`liveCatch(${JSON.stringify({ok: true, ph: 'rev', qi: 0, s: 'fish', hn: 1, past: [past]})})`);
  await settle();
  // The route draws the live page again (viewLive: LV made again from the tab's copy) while the fish data is on its way.
  A.run(`viewLive('live')`);
  open();
  await settle();
  assert.deepStrictEqual(logged, [0]);
  assert.strictEqual(A.run('LV.pend.length'), 0);
  assert.deepStrictEqual(JSON.parse(A.store['reefid-live-me']).pend, []);
  // The next poll finds nothing left to log.
  A.run(`liveCatch(${JSON.stringify({ok: true, ph: 'rev', qi: 0, s: 'fish', hn: 1})})`);
  await settle();
  assert.deepStrictEqual(logged, [0]);
});

// The game's own recorder (quiz.js recordAnswer), run from its source in the live page's context with model.js stubbed
// and core.js's scorer for real: live.js liveLog records through it, as quiz.js answer does. calls: what it did, in order
// (the log rows as objects).
const RECSRC = block(fs.readFileSync(path.join(ROOT, 'quiz.js'), 'utf8'), 'function recordAnswer({', '\n}\n', {
  through: true,
  file: 'quiz.js'
});
function recApp(P, calls, extra = {}) {
  const C = require('../core.js'),
    zero = () => 0;
  const A = liveApp(() => ({}), {
    SYNC: {name: 'Ann'},
    P,
    SUBJ: {id: 'coral'},
    PICKD: {SINGLE: 0.5},
    inSubject: (sid, f) => f(),
    GX: n => (P[n] ? {} : null),
    introReady: () => true,
    st: n => P[n],
    // A file ending in -c is a corallites photo (view macro).
    photoLook: f => ({f, view: /-c$/.test(f) ? 'macro' : 'wide'}),
    dropPlans: () => calls.push('dropPlans'),
    mxRecalc: f => f(),
    memRecalc: () => {},
    pmem: zero,
    scoreIn: C.scoreIn,
    photoDiff: zero,
    famOf: zero,
    confTerm: zero,
    pgLook: () => false,
    startP: zero,
    fmtOff: C.fmtOff,
    pfmt: () => ({}),
    fmtOf: C.fmtOf,
    genusDiff: zero,
    scoreAnswer: C.scoreAnswer,
    scoreLog: C.scoreLog,
    contrastQ: C.contrastQ, // the duel achievement's contrast questions (a live answer is none)
    photoQuiz: cur => cur === 'quiz',
    AUTOD: false,
    varRight: (n, L) => calls.push('varRight ' + n + ' ' + L.map(p => p.f).join(' ')),
    EXAM: {n: 5},
    TYPED: {exam: 2},
    answersSoFar: zero,
    examPassed: () => false,
    mxKept: () => true,
    speciesShown: () => '',
    // core.js answerId (an answer kept without its player id); quiz.js cvField (app.js contentVer: the units in force)
    answerId: C.answerId,
    cvField: () => ({cv: 'clive1'}),
    TYPEDQ_RJ: 10,
    rankOf: () => 'genus',
    unitRankOf: () => 'genus',
    unitName: () => '',
    HOLDS: 0,
    holdStep: () => calls.push('holdStep'),
    startStep: () => calls.push('startStep'),
    comebackStep: () => calls.push('comebackStep'),
    answeredAt: () => calls.push('answeredAt'),
    logAnswer: a => calls.push(a),
    save: () => calls.push('save'),
    achAfter: (good, ph, cur) => calls.push(`achAfter ${good} ${cur}`),
    ...extra
  });
  A.run(RECSRC);
  return A;
}
const CHS = ['Acropora', 'Montipora', 'Porites', 'Pocillopora'];

test('live.js: a live miss restarts the mastery exam of the unit shown and of the one named (rule L9; Codex review #1049)', () => {
  const calls = [],
    P = {
      Acropora: {ok: 3, ko: 1, ex: {k: 2, v: []}},
      Montipora: {ok: 4, ko: 0, ex: {k: 3, v: []}},
      Porites: {ok: 2, ko: 0, ex: {k: 1, v: []}},
      Pocillopora: {ok: 1, ko: 0}
    };
  const A = recApp(P, calls),
    log = () => calls.filter(x => typeof x === 'object');
  const o = c => ({qi: 0, pid: '0a1b2c3d4e', s: 'coral', t: 'Acropora', c, ok: c === 'Acropora', ph: ['acropora-1'], chs: CHS});
  assert.strictEqual(A.ctx.liveLog({id: 'coral'}, o('Montipora')), 'ok');
  assert.ok(!('ex' in P.Acropora) && !('ex' in P.Montipora), JSON.stringify(P));
  assert.deepStrictEqual(P.Porites.ex, {k: 1, v: []});
  assert.strictEqual(log()[0].m, 'live');
  // Its attempt id is the player's and the question's (live.js liveAid), its content version the units' in force.
  assert.strictEqual(log()[0].id, 'l0a1b2c3d4eq0');
  assert.strictEqual(log()[0].cv, 'clive1');
  // An answer kept from before this field (no pid): a random attempt id.
  const {pid, ...old} = o('Porites');
  A.ctx.liveLog({id: 'coral'}, old);
  assert.match(log()[1].id, /^[a-z][a-z0-9]{15}$/);
});

test('live.js: a live answer is recorded as the photo quiz records the same answer, its mode and attempt id apart', () => {
  const state = () => ({
    Acropora: {ok: 3, ko: 1, streak: 1, vl: ['juv']},
    Montipora: {ok: 2, ko: 0, streak: 2},
    Porites: {ok: 1, ko: 1, streak: 0},
    Pocillopora: {ok: 0, ko: 1, streak: 0}
  });
  const at = '2026-11-19T02:00:00.000Z',
    ph = ['acropora-1', 'acropora-2-c'];
  for (const c of ['Acropora', 'Montipora']) {
    const P1 = state(),
      P2 = state(),
      live = [],
      quiz = [];
    const L = recApp(P1, live),
      Q = recApp(P2, quiz);
    assert.strictEqual(
      L.ctx.liveLog({id: 'coral'}, {qi: 3, pid: '0a1b2c3d4e', s: 'coral', t: 'Acropora', c, ph, chs: CHS, rt: 4.2, at}),
      'ok'
    );
    // The same question as quiz.js answer hands it over: 4 choices in the photo quiz, the corallites in view, no hint
    // left closed, no comeback, no photo of the mimicry class.
    Q.ctx.recordAnswer({
      cur: 'quiz',
      mq: 'quiz',
      target: 'Acropora',
      c,
      k: 4,
      chs: CHS,
      ph: ph.map(f => Q.ctx.photoLook(f)),
      cor: true,
      tm: {rt: 4.2},
      id: 'x',
      at
    });
    // The same record (the scorer's steps, the photos recently shown, the corallites milestone on a right answer).
    assert.deepStrictEqual(copy(P1), copy(P2), c);
    if (c === 'Acropora') assert.strictEqual(P1.Acropora.cor, 1);
    assert.deepStrictEqual(copy(P1.Acropora.ro), ['acropora-1']);
    // The same steps in the same order, and the same log row but its mode and attempt id.
    const rows = calls => calls.map(x => (typeof x === 'object' ? {...x, m: '-', id: '-'} : x.replace(/ (quiz|live)$/, ' -')));
    assert.deepStrictEqual(rows(live), rows(quiz), c);
    assert.ok(live.some(x => x.m === 'live' && x.id === 'l0a1b2c3d4eq3'));
    // What the live copy left out before: a right answer clears its variant groups and checks the achievements (with
    // cur live: never a run), a miss drops the quiz's planned questions.
    if (c === 'Acropora') assert.ok(live.includes('varRight Acropora acropora-1 acropora-2-c') && live.includes('achAfter true live'));
    else assert.ok(live.includes('dropPlans') && live.includes('achAfter false live') && !live.some(x => /^varRight/.test(x)));
    assert.ok(!live.includes('comebackStep'));
  }
});

// The duel achievement (s.du) in the game's recorder: a right 2-choice contrast, the Again included (core.js contrastQ;
// docs/LEARNING.md "One contrast queue"); never a live answer on two choices.
test('quiz.js recordAnswer: a right Again counts for the duel achievement as a right duel does', () => {
  const two = ['Acropora', 'Montipora'];
  for (const [cur, mq, c, chs, du] of [
    ['quiz', 'quiz|k2', 'Acropora', two, 1],
    ['quiz', 'quiz|d|k2', 'Acropora', two, 1],
    ['quiz-duel|Acropora|Montipora', 'quiz-duel|Acropora|Montipora', 'Acropora', two, 1],
    ['quiz', 'quiz|k2', 'Montipora', two, undefined],
    ['quiz', 'quiz', 'Acropora', CHS, undefined],
    ['live', 'live', 'Acropora', two, undefined]
  ]) {
    const P = {Acropora: {ok: 1, ko: 1}, Montipora: {ok: 1, ko: 0}, Porites: {ok: 0, ko: 0}, Pocillopora: {ok: 0, ko: 0}},
      A = recApp(P, []);
    A.ctx.recordAnswer({cur, mq, target: 'Acropora', c, k: chs.length, chs, ph: [{f: 'acropora-1', view: 'wide'}]});
    assert.strictEqual(P.Acropora.du, du, `${mq} ${c}`);
  }
});

test('live.js: a trainer whose header shows another subject resumes the saved game with its subject loaded (Codex review #1049)', async () => {
  let loaded = false;
  const A = liveApp(
    b =>
      b.lv === 'host'
        ? {ok: true, ph: 'lobby', qi: -1, n: 5, lim: 20, s: 'fish', t: 'All fish', names: ['Ann'], cnt: 0, left: 0, stand: []}
        : {},
    {
      hashNow: () => 'live-host',
      UNITS: {fish: {load: () => Promise.resolve().then(() => (loaded = true))}},
      // The game's subject switched to synchronously, its data only there once loaded (app.js inSubject).
      inSubject: (id, f) => (id === 'fish' && loaded ? f() : null),
      pick: L => L[0]
    }
  );
  A.ctx.hostShow = () => {};
  A.ctx.liveBuild = t => ({
    ph: [{f: 'f-1', u: 'img/f-1-m.webp', v: ''}],
    ch: [
      [t, t],
      ['B', 'B'],
      ['C', 'C'],
      ['D', 'D']
    ],
    k: 0
  });
  // The page reloaded on #live/host with the corals in the header: the saved fish game comes back.
  A.store['reefid-live-host'] = JSON.stringify({
    code: '123456',
    tk: 'x'.repeat(18),
    s: 'fish',
    t: 'All fish',
    n: 5,
    lim: 20,
    plan: ['Labridae', 'Pomacentridae'],
    sent: -1
  });
  A.run('liveHost()');
  await settle();
  assert.strictEqual(A.run('LH.last.ph'), 'lobby');
  A.run(`hostAct('q')`);
  await settle();
  const q = A.calls.find(b => b.lv === 'host' && b.act === 'q');
  assert.ok(q && q.q, 'the first question was built and sent');
  assert.strictEqual(q.q.ch[0][0], 'Labridae');
});
