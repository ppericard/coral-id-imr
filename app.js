// IMR Coral ID: hash-routed single page. Data comes from data.json (built by make_site.py).
let DATA;
const $v = document.getElementById('view');
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
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
let RAW, CUR, FORMS = {}, AUTOQ = {}, PICKS = {};
function build(){ const d = structuredClone(RAW); applyCuration(d, CUR); filterOrigin(d); applyForms(d, CUR); applySlots(d, CUR); DATA = d; }
// Photos per context (applySlots). Pierre's rule: every IMR photo and every photo of his own is used, with no cap;
// photos from other iNat observers and approved Coral Finder book photos only fill a set that is short. Per genus
// and view: sheet = 3 featured + the other IMR/own photos (filled up to 6 in all); games = Easy (the featured),
// Medium (other good IMR/own photos, filled up to 4), Hard (poor ones, filled up to 4), levels adding up; Coral
// Finder (needs variety) = featured + 2 photos from other iNat observers + 3 approved book photos. Pierre's picks (feat, hide, quality, use) always win; Claude's suggestions
// (picks.json feat) come next, then quality. curation.json "use" {f: 'ref'|'game'} keeps a photo on the sheet only
// or in games only. Nothing is written back: photos left out simply stay unused.
const CAP = {feat: 3, sheet: 6, medium: 4, hard: 4, inat: 2, book: 3};
const qualOf = (c, f) => ((c && c.quality) || {})[f] || AUTOQ[f] || 2;
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
      const feat = pin.length ? pin : take([...hint, ...ranked], CAP.feat);
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
// Growth form of each photo (Coral Finder front-page form ids, "x" = form not visible): Pierre's choice in
// curation.json "form" wins over the first guess in forms.json. Stored on each photo as p.form (a string of ids).
function applyForms(d, c){
  const mine = (c && c.form) || {};
  const set = p => { const v = mine[p.f] || FORMS[p.f]; if (v) p.form = v; };
  Object.values(d.gen).forEach(g => ['views', 'more'].forEach(k => Object.values(g[k] || {}).forEach(L => L.forEach(set))));
  Object.values(d.course || {}).forEach(L => L.forEach(set));
}
// Photos of genus n that show growth form id (e.g. 'M'): colony views first, then closer views. Never a "form not
// visible" photo, a multi-coral photo or a Coral Finder book photo (they are not in views).
const formPhotos = (n, id) => { const g = DATA.gen[n]; return [...(g.views.wide || []), ...(g.views.medium || []), ...(DATA.course[n] || []).filter(p => p.v !== 'macro')].filter(p => !p.multi && (p.form || '').includes(id)); };

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
// The lecturers' own cues (IMR Lecture 6: slide text, review slides, presenter's notes), verbatim. They lead
// wherever a genus is taught or tested; Coral Finder criteria come after.
const slideRef = (k, L) => L && L.length ? `${k} ${L.join(', ')}` : k;
const tipSrc = (g, x) => x.startsWith('Review slide: ') ? [slideRef('Review slide', g.rsl), x.slice(14)] : x.startsWith("Instructor's notes: ") ? ["Presenter's notes", x.slice(20)] : ['', x];
// Full list: slide cues, then the review slide and the presenter's notes, each with its source.
const tipsList = (g, cls = '') => g.imr.length ? `<ul class="crit idtips${cls ? ' ' + cls : ''}">${g.imr.map(x => { const [k, t] = tipSrc(g, x); return `<li>${k ? `<b class="tsrc">${esc(k)}</b> ` : ''}${esc(t)}</li>`; }).join('')}</ul><p class="tref">IMR Lecture 6${g.sl ? ', ' + slideRef(g.sl.length > 1 ? 'slides' : 'slide', g.sl) : ''}</p>` : `<p class="note">Not on the lecture slides: see the Coral Finder below.</p>`;
// One line for cards and tiles: the slide cues only; genera the lecture skips fall back to the Coral Finder summary.
const tipsText = g => g.imr.length ? g.imr.filter(x => !/^(Review slide|Instructor's notes): /.test(x)).join(' ') : g.sum;
function viewTips(){
  const gr = DATA.imrg.map(x => ({...x, L: Object.keys(DATA.gen).filter(n => DATA.gen[n].ig === x.n)})).filter(x => x.L.length);
  const sel = location.hash.split('|')[1] || '';
  $v.innerHTML = `<h2>ID tips</h2>
  <p class="lede">What the IMR lecturers point out for each genus, in their own words: slide text, review slides and presenter's notes from Lecture 6.</p>
  <div class="tiphead"><ol class="qtiles" aria-label="IMR Lecture 6: questions to ask">${DATA.tips.map(t => `<li>${esc(t)}</li>`).join('')}</ol>
  <details class="gloss"><summary>Coral anatomy terms</summary><a class="glink" href="#lab-anatomy"><span class="hpv art">${window.homeArt ? homeArt('anatomy') : ''}</span><span><b>Corallite anatomy</b><small>Explore the parts of a corallite on a diagram ›</small></span></a><dl>${DATA.terms.map(([t, d, src]) => `<dt>${esc(t)}</dt><dd>${esc(d)}${src ? ` <small class="src">${esc(src)}</small>` : ''}</dd>`).join('')}</dl><p class="note">Wording from IMR Lecture 6 where the lecture defines the term; otherwise the <a href="https://www.coralsoftheworld.org/page/glossary/" target="_blank" rel="noopener">Corals of the World glossary</a>.</p></details></div>
  <div class="chips tipgr"><span class="label">IMR group</span><a class="chip" href="#tips" aria-pressed="${!sel}">All</a>${gr.map(x => `<a class="chip gchip" style="--g:${groupHue(x.n)}" href="#tips|${x.n}" aria-pressed="${sel == x.n}" title="${esc(x.t)}">${x.n}</a>`).join('')}</div>
  ${gr.filter(x => !sel || sel == x.n).map(x => `<section class="tipsec"><h3 class="gdiv" style="--g:${groupHue(x.n)}"><span class="gn">${x.n}</span>${esc(x.t)}</h3>
    ${x.L.map(n => { const g = DATA.gen[n], p = cover(g); return `<article class="tipg"><a href="#g-${esc(n)}" class="tipph">${p ? `<img src="${img(p, 's')}" alt="${esc(n)}" loading="lazy">` : ''}<i>${esc(n)}</i></a><div>${tipsList(g)}${lookOf(n).length ? `<p class="note">Don't confuse with ${lookOf(n).map(b => `<a href="#cmp-${esc(n)}|${esc(b)}"><i>${esc(b)}</i></a>`).join(', ')}</p>` : ''}</div></article>`; }).join('')}</section>`).join('')}`;
}

/* ---------- genera ---------- */
let azFam = null, azQ = '';
// Genera order: 'lecture' (IMR Lecture 6 groups, default) or 'slate' (numbers on the IMR slate).
let azOrder = (() => { try { return localStorage.getItem('imr-coral-order') || 'lecture'; } catch (e) { return 'lecture'; } })();
function viewGenera(){
  const fams = [...new Set(Object.values(DATA.gen).map(g => g.fam))].sort();
  $v.innerHTML = `<h2>The 39 genera on the IMR slate</h2>
  <p class="lede">34 surveyed genera plus 5 starred ones (★) to recognise and rule out. Colours mark the confusion groups from the IMR lecture: genera in the same group are the ones to tell apart. The lecturers' cues for each genus are under <a href="#tips">ID tips</a>.</p>
  <div class="tools"><input id="q" type="search" placeholder="Search a genus or a feature" value="${esc(azQ)}" aria-label="Search">
    <select id="fam" aria-label="Family"><option value="">All families</option><option value="★"${azFam === '★' ? ' selected' : ''}>★ Not surveyed</option>${fams.map(f => `<option${azFam === f ? ' selected' : ''}>${esc(f)}</option>`).join('')}</select>
    <div class="seg" role="group" aria-label="Order">${[['lecture', 'Lecture', ' groups'], ['slate', 'Slate', ' numbers']].map(([k, t, x]) => `<button type="button" data-o="${k}" aria-pressed="${azOrder === k}">${t}<span class="wide">${x}</span></button>`).join('')}</div></div>
  <div class="grid" id="azgrid"></div>`;
  const draw = () => {
    const q = azQ.toLowerCase();
    const names = Object.keys(DATA.gen).filter(n => (!azFam || DATA.gen[n].fam === azFam || (azFam === '★' && !DATA.gen[n].n)) && (!q || (n + ' ' + DATA.gen[n].crit.join(' ') + ' ' + DATA.gen[n].imr.join(' ')).toLowerCase().includes(q)));
    let html;
    if (azOrder === 'lecture') {
      const gi = n => shownGroup(n) || 99;
      names.sort((a, b) => gi(a) - gi(b) || slateIdx(a) - slateIdx(b));
      html = names.map((n, i) => { const k = shownGroup(n), gr = DATA.imrg.find(x => x.n === k);
        const head = i && gi(names[i - 1]) === gi(n) ? '' : gr
          ? `<h3 class="gdiv" style="--g:${groupHue(gr.n)}"><span class="gn">${gr.n}</span>${esc(gr.t)}</h3>`
          : '<h3 class="gdiv"><span class="gn">★</span>Not covered in the lecture</h3>';
        return head + card(n, 'stripe'); }).join('');
    } else html = names.map(n => card(n, true)).join('');
    document.getElementById('azgrid').innerHTML = html || '<p class="note">No genus matches.</p>';
    bindCards();
  };
  const qi = document.getElementById('q');
  qi.oninput = () => { azQ = qi.value; draw(); };
  document.getElementById('fam').onchange = e => { azFam = e.target.value || null; draw(); };
  $v.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { azOrder = b.dataset.o; try { localStorage.setItem('imr-coral-order', azOrder); } catch (e) {} viewGenera(); });
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
    const feat = g.sl[v].feat, more = g.sl[v].more;
    return `<section class="vrow"><h3>${label}${feat.length ? '' : ' <span class="gap">missing</span>'}</h3>${feat.length ? `<div class="strip">${feat.map(fig).join('')}</div>` : '<p class="note">No good photo yet for this view.</p>'}
      ${more.length ? `<details class="more"><summary>${more.length} more ${label.toLowerCase()} photo${more.length > 1 ? 's' : ''}</summary><div class="strip">${more.map(fig).join('')}</div></details>` : ''}</section>`;
  }).join('');
  // Name, slate number and family sit in the sticky header bar (ctxBar), not here.
  $v.innerHTML = `<article class="sheet">
    ${g.imr.length ? '' : `<p class="lede keyid">${esc(g.sum)}</p>`}
    ${g.n ? '' : `<p class="warn"><b>★ Not surveyed by IMR.</b> It is on the slate so you don't mistake it for ${g.look.filter(n => DATA.gen[n].n).map(n => '<i>' + esc(n) + '</i>').join(', ')}, so you need to recognise it and set it aside.</p>`}
    <div class="hero">
      ${cv ? `<button type="button" class="zoom hero-ph" data-z="${ci}"><img src="${img(cv)}" alt="${esc(name)}"></button>` : ''}
      <div class="idbox">
        ${g.imr.length ? `<h3>ID tips (IMR) <span class="pg">group ${g.ig}: ${esc(DATA.imrg[g.ig - 1].t)}</span></h3>${tipsList(g)}` : ''}${g.mn ? `<p class="note"><b>Mnemonic:</b> ${esc(g.mn)}</p>` : ''}
        <h3>Coral Finder features</h3><ul class="crit">${g.crit.map(c => `<li>${esc(c)}</li>`).join('')}</ul>
        ${g.check ? `<p class="note check"><b>To check with an IMR trainer:</b> ${esc(g.check)}</p>` : ''}
        ${g.info ? `<div class="note osrc"><b>Other sources:</b><ul class="srcs">${g.info.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
        <h3>Don't confuse with</h3><div class="chips">${lookOf(name).map(n => `<a class="chip" href="#cmp-${esc(name)}|${esc(n)}" title="Side-by-side comparison">${esc(n)}</a>`).join('')}</div>
        <h3>In the key <span class="pg">Coral Finder p. ${g.pages.join(', ')}</span></h3><div class="kpick">${paths.map(({k, l}) => `<a class="c-${k.color}" href="#l-${l.id}">${esc(k.name)} › ${esc(leafLabel(l))}</a>`).join('')}</div>
        <p class="note refs"><b>References:</b> ${g.imr.length ? 'IMR Lecture 6 · ' : ''}Coral Finder 2022 (R. Kelley) p. ${g.pages.join(', ')} · <a href="https://www.marinespecies.org/aphia.php?p=taxlist&amp;tName=${encodeURIComponent(name)}" target="_blank" rel="noopener">WoRMS</a> · <a href="https://www.inaturalist.org/taxa/search?q=${encodeURIComponent(name)}" target="_blank" rel="noopener">iNaturalist</a></p>
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
// Look-alikes page: one panel per IMR lecture group (genera not in the lecture last), every genus side by
// side at the same size and in the same view, with its deciding feature. Below, the Coral Finder look-alike
// pairs: inside the group, then with genera of other groups. The reader's quiz mix-ups come first, in red.
function viewCompareList(){
  const G = DATA.gen, tag = g => g.n ? 'No. ' + g.n : '★';
  const chip = ([a, b]) => { const m = mixedUp(a, b); return `<a class="chip${m ? ' mix' : ''}" href="#cmp-${esc(a)}|${esc(b)}"><i>${esc(a)}</i>&nbsp;vs&nbsp;<i>${esc(b)}</i>${m ? ` ×${m}` : ''}</a>`; };
  const byMix = (x, y) => mixedUp(...y) - mixedUp(...x);
  const grp = (t, L) => {
    const inside = [], outside = [];
    L.forEach((a, i) => lookOf(a).forEach(b => { if (!L.includes(b)) outside.push([a, b]); else if (L.indexOf(b) > i) inside.push([a, b]); }));
    inside.sort(byMix); outside.sort(byMix);
    const mine = [...inside, ...outside].reduce((s, p) => s + mixedUp(...p), 0);
    return `<section class="lfam"><h3>${t}<small>${L.length} ${L.length > 1 ? "genera" : "genus"}${mine ? ` · <b class="bad">you mixed some up ×${mine}</b>` : ''}</small></h3>
      <div class="lrow">${L.map(n => `<a class="lt" href="#g-${esc(n)}">${viewShot(n, cmpView)}<span><i>${esc(n)}</i><small>${G[n].n || G[n].ig ? tag(G[n]) : starNote(n)} · ${esc(G[n].fam)}</small><span class="psum">${esc(tipsText(G[n]))}</span></span></a>`).join('')}</div>
      ${inside.length ? `<p class="lpairs"><span class="label">Compare</span>${inside.map(chip).join('')}</p>` : ''}
      ${outside.length ? `<p class="lpairs"><span class="label">Other groups</span>${outside.map(chip).join('')}</p>` : ''}
      ${cmpShots(L)}</section>`; };
  const none = bySlate(Object.keys(G).filter(n => !shownGroup(n)));
  $v.innerHTML = `<h2>Look-alikes</h2>
  <p class="lede">Genera by IMR lecture group, compared in the same view with what sets each apart. The pairs to compare are the Coral Finder look-alikes; open one to see all three views side by side. Each genus sheet also lists its own look-alikes.</p>
  <div class="seg-row"><span class="label">Show</span>${viewSeg()}</div>
  ${DATA.imrg.map(x => grp(`<span class="gn">${x.n}</span> ${esc(x.t)}`, bySlate(Object.keys(G).filter(n => shownGroup(n) === x.n)))).join('')}
  ${none.length ? grp('<span class="gn">★</span> Not covered in the lecture', none) : ''}`;
  bindViewSeg(() => { const y = window.scrollY; viewCompareList(); window.scrollTo(0, y); });
}
function viewCompare(a, b){
  const A = DATA.gen[a], B = DATA.gen[b];
  if (!A || !B) return viewCompareList();
  const col = (n, g) => `<div class="cmpcol"><h3><a class="linkish" href="#g-${esc(n)}"><i>${esc(n)}</i></a>${g.n ? '' : ' ★'}</h3><p class="note">${esc(g.fam)}${g.ig ? ' · IMR group ' + g.ig : ''}</p>${g.imr.length ? `<h4>ID tips (IMR)</h4>${tipsList(g)}` : ''}<h4>Coral Finder</h4><ul class="crit">${g.crit.map(c => `<li>${esc(c)}</li>`).join('')}</ul></div>`;
  const flat = [];
  const row = ([v, label]) => {
    const cell = (n, g) => { const p = (g.views[v] || [])[0]; if (!p) return `<div class="cmpph none">${g.levels === 2 ? 'no separate level' : 'no photo'}</div>`; flat.push({...p, genus: n, view: v}); return `<button type="button" class="zoom cmpph" data-z="${flat.length - 1}"><img src="${img(p, 's')}" srcset="${srcset(p)}" sizes="(max-width:700px) 46vw, 460px" alt="${esc(n)}, ${label.toLowerCase()}" loading="lazy"></button>`; };
    return `<h3 class="cmplab">${label}</h3><div class="cmprow">${cell(a, A)}${cell(b, B)}</div>`;
  };
  $v.innerHTML = `${VIEWS.filter(([v]) => (A.views[v] || []).length || (B.views[v] || []).length).map(row).join('')}
  <div class="cmprow text">${col(a, A)}${col(b, B)}</div>
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
const Q = Object.assign({view: 'any', level: 'medium'}, store.get('imr-coral-quiz', {}), {stars: true});  // starred genera are always asked (Pierre)
const saveQ = () => store.set('imr-coral-quiz', Q);
let session = {ok: 0, n: 0}, last = null, duelPair = null;
const pool = () => Object.keys(DATA.gen).filter(n => (Q.stars || DATA.gen[n].n) && photoSet(n).shown.length);
// A quiz question always shows one colony view and one closer view; the corallites come as a hint.
// Quiz views come from one observation (same colony) whenever possible: pick at random among
// the observations covering the most views, and fill any missing view from another observation.
function photoSet(n){
  const g = DATA.gen[n], two = g.levels === 2, need = two ? ['wide', 'macro'] : ['wide', 'medium', 'macro'];
  const obs = {};
  need.forEach(v => gamePics(n, v, Q.level).forEach(p => { const k = p.o || p.f; (obs[k] = obs[k] || {})[v] = (obs[k][v] || []).concat([p]); }));
  const groups = Object.values(obs), cov = o => need.filter(v => o[v]).length, best = Math.max(0, ...groups.map(cov));
  const o = best ? pick(groups.filter(x => cov(x) === best)) : {};
  const one = v => { const L = o[v] || gamePics(n, v, Q.level); return L.length ? {...pick(L), view: v} : null; };
  // Two-level genera (e.g. Plerogyra, mushroom corals) show colony + close-up, with no hint.
  if (two) { const m = one('macro'); return {shown: [one('wide'), m && {...m, view: 'close'}].filter(Boolean), hint: null}; }
  return {shown: [one('wide'), one('medium')].filter(Boolean), hint: one('macro')};
}
// Unseen and often-missed genera come back more; a streak of 3+ makes a genus rare.
const weight = n => { const s = P[n]; if (!s) return 3; return (1 + 2 * s.ko) / (1 + s.ok) * (s.streak >= 3 ? 0.3 : 1) + 0.15; };
function weighted(list){ const w = list.map(weight), t = w.reduce((a, b) => a + b, 0); let r = Math.random() * t; for (let i = 0; i < list.length; i++) { r -= w[i]; if (r <= 0) return list[i]; } return list[list.length - 1]; }
function nextTarget(list){ let n, k = 0; do { n = weighted(list); } while (n === last && list.length > 1 && ++k < 10); last = n; return n; }
// Status from the last RECENT answers (Pierre: no time criteria, reachable in one sitting), plus two milestones.
// Learned: at most 1 mistake in the last 5, last answer right, once right with the corallites in view,
// once right in a look-alike duel (when the genus has look-alikes). Review: 2+ mistakes in the last 5, or last answer wrong.
const RECENT = 5;
const recent = n => { const s = P[n] || {}; return s.h ? s.h.slice(-RECENT) : ''; };
const misses = h => [...h].filter(x => x === '0').length;
const hasDuel = n => DATA.gen[n].look.some(b => DATA.gen[b]);
function missing(n){
  const s = P[n] || {}, h = recent(n), m = [];
  if (h.length < RECENT) m.push(`${RECENT - h.length} more answer${RECENT - h.length > 1 ? 's' : ''}`);
  if (!s.cor) m.push('right once with the corallites photo open');
  if (hasDuel(n) && !s.du) m.push('right once in a look-alike duel');
  return m;
}
function level(n){
  const s = P[n]; if (!s || s.ok + s.ko === 0) return ['new', 'Not seen'];
  const h = recent(n);
  if (!h) return s.streak === 0 ? ['weak', 'Review'] : ['mid', 'Learning'];  // progress saved before this rule
  if (h.slice(-1) === '0' || misses(h) >= 2) return ['weak', 'Review'];
  if (!missing(n).length) return ['ok', 'Learned'];
  return ['mid', 'Learning'];
}
function quizNav(){ return ''; }
function bindQuizNav(){ bindGo(); }
function question(cur, target, choices, prompt, set){
  const ph = set.shown, lab = VIEW_LABEL;
  let answered = false, hintShown = false;
  const fig = (p, k) => `<figure class="qph"><button type="button" class="zoom" data-q="${k}" aria-label="Enlarge photo"><img src="${img(p)}" alt="Coral to identify${p.view ? ', ' + lab[p.view].toLowerCase() + ' view' : ''}"></button>${p.view ? `<figcaption>${lab[p.view]}</figcaption>` : ''}</figure>`;
  // One screen, no scrolling: the photos fill the stage (sized to the window), choices and feedback sit beside them.
  $v.innerHTML = `<div class="q">
    <div class="qstage">${ph.map(fig).join('')}</div>
    <aside class="qside">
      ${cur.startsWith('quiz-course') ? '' : `<div class="seg qlvl" role="group" aria-label="Photo set">${LEVELS.map(([k, t]) => `<button type="button" data-lvl="${k}" aria-pressed="${Q.level === k}" title="${k === 'easy' ? 'The photos on the genus sheets' : k === 'medium' ? 'Adds other good photos' : 'Adds harder photos'}">${t}</button>`).join('')}</div>`}
      <div class="qtop"><p class="prompt">${prompt}</p><span class="score" title="Right answers this session">${session.ok}/${session.n}</span>${quizNav(cur)}</div>
      <div class="ans">${choices.map((c, i) => `<button type="button" data-c="${esc(c)}"><kbd>${i + 1}</kbd>${esc(c)}</button>`).join('')}</div>
      ${set.hint ? '<button type="button" class="linkish" id="hintb">Show the corallites (hint)</button>' : ''}
      <div id="after"></div>
    </aside></div>`;
  bindQuizNav(cur);
  $v.querySelectorAll('[data-lvl]').forEach(b => b.onclick = () => { Q.level = b.dataset.lvl; saveQ(); route(); });
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
  q.style.setProperty('--qh', Math.max(260, innerHeight - q.getBoundingClientRect().top - window.scrollY - 16) + 'px');
  const st = q.querySelector('.qstage'), n = st.children.length, W = st.clientWidth, H = st.clientHeight;
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
  s.h = ((s.h || '') + (good ? 1 : 0)).slice(-10);  // recent results, newest last
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
    ${g.imr.length ? `<p class="label">ID tips (IMR)</p>${tipsList(g, 'imrfb')}` : `<p class="keyid">${esc(g.sum)}</p>`}${g.mn ? `<p class="vs"><b>Mnemonic:</b> ${esc(g.mn)}</p>` : ''}${vs}
    <details class="more"><summary>Coral Finder</summary>${g.imr.length ? `<p class="vs">${esc(g.sum)}</p>` : ''}<ul>${g.crit.map(x => `<li>${esc(x)}</li>`).join('')}</ul><p class="credit">${ph.map(credit).join('<br>')}</p></details></div>
    <button class="next" type="button" id="next">Next <kbd>↵</kbd></button>`;
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
function quizCourse(){
  const list = pool(), C = DATA.course, names = Object.keys(C).filter(n => list.includes(n) && C[n].some(p => !p.multi));
  const t = nextTarget(names);
  question('quiz-course', t, shuffle([t, ...distractors(t, list)]), 'Which genus?', {shown: [pick(C[t].filter(p => !p.multi))], hint: null});
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
// red ring = review) beside a side column with the overall ring, what to review first, sign-in and backup.
function quizBoard(){
  const list = Object.keys(DATA.gen).filter(n => Q.stars || DATA.gen[n].n).sort((a, b) => slateIdx(a) - slateIdx(b));
  const lv = Object.fromEntries(list.map(n => [n, level(n)]));
  const count = k => list.filter(n => lv[n][0] === k).length;
  const LV = [['ok', 'Learned'], ['mid', 'Learning'], ['weak', 'Review'], ['new', 'Not seen']];
  const weak = list.filter(n => lv[n][0] === 'weak').sort((a, b) => weight(b) - weight(a));
  let deg = 0; const ring = LV.map(([k]) => { const d = 360 * count(k) / list.length, c = `var(--${k === 'ok' ? 'good' : k === 'mid' ? 'accent' : k === 'weak' ? 'bad' : 'line'}) ${deg}deg ${deg + d}deg`; deg += d; return c; }).join(',');
  const tile = n => { const g = DATA.gen[n], p = cover(g), s = P[n] || {ok: 0, ko: 0}, [cl, lb] = lv[n];
    return `<a class="pw ${cl}" href="#g-${esc(n)}" title="${tip(n)}">${p ? `<img src="${img(p, 's')}" alt="${esc(n)}" loading="lazy">` : ''}<span><i>${esc(n)}</i>${g.n ? '' : ' ★'}</span></a>`; };
  const conf = list.map(n => { const c = (P[n] || {}).conf; if (!c) return null; const [o, k] = Object.entries(c).sort((x, y) => y[1] - x[1])[0]; return [n, o, k]; }).filter(Boolean).sort((x, y) => y[2] - x[2]).slice(0, 3);
  // Three ways to show the same progress (Pierre wants to try each): photos, slate numbers, lecture groups.
  const tip = n => { const s = P[n] || {ok: 0, ko: 0}, m = lv[n][0] === 'mid' ? missing(n) : []; return `${esc(n)}: ${lv[n][1]}${s.ok + s.ko ? ` (${s.ok}/${s.ok + s.ko} right)` : ''}${m.length ? '. Still needed: ' + esc(m.join('; ')) : ''}`; };
  const gi = n => shownGroup(n) || 99, groups = [...new Set(list.map(gi))].sort((a, b) => a - b);
  const VIEWS = {
    photos: () => `<div class="pgrid pwall">${list.map(tile).join('')}</div>`,
    slate: () => `<div class="pgrid pslate">${list.map(n => `<a class="ps ${lv[n][0]}" href="#g-${esc(n)}" title="${tip(n)}"><b>${DATA.gen[n].n || '★'}</b><i>${esc(n)}</i></a>`).join('')}</div>`,
    groups: () => `<div class="pgroups">${groups.map(k => { const gr = DATA.imrg.find(x => x.n === k), L = list.filter(n => gi(n) === k);
      return `<div class="pgr" style="--g:${gr ? groupHue(gr.n) : 200}"><span class="gn" title="${gr ? esc(gr.t) : 'Not covered in the lecture'}">${gr ? gr.n : '★'}</span><span class="pgt">${gr ? esc(gr.t) : 'Not covered in the lecture'}</span>
        <span class="pseg">${L.map(n => `<a class="${lv[n][0]}" href="#g-${esc(n)}" title="${tip(n)}"><i>${esc(n)}</i></a>`).join('')}</span><small>${L.filter(n => lv[n][0] === 'ok').length}/${L.length}</small></div>`; }).join('')}</div>`
  };
  let pv = store.get('imr-coral-pview', 'photos'); if (!VIEWS[pv]) pv = 'photos';
  $v.innerHTML = `<p class="lede">Three views of the same progress, pick the one you like. Green: learned. Teal: learning. Red: to review (comes up more often in the quiz). Grey: not seen yet. Status comes from your last 5 answers for each genus (any quiz, duels included). Learned: at most 1 mistake in the last 5, the last answer right, and two milestones: right once with the corallites photo open, and right once in a look-alike duel. Hover a genus to see what it still needs. Review: 2 or more mistakes in the last 5, or the last answer wrong. Click a genus to open its sheet.</p>
  <div class="pgame pboard"><div class="pgwrap"></div>
  <aside class="gside">
    <div class="seg" role="group" aria-label="View">${[['photos', 'Photos'], ['slate', 'Slate'], ['groups', 'Groups']].map(([k, t]) => `<button type="button" data-pv="${k}" aria-pressed="${pv === k}">${t}</button>`).join('')}</div>
    <div class="pring" style="background:conic-gradient(${ring})"><span><b>${count('ok')}</b>/${list.length}<small>learned</small></span></div>
    <p class="plegend">${LV.map(([k, t]) => `<span class="lvl ${k}">${t} ${count(k)}</span>`).join(' ')}</p>
    ${weak.length ? `<div><h3 class="label">Review first</h3><p class="chips">${weak.slice(0, 4).map(n => `<a class="chip" href="#g-${esc(n)}"><i>${esc(n)}</i></a>`).join('')}</p></div>` : ''}
    ${conf.length ? `<div><h3 class="label">Often mixed up</h3><p class="chips">${conf.map(([n, o, k]) => `<a class="chip" href="#cmp-${esc(n)}|${esc(o)}" title="Compare side by side"><i>${esc(n)}</i> / <i>${esc(o)}</i> ×${k}</a>`).join('')}</p></div>` : ''}
    <p><a class="chip go" href="#quiz">Practise now</a></p>
    ${SYNC_URL ? '<section class="sync" id="sync"></section>' : ''}
    <details class="saveprog"><summary>Backup or reset progress</summary><p class="note">Progress is saved in this browser, on this device. Save it to a file to keep a backup or move it to another device.</p>
      <button class="chip" type="button" id="pexp">Save to a file</button> <button class="chip" type="button" id="pload">Load a file</button><input type="file" id="pimp" accept=".json,application/json" hidden> <span class="note" id="pmsg" role="status"></span>
      <p><button class="reset" type="button" id="reset">Reset progress</button></p></details>
  </aside></div>`;
  bindQuizNav('quiz-board');
  bindProgFile(); bindSync();
  const rb = document.getElementById('reset');
  rb.onclick = () => { if (rb.dataset.armed) { P = {}; store.set('imr-coral-reset', new Date().toISOString()); save(); route(); } else { rb.dataset.armed = '1'; rb.textContent = 'Confirm reset'; } };
  const wrap = $v.querySelector('.pboard .pgwrap');
  const show = () => { wrap.innerHTML = VIEWS[pv](); $v.querySelectorAll('[data-pv]').forEach(b => b.setAttribute('aria-pressed', b.dataset.pv === pv));
    requestAnimationFrame(() => { const g = wrap.firstChild; if (g.classList.contains('pgrid')) fitTiles(g, pv === 'slate' ? 8 : 6); else g.style.height = Math.max(320, innerHeight - g.getBoundingClientRect().top - window.scrollY - 16) + 'px'; }); };
  $v.querySelectorAll('[data-pv]').forEach(b => b.onclick = () => { pv = b.dataset.pv; store.set('imr-coral-pview', pv); show(); });
  show();
}

// Header progress pill: genera learned, always in view; the page itself is #progress.
const $prog = document.getElementById('prog');
function showProg(){ if (!DATA) return; const n = Object.keys(DATA.gen); document.getElementById('progn').textContent = `${n.filter(x => level(x)[0] === 'ok').length}/${n.length}`;
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
    const mine = (l.ok || 0) + (l.ko || 0) !== (b.ok || 0) + (b.ko || 0);
    out.streak = mine ? l.streak || 0 : r.streak || 0;
    if (mine && l.h) out.h = l.h;
    if (l.cor || r.cor) out.cor = 1; if (l.du || r.du) out.du = 1;
    const conf = {...(r.conf || {})};
    Object.keys(l.conf || {}).forEach(k => { const v = (conf[k] || 0) + l.conf[k] - ((b.conf || {})[k] || 0); if (v > 0) conf[k] = v; else delete conf[k]; });
    if (Object.keys(conf).length) out.conf = conf; else delete out.conf;
    if (out.ok + out.ko) P[g] = out; else delete P[g];
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
function bindSync(){
  showProg();
  const box = document.getElementById('sync'); if (!box) return;
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
function photoSize(){ return sizePrefs()[pageKey()] || 'm'; }
const SIZES = {card: {s: '240px', m: '360px', l: '520px'}, strip: {s: '(max-width:700px) 46vw, 260px', m: '(max-width:700px) 92vw, 420px', l: '(max-width:700px) 92vw, 640px'}};
const sizesFor = kind => SIZES[kind][photoSize()];
function applySize(){ const s = photoSize(), on = SIZE_PAGES.includes(pageKey()); document.documentElement.dataset.size = s;
  const sz = document.getElementById('size'); sz.style.visibility = on ? '' : 'hidden'; sz.setAttribute('aria-hidden', String(!on)); document.querySelectorAll('img[data-sz]').forEach(i => i.sizes = sizesFor(i.dataset.sz)); document.querySelectorAll('#size button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.size === s))); }
function showOrigin(){ document.querySelectorAll('#origin button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.origin === origin))); }
// On phones each group shows only its current button: tapping it moves to the next one.
const phone = () => matchMedia('(max-width:640px)').matches;
const cycle = b => phone() && b.getAttribute('aria-pressed') === 'true' ? (b.nextElementSibling || b.parentNode.firstElementChild) : b;
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
  learn: [['genera', 'Genera', 'The 39 genus sheets'], ['tips', 'ID tips', 'What the IMR lecturers point out'], ['cmp', 'Look-alikes', 'Confused pairs side by side']],
  practice: [['quiz', 'Photo → genus', 'Name the genus'], ['quiz-duel', 'Look-alike duels', 'Two genera often confused'], ['quiz-course', 'Lecture photos', 'Photos from the IMR course'], ['pairs', 'Memory', 'Match colony and corallites'], ['reveal', 'Blur reveal', 'Name it before it sharpens']],
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
  resetHelp();
  showProg(); tab === 'progress' ? $prog.setAttribute('aria-current', 'page') : $prog.removeAttribute('aria-current');
  document.querySelectorAll('nav [data-tab]').forEach(b => b.dataset.tab === tab ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current'));
  showModes(tab, h);
  // The old growth-form key and corallite filters live on in the Coral Finder: their links open it with the same clues ticked.
  if (h === 'key' || h === 'key-tr') location.replace('#finder');
  else if (h.startsWith('k-') && groupOf(h.slice(2))) location.replace('#finder|form=' + h.slice(2));
  else if (h.startsWith('l-') && leafOf(h.slice(2))) { const l = h.slice(2), one = groupOf(l).leaves.length === 1; location.replace('#finder|form=' + l[0] + (one ? '' : ';box=' + l)); }
  else if (h === 'key-imr') { azOrder = 'lecture'; location.replace('#genera'); }
  else if (h.startsWith('g-')) viewGenus(h.slice(2));
  else if (h === 'tips' || h.startsWith('tips|')) viewTips();
  else if (h === 'cmp') viewCompareList();
  else if (h.startsWith('cmp-')) viewCompare(...h.slice(4).split('|'));
  else if (h === 'quiz') quizPhoto();
  else if (h === 'quiz-course') quizCourse();
  else if (h === 'progress' || h === 'quiz-board') quizBoard();
  else if (h.startsWith('quiz-duel')) { const [, a, b] = h.split('|'); quizDuel(a, b); }
  else if (h.startsWith('lab') && window.viewLab) viewLab(h);
  else if (window.labTool && labTool(h)) {}
  else if ((!h || h === 'home') && window.viewHome) viewHome();
  else viewGenera();
  window.scrollTo(0, 0);
  pageHelp();
  hdrMetrics();
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
  if (intro.length) { $helpbox.innerHTML = (h2 ? `<h3>${esc(h2.textContent)}</h3>` : '') + intro.map(x => x.outerHTML).join(''); $help.hidden = false; }
  found.forEach(x => x.remove());
}
function resetHelp(){ $helpbox.hidden = true; $helpbox.innerHTML = ''; $help.hidden = true; $help.setAttribute('aria-expanded', 'false'); }
new MutationObserver(pageHelp).observe($v, {childList: true, subtree: true});
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
const forms = () => fetch('forms.json?v=3').then(r => r.ok ? r.json() : {}).then(j => j.form || {}).catch(() => ({}));
const json = u => fetch(u).then(r => r.ok ? r.json() : {}).catch(() => ({}));
Promise.all([fetch('data.json?v=17').then(r => r.json()), curation(), forms(), json('quality.json?v=1'), json('picks.json?v=1')]).then(([d, c, f, q, k]) => { RAW = d; CUR = c; FORMS = f; AUTOQ = q.q || {}; PICKS = k; build(); route(); syncRetry(); }).catch(() => { $v.innerHTML = '<p class="warn">Could not load the data. Check your connection and reload.</p>'; });
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
