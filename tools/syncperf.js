// Bytes and round trips per answer of the progress sync, before and after the lighter saves (sync.js LIGHT_SHEET;
// docs/ROADMAP.md "Lighter saves on slow lines"), and what that costs on the slow lines of tools/perf.js. Not run by CI;
// the numbers are for reading (the PR quotes them). Locally: node tools/syncperf.js [answers]
// The app's own sync.js runs in Node against the sync script on an in-memory sheet (tests/syncpage.js), so every request
// is the one the app sends and every reply the one the script gives; nothing leaves this process (rule D1). A signed-in
// RA with a long history (1,500 answers over the slate, replayed by core.js into a realistic progress record, the same
// rows in the Answers tab) answers question after question, one save after each (syncPush, as 3 s after an answer):
// - one device: the RA alone on their phone;
// - two devices: every save comes after the other device's (the worst case: each one stale).
// Before = the replies say the script version before LIGHT_SHEET (the classic sync: a load, then the whole data), after =
// from it. Per answer: requests, HTTP round trips (an Apps Script call is two: the request to script.google.com, then
// its 302 to script.googleusercontent.com, where the reply is read; connections kept open), bytes up (URL and body, plus
// HDR for each HTTP request's headers: an estimate) and down (the reply's JSON, raw and gzipped: Google's front end
// gzips text replies to a browser that asks, which it does; not measured here), and the time on each line: round trips x
// latency + bytes / bandwidth, the Apps Script's own time left out (the same before and after, seconds per call).
const zlib = require('zlib');
const C = require('../core.js');
const {page, LIGHT, DATA, withData, loadCodeGs} = require('../tests/syncpage.js');

const N = Number(process.argv[2]) || 30,
  HDR = {up: 500, down: 400}, // an HTTP request's and reply's headers, bytes (estimate)
  // tools/perf.js NET and FIELD: bandwidth in bits/s each way (d, u), latency in ms; the field link shares its 86 kbit/s.
  LINES = {
    'field (86 kbit/s, 400 ms)': {d: 86e3, u: 86e3, l: 400},
    'slow 3G (400 kbit/s, 400 ms)': {d: 0.4e6, u: 0.4e6, l: 400},
    '3G (1.6 Mbit/s down, 750 kbit/s up, 150 ms)': {d: 1.6e6, u: 0.75e6, l: 150}
  };
const gen = {...((DATA.x && DATA.x.gen) || {}), ...(DATA.gen || {})},
  G = Object.keys(DATA.gen);
let seed = 3;
const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const photos = g => Object.values(gen[g].views || {})
  .flat()
  .map(p => p.f);
let clock = Date.UTC(2026, 10, 1);
// One answer as quiz.js logs it: a photo quiz question, two photos, four choices, its difficulty and time.
const answer = i => {
  const g = G[Math.floor(rnd() * Math.min(G.length, 5 + i / 30))],
    ok = rnd() < 0.7,
    P = photos(g),
    a = ok ? g : G[Math.floor(rnd() * G.length)];
  clock += 8000;
  return {
    id: 'q' + i.toString(36) + Math.floor(rnd() * 1e9).toString(36),
    t: new Date(clock).toISOString(),
    g,
    a,
    ok: ok ? 1 : 0,
    m: 'quiz',
    ph: P[Math.floor(rnd() * P.length)] + ' ' + P[Math.floor(rnd() * P.length)],
    e: Math.round((0.6 + rnd() * 0.3) * 1000) / 1000,
    th: 1,
    nw: 1,
    ch: [g, a, ...G.slice(0, 2)].join(' '),
    rt: Math.round((3 + rnd() * 10) * 10) / 10,
    tz: 480
  };
};
// The progress after one more answer, as the game moves it (core.js replayProgress on top of the record).
const step = (P, a) => C.replayProgress([C.logRow(a, 'me')], {gen, start: {me: {P, n: 0, used: 0, rep: 0}}}).me.P;
const HIST = Array.from({length: 1500}, (_, i) => answer(i)),
  P0 = C.replayProgress(
    HIST.map(a => C.logRow(a, 'me')),
    {gen}
  ).me.P;

