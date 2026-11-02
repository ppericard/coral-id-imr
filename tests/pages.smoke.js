// Page smoke test (code re-review 2026-11-01, M5): serves the site locally, opens the main routes in Chromium at phone
// and desktop widths, and fails on any page error. Not a node --test file: it needs Playwright, which CI installs with
// npm into a temporary folder (no package.json in this repo). Locally: node tests/pages.smoke.js (Playwright installed).
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
  '.webmanifest': 'application/manifest+json'
};
const ROUTES = [
  'genera',
  'g-Acropora',
  'cmp',
  'cmp-Pocillopora|Stylophora',
  'quiz',
  'quiz-duel',
  'pairs',
  'finder',
  'progress',
  'board',
  'ach',
  'lab',
  'quiz-duel|Foo|Bar',
  'g-%E0'
]; // the last two are malformed links: they must not crash a page

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

(async () => {
  await new Promise(ok => server.listen(0, '127.0.0.1', ok));
  const base = `http://127.0.0.1:${server.address().port}/`,
    fails = [];
  const b = await chromium.launch();
  // The first-encounter card (quiz.js introShow) would cover the quiz in the checks that are not about it: every genus
  // starts as met on a card, except in a context opened with {intro: true}.
  const INTROS = JSON.stringify(Object.fromEntries(Object.keys(require('../data.json').gen).map(n => [n, [0, 1]]))),
    ctxNew = b.newContext.bind(b);
  b.newContext = async ({intro, ...o} = {}) => {
    const c = await ctxNew(o);
    if (!intro)
      await c.addInitScript(s => {
        try {
          localStorage.getItem('imr-coral-intro') || localStorage.setItem('imr-coral-intro', s);
        } catch (e) {}
      }, INTROS);
    return c;
  };
  for (const w of [390, 1280]) {
    const ctx = await b.newContext({viewport: {width: w, height: 800}, serviceWorkers: 'block'});
    // Only this site: photos from iNaturalist and the Google sync are cut off, so the test never depends on them.
    await ctx.route(
      u => !u.href.startsWith(base),
      r => r.abort()
    );
    const p = await ctx.newPage(),
      errs = [];
    p.on('pageerror', e => errs.push(e.message));
    p.on('console', m => {
      if (m.type() === 'error' && !/Failed to load resource|net::ERR_/.test(m.text())) errs.push(m.text());
    });
    await p.goto(base);
    await p.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
    if (errs.length) fails.push(`${w}px start: ${errs.join(' | ')}`);
    for (const h of ROUTES) {
      errs.length = 0;
      await p.evaluate(h => {
        location.hash = h;
      }, h);
      await p.waitForTimeout(700);
      if (errs.length) fails.push(`${w}px #${h}: ${errs.slice(0, 3).join(' | ')}`);
    }
    // The one-tap question after 15 answers, and app errors queued for the sheet but never sent from a local copy (LOCAL).
    // A fresh browser that has seen the tour (a tour opened earlier in this context resumes after a reload).
    if (w === 390) {
      const c2 = await b.newContext({viewport: {width: w, height: 800}, serviceWorkers: 'block', intro: true});
      await c2.route(
        u => !u.href.startsWith(base),
        r => r.abort()
      );
      await c2.addInitScript(() => {
        localStorage.setItem('imr-tour', '"done"');
        localStorage.setItem('imr-nudge', '1');
      });
      const q2 = await c2.newPage(),
        e2 = [];
      q2.on('pageerror', e => e2.push(e.message));
      await q2.goto(base + '#quiz');
      await q2.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
      // A player starting from zero first meets INTRO.START genera on cards, one after the other ("1 of 4"), and the
      // first question is about one of them, its choices among them (Pierre, 2026-11-02).
      await q2.waitForSelector('.unlock.intro', {timeout: 5000}).catch(() => {});
      // The quiz's keys never answer the question behind a card (Codex review #350).
      await q2.keyboard.press('1');
      if (await q2.evaluate(() => !!document.getElementById('next') || !!P[LEVEL])) fails.push(`${w}px key 1 answered behind a card`);
      const seen = [];
      for (let k = 0; k < 6 && (await q2.$('.unlock.intro')); k++) {
        seen.push(
          await q2.evaluate(() => ({
            name: document.querySelector('.unlock.intro h3').textContent,
            kick: document.querySelector('.unlock.intro .ulkick').textContent,
            img: !!document.querySelector('.unlock.intro .ulphoto img'),
            all: !!document.querySelector('.unlock.intro .ulall [data-all]')
          }))
        );
        // A glossary term on a card opens its definition on top of the card (an RA, 2026-11-02: it opened behind it).
        const gt = await q2.$('.unlock.intro .gt');
        if (gt) {
          await gt.click();
          const top = await q2.evaluate(() => {
            const g = document.querySelector('.gpop'),
              r = g.getBoundingClientRect();
            return !g.hidden && g.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2));
          });
          if (!top) fails.push(`${w}px glossary term on a genus card: definition not shown on top`);
          await q2.click('.unlock.intro h3'); // a tap elsewhere closes the definition
        }
        await q2.click('.unlock.intro .next');
      }
      const ch = await q2.evaluate(() => [...document.querySelectorAll('#view [data-c]')].map(b => b.dataset.c));
      // My progress offers to open every genus (RAs who had the lecture and skipped the button on the first cards).
      await q2.evaluate(() => (location.hash = 'quiz-board'));
      await q2.waitForSelector('#openall', {timeout: 5000}).catch(() => {});
      if (!(await q2.$('#openall'))) fails.push(`${w}px My progress: no button to open all genera`);
      // My progress (Pierre, 2026-11-02): the player's card (ring + badge) above the board on phones, Slate by default,
      // the view switch last on the page.
      const pg = await q2.evaluate(() => {
        const c = document.querySelector('#view .pbadge'),
          b = document.querySelector('#view .pboard .pgwrap'),
          sw = document.querySelector('#view .pvseg');
        return {
          card: !!c && !!c.querySelector('.pring') && !!b,
          above: !!c && !!b && c.getBoundingClientRect().bottom <= b.getBoundingClientRect().top + 1,
          slate: !!document.querySelector('#view .pslate'),
          last: !!sw && !sw.nextElementSibling && sw.getBoundingClientRect().top >= b.getBoundingClientRect().bottom
        };
      });
      if (!pg.card || !pg.above || !pg.slate || !pg.last) fails.push(`${w}px My progress layout: ${JSON.stringify(pg)}`);
      else {
        await q2.click('#openall');
        const left = await q2.evaluate(() => introLeft().length);
        if (left || (await q2.$('#openall'))) fails.push(`${w}px open all genera: ${left} left`);
      }
      await q2.evaluate(() => (location.hash = 'quiz'));
      await q2.waitForTimeout(500);
      if (seen.length !== 4 || !seen.every((c, k) => c.img && c.all && c.kick.includes(`${k + 1} of 4`)))
        fails.push(`${w}px first cards: ${JSON.stringify(seen)}`);
      else if (!ch.every(c => seen.some(s => s.name === c)))
        fails.push(`${w}px first question not among the first cards: ${ch.join(', ')}`);
      let at = 0;
      for (let i = 1; i <= 20 && !at; i++) {
        await q2.waitForSelector('#view [data-c]');
        await q2.evaluate(() => document.querySelectorAll('.unlock.intro').forEach(x => x.remove()));
        await q2.evaluate(() => document.querySelector('#view [data-c]').click());
        await q2.waitForSelector('#next');
        if (await q2.$('#after .pulse')) at = i;
        else await q2.evaluate(() => document.getElementById('next').click());
      }
      if (at !== 15) fails.push(`${w}px one-tap question: shown at answer ${at}, expected 15`);
      else {
        await q2.click('[data-pulse="hard"]');
        await q2.evaluate(() =>
          setTimeout(() => {
            throw new Error('smoke test error');
          }, 0)
        );
        await q2.waitForTimeout(300);
        const q = await q2.evaluate(() => JSON.parse(localStorage.getItem('imr-evq') || '[]').map(x => x.k + ':' + (x.r || x.msg)));
        if (!q.includes('pulse:hard') || !q.some(x => /smoke test error/.test(x))) fails.push(`${w}px events not queued: ${q.join(' | ')}`);
      }
      // Back closes an enlarged photo and stays on the page (RA review 2026-11-02).
      await q2.evaluate(() => (location.hash = 'g-Porites'));
      await q2.waitForTimeout(600);
      await q2.evaluate(() => document.querySelector('#view .zoom').click());
      await q2.waitForTimeout(300);
      await q2.goBack();
      await q2.waitForTimeout(400);
      const lbb = await q2.evaluate(() => ({open: !document.getElementById('lightbox').hidden, h: location.hash}));
      if (lbb.open || lbb.h !== '#g-Porites') fails.push(`${w}px Back with an enlarged photo: ${JSON.stringify(lbb)}`);
      // A sheet opened by a link in a fresh tab: after a photo was enlarged and closed, its Back button still leads to
      // Genera (Codex review #344: history.length counted the photo's entry, and Back did nothing).
      const q3 = await c2.newPage();
      await q3.goto(base + '#g-Porites');
      await q3.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
      await q3.evaluate(() => document.querySelector('#view .zoom').click());
      await q3.waitForTimeout(300);
      await q3.click('#lightbox [data-x]');
      await q3.waitForTimeout(400);
      await q3.click('[data-back]');
      await q3.waitForTimeout(800);
      const bk = await q3.evaluate(() => location.hash);
      if (bk !== '#genera') fails.push(`${w}px Back on a linked sheet after a photo: ${bk}`);
      // A reload with a photo enlarged: its history entry is stepped over, so the sheet's Back returns to the quiz.
      await q3.evaluate(() => (location.hash = 'quiz'));
      await q3.waitForTimeout(600);
      await q3.evaluate(() => (location.hash = 'g-Porites'));
      await q3.waitForTimeout(600);
      await q3.evaluate(() => document.querySelector('#view .zoom').click());
      await q3.waitForTimeout(300);
      await q3.reload();
      await q3.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
      await q3.waitForTimeout(300);
      await q3.click('[data-back]');
      await q3.waitForTimeout(800);
      const bl = await q3.evaluate(() => location.hash);
      if (bl !== '#quiz') fails.push(`${w}px Back after a reload with a photo enlarged: ${bl}`);
      // Forward onto a closed photo's entry is stepped over too: the sheet's Back then returns to the quiz.
      await q3.evaluate(() => (location.hash = 'g-Porites'));
      await q3.waitForTimeout(600);
      await q3.evaluate(() => document.querySelector('#view .zoom').click());
      await q3.waitForTimeout(300);
      await q3.click('#lightbox [data-x]');
      await q3.waitForTimeout(400);
      await q3.goForward();
      await q3.waitForTimeout(500);
      await q3.click('[data-back]');
      await q3.waitForTimeout(800);
      const bf = await q3.evaluate(() => location.hash);
      if (bf !== '#quiz') fails.push(`${w}px Back after Forward onto a closed photo: ${bf}`);
      // From the quiz to a sheet, then a reload: the sheet's Back still returns to the quiz (Codex review #344).
      await q3.evaluate(() => (location.hash = 'quiz'));
      await q3.waitForTimeout(600);
      await q3.evaluate(() => (location.hash = 'g-Porites'));
      await q3.waitForTimeout(600);
      await q3.reload();
      await q3.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
      await q3.click('[data-back]');
      await q3.waitForTimeout(800);
      const bq = await q3.evaluate(() => location.hash);
      if (bq !== '#quiz') fails.push(`${w}px Back on a sheet after a reload: ${bq}`);
      await q3.close();
      // Coral Finder: the "Compare A and B" button is readable (its text was the colour of its background).
      await q2.evaluate(() => (location.hash = 'finder|form=M'));
      await q2.waitForTimeout(800);
      for (const k of [0, 2]) {
        await q2.locator('button:has-text("Compare")').nth(k).click();
        await q2.waitForTimeout(300);
      }
      const cc = await q2.evaluate(() => {
        const n = document.querySelector('.fdcmp .next'),
          c = n && getComputedStyle(n);
        return n ? [c.color, c.backgroundColor] : null;
      });
      if (!cc || cc[0] === cc[1]) fails.push(`${w}px Coral Finder compare button unreadable: ${JSON.stringify(cc)}`);
      const other = e2.filter(e => !/smoke test error/.test(e));
      if (other.length) fails.push(`${w}px quiz: ${other.slice(0, 3).join(' | ')}`);
      await c2.close();
      // The guided tour on a first visit reaches the quiz (step 3) while the first genus cards are due: the cards wait
      // under it, out of sight, its keys still work, and they show once it closes (an RA, 2026-11-02).
      const ct = await b.newContext({viewport: {width: 1280, height: 860}, serviceWorkers: 'block', intro: true});
      await ct.route(
        u => !u.href.startsWith(base),
        r => r.abort()
      );
      await ct.addInitScript(() => localStorage.setItem('imr-nudge', '1'));
      const qt = await ct.newPage();
      await qt.goto(base);
      await qt.waitForFunction(() => window.APP_READY && document.getElementById('tour'), null, {timeout: 30000});
      for (let k = 0; k < 4 && (await qt.evaluate(() => location.hash !== '#quiz')); k++) {
        await qt.keyboard.press('ArrowRight');
        await qt.waitForTimeout(400);
      }
      await qt.waitForSelector('.unlock.intro', {state: 'attached', timeout: 5000}).catch(() => {});
      const under = await qt.evaluate(() => {
        const u = document.querySelector('.unlock.intro');
        return {
          hash: location.hash,
          card: !!u,
          shown: !!u && getComputedStyle(u).display !== 'none',
          step: document.querySelector('#tour .tstep')?.textContent
        };
      });
      if (under.hash !== '#quiz' || !under.card || under.shown) fails.push(`tour over the first cards: ${JSON.stringify(under)}`);
      // The quiz's answer keys never answer the question under the tour (Codex review #353).
      await qt.keyboard.press('1');
      await qt.waitForTimeout(200);
      if (await qt.evaluate(() => !!document.getElementById('next') || !!P[LEVEL]))
        fails.push('key 1 answered the question under the tour');
      await qt.keyboard.press('ArrowRight');
      await qt.waitForTimeout(300);
      const step = await qt.evaluate(() => document.querySelector('#tour .tstep')?.textContent);
      if (step === under.step) fails.push(`tour keys blocked by a card waiting under it (${step})`);
      // Through to the last step and its "Start playing" (already on the quiz): the waiting cards show from the first.
      const first = await qt.evaluate(() => document.querySelector('.unlock.intro h3').textContent);
      for (let k = 0; k < 4 && (await qt.$('#tour .tnext')) && !/Start/.test(await qt.textContent('#tour .tnext')); k++) {
        await qt.click('#tour .tnext');
        await qt.waitForTimeout(400);
      }
      await qt.click('#tour .tnext');
      await qt.waitForTimeout(400);
      const after = await qt.evaluate(() => {
        const u = document.querySelector('.unlock.intro');
        return {
          tour: !!document.getElementById('tour'),
          shown: !!u && getComputedStyle(u).display !== 'none',
          kick: u && u.querySelector('.ulkick').textContent,
          name: u && u.querySelector('h3').textContent
        };
      });
      if (after.tour || !after.shown || !/1 of/.test(after.kick || '') || after.name !== first)
        fails.push(`first cards after the tour (first ${first}): ${JSON.stringify(after)}`);
      await ct.close();
    }
    errs.length = 0;
    await p.goto(base + 'admin.html?readonly');
    await p.waitForFunction(() => typeof DRAFT !== 'undefined' && DRAFT && DRAFT.genera, null, {timeout: 30000});
    await p.waitForTimeout(500);
    if (errs.length) fails.push(`${w}px admin.html?readonly: ${errs.slice(0, 3).join(' | ')}`);
    await ctx.close();
  }
  await b.close();
  server.close();
  if (fails.length) {
    console.error('Page errors:\n' + fails.join('\n'));
    process.exit(1);
  }
  console.log(`Pages OK: ${ROUTES.length} routes + admin at 390 and 1280 px.`);
})().catch(e => {
  console.error(e);
  process.exit(1);
});
