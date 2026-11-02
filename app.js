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
// Saver counts 1x, about one size down; Full always takes the 1600 px file. Auto is Saver when the browser reports
// the data saver or a slow connection (Network Information API: Chrome on Android; elsewhere Auto works as Full-by-box).
// The enlarged view always loads the 1600 px file (Saver: on a click).
let PQ = store.get('imr-photo-q', 'auto');
const saver = () => {
  const c = navigator.connection;
  return PQ === 'saver' || (PQ === 'auto' && !!c && (!!c.saveData || /2g|3g/.test(c.effectiveType || '')));
};
const fit = px => {
  if (PQ === 'full') return '';
  if (!(px > 0)) return 'm';
  const need = px * (saver() ? 1 : Math.min(window.devicePixelRatio || 1, 2));
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
const upsizeImg = (i, px) => {
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
    lb.querySelector('.lb-in img').onclick = e => {
      e.stopPropagation();
      lb.classList.toggle('full');
      const u = e.target.getAttribute('src') || '';
      if (u.startsWith('img/') && tierOf(u)) e.target.src = resized(u, '');
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
    if (e.target === lb) close();
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

/* ---------- genera ---------- */
let azFam = null,
  azQ = '',
  xOpen = false;
// Genera order: 'lecture' (IMR Lecture 6 groups, default) or 'slate' (numbers on the IMR slate).
let azOrder = (() => {
  try {
    return localStorage.getItem('imr-coral-order') || 'lecture';
  } catch (e) {
    return 'lecture';
  }
})();
// Genera view: 'photos' (cards) or 'tips' (the ID tips list, formerly its own page).
let azView = (() => {
  try {
    return localStorage.getItem('imr-coral-gview') || 'photos';
  } catch (e) {
    return 'photos';
  }
})();
let gfOpen = false; // phone Filter fold on Genera, kept open across redraws
function viewGenera() {
  const fams = [...new Set(Object.values(DATA.gen).map(g => g.fam))].sort();
  // Phones: family, order and the group index fold behind one Filter line, so the genera start near the top.
  const phone = isPhone();
  const famSel = `<select id="fam" aria-label="Family"><option value="">All families</option><option value="★"${azFam === '★' ? ' selected' : ''}>★ Not surveyed</option>${fams.map(f => `<option${azFam === f ? ' selected' : ''}>${esc(f)}</option>`).join('')}</select>`;
  const viewSeg = `<div class="seg" role="group" aria-label="View">${[
    ['photos', 'Photos'],
    ['tips', 'ID tips']
  ]
    .map(([k, t]) => `<button type="button" data-gv="${k}" aria-pressed="${azView === k}">${t}</button>`)
    .join('')}</div>`;
  const orderSeg = `<div class="seg" role="group" aria-label="Order">${[
    ['lecture', 'Lecture', ' groups'],
    ['slate', 'Slate', ' numbers']
  ]
    .map(([k, t, x]) => `<button type="button" data-o="${k}" aria-pressed="${azOrder === k}">${t}<span class="wide">${x}</span></button>`)
    .join('')}</div>`;
  const jump =
    azOrder === 'lecture'
      ? `<div class="chips tipgr gjump"><span class="label">IMR group</span>${DATA.imrg.map(x => `<button type="button" class="chip gchip" style="--g:${groupHue(x.n)}" data-jump="${x.n}" title="${esc(x.t)}">${x.n}</button>`).join('')}</div>`
      : '';
  $v.innerHTML = `<h2>The genera on the IMR slate</h2>
  <p class="lede">34 surveyed genera plus 5 starred ones (★) to recognise and rule out. Colours mark the confusion groups from the IMR lecture: genera in the same group are the ones to tell apart. The group names follow the lecture's ID questions: corallite size (small, large), mouth raised or embedded ("submerged"), and wall structure (separate walls, with coenosteum between them, or shared walls). Switch to <b>ID tips</b> for the 4 questions to ask and the lecturers' short cues for each genus.</p>
  <div class="tools"><input id="q" type="search" placeholder="Search a genus or a feature" value="${esc(azQ)}" aria-label="Search" title="Shortcut: / from any page, Enter opens the first genus">
    ${viewSeg}${phone ? `<details class="gfilt"${gfOpen ? ' open' : ''}><summary>Filter${azFam ? ' <span class="fdn">1</span>' : ''}</summary>${famSel}${orderSeg}${jump}</details>` : famSel + orderSeg}</div>
  ${azView === 'tips' ? tipsHead() : ''}${phone ? '' : jump}<div class="${azView === 'tips' ? 'tiplist' : 'grid'}" id="azgrid"></div>`;
  const draw = () => {
    const q = azQ.toLowerCase(),
      tips = azView === 'tips';
    const names = Object.keys(DATA.gen).filter(
      n =>
        (!azFam || DATA.gen[n].fam === azFam || (azFam === '★' && !DATA.gen[n].n)) &&
        (!q || (n + ' ' + DATA.gen[n].crit.join(' ') + ' ' + DATA.gen[n].imr.join(' ')).toLowerCase().includes(q))
    );
    let html;
    if (azOrder === 'lecture') {
      const gi = n => shownGroup(n) || 99;
      names.sort((a, b) => gi(a) - gi(b) || slateIdx(a) - slateIdx(b));
      // Desktop: each lecture group is a block, and small groups sit side by side (packGroups) instead of one row each.
      const blocks = [];
      names.forEach((n, i) => {
        if (!i || gi(names[i - 1]) !== gi(n)) blocks.push([]);
        blocks[blocks.length - 1].push(n);
      });
      html = blocks
        .map(L => {
          const gr = DATA.imrg.find(x => x.n === shownGroup(L[0]));
          const head = gr
            ? `<h3 class="gdiv" id="grp-${gr.n}" style="--g:${groupHue(gr.n)}" title="${esc(gr.t)}"><span class="gn">${gr.n}</span><span class="gt">${esc(gr.t)}</span></h3>`
            : '<h3 class="gdiv"><span class="gn">★</span>Not covered in the lecture</h3>';
          return `<section class="gblk" data-n="${L.length}">${head}${L.map(n => (tips ? tipCard(n) : card(n, 'stripe'))).join('')}</section>`;
        })
        .join('');
    } else html = names.map(n => (tips ? tipCard(n) : card(n, true))).join('');
    const grid = document.getElementById('azgrid');
    // The Coral Finder's extra genera (not on the IMR list, seen at Dauin): one folded line under the 39 (Pierre).
    const X = Object.keys((DATA.x || {}).gen || {}).filter(n => !q || (n + ' ' + GX(n).crit.join(' ')).toLowerCase().includes(q));
    const xs =
      !azFam && X.length
        ? `<details class="xgen"${xOpen ? ' open' : ''}><summary>${X.length} other genera seen at Dauin <small>not on the IMR list</small></summary><div class="grid">${X.map(n => card(n)).join('')}</div></details>`
        : '';
    grid.innerHTML = (html || '<p class="note">No genus matches.</p>') + xs;
    const xd = grid.querySelector('.xgen');
    if (xd)
      xd.ontoggle = () => {
        xOpen = xd.open;
      };
    grid.classList.toggle('gpack', azOrder === 'lecture' && !!html);
    packGroups(grid);
    bindCards();
  };
  const qi = document.getElementById('q');
  qi.oninput = () => {
    azQ = qi.value;
    draw();
  };
  // Enter opens the first genus that matches (with the / shortcut: /, a few letters, Enter = the sheet).
  qi.onkeydown = e => {
    if (e.key !== 'Enter') return;
    const q = qi.value.trim().toLowerCase(),
      L = [...document.querySelectorAll('#azgrid a[href^="#g-"]')];
    const name = a => decodeURIComponent(a.getAttribute('href').slice(3)).toLowerCase();
    const a = L.find(x => name(x).startsWith(q)) || L.find(x => name(x).includes(q)) || L[0];
    if (a) {
      e.preventDefault();
      location.hash = a.getAttribute('href');
    }
  };
  if (wantSearch) {
    wantSearch = false;
    qi.focus();
    qi.select();
  }
  const gf = $v.querySelector('.gfilt');
  if (gf)
    gf.ontoggle = () => {
      gfOpen = gf.open;
    };
  document.getElementById('fam').onchange = e => {
    azFam = e.target.value || null;
    draw();
  };
  $v.querySelectorAll('[data-o]').forEach(
    b =>
      (b.onclick = () => {
        azOrder = b.dataset.o;
        try {
          localStorage.setItem('imr-coral-order', azOrder);
        } catch (e) {}
        viewGenera();
      })
  );
  // Group index: jump to a lecture group (a button, not a link: the hash is the page route).
  $v.querySelectorAll('[data-jump]').forEach(
    b =>
      (b.onclick = () => {
        const h = document.getElementById('grp-' + b.dataset.jump);
        if (h) h.scrollIntoView({behavior: 'smooth', block: 'start'});
      })
  );
  $v.querySelectorAll('[data-gv]').forEach(
    b =>
      (b.onclick = () => {
        azView = b.dataset.gv;
        try {
          localStorage.setItem('imr-coral-gview', azView);
        } catch (e) {}
        viewGenera();
        pageHelp();
      })
  );
  draw();
}

// Lecture groups as blocks on one grid: a block spans as many columns as it has genera (up to the row), so a
// group of 1-3 genera shares its row with the next ones. Phones keep one group per row (blocks display:contents).
function packGroups(grid) {
  if (!grid || !grid.classList.contains('gpack')) return;
  const B = [...grid.querySelectorAll(':scope > .gblk')];
  B.forEach(b => {
    b.style.gridColumn = '';
    b.style.gridRow = '';
  });
  if (getComputedStyle(B[0] || grid).display === 'contents') return;
  const C = getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length || 1;
  B.forEach(b => {
    const n = +b.dataset.n,
      c = Math.min(n, C);
    b.style.gridColumn = `span ${c}`;
    b.style.gridRow = `span ${1 + Math.ceil(n / c)}`;
  });
}
addEventListener('resize', () => packGroups(document.getElementById('azgrid')));

function viewGenus(name) {
  const g = GX(name);
  if (!g) return viewGenera();
  const XL = (DATA.x || {}).leaf || {},
    paths = [...DATA.key, ...(g.x ? DATA.x.groups : [])].flatMap(k =>
      k.leaves.filter(l => l.g.includes(name) || (XL[l.id] || []).includes(name)).map(l => ({k, l}))
    );
  const imr = g.imr || [];
  // Each view row shows the sheet set (applySlots): 3 featured, then the other IMR and Pierre's photos behind a fold.
  const inView = v => {
    const s = (g.sl || {})[v];
    return s ? [...s.feat, ...s.more] : [];
  };
  const flat = VIEWS.flatMap(([v]) => inView(v).map(p => ({...p, genus: name, view: g.levels === 2 && v === 'macro' ? 'close' : v})));
  const cv = cover(g),
    ci = cv ? flat.findIndex(x => x.f === cv.f) : -1;
  const rows = VIEWS.filter(([v]) => !(g.levels === 2 && !inView(v).length))
    .map(([v, label]) => {
      const list = inView(v);
      if (g.levels === 2 && v === 'macro') label = 'Close-up';
      const fig = p => {
        const i = flat.findIndex(x => x.f === p.f);
        return `<figure><button type="button" class="zoom" data-z="${i}"><img src="${img(p, 's')}" srcset="${srcset(p)}" data-sz="strip" sizes="${sizesFor('strip')}" alt="${esc(name)}, ${p.imr ? 'IMR lecture photo' : label.toLowerCase() + ' view'}" loading="lazy"></button><figcaption>${p.imr ? `<b class="lect">IMR lecture</b> · slide ${p.slide}` : credit(p)}</figcaption></figure>`;
      };
      // The cover is already shown at the top: not repeated in its row when the row has other featured photos.
      const feat0 = g.sl[v].feat,
        feat = cv && feat0.length > 1 ? feat0.filter(p => p.f !== cv.f) : feat0,
        more = g.sl[v].more;
      return `<section class="vrow"><h3>${label}${feat.length ? '' : ' <span class="gap">missing</span>'}</h3>${feat.length ? `<div class="strip">${feat.map(fig).join('')}</div>` : '<p class="note">No good photo yet for this view.</p>'}
      ${more.length ? `<details class="more"><summary>${more.length} more ${label.toLowerCase()} photo${more.length > 1 ? 's' : ''}</summary><div class="strip">${more.map(fig).join('')}</div></details>` : ''}</section>`;
    })
    .join('');
  // Coral Finder text: visible for genera the lecture skips, otherwise folded under "More details" with sources and key.
  const cfList = `<h3>Coral Finder features</h3><ul class="crit">${g.crit.map(c => `<li>${esc(c)}</li>`).join('')}</ul>`;
  // Name, slate number and family sit in the sticky header bar (ctxBar), not here.
  $v.innerHTML = `<p class="lede">One genus on one page. The highlighted <b>ID tips (IMR)</b> are what to remember; the <b>IMR lecture notes</b> give the full lecture cues. Its <b>IMR group</b> is the lecture's confusion group: genera in the same group are the ones to tell apart. Photos at three distances: <b>colony</b>, <b>close-up</b> (10-30 cm) and <b>corallites</b> (macro); tap one to enlarge it. <b>Don't confuse with</b>, at the bottom, shows its look-alikes in the same view. Dotted words show their definition when tapped.${isPhone() ? '' : ' ← / → go to the previous / next genus.'}</p>
  <article class="sheet">
    ${imr.length || g.x ? '' : `<p class="lede keyid">${esc(g.sum)}</p>`}
    ${
      g.x
        ? `<p class="warn"><b>Not on the IMR list.</b> A rarer genus seen at Dauin${g.x.nonscl ? ', and not a true hard coral' : ''}.</p>`
        : g.n
          ? ''
          : `<p class="warn"><b>★ Not surveyed by IMR.</b> It is on the slate so you don't mistake it for ${g.look
              .filter(n => DATA.gen[n].n)
              .map(n => '<i>' + esc(n) + '</i>')
              .join(', ')}, so you need to recognise it and set it aside.</p>`
    }
    ${myProg(name)}
    <div class="hero">
      ${cv ? `<button type="button" class="zoom hero-ph" data-z="${ci}"><img src="${img(cv, fit(Math.min(innerWidth, 640)))}" data-fit alt="${esc(name)}"></button>` : ''}
      <div class="idbox">
        ${g.x ? `<div class="tipbox"><h3>ID tips <span class="pg">Coral Finder p. ${g.pages.join(', ')}</span></h3>${tipsList(g)}</div>` : ''}
        ${imr.length || g.mn ? `<div class="tipbox">${imr.length ? `<h3>ID tips (IMR) <span class="pg">group ${g.ig}: ${esc(DATA.imrg[g.ig - 1].t)}</span></h3>${tipsList(g)}` : ''}${g.mn ? `<p class="mn"><b>Mnemonic:</b> ${esc(g.mn)}</p>` : ''}</div>` : ''}
        ${imr.length ? `<div class="lnotes"><h3>IMR lecture notes</h3>${notesList(g)}</div>` : ''}
        ${imr.length ? '' : cfList}
        <details class="more sheetmore"><summary>More details</summary>
        ${imr.length ? cfList : ''}
        ${g.check ? `<p class="note check"><b>To check with an IMR trainer:</b> ${esc(g.check)}</p>` : ''}
        ${g.info ? `<div class="note osrc"><b>Other sources:</b><ul class="srcs">${g.info.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
        <h3>In the key <span class="pg">Coral Finder p. ${g.pages.join(', ')}</span></h3><div class="kpick">${paths.map(({k, l}) => `<a class="c-${k.color}" href="#finder|form=${l.id[0]};box=${l.id}">${esc(k.name)} › ${esc(leafLabel(l))}</a>`).join('')}</div>
        <p class="note refs"><b>References:</b> ${imr.length ? 'IMR Lecture 6 · ' : ''}Coral Finder 2022 (R. Kelley) p. ${g.pages.join(', ')} · <a href="https://www.marinespecies.org/aphia.php?p=taxlist&amp;tName=${encodeURIComponent(name)}" target="_blank" rel="noopener">WoRMS</a> · <a href="https://www.inaturalist.org/taxa/search?q=${encodeURIComponent(name)}" target="_blank" rel="noopener">iNaturalist</a></p>
        </details>
      </div>
    </div>
    <div class="vrows">${rows}</div>
    <section class="hubsec">${lookHub(name)}</section>
    ${DATA.gen[name] ? `<p class="repline">${repBtn({k: 'sheet', g: name, m: 'sheet'}, '⚑ Report a problem with this sheet')}</p>` : ''}
  </article>`;
  $v.querySelectorAll('[data-z]').forEach(b => (b.onclick = () => zoom(flat, Number(b.dataset.z))));
  $v.querySelectorAll('[data-cmp]').forEach(b => (b.onclick = () => go('cmp-' + name + '|' + b.dataset.cmp)));
  bindGo();
  const hub = $v.querySelector('.hubsec'),
    redraw = () => {
      hub.innerHTML = lookHub(name);
      bindViewSeg(redraw);
    };
  bindViewSeg(redraw);
}

// The player's own progress on this genus, at the top of its sheet (only once it has been seen): its level, how far it
// has got and what it still needs. My progress only had this in a hover tooltip, invisible on touch screens (RA re-review
// 2026-11-01); tapping a tile there opens this sheet.
function myProg(n) {
  const [k, t] = level(n);
  if (k === 'new') return '';
  const st = lvStep(n),
    pc = Math.round(100 * genScore(n)),
    m = k === 'ok' ? [] : missing(n);
  return (
    `<p class="myprog"><a class="mpl s${st}${k === 'weak' ? ' weak' : ''}" href="#progress" title="My progress">${t}${st > 0 && st < 5 ? ` <small class="pct" style="--p:${pc}%">${pc}%</small>` : st === 5 ? ' ✓' : ''}</a>` +
    `<span>${k === 'weak' ? '2 or more mistakes in its last 5 answers. ' : ''}${m.length ? 'Still needed: ' + esc(m.join('; ')) + '.' : 'You know this genus.'}</span></p>`
  );
}

/* ---------- compare ---------- */
// Look-alikes of a genus, whichever genus listed the other (the Coral Finder lists are not symmetric).
const lookOf = n =>
  !DATA.gen[n]
    ? GX(n)
      ? GX(n).look.filter(GX)
      : []
    : Object.keys(DATA.gen).filter(b => b !== n && (DATA.gen[n].look.includes(b) || DATA.gen[b].look.includes(n)));
// Photo of a genus in a given view, falling back to the close-up then the cover.
function viewShot(n, v) {
  const g = GX(n),
    L = g.views[v] && g.views[v].length ? g.views[v] : g.views.macro && g.views.macro.length ? g.views.macro : null,
    p = L ? L[0] : cover(g);
  return p
    ? `<img src="${img(p, 's')}" srcset="${srcset(p)}" data-sz="card" sizes="${sizesFor('card')}" alt="${esc(n)}" loading="lazy">`
    : '<span class="none">no photo</span>';
}
const mixedUp = (a, b) => ((P[a] && P[a].conf && P[a].conf[b]) || 0) + ((P[b] && P[b].conf && P[b].conf[a]) || 0);
let cmpView = store.get('imr-coral-cmpview', 'medium');
const viewSeg = () =>
  `<div class="seg" role="group" aria-label="View">${VIEWS.map(([v, t]) => `<button type="button" data-cv="${v}" aria-pressed="${cmpView === v}">${t}</button>`).join('')}</div>`;
const bindViewSeg = redraw =>
  $v.querySelectorAll('[data-cv]').forEach(
    b =>
      (b.onclick = () => {
        cmpView = b.dataset.cv;
        store.set('imr-coral-cmpview', cmpView);
        redraw();
      })
  );
// IMR lecture images that compare look-alikes side by side (data.json cmp), for the given genera.
// Course comparison images: small thumbnails that open the shared viewer.
const cmpShots = L => {
  const C = (DATA.cmp || []).filter(c => c.g.some(n => L.includes(n)));
  return C.length
    ? `<div class="lcmps">${C.map(
        c =>
          `<figure class="lcmp"><a href="${img(c)}" data-cmp="${DATA.cmp.indexOf(c)}"><img src="${img(c, 's')}" alt="Look-alike comparison: ${esc(c.g.join(', '))}" loading="lazy"></a><figcaption>${c.imr ? `<b class="lect">IMR lecture</b>${c.slide ? ` slide ${c.slide}` : ''}` : credit(c)}${c.cap ? ': ' + esc(c.cap) : ''}</figcaption></figure>`
      ).join('')}</div>`
    : '';
};
document.addEventListener('click', e => {
  const a = e.target.closest('[data-cmp]');
  if (!a) return;
  e.preventDefault();
  zoom([DATA.cmp[+a.dataset.cmp]], 0);
});
// Bottom of a genus sheet: the genus and each of its look-alikes at the same size and in the same view,
// each with its deciding feature and a link to the side-by-side comparison.
function lookHub(name) {
  const L = lookOf(name).sort((a, b) => mixedUp(name, b) - mixedUp(name, a));
  return `<h3>Don't confuse with</h3>
    <div class="seg-row"><span class="label">Show</span>${viewSeg()}</div>
    <div class="lrow"><div class="lt self">${viewShot(name, cmpView)}<span><i>${esc(name)}</i><small>this genus</small><span class="psum">${esc(tipsText(GX(name)))}</span></span></div>
    ${L.map(n => {
      const m = mixedUp(name, n),
        side = DATA.gen[name] && DATA.gen[n];
      return `<a class="lt" href="${side ? `#cmp-${esc(name)}|${esc(n)}` : `#g-${esc(n)}`}">${m ? `<span class="pmix">you mixed them up ×${m}</span>` : ''}${viewShot(n, cmpView)}<span><i>${esc(n)}</i><span class="psum">${esc(tipsText(GX(n)))}</span>${(GX(name).lsrc || {})[n] ? `<small class="lsrc">${esc(GX(name).lsrc[n])}</small>` : ''}<b class="cmpgo">${side ? 'Compare side by side →' : 'Open the sheet →'}</b></span></a>`;
    }).join('')}</div>
    ${cmpShots([name])}`;
}
// Starred genera are on the slate as look-alikes of surveyed genera. Those the lecture doesn't group are shown
// in the lecture group most of their Coral Finder look-alikes belong to (ties: the first listed look-alike).
function shownGroup(n) {
  const g = DATA.gen[n];
  if (g.ig) return g.ig;
  const L = g.look.filter(b => DATA.gen[b] && DATA.gen[b].ig),
    c = {};
  L.forEach(b => (c[DATA.gen[b].ig] = (c[DATA.gen[b].ig] || 0) + 1));
  return L.reduce((best, b) => (c[DATA.gen[b].ig] > c[best] ? DATA.gen[b].ig : best), L.length ? DATA.gen[L[0]].ig : 0) || 0;
}
const starNote = n => {
  const g = DATA.gen[n];
  if (g.n) return '';
  const k = shownGroup(n),
    L = g.look.filter(b => DATA.gen[b] && DATA.gen[b].ig === k);
  return L.length ? `★ look-alike of ${L.map(b => `<i>${esc(b)}</i>`).join(', ')}` : '';
};
function pairs() {
  const seen = new Set(),
    out = [];
  Object.keys(DATA.gen).forEach(a =>
    DATA.gen[a].look.forEach(b => {
      const k = [a, b].sort().join('|');
      if (DATA.gen[b] && !seen.has(k)) {
        seen.add(k);
        out.push(k.split('|'));
      }
    })
  );
  return out;
}
// Classic look-alikes (Pierre, 2026-10-31): only the pairs a source compares in so many words, the IMR lecture
// (lsrc "IMR Lecture 6...") or the Coral Finder text ("Coral Finder p. ..."). Pairs that only share a Coral Finder box
// or an IMR group stay on the genus sheets and in duels. IMR pairs first, then by slate order.
const pairKey = (a, b) => [a, b].sort().join('|');
const lsrcOf = (a, b) => (GX(a).lsrc || {})[b] || (GX(b).lsrc || {})[a] || '';
const isClassic = (a, b) => /^(IMR|Coral Finder p)/.test(lsrcOf(a, b));
function classics() {
  const tier = ([a, b]) => (/^IMR/.test(lsrcOf(a, b)) ? 0 : 1);
  return pairs()
    .filter(([a, b]) => isClassic(a, b))
    .map(p => p.slice().sort())
    .sort((x, y) => tier(x) - tier(y) || Math.min(slateIdx(x[0]), slateIdx(x[1])) - Math.min(slateIdx(y[0]), slateIdx(y[1])));
}
// One montage per pair, like an IMR comparison slide: one photo of each genus in the same view. Pierre's pick
// (curation.json "mont" {"A|B": {v, a, b}}, set in admin) wins; otherwise the view the comparison is about (most pairs
// are told apart on the corallites; these on the closer view) and, in that view, the two photos that come first
// (IMR, then Pierre's) with the same growth form.
const MONT_V = {
  'Pocillopora|Stylophora': 'medium',
  'Acropora|Anacropora': 'medium',
  'Acropora|Cyphastrea': 'medium',
  'Acropora|Echinopora': 'medium',
  'Goniopora|Porites': 'medium',
  'Danafungia|Fungia': 'medium',
  'Fungia|Lithophyllon': 'medium',
  'Danafungia|Lithophyllon': 'medium'
};
// The two photos of two genera that make the best side by side: same growth form, nearest the front and, when the
// photos come from all zoom levels ("All", Pierre 2026-11-01), the nearest zoom levels.
const ZOOM = {wide: 0, medium: 1, macro: 2};
function photoPair(LA, LB, fa, fb) {
  let best = null;
  const A = fa ? [fa] : LA.slice(0, 6),
    B = fb ? [fb] : LB.slice(0, 6);
  const gap = (x, y) => (x.view && y.view ? 4 * Math.abs(ZOOM[x.view] - ZOOM[y.view]) : 0);
  A.forEach((x, i) =>
    B.forEach((y, j) => {
      const sc = i + j + (x.form && x.form === y.form ? 0 : 8) + gap(x, y);
      if (!best || sc < best[0]) best = [sc, x, y];
    })
  );
  return best ? [best[1], best[2]] : [];
}
// Pierre can hide a comparison until good examples exist (curation.json "mont" {"A|B": {hide: true}}, admin
// Montages), and pick "all" as the view to pair photos of nearby zoom levels.
function montage(a, b) {
  const k = pairKey(a, b),
    [A, B] = k.split('|'),
    m = ((CUR || {}).mont || {})[k] || {},
    V = n => DATA.gen[n].views;
  if (m.hide) return null;
  const list = (n, v) => (v === 'all' ? Object.keys(ZOOM) : [v]).flatMap(w => (V(n)[w] || []).map(p => ({...p, view: w})));
  const ok = v => v && list(A, v).length && list(B, v).length;
  const v = ok(m.v) ? m.v : [MONT_V[k] || 'macro', 'macro', 'medium', 'wide'].find(ok);
  if (!v) return null;
  const LA = list(A, v),
    LB = list(B, v),
    mine = m.v === v,
    fa = mine && LA.find(p => p.f === m.a),
    fb = mine && LB.find(p => p.f === m.b);
  const [pa, pb] = photoPair(LA, LB, fa, fb);
  return {k, A, B, v, pa, pb, src: lsrcOf(A, B)};
}
const srcTag = src =>
  /^IMR/.test(src)
    ? `<b class="lect">IMR lecture</b> ${esc(src.replace(/^IMR Lecture 6:?\s*/, ''))}`
    : `<b class="lect cf">Coral Finder</b> ${esc(src.replace(/^Coral Finder /, ''))}`;
// Learn > Look-alikes: a deck of the classic pairs, one montage per screen, the reader's mix-ups first.
// #cmp opens the first one, #cmp|A|B a given pair; arrows, keys and swipes go through the deck.
function viewLookalikes(a, b) {
  const L = classics()
      .map(p => montage(...p))
      .filter(Boolean),
    mix = m => mixedUp(m.A, m.B);
  L.sort((x, y) => (mix(y) > 0) - (mix(x) > 0) || mix(y) - mix(x));
  if (!L.length) {
    $v.innerHTML = '<p class="note">No photos yet.</p>';
    return;
  }
  let i = Math.max(0, a && b ? L.findIndex(m => m.k === pairKey(a, b)) : 0),
    drawn = false,
    dir = 0;
  let hint = matchMedia('(pointer: coarse)').matches && !store.get('imr-coral-lkswiped', 0);
  const draw = () => {
    const m = L[i],
      gA = DATA.gen[m.A],
      gB = DATA.gen[m.B],
      x = mix(m);
    const half = (n, p, k) =>
      `<figure class="lkph" style="--qbg:url('${img(p, 's')}')"><button type="button" class="zoom" data-lz="${k}" aria-label="Enlarge ${esc(n)}"><img src="${img(p, fit(innerWidth / 2))}" data-fit alt="${esc(n)}, ${VIEW_LABEL[p.view].toLowerCase()} view"></button><figcaption><i>${esc(n)}</i></figcaption></figure>`;
    const tip = (n, g) => `<div class="lktip"><a href="#g-${esc(n)}"><i>${esc(n)}</i></a> ${esc(tipsText(g))}</div>`;
    const deck = L.map(
      (d, k) =>
        `<a class="lkd${k === i ? ' on' : ''}${mix(d) ? ' mix' : ''}" href="#cmp|${esc(d.A)}|${esc(d.B)}" title="${esc(d.A)} or ${esc(d.B)}"><span><img ${thumb(d.pa, '64px')} alt="" loading="lazy"><img ${thumb(d.pb, '64px')} alt="" loading="lazy"></span><small>${esc(d.A)} / ${esc(d.B)}</small></a>`
    ).join('');
    // The intro goes behind ? (pageHelp) only on the first draw: re-adding it on each step pushed the deck down while the
    // montage was being sized, and it came out squashed once the intro left (Pierre, phone).
    $v.innerHTML = `${drawn ? '' : `<p class="lede">The look-alikes the IMR lecture or the Coral Finder compare directly, one pair per screen: one photo of each genus in the same view, with the ID tips that tell them apart. Pairs you mixed up in the quiz come first, in red. The other look-alikes of a genus are at the bottom of its sheet.</p>`}
    <div class="lk">
      <div class="lkmain">
        <div class="lkhead"><h3><i>${esc(m.A)}</i> or <i>${esc(m.B)}</i>?</h3><small class="lksrc">${srcTag(m.src)}</small>${x ? `<span class="pmix">you mixed them up ×${x}</span>` : ''}</div>
        <div class="lkm${dir ? ' in' + (dir > 0 ? 'r' : 'l') : ''}">${half(m.A, m.pa, 0)}${half(m.B, m.pb, 1)}<button type="button" class="lkarr prev" data-lstep="-1" aria-label="Previous pair">‹</button><button type="button" class="lkarr nxt" data-lstep="1" aria-label="Next pair">›</button>${hint ? '<span class="lkhint" aria-hidden="true">Swipe for the next pair</span>' : ''}</div>
        <div class="lktips">${tip(m.A, gA)}${tip(m.B, gB)}</div>
        <div class="lknav"><span class="lkn">Pair ${i + 1} / ${L.length}</span>
          <a class="linkish lkall" href="#cmp-${esc(m.A)}|${esc(m.B)}">All views</a><a class="next" href="#quiz-duel|${esc(m.A)}|${esc(m.B)}">Drill this pair</a></div>
      </div>
      <aside class="lkdeck" aria-label="Classic look-alikes">${deck}</aside>
    </div>`;
    drawn = true;
    fitLk();
    requestAnimationFrame(fitLk);
    const cur = $v.querySelector('.lkd.on');
    if (cur) cur.parentNode.scrollTop = cur.offsetTop - cur.parentNode.offsetTop - 8;
    $v.querySelectorAll('[data-lstep]').forEach(btn => (btn.onclick = () => stepTo(i + Number(btn.dataset.lstep))));
    $v.querySelectorAll('[data-lz]').forEach(
      z =>
        (z.onclick = () =>
          zoom(
            [
              {...m.pa, genus: m.A},
              {...m.pb, genus: m.B}
            ],
            Number(z.dataset.lz)
          ))
    );
    $v.querySelectorAll('.lkd').forEach(
      (d, k) =>
        (d.onclick = e => {
          e.preventDefault();
          stepTo(k);
        })
    );
    // Swipe left / right anywhere on the pair (photos, title, tips), only when the gesture is mostly sideways.
    const mt = $v.querySelector('.lkmain');
    let t0 = null;
    mt.addEventListener(
      'touchstart',
      e => {
        t0 = [e.touches[0].clientX, e.touches[0].clientY];
      },
      {passive: true}
    );
    mt.addEventListener('touchend', e => {
      if (!t0) return;
      const dx = e.changedTouches[0].clientX - t0[0],
        dy = e.changedTouches[0].clientY - t0[1];
      t0 = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > 1.5 * Math.abs(dy)) stepTo(i + (dx < 0 ? 1 : -1), true);
    });
    dir = 0;
  };
  // The address follows the pair shown (no new history entry), so a pair can be linked and survives a reload.
  // The new pair slides in from the side it came from; the swipe hint goes for good after the first swipe.
  const stepTo = (k, swiped) => {
    dir = k > i ? 1 : -1;
    if (swiped && hint) {
      hint = false;
      store.set('imr-coral-lkswiped', 1);
    }
    i = (k + L.length) % L.length;
    history.replaceState({d: pageDepth}, '', `#cmp|${L[i].A}|${L[i].B}`);
    draw();
  };
  const keys = e => {
    if (!$v.querySelector('.lk') || !lb.hidden) return document.removeEventListener('keydown', keys);
    if (e.target.closest('input, textarea, select')) return;
    if (e.key === 'ArrowRight') stepTo(i + 1);
    else if (e.key === 'ArrowLeft') stepTo(i - 1);
  };
  document.addEventListener('keydown', keys, {signal: viewKeys()});
  draw();
}
// The deck fills the window below the header: the montage takes the height the title, tips and buttons leave.
function fitLk() {
  const k = $v.querySelector('.lk');
  if (!k) return;
  const tab = tabH();
  k.style.height = Math.max(360, innerHeight - k.getBoundingClientRect().top - window.scrollY - 14 - tab) + 'px';
  // Whole or filled is decided again for the new size (a tablet turned, a window resized): see fitLow / LOWRES.
  k.querySelectorAll('.lkph').forEach(fitLow);
  upsize(k);
}
addEventListener('resize', fitLk);
function viewCompare(a, b) {
  // Bonus genera can be compared with a slate genus or with each other (quiz mix-ups).
  const A = DATA.gen[a] || (isBonus(a) && GX(a)),
    B = DATA.gen[b] || (isBonus(b) && GX(b));
  if (!A || !B) return viewLookalikes();
  const col = (n, g) =>
    `<div class="cmpcol"><h3><i>${esc(n)}</i>${g.x ? ' <small>bonus</small>' : g.n ? '' : ' ★'} <a class="linkish cmpsheet" href="#g-${esc(n)}">Sheet ›</a></h3><p class="note">${esc(g.fam)}${g.ig ? ' · IMR group ' + g.ig : ''}</p><div class="tipbox fbtips">${g.qt ? `<p class="label">${tipsLabel(g)}</p>` : ''}${tipsList(g, 'imrfb')}</div><details class="more"><summary>Coral Finder</summary><ul class="crit">${g.crit.map(c => `<li>${esc(c)}</li>`).join('')}</ul></details></div>`;
  const flat = [];
  const row = ([v, label]) => {
    const cell = (n, g) => {
      const p = (g.views[v] || [])[0];
      if (!p) return `<div class="cmpph none">${g.levels === 2 ? 'no separate level' : 'no photo'}</div>`;
      flat.push({...p, genus: n, view: v});
      return `<button type="button" class="zoom cmpph" data-z="${flat.length - 1}"><img src="${img(p, 's')}" srcset="${srcset(p)}" sizes="(max-width:599.98px) 46vw, 460px" alt="${esc(n)}, ${label.toLowerCase()}" loading="lazy"></button>`;
    };
    return `<h3 class="cmplab">${label}</h3><div class="cmprow">${cell(a, A)}${cell(b, B)}</div>`;
  };
  // The cues sit above the photos, each under its genus, so they can be read while comparing.
  $v.innerHTML = `<p class="lede">Two genera that are often confused, side by side: their ID tips, then the same view of each. <b>Drill this pair</b> at the bottom turns it into a quick duel.</p>
  <div class="cmprow text">${col(a, A)}${col(b, B)}</div>
  ${VIEWS.filter(([v]) => (A.views[v] || []).length || (B.views[v] || []).length)
    .map(row)
    .join('')}
  ${(DATA.cmp || []).some(c => c.imr && c.g.includes(a) && c.g.includes(b)) ? `<h3 class="cmplab">IMR lecture</h3>${cmpShots([a, b])}` : ''}
  <p><a class="next" href="#quiz-duel|${esc(a)}|${esc(b)}">Drill this pair</a></p>`;
  $v.querySelectorAll('[data-z]').forEach(x => (x.onclick = () => zoom(flat, Number(x.dataset.z))));
  bindCards();
  bindGo();
}

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
  showProg();
  syncSoon();
};
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
  if (SYNC.err) return n ? `Not saved yet: ${n} answer${n > 1 ? 's' : ''} waiting` : 'Not saved yet: could not reach the sheet';
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
      fitStage();
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
// Light / dark theme switch; follows the system until the reader picks one.
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
    return `${back}<h2 class="ctx-t"><span><i>${esc(a)}</i> or <i>${esc(b)}</i>?</span></h2><a class="ctx-l" href="#cmp">Look-alikes</a>`;
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
  routeFrom = h;
  // Home lives at the clean URL; an old #home link is rewritten to it.
  if (h === 'home') history.replaceState({d: pageDepth}, '', location.pathname + location.search);
  const tab = sectionOf(h);
  resetHelp();
  $gpop.hidden = true;
  showProg();
  tab === 'progress' ? $prog.setAttribute('aria-current', 'page') : $prog.removeAttribute('aria-current');
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
  fitStage();
  fitLk();
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
      P = {};
      delete Q.bu;
      delete Q.ba;
      saveQ();
      store.set('imr-coral-reset', new Date().toISOString());
      save();
      delete rb.dataset.armed;
      rb.textContent = 'Reset progress';
      document.getElementById('pmsg').textContent = 'Progress reset.';
      route();
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
Promise.all([
  getR('data.json?v=31').then(okJson),
  curation(),
  forms(),
  json('quality.json?v=3'),
  json('picks.json?v=1'),
  draftCand(),
  domReady
])
  .then(([d, c, f, q, k, dc]) => {
    Object.entries(dc).forEach(([g, L]) => {
      const C = (d.cand = d.cand || {}),
        have = new Set((C[g] || []).map(p => p.f));
      C[g] = [...(C[g] || []), ...L.filter(p => !have.has(p.f))];
    });
    RAW = d;
    CUR = c;
    FORMS = f;
    CFMAP = f.cf;
    AUTOQ = q.q || {};
    PICKS = k;
    build();
    achMigrate();
    achCheck(); // before the first page, so the badge on My progress counts them
    route();
    if (CUR_KEPT) curRefresh();
    syncPull();
    sendAnon();
    loadStats();
    window.APP_READY = true;
    if (window.tourFirst) tourFirst();
    boardNotice();
    // Fetched ahead once the start-up is over (Pierre, 2026-11-01): the leaderboard and the achievement shares, so their
    // pages open at once, and the first quiz question with its photos.
    setTimeout(() => {
      loadBoard();
      loadAchs();
      if (hashNow() !== 'quiz') planNext('quiz');
    }, 2500);
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
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
