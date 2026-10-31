// Coral Finder: one page to keep open beside ReefCloud. It only cross-references existing sources (no categories of
// its own): Coral Finder growth form and box, corallite size, walls, other features, IMR lecture group, name) is a filter
// that can be used in any order; the shortlist updates at once and shows every candidate with its local photos.
// Clues rank, they never eliminate: a clue can be wrong or misjudged (size, shape), so a genus that misses one
// clue stays in view under "One clue off", and a size one class away counts as half a match.
// It replaced the growth-form key and the corallite filters in Identify (#key, #key-tr, #k-, #l- redirect here).
// State lives in the hash (#finder|<state>), so a reload or a shared link keeps the shortlist.
LAB.add({
  id: 'finder', icon: '⌕', title: 'Coral Finder',
  blurb: 'Start from whatever you can see, in any order: growth form, corallites or IMR lecture group. The shortlist updates at once, with all local photos.',
  lede: 'Tap the clues you can see on your photo, in any order. Genera are ranked by how well they fit: one wrong or misjudged clue only moves a genus down, it never hides it. Made to stay open beside ReefCloud.',
  render(root, arg){
    const names = labNames(), G = DATA.gen;
    const uniq = L => [...new Set(L)];
    const withTr = id => names.filter(n => G[n].tr.includes(id));
    // Facets: id, title, options {id, t, g (genera)}. Within a facet picks mean either/or; facets combine.
    const FORMS = DATA.key.map(k => ({id: k.id, t: k.name, s: k.sub, g: uniq(k.leaves.flatMap(l => l.g)), color: k.color}));
    const facets = () => {
      // Each family's note shows as a tooltip on its title (Pierre: no explanatory text on the page).
      const forms = FORMS.filter(f => S.form.has(f.id));
      return [
        {id: 'form', name: 'Growth form', note: 'The Coral Finder\'s front page. Many genera take several forms.', thumbs: true, opts: FORMS},
        ...(forms.length ? [{id: 'box', name: 'Coral Finder box', note: 'Second step of the Coral Finder, for the growth form picked above.',
          opts: forms.flatMap(f => DATA.key.find(k => k.id === f.id).leaves.filter(l => l.g.length && (f.id !== 'L' && f.id !== 'C')).map(l => ({id: l.id, t: leafLabel(l), g: l.g, pg: pg(l)})))}] : []),
        ...DATA.traits.map(c => ({id: c.id, name: c.name, note: c.note, opts: c.opts.map(o => ({id: o.id, t: o.t, s: o.src, g: withTr(o.id)}))})),
        {id: 'ig', name: 'IMR lecture group', note: 'The 11 corallite groups of Lecture 6.', thumbs: true,
          opts: DATA.imrg.map(gr => ({id: 'g' + gr.n, t: gr.n + '. ' + gr.t, g: names.filter(n => G[n].ig === gr.n)}))}
      ].filter(f => f.opts.length);
    };
    const FIDS = ['form', 'box', ...DATA.traits.map(c => c.id), 'ig'];
    // State, read from and written back to the hash.
    const S = {out: new Set(), cmp: [], q: '', open: new Set(), home: true};
    FIDS.forEach(f => S[f] = new Set());
    // Two display controls that combine: layout (Auto = Mosaic up to 12 genera, Cards beyond; Cards = one photo per genus; Mosaic;
    // Contact sheet) and which photos (Mix of colony / closer / corallites, or one view only).
    let lay = store.get('imr-finder-lay', 'auto'), pv = store.get('imr-finder-pv', 'mix');
    (arg || '').split(';').forEach(kv => { const [k, v] = kv.split('='); if (!v) return; const L = decodeURIComponent(v).split(',');
      if (FIDS.includes(k)) L.forEach(x => S[k].add(x)); else if (k === 'out') L.forEach(x => G[x] && S.out.add(x)); else if (k === 'q') S.q = L.join(','); });
    // Start screen (one screen, a few clues, then the shortlist) unless the link already carries clues.
    if (FIDS.some(f => S[f].size) || S.q || S.out.size) S.home = false;
    // Three start-screen proposals for Pierre to try; the pick is remembered per browser.
    let startV = store.get('imr-finder-start', 'a');
    const base = location.hash.startsWith('#lab-') ? '#lab-finder' : '#finder';
    const saveHash = () => {
      const parts = FIDS.filter(f => S[f].size).map(f => f + '=' + [...S[f]].join(','));
      if (S.out.size) parts.push('out=' + [...S.out].join(','));
      if (S.q) parts.push('q=' + encodeURIComponent(S.q));
      history.replaceState(null, '', base + (parts.length ? '|' + parts.join(';') : ''));
    };
    // How well a genus fits one clue family: 1 if one of its picks lists the genus, 0.5 for a corallite size
    // one class away (sizes are easy to misjudge on a photo), else 0. Unused families don't count.
    const SIZES = DATA.traits.find(c => c.id === 'size').opts.map(o => o.id);
    const hit = (n, f) => {
      if (f.opts.some(o => S[f.id].has(o.id) && o.g.includes(n))) return 1;
      if (f.id === 'size' && [...S.size].some(id => { const i = SIZES.indexOf(id); return [SIZES[i - 1], SIZES[i + 1]].some(x => x && G[n].tr.includes(x)); })) return .5;
      return 0;
    };
    // Penalty: how many clues the genus misses (halves for near sizes); misses: the families it misses.
    const used = (F, skip) => F.filter(f => f.id !== skip && S[f.id].size);
    const pen = (n, F, skip) => used(F, skip).reduce((t, f) => t + 1 - hit(n, f), 0);
    const misses = (n, F) => used(F).filter(f => hit(n, f) < 1).map(f => f.name + (hit(n, f) ? ' (close)' : ''));
    const fitsQ = n => !S.q || n.toLowerCase().includes(S.q.toLowerCase());
    const fits = (n, F, skip) => fitsQ(n) && pen(n, F, skip) === 0;
    const thumb = (n, v = 'medium') => { const p = (G[n].views[v] || [])[0] || cover(G[n]); return p ? img(p, 's') : ''; };

    root.innerHTML = `<section class="fdstart" id="fdstart" hidden></section><div class="fdlayout"><aside class="fdside" id="fdside"></aside><section class="fdmain" id="fdmain"></section></div><div class="fdcmp" id="fdcmp" hidden></div>`;
    const $start = root.querySelector('#fdstart'), $lay = root.querySelector('.fdlayout');
    const $side = root.querySelector('#fdside'), $main = root.querySelector('#fdmain'), $cmp = root.querySelector('#fdcmp');

    // On phones the panel sits above the shortlist: only growth form and the families in use start open.
    function drawSide(F, left){
      const narrow = matchMedia('(max-width:900px)').matches;
      $side.innerHTML = `<div class="fdsearch"><input type="search" id="fdq" placeholder="Genus name…" value="${esc(S.q)}" aria-label="Filter by genus name"><button type="button" class="chip" id="fdreset">Start over</button></div>
      ${F.map(f => {
        const picked = S[f.id].size, open = picked || S.open.has(f.id) || (narrow ? f.id === 'form' : !f.closed);
        return `<details class="fdfacet" data-f="${f.id}"${open ? ' open' : ''}><summary${f.note ? ` title="${esc(f.note)}"` : ''}>${esc(f.name)}${picked ? ` <span class="fdn">${picked}</span>` : ''}</summary>
        <div class="fdopts${f.thumbs ? ' th' : ''}">${f.opts.map(o => {
          const on = S[f.id].has(o.id), n = names.filter(x => !S.out.has(x) && fits(x, F, f.id) && o.g.includes(x)).length;
          const pv = f.thumbs ? `<span class="fdth">${bySlate(o.g).slice(0, 3).map(x => `<img src="${thumb(x, f.id === 'form' ? 'wide' : 'medium')}" alt="" loading="lazy">`).join('')}</span>` : '';
          return `<button type="button" class="fdopt${f.id === 'form' ? ' c-' + o.color : ''}" data-o="${f.id}|${o.id}" aria-pressed="${on}"${!n && !on ? ' data-zero' : ''} title="${esc(o.s || o.t)}">${pv}<span class="fdt">${esc(o.t)}${o.pg ? ` <small>${o.pg}</small>` : ''}</span><span class="fdc">${n}</span></button>`;
        }).join('')}</div></details>`;
      }).join('')}${narrow ? `<p><a class="next fdjump" href="#fdmain">See the ${left.length} best ${left.length === 1 ? 'fit' : 'fits'} ↓</a></p>` : ''}`;
      const jump = $side.querySelector('.fdjump'); if (jump) jump.onclick = e => { e.preventDefault(); $main.scrollIntoView({behavior: 'smooth'}); };
      const q = $side.querySelector('#fdq');
      q.oninput = () => { S.q = q.value.trim(); draw(true); };
      $side.querySelector('#fdreset').onclick = () => { FIDS.forEach(f => S[f].clear()); S.out.clear(); S.cmp = []; S.q = ''; S.home = true; draw(); };
      $side.querySelectorAll('details').forEach(d => d.ontoggle = () => d.open ? S.open.add(d.dataset.f) : S.open.delete(d.dataset.f));
      $side.querySelectorAll('[data-o]').forEach(b => b.onclick = () => {
        const [f, id] = b.dataset.o.split('|');
        S[f].has(id) ? S[f].delete(id) : S[f].add(id);
        // Boxes belong to a growth form: drop those whose form is no longer picked.
        if (f === 'form') [...S.box].forEach(x => { if (!S.form.has(x[0])) S.box.delete(x); });
        draw();
      });
    }

    // Best next checks: unpicked options that split the shortlist most evenly, with who is on each side.
    function nextChecks(F, left){
      if (left.length < 2) return '';
      const cands = F.filter(f => f.id !== 'ig' && !(f.id === 'form' && S.form.size)).flatMap(f => f.opts.filter(o => !S[f.id].has(o.id)).map(o => {
        const yes = left.filter(n => o.g.includes(n)); return {f, o, yes, no: left.filter(n => !yes.includes(n)), s: Math.min(yes.length, left.length - yes.length)};
      })).filter(x => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 2);
      if (!cands.length) return `<p class="note fdhint">The Coral Finder criteria cannot split these any further: compare the photos below.</p>`;
      const side = L => left.length <= 12 ? L.map(n => `<img src="${thumb(n, 'macro')}" alt="${esc(n)}" title="${esc(n)}">`).join('') : '';
      return `<div class="fdnext"><span class="label">Check next</span>${cands.map(x => `<button type="button" class="fdq" data-o="${x.f.id}|${x.o.id}"><span><small>${esc(x.f.name)}</small><b>${esc(x.o.t)}?</b></span><span class="fdsplit"><small>yes ${x.yes.length}</small>${side(x.yes)}</span><span class="fdsplit no"><small>no ${x.no.length}</small>${side(x.no)}</span></button>`).join('')}</div>`;
    }

    // Where a photo comes from (same split as the admin's origin tags), for the Dauin count; the credit itself is in the lightbox.
    const src = p => p.imr ? 'imr' : p.own || p.loc === 'dauin' ? 'dauin' : p.loc === 'ph' ? 'ph' : 'world';
    function drawMain(F, left, close, rest){
      const flat = [], mode = lay === 'auto' ? (left.length <= 12 ? 'mosaic' : 'cover') : lay;
      const ph = (n, p, v) => { flat.push({...p, genus: n, view: v}); return `<button type="button" class="zoom fdph" data-z="${flat.length - 1}"><img src="${img(p, 's')}" srcset="${srcset(p)}" sizes="(max-width:700px) 50vw, 360px" alt="${esc(n)}, ${esc(VIEW_LABEL[v] || v)}" loading="lazy"></button>`; };
      const tools = n => `<span class="fdtools"><button type="button" class="chip" data-out="${esc(n)}" title="Rule out ${esc(n)}">Rule out</button><button type="button" class="chip" data-cmpk="${esc(n)}" aria-pressed="${S.cmp.includes(n)}">Compare</button></span>`;
      // Clicking a genus name opens it in place (all its photos, bigger, with the ID cues); the sheet is a small link.
      const isX = n => S.open.has('x:' + n);
      const head = n => `<span class="fdhead"><button type="button" class="fdname" data-x="${esc(n)}" aria-expanded="${isX(n)}"><i>${esc(n)}</i></button><a class="fdsheetl" href="${genLink(n)}" title="Open the ${esc(n)} sheet">Sheet ↗</a></span><small>${tag(n)} · ${esc(G[n].fam)}${G[n].ig ? ' · IMR group ' + G[n].ig : ''}</small>`;
      // Many varied examples at a glance, as on the paper Coral Finder's pages: cover first, then round-robin over
      // colony / closer / corallites (featured photos lead each view), a different observation each time when possible.
      // With one view picked, only that view's photos (all views when the genus has none of it).
      const varied = (g, k) => { const one = pv !== 'mix' && (g.views[pv] || []).length, c = one ? null : cover(g);
        const L = (one ? [[pv]] : VIEWS).map(([v]) => (g.views[v] || []).filter(p => !c || p.f !== c.f).map(p => ({...p, view: v})));
        const out = c ? [c] : [], used = new Set(c ? [c.o] : []); let i = 0;
        while (out.length < k && L.some(x => x.length)) { const Q = L[i++ % L.length]; if (!Q.length) continue; const j = Q.findIndex(p => !used.has(p.o)); const p = Q.splice(j >= 0 ? j : 0, 1)[0]; used.add(p.o); out.push(p); }
        return out; };
      const more = n => { const all = allPhotos(G[n]), own = all.filter(p => src(p) === 'dauin').length;
        return all.length > 8 ? `<button type="button" class="linkish fdmore" data-x="${esc(n)}">All ${all.length} photos${own ? ` (${own} from Dauin)` : ''}</button>` : ''; };
      const mosaic = n => { const g = G[n];
        return `<article class="fdrow"><div class="fdinfo">${head(n)}<p>${esc(tipsText(g))}</p>${tools(n)}${more(n)}</div>
          <div class="fdmos">${varied(g, 8).map(p => ph(n, p, p.view)).join('')}</div></article>`; };
      // Opened genus: photos dominate; a narrow side column holds the name, the IMR cue, the tools and (folded) the
      // Coral Finder features.
      const big = (n, off) => { const g = G[n];
        return `<article class="fdbig${off ? ' off' : ''}"><div class="fdinfo fdbigside">${head(n)}${off ? `<small class="fdmiss">Off: ${misses(n, F).map(esc).join(', ')}</small>` : ''}
          <p class="fdcue">${esc(tipsText(g))}</p><details class="fdcrit"><summary>Coral Finder</summary><ul>${g.crit.map(c => `<li>${esc(c)}</li>`).join('')}</ul></details>${tools(n)}</div>
          <div class="fdbigph">${varied(g, 99).map(p => ph(n, p, p.view)).join('')}</div></article>`; };
      // Contact sheet: one line per genus with all its photos, small, to scan the whole shortlist line by line.
      const sheet = n => isX(n) ? big(n) : `<article class="fdsheet"><div class="fdinfo">${head(n)}</div><div class="fdall">${varied(G[n], 99).map(p => ph(n, p, p.view)).join('')}</div></article>`;
      // Photos follow the admin's curation (applied to DATA in app.js): hidden ones are gone, featured ones lead each
      // view, and Auto and "One clue off" tiles show the genus cover. The header's origin filter applies too.
      const tile = (n, off) => { if (isX(n)) return big(n, off); const g = G[n], v = pv === 'mix' ? null : pv, p = v ? (g.views[v] || [])[0] || cover(g) : cover(g);
        return `<article class="fdtile${off ? ' off' : ''}">${p ? ph(n, p, v && (g.views[v] || [])[0] ? v : p.view || 'medium') : '<span class="none">no photo</span>'}<div class="fdinfo">${head(n)}${off ? `<small class="fdmiss">Off: ${misses(n, F).map(esc).join(', ')}</small>` : ''}<p>${esc(tipsText(g))}</p>${tools(n)}</div></article>`; };
      // Look-alikes outside the shortlist: worth a glance before deciding.
      const near = left.length && left.length <= 3 ? uniq(left.flatMap(n => lookOf(n))).filter(n => !left.includes(n) && !close.includes(n)) : [];
      const chosen = F.flatMap(f => f.opts.filter(o => S[f.id].has(o.id)).map(o => ({f, o})));
      $main.innerHTML = `<div class="fdtop"><p class="fdcount"><b>${left.length}</b> ${used(F).length ? (left.length === 1 ? 'genus fits' : 'genera fit') + ' every clue' + (close.length ? `, ${close.length} more one clue off` : '') : 'IMR genera'}</p>
        <span class="fdsegs"><span class="seg" role="group" aria-label="Layout">${[['auto', 'Auto', 'Mosaic up to 12 genera, Cards beyond'], ['cover', 'Cards', 'One photo and the key features per genus'], ['mosaic', 'Mosaic', '8 varied photos per genus'], ['sheet', 'Contact sheet', 'Every photo of each genus']].map(([v, t, h]) => `<button type="button" data-lay="${v}" aria-pressed="${lay === v}" title="${h}">${t}${v === 'auto' && lay === 'auto' ? ` <small>(${mode === 'mosaic' ? 'Mosaic' : 'Cards'})</small>` : ''}</button>`).join('')}</span>
        <span class="seg" role="group" aria-label="Photos">${[['mix', 'Mix'], ...VIEWS].map(([v, t]) => `<button type="button" data-pv="${v}" aria-pressed="${pv === v}">${t}</button>`).join('')}</span></span></div>
        ${chosen.length || S.q ? `<p class="fdchosen">${chosen.map(({f, o}) => `<button type="button" class="chip" data-o="${f.id}|${o.id}" title="Remove">${esc(o.t)} ×</button>`).join('')}${S.q ? `<button type="button" class="chip" data-clearq>“${esc(S.q)}” ×</button>` : ''}</p>` : ''}
        ${used(F).length ? nextChecks(F, left.length ? left : close) : ''}
        ${left.length ? `${close.length || rest.length ? '<h3 class="fdgrp">Fits every clue</h3>' : ''}<div class="${mode === 'mosaic' ? 'fdrows' : mode === 'sheet' ? 'fdsheets' : 'fdgrid'}">${left.map(n => isX(n) && mode === 'mosaic' ? big(n) : mode === 'mosaic' ? mosaic(n) : mode === 'sheet' ? sheet(n) : tile(n)).join('')}</div>` : `<p class="note">No IMR genus fits every clue: one of them may be wrong. Check the closest genera below.</p>`}
        ${close.length ? `<h3 class="fdgrp">One clue off <small>in case a clue was misjudged</small></h3><div class="fdgrid">${close.map(n => tile(n, true)).join('')}</div>` : ''}
        ${rest.length ? `<details class="fdrest"><summary>${rest.length} other genera <small>two clues off or more</small></summary><p class="fdchosen">${rest.map(n => `<a class="chip" href="${genLink(n)}"><img src="${thumb(n, 'macro')}" alt=""><i>${esc(n)}</i></a>`).join('')}</p></details>` : ''}
        ${near.length ? `<p class="fdnear"><span class="label">Also check these look-alikes</span>${near.map(n => `<a class="chip" href="#cmp-${esc(left[0])}|${esc(n)}"${(G[left[0]].lsrc || {})[n] ? ` title="${esc(G[left[0]].lsrc[n])}"` : ''}><img src="${thumb(n, 'macro')}" alt=""><i>${esc(n)}</i></a>`).join('')}</p>` : ''}
        ${S.out.size ? `<p class="fdouts"><span class="label">Ruled out</span>${[...S.out].map(n => `<button type="button" class="chip" data-back="${esc(n)}" title="Bring back"><i>${esc(n)}</i> ↺</button>`).join('')}</p>` : ''}`;
      $main.querySelectorAll('[data-z]').forEach(b => b.onclick = () => zoom(flat, Number(b.dataset.z)));
      $main.querySelectorAll('[data-lay]').forEach(b => b.onclick = () => { lay = b.dataset.lay; store.set('imr-finder-lay', lay); draw(); });
      $main.querySelectorAll('[data-pv]').forEach(b => b.onclick = () => { pv = b.dataset.pv; store.set('imr-finder-pv', pv); draw(); });
      $main.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { const [f, id] = b.dataset.o.split('|'); S[f].has(id) ? S[f].delete(id) : S[f].add(id); if (f === 'form') [...S.box].forEach(x => { if (!S.form.has(x[0])) S.box.delete(x); }); draw(); });
      const cq = $main.querySelector('[data-clearq]'); if (cq) cq.onclick = () => { S.q = ''; draw(); };
      $main.querySelectorAll('[data-out]').forEach(b => b.onclick = () => { S.out.add(b.dataset.out); S.cmp = S.cmp.filter(x => x !== b.dataset.out); draw(); });
      $main.querySelectorAll('[data-back]').forEach(b => b.onclick = () => { S.out.delete(b.dataset.back); draw(); });
      $main.querySelectorAll('[data-x]').forEach(b => b.onclick = () => { const k = 'x:' + b.dataset.x; S.open.has(k) ? S.open.delete(k) : S.open.add(k); draw(); const a = $main.querySelector(`[data-x="${CSS.escape(b.dataset.x)}"]`); if (a && S.open.has(k)) a.closest('article').scrollIntoView({block: 'nearest', behavior: 'smooth'}); });
      $main.querySelectorAll('[data-cmpk]').forEach(b => b.onclick = () => { const n = b.dataset.cmpk; S.cmp = S.cmp.includes(n) ? S.cmp.filter(x => x !== n) : [...S.cmp, n].slice(-2); draw(); });
    }

    // Start screen: the clues people actually start from (growth form first, as on the paper Coral Finder, then
    // corallite size and walls), on one screen, before any list of genera. Three proposals:
    // a = one board (form tiles + size + walls, then Show), b = one question at a time, c = form then Coral Finder box.
    // Each growth-form tile shows 4 genera of that form, a different genus on each tile where possible.
    const tilePics = (() => { const seen = new Set(), out = {};
      [...FORMS].sort((a, b) => a.g.length - b.g.length).forEach(f => { const L = bySlate(f.g), fresh = L.filter(x => !seen.has(x)), pick = [...fresh, ...L.filter(x => seen.has(x))].slice(0, 4); pick.forEach(x => seen.add(x)); out[f.id] = pick; });
      return out; })();
    const formTile = (o, on, n) => `<button type="button" class="fdtileb c-${o.color}" data-o="form|${o.id}" aria-pressed="${on}"${!n && !on ? ' data-zero' : ''}>
      <span class="fdtq">${tilePics[o.id].map(x => `<img src="${thumb(x, 'wide')}" alt="" loading="lazy">`).join('')}</span>
      <span class="fdtt"><b>${esc(o.t)}</b><small>${esc(o.s || '')}</small></span><span class="fdc">${n}</span></button>`;
    const optBtn = (f, o, on, n) => `<button type="button" class="fdbigopt" data-o="${f.id}|${o.id}" aria-pressed="${on}"${!n && !on ? ' data-zero' : ''} title="${esc(o.s || o.t)}"><span>${esc(o.t)}${o.pg ? ` <small>${o.pg}</small>` : ''}</span><span class="fdc">${n}</span></button>`;
    function drawStart(F){
      const pool = names.filter(n => !S.out.has(n)), left = pool.filter(n => pen(n, F) === 0);
      const cnt = (f, o) => pool.filter(n => fits(n, F, f.id) && o.g.includes(n)).length;
      const fam = id => F.find(f => f.id === id);
      const row = id => { const f = fam(id); return f ? `<div class="fdsrow"><h3 title="${esc(f.note || '')}">${esc(f.name)}</h3><div class="fdsopts">${f.opts.map(o => optBtn(f, o, S[id].has(o.id), cnt(f, o))).join('')}</div></div>` : ''; };
      const forms = f => `<div class="fdforms">${f.opts.map(o => formTile(o, S.form.has(o.id), cnt(f, o))).join('')}</div>`;
      const show = `<button type="button" class="next fdshow" data-show>${used(F).length ? `Show the ${left.length} ${left.length === 1 ? 'genus' : 'genera'}` : `Show all ${left.length} genera`} →</button>`;
      const switcher = `<span class="seg fdsv" role="group" aria-label="Start screen proposal">${[['a', 'A · One board'], ['b', 'B · Step by step'], ['c', 'C · Coral Finder path']].map(([v, t]) => `<button type="button" data-sv="${v}" aria-pressed="${startV === v}">${t}</button>`).join('')}</span>`;
      let body;
      if (startV === 'b') {
        // One question at a time; "Not sure" skips it. Answers stay as chips to go back.
        const steps = ['form', 'size', 'wall'], done = S.step || 0, id = steps[Math.min(done, 2)], f = fam(id);
        const crumbs = steps.slice(0, done).map(x => { const ff = fam(x), picked = ff.opts.filter(o => S[x].has(o.id)); return `<button type="button" class="chip" data-step="${steps.indexOf(x)}">${esc(ff.name)}: ${picked.length ? picked.map(o => esc(o.t)).join(', ') : 'not sure'}</button>`; }).join('');
        body = done >= 3 ? '' : `<div class="fdstep"><p class="fdcrumbs">${crumbs}<span class="fdstepn">${done + 1} / 3</span></p><h2>${esc(f.name)}?</h2>
          ${id === 'form' ? forms(f) : `<div class="fdsopts big">${f.opts.map(o => optBtn(f, o, S[id].has(o.id), cnt(f, o))).join('')}</div>`}
          <p class="fdstepnav"><button type="button" class="chip" data-skip>Not sure, skip</button></p></div>`;
        if (done >= 3) { S.home = false; S.step = 0; return draw(); }
      } else if (startV === 'c') {
        // The paper Coral Finder's own path: growth form, then the box of that form, then the shortlist.
        const fb = fam('box');
        body = `${forms(fam('form'))}${fb ? `<div class="fdsrow"><h3 title="${esc(fb.note)}">${esc(fb.name)}</h3><div class="fdsopts boxes">${fb.opts.map(o => `<button type="button" class="fdboxb" data-o="box|${o.id}" aria-pressed="${S.box.has(o.id)}"><span class="fdtq s">${bySlate(o.g).slice(0, 4).map(x => `<img src="${thumb(x, 'macro')}" alt="" loading="lazy">`).join('')}</span><span>${esc(o.t)} <small>${o.pg || ''}</small></span><span class="fdc">${cnt(fb, o)}</span></button>`).join('')}</div></div>` : ''}`;
      } else {
        body = `${forms(fam('form'))}${row('size')}${row('wall')}`;
      }
      $start.innerHTML = `<div class="fdstop"><input type="search" id="fdsq" placeholder="Genus name…" aria-label="Find a genus by name">${switcher}${startV === 'b' ? '' : show}</div>${body}`;
      $start.querySelectorAll('[data-sv]').forEach(b => b.onclick = () => { startV = b.dataset.sv; store.set('imr-finder-start', startV); S.step = 0; FIDS.forEach(f => S[f].clear()); draw(); });
      $start.querySelector('#fdsq').oninput = e => { S.q = e.target.value.trim(); if (S.q) { S.home = false; draw(); const q = $side.querySelector('#fdq'); q.focus(); q.setSelectionRange(q.value.length, q.value.length); } };
      const sh = $start.querySelector('[data-show]'); if (sh) sh.onclick = () => { S.home = false; draw(); window.scrollTo(0, 0); };
      $start.querySelectorAll('[data-o]').forEach(b => b.onclick = () => {
        const [f, id] = b.dataset.o.split('|');
        S[f].has(id) ? S[f].delete(id) : S[f].add(id);
        if (f === 'form') [...S.box].forEach(x => { if (!S.form.has(x[0])) S.box.delete(x); });
        if (startV === 'b') S.step = (S.step || 0) + 1;
        // C: picking a box is the last step of the paper key.
        if (startV === 'c' && f === 'box' && S.box.size) S.home = false;
        draw(); if (!S.home) window.scrollTo(0, 0);
      });
      const sk = $start.querySelector('[data-skip]'); if (sk) sk.onclick = () => { S.step = (S.step || 0) + 1; draw(); };
      $start.querySelectorAll('[data-step]').forEach(b => b.onclick = () => { const i = Number(b.dataset.step); ['form', 'size', 'wall'].slice(i).forEach(x => S[x].clear()); S.step = i; draw(); });
    }

    function drawCmp(){
      $cmp.hidden = !S.cmp.length;
      $cmp.innerHTML = S.cmp.length === 2 ? `<a class="next" href="#cmp-${esc(S.cmp[0])}|${esc(S.cmp[1])}">Compare <i>${esc(S.cmp[0])}</i> and <i>${esc(S.cmp[1])}</i> side by side →</a><button type="button" class="chip" data-cx>Clear</button>`
        : `<span><i>${esc(S.cmp[0] || '')}</i> picked: tap Compare on a second genus.</span><button type="button" class="chip" data-cx>Clear</button>`;
      const x = $cmp.querySelector('[data-cx]'); if (x) x.onclick = () => { S.cmp = []; draw(); };
    }

    // keepFocus: typing in the name box redraws the panel without losing the caret.
    function draw(keepFocus){
      const F = facets(), pool = names.filter(n => !S.out.has(n) && fitsQ(n));
      $start.hidden = !S.home; $lay.hidden = S.home; $cmp.hidden = S.home || !S.cmp.length;
      if (S.home) { drawStart(F); saveHash(); return; }
      const left = pool.filter(n => pen(n, F) === 0), close = pool.filter(n => pen(n, F) > 0 && pen(n, F) <= 1), rest = pool.filter(n => pen(n, F) > 1);
      if (keepFocus) { const q = $side.querySelector('#fdq'), pos = q.selectionStart; drawSide(F, left); const q2 = $side.querySelector('#fdq'); q2.focus(); q2.setSelectionRange(pos, pos); }
      else drawSide(F, left);
      drawMain(F, left, close, rest); drawCmp(); saveHash();
      $main.querySelectorAll('.fdnext [data-o]').forEach(b => b.onclick = () => { const [f, id] = b.dataset.o.split('|'); S[f].add(id); draw(); });
    }
    // "/" jumps to the name box; Escape (outside the photo viewer and the name box) starts over.
    const key = e => {
      if (!document.body.contains(root)) return document.removeEventListener('keydown', key);
      if (!lb.hidden || e.target.closest && e.target.closest('input,textarea')) return;
      if (e.key === '/') { e.preventDefault(); $side.querySelector('#fdq').focus(); }
      else if (e.key === 'Escape') $side.querySelector('#fdreset').click();
    };
    document.addEventListener('keydown', key);
    draw();
    return () => document.removeEventListener('keydown', key);
  }
});
