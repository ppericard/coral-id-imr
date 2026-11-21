// Down the tree (proto/downtree.js, the Lab) played in a page, for the smokes of the subjects that have a tree (fish.smoke.js): one
// function, so every subject is held to the same checks (rule S1). Not a node --test file (tests/downtree.test.js holds the
// drawing); the smoke serves the photos' host with a one-pixel picture.
//
//   await require('./downtree.check.js')(page, 390, fails, 'fish', 6);
//
// The page must have unlocked units at two ranks or more (the smoke's setup). Per round: one photo, 2 or 3 steps (the units
// from the broadest down, each of them unlocked, each one the child of the step above: `data-s` on the step's chip), the names
// of a step of one rank, 3 or 4, no two of one label, the step's unit among them; nothing named before its step is answered (no
// caption, no source, no name in a chip); a right step ticks its chip and shows the next step's names; a wrong one crosses it
// with the right name and the walk goes on; the last step ends the round on the quiz's own short sheet ("N of M steps right", a
// caption of the steps under the photo, More with the credits); one screen (rule U2) fresh, after a step and at the end; and
// the player's progress, answer log and answer count untouched, no unit opened. Pushes its failures into `fails`.
const NAME = '#view .dtq .dtans [data-n]';

module.exports = async function downTreeCheck(p, w, fails, tag = '', rounds = 6) {
  const at = `${w}px Down the tree${tag ? ' ' + tag : ''}`,
    rec = () =>
      p.evaluate(() =>
        JSON.stringify([P, SYNC ? SYNC.log || null : null, store.get(LOG0, []), store.get(ANONQ, []), introMap(), answersSoFar()])
      ),
    fit = () =>
      p.evaluate(() => {
        const tab = document.querySelector('.sections'),
          tabTop = tab && getComputedStyle(tab).position === 'fixed' ? tab.getBoundingClientRect().top : innerHeight,
          aft = document.getElementById('after'),
          sheet = aft && getComputedStyle(aft).position === 'fixed' ? aft.getBoundingClientRect().top : tabTop;
        return {
          scroll: document.documentElement.scrollHeight - innerHeight,
          out: [...document.querySelectorAll('#view .dtq .qph, #view .dtq .dtans button, #view .dtq .dtst, #view #after, #view #next')]
            .filter(e => e.offsetParent !== null || getComputedStyle(e).position === 'fixed')
            .map(e => [e.id || e.className || e.tagName, e.getBoundingClientRect()])
            .filter(([n, r]) => r.top < -1 || r.bottom > tabTop + 1 || (/qph/.test(n) && r.bottom > sheet + 1))
            .map(([n, r]) => `${n} ${Math.round(r.top)}..${Math.round(r.bottom)} of ${Math.round(Math.min(tabTop, sheet))}`)
        };
      }),
    screen = async (label, k, allow = []) => {
      const f = await fit();
      f.out = f.out.filter(x => !allow.some(a => x.startsWith(a)));
      if (f.scroll > 1 || f.out.length) fails.push(`${at}, round ${k + 1} ${label} is not one screen: ${JSON.stringify(f)}`);
    },
    open = () =>
      p.waitForSelector(`${NAME}:not([disabled])`, {timeout: 15000}).then(
        () => true,
        () => false
      );
  await p.evaluate(() => (location.hash = hr('lab-downtree')));
  if (!(await open())) return fails.push(`${at}: no question drawn`);
  const before = await rec(),
    unlockedBefore = await p.evaluate(() => unlocked().length);
  let partly = 0;
  for (let k = 0; k < rounds; k++) {
    if (!(await open())) {
      fails.push(`${at}, round ${k + 1}: no names to pick`);
      break;
    }
    const pre = await p.evaluate(() => {
      const chain = [...document.querySelectorAll('#view .dtq .dtsteps li')].map(li => li.dataset.s),
        lisText = [...document.querySelectorAll('#view .dtq .dtsteps li span')].map(s => s.textContent.trim()).join(''),
        play = [...pool(), ...sciNow(), ...sciSpAll()],
        open = new Set(unlocked(play));
      return {
        chain,
        n: chain.length,
        // the broadest down, each one under the one above, each unlocked (rule L4)
        lineage: chain.every((u, i) => (i ? GX(u).parent === chain[i - 1] : true)),
        unlockedAll: chain.every(u => open.has(u)),
        // the walk starts at one of the subject's own units (a sea slug genus), never at a record that is structure only (its family)
        top: pool().includes(chain[0]),
        ranks: chain.map(u => GX(u).rank || ''),
        distinctRanks: new Set(chain.map(u => GX(u).rank || '')).size === chain.length,
        empty: lisText === '',
        named: !!document.querySelector('#view .dtq figcaption, #view .dtq .psrc, #view .dtq .fb'),
        names: [...document.querySelectorAll('#view .dtq .dtans [data-n]')].map(b => b.dataset.n),
        prompt: (document.querySelector('#view .dtq .prompt') || {}).textContent,
        photos: document.querySelectorAll('#view .dtq .qph img').length
      };
    });
    if (pre.photos !== 1 || pre.n < 2 || pre.n > 3 || !pre.empty || pre.named || !/^Which .+ is it\?$/.test(pre.prompt || ''))
      fails.push(`${at}, round ${k + 1} before the first tap: ${JSON.stringify(pre)}`);
    if (!pre.lineage) fails.push(`${at}, round ${k + 1}: a step is not under the step above ${JSON.stringify(pre.chain)}`);
    if (!pre.top) fails.push(`${at}, round ${k + 1}: the walk starts at a unit that is not one of the game's ${JSON.stringify(pre.chain)}`);
    if (!pre.unlockedAll) fails.push(`${at}, round ${k + 1}: a step on a unit not unlocked ${JSON.stringify(pre.chain)}`);
    if (!pre.distinctRanks) fails.push(`${at}, round ${k + 1}: two steps of one rank ${JSON.stringify(pre.ranks)}`);
    await screen('fresh', k);
    // The photo keeps its height from the first step to the last (the visual check of #1387: on a phone it shrank from ~460 to
    // ~330 px as the chips filled in and the verdict appeared, the names moving under the thumb).
    const photoH = () => p.evaluate(() => Math.round(document.querySelector('#view .dtq .qstage').getBoundingClientRect().height)),
      h0 = await photoH();
    // Which step is missed: none in round 1, the first in round 2, the last in round 3, then by turns.
    const miss = k === 0 ? -1 : k % 3 === 1 ? 0 : k % 3 === 2 ? pre.n - 1 : -1;
    let right = 0;
    for (let i = 0; i < pre.n; i++) {
      const cur = await p.evaluate(
        ([N, i]) => {
          const names = [...document.querySelectorAll(N)].map(b => b.dataset.n),
            u = document.querySelectorAll('#view .dtq .dtsteps li')[i].dataset.s,
            rk = x => (GX(x).rank || '') + '|' + (GX(x).kind || '');
          return {
            u,
            names,
            has: names.includes(u),
            n: names.length,
            sameRank: names.every(x => rk(x) === rk(u)),
            labels: names.every(a => names.every(b => a === b || !choiceNames(a, b))),
            now: document.querySelectorAll('#view .dtq .dtsteps li[aria-current="step"]').length === 1,
            prompt: (document.querySelector('#view .dtq .prompt') || {}).textContent
          };
        },
        [NAME, i]
      );
      if (!cur.has || cur.n < 3 || cur.n > 4 || !cur.sameRank || !cur.labels || !cur.now)
        fails.push(`${at}, round ${k + 1}, step ${i + 1}: ${JSON.stringify(cur)}`);
      if (i === 1 && JSON.stringify(cur.names) === JSON.stringify(pre.names)) fails.push(`${at}, round ${k + 1}: the names did not change`);
      const wrong = cur.names.find(x => x !== cur.u),
        say = i === miss ? wrong : cur.u;
      // by the keyboard in round 4 (the number of the name), else a tap
      if (k === 3) await p.keyboard.press(String(cur.names.indexOf(say) + 1));
      else await p.click(`${NAME}[data-n="${say}"]`);
      if (i !== miss) right++;
      if (i + 1 < pre.n) {
        const chip = await p.evaluate(i => {
          const li = document.querySelectorAll('#view .dtq .dtsteps li')[i];
          return {
            cls: li.className,
            text: li.textContent,
            label: li.getAttribute('aria-label') || '',
            verdict: !!document.querySelector('#view .dtq .dtst h3')
          };
        }, i);
        const good = i !== miss;
        if (
          chip.cls !== (good ? 'ok' : 'ko') ||
          !chip.text.includes(good ? '✓' : '✗') ||
          !chip.label.includes(good ? 'right' : 'missed') ||
          !chip.verdict
        )
          fails.push(`${at}, round ${k + 1}, step ${i + 1} answered: ${JSON.stringify(chip)}`);
        if (!(await open())) fails.push(`${at}, round ${k + 1}: no names for step ${i + 2}`);
        await screen(`after step ${i + 1}`, k);
        const h = await photoH();
        if (Math.abs(h - h0) > 1) fails.push(`${at}, round ${k + 1}: the photo went from ${h0} to ${h} px high at step ${i + 2}`);
      }
    }
    await p.waitForSelector('#view .dtq.done #next', {timeout: 5000}).catch(() => fails.push(`${at}, round ${k + 1}: no end sheet`));
    const end = await p.evaluate(() => ({
      h3: (document.querySelector('#view #after h3') || {}).textContent || '',
      cls: (document.querySelector('#view #after h3') || {}).className || '',
      cap: ((document.querySelector('#view .dtq .qph figcaption') || {}).textContent || '').trim(),
      more: !!document.getElementById('fbmore'),
      src: !!document.querySelector('#view .dtq .psrc'),
      names: [...document.querySelectorAll('#view .dtq .dtsteps li')].map(li => li.dataset.s).map(u => GX(u).name || u)
    }));
    const all = right === pre.n,
      word = all ? /^✓ Yes,/ : right ? /^Partly,/ : /^✗ No,/;
    if (!word.test(end.h3) || !end.h3.includes(`${right} of ${pre.n} steps right`) || !end.more)
      fails.push(`${at}, round ${k + 1} at the end: ${JSON.stringify({...end, right, n: pre.n})}`);
    if (!all && right && !/\bmid\b/.test(end.cls)) fails.push(`${at}, round ${k + 1}: a partial credit has no neutral heading ${end.cls}`);
    if (right && !all) partly++;
    if (end.names.some(n => !end.cap.includes(n)) || !end.cap.includes('›'))
      fails.push(`${at}, round ${k + 1}: the caption under the photo does not name the steps ${JSON.stringify(end)}`);
    await screen('at the end', k);
    await p.click('#view #fbmbtn');
    await screen('with More open', k, ['after']);
    await p.click('#view #next');
    if (k + 1 < rounds && !(await open())) fails.push(`${at}: Next drew no new question`);
  }
  if (rounds > 3 && !partly) fails.push(`${at}: no round ended on a partial credit`);
  if ((await rec()) !== before) fails.push(`${at}: playing it changed the player's record, log or answer count`);
  if ((await p.evaluate(() => unlocked().length)) !== unlockedBefore) fails.push(`${at}: playing it opened a unit`);
};
