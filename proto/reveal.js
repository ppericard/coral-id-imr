// Blur reveal: a photo starts as a blur and sharpens over 12 seconds. Answer early for more points. It runs on the subject on
// screen (rule S1; Q437, Pierre, 2026-11-19): the units are those the player has unlocked (model.js unlocked, rule L4), the
// photo the draw's own for a four-choice question (lab.js labShots, model.js photoSet), the three wrong choices the quiz's
// own (model.js distractors: of the unit's rank, no two of one label, look-alikes first), the feedback the quiz's (quiz.js
// fbLine). Untimed score and tally are on screen only, kept nowhere (rule U13: it graduates only with Pierre's OK).
LAB.add({
  id: 'reveal',
  icon: '◐',
  title: 'Blur reveal',
  // Said with the subject's own words (SUBJ.what, SUBJ.one), at the time the page is drawn.
  get blurb() {
    return `A ${SUBJ.what.toLowerCase()} photo sharpens out of a blur. The sooner you name the ${SUBJ.one}, the more points: trains the overall look, then the detail.`;
  },
  lede: 'The photo sharpens over 12 seconds; points = seconds left. Choices are mostly look-alikes.',
  render(root) {
    const DUR = 12000;
    let raf = 0,
      score = {pts: 0, n: 0, streak: 0},
      view = 'any';
    // The photo source of the Lab's photo games (lab.js labShots), aimed as a four-choice question's.
    const {photo, seen} = labShots(8, 4, 'k4');
    // Game layout: stage left, every control (views, choices, score, feedback) in the side column.
    root.innerHTML = `<div id="rvbody"></div>`;
    const body = root.querySelector('#rvbody');
    const round = () => {
      cancelAnimationFrame(raf);
      const met = unlocked(),
        d = met.length ? labDraw(met, photo, view) : null;
      if (!d) return labEmpty(body, met.length > 0);
      const {t, p} = d;
      seen([p]);
      // The wrong choices: the quiz's own, up to two look-alikes among them (the units met first), then the others.
      const choices = shuffle([t, ...distractors(t, pool(), 2, introReady)]);
      body.innerHTML = `<div class="rvlayout"><div class="rvstage"><img id="rvimg" src="${img(p, fit(Math.min(innerWidth, 800)))}" alt="${esc(SUBJ.what)} to identify"><div class="rvbar"><i id="rvfill"></i></div></div>
        <div class="gside">${labViewChips(view)}<div class="choices col">${choices
          .map(n => `<button type="button" class="choice" data-c="${esc(n)}">${esc(unameT(n))}</button>`)
          .join('')}</div>
        <p class="note">Score ${score.pts} pts · ${score.n} asked · streak ${score.streak}</p><div id="rvres"></div></div></div>`;
      const im = body.querySelector('#rvimg'),
        fill = body.querySelector('#rvfill');
      let t0 = null,
        done = false;
      const frame = now => {
        if (!im.isConnected || done) return;
        if (t0 === null) t0 = now;
        const k = Math.min(1, (now - t0) / DUR);
        // Shapes show from the start; the fine detail sharpens over the first half.
        im.style.filter = `blur(${14 * Math.pow(1 - k, 3)}px) saturate(${0.6 + k * 0.4})`;
        fill.style.width = 100 - k * 100 + '%';
        if (k < 1) raf = requestAnimationFrame(frame);
      };
      // Start the clock only once the photo is in.
      const start = () => {
        raf = requestAnimationFrame(frame);
      };
      im.style.filter = 'blur(14px) saturate(.6)';
      if (im.complete) start();
      else im.onload = start;
      body.querySelectorAll('[data-c]').forEach(
        b =>
          (b.onclick = () => {
            if (done) return;
            done = true;
            cancelAnimationFrame(raf);
            const left = t0 === null ? DUR : Math.max(0, DUR - (performance.now() - t0)),
              ok = b.dataset.c === t,
              pts = ok ? Math.ceil(left / 1000) : 0;
            score.pts += pts;
            score.n++;
            score.streak = ok ? score.streak + 1 : 0;
            body.querySelector('.rvlayout').classList.add('rvdone'); // phones: a shorter photo, so the verdict and Next stay on the screen (rule U2)
            im.style.transition = 'filter .5s';
            im.style.filter = 'none';
            im.insertAdjacentHTML('afterend', typeof photoSrc === 'function' ? photoSrc(p) : '');
            body.querySelectorAll('[data-c]').forEach(x => x.classList.add(x.dataset.c === t ? 'right' : x === b ? 'wrong' : 'off'));
            body.querySelector('#rvres').innerHTML =
              `<p class="${ok ? 'ok' : 'ko'}"><b>${ok ? '+' + pts + ' pts' : 'Missed'}</b>: <a href="${esc(genLink(t))}">${uname(t)}</a>.</p>${fbLine(t, b.dataset.c, ok, choices)}<p class="credit">${credit(p)}</p>${typeof repBtn === 'function' ? repBtn({g: t, a: b.dataset.c, ph: [p.f], m: 'reveal'}) : ''}<button type="button" class="next" id="rvnext">Next</button>`;
            body.querySelector('#rvnext').onclick = round;
          })
      );
      body.querySelectorAll('[data-v]').forEach(
        b =>
          (b.onclick = () => {
            view = b.dataset.v;
            round();
          })
      );
    };
    round();
    return () => cancelAnimationFrame(raf);
  }
});
