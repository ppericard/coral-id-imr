// Zoom ladder: slide from the colony to the corallites, or guess the genus as early as you can while zooming in.
LAB.add({
  id: 'zoom', icon: '⊕', title: 'Zoom ladder',
  blurb: 'Slide from colony to corallites, or guess the genus as early as you can while zooming in.',
  lede: 'Each step is a different photo of the same genus, from about a metre away down to the corallites. The closer you get, the more the skeleton decides.',
  render(root, start){
    const STEPS = [['wide', 'Colony', '≈ 0.5–2 m', 'Growth form and colour only: a hint, never the answer.'],
      ['medium', 'Closer', '≈ 10–30 cm', 'Branch tips, verrucae, valleys, plate surface.'],
      ['macro', 'Corallites', '≈ 1–3 cm', 'Wall type, size, septa, columella: this is where you decide.']];
    let genus = DATA.gen[start] ? start : labNames()[0], alt = 0, game = null, score = {pts: 0, n: 0}, steps = STEPS;
    // Some genera only have a colony and a close-up photo level: skip the missing step.
    const stepsFor = n => STEPS.filter(([v]) => (DATA.gen[n].views[v] || []).length).map(s => s[0] === 'macro' && DATA.gen[n].levels === 2 ? [s[0], 'Close-up', s[2], s[3]] : s);
    root.innerHTML = `<div class="chips"><button class="chip" type="button" id="zmexplore" aria-pressed="true">Explore</button><button class="chip" type="button" id="zmgame" aria-pressed="false">Guess while zooming</button></div>
      <div id="zmbody"></div>`;
    const body = root.querySelector('#zmbody');
    const photos = n => steps.map(([v]) => { const L = DATA.gen[n].views[v]; return L[alt % L.length]; });
    const stage = n => `<div class="zstage" id="zstage">${photos(n).map((p, i) => `<img src="${img(p)}" alt="${esc(game ? 'Coral to identify' : n)}, ${steps[i][1].toLowerCase()} view" data-i="${i}">`).join('')}
      <div class="zbadge" id="zbadge"></div></div>`;
    // v runs from 0 (colony) to 2 (corallites); neighbouring photos cross-fade and grow as if zooming.
    const paint = v => {
      root.querySelectorAll('#zstage img').forEach(im => { const d = v - Number(im.dataset.i); im.style.opacity = Math.max(0, 1 - Math.abs(d)); im.style.transform = `scale(${1 + Math.max(-1, Math.min(1, d)) * .3})`; });
      const s = steps[Math.round(v)];
      root.querySelector('#zbadge').innerHTML = `<b>${s[1]}</b> ${s[2]}`;
      const tip = root.querySelector('#ztip'); if (tip) tip.textContent = s[3];
    };
    const explore = () => {
      game = null; steps = stepsFor(genus);
      body.innerHTML = `<div class="zlayout"><div>${stage(genus)}<input type="range" id="zr" min="0" max="${steps.length - 1}" step="0.01" value="0" aria-label="Zoom level, colony to corallites">
        <div class="zticks">${steps.map(s => `<span>${s[1]}</span>`).join('')}</div></div>
        <div class="zside"><label class="zpick">Genus <select id="zsel">${labNames().map(n => `<option ${n === genus ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label>
        <p><button type="button" class="chip" id="zalt">Other photos</button> <a class="chip" href="${genLink(genus)}">Genus sheet</a></p>
        <p class="ztipbox" id="ztip"></p><ol class="zsteps">${steps.map(s => `<li><b>${s[1]}</b> <span class="note">${s[2]}</span><br>${esc(s[3])}</li>`).join('')}</ol></div></div>`;
      const r = body.querySelector('#zr');
      r.oninput = () => paint(Number(r.value));
      body.querySelector('#zsel').onchange = e => { genus = e.target.value; alt = 0; explore(); };
      body.querySelector('#zalt').onclick = () => { alt++; const v = r.value; explore(); body.querySelector('#zr').value = v; paint(Number(v)); };
      paint(0);
    };
    // Game: the slider is locked; each "zoom in" costs a point. 3 points at colony level, 1 at the corallites.
    const play = () => {
      const t = pick(labNames()); genus = t; alt = Math.floor(Math.random() * 3); steps = stepsFor(t);
      game = {t, step: 0, choices: labChoices(t, 6)};
      body.innerHTML = `<div class="zlayout"><div>${stage(t)}</div><div class="zside"><p class="ztipbox" id="ztip"></p>
        <div class="choices col" id="zch">${game.choices.map(n => `<button type="button" class="choice" data-c="${esc(n)}">${esc(n)}</button>`).join('')}</div>
        <p><button type="button" class="next" id="zin">Zoom in (−1 point)</button> <span class="note">Score ${score.pts} pts over ${score.n} corals</span></p><div id="zres"></div></div></div>`;
      const animate = (from, to) => { const t0 = performance.now(); const f = now => { const k = Math.min(1, (now - t0) / 600); if (!body.isConnected) return; paint(from + (to - from) * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(f); }; requestAnimationFrame(f); };
      paint(0);
      const zin = body.querySelector('#zin');
      const top = steps.length - 1;
      zin.onclick = () => { if (game.step < top) { animate(game.step, ++game.step); if (game.step === top) zin.disabled = true; } };
      body.querySelectorAll('[data-c]').forEach(b => b.onclick = () => {
        if (game.done) return; game.done = true;
        const ok = b.dataset.c === t, pts = ok ? steps.length - game.step : 0;
        score.pts += pts; score.n++;
        body.querySelectorAll('[data-c]').forEach(x => x.classList.add(x.dataset.c === t ? 'right' : x === b ? 'wrong' : 'off'));
        if (game.step < top) animate(game.step, top);
        zin.disabled = true;
        body.querySelector('#zres').innerHTML = `<p class="${ok ? 'ok' : 'ko'}"><b>${ok ? `+${pts} point${pts > 1 ? 's' : ''}` : 'Missed'}</b>: it was <a href="${genLink(t)}"><i>${esc(t)}</i></a>. ${whyLine(t)}</p><button type="button" class="next" id="znext">Next coral</button>`;
        body.querySelector('#znext').onclick = play;
      });
    };
    const modeBtn = (on) => { root.querySelector('#zmexplore').setAttribute('aria-pressed', String(!on)); root.querySelector('#zmgame').setAttribute('aria-pressed', String(on)); };
    root.querySelector('#zmexplore').onclick = () => { modeBtn(false); explore(); };
    root.querySelector('#zmgame').onclick = () => { modeBtn(true); play(); };
    explore();
  }
});
