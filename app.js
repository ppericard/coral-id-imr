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
const credit = p => p.imr ? `IMR Lecture 6, slide ${p.slide}` : `<i>${esc(p.t)}</i>${p.own ? ' <span class="own">Dauin</span>' : ''} · <a href="${esc(p.o)}" target="_blank" rel="noopener">${esc(p.a)}</a>`;
const allPhotos = g => VIEWS.flatMap(([v]) => (g.views[v] || []).map(p => ({...p, view: v})));
const cover = g => (g.views.wide && g.views.wide[0]) || allPhotos(g)[0];

/* ---------- shared bits ---------- */
function card(name){
  const g = DATA.gen[name], p = (g.views.macro && g.views.macro[0]) || cover(g);
  const im = p ? `<img class="ph" src="${img(p, 's')}" alt="${esc(name)}" loading="lazy">` : `<span class="ph none">no photo</span>`;
  return `<button class="card" type="button" data-g="${esc(name)}">${im}<span class="cap"><i>${esc(name)}</i><small>${g.n ? 'No. ' + g.n + ' · ' : '<b class="star">★ not surveyed</b> · '}${esc(g.fam)}</small><p>${esc(g.crit[0])}</p></span></button>`;
}
function bindCards(root = $v){ root.querySelectorAll('[data-g]').forEach(b => b.onclick = () => go('g-' + b.dataset.g)); }
function bindGo(root = $v){ root.querySelectorAll('[data-go]').forEach(b => b.onclick = () => go(b.dataset.go)); }

// Full-size viewer: tap any photo with data-zoom.
const lb = document.getElementById('lightbox');
function zoom(list, i){
  const show = () => {
    const p = list[i];
    lb.innerHTML = `<div class="lb-in"><img src="${img(p)}" alt="${esc(p.t || '')}"><p class="lb-cap">${p.genus ? `<b><i>${esc(p.genus)}</i></b> · ` : ''}${p.view ? esc(VIEWS.find(v => v[0] === p.view)[1]) + ' · ' : ''}${credit(p)}${p.src ? ` · <a href="${esc(p.src)}" target="_blank" rel="noopener">original</a>` : ''}</p>
      <div class="lb-nav">${list.length > 1 ? `<button type="button" data-d="-1" aria-label="Previous photo">‹</button><span>${i + 1} / ${list.length}</span><button type="button" data-d="1" aria-label="Next photo">›</button>` : ''}<button type="button" data-x aria-label="Close">Close</button></div></div>`;
    lb.querySelectorAll('[data-d]').forEach(b => b.onclick = e => { e.stopPropagation(); i = (i + Number(b.dataset.d) + list.length) % list.length; show(); });
    lb.querySelector('[data-x]').onclick = close;
  };
  const close = () => { lb.hidden = true; lb.innerHTML = ''; document.removeEventListener('keydown', key); };
  const key = e => { if (e.key === 'Escape') close(); if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { i = (i + (e.key === 'ArrowRight' ? 1 : -1) + list.length) % list.length; show(); } };
  lb.hidden = false; lb.onclick = e => { if (e.target === lb) close(); };
  document.addEventListener('keydown', key);
  show();
}

/* ---------- genera ---------- */
let azFam = null, azQ = '';
function viewGenera(){
  const fams = [...new Set(Object.values(DATA.gen).map(g => g.fam))].sort();
  $v.innerHTML = `<h2>The 39 genera on the IMR slate</h2>
  <p class="lede">34 surveyed genera plus 5 starred ones that IMR does not survey but that you need to rule out. Each sheet shows the colony, a closer view and the corallites.</p>
  <div class="tools"><input id="q" type="search" placeholder="Search a genus or a feature" value="${esc(azQ)}" aria-label="Search"></div>
  <div class="chips"><button class="chip" type="button" data-f="" aria-pressed="${!azFam}">All families</button><button class="chip" type="button" data-f="★" aria-pressed="${azFam === '★'}">★ Not surveyed</button>${fams.map(f => `<button class="chip" type="button" data-f="${f}" aria-pressed="${azFam === f}">${f}</button>`).join('')}</div>
  <div class="grid" id="azgrid"></div>`;
  const draw = () => {
    const q = azQ.toLowerCase();
    const names = Object.keys(DATA.gen).sort().filter(n => (!azFam || DATA.gen[n].fam === azFam || (azFam === '★' && !DATA.gen[n].n)) && (!q || (n + ' ' + DATA.gen[n].crit.join(' ') + ' ' + DATA.gen[n].imr.join(' ')).toLowerCase().includes(q)));
    document.getElementById('azgrid').innerHTML = names.map(card).join('') || '<p class="note">No genus matches.</p>';
    bindCards();
  };
  const qi = document.getElementById('q');
  qi.oninput = () => { azQ = qi.value; draw(); };
  $v.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { azFam = b.dataset.f || null; viewGenera(); });
  draw();
}

