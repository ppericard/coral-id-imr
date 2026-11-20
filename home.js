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
  // Never a juvenile (app.js juvP: a juvenile is never a cover), but the admin's ★ Cover on one he confirmed (cj: app.js
  // treeCurate). Never a photo tagged with a visible watermark or text (its judged flag w: Home skips them, the games
  // keep them), a ★ Cover included, even one kept as a cover in the admin (autosort.js fishCoverW: the Keep holds the
  // cover elsewhere, never on Home): homeOk.
  const homeOk = p => !!p && !/w/.test(String(p.jt || '').slice(7));
  const landOk = p => homeOk(p) && p.ar >= LAND_AR[0] && p.ar <= LAND_AR[1] && String(p.jt || '').charAt(1) === '1' && (!juvP(p) || !!p.cj);
  // A photo served from R2 (onR2), not one still remote (r: 1 with its online original: fish-photos.json, the stopgap's),
  // which app.js thumb takes from iNaturalist or FishBase at ~500 px, without R2's sizes, srcset or Saver.
  const onR2 = p => !(p.r && p.src),
    landR2 = p => landOk(p) && onR2(p);
  // A unit's photo on a Home tile. Landscape tiles (UNITS land): the admin's ★ Cover (coverP, app.js treeCurate) when it
  // suits the tile (docs/ARCHITECTURE.md "Fish content": the cover first, if it fits a landscape tile),
  // else the first of its easiest, most reference-like photos (core.js easyRank, already in that order) that suits it, one
  // on R2 first (before fish-game.json is in, app.js fishHome, every photo is remote: then one that suits it all the same),
  // else its first that is not a juvenile (app.js adultFirst), never one with a watermark (homeOk). Other tiles: the
  // unit's card photo (cover()). A unit whose photos all carry a watermark is not drawn on Home (homeUnit).
  const tilePhoto = (g, land) => {
    const L = g.views.wide.slice(0, 10);
    return land ? (landOk(g.coverP) ? g.coverP : L.find(landR2) || L.find(landOk) || adultFirst(g.views.wide.filter(homeOk))) : cover(g);
  };
  const homeUnit = n => GX(n).views.wide.some(homeOk);
  // The Learn band rotates, for variety, instead of always the same photo per family: a landscape tile shows, each day,
  // one of its unit's photos on R2 that suit it (landR2), picked from landPool: the ★ Cover first, then its reference
  // photos (core.js refLevel) in the game's easy order, at most LAND_ROT in all. A unit with none keeps tilePhoto's.
  const LAND_ROT = 6;
  const landPool = g => {
    const out = landR2(g.coverP) ? [g.coverP] : [];
    for (const p of g.views.wide) {
      if (out.length >= LAND_ROT) break;
      if (p !== g.coverP && landR2(p) && refLevel(p)) out.push(p);
    }
    return out;
  };
  // The pick is the day's (dayPick: unit n and the local date, hashed), the same at every drawing of that day: the service
  // worker keeps photos cache-first (sw.js), so a family drawn again that day comes from the phone's cache. Home still
  // draws 12 of its families at random, so new ones are asked for until most families were drawn that day (a new pick at
  // every drawing would ask R2 for some 7 new photos at each visit).
  const dayPick = (L, n, now = Date.now()) => {
    if (!L.length) return null;
    const d = new Date(now),
      s = `${n}|${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
    return L[h % L.length];
  };
  const bandPhoto = (g, land, n, now) => (land && dayPick(landPool(g), n, now)) || tilePhoto(g, land);
  const ph = (n, v) => {
    const g = DATA.gen[n];
    if (!g) return '';
    const p = (g.views[v] || [])[0] || (g.views.macro || [])[0] || cover(g);
    return p ? thumb(p, '(max-width:599.98px) calc((100vw - 40px) / 4), 270px') : ''; // a phone tile: a quarter of the band
  };
  window.viewHome = function () {
    document.documentElement.dataset.page = 'lab'; // as the Lab pages set it (proto/lab.js); no stylesheet reads it
    // Before the data (app.js beforeData: the corals' doors, UNITS doorsFirst), no names: the band stays empty until it comes.
    const names = DATA ? Object.keys(DATA.gen) : [],
      fish = !!DATA && !!(GX(slateGenera()[0]) || {}).name, // a subject whose units have names of their own (fish entries)
      // its words where they are not the corals' (app.js UNITS door: the fish's, the sea slugs')
      W = UNITS[SUBJ.id].door || {};
    // The subject switch (docs/DESIGN.md "Subject switch"): one full-width Corals | Fish row above
    // the doors, the one relaxation of "two doors only" (rule U12), the twin of the header's switch (app.js
    // showSubj), one state. Only for a player with two subjects or more (app.js subjMine: the admin's only while fish is
    // in beta); the doors follow the subject on screen.
    const subj = subjMine().length > 1 ? `<div class="seg hsubj" role="group" aria-label="Subject">${subjBtns()}</div>` : '';
    // Door 1 art: a band of corallite close-ups, an illustration only: its two buttons carry the door (fish: a photo of
    // each of 12 IMR families). Door 2 art: a real ReefCloud photo with its 5 points (Pierre's own), centred on the active
    // point.
    // A quiet line in the Learn & practise door: Coral basics for a player who has not done it and
    // has few answers (under CHOICE.ASK, core.js, the same bar as the first-launch question); gone once it is done.
    // Only for a subject that has a basics module (app.js basicsDue: Coral basics teaches coral words).
    const G = P[LEVEL] || {},
      // Not for a player who said they had the IMR course or know corals well.
      said = (store.get(startKey(SUBJ.id), null) || {}).c,
      newb = basicsDue() && (G.ok || 0) + (G.ko || 0) < CHOICE.ASK && said !== 'imr' && said !== 'know';
    // The What I learn card's link on the door's kicker row (Pierre, 2026-11-18, Q400 D: a Home line opens the card on My
    // progress; on the kicker row it costs Home no height, so Home still fits one screen from 360 x 640): for a subject
    // with a names row (app.js learnRows), opening the card (window.WIL_ASK: a tap before progress.js loads still counts).
    const wil = typeof learnRows === 'function' && learnRows().length > 0;
    // A subject whose photos are wide (UNITS land: most fish are horizontal, and square tiles cut them; docs/DESIGN.md)
    // gets fewer, landscape tiles near 3:2 (home.css .hdtiles.land: as many as the band's shape takes), each family's
    // photo picked to suit them, one of several, the day's (bandPhoto: the cover or a reference photo that suits the
    // tile; none, tilePhoto: the first of its easiest that does).
    const land = !!UNITS[SUBJ.id].land;
    const tiles = fish
      ? shuffle(slateGenera().filter(homeUnit))
          .slice(0, 12)
          .map(
            n =>
              `<img ${thumb(bandPhoto(GX(n), land, n), land ? '(max-width:599.98px) calc((100vw - 40px) / 2), 260px' : '(max-width:599.98px) calc((100vw - 40px) / 4), 270px')} alt="" loading="lazy">`
          )
          .join('')
      : shuffle(names)
          .slice(0, 12)
          .map(g => `<img ${ph(g, 'macro')} alt="" loading="lazy">`)
          .join('');
    // Before the data (app.js beforeData) the Identify door's photo waits too, dark like the band: drawn at once, its 60 KB
    // shared the slow line with data.json and the curation and put the band ~5 s later at 86 kbit/s (tools/perf.js field).
    // Door 2, Identify: the current subject's tool only (docs/ARCHITECTURE.md): the Coral ID
    // Key, or the Fish ID Key, coming soon (viewFishKey below), with a photo of one of the IMR families as its art. A
    // subject with no key built (the sea slugs: UNITS identify unset, app.js keyOf) has no such door: Home is the Learn door
    // alone (class `one`), never a door to a page that is not there.
    const key = keyOf(SUBJ),
      // Its fish art, a landscape box too (home.css .hdart.rc.land, near 3:2 at every size, so the whole fish shows): the
      // same photo a tile would show (tilePhoto).
      fp = key && fish && ((n => n && tilePhoto(GX(n), land))(shuffle(slateGenera().filter(homeUnit))[0]) || null),
      fishArt = fp
        ? `<img ${thumb(fp, land ? '(max-width:599.98px) 184px, 520px' : '(max-width:599.98px) 96px, 520px')} alt="" loading="lazy">`
        : '';
    const idoor = !key
      ? ''
      : fish
        ? `
        <section class="hdoor identify">
          <a class="hdart rc${land ? ' land' : ''}" href="${esc(hr(key))}" tabindex="-1" aria-hidden="true">${fishArt}</a>
          <div class="hdbody">
            <p class="hdwhen">${W.when}</p>
            <h2>${esc(W.title)}</h2>
            <p class="hddesc">${esc(W.desc)}</p>
            <div class="hdacts">
              <a class="hdbtn" href="${esc(hr(key))}"><b>${esc(W.btn)}</b><small>${esc(W.soon)}</small></a>
            </div>
          </div>
        </section>`
        : `
        <section class="hdoor identify">
          <a class="hdart rc" href="${esc(hr(key))}" tabindex="-1" aria-hidden="true">${DATA ? `<img src="${photoUrl('img/reefcloud-example-m.webp')}" srcset="${photoUrl('img/reefcloud-example-m.webp')} 760w${saver() ? '' : `, ${photoUrl('img/reefcloud-example.webp')} 1240w`}" sizes="(max-width:599.98px) 92vw, 920px" alt="" loading="lazy">` : ''}</a>
          <div class="hdbody">
            <p class="hdwhen">On ReefCloud<span class="wide"> · or a photo from your dive</span></p>
            <h2>Identify a coral</h2>
            <p class="hddesc">Start from the growth form, add the clues you can see, then compare the candidate genera side by side to name the one under the ReefCloud point, or in your own photo.</p>
            <div class="hdacts">
              <a class="hdbtn" href="${esc(hr(key))}"><b>Open the Coral ID Key</b><small>Growth form, clues, then a visual comparison</small></a>
            </div>
          </div>
        </section>`;
    $v.innerHTML = `<p class="lede">${key ? `Two ways in. Learn &amp; practise while you are learning the ${SUBJ.many}; Identify when you need to name ${fish ? W.need : 'a coral on a ReefCloud photo, or one you photographed on a dive'}.` : `Learn &amp; practise while you are learning the ${SUBJ.many}.`}</p><div class="home-page">${subj}
      <div class="hdoors${key ? '' : ' one'}">
        <section class="hdoor learn${newb ? ' newb' : ''}">
          <a class="hdart" href="${esc(hr('quiz'))}" tabindex="-1" aria-hidden="true"><span class="hdtiles${land ? ' land' : ''}">${tiles}</span></a>
          <div class="hdbody">
            <p class="hdwhen"><span>Learning phase<span class="wide"> · before ${fish ? W.before : 'ReefCloud or your next dive'}</span></span>${wil ? `<a class="hdwil" href="${esc(hr('progress'))}">What I learn ›</a>` : ''}</p>${newb ? '<a class="hdnewk" href="' + esc(hr('basics')) + '" title="' + esc(basicsWords().ask) + ' Start with the basics (5 min)">' + esc(basicsWords().ask) + ' Basics in 5 min ›</a>' : ''}
            <h2>Learn &amp; practise</h2>
            <p class="hddesc">Get to know the ${SUBJ.many}, then train your eye on photos<span class="wide"> until you recognise each one at a glance</span>. Your progress is saved as you go.</p>
            <div class="hdacts">
              <a class="hdbtn" href="${esc(hr('genera'))}"><svg class="hdi" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5zM12 6.5v13"/></svg><b><em>1</em> Learn</b><small>${fish ? W.learn || 'The IMR fish families by identification group, with the IMR cues' : 'One sheet per genus: photos<span class="wide"> at 3 scales</span>, IMR ID tips, look-alikes'}</small></a>
              <a class="hdbtn main" href="${esc(hr('quiz'))}"><svg class="hdi" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/></svg><b><em>2</em> Practice</b><small>${fish ? W.practice || 'Name the family from photos' : 'Name the genus from photos<span class="wide"> (all genera or the ones you pick)</span>, look-alike duels, memory'}</small></a>
            </div>${newb ? '<p class="hdnew"><a href="' + esc(hr('basics')) + '">' + esc(basicsWords().ask) + ' Start with the basics (5 min) ›</a></p>' : ''}
          </div>
        </section>
${idoor}
      </div>
      <p class="hcred">By Pierre Pericard · for ${esc(ORG.short)} · <a href="${esc(hr('about'))}">Credits</a></p>
    </div>`;
    const wl = wil && $v.querySelector('.hdwil');
    // The intent kept in tier 1 (progress.js learnCard reads it once it is in); the handler returns nothing, so the link
    // always goes to My progress.
    if (wl) wl.onclick = () => void (window.WIL_ASK = true);
  };
  // The Fish ID Key, coming soon (Identify shows the current subject's tool only; docs/ROADMAP.md "Fish ID Key for
  // EventMeasure"). The Coral ID Key is reached through the subject switch.
  window.viewFishKey = function () {
    const W = UNITS[SUBJ.id].door || {}; // the subject's words (app.js UNITS door)
    $v.innerHTML = `<div class="keysoon">
      <svg class="ksi" viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.4-4.4"/></svg>
      <h3>${esc(W.btn)}</h3>
      <p class="kswhen">${esc(W.soon)}</p>
      <p>${esc(W.key)}</p>
      <p><a class="next" href="${esc(hr('genera'))}">Learn the ${esc(SUBJ.what.toLowerCase())} ${esc(SUBJ.many)}</a></p>
    </div>`;
  };
  // About and credits: no credits block on the pages, only the one-line credit at the bottom of Home and this page,
  // linked from it and from the ? help of every page. Each photo keeps its own credit (rule P5).
  // The Coral Finder book is cited as a reference (References), never credited as a source of the app's content: its
  // content is not reproduced (a rights question). The Home credit line does not name it.
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
        <p>Coral photos also come from IMR Lecture 6, for IMR’s internal training. Many were not taken by IMR: most come from <a href="https://www.coralsoftheworld.org/" target="_blank" rel="noopener">Corals of the World</a>, credited to their photographers with a link to the page that credits them, under its <a href="https://www.coralsoftheworld.org/page/terms-of-use/" target="_blank" rel="noopener">terms</a> (personal, non-commercial or academic use with citation). The sources of the others are not known yet.</p>
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
