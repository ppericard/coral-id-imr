// Page smoke test (code re-review 2026-11-01, M5): serves the site locally, opens the main routes in Chromium at phone
// and desktop widths, and fails on any page error. Not a node --test file: it needs Playwright, which CI installs with
// npm into a temporary folder (no package.json in this repo). Locally: node tests/pages.smoke.js (Playwright installed).
const http = require('http'),
  fs = require('fs'),
  path = require('path'),
  {execFileSync} = require('child_process');
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
  'quiz-custom',
  'quiz-custom|play',
  'pairs',
  'finder',
  'progress',
  'board',
  'ach',
  'lab',
  'lab-basics|walls',
  'lab-basics|words',
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
  const open = async (o, init, arg) => {
    const c = await b.newContext({serviceWorkers: 'block', ...o});
    await c.route(
      u => !u.href.startsWith(base),
      r => r.abort()
    );
    await c.addInitScript(init || (() => {}), arg);
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
    await p.evaluate(() => introShow([Object.keys(DATA.gen)[0]], false));
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
    // K10: a card photo that fails (as offline: here its files are cut off on R2 and on the site; Millepora's used to
    // come from iNaturalist, cut off like every outside host) never shows a broken-image icon.
    const off = await p.evaluate(() => BENTHIC[0]),
      offF = await p.evaluate(n => cover(GX(n)).f, off);
    await c.route(
      u => u.pathname.includes(`/img/${offF}`),
      r => r.abort()
    );
    await p.evaluate(n => introShow([n], false), off);
    {
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
  // Millepora a slate genus (Pierre, 2026-11-02): a returning player who saw the earlier recalculation pop-up gets the
  // Millepora one, once (AGENTS rule 12); one who missed both gets both on one card. Bonus genera unlocked by the
  // former thresholds (Q.bu 2+) stay on; Millepora alone (Q.bu 1) is no opt-in. Millepora's first card and sheet warn.
  for (const [recalc, bu] of [
    ['progress-moving-average-2026-11', 3],
    ['', 1]
  ]) {
    const [c, p] = await open(
      {viewport: {width: 390, height: 800}, intro: true},
      ({r, u}) => {
        localStorage.setItem('imr-tour', '"done"');
        localStorage.setItem('imr-nudge', '1');
        if (r && !localStorage.getItem('imr-recalc')) localStorage.setItem('imr-recalc', JSON.stringify(r));
        localStorage.getItem('imr-coral-progress') ||
          localStorage.setItem(
            'imr-coral-progress',
            JSON.stringify({Acropora: {ok: 3, ko: 1, h: '1101'}, Millepora: {ok: 2, ko: 0, h: '11'}})
          );
        localStorage.getItem('imr-coral-quiz') || localStorage.setItem('imr-coral-quiz', JSON.stringify({bu: u}));
      },
      {r: recalc, u: bu}
    );
    await p.goto(base);
    await p.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
    await p.waitForSelector('.recalc', {timeout: 8000}).catch(() => {});
    const r = await p.evaluate(() => ({
      h: [...document.querySelectorAll('.recalc h3')].map(x => x.textContent),
      bon: Q.bon,
      pct: progPct(),
      n: slateGenera().length,
      mill: genScore('Millepora') > 0
    }));
    // Latest first: the typed-questions announcement (2026-11-03), then Millepora, then the moving average if missed.
    const want = recalc ? 2 : 3;
    if (
      r.h.length !== want ||
      !/^Think you know your genera/.test(r.h[0]) ||
      !/^Millepora now counts/.test(r.h[1]) ||
      r.bon !== (bu > 1 ? true : undefined) ||
      r.n !== 40 ||
      !r.mill
    )
      fails.push(`returning player (seen ${recalc || 'none'}, bu ${bu}): ${JSON.stringify(r)}`);
    await p.click('.recalc .next').catch(() => {});
    await p.reload();
    await p.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
    await p.waitForTimeout(2500);
    if (await p.$('.recalc')) fails.push('recalculation pop-up shown twice');
    if (!recalc) {
      // Millepora met on its card (a slate genus: a card like the others) and its sheet: the warning.
      const w = await p.evaluate(() => {
        introShow(['Millepora'], false);
        const t = document.querySelector('.unlock.intro .warn')?.textContent || '';
        document.querySelector('.unlock.intro').ulClose();
        return t;
      });
      await p.evaluate(() => (location.hash = 'g-Millepora'));
      await p.waitForSelector('.sheet .warn');
      const s = await p.evaluate(() => document.querySelector('.sheet .warn').textContent);
      for (const [k, t] of [
        ['card', w],
        ['sheet', s]
      ])
        if (!/^Not a hard coral and not on the IMR coral list, but it's on the IMR benthic slate/.test(t))
          fails.push(`Millepora ${k} warning: ${t}`);
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
  // Out-of-game prompts take turns, counted in answers (2026-11-02): the sign-in card at 20 answers (not before), the
  // one-tap question first at 35, at least 10 answers between two of them, never with an achievement toast or a card on
  // screen. A new player, mostly right, 60 answers; toasts closed by a tap as they come.
  {
    const [c, p] = await open({viewport: {width: 390, height: 844}}, () => localStorage.setItem('imr-tour', '"done"'));
    await p.goto(base + '#quiz');
    await p.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
    const seenP = [];
    for (let i = 0; i < 60; i++) {
      await p.waitForSelector('#view [data-c]:not([disabled])');
      const r = await p.evaluate(i => {
        // A new genus's card is read and closed before answering, as a player does.
        document.querySelectorAll('.unlock.intro').forEach(x => (x.ulClose ? x.ulClose() : x.remove()));
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
  // The one-tap question's bank (core.js PULSEQ, 2026-11-03), on the narrowest phone (360 px) and on a desktop: the
  // first prompt at 35 answers asks the plain question; each prompt is a block of its own ("Quick question") on screen
  // above Next, never under it (a wrong answer now and then makes the feedback long), its answers on one row of equal
  // widths; it logs its showing (shown) with its item (src); an answer is one tap ("Thank you!" at once) and logs the
  // code tapped; every third prompt is left unanswered (Next) and logs none; the next prompt never asks the same item.
  // After the first, each prompt is made due by moving the device's last-prompt marks back (imr-prompt-at by
  // PROMPT.GAP, imr-pulse by PULSE.EVERY), the real code deciding.
  for (const [vw, vh] of [
    [360, 740],
    [1280, 800]
  ]) {
    const [c, p] = await open({viewport: {width: vw, height: vh}}, seen);
    await p.goto(base + '#quiz');
    await p.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
    const asked = [],
      pev = () => p.evaluate(() => JSON.parse(localStorage.getItem('imr-evq') || '[]').filter(x => x.k === 'pulse'));
    for (let i = 0; i < 60 && asked.length < 9; i++) {
      await p.waitForSelector('#view [data-c]:not([disabled])');
      const skip = asked.length % 3 === 2,
        before = (await pev()).length;
      const r = await p.evaluate(
        ([i, due, skip]) => {
          document.querySelectorAll('.unlock').forEach(x => (x.ulClose ? x.ulClose() : x.remove()));
          document.querySelectorAll('.achpop').forEach(x => x.remove());
          achQ.length = 0;
          achBusy = false;
          if (due) {
            const a = answersSoFar() + 1;
            localStorage.setItem('imr-prompt-at', JSON.stringify(a - PROMPT.GAP));
            localStorage.setItem('imr-pulse', JSON.stringify({...JSON.parse(localStorage.getItem('imr-pulse')), at: a - PULSE.EVERY}));
          }
          const t = SHOWNQ[1],
            cs = [...document.querySelectorAll('#view [data-c]')];
          (i % 4 === 3 ? cs.find(x => x.dataset.c !== t) : cs.find(x => x.dataset.c === t)).click();
          const box = document.querySelector('#after .pulse');
          if (!box) return null;
          const bs = [...box.querySelectorAll('.pulseb [data-pulse]')],
            b = bs[i % bs.length],
            it = PULSEQ.find(x => x.id === box.dataset.pq),
            nx = document.getElementById('next'),
            R = box.getBoundingClientRect(),
            N = nx.getBoundingClientRect(),
            B = bs.map(x => x.getBoundingClientRect());
          const shown = {
            a: answersSoFar(),
            q: box.dataset.pq,
            title: box.querySelector('.pulsek')?.textContent,
            text: box.querySelector('.pulseq')?.textContent,
            opts: bs.map(x => x.dataset.pulse),
            x: !!box.querySelector('.pulsex[data-pulse=""]'),
            // Before Next in the page and on screen, both in view without scrolling.
            before: !!(box.compareDocumentPosition(nx) & Node.DOCUMENT_POSITION_FOLLOWING) && R.bottom <= N.top + 1,
            inView: R.top >= 0 && N.bottom <= innerHeight + 1,
            // Each answer, and Next, is what a tap at its centre reaches: nothing covers it (Next, the tab bar), and it is
            // not scrolled out of the phone's sheet or the side column (a long feedback after a wrong answer).
            hit: [...B.map((x, k) => [bs[k], x]), [nx, N]].every(([el, x]) =>
              el.contains(document.elementFromPoint(x.left + x.width / 2, x.top + x.height / 2))
            ),
            // One row, equal widths.
            row: B.every(x => Math.abs(x.top - B[0].top) < 2 && Math.abs(x.width - B[0].width) < 2),
            tap: skip ? '' : b.dataset.pulse,
            // A tap on the question's text or the block itself is not a photo tap (Codex review #414: data-q on the block
            // sent it to the photo handler, which opened an empty enlarged view).
            panel: (box.querySelector('.pulseq').click(), box.click(), document.getElementById('lightbox').hidden)
          };
          if (!skip) b.click();
          return {...shown, want: it ? [it.q, it.a.map(x => x[0])] : null, thanks: box.textContent.trim()};
        },
        [i, asked.length > 0, skip]
      );
      await p.evaluate(() => document.getElementById('next').click());
      if (!r) continue;
      // What this prompt queued: its showing, then the code tapped or none (moved on without a tap).
      r.ev = (await pev()).slice(before).map(x => ({r: x.r, src: x.src, m: x.m, lv: typeof x.lv}));
      asked.push(r);
    }
    const bad = asked.filter(
      (x, k) =>
        !x.want ||
        x.title !== 'Quick question' ||
        x.text !== x.want[0] ||
        x.opts.join() !== x.want[1].join() ||
        !x.x ||
        !x.before ||
        !x.inView ||
        !x.hit ||
        !x.row ||
        !x.panel ||
        (x.tap && x.thanks !== 'Thank you!') ||
        x.ev.map(e => e.r).join() !== ['shown', x.tap || 'none'].join() ||
        x.ev.some(e => e.src !== x.q || e.m !== 'quiz' || e.lv !== 'number') ||
        (k && x.q === asked[k - 1].q)
    );
    // The first prompt at 35 answers, or a few later when an achievement toast it waits for came with that answer (the
    // wrong answers here move the toasts; the exact 35 is checked by the new-player run further down).
    const late = !asked.length || asked[0].a < 35 || asked[0].a > 40;
    if (asked.length < 9 || late || asked[0].q !== 'are' || bad.length || new Set(asked.map(x => x.q)).size < 5)
      fails.push(`${vw}px one-tap bank: ${JSON.stringify(asked.length < 9 || late ? asked : bad.length ? bad : asked.map(x => x.q))}`);
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
  // Custom quiz (quiz.js viewCustom, quizCustom; 2026-11-03), on a phone: nothing picked at first (Start off), A-Z, photos
  // picked and Clear all, a quick pick (a genus and its look-alikes), the IMR groups view and the search, the choice kept
  // after a reload (in the view left), then a dozen questions all on the genera picked, logged quiz|s…; the Practice tabs fit the width.
  {
    const [c, p] = await open({viewport: {width: 390, height: 844}}, seen);
    await p.goto(base + '#quiz-custom');
    await p.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
    await p.waitForSelector('.cqtile');
    const state = () =>
      p.evaluate(() => ({
        on: [...new Set([...document.querySelectorAll('.cqtile[aria-pressed="true"]')].map(b => b.dataset.g))].sort(),
        start: !document.querySelector('[data-start]').disabled,
        n: document.querySelector('.cqn b').textContent,
        shown: [...new Set([...document.querySelectorAll('.cqtile:not([hidden])')].map(b => b.dataset.g))],
        tabs: (m => m.scrollWidth <= m.clientWidth)(document.getElementById('modes')),
        heads: document.querySelectorAll('.cqg:not([hidden]) .cqh').length,
        tiles: [...document.querySelectorAll('.cqtile')].map(b => b.dataset.g)
      }));
    const s0 = await state();
    for (const g of ['Acropora', 'Pocillopora', 'Porites']) await p.click(`.cqtile[data-g="${g}"]`);
    const s1 = await state();
    await p.click('[data-clear]');
    const s2 = await state();
    await p.selectOption('#cqlk', 'Pocillopora');
    const s3 = await state(),
      looks = await p.evaluate(() => cqLooks('Pocillopora', pool()).sort());
    await p.click('[data-cv="imr"]');
    const s4 = await state();
    await p.fill('#cqq', 'acro');
    const s5 = await state();
    await p.reload();
    await p.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
    await p.waitForSelector('.cqtile');
    const s6 = await state();
    if (
      s0.on.length ||
      s0.heads || // A-Z by default: one grid, every genus in play once, in order (no grouping by growth form)
      s0.tiles.join() !== [...s0.tiles].sort((a, b) => a.localeCompare(b)).join() ||
      new Set(s0.tiles).size !== s0.tiles.length ||
      s0.start ||
      !s0.tabs ||
      s1.on.join() !== 'Acropora,Pocillopora,Porites' ||
      !s1.start ||
      s1.n !== '3 genera' ||
      s2.on.length ||
      s2.start ||
      s3.on.join() !== looks.join() ||
      looks.length < 2 ||
      s4.on.join() !== s3.on.join() ||
      s4.heads < 5 || // the IMR lecture groups, their genera in view
      [...s4.tiles].sort().join() !== [...s0.tiles].sort().join() ||
      s5.shown.some(g => !/acro/i.test(g)) ||
      !s5.shown.includes('Acropora') ||
      s6.on.join() !== looks.join() ||
      !s6.start
    )
      fails.push(`custom quiz selection: ${JSON.stringify({s0, s1, s2, s3, looks, s4, s5, s6})}`);
    await p.click('[data-start]');
    const asked = [],
      modes = [];
    for (let i = 0; i < 12; i++) {
      await p.waitForSelector('#view .q:not(.done)');
      const r = await p.evaluate(i => {
        document.querySelectorAll('.unlock').forEach(x => (x.ulClose ? x.ulClose() : x.remove()));
        const t = SHOWNQ[1],
          bs = [...document.querySelectorAll('#view [data-c]')];
        if (bs.length) (i % 4 === 3 ? bs.find(b => b.dataset.c !== t) : bs.find(b => b.dataset.c === t)).click();
        else {
          const f = document.querySelector('#view .tyform');
          f.querySelector('input').value = t;
          f.requestSubmit();
        }
        const L = store.get(LOG0, []);
        return {h: location.hash, t, m: (L[L.length - 1] || {}).m};
      }, i);
      asked.push(r.t);
      modes.push(r.m);
      if (r.h !== '#quiz-custom|play') fails.push(`custom quiz: question ${i + 1} on ${r.h}`);
      await p.click('#next');
    }
    if (asked.some(g => !looks.includes(g)) || modes.some(m => !/^quiz\|s(\||$)/.test(m || '')))
      fails.push(`custom quiz play: asked ${asked.join(', ')} (picked ${looks.join(', ')}); logged ${modes.join(', ')}`);
    await c.close();
  }
  // The Practice tabs (app.js MODES; Pierre, 2026-11-03: "Photo → genus" became Quiz, "Custom" Custom quiz): their names
  // at each size class, all four in the bar without scrolling it at 360 and 390 px (rule 20), the tab of the page
  // marked, and the old addresses (#quiz, #quiz-custom|play) still landing on their tab.
  for (const [w, want] of [
    [360, 'Quiz|Custom quiz|Duels|Memory'],
    [390, 'Quiz|Custom quiz|Duels|Memory'],
    [1280, 'Quiz|Custom quiz|Look-alike duels|Memory']
  ]) {
    const [c, p] = await open({viewport: {width: w, height: 800}}, seen);
    for (const [h, on] of [
      ['quiz', 'Quiz'],
      ['quiz-custom|play', 'Custom quiz']
    ]) {
      await p.goto(base + '#' + h);
      await p.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
      await p.evaluate(() => document.fonts.ready);
      const t = await p.evaluate(() => {
        const m = document.getElementById('modes'),
          A = [...m.querySelectorAll('a')];
        return {
          names: A.map(a => a.innerText.trim()).join('|'),
          on: (m.querySelector('[aria-current="page"]') || {}).innerText,
          fit: m.scrollWidth <= m.clientWidth && A.every(a => a.getBoundingClientRect().right <= innerWidth),
          w: [m.scrollWidth, m.clientWidth]
        };
      });
      if (t.names !== want || t.on !== on || !t.fit) fails.push(`${w}px Practice tabs on #${h}: ${JSON.stringify(t)}`);
    }
    await c.close();
  }
  return fails;
}

// Signing in to an existing account (Pierre, 2026-11-03: players type only their first name, so two of them can pick the
// same name, even the same simple code). The sheet is never reached (AGENTS.md rule 13): every request to the sync
// script is answered inside the page by a wrapped fetch (SHEET below), a route answers the same way, and the script's
// hosts are mapped to this computer. Checks: a name taken with another code says so and suggests the initial; an
// existing account asks "Is it you?" with its answers and last play, on a device with progress of its own and on a fresh
// one; No merges, saves and sends nothing and puts the cursor back in the name; Yes signs in and merges; a new name
// signs in at once; the tour's sign-in step asks the same. Returns the failures.
const SHEET = () => {
  const reply = (u, o) => {
    const q = new URL(String(u)).searchParams,
      body = o && o.body ? JSON.parse(o.body) : null,
      log = JSON.parse(localStorage.getItem('test-sheet-log') || '[]');
    log.push(body ? {post: 1, name: body.name || '', data: !!body.data} : {get: 1, name: q.get('name') || ''});
    localStorage.setItem('test-sheet-log', JSON.stringify(log));
    const at = Date.parse('2026-10-20T09:30:00Z'),
      account = {
        'imr-coral-progress': JSON.stringify({'~level': {ok: 200, ko: 45, th: 0.4, at}, Acropora: {ok: 30, ko: 5, th: 0.3, at}}),
        'imr-coral-quiz': '{"bon":false}'
      };
    if (body) return body.name ? {ok: true, log: true, rev: 4} : {ok: false, error: 'input'};
    if (!q.get('name')) return {ok: false};
    if (q.get('name').toLowerCase() !== 'anna') return {ok: true, found: false};
    if (q.get('pin') !== '1234') return {ok: false, error: 'pin'};
    return {ok: true, found: true, updated: '2026-10-20T10:00:00.000Z', rev: 3, data: account};
  };
  const f = window.fetch,
    answer = (u, o) =>
      Promise.resolve(new Response(JSON.stringify(reply(String((u && u.url) || u), o)), {headers: {'Content-Type': 'application/json'}}));
  // Signing in, saving and loading go through app.js sheetFetch, which a local copy answers only from SHEET_STUB.
  window.SHEET_STUB = answer;
  window.fetch = (u, o) => (/script\.google/.test(String((u && u.url) || u)) ? answer(u, o) : f(u, o));
};
async function signin(base) {
  const fails = [],
    bs = await chromium.launch({
      args: ['--host-resolver-rules=MAP script.google.com 127.0.0.1, MAP script.googleusercontent.com 127.0.0.1']
    });
  const open = async (init, hash = '') => {
    const c = await bs.newContext({viewport: {width: 390, height: 800}, serviceWorkers: 'block'});
    await c.addInitScript(SHEET);
    await c.addInitScript(init || (() => {}));
    await c.route(
      u => !u.href.startsWith(base),
      async r => {
        const u = r.request().url();
        if (!/script\.google/.test(u)) return r.abort();
        fails.push('sign-in: a sync request escaped the wrapped fetch: ' + u.slice(0, 80));
        r.fulfill({contentType: 'application/json', body: '{"ok":false,"error":"input"}'});
      }
    );
    const p = await c.newPage();
    p.on('pageerror', e => fails.push('sign-in page error: ' + e.message));
    p.setDefaultTimeout(8000);
    await p.goto(base + hash);
    await p.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
    return [c, p];
  };
  // One scenario in a fresh browser context; a step that cannot run (a button missing) is a failure, not a crash.
  const run = async (init, fn) => {
    const [c, p] = await open(init);
    try {
      await fn(p);
    } catch (e) {
      fails.push('sign-in: ' + String(e.message).split('\n')[0]);
    }
    await c.close();
  };
  const seen = () => {
    if (!localStorage.getItem('imr-tour')) localStorage.setItem('imr-tour', '"done"');
    localStorage.setItem('imr-nudge', '1');
  };
  const card = async p => {
    await p.evaluate(() => document.querySelectorAll('.recalc .next').forEach(x => x.click())); // a later note, if any
    await p.click('#signb');
    await p.waitForSelector('.signnudge form.sform', {timeout: 5000});
  };
  const submit = async (p, name, pin) => {
    await p.fill('.signnudge input[name=n]', name);
    await p.fill('.signnudge input[name=p]', pin);
    await p.click('.signnudge form.sform button[type=submit]');
  };
  const state = p =>
    p.evaluate(() => ({
      sync: localStorage.getItem('imr-coral-sync'),
      log0: JSON.parse(localStorage.getItem('imr-log0') || '[]').length,
      prog: JSON.parse(localStorage.getItem('imr-coral-progress') || '{}'),
      posts: JSON.parse(localStorage.getItem('test-sheet-log') || '[]').filter(x => x.post && x.name)
    }));
  // A device with progress of its own (3 answers played signed out).
  await run(
    () => {
      localStorage.setItem('imr-tour', '"done"');
      localStorage.setItem('imr-nudge', '1');
      localStorage.setItem('imr-recalc', '"typed-questions-2026-11"'); // the last update note: seen
      if (localStorage.getItem('test-own')) return;
      localStorage.setItem('test-own', '1');
      const t = new Date().toISOString();
      localStorage.setItem(
        'imr-log0',
        JSON.stringify([1, 2, 3].map(i => ({id: 'own' + i, t, g: 'Porites', a: 'Porites', ok: 1, m: 'quiz'})))
      );
      localStorage.setItem('imr-coral-progress', JSON.stringify({Porites: {ok: 3, ko: 0, th: 0.2}}));
    },
    async p => {
      await card(p);
      const ph = await p.getAttribute('.signnudge input[name=n]', 'placeholder');
      if (!/initial/i.test(ph || '')) fails.push(`sign-in: the name field does not ask for the initial (placeholder "${ph}")`);
      // A name taken with another code.
      await submit(p, 'Anna', '9999');
      await p
        .waitForFunction(() => /Someone already uses/.test(document.querySelector('.signnudge [role=status]').textContent), null, {
          timeout: 5000
        })
        .catch(() => {});
      const pin = await p.textContent('.signnudge [role=status]');
      if (!/Someone already uses the name Anna\. If it isn't you, add your surname's initial \(Anna B\.\)/.test(pin))
        fails.push(`sign-in: name taken with another code says "${pin}"`);
      // The right code: "Is it you?" with the account's numbers, nothing merged yet.
      await submit(p, 'Anna', '1234');
      await p.waitForSelector('.signnudge .sconfirm', {timeout: 5000}).catch(() => {});
      const ask = await p.evaluate(() => (document.querySelector('.signnudge .tsync') || {}).textContent || '');
      if (!/Is it you\?/.test(ask) || !/An account named Anna already exists: 245 answers, last played 20 Oct( 2026)?\./.test(ask))
        fails.push(`sign-in: no "Is it you?" with the account's numbers: "${ask.replace(/\s+/g, ' ').slice(0, 200)}"`);
      if (!/3 answers played on this device join it/.test(ask))
        fails.push('sign-in: the question does not say this device has 3 answers to add');
      let s = await state(p);
      if (s.sync || s.posts.length) fails.push('sign-in: something was saved or sent before the answer to "Is it you?"');
      // No: nothing merged, saved or sent; the form again, the name focused, the hint.
      await p.click('.signnudge .sconfirm button[type=button]');
      await p.waitForTimeout(1500);
      s = await state(p);
      const back = await p.evaluate(() => ({
        focus: document.activeElement && document.activeElement.name,
        name: (document.querySelector('.signnudge input[name=n]') || {}).value,
        hint: (document.querySelector('.signnudge [role=status]') || {}).textContent
      }));
      if (s.sync || s.posts.length || s.log0 !== 3 || Object.keys(s.prog).join() !== 'Porites' || s.prog.Porites.ok !== 3)
        fails.push(`sign-in: "No, it's someone else" changed this device or sent progress: ${JSON.stringify(s).slice(0, 200)}`);
      if (back.focus !== 'n' || back.name !== 'Anna' || !/Anna B\./.test(back.hint || ''))
        fails.push(`sign-in: after "No", not back on the name with the hint: ${JSON.stringify(back)}`);
      // Yes: signed in, this device's answers merged into the account, then sent.
      await submit(p, 'Anna', '1234');
      await p.waitForSelector('.signnudge .sconfirm', {timeout: 5000}).catch(() => {});
      await Promise.all([p.waitForNavigation({timeout: 15000}).catch(() => {}), p.click('.signnudge .sconfirm button[type=submit]')]);
      await p.waitForFunction(() => window.APP_READY, null, {timeout: 30000}).catch(() => {});
      await p
        .waitForFunction(() => JSON.parse(localStorage.getItem('test-sheet-log') || '[]').some(x => x.post && x.name === 'Anna'), null, {
          timeout: 15000
        })
        .catch(() => {});
      s = await state(p);
      const sy = JSON.parse(s.sync || 'null');
      if (!sy || sy.name !== 'Anna' || !s.prog.Porites || !s.prog.Acropora || (s.prog['~level'] || {}).ok !== 200 || !s.posts.length)
        fails.push(
          `sign-in: "Yes, it's me" did not sign in and merge: ${JSON.stringify({sync: !!sy, prog: Object.keys(s.prog), posts: s.posts.length})}`
        );
    }
  );
  // A fresh device: the question too (Pierre, 2026-11-03: everyone confirms the account), with no "this device" line.
  await run(seen, async p => {
    await card(p);
    await submit(p, 'anna', '1234');
    await p.waitForSelector('.signnudge .sconfirm', {timeout: 5000}).catch(() => {});
    const ask = await p.evaluate(() => (document.querySelector('.signnudge .tsync') || {}).textContent || '');
    if (!/Is it you\?/.test(ask)) fails.push('sign-in: a fresh device entered an existing account without "Is it you?"');
    if (/on this device/.test(ask)) fails.push('sign-in: a fresh device is told it has answers to add');
    await p.click('.signnudge .sconfirm button[type=button]');
    await p.waitForTimeout(1000);
    const s = await state(p);
    if (s.sync || s.posts.length || Object.keys(s.prog).length) fails.push('sign-in: "No" on a fresh device saved or sent something');
    // A new name: signed in at once, no question.
    await submit(p, 'Anna B.', '1234');
    await p.waitForFunction(() => !!localStorage.getItem('imr-coral-sync'), null, {timeout: 10000}).catch(() => {});
    const n = await state(p);
    if (!n.sync || JSON.parse(n.sync).name !== 'Anna B.' || (await p.$('.signnudge .sconfirm')))
      fails.push('sign-in: a new name did not sign in at once');
  });
  // The tour's sign-in step: the same question.
  await run(
    () => localStorage.setItem('imr-nudge', '1'),
    async p => {
      await p.waitForSelector('#tour .tnext', {timeout: 10000}).catch(() => {});
      for (let k = 0; k < 4 && !(await p.$('#tour .tsync form')); k++) await p.click('#tour .tnext');
      if (await p.$('#tour .tsync form')) {
        await p.fill('#tour .tsync input[name=n]', 'Anna');
        await p.fill('#tour .tsync input[name=p]', '1234');
        await p.click('#tour .tsync button[type=submit]');
        await p.waitForSelector('#tour .tsync .sconfirm', {timeout: 5000}).catch(() => {});
        if (!(await p.$('#tour .tsync .sconfirm'))) fails.push('sign-in: the tour\'s sign-in step does not ask "Is it you?"');
      } else fails.push("sign-in: the tour's sign-in step was not found");
    }
  );
  await bs.close();
  return fails;
}

// The sheet's full replay adopted by the app (sync.js replayAdopt; Pierre, 2026-11-03: progress recalculated from the
// whole answer log, automatically). Nothing reaches the sheet (AGENTS.md rule 13): every sync request is answered in the
// page (a wrapped fetch and SHEET_STUB), a route answers any that escapes, and the script's hosts are mapped to this
// computer. A stale signed-in device (its copy saved under older rules, one answer of its own not sent yet) loads:
// it adopts the replay the sheet sends (the replayed record, its own answer replayed on top), saves and sends it, with
// no card for a version without msg; the next load does not adopt it again. A device that last applied the previous
// version, served a core.js with one more version that has a msg: the card at once, over Home, once.
const C = require('../core.js');
const RGEN = (d => {
  const out = {};
  [d.gen, d.x.gen].forEach(G => Object.keys(G).forEach(n => out[n] || (out[n] = {look: G[n].look || [], fam: String(G[n].fam || '')})));
  return out;
})(require('../data.json'));
async function replayAdoptCheck(base) {
  const fails = [],
    bs = await chromium.launch({
      args: ['--host-resolver-rules=MAP script.google.com 127.0.0.1, MAP script.googleusercontent.com 127.0.0.1']
    });
  const T = i => new Date(Date.UTC(2026, 10, 3, 5, i)).toISOString(),
    ch = 'Acropora Montipora Porites Pocillopora',
    A = (id, i, g, a, ph) => ({id, t: T(i), g, a, ok: g === a ? 1 : 0, m: 'quiz', ph, e: 0.8, th: 1, nw: 1, ch}),
    sheet = [
      A('s1', 1, 'Acropora', 'Acropora', 'acropora-wide-745675208'),
      A('s2', 2, 'Porites', 'Porites', 'porites-wide-1'),
      A('s3', 3, 'Acropora', 'Montipora', 'acropora-wide-745206089')
    ],
    mine = A('m1', 4, 'Acropora', 'Acropora', 'acropora-wide-745675208'),
    rec = C.replayProgress(
      sheet.map(a => C.logRow(a, 'ana')),
      {gen: RGEN}
    ).ana.P,
    all = C.replayProgress(
      [...sheet, mine].map(a => C.logRow(a, 'ana')),
      {gen: RGEN}
    ).ana.P,
    // The sheet's copy, saved under the older rules (wrong bars), and this device's: the same plus its unsent answer.
    old = {
      Acropora: {ok: 1, ko: 1, streak: 0, h: '10', pg: 0.5, th: 0.2, at: Date.parse(T(3))},
      Montipora: {ok: 0, ko: 0, streak: 0, h: '0', pg: 0.1},
      Porites: {ok: 1, ko: 0, streak: 1, h: '1', pg: 0.6, th: 0.3, dd: 1, dl: 20395},
      '~level': {ok: 2, ko: 1, th: 0.1, at: Date.parse(T(3))}
    },
    dev = JSON.parse(JSON.stringify(old));
  Object.assign(dev.Acropora, {ok: 2, streak: 1, h: '101', pg: 0.6});
  Object.assign(dev['~level'], {ok: 3});
  const STUB = ([rec, data, rv, sv]) => {
    const f = window.fetch,
      reply = (u, o) => {
        const q = new URL(String(u)).searchParams,
          body = o && o.body ? JSON.parse(o.body) : null,
          log = JSON.parse(localStorage.getItem('test-sheet-log') || '[]');
        if (body ? !body.name : q.get('name') !== 'Ana') return {ok: false};
        log.push(body ? {post: 1, rv: body.rv, data: body.data && body.data['imr-coral-progress']} : {get: 1, rv: q.get('rv')});
        localStorage.setItem('test-sheet-log', JSON.stringify(log));
        // The replay comes with every reply, whatever rv the app sends: the app must not adopt it twice. A test can
        // change it (test-rec) to see whether it is adopted again. The sheet keeps what was last sent.
        const replay = {rv, n: 3, rec: JSON.parse(localStorage.getItem('test-rec') || 'null') || rec, ids: ['s1', 's2', 's3']},
          rev = Number(localStorage.getItem('test-rev') || 4);
        if (body) {
          localStorage.setItem('test-data', JSON.stringify(body.data));
          localStorage.setItem('test-rev', String(rev + 1));
          return {ok: true, log: true, rev: rev + 1, replay, v: sv};
        }
        return {
          ok: true,
          found: true,
          updated: '2026-11-03T05:03:00.000Z',
          rev,
          data: JSON.parse(localStorage.getItem('test-data') || 'null') || data,
          replay,
          v: sv
        };
      },
      answer = (u, o) =>
        Promise.resolve(new Response(JSON.stringify(reply(String((u && u.url) || u), o)), {headers: {'Content-Type': 'application/json'}}));
    window.SHEET_STUB = answer;
    window.fetch = (u, o) => (/script\.google/.test(String((u && u.url) || u)) ? answer(u, o) : f(u, o));
  };
  // sv: the sheet script version the stub answers as (the replay from v28, core.js RV_SHEET).
  const open = async (rv, core, sv = C.RV_SHEET) => {
    const c = await bs.newContext({viewport: {width: 390, height: 800}, serviceWorkers: 'block'});
    await c.addInitScript(STUB, [rec, data, core ? C.RV + 1 : C.RV, sv]);
    await c.addInitScript(init, [old, dev, mine, rv, data]);
    await c.route(
      u => !u.href.startsWith(base),
      async r => {
        const u = r.request().url();
        if (!/script\.google/.test(u)) return r.abort();
        fails.push('replay: a sync request escaped the wrapped fetch: ' + u.slice(0, 80));
        r.fulfill({contentType: 'application/json', body: '{"ok":false,"error":"input"}'});
      }
    );
    if (core) await c.route(/\/core\.js(\?|$)/, r => r.fulfill({contentType: 'text/javascript', body: core}));
    const p = await c.newPage();
    p.on('pageerror', e => fails.push('replay page error: ' + e.message));
    p.setDefaultTimeout(8000);
    await p.goto(base);
    await p.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
    return [c, p];
  };
  const data = {'imr-coral-progress': JSON.stringify(old), 'imr-coral-quiz': '{"bon":false}'};
  const init = ([old, dev, mine, rv, data]) => {
    if (localStorage.getItem('test-init')) return;
    localStorage.setItem('test-init', '1');
    localStorage.setItem('imr-tour', '"done"');
    localStorage.setItem('imr-nudge', '1');
    localStorage.setItem('imr-recalc', '"millepora-counts-2026-11"');
    localStorage.setItem('imr-coral-progress', JSON.stringify(dev));
    localStorage.setItem('imr-coral-sync', JSON.stringify({name: 'Ana', pin: '1234', srv: 4, base: old, log: [mine], dirty: true, rev: 1}));
    if (rv) localStorage.setItem('imr-coral-rv', String(rv));
    // The account's saved copy is at that rules version too (sync.js mergeSaved: an older one makes the device adopt
    // again from 0, with version 1's card when its % moved).
    if (rv) localStorage.setItem('test-data', JSON.stringify({...data, 'imr-coral-rv': String(rv)}));
  };
  const posted = p =>
    p
      .waitForFunction(() => JSON.parse(localStorage.getItem('test-sheet-log') || '[]').some(x => x.post), null, {timeout: 15000})
      .catch(() => {});
  // The app never gets ahead of the sheet script (AGENTS.md 7a): a script before v28 (even one whose reply carried a
  // replay) changes nothing: the device keeps its own progress, sends its answer as before, records no rules version
  // and shows no card.
  {
    const [c, p] = await open(0, null, C.RV_SHEET - 1);
    await posted(p);
    await p.waitForTimeout(500);
    const s = await p.evaluate(() => ({
      P: JSON.parse(localStorage.getItem('imr-coral-progress') || '{}'),
      rv: localStorage.getItem('imr-coral-rv'),
      pending: (JSON.parse(localStorage.getItem('imr-coral-sync') || '{}').log || []).length,
      card: !!document.querySelector('.rvmsg')
    }));
    const a = s.P.Acropora || {};
    if (a.pg !== dev.Acropora.pg || a.ok !== 2 || 'rv' in a || s.rv || s.pending || s.card)
      fails.push(`replay: adopted from a script before v${C.RV_SHEET}: ${JSON.stringify({a, rv: s.rv, pending: s.pending, card: s.card})}`);
    // A card with only: 'changed' is due only when the progress % moved (progress.js rvNoticeAdd).
    const due = await p.evaluate(v => {
      const d = [];
      for (const pct of [
        [10, 10],
        [10, 9]
      ]) {
        localStorage.removeItem('imr-rv-msg');
        rvNoticeAdd(0, v, pct);
        d.push(JSON.parse(localStorage.getItem('imr-rv-msg')).due);
        document.querySelectorAll('.rvmsg').forEach(e => e.remove());
      }
      localStorage.removeItem('imr-rv-msg');
      return d;
    }, C.RV);
    if (due[0].length || !due[1].includes(C.RV)) fails.push(`replay: the card's only-when-changed rule: ${JSON.stringify(due)}`);
    await c.close();
  }
  // A stale device: the replay adopted once, its own answer on top.
  {
    const [c, p] = await open(0, null);
    await posted(p);
    await p.waitForTimeout(500);
    const s = await p.evaluate(() => ({
      P: JSON.parse(localStorage.getItem('imr-coral-progress') || '{}'),
      rv: localStorage.getItem('imr-coral-rv'),
      log: JSON.parse(localStorage.getItem('test-sheet-log') || '[]'),
      pending: (JSON.parse(localStorage.getItem('imr-coral-sync') || '{}').log || []).length,
      card: !!document.querySelector('.rvmsg'),
      text: (document.querySelector('.rvmsg p:not(.ulkick)') || {}).textContent || '',
      rvm: JSON.parse(localStorage.getItem('imr-rv-msg') || '{}'),
      pct: genScore('Acropora')
    }));
    const a = s.P.Acropora || {};
    if (Math.abs((a.pg || 0) - all.Acropora.pg) > 1e-9 || a.ok !== 2 || a.ko !== 1 || a.th !== all.Acropora.th)
      fails.push(
        `replay: the device did not end with the replayed record and its own answer on top: ${JSON.stringify(a)} vs ${all.Acropora.pg}`
      );
    if (a.rv !== C.RV || a.pm !== 1 || s.rv !== String(C.RV)) fails.push(`replay: rules version not recorded: ${s.rv} ${a.rv} ${a.pm}`);
    if (!s.P.Porites || s.P.Porites.dd !== 1 || s.P.Porites.pg !== all.Porites.pg)
      fails.push('replay: the days answered right were not kept');
    if ((s.P['~level'] || {}).ok !== 3 || (s.P['~level'] || {}).th !== all['~level'].th) fails.push('replay: global level not replayed');
    if (Math.abs(s.pct - C.scoreOf(all.Acropora)) > 1e-9) fails.push('replay: the bar does not show the replayed progress');
    const gets = s.log.filter(x => x.get),
      last = s.log.filter(x => x.post && x.data).pop();
    if (!gets.length || gets[0].rv !== '0') fails.push(`replay: the first load did not say rv 0: ${JSON.stringify(gets[0])}`);
    if (!last || Math.abs(JSON.parse(last.data).Acropora.pg - all.Acropora.pg) > 1e-9)
      fails.push('replay: the adopted progress was not sent');
    if (s.pending) fails.push('replay: its own answer was not sent');
    // Version 1's card is due only when the replay moved the progress % (Pierre, 2026-11-03), and says the two % (it
    // may wait behind the learned-mark card).
    const [pf, pt] = (s.rvm.pct || {})[C.RV] || [];
    if ((s.rvm.due || []).includes(C.RV) !== (pf !== undefined && pf !== pt) || (s.card && !s.text.includes(`went from ${pf}% to ${pt}%`)))
      fails.push(`replay: the recalculation card: ${JSON.stringify({card: s.card, text: s.text, rvm: s.rvm})}`);
    // The next load: not adopted again (the sheet now sends another record: the progress stays), and the load says the
    // version applied.
    await p.evaluate(rec => {
      rec.Acropora.pg = 0.01;
      localStorage.setItem('test-rec', JSON.stringify(rec));
      localStorage.setItem('test-sheet-log', '[]');
    }, rec);
    await p.reload();
    await p.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
    await p
      .waitForFunction(() => JSON.parse(localStorage.getItem('test-sheet-log') || '[]').some(x => x.get), null, {timeout: 15000})
      .catch(() => {});
    await p.waitForTimeout(800);
    const t = await p.evaluate(() => ({
      P: JSON.parse(localStorage.getItem('imr-coral-progress')),
      log: JSON.parse(localStorage.getItem('test-sheet-log'))
    }));
    if (Math.abs(t.P.Acropora.pg - all.Acropora.pg) > 1e-9) fails.push(`replay: adopted again at the next load: ${t.P.Acropora.pg}`);
    if (!t.log.some(x => x.get && x.rv === String(C.RV)))
      fails.push(`replay: the next load did not say rv ${C.RV}: ${JSON.stringify(t.log)}`);
    await c.close();
  }
  // A version with a msg, skipped by this device: its card at once, over Home, once. The device has not seen the
  // last update note (progress.js RECALC, the typed-questions announcement) either: both cards, one after the other,
  // neither lost (the note first: recalcNotice runs first at start-up; the version's card waits for any card on screen).
  {
    const fs = require('fs'),
      src = fs.readFileSync(path.join(ROOT, 'core.js'), 'utf8'),
      next = C.RV + 1,
      core = src.replace(
        '  const RV = RVS[RVS.length - 1].v;',
        `  RVS.push({v: ${next}, at: '2099-01-01', why: 'smoke test', msg: {t: 'A test update', p: 'Test words for the card.'}});\n  const RV = RVS[RVS.length - 1].v;`
      );
    if (core === src) fails.push('replay: could not add a version to core.js');
    const [c, p] = await open(C.RV, core);
    await p.waitForSelector('.unlock.recalc', {timeout: 15000}).catch(() => {});
    const note = await p.evaluate(() => ({n: document.querySelectorAll('.unlock').length, rv: !!document.querySelector('.rvmsg')}));
    if (note.n !== 1 || note.rv) fails.push(`replay: the update note and the version's card not one at a time: ${JSON.stringify(note)}`);
    await p.click('.unlock.recalc .next').catch(() => fails.push('replay: no update note before the version card'));
    await p.waitForSelector('.unlock.rvmsg', {timeout: 15000}).catch(() => {});
    const card = await p.evaluate(() => {
      const d = document.querySelector('.unlock.rvmsg');
      return d && {t: d.querySelector('h3').textContent, n: document.querySelectorAll('.unlock').length, page: location.hash};
    });
    if (!card || card.t !== 'A test update') fails.push(`replay: no card for the version with a msg: ${JSON.stringify(card)}`);
    if (card) await p.click('.unlock.rvmsg .next');
    await p.reload();
    await p.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
    await p.waitForTimeout(2500);
    if (await p.$('.unlock.rvmsg, .unlock.recalc')) fails.push('replay: a card came back after it was seen');
    await c.close();
  }
  await bs.close();
  return fails;
}

// Coral basics on a phone and a tablet (Codex on PR #405): the teaching photo leaves room on screen (at most 45% of its
// height), each check (photo, answers, feedback) fits between the header and the tab bar once answered (rule 17), and
// every photo of a check gets the games' clickable source once answered (rule 11, photoSrc). Returns the failures.
async function basicsFit(b, base) {
  const fails = [];
  for (const [w, h] of [
    [390, 844],
    [768, 1024]
  ]) {
    const c = await b.newContext({viewport: {width: w, height: h}, serviceWorkers: 'block'});
    await c.route(
      u => !u.href.startsWith(base),
      r => r.abort()
    );
    await c.addInitScript(() => {
      localStorage.setItem('imr-tour', '"done"');
      localStorage.setItem('imr-nudge', '1');
    });
    const p = await c.newPage();
    await p.goto(base + '#lab');
    await p.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
    for (const st of ['colony', 'polyp', 'corallite', 'septa', 'teeth', 'walls', 'forms']) {
      await p.evaluate(s => {
        localStorage.removeItem('imr-basics');
        location.hash = 'lab-basics|' + s;
      }, st);
      await p.waitForSelector('.bx-q .choice, .bx-q .bx-tap', {timeout: 15000});
      const r = await p.evaluate(st => {
        const q = document.querySelector('.bx-q');
        if (st === 'corallite') {
          const ph = q.querySelector('.bx-tap'),
            r = ph.getBoundingClientRect();
          ph.dispatchEvent(new MouseEvent('click', {clientX: r.left + r.width * 0.587, clientY: r.top + r.height * 0.485, bubbles: true}));
        } else q.querySelector('.choice').click();
        const top = document.querySelector('header').getBoundingClientRect().bottom,
          tabs = document.querySelector('nav.sections'),
          tb = tabs && getComputedStyle(tabs).position === 'fixed' ? tabs.getBoundingClientRect().top : innerHeight;
        const sum = document.querySelector('.bx-check summary').getBoundingClientRect(),
          fb = q.querySelector('.bx-fb').getBoundingClientRect();
        return {
          photo: Math.max(0, ...[...document.querySelectorAll('.bx-fig .bx-ph')].map(e => e.getBoundingClientRect().height)),
          check: Math.round(fb.bottom - sum.top),
          room: Math.round(tb - top),
          photos: q.querySelectorAll('img').length,
          srcs: q.querySelectorAll('.psrc').length
        };
      }, st);
      if (r.photo > 0.45 * h)
        fails.push(`${w}x${h} Coral basics ${st}: teaching photo ${Math.round(r.photo)} px tall, over 45% of the screen`);
      if (r.check > r.room) fails.push(`${w}x${h} Coral basics ${st}: the answered check takes ${r.check} px, only ${r.room} px on screen`);
      if (r.srcs < r.photos) fails.push(`${w}x${h} Coral basics ${st}: ${r.photos} check photos, ${r.srcs} source pills after the answer`);
    }
    await c.close();
  }
  return fails;
}

(async () => {
  await new Promise(ok => server.listen(0, '127.0.0.1', ok));
  const base = `http://127.0.0.1:${server.address().port}/`,
    fails = [];
  // PAGES_ONLY=replay: only the full replay check (replayAdoptCheck), while working on it.
  if (process.env.PAGES_ONLY === 'replay') {
    const f = await replayAdoptCheck(base);
    server.close();
    if (f.length) {
      console.error(f.join('\n'));
      process.exit(1);
    }
    return console.log('Replay adoption OK.');
  }
  const b = await chromium.launch();
  // The first-encounter card (quiz.js introShow) would cover the quiz in the checks that are not about it: every slate
  // genus (Millepora too, app.js BENTHIC) starts as met on a card, except in a context opened with {intro: true}; the
  // bonus genera offer that then comes (every slate genus met) is answered "Not now" (Q.bon false).
  const INTROS = JSON.stringify(Object.fromEntries([...Object.keys(require('../data.json').gen), 'Millepora'].map(n => [n, [0, 1]]))),
    ctxNew = b.newContext.bind(b);
  b.newContext = async ({intro, ...o} = {}) => {
    const c = await ctxNew(o);
    if (!intro)
      await c.addInitScript(s => {
        try {
          localStorage.getItem('imr-coral-intro') || localStorage.setItem('imr-coral-intro', s);
          localStorage.getItem('imr-coral-quiz') || localStorage.setItem('imr-coral-quiz', '{"bon":false}');
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
    // The plain sentence (Pierre, 2026-11-03): on a genus sheet, right after the photo and before the ID tips, with no label.
    await p.evaluate(() => (location.hash = 'g-Goniastrea'));
    await p.waitForTimeout(700);
    const pl = await p.evaluate(() => {
      const e = document.querySelector('#view .sheet .plainw'),
        ph = document.querySelector('#view .sheet .hero-ph'),
        tips = document.querySelector('#view .sheet .tipbox'),
        after = (a, b) => !!(a && b && a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
      return {
        text: e ? e.textContent : '',
        want: DATA.gen.Goniastrea.plain,
        afterPhoto: after(ph, e),
        beforeTips: after(e, tips),
        label: !!(e && e.querySelector('b'))
      };
    });
    if (pl.text !== pl.want || !pl.afterPhoto || !pl.beforeTips || pl.label)
      fails.push(`${w}px genus sheet plain line: ${JSON.stringify(pl)}`);
    for (const h of ROUTES) {
      errs.length = 0;
      await p.evaluate(h => {
        location.hash = h;
      }, h);
      await p.waitForTimeout(700);
      if (errs.length) fails.push(`${w}px #${h}: ${errs.slice(0, 3).join(' | ')}`);
    }
    // Coral basics: every kind of check offers the app's report once answered (rule 11b; Codex on PR #405), and a
    // classified photo opens the enlarged view.
    for (const st of ['colony', 'septa', 'teeth', 'walls', 'forms', 'corallite']) {
      errs.length = 0;
      await p.evaluate(s => {
        localStorage.removeItem('imr-basics');
        location.hash = 'lab-basics|' + s;
      }, st);
      await p.waitForSelector('.bx-q .choice, .bx-q .bx-tap', {timeout: 15000});
      if (st === 'corallite')
        await p.evaluate(() => {
          const ph = document.querySelector('.bx-tap'),
            r = ph.getBoundingClientRect();
          ph.dispatchEvent(new MouseEvent('click', {clientX: r.left + r.width * 0.587, clientY: r.top + r.height * 0.485, bubbles: true}));
        });
      // DOM clicks: in this context the welcome tour may still be open over the page.
      else await p.evaluate(() => document.querySelector('.bx-q .choice').click());
      if (!(await p.$('.bx-q .bx-fb [data-rep]'))) fails.push(`${w}px Coral basics ${st}: no report button after the answer`);
      if (st === 'walls') {
        await p.evaluate(() => document.querySelector('.bx-q .bx-cph').click());
        const lb = await p.evaluate(() => !document.getElementById('lightbox').hidden && !!document.querySelector('#lightbox [data-rep]'));
        if (!lb) fails.push(`${w}px Coral basics walls: the check photo does not open the enlarged view with its report`);
        await p.evaluate(() => document.querySelector('#lightbox [data-x]')?.click());
      }
      if (errs.length) fails.push(`${w}px Coral basics ${st}: ${errs.slice(0, 3).join(' | ')}`);
    }
    // Glossary words (beginner review 2026-11-03): the Genera cards' tips are glossed, and the lecture group titles are no
    // glossary word (they looked tappable and did nothing); a term in a card opens its definition, not the sheet.
    await p.evaluate(() => (location.hash = 'genera'));
    await p.waitForTimeout(600);
    const gl = await p.evaluate(() => {
      const t = document.querySelector('#view .card .gt');
      if (t) t.click();
      return {
        titles: document.querySelectorAll('#view .gdiv .gt').length,
        cards: !!t,
        def: !document.querySelector('.gpop').hidden && /\S/.test(document.querySelector('.gpop').textContent),
        h: location.hash
      };
    });
    if (gl.titles || !gl.cards || !gl.def || gl.h !== '#genera') fails.push(`${w}px Genera glossary: ${JSON.stringify(gl)}`);
    // The Coral Finder's "on the slate" count is the app's (slateGenera: Millepora in), not a count of its own.
    await p.evaluate(() => (location.hash = 'finder'));
    await p.waitForTimeout(600);
    const fd = await p.evaluate(() => [document.querySelector('[data-show]')?.textContent || '', slateGenera().length]);
    if (!fd[0].includes(`(${fd[1]} on the slate)`)) fails.push(`${w}px Coral Finder slate count: "${fd[0]}", expected ${fd[1]}`);
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
            all: !!document.querySelector('.unlock.intro .ulall [data-all]'),
            gt: !!document.querySelector('.unlock.intro .ultips .gt'),
            hint: !!document.querySelector('.unlock.intro .gthint'),
            // The plain sentence: after the photo, before the tips, no label (Pierre, 2026-11-03).
            plain: (() => {
              const c = document.querySelector('.unlock.intro'),
                e = c.querySelector('.plainw'),
                after = (a, b) => !!(a && b && a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
              return !!e && !e.querySelector('b') && after(c.querySelector('.ulphoto'), e) && after(e, c.querySelector('.ultips'));
            })()
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
      // Every slate genus is now met, so the bonus genera offer (a prompt, tested in draw.smoke.js) would come at 30 and
      // move the one-tap question to 40: this player has already chosen (⚙ Bonus genera: Off). Likewise the card offering
      // to go back to one at a time after Open all (model.js backDue: this player's answers fall below expectation):
      // answered Keep them all.
      await q2.evaluate(() => (bonusSet(false), introBack(true)));
      await q2.evaluate(() => (location.hash = 'quiz'));
      await q2.waitForTimeout(500);
      if (seen.length !== 4 || !seen.every((c, k) => c.img && c.all && c.plain && c.kick.includes(`${k + 1} of 4`)))
        fails.push(`${w}px first cards: ${JSON.stringify(seen)}`);
      // "Tap an underlined word" is said once, on the first card with one (beginner review 2026-11-03).
      else if (seen.filter(c => c.hint).length !== +seen.some(c => c.gt) || seen.findIndex(c => c.hint) !== seen.findIndex(c => c.gt))
        fails.push(`${w}px first cards, the tap-a-word line: ${JSON.stringify(seen.map(c => [c.gt, c.hint]))}`);
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
        const q = await q2.evaluate(() =>
          JSON.parse(localStorage.getItem('imr-evq') || '[]').map(x => x.k + ':' + (x.r || x.msg) + (x.src ? '@' + x.src : ''))
        );
        // The first one-tap question ever is the plain one (core.js PULSE0), logged with its item id.
        if (!q.includes('pulse:hard@are') || !q.some(x => /smoke test error/.test(x)))
          fails.push(`${w}px events not queued: ${q.join(' | ')}`);
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
      // The enlarge mark and the one-time hint (Pierre, 2026-11-03: players almost never enlarged a quiz photo). Every quiz
      // and genus sheet photo shows the mark, its button labelled "Enlarge photo"; a new player gets "… a photo to see it
      // bigger" on their 2nd question, once (not on the 1st, not again after a reload), and never once a photo was enlarged.
      {
        const hintCtx = async () => {
          const c = await b.newContext({viewport: {width: 390, height: 800}, serviceWorkers: 'block'});
          await c.route(
            u => !u.href.startsWith(base),
            r => r.abort()
          );
          await c.addInitScript(() => {
            localStorage.setItem('imr-tour', '"done"');
            localStorage.setItem('imr-nudge', '1');
          });
          const p = await c.newPage();
          await p.goto(base + '#quiz');
          await p.waitForFunction(() => window.APP_READY && document.querySelector('#view .qph'), null, {timeout: 30000});
          return [c, p];
        };
        const hintIn = (p, ms) =>
          p.waitForSelector('#view .zhint', {timeout: ms}).then(
            () => p.textContent('#view .zhint'),
            () => null
          );
        // toast: an achievement toast is up when the next question shows (as after a duel won as the first question, which
        // made this check fail in CI on PR #410: the hint was tried once and skipped under the toast); clicked in the page,
        // so Playwright does not wait for the toast to leave first.
        const nextQ = async (p, toast) => {
          await p.click('#view [data-c]');
          if (toast)
            await p.evaluate(() => (achPop({tier: 1, icon: '🧪', title: 'Smoke', desc: 'test'}), document.getElementById('next').click()));
          else await p.click('#next');
          await p.waitForFunction(() => document.querySelector('#view .qph') && !document.querySelector('#view .q.done'));
        };
        const marks = p =>
          p.evaluate(sel => {
            const z = [...document.querySelectorAll(sel)];
            const ok = b => {
              const i = b.querySelector('.zic svg'),
                r = i && i.closest('.zic').getBoundingClientRect();
              return /^Enlarge photo/.test(b.getAttribute('aria-label') || '') && !!r && r.width >= 24 && r.height >= 24;
            };
            return z.length ? z.filter(b => !ok(b)).length : -1;
          }, '#view .qph .zoom, #view .hero-ph, #view .strip .zoom');
        const [c, p] = await hintCtx();
        const r = {mark: await marks(p), q1: await hintIn(p, 1500)};
        await nextQ(p, true);
        // Never with the toast; once it has gone, on the same question.
        r.toast = await p.evaluate(() => !!document.querySelector('.achpop'));
        await p.waitForFunction(
          () => {
            if (document.querySelector('.achpop') && document.querySelector('.zhint')) window.__zboth = 1;
            return !document.querySelector('.achpop') && !(typeof achBusy !== 'undefined' && achBusy);
          },
          null,
          {polling: 100, timeout: 15000}
        );
        r.both = await p.evaluate(() => !!window.__zboth);
        r.q2 = await hintIn(p, 3000);
        r.same = await p.evaluate(() => answersSoFar());
        r.label = await p.getAttribute('#view .qph .zoom', 'aria-label');
        await p.keyboard.press('Shift'); // any key or tap sends it away
        await p.waitForTimeout(500);
        r.gone = !(await p.$('#view .zhint'));
        await p.reload();
        await p.waitForFunction(() => window.APP_READY && document.querySelector('#view .qph'), null, {timeout: 30000});
        r.reload = await hintIn(p, 2000);
        await nextQ(p);
        r.after = await hintIn(p, 1500);
        await p.evaluate(() => (location.hash = 'g-Acropora'));
        await p.waitForSelector('#view .hero-ph');
        r.sheet = await marks(p);
        // mark: the number of photo buttons without the mark or the label (0 = all have them; -1 = no photo found).
        if (
          r.mark ||
          r.q1 ||
          !r.toast ||
          r.both ||
          r.same !== 1 ||
          !/^(Tap|Click) a photo to see it bigger$/.test(r.q2 || '') ||
          r.label !== 'Enlarge photo' ||
          !r.gone
        )
          fails.push(`enlarge mark and hint on a new player's first questions: ${JSON.stringify(r)}`);
        if (r.reload || r.after || r.sheet) fails.push(`enlarge hint shown again, or genus sheet photos unmarked: ${JSON.stringify(r)}`);
        await c.close();
        // A player who already enlarged a photo never gets it.
        const [c2, p2] = await hintCtx();
        await p2.click('#view .qph .zoom');
        await p2.waitForSelector('#lightbox:not([hidden])');
        await p2.keyboard.press('Escape');
        await nextQ(p2);
        const z = {hint: await hintIn(p2, 2500), key: await p2.evaluate(() => localStorage.getItem('imr-zoomhint'))};
        if (z.hint || z.key !== '"zoomed"') fails.push(`enlarge hint after a photo was enlarged: ${JSON.stringify(z)}`);
        await c2.close();
      }
      for (const f of await overlays(b, base)) fails.push(f);
    }
    errs.length = 0;
    await p.goto(base + 'admin.html?readonly');
    await p.waitForFunction(() => typeof DRAFT !== 'undefined' && DRAFT && DRAFT.genera, null, {timeout: 30000});
    await p.waitForTimeout(500);
    if (errs.length) fails.push(`${w}px admin.html?readonly: ${errs.slice(0, 3).join(' | ')}`);
    // One count of a Finder-only genus's colonies (Codex review #390, found apart five times): the refill
    // (tools/fetch_local.py colonies) and the admin (covOf, which the Candidates swiper's full test reads) agree on the
    // real data and curation, view by view.
    if (w === 390) {
      const adm = await p.evaluate(() =>
        Object.fromEntries(
          Object.keys(DATA.gen)
            .filter(n => !isGame(n))
            .map(n => [n, Object.fromEntries(capViews(n).map(([v]) => [v, covOf(n, v).obs]))])
        )
      );
      const py = JSON.parse(
        execFileSync(
          'python3',
          [
            '-c',
            `import sys, json, importlib.util; sys.path.insert(0, 'tools'); sys.argv = ['x']
s = importlib.util.spec_from_file_location('fl', 'tools/fetch_local.py'); fl = importlib.util.module_from_spec(s); s.loader.exec_module(fl)
from datajson import load_all
d = load_all(); G = {**d['gen'], **d['x']['gen']}; cur = json.load(open('curation.json'))
print(json.dumps({g: {v: fl.colonies(g, G, d.get('cand') or {}, cur, fl.excluded).get(v, 0) for v in fl.kept_views(g, G, cur)} for g in fl.finder_only(d)}))`
          ],
          {cwd: ROOT, encoding: 'utf8'}
        )
      );
      if (JSON.stringify(adm) !== JSON.stringify(py))
        fails.push(`Finder-only colonies, admin covOf vs tools/fetch_local.py colonies: ${JSON.stringify(adm)} vs ${JSON.stringify(py)}`);
    }
    await ctx.close();
  }
  for (const f of await basicsFit(b, base)) fails.push(f);
  await b.close();
  for (const f of await signin(base)) fails.push(f);
  for (const f of await replayAdoptCheck(base)) fails.push(f);
  server.close();
  if (fails.length) {
    console.error('Page errors:\n' + fails.join('\n'));
    process.exit(1);
  }
  console.log(
    `Pages OK: ${ROUTES.length} routes + admin at 390 and 1280 px, sign-in to an existing account, the sheet's full replay adopted.`
  );
})().catch(e => {
  console.error(e);
  process.exit(1);
});
