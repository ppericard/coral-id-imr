// REE-241 (Q457) study: the opening order a fresh player meets, with the judged ease centred per family (the change)
// against the app before it (main). Read-only: nothing in the app or the tests changes; nothing reaches the sheet.
//
//   node tools/studies/ree241/openorder.js --root DIR --subject fish|seaslug [--stats stats.json] [--seqs 2000]
//                                          [--out file.json]
//
// --root DIR: the app served from DIR (a checkout of one arm). --stats: the sheet's ?stats=1&s=<subject> reply saved to a
// file (read once by hand, read-only: tools/learnsim.js "--stats"), so the units' offsets (gd) are the real ones; without
// it every offset is 0 (as in CI) and the judged ease is the only order the app has. Inside the app's own page (model.js,
// app.js as they are), for the subject's base units (slateGenera: the fish families, the sea slug genera):
//   - each unit's difficulty (genusDiff) and its family (model.js easeTop where the arm has it, else its parent);
//   - the opening sequence of a fresh player ("I'm new": no IMR filter): openPick drawn again and again on the units not
//     met yet, each drawn unit then met (introAdd is not called: the draw alone, the pace and the timing aside), --seqs
//     sequences from a fixed seed; per unit its mean rank and its chance to be in the first 8 and 16 openings, the
//     starter core first as the app has it.
// The measures the PR reads are in docs/LEARNING.md "The judged ease, within a family".
// Takes the machine slot (tests/slot.js, rule W24).
'use strict';
const http = require('http'),
  fs = require('fs'),
  path = require('path');
const {chromium} = require('playwright');
const {memStorage} = require('../../memstorage.js');

const arg = (k, d) => {
  const i = process.argv.indexOf(k);
  return i > 0 ? process.argv[i + 1] : d;
};
const ROOT = path.resolve(arg('--root', path.join(__dirname, '..', '..', '..'))),
  SUBJECT = arg('--subject', 'fish'),
  STATS = arg('--stats', null) ? JSON.parse(fs.readFileSync(arg('--stats'), 'utf8')) : null,
  SEQS = +arg('--seqs', 2000),
  OUT = arg('--out', null);

const TYPES = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml'};
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname),
    f = path.join(ROOT, u.endsWith('/') ? u + 'index.html' : u);
  if (!f.startsWith(ROOT)) return res.writeHead(403), res.end();
  fs.readFile(f, (e, b) => {
    if (e) return res.writeHead(404), res.end();
    res.writeHead(200, {'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream'});
    res.end(b);
  });
});

// In the page: the units, their difficulty and the opening sequences.
function measure({seqs}) {
  // A fixed seed for the draws (wpick reads Math.random): mulberry32.
  let s = 12345;
  Math.random = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const L = slateGenera().filter(n => !closed(n)),
    top = typeof easeTop === 'function' ? easeTop : n => (GX(n) || {}).parent || n,
    mid = typeof easeMid === 'function' ? easeMid : () => PDIFF.MID,
    units = {};
  GDIFF = {};
  L.forEach(n => {
    const je = [...new Set([...VIEWS.flatMap(([v]) => gamePics(n, v)), ...heldOf(GX(n))])].filter(p => p.e);
    units[n] = {
      name: (GX(n) || {}).name || n,
      fam: top(n),
      first: !!(GX(n) || {}).first,
      circle: (GX(n) || {}).circle || 0,
      cm: (GX(n) || {}).cm,
      off: (PGD[n] || [0])[0] || 0,
      judged: je.length,
      ease: je.length ? +(je.reduce((t, p) => t + p.e, 0) / je.length).toFixed(3) : null,
      mid: +mid(n).toFixed(3),
      gd: genusDiff(n),
      rank: 0,
      in8: 0,
      in16: 0
    };
  });
  const trust = easyTrust();
  // Every unit of the tree, every rank: the family its ease is centred on, by the rank of the unit and of that family
  // record (a parent that does not resolve would leave a unit centred on itself).
  const tops = {};
  Object.keys((typeof TREEU === 'object' && TREEU && TREEU.gen) || {}).forEach(n => {
    const t = top(n),
      k = `${(GX(n) || {}).rank || SUBJ.rank} -> ${t === n ? 'itself' : (GX(t) || {}).rank || SUBJ.rank}`;
    tops[k] = (tops[k] || 0) + 1;
  });
  // A circle opens once the one before it is all met (the gates' order, app.js treeGate: circle 2 once circle 1 has been
  // asked, circle 3 on its card later; their timing aside).
  const circ = n => units[n].circle || 1;
  for (let k = 0; k < seqs; k++) {
    const met = new Set(),
      isMet = n => met.has(n);
    let left = L.slice(),
      i = 0;
    while (left.length) {
      const c = Math.min(...left.map(circ)),
        fresh = left.filter(x => circ(x) === c),
        n = openPick(fresh, L, isMet);
      met.add(n);
      left = left.filter(x => x !== n);
      const u = units[n];
      u.rank += i / seqs;
      if (i < 8) u.in8 += 1 / seqs;
      if (i < 16) u.in16 += 1 / seqs;
      i++;
    }
  }
  return {trust, tops, units, groups: groupMap()};
}

