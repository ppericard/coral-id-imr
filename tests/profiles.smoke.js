const http = require('http'),
  fs = require('fs'),
  path = require('path');
const {chromium} = require('playwright');
const ROOT = path.join(__dirname, '..');
const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json'
};
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname),
    f = path.join(ROOT, u.endsWith('/') ? u + 'index.html' : u);
  if (!f.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end();
  }
  fs.readFile(f, (e, b) => {
    if (e) {
      res.writeHead(404);
      return res.end();
    }
    res.writeHead(200, {'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream'});
    res.end(b);
  });
});

// Three players through the real photo quiz (Pierre, 2026-11-02; docs/LEARNING.md): a complete beginner, an IMR RA
// after one lecture (knows some genera a little), an expert. The learner model is the test's, not the app's: know[g] =
// chance to recognise genus g on a photo of average difficulty, lowered on harder photos and single views; otherwise a
// guess among the plausible choices; each answer teaches a little. Checks that the app, with nothing set per profile:
// keeps a beginner on a few genera at a time, the easier ones first, and keeps opening new ones; gives an expert many
// genera, hard choices (look-alike traps) and mastered genera early. Locally: node tests/profiles.smoke.js
(async () => {
  await new Promise(ok => server.listen(0, '127.0.0.1', ok));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const b = await chromium.launch();
  const ctx = await b.newContext({viewport: {width: 1280, height: 800}, serviceWorkers: 'block'});
  await ctx.route(
    u => !u.href.startsWith(base),
    r => r.abort()
  );
  await ctx.addInitScript(() => {
    localStorage.setItem('imr-tour', '"done"');
    // Same draws every run: the app's own randomness is seeded too.
    let s = 12345;
    Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647;
  });
  const p = await ctx.newPage(),
    errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(base);
  await p.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
  const R = await p.evaluate(() => {
    const sig = x => 1 / (1 + Math.exp(-x)),
      logit = q => Math.log(q / (1 - q)),
      G = Object.keys(DATA.gen);
    let seed = 7;
    const rnd = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
    const q0 = question;
    question = (...a) => ((window.__q = a), q0(...a));
    const profiles = {
      beginner: [() => Object.fromEntries(G.map(g => [g, 0.02])), 0.12],
      RA: [() => Object.fromEntries(G.map((g, i) => [g, i % 5 < 2 ? 0.55 : 0.1])), 0.12],
      expert: [() => Object.fromEntries(G.map(g => [g, 0.93])), 0.05]
    };
    const out = {};
    for (const [name, [mk, rate]] of Object.entries(profiles)) {
      P = {};
      const know = mk(),
        first = [],
        rows = [];
      let blk = {n: 0, ok: 0, traps: 0};
      for (let i = 0; i < 300; i++) {
        NEXTQ = null;
        quizPhoto();
        const t = window.__q[1];
        if (!first.includes(t)) first.push(t);
        const ch = [...document.querySelectorAll('#view [data-c]')].map(x => x.dataset.c),
          traps = ch.filter(c => c !== t && (confusable(t, c) || pooledConf(t, c) >= CONF.TRAP)).length,
          all = Object.values(GX(t).views).flat(),
          fs = [...document.querySelectorAll('#view .qstage img')].map(im =>
            resized(im.getAttribute('src'), '')
              .replace(/^img\//, '')
              .replace(/\.webp.*$/, '')
          ),
          pd = fs
            .map(f => all.find(x => x.f === f))
            .filter(Boolean)
            .map(x => photoDiff(t, x)),
          diff = pd.length ? pd.reduce((a, x) => a + x, 0) / pd.length : 0,
          kq = Math.min(ch.length, Number((document.querySelector('#view .ans') || {dataset: {}}).dataset.k) || ch.length),
          pk = sig(logit(Math.min(0.995, Math.max(0.005, know[t]))) - diff - (fs.length === 1 ? 0.5 : 0)),
          right = rnd() < pk || rnd() < 1 / kq,
          pick = right ? t : ch.filter(c => c !== t)[Math.floor(rnd() * (ch.length - 1))];
        blk.n++;
        blk.ok += right;
        blk.traps += traps;
        document.querySelector(`[data-c="${CSS.escape(pick)}"]`).click();
        know[t] += rate * (1 - know[t]);
        if ((i + 1) % 100 === 0) {
          rows.push({
            q: i + 1,
            right: Math.round((100 * blk.ok) / blk.n),
            traps: +(blk.traps / blk.n).toFixed(2),
            met: G.filter(g => P[g]).length,
            learned: G.filter(g => (P[g] || {}).mx).length
          });
          blk = {n: 0, ok: 0, traps: 0};
        }
      }
      const gd = G.map(genusDiff),
        mean = L => L.reduce((a, x) => a + x, 0) / L.length;
      out[name] = {rows, firstEase: +mean(first.slice(0, 8).map(genusDiff)).toFixed(2), allEase: +mean(gd).toFixed(2)};
    }
    return out;
  });
  await b.close();
  server.close();
  const fails = [],
    [b1, , b3] = R.beginner.rows,
    [e1, , e3] = R.expert.rows,
    [r1, , r3] = R.RA.rows;
  for (const [k, v] of Object.entries(R)) console.log(k, JSON.stringify(v));
  if (b1.met > 16) fails.push(`beginner met ${b1.met} genera in 100 questions: not focused`);
  if (b3.met <= b1.met) fails.push(`beginner stopped opening genera (${b1.met} then ${b3.met})`);
  if (r3.met <= r1.met) fails.push(`RA stopped opening genera (${r1.met} then ${r3.met})`);
  if (R.beginner.firstEase > R.beginner.allEase)
    fails.push(`beginner's first genera not easier (${R.beginner.firstEase} vs ${R.beginner.allEase})`);
  if (e1.met < 15) fails.push(`expert met only ${e1.met} genera in 100 questions`);
  if (e3.met <= b3.met) fails.push(`expert opened no more genera than a beginner (${e3.met} vs ${b3.met})`);
  if ((e1.traps + e3.traps) / 2 < 1) fails.push(`expert got ${e1.traps}, ${e3.traps} look-alike traps a question`);
  if (e3.learned < 1) fails.push('expert mastered no genus in 300 questions');
  if (errs.length) fails.push('page errors: ' + errs.slice(0, 3).join(' | '));
  if (fails.length) {
    console.error(`Learning path: ${fails.length} problem(s)\n` + fails.join('\n'));
    process.exit(1);
  }
  console.log(
    'Learning path OK: a beginner and an RA focus on a few genera, easier first, and keep opening; an expert gets many genera, traps and mastery.'
  );
})().catch(e => {
  console.error(e);
  process.exit(1);
});
