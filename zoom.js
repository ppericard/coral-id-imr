// The full-size photo viewer (the lightbox), moved out of app.js (REE-64, one piece at a time; behaviour unchanged). A
// classic script of tier 1, loaded right after app.js (index.html), so its names are globals like app.js's own: lb, lbClose,
// VIEW_LABEL, ZOOMI, ZHINT_KEY and zoom() are declared before any other tier-1 script runs, and app.js's handlers read them
// only when a key is pressed or a page is drawn. At load it declares those names and registers one listener, popstate
// (Back closes the open viewer); no other script listens to popstate, and the keydown listener zoom() adds when it opens
// is registered at that time, after every listener added at load, as before. The first page waits for tier 1 (BOOT).
// Full-size viewer shared by every page. opts.blind() true = quiz before answering: hide the genus, the taxon and the
// source links; the author's name alone stays (blindCredit).
const lb = document.getElementById('lightbox');
let lbClose = null;
// Back closes the open viewer. A viewer's entry reached with no viewer open (Forward after closing a photo, or Back onto
// it from a link followed inside the viewer) is stepped over, like after a reload.
addEventListener('popstate', () => {
  if (lbClose) lbClose(true);
  else if ((history.state || {}).lb) history.back();
});
const VIEW_LABEL = {wide: 'Colony', medium: 'Close-up', macro: 'Corallites', close: 'Close-up'};
// The enlarge mark on photos that open this viewer (quiz, duels, genus sheet: almost no player enlarged a quiz photo, so
// most did not know they could). A magnifier with a plus in a
// corner, from the app's SVG set; decorative, the button around it carries the label "Enlarge photo".
const ZOOMI =
  '<span class="zic" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.4-4.4M11 8.5v5M8.5 11h5"/></svg></span>';
