require('./slot.js').testGuard();
// tools/analyses.js sheetPost (REE-235): the hourly run's calls to the sync script survive a connection the network
// dropped during the minutes of compute (a reset on the put: it never reached the script, and the fish report was never
// stored). Against a local fake server only, never the real sheet (rule D1): a reset on the first try then a success
// (retried once, on a connection of its own), a JSON error reply that is not retried, a reply that is not JSON, the
// cause of a failure in the log, and no connection left idle for the next call.
const test = require('node:test'),
  assert = require('node:assert'),
  http = require('http'),
  fs = require('fs'),
  path = require('path');
const A = require('../analysis.js');
const {sheetPost, sheetRun} = require('../tools/analyses.js');

// A fake sync script: route(body, req, res, n) answers each request (n: its number, from 1); res.reset() drops the
// connection with a reset, as a network that forgot it does. Returns {url, seen: [bodies], close}.
async function fake(route) {
  const seen = [],
    srv = http.createServer((req, res) => {
      let raw = '';
      req.on('data', d => (raw += d));
      req.on('end', () => {
        const body = JSON.parse(raw);
        seen.push(body);
        res.reset = () => req.socket.resetAndDestroy();
        res.json = o => {
          const t = JSON.stringify(o);
          res.writeHead(200, {'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(t)});
          res.end(t);
        };
        route(body, req, res, seen.length);
      });
    });
  srv.keepAliveTimeout = 60000;
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  return {
    url: `http://127.0.0.1:${srv.address().port}/exec`,
    seen,
    close: () => new Promise(r => (srv.closeAllConnections(), srv.close(r)))
  };
}

test('sheetPost: a reset on the first try is retried once and the second try answers', async () => {
  const s = await fake((b, req, res, n) => (n === 1 ? res.reset() : res.json({ok: true, n})));
  try {
    const r = await sheetPost(s.url, {analysesPut: 1, report: 'x'}, {wait: 5});
    assert.deepStrictEqual(r, {ok: true, n: 2});
    assert.strictEqual(s.seen.length, 2, 'the put was sent twice (it replaces the whole report: safe)');
    assert.deepStrictEqual(s.seen[1], s.seen[0], 'the same body');
  } finally {
    await s.close();
  }
});

test('sheetPost: a reset on both tries returns an error that names the cause', async () => {
  const s = await fake((b, req, res) => res.reset());
  try {
    const r = await sheetPost(s.url, {analysesPut: 1}, {wait: 5});
    assert.strictEqual(s.seen.length, 2, 'one retry, no more');
    assert.strictEqual(r.ok, undefined);
    assert.match(r.error, /^no reply, network: (ECONNRESET|UND_ERR_SOCKET|other side closed)/, r.error);
  } finally {
    await s.close();
  }
});

test('sheetPost: the cause is the error code, else its message', async () => {
  const mk = e => async () => {
    throw e;
  };
  const code = await sheetPost(
    'http://x/',
    {},
    {wait: 0, fetch: mk(Object.assign(new TypeError('fetch failed'), {cause: {code: 'ETIMEDOUT'}}))}
  );
  assert.strictEqual(code.error, 'no reply, network: ETIMEDOUT, after a second try');
  const plain = await sheetPost('http://x/', {}, {wait: 0, fetch: mk(new Error('boom'))});
  assert.strictEqual(plain.error, 'no reply, network: boom, after a second try');
});

test('sheetPost: an error reply of the script is not retried', async () => {
  const s = await fake((b, req, res) => res.json({ok: false, error: 'token'}));
  try {
    assert.deepStrictEqual(await sheetPost(s.url, {analysesPut: 1}, {wait: 5}), {ok: false, error: 'token'});
    assert.strictEqual(s.seen.length, 1);
  } finally {
    await s.close();
  }
});

test('sheetPost: a reply that is not JSON is not retried', async () => {
  const s = await fake((b, req, res) => {
    res.writeHead(500, {'Content-Type': 'text/html'});
    res.end('<html>Error</html>');
  });
  try {
    const r = await sheetPost(s.url, {analysesPut: 1}, {wait: 5});
    assert.strictEqual(r.error, 'reply is not JSON (HTTP 500)');
    assert.strictEqual(s.seen.length, 1);
  } finally {
    await s.close();
  }
});

test('sheetPost: no connection is kept for the next call (a network that forgets idle ones cannot reset it)', async () => {
  // a connection that carries a second request is reset, as the runner's network does for one idle too long
  const used = new Set(),
    heads = [],
    s = await fake((b, req, res) => {
      heads.push(req.headers.connection);
      if (used.has(req.socket)) return res.reset();
      used.add(req.socket);
      res.json({ok: true});
    });
  try {
    assert.deepStrictEqual(await sheetPost(s.url, {analysesGet: 1}, {wait: 5}), {ok: true});
    await new Promise(r => setTimeout(r, 50));
    assert.deepStrictEqual(await sheetPost(s.url, {analysesPut: 1}, {wait: 5}), {ok: true});
    assert.deepStrictEqual(heads, ['close', 'close']);
    assert.strictEqual(s.seen.length, 2, 'two requests, none retried');
  } finally {
    await s.close();
  }
});

// A sheet answering the hourly run's three calls from a made-up log (the corals), the put as `put` says.
async function run(put) {
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data.json'))),
    rows = A.demoLog(data, Date.UTC(2026, 10, 1), {
      days: 300,
      players: A.DEMO_PLAYERS.slice(0, 3).map(p => [p[0], p[1], 450, p[3]])
    }).map(r => ['id' + r[0].length, ...r.slice(1)]);
  let puts = 0;
  const s = await fake((b, req, res) => {
    if (b.analysesGet) return res.json({ok: true, answers: rows.length, stored: null, stale: false});
    if (b.readAnswers) return res.json({ok: true, rows});
    if (b.analysesPut) return put(b, req, res, ++puts);
    res.json({ok: false, error: 'input'});
  });
  const logs = [];
  try {
    const out = await sheetRun({post: b => sheetPost(s.url, b, {wait: 5}), log: t => logs.push(t)}, 'tok', {B: 0});
    return {out, logs, puts, seen: s.seen};
  } finally {
    await s.close();
  }
}

test('sheetRun: a put reset once is stored by the retry', async () => {
  const r = await run((b, req, res, n) => (n === 1 ? res.reset() : res.json({ok: true, stored: {}})));
  assert.strictEqual(r.out, 'stored', r.logs.join('\n'));
  assert.strictEqual(r.puts, 2);
});

test('sheetRun: a put the network always resets is refused with its cause in the log', async () => {
  const r = await run((b, req, res) => res.reset());
  assert.strictEqual(r.out, 'refused');
  assert.strictEqual(r.puts, 2);
  assert.match(r.logs[r.logs.length - 1], /^The sheet did not store the report \(no reply, network: \w+, after a second try\)\.$/);
});

test('sheetRun: a put the script refuses by name is not retried', async () => {
  const r = await run((b, req, res) => res.json({ok: false, error: 'size'}));
  assert.strictEqual(r.out, 'refused');
  assert.strictEqual(r.puts, 1);
  assert.strictEqual(r.logs[r.logs.length - 1], 'The sheet did not store the report (size).');
});
