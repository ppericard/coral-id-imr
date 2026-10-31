// IMR Coral ID: hash-routed single page. Data comes from data.json (built by make_site.py).
let DATA;
const $v = document.getElementById('view');
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
// Pierre-only controls (Lab keep/trim, finder start-screen switch, ⚑ flag) show only in the browser where the
// admin page holds his token, the same test flag.js uses. RAs never see them.
// Pierre's browser holds the admin token (imr-admin-vault). ⚙ View: Admin | User (imr-admin-view) hides every
// admin-only control without touching the token, so he sees the site exactly as RAs do.
const HAS_ADMIN_TOKEN = (() => { try { return !!localStorage.getItem('imr-admin-vault'); } catch (e) { return false; } })();
const IS_ADMIN = HAS_ADMIN_TOKEN && (() => { try { return localStorage.getItem('imr-admin-view') !== 'user'; } catch (e) { return true; } })();
const store = {
  get(k, d){ try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
const VIEWS = [['wide', 'Colony'], ['medium', 'Closer'], ['macro', 'Corallites']];
const img = (p, size) => `img/${p.f}${size === 's' ? '-s' : ''}.webp`;
const srcset = p => `img/${p.f}-s.webp 480w, img/${p.f}.webp 1600w`;
// Discreet link to a photo's iNaturalist observation; games show it only once the answer is out.
const inatTag = p => p && p.o && p.o.includes('inaturalist.org') ? `<a class="inat" href="${esc(p.o)}" target="_blank" rel="noopener" title="Open the iNaturalist observation">iNat ↗</a>` : '';
// One colour per IMR lecture group, used everywhere a group appears (style="--g:…", CSS hsl(var(--g) …)).
const groupHue = n => (n * 137) % 360;
const credit = p => p.cf ? `© R. Kelley / BYOGUIDES, Coral Finder 2022, p. ${p.pg}` : p.imr ? `IMR Lecture 6, slide ${p.slide}` : `<i>${esc(p.t)}</i>${p.own ? ' <span class="own">Dauin</span>' : ''} · <a href="${esc(p.o)}" target="_blank" rel="noopener">${esc(p.a)}</a>`;
const allPhotos = g => VIEWS.flatMap(([v]) => (g.views[v] || []).map(p => ({...p, view: v})));
// Card photo: the one picked in curation.json (coverP, may be a lecture photo), else data.json's pick, else the first closer view.
// Default (Pierre): an IMR photo first, the first IMR featured Closer photo, before data.json's pick.
const cover = g => g.coverP || (((g.sl || {}).medium || {}).feat || []).find(p => p.imr) || allPhotos(g).find(p => p.f === g.cover) || (g.views.medium || [])[0] || allPhotos(g)[0];
// Editorial curation from curation.json (edited in admin.html): per genus, cover photo, featured photos
// per view (in order), hidden photos and photos moved to another view. Hidden photos leave games too.
// Candidates (data.json cand, not shown until approved) join a view when listed in add {photo: view}.
function applyCuration(d, c){
  // Coral Finder book photos (data: gen[].book, cropped from the 2022 book) can be switched off site-wide from the
  // admin (curation.json "book": false). Kept apart from the views so games and quizzes never use them (captions).
  if (c && c.book === false) Object.values(d.gen).forEach(g => { delete g.book; });
  // Book photos are candidates: only those Pierre approved in the admin (genera[n].add {f: view}) show, in that view.
  const X0 = (c && c.exclude) || {};
  Object.entries(d.gen).forEach(([n, g]) => { if (!g.book) return; const A = (((c && c.genera) || {})[n] || {}).add || {};
    g.book = g.book.filter(p => !X0[p.f] && A[p.f]).map(p => ({...p, view: A[p.f]})); });
  // Excluded photos (exclude: {f: reason}) leave every list first: genera, lecture photos, candidates, comparisons.
  const X = (c && c.exclude) || {}, keep = L => (L || []).filter(p => !X[p.f]);
  if (Object.keys(X).length) {
    Object.values(d.gen).forEach(g => ['views', 'more'].forEach(s => Object.keys(g[s] || {}).forEach(v => { g[s][v] = keep(g[s][v]); })));
    ['course', 'cand'].forEach(s => Object.keys(d[s] || {}).forEach(n => { d[s][n] = keep(d[s][n]); }));
    if (d.cmp) d.cmp = keep(d.cmp);
  }
  // "Not this genus" (out: {f: 'cmp' | genus}) runs first for every genus, so a photo given to another genus
  // can be featured or picked as cover there; 'cmp' sends it to the look-alike comparison images (d.cmp).
  Object.entries((c && c.genera) || {}).forEach(([n, k]) => { const g = d.gen[n]; if (!g) return;
    Object.entries(k.out || {}).forEach(([f, to]) => {
      let p = null, at = null;
      VIEWS.forEach(([v]) => ['views', 'more'].forEach(s => { const L = (g[s] || {})[v] || [], i = L.findIndex(x => x.f === f); if (i >= 0) { p = L.splice(i, 1)[0]; at = [s, v]; } }));
      const ci = (d.course[n] || []).findIndex(x => x.f === f); if (ci >= 0) { p = d.course[n].splice(ci, 1)[0]; at = ['course']; }
      const bi = (g.book || []).findIndex(x => x.f === f); if (bi >= 0) { p = g.book.splice(bi, 1)[0]; at = ['book']; }
      if (!p) return;
      if (to === 'cmp') (d.cmp = d.cmp || []).push({...p, g: [n]});
      else if (d.gen[to] && at[0] === 'book') (d.gen[to].book = d.gen[to].book || []).push({...p, t: to});
      else if (d.gen[to] && at[0] === 'course') (d.course[to] = d.course[to] || []).push(p);
      else if (d.gen[to]) { const G = d.gen[to], S = G[at[0]] = G[at[0]] || {}; (S[at[1]] = S[at[1]] || []).push(p); }
    }); });
  Object.entries((c && c.genera) || {}).forEach(([n, k]) => {
    const g = d.gen[n]; if (!g) return;
    Object.entries(k.add || {}).forEach(([f, v]) => { const p = ((d.cand || {})[n] || []).find(x => x.f === f); if (p && VIEWS.some(([w]) => w === v)) (g.views[v] = g.views[v] || []).push(p); });
    const hide = new Set(k.hide || []), mv = k.move || {}, feat = k.feat || {};
    const regroup = src => { const out = {}; VIEWS.forEach(([v]) => ((src || {})[v] || []).forEach(p => { if (hide.has(p.f)) return; const w = mv[p.f] || v; (out[w] = out[w] || []).push(p); })); return out; };
    const all = [...allPhotos(g), ...VIEWS.flatMap(([v]) => (g.more || {})[v] || []), ...(d.course[n] || []), ...(g.book || [])];
    // Book photos follow Hide and view moves too (they stay out of g.views, so out of games).
    if (g.book) g.book = g.book.filter(p => !hide.has(p.f)).map(p => mv[p.f] ? {...p, view: mv[p.f]} : p);
    g.views = regroup(g.views); g.more = regroup(g.more);
    // Featured photos lead their view, so quick picks (comparisons, first photo of a view) use them too.
    Object.entries(g.views).forEach(([v, L]) => { const F = feat[v] || []; g.views[v] = [...F.map(f => L.find(p => p.f === f)).filter(Boolean), ...L.filter(p => !F.includes(p.f))]; });
    if (d.course[n]) d.course[n] = d.course[n].filter(p => !hide.has(p.f)).map(p => mv[p.f] ? {...p, v: mv[p.f]} : p);
    if (Object.keys(feat).length) g.feat = feat;
    const cv = k.cover && !hide.has(k.cover) && all.find(p => p.f === k.cover);
    if (cv) g.coverP = cv;
    // Zoom levels per genus (curation lv: 2 | 3, admin switch). 2 levels: the Closer photos join Colony, the Closer
    // view disappears; his Closer picks stay in curation.json, so switching back to 3 restores them.
    if (k.lv === 3) delete g.levels;
    if (k.lv === 2 && g.levels !== 2) {
      g.levels = 2;
      ['views', 'more'].forEach(s => { const S = g[s] || {}; if ((S.medium || []).length) S.wide = [...(S.wide || []), ...S.medium]; delete S.medium; });
      if (d.course[n]) d.course[n] = d.course[n].map(p => p.v === 'medium' ? {...p, v: 'wide'} : p);
      if (g.book) g.book = g.book.map(p => p.view === 'medium' ? {...p, view: 'wide'} : p);
    }
  });
}

// Photo origin filter, set in the header: Dauin only, the Philippines, or everywhere (data: p.loc, set on
// iNaturalist photos; IMR lecture photos have none and always show).
const ORIGIN_OK = {dauin: ['dauin'], ph: ['dauin', 'ph']};
let origin = store.get('imr-coral-origin', 'all');
function filterOrigin(d){
  const ok = ORIGIN_OK[origin]; if (!ok) return;
  // Book photos are not from Dauin or the Philippines.
  Object.values(d.gen).forEach(g => { delete g.book; });
  // A genus with no field photo from the chosen area keeps the nearest ones (Philippines, then everywhere),
  // so games and tools always have a photo to show.
  Object.values(d.gen).forEach(g => {
    const field = Object.values(g.views).flat();
    const area = [ok, ORIGIN_OK.ph, null].find(a => !a || field.some(p => !p.loc || a.includes(p.loc)));
    if (!area) return;
    const keep = p => !p.loc || area.includes(p.loc);
    ['views', 'more'].forEach(k => Object.keys(g[k] || {}).forEach(v => { g[k][v] = g[k][v].filter(keep); }));
    if (g.coverP && !keep(g.coverP)) delete g.coverP;
  });
}
let RAW, CUR, FORMS = {gf: {}, form: {}, cf: {}}, AUTOQ = {}, PICKS = {};
function build(){ const d = structuredClone(RAW); applyCuration(d, CUR); filterOrigin(d); applyForms(d, CUR); applySlots(d, CUR); DATA = d; }
// Photos per context (applySlots). Pierre's rule: every IMR photo and every photo of his own is used, with no cap;
// photos from other iNat observers and approved Coral Finder book photos only fill a set that is short. Per genus
// and view: sheet = 3 featured + the other IMR/own photos (filled up to 6 in all); games = Easy (the featured),
// Medium (other good IMR/own photos, filled up to 4), Hard (poor ones, filled up to 4), levels adding up; Coral
// Finder (needs variety) = featured + 2 photos from other iNat observers + 3 approved book photos. Pierre's picks (feat, hide, quality, use) always win; Claude's suggestions
// (picks.json feat) come next, then quality. curation.json "use" {f: 'ref'|'game'} keeps a photo on the sheet only
// or in games only. Nothing is written back: photos left out simply stay unused.
const CAP = {feat: 3, sheet: 6, medium: 4, hard: 4, inat: 2, book: 3};
// The automatic rating never calls an IMR lecture photo Poor (Pierre: it misjudges slide images); only his own rating can.
const autoQ = f => { const a = AUTOQ[f] || 2; return a === 1 && /^imrl?-/.test(f) ? 2 : a; };
const qualOf = (c, f) => ((c && c.quality) || {})[f] || autoQ(f);
const isCore = p => !!(p.imr || p.own);
function applySlots(d, c){
  const use = (c && c.use) || {}, sug = PICKS.feat || {};
  // k photos from L in order, a different observation each time when possible.
  const take = (L, k) => { const out = [], seen = new Set(); [true, false].forEach(fresh => L.forEach(p => { if (out.length < k && !out.includes(p) && (!fresh || !seen.has(p.o || p.f))) { out.push(p); seen.add(p.o || p.f); } })); return out; };
  const fill = (L, extra, k) => L.length >= k ? L : [...L, ...take(extra.filter(p => !L.includes(p)), k - L.length)];
  Object.entries(d.gen).forEach(([n, g]) => {
    const course = (d.course[n] || []).map(p => ({...p, view: p.v === 'medium' && g.levels === 2 ? 'macro' : p.v}));
    g.sl = {};
    VIEWS.forEach(([v]) => {
      const field = (g.views[v] || []).filter(p => !p.multi), q = p => qualOf(c, p.f), byQ = L => L.slice().sort((a, b) => q(b) - q(a));
      const all = [...field, ...course.filter(p => p.view === v && !p.multi)].filter(p => use[p.f] !== 'game');
      // Sheet order (Pierre): IMR photos first, then his own, then other observers, each by quality; Poor photos last.
      const rr = [...byQ(all.filter(p => p.imr)), ...byQ(all.filter(p => !p.imr && p.own))];
      const others = byQ(all.filter(p => !isCore(p)));
      const ranked = [...rr, ...others].sort((a, b) => (q(a) === 1) - (q(b) === 1));
      const find = f => all.find(p => p.f === f);
      const pin = ((g.feat || {})[v] || []).map(find).filter(Boolean), hint = ((sug[n] || {})[v] || []).map(find).filter(Boolean);
      // Never a Poor photo while better ones exist, except IMR lecture photos (Pierre).
      // Featured = always the first 3 (Pierre): his pinned photos, then the best remaining ones.
      const pool = [...hint, ...ranked].filter(p => !pin.includes(p)), k = CAP.feat - Math.min(pin.length, CAP.feat);
      const feat = [...pin.slice(0, CAP.feat), ...fill(take(pool.filter(p => p.imr || q(p) !== 1), k), pool, k)];
      const more = fill(ranked.filter(p => isCore(p) && !feat.includes(p)), ranked.filter(p => !feat.includes(p)), CAP.sheet - feat.length);
      // Games: field photos only (lecture photos have their own quiz), never multi-coral or book photos.
      const gm = byQ(field.filter(p => use[p.f] !== 'ref')), core = gm.filter(isCore), rest = gm.filter(p => !isCore(p));
      const easy = feat.filter(p => gm.includes(p)), left = p => !easy.includes(p);
      const medium = fill(core.filter(p => left(p) && q(p) >= 2), rest.filter(p => left(p) && q(p) >= 2), CAP.medium);
      const hard = fill(core.filter(p => left(p) && !medium.includes(p)), rest.filter(p => left(p) && !medium.includes(p)).reverse(), CAP.hard);
      const book = (g.book || []).filter(p => p.view === v).slice(0, CAP.book);
      g.sl[v] = {feat, more, easy: easy.length ? easy : take(gm, 3), medium, hard, finder: [...feat, ...take(others.filter(p => !feat.includes(p) && !p.imr), CAP.inat), ...book]};
      // Featured photos lead their view, so every "first photo of the view" (Look-alikes, Compare, Lab, home) uses them.
      if (g.views[v]) g.views[v] = [...feat.filter(p => g.views[v].includes(p)), ...g.views[v].filter(p => !feat.includes(p))];
    });
  });
}
// Game photos of genus n in view v at a level (levels add up: Medium = Easy + Medium photos).
const LEVELS = [['easy', 'Easy'], ['medium', 'Medium'], ['hard', 'Hard']];
const gamePics = (n, v, lvl = 'hard') => { const s = (DATA.gen[n].sl || {})[v]; if (!s) return DATA.gen[n].views[v] || [];
  return LEVELS.slice(0, LEVELS.findIndex(([k]) => k === lvl) + 1).flatMap(([k]) => s[k]); };
// Growth form of each photo: one of the 7 IMR growth forms (forms.json "forms"; x = form not visible) as p.form, and
// p.polyps when polyps or vesicles are extended. Pierre's choice in curation.json "gf" wins over the first guess in
// forms.json "gf", form and polyps flag each on their own ("p" yes, "n" no). Photos not classified yet keep their old
// Coral Finder letter (forms.json / curation.json "form") as p.cf.
let CFMAP = {};
function applyForms(d, c){
  const mine = (c && c.gf) || {}, old = (c && c.form) || {}, L = v => (v || '').replace(/[pn]/g, ''), P = v => (v || '').includes('p') ? true : (v || '').includes('n') ? false : null;
  const set = p => { const m = mine[p.f], g = FORMS.gf[p.f], l = L(m) || L(g), po = P(m) ?? P(g);
    if (l) p.form = l; if (po) p.polyps = true; if (!l && !po) { const o = old[p.f] || FORMS.form[p.f]; if (o) p.cf = o; } };
  Object.values(d.gen).forEach(g => ['views', 'more'].forEach(k => Object.values(g[k] || {}).forEach(L => L.forEach(set))));
  Object.values(d.course || {}).forEach(L => L.forEach(set));
}
// Photos of genus n that can illustrate Coral Finder front-page box id (e.g. 'B'): those whose IMR form maps to it
// (forms.json "cf": Branching = Branching + Tabulate, ...; L = polyps extended), else the old letter. Colony views
// first, then closer views. Never a "form not visible" photo, a multi-coral photo or a Coral Finder book photo.
const formPhotos = (n, id) => { const g = DATA.gen[n], ok = CFMAP[id] || '';
  return [...(g.views.wide || []), ...(g.views.medium || []), ...(DATA.course[n] || []).filter(p => p.v !== 'macro')].filter(p => !p.multi && (ok === 'p' ? p.polyps : p.form ? p.form !== 'x' && ok.includes(p.form) : p.cf === id)); };

// Photos of genus n whose IMR growth form (p.form) is id, colony views first; never multi-coral or book photos.
const imrFormPhotos = (n, id) => { const g = DATA.gen[n];
  return [...(g.views.wide || []), ...(g.views.medium || []), ...(DATA.course[n] || []).filter(p => p.v !== 'macro')].filter(p => !p.multi && p.form === id); };
// IMR growth forms a genus takes (IMR Lecture 6 forms, forms.json "forms"): those seen on its classified photos (one
// photo Pierre or the first guess is sure of, or two unsure ones), plus those the Coral Finder front page gives it
// (forms.json "cf" maps each front-page box to IMR forms; Meandering, which maps to every form, is left out).
const imrFormsOf = n => { const g = DATA.gen[n], cnt = {}, sure = {};
  [...Object.values(g.views).flat(), ...(DATA.course[n] || [])].forEach(p => { if (!p.form || p.form === 'x' || p.multi) return; cnt[p.form] = (cnt[p.form] || 0) + 1; if (!(FORMS.gunsure || {})[p.f]) sure[p.form] = 1; });
  const seen = Object.keys(cnt).filter(k => sure[k] || cnt[k] >= 2);
  // A box that maps to several forms (Branching = Branching or Tabulate) only counts for a genus with no classified photo.
  const cf = DATA.key.filter(k => k.id !== 'M' && k.leaves.some(l => l.g.includes(n))).map(k => (CFMAP[k.id] || '').replace('p', '')).filter(m => m.length === 1 || !seen.length).flatMap(m => [...m]);
  return [...new Set([...seen, ...cf])]; };

/* ---------- shared bits ---------- */
// Genera in IMR slate order (data.json lists them that way, starred genera last).
const slateIdx = n => Object.keys(DATA.gen).indexOf(n);
const bySlate = L => Object.keys(DATA.gen).filter(n => L.includes(n));
// group=true marks the card with its IMR confusion group (strip and tag); 'stripe' draws the strip only.
function card(name, group){
  const g = DATA.gen[name], p = cover(g), ig = (group === true || group === 'stripe') && g.ig ? DATA.imrg.find(x => x.n === g.ig) : null;
  const im = p ? `<img class="ph" src="${img(p, 's')}" srcset="${srcset(p)}" data-sz="card" sizes="${sizesFor('card')}" alt="${esc(name)}" loading="lazy">` : `<span class="ph none">no photo</span>`;
  return `<a class="card${ig ? ' grp' : ''}" href="#g-${esc(name)}"${ig ? ` style="--g:${groupHue(ig.n)}"` : ''}>${im}${ig && group === true ? `<span class="ig" title="IMR confusion group ${ig.n}: ${esc(ig.t)}">Group ${ig.n}</span>` : ''}<span class="cap"><i>${esc(name)}</i><small>${g.n ? 'No. ' + g.n + ' · ' : g.ig || !starNote(name) ? '<b class="star">★ not surveyed</b> · ' : `<b class="star">${starNote(name)}</b> · `}${esc(g.fam)}</small><p>${esc(tipsText(g))}</p></span></a>`;
}
function bindCards(root = $v){ root.querySelectorAll('[data-g]').forEach(b => b.onclick = () => go('g-' + b.dataset.g)); }
function bindGo(root = $v){ root.querySelectorAll('[data-go]').forEach(b => b.onclick = () => go(b.dataset.go)); }

// Full-size viewer shared by every page. opts.blind() true = quiz before answering: hide genus, credit and source links.
const lb = document.getElementById('lightbox');
const VIEW_LABEL = {wide: 'Colony', medium: 'Closer', macro: 'Corallites', close: 'Close-up'};
function zoom(list, i, opts = {}){
  const blind = () => opts.blind ? opts.blind() : false;
  const show = () => {
    const p = list[i], hide = blind(), vl = p.view ? (VIEWS.find(v => v[0] === p.view) || [0, VIEW_LABEL[p.view]])[1] : '';
    const cap = hide ? esc(vl || 'Photo') : `${p.genus ? `<b><i>${esc(p.genus)}</i></b> · ` : ''}${vl ? esc(vl) + ' · ' : ''}${credit(p)}${p.src ? ` · <a href="${esc(p.src)}" target="_blank" rel="noopener">original</a>` : ''}`;
    lb.innerHTML = `<div class="lb-in"><img src="${img(p)}" alt="${hide ? 'Coral to identify' : esc(p.t || '')}" title="Click for actual size"><p class="lb-cap">${cap}</p>
      <div class="lb-nav">${list.length > 1 ? `<button type="button" data-d="-1" aria-label="Previous photo">‹</button><span>${i + 1} / ${list.length}</span><button type="button" data-d="1" aria-label="Next photo">›</button>` : ''}<button type="button" data-x aria-label="Close">Close</button></div></div>`;
    lb.classList.remove('full');
    lb.querySelector('.lb-in img').onclick = e => { e.stopPropagation(); lb.classList.toggle('full'); };
    lb.querySelectorAll('[data-d]').forEach(b => b.onclick = e => { e.stopPropagation(); step(Number(b.dataset.d)); });
    lb.querySelector('[data-x]').onclick = close;
    lb.querySelector('[data-x]').focus({preventScroll: true});
  };
  const step = d => { i = (i + d + list.length) % list.length; show(); };
  const back = document.activeElement;
  const close = () => { lb.hidden = true; lb.innerHTML = ''; lb.classList.remove('full'); document.removeEventListener('keydown', key); if (back && back.focus) back.focus({preventScroll: true}); };
  const key = e => { if (e.key === 'Escape') close(); if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') step(e.key === 'ArrowRight' ? 1 : -1); };
  // Swipe left/right between photos (single finger only, so pinch-zoom still works).
  let x0 = null;
  lb.ontouchstart = e => { x0 = e.touches.length === 1 && !lb.classList.contains('full') ? e.touches[0].clientX : null; };
  lb.ontouchend = e => { if (x0 === null || list.length < 2) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1); x0 = null; };
  lb.hidden = false; lb.onclick = e => { if (e.target === lb) close(); };
  document.addEventListener('keydown', key);
  show();
}

/* ---------- IMR ID tips ---------- */
// Two levels. ID tips (g.qt, tools/id_tips.txt): 2-3 short cues per genus condensed from the lecture, shown
// everywhere a tip appears (quiz, cards, ID tips page, comparisons, genus sheet). Lecture notes (g.imr): the
// lecturers' full cues (slide text, review slides, presenter's notes), only on the genus sheet.
const slideRef = (k, L) => L && L.length ? `${k} ${L.join(', ')}` : k;
// Content only: the "Review slide: " / "Instructor's notes: " prefixes in data.json are not shown.
const noteText = x => x.replace(/^(Review slide|Instructor's notes): /, '');
// Full lecture notes for the genus sheet.
const notesList = (g, cls = '') => g.imr.length ? `<ul class="crit idtips${cls ? ' ' + cls : ''}">${g.imr.map(x => `<li>${gloss(noteText(x))}</li>`).join('')}</ul><p class="tref">IMR Lecture 6${g.sl && g.sl.length ? ', ' + slideRef(g.sl.length > 1 ? 'slides' : 'slide', g.sl) : ''}</p>` : `<p class="note">Not on the lecture slides: see the Coral Finder below.</p>`;
// Glossary terms in tips and lecture notes: tap (or focus + Enter) to see the definition and its source.
// Very common words (wall, corallite, mouth) are left plain. Matching patterns per glossary term:
const GLOSS_PAT = {'Septo-costae': 'septo-costae', 'Septa': 'septa', 'Costae': 'costae', 'Coenosteum': 'coenosteum', 'Paliform lobes': 'paliform lobes?',
  'Axial corallite': 'axial corallites?', 'Verrucae': 'verrucae', 'Hooded corallites': 'hooded', 'Extra-tentacular budding': 'extra-tentacular(?: budding)?',
  'Intra-tentacular budding': 'intra-tentacular(?: budding)?', 'Monticules': 'monticules?', 'Vesicles': 'vesicles?'};
let glossRe = null;
function gloss(text){
  const t = esc(text);
  if (!DATA.terms) return t;
  if (!glossRe) { const keys = DATA.terms.map(x => x[0]).filter(k => GLOSS_PAT[k]); glossRe = keys.length ? {keys, re: new RegExp('\\b(?:' + keys.map(k => '(' + GLOSS_PAT[k] + ')').join('|') + ')\\b', 'gi')} : {re: null}; }
  if (!glossRe.re) return t;
  return t.replace(glossRe.re, (m, ...g) => { const k = glossRe.keys[g.slice(0, glossRe.keys.length).findIndex(x => x !== undefined)]; return k ? `<span class="gt" tabindex="0" role="button" data-gt="${esc(k)}">${m}</span>` : m; });
}
const $gpop = document.createElement('div'); $gpop.className = 'gpop'; $gpop.hidden = true; $gpop.setAttribute('role', 'tooltip'); document.body.appendChild($gpop);
function showGloss(el){
  const t = DATA.terms.find(x => x[0] === el.dataset.gt); if (!t) return;
  $gpop.innerHTML = `<b>${esc(t[0])}</b> ${esc(t[1])}${t[2] ? ` <small>${esc(t[2])}</small>` : ''}`; $gpop.hidden = false;
  const r = el.getBoundingClientRect(), w = Math.min(320, innerWidth - 24);
  $gpop.style.width = w + 'px'; $gpop.style.left = Math.max(12, Math.min(r.left, innerWidth - w - 12)) + 'px';
  const below = r.bottom + 8, h = $gpop.offsetHeight; $gpop.style.top = (below + h > innerHeight - 8 ? r.top - h - 8 : below) + 'px';
}
document.addEventListener('click', e => { const g = e.target.closest && e.target.closest('.gt'); if (g) { e.preventDefault(); e.stopPropagation(); showGloss(g); } else if (!e.target.closest('.gpop')) $gpop.hidden = true; }, true);
document.addEventListener('keydown', e => { if (e.key === 'Escape') $gpop.hidden = true; else if (e.key === 'Enter' && e.target.classList && e.target.classList.contains('gt')) showGloss(e.target); });
addEventListener('scroll', () => { $gpop.hidden = true; }, true);
// Short ID tips; genera the lecture skips fall back to the Coral Finder summary.
const tipsList = (g, cls = '') => g.qt ? `<ul class="crit idtips${cls ? ' ' + cls : ''}">${g.qt.map(x => `<li>${gloss(x)}</li>`).join('')}</ul>` : `<p class="keyid">${gloss(g.sum)}</p>`;
const tipsText = g => g.qt ? g.qt.join(' · ') : g.sum;
// The ID tips view of the Genera page: the 4 lecture questions and the glossary on top, then 2-3 short cues per genus.
const tipsHead = () => `<div class="tiphead"><ol class="qtiles" aria-label="IMR Lecture 6: questions to ask">${DATA.tips.map(t => `<li>${esc(t)}</li>`).join('')}</ol>
  <details class="gloss"><summary>Coral anatomy terms</summary><a class="glink" href="#lab-anatomy"><span class="hpv art">${window.homeArt ? homeArt('anatomy') : ''}</span><span><b>Corallite anatomy</b><small>Explore the parts of a corallite on a diagram ›</small></span></a><dl>${DATA.terms.map(([t, d, src]) => `<dt>${esc(t)}</dt><dd>${esc(d)}${src ? ` <small class="src">${esc(src)}</small>` : ''}</dd>`).join('')}</dl><p class="note">Wording from IMR Lecture 6 where the lecture defines the term; otherwise the <a href="https://www.coralsoftheworld.org/page/glossary/" target="_blank" rel="noopener">Corals of the World glossary</a>.</p></details></div>`;
const tipCard = n => { const g = DATA.gen[n], p = cover(g); return `<article class="tipg"><a href="#g-${esc(n)}" class="tipph">${p ? `<img src="${img(p, 's')}" alt="${esc(n)}" loading="lazy">` : ''}<i>${esc(n)}</i></a><div>${tipsList(g)}${lookOf(n).length ? `<p class="note">Don't confuse with ${lookOf(n).map(b => `<a href="#cmp-${esc(n)}|${esc(b)}"><i>${esc(b)}</i></a>`).join(', ')}</p>` : ''}</div></article>`; };

/* ---------- genera ---------- */
let azFam = null, azQ = '';
// Genera order: 'lecture' (IMR Lecture 6 groups, default) or 'slate' (numbers on the IMR slate).
let azOrder = (() => { try { return localStorage.getItem('imr-coral-order') || 'lecture'; } catch (e) { return 'lecture'; } })();
// Genera view: 'photos' (cards) or 'tips' (the ID tips list, formerly its own page).
let azView = (() => { try { return localStorage.getItem('imr-coral-gview') || 'photos'; } catch (e) { return 'photos'; } })();
function viewGenera(){
  const fams = [...new Set(Object.values(DATA.gen).map(g => g.fam))].sort();
  $v.innerHTML = `<h2>The 39 genera on the IMR slate</h2>
  <p class="lede">34 surveyed genera plus 5 starred ones (★) to recognise and rule out. Colours mark the confusion groups from the IMR lecture: genera in the same group are the ones to tell apart. Switch to <b>ID tips</b> for the 4 questions to ask and the lecturers' short cues for each genus.</p>
  <div class="tools"><input id="q" type="search" placeholder="Search a genus or a feature" value="${esc(azQ)}" aria-label="Search">
    <select id="fam" aria-label="Family"><option value="">All families</option><option value="★"${azFam === '★' ? ' selected' : ''}>★ Not surveyed</option>${fams.map(f => `<option${azFam === f ? ' selected' : ''}>${esc(f)}</option>`).join('')}</select>
    <div class="seg" role="group" aria-label="View">${[['photos', 'Photos'], ['tips', 'ID tips']].map(([k, t]) => `<button type="button" data-gv="${k}" aria-pressed="${azView === k}">${t}</button>`).join('')}</div>
    <div class="seg" role="group" aria-label="Order">${[['lecture', 'Lecture', ' groups'], ['slate', 'Slate', ' numbers']].map(([k, t, x]) => `<button type="button" data-o="${k}" aria-pressed="${azOrder === k}">${t}<span class="wide">${x}</span></button>`).join('')}</div></div>
  ${azView === 'tips' ? tipsHead() : ''}${azOrder === 'lecture' ? `<div class="chips tipgr gjump"><span class="label">IMR group</span>${DATA.imrg.map(x => `<button type="button" class="chip gchip" style="--g:${groupHue(x.n)}" data-jump="${x.n}" title="${esc(x.t)}">${x.n}</button>`).join('')}</div>` : ''}<div class="${azView === 'tips' ? 'tiplist' : 'grid'}" id="azgrid"></div>`;
  const draw = () => {
    const q = azQ.toLowerCase(), tips = azView === 'tips';
    const names = Object.keys(DATA.gen).filter(n => (!azFam || DATA.gen[n].fam === azFam || (azFam === '★' && !DATA.gen[n].n)) && (!q || (n + ' ' + DATA.gen[n].crit.join(' ') + ' ' + DATA.gen[n].imr.join(' ')).toLowerCase().includes(q)));
    let html;
    if (azOrder === 'lecture') {
      const gi = n => shownGroup(n) || 99;
      names.sort((a, b) => gi(a) - gi(b) || slateIdx(a) - slateIdx(b));
      html = names.map((n, i) => { const k = shownGroup(n), gr = DATA.imrg.find(x => x.n === k);
        const head = i && gi(names[i - 1]) === gi(n) ? '' : gr
          ? `<h3 class="gdiv" id="grp-${gr.n}" style="--g:${groupHue(gr.n)}"><span class="gn">${gr.n}</span>${esc(gr.t)}</h3>`
          : '<h3 class="gdiv"><span class="gn">★</span>Not covered in the lecture</h3>';
        return head + (tips ? tipCard(n) : card(n, 'stripe')); }).join('');
    } else html = names.map(n => tips ? tipCard(n) : card(n, true)).join('');
    document.getElementById('azgrid').innerHTML = html || '<p class="note">No genus matches.</p>';
    bindCards();
  };
  const qi = document.getElementById('q');
  qi.oninput = () => { azQ = qi.value; draw(); };
  document.getElementById('fam').onchange = e => { azFam = e.target.value || null; draw(); };
  $v.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { azOrder = b.dataset.o; try { localStorage.setItem('imr-coral-order', azOrder); } catch (e) {} viewGenera(); });
  // Group index: jump to a lecture group (a button, not a link: the hash is the page route).
  $v.querySelectorAll('[data-jump]').forEach(b => b.onclick = () => { const h = document.getElementById('grp-' + b.dataset.jump); if (h) h.scrollIntoView({behavior: 'smooth', block: 'start'}); });
  $v.querySelectorAll('[data-gv]').forEach(b => b.onclick = () => { azView = b.dataset.gv; try { localStorage.setItem('imr-coral-gview', azView); } catch (e) {} viewGenera(); pageHelp(); });
  draw();
}

function viewGenus(name){
  const g = DATA.gen[name];
  if (!g) return viewGenera();
  const paths = DATA.key.flatMap(k => k.leaves.filter(l => l.g.includes(name)).map(l => ({k, l})));
  // Each view row shows the sheet set (applySlots): 3 featured, then the other IMR and Pierre's photos behind a fold.
  const inView = v => { const s = (g.sl || {})[v]; return s ? [...s.feat, ...s.more] : []; };
  const flat = VIEWS.flatMap(([v]) => inView(v).map(p => ({...p, genus: name, view: g.levels === 2 && v === 'macro' ? 'close' : v})));
  const cv = cover(g), ci = cv ? flat.findIndex(x => x.f === cv.f) : -1;
  const rows = VIEWS.filter(([v]) => !(g.levels === 2 && !inView(v).length)).map(([v, label]) => {
    const list = inView(v);
    if (g.levels === 2 && v === 'macro') label = 'Close-up';
    const fig = p => { const i = flat.findIndex(x => x.f === p.f);
      return `<figure><button type="button" class="zoom" data-z="${i}"><img src="${img(p, 's')}" srcset="${srcset(p)}" data-sz="strip" sizes="${sizesFor('strip')}" alt="${esc(name)}, ${p.imr ? 'IMR lecture photo' : label.toLowerCase() + ' view'}" loading="lazy"></button><figcaption>${p.imr ? '<b class="lect">IMR lecture</b> ' : ''}${credit(p)}</figcaption></figure>`; };
    // The cover is already shown at the top: not repeated in its row when the row has other featured photos.
    const feat0 = g.sl[v].feat, feat = cv && feat0.length > 1 ? feat0.filter(p => p.f !== cv.f) : feat0, more = g.sl[v].more;
    return `<section class="vrow"><h3>${label}${feat.length ? '' : ' <span class="gap">missing</span>'}</h3>${feat.length ? `<div class="strip">${feat.map(fig).join('')}</div>` : '<p class="note">No good photo yet for this view.</p>'}
      ${more.length ? `<details class="more"><summary>${more.length} more ${label.toLowerCase()} photo${more.length > 1 ? 's' : ''}</summary><div class="strip">${more.map(fig).join('')}</div></details>` : ''}</section>`;
  }).join('');
  // Coral Finder text: visible for genera the lecture skips, otherwise folded under "More details" with sources and key.
  const cfList = `<h3>Coral Finder features</h3><ul class="crit">${g.crit.map(c => `<li>${esc(c)}</li>`).join('')}</ul>`;
  // Name, slate number and family sit in the sticky header bar (ctxBar), not here.
  $v.innerHTML = `<article class="sheet">
    ${g.imr.length ? '' : `<p class="lede keyid">${esc(g.sum)}</p>`}
    ${g.n ? '' : `<p class="warn"><b>★ Not surveyed by IMR.</b> It is on the slate so you don't mistake it for ${g.look.filter(n => DATA.gen[n].n).map(n => '<i>' + esc(n) + '</i>').join(', ')}, so you need to recognise it and set it aside.</p>`}
    <div class="hero">
      ${cv ? `<button type="button" class="zoom hero-ph" data-z="${ci}"><img src="${img(cv)}" alt="${esc(name)}"></button>` : ''}
      <div class="idbox">
        ${g.imr.length || g.mn ? `<div class="tipbox">${g.imr.length ? `<h3>ID tips (IMR) <span class="pg">group ${g.ig}: ${esc(DATA.imrg[g.ig - 1].t)}</span></h3>${tipsList(g)}` : ''}${g.mn ? `<p class="mn"><b>Mnemonic:</b> ${esc(g.mn)}</p>` : ''}</div>` : ''}
        ${g.imr.length ? `<div class="lnotes"><h3>IMR lecture notes</h3>${notesList(g)}</div>` : ''}
        ${g.imr.length ? '' : cfList}
        <details class="more sheetmore"><summary>More details</summary>
        ${g.imr.length ? cfList : ''}
        ${g.check ? `<p class="note check"><b>To check with an IMR trainer:</b> ${esc(g.check)}</p>` : ''}
        ${g.info ? `<div class="note osrc"><b>Other sources:</b><ul class="srcs">${g.info.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
        <h3>In the key <span class="pg">Coral Finder p. ${g.pages.join(', ')}</span></h3><div class="kpick">${paths.map(({k, l}) => `<a class="c-${k.color}" href="#l-${l.id}">${esc(k.name)} › ${esc(leafLabel(l))}</a>`).join('')}</div>
        <p class="note refs"><b>References:</b> ${g.imr.length ? 'IMR Lecture 6 · ' : ''}Coral Finder 2022 (R. Kelley) p. ${g.pages.join(', ')} · <a href="https://www.marinespecies.org/aphia.php?p=taxlist&amp;tName=${encodeURIComponent(name)}" target="_blank" rel="noopener">WoRMS</a> · <a href="https://www.inaturalist.org/taxa/search?q=${encodeURIComponent(name)}" target="_blank" rel="noopener">iNaturalist</a></p>
        </details>
      </div>
    </div>
    ${rows}
    <section class="hubsec">${lookHub(name)}</section>
  </article>`;
  $v.querySelectorAll('[data-z]').forEach(b => b.onclick = () => zoom(flat, Number(b.dataset.z)));
  $v.querySelectorAll('[data-cmp]').forEach(b => b.onclick = () => go('cmp-' + name + '|' + b.dataset.cmp));
  bindGo();
  const hub = $v.querySelector('.hubsec'), redraw = () => { hub.innerHTML = lookHub(name); bindViewSeg(redraw); };
  bindViewSeg(redraw);
}

/* ---------- compare ---------- */
// Look-alikes of a genus, whichever genus listed the other (the Coral Finder lists are not symmetric).
const lookOf = n => Object.keys(DATA.gen).filter(b => b !== n && (DATA.gen[n].look.includes(b) || DATA.gen[b].look.includes(n)));
// Photo of a genus in a given view, falling back to the close-up then the cover.
function viewShot(n, v){ const g = DATA.gen[n], L = g.views[v] && g.views[v].length ? g.views[v] : g.views.macro && g.views.macro.length ? g.views.macro : null, p = L ? L[0] : cover(g);
  return p ? `<img src="${img(p, 's')}" srcset="${srcset(p)}" data-sz="card" sizes="${sizesFor('card')}" alt="${esc(n)}" loading="lazy">` : '<span class="none">no photo</span>'; }
const mixedUp = (a, b) => ((P[a] && P[a].conf && P[a].conf[b]) || 0) + ((P[b] && P[b].conf && P[b].conf[a]) || 0);
let cmpView = store.get('imr-coral-cmpview', 'medium');
const viewSeg = () => `<div class="seg" role="group" aria-label="View">${VIEWS.map(([v, t]) => `<button type="button" data-cv="${v}" aria-pressed="${cmpView === v}">${t}</button>`).join('')}</div>`;
const bindViewSeg = redraw => $v.querySelectorAll('[data-cv]').forEach(b => b.onclick = () => { cmpView = b.dataset.cv; store.set('imr-coral-cmpview', cmpView); redraw(); });
// IMR lecture images that compare look-alikes side by side (data.json cmp), for the given genera.
// Course comparison images: small thumbnails that open the shared viewer.
const cmpShots = L => { const C = (DATA.cmp || []).filter(c => c.g.some(n => L.includes(n))); return C.length ? `<div class="lcmps">${C.map(c =>
  `<figure class="lcmp"><a href="${img(c)}" data-cmp="${DATA.cmp.indexOf(c)}"><img src="${img(c, 's')}" alt="Look-alike comparison: ${esc(c.g.join(', '))}" loading="lazy"></a><figcaption>${c.imr ? `<b class="lect">IMR lecture</b>${c.slide ? ` slide ${c.slide}` : ''}` : credit(c)}${c.cap ? ': ' + esc(c.cap) : ''}</figcaption></figure>`).join('')}</div>` : ''; };
document.addEventListener('click', e => { const a = e.target.closest('[data-cmp]'); if (!a) return; e.preventDefault(); zoom([DATA.cmp[+a.dataset.cmp]], 0); });
// Bottom of a genus sheet: the genus and each of its look-alikes at the same size and in the same view,
// each with its deciding feature and a link to the side-by-side comparison.
function lookHub(name){
  const L = lookOf(name).sort((a, b) => mixedUp(name, b) - mixedUp(name, a));
  return `<h3>Don't confuse with</h3>
    <div class="seg-row"><span class="label">Show</span>${viewSeg()}</div>
    <div class="lrow"><div class="lt self">${viewShot(name, cmpView)}<span><i>${esc(name)}</i><small>this genus</small><span class="psum">${esc(tipsText(DATA.gen[name]))}</span></span></div>
    ${L.map(n => { const m = mixedUp(name, n); return `<a class="lt" href="#cmp-${esc(name)}|${esc(n)}">${m ? `<span class="pmix">you mixed them up ×${m}</span>` : ''}${viewShot(n, cmpView)}<span><i>${esc(n)}</i><span class="psum">${esc(tipsText(DATA.gen[n]))}</span>${(DATA.gen[name].lsrc || {})[n] ? `<small class="lsrc">${esc(DATA.gen[name].lsrc[n])}</small>` : ''}<b class="cmpgo">Compare side by side →</b></span></a>`; }).join('')}</div>
    ${cmpShots([name])}`;
}
// Starred genera are on the slate as look-alikes of surveyed genera. Those the lecture doesn't group are shown
// in the lecture group most of their Coral Finder look-alikes belong to (ties: the first listed look-alike).
function shownGroup(n){
  const g = DATA.gen[n]; if (g.ig) return g.ig;
  const L = g.look.filter(b => DATA.gen[b] && DATA.gen[b].ig), c = {};
  L.forEach(b => c[DATA.gen[b].ig] = (c[DATA.gen[b].ig] || 0) + 1);
  return L.reduce((best, b) => c[DATA.gen[b].ig] > c[best] ? DATA.gen[b].ig : best, L.length ? DATA.gen[L[0]].ig : 0) || 0;
}
const starNote = n => { const g = DATA.gen[n]; if (g.n) return ''; const k = shownGroup(n), L = g.look.filter(b => DATA.gen[b] && DATA.gen[b].ig === k);
  return L.length ? `★ look-alike of ${L.map(b => `<i>${esc(b)}</i>`).join(', ')}` : ''; };
function pairs(){
  const seen = new Set(), out = [];
  Object.keys(DATA.gen).forEach(a => DATA.gen[a].look.forEach(b => { const k = [a, b].sort().join('|'); if (DATA.gen[b] && !seen.has(k)) { seen.add(k); out.push(k.split('|')); } }));
  return out;
}
// Look-alikes page: the list of look-alike pairs (Coral Finder look-alikes), nothing else. Each pair is one card:
// the two genera at the same size and in the same view, with their short ID tips, opening the side-by-side page.
// Pairs sit under the lowest IMR lecture group of their two genera; the reader's quiz mix-ups come first.
function viewCompareList(){
  const G = DATA.gen, gi = n => shownGroup(n) || 99, all = pairs().map(p => bySlate(p));
  const card = ([a, b]) => { const m = mixedUp(a, b), lect = (DATA.cmp || []).find(c => c.imr && c.g.includes(a) && c.g.includes(b));
    const side = n => `<div class="lpside">${viewShot(n, cmpView)}<i>${esc(n)}</i><span class="psum">${esc(tipsText(G[n]))}</span></div>`;
    return `<a class="lpair${m ? ' mix' : ''}" href="#cmp-${esc(a)}|${esc(b)}">${m ? `<span class="pmix">you mixed them up ×${m}</span>` : ''}<div class="lpsides">${side(a)}${side(b)}</div>${lect ? `<small class="lplect"><b class="lect">IMR lecture</b> slide ${lect.slide}: comparison on the side-by-side page</small>` : ''}</a>`; };
  const order = (x, y) => mixedUp(...y) - mixedUp(...x) || (gi(x[0]) === gi(x[1]) ? 0 : 1) - (gi(y[0]) === gi(y[1]) ? 0 : 1);
  const groups = [...new Set(all.map(p => Math.min(gi(p[0]), gi(p[1]))))].sort((a, b) => a - b);
  $v.innerHTML = `<h2>Look-alikes</h2>
  <p class="lede">Every pair of genera that are easy to confuse (the Coral Finder look-alikes), in the same view and at the same size, with the IMR ID tips that tell them apart. Open a pair to compare all three views side by side. Pairs you mixed up in the quiz come first.</p>
  <div class="seg-row"><span class="label">Show</span>${viewSeg()}</div>
  ${groups.map(k => { const gr = DATA.imrg.find(x => x.n === k), L = all.filter(p => Math.min(gi(p[0]), gi(p[1])) === k).sort(order);
    return `<section class="lpgrp"><h3 class="gdiv" style="--g:${gr ? groupHue(gr.n) : 200}"><span class="gn">${gr ? gr.n : '★'}</span> ${gr ? esc(gr.t) : 'Not covered in the lecture'}</h3><div class="lpairs2">${L.map(card).join('')}</div></section>`; }).join('')}`;
  bindViewSeg(() => { const y = window.scrollY; viewCompareList(); window.scrollTo(0, y); });
}
function viewCompare(a, b){
  const A = DATA.gen[a], B = DATA.gen[b];
  if (!A || !B) return viewCompareList();
  const col = (n, g) => `<div class="cmpcol"><h3><a class="linkish" href="#g-${esc(n)}"><i>${esc(n)}</i></a>${g.n ? '' : ' ★'}</h3><p class="note">${esc(g.fam)}${g.ig ? ' · IMR group ' + g.ig : ''}</p>${g.qt ? '<h4>ID tips (IMR)</h4>' : ''}${tipsList(g)}<details class="more"><summary>Coral Finder</summary><ul class="crit">${g.crit.map(c => `<li>${esc(c)}</li>`).join('')}</ul></details></div>`;
  const flat = [];
  const row = ([v, label]) => {
    const cell = (n, g) => { const p = (g.views[v] || [])[0]; if (!p) return `<div class="cmpph none">${g.levels === 2 ? 'no separate level' : 'no photo'}</div>`; flat.push({...p, genus: n, view: v}); return `<button type="button" class="zoom cmpph" data-z="${flat.length - 1}"><img src="${img(p, 's')}" srcset="${srcset(p)}" sizes="(max-width:700px) 46vw, 460px" alt="${esc(n)}, ${label.toLowerCase()}" loading="lazy"></button>`; };
    return `<h3 class="cmplab">${label}</h3><div class="cmprow">${cell(a, A)}${cell(b, B)}</div>`;
  };
  // The cues sit above the photos, each under its genus, so they can be read while comparing.
  $v.innerHTML = `<div class="cmprow text">${col(a, A)}${col(b, B)}</div>
  ${VIEWS.filter(([v]) => (A.views[v] || []).length || (B.views[v] || []).length).map(row).join('')}
  ${(DATA.cmp || []).some(c => c.imr && c.g.includes(a) && c.g.includes(b)) ? `<h3 class="cmplab">IMR lecture</h3>${cmpShots([a, b])}` : ''}
  <p><a class="next" href="#quiz-duel|${esc(a)}|${esc(b)}">Drill this pair</a></p>`;
  $v.querySelectorAll('[data-z]').forEach(x => x.onclick = () => zoom(flat, Number(x.dataset.z)));
  bindCards(); bindGo();
}

/* ---------- key helpers (Coral Finder boxes, used by genus sheets and the Coral Finder) + IMR groups ---------- */
const groupOf = id => DATA.key.find(g => g.id === id[0]);
const leafOf = id => groupOf(id)?.leaves.find(l => l.id === id);
const pg = l => l.a === l.b ? 'p.' + l.a : 'p.' + l.a + '-' + l.b;
const leafLabel = l => l.t + (l.s ? ' · ' + l.s : '');

/* ---------- quiz ---------- */
// Progress per genus {ok, ko, streak, conf}, kept in this browser only.
let P = store.get('imr-coral-progress', {}) || {};
const save = () => { store.set('imr-coral-progress', P); showProg(); syncSoon(); };
const st = n => P[n] || (P[n] = {ok: 0, ko: 0, streak: 0});
const Q = Object.assign({view: 'any', level: 'auto'}, store.get('imr-coral-quiz', {}), {stars: true});  // starred genera are always asked (Pierre)
if (Q.lvv !== 3) { Q.level = 'auto'; Q.course = false; Q.lvv = 3; }  // Auto only: no level selector, no Lecture set (Pierre, 2026-10-31)
const saveQ = () => store.set('imr-coral-quiz', Q);
let session = {ok: 0, n: 0}, last = null, duelPair = null;
const pool = () => Object.keys(DATA.gen).filter(n => (Q.stars || DATA.gen[n].n) && photoSet(n).shown.length);
// A quiz question always shows one colony view and one closer view; the corallites come as a hint.
// Quiz views come from one observation (same colony) whenever possible: pick at random among
// the observations covering the most views, and fill any missing view from another observation.
function photoSet(n){
  const g = DATA.gen[n], two = g.levels === 2, need = two ? ['wide', 'macro'] : ['wide', 'medium', 'macro'];
  const obs = {};
  // The Colony slot never gets a photo whose growth form is "x" (too close to see it): that is a close-up.
  const ok = v => p => v !== 'wide' || p.form !== 'x';
  const pics = v => { if (Q.level !== 'auto') return gamePics(n, v, Q.level).filter(ok(v));
    // Auto: the photos of the genus's own level first, then the easier ones, then any.
    const k = LEVELS[autoLvl(n)][0], s = (DATA.gen[n].sl || {})[v], own = s ? (s[k] || []).filter(ok(v)) : [];
    return own.length ? own : gamePics(n, v, k).filter(ok(v)).length ? gamePics(n, v, k).filter(ok(v)) : gamePics(n, v, 'hard').filter(ok(v)); };
  need.forEach(v => pics(v).forEach(p => { const k = p.o || p.f; (obs[k] = obs[k] || {})[v] = (obs[k][v] || []).concat([p]); }));
  const groups = Object.values(obs), cov = o => need.filter(v => o[v]).length, best = Math.max(0, ...groups.map(cov));
  const o = best ? pick(groups.filter(x => cov(x) === best)) : {};
  const one = v => { const L = o[v] || pics(v); return L.length ? {...pick(L), view: v} : null; };
  // Two-level genera (e.g. Plerogyra, mushroom corals) show colony + close-up, with no hint.
  if (two) { const m = one('macro'); return {shown: [one('wide'), m && {...m, view: 'close'}].filter(Boolean), hint: null}; }
  return {shown: [one('wide'), one('medium')].filter(Boolean), hint: one('macro')};
}
// Which genus to ask next (Pierre: spread the work, target what is not seen or not mastered yet, keep some chance).
// Weight by status and by how unsure the knowledge model still is (BKT, 1 - L): review 3-5, learning 1-4,
// learned 0.25 (unseen 10, so every genus comes up early). A genus asked in the last 4 questions is mostly held back so the work spreads across genera.
let lastQs = [];
const weight = n => { const lv = level(n)[0], u = 1 - knownP(n), w = lv === 'new' ? 10 : lv === 'ok' ? 0.25 : lv === 'weak' ? 3 + 2 * u : 1 + 3 * u; return lastQs.includes(n) ? w * 0.1 : w; };
function weighted(list){ const w = list.map(weight), t = w.reduce((a, b) => a + b, 0); let r = Math.random() * t; for (let i = 0; i < list.length; i++) { r -= w[i]; if (r <= 0) return list[i]; } return list[list.length - 1]; }
function nextTarget(list){ let n, k = 0; do { n = weighted(list); } while (n === last && list.length > 1 && ++k < 10); last = n; lastQs = [...lastQs, n].slice(-4); return n; }
// Adaptive photo level (Pierre, 2026-10-31; no time criteria, reachable in one sitting). Each genus has its own photo
// level (s.lv: 0 Easy, 1 Medium, 2 Hard), used by the Auto photo set. It starts at Easy; 2 right answers in a row at
// that level or above move it up one level; a mistake moves it down one (naming the genus wrongly counts as a mistake
// for it too). A right answer counts at the level of the hardest photo shown, so forced sets count as well.
const RECENT = 10, UP_RUN = 2;
const recent = n => { const s = P[n] || {}; return s.h ? s.h.slice(-RECENT) : ''; };
const misses = h => [...h].filter(x => x === '0').length;
const hasDuel = n => DATA.gen[n].look.some(b => DATA.gen[b]);
// Top level of a genus: its hardest game set that has photos (some genera have no Hard photos: then Medium is the top).
const topLvl = n => { const sl = DATA.gen[n].sl || {}; let m = 0; Object.keys(sl).forEach(v => [1, 2].forEach(i => { if ((sl[v][LEVELS[i][0]] || []).length) m = Math.max(m, i); })); return m; };
const autoLvl = n => Math.min(topLvl(n), Math.max(0, (P[n] || {}).lv || 0));
// Level of a game photo of genus n: the game set (Easy/Medium/Hard) it belongs to; lecture or unlisted photos = Easy.
function photoLvl(n, p){ const sl = DATA.gen[n].sl || {}; for (const v of Object.keys(sl)) for (let i = 2; i >= 0; i--) if ((sl[v][LEVELS[i][0]] || []).some(x => x.f === p.f)) return i; return 0; }
function stepLvl(n, s, good, qlv){
  const top = topLvl(n);
  if (good) { if (qlv >= Math.min(s.lv || 0, top)) { s.run = (s.run || 0) + 1; if (s.run >= UP_RUN && (s.lv || 0) < top) { s.lv = (s.lv || 0) + 1; s.run = 0; } } }
  else { s.lv = Math.max(0, (s.lv || 0) - 1); s.run = 0; }
}
// Photo difficulty (Elo): every RA's answers, rated by the sync sheet (?stats=1, tools/sync/Code.gs stats_). 0 = average
// photo, +1 = clearly harder. Few answers: pulled towards the photo's game set (Easy -1, Medium 0, Hard +1).
let PSTAT = (store.get('imr-photo-stats', {}) || {}).photos || {};
const sig = x => 1 / (1 + Math.exp(-x));
function photoDiff(n, p){ const prior = photoLvl(n, p) - 1, o = PSTAT[p.f]; return o ? (o[1] * o[0] + 5 * prior) / (o[1] + 5) : prior; }
// "Learned" = Bayesian Knowledge Tracing per genus: s.L = probability you know the genus, updated after each answer.
// A right answer could be a guess (1 in 4 in the quiz, 1 in 2 in a duel, more on easy photos); a mistake could be a slip
// (more likely on hard photos). So right answers on hard photos count most, and easy photos teach the model little.
// Learned: L >= 0.95, plus two milestones: once right with the corallites in view, once right in a look-alike duel (when
// the genus has look-alikes). Review: 2+ mistakes in the last 5 results. No time criteria.
const BKT = {L0: 0.1, T: 0.08, MASTER: 0.95};
function bktStep(L, good, b, k){
  const g = 1 / k + (1 - 1 / k) * sig(-2 * b - 1), sl = 0.1 + 0.9 * sig(2 * b - 3);
  const post = good ? L * (1 - sl) / (L * (1 - sl) + (1 - L) * g) : L * sl / (L * sl + (1 - L) * (1 - g));
  return post + (1 - post) * BKT.T;
}
// Progress saved before BKT: replay the recent results as average quiz photos.
const knownP = n => { const s = P[n]; if (!s) return 0; if (typeof s.L === 'number') return s.L; let L = BKT.L0; [...(s.h || '')].forEach(x => { L = bktStep(L, x === '1', 0, 4); }); return L; };
function bktObs(n, s, good, b, k){ s.L = Math.round(bktStep(knownP(n), good, b, k) * 1e4) / 1e4; }
function missing(n){
  const s = P[n] || {}, m = [], L = knownP(n);
  if (L < BKT.MASTER) m.push(`more right answers, harder photos count more (${Math.round(100 * L)}% sure now)`);
  if (!s.cor) m.push('right once with the corallites photo open');
  if (hasDuel(n) && !s.du) m.push('right once in a look-alike duel');
  return m;
}
// Partial progress of a genus, 0 to 1 (so progress moves before a genus is learned): how far its knowledge
// probability has climbed towards 95% (3/4 of the score) and the two milestones (1/4).
function genScore(n){
  if (level(n)[0] === 'ok') return 1;
  const s = P[n]; if (!s) return 0;
  const part = Math.min(1, Math.max(0, (knownP(n) - BKT.L0) / (BKT.MASTER - BKT.L0))), duel = hasDuel(n) ? 1 : 0;
  return 0.75 * part + 0.25 * ((s.cor ? 1 : 0) + (duel && s.du ? 1 : 0)) / (1 + duel);
}
const progPct = (L = Object.keys(DATA.gen)) => Math.round(100 * L.reduce((t, n) => t + genScore(n), 0) / L.length);
function level(n){
  const s = P[n]; if (!s || (s.ok + s.ko === 0 && !s.h)) return ['new', 'Not seen'];
  if (misses(recent(n).slice(-5)) >= 2) return ['weak', 'Review'];
  if (!missing(n).length) return ['ok', 'Learned'];
  return ['mid', 'Learning'];
}
function quizNav(){ return ''; }
function bindQuizNav(){ bindGo(); }
// The game rules (behind the ? button).
const gameHelp = cur => `<p class="lede">${cur.startsWith('quiz-duel') ? 'Two genera that are often confused: say which one is in the photos.' : 'Name the genus in the photos: one colony view and one closer view of the same coral.'}
  Pick an answer (or press 1-${cur.startsWith('quiz-duel') ? 2 : 4}). Stuck? <b>Show the corallites</b> adds a close-up. After answering you get the IMR ID tips and why the other ${cur.startsWith('quiz-duel') ? 'genus is' : 'choices are'} wrong; <b>Next</b> (or Enter) goes on. Every answer counts in <a href="#progress">My progress</a>.</p>
  <p class="lede"><b>Photos</b>: each genus starts with easy photos; 2 right answers in a row move it to harder photos, a mistake moves it back. A genus is learned once your answers make it 95% sure you know it: right answers on harder photos count more.</p>`;
function question(cur, target, choices, prompt, set){
  const ph = set.shown, lab = VIEW_LABEL;
  let answered = false, hintShown = false;
  const fig = (p, k) => `<figure class="qph" style="--qbg:url('${img(p, 's')}')"><button type="button" class="zoom" data-q="${k}" aria-label="Enlarge photo"><img src="${img(p)}" alt="Coral to identify${p.view ? ', ' + lab[p.view].toLowerCase() + ' view' : ''}"></button>${p.view ? `<figcaption>${lab[p.view]}</figcaption>` : ''}</figure>`;
  // One screen, no scrolling: the photos fill the stage (sized to the window), choices and feedback sit beside them.
  $v.innerHTML = `${gameHelp(cur)}<div class="q">
    <div class="qstage">${ph.map(fig).join('')}</div>
    <aside class="qside">
      <p class="lvlnote">Photos adapt to each genus. These are ${LEVELS[Math.max(...ph.map(p => photoLvl(target, p)), 0)][1].toLowerCase()}.</p>
      <div class="qtop"><p class="prompt">${prompt}</p><span class="score" title="Right answers this session">${session.ok}/${session.n}</span>${quizNav(cur)}</div>
      <div class="ans">${choices.map((c, i) => `<button type="button" data-c="${esc(c)}"><kbd>${i + 1}</kbd>${esc(c)}</button>`).join('')}</div>
      ${set.hint ? '<button type="button" class="linkish" id="hintb">Show the corallites (hint)</button>' : ''}
      <div id="after"></div>
    </aside></div>`;
  bindQuizNav(cur);
  fitStage();
  const hb = document.getElementById('hintb');
  const showHint = () => { if (hintShown || !set.hint) return; hintShown = true; const st = $v.querySelector('.qstage');
    st.insertAdjacentHTML('beforeend', fig(set.hint, ph.length)); if (hb) hb.remove(); fitStage(); };
  if (hb) hb.onclick = showHint;
  // Keys: 1-4 answer, Enter goes to the next question.
  const keys = e => { if (!document.body.contains($v.querySelector('.q')) || !lb.hidden) return document.removeEventListener('keydown', keys);
    if (e.target.closest('input, textarea, select')) return;
    const b = !answered && $v.querySelectorAll('[data-c]')[Number(e.key) - 1]; if (b) { e.preventDefault(); b.click(); } };
  document.addEventListener('keydown', keys);
  $v.querySelector('.q').addEventListener('click', e => { const z = e.target.closest('[data-q]'); if (!z) return;
    const list = hintShown ? [...ph, set.hint] : ph;
    zoom(list.map(p => ({...p, genus: target})), Number(z.dataset.q), {blind: () => !answered}); });
  $v.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { const cor = hintShown || ph.some(p => p.view === 'macro' || p.view === 'close'); showHint(); answered = true; answer(cur, b.dataset.c, target, set.hint ? [...ph, set.hint] : ph, cor); });
}
// The quiz stage fills the window below the header, so photos, choices and feedback fit without scrolling.
// The photos then take the grid (columns x rows) that shows them largest at 4:3.
function fitStage(){
  const q = $v.querySelector('.q'); if (!q) return;
  const tab = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tabbar-h')) || 0;  // phone tab bar
  q.style.setProperty('--qh', Math.max(260, innerHeight - q.getBoundingClientRect().top - window.scrollY - 16 - tab) + 'px');
  const st = q.querySelector('.qstage');
  // Phones (one column): the photo takes all the height the question and answers leave, so no gap is left under it.
  if (matchMedia('(max-width:760px)').matches) { const side = q.querySelector('.qside'); st.style.height = Math.max(180, parseFloat(q.style.getPropertyValue('--qh')) - (side ? side.offsetHeight : 240) - 10) + 'px'; }
  else st.style.height = '';
  const n = st.children.length, W = st.clientWidth, H = st.clientHeight;
  let best = [n, 1, 0];
  for (let c = 1; c <= n; c++) { const r = Math.ceil(n / c), w = Math.min((W - 8 * (c - 1)) / c, (H - 8 * (r - 1)) / r * 4 / 3); if (w > best[2]) best = [c, r, w]; }
  st.style.gridTemplateColumns = `repeat(${best[0]}, minmax(0, 1fr))`; st.style.gridTemplateRows = `repeat(${best[1]}, minmax(0, 1fr))`;
}
addEventListener('resize', fitStage);
// Games with a grid of cards (Memory): fill the free area. Try every column count; cards may be square up to
// 4:3 landscape (the photos' shape); keep the layout with the largest cards.
function fitTiles(grid, gap, dims){
  // Sizes a card grid to the space left on screen. With dims [a, b] the grid is a x b (either orientation)
  // and cards stretch to fill it, within sane aspect ratios; without, picks the best column count.
  if (gap === undefined) { gap = +grid.dataset.gap || 10; dims = grid.dataset.dims && grid.dataset.dims.split('x').map(Number); }
  grid.dataset.gap = gap; if (dims) grid.dataset.dims = dims.join('x');
  const n = grid.children.length, W = grid.parentNode.clientWidth;
  const H = Math.max(240, innerHeight - grid.getBoundingClientRect().top - window.scrollY - 16);
  const opts = dims ? [[dims[1], dims[0]], [dims[0], dims[1]]] : Array.from({length: n}, (_, i) => [i + 1, Math.ceil(n / (i + 1))]);
  let best = null;
  for (const [c, r] of opts) {
    const cw = (W - gap * (c - 1)) / c, ch = (H - gap * (r - 1)) / r;
    const h = Math.min(ch, cw * (dims ? 1.25 : 1)), w = Math.min(cw, h * (dims ? 1.8 : 4 / 3));
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
function answer(cur, c, target, ph, cor){
  const good = c === target, s = st(target);
  session.n++; if (good) { session.ok++; s.ok++; s.streak++; } else { s.ko++; s.streak = 0; s.conf = s.conf || {}; s.conf[c] = (s.conf[c] || 0) + 1; }
  // Knowledge (BKT) with the difficulty of the photos shown (before the result joins s.h, which BKT replays for old progress).
  const k = $v.querySelectorAll('[data-c]').length || 4;
  bktObs(target, s, good, ph.reduce((t, p) => t + photoDiff(target, p), 0) / Math.max(1, ph.length), k);
  s.h = ((s.h || '') + (good ? 1 : 0)).slice(-10);  // recent results, newest last
  // Pierre's rule: a wrong answer also shows the genus given is not mastered, so it counts as a miss for it too.
  if (!good && DATA.gen[c]) { const w = st(c); bktObs(c, w, false, 0, k); w.h = ((w.h || '') + '0').slice(-10); w.streak = 0; stepLvl(c, w, false, 0); }
  // Adaptive level: at the level of the hardest photo shown.
  stepLvl(target, s, good, Math.max(0, ...ph.map(p => photoLvl(target, p))));
  if (good && cor) s.cor = 1;  // milestone: right with the corallites photo in view
  if (good && cur.startsWith('quiz-duel')) s.du = 1;  // milestone: won a look-alike duel
  // Answer log for the RA sheet: kept until the sheet confirms it (capped), so an answer is never logged twice or lost offline.
  if (SYNC) SYNC.log = [...(SYNC.log || []), {id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), t: new Date().toISOString(), g: target, a: c, ok: good ? 1 : 0, m: cur, ph: ph.map(p => p.f).join(' ')}].slice(-500);
  save();
  $v.querySelectorAll('.qstage .qph').forEach((f, k) => f.insertAdjacentHTML('beforeend', inatTag(ph[k])));
  $v.querySelectorAll('[data-c]').forEach(b => { b.disabled = true; if (b.dataset.c === target) b.classList.add('ok'); else if (b.dataset.c === c) b.classList.add('ko'); });
    const g = DATA.gen[target];
  const vs = !good && DATA.gen[c] ? `<p class="vs">Why not <i>${esc(c)}</i>: ${esc(tipsText(DATA.gen[c]))} <a class="linkish" href="#cmp-${esc(target)}|${esc(c)}">Compare them</a></p>` : '';
  document.getElementById('after').innerHTML = `<div class="fb">
    <h3 class="${good ? 'ok' : 'ko'}">${good ? 'Yes' : 'No'}, it's <a href="#g-${esc(target)}"><i>${esc(target)}</i></a>${g.n ? '' : ' (★ not surveyed)'}</h3>
    ${g.qt ? `<p class="label">ID tips (IMR)</p>` : ''}${tipsList(g, 'imrfb')}${g.mn ? `<p class="vs"><b>Mnemonic:</b> ${esc(g.mn)}</p>` : ''}${vs}
    <details class="more"><summary>Coral Finder</summary>${g.imr.length ? `<p class="vs">${esc(g.sum)}</p>` : ''}<ul>${g.crit.map(x => `<li>${esc(x)}</li>`).join('')}</ul><p class="credit">${ph.map(credit).join('<br>')}</p></details></div>
    <button class="next" type="button" id="next">Next <kbd>↵</kbd></button>`;
  // Phones: the feedback opens as a bottom sheet so the answer and Next show without scrolling (app.css .q.done).
  const qq = $v.querySelector('.q'); if (qq) qq.classList.add('done');
  bindGo(document.getElementById('after'));
  const nb = document.getElementById('next'); nb.focus({preventScroll: true}); nb.onclick = route;
}
function distractors(t, list){
  const look = DATA.gen[t].look.filter(n => list.includes(n));
  const fam = list.filter(n => n !== t && DATA.gen[n].fam === DATA.gen[t].fam && !look.includes(n));
  const rest = shuffle(list.filter(n => n !== t && !look.includes(n) && !fam.includes(n)));
  return [...shuffle(look), ...shuffle(fam), ...rest].slice(0, 3);
}
function quizPhoto(){
  const list = pool(), t = nextTarget(list);
  question('quiz', t, shuffle([t, ...distractors(t, list)]), 'Which genus?', photoSet(t));
}
function quizDuel(a, b){
  const list = pool();
  let pair = a && b ? [a, b] : null;
  if (!pair) {
    const ps = pairs().filter(([x, y]) => list.includes(x) && list.includes(y));
    const w = ps.map(([x, y]) => weight(x) + weight(y)), t0 = w.reduce((p, q) => p + q, 0);
    let r = Math.random() * t0; pair = ps[0];
    for (let i = 0; i < ps.length; i++) { r -= w[i]; if (r <= 0) { pair = ps[i]; break; } }
  }
  const t = pick(pair);
  question(a ? `quiz-duel|${a}|${b}` : 'quiz-duel', t, pair, `<i>${esc(pair[0])}</i> or <i>${esc(pair[1])}</i>?`, photoSet(t));
}
// Progress board, one screen: a wall of the 39 cover photos in slate order (colour = learned, grey = not seen,
// colour rising from the bottom = partial mastery, red waterline = review) beside a side column with the overall ring, what to review first, sign-in and backup.
function quizBoard(){
  const list = Object.keys(DATA.gen).filter(n => Q.stars || DATA.gen[n].n).sort((a, b) => slateIdx(a) - slateIdx(b));
  const lv = Object.fromEntries(list.map(n => [n, level(n)]));
  const count = k => list.filter(n => lv[n][0] === k).length;
  const LV = [['ok', 'Learned'], ['mid', 'Learning'], ['weak', 'Review'], ['new', 'Not seen']];
  const weak = list.filter(n => lv[n][0] === 'weak').sort((a, b) => weight(b) - weight(a));
  let deg = 0; const ring = LV.map(([k]) => { const d = 360 * count(k) / list.length, c = `var(--${k === 'ok' ? 'good' : k === 'mid' ? 'accent' : k === 'weak' ? 'bad' : 'line'}) ${deg}deg ${deg + d}deg`; deg += d; return c; }).join(',');
  const tile = n => { const g = DATA.gen[n], p = cover(g), s = P[n] || {ok: 0, ko: 0}, [cl, lb] = lv[n];
    const tide = cl === 'mid' || cl === 'weak';
    // Rising tide: colour fills the photo from the bottom up to the genus's partial mastery, with a wavy waterline.
    return `<a class="pw ${cl}" href="#g-${esc(n)}" title="${tip(n)}"${tide ? ` style="--p:${genScore(n).toFixed(2)}"` : ''}>${p ? `<img src="${img(p, 's')}" alt="${esc(n)}" loading="lazy">${tide ? `<img class="col" src="${img(p, 's')}" alt="" loading="lazy"><b class="wave"></b>` : ''}` : ''}<span><i>${esc(n)}</i>${g.n ? '' : ' ★'}</span></a>`; };
  const conf = list.map(n => { const c = (P[n] || {}).conf; if (!c) return null; const [o, k] = Object.entries(c).sort((x, y) => y[1] - x[1])[0]; return [n, o, k]; }).filter(Boolean).sort((x, y) => y[2] - x[2]).slice(0, 3);
  // Three ways to show the same progress (Pierre wants to try each): photos, slate numbers, lecture groups.
  const tip = n => { const s = P[n] || {ok: 0, ko: 0}, m = lv[n][0] === 'mid' || lv[n][0] === 'weak' ? missing(n) : []; return `${esc(n)}: ${lv[n][1]}${s.ok + s.ko ? ` (${s.ok}/${s.ok + s.ko} right)` : ''}${m.length ? '. Still needed: ' + esc(m.join('; ')) : ''}`; };
  // Learning level as a fill gauge: the tile fills from the left as the genus gets closer to learned.
  const fill = n => lv[n][0] === 'mid' || lv[n][0] === 'weak' ? ` style="--p:${(100 * genScore(n)).toFixed(0)}%"` : '';
  const gi = n => shownGroup(n) || 99, groups = [...new Set(list.map(gi))].sort((a, b) => a - b);
  const VIEWS = {
    photos: () => `<div class="pgrid pwall">${list.map(tile).join('')}</div>`,
    // Laid out like the physical IMR slate: 1-20 down the left column, 21-34 down the right, starred genera under them.
    slate: () => { const num = list.filter(n => DATA.gen[n].n), L = num.filter(n => DATA.gen[n].n <= 20), R = num.filter(n => DATA.gen[n].n > 20), S = list.filter(n => !DATA.gen[n].n);
      const ps = n => `<a class="ps ${lv[n][0]}" href="#g-${esc(n)}" title="${tip(n)}"${fill(n)}><b>${DATA.gen[n].n ? DATA.gen[n].n + '.' : '★'}</b><i>${esc(n)}</i></a>`;
      return `<div class="pslate" style="--rows:${Math.max(L.length, R.length + (S.length ? S.length + 1 : 0))}">${L.map(ps).join('')}${R.map(ps).join('')}${S.length ? '<span class="psgap"></span>' : ''}${S.map(ps).join('')}</div>`; },
    groups: () => `<div class="pgroups">${groups.map(k => { const gr = DATA.imrg.find(x => x.n === k), L = list.filter(n => gi(n) === k);
      return `<div class="pgr" style="--g:${gr ? groupHue(gr.n) : 200}"><span class="gn" title="${gr ? esc(gr.t) : 'Not covered in the lecture'}">${gr ? gr.n : '★'}</span><span class="pgt">${gr ? esc(gr.t) : 'Not covered in the lecture'}</span>
        <span class="pseg">${L.map(n => `<a class="${lv[n][0]}" href="#g-${esc(n)}" title="${tip(n)}"${fill(n)}><i>${esc(n)}</i></a>`).join('')}</span><small>${L.filter(n => lv[n][0] === 'ok').length}/${L.length}</small></div>`; }).join('')}</div>`
  };
  let pv = store.get('imr-coral-pview', 'photos'); if (!VIEWS[pv]) pv = 'photos';
  $v.innerHTML = `<p class="lede">Three views of the same progress, pick the one you like. On the photos: full colour = learned; colour rising from the bottom = learning (the higher the waterline, the closer to learned); red waterline = to review (comes up more often in the quiz); grey = not seen yet. On the Slate and Groups views: grey = not seen; a teal fill rising from the left = learning (the fuller, the closer to learned); red fill and border = to review; solid green = learned. Each genus has its own photo level: it starts with easy photos, 2 right answers in a row move it to harder ones, a mistake moves it back (naming a genus when the photo shows another one counts as a mistake for both). Learned: your answers make it 95% sure you know the genus (a probability updated after each answer: right answers on harder photos count more, a lucky guess on an easy photo counts little), plus two milestones: right once with the corallites photo open, and right once in a look-alike duel. Hover a genus to see what it still needs. Review: 2 or more mistakes in the last 5 answers. Click a genus to open its sheet.</p>
  <div class="pgame pboard"><div class="pgwrap"></div>
  <aside class="gside">
    <div class="seg" role="group" aria-label="View">${[['photos', 'Photos'], ['slate', 'Slate'], ['groups', 'Groups']].map(([k, t]) => `<button type="button" data-pv="${k}" aria-pressed="${pv === k}">${t}</button>`).join('')}</div>
    <div class="pring" style="background:conic-gradient(${ring})"><span><b>${progPct(list)}%</b><small>${count('ok')}/${list.length} learned</small></span></div>
    <p class="plegend">${LV.map(([k, t]) => `<span class="lvl ${k}">${t} ${count(k)}</span>`).join(' ')}</p>
    <p class="pnote">Learned = your answers make it 95% sure you know the genus (right answers on harder photos count more), plus once right with the corallites and once in a duel. Naming a genus wrongly counts as a mistake for it. The % counts every step on the way.</p>
    ${weak.length ? `<div><h3 class="label">Review first</h3><p class="chips">${weak.slice(0, 4).map(n => `<a class="chip" href="#g-${esc(n)}"><i>${esc(n)}</i></a>`).join('')}</p></div>` : ''}
    ${conf.length ? `<div><h3 class="label">Often mixed up</h3><p class="chips">${conf.map(([n, o, k]) => `<a class="chip" href="#cmp-${esc(n)}|${esc(o)}" title="Compare side by side"><i>${esc(n)}</i> / <i>${esc(o)}</i> ×${k}</a>`).join('')}</p></div>` : ''}
    <p><a class="next go" href="#quiz">Practise now</a></p>
    ${SYNC_URL ? '<section class="sync" id="sync"></section>' : ''}
    <details class="saveprog"><summary>Backup or reset progress</summary><p class="note">Progress is saved in this browser and, once you sign in, in the IMR sheet. You can also save it to a file as a backup, or to move it to another device.</p>
      <button class="chip" type="button" id="pexp">Save to a file</button> <button class="chip" type="button" id="pload">Load a file</button><input type="file" id="pimp" accept=".json,application/json" hidden> <span class="note" id="pmsg" role="status"></span>
      <p><button class="reset" type="button" id="reset">Reset progress</button></p></details>
  </aside></div>`;
  bindQuizNav('quiz-board');
  bindProgFile(); bindSync();
  const rb = document.getElementById('reset');
  rb.onclick = () => { if (rb.dataset.armed) { P = {}; store.set('imr-coral-reset', new Date().toISOString()); save(); route(); } else { rb.dataset.armed = '1'; rb.textContent = 'Confirm reset'; } };
  const wrap = $v.querySelector('.pboard .pgwrap');
  const show = () => { wrap.innerHTML = VIEWS[pv](); $v.querySelectorAll('[data-pv]').forEach(b => b.setAttribute('aria-pressed', b.dataset.pv === pv));
    requestAnimationFrame(() => { const g = wrap.firstChild; if (g.classList.contains('pgrid')) fitTiles(g, 6); else g.style[pv === 'slate' ? 'minHeight' : 'height'] = Math.max(320, innerHeight - g.getBoundingClientRect().top - window.scrollY - 16) + 'px'; }); };
  $v.querySelectorAll('[data-pv]').forEach(b => b.onclick = () => { pv = b.dataset.pv; store.set('imr-coral-pview', pv); show(); });
  show();
}

// Header progress pill: genera learned, always in view; the page itself is #progress.
const $prog = document.getElementById('prog');
function showProg(){ if (!DATA) return; const n = Object.keys(DATA.gen); const pt = `${progPct(n)}%`, lt = `${n.filter(x => level(x)[0] === 'ok').length}/${n.length} genera learned`; document.getElementById('progn').textContent = pt; $prog.title = `Your progress: ${pt} (${lt})`; const p2 = document.getElementById('progn2'); if (p2) p2.textContent = pt;
  // Not signed in: the pill says so, so RAs find where to save their progress.
  const pill = document.getElementById('prog'), out = !!SYNC_URL && !SYNC;
  pill.classList.toggle('nosync', out || !!syncTrouble()); pill.querySelector('.pl').textContent = out ? 'Sign in · progress' : 'My progress';
  pill.title = SYNC ? `Signed in as ${SYNC.name}: your progress per genus` : out ? 'Sign in to save your progress' : 'Your progress per genus'; }
// Progress files: every imr-coral-* key in localStorage (quiz progress, settings, Lab scores), as JSON.
const progData = () => { const d = {}; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith('imr-coral') && k !== 'imr-coral-sync') d[k] = localStorage.getItem(k); } } catch (e) {} return d; };
const loadData = d => Object.entries(d || {}).forEach(([k, v]) => k.startsWith('imr-coral') && k !== 'imr-coral-sync' && localStorage.setItem(k, v));
function bindProgFile(){
  const msg = t => document.getElementById('pmsg').textContent = t;
  document.getElementById('pexp').onclick = () => {
    const out = {app: 'imr-coral-id', saved: new Date().toISOString(), data: progData()};
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 1)], {type: 'application/json'}));
    a.download = `imr-coral-progress-${out.saved.slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(a.href);
    msg('Saved. Keep the file somewhere safe (Drive, email to yourself).');
  };
  const pick = document.getElementById('pimp');
  document.getElementById('pload').onclick = () => pick.click();
  try { const done = sessionStorage.getItem('imr-coral-loaded'); if (done) { sessionStorage.removeItem('imr-coral-loaded'); msg('Progress loaded from ' + done + '.'); } } catch (e) {}
  pick.onchange = e => { const f = e.target.files[0]; if (!f) return;
    f.text().then(t => { const j = JSON.parse(t); if (j.app !== 'imr-coral-id' || !j.data) throw 0;
      loadData(j.data);
      // Reload so every setting held in memory (quiz options, list order, Lab state) picks up the file.
      try { sessionStorage.setItem('imr-coral-loaded', f.name); } catch (e) {} location.reload(); })
      .catch(() => msg('This file is not an IMR Coral ID progress file.')); };
}
// RA sync: progress goes to Pierre's Google Sheet (Apps Script web app, tools/sync/Code.gs) under a name
// and a 4-digit code; the same name and code bring it back on another device. Off while SYNC_URL is empty.
// Photo difficulty from the sheet (Elo over every RA's answers), kept for offline use. An older sheet script without
// stats simply answers with an error, and the game-set priors are used.
// Refreshed every 10 minutes while the page is open (the sheet caches it for 10 minutes too), and on coming back to a
// tab left open longer than that.
let statsAt = 0;
setInterval(() => { if (document.visibilityState === 'visible') loadStats(); }, 600000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && Date.now() - statsAt > 600000) loadStats(); });
function loadStats(){ if (!SYNC_URL || !DATA) return; statsAt = Date.now(); fetch(SYNC_URL + '?stats=1').then(r => r.json()).then(j => { if (j && j.ok && j.photos) { PSTAT = j.photos; store.set('imr-photo-stats', {t: Date.now(), photos: j.photos}); } }).catch(() => {}); }
const SYNC_URL = 'https://script.google.com/macros/s/AKfycbyt6l9sBeWP4KacPx1SUbsk9-15uJikxRafrpwF6b2oAE8GgrnPOtuJg7IqfFG5ymrR/exec';
let SYNC = store.get('imr-coral-sync', null), syncTimer = null;
function syncSummary(){
  const n = Object.keys(DATA.gen), genera = Object.fromEntries(n.map(x => [x, level(x)[0]]));
  return {learned: n.filter(x => genera[x] === 'ok').length, seen: n.filter(x => genera[x] !== 'new').length, total: n.length,
    review: n.filter(x => genera[x] === 'weak'), genera};
}
const syncGet = (a = SYNC) => fetch(`${SYNC_URL}?name=${encodeURIComponent(a.name)}&pin=${encodeURIComponent(a.pin)}`).then(r => r.json());
// Two devices on one account: three-way merge against SYNC.base, the progress as last sent or received.
// Answers taken on this device since then are added on top of the saved record, so neither side's answers
// are lost. A reset (imr-coral-reset, a time) wins over older progress.
const copy = o => JSON.parse(JSON.stringify(o));
function mergeSaved(j){
  const d = j.data || {}; let R = {}; try { R = JSON.parse(d['imr-coral-progress'] || '{}') || {}; } catch (e) {}
  const rr = JSON.parse(d['imr-coral-reset'] || '""'), lr = store.get('imr-coral-reset', '');
  // A send whose reply was lost but which did reach the sheet: the saved record is exactly what was sent.
  if (SYNC.pending && d['imr-coral-progress'] === SYNC.pending) SYNC.base = R;
  delete SYNC.pending;
  if (lr > rr) return;
  if (rr > lr) { P = R; SYNC.base = copy(R); store.set('imr-coral-sync', SYNC); store.set('imr-coral-reset', rr); store.set('imr-coral-progress', P); showProg(); return; }
  const B = SYNC.base || {}, Z = {ok: 0, ko: 0, streak: 0};
  new Set([...Object.keys(R), ...Object.keys(P)]).forEach(g => {
    const b = B[g] || Z, l = P[g] || Z, r = R[g] || Z, out = {...r};
    out.ok = Math.max(0, (r.ok || 0) + (l.ok || 0) - (b.ok || 0));
    out.ko = Math.max(0, (r.ko || 0) + (l.ko || 0) - (b.ko || 0));
    const mine = (l.ok || 0) + (l.ko || 0) !== (b.ok || 0) + (b.ko || 0) || (l.h || '') !== (b.h || '');
    out.streak = mine ? l.streak || 0 : r.streak || 0;
    if (mine && l.h) out.h = l.h;
    if (mine) ['lv', 'run', 'L'].forEach(k => { if (l[k] !== undefined) out[k] = l[k]; else delete out[k]; });
    if (l.cor || r.cor) out.cor = 1; if (l.du || r.du) out.du = 1;
    const conf = {...(r.conf || {})};
    Object.keys(l.conf || {}).forEach(k => { const v = (conf[k] || 0) + l.conf[k] - ((b.conf || {})[k] || 0); if (v > 0) conf[k] = v; else delete conf[k]; });
    if (Object.keys(conf).length) out.conf = conf; else delete out.conf;
    if (out.ok + out.ko || out.h) P[g] = out; else delete P[g];
  });
  // The saved record is now part of P: it becomes the baseline, so a failed send can't count it twice.
  SYNC.base = copy(R); store.set('imr-coral-sync', SYNC);
  store.set('imr-coral-progress', P); showProg();
}
// Pull, merge, then send. Every change bumps SYNC.rev; a send clears SYNC.dirty only if nothing changed
// meanwhile. Unsent progress is retried on start-up and when back online.
// One sync at a time: a request made while one runs is queued and runs once it ends.
let syncing = null, syncAgain = false;
function syncPush(){
  if (!SYNC_URL || !SYNC || !DATA) return Promise.resolve(null);
  if (syncing) { syncAgain = true; return syncing; }
  syncing = syncOnce().finally(() => { syncing = null; if (syncAgain) { syncAgain = false; syncPush(); } });
  return syncing;
}
function syncOnce(){
  const me = SYNC; let rev, sent, log;
  // If the device is disconnected or switched to another account meanwhile, drop this sync.
  return syncGet(me).then(j => { if (SYNC !== me) return null; if (!j.ok) return j; if (j.found) mergeSaved(j);
    rev = me.rev; sent = copy(P); log = me.log || []; me.pending = progData()['imr-coral-progress'] || ''; store.set('imr-coral-sync', me);
    return fetch(SYNC_URL, {method: 'POST', body: JSON.stringify({name: me.name, pin: me.pin, data: progData(), summary: syncSummary(), answers: log})}).then(r => r.json()); })
    .then(j => { if (j && j.ok && SYNC === me) { me.last = new Date().toISOString(); me.base = sent; delete me.pending; delete me.err; if (!j.log && log.length) me.err = 'net'; if (j.log) { const done = new Set(log.map(x => x.id)); me.log = (me.log || []).filter(x => !done.has(x.id)); } if (me.rev === rev) delete me.dirty; store.set('imr-coral-sync', me); }
      else if (j && SYNC === me) { me.err = j.error === 'pin' ? 'pin' : 'net'; store.set('imr-coral-sync', me); } return j; })
    .catch(() => { if (SYNC === me) { me.err = 'net'; store.set('imr-coral-sync', me); } return null; })
    .finally(() => { if (SYNC === me) bindSync(); });
}
const syncSoon = () => { if (!SYNC_URL || !SYNC) return; SYNC.dirty = true; SYNC.rev = (SYNC.rev || 0) + 1; store.set('imr-coral-sync', SYNC); clearTimeout(syncTimer); syncTimer = setTimeout(syncPush, 3000); };
const syncRetry = () => { if (SYNC && (SYNC.dirty || (SYNC.log || []).length)) syncPush(); };
window.addEventListener('online', syncRetry);
// What is wrong with the sync, in words, or '' when everything is saved.
function syncTrouble(){
  if (!SYNC_URL || !SYNC) return '';
  if (SYNC.err === 'pin') return 'Not saved: code refused';
  const n = (SYNC.log || []).length;
  if (SYNC.err) return n ? `Not saved yet: ${n} answer${n > 1 ? 's' : ''} waiting` : 'Not saved yet: could not reach the sheet';
  return '';
}
// The sign-in box: My progress (#sync), or the welcome tour's card while it is open.
function bindSync(box = document.querySelector('#tour .tsync') || document.getElementById('sync')){
  showProg();
  if (!box) return;
  box.classList.remove('on', 'warn');
  const msg = t => box.querySelector('[role=status]').textContent = t;
  if (SYNC) {
    // Signed in and saved: one quiet line, actions in view. Trouble (unsent answers, refused code): a box that stands out.
    const bad = syncTrouble(), when = SYNC.last ? new Date(SYNC.last).toLocaleString([], {dateStyle: 'short', timeStyle: 'short'}) : '';
    box.classList.add(bad ? 'warn' : 'on');
    box.innerHTML = bad
      ? `<p><b>${bad}</b></p><p class="note">${SYNC.err === 'pin' ? 'The sheet refused the code for this name. Sign out and sign in again with the right code.' : 'Your answers are kept on this device and sent as soon as the sheet can be reached.'}${when ? ` Last saved ${when}.` : ''}</p>
        <button class="chip go" type="button" id="snow">Try again</button> <button class="reset" type="button" id="soff">Sign out</button> <span class="note" role="status"></span>`
      : (SYNC.dirty || (SYNC.log || []).length)  // answers not confirmed yet, no error so far: say so, quietly
      ? `<p class="sline"><span class="sdot wait"></span><span>Saving for IMR as <b>${esc(SYNC.name)}</b>…</span>
        <button class="linkish" type="button" id="snow">Send now</button><button class="linkish" type="button" id="soff">Sign out</button></p><span class="note" role="status"></span>`
      : `<p class="sline"><span class="sdot"></span><span>Saved for IMR as <b>${esc(SYNC.name)}</b>${when ? ` · ${when}` : ''}</span>
        <button class="linkish" type="button" id="snow">Send now</button><button class="linkish" type="button" id="soff">Sign out</button></p><span class="note" role="status"></span>`;
    box.querySelector('#snow').onclick = () => { msg('Sending…'); syncPush().then(j => { if (!(j && j.ok)) msg(j && j.error === 'pin' ? 'The sheet refused the code for this name.' : 'Could not reach the sheet. Check your connection.'); }); };
    box.querySelector('#soff').onclick = () => { SYNC = null; try { localStorage.removeItem('imr-coral-sync'); } catch (e) {} bindSync(); };
    return;
  }
  box.innerHTML = `<h3>Sign in to save your progress</h3><p>Training at IMR? Sign in with your name and a 4-digit code: your progress is saved for your trainer and comes back on any device.</p>
    <form class="sform"><label>Your name <input name="n" required maxlength="40" autocomplete="name"></label>
    <label>4-digit code <input name="p" required inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="off"></label>
    <button class="chip go" type="submit">Sign in</button> <span class="note" role="status"></span></form>
    <p class="note">New name: pick any code and remember it. Same name and code later: your saved progress comes back.</p>`;
  box.querySelector('form').onsubmit = e => { e.preventDefault();
    const f = e.target, name = f.n.value.trim(), pin = f.p.value.trim();
    msg('Connecting…');
    fetch(`${SYNC_URL}?name=${encodeURIComponent(name)}&pin=${encodeURIComponent(pin)}`).then(r => r.json()).then(j => {
      if (!j.ok) return msg(j.error === 'pin' ? 'This name already exists with another code.' : 'Check the name and the 4-digit code.');
      SYNC = {name, pin}; if (j.found) { try { SYNC.base = JSON.parse(j.data['imr-coral-progress'] || '{}') || {}; } catch (err) { SYNC.base = {}; } } store.set('imr-coral-sync', SYNC);
      // A known account replaces whatever this device holds (another RA may have used it); a new name keeps it.
      if (j.found) { Object.keys(progData()).forEach(k => localStorage.removeItem(k)); loadData(j.data); try { sessionStorage.setItem('imr-coral-loaded', 'the IMR sheet'); } catch (err) {} location.reload(); }
      else { SYNC.dirty = true; store.set('imr-coral-sync', SYNC); syncPush().then(() => bindSync()); }
    }).catch(() => msg('Could not reach the sheet. Check your connection.')); };
}
// Ask the browser not to evict saved progress when storage runs low.
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

/* ---------- routing ---------- */
function go(h){ if (decodeURIComponent(location.hash.slice(1)) === h) route(); else location.hash = h; }

// Photo size (small / medium / large), remembered per page in localStorage (key imr-coral-size).
// Each page reads :root[data-size] in its own CSS; pages where it means nothing (games that fill the screen,
// home, progress) hide the S/M/L buttons, keeping their room so the header never changes size.
const SIZE_PAGES = ['genera', 'tips', 'cmp', 'genus', 'pair', 'finder', 'lab-gallery', 'lab-elim'];
function pageKey(){ const h = decodeURIComponent(location.hash.slice(1)); return h.startsWith('g-') ? 'genus' : h.startsWith('cmp-') ? 'pair' : h.split('|')[0] || 'home'; }
function sizePrefs(){ try { return JSON.parse(localStorage.getItem('imr-coral-size')) || {}; } catch (e) { return {}; } }
// Default M, except Genera (S: more genera per screen, groups easier to compare).
function photoSize(){ return sizePrefs()[pageKey()] || (pageKey() === 'genera' ? 's' : 'm'); }
const SIZES = {card: {s: '240px', m: '360px', l: '520px'}, strip: {s: '(max-width:700px) 46vw, 260px', m: '(max-width:700px) 92vw, 420px', l: '(max-width:700px) 92vw, 640px'}};
const sizesFor = kind => SIZES[kind][photoSize()];
function applySize(){ const s = photoSize(), on = SIZE_PAGES.includes(pageKey()); document.documentElement.dataset.size = s;
  const sz = document.getElementById('size'); document.getElementById('sizerow').hidden = !on; document.querySelectorAll('img[data-sz]').forEach(i => i.sizes = sizesFor(i.dataset.sz)); document.querySelectorAll('#size button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.size === s))); }
function showOrigin(){ document.querySelectorAll('#origin button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.origin === origin))); }
// On phones each group shows only its current button: tapping it moves to the next one.
const phone = () => matchMedia('(max-width:640px)').matches;
const cycle = b => b;  // all choices are visible in the settings panel
document.querySelectorAll('#origin button').forEach(b => b.onclick = () => { b = cycle(b); origin = b.dataset.origin; store.set('imr-coral-origin', origin); showOrigin(); if (RAW) { build(); route(); } });
showOrigin();
document.querySelectorAll('#size button').forEach(b => b.onclick = () => { b = cycle(b); const p = sizePrefs(); p[pageKey()] = b.dataset.size; try { localStorage.setItem('imr-coral-size', JSON.stringify(p)); } catch (e) {} applySize(); });
// Light / dark theme switch; follows the system until the reader picks one.
const $theme = document.getElementById('theme');
function isDark(){ return document.documentElement.dataset.theme === 'dark'; }
function showTheme(){ const d = isDark(); $theme.textContent = d ? '☀' : '☾'; $theme.setAttribute('aria-label', d ? 'Switch to light theme' : 'Switch to dark theme'); }
$theme.onclick = () => { const t = isDark() ? 'light' : 'dark'; document.documentElement.dataset.theme = t; try { localStorage.setItem('imr-coral-theme', t); } catch (e) {} showTheme(); };
showTheme();

// Tools of the Learn, Practice and Identify sections (the learning path order): a tab bar in the sticky header, so they stay in view.
// Entries without a view in this file (anatomy, size, elim, pairs…) are tools that graduated from the Lab (proto/).
const MODES = {
  learn: [['genera', 'Genera', 'The 39 genera, as photos or ID tips'], ['cmp', 'Look-alikes', 'Confused pairs side by side']],
  practice: [['quiz', 'Photo → genus', 'Name the genus'], ['quiz-duel', 'Look-alike duels', 'Two genera often confused'], ['pairs', 'Memory', 'Match colony and corallites']],
  identify: [['finder', 'Coral Finder', 'Tap the clues you see, get a ranked shortlist']]
};
const MODE_LABEL = {learn: 'Learn tools', identify: 'Ways to identify', practice: 'Practice modes'};
// Which tab of MODES a hash belongs to: key leaves and groups count as the key, genus sheets as Genera, pairs as Look-alikes.
function modeOf(h){ return /^[kl]-/.test(h) ? 'finder' : h.startsWith('g-') ? 'genera' : h.startsWith('cmp') ? 'cmp' : h.split('|')[0]; }
function sectionOf(h){
  if (!h || h === 'home') return 'home';
  if (h.startsWith('lab')) return 'lab';
  if (h === 'progress' || h === 'quiz-board') return 'progress';
  const m = modeOf(h);
  return Object.keys(MODES).find(t => MODES[t].some(x => x[0] === m)) || 'learn';
}
const $modes = document.getElementById('modes');
// Genera in the order of the Genera page (lecture groups or slate), for previous / next on a sheet.
function generaOrder(){
  const names = Object.keys(DATA.gen), gi = n => shownGroup(n) || 99;
  return azOrder === 'lecture' ? names.sort((a, b) => gi(a) - gi(b) || slateIdx(a) - slateIdx(b)) : names;
}
// On a genus sheet or a pair, the header bar names the page instead of listing the section's tools.
function ctxBar(h){
  const back = `<button type="button" class="up" data-back aria-label="Back">‹<span>Back</span></button>`;
  if (h.startsWith('g-') && DATA.gen[h.slice(2)]) {
    const n = h.slice(2), g = DATA.gen[n], L = generaOrder(), i = L.indexOf(n);
    const prev = L[(i - 1 + L.length) % L.length], next = L[(i + 1) % L.length];
    return `${back}<h2 class="ctx-t"><i>${esc(n)}</i><small>${g.n ? 'No. ' + g.n : '<b class="star">★</b> not surveyed'} · ${esc(g.fam)}</small></h2>
      <span class="pn"><a href="#g-${esc(prev)}" title="Previous: ${esc(prev)}" aria-label="Previous genus: ${esc(prev)}">‹</a><a href="#g-${esc(next)}" title="Next: ${esc(next)}" aria-label="Next genus: ${esc(next)}">›</a></span>`;
  }
  const [a, b] = h.startsWith('cmp-') ? h.slice(4).split('|') : [];
  if (a && DATA.gen[a] && DATA.gen[b]) return `${back}<h2 class="ctx-t"><span><i>${esc(a)}</i> or <i>${esc(b)}</i>?</span></h2><a class="ctx-l" href="#cmp">All pairs</a>`;
  return '';
}
function showModes(tab, h){
  const ctx = ctxBar(h);
  $modes.classList.toggle('ctx', !!ctx);
  if (ctx) {
    $modes.hidden = false; $modes.setAttribute('aria-label', 'Page'); $modes.innerHTML = ctx;
    $modes.querySelector('[data-back]').onclick = () => history.length > 1 ? history.back() : go(h.startsWith('g-') ? 'genera' : 'cmp');
    return;
  }
  // A section with a single tool needs no tab bar.
  const L = MODES[tab] && MODES[tab].length > 1 ? MODES[tab] : null; $modes.hidden = !L; if (!L) { $modes.innerHTML = ''; return; }
  const cur = modeOf(h);
  $modes.setAttribute('aria-label', MODE_LABEL[tab]);
  $modes.innerHTML = L.map(([k, t, d]) => `<a href="#${k}" title="${esc(d)}"${k === cur ? ' aria-current="page"' : ''}><b>${t}</b></a>`).join('');
  const on = $modes.querySelector('[aria-current]'); if (on && $modes.scrollWidth > $modes.clientWidth) $modes.scrollLeft = on.offsetLeft - ($modes.clientWidth - on.offsetWidth) / 2;
}
function route(){
  applySize();
  const h = decodeURIComponent(location.hash.slice(1));
  // Home lives at the clean URL; an old #home link is rewritten to it.
  if (h === 'home') history.replaceState(null, '', location.pathname + location.search);
  const tab = sectionOf(h);
  resetHelp(); $gpop.hidden = true;
  showProg(); tab === 'progress' ? $prog.setAttribute('aria-current', 'page') : $prog.removeAttribute('aria-current');
  document.querySelectorAll('nav [data-tab]').forEach(b => b.dataset.tab === tab ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current'));
  showModes(tab, h);
  // The old growth-form key and corallite filters live on in the Coral Finder: their links open it with the same clues ticked.
  if (h === 'key' || h === 'key-tr') location.replace('#finder');
  else if (h.startsWith('k-') && groupOf(h.slice(2))) location.replace('#finder|form=' + h.slice(2));
  else if (h.startsWith('l-') && leafOf(h.slice(2))) { const l = h.slice(2), one = groupOf(l).leaves.length === 1; location.replace('#finder|form=' + l[0] + (one ? '' : ';box=' + l)); }
  else if (h === 'key-imr') { azOrder = 'lecture'; location.replace('#genera'); }
  else if (h.startsWith('g-')) viewGenus(h.slice(2));
  else if (h === 'tips' || h.startsWith('tips|')) { azView = 'tips'; location.replace('#genera'); }
  else if (h === 'cmp') viewCompareList();
  else if (h.startsWith('cmp-')) viewCompare(...h.slice(4).split('|'));
  else if (h === 'quiz') quizPhoto();
  // Lecture photos are now a photo set of Photo -> genus.
  else if (h === 'quiz-course') location.replace('#quiz');  // the Lecture photo set was removed (Pierre, 2026-10-31)
  else if (h === 'progress' || h === 'quiz-board') quizBoard();
  else if (h.startsWith('quiz-duel')) { const [, a, b] = h.split('|'); quizDuel(a, b); }
  else if (h.startsWith('lab') && window.viewLab) viewLab(h);
  else if (window.labTool && labTool(h)) {}
  else if ((!h || h === 'home') && window.viewHome) viewHome();
  else viewGenera();
  window.scrollTo(0, 0);
  pageHelp();
  hdrMetrics();
  // The intro moved behind ? only now, so the quiz stage is resized to the space it really has (phones gained ~280 px).
  fitStage();
}
addEventListener('hashchange', route);
// Pages open straight on their content: the title is dropped where the header already names the page
// (section tab, page bar or Lab crumbs), and the intro text moves behind the ? button.
const $help = document.getElementById('help'), $helpbox = document.getElementById('helpbox');
// One rule for every page and every render path (route, tabs, toggles, Lab tools): whenever the view gets a
// top-level title or intro, the title is dropped and the intro moves behind ? . route() only resets the help box.
function pageHelp(){
  const root = $v.querySelector(':scope > .lab') || $v;
  const found = [...root.querySelectorAll(':scope > h2, :scope > .lede, :scope > .tips, :scope > h3.label, :scope > .gloss')];
  if (!found.length) return;
  const h2 = found.find(x => x.tagName === 'H2'), intro = found.filter(x => x !== h2);
  if (intro.length) { $helpbox.innerHTML = (h2 ? `<h3>${esc(h2.textContent)}</h3>` : '') + intro.map(x => x.outerHTML).join('') + (window.tour ? '<p class="note htour"><button type="button" class="linkish" data-tour>Replay the welcome tour</button></p>' : ''); $help.hidden = false; }
  found.forEach(x => x.remove());
}
function resetHelp(){ $helpbox.hidden = true; $helpbox.innerHTML = ''; $help.hidden = true; $help.setAttribute('aria-expanded', 'false'); }
new MutationObserver(pageHelp).observe($v, {childList: true, subtree: true});
// Settings (photo source, photo size, theme) live in one small panel behind ⚙.
const $setb = document.getElementById('setb'), $set = document.getElementById('settings');
$setb.onclick = e => { e.stopPropagation(); const open = $set.hidden; $set.hidden = !open; $setb.setAttribute('aria-expanded', String(open)); };
document.addEventListener('click', e => { if (!$set.hidden && !e.target.closest('#settings, #setb')) { $set.hidden = true; $setb.setAttribute('aria-expanded', 'false'); } });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$set.hidden) { $set.hidden = true; $setb.setAttribute('aria-expanded', 'false'); $setb.focus(); } });
// Admin | User view switch: only in the browser holding the admin token; a switch reloads so every module follows.
const $viewrow = document.getElementById('viewrow');
if (HAS_ADMIN_TOKEN) {
  $viewrow.hidden = false;
  $viewrow.querySelectorAll('button').forEach(b => { b.setAttribute('aria-pressed', String((b.dataset.view === 'admin') === IS_ADMIN));
    b.onclick = () => { if ((b.dataset.view === 'admin') === IS_ADMIN) return; try { localStorage.setItem('imr-admin-view', b.dataset.view); } catch (e) {} location.reload(); }; });
}
$help.onclick = () => { const open = $helpbox.hidden; $helpbox.hidden = !open; $help.setAttribute('aria-expanded', String(open)); hdrMetrics(); };
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
function hdrMetrics(){
  const r = document.documentElement.style, h = $hdr.offsetHeight;
  const hide = phone() ? h : 0;
  r.setProperty('--hdr-h', (h - hide) + 'px'); r.setProperty('--hdr-hide', hide + 'px');
}
if (window.ResizeObserver) new ResizeObserver(hdrMetrics).observe($hdr); else addEventListener('resize', hdrMetrics);
// ?draft previews the unsaved curation from the admin page (same browser) instead of curation.json.
const curation = () => { const dr = /[?&]draft\b/.test(location.search) && store.get('imr-curation-draft', null);
  return dr ? Promise.resolve(dr) : fetch('curation.json', {cache: 'no-cache'}).then(r => r.ok ? r.json() : {}).catch(() => ({})); };
const forms = () => fetch('forms.json?v=7').then(r => r.ok ? r.json() : {}).then(j => ({gf: j.gf || {}, form: j.form || {}, cf: j.cf || {}, forms: j.forms || [], gunsure: j.gunsure || {}})).catch(() => ({gf: {}, form: {}, cf: {}, forms: [], gunsure: {}}));
const json = u => fetch(u).then(r => r.ok ? r.json() : {}).catch(() => ({}));
Promise.all([fetch('data.json?v=20').then(r => r.json()), curation(), forms(), json('quality.json?v=1'), json('picks.json?v=1')]).then(([d, c, f, q, k]) => { RAW = d; CUR = c; FORMS = f; CFMAP = f.cf; AUTOQ = q.q || {}; PICKS = k; build(); route(); syncRetry(); loadStats(); if (window.tourFirst) tourFirst(); }).catch(() => { $v.innerHTML = '<p class="warn">Could not load the data. Check your connection and reload.</p>'; });
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
