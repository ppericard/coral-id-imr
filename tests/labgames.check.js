// The Lab's one-unit games and the look-alike web (proto/type.js, proto/reveal.js, proto/web.js) played in a page, for the
// smokes of every subject (pages.smoke.js on the corals, fish.smoke.js, seaslug.smoke.js): one function, so the subjects are
// held to the same checks (rule S1; Q437, Pierre, 2026-11-19). Not a node --test file (tests/labgames.test.js holds the
// drawing); the smokes serve the photos' host with a one-pixel picture.
//
//   await require('./labgames.check.js')(page, 390, fails, 'fish', 4);
//
// Type the genus (the unit word is the subject's): per round the photo is of a unit the player has unlocked, the form's label is
// the unit word, the units' ids are never shown as names; a typed exact name is right, "I don't know" says the unit's name, a
// close typo asks the retype ("So close!") and the retype is right, another unit's name is a miss; one screen fresh, in the
// retype, answered and after the answer. Blur reveal: the photo is of an unlocked unit, four choices of one rank with four
// different labels, the right one among them, a wrong tap and a right one both say the unit's name; one screen fresh and
// answered. Look-alike web: a node for every unit of the subject's declared pairs (app.js UNITS pairs), named by its own
// name, one line for each pair, a tap opens its panel; a reference page, so no one-screen rule (it must not run sideways). All of them leave the player's
// progress, answer log and answer count untouched. Pushes its failures into `fails`.
const ID = /(^|[^\w])(?:[tf]\d\d|[fgs]:[A-Za-z])/; // a unit's id shown as its name (fish ids: t01, f:Damselfishes, g:Chromis)

