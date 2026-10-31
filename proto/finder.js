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
    const S = {out: new Set(), cmp: [], q: '', open: new Set()};
    FIDS.forEach(f => S[f] = new Set());
    let view = store.get('imr-finder-view', 'auto');
    (arg || '').split(';').forEach(kv => { const [k, v] = kv.split('='); if (!v) return; const L = decodeURIComponent(v).split(',');
      if (FIDS.includes(k)) L.forEach(x => S[k].add(x)); else if (k === 'out') L.forEach(x => G[x] && S.out.add(x)); else if (k === 'q') S.q = L.join(','); });
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

    root.innerHTML = `<div class="fdlayout"><aside class="fdside" id="fdside"></aside><section class="fdmain" id="fdmain"></section></div><div class="fdcmp" id="fdcmp" hidden></div>`;
    const $side = root.querySelector('#fdside'), $main = root.querySelector('#fdmain'), $cmp = root.querySelector('#fdcmp');

    // On phones the panel sits above the shortlist: only growth form and the families in use start open.
    function drawSide(F, left){
      const narrow = matchMedia('(max-width:900px)').matches;
      $side.innerHTML = `<h3 class="fdclues">Clues you can see</h3><div class="fdsearch"><input type="search" id="fdq" placeholder="Genus name…" value="${esc(S.q)}" aria-label="Filter by genus name"><button type="button" class="chip" id="fdreset"${!used(F).length && !S.q && !S.out.size ? ' disabled' : ''}>Start over</button></div>
      ${F.map(f => {
        const picked = S[f.id].size, open = picked || S.open.has(f.id) || (narrow ? f.id === 'form' : !f.closed);
        return `<details class="fdfacet" data-f="${f.id}"${open ? ' open' : ''}><summary>${esc(f.name)}${picked ? ` <span class="fdn">${picked}</span>` : ''}</summary>${f.note ? `<p class="note">${esc(f.note)}</p>` : ''}
        <div class="fdopts${f.thumbs ? ' th' : ''}">${f.opts.map(o => {
          const on = S[f.id].has(o.id), n = names.filter(x => !S.out.has(x) && fits(x, F, f.id) && o.g.includes(x)).length;
          const pv = f.thumbs ? `<span class="fdth">${bySlate(o.g).slice(0, 3).map(x => `<img src="${thumb(x, f.id === 'form' ? 'wide' : 'medium')}" alt="" loading="lazy">`).join('')}</span>` : '';
          return `<button type="button" class="fdopt${f.id === 'form' ? ' c-' + o.color : ''}" data-o="${f.id}|${o.id}" aria-pressed="${on}"${!n && !on ? ' data-zero' : ''} title="${esc(o.s || o.t)}">${pv}<span class="fdt">${esc(o.t)}${o.pg ? ` <small>${o.pg}</small>` : ''}</span><span class="fdc">${n}</span></button>`;
        }).join('')}</div></details>`;
      }).join('')}${narrow ? `<p><a class="next fdjump" href="#fdmain">See the ${left.length} best ${left.length === 1 ? 'fit' : 'fits'} ↓</a></p>` : ''}`;
      const jump = $side.querySelector('.fdjump'); if (jump) jump.onclick = e => { e.preventDefault(); $main.scrollIntoView({behavior: 'smooth'}); };
      const q = $side.querySelector('#fdq');
      q.oninput = () => { S.q = q.value.trim(); draw(true); };
      $side.querySelector('#fdreset').onclick = () => { FIDS.forEach(f => S[f].clear()); S.out.clear(); S.cmp = []; S.q = ''; draw(); };
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

    function drawMain(F, left, close, rest){
      const flat = [], mode = view === 'auto' ? (left.length <= 8 ? 'rows' : 'medium') : view;
      const ph = (n, p, v) => { flat.push({...p, genus: n, view: v}); return `<button type="button" class="zoom fdph" data-z="${flat.length - 1}"><img src="${img(p, 's')}" srcset="${srcset(p)}" sizes="(max-width:700px) 50vw, 360px" alt="${esc(n)}, ${esc(VIEW_LABEL[v] || v)}" loading="lazy">${p.own ? '<em class="own">Dauin</em>' : ''}</button>`; };
      const tools = n => `<span class="fdtools"><button type="button" class="chip" data-out="${esc(n)}" title="Rule out ${esc(n)}">Rule out</button><button type="button" class="chip" data-cmpk="${esc(n)}" aria-pressed="${S.cmp.includes(n)}">Compare</button></span>`;
      const head = n => `<a class="fdname" href="${genLink(n)}"><i>${esc(n)}</i></a><small>${tag(n)} · ${esc(G[n].fam)}${G[n].ig ? ' · IMR group ' + G[n].ig : ''}</small>`;
      const row = n => {
        const g = G[n], all = allPhotos(g), own = all.filter(p => p.own).length;
        return `<article class="fdrow"><div class="fdinfo">${head(n)}<p>${esc(g.sum)}</p>${tools(n)}
          <button type="button" class="linkish fdmore" data-more="${esc(n)}">${S.open.has('p:' + n) ? 'Fewer photos' : `All ${all.length} photos${own ? ` (${own} from Dauin)` : ''}`}</button></div>
          <div class="fdviews">${VIEWS.map(([v, l]) => { const p = (g.views[v] || [])[0]; return p ? `<figure>${ph(n, p, v)}<figcaption>${l}</figcaption></figure>` : ''; }).join('')}</div>
          ${S.open.has('p:' + n) ? `<div class="fdall">${all.map(p => ph(n, p, p.view)).join('')}</div>` : ''}</article>`;
      };
      const tile = (n, off) => { const g = G[n], v = off ? 'medium' : mode, p = (g.views[v] || [])[0] || cover(g);
        return `<article class="fdtile${off ? ' off' : ''}">${p ? ph(n, p, (g.views[v] || [])[0] ? v : 'medium') : '<span class="none">no photo</span>'}<div class="fdinfo">${head(n)}${off ? `<small class="fdmiss">Off: ${misses(n, F).map(esc).join(', ')}</small>` : ''}<p>${esc(g.sum)}</p>${tools(n)}</div></article>`; };
      // Look-alikes outside the shortlist: worth a glance before deciding.
      const near = left.length && left.length <= 3 ? uniq(left.flatMap(n => lookOf(n))).filter(n => !left.includes(n) && !close.includes(n)) : [];
      const chosen = F.flatMap(f => f.opts.filter(o => S[f.id].has(o.id)).map(o => ({f, o})));
      $main.innerHTML = `<div class="fdtop"><p class="fdcount"><b>${left.length}</b> ${used(F).length ? (left.length === 1 ? 'genus fits' : 'genera fit') + ' every clue' + (close.length ? `, ${close.length} more one clue off` : '') : 'IMR genera'}</p>
        <div class="seg" role="group" aria-label="Photos">${[['auto', 'Auto'], ['rows', 'All views'], ...VIEWS].map(([v, t]) => `<button type="button" data-view="${v}" aria-pressed="${view === v}">${t}</button>`).join('')}</div></div>
        ${chosen.length || S.q ? `<p class="fdchosen">${chosen.map(({f, o}) => `<button type="button" class="chip" data-o="${f.id}|${o.id}" title="Remove">${esc(o.t)} ×</button>`).join('')}${S.q ? `<button type="button" class="chip" data-clearq>“${esc(S.q)}” ×</button>` : ''}</p>` : `<p class="note">All 39 IMR genera. Start with whatever is clearest on your photo.</p>`}
        ${nextChecks(F, left.length ? left : close)}
        ${left.length ? `${close.length || rest.length ? '<h3 class="fdgrp">Fits every clue</h3>' : ''}<div class="${mode === 'rows' ? 'fdrows' : 'fdgrid'}">${left.map(n => mode === 'rows' ? row(n) : tile(n)).join('')}</div>` : `<p class="note">No IMR genus fits every clue: one of them may be wrong. Check the closest genera below.</p>`}
        ${close.length ? `<h3 class="fdgrp">One clue off <small>in case a clue was misjudged</small></h3><div class="fdgrid">${close.map(n => tile(n, true)).join('')}</div>` : ''}
        ${rest.length ? `<details class="fdrest"><summary>${rest.length} other genera <small>two clues off or more</small></summary><p class="fdchosen">${rest.map(n => `<a class="chip" href="${genLink(n)}"><img src="${thumb(n, 'macro')}" alt=""><i>${esc(n)}</i></a>`).join('')}</p></details>` : ''}
        ${near.length ? `<p class="fdnear"><span class="label">Also check these look-alikes</span>${near.map(n => `<a class="chip" href="#cmp-${esc(left[0])}|${esc(n)}"${(G[left[0]].lsrc || {})[n] ? ` title="${esc(G[left[0]].lsrc[n])}"` : ''}><img src="${thumb(n, 'macro')}" alt=""><i>${esc(n)}</i></a>`).join('')}</p>` : ''}
        ${S.out.size ? `<p class="fdouts"><span class="label">Ruled out</span>${[...S.out].map(n => `<button type="button" class="chip" data-back="${esc(n)}" title="Bring back"><i>${esc(n)}</i> ↺</button>`).join('')}</p>` : ''}`;
      $main.querySelectorAll('[data-z]').forEach(b => b.onclick = () => zoom(flat, Number(b.dataset.z)));
      $main.querySelectorAll('[data-view]').forEach(b => b.onclick = () => { view = b.dataset.view; store.set('imr-finder-view', view); draw(); });
      $main.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { const [f, id] = b.dataset.o.split('|'); S[f].has(id) ? S[f].delete(id) : S[f].add(id); if (f === 'form') [...S.box].forEach(x => { if (!S.form.has(x[0])) S.box.delete(x); }); draw(); });
      const cq = $main.querySelector('[data-clearq]'); if (cq) cq.onclick = () => { S.q = ''; draw(); };
      $main.querySelectorAll('[data-out]').forEach(b => b.onclick = () => { S.out.add(b.dataset.out); S.cmp = S.cmp.filter(x => x !== b.dataset.out); draw(); });
      $main.querySelectorAll('[data-back]').forEach(b => b.onclick = () => { S.out.delete(b.dataset.back); draw(); });
      $main.querySelectorAll('[data-more]').forEach(b => b.onclick = () => { const k = 'p:' + b.dataset.more; S.open.has(k) ? S.open.delete(k) : S.open.add(k); draw(); });
      $main.querySelectorAll('[data-cmpk]').forEach(b => b.onclick = () => { const n = b.dataset.cmpk; S.cmp = S.cmp.includes(n) ? S.cmp.filter(x => x !== n) : [...S.cmp, n].slice(-2); draw(); });
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
