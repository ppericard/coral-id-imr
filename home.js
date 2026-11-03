// Home page: two entry doors, nothing else.
//  1. Learn & practise: the learning phase (Learn the genera, then Practice on photos).
//  2. Identify: the tool for naming a coral under a ReefCloud point (the Coral Finder).
// The section tabs and the Tools page (#lab) list every other tool.
(function () {
  const ph = (n, v) => {
    const g = DATA.gen[n];
    if (!g) return '';
    const p = (g.views[v] || [])[0] || (g.views.macro || [])[0] || cover(g);
    return p ? thumb(p, '(max-width:599.98px) 80px, 270px') : '';
  };
  window.viewHome = function () {
    document.documentElement.dataset.page = 'lab'; // full width, like the Lab (lab.css)
    const names = Object.keys(DATA.gen),
      fish = !!(GX(slateGenera()[0]) || {}).name; // a subject whose units have names of their own (fish entries)
    // Door 1 art: a band of corallite close-ups (fish: a photo of each of 12 IMR families). Door 2 art: a real ReefCloud
    // photo with its 5 points (Pierre's, 2026-10-31), centred on the active point.
    const tiles = fish
      ? shuffle(slateGenera().filter(n => GX(n).views.wide.length))
          .slice(0, 12)
          .map(n => `<img ${thumb(GX(n).views.wide[0], '(max-width:599.98px) 80px, 270px')} alt="" loading="lazy">`)
          .join('')
      : shuffle(names)
          .slice(0, 12)
          .map(g => `<img ${ph(g, 'macro')} alt="" loading="lazy">`)
          .join('');
    // The subject (core.js SUBJECTS): what Learn & practise teaches; Identify stays the Coral Finder.
    const subj = `<div class="seg hsubj" role="group" aria-label="Subject">${SUBJECTS.map(
      S => `<button type="button" data-subj="${S.id}" aria-pressed="${S === SUBJ}">${S.name}</button>`
    ).join('')}</div>`;
    $v.innerHTML = `<p class="lede">Two ways in. Learn &amp; practise while you are learning the ${SUBJ.many}; Identify when you need to name a coral on a ReefCloud photo. Corals or Fish at the top: each has its own progress.</p><div class="home-page">${subj}
      <div class="hdoors">
        <section class="hdoor learn">
          <a class="hdart" href="#quiz" tabindex="-1" aria-hidden="true"><span class="hdtiles">${tiles}</span></a>
          <div class="hdbody">
            <p class="hdwhen">Learning phase · before ReefCloud</p>
            <h2>Learn &amp; practise</h2>
            <p class="hddesc">Get to know the ${SUBJ.many}, then train your eye on photos until you recognise each one at a glance. Your progress is saved as you go.</p>
            <div class="hdacts">
              <a class="hdbtn" href="#genera"><b><em>1</em> Learn</b><small>${fish ? 'The IMR fish families by shape group, with the IMR cues' : 'One sheet per genus: photos at 3 scales, IMR ID tips, look-alikes'}</small></a>
              <a class="hdbtn main" href="#quiz"><b><em>2</em> Practice</b><small>${fish ? 'Name the family from photos' : 'Name the genus from photos, look-alike duels, memory'}</small></a>
            </div>
          </div>
        </section>
        <section class="hdoor identify">
          <a class="hdart rc" href="#finder" tabindex="-1" aria-hidden="true"><img src="${photoUrl('img/reefcloud-example-m.webp')}" srcset="${photoUrl('img/reefcloud-example-m.webp')} 760w${saver() ? '' : `, ${photoUrl('img/reefcloud-example.webp')} 1240w`}" sizes="(max-width:599.98px) 92vw, 920px" alt="" loading="lazy"></a>
          <div class="hdbody">
            <p class="hdwhen">On ReefCloud · when a point stumps you</p>
            <h2>Identify a coral</h2>
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
