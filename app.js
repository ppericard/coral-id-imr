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
// Card photo: the one picked per genus in data.json, else the first closer view.
const cover = g => allPhotos(g).find(p => p.f === g.cover) || (g.views.medium || [])[0] || allPhotos(g)[0];

/* ---------- shared bits ---------- */
// Genera in IMR slate order (data.json lists them that way, starred genera last).
const slateIdx = n => Object.keys(DATA.gen).indexOf(n);
const bySlate = L => Object.keys(DATA.gen).filter(n => L.includes(n));
// group=true marks the card with its IMR confusion group (strip and tag); 'stripe' draws the strip only.
function card(name, group){
  const g = DATA.gen[name], p = cover(g), ig = (group === true || group === 'stripe') && g.ig ? DATA.imrg.find(x => x.n === g.ig) : null;
  const im = p ? `<img class="ph" src="${img(p, 's')}" srcset="${srcset(p)}" data-sz="card" sizes="${sizesFor('card')}" alt="${esc(name)}" loading="lazy">` : `<span class="ph none">no photo</span>`;
  return `<a class="card${ig ? ' grp' : ''}" href="#g-${esc(name)}"${ig ? ` style="--g:${(ig.n * 137) % 360}"` : ''}>${im}${ig && group === true ? `<span class="ig" title="IMR confusion group ${ig.n}: ${esc(ig.t)}">Group ${ig.n}</span>` : ''}<span class="cap"><i>${esc(name)}</i><small>${g.n ? 'No. ' + g.n + ' · ' : '<b class="star">★ not surveyed</b> · '}${esc(g.fam)}</small><p>${esc(g.sum)}</p></span></a>`;
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

/* ---------- genera ---------- */
let azFam = null, azQ = '';
// Genera order: 'lecture' (IMR Lecture 6 groups, default) or 'slate' (numbers on the IMR slate).
let azOrder = (() => { try { return localStorage.getItem('imr-coral-order') || 'lecture'; } catch (e) { return 'lecture'; } })();
function viewGenera(){
  const fams = [...new Set(Object.values(DATA.gen).map(g => g.fam))].sort();
  $v.innerHTML = `<h2>The 39 genera on the IMR slate</h2>
  <p class="lede">34 surveyed genera plus 5 starred ones that IMR does not survey but that you need to rule out. Each sheet shows the colony, a closer view and the corallites. Colours mark IMR's confusion groups from the lecture: genera in the same group are the ones to tell apart.</p>
  <div class="seg-row"><span class="label">Order</span><div class="seg" role="group" aria-label="Order">${[['lecture', 'Lecture groups'], ['slate', 'Slate numbers']].map(([k, t]) => `<button type="button" data-o="${k}" aria-pressed="${azOrder === k}">${t}</button>`).join('')}</div></div>
  <div class="tools"><input id="q" type="search" placeholder="Search a genus or a feature" value="${esc(azQ)}" aria-label="Search"></div>
  <div class="chips"><button class="chip" type="button" data-f="" aria-pressed="${!azFam}">All families</button><button class="chip" type="button" data-f="★" aria-pressed="${azFam === '★'}">★ Not surveyed</button>${fams.map(f => `<button class="chip" type="button" data-f="${f}" aria-pressed="${azFam === f}">${f}</button>`).join('')}</div>
  <div class="grid" id="azgrid"></div>`;
  const draw = () => {
    const q = azQ.toLowerCase();
    const names = Object.keys(DATA.gen).filter(n => (!azFam || DATA.gen[n].fam === azFam || (azFam === '★' && !DATA.gen[n].n)) && (!q || (n + ' ' + DATA.gen[n].crit.join(' ') + ' ' + DATA.gen[n].imr.join(' ')).toLowerCase().includes(q)));
    let html;
    if (azOrder === 'lecture') {
      const gi = n => DATA.gen[n].ig || 99;
      names.sort((a, b) => gi(a) - gi(b) || slateIdx(a) - slateIdx(b));
      html = names.map((n, i) => { const k = DATA.gen[n].ig, gr = DATA.imrg.find(x => x.n === k);
        const head = i && (DATA.gen[names[i - 1]].ig || 99) === gi(n) ? '' : gr
          ? `<h3 class="gdiv" style="--g:${(gr.n * 137) % 360}"><span class="gn">${gr.n}</span>${esc(gr.t)}</h3>`
          : '<h3 class="gdiv"><span class="gn">★</span>Not covered in the lecture</h3>';
        return head + card(n, 'stripe'); }).join('');
    } else html = names.map(n => card(n, true)).join('');
    document.getElementById('azgrid').innerHTML = html || '<p class="note">No genus matches.</p>';
    bindCards();
  };
  const qi = document.getElementById('q');
  qi.oninput = () => { azQ = qi.value; draw(); };
  $v.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { azFam = b.dataset.f || null; viewGenera(); });
  $v.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { azOrder = b.dataset.o; try { localStorage.setItem('imr-coral-order', azOrder); } catch (e) {} viewGenera(); });
  draw();
}

