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
const loc = (p, s) => `img/${p.f}${s ? '-s' : ''}.webp${ver(p)}`;
const img = (p, size) => (p.r && p.src ? inat(p, size === 's' ? 'medium' : 'large') : loc(p, size === 's'));
// Each file's width as a 4:3 box drawn with object-fit: cover sees it (cards, sheet strips, pair cells, Coral Finder): the
// files are 480 px (-s) and 1600 px (iNat: 500 and 1024) on their LONG side, so a portrait or panoramic photo has fewer
// useful pixels than that. Declaring the long side made the browser pick the 480 px file and blow it up 1.3-1.9x in a
// 400-470 px box (design re-review m5).
const coverW = (p, long) => {
  const a = p.ar || 4 / 3;
  return Math.round(Math.min(long * Math.min(1, a), (long * Math.min(1, 1 / a) * 4) / 3));
};
const srcset = p =>
  p.r && p.src
    ? `${inat(p, 'medium')} ${coverW(p, 500)}w, ${inat(p, 'large')} ${coverW(p, 1024)}w`
    : `${loc(p, 1)} ${coverW(p, 480)}w, ${loc(p)} ${coverW(p, 1600)}w`;
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
    lb.innerHTML = `<div class="lb-in"><img src="${img(p)}" alt="${hide ? 'Coral to identify' : esc(p.t || '')}" title="Click for actual size"><p class="lb-cap">${cap}${!hide && p.f && DATA ? ` · ${repBtn({k: 'photo', g: p.genus || genusOfPhoto(p.f), ph: [p.f], m: 'photo'}, '⚑ Report')}` : ''}</p>
      <div class="lb-nav">${list.length > 1 ? `<button type="button" data-d="-1" aria-label="Previous photo">‹</button><span>${i + 1} / ${list.length}</span><button type="button" data-d="1" aria-label="Next photo">›</button>` : ''}<button type="button" data-x aria-label="Close">Close</button></div></div>`;
    lb.classList.remove('full');
    lb.querySelector('.lb-in img').onclick = e => {
      e.stopPropagation();
      lb.classList.toggle('full');
    };
    lb.querySelectorAll('[data-d]').forEach(
      b =>
        (b.onclick = e => {
          e.stopPropagation();
          step(Number(b.dataset.d));
        })
    );
    lb.querySelector('[data-x]').onclick = close;
    lb.querySelector('[data-x]').focus({preventScroll: true});
  };
  const step = d => {
    i = (i + d + list.length) % list.length;
    show();
  };
  const back = document.activeElement;
  const close = () => {
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
  return `<article class="tipg"><a href="#g-${esc(n)}" class="tipph">${p ? `<img src="${img(p, 's')}" alt="" loading="lazy">` : ''}<i>${esc(n)}</i></a><div>${tipsList(g)}${
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
      ${cv ? `<button type="button" class="zoom hero-ph" data-z="${ci}"><img src="${img(cv)}" alt="${esc(name)}"></button>` : ''}
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
      `<figure class="lkph" style="--qbg:url('${img(p, 's')}')"><button type="button" class="zoom" data-lz="${k}" aria-label="Enlarge ${esc(n)}"><img src="${img(p)}" alt="${esc(n)}, ${VIEW_LABEL[p.view].toLowerCase()} view"></button><figcaption><i>${esc(n)}</i></figcaption></figure>`;
    const tip = (n, g) => `<div class="lktip"><a href="#g-${esc(n)}"><i>${esc(n)}</i></a> ${esc(tipsText(g))}</div>`;
    const deck = L.map(
      (d, k) =>
        `<a class="lkd${k === i ? ' on' : ''}${mix(d) ? ' mix' : ''}" href="#cmp|${esc(d.A)}|${esc(d.B)}" title="${esc(d.A)} or ${esc(d.B)}"><span><img src="${img(d.pa, 's')}" alt="" loading="lazy"><img src="${img(d.pb, 's')}" alt="" loading="lazy"></span><small>${esc(d.A)} / ${esc(d.B)}</small></a>`
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
    history.replaceState(null, '', `#cmp|${L[i].A}|${L[i].B}`);
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
// A quiz question shows the views of ONE colony: colony and closer views, the corallites as a hint (or one view alone).
// Continuous difficulty (Pierre, 2026-10-31; Elo as in Pelánek 2016 / Duolingo Birdbrain, no time criteria): every
// question draws from ALL the game photos of the genus, weighted by how close each photo's difficulty (photoDiff) is to
// the target for this player on this genus (ability(n) - TARGET_OFF, about 80% right in a 4-choice question). On top:
// photos never seen get a bonus (bigger when the player is doing well; IMR and Pierre's photos first), photos already
// answered right twice weigh less (they may be memorised), the colony of the last 2 questions on the genus is held back,
// and at least 3 colonies stay in rotation (VARIETY) whatever the level, so a struggling player still sees new photos.
// Every photo of a question comes from one observation (same colony); views that colony lacks are simply not shown.
const PICKD = {TARGET_OFF: 1.0, SIGMA: 0.7, VARIETY: 3, FLOOR: 0.05, SINGLE: 0.5};
// One zoom level per question (Pierre, 2026-10-31): beginners get every view of the colony (lots of information); as
// the player's level on the genus rises, more and more questions show a single view (colony, closer or corallites
// alone), up to 85% of them, so each view is learned on its own and each photo's difficulty is measured on its own.
// A single view counts as harder (SINGLE), so easier photos are picked for it. The other views show after the answer.
const singleP = n => Math.min(0.85, Math.max(0, (ability(n) - 0.5) / 1.5));
function photoSet(n) {
  const g = GX(n),
    two = g.levels === 2,
    need = two ? ['wide', 'macro'] : ['wide', 'medium', 'macro'];
  const shownV = two ? ['wide', 'macro'] : ['wide', 'medium'];
  // The Colony slot never gets a photo whose growth form is "x" (too close to see it): that is a close-up. Except for a
  // genus with a single IMR growth form (Pierre): the form is no question there, so the photo still works as a colony.
  const oneForm = imrFormsOf(n).length === 1,
    ok = v => p => v !== 'wide' || p.form !== 'x' || oneForm;
  // Bonus genera: Research Grade only. A two-level genus's close-ups may still sit in "medium" (extra genera from
  // tools/build_extra.py, e.g. Sandalolitha): they count as its close-up level, so its corallites milestone is reachable.
  const gameOk = p => !g.x || p.own || !p.gid;
  const pics = v =>
    [...gamePics(n, v, 'hard'), ...(two && v === 'macro' ? gamePics(n, 'medium', 'hard') : [])].filter(ok(v)).filter(gameOk);
  const single = Math.random() < singleP(n),
    s = P[n] || {},
    seen = s.ps || {},
    ro = s.ro || [],
    tgt = ability(n) - PICKD.TARGET_OFF - (single ? PICKD.SINGLE : 0);
  const h = [...recent(n).slice(-5)],
    hot = h.length ? h.filter(x => x === '1').length / h.length : 0.5;
  // off: extra difficulty when the colony only has one view, so the question will show it alone (SINGLE).
  const w = (p, off = 0) => {
    const x = (photoDiff(n, p) + off - tgt) / PICKD.SIGMA,
      k = seen[p.f];
    let r = Math.exp((-x * x) / 2);
    if (!k) r *= (1 + 1.5 * hot) * (isCore(p) ? 1.3 : 1);
    else if (k[1] >= 2) r *= 0.6;
    return r;
  };
  const obs = {};
  need.forEach(v =>
    pics(v).forEach(p => {
      const k = p.o || p.f;
      (obs[k] = obs[k] || {})[v] = (obs[k][v] || []).concat([p]);
    })
  );
  const keys = Object.keys(obs);
  // All the photos of a question come from ONE observation (Pierre, 2026-11-01: zoom levels of different colonies shown
  // together read as one coral and teach a wrong picture). Beginners (several views) favour colonies photographed at
  // several zooms (cov squared); a colony with a single view becomes a single-view question, never topped up from another one.
  const score = k => {
    const o = obs[k],
      vs = (single ? need : shownV).filter(v => o[v]);
    if (!vs.length) return 0;
    const nv = need.filter(v => o[v]).length,
      off = !single && nv === 1 ? PICKD.SINGLE : 0,
      cov = nv / need.length;
    const m = vs.reduce((t, v) => t + Math.max(...o[v].map(p => w(p, off))), 0) / vs.length;
    return m * (single ? cov : cov * cov) * (ro.includes(k) ? 0.15 : 1);
  };
  const sc = Object.fromEntries(keys.map(k => [k, score(k)])),
    top = Math.max(0, ...Object.values(sc));
  keys
    .filter(k => sc[k] > 0)
    .sort((a, b) => sc[b] - sc[a])
    .slice(0, PICKD.VARIETY)
    .forEach(k => {
      if (!ro.includes(k)) sc[k] = Math.max(sc[k], 0.5 * top);
    });
  keys.forEach(k => {
    if (sc[k] > 0) sc[k] = Math.max(sc[k], PICKD.FLOOR * top);
  });
  const o = top ? obs[wpick(keys, k => sc[k])] : keys.length ? obs[pick(keys)] : {};
  const one = v => {
    const L = o[v] || [];
    return L.length ? {...wpick(L, w), view: v} : null;
  };
  const lab = v => (two && v === 'macro' ? 'close' : v);
  const has = need.filter(v => (o[v] || []).length);
  if (single || has.length === 1) {
    const v = has.length ? pick(has) : null;
    if (v) {
      const p = one(v);
      return {shown: [{...p, view: lab(v)}], hint: null, reveal: has.filter(x => x !== v).map(x => ({...pick(o[x]), view: lab(x)}))};
    }
    return {shown: [], hint: null};
  }
  // Two-level genera (e.g. Plerogyra, mushroom corals) show colony + close-up, with no hint.
  if (two) {
    const m = one('macro');
    return {shown: [one('wide'), m && {...m, view: 'close'}].filter(Boolean), hint: null};
  }
  // A colony with only closer + corallites shows the closer view, the corallites as the hint.
  return {shown: [one('wide'), one('medium')].filter(Boolean), hint: one('macro')};
}
// Weighted random pick (weights from f).
function wpick(L, f) {
  const ws = L.map(x => Math.max(0, f(x))),
    t = ws.reduce((a, b) => a + b, 0);
  if (!t) return pick(L);
  let r = Math.random() * t;
  for (let i = 0; i < L.length; i++) {
    r -= ws[i];
    if (r <= 0) return L[i];
  }
  return L[L.length - 1];
}
// Which genus to ask next (Pierre: spread the work, target what is not seen or not mastered yet, keep some chance).
// Weight by status and by how unsure the knowledge model still is (BKT, 1 - L): review 3-5, learning 1-4,
// learned 0.25 (unseen 10, so every genus comes up early). A genus asked in the last 4 questions is mostly held back so the work spreads across genera.
let lastQs = [];
const weight = n => {
  const lv = level(n)[0],
    u = 1 - knownP(n),
    w = lv === 'new' ? 10 : lv === 'ok' ? 0.25 : lv === 'weak' ? 3 + 2 * u : 1 + 3 * u;
  return lastQs.includes(n) ? w * 0.1 : w;
};
function weighted(list) {
  const w = list.map(weight),
    t = w.reduce((a, b) => a + b, 0);
  let r = Math.random() * t;
  for (let i = 0; i < list.length; i++) {
    r -= w[i];
    if (r <= 0) return list[i];
  }
  return list[list.length - 1];
}
function nextTarget(list) {
  let n,
    k = 0;
  do {
    n = weighted(list);
  } while (n === last && list.length > 1 && ++k < 10);
  last = n;
  lastQs = [...lastQs, n].slice(-4);
  return n;
}
// Player ability per genus (s.th), on the same scale as photo difficulty (0 = average photo). Elo update after each
// answer, as in the sync sheet (Code.gs stats_): P(right) = g + (1 - g) * sigmoid(ability - difficulty), g = 1/choices;
// ability moves by K * (result - P(right)), K shrinking as answers build up (Pelánek 2016) but never below 0.25 so a
// genus that starts going wrong eases off quickly. Starts at 0 (target = the featured photos); no time criteria.
const ELO = {th0: 0, kmax: 0.8, kmin: 0.25, n: 15, lo: -1.5, hi: 3};
const RECENT = 10;
const recent = n => {
  const s = P[n] || {};
  return s.h ? s.h.slice(-RECENT) : '';
};
const misses = h => [...h].filter(x => x === '0').length;
const hasDuel = n => GX(n).look.some(b => DATA.gen[b]);
// Progress saved with the old Easy/Medium/Hard steps (s.lv) starts from the matching ability. A genus never answered
// starts from the player's global level (core.js playerStart: their abilities on the genera already answered), so a
// strong player gets traps, single views and harder photos on a new genus from its first question.
const ability = n => {
  const s = P[n] || {};
  return typeof s.th === 'number' ? s.th : s.lv ? ELO.th0 + Math.min(2, s.lv) : playerStart(P, n);
};
function abilityStep(n, s, good, d, k) {
  const th = ability(n),
    g = 1 / k,
    e = g + (1 - g) * sig(th - d),
    m = (s.ok || 0) + (s.ko || 0);
  const K = Math.max(ELO.kmin, ELO.kmax / (1 + m / ELO.n));
  s.th = Math.round(Math.min(ELO.hi, Math.max(ELO.lo, th + K * ((good ? 1 : 0) - e))) * 100) / 100;
  delete s.lv;
  delete s.run;
}
// For My progress: where the genus's photo difficulty stands, and how many of its game photos the player has seen.
const photoBand = n => {
  const t = ability(n) - PICKD.TARGET_OFF;
  return t < -0.5 ? 'easy' : t < 0.5 ? 'medium' : 'hard';
};
const seenOf = n => {
  const all = new Set(VIEWS.flatMap(([v]) => gamePics(n, v, 'hard').map(p => p.f))),
    ps = (P[n] || {}).ps || {};
  return `${[...all].filter(f => ps[f]).length} of ${all.size} seen`;
};
// Game set (Easy/Medium/Hard) of a photo of genus n, the prior of its difficulty; lecture or unlisted photos = Easy.
function photoLvl(n, p) {
  const sl = GX(n).sl || {};
  for (const v of Object.keys(sl)) for (let i = 2; i >= 0; i--) if ((sl[v][LEVELS[i][0]] || []).some(x => x.f === p.f)) return i;
  return 0;
}
// Photo difficulty (Elo): every RA's answers, rated by the sync sheet (?stats=1, tools/sync/Code.gs stats_). 0 = average
// photo, +1 = clearly harder. Few answers: pulled towards the photo's game set (Easy -1, Medium 0, Hard +1).
let PSTAT = (store.get('imr-photo-stats', {}) || {}).photos || {};
// Pairs of genera offered together and mixed up, every RA pooled (?stats=1 conf, sheet v10): see confOf.
let PCONF = (store.get('imr-photo-stats', {}) || {}).conf || {};
const sig = x => 1 / (1 + Math.exp(-x));
function photoDiff(n, p) {
  const prior = photoLvl(n, p) - 1,
    o = PSTAT[p.f];
  return o ? (o[1] * o[0] + 5 * prior) / (o[1] + 5) : prior;
}
// "Learned" = Bayesian Knowledge Tracing per genus: s.L = probability you know the genus, updated after each answer.
// A right answer could be a guess (1 in 4 in the quiz, 1 in 2 in a duel, more on easy photos); a mistake could be a slip
// (more likely on hard photos). So right answers on hard photos count most, and easy photos teach the model little.
// Learned: L >= 0.95, plus two milestones: once right with the corallites in view, once right in a look-alike duel (when
// the genus has look-alikes). Review: 2+ mistakes in the last 5 results. No time criteria.
const BKT = {L0: 0.1, T: 0.08, MASTER: 0.95};
function bktStep(L, good, b, k) {
  const g = 1 / k + (1 - 1 / k) * sig(-2 * b - 1),
    sl = 0.1 + 0.9 * sig(2 * b - 3);
  const post = good ? (L * (1 - sl)) / (L * (1 - sl) + (1 - L) * g) : (L * sl) / (L * sl + (1 - L) * (1 - g));
  return post + (1 - post) * BKT.T;
}
// Progress saved before BKT: replay the recent results as average quiz photos.
const knownP = n => {
  const s = P[n];
  if (!s) return 0;
  if (typeof s.L === 'number') return s.L;
  let L = BKT.L0;
  [...(s.h || '')].forEach(x => {
    L = bktStep(L, x === '1', 0, 4);
  });
  return L;
};
function bktObs(n, s, good, b, k) {
  s.L = Math.round(bktStep(knownP(n), good, b, k) * 1e4) / 1e4;
}
function missing(n) {
  const s = P[n] || {},
    m = [],
    L = knownP(n);
  if (L < BKT.MASTER) m.push(`more right answers, harder photos count more (${Math.round(100 * L)}% sure now)`);
  if (!s.cor) m.push('right once with the corallites in view (shown, or opened with the hint)');
  if (hasDuel(n) && !s.du) m.push('right once in a look-alike duel');
  return m;
}
// Partial progress of a genus, 0 to 1 (so progress moves before a genus is learned): how far its knowledge
// probability has climbed towards 95% (3/4 of the score) and the two milestones (1/4).
function genScore(n) {
  if (level(n)[0] === 'ok') return 1;
  const s = P[n];
  if (!s) return 0;
  const part = Math.min(1, Math.max(0, (knownP(n) - BKT.L0) / (BKT.MASTER - BKT.L0))),
    duel = hasDuel(n) ? 1 : 0;
  return 0.75 * part + (0.25 * ((s.cor ? 1 : 0) + (duel && s.du ? 1 : 0))) / (1 + duel);
}
// Step of a genus on the learning scale: 0 not seen, 1-4 quarters of genScore, 5 learned (My progress colours).
const lvStep = n => {
  const k = level(n)[0];
  return k === 'new' ? 0 : k === 'ok' ? 5 : 1 + Math.min(3, Math.floor(4 * genScore(n)));
};
const progPct = (L = Object.keys(DATA.gen)) => Math.round((100 * L.reduce((t, n) => t + genScore(n), 0)) / L.length);
function level(n) {
  const s = P[n];
  if (!s || (s.ok + s.ko === 0 && !s.h)) return ['new', 'Not seen'];
  if (misses(recent(n).slice(-5)) >= 2) return ['weak', 'Review'];
  if (!missing(n).length) return ['ok', 'Learned'];
  return ['mid', 'Learning'];
}
function quizNav() {
  return '';
}
// Session trail (Pierre, 2026-11-01, instead of a "3/3 right" text): the last 10 answers of this visit as 10 small cells next
// to the question, grey until answered, then a full green cell for right and a low red bar for wrong (shape and colour, so
// it reads without colour too). Fixed width: filling it never moves anything. Not saved: My progress holds the real record.
function trail() {
  const h = session.h,
    ok = h.filter(Boolean).length;
  return `<span class="trail" role="img" aria-label="${h.length ? `Last ${h.length} answers: ${ok} right, ${h.length - ok} wrong` : 'Your last 10 answers will show here'}" title="Your last 10 answers">${Array.from(
    {length: 10},
    (_, i) => {
      const v = h[i];
      return `<i${v === undefined ? '' : v ? ' class="r"' : ' class="w"'}></i>`;
    }
  ).join('')}</span>`;
}
function bindQuizNav() {
  bindGo();
}
// The game rules (behind the ? button).
const gameHelp =
  cur => `<p class="lede">${cur.startsWith('quiz-duel') ? 'Two genera that are often confused (look-alikes listed by the IMR lecture or the Coral Finder, and your own mix-ups): say which one is in the photos.' : 'Name the genus in the photos: all the photos of a question show the same coral, at one or several zoom levels.'}
  Pick an answer (or press 1-${cur.startsWith('quiz-duel') ? 2 : 4}). Stuck? When a question has no corallite photo in view, <b>Show the corallites</b> adds one. After answering you get the IMR ID tips and why the other ${cur.startsWith('quiz-duel') ? 'genus is' : 'choices are'} wrong; <b>Next</b> (or Enter) goes on.${cur.startsWith('quiz-duel') ? '' : ' The other choices start easy and its look-alikes come in as you get a genus right.'} Every answer counts in <a href="#progress">My progress</a>. From ${BONUS_AT(0)}% progress, <b>bonus genera</b> join in: corals off the IMR list that are common at Dauin and easily confused with it (fire coral <i>Millepora</i> first).</p>
  <p class="lede"><b>Photos</b>: each genus starts with its best photos, preferably a colony photographed at several zoom levels (never views of different colonies mixed), and new ones keep coming in; the more you get a genus right, the harder its photos get and the more often a single view is shown alone (colony, close-up or corallites), and a mistake eases them off. A genus is learned once your answers make it 95% sure you know it (right answers on harder photos count more), plus one right answer with the corallites in view and one in a look-alike duel: see ? on <a href="#progress">My progress</a>.</p>`;
function question(cur, target, choices, prompt, set, kq) {
  const ph = set.shown,
    lab = VIEW_LABEL;
  let answered = false,
    hintShown = false;
  const fig = (p, k) =>
    `<figure class="qph"${p.ar ? ` data-r="${p.ar}"` : ''} style="--qbg:url('${img(p, 's')}')"><button type="button" class="zoom" data-q="${k}" aria-label="Enlarge photo"><img src="${img(p)}" alt="Coral to identify${p.view ? ', ' + lab[p.view].toLowerCase() + ' view' : ''}"></button>${p.view ? `<figcaption>${lab[p.view]}</figcaption>` : ''}</figure>`;
  // One screen, no scrolling: the photos fill the stage (sized to the window), choices and feedback sit beside them.
  $v.innerHTML = `${gameHelp(cur)}<div class="q bleed">
    <div class="qstage">${ph.map(fig).join('')}</div>
    <aside class="qside">
      <div class="qtop"><p class="prompt">${prompt}</p>${trail()}${quizNav(cur)}</div>
      <div class="ans"${kq ? ` data-k="${kq}"` : ''}>${choices.map((c, i) => `<button type="button" data-c="${esc(c)}"><kbd>${i + 1}</kbd>${esc(c)}</button>`).join('')}</div>
      ${set.hint ? '<button type="button" class="linkish" id="hintb">Show the corallites (hint)</button>' : ''}
      <div id="after"></div>
    </aside></div>`;
  bindQuizNav(cur);
  fitStage();
  const hb = document.getElementById('hintb');
  const showHint = () => {
    if (hintShown || !set.hint) return;
    hintShown = true;
    const st = $v.querySelector('.qstage');
    st.insertAdjacentHTML('beforeend', fig(set.hint, ph.length));
    if (hb) hb.remove();
    fitStage();
  };
  if (hb) hb.onclick = showHint;
  // Keys: 1-4 answer, Enter goes to the next question.
  const keys = e => {
    if (!document.body.contains($v.querySelector('.q')) || !lb.hidden) return document.removeEventListener('keydown', keys);
    if (e.target.closest('input, textarea, select')) return;
    const b = !answered && $v.querySelectorAll('[data-c]')[Number(e.key) - 1];
    if (b) {
      e.preventDefault();
      b.click();
    }
  };
  document.addEventListener('keydown', keys, {signal: viewKeys()});
  $v.querySelector('.q').addEventListener('click', e => {
    const z = e.target.closest('[data-q]');
    if (!z) return;
    const list = hintShown ? [...ph, set.hint] : answered && set.reveal ? [...ph, ...set.reveal] : ph;
    zoom(
      list.map(p => ({...p, genus: target})),
      Number(z.dataset.q),
      {blind: () => !answered}
    );
  });
  // A single-view question shows the other views of the same colony once answered (seen, not part of the answer).
  const reveal = () => {
    const R = set.reveal || [],
      st = $v.querySelector('.qstage');
    if (!R.length || !st) return;
    st.insertAdjacentHTML('beforeend', R.map((p, k) => fig(p, ph.length + k)).join(''));
    fitStage();
  };
  $v.querySelectorAll('[data-c]').forEach(
    b =>
      (b.onclick = () => {
        const cor = hintShown || ph.some(p => p.view === 'macro' || p.view === 'close');
        showHint();
        reveal();
        answered = true;
        answer(cur, b.dataset.c, target, set.hint ? [...ph, set.hint] : ph, cor, hintShown || !set.hint ? null : set.hint);
        const tr = $v.querySelector('.trail');
        if (tr) tr.outerHTML = trail();
      })
  );
}
// The quiz stage fills the window below the header, so photos, choices and feedback fit without scrolling.
// The photos then take the grid (columns x rows) that shows them largest at 4:3.
function fitStage() {
  const q = $v.querySelector('.q');
  if (!q) return;
  const tab = tabH();
  q.style.setProperty('--qh', Math.max(260, innerHeight - q.getBoundingClientRect().top - window.scrollY - 16 - tab) + 'px');
  const st = q.querySelector('.qstage');
  // Phones (one column): the photo takes all the height the question and answers leave, so no gap is left under it.
  // After an answer the feedback is a bottom sheet over the page: the photo shrinks to the space left above it, so it stays in view.
  if (isStacked()) {
    const side = q.querySelector('.qside'),
      aft = q.classList.contains('done') && document.getElementById('after');
    st.style.height =
      aft && getComputedStyle(aft).position === 'fixed'
        ? Math.max(120, aft.getBoundingClientRect().top - st.getBoundingClientRect().top - 8) + 'px'
        : Math.max(180, parseFloat(q.style.getPropertyValue('--qh')) - (side ? side.offsetHeight : 240) - 10) + 'px';
  } else st.style.height = '';
  const n = st.children.length,
    W = st.clientWidth,
    H = st.clientHeight;
  // Grid of the views: the column count that gives the photos the most room (phones and tablets assume 4:3 photos).
  // Desktop (designer re-review 2026-11-01, N1): each photo's shape is known before it loads (data.json `ar`,
  // tools/apply_ratios.py; 4:3 if missing), so the grid that shows the most photo area wins: portrait or square views go
  // side by side instead of in two wide half-blurred bands. The stage keeps its full height (Pierre dislikes a photo
  // above an empty half screen), and nothing moves while the photos load.
  const rs = [...st.children].map(f => +f.dataset.r || 4 / 3);
  let best = [n, 1, 0];
  for (let c = 1; c <= n; c++) {
    const r = Math.ceil(n / c),
      cw = (W - 8 * (c - 1)) / c,
      ch = (H - 8 * (r - 1)) / r;
    const score = isStacked() ? Math.min(cw, (ch * 4) / 3) : rs.reduce((a, x) => a + Math.min(cw, ch * x) ** 2 / x, 0);
    if (score > best[2] * 1.02) best = [c, r, score];
  }
  st.style.gridTemplateColumns = `repeat(${best[0]}, minmax(0, 1fr))`;
  st.style.gridTemplateRows = `repeat(${best[1]}, minmax(0, 1fr))`;
  // Phones and tablets: the stage takes all the height the question and answers leave (computed above, before any photo
  // loads, so nothing moves while they load). Each photo fills its box (object-fit: cover, class .cov on its figure) when that
  // crops at most ~23% of it; a photo of another shape is shown whole on its blurred background. A 4:3 cap tried after the
  // design review left a small photo over an empty bottom half (Pierre, 2026-11-01): the bigger photo wins.
  // The full frame is one tap away in the lightbox.
  if (isStacked() && !st.classList.contains('qvs') && best[1] === 1) {
    const colW = st.children[0].getBoundingClientRect().width,
      h = st.getBoundingClientRect().height;
    const boxR = colW / h;
    st.querySelectorAll('.qph').forEach(f => {
      const i = f.querySelector('img');
      if (!i) return;
      // A small photo (some IMR lecture originals are ~300 px wide) is never blown up to fill: shown whole at its own
      // size on the blurred background instead, sharp rather than soft (Pierre, 2026-11-01, design re-review m5).
      const set = () => {
        const r = i.naturalWidth / i.naturalHeight,
          up = Math.max(colW / i.naturalWidth, h / i.naturalHeight);
        f.classList.toggle('cov', !!r && Math.max(boxR / r, r / boxR) <= 1.3 && up <= LOWRES);
      };
      if (i.naturalWidth) set();
      else i.addEventListener('load', set, {once: true});
    });
  } else st.querySelectorAll('.qph.cov').forEach(f => f.classList.remove('cov'));
}
addEventListener('resize', fitStage);
// Big photo stages (Look-alikes, quiz on phones and tablets): a photo that would be enlarged more than this to fill its
// box is shown whole at its own size on the blurred background instead (Pierre, 2026-11-01: sharp beats big for the few
// small IMR lecture photos). Genus sheet tiles keep filling their box.
const LOWRES = 1.15;
const fitLow = fig => {
  const i = fig.querySelector('img');
  if (!i) return;
  const chk = () => {
    const r = fig.getBoundingClientRect();
    fig.classList.toggle('lo', !!i.naturalWidth && Math.max(r.width / i.naturalWidth, r.height / i.naturalHeight) > LOWRES);
  };
  if (i.complete && i.naturalWidth) chk();
  else i.addEventListener('load', chk, {once: true});
};
// Games with a grid of cards (Memory): fill the free area. Try every column count; cards may be square up to
// 4:3 landscape (the photos' shape); keep the layout with the largest cards.
// Height of the phone bottom tab bar (0 on wider screens): every screen-fitting layout leaves room for it.
const tabH = () => {
  const t = document.querySelector('.sections');
  return t && getComputedStyle(t).position === 'fixed' ? Math.max(0, innerHeight - t.getBoundingClientRect().top) : 0;
};
function fitTiles(grid, gap, dims) {
  // Sizes a card grid to the space left on screen. With dims [a, b] the grid is a x b (either orientation)
  // and cards stretch to fill it, within sane aspect ratios; without, picks the best column count.
  if (gap === undefined) {
    gap = +grid.dataset.gap || 10;
    dims = grid.dataset.dims && grid.dataset.dims.split('x').map(Number);
  }
  grid.dataset.gap = gap;
  if (dims) grid.dataset.dims = dims.join('x');
  const n = grid.children.length,
    W = grid.parentNode.clientWidth;
  const H = Math.max(240, innerHeight - grid.getBoundingClientRect().top - window.scrollY - 16 - tabH());
  let opts = dims
    ? [
        [dims[1], dims[0]],
        [dims[0], dims[1]]
      ]
    : Array.from({length: n}, (_, i) => [i + 1, Math.ceil(n / (i + 1))]);
  // data-minw: tiles never narrower than this (their label must stay readable); the grid may then scroll.
  const minw = +grid.dataset.minw || 0;
  let best = null;
  if (minw && !dims) {
    // The most columns that keep tiles at least minw wide; tiles then take the full column width (the grid may scroll).
    const ok = opts.filter(([c]) => (W - gap * (c - 1)) / c >= minw);
    if (ok.length) {
      const c = Math.max(...ok.map(o => o[0])),
        cw = (W - gap * (c - 1)) / c,
        [, r] = ok.find(o => o[0] === c);
      const ch = (H - gap * (r - 1)) / r,
        w = cw,
        h = Math.max(Math.min(ch, cw), cw * 0.9);
      best = {c, w, h, score: 0};
      opts = [];
    }
  }
  for (const [c, r] of opts) {
    const cw = (W - gap * (c - 1)) / c,
      ch = (H - gap * (r - 1)) / r;
    let h = Math.min(ch, cw * (dims ? 1.25 : 1)),
      w = Math.min(cw, h * (dims ? 1.8 : 4 / 3));
    const score = dims ? Math.min(w, h) : w * h;
    if (!best || score > best.score) best = {c, w, h, score};
  }
  grid.style.gridTemplateColumns = `repeat(${best.c}, ${Math.floor(best.w)}px)`;
  grid.style.gridAutoRows = Math.floor(best.h) + 'px';
  grid.style.gap = gap + 'px';
  grid.style.justifyContent = 'center';
  grid.classList.add('fit');
}
addEventListener('resize', () => document.querySelectorAll('.pgrid.fit').forEach(g => fitTiles(g)));
function answer(cur, c, target, ph, cor, unseen) {
  // First answer played while signed out: remember the progress as it was (ANONB), so signing in later adds only what
  // was played since, not progress an older sign-out left on the device.
  if (!SYNC && SYNC_URL && !store.get(LOG0, []).length) store.set(ANONB, P);
  const good = c === target,
    s = st(target),
    chs = [...$v.querySelectorAll('[data-c]')].map(b => b.dataset.c);
  // Offers: every wrong choice shown beside the target, so the player's own mix-up rate per pair is known (confOf).
  chs.forEach(x => {
    if (x !== target) {
      s.off = s.off || {};
      s.off[x] = (s.off[x] || 0) + 1;
    }
  });
  session.n++;
  session.h = [...session.h, good].slice(-10);
  if (good) {
    session.ok++;
    s.ok++;
    s.streak++;
  } else {
    s.ko++;
    s.streak = 0;
    s.conf = s.conf || {};
    s.conf[c] = (s.conf[c] || 0) + 1;
  }
  // Knowledge (BKT) with the difficulty of the photos shown (before the result joins s.h, which BKT replays for old progress).
  const nc = $v.querySelectorAll('[data-c]').length || 4,
    k = Math.min(nc, Number(($v.querySelector('.ans') || {dataset: {}}).dataset.k) || nc);
  // A photo seen for the first time is the best evidence (Kellman: novel instances); one already answered right twice
  // may be memorised, so it counts as an easier photo (a right answer then looks more like a guess).
  const th0 = ability(target),
    nw = ph.filter(p => !(s.ps || {})[p.f]).length;
  const solo = ph.length === 1 ? PICKD.SINGLE : 0; // one view alone is harder than the same photo with the others
  const ps = (s.ps = s.ps || {}),
    d0 = solo + ph.reduce((t, p) => t + photoDiff(target, p), 0) / Math.max(1, ph.length);
  const bk = solo + ph.reduce((t, p) => t + photoDiff(target, p) + (!ps[p.f] ? 0.5 : ps[p.f][1] >= 2 ? -1 : 0), 0) / Math.max(1, ph.length);
  bktObs(target, s, good, bk, k);
  abilityStep(target, s, good, d0, k);
  // Global level (core.js playerStart): the same Elo step over every answer, kept as the pseudo-genus LEVEL.
  // Made at the first answer from the player's history (levelSeed), whose counts already include this answer.
  if (P[LEVEL]) P[LEVEL][good ? 'ok' : 'ko']++;
  else P[LEVEL] = levelSeed(P);
  abilityStep(LEVEL, P[LEVEL], good, d0, k);
  // The corallites hint is revealed after the answer when it was not opened: seen, but not recognised.
  ph.forEach(p => {
    const x = (ps[p.f] = ps[p.f] || [0, 0]);
    x[0]++;
    if (good && (cor || p.view !== 'macro')) x[1]++;
  });
  if (ph[0]) s.ro = [...(s.ro || []).filter(o => o !== (ph[0].o || ph[0].f)), ph[0].o || ph[0].f].slice(-2);
  s.h = ((s.h || '') + (good ? 1 : 0)).slice(-10); // recent results, newest last
  // Pierre's rule: a wrong answer also shows the genus given is not mastered, so it counts as a miss for it too.
  if (!good && GX(c)) {
    const w = st(c);
    bktObs(c, w, false, 0, k);
    w.h = ((w.h || '') + '0').slice(-10);
    w.streak = 0;
    abilityStep(c, w, false, 0, k);
  }
  if (good && cor) s.cor = 1; // milestone: right with the corallites photo in view
  if (good && cur.startsWith('quiz-duel')) s.du = 1; // milestone: won a look-alike duel
  // Answer log for the RA sheet: kept until the sheet confirms it (capped), so an answer is never logged twice or lost offline.
  // Not signed in yet: the answers wait on this device (LOG0) and join the log when the player signs in (signIn), so the
  // sheet's Answers tab also gets what was played before the account existed (Pierre, 2026-11-01).
  const ans = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    t: new Date().toISOString(),
    g: target,
    a: c,
    ok: good ? 1 : 0,
    m: cur + (k < nc ? '|k' + k : ''),
    ph: ph.map(p => p.f).join(' '),
    ch: chs.join(' '),
    e: Math.round(100 * (1 / k + (1 - 1 / k) * sig(th0 - d0))) / 100,
    th: th0,
    nw
  };
  if (SYNC) SYNC.log = [...(SYNC.log || []), ans].slice(-2000);
  else if (SYNC_URL) {
    store.set(LOG0, [...store.get(LOG0, []), ans].slice(-2000));
    // Not signed in: the answer also goes to the sheet anonymously (Pierre, 2026-11-01), see sendAnon.
    store.set(ANONQ, [...store.get(ANONQ, []), ans].slice(-500));
    anonSoon();
  }
  save();
  $v.querySelectorAll('.qstage .qph').forEach((f, k) => f.insertAdjacentHTML('beforeend', photoSrc(ph[k])));
  // A mix-up: the stage becomes a montage, the photo shown (corallites if they were shown) next to a photo of the
  // genus answered in the same view, so the difference is seen at the moment of the mistake. The pair then comes back
  // as a duel in the photo quiz a couple of questions later.
  let again = false;
  if (!good && GX(c)) {
    // Only photos the player saw during the question: a corallites hint left closed is not "the photo shown".
    const order = ph.filter(p => p !== unseen).sort((x, y) => (y.view === 'macro') - (x.view === 'macro')),
      G = GX(c),
      V = Object.fromEntries(Object.entries(G.views).map(([v, L]) => [v, L.filter(p => !G.x || p.own || !p.gid)]));
    const tp = order.find(p => (V[p.view] || []).length);
    if (tp) {
      const [, cp] = photoPair([tp], V[tp.view], tp),
        st0 = $v.querySelector('.qstage'),
        lab = VIEW_LABEL[tp.view] || '';
      const fig = (p, n, cls, note) =>
        `<figure class="qph ${cls}"${p.ar ? ` data-r="${p.ar}"` : ''} style="--qbg:url('${img(p, 's')}')"><button type="button" class="zoom" data-vs="${cls}" aria-label="Enlarge ${esc(n)}"><img src="${img(p)}" alt="${esc(n)}, ${lab.toLowerCase()} view"></button><figcaption><span aria-hidden="true">${cls === 'qok' ? '✓' : '✗'}</span> <i>${esc(n)}</i></figcaption><small>${note}</small>${photoSrc(p)}</figure>`;
      st0.classList.add('qvs');
      st0.innerHTML = fig(tp, target, 'qok', 'The photo shown') + fig(cp, c, 'qko', 'Your answer, same view');
      st0.querySelectorAll('[data-vs]').forEach(
        z =>
          (z.onclick = e => {
            e.stopPropagation();
            zoom(
              [
                {...tp, genus: target},
                {...cp, genus: c}
              ],
              z.dataset.vs === 'qok' ? 0 : 1
            );
          })
      );
      fitStage();
    }
    if (cur === 'quiz') {
      rematch = {pair: [target, c], wait: 1};
      again = true;
    }
  }
  $v.querySelectorAll('[data-c]').forEach(b => {
    b.disabled = true;
    if (b.dataset.c === target) b.classList.add('ok');
    else if (b.dataset.c === c) b.classList.add('ko');
  });
  // Bonus genera unlocked and not announced yet (Q.ba = how many were announced) are named once in the feedback.
  const g = GX(target),
    bo = bonusOpen(),
    nbo = bo.slice(Q.ba || 0);
  if (nbo.length) {
    Q.ba = bo.length;
    saveQ();
  }
  const vs =
    !good && GX(c)
      ? `<p class="vs">Why not <i>${esc(c)}</i>: ${esc(tipsText(GX(c)))} <a class="linkish" href="#cmp-${esc(target)}|${esc(c)}">Compare them</a></p>${again ? '<p class="vs again">This pair comes back as a duel in a moment.</p>' : ''}`
      : '';
  document.getElementById('after').innerHTML = `<div class="fb">
    <h3 class="${good ? 'ok' : 'ko'}"><span class="v">${good ? '\u2713 Yes' : '\u2717 No'},</span> it's <a href="#g-${esc(target)}"><i>${esc(target)}</i></a>${g.x ? ' (bonus, not on the IMR list)' : g.n ? '' : ' (★ not surveyed)'}</h3>
    <div class="tipbox fbtips">${g.qt ? `<p class="label">${tipsLabel(g)}</p>` : ''}${tipsList(g, 'imrfb')}${g.mn ? `<p class="mn"><b>Mnemonic:</b> ${esc(g.mn)}</p>` : ''}</div>${vs}
    <details class="more"><summary>Coral Finder</summary>${(g.imr || []).length ? `<p class="vs">${esc(g.sum)}</p>` : ''}<ul>${g.crit.map(x => `<li>${esc(x)}</li>`).join('')}</ul><p class="credit">${ph.map(credit).join('<br>')}</p></details>${repBtn({g: target, a: c, ph: ph.map(p => p.f), m: cur})}</div>
    <button class="next" type="button" id="next">Next <kbd>↵</kbd></button>`;
  // Phones: the feedback opens as a bottom sheet so the answer and Next show without scrolling (app.css .q.done).
  const qq = $v.querySelector('.q');
  if (qq) qq.classList.add('done');
  if (isStacked()) {
    window.scrollTo(0, 0);
    fitStage();
    const mo = document.querySelector('#after details');
    if (mo) mo.ontoggle = fitStage;
  }
  // Tablet and desktop: the feedback always sits in the answer column, whatever the stage shows (3 views, one view,
  // a mix-up montage or a duel), so it is in the same place after every answer (Pierre, 2026-11-01). Phones: bottom sheet.
  bindGo(document.getElementById('after'));
  const nb = document.getElementById('next');
  nb.focus({preventScroll: true});
  nb.onclick = route;
  if (nbo.length) unlockShow(nbo);
  else if (nudgeDue()) signinNudge();
}
// Unlock card (Pierre, 2026-11-01): shown once per newly unlocked bonus genus, over the quiz feedback. A "?" tile turns
// over to the genus's cover photo, with its name and Coral Finder ID tips. Got it / Esc / Enter / a click outside closes
// it (Enter is caught first, so it doesn't also skip to the next question). No motion with prefers-reduced-motion.
function unlockShow(L) {
  const n = L[0],
    g = GX(n),
    p = cover(g),
    d = document.createElement('div');
  d.className = 'unlock';
  d.setAttribute('role', 'dialog');
  d.setAttribute('aria-modal', 'true');
  d.setAttribute('aria-label', 'Bonus genus unlocked');
  d.innerHTML = `<div class="ulcard"><div class="ulflip"><div class="ulback" aria-hidden="true"><b>?</b></div><div class="ulfront">${p ? `<img src="${img(p, 's')}" alt="">` : ''}</div></div>
    <p class="ulkick">Bonus genus unlocked</p><h3><i>${esc(n)}</i></h3>
    <p class="ulnote">Not on the IMR list, but common at Dauin. It now joins the photo quiz and the duels.</p>
    <div class="ultips"><p class="label">${tipsLabel(g)}</p>${tipsList(g)}</div>
    ${
      L.length > 1
        ? `<p class="ulnote">Also unlocked: ${L.slice(1)
            .map(x => `<i>${esc(x)}</i>`)
            .join(', ')}</p>`
        : ''
    }
    <div class="ulbtns"><a class="linkish" href="#g-${esc(n)}">Open its sheet</a><button class="next" type="button">Got it</button></div></div>`;
  document.body.appendChild(d);
  const close = () => {
    d.remove();
    document.removeEventListener('keydown', key, true);
    const nb = document.getElementById('next');
    if (nb) nb.focus({preventScroll: true});
  };
  // Enter on the focused sheet link follows it (its click closes the card); elsewhere Enter / Esc just close the card.
  const key = e => {
    if (e.key !== 'Escape' && e.key !== 'Enter') return;
    e.stopPropagation();
    if (e.key === 'Enter' && e.target.closest && e.target.closest('.unlock a')) return;
    e.preventDefault();
    close();
  };
  document.addEventListener('keydown', key, true);
  d.querySelector('button').onclick = close;
  d.querySelector('a').addEventListener('click', close);
  d.addEventListener('click', e => {
    if (e.target === d) close();
  });
  setTimeout(() => {
    const b = d.querySelector('button');
    if (b) b.focus({preventScroll: true});
  }, 50);
}
// Wrong choices get harder as the player gets better at the target genus (Pierre, 2026-11-01: "at the very start it must
// be simple", then traps appear little by little). TRAP gives how many of the 3 wrong choices are look-alikes of the
// target (IMR lecture or Coral Finder pairs, `look` both ways), from the genus's Elo ability: none on a genus's very first
// question (ability 0), then they come in fast because look-alikes are how genera are learned (Pierre, 2026-11-01): one
// from 0.18 (after the first right answer), two from 0.36, all three from 0.54 (about 5 right answers), rounded at random
// in between. A mistake drops the ability by about 0.5, so the choices ease off again. The other
// wrong choices are easy ones while traps are few: genera sharing no IMR growth form with the target (imrFormsOf),
// other IMR lecture groups first; once two traps are in, the last one is any genus (family first), as before.
const TRAP = {start: 0, step: 0.18};
const trapsFor = t => {
  const x = Math.min(3, Math.max(0, (ability(t) - TRAP.start) / TRAP.step));
  return Math.floor(x) + (Math.random() < x % 1 ? 1 : 0);
};
// Confusion score of genus n beside target t (Pierre, 2026-11-01): how often players mix the two up when both are offered
// (every RA pooled, ?stats=1 conf), starting from a prior: the declared look-alikes (IMR lecture, Coral Finder) high, then
// the same family, then a shared growth form. With few answers the prior rules; with many, the real mix-ups do, so a pair
// nobody confuses fades and an undeclared pair players do confuse becomes a trap (core.js CONF, confScore).
const isLook = (t, n) => GX(t).look.includes(n) || GX(n).look.includes(t);
// Personal path (Pierre, 2026-11-01): the pooled score is then the prior for this player's own answers on the pair
// (core.js pairConf: offered together, mixed up), worth CONF.W offers, so the player's weight is offers / (offers + 8).
// A pair this player keeps mixing up becomes a trap and a duel for them, one they now tell apart fades back to the pool.
// Performance only, never time.
function confOf(t, n) {
  const prior = isLook(t, n)
    ? CONF.LOOK
    : GX(n).fam === GX(t).fam
      ? CONF.FAM
      : imrFormsOf(n).some(f => imrFormsOf(t).includes(f))
        ? CONF.FORM
        : CONF.BASE;
  return confScore(pairConf(P, t, n), confScore(PCONF[t < n ? t + '|' + n : n + '|' + t], prior));
}
// Traps = the genera most confused with the target (a little shuffle among close scores, so every likely pair gets tried).
const confusable = (t, n) => confOf(t, n) >= CONF.TRAP;
function distractors(t, list, traps = trapsFor(t)) {
  const ranked = list
    .filter(n => n !== t)
    .map(n => [n, confOf(t, n) * (0.8 + 0.4 * Math.random())])
    .sort((a, b) => b[1] - a[1])
    .map(x => x[0]);
  const look = ranked.filter(n => confusable(t, n)),
    out = look.slice(0, traps),
    left = list.filter(n => n !== t && !look.includes(n));
  if (traps >= 2) return [...out, ...ranked.filter(n => !look.includes(n)), ...look.slice(traps)].slice(0, 3); // exactly `traps` traps when others exist
  const T = GX(t);
  const tf = imrFormsOf(t),
    apart = n => !imrFormsOf(n).some(f => tf.includes(f));
  const easy = left.filter(apart),
    far = easy.filter(n => GX(n).ig !== T.ig);
  // Easy choices spread over different growth forms too: three mushroom corals beside a massive target would give the
  // answer away as the odd one out.
  const cand = [...shuffle(far), ...shuffle(easy.filter(n => !far.includes(n))), ...shuffle(left.filter(n => !easy.includes(n)))];
  const used = new Set(out.flatMap(imrFormsOf)),
    res = [...out];
  for (const n of cand) {
    if (res.length >= 3) break;
    if (!imrFormsOf(n).some(f => used.has(f))) {
      res.push(n);
      imrFormsOf(n).forEach(f => used.add(f));
    }
  }
  return [...res, ...cand.filter(n => !res.includes(n))].slice(0, 3);
}
// Elo and BKT count a guess as 1 in (target + the plausible wrong choices) while traps are few (0 or 1): easy choices from
// other growth forms are not plausible, so such a question is scored as a 2- or 3-choice one (a right answer there proves
// less). From 2 traps on, every choice counts, as before.
const plausibleK = (t, choices) => {
  const tf = imrFormsOf(t);
  return Math.max(2, choices.filter(n => n === t || confusable(t, n) || imrFormsOf(n).some(f => tf.includes(f))).length);
};
// A mix-up in the photo quiz comes back once as a duel of the two genera, one question later.
let rematch = null;
function quizPhoto() {
  const list = pool();
  if (rematch && rematch.wait-- <= 0) {
    const pair = rematch.pair;
    rematch = null;
    if (pair.every(n => list.includes(n))) {
      const t = pick(pair);
      return question('quiz', t, shuffle(pair.slice()), `Again: <i>${esc(pair[0])}</i> or <i>${esc(pair[1])}</i>?`, photoSet(t));
    }
  }
  const t = nextTarget(list),
    traps = trapsFor(t),
    ch = shuffle([t, ...distractors(t, list, traps)]);
  question('quiz', t, ch, 'Which genus?', photoSet(t), traps < 2 ? plausibleK(t, ch) : 0);
}
function quizDuel(a, b) {
  const list = pool();
  // A pair from a link (#quiz-duel|A|B) must name two genera with game photos; anything else gets a normal duel (code re-review L2).
  if (a && b && !(a !== b && GX(a) && GX(b) && photoSet(a).shown.length && photoSet(b).shown.length)) a = b = undefined;
  let pair = a && b ? [a, b] : null;
  if (!pair) {
    // Unlocked bonus genera duel with the slate look-alike the Coral Finder names.
    const ps = [
      ...pairs(),
      ...bonusOpen().flatMap(b =>
        GX(b)
          .look.filter(a => DATA.gen[a])
          .map(a => [a, b])
      )
    ].filter(([x, y]) => list.includes(x) && list.includes(y));
    // Your mix-ups you still make come up most (personal confusion score, confOf), then pairs players often confuse and
    // the classic look-alikes (compared in the IMR lecture or the Coral Finder text).
    const w = ps.map(
        ([x, y]) => (weight(x) + weight(y)) * (mixedUp(x, y) && confusable(x, y) ? 3 : confusable(x, y) || isClassic(x, y) ? 2 : 1)
      ),
      t0 = w.reduce((p, q) => p + q, 0);
    let r = Math.random() * t0;
    pair = ps[0];
    for (let i = 0; i < ps.length; i++) {
      r -= w[i];
      if (r <= 0) {
        pair = ps[i];
        break;
      }
    }
  }
  const t = pick(pair);
  question(a ? `quiz-duel|${a}|${b}` : 'quiz-duel', t, pair, `<i>${esc(pair[0])}</i> or <i>${esc(pair[1])}</i>?`, photoSet(t));
}
// Progress board, one screen: a wall of the 39 cover photos in slate order (name band in the level colour, grey photo =
// not seen, red border = review) beside a side column with the overall ring, what to review first and the mix-ups. Signing in
// and backup/reset live in the header and ⚙ (Pierre, 2026-11-01: the board comes first, nothing unrelated around it).
function quizBoard() {
  const list = Object.keys(DATA.gen)
    .filter(n => Q.stars || DATA.gen[n].n)
    .sort((a, b) => slateIdx(a) - slateIdx(b));
  // Bonus genera (off the slate) get tiles after the slate genera: unlocked ones like any genus, locked ones as "?"
  // tiles showing the slate progress that unlocks them (Pierre, 2026-11-01). They stay out of the ring and the counts.
  const BO = bonusOpen(),
    locked = BONUS.slice(BO.length).map((n, i) => BONUS_AT(BO.length + i));
  const lv = Object.fromEntries([...list, ...BO].map(n => [n, level(n)]));
  const count = k => list.filter(n => lv[n][0] === k).length;
  const weak = list.filter(n => lv[n][0] === 'weak').sort((a, b) => weight(b) - weight(a));
  // Learning level on a 6-step scale (one colour ramp, light to dark): 0 = not seen, 1-4 = quarters of the genus's
  // progress (genScore), 5 = learned. "Review" is a separate marker, so it never hides the level.
  const st = Object.fromEntries([...list, ...BO].map(n => [n, lvStep(n)])),
    nst = k => list.filter(n => st[n] === k).length;
  let deg = 0;
  const ring = [5, 4, 3, 2, 1, 0]
    .map(k => {
      const d = (360 * nst(k)) / list.length,
        c = `${k ? `var(--lv${k})` : 'var(--line)'} ${deg}deg ${deg + d}deg`;
      deg += d;
      return c;
    })
    .join(',');
  const STEPS = [
    [0, 'Not seen'],
    [1, '< 25%'],
    [2, '25-50%'],
    [3, '50-75%'],
    [4, '75%+'],
    [5, 'Learned']
  ];
  // Photo wall: the cover in full colour (grey = not seen) with a name band coloured by the genus's step on the scale,
  // holding the mini ring + % like the Slate and Groups tiles; review = red border and "!".
  const tile = n => {
    const g = GX(n),
      p = cover(g),
      [cl] = lv[n];
    return `<a class="pw ${cl} s${st[n]}${g.x ? ' bonus' : ''}" href="#g-${esc(n)}" title="${g.x ? 'Bonus genus, not on the IMR list. ' : ''}${tip(n)}">${p ? `<img src="${img(p, 's')}" alt="" loading="lazy">` : ''}${g.x ? '<b class="pbtag">Bonus</b>' : ''}<span class="pwb"><i>${esc(n)}${g.n || g.x ? '' : ' ★'}</i>${pct(n)}</span></a>`;
  };
  // Locked bonus genera: ONE tile that says what they are and when the next one comes (six "?" tiles read as a puzzle;
  // designer re-review 2026-11-01, N6).
  const lockT = cls =>
    locked.length
      ? `<span class="${cls} plock" title="Bonus genera off the IMR list, common at Dauin: the next one unlocks at ${locked[0]}% progress"><b aria-hidden="true">+${locked.length}</b><small>bonus genera · next at ${locked[0]}%</small></span>`
      : '';
  // Your mix-ups to review: each pair you mixed up, ranked by your own confusion score (confOf), so a pair you now tell
  // apart sinks and the ones you still confuse lead; the chip opens the side-by-side comparison (with "Drill this pair").
  const seenPair = new Set(),
    conf = list
      .flatMap(n =>
        Object.keys((P[n] || {}).conf || {})
          .filter(o => GX(o))
          .map(o => (n < o ? [n, o] : [o, n]))
      )
      .filter(([a, b]) => {
        const k = a + '|' + b;
        if (seenPair.has(k)) return false;
        seenPair.add(k);
        return true;
      })
      .map(([a, b]) => [a, b, pairConf(P, a, b)[1], confOf(a, b)])
      .sort((x, y) => y[3] - x[3])
      .slice(0, 3);
  // Three ways to show the same progress (Pierre wants to try each): photos, slate numbers, lecture groups.
  const tip = n => {
    const s = P[n] || {ok: 0, ko: 0},
      m = lv[n][0] === 'mid' || lv[n][0] === 'weak' ? missing(n) : [];
    return `${esc(n)}: ${lv[n][1]}${st[n] > 0 && st[n] < 5 ? ` (${Math.round(100 * genScore(n))}% of the way)` : ''}${s.ok + s.ko ? ` (${s.ok}/${s.ok + s.ko} right). Photos: ${photoBand(n)}, ${seenOf(n)}` : ''}${m.length ? '. Still needed: ' + esc(m.join('; ')) : ''}`;
  };
  // Learning level: the tile's colour is its step on the scale, and a thin line along its bottom shows the exact progress.
  const fill = () => '';
  // The same progress as a mini ring + number (ring alone on narrow tiles, nothing on the narrowest).
  const pct = n =>
    st[n] > 0 && st[n] < 5
      ? `<small class="pct" style="--p:${Math.round(100 * genScore(n))}%">${Math.round(100 * genScore(n))}%</small>`
      : '';
  const gi = n => shownGroup(n) || 99,
    groups = [...new Set(list.map(gi))].sort((a, b) => a - b);
  const VIEWS = {
    photos: () =>
      `<div class="pgrid pwall"${isPhone() ? ' data-minw="72"' : ''}>${[...list, ...BO].map(tile).join('')}${lockT('pw')}</div>`,
    // Laid out like the physical IMR slate: 1-20 down the left column, 21-34 down the right, starred genera under them.
    slate: () => {
      const num = list.filter(n => DATA.gen[n].n),
        L = num.filter(n => DATA.gen[n].n <= 20),
        R = num.filter(n => DATA.gen[n].n > 20),
        S = list.filter(n => !DATA.gen[n].n);
      const ps = n =>
        `<a class="ps ${lv[n][0]} s${st[n]}" href="#g-${esc(n)}" title="${tip(n)}"${fill(n)}><b>${DATA.gen[n].n ? DATA.gen[n].n + '.' : '★'}</b><i>${esc(n)}</i>${pct(n)}</a>`;
      // Bonus genera: one strip across both columns under the slate, so the board still fits one screen.
      const rows = Math.max(L.length, R.length + (S.length ? S.length + 1 : 0));
      const bx =
        BO.map(
          n =>
            `<a class="ps ${lv[n][0]} s${st[n]} bonus" href="#g-${esc(n)}" title="Bonus genus, not on the IMR list. ${tip(n)}"><b>+</b><i>${esc(n)}</i>${pct(n)}</a>`
        ).join('') + lockT('ps');
      return `<div class="pslate" style="--rows:${rows}">${L.map(ps).join('')}${R.map(ps).join('')}${S.length ? '<span class="psgap"></span>' : ''}${S.map(ps).join('')}<div class="psbonus" style="grid-row:${rows + 1}" title="Bonus genera, not on the IMR list">${bx}</div></div>`;
    },
    groups: () => `<div class="pgroups">${groups
      .map(k => {
        const gr = DATA.imrg.find(x => x.n === k),
          L = list.filter(n => gi(n) === k);
        return `<div class="pgr" style="--g:${gr ? groupHue(gr.n) : 200}"><span class="gn" title="${gr ? esc(gr.t) : 'Not covered in the lecture'}">${gr ? gr.n : '★'}</span><span class="pgt">${gr ? esc(gr.t) : 'Not covered in the lecture'}</span>
        <span class="pseg">${L.map(n => `<a class="${lv[n][0]} s${st[n]}" href="#g-${esc(n)}" title="${tip(n)}"${fill(n)}><i>${esc(n)}</i>${pct(n)}</a>`).join('')}</span><small>${L.filter(n => lv[n][0] === 'ok').length}/${L.length}</small></div>`;
      })
      .join('')}
      <div class="pgr pgbonus"><span class="gn" title="Bonus genera, not on the IMR list">+</span><span class="pgt">Bonus: not on the IMR list</span>
        <span class="pseg">${BO.map(n => `<a class="${lv[n][0]} s${st[n]}" href="#g-${esc(n)}" title="${tip(n)}"><i>${esc(n)}</i>${pct(n)}</a>`).join('')}${lockT('pgl')}</span><small>${BO.filter(n => lv[n][0] === 'ok').length}/${BONUS.length}</small></div></div>`
  };
  let pv = store.get('imr-coral-pview', 'photos');
  if (!VIEWS[pv]) pv = 'photos';
  $v.innerHTML = `<p class="lede"><b>To learn a genus</b>, get it right on harder and harder photos, once with the corallites in view, and once in a look-alike duel. A mistake sets it back, for the genus you missed and for the one you answered.</p>
  <p class="lede"><b>Bonus genera</b>: corals that are not on the IMR list but are common at Dauin and easily taken for a genus of the list (fire coral <i>Millepora</i> first). The first joins the photo quiz and the duels at ${BONUS_AT(0)}% progress, then one more every 5%. They don't count in your progress; their ID tips come from the Coral Finder. On this page they come after the list: a <b>?</b> tile is a bonus genus still locked, with the progress that unlocks it.</p>
  <p class="lede"><b>Colours</b>: white with a dashed border = not seen; then from pale to dark, one step per quarter of the way; the darkest, with a tick = learned. The mini ring on a tile shows exactly how far it has got. A red border and a red ! = to review (2 or more mistakes in its last 5 answers). <b>Photos</b>, <b>Slate</b> and <b>Groups</b> show the same progress in three layouts. Tap a genus to open its sheet: it shows what the genus still needs.</p>
  <p class="lede"><b>In detail</b>: each genus has its own photo difficulty, recomputed after every answer: it starts with the best photos, right answers bring harder ones, a mistake eases them off, and new photos keep coming in at every level. Learned means your answers make it 95% sure you know the genus (a probability updated after each answer: right answers on harder photos count more, a lucky guess on an easy photo counts little), plus the two milestones above.</p>
  <div class="pgame pboard"><div class="pgwrap"></div>
  <aside class="gside">
    <div class="seg" role="group" aria-label="View">${[
      ['photos', 'Photos'],
      ['slate', 'Slate'],
      ['groups', 'Groups']
    ]
      .map(([k, t]) => `<button type="button" data-pv="${k}" aria-pressed="${pv === k}">${t}</button>`)
      .join('')}</div>
    <div class="pring" style="background:conic-gradient(${ring})"><span><b>${progPct(list)}%</b><small>${count('ok')}/${list.length} learned</small></span></div>
    <a class="pboardl" id="pboardl" href="#board">🏆 Leaderboard</a>
    <div class="plvl" role="list" aria-label="Learning level">${STEPS.map(([k, t]) => `<span role="listitem" class="s${k}" title="${t}: ${nst(k)} genera"><b>${nst(k)}</b><small>${t}</small></span>`).join('')}<span role="listitem" class="pl-rev weak${count('weak') ? '' : ' zero'}" title="To review: ${count('weak')} genera"><b>${count('weak')}</b><small>Review</small></span></div>
    <p class="plvlnote"><span class="pbar"></span> = how close each genus is to Learned</p>
    ${
      weak.length
        ? `<div><h3 class="label">Review first</h3><p class="chips">${weak
            .slice(0, 4)
            .map(n => `<a class="chip" href="#g-${esc(n)}"><i>${esc(n)}</i></a>`)
            .join('')}</p></div>`
        : ''
    }
    ${conf.length ? `<div><h3 class="label">Often mixed up</h3><p class="chips">${conf.map(([n, o, k]) => `<a class="chip" href="#cmp-${esc(n)}|${esc(o)}" title="Compare side by side"><i>${esc(n)}</i> ↔ <i>${esc(o)}</i> <small>· ${k}×</small></a>`).join('')}</p></div>` : ''}
  </aside></div>`;
  bindQuizNav('quiz-board');
  bindSync();
  // The player's place on the leaderboard (Pierre, 2026-11-01: rank and Elo here, the full board on its own page).
  loadBoard().then(B => {
    const a = document.getElementById('pboardl'),
      i = B && B.rows ? boardMe(B.rows) : -1;
    if (a && i >= 0) a.innerHTML = `🏆 <b>#${i + 1}</b> · Elo ${eloScore(B.rows[i][2])}`;
  });
  // Phones: the Photos/Slate/Groups switch sits above the board and stays pinned while the page scrolls (Pierre, 2026-10-31).
  if (matchMedia(MQ.phone).matches) {
    const sg = $v.querySelector('.pboard .gside .seg');
    sg.classList.add('pvpin');
    $v.querySelector('.pboard').before(sg);
  }
  const wrap = $v.querySelector('.pboard .pgwrap');
  const show = () => {
    wrap.innerHTML = VIEWS[pv]();
    $v.querySelectorAll('[data-pv]').forEach(b => b.setAttribute('aria-pressed', b.dataset.pv === pv));
    requestAnimationFrame(() => {
      const g = wrap.firstChild;
      if (g.classList.contains('pgrid')) fitTiles(g, 6);
      else
        g.style[pv === 'slate' ? 'minHeight' : 'height'] =
          Math.max(320, innerHeight - g.getBoundingClientRect().top - window.scrollY - 16 - tabH()) + 'px';
    });
  };
  $v.querySelectorAll('[data-pv]').forEach(
    b =>
      (b.onclick = () => {
        pv = b.dataset.pv;
        store.set('imr-coral-pview', pv);
        show();
      })
  );
  show();
}