// The account saved with that history (its rules version applied: no replay in the way), and a device holding it.
function setup(devices, v) {
  const s = loadCodeGs(withData()),
    data = {'reefid-sync-coral-progress': JSON.stringify(P0), 'reefid-sync-coral-rv': JSON.stringify(C.RV)};
  for (let i = 0; i < HIST.length; i += 500)
    s.post({name: 'Ana', pin: '1234', data: C.withLegacy(data), summary: {}, answers: HIST.slice(i, i + 500), rv: C.RV, av: 'x'});
  const D = Array.from({length: devices}, () =>
    page(s, {
      v,
      P: JSON.parse(JSON.stringify(P0)),
      SYNC: {name: 'Ana', pin: '1234', log: [], base: JSON.parse(JSON.stringify(P0))},
      ls: {'reefid-sync-coral-progress': JSON.stringify(P0), 'reefid-sync-coral-rv': JSON.stringify(C.RV)}
    })
  );
  return {s, D};
}
const play = (d, a) => {
  d.ctx.P = step(d.ctx.P, a);
  d.store.set('reefid-sync-coral-progress', d.ctx.P);
  d.ctx.SYNC.log = [...(d.ctx.SYNC.log || []), a];
  d.ctx.SYNC.dirty = true;
};
// Each request's numbers: HTTP round trips, bytes up, bytes down raw and gzipped.
const cost = r => ({rt: 2, up: r.up + 2 * HDR.up, down: (r.down || 0) + 2 * HDR.down, downz: zlib.gzipSync(JSON.stringify(r.reply || {})).length + 2 * HDR.down});
async function run(devices, v) {
  const {D} = setup(devices, v);
  for (const d of D) await d.syncPush(); // each page's first sync (a load, then a save): not counted
  const from = D.map(d => d.reqs.length);
  let i = 0;
  for (; i < N; i++) {
    const d = D[i % devices];
    play(d, answer(2000 + i));
    await d.syncPush();
  }
  const R = D.flatMap((d, k) => d.reqs.slice(from[k])).map(cost),
    sum = f => R.reduce((t, x) => t + x[f], 0) / N;
  return {req: R.length / N, rt: sum('rt'), up: sum('up'), down: sum('down'), downz: sum('downz')};
}
const secs = (m, L, z) => (m.rt * L.l) / 1000 + (8 * m.up) / L.u + (8 * (z ? m.downz : m.down)) / L.d;
(async () => {
  const kb = x => (x / 1000).toFixed(1).padStart(6) + ' KB';
  console.log(`A record of ${HIST.length} answers: progress ${(JSON.stringify(P0).length / 1000).toFixed(1)} KB, ${Object.keys(P0).length} records; ${N} answers each run.\n`);
  for (const devices of [1, 2]) {
    const before = await run(devices, LIGHT - 1),
      after = await run(devices, LIGHT);
    console.log(devices === 1 ? 'One device' : 'Two devices, each save after the other’s (all stale)');
    console.log('                         requests  round trips       up    down raw   down gzip');
    for (const [k, m] of [
      ['before', before],
      ['after', after]
    ])
      console.log(`  ${k.padEnd(22)}${m.req.toFixed(2).padStart(8)}${m.rt.toFixed(1).padStart(13)}${kb(m.up)}${kb(m.down)}${kb(m.downz)}`);
    console.log('  seconds on the line per answer (round trips x latency + bytes / bandwidth; replies gzipped, raw):');
    for (const [name, L] of Object.entries(LINES))
      console.log(
        `    ${name.padEnd(46)} before ${secs(before, L, true).toFixed(1).padStart(5)} (${secs(before, L, false).toFixed(1)})   after ${secs(after, L, true).toFixed(1).padStart(5)} (${secs(after, L, false).toFixed(1)})`
      );
    console.log('');
  }
})();
