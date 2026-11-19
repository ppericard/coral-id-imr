// Odd one out: four photos, three of one unit (three observations of it) and one of another, the intruder; the player taps
// the intruder. Untimed, nothing scored, logged or saved (the Tools, rule U13: it graduates only with Pierre's OK). It runs
// on the subject on screen (rule S1) as Same or different? does (proto/samediff.js): the units are those the player has
// unlocked (model.js unlocked, rule L4), the intruder one of the shown unit's declared look-alikes (app.js UNITS pairs, never
// the data's: model.js dataLooks) when one is unlocked, else any unlocked unit; the photos the draw's own (lab.js labShots:
// model.js photoSet, as the duels'), the feedback the quiz's (quiz.js fbLine). The screen is Find the X's: four square tiles
// (app.css .fxt, quiz.js fitStage), each the button of its own photo.
// Pure drawing (tests/oddone.test.js runs it in Node on stubs): ooPlan and ooPhotos; the page is below.

// What to ask. units: the unlocked units; pairs: the declared look-alike pairs [a, b]; apart(a, b): the two units carry two
// labels (an intruder that one label names with the others would have no right answer). The unit shown three times is any
// unit with another to set against it; its intruder is one of its declared look-alikes when one of them is unlocked, else any
// other unlocked unit. So the look-alikes come first without being the only ones, and a new player with two units still
// plays. `at`: the intruder's place among the four (0 to 3), so no place is always right. Null with fewer than two units.
function ooPlan(units, pairs, apart, rnd = Math.random) {
  const pick = L => L[Math.floor(rnd() * L.length)],
    met = [...new Set(units)],
    others = m => met.filter(o => o !== m && apart(m, o)),
    L = met.filter(m => others(m).length);
  if (!L.length) return null;
  const maj = pick(L),
    rest = others(maj),
    look = rest.filter(o => pairs.some(([a, b]) => (a === maj && b === o) || (a === o && b === maj)));
  return {maj, odd: pick(look.length ? look : rest), at: Math.floor(rnd() * 4)};
}
// The four photos of a plan, the intruder at its place: photo(n, want) gives a photo of unit n or null (lab.js labShots).
// Three observations of the shown unit (rule P4: a multi-photo format shows different observations), then one of the
// intruder, all in the same view and framed alike (the first photo decides: a close-up or a square cut beside three
// colonies would give the odd one away). Null when a side has no photo to match, so the caller draws another plan.
function ooPhotos(plan, photo) {
  const p = photo(plan.maj, null);
  if (!p) return null;
  const want = {view: p.sdv, tile: !!p.xc},
    three = [p];
  while (three.length < 3) {
    const q = photo(plan.maj, {...want, not: three.map(labObs)});
    if (!q) return null;
    three.push(q);
  }
  const x = photo(plan.odd, want);
  if (!x) return null;
  three.splice(plan.at, 0, x);
  return three;
}

