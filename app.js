// IMR Reef ID: hash-routed single page. Data comes from data.json (written by tools/datajson.py, one genus per line).
// First of all, the storage keys from before the rename to IMR Reef ID (2026-11-03) move to their new names (core.js
// migrateKeys): nothing below may read a key before this line. The theme script of index.html reads both names itself.
migrateStorage();
migrateIdKey(); // the renamed Coral ID Key (2026-11-04): its keys moved once (core.js)
migrateRoutes(); // the URL refonte (2026-11-05): page names and addresses in this device's data moved once (core.js)
let DATA;
const $v = document.getElementById('view');
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[c]);
// Links built from data (photo sources): only https, anything else becomes '#' (code review 2026-11-01, L2).
// An old http:// link (one iNat observation in data.json) is upgraded to https, not dropped.
const safeUrl = u => {
  const s = String(u || '').replace(/^http:\/\//i, 'https://');
  return /^https:\/\//i.test(s) ? s : '#';
};
// Page keyboard handlers (quiz, look-alikes): each new question or pair aborts the previous handler instead of
// stacking one more on document (code review 2026-11-01, L3).
let keysAC = null;
const viewKeys = () => {
  if (keysAC) keysAC.abort();
  keysAC = new AbortController();
  return keysAC.signal;
};
// A side file that failed to load: the app goes on without it, but says so in the console (and to Pierre).
const softFail = (what, d) => e => {
  console.warn(`${what} not loaded:`, (e && e.message) || e);
  if (typeof IS_ADMIN !== 'undefined' && IS_ADMIN)
    setTimeout(() => {
      const t = document.createElement('p');
      t.className = 'note';
      t.style.cssText =
        'position:fixed;left:8px;bottom:8px;z-index:99;background:var(--bg,#fff);padding:4px 8px;border:1px solid currentColor;border-radius:6px';
      t.textContent = `Admin: ${what} not loaded`;
      document.body.append(t);
      setTimeout(() => t.remove(), 8000);
    }, 500);
  return d;
};
// Window size classes, the same values as the media queries in app.css (one source of truth, see its header):
// phone < 600 px · tablet 600-1023 px (tablets, and a desktop window snapped to half a screen) · desktop >= 1024 px.
const MQ = {phone: '(max-width:599.98px)', stack: '(max-width:1023.98px)', touch: '(hover:none), (pointer:coarse)'};
const isPhone = () => matchMedia(MQ.phone).matches;
const isStacked = () => matchMedia(MQ.stack).matches; // phone + tablet: games and side panels go to one column
// Addresses (URL refonte, Pierre 2026-11-05, Q53-Q56): #<section>/<page>/<thing>?<filters> in the words on screen,
// the subject's prefix first for a subject other than the corals (#fish/practice/quiz). The code names a page by its
// page key ('genera', 'g-Acropora', 'quiz-duel|A|B'…); core.js routeIn and routeOut translate, here only (hashNow, hr).
// The address on screen read (core.js routeIn: split before decoding; a malformed %-escape no longer throws).
const routeNow = () => routeIn(location.hash, S => UNITS[S.id].identify);
// The page key of the address on screen; an old or unknown address gives the page route() sends it to (its section's
// page, else Home: no old address is translated, rule W3).
const hashNow = () => {
  const r = routeNow();
  return r.key != null ? r.key : r.fall;
};
// The link of page key k, '#' and its address, for the subject on screen (or S), or for the first subject that has the
// page when that one does not (a genus sheet linked from the Tools with Fish chosen: the corals'); Home is '#' (the
// clean URL: hrFull).
// A sheet is the subject's only when its id names one of its sheets (core.js sheetIdOf: a fish sheet's id carries its
// rank's prefix, f:Damselfishes; a coral genus sheet any name), so a coral genus sheet linked with Fish chosen stays the
// corals'. Its link is built from the sheet's id in its one spelling (an old fish unit id, t01, renamed since).
const subjHas = (S, k) => {
  const t = sectionOf(k),
    m = k.startsWith('g-') ? 'sheet' : modeOf(k);
  if (m === 'sheet') return S.pages.includes(m) && sheetIdOf(S, k.slice(2)) != null;
  return t === 'identify' ? UNITS[S.id].identify === m : (t !== 'learn' && t !== 'practice') || S.pages.includes(m);
};
const hr = (k, S = SUBJ) => {
  const T = subjHas(S, k) ? S : SUBJECTS.find(x => subjHas(x, k)) || S;
  return '#' + (routeOut(k.startsWith('g-') ? 'g-' + (sheetIdOf(T, k.slice(2)) || k.slice(2)) : k, T) || '');
};
// The full URL of page key k: Home is the page's clean URL, with no '#'.
const hrFull = (k, S = SUBJ) => (routeOut(k, S) ? hr(k, S) : location.pathname + location.search);
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
// Pierre-only controls (Lab keep/trim, Coral ID Key start-screen switch, ⚑ flag) show only in the browser where the
// admin page holds his token, the same test flag.js uses. RAs never see them.
// Pierre's browser holds the admin token (reefid-admin-vault). ⚙ View: Admin | User (reefid-admin-view) hides every
// admin-only control without touching the token, so he sees the site exactly as RAs do.
const HAS_ADMIN_TOKEN = (() => {
  try {
    return !!localStorage.getItem('reefid-admin-vault');
  } catch (e) {
    return false;
  }
})();
const IS_ADMIN =
  HAS_ADMIN_TOKEN &&
  (() => {
    try {
      return localStorage.getItem('reefid-admin-view') !== 'user';
    } catch (e) {
      return true;
    }
  })();
const store = {
  get(k, d) {
    try {
      const v = keyGet(localStorage, k); // the key's old name too while a migration waits (core.js keyGet)
      return v === null ? d : JSON.parse(v);
    } catch (e) {
      return d;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch (e) {}
  }
};
const VIEWS = [
  ['wide', 'Colony'],
  ['medium', 'Close-up'],
  ['macro', 'Corallites']
];
// A candidate just added in the admin (r: 1) shows from iNaturalist until tools/fetch_approved.py has downloaded it.
const inat = (p, sz) => p.src.replace('/original.', `/${sz}.`);
// A recropped photo keeps its file name, so its URL carries the crop (cr) and rewrite count (iv): without it the
// service worker (photos cache-first) and the browser kept the old file for some sizes (-s 480 px vs 1600 px).
const ver = p => (p.cr || p.iv ? `?c=${(p.cr || []).join('_')}${p.iv ? '.' + p.iv : ''}` : '');
// The site's photos come from Cloudflare R2 (core.js PHOTO_BASE) while R2 answers. Once an R2 photo failed on a page no
// service worker controls (photoFail below), R2 is false and AWAY true for the rest of the visit: a photo with an online
// original (iNaturalist, FishBase: core.js photoAway; Pierre, 2026-11-05) is read from there at a light size, the others
// (IMR lecture photos, Coral Finder book scans, page art) from the site's img/. Under a service worker both stay as they
// are: the worker keeps photos offline under their R2 address and fails at once while R2 is out (sw.js photo), and each
// photo that fails falls back on its own. With PHOTO_BASE '' (R2 switched off), AWAY from the start: the photos with an
// online original live on R2 only since step 2 of Photos out of the repo, so they come from that original.
let R2 = !!PHOTO_BASE,
  AWAY = !PHOTO_BASE;
const swOn = () => !!(navigator.serviceWorker && navigator.serviceWorker.controller);
// A file of img/ (a photo with no online original, page art), where this page reads it.
const photoUrl = path => (R2 ? PHOTO_BASE : '') + path;
// One of the site's photo files, on R2 or on the site (not an iNaturalist photo).
const ownPhoto = u => photoLocal(u || '').startsWith('img/');
// Every photo record by name and by online original (core.js photoIndex), for the fallback: built when first needed,
// again once the data was rebuilt (a new curation) or the fish data came.
let PIDX = null,
  PIDX_OF = [];
const photoIdx = () => {
  if (!PIDX || PIDX_OF[0] !== DATA || PIDX_OF[1] !== FISH) ((PIDX = photoIndex(DATA, FISH)), (PIDX_OF = [DATA, FISH]));
  return PIDX;
};
const photoLook = f => photoIdx().f.get(f);
// Four files per photo (tools/photos.py): 240 ('t'), 480 ('s'), 960 ('m') and 1600 px (none) on the long side.
// iNaturalist serves 240 (small), 500 (medium) and 1024 px (large).
// A bare {f} (the Lab's photos) finds its record, so its online original, by name (R2 switched off: AWAY from the start).
const loc = (p, s) => {
  const o = AWAY && !p.src ? photoLook(p.f) || p : p;
  return AWAY && o.src ? photoOnline(o.src, s) : photoUrl(`img/${p.f}${s ? '-' + s : ''}.webp${ver(o)}`);
};
const img = (p, size) => (p.r && p.src ? inat(p, size === 's' ? 'medium' : 'large') : loc(p, size));
// Photo quality (Pierre, 2026-11-01: slow, unstable connections in the Philippines): a big photo (game, sheet cover)
// gets the smallest file that covers its box at the screen's density, counted up to 2x (a 3x phone sees no difference).
// Saver takes the 480 px file for game photos and stage photos whatever the box; Full always takes the 1600 px file. Auto is Saver when the browser reports
// the data saver or a slow connection (Network Information API: Chrome on Android), or when the app measures a slow line
// itself (linkBps). The enlarged view always loads the 1600 px file (Saver: on a click).
let PQ = store.get('reefid-photo-q', 'auto');
// The line as measured by the app (field HAR, 2026-11-02: at ~86 kbit/s Chrome's estimate did not flag the link, so Auto
// loaded the 960 px quiz photo, 62 KB in 19 s; Safari and Firefox have no Network Information API at all): the bytes
// this page got from the network over the time spent receiving them (Resource Timing; overlapping downloads count once,
// files from a cache count nothing), once LINK.MIN bytes are in. Under LINK.SLOW bit/s, Auto works as Saver. The last
// measure is kept (reefid-link): a launch served from the cache measures nothing and starts from it.
// LINK.SLOW 500 kbit/s (Pierre, 2026-11-02; 1 Mbit/s at first): 480 px photos on a 1080p or 4K desktop screen are a real
// loss, so only a line where the 960 px pair of a question (~170 KB) takes over ~3 s gets them. Not yet measured on the
// players' links: to recalibrate once real link speeds are logged.
const LINK = {SLOW: 5e5, MIN: 40000, KEY: 'reefid-link'};
let linkBps = store.get(LINK.KEY, 0),
  linkAt = 0;
const linkMeasure = () => {
  if (Date.now() - linkAt < 2000 || !window.performance || !performance.getEntriesByType) return linkBps;
  linkAt = Date.now();
  const E = performance
    .getEntriesByType('resource')
    .filter(e => e.transferSize > 0 && e.responseEnd > e.responseStart)
    .sort((a, b) => a.responseStart - b.responseStart);
  let bytes = 0,
    time = 0,
    end = 0;
  E.forEach(e => {
    bytes += e.transferSize;
    if (e.responseEnd > end) time += e.responseEnd - Math.max(e.responseStart, end);
    end = Math.max(end, e.responseEnd);
  });
  if (bytes >= LINK.MIN && time > 0) store.set(LINK.KEY, (linkBps = Math.round((bytes * 8000) / time)));
  return linkBps;
};
// Load times (sheet v21 'load'; Pierre, 2026-11-02, after an RA on a ~86 kbit/s line waited 37 s for Home): one event a
// visit, so the loading order and LINK.SLOW can be set from the players' real lines rather than from lab profiles. Times
// in seconds from the start of the navigation: p0 / t0 the first page drawn and when, qo the quiz opened, q1 its first
// photo shown, nx the first other page opened. Sent when the first quiz photo shows, when the app is hidden, or 3 min
// after the first page, with the line measured (bps, kbit/s), the bytes downloaded so far (kb), whether a service worker
// served the page (sw: the offline copy), Saver on or off (sv), the theme (th), the window width (w), installed as an app or
// in a browser tab (st) and the CDN server
// that sent data.json (pop: GitHub Pages' x-served-by, e.g. "cache-mnl…": Manila). Here, not in sync.js: data.json
// can arrive before sync.js has run.
const LOADM = {},
  // Served by the offline copy at start-up (Codex review #362: the service worker registered later takes the page over).
  SW0 = !!(navigator.serviceWorker && navigator.serviceWorker.controller);
let loadSent = false; // sync.js loadSend
function loadMark(k, v) {
  if (loadSent || k in LOADM) return;
  LOADM[k] = v !== undefined ? v : Math.round(performance.now() / 100) / 10;
  if (k === 't0') setTimeout(loadSend, 180000);
  if (k === 'q1') loadSend();
}
const saver = () => {
  const c = navigator.connection;
  if (PQ !== 'auto') return PQ === 'saver';
  if (c && c.saveData) return true;
  // The app's own measure decides once it has one; the browser's estimate (2g/3g reaches ~1.5 Mbit/s) only before.
  const b = linkMeasure();
  return b > 0 ? b < LINK.SLOW : !!c && /2g|3g/.test(c.effectiveType || '');
};
const fit = px => {
  if (PQ === 'full') return '';
  if (!(px > 0)) return 'm';
  // Saver (chosen, or Auto on a slow line): the 480 px file whatever the box (field link, 2026-11-02: at 1x a desktop quiz
  // box still took the 960 px file, two per question, and the quiz came no faster on a laptop than before).
  if (saver()) return 's';
  const need = px * Math.min(window.devicePixelRatio || 1, 2);
  // A file is never blown up past LOWRES (1.15x): a photo enlarged more is shown whole at its own size (fitStage, fitLow).
  return need <= 520 ? 's' : need <= 1100 ? 'm' : '';
};
// The last quiz photo box (CSS px, long side) for each number of photos on the stage: the next question's files are
// chosen (and preloaded) before its layout exists.
const QBOX = {};
const qsrc = (p, n = 1) => img(p, fit(QBOX[n] || Math.min(innerWidth, 900) / Math.sqrt(n)));
// A shown site photo moved to another size: same name, -s / -m / no suffix (iNaturalist photos keep theirs). Once R2 has
// failed on this page, the photo's online original at that size, or the site's file.
const resized = (u, size) => {
  const v = u.replace(/^((?:https:\/\/[^/]+\/)?img\/.+?)(-[tsm])?\.webp/, `$1${size ? '-' + size : ''}.webp`);
  return AWAY ? photoAway(v, photoLook) : R2 ? v : photoLocal(v);
};
const PXR = {s: 0, m: 1, '': 2}; // rank of each file size
const tierOf = u => (/-[ts]\.webp/.test(u) ? 's' : /-m\.webp/.test(u) ? 'm' : '');
// A photo shown bigger than its file was chosen for gets the bigger file (never a smaller one: it is already loaded); the
// smaller one stays shown until the bigger is in. Not after the fallback to 480 px (data-low). Pages with big photos
// (data-fit) call upsize after their layout.
// Saver never moves a shown photo to a bigger file (field HAR: the 480 px quiz photo was cancelled for the 960 px one);
// only the enlarged view does, on the player's tap.
const upsizeImg = (i, px) => {
  if (saver()) return;
  const u = i.getAttribute('src') || '',
    want = fit(px);
  if (px && !i.dataset.low && ownPhoto(u) && PXR[want] > PXR[tierOf(u)]) i.src = resized(u, want);
};
const upsize = (root = $v) =>
  root.querySelectorAll('img[data-fit]').forEach(i => {
    const r = i.getBoundingClientRect();
    upsizeImg(i, Math.max(r.width, r.height));
  });
// A photo that fails on R2 (core.js PHOTO_BASE) is asked from R2 once more (core.js photoRetry, PHOTO_RETRY ms later: a
// passing error; under a service worker the worker has done so already), then moves to its online original at a light
// size, or to the site's file for a photo with none (core.js photoFallback: src, srcset, its 480 px fallback and the game
// backdrop), before the retries below. Without a service worker the next photos of this page go there straight away
// (R2 false, AWAY true): R2 out of reach (a network that blocks it, an outage) costs one failed request, not a missing
// photo. Before every other error listener.
const photoFail = e => {
  const i = e.target;
  if (!(i instanceof HTMLImageElement)) return;
  // A card's photo stays out of sight while it is asked again (the cards' own error listener, quiz.js, which this one
  // stops, does the same for the retries after it: never a broken-image icon on a card); its load shows it again.
  const hide = () => i.closest('.unlock') && i.classList.add('fail');
  // R2 once more first (core.js photoRetry: a passing error), then the online original or the site.
  if (!swOn() && photoRetry(i, away)) return (hide(), e.stopImmediatePropagation());
  if (away(i)) (hide(), e.stopImmediatePropagation());
};
const away = i => {
  // Under a service worker the 480 px step and the backdrop stay on R2, where the worker keeps its offline copies.
  const sw = swOn();
  if (!photoFallback(i, photoLook, sw)) return false;
  if (!sw) (r2Out(), photoFallback(i.closest('figure'), photoLook));
  cropWatch();
  return true;
};
// R2 failed on a page no service worker controls (an element, app.js away, or a quiz preload, quiz.js pump): the next
// photos go to their online original or the site, and the crops are drawn from now on (Codex review #569).
const r2Out = () => ((R2 = false), (AWAY = true), cropWatch());
document.addEventListener('error', photoFail, true);
// A cropped photo shown from its online original gets its crop drawn (core.js photoCropOf: the site's files have it baked
// in): every <img> added or given a new src is checked, from the first fallback on (nothing watches before).
let CROPW = null;
if (AWAY) setTimeout(cropWatch); // R2 switched off: crops drawn from the start, once this file has run (FISH comes below)
const cropSet = i => {
  if (i.style.getPropertyValue('object-view-box') && !i.dataset.vb) return; // a crop drawn by its page (none in the app yet)
  const c = photoCropOf(i.getAttribute('src') || '', photoIdx());
  if (c) (i.style.setProperty('object-view-box', c), (i.dataset.vb = 1));
  else if (i.dataset.vb) (i.style.removeProperty('object-view-box'), delete i.dataset.vb);
};
function cropWatch() {
  if (CROPW || typeof MutationObserver === 'undefined') return;
  CROPW = new MutationObserver(R =>
    R.forEach(r =>
      r.type === 'attributes'
        ? r.target instanceof HTMLImageElement && cropSet(r.target)
        : r.addedNodes.forEach(n => n.nodeType === 1 && (n instanceof HTMLImageElement ? [n] : n.querySelectorAll('img')).forEach(cropSet))
    )
  );
  CROPW.observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['src']});
  document.querySelectorAll('img').forEach(cropSet);
}
// A photo that never loaded (Pierre, 2026-11-05): a light "photo missing" tile instead of a plain one, an inline SVG
// drawn with the theme's tokens (app.css .nophoto: light, dark, colour-blind), no request: a camera struck through, which
// says "no photo" plainly (Pierre's pick: an empty frame could read as a photo still loading). Shown over a quiz photo
// (.qph) and a card's photo band (.ulphoto); gone if the photo comes after all.
const NOPHOTO =
  '<svg viewBox="0 0 64 48"><path class="np-t" d="M8 16a5 5 0 0 1 5-5h8l4-5h14l4 5h8a5 5 0 0 1 5 5v22a5 5 0 0 1-5 5H13a5 5 0 0 1-5-5z"/><circle cx="32" cy="27" r="9"/><path class="np-x" d="M10 4l44 42"/><path d="M10 4l44 42"/></svg>';
