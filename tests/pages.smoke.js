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

// One overlay at a time, and each one closable (new-player walkthrough 2026-11-02). Returns the failures.
async function overlays(b, base) {
  const fails = [];
  const open = async (o, init) => {
    const c = await b.newContext({serviceWorkers: 'block', ...o});
    await c.route(
      u => !u.href.startsWith(base),
      r => r.abort()
    );
    await c.addInitScript(init || (() => {}));
    const p = await c.newPage();
    return [c, p];
  };
  const seen = () => {
    localStorage.setItem('imr-tour', '"done"');
    localStorage.setItem('imr-nudge', '1');
  };
  // C2: Back from the quiz closes the first genus card (it stayed over Home, its Next going on there). The cards shown
  // are met; the rest come next time, as "1 of 2".
  {
    const [c, p] = await open({viewport: {width: 390, height: 800}, intro: true}, seen);
    await p.goto(base);
    await p.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
    await p.evaluate(() => (location.hash = 'quiz'));
    await p.waitForSelector('.unlock.intro', {timeout: 5000}).catch(() => {});
    await p.click('.unlock.intro .next'); // card 2 of 4
    await p.goBack();
    await p.waitForTimeout(500);
    await p.keyboard.press('Enter'); // a card's keys left behind would move on to a card no longer there
    const r = await p.evaluate(() => ({h: location.hash, cards: document.querySelectorAll('.unlock').length}));
    await p.evaluate(() => (location.hash = 'quiz'));
    await p.waitForSelector('.unlock.intro', {timeout: 5000}).catch(() => {});
    const kick = await p.evaluate(() => document.querySelector('.unlock.intro .ulkick')?.textContent);
    if (r.h !== '' || r.cards || !/1 of 2/.test(kick || '')) fails.push(`card after Back from the quiz: ${JSON.stringify({...r, kick})}`);
    await c.close();
  }
  // C1: an achievement toast never shows over a card: it waits for the card to close (both orders).
  {
    const [c, p] = await open({viewport: {width: 390, height: 800}, intro: true}, seen);
    await p.goto(base + '#quiz');
    await p.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
    await p.waitForSelector('.unlock.intro', {timeout: 5000}).catch(() => {});
    const t = () => p.evaluate(() => [!!document.querySelector('.unlock'), !!document.querySelector('.achpop')]);
    await p.evaluate(() => achPop({tier: 1, icon: '🧪', title: 'Smoke A', desc: 'test'}));
    await p.waitForTimeout(100);
    const s1 = await t();
    while (await p.$('.unlock.intro')) await p.click('.unlock.intro .next');
    await p.waitForTimeout(100);
    const s2 = await t();
    // A card opening over a toast already on screen sends it back to wait.
    await p.evaluate(() => {
      document.querySelectorAll('.achpop a').forEach(a => {
        a.addEventListener('click', e => e.preventDefault()); // closes it, without opening #ach
        a.click();
      });
      achPop({tier: 1, icon: '🧪', title: 'Smoke B', desc: 'test'});
    });
    await p.waitForTimeout(100);
    await p.evaluate(() => unlockShow([Object.keys(DATA.gen)[0]]));
    await p.waitForTimeout(100);
    const s3 = await t();
    await p.keyboard.press('Escape');
    await p.waitForTimeout(100);
    const s4 = await t(),
      b4 = await p.evaluate(() => document.querySelector('.achpop b')?.textContent);
    if (
      s1.join() !== 'true,false' ||
      s2.join() !== 'false,true' ||
      s3.join() !== 'true,false' ||
      s4.join() !== 'false,true' ||
      b4 !== 'Smoke B'
    )
      fails.push(`achievement toast over a card: ${JSON.stringify([s1, s2, s3, s4, b4])}`);
    // K10: a card photo that fails (here every outside host is cut off, as offline) never shows a broken-image icon.
    const off = await p.evaluate(() => {
      const L = [...BONUS, ...Object.keys(DATA.gen)].filter(n => GX(n) && cover(GX(n)) && !img(cover(GX(n)), 's').startsWith('img/'));
      if (L.length) unlockShow([L[0]]);
      return L[0];
    });
    if (off) {
      await p.waitForTimeout(500);
      const v = await p.evaluate(() => {
        const i = document.querySelector('.unlock img');
        return i && (i.naturalWidth > 0 || getComputedStyle(i).visibility === 'hidden');
      });
      if (!v) fails.push(`broken-image icon on the card of ${off}`);
      await p.keyboard.press('Escape');
    }
    await c.close();
  }
  // C6: Escape closes an enlarged photo and the answer keys 1-4 still work on that question (desktop).
  {
    const [c, p] = await open({viewport: {width: 1280, height: 860}}, seen);
    await p.goto(base + '#quiz');
    await p.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
    await p.waitForSelector('#view .qph .zoom');
    await p.click('#view .qph .zoom');
    await p.waitForTimeout(200);
    await p.keyboard.press('Escape');
    await p.waitForTimeout(200);
    await p.keyboard.press('1');
    await p.waitForTimeout(200);
    const r = await p.evaluate(() => ({lb: !document.getElementById('lightbox').hidden, answered: !!document.getElementById('next')}));
    if (r.lb || !r.answered) fails.push(`answer keys after Escape on an enlarged photo: ${JSON.stringify(r)}`);
    // K3: Escape closes the ? help box, like ⚙.
    await p.click('#help');
    await p.waitForTimeout(100);
    const hOpen = await p.evaluate(() => !document.getElementById('helpbox').hidden);
    await p.keyboard.press('Escape');
    await p.waitForTimeout(100);
    if (!hOpen || (await p.evaluate(() => !document.getElementById('helpbox').hidden))) fails.push('Escape does not close the ? help');
    await c.close();
  }
  // C7: Escape on the tour's sign-in step closes it for good; Escape before that step still offers sign-in once.
  for (const at of [0, 1]) {
    const [c, p] = await open({viewport: {width: 1280, height: 860}}, () => localStorage.setItem('imr-nudge', '1'));
    await p.goto(base);
    await p.waitForFunction(() => window.APP_READY && document.getElementById('tour'), null, {timeout: 30000});
    for (let k = 0; k < at; k++) {
      await p.keyboard.press('ArrowRight');
      await p.waitForTimeout(300);
    }
    const sign = await p.evaluate(() => !!document.querySelector('#tour .tsync'));
    await p.keyboard.press('Escape');
    await p.waitForTimeout(300);
    const r = await p.evaluate(() => ({tour: !!document.getElementById('tour'), card: !!document.querySelector('.unlock.signnudge')}));
    if (sign !== !!at || r.tour || r.card !== !at) fails.push(`Escape on tour step ${at + 1}: ${JSON.stringify({sign, ...r})}`);
    await c.close();
  }
  // A genus opened after the first cards is met inside the quiz ("fewer, better pop-ups", 2026-11-02): a turn on the quiz
  // stage, no card over it, one screen, not an answer (nothing logged), the genus met with kind 'c'; Enter goes on to a
  // question about another genus. Phone and desktop.
  for (const [w, h] of [
    [390, 844],
    [1280, 800]
  ]) {
    const [c, p] = await open({viewport: {width: w, height: h}, intro: true}, seen);
    await p.goto(base + '#quiz');
    await p.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
    await p.waitForSelector('.unlock.intro', {timeout: 5000}).catch(() => {});
    while (await p.$('.unlock.intro')) await p.click('.unlock.intro .ulbtns .next');
    let m = null;
    for (let i = 0; i < 30 && !m; i++) {
      await p.waitForSelector('#view [data-c]:not([disabled]), .qmeet');
      if (await p.$('.qmeet')) break;
      if (await p.$('.unlock')) m = {card: await p.evaluate(() => document.querySelector('.unlock').className), at: i};
      await p.evaluate(() => {
        document.querySelectorAll('.unlock').forEach(x => (x.ulClose ? x.ulClose() : x.remove()));
        document.querySelector(`#view [data-c="${CSS.escape(SHOWNQ[1])}"]`).click();
      });
      await p.click('#next');
    }
    if (m) fails.push(`${w}px a card in the quiz after the first ones: ${JSON.stringify(m)}`);
    const t = await p.evaluate(() => {
      const q = document.querySelector('#view .qmeet'),
        n = q && q.querySelector('h3 a i').textContent,
        nb = q && q.querySelector('#next').getBoundingClientRect(),
        st = q && q.querySelector('.qstage .qph img');
      return (
        q && {
          n,
          card: !!document.querySelector('.unlock'),
          tag: !!q.querySelector('.newtag'),
          link: !!q.querySelector(`a[href="#g-${CSS.escape(n)}"]`),
          tips: !!q.querySelector('.tipbox li, .tipbox .keyid'),
          photo: !!st,
          fits: nb.bottom <= innerHeight && document.scrollingElement.scrollHeight <= innerHeight + 1,
          focus: document.activeElement === q.querySelector('#next'),
          kind: (introMap()[n] || [])[3],
          a: answersSoFar(),
          log: store.get(LOG0, []).length
        }
      );
    });
    if (!t || t.card || !t.tag || !t.link || !t.tips || !t.photo || !t.fits || !t.focus || t.kind !== 'c')
      fails.push(`${w}px genus turn in the quiz: ${JSON.stringify(t)}`);
    else {
      await p.keyboard.press('1'); // not a question: no answer key does anything
      await p.keyboard.press('Enter');
      await p.waitForTimeout(200);
      const q = await p.evaluate(() => ({
        meet: !!document.querySelector('.qmeet'),
        asked: SHOWNQ && SHOWNQ[1],
        choices: document.querySelectorAll('#view [data-c]:not([disabled])').length,
        a: answersSoFar(),
        log: store.get(LOG0, []).length
      }));
      if (q.meet || q.asked === t.n || q.choices < 2 || q.a !== t.a || q.log !== t.log)
        fails.push(`${w}px after the genus turn of ${t.n}: ${JSON.stringify(q)}`);
    }
    await c.close();
  }
  // Out-of-game prompts take turns, counted in answers (2026-11-02): the sign-in card at 20 answers (not before), the
  // one-tap question first at 35, at least 10 answers between two of them, never with an achievement toast or a card on
  // screen. A new player, mostly right, 60 answers; toasts closed by a tap as they come.
  {
    const [c, p] = await open({viewport: {width: 390, height: 844}}, () => localStorage.setItem('imr-tour', '"done"'));
    await p.goto(base + '#quiz');
    await p.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
    const seenP = [];
    for (let i = 0; i < 60; i++) {
      await p.waitForSelector('#view [data-c]:not([disabled]), .qmeet');
      const r = await p.evaluate(i => {
        document.querySelector('.qmeet #next')?.click();
        // A toast is tapped away (without following its link) before answering.
        document.querySelectorAll('.achpop a').forEach(a => {
          a.addEventListener('click', e => e.preventDefault());
          a.click();
        });
        const t = SHOWNQ[1],
          bs = [...document.querySelectorAll('#view [data-c]')];
        (i % 6 === 5 ? bs.find(b => b.dataset.c !== t) : bs.find(b => b.dataset.c === t)).click();
        const card = document.querySelector('.unlock'),
          toast = !!document.querySelector('.achpop') || achBusy;
        return {
          a: answersSoFar(),
          sign: !!document.querySelector('.unlock.signnudge'),
          pulse: !!document.querySelector('#after .pulse'),
          other: !!card && !card.matches('.signnudge'),
          toast
        };
      }, i);
      if (r.sign || r.pulse) seenP.push({...r, k: r.sign ? 'sign-in' : 'pulse'});
      await p.evaluate(() => {
        document.querySelectorAll('.unlock').forEach(x => (x.ulClose ? x.ulClose() : x.remove()));
        document.querySelector('[data-pulse=""]')?.click();
        document.getElementById('next').click();
      });
    }
    const sign = seenP.find(x => x.k === 'sign-in'),
      pulse = seenP.find(x => x.k === 'pulse'),
      gaps = seenP.slice(1).map((x, k) => x.a - seenP[k].a);
    if (
      !sign ||
      !pulse ||
      sign.a < 20 ||
      sign.a > 25 ||
      pulse.a < 35 ||
      pulse.a > 45 ||
      gaps.some(g => g < 10) ||
      seenP.some(x => x.other || x.toast)
    )
      fails.push(`prompt spacing over 60 answers: ${JSON.stringify(seenP)}`);
    await c.close();
  }
  // The right answer's celebration (app.css .cheer) plays on the choice and on "✓ Yes", and not at all with
  // prefers-reduced-motion; Next is there and focused at once.
  for (const reducedMotion of ['no-preference', 'reduce']) {
    const [c, p] = await open({viewport: {width: 1280, height: 800}, reducedMotion}, seen);
    await p.goto(base + '#quiz');
    await p.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
    await p.waitForSelector('#view [data-c]');
    const r = await p.evaluate(() => {
      document.querySelector(`#view [data-c="${CSS.escape(SHOWNQ[1])}"]`).click();
      const b = document.querySelector('#view .ans button.ok'),
        v = document.querySelector('#after .fb h3 .v');
      return {
        btn: getComputedStyle(b).animationName,
        yes: getComputedStyle(v).animationName,
        next: document.activeElement === document.getElementById('next')
      };
    });
    const want = reducedMotion === 'reduce' ? ['none', 'none'] : ['cheer', 'tickpop'];
    if (r.btn !== want[0] || r.yes !== want[1] || !r.next) fails.push(`right-answer celebration (${reducedMotion}): ${JSON.stringify(r)}`);
    await c.close();
  }
  return fails;
}

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
    // The one-tap question after 35 answers, and app errors queued for the sheet but never sent from a local copy (LOCAL).
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
        // ... and says so (the box just went before).
        const said = await q2.evaluate(() => document.querySelector('.apptoast')?.textContent || '');
        if (!/All \d+ genera are open/.test(said)) fails.push(`${w}px open all genera: no confirmation (${said})`);
      }
      await q2.evaluate(() => (location.hash = 'quiz'));
      await q2.waitForTimeout(500);
      if (seen.length !== 4 || !seen.every((c, k) => c.img && c.all && c.kick.includes(`${k + 1} of 4`)))
        fails.push(`${w}px first cards: ${JSON.stringify(seen)}`);
      else if (!ch.every(c => seen.some(s => s.name === c)))
        fails.push(`${w}px first question not among the first cards: ${ch.join(', ')}`);
      let at = 0;
      for (let i = 1; i <= 40 && !at; i++) {
        await q2.waitForSelector('#view [data-c]');
        await q2.evaluate(() => document.querySelectorAll('.unlock.intro').forEach(x => x.remove()));
        // Achievement toasts have gone by the next answer (4 s; the prompts wait for them, PROMPT).
        await q2.evaluate(() => {
          document.querySelectorAll('.achpop').forEach(x => x.remove());
          achQ.length = 0;
          achBusy = false;
        });
        await q2.evaluate(() => document.querySelector('#view [data-c]').click());
        await q2.waitForSelector('#next');
        if (await q2.$('#after .pulse')) at = i;
        else await q2.evaluate(() => document.getElementById('next').click());
      }
      if (at !== 35) fails.push(`${w}px one-tap question: shown at answer ${at}, expected 35`);
      else {
        await q2.click('[data-pulse="hard"]');
        // An error from one of the app's script files is reported; one injected into the page by a browser or an
        // extension (no file, or the page itself), and the harmless ResizeObserver warning, are not (Pierre, 2026-11-02).
        await q2.evaluate(() => {
          const dir = location.origin + location.pathname.replace(/[^/]*$/, ''),
            err = (message, filename) => window.dispatchEvent(new ErrorEvent('error', {message, filename, lineno: 1}));
          err('smoke test error', dir + 'quiz.js?v=1');
          err("ReferenceError: Can't find variable: __firefox__", location.href);
          err('Script error.', '');
          err('ResizeObserver loop completed with undelivered notifications.', dir + 'app.js');
        });
        await q2.waitForTimeout(300);
        const q = await q2.evaluate(() => JSON.parse(localStorage.getItem('imr-evq') || '[]').map(x => x.k + ':' + (x.r || x.msg)));
        if (!q.includes('pulse:hard') || !q.some(x => /smoke test error/.test(x))) fails.push(`${w}px events not queued: ${q.join(' | ')}`);
        if (q.some(x => /__firefox__|Script error|ResizeObserver/.test(x))) fails.push(`${w}px noise errors queued: ${q.join(' | ')}`);
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
      // Enlarged photo at actual size: a mouse drags it around (an RA, 2026-11-02), a click without moving goes back to fit.
      const cz = await b.newContext({viewport: {width: 1024, height: 600}, serviceWorkers: 'block'});
      await cz.route(
        u => !u.href.startsWith(base),
        r => r.abort()
      );
      await cz.addInitScript(() => localStorage.setItem('imr-tour', '"done"'));
      const qz = await cz.newPage();
      await qz.goto(base + '#g-Acropora');
      await qz.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
      await qz.waitForTimeout(800);
      const pic = await qz.evaluateHandle(() =>
        [...document.querySelectorAll('#view img')].find(i => i.getBoundingClientRect().width > 120)
      );
      await pic.click();
      await qz.waitForTimeout(800);
      const bb = await (await qz.$('#lightbox .lb-in img')).boundingBox();
      await qz.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2);
      await qz.waitForTimeout(1500);
      const z0 = await qz.evaluate(() => ({
        full: lightbox.classList.contains('full'),
        t: lightbox.scrollTop,
        over: lightbox.scrollHeight > lightbox.clientHeight
      }));
      await qz.mouse.move(500, 300);
      await qz.mouse.down();
      await qz.mouse.move(500, 250, {steps: 5});
      await qz.mouse.up();
      const z1 = await qz.evaluate(() => ({full: lightbox.classList.contains('full'), t: lightbox.scrollTop, open: !lightbox.hidden}));
      // A drag released outside the window (no pointerup): moving back over the photo with no button pressed must not pan.
      await qz.mouse.down();
      await qz.mouse.move(500, 260, {steps: 5});
      await qz.evaluate(() =>
        lightbox.dispatchEvent(
          new PointerEvent('pointermove', {pointerType: 'mouse', buttons: 0, clientX: 500, clientY: 200, bubbles: true})
        )
      );
      const zt = await qz.evaluate(() => lightbox.scrollTop);
      await qz.evaluate(() =>
        lightbox.dispatchEvent(
          new PointerEvent('pointermove', {pointerType: 'mouse', buttons: 0, clientX: 500, clientY: 100, bubbles: true})
        )
      );
      if ((await qz.evaluate(() => lightbox.scrollTop)) !== zt)
        fails.push('enlarged photo still panning after the button was released outside');
      await qz.mouse.up();
      await qz.mouse.click(500, 300);
      const z2 = await qz.evaluate(() => ({full: lightbox.classList.contains('full'), open: !lightbox.hidden}));
      if (!z0.full || !z0.over || !z1.full || !z1.open || z1.t <= z0.t || z2.full || !z2.open)
        fails.push(`enlarged photo drag: ${JSON.stringify({z0, z1, z2})}`);
      await cz.close();
      for (const f of await overlays(b, base)) fails.push(f);
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