(async () => {
  await require('../../../tests/slot.js')('tools/studies/ree241/openorder.js');
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}/`,
    browser = await chromium.launch(),
    ctx = await browser.newContext({serviceWorkers: 'block'});
  await ctx.route(
    u => !u.href.startsWith(base),
    r => r.abort()
  );
  await ctx.addInitScript(memStorage);
  await ctx.addInitScript(
    ([st, subj]) => {
      localStorage.setItem('reefid-tour', '"done"');
      localStorage.setItem('reefid-anon-id', JSON.stringify('ree241open'));
      localStorage.setItem('reefid-sync-subject', JSON.stringify(subj));
      localStorage.setItem('reefid-sheet-v', '1000');
      localStorage.setItem(`reefid-sync-${subj}-start`, '{"c":"new","t":1}');
      if (st)
        localStorage.setItem(
          'reefid-photo-stats',
          JSON.stringify({t: Date.now(), v: st.v, photos: st.photos || {}, conf: st.conf || {}, ...(st.gd ? {gd: st.gd} : {}), ...(st.fmt ? {fmt: st.fmt} : {})})
        );
    },
    [STATS, SUBJECT]
  );
  const p = await ctx.newPage(),
    errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(base);
  await p.waitForFunction(() => window.APP_READY, null, {timeout: 60000});
  await p.evaluate(() => window.loadTier && window.loadTier(5));
  await p.waitForLoadState('networkidle');
  await p.waitForFunction(s => SUBJ.id === s && !(typeof dataPartial === 'function' && dataPartial()), SUBJECT, {timeout: 60000});
  const r = await p.evaluate(measure, {seqs: SEQS});
  await browser.close();
  server.close();
  const out = {root: ROOT, subject: SUBJECT, stats: !!STATS, seqs: SEQS, errs, ...r};
  if (OUT) fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  const U = Object.entries(r.units).sort((a, b) => a[1].rank - b[1].rank);
  console.log(`${SUBJECT} ${ROOT} stats ${!!STATS} trust ${r.trust} units ${U.length} errors ${errs.length}`);
  console.log('the family each unit is centred on (unit rank -> family record rank):', JSON.stringify(r.tops));
  U.forEach(([n, u]) =>
    console.log(
      `${u.name.slice(0, 26).padEnd(26)} c${u.circle} ${u.first ? 'F' : ' '} ease ${u.ease} mid ${u.mid} off ${u.off} gd ${u.gd} rank ${u.rank.toFixed(1)} in8 ${u.in8.toFixed(2)} in16 ${u.in16.toFixed(2)}`
    )
  );
})().catch(e => {
  console.error(e);
  process.exit(1);
});
