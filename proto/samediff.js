// Same or different?: two photos, either of one unit (two observations of it) or of the two units of a declared look-alike
// pair; the player taps Same or Different. Untimed, nothing scored, logged or saved (the Tools, rule U13: it graduates only
// with Pierre's OK). It runs on the subject on screen (rule S1): the units are those the player has unlocked (model.js
// unlocked, rule L4), the pairs the subject's declared look-alikes (app.js UNITS pairs, never the data's: model.js
// dataLooks), the photos the draw's own (model.js photoSet, as the duels'), the feedback the quiz's (quiz.js fbLine).
// Pure drawing (tests/samediff.test.js runs it in Node on stubs): sdPlan and sdPhotos; the page is below.

// What to ask. units: the unlocked units; pairs: the declared look-alike pairs [a, b]; apart(a, b): the two units carry
// two labels (a pair one label names would have no right answer). A declared pair is drawn first, then a coin: Different
// shows its two units, Same shows two observations of one of them. So a unit with a look-alike is asked both ways and the
// pair never gives the answer away. Null when no declared pair has both units unlocked (a new player). {same, units}:
// units has one unit for Same, two for Different, in the order of the sides.
function sdPlan(units, pairs, apart, rnd = Math.random) {
  const met = new Set(units),
    L = pairs.filter(([a, b]) => a !== b && met.has(a) && met.has(b) && apart(a, b));
  if (!L.length) return null;
  const [a, b] = L[Math.floor(rnd() * L.length)],
    flip = rnd() < 0.5,
    two = flip ? [b, a] : [a, b];
  return rnd() < 0.5 ? {same: false, units: two} : {same: true, units: [two[0]]};
}
// The two photos of a plan: photo(n, want) gives a photo of unit n or null; want {view, not}: in that view, and not of the
// observation `not`. The same view on both sides (a colony beside a close-up would give the answer away), and for Same a
// second observation (rule P4: a one-photo question shows one observation, a multi-photo format different ones). Null when a
// side has no photo to match, so the caller draws another plan.
function sdPhotos(plan, photo) {
  const [a, b] = plan.units,
    p = photo(a, null);
  if (!p) return null;
  const q = plan.same ? photo(a, {view: p.sdv, not: labObs(p)}) : photo(b, {view: p.sdv});
  return q ? [p, q] : null;
}

