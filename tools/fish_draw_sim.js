// The fish draw's easy share, simulated in the real app (Pierre, 2026-11-06 15:33, Q186: the draw keeps favouring the
// easy photos strongly whatever the pool size; at the start at most about 1/3 of the photos under ease 4, well under on
// average; the hard photos still drawn as the player's level rises, so they get rated). For each entry and each stage of
// a player's level on it (P[n]: none yet, then answers and an ability), model.js photoSet is drawn DRAWS times on a new
// fish player and the share of the photos shown under ease 4 (judged, fish-photos.json e; unjudged count as 3) printed.
// Usage: node tools/fish_draw_sim.js [--photos FILE] [--calib '{"u":0.25,"pool":20}'] [--entries t01,t02] [--draws 600]
//   [--stages '[["label", {P[n] fields}], ...]']
//   --photos  a fish-photos.json to serve instead of the repository's (e.g. a branch's with more photos)
//   --calib   fields merged over the fish calibration (core.js SUBJECTS calib) before drawing
// Needs Playwright (like the smokes); takes the machine slot (rule W24).
const http = require('http'),
  fs = require('fs'),
  path = require('path');
const {chromium} = require('../tests/calm.js');
const slot = require('../tests/slot.js');
const ROOT = path.join(__dirname, '..');
const arg = (k, d) => {
  const i = process.argv.indexOf('--' + k);
  return i > 0 ? process.argv[i + 1] : d;
};
const PHOTOS = arg('photos'),
  CALIB = JSON.parse(arg('calib', '{}')),
  ENTRIES = arg('entries', 't01,t02,t03,t06,t08,t09,t13,t24').split(','),
  DRAWS = +arg('draws', 600);
// A player's level on an entry: answers right and wrong, and the ability its Elo would hold (ability(n), core.js ELO).
const STAGES = arg('stages') ? JSON.parse(arg('stages')) : [
  ['new', {}],
  ['10 answers, ability 0.5', {ok: 8, ko: 2, th: 0.5}],
  ['25 answers, ability 1.2', {ok: 21, ko: 4, th: 1.2}],
  ['60 answers, ability 2', {ok: 52, ko: 8, th: 2}],
  ['120 answers, ability 2.8', {ok: 108, ko: 12, th: 2.8}]
];
const TYPES = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml'};
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname),
    f = PHOTOS && u === '/fish-photos.json' ? path.resolve(PHOTOS) : path.join(ROOT, u.endsWith('/') ? u + 'index.html' : u);
  if (!f.startsWith(ROOT) && f !== path.resolve(PHOTOS || '')) return (res.writeHead(403), res.end());
  fs.readFile(f, (e, b) => {
    if (e) return (res.writeHead(404), res.end());
    res.writeHead(200, {'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream'});
    res.end(b);
  });
});

(async () => {
  await slot('fish_draw_sim');
  await new Promise(ok => server.listen(0, '127.0.0.1', ok));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const b = await chromium.launch();
  const ctx = await b.newContext({viewport: {width: 1280, height: 800}, serviceWorkers: 'block'});
  await ctx.route(
    u => !u.href.startsWith(base),
    r => r.abort()
  );
  await ctx.addInitScript(() => {
    localStorage.setItem('reefid-tour', '"done"');
    localStorage.setItem('reefid-admin-vault', 'sim'); // the fish beta is the admin's only
    localStorage.setItem('reefid-sync-subject', '"fish"');
    localStorage.setItem('reefid-sync-fish-start', '{"c":"new","t":1}');
    let s = 4242;
    Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647;
  });
  const p = await ctx.newPage();
  await p.goto(base + '#practice/quiz');
  await p.waitForFunction(() => window.APP_READY && typeof FISH === 'object' && FISH && SUBJ.id === 'fish', null, {timeout: 60000});
  const out = await p.evaluate(
    ({ENTRIES, STAGES, DRAWS, CALIB}) => {
      Object.assign((SUBJ.calib = {...(SUBJ.calib || {})}), CALIB);
      const rows = [];
      ENTRIES.forEach(n => {
        if (!GX(n)) return;
        const L = GX(n).views.wide,
          keep = P[n];
        const row = {n, name: GX(n).name, photos: L.length, under: L.filter(x => (x.e || 3) < 4).length, at: []};
        STAGES.forEach(([, st]) => {
          P[n] = JSON.parse(JSON.stringify(st));
          let u = 0,
            k = 0;
          const seen = new Set();
          for (let i = 0; i < DRAWS; i++)
            (photoSet(n).shown || []).forEach(s => {
              k++;
              seen.add(s.f);
              if ((s.e || 3) < 4) u++;
            });
          row.at.push([u / Math.max(1, k), seen.size]);
        });
        P[n] = keep;
        rows.push(row);
      });
      return {calib: SUBJ.calib, rows};
    },
    {ENTRIES, STAGES, DRAWS, CALIB}
  );
  await b.close();
  server.close();
  console.log(`fish calib ${JSON.stringify(out.calib)}; photos ${PHOTOS || 'fish-photos.json'}; ${DRAWS} draws a stage`);
  console.log('share of photos under ease 4 (distinct photos shown) per stage: ' + STAGES.map(s => s[0]).join(' | '));
  out.rows.forEach(r =>
    console.log(
      `${r.n} ${r.name.slice(0, 24).padEnd(24)} ${String(r.photos).padStart(4)} photos (${r.under} under 4): ` +
        r.at.map(([s, d]) => `${(100 * s).toFixed(0).padStart(3)}% (${d})`).join(' | ')
    )
  );
  const start = out.rows.map(r => r.at[0][0]);
  console.log(
    `start: worst ${(100 * Math.max(...start)).toFixed(0)}%, mean ${((100 * start.reduce((a, x) => a + x, 0)) / start.length).toFixed(0)}%`
  );
})().catch(e => {
  console.error(e);
  process.exit(1);
});
