// Guided tour: walks a new RA through the real pages (Home doors, Learn, Practice, Identify, My progress, help),
// spotlighting one element per step with a short bubble. Shown once per browser (localStorage imr-tour, outside the
// imr-coral-* progress keys so backups and resets leave it alone), never on its own for the admin browser, and
// replayable from the ? help of any page (or ?tour in the URL). The sign-in step lets the RA type in the real form.
(function(){
  const KEY = 'imr-tour';
  const STEPS = [
    {h: '', sel: '.hdoors', t: 'Two ways in', d: 'Learn & practise while you learn the genera. Identify when you need to name a coral on a ReefCloud photo.'},
    {h: 'genera', sel: '#azgrid a.card', t: 'Learn: one card per genus', d: 'The card shows the deciding features. Tap it for the genus sheet: photos at 3 scales, IMR ID tips, look-alikes.'},
    {h: 'quiz', sel: '.qstage', t: 'Practice: name the genus', d: 'Two photos of the same coral: the colony, then a close-up.'},
    {h: 'quiz', sel: '.ans', t: 'Pick an answer', d: 'Wrong? You see why, with the IMR ID tips of both genera. Photos get harder as you get a genus right.'},
    {h: 'quiz', sel: '#hintb', t: 'Stuck? Look at the corallites', d: 'When no corallite photo is shown, this adds one. One right answer with the corallites in view is a step to learn a genus.'},
    {h: 'finder', sel: '.fdforms, #labroot', t: 'Identify a coral on your photos', d: 'Start from its growth form, then compare the candidate genera side by side.'},
    {h: 'progress', sel: '.pwall, .pgrid', t: 'Your progress', d: 'A genus turns darkest, with a tick, once learned: right answers on harder photos, once with the corallites in view, once in a look-alike duel.'},
    {h: 'progress', sel: '#sync', t: 'Sign in', d: 'Your name and a 4-digit code: your progress is saved for your trainer and follows you on any device.', live: true},
    {h: '', sel: '#help', t: 'Help on every page', d: 'Tap ? for what a page does. ⚙ sets photo size, theme and colours. Replay this tour from ?.', also: '#setb'}
  ];
  let root = null, step = 0, token = 0, target = null, tick = null;
  const vis = el => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const find = s => [...document.querySelectorAll(s.sel)].find(vis) || (s.alt && [...document.querySelectorAll(s.alt)].find(vis)) || null;
  const here = h => decodeURIComponent(location.hash.slice(1)) === h;
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
      if (!el && Date.now() - t0 < 4000) return setTimeout(wait, 80);
      target = el;
      if (el) { if (s.h === '' && s.sel === '#help') window.scrollTo(0, 0); else el.scrollIntoView({block: phone() ? 'start' : 'center', inline: 'nearest'}); }
      if (el && phone() && s.sel !== '#help') window.scrollBy(0, -12);
      bubble(); place();
    })();
  }
  function bubble(){
    const s = STEPS[step], last = step === STEPS.length - 1, b = root.querySelector('.tbub');
    b.innerHTML = `<p class="tstep">${step + 1} / ${STEPS.length}</p><h3>${esc(s.t)}</h3><p>${esc(s.d)}</p>
      <div class="tnav"><button type="button" class="linkish tskip">${last ? 'Close' : 'Skip tour'}</button><span>
      ${step ? '<button type="button" class="chip tback">Back</button>' : ''}<button type="button" class="next tnext">${last ? 'Start practising' : 'Next'}</button></span></div>`;
    b.querySelector('.tskip').onclick = () => close();
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
    if (phone()) { b.style.left = b.style.top = ''; b.classList.toggle('up', !!r && r.top + Math.min(r.height, H / 2) / 2 > H / 2); return; }
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
  function close(to){
    if (!root) return;
    token++;
    try { sessionStorage.removeItem(KEY); } catch (e) {}
    clearInterval(tick); root.remove(); root = null; target = null;
    document.removeEventListener('keydown', onKey); removeEventListener('resize', place); removeEventListener('scroll', place);
    if (to) go(to);
  }
  function onKey(e){
    if (e.key === 'Escape') return close();
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