// Header progress pill: genera learned, always in view; the page itself is #progress.
const $prog = document.getElementById('prog');
function showProg() {
  if (!DATA) return;
  const n = Object.keys(DATA.gen);
  const pt = `${progPct(n)}%`,
    lt = `${n.filter(x => level(x)[0] === 'ok').length}/${n.length} genera learned`;
  document.getElementById('progn').textContent = pt;
  $prog.title = `Your progress: ${pt} (${lt})`;
  const p2 = document.getElementById('progn2');
  if (p2) p2.textContent = pt;
  // Not signed in: the pill's tooltip says so, so RAs find where to save their progress.
  const pill = document.getElementById('prog'),
    out = !!SYNC_URL && !SYNC;
  pill.querySelector('.pl').textContent = 'Progress';
  pill.style.setProperty('--pp', progPct(n));
  // Status only (design review 2026-11-01): the pill shows progress and nothing else. Its dot (saving trouble) is gone: the
  // "Not saved" pill beside it already says so in words (design re-review p9).
  pill.title = SYNC
    ? `Signed in as ${SYNC.name}: your progress per genus`
    : out
      ? 'Your progress (not saved online yet: Sign in, top right)'
      : 'Your progress per genus';
  // Signing in (Pierre, 2026-11-01): a filled "Sign in" button in the header on every page while signed out; once signed in
  // it disappears and the account (name, Send now, Sign out) is a quiet line at the top of ⚙. Trouble saving brings it
  // back as "Not saved", which opens ⚙ where the problem is explained.
  const sb = document.getElementById('signb'),
    bad = syncTrouble();
  sb.hidden = !SYNC_URL || (!!SYNC && !bad);
  sb.textContent = bad ? 'Not saved' : 'Sign in';
  sb.classList.toggle('warn', !!bad);
  sb.title = bad || 'Sign in to save your progress for your IMR trainer';
}
// Progress files: every imr-coral-* key in localStorage (quiz progress, settings, Lab scores), as JSON.
const progData = () => {
  const d = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.startsWith('imr-coral') && k !== 'imr-coral-sync') d[k] = localStorage.getItem(k);
    }
  } catch (e) {}
  return d;
};
const loadData = d =>
  Object.entries(d || {}).forEach(([k, v]) => k.startsWith('imr-coral') && k !== 'imr-coral-sync' && localStorage.setItem(k, v));