LAB.add({
  id: 'oddone',
  icon: '≠',
  title: 'Odd one out',
  blurb: 'Four photos, three of one kind and one look-alike: tap the odd one out. A quick untimed drill, no score.',
  // Said with the subject's own word (SUBJ.one), at the time the page is drawn.
  get lede() {
    return `Four photos: three show the same ${SUBJ.one}, one a different ${SUBJ.one}, often a look-alike. Tap the odd one out, then see which is which. Untimed; nothing here counts toward your progress.`;
  },
  render(root) {
    // The photo source of the Lab's photo games (lab.js labShots): the draw's own choice, the last rounds' photos left out.
    const {photo, seen} = labShots(12);
    const round = () => {
      const units = unlocked(),
        pairs = UNITS[SUBJ.id].pairs();
      let planned = false;
      for (let i = 0; i < 12; i++) {
        const plan = ooPlan(units, pairs, (a, b) => !choiceNames(a, b) && !choiceNames(b, a));
        if (!plan) break;
        planned = true;
        const ph = ooPhotos(plan, photo);
        if (ph) return {...plan, ph};
      }
      return {planned};
    };
    const draw = () => {
      const R = round();
      if (!R.ph) {
        root.innerHTML = `<p class="note">${
          R.planned
            ? `Not enough photos of the ${esc(SUBJ.many)} you have met for a set of four yet.`
            : `This game picks the odd one out among the ${esc(SUBJ.many)} you have met. Meet a few in the quiz first.`
        }</p><p><a class="next" href="${esc(hr('quiz'))}">Play the quiz</a></p>`;
        return;
      }
      seen(R.ph);
      const of = R.ph.map((p, k) => (k === R.at ? R.odd : R.maj)),
        one = (GX(R.maj) || {}).one || SUBJ.one;
      let answered = false;
      // The tiles are the buttons: no unit is named before the answer (nor in a label), the tiles take the quiz's own
      // photo-failure handling (app.js: a tile that cannot load closes the answers). One framing for the four (ooPhotos).
      const tile = (p, k) =>
        `<figure class="fxt" style="--qbg:url('${img(p, 's')}')"><button type="button" data-c="${k}" aria-label="Photo ${k + 1}"><img src="${tileSrc(p)}" data-lo="${img(p, 's')}"${p.f ? ` data-f="${esc(p.f)}"` : ''} alt="${esc(SUBJ.what)} ${k + 1}"><kbd>${k + 1}</kbd></button></figure>`;
      root.innerHTML = `<div class="q bleed qfind ooq">
        <div class="qstage qfx">${R.ph.map(tile).join('')}</div>
        <aside class="qside">
          <div class="qtop"><p class="prompt">Three show the same ${esc(one)}. Tap the odd one out.</p></div>
          <div id="after"></div>
        </aside></div>`;
      const q = root.querySelector('.q'),
        stage = q.querySelector('.qstage'),
        ims = [...stage.querySelectorAll('img')],
        inn = new Set(ims.filter(im => im.complete && im.naturalWidth)),
        sig = viewKeys(),
        // The quiz's layout (fitStage). On a phone or tablet the verdict sheet is fixed at the bottom and fitStage gives the
        // stage what is left above it, but never less than 120 px: under a tall sheet (More open on a short screen) the second
        // row of tiles would sit behind it. Then one row of four squares, as large as the room above the sheet allows.
        fit = () => {
          fitStage();
          const aft = document.getElementById('after');
          if (!isStacked() || !q.classList.contains('done') || !aft || getComputedStyle(aft).position !== 'fixed') return;
          const top = stage.getBoundingClientRect().top,
            room = Math.floor(aft.getBoundingClientRect().top - top - 8),
            low = Math.max(...[...stage.children].map(f => f.getBoundingClientRect().bottom)) - top;
          if (low <= room + 2) return; // (a pixel or two of rounding is no overlap)
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
        // Each tile now says its unit and its source (rule P5: only now): the odd one ticked, a wrong tap crossed (never
        // colour alone), and opens the four photos whole, named.
        stage.querySelectorAll('.fxt').forEach((f, i) => {
          const m = i === R.at ? 'fok' : i === k ? 'fko' : '';
          if (m) f.classList.add(m);
          f.insertAdjacentHTML(
            'beforeend',
            `<figcaption>${m ? `<span aria-hidden="true">${m === 'fok' ? '✓' : '✗'}</span> ` : ''}${uname(of[i])}</figcaption><button type="button" class="zoom" data-fz="${i}" aria-label="Enlarge ${esc(unameT(of[i]))}">${ZOOMI}</button>${photoSrc(R.ph[i])}`
          );
        });
        // The verdict, then the one decisive line (rule C3, quiz.js fbLine: the pair's own line for the odd one against the
        // others, else the odd one's first ID tip, with its source); the ID tips of both units and the credits behind More.
        labSheet(q, {
          good,
          head: `the odd one out is ${uname(R.odd)}, among ${uname(R.maj)}`,
          line: fbLine(R.odd, R.maj, false, []),
          more: labTips([R.odd, R.maj]),
          photos: R.ph,
          rep: {g: R.odd, a: '', ph: R.ph.map(p => p.f).filter(Boolean), m: 'oddone'},
          next: draw,
          fit
        });
      };
      q.querySelectorAll('[data-c]').forEach(b => (b.onclick = () => go(Number(b.dataset.c))));
      stage.onclick = e => {
        const z = e.target.closest('[data-fz]');
        if (z)
          zoom(
            R.ph.map((p, i) => ({...p, genus: of[i]})),
            Number(z.dataset.fz)
          );
      };
      document.addEventListener(
        'keydown',
        e => {
          if (!document.body.contains(q)) return;
          if (!lb.hidden || e.target.closest('input, textarea, select') || document.getElementById('tour')) return;
          const b = !answered && q.querySelectorAll('[data-c]')[Number(e.key) - 1];
          if (b && !b.disabled) {
            e.preventDefault();
            b.click();
          }
        },
        {signal: sig}
      );
    };
    draw();
  }
});