const noPhoto = i => {
  const box = i.closest('.qph, .ulphoto');
  if (box && !box.querySelector('.nophoto'))
    box.insertAdjacentHTML('beforeend', `<span class="nophoto" aria-hidden="true">${NOPHOTO}</span>`);
};
const noPhotoGone = i => {
  const n = i.closest('.qph, .ulphoto');
  if (n) n.querySelectorAll('.nophoto').forEach(x => x.remove());
};
// Unstable connection (Pierre, 2026-11-01): a photo that fails is tried again twice (after 1 s, then 4 s); a game photo
// then falls back to its small version (data-lo, 480 px), already behind it as a placeholder. If that fails too, the
// question offers another one instead of a blank frame (nothing is counted). With none of its photos shown, its answers
// are closed (new-player walkthrough 2026-11-04, offline: an answer given to a blank frame counted, and the note was
// below the fold): a guess is no answer. The note is brought into the question's one screen, and the frame left shows
// the "photo missing" tile (noPhoto), never a broken-image icon (as a card's, quiz.js).
$v.addEventListener(
  'error',
  e => {
    const i = e.target;
    if (!(i instanceof HTMLImageElement) || !i.getAttribute('src')) return;
    const n = Number(i.dataset.retry || 0),
      u = i.getAttribute('src');
    if (n < 2) {
      i.dataset.retry = n + 1;
      setTimeout(
        () => {
          if (i.isConnected && i.getAttribute('src') === u) i.src = u.replace(/#.*$/, '') + '#r' + (n + 1);
        },
        1000 * (n + 1) ** 2
      );
    } else if (i.dataset.lo && !i.dataset.low) {
      i.dataset.low = 1;
      i.dataset.retry = 2;
      i.src = i.dataset.lo;
    } else if (i.closest('.qstage')) {
      // Every photo that gave up is a "photo missing" tile, the second of a question too (Codex review #490); the note, the
      // report and the closing of the answers come once.
      i.classList.add('fail');
      noPhoto(i);
      if ($v.querySelector('.q.done, #qfail')) return;
      if (navigator.onLine !== false)
        // By the photo's name (data-f, quiz.js): an iNaturalist URL (a candidate just added, r: 1) is not one admin can look up.
        ev('photo', {
          f:
            i.dataset.f ||
            photoLocal(resized(u, ''))
              .replace(/^img\//, '')
              .replace(/\.webp.*$/, '')
        });
      const a = document.getElementById('after');
      if (a) {
        a.insertAdjacentHTML(
          'afterbegin',
          '<p class="note" id="qfail">A photo did not load (connection). <button type="button" class="linkish">Another question</button></p>'
        );
        a.querySelector('#qfail button').onclick = () => {
          NEXTQ = null;
          route();
        };
      }
      // Another photo of the question may come later, one still trying or one added since (the hint, Codex review
      // #490): the answers open again then (the load listener below).
      const q = $v.querySelector('.q');
      if (q && ![...q.querySelectorAll('.qstage img')].some(x => x.complete && x.naturalWidth)) {
        q.classList.add('qnone');
        qAnswers(q, false);
      }
      if (typeof fitStage === 'function') fitStage();
    }
  },
  true
);
const qAnswers = (q, on) => q.querySelectorAll('[data-c], [data-w], .tyform input, .tyform button').forEach(b => (b.disabled = !on));
$v.addEventListener(
  'load',
  e => {
    if (e.target instanceof HTMLImageElement && e.target.naturalWidth && e.target.classList.contains('fail'))
      (e.target.classList.remove('fail'), noPhotoGone(e.target));
    const q =
      e.target instanceof HTMLImageElement &&
      e.target.naturalWidth &&
      e.target.closest('.q.qnone:not(.done) .qstage') &&
      e.target.closest('.q');
    if (!q) return;
    q.classList.remove('qnone');
    qAnswers(q, true);
  },
  true
);
// Each file's width as a 4:3 box drawn with object-fit: cover sees it (cards, sheet strips, pair cells, Coral ID Key): the
// files are 480 (-s), 960 (-m) and 1600 px (iNat: 500 and 1024) on their LONG side (Saver: no 1600 px), so a portrait or
// panoramic photo has fewer useful pixels than that. Declaring the long side made the browser pick the 480 px file and
// blow it up 1.3-1.9x in a 400-470 px box (design re-review m5).
const coverW = (p, long) => {
  const a = p.ar || 4 / 3;
  return Math.round(Math.min(long * Math.min(1, a), (long * Math.min(1, 1 / a) * 4) / 3));
};
// Thumbnails (home band, progress tiles, look-alike pairs, tips): the 240 or 480 px file, picked by the browser from the
// width the photo is drawn at (sizes, CSS px; with object-fit: cover a tall box draws it wider than the box) and the
// screen density. Pierre, 2026-11-01: the home photos need no big files for how they are shown.
// A remote photo's name rides on its <img> (data-f): its URL is not one flag.js can name it by.
const thumb = (p, sizes) => {
  if (p.r && p.src) return `src="${img(p, 's')}"${p.f ? ` data-f="${esc(p.f)}"` : ''}`;
  if (saver()) return `src="${loc(p, 't')}"`; // Saver: a thumbnail is at most ~240 px (field link: Home's band on a desktop took ~600 KB)
  const w = long => Math.round(long * Math.min(1, p.ar || 4 / 3));
  return `src="${loc(p, 's')}" srcset="${loc(p, 't')} ${w(240)}w, ${loc(p, 's')} ${w(480)}w" sizes="${sizes}"`;
};
const srcset = p =>
  p.r && p.src
    ? `${inat(p, 'medium')} ${coverW(p, 500)}w, ${inat(p, 'large')} ${coverW(p, 1024)}w`
    : `${loc(p, 's')} ${coverW(p, 480)}w, ${loc(p, 'm')} ${coverW(p, 960)}w${saver() ? '' : `, ${loc(p)} ${coverW(p, 1600)}w`}`;
// Small source label on a game photo (Pierre, 2026-11-01: "sources en petit et cliquable sur chaque photo").
// One shared component for every game. Shown only once the answer is out: an iNat link names the taxon and an IMR
// slide number points to a genus. iNat photos (Pierre's and other observers') link to the observation; IMR lecture
// and Coral Finder book photos have no public page, so they get a plain label. Hidden on phones (no room, Pierre): there the
// enlarged view's caption already carries the clickable source.
const author = p =>
  (p.a || '')
    .replace(/^\(c\)\s*/i, '')
    .replace(/,\s*(some|all) rights.*$/i, '')
    .trim();
const photoSrc = p =>
  !p
    ? ''
    : p.cf
      ? `<span class="psrc">Coral Finder p. ${esc(p.pg)}</span>`
      : p.imr
        ? `<span class="psrc" title="IMR Lecture 6${p.slide ? ', slide ' + esc(p.slide) : ''}">IMR lecture</span>`
        : p.o && p.o.includes('inaturalist.org')
          ? `<a class="psrc" href="${esc(safeUrl(p.o))}" target="_blank" rel="noopener" title="${esc(author(p) || 'iNaturalist')}: open the iNaturalist observation"><span class="pa">${esc(author(p))} · </span>iNat ↗</a>`
          : // A FishBase photo Pierre put in play (fish, admin plan PR 7): its author and FishBase's photo page.
            p.via === 'fishbase' && p.o
            ? `<a class="psrc" href="${esc(safeUrl(p.o))}" target="_blank" rel="noopener" title="${esc(author(p))}: open the FishBase photo page"><span class="pa">${esc(author(p).replace(/,\s*via FishBase$/i, ''))} · </span>FishBase ↗</a>`
            : '';
// One colour per IMR lecture group, used everywhere a group appears (style="--g:…", CSS hsl(var(--g) …)).
const groupHue = n => (n * 137) % 360;
const credit = p =>
  p.cf
    ? `© R. Kelley / BYOGUIDES, Coral Finder 2022, p. ${esc(p.pg)}`
    : p.imr
      ? `IMR Lecture 6, slide ${esc(p.slide)}`
      : `<i>${esc(p.t)}</i>${p.own && !p.nd ? ' <span class="own">Dauin</span>' : ''} · <a href="${esc(safeUrl(p.o))}" target="_blank" rel="noopener">${esc(p.a)}</a>`;
// Before the answer the enlarged quiz photo credits its author by name only (Pierre, 2026-11-03): no taxon and no link,
// which would give the genus away (rule P5); the full credit comes with the answer.
const blindCredit = p => {
  const n = p.cf ? 'R. Kelley / BYOGUIDES' : p.imr ? '' : author(p);
  return p.imr ? ' · IMR lecture' : n ? ` · © ${esc(n)}` : '';
};
const allPhotos = g => VIEWS.flatMap(([v]) => (g.views[v] || []).map(p => ({...p, view: v})));
// Card photo: the one picked in curation.json (coverP, may be a lecture photo), else data.json's pick, else the first closer view.
// Default (Pierre): an IMR photo first, the first IMR featured Closer photo, before data.json's pick.
const cover = g =>
  g.coverP ||
  (((g.sl || {}).medium || {}).feat || []).find(p => p.imr) ||
  allPhotos(g).find(p => p.f === g.cover) ||
  (g.views.medium || [])[0] ||
  allPhotos(g)[0];
// applyCuration(d, c) and applySlots(d, c, {picks, autoq}) live in core.js (tested in tests/photos.test.js).
let CUR_NEW = null,
  curAt = Date.now(); // curation read again later (curRefresh)
let RAW,
  CUR,
  FORMS = {gf: {}, form: {}, cf: {}, gunsure: {}},
  AUTOQ = {},
  PICKS = {};
// Genera not on the IMR slate but in the Coral Finder book and present at Dauin (data.json "x", tools/build_extra.py):
// Identify > Coral ID Key only (Pierre, 2026-10-31), on by default, switch in ⚙ on that page. Same photo pipeline,
// kept out of DATA.gen so games, quizzes, progress and the Genera pages never see them.
let XON = store.get('reefid-idkey-x', true);
function build() {
  GDIFF = {};
  NEXTQ = null; // a question planned on the old curation could show a photo it now excludes or moves
  const d = structuredClone(RAW);
  applyCuration(d, CUR);
  applyForms(d, CUR);
  applySlots(d, CUR, {picks: PICKS, autoq: AUTOQ});
  if (d.x) {
    const x = {gen: d.x.gen, course: {}, cand: d.cand};
    applyCuration(x, CUR);
    applyForms(x, CUR);
    applySlots(x, CUR, {picks: PICKS, autoq: AUTOQ});
  }
  DATA = d;
  if (FISHRAW) fishBuild(); // the fish photos under the same curation
}
// The scientific genera of the fish (Pierre, 2026-11-04, docs/FISH_PATH.md "Levels": the path is a tree; branch B starts
// with the scientific genus names, "a photo, then 4 genus names"): one unit per genus of fish.json genera holding
// circle-1 species, the genus being the first word of the PDF name (no grouping invented, rule C2), inside its family
// (fish.json families: the book's; Pierre, 2026-11-06). Its record, beside the families in FISH.gen under its id
// 'g:' + genus (ids and names never meet): rank 'genus' (its questions and typed answers stay among genera: model.js
// sameRank), its family (parent: it opens once the family is at Advanced, the set's units below), its family's group as
// its form (easy wrong choices from other groups first), its sibling genera as look-alikes (the traps, as the species
// level's "same family" choices), the IMR tag (imr: the IMR sub-entry naming it, Chromis, Anemonefish, Bannerfish...)
// with its cues when IMR has them, its species in the game (scientific and common names, commonness order) and its
// family's photos of those species. FISH.sci: every genus, in the families' order.
function fishGenera(X, F) {
  const sp = new Map((F.species || []).map(s => [s.id, s])),
    gens = new Map((F.genera || []).map(g => [g.id, g])),
    sci = [];
  (F.families || [])
    .filter(f => f.circle === 1 && X.gen[f.id])
    .forEach(f => {
      const E = X.gen[f.id],
        own = (f.genera || []).map(id => gens.get(id)).filter(Boolean),
        by = new Map(own.map(G => [G.id, G.species.map(id => sp.get(id)).filter(s => s && s.circle === 1)]).filter(([, L]) => L.length)),
        ids = [...by.keys()];
      by.forEach((L, id) => {
        const G = gens.get(id),
          g = G.name,
          set = new Set(L.map(s => s.id)),
          cues = G.cues && G.cues.length ? G.cues : null,
          wide = E.views.wide.filter(p => set.has(p.sp));
        X.gen[id] = {
          id,
          name: g,
          rank: 'genus',
          one: 'genus',
          parent: f.id,
          fam: E.name + (E.fam ? ' · ' + E.fam : ''), // the card's and the feedback's family line names its family
          wfam: [],
          imrName: G.imr || '', // the IMR tag
          fish: 1,
          circle: 1,
          group: E.group,
          ig: E.ig,
          forms: E.forms,
          look: ids.filter(o => o !== id),
          lk: [],
          lsrc: {},
          qt: cues,
          tl: cues ? 'ID tips (IMR, ' + (G.imr || g) + ')' : 'Its species here',
          // Its species in a line: the 3 most met around Dauin (commonness order), the genus abbreviated, then the count.
          sum:
            (L.length > 3 ? 'Most met here: ' : '') +
            L.slice(0, 3)
              .map(s => s.name.replace(/^\S+/, g[0] + '.') + (s.common ? ' (' + s.common + ')' : ''))
              .join(', ') +
            (L.length > 3 ? `; ${L.length} species in the game.` : ''),
          species: L.map(s => s.id),
          phase: [],
          sub: [],
          cm: Math.round(Math.sqrt(L.reduce((a, s) => a + ((s.present || {}).dauin || 0), 0))),
          levels: 1,
          views: {wide},
          // the PDF genus shown and its species' WoRMS-accepted genera (Codex review #526: Mirolabrichthys) accepted when typed;
          // never its IMR name (Anemonefish): a common name never advances a scientific name (docs/FISH_PATH.md; Codex
          // review #656), it is the family's
          names: [g, ...new Set(L.map(s => (s.now || '').split(/\s+/)[0]).filter(x => x && x !== g))]
        };
        // The card's photo as fishGen picks a family's: the first of its easyRank order (the family's, kept by the filter),
        // whoever took it (Pierre, 2026-11-06).
        if (wide.length) X.gen[id].cover = wide[0].f;
        sci.push(id);
      });
    });
  X.sci = sci;
  // The species' names by id (fish.json species, the PDF name), for the species shown that each answer logs (UNITS species).
  X.spn = Object.fromEntries((F.species || []).map(s => [s.id, s.name]));
  return X;
}
// A unit's rank inside its subject: '' for the corals' genera and the fish families, 'genus' for a fish scientific genus.
// A question's choices and its typed answers stay within the rank of the unit asked (model.js distractors).
const rankOf = n => (GX(n) || {}).rank || '';
// A unit's name when its id is not its name (a fish entry t01: Damselfish; a scientific genus g:Chromis: Chromis), '' for
// a coral genus (its id is its name) or no unit (an "I don't know"): what an answer logs beside the unit (quiz.js answer).
const unitName = n => {
  const g = n ? GX(n) : null;
  return g && g.name && g.name !== n ? String(g.name) : '';
};
// The species of the photos a question showed (UNITS species), each once, joined by ', ': '' when the subject's photos
// name none (the corals' genus photos). Logged with each answer (sheet v60 Species shown).
const speciesShown = L => [...new Set((L || []).map(p => UNITS[SUBJ.id].species(p)).filter(Boolean))].join(', ');
// Every unit of a rank in the subject's opt-in sets, opened or not: the wrong choices a question of that rank may name
// (as a quiz's wrong choices may name any genus), so a family with a single genus in play still gets 4 choices.
const rankUnits = rk => [...new Set(SETS().flatMap(S => (S.all ? S.all() : S.units())))].filter(n => rankOf(n) === rk);
// A unit's record: a genus of the list or of the extra genera, or a fish entry (FISH, by its teaching id: ids and genus
// names never meet). The engine reads every subject's units through it.
const GX = n => DATA.gen[n] || ((DATA.x || {}).gen || {})[n] || (FISH ? FISH.gen[n] : undefined);
// Fish (core.js fishGen over fish.json and the photos): fetched the first time the fish subject is needed. The photos:
// fish-game.json, the ones Pierre put in play, hosted on R2 (tools/fish_game.py, admin plan PR 7), and fish-photos.json,
// the stopgap list (remote iNaturalist photos, tools/fish_photos.py) and the sheet-only photos; core.js fishPhotos
// picks per entry under Pierre's curation (CUR), so FISH is made again whenever the curation is (build, fishBuild).
let FISH = null,
  FISHP = null,
  FISHRAW = null;
const fishBuild = () => {
  const {f, ph, gm} = FISHRAW;
  FISH = fishGenera(fishGen(f, fishPhotos(ph.photos, gm.photos, CUR, f), ph.sheet), f);
  rankPhotos(); // the photos in easyRank order on their difficulty (below)
  return FISH;
};
const fishLoad = () =>
  FISHP ||
  (FISHP = Promise.all([json('fish.json?v=6'), json('fish-photos.json?v=6'), json('fish-game.json?v=1')])
    .then(([f, ph, gm]) => {
      // json() answers {} when a file cannot come: refused here, so nothing empty is kept and the next try fetches again
      // (Codex review #442: a failed load cached an empty fish quiz, with no retry and no way back to the corals). The
      // curated photos are not required: without them every family plays on the stopgap's.
      if (!f || !Array.isArray(f.families) || !f.families.length || !ph || !ph.photos) throw new Error('fish data not loaded');
      FISHRAW = {f, ph, gm: gm && gm.photos ? gm : {photos: {}}};
      const F = fishBuild();
      if (typeof domRecalcAll === 'function') domRecalcAll(); // model.js: units pulled before the fish data came
      return F;
    })
    .catch(e => {
      FISHP = null;
      throw e;
    }));
// The fish units' photos in easyRank order on their difficulty as the game sees it (model.js photoDiff: the judged ease,
// then the players' answers once fish answers are logged and rated), so the card's photo and each list's first photo stay
// the easiest, most reference-like ones as the ratings come (Pierre, 2026-11-06). Run when the fish data or the photo
// stats arrive (sync.js loadStats). With no rating it keeps fishGen's order. The fish data can come at start-up before
// model.js (a later script tier): then fishGen's order stands until the stats reply.
function rankPhotos() {
  if (!FISH || typeof photoDiff !== 'function') return;
  Object.entries(FISH.gen).forEach(([n, g]) => {
    g.views.wide = easyRank(g.views.wide, p => photoDiff(n, p));
    if (g.views.wide.length) g.cover = g.views.wide[0].f;
  });
}
// Per-subject state of the other files (model.js: the first-meeting cards, the opening hold, the comeback; quiz.js: the
// questions planned ahead), reloaded on a switch: each file registers a function here. keep = true for a short visit
// to another subject (inSubject): what can be read again from the device, nothing that is in play.
const SUBJ_HOOKS = [];
function subjectLoad(S, keep) {
  SUBJ = S;
  unitsRenamed(S);
  P = store.get(sKey('progress'), {}) || {};
  Q = qLoad();
  SUBJ_HOOKS.forEach(f => f(keep));
}
// fn() run as if S were the current subject, then back (the sync's summary and merge, sign-in, sign-out). Synchronous.
// SUBJ_VISIT: how many visits are under way (nothing may redraw the page meanwhile: it shows the subject on screen).
let SUBJ_VISIT = 0;
function inSubject(id, fn) {
  const S = subjectOf(id),
    was = {S: SUBJ, P, Q};
  if (S === SUBJ) return fn();
  SUBJ_VISIT++;
  subjectLoad(S, true);
  try {
    return fn();
  } finally {
    SUBJ_VISIT--;
    SUBJ = was.S;
    SUBJ_HOOKS.forEach(f => f(true));
    P = was.P;
    Q = was.Q;
    prog(); // the pill shows the subject on screen again (a visit may have saved, which shows its own)
  }
}
// The subject switch (Pierre, 2026-11-04; docs/DESIGN.md "Subject switch"): two places, one state, the Corals | Fish row
// at the top of Home (home.js) and the subject chip next to the logo in the header (#subjc, showSubj), shown only while
// the player has more than one subject (subjMine: the admin's only while a subject is in beta). The subject's data
// first, then everything reloads for it. Remembered on this device and synced (SUBJECT_KEY, a reefid-sync key). A
// subject the player may not have (subjAt) brings the corals.
function setSubject(id) {
  const S = subjAt(id);
  if (S === SUBJ) return Promise.resolve();
  return UNITS[S.id].load().then(() => {
    store.set(SUBJECT_KEY, S.id);
    if (typeof toastsOff === 'function') toastsOff(); // progress.js: a note about the subject left
    subjectLoad(S);
    showSubj();
    showBon();
    prog();
    if (typeof syncSoon === 'function') syncSoon();
    // A page the new subject does not have (Fish chosen on a coral genus sheet): its section's page for the subject, so the
    // route does not hand the player straight back (Codex review #442; the hand-off in route is for links only).
    // The address says the subject (its prefix): rewritten for the new one in place.
    const sp = subjPage(hashNow());
    if (hrFull(sp) !== location.pathname + location.search + location.hash) history.replaceState(history.state, '', hrFull(sp));
    route();
  });
}
// The subjects this player can switch between (subjOpen): the switches show only when there are two or more.
const subjMine = () => SUBJECTS.filter(subjOpen);
// A subject's icon (core.js SUBJECTS icon: the one SVG set, 24 px grid) and its switch buttons ([data-subj], aria-pressed: the
// subject on screen), each with its icon, its name and, for a subject in beta, a small beta tag.
const subjIcon = (S, px = 18) =>
  `<svg class="sji" viewBox="0 0 24 24" width="${px}" height="${px}" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${S.icon}</svg>`;
const subjBtns = () =>
  subjMine()
    .map(
      S =>
        `<button type="button" data-subj="${S.id}" aria-pressed="${S === SUBJ}">${subjIcon(S)}<span>${esc(S.name)}</span>${S.beta ? '<small class="beta">beta</small>' : ''}</button>`
    )
    .join('');
// Everything that names the subject on screen: the switches ([data-subj] buttons: Home's row, the header chip's menu),
// the header chip itself (the subject on screen, its icon and name; the name steps aside on phones while the Sign in pill
// shows, app.css), ⚙ rows of one subject only (setrow[data-for]), the section tabs' words.
const $subjc = document.getElementById('subjc');
function showSubj() {
  document.documentElement.dataset.subject = SUBJ.id;
  const two = subjMine().length > 1;
  $subjc.hidden = !two;
  $subjc.innerHTML = two
    ? `<button type="button" class="subjb" id="subjb" aria-haspopup="true" aria-expanded="false" aria-controls="subjmenu" aria-label="Subject: ${esc(SUBJ.name)}. Switch" title="Subject: ${esc(SUBJ.name)}">${subjIcon(SUBJ)}<span class="sjn">${esc(SUBJ.name)}</span><svg class="sjc" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button><div class="subjmenu" id="subjmenu" role="group" aria-label="Subject" hidden>${subjBtns()}</div>`
    : '';
  document.querySelectorAll('[data-subj]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.subj === SUBJ.id)));
  document.querySelectorAll('[data-for]').forEach(r => (r.hidden = r.dataset.for !== SUBJ.id));
  // The header's links to the pages that follow the subject carry its prefix (index.html data-key: a page key), each the
  // subject's own page (subjPage: Identify's key is the Fish ID Key with Fish chosen, #fish/identify/key; Codex review #612).
  document.querySelectorAll('a[data-key]').forEach(a => a.setAttribute('href', hr(subjPage(a.dataset.key))));
}
// The header chip's menu: opened and closed by the chip, closed by a choice, Escape or a tap elsewhere (as ⚙).
function subjMenu(open) {
  const m = document.getElementById('subjmenu'),
    b = document.getElementById('subjb');
  if (!m || !b || m.hidden === !open) return;
  m.hidden = !open;
  b.setAttribute('aria-expanded', String(open));
  if (open) (m.querySelector('[aria-pressed="true"]') || m.querySelector('button')).focus();
}
// Every subject switch on any page ([data-subj]: Home's row, the header chip's menu).
document.addEventListener('click', e => {
  const b = e.target.closest('[data-subj]');
  if (b) {
    subjMenu(false);
    setSubject(b.dataset.subj);
  } else if (e.target.closest('#subjb')) subjMenu(document.getElementById('subjmenu').hidden);
  else if (!e.target.closest('#subjmenu')) subjMenu(false);
});
document.addEventListener('keydown', e => {
  const m = document.getElementById('subjmenu');
  if (e.key !== 'Escape' || !m || m.hidden) return;
  subjMenu(false);
  document.getElementById('subjb').focus();
});
// A page of the Learn or Practice section that the subject does not have (core.js SUBJECTS pages: fish have no genus
// sheets, look-alike pages, duels or Memory yet) opens the subject's first page of that section instead; Identify opens
// the subject's own tool (UNITS identify: the Coral ID Key, the Fish ID Key), never the other subject's. The Tools are
// the corals' whatever the subject.
const subjPage = h => {
  const tab = sectionOf(h),
    m = h.startsWith('g-') ? 'sheet' : modeOf(h);
  if (tab === 'identify') return m === UNITS[SUBJ.id].identify ? h : UNITS[SUBJ.id].identify;
  if (m === 'sheet' && subjHas(SUBJ, h)) return h;
  if (
    (tab !== 'learn' && tab !== 'practice') ||
    (m !== 'sheet' && SUBJ.pages.includes(m)) ||
    !(m === 'sheet' || MODES[tab].some(x => x[0] === m))
  )
    return h;
  return MODES[tab].map(x => x[0]).find(k => SUBJ.pages.includes(k)) || '';
};
// A tab's words for the subject ("Photo → genus" for corals, "Photo → family" for fish).
const subjWords = t =>
  t
    .replace(/\bgenus\b/g, SUBJ.one)
    .replace(/\bGenera\b/g, SUBJ.many[0].toUpperCase() + SUBJ.many.slice(1))
    .replace(/\bgenera\b/g, SUBJ.many);
// A photo of the core sources (an IMR lecture photo or Pierre's own): never seen yet, it gets the draw's bonus (model.js
// photoSet), for a subject whose photo sources rank (SUBJECTS tiers, rule P1: the corals). Not for fish (Pierre,
// 2026-11-06): his photos are never boosted; their ease places them (core.js easyRank).
const isCore = p => !!(SUBJ.tiers && (p.imr || p.own));
// A photo the games may teach from: an extra genus's (DATA.x: Millepora, the bonus genera) only if Pierre's own or
// Research Grade on iNaturalist (no gid), as the extra genera were chosen (tools/build_extra.py). One rule for every
// game (the quiz, the exam, the mix-up card, the Lab's typed game: Codex review #379).
const gamePhotoOk = (n, p) => !GX(n).x || p.own || !p.gid;
// Game photos of genus n in view v: one list (core.js applySlots, the featured first), rated by the players' answers
// (model.js photoDiff); the Easy / Medium / Hard sets went on 2026-11-03 (docs/LEARNING.md "Hierarchical photo Elo").
const gamePics = (n, v) => {
  const s = (GX(n).sl || {})[v];
  return s ? s.game : GX(n).views[v] || [];
};
// Growth form of each photo: one of the 7 IMR growth forms (forms.json "forms"; x = form not visible) as p.form, and
// p.polyps when polyps or vesicles are extended. Pierre's choice in curation.json "gf" wins over the first guess in
// forms.json "gf", form and polyps flag each on their own ("p" yes, "n" no). Photos not classified yet keep their old
// Coral Finder letter (forms.json / curation.json "form") as p.cf. p.formUnsure: the form is a guess still to double-check
// (forms.json "gunsure"), not Pierre's (imrFormsOf counts such a form only when two photos have it).
let CFMAP = {};
function applyForms(d, c) {
  const mine = (c && c.gf) || {},
    old = (c && c.form) || {},
    L = v => (v || '').replace(/[pn]/g, ''),
    P = v => ((v || '').includes('p') ? true : (v || '').includes('n') ? false : null);
  const set = p => {
    const m = mine[p.f],
      g = FORMS.gf[p.f],
      l = L(m) || L(g),
      po = P(m) ?? P(g);
    if (l) p.form = l;
    if (l && !L(m) && (FORMS.gunsure || {})[p.f]) p.formUnsure = true;
    if (po) p.polyps = true;
    if (!l && !po) {
      const o = old[p.f] || FORMS.form[p.f];
      if (o) p.cf = o;
    }
  };
  Object.values(d.gen).forEach(g => ['views', 'more'].forEach(k => Object.values(g[k] || {}).forEach(L => L.forEach(set))));
  Object.values(d.course || {}).forEach(L => L.forEach(set));
}
// Photos of genus n that can illustrate Coral Finder front-page box id (e.g. 'B'): those whose IMR form maps to it
// (forms.json "cf": Branching = Branching + Tabulate, ...; L = polyps extended), else the old letter. Colony views
// first, then closer views. Never a "form not visible" photo, a multi-coral photo or a Coral Finder book photo.
const formPhotos = (n, id) => {
  const g = GX(n),
    ok = CFMAP[id] || '';
  return [...(g.views.wide || []), ...(g.views.medium || []), ...(DATA.course[n] || []).filter(p => p.v !== 'macro')].filter(
    p => !p.multi && (ok === 'p' ? p.polyps : p.form ? p.form !== 'x' && ok.includes(p.form) : p.cf === id)
  );
};

// Photos of genus n whose IMR growth form (p.form) is id, colony views first; never multi-coral or book photos.
const imrFormPhotos = (n, id) => {
  const g = GX(n);
  return [...(g.views.wide || []), ...(g.views.medium || []), ...(DATA.course[n] || []).filter(p => p.v !== 'macro')].filter(
    p => !p.multi && p.form === id
  );
};
// IMR growth forms a genus takes (IMR Lecture 6 forms, forms.json "forms"): those seen on its classified photos (one
// photo Pierre or the first guess is sure of, or two unsure ones), plus those the Coral Finder front page gives it
// (forms.json "cf" maps each front-page box to IMR forms; Meandering, which maps to every form, is left out).
// A unit with forms of its own (a fish entry: its IMR shape group, core.js fishGen) takes them as they are.
const imrFormsOf = n => {
  const g = GX(n),
    cnt = {},
    sure = {};
  if (g.forms) return g.forms;
  [...Object.values(g.views).flat(), ...(DATA.course[n] || [])].forEach(p => {
    if (!p.form || p.form === 'x' || p.multi) return;
    cnt[p.form] = (cnt[p.form] || 0) + 1;
    if (!p.formUnsure) sure[p.form] = 1;
  });
  const seen = Object.keys(cnt).filter(k => sure[k] || cnt[k] >= 2);
  // A box that maps to several forms (Branching = Branching or Tabulate) only counts for a genus with no classified photo.
  const cf = [...DATA.key, ...(DATA.gen[n] ? [] : (DATA.x || {}).groups || [])]
    .filter(k => k.id !== 'M' && k.leaves.some(l => l.g.includes(n) || ((DATA.x || {}).leaf[l.id] || []).includes(n)))
    .map(k => (CFMAP[k.id] || '').replace('p', ''))
    .filter(m => m.length === 1 || !seen.length)
    .flatMap(m => [...m]);
  return [...new Set([...seen, ...cf])];
};

/* ---------- shared bits ---------- */
// Genera in IMR slate order (data.json lists them that way, starred genera last).
const slateIdx = n => slateGenera().indexOf(n);
const bySlate = L => [...Object.keys(DATA.gen), ...Object.keys((DATA.x || {}).gen || {})].filter(n => L.includes(n));
// group=true marks the card with its IMR confusion group (strip and tag); 'stripe' draws the strip only.
function card(name, group) {
  const g = GX(name),
    p = cover(g),
    ig = (group === true || group === 'stripe') && g.ig ? DATA.imrg.find(x => x.n === g.ig) : null;
  const im = p
    ? `<img class="ph" src="${img(p, 's')}" srcset="${srcset(p)}" data-sz="card" sizes="${sizesFor('card')}" alt="" loading="lazy">`
    : `<span class="ph none">no photo</span>`;
  return `<a class="card${ig ? ' grp' : ''}" href="${esc(hr('g-' + name))}"${ig ? ` style="--g:${groupHue(ig.n)}"` : ''}>${im}${ig && group === true ? `<span class="ig" title="IMR confusion group ${ig.n}: ${esc(ig.t)}">Group ${ig.n}</span>` : ''}<span class="cap"><i>${esc(name)}</i><small>${g.x ? '<b class="ikxtag">Not on IMR list</b> · ' : g.n ? 'No. ' + g.n + ' · ' : g.ig || !starNote(name) ? '<b class="star">★ not surveyed</b> · ' : `<b class="star">${starNote(name)}</b> · `}${esc(altName(g.fam))}</small><p>${gloss(tipsText(g), undefined, true)}</p></span></a>`;
}
function bindCards(root = $v) {
  root.querySelectorAll('[data-g]').forEach(b => (b.onclick = () => go('g-' + b.dataset.g)));
}
function bindGo(root = $v) {
  root.querySelectorAll('[data-go]').forEach(b => (b.onclick = () => go(b.dataset.go)));
}

// Full-size viewer shared by every page. opts.blind() true = quiz before answering: hide the genus, the taxon and the
// source links; the author's name alone stays (blindCredit).
const lb = document.getElementById('lightbox');
let lbClose = null;
// Back closes the open viewer. A viewer's entry reached with no viewer open (Forward after closing a photo, or Back onto
// it from a link followed inside the viewer) is stepped over, like after a reload (Codex review #344).
addEventListener('popstate', () => {
  if (lbClose) lbClose(true);
  else if ((history.state || {}).lb) history.back();
});
const VIEW_LABEL = {wide: 'Colony', medium: 'Close-up', macro: 'Corallites', close: 'Close-up'};
// The enlarge mark on photos that open this viewer (quiz, duels, genus sheet; Pierre, 2026-11-03: almost no player
// enlarged a quiz photo, 0-2% of answers for all but one, so most did not know they could). A magnifier with a plus in a
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
      // Actual size centred on the point clicked (an RA, 2026-11-02: zoomed in, then had to scroll to find it).
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
  // Phones close an enlarged photo with Back (RA review 2026-11-02: Back changed the page under it, then left the app):
  // opening adds a history entry with the same address, Back (popstate) closes it, and Close takes the entry back.
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
  // At actual size, a mouse drags the photo around (an RA, 2026-11-02: "click and drag rather than scrolling", hand
  // cursor); a touch screen already pans it natively. A press that moves under 5 px is still a click (back to fit).
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
    // Released outside the window (no pointerup reached us): the drag ends here (Codex review #357). No pointer capture:
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

/* ---------- IMR ID tips ---------- */
// Two levels. ID tips (g.qt, tools/id_tips.txt): 2-3 short cues per genus condensed from the lecture, shown
// everywhere a tip appears (quiz, cards, ID tips page, comparisons, genus sheet). Lecture notes (g.imr): the
// lecturers' full cues (slide text, review slides, presenter's notes), only on the genus sheet.
const slideRef = (k, L) => (L && L.length ? `${k} ${L.join(', ')}` : k);
// Content only: the "Review slide: " / "Instructor's notes: " prefixes in data.json are not shown.
const noteText = x => x.replace(/^(Review slide|Instructor's notes): /, '');
// Full lecture notes for the genus sheet.
const notesList = (g, cls = '') =>
  g.imr.length
    ? `<ul class="crit idtips${cls ? ' ' + cls : ''}">${glossAll(g.imr.map(noteText))
        .map(x => `<li>${x}</li>`)
        .join(
          ''
        )}</ul><p class="tref">IMR Lecture 6${g.sl && g.sl.length ? ', ' + slideRef(g.sl.length > 1 ? 'slides' : 'slide', g.sl) : ''}</p>`
    : `<p class="note">Not on the lecture slides: see the Coral ID Key criteria below.</p>`;
// Glossary terms in tips, lecture notes, genus cards, quiz feedback and the Coral ID Key: tap (or focus + Enter) to see
// the definition and its source. Matching patterns per glossary term (Corallite and Polyp glossed too since the beginner
// review of 2026-11-03: players who never had the IMR lecture; "septal teeth" opens Septa):
const GLOSS_PAT = {
  'Septo-costae': 'septo-costae',
  'Septa': 'septa(?:l(?: teeth)?)?',
  'Costae': 'costae',
  'Coenosteum': 'coenosteum',
  'Paliform lobes': 'paliform lobes?',
  'Axial corallite': 'axial corallites?',
  'Verrucae': 'verrucae',
  'Hooded corallites': 'hooded(?: corallites?)?',
  'Extra-tentacular budding': 'extra-tentacular(?: budding)?',
  'Intra-tentacular budding': 'intra-tentacular(?: budding)?',
  'Monticules': 'monticules?',
  'Vesicles': 'vesicles?',
  'Corallite': 'corallites?',
  'Polyp': 'polyps?',
  // The most frequent words of the genus sheets with no entry until 2026-11-03 (tools/apply_plain_terms.py MORE).
  'Free-living': 'free-living',
  'Solitary': 'solitary',
  'Separate walls': 'separate(?:[- ]walls?|-walled)|plocoid',
  'Shared walls': 'shared walls?|cerioid',
  'Phaceloid': 'phaceloid',
  'Radial corallites': 'radial corallites?',
  'Tentacular lobes': 'tentacular lobes?',
  'Axial furrow': 'axial furrow',
  'Spinules': 'spinules?',
  // The wall around each cup (Pierre, 2026-11-03: "wall" is one of the words that link to Coral basics); "separate walls"
  // and "shared walls" keep their own entries (longer patterns win at the same place).
  'Wall': 'walls?'
};
let glossRe = null;
// Each term is underlined once per text block, at its first occurrence: a tip saying "corallites" three times gets one
// underline, not three. seen (a Set) carries that over several calls that make one block (the items of one tips list).
// btn: the text sits inside a button (a Coral ID Key box): the term is tappable but not a focus stop of its own.
function gloss(text, seen = new Set(), btn = false) {
  const t = esc(text);
  if (!DATA.terms) return t;
  if (!glossRe) {
    // Longer patterns first, so "axial corallite" wins over "corallite" at the same place.
    const keys = DATA.terms
      .map(x => x[0])
      .filter(k => GLOSS_PAT[k])
      .sort((a, b) => GLOSS_PAT[b].length - GLOSS_PAT[a].length);
    glossRe = keys.length
      ? {keys, re: new RegExp('\\b(?:' + keys.map(k => '(' + GLOSS_PAT[k] + ')').join('|') + ')\\b', 'gi')}
      : {re: null};
  }
  if (!glossRe.re) return t;
  return t.replace(glossRe.re, (m, ...g) => {
    const k = glossRe.keys[g.slice(0, glossRe.keys.length).findIndex(x => x !== undefined)];
    if (!k || seen.has(k)) return m;
    seen.add(k);
    return `<span class="gt"${btn ? '' : ' tabindex="0" role="button"'} data-gt="${esc(k)}">${m}</span>`;
  });
}
// The items of one list glossed as one block (each term underlined once in the list).
const glossAll = (L, btn) => {
  const seen = new Set();
  return L.map(x => gloss(x, seen, btn));
};
const $gpop = document.createElement('div');
$gpop.className = 'gpop';
$gpop.hidden = true;
$gpop.setAttribute('role', 'tooltip');
document.body.appendChild($gpop);
// A term's text: the plain-words sentence written for beginners (data.json terms[i][3], tools/apply_plain_terms.py), then
// the sourced definition with its source.
const termDef = ([, d, src, plain]) =>
  `${plain ? `${esc(plain)} <span class="gdef">${esc(d)}</span>` : esc(d)}${src ? ` <small class="src">${esc(src)}</small>` : ''}`;
// Coral basics' words (proto/basics.js, its Words list), each with the step that shows it ('<step>' or '<step>|<view>'), a
// card of Corallite anatomy ('@<card>') or none (''), and the plain line used when data.json terms has none. Here, in
// the first tier, so a glossary popup links the same way before and after the Tools tier is in (Codex review #428:
// a deferred '#learn/basics/<term>' opened the last step viewed for an anatomy word or a word with no step).
const BASICS_WORDS = [
  ['Colony', 'colony', 'Many polyps living together on one skeleton.'],
  ['Polyp', 'polyp', 'One tiny coral animal: a soft tube, a mouth, a ring of tentacles.'],
  ['Mouth', 'polyp', 'In the middle of the polyp. IMR asks: is it raised or embedded?'],
  ['Corallite', 'corallite', 'The stony cup of one polyp.'],
  ['Septa', 'septa', 'Thin blades inside the cup, from the rim to the centre.'],
  ['Costae', 'septa', 'The same blades, carrying on outside the cup’s wall.'],
  ['Septal teeth', 'teeth', 'Teeth on the top edge of the septa: fine or large.'],
  ['Wall', 'walls', 'The rim around each cup: separate, shared, forming valleys, or not visible at all.'],
  ['Separate walls', 'walls|separate', 'Each cup has its own wall, with a gap between cups.'],
  ['Shared walls', 'walls|shared', 'Neighbouring cups share one wall, like a honeycomb.'],
  ['Coenosteum', 'walls|separate', 'The skeleton in the gap between cups with separate walls.'],
  ['Valleys', 'walls|valleys', 'Cups merged into long rows with several mouths (brain corals).'],
  ['Indistinguishable walls', 'walls|nowall', 'No wall to see: the lines run from one centre to the next.'],
  ['Septo-costae', 'walls|nowall', 'Those lines, running from one centre to the next when there is no wall.'],
  ['Growth form', 'forms', 'The colony’s shape: branching, massive, plating…'],
  ['Paliform lobes', '@con|pali', 'A crown of small knobs around the centre of the cup.'],
  ['Columella', '@con|columella', 'What fills the very centre of the cup.'],
  ['Axial corallite', '@con|axial', 'The cup at the tip of a branch, bigger than the others.'],
  ['Monticules', '@arr|hydno', 'Small cone-shaped mounds of wall between the cups.'],
  ['Verrucae', '', 'Bumps on the branches, bigger than one cup.'],
  ['Hooded corallites', '', 'Cups that face downwards, like a hood.'],
  ['Vesicles', '', 'Grape-like bubbles some corals inflate by day.']
];
const basicsWord = term => BASICS_WORDS.find(x => x[0].toLowerCase() === String(term).toLowerCase());
const basicsListed = term => !!basicsWord(term);
const basicsRoute = term => {
  const w = basicsWord(term);
  return !w || !w[1] ? '' : w[1][0] === '@' ? 'lab-anatomy|' + w[1].slice(1) : 'basics|' + w[1];
};
// Where a term is shown on a photo (Pierre, 2026-11-03: the technical words of the genus sheets, first-meeting cards and
// quiz tips link to Coral basics): its step, else Corallite anatomy's card, else the Words list when it is there. A page
// key (app.js hr gives its link).
const basicsHref = term => basicsRoute(term) || (basicsListed(term) ? 'basics|words' : '');
// The term whose definition is open, and where it was when the definition was placed next to it (glossMoved).
let glossAt = null;
function showGloss(el) {
  const t = DATA.terms.find(x => x[0] === el.dataset.gt);
  if (!t) return;
  const bh = basicsHref(t[0]),
    to = !bh
      ? ''
      : bh.startsWith('lab-anatomy')
        ? 'Corallite anatomy'
        : bh === 'basics|words'
          ? 'Coral basics: all the words'
          : 'Coral basics: on a photo';
  $gpop.innerHTML = `<b>${esc(t[0])}</b> ${termDef(t)}${bh ? `<a class="gbx" href="${esc(hr(bh))}">${to} ›</a>` : ''}`;
  $gpop.hidden = false;
  const r = el.getBoundingClientRect(),
    w = Math.min(320, innerWidth - 24);
  glossAt = {el, x: r.left, y: r.top};
  $gpop.style.width = w + 'px';
  $gpop.style.left = Math.max(12, Math.min(r.left, innerWidth - w - 12)) + 'px';
  const below = r.bottom + 8,
    h = $gpop.offsetHeight;
  // Below the term, else above it, and always inside the screen (a term high on a tall card, whose definition did not
  // fit above it, went off the top: pages smoke, 2026-11-03).
  $gpop.style.top = Math.max(8, Math.min(below + h > innerHeight - 8 ? r.top - h - 8 : below, innerHeight - h - 8)) + 'px';
}
document.addEventListener(
  'click',
  e => {
    const g = e.target.closest && e.target.closest('.gt');
    if (g) {
      e.preventDefault();
      e.stopPropagation();
      showGloss(g);
    } else if (!e.target.closest('.gpop')) $gpop.hidden = true;
  },
  true
);
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') $gpop.hidden = true;
  else if (e.key === 'Enter' && e.target.classList && e.target.classList.contains('gt')) showGloss(e.target);
});
// A scroll closes the definition, which stays put (fixed), once its term has moved away. Only then: a scroll event comes
// at the next frame, so a card scrolled to bring the term into view, then tapped, closed the definition it had just
// opened (pages smoke, 2026-11-03: the term at the foot of a genus card, a few px below the fold).
const glossMoved = () => {
  if (!glossAt || !glossAt.el.isConnected) return true;
  const r = glossAt.el.getBoundingClientRect();
  return r.left !== glossAt.x || r.top !== glossAt.y;
};
addEventListener(
  'scroll',
  () => {
    if (!$gpop.hidden && glossMoved()) $gpop.hidden = true;
  },
  true
);
// Short ID tips; genera the lecture skips fall back to the Coral Finder summary.
const tipsList = (g, cls = '') =>
  g.qt
    ? `<ul class="crit idtips${cls ? ' ' + cls : ''}">${glossAll(g.qt)
        .map(x => `<li>${x}</li>`)
        .join('')}</ul>`
    : `<p class="keyid">${gloss(g.sum)}</p>`;
const tipsText = g => (g.qt ? g.qt.join(' · ') : g.sum);
// A name as IMR writes it, then its other spelling when a reference writes it differently (data.json `spell`: name →
// [spelling, source]; Pierre, 2026-11-04: "show both, the IMR one first"). Plain text: escape it where it is shown.
const altName = s => {
  const a = ((DATA && DATA.spell) || {})[s];
  return a ? `${s}, also spelled ${a[0]} (${a[1]})` : String(s);
};
// The ID tips view of the Genera page: the 4 lecture questions and the glossary on top, then 2-3 short cues per genus.
const tipsHead =
  () => `<div class="tiphead"><ol class="qtiles" aria-label="IMR Lecture 6: questions to ask">${DATA.tips.map(t => `<li>${esc(t)}</li>`).join('')}</ol>
  <details class="gloss"><summary>Coral anatomy terms</summary><a class="glink" href="${esc(hr('lab-anatomy'))}"><span class="hpv art">${window.homeArt ? homeArt('anatomy') : ''}</span><span><b>Corallite anatomy</b><small>Explore the parts of a corallite on a diagram ›</small></span></a><dl>${DATA.terms.map(t => `<dt>${esc(t[0])}</dt><dd>${termDef(t)}</dd>`).join('')}</dl><p class="note">Wording from IMR Lecture 6 where the lecture defines the term; otherwise the <a href="https://www.coralsoftheworld.org/page/glossary/" target="_blank" rel="noopener">Corals of the World glossary</a>.</p></details></div>`;
const tipCard = n => {
  const g = DATA.gen[n],
    p = cover(g);
  return `<article class="tipg"><a href="${esc(hr('g-' + n))}" class="tipph">${p ? `<img ${thumb(p, '130px')} alt="" loading="lazy">` : ''}<i>${esc(n)}</i></a><div>${tipsList(g)}${
    lookOf(n).length
      ? `<p class="note">Don't confuse with ${lookOf(n)
          .map(b => `<a href="${esc(hr('cmp-' + n + '|' + b))}"><i>${esc(b)}</i></a>`)
          .join(', ')}</p>`
      : ''
  }</div></article>`;
};

/* ---------- key helpers (Coral Finder book boxes, used by genus sheets and the Coral ID Key) + IMR groups ---------- */
const pg = l => (l.a === l.b ? 'p.' + l.a : 'p.' + l.a + '-' + l.b);
const leafLabel = l => l.t + (l.s ? ' · ' + l.s : '');

/* ---------- quiz ---------- */
// The subject the player is on (core.js SUBJECTS: Corals, Fish), chosen on Home or with the header chip (setSubject;
// the admin's only while Fish is in beta), remembered on the device and synced (SUBJECT_KEY). Everything below (P, Q, the slate, the cards, the comeback...) is the current
// subject's; code that must read another subject's state runs inside inSubject() (sync.js: the sheet's summary and
// the merge of every subject's progress). setSubject() switches (subjectLoad: each file's per-subject state).
// A subject that opens to a group (core.js SUBJECTS open: 'group', subjGroup: fish; its "beta" tag is SUBJECTS beta, the
// label only) is the admin's only (Pierre, 2026-11-04: "some things clearly aren't
// ready"; its switches on Home and in the header are shown only to the admin until fish opens): anyone else opens on the corals whatever this device or the
// account saved, and nothing switches them to it (setSubject, a link to a sheet: subjAt). The saved choice and that
// subject's progress stay as they are (synced, merged: inSubject), back on screen if the admin view comes back.
// It opens to a group of players too (Pierre, 2026-11-04: "a group I pick in the admin, for now everyone; not one
// site-wide switch"): the players the admin put in the subject's group (Players, the subject in beta on screen; sheet
// v48, Code.gs groupSet_). The sheet's replies to a load or a save say which groups the signed-in player is in (sync.js
// groupsSeen), kept on this device under the account's name (GROUPS_KEY): another account, or none, is in no group.
const GROUPS_KEY = 'reefid-groups';
const subjGroups = () => {
  const o = store.get(GROUPS_KEY, null),
    a = store.get('reefid-account', null);
  return o && a && o.n === a.name && Array.isArray(o.g) ? o.g : [];
};
const subjOpen = S => !subjGroup(S) || IS_ADMIN || subjGroups().includes(S.id);
const subjAt = id => (subjOpen(subjectOf(id)) ? subjectOf(id) : SUBJECTS[0]);
let SUBJ = subjAt(store.get(SUBJECT_KEY, SUBJECTS[0].id));
const sKey = name => subjKey(SUBJ.id, name); // reefid-sync-<subject>-<name>: travels with the player
const sDev = name => subjDev(SUBJ.id, name); // reefid-<dev><name>: stays on this device
// A subject's stored units under their new ids (core.js renameUnits, SUBJECTS renamed: the fish entries t01... became
// the book's families on 2026-11-06, Groupers keeping IMR's Groupers, the Soapfishes new): its progress and its
// first-meeting cards, moved at every load, since a device on an older app may save the old ids again for a while.
function unitsRenamed(S) {
  ['progress', 'intro'].forEach(k => {
    const key = subjKey(S.id, k),
      o = store.get(key, null),
      r = renameUnits(S, o);
    if (r !== o) store.set(key, r);
  });
}
SUBJECTS.forEach(unitsRenamed); // every subject's, played on screen or not
// Progress per genus (per unit of the subject) {ok, ko, streak, conf}, kept in this browser and synced once signed in.
let P = store.get(sKey('progress'), {}) || {};
const save = () => {
  store.set(sKey('progress'), P);
  prog();
  syncSoon();
};
// The header progress pill (showProg, progress.js): that file comes in tier 4 (index.html), after the quiz on a first
// visit, so the pill keeps its 0% until then.
const prog = () => typeof showProg === 'function' && showProg();
const st = n => P[n] || (P[n] = {ok: 0, ko: 0, streak: 0});
const qLoad = () => {
  const q = Object.assign({view: 'any', level: 'auto'}, store.get(sKey('quiz'), {}), {stars: true}); // starred genera are always asked (Pierre)
  if (q.lvv !== 3) {
    q.level = 'auto';
    q.course = false;
    q.lvv = 3;
  } // Auto only: no level selector, no Lecture set (Pierre, 2026-10-31)
  return q;
};
let Q = qLoad();
const saveQ = () => store.set(sKey('quiz'), Q);
let session = {ok: 0, n: 0, h: []},
  last = null,
  duelPair = null;
// Millepora (fire coral; Pierre, 2026-11-02): not a hard coral (a hydrozoan), so not on the IMR coral list, but on the
// IMR benthic slate (taught in the benthos lecture) and everywhere at Dauin and in ReefCloud photos. A game genus like
// those of the coral slate (the draw, the opening of genera, progress, My progress, the sync summary, achievements); its
// data stays in data.json "x" (Coral Finder ID tips, with their pages; Research Grade game photos, as the bonus genera).
// BENTHIC and BONUS (below) are defined once in core.js, with slateOf / gameOf, which the admin and tools share.
const isBenthic = n => !DATA.gen[n] && BENTHIC.includes(n) && !!GX(n);
// What each subject's units are, read from its data (core.js SUBJECTS holds the rest of the taxon model):
//   load()   its data, before its pages open (corals: data.json, always loaded; fish: fishLoad)
//   pick     its line where a player with two subjects picks the one to start with (tour.js, the welcome tour's first step)
//   tour     the welcome tour's words for its steps on this subject, where they differ from the steps' own (tour.js words)
//   slate()  the units the games teach and the progress counts ("the slate" in the code): for corals the IMR coral slate
//            (data.json order, starred genera last) and BENTHIC (core.js slateOf); for fish every family of every circle
//   core()   the part of the slate the lecture teaches, which "Open all" opens (model.js introLeft); the slate if absent
//   gate(n)  whether slate unit n may open now (the opening, model.js mayOpen); always if absent
//   sets     the opt-in sets (core.js SUBJECTS optin), offered once by a card (quiz.js bonusOfferShow) when due() and
//            switched in ⚙ ([data-optin] rows): units() once on, the card's words, tag (cards, My progress)
//   opens    the parts of the slate that open only once the player says yes (core.js SUBJECTS optin; no ⚙ row): their
//            units count in the progress all the same, whether open or not. Offered by a card (quiz.js openOfferShow) when
//            due(), again once OPEN_AGAIN answers after a "Not now" (core.js openState), then never; My progress opens them any time
//            once due (progress.js). k, units(), due(), the card's words (kick, title, body, yes, note), row (My progress)
// Bonus genera (Pierre, 2026-11-01; opt-in since 2026-11-02): genera off the IMR slate that are common at Dauin and
// easily taken for a slate genus. Picked from the Coral Finder book genera present at Dauin (data.json "x",
// tools/build_extra.py): 4+ Research Grade iNaturalist observations within 40 km, and a look-alike on the slate named by
// the Coral Finder (Isopora / Acropora, Leptoseris / Pavona, Sandalolitha / Halomitra, Pleuractis / Lobactis), or not a
// hard coral at all (Heliopora). Offered once, by a card, when the player has asked every slate genus (quiz.js
// bonusOfferShow); ⚙ Bonus genera On / Off changes it any time (Q.bon; Off keeps their progress). Once on, they join
// the genera not met yet and open like the others (model.js weighted, OPEN). They never count in the progress (progPct,
// the slate tiles, the sync summary), and their ID tips come from the Coral Finder, labelled as such.
// Game photos: Research Grade observations (or Pierre's own) only, never multi-coral (tools/apply_bonus.py).
// The list: core.js BONUS.
// Fish circles (fish.json, per family: its best species' circle). Circle 1: the families the IMR course teaches (IMR's
// list of survey fish); circle 2: seen now and then on the SVS videos (barracudas); circle 3: the families divers look for
// around Dauin, muck diving above all. Every circle is on the path and counts in the progress (Pierre, 2026-11-06, Q175:
// the two opt-in settings, "SVS video extras" and "Beyond IMR", are gone). Circles 2 and 3 open after the IMR course's
// families, as its continuation, at the thresholds the opt-in offers had (2026-11-03) (fishGate): circle 2 by itself once
// every circle-1 family has been asked, circle 3 once the progress on circle 1 reaches FISH_C3 (50%, "Open Water" on
// average; Pierre, 2026-11-06, Q177) and the player said yes (Pierre, 2026-11-07 08:50: circle 3 an option; UNITS fish
// opens, the card at the threshold, My progress any time after). Its families count in the fish % open or not (Q204: 100%
// is everything known, circle 3 included; a player who says no has room left). Within what may open, the usual weighted
// opening (model.js openPick).
const FISH_C3 = 0.5;
const fishGate = n => {
  const c = (GX(n) || {}).circle || 1;
  if (c < 2) return true;
  const c1 = FISH ? FISH.c1 : [];
  return c < 3 ? c1.every(x => asked(x) && introduced(x)) : progPct(c1) >= 100 * FISH_C3;
};
const UNITS = {
  coral: {
    // Its Identify tool (MODES identify): the Coral ID Key (proto/idkey.js).
    identify: 'idkey',
    load: () => Promise.resolve(),
    // Its line under its name where a new player picks the subject to start with (tour.js pick).
    pick: 'The coral genera of the IMR slate, as on ReefCloud photos.',
    slate: () => slateOf(DATA),
    // The species a photo shows, for the answer log (app.js speciesShown): none, a coral question is about the genus.
    species: () => '',
    // A photo by its name, for the admin's "Bad photo" flag (flag.js): {id, its key in the subject's curation (flag),
    // and what the flag records: its genus and view}, null when no genus shows it (the views, more, approved book photos,
    // the lecture photos).
    photo: f => {
      for (const [n, g] of Object.entries(DATA.gen)) {
        for (const [v] of VIEWS) {
          if ([...(g.views[v] || []), ...((g.more || {})[v] || [])].some(p => p.f === f)) return {id: f, genus: n, view: v};
          if ((g.book || []).some(p => p.f === f && p.view === v)) return {id: f, genus: n, view: v};
        }
        const c = (DATA.course[n] || []).find(p => p.f === f);
        if (c) return {id: f, genus: n, view: c.v};
      }
      return null;
    },
    // Every name a player may type (quiz.js typeNames) and how a typed text is read (core.js typeMatchIn).
    names: () => typeNamesOf([...Object.keys(DATA.gen), ...Object.keys((DATA.x || {}).gen || {})], GX),
    norm: typeNorm,
    // Look-alike pairs for the duels (quiz.js duelPick): the classic pairs (learn.js pairs), and Millepora and the bonus
    // genera with the slate look-alike the Coral Finder names.
    pairs: () => [
      ...pairs(),
      ...[...BENTHIC, ...BONUS]
        .filter(b => GX(b))
        .flatMap(b =>
          GX(b)
            .look.filter(a => DATA.gen[a])
            .map(a => [a, b])
        )
    ],
    winks: () => [],
    // The Learn page (#learn/genera): the Genera page (learn.js), and a genus's sheet (#learn/genus/Acropora).
    list: () => viewGenera(),
    sheet: n => viewGenus(n),
    sets: [
      {
        k: 'bon',
        units: () => BONUS.filter(n => GX(n)),
        due: () => slateGenera().every(n => asked(n) && introduced(n)), // a genus closed again by "One at a time" (model.js introBack) waits for its card first
        kick: 'Every genus of the slate met',
        title: n => `${n} more genera?`,
        body: 'Not on the IMR coral list, but common at Dauin: you may meet them on dives and in ReefCloud photos.',
        note: "⚙ Settings, Bonus genera, any time. They don't count in your progress.",
        tag: 'Bonus genus',
        name: 'Bonus genera',
        card: 'Not on the IMR list, but common at Dauin.'
      }
    ]
  },
  fish: {
    // The Fish ID Key, coming soon (home.js viewFishKey; ROADMAP "Fish ID Key for EventMeasure").
    identify: 'fishkey',
    load: () => fishLoad(),
    pick: 'The reef fish families, as on the IMR survey videos.',
    // The welcome tour's words for its steps on this subject (tour.js words; the corals' are the steps' own): {t, d}, d a
    // text or a function of "Tap" / "Click". Fish have one game for now (SUBJECTS pages) and their key is coming soon.
    tour: {
      doors: {
        d: 'Learn & practise while you learn the families. Identify when you need to name a fish on a survey video, or one you photographed on a dive: its key is coming soon.'
      },
      games: {
        t: 'The fish quiz',
        d: 'Practice in the menu opens the quiz: name the family from photos. Its look-alikes come in as you get a family right.'
      },
      progress: {
        d: tap =>
          `Each family fills up as you get it right on harder photos, then a surprise exam in the quiz makes it learned. ${tap} to see every family in the game.`
      }
    },
    // The cards that tell a player about the subject, one per way it opens (core.js SUBJECTS open; progress.js subjHello:
    // once per device, at a calm moment on Home). group: the invitation to test the fish beta, for the players of its
    // group only (Pierre, 2026-11-06: "you're invited to test the fish beta"). all: the same invitation to every player
    // while the subject keeps its beta label (fish since Q158). No number (the families may change), no date.
    hello: {
      group: {
        kick: 'Invitation',
        title: 'Test the fish beta',
        body: '<p>You’re invited to try fish: learn the reef fish families with the same game as the corals.</p><p>Switch between Corals and Fish at the top of Home, any time: your coral progress stays as it is.</p><p class="note">Beta: still being built, iNaturalist photos for now. Your feedback helps: send it from the ? on any page.</p>'
      },
      // all (Pierre, Q158: fish opened to all, the beta label kept): the same card to each player, once, while fish keeps
      // its beta label (progress.js subjHello), as an invitation to try the beta.
      all: {
        kick: 'Invitation',
        title: 'Test the fish beta',
        body: '<p>Try fish, now in beta: learn the reef fish families with the same game as the corals.</p><p>Switch between Corals and Fish at the top of Home, any time: your coral progress stays as it is.</p><p class="note">Beta: still being built, iNaturalist photos for now. Your feedback helps: send it from the ? on any page.</p>'
      }
    },
    // About and credits (home.js viewAbout), shown only to a player the subject is open to (subjMine): what they learn
    // (Who made it), where its content comes from (Course content) and the works it cites (References).
    about: {
      who: 'reef fish families',
      course:
        'The fish families follow the reef fish ID book (References); the cues, the look-alikes and IMR’s names come from the IMR fish presentation.',
      refs: '<li>Gerald Allen, Roger Steene, Paul Humann and Ned DeLoach, <i>Reef Fish Identification: Tropical Pacific</i> (2nd ed., 2015), New World Publications: its identification groups order the fish families.</li>'
    },
    slate: () => (FISH ? [...FISH.c1, ...FISH.c2, ...FISH.c3] : []),
    core: () => (FISH ? FISH.c1 : []),
    gate: fishGate,
    // Circle 3, the families beyond the IMR course (Pierre, 2026-11-07 08:50): offered at the Q177 threshold instead of
    // opening by itself; once on, its families open one at a time like any other. They count in the % either way (Q204).
    opens: [
      {
        k: 'beyond',
        units: () => (FISH ? FISH.c3 : []),
        due: () => !!FISH && progPct(FISH.c1) >= 100 * FISH_C3,
        kick: 'Beyond the IMR course',
        title: () => 'More fish families, beyond the IMR course?',
        body: 'The families divers look for around Dauin, muck diving above all: frogfishes, ghost pipefishes, seahorses, morays…',
        yes: 'Open them',
        note: 'Also in My progress, any time.',
        row: n => `Open the families beyond IMR (${n} ${n > 1 ? 'families' : 'family'})`
      }
    ],
    // The species a photo shows (fish-photos.json sp, its PDF name: fishGenera spn), for the answer log (speciesShown).
    species: p => (FISH && FISH.spn && p && p.sp && FISH.spn[p.sp]) || '',
    // A photo by its name, for the admin's "Bad photo" flag (flag.js): {id, its key in the subject's curation (core.js
    // fishPid: one photo under its stopgap, candidate and reference names), and what the flag records: file (its name),
    // unit (the entry showing it, else a scientific genus), sp (its species), view}; null when no unit shows it.
    photo: f => {
      const id = fishPid(f),
        G = Object.values(FISH ? FISH.gen : {}).sort((a, b) => !!a.rank - !!b.rank);
      for (const g of G)
        for (const [v, L] of Object.entries(g.views || {})) {
          const p = (L || []).find(x => x && fishPid(x.f) === id);
          if (p) return {id, file: p.f, unit: g.id, ...(p.sp ? {sp: p.sp} : {}), view: v};
        }
      return null;
    },
    names: () => fishTypeNames(FISH ? FISH.gen : {}, SUBJ.typeDrop),
    norm: typeNormAll,
    // The look-alikes the IMR presentation names, each pair once.
    pairs: () =>
      Object.values(FISH ? FISH.gen : {})
        .filter(g => !g.rank) // the scientific genera's siblings are traps, not duels
        .flatMap(g => g.look.filter(o => FISH.gen[o] && (g.id < o || !FISH.gen[o].look.includes(g.id))).map(o => [g.id, o])),
    // The winks (quiz.js winkShow): for every fish player, from circle 1 on (Pierre, 2026-11-03: "ça sera rigolo" for the
    // people working on the IMR course).
    winks: () => (FISH ? FISH.winks.filter(n => FISH.gen[n].views.wide.length) : []),
    list: () => viewFishList(),
    // Its sheets (learn.js): a family, a genus or a species, by its id (core.js SUBJECTS sheets), and the page bar's
    // name line for each.
    sheet: id => viewFishSheet(id),
    bar: id => fishBar(id),
    // The achievements page's ? text (progress.js viewAch).
    achHelp: () =>
      `<p class="lede">Achievements mark milestones of your fish learning: families met (those of the IMR course, then every family in the game), families at each level (Open Water, Advanced, Divemaster, Instructor), your fish progress, and scientific genus names. Never time spent. They are the fish's own: your coral achievements are on the Corals side. Contributions, apart, thank you for the reports and feedback you send (⚑ Report a problem, Send feedback); they never count in your progress. The share of players counts everyone who signed in.</p>`,
    // My progress's ? text (progress.js quizBoard).
    progHelp: () =>
      `<p class="lede"><b>To learn a fish family</b>, keep getting it right: its % is the share of its photos you would name alone and typed, as far as your answers on it have shown, up to 95%. From ${Math.round(100 * DOM.EX)}%, once it has been asked beside each of its look-alikes, comes its <b>mastery exam</b>: ${EXAM.n} hard questions on it slipped unannounced into the quiz, at least ${TYPED.exam} of them typed; all right and you are its Instructor (100%). A mistake sets a family back, for the family you missed and for the one you answered. <b>Levels</b>: Snorkeler under 50%, Open Water from 50%, Advanced from 80%, Divemaster from ${Math.round(100 * DOM.EX)}% (its exam is on), Instructor once the exam is passed. Every fish family counts in your progress. You start with the families of the IMR survey; more families open as you go. The surprise cards don't count. The fish have their own leaderboard and achievements.</p>`,
    // The quiz's ? text (quiz.js gameHelp).
    help: () => `<p class="lede">Name the fish family in the photo: the families of the reef fish ID book, IMR’s name shown beside its own. Pick an answer (or press 1-4); after answering you get the IMR cues and, when you mix up two look-alikes, how IMR tells them apart. <b>Next</b> (or Enter) goes on. The other choices start in other groups of the ID book and the look-alikes come in as you get a family right.</p>
  <p class="lede">A family fills up to 95% with your right answers; it is learned (100%) once you pass its mastery exam, ${EXAM.n} hard questions slipped unannounced into the quiz, at least ${TYPED.exam} of them typed. Typed answers accept the family’s name, IMR’s name, its scientific name and the names IMR uses inside it (Chromis, Bannerfish...). Every fish family counts in your progress. You start with the families of the IMR survey; more families open as you go. <b>Photos</b>: from iNaturalist and FishBase; the easiest, reference-quality photos come first, whoever took them.</p>`,
    sets: [
      // The scientific genera (fishGenera, above; docs/FISH_PATH.md "Levels", branch B): offered once a family is at Open
      // Water (Pierre, 2026-11-07, Q205; it was Advanced, far too late under the cautious bar of #646); on, a family's
      // genera join the game when the family reaches Open Water, then open one at a time like any unit (a genus met stays in). all: every genus,
      // for setOf. Not in the progress yet (the global fish score, FISH_PATH "My progress (fish)", is not built).
      {
        k: 'sci',
        all: () => (FISH ? FISH.sci || [] : []),
        units: () =>
          (FISH ? FISH.sci || [] : []).filter(n => typeof genScore === 'function' && (introduced(n) || genScore(GX(n).parent) >= LV_AT[0])),
        due: () => typeof genScore === 'function' && slateGenera().some(n => genScore(n) >= LV_AT[0]),
        page: false, // not on the families page
        kick: 'Scientific names',
        title: () => 'Scientific genus names?',
        body: 'For the families you know well: a photo and four scientific genus names, as EventMeasure names them. A family’s genera come as you reach Open Water on it.',
        note: "⚙ Settings, Scientific names, any time. They don't count in your progress yet.",
        tag: 'Scientific genus',
        name: 'Scientific names',
        card: ''
      }
    ]
  }
};
const SETS = () => UNITS[SUBJ.id].sets;
// The genera the games teach and the progress counts (the units of the subject): "the slate" in the code means this list.
const slateGenera = () => UNITS[SUBJ.id].slate();
// The opt-in set a unit belongs to (the coral bonus genera, the fish scientific genera), or null.
const setOf = n => SETS().find(S => (S.all || S.units)().includes(n)) || null;
const isBonus = n => !!setOf(n);
// Players who had bonus genera unlocked by the former progress thresholds (Q.bu, Millepora counted first) keep them
// on, so nothing disappears under them; Millepora alone (Q.bu 1) is now a slate genus, so not an opt-in.
if (Q.bon === undefined && Q.bu > 1) {
  Q.bon = true;
  saveQ();
}
// The units of the opt-in sets the player has on.
const bonusList = () => SETS().flatMap(S => (Q[S.k] ? S.units() : []));
// The parts of the slate opened by choice (UNITS opens). One is on once the player said yes, or, never asked, when one of
// its units already opened on a card (players whose circle 3 opened by itself, 2026-11-06 to 2026-11-07, keep it: Pierre,
// 2026-11-07). A unit of a part that is off never opens (model.js mayOpen); one already open stays open.
// (core.js openState: on, row, ask; the card again once, OPEN_AGAIN answers after a first "Not now", then never).
const opensNow = () => UNITS[SUBJ.id].opens || [];
const openOf = (S, full) => {
  const L = S.units(),
    m = introMap();
  return openState(Q, S.k, {
    met: L.some(n => n in m),
    due: full && S.due(),
    left: full && L.some(n => !introduced(n)),
    at: full ? answersSoFar() : 0
  });
};
const openShut = n => opensNow().some(S => S.units().includes(n) && !openOf(S).on);
// What My progress offers to open (progress.js): the parts off, due, with a unit not open yet.
const opensOff = () => opensNow().filter(S => openOf(S, 1).row);
// The card, the first due (quiz.js openOfferShow; Pierre, 2026-11-07: "don't ask again for a while", at most once more).
const openOfferDue = () => opensNow().find(S => openOf(S, 1).ask) || null;
// "Not now" on the card: off, counted, with the answer count it was said at.
function openNo(k) {
  Q[k + 'N'] = (Q[k + 'N'] || 0) + 1;
  Q[k + 'A'] = answersSoFar();
  bonusSet(false, k);
}
// ⚙ Bonus genera On / Off (fish: Scientific names), and the offer card (quiz.js bonusOfferShow): saved in the
// quiz settings, synced with them. Off takes them out of the photo quiz and the duels; their progress is kept. Questions
// planned ahead with the old units are dropped by themselves (planKey names the units in play).
const showBon = () =>
  document
    .querySelectorAll('[data-optin] button')
    .forEach(b => b.setAttribute('aria-pressed', String((b.dataset.on === '1') === !!Q[b.closest('[data-optin]').dataset.optin])));
// Q[k + 'T']: when the choice was made, so the latest choice wins across devices (sync.js mergeSaved; Codex review #371).
function bonusSet(on, k = SETS()[0].k) {
  Q[k] = !!on;
  Q[k + 'T'] = Date.now();
  saveQ();
  showBon();
  if (typeof syncSoon === 'function') syncSoon();
  if (RAW && hashNow() === 'progress') route();
}
document
  .querySelectorAll('[data-optin] button')
  .forEach(b => (b.onclick = () => bonusSet(b.dataset.on === '1', b.closest('[data-optin]').dataset.optin)));
showBon();
// The warning on Millepora's first-meeting card and genus sheet (Pierre, 2026-11-02).
const BENTHIC_NOTE =
  "Not a hard coral and not on the IMR coral list, but it's on the IMR benthic slate and very common at Dauin, including in ReefCloud photos.";
// A genus of the games: the slate (coral and benthic) or a bonus genus.
const gameGenus = n => !!DATA.gen[n] || isBenthic(n) || isBonus(n);
const pool = () => [...slateGenera(), ...bonusList()].filter(n => photoSet(n).shown.length);
// The plain sentence (Pierre, 2026-11-03): one everyday-words line per genus (data.json `plain`, tools/apply_plain_sheets.py),
// clear for everyone, beginners included. Right under the photo of the genus sheet and of the first-meeting card, before
// the ID tips and lecture notes, in body text with no label (Pierre's review: a muted labelled line above the photo was
// skipped). It adds to the scientific text and replaces none of it.
const plainLine = g => (g.plain ? `<p class="plainw">${esc(g.plain)}</p>` : '');
// A unit's name as shown: a genus (its key is its name) in italics, a fish entry (its key is a stable id, fish.json) by
// its IMR name. unameT: the plain text (tooltips, aria labels).
const unameT = n => (GX(n) || {}).name || n;
const uname = n => {
  const g = GX(n) || {};
  return g.name && !g.rank ? esc(g.name) : `<i>${esc(g.name || n)}</i>`; // a fish scientific genus in italics, as a coral genus
};
// ID tips heading: the lecture's for slate genera, the Coral Finder's (with its pages) for bonus genera.
const tipsLabel = g => g.tl || (g.x ? `ID tips (Coral Finder p. ${g.pages.join(', ')})` : 'ID tips (IMR)');
// What is wrong with the sync, in words, or '' when everything is saved.
function syncTrouble() {
  if (!SYNC_URL || !SYNC) return '';
  if (SYNC.err === 'pin') return 'Not saved: code refused';
  if (SYNC.err === 'archived') return 'This account is archived.'; // sync.js archivedOf (Q88); Pierre's wording, no explanation
  if (SYNC.err === 'gone')
    return SYNC.into ? `Not saved: this account was merged into ${SYNC.into}` : 'Not saved: this account was removed';
  // Too many wrong codes for this name (anyone can cause it): say so rather than "could not reach the sheet" (code re-review L3).
  if (SYNC.err === 'wait') return 'Not saved yet: too many wrong codes for this name, try again in 10 minutes';
  const n = (SYNC.log || []).length;
  if (SYNC.err)
    return n
      ? `Not saved yet: ${n} answer${n > 1 ? 's' : ''} waiting`
      : 'Not saved online yet: no connection (your progress stays on this phone)';
  return '';
}
// The sync sheet's address and this device's sign-in: state that many pages read, kept here with the pages; the code
// that talks to the sheet is in sync.js.
const SYNC_URL = 'https://script.google.com/macros/s/AKfycbyt6l9sBeWP4KacPx1SUbsk9-15uJikxRafrpwF6b2oAE8GgrnPOtuJg7IqfFG5ymrR/exec';
// How a message names it ("Progress loaded from your account."): players are never told about "the sheet" (Pierre).
const SHEET_NAME = 'your account';
// A copy run on this computer (tests, tools/perf.js, a developer) never sends anonymous answers or reports to the real
// sheet (Pierre, 2026-11-02: 17 "players" in the admin were tools/perf.js runs: once the service worker was in, its
// requests passed by the test's network mocks and reached the sheet). A browser driven by a program (Playwright,
// Selenium: navigator.webdriver) counts as one whatever its address (Pierre, 2026-11-03: an agent's test served the app
// under a made-up host name to test the sending and relied on the network mocks; the requests a page sends while it
// unloads escaped them, and 100 made-up answers and 6 events reached the sheet). No player's browser sets it.
const LOCAL =
  /^(localhost|127\.\d+\.\d+\.\d+|\[::1\])$/.test(location.hostname) || location.protocol === 'file:' || navigator.webdriver === true;
// Signed-in traffic (signing in, saving, loading a saved account) goes through sheetFetch, so a local copy never reaches
// the sheet with a name either (Pierre, 2026-11-03: the guard above covered anonymous answers, reports and events, not a
// test that signs in). A test answers it with window.SHEET_STUB(url, options), set before the app loads (pages.smoke.js);
// without one a local copy gets an error and stays signed out. Players never run a local copy.
const sheetFetch = (url, o) =>
  !LOCAL
    ? fetch(url, o)
    : typeof window.SHEET_STUB === 'function'
      ? window.SHEET_STUB(url, o)
      : Promise.reject(Object.assign(new Error('local copy: the sheet is off'), {local: true}));
let SYNC = store.get('reefid-account', null),
  syncTimer = null;

// Coral basics finished (proto/basics.js: every step seen), on this device or on another one (the achievement's feat
// _basics in the synced achievements record, progress.js). The Home line and the first-launch offers read it.
const BASICS_KEY = 'reefid-basics';
// Its icon (a polyp on its cup; the Tools hub's too, proto/lab.js LAB_ICONS).
const BASICS_ICON =
  '<path d="M5 21h14M8.5 21v-5.5h7V21"/><path d="M12 15.5V8.3M10.5 15.5 6 9.3M13.5 15.5 18 9.3"/><circle cx="12" cy="6.5" r="1.7"/><circle cx="5" cy="7.8" r="1.7"/><circle cx="19" cy="7.8" r="1.7"/>';
const basicsDone = () => !!((store.get(BASICS_KEY, {}) || {}).fin || (store.get('reefid-sync-ach', {}) || {})._basics);
// The basics module of the subject on screen (SUBJECTS pages 'basics': Coral basics; no Fish basics yet) not done yet:
// what "I'm new" and the first-launch question's "lower" card offer, and the Home line. A subject without one offers none.
const basicsDue = () => SUBJ.pages.includes('basics') && !basicsDone();
// The answers to the first-launch question (core.js CHOICE) as big buttons, one per row, with a line each, in the words
// of the subject on screen (SUBJECTS start): the tour, the card that asks it, and the fallback card (only: the choices it
// offers). cur: the current answer, marked.
const startOptsHtml = (cur, only) =>
  `<div class="startopts" role="group" aria-label="${esc(SUBJ.start.q)}">${(only || CHOICE.opts.map(o => o[0]))
    .map(c => [c, startText(SUBJ.id, c)])
    .filter(([, x]) => x)
    .map(
      ([c, [t, d]]) =>
        `<button type="button" class="startopt" data-start="${c}" aria-pressed="${c === cur}"><b>${esc(t)}</b><small>${esc(d)}</small></button>`
    )
    .join('')}</div>`;

/* ---------- routing ---------- */
// Opens the page of key h (or draws it again when it is on screen).
function go(h) {
  if (hashNow() === h && location.hash === hr(h)) route();
  else if (!routeOut(h, SUBJ)) {
    history.pushState({d: ++pageDepth}, '', hrFull(h));
    route();
  } else location.hash = hr(h);
}

// Photo size (small / medium / large), remembered per page in localStorage (key reefid-sync-size).
// Each page reads :root[data-size] in its own CSS; pages where it means nothing (games that fill the screen,
// home, progress) hide the S/M/L buttons, keeping their room so the header never changes size.
// Keyed by page name (core.js pageName: learn.genera, learn.genus, learn.compare…).
const SIZE_PAGES = ['learn.genera', 'learn.genus', 'learn.compare', 'identify.key', 'tools.gallery', 'tools.elim'];
const pageKey = () => pageName(hashNow());
function sizePrefs() {
  try {
    return JSON.parse(localStorage.getItem('reefid-sync-size')) || {};
  } catch (e) {
    return {};
  }
}
// Default M, except Genera (S: more genera per screen, groups easier to compare).
function photoSize() {
  return sizePrefs()[pageKey()] || (pageKey() === 'learn.genera' ? 's' : 'm');
}
const SIZES = {
  // Measured 2026-11-01 (390 to 1920 px windows): S 170-194 px, M 356-415, L 356 on phones and 615-631 above.
  card: {s: '(max-width:599.98px) 46vw, 200px', m: '(max-width:599.98px) 92vw, 420px', l: '(max-width:599.98px) 92vw, 640px'},
  strip: {s: '(max-width:599.98px) 46vw, 260px', m: '(max-width:599.98px) 92vw, 420px', l: '(max-width:599.98px) 92vw, 640px'}
};
const sizesFor = kind => SIZES[kind][photoSize()];
function applySize() {
  const s = photoSize(),
    on = SIZE_PAGES.includes(pageKey());
  document.documentElement.dataset.size = s;
  const sz = document.getElementById('size');
  document.getElementById('sizerow').hidden = !on;
  document.getElementById('xrow').hidden = pageKey() !== 'identify.key';
  document.querySelectorAll('img[data-sz]').forEach(i => (i.sizes = sizesFor(i.dataset.sz)));
  document.querySelectorAll('#size button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.size === s)));
}
const phone = isPhone;
const cycle = b => b; // all choices are visible in the settings panel
const showX = () =>
  document.querySelectorAll('#xgen button').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.x === '1') === XON)));