function bindProgFile() {
  const msg = t => (document.getElementById('pmsg').textContent = t);
  document.getElementById('pexp').onclick = () => {
    const out = {app: 'imr-coral-id', saved: new Date().toISOString(), data: progData()};
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 1)], {type: 'application/json'}));
    a.download = `imr-coral-progress-${out.saved.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    msg('Saved. Keep the file somewhere safe (Drive, email to yourself).');
  };
  const pick = document.getElementById('pimp');
  document.getElementById('pload').onclick = () => pick.click();
  // After loading a file the page reloads: ⚙ opens on the backup fold to confirm it (not after a sign-in, which also reloads).
  try {
    const done = sessionStorage.getItem('imr-coral-loaded');
    if (done) {
      sessionStorage.removeItem('imr-coral-loaded');
      msg('Progress loaded from ' + done + '.');
      if (done !== 'the IMR sheet') {
        document.querySelector('#settings .saveprog').open = true;
        setOpen(true);
      }
    }
  } catch (e) {}
  pick.onchange = e => {
    const f = e.target.files[0];
    if (!f) return;
    f.text()
      .then(t => {
        const j = JSON.parse(t);
        if (j.app !== 'imr-coral-id' || !j.data) throw 0;
        loadData(j.data);
        // Reload so every setting held in memory (quiz options, list order, Lab state) picks up the file.
        try {
          sessionStorage.setItem('imr-coral-loaded', f.name);
        } catch (e) {}
        location.reload();
      })
      .catch(() => msg('This file is not an IMR Coral ID progress file.'));
  };
}
// RA sync: progress goes to Pierre's Google Sheet (Apps Script web app, tools/sync/Code.gs) under a name
// and a 4-digit code; the same name and code bring it back on another device. Off while SYNC_URL is empty.
// Photo difficulty from the sheet (Elo over every RA's answers), kept for offline use. An older sheet script without
// stats simply answers with an error, and the game-set priors are used.
// Refreshed every 10 minutes while the page is open (the sheet caches it for 10 minutes too), and on coming back to a
// tab left open longer than that.
let statsAt = 0;
setInterval(() => {
  if (document.visibilityState === 'visible') loadStats();
}, 600000);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && Date.now() - statsAt > 600000) loadStats();
});
function loadStats() {
  if (!SYNC_URL || !DATA) return;
  statsAt = Date.now();
  fetch(SYNC_URL + '?stats=1')
    .then(r => r.json())
    .then(j => {
      if (j && j.ok && j.photos) {
        PSTAT = j.photos;
        PCONF = j.conf || {};
        store.set('imr-photo-stats', {t: Date.now(), photos: j.photos, conf: PCONF});
      }
    })
    .catch(() => {});
}
const SYNC_URL = 'https://script.google.com/macros/s/AKfycbyt6l9sBeWP4KacPx1SUbsk9-15uJikxRafrpwF6b2oAE8GgrnPOtuJg7IqfFG5ymrR/exec';
let SYNC = store.get('imr-coral-sync', null),
  syncTimer = null;
function syncSummary() {
  const n = Object.keys(DATA.gen),
    genera = Object.fromEntries(n.map(x => [x, level(x)[0]]));
  return {
    learned: n.filter(x => genera[x] === 'ok').length,
    seen: n.filter(x => genera[x] !== 'new').length,
    total: n.length,
    review: n.filter(x => genera[x] === 'weak'),
    genera,
    pct: progPct(n), // the public leaderboard (sheet v14): progress as the header shows it
    board: boardOn() ? 1 : 0
  };
}
const syncGet = (a = SYNC) => fetch(`${SYNC_URL}?name=${encodeURIComponent(a.name)}&pin=${encodeURIComponent(a.pin)}`).then(r => r.json());
// Two devices on one account: three-way merge against SYNC.base, the progress as last sent or received.
// Answers taken on this device since then are added on top of the saved record, so neither side's answers
// are lost. A reset (imr-coral-reset, a time) wins over older progress.
const copy = o => JSON.parse(JSON.stringify(o));
function mergeSaved(j) {
  if (typeof j.rev === 'number') SYNC.srv = j.rev; // the sheet's revision this merge is based on (sent back as at, v6)
  const d = j.data || {};
  let R = {};
  try {
    R = JSON.parse(d['imr-coral-progress'] || '{}') || {};
  } catch (e) {}
  const rr = JSON.parse(d['imr-coral-reset'] || '""'),
    lr = store.get('imr-coral-reset', '');
  // A send whose reply was lost but which did reach the sheet: the saved record is exactly what was sent.
  if (SYNC.pending && d['imr-coral-progress'] === SYNC.pending) SYNC.base = R;
  delete SYNC.pending;
  if (lr > rr) return;
  if (rr > lr) {
    P = R;
    SYNC.base = copy(R);
    store.set('imr-coral-sync', SYNC);
    store.set('imr-coral-reset', rr);
    store.set('imr-coral-progress', P);
    showProg();
    return;
  }
  // In place: other code holds P by name only, but keep the same object anyway.
  const M = mergeProgress(SYNC.base || {}, P, R);
  Object.keys(P).forEach(g => delete P[g]);
  Object.assign(P, M);
  // The saved record is now part of P: it becomes the baseline, so a failed send can't count it twice.
  SYNC.base = copy(R);
  store.set('imr-coral-sync', SYNC);
  store.set('imr-coral-progress', P);
  showProg();
}
// Pull, merge, then send. Every change bumps SYNC.rev; a send clears SYNC.dirty only if nothing changed
// meanwhile. Unsent progress is retried on start-up and when back online.
// One sync at a time: a request made while one runs is queued and runs once it ends.
let syncing = null,
  syncAgain = false;
function syncPush() {
  if (!SYNC_URL || !SYNC || !DATA) return Promise.resolve(null);
  if (syncing) {
    syncAgain = true;
    return syncing;
  }
  syncing = syncOnce().finally(() => {
    syncing = null;
    if (syncAgain) {
      syncAgain = false;
      syncPush();
    }
  });
  return syncing;
}
// at = the sheet revision merged against (script v6): if another device wrote in between, the sheet answers 'stale'
// (answers logged all the same) and the whole pull-merge-send runs again, at most twice (code review M1).
function syncOnce(tries = 0) {
  const me = SYNC;
  let rev, sent, log;
  // If the device is disconnected or switched to another account meanwhile, drop this sync.
  // Script v11: a name the admin removed or merged answers 'gone' (with the name it joined): recorded below, no send.
  return syncGet(me)
    .then(j => {
      if (SYNC !== me) return null;
      if (!j.ok) return j;
      if (j.found) mergeSaved(j);
      rev = me.rev;
      sent = copy(P);
      log = me.log || [];
      me.pending = progData()['imr-coral-progress'] || '';
      store.set('imr-coral-sync', me);
      const pd = (progData()['imr-coral-progress'] || '').length;
      if (pd > 40000) console.warn(`Progress is ${pd} characters (sheet script v6 stores any size; v5 stops at 50,000).`);
      return fetch(SYNC_URL, {
        method: 'POST',
        body: JSON.stringify({
          name: me.name,
          pin: me.pin,
          data: progData(),
          summary: syncSummary(),
          answers: log,
          // First send after signing in: the answers this device sent anonymously move to this name (script v12).
          ...(me.anon ? {anon: me.anon} : {}),
          ...(typeof me.srv === 'number' ? {at: me.srv} : {})
        })
      }).then(r => r.json());
    })
    .then(j => {
      if (!j || SYNC !== me) return j;
      // Answers the sheet confirmed are dropped from the queue even when the progress write itself was refused.
      if (j.log && log.length) {
        const done = new Set(log.map(x => x.id));
        me.log = (me.log || []).filter(x => !done.has(x.id));
        store.set('imr-coral-sync', me);
      }
      // The retry is a whole sync of its own: its result skips the steps below (they would apply this round's sent copy).
      if (j.error === 'stale' && tries < 2) {
        delete me.pending;
        return syncOnce(tries + 1).then(r => {
          throw {retried: r};
        });
      }
      return j;
    })
    .then(j => {
      if (j && j.ok && SYNC === me) {
        me.last = new Date().toISOString();
        me.base = sent;
        if (typeof j.rev === 'number') me.srv = j.rev;
        delete me.pending;
        delete me.err;
        if (!j.log && log.length) me.err = 'net';
        if (me.anon) delete me.anon;
        if (j.log) {
          const done = new Set(log.map(x => x.id));
          me.log = (me.log || []).filter(x => !done.has(x.id));
        }
        if (me.rev === rev) delete me.dirty;
        store.set('imr-coral-sync', me);
      } else if (j && SYNC === me) {
        me.err = j.error === 'pin' || j.error === 'wait' || j.error === 'gone' ? j.error : 'net';
        if (j.error === 'gone') me.into = j.into || '';
        store.set('imr-coral-sync', me);
      }
      return j;
    })
    .catch(x => {
      if (x && 'retried' in x) return x.retried;
      if (SYNC === me) {
        me.err = 'net';
        store.set('imr-coral-sync', me);
      }
      return null;
    })
    .finally(() => {
      if (SYNC === me) bindSync();
    });
}
const syncSoon = () => {
  if (!SYNC_URL || !SYNC) return;
  SYNC.dirty = true;
  SYNC.rev = (SYNC.rev || 0) + 1;
  store.set('imr-coral-sync', SYNC);
  clearTimeout(syncTimer);
  syncTimer = setTimeout(syncPush, 3000);
};
// Bring in what other devices saved: on start-up, when the app comes back to the screen (a phone PWA resumed,
// a desktop tab switched to) and when back online. Unsent changes here: a full sync (pull, merge, send).
// Otherwise only a pull and merge, nothing written to the sheet. My progress redraws if the merge changed it.
let pulledAt = 0;
function syncPull() {
  if (!SYNC_URL || !SYNC || !DATA) return Promise.resolve(null);
  if (SYNC.dirty || (SYNC.log || []).length) return syncPush();
  if (syncing) return syncing;
  const me = SYNC,
    before = JSON.stringify(P);
  pulledAt = Date.now();
  syncing = syncGet(me)
    .then(j => {
      if (SYNC !== me) return null;
      if (!j.ok) {
        if (j.error === 'pin' || j.error === 'wait' || j.error === 'gone') {
          me.err = j.error;
          if (j.error === 'gone') me.into = j.into || '';
          store.set('imr-coral-sync', me);
        }
        return j;
      }
      if (j.found) mergeSaved(j);
      delete me.err;
      me.last = new Date().toISOString();
      store.set('imr-coral-sync', me);
      if (JSON.stringify(P) !== before && /^#(progress|quiz-board)$/.test(location.hash)) route();
      return j;
    })
    .catch(() => null)
    .finally(() => {
      syncing = null;
      if (syncAgain) {
        syncAgain = false;
        syncPush();
      }
      if (SYNC === me) bindSync();
    });
  return syncing;
}
window.addEventListener('online', syncPull);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && Date.now() - pulledAt > 30000) syncPull();
});
// Players' reports (Pierre, 2026-11-01): in a game, once the answer is out, "⚑ Report a problem" opens a small dialog:
// wrong answer (with a field for the right genus), several corals, bad photo, other, plus an optional note. A report
// carries the photos shown, the expected genus and the answer given. It waits in localStorage 'imr-reports' and goes to
// the sheet's "Reports" tab (Code.gs v7: POST {reports, rname, rpin}; the sync name and code when signed in, else the name
// typed in the dialog). An older script answers without rep: true, so reports stay queued until Pierre redeploys.
// Nothing changes on the site: Pierre reads reports, with who sent them, in the admin Triage.
// Also everywhere else it makes sense (Pierre, 2026-11-01): any enlarged photo (lightbox), the bottom of a genus sheet,
// and "Send feedback" in the footer of every page. The reasons offered depend on where the report comes from (k).
const REP_WHY = {
  game: [
    ['wrong', 'Wrong answer'],
    ['multi', 'Several corals'],
    ['photo', 'Bad photo'],
    ['other', 'Other']
  ],
  photo: [
    ['wrong', 'Wrong genus'],
    ['multi', 'Several corals'],
    ['photo', 'Bad photo'],
    ['other', 'Other']
  ],
  sheet: [
    ['info', 'Wrong information'],
    ['photo', 'Bad photo'],
    ['other', 'Other']
  ],
  page: [
    ['info', 'Wrong information'],
    ['bug', 'Bug'],
    ['idea', 'Suggestion'],
    ['other', 'Other']
  ]
};
// Context of each Report button drawn: {k: kind, g: genus concerned, a: answer given, ph: photo files, m: game or kind}.
const REPC = [];
const repBtn = (c, label = '⚑ Report a problem') =>
  `<button type="button" class="linkish rep" data-rep="${REPC.push(c) - 1}">${label}</button>`;
// Genus of a photo file, for photos opened without one (lecture comparison images have none).
const genusOfPhoto = f => {
  for (const [n, g] of Object.entries(DATA.gen)) {
    if (VIEWS.some(([v]) => [...(g.views[v] || []), ...((g.more || {})[v] || [])].some(p => p.f === f))) return n;
  }
  return '';
};
// Each report keeps who sent it (rn, rp: the sync account or the name typed, at the time of sending), so a report
// retried after another player signs in is never credited to them. One batch per sender, at most 50 (the script's cap).
function sendReports() {
  const L = store.get('imr-reports', []);
  if (!SYNC_URL || !L.length || navigator.onLine === false) return;
  const k = x => JSON.stringify([x.rn || '', x.rp || '']),
    first = L.filter(x => k(x) === k(L[0])).slice(0, 50);
  const reports = first.map(({rn, rp, ...x}) => x);
  fetch(SYNC_URL, {method: 'POST', body: JSON.stringify({rname: first[0].rn || '', rpin: first[0].rp || '', reports})})
    .then(r => r.json())
    .then(j => {
      if (!j || !j.rep) return;
      const sent = new Set(first.map(x => x.id)),
        left = store.get('imr-reports', []).filter(x => !sent.has(x.id));
      store.set('imr-reports', left);
      if (left.length) sendReports();
    })
    .catch(() => {});
}
window.addEventListener('online', sendReports);
{
  const ft = document.querySelector('footer p');
  if (ft) ft.insertAdjacentHTML('beforeend', ` ${repBtn({k: 'page'}, 'Send feedback')}`);
}
setTimeout(sendReports, 4000);
document.addEventListener(
  'click',
  e => {
    const b = e.target.closest && e.target.closest('[data-rep]');
    if (!b) return;
    e.preventDefault();
    e.stopPropagation();
    const c = REPC[+b.dataset.rep];
    if (c) reportDialog(c, b);
  },
  true
);
function reportDialog(c, btn) {
  let d = document.getElementById('repdlg');
  if (d) d.remove();
  d = document.createElement('dialog');
  d.id = 'repdlg';
  d.className = 'repdlg';
  const names = [...Object.keys(DATA.gen), ...bonusOpen()].sort(),
    kind = c.k || 'game',
    where = hashNow() || 'home';
  d.innerHTML = `<form method="dialog">
    <h3>${kind === 'page' ? 'Send feedback' : 'Report a problem'}</h3>
    <div class="repwhy" role="radiogroup" aria-label="Problem">${REP_WHY[kind].map(([k, t], i) => `<label><input type="radio" name="why" value="${k}"${i ? '' : ' checked'}><span>${t}</span></label>`).join('')}</div>
    <label class="repf" data-for="wrong">Right genus, if you know<input name="fix" list="repgen" autocomplete="off" maxlength="60" placeholder="e.g. ${esc(names.find(n => n !== c.g) || '')}"></label>
    <datalist id="repgen">${names.map(n => `<option value="${esc(n)}">`).join('')}</datalist>
    <label class="repf"><span>Note <small>(optional)</small></span><textarea name="note" rows="2" maxlength="1000"></textarea></label>
    ${SYNC ? '' : `<label class="repf">Your name<input name="who" maxlength="40" autocomplete="name" value="${esc(store.get('imr-report-name', ''))}"></label>`}
    <div class="repbtns"><button type="button" class="next sec" value="cancel">Cancel</button><button type="submit" class="next" value="send">Send</button></div>
  </form>`;
  document.body.appendChild(d);
  const f = d.querySelector('form'),
    fix = d.querySelector('[data-for="wrong"]');
  const upd = () => {
    fix.hidden = f.why.value !== 'wrong';
  };
  f.querySelectorAll('[name="why"]').forEach(r => (r.onchange = upd));
  upd();
  d.querySelector('[value="cancel"]').onclick = () => d.close();
  d.addEventListener('close', () => d.remove());
  d.addEventListener('keydown', e => e.stopPropagation()); // Escape closes this dialog only, not the photo under it
  f.onsubmit = e => {
    e.preventDefault();
    if (f.who) store.set('imr-report-name', f.who.value.trim());
    const why = f.why.value;
    const who = SYNC ? {rn: SYNC.name, rp: SYNC.pin} : {rn: f.who.value.trim()};
    store.set(
      'imr-reports',
      [
        ...store.get('imr-reports', []),
        {
          ...who,
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          t: new Date().toISOString(),
          why,
          g: c.g || '',
          a: c.a || '',
          ph: (c.ph || []).join(' '),
          m: c.m || kind,
          w: where,
          fix: why === 'wrong' ? f.fix.value.trim() : '',
          note: f.note.value.trim()
        }
      ].slice(-200)
    );
    d.close();
    sendReports();
    btn.textContent = kind === 'page' ? 'Thank you' : '⚑ Reported, thank you';
    btn.disabled = true;
  };
  d.showModal();
  d.querySelector('input[name="why"]').focus();
}
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
// Answers played before signing in (LOG0) and the one-time sign-in card (NUDGE): outside the imr-coral-* keys, so they
// never travel in the progress data sent to the sheet.
const LOG0 = 'imr-log0',
  NUDGE = 'imr-nudge',
  ANONB = 'imr-anon-base',
  ANONID = 'imr-anon-id',
  ANONQ = 'imr-anonq';
// Anonymous answers (Pierre, 2026-11-01): a player who never signs in still helps rate the photos and the confusions.
// Their answers go to the sheet under a random id made on this device ("~anon <id>": no name, no code), in small
// batches (sheet script v12; an older script answers 'input' and they simply wait here). Signing in later moves them to
// the player's name (anon in the first send; the sheet skips answers it already has, by id), and a new id is made.
const anonId = () => {
  let id = store.get(ANONID, '');
  if (!/^[a-z0-9]{10}$/.test(id)) {
    id = Array.from(crypto.getRandomValues(new Uint8Array(10)), b => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join('');
    store.set(ANONID, id);
  }
  return id;
};
let anonTimer = 0,
  anonBusy = false;
const anonSoon = () => {
  clearTimeout(anonTimer);
  anonTimer = setTimeout(sendAnon, store.get(ANONQ, []).length >= 10 ? 0 : 20000);
};
function sendAnon() {
  const q = store.get(ANONQ, []);
  if (SYNC || !SYNC_URL || anonBusy || !q.length) return;
  const batch = q.slice(0, 100);
  anonBusy = true;
  fetch(SYNC_URL, {method: 'POST', keepalive: true, body: JSON.stringify({anon: anonId(), anonAnswers: batch})})
    .then(r => r.json())
    .then(j => {
      if (!j || !j.log) return;
      const done = new Set(batch.map(x => x.id)),
        left = store.get(ANONQ, []).filter(x => !done.has(x.id));
      store.set(ANONQ, left);
      // More than one batch waiting (played offline): the next one follows; a refused batch ('busy') is not retried here.
      if (left.length) setTimeout(sendAnon, 1000);
    })
    .catch(() => {})
    .finally(() => {
      anonBusy = false;
    });
}
window.addEventListener('online', sendAnon);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') sendAnon();
});
// Signing in. A new name keeps what this device holds and sends it. A known account (found) is merged with what was
// played here before signing in: the sheet's settings and quiz state win, the progress of both adds up (mergeProgress
// with an empty base), then the page reloads and the start-up sync sends the merged progress. Either way the answers
// played before signing in join the log for the sheet's Answers tab. Before 2026-11-01 a known account replaced the
// device's progress, so a beta tester who played first and signed in later lost it.
function signIn(name, pin, j) {
  SYNC = {name, pin, dirty: true, log: store.get(LOG0, []), ...(store.get(ANONID, '') ? {anon: store.get(ANONID, '')} : {})};
  try {
    [LOG0, ANONQ, ANONID].forEach(k => localStorage.removeItem(k));
  } catch (e) {}
  if (!j.found) {
    try {
      localStorage.removeItem(ANONB);
    } catch (e) {}
    return store.set('imr-coral-sync', SYNC);
  }
  let R = {};
  try {
    R = JSON.parse(j.data['imr-coral-progress'] || '{}') || {};
  } catch (e) {}
  SYNC.base = R;
  // Only what was played while signed out counts: the delta from ANONB (the progress before the first anonymous answer)
  // is added to the sheet's. Progress left by a sign-out made before sign-out cleared the device (2026-11-01) is in
  // ANONB, so it is neither counted twice nor credited to another account.
  const anon = SYNC.log.length > 0,
    M = anon ? mergeProgress(store.get(ANONB, {}) || {}, P, R) : R;
  try {
    localStorage.removeItem(ANONB);
  } catch (e) {}
  loadData(Object.fromEntries(Object.entries(j.data || {}).filter(([k]) => k !== 'imr-coral-progress')));
  store.set('imr-coral-progress', M);
  if (!anon) delete SYNC.dirty;
  store.set('imr-coral-sync', SYNC);
  try {
    sessionStorage.setItem('imr-coral-loaded', 'the IMR sheet');
  } catch (e) {}
  location.reload();
}
// One sign-in card, once, after 10 answers played without an account (Pierre, 2026-11-01: beta testers must sign in
// early so their progress reaches the sheet). Never in Pierre's admin browser. "Later" closes it for good.
const nudgeDue = () =>
  !SYNC &&
  SYNC_URL &&
  !HAS_ADMIN_TOKEN &&
  !document.querySelector('#tour, .unlock') &&
  !store.get(NUDGE, 0) &&
  store.get(LOG0, []).length >= 10;
// once = the one-time card (marks it used); play = once signed in, its button opens the photo quiz (skipped tour).
// The header's Sign in button opens it with neither: it closes with "Close" or "Done".
function signinNudge(once = true, play = !once) {
  if (once) store.set(NUDGE, 1);
  const d = document.createElement('div');
  d.className = 'unlock signnudge';
  d.setAttribute('role', 'dialog');
  d.setAttribute('aria-modal', 'true');
  d.setAttribute('aria-label', 'Sign in');
  d.innerHTML = `<div class="ulcard"><section class="sync tsync"></section><div class="ulbtns"><span></span><button class="next sec" type="button">Later</button></div></div>`;
  document.body.appendChild(d);
  const box = d.querySelector('.tsync'),
    btn = d.querySelector('.ulbtns button');
  const close = () => {
    d.remove();
    document.removeEventListener('keydown', key, true);
    bindSync();
    const nb = document.getElementById('next');
    if (nb) nb.focus({preventScroll: true});
  };
  const key = e => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
    } else if (e.key === 'Enter' && !(e.target.closest && e.target.closest('form'))) {
      e.stopPropagation();
      e.preventDefault();
      close();
    }
  };
  document.addEventListener('keydown', key, true);
  // From a skipped tour, the card ends on the games: once signed in, its button starts the photo quiz.
  btn.onclick = () => {
    close();
    if (play && SYNC) go('quiz');
  };
  d.addEventListener('click', e => {
    if (e.target === d) close();
  });
  const label = () => {
    btn.textContent = SYNC ? (play ? 'Start playing' : 'Done') : once || play ? 'Later' : 'Close';
    btn.classList.toggle('sec', !SYNC);
  };
  label();
  bindSync(box);
  new MutationObserver(label).observe(box, {childList: true});
}
// The account box: the top of ⚙ (#sync), or the sign-in card (tour, nudge, header button) while one is open.
function bindSync(box = document.querySelector('.tsync') || document.getElementById('sync')) {
  showProg();
  if (!box) return;
  box.classList.remove('on', 'warn');
  const msg = t => (box.querySelector('[role=status]').textContent = t);
  if (SYNC) {
    // Signed in and saved: one quiet line, actions in view. Trouble (unsent answers, refused code): a box that stands out.
    const bad = syncTrouble(),
      when = SYNC.last ? new Date(SYNC.last).toLocaleString([], {dateStyle: 'short', timeStyle: 'short'}) : '';
    box.classList.add(bad ? 'warn' : 'on');
    box.innerHTML = bad
      ? `<p><b>${bad}</b></p><p class="note">${SYNC.err === 'gone' ? (SYNC.into ? `Your trainer merged this name into <b>${esc(SYNC.into)}</b> (the same person). Your answers now count there: sign out, then sign in as ${esc(SYNC.into)} with that name's code.` : 'Your trainer removed this account. Sign out, then sign in again to start a new one.') : SYNC.err === 'pin' ? 'The sheet refused the code for this name. Sign out and sign in again with the right code.' : SYNC.err === 'wait' ? 'Someone typed wrong codes for this name several times, so the sheet waits 10 minutes. Your answers are kept on this device.' : 'Your answers are kept on this device and sent as soon as the sheet can be reached.'}${when ? ` Last saved ${when}.` : ''}</p>
        <button class="chip go" type="button" id="snow">Try again</button> <button class="reset" type="button" id="soff">Sign out</button> <span class="note" role="status"></span>`
      : SYNC.dirty || (SYNC.log || []).length // answers not confirmed yet, no error so far: say so, quietly
        ? `<p class="sline"><span class="sdot wait"></span><span>Saving for IMR as <b>${esc(SYNC.name)}</b>…</span>
        <button class="linkish" type="button" id="snow">Send now</button><button class="linkish" type="button" id="soff">Sign out</button></p><span class="note" role="status"></span>`
        : `<p class="sline"><span class="sdot"></span><span>Saved for IMR as <b>${esc(SYNC.name)}</b>${when ? ` · ${when}` : ''}</span>
        <button class="linkish" type="button" id="snow">Send now</button><button class="linkish" type="button" id="soff">Sign out</button></p><span class="note" role="status"></span>`;
    box.querySelector('#snow').onclick = () => {
      msg('Sending…');
      syncPush().then(j => {
        if (!(j && j.ok))
          msg(j && j.error === 'pin' ? 'The sheet refused the code for this name.' : 'Could not reach the sheet. Check your connection.');
      });
    };
    // Signing out also clears this device's progress (it is in the sheet): the next player starts empty, and progress
    // left here is always the anonymous play of whoever signs in next, which signIn merges into their account.
    // Answers not saved yet: a second click confirms.
    const off = box.querySelector('#soff');
    off.onclick = () => {
      if ((SYNC.dirty || (SYNC.log || []).length) && !off.dataset.armed) {
        off.dataset.armed = '1';
        off.textContent = 'Sign out: unsaved answers are lost';
        return;
      }
      SYNC = null;
      ['imr-coral-sync', 'imr-coral-progress', 'imr-coral-quiz', 'imr-coral-reset', LOG0, NUDGE, ANONB, ANONID, ANONQ].forEach(k => {
        try {
          localStorage.removeItem(k);
        } catch (e) {}
      });
      location.reload();
    };
    return;
  }
  // ⚙ while signed out: one line; the form itself is in the sign-in card.
  if (box.id === 'sync') {
    box.innerHTML = `<p class="sline"><span>Not signed in: your progress stays on this device.</span><button class="linkish" type="button" id="sin">Sign in</button></p>`;
    box.querySelector('#sin').onclick = () => {
      setOpen(false);
      signinNudge(false, false);
    };
    return;
  }
  box.innerHTML = `<h3>Sign in to save your progress</h3><p>Training at IMR? Sign in with your name and a 4-digit code: your progress is saved for your trainer and comes back on any device.</p>
    <form class="sform"><label>Your name <input name="n" required maxlength="40" autocomplete="name"></label>
    <label>4-digit code <input name="p" required inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="off"></label>
    <button class="${box.classList.contains('tsync') ? 'next' : 'chip go'}" type="submit">Sign in</button> <span class="note" role="status"></span></form>
    <p class="note">New name: pick any code and remember it. Same name and code later: your saved progress comes back.</p>`;
  box.querySelector('form').onsubmit = e => {
    e.preventDefault();
    const f = e.target,
      name = f.n.value.trim(),
      pin = f.p.value.trim();
    msg('Connecting…');
    fetch(`${SYNC_URL}?name=${encodeURIComponent(name)}&pin=${encodeURIComponent(pin)}`)
      .then(r => r.json())
      .then(j => {
        if (!j.ok)
          return msg(
            j.error === 'gone'
              ? j.into
                ? `This name was merged into ${j.into}: sign in as ${j.into}.`
                : 'This name and code were removed: pick another code to start again.'
              : j.error === 'pin'
                ? 'This name already exists with another code.'
                : j.error === 'wait'
                  ? 'Too many wrong codes for this name: try again in 10 minutes.'
                  : 'Check the name and the 4-digit code.'
          );
        signIn(name, pin, j);
        if (!j.found) syncPush().then(() => bindSync());
      })
      .catch(() => msg('Could not reach the sheet. Check your connection.'));
  };
}
// Ask the browser not to evict saved progress when storage runs low.
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

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
  card: {s: '240px', m: '360px', l: '520px'},
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
    $modes.querySelector('[data-back]').onclick = () => (history.length > 1 ? history.back() : go(h.startsWith('g-') ? 'genera' : 'cmp'));
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
// Public leaderboard (Pierre, 2026-11-01): every signed-in player by progress %, then Elo (their ability from every
// answer, so players at 100% keep competing). 🏆 in the header opens it from any page; My progress shows the player's
// rank and Elo with a link here. Signed-in players appear by default; ⚙ Leaderboard Off takes them off (sent with the next
// sync, the sheet's Board column). The sheet serves it (GET ?board=1, v14, cached 5 minutes there, 1 minute here).
const BOARD = 'imr-coral-board'; // an imr-coral key: it travels with the progress, so the choice holds on every device
const boardOn = () => store.get(BOARD, 1) !== 0;
// Elo score shown to players: the ability (0 = able to name an average photo, same scale as photo difficulty) as a
// familiar number around 1000; +1 ability = +200.
const eloScore = a => (typeof a === 'number' ? Math.round(1000 + 200 * a) : '–');
let boardAt = 0,
  boardP = null;
const loadBoard = () => {
  if (!boardP || Date.now() - boardAt > 60000) {
    boardAt = Date.now();
    boardP = fetch(SYNC_URL + '?board=1')
      .then(r => r.json())
      .then(j => (j && j.ok && Array.isArray(j.rows) ? j : {err: j && j.v < 14 ? 'old' : 'na'}))
      .catch(() => ({err: 'offline'}));
  }
  return boardP;
};
const boardMe = rows => (SYNC && SYNC.name ? rows.findIndex(r => String(r[0]).toLowerCase() === SYNC.name.trim().toLowerCase()) : -1);
function viewBoard() {
  // The title sits inside .board: pageHelp drops top-level titles where the header names the page, and here it doesn't.
  $v.innerHTML = `<p class="lede">Everyone who signed in, ranked by progress, then by Elo: your level from all your answers, which keeps rising as you name harder photos right, so it still counts at 100%. To leave the leaderboard, ⚙ Settings, Leaderboard: Off.</p>
  <div class="board"><h2 class="btitle">🏆 Leaderboard</h2><div id="board"><p class="note">Loading…</p></div></div>`;
  loadBoard().then(B => {
    const box = document.getElementById('board');
    if (!box || hashNow() !== 'board') return;
    if (!B || B.err) {
      box.innerHTML = `<p class="note">${B && B.err === 'offline' ? 'The leaderboard needs a connection.' : 'The leaderboard is not available yet.'}</p>`;
      return;
    }
    const me = boardMe(B.rows);
    const note = !SYNC
      ? '<p class="note">Sign in (⚙ Settings) to appear on the leaderboard.</p>'
      : !boardOn()
        ? '<p class="note">You are not on the leaderboard (⚙ Settings, Leaderboard: Off).</p>'
        : me < 0
          ? '<p class="note">You will appear here after your next answers are saved.</p>'
          : '';
    box.innerHTML =
      note +
      (B.rows.length
        ? `<ol class="blist">${B.rows
            .map(
              (r, i) =>
                `<li${i === me ? ' class="me" aria-current="true"' : ''}><span class="brank">${i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</span><b class="bname">${esc(r[0])}</b><span class="bpct">${r[1] == null ? '–' : r[1] + '%'}</span><span class="belo" title="Elo: level from all answers">Elo ${eloScore(r[2])}</span></li>`
            )
            .join('')}</ol>`
        : '<p class="note">Nobody yet: be the first.</p>');
    const m = box.querySelector('.me');
    if (m && m.scrollIntoView && m.getBoundingClientRect().bottom > innerHeight) m.scrollIntoView({block: 'center'});
  });
}
// Told once, when the leaderboard arrives, to players already signed in: their name now shows there.
function boardNotice() {
  // Players signed in before the leaderboard: one sync writes their progress % (the sheet has none for them yet).
  if (SYNC && !store.get('imr-board-sent', 0)) {
    store.set('imr-board-sent', 1);
    syncSoon();
  }
  if (!SYNC || store.get('imr-board-told', 0)) return;
  store.set('imr-board-told', 1);
  const t = document.createElement('div');
  t.className = 'apptoast';
  t.setAttribute('role', 'status');
  t.innerHTML = `<span>🏆 New: a <a href="#board">leaderboard</a>. Your name shows there; to leave it, ⚙ Settings, Leaderboard: Off.</span><button type="button" aria-label="Close">✕</button>`;
  t.querySelector('button').onclick = () => t.remove();
  t.querySelector('a').onclick = () => t.remove();
  document.body.append(t);
  setTimeout(() => t.remove(), 15000);
}
// ⚙ Leaderboard On / Off: saved here, sent with the next sync.
const showBoardSet = () =>
  document
    .querySelectorAll('#boardset button')
    .forEach(b => b.setAttribute('aria-pressed', String((b.dataset.board === '1') === boardOn())));
document.querySelectorAll('#boardset button').forEach(
  b =>
    (b.onclick = () => {
      store.set(BOARD, b.dataset.board === '1' ? 1 : 0);
      showBoardSet();
      boardP = null;
      syncSoon();
    })
);
showBoardSet();
function route() {
  if (CUR_NEW) {
    CUR = CUR_NEW;
    CUR_NEW = null;
    build();
  }
  applySize();
  const h = hashNow();
  // Home lives at the clean URL; an old #home link is rewritten to it.
  if (h === 'home') history.replaceState(null, '', location.pathname + location.search);
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
  else if (h.startsWith('quiz-duel')) {
    const [, a, b] = h.split('|');
    quizDuel(a, b);
  } else if (h.startsWith('lab') && window.viewLab) viewLab(h);
  else if (window.labTool && labTool(h)) {
  } else if ((!h || h === 'home') && window.viewHome) viewHome();
  else viewGenera();
  window.scrollTo(0, 0);
  pageHelp();
  hdrMetrics();
  // The intro moved behind ? only now, so the quiz stage is resized to the space it really has (phones gained ~280 px).
  fitStage();
  fitLk();
  // Same for card games (Memory): their grid was sized before the intro left, so it is refitted to the room it now has.
  document.querySelectorAll('.pgrid.fit').forEach(g => fitTiles(g));
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
document.getElementById('sync').hidden = !SYNC_URL;
document.getElementById('signb').onclick = e => {
  e.stopPropagation();
  if (syncTrouble()) setOpen(true);
  else signinNudge(false, false);
};
bindProgFile();
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
  if (location.hash) history.pushState(null, '', location.pathname + location.search);
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
// ?draft previews the unsaved curation from the admin page (same browser) instead of curation.json.
// Pierre's curation, also kept in localStorage (imr-curation-last): if curation.json can't be read (offline, and not in the
// service worker cache), the app uses the last copy it saw instead of none, so excluded or moved photos never come back
// into the games (code re-review 2026-11-01, H1).
const CUR_LAST = 'imr-curation-last';
const curation = () => {
  const dr = /[?&]draft\b/.test(location.search) && store.get('imr-curation-draft', null);
  return dr
    ? Promise.resolve(dr)
    : fetch('curation.json', {cache: 'no-cache'})
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
  fetch('forms.json?v=7')
    .then(okJson)
    .catch(softFail('forms.json', {}))
    .then(j => ({gf: j.gf || {}, form: j.form || {}, cf: j.cf || {}, forms: j.forms || [], gunsure: j.gunsure || {}}))
    .catch(() => ({gf: {}, form: {}, cf: {}, forms: [], gunsure: {}}));
const json = u =>
  fetch(u)
    .then(okJson)
    .catch(softFail(u.replace(/\?.*/, ''), {}));
// The page's later scripts (home.js, tour.js...) must be in before the first route: a fast or cached data.json could
// otherwise arrive first and open the Learn page instead of Home (seen under the welcome tour, 2026-11-01).
const domReady = new Promise(r => (document.readyState === 'loading' ? addEventListener('DOMContentLoaded', r, {once: true}) : r()));
Promise.all([fetch('data.json?v=29').then(r => r.json()), curation(), forms(), json('quality.json?v=3'), json('picks.json?v=1'), domReady])
  .then(([d, c, f, q, k]) => {
    RAW = d;
    CUR = c;
    FORMS = f;
    CFMAP = f.cf;
    AUTOQ = q.q || {};
    PICKS = k;
    build();
    route();
    syncPull();
    sendAnon();
    loadStats();
    window.APP_READY = true;
    if (window.tourFirst) tourFirst();
    boardNotice();
  })
  .catch(() => {
    $v.innerHTML = '<p class="warn">Could not load the data. Check your connection and reload.</p>';
  });
// A tab left open for days still follows Pierre's published curation (e.g. the CF book switch): when the tab comes back
// into view (or every 30 min while visible), curation.json is read again; a change applies at the next screen (route),
// never in the middle of a game.
function curRefresh() {
  if (!RAW || /[?&]draft\b/.test(location.search)) return;
  curAt = Date.now();
  fetch('curation.json', {cache: 'no-cache'})
    .then(r => (r.ok ? r.json() : null))
    .then(c => {
      if (c) store.set(CUR_LAST, c);
      if (c && JSON.stringify(c) !== JSON.stringify(CUR)) CUR_NEW = c;
    })
    .catch(() => {});
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && Date.now() - curAt > 300000) curRefresh();
});
setInterval(() => {
  if (document.visibilityState === 'visible') curRefresh();
}, 1800000);
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
