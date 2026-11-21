// Life stages matched (proto/lifestages.js, the Lab) played in a page, for the smokes of the subjects that have a list of documented
// phases (fish.smoke.js): one function, so every such subject is held to the same checks (rule S1). Not a node --test file
// (tests/lifestages.test.js holds the drawing); the smoke serves the photos' host with a one-pixel picture.
//
//   await require('./lifestages.check.js')(page, 390, fails, 'fish', 6);
//
// Per round: four tiles, the first the stage shown (outlined, no button, its stage written on it), three buttons; the prompt names the
// two stages; before the answer nothing names a species and no source is shown; the four photos are four different observations of
// the unlocked families, the first of the stage shown, the three others of the stage to find and of three different species, one
// the first's, each species one the list documents for its stage; a tap on the wrong tile crosses it and ticks the right one, each
// tile then names its species and its stage; the sheet says the stage to find with its source, More the stage shown with its
// own; one screen (rule U2) fresh, after the answer and with More open; and the player's progress, answer log and answer
// count untouched, no unit opened. Pushes its failures into `fails`.
const TILE = '#view .lsq .fxt [data-c]';

module.exports = async function lifeStagesCheck(p, w, fails, tag = '', rounds = 6) {
  const at = `${w}px Life stages matched${tag ? ' ' + tag : ''}`,
    rec = () =>
      p.evaluate(() =>
        JSON.stringify([P, SYNC ? SYNC.log || null : null, store.get(LOG0, []), store.get(ANONQ, []), introMap(), answersSoFar()])
      ),
    fit = () =>
      p.evaluate(() => {
        const tab = document.querySelector('.sections'),
          tabTop = tab && getComputedStyle(tab).position === 'fixed' ? tab.getBoundingClientRect().top : innerHeight,
          aft = document.getElementById('after'),
          sheet = aft && getComputedStyle(aft).position === 'fixed' ? aft.getBoundingClientRect().top : tabTop,
          done = !!document.querySelector('#view .lsq.done');
        return {
          scroll: document.documentElement.scrollHeight - innerHeight,
          out: [...document.querySelectorAll('#view .lsq .fxt, #view #after, #view #next')]
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
  await p.evaluate(() => (location.hash = hr('lab-lifestages')));
  if (!(await open())) return fails.push(`${at}: no question drawn`);
  const before = await rec(),
    unlockedBefore = await p.evaluate(() => unlocked().length),
    phases = await p.evaluate(() => UNITS[SUBJ.id].phases().then(j => j.species));
  for (let k = 0; k < rounds; k++) {
    if (!(await open())) {
      fails.push(`${at}, round ${k + 1}: the tiles never opened`);
      break;
    }
    const pre = await p.evaluate(
      ([T, phases]) => {
        const fams = unlocked().filter(n => !rankOf(n)),
          all = fams.flatMap(n => SUBJ.views.flatMap(([v]) => gamePics(n, v).map(x => ({x, n})))),
          of = f => (all.find(o => o.x.f === f) || {}).x || null,
          tiles = [...document.querySelectorAll('#view .lsq .fxt')],
          photos = tiles.map(t => of(t.querySelector('img').dataset.f)),
          prompt = (document.querySelector('#view .lsq .prompt') || {}).textContent || '',
          m = /^Tap the (female|male) of the same species as the (juvenile|female) shown first\.$/.exec(prompt),
          ref = tiles[0];
        return {
          n: tiles.length,
          buttons: document.querySelectorAll(T).length,
          refButton: !!ref.querySelector('button'),
          refClass: ref.classList.contains('fref'),
          refCap: (ref.querySelector('figcaption') || {}).textContent || '',
          capsOther: tiles.slice(1).filter(t => t.querySelector('figcaption')).length,
          named: !!document.querySelector('#view .lsq .psrc, #view .lsq .fb, #view .lsq .fok, #view .lsq .fko'),
          prompt,
          tgt: m && m[1],
          rf: m && m[2],
          known: photos.every(Boolean),
          fromFamilies: photos.every(Boolean),
          ph: photos.map(x => x && x.ph),
          sp: photos.map(x => x && x.sp),
          obs: new Set(photos.map(x => x && (x.o || x.f))).size,
          documented: photos.map(
            (x, i) =>
              !!x &&
              !!phases[x.sp] &&
              (i === 0 ? m && m[2] : m && m[1]) &&
              ((i === 0 ? m[2] : m[1]) === 'juvenile' ? !!phases[x.sp].juv : !!(phases[x.sp].sex || phases[x.sp].ip_tp))
          )
        };
      },
      [TILE, phases]
    );
    if (pre.n !== 4 || pre.buttons !== 3 || pre.refButton || !pre.refClass || pre.named || pre.capsOther || !pre.tgt)
      fails.push(`${at}, round ${k + 1} before the tap: ${JSON.stringify(pre)}`);
    if (pre.refCap.trim().toLowerCase() !== pre.rf)
      fails.push(`${at}, round ${k + 1}: the stage shown is not written on it ${JSON.stringify(pre)}`);
    if (!pre.known) fails.push(`${at}, round ${k + 1}: a photo of no unlocked family ${JSON.stringify(pre.sp)}`);
    if (pre.ph[0] !== pre.rf || pre.ph.slice(1).some(x => x !== pre.tgt))
      fails.push(`${at}, round ${k + 1}: the stages are not the prompt's ${JSON.stringify(pre.ph)} for ${pre.prompt}`);
    if (new Set(pre.sp.slice(1)).size !== 3 || pre.sp.slice(1).filter(s => s === pre.sp[0]).length !== 1)
      fails.push(`${at}, round ${k + 1}: not three species with one the first's ${JSON.stringify(pre.sp)}`);
    if (pre.obs !== 4) fails.push(`${at}, round ${k + 1}: four photos are not four observations`);
    if (pre.documented.some(x => !x))
      fails.push(`${at}, round ${k + 1}: a stage the list does not document ${JSON.stringify(pre.documented)}`);
    await screen('fresh', k);
    const right = pre.sp.slice(1).findIndex(s => s === pre.sp[0]),
      pick = k % 2 ? (right + 1) % 3 : right;
    // by the keyboard in round 3 (the choice's number), else a tap
    if (k === 2) await p.keyboard.press(String(pick + 1));
    else await p.click(`${TILE}[data-c="${pick}"]`);
    const end = await p.evaluate(() => ({
      done: !!document.querySelector('#view .lsq.done'),
      ok: document.querySelectorAll('#view .lsq .fok').length,
      ko: document.querySelectorAll('#view .lsq .fko').length,
      caps: [...document.querySelectorAll('#view .lsq .fxt figcaption')].map(c => c.textContent.replace(/[✓✗]/g, '').trim()),
      h3: (document.querySelector('#view #after h3') || {}).textContent || '',
      line: (document.querySelector('#view #after .fbline') || {}).textContent || '',
      more: !!document.getElementById('fbmore'),
      enlarge: document.querySelectorAll('#view .lsq .fxt [data-fz]').length,
      src: !!document.querySelector('#view .lsq .psrc')
    }));
    const good = pick === right;
    if (
      !end.done ||
      end.ok !== 1 ||
      end.ko !== (good ? 0 : 1) ||
      end.caps.length !== 4 ||
      end.caps.some((c, i) => !c.toLowerCase().endsWith((i ? pre.tgt : pre.rf) + '')) ||
      !(good ? /^✓ Yes/ : /^✗ No/).test(end.h3) ||
      !end.more ||
      end.enlarge !== 4 ||
      !end.line.toLowerCase().includes(pre.tgt) ||
      !/\(.+\)/.test(end.line)
    )
      fails.push(`${at}, round ${k + 1} answered: ${JSON.stringify(end)}`);
    await screen('answered', k);
    await p.click('#view #fbmbtn');
    await screen('with More open', k, ['after']);
    await p.click('#view #next');
    if (k + 1 < rounds && !(await open())) fails.push(`${at}: Next drew no new question`);
  }
  if ((await rec()) !== before) fails.push(`${at}: playing it changed the player's record, log or answer count`);
  if ((await p.evaluate(() => unlocked().length)) !== unlockedBefore) fails.push(`${at}: playing it opened a unit`);
};
