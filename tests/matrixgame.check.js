// Matrix (proto/matrixgame.js, the Lab) played in a page, for the smokes of every subject (pages.smoke.js on the corals,
// fish.smoke.js, seaslug.smoke.js): one function, so the subjects are held to the same checks (rule S1). Not a node --test file
// (tests/matrixgame.test.js holds the drawing); the smokes serve the photos' host with a one-pixel picture, as for Odd one out,
// since a tile that cannot load closes the answers (the quiz's own handling, as Find the X's).
//
//   await require('./matrixgame.check.js')(page, 390, fails, 'fish', 6);
//
// Per round: four tiles and five names, nothing named before its pair is right (a tile says its number only); the four photos
// of four different unlocked units, the five names those four and one more, no two of one label; a wrong pair keeps nothing
// (no tile named, no name closed, the cross on the tile and the name, the name's own tip said) and a retry is free; a right pair
// names its tile and ticks its name; the fourth ends the round on the quiz's own sheet; one screen (rule U2) fresh, with a tile
// taken, after a wrong pair, after a right pair, at the round's end and with More open; and the player's progress, answer log
// and answer count untouched (untimed, no effect on progress), no unit opened. Pushes its failures into `fails`.
const TILE = '#view .mxq .fxt [data-c]',
  NAME = '#view .mxq .mxans [data-n]';

