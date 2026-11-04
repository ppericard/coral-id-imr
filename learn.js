// IMR Reef ID: the Learn pages, split out of app.js (2026-11-02, code review L1: one file per part). Genera (the list,
// its filters and groups: viewGenera), a genus sheet (viewGenus, myProg), Look-alikes (viewLookalikes, the montage
// deck, classics, pairs) and Compare side by side (viewCompare). The shared helpers they use (photos, ID tips,
// glossary) stay in app.js. A classic script like app.js, loaded right after quiz.js (index.html, in order); app.js
// waits for every script (window.BOOT) before its first page. Required like app.js.
/* ---------- genera ---------- */
let azFam = null,
  azQ = '',
  xOpen = false;
// Genera order: 'lecture' (IMR Lecture 6 groups, default) or 'slate' (numbers on the IMR slate).
let azOrder = (() => {
  try {
    return localStorage.getItem('reefid-sync-order') || 'lecture';
  } catch (e) {
    return 'lecture';
  }
})();
// Genera view: 'photos' (cards) or 'tips' (the ID tips list, formerly its own page).
let azView = (() => {
  try {
    return localStorage.getItem('reefid-sync-gview') || 'photos';
  } catch (e) {
    return 'photos';
  }
})();
let gfOpen = false; // phone Filter fold on Genera, kept open across redraws
// Step 0 of the Learn path (Pierre, 2026-11-03): Coral basics before the genus sheets, as the first card of the Genera
// page ("0 · Coral basics" in the lecture order, the first card in the slate order), with where the player is in it.
const BASICS_STEPS = 7;
function basicsCard(tips) {
  const n = Object.keys((store.get(BASICS_KEY, {}) || {}).seen || {}).length,
    done = basicsDone(),
    state = done
      ? '✓ Done'
      : n
        ? `${Math.min(n, BASICS_STEPS - 1)} of ${BASICS_STEPS} steps seen`
        : `${BASICS_STEPS} short steps · about 5 min`,
    say = 'Polyp, corallite, septa, walls, growth forms: the words the ID tips use, on real photos.',
    art = `<span class="ph bxart" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${BASICS_ICON}</svg></span>`;
  return tips
    ? `<article class="tipg bxtip"><a href="#basics" class="tipph">${art}<i>Coral basics</i></a><div><p class="note">${state}</p><p>${say}</p></div></article>`
    : `<a class="card bxcard${done ? ' done' : ''}" href="#basics">${art}<span class="cap"><b>Coral basics</b><small>${state}</small><p>${say}</p></span></a>`;
}
function viewGenera() {
  const fams = [...new Set(Object.values(DATA.gen).map(g => g.fam))].sort();
  // Phones: family, order and the group index fold behind one Filter line, so the genera start near the top.
  const phone = isPhone();
  const famSel = `<select id="fam" aria-label="Family"><option value="">All families</option><option value="★"${azFam === '★' ? ' selected' : ''}>★ Not surveyed</option>${fams.map(f => `<option value="${esc(f)}"${azFam === f ? ' selected' : ''}>${esc(altName(f))}</option>`).join('')}</select>`;
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
    ${viewSeg}${phone ? `<details class="gfilt"${gfOpen ? ' open' : ''}><summary>Filter${azFam ? ' <span class="ikn">1</span>' : ''}</summary>${famSel}${orderSeg}${jump}</details>` : famSel + orderSeg}</div>
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
            ? `<h3 class="gdiv" id="grp-${gr.n}" style="--g:${groupHue(gr.n)}" title="${esc(gr.t)}"><span class="gn">${gr.n}</span><span class="gtitle">${esc(gr.t)}</span></h3>`
            : '<h3 class="gdiv"><span class="gn">★</span>Not covered in the lecture</h3>';
          return `<section class="gblk" data-n="${L.length}">${head}${L.map(n => (tips ? tipCard(n) : card(n, 'stripe'))).join('')}</section>`;
        })
        .join('');
      if (html && !q && !azFam && SUBJ.pages.includes('basics'))
        html = `<section class="gblk gbasics" data-n="1"><h3 class="gdiv" title="Before the genera"><span class="gn">0</span><span class="gtitle">Coral basics</span></h3>${basicsCard(tips)}</section>${html}`;
    } else
      html =
        (!q && !azFam && names.length && SUBJ.pages.includes('basics') ? basicsCard(tips) : '') +
        names.map(n => (tips ? tipCard(n) : card(n, true))).join('');
    const grid = document.getElementById('azgrid');
    // The Coral Finder book's extra genera (not on the IMR list, seen at Dauin): one folded line under the 39 (Pierre).
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
          localStorage.setItem('reefid-sync-order', azOrder);
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
          localStorage.setItem('reefid-sync-gview', azView);
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
        const i = flat.findIndex(x => x.f === p.f),
          alt = `${esc(name)}, ${p.imr ? 'IMR lecture photo' : label.toLowerCase() + ' view'}`;
        return `<figure><button type="button" class="zoom" data-z="${i}" aria-label="Enlarge photo: ${alt}"><img src="${img(p, 's')}" srcset="${srcset(p)}" data-sz="strip" sizes="${sizesFor('strip')}" alt="${alt}" loading="lazy">${ZOOMI}</button><figcaption>${p.imr ? `<b class="lect">IMR lecture</b> · slide ${p.slide}` : credit(p)}</figcaption></figure>`;
      };
      // The cover is already shown at the top: not repeated in its row when the row has other featured photos.
      const feat0 = g.sl[v].feat,
        feat = cv && feat0.length > 1 ? feat0.filter(p => p.f !== cv.f) : feat0,
        more = g.sl[v].more;
      return `<section class="vrow"><h3>${label}${feat.length ? '' : ' <span class="gap">missing</span>'}</h3>${feat.length ? `<div class="strip">${feat.map(fig).join('')}</div>` : '<p class="note">No good photo yet for this view.</p>'}
      ${more.length ? `<details class="more"><summary>${more.length} more ${label.toLowerCase()} photo${more.length > 1 ? 's' : ''}</summary><div class="strip">${more.map(fig).join('')}</div></details>` : ''}</section>`;
    })
    .join('');
  // The Coral ID Key criteria (the Coral Finder book's text, cited by page): visible for genera the lecture skips, otherwise folded under "More details" with sources and key.
  const cfList = `<h3>Coral ID Key criteria <span class="pg">Coral Finder p. ${g.pages.join(', ')}</span></h3><ul class="crit">${g.crit.map(c => `<li>${esc(c)}</li>`).join('')}</ul>`;
  // Name, slate number and family sit in the sticky header bar (ctxBar), not here.
  $v.innerHTML = `<p class="lede">One genus on one page. The highlighted <b>ID tips (IMR)</b> are what to remember; the <b>IMR lecture notes</b> give the full lecture cues. Its <b>IMR group</b> is the lecture's confusion group: genera in the same group are the ones to tell apart. Photos at three distances: <b>colony</b>, <b>close-up</b> (10-30 cm) and <b>corallites</b> (macro); tap one to enlarge it. <b>Don't confuse with</b>, at the bottom, shows its look-alikes in the same view. Dotted words show their definition when tapped.${isPhone() ? '' : ' ← / → go to the previous / next genus.'}</p>
  <article class="sheet">
    ${imr.length || g.x ? '' : `<p class="lede keyid">${esc(g.sum)}</p>`}
    ${
      isBenthic(name)
        ? `<p class="warn">${BENTHIC_NOTE}</p>`
        : g.x
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
      ${cv ? `<button type="button" class="zoom hero-ph" data-z="${ci}" aria-label="Enlarge photo: ${esc(name)}"><img src="${img(cv, fit(Math.min(innerWidth, 640)))}" data-fit alt="${esc(name)}">${ZOOMI}</button>` : ''}
      <div class="idbox">
        ${plainLine(g)}
        ${g.x ? `<div class="tipbox"><h3>ID tips <span class="pg">Coral Finder p. ${g.pages.join(', ')}</span></h3>${tipsList(g)}</div>` : ''}
        ${imr.length || g.mn ? `<div class="tipbox">${imr.length ? `<h3>ID tips (IMR) <span class="pg">group ${g.ig}: ${esc(DATA.imrg[g.ig - 1].t)}</span></h3>${tipsList(g)}` : ''}${g.mn ? `<p class="mn"><b>Mnemonic:</b> ${esc(g.mn)}</p>` : ''}</div>` : ''}
        ${imr.length ? `<div class="lnotes"><h3>IMR lecture notes</h3>${notesList(g)}</div>` : ''}
        ${imr.length ? '' : cfList}
        <details class="more sheetmore"><summary>More details</summary>
        ${imr.length ? cfList : ''}
        ${g.check ? `<p class="note check"><b>To check with an IMR trainer:</b> ${esc(g.check)}</p>` : ''}
        ${g.info ? `<div class="note osrc"><b>Other sources:</b><ul class="srcs">${g.info.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
        <h3>In the key <span class="pg">Coral Finder p. ${g.pages.join(', ')}</span></h3><div class="kpick">${paths.map(({k, l}) => `<a class="c-${k.color}" href="#idkey|form=${l.id[0]};box=${l.id}">${esc(k.name)} › ${esc(leafLabel(l))}</a>`).join('')}</div>
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
  const [k, t] = shownLevel(n);
  if (k === 'new') return '';
  const st = lvStep(n),
    pc = Math.round(100 * genScore(n)),
    m = k === 'ok' ? [] : missing(n);
  return (
    `<p class="myprog"><a class="mpl s${st}${k === 'weak' ? ' weak' : ''}" href="#progress" title="My progress">${lvIcon(st)}${MASTERY[st][0]}${k === 'weak' ? ' · ' + t : ''}${st > 0 && st < 5 ? ` <small class="pct" style="--p:${pc}%">${pc}%</small>` : st === 5 ? ' ✓' : ''}</a>` +
    `<span>${k === 'weak' ? `Under ${Math.round(100 * OPEN.P)}% expected right on a typical photo of it. ` : ''}${m.length ? 'Still needed: ' + esc(m.join('; ')) + '.' : 'You know this genus.'}</span></p>`
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
let cmpView = store.get('reefid-sync-cmpview', 'medium');
const viewSeg = () =>
  `<div class="seg" role="group" aria-label="View">${VIEWS.map(([v, t]) => `<button type="button" data-cv="${v}" aria-pressed="${cmpView === v}">${t}</button>`).join('')}</div>`;
const bindViewSeg = redraw =>
  $v.querySelectorAll('[data-cv]').forEach(
    b =>
      (b.onclick = () => {
        cmpView = b.dataset.cv;
        store.set('reefid-sync-cmpview', cmpView);
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
  // The declared look-alikes, then those from the players' answers (model.js dataLooks: pairs no source names that
  // players keep mixing up; 2026-11-04), said as such.
  const D = new Set(
      dataLooks()
        .filter(p => p.includes(name))
        .map(p => (p[0] === name ? p[1] : p[0]))
        .filter(n => !lookOf(name).includes(n))
    ),
    L = [...lookOf(name), ...D].sort((a, b) => mixedUp(name, b) - mixedUp(name, a));
  return `<h3>Don't confuse with</h3>
    <div class="seg-row"><span class="label">Show</span>${viewSeg()}</div>
    <div class="lrow"><div class="lt self">${viewShot(name, cmpView)}<span><i>${esc(name)}</i><small>this genus</small><span class="psum">${esc(tipsText(GX(name)))}</span></span></div>
    ${L.map(n => {
      const m = mixedUp(name, n),
        side = DATA.gen[name] && DATA.gen[n];
      return `<a class="lt" href="${side ? `#cmp-${esc(name)}|${esc(n)}` : `#g-${esc(n)}`}">${m ? `<span class="pmix">you mixed them up ×${m}</span>` : ''}${viewShot(n, cmpView)}<span><i>${esc(n)}</i><span class="psum">${esc(tipsText(GX(n)))}</span>${(GX(name).lsrc || {})[n] ? `<small class="lsrc">${esc(GX(name).lsrc[n])}</small>` : D.has(n) ? '<small class="lsrc">Often mixed up by players</small>' : ''}<b class="cmpgo">${side ? 'Compare side by side →' : 'Open the sheet →'}</b></span></a>`;
    }).join('')}</div>
    ${cmpShots([name])}`;
}
// Starred genera are on the slate as look-alikes of surveyed genera. Those the lecture doesn't group are shown
// in the lecture group most of their Coral Finder look-alikes belong to (ties: the first listed look-alike).
// Millepora and the bonus genera: no lecture group (0). Both in core.js (lectureGroup, starRefs), where the opening of
// genera reads the same references (model.js weighted: a ★ genus opens after the genera its card names).
function shownGroup(n) {
  return lectureGroup(DATA, n);
}
const starNote = n => {
  const L = starRefs(DATA, n);
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
  let hint = matchMedia('(pointer: coarse)').matches && !store.get('reefid-sync-lkswiped', 0);
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
    $v.innerHTML = `${drawn ? '' : `<p class="lede">The look-alikes the IMR lecture or the Coral Finder book compare directly, one pair per screen: one photo of each genus in the same view, with the ID tips that tell them apart. Pairs you mixed up in the quiz come first, in red. The other look-alikes of a genus are at the bottom of its sheet.</p>`}
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
      store.set('reefid-sync-lkswiped', 1);
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
  // Millepora and the bonus genera can be compared with a slate genus or with each other (quiz mix-ups).
  const A = gameGenus(a) && GX(a),
    B = gameGenus(b) && GX(b);
  if (!A || !B) return viewLookalikes();
  const col = (n, g) =>
    `<div class="cmpcol"><h3><i>${esc(n)}</i>${isBenthic(n) ? ' <small>fire coral</small>' : g.x ? ' <small>bonus</small>' : g.n ? '' : ' ★'} <a class="linkish cmpsheet" href="#g-${esc(n)}">Sheet ›</a></h3><p class="note">${esc(altName(g.fam))}${g.ig ? ' · IMR group ' + g.ig : ''}</p><div class="tipbox fbtips">${g.qt ? `<p class="label">${tipsLabel(g)}</p>` : ''}${tipsList(g, 'imrfb')}</div><details class="more"><summary>Coral ID Key criteria</summary><ul class="crit">${g.crit.map(c => `<li>${esc(c)}</li>`).join('')}</ul></details></div>`;
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
  // Opened from the Duel tab's relief card (quiz.js DUELBACK): Back to the duel, to the same duel and run (Pierre,
  // 2026-11-04), in view however far the page scrolls (Pierre, the same day: an inline one at the top and the end was not
  // seen); it replaces Drill this pair, which leads to the same duel. Phones and tablets: a floating button at the bottom
  // centre (.cmpfab). Desktop (from 1024 px): a light sticky band under the page bar, "Duel paused: A or B" and the
  // button (.duelband; Pierre picked it among four desktop placements: in the page bar it got lost, a side column was too
  // big, a floating button covered the photos). CSS shows one or the other.
  const back = typeof duelBackFor === 'function' && !!duelBackFor(hashNow());
  // The cues sit above the photos, each under its genus, so they can be read while comparing.
  $v.innerHTML = `<p class="lede">Two genera that are often confused, side by side: their ID tips, then the same view of each. <b>Drill this pair</b> at the bottom turns it into a quick duel.</p>
  ${back ? `<div class="duelband" role="region" aria-label="Duel paused"><span>Duel paused: <i>${esc(a)}</i> or <i>${esc(b)}</i></span><button type="button" class="next" data-duelback>Back to the duel</button></div>` : ''}<div class="cmprow text">${col(a, A)}${col(b, B)}</div>
  ${VIEWS.filter(([v]) => (A.views[v] || []).length || (B.views[v] || []).length)
    .map(row)
    .join('')}
  ${(DATA.cmp || []).some(c => c.imr && c.g.includes(a) && c.g.includes(b)) ? `<h3 class="cmplab">IMR lecture</h3>${cmpShots([a, b])}` : ''}
  ${
    back
      ? '<div class="cmpfabpad" aria-hidden="true"></div><button type="button" class="next cmpfab" data-duelback>Back to the duel</button>'
      : `<p><a class="next" href="#quiz-duel|${esc(a)}|${esc(b)}">Drill this pair</a></p>`
  }`;
  $v.querySelectorAll('[data-duelback]').forEach(x => (x.onclick = duelBack));
  // The band sticks right under the page bar, whose height it reads (app.js showModes drew it before this page).
  const bar = document.getElementById('modes'),
    band = $v.querySelector('.duelband');
  if (band && bar && bar.offsetHeight) band.style.setProperty('--ctx-h', bar.offsetHeight + 'px');
  $v.querySelectorAll('[data-z]').forEach(x => (x.onclick = () => zoom(flat, Number(x.dataset.z))));
  bindCards();
  bindGo();
}
// Fish families (#genera with the fish subject, app.js UNITS list): the IMR entries by the groups of the identification
// key in force (fish.json key: for the Indo-Pacific, the index of a reef fish ID book; AGENTS.md rule 6c), in the key's
// order, only the groups that hold an entry, each under its number and title as the key prints them; each entry with a
// photo, its IMR cues and how IMR tells its look-alikes apart; then the opt-in circles the player has on. The key is
// credited in full under the list (its short form in the help). A region with no key: the entries in one block. The winks
// stay a surprise. No sheet per family yet (ROADMAP "Fish mode").
function viewFishList() {
  const tip = n => {
    const g = GX(n),
      p = g.views.wide[0];
    return `<article class="tipg"><span class="tipph">${p ? `<img ${thumb(p, '130px')} alt="" loading="lazy">` : ''}<b>${uname(n)}</b><small>${esc(altName(g.fam))}</small></span><div>${tipsList(g)}${
      g.lk.length
        ? `<p class="note">Don't confuse with ${g.lk.map(([o, t]) => `<b>${esc(unameT(o))}</b> (${esc(t.replace(/^[^:]*:\s*/, ''))})`).join('; ')}</p>`
        : ''
    }${g.sub.length ? `<p class="note">IMR names inside it: ${g.sub.map(esc).join(', ')}</p>` : ''}</div></article>`;
  };
  const blk = (head, L) => (L.length ? `<section class="gblk" data-n="${L.length}">${head}${L.map(tip).join('')}</section>` : '');
  const key = FISH.key,
    head = (n, t) =>
      `<h3 class="gdiv"${typeof n === 'number' ? ` style="--g:${groupHue(n)}"` : ''}><span class="gn">${n}</span><span class="gt">${esc(t)}</span></h3>`,
    groups = key
      ? [
          ...FISH.groups.map(gr =>
            blk(
              head(gr.n, gr.title),
              FISH.c1.filter(n => GX(n).group === gr.n)
            )
          ),
          blk(
            head('?', 'Not in a group yet'),
            FISH.c1.filter(n => !GX(n).group)
          )
        ]
      : [blk('', FISH.c1)];
  const sets = SETS().map(S =>
    Q[S.k] ? blk(`<h3 class="gdiv"><span class="gn">+</span><span class="gt">${esc(S.name)}</span></h3>`, S.units()) : ''
  );
  $v.innerHTML = `<p class="lede">The fish families of the IMR fish presentation${key ? `, by the identification groups of ${esc(key.short)}` : ''}, with the IMR cues. Photos: iNaturalist observations for now.</p><div class="tiplist gpack">${[...groups, ...sets].join('')}</div>${key ? `<p class="note keycite">Identification groups: ${esc(key.cite)}</p>` : ''}`;
  packGroups($v.querySelector('.tiplist'));
}