document.querySelectorAll('#xgen button').forEach(
  b =>
    (b.onclick = () => {
      XON = b.dataset.x === '1';
      store.set('reefid-idkey-x', XON);
      showX();
      if (RAW) route();
    })
);
showX();
// Photo quality (Auto / Saver / Full, see fit): the next photos follow it; a bigger choice also upgrades those shown.
const showPQ = () => document.querySelectorAll('#pq button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.pq === PQ)));
document.querySelectorAll('#pq button').forEach(
  b =>
    (b.onclick = () => {
      PQ = b.dataset.pq;
      store.set('reefid-photo-q', PQ);
      NEXTQ = null;
      showPQ();
      if (typeof fitStage === 'function') fitStage();
      upsize();
    })
);
showPQ();
document.querySelectorAll('#size button').forEach(
  b =>
    (b.onclick = () => {
      b = cycle(b);
      const p = sizePrefs();
      p[pageKey()] = b.dataset.size;
      try {
        localStorage.setItem('reefid-sync-size', JSON.stringify(p));
      } catch (e) {}
      applySize();
    })
);
// Light / dark theme switch. Light by default (rule U3), whatever the system's theme; the reader's pick is kept.
// A Light | Dark segmented switch like the other settings (design review 2026-11-01: one control type per kind of choice).
function isDark() {
  return document.documentElement.dataset.theme === 'dark';
}
function showTheme() {
  const d = isDark();
  document.querySelectorAll('#theme button').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.th === 'dark') === d)));
}
document.querySelectorAll('#theme button').forEach(
  b =>
    (b.onclick = () => {
      const t = b.dataset.th;
      document.documentElement.dataset.theme = t;
      try {
        localStorage.setItem('reefid-sync-theme', t);
      } catch (e) {}
      showTheme();
    })
);
showTheme();
// Colour theme: retints the accent, background and learning-level scale site-wide (CSS :root[data-palette]); Depth = default
// (Pierre, 2026-11-01), Lagoon = the base colours in :root.
function showPal() {
  const p = document.documentElement.dataset.palette || 'depth';
  document.querySelectorAll('#palette button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.pal === p)));
}
document.querySelectorAll('#palette button').forEach(
  b =>
    (b.onclick = () => {
      const p = b.dataset.pal;
      document.documentElement.dataset.palette = p;
      try {
        localStorage.setItem('reefid-sync-palette', p);
      } catch (e) {}
      showPal();
    })
);
showPal();
// Colour-blind mode: blue/orange instead of green/red for right/wrong and review (CSS :root[data-cvd]), on top of any theme.
const showCvd = () => {
  const on = document.documentElement.dataset.cvd === '1';
  document.querySelectorAll('#cvd button').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.cvd === '1') === on)));
};
document.querySelectorAll('#cvd button').forEach(
  b =>
    (b.onclick = () => {
      const on = b.dataset.cvd === '1';
      if (on) document.documentElement.dataset.cvd = '1';
      else delete document.documentElement.dataset.cvd;
      try {
        localStorage.setItem('reefid-sync-cvd', on ? '1' : '0');
      } catch (e) {}
      showCvd();
    })
);
showCvd();

