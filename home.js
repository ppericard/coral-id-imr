// Home page: two entry doors, nothing else.
//  1. Learn & practise: the learning phase (Learn the genera, then Practice on photos).
//  2. Identify: the tool for naming a coral under a ReefCloud point (the Coral ID Key).
// The section tabs and the Tools page (#tools) list every other tool.
(function () {
  // The photo shapes (width / height) that suit a landscape tile (home.css .hdtiles.land: near 3:2, mostly 1.4 to 1.8 as
  // the band's shape allows) without cutting the fish's head or tail: a photo wider than its tile loses some of its sides,
  // one narrower some of its top and bottom (object-fit: cover), so from 4:3 to 16:9 only a little of each.
  const LAND_AR = [1.3, 1.8];
  // A photo that suits a landscape tile: its shape (ar, width / height) within LAND_AR and the whole fish shown (its
  // judged tag, judging/FISH.md).
  const landOk = p => !!p && p.ar >= LAND_AR[0] && p.ar <= LAND_AR[1] && String(p.jt || '').charAt(1) === '1';
  // A unit's photo on a Home tile. Landscape tiles (UNITS land): Pierre's ★ Cover (coverP, app.js fishCurate) when it
  // suits the tile (Pierre, 2026-11-08, Q291: "the covers can go before the mosaic, but in landscape, it must fit well"),
  // else the first of its easiest, most reference-like photos (core.js easyRank, already in that order) that suits it,
  // else its first. Other tiles: the unit's card photo (cover()).
  const tilePhoto = (g, land) => {
    const L = g.views.wide;
    return land ? (landOk(g.coverP) ? g.coverP : L.slice(0, 10).find(landOk) || L[0]) : cover(g);
  };
  const ph = (n, v) => {
    const g = DATA.gen[n];
    if (!g) return '';
    const p = (g.views[v] || [])[0] || (g.views.macro || [])[0] || cover(g);
    return p ? thumb(p, '(max-width:599.98px) calc((100vw - 40px) / 4), 270px') : ''; // a phone tile: a quarter of the band
  };
  window.viewHome = function () {
    document.documentElement.dataset.page = 'lab'; // full width, like the Lab (lab.css)
    // Before the data (app.js beforeData: the corals' doors, UNITS doorsFirst), no names: the band stays empty until it comes.
    const names = DATA ? Object.keys(DATA.gen) : [],
      fish = !!DATA && !!(GX(slateGenera()[0]) || {}).name; // a subject whose units have names of their own (fish entries)
    // The subject switch (Pierre, 2026-11-04; docs/DESIGN.md "Subject switch"): one full-width Corals | Fish row above
    // the doors, the one relaxation of "two doors only" (rule U12), the twin of the header's switch (app.js
    // showSubj), one state. Only for a player with two subjects or more (app.js subjMine: the admin's only while fish is
    // in beta); the doors follow the subject on screen.
    const subj = subjMine().length > 1 ? `<div class="seg hsubj" role="group" aria-label="Subject">${subjBtns()}</div>` : '';
    // Door 1 art: a band of corallite close-ups, an illustration only (Pierre, 2026-11-03): its two buttons carry the door
    // (fish: a photo of each of 12 IMR families). Door 2 art: a real ReefCloud photo with its 5 points (Pierre's,
    // 2026-10-31), centred on the active point.
    // A quiet line in the Learn & practise door (Pierre, 2026-11-03): Coral basics for a player who has not done it and
    // has few answers (under CHOICE.ASK, core.js, the same bar as the first-launch question); gone once it is done.
    // Only for a subject that has a basics module (app.js basicsDue: Coral basics teaches coral words).
    const G = P[LEVEL] || {},
      // Not for a player who said they had the IMR course or know corals well (Pierre, 2026-11-04).
      said = (store.get(startKey(SUBJ.id), null) || {}).c,
      newb = basicsDue() && (G.ok || 0) + (G.ko || 0) < CHOICE.ASK && said !== 'imr' && said !== 'know';
    // A subject whose photos are wide (UNITS land: fish, Pierre 2026-11-08: "most fish are horizontal", square tiles cut
    // them) gets fewer, landscape tiles near 3:2 (home.css .hdtiles.land: as many as the band's shape takes), each family's
    // photo picked to suit them (tilePhoto: Pierre's cover when it suits the tile, else the first of its easiest that does).
    const land = !!UNITS[SUBJ.id].land;
    const tiles = fish
      ? shuffle(slateGenera().filter(n => GX(n).views.wide.length))
          .slice(0, 12)
          .map(
            n =>
              `<img ${thumb(tilePhoto(GX(n), land), land ? '(max-width:599.98px) calc((100vw - 40px) / 2), 260px' : '(max-width:599.98px) calc((100vw - 40px) / 4), 270px')} alt="" loading="lazy">`
          )
          .join('')
      : shuffle(names)
          .slice(0, 12)
          .map(g => `<img ${ph(g, 'macro')} alt="" loading="lazy">`)
          .join('');
    // Door 2, Identify: the current subject's tool only (Pierre, 2026-11-04; ROADMAP "Identify per subject"): the Coral ID
    // Key, or the Fish ID Key, coming soon (viewFishKey below), with a photo of one of the IMR families as its art.
    const key = UNITS[SUBJ.id].identify,
      // Its fish art, a landscape box too (home.css .hdart.rc.land, near 3:2 at every size, so the whole fish shows): the
      // same photo a tile would show (tilePhoto, Q291).
      fp = fish && ((n => n && tilePhoto(GX(n), land))(shuffle(slateGenera().filter(n => GX(n).views.wide.length))[0]) || null),
      fishArt = fp
        ? `<img ${thumb(fp, land ? '(max-width:599.98px) 184px, 520px' : '(max-width:599.98px) 96px, 520px')} alt="" loading="lazy">`
        : '';
    const idoor = fish
      ? `
        <section class="hdoor identify">
          <a class="hdart rc${land ? ' land' : ''}" href="${esc(hr(key))}" tabindex="-1" aria-hidden="true">${fishArt}</a>
          <div class="hdbody">
            <p class="hdwhen">In EventMeasure<span class="wide"> · or a photo from your dive</span></p>
            <h2>Identify a fish</h2>
            <p class="hddesc">The Fish ID Key is on its way: it will help you name the fish on the IMR survey videos, or in your own photos.</p>
            <div class="hdacts">
              <a class="hdbtn" href="${esc(hr(key))}"><b>Fish ID Key</b><small>Coming soon</small></a>
            </div>
          </div>
        </section>`
      : `
        <section class="hdoor identify">
          <a class="hdart rc" href="${esc(hr(key))}" tabindex="-1" aria-hidden="true"><img src="${photoUrl('img/reefcloud-example-m.webp')}" srcset="${photoUrl('img/reefcloud-example-m.webp')} 760w${saver() ? '' : `, ${photoUrl('img/reefcloud-example.webp')} 1240w`}" sizes="(max-width:599.98px) 92vw, 920px" alt="" loading="lazy"></a>
          <div class="hdbody">
            <p class="hdwhen">On ReefCloud<span class="wide"> · or a photo from your dive</span></p>
            <h2>Identify a coral</h2>
            <p class="hddesc">Start from the growth form, add the clues you can see, then compare the candidate genera side by side to name the one under the ReefCloud point, or in your own photo.</p>
            <div class="hdacts">
              <a class="hdbtn" href="${esc(hr(key))}"><b>Open the Coral ID Key</b><small>Growth form, clues, then a visual comparison</small></a>
            </div>
          </div>
        </section>`;
    $v.innerHTML = `<p class="lede">Two ways in. Learn &amp; practise while you are learning the ${SUBJ.many}; Identify when you need to name ${fish ? 'a fish on a survey video' : 'a coral on a ReefCloud photo'}, or one you photographed on a dive.</p><div class="home-page">${subj}
      <div class="hdoors">
        <section class="hdoor learn${newb ? ' newb' : ''}">
          <a class="hdart" href="${esc(hr('quiz'))}" tabindex="-1" aria-hidden="true"><span class="hdtiles${land ? ' land' : ''}">${tiles}</span></a>
          <div class="hdbody">
            <p class="hdwhen">Learning phase<span class="wide"> · before ${fish ? 'EventMeasure' : 'ReefCloud'} or your next dive</span></p>${newb ? '<a class="hdnewk" href="' + esc(hr('basics')) + '" title="New to corals? Start with the basics (5 min)">New to corals? Basics in 5 min ›</a>' : ''}
            <h2>Learn &amp; practise</h2>
            <p class="hddesc">Get to know the ${SUBJ.many}, then train your eye on photos<span class="wide"> until you recognise each one at a glance</span>. Your progress is saved as you go.</p>
            <div class="hdacts">
              <a class="hdbtn" href="${esc(hr('genera'))}"><svg class="hdi" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5zM12 6.5v13"/></svg><b><em>1</em> Learn</b><small>${fish ? 'The IMR fish families by identification group, with the IMR cues' : 'One sheet per genus: photos<span class="wide"> at 3 scales</span>, IMR ID tips, look-alikes'}</small></a>
              <a class="hdbtn main" href="${esc(hr('quiz'))}"><svg class="hdi" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/></svg><b><em>2</em> Practice</b><small>${fish ? 'Name the family from photos' : 'Name the genus from photos<span class="wide"> (all genera or the ones you pick)</span>, look-alike duels, memory'}</small></a>
            </div>${newb ? '<p class="hdnew"><a href="' + esc(hr('basics')) + '">New to corals? Start with the basics (5 min) ›</a></p>' : ''}
          </div>
        </section>
${idoor}
      </div>
      <p class="hcred">By Pierre Pericard · for ${esc(ORG.short)} · <a href="${esc(hr('about'))}">Credits</a></p>
    </div>`;
  };
  // The Fish ID Key, coming soon (Pierre, 2026-11-04: Identify shows the current subject's tool only, "Fish ID Key, coming
  // soon" in fish mode; ROADMAP "Fish ID Key for EventMeasure"). The Coral ID Key is reached through the subject switch.
  window.viewFishKey = function () {
    $v.innerHTML = `<div class="keysoon">
      <svg class="ksi" viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.4-4.4"/></svg>
      <h3>Fish ID Key</h3>
      <p class="kswhen">Coming soon</p>
      <p>A key to name the fish on the IMR survey videos and in your own photos, as the Coral ID Key does for corals.</p>
      <p><a class="next" href="${esc(hr('genera'))}">Learn the fish families</a></p>
    </div>`;
  };
  // About and credits (Pierre, 2026-11-03): no credits block on the pages, only the one-line credit at the bottom of Home
  // and this page, linked from it and from the ? help of every page. Each photo keeps its own credit (rule P5).
  // The Coral Finder book is cited as a reference (References), never credited as a source of the app's content: its
  // content is not reproduced (Pierre, 2026-11-03, a rights question). The Home credit line does not name it.
  window.viewAbout = function () {
    const inat = 'https://www.inaturalist.org',
      ab = subjMine() // the other subjects open to this player add their lines (app.js UNITS about); the corals' are below
        .map(S => UNITS[S.id].about)
        .filter(Boolean);
    $v.innerHTML = `<h2 class="vh">About and credits</h2><div class="about">
      <section>
        <h3>Who made it</h3>
        <p>${esc(ORG.app)} is made by <b>Pierre Pericard</b> (website and interface), to train the Research Assistants of the ${esc(ORG.name)} (${esc(ORG.short)}), Dauin, Philippines, to name coral genera${ab.map(a => ' and ' + a.who).join('')} on photos and on dives.</p>
      </section>
      <section>
        <h3>Course content</h3>
        <p>The list of genera, the ID tips, the lecture notes and the lecture photos come from <b>IMR Lecture 6</b>, the IMR coral identification lecture. Any other source is named where it is used, for example under “Other sources” on a genus sheet.${ab.map(a => ' ' + a.course).join('')}</p>
      </section>
      <section>
        <h3>Photos</h3>
        <p>Most photos are those of <a href="${inat}" target="_blank" rel="noopener">iNaturalist</a> observers, Pierre Pericard among them, who share them under <a href="https://creativecommons.org/share-your-work/cclicenses/" target="_blank" rel="noopener">Creative Commons licences</a>: CC0, CC BY or CC BY-NC. Some are cropped. Many thanks to them.${ab.map(a => (a.photos ? ' ' + a.photos : '')).join('')}</p>
        <p>Coral photos also come from IMR Lecture 6, for IMR’s internal training. Their rights are uncertain, as many were not taken by IMR: they are being traced to their original sources, to be credited or replaced.</p>
        <p>Every photo keeps its own credit: enlarge a photo to see its author and licence, with a link to its original page.</p>
      </section>
      <section>
        <h3>References</h3>
        <p>Works cited in the app, by page or by link:</p>
        <ul>
          <li>Russell Kelley, <i>Coral Finder 2022</i> (Indo-Pacific), BYOGUIDES: an ID guide, cited by page on genus sheets and look-alike pairs.</li>
          ${ab.map(a => a.refs).join('')}
          <li><a href="https://www.marinespecies.org" target="_blank" rel="noopener">World Register of Marine Species (WoRMS)</a> and <a href="${inat}" target="_blank" rel="noopener">iNaturalist</a>, linked from every genus sheet.</li>
        </ul>
      </section>
      <section>
        <h3>Privacy</h3>
        <p>No ads, no cookies, no third-party analytics. The app counts which pages you open, with your answers, and reports how it loads and any error it meets, to improve the course. Your progress stays in this browser unless you sign in. Your answers in the games help rate how hard each photo is: they are sent without your name unless you sign in.</p>
        <p><a href="privacy.html">Read the privacy notice</a> · <a href="${hr('delete-account')}">Delete my account</a></p>
      </section>
      <section>
        <h3>Feedback</h3>
        <p>A mistake, a bug or an idea? It goes straight to Pierre. ${typeof repBtn === 'function' ? repBtn({k: 'page'}, 'Send feedback') : ''}</p>
      </section>
      <p class="note">Fonts: Source Sans 3 and Barlow Condensed (SIL Open Font License).</p>
    </div>`;
  };
})();
