// Response time, genus and photo (2026-11-04, docs/LEARNING.md "Response time: genus and photo"): the inputs of
// tools/rtdecomp.py from the sheet's answer log, and the photo Elo replayed with the time as a weak signal on the photo's
// step. Offline and read-only: reads a file, writes one file, sends nothing (the app page it opens is served from this
// folder, every other request is aborted, and the app itself never reaches the sheet from a local copy: rule D1).
//
//   node tools/rtprep.js answers.json out.json        (CHROME=/path/to/chrome to use an installed browser)
//
// answers.json: the sheet's Answers tab, read-only export ({values: [[Name, Time, Genus shown, Answered, Right, Mode,
// Photos, Id, Expected, Ability, New photos, Choices, Seconds, Enlarged], ...]}, the sheet clock Asia/Taipei).
// out.json (keep it outside the repo: it holds the players' names): the rows in time order, as core.js rows plus Seconds
// and Enlarged; the photo ratings and pooled confusions (core.js eloOf, confusionOf: what ?stats=1 would serve) on the
// whole log, with each timed player (20 timed answers or more) left out and with each pair of them left out; and, for each of those stats, the app's own
// genusDiff and photoDiff (model.js), evaluated in the real app page.
// Printed: the photo Elo (core.js eloReplay, as Code.gs stats_) replayed with a right answer's photo step weighted by
// its speed, w = clamp(1 - k z, 0.5, 1.5), z = log(seconds) minus the median of the player's earlier timed answers
// (from their 11th; typed and enlarged answers: w 1), or with an additive time step; each answer scored before it
// updates anything; paired log-loss difference against the sheet's rule.
const fs = require('fs'),
  path = require('path'),
  http = require('http');
const ROOT = path.join(__dirname, '..');
const C = require(path.join(ROOT, 'core.js'));
const [, , SRC, OUT] = process.argv;
if (!SRC || !OUT) {
  console.error('usage: node tools/rtprep.js answers.json out.json');
  process.exit(1);
}
const raw = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const vals = C.subjRows((raw.values || raw).filter(r => r && r[0] && r[0] !== 'Name')); // the corals' (sheet v60 Subject)
const ms = s => Date.parse(String(s).trim().replace(' ', 'T') + ':00+08:00');
// core rows [name, ms, shown, answered, right, mode, photos, expected, ability, new photos, choices] + [seconds, enlarged];
// the tab's order is not the time order (offline devices upload late): sorted by time, stable.
const rows = vals
  .map((r, i) => ({r, i, t: ms(r[1])}))
  .sort((a, b) => a.t - b.t || a.i - b.i)
  .map(({r, t}) => [
    String(r[0]).toLowerCase(),
    t,
    r[2],
    r[3],
    Number(r[4]) ? 1 : 0,
    String(r[5]),
    String(r[6] || ''),
    r[8],
    r[9],
    r[10],
    String(r[11] || ''),
    r[12] === undefined ? '' : r[12],
    r[13] === undefined ? '' : r[13]
  ]);
const timed = {};
rows.forEach(r => r[11] !== '' && (timed[r[0]] = (timed[r[0]] || 0) + 1));
const PLAYERS = Object.keys(timed)
  .filter(p => timed[p] >= 20)
  .sort((a, b) => timed[b] - timed[a]);
// gd: the genus offsets (core.js genusOffsetsOf, the sheet's ?stats=1 gd), the app's genus difficulty since 2026-11-06 (Q133).
const statsOf = rs => ({photos: C.eloOf(rs), conf: C.confusionOf(rs).pair, mem: C.photoMemOf(rs).mem, gd: C.genusOffsetsOf(rs)});

