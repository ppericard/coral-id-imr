// Life stages matched: a photo of one life stage of a fish (the juvenile, or the female) is shown, outlined, with three photos
// of another stage (the male, or the female) of three species, one of them the same species: the player taps it. A Matrix
// variant (ROADMAP "Life stages matched"; the multi-photo study's layout 1d: the 2 x 2, the outlined reference first).
// Untimed, nothing scored, logged or saved (the Tools, rule U13: it graduates only with Pierre's OK). It asks only about the
// phases a cited source documents for the species (fish-phases.json, built by tools/fish_phases_site.py from
// tools/fish_phases.json: rules C2 and C5, nothing settled here), on the photos judged with that phase (fish-game.json `ph`),
// and says the source under the answer. Rule L4: the photos come from the families the player has unlocked
// (model.js unlocked), the draw's own choice where it gives one (lab.js labShots: model.js photoSet), the feedback sheet the
// quiz's (lab.js labSheet). A subject with no such list (UNITS `phases`) does not offer it (`on`).
// Pure drawing (tests/lifestages.test.js runs it in Node on stubs): lsIndex, lsPlan and lsPhotos; the page is below.

// The pairs asked, [the stage shown, the stage to find]: a juvenile beside the female or the male, a female beside the male
// (the study: "a juvenile or a female, then pick the adult or the male").
const LS_PAIRS = [
  ['juvenile', 'female'],
  ['juvenile', 'male'],
  ['female', 'male']
];
// Whether the list documents phase `ph` for a species record P: the juvenile's own verdict, the female's and the male's from
// the sexes' colours or the initial and terminal phases'.
const lsSourced = (P, ph) => !!P && (ph === 'juvenile' ? !!P.juv : ph === 'female' || ph === 'male' ? !!(P.sex || P.ip_tp) : false);
// What the sheet says for a stage (rule C2: the source's own words): one quote of the verdict the stage rests on. A verdict
// holds every quote the list gives for it, each about one stage or several (Coris gaimard's sexes: a female's, a male's, then
// both), so a quote goes under a stage's name only when it names that stage, as a whole word ("Females" never names the
// male; "initial phase" is not read as a sex: a source may call the juvenile so). One that names that stage alone first, then
// one that names it with another; with none, the verdict's first quote under the verdict's own name (the sexes, the juvenile
// and the adult, the initial and terminal phases). {label, q, s} or null.
const LS_WORDS = {juvenile: /\bjuveniles?\b/i, female: /\bfemales?\b/i, male: /\bmales?\b/i},
  LS_VERDICTS = {juvenile: ['juv'], female: ['sex', 'ip_tp'], male: ['sex', 'ip_tp']},
  LS_BOTH = {juv: 'Juvenile and adult', sex: 'Female and male', ip_tp: 'Initial and terminal phases'};
