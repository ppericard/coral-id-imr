// Guided tour: walks a new RA through the real pages (Home doors, sign-in, the Practice games, My progress, help),
// spotlighting one element per step with a short bubble. Shown once per browser (localStorage imr-tour, outside the
// imr-coral-* progress keys so backups and resets leave it alone), never on its own for the admin browser, and
// replayable from the ? help of any page (or ?tour in the URL). The sign-in step holds the real sign-in form.
(function () {
  const KEY = 'imr-tour';
  // Five steps (Pierre, 2026-11-01: beta testers must sign in early and start playing fast): the two doors, signing in
  // (the form is in the bubble itself, same on phone and desktop), the three games, progress, help; the last button
  // starts the photo quiz. Details (genus sheets, answers, corallites, Coral Finder) are behind each page's ?.
  // sel: the element to spotlight (alt: fallback when it is hidden); also: an element joined into the same frame (? and ⚙);
  // plus: a second, separate spotlight (Practice in the menu, at the other end of a phone screen); tall: 'end' shows the
  // bottom of a target too tall to fit beside the bubble (the doors' buttons), instead of its top; arrows: a big arrow points
  // at each spotlight, so two spotlights far apart both catch the eye (Pierre, 2026-11-01: the menu drew the eye from the games).
  const STEPS = [
    {
      h: '',
      sel: '.hdoors',
      tall: 'end',
      t: 'Two ways in',
      d: 'Learn & practise while you learn the genera. Identify when you need to name a coral on a ReefCloud photo.'
    },
    {h: '', signin: true},
    {
      h: 'quiz',
      sel: '#modes',
      plus: 'nav [data-tab=practice]',
      arrows: true,
      t: 'Three games',
      d: 'Practice in the menu opens the games. Photo → genus: name the genus from photos. Look-alike duels: two genera often confused. Memory: match colony and corallites. Switch games here at any time.'
    },
    {
      h: 'quiz',
      sel: '#prog',
      alt: 'nav [data-tab=progress]',
      t: 'Your progress',
      d: 'Each genus fills up as you get it right on harder photos, then a surprise exam in the quiz makes it learned. Tap to see every genus.'
    },
    {
      h: 'quiz',
      sel: '#help',
      t: 'Help on every page',
      d: 'Tap ? for what a page does. ⚙ sets the theme and colours. Replay this tour from ?.',
      also: '#setb'
    }
  ].filter(s => !s.signin || SYNC_URL);
  let root = null,
    step = 0,
    token = 0,
    target = null,
    tick = null;
  const vis = el => {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const find = s =>
    !s.sel ? null : [...document.querySelectorAll(s.sel)].find(vis) || (s.alt && [...document.querySelectorAll(s.alt)].find(vis)) || null;
  const here = h => hashNow() === h;
  function nav(h) {
    if (here(h)) return;
    if (!h) {
      history.pushState(null, '', location.pathname + location.search);
      route();
    } else location.hash = h;
  }
  // Wait for the page to render the step's element (a route can take a frame or two), then spotlight it.
  function show(i) {
    step = Math.max(0, Math.min(STEPS.length - 1, i));
    try {
      sessionStorage.setItem(KEY, String(step));
    } catch (e) {} // a sign-in reloads the page: the tour comes back here
    const s = STEPS[step],
      my = ++token;
    nav(s.h);
    const t0 = Date.now();
    (function wait() {
      if (my !== token || !root) return;
      const el = find(s);
      if (!el && s.sel && Date.now() - t0 < 4000) return setTimeout(wait, 80);
      target = el;
      bubble();
      frame(el, s);
      place();
    })();
  }
  // The bubble must never cover what it describes (Pierre, 2026-11-01). The free band is the screen between the pinned
  // header (desktop and tablet; on phones it scrolls away) and the phone tab bar.
  const GAP = 12;
  const band = () => {
    const H = document.documentElement.clientHeight,
      hd = document.querySelector('header').getBoundingClientRect();
    const nav = phone() && [...document.querySelectorAll('nav.sections')].find(vis);
    const nt = nav ? nav.getBoundingClientRect().top : H;
    return {top: Math.max(0, hd.bottom), bottom: nt > H / 2 ? nt : H, H};
  };
  // Scroll once per step so the target and the bubble both fit: the target beside the bubble when there is room at a side
  // (wide screens), else above or below it, with a wider, shorter bubble when that is what it takes. A target taller than
  // the band shows its top (or its bottom with tall: 'end'); the rest scrolls off screen, never under the bubble.
  function frame(el, s) {
    const b = root.querySelector('.tbub');
    b.classList.remove('wide');
    // Pinned targets (header, tab bar, the games bar) sit at the top of the page.
    if (!el || el.closest('header, nav')) return window.scrollTo(0, 0);
    const {top, bottom} = band(),
      room = bottom - top - 2 * GAP,
      W = document.documentElement.clientWidth;
    let r = el.getBoundingClientRect(),
      bh = b.offsetHeight,
      y;
    const side = !phone() && r.height <= room && Math.max(W - r.right, r.left) >= b.offsetWidth + 2 * GAP;
    if (!phone() && !side && r.height + GAP + bh > room) {
      b.classList.add('wide');
      bh = b.offsetHeight;
    }
    if (side) y = top + GAP + Math.max(0, (room - r.height) / 2);
    else if (r.height + GAP + bh <= room) {
      const fits = r.top >= top + GAP && (r.bottom + GAP + bh <= bottom - GAP || r.top - GAP - bh >= top + GAP) && r.bottom <= bottom - GAP;
      y = fits ? r.top : top + GAP;
    } else y = s.tall === 'end' ? bottom - GAP - bh - GAP - r.height : top + GAP;
    if (Math.abs(r.top - y) > 1) window.scrollBy({top: r.top - y, left: 0, behavior: 'instant'});
  }
  function bubble() {
    const s = STEPS[step],
      last = step === STEPS.length - 1,
      b = root.querySelector('.tbub');
    // The sign-in step holds the real sign-in box (bindSync in app.js); its Next reads "Later" until the RA has signed in.
    b.innerHTML = `<p class="tstep">${step + 1} / ${STEPS.length}</p>${s.signin ? '<section class="sync tsync"></section>' : `<h3>${esc(s.t)}</h3><p>${esc(s.d)}</p>`}
      <div class="tnav"><button type="button" class="linkish tskip">${last ? 'Close' : 'Skip tour'}</button><span>
      ${step ? '<button type="button" class="chip tback">Back</button>' : ''}<button type="button" class="next tnext${s.signin && !SYNC ? ' sec' : ''}">${last ? 'Start playing' : s.signin && !SYNC ? 'Later' : 'Next'}</button></span></div>`;
    if (s.signin) {
      const box = b.querySelector('.tsync');
      bindSync(box);
      new MutationObserver(() => {
        const n = b.querySelector('.tnext');
        if (n) {
          n.textContent = SYNC ? 'Next' : 'Later';
          n.classList.toggle('sec', !SYNC);
        }
        place();
      }).observe(box, {childList: true});
    }
    b.querySelector('.tskip').onclick = () => close(null, true);
    if (step) b.querySelector('.tback').onclick = () => show(step - 1);
    b.querySelector('.tnext').onclick = () => (last ? close('quiz') : show(step + 1));
    root.classList.toggle('live', !!s.live);
    b.focus({preventScroll: true});
  }
  // Dim everything but the target(s): an SVG path with holes. Transparent blocks cover the holes, except on
  // "live" steps (sign-in), where the RA can use the page through them.
  function place() {
    if (!root) return;
    const s = STEPS[step];
    if (target && !target.isConnected) target = find(s); // the page re-rendered under the tour
    // The visible area without scrollbars: the SVG is sized to it, so its viewBox must match (no stretch offset).
    const W = document.documentElement.clientWidth,
      H = document.documentElement.clientHeight,
      svg = root.querySelector('svg'),
      b = root.querySelector('.tbub');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const pad = 6,
      bd = band(),
      box = e => e.getBoundingClientRect();
    // Each hole: the target's box (joined with `also`, ? and ⚙ together), then the separate `plus` element. A hole is
    // clipped to the band below a pinned header, so a target scrolled up never opens a window onto the header.
    const two = s.also && [...document.querySelectorAll(s.also)].find(vis),
      plus = s.plus && [...document.querySelectorAll(s.plus)].find(vis);
    const join = (a, q) => ({
      left: Math.min(a.left, q.left),
      top: Math.min(a.top, q.top),
      right: Math.max(a.right, q.right),
      bottom: Math.max(a.bottom, q.bottom)
    });
    const rects = [];
    if (target && vis(target))
      rects.push({
        ...[target, two]
          .filter(Boolean)
          .map(e => box(e).toJSON())
          .reduce(join),
        clip: target.closest('header, nav') ? 2 : Math.max(2, bd.top)
      });
    if (target && plus && plus !== target) rects.push({...box(plus).toJSON(), clip: 2});
    let holes = '';
    const blks = [...root.querySelectorAll('.tblk')];
    rects.forEach((q, i) => {
      const x = Math.max(2, q.left - pad),
        y = Math.max(q.clip, q.top - pad),
        w = Math.min(W - 2, q.right + pad) - x,
        h = Math.max(24, Math.min(H - 2, q.bottom + pad) - y),
        k = Math.min(10, w / 2, h / 2);
      holes += ` M${x + k},${y} h${w - 2 * k} a${k},${k} 0 0 1 ${k},${k} v${h - 2 * k} a${k},${k} 0 0 1 -${k},${k} h-${w - 2 * k} a${k},${k} 0 0 1 -${k},-${k} v-${h - 2 * k} a${k},${k} 0 0 1 ${k},-${k} z`;
      let blk = blks[i];
      if (!blk) {
        blk = document.createElement('div');
        blk.className = 'tblk';
        root.insertBefore(blk, b);
        blks.push(blk);
      }
      Object.assign(blk.style, {left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px', display: ''});
    });
    blks.slice(rects.length).forEach(e => (e.style.display = 'none'));
    root.querySelector('.tring').setAttribute('d', holes.trim());
    root.querySelector('.tdim').setAttribute('d', `M0,0 H${W} V${H} H0 Z` + holes);
    // The bubble goes where the main target is not: phones keep a sheet above the tab bar, or at the top of the screen
    // when the target is in the way there; wider screens put it below, above or beside the target.
    const r = rects[0] || null,
      bh = b.offsetHeight;
    if (phone()) {
      const below = r ? bd.bottom - GAP - r.bottom - pad : H,
        above = r ? r.top - pad - GAP - 8 : 0;
      b.style.left = b.style.top = '';
      // Two spotlights with arrows (top and bottom of the screen): the sheet sits midway, leaving room for both arrows.
      const mid = s.arrows && rects.length > 1 ? (r.bottom + rects[1].top - bh) / 2 : null;
      b.classList.toggle('mid', mid !== null);
      if (mid !== null) b.style.top = mid + 'px';
      b.classList.toggle('up', mid === null && !!r && below < bh + GAP && (above >= bh || above > below));
      return arrows(s, rects, b, W, H);
    }
    // With arrows, the bubble stands one arrow further from the target, so the arrow fits between them.
    const bw = b.offsetWidth,
      m = 14,
      d = s.arrows ? m + 70 : m,
      mid = r ? r.left + (r.right - r.left - bw) / 2 : 0,
      wide = b.classList.contains('wide');
    let left, top;
    if (!r) {
      left = (W - bw) / 2;
      top = (H - bh) / 2;
    } else if (H - r.bottom - pad > bh + d) {
      top = r.bottom + pad + d;
      left = wide ? mid : r.left;
    } else if (r.top - pad - bd.top > bh + d) {
      top = r.top - pad - d - bh;
      left = wide ? mid : r.left;
    } else if (W - r.right > bw + m) {
      left = r.right + pad + m;
      top = r.top;
    } else if (r.left > bw + m) {
      left = r.left - pad - m - bw;
      top = r.top;
    } else {
      left = mid;
      top = H - bh - m;
    } // a target taller than the screen: at the bottom, over its scrolled-off part
    b.style.left = Math.max(m, Math.min(W - bw - m, left)) + 'px';
    b.style.top = Math.max(m, Math.min(H - bh - m, top)) + 'px';
    arrows(s, rects, b, W, H);
  }
  // Big arrows in the dimmed area, one per spotlight, pointing at it: below or above it (towards the middle of the
  // screen first), else beside it; never over the bubble or another spotlight. The main one aims at the target's
  // content (the game tabs, not the empty end of their bar).
  function arrows(s, rects, b, W, H) {
    const g = root.querySelector('.tarrows');
    if (!s.arrows) {
      g.innerHTML = '';
      return;
    }
    const bb = b.getBoundingClientRect(),
      A = 44,
      L = 58,
      pad = 6,
      hit = (x, y, w, h, q, e = 6) => x < q.right + e && x + w > q.left - e && y < q.bottom + e && y + h > q.top - e;
    const kids = target ? [...target.children].filter(vis).map(e => e.getBoundingClientRect()) : [];
    const aimX = (q, i) =>
      !i && kids.length ? (Math.min(...kids.map(k => k.left)) + Math.max(...kids.map(k => k.right))) / 2 : (q.left + q.right) / 2;
    let out = '';
    rects.forEach((q, i) => {
      const cx = aimX(q, i),
        cy = (q.top + q.bottom) / 2,
        up = cy < H / 2;
      const spots = [
        {x: cx - A / 2, y: q.bottom + pad + 8, w: A, h: L, a: 0}, // below, pointing up
        {x: cx - A / 2, y: q.top - pad - 8 - L, w: A, h: L, a: 180}, // above, pointing down
        {x: q.left - pad - 8 - L, y: cy - A / 2, w: L, h: A, a: 90}, // left, pointing right
        {x: q.right + pad + 8, y: cy - A / 2, w: L, h: A, a: 270} // right, pointing left
      ];
      if (!up) [spots[0], spots[1]] = [spots[1], spots[0]];
      const p = spots.find(
        o =>
          o.x >= 2 &&
          o.y >= 2 &&
          o.x + o.w <= W - 2 &&
          o.y + o.h <= H - 2 &&
          !hit(o.x, o.y, o.w, o.h, bb) &&
          !rects.some(z => hit(o.x, o.y, o.w, o.h, z, 2))
      );
      if (!p) return;
      // Drawn pointing up around (0,0), then turned: the bob animation moves it towards the spotlight.
      out += `<g transform="translate(${p.x + p.w / 2},${p.y + p.h / 2}) rotate(${p.a})"><path class="tarw" d="M0,${-L / 2} L${A / 2},${-L / 2 + 24} H${A * 0.17} V${L / 2} H${-A * 0.17} V${-L / 2 + 24} H${-A / 2} Z"/></g>`;
    });
    g.innerHTML = out;
  }
  // Skipping the tour before its sign-in step (Escape too) still offers the sign-in card once: a beta tester who skips
  // at once should not miss it (Pierre, 2026-11-01). "Later" there leaves the card after 10 answers in place.
  function close(to, skipped) {
    if (!root) return;
    const ask = skipped && !SYNC && SYNC_URL && STEPS.slice(step).some(s => s.signin);
    token++;
    try {
      sessionStorage.removeItem(KEY);
    } catch (e) {}
    clearInterval(tick);
    root.remove();
    root = null;
    target = null;
    document.documentElement.classList.remove('touring');
    document.removeEventListener('keydown', onKey);
    removeEventListener('resize', place);
    removeEventListener('scroll', place);
    if (to) go(to);
    if (ask && window.signinNudge) signinNudge(false);
  }
  function onKey(e) {
    if (e.key === 'Escape') return close(null, true);
    if (e.target.closest && e.target.closest('input, textarea, select')) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      show(step + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      show(step - 1);
    }
  }
  window.tour = function (at = 0) {
    if (root || typeof DATA === 'undefined' || !DATA) return;
    try {
      localStorage.setItem(KEY, '1');
    } catch (e) {}
    $helpbox.hidden = true;
    $help.setAttribute('aria-expanded', 'false');
    root = document.createElement('div');
    root.id = 'tour';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-label', 'Guided tour');
    root.innerHTML = `<svg aria-hidden="true" preserveAspectRatio="none"><path class="tdim" fill-rule="evenodd"/><path class="tring"/><g class="tarrows"></g></svg>
      <div class="tblk"></div><div class="tbub" tabindex="-1" aria-live="polite"></div>`;
    document.body.appendChild(root);
    document.documentElement.classList.add('touring'); // room below the page, so the last element can scroll clear of the bubble
    document.addEventListener('keydown', onKey);
    addEventListener('resize', place);
    addEventListener('scroll', place, {passive: true});
    tick = setInterval(place, 400); // photos loading move things without a scroll or resize
    show(at);
  };
  // First visit: once the data is in (app.js calls this after the first route).
  window.tourFirst = function () {
    let seen = false;
    try {
      seen = !!localStorage.getItem(KEY);
    } catch (e) {}
    let at = null;
    try {
      at = sessionStorage.getItem(KEY);
    } catch (e) {}
    if (at !== null) tour(+at || 0);
    else if (/[?&]tour\b/.test(location.search) || (!seen && !HAS_ADMIN_TOKEN)) tour();
  };
  // Replay from the ? help of any page.
  document.getElementById('helpbox').addEventListener('click', e => {
    if (e.target.closest('[data-tour]')) {
      e.preventDefault();
      tour();
    }
  });
  // The data can arrive before this file has loaded: app.js then found no tourFirst, so the first-visit tour starts here.
  if (window.APP_READY) tourFirst();
})();