// ---- the photo Elo with time on the photo's step (a copy of core.js eloReplay with the time hook) ----
const sig = x => 1 / (1 + Math.exp(-x));
const memFam = (hs, mem) => (hs.length ? hs.reduce((t, h) => t + mem[C.memBucket(h)], 0) / hs.length : 0);
const infoAt = (x, k) => {
  const s = sig(x),
    p = 1 / k + (1 - 1 / k) * s;
  return ((1 - 1 / k) * s * (1 - s)) ** 2 / (p * (1 - p));
};
const trust = C.trustOf(rows);
function photoReplay(rule) {
  const P = {},
    R = {},
    H = {},
    TZ = {},
    mem = C.MEM.PRIOR.slice(),
    I = [0, 0, 0, 0],
    tau = C.MEM.N * infoAt(1, 4),
    out = [];
  rows.forEach(r => {
    const fs = r[6].split(/\s+/).filter(Boolean);
    if (!r[0] || !fs.length) return;
    const ok = r[4],
      g = C.guessOf(r[5], r[10]),
      ra = (R[r[0]] = R[r[0]] || [-1, 0]),
      ph = fs.map(f => (P[f] = P[f] || [0, 0, 0, 0, 0])),
      b = ph.reduce((t, p) => t + p[0], 0) / ph.length + (ph.length === 1 ? 0.5 : 0),
      hs = fs.map(f => (H[r[0] + '|' + f] = H[r[0] + '|' + f] || [0, 0])),
      s = sig(ra[0] - b - memFam(hs, mem)),
      e = g + (1 - g) * s,
      d = ok - e,
      n = ra[1];
    const tz = (TZ[r[0]] = TZ[r[0]] || {L: [], ok: [0, 0], ko: [0, 0]}),
      isT = r[11] !== '' && !C.TYPED_RE.test(r[5]) && String(r[12]) !== '1';
    let z = null;
    if (isT && tz.L.length >= 10) {
      const L = tz.L.slice().sort((x, y) => x - y);
      // the median as tools/abilityeval.js median(): the two middle values averaged for an even count (Codex review #443)
      z = Math.log(Math.max(0.5, Number(r[11]))) - (L.length % 2 ? L[(L.length - 1) / 2] : (L[L.length / 2 - 1] + L[L.length / 2]) / 2);
    }
    out.push({y: ok, e: Math.min(1 - 1e-6, Math.max(1e-6, e)), tr: !!trust[r[0]], prevT: ph.some(p => p[4] > 0)});
    if (trust[r[0]]) {
      const w = n / (n + 10),
        D = (1 - g) * s * (1 - s),
        v = Math.max(1e-6, e * (1 - e)),
        A = [0, 0, 0, 0];
      let tw = 1,
        add = 0;
      if (z !== null) {
        if (rule.k && (ok || rule.miss)) tw = Math.min(1.5, Math.max(0.5, 1 - rule.k * z));
        const m = ok ? tz.ok : tz.ko;
        if (rule.add) add = rule.add * (z - (m[1] ? m[0] / m[1] : 0));
      }
      ph.forEach(p => {
        const K = 0.8 / (1 + p[2] / 10) / ph.length;
        p[0] += K * w * (add - d * tw);
        p[2] += w;
        p[1] += ok * w;
        p[3]++;
        if (z !== null) p[4]++;
      });
      hs.forEach(h => (A[C.memBucket(h)] += 1 / hs.length));
      for (let j = 1; j < 4; j++)
        if (A[j]) {
          I[j] += (w * (D * A[j]) ** 2) / v;
          mem[j] -= (w * d * D * A[j]) / v / (tau + I[j]);
        }
    }
    ra[0] += (0.6 / (1 + n / 40)) * d;
    ra[1]++;
    hs.forEach(h => (h[0]++, (h[1] += ok)));
    if (isT) {
      tz.L.push(Math.log(Math.max(0.5, Number(r[11]))));
      if (z !== null) {
        const m = ok ? tz.ok : tz.ko;
        m[0] += z;
        m[1]++;
      }
    }
  });
  out.P = P;
  return out;
}
const ll = o => -(o.y ? Math.log(o.e) : Math.log(1 - o.e));
const base = photoReplay({}),
  E = C.eloOf(rows),
  drift = Math.max(...Object.keys(E).map(f => Math.abs(E[f][0] - base.P[f][0])));