function lsQuote(P, ph) {
  const ks = (LS_VERDICTS[ph] || []).filter(k => P && P[k] && [].concat(P[k].q).filter(Boolean).length);
  if (!ks.length) return null;
  const qs = k => [].concat(P[k].q).filter(Boolean),
    alone = x => Object.keys(LS_WORDS).every(o => o === ph || !LS_WORDS[o].test(x));
  for (const pass of [alone, () => true])
    for (const k of ks) {
      const q = qs(k).find(x => LS_WORDS[ph].test(x) && pass(x));
      if (q) return {label: ph[0].toUpperCase() + ph.slice(1), q, s: P[k].s};
    }
  return {label: LS_BOTH[ks[0]], q: qs(ks[0])[0], s: P[ks[0]].s};
}
// The species of the game that can be asked: items [{p, n}] are the photos of the unlocked units (p a photo carrying `sp`
// and `ph`, n its unit), phases the list's species by id. Each species holds {n, ph: {phase: [photos]}}, only for a species
// the list documents, only the phases it documents, and only when two of them have a photo: a match needs two stages.
function lsIndex(items, phases) {
  const by = new Map();
  items.forEach(({p, n}) => {
    if (!p || !p.sp || !p.ph || !lsSourced(phases[p.sp], p.ph)) return;
    const e = by.get(p.sp) || {n, ph: {}};
    (e.ph[p.ph] = e.ph[p.ph] || []).push(p);
    by.set(p.sp, e);
  });
  [...by].forEach(([sp, e]) => Object.keys(e.ph).length < 2 && by.delete(sp));
  return by;
}
// What to ask: a species with a pair of its stages in LS_PAIRS, the two other species that show the stage to find (those of
// its unit first: look-alikes, the same family), and the place of the right photo among the three. Null with no species that
// has two other to set against it. {sp, ref, tgt, others, at}.
function lsPlan(index, rnd = Math.random) {
  const shuffled = L => {
      const a = [...L];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
    has = (e, ph) => !!(e.ph[ph] && e.ph[ph].length);
  for (const sp of shuffled([...index.keys()])) {
    const e = index.get(sp),
      pairs = LS_PAIRS.filter(([a, b]) => has(e, a) && has(e, b));
    if (!pairs.length) continue;
    const [ref, tgt] = pairs[Math.floor(rnd() * pairs.length)],
      rest = [...index].filter(([o, x]) => o !== sp && has(x, tgt)),
      others = [...shuffled(rest.filter(([, x]) => x.n === e.n)), ...shuffled(rest.filter(([, x]) => x.n !== e.n))].map(([o]) => o);
    if (others.length < 2) continue;
    return {sp, ref, tgt, others: others.slice(0, 2), at: Math.floor(rnd() * 3)};
  }
  return null;
}
// The four photos of a plan: [the stage shown, then the three to choose from, the right one at plan.at]. photo(sp, ph, not)
// gives a photo of species sp in stage ph, not of the observations in `not`, or null; the species' unit goes with it
// (index). Different observations (rule P4: a multi-photo format shows different observations). Null when one is missing.
function lsPhotos(plan, index, photo, obs = p => p.o || p.f) {
  const used = [],
    take = (sp, ph) => {
      const p = photo(sp, ph, used);
      if (p) used.push(obs(p));
      return p;
    },
    ref = take(plan.sp, plan.ref),
    right = take(plan.sp, plan.tgt),
    wrong = plan.others.map(o => take(o, plan.tgt));
  if (!ref || !right || wrong.some(p => !p)) return null;
  const choice = [...wrong];
  choice.splice(plan.at, 0, right);
  return [ref, ...choice];
}

LAB.add({
  id: 'lifestages',
  icon: '♀♂',
  title: 'Life stages matched',
  blurb:
    'A juvenile, a female and a male are often one species: match the stage shown to its other stage. A quick untimed drill, no score.',
  lede: 'One photo is outlined: a juvenile or a female. Tap the photo of the same species at its other stage (the male, or the female). Only species whose phases a cited source documents are asked, and the source is said with the answer. Untimed; nothing here counts toward your progress.',
  // Offered where the subject has a list of documented phases (UNITS phases: the fish's): none for the corals, whose photos carry none.
  on: () => typeof UNITS !== 'undefined' && !!UNITS[SUBJ.id] && typeof UNITS[SUBJ.id].phases === 'function',
  render(root) {
    // The photo source of the Lab's photo games (lab.js labShots): the draw's own choice, the last rounds' photos left out.
    const {photo, seen} = labShots(16, 4, 'k4');
    root.innerHTML = '<p class="note">Loading…</p>';
    const word = ph => ph,
      // a species as shown: its common name where it has one, its scientific name in italics (the PDF's, rule S2)
      sp = id => (TREEU && TREEU.sps && TREEU.sps[id]) || {name: id},
      label = id => (sp(id).common ? `${esc(sp(id).common)} <small><i>${esc(sp(id).name)}</i></small>` : `<i>${esc(sp(id).name)}</i>`),
      short = id => (sp(id).common ? esc(sp(id).common) : `<i>${esc(sp(id).name)}</i>`),
      src = e => esc(e.s.map(x => x.t).join('; ')),
      // the list's own words for a phase and its sources (rule C2), "Male: …" only over a quote that names the male (lsQuote);
      // a quote already said in this sheet is not said again (the female and the male often rest on one quote of the sexes)
      say = (x, not) =>
        x && !(not && not.q === x.q) ? `<p class="vs fbline">${esc(x.label)}: ${esc(x.q)} <small class="esrc">(${src(x)})</small></p>` : '';
    const build = phases => {
      // the photos of the units the player has unlocked (rule L4), the families: each with the species and phase it carries
      // (the subject's own rank, rankOf '': a genus unit holds its species' photos again)
      const items = unlocked()
        .filter(n => GX(n) && !rankOf(n))
        .flatMap(n => SUBJ.views.flatMap(([v]) => gamePics(n, v).map(p => ({p, n}))));
      return lsIndex(items, phases);
    };
    const draw = index => {
      let R = null;
      for (let i = 0; i < 12 && !R; i++) {
        const plan = lsPlan(index);
        if (!plan) break;
        // the draw's own choice of photo (labShots), else any photo of the stage that is not used yet (the draw may hold back a
        // juvenile or a sex photo on a unit still being learned: here the stage is the question)
        const pick = (id, ph, not) => {
          const e = index.get(id),
            fits = q => q.sp === id && q.ph === ph && !not.includes(labObs(q)),
            got = photo(e.n, {not, tile: false, fit: q => q.sp === id && q.ph === ph});
          if (got) return got;
          const L = (e.ph[ph] || []).filter(q => fits(q) && !(q.xc && !q.r));
          return L.length ? L[Math.floor(Math.random() * L.length)] : null;
        };
        const ph = lsPhotos(plan, index, pick);
        if (ph) R = {...plan, ph, n: index.get(plan.sp).n};
      }
      if (!R) {
        root.innerHTML = `<p class="note">${
          index.size
            ? 'Not enough photos of the stages of the fish you have met for a round yet.'
            : 'This game matches the life stages of a fish whose phases a source documents. Meet a few families in the quiz first.'
        }</p><p><a class="next" href="${esc(hr('quiz'))}">Play the quiz</a></p>`;
        return;
      }
      seen(R.ph);
      // The species of each tile, the stage each shows.
      const spOf = [R.sp, ...[0, 1, 2].map(k => (k === R.at ? R.sp : R.others[k - (k > R.at ? 1 : 0)]))],
        stageOf = [R.ref, R.tgt, R.tgt, R.tgt];
      let answered = false;
      // The reference is no button (it is shown, not chosen); the other three are the choices, and take the quiz's own
      // photo-failure handling (a tile that cannot load closes the answers).
      const tile = (p, k) =>
        k === 0
          ? `<figure class="fxt fref" style="--qbg:url('${img(p, 's')}')"><img src="${tileSrc(p)}" data-lo="${img(p, 's')}"${p.f ? ` data-f="${esc(p.f)}"` : ''} alt="${esc(SUBJ.what)}, ${esc(word(R.ref))}"><figcaption>${esc(word(R.ref))}</figcaption></figure>`
          : `<figure class="fxt" style="--qbg:url('${img(p, 's')}')"><button type="button" data-c="${k - 1}" aria-label="Photo ${k}"><img src="${tileSrc(p)}" data-lo="${img(p, 's')}"${p.f ? ` data-f="${esc(p.f)}"` : ''} alt="${esc(SUBJ.what)} ${k}"><kbd>${k}</kbd></button></figure>`;
      root.innerHTML = `<div class="q bleed qfind lsq">
        <div class="qstage qfx">${R.ph.map(tile).join('')}</div>
        <aside class="qside">
          <div class="qtop"><p class="prompt">Tap the ${esc(word(R.tgt))} of the same species as the ${esc(word(R.ref))} shown first.</p></div>
          <div id="after"></div>
        </aside></div>`;
      const q = root.querySelector('.q'),
        stage = q.querySelector('.qstage'),
        ims = [...stage.querySelectorAll('img')],
        inn = new Set(ims.filter(im => im.complete && im.naturalWidth)),
        sig = viewKeys(),
        // The quiz's layout (fitStage), and once answered the one row of four above the fixed sheet, as Odd one out's.
        fit = () => {
          fitStage();
          const aft = document.getElementById('after');
          if (!isStacked() || !q.classList.contains('done') || !aft || getComputedStyle(aft).position !== 'fixed') return;
          const top = stage.getBoundingClientRect().top,
            room = Math.floor(aft.getBoundingClientRect().top - top - 8),
            low = Math.max(...[...stage.children].map(f => f.getBoundingClientRect().bottom)) - top;
          if (low <= room + 2) return;
          const side = Math.max(40, Math.min(room, Math.floor((stage.clientWidth - 3 * 8) / 4)));
          stage.style.height = side + 'px';
          stage.style.setProperty('--fx', side + 'px');
          stage.style.gridTemplateColumns = `repeat(4, ${side}px)`;
          stage.style.gridTemplateRows = `${side}px`;
        };
      fit();
      addEventListener('resize', fit, {signal: sig});
      // As Find the X: the photos are the choices, so it is answered only once all four are in.
      const gate = () => qAnswers(q, inn.size === ims.length && !q.classList.contains('qnone'));
      ims.forEach(im => im.addEventListener('load', () => (inn.add(im), gate())));
      gate();
      const go = k => {
        if (answered) return;
        answered = true;
        const good = k === R.at;
        qAnswers(q, false);
        // Each tile now says its stage, then its species, and its source (rule P5: only now): the right one ticked, a wrong tap
        // crossed (never colour alone), and opens the four photos whole. The stage first, on its own line, the name wrapping
        // under it (lab.css): the stage is the point of the game, never the part cut off.
        stage.querySelectorAll('.fxt').forEach((f, i) => {
          const m = i === 0 ? '' : i - 1 === R.at ? 'fok' : i - 1 === k ? 'fko' : '';
          if (m) f.classList.add(m);
          f.querySelectorAll('figcaption').forEach(c => c.remove());
          f.insertAdjacentHTML(
            'beforeend',
            `<figcaption><span class="lsst">${m ? `<span aria-hidden="true">${m === 'fok' ? '✓' : '✗'}</span> ` : ''}${esc(word(stageOf[i]))}</span> <span class="lsnm">${short(spOf[i])}</span></figcaption><button type="button" class="zoom" data-fz="${i}" aria-label="Enlarge ${esc(sp(spOf[i]).name)}">${ZOOMI}</button>${photoSrc(R.ph[i])}`
          );
        });
        const P = phases[R.sp],
          said = lsQuote(P, R.tgt);
        labSheet(q, {
          good,
          head: `the ${esc(word(R.tgt))} of this ${esc(word(R.ref))} is ${label(R.sp)}`,
          line: say(said),
          more: `${say(lsQuote(P, R.ref), said)}${labTips([R.n])}`,
          photos: R.ph,
          rep: {g: R.n, a: '', ph: R.ph.map(p => p.f).filter(Boolean), m: 'lifestages'},
          next: () => draw(index),
          fit
        });
      };
      q.querySelectorAll('[data-c]').forEach(b => (b.onclick = () => go(Number(b.dataset.c))));
      stage.onclick = e => {
        const z = e.target.closest('[data-fz]');
        if (z)
          zoom(
            // each photo with its own species' unit (a wrong choice may be of another family): the lightbox names it and reports it
            R.ph.map((p, i) => ({...p, genus: index.get(spOf[i]).n})),
            Number(z.dataset.fz)
          );
      };
      document.addEventListener(
        'keydown',
        e => {
          if (!document.body.contains(q)) return;
          if (!lb.hidden || e.target.closest('input, textarea, select') || document.getElementById('tour')) return;
          if (e.ctrlKey || e.metaKey || e.altKey) return;
          const b = !answered && q.querySelectorAll('[data-c]')[Number(e.key) - 1];
          if (b && !b.disabled && /^[1-3]$/.test(e.key)) {
            e.preventDefault();
            b.click();
          }
        },
        {signal: sig}
      );
    };
    // The list of documented phases (UNITS phases), once; with it every round is drawn from the photos of the unlocked families.
    // Once the player has left the tool (the stop function below, called by lab.js when another page opens), a list that arrives
    // late draws nothing: a draw takes the page's keyboard controller (viewKeys) from the page now on screen.
    let phases = {},
      alive = true;
    UNITS[SUBJ.id].phases().then(
      j => {
        if (!alive) return;
        phases = (j && j.species) || {};
        draw(build(phases));
      },
      () => alive && (root.innerHTML = '<p class="note">The list of documented phases could not be loaded. Try again later.</p>')
    );
    return () => (alive = false);
  }
});
