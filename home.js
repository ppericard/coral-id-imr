// Home page: two entry doors, nothing else.
//  1. Learn & practise: the learning phase (Learn the genera, then Practice on photos).
//  2. Identify: the tool for naming a coral under a ReefCloud point (the Coral Finder).
// The section tabs and the Tools page (#lab) list every other tool.
(function () {
  const ph = (n, v) => {
    const g = DATA.gen[n];
    if (!g) return '';
    const p = (g.views[v] || [])[0] || (g.views.macro || [])[0] || cover(g);
    return p ? thumb(p, '(max-width:599.98px) calc((100vw - 40px) / 4), 270px') : ''; // a phone tile: a quarter of the band
  };
  window.viewHome = function () {
    document.documentElement.dataset.page = 'lab'; // full width, like the Lab (lab.css)
    const names = Object.keys(DATA.gen),
      fish = !!(GX(slateGenera()[0]) || {}).name; // a subject whose units have names of their own (fish entries)
    // Door 1 art: a band of corallite close-ups, an illustration only (Pierre, 2026-11-03): its two buttons carry the door
    // (fish: a photo of each of 12 IMR families). Door 2 art: a real ReefCloud photo with its 5 points (Pierre's,
    // 2026-10-31), centred on the active point.
    // A quiet line in the Learn & practise door (Pierre, 2026-11-03): Coral basics for a player who has not done it and
    // has few answers (under CHOICE.ASK, core.js, the same bar as the first-launch question); gone once it is done.
    // Corals only (CHOICE.SUBJ): Coral basics teaches coral words.
    const G = P[LEVEL] || {},
      newb = SUBJ.id === CHOICE.SUBJ && !basicsDone() && (G.ok || 0) + (G.ko || 0) < CHOICE.ASK;
    const tiles = fish
      ? shuffle(slateGenera().filter(n => GX(n).views.wide.length))
          .slice(0, 12)
          .map(n => `<img ${thumb(GX(n).views.wide[0], '(max-width:599.98px) calc((100vw - 40px) / 4), 270px')} alt="" loading="lazy">`)
          .join('')
      : shuffle(names)
          .slice(0, 12)
          .map(g => `<img ${ph(g, 'macro')} alt="" loading="lazy">`)
          .join('');
    // The subject (core.js SUBJECTS): what Learn & practise teaches, so its switch sits in that door's top line (Home
    // stays one screen on a 360 x 640 phone); Identify stays the Coral Finder. A subject in beta (SUBJECTS beta) says so on
    // its button, in the door's top line (kick) and description (line).
    const subj = `<div class="seg hsubj" role="group" aria-label="Subject">${SUBJECTS.map(
      S =>
        `<button type="button" data-subj="${S.id}" aria-pressed="${S === SUBJ}">${S.name}${S.beta ? ' <small class="beta">beta</small>' : ''}</button>`
    ).join('')}</div>`;
    $v.innerHTML = `<p class="lede">Two ways in. Learn &amp; practise while you are learning the ${SUBJ.many}; Identify when you need to name a coral on a ReefCloud photo, or one you photographed on a dive. Corals or Fish, in the first door: each has its own progress.</p><div class="home-page">
      <div class="hdoors">
        <section class="hdoor learn${newb ? ' newb' : ''}">
          <a class="hdart" href="#quiz" tabindex="-1" aria-hidden="true"><span class="hdtiles">${tiles}</span></a>
          <div class="hdbody">
            <div class="hdtop"><p class="hdwhen">${SUBJ.beta ? SUBJ.beta.kick : 'Learning phase<span class="wide"> · before ReefCloud or your next dive</span>'}</p>${subj}</div>
            <h2>Learn &amp; practise</h2>
            <p class="hddesc">${SUBJ.beta ? SUBJ.beta.line : `Get to know the ${SUBJ.many}, then train your eye on photos<span class="wide"> until you recognise each one at a glance</span>. Your progress is saved as you go.`}</p>
            <div class="hdacts">
              <a class="hdbtn" href="#genera"><svg class="hdi" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5zM12 6.5v13"/></svg><b><em>1</em> Learn</b><small>${fish ? 'The IMR fish families by shape group, with the IMR cues' : 'One sheet per genus: photos<span class="wide"> at 3 scales</span>, IMR ID tips, look-alikes'}</small></a>
              <a class="hdbtn main" href="#quiz"><svg class="hdi" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/></svg><b><em>2</em> Practice</b><small>${fish ? 'Name the family from photos' : 'Name the genus from photos<span class="wide"> (all genera or the ones you pick)</span>, look-alike duels, memory'}</small></a>
            </div>${newb ? '<p class="hdnew"><a href="#basics">New to corals? Start with the basics (5 min) ›</a></p>' : ''}
          </div>
        </section>
        <section class="hdoor identify">
          <a class="hdart rc" href="#finder" tabindex="-1" aria-hidden="true"><img src="${photoUrl('img/reefcloud-example-m.webp')}" srcset="${photoUrl('img/reefcloud-example-m.webp')} 760w${saver() ? '' : `, ${photoUrl('img/reefcloud-example.webp')} 1240w`}" sizes="(max-width:599.98px) 92vw, 920px" alt="" loading="lazy"></a>
          <div class="hdbody">
            <p class="hdwhen">On ReefCloud<span class="wide"> · or a photo from your dive</span></p>
            <h2>Identify a coral</h2>
            <p class="hddesc">Start from the growth form, add the clues you can see, then compare the candidate genera side by side to name the one under the ReefCloud point, or in your own photo.</p>
            <div class="hdacts">
              <a class="hdbtn" href="#finder"><b>Open the Coral Finder</b><small>Growth form, clues, then a visual comparison</small></a>
            </div>
          </div>
        </section>
      </div>
      <p class="hcred">By Pierre Pericard · for ${esc(ORG.short)} · <a href="#about">Credits</a></p>
    </div>`;
  };
  // About and credits (Pierre, 2026-11-03): no credits block on the pages, only the one-line credit at the bottom of Home
  // and this page, linked from it and from the ? help of every page. Each photo keeps its own credit (AGENTS.md rule 11).
  // The Coral Finder book is cited as a reference (References), never credited as a source of the app's content: its
  // content is not reproduced (Pierre, 2026-11-03, a rights question). The Home credit line does not name it.
  window.viewAbout = function () {
    const inat = 'https://www.inaturalist.org';
    $v.innerHTML = `<h2 class="vh">About and credits</h2><div class="about">
      <section>
        <h3>Who made it</h3>
        <p>${esc(ORG.app)} is made by <b>Pierre Pericard</b> (website and interface), to train the Research Assistants of the ${esc(ORG.name)} (${esc(ORG.short)}), Dauin, Philippines, to name coral genera on photos and on dives.</p>
      </section>
      <section>
        <h3>Course content</h3>
        <p>The list of genera, the ID tips, the lecture notes and the lecture photos come from <b>IMR Lecture 6</b>, the IMR coral identification lecture. Any other source is named where it is used, for example under “Other sources” on a genus sheet.</p>
      </section>
      <section>
        <h3>Photos</h3>
        <p>Besides the IMR lecture photos, most photos are Pierre Pericard’s own and those of <a href="${inat}" target="_blank" rel="noopener">iNaturalist</a> observers, who share them under <a href="https://creativecommons.org/share-your-work/cclicenses/" target="_blank" rel="noopener">Creative Commons licences</a> (CC BY, CC BY-NC, CC BY-SA, CC BY-NC-SA or CC0). Many thanks to them.</p>
        <p>Every photo keeps its own credit: enlarge a photo to see its author and licence, with a link to the original observation.</p>
      </section>
      <section>
        <h3>References</h3>
        <p>Works cited in the app, by page or by link:</p>
        <ul>
          <li>Russell Kelley, <i>Coral Finder 2022</i> (Indo-Pacific), BYOGUIDES: an ID guide, cited by page on genus sheets and look-alike pairs.</li>
          <li><a href="https://www.marinespecies.org" target="_blank" rel="noopener">World Register of Marine Species (WoRMS)</a> and <a href="${inat}" target="_blank" rel="noopener">iNaturalist</a>, linked from every genus sheet.</li>
        </ul>
      </section>
      <section>
        <h3>Privacy</h3>
        <p>No ads, no cookies, no third-party analytics. The app counts which pages you open, with your answers, to improve the course. Your progress stays in this browser unless you sign in. Your answers in the games help rate how hard each photo is: they are sent without your name unless you sign in.</p>
        <p><a href="privacy.html">Read the privacy notice</a></p>
      </section>
      <section>
        <h3>Feedback</h3>
        <p>A mistake, a bug or an idea? It goes straight to Pierre. ${typeof repBtn === 'function' ? repBtn({k: 'page'}, 'Send feedback') : ''}</p>
      </section>
      <p class="note">Fonts: Source Sans 3 and Barlow Condensed (SIL Open Font License).</p>
    </div>`;
  };
})();
