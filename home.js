// Home page: a slim hero (Start practising first), the 3-step learning path, one look-alike pair to compare
// (photos + IMR ID tips, another pair on demand) and one discreet link to the Tools page (#lab).
// The section tabs list every tool; the Lab page lists the prototypes.
(function(){
  const ph = (n, v) => { const g = DATA.gen[n]; if (!g) return ''; const p = (g.views[v] || [])[0] || (g.views.macro || [])[0] || cover(g); return p ? img(p, 's') : ''; };
  window.viewHome = function(){
    document.documentElement.dataset.page = 'lab';  // full width, like the Lab (lab.css)
    const names = Object.keys(DATA.gen);
    // Home = hero (Practice first: RAs go to Practice almost at once) + the 3-step path + one discreet link to the Tools page (#lab).
    // The hero: one slim band of corallite tiles (16 genera, 8 on phones) behind a title and two buttons.
    $v.innerHTML = `<div class="home-page">
      <section class="hhero">
        <div class="hmosaic" aria-hidden="true">${shuffle(names).slice(0, 16).map((n, i) => `<a href="#g-${encodeURIComponent(n)}" tabindex="-1" style="--i:${i}"><img src="${ph(n, 'macro')}" alt="" loading="lazy"><span>${esc(n)}</span></a>`).join('')}</div>
        <div class="hintro">
          <h2>The 39 coral genera of the IMR slate</h2>
          <p class="hcta"><a class="next" href="#quiz">Start practising</a> <a class="chip" href="#genera">Browse the genera</a></p>
        </div>
      </section>
      <nav class="hpath" aria-label="How to use the app"><ol>${[['genera', 'Learn', 'Discover the 39 genera', 'Acropora', 'medium'], ['quiz', 'Practice', 'Train your eye with games', 'Platygyra', 'macro'], ['finder', 'Identify', 'Name a coral on your photos', 'Pocillopora', 'wide']]
        .map(([h, t, d, n, v]) => `<li><a href="#${h}"><img src="${ph(n, v)}" alt="" loading="lazy"><span><b>${t}</b><small>${d}</small></span></a></li>`).join('')}</ol></nav>
      <section class="hpair" id="hpair"></section>
      <p class="hlablink"><a href="#lab">More tools ›</a></p>
    </div>`;
    pairBlock();
  };
  // One look-alike pair (from the genera's own look-alike lists), both sides equal: 2 photos + the short ID tips.
  const pairs = () => { const out = []; for (const a of Object.keys(DATA.gen)) for (const b of lookOf(a)) if (a < b) out.push([a, b]); return out; };
  let last = '';
  function pairBlock(){
    const box = document.getElementById('hpair'); if (!box) return;
    const all = pairs(); if (!all.length) { box.remove(); return; }
    let pr; do { pr = all[Math.floor(Math.random() * all.length)]; } while (all.length > 1 && pr.join('|') === last);
    last = pr.join('|');
    const side = n => { const g = DATA.gen[n], c = cover(g), m = (g.views.macro || [])[0];
      return `<div class="hpside"><a class="hpph" href="#g-${encodeURIComponent(n)}">${[c, m].filter(Boolean).map(p => `<img src="${img(p, 's')}" alt="${esc(n)}" loading="lazy">`).join('')}</a>
        <h4><a href="#g-${encodeURIComponent(n)}"><i>${esc(n)}</i></a></h4>${tipsList(g)}</div>`; };
    box.innerHTML = `<div class="hphead"><h3>Don't confuse</h3><span><a class="chip" href="#cmp-${esc(pr[0])}|${esc(pr[1])}">Compare in detail</a> <button type="button" class="chip" id="hpnext">Another pair ↻</button></span></div>
      <div class="hpgrid">${side(pr[0])}<b class="hpvs">vs</b>${side(pr[1])}</div>`;
    box.querySelector('#hpnext').onclick = pairBlock;
  }
})();