// Tools of the Learn, Practice and Identify sections (the learning path order): a tab bar in the sticky header, so they stay in view.
// Entries without a view in this file (anatomy, size, elim, pairs…) are tools that graduated from the Lab (proto/).
const MODES = {
  learn: [
    // Coral basics (proto/basics.js), graduated from the Lab (Pierre, 2026-11-03): step 0 of the Learn path.
    ['basics', '<span class="wide">Coral basics</span><span class="narrow">Basics</span>', 'The words of the ID tips, on real photos'],
    ['genera', 'Genera', 'Every genus, as photos or ID tips'],
    ['cmp', 'Look-alikes', 'Classic look-alikes, one pair per screen']
  ],
  practice: [
    // "Quiz", not "Photo → genus" (Pierre, 2026-11-03: it is a general quiz now, typed answers and duels slipped in); the
    // ids and routes stay (#practice/quiz, quiz|… in the answer log). Phones: "Duels", so the four tabs fit 360 px without
    // scrolling: Quiz, Custom quiz, Duels, Memory take 262 of 328 px there; "Look-alike duels" would leave 2 px.
    ['quiz', 'Quiz', 'Name the genus'],
    ['quiz-custom', 'Custom quiz', 'The quiz on the genera you pick'],
    ['quiz-duel', '<span class="wide">Look-alike duels</span><span class="narrow">Duels</span>', 'Two genera often confused'],
    ['pairs', 'Memory', 'Match colony and corallites']
  ],
  // Identify shows the current subject's tool only (Pierre, 2026-11-04): each subject names its own (app.js UNITS
  // identify); the other subject's tool is reached through the subject switch.
  identify: [
    ['idkey', 'Coral ID Key', 'Tap the clues you see, get a ranked shortlist'],
    ['fishkey', 'Fish ID Key', 'Coming soon']
  ]
};
const MODE_LABEL = {learn: 'Learn tools', identify: 'Ways to identify', practice: 'Practice modes'};
// Which tab of MODES a hash belongs to: key leaves and groups count as the key, genus sheets as Genera, pairs as Look-alikes.
function modeOf(h) {
  return h.startsWith('g-') ? 'genera' : h.startsWith('cmp') ? 'cmp' : h.split('|')[0];
}
function sectionOf(h) {
  if (!h || h === 'home') return 'home';
  if (h.startsWith('lab')) return 'lab';
  if (h === 'progress') return 'progress';
  if (h === 'board') return 'board';
  if (h === 'ach') return 'board';
  if (h === 'about' || h.startsWith('delete-account')) return 'about'; // no tab: reached from the Home credit line and the ? help
  const m = modeOf(h);
  return Object.keys(MODES).find(t => MODES[t].some(x => x[0] === m)) || 'learn';
}
const $modes = document.getElementById('modes');
// Genera in the order of the Genera page (lecture groups or slate), for previous / next on a sheet.
function generaOrder() {
  const names = Object.keys(DATA.gen),
    gi = n => shownGroup(n) || 99;
  return azOrder === 'lecture' ? names.sort((a, b) => gi(a) - gi(b) || slateIdx(a) - slateIdx(b)) : names;
}
// On a genus sheet or a pair, the header bar names the page instead of listing the section's tools.
function ctxBar(h) {
  const back = `<button type="button" class="up" data-back aria-label="Back">‹<span>Back</span></button>`;
  if (h === 'about') return `${back}<h2 class="ctx-t">About and credits</h2>`;
  if (h.startsWith('delete-account')) return `${back}<h2 class="ctx-t">Delete my account</h2>`;
  // A subject's own sheet bar (UNITS bar: the fish family, genus and species sheets), else the coral genus sheet's.
  const ub = h.startsWith('g-') && UNITS[SUBJ.id].bar ? UNITS[SUBJ.id].bar(h.slice(2)) : '';
  if (ub) return back + ub;
  if (h.startsWith('g-') && GX(h.slice(2))) {
    const n = h.slice(2),
      g = GX(n),
      L = g.x ? Object.keys(DATA.x.gen) : generaOrder(),
      i = L.indexOf(n);
    const prev = L[(i - 1 + L.length) % L.length],
      next = L[(i + 1) % L.length];
    return `${back}<h2 class="ctx-t"><i>${esc(n)}</i><small>${isBenthic(n) ? 'IMR benthic slate' : g.x ? 'Not on IMR list' : g.n ? 'No. ' + g.n : '<b class="star">★</b> not surveyed'} · ${esc(altName(g.fam))}</small></h2>
      <span class="pn"><a href="${esc(hr('g-' + prev))}" title="Previous: ${esc(prev)} (←)" aria-label="Previous genus: ${esc(prev)}">‹</a><a href="${esc(hr('g-' + next))}" title="Next: ${esc(next)} (→)" aria-label="Next genus: ${esc(next)}">›</a></span>`;
  }
  const [a, b] = h.startsWith('cmp-') ? h.slice(4).split('|') : [];
  if (a && GX(a) && GX(b) && gameGenus(a) && gameGenus(b))
    return `${back}<h2 class="ctx-t ctx-pair"><span><i>${esc(a)}</i> or <i>${esc(b)}</i>?</span></h2><a class="ctx-l" href="${esc(hr('cmp'))}">Look-alikes</a>`;
  return '';
}
function showModes(tab, h) {
  const ctx = ctxBar(h);
  $modes.classList.toggle('ctx', !!ctx);
  if (ctx) {
    $modes.hidden = false;
    $modes.setAttribute('aria-label', 'Page');
    $modes.innerHTML = ctx;
    $modes.querySelector('[data-back]').onclick = () =>
      pageDepth > 0
        ? history.back()
        : go(h.startsWith('g-') ? 'genera' : h === 'about' ? '' : h.startsWith('delete-account') ? 'about' : 'cmp');
    return;
  }
  // A section with a single tool needs no tab bar. Learn and Practice show the subject's pages only (SUBJECTS pages),
  // Identify the subject's own tool (UNITS identify).
  const M =
    MODES[tab] && (tab === 'learn' || tab === 'practice')
      ? MODES[tab].filter(x => SUBJ.pages.includes(x[0]))
      : tab === 'identify'
        ? MODES[tab].filter(x => x[0] === UNITS[SUBJ.id].identify)
        : MODES[tab];
  const L = M && M.length > 1 ? M : null;
  $modes.hidden = !L;
  if (!L) {
    $modes.innerHTML = '';
    return;
  }
  const cur = modeOf(h);
  $modes.setAttribute('aria-label', MODE_LABEL[tab]);
  $modes.innerHTML = L.map(
    ([k, t, d]) =>
      `<a href="${esc(hr(k))}" title="${esc(subjWords(d))}"${k === cur ? ' aria-current="page"' : ''}><b>${subjWords(t)}</b></a>`
  ).join('');
  const on = $modes.querySelector('[aria-current]');
  if (on && $modes.scrollWidth > $modes.clientWidth) $modes.scrollLeft = on.offsetLeft - ($modes.clientWidth - on.offsetWidth) / 2;
}
let routeFrom = '',
  generaY = null,
  // How many pages of the app lie behind this one in the tab's history: Back on a sheet goes back only when there is
  // one (history.length also counts the enlarged photo's entry, which left a deep-linked sheet's Back doing nothing:
  // Codex review #344). Kept in each history entry's state, so a reload or Back / Forward keeps it right.
  pageDepth = typeof (history.state || {}).d === 'number' ? history.state.d : 0;
