// Memory pairs: match each colony photo with the corallites of the same genus. Links the two scales in memory.
// The np genera of a game: those the player has met (met: model.js introduced, a card or an answer) first, genera not met
// yet only to fill the grid when too few are met (beginner review 2026-11-03: a beginner got names never seen). Look-alike
// set: a seed and the genera that look like those already in, met ones first too. Pure (tests/pairs.test.js).
function memoryGenera(names, np, look, met) {
  const order = [...shuffle(names.filter(met)), ...shuffle(names.filter(n => !met(n)))];
  if (!look) return order.slice(0, np);
  const gens = [order[0]],
    like = n => lookAlikes(n).some(b => gens.includes(b)) || gens.some(b => lookAlikes(b).includes(n));
  // Met look-alikes, then any genus met, then look-alikes not met, then the rest.
  for (const keep of [n => met(n) && like(n), met, like, () => true])
    for (let more = true; more;) {
      more = false; // again while one comes in: a look-alike of the genus just added may come earlier in the order
      order.forEach(n => {
        if (gens.length < np && !gens.includes(n) && keep(n)) more = !!gens.push(n);
      });
    }
  return gens;
}
LAB.add({
  id: 'pairs',
  icon: '▚',
  title: 'Colony ↔ corallites memory',
  blurb: 'A memory game: flip cards to match each colony with its own corallites. "Look-alike set" makes it hard.',
  lede: 'Flip two cards. A pair is a colony photo and a corallite photo of the same genus.',
  render(root) {
    // Difficulty = grid size (cards x rows); cards stretch to fill one screen.
    const LEVELS = {easy: [3, 4], medium: [4, 5], hard: [6, 8]};
    let mode = 'random',
      level = 'medium';
    const setup = () => {
      const [ga, gb] = LEVELS[level],
        np = (ga * gb) / 2;
      const gens = memoryGenera(labNames(), np, mode === 'look', typeof introduced === 'function' ? introduced : () => true);
      const cards = shuffle(
        gens.flatMap(n => [
          {n, v: 'wide'},
          {n, v: 'macro'}
        ])
      );
      let open = [],
        found = 0,
        moves = 0,
        lock = false;
      // Game layout: card grid left, controls and result in the side column (desktop); on phones and tablets the controls
      // shrink to one row above the grid and the status to one line, so the grid gets the screen (Pierre, phone).
      root.innerHTML = `<div class="pgame pmem bleed"><div class="pgwrap"><div class="pgrid">${cards.map((c, i) => `<div class="pcard" role="button" tabindex="0" data-i="${i}" aria-label="Hidden card"><span class="pin"><span class="pback"></span><span class="pfront"><img src="${thumbSrc(c.n, c.v, document.documentElement.dataset.size === 'l' ? 'l' : 's')}" alt="${esc(c.n)}, ${c.v === 'wide' ? 'colony' : 'corallites'}"><small>${c.v === 'wide' ? 'Colony' : DATA.gen[c.n].levels === 2 ? 'Close-up' : 'Corallites'}</small><b><i>${esc(c.n)}</i></b></span></span></div>`).join('')}</div></div>
        <aside class="gside"><div class="seg" role="group" aria-label="Difficulty">${Object.entries(LEVELS)
          .map(
            ([k, [a, b]]) =>
              `<button type="button" data-l="${k}" aria-pressed="${level === k}">${k[0].toUpperCase() + k.slice(1)} <small>${a}×${b}</small></button>`
          )
          .join(
            ''
          )}</div><div class="seg" role="group" aria-label="Genera"><button type="button" data-m="random" aria-pressed="${mode === 'random'}">Random</button><button type="button" data-m="look" aria-pressed="${mode === 'look'}">Look-alikes</button></div><button class="next sec pnew" type="button" id="pnew" aria-label="New game"><span aria-hidden="true">↻</span><span class="pnl"> New game</span></button><div class="pstatus"><span class="note" id="pstat">0 moves</span><div id="pres"></div></div></aside></div>`;
      root.querySelectorAll('[data-m]').forEach(
        b =>
          (b.onclick = () => {
            mode = b.dataset.m;
            setup();
          })
      );
      root.querySelectorAll('[data-l]').forEach(
        b =>
          (b.onclick = () => {
            level = b.dataset.l;
            setup();
          })
      );
      root.querySelector('#pnew').onclick = setup;
      window.fitTiles && fitTiles(root.querySelector('.pgrid'), level === 'hard' ? 6 : 10, [ga, gb]);
      const els = [...root.querySelectorAll('.pcard')];
      els.forEach(
        e =>
          (e.onkeydown = ev => {
            if (ev.key === 'Enter' || ev.key === ' ') {
              ev.preventDefault();
              e.click();
            }
          })
      );
      els.forEach(
        (e, i) =>
          (e.onclick = ev => {
            if (ev && ev.target.closest && ev.target.closest('.psrc')) return;
            if (lock || e.classList.contains('up')) return;
            e.classList.add('up');
            e.setAttribute('aria-label', `${cards[i].n}, ${cards[i].v === 'wide' ? 'colony' : 'corallites'}`);
            open.push(i);
            if (open.length < 2) return;
            moves++;
            root.querySelector('#pstat').textContent =
              `${moves} move${moves > 1 ? 's' : ''} · ${found + (cards[open[0]].n === cards[open[1]].n ? 1 : 0)} of ${gens.length} pairs`;
            const [a, b] = open;
            open = [];
            if (cards[a].n === cards[b].n) {
              found++;
              [a, b].forEach(k => {
                els[k].classList.add('done');
                if (typeof photoSrc === 'function')
                  els[k].querySelector('.pfront').insertAdjacentHTML('beforeend', photoSrc(viewPhoto(cards[k].n, cards[k].v)));
              });
              const fn = cards[a].n;
              root.querySelector('#pres').innerHTML =
                `<p><a href="${genLink(fn)}"><i>${esc(fn)}</i></a>: ${esc(tipsText(DATA.gen[fn]))}</p>${
                  typeof repBtn === 'function'
                    ? repBtn(
                        {
                          g: fn,
                          a: '',
                          ph: [a, b]
                            .map(k => viewPhoto(fn, cards[k].v))
                            .filter(Boolean)
                            .map(x => x.f),
                          m: 'pairs'
                        },
                        '⚑<span class="pnl"> Report a problem</span>'
                      )
                    : ''
                }`;
              // A tip longer than the two lines kept for it pushes the grid down: refit it so it still fits the screen.
              if (
                window.fitTiles &&
                root.querySelector('.pgrid').getBoundingClientRect().bottom > innerHeight - (typeof tabH === 'function' ? tabH() : 0)
              )
                fitTiles(root.querySelector('.pgrid'));
              if (found === gens.length)
                root.querySelector('#pres').innerHTML =
                  `<p class="ok"><b>All ${gens.length} pairs in ${moves} moves.</b> A perfect game takes ${gens.length}; ${moves <= gens.length * 1.6 ? 'excellent memory.' : 'play again to beat it.'}</p>`;
            } else {
              lock = true;
              setTimeout(() => {
                [a, b].forEach(k => {
                  els[k].classList.remove('up');
                  els[k].setAttribute('aria-label', 'Hidden card');
                });
                lock = false;
              }, 1100);
            }
          })
      );
    };
    setup();
  }
});
