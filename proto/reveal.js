// Blur reveal: a photo starts as a blur and sharpens over 12 seconds. Answer early for more points.
LAB.add({
  id: 'reveal',
  icon: '◐',
  title: 'Blur reveal',
  blurb: 'A coral photo sharpens out of a blur. The sooner you name the genus, the more points: trains the overall look, then the detail.',
  lede: 'The photo sharpens over 12 seconds; points = seconds left. Choices are mostly look-alikes.',
  render(root) {
    const DUR = 12000;
    let raf = 0,
      score = {pts: 0, n: 0, streak: 0},
      view = 'any';
    // Game layout: stage left, every control (views, choices, score, feedback) in the side column.
    const chips = () =>
      `<div class="chips">${[
        ['any', 'Any view'],
        ['wide', 'Colony'],
        ['medium', 'Close-up'],
        ['macro', 'Corallites']
      ]
        .map(([v, t]) => `<button class="chip" type="button" data-v="${v}" aria-pressed="${v === view}">${t}</button>`)
        .join('')}</div>`;
    root.innerHTML = `<div id="rvbody"></div>`;
    const body = root.querySelector('#rvbody');
    const round = () => {
      cancelAnimationFrame(raf);
      const t = pick(labNames()),
        v = view === 'any' ? pick(['wide', 'medium', 'macro']) : view,
        L = gamePics(t, v),
        p = L.length ? pick(L) : viewPhoto(t, v);
      body.innerHTML = `<div class="rvlayout"><div class="rvstage"><img id="rvimg" src="${img(p, fit(Math.min(innerWidth, 800)))}" alt="Coral to identify"><div class="rvbar"><i id="rvfill"></i></div></div>
        <div class="gside">${chips()}<div class="choices col">${labChoices(t, 4)
          .map(n => `<button type="button" class="choice" data-c="${esc(n)}">${esc(n)}</button>`)
          .join('')}</div>
        <p class="note">Score ${score.pts} pts · ${score.n} corals · streak ${score.streak}</p><div id="rvres"></div></div></div>`;
      const im = body.querySelector('#rvimg'),
        fill = body.querySelector('#rvfill');
      let t0 = null,
        done = false;
      const frame = now => {
        if (!im.isConnected || done) return;
        if (t0 === null) t0 = now;
        const k = Math.min(1, (now - t0) / DUR);
        // Shapes show from the start; the skeleton detail sharpens over the first half.
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
            im.style.transition = 'filter .5s';
            im.style.filter = 'none';
            im.insertAdjacentHTML('afterend', typeof photoSrc === 'function' ? photoSrc(p) : '');
            body.querySelectorAll('[data-c]').forEach(x => x.classList.add(x.dataset.c === t ? 'right' : x === b ? 'wrong' : 'off'));
            body.querySelector('#rvres').innerHTML =
              `<p class="${ok ? 'ok' : 'ko'}"><b>${ok ? '+' + pts + ' pts' : 'Missed'}</b>: <a href="${genLink(t)}"><i>${esc(t)}</i></a>. ${esc(tipsText(DATA.gen[t]))}</p><p class="credit">${credit(p)}</p>${typeof repBtn === 'function' ? repBtn({g: t, a: b.dataset.c, ph: [p.f], m: 'reveal'}) : ''}<button type="button" class="next" id="rvnext">Next</button>`;
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