function viewGenus(name){
  const g = DATA.gen[name];
  if (!g) return viewGenera();
  const paths = DATA.key.flatMap(k => k.leaves.filter(l => l.g.includes(name)).map(l => ({k, l})));
  const flat = allPhotos(g).map(p => ({...p, genus: name}));
  const course = (DATA.course[name] || []).map(p => ({...p, genus: name}));
  const rows = VIEWS.map(([v, label]) => {
    const list = g.views[v] || [];
    return `<section class="vrow"><h3>${label}${list.length ? '' : ' <span class="gap">missing</span>'}</h3>${list.length ? `<div class="strip">${list.map(p => {
      const i = flat.findIndex(x => x.f === p.f);
      return `<figure><button type="button" class="zoom" data-z="${i}"><img src="${img(p, 's')}" srcset="${srcset(p)}" sizes="(max-width:700px) 86vw, 440px" alt="${esc(name)}, ${label.toLowerCase()} view" loading="lazy"></button><figcaption>${credit(p)}</figcaption></figure>`; }).join('')}</div>` : '<p class="note">No good photo yet for this view.</p>'}</section>`;
  }).join('');
  $v.innerHTML = `<div class="crumbs"><button type="button" data-back>‹ Back</button></div>
  <article class="sheet">
    <span class="fam">${g.n ? 'No. ' + g.n + ' on the slate · ' : ''}${esc(g.fam)}</span>
    <h2>${esc(name)}</h2>
    ${g.n ? '' : `<p class="warn"><b>★ Not surveyed by IMR.</b> It is on the slate so you don't mistake it for ${g.look.filter(n => DATA.gen[n].n).map(n => '<i>' + esc(n) + '</i>').join(', ')}, so you need to recognise it and set it aside.</p>`}
    ${rows}
    ${course.length ? `<section class="vrow"><h3>From the IMR lecture</h3><div class="strip">${course.map((p, i) => `<figure><button type="button" class="zoom" data-c="${i}"><img src="${img(p, 's')}" alt="${esc(name)}, lecture photo" loading="lazy"></button><figcaption>${credit(p)}</figcaption></figure>`).join('')}</div></section>` : ''}
    <div class="cols">
      <div>${g.imr.length ? `<h3>IMR lecture · group ${g.ig}</h3><p class="note">${esc(DATA.imrg[g.ig - 1].t)}</p><ul class="crit">${g.imr.map(c => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}${g.mn ? `<p class="note"><b>Lecture mnemonic:</b> ${esc(g.mn)}</p>` : ''}
        <h3>Coral Finder features</h3><ul class="crit">${g.crit.map(c => `<li>${esc(c)}</li>`).join('')}</ul>
        <h3>Don't confuse with</h3><div class="chips">${g.look.map(n => `<button class="chip" type="button" data-cmp="${esc(n)}">${esc(n)}</button>`).join('')}</div><p class="note">Opens a side-by-side comparison.</p></div>
      <div><h3>Possible growth forms (${new Set(paths.map(x => x.k.id)).size})</h3><div class="paths">${[...new Set(paths.map(x => x.k))].map(k => `<span class="note">${esc(k.name)}</span>`).join(' · ')}</div>
        <h3>Where it is in the key</h3><div class="paths">${paths.map(({k, l}) => `<button class="c-${k.color}" type="button" data-go="l-${l.id}">${esc(k.name)} › ${esc(leafLabel(l))}</button>`).join('')}</div>
        <h3>Coral Finder</h3><p class="note">Pages ${g.pages.join(', ')}</p></div>
    </div>
  </article>`;
  $v.querySelectorAll('[data-z]').forEach(b => b.onclick = () => zoom(flat, Number(b.dataset.z)));
  $v.querySelectorAll('[data-c]').forEach(b => b.onclick = () => zoom(course, Number(b.dataset.c)));
  $v.querySelectorAll('[data-cmp]').forEach(b => b.onclick = () => go('cmp-' + name + '|' + b.dataset.cmp));
  bindGo();
  $v.querySelector('[data-back]').onclick = () => history.length > 1 ? history.back() : go('genera');
}

/* ---------- compare ---------- */
function pairs(){
  const seen = new Set(), out = [];
  Object.keys(DATA.gen).sort().forEach(a => DATA.gen[a].look.forEach(b => { const k = [a, b].sort().join('|'); if (DATA.gen[b] && !seen.has(k)) { seen.add(k); out.push(k.split('|')); } }));
  return out;
}
function viewCompareList(){
  $v.innerHTML = `<h2>Look-alikes side by side</h2>
  <p class="lede">The pairs most often confused, each shown view by view with the features that decide.</p>
  <div class="pairs">${pairs().map(([a, b]) => `<button type="button" class="pair" data-go="cmp-${esc(a)}|${esc(b)}"><i>${esc(a)}</i> <span>vs</span> <i>${esc(b)}</i></button>`).join('')}</div>`;
  bindGo();
}
function viewCompare(a, b){
  const A = DATA.gen[a], B = DATA.gen[b];
  if (!A || !B) return viewCompareList();
  const col = (n, g) => `<div class="cmpcol"><h3><button type="button" class="linkish" data-g="${esc(n)}"><i>${esc(n)}</i></button>${g.n ? '' : ' ★'}</h3><p class="note">${esc(g.fam)}${g.ig ? ' · IMR group ' + g.ig : ''}</p><ul class="crit">${g.crit.map(c => `<li>${esc(c)}</li>`).join('')}</ul></div>`;
  const flat = [];
  const row = ([v, label]) => {
    const cell = (n, g) => { const p = (g.views[v] || [])[0]; if (!p) return '<div class="cmpph none">no photo</div>'; flat.push({...p, genus: n, view: v}); return `<button type="button" class="zoom cmpph" data-z="${flat.length - 1}"><img src="${img(p, 's')}" srcset="${srcset(p)}" sizes="(max-width:700px) 46vw, 460px" alt="${esc(n)}, ${label.toLowerCase()}" loading="lazy"></button>`; };
    return `<h3 class="cmplab">${label}</h3><div class="cmprow">${cell(a, A)}${cell(b, B)}</div>`;
  };
  $v.innerHTML = `<div class="crumbs"><button type="button" data-go="cmp">All pairs</button> › <i>${esc(a)}</i> vs <i>${esc(b)}</i></div>
  <h2><i>${esc(a)}</i> or <i>${esc(b)}</i>?</h2>
  ${VIEWS.map(row).join('')}
  <div class="cmprow text">${col(a, A)}${col(b, B)}</div>
  <p><button type="button" class="next" data-go="quiz-duel|${esc(a)}|${esc(b)}">Drill this pair</button></p>`;
  $v.querySelectorAll('[data-z]').forEach(x => x.onclick = () => zoom(flat, Number(x.dataset.z)));
  bindCards(); bindGo();
}

/* ---------- key (Coral Finder + IMR groups + traits) ---------- */
const groupOf = id => DATA.key.find(g => g.id === id[0]);
const leafOf = id => groupOf(id)?.leaves.find(l => l.id === id);
const pg = l => l.a === l.b ? 'p.' + l.a : 'p.' + l.a + '-' + l.b;
const leafLabel = l => l.t + (l.s ? ' · ' + l.s : '');
const subnav = cur => `<div class="chips sub">${[['key-imr', 'IMR lecture groups'], ['key', 'By colony form'], ['key-tr', 'By corallites']].map(([h, t]) => `<button class="chip" type="button" data-go="${h}" aria-pressed="${h === cur}">${t}</button>`).join('')}</div>`;

function viewKey(){
  $v.innerHTML = `${subnav('key')}<h2>What shape is the colony?</h2>
  <p class="lede">Pick the growth form, then the corallite size or type. The key follows the Coral Finder's front page and only shows genera on the IMR list.</p>
  <p class="warn"><b>Growth form is only a starting point.</b> Many genera take several forms, sometimes within a single colony: <i>Porites</i> shows up in 3 groups and 8 boxes of this key. Each genus is listed everywhere the Coral Finder shows it. To decide, look at the corallites.</p>
  <div class="groups">${DATA.key.map(g => { const n = new Set(g.leaves.flatMap(l => l.g)).size;
    return `<button class="group c-${g.color}" type="button" data-go="k-${g.id}"><b>${esc(g.name)}</b><span>${esc(g.sub)}</span><em>${n} IMR ${n > 1 ? 'genera' : 'genus'}</em></button>`; }).join('')}</div>`;
  bindGo();
}
function viewGroup(id){
  const g = groupOf(id);
  if (g.leaves.length === 1) return viewLeaf(g.leaves[0].id, true);
  $v.innerHTML = `<div class="crumbs"><button type="button" data-go="key">Key</button> › ${esc(g.name)}</div>
  <h2>${esc(g.name)}: what next?</h2><p class="lede">${esc(g.sub)}.</p>
  <div class="leaves">${g.leaves.map(l => `<button class="leaf c-${g.color}" type="button" data-go="l-${l.id}" ${l.g.length ? '' : 'disabled'}>
    <span class="t">${esc(l.t)}</span><span class="s">${esc(l.s || '')}</span>
    <span class="n">${l.g.length ? l.g.length + (l.g.length > 1 ? ' genera' : ' genus') + ': ' + l.g.map(esc).join(', ') : 'No IMR genus here'} · ${pg(l)}</span></button>`).join('')}</div>`;
  bindGo();
}
function viewLeaf(id, single){
  const g = groupOf(id), l = leafOf(id);
  $v.innerHTML = `<div class="crumbs"><button type="button" data-go="key">Key</button> › ${single ? esc(g.name) : `<button type="button" data-go="k-${g.id}">${esc(g.name)}</button> › ${esc(leafLabel(l))}`}</div>
  <h2>${l.g.length} candidate${l.g.length > 1 ? 's' : ''}</h2>
  <p class="lede">${esc(g.name)} · ${esc(leafLabel(l))}. Coral Finder ${pg(l)}, which also shows genera outside the IMR list.</p>
  <div class="grid">${l.g.map(card).join('')}</div>`;
  bindCards(); bindGo();
}
function viewIMR(){
  $v.innerHTML = `${subnav('key-imr')}<h2>IMR lecture groups</h2>
  <p class="lede">IMR Lecture 6 sorts the surveyed genera by corallite type, not by colony shape. Run through the four questions, then pick the matching group.</p>
  <ol class="tips">${DATA.tips.map(t => `<li>${esc(t)}</li>`).join('')}</ol>
  <details class="gloss"><summary>Coral anatomy terms</summary><dl>${DATA.terms.map(([t, d]) => `<dt>${esc(t)}</dt><dd>${esc(d)}</dd>`).join('')}</dl><p class="note">The oral disc and mouth belong to the living polyp; the other terms describe its skeleton. Sources: <a href="https://www.coralsoftheworld.org/page/glossary/" target="_blank" rel="noopener">Corals of the World glossary</a>, <a href="https://cdhc.noaa.gov/coral-biology/coral-skeleton/" target="_blank" rel="noopener">NOAA</a>.</p></details>
  ${DATA.imrg.map(gr => { const names = Object.keys(DATA.gen).filter(n => DATA.gen[n].ig === gr.n).sort();
    return `<section class="imrg"><h3><span class="gn">${gr.n}</span> ${esc(gr.t)}</h3><div class="grid">${names.map(card).join('')}</div></section>`; }).join('')}
  <section class="imrg"><h3><span class="gn">★</span> Not covered in the lecture</h3><p class="note">The starred genera on the slate, to rule out look-alikes.</p><div class="grid">${Object.keys(DATA.gen).filter(n => !DATA.gen[n].ig).sort().map(card).join('')}</div></section>`;
  bindCards(); bindGo();
}
let trSel = new Set();
function viewTraits(){
  $v.innerHTML = `${subnav('key-tr')}<h2>What do the corallites show?</h2>
  <p class="lede">Tick what you see, ignoring the colony's shape. Several picks within one section mean either/or; sections combine.</p>
  ${DATA.traits.map(c => `<fieldset class="trset"><legend>${esc(c.name)}</legend><div class="chips">${c.opts.map(o => `<button class="chip" type="button" data-t="${o.id}" aria-pressed="${trSel.has(o.id)}">${esc(o.t)}</button>`).join('')}</div></fieldset>`).join('')}
  <div class="count" id="trcount"></div><div class="grid" id="trgrid"></div>`;
  const draw = () => {
    const names = Object.keys(DATA.gen).sort().filter(n => DATA.traits.every(c => { const picked = c.opts.filter(o => trSel.has(o.id)).map(o => o.id); return !picked.length || picked.some(id => DATA.gen[n].tr.includes(id)); }));
    document.getElementById('trcount').textContent = trSel.size ? names.length + (names.length > 1 ? ' possible genera' : ' possible genus') : 'All 39 genera';
    document.getElementById('trgrid').innerHTML = names.map(card).join('') || '<p class="note">No IMR genus matches all of these. Remove a filter.</p>';
    bindCards();
  };
  $v.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { trSel.has(b.dataset.t) ? trSel.delete(b.dataset.t) : trSel.add(b.dataset.t); b.setAttribute('aria-pressed', String(trSel.has(b.dataset.t))); draw(); });
  bindGo(); draw();
}