if (!history.state || typeof history.state.d !== 'number') history.replaceState({...(history.state || {}), d: pageDepth}, '');
// A reload while a photo was enlarged keeps the viewer's history entry, with no viewer open: it is stepped over at once,
// so the next Back leaves the page (Codex review #344: the first Back did nothing visible).
else if (history.state.lb) history.back();
addEventListener('hashchange', () => {
  const s = history.state || {};
  if (typeof s.d === 'number') pageDepth = s.d;
  else history.replaceState({...s, d: ++pageDepth}, '');
});
// Cards (Pierre, 2026-11-03: direction B, Medallion, of the Lab mock-up, for the whole family; docs/DESIGN.md "Cards").
// Every card over the page comes from cardShow: a round medallion over the card's top edge holds the kind's emoji
// (CARD_KINDS) or a visual (cardRing, the progress ring), then a kicker, the title, the text and the buttons stacked full
// width, the main one on top, centred on a pale tint of the kind's hue (the accent; the warm --warn for an apology). The
// first meeting with a genus keeps its photo as a full-width band instead (its photo is there to be learned), the emoji
// on a chip at the band's edge. One overlay at a time stays the callers' job (they wait while '#tour, .unlock' is up);
// cardShow owns the rest: the .unlock overlay (hidden under the tour, closed by route() through ulClose when its page is
// left), role dialog, aria-modal, labelled by its kicker and title, the focus (main button, or o.focus, kept inside on
// Tab, given back on close), the keys (Escape / Enter outside a button or field / a tap outside: o.esc / o.enter / o.tap,
// 1 or 2 = as that button, or a function; the quiz's answer keys never reach the page behind; the tour's pass while the
// card waits under it), and on close the question's clock (quiz.js qclockAgain: reading a card is not looking at the
// photo). o: {kind, cls (classes the callers' code and tests look for), kick, title (HTML; none: the first h3 of the body
// labels it, else o.label), body, photo (genus band URL), visual (medallion HTML), primary / secondary ({text, attr, on,
// stay}: on runs after the card closes, or instead of closing with stay), note, after, bind(d) after each render,
// onClose(how: 1, 2, 'esc', 'enter', 'tap', 'route', or what the caller gave d.close)}. Returns the overlay: d.close(how),
// d.set(changes) redraws it.
const CARD_KINDS = {
  apology: '🙏',
  step: '🧗', // a big step the player chooses (the open-all offer): the warm --warn hue, "Not now" on top
  update: '🔄',
  feature: '✨',
  genus: '🪸',
  fish: '🐟',
  tip: '💡',
  bonus: '🎁',
  account: '💾',
  ach: '🏆',
  feedback: '💬'
};
let cardN = 0;
// Whether a card's panel is really on screen: drawn, of some height, inside the viewport and faded in (cardShow's safety
// net and the leaving-with-a-card event).
function cardSeen(d) {
  const c = d && d.querySelector('.ulcard');
  if (!c) return false;
  const r = c.getBoundingClientRect();
  return r.height >= 40 && r.bottom > 0 && r.top < innerHeight && Number(getComputedStyle(c).opacity) > 0.05;
}
function cardShow(o) {
  const d = document.createElement('div'),
    from = document.activeElement,
    id = 'ulh' + ++cardN;
  d.className = ('unlock ' + (o.cls || '')).trim();
  d.dataset.t = String(Date.now());
  d.dataset.info = [o.kind || '', o.kick || '', o.title ? String(o.title).slice(0, 60) : ''].join(' | '); // the event log's name for it
  d.setAttribute('role', 'dialog');
  d.setAttribute('aria-modal', 'true');
  let shut = false;
  const close = how => {
    if (shut) return;
    shut = true;
    d.remove();
    document.removeEventListener('keydown', key, true);
    if (from && from !== document.body && from.isConnected && !document.querySelector('.unlock')) from.focus({preventScroll: true});
    if (typeof qclockAgain === 'function') qclockAgain();
    if (o.onClose) o.onClose(how);
  };
  const act = (w, how) => {
    if (typeof w === 'function') return w();
    const b = (w === 1 || w === 2) && o[w === 1 ? 'primary' : 'secondary'];
    if (!b) return close(how);
    if (!b.stay) close(w);
    if (b.on) b.on();
  };
  // The labels: the kicker and title, or a title the body draws itself (the sign-in box, redrawn as it changes).
  d.relabel = () => {
    const h = d.querySelector('.ulpanel h3');
    if (h && !h.id) h.id = id + 'h';
    const k = d.querySelector('.ulkick');
    if (h) (d.setAttribute('aria-labelledby', (k ? k.id + ' ' : '') + h.id), d.removeAttribute('aria-label'));
    else (d.setAttribute('aria-label', o.label || o.kick || ''), d.removeAttribute('aria-labelledby'));
  };
  const btn = (b, n) =>
    b ? `<button class="next${n === 2 ? ' sec' : ''}" type="button" data-b="${n}"${b.attr ? ' ' + b.attr : ''}>${b.text}</button>` : '';
  const draw = () => {
    const e = `<span class="e" aria-hidden="true">${o.emoji || CARD_KINDS[o.kind] || ''}</span>`, // o.emoji: its own (an achievement's)
      band = !!o.photo;
    d.innerHTML = `<div class="ulcard${band ? ' band' : ''}" data-k="${o.kind || ''}">${
      band ? '' : `<div class="ulmed${o.visual ? ' vis' : ''}" aria-hidden="true">${o.visual || e}</div>`
    }<div class="ulpanel">${band ? `<div class="ulphoto"><img src="${o.photo}" alt=""></div>` : ''}${
      o.kick ? `<p class="ulkick" id="${id}k">${band ? e : ''}${o.kick}</p>` : ''
    }${o.title ? `<h3 id="${id}h">${o.title}</h3>` : ''}${o.body || ''}${
      o.primary || o.secondary ? `<div class="ulbtns">${btn(o.primary, 1)}${btn(o.secondary, 2)}</div>` : ''
    }${o.note ? `<p class="note ulfoot">${o.note}</p>` : ''}${o.after || ''}</div></div>`;
    d.querySelectorAll('[data-b]').forEach(b => (b.onclick = () => act(Number(b.dataset.b))));
    d.relabel();
    if (o.bind) o.bind(d);
    if (o.focus !== false)
      setTimeout(() => {
        const f = d.querySelector(o.focus || '[data-b="1"]') || d.querySelector('[data-b]');
        if (f && !shut) f.focus({preventScroll: true});
      }, 50);
  };
  const tabbable = () =>
    [...d.querySelectorAll('button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])')].filter(
      x => !x.disabled && x.getClientRects().length
    );
  const key = e => {
    if (document.getElementById('tour')) return; // the card waits under the tour: the tour's keys
    const t = e.target,
      inside = t instanceof Element && d.contains(t);
    if (e.key === 'Tab') {
      // The focus stays in the card.
      const f = tabbable(),
        i = f.indexOf(document.activeElement);
      if (!f.length) return e.preventDefault();
      if (e.shiftKey ? i <= 0 : i < 0 || i === f.length - 1) {
        e.preventDefault();
        f[e.shiftKey ? f.length - 1 : 0].focus();
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      return act(o.esc === undefined ? 'esc' : o.esc, 'esc');
    }
    if (inside && t.matches('input, textarea, select')) return; // typing in the card's form (sign-in)
    e.stopPropagation(); // never the quiz's answer keys behind the card
    if (/^\d$/.test(e.key)) e.preventDefault();
    if (e.key !== 'Enter' || (inside && t.closest('button, a[href], [tabindex]')) || o.enter === undefined) return; // Enter presses it
    e.preventDefault();
    act(o.enter, 'enter');
  };
  document.addEventListener('keydown', key, true);
  d.addEventListener('click', e => {
    if (e.target === d && o.tap !== undefined) act(o.tap, 'tap');
  });
  d.close = close;
  d.ulClose = () => close('route');
  d.set = c => (Object.assign(o, c), draw());
  draw();
  document.body.appendChild(d);
  // A safety net (Pierre, 2026-11-07: mid-session the screen dimmed with no card on it and the game was stuck): a card
  // still invisible after a moment (no panel drawn, no height, off screen or never faded in) closes by itself, so the
  // player is never locked behind an empty backdrop, and the event log names it so the cause can be found.
  const check = () => {
    if (shut || !d.isConnected) return;
    // A hidden page runs no fade-in, and the tour hides cards on purpose until it closes: check again later.
    if (document.visibilityState !== 'visible' || document.documentElement.classList.contains('touring')) return setTimeout(check, 2500);
    if (cardSeen(d)) return;
    if (typeof ev === 'function')
      ev('err', {msg: 'empty card closed: ' + [o.kind || '', o.kick || '', o.title ? String(o.title).slice(0, 60) : ''].join(' | ')});
    close('empty');
  };
  setTimeout(check, 2500);
  return d;
}
// Leaving the app (or the tab) while a card is open (Pierre, 2026-11-07: to tell a player who was stuck behind a card from
// one who just left): the event log notes which card it was and how long it had been up, once per card.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'hidden' || typeof ev !== 'function') return;
  document.querySelectorAll('.unlock').forEach(d => {
    if (d.dataset.left) return;
    d.dataset.left = '1';
    const up = Math.round((Date.now() - Number(d.dataset.t || Date.now())) / 1000),
      seen = cardSeen(d);
    ev('err', {msg: `left with a card open (${seen ? 'drawn' : 'NOT drawn'}, ${up} s): ${d.dataset.info || ''}`});
  });
});
// A progress ring for a card's medallion: pct strong, was (a former value) faint behind it.
function cardRing(pct, was) {
  const C = 2 * Math.PI * 26,
    arc = (p, c) =>
      `<circle class="${c}" cx="32" cy="32" r="26" stroke-dasharray="${((C * Math.max(0, Math.min(100, p))) / 100).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 32 32)"/>`;
  return `<svg class="ulring" viewBox="0 0 64 64"><circle class="tr" cx="32" cy="32" r="26"/>${was != null && was !== pct ? arc(was, 'gh') : ''}${pct > 0 ? arc(pct, 'ar') : ''}<text x="32" y="38.5" text-anchor="middle">${pct}%</text></svg>`;
}
function route() {
  // A new version took over in the background (see UPDATED): the page reloads on the way to the next page.
  if (UPDATED) return location.reload();
  QOPEN = false; // a question left unanswered for another page (the quiz draws its next one: question())
  // A tab tapped while the app is still loading (slow line, RA review 2026-11-02): nothing to draw yet; the start-up's
  // own route() opens the page tapped, from the hash.
  if (!DATA) return;
  // Load times (loadMark): the quiz is opened when tapped, before its files arrive (Codex review #362: a wait behind
  // "Loading…" was left out of the photo wait).
  if (hashNow() === 'quiz') loadMark('qo');
  // Photos of the page being left that are still loading are dropped, so a slow line gives its bandwidth to the new page
  // (tools/perf.js, slow 3G: the Home photos still downloading delayed the first quiz photo by seconds).
  $v.querySelectorAll('img').forEach(i => {
    if (i.complete) return;
    i.removeAttribute('srcset'); // with a srcset, removing src alone keeps the download
    i.removeAttribute('src');
  });
  // A page opened before its files arrived (first visit on a slow line, or a link straight to it) shows the loading bar
  // and asks for its tier now, ahead of the others (index.html), then opens.
  const nt = pageTier(hashNow());
  if (nt > HAVE) {
    const h0 = hashNow();
    resetHelp();
    document.querySelectorAll('.unlock').forEach(d => (d.ulClose ? d.ulClose() : d.remove())); // as below
    $v.innerHTML = `<div class="boot"><p class="note">Loading…</p><progress id="bootp" max="${bootMax(nt)}" value="${window.bootTick ? bootTick.n() : 0}" aria-label="Loading"></progress></div>`;
    need(nt).then(() => hashNow() === h0 && route());
    return;
  }
  if (CUR_NEW) {
    CUR = CUR_NEW;
    CUR_NEW = null;
    build();
    if (typeof achHelped === 'function') achHelped(); // a report marked done since (Q66, progress.js)
  }
  applySize();
  const r = routeNow();
  // An old or unknown address: its section's page when its first segment is a section, else Home, the address replaced
  // (Pierre, 2026-11-05, Q53-Q56: old links are not translated).
  if (r.key == null) return void location.replace(hrFull(r.fall, subjOpen(r.S) ? r.S : SUBJ));
  const h = r.key;
  // A subject's address (#fish/…) on a page that follows the subject: that subject comes on screen (setSubject routes
  // again), or the corals' page when the player may not open it. An address without a prefix shows the subject chosen.
  if (!r.bare && r.S !== SUBJ && ROUTE_SUBJ.includes(r.sec)) {
    // Its data not loaded (fish.json or fish-photos.json failed): the page for the subject on screen, never a page stuck
    // on Loading (Codex review #612; the start-up load falls back to the corals the same way).
    if (subjOpen(r.S)) return void setSubject(r.S.id).catch(() => location.replace(hrFull(subjPage(h), SUBJ)));
    return void location.replace(hrFull(subjPage(h), SUBJ));
  }
  // A page the subject does not have: its section's first page for the subject.
  const sp = subjPage(h);
  if (sp !== h) {
    // A genus sheet or a comparison of another subject (opened from Identify, the Coral ID Key, with Fish chosen; Codex
    // review #442), or a link into another subject's Identify tool with its clues (#identify/key?form=…): that subject
    // comes on screen (setSubject routes again), never the subject's list or tool instead. A bare Identify address opens
    // the subject's own tool.
    const S =
      (/^(g|cmp)-./.test(h) && SUBJECTS.find(x => subjOpen(x) && subjHas(x, h))) ||
      (sectionOf(h) === 'identify' && h.includes('|') && SUBJECTS.find(x => subjOpen(x) && UNITS[x.id].identify === modeOf(h)));
    if (S && S !== SUBJ) return void setSubject(S.id).catch(() => location.replace(hrFull(sp)));
    return void location.replace(hrFull(sp));
  }
  // The address in its one spelling, the subject's prefix included (a link without one, with Fish chosen; a trailing
  // '/'): replaced in place, nothing to draw again.
  if (hrFull(h) !== location.pathname + location.search + location.hash) history.replaceState(history.state, '', hrFull(h));
  // Genera list → a genus sheet → back: the list opens where it was left (RA review 2026-11-02: an 8000 px list came back
  // at the top). The genus at the top of the screen is kept when leaving it (not the scroll: the photos above it are not
  // loaded yet on the way back), and brought back to the same place only when coming back from a sheet.
  if (routeFrom === 'genera') {
    const a = [...$v.querySelectorAll(`a[href^="${hr('g-x').slice(0, -1)}"]`)].find(
      x => x.getBoundingClientRect().top > $hdr.getBoundingClientRect().bottom
    );
    generaY = a ? [a.getAttribute('href'), a.getBoundingClientRect().top] : null;
  }
  const fromSheet = routeFrom.startsWith('g-');
  // A card (.unlock: new genus, bonus genus, the offer to open all, sign-in) belongs to the page it opened on: leaving that
  // page (Back, a tab, a link) closes it and its keys (new-player walkthrough 2026-11-02: phone Back from the quiz left the
  // card over Home). A redraw of the same page keeps it. First-meeting cards are met when shown: the rest come next time.
  const left = h !== routeFrom;
  if (left) document.querySelectorAll('.unlock').forEach(d => (d.ulClose ? d.ulClose() : d.remove()));
  // Load times (loadMark): the first page drawn, the quiz opened, the first other page, by page name (core.js pageName:
  // the sheet keeps names, never an address with '/').
  const pn = pageName(h, SUBJ.pv);
  if (!('p0' in LOADM)) {
    loadMark('p0', pn);
    loadMark('t0');
  } else if (left && pn !== LOADM.p0) loadMark('nx', pn);
  const from = routeFrom;
  routeFrom = h;
  // The way back to a duel from the comparison its relief card opened (quiz.js DUELBACK): any other page drops it.
  if (typeof duelBackKeep === 'function') duelBackKeep(h);
  const tab = sectionOf(h);
  resetHelp();
  $gpop.hidden = true;
  prog();
  const pg0 = document.getElementById('prog'); // the pill (progress.js showProg, tier 4)
  tab === 'progress' ? pg0.setAttribute('aria-current', 'page') : pg0.removeAttribute('aria-current');
  const bg = document.getElementById('boardgo');
  if (bg) tab === 'board' ? bg.setAttribute('aria-current', 'page') : bg.removeAttribute('aria-current');
  document
    .querySelectorAll('nav [data-tab]')
    .forEach(b => (b.dataset.tab === tab ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current')));
  showModes(tab, h);
  if (h.startsWith('g-')) UNITS[SUBJ.id].sheet(h.slice(2));
  else if (h === 'cmp' || h.startsWith('cmp|')) {
    const [, a, b] = h.split('|');
    viewLookalikes(a, b);
  } else if (h.startsWith('cmp-')) viewCompare(...h.slice(4).split('|'));
  else if (h === 'quiz') quizPhoto();
  // The custom quiz (quiz.js): its selection screen, and the quiz on the genera picked.
  else if (h === 'quiz-custom' || h === 'quiz-custom|play') quizCustom(h);
  else if (h === 'progress') quizBoard();
  else if (h === 'board') viewBoard();
  else if (h === 'ach') viewAch();
  // About and credits (home.js).
  else if (h === 'about' && window.viewAbout) viewAbout();
  // Deleting one's own account (sync.js viewDeleteAccount, sheet v58), linked from About › Privacy and privacy.html.
  else if (h === 'delete-account' || h === 'delete-account|done') viewDeleteAccount(h);
  // The Fish ID Key, coming soon (home.js): Identify in fish mode.
  else if (h === 'fishkey' && window.viewFishKey) viewFishKey();
  else if (h.startsWith('quiz-duel')) {
    const [, a, b] = h.split('|');
    quizDuel(a, b, left, from); // a page just opened starts a new duel run (quiz.js DUELRUN), unless back from its comparison
  } else if (h.startsWith('lab') && window.viewLab) viewLab(h);
  else if (window.labTool && labTool(h)) {
  } else if ((!h || h === 'home') && window.viewHome) viewHome();
  else UNITS[SUBJ.id].list();
  window.scrollTo(0, 0);
  if (h === 'genera' && fromSheet && generaY) {
    const a = $v.querySelector(`a[href="${CSS.escape(generaY[0])}"]`);
    if (a) window.scrollTo(0, a.getBoundingClientRect().top - generaY[1]);
  }
  pageHelp();
  hdrMetrics();
  // The intro moved behind ? only now, so the quiz stage is resized to the space it really has (phones gained ~280 px).
  if (typeof fitStage === 'function') fitStage();
  if (typeof fitLk === 'function') fitLk();
  // Same for card games (Memory): their grid was sized before the intro left, so it is refitted to the room it now has.
  document.querySelectorAll('.pgrid.fit').forEach(g => fitTiles(g));
  // Big photos (sheet cover, lab tools) get the file for the box they got (the quiz and Look-alikes do it in their fit).
  upsize();
  // Pages opened in the visit (sync.js pagesRoute, sheet v30 'pages'): the page drawn, not a link that sent on to another.
  if ((hashNow() || 'home') === (h || 'home') && typeof pagesRoute === 'function') pagesRoute(h);
  // Home drawn: the moment a subject newly open to the player may be told (progress.js subjHello, once progress.js is in).
  if ((h || 'home') === 'home' && typeof subjHello === 'function') subjHello();
  // The page of address h is drawn: the tests wait for this instead of a fixed time (tests/pages.smoke.js drawn()).
  window.ROUTED = h;
}
addEventListener('hashchange', route);
// Pages open straight on their content: the title is dropped where the header already names the page
// (section tab, page bar or Lab crumbs), and the intro text moves behind the ? button.
const $help = document.getElementById('help'),
  $helpbox = document.getElementById('helpbox');
// One rule for every page and every render path (route, tabs, toggles, Lab tools): whenever the view gets a
// top-level title or intro, the title is dropped and the intro moves behind ? . route() only resets the help box.
// The last line of the ? help on every page (Pierre, 2026-11-03: the credits footer left the pages): About and credits,
// the privacy notice and Send feedback (rule U14), two taps from anywhere. So the ? shows on every page.
const helpEnd = () =>
  `<p class="note hend"><a href="${esc(hr('about'))}">About &amp; credits</a> · <a href="privacy.html">Privacy</a>${typeof repBtn === 'function' ? ' · ' + repBtn({k: 'page'}, 'Send feedback') : ''}</p>`;
function pageHelp() {
  const root = $v.querySelector(':scope > .lab') || $v;
  const found = [...root.querySelectorAll(':scope > h2:not(.vh), :scope > .lede, :scope > .tips, :scope > h3.label, :scope > .gloss')];
  if (!found.length) return;
  const h2 = found.find(x => x.tagName === 'H2'),
    intro = found.filter(x => x !== h2);
  if (intro.length) {
    $helpbox.innerHTML =
      (h2 ? `<h3>${esc(h2.textContent)}</h3>` : '') +
      intro.map(x => x.outerHTML).join('') +
      (window.tour ? '<p class="note htour"><button type="button" class="linkish" data-tour>Replay the welcome tour</button></p>' : '') +
      helpEnd();
    $help.hidden = false;
  }
  found.forEach(x => x.remove());
  // Keep the page title for screen readers (heading order h1 > h2 > h3; design review 2026-11-01), visually hidden.
  if (h2) root.insertAdjacentHTML('afterbegin', `<h2 class="vh">${esc(h2.textContent)}</h2>`);
}
function resetHelp() {
  $helpbox.hidden = true;
  $helpbox.innerHTML = helpEnd(); // a page with explanations puts them above it (pageHelp)
  $help.hidden = false;
  $help.setAttribute('aria-expanded', 'false');
}
new MutationObserver(pageHelp).observe($v, {childList: true, subtree: true});
// Settings (photo source, photo size, theme) live in one small panel behind ⚙.
const $setb = document.getElementById('setb'),
  $set = document.getElementById('settings');
function setOpen(open) {
  $set.hidden = !open;
  $setb.setAttribute('aria-expanded', String(open));
}
$setb.onclick = e => {
  e.stopPropagation();
  setOpen($set.hidden);
};
// Opening ⚙ (by the button or "Not saved") refreshes the account line.
new MutationObserver(() => {
  if (!$set.hidden && SYNC_URL) bindSync(document.getElementById('sync'));
}).observe($set, {attributes: true, attributeFilter: ['hidden']});
// The account and the progress backup live in ⚙ (Pierre, 2026-11-01: not in the middle of My progress).
document.getElementById('signb').onclick = e => {
  e.stopPropagation();
  if (syncTrouble()) setOpen(true);
  else signinNudge(false, false);
};
{
  const rb = document.getElementById('reset');
  rb.onclick = () => {
    if (rb.dataset.armed) {
      // After the quiz tier (Codex review #361): the first-meeting cards (model.js) start over with the progress.
      rb.disabled = true;
      need(2).then(() => {
        P = {};
        delete Q.bu;
        delete Q.ba;
        // the bonus genera (fish: the scientific genera, circle 3) are offered again once due
        SUBJ.optin.forEach(k => ['', 'T', 'N', 'A'].forEach(x => delete Q[k + x]));
        saveQ();
        store.set(sKey('reset'), new Date().toISOString());
        introReset();
        save();
        delete rb.dataset.armed;
        rb.disabled = false;
        rb.textContent = 'Reset progress';
        document.getElementById('pmsg').textContent = SUBJECTS.length > 1 ? `${SUBJ.name}: progress reset.` : 'Progress reset.';
        route();
      });
    } else {
      rb.dataset.armed = '1';
      rb.textContent = 'Confirm reset';
    }
  };
}
document.getElementById('setx').onclick = () => {
  $set.hidden = true;
  $setb.setAttribute('aria-expanded', 'false');
  $setb.focus();
};
document.addEventListener('click', e => {
  if (!$set.hidden && !e.target.closest('#settings, #setb')) {
    $set.hidden = true;
    $setb.setAttribute('aria-expanded', 'false');
  }
});
// "/" from any page: open Genera with the search box focused, to jump to a genus by typing (Pierre, 2026-10-31).
let wantSearch = false;
document.addEventListener('keydown', e => {
  if (e.key !== '/' || e.altKey || e.ctrlKey || e.metaKey || !lb.hidden) return;
  if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable]')) return;
  e.preventDefault();
  const q = document.getElementById('q');
  if (q && hashNow() === 'genera') {
    q.focus();
    q.select();
    return;
  }
  wantSearch = true;
  go('genera');
});
// Desktop: ← / → go to the previous / next genus on a sheet (the arrows of the page bar), without reaching for the mouse.
document.addEventListener('keydown', e => {
  if ((e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || !lb.hidden) return;
  if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable]')) return;
  const a = $modes.querySelectorAll('.pn a');
  if (a.length !== 2) return;
  e.preventDefault();
  a[e.key === 'ArrowLeft' ? 0 : 1].click();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !$set.hidden) {
    $set.hidden = true;
    $setb.setAttribute('aria-expanded', 'false');
    $setb.focus();
  }
  // The ? help box closes with Escape too, like ⚙ and the enlarged photo (new-player walkthrough 2026-11-02).
  if (e.key === 'Escape' && !$helpbox.hidden && lb.hidden) {
    $helpbox.hidden = true;
    $help.setAttribute('aria-expanded', 'false');
    $help.focus();
    hdrMetrics();
  }
});
// Admin | User view switch: only in the browser holding the admin token; a switch reloads so every module follows.
const $viewrow = document.getElementById('viewrow');
// Link to the admin page (Pierre, on his phone), in either view.
if (HAS_ADMIN_TOKEN) {
  $viewrow.hidden = false;
  document.getElementById('admrow').hidden = false;
  $viewrow.querySelectorAll('button').forEach(b => {
    b.setAttribute('aria-pressed', String((b.dataset.view === 'admin') === IS_ADMIN));
    b.onclick = () => {
      if ((b.dataset.view === 'admin') === IS_ADMIN) return;
      try {
        localStorage.setItem('reefid-admin-view', b.dataset.view);
      } catch (e) {}
      location.reload();
    };
  });
}
$help.onclick = () => {
  const open = $helpbox.hidden;
  $helpbox.hidden = !open;
  $help.setAttribute('aria-expanded', String(open));
  hdrMetrics();
};
// The brand link goes home without reloading the page (href="./" still works without JS).
document.querySelector('.brand .home').onclick = e => {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
  e.preventDefault();
  if (location.hash) history.pushState({d: ++pageDepth}, '', location.pathname + location.search);
  route();
};
// Header metrics for CSS: --hdr-h (what stays pinned: sticky offset for the page bar, cover photo, side panels)
// and --hdr-hide (phones: the whole header scrolls away; only a page bar stays pinned).
const $hdr = document.querySelector('header');
function hdrMetrics() {
  const r = document.documentElement.style,
    h = $hdr.offsetHeight;
  const hide = phone() ? h : 0;
  r.setProperty('--hdr-h', h - hide + 'px');
  r.setProperty('--hdr-hide', hide + 'px');
}
if (window.ResizeObserver) new ResizeObserver(hdrMetrics).observe($hdr);
else addEventListener('resize', hdrMetrics);
// A missing side file (404) counts as a failure, not as an empty file: softFail says so.
const okJson = r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)));
// Unstable connection (Pierre, 2026-11-01): a start-up file that fails is fetched again, up to 3 tries (1 s, then 2 s
// apart); a 404 is final.
const getR = (u, o, n = 3) =>
  fetch(u, o).then(
    r => (r.ok || r.status === 404 || n <= 1 ? r : new Promise(ok => setTimeout(ok, 1000 * (4 - n))).then(() => getR(u, o, n - 1))),
    e => (n <= 1 ? Promise.reject(e) : new Promise(ok => setTimeout(ok, 1000 * (4 - n))).then(() => getR(u, o, n - 1)))
  );