console.log(`Photo Elo with time on the photo's step (the copy of eloReplay agrees with core.js eloOf within ${drift.toFixed(3)})`);
const SEL = {'trusted answers': o => o.tr, 'a photo timed before': o => o.tr && o.prevT};
console.log(
  '  sheet rule: ' +
    Object.entries(SEL)
      .map(([k, f]) => {
        const L = base.filter(f);
        return `${k} log-loss ${(L.reduce((t, o) => t + ll(o), 0) / L.length).toFixed(4)} (${L.length})`;
      })
      .join('; ')
);
const RULES = {
  'k 0.25': {k: 0.25},
  'k 0.5': {k: 0.5},
  'k 1': {k: 1},
  'k 2': {k: 2},
  'k 1, misses too': {k: 1, miss: 1},
  'add 0.25': {add: 0.25},
  'add 0.5': {add: 0.5},
  'add 1': {add: 1}
};
for (const [name, rule] of Object.entries(RULES)) {
  const R = photoReplay(rule);
  const cells = Object.entries(SEL).map(([k, f]) => {
    const dd = R.map((o, i) => [o, ll(o) - ll(base[i])])
      .filter(([o]) => f(o))
      .map(x => x[1]);
    const m = dd.reduce((a, x) => a + x, 0) / dd.length,
      sd = Math.sqrt(dd.reduce((a, x) => a + (x - m) ** 2, 0) / (dd.length - 1));
    return `${k} ${(1e3 * m).toFixed(2)} ± ${((1e3 * sd) / Math.sqrt(dd.length)).toFixed(2)}`;
  });
  console.log(`  ${name.padEnd(16)} log-loss difference x 1e-3: ${cells.join('; ')}`);
}

// ---- genusDiff and photoDiff as the app computes them, for each set of stats ----
const sets = {all: statsOf(rows)};
PLAYERS.forEach(p => (sets['-' + p] = statsOf(rows.filter(r => r[0] !== p))));
// Every pair left out too ('-p-q', p before q in PLAYERS): when player p is held out, the training rows of player q get
// their features from the answers of neither (Codex review #443: else q's features hold p's outcomes).
PLAYERS.forEach((p, i) =>
  PLAYERS.slice(i + 1).forEach(q => (sets['-' + p + '-' + q] = statsOf(rows.filter(r => r[0] !== p && r[0] !== q))))
);
const TYPES = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml'};
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname),
    f = path.join(ROOT, u.endsWith('/') ? u + 'index.html' : u);
  if (!f.startsWith(ROOT)) return (res.writeHead(403), res.end());
  fs.readFile(f, (e, b) => {
    if (e) return (res.writeHead(404), res.end());
    res.writeHead(200, {'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream'});
    res.end(b);
  });
});
(async () => {
  const {chromium} = require('playwright');
  await require('../tests/slot.js')('tools/rtprep.js'); // one Playwright run per 2 cores on this machine (tests/slot.js)
  await new Promise(ok => server.listen(0, '127.0.0.1', ok));
  const site = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch(process.env.CHROME ? {executablePath: process.env.CHROME} : {});
  const out = {players: PLAYERS, rows, sets: {}};
  for (const [k, st] of Object.entries(sets)) {
    const ctx = await browser.newContext({serviceWorkers: 'block'});
    await ctx.route(
      u => !u.href.startsWith(site),
      r => r.abort()
    );
    await ctx.addInitScript(st => {
      localStorage.setItem('reefid-tour', '"done"');
      localStorage.setItem('reefid-photo-stats', JSON.stringify({t: Date.now(), v: 1000, photos: st.photos, conf: st.conf, mem: st.mem, gd: st.gd}));
    }, st);
    const page = await ctx.newPage();
    page.on('pageerror', e => console.error('page error:', e.message));
    await page.goto(site);
    await page.waitForFunction(() => window.APP_READY, null, {timeout: 60000});
    const r = await page.evaluate(() => {
      const gd = {},
        pd = {},
        cf = {};
      [...new Set([...slateGenera(), ...BONUS])]
        .filter(n => GX(n))
        .forEach(n => {
          gd[n] = genusDiff(n);
          // the two highest pooled confusion scores (genusDiff's confusion part until 2026-11-06, Q133; 0 since: openconf)
          const cs = slateGenera()
            .filter(x => x !== n)
            .map(x => pooledConf(n, x))
            .sort((a, b) => b - a)
            .slice(0, 2);
          cf[n] = cs.length ? cs.reduce((a, x) => a + x, 0) / cs.length : 0;
          VIEWS.forEach(([v]) => gamePics(n, v).forEach(ph => (pd[ph.f] = photoDiff(n, ph))));
        });
      return {gd, pd, cf, conftrap: CONF.TRAP, openconf: 0};
    });
    out.sets[k] = {...r, photos: st.photos};
    await ctx.close();
  }
  await browser.close();
  server.close();
  fs.writeFileSync(OUT, JSON.stringify(out));
  console.log(`${OUT}: ${rows.length} answers, ${PLAYERS.length} timed players, ${Object.keys(sets).length} sets of stats`);
})();