module.exports = async function matrixCheck(p, w, fails, tag = '', rounds = 6) {
  const at = `${w}px Matrix${tag ? ' ' + tag : ''}`,
    rec = () =>
      p.evaluate(() =>
        JSON.stringify([P, SYNC ? SYNC.log || null : null, store.get(LOG0, []), store.get(ANONQ, []), introMap(), answersSoFar()])
      ),
    // What sticks out of one screen: the tiles above the fixed sheet (when there is one), the sheet and Next above the tab bar.
    fit = () =>
      p.evaluate(() => {
        const tab = document.querySelector('.sections'),
          tabTop = tab && getComputedStyle(tab).position === 'fixed' ? tab.getBoundingClientRect().top : innerHeight,
          aft = document.getElementById('after'),
          sheet = aft && getComputedStyle(aft).position === 'fixed' ? aft.getBoundingClientRect().top : tabTop,
          done = !!document.querySelector('#view .mxq.done');
        return {
          scroll: document.documentElement.scrollHeight - innerHeight,
          out: [...document.querySelectorAll('#view .mxq .fxt, #view .mxq .mxans button, #view .mxst, #view #after, #view #next')]
            .filter(e => e.offsetParent !== null || getComputedStyle(e).position === 'fixed')
            .map(e => [e.id || e.className || e.tagName, e.getBoundingClientRect()])
            .filter(([n, r]) => r.top < -1 || r.bottom > tabTop + 1 || (/fxt/.test(n) && done && r.bottom > sheet + 1))
            .map(([n, r]) => `${n} ${Math.round(r.top)}..${Math.round(r.bottom)} of ${Math.round(Math.min(tabTop, sheet))}`)
        };
      }),
    screen = async (label, k, allow = []) => {
      const f = await fit();
      f.out = f.out.filter(x => !allow.some(a => x.startsWith(a)));
      if (f.scroll > 1 || f.out.length) fails.push(`${at}, round ${k + 1} ${label} is not one screen: ${JSON.stringify(f)}`);
    },
    open = () =>
      p.waitForSelector(`${TILE}:not([disabled])`, {timeout: 15000}).then(
        () => true,
        () => false
      );
  await p.evaluate(() => (location.hash = hr('lab-matrixgame')));
  if (!(await open())) return fails.push(`${at}: no question drawn`);
  const before = await rec(),
    unlockedBefore = await p.evaluate(() => unlocked().length);
  for (let k = 0; k < rounds; k++) {
    if (!(await open())) {
      fails.push(`${at}, round ${k + 1}: the tiles never opened`);
      break;
    }
    const pre = await p.evaluate(
      ([T, N]) => {
        const unitOf = f => pool().find(n => ['wide', 'medium', 'macro'].some(v => gamePics(n, v).some(x => x.f === f))) || null,
          tiles = [...document.querySelectorAll('#view .mxq .fxt')],
          names = [...document.querySelectorAll(N)].map(b => b.dataset.n),
          units = tiles.map(f => unitOf(f.querySelector('img').dataset.f)),
          met = unlocked(),
          rest = names.filter(n => !units.includes(n));
        return {
          tiles: document.querySelectorAll(T).length,
          enabled: [...document.querySelectorAll(T)].every(b => !b.disabled),
          names,
          units,
          // no unit's name in what a tile or a name button says of a photo, before its pair is right
          words: tiles.map(f => f.textContent.trim()).join(''),
          labelled: tiles.every(
            (f, i) =>
              f.querySelector('img').alt === `${SUBJ.what} ${i + 1}` &&
              f.querySelector('button').getAttribute('aria-label') === `Photo ${i + 1}`
          ),
          named: !!document.querySelector('#view .mxq figcaption, #view .mxq .psrc, #view .mxq .fb, #view .mxq .fok, #view .mxq .fko'),
          distinct: new Set(units).size === 4 && !units.includes(null),
          unlockedAll: units.every(n => met.includes(n)),
          one: rest.length === 1 && names.length === 5 && new Set(names).size === 5,
          labels: names.every(a => names.every(b => a === b || !choiceNames(a, b))),
          prompt: (document.querySelector('#view .mxq .prompt') || {}).textContent
        };
      },
      [TILE, NAME]
    );
    if (pre.tiles !== 4 || !pre.enabled || pre.names.length !== 5 || pre.named || pre.prompt !== 'Tap a photo, then its name.')
      fails.push(`${at}, round ${k + 1} before the first tap: ${JSON.stringify(pre)}`);
    if (pre.words !== '1234' || !pre.labelled)
      fails.push(`${at}, round ${k + 1}: a tile says something before its pair is right ${JSON.stringify(pre)}`);
    if (!pre.distinct) fails.push(`${at}, round ${k + 1}: the four photos are not of four different units ${JSON.stringify(pre.units)}`);
    if (!pre.unlockedAll) fails.push(`${at}, round ${k + 1}: a photo of a unit not unlocked ${JSON.stringify(pre.units)}`);
    if (!pre.one) fails.push(`${at}, round ${k + 1}: the five names are not the four units and one more ${JSON.stringify(pre.names)}`);
    if (!pre.labels) fails.push(`${at}, round ${k + 1}: two names carry one label ${JSON.stringify(pre.names)}`);
    await screen('fresh', k);
    const t = k % 4,
      right = pre.units[t],
      wrong = pre.names.find(n => n !== right);
    // A tile taken, then a wrong name: nothing kept, the cross on both, the name's own tip, no retry counted.
    await p.click(`${TILE}[data-c="${t}"]`);
    if (!(await p.evaluate(i => document.querySelectorAll('#view .mxq .fxt')[i].classList.contains('fsel'), t)))
      fails.push(`${at}, round ${k + 1}: the tile taken is not marked`);
    await screen('with a tile taken', k);
    await p.click(`${NAME}[data-n="${wrong}"]`);
    const bad = await p.evaluate(
      ([i, n, T, N]) => {
        const f = document.querySelectorAll('#view .mxq .fxt')[i],
          b = [...document.querySelectorAll(N)].find(x => x.dataset.n === n);
        return {
          oks: document.querySelectorAll('#view .mxq .fok').length,
          ko: f.classList.contains('fko'),
          koName: b.classList.contains('ko'),
          closed: [...document.querySelectorAll(N)].filter(x => x.disabled).length,
          tilesOpen: [...document.querySelectorAll(T)].every(x => !x.disabled),
          cap: (f.querySelector('figcaption') || {}).textContent || '',
          verdict: (document.querySelector('#view .mxst h3') || {}).className || '',
          line: !!document.querySelector('#view .mxst .fbline'),
          done: !!document.querySelector('#view .mxq.done'),
          unit: GX(n).name || n
        };
      },
      [t, wrong, TILE, NAME]
    );
    if (bad.oks || !bad.ko || !bad.koName || bad.closed || !bad.tilesOpen || bad.done || !/^ko/.test(bad.verdict) || !bad.cap.includes('✗'))
      fails.push(`${at}, round ${k + 1} after a wrong pair: ${JSON.stringify(bad)}`);
    await screen('after a wrong pair', k);
    // The retry is free: the same tile, the right name (by the keyboard in round 3: the tile's number, the name's letter).
    if (k === 2) {
      await p.keyboard.press(String(t + 1));
      await p.keyboard.press('abcde'[pre.names.indexOf(right)]);
    } else if (k % 2) {
      await p.click(`${NAME}[data-n="${right}"]`); // the name first, then the photo
      await p.click(`${TILE}[data-c="${t}"]`);
    } else {
      await p.click(`${TILE}[data-c="${t}"]`);
      await p.click(`${NAME}[data-n="${right}"]`);
    }
    const good = await p.evaluate(
      ([i, n, N]) => {
        const f = document.querySelectorAll('#view .mxq .fxt')[i],
          b = [...document.querySelectorAll(N)].find(x => x.dataset.n === n);
        return {
          ok: f.classList.contains('fok') && !f.classList.contains('fko'),
          cap: ((f.querySelector('figcaption') || {}).textContent || '').replace(/[✓✗]/g, '').trim(),
          name: b.disabled && b.classList.contains('ok'),
          verdict: (document.querySelector('#view .mxst h3') || {}).className || '',
          enlarge: !!f.querySelector('[data-fz]'),
          unit: GX(n).name || n
        };
      },
      [t, right, NAME]
    );
    if (!good.ok || good.cap !== good.unit || !good.name || !good.enlarge || (!/^ok/.test(good.verdict) && !(await p.$('#view .mxq.done'))))
      fails.push(`${at}, round ${k + 1} after a right pair: ${JSON.stringify(good)}`);
    await screen('after a right pair', k);
    // The three others, in turns of order; the last one ends the round.
    for (const j of [0, 1, 2, 3].filter(x => x !== t)) {
      await p.click(`${TILE}[data-c="${j}"]`);
      await p.click(`${NAME}[data-n="${pre.units[j]}"]`);
    }
    await p.waitForSelector('#view .mxq.done #next', {timeout: 5000}).catch(() => fails.push(`${at}, round ${k + 1}: no end sheet`));
    const end = await p.evaluate(() => ({
      oks: document.querySelectorAll('#view .mxq .fok').length,
      kos: document.querySelectorAll('#view .mxq .fko').length,
      h3: (document.querySelector('#view #after h3') || {}).textContent || '',
      more: !!document.getElementById('fbmore'),
      enlarge: document.querySelectorAll('#view .mxq .fxt [data-fz]').length
    }));
    if (end.oks !== 4 || end.kos || !/all four matched/.test(end.h3) || !end.more || end.enlarge !== 4)
      fails.push(`${at}, round ${k + 1} at the end: ${JSON.stringify(end)}`);
    await screen('at the end', k);
    await p.click('#view #fbmbtn');
    // (on a desktop the side column scrolls under a long More, Next pinned in view: only the page may never scroll)
    await screen('with More open', k, ['after']);
    await p.click('#view #next');
    if (
      k + 1 < rounds &&
      !(await p.waitForSelector('#view .mxq:not(.done) [data-c]', {timeout: 8000}).then(
        () => true,
        () => false
      ))
    )
      fails.push(`${at}: Next drew no new question`);
  }
  if ((await rec()) !== before) fails.push(`${at}: playing it changed the player's record, log or answer count`);
  if ((await p.evaluate(() => unlocked().length)) !== unlockedBefore) fails.push(`${at}: playing it opened a unit`);
};