// ?draft previews the unsaved curation from the admin page (same browser) instead of curation.json.
// Pierre's curation, also kept in localStorage (reefid-curation-last): if curation.json can't be read (offline, and not in the
// service worker cache), the app uses the last copy it saw instead of none, so excluded or moved photos never come back
// into the games (code re-review 2026-11-01, H1).
const CUR_LAST = 'reefid-curation-last';
// Start-up never waits for it when a copy is kept (Pierre, 2026-11-01: fluid on poor connections; it was a round trip
// before every first screen, up to the service worker's timeout): the kept copy is used, and curRefresh reads the
// published one right after; a change applies at the next screen, as for a tab left open.
let CUR_KEPT = false;
const curation = () => {
  const dr = /[?&]draft\b/.test(location.search) && store.get('reefid-curation-draft', null),
    kept = !dr && store.get(CUR_LAST, null);
  if (kept && kept.genera) {
    CUR_KEPT = true;
    return Promise.resolve(kept);
  }
  return dr
    ? Promise.resolve(dr)
    : getR('curation.json', {cache: 'no-cache'})
        .then(okJson)
        .then(c => {
          store.set(CUR_LAST, c);
          return c;
        })
        .catch(e => {
          const last = store.get(CUR_LAST, null);
          return last ? last : softFail("curation.json (Pierre's photo choices)", {})(e);
        });
};
const forms = () =>
  getR('forms.json?v=7')
    .then(okJson)
    .catch(softFail('forms.json', {}))
    // gunsure is a list in the file, a {photo: 1} lookup here (read as an object, every unsure guess counted as sure: PR #577)
    .then(j => ({
      gf: j.gf || {},
      form: j.form || {},
      cf: j.cf || {},
      forms: j.forms || [],
      gunsure: Object.fromEntries((Array.isArray(j.gunsure) ? j.gunsure : []).map(f => [f, 1]))
    }))
    .catch(() => ({gf: {}, form: {}, cf: {}, forms: [], gunsure: {}}));
