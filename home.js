// Home page: a slim hero (Start practising first), the 3-step learning path and one discreet Lab link.
// The section tabs list every tool; the Lab page lists the prototypes.
(function(){
  const ph = (n, v) => { const g = DATA.gen[n]; if (!g) return ''; const p = (g.views[v] || [])[0] || (g.views.macro || [])[0] || cover(g); return p ? img(p, 's') : ''; };
  window.viewHome = function(){
    document.documentElement.dataset.page = 'lab';  // full width, like the Lab (lab.css)
    const names = Object.keys(DATA.gen);
    // Home = hero (Practice first: RAs go to Practice almost at once) + the 3-step path + one discreet Lab link.
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
      <p class="hlablink"><a href="#lab">Lab: experiments in progress ›</a></p>
    </div>`;
  };
})();
