// Blur reveal: a photo starts as a blur and sharpens over 12 seconds. Answer early for more points.
LAB.add({
  id: 'reveal', icon: '◐', title: 'Blur reveal',
  blurb: 'A coral photo sharpens out of a blur. The sooner you name the genus, the more points: trains the overall look, then the detail.',
  lede: 'The photo sharpens over 12 seconds; points = seconds left. Choices are mostly look-alikes.',
  render(root){
    const DUR = 12000; let raf = 0, score = {pts: 0, n: 0, streak: 0}, view = 'any';
    root.innerHTML = `<div class="chips">${[['any', 'Any view'], ['wide', 'Colony'], ['medium', 'Closer'], ['macro', 'Corallites']].map(([v, t]) => `<button class="chip" type="button" data-v="${v}" aria-pressed="${v === view}">${t}</button>`).join('')}</div><div id="rvbody"></div>`;
    const body = root.querySelector('#rvbody');
    const round = () => {
      cancelAnimationFrame(raf);
      const t = pick(labNames()), v = view === 'any' ? pick(['wide', 'medium', 'macro']) : view, L = DATA.gen[t].views[v] || [], p = L.length ? pick(L) : viewPhoto(t, v);
      body.innerHTML = `<div class="rvstage"><img id="rvimg" src="${img(p)}" alt="Coral to identify"><div class="rvbar"><i id="rvfill"></i></div></div>
        <div class="choices">${labChoices(t, 4).map(n => `<button type="button" class="choice" data-c="${esc(n)}">${esc(n)}</button>`).join('')}</div>
        <p class="note">Score ${score.pts} pts · ${score.n} corals · streak ${score.streak}</p><div id="rvres"></div>`;
      const im = body.querySelector('#rvimg'), fill = body.querySelector('#rvfill');
      let t0 = null, done = false;
      const frame = now => {
        if (!im.isConnected || done) return;
        if (t0 === null) t0 = now;
        const k = Math.min(1, (now - t0) / DUR);
        im.style.filter = `blur(${(1 - k) * (1 - k) * 28}px) saturate(${0.4 + k * 0.6})`;
        fill.style.width = (100 - k * 100) + '%';
        if (k < 1) raf = requestAnimationFrame(frame);
      };
      // Start the clock only once the photo is in.
      const start = () => { raf = requestAnimationFrame(frame); };
      im.style.filter = 'blur(28px) saturate(.4)';
      if (im.complete) start(); else im.onload = start;
      body.querySelectorAll('[data-c]').forEach(b => b.onclick = () => {
        if (done) return; done = true; cancelAnimationFrame(raf);
        const left = t0 === null ? DUR : Math.max(0, DUR - (performance.now() - t0)), ok = b.dataset.c === t, pts = ok ? Math.ceil(left / 1000) : 0;
        score.pts += pts; score.n++; score.streak = ok ? score.streak + 1 : 0;
        im.style.transition = 'filter .5s'; im.style.filter = 'none';
        body.querySelectorAll('[data-c]').forEach(x => x.classList.add(x.dataset.c === t ? 'right' : x === b ? 'wrong' : 'off'));
        body.querySelector('#rvres').innerHTML = `<p class="${ok ? 'ok' : 'ko'}"><b>${ok ? '+' + pts + ' pts' : 'Missed'}</b>: <a href="${genLink(t)}"><i>${esc(t)}</i></a>. ${whyLine(t)}</p><p class="credit">${credit(p)}</p><button type="button" class="next" id="rvnext">Next</button>`;
        body.querySelector('#rvnext').onclick = round;
      });
    };
    root.querySelectorAll('[data-v]').forEach(b => b.onclick = () => { view = b.dataset.v; root.querySelectorAll('[data-v]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); round(); });
    round();
    return () => cancelAnimationFrame(raf);
  }
});