LAB.add({
  id: 'samediff',
  icon: '≟',
  title: 'Same or different?',
  blurb: 'Two photos side by side: the same one, or two look-alikes? A quick untimed drill, no score.',
  // Said with the subject's own word (SUBJ.one), at the time the page is drawn.
  get lede() {
    return `Two photos: do they show the same ${SUBJ.one}, or two look-alike ${SUBJ.many}? Tap Same or Different, then see which is which. Untimed; nothing here counts toward your progress.`;
  },
  render(root) {
    // The photo source of the Lab's photo games (lab.js labShots): the draw's own choice, the last few shown left out.
    const {photo, seen} = labShots();
    const round = () => {
      const units = unlocked(),
        pairs = UNITS[SUBJ.id].pairs();
      for (let i = 0; i < 12; i++) {
        const plan = sdPlan(units, pairs, (a, b) => !choiceNames(a, b) && !choiceNames(b, a));
        if (!plan) break;
        const ph = sdPhotos(plan, photo);
        if (ph) return {...plan, ph};
      }
      return null;
    };
    const draw = () => {
      const R = round();
      if (!R) {
        root.innerHTML = `<p class="note">This game compares look-alike ${esc(SUBJ.many)} you have met. Meet a few in the quiz first.</p><p><a class="next" href="${esc(hr('quiz'))}">Play the quiz</a></p>`;
        return;
      }
      seen(R.ph);
      const unit = R.units.map(n => GX(n)),
        of = R.same ? [R.units[0], R.units[0]] : R.units,
        one = (unit[0] || {}).one || SUBJ.one;
      let answered = false;
      // The photos: the unit is not named until the answer (the enlarged view is blind too, rule P5).
      const fig = (p, k) =>
        `<figure class="qph" data-i="${k}"${p.ar ? ` data-r="${p.ar}"` : ''}${p.imr ? ' data-imr' : ''} style="--qbg:url('${img(p, 's')}')"><button type="button" class="zoom" data-z="${k}" aria-label="Enlarge photo ${k + 1}"><img src="${qsrc(p, 2)}" data-lo="${img(p, 's')}"${p.f ? ` data-f="${esc(p.f)}"` : ''} alt="${esc(SUBJ.what)} ${k + 1}">${ZOOMI}</button></figure>`;
      root.innerHTML = `<div class="q bleed sdq">
        <div class="qstage qvs">${R.ph.map(fig).join('')}</div>
        <aside class="qside">
          <div class="qtop"><p class="prompt">Same ${esc(one)} or different?</p></div>
          <div class="ans sdans" role="group" aria-label="Same or different"><button type="button" class="plain" data-sd="same"><kbd>1</kbd>Same</button><button type="button" class="plain" data-sd="diff"><kbd>2</kbd>Different</button></div>
          <div id="after"></div>
        </aside></div>`;
      const q = root.querySelector('.q'),
        sig = viewKeys(),
        // The quiz's layout (fitStage), then the stage's height for the CSS (--sdh): a photo's 4:3 box is never taller than
        // the stage, whatever the window's shape (lab.css .sdq).
        fit = () => {
          fitStage();
          const st = q.querySelector('.qstage');
          if (st) st.style.setProperty('--sdh', st.clientHeight + 'px');
        };
      fit();
      addEventListener('resize', fit, {signal: sig});
      const go = said => {
        if (answered) return;
        answered = true;
        const good = said === (R.same ? 'same' : 'diff'),
          stage = q.querySelector('.qstage');
        q.querySelectorAll('[data-sd]').forEach(b => {
          b.disabled = true;
          const right = b.dataset.sd === (R.same ? 'same' : 'diff');
          if (right) b.classList.add('ok', ...(good ? ['cheer'] : []));
          else if (b.dataset.sd === said) b.classList.add('ko');
        });
        // Each photo says its unit and its source (rule P5: only now), the enlarged view names them too.
        stage.querySelectorAll('.qph').forEach((f, k) => {
          f.classList.add('qnm');
          f.insertAdjacentHTML('beforeend', `<figcaption>${uname(of[k])}</figcaption>${photoSrc(R.ph[k])}`);
        });
        // The verdict, then the one decisive line (rule C3, quiz.js fbLine: the pair's own line, else the first ID tip, with
        // its source); the ID tips of the unit or units and the credits behind More.
        const [a, b] = R.units,
          said2 = R.same ? `the same ${esc(one)}: ${uname(a)}` : `${uname(a)} and ${uname(b)}`;
        labSheet(q, {
          good,
          head: `${R.same ? '' : 'different: '}${said2}`,
          line: fbLine(a, R.same ? a : b, R.same, []),
          more: labTips(R.units),
          photos: R.ph,
          rep: {g: a, a: '', ph: R.ph.map(p => p.f).filter(Boolean), m: 'samediff'},
          next: draw,
          fit
        });
      };
      q.querySelectorAll('[data-sd]').forEach(b => (b.onclick = () => go(b.dataset.sd)));
      q.querySelector('.qstage').onclick = e => {
        const z = e.target.closest('[data-z]');
        if (z)
          zoom(
            R.ph.map((p, k) => ({...p, genus: of[k]})),
            Number(z.dataset.z),
            {blind: () => !answered}
          );
      };
      document.addEventListener(
        'keydown',
        e => {
          if (!document.body.contains(q)) return;
          if (!lb.hidden || e.target.closest('input, textarea, select') || document.getElementById('tour')) return;
          const k = {1: 'same', 2: 'diff'}[e.key];
          if (k && !answered) {
            e.preventDefault();
            go(k);
          }
        },
        {signal: sig}
      );
    };
    draw();
  }
});
