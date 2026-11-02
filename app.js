// IMR Coral ID: hash-routed single page. Data comes from data.json (written by tools/datajson.py, one genus per line).
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
// The page hash, decoded; a malformed %-escape in a pasted link no longer crashes the page (code re-review L2).
const hashNow = () => {
  const h = location.hash.slice(1);
  try {
    return decodeURIComponent(h);
  } catch (e) {
    return h;
  }
};
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
// Pierre-only controls (Lab keep/trim, finder start-screen switch, ⚑ flag) show only in the browser where the
// admin page holds his token, the same test flag.js uses. RAs never see them.
// Pierre's browser holds the admin token (imr-admin-vault). ⚙ View: Admin | User (imr-admin-view) hides every
// admin-only control without touching the token, so he sees the site exactly as RAs do.
const HAS_ADMIN_TOKEN = (() => {
  try {
    return !!localStorage.getItem('imr-admin-vault');
  } catch (e) {
    return false;
  }
})();
const IS_ADMIN =
  HAS_ADMIN_TOKEN &&
  (() => {
    try {
      return localStorage.getItem('imr-admin-view') !== 'user';
    } catch (e) {
      return true;
    }
  })();
const store = {
  get(k, d) {
    try {
      const v = localStorage.getItem(k);
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
// Four files per photo (tools/photos.py): 240 ('t'), 480 ('s'), 960 ('m') and 1600 px (none) on the long side.
// iNaturalist serves 500 (medium) and 1024 px (large).
const loc = (p, s) => `img/${p.f}${s ? '-' + s : ''}.webp${ver(p)}`;
const img = (p, size) => (p.r && p.src ? inat(p, size === 's' ? 'medium' : 'large') : loc(p, size));
// Photo quality (Pierre, 2026-11-01: slow, unstable connections in the Philippines): a big photo (game, sheet cover)
// gets the smallest file that covers its box at the screen's density, counted up to 2x (a 3x phone sees no difference).
// Saver takes the 480 px file for game photos and stage photos whatever the box; Full always takes the 1600 px file. Auto is Saver when the browser reports
// the data saver or a slow connection (Network Information API: Chrome on Android), or when the app measures a slow line
// itself (linkBps). The enlarged view always loads the 1600 px file (Saver: on a click).
let PQ = store.get('imr-photo-q', 'auto');
// The line as measured by the app (field HAR, 2026-11-02: at ~86 kbit/s Chrome's estimate did not flag the link, so Auto
// loaded the 960 px quiz photo, 62 KB in 19 s; Safari and Firefox have no Network Information API at all): the bytes
// this page got from the network over the time spent receiving them (Resource Timing; overlapping downloads count once,
// files from a cache count nothing), once LINK.MIN bytes are in. Under LINK.SLOW bit/s, Auto works as Saver. The last
// measure is kept (imr-link): a launch served from the cache measures nothing and starts from it.
// LINK.SLOW 500 kbit/s (Pierre, 2026-11-02; 1 Mbit/s at first): 480 px photos on a 1080p or 4K desktop screen are a real
// loss, so only a line where the 960 px pair of a question (~170 KB) takes over ~3 s gets them. Not yet measured on the
// players' links: to recalibrate once real link speeds are logged.
const LINK = {SLOW: 5e5, MIN: 40000, KEY: 'imr-link'};
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
// A shown site photo moved to another size: same name, -s / -m / no suffix (iNaturalist photos keep theirs).
const resized = (u, size) => u.replace(/^(img\/.+?)(-[tsm])?\.webp/, `$1${size ? '-' + size : ''}.webp`);
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
  if (px && !i.dataset.low && u.startsWith('img/') && PXR[want] > PXR[tierOf(u)]) i.src = resized(u, want);
};
const upsize = (root = $v) =>
  root.querySelectorAll('img[data-fit]').forEach(i => {
    const r = i.getBoundingClientRect();
    upsizeImg(i, Math.max(r.width, r.height));
  });
// Unstable connection (Pierre, 2026-11-01): a photo that fails is tried again twice (after 1 s, then 4 s); a game photo
// then falls back to its small version (data-lo, 480 px), already behind it as a placeholder. If that fails too, the
// question offers another one instead of a blank frame (nothing is counted).
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
    } else if (i.closest('.qstage') && !$v.querySelector('.q.done, #qfail')) {
      if (navigator.onLine !== false)
        ev('photo', {
          f: resized(u, '')
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
    }
  },
  true
);
// Each file's width as a 4:3 box drawn with object-fit: cover sees it (cards, sheet strips, pair cells, Coral Finder): the
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
const thumb = (p, sizes) => {
  if (p.r && p.src) return `src="${img(p, 's')}"`;
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
          : '';
// One colour per IMR lecture group, used everywhere a group appears (style="--g:…", CSS hsl(var(--g) …)).
const groupHue = n => (n * 137) % 360;
const credit = p =>
  p.cf
    ? `© R. Kelley / BYOGUIDES, Coral Finder 2022, p. ${esc(p.pg)}`
    : p.imr
      ? `IMR Lecture 6, slide ${esc(p.slide)}`
      : `<i>${esc(p.t)}</i>${p.own ? ' <span class="own">Dauin</span>' : ''} · <a href="${esc(safeUrl(p.o))}" target="_blank" rel="noopener">${esc(p.a)}</a>`;
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
  FORMS = {gf: {}, form: {}, cf: {}},
  AUTOQ = {},
  PICKS = {};
// Genera not on the IMR slate but in the Coral Finder book and present at Dauin (data.json "x", tools/build_extra.py):
// Identify > Coral Finder only (Pierre, 2026-10-31), on by default, switch in ⚙ on that page. Same photo pipeline,
// kept out of DATA.gen so games, quizzes, progress and the Genera pages never see them.
let XON = store.get('imr-finder-x', true);
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
}
// A genus of the list or of the extra genera.
const GX = n => DATA.gen[n] || ((DATA.x || {}).gen || {})[n];
const isCore = p => !!(p.imr || p.own);
// Game photos of genus n in view v at a level (levels add up: Medium = Easy + Medium photos).
const LEVELS = [
  ['easy', 'Easy'],
  ['medium', 'Medium'],
  ['hard', 'Hard']
];
const gamePics = (n, v, lvl = 'hard') => {
  const s = (GX(n).sl || {})[v];
  if (!s) return GX(n).views[v] || [];
  return LEVELS.slice(0, LEVELS.findIndex(([k]) => k === lvl) + 1).flatMap(([k]) => s[k]);
};
// Growth form of each photo: one of the 7 IMR growth forms (forms.json "forms"; x = form not visible) as p.form, and
// p.polyps when polyps or vesicles are extended. Pierre's choice in curation.json "gf" wins over the first guess in
// forms.json "gf", form and polyps flag each on their own ("p" yes, "n" no). Photos not classified yet keep their old
// Coral Finder letter (forms.json / curation.json "form") as p.cf.
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
const imrFormsOf = n => {
  const g = GX(n),
    cnt = {},
    sure = {};
  [...Object.values(g.views).flat(), ...(DATA.course[n] || [])].forEach(p => {
    if (!p.form || p.form === 'x' || p.multi) return;
    cnt[p.form] = (cnt[p.form] || 0) + 1;
    if (!(FORMS.gunsure || {})[p.f]) sure[p.form] = 1;
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
const slateIdx = n => Object.keys(DATA.gen).indexOf(n);
const bySlate = L => [...Object.keys(DATA.gen), ...Object.keys((DATA.x || {}).gen || {})].filter(n => L.includes(n));
// group=true marks the card with its IMR confusion group (strip and tag); 'stripe' draws the strip only.
function card(name, group) {
  const g = GX(name),
    p = cover(g),
    ig = (group === true || group === 'stripe') && g.ig ? DATA.imrg.find(x => x.n === g.ig) : null;
  const im = p
    ? `<img class="ph" src="${img(p, 's')}" srcset="${srcset(p)}" data-sz="card" sizes="${sizesFor('card')}" alt="" loading="lazy">`
    : `<span class="ph none">no photo</span>`;
  return `<a class="card${ig ? ' grp' : ''}" href="#g-${esc(name)}"${ig ? ` style="--g:${groupHue(ig.n)}"` : ''}>${im}${ig && group === true ? `<span class="ig" title="IMR confusion group ${ig.n}: ${esc(ig.t)}">Group ${ig.n}</span>` : ''}<span class="cap"><i>${esc(name)}</i><small>${g.x ? '<b class="fdxtag">Not on IMR list</b> · ' : g.n ? 'No. ' + g.n + ' · ' : g.ig || !starNote(name) ? '<b class="star">★ not surveyed</b> · ' : `<b class="star">${starNote(name)}</b> · `}${esc(g.fam)}</small><p>${esc(tipsText(g))}</p></span></a>`;
}
function bindCards(root = $v) {
  root.querySelectorAll('[data-g]').forEach(b => (b.onclick = () => go('g-' + b.dataset.g)));
}
function bindGo(root = $v) {
  root.querySelectorAll('[data-go]').forEach(b => (b.onclick = () => go(b.dataset.go)));
}

// Full-size viewer shared by every page. opts.blind() true = quiz before answering: hide genus, credit and source links.
const lb = document.getElementById('lightbox');
let lbClose = null;
// Back closes the open viewer. A viewer's entry reached with no viewer open (Forward after closing a photo, or Back onto
// it from a link followed inside the viewer) is stepped over, like after a reload (Codex review #344).
addEventListener('popstate', () => {
  if (lbClose) lbClose(true);
  else if ((history.state || {}).lb) history.back();
});
const VIEW_LABEL = {wide: 'Colony', medium: 'Close-up', macro: 'Corallites', close: 'Close-up'};
function zoom(list, i, opts = {}) {
  const blind = () => (opts.blind ? opts.blind() : false);
  const show = () => {
    const p = list[i],
      hide = blind(),
      vl = p.view ? (VIEWS.find(v => v[0] === p.view) || [0, VIEW_LABEL[p.view]])[1] : '';
    const cap = hide
      ? esc(vl || 'Photo')
      : `${p.genus ? `<b><i>${esc(p.genus)}</i></b> · ` : ''}${vl ? esc(vl) + ' · ' : ''}${credit(p)}${p.src ? ` · <a href="${esc(safeUrl(p.src))}" target="_blank" rel="noopener">original</a>` : ''}`;
    // The 1600 px file, over the 480 px one shown at once (usually already loaded). Saver: 960 px, 1600 on a click.
    lb.innerHTML = `<div class="lb-in"><img src="${img(p, saver() ? 'm' : '')}" style="background:center / contain no-repeat url('${img(p, 's')}')" alt="${hide ? 'Coral to identify' : esc(p.t || '')}" title="Click for actual size"><p class="lb-cap">${cap}${!hide && p.f && DATA ? ` · ${repBtn({k: 'photo', g: p.genus || genusOfPhoto(p.f), ph: [p.f], m: 'photo'}, '⚑ Report')}` : ''}</p>
      <div class="lb-nav">${list.length > 1 ? `<button type="button" data-d="-1" aria-label="Previous photo">‹</button><span>${i + 1} / ${list.length}</span><button type="button" data-d="1" aria-label="Next photo">›</button>` : ''}<button type="button" data-x aria-label="Close">Close</button></div></div>`;
    lb.classList.remove('full');
    const im = lb.querySelector('.lb-in img');
    im.draggable = false;
    im.onclick = e => {
      e.stopPropagation();
      if (moved) return; // the end of a drag, not a click
      // Actual size centred on the point clicked (an RA, 2026-11-02: zoomed in, then had to scroll to find it).
      const rx = e.offsetX / im.clientWidth,
        ry = e.offsetY / im.clientHeight;
      lb.classList.toggle('full');
      const u = im.getAttribute('src') || '';
      if (u.startsWith('img/') && tierOf(u)) im.src = resized(u, '');
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
    ? `<ul class="crit idtips${cls ? ' ' + cls : ''}">${g.imr.map(x => `<li>${gloss(noteText(x))}</li>`).join('')}</ul><p class="tref">IMR Lecture 6${g.sl && g.sl.length ? ', ' + slideRef(g.sl.length > 1 ? 'slides' : 'slide', g.sl) : ''}</p>`
    : `<p class="note">Not on the lecture slides: see the Coral Finder below.</p>`;
// Glossary terms in tips and lecture notes: tap (or focus + Enter) to see the definition and its source.
// Very common words (wall, corallite, mouth) are left plain. Matching patterns per glossary term:
const GLOSS_PAT = {
  'Septo-costae': 'septo-costae',
  'Septa': 'septa',
  'Costae': 'costae',
  'Coenosteum': 'coenosteum',
  'Paliform lobes': 'paliform lobes?',
  'Axial corallite': 'axial corallites?',
  'Verrucae': 'verrucae',
  'Hooded corallites': 'hooded',
  'Extra-tentacular budding': 'extra-tentacular(?: budding)?',
  'Intra-tentacular budding': 'intra-tentacular(?: budding)?',
  'Monticules': 'monticules?',
  'Vesicles': 'vesicles?'
};
let glossRe = null;
function gloss(text) {
  const t = esc(text);
  if (!DATA.terms) return t;
  if (!glossRe) {
    const keys = DATA.terms.map(x => x[0]).filter(k => GLOSS_PAT[k]);
    glossRe = keys.length
      ? {keys, re: new RegExp('\\b(?:' + keys.map(k => '(' + GLOSS_PAT[k] + ')').join('|') + ')\\b', 'gi')}
      : {re: null};
  }
  if (!glossRe.re) return t;
  return t.replace(glossRe.re, (m, ...g) => {
    const k = glossRe.keys[g.slice(0, glossRe.keys.length).findIndex(x => x !== undefined)];
    return k ? `<span class="gt" tabindex="0" role="button" data-gt="${esc(k)}">${m}</span>` : m;
  });
}
const $gpop = document.createElement('div');
$gpop.className = 'gpop';
$gpop.hidden = true;
$gpop.setAttribute('role', 'tooltip');
document.body.appendChild($gpop);
function showGloss(el) {
  const t = DATA.terms.find(x => x[0] === el.dataset.gt);
  if (!t) return;
  $gpop.innerHTML = `<b>${esc(t[0])}</b> ${esc(t[1])}${t[2] ? ` <small>${esc(t[2])}</small>` : ''}`;
  $gpop.hidden = false;
  const r = el.getBoundingClientRect(),
    w = Math.min(320, innerWidth - 24);
  $gpop.style.width = w + 'px';
  $gpop.style.left = Math.max(12, Math.min(r.left, innerWidth - w - 12)) + 'px';
  const below = r.bottom + 8,
    h = $gpop.offsetHeight;
  $gpop.style.top = (below + h > innerHeight - 8 ? r.top - h - 8 : below) + 'px';
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
addEventListener(
  'scroll',
  () => {
    $gpop.hidden = true;
  },
  true
);
// Short ID tips; genera the lecture skips fall back to the Coral Finder summary.
const tipsList = (g, cls = '') =>
  g.qt
    ? `<ul class="crit idtips${cls ? ' ' + cls : ''}">${g.qt.map(x => `<li>${gloss(x)}</li>`).join('')}</ul>`
    : `<p class="keyid">${gloss(g.sum)}</p>`;
const tipsText = g => (g.qt ? g.qt.join(' · ') : g.sum);
// The ID tips view of the Genera page: the 4 lecture questions and the glossary on top, then 2-3 short cues per genus.
const tipsHead =
  () => `<div class="tiphead"><ol class="qtiles" aria-label="IMR Lecture 6: questions to ask">${DATA.tips.map(t => `<li>${esc(t)}</li>`).join('')}</ol>
  <details class="gloss"><summary>Coral anatomy terms</summary><a class="glink" href="#lab-anatomy"><span class="hpv art">${window.homeArt ? homeArt('anatomy') : ''}</span><span><b>Corallite anatomy</b><small>Explore the parts of a corallite on a diagram ›</small></span></a><dl>${DATA.terms.map(([t, d, src]) => `<dt>${esc(t)}</dt><dd>${esc(d)}${src ? ` <small class="src">${esc(src)}</small>` : ''}</dd>`).join('')}</dl><p class="note">Wording from IMR Lecture 6 where the lecture defines the term; otherwise the <a href="https://www.coralsoftheworld.org/page/glossary/" target="_blank" rel="noopener">Corals of the World glossary</a>.</p></details></div>`;
const tipCard = n => {
  const g = DATA.gen[n],
    p = cover(g);
  return `<article class="tipg"><a href="#g-${esc(n)}" class="tipph">${p ? `<img ${thumb(p, '130px')} alt="" loading="lazy">` : ''}<i>${esc(n)}</i></a><div>${tipsList(g)}${
    lookOf(n).length
      ? `<p class="note">Don't confuse with ${lookOf(n)
          .map(b => `<a href="#cmp-${esc(n)}|${esc(b)}"><i>${esc(b)}</i></a>`)
          .join(', ')}</p>`
      : ''
  }</div></article>`;
};

/* ---------- key helpers (Coral Finder boxes, used by genus sheets and the Coral Finder) + IMR groups ---------- */
const groupOf = id => DATA.key.find(g => g.id === id[0]);
const leafOf = id => groupOf(id)?.leaves.find(l => l.id === id);
const pg = l => (l.a === l.b ? 'p.' + l.a : 'p.' + l.a + '-' + l.b);
const leafLabel = l => l.t + (l.s ? ' · ' + l.s : '');

/* ---------- quiz ---------- */
// Progress per genus {ok, ko, streak, conf}, kept in this browser only.
let P = store.get('imr-coral-progress', {}) || {};
const save = () => {
  store.set('imr-coral-progress', P);
  prog();
  syncSoon();
};
// The header progress pill (showProg, progress.js): that file comes in tier 4 (index.html), after the quiz on a first
// visit, so the pill keeps its 0% until then.
const prog = () => typeof showProg === 'function' && showProg();
const st = n => P[n] || (P[n] = {ok: 0, ko: 0, streak: 0});
const Q = Object.assign({view: 'any', level: 'auto'}, store.get('imr-coral-quiz', {}), {stars: true}); // starred genera are always asked (Pierre)
if (Q.lvv !== 3) {
  Q.level = 'auto';
  Q.course = false;
  Q.lvv = 3;
} // Auto only: no level selector, no Lecture set (Pierre, 2026-10-31)
const saveQ = () => store.set('imr-coral-quiz', Q);
let session = {ok: 0, n: 0, h: []},
  last = null,
  duelPair = null;
// Bonus genera (Pierre, 2026-11-01): genera off the IMR slate that are common at Dauin and easily taken for a slate
// genus, added to the photo quiz and the duels once the player has made some progress ("not at the very start, but
// fairly soon"). Picked from the Coral Finder book genera present at Dauin (data.json "x", tools/build_extra.py):
// 4+ Research Grade iNaturalist observations within 40 km, and a look-alike on the slate named by the Coral Finder
// (Millepora / Porites, Isopora / Acropora, Leptoseris / Pavona, Sandalolitha / Halomitra, Pleuractis / Lobactis),
// or not a hard coral at all (Heliopora, like Millepora). The first unlocks at 10% slate progress, then one more per
// 5% (performance only, never time). Once unlocked a genus stays unlocked (Q.bu). They never count in the slate
// progress (progPct, the 39 tiles, the sync summary), and their ID tips come from the Coral Finder, labelled as such.
// Game photos: Research Grade observations (or Pierre's own) only, never multi-coral (tools/apply_bonus.py).
const BONUS = ['Millepora', 'Isopora', 'Leptoseris', 'Heliopora', 'Sandalolitha', 'Pleuractis'];
const BONUS_AT = i => 10 + 5 * i;
const isBonus = n => !DATA.gen[n] && BONUS.includes(n) && !!GX(n);
function bonusOpen() {
  const p = progPct(),
    k = Math.max(Q.bu || 0, BONUS.filter((_, i) => p >= BONUS_AT(i)).length);
  if (k > (Q.bu || 0)) {
    Q.bu = k;
    saveQ();
  }
  return BONUS.slice(0, k).filter(n => GX(n));
}
const pool = () => [...Object.keys(DATA.gen).filter(n => Q.stars || DATA.gen[n].n), ...bonusOpen()].filter(n => photoSet(n).shown.length);
// ID tips heading: the lecture's for slate genera, the Coral Finder's (with its pages) for bonus genera.
const tipsLabel = g => (g.x ? `ID tips (Coral Finder p. ${g.pages.join(', ')})` : 'ID tips (IMR)');
// What is wrong with the sync, in words, or '' when everything is saved.
function syncTrouble() {
  if (!SYNC_URL || !SYNC) return '';
  if (SYNC.err === 'pin') return 'Not saved: code refused';
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
// A copy run on this computer (tests, tools/perf.js, a developer) never sends anonymous answers or reports to the real
// sheet (Pierre, 2026-11-02: 17 "players" in the admin were tools/perf.js runs: once the service worker was in, its
// requests passed by the test's network mocks and reached the sheet).
const LOCAL = /^(localhost|127\.\d+\.\d+\.\d+|\[::1\])$/.test(location.hostname) || location.protocol === 'file:';
let SYNC = store.get('imr-coral-sync', null),
  syncTimer = null;

/* ---------- routing ---------- */
function go(h) {
  if (hashNow() === h) route();
  else location.hash = h;
}

// Photo size (small / medium / large), remembered per page in localStorage (key imr-coral-size).
// Each page reads :root[data-size] in its own CSS; pages where it means nothing (games that fill the screen,
// home, progress) hide the S/M/L buttons, keeping their room so the header never changes size.
const SIZE_PAGES = ['genera', 'tips', 'genus', 'pair', 'finder', 'lab-gallery', 'lab-elim'];
function pageKey() {
  const h = hashNow();
  return h.startsWith('g-') ? 'genus' : h.startsWith('cmp-') ? 'pair' : h.split('|')[0] || 'home';
}
function sizePrefs() {
  try {
    return JSON.parse(localStorage.getItem('imr-coral-size')) || {};
  } catch (e) {
    return {};
  }
}
// Default M, except Genera (S: more genera per screen, groups easier to compare).
function photoSize() {
  return sizePrefs()[pageKey()] || (pageKey() === 'genera' ? 's' : 'm');
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
  document.getElementById('xrow').hidden = !/^(lab-)?finder$/.test(pageKey());
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
      store.set('imr-finder-x', XON);
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
      store.set('imr-photo-q', PQ);
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
        localStorage.setItem('imr-coral-size', JSON.stringify(p));
      } catch (e) {}
      applySize();
    })
);
// Light / dark theme switch. Light by default (AGENTS rule 18), whatever the system's theme; the reader's pick is kept.
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
        localStorage.setItem('imr-coral-theme', t);
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
        localStorage.setItem('imr-coral-palette', p);
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
        localStorage.setItem('imr-coral-cvd', on ? '1' : '0');
      } catch (e) {}
      showCvd();
    })
);
showCvd();

// Tools of the Learn, Practice and Identify sections (the learning path order): a tab bar in the sticky header, so they stay in view.
// Entries without a view in this file (anatomy, size, elim, pairs…) are tools that graduated from the Lab (proto/).
const MODES = {
  learn: [
    ['genera', 'Genera', 'Every genus, as photos or ID tips'],
    ['cmp', 'Look-alikes', 'Classic look-alikes, one pair per screen']
  ],
  practice: [
    ['quiz', 'Photo → genus', 'Name the genus'],
    ['quiz-duel', 'Look-alike duels', 'Two genera often confused'],
    ['pairs', 'Memory', 'Match colony and corallites']
  ],
  identify: [['finder', 'Coral Finder', 'Tap the clues you see, get a ranked shortlist']]
};
const MODE_LABEL = {learn: 'Learn tools', identify: 'Ways to identify', practice: 'Practice modes'};
// Which tab of MODES a hash belongs to: key leaves and groups count as the key, genus sheets as Genera, pairs as Look-alikes.
function modeOf(h) {
  return /^[kl]-/.test(h) ? 'finder' : h.startsWith('g-') ? 'genera' : h.startsWith('cmp') ? 'cmp' : h.split('|')[0];
}
function sectionOf(h) {
  if (!h || h === 'home') return 'home';
  if (h.startsWith('lab')) return 'lab';
  if (h === 'progress' || h === 'quiz-board') return 'progress';
  if (h === 'board') return 'board';
  if (h === 'ach') return 'board';
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
  if (h.startsWith('g-') && GX(h.slice(2))) {
    const n = h.slice(2),
      g = GX(n),
      L = g.x ? Object.keys(DATA.x.gen) : generaOrder(),
      i = L.indexOf(n);
    const prev = L[(i - 1 + L.length) % L.length],
      next = L[(i + 1) % L.length];
    return `${back}<h2 class="ctx-t"><i>${esc(n)}</i><small>${g.x ? 'Not on IMR list' : g.n ? 'No. ' + g.n : '<b class="star">★</b> not surveyed'} · ${esc(g.fam)}</small></h2>
      <span class="pn"><a href="#g-${esc(prev)}" title="Previous: ${esc(prev)} (←)" aria-label="Previous genus: ${esc(prev)}">‹</a><a href="#g-${esc(next)}" title="Next: ${esc(next)} (→)" aria-label="Next genus: ${esc(next)}">›</a></span>`;
  }
  const [a, b] = h.startsWith('cmp-') ? h.slice(4).split('|') : [];
  if (a && GX(a) && GX(b) && (DATA.gen[a] || isBonus(a)) && (DATA.gen[b] || isBonus(b)))
    return `${back}<h2 class="ctx-t ctx-pair"><span><i>${esc(a)}</i> or <i>${esc(b)}</i>?</span></h2><a class="ctx-l" href="#cmp">Look-alikes</a>`;
  return '';
}
function showModes(tab, h) {
  const ctx = ctxBar(h);
  $modes.classList.toggle('ctx', !!ctx);
  if (ctx) {
    $modes.hidden = false;
    $modes.setAttribute('aria-label', 'Page');
    $modes.innerHTML = ctx;
    $modes.querySelector('[data-back]').onclick = () => (pageDepth > 0 ? history.back() : go(h.startsWith('g-') ? 'genera' : 'cmp'));
    return;
  }
  // A section with a single tool needs no tab bar.
  const L = MODES[tab] && MODES[tab].length > 1 ? MODES[tab] : null;
  $modes.hidden = !L;
  if (!L) {
    $modes.innerHTML = '';
    return;
  }
  const cur = modeOf(h);
  $modes.setAttribute('aria-label', MODE_LABEL[tab]);
  $modes.innerHTML = L.map(
    ([k, t, d]) => `<a href="#${k}" title="${esc(d)}"${k === cur ? ' aria-current="page"' : ''}><b>${t}</b></a>`
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
function route() {
  // A new version took over in the background (see UPDATED): the page reloads on the way to the next page.
  if (UPDATED) return location.reload();
  // A tab tapped while the app is still loading (slow line, RA review 2026-11-02): nothing to draw yet; the start-up's
  // own route() opens the page tapped, from the hash.
  if (!DATA) return;
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
  }
  applySize();
  const h = hashNow();
  // Genera list → a genus sheet → back: the list opens where it was left (RA review 2026-11-02: an 8000 px list came back
  // at the top). The genus at the top of the screen is kept when leaving it (not the scroll: the photos above it are not
  // loaded yet on the way back), and brought back to the same place only when coming back from a sheet.
  if (routeFrom === 'genera') {
    const a = [...$v.querySelectorAll('a[href^="#g-"]')].find(x => x.getBoundingClientRect().top > $hdr.getBoundingClientRect().bottom);
    generaY = a ? [a.getAttribute('href'), a.getBoundingClientRect().top] : null;
  }
  const fromSheet = routeFrom.startsWith('g-');
  // A card (.unlock: new genus, bonus genus, the offer to open all, sign-in) belongs to the page it opened on: leaving that
  // page (Back, a tab, a link) closes it and its keys (new-player walkthrough 2026-11-02: phone Back from the quiz left the
  // card over Home). A redraw of the same page keeps it. First-meeting cards are met when shown: the rest come next time.
  if (h !== routeFrom) document.querySelectorAll('.unlock').forEach(d => (d.ulClose ? d.ulClose() : d.remove()));
  routeFrom = h;
  // Home lives at the clean URL; an old #home link is rewritten to it.
  if (h === 'home') history.replaceState({d: pageDepth}, '', location.pathname + location.search);
  const tab = sectionOf(h);
  resetHelp();
  $gpop.hidden = true;
  prog();
  const pg0 = document.getElementById('prog'); // the pill ($prog in progress.js, tier 4)
  tab === 'progress' ? pg0.setAttribute('aria-current', 'page') : pg0.removeAttribute('aria-current');
  const bg = document.getElementById('boardgo');
  if (bg) tab === 'board' ? bg.setAttribute('aria-current', 'page') : bg.removeAttribute('aria-current');
  document
    .querySelectorAll('nav [data-tab]')
    .forEach(b => (b.dataset.tab === tab ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current')));
  showModes(tab, h);
  // The old growth-form key and corallite filters live on in the Coral Finder: their links open it with the same clues ticked.
  if (h === 'key' || h === 'key-tr') location.replace('#finder');
  else if (h.startsWith('k-') && groupOf(h.slice(2))) location.replace('#finder|form=' + h.slice(2));
  else if (h.startsWith('l-') && leafOf(h.slice(2))) {
    const l = h.slice(2),
      one = groupOf(l).leaves.length === 1;
    location.replace('#finder|form=' + l[0] + (one ? '' : ';box=' + l));
  } else if (h === 'key-imr') {
    azOrder = 'lecture';
    location.replace('#genera');
  } else if (h.startsWith('g-')) viewGenus(h.slice(2));
  else if (h === 'tips' || h.startsWith('tips|')) {
    azView = 'tips';
    location.replace('#genera');
  } else if (h === 'cmp' || h.startsWith('cmp|')) {
    const [, a, b] = h.split('|');
    viewLookalikes(a, b);
  } else if (h.startsWith('cmp-')) viewCompare(...h.slice(4).split('|'));
  else if (h === 'quiz') quizPhoto();
  // Lecture photos are now a photo set of Photo -> genus.
  else if (h === 'quiz-course')
    location.replace('#quiz'); // the Lecture photo set was removed (Pierre, 2026-10-31)
  else if (h === 'progress' || h === 'quiz-board') quizBoard();
  else if (h === 'board') viewBoard();
  else if (h === 'ach') viewAch();
  else if (h.startsWith('quiz-duel')) {
    const [, a, b] = h.split('|');
    quizDuel(a, b);
  } else if (h.startsWith('lab') && window.viewLab) viewLab(h);
  else if (window.labTool && labTool(h)) {
  } else if ((!h || h === 'home') && window.viewHome) viewHome();
  else viewGenera();
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
}
addEventListener('hashchange', route);
// Pages open straight on their content: the title is dropped where the header already names the page
// (section tab, page bar or Lab crumbs), and the intro text moves behind the ? button.
const $help = document.getElementById('help'),
  $helpbox = document.getElementById('helpbox');
// One rule for every page and every render path (route, tabs, toggles, Lab tools): whenever the view gets a
// top-level title or intro, the title is dropped and the intro moves behind ? . route() only resets the help box.
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
      (window.tour ? '<p class="note htour"><button type="button" class="linkish" data-tour>Replay the welcome tour</button></p>' : '');
    $help.hidden = false;
  }
  found.forEach(x => x.remove());
  // Keep the page title for screen readers (heading order h1 > h2 > h3; design review 2026-11-01), visually hidden.
  if (h2) root.insertAdjacentHTML('afterbegin', `<h2 class="vh">${esc(h2.textContent)}</h2>`);
}
function resetHelp() {
  $helpbox.hidden = true;
  $helpbox.innerHTML = '';
  $help.hidden = true;
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
        saveQ();
        store.set('imr-coral-reset', new Date().toISOString());
        introReset();
        save();
        delete rb.dataset.armed;
        rb.disabled = false;
        rb.textContent = 'Reset progress';
        document.getElementById('pmsg').textContent = 'Progress reset.';
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
  if (q && location.hash.slice(1) === 'genera') {
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
        localStorage.setItem('imr-admin-view', b.dataset.view);
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
// Pierre's curation, also kept in localStorage (imr-curation-last): if curation.json can't be read (offline, and not in the
// service worker cache), the app uses the last copy it saw instead of none, so excluded or moved photos never come back
// into the games (code re-review 2026-11-01, H1).
const CUR_LAST = 'imr-curation-last';
// Start-up never waits for it when a copy is kept (Pierre, 2026-11-01: fluid on poor connections; it was a round trip
// before every first screen, up to the service worker's timeout): the kept copy is used, and curRefresh reads the
// published one right after; a change applies at the next screen, as for a tab left open.
let CUR_KEPT = false;
const curation = () => {
  const dr = /[?&]draft\b/.test(location.search) && store.get('imr-curation-draft', null),
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
    .then(j => ({gf: j.gf || {}, form: j.form || {}, cf: j.cf || {}, forms: j.forms || [], gunsure: j.gunsure || {}}))
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
  // The tier each page needs: Home 1; the quiz, the duels, the Learn pages, My progress, the leaderboard and the
  // achievements 2 (progress.js is small and the quiz needs it); the Tools and the Coral Finder (proto/) 5.
  pageTier = h => (!h || h === 'home' ? 1 : /^(quiz|genera|g-|cmp|tips|key-imr$|progress|quiz-board|board|ach)/.test(h) ? 2 : 5),
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
    achCheck(); // before My progress opens, so its badge counts them
    prog();
    window.APP_READY = true; // Home, the quiz and the Learn pages work (tests and tools/perf.js wait for this)
  },
  4: () => {
    syncPull();
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
  getR('data.json?v=32')
    .then(okJson)
    .then(d => (window.bootTick && bootTick(), d)),
  curation(),
  draftCand(),
  domReady
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
// clients.claim): this page then reloads itself at the next calm moment, when it comes back into view or at the next
// page change (route), so the player is on the new version without doing anything. Progress is saved at every answer.
let UPDATED = false,
  swAt = Date.now();
const swCheck = () => {
  swAt = Date.now();
  if ('serviceWorker' in navigator)
    navigator.serviceWorker
      .getRegistration()
      .then(r => r && r.update())
      .catch(() => {});
};
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
  if (UPDATED) return location.reload();
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
