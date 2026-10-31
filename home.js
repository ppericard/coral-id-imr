// Home page: two entry doors, nothing else.
//  1. Learn & practise: the learning phase (Learn the genera, then Practice on photos).
//  2. Identify: the tool for naming a coral under a ReefCloud point (the Coral Finder).
// The section tabs and the Tools page (#lab) list every other tool.
(function(){
  const ph = (n, v) => { const g = DATA.gen[n]; if (!g) return ''; const p = (g.views[v] || [])[0] || (g.views.macro || [])[0] || cover(g); return p ? img(p, 's') : ''; };
  window.viewHome = function(){
    document.documentElement.dataset.page = 'lab';  // full width, like the Lab (lab.css)
    const names = Object.keys(DATA.gen);
    // Door 1 art: a band of corallite close-ups. Door 2 art: one colony photo with ReefCloud-style points.
    const tiles = shuffle(names).slice(0, 12).map(g => `<img src="${ph(g, 'macro')}" alt="" loading="lazy">`).join('');
    const pts = [[22, 30], [50, 24], [78, 34], [30, 68], [58, 62], [84, 72]];
    $v.innerHTML = `<p class="lede">Two ways in. Learn &amp; practise while you are learning the genera; Identify when you need to name a coral on a ReefCloud photo.</p><div class="home-page">
      <div class="hdoors">
        <section class="hdoor learn">
          <a class="hdart" href="#quiz" tabindex="-1" aria-hidden="true"><span class="hdtiles">${tiles}</span></a>
          <div class="hdbody">
            <p class="hdwhen">Learning phase · before ReefCloud</p>
            <h3>Learn &amp; practise</h3>
            <p class="hddesc">Get to know the genera, then train your eye on photos until you recognise each one at a glance. Your progress is saved as you go.</p>
            <div class="hdacts">
              <a class="hdbtn" href="#genera"><b><em>1</em> Learn</b><small>One sheet per genus: photos at 3 scales, IMR ID tips, look-alikes</small></a>
              <a class="hdbtn main" href="#quiz"><b><em>2</em> Practice</b><small>Name the genus from photos, look-alike duels, memory</small></a>
            </div>
          </div>
        </section>
        <section class="hdoor identify">
          <a class="hdart" href="#finder" tabindex="-1" aria-hidden="true"><img src="${ph('Pocillopora', 'wide')}" alt="" loading="lazy">${pts.map(([x, y], i) => `<i class="hdpt${i === 4 ? ' on' : ''}" style="left:${x}%;top:${y}%"></i>`).join('')}</a>
          <div class="hdbody">
            <p class="hdwhen">On ReefCloud · when a point stumps you</p>
            <h3>Identify a coral</h3>
            <p class="hddesc">Start from the growth form, add the clues you can see, then compare the candidate genera side by side to name the one under the point.</p>
            <div class="hdacts">
              <a class="hdbtn main" href="#finder"><b>Open the Coral Finder</b><small>Growth form, clues, then a visual comparison</small></a>
            </div>
          </div>
        </section>
      </div>
    </div>`;
  };
})();
