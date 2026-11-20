// Memory (proto/pairs.js, Practice › Memory) played in a page on a one-view subject, for the smokes of the fish and the sea
// slugs (fish.smoke.js, seaslug.smoke.js): one function, so the subjects are held to the same checks (rule S1). Not a
// node --test file (tests/pairs.test.js holds the drawing); the smokes serve the photos' host with a one-pixel picture.
//
//   await require('./memory.check.js')(page, 390, fails, 'fish', 3);
//
// Per game (the first at the width, then New game): an even number of cards, each unit twice, the units unlocked (rule L4)
// and no two of one label; the two photos of a unit two different observations (rule P4), and never a pair of one species and
// one phase when a species or a juvenile beside an adult was there to show (the pairing's order); nothing named before a pair
// is found (the name band hidden, a neutral alt and label); a wrong pair turns back, a right one is named, told in one line
// with a report button; the last pair ends the game; one screen (rule U2) fresh, with a pair found and at the end;
// and the player's progress, answer log and answer count untouched (nothing here counts), no unit opened. Pushes its failures
// into `fails`.
module.exports = async function memoryCheck(p, w, fails, tag = '', games = 2) {
  const at = `${w}px Memory${tag ? ' ' + tag : ''}`,
    rec = () =>
      p.evaluate(() =>
        JSON.stringify([P, SYNC ? SYNC.log || null : null, store.get(LOG0, []), store.get(ANONQ, []), introMap(), answersSoFar()])
      ),
    // What sticks out of one screen: the grid and the side column above the fixed tab bar, the page never scrolling.
    fit = () =>
      p.evaluate(() => {
        const tab = document.querySelector('.sections'),
          tabTop = tab && getComputedStyle(tab).position === 'fixed' ? tab.getBoundingClientRect().top : innerHeight;
        return {
          scroll: document.documentElement.scrollHeight - innerHeight,
          out: [...document.querySelectorAll('#view .pgrid, #view .pcard, #view .gside, #view #pres')]
            .filter(e => e.offsetParent !== null)
            .map(e => [e.id || e.className, e.getBoundingClientRect()])
            .filter(([n, r]) => r.top < -1 || r.bottom > tabTop + 1)
            .map(([n, r]) => `${n} ${Math.round(r.top)}..${Math.round(r.bottom)} of ${Math.round(tabTop)}`)
        };
      }),
    screen = async label => {
      const f = await fit();
      if (f.scroll > 1 || f.out.length) fails.push(`${at}, ${label} is not one screen: ${JSON.stringify(f)}`);
    };
  await p.evaluate(() => (location.hash = hr('pairs')));
  if (
    !(await p.waitForSelector('#view .pcard', {timeout: 20000}).then(
      () => true,
      () => false
    ))
  )
    return fails.push(`${at}: no game drawn`);
  const before = await rec(),
    unlockedBefore = await p.evaluate(() => unlocked().length);
  for (let g = 0; g < games; g++) {
    // (a new board each time: the page may still show the last game of the width before)
    await p.click('#view #pnew');
    await p.waitForTimeout(200);
    // The cards as drawn: the unit's name (the band, read from the text), its photo and the neutral alt and label.
    const D = await p.evaluate(() => {
      const names = new Map(unlocked().map(n => [unameT(n), n])),
        find = (n, src) => {
          const L = (gamePics(n, 'wide') || []).filter(x => src.includes(x.f));
          return L.sort((a, b) => b.f.length - a.f.length)[0] || null;
        },
        cards = [...document.querySelectorAll('#view .pcard')].map((e, i) => {
          const name = e.querySelector('.pfront b').textContent.split(' · ')[0],
            n = names.get(name) || null,
            im = e.querySelector('.pfront img');
          return {
            i,
            n,
            name,
            f: n && find(n, im.getAttribute('src')),
            alt: im.alt,
            label: e.getAttribute('aria-label'),
            hidden: getComputedStyle(e.querySelector('.pfront b')).opacity === '0'
          };
        });
      const by = {};
      cards.forEach(c => (by[c.name] = (by[c.name] || []).concat(c)));
      const bad = [];
      if (cards.length < 4 || cards.length % 2) bad.push(`${cards.length} cards`);
      // No unit with its own family or genus on the board, no photo on two cards.
      const ids = [...new Set(cards.map(c => c.n).filter(Boolean))],
        up = u => {
          const out = [];
          for (let x = (GX(u) || {}).parent, i = 0; x && i < 10; x = (GX(x) || {}).parent, i++) out.push(x);
          return out;
        };
      ids.forEach(a => ids.forEach(b => a !== b && up(a).includes(b) && bad.push(`${a} and its ${b} on one board`)));
      const fs = cards.map(c => c.f && c.f.f).filter(Boolean);
      if (new Set(fs).size !== fs.length) bad.push('one photo on two cards');
      Object.entries(by).forEach(([name, L]) => {
        if (L.length !== 2) bad.push(`${name}: ${L.length} cards`);
        if (!L[0].n) bad.push(`${name}: not an unlocked unit`);
        if (L.some(c => !c.f)) return bad.push(`${name}: a photo not found among the unit's`);
        if (L.some(c => !c.hidden)) bad.push(`${name}: named before the pair`);
        if (L.some(c => c.alt.includes(name) || c.label.includes(name))) bad.push(`${name}: a card says its unit before the pair`);
        const [a, b] = L.map(c => c.f),
          pic = gamePics(L[0].n, 'wide');
        if ((a.o || a.f) === (b.o || b.f)) bad.push(`${name}: one observation twice`);
        else if (a.f === b.f) bad.push(`${name}: one photo twice`);
        // Same species and phase, though a different species (or a juvenile beside an adult) was there for both first photos.
        else if (a.sp && b.sp && a.sp === b.sp && juvP(a) === juvP(b)) {
          const sp = x => pic.some(q => q.sp && x.sp && q.sp !== x.sp && (q.o || q.f) !== (x.o || x.f)),
            ph = x => pic.some(q => juvP(q) !== juvP(x) && (q.o || q.f) !== (x.o || x.f));
          if (sp(a) && sp(b)) bad.push(`${name}: one species twice, another was there`);
          else if (ph(a) && ph(b)) bad.push(`${name}: one phase twice, the other was there`);
        }
      });
      return {bad, units: Object.keys(by).length, idx: Object.values(by).map(L => L.map(c => c.i))};
    });
    D.bad.forEach(m => fails.push(`${at}, game ${g + 1}: ${m}`));
    if (D.units < 2 || D.bad.length) continue;
    await screen(`game ${g + 1} fresh`);
    // A wrong pair turns back; a right one is named, credited, told in one line with a report button.
    const [first, second] = D.idx;
    await p.click(`#view .pcard[data-i="${first[0]}"]`);
    await p.click(`#view .pcard[data-i="${second[0]}"]`);
    await p.waitForTimeout(1400);
    const turned = await p.evaluate(() => document.querySelectorAll('#view .pcard.up').length);
    if (turned) fails.push(`${at}, game ${g + 1}: a wrong pair stayed turned (${turned})`);
    await p.click(`#view .pcard[data-i="${first[0]}"]`);
    await p.click(`#view .pcard[data-i="${first[1]}"]`);
    await p.waitForTimeout(500); // (the name band fades in)
    const found = await p.evaluate(() => ({
      done: document.querySelectorAll('#view .pcard.done').length,
      said: (document.getElementById('pres') || {}).textContent || '',
      report: !!document.querySelector('#view #pres [data-rep]'),
      named: [...document.querySelectorAll('#view .pcard.done .pfront b')].every(b => getComputedStyle(b).opacity === '1')
    }));
    if (found.done !== 2 || !found.said.trim() || !found.named) fails.push(`${at}, game ${g + 1}: a right pair: ${JSON.stringify(found)}`);
    if (!found.report) fails.push(`${at}, game ${g + 1}: a found pair has no report button`);
    await screen(`game ${g + 1} with a pair found`);
    // The rest of the pairs: the last one ends the game.
    for (const L of D.idx.slice(1)) {
      await p.click(`#view .pcard[data-i="${L[0]}"]`);
      await p.click(`#view .pcard[data-i="${L[1]}"]`);
    }
    const end = await p.evaluate(() => ({
      done: document.querySelectorAll('#view .pcard.done').length,
      all: document.querySelectorAll('#view .pcard').length,
      ok: /All \d+ pairs/.test((document.getElementById('pres') || {}).textContent || '')
    }));
    if (end.done !== end.all || !end.ok) fails.push(`${at}, game ${g + 1}: the game did not end: ${JSON.stringify(end)}`);
    await screen(`game ${g + 1} at the end`);
  }
  if ((await rec()) !== before) fails.push(`${at}: playing it changed the record, log or answer count`);
  if ((await p.evaluate(() => unlocked().length)) !== unlockedBefore) fails.push(`${at}: playing it opened a unit`);
};