const json = u =>
  getR(u)
    .then(okJson)
    .catch(softFail(u.replace(/\?.*/, ''), {}));
// The page's later scripts (home.js, tour.js...) must be in before the first route: a fast or cached data.json could
// otherwise arrive first and open the Learn page instead of Home (seen under the welcome tour, 2026-11-01).
// index.html runs the scripts through its loader (retries on an unstable line): window.BOOT says they have all run.
const domReady =
  window.BOOT || new Promise(r => (document.readyState === 'loading' ? addEventListener('DOMContentLoaded', r, {once: true}) : r()));
// The preview of an unsaved draft (?draft) may add candidates still waiting: those live in cand.json, out of data.json
// (tools/datajson.py; the players never need them), so the preview fetches them too.
const draftCand = () =>
  /[?&]draft\b/.test(location.search)
    ? fetch('cand.json', {cache: 'no-cache'})
        .then(okJson)
        .then(j => j.cand || {})
        .catch(() => ({}))
    : Promise.resolve({});
// Load order (Pierre, 2026-11-02, from a field HAR at ~86 kbit/s: Home, then the photo quiz and its photos, then My
// progress, then the rest, each tier after the other so they never share the line with what the player waits for).
// The files of each tier are listed in index.html (loadTier); here each tier is also set up once its files are in:
//   1 Home: data.json, curation (the first page waits for these and for BOOT);
//   2 the quiz: model.js, quiz.js, learn.js (the quiz uses its look-alike pairs and montages) and progress.js (13 KB:
//     each answer updates the achievements, and My progress then opens at once; Codex review #361), with forms.json,
//     quality.json and picks.json (growth forms and photo ratings: the draw and the photo slots use them), then the
//     data is rebuilt with them, the achievements counted and the sheet's photo statistics asked for;
//   3 the photos of the next quiz questions (planNext, prefetched in quiz.js): no files of its own;
//   4 the sheet calls (sync, anonymous answers, leaderboard and achievement shares): no files of their own;
//   5 the rest (Tools, ⚑), then the service worker, whose install caches every other file of the shell for the next
//     visit (registered before, its install fetched the whole shell, Lab included, alongside the start-up files).
// need(N) brings tiers 2..N (files and set-up); a page opened early calls it for its own tier (route), a link straight to
// a page at start-up too (below), so its files come with Home's.
let HAVE = 1,
  started;