// The one-time "Tap a photo to see it bigger" hint (quiz.js zoomHint): 'seen' once shown, 'zoomed' once a photo has been
// enlarged on this device; either way it is never due again. Per device, not part of the progress.
const ZHINT_KEY = 'reefid-zoomhint';
// opts.over(p): an optional layer drawn over the whole photo (HTML in % of the photo, e.g. the labels of a Coral basics
// step, proto/basics.js), with a Labels on/off switch; it follows the photo at fit and at actual size.
function zoom(list, i, opts = {}) {
  if (store.get(ZHINT_KEY, null) !== 'zoomed') store.set(ZHINT_KEY, 'zoomed');
  const blind = () => (opts.blind ? opts.blind() : false);
  let overOn = true,
    ro = null;
  const show = () => {
    const p = list[i],
      hide = blind(),
      vl = p.view ? (SUBJ.views.find(v => v[0] === p.view) || VIEWS.find(v => v[0] === p.view) || [0, VIEW_LABEL[p.view]])[1] : '',
      over = !hide && opts.over ? opts.over(p) : '';
    const cap = hide
      ? esc(vl || 'Photo') + blindCredit(p)
      : `${p.genus ? `<b>${uname(p.genus)}</b> · ` : ''}${vl ? esc(vl) + ' · ' : ''}${credit(p)}${p.src ? ` · <a href="${esc(safeUrl(p.src))}" target="_blank" rel="noopener">original</a>` : ''}`;
    // The 1600 px file, over the 480 px one shown at once (usually already loaded). Saver: 960 px, 1600 on a click.
    lb.innerHTML = `<div class="lb-in"><img src="${img(p, saver() ? 'm' : '')}"${p.f ? ` data-f="${esc(p.f)}"` : ''} style="background:center / contain no-repeat url('${img(p, 's')}')" alt="${hide ? `${SUBJ.what} to identify` : esc(p.t || '')}" title="Click for actual size">${over ? `<div class="lb-over"${overOn ? '' : ' hidden'}>${over}</div>` : ''}<p class="lb-cap">${cap}${!hide && p.f && DATA ? ` · ${repBtn({k: 'photo', g: p.genus || genusOfPhoto(p.f), ph: [p.f], m: 'photo'}, '⚑ Report')}` : ''}</p>
      <div class="lb-nav">${list.length > 1 ? `<button type="button" data-d="-1" aria-label="Previous photo">‹</button><span>${i + 1} / ${list.length}</span><button type="button" data-d="1" aria-label="Next photo">›</button>` : ''}${over ? `<button type="button" data-ov aria-pressed="${overOn}">Labels</button>` : ''}<button type="button" data-x aria-label="Close">Close</button></div></div>`;
    lb.classList.remove('full');
    const im = lb.querySelector('.lb-in img');
    im.draggable = false;
    // The layer sits exactly on the photo's box (the photo keeps its ratio, so its box is the picture).
    if (ro) ro.disconnect();
    const ov = lb.querySelector('.lb-over');
    if (ov) {
      const place = () =>
        Object.assign(ov.style, {
          left: im.offsetLeft + 'px',
          top: im.offsetTop + 'px',
          width: im.offsetWidth + 'px',
          height: im.offsetHeight + 'px'
        });
      place();
      im.addEventListener('load', place);
      if (typeof ResizeObserver === 'function') (ro = new ResizeObserver(place)).observe(im);
      lb.querySelector('[data-ov]').onclick = e => {
        e.stopPropagation();
        overOn = !overOn;
        ov.hidden = !overOn;
        e.currentTarget.setAttribute('aria-pressed', overOn);
      };
    }
    im.onclick = e => {
      e.stopPropagation();
      if (moved) return; // the end of a drag, not a click
      // Actual size centred on the point clicked, not on a corner to scroll from.
      const rx = e.offsetX / im.clientWidth,
        ry = e.offsetY / im.clientHeight;
      lb.classList.toggle('full');
      const u = im.getAttribute('src') || '';
      if (ownPhoto(u) && tierOf(u)) im.src = resized(u, '');
      if (lb.classList.contains('full')) {
        const at = () => {
          lb.scrollLeft = rx * im.clientWidth - lb.clientWidth / 2;
          lb.scrollTop = ry * im.clientHeight - lb.clientHeight / 2;
        };
        at();
        im.addEventListener('load', at, {once: true});
      }
    };
    lb.querySelectorAll('[data-d]').forEach(
      b =>
        (b.onclick = e => {
          e.stopPropagation();
          step(Number(b.dataset.d));
        })
    );
    lb.querySelector('[data-x]').onclick = () => close();
    lb.querySelector('[data-x]').focus({preventScroll: true});
  };
  const step = d => {
    i = (i + d + list.length) % list.length;
    show();
  };
  const back = document.activeElement;
  // Phones close an enlarged photo with Back (else Back changes the page under it): opening adds a history entry with the
  // same address, Back (popstate) closes it, and Close takes the entry back.
  const close = fromBack => {
    if (lbClose !== close) return;
    lbClose = null;
    if (ro) ro.disconnect();
    if (!fromBack && history.state && history.state.lb) history.back();
    lb.hidden = true;
    lb.innerHTML = '';
    lb.classList.remove('full');
    document.removeEventListener('keydown', key);
    if (back && back.focus) back.focus({preventScroll: true});
  };
  const key = e => {
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') step(e.key === 'ArrowRight' ? 1 : -1);
  };
  // At actual size, a mouse drags the photo around (hand cursor; an RA's request:
  // docs/decisions/2026-11-18-decisions-from-app-comments.md); a touch screen already pans it natively. A press that
  // moves under 5 px is still a click (back to fit).
  let drag = null,
    moved = false;
  lb.onpointerdown = e => {
    moved = false;
    if (e.pointerType !== 'mouse' || e.button || !lb.classList.contains('full')) return;
    drag = {x: e.clientX, y: e.clientY, l: lb.scrollLeft, t: lb.scrollTop};
  };
  lb.onpointerup = lb.onpointercancel = () => {
    drag = null;
    lb.classList.remove('dragging');
  };
  lb.onpointermove = e => {
    if (!drag) return;
    // Released outside the window (no pointerup reached us): the drag ends here. No pointer capture:
    // it would retarget the click that zooms back out to the viewer itself.
    if (!(e.buttons & 1)) return lb.onpointerup();
    const dx = e.clientX - drag.x,
      dy = e.clientY - drag.y;
    if (!moved && Math.hypot(dx, dy) < 5) return;
    moved = true;
    lb.classList.add('dragging');
    lb.scrollLeft = drag.l - dx;
    lb.scrollTop = drag.t - dy;
  };
  // Swipe left/right between photos (single finger only, so pinch-zoom still works).
  let x0 = null;
  lb.ontouchstart = e => {
    x0 = e.touches.length === 1 && !lb.classList.contains('full') ? e.touches[0].clientX : null;
  };
  lb.ontouchend = e => {
    if (x0 === null || list.length < 2) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
    x0 = null;
  };
  if (lbClose) lbClose(true);
  else history.pushState({lb: 1, d: pageDepth}, '');
  lbClose = close;
  lb.hidden = false;
  lb.onclick = e => {
    if (e.target === lb && !moved) close();
  };
  document.addEventListener('keydown', key);
  show();
}