module.exports = async function labGamesCheck(p, w, fails, tag = '', rounds = 4) {
  const at = g => `${w}px ${g}${tag ? ' ' + tag : ''}`,
    rec = () =>
      p.evaluate(() =>
        JSON.stringify([P, SYNC ? SYNC.log || null : null, store.get(LOG0, []), store.get(ANONQ, []), introMap(), answersSoFar()])
      ),
    // What sticks out of one screen: the page itself, the stage, the answers and the buttons above the tab bar.
    fit = sel =>
      p.evaluate(sel => {
        const tab = document.querySelector('.sections'),
          tabTop = tab && getComputedStyle(tab).position === 'fixed' ? tab.getBoundingClientRect().top : innerHeight;
        return {
          scroll: document.documentElement.scrollHeight - innerHeight,
          out: [...document.querySelectorAll(sel)]
            .filter(e => e.offsetParent !== null)
            .map(e => [e.id || e.className || e.tagName, e.getBoundingClientRect()])
            .filter(([, r]) => r.top < -1 || r.bottom > tabTop + 1)
            .map(([n, r]) => `${n} ${Math.round(r.top)}..${Math.round(r.bottom)} of ${Math.round(tabTop)}`)
        };
      }, sel),
    screen = async (g, label, k, sel) => {
      const f = await fit(sel);
      if (f.scroll > 1 || f.out.length) fails.push(`${at(g)}, round ${k + 1} ${label} is not one screen: ${JSON.stringify(f)}`);
    },
    // The unit a game photo shows, from its address (the unit whose game photos hold that file), null when none does.
    unitOf = src =>
      p.evaluate(src => {
        const x = photoFileOf(src);
        return x ? pool().find(n => ['wide', 'medium', 'macro'].some(v => gamePics(n, v).some(q => q.f === x.f))) || null : null;
      }, src),
    names = () => p.evaluate(() => unlocked().map(n => [n, unameT(n), rankOf(n)])),
    text = () => p.evaluate(() => document.getElementById('view').innerText),
    open = (g, sel) =>
      p
        .evaluate(g => (location.hash = hr('lab-' + g)), g)
        .then(() => p.waitForSelector(sel, {timeout: 15000}))
        .then(
          () => true,
          () => false
        );
  const before = await rec(),
    unit = await p.evaluate(() => [SUBJ.one, SUBJ.what]),
    met = await names(),
    label = unit[0][0].toUpperCase() + unit[0].slice(1);

  // ---- Type the unit
  const TY = '#view .tystage img';
  if (!(await open('type', TY))) fails.push(`${at('Type')}: no photo drawn`);
  else {
    const scenarios = ['exact', 'idk', 'close', 'other', 'exact', 'exact'];
    for (let k = 0; k < rounds; k++) {
      const how = scenarios[k % scenarios.length];
      await p.waitForSelector(`${TY}, #view .tyform input:not([disabled])`, {timeout: 8000}).catch(() => {});
      const src = await p.evaluate(s => document.querySelector(s).getAttribute('src'), TY),
        t = await unitOf(src);
      if (!t) {
        fails.push(`${at('Type')}, round ${k + 1}: the photo belongs to no unit of the game (${src})`);
        break;
      }
      const row = met.find(m => m[0] === t),
        T = {tag: at('Type'), k: k + 1};
      if (!row) fails.push(`${T.tag}, round ${T.k}: ${t} is not unlocked`);
      const lab = await p.evaluate(() => document.querySelector('#view .tyform label').textContent);
      if (lab !== label) fails.push(`${T.tag}, round ${T.k}: the form says "${lab}", not "${label}"`);
      if (ID.test(await text())) fails.push(`${T.tag}, round ${T.k}: an id is shown before the answer`);
      await screen('Type', 'fresh', k, '#view .tystage, #view .tyform, #view .chips');
      const nm = row ? row[1] : t,
        other = (met.find(m => m[0] !== t && m[2] === (row || [])[2] && m[1] !== nm) || [])[1] || 'Zzzz',
        // a close typo: the last two letters swapped (one letter off in the tolerance's own count)
        typo = nm.length > 3 ? nm.slice(0, -2) + nm.slice(-1) + nm.slice(-2, -1) : nm;
      if (how === 'idk') await p.click('#view .tyform [data-idk]');
      else {
        await p.fill('#view .tyform input', how === 'other' ? other : how === 'close' ? typo : nm);
        await p.press('#view .tyform input', 'Enter');
      }
      if (how === 'close') {
        // The retype is asked before any result: "So close!", no verdict yet, the same photo, one screen.
        await p.waitForSelector('#view .tyform.retry', {timeout: 5000}).catch(() => {});
        const st = await p.evaluate(() => ({
          retry: !!document.querySelector('#view .tyform.retry'),
          res: !!document.querySelector('#tyres p')
        }));
        if (!st.retry || st.res) fails.push(`${T.tag}, round ${T.k}: a close typo did not ask the retype first: ${JSON.stringify(st)}`);
        await screen('Type', 'retype', k, '#view .tystage, #view .tyform, #view .chips');
        await p.fill('#view .tyform input', nm);
        await p.press('#view .tyform input', 'Enter');
      }
      await p.waitForSelector('#view #tyres p', {timeout: 5000}).catch(() => {});
      const res = await p.evaluate(() => ({
        cls: (document.querySelector('#tyres p') || {}).className || '',
        txt: (document.getElementById('tyres') || {}).textContent || '',
        tally: (document.querySelector('.tyscore') || {}).textContent || ''
      }));
      const want = how === 'other' ? 'ko' : how === 'idk' ? 'idk' : 'ok';
      if (res.cls !== want)
        fails.push(`${T.tag}, round ${T.k} (${how}): the verdict is "${res.cls}", expected "${want}": ${res.txt.slice(0, 120)}`);
      if (how !== 'exact' || want !== 'ok') {
        if (!res.txt.includes(nm)) fails.push(`${T.tag}, round ${T.k} (${how}): the answer does not name ${nm}: ${res.txt.slice(0, 120)}`);
      }
      if (ID.test(res.txt)) fails.push(`${T.tag}, round ${T.k} (${how}): an id in the result: ${res.txt.slice(0, 120)}`);
      await screen('Type', 'answered', k, '#view .tystage, #view #tyres, #view #tynext, #view .chips');
      if (k < rounds - 1) await p.click('#view #tynext');
    }
  }

  // ---- Blur reveal
  const RV = '#view #rvimg';
  if (!(await open('reveal', RV))) fails.push(`${at('Blur reveal')}: no photo drawn`);
  else {
    for (let k = 0; k < rounds; k++) {
      await p.waitForSelector(`${RV}, #view .choice`, {timeout: 8000}).catch(() => {});
      const src = await p.evaluate(s => document.querySelector(s).getAttribute('src'), RV),
        t = await unitOf(src),
        ch = await p.evaluate(() => [...document.querySelectorAll('#view .choice')].map(b => [b.dataset.c, b.textContent]));
      const T = `${at('Blur reveal')}, round ${k + 1}`;
      if (!t) {
        fails.push(`${T}: the photo belongs to no unit of the game (${src})`);
        break;
      }
      if (!met.some(m => m[0] === t)) fails.push(`${T}: ${t} is not unlocked`);
      if (!ch.some(c => c[0] === t)) fails.push(`${T}: the right unit is not among the choices ${JSON.stringify(ch)}`);
      if (new Set(ch.map(c => c[1].toLowerCase().replace(/[^a-z]/g, ''))).size !== ch.length)
        fails.push(`${T}: two choices of one label ${JSON.stringify(ch)}`);
      const ranks = await p.evaluate(
        L => [...new Set(L.map(n => rankOf(n)))],
        ch.map(c => c[0])
      );
      if (ranks.length !== 1) fails.push(`${T}: choices of several ranks ${JSON.stringify(ranks)}`);
      if (ch.length < 2) fails.push(`${T}: ${ch.length} choice`);
      if (ID.test(ch.map(c => c[1]).join(' '))) fails.push(`${T}: an id as a choice ${JSON.stringify(ch)}`);
      await screen('Blur reveal', 'fresh', k, '#view .rvstage, #view .choice, #view .chips');
      // a wrong tap on odd rounds, the right one on even
      const pick = k % 2 ? (ch.find(c => c[0] !== t) || ch[0])[0] : t;
      await p.click(`#view .choice[data-c="${pick.replace(/"/g, '\\"')}"]`);
      await p.waitForSelector('#view #rvres #rvnext', {timeout: 5000}).catch(() => {});
      const res = await p.evaluate(() => (document.getElementById('rvres') || {}).textContent || '');
      const nm = (met.find(m => m[0] === t) || [0, t])[1];
      if (!res.includes(nm)) fails.push(`${T}: the result does not name ${nm}: ${res.slice(0, 120)}`);
      if (ID.test(res)) fails.push(`${T}: an id in the result: ${res.slice(0, 120)}`);
      await screen('Blur reveal', 'answered', k, '#view .rvstage, #view .choice, #view #rvres, #view #rvnext, #view .chips');
      if (k < rounds - 1) await p.click('#view #rvnext');
    }
  }

  // ---- Look-alike web
  if (!(await open('web', '#view .wnode'))) fails.push(`${at('Look-alike web')}: no node drawn`);
  else {
    const T = at('Look-alike web');
    const info = await p.evaluate(() => {
      const slate = new Set(slateGenera()),
        pairs = UNITS[SUBJ.id].pairs().filter(([a, b]) => a !== b && slate.has(a) && slate.has(b) && GX(a) && GX(b)),
        ends = [...new Set(pairs.flat())],
        keys = new Set(pairs.map(([a, b]) => [a, b].sort().join('|')));
      return {
        nodes: [...document.querySelectorAll('#view .wnode')].map(g => [
          g.dataset.n,
          g.querySelector('text').textContent.replace(' ★', '')
        ]),
        lines: document.querySelectorAll('#view .wedges line').length,
        ends,
        pairs: keys.size,
        names: Object.fromEntries(ends.map(n => [n, unameT(n)]))
      };
    });
    if (info.nodes.length !== info.ends.length || info.nodes.length < 2)
      fails.push(`${T}: ${info.nodes.length} nodes for ${info.ends.length} units in pairs`);
    if (info.lines !== info.pairs) fails.push(`${T}: ${info.lines} lines for ${info.pairs} pairs`);
    if (info.nodes.some(([n, t]) => t !== info.names[n]))
      fails.push(
        `${T}: a node not named by its own name: ${JSON.stringify(info.nodes.filter(([n, t]) => t !== info.names[n]).slice(0, 3))}`
      );
    if (ID.test(info.nodes.map(x => x[1]).join(' '))) fails.push(`${T}: an id as a node name`);
    // The web is a reference page (as the mind map), not a game: its graph and its legend may be taller than the window, so
    // rule U2 is not asked of it; it must not run sideways, and its graph must start in view.
    const wide = async label => {
      const o = await p.evaluate(() => ({
        side: document.documentElement.scrollWidth - innerWidth,
        top: document.querySelector('#view .webwrap').getBoundingClientRect().top,
        h: innerHeight
      }));
      if (o.side > 1 || o.top > o.h - 120)
        fails.push(`${T}, ${label}: the page runs sideways or the graph starts out of view: ${JSON.stringify(o)}`);
    };
    await wide('fresh');
    await p.evaluate(() =>
      document.querySelector('#view .wnode').dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}))
    );
    await p.waitForSelector('#view #webside h3', {timeout: 3000}).catch(() => {});
    const side = await p.evaluate(() => ({
      h: (document.querySelector('#webside h3') || {}).textContent || '',
      near: document.querySelectorAll('#webside .mapthumbs a').length,
      txt: (document.getElementById('webside') || {}).textContent || ''
    }));
    if (!side.h || side.near < 1) fails.push(`${T}: a tapped node showed no panel: ${JSON.stringify(side)}`);
    if (ID.test(side.txt)) fails.push(`${T}: an id in the panel: ${side.txt.slice(0, 120)}`);
    await wide('with a node selected');
  }
  const afterAll = await rec();
  if (afterAll !== before) fails.push(`${at('Type, Blur reveal and web')}: the progress, the log or the answer count changed`);
};
