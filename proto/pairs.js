// Memory pairs: flip two cards, a pair is two photos of the same unit. Every subject plays it (rule S1: one engine); what a
// pair is, is declared by the subject (app.js UNITS memory, read here through MEMORY): the corals' is a colony photo and
// the corallite photo of the same genus (two views of it, linking the two scales in memory), the tree subjects' (one view
// per unit) two photos of the unit that show it differently (memoryPhotos). Nothing is scored, logged or saved.
// The np units of a game: only those the player has unlocked (met: model.js unlocked, one progression path for every
// game, rule L4), fewer than np when fewer are unlocked. Look-alike set: a seed and the units that look like those already
// in (likes(n): the units n looks like), then the other units unlocked. apart(n, gens): n may join the units already in
// (a unit and its own genus would be one answer twice). Pure (tests/pairs.test.js).
function memoryGenera(names, np, look, met, likes = lookAlikes, apart = () => true) {
  const order = shuffle(names.filter(met)),
    gens = [],
    add = n => gens.length < np && !gens.includes(n) && apart(n, gens) && !!gens.push(n);
  if (!look) {
    order.forEach(add);
    return gens;
  }
  if (order.length) add(order[0]);
  const like = n => likes(n).some(b => gens.includes(b)) || gens.some(b => likes(b).includes(n));
  // Look-alikes, then any unit unlocked.
  for (const keep of [like, () => true])
    for (let more = true; more;) {
      more = false; // again while one comes in: a look-alike of the unit just added may come earlier in the order
      order.forEach(n => {
        if (keep(n)) more = add(n) || more;
      });
    }
  return gens;
}
// Whether one of units a and b lies under the other in the tree (a species under its genus under its family):
// parentOf(u) gives u's parent unit or nothing. Pure (tests/pairs.test.js).
function memoryKin(a, b, parentOf) {
  const under = (x, y) => {
    for (let u = parentOf(x), i = 0; u && i < 10; u = parentOf(u), i++) if (u === y) return true;
    return false;
  };
  return under(a, b) || under(b, a);
}
// A board stays within one naming tree. A fish player may have both kinds of name unlocked: a species by its common name
// (its parent is its family) and the scientific genera and species (a species' parent is its genus), so the parent walk
// (memoryKin) never links a common-name species to its scientific genus or twin, and two photos of one species could be
// dealt under two units and refused as a pair. treeOf(n) gives the tree n names ('' for a unit both trees share, such as a
// family). With two trees in play one is kept, drawn by its share of the units, among those that can hold a game (two units
// with the shared ones); the shared units stay. Pure (tests/pairs.test.js).
function memoryTree(names, treeOf) {
  const by = new Map();
  names.forEach(n => by.set(treeOf(n), (by.get(treeOf(n)) || 0) + 1));
  const shared = by.get('') || 0,
    trees = [...by].filter(([t]) => t);
  if (trees.length < 2) return names;
  const able = trees.filter(([, k]) => k + shared >= 2),
    from = able.length ? able : trees;
  let r = Math.random() * from.reduce((s, [, k]) => s + k, 0),
    keep = from[from.length - 1][0];
  for (const [t, k] of from) {
    if ((r -= k) < 0) {
      keep = t;
      break;
    }
  }
  return names.filter(n => [keep, ''].includes(treeOf(n)));
}
// The two photos of unit n for a one-view subject (rule P4: two different observations, never one photo twice): photo(n,
// want) gives a photo of n or null (lab.js labShots, the draw's own choice, want {not, fit}); juv(p): a juvenile photo
// (app.js juvP). The first photo is the draw's; the second shows the unit differently from it, the first of these that
// the unit has: another species, a juvenile beside an adult (or an adult beside a juvenile), any other observation.
// Null when the unit has no second observation in play, so the game leaves the unit out. Pure (tests/pairs.test.js).
function memoryPhotos(n, photo, juv) {
  const a = photo(n, null);
  if (!a) return null;
  const not = [labObs(a)];
  for (const fit of [q => !!a.sp && !!q.sp && q.sp !== a.sp, q => juv(q) !== juv(a), null]) {
    const b = photo(n, fit ? {not, fit} : {not});
    if (b) return [a, b];
  }
  return null;
}
// How each kind of pair is dealt and shown, by the name UNITS memory gives it. open() makes the kit of one visit:
// names() the units, met(n) whether n may be played, likes (the look-alike set's), apart, deal(n) its two cards or null,
// face(c, size) a card's face, aria(c) its label once flipped, credit(c) the credit added when matched, said(n) the line
// shown for a pair found, photo(c) the photo file of a card for the report of a problem, seen(cards) the photos shown.
const MEMORY = {
  // The corals: a colony photo and a corallite photo of the same genus (data.json views).
  views: {
    title: 'Colony ↔ corallites memory',
    lede: () => 'Flip two cards. A pair is a colony photo and a corallite photo of the same genus.',
    open: () => ({
      names: labNames,
      met: typeof unlocked === 'function' ? n => unlocked([n]).length > 0 : () => true,
      likes: undefined,
      apart: undefined,
      deal: n => [
        {n, v: 'wide'},
        {n, v: 'macro'}
      ],
      face: (c, size) =>
        `<img src="${thumbSrc(c.n, c.v, size)}" alt="${esc(c.n)}, ${c.v === 'wide' ? 'colony' : 'corallites'}"><small>${c.v === 'wide' ? 'Colony' : DATA.gen[c.n].levels === 2 ? 'Close-up' : 'Corallites'}</small><b><i>${esc(c.n)}</i></b>`,
      aria: c => `${c.n}, ${c.v === 'wide' ? 'colony' : 'corallites'}`,
      credit: c => (typeof photoSrc === 'function' ? photoSrc(viewPhoto(c.n, c.v)) : ''),
      said: n => `<p><a href="${genLink(n)}"><i>${esc(n)}</i></a>: ${esc(tipsText(DATA.gen[n]))}</p>`,
      photo: c => (viewPhoto(c.n, c.v) || {}).f,
      seen: () => {}
    })
  },
  // The tree subjects (one view per unit): two photos of the unit that show it differently (memoryPhotos).
  photos: {
    title: 'Memory',
    lede: () => `Flip two cards. A pair is two photos of the same ${SUBJ.one}.`,
    open: () => {
      const {photo, seen} = labShots(12);
      let looks = [],
        used = new Set();
      return {
        // One naming tree a board (memoryTree): a species by common name beside a scientific genus or species is the same
        // taxon twice. A genus is scientific; a species is by its kind of name; a family is shared.
        names: () => (
          (looks = UNITS[SUBJ.id].pairs()),
          (used = new Set()),
          memoryTree(unlocked(), n => kindOf(n) || (rankOf(n) === 'genus' ? 'sci' : ''))
        ),
        // A unit plays only with two observations in play (gamePics: the draw's photos of it).
        met: n => new Set(gamePics(n, 'wide').map(labObs)).size >= 2,
        likes: n => looks.flatMap(([a, b]) => (a === n ? [b] : b === n ? [a] : [])),
        // Never two of one label, nor a unit with its own family or genus (both unlocked with the scientific names: its
        // photos are the other's, and a right pair would be refused).
        apart: (n, gens) => gens.every(g => !choiceNames(g, n) && !choiceNames(n, g) && !memoryKin(g, n, u => (GX(u) || {}).parent)),
        // Never one observation on two cards of a board.
        deal: n => {
          const L = memoryPhotos(n, photo, juvP);
          if (!L || L.some(p => used.has(labObs(p)))) return null;
          L.forEach(p => used.add(labObs(p)));
          return L.map(p => ({n, p}));
        },
        // The unit is named only once the pair is found (the name band is hidden until then, lab.css .pfront b), with the
        // photo's own species when it is finer than the unit (UNITS taxon).
        face: (c, size) => {
          const t = UNITS[SUBJ.id].taxon(c.p, c.n),
            sp = t && t.id !== c.n ? ` · ${esc(t.common || t.sci)}` : '';
          return `<img src="${c.p.xc && !c.p.r ? tileSrc(c.p) : img(c.p, size)}" data-lo="${img(c.p, 's')}"${c.p.f ? ` data-f="${esc(c.p.f)}"` : ''} alt="${esc(SUBJ.what)} photo"><b>${uname(c.n)}${sp}</b>`;
        },
        aria: () => `${SUBJ.what} photo`,
        credit: c => (typeof photoSrc === 'function' ? photoSrc(c.p) : ''),
        said: n => fbLine(n, n, true, []) || `<p>${uname(n)}</p>`,
        photo: c => c.p.f,
        seen: cards => seen(cards.map(c => c.p))
      };
    }
  }
};
LAB.add({
  id: 'pairs',
  icon: '▚',
  // Said with the subject's own kind of pair, at the time the page is drawn.
  get title() {
    return MEMORY[UNITS[SUBJ.id].memory].title;
  },
  blurb: 'A memory game: flip cards to match each unit with another photo of it. "Look-alike set" makes it hard.',
  get lede() {
    return MEMORY[UNITS[SUBJ.id].memory].lede();
  },
  render(root) {
    const K = MEMORY[UNITS[SUBJ.id].memory].open();
    // Difficulty = grid size (cards x rows); cards stretch to fill one screen.
    const LEVELS = {easy: [3, 4], medium: [4, 5], hard: [6, 8]};
    let mode = 'random',
      level = 'medium';
    const setup = () => {
      const [ga, gb] = LEVELS[level],
        np = (ga * gb) / 2;
      const dealt = memoryGenera(K.names(), np, mode === 'look', K.met, K.likes, K.apart)
        .map(n => ({n, c: K.deal(n)}))
        .filter(x => x.c);
      const gens = dealt.map(x => x.n);
      // Too few units unlocked for a game (a new player): the quiz opens them first.
      if (gens.length < 2) {
        root.innerHTML = `<p class="note">Memory pairs the ${esc(SUBJ.many)} you have met. Meet a few in the quiz first.</p><p><a class="next" href="${esc(hr('quiz'))}">Play the quiz</a></p>`;
        return;
      }
      const cards = shuffle(dealt.flatMap(x => x.c));
      K.seen(cards);
      let open = [],
        found = 0,
        moves = 0,
        lock = false;
      // Game layout: card grid left, controls and result in the side column (desktop); on phones and tablets the controls
      // shrink to one row above the grid and the status to one line, so the grid gets the screen.
      root.innerHTML = `<div class="pgame pmem bleed"><div class="pgwrap"><div class="pgrid">${cards.map((c, i) => `<div class="pcard" role="button" tabindex="0" data-i="${i}" aria-label="Hidden card"><span class="pin"><span class="pback"></span><span class="pfront">${K.face(c, document.documentElement.dataset.size === 'l' ? 'l' : 's')}</span></span></div>`).join('')}</div></div>
        <aside class="gside"><div class="seg" role="group" aria-label="Difficulty">${Object.entries(LEVELS)
          .map(
            ([k, [a, b]]) =>
              `<button type="button" data-l="${k}" aria-pressed="${level === k}">${k[0].toUpperCase() + k.slice(1)} <small>${a}×${b}</small></button>`
          )
          .join(
            ''
          )}</div><div class="seg" role="group" aria-label="${esc(SUBJ.many[0].toUpperCase() + SUBJ.many.slice(1))}"><button type="button" data-m="random" aria-pressed="${mode === 'random'}">Random</button><button type="button" data-m="look" aria-pressed="${mode === 'look'}">Look-alikes</button></div><button class="next sec pnew" type="button" id="pnew" aria-label="New game"><span aria-hidden="true">↻</span><span class="pnl"> New game</span></button><div class="pstatus"><span class="note" id="pstat">0 moves</span><div id="pres"></div></div></aside></div>`;
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
      // Fewer units unlocked than the level holds: the same columns, fewer rows.
      window.fitTiles &&
        fitTiles(root.querySelector('.pgrid'), level === 'hard' ? 6 : 10, [ga, Math.min(gb, Math.ceil(cards.length / ga))]);
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
            e.setAttribute('aria-label', K.aria(cards[i]));
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
                els[k].querySelector('.pfront').insertAdjacentHTML('beforeend', K.credit(cards[k]));
              });
              const fn = cards[a].n;
              root.querySelector('#pres').innerHTML = `${K.said(fn)}${
                typeof repBtn === 'function'
                  ? repBtn(
                      {
                        g: fn,
                        a: '',
                        ph: [a, b].map(k => K.photo(cards[k])).filter(Boolean),
                        m: 'pairs'
                      },
                      '⚑<span class="pnl"> Report a problem</span>'
                    )
                  : ''
              }`;
              // A tip longer than the two lines kept for it pushes the grid down: refit it so it still fits the screen. The
              // grid is fitted with 16 px to spare under it (quiz.js fitTiles), so it is refitted as soon as it eats into them.
              if (
                window.fitTiles &&
                root.querySelector('.pgrid').getBoundingClientRect().bottom > innerHeight - 16 - (typeof tabH === 'function' ? tabH() : 0)
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