function viewGenus(name){
  const g = DATA.gen[name];
  if (!g) return viewGenera();
  const paths = DATA.key.flatMap(k => k.leaves.filter(l => l.g.includes(name)).map(l => ({k, l})));
  // Lecture photos sit in the view row they belong to (data: course[].v), after the field photos.
  const course = (DATA.course[name] || []).map(p => ({...p, view: p.v === 'medium' && g.levels === 2 ? 'macro' : p.v}));
  // Each view mixes sources, round-robin: IMR lecture, other iNaturalist observers, Pierre's own.
  const inView = v => { const all = [...(g.views[v] || []), ...course.filter(p => p.view === v)];
    const src = [all.filter(p => p.imr), all.filter(p => !p.imr && !p.own), all.filter(p => p.own)], out = [];
    while (src.some(L => L.length)) src.forEach(L => L.length && out.push(L.shift()));
    // Photos with several corals in frame (data: more[v], course[].multi) come last, never featured first.
    return [...out.filter(p => !p.multi), ...out.filter(p => p.multi), ...((g.more || {})[v] || []).map(p => ({...p, multi: true}))]; };
  const FEAT = 3;
  const flat = VIEWS.flatMap(([v]) => inView(v).map(p => ({...p, genus: name, view: g.levels === 2 && v === 'macro' ? 'close' : v})));
  const cv = cover(g), ci = cv ? flat.findIndex(x => x.f === cv.f) : -1;
  const rows = VIEWS.filter(([v]) => !(g.levels === 2 && !inView(v).length)).map(([v, label]) => {
    const list = inView(v);
    if (g.levels === 2 && v === 'macro') label = 'Close-up';
    const fig = p => { const i = flat.findIndex(x => x.f === p.f);
      return `<figure><button type="button" class="zoom" data-z="${i}"><img src="${img(p, 's')}" srcset="${srcset(p)}" data-sz="strip" sizes="${sizesFor('strip')}" alt="${esc(name)}, ${p.imr ? 'IMR lecture photo' : label.toLowerCase() + ' view'}" loading="lazy"></button><figcaption>${p.imr ? '<b class="lect">IMR lecture</b> ' : ''}${credit(p)}</figcaption></figure>`; };
    // Multi-coral photos never make the featured strip, even when fewer than FEAT clean photos exist.
    const feat = list.filter(p => !p.multi).slice(0, FEAT), more = list.filter(p => !feat.includes(p));
    return `<section class="vrow"><h3>${label}${feat.length ? '' : ' <span class="gap">missing</span>'}</h3>${feat.length ? `<div class="strip">${feat.map(fig).join('')}</div>` : '<p class="note">No good photo yet for this view.</p>'}
      ${more.length ? `<details class="more"><summary>${more.length} more ${label.toLowerCase()} photo${more.length > 1 ? 's' : ''}</summary><div class="strip">${more.map(fig).join('')}</div></details>` : ''}</section>`;
  }).join('');
  $v.innerHTML = `<div class="crumbs"><button type="button" data-back>‹ Back</button></div>
  <article class="sheet">
    <span class="fam">${g.n ? 'No. ' + g.n + ' on the slate · ' : ''}${esc(g.fam)}</span>
    <h2>${esc(name)}</h2>
    <p class="lede keyid">${esc(g.sum)}</p>
    ${g.n ? '' : `<p class="warn"><b>★ Not surveyed by IMR.</b> It is on the slate so you don't mistake it for ${g.look.filter(n => DATA.gen[n].n).map(n => '<i>' + esc(n) + '</i>').join(', ')}, so you need to recognise it and set it aside.</p>`}
    <div class="hero">
      ${cv ? `<button type="button" class="zoom hero-ph" data-z="${ci}"><img src="${img(cv)}" alt="${esc(name)}"></button>` : ''}
      <div class="idbox">
        ${g.imr.length ? `<h3>IMR lecture · group ${g.ig}: ${esc(DATA.imrg[g.ig - 1].t)}</h3><ul class="crit">${g.imr.map(c => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}${g.mn ? `<p class="note"><b>Mnemonic:</b> ${esc(g.mn)}</p>` : ''}
        <h3>Coral Finder features</h3><ul class="crit">${g.crit.map(c => `<li>${esc(c)}</li>`).join('')}</ul>
        ${g.check ? `<p class="note check"><b>To check with an IMR trainer:</b> ${esc(g.check)}</p>` : ''}
        <h3>Don't confuse with</h3><div class="chips">${g.look.map(n => `<a class="chip" href="#cmp-${esc(name)}|${esc(n)}" title="Side-by-side comparison">${esc(n)}</a>`).join('')}</div>
        <h3>In the key <span class="pg">Coral Finder p. ${g.pages.join(', ')}</span></h3><div class="kpick">${paths.map(({k, l}) => `<a class="c-${k.color}" href="#l-${l.id}">${esc(k.name)} › ${esc(leafLabel(l))}</a>`).join('')}</div>
      </div>
    </div>
    ${rows}
  </article>`;
  $v.querySelectorAll('[data-z]').forEach(b => b.onclick = () => zoom(flat, Number(b.dataset.z)));
  $v.querySelectorAll('[data-cmp]').forEach(b => b.onclick = () => go('cmp-' + name + '|' + b.dataset.cmp));
  bindGo();
  $v.querySelector('[data-back]').onclick = () => history.length > 1 ? history.back() : go('genera');
}

/* ---------- compare ---------- */
function pairs(){
  const seen = new Set(), out = [];
  Object.keys(DATA.gen).forEach(a => DATA.gen[a].look.forEach(b => { const k = [a, b].sort().join('|'); if (DATA.gen[b] && !seen.has(k)) { seen.add(k); out.push(k.split('|')); } }));
  return out;
}
function viewCompareList(){
  // One block per genus in slate order: the genus, then the genera it is confused with, as photo cards.
  const thumb = (n, cls) => { const g = DATA.gen[n], p = cover(g); return p ? `<img class="${cls}" src="${img(p, 's')}" srcset="${srcset(p)}" data-sz="card" sizes="${sizesFor('card')}" alt="${esc(n)}" loading="lazy">` : `<span class="${cls} none">no photo</span>`; };
  const tag = g => g.n ? 'No. ' + g.n : '<b class="star">★</b>';
  const blocks = Object.keys(DATA.gen).filter(n => DATA.gen[n].look.some(b => DATA.gen[b])).map(n => {
    const g = DATA.gen[n];
    const cards = g.look.filter(b => DATA.gen[b]).map(b => { const B = DATA.gen[b]; return `<a class="card" href="#cmp-${esc(n)}|${esc(b)}">${thumb(b, 'ph')}<span class="cap"><small>vs</small><i>${esc(b)}</i><small>${tag(B)} · ${esc(B.fam)}</small><p>${esc(B.sum)}</p></span></a>`; }).join('');
    return `<section class="lablock"><a class="lahead" href="#g-${esc(n)}">${thumb(n, 'laph')}<span><i>${esc(n)}</i><small>${tag(g)} · ${esc(g.fam)}</small><span class="lacrit">${esc(g.sum)}</span></span></a><div class="grid">${cards}</div></section>`;
  }).join('');
  $v.innerHTML = `<h2>Look-alikes</h2>
  <p class="lede">For each genus, in slate order, the genera it is most often confused with. Open a pair to compare them view by view.</p>${blocks}`;
  bindGo();
}
function viewCompare(a, b){
  const A = DATA.gen[a], B = DATA.gen[b];
  if (!A || !B) return viewCompareList();
  const col = (n, g) => `<div class="cmpcol"><h3><a class="linkish" href="#g-${esc(n)}"><i>${esc(n)}</i></a>${g.n ? '' : ' ★'}</h3><p class="note">${esc(g.fam)}${g.ig ? ' · IMR group ' + g.ig : ''}</p><ul class="crit">${g.crit.map(c => `<li>${esc(c)}</li>`).join('')}</ul></div>`;
  const flat = [];
  const row = ([v, label]) => {
    const cell = (n, g) => { const p = (g.views[v] || [])[0]; if (!p) return `<div class="cmpph none">${g.levels === 2 ? 'no separate level' : 'no photo'}</div>`; flat.push({...p, genus: n, view: v}); return `<button type="button" class="zoom cmpph" data-z="${flat.length - 1}"><img src="${img(p, 's')}" srcset="${srcset(p)}" sizes="(max-width:700px) 46vw, 460px" alt="${esc(n)}, ${label.toLowerCase()}" loading="lazy"></button>`; };
    return `<h3 class="cmplab">${label}</h3><div class="cmprow">${cell(a, A)}${cell(b, B)}</div>`;
  };
  $v.innerHTML = `<div class="crumbs"><a href="#cmp">All pairs</a> › <i>${esc(a)}</i> vs <i>${esc(b)}</i></div>
  <h2><i>${esc(a)}</i> or <i>${esc(b)}</i>?</h2>
  ${VIEWS.filter(([v]) => (A.views[v] || []).length || (B.views[v] || []).length).map(row).join('')}
  <div class="cmprow text">${col(a, A)}${col(b, B)}</div>
  <p><a class="next" href="#quiz-duel|${esc(a)}|${esc(b)}">Drill this pair</a></p>`;
  $v.querySelectorAll('[data-z]').forEach(x => x.onclick = () => zoom(flat, Number(x.dataset.z)));
  bindCards(); bindGo();
}

/* ---------- key (Coral Finder + IMR groups + traits) ---------- */
const groupOf = id => DATA.key.find(g => g.id === id[0]);
const leafOf = id => groupOf(id)?.leaves.find(l => l.id === id);
const pg = l => l.a === l.b ? 'p.' + l.a : 'p.' + l.a + '-' + l.b;
const leafLabel = l => l.t + (l.s ? ' · ' + l.s : '');

// Colony-form key: every level stays on screen. Chosen levels shrink to a row of links,
// so going back or switching to a sibling is one click (and a real link).
const kThumbs = (L, max = 6) => `<span class="kthumbs">${bySlate(L).slice(0, max).map(n => { const p = cover(DATA.gen[n]); return p ? `<img src="${img(p, 's')}" alt="" loading="lazy">` : ''; }).join('')}${L.length > max ? `<span class="more">+${L.length - max}</span>` : ''}</span>`;
const kLevel = (n, title, body, done) => `<section class="klevel${done ? ' done' : ''}"><h3 class="klab"><span class="kn">${n}</span>${title}</h3>${body}</section>`;
function keyPath(g, l){
  const forms = g
    ? `<div class="kpick">${DATA.key.map(x => `<a class="c-${x.color}" href="#k-${x.id}"${x === g ? ' aria-current="step"' : ''}>${esc(x.name)}</a>`).join('')}</div>`
    : `<div class="groups">${DATA.key.map(x => { const L = [...new Set(x.leaves.flatMap(y => y.g))];
        return `<a class="group c-${x.color}" href="#k-${x.id}"><b>${esc(x.name)}</b><span>${esc(x.sub)}</span>${kThumbs(L)}<em>${L.length} IMR ${L.length > 1 ? 'genera' : 'genus'}</em></a>`; }).join('')}</div>`;
  let out = kLevel(1, 'Colony shape', forms, !!g);
  if (g && g.leaves.length > 1) {
    const body = l
      ? `<div class="kpick">${g.leaves.map(y => y.g.length ? `<a class="c-${g.color}" href="#l-${y.id}"${y === l ? ' aria-current="step"' : ''}>${esc(leafLabel(y))} <small>${y.g.length}</small></a>` : '').join('')}</div>`
      : `<div class="leaves">${g.leaves.map(y => { const inner = `<span class="t">${esc(y.t)}</span><span class="s">${esc(y.s || '')}</span>
          <span class="n">${y.g.length ? y.g.length + (y.g.length > 1 ? ' genera' : ' genus') + ': ' + bySlate(y.g).map(esc).join(', ') : 'No IMR genus here'} · ${pg(y)}</span>${y.g.length ? kThumbs(y.g, 8) : ''}`;
          return y.g.length ? `<a class="leaf c-${g.color}" href="#l-${y.id}">${inner}</a>` : `<span class="leaf c-${g.color}" aria-disabled="true">${inner}</span>`; }).join('')}</div>`;
    out += kLevel(2, `${esc(g.name)}: corallites`, body, !!l);
  }
  return out;
}
function viewKey(){
  $v.innerHTML = `<h2>What shape is the colony?</h2>
  <p class="lede">Pick the growth form, then the corallite size or type. The key follows the Coral Finder's front page and only shows genera on the IMR list.</p>
  <p class="warn"><b>Growth form is only a starting point.</b> Many genera take several forms, sometimes within a single colony: <i>Porites</i> shows up in 3 groups and 8 boxes of this key. Each genus is listed everywhere the Coral Finder shows it. To decide, look at the corallites.</p>
  ${keyPath(null)}`;
  bindGo();
}
function viewGroup(id){
  const g = groupOf(id);
  if (g.leaves.length === 1) return viewLeaf(g.leaves[0].id, true);
  $v.innerHTML = `<h2>${esc(g.name)}: what next?</h2><p class="lede">${esc(g.sub)}. Now look at the corallites.</p>${keyPath(g)}`;
  bindGo();
}
function viewLeaf(id, single){
  const g = groupOf(id), l = leafOf(id), n = single ? 2 : 3;
  $v.innerHTML = `<h2>${l.g.length} candidate${l.g.length > 1 ? 's' : ''}</h2>
  <p class="lede">${esc(g.name)} · ${esc(leafLabel(l))}. Coral Finder ${pg(l)}, which also shows genera outside the IMR list.</p>
  ${keyPath(g, single ? null : l)}
  ${kLevel(n, 'Candidates: check the corallites', `<div class="grid">${bySlate(l.g).map(x => card(x)).join('')}</div>`)}`;
  bindCards(); bindGo();
}
function viewIMR(){
  $v.innerHTML = `<h2>IMR lecture groups</h2>
  <p class="lede">IMR Lecture 6 sorts the surveyed genera by corallite type, not by colony shape. Run through the four questions, then pick the matching group.</p>
  <ol class="tips">${DATA.tips.map(t => `<li>${esc(t)}</li>`).join('')}</ol>
  <details class="gloss"><summary>Coral anatomy terms</summary><dl>${DATA.terms.map(([t, d]) => `<dt>${esc(t)}</dt><dd>${esc(d)}</dd>`).join('')}</dl><p class="note">The oral disc and mouth belong to the living polyp; the other terms describe its skeleton. Sources: <a href="https://www.coralsoftheworld.org/page/glossary/" target="_blank" rel="noopener">Corals of the World glossary</a>, <a href="https://cdhc.noaa.gov/coral-biology/coral-skeleton/" target="_blank" rel="noopener">NOAA</a>.</p></details>
  ${DATA.imrg.map(gr => { const names = Object.keys(DATA.gen).filter(n => DATA.gen[n].ig === gr.n);
    return `<section class="imrg"><h3 class="gdiv" style="--g:${(gr.n * 137) % 360}"><span class="gn">${gr.n}</span>${esc(gr.t)}</h3><div class="grid">${names.map(n => card(n, 'stripe')).join('')}</div></section>`; }).join('')}
  <section class="imrg"><h3><span class="gn">★</span> Not covered in the lecture</h3><p class="note">The starred genera on the slate, to rule out look-alikes.</p><div class="grid">${Object.keys(DATA.gen).filter(n => !DATA.gen[n].ig).map(card).join('')}</div></section>`;
  bindCards(); bindGo();
}
let trSel = new Set();
function viewTraits(){
  $v.innerHTML = `<h2>What do the corallites show?</h2>
  <p class="lede">Tick what you see, ignoring the colony's shape. Several picks within one section mean either/or; sections combine.</p>
  ${DATA.traits.map(c => `<fieldset class="trset"><legend>${esc(c.name)}</legend><div class="chips">${c.opts.map(o => `<button class="chip" type="button" data-t="${o.id}" aria-pressed="${trSel.has(o.id)}">${esc(o.t)}</button>`).join('')}</div></fieldset>`).join('')}
  <div class="count" id="trcount"></div><div class="grid" id="trgrid"></div>`;
  const draw = () => {
    const names = Object.keys(DATA.gen).filter(n => DATA.traits.every(c => { const picked = c.opts.filter(o => trSel.has(o.id)).map(o => o.id); return !picked.length || picked.some(id => DATA.gen[n].tr.includes(id)); }));
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
const save = () => { store.set('imr-coral-progress', P); showProg(); syncSoon(); };
const st = n => P[n] || (P[n] = {ok: 0, ko: 0, streak: 0});
const Q = Object.assign({stars: true, view: 'any'}, store.get('imr-coral-quiz', {}));
const saveQ = () => store.set('imr-coral-quiz', Q);
let session = {ok: 0, n: 0}, last = null, duelPair = null;
const pool = () => Object.keys(DATA.gen).filter(n => (Q.stars || DATA.gen[n].n) && photoSet(n).shown.length);
// A quiz question always shows one colony view and one closer view; the corallites come as a hint.
// Quiz views come from one observation (same colony) whenever possible: pick at random among
// the observations covering the most views, and fill any missing view from another observation.
function photoSet(n){
  const g = DATA.gen[n], two = g.levels === 2, need = two ? ['wide', 'macro'] : ['wide', 'medium', 'macro'];
  const obs = {};
  need.forEach(v => (g.views[v] || []).forEach(p => { const k = p.o || p.f; (obs[k] = obs[k] || {})[v] = (obs[k][v] || []).concat([p]); }));
  const groups = Object.values(obs), cov = o => need.filter(v => o[v]).length, best = Math.max(0, ...groups.map(cov));
  const o = best ? pick(groups.filter(x => cov(x) === best)) : {};
  const one = v => { const L = o[v] || g.views[v] || []; return L.length ? {...pick(L), view: v} : null; };
  // Two-level genera (e.g. Plerogyra, mushroom corals) show colony + close-up, with no hint.
  if (two) { const m = one('macro'); return {shown: [one('wide'), m && {...m, view: 'close'}].filter(Boolean), hint: null}; }
  return {shown: [one('wide'), one('medium')].filter(Boolean), hint: one('macro')};
}
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
  return `${cur === 'quiz-board' ? '' : `<div class="opts">
    <button class="chip" type="button" id="qstars" aria-pressed="${Q.stars}">Include ★ genera</button></div>`}`;
}
function bindQuizNav(cur){
  bindGo();
  const qs = document.getElementById('qstars'); if (!qs) return;
  qs.onclick = () => { Q.stars = !Q.stars; saveQ(); route(); };
}
function question(cur, target, choices, prompt, set){
  const ph = set.shown, lab = VIEW_LABEL;
  let answered = false, hintShown = false;
  const fig = (p, k) => `<figure class="qph"><button type="button" class="zoom" data-q="${k}" aria-label="Enlarge photo"><img src="${img(p)}" alt="Coral to identify${p.view ? ', ' + lab[p.view].toLowerCase() + ' view' : ''}"></button>${p.view ? `<figcaption>${lab[p.view]}</figcaption>` : ''}</figure>`;
  $v.innerHTML = `${quizNav(cur)}<div class="q">
    <div class="score">This session: <b>${session.ok}/${session.n}</b></div>
    <p class="prompt">${prompt}</p>
    <div class="qset${ph.length > 1 ? ' two' : ''}">${ph.map(fig).join('')}</div>
    ${set.hint ? '<div id="hint"><button type="button" class="linkish" id="hintb">Show the corallites (hint)</button></div>' : ''}
    <div class="ans">${choices.map(c => `<button type="button" data-c="${esc(c)}">${esc(c)}</button>`).join('')}</div>
    <div id="after"></div></div>`;
  bindQuizNav(cur);
  const hb = document.getElementById('hintb');
  const showHint = () => { const h = document.getElementById('hint'); if (h && hb && h.contains(hb)) { h.innerHTML = `<div class="qset">${fig(set.hint, ph.length)}</div>`; hintShown = true; } };
  if (hb) hb.onclick = showHint;
  $v.querySelector('.q').addEventListener('click', e => { const z = e.target.closest('[data-q]'); if (!z) return;
    const list = hintShown ? [...ph, set.hint] : ph;
    zoom(list.map(p => ({...p, genus: target})), Number(z.dataset.q), {blind: () => !answered}); });
  $v.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { showHint(); answered = true; answer(cur, b.dataset.c, target, set.hint ? [...ph, set.hint] : ph); });
}
function answer(cur, c, target, ph){
  const good = c === target, s = st(target);
  session.n++; if (good) { session.ok++; s.ok++; s.streak++; } else { s.ko++; s.streak = 0; s.conf = s.conf || {}; s.conf[c] = (s.conf[c] || 0) + 1; }
  save();
  $v.querySelectorAll('[data-c]').forEach(b => { b.disabled = true; if (b.dataset.c === target) b.classList.add('ok'); else if (b.dataset.c === c) b.classList.add('ko'); });
    const g = DATA.gen[target];
  const vs = !good && DATA.gen[c] ? `<p class="vs">Why not <i>${esc(c)}</i>: ${esc(DATA.gen[c].sum)} <a class="linkish" href="#cmp-${esc(target)}|${esc(c)}">Compare them</a></p>` : '';
  document.getElementById('after').innerHTML = `<div class="fb">
    <h3 class="${good ? 'ok' : 'ko'}">${good ? 'Yes' : 'No'}, it's <i>${esc(target)}</i>${g.n ? '' : ' (★ not surveyed)'}</h3>
    <p class="keyid"><b>Deciding features:</b> ${esc(g.sum)}</p>
    <ul>${g.crit.map(x => `<li>${esc(x)}</li>`).join('')}</ul>${g.imr.length ? `<p class="vs"><b>IMR lecture:</b> ${g.imr.map(esc).join(' ')}</p>` : ''}${g.mn ? `<p class="vs"><b>Mnemonic:</b> ${esc(g.mn)}</p>` : ''}${vs}</div>
    <p class="credit">${ph.map(credit).join('<br>')}</p>
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
  question('quiz', t, shuffle([t, ...distractors(t, list)]), 'Which genus?', photoSet(t));
}
function quizCourse(){
  const list = pool(), C = DATA.course, names = Object.keys(C).filter(n => list.includes(n) && C[n].some(p => !p.multi));
  const t = nextTarget(names);
  question('quiz-course', t, shuffle([t, ...distractors(t, list)]), 'Which genus? <span class="note">(photo from the IMR lecture)</span>', {shown: [pick(C[t].filter(p => !p.multi))], hint: null});
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
// Progress board: one photo tile per genus, coloured by status, grouped by IMR lecture group so
// weak spots show up as a pattern; the genus most often given instead is linked to the side-by-side comparison.
function quizBoard(){
  const list = Object.keys(DATA.gen).filter(n => Q.stars || DATA.gen[n].n);
  const lv = Object.fromEntries(list.map(n => [n, level(n)]));
  const count = k => list.filter(n => lv[n][0] === k).length, seen = list.length - count('new');
  const LV = [['ok', 'Learned'], ['mid', 'Learning'], ['weak', 'Review'], ['new', 'Not seen']];
  const weak = list.filter(n => lv[n][0] === 'weak').sort((a, b) => weight(b) - weight(a));
  const tile = n => { const g = DATA.gen[n], p = cover(g), s = P[n] || {ok: 0, ko: 0}, tot = s.ok + s.ko, [cl, lb] = lv[n];
    const top = s.conf ? Object.entries(s.conf).sort((x, y) => y[1] - x[1])[0] : null;
    return `<figure class="pt ${cl}"><a href="#g-${esc(n)}">${p ? `<img src="${img(p, 's')}" alt="" loading="lazy">` : ''}<figcaption><i>${esc(n)}</i>${g.n ? '' : ' ★'}<span class="lvl ${cl}">${lb}</span></figcaption>${tot ? `<span class="pbar" title="${s.ok} right of ${tot}"><span style="width:${Math.round(100 * s.ok / tot)}%"></span></span>` : ''}</a>
      ${top ? `<a class="pconf" href="#cmp-${esc(n)}|${esc(top[0])}" title="Compare side by side">mixed up with <i>${esc(top[0])}</i> ×${top[1]}</a>` : ''}</figure>`; };
  const gi = n => DATA.gen[n].ig || 99, groups = [...new Set(list.map(gi))].sort((a, b) => a - b);
  $v.innerHTML = `${quizNav('quiz-board')}<h2>${count('ok')} of ${list.length} genera learned</h2>
  <div class="pstack" role="img" aria-label="${LV.map(([k, t]) => count(k) + ' ' + t.toLowerCase()).join(', ')}">${LV.map(([k]) => count(k) ? `<span class="${k}" style="flex:${count(k)}"></span>` : '').join('')}</div>
  <p class="plegend">${LV.map(([k, t]) => `<span class="lvl ${k}">${t} ${count(k)}</span>`).join(' ')}</p>
  <p class="note">${seen} genera seen so far. Learned means at least 3 correct answers in a row and 75% success. Genera marked Review come up more often in the quiz.</p>
  ${weak.length ? `<section class="pfocus"><h3>Review first</h3><div class="pgrid">${weak.slice(0, 8).map(tile).join('')}</div><p><a class="chip" href="#quiz">Practise now</a></p></section>` : ''}
  ${groups.map(k => { const gr = DATA.imrg.find(x => x.n === k), L = list.filter(n => gi(n) === k).sort((a, b) => slateIdx(a) - slateIdx(b));
    const done = L.filter(n => lv[n][0] === 'ok').length;
    return `<h3 class="gdiv" style="--g:${gr ? (gr.n * 137) % 360 : 200}"><span class="gn">${gr ? gr.n : '★'}</span>${gr ? esc(gr.t) : 'Not covered in the lecture'}<small class="pdone">${done}/${L.length}</small></h3><div class="pgrid">${L.map(tile).join('')}</div>`; }).join('')}
  ${SYNC_URL ? '<section class="sync" id="sync"></section>' : ''}
  <div class="saveprog"><p class="note">Progress is saved in this browser, on this device. Save it to a file to keep a backup or move it to another phone or computer.</p>
    <button class="chip" type="button" id="pexp">Save progress to a file</button> <button class="chip" type="button" id="pload">Load a progress file</button><input type="file" id="pimp" accept=".json,application/json" hidden> <span class="note" id="pmsg" role="status"></span></div>
  <p><button class="reset" type="button" id="reset">Reset progress</button></p>`;
  bindQuizNav('quiz-board');
  bindProgFile(); bindSync();
  const rb = document.getElementById('reset');
  rb.onclick = () => { if (rb.dataset.armed) { P = {}; store.set('imr-coral-reset', new Date().toISOString()); save(); quizBoard(); } else { rb.dataset.armed = '1'; rb.textContent = 'Confirm reset'; } };
}

// Header progress pill: genera learned, always in view; the page itself is #progress.
const $prog = document.getElementById('prog');
function showProg(){ if (!DATA) return; const n = Object.keys(DATA.gen); document.getElementById('progn').textContent = `${n.filter(x => level(x)[0] === 'ok').length}/${n.length}`; }
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
const syncGet = () => fetch(`${SYNC_URL}?name=${encodeURIComponent(SYNC.name)}&pin=${encodeURIComponent(SYNC.pin)}`).then(r => r.json());
// Two devices on one account: three-way merge against SYNC.base, the progress as last sent or received.
// Answers taken on this device since then are added on top of the saved record, so neither side's answers
// are lost. A reset (imr-coral-reset, a time) wins over older progress.
const copy = o => JSON.parse(JSON.stringify(o));
function mergeSaved(j){
  const d = j.data || {}; let R = {}; try { R = JSON.parse(d['imr-coral-progress'] || '{}') || {}; } catch (e) {}
  const rr = JSON.parse(d['imr-coral-reset'] || '""'), lr = store.get('imr-coral-reset', '');
  if (lr > rr) return;
  if (rr > lr) { P = R; SYNC.base = copy(R); store.set('imr-coral-sync', SYNC); store.set('imr-coral-reset', rr); store.set('imr-coral-progress', P); showProg(); return; }
  const B = SYNC.base || {}, Z = {ok: 0, ko: 0, streak: 0};
  new Set([...Object.keys(R), ...Object.keys(P)]).forEach(g => {
    const b = B[g] || Z, l = P[g] || Z, r = R[g] || Z, out = {...r};
    out.ok = Math.max(0, (r.ok || 0) + (l.ok || 0) - (b.ok || 0));
    out.ko = Math.max(0, (r.ko || 0) + (l.ko || 0) - (b.ko || 0));
    const mine = (l.ok || 0) + (l.ko || 0) !== (b.ok || 0) + (b.ko || 0);
    out.streak = mine ? l.streak || 0 : r.streak || 0;
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
function syncPush(){
  if (!SYNC_URL || !SYNC || !DATA) return Promise.resolve(null);
  const me = SYNC; let rev, sent;
  return syncGet().then(j => { if (!j.ok) return j; if (j.found) mergeSaved(j);
    rev = me.rev; sent = copy(P);
    return fetch(SYNC_URL, {method: 'POST', body: JSON.stringify({name: me.name, pin: me.pin, data: progData(), summary: syncSummary()})}).then(r => r.json()); })
    .then(j => { if (j.ok && SYNC === me) { me.last = new Date().toISOString(); me.base = sent; if (me.rev === rev) delete me.dirty; store.set('imr-coral-sync', me); } return j; })
    .catch(() => null);
}
const syncSoon = () => { if (!SYNC_URL || !SYNC) return; SYNC.dirty = true; SYNC.rev = (SYNC.rev || 0) + 1; store.set('imr-coral-sync', SYNC); clearTimeout(syncTimer); syncTimer = setTimeout(syncPush, 3000); };
const syncRetry = () => { if (SYNC && SYNC.dirty) syncPush(); };
window.addEventListener('online', syncRetry);
function bindSync(){
  const box = document.getElementById('sync'); if (!box) return;
  const msg = t => box.querySelector('[role=status]').textContent = t;
  if (SYNC) {
    box.innerHTML = `<p>Synced with IMR as <b>${esc(SYNC.name)}</b>${SYNC.last ? ` · last sent ${new Date(SYNC.last).toLocaleString([], {dateStyle: 'short', timeStyle: 'short'})}` : ''}. Your progress is sent after each answer; on another device, connect with the same name and code.</p>
      <button class="chip" type="button" id="snow">Send now</button> <button class="reset" type="button" id="soff">Disconnect this device</button> <span class="note" role="status"></span>`;
    box.querySelector('#snow').onclick = () => { msg('Sending…'); syncPush().then(j => { if (j && j.ok) bindSync(); else msg(j && j.error === 'pin' ? 'The sheet refused the code for this name.' : 'Could not reach the sheet. Check your connection.'); }); };
    box.querySelector('#soff').onclick = () => { SYNC = null; try { localStorage.removeItem('imr-coral-sync'); } catch (e) {} bindSync(); };
    return;
  }
  box.innerHTML = `<p>Training at IMR? Connect to save your progress for your trainer and get it back on any device.</p>
    <form class="sform"><label>Your name <input name="n" required maxlength="40" autocomplete="name"></label>
    <label>4-digit code <input name="p" required inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="off"></label>
    <button class="chip" type="submit">Connect</button> <span class="note" role="status"></span></form>
    <p class="note">New name: pick any code and remember it. Same name and code later: your saved progress comes back.</p>`;
  box.querySelector('form').onsubmit = e => { e.preventDefault();
    const f = e.target, name = f.n.value.trim(), pin = f.p.value.trim();
    msg('Connecting…');
    fetch(`${SYNC_URL}?name=${encodeURIComponent(name)}&pin=${encodeURIComponent(pin)}`).then(r => r.json()).then(j => {
      if (!j.ok) return msg(j.error === 'pin' ? 'This name already exists with another code.' : 'Check the name and the 4-digit code.');
      SYNC = {name, pin}; if (j.found) { try { SYNC.base = JSON.parse(j.data['imr-coral-progress'] || '{}') || {}; } catch (err) { SYNC.base = {}; } } store.set('imr-coral-sync', SYNC);
      // A known account replaces whatever this device holds (another RA may have used it); a new name keeps it.
      if (j.found) { Object.keys(progData()).forEach(k => localStorage.removeItem(k)); loadData(j.data); try { sessionStorage.setItem('imr-coral-loaded', 'the IMR sheet'); } catch (err) {} location.reload(); }
      else syncPush().then(() => bindSync());
    }).catch(() => msg('Could not reach the sheet. Check your connection.')); };
}
// Ask the browser not to evict saved progress when storage runs low.
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

/* ---------- routing ---------- */
function go(h){ if (decodeURIComponent(location.hash.slice(1)) === h) route(); else location.hash = h; }

// Photo size (small / medium / large), remembered per page.
const PAGE_DEFAULT = {genera: 'm', key: 'm', genus: 'm', cmp: 'm', quiz: 'm'};
function pageKey(){ const h = decodeURIComponent(location.hash.slice(1)); return h.startsWith('g-') ? 'genus' : h.startsWith('cmp') ? 'cmp' : h.startsWith('quiz') ? 'quiz' : (h.startsWith('key') || /^[kl]-/.test(h)) ? 'key' : 'genera'; }
function sizePrefs(){ try { return JSON.parse(localStorage.getItem('imr-coral-size')) || {}; } catch (e) { return {}; } }
function photoSize(){ return sizePrefs()[pageKey()] || PAGE_DEFAULT[pageKey()]; }
const SIZES = {card: {s: '240px', m: '360px', l: '520px'}, strip: {s: '(max-width:700px) 46vw, 260px', m: '(max-width:700px) 92vw, 420px', l: '(max-width:700px) 92vw, 640px'}};
const sizesFor = kind => SIZES[kind][photoSize()];
function applySize(){ const s = photoSize(); document.documentElement.dataset.size = s; document.querySelectorAll('img[data-sz]').forEach(i => i.sizes = sizesFor(i.dataset.sz)); document.querySelectorAll('#size button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.size === s))); }
document.querySelectorAll('#size button').forEach(b => b.onclick = () => { const p = sizePrefs(); p[pageKey()] = b.dataset.size; try { localStorage.setItem('imr-coral-size', JSON.stringify(p)); } catch (e) {} applySize(); });
// Light / dark theme switch; follows the system until the reader picks one.
const $theme = document.getElementById('theme');
function isDark(){ return document.documentElement.dataset.theme === 'dark'; }
function showTheme(){ const d = isDark(); $theme.textContent = d ? '☀' : '☾'; $theme.setAttribute('aria-label', d ? 'Switch to light theme' : 'Switch to dark theme'); }
$theme.onclick = () => { const t = isDark() ? 'light' : 'dark'; document.documentElement.dataset.theme = t; try { localStorage.setItem('imr-coral-theme', t); } catch (e) {} showTheme(); };
showTheme();

// Tools of the Learn, Identify and Practice sections: a tab bar in the sticky header, so they stay in view.
// Entries without a view in this file (anatomy, size, elim, pairs…) are tools that graduated from the Lab (proto/).
const MODES = {
  learn: [['genera', 'Genera', 'The 39 genus sheets'], ['cmp', 'Look-alikes', 'Confused pairs side by side']],
  identify: [['key-imr', 'IMR lecture groups', 'The 11 groups from the lecture'], ['key', 'By colony form', 'Start from the overall shape'], ['key-tr', 'By corallites', 'Filter on skeletal details']],
  practice: [['quiz', 'Photo → genus', 'Name the genus'], ['quiz-duel', 'Look-alike duels', 'Two genera often confused'], ['quiz-course', 'Lecture photos', 'Photos from the IMR course'], ['pairs', 'Memory', 'Match colony and corallites'], ['reveal', 'Blur reveal', 'Name it before it sharpens']]
};
const MODE_LABEL = {learn: 'Learn tools', identify: 'Ways to identify', practice: 'Practice modes'};
// Which tab of MODES a hash belongs to: key leaves and groups count as the key, genus sheets as Genera, pairs as Look-alikes.
function modeOf(h){ return /^[kl]-/.test(h) ? 'key' : h.startsWith('g-') ? 'genera' : h.startsWith('cmp') ? 'cmp' : h.split('|')[0]; }
function sectionOf(h){
  if (!h || h === 'home') return 'home';
  if (h.startsWith('lab')) return 'lab';
  if (h === 'progress' || h === 'quiz-board') return 'progress';
  const m = modeOf(h);
  return Object.keys(MODES).find(t => MODES[t].some(x => x[0] === m)) || 'learn';
}
const $modes = document.getElementById('modes');
function showModes(tab, h){
  const L = MODES[tab]; $modes.hidden = !L; if (!L) { $modes.innerHTML = ''; return; }
  const cur = modeOf(h);
  $modes.setAttribute('aria-label', MODE_LABEL[tab]);
  $modes.innerHTML = L.map(([k, t, d]) => `<a href="#${k}"${k === cur ? ' aria-current="page"' : ''}><b>${t}</b><small>${d}</small></a>`).join('');
  const on = $modes.querySelector('[aria-current]'); if (on && $modes.scrollWidth > $modes.clientWidth) $modes.scrollLeft = on.offsetLeft - ($modes.clientWidth - on.offsetWidth) / 2;
}
function route(){
  applySize();
  const h = decodeURIComponent(location.hash.slice(1));
  const tab = sectionOf(h);
  showProg(); tab === 'progress' ? $prog.setAttribute('aria-current', 'page') : $prog.removeAttribute('aria-current');
  document.querySelectorAll('nav [data-tab]').forEach(b => b.dataset.tab === tab ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current'));
  showModes(tab, h);
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
  else if (h === 'progress' || h === 'quiz-board') quizBoard();
  else if (h.startsWith('quiz-duel')) { const [, a, b] = h.split('|'); quizDuel(a, b); }
  else if (h.startsWith('lab') && window.viewLab) viewLab(h);
  else if (window.labTool && labTool(h)) {}
  else if ((!h || h === 'home') && window.viewHome) viewHome();
  else viewGenera();
  window.scrollTo(0, 0);
}
addEventListener('hashchange', route);
fetch('data.json?v=8').then(r => r.json()).then(d => { DATA = d; route(); syncRetry(); }).catch(() => { $v.innerHTML = '<p class="warn">Could not load the data. Check your connection and reload.</p>'; });
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
