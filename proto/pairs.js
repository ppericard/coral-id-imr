// Memory pairs: match each colony photo with the corallites of the same genus. Links the two scales in memory.
LAB.add({
  id: 'pairs', icon: '▚', title: 'Colony ↔ corallites memory',
  blurb: 'A memory game: flip cards to match each colony with its own corallites. "Look-alike set" makes it hard.',
  lede: 'Flip two cards. A pair is a colony photo and a corallite photo of the same genus.',
  render(root){
    // Difficulty = grid size (cards x rows); cards stretch to fill one screen.
    const LEVELS = {easy: [3, 4], medium: [4, 5], hard: [6, 8]};
    let mode = 'random', level = 'medium';
    const setup = () => {
      const [ga, gb] = LEVELS[level], np = ga * gb / 2;
      let gens;
      if (mode === 'look') { const seed = pick(labNames()); gens = [seed, ...lookAlikes(seed)]; shuffle(labNames()).forEach(n => { if (gens.length < np && !gens.includes(n) && lookAlikes(n).some(b => gens.includes(b))) gens.push(n); }); shuffle(labNames()).forEach(n => { if (gens.length < np && !gens.includes(n)) gens.push(n); }); gens = gens.slice(0, np); }
      else gens = shuffle(labNames()).slice(0, np);
      const cards = shuffle(gens.flatMap(n => [{n, v: 'wide'}, {n, v: 'macro'}]));
      let open = [], found = 0, moves = 0, lock = false;
      // Game layout: card grid left, controls and result in the side column.
      root.innerHTML = `<div class="pgame"><div class="pgwrap"><div class="pgrid">${cards.map((c, i) => `<div class="pcard" role="button" tabindex="0" data-i="${i}" aria-label="Hidden card"><span class="pin"><span class="pback"></span><span class="pfront"><img src="${thumbSrc(c.n, c.v, document.documentElement.dataset.size === 'l' ? 'l' : 's')}" alt="${esc(c.n)}, ${c.v === 'wide' ? 'colony' : 'corallites'}"><small>${c.v === 'wide' ? 'Colony' : DATA.gen[c.n].levels === 2 ? 'Close-up' : 'Corallites'}</small><b><i>${esc(c.n)}</i></b></span></span></div>`).join('')}</div></div>
        <aside class="gside"><div class="seg" role="group" aria-label="Difficulty">${Object.entries(LEVELS).map(([k, [a, b]]) => `<button type="button" data-l="${k}" aria-pressed="${level === k}">${k[0].toUpperCase() + k.slice(1)} <small>${a}×${b}</small></button>`).join('')}</div><div class="chips"><button class="chip" type="button" data-m="random" aria-pressed="${mode === 'random'}">Random genera</button><button class="chip" type="button" data-m="look" aria-pressed="${mode === 'look'}">Look-alike set</button><button class="chip" type="button" id="pnew">New game</button> </div><p class="note" id="pstat">0 moves</p><div id="pres"></div></aside></div>`;
      root.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { mode = b.dataset.m; setup(); });
      root.querySelectorAll('[data-l]').forEach(b => b.onclick = () => { level = b.dataset.l; setup(); });
      root.querySelector('#pnew').onclick = setup;
      window.fitTiles && fitTiles(root.querySelector('.pgrid'), level === 'hard' ? 6 : 10, [ga, gb]);
      const els = [...root.querySelectorAll('.pcard')];
      els.forEach(e => e.onkeydown = ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); e.click(); } });
      els.forEach((e, i) => e.onclick = ev => {
        if (ev && ev.target.closest && ev.target.closest('.inat')) return;
        if (lock || e.classList.contains('up')) return;
        e.classList.add('up'); e.setAttribute('aria-label', `${cards[i].n}, ${cards[i].v === 'wide' ? 'colony' : 'corallites'}`); open.push(i);
        if (open.length < 2) return;
        moves++; root.querySelector('#pstat').textContent = `${moves} move${moves > 1 ? "s" : ""} · ${found + (cards[open[0]].n === cards[open[1]].n ? 1 : 0)} of ${gens.length} pairs`;
        const [a, b] = open; open = [];
        if (cards[a].n === cards[b].n) {
          found++; [a, b].forEach(k => { els[k].classList.add('done'); if (typeof inatTag === 'function') els[k].querySelector('.pfront').insertAdjacentHTML('beforeend', inatTag(viewPhoto(cards[k].n, cards[k].v))); });
          const fn = cards[a].n; root.querySelector('#pres').innerHTML = `<p><a href="${genLink(fn)}"><i>${esc(fn)}</i></a>: ${esc(tipsText(DATA.gen[fn]))}</p>`;
          if (found === gens.length) root.querySelector('#pres').innerHTML = `<p class="ok"><b>All ${gens.length} pairs in ${moves} moves.</b> A perfect game takes ${gens.length}; ${moves <= gens.length * 1.6 ? 'excellent memory.' : 'play again to beat it.'}</p>`;
        } else { lock = true; setTimeout(() => { [a, b].forEach(k => { els[k].classList.remove('up'); els[k].setAttribute('aria-label', 'Hidden card'); }); lock = false; }, 1100); }
      });
    };
    setup();
  }
});
