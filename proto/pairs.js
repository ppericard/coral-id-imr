// Memory pairs: match each colony photo with the corallites of the same genus. Links the two scales in memory.
LAB.add({
  id: 'pairs', icon: '▚', title: 'Colony ↔ corallites memory',
  blurb: 'A memory game: flip cards to match each colony with its own corallites. "Look-alike set" makes it hard.',
  lede: 'Flip two cards. A pair is a colony photo and a corallite photo of the same genus.',
  render(root){
    let mode = 'random';
    const setup = () => {
      let gens;
      if (mode === 'look') { const seed = pick(labNames()); gens = [seed, ...lookAlikes(seed)]; shuffle(labNames()).forEach(n => { if (gens.length < 6 && !gens.includes(n) && lookAlikes(n).some(b => gens.includes(b))) gens.push(n); }); gens = gens.slice(0, 6); }
      else gens = shuffle(labNames()).slice(0, 6);
      const cards = shuffle(gens.flatMap(n => [{n, v: 'wide'}, {n, v: 'macro'}]));
      let open = [], found = 0, moves = 0, lock = false;
      root.innerHTML = `<div class="chips"><button class="chip" type="button" data-m="random" aria-pressed="${mode === 'random'}">Random genera</button><button class="chip" type="button" data-m="look" aria-pressed="${mode === 'look'}">Look-alike set</button><button class="chip" type="button" id="pnew">New game</button> <span class="note" id="pstat">0 moves</span></div>
        <div class="pgrid">${cards.map((c, i) => `<button type="button" class="pcard" data-i="${i}" aria-label="Hidden card"><span class="pin"><span class="pback"></span><span class="pfront"><img src="${thumbSrc(c.n, c.v)}" alt="${esc(c.n)}, ${c.v === 'wide' ? 'colony' : 'corallites'}"><small>${c.v === 'wide' ? 'Colony' : DATA.gen[c.n].levels === 2 ? 'Close-up' : 'Corallites'}</small><b><i>${esc(c.n)}</i></b></span></span></button>`).join('')}</div><div id="pres"></div>`;
      root.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { mode = b.dataset.m; setup(); });
      root.querySelector('#pnew').onclick = setup;
      const els = [...root.querySelectorAll('.pcard')];
      els.forEach((e, i) => e.onclick = () => {
        if (lock || e.classList.contains('up')) return;
        e.classList.add('up'); e.setAttribute('aria-label', `${cards[i].n}, ${cards[i].v === 'wide' ? 'colony' : 'corallites'}`); open.push(i);
        if (open.length < 2) return;
        moves++; root.querySelector('#pstat').textContent = `${moves} moves · ${found + (cards[open[0]].n === cards[open[1]].n ? 1 : 0)} of ${gens.length} pairs`;
        const [a, b] = open; open = [];
        if (cards[a].n === cards[b].n) {
          found++; els[a].classList.add('done'); els[b].classList.add('done');
          if (found === gens.length) root.querySelector('#pres').innerHTML = `<p class="ok"><b>All ${gens.length} pairs in ${moves} moves.</b> A perfect game takes ${gens.length}; ${moves <= gens.length * 1.6 ? 'excellent memory.' : 'play again to beat it.'}</p>`;
        } else { lock = true; setTimeout(() => { [a, b].forEach(k => { els[k].classList.remove('up'); els[k].setAttribute('aria-label', 'Hidden card'); }); lock = false; }, 1100); }
      });
    };
    setup();
  }
});
