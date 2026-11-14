// Page smoke test (code re-review 2026-11-01, M5): serves the site locally, opens the main routes in Chromium at phone
// and desktop widths, and fails on any page error. Not a node --test file: it needs Playwright, which CI installs with
// npm into a temporary folder (no package.json in this repo). Locally: node tests/pages.smoke.js (Playwright installed).
// A page key's address (core.js routeOut; the test names pages by key where a list reads better).
const addr = k => require('../core.js').routeOut(k) ?? k;
const http = require('http'),
  fs = require('fs'),
  path = require('path'),
  {execFileSync} = require('child_process');
const {chromium} = require('./calm.js'); // playwright; contexts in reduced motion by default
const slot = require('./slot.js');
const qa = require('./answer.js'); // waits for and answers the question on screen, whatever its format
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
// Every address (URL refonte, Q53-Q56: #section/page/thing in the words on screen).
const ROUTES = [
  'learn/genera',
  'learn/genus/Acropora',
  'learn/look-alikes',
  'learn/compare/Pocillopora/Stylophora',
  'practice/quiz',
  'practice/duels',
  'practice/custom',
  'practice/custom/play',
  'practice/memory',
  'identify/key',
  'progress',
  'leaderboard',
  'leaderboard/achievements',
  'tools',
  'learn/basics/walls',
  'learn/basics/words',
  'about',
  'tools/cards',
  'tools/cards/update',
  'practice/duels/Foo/Bar',
  'learn/genus/%E0'
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

// "Did you know?" tips off (tips.js): a player who has enlarged 3 photos is never targeted. For the tests of the other
// cards and prompts, which play dozens of questions and click Next; tipsCheck (below) checks the tips with them.
// The names of the conditions that do not hold (test-suite review, 2026-11-04): a check with many conditions says which
// one broke, not only the record. why({dialog: x.dialog, kind: x.kind === 'feedback'}) -> ['kind'] when the kind is wrong.
const why = rules =>
  Object.entries(rules)
    .filter(([, ok]) => !ok)
    .map(([k]) => k);
// Waits until the app has drawn the page at the current address (app.js route() sets window.ROUTED once done; a link
// that sends on routes again), no fetch is in flight (counted in every context of the main browser, below) and no Lab
// module is still loading (proto/lab.js LAB.pending: its <script>s are no fetch, and a Lab page or tool drawn before
// they are in is a "Loading…" placeholder, redrawn by route() once they are; Codex review #454), all for three frames in
// a row: instead of a fixed sleep after each navigation (test-suite review, 2026-11-04). Resolves false when that never
// happens within the timeout; the caller says what it then fails.
const drawn = (p, timeout = 15000) =>
  p
    .evaluate(() => (window.__calm = 0))
    .then(() =>
      p.waitForFunction(
        () => {
          const ok =
            typeof hashNow === 'function' &&
            window.ROUTED === hashNow() &&
            !(window.__inflight > 0) &&
            !(typeof LAB !== 'undefined' && LAB.pending > 0);
          window.__calm = ok ? (window.__calm || 0) + 1 : 0;
          return window.__calm >= 3;
        },
        null,
        {polling: 'raf', timeout}
      )
    )
    .then(() => true)
    .catch(() => false);
// Waits for a navigation the page starts itself (Back, a link): the address leaves `from`, then the new page is drawn.
const left = (p, from, timeout = 10000) =>
  p
    .waitForFunction(f => location.hash !== f, from, {timeout})
    .then(() => drawn(p))
    .catch(() => false);
const TIPS_OFF = () => localStorage.getItem('reefid-tips') || localStorage.setItem('reefid-tips', '{"u":{"q":0,"z":3}}');
// One overlay at a time, and each one closable (new-player walkthrough 2026-11-02). Returns the failures.
async function overlays(b, base) {
  const fails = [];
  const open = async (o, init, arg) => {
    const c = await b.newContext({serviceWorkers: 'block', ...o});
    await c.route(
      u => !u.href.startsWith(base),
      r => r.abort()
    );
    await c.addInitScript(TIPS_OFF);
    await c.addInitScript(init || (() => {}), arg);
    const p = await c.newPage();
    return [c, p];
  };
  const seen = () => {
    localStorage.setItem('reefid-tour', '"done"');
    localStorage.setItem('reefid-sync-coral-start', '{"c":"new","t":1}');
    localStorage.setItem('reefid-nudge', '1');
  };
  // C2: Back from the quiz closes the first genus card (it stayed over Home, its Next going on there). The cards shown
  // are met; the rest come next time, as "1 of 2".
  {
    const [c, p] = await open({viewport: {width: 390, height: 800}, intro: true}, seen);
    await p.goto(base);
    await p.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
    await p.evaluate(() => (location.hash = 'practice/quiz'));
    await p.waitForSelector('.unlock.intro', {timeout: 5000}).catch(() => {});
    await p.click('.unlock.intro .next'); // card 2 of 4
    await p.goBack();
    await p.waitForTimeout(500);
    await p.keyboard.press('Enter'); // a card's keys left behind would move on to a card no longer there
    const r = await p.evaluate(() => ({h: location.hash, cards: document.querySelectorAll('.unlock').length}));
    await p.evaluate(() => (location.hash = 'practice/quiz'));
    await p.waitForSelector('.unlock.intro', {timeout: 5000}).catch(() => {});
    const kick = await p.evaluate(() => document.querySelector('.unlock.intro .ulkick')?.textContent);
    if (r.h !== '' || r.cards || !/1 of 2/.test(kick || '')) fails.push(`card after Back from the quiz: ${JSON.stringify({...r, kick})}`);
    await c.close();
  }
  // C1: an achievement toast never shows over a card: it waits for the card to close (both orders).
  {
    const [c, p] = await open({viewport: {width: 390, height: 800}, intro: true}, seen);
    await p.goto(base + '#practice/quiz');
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
    // come from iNaturalist, cut off like every outside host) never shows a broken-image icon: neither while it is asked
    // from R2 once more (app.js photoFail, core.js PHOTO_RETRY: R2 still on, as before any photo of the visit failed
    // there; the pages smoke caught one there on CI) nor when it comes from the site (R2 off) and gives up.
    const off = await p.evaluate(() => BENTHIC[0]),
      offF = await p.evaluate(n => cover(GX(n)).f, off);
    await c.route(
      u => u.pathname.includes(`/img/${offF}`),
      r => r.abort()
    );
    for (const r2 of [true, false]) {
      await p.evaluate(r2 => ((R2 = r2), introShow([BENTHIC[0]], false)), r2);
      // Checked as it fails and through its retries: each 100 ms for 2.5 s (past PHOTO_RETRY and the first card retry).
      let bad = 0;
      for (let t = 0; t < 25; t++) {
        await p.waitForTimeout(100);
        bad += await p.evaluate(() => {
          const i = document.querySelector('.unlock img');
          return i && i.complete && !(i.naturalWidth > 0 || getComputedStyle(i).visibility === 'hidden') ? 1 : 0;
        });
      }
      if (bad) fails.push(`broken-image icon on the card of ${off} (R2 ${r2 ? 'on' : 'off'}), seen ${bad} times in 2.5 s`);
      await p.keyboard.press('Escape');
    }
    await c.close();
  }
  // Cards (2026-11-03, app.js cardShow): every kind comes from the one builder, through its real caller where it has one
  // (the apology and the update card with a former %, which wait on other branches, through cardShow itself): one
  // overlay, role dialog, aria-modal, labelled by its title (an h3), the kind's medallion (or the genus photo band), the
  // focus inside and kept there on Tab, Escape closes it and the focus goes back where it was. Every kind fits the screen
  // at both widths; the rest is not layout and runs once, on the phone (test-suite review D4, 2026-11-04).
  for (const w of [390, 1280]) {
    const [c, p] = await open({viewport: {width: w, height: 844}}, () => {
      localStorage.setItem('reefid-tour', '"done"');
      localStorage.setItem('reefid-sync-coral-start', '{"c":"new","t":1}');
      localStorage.setItem('reefid-nudge', '1');
      localStorage.setItem('reefid-recalc', '"typed-questions-2026-11"');
      localStorage.getItem('reefid-sync-coral-progress') ||
        localStorage.setItem('reefid-sync-coral-progress', JSON.stringify({Acropora: {ok: 3, ko: 1, h: '1101'}}));
    });
    await p.goto(base + '#practice/quiz');
    await p.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
    await qa.ready(p);
    const CASES = [
      ['genus', () => introShow([slateGenera()[1]], false)],
      // A big step (quiz.js openOfferShow, the fish circle 3's card; the coral open-all offer went, Q337), on a made-up set.
      [
        'step',
        () =>
          openOfferShow({
            k: 'smoke',
            kick: 'Smoke',
            title: n => `${n} more?`,
            body: 'A part of the slate opened by choice.',
            yes: 'Open them',
            note: 'Also in My progress.',
            units: () => slateGenera().slice(-3)
          })
      ],
      ['tip', () => backShow()],
      ['tip', () => reliefShow('quiz-duel', ['Pocillopora', 'Stylophora'])],
      ['bonus', () => bonusOfferShow()],
      ['feature', () => (store.set(RECALC.KEY, RECALC.L[RECALC.L.length - 2].id), recalcNotice())],
      ['account', () => signinNudge(false, false)],
      ['apology', () => cardShow({kind: 'apology', kick: 'Sorry', title: 'Smoke', body: '<p>t</p>', primary: {text: 'Thanks'}, esc: 1})],
      // The recalculation card of a rules version, with its % before and after (progress.js rvNotice, core.js RV_CARD: rules
      // version 8's; from rules version 10 a recalculation has no card, Q330) and the apology of rules version 9 (core.js
      // RV_SORRY), through their real caller (the learned mark's card is silent for now: model.js MXL.QUIET, Q332).
      ['update', () => (store.set('reefid-rv-msg', {due: [8], told: [], pct: {8: [50, 42]}}), rvNotice())],
      [
        'apology',
        () => (
          store.set('reefid-rv-msg', {
            due: [RVS.find(x => x.msg === RV_SORRY).v],
            told: [],
            pct: {[RVS.find(x => x.msg === RV_SORRY).v]: [50, 42]}
          }),
          rvNotice()
        )
      ],
      ['feedback', () => pulseAsk()],
      // Every unit in play met (quiz.js allMetShow, app.js fishNextOf: the fish's words, its longest reason), in the
      // subject's card kind (SUBJECTS card: the corals' here).
      ['genus', () => allMetShow(fishNextOf({c3: 33}))]
    ];
    for (let i = 0; i < CASES.length; i++) {
      const [kind] = CASES[i];
      await p.evaluate(() => {
        document.querySelectorAll('.unlock').forEach(x => x.ulClose());
        document.getElementById('smokeopener') || document.body.insertAdjacentHTML('beforeend', '<button id="smokeopener">x</button>');
        document.getElementById('smokeopener').focus();
      });
      await p.evaluate(`(${CASES[i][1]})()`);
      await p.waitForSelector('.unlock .ulcard', {timeout: 15000}).catch(() => {});
      // Fits the screen: the card (medallion included) inside the viewport, no sideways scroll; measured once its entrance
      // is over (ulrise moves it up from below; the infinite ones, such as a medallion's bob, do not move the card).
      const fit = await p.evaluate(() => {
        const u = document.querySelector('.unlock'),
          card = u && u.querySelector('.ulcard');
        if (!card) return {card: false};
        u.getAnimations({subtree: true})
          .filter(a => a.effect && a.effect.getTiming().iterations !== Infinity)
          .forEach(a => a.finish());
        const r = card.getBoundingClientRect();
        return {
          card: true,
          inside: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight,
          wide: document.documentElement.scrollWidth > innerWidth,
          box: [r.left, r.top, r.right, r.bottom].map(Math.round)
        };
      });
      if (!fit.card || !fit.inside || fit.wide) fails.push(`${w}px card ${i} (${kind}) does not fit the screen: ${JSON.stringify(fit)}`);
      if (w !== 390) {
        await p.evaluate(() => document.querySelectorAll('.unlock').forEach(x => x.ulClose()));
        continue;
      }
      // The event log names every card (cardShow's dataset.info, read by "left with a card open"): a card without a title
      // (the sign-in card) by its label, so its row never looks like an empty card (2026-11-09).
      const info = await p.evaluate(() => document.querySelector('.unlock')?.dataset.info || '');
      if (!(info.split(' | ')[2] || '').trim()) fails.push(`card ${i} (${kind}): no name in the event log's info: "${info}"`);
      // The card moves the focus into itself on a timer (cardShow): wait for it, not for a fixed time (a busy page ran the
      // timer after the 150 ms this waited, and the focus was still outside: pages smoke, 2026-11-03).
      await p
        .waitForFunction(() => !!document.querySelector('.unlock')?.contains(document.activeElement), null, {timeout: 15000})
        .catch(() => fails.push(`${w}px card ${i} (${kind}): the focus never moved into the card (15 s)`));
      const r = await p.evaluate(() => {
        const d = document.querySelectorAll('.unlock'),
          u = d[0],
          ids = ((u && u.getAttribute('aria-labelledby')) || '').split(' ').filter(Boolean),
          h = ids.map(x => document.getElementById(x)).filter(Boolean);
        return {
          n: d.length,
          role: u && u.getAttribute('role'),
          modal: u && u.getAttribute('aria-modal'),
          title: h.some(x => x.tagName === 'H3' && x.textContent.trim() && u.contains(x)),
          kind: u && u.querySelector('.ulcard').dataset.k,
          look: !!(u && (u.querySelector('.ulmed') || u.querySelector('.ulphoto img'))),
          focus: !!(u && u.contains(document.activeElement))
        };
      });
      let kept = true;
      for (let t = 0; t < 8; t++) {
        await p.keyboard.press(t % 3 === 2 ? 'Shift+Tab' : 'Tab');
        kept = kept && (await p.evaluate(() => !!document.querySelector('.unlock')?.contains(document.activeElement)));
      }
      await p.keyboard.press('Escape');
      await p.waitForTimeout(100);
      const after = await p.evaluate(() => ({
        gone: !document.querySelector('.unlock'),
        back: document.activeElement?.id === 'smokeopener'
      }));
      const no = why({
        one: r.n === 1,
        role: r.role === 'dialog',
        modal: r.modal === 'true',
        title: r.title,
        kind: r.kind === kind,
        look: r.look,
        focus: r.focus,
        kept,
        gone: after.gone,
        back: after.back
      });
      if (no.length) fails.push(`${w}px card ${i} (${kind}) through cardShow: ${no.join(', ')} ${JSON.stringify({...r, kept, ...after})}`);
    }
    await c.close();
  }
  // Millepora a slate genus (Pierre, 2026-11-02): a returning player who saw the earlier recalculation pop-up gets the
  // Millepora one, once (rule D6); one who missed both gets both on one card. Bonus genera unlocked by the
  // former thresholds (Q.bu 2+) stay on; Millepora alone (Q.bu 1) is no opt-in. Millepora's first card and sheet warn.
  for (const [recalc, bu] of [
    ['progress-moving-average-2026-11', 3],
    ['', 1]
  ]) {
    const [c, p] = await open(
      {viewport: {width: 390, height: 800}, intro: true},
      ({r, u}) => {
        localStorage.setItem('reefid-tour', '"done"');
        localStorage.setItem('reefid-sync-coral-start', '{"c":"new","t":1}');
        localStorage.setItem('reefid-nudge', '1');
        if (r && !localStorage.getItem('reefid-recalc')) localStorage.setItem('reefid-recalc', JSON.stringify(r));
        localStorage.getItem('reefid-sync-coral-progress') ||
          localStorage.setItem(
            'reefid-sync-coral-progress',
            JSON.stringify({Acropora: {ok: 3, ko: 1, h: '1101'}, Millepora: {ok: 2, ko: 0, h: '11'}})
          );
        localStorage.getItem('reefid-sync-coral-quiz') || localStorage.setItem('reefid-sync-coral-quiz', JSON.stringify({bu: u}));
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
    // Not a fixed wait: the app says when it has decided at this load (progress.js recalcNotice, window.RECALC_SAID).
    const said = await p
      .waitForFunction(() => window.RECALC_SAID, null, {timeout: 15000})
      .then(h => h.jsonValue())
      .catch(() => 'undecided');
    if (said !== 'none' || (await p.$('.recalc'))) fails.push(`recalculation pop-up shown twice (${said})`);
    if (!recalc) {
      // Millepora met on its card (a slate genus: a card like the others) and its sheet: the warning.
      const w = await p.evaluate(() => {
        introShow(['Millepora'], false);
        const t = document.querySelector('.unlock.intro .warn')?.textContent || '';
        document.querySelector('.unlock.intro').ulClose();
        return t;
      });
      await p.evaluate(() => (location.hash = 'learn/genus/Millepora'));
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
    await p.goto(base + '#practice/quiz');
    await p.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
    await p.waitForSelector('#view .qph .zoom');
    await p.click('#view .qph .zoom');
    await p.waitForTimeout(200);
    await p.keyboard.press('Escape');
    await p.waitForTimeout(200);
    // answer.js: a new player's first question: choices
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
    const [c, p] = await open({viewport: {width: 1280, height: 860}}, () => localStorage.setItem('reefid-nudge', '1'));
    await p.goto(base);
    await p.waitForFunction(() => window.APP_READY && document.getElementById('tour'), null, {timeout: 30000});
    // Fish open to every player (Q158): the subject to pick first (tour.js pick), and where to switch after the question.
    const two = !!(await p.$('#tour [data-pick="coral"]'));
    if (two) {
      await p.click('#tour [data-pick="coral"]');
      await p.waitForSelector('#tour [data-start="imr"]', {timeout: 5000}).catch(() => {});
    }
    await p.click('#tour [data-start="imr"]'); // the first-launch question first (tour.js ask): it moves on by itself
    await p.waitForTimeout(300);
    for (let k = 0; k < at + (two ? 1 : 0); k++) {
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
  // one-tap question first at 35 (a card at Next since 2026-11-03, never inline in the feedback), at least 10 answers
  // between two of them, never with an achievement toast or another card on screen. A new player, mostly right, 60
  // answers; toasts closed by a tap as they come. The one-tap question comes at exactly 35, or later only while an
  // achievement toast that came with an answer holds it. Then the queued events: the one-tap question's (the first ever
  // is the plain one, core.js PULSE0, logged with its item id), an error from one of the app's files, and no noise.
  // (Test-suite review D2, 2026-11-04: a second new player played to 40 answers in the main loop only for the exact 35
  // and the queue; both are checked here now.) A genus can pass TYPED.from within these 60 answers, so a typed question
  // may come (#855's first head hung 30 s waiting for choice buttons): the questions after answers 5, 19 and 34 (a miss,
  // the sign-in card's answer, the one-tap question's) are made typed (model.js TYPED forced from the answer before, as
  // the next question is planned then, until a typed one is on screen), so typed answers meet the prompts every run.
  {
    const [c, p] = await open(
      {viewport: {width: 390, height: 844}},
      () => (localStorage.setItem('reefid-tour', '"done"'), localStorage.setItem('reefid-sync-coral-start', '{"c":"new","t":1}'))
    );
    await p.goto(base + '#practice/quiz');
    await p.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
    const seenP = [],
      toastAt = new Set(), // the answers that came with an achievement toast (it holds a prompt due then)
      FORCE = [5, 19, 34],
      typedAt = [];
    for (let i = 0; i < 60; i++) {
      await qa.ready(p);
      const r = await p.evaluate(
        ([i, due, met]) => {
          // A new genus's card is read and closed before answering, as a player does.
          document.querySelectorAll('.unlock.intro').forEach(x => (x.ulClose ? x.ulClose() : x.remove()));
          // This session started PULSE.SESS_MS ago (the smoke answers in seconds): its answers decide (quiz.js pulseSess).
          (st => st.v && localStorage.setItem('reefid-pulse', JSON.stringify({...st, v: {...st.v, t0: Date.now() - PULSE.SESS_MS}})))(
            JSON.parse(localStorage.getItem('reefid-pulse') || '{}')
          );
          // A toast is tapped away (without following its link) before answering.
          document.querySelectorAll('.achpop a').forEach(a => {
            a.addEventListener('click', e => e.preventDefault());
            a.click();
          });
          const fmt = smokeAnswer(i % 6 !== 5).fmt;
          // The next question (planned after this answer: quiz.js planNext) typed while a forced one is still to come; the
          // original rule back once they all came.
          window.TY0 = window.TY0 || {from: TYPED.from, at: TYPED.at};
          Object.assign(TYPED, due > met + (fmt === 'typed') ? {from: 0, at: [[0, 1]]} : TY0);
          const card = document.querySelector('.unlock'),
            toast = !!document.querySelector('.achpop') || achBusy;
          return {
            fmt,
            a: answersSoFar(),
            sign: !!document.querySelector('.unlock.signnudge'),
            inline: !!document.querySelector('#after [data-pulse]'),
            other: !!card && !card.matches('.signnudge'),
            toast
          };
        },
        [i, FORCE.filter(k => k <= i + 1).length, typedAt.length]
      );
      if (r.fmt === 'typed') typedAt.push(i);
      if (r.toast) toastAt.add(r.a);
      if (r.sign || r.inline) seenP.push({...r, k: r.sign ? 'sign-in' : 'pulse'});
      // Next: the one-tap question, when due, comes as a card before the next question; "Not now" (Escape) closes it and
      // the next question is drawn.
      const n = await p.evaluate(() => {
        document.querySelectorAll('.unlock').forEach(x => (x.ulClose ? x.ulClose() : x.remove()));
        document.getElementById('next').click();
        const pc = document.querySelector('.unlock.pulsecard');
        if (!pc) return null;
        const out = {
          a: answersSoFar(),
          other: [...document.querySelectorAll('.unlock')].some(x => x !== pc),
          toast: !!document.querySelector('.achpop') || achBusy
        };
        document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
        out.gone = !document.querySelector('.unlock.pulsecard');
        return out;
      });
      if (n) seenP.push({...n, k: 'pulse'});
    }
    if (typedAt.length < FORCE.length) fails.push(`typed questions forced after answers ${FORCE}: met at ${JSON.stringify(typedAt)}`);
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
      seenP.some(x => x.other || x.toast || x.inline || x.gone === false)
    )
      fails.push(`prompt spacing over 60 answers: ${JSON.stringify(seenP)}`);
    // Exactly 35, or held from 35 on by a toast at every answer until it came.
    else if (pulse.a !== 35) {
      const free = Array.from({length: pulse.a - 35}, (_, k) => 35 + k).filter(a => !toastAt.has(a));
      if (free.length) fails.push(`one-tap question: shown at answer ${pulse.a}, expected 35 (no toast held it at ${free.join(', ')})`);
    }
    // An error from one of the app's script files is reported; one injected into the page by a browser or an extension
    // (no file, or the page itself), and the harmless ResizeObserver warning, are not (Pierre, 2026-11-02).
    await p.evaluate(() => {
      const dir = location.origin + location.pathname.replace(/[^/]*$/, ''),
        err = (message, filename) => window.dispatchEvent(new ErrorEvent('error', {message, filename, lineno: 1}));
      err('smoke test error', dir + 'quiz.js?v=1');
      err("ReferenceError: Can't find variable: __firefox__", location.href);
      err('Script error.', '');
      err('ResizeObserver loop completed with undelivered notifications.', dir + 'app.js');
    });
    await p.waitForTimeout(300);
    const q = await p.evaluate(() =>
      JSON.parse(localStorage.getItem('reefid-evq') || '[]').map(x => x.k + ':' + (x.r || x.msg) + (x.src ? '@' + x.src : ''))
    );
    // The one-tap question closed by Escape logs skip, with the plain first item's id.
    if (!q.includes('pulse:skip@are') || !q.some(x => /smoke test error/.test(x))) fails.push(`events not queued: ${q.join(' | ')}`);
    if (q.some(x => /__firefox__|Script error|ResizeObserver/.test(x))) fails.push(`noise errors queued: ${q.join(' | ')}`);
    await c.close();
  }
  // The one-tap question's bank (core.js PULSEQ, 2026-11-03) as a card at Next (Pierre, 2026-11-03: inline in the
  // feedback, a reflex Next skipped it), on a phone (390 px) and a desktop: never inline in the feedback; after Next a
  // dialog (role, kicker "Quick question", the item's question as its title, its answers on one row of equal widths, a
  // "Not now"), on screen, nothing wider than the screen, the next question not drawn yet; it logs its showing (shown)
  // with its item (src). Its buttons stay disabled at least PULSE.WAIT ms (timed in the page); on the first prompt, its
  // wait stretched to 3 s, a real mouse tap at an answer's centre and Enter do nothing (nothing logged, the card stays);
  // once they are on, Enter still never answers. Then, in turn: an answer tapped (logs its code, once),
  // "Not now" (skip), Escape (skip); the card closes and the next question shows. The last prompt is left by another page
  // (none). The next prompt never asks the same item. After the first, each prompt is made due by moving the device's
  // last-prompt marks back (reefid-prompt-at by PROMPT.GAP, reefid-pulse by PULSE.EVERY × PULSE.AFTERX), the real code deciding.
  for (const [vw, vh] of [
    [390, 844],
    [1280, 800]
  ]) {
    const [c, p] = await open({viewport: {width: vw, height: vh}}, seen);
    await p.goto(base + '#practice/quiz');
    await p.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
    const asked = [],
      WAYS = ['tap', 'notnow', 'tap', 'esc'],
      N = 9,
      pev = () => p.evaluate(() => JSON.parse(localStorage.getItem('reefid-evq') || '[]').filter(x => x.k === 'pulse'));
    for (let i = 0; i < 60 && asked.length < N; i++) {
      await qa.ready(p);
      const way = asked.length === N - 1 ? 'leave' : WAYS[asked.length % WAYS.length],
        before = (await pev()).length;
      const inline = await p.evaluate(
        ([i, due]) => {
          document.querySelectorAll('.unlock').forEach(x => (x.ulClose ? x.ulClose() : x.remove()));
          document.querySelectorAll('.achpop').forEach(x => x.remove());
          achQ.length = 0;
          achBusy = false;
          // This session started PULSE.SESS_MS ago (the smoke answers in seconds): its answers decide (quiz.js pulseSess).
          (st => st.v && localStorage.setItem('reefid-pulse', JSON.stringify({...st, v: {...st.v, t0: Date.now() - PULSE.SESS_MS}})))(
            JSON.parse(localStorage.getItem('reefid-pulse') || '{}')
          );
          if (due) {
            const a = answersSoFar() + 1;
            localStorage.setItem('reefid-prompt-at', JSON.stringify(a - PROMPT.GAP));
            localStorage.setItem(
              'reefid-pulse',
              JSON.stringify({...JSON.parse(localStorage.getItem('reefid-pulse')), at: a - PULSE.EVERY * PULSE.AFTERX})
            );
          }
          smokeAnswer(i % 4 !== 3);
          return !!document.querySelector('#after [data-pulse], #after .pulse');
        },
        [i, asked.length > 0]
      );
      // The buttons' wait is timed in the page (from the tap on Next to the last button enabled), so a busy machine cannot
      // make it pass or fail. The first prompt's wait is stretched to 3 s, so the reflex tap below surely falls within it.
      await p.evaluate(
        slow => {
          window.W0 = window.W0 || PULSE.WAIT;
          PULSE.WAIT = slow ? 3000 : W0;
          const t0 = performance.now();
          window.WAITED = null;
          document.getElementById('next').click();
          const d = document.querySelector('.unlock.pulsecard');
          if (d)
            new MutationObserver((m, o) => {
              if (d.querySelector('[data-pulse]:disabled')) return;
              WAITED = performance.now() - t0;
              o.disconnect();
            }).observe(d, {attributes: true, subtree: true, attributeFilter: ['disabled']});
        },
        !asked.some(x => !x.inline)
      );
      const shown = await p.evaluate(() => {
        const d = document.querySelector('.unlock.pulsecard');
        if (!d) return null;
        // Its entrance played out at once (positions measured where they end).
        d.getAnimations({subtree: true}).forEach(a => a.finish());
        const bs = [...d.querySelectorAll('.pulseb [data-pulse]')],
          nn = d.querySelector('.pulsex[data-pulse=""]'),
          R = d.querySelector('.ulcard').getBoundingClientRect(),
          B = bs.map(x => x.getBoundingClientRect());
        return {
          a: answersSoFar(),
          q: d.querySelector('.pulseb').dataset.pq,
          dialog: d.getAttribute('role') === 'dialog' && d.getAttribute('aria-modal') === 'true',
          kind: d.querySelector('.ulcard').dataset.k,
          title: d.querySelector('.ulkick')?.textContent,
          text: d.querySelector('h3')?.textContent,
          opts: bs.map(x => x.dataset.pulse),
          notnow: nn?.textContent,
          // Every button waits (disabled) when the card shows.
          wait: [...bs, nn].every(x => x.disabled),
          // The next question is drawn only once the card closes.
          held: !!document.querySelector('#view .q.done #next'),
          inView: R.top >= 0 && R.left >= 0 && R.bottom <= innerHeight + 1 && R.right <= innerWidth + 1,
          wide: document.documentElement.scrollWidth > innerWidth,
          // One row, equal widths.
          row: B.every(x => Math.abs(x.top - B[0].top) < 2 && Math.abs(x.width - B[0].width) < 2),
          at: B.map(x => [x.left + x.width / 2, x.top + x.height / 2])
        };
      });
      if (!shown) {
        if (inline) asked.push({inline});
        continue;
      }
      const it = await p.evaluate(q => {
        const it = PULSEQ.find(x => x.id === q);
        return it ? [it.q, it.a.map(x => x[0])] : null;
      }, shown.q);
      // On the first prompt, a reflex tap at once (an answer's centre, a real mouse tap) and Enter: nothing happens.
      const k = asked.length % shown.at.length,
        slow = !asked.some(x => !x.inline);
      let early = null;
      if (slow) {
        await p.mouse.click(...shown.at[k]);
        await p.keyboard.press('Enter');
        early = await p.evaluate(() => ({
          up: !!document.querySelector('.unlock.pulsecard'),
          wait: !!document.querySelector('.unlock.pulsecard [data-pulse]:disabled'),
          n: JSON.parse(localStorage.getItem('reefid-evq') || '[]').filter(x => x.k === 'pulse').length
        }));
      }
      await p.waitForFunction(() => WAITED !== null, null, {timeout: 10000}).catch(() => {});
      const waited = await p.evaluate(() => [WAITED, PULSE.WAIT]);
      await p.keyboard.press('Enter');
      const enter = await p.evaluate(() => ({
        up: !!document.querySelector('.unlock.pulsecard'),
        n: JSON.parse(localStorage.getItem('reefid-evq') || '[]').filter(x => x.k === 'pulse').length,
        // After the wait, each button is what a tap at its centre reaches.
        hit: [...document.querySelectorAll('.unlock.pulsecard [data-pulse]')].every(b => {
          const r = b.getBoundingClientRect();
          return !b.disabled && b.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2));
        })
      }));
      let tap = '';
      if (way === 'tap') {
        tap = shown.opts[k];
        await p.mouse.click(...shown.at[k]);
      } else if (way === 'notnow') await p.click('.unlock.pulsecard .pulsex');
      else if (way === 'esc') await p.keyboard.press('Escape');
      else await p.evaluate(() => (location.hash = 'progress'));
      await p.waitForTimeout(300);
      const after = await p.evaluate(
        sel => ({
          up: !!document.querySelector('.unlock.pulsecard'),
          next: !!document.querySelector(sel),
          h: location.hash
        }),
        qa.SEL
      );
      const ev = (await pev()).slice(before).map(x => ({r: x.r, src: x.src, m: x.m, lv: typeof x.lv}));
      asked.push({...shown, at: undefined, it, way, tap, early, waited, enter, after, ev, n0: before});
      if (way === 'leave') {
        await p.evaluate(() => (location.hash = 'practice/quiz'));
        await drawn(p);
      }
    }
    const want = x => ['shown', x.way === 'tap' ? x.tap : x.way === 'leave' ? 'none' : 'skip'];
    // Each prompt with the names of the conditions it fails (why), so a failure says which one broke.
    const bad = asked
      .map((x, k) => ({
        why: why({
          notInline: !x.inline,
          item: !!x.it,
          dialog: x.dialog,
          kind: x.kind === 'feedback',
          title: x.title === 'Quick question',
          text: !!x.it && x.text === x.it[0],
          opts: !!x.it && x.opts.join() === x.it[1].join(),
          notnow: x.notnow === 'Not now',
          wait: x.wait,
          held: x.held,
          inView: x.inView,
          notWide: !x.wide,
          row: x.row,
          early: k === 0 ? !!x.early && x.early.up && x.early.wait && x.early.n === x.n0 + 1 : !x.early,
          waited: x.waited[0] >= x.waited[1] - 5,
          enterUp: x.enter.up,
          enterN: x.enter.n === x.n0 + 1,
          enterHit: x.enter.hit,
          closed: !x.after.up,
          after: x.way === 'leave' ? x.after.h === '#progress' : x.after.next,
          events: x.ev.map(e => e.r).join() === want(x).join(),
          eventFields: !x.ev.some(e => e.src !== x.q || e.m !== 'quiz' || e.lv !== 'number'),
          notRepeated: !(k && x.q === asked[k - 1].q)
        }),
        ...x
      }))
      .filter(x => x.why.length);
    // The first prompt at 35 answers, or a few later when an achievement toast it waits for came with that answer (the
    // wrong answers here move the toasts; the exact 35 is checked by the prompt-spacing run above).
    const late = !asked.length || asked[0].a < 35 || asked[0].a > 40;
    if (asked.length < N || late || asked[0].q !== 'are' || bad.length || new Set(asked.map(x => x.q)).size < 5)
      fails.push(`${vw}px one-tap card: ${JSON.stringify(asked.length < N || late ? asked : bad.length ? bad : asked.map(x => x.q))}`);
    await c.close();
  }
  // The right answer's celebration (app.css .cheer) plays on the choice and on "✓ Yes", and not at all with
  // prefers-reduced-motion; Next is there and focused at once. A new player's first question: always the choices.
  for (const reducedMotion of ['no-preference', 'reduce']) {
    const [c, p] = await open({viewport: {width: 1280, height: 800}, reducedMotion}, seen);
    await p.goto(base + '#practice/quiz');
    await p.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
    await qa.ready(p);
    const r = await p.evaluate(() => {
      const {fmt} = smokeAnswer();
      if (fmt !== 'choices') return {fmt};
      // answer.js: after a fmt 'choices' check
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
  // Custom quiz (quiz.js viewCustom, quizCustom; 2026-11-03), on a phone: nothing picked at first (Start off); IMR groups
  // by default (Pierre: "nobody picks genera alphabetically"), also on a device that had kept the old A-Z view; My mix-ups
  // with the declared look-alikes and a note before any mix-up, then the player's own clusters with their counts; the
  // Progress view; photos picked and Clear all, a quick pick (a genus and its look-alikes), the search, the choice and
  // the view kept after a reload, then a dozen questions all on the genera picked, logged quiz|s…; nothing wider than
  // the screen in any view (the Practice tabs included), at 390 and 360 px.
  {
    const [c, p] = await open({viewport: {width: 390, height: 844}}, () => {
      localStorage.setItem('reefid-tour', '"done"');
      localStorage.setItem('reefid-sync-coral-start', '{"c":"new","t":1}');
      localStorage.setItem('reefid-nudge', '1');
      if (!sessionStorage.getItem('cq-old')) {
        sessionStorage.setItem('cq-old', '1');
        localStorage.setItem('reefid-custom-view', '"az"'); // the A-Z view kept by a device before 2026-11-03
      }
    });
    await p.goto(base + '#practice/custom');
    await p.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
    await p.waitForSelector('.cqtile');
    const state = () =>
      p.evaluate(() => ({
        view: document.querySelector('[data-cv][aria-pressed="true"]').dataset.cv,
        on: [...new Set([...document.querySelectorAll('.cqtile[aria-pressed="true"]')].map(b => b.dataset.g))].sort(),
        start: !document.querySelector('[data-start]').disabled,
        n: document.querySelector('.cqn b').textContent,
        shown: [...new Set([...document.querySelectorAll('.cqtile:not([hidden])')].map(b => b.dataset.g))],
        tabs: (m => m.scrollWidth <= m.clientWidth)(document.getElementById('modes')),
        wide: [...document.querySelectorAll('#view *')].filter(e => e.getBoundingClientRect().right > innerWidth + 1).length,
        heads: [...document.querySelectorAll('.cqg:not([hidden]) .cqht')].map(h => h.textContent),
        first: [...document.querySelectorAll('.cqg:first-of-type .cqtile')].map(b => b.dataset.g),
        tiles: [...document.querySelectorAll('.cqtile')].map(b => b.dataset.g),
        note: !!document.querySelector('.cqnote'),
        play: pool()
      }));
    const s0 = await state();
    await p.click('[data-cv="mix"]');
    const m0 = await state();
    // A player who mixed Pocillopora up with Stylophora 4 times and Seriatopora with Stylophora 3 times.
    await p.evaluate(() => {
      P.Pocillopora = {...(P.Pocillopora || {}), ok: 3, ko: 4, conf: {Stylophora: 4}};
      P.Seriatopora = {...(P.Seriatopora || {}), ok: 2, ko: 3, conf: {Stylophora: 3}};
    });
    await p.click('[data-cv="prog"]');
    const g0 = await state();
    await p.click('[data-cv="mix"]');
    const m1 = await state();
    await p.click('[data-cv="imr"]');
    for (const g of ['Acropora', 'Pocillopora', 'Porites']) await p.click(`.cqtile[data-g="${g}"]`);
    const s1 = await state();
    await p.click('[data-clear]');
    const s2 = await state();
    await p.selectOption('#cqlk', 'Pocillopora');
    const s3 = await state(),
      looks = await p.evaluate(() => cqLooks('Pocillopora', pool()).sort());
    await p.fill('#cqq', 'acro');
    const s5 = await state();
    await p.click('[data-cv="mix"]'); // the view kept after the reload
    await p.reload();
    await p.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
    await p.waitForSelector('.cqtile');
    const s6 = await state();
    const all = L => [...new Set(L)].sort().join(),
      trio = s0.play.filter(n => ['Pocillopora', 'Stylophora', 'Seriatopora'].includes(n)); // a cluster in the game's order
    if (
      s0.view !== 'imr' ||
      s0.heads.length < 5 || // the IMR lecture groups, every genus in play in view, the first group in the IMR order
      all(s0.tiles) !== all(s0.play) ||
      s0.first.join() !== s0.play.filter(n => s0.first.includes(n)).join() ||
      s0.on.length ||
      s0.start ||
      !s0.tabs ||
      s0.wide ||
      m0.view !== 'mix' ||
      !m0.note || // no mix-up yet: the declared look-alike sets, said so
      m0.heads.length < 3 ||
      m0.wide ||
      g0.view !== 'prog' ||
      !g0.heads.includes('Not seen yet') ||
      !g0.heads.some(h => /^(To review|Learning)$/.test(h)) ||
      g0.wide ||
      m1.note ||
      m1.heads[0] !== `${trio.join(' · ')} 7 mix-ups` ||
      m1.first.join() !== trio.join() ||
      m1.wide ||
      s1.on.join() !== 'Acropora,Pocillopora,Porites' ||
      !s1.start ||
      s1.n !== '3 genera' ||
      s2.on.length ||
      s2.start ||
      s3.on.join() !== looks.join() ||
      looks.length < 2 ||
      s5.shown.some(g => !/acro/i.test(g)) ||
      !s5.shown.includes('Acropora') ||
      s6.view !== 'mix' ||
      s6.on.join() !== looks.join() ||
      !s6.start
    )
      fails.push(
        `custom quiz selection: ${JSON.stringify({s0, m0, g0, m1, s1, s2, s3, looks, s5, s6}, (k, v) => (k === 'play' || k === 'tiles' ? undefined : v))}`
      );
    // 360 px: every view fits the width.
    await p.setViewportSize({width: 360, height: 780});
    for (const v of ['imr', 'mix', 'prog']) {
      await p.click(`[data-cv="${v}"]`);
      const w = await state();
      if (w.wide || !w.tabs) fails.push(`custom quiz at 360 px, view ${v}: ${w.wide} elements wider than the screen, tabs fit ${w.tabs}`);
    }
    await p.click('[data-cv="imr"]');
    await p.setViewportSize({width: 390, height: 844});
    await p.click('[data-start]');
    const asked = [],
      modes = [];
    for (let i = 0; i < 12; i++) {
      await qa.ready(p);
      const r = await p.evaluate(i => {
        document.querySelectorAll('.unlock').forEach(x => (x.ulClose ? x.ulClose() : x.remove()));
        const {t} = smokeAnswer(i % 4 !== 3);
        const L = store.get(LOG0, []);
        return {h: location.hash, t, m: (L[L.length - 1] || {}).m};
      }, i);
      asked.push(r.t);
      modes.push(r.m);
      if (r.h !== '#practice/custom/play') fails.push(`custom quiz: question ${i + 1} on ${r.h}`);
      await p.click('#next');
    }
    if (asked.some(g => !looks.includes(g)) || modes.some(m => !/^quiz\|s(\||$)/.test(m || '')))
      fails.push(`custom quiz play: asked ${asked.join(', ')} (picked ${looks.join(', ')}); logged ${modes.join(', ')}`);
    await c.close();
  }
  // The Practice tabs (app.js MODES; Pierre, 2026-11-03: "Photo → genus" became Quiz, "Custom" Custom quiz): their names
  // at each size class, all four in the bar without scrolling it at 360 and 390 px, the tab of the page
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
      await p.goto(base + '#' + addr(h));
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
  // The apology card (core.js SORRY, sorryOf, sorryFelt; progress.js sorryNotice; 2026-11-04): once, at app open, to a
  // player who felt the broken opening (20 answers or more between #408's merge and the first run of this version, the
  // opening hold's sum at 3 or more then); "Hi!" signed out (the sign-in name: signin(), below); its button or Escape
  // close it for good; never to a player of a single answer or whose answers are all from before. The clock is fixed on
  // the morning after (Manila), so the test does not expire with the card.
  for (const [lab, at, n, want] of [
    ['25 answers in the window, the hold at 3.5', '2026-11-03T13:00:00Z', 25, 'Hi! Sorry about your last run.'],
    ['one answer in the window', '2026-11-03T13:00:00Z', 1, null],
    ['25 answers before it', '2026-11-03T09:00:00Z', 25, null]
  ]) {
    const [c, p] = await open(
      {viewport: {width: 390, height: 800}, timezoneId: 'Asia/Manila'},
      ({t, n}) => {
        localStorage.setItem('reefid-tour', '"done"');
        localStorage.setItem('reefid-sync-coral-start', '{"c":"new","t":1}');
        localStorage.setItem('reefid-nudge', '1');
        localStorage.setItem('reefid-recalc', '"typed-questions-2026-11"'); // the last update note: seen
        if (localStorage.getItem('reefid-sync-coral-progress')) return;
        const last = t + n * 20000;
        localStorage.setItem(
          'reefid-sync-coral-progress',
          JSON.stringify({'~level': {ok: n, ko: 0, th: 0.5, at: last}, Acropora: {ok: n, ko: 0, h: '1111', at: last}})
        );
        localStorage.setItem('reefid-hold', String(n > 1 ? 3.5 : 0.7));
        localStorage.setItem(
          'reefid-log0',
          JSON.stringify(
            Array.from({length: n}, (_, k) => ({
              id: 'x' + k,
              t: new Date(t + k * 20000).toISOString(),
              g: 'Acropora',
              a: 'Acropora',
              ok: 1,
              e: 0.8
            }))
          )
        );
      },
      {t: Date.parse(at), n}
    );
    await p.clock.setFixedTime(new Date('2026-11-04T03:00:00Z'));
    await p.goto(base);
    await p.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
    if (want) {
      await p.waitForSelector('.sorry', {timeout: 8000}).catch(() => {});
      const r = await p.evaluate(() => ({
        n: document.querySelectorAll('.unlock').length,
        h: (document.querySelector('.sorry h3') || {}).textContent,
        t: (document.querySelector('.sorry p:not(.ulkick)') || {}).textContent
      }));
      if (r.n !== 1 || r.h !== want || !/^Yesterday evening we adjusted how the app picks your questions/.test(r.t || ''))
        fails.push(`apology card, ${lab}: ${JSON.stringify(r)}`);
      await p.keyboard.press('Escape');
      if (await p.$('.sorry')) fails.push('apology card: Escape does not close it');
      await p.reload();
      await p.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
    }
    // Not a fixed wait: start-up says when its one-time cards are settled (progress.js window.CARDS_SAID, read true only
    // once APP_READY is set, after sorryNotice ran); the apology, if due, is on screen by then. Its first-run record proves
    // the decision was made (sorryNotice writes it before deciding).
    const said = await p
      .waitForFunction(() => window.CARDS_SAID && localStorage.getItem('reefid-sorry-first'), null, {timeout: 25000})
      .then(() => true)
      .catch(() => false);
    if (!said) fails.push(`apology card, ${lab}: start-up never settled its cards`);
    if (await p.$('.sorry'))
      fails.push(
        `apology card, ${lab}: ${want ? 'shown twice' : 'shown'} ${await p.evaluate(() => localStorage.getItem('reefid-sorry-first'))}`
      );
    await c.close();
  }
  // Q309: Send feedback (the ? help's last line) with a game question on screen carries that question's unit and photos, as
  // a report does (app.js fbCtx, quiz.js qNow); sent from a page with no question, neither.
  {
    const [c, p] = await open({viewport: {width: 390, height: 800}}, () => {
      localStorage.setItem('reefid-tour', '"done"');
      localStorage.setItem('reefid-sync-coral-start', '{"c":"new","t":1}');
      localStorage.setItem('reefid-nudge', '1');
      localStorage.setItem('reefid-recalc', '"typed-questions-2026-11"');
      localStorage.getItem('reefid-sync-coral-progress') ||
        localStorage.setItem('reefid-sync-coral-progress', JSON.stringify({Acropora: {ok: 3, ko: 1, h: '1101'}}));
    });
    const feedback = async () => {
      await p.evaluate(() => document.querySelectorAll('.unlock').forEach(x => x.remove()));
      await p.click('#help');
      await p.click('#helpbox [data-rep]');
      await p.check('#repdlg input[name="why"][value="bug"]');
      await p.click('#repdlg button[type="submit"]');
      await p.waitForTimeout(300);
      return p.evaluate(() => JSON.parse(localStorage.getItem('reefid-reports') || '[]').pop() || null);
    };
    await p.goto(base + '#practice/quiz');
    await p.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
    await qa.ready(p);
    // The corallites hint, when the question has one: its photo is one of those shown, so it goes too (Codex review #785).
    const hint = await p.evaluate(() => !!document.getElementById('hintb'));
    if (hint) await p.click('#hintb');
    const q = await p.evaluate(() => ({
      now: qNow(),
      shown: [...document.querySelectorAll('#view .qstage img[data-f]')].map(i => i.dataset.f)
    }));
    const r = await feedback();
    if (!r || !q.now || r.m !== 'page' || !r.g || r.g !== q.now.g || !r.ph || r.ph !== q.shown.join(' ') || r.w !== 'practice/quiz')
      fails.push(`Send feedback from a game: ${JSON.stringify({r, q, hint})}`);
    await p.evaluate(() => (location.hash = 'about'));
    await p.waitForSelector('#view [data-rep]', {timeout: 10000}).catch(() => {});
    const a = await feedback();
    if (!a || a.g || a.ph || a.w !== 'about') fails.push(`Send feedback from About: ${JSON.stringify(a)}`);
    await c.close();
  }
  // Q65: the Contributions. A report sent pops up its tier at once (1st, 5th, 10th), signed out; an "Other" report counts
  // only with a note, several reports on one photo count once; the learning count on #ach leaves them out.
  {
    const [c, p] = await open({viewport: {width: 390, height: 800}}, seen);
    await p.goto(base + '#learn/genus/Acropora');
    await p.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
    await p.waitForSelector('.repline [data-rep]', {timeout: 10000}).catch(() => {});
    // One report through the dialog: kind of report, note, then Send; returns the toast's title (or '' with none).
    const send = async (ctx, why, note) => {
      await p.evaluate(ctx => {
        const b = document.createElement('button');
        document.body.append(b);
        reportDialog(ctx, b);
      }, ctx);
      await p.check(`#repdlg input[name="why"][value="${why}"]`);
      if (note) await p.fill('#repdlg textarea[name="note"]', note);
      await p.click('#repdlg button[type="submit"]');
      // A toast (the first) or a card (the 5th and 10th: they stay until closed, their button deaf for a moment).
      const t = await p
        .waitForSelector('.achpop b, .unlock.achcard h3', {timeout: 1500})
        .then(async e => ((await e.evaluate(x => !!x.closest('.unlock'))) ? 'card: ' : 'toast: ') + (await e.textContent()).trim())
        .catch(() => '');
      if (t.startsWith('card')) {
        const early = await p.evaluate(() => document.querySelector('.unlock.achcard [data-b="1"]').disabled);
        await p.waitForTimeout(400);
        const still = await p.$('.unlock.achcard'); // no time-out
        await p.click('.unlock.achcard [data-b="1"]');
        if (!early || !still || (await p.$('.unlock.achcard')))
          fails.push(`Contributions card: ${JSON.stringify({early, still: !!still})}`);
      }
      await p.evaluate(() =>
        document.querySelectorAll('.achpop a').forEach(a => {
          a.addEventListener('click', e => e.preventDefault()); // closes it, without opening #ach
          a.click();
        })
      );
      return t;
    };
    const got = [];
    // The genus sheet's own button first, "Other" without a note: not counted, no toast.
    await p.click('.repline [data-rep]');
    await p.check('#repdlg input[name="why"][value="other"]');
    await p.click('#repdlg button[type="submit"]');
    await p.waitForTimeout(600);
    got.push(await p.evaluate(() => document.querySelector('.achpop b')?.textContent || ''));
    got.push(await send({k: 'sheet', g: 'Acropora', m: 'sheet'}, 'info'));
    got.push(await send({k: 'photo', g: 'Acropora', ph: ['smoke-a.webp'], m: 'photo'}, 'photo'));
    got.push(await send({g: 'Acropora', a: 'Porites', ph: ['smoke-a.webp', 'smoke-b.webp'], m: 'quiz'}, 'wrong')); // smoke-a again
    got.push(await send({g: 'Acropora', a: 'Porites', ph: ['smoke-c.webp'], m: 'quiz'}, 'other', 'two colonies'));
    got.push(await send({k: 'page'}, 'idea'));
    got.push(await send({k: 'page'}, 'bug'));
    const n = await p.evaluate(() => JSON.parse(localStorage.getItem('reefid-sync-ach') || '{}')._fb?.length);
    for (let i = 0; i < 5; i++) got.push(await send({k: 'page'}, 'bug'));
    const want = ['', 'toast: First feedback', '', '', '', '', 'card: Helping hand 🥈', '', '', '', '', 'card: Co-author 🥇'];
    if (JSON.stringify(got) !== JSON.stringify(want) || n !== 5) fails.push(`Contributions: ${JSON.stringify({got, n})}`);
    await p.evaluate(() => (location.hash = 'leaderboard/achievements'));
    await p.waitForSelector('.btitle.bsec', {timeout: 5000}).catch(() => {});
    const a = await p.evaluate(() => ({
      title: document.querySelector('.btitle')?.textContent,
      learn: ACH.filter(x => x.kind !== 'contrib').length,
      sec: document.querySelector('.btitle.bsec')?.textContent,
      on: [...document.querySelectorAll('.btitle.bsec + .achl .achc.on b')].map(b => b.textContent.trim())
    }));
    if (a.title !== `0/${a.learn} earned` || !/^Contributions 10 reports sent/.test(a.sec || '') || a.on.length !== 3)
      fails.push(`Contributions on #ach: ${JSON.stringify(a)}`);
    await c.close();
  }
  // A device still signed in with an account the admin deleted (the sheet said 'gone'): its reports count nothing.
  {
    const [c, p] = await open({viewport: {width: 390, height: 800}}, () => {
      localStorage.setItem('reefid-tour', '"done"');
      localStorage.setItem('reefid-sync-coral-start', '{"c":"new","t":1}');
      localStorage.setItem('reefid-nudge', '1');
      localStorage.setItem('reefid-account', JSON.stringify({name: 'Testa', pin: '1234', err: 'gone', into: ''}));
    });
    await p.goto(base + '#learn/genus/Acropora');
    await p.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
    await p.evaluate(() => {
      const b = document.createElement('button');
      document.body.append(b);
      reportDialog({k: 'page'}, b);
    });
    await p.check('#repdlg input[name="why"][value="bug"]');
    await p.click('#repdlg button[type="submit"]');
    await p.waitForTimeout(800);
    const g = await p.evaluate(() => ({
      toast: !!document.querySelector('.achpop'),
      fb: (JSON.parse(localStorage.getItem('reefid-sync-ach') || '{}')._fb || []).length
    }));
    if (g.toast || g.fb) fails.push(`Contributions on a deleted account: ${JSON.stringify(g)}`);
    await c.close();
  }
  // Feedback sent from About before the achievements' tier has come (progress.js, tier 2): counted once it comes, its
  // pop-up then (Codex review #579).
  {
    const [c, p] = await open({viewport: {width: 390, height: 800}}, seen);
    let go;
    const held = new Promise(ok => (go = ok));
    await c.route(
      u => /\/progress\.js/.test(u.pathname),
      async r => {
        await held;
        await r.continue();
      }
    );
    await p.goto(base + '#about', {waitUntil: 'domcontentloaded'}); // its load event waits for the held file
    await p.waitForSelector('#view [data-rep]', {timeout: 30000}).catch(() => {});
    await p.click('#view [data-rep]');
    await p.check('#repdlg input[name="why"][value="idea"]');
    await p.click('#repdlg button[type="submit"]');
    const before = await p.evaluate(() => typeof achReport);
    go();
    const t = await p
      .waitForSelector('.achpop b', {timeout: 15000})
      .then(e => e.textContent())
      .catch(() => '');
    if (before !== 'undefined' || t !== 'First feedback') fails.push(`Contributions before tier 2: ${JSON.stringify({before, t})}`);
    await c.close();
  }
  // Q66: "Your feedback helped". A report of this device's that the admin marked done (curation.json seen 'rep:<id>') is
  // told by a card that stays until closed (its OK deaf for a moment), at a calm moment; then everything handled since in
  // one card, at most once per 7 days (anti-spam, Pierre 2026-11-05); the sheet's list counts only from v57; signed in,
  // nothing before the load reply; never for an account the admin deleted.
  const helpedCtx = async (acct, rec) => {
    const [c, p] = await open(
      {viewport: {width: 390, height: 800}},
      ([acct, rec]) => {
        localStorage.setItem('reefid-tour', '"done"');
        localStorage.setItem('reefid-sync-coral-start', '{"c":"new","t":1}');
        localStorage.setItem('reefid-nudge', '1');
        if (acct) localStorage.setItem('reefid-account', JSON.stringify(acct));
        if (!localStorage.getItem('reefid-sync-ach')) localStorage.setItem('reefid-sync-ach', JSON.stringify(rec));
      },
      [acct, rec]
    );
    await c.route(
      u => u.pathname.endsWith('/curation-play.json'), // the app's copy (tools/curplay.py)
      async r => {
        const res = await r.fetch(),
          j = await res.json();
        j.seen = {...(j.seen || {}), 'rep:smk1': 1, 'rep:smk2': 1, 'rep:smk3': 1};
        await r.fulfill({response: res, json: j});
      }
    );
    return [c, p];
  };
  // The card on screen: [kicker, title, text, OK deaf at first], closed with its OK; null when none comes within ms.
  const cardOf =
    p =>
    async (ms = 3000) => {
      const e = await p.waitForSelector('.unlock.helped', {timeout: ms}).catch(() => null);
      if (!e) return null;
      const t = await p.evaluate(() => {
        const d = document.querySelector('.unlock.helped');
        return [
          d.querySelector('.ulkick').textContent,
          d.querySelector('h3').textContent,
          d.querySelector('.ulpanel p:not(.ulkick)').textContent,
          d.querySelector('[data-b="1"]').disabled
        ];
      });
      await p.click('.unlock.helped [data-b="1"]');
      return t;
    };
  {
    const [c, p] = await helpedCtx(null, {_v: 2, _rep: ['smk1', 'smk9']});
    const card = cardOf(p);
    await p.goto(base);
    await p.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
    const t1 = await card(),
      r1 = await p.evaluate(() => JSON.parse(localStorage.getItem('reefid-sync-ach')));
    await p.evaluate(() => repsSeen({v: 56, reps: ['smk2']})); // an older script: not used
    await p.evaluate(() => repsSeen({v: 57, reps: ['smk2', 'smk3', 'smk1']}));
    const t2 = await card(1500); // within the 7 days: nothing
    // 8 days later (the last thanks moved back): the two handled since, in one card.
    await p.evaluate(() => {
      const A = JSON.parse(localStorage.getItem('reefid-sync-ach'));
      A._thxAt -= 8 * 864e5;
      localStorage.setItem('reefid-sync-ach', JSON.stringify(A));
      achHelped();
    });
    const t3 = await card();
    await p.reload();
    await p.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
    const t4 = await card(2000);
    if (
      JSON.stringify(t1) !== JSON.stringify(['Thank you', 'Your feedback helped', 'A report you sent was looked at and handled.', true]) ||
      JSON.stringify(r1._thx) !== '["smk1"]' ||
      typeof r1._thxAt !== 'number' ||
      t2 ||
      !t3 ||
      t3[2] !== '2 reports you sent were looked at and handled.' ||
      t4
    )
      fails.push(`Your feedback helped: ${JSON.stringify({t1, r1, t2, t3, t4})}`);
    await c.close();
  }
  // A report handled in a PR (reports-handled.json, the integrator's) is thanked like Pierre's Done.
  {
    const [c, p] = await helpedCtx(null, {_v: 2, _rep: ['smk7']});
    await c.route(
      u => u.pathname.endsWith('/reports-handled.json'),
      r => r.fulfill({contentType: 'application/json', body: JSON.stringify({smk7: {pr: 577, at: '2026-11-05'}})})
    );
    const card = cardOf(p);
    await p.goto(base);
    await p.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
    const t = await card();
    if (!t || t[2] !== 'A report you sent was looked at and handled.')
      fails.push(`Your feedback helped, handled in a PR: ${JSON.stringify(t)}`);
    await c.close();
  }
  // Never over an enlarged photo (Codex review #581): a thanks due while the lightbox is open waits for it to close.
  {
    const [c, p] = await helpedCtx(null, {_v: 2});
    const card = cardOf(p);
    await p.goto(base + '#learn/genera');
    await p.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
    await p.waitForTimeout(500);
    await p.evaluate(() => {
      const g = Object.keys(DATA.gen)[0];
      zoom([{...Object.values(DATA.gen[g].views)[0][0], genus: g}], 0);
      const A = store.get('reefid-sync-ach', {}) || {};
      A._rep = ['smk1'];
      store.set('reefid-sync-ach', A);
      achHelped();
    });
    const over = await card(2000);
    const lbOpen = await p.evaluate(() => !document.getElementById('lightbox').hidden);
    await p.evaluate(() => document.querySelector('#lightbox [data-x]')?.click());
    const after = await card();
    if (over || !lbOpen || !after) fails.push(`Your feedback helped, enlarged photo: ${JSON.stringify({over, lbOpen, after: !!after})}`);
    await c.close();
  }
  // A calm moment: never over a question; in the quiz, at the break at Next, then on to the next question.
  {
    const [c, p] = await helpedCtx(null, {_v: 2, _rep: ['smk1']});
    const card = cardOf(p);
    await p.goto(base + '#practice/quiz');
    await p.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
    await qa.ready(p, {timeout: 15000});
    // The thanks is due once curation.json is in (Pierre's Done): on a slow runner it can come after the first answer,
    // and the card then waits for a later break, so the check waits for it (a flake on CI, #603).
    await p.waitForFunction(() => helpedIds().length > 0, null, {timeout: 10000}).catch(() => {});
    const q1 = await card(2000); // the question waits for its answer: no card
    // A wrong answer, never a right one: a right answer can earn an achievement (Look-alike slayer on a duel, Corallite
    // reader on corallites alone, Sharp eye), whose toast is up when the answer arms the break, and the thanks then waits
    // for a later break (never over a toast); which question comes first is drawn at random, so a right answer made this
    // check fail now and then on CI, never on a re-run (#603, #652). A wrong answer earns none.
    await p.evaluate(() => smokeAnswer(false));
    await p.waitForSelector('#next', {timeout: 5000});
    const toast = await p.evaluate(() => document.querySelector('.achpop b')?.textContent || null); // none: else no break
    const a1 = await card(1500); // the answer's feedback: still no card
    await p.click('#next');
    const n1 = await card();
    await p.waitForTimeout(800);
    const next = await p.evaluate(() => !!document.querySelector('#view .q') && QOPEN);
    if (q1 || a1 || !n1 || !next || toast)
      fails.push(`Your feedback helped, calm moment: ${JSON.stringify({q1, a1, n1, next, toast, target})}`);
    await c.close();
  }
  // Signed in: nothing before the sheet's load reply, whose saved record may say the report was thanked on another
  // device (Codex review #581); after it, only what is still not thanked.
  {
    const [c, p] = await helpedCtx({name: 'Testa', pin: '1234'}, {_v: 2, _rep: ['smk1', 'smk2']});
    const card = cardOf(p);
    await p.goto(base);
    await p.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
    const early = await card(2000);
    // The load reply: smk1 thanked on another device (its record merged, its thanks time far back), smk2 not.
    await p.evaluate(() => {
      achMerge(JSON.stringify({_v: 2, _rep: ['smk1'], _thx: ['smk1'], _thxAt: Date.now() - 30 * 864e5}));
      repsSeen({ok: true, found: true, v: 57});
    });
    const t = await card();
    if (early || !t || t[2] !== 'A report you sent was looked at and handled.')
      fails.push(`Your feedback helped, signed in: ${JSON.stringify({early, t})}`);
    await c.close();
  }
  // An account the admin deleted (the sheet answered 'gone'): its reports are never thanked, whatever the device holds.
  {
    const [c, p] = await helpedCtx({name: 'Testa', pin: '1234', err: 'gone', into: ''}, {_v: 2, _rep: ['smk1']});
    const card = cardOf(p);
    await p.goto(base);
    await p.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
    await p.evaluate(() => repsSeen({ok: true, found: true, v: 57, reps: ['smk2']}));
    const t = await card(2000);
    if (t) fails.push(`Your feedback helped, deleted account: ${JSON.stringify(t)}`);
    await c.close();
  }
  return fails;
}

// Signing in to an existing account (Pierre, 2026-11-03: players type only their first name, so two of them can pick the
// same name, even the same simple code). The sheet is never reached (rule D1): every request to the sync
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
    log.push(
      body
        ? {post: 1, name: body.name || '', data: !!body.data, keys: Object.keys(body.data || {}), del: body.selfDelete ? body.dname : ''}
        : {get: 1, name: q.get('name') || ''}
    );
    localStorage.setItem('test-sheet-log', JSON.stringify(log));
    const at = Date.parse('2026-10-20T09:30:00Z'),
      prog = JSON.stringify({'~level': {ok: 200, ko: 45, th: 0.4, at}, Acropora: {ok: 30, ko: 5, th: 0.3, at}}),
      // test-sheet-old: the account as an app from before the rename to IMR Reef ID saved it (the old key names).
      account = localStorage.getItem('test-sheet-old')
        ? {'imr-coral-progress': prog, 'imr-coral-quiz': '{"bon":false}'} // rename-app: keep
        : {'reefid-sync-coral-progress': prog, 'reefid-sync-coral-quiz': '{"bon":false}'};
    // sheet v58: a player deletes their own account (sync.js viewDeleteAccount): Anna's code only.
    if (body && body.selfDelete)
      return body.dname === 'Anna' && body.dpin === '1234' ? {ok: true, deleted: true, v: 58} : {ok: false, error: 'pin', v: 58};
    if (body) return body.name ? {ok: true, log: true, rev: 4} : {ok: false, error: 'input'};
    // test-sheet-board: the leaderboard rows the stub serves (GET ?board=1), for the one-level check below.
    if (q.get('board') && localStorage.getItem('test-sheet-board'))
      return {ok: true, rows: JSON.parse(localStorage.getItem('test-sheet-board'))};
    if (!q.get('name')) return {ok: false};
    if (q.get('name').toLowerCase() !== 'anna') return {ok: true, found: false};
    if (q.get('pin') !== '1234') return {ok: false, error: 'pin'};
    // test-sheet-acct: the account's generation (sheet v58 _acct), as a name taken again after an archive has another
    const acct = localStorage.getItem('test-sheet-acct');
    return {ok: true, found: true, updated: '2026-10-20T10:00:00.000Z', rev: 3, data: account, ...(acct ? {acct} : {})};
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
    if (!localStorage.getItem('reefid-tour')) localStorage.setItem('reefid-tour', '"done"');
    localStorage.setItem('reefid-sync-coral-start', '{"c":"new","t":1}');
    localStorage.setItem('reefid-nudge', '1');
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
      sync: localStorage.getItem('reefid-account'),
      log0: JSON.parse(localStorage.getItem('reefid-log0') || '[]').length,
      prog: JSON.parse(localStorage.getItem('reefid-sync-coral-progress') || '{}'),
      posts: JSON.parse(localStorage.getItem('test-sheet-log') || '[]').filter(x => x.post && x.name)
    }));
  // Signed out, the leaderboard's note opens the sign-in card itself (it sent players to ⚙ Settings, where sign-in no
  // longer is: rule U9). A cached board paints at once, whatever the sheet stub answers.
  await run(
    () => {
      if (!localStorage.getItem('reefid-tour')) localStorage.setItem('reefid-tour', '"done"');
      localStorage.setItem('reefid-sync-coral-start', '{"c":"new","t":1}');
      localStorage.setItem('reefid-nudge', '1');
      localStorage.setItem('reefid-board-cache', JSON.stringify({rows: [['Ana B.', 40, 1200]], t: Date.now()}));
    },
    async p => {
      await p.evaluate(() => go('board'));
      await p.waitForSelector('#board #bsign', {timeout: 8000});
      const t = await p.textContent('#board .note');
      if (/Settings/.test(t)) fails.push('sign-in: the leaderboard note still points to ⚙ Settings: ' + t);
      await p.click('#board #bsign');
      await p.waitForSelector('.signnudge form.sform', {timeout: 5000});
    }
  );
  // The sign-in card is the app's, not a subject's (Pierre, 2026-11-04: "it's the app we want people to sign in to, not
  // the game mode"): a player who plays only fish meets it at their 20th answer, as a coral player does (it counted the
  // answers queued for the sheet, which took no fish answers then, so it never came). Fish is opened to this player in the
  // page, as the admin's group will (core.js SUBJECTS beta).
  // Fish opens to all since 2026-11-06 (Q158): the page starts on the corals (no saved choice), so Fish is switched on
  // Tools below.
  await run(
    () => (
      localStorage.setItem('reefid-tour', '"done"'),
      localStorage.setItem('reefid-sync-fish-start', '{"c":"new","t":1}') // the fish welcome question answered
    ),
    async p => {
      // The visit log on the way (Codex review #466): Fish switched on the same page (Tools) closes the coral page and opens
      // the fish one, fish.tools (it kept counting the coral one: the tally knew the hash only).
      await p.evaluate(() => go('lab'));
      await p.waitForFunction(() => hashNow() === 'lab' && PV.cur && PV.cur.n === 'tools', null, {timeout: 15000});
      await p.evaluate(() => {
        SUBJECTS.find(S => S.id === 'fish').open = 'all'; // opened to every player (core.js SUBJECTS open)
        return setSubject('fish');
      });
      await p.waitForFunction(() => SUBJ.id === 'fish', null, {timeout: 15000});
      const pv = await p.evaluate(() => ({cur: PV.cur && PV.cur.n, r: Object.keys(PV.r).sort()}));
      if (pv.cur !== 'fish.tools' || !pv.r.includes('tools') || !pv.r.includes('fish.tools'))
        fails.push('visit log, Fish switched on the same page: ' + JSON.stringify(pv));
      await p.evaluate(() => go('quiz'));
      await p.waitForFunction(() => SUBJ.id === 'fish' && document.querySelector('#view .q'), null, {timeout: 15000});
      await qa.install(p);
      const r = await p.evaluate(async SEL => {
        // The fish achievements already held: their pop-ups (First families at about 20 answers) would hold the card a few
        // answers (quiz.js promptOk: no prompt with an achievement toast), which is not what this checks.
        store.set(ACHK, {_v: ACH_V, ...Object.fromEntries(FISH_ACH.map(a => [a.id, 1]))});
        // The Scientific names offer answered too: it may come inside these 20 answers (a family at Advanced),
        // and an offer card holds the sign-in card the same way.
        Q.sci = false;
        saveQ();
        // Waits on what the app draws, never a fixed sleep (a loaded machine runs it slower).
        const at = [],
          until = async f => {
            for (let k = 0; k < 300 && !f(); k++) await new Promise(ok => setTimeout(ok, 10));
            return f();
          };
        for (let i = 0; i < 40 && answersSoFar() < 22; i++) {
          document.querySelectorAll('.unlock').forEach(d => (d.ulClose ? d.ulClose() : d.remove()));
          if (!document.querySelector('#view .q:not(.done)')) quizPhoto();
          // a Find the X's tiles counted in first (tests/answer.js smokeTiles: the photos' host is out of reach here)
          if (!(await until(() => (window.smokeTiles && smokeTiles(), document.querySelector(SEL))))) break;
          const n0 = answersSoFar();
          smokeAnswer();
          // The answer's feedback drawn (or the wink's): the sign-in card, when due, is up by then (quiz.js answer).
          await until(() => document.querySelector('#view .q.done') && document.getElementById('next'));
          if (document.querySelector('.unlock.signnudge')) at.push(answersSoFar());
          document.querySelectorAll('.unlock').forEach(d => (d.ulClose ? d.ulClose() : d.remove()));
          if (answersSoFar() === n0 && !document.querySelector('#view .q.wink')) break; // no answer taken: stop, reported below
          route();
        }
        return {at, n: answersSoFar(), subj: SUBJ.id, used: localStorage.getItem('reefid-nudge'), log0: store.get(LOG0, []).length};
      }, qa.SEL);
      // Its fish answers wait on the device for the sheet like coral ones (LOG0; sheet v60 logs every subject's).
      if (r.subj !== 'fish' || r.at.length !== 1 || r.at[0] !== 20 || r.used !== '1' || r.log0 !== r.n)
        fails.push('sign-in card for a fish-only player: ' + JSON.stringify(r));
    }
  );
  // The apology card greets a signed-in player by the first word of their sign-in name (core.js sorryText); asked here
  // with the clock on the morning after, the device's own answer in the window, the account from the stub sheet.
  await run(
    () => {
      localStorage.setItem('reefid-tour', '"done"');
      localStorage.setItem('reefid-sync-coral-start', '{"c":"new","t":1}');
      localStorage.setItem('reefid-nudge', '1');
      localStorage.setItem('reefid-recalc', '"typed-questions-2026-11"');
      // What the device read at this version's first run (core.js sorryOf): 30 answers in the window, the hold at 3.5.
      localStorage.setItem('reefid-sorry-first', JSON.stringify({t: Date.parse('2026-11-04T01:00:00Z'), n: 30, h: 3.5, c: 0}));
      localStorage.setItem('reefid-account', JSON.stringify({name: 'Anna', pin: '1234'}));
      const t = Date.parse('2026-11-03T13:00:00Z');
      localStorage.setItem(
        'reefid-sync-coral-progress',
        JSON.stringify({'~level': {ok: 5, ko: 1, th: 0.5, at: t}, Pavona: {ok: 5, ko: 1, at: t}})
      );
    },
    async p => {
      await p.clock.setFixedTime(new Date('2026-11-04T03:00:00Z'));
      await p.evaluate(() => document.querySelectorAll('.sorry').forEach(x => x.remove()));
      await p.evaluate(() => (localStorage.removeItem('reefid-sorry'), sorryNotice()));
      await p.waitForSelector('.sorry', {timeout: 5000});
      const h = await p.evaluate(() => document.querySelector('.sorry h3').textContent);
      if (h !== 'Hi Anna! Sorry about your last run.') fails.push(`apology card, signed in: ${h}`);
    }
  );
  // A device with progress of its own (3 answers played signed out).
  await run(
    () => {
      localStorage.setItem('reefid-tour', '"done"');
      localStorage.setItem('reefid-sync-coral-start', '{"c":"new","t":1}');
      localStorage.setItem('reefid-nudge', '1');
      localStorage.setItem('reefid-recalc', '"typed-questions-2026-11"'); // the last update note: seen
      if (localStorage.getItem('test-own')) return;
      localStorage.setItem('test-own', '1');
      const t = new Date().toISOString();
      localStorage.setItem(
        'reefid-log0',
        JSON.stringify([1, 2, 3].map(i => ({id: 'own' + i, t, g: 'Porites', a: 'Porites', ok: 1, m: 'quiz'})))
      );
      localStorage.setItem('reefid-sync-coral-progress', JSON.stringify({Porites: {ok: 3, ko: 0, th: 0.2}}));
    },
    async p => {
      await card(p);
      const ph = await p.getAttribute('.signnudge input[name=n]', 'placeholder');
      if (!/initial/i.test(ph || '')) fails.push(`sign-in: the name field does not ask for the initial (placeholder "${ph}")`);
      // A nickname or alias is just as welcome (Pierre, 2026-11-04), said in the field's label, not only in the note below.
      const lb = await p.evaluate(() => document.querySelector('.signnudge input[name=n]').closest('label').textContent);
      if (!/nickname/i.test(lb)) fails.push(`sign-in: the name field's label does not offer a nickname ("${lb.trim()}")`);
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
      // A new account under a reserved name (core.js reservedName; Pierre, 2026-11-09): said on the form, nothing signed in
      // or saved.
      for (const nm of ['Constructor', '__proto__']) {
        await submit(p, nm, '1234');
        await p
          .waitForFunction(() => /reserved/.test(document.querySelector('.signnudge [role=status]').textContent), null, {timeout: 5000})
          .catch(() => {});
        const said = await p.textContent('.signnudge [role=status]'),
          st = await state(p);
        if (said !== 'This name is reserved, please choose another.') fails.push(`sign-in: the reserved name ${nm} says "${said}"`);
        if (st.sync || st.posts.length) fails.push(`sign-in: the reserved name ${nm} signed in or sent something`);
      }
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
    await p.waitForFunction(() => !!localStorage.getItem('reefid-account'), null, {timeout: 10000}).catch(() => {});
    const n = await state(p);
    if (!n.sync || JSON.parse(n.sync).name !== 'Anna B.' || (await p.$('.signnudge .sconfirm')))
      fails.push('sign-in: a new name did not sign in at once');
  });
  // A device from before the rename to IMR Reef ID (2026-11-03), signed in as Anna, with only the old key names, and an
  // account the sheet holds under the old names (an app from before the rename saved it last): the app starts signed in,
  // with this device's progress and theme, merges the account's, and sends the new names plus the old-name copies.
  // rename-app: keep-begin
  await run(
    () => {
      if (localStorage.getItem('test-old')) return;
      localStorage.setItem('test-old', '1');
      localStorage.setItem('test-sheet-old', '1');
      localStorage.setItem('imr-tour', '"done"');
      localStorage.setItem('imr-nudge', '1');
      localStorage.setItem('imr-recalc', '"millepora-counts-2026-11"');
      localStorage.setItem('imr-coral-theme', 'dark');
      localStorage.setItem('imr-coral-sync', JSON.stringify({name: 'Anna', pin: '1234', dirty: true, log: []}));
      localStorage.setItem('imr-coral-progress', JSON.stringify({Porites: {ok: 3, ko: 0, th: 0.2}}));
    },
    async p => {
      await p
        .waitForFunction(() => JSON.parse(localStorage.getItem('test-sheet-log') || '[]').some(x => x.post && x.name === 'Anna'), null, {
          timeout: 15000
        })
        .catch(() => {});
      const s = await p.evaluate(() => ({
        old: Object.keys(localStorage).filter(k => k.startsWith('imr-')),
        account: JSON.parse(localStorage.getItem('reefid-account') || 'null'),
        prog: JSON.parse(localStorage.getItem('reefid-sync-coral-progress') || '{}'),
        theme: document.documentElement.dataset.theme,
        signb: !!document.querySelector('#signb:not([hidden])'),
        sent:
          (
            JSON.parse(localStorage.getItem('test-sheet-log') || '[]')
              .filter(x => x.post && x.name === 'Anna')
              .pop() || {}
          ).keys || []
      }));
      if (s.old.length) fails.push('rename: old keys left on the device: ' + s.old.join(', '));
      if (!s.account || s.account.name !== 'Anna' || s.signb)
        fails.push('rename: a device signed in before the rename is no longer signed in');
      if ((s.prog.Porites || {}).ok !== 3)
        fails.push("rename: this device's progress was not kept: " + JSON.stringify(s.prog).slice(0, 120));
      if ((s.prog.Acropora || {}).ok !== 30) fails.push("rename: the account's progress saved under the old names was not read");
      if (s.theme !== 'dark') fails.push(`rename: the theme saved under the old name is not applied (${s.theme})`);
      if (!s.sent.includes('reefid-sync-coral-progress') || !s.sent.includes('imr-coral-progress') || s.sent.includes('reefid-account'))
        fails.push('rename: the sync does not send the new names with the old-name copies: ' + s.sent.join(', '));
    }
  );
  // rename-app: keep-end
  // An archived record (sheet v58, Q88; the audit's G4): the sheet no longer finds the name a device saved under (found
  // false with a revision on the device). The device pushes nothing (the record is not re-created) and says it was archived.
  await run(
    () => {
      if (!localStorage.getItem('reefid-tour')) localStorage.setItem('reefid-tour', '"done"');
      localStorage.setItem('reefid-sync-coral-start', '{"c":"new","t":1}');
      localStorage.setItem('reefid-nudge', '1');
      localStorage.setItem('reefid-account', JSON.stringify({name: 'Bea', pin: '5555', srv: 3, last: '2026-11-04T10:00:00Z'}));
    },
    async p => {
      await p
        .waitForFunction(() => (JSON.parse(localStorage.getItem('reefid-account') || '{}') || {}).err === 'archived', null, {
          timeout: 10000
        })
        .catch(() => {});
      await p.evaluate(() => (location.hash = '#about/delete-account'));
      await p.waitForSelector('.delacct', {timeout: 5000}).catch(() => {});
      const s = await p.evaluate(() => ({
        err: (JSON.parse(localStorage.getItem('reefid-account') || '{}') || {}).err,
        pushed: JSON.parse(localStorage.getItem('test-sheet-log') || '[]').some(x => x.post && x.name === 'Bea'),
        page: (document.querySelector('.delacct') || {}).innerText || ''
      }));
      if (s.err !== 'archived' || s.pushed || !/archived/.test(s.page))
        fails.push('archived record: the device does not stop and say so: ' + JSON.stringify(s).slice(0, 200));
    }
  );
  // The same name taken again after an archive (sheet v58 _acct, Codex review #603): the sheet finds an account of another
  // generation than the one this device saved under: archived too, nothing pushed.
  await run(
    () => {
      if (!localStorage.getItem('reefid-tour')) localStorage.setItem('reefid-tour', '"done"');
      localStorage.setItem('reefid-sync-coral-start', '{"c":"new","t":1}');
      localStorage.setItem('reefid-nudge', '1');
      localStorage.setItem('test-sheet-acct', 'new222');
      localStorage.setItem('reefid-account', JSON.stringify({name: 'Anna', pin: '1234', srv: 3, acct: 'old111', dirty: true}));
    },
    async p => {
      await p
        .waitForFunction(() => (JSON.parse(localStorage.getItem('reefid-account') || '{}') || {}).err === 'archived', null, {
          timeout: 10000
        })
        .catch(() => {});
      const s = await p.evaluate(() => ({
        err: (JSON.parse(localStorage.getItem('reefid-account') || '{}') || {}).err,
        pushed: JSON.parse(localStorage.getItem('test-sheet-log') || '[]').some(x => x.post && x.name === 'Anna')
      }));
      if (s.err !== 'archived' || s.pushed) fails.push('name taken again after an archive: the device does not stop: ' + JSON.stringify(s));
    }
  );
  // Deleting one's own account (Pierre, 2026-11-05; sheet v58 selfDelete): #about/delete-account, the code, a second step, then
  // the device signed out and cleared; the request carries dname / dpin (never name / pin), and a wrong code never leaves.
  await run(
    () => {
      if (sessionStorage.getItem('delinit')) return;
      sessionStorage.setItem('delinit', '1');
      if (!localStorage.getItem('reefid-tour')) localStorage.setItem('reefid-tour', '"done"');
      localStorage.setItem('reefid-sync-coral-start', '{"c":"new","t":1}');
      localStorage.setItem('reefid-nudge', '1');
      localStorage.setItem('reefid-sheet-v', '58');
      localStorage.setItem('reefid-account', JSON.stringify({name: 'Anna', pin: '1234', srv: 3, last: '2026-11-04T10:00:00Z'}));
      localStorage.setItem('reefid-sync-coral-progress', JSON.stringify({Porites: {ok: 3, ko: 0}}));
      localStorage.setItem(
        'reefid-reports',
        JSON.stringify([
          {rn: 'Anna', rp: '1234', id: 'q1', why: 'photo'},
          {rn: 'Zed', id: 'q2', why: 'photo'}
        ])
      );
      localStorage.setItem('reefid-report-name', '"Anna"');
    },
    async p => {
      await p.evaluate(() => (location.hash = '#about/delete-account'));
      await p.waitForSelector('.delform input[name=code]', {timeout: 5000});
      const txt = await p.$eval('.delacct', e => e.innerText);
      if (!/every answer you gave/.test(txt) || !/cannot be undone/.test(txt))
        fails.push('delete account: the page does not say what is deleted');
      await p.fill('.delform input[name=code]', '1111');
      await p.click('.delform button[type=submit]');
      const wrong = await p.$eval('.delacct [role=status]', e => e.textContent);
      if (!/not this account/.test(wrong)) fails.push('delete account: a wrong code is not refused here: ' + wrong);
      await p.fill('.delform input[name=code]', '1234');
      await p.click('.delform button[type=submit]');
      await p.waitForSelector('#dyes', {timeout: 3000});
      if (JSON.parse(await p.evaluate(() => localStorage.getItem('test-sheet-log') || '[]')).some(x => x.del))
        fails.push('delete account: sent before the second step');
      await p.click('#dyes');
      await p.waitForFunction(() => location.hash === '#about/delete-account/done' && document.querySelector('.delacct'), null, {
        timeout: 15000
      });
      const s = await p.evaluate(() => ({
        page: document.querySelector('.delacct').innerText,
        account: localStorage.getItem('reefid-account'),
        prog: localStorage.getItem('reefid-sync-coral-progress'),
        reports: JSON.parse(localStorage.getItem('reefid-reports') || '[]').map(x => x.id),
        rname: localStorage.getItem('reefid-report-name'),
        posts: JSON.parse(localStorage.getItem('test-sheet-log') || '[]').filter(x => x.del)
      }));
      if (!/were permanently deleted/.test(s.page) || s.account || s.prog || s.rname || s.reports.join() !== 'q2')
        fails.push('delete account: the device is not signed out and cleared: ' + JSON.stringify(s).slice(0, 240));
      if (s.posts.length !== 1 || s.posts[0].name) fails.push('delete account: the request: ' + JSON.stringify(s.posts));
    }
  );
  // One player level everywhere (Pierre, 2026-11-06, Q134): My progress shows the device's own level (P['~level'], Elo
  // 1000 + 200 × th) before and after the leaderboard arrives, whatever level the board holds for the player (the kept
  // copy and the fresh one both disagree here on purpose); the board's own row shows that same level, the others theirs.
  await run(
    () => {
      localStorage.setItem('reefid-tour', '"done"');
      localStorage.setItem('reefid-sync-coral-start', '{"c":"new","t":1}');
      localStorage.setItem('reefid-nudge', '1');
      localStorage.setItem('reefid-account', JSON.stringify({name: 'Anna', pin: '1234'}));
      const t = Date.parse('2026-11-05T01:00:00Z');
      localStorage.setItem(
        'reefid-sync-coral-progress',
        JSON.stringify({'~level': {ok: 250, ko: 50, th: 0.4, at: t}, Acropora: {ok: 30, ko: 5, th: 0.3, at: t}})
      );
      localStorage.setItem(
        'reefid-board-cache',
        JSON.stringify({
          rows: [
            ['Other P', 60, 1.5],
            ['Anna', 40, -1]
          ],
          t: Date.now() - 60000
        })
      );
      localStorage.setItem(
        'test-sheet-board',
        JSON.stringify([
          ['Other P', 60, 1.5],
          ['Anna', 41, -0.9]
        ])
      );
    },
    async p => {
      await p.evaluate(() => go('progress'));
      await p.waitForSelector('#pbrank:not([hidden])', {timeout: 8000});
      const before = (await p.textContent('#pbrank')).trim();
      const after = await p.evaluate(async () => {
        await loadBoard();
        await new Promise(r => setTimeout(r, 50));
        return document.getElementById('pbrank').textContent.trim();
      });
      if (before !== '🏆 #2 · Elo 1080' || after !== before)
        fails.push(`one level: My progress before / after the board: ${before} / ${after}`);
      await p.evaluate(() => go('board'));
      await p.waitForFunction(() => document.querySelectorAll('#board .blist li').length === 2, null, {timeout: 8000});
      const rows = await p.evaluate(() =>
        [...document.querySelectorAll('#board .blist li')].map(li => li.querySelector('.belo').textContent)
      );
      if (rows.join('|') !== 'Elo 1300|Elo 1080') fails.push('one level: the board shows ' + rows.join(' | '));
    }
  );
  // The tour's sign-in step: the same question.
  await run(
    () => localStorage.setItem('reefid-nudge', '1'),
    async p => {
      // Fish open to all (Q158): the tour starts with the subject to play (#629); the corals.
      await p.waitForSelector('#tour [data-pick], #tour [data-start]', {timeout: 10000}).catch(() => {});
      if (await p.$('#tour [data-pick="coral"]')) await p.click('#tour [data-pick="coral"]');
      await p.waitForSelector('#tour [data-start]', {timeout: 10000}).catch(() => {});
      if (await p.$('#tour [data-start]')) await p.click('#tour [data-start="imr"]'); // the first-launch question
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
// whole answer log, automatically). Nothing reaches the sheet (rule D1): every sync request is answered in the
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
    // The stub answers as a script before the domain-score bar (sv below core.js DOM_SHEET): its replay, and the app's
    // own answers on top, keep the moving average (dom: false, rule D4).
    rec = C.replayProgress(
      sheet.map(a => C.logRow(a, 'ana')),
      {gen: RGEN, dom: false}
    ).ana.P,
    all = C.replayProgress(
      [...sheet, mine].map(a => C.logRow(a, 'ana')),
      {gen: RGEN, dom: false}
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
        log.push(body ? {post: 1, rv: body.rv, data: body.data && body.data['reefid-sync-coral-progress']} : {get: 1, rv: q.get('rv')});
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
  const data = {'reefid-sync-coral-progress': JSON.stringify(old), 'reefid-sync-coral-quiz': '{"bon":false}'};
  const init = ([old, dev, mine, rv, data]) => {
    if (localStorage.getItem('test-init')) return;
    localStorage.setItem('test-init', '1');
    localStorage.setItem('reefid-tour', '"done"');
    localStorage.setItem('reefid-sync-coral-start', '{"c":"new","t":1}');
    localStorage.setItem('reefid-nudge', '1');
    localStorage.setItem('reefid-recalc', '"millepora-counts-2026-11"');
    localStorage.setItem('reefid-sync-coral-progress', JSON.stringify(dev));
    localStorage.setItem('reefid-account', JSON.stringify({name: 'Ana', pin: '1234', srv: 4, base: old, log: [mine], dirty: true, rev: 1}));
    if (rv) localStorage.setItem('reefid-sync-coral-rv', String(rv));
    // The account's saved copy is at that rules version too (sync.js mergeSaved: an older one makes the device adopt
    // again from 0, with version 1's card when its % moved).
    if (rv) localStorage.setItem('test-data', JSON.stringify({...data, 'reefid-sync-coral-rv': String(rv)}));
  };
  const posted = p =>
    p
      .waitForFunction(() => JSON.parse(localStorage.getItem('test-sheet-log') || '[]').some(x => x.post), null, {timeout: 15000})
      .catch(() => {});
  // The app never gets ahead of the sheet script (rule D4): a script before v28 (even one whose reply carried a
  // replay) changes nothing: the device keeps its own progress, sends its answer as before, records no rules version
  // and shows no card.
  {
    const [c, p] = await open(0, null, C.RV_SHEET - 1);
    await posted(p);
    await p.waitForTimeout(500);
    const s = await p.evaluate(() => ({
      P: JSON.parse(localStorage.getItem('reefid-sync-coral-progress') || '{}'),
      rv: localStorage.getItem('reefid-sync-coral-rv'),
      pending: (JSON.parse(localStorage.getItem('reefid-account') || '{}').log || []).length,
      card: !!document.querySelector('.rvmsg')
    }));
    const a = s.P.Acropora || {};
    if (a.pg !== dev.Acropora.pg || a.ok !== 2 || 'rv' in a || s.rv || s.pending || s.card)
      fails.push(`replay: adopted from a script before v${C.RV_SHEET}: ${JSON.stringify({a, rv: s.rv, pending: s.pending, card: s.card})}`);
    // The standard card (core.js RV_CARD, only: 'changed', min 5) is due only when the progress % moved by 5 points or
    // more, and then shows with the two % (progress.js rvNoticeAdd, rvNotice): on the versions before the apology.
    const card = v =>
      p.evaluate(v => {
        const d = [];
        for (const pct of [
          [10, 10],
          [10, 14],
          [10, 5]
        ]) {
          localStorage.removeItem('reefid-rv-msg');
          rvNoticeAdd(0, v, pct);
          // Shown at once when no other card is on screen (rvNotice waits behind one: the update note may be up here).
          document.querySelectorAll('.unlock, #tour').forEach(e => e.remove());
          rvNotice();
          // The card's text without its heading (the % may be on a line of its own: core.js RV_SORRY pct).
          const t = [...document.querySelectorAll('.rvmsg p:not(.ulkick)')].map(e => e.textContent).join(' ');
          d.push([JSON.parse(localStorage.getItem('reefid-rv-msg')).due, t]);
          document.querySelectorAll('.rvmsg').forEach(e => e.remove());
        }
        localStorage.removeItem('reefid-rv-msg');
        return d;
      }, v);
    // Rules version 9's, the apology (core.js RV_SORRY); every other version has the standard card (RV_CARD).
    const SV = C.RVS.find(x => x.msg === C.RV_SORRY).v;
    const due = await card(SV - 1);
    // Every version before the apology has the standard card (RV_CARD): it is due once, for the last of them (core.js rvMsgs).
    if (due[0][0].length || due[1][0].length || due[2][0].join() !== String(SV - 1) || !due[2][1].includes('went from 10% to 5%'))
      fails.push(`replay: the card's 5-point rule: ${JSON.stringify(due)}`);
    // Rules version 9's apology (core.js RV_SORRY, min 1): due from a point, alone in the jump, with the two %.
    // Only on a drop (RV_SORRY down): 10% → 14% gets no card (a rise under the standard card's 5 points), 10% → 5% the
    // apology.
    const sorry = await card(SV);
    if (
      sorry[0][0].length ||
      sorry[1][0].length ||
      sorry[2][0].join() !== String(SV) ||
      !sorry[2][1].includes('Your progress: 10% → 5%') ||
      !sorry[2][1].startsWith("You've been learning so fast")
    )
      fails.push(`replay: the apology card: ${JSON.stringify(sorry)}`);
    await c.close();
  }
  // A stale device: the replay adopted once, its own answer on top.
  {
    const [c, p] = await open(0, null);
    await posted(p);
    await p.waitForTimeout(500);
    const s = await p.evaluate(() => ({
      P: JSON.parse(localStorage.getItem('reefid-sync-coral-progress') || '{}'),
      rv: localStorage.getItem('reefid-sync-coral-rv'),
      log: JSON.parse(localStorage.getItem('test-sheet-log') || '[]'),
      pending: (JSON.parse(localStorage.getItem('reefid-account') || '{}').log || []).length,
      card: !!document.querySelector('.rvmsg'),
      text: [...document.querySelectorAll('.rvmsg p:not(.ulkick)')].map(e => e.textContent).join(' '),
      rvm: JSON.parse(localStorage.getItem('reefid-rv-msg') || '{}'),
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
    // The card of the jump from version 0 (rules version 9's apology, core.js RV_SORRY, alone in it: it says more) is due
    // only when the replay moved the progress % down by its min points or more, and says the two % (it may wait behind
    // the learned-mark card).
    const SV = C.RVS.find(x => x.msg === C.RV_SORRY).v,
      [pf, pt] = (s.rvm.pct || {})[SV] || [];
    if (
      (s.rvm.due || []).includes(SV) !== (pf !== undefined && pf - pt >= C.RV_SORRY.min) ||
      (s.card && !s.text.includes(`${pf}% → ${pt}%`))
    )
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
      P: JSON.parse(localStorage.getItem('reefid-sync-coral-progress')),
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
    // The next load: a card that came back would show after its first sync (sync.js noticeLater). Not a fixed wait:
    // start-up says when its cards are settled (progress.js window.CARDS_SAID), and the sheet's log, emptied first,
    // proves that came after this load's pull, never before it.
    await p.evaluate(() => localStorage.setItem('test-sheet-log', '[]'));
    await p.reload();
    await p.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
    const said = await p
      .waitForFunction(() => window.CARDS_SAID, null, {timeout: 25000})
      .then(() => p.evaluate(() => JSON.parse(localStorage.getItem('test-sheet-log') || '[]').some(x => x.get)))
      .catch(() => null);
    if (said === null) fails.push('replay: at the next load, start-up never settled its cards');
    else if (!said) fails.push('replay: at the next load, start-up said its cards were settled before the sync');
    if (await p.$('.unlock.rvmsg, .unlock.recalc')) fails.push('replay: a card came back after it was seen');
    await c.close();
  }
  await bs.close();
  return fails;
}

// The one-time notices wait for the visit's first sync (Pierre, 2026-11-08: a device still holding an old copy of his
// account showed him again the cards and toasts he had seen on another; sync.js noticeLater, noticesGo, core.js TOLD). A
// signed-in device whose copy is older than the account's (the last update note not seen here, a learned mark taken
// away not told here, a run of 12 right answers without its achievement): the sheet's copy says the note and the mark
// were told on another device and holds the achievement, so nothing shows, before or after the sync. The same device
// with nothing told elsewhere: nothing before the sheet's reply, then the note once, the mark's card, the achievement's
// toast, and the save sends what was told; the next load shows none of them. Offline (the request fails): the note
// shows from this device's state at once. Nothing reaches the sheet (rule D1): every request is answered in the page,
// a route answers any that escapes, and the script's hosts are mapped to this computer.
async function noticesAfterSync(base) {
  const fails = [],
    bs = await chromium.launch({
      args: ['--host-resolver-rules=MAP script.google.com 127.0.0.1, MAP script.googleusercontent.com 127.0.0.1']
    });
  const last = 'typed-questions-2026-11',
    t0 = Date.parse('2026-11-03T05:00:00Z'),
    prog = {Acropora: {ok: 1, ko: 0, streak: 1, h: '1', at: t0}, '~level': {ok: 1, ko: 0, th: 0.1, at: t0}},
    mine = {_v: 3, _best: 12}, // the run's feat here, its achievement (run10) not counted yet; a record of today's version (progress.js ACH_V), so no silent recount (#734) counts it first
    acct = {...mine, run10: t0},
    // The sheet's copy: what the device has, plus what another device told and earned (told: core.js TOLD tokens).
    data = told => ({
      'reefid-sync-coral-progress': JSON.stringify(prog),
      'reefid-sync-coral-quiz': '{"bon":false}',
      'reefid-sync-coral-start': '{"c":"new","t":1}',
      'reefid-sync-coral-rv': String(C.RV),
      'reefid-sync-ach': JSON.stringify(told ? acct : mine),
      ...(told ? {'reefid-sync-told': JSON.stringify(['mx:Acropora@111', 'recalc:' + last])} : {})
    });
  // mode: 'slow' (the reply after 2.5 s), 'offline' (every request fails as fetch does without a line).
  const STUB = mode => {
    const f = window.fetch,
      reply = (u, o) => {
        const q = new URL(String(u)).searchParams,
          body = o && o.body ? JSON.parse(o.body) : null,
          log = JSON.parse(localStorage.getItem('test-sheet-log') || '[]');
        if (body ? !body.name : q.get('name') !== 'Ana') return {ok: false};
        log.push(body ? {post: 1, told: body.data['reefid-sync-told'] || null} : {get: 1});
        localStorage.setItem('test-sheet-log', JSON.stringify(log));
        const rev = Number(localStorage.getItem('test-rev') || 4);
        if (body) {
          localStorage.setItem('test-data', JSON.stringify(body.data));
          localStorage.setItem('test-rev', String(rev + 1));
          return {ok: true, log: true, rev: rev + 1, v: 97};
        }
        return {ok: true, found: true, rev, data: JSON.parse(localStorage.getItem('test-data')), v: 97};
      },
      answer = (u, o) =>
        mode === 'offline'
          ? Promise.reject(new TypeError('Failed to fetch'))
          : new Promise(ok => setTimeout(ok, 2500)).then(
              () => new Response(JSON.stringify(reply(String((u && u.url) || u), o)), {headers: {'Content-Type': 'application/json'}})
            );
    window.SHEET_STUB = answer;
    window.fetch = (u, o) => (/script\.google/.test(String((u && u.url) || u)) ? answer(u, o) : f(u, o));
    // Every overlay that ever shows, with the time since the page started (cards, achievement toasts).
    window.__shown = [];
    new MutationObserver(R =>
      R.forEach(r =>
        r.addedNodes.forEach(
          n => n.classList && /\b(unlock|achpop)\b/.test(n.className) && window.__shown.push([n.className, Math.round(performance.now())])
        )
      )
    ).observe(document, {childList: true, subtree: true}); // the init script runs before <html> exists
  };
  const init = ([prog, mine, sheet]) => {
    if (localStorage.getItem('test-init')) return;
    localStorage.setItem('test-init', '1');
    localStorage.setItem('reefid-tour', '"done"');
    localStorage.setItem('reefid-nudge', '1');
    localStorage.setItem('reefid-sync-coral-start', '{"c":"new","t":1}');
    localStorage.setItem('reefid-sync-coral-quiz', '{"bon":false}');
    localStorage.setItem('reefid-sync-coral-rv', sheet['reefid-sync-coral-rv']);
    localStorage.setItem('reefid-recalc', '"millepora-counts-2026-11"'); // the note before the last: the last is due here
    localStorage.setItem('reefid-mx-lost', JSON.stringify({due: {Acropora: 111}, why: {Acropora: 'bkt'}}));
    localStorage.setItem('reefid-sync-ach', JSON.stringify(mine));
    localStorage.setItem('reefid-sync-coral-progress', JSON.stringify(prog));
    localStorage.setItem('reefid-account', JSON.stringify({name: 'Ana', pin: '1234', srv: 4, base: prog, log: []}));
    localStorage.setItem('test-data', JSON.stringify(sheet));
  };
  const open = async (mode, told) => {
    const c = await bs.newContext({viewport: {width: 390, height: 800}, serviceWorkers: 'block'});
    await c.addInitScript(STUB, mode);
    await c.addInitScript(init, [prog, mine, data(told)]);
    await c.route(
      u => !u.href.startsWith(base),
      async r => {
        const u = r.request().url();
        if (!/script\.google/.test(u)) return r.abort();
        fails.push('notices: a sync request escaped the wrapped fetch: ' + u.slice(0, 80));
        r.fulfill({contentType: 'application/json', body: '{"ok":false,"error":"input"}'});
      }
    );
    const p = await c.newPage();
    p.on('pageerror', e => fails.push('notices page error: ' + e.message));
    p.setDefaultTimeout(8000);
    await p.goto(base);
    await p.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
    return [c, p];
  };
  const shown = p =>
    p.evaluate(() => window.__shown.map(x => x[0].split(' ').find(k => /^(recalc|mxlost|rvmsg|sorry|achpop)$/.test(k)) || x[0]));
  const loaded = p =>
    p
      .waitForFunction(() => JSON.parse(localStorage.getItem('test-sheet-log') || '[]').some(x => x.get), null, {timeout: 15000})
      .catch(() => fails.push('notices: the device never loaded the account'));
  // Not a fixed wait: start-up says when its one-time cards are settled on the merged state (progress.js
  // window.CARDS_SAID, after sync.js noticesGo): every card or toast due is on screen by then.
  const settled = (p, at) =>
    p.waitForFunction(() => window.CARDS_SAID, null, {timeout: 25000}).catch(() => fails.push(`notices: ${at}, start-up never settled`));
  // Told on another device: nothing, before or after the sync.
  {
    const [c, p] = await open('slow', true);
    await loaded(p);
    await settled(p, 'told on another device');
    const s = await shown(p);
    if (s.length) fails.push(`notices: told on another device, shown again here: ${JSON.stringify(s)}`);
    const r = await p.evaluate(() => ({
      mx: JSON.parse(localStorage.getItem('reefid-mx-lost') || '{}'),
      ach: JSON.parse(localStorage.getItem('reefid-sync-ach') || '{}')
    }));
    if (Object.keys(r.mx.due || {}).length || (r.mx.told || {}).Acropora !== 111 || !r.ach.run10)
      fails.push(`notices: the merged state not taken: ${JSON.stringify(r)}`);
    await c.close();
  }
  // Nothing told elsewhere: nothing before the reply, then each once, and the save tells the account.
  {
    const [c, p] = await open('slow', false);
    const early = await shown(p);
    if (early.length) fails.push(`notices: shown before the sync: ${JSON.stringify(early)}`);
    // The signal is no earlier than the decisions it stands for (the checks above and below rely on it).
    if (await p.evaluate(() => window.CARDS_SAID)) fails.push('notices: start-up said its cards were settled before the sync');
    await p.waitForSelector('.unlock.recalc', {timeout: 15000}).catch(() => fails.push('notices: the new update note never showed'));
    await p.click('.unlock.recalc .next').catch(() => {});
    // The learned mark's card due from before: dropped unseen (model.js MXL.QUIET; Pierre, 2026-11-09 ~15:40 Manila, Q332).
    await p.waitForSelector('.achpop', {timeout: 8000}).catch(() => fails.push("notices: the run's achievement never popped up"));
    await p
      .waitForFunction(
        last => JSON.parse(localStorage.getItem('test-sheet-log') || '[]').some(x => x.post && x.told && x.told.includes('recalc:' + last)),
        last,
        {timeout: 15000}
      )
      .catch(() => {});
    const sent = await p.evaluate(() =>
      JSON.parse(localStorage.getItem('test-sheet-log'))
        .filter(x => x.post && x.told)
        .pop()
    );
    if (!sent || !sent.told.includes('recalc:' + last)) fails.push(`notices: the save did not tell the account: ${JSON.stringify(sent)}`);
    const s = await shown(p);
    if (s.filter(x => x === 'recalc').length !== 1 || s.includes('mxlost'))
      fails.push(`notices: not shown once each: ${JSON.stringify(s)}`);
    // The next load: the sheet's copy (as this device saved it) has them all told.
    await p.evaluate(() => {
      localStorage.setItem('reefid-recalc', '"millepora-counts-2026-11"');
      localStorage.setItem('reefid-sync-told', '[]');
      localStorage.setItem('test-sheet-log', '[]');
    });
    await p.reload();
    await p.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
    await loaded(p);
    await settled(p, 'the next load');
    const again = await shown(p);
    if (again.length) fails.push(`notices: shown again at the next load: ${JSON.stringify(again)}`);
    await c.close();
  }
  // Offline: the note from this device's state, at once.
  {
    const [c, p] = await open('offline', false);
    await p.waitForSelector('.unlock.recalc', {timeout: 5000}).catch(() => fails.push('notices: offline, the update note never showed'));
    await c.close();
  }
  await bs.close();
  return fails;
}

// The first-launch question (Pierre, 2026-11-03; core.js CHOICE, tour.js ask, quiz.js startAskShow / startFbShow) and
// Coral basics in Learn: forced in the tour (no Skip, no Next, no arrow key until answered), stored with how it was
// given; a skipped tour asks it on a card before the quiz (Escape goes Home, the quiz asks again); "new" offers Coral
// basics first; an existing player with CHOICE.ASK answers or more is never asked (inferred); the fallback card shows
// once over a new question when the first answers do not fit, never twice; Coral basics is the first Learn tab and the
// "0" block of Genera, out of the Lab list with a link kept there; the Home line until it is done; a glossary term
// links to its step; done = every step seen, with its achievement. Returns the failures.
// Fish opens to all since 2026-11-06 (Q158): a check about the corals-only onboarding (one subject: the start question
// first, no subject pick) serves core.js with fish back to open: 'group' (the two-subject tour: subjTour).
const oneSubject = c =>
  c.route(
    u => new URL(u).pathname === '/core.js',
    async r => {
      const res = await r.fetch();
      await r.fulfill({response: res, body: (await res.text()).replace("open: 'all'", "open: 'group'")});
    }
  );
async function startSmoke(b, base) {
  const fails = [],
    errs = [];
  const open = async (init, vp = {width: 390, height: 844}) => {
    const c = await b.newContext({viewport: vp, serviceWorkers: 'block', intro: true});
    await oneSubject(c);
    await c.route(
      u => !u.href.startsWith(base),
      r => r.abort()
    );
    await c.addInitScript(init || (() => {}));
    const p = await c.newPage();
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(base);
    await p.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
    return [c, p];
  };
  const rec = p => p.evaluate(() => JSON.parse(localStorage.getItem('reefid-sync-coral-start') || 'null'));
  // 1. The tour: the question first, forced; "new" ends the tour on Coral basics.
  {
    const [c, p] = await open(() => localStorage.setItem('reefid-nudge', '1'));
    await p.waitForSelector('#tour [data-start]', {timeout: 10000}).catch(() => {});
    const q = await p.evaluate(() => ({
      opts: document.querySelectorAll('#tour [data-start]').length,
      skip: !!document.querySelector('#tour .tskip'),
      next: !!document.querySelector('#tour .tnext')
    }));
    await p.keyboard.press('ArrowRight');
    await p.waitForTimeout(300);
    const still = await p.evaluate(() => !!document.querySelector('#tour [data-start]'));
    if (q.opts !== 3 || q.skip || q.next || !still) fails.push(`tour question not forced: ${JSON.stringify({...q, still})}`);
    await p.click('#tour [data-start="new"]');
    await p.waitForTimeout(500);
    const r = await rec(p);
    if (!r || r.c !== 'new' || r.via !== 'tour' || r.at !== 0) fails.push(`tour answer not stored: ${JSON.stringify(r)}`);
    for (let k = 0; k < 8 && (await p.$('#tour .tnext')) && !/basics/.test(await p.textContent('#tour .tnext')); k++) {
      await p.click('#tour .tnext');
      await p.waitForTimeout(300);
    }
    const last = await p.textContent('#tour .tnext').catch(() => '');
    if (!/Coral basics/.test(last || '')) fails.push(`tour, new to corals: last button "${last}"`);
    await p.click('#tour .tnext');
    await p
      .waitForFunction(() => location.hash.startsWith('#learn/basics') && document.querySelector('.bx'), null, {timeout: 15000})
      .catch(() => {});
    const at = await p.evaluate(() => ({
      h: location.hash,
      tour: !!document.getElementById('tour'),
      tab: document.querySelector('#modes [aria-current]')?.textContent
    }));
    if (!at.h.startsWith('#learn/basics') || at.tour || !/basics/i.test(at.tab || ''))
      fails.push(`tour, new to corals: not on Coral basics in Learn: ${JSON.stringify(at)}`);
    await c.close();
  }
  // 2. Tour skipped: a card before the quiz, forced; Escape goes Home and the quiz asks again; "new" offers Coral basics,
  // "Start the quiz" goes on to the first cards.
  {
    const [c, p] = await open(() => (localStorage.setItem('reefid-tour', '"done"'), localStorage.setItem('reefid-nudge', '1')));
    await p.evaluate(() => (location.hash = 'practice/quiz'));
    await p.waitForSelector('.unlock.startq', {timeout: 8000}).catch(() => {});
    const card = await p.evaluate(() => ({
      opts: document.querySelectorAll('.unlock.startq [data-start]').length,
      btns: document.querySelectorAll('.unlock.startq .next').length,
      q: !!document.querySelector('#view .q'),
      intro: !!document.querySelector('.unlock.intro')
    }));
    if (card.opts !== 3 || card.btns || card.q || card.intro) fails.push(`question card before the quiz: ${JSON.stringify(card)}`);
    await p.keyboard.press('Escape');
    await p.waitForTimeout(400);
    const esc = await p.evaluate(() => ({h: location.hash, card: !!document.querySelector('.unlock')}));
    if (esc.h !== '' || esc.card) fails.push(`question card, Escape: ${JSON.stringify(esc)}`);
    await p.evaluate(() => (location.hash = 'practice/quiz'));
    await p.waitForSelector('.unlock.startq [data-start="new"]', {timeout: 8000}).catch(() => fails.push('question card not asked again'));
    await p.click('.unlock.startq [data-start="new"]');
    await p.waitForSelector('.unlock.basicsq', {timeout: 5000}).catch(() => fails.push('new to corals: no Coral basics offer'));
    await p.click('.unlock.basicsq .next.sec');
    await p.waitForSelector('.unlock.intro', {timeout: 8000}).catch(() => fails.push('after the question card: no first cards'));
    const r = await rec(p);
    if (!r || r.c !== 'new' || r.via !== 'card') fails.push(`question card answer: ${JSON.stringify(r)}`);
    await c.close();
  }
  // 3. Existing players: 50 answers or more, inferred and never asked; fewer, asked.
  for (const [n, th, ask] of [
    [60, 1.2, false],
    [30, 0.1, true]
  ]) {
    const [c, p] = await open(() => (localStorage.setItem('reefid-tour', '"done"'), localStorage.setItem('reefid-nudge', '1')));
    await p.evaluate(
      ([n, th]) => {
        P['~level'] = {ok: n - 10, ko: 10, th, at: Date.now()};
        location.hash = 'practice/quiz';
      },
      [n, th]
    );
    await p.waitForTimeout(1500);
    const r = await rec(p),
      asked = !!(await p.$('.unlock.startq'));
    if (asked !== ask || (!ask && (!r || r.via !== 'inferred' || r.c !== 'know')))
      fails.push(`existing player with ${n} answers: asked ${asked}, record ${JSON.stringify(r)}`);
    await c.close();
  }
  // 4. The fallback card: once over a new question when, at the first checkpoint (CHOICE.AT, 40 answers), the global
  // level is clearly below the answer's band (core.js startCheck); Keep my answer; never again.
  {
    const [c, p] = await open(() => {
      localStorage.setItem('reefid-tour', '"done"');
      localStorage.setItem('reefid-nudge', '1');
      localStorage.setItem('reefid-sync-coral-start', JSON.stringify({c: 'know', t: 1, at: 0, via: 'tour', n: 0, s: 0, fb: {}, h: []}));
    });
    await p.evaluate(() => (location.hash = 'practice/quiz'));
    await p.waitForSelector('.unlock.intro', {timeout: 8000}).catch(() => {});
    while (await p.$('.unlock.intro')) await p.click('.unlock.intro .ulbtns .next:not(.sec)');
    const due = await p.evaluate(() => {
      // 40 answers, the first on each genus, one in four right on average photos: clearly below "know well".
      P[LEVEL] = {ok: 10, ko: 30, th: -0.5}; // the global level the window is checked against
      for (let i = 0; i < CHOICE.AT[0]; i++) startStep(0, 4, i % 4 === 0, true);
      return startDue();
    });
    // The next questions until the card shows (a question that opens a genus shows its card first; the prompt waits).
    for (let k = 0; k < 6 && !(await p.$('.unlock.startfb')); k++) {
      await p.evaluate(() => {
        document.querySelectorAll('.unlock.intro').forEach(d => (d.ulClose ? d.ulClose() : d.remove()));
        quizPhoto();
      });
      await p.waitForTimeout(300);
    }
    // A gentle offer, never a verdict (Pierre, 2026-11-04): Coral basics and "No thanks, I know the basics" as two equal
    // buttons, no word that labels the player or says the level changed.
    const fb = await p.evaluate(() => {
      const d = document.querySelector('.unlock.startfb'),
        bs = d && [...d.querySelectorAll('.ulbtns .next')];
      return (
        d && {
          dir: d.dataset.dir,
          title: d.querySelector('h3').textContent,
          basics: !!d.querySelector('.ulbtns [data-basics]'),
          keep: (d.querySelector('[data-keep]') || {}).textContent,
          equal: bs.length === 2 && getComputedStyle(bs[0]).backgroundColor === getComputedStyle(bs[1]).backgroundColor,
          judged: /beginner|below what|you are new|level|gently/i.test(d.textContent),
          // No count on the card (Pierre, 2026-11-04); "5 minutes" is the length of Coral basics.
          digits: /\d/.test(d.textContent.replace(/5 minutes/g, ''))
        }
      );
    });
    if (
      due !== 'lo' ||
      !fb ||
      fb.dir !== 'lo' ||
      fb.title !== 'The first genera feel hard?' ||
      !fb.basics ||
      fb.keep !== 'No thanks, I know the basics' ||
      !fb.equal ||
      fb.judged ||
      fb.digits
    )
      fails.push(`fallback card: ${JSON.stringify({due, fb})}`);
    if (fb) await p.click('.unlock.startfb [data-keep]');
    const again = await p.evaluate(() => (quizPhoto(), [startDue(), !!document.querySelector('.unlock.startfb'), startOf().c]));
    if (again[0] || again[1]) fails.push(`fallback card shown twice: ${JSON.stringify(again)}`);
    if (again[2] !== 'know') fails.push(`"No thanks" changed the answer: ${again[2]}`);
    // The "higher" card: no number either (it goes stale, or miscounts what is open).
    const nums = await p.evaluate(() =>
      [() => startFbShow('hi')].map(f => {
        document.querySelectorAll('.unlock').forEach(x => x.ulClose());
        f();
        const d = document.querySelector('.unlock');
        return d ? d.textContent.match(/\d+/g) : 'no card';
      })
    );
    if (nums.some(Boolean)) fails.push(`numbers on the "higher" card: ${JSON.stringify(nums)}`);
    await p.evaluate(() => document.querySelectorAll('.unlock').forEach(x => x.ulClose()));
    await c.close();
  }
  // 5. Coral basics in Learn: the first Learn tab, the "0" block of Genera, out of the Lab list with a link kept there;
  // the Home line until it is done; a glossary term links to its step; every step seen = done, with its achievement.
  {
    const [c, p] = await open(
      () => (localStorage.setItem('reefid-tour', '"done"'), localStorage.setItem('reefid-sync-coral-start', '{"c":"new","t":1}')),
      {width: 1280, height: 860}
    );
    const home = await p.evaluate(() => !!document.querySelector('.hdoor.learn .hdnew a[href="#learn/basics"]'));
    await p.evaluate(() => (location.hash = 'learn/genera'));
    await p.waitForSelector('#azgrid .card', {timeout: 8000});
    const g = await p.evaluate(() => ({
      tabs: [...document.querySelectorAll('#modes a')].map(a => a.getAttribute('href')),
      first: document.querySelector('#azgrid > :first-child')?.textContent.replace(/\s+/g, ' ').trim().slice(0, 40),
      link: !!document.querySelector('#azgrid a.bxcard')
    }));
    if (!home) fails.push('Home: no "New to corals?" line for a new player');
    if (g.tabs[0] !== '#learn/basics' || !/^0\s*Coral basics/.test(g.first || '') || !g.link)
      fails.push(`Learn path: ${JSON.stringify(g)}`);
    // The Genera card always opens step 1, in both views (Pierre, 2026-11-04: it resumed at the last step seen); the
    // Basics tab still resumes there.
    for (const v of ['photos', 'tips']) {
      if (v === 'tips') {
        await p.evaluate(() => (location.hash = 'learn/genera'));
        await drawn(p);
      }
      // No step seen yet: Colony is the next stop, worded "Start: Colony" (Pierre, 2026-11-04), the others not reached.
      await p.evaluate(v => {
        localStorage.removeItem('reefid-basics');
        document.querySelector(`[data-gv="${v}"]`).click();
      }, v);
      await p.waitForSelector(v === 'tips' ? '#azgrid .bxtip' : '#azgrid .bxcard', {timeout: 8000});
      const start = await p.evaluate(() => {
        const lab = document.querySelector('#azgrid .bxart .bxt-lab.is-next');
        return {
          stops: [...document.querySelectorAll('#azgrid .bxart .bxt-stop')].map(g => `${g.dataset.step}:${g.classList[1]}`).join(' '),
          lab: lab?.textContent,
          first: lab === document.querySelector('#azgrid .bxart .bxt-lab')
        };
      });
      const want0 = 'colony:is-next polyp:is-todo corallite:is-todo septa:is-todo teeth:is-todo walls:is-todo forms:is-todo';
      if (start.stops !== want0 || start.lab !== 'Start: Colony' || !start.first)
        fails.push(`Genera (${v}): the Coral basics trail before any step ${JSON.stringify(start)}`);
      await p.evaluate(v => {
        localStorage.setItem('reefid-basics', JSON.stringify({seen: {colony: 1, polyp: 1, corallite: 1, septa: 1}, last: 'septa'}));
        document.querySelector(`[data-gv="${v}"]`).click();
      }, v);
      await p.waitForSelector(v === 'tips' ? '#azgrid .bxtip' : '#azgrid .bxcard', {timeout: 8000});
      // Its picture, the trail of the seven steps (learn.js basicsArt), from the stored progress: the four seen with a ✓,
      // Teeth next with its word, the last two not reached.
      const trail = await p.evaluate(() =>
        [...document.querySelectorAll('#azgrid .bxart .bxt-stop')].map(
          g => `${g.dataset.step}:${g.classList[1]}${g.querySelector('.bxt-tick') ? '✓' : ''}`
        )
      );
      const nextLab = await p.evaluate(() => document.querySelector('#azgrid .bxart .bxt-lab.is-next')?.textContent);
      const want = 'colony:is-seen✓ polyp:is-seen✓ corallite:is-seen✓ septa:is-seen✓ teeth:is-next walls:is-todo forms:is-todo';
      if (trail.join(' ') !== want || nextLab !== 'Next: Teeth')
        fails.push(`Genera (${v}): the Coral basics trail ${JSON.stringify({trail: trail.join(' '), nextLab})}`);
      await p.evaluate(() => (document.querySelector('#azgrid a.bxcard') || document.querySelector('#azgrid .bxtip a')).click());
      await drawn(p);
      const at = await p.evaluate(() => ({h: location.hash, step: document.querySelector('.bx-t small')?.textContent}));
      if (at.h !== '#learn/basics/colony' || at.step !== 'Step 1 of 7')
        fails.push(`Genera (${v}): the Coral basics card does not open step 1 ${JSON.stringify(at)}`);
    }
    await p.evaluate(() => (location.hash = 'learn/genera'));
    await drawn(p);
    await p.evaluate(() => {
      document.querySelector('[data-gv="photos"]').click();
      localStorage.setItem('reefid-basics', JSON.stringify({seen: {colony: 1, polyp: 1, corallite: 1, septa: 1}, last: 'septa'}));
      document.querySelector('#modes a[href="#learn/basics"]').click();
    });
    await drawn(p);
    const tab = await p.evaluate(() => document.querySelector('.bx-t small')?.textContent);
    if (tab !== 'Step 4 of 7') fails.push(`Learn › Basics tab does not resume at the last step seen: ${tab}`);
    await p.evaluate(() => localStorage.removeItem('reefid-basics'));
    await p.evaluate(() => window.loadTier && window.loadTier(5));
    await p.evaluate(() => (location.hash = 'tools'));
    await p.waitForSelector('.labhub', {timeout: 15000}).catch(() => {});
    const lab = await p.evaluate(() => ({
      tile: !!document.querySelector('.labhub a[href="#tools/basics"]'),
      kept: !!document.querySelector('.labgrad a[href="#learn/basics"]')
    }));
    if (lab.tile || !lab.kept) fails.push(`Tools page: Coral basics ${JSON.stringify(lab)}`);
    // A Tools address of a tool that graduated (it lives in its section now) opens the Tools page (no old address kept,
    // rule W3).
    await p.evaluate(() => (location.hash = 'tools/basics/septa'));
    await p
      .waitForFunction(() => location.hash === '#tools' && document.querySelector('.labhub'), null, {timeout: 8000})
      .catch(() => fails.push('#tools/basics/septa does not open the Tools page'));
    // A glossary term (an underlined word of the ID tips, a genus sheet) links to its Coral basics step.
    await p.evaluate(() => (location.hash = 'learn/genus/Astrea'));
    await p.waitForSelector('.gt[data-gt="Septa"], .gt', {timeout: 8000});
    const term = await p.evaluate(() => {
      const t = document.querySelector('.gt[data-gt="Septa"]') || document.querySelector('.gt');
      t.click();
      const a = document.querySelector('.gpop:not([hidden]) a.gbx');
      return {term: t.dataset.gt, href: a && a.getAttribute('href')};
    });
    if (!term.href || !/^#(learn\/basics|tools\/anatomy)/.test(term.href))
      fails.push(`glossary term without its Coral basics link: ${JSON.stringify(term)}`);
    // Done: every step seen (the walls step, its four types).
    const done = await p.evaluate(async () => {
      const ids = ['colony', 'polyp', 'corallite', 'septa', 'teeth', 'walls', 'forms'];
      for (const id of ids) {
        location.hash = 'learn/basics/' + id;
        await new Promise(r => setTimeout(r, 150));
        if (id === 'walls') for (const b of [...document.querySelectorAll('.bx-wtabs [data-w]')]) b.click();
      }
      const st = JSON.parse(localStorage.getItem('reefid-basics') || '{}'),
        a = JSON.parse(localStorage.getItem('reefid-sync-ach') || '{}');
      return {fin: !!st.fin, ach: !!a.basics, feat: !!a._basics, done: basicsDone()};
    });
    if (!done.fin || !done.ach || !done.feat || !done.done) fails.push(`Coral basics done: ${JSON.stringify(done)}`);
    await p.evaluate(() => (location.hash = ''));
    await p.waitForSelector('.hdoor.learn', {timeout: 8000});
    if (await p.$('.hdoor.learn .hdnew')) fails.push('Home: the Coral basics line stays once it is done');
    await p.evaluate(() => (location.hash = 'learn/genera'));
    await p.waitForSelector('#azgrid .bxcard', {timeout: 8000});
    if (!(await p.evaluate(() => /Done/.test(document.querySelector('#azgrid .bxcard small').textContent))))
      fails.push('Genera: Coral basics not shown as done');
    const allSeen = await p.evaluate(
      () => [...document.querySelectorAll('#azgrid .bxart .bxt-stop')].filter(g => g.matches('.is-seen')).length
    );
    if (allSeen !== 7) fails.push(`Genera: Coral basics done but ${allSeen} of 7 trail stops seen`);
    await c.close();
  }
  // What the start answer changes on screen (Pierre, 2026-11-04): "new" gets no "Open all" box on the first cards (My
  // progress keeps it); "imr" and "know" get no Home line to Coral basics; the "lower" card of a player who opened all
  // the genera speaks of all of them, with no number.
  for (const c0 of ['new', 'imr', 'know']) {
    const [c, p] = await open(() => {
      localStorage.setItem('reefid-tour', '"done"');
      localStorage.setItem('reefid-nudge', '1');
    });
    await c.addInitScript(c0 => localStorage.setItem('reefid-sync-coral-start', JSON.stringify({c: c0, via: 'tour', at: 0, t: 1})), c0);
    await p.reload();
    await p.waitForFunction(() => window.APP_READY && document.querySelector('#view .hdoors'), null, {timeout: 30000});
    const home = await p.evaluate(() => !!document.querySelector('#view .hdnew, #view .hdnewk'));
    if (home !== (c0 === 'new')) fails.push(`start "${c0}": Home's Coral basics line ${home ? 'shown' : 'missing'}`);
    await p.evaluate(() => (location.hash = 'practice/quiz'));
    await p.waitForSelector('.unlock.intro', {timeout: 15000}).catch(() => {});
    const box = await p.evaluate(() => !!document.querySelector('.unlock.intro .ulall'));
    if (box !== (c0 !== 'new')) fails.push(`start "${c0}": the first cards' Open all box ${box ? 'shown' : 'missing'}`);
    if (c0 === 'new') {
      const lo = await p.evaluate(() => {
        document.querySelectorAll('.unlock').forEach(x => (x.ulClose ? x.ulClose() : x.remove()));
        introAll('card');
        startFbShow('lo');
        const d = document.querySelector('.startfb');
        return {title: d.querySelector('h3').textContent, text: d.textContent, many: SUBJ.many};
      });
      if (lo.title !== `All the ${lo.many} at once is a lot` || /\d/.test(lo.title) || /\d+ genera/.test(lo.text))
        fails.push(`start "new", all opened: the lower card ${JSON.stringify(lo)}`);
    }
    await c.close();
  }
  if (errs.length) fails.push(`first-launch question: ${[...new Set(errs)].slice(0, 3).join(' | ')}`);
  return fails;
}

// Coral basics on a phone and a tablet (Codex on PR #405): the teaching photo leaves room on screen (at most 45% of its
// height), each check (photo, answers, feedback) fits between the header and the tab bar once answered (rule U2), and
// every photo of a check gets the games' clickable source once answered (rule P5, photoSrc). Returns the failures.
// Credits and Home's fit (Pierre, 2026-11-03): no page footer; Home is one screen with a one-line credit (Pierre, IMR, a
// link to About and credits); About exists, is linked from Home and from the ? help of every page with Privacy and Send
// feedback, and the Coral Finder book is never credited (only cited under References); the header fits the narrowest
// phones, signed out, without a sideways scroll.
// "Did you know?" tips (tips.js, quiz.js tipAfter / tipShow; the owner, 2026-11-04), the zoom tip on a phone and a
// desktop. The device's counters (reefid-tips) are set as a player's would be: q questions answered here, z photos
// enlarged, a visit of 12 answers going on. Checks: a targeted player (25 questions, nothing enlarged) gets it at the Next
// right after a miss on a photo they did not enlarge, never with the answer itself; one card on screen; its buttons take
// no tap in their first moments; "Show me" opens the enlarged view of the photo just answered with the answer shown, and
// is not counted as their enlargement; the events logged (shown, show; item tip:zoom); then never again in the visit;
// an achievement toast up at the tap holds it, unmarked, for a later break; a one-tap question due at the same answer
// takes the break, not the tip; "Got it" goes on to the next question; never
// before 20 questions; never with 3 photos enlarged. Nothing wider than the screen. Returns the failures.
async function tipsCheck(b, base) {
  const fails = [];
  const open = async (w, h, u, at = '#practice/quiz', intro = false) => {
    const c = await b.newContext({viewport: {width: w, height: h}, serviceWorkers: 'block', intro});
    await c.route(
      x => !x.href.startsWith(base),
      r => r.abort()
    );
    await c.addInitScript(u => {
      localStorage.setItem('reefid-tour', '"done"');
      localStorage.setItem('reefid-sync-coral-start', '{"c":"new","t":1}');
      localStorage.setItem('reefid-nudge', '1');
      if (!localStorage.getItem('reefid-tips'))
        localStorage.setItem('reefid-tips', JSON.stringify({u, s: {}, v: {t: Date.now(), n: 12, tip: 0}}));
    }, u);
    const p = await c.newPage();
    const errs = [];
    p.on('pageerror', e => errs.push(String(e)));
    await p.goto(base + at);
    await p.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
    return [c, p, errs];
  };
  // One question answered (wrong unless right), toasts and genus cards closed as a player would; then Next, unless
  // toast. Returns whether the tip was there after the answer and after Next.
  const play = async (p, {right = false, toast = false} = {}) => {
    await qa.ready(p, {timeout: 10000});
    const at = await p.evaluate(right => {
      document.querySelectorAll('.unlock.intro').forEach(x => (x.ulClose ? x.ulClose() : x.remove()));
      smokeAnswer(right);
      return !!document.querySelector('.tipcard');
    }, right);
    // dis: the card's buttons, at once, take no tap (a tap on a disabled button does nothing).
    // armed: the answer armed Next for a tip (quiz.js tipAfter, breakArm), which then decides at the tap.
    const [dis, armed] = await p.evaluate(toast => {
      document.querySelectorAll('.achpop').forEach(x => x.remove());
      achQ.length = 0;
      achBusy = false;
      if (toast) achPop({tier: 1, icon: '🧪', title: 'Smoke tip', desc: 'test'});
      const nb = document.getElementById('next'),
        armed = nb.onclick !== route;
      nb.click();
      const B = [...document.querySelectorAll('.tipcard [data-b]')];
      return [B.length > 0 && B.every(x => x.disabled), armed];
    }, toast);
    // Next took the break or not (quiz.js breakArm, at the tap): the tip's card is up, or the next question is.
    await p
      .waitForFunction(() => document.querySelector('.tipcard') || document.querySelector('#view .q:not(.done)'), null, {timeout: 10000})
      .catch(() => {});
    return {at, dis, armed, next: !!(await p.$('.tipcard'))};
  };
  const tips = p => p.evaluate(() => JSON.parse(localStorage.getItem('reefid-tips')));
  for (const [w, h] of [
    [390, 844],
    [1280, 800]
  ]) {
    const W = `${w}px tip:`;
    {
      const [c, p, errs] = await open(w, h, {q: 25, z: 0});
      // A toast up at the tap: no tip, nothing marked (it waits for a later break); the next question comes.
      const held = await play(p, {toast: true});
      const st0 = await tips(p);
      await p.evaluate(() => document.querySelectorAll('.achpop').forEach(x => x.remove()));
      if (held.at || held.next || (st0.s.zoom || []).length)
        fails.push(`${W} shown over an achievement toast: ${JSON.stringify({held, st0})}`);
      // Misses until it shows (a break whose next question brings a genus card passes, as a player's would).
      let got = null,
        dis = false;
      for (let i = 0; i < 15 && !got; i++) {
        const r = await play(p);
        if (r.at) fails.push(`${W} shown with the answer, before Next`);
        if (r.next) ((got = i + 1), (dis = r.dis));
      }
      if (!got) fails.push(`${W} never shown to a targeted player in 15 misses`);
      else {
        const r = await p.evaluate(() => {
          const d = document.querySelector('.tipcard'),
            card = d.querySelector('.ulcard').getBoundingClientRect();
          return {
            n: document.querySelectorAll('.unlock').length,
            kind: d.querySelector('.ulcard').dataset.k,
            kick: d.querySelector('.ulkick').textContent,
            title: d.querySelector('h3').textContent,
            vis: !!d.querySelector('.tipvis img') && !!d.querySelector('.tipvis .zic'),
            btns: [...d.querySelectorAll('[data-b]')].map(x => x.textContent),
            done: !!document.querySelector('#view .q.done'),
            wide: document.documentElement.scrollWidth > innerWidth || card.left < 0 || card.right > innerWidth
          };
        });
        if (
          r.n !== 1 ||
          r.kind !== 'tip' ||
          r.kick !== 'Did you know?' ||
          !/^(Tap|Click) a photo to see it bigger$/.test(r.title) ||
          !r.vis ||
          r.btns.join() !== 'Show me,Got it' ||
          !dis ||
          !r.done ||
          r.wide
        )
          fails.push(`${W} the card: ${JSON.stringify({...r, dis})}`);
        // p.click waits for the button to take taps (TIP.WAIT).
        const z0 = (await tips(p)).u.z;
        await p.click('.tipcard [data-b="1"]');
        await p.waitForSelector('#lightbox:not([hidden])', {timeout: 3000}).catch(() => {});
        const lbx = await p.evaluate(() => ({
          open: !document.getElementById('lightbox').hidden,
          card: !!document.querySelector('.unlock'),
          genus: !!document.querySelector('#lightbox .lb-cap i'),
          done: !!document.querySelector('#view .q.done')
        }));
        const st = await tips(p);
        if (!lbx.open || lbx.card || !lbx.genus || !lbx.done || st.u.z !== z0)
          fails.push(`${W} Show me: ${JSON.stringify({...lbx, z0, z: st.u.z})}`);
        const ev = await p.evaluate(() =>
          JSON.parse(localStorage.getItem('reefid-evq') || '[]')
            .filter(x => /^tip:/.test(x.src || ''))
            .map(x => `${x.k}:${x.src}:${x.r}`)
        );
        if (ev.join() !== 'pulse:tip:zoom:shown,pulse:tip:zoom:show') fails.push(`${W} events: ${JSON.stringify(ev)}`);
        if ((st.s.zoom || []).length !== 1 || !st.v.tip) fails.push(`${W} not marked shown: ${JSON.stringify(st)}`);
        await p.keyboard.press('Escape');
        await p.waitForTimeout(200);
        // Back on the feedback: Next goes on; then never again in this visit.
        await p.evaluate(() => document.getElementById('next').click());
        let again = 0;
        for (let i = 0; i < 12; i++) if ((await play(p)).next) again++;
        if (again) fails.push(`${W} shown again in the same visit (${again} times)`);
      }
      if (errs.length) fails.push(`${W} page errors: ${errs.slice(0, 3).join(' | ')}`);
      await c.close();
    }
    // The rules below (when a tip takes a break, which players never get it, the duel's cards) do not depend on the width:
    // they run once, on the phone (test-suite review D3, 2026-11-04). The card itself, its fit, Show me and "once a visit"
    // are checked above at both widths; the rules' logic also has tests/tips.test.js.
    if (w !== 390) continue;
    // "Got it" goes on to the next question.
    {
      const [c, p] = await open(w, h, {q: 60, z: 1});
      let r = {};
      for (let i = 0; i < 10 && !r.next; i++) r = await play(p, {right: true});
      if (!r.next) fails.push(`${W} not shown at a break from 40 questions`);
      else {
        await p.click('.tipcard [data-b="2"]'); // waits for the button to take taps (TIP.WAIT)
        const nx = await qa.ready(p, {timeout: 5000, optional: true});
        if (!nx || (await p.$('.unlock.tipcard'))) fails.push(`${W} Got it did not go on to the next question`);
      }
      await c.close();
    }
    // The one-tap question due at the same answer takes the break: no tip there (it waits for a later break). A targeted
    // player whose visit reaches its 10th answer on this page's 8th, when the one-tap question is first due (PULSE.FIRST
    // answers in all; its session, begun 6 minutes ago with 7 answers, reaches PULSE.SESS_N there); the question shows (in
    // the feedback, or as a card at Next), the tip not.
    {
      const [c, p] = await open(w, h, {q: 25, z: 0});
      await p.evaluate(() => {
        const t = Date.now();
        localStorage.setItem('reefid-tips', JSON.stringify({u: {q: 25, z: 0}, s: {}, v: {t, n: 2, tip: 0}}));
        // The one-tap question's session: 7 answers over 6 minutes, PULSE.SESS_N (15) at this page's 8th answer.
        localStorage.setItem('reefid-pulse', JSON.stringify({v: {t0: t - 6 * 60000, t, n: 7}}));
        localStorage.setItem('reefid-sync-coral-progress', JSON.stringify({'~level': {ok: 40, ko: 10, th: 0, at: t}}));
      });
      await p.reload();
      await p.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
      // No achievement toast here (one earned at the 8th answer would rightly hold every prompt: checked above).
      await p.evaluate(() => (achPop = () => {}));
      let early = 0;
      for (let i = 0; i < 7; i++) if ((await play(p)).next) early++;
      await qa.ready(p, {timeout: 10000});
      const r = await p.evaluate(() => {
        document.querySelectorAll('.unlock.intro').forEach(x => (x.ulClose ? x.ulClose() : x.remove()));
        document.querySelectorAll('.achpop').forEach(x => x.remove());
        achQ.length = 0;
        achBusy = false;
        const pre = {ok: promptOk(), due: pulseDue(), a: answersSoFar(), at: localStorage.getItem('reefid-prompt-at')};
        smokeAnswer(false);
        const inline = !!document.querySelector('#after .pulse'),
          armed = document.getElementById('next').onclick !== route;
        document.querySelectorAll('.achpop').forEach(x => x.remove());
        achQ.length = 0;
        achBusy = false;
        document.getElementById('next').click();
        return {pre, armed, inline, card: !!document.querySelector('.pulsecard'), tip: !!document.querySelector('.tipcard'), n: session.n};
      });
      if (early || !(r.inline || r.card) || r.tip) fails.push(`${W} with the one-tap question due: ${JSON.stringify({early, ...r})}`);
      await c.close();
    }
    // The Duel tab (one progression path since 2026-11-04, Pierre: its duels draw only genera unlocked and bring no
    // card; until then a duel of genera not met brought their cards and the tip had to wait for a later break, Codex
    // review of PR #440, checked here until this change): at an armed break the tip comes, and no card after it.
    {
      const [c, p, errs] = await open(w, h, {q: 60, z: 0}, '#practice/duels'); // q 60: any break will do; every genus met
      // The hold already on: these misses never take it across INTRO.HOLD, so the Duel tab's relief card (checked in
      // duelReliefCheck) does not take the break before the tip.
      await p.evaluate(() => (HOLDS = 9));
      let shown = 0;
      for (let i = 0; i < 6 && !shown; i++) {
        const r = await play(p);
        if (!r.next) {
          // Not armed at the answer (a toast was up then, as after a first duel won): the tip waits; nothing to check here.
          if (r.armed) fails.push(`${W} duel: no tip at a break armed for it (duel ${i + 1})`);
          continue;
        }
        shown++;
        await p.waitForFunction(() => [...document.querySelectorAll('.tipcard [data-b]')].every(x => !x.disabled), null, {timeout: 5000});
        await p.evaluate(() => [...document.querySelectorAll('.tipcard [data-b]')].find(x => x.textContent === 'Got it').click());
        if (!(await qa.ready(p, {timeout: 10000, optional: true}))) fails.push(`${W} duel: no next duel after the tip`);
        const after = await p.evaluate(() => ({
          intro: !!document.querySelector('.unlock.intro'),
          tip: !!document.querySelector('.tipcard')
        }));
        if (after.intro || after.tip) fails.push(`${W} duel: a card right after the tip: ${JSON.stringify(after)}`);
      }
      if (!shown) fails.push(`${W} duel: no tip in 6 duels`);
      if (errs.length) fails.push(`${W} duel: page errors ${errs.join(' | ')}`);
      await c.close();
    }
    // Not for these players: 5 questions (still under 20 after 12 misses), 3 photos enlarged.
    for (const u of [
      {q: 5, z: 0},
      {q: 80, z: 3}
    ]) {
      const [c, p] = await open(w, h, u);
      let n = 0;
      for (let i = 0; i < 12; i++) if ((await play(p)).next) n++;
      if (n) fails.push(`${W} shown to ${JSON.stringify(u)}`);
      await c.close();
    }
  }
  return fails;
}
// The custom quiz's reminder of the units waiting in the Quiz (quiz.js LEFTN, leftNote, leftArm, leftShow; Pierre,
// 2026-11-12), on a phone and a desktop, in the tips part. A player with 6 genera met and picked, the device's count set
// 2 answers under LEFTN.AT. Checks: the answer that brings the count to LEFTN.AT - 1 gets no card; the next one gets it
// at Next, never with the answer itself; one card on screen, its kind, words (the units that may still open, counted as
// the photo quiz's opening reads them) and buttons, faded at first, nothing wider than the screen; marked shown and
// logged (item tip:customleft); Keep drilling (phone) goes on to the next custom question and the card never comes
// again; Go to the Quiz (desktop) opens the photo quiz. Then a player with every genus met (nothing left to open) and
// the count past LEFTN.AT gets none; nor does one while the opening hold is on, who gets it once the hold is off.
// Returns the failures.
async function customLeftCheck(b, base) {
  const fails = [],
    MET = ['Pocillopora', 'Stylophora', 'Favites', 'Dipsastraea', 'Acropora', 'Porites'];
  const open = async (w, h, intro) => {
    const c = await b.newContext({viewport: {width: w, height: h}, serviceWorkers: 'block', intro});
    await c.route(
      x => !x.href.startsWith(base),
      r => r.abort()
    );
    await c.addInitScript(
      ([M, intro]) => {
        localStorage.setItem('reefid-tour', '"done"');
        localStorage.setItem('reefid-sync-coral-start', '{"c":"new","t":1}');
        localStorage.setItem('reefid-nudge', '1');
        // Not a "Did you know?" tip's player (3 photos enlarged): only this card may take a break.
        localStorage.getItem('reefid-tips') || localStorage.setItem('reefid-tips', JSON.stringify({u: {q: 0, z: 3}, s: {}, v: {}}));
        if (intro) {
          localStorage.getItem('reefid-sync-coral-intro') ||
            localStorage.setItem('reefid-sync-coral-intro', JSON.stringify(Object.fromEntries(M.map(n => [n, [0, 1, 1, 's']]))));
          localStorage.getItem('reefid-sync-coral-quiz') || localStorage.setItem('reefid-sync-coral-quiz', '{"bon":false}');
        }
        localStorage.getItem('reefid-sync-coral-custom') || localStorage.setItem('reefid-sync-coral-custom', JSON.stringify({g: M, t: 1}));
      },
      [MET, intro]
    );
    const p = await c.newPage(),
      errs = [];
    p.on('pageerror', e => errs.push(String(e)));
    await p.goto(base + '#practice/custom/play');
    await p.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
    return [c, p, errs];
  };
  // One custom-quiz question answered (a choice, or the typed name), cards and toasts closed as a player would, then
  // Next. Returns whether the card was up after the answer and after Next, and whether its buttons were faded then. A
  // reminder still up from the last Next (one that should not have come) is closed with Keep drilling first, so the
  // failure is reported rather than stopping the smoke.
  const play = async p => {
    if (await p.$('.leftcard')) await p.click('.leftcard [data-b="2"]');
    await qa.ready(p, {timeout: 10000});
    const at = await p.evaluate(() => {
      document.querySelectorAll('.unlock.intro').forEach(x => (x.ulClose ? x.ulClose() : x.remove()));
      smokeAnswer();
      return !!document.querySelector('.leftcard');
    });
    await p.waitForSelector('#next', {timeout: 10000});
    const dis = await p.evaluate(() => {
      document.querySelectorAll('.achpop').forEach(x => x.remove());
      achQ.length = 0;
      achBusy = false;
      document.getElementById('next').click();
      const B = [...document.querySelectorAll('.leftcard [data-b]')];
      return B.length > 0 && B.every(x => x.disabled);
    });
    await p
      .waitForFunction(() => document.querySelector('.leftcard') || document.querySelector('#view .q:not(.done)'), null, {timeout: 10000})
      .catch(() => {});
    return {at, dis, next: !!(await p.$('.leftcard'))};
  };
  const evs = p =>
    p.evaluate(() =>
      JSON.parse(localStorage.getItem('reefid-evq') || '[]')
        .filter(x => x.src === 'tip:customleft')
        .map(x => x.r)
    );
  for (const [w, h] of [
    [390, 844],
    [1280, 800]
  ]) {
    const W = `${w}px custom quiz reminder:`;
    const [c, p, errs] = await open(w, h, true);
    const k = await p.evaluate(() => {
      // No achievement toast (a first right answer earns some): one up at the answer rightly holds every prompt, checked
      // for the tips in tipsCheck; here the threshold is checked to the answer.
      achPop = () => {};
      store.set(sDev(LEFTN.KEY), {n: LEFTN.AT - 2});
      return pool().filter(n => !introduced(n) && mayOpen(n)).length;
    });
    const r1 = await play(p);
    if (r1.at || r1.next) fails.push(`${W} shown under LEFTN.AT: ${JSON.stringify(r1)}`);
    const r2 = await play(p);
    if (r2.at || !r2.next || !r2.dis) fails.push(`${W} at LEFTN.AT: ${JSON.stringify(r2)}`);
    if (r2.next) {
      const r = await p.evaluate(() => {
        const d = document.querySelector('.leftcard'),
          card = d.querySelector('.ulcard').getBoundingClientRect();
        return {
          n: document.querySelectorAll('.unlock').length,
          kind: d.querySelector('.ulcard').dataset.k,
          kick: d.querySelector('.ulkick').textContent,
          title: d.querySelector('h3').textContent,
          btns: [...d.querySelectorAll('[data-b]')].map(x => x.textContent),
          shown: !!store.get(sDev(LEFTN.KEY), {}).shown,
          wide: document.documentElement.scrollWidth > innerWidth || card.left < 0 || card.right > innerWidth || card.bottom > innerHeight
        };
      });
      if (
        r.n !== 1 ||
        r.kind !== 'tip' ||
        r.kick !== 'New genera' ||
        r.title !== `${k} new genera are waiting in the Quiz` ||
        r.btns.join() !== 'Go to the Quiz,Keep drilling' ||
        !r.shown ||
        r.wide ||
        k < 2
      )
        fails.push(`${W} the card: ${JSON.stringify({...r, k})}`);
      if (w === 390) {
        await p.click('.leftcard [data-b="2"]'); // waits for the button to take taps (TIP.WAIT)
        await p.waitForSelector('#view .q:not(.done)', {timeout: 10000}).catch(() => {});
        const h1 = await p.evaluate(() => location.hash);
        if (h1 !== '#practice/custom/play' || (await p.$('.leftcard'))) fails.push(`${W} Keep drilling went to ${h1}`);
        let again = 0;
        for (let i = 0; i < 4; i++) if ((await play(p)).next) again++;
        if (again) fails.push(`${W} shown again (${again} times)`);
        const e = await evs(p);
        if (e.join() !== 'shown,keep') fails.push(`${W} events ${JSON.stringify(e)}`);
      } else {
        await p.click('.leftcard [data-b="1"]');
        await p.waitForFunction(() => location.hash === '#practice/quiz', null, {timeout: 5000}).catch(() => {});
        const e = await evs(p),
          h1 = await p.evaluate(() => location.hash);
        if (h1 !== '#practice/quiz' || e.join() !== 'shown,quiz') fails.push(`${W} Go to the Quiz: ${h1}, events ${JSON.stringify(e)}`);
      }
    }
    if (errs.length) fails.push(`${W} page errors: ${errs.slice(0, 3).join(' | ')}`);
    await c.close();
  }
  // Nothing left to open (every genus met): no card, however long the custom quiz goes on.
  {
    const [c, p, errs] = await open(390, 844, false);
    await p.evaluate(() => store.set(sDev(LEFTN.KEY), {n: LEFTN.AT + 5}));
    let n = 0;
    for (let i = 0; i < 3; i++) if ((await play(p)).next) n++;
    // Still counted (3 more answers), never shown.
    const st = await p.evaluate(() => ({
      left: pool().filter(x => !introduced(x) && mayOpen(x)).length,
      s: store.get(sDev(LEFTN.KEY), {}),
      want: LEFTN.AT + 8
    }));
    if (n || st.left || st.s.shown || st.s.n !== st.want)
      fails.push(`390px custom quiz reminder, nothing to open: ${JSON.stringify({n, ...st})}`);
    if (errs.length) fails.push(`390px custom quiz reminder, nothing to open: page errors ${errs.slice(0, 3).join(' | ')}`);
    await c.close();
  }
  // The opening hold on (model.js introHold; Pierre, 2026-11-12, on #850): no card while it is on, past LEFTN.AT; it comes
  // at the first break once the hold is off.
  {
    const W = '390px custom quiz reminder, opening hold:';
    const [c, p, errs] = await open(390, 844, true);
    await p.evaluate(() => ((achPop = () => {}), store.set(sDev(LEFTN.KEY), {n: LEFTN.AT + 5}), (HOLDS = 9)));
    let n = 0;
    for (let i = 0; i < 3; i++) if ((await play(p)).next) n++;
    const on = await p.evaluate(() => ({hold: introHold(), s: store.get(sDev(LEFTN.KEY), {})}));
    if (n || !on.hold || on.s.shown) fails.push(`${W} shown while the hold is on: ${JSON.stringify({n, ...on})}`);
    await p.evaluate(() => (HOLDS = 0));
    const r = await play(p);
    if (!r.next) fails.push(`${W} not shown once the hold is off: ${JSON.stringify(r)}`);
    if (errs.length) fails.push(`${W} page errors ${errs.slice(0, 3).join(' | ')}`);
    await c.close();
  }
  return fails;
}
// The Duel tab's relief card (quiz.js reliefNote / reliefArm / reliefShow; Pierre, 2026-11-04), at 390, 1024 and 1280 px,
// on "Drill this pair" (#quiz-duel|Pocillopora|Stylophora). The hold's sum is set just under INTRO.HOLD, as a run of misses
// would leave it. Checks: the miss that takes it across shows the card at Next, never with the answer itself; one card
// on screen, its kind, words (no number) and buttons (Mix in other genera first), faded at first; Keep drilling goes on to
// the next duel and the card never comes again in that run, even when the hold falls back under INTRO.HOLD and crosses
// it again; Mix in other genera opens the photo quiz, Compare them the side-by-side comparison of the two genera with
// Back to the duel (phones: floating at the bottom centre; from 1024 px: a light band under the page bar; in view and on
// top wherever the page is scrolled), which, as the browser's Back, returns to the same duel and the same run (no
// second card); a comparison opened any other way has none; each showing logged with its choice and the return (item
// tip:duelhold); a new run that starts with the hold already on gets none (no crossing from below); never
// in the photo quiz; never over an achievement toast (it waits for the next break while the hold is on). The photo of
// a duel aims lower while the hold is on (quiz.js planDuel, model.js holdEase). Returns the failures.
async function duelReliefCheck(b, base) {
  const fails = [],
    PAIR = '#practice/duels/Pocillopora/Stylophora';
  const open = async (w, h, at = PAIR) => {
    const c = await b.newContext({viewport: {width: w, height: h}, serviceWorkers: 'block'});
    await c.route(
      x => !x.href.startsWith(base),
      r => r.abort()
    );
    await c.addInitScript(() => {
      localStorage.setItem('reefid-tour', '"done"');
      localStorage.setItem('reefid-nudge', '1');
      localStorage.setItem('reefid-sync-coral-start', '{"c":"new","t":1}'); // answered (quiz.js startGate)
    });
    await c.addInitScript(TIPS_OFF);
    const p = await c.newPage();
    const errs = [];
    p.on('pageerror', e => errs.push(String(e)));
    await p.goto(base + at);
    await p.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
    // The genus asked, for the checks below to answer right or wrong on purpose (quizDuel draws it).
    await p.evaluate(() => {
      const q0 = question;
      question = (...a) => ((window.__T = a[1]), q0(...a));
    });
    return [c, p, errs];
  };
  // The question on screen redrawn so its genus is known (__T), then answered right or wrong; toasts closed unless
  // toast (one is then raised before Next); then Next. Returns whether the card was up after the answer and after Next.
  const play = async (p, {right = false, toast = false, next = true} = {}) => {
    await qa.ready(p, {timeout: 10000});
    if (!(await p.evaluate(() => !!window.__T))) {
      await p.evaluate(() => route());
      await qa.ready(p, {timeout: 10000});
    }
    const at = await p.evaluate(right => {
      document.querySelectorAll('.unlock.intro').forEach(x => (x.ulClose ? x.ulClose() : x.remove()));
      const t = window.__T;
      window.__T = null;
      smokeAnswer(right ? t : false);
      return !!document.querySelector('.reliefcard');
    }, right);
    if (!next) return {at};
    const dis = await p.evaluate(toast => {
      document.querySelectorAll('.achpop').forEach(x => x.remove());
      achQ.length = 0;
      achBusy = false;
      if (toast) achPop({tier: 1, icon: '🧪', title: 'Smoke relief', desc: 'test'});
      document.getElementById('next').click();
      const B = [...document.querySelectorAll('.reliefcard [data-b], .reliefcard [data-keep]')];
      return B.length === 3 && B.every(x => x.disabled);
    }, toast);
    await p.waitForTimeout(150);
    return {at, dis, next: !!(await p.$('.reliefcard'))};
  };
  // One question played; 1 when the card came at its Next (then closed with Escape, Keep drilling: the run goes on).
  const shown = async (p, o) => {
    if (!(await play(p, o)).next) return 0;
    await p.keyboard.press('Escape');
    await p.waitForTimeout(300);
    return 1;
  };
  const evs = p =>
    p.evaluate(() =>
      JSON.parse(localStorage.getItem('reefid-evq') || '[]')
        .filter(x => x.src === 'tip:duelhold')
        .map(x => `${x.k}:${x.r}:${x.m}`)
    );
  const card = p =>
    p.evaluate(() => {
      const d = document.querySelector('.reliefcard'),
        u = d.querySelector('.ulcard').getBoundingClientRect();
      return {
        n: document.querySelectorAll('.unlock').length,
        kind: d.querySelector('.ulcard').dataset.k,
        kick: d.querySelector('.ulkick').textContent,
        title: d.querySelector('h3').textContent,
        body: d.querySelector('.ulpanel p:not(.ulkick)').textContent,
        btns: [...d.querySelectorAll('[data-b], [data-keep]')].map(x => x.textContent),
        digits: /\d/.test(d.textContent),
        done: !!document.querySelector('#view .q.done'),
        wide: document.documentElement.scrollWidth > innerWidth || u.left < 0 || u.right > innerWidth || u.bottom > innerHeight
      };
    });
  const pick = async (p, sel) => {
    await p.waitForTimeout(700); // the buttons' first moments (TIP.WAIT)
    await p.click(`.reliefcard ${sel}`);
    await p.waitForTimeout(400);
  };
  for (const [w, h] of [
    [390, 844],
    [1024, 768],
    [1280, 800]
  ]) {
    const W = `${w}px duel relief:`;
    // Keep drilling, then once a run.
    {
      const [c, p, errs] = await open(w, h);
      await p.evaluate(() => (HOLDS = 0));
      for (let i = 0; i < 2; i++) if ((await play(p, {right: true})).next) fails.push(`${W} shown with the hold off`);
      // The duel's photo aims lower with the hold on: the same pair drawn 300 times each way for a player well on the way
      // on both genera (whose duels show single views often), the photo difficulty as the answer counts it (one view alone
      // harder by PICKD.SINGLE).
      const aim = await p.evaluate(() => {
        const P0 = JSON.stringify(P);
        ['Pocillopora', 'Stylophora'].forEach(n => (P[n] = {...(P[n] || {}), ok: 10, ko: 2, h: '1101101111', th: 1, pg: 0.5}));
        const d = h => {
          HOLDS = h;
          let s = 0;
          for (let i = 0; i < 300; i++) {
            const q = planDuel('Pocillopora', 'Stylophora'),
              L = q[4].shown;
            s += (L.length === 1 ? PICKD.SINGLE : 0) + L.reduce((t, x) => t + photoDiff(q[1], x), 0) / L.length;
          }
          return s / 300;
        };
        const r = {off: d(0), on: d(INTRO.HOLD + 3)};
        HOLDS = 0;
        P = JSON.parse(P0);
        return r;
      });
      if (!(aim.on < aim.off - 0.05)) fails.push(`${W} the duel's photo not aimed lower with the hold on: ${JSON.stringify(aim)}`);
      await p.evaluate(() => (HOLDS = INTRO.HOLD - 0.05));
      const r = await play(p);
      const h1 = await p.evaluate(() => HOLDS);
      if (!(h1 >= 1.5)) fails.push(`${W} the miss did not take the hold across: ${h1}`);
      if (r.at) fails.push(`${W} shown with the answer, before Next`);
      if (!r.next) fails.push(`${W} not shown at the Next after the hold set in`);
      else {
        const k = await card(p);
        if (
          k.n !== 1 ||
          k.kind !== 'tip' ||
          k.kick !== 'Tough pair today' ||
          k.title !== 'Take a step back?' ||
          k.body !==
            'These two are hard right now. Mixing in other genera for a while, or seeing these two side by side, often helps more than more of the same.' ||
          k.btns.join() !== 'Mix in other genera,Compare them,Keep drilling' ||
          k.digits ||
          !r.dis ||
          !k.done ||
          k.wide
        )
          fails.push(`${W} the card: ${JSON.stringify({...k, dis: r.dis})}`);
        await pick(p, '[data-keep]');
        const nx = await p.evaluate(sel => ({q: !!document.querySelector(sel), card: !!document.querySelector('.unlock')}), qa.SEL);
        if (!nx.q || nx.card) fails.push(`${W} Keep drilling: ${JSON.stringify(nx)}`);
        const ev = await evs(p);
        if (ev.join() !== 'pulse:shown:quiz-duel,pulse:keep:quiz-duel') fails.push(`${W} events: ${JSON.stringify(ev)}`);
        // Right answers bring the hold back under INTRO.HOLD, misses take it across again: no second card in the run (the
        // prompt spacing cleared, so it is the run that holds the card back).
        let again = 0;
        for (let i = 0; i < 20 && (await p.evaluate(() => introHold())); i++) again += await shown(p, {right: true});
        await p.evaluate(() => (localStorage.removeItem('reefid-prompt-at'), (HOLDS = INTRO.HOLD - 0.05)));
        for (let i = 0; i < 3; i++) again += await shown(p);
        if (again) fails.push(`${W} shown again in the same run (${again} times)`);
      }
      if (errs.length) fails.push(`${W} page errors: ${errs.slice(0, 3).join(' | ')}`);
      await c.close();
    }
    // Compare them, then back to the duel by the comparison's Back to the duel button (top), or by the browser's Back:
    // the same duel and the same run (its card already shown: a new crossing brings none), the return logged. Then the
    // duel opened from another page with the hold still on: a new run, no crossing, no card. A comparison opened any
    // other way has no Back to the duel.
    for (const way of ['button', 'browser']) {
      const [c, p, errs] = await open(w, h);
      await p.evaluate(() => (HOLDS = INTRO.HOLD - 0.05));
      const r = await play(p);
      if (!r.next) fails.push(`${W} (compare, ${way}) not shown`);
      else {
        await pick(p, '[data-b="2"]');
        const at = await p.evaluate(() => ({
          h: decodeURIComponent(location.hash),
          cmp: !!document.querySelector('#view .cmprow'),
          // The way back shown (the other one is hidden by the size class): its text and where it sits.
          back: [...document.querySelectorAll('#view [data-duelback]')]
            .filter(x => x.getClientRects().length)
            .map(x => x.textContent + (x.closest('.duelband') ? ' (band)' : x.matches('.next.cmpfab') ? ' (floating)' : ' (inline)')),
          drill: !!document.querySelector('#view a[href^="#practice/duels"]')
        }));
        // Desktop (from 1024 px): the light band under the page bar; phones and tablets: the floating button.
        const desk = w >= 1024;
        if (
          at.h !== '#learn/compare/Pocillopora/Stylophora' ||
          !at.cmp ||
          at.back.join() !== (desk ? 'Back to the duel (band)' : 'Back to the duel (floating)') ||
          at.drill ||
          (await p.$('.unlock'))
        )
          fails.push(`${W} Compare them: ${JSON.stringify(at)}`);
        // In view and on top at the top, in the middle and at the bottom of the comparison. The floating button: centred,
        // above the phone tab bar, the last photos ending above it. The band: right under the page bar once the page
        // scrolls, slim, its button on top.
        for (const at of ['top', 'bottom', 'middle']) {
          await p.evaluate(at => {
            const max = document.documentElement.scrollHeight - innerHeight;
            scrollTo(0, at === 'top' ? 0 : at === 'bottom' ? max : max / 2);
          }, at);
          await p.waitForTimeout(250);
          const f = await p.evaluate(desk => {
            const b = [...document.querySelectorAll('#view [data-duelback]')].find(x => x.getClientRects().length),
              r = b.getBoundingClientRect(),
              tab = document.querySelector('.sections'),
              tr = tab && getComputedStyle(tab).position === 'fixed' ? tab.getBoundingClientRect() : null,
              floor = tr && tr.top > innerHeight / 2 ? tr.top : innerHeight,
              hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2),
              max = document.documentElement.scrollHeight - innerHeight,
              o = {
                inView: r.top >= 0 && r.bottom <= floor && r.height > 0,
                onTop: !!hit && b.contains(hit),
                scrolls: max > 0,
                wide: document.documentElement.scrollWidth > innerWidth
              };
            if (desk) {
              const band = b.closest('.duelband').getBoundingClientRect(),
                bar = document.getElementById('modes').getBoundingClientRect();
              o.under = scrollY < 200 || Math.abs(band.top - bar.bottom - 6) < 3;
              o.slim = band.height <= 46;
            } else {
              const rows = [...document.querySelectorAll('#view .cmprow, #view .cmplab ~ *:not(.cmpfab):not(.cmpfabpad):not(.duelband)')],
                last = rows.length ? rows[rows.length - 1].getBoundingClientRect().bottom : 0;
              o.centred = Math.abs(r.left + r.width / 2 - innerWidth / 2) < 2;
              o.clear = scrollY < max - 2 || last <= r.top;
            }
            return o;
          }, desk);
          if (Object.entries(f).some(([k, v]) => (k === 'wide' ? v : !v)))
            fails.push(`${W} Back to the duel, page scrolled to the ${at}: ${JSON.stringify(f)}`);
        }
        if (way === 'button') await p.locator('#view [data-duelback]:visible').click();
        else await p.goBack();
        await qa.ready(p, {timeout: 10000, optional: true});
        const bk = await p.evaluate(() => ({h: decodeURIComponent(location.hash), run: {...DUELRUN}, back: DUELBACK}));
        if (bk.h !== PAIR || !bk.run.shown || bk.back) fails.push(`${W} back to the duel (${way}): ${JSON.stringify(bk)}`);
        const ev = await evs(p);
        if (ev.join() !== 'pulse:shown:quiz-duel,pulse:cmp:quiz-duel,pulse:back:quiz-duel')
          fails.push(`${W} compare events (${way}): ${JSON.stringify(ev)}`);
        // The same run: the hold falling back under INTRO.HOLD and crossing again brings no second card.
        await p.evaluate(() => (localStorage.removeItem('reefid-prompt-at'), (HOLDS = INTRO.HOLD - 0.05)));
        let n = 0;
        for (let i = 0; i < 2; i++) n += await shown(p);
        if (n) fails.push(`${W} back to the duel (${way}): a new run, ${n} card(s)`);
        if (way === 'browser') {
          // Opened from another page with the hold still on: a new run, no crossing, no card.
          await p.evaluate(() => (location.hash = 'learn/genera'));
          await p.waitForTimeout(400);
          await p.evaluate(h => (location.hash = h), PAIR);
          await p.waitForTimeout(400);
          await p.evaluate(() => localStorage.removeItem('reefid-prompt-at'));
          let m = 0;
          for (let i = 0; i < 3; i++) m += await shown(p);
          if (m || (await p.evaluate(() => !introHold() || DUELRUN.shown)))
            fails.push(`${W} a new run with the hold already on: ${m} card(s)`);
          // The comparison opened any other way: no way back, Drill this pair as always.
          await p.evaluate(() => (location.hash = 'learn/compare/Pocillopora/Stylophora'));
          await p.waitForTimeout(400);
          const o = await p.evaluate(() => ({
            back: document.querySelectorAll('#view [data-duelback]').length,
            drill: !!document.querySelector('#view a[href^="#practice/duels"]')
          }));
          if (o.back || !o.drill) fails.push(`${W} a comparison opened another way: ${JSON.stringify(o)}`);
        }
      }
      if (errs.length) fails.push(`${W} page errors: ${errs.slice(0, 3).join(' | ')}`);
      await c.close();
    }
    // Mix in other genera; a toast up at the Next holds the card for the next break of the run.
    {
      const [c, p, errs] = await open(w, h, '#practice/duels');
      await p.evaluate(() => (HOLDS = INTRO.HOLD - 0.05));
      const held = await play(p, {toast: true});
      if (held.next) fails.push(`${W} shown over an achievement toast`);
      await p.evaluate(() => document.querySelectorAll('.achpop').forEach(x => x.remove()));
      let got = false;
      for (let i = 0; i < 3 && !got; i++) got = (await play(p)).next;
      if (!got) fails.push(`${W} (mix) not shown at a later break while the hold is on`);
      else {
        await pick(p, '[data-b="1"]');
        const at = await p.evaluate(
          sel => ({h: location.hash, q: !!document.querySelector(sel), card: !!document.querySelector('.reliefcard')}),
          qa.SEL
        );
        if (at.h !== '#practice/quiz' || at.card) fails.push(`${W} Mix in other genera: ${JSON.stringify(at)}`);
        const ev = await evs(p);
        if (ev.join() !== 'pulse:shown:quiz-duel,pulse:mix:quiz-duel') fails.push(`${W} mix events: ${JSON.stringify(ev)}`);
      }
      if (errs.length) fails.push(`${W} page errors: ${errs.slice(0, 3).join(' | ')}`);
      await c.close();
    }
    // Never in the photo quiz.
    {
      const [c, p] = await open(w, h, '#practice/quiz');
      await p.evaluate(() => (HOLDS = INTRO.HOLD - 0.05));
      let n = 0;
      for (let i = 0; i < 3; i++) {
        await qa.ready(p, {timeout: 10000});
        n += await p.evaluate(() => {
          smokeAnswer(false);
          document.querySelectorAll('.achpop').forEach(x => x.remove());
          achQ.length = 0;
          achBusy = false;
          document.getElementById('next').click();
          return document.querySelector('.reliefcard') ? 1 : 0;
        });
        await p.evaluate(() => document.querySelectorAll('.unlock').forEach(x => (x.ulClose ? x.ulClose() : x.remove())));
      }
      if (n) fails.push(`${W} shown in the photo quiz`);
      await c.close();
    }
  }
  // A short phone screen (Codex review #460): the settings pop-up, opened over the comparison, reaches down to the
  // floating Back to the duel; a tap there is the setting's, not the button's (the page stays, the way back is kept).
  {
    const W = '390x640 duel relief:',
      [c, p, errs] = await open(390, 640);
    await p.evaluate(() => (HOLDS = INTRO.HOLD - 0.05));
    if (!(await play(p)).next) fails.push(`${W} not shown`);
    else {
      await pick(p, '[data-b="2"]');
      await p.click('#setb');
      await p.waitForTimeout(300);
      const o = await p.evaluate(() => {
        const f = document.querySelector('#view .cmpfab').getBoundingClientRect(),
          s = document.getElementById('settings').getBoundingClientRect(),
          box = [Math.max(f.left, s.left), Math.max(f.top, s.top), Math.min(f.right, s.right), Math.min(f.bottom, s.bottom)],
          x = (box[0] + box[2]) / 2,
          y = (box[1] + box[3]) / 2,
          hit = document.elementFromPoint(x, y);
        return {over: box[0] < box[2] && box[1] < box[3], x, y, settings: !!(hit && hit.closest('#settings'))};
      });
      if (!o.over) fails.push(`${W} the settings pop-up no longer reaches the floating button: the check needs a shorter screen`);
      else {
        await p.mouse.click(o.x, o.y);
        await p.waitForTimeout(400);
        const a = await p.evaluate(() => ({h: decodeURIComponent(location.hash), back: !!DUELBACK}));
        if (!o.settings || a.h !== '#learn/compare/Pocillopora/Stylophora' || !a.back)
          fails.push(`${W} a tap on the settings pop-up over Back to the duel: ${JSON.stringify({...o, ...a})}`);
      }
    }
    if (errs.length) fails.push(`${W} page errors: ${errs.slice(0, 3).join(' | ')}`);
    await c.close();
  }
  return fails;
}
async function credits(b, base) {
  const fails = [],
    BOOK = /Coral Finder|Kelley|BYOGUIDES/i;
  const open = async (w, h, hash = '', fish = false) => {
    const c = await b.newContext({viewport: {width: w, height: h}, serviceWorkers: 'block'});
    await c.route(
      u => !u.href.startsWith(base),
      r => r.abort()
    );
    await c.addInitScript(fish => {
      localStorage.setItem('reefid-tour', '"done"');
      localStorage.setItem('reefid-sync-coral-start', '{"c":"new","t":1}');
      localStorage.setItem('reefid-nudge', '1');
      if (fish)
        (localStorage.setItem('reefid-sync-subject', '"fish"'), localStorage.setItem('reefid-sync-fish-start', '{"c":"new","t":1}'));
    }, fish);
    const p = await c.newPage();
    await p.goto(base + hash);
    await p.waitForFunction(fish => window.APP_READY && (!fish || (typeof FISH === 'object' && FISH && SUBJ.id === 'fish')), fish, {
      timeout: 30000
    });
    await p.waitForTimeout(500);
    return [c, p];
  };
  // The Learn door's photo tiles on screen: [width, height] of each, their columns, the band's class (home.css .hdtiles.land).
  const tiles = p =>
    p.evaluate(() => {
      const t = document.querySelector('#view .hdoor.learn .hdtiles'),
        R = t
          ? [...t.querySelectorAll('img')]
              .filter(i => getComputedStyle(i).display !== 'none')
              .map(i => i.getBoundingClientRect())
              .filter(r => r.width > 0 && r.height > 0)
          : [];
      return {
        land: !!(t && t.classList.contains('land')),
        cols: new Set(R.map(r => Math.round(r.left))).size,
        boxes: R.map(r => [Math.round(r.width), Math.round(r.height)])
      };
    });
  for (const [w, h] of [
    [360, 640],
    [390, 750],
    [390, 844],
    [412, 915],
    [768, 1024],
    [1280, 800]
  ]) {
    const [c, p] = await open(w, h);
    const r = await p.evaluate(() => {
      const cr = document.querySelector('#view .hcred'),
        tab = document.querySelector('nav.sections'),
        tabTop = getComputedStyle(tab).position === 'fixed' ? tab.getBoundingClientRect().top : innerHeight;
      return {
        sh: document.documentElement.scrollHeight,
        ih: innerHeight,
        sw: document.documentElement.scrollWidth,
        iw: innerWidth,
        text: cr ? cr.textContent : '',
        link: !!(cr && cr.querySelector('a[href="#about"]')),
        bottom: cr ? Math.round(cr.getBoundingClientRect().bottom) : 0,
        // Learn & practise is the primary door, Identify the secondary one (Pierre, 2026-11-03).
        // Phones (Pierre, 2026-11-03, second look): the Learn and Practice buttons carry the door, its photos only illustrate.
        doors: ['.hdoor.learn', '.hdoor.identify', '.hdoor.learn .hdart', '.hdoor.learn .hdbtn', '.hdoor.identify .hdbtn'].map(s => {
          const b = document.querySelector(s)?.getBoundingClientRect();
          return b ? [Math.round(b.width), Math.round(b.height)] : [0, 0];
        }),
        tabTop: Math.round(tabTop),
        footer: !!document.querySelector('footer')
      };
    });
    // No vertical scroll, and the credit line in view above the phone tab bar (not hidden under it; the bar's 1 px top
    // border overlaps the page by design: --tabbar-h is 58, the bar 59 with its border).
    if (r.sh > r.ih || r.bottom > r.tabTop + 1 || !r.bottom) fails.push(`${w}x${h} Home is not one screen: ${JSON.stringify(r)}`);
    if (r.sw > r.iw) fails.push(`${w}x${h} Home scrolls sideways: ${JSON.stringify(r)}`);
    const [ld, id, la, lb, ib] = r.doors;
    // Phones: Learn's door taller than Identify's, its buttons taller than Identify's, its photos at most 28% of the
    // screen; side by side: Learn's column wider.
    if (w < 600 ? !(ld[1] > id[1] && lb[1] > ib[1] && la[1] <= 0.28 * h + 1) : !(ld[0] > id[0]))
      fails.push(`${w}x${h} Home: Learn & practise is not the main door: ${JSON.stringify(r.doors)}`);
    // Tablet and desktop: the Learn door's photo band keeps its height with the subject switch above the doors (the phone
    // rule that shortens it on the shortest screens never applies there; Codex review #650).
    if (w >= 600 && la[1] < 120) fails.push(`${w}x${h} Home: the Learn photo band collapsed to ${la[1]} px`);
    // The corals keep their close-up mosaic (Pierre, 2026-11-08: only the fish tiles turn landscape): 4 columns on phones
    // (one row, two once the band is 150 px tall), 6 x 2 from tablets up.
    const ct = await tiles(p);
    if (ct.land || ct.cols !== (w >= 600 ? 6 : 4) || ct.boxes.length !== (w >= 600 ? 12 : la[1] >= 150 ? 8 : 4))
      fails.push(`${w}x${h} Home, corals: the Learn tiles changed ${JSON.stringify(ct)}`);
    if (!/Pierre Pericard/.test(r.text) || !/IMR/.test(r.text) || !r.link || BOOK.test(r.text) || r.footer)
      fails.push(`${w}x${h} Home credit line: ${JSON.stringify(r)}`);
    await c.close();
  }
  // Fish Home (Pierre, 2026-11-08: most fish are horizontal, square tiles cut them): fewer, landscape tiles (home.css
  // .hdtiles.land), every one between 1.3 and 2 wide for 1 tall at every size (U4's widths, phones in portrait and in
  // landscape, the short phone whose band is one row), at most the count given (the corals show 12 from tablets up, 4 or 8
  // on phones); nothing wider than the screen. The Identify door's photo too (home.css .hdart.rc.land): a box between 1.3
  // and 1.8 wide for 1 tall (#740's screenshots: a 96 px box cut the fish at 390 px), or, narrower on a 320 px phone, the
  // photo shown whole (object-fit: contain).
  for (const [w, h, most] of [
    [320, 568, 4],
    [360, 640, 4],
    [375, 667, 3],
    [390, 844, 4],
    [430, 932, 4],
    [844, 390, 8],
    [768, 1024, 4],
    [960, 800, 4],
    [1024, 768, 6],
    [1280, 800, 6],
    [1280, 720, 10]
  ]) {
    const [c, p] = await open(w, h, '', true);
    const ft = await tiles(p),
      sw = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth),
      id = await p.evaluate(() => {
        const a = document.querySelector('#view .hdoor.identify .hdart'),
          i = a && a.querySelector('img'),
          r = a ? a.getBoundingClientRect() : {width: 0, height: 0};
        return {
          land: !!(a && a.classList.contains('land')),
          ar: r.height ? r.width / r.height : 0,
          fit: i ? getComputedStyle(i).objectFit : ''
        };
      });
    if (!ft.land || !ft.boxes.length || ft.boxes.length > most || ft.boxes.some(([tw, th]) => tw / th < 1.3 || tw / th > 2))
      fails.push(`${w}x${h} Home, fish: the Learn tiles are not landscape ${JSON.stringify(ft)}`);
    if (!id.land || id.ar > 1.82 || (id.ar < 1.28 && id.fit !== 'contain'))
      fails.push(`${w}x${h} Home, fish: the Identify photo cuts the fish ${JSON.stringify(id)}`);
    if (sw > 0) fails.push(`${w}x${h} Home, fish: ${sw} px wider than the screen`);
    await c.close();
  }
  // The header fits one line at 360 and 320 px, signed out (the Sign in pill shown): no sideways scroll.
  for (const w of [320, 360]) {
    const [c, p] = await open(w, 640);
    for (const hash of ['', 'genera', 'about']) {
      await p.evaluate(x => (location.hash = x), addr(hash));
      await drawn(p);
      const r = await p.evaluate(() => ({
        sw: document.documentElement.scrollWidth,
        iw: innerWidth,
        signb: !document.getElementById('signb').hidden,
        set: Math.round(document.getElementById('setb').getBoundingClientRect().right)
      }));
      if (!r.signb || r.sw > r.iw || r.set > r.iw)
        fails.push(`${w}px #${hash || 'home'} signed out, header too wide: ${JSON.stringify(r)}`);
    }
    await c.close();
  }
  // About and credits, and the ? help line on another page.
  {
    const [c, p] = await open(390, 844, '#about');
    const r = await p.evaluate(() => {
      const a = document.querySelector('#view .about'),
        secs = a ? [...a.querySelectorAll('section')] : [],
        refs = secs.find(s => /References/.test(s.querySelector('h3')?.textContent || ''));
      return {
        about: !!a,
        who: !!a && /Pierre Pericard/.test(a.textContent) && /IMR/.test(a.textContent),
        privacy: !!(a && a.querySelector('a[href="privacy.html"]')),
        feedback: !!(a && a.querySelector('[data-rep]')),
        licences: !!a && /CC BY/.test(a.textContent),
        // The book may be cited under References only, never in the credits around it.
        credited: secs.filter(s => s !== refs).some(s => /Coral Finder|Kelley|BYOGUIDES/i.test(s.textContent)),
        bar: document.querySelector('#modes.ctx .ctx-t')?.textContent || ''
      };
    });
    if (!r.about || !r.who || !r.privacy || !r.feedback || !r.licences || r.credited || !/About/.test(r.bar))
      fails.push(`About and credits page: ${JSON.stringify(r)}`);
    await p.evaluate(() => (location.hash = 'learn/genus/Acropora'));
    await drawn(p);
    await p.click('#help');
    await p.waitForTimeout(150);
    const hp = await p.evaluate(() => {
      const e = document.querySelector('#helpbox .hend');
      return {
        open: !document.getElementById('helpbox').hidden,
        about: !!(e && e.querySelector('a[href="#about"]')),
        privacy: !!(e && e.querySelector('a[href="privacy.html"]')),
        feedback: !!(e && e.querySelector('[data-rep]'))
      };
    });
    if (!hp.open || !hp.about || !hp.privacy || !hp.feedback)
      fails.push(`? help without About, Privacy and Send feedback: ${JSON.stringify(hp)}`);
    else {
      await p.click('#helpbox .hend a[href="#about"]');
      await p.waitForTimeout(400);
      if (!(await p.$('#view .about'))) fails.push('the ? help link does not open About and credits');
    }
    await c.close();
  }
  return fails;
}

// Pages opened in a visit (sync.js pagesRoute / pagesSend, core.js PAGES, sheet v30 'pages'): a visit opens the quiz,
// the genus sheet from the answer's feedback, then another sheet from Genera; leaving the app (hidden) queues one
// summary with the pages, the seconds, the two sheets and how each was reached. Queued only, never sent: a local copy
// sends nothing to the sheet (app.js LOCAL), and every request off this site is cut. Before the sheet says v30, none.
async function pagesVisit(b, base) {
  const fails = [],
    hide = p =>
      p.evaluate(() => {
        Object.defineProperty(document, 'visibilityState', {value: 'hidden', configurable: true});
        document.dispatchEvent(new Event('visibilitychange'));
      }),
    queued = p => p.evaluate(() => JSON.parse(localStorage.getItem('reefid-evq') || '[]').filter(x => x.k === 'pages')),
    open = async (w, v) => {
      const c = await b.newContext({viewport: {width: w, height: 800}, serviceWorkers: 'block'}),
        posts = [];
      await c.route(
        u => !u.href.startsWith(base),
        r => r.abort()
      );
      c.on('request', r => r.method() === 'POST' && !r.url().startsWith(base) && posts.push(r.url()));
      await c.addInitScript(v => {
        try {
          localStorage.setItem('reefid-tour', '"done"');
          localStorage.setItem('reefid-sync-coral-start', '{"c":"new","t":1}');
          localStorage.setItem('reefid-nudge', '1');
          if (v) localStorage.setItem('reefid-sheet-v', String(v)); // the sheet script version the replies said
        } catch (e) {} // a new tab's first about:blank has no storage
      }, v);
      const p = await c.newPage();
      p.on('pageerror', e => fails.push(`pages summary: page error: ${e.message}`));
      await p.goto(base);
      await p.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
      return [c, p, posts];
    },
    answer = async p => {
      await p.evaluate(() => (location.hash = 'practice/quiz'));
      await qa.ready(p, {timeout: 20000});
      await p.waitForTimeout(1200);
      await p.evaluate(() => smokeAnswer(false));
      await p.waitForSelector('#after h3 a[href^="#learn/genus/"]');
      return p.$eval('#after h3 a[href^="#learn/genus/"]', a => decodeURIComponent(a.getAttribute('href').slice('#learn/genus/'.length)));
    };
  // A phone: the quiz, the feedback's sheet (same tab), Genera, another sheet.
  {
    const [c, p, posts] = await open(390, 30);
    const target = await answer(p);
    await p.click('#after h3 a[href^="#learn/genus/"]');
    await p.waitForFunction(g => location.hash === '#learn/genus/' + encodeURIComponent(g), target);
    await p.waitForTimeout(1500);
    await p.evaluate(() => (location.hash = 'learn/genera'));
    await p.waitForSelector('#view a[href^="#learn/genus/"]');
    const other = await p.$$eval(
      '#view a[href^="#learn/genus/"]',
      (L, t) => L.map(a => decodeURIComponent(a.getAttribute('href').slice('#learn/genus/'.length))).find(g => g !== t),
      target
    );
    await p.click(`#view a[href="#learn/genus/${other}"]`);
    await p.waitForFunction(g => location.hash === '#learn/genus/' + g, other);
    await p.waitForTimeout(1200);
    if ((await queued(p)).length) fails.push('pages summary queued before the app was left');
    await hide(p);
    const Q = await queued(p),
      e = Q[0] || {};
    const want = {
      one: Q.length === 1,
      pages:
        ['home', 'practice.quiz', 'learn.genus', 'learn.genera'].every(k => e.r && e.r[k] && e.r[k][0] >= 1) && e.r['learn.genus'][0] === 2,
      quizTime: !!(e.r && e.r['practice.quiz'] && e.r['practice.quiz'][1] >= 1),
      sheets: !!(e.g && Object.keys(e.g).length === 2),
      fromQuiz: !!(e.g && e.g[target] && e.g[target][2] === 'quiz' && e.g[target][3] === 1 && e.g[target][1] >= 1),
      fromLearn: !!(e.g && e.g[other] && e.g[other][2] === 'learn' && e.g[other][0] === 1),
      answers: e.na === 1,
      visit: /^[a-z0-9]{8}$/.test(e.vi || ''),
      small: JSON.stringify(e).length < 1200 && !/https?:|\.webp|\.jpg/.test(JSON.stringify(e)),
      noName: !('name' in e) && !('ename' in e),
      sent: !posts.length
    };
    if (Object.values(want).some(x => !x)) fails.push(`pages summary (phone): ${JSON.stringify({want, e})}`);
    // Back in the app: the rest of the visit goes on under the same visit id, the sheet in view counted again for its time only.
    await p.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', {value: 'visible', configurable: true});
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await p.waitForTimeout(1100);
    await hide(p);
    const Q2 = await queued(p),
      e2 = Q2[1] || {};
    if (Q2.length !== 2 || e2.vi !== e.vi || !e2.g || !e2.g[other] || e2.g[other][0] !== 0 || !(e2.g[other][1] >= 1))
      fails.push(`pages summary after coming back: ${JSON.stringify(Q2.slice(1))}`);
    await c.close();
  }
  // A computer: the feedback's link opens the sheet in a new tab, a visit of its own, still counted as from the quiz.
  {
    const [c, p, posts] = await open(1280, 30);
    const target = await answer(p);
    const [tab] = await Promise.all([c.waitForEvent('page'), p.click('#after h3 a[href^="#learn/genus/"]')]);
    tab.on('pageerror', e => fails.push(`pages summary: new tab page error: ${e.message}`));
    await tab.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
    await tab.waitForTimeout(1200);
    await hide(tab);
    const Q = await queued(tab),
      e = Q.find(x => x.g && x.g[target] && !(x.r || {}).quiz) || {};
    if (!e.g || e.g[target][2] !== 'quiz' || e.g[target][0] !== 1 || posts.length)
      fails.push(`pages summary, sheet in a new tab: ${JSON.stringify({Q, target, posts})}`);
    await c.close();
  }
  // A summary queued for one player is sent only under that player (Codex review #423): queued signed out, it becomes
  // the account's at sign-in (as the answers do); queued for Ana and still waiting after she signed out, it is dropped,
  // never sent under the next player's anonymous id.
  {
    const [c, p] = await open(390, 30);
    const r = await p.evaluate(() => {
      const pq = () => JSON.parse(localStorage.getItem('reefid-evq') || '[]').filter(x => x.k === 'pages');
      pagesRoute('genera');
      pagesSend();
      const a0 = pq().map(x => x.o);
      signIn('Ana', '1234', {found: false});
      const keyed = pq().map(x => x.o),
        b1 = evBatch();
      pagesRoute('quiz');
      pagesSend();
      SYNC = null; // signed out: the next player's anonymous id
      localStorage.removeItem('reefid-anon-id');
      const b2 = evBatch();
      return {
        a0,
        keyed,
        b1: {n: b1.batch.filter(x => x.k === 'pages').length, who: b1.who, owner: b1.batch.some(x => 'o' in x)},
        b2: {n: b2.batch.filter(x => x.k === 'pages').length, who: b2.who},
        left: pq().length
      };
    });
    if (
      r.a0.length !== 1 ||
      !/^a:[a-z0-9]{10}$/.test(r.a0[0]) ||
      r.keyed.join() !== 'n:ana' ||
      r.b1.n !== 1 ||
      r.b1.who.ename !== 'Ana' ||
      r.b1.owner ||
      r.b2.n ||
      Object.keys(r.b2.who).length ||
      r.left
    )
      fails.push(`pages summary owner: ${JSON.stringify(r)}`);
    await c.close();
  }
  // The app never gets ahead of the sheet script (rule D4): before v30 (or with no version known yet), none queued.
  for (const v of [28, 29, 0]) {
    const [c, p] = await open(390, v);
    await answer(p);
    await p.click('#after h3 a[href^="#learn/genus/"]');
    await p.waitForTimeout(800);
    await hide(p);
    if ((await queued(p)).length) fails.push(`pages summary queued with sheet v${v || 'unknown'}`);
    await c.close();
  }
  return fails;
}
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
      localStorage.setItem('reefid-tour', '"done"');
      localStorage.setItem('reefid-sync-coral-start', '{"c":"new","t":1}');
      localStorage.setItem('reefid-nudge', '1');
    });
    const p = await c.newPage(),
      errs = [];
    p.on('pageerror', e => errs.push(e.message));
    p.on('console', m => {
      if (m.type() === 'error' && !/Failed to load resource|net::ERR_/.test(m.text())) errs.push(m.text());
    });
    await p.goto(base + '#tools');
    await p.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
    for (const st of ['colony', 'polyp', 'corallite', 'septa', 'teeth', 'walls', 'forms']) {
      errs.length = 0;
      // The walls check opens once the four wall types have been seen (basicsTeach checks that part).
      await p.evaluate(s => {
        localStorage.setItem(
          'reefid-basics',
          JSON.stringify(s === 'walls' ? {walls: {separate: 1, shared: 1, valleys: 1, nowall: 1}} : {})
        );
        location.hash = 'learn/basics/' + s;
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
      // Every kind of check offers the app's report once answered (rule U14; Codex on PR #405), and a classified photo
      // opens the enlarged view with its report. (Checked here since 2026-11-04, test-suite review D1: the main route loop
      // navigated to and answered the same steps at 390 and 1280 px only for these two checks, which are not layout.)
      if (!(await p.$('.bx-q .bx-fb [data-rep]'))) fails.push(`${w}x${h} Coral basics ${st}: no report button after the answer`);
      if (st === 'walls') {
        await p.evaluate(() => document.querySelector('.bx-q .bx-cph').click());
        const lb = await p.evaluate(() => !document.getElementById('lightbox').hidden && !!document.querySelector('#lightbox [data-rep]'));
        if (!lb) fails.push(`${w}x${h} Coral basics walls: the check photo does not open the enlarged view with its report`);
        await p.evaluate(() => document.querySelector('#lightbox [data-x]')?.click());
      }
      if (errs.length) fails.push(`${w}x${h} Coral basics ${st}: ${errs.slice(0, 3).join(' | ')}`);
    }
    await c.close();
  }
  return fails;
}

// Coral basics, Pierre's feedback of 2026-11-03: step 4 defines costae beside septa (a term of its own, a label in its own
// colour outside the cup's rim, the septa label inside it, the centre on the cup's centre); step 6 shows the four wall
// types one after the other, "Next: Growth forms" only after the fourth, the check opening then; step 7 picks a form on a
// drawn icon and shows 2-3 large photos of it, each enlarged with its genus; every teaching photo opens the enlarged
// view when tapped, with its labels over the whole photo and a Labels switch. Returns the failures.
async function basicsTeach(b, base) {
  const fails = [];
  for (const [w, h] of [
    [390, 844],
    [1280, 800]
  ]) {
    const c = await b.newContext({viewport: {width: w, height: h}, serviceWorkers: 'block'});
    await c.route(
      u => !u.href.startsWith(base),
      r => r.abort()
    );
    await c.addInitScript(() => {
      localStorage.setItem('reefid-tour', '"done"');
      localStorage.setItem('reefid-sync-coral-start', '{"c":"new","t":1}');
      localStorage.setItem('reefid-nudge', '1');
    });
    const p = await c.newPage(),
      errs = [];
    p.on('pageerror', e => errs.push(e.message));
    const go = async (st, seen = {}) => {
      await p.evaluate(
        ([s, v]) => {
          localStorage.setItem('reefid-basics', JSON.stringify(v));
          location.hash = 'learn/basics/' + s;
        },
        [st, seen]
      );
      await p.waitForSelector('.bx-fig .bx-zoom, .bx-forms', {timeout: 15000});
    };
    const W = `${w}px Coral basics`;
    await p.goto(base + '#tools');
    await p.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
    // Step 4: septa inside the rim, costae outside it, the centre on the rim's centre; Costae defined as its own term.
    await go('septa');
    const sp = await p.evaluate(() => {
      const q = s => document.querySelector(s),
        rim = q('.bx-fig .bx-rim'),
        at = (e, k) => Number(e.getAttribute(k));
      // distance from the rim's centre in rim radii: < 1 inside the rim, 1 on it
      const inRim = d => Math.hypot((at(d, 'cx') - at(rim, 'cx')) / at(rim, 'rx'), (at(d, 'cy') - at(rim, 'cy')) / at(rim, 'ry'));
      return {
        rim: !!rim,
        sep: q('.bx-fig .bx-dot.sep') && inRim(q('.bx-fig .bx-dot.sep')),
        cos: q('.bx-fig .bx-dot.cos') && inRim(q('.bx-fig .bx-dot.cos')),
        ctr: q('.bx-fig .bx-dot.ctr') && inRim(q('.bx-fig .bx-dot.ctr')),
        labs: [...document.querySelectorAll('.bx-fig .bx-lab')].map(e => e.className + ':' + e.textContent),
        more: (q('.bx-more') || {}).textContent || '',
        key: (q('.bx-key') || {}).textContent || '',
        off: [...document.querySelectorAll('.bx-side .bx-off')].map(e => e.textContent).join(' | ')
      };
    });
    if (!sp.rim) fails.push(`${W} septa: no rim drawn on the photo`);
    else {
      if (!(sp.sep < 0.75)) fails.push(`${W} septa: the septa point is not well inside the rim (${sp.sep})`);
      // Costae are immediately outside the wall (Pierre, PR #424): past the rim, by less than a quarter of its radius.
      if (!(sp.cos > 1.05 && sp.cos < 1.25)) fails.push(`${W} septa: the costae point is not just outside the rim (${sp.cos} rim radii)`);
      if (!(sp.ctr < 0.4)) fails.push(`${W} septa: the centre point is not near the rim's centre (${sp.ctr})`);
    }
    if (!sp.labs.some(l => /\bsep\b/.test(l) && /septa/.test(l)) || !sp.labs.some(l => /\bcos\b/.test(l) && /costae/.test(l)))
      fails.push(`${W} septa: no septa and costae labels in their colours: ${sp.labs.join(', ')}`);
    if (!/^Costae: /.test(sp.more) || !/costae/.test(sp.key) || !/slide 13: “When septa cross the wall/.test(sp.off))
      fails.push(`${W} septa: costae not defined as a term of its own with IMR Lecture 6 slide 13`);
    // Tapping the photo enlarges it with the step's labels over the whole photo, and a Labels switch.
    await p.click('.bx-fig .bx-zoom');
    await p.waitForSelector('#lightbox .lb-over .bx-lab', {timeout: 5000}).catch(() => {});
    // the photo has loaded (here from the local fallback) and the layer has followed it
    await p
      .waitForFunction(
        () => {
          const a = document.querySelector('#lightbox .lb-in img').getBoundingClientRect(),
            o = document.querySelector('#lightbox .lb-over').getBoundingClientRect();
          return a.width > 200 && Math.abs(a.width - o.width) < 2 && Math.abs(a.top - o.top) < 2;
        },
        null,
        {timeout: 8000}
      )
      .catch(() => {});
    const lb = await p.evaluate(() => {
      const im = document.querySelector('#lightbox .lb-in img'),
        ov = document.querySelector('#lightbox .lb-over');
      if (!im || !ov) return null;
      const a = im.getBoundingClientRect(),
        o = ov.getBoundingClientRect();
      return {
        d: Math.max(Math.abs(a.left - o.left), Math.abs(a.top - o.top), Math.abs(a.width - o.width), Math.abs(a.height - o.height)),
        labs: ov.querySelectorAll('.bx-lab').length
      };
    });
    if (!lb || lb.d > 2 || lb.labs < 3)
      fails.push(`${W} septa: the enlarged photo has no labels on it, or they are off the photo: ${JSON.stringify(lb)}`);
    // The drawing of the layer (rim, dots, pointers) fills it like the labels (Codex on PR #424): its box is the layer's and
    // each dot sits at its photo coordinates, at fit and at actual size.
    const marks = () =>
      p.evaluate(() => {
        const ov = document.querySelector('#lightbox .lb-over'),
          o = ov.getBoundingClientRect(),
          sv = ov.querySelector('svg').getBoundingClientRect(),
          vb = ov.querySelector('svg').viewBox.baseVal;
        let d = Math.max(
          Math.abs(sv.left - o.left),
          Math.abs(sv.top - o.top),
          Math.abs(sv.width - o.width),
          Math.abs(sv.height - o.height)
        );
        ov.querySelectorAll('.bx-dot').forEach(c => {
          const r = c.getBoundingClientRect(),
            x = o.left + (c.cx.baseVal.value / vb.width) * o.width,
            y = o.top + (c.cy.baseVal.value / vb.height) * o.height;
          d = Math.max(d, Math.abs(r.left + r.width / 2 - x), Math.abs(r.top + r.height / 2 - y));
        });
        return Math.round(d);
      });
    const fitD = await marks();
    if (fitD > 2) fails.push(`${W} septa: the enlarged photo's rings and pointers are ${fitD} px off the photo`);
    await p.evaluate(() => document.querySelector('#lightbox .lb-in img').click());
    await p.waitForTimeout(800);
    const fullD = await marks();
    if (fullD > 2) fails.push(`${W} septa: at actual size, the rings and pointers are ${fullD} px off the photo`);
    await p.evaluate(() => document.querySelector('#lightbox .lb-in img').click());
    await p.click('#lightbox [data-ov]').catch(() => fails.push(`${W} septa: no Labels switch in the enlarged view`));
    if (!(await p.evaluate(() => document.querySelector('#lightbox .lb-over').hidden)))
      fails.push(`${W} septa: Labels off left the labels on`);
    await p.click('#lightbox [data-x]');
    // Every step's teaching photo is the enlarge button (no small "Enlarge" link any more).
    for (const st of ['colony', 'polyp', 'corallite', 'teeth']) {
      await go(st);
      const z = await p.evaluate(() => ({
        n: document.querySelectorAll('.bx-fig .bx-zoom .zic').length,
        link: [...document.querySelectorAll('.bx-fig button')].some(b => b.textContent === 'Enlarge')
      }));
      if (!z.n || z.link) fails.push(`${W} ${st}: the photo is not the enlarge button (${JSON.stringify(z)})`);
      await p.click('.bx-fig .bx-zoom');
      if (!(await p.waitForSelector('#lightbox .lb-over', {timeout: 5000}).catch(() => null)))
        fails.push(`${W} ${st}: tapping the photo does not enlarge it with its labels`);
      await p.click('#lightbox [data-x]').catch(() => {});
    }
    // Step 6: the four wall types in turn; the next step only after the fourth; the check opens then.
    await go('walls');
    const seen = [];
    for (let k = 0; k < 6; k++) {
      const st = await p.evaluate(() => ({
        on: (document.querySelector('.bx-wtabs [aria-pressed="true"]') || {}).dataset?.w,
        next: (document.querySelector('.bx-nav .next') || {}).textContent || '',
        open: document.querySelector('.bx-check').open
      }));
      seen.push(st.on);
      if (/Growth forms/.test(st.next) && new Set(seen).size < 4)
        fails.push(`${W} walls: "Next: Growth forms" after only ${seen.join(', ')}`);
      if (st.open && new Set(seen).size < 4) fails.push(`${W} walls: the check is open before the four types were seen`);
      if (!/Next wall type/.test(st.next)) {
        if (new Set(seen).size !== 4 || !st.open) fails.push(`${W} walls: ended after ${seen.join(', ')}, check open ${st.open}`);
        break;
      }
      await p.click('.bx-nav .bx-wnext');
    }
    if (new Set(seen).size !== 4) fails.push(`${W} walls: the four wall types were not all shown: ${seen.join(', ')}`);
    // Step 7: 7 drawn form icons; each shows 2-3 large example photos, each enlarged with its genus named.
    await go('forms');
    const nf = await p.evaluate(() => document.querySelectorAll('.bx-forms [data-f] svg.bx-fi').length);
    if (nf !== 7) fails.push(`${W} forms: ${nf} drawn form icons, not 7`);
    for (let j = 0; j < 7; j++) {
      await p.click(`.bx-forms [data-f="${j}"]`);
      const ex = await p.evaluate(() =>
        [...document.querySelectorAll('.bx-fex figure')].map(f => ({
          w: Math.round(f.querySelector('img').getBoundingClientRect().width),
          g: (f.querySelector('figcaption i') || {}).textContent || '',
          // rule P1: 0 IMR lecture photo, 1 Pierre's own, 2 another observer's
          r: (n => {
            const fi = (f
                .querySelector('img')
                .getAttribute('src')
                .match(/img\/([^/?]+?)(?:-[mst])?\.webp/) || [])[1],
              q = [...Object.values(DATA.gen[n].views).flat(), ...(DATA.course[n] || [])].find(x => x.f === fi) || {};
            return q.imr ? 0 : q.own ? 1 : 2;
          })((f.querySelector('figcaption i') || {}).textContent)
        }))
      );
      const name = await p.evaluate(j => document.querySelectorAll('.bx-forms [data-f]')[j].textContent, j);
      if (ex.length < 2 || ex.length > 3) fails.push(`${W} forms ${name}: ${ex.length} example photos`);
      // Larger than the old 4-per-row thumbnails (about a quarter of the column).
      if (ex.length && Math.max(...ex.map(e => e.w)) < (w < 600 ? 330 : 400))
        fails.push(`${W} forms ${name}: the largest example is ${Math.max(...ex.map(e => e.w))} px wide`);
      if (ex.some(e => !e.g)) fails.push(`${W} forms ${name}: an example photo without its genus`);
      if (ex.some((e, i) => i && e.r < ex[i - 1].r))
        fails.push(
          `${W} forms ${name}: examples not in rule P1's order (IMR, Pierre's, others): ${ex.map(e => e.g + ':' + e.r).join(', ')}`
        );
    }
    await p.click('.bx-fex .bx-fx');
    const cap = await p
      .waitForSelector('#lightbox .lb-cap', {timeout: 5000})
      .then(e => e.textContent())
      .catch(() => '');
    if (!/Mushroom|Danafungia|Herpolitha|Fungia/.test(cap) || !/·/.test(cap))
      fails.push(`${W} forms: the enlarged example has no genus or credit: "${cap}"`);
    await p.click('#lightbox [data-x]').catch(() => {});
    // Words lists Costae and opens step 4.
    await p.evaluate(() => (location.hash = 'learn/basics/words'));
    await p.waitForSelector('.bx-words', {timeout: 5000});
    const cw = await p.evaluate(() =>
      [...document.querySelectorAll('.bx-words dt a')].some(
        a => a.textContent === 'Costae' && a.getAttribute('href') === '#learn/basics/septa'
      )
    );
    if (!cw) fails.push(`${W} words: no Costae entry linking to step 4`);
    if (errs.length) fails.push(`${W}: ${errs.slice(0, 3).join(' | ')}`);
    await c.close();
  }
  return fails;
}

// A brand-new player end to end (rule W17; test-suite review, 2026-11-04: every other check
// pre-sets "tour seen" or "cards seen", so none met them together, as an RA did). A phone, an empty browser: the welcome
// tour step by step, the first genus cards, 30 answers with whatever card or prompt comes (each closed as a player would,
// with Escape, or its first button), then My progress and Genera. At every step: at most one card, tour or enlarged photo
// on screen, every card closable, no page error. Returns the failures.
async function newPlayer(b, base) {
  const fails = [],
    c = await b.newContext({viewport: {width: 390, height: 844}, serviceWorkers: 'block', intro: true, reducedMotion: 'no-preference'}),
    errs = [],
    seen = {};
  await c.route(
    u => !u.href.startsWith(base),
    r => r.abort()
  );
  const p = await c.newPage();
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => {
    if (m.type() === 'error' && !/Failed to load resource|net::ERR_/.test(m.text())) errs.push(m.text());
  });
  // What is on screen over the page: the tour, the cards shown (a card waiting under the tour is hidden), the enlarged photo.
  const over = () =>
    p.evaluate(() => {
      const vis = e => !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().height > 0,
        cards = [...document.querySelectorAll('.unlock')].filter(vis);
      return {
        tour: vis(document.getElementById('tour')),
        cards: cards.map(u => (u.querySelector('.ulcard') || {dataset: {}}).dataset.k || u.className),
        lb: !document.getElementById('lightbox').hidden
      };
    });
  const alone = (o, at) => {
    const n = +o.tour + o.cards.length + +o.lb;
    if (n > 1) fails.push(`new player, ${at}: ${n} overlays at once ${JSON.stringify(o)}`);
  };
  await p.goto(base);
  await p.waitForFunction(() => window.APP_READY && document.getElementById('tour'), null, {timeout: 30000}).catch(() => {});
  if (!(await p.$('#tour'))) fails.push('new player: no welcome tour on the first visit');
  // The tour, step by step, to its end; its first-launch question (forced, no Next) answered "I'm new to corals".
  // Fish open to all (Q158): the tour's first step asks which subject to start with (#629); this player picks the corals.
  for (let k = 0; k < 12 && (await p.$('#tour .tnext, #tour [data-start], #tour [data-pick]')); k++) {
    const o = await over();
    alone(o, `tour step ${k + 1}`);
    seen.tour = k + 1;
    const step = await p.evaluate(() => document.getElementById('tour').textContent);
    await p.click(
      (await p.$('#tour [data-start]'))
        ? '#tour [data-start="new"]'
        : (await p.$('#tour [data-pick]')) && !(await p.$('#tour .tnext'))
          ? '#tour [data-pick="coral"]'
          : '#tour .tnext'
    );
    await p
      .waitForFunction(s => !document.getElementById('tour') || document.getElementById('tour').textContent !== s, step, {timeout: 5000})
      .catch(() => fails.push(`new player: tour step ${k + 1} did not move on`));
  }
  if (await p.$('#tour')) fails.push('new player: the tour never ended');
  // Closes whatever card is up as a player would: Escape, else its first button once it takes taps.
  const close = async at => {
    for (let k = 0; k < 10; k++) {
      const o = await over();
      alone(o, at);
      if (!o.cards.length && !o.lb) return true;
      o.cards.forEach(x => (seen[x] = (seen[x] || 0) + 1));
      const before = JSON.stringify(o);
      await p.keyboard.press('Escape');
      let moved = false;
      for (let t = 0; t < 10 && !moved; t++) moved = JSON.stringify(await over()) !== before;
      if (!moved) {
        const btn = await p.$('.unlock [data-b="1"]:not([disabled]), .unlock .pulsex');
        if (btn) await btn.click().catch(() => {});
        else await p.waitForTimeout(250); // a card's buttons wait a moment before they take taps
      }
    }
    fails.push(`new player, ${at}: a card that does not close ${JSON.stringify(await over())}`);
    return false;
  };
  if (!(await p.evaluate(() => location.hash === '#practice/quiz'))) await p.evaluate(() => (location.hash = 'practice/quiz'));
  for (let i = 1; i <= 30; i++) {
    if (!(await close(`before answer ${i}`))) break;
    const q = await qa.ready(p, {timeout: 15000, optional: true});
    if (!q) {
      if (await close(`question ${i}`)) continue;
      fails.push(`new player: no question to answer at ${i} ${JSON.stringify(await over())}`);
      break;
    }
    // Clicked in the page: an achievement toast may lie over a button for a few seconds (a player taps through it).
    await p.evaluate(i => smokeAnswer(i % 4 !== 0), i); // mostly right, as a new player
    const nx = await p
      .waitForSelector('#next', {timeout: 10000})
      .then(() => true)
      .catch(() => false);
    if (!nx) fails.push(`new player: no Next after answer ${i}`);
    // A card that came with the answer (the sign-in card at 20 answers) is answered first: a player cannot reach Next
    // behind it (the card is modal, the quiz's keys wait for it). Clicking Next through it in the page, as this did
    // until 2026-11-04, drew the next question and its genus card under it: two cards at once that no player can get.
    if (!(await close(`after answer ${i}`))) break;
    await p.evaluate(() => document.getElementById('next')?.click());
  }
  await close('after 30 answers');
  for (const h of ['progress', 'genera']) {
    await p.evaluate(h => (location.hash = h), addr(h));
    await p.waitForSelector('#view > *', {timeout: 10000}).catch(() => {});
    await close(`#${h}`);
  }
  if (!seen.tour || !seen.genus) fails.push(`new player: the tour and the first genus cards should both have come ${JSON.stringify(seen)}`);
  const n = await p.evaluate(() => answersSoFar());
  if (n !== 30) fails.push(`new player: ${n} answers counted after 30`);
  if (errs.length) fails.push(`new player: page errors ${errs.slice(0, 3).join(' | ')}`);
  await c.close();
  return fails;
}

// One progression path for every game (Pierre, 2026-11-04): a beginner who met 4 genera on the path (Pocillopora,
// Stylophora, Favites, Dipsastraea; Open all declined) plays 15 duels of the Duel tab: they come only from those 4, no
// genus card opens, no ★ genus (whose reference is not met) ever shows; "Drill this pair" on a pair not unlocked falls back
// to an unlocked duel; Memory deals only those 4 genera; the custom quiz offers only them; the Tools' games ask about
// them only. Returns the failures.
async function onePath(b, base) {
  const fails = [],
    MET = ['Pocillopora', 'Stylophora', 'Favites', 'Dipsastraea'],
    STAR = ['Duncanopsammia', 'Alveopora', 'Merulina', 'Cyphastrea', 'Halomitra'],
    c = await b.newContext({viewport: {width: 390, height: 844}, serviceWorkers: 'block', intro: true});
  await c.route(
    u => !u.href.startsWith(base),
    r => r.abort()
  );
  await c.addInitScript(M => {
    localStorage.setItem('reefid-tour', '"done"');
    localStorage.setItem('reefid-nudge', '1');
    localStorage.setItem('reefid-sync-coral-start', JSON.stringify({c: 'new', via: 'tour', at: 0, t: 1}));
    localStorage.getItem('reefid-sync-coral-intro') ||
      localStorage.setItem('reefid-sync-coral-intro', JSON.stringify(Object.fromEntries(M.map(n => [n, [0, 1, 1, 's']]))));
    localStorage.getItem('reefid-sync-coral-quiz') || localStorage.setItem('reefid-sync-coral-quiz', '{"bon":false}');
  }, MET);
  const p = await c.newPage(),
    errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(base + '#practice/duels');
  await p.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
  const asked = new Set();
  let cards = 0;
  for (let i = 0; i < 15; i++) {
    // A card that took the break at Next (a tip, the relief card) is closed first, as a player would.
    let ok = false;
    for (let k = 0; k < 3 && !ok; k++) {
      ok = await qa.ready(p, {timeout: 5000, optional: true});
      if (!ok) {
        // Escape: "Got it" on a tip, "Keep drilling" on the relief card; then Next if the duel answered is still there.
        if (await p.$('.unlock.intro')) cards++;
        await p.keyboard.press('Escape');
        await p.evaluate(
          () => document.querySelector('#view .q.done') && !document.querySelector('.unlock') && document.getElementById('next')?.click()
        );
      }
    }
    if (!ok) {
      fails.push(
        `one path: no duel to answer at ${i + 1} ${JSON.stringify(
          await p.evaluate(() => ({
            h: location.hash,
            u: [...document.querySelectorAll('.unlock')].map(x => x.className),
            v: document.getElementById('view').textContent.slice(0, 80),
            next: !!document.getElementById('next'),
            dis: !!document.getElementById('next')?.disabled,
            armed: !!document.getElementById('next') && document.getElementById('next').onclick !== route,
            run: DUELRUN,
            ach: achQ.length,
            achBusy,
            q: [...document.querySelectorAll('#view .q')].map(x => x.className)
          }))
        )}`
      );
      break;
    }
    const r = await p.evaluate(() => {
      const card = !!document.querySelector('.unlock.intro');
      document.querySelectorAll('.unlock').forEach(x => (x.ulClose ? x.ulClose() : x.remove()));
      document.querySelectorAll('.achpop').forEach(x => x.remove());
      achQ.length = 0;
      achBusy = false;
      // answer.js: a duel: two choices
      const cs = [...document.querySelectorAll('#view .q:not(.done) [data-c]')].map(x => x.dataset.c);
      smokeAnswer(cs[0]); // a duel: its first choice, right or wrong
      return {card, cs};
    });
    await p.waitForSelector('#next:not([disabled])', {timeout: 10000}).catch(() => {});
    await p.evaluate(() => document.getElementById('next')?.click());
    if (r.card) cards++;
    r.cs.forEach(n => asked.add(n));
  }
  const met = await p.evaluate(() => slateGenera().filter(introduced));
  const out = [...asked].filter(n => !MET.includes(n));
  if (cards || out.length || met.length !== MET.length || [...asked].some(n => STAR.includes(n)))
    fails.push(`one path, Duel tab: ${JSON.stringify({cards, out, met: met.length})}`);
  // "Drill this pair" on a pair not unlocked: an unlocked duel instead, no card.
  await p.evaluate(() => (location.hash = 'practice/duels/Acropora/Montipora'));
  await qa.ready(p, {timeout: 10000, optional: true});
  const dr = await p.evaluate(() => ({
    // answer.js: a duel: two choices
    cs: [...document.querySelectorAll('#view .q:not(.done) [data-c]')].map(x => x.dataset.c),
    card: !!document.querySelector('.unlock.intro')
  }));
  if (dr.card || dr.cs.some(n => !MET.includes(n))) fails.push(`one path, a link to a pair not unlocked: ${JSON.stringify(dr)}`);
  // Memory (Practice, #pairs): only the genera unlocked (4 pairs, 8 cards at Medium).
  await p.evaluate(() => (location.hash = 'practice/memory'));
  await p.waitForSelector('#view .pcard', {timeout: 15000}).catch(() => {});
  const mem = await p.evaluate(() => document.querySelectorAll('#view .pcard').length);
  if (mem !== 2 * MET.length) fails.push(`one path, Memory: ${mem} cards, expected ${2 * MET.length}`);
  // The custom quiz's selection: only the genera unlocked.
  await p.evaluate(() => (location.hash = 'practice/custom'));
  await p.waitForSelector('#view .cqtile', {timeout: 15000}).catch(() => {});
  const cq = await p.evaluate(() => [...document.querySelectorAll('#view .cqtile')].map(x => x.dataset.g));
  if (cq.length !== MET.length || cq.some(n => !MET.includes(n)))
    fails.push(`one path, custom quiz offers ${cq.length}: ${cq.slice(0, 6).join(', ')}`);
  // The Tools' games (proto/*.js, lab.js labPlay): each round's photo is of a genus unlocked, 6 rounds each. The reference
  // tools keep every genus (not checked here).
  const GAMES = [
    ['lab-reveal', null, '#rvimg', null],
    ['lab-spot', null, '.spotph img', null],
    ['lab-type', null, '.tystage img', null],
    ['lab-zoom', '#zmgame', '.zlayout img', '#zmgame'],
    ['lab-elim', '#elimm', '#elimmyst img', '#elimm'],
    ['lab-anatomy|drill', null, '#a2q img', '#a2next'],
    ['lab-anatomy|drill', '[data-t="arr"]', '#a2q img', '#a2next']
  ];
  const labOut = {};
  for (const [h, start, sel, again] of GAMES) {
    const seen = [];
    for (let k = 0; k < 6; k++) {
      if (k === 0 || !again) {
        await p.evaluate(() => (location.hash = ''));
        await p.waitForSelector('#view > *', {timeout: 10000}).catch(() => {});
        await p.evaluate(x => (location.hash = x), addr(h));
        await p.waitForSelector(start || sel, {timeout: 15000}).catch(() => {});
        if (start) await p.click(start).catch(() => {});
      } else await p.click(again).catch(() => {});
      await p.waitForSelector(sel, {timeout: 10000}).catch(() => {});
      // The genus of each photo shown, from the data (an IMR lecture photo's file name does not name it), by its file
      // name, or by its online original once R2 failed (core.js photoAway: R2 is cut off here).
      seen.push(
        ...(await p.evaluate(sel => {
          const of = {};
          // Its views and its game slates (app.js gamePics: the curated photos the games may use).
          Object.keys(DATA.gen).forEach(n =>
            [...Object.values(GX(n).views), ...Object.values(GX(n).sl || {}).map(x => x.game || [])].forEach(L =>
              L.forEach(x => ((of[x.f] = n), x.src && (of[x.src] = n)))
            )
          );
          return [...document.querySelectorAll('#view ' + sel)].map(i => {
            const u = i.getAttribute('src') || '',
              x = photoFileOf(u),
              f = x ? x.f : u.replace(/#.*$/, '').replace(/\/(small|medium|large)\.(\w+)$/, '/original.$2');
            return of[f] || f;
          });
        }, sel))
      );
    }
    const out = seen.filter(n => !MET.includes(n));
    if (!seen.length || out.length) labOut[h + (start ? ' ' + start : '')] = {photos: seen.length, out: out.slice(0, 3)};
  }
  if (Object.keys(labOut).length) fails.push(`one path, Tools games: ${JSON.stringify(labOut)}`);
  // A player with no genus unlocked yet: each game sends to the quiz instead of asking about a genus never met.
  {
    const c0 = await b.newContext({viewport: {width: 390, height: 844}, serviceWorkers: 'block', intro: true});
    await c0.route(
      u => !u.href.startsWith(base),
      r => r.abort()
    );
    await c0.addInitScript(() => {
      localStorage.setItem('reefid-tour', '"done"');
      localStorage.setItem('reefid-nudge', '1');
      localStorage.setItem('reefid-sync-coral-start', JSON.stringify({c: 'new', via: 'tour', at: 0, t: 1}));
    });
    const p0 = await c0.newPage();
    p0.on('pageerror', e => errs.push(e.message));
    const none = [];
    for (const [h, start] of GAMES) {
      await p0.goto(base + '#' + addr(h));
      await p0.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
      if (start) {
        await p0.waitForSelector(start, {timeout: 15000}).catch(() => {});
        await p0.click(start).catch(() => {});
      }
      const ok = await p0
        .waitForFunction(() => /Meet a few in the quiz first/.test(document.getElementById('view').textContent), null, {timeout: 10000})
        .then(() => true)
        .catch(() => false);
      if (!ok) none.push(h + (start ? ' ' + start : ''));
      // The tool's own controls stay (Codex review #491: the Zoom ladder's note replaced its Explore switch).
      else if (start && !(await p0.$(start))) none.push(h + ' (its controls gone)');
    }
    if (none.length) fails.push(`one path, Tools games with no genus unlocked: no line to the quiz in ${none.join(', ')}`);
    await c0.close();
  }
  // Genera unlocked but none with a ringed photo (Pocillopora alone): the anatomy drill says so instead of an empty
  // question (Codex review #491).
  {
    const c1 = await b.newContext({viewport: {width: 390, height: 844}, serviceWorkers: 'block', intro: true});
    await c1.route(
      u => !u.href.startsWith(base),
      r => r.abort()
    );
    await c1.addInitScript(() => {
      localStorage.setItem('reefid-tour', '"done"');
      localStorage.setItem('reefid-nudge', '1');
      localStorage.setItem('reefid-sync-coral-start', JSON.stringify({c: 'new', via: 'tour', at: 0, t: 1}));
      localStorage.setItem('reefid-sync-coral-intro', JSON.stringify({Pocillopora: [0, 1, 1, 's']}));
    });
    const p1 = await c1.newPage();
    p1.on('pageerror', e => errs.push(e.message));
    await p1.goto(base + '#tools/anatomy/drill');
    await p1.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
    const said = await p1
      .waitForFunction(() => /ringed photo here yet/.test((document.getElementById('a2q') || {}).textContent || ''), null, {timeout: 10000})
      .then(() => true)
      .catch(() => false);
    if (!said) fails.push('one path, anatomy drill with genera unlocked but none ringed: no word for the player');
    await c1.close();
  }
  if (errs.length) fails.push(`one path: page errors ${errs.slice(0, 3).join(' | ')}`);
  await c.close();
  return fails;
}

// Similar names after a mix-up (the name study's question b; Pierre, 2026-11-14, Q124; quiz.js namesLine): a player who
// met 4 genera drills two of their pairs in the Duel tab and misses each. Pocillopora / Stylophora (Dice 0.48): the
// feedback says "Similar names:", the genus shown first, then the answer, each in italics with the letters that differ
// in bold, and the "Your answer" line after it; Favites / Pocillopora (no first letter, Dice under 0.4): the "Your
// answer" line only. On a phone, Next stays in view (rule U2). Returns the failures.
async function namesCheck(b, base) {
  const fails = [],
    MET = ['Pocillopora', 'Stylophora', 'Favites', 'Dipsastraea'];
  for (const [w, h] of [
    [390, 844],
    [1280, 800]
  ]) {
    const c = await b.newContext({viewport: {width: w, height: h}, serviceWorkers: 'block', intro: true});
    await c.route(
      u => !u.href.startsWith(base),
      r => r.abort()
    );
    await c.addInitScript(M => {
      localStorage.setItem('reefid-tour', '"done"');
      localStorage.setItem('reefid-nudge', '1');
      localStorage.setItem('reefid-sync-coral-start', JSON.stringify({c: 'new', via: 'tour', at: 0, t: 1}));
      localStorage.getItem('reefid-sync-coral-intro') ||
        localStorage.setItem('reefid-sync-coral-intro', JSON.stringify(Object.fromEntries(M.map(n => [n, [0, 1, 1, 's']]))));
      localStorage.getItem('reefid-sync-coral-quiz') || localStorage.setItem('reefid-sync-coral-quiz', '{"bon":false}');
    }, MET);
    await c.addInitScript(TIPS_OFF);
    const p = await c.newPage(),
      errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(base + '#practice/duels/Pocillopora/Stylophora');
    await p.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
    for (const [pair, alike] of [
      [['Pocillopora', 'Stylophora'], true],
      [['Favites', 'Pocillopora'], false]
    ]) {
      await p.evaluate(P => (location.hash = `practice/duels/${P.join('/')}`), pair);
      if (!(await qa.ready(p, {timeout: 10000, optional: true}))) {
        fails.push(`similar names ${w}: no duel ${pair.join('/')}`);
        continue;
      }
      const r = await p.evaluate(() => {
        document.querySelectorAll('.unlock').forEach(x => (x.ulClose ? x.ulClose() : x.remove()));
        const a = smokeAnswer(false),
          nd = document.querySelector('#after .ndiff'),
          vs = [...document.querySelectorAll('#after .vs')].map(x => x.className),
          nb = document.getElementById('next').getBoundingClientRect();
        return {
          fmt: a.fmt,
          t: a.t,
          given: a.given,
          text: nd ? nd.textContent : null,
          its: nd ? [...nd.querySelectorAll('i')].map(i => i.querySelectorAll('b').length) : [],
          bold: nd ? getComputedStyle(nd.querySelector('b')).fontWeight : null,
          vs,
          next: nb.bottom <= innerHeight && nb.top >= 0
        };
      });
      const want = alike ? `Similar names: ${r.t} / ${r.given}` : null;
      if (r.fmt !== 'choices' || !pair.includes(r.t) || !pair.includes(r.given) || r.t === r.given)
        fails.push(`similar names ${w}: not a mix-up of the duel ${pair.join('/')} ${JSON.stringify(r)}`);
      else if (r.text !== want) fails.push(`similar names ${w}, ${pair.join('/')}: line ${JSON.stringify(r.text)}, expected ${want}`);
      else if (alike && (r.its.length !== 2 || r.its.some(n => n < 1) || +r.bold < 600 || r.vs[0] !== 'vs ndiff'))
        fails.push(`similar names ${w}: the names not in italics with bold letters, or not first ${JSON.stringify(r)}`);
      else if (!r.vs.length) fails.push(`similar names ${w}, ${pair.join('/')}: no "Your answer" line ${JSON.stringify(r)}`);
      if (!r.next) fails.push(`similar names ${w}, ${pair.join('/')}: Next out of view after the answer`);
    }
    if (errs.length) fails.push(`similar names ${w}: page errors ${errs.slice(0, 3).join(' | ')}`);
    await c.close();
  }
  return fails;
}

// The subject to start with (Pierre, 2026-11-06; tour.js pick, plan): a player with one subject gets the six steps as
// before, with no word of another subject; a player of the fish group gets the subject choice first, forced, then that
// subject's question, where to switch, and the rest in that subject's words; a group member who signs in during the tour
// gets the choice right after the sign-in step; with fish open to all (core.js open: 'all'), a signed-out new player
// gets it too. Fish photos are not fetched (every other host is aborted). Returns the failures.
async function subjTour(b, base) {
  const fails = [],
    errs = [];
  // mode: 'plain' (no group), 'group' (signed in, in the fish group), 'late' (signed out; signing in to their existing
  // account, the sheet's reply puts them in the group and the app reloads), 'all' (fish open to all, signed out).
  const open = async mode => {
    const c = await b.newContext({viewport: {width: 390, height: 844}, serviceWorkers: 'block'});
    await c.route(
      u => !u.href.startsWith(base),
      r => r.abort()
    );
    // Fish opens to all since 2026-11-06 (Q158): 'all' serves core.js as it is; the group cases serve it with fish back to
    // open: 'group'.
    await c.route(
      u => u.href.startsWith(base) && u.pathname === '/core.js',
      async r => {
        const res = await r.fetch(),
          t = await res.text();
        if (!t.includes("open: 'all'")) fails.push('subject tour: fish does not open to all in core.js');
        await r.fulfill({response: res, body: mode === 'all' ? t : t.replace("open: 'all'", "open: 'group'")});
      }
    );
    await c.addInitScript(mode => {
      try {
        if (!sessionStorage.getItem('st-init')) {
          sessionStorage.setItem('st-init', '1');
          localStorage.setItem('reefid-nudge', '1');
          localStorage.setItem('reefid-board-told', '1');
          localStorage.setItem('reefid-board-sent14', '1');
          if (mode === 'group') {
            localStorage.setItem('reefid-account', JSON.stringify({name: 'Ana', pin: '1234'}));
            localStorage.setItem('reefid-groups', JSON.stringify({n: 'Ana', g: ['fish']}));
          }
        }
      } catch (e) {}
      const g = mode === 'plain' || mode === 'all' ? [] : ['fish'];
      window.SHEET_STUB = (url, o) =>
        Promise.resolve({
          json: () =>
            Promise.resolve(
              o && o.method === 'POST'
                ? {ok: true, log: true, rev: 2, v: 56, groups: g}
                : {ok: true, found: true, data: {'reefid-sync-coral-progress': '{}'}, rev: 1, hold: 0, holdIds: [], v: 56, groups: g}
            )
        });
    }, mode);
    const p = await c.newPage();
    p.on('pageerror', e => errs.push(`${mode}: ${e.message}`));
    await p.goto(base);
    await p.waitForFunction(() => window.APP_READY && document.querySelector('#tour .tbub .tstep'), null, {timeout: 30000});
    return [c, p];
  };
  // A click that cannot happen is a failure with the bubble as it is, not a throw that hides the other cases.
  const tap = (p, sel, what) =>
    p.click(sel, {timeout: 10000}).catch(async () => {
      const st = await bub(p).catch(() => null),
        mine = await p.evaluate(() => [subjMine().map(S => S.id), sessionStorage.getItem('reefid-tour-open')]).catch(() => null);
      fails.push(`subject tour, ${what}: no ${sel} ${JSON.stringify({st, mine})}`);
    });
  const bub = p =>
    p.evaluate(() => {
      const b = document.querySelector('#tour .tbub');
      return b && b.querySelector('.tstep')
        ? {
            n: b.querySelector('.tstep').textContent.trim(),
            h: (b.querySelector('h3') || {}).textContent || '',
            text: b.textContent,
            pick: [...b.querySelectorAll('[data-pick]')].map(x => x.dataset.pick + (x.querySelector('.beta') ? '+beta' : '')),
            start: b.querySelectorAll('[data-start]').length,
            next: (b.querySelector('.tnext') || {}).textContent || null,
            skip: !!b.querySelector('.tskip'),
            sync: !!b.querySelector('.tsync'),
            ring: (document.querySelector('#tour .tring').getAttribute('d') || '').length > 0,
            // What the ring frames: Home's subject row (the header's subject control steps aside on Home, app.css), or ''.
            framed: (() => {
              const g = document.querySelector('#tour .tring').getBoundingClientRect(),
                row = document.querySelector('#view .hsubj'),
                r = row && row.getBoundingClientRect(),
                x = r && (r.left + r.right) / 2,
                y = r && (r.top + r.bottom) / 2;
              return r && r.width && g.width && x >= g.left && x <= g.right && y >= g.top && y <= g.bottom ? 'row' : '';
            })(),
            hdrSubj: getComputedStyle(document.getElementById('subjc')).visibility,
            subj: SUBJ.id,
            hash: location.hash
          }
        : null;
    });
  // Next until the step's title matches (or the tour ends); every step met is collected.
  const walk = async (p, until) => {
    const seen = [];
    for (let k = 0; k < 12; k++) {
      const s = await bub(p);
      if (!s) return seen;
      seen.push(s);
      if (until && until(s)) return seen;
      if (!s.next || s.next === 'Start playing') return seen;
      await tap(p, '#tour .tnext', 'step');
      await p.waitForFunction(n => (document.querySelector('#tour .tstep') || {}).textContent !== n, s.n, {timeout: 10000}).catch(() => {});
      await p.waitForTimeout(300);
    }
    return seen;
  };
  // 1. No group: the steps as before, the first-launch question first, no subject choice, no word of fish.
  {
    const [c, p] = await open('plain');
    const s0 = await bub(p);
    if (!s0 || s0.n !== '1 / 6' || s0.start !== 3 || s0.pick.length) fails.push(`subject tour, no group: first step ${JSON.stringify(s0)}`);
    await tap(p, '#tour [data-start="imr"]', 'step');
    await p.waitForTimeout(400);
    const all = await walk(p);
    if (all.length !== 5 || all.some(s => /fish/i.test(s.text) || s.pick.length || s.subj !== 'coral'))
      fails.push(`subject tour, no group: ${JSON.stringify(all.map(s => [s.n, s.h, s.subj]))}`);
    await c.close();
  }
  // 2. In the fish group: the choice first, forced, both subjects (fish with its beta tag); Fish picked: saved, the fish
  // question, then where to switch (the Home row spotlit), the rest in fish words; Back shows the pick kept.
  {
    const [c, p] = await open('group');
    const s0 = await bub(p);
    if (!s0 || s0.n !== '1 / 8' || s0.pick.join() !== 'coral,fish+beta' || s0.next || s0.skip || !/two subjects/.test(s0.text))
      fails.push(`subject tour, group: the choice ${JSON.stringify(s0)}`);
    await p.keyboard.press('ArrowRight');
    await p.waitForTimeout(300);
    if (((await bub(p)) || {}).n !== '1 / 8') fails.push('subject tour, group: the arrow key passed the choice');
    await tap(p, '#tour [data-pick="fish"]', 'step');
    await p
      .waitForFunction(() => SUBJ.id === 'fish' && document.querySelector('#tour [data-start]'), null, {timeout: 30000})
      .catch(() => {});
    const s1 = await bub(p),
      q = await p.evaluate(() => [SUBJ.start.q, localStorage.getItem('reefid-sync-subject')]);
    if (!s1 || s1.n !== '2 / 8' || s1.h !== q[0] || s1.subj !== 'fish' || q[1] !== '"fish"')
      fails.push(`subject tour, group: after picking Fish ${JSON.stringify({s1, q})}`);
    await tap(p, '#tour .tback', 'step');
    await p.waitForTimeout(400);
    const back = await p.evaluate(
      () => !!document.querySelector('#tour [data-pick="fish"][aria-pressed="true"]') && !!document.querySelector('#tour .tnext')
    );
    if (!back) fails.push('subject tour, group: Back to the choice does not show Fish picked with Next');
    // Picked again: Next, Back and the arrow keys wait while the subject loads, so the question that follows is the picked
    // subject's (Codex review #629); then the tour goes on by itself, as from Next.
    const held = await p.evaluate(() => {
      document.querySelector('#tour [data-pick="fish"]').click();
      const n = document.querySelector('#tour .tnext'),
        k = document.querySelector('#tour .tback');
      return !!n && n.disabled && (!k || k.disabled); // no Back on a first step
    });
    if (!held) fails.push('subject tour, group: Next or Back live while the picked subject loads');
    await p.waitForSelector('#tour [data-start]', {timeout: 10000}).catch(() => {});
    await tap(p, '#tour [data-start="imr"]', 'step');
    await p.waitForTimeout(400);
    const all = await walk(p),
      words = await p.evaluate(() => ({doors: UNITS.fish.tour.doors.d, games: UNITS.fish.tour.games.t}));
    const sw = all[0] || {};
    if (sw.n !== '3 / 8' || sw.h !== 'Corals or Fish, any time' || !sw.ring || sw.framed !== 'row' || sw.hdrSubj !== 'hidden')
      fails.push(`subject tour, group: the switch step ${JSON.stringify(sw)}`);
    const doors = all.find(s => s.h === 'Two ways in'),
      games = all.find(s => s.h === words.games);
    if (!doors || !doors.text.includes(words.doors) || !games || all.some(s => /genus|genera/.test(s.text)))
      fails.push(`subject tour, group: steps not in fish words ${JSON.stringify(all.map(s => [s.n, s.h]))}`);
    const last = all[all.length - 1];
    if (!last || last.n !== '8 / 8' || last.next !== 'Start playing') fails.push(`subject tour, group: last step ${JSON.stringify(last)}`);
    await tap(p, '#tour .tnext', 'step');
    await p
      .waitForFunction(() => !document.getElementById('tour') && location.hash.startsWith(hr('quiz')), null, {timeout: 15000})
      .catch(() => {});
    const end = await p.evaluate(() => ({tour: !!document.getElementById('tour'), h: location.hash, q: hr('quiz'), subj: SUBJ.id}));
    if (end.tour || !end.h.startsWith(end.q) || end.subj !== 'fish')
      fails.push(`subject tour, group: Start playing ${JSON.stringify(end)}`);
    await c.close();
  }
  // 3. A group member signing in on the tour's sign-in step: back on it after the reload, then the choice; Corals picked
  // (its question already asked): no second question.
  {
    const [c, p] = await open('late');
    await tap(p, '#tour [data-start="imr"]', 'step');
    await p.waitForTimeout(400);
    await walk(p, s => s.sync); // to the sign-in step
    const s2 = await bub(p);
    if (!s2 || s2.n !== '3 / 6') fails.push(`subject tour, sign-in: not on the sign-in step ${JSON.stringify(s2)}`);
    await Promise.all([
      p.waitForNavigation().catch(() => fails.push('subject tour, sign-in: no reload')),
      p.evaluate(() => syncGet({name: 'Ana', pin: '1234'}).then(j => signIn('Ana', '1234', j)))
    ]);
    await p
      .waitForFunction(() => window.APP_READY && document.querySelector('#tour .tbub .tstep'), null, {timeout: 30000})
      .catch(() => fails.push('subject tour, sign-in: no tour after the reload'));
    await p.waitForTimeout(500);
    const s3 = await bub(p);
    if (!s3 || s3.n !== '3 / 8' || s3.next !== 'Next') fails.push(`subject tour, sign-in: after the reload ${JSON.stringify(s3)}`);
    await tap(p, '#tour .tnext', 'step');
    await p.waitForSelector('#tour [data-pick]', {timeout: 10000}).catch(() => {});
    const s4 = await bub(p);
    if (!s4 || s4.n !== '4 / 8' || s4.pick.length !== 2) fails.push(`subject tour, sign-in: the choice ${JSON.stringify(s4)}`);
    await tap(p, '#tour [data-pick="coral"]', 'step');
    await p.waitForTimeout(800);
    const s5 = await bub(p);
    if (!s5 || s5.n !== '5 / 8' || s5.h !== 'Corals or Fish, any time')
      fails.push(`subject tour, sign-in: after Corals ${JSON.stringify(s5)}`);
    await c.close();
  }
  // 4. Fish open to all: a signed-out new player gets the choice; Corals picked: the coral question, the pick saved.
  {
    const [c, p] = await open('all');
    const s0 = await bub(p);
    if (!s0 || s0.n !== '1 / 8' || s0.pick.length !== 2) fails.push(`subject tour, open to all: first step ${JSON.stringify(s0)}`);
    await tap(p, '#tour [data-pick="coral"]', 'step');
    await p.waitForSelector('#tour [data-start]', {timeout: 10000}).catch(() => {});
    const s1 = await bub(p),
      k = await p.evaluate(() => [SUBJ.start.q, localStorage.getItem('reefid-sync-subject')]);
    if (!s1 || s1.h !== k[0] || s1.subj !== 'coral' || k[1] !== '"coral"')
      fails.push(`subject tour, open to all: Corals ${JSON.stringify({s1, k})}`);
    await c.close();
  }
  if (errs.length) fails.push(`subject tour: page errors ${errs.slice(0, 3).join(' | ')}`);
  return fails;
}

// The offer to install the app (app.js installNudge, installCard; Pierre, 2026-11-08), at 390 px on a touch screen: an
// Android-like browser (a beforeinstallprompt event, made here: headless Chromium sends none), iPhone Safari (the steps),
// the installed app (standalone), the 2nd visit, a quiz question, and ⚙ Settings › Install the app. The decision itself is
// in tests/install.test.js.
const IOS_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1';
async function installCheck(b, base) {
  const fails = [];
  // visits: the visits before this load (this load is one more, made 2 h after the last); standalone: opened as the app.
  const open = async ({ios = false, standalone = false, visits = 2, hash = ''} = {}) => {
    const c = await b.newContext({
      viewport: {width: 390, height: 844},
      isMobile: true,
      hasTouch: true,
      serviceWorkers: 'block',
      ...(ios ? {userAgent: IOS_UA} : {})
    });
    await c.route(
      u => !u.href.startsWith(base),
      r => r.abort()
    );
    await c.addInitScript(
      ([visits, standalone]) => {
        if (!sessionStorage.getItem('in-init')) {
          sessionStorage.setItem('in-init', '1');
          localStorage.setItem('reefid-tour', '"done"');
          localStorage.setItem('reefid-sync-coral-start', '{"c":"new","t":1}');
          localStorage.setItem('reefid-nudge', '1');
          localStorage.setItem('reefid-install', JSON.stringify({n: visits, t: Date.now() - 2 * 3600000}));
        }
        if (standalone) {
          Object.defineProperty(navigator, 'standalone', {get: () => true});
          const mm = window.matchMedia.bind(window);
          window.matchMedia = q => (/display-mode:\s*standalone/.test(q) ? {...mm(q), matches: true, media: q} : mm(q));
        }
      },
      [visits, standalone]
    );
    const p = await c.newPage();
    const errs = [];
    p.on('pageerror', e => errs.push(String(e)));
    await p.goto(base + hash);
    await p.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
    return [c, p, errs];
  };
  // An Android-like browser's install prompt: the event the app keeps, its prompt() and the player's choice.
  const bip = (p, outcome = 'accepted') =>
    p.evaluate(outcome => {
      const e = new Event('beforeinstallprompt', {cancelable: true});
      e.prompt = () => ((window.__prompted = (window.__prompted || 0) + 1), Promise.resolve());
      e.userChoice = Promise.resolve({outcome});
      dispatchEvent(e);
      return e.defaultPrevented;
    }, outcome);
  const card = p =>
    p
      .waitForSelector('.unlock.install .ulcard', {timeout: 6000})
      .then(() => true)
      .catch(() => false);
  const none = async p => (await p.waitForTimeout(3000), !(await p.$('.unlock.install')));
  const rec = p => p.evaluate(() => JSON.parse(localStorage.getItem('reefid-install') || 'null'));
  const look = p =>
    p.evaluate(() => {
      const d = document.querySelector('.unlock.install'),
        r = d && d.querySelector('.ulcard').getBoundingClientRect();
      return (
        d && {
          fits: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth,
          btns: [...d.querySelectorAll('.ulbtns button')].map(x => x.textContent),
          steps: d.querySelectorAll('.instl li').length,
          icons: d.querySelectorAll('.instl svg.insti').length,
          med: !!d.querySelector('.ulmed img.instapp'),
          note: (d.querySelector('.ulfoot') || {}).textContent || ''
        }
      );
    });

  // Android-like, 3rd visit: our button calls the browser's prompt; accepted, installed: never again.
  {
    const [c, p, errs] = await open();
    if (!(await none(p))) fails.push('install: a card with nothing to offer (no prompt event, not Safari)');
    if (!(await bip(p))) fails.push("install: the browser's own install bar was not held back (preventDefault)");
    if (!(await card(p))) fails.push('install, Android: no card after the prompt event on the 3rd visit');
    else {
      const L = await look(p);
      if (!L || !L.fits || L.btns.join('|') !== 'Install the app|No thanks' || !L.med || !/Settings/.test(L.note))
        fails.push(`install, Android card: ${JSON.stringify(L)}`);
      await p.click('.unlock.install [data-b="1"]');
      await p.waitForTimeout(300);
      const r = await rec(p);
      if (!(await p.evaluate(() => window.__prompted === 1)) || !r.in || (await p.$('.unlock.install')))
        fails.push(`install, Android: Install the app did not call the prompt once, or not marked installed: ${JSON.stringify(r)}`);
    }
    await p.reload();
    await p.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
    await bip(p);
    if (!(await none(p))) fails.push('install, Android: the card again once installed');
    if (errs.length) fails.push(`install, Android: ${errs.slice(0, 3).join(' | ')}`);
    await c.close();
  }
  // Android-like, No thanks: never again; ⚙ still offers it, the browser's prompt at once.
  {
    const [c, p, errs] = await open();
    await bip(p, 'dismissed');
    if (!(await card(p))) fails.push('install, No thanks: no card');
    else await p.click('.unlock.install [data-b="2"]');
    const r = (await rec(p)) || {};
    if (!r.x || r.in) fails.push(`install, No thanks: not marked closed: ${JSON.stringify(r)}`);
    await p.reload();
    await p.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
    await bip(p);
    if (!(await none(p))) fails.push('install: the card again after No thanks');
    await p.click('#setb');
    const row = await p.evaluate(() => {
      const r = document.getElementById('instrow');
      return !!r && !r.hidden && r.getBoundingClientRect().height > 0;
    });
    if (!row) fails.push('install: no Install the app row in ⚙ Settings');
    else {
      await p.click('#instb');
      await p.waitForTimeout(300);
      if (!(await p.evaluate(() => window.__prompted === 1 && document.getElementById('settings').hidden)))
        fails.push('install, ⚙ row: did not call the browser prompt (and close ⚙)');
    }
    if (errs.length) fails.push(`install, No thanks: ${errs.slice(0, 3).join(' | ')}`);
    await c.close();
  }
  // iPhone Safari: never on a quiz question; on Home, the steps with their icons; Got it: never again. ⚙ shows the steps
  // again, without marking anything.
  {
    const [c, p, errs] = await open({ios: true, hash: '#practice/quiz'});
    await qa.ready(p, {timeout: 15000, optional: true});
    if (!(await none(p))) fails.push('install, iPhone: the card over a quiz question');
    await p.evaluate(() => (location.hash = '#home'));
    if (!(await card(p))) fails.push('install, iPhone: no card on Home on the 3rd visit');
    else {
      const L = await look(p);
      if (!L || !L.fits || L.steps !== 3 || L.icons !== 2 || L.btns.join('|') !== 'Got it' || !L.med)
        fails.push(`install, iPhone card: ${JSON.stringify(L)}`);
      await p.click('.unlock.install [data-b="1"]');
      if (!((await rec(p)) || {}).x) fails.push('install, iPhone: Got it did not close it for good');
    }
    await p.click('#setb');
    await p.click('#instb');
    const L2 = (await card(p)) && (await look(p));
    if (!L2 || L2.steps !== 3 || L2.note) fails.push(`install, iPhone ⚙ row: ${JSON.stringify(L2)}`);
    if (errs.length) fails.push(`install, iPhone: ${errs.slice(0, 3).join(' | ')}`);
    await c.close();
  }
  // iPhone Safari, 2nd visit: not yet.
  {
    const [c, p] = await open({ios: true, visits: 1});
    if (!(await none(p))) fails.push('install: the card on the 2nd visit');
    await c.close();
  }
  // The installed app (standalone, iPhone and Android-like): never the card, no ⚙ row; marked installed.
  {
    const [c, p, errs] = await open({ios: true, standalone: true});
    await bip(p);
    const st = {
      none: await none(p),
      row: await p.evaluate(() => document.getElementById('instrow').hidden),
      in: !!((await rec(p)) || {}).in
    };
    if (!st.none || !st.row || !st.in) fails.push(`install, installed app: ${JSON.stringify(st)}`);
    if (errs.length) fails.push(`install, installed app: ${errs.slice(0, 3).join(' | ')}`);
    await c.close();
  }
  return fails;
}
// The parts of this smoke, in the order they run; SMOKE_ONLY=tips,signin runs some of them, SMOKE_PART=main|overlays|
// rest|more one of the four groups CI runs on separate runners (each in a job of smokes.yml: tests/smokeparts.test.js),
// SMOKE_W=390 one width of the main loop (tests/slot.js; default: everything).
// main: the routes at both widths, the genus sheet, Coral basics reports, glossary, Coral ID Key, the new player at 390 and
// admin.html?readonly; overlays: cards, prompts and the one-tap question (inside main's 390 pass when both run, else on
// their own); tips: the "Did you know?" tips (tipsCheck) and the custom quiz's reminder (customLeftCheck); relief: the Duel tab's relief card (duelReliefCheck); start: the first-launch question and its fallback cards
// (startSmoke); newplayer: a brand-new player from an empty browser through the tour and 30 answers (newPlayer); onepath:
// the Duel tab, Memory and the custom quiz on the genera unlocked only (onePath); names: similar names after a mix-up
// (namesCheck); subjtour: the subject to start with in
// the tour, for a player with one subject and with two (subjTour); install: the offer to install the app (installCheck).
const PARTS = [
    'main',
    'overlays',
    'basics',
    'credits',
    'visit',
    'tips',
    'relief',
    'start',
    'subjtour',
    'newplayer',
    'onepath',
    'names',
    'signin',
    'replay',
    'notices',
    'install'
  ],
  WIDTHS = [390, 1280];

(async () => {
  const run = slot.parts(PARTS, {
      main: ['main', 'tips', 'onepath', 'names', 'newplayer'],
      overlays: ['overlays'],
      more: ['relief', 'start', 'signin', 'replay', 'notices'],
      rest: ['basics', 'credits', 'visit', 'subjtour', 'install']
    }),
    ws = slot.widths(WIDTHS);
  await slot('pages.smoke');
  await new Promise(ok => server.listen(0, '127.0.0.1', ok));
  const base = `http://127.0.0.1:${server.address().port}/`,
    fails = [];
  const b = await chromium.launch();
  // The first-encounter card (quiz.js introShow) would cover the quiz in the checks that are not about it: every slate
  // genus (Millepora too, app.js BENTHIC) starts as met on a card, except in a context opened with {intro: true}; the
  // bonus genera offer that then comes (every slate genus met) is answered "Not now" (Q.bon false).
  const INTROS = JSON.stringify(Object.fromEntries([...Object.keys(require('../data.json').gen), 'Millepora'].map(n => [n, [0, 1]]))),
    ctxNew = b.newContext.bind(b);
  b.newContext = async ({intro, ...o} = {}) => {
    const c = await ctxNew(o);
    // Fetches in flight, for drawn().
    await c.addInitScript(() => {
      const f = window.fetch;
      window.__inflight = 0;
      window.fetch = function () {
        window.__inflight++;
        return f.apply(this, arguments).finally(() => window.__inflight--);
      };
    });
    if (!intro)
      await c.addInitScript(s => {
        try {
          localStorage.getItem('reefid-sync-coral-intro') || localStorage.setItem('reefid-sync-coral-intro', s);
          localStorage.getItem('reefid-sync-coral-quiz') || localStorage.setItem('reefid-sync-coral-quiz', '{"bon":false}');
        } catch (e) {}
      }, INTROS);
    return c;
  };
  for (const w of run.has('main') ? ws : []) {
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
    await p.evaluate(() => (location.hash = 'learn/genus/Goniastrea'));
    await drawn(p);
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
    // The tool is the Coral ID Key (Pierre, 2026-11-04): "Coral Finder" on a page (help, folds and pop-ups included)
    // only names the book, cited by page (Coral Finder p. 63, Same Coral Finder box: …, p. 47-56), as the 2022 book,
    // "the Coral Finder book" or one of its terms (tests/idkey.test.js checks the code's strings).
    const notBook = () =>
      [...document.body.textContent.matchAll(/Coral Finder/g)]
        .map(m => document.body.textContent.slice(m.index, m.index + 90))
        .filter(t => !/^Coral Finder( 2022| book| term|[^.]{0,80}?p\. ?\d)/.test(t));
    for (const h of ROUTES) {
      errs.length = 0;
      await p.evaluate(h => {
        location.hash = h;
      }, h);
      if (!(await drawn(p))) fails.push(`${w}px #${h}: the page was not drawn within 15 s`);
      // Drawn means the page itself, not a placeholder waiting for its files (a Lab page before its modules, Codex #454).
      else if (await p.evaluate(() => /^\s*Loading/.test(document.querySelector('#view .note')?.textContent || '')))
        fails.push(`${w}px #${h}: still a "Loading…" placeholder once drawn`);
      // A short window for errors a page throws just after it is drawn (a timer, a late photo).
      await p.waitForTimeout(150);
      if (errs.length) fails.push(`${w}px #${h}: ${errs.slice(0, 3).join(' | ')}`);
      const cf = await p.evaluate(notBook);
      if (cf.length) fails.push(`${w}px #${h}: "Coral Finder" for something other than the book: ${cf.slice(0, 2).join(' | ')}`);
      // No credits block on any page but Home (Pierre, 2026-11-03): no footer, no Home credit line.
      if (await p.evaluate(() => !!document.querySelector('footer, #view .hcred'))) fails.push(`${w}px #${h}: a credits footer or line`);
    }
    // Old and unknown addresses (URL refonte, Pierre 2026-11-05, Q53-Q56: old links are not translated): the section's
    // page when the first segment is a section, else Home, the address replaced; a fish address opens Fish (open to every
    // player since 2026-11-06, Q158; a subject a player may not open gives the corals' page: tests/fish.smoke.js).
    for (const [from, to] of [
      ['g-Acropora', ''],
      ['quiz', ''],
      ['home', ''],
      ['credits', ''],
      ['idkey|form=B', ''],
      ['learn/genus', '#learn/genera'],
      ['practice/nothing', '#practice/quiz'],
      ['tools/nothing', '#tools'],
      ['leaderboard/nothing', '#leaderboard'],
      ['fish/practice/quiz', '#fish/practice/quiz'],
      ['fish/leaderboard', '#leaderboard']
    ]) {
      await p.evaluate(h => (location.hash = h), from);
      await p.waitForFunction(to => location.hash === to && window.ROUTED === hashNow(), to, {timeout: 8000}).catch(() => {});
      const at = await p.evaluate(() => ({
        hash: location.hash,
        url: location.href.endsWith('#') || !location.href.includes('#'),
        key: window.ROUTED
      }));
      if (at.hash !== to || (!to && !at.url)) fails.push(`${w}px old address #${from}: ${JSON.stringify(at)}, not ${to || 'Home'}`);
    }
    // Back on the corals for the checks below (the fish address above switched Fish on).
    await p.evaluate(() => setSubject('coral')).catch(() => {});
    await p.waitForFunction(() => SUBJ.id === 'coral' && window.APP_READY, null, {timeout: 15000}).catch(() => {});
    // Deep links opened straight (a bookmark, a link from the admin): the page and what it is about.
    for (const [h, sel, key] of [
      ['learn/compare/Pocillopora/Stylophora', '.ctx-pair', 'cmp-Pocillopora|Stylophora'],
      ['learn/genus/Porites', '.ctx-t i', 'g-Porites'],
      ['identify/key?form=B', '#view', 'idkey|form=B'],
      ['learn/basics/septa', '.bx', 'basics|septa'],
      ['tools/anatomy', '#labroot', 'lab-anatomy'],
      ['leaderboard/achievements', '#view', 'ach']
    ]) {
      const q = await p.context().newPage();
      await q.goto(base + '#' + h);
      await q.waitForFunction(k => window.ROUTED === k, key, {timeout: 20000}).catch(() => {});
      const at = await q.evaluate(s => ({key: window.ROUTED, hash: location.hash, el: !!document.querySelector(s)}), sel);
      if (at.key !== key || at.hash !== '#' + h || !at.el) fails.push(`${w}px deep link #${h}: ${JSON.stringify(at)}`);
      await q.close();
    }
    // Home and Identify say "Coral ID Key" for the tool, and its page title too.
    await p.evaluate(() => (location.hash = ''));
    await p.waitForTimeout(600);
    const hk = await p.evaluate(() => ({
      cf: [...document.body.textContent.matchAll(/Coral Finder(?! 2022| book)/g)].length,
      key: /Open the Coral ID Key/.test(document.body.textContent)
    }));
    if (hk.cf || !hk.key) fails.push(`${w}px Home: the tool is not the Coral ID Key ${JSON.stringify(hk)}`);
    await p.evaluate(() => (location.hash = 'identify/key'));
    await p.waitForSelector('.ikstart', {timeout: 15000}).catch(() => {});
    const kt = await p.evaluate(() => (document.querySelector('#view h2') || {}).textContent || '');
    if (kt !== 'Coral ID Key') fails.push(`${w}px #idkey: its title is "${kt}"`);
    // Glossary words (beginner review 2026-11-03): the Genera cards' tips are glossed, and the lecture group titles are no
    // glossary word (they looked tappable and did nothing); a term in a card opens its definition, not the sheet.
    await p.evaluate(() => (location.hash = 'learn/genera'));
    await drawn(p);
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
    if (gl.titles || !gl.cards || !gl.def || gl.h !== '#learn/genera') fails.push(`${w}px Genera glossary: ${JSON.stringify(gl)}`);
    // The Coral ID Key's "on the slate" count is the app's (slateGenera: Millepora in), not a count of its own.
    await p.evaluate(() => (location.hash = 'identify/key'));
    // The Coral ID Key's own files may still be on their way (its tier, app.js need): wait for its start screen, not a fixed time.
    await p.waitForSelector('#view [data-show]', {timeout: 15000}).catch(() => {});
    const fd = await p.evaluate(() => [document.querySelector('[data-show]')?.textContent || '', slateGenera().length]);
    if (!fd[0].includes(`(${fd[1]} on the slate)`)) fails.push(`${w}px Coral ID Key slate count: "${fd[0]}", expected ${fd[1]}`);
    // Traits of some species only (data.json `trs`, lab.js trHas): never eliminated on, a row and a ring of their own.
    // The genus and trait come from the data, the first `trs` found (2026-11-04: paliform lobes in some Favites).
    const SOME = await p.evaluate(() => {
      const n = Object.keys(DATA.gen).find(k => (DATA.gen[k].trs || []).length);
      return n && [n, DATA.gen[n].trs[0]];
    });
    if (!SOME) fails.push('no genus with a some-species trait (data.json trs)');
    else {
      await p.evaluate(() => (location.hash = 'tools/elim'));
      await p.waitForSelector('#view [data-t]', {timeout: 15000}).catch(() => {});
      const el = await p.evaluate(([n, id]) => {
        document.querySelector(`[data-t="${id}"]`).click();
        return [document.querySelector(`.etile[data-n="${n}"]`).classList.contains('out'), document.querySelectorAll('.etile.out').length];
      }, SOME);
      if (el[0] || !el[1])
        fails.push(`${w}px Elimination board: ticking ${SOME[1]} ${el[0] ? `eliminated ${SOME[0]}` : 'eliminated nothing'}`);
      await p.evaluate(id => (location.hash = 'tools/gallery/' + id), SOME[1]);
      await p.waitForSelector('#view .galh', {timeout: 15000}).catch(() => {});
      const gs = await p.evaluate(
        n => [...document.querySelectorAll('.galh.some + .galgrid i')].map(e => e.textContent).includes(n),
        SOME[0]
      );
      if (!gs) fails.push(`${w}px Feature gallery: ${SOME[0]} not in the "In some species" row of ${SOME[1]}`);
      await p.evaluate(() => (location.hash = 'tools/matrix'));
      await p.waitForSelector('#view .mx .dot', {timeout: 15000}).catch(() => {});
      if (!(await p.locator('#view .mx .dot.some').count())) fails.push(`${w}px Feature matrix: no ring for a some-species trait`);
    }
    // The one-tap question after 35 answers, and app errors queued for the sheet but never sent from a local copy (LOCAL).
    // A fresh browser that has seen the tour (a tour opened earlier in this context resumes after a reload).
    if (w === 390) {
      const c2 = await b.newContext({viewport: {width: w, height: 800}, serviceWorkers: 'block', intro: true});
      await c2.route(
        u => !u.href.startsWith(base),
        r => r.abort()
      );
      await c2.addInitScript(TIPS_OFF);
      await c2.addInitScript(() => {
        localStorage.setItem('reefid-tour', '"done"');
        localStorage.setItem('reefid-sync-coral-start', '{"c":"new","t":1}');
        localStorage.setItem('reefid-nudge', '1');
      });
      const q2 = await c2.newPage(),
        e2 = [];
      q2.on('pageerror', e => e2.push(e.message));
      await q2.goto(base + '#practice/quiz');
      await q2.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
      // A player starting from zero first meets INTRO.START genera on cards, one after the other ("1 of 4"), and the
      // first question is about one of them, its choices among them (Pierre, 2026-11-02).
      await q2.waitForSelector('.unlock.intro', {timeout: 5000}).catch(() => {});
      // The quiz's keys never answer the question behind a card (Codex review #350).
      // answer.js: the key behind a card answers nothing
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
          // Which event hid the definition, if one did (app.js: a click elsewhere, Escape, or a scroll once the term has
          // moved, glossMoved), and where the term was when shown (glossAt) and is now: a failure then says why
          // (test-suite review, 2026-11-04: seen failing under load, cause not established).
          await q2.evaluate(() => {
            const g = document.querySelector('.gpop'),
              d = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'hidden');
            if (window.__gpopLog) return;
            window.__gpopLog = [];
            Object.defineProperty(g, 'hidden', {
              configurable: true,
              get() {
                return d.get.call(this);
              },
              set(v) {
                if (v && !d.get.call(this))
                  window.__gpopLog.push({by: (window.event && window.event.type) || 'code', t: Math.round(performance.now())});
                d.set.call(this, v);
              }
            });
          });
          await gt.click();
          // Shown on a tap: wait for it rather than read at once.
          await q2.waitForSelector('.gpop:not([hidden])', {timeout: 2000}).catch(() => {});
          const top = await q2.evaluate(() => {
            const g = document.querySelector('.gpop'),
              r = g.getBoundingClientRect(),
              el = glossAt && glossAt.el,
              now = el && el.isConnected ? el.getBoundingClientRect() : null;
            return {
              top: !g.hidden && g.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)),
              hidden: g.hidden,
              hiddenBy: window.__gpopLog.slice(-2),
              termAt: glossAt && [Math.round(glossAt.x), Math.round(glossAt.y)],
              termNow: now && [Math.round(now.left), Math.round(now.top)]
            };
          });
          if (!top.top) fails.push(`${w}px glossary term on a genus card: definition not shown on top ${JSON.stringify(top)}`);
          await q2.click('.unlock.intro h3'); // a tap elsewhere closes the definition
        }
        await q2.click('.unlock.intro .next');
      }
      // answer.js: a new player's first question: choices
      const ch = await q2.evaluate(() => [...document.querySelectorAll('#view [data-c]')].map(b => b.dataset.c));
      // My progress offers to open every genus (RAs who had the lecture and skipped the button on the first cards).
      await q2.evaluate(() => (location.hash = 'progress'));
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
      // The genus name is a tile's key information, never cut (design review 2026-11-01; new-player walkthrough 2026-11-04:
      // "Duncanopsa…" on the phone's Slate view, once its % shows beside it): every slate genus played, in a page of its own.
      {
        for (const vw of w === 390 ? [360, 390] : [w]) {
          const cx = await b.newContext({viewport: {width: vw, height: 800}, serviceWorkers: 'block'});
          await cx.route(
            u => !u.href.startsWith(base),
            r => r.abort()
          );
          await cx.addInitScript(
            G => {
              localStorage.setItem('reefid-tour', '"done"');
              localStorage.setItem('reefid-nudge', '1');
              localStorage.setItem(
                'reefid-sync-coral-progress',
                JSON.stringify(Object.fromEntries(G.map(n => [n, {ok: 4, ko: 2, h: '110101', pg: 0.62}])))
              );
            },
            [...Object.keys(require('../data.json').gen), 'Millepora']
          );
          const px = await cx.newPage();
          await px.goto(base + '#progress');
          await px.waitForSelector('#view .pslate .ps', {timeout: 15000}).catch(() => {});
          const cut = await px.evaluate(() =>
            [...document.querySelectorAll('#view .pslate .ps i')].filter(i => i.scrollWidth > i.clientWidth + 1).map(i => i.textContent)
          );
          // Every tile keeps its ring, drawn (Codex review #486: a % hidden with font-size 0 took its em-sized ring along).
          const rings = await px.evaluate(() =>
            [...document.querySelectorAll('#view .pslate .ps .pct')].map(e => {
              const b = getComputedStyle(e, '::before');
              return Math.min(parseFloat(b.width), parseFloat(b.height));
            })
          );
          const flat = rings.filter(x => !(x >= 10)).length;
          if (cut.length || !rings.length || flat)
            fails.push(`${vw}px My progress Slate: names cut ${cut.join(', ')} (${rings.length} rings, ${flat} not drawn)`);
          await cx.close();
        }
      }
      if (!pg.card || !pg.above || !pg.slate || !pg.last) fails.push(`${w}px My progress layout: ${JSON.stringify(pg)}`);
      // One count of the genera met (a card or an answer) everywhere on the page (new-player walkthrough 2026-11-04: "23/40
      // met" beside "12 not open yet" after 28 cards): the card says the 4 first cards' genera are unlocked (Pierre,
      // 2026-11-05: "30/40 genera unlocked", on its own line under the name), the genera not open yet are the others, and a
      // genus met on a card but never asked does not read "Not seen".
      const mc = await q2.evaluate(() => {
        const n = slateGenera().length,
          met = slateGenera().filter(introduced),
          tile = document.querySelector(`#view a[href="#learn/genus/${encodeURIComponent(met[0])}"]`);
        return {
          badge: (document.querySelector('#view .pbadge .pbunl') || {}).textContent || '',
          met: met.length,
          left: introLeft().length,
          n,
          tip: tile ? tile.title : null
        };
      });
      if (mc.badge !== `${mc.met}/${mc.n} genera unlocked` || mc.met + mc.left !== mc.n || /Not seen/.test(mc.tip || '') || !mc.tip)
        fails.push(`${w}px My progress, genera met: ${JSON.stringify(mc)}`);
      else {
        await q2.click('#openall');
        const left = await q2.evaluate(() => introLeft().length);
        if (left || (await q2.$('#openall'))) fails.push(`${w}px open all genera: ${left} left`);
        // ... and says so (the box just went before).
        const said = await q2.evaluate(() => document.querySelector('.apptoast')?.textContent || '');
        if (!/All \d+ genera are open/.test(said)) fails.push(`${w}px open all genera: no confirmation (${said})`);
        // The card follows at once: every genus unlocked.
        const un = await q2.evaluate(() => (document.querySelector('#view .pbadge .pbunl') || {}).textContent || '');
        if (un !== `${mc.n}/${mc.n} genera unlocked`) fails.push(`${w}px open all genera: the card says "${un}"`);
      }
      // Every slate genus is now met, so the bonus genera offer (a prompt, tested in draw.smoke.js) would come at 30 and
      // move the one-tap question to 40: this player has already chosen (⚙ Bonus genera: Off). Likewise the card offering
      // to go back to one at a time after Open all (model.js backDue: this player's answers fall below expectation):
      // answered Keep them all.
      await q2.evaluate(() => (bonusSet(false), introBack(true)));
      await q2.evaluate(() => (location.hash = 'practice/quiz'));
      await drawn(q2);
      // The Open all box: on the first cards, except for a player who answered "I'm new to corals" (Pierre, 2026-11-04).
      const boxWanted = await q2.evaluate(() => (startOf() || {}).c !== 'new');
      if (seen.length !== 4 || !seen.every((c, k) => c.img && c.all === boxWanted && c.plain && c.kick.includes(`${k + 1} of 4`)))
        fails.push(`${w}px first cards: ${JSON.stringify(seen)}`);
      // Not vacuous (test-suite review, 2026-11-04): the first cards (fixed by INTRO.START and the data) carry a glossary
      // term, or the definition check above and the tap-a-word line below were never checked.
      else if (!seen.some(c => c.gt)) fails.push(`${w}px first cards: no glossary term on any, so the definition was never checked`);
      // "Tap an underlined word" is said once, on the first card with one (beginner review 2026-11-03).
      else if (seen.filter(c => c.hint).length !== +seen.some(c => c.gt) || seen.findIndex(c => c.hint) !== seen.findIndex(c => c.gt))
        fails.push(`${w}px first cards, the tap-a-word line: ${JSON.stringify(seen.map(c => [c.gt, c.hint]))}`);
      else if (!ch.every(c => seen.some(s => s.name === c)))
        fails.push(`${w}px first question not among the first cards: ${ch.join(', ')}`);
      // Back closes an enlarged photo and stays on the page (RA review 2026-11-02).
      await q2.evaluate(() => (location.hash = 'learn/genus/Porites'));
      await drawn(q2);
      await q2.evaluate(() => document.querySelector('#view .zoom').click());
      await q2.waitForTimeout(300);
      await q2.goBack();
      await q2.waitForTimeout(400);
      const lbb = await q2.evaluate(() => ({open: !document.getElementById('lightbox').hidden, h: location.hash}));
      if (lbb.open || lbb.h !== '#learn/genus/Porites') fails.push(`${w}px Back with an enlarged photo: ${JSON.stringify(lbb)}`);
      // A sheet opened by a link in a fresh tab: after a photo was enlarged and closed, its Back button still leads to
      // Genera (Codex review #344: history.length counted the photo's entry, and Back did nothing).
      const q3 = await c2.newPage();
      await q3.goto(base + '#learn/genus/Porites');
      await q3.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
      await q3.evaluate(() => document.querySelector('#view .zoom').click());
      await q3.waitForTimeout(300);
      await q3.click('#lightbox [data-x]');
      await q3.waitForTimeout(400);
      await q3.click('[data-back]');
      await left(q3, '#learn/genus/Porites');
      const bk = await q3.evaluate(() => location.hash);
      if (bk !== '#learn/genera') fails.push(`${w}px Back on a linked sheet after a photo: ${bk}`);
      // A reload with a photo enlarged: its history entry is stepped over, so the sheet's Back returns to the quiz.
      await q3.evaluate(() => (location.hash = 'practice/quiz'));
      await drawn(q3);
      await q3.evaluate(() => (location.hash = 'learn/genus/Porites'));
      await drawn(q3);
      await q3.evaluate(() => document.querySelector('#view .zoom').click());
      await q3.waitForTimeout(300);
      await q3.reload();
      await q3.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
      await q3.waitForTimeout(300);
      await q3.click('[data-back]');
      await left(q3, '#learn/genus/Porites');
      const bl = await q3.evaluate(() => location.hash);
      if (bl !== '#practice/quiz') fails.push(`${w}px Back after a reload with a photo enlarged: ${bl}`);
      // Forward onto a closed photo's entry is stepped over too: the sheet's Back then returns to the quiz.
      await q3.evaluate(() => (location.hash = 'learn/genus/Porites'));
      await drawn(q3);
      await q3.evaluate(() => document.querySelector('#view .zoom').click());
      await q3.waitForTimeout(300);
      await q3.click('#lightbox [data-x]');
      await q3.waitForTimeout(400);
      await q3.goForward();
      await q3.waitForTimeout(500);
      await q3.click('[data-back]');
      await left(q3, '#learn/genus/Porites');
      const bf = await q3.evaluate(() => location.hash);
      if (bf !== '#practice/quiz') fails.push(`${w}px Back after Forward onto a closed photo: ${bf}`);
      // From the quiz to a sheet, then a reload: the sheet's Back still returns to the quiz (Codex review #344).
      await q3.evaluate(() => (location.hash = 'practice/quiz'));
      await drawn(q3);
      await q3.evaluate(() => (location.hash = 'learn/genus/Porites'));
      await drawn(q3);
      await q3.reload();
      await q3.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
      await q3.click('[data-back]');
      await left(q3, '#learn/genus/Porites');
      const bq = await q3.evaluate(() => location.hash);
      if (bq !== '#practice/quiz') fails.push(`${w}px Back on a sheet after a reload: ${bq}`);
      await q3.close();
      // Coral ID Key: the "Compare A and B" button is readable (its text was the colour of its background).
      await q2.evaluate(() => (location.hash = 'identify/key?form=M'));
      // Waits on the Coral ID Key's state, not on time: its list drawn, then each Compare taken (aria-pressed), then the link.
      await q2.waitForSelector('#view [data-cmpk]', {timeout: 15000}).catch(() => {});
      for (const k of [0, 2]) {
        const cb = q2.locator('#view button[data-cmpk]').nth(k);
        await cb.click();
        await q2.waitForFunction(e => e.getAttribute('aria-pressed') === 'true', await cb.elementHandle(), {timeout: 5000}).catch(() => {});
      }
      await q2.waitForSelector('.ikcmp .next', {timeout: 5000}).catch(() => {});
      const cc = await q2.evaluate(() => {
        const n = document.querySelector('.ikcmp .next'),
          c = n && getComputedStyle(n);
        return n ? [c.color, c.backgroundColor] : null;
      });
      if (!cc || cc[0] === cc[1]) fails.push(`${w}px Coral ID Key compare button unreadable: ${JSON.stringify(cc)}`);
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
      await ct.addInitScript(() => localStorage.setItem('reefid-nudge', '1'));
      const qt = await ct.newPage();
      await qt.goto(base);
      await qt.waitForFunction(() => window.APP_READY && document.getElementById('tour'), null, {timeout: 30000});
      // Fish open to every player (Q158): the tour starts with the subject to pick (tour.js pick), then the question.
      if (await qt.$('#tour [data-pick="coral"]')) {
        await qt.click('#tour [data-pick="coral"]');
        await qt.waitForSelector('#tour [data-start="imr"]', {timeout: 5000}).catch(() => {});
      }
      await qt.click('#tour [data-start="imr"]'); // the first-launch question
      await qt.waitForTimeout(400);
      for (let k = 0; k < 6 && (await qt.evaluate(() => location.hash !== '#practice/quiz')); k++) {
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
      if (under.hash !== '#practice/quiz' || !under.card || under.shown) fails.push(`tour over the first cards: ${JSON.stringify(under)}`);
      // The quiz's answer keys never answer the question under the tour (Codex review #353).
      // answer.js: the key under the tour answers nothing
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
      const said = [await qt.textContent('#tour')];
      for (let k = 0; k < 6 && (await qt.$('#tour .tnext')) && !/Start/.test(await qt.textContent('#tour .tnext')); k++) {
        await qt.click('#tour .tnext');
        await qt.waitForTimeout(400);
        said.push(await qt.textContent('#tour').catch(() => ''));
      }
      // A desktop with a mouse: "Click", never "Tap" (new-player walkthrough 2026-11-04: "Tap ?" on a desktop).
      if (said.some(t => /\bTap\b/.test(t)) || !said.some(t => /Click \?/.test(t)))
        fails.push(`tour on a desktop with a mouse: ${JSON.stringify(said.filter(t => /Tap|Click/.test(t)))}`);
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
      // The enlarged quiz photo before the answer: its author by name, never the taxon, the genus or a link (rule P5;
      // Pierre, 2026-11-03: a photo with no credit at all).
      const cb = await b.newContext({viewport: {width: 390, height: 844}, serviceWorkers: 'block'});
      await cb.route(
        u => !u.href.startsWith(base),
        r => r.abort()
      );
      await cb.addInitScript(
        () => (localStorage.setItem('reefid-tour', '"done"'), localStorage.setItem('reefid-sync-coral-start', '{"c":"new","t":1}'))
      );
      const qb = await cb.newPage();
      await qb.goto(base + '#practice/quiz');
      await qb.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
      await qb.waitForSelector('#view [data-q]', {timeout: 10000});
      await qb.waitForTimeout(400);
      await qb.evaluate(() => document.querySelector('#view [data-q]').click());
      const bc = await qb
        .waitForSelector('#lightbox .lb-cap', {timeout: 5000})
        .then(() =>
          qb.evaluate(() => {
            const c = document.querySelector('#lightbox .lb-cap');
            return {text: c.textContent, links: c.querySelectorAll('a').length, it: c.querySelectorAll('i').length};
          })
        )
        .catch(e => ({err: String(e)}));
      const tgt = await qb.evaluate(() => {
        const t = document.querySelector('#view .q [data-q] img');
        return t ? t.getAttribute('src') : '';
      });
      const gname = ((tgt.match(/img\/([a-z]+)-/) || [])[1] || '').replace(/^./, x => x.toUpperCase());
      if (bc.err || !/·/.test(bc.text) || bc.links || bc.it || (gname && bc.text.includes(gname)))
        fails.push(`enlarged quiz photo before the answer: ${JSON.stringify({...bc, gname})}`);
      await cb.close();
      // Enlarged photo at actual size: a mouse drags it around (an RA, 2026-11-02), a click without moving goes back to fit.
      const cz = await b.newContext({viewport: {width: 1024, height: 600}, serviceWorkers: 'block'});
      await cz.route(
        u => !u.href.startsWith(base),
        r => r.abort()
      );
      await cz.addInitScript(
        () => (localStorage.setItem('reefid-tour', '"done"'), localStorage.setItem('reefid-sync-coral-start', '{"c":"new","t":1}'))
      );
      const qz = await cz.newPage();
      await qz.goto(base + '#learn/genus/Acropora');
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
            localStorage.setItem('reefid-tour', '"done"');
            localStorage.setItem('reefid-sync-coral-start', '{"c":"new","t":1}');
            localStorage.setItem('reefid-nudge', '1');
          });
          const p = await c.newPage();
          await p.goto(base + '#practice/quiz');
          await p.waitForFunction(() => window.APP_READY && document.querySelector('#view .qph'), null, {timeout: 30000});
          return [c, p];
        };
        const hintIn = (p, ms) =>
          p.waitForSelector('#view .zhint', {timeout: ms}).then(
            () => p.textContent('#view .zhint'),
            () => null
          );
        // Where no hint should come: waits for the app's decision on this question (quiz.js zoomHint marks its photo
        // data-zh "no" or "shown"), not a fixed time, then says what is on screen; "undecided" if it never decided.
        const hintNot = p =>
          p.waitForSelector('#view .q .qstage .qph[data-zh]', {timeout: 15000}).then(
            () => p.evaluate(() => document.querySelector('#view .zhint')?.textContent || null),
            () => 'undecided'
          );
        // toast: an achievement toast is up when the next question shows (as after a duel won as the first question, which
        // made this check fail in CI on PR #410: the hint was tried once and skipped under the toast); clicked in the page,
        // so Playwright does not wait for the toast to leave first.
        const nextQ = async (p, toast) => {
          await qa.ready(p);
          await p.evaluate(() => smokeAnswer(false)); // a miss: no achievement toast but the one raised here
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
        const r = {mark: await marks(p), q1: await hintNot(p)};
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
        r.reload = await hintNot(p);
        await nextQ(p);
        r.after = await hintNot(p);
        await p.evaluate(() => (location.hash = 'learn/genus/Acropora'));
        await p.waitForSelector('#view .hero-ph');
        r.sheet = await marks(p);
        // mark: the number of photo buttons without the mark or the label (0 = all have them; -1 = no photo found).
        const no = why({
          marks: !r.mark,
          noHintQ1: !r.q1,
          toast: r.toast,
          notWithToast: !r.both,
          sameQuestion: r.same === 1,
          hintQ2: /^(Tap|Click) a photo to see it bigger$/.test(r.q2 || ''),
          label: r.label === 'Enlarge photo',
          gone: r.gone
        });
        if (no.length) fails.push(`enlarge mark and hint on a new player's first questions: ${no.join(', ')} ${JSON.stringify(r)}`);
        if (r.reload || r.after || r.sheet) fails.push(`enlarge hint shown again, or genus sheet photos unmarked: ${JSON.stringify(r)}`);
        await c.close();
        // A player who already enlarged a photo never gets it.
        const [c2, p2] = await hintCtx();
        await p2.click('#view .qph .zoom');
        await p2.waitForSelector('#lightbox:not([hidden])');
        await p2.keyboard.press('Escape');
        await nextQ(p2);
        const z = {hint: await hintNot(p2), key: await p2.evaluate(() => localStorage.getItem('reefid-zoomhint'))};
        if (z.hint || z.key !== '"zoomed"') fails.push(`enlarge hint after a photo was enlarged: ${JSON.stringify(z)}`);
        await c2.close();
      }
      if (run.has('overlays')) for (const f of await overlays(b, base)) fails.push(f);
    }
    errs.length = 0;
    await p.goto(base + 'admin.html?readonly');
    await p.waitForFunction(() => typeof DRAFT !== 'undefined' && DRAFT && DRAFT.genera, null, {timeout: 30000});
    await p.waitForTimeout(500);
    if (errs.length) fails.push(`${w}px admin.html?readonly: ${errs.slice(0, 3).join(' | ')}`);
    // One count of a Key-only genus's colonies (Codex review #390, found apart five times): the refill
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
print(json.dumps({g: {v: fl.colonies(g, G, d.get('cand') or {}, cur, fl.excluded).get(v, 0) for v in fl.kept_views(g, G, cur)} for g in fl.key_only(d)}))`
          ],
          {cwd: ROOT, encoding: 'utf8'}
        )
      );
      if (JSON.stringify(adm) !== JSON.stringify(py))
        fails.push(`Key-only colonies, admin covOf vs tools/fetch_local.py colonies: ${JSON.stringify(adm)} vs ${JSON.stringify(py)}`);
    }
    await ctx.close();
  }
  // Without the main loop's 390 px pass (SMOKE_ONLY=overlays, or SMOKE_W=1280), the overlays still run when asked for.
  if (run.has('overlays') && !(run.has('main') && ws.includes(390))) for (const f of await overlays(b, base)) fails.push(f);
  if (run.has('basics')) for (const f of await basicsFit(b, base)) fails.push(f);
  if (run.has('credits')) for (const f of await credits(b, base)) fails.push(f);
  if (run.has('visit')) for (const f of await pagesVisit(b, base)) fails.push(f);
  if (run.has('basics')) for (const f of await basicsTeach(b, base)) fails.push(f);
  if (run.has('tips')) for (const f of await tipsCheck(b, base)) fails.push(f);
  if (run.has('tips')) for (const f of await customLeftCheck(b, base)) fails.push(f);
  if (run.has('relief')) for (const f of await duelReliefCheck(b, base)) fails.push(f);
  if (run.has('start')) for (const f of await startSmoke(b, base)) fails.push(f);
  if (run.has('subjtour')) for (const f of await subjTour(b, base)) fails.push(f);
  if (run.has('newplayer')) for (const f of await newPlayer(b, base)) fails.push(f);
  if (run.has('onepath')) for (const f of await onePath(b, base)) fails.push(f);
  if (run.has('names')) for (const f of await namesCheck(b, base)) fails.push(f);
  if (run.has('install')) for (const f of await installCheck(b, base)) fails.push(f);
  await b.close();
  if (run.has('signin')) for (const f of await signin(base)) fails.push(f);
  if (run.has('replay')) for (const f of await replayAdoptCheck(base)) fails.push(f);
  if (run.has('notices')) for (const f of await noticesAfterSync(base)) fails.push(f);
  server.close();
  if (fails.length) {
    console.error('Page errors:\n' + fails.join('\n'));
    process.exit(1);
  }
  const part = slot.partial(PARTS, run, WIDTHS, run.has('main') ? ws : WIDTHS);
  console.log(
    part
      ? 'Pages OK' + part
      : `Pages OK: ${ROUTES.length} routes + admin at 390 and 1280 px, sign-in to an existing account, the sheet's full replay adopted.`
  );
})().catch(e => {
  console.error(e);
  process.exit(1);
});
