// Type the genus (Pierre, 2026-11-03): a photo, and the player types the genus instead of picking 1 of 4 (recall, not
// recognition: what an RA does in front of a colony). Prototype for the free-text questions the quiz will slip in more
// and more as a player's level rises (docs/ROADMAP.md "Free-text answers").
// What Pierre agreed: light spelling tolerance (1 letter on a short name, 2 on a long one), old names accepted ("formerly
// X" in the genus's own lines), no suggestions while typing (that would turn it back into a pick from a list), the phone's
// autocorrect and capitals off, an "I don't know" button (a miss), the right spelling shown after the answer. A word
// that is no game genus, even with the tolerance, is not counted: the player is asked to check the spelling.
const TYPE = {
  // Edits allowed: one for a name of up to 6 letters, two beyond (Porites, Pocillopora).
  tol: n => (n <= 6 ? 1 : 2)
};
// Optimal string alignment distance (Levenshtein + a swap of two neighbouring letters, the commonest typo).
function typeDist(a, b) {
  const d = Array.from({length: a.length + 1}, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  return d[a.length][b.length];
}
const typeNorm = s =>
  String(s || '')
    .trim()
    .split(/\s+/)[0] // "Acropora sp." or a species: the genus is the first word
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z]/g, '');
// Every name a player may type, current genera and the old names of their own "formerly X" lines (an old name that is
// itself a game genus is left out: Duncanopsammia peltata was "formerly Turbinaria peltata", Turbinaria is still valid).
// Every genus the app knows counts, the slate's and the extra ones (Millepora, the bonus genera: DATA.x, GX).
function typeNames() {
  const cur = [...Object.keys(DATA.gen), ...Object.keys((DATA.x || {}).gen || {})],
    out = cur.map(n => ({k: typeNorm(n), g: n, old: ''}));
  cur.forEach(n => {
    const g = GX(n),
      txt = [...(g.crit || []), ...(g.imr || [])].join(' ');
    for (const m of txt.matchAll(/formerly ((?:[A-Z][a-z]+)(?:\s*\/\s*[A-Z][a-z]+)*)/g))
      m[1]
        .split('/')
        .map(x => x.trim())
        .forEach(o => {
          if (!GX(o) && !out.some(x => x.k === typeNorm(o))) out.push({k: typeNorm(o), g: n, old: o});
        });
  });
  return out;
}
// What the typed text names: {g, old, exact} for one genus within the tolerance, {near: [genera]} when two are as
// close (asked to check the spelling), null when nothing is close.
function typeMatch(text) {
  const t = typeNorm(text);
  if (t.length < 3) return null;
  const all = typeNames()
    .map(x => ({...x, d: typeDist(t, x.k)}))
    .filter(x => x.d <= TYPE.tol(x.k.length))
    .sort((a, b) => a.d - b.d);
  if (!all.length) return null;
  const best = all.filter(x => x.d === all[0].d),
    gs = [...new Set(best.map(x => x.g))];
  if (gs.length > 1) return {near: gs};
  return {g: best[0].g, old: best[0].old, exact: best[0].d === 0};
}