const STARTED = new Promise(r => (started = r)),
  TIERP = {},
  // The tier each page needs: Home and About 1; the quiz, the duels, the Learn pages, My progress, the leaderboard and the
  // achievements 2 (progress.js is small and the quiz needs it); the Tools and the Coral ID Key (proto/) 5.
  pageTier = h =>
    !h || h === 'home' || h === 'about' || h.startsWith('delete-account') ? 1 : /^(quiz|genera|g-|cmp|progress|board|ach)/.test(h) ? 2 : 5,
  // Steps of the loading bar for a page of tier n: its scripts, and data.json.
  bootMax = n => [...document.querySelectorAll('link[data-tier]')].filter(l => +l.dataset.tier <= n).length + 1;
let J2 = null;
const tier2json = () => J2 || (J2 = Promise.all([forms(), json('quality.json?v=3'), json('picks.json?v=1')]));
const SETUP = {
  2: ([f, q, k]) => {
    FORMS = f;
    CFMAP = f.cf;
    AUTOQ = q.q || {};
    PICKS = k;
    build();
    loadStats();
    // progress.js comes with the quiz (Codex review #361: answers given before it lost their achievement bookkeeping):
    // the achievement record is migrated and counted here, before any answer.
    achMigrate();
    achRecheck(); // a learned mark taken away at load (model.js mxRecalc): its achievements first
    achCheck(); // before My progress opens, so its badge counts them
    recalcNotice(); // every player's progress recalculated (2026-11-02): said once, with a pop-up
    mxLostNotice(); // a learned mark taken away (model.js mxRecalc): said once, after the card above if both are due
    rvNotice(); // the cards of the rules versions skipped (core.js RVS msg, sync.js replayAdopt): after those above
    sorryNotice(); // an apology to the players of the broken opening (2026-11-03/04): once, after any recalculation note
    achHelped(); // a report of this player's marked done in the admin (Q66): told once
    subjHello(); // a subject newly open to the player (fish): once, at a calm moment on Home
    prog();
    window.APP_READY = true; // Home, the quiz and the Learn pages work (tests and tools/perf.js wait for this)
  },
  4: () => {
    syncPull();
    anonResend(); // once: every answer played without an account goes again (the sheet skips those it has)
    sendAnon();
    boardNotice();
    loadBoard();
    loadAchs();
  },
  5: () => {
    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
  }
};
function need(n) {
  if (n <= HAVE) return Promise.resolve();
  if (!TIERP[n])
    TIERP[n] = Promise.all([n > 2 ? need(n - 1) : STARTED, window.loadTier ? loadTier(n) : null, n === 2 ? tier2json() : null])
      .then(a => SETUP[n] && SETUP[n](a[2]))
      .then(() => (HAVE = Math.max(HAVE, n)));
  return TIERP[n];
}
{
  const n = pageTier(hashNow()),
    bp = document.getElementById('bootp');
  if (n > 1) {
    need(n);
    if (bp) bp.max = bootMax(n);
  }
}
Promise.all([
  getR('data.json?v=38')
    .then(r => (loadMark('pop', String(r.headers.get('x-served-by') || '').slice(0, 60)), r))
    .then(okJson)
    .then(d => (window.bootTick && bootTick(), d)),
  curation(),
  draftCand(),
  domReady,
  // The subject's own data (fish: fish.json): if it cannot come, the app opens on the first subject (corals).
  UNITS[SUBJ.id].load().catch(() => subjectLoad(SUBJECTS[0]))
])
  .then(([d, c, dc]) => {
    Object.entries(dc).forEach(([g, L]) => {
      const C = (d.cand = d.cand || {}),
        have = new Set((C[g] || []).map(p => p.f));
      C[g] = [...(C[g] || []), ...L.filter(p => !have.has(p.f))];
    });
    RAW = d;
    CUR = c;
    build();
    showSubj();
    route();
    started();
    if (CUR_KEPT) curRefresh();
    if (window.tourFirst) tourFirst();
    // Then the other tiers in the background, one after the other: the quiz, the photos of its next questions (planned
    // now, so the quiz opens at once; a player already in the quiz or a duel gets theirs topped up), My progress (with
    // the leaderboard and the achievement shares, so their pages open at once), the rest.
    need(2)
      .then(() => {
        const h = hashNow();
        planNext(h.startsWith('quiz') ? h : 'quiz');
        return prefetched();
      })
      .then(() => need(4))
      .then(() => need(5));
  })
  .catch(() => {
    $v.innerHTML =
      '<p class="warn">Could not load the data. Check your connection. <button type="button" class="linkish" id="reload">Try again</button></p>';
    document.getElementById('reload').onclick = () => location.reload();
  });
// A tab left open for days still follows Pierre's published curation (e.g. the CF book switch): when the tab comes back
// into view (or every 30 min while visible), curation.json is read again; a change applies at the next screen (route),
// never in the middle of a game.
// A photo Pierre adds from the candidates waiting (cand.json) reaches data.json only when the Candidate photos Action has
// run after his Publish: an open tab whose curation adds a photo its data.json lacks fetches data.json again (now, or at
// a later refresh if the Action has not finished), so the photo shows without a reload (code review #331).
const rawFs = () => {
  const s = new Set(),
    add = L => (L || []).forEach(p => p && s.add(p.f));
  [...Object.values(RAW.gen || {}), ...Object.values((RAW.x || {}).gen || {})].forEach(g => {
    Object.values(g.views || {}).forEach(add);
    Object.values(g.more || {}).forEach(add);
    add(g.book);
  });
  [RAW.cand, RAW.course].forEach(o => Object.values(o || {}).forEach(add));
  return s;
};
const addsMissing = c => {
  const have = rawFs();
  return Object.values((c && c.genera) || {}).some(g => Object.keys(g.add || {}).some(f => !have.has(f)));
};
function curRefresh() {
  if (!RAW || /[?&]draft\b/.test(location.search)) return;
  curAt = Date.now();
  fetch('curation.json', {cache: 'no-cache'})
    .then(r => (r.ok ? r.json() : null))
    .then(c => {
      if (c) store.set(CUR_LAST, c);
      if (c && JSON.stringify(c) !== JSON.stringify(CUR)) CUR_NEW = c;
      if (c && addsMissing(c))
        return fetch('data.json', {cache: 'no-cache'})
          .then(r => (r.ok ? r.json() : null))
          .then(d => {
            if (d && d.gen) {
              RAW = d;
              CUR_NEW = c; // rebuilt at the next page change, with the photo in
            }
          });
    })
    .catch(() => {});
}
// New versions (Pierre, 2026-11-02: players will not know to reload, he had to reload once or twice himself). Each
// deploy changes sw.js (its cache name V). The browser checks it at each launch, and the app asks again when it comes
// back into view and every 30 min (swCheck). The new version installs in the background and takes over (skipWaiting,
// clients.claim): this page then reloads itself at the next calm moment, at the next page change (route: Next in a game
// is one, between two questions), or when it comes back into view unless a question is waiting for its answer (QOPEN,
// quiz.js question: never in the middle of a question, Pierre 2026-11-05), so the player is on the new version without
// doing anything. Progress is saved at every answer.
let UPDATED = false,
  QOPEN = false,
  swAt = Date.now();
const swCheck = () => {
  swAt = Date.now();
  if ('serviceWorker' in navigator)
    navigator.serviceWorker
      .getRegistration()
      .then(r => r && r.update())
      .catch(() => {});
};
// A new service worker asks every open page which version it runs (sw.js activate): this one answers, so it is left to
// reload by itself at the next page change (UPDATED); a page too old to answer is reloaded by the worker.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', e => {
    if (e.data && e.data.t === 'reefid-ver?' && e.ports && e.ports[0]) e.ports[0].postMessage({v: appVer()});
  });
  navigator.serviceWorker.startMessages();
}
if ('serviceWorker' in navigator) {
  // The first install also takes over: that one is no update; any takeover after it is (a tab first opened before any
  // version was installed, then left open, still gets the next ones: Codex review #336).
  let had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (had) UPDATED = true;
    had = true;
  });
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (UPDATED && !QOPEN) return location.reload();
  if (Date.now() - curAt > 300000) curRefresh();
  if (Date.now() - swAt > 300000) swCheck();
});
setInterval(() => {
  if (document.visibilityState === 'visible') {
    curRefresh();
    swCheck();
  }
}, 1800000);
// The service worker is registered once every tier is in (SETUP[5]).
