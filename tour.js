// Guided tour: walks a new RA through the real pages (Home doors, sign-in, the Practice games, My progress, help),
// spotlighting one element per step with a short bubble. Shown once per browser (localStorage imr-tour, outside the
// imr-coral-* progress keys so backups and resets leave it alone), never on its own for the admin browser, and
// replayable from the ? help of any page (or ?tour in the URL). The sign-in step holds the real sign-in form.
(function(){
  const KEY = 'imr-tour';
  // Five steps (Pierre, 2026-11-01: beta testers must sign in early and start playing fast): the two doors, signing in
  // (the form is in the bubble itself, same on phone and desktop), the three games, progress, help; the last button
  // starts the photo quiz. Details (genus sheets, answers, corallites, Coral Finder) are behind each page's ?.
  const STEPS = [
    {h: '', sel: '.hdoors', t: 'Two ways in', d: 'Learn & practise while you learn the genera. Identify when you need to name a coral on a ReefCloud photo.'},
    {h: '', signin: true},
    {h: 'quiz', sel: '#modes', t: 'Three games', d: 'Photo → genus: name the genus from photos. Look-alike duels: two genera often confused. Memory: match colony and corallites. Switch games here at any time.'},
    {h: 'quiz', sel: '#prog', alt: 'nav [data-tab=progress]', t: 'Your progress', d: 'Each genus fills up as you get it right on harder photos, once with the corallites in view and once in a duel. Tap to see all 39.'},
    {h: 'quiz', sel: '#help', t: 'Help on every page', d: 'Tap ? for what a page does. ⚙ sets the theme and colours. Replay this tour from ?.', also: '#setb'}
  ].filter(s => !s.signin || SYNC_URL);
  let root = null, step = 0, token = 0, target = null, tick = null;
  const vis = el => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const find = s => !s.sel ? null : [...document.querySelectorAll(s.sel)].find(vis) || (s.alt && [...document.querySelectorAll(s.alt)].find(vis)) || null;
  const here = h => hashNow() === h;
  function nav(h){
    if (here(h)) return;
    if (!h) { history.pushState(null, '', location.pathname + location.search); route(); }
    else location.hash = h;
  }
  // Wait for the page to render the step's element (a route can take a frame or two), then spotlight it.
  function show(i){
    step = Math.max(0, Math.min(STEPS.length - 1, i));
    try { sessionStorage.setItem(KEY, String(step)); } catch (e) {}  // a sign-in reloads the page: the tour comes back here
    const s = STEPS[step], my = ++token;
    nav(s.h);
    const t0 = Date.now();
    (function wait(){
      if (my !== token || !root) return;
      const el = find(s);
      if (!el && s.sel && Date.now() - t0 < 4000) return setTimeout(wait, 80);
      target = el;
      if (!s.sel) window.scrollTo(0, 0);
      if (el) { if (s.sel === '#help') window.scrollTo(0, 0); else el.scrollIntoView({block: phone() ? 'start' : 'center', inline: 'nearest'}); }
      if (el && phone() && s.sel !== '#help') window.scrollBy(0, -12);
      bubble(); place();
    })();
  }
  function bubble(){
    const s = STEPS[step], last = step === STEPS.length - 1, b = root.querySelector('.tbub');
    // The sign-in step holds the real sign-in box (bindSync in app.js); its Next reads "Later" until the RA has signed in.
    b.innerHTML = `<p class="tstep">${step + 1} / ${STEPS.length}</p>${s.signin ? '<section class="sync tsync"></section>' : `<h3>${esc(s.t)}</h3><p>${esc(s.d)}</p>`}
      <div class="tnav"><button type="button" class="linkish tskip">${last ? 'Close' : 'Skip tour'}</button><span>
      ${step ? '<button type="button" class="chip tback">Back</button>' : ''}<button type="button" class="next tnext${s.signin && !SYNC ? ' sec' : ''}">${last ? 'Start playing' : s.signin && !SYNC ? 'Later' : 'Next'}</button></span></div>`;
    if (s.signin) { const box = b.querySelector('.tsync'); bindSync(box); new MutationObserver(() => { const n = b.querySelector('.tnext'); if (n) { n.textContent = SYNC ? 'Next' : 'Later'; n.classList.toggle('sec', !SYNC); } place(); }).observe(box, {childList: true}); }
    b.querySelector('.tskip').onclick = () => close(null, true);
    if (step) b.querySelector('.tback').onclick = () => show(step - 1);
    b.querySelector('.tnext').onclick = () => last ? close('quiz') : show(step + 1);
    root.classList.toggle('live', !!s.live);
    b.focus({preventScroll: true});
  }
  // Dim everything but the target: an SVG path with a hole. A transparent block covers the hole, except on
  // "live" steps (sign-in), where the RA can use the page through it.
  function place(){
    if (!root) return;
    if (target && !target.isConnected) target = find(STEPS[step]);  // the page re-rendered under the tour
    // The visible area without scrollbars: the SVG is sized to it, so its viewBox must match (no stretch offset).
    const W = document.documentElement.clientWidth, H = document.documentElement.clientHeight, svg = root.querySelector('svg'), b = root.querySelector('.tbub'), blk = root.querySelector('.tblk');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    let hole = '';
    // The target's box, joined with a second element when the step names one (? and ⚙ together).
    const two = STEPS[step].also && [...document.querySelectorAll(STEPS[step].also)].find(vis);
    const r = target && vis(target) ? [target, two].filter(Boolean).map(e => e.getBoundingClientRect())
      .reduce((a, q) => ({left: Math.min(a.left, q.left), top: Math.min(a.top, q.top), right: Math.max(a.right, q.right), bottom: Math.max(a.bottom, q.bottom)})) : null, pad = 6;
    if (r) { r.width = r.right - r.left; r.height = r.bottom - r.top; }
    if (r) {
      const x = Math.max(2, r.left - pad), y = Math.max(2, r.top - pad), w = Math.min(W - 2, r.right + pad) - x, h = Math.max(24, Math.min(H - 2, r.bottom + pad) - y), k = Math.min(10, w / 2, h / 2);
      hole = ` M${x + k},${y} h${w - 2 * k} a${k},${k} 0 0 1 ${k},${k} v${h - 2 * k} a${k},${k} 0 0 1 -${k},${k} h-${w - 2 * k} a${k},${k} 0 0 1 -${k},-${k} v-${h - 2 * k} a${k},${k} 0 0 1 ${k},-${k} z`;
      Object.assign(blk.style, {left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px', display: ''});
      root.querySelector('.tring').setAttribute('d', hole.trim());
    } else { blk.style.display = 'none'; root.querySelector('.tring').setAttribute('d', ''); }
    root.querySelector('.tdim').setAttribute('d', `M0,0 H${W} V${H} H0 Z` + hole);
    // The bubble: phones keep it at the bottom (CSS); wider screens put it below, above or beside the target.
    // Phones: a sheet at the bottom, or at the top when the target sits in the lower half (it can't always scroll up).
    if (phone()) { b.style.left = b.style.top = ''; b.classList.toggle('up', !r || r.top + Math.min(r.height, H / 2) / 2 > H / 2); return; }
    const bw = b.offsetWidth, bh = b.offsetHeight, m = 14;
    let left, top;
    if (!r) { left = (W - bw) / 2; top = (H - bh) / 2; }
    else if (H - r.bottom - pad > bh + m) { top = r.bottom + pad + m; left = r.left; }
    else if (r.top - pad > bh + m) { top = r.top - pad - m - bh; left = r.left; }
    else if (W - r.right > bw + m) { left = r.right + pad + m; top = r.top; }
    else if (r.left > bw + m) { left = r.left - pad - m - bw; top = r.top; }
    else { left = W - bw - m; top = H - bh - m; }  // a target filling the screen: bottom-right corner
    b.style.left = Math.max(m, Math.min(W - bw - m, left)) + 'px';
    b.style.top = Math.max(m, Math.min(H - bh - m, top)) + 'px';
  }
  // Skipping the tour before its sign-in step (Escape too) still offers the sign-in card once: a beta tester who skips
  // at once should not miss it (Pierre, 2026-11-01). "Later" there leaves the card after 10 answers in place.
  function close(to, skipped){
    if (!root) return;
    const ask = skipped && !SYNC && SYNC_URL && STEPS.slice(step).some(s => s.signin);
    token++;
    try { sessionStorage.removeItem(KEY); } catch (e) {}
    clearInterval(tick); root.remove(); root = null; target = null;
    document.removeEventListener('keydown', onKey); removeEventListener('resize', place); removeEventListener('scroll', place);
    if (to) go(to);
    if (ask && window.signinNudge) signinNudge(false);
  }
  function onKey(e){
    if (e.key === 'Escape') return close(null, true);
    if (e.target.closest && e.target.closest('input, textarea, select')) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); show(step + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); show(step - 1); }
  }
  window.tour = function(at = 0){
    if (root || typeof DATA === 'undefined' || !DATA) return;
    try { localStorage.setItem(KEY, '1'); } catch (e) {}
    $helpbox.hidden = true; $help.setAttribute('aria-expanded', 'false');
    root = document.createElement('div');
    root.id = 'tour'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'Guided tour');
    root.innerHTML = `<svg aria-hidden="true" preserveAspectRatio="none"><path class="tdim" fill-rule="evenodd"/><path class="tring"/></svg>
      <div class="tblk"></div><div class="tbub" tabindex="-1" aria-live="polite"></div>`;
    document.body.appendChild(root);
    document.addEventListener('keydown', onKey); addEventListener('resize', place); addEventListener('scroll', place, {passive: true});
    tick = setInterval(place, 400);  // photos loading move things without a scroll or resize
    show(at);
  };
  // First visit: once the data is in (app.js calls this after the first route).
  window.tourFirst = function(){
    let seen = false; try { seen = !!localStorage.getItem(KEY); } catch (e) {}
    let at = null; try { at = sessionStorage.getItem(KEY); } catch (e) {}
    if (at !== null) tour(+at || 0);
    else if (/[?&]tour\b/.test(location.search) || (!seen && !HAS_ADMIN_TOKEN)) tour();
  };
  // Replay from the ? help of any page.
  document.getElementById('helpbox').addEventListener('click', e => { if (e.target.closest('[data-tour]')) { e.preventDefault(); tour(); } });
  // The data can arrive before this file has loaded: app.js then found no tourFirst, so the first-visit tour starts here.
  if (window.APP_READY) tourFirst();
})();