LAB.add({
  id: 'type',
  icon: '⌨',
  title: 'Type the genus',
  blurb: 'Name the coral by typing its genus, with no choices to pick from: proves you recognise it, not just tell 4 apart.',
  lede: 'Type the genus and press Enter. Small typos and old names are accepted; no suggestions while you type.',
  render(root) {
    const score = {ok: 0, n: 0, streak: 0},
      scoreLine = () => `${score.ok}/${score.n} right · streak ${score.streak}`;
    let view = 'any';
    const chips = () =>
      `<div class="chips">${[
        ['any', 'Any view'],
        ['wide', 'Colony'],
        ['medium', 'Close-up'],
        ['macro', 'Corallites']
      ]
        .map(([v, t]) => `<button class="chip" type="button" data-v="${v}" aria-pressed="${v === view}">${t}</button>`)
        .join('')}</div>`;
    root.innerHTML = '<div id="tybody"></div>';
    const body = root.querySelector('#tybody');
    const round = () => {
      const pool = (typeof slateGenera === 'function' ? slateGenera() : labNames()).filter(n => GX(n)), // Millepora too (Codex review #379)
        t = pick(pool),
        v = view === 'any' ? pick(['wide', 'medium', 'macro']) : view,
        // Only photos the games may teach from (app.js gamePhotoOk: Research Grade for the extra genera), in the view
        // asked for, else in any view (Codex review #379: no fallback around the rule).
        ok = w => gamePics(t, w).filter(x => gamePhotoOk(t, x)),
        L = ok(v).length ? ok(v) : ['wide', 'medium', 'macro'].flatMap(ok),
        p = pick(L);
      if (!p) return round(); // a genus with no eligible photo at all: draw another
      body.innerHTML = `<div class="rvlayout tylayout"><div class="rvstage tystage"><img src="${img(p, fit(Math.min(innerWidth, 800)))}" alt="Coral to identify"></div>
        <div class="gside">
          <form class="tyform" autocomplete="off">
            <label for="tyin">Genus</label>
            <input id="tyin" name="genus" type="text" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" enterkeyhint="done" placeholder="Type the genus">
            <div class="tybtns"><button type="submit" class="next">Check</button><button type="button" class="chip" id="tyidk">I don't know</button></div>
          </form>
          <p class="tymsg" aria-live="polite"></p><div id="tyres"></div>
          <p class="note tyscore">${scoreLine()}</p>${chips()}</div></div>`;
      const form = body.querySelector('.tyform'),
        inp = body.querySelector('#tyin'),
        msg = body.querySelector('.tymsg');
      let done = false;
      const finish = (ok, said) => {
        done = true;
        score.n++;
        score.ok += ok ? 1 : 0;
        score.streak = ok ? score.streak + 1 : 0;
        body.querySelector('.tyscore').textContent = scoreLine(); // the answer just counted (Codex review #379)
        inp.disabled = true;
        form.querySelectorAll('button').forEach(b => (b.disabled = true));
        inp.blur();
        // The photo's source pill, only now: before the answer it would give the genus away (as Blur reveal).
        const im = body.querySelector('.tystage img');
        if (im && typeof photoSrc === 'function') im.insertAdjacentHTML('afterend', photoSrc(p));
        const how =
          said == null
            ? `It was <i>${esc(t)}</i>.`
            : ok
              ? said.exact
                ? `<i>${esc(t)}</i>.`
                : said.old
                  ? `<i>${esc(t)}</i> (you wrote the old name, ${esc(said.old)}).`
                  : `<i>${esc(t)}</i> (you wrote “${esc(inp.value.trim())}”).`
              : `It was <i>${esc(t)}</i>, not <i>${esc(said.g)}</i>.`;
        msg.textContent = '';
        body.querySelector('#tyres').innerHTML =
          `<p class="${ok ? 'ok' : 'ko'}"><b>${ok ? 'Right' : said == null ? 'No worries' : 'Missed'}</b>: ${how} <a href="${genLink(t)}">Genus sheet</a></p>
          <p>${esc(tipsText(GX(t)))}</p><p class="credit">${credit(p)}</p>${typeof repBtn === 'function' ? repBtn({g: t, a: said ? said.g : '', ph: [p.f], m: 'type'}) : ''}<button type="button" class="next" id="tynext">Next</button>`;
        const nx = body.querySelector('#tynext');
        nx.onclick = round;
        nx.focus({preventScroll: true});
      };
      form.onsubmit = e => {
        e.preventDefault();
        if (done) return;
        const m = typeMatch(inp.value);
        if (!inp.value.trim()) return inp.focus();
        if (!m) {
          msg.textContent = `"${inp.value.trim()}" is not a genus in the game: check the spelling.`;
          return inp.focus();
        }
        if (m.near) {
          msg.textContent = `Close to ${m.near.join(' and ')}: which one? Check the spelling.`;
          return inp.focus();
        }
        finish(m.g === t, m);
      };
      body.querySelector('#tyidk').onclick = () => !done && finish(false, null);
      body.querySelectorAll('[data-v]').forEach(
        b =>
          (b.onclick = () => {
            view = b.dataset.v;
            round();
          })
      );
      // A hardware keyboard types at once; on a phone the keyboard opens only on a tap (no focus without one).
      if (!matchMedia('(pointer: coarse)').matches) inp.focus({preventScroll: true});
    };
    round();
  }
});