/* ---------- quiz ---------- */
// Progress per genus {ok, ko, streak, conf}, kept in this browser only.
let P = store.get('imr-coral-progress', {}) || {};
const save = () => store.set('imr-coral-progress', P);
const st = n => P[n] || (P[n] = {ok: 0, ko: 0, streak: 0});
const Q = Object.assign({stars: true, view: 'any'}, store.get('imr-coral-quiz', {}));
const saveQ = () => store.set('imr-coral-quiz', Q);
let session = {ok: 0, n: 0}, last = null, duelPair = null;
const pool = () => Object.keys(DATA.gen).filter(n => (Q.stars || DATA.gen[n].n) && photosFor(n).length);
function photosFor(n){ const g = DATA.gen[n]; return Q.view === 'any' ? allPhotos(g) : (g.views[Q.view] || []).map(p => ({...p, view: Q.view})); }
// Unseen and often-missed genera come back more; a streak of 3+ makes a genus rare.
const weight = n => { const s = P[n]; if (!s) return 3; return (1 + 2 * s.ko) / (1 + s.ok) * (s.streak >= 3 ? 0.3 : 1) + 0.15; };
function weighted(list){ const w = list.map(weight), t = w.reduce((a, b) => a + b, 0); let r = Math.random() * t; for (let i = 0; i < list.length; i++) { r -= w[i]; if (r <= 0) return list[i]; } return list[list.length - 1]; }
function nextTarget(list){ let n, k = 0; do { n = weighted(list); } while (n === last && list.length > 1 && ++k < 10); last = n; return n; }
function level(n){
  const s = P[n]; if (!s || s.ok + s.ko === 0) return ['new', 'Not seen'];
  const r = s.ok / (s.ok + s.ko);
  if (s.streak >= 3 && r >= .75) return ['ok', 'Learned'];
  if (r < .5 || s.streak === 0) return ['weak', 'Review'];
  return ['mid', 'Learning'];
}
function quizNav(cur){
  return `<div class="chips sub">${[['quiz', 'Photo → genus'], ['quiz-duel', 'Look-alike duels'], ['quiz-course', 'Lecture photos'], ['quiz-board', 'To work on']].map(([h, t]) => `<button class="chip" type="button" data-go="${h}" aria-pressed="${h === cur}">${t}</button>`).join('')}</div>
  ${cur === 'quiz-board' ? '' : `<div class="opts">
    <label>View <select id="qview">${[['any', 'Any'], ...VIEWS].map(([v, t]) => `<option value="${v}" ${Q.view === v ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
    <button class="chip" type="button" id="qstars" aria-pressed="${Q.stars}">Include ★ genera</button></div>`}`;
}
function bindQuizNav(cur){
  bindGo();
  const v = document.getElementById('qview'); if (!v) return;
  v.onchange = () => { Q.view = v.value; saveQ(); route(); };
  document.getElementById('qstars').onclick = () => { Q.stars = !Q.stars; saveQ(); route(); };
}
function question(cur, target, choices, prompt, photos){
  const ph = pick(photos);
  $v.innerHTML = `${quizNav(cur)}<div class="q">
    <div class="score">This session: <b>${session.ok}/${session.n}</b></div>
    <p class="prompt">${prompt}</p>
    <div class="qph"><img src="${img(ph)}" alt="Coral to identify"></div>
    <div class="ans">${choices.map(c => `<button type="button" data-c="${esc(c)}">${esc(c)}</button>`).join('')}</div>
    <div id="after"></div></div>`;
  bindQuizNav(cur);
  $v.querySelectorAll('[data-c]').forEach(b => b.onclick = () => answer(cur, b.dataset.c, target, ph));
}
function answer(cur, c, target, ph){
  const good = c === target, s = st(target);
  session.n++; if (good) { session.ok++; s.ok++; s.streak++; } else { s.ko++; s.streak = 0; s.conf = s.conf || {}; s.conf[c] = (s.conf[c] || 0) + 1; }
  save();
  $v.querySelectorAll('[data-c]').forEach(b => { b.disabled = true; if (b.dataset.c === target) b.classList.add('ok'); else if (b.dataset.c === c) b.classList.add('ko'); });
    const g = DATA.gen[target];
  const vs = !good && DATA.gen[c] ? `<p class="vs">Why not <i>${esc(c)}</i>: ${esc(DATA.gen[c].crit[0])} <button type="button" class="linkish" data-go="cmp-${esc(target)}|${esc(c)}">Compare them</button></p>` : '';
  document.getElementById('after').innerHTML = `<div class="fb">
    <h3 class="${good ? 'ok' : 'ko'}">${good ? 'Yes' : 'No'}, it's <i>${esc(target)}</i>${g.n ? '' : ' (★ not surveyed)'}</h3>
    <ul>${g.crit.map(x => `<li>${esc(x)}</li>`).join('')}</ul>${g.imr.length ? `<p class="vs"><b>IMR lecture:</b> ${g.imr.map(esc).join(' ')}</p>` : ''}${g.mn ? `<p class="vs"><b>Mnemonic:</b> ${esc(g.mn)}</p>` : ''}${vs}</div>
    <p class="credit">${credit(ph)}</p>
    <button class="next" type="button" id="next">Next</button>`;
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
  question('quiz', t, shuffle([t, ...distractors(t, list)]), 'Which genus?', photosFor(t));
}
function quizCourse(){
  const list = pool(), C = DATA.course, names = Object.keys(C).filter(n => list.includes(n));
  const t = nextTarget(names);
  question('quiz-course', t, shuffle([t, ...distractors(t, list)]), 'Which genus? <span class="note">(photo from the IMR lecture)</span>', C[t]);
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
  const t = pick(pair), ph = photosFor(t).length ? photosFor(t) : allPhotos(DATA.gen[t]);
  question(a ? `quiz-duel|${a}|${b}` : 'quiz-duel', t, pair, `<i>${esc(pair[0])}</i> or <i>${esc(pair[1])}</i>?`, ph);
}
function quizBoard(){
  const order = {weak: 0, mid: 1, new: 2, ok: 3};
  const list = Object.keys(DATA.gen).filter(n => Q.stars || DATA.gen[n].n).sort((a, b) => order[level(a)[0]] - order[level(b)[0]] || weight(b) - weight(a) || a.localeCompare(b));
  const seen = list.filter(n => P[n] && P[n].ok + P[n].ko).length, acq = list.filter(n => level(n)[0] === 'ok').length;
  $v.innerHTML = `${quizNav('quiz-board')}<h2>${acq} of ${list.length} genera learned</h2>
  <p class="note">${seen} genera seen so far. Learned means at least 3 correct answers in a row and 75% success. Genera marked Review come up more often. Progress is stored in this browser only.</p>
  <div class="tablewrap"><table><thead><tr><th>Genus</th><th>Status</th><th>Success</th><th>Confused with</th></tr></thead><tbody>
  ${list.map(n => { const s = P[n] || {ok: 0, ko: 0}, tot = s.ok + s.ko, [cl, lb] = level(n);
    const conf = s.conf ? Object.entries(s.conf).sort((x, y) => y[1] - x[1]).slice(0, 2).map(([k, v]) => `<button type="button" class="linkish" data-go="cmp-${esc(n)}|${esc(k)}"><i>${esc(k)}</i></button> ×${v}`).join(', ') : '';
    return `<tr><td><button type="button" class="linkish" data-g="${esc(n)}"><i>${esc(n)}</i></button>${DATA.gen[n].n ? '' : ' ★'}</td><td><span class="lvl ${cl}">${lb}</span></td>
      <td>${tot ? `<div class="bar" title="${s.ok}/${tot}"><span style="width:${Math.round(100 * s.ok / tot)}%"></span></div><small>${s.ok}/${tot}</small>` : '<small>—</small>'}</td><td>${conf}</td></tr>`; }).join('')}
  </tbody></table></div>
  <p><button class="reset" type="button" id="reset">Reset progress</button></p>`;
  bindQuizNav('quiz-board'); bindCards();
  const rb = document.getElementById('reset');
  rb.onclick = () => { if (rb.dataset.armed) { P = {}; save(); quizBoard(); } else { rb.dataset.armed = '1'; rb.textContent = 'Confirm reset'; } };
}

/* ---------- routing ---------- */
function go(h){ if (decodeURIComponent(location.hash.slice(1)) === h) route(); else location.hash = h; }
function route(){
  const h = decodeURIComponent(location.hash.slice(1));
  const tab = h.startsWith('quiz') ? 'quiz' : h.startsWith('cmp') ? 'cmp' : (h.startsWith('key') || /^[kl]-/.test(h)) ? 'key' : 'genera';
  document.querySelectorAll('nav [data-tab]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tab === tab)));
  if (h === 'key') viewKey();
  else if (h === 'key-imr') viewIMR();
  else if (h === 'key-tr') viewTraits();
  else if (h.startsWith('k-') && groupOf(h.slice(2))) viewGroup(h.slice(2));
  else if (h.startsWith('l-') && leafOf(h.slice(2))) viewLeaf(h.slice(2), groupOf(h.slice(2)).leaves.length === 1);
  else if (h.startsWith('g-')) viewGenus(h.slice(2));
  else if (h === 'cmp') viewCompareList();
  else if (h.startsWith('cmp-')) viewCompare(...h.slice(4).split('|'));
  else if (h === 'quiz') quizPhoto();
  else if (h === 'quiz-course') quizCourse();
  else if (h === 'quiz-board') quizBoard();
  else if (h.startsWith('quiz-duel')) { const [, a, b] = h.split('|'); quizDuel(a, b); }
  else viewGenera();
  window.scrollTo(0, 0);
}
document.querySelectorAll('nav [data-tab]').forEach(b => b.onclick = () => go(b.dataset.tab === 'genera' ? 'genera' : b.dataset.tab === 'key' ? 'key-imr' : b.dataset.tab));
addEventListener('hashchange', route);
fetch('data.json').then(r => r.json()).then(d => { DATA = d; route(); }).catch(() => { $v.innerHTML = '<p class="warn">Could not load the data. Check your connection and reload.</p>'; });
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
