// IMR Reef ID: the Learn pages. Genera (the list, its filters and groups: viewGenera), a genus sheet (viewGenus,
// myProg), Look-alikes (viewLookalikes, the montage deck, classics, pairs) and Compare side by side (viewCompare). The
// shared helpers they use (photos, ID tips, glossary) are in app.js. A classic script like app.js, loaded right after
// quiz.js (index.html order); app.js waits for every script (window.BOOT) before its first page. Required like app.js.
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
// Genera view: 'photos' (cards) or 'tips' (the ID tips list).
let azView = (() => {
  try {
    return localStorage.getItem('reefid-sync-gview') || 'photos';
  } catch (e) {
    return 'photos';
  }
})();
let gfOpen = false; // phone Filter fold on Genera, kept open across redraws
// Step 0 of the Learn path: Coral basics before the genus sheets, as the first card of the Genera page ("0 · Coral
// basics" in the lecture order), with where the player is in it. It always opens step 1 (the start of the path starts
// the path); the Basics tab, Home and the quiz's offers open #learn/basics, which resumes at the last step seen. The same
// card opens a subject's own module (UNITS basics: name, card, trail).
// The card's picture: the seven steps as a trail of line drawings, from the colony down to the septal teeth and back out
// to the growth forms, each stop a disc in its own colour (--bt1…--bt7, app.css). Stops seen: tinted, with a ✓; the
// next: a deeper tint, a ring and "Next: <word>" ("Start: Colony" while none is seen); the others desaturated, joined by
// a dotted path. Four along the top, three back along the bottom (Teeth under Septa). Words: proto/basics.js terms.
const BASICS_TRAIL = [
  [
    'colony',
    'Colony',
    '<path d="M3 19.5h18"/><path d="M4.5 19.5c0-6 3.4-10 7.5-10s7.5 4 7.5 10"/><circle cx="9" cy="14" r=".8"/><circle cx="12" cy="12.2" r=".8"/><circle cx="15" cy="14" r=".8"/><circle cx="10.5" cy="17" r=".8"/><circle cx="13.5" cy="17" r=".8"/>'
  ],
  ['polyp', 'Polyp', BASICS_ICON],
  [
    'corallite',
    'Corallite',
    '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.2"/><circle cx="3.5" cy="5" r="1.6"/><circle cx="20.5" cy="19" r="1.6"/><circle cx="20.5" cy="5" r="1.6"/>'
  ],
  // Step 4 teaches septa and costae together: its stop names both, and its drawing shows the blades
  // inside the rim (septa) carried on outside it (costae).
  [
    'septa',
    'Septa / costae',
    '<circle cx="12" cy="12" r="6.5"/><path d="M13.9 12L18.5 12M15.12 13.8L17.63 15.25M12.95 13.65L15.25 17.63M12 15.6L12 18.5M11.05 13.65L8.75 17.63M8.88 13.8L6.37 15.25M10.1 12L5.5 12M8.88 10.2L6.37 8.75M11.05 10.35L8.75 6.37M12 8.4L12 5.5M12.95 10.35L15.25 6.37M15.12 10.2L17.63 8.75"/><path d="M18.5 12L22.5 12M17.63 15.25L21.09 17.25M15.25 17.63L17.25 21.09M12 18.5L12 22.5M8.75 17.63L6.75 21.09M6.37 15.25L2.91 17.25M5.5 12L1.5 12M6.37 8.75L2.91 6.75M8.75 6.37L6.75 2.91M12 5.5L12 1.5M15.25 6.37L17.25 2.91M17.63 8.75L21.09 6.75"/>'
  ],
  ['teeth', 'Teeth', '<path d="M3 19h18"/><path d="M3 19v-5l2-3 2 3 2-3 2 3 2-3 2 3 2-3 2 3 2-3v8"/>'],
  [
    'walls',
    'Walls',
    '<path d="M7.5 4.5 12 7v5l-4.5 2.5L3 12V7Z"/><path d="M12 7l4.5-2.5L21 7v5l-4.5 2.5L12 12"/><path d="M7.5 14.5V19l4.5 2.5 4.5-2.5v-4.5"/>'
  ],
  ['forms', 'Growth forms', '<path d="M3 20.5h18"/><path d="M12 20.5V11M12 15l-4.5-4V6.5M12 13l4.5-4V5M7.5 11 5 8.5M16.5 9l2.5-2.5"/>']
];
// Where each stop sits on a 400 x 300 board (the card's 4:3 photo box).
const BASICS_AT = [
  [58, 76],
  [152, 76],
  [246, 76],
  [340, 76],
  [314, 212],
  [200, 212],
  [86, 212]
];
// Fish basics' trail (proto/fishbasics.js steps), the same component: six stops, three along the top
// and three back along the bottom (Tails under Fins), in the colours --bt1…--bt6.
const BASICS_TRAIL_F = [
  ['shape', 'Body shape', '<path d="M2.5 12c3-5 10-6 14-2.5l5-3v11l-5-3C12.5 18 5.5 17 2.5 12z"/><circle cx="7" cy="11" r=".9"/>'],
  [
    'groups',
    'Groups',
    '<rect x="3.5" y="4" width="7" height="7" rx="1.5"/><rect x="13.5" y="4" width="7" height="7" rx="1.5"/><rect x="3.5" y="13" width="7" height="7" rx="1.5"/><rect x="13.5" y="13" width="7" height="7" rx="1.5"/>'
  ],
  ['fins', 'Fins', '<path d="M5 20c0-8 5-14 14-16-1 8-6 14-14 16z"/><path d="M8.5 16.5l7-7"/>'],
  ['tails', 'Tails', '<path d="M3 12h5"/><path d="M8 12 20 5l-4 7 4 7z"/>'],
  ['marks', 'Markings', '<path d="M2.5 12c3-5 10-6 14-2.5l5-3v11l-5-3C12.5 18 5.5 17 2.5 12z"/><path d="M8 8.4v7.2M12 7.6v8.4"/>'],
  ['features', 'Key features', '<circle cx="12" cy="12" r="3"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/>']
];
const BASICS_AT_F = [
  [60, 76],
  [190, 76],
  [320, 76],
  [320, 212],
  [190, 212],
  [60, 212]
];
function basicsArt() {
  const {stops: TRAIL, at, turn} = basicsWords().trail();
  // Done on another device (the synced achievement) counts every stop as seen.
  const done = basicsDone(),
    seen = (store.get(basicsKey(), {}) || {}).seen || {},
    next = TRAIL.findIndex(s => !seen[s[0]]),
    st = TRAIL.map((s, i) => (done || seen[s[0]] ? 'is-seen' : i === next ? 'is-next' : 'is-todo')),
    c = i => `var(--bt${i + 1})`;
  // From one stop to the next: straight along a row, a curve down the right side where the trail turns back (Septa to
  // Teeth); in the colours of its two stops once the second is reached, dotted before.
  const way = i => {
    const [a, b] = [at[i], at[i + 1]];
    const d =
      i === turn ? `M${a[0]} ${a[1]}C${a[0] + 62} ${a[1]} ${b[0] + 76} ${b[1]} ${b[0]} ${b[1]}` : `M${a[0]} ${a[1]}L${b[0]} ${b[1]}`;
    return st[i + 1] === 'is-todo'
      ? `<path class="bxt-way" d="${d}"/>`
      : `<linearGradient id="bxg${i}" gradientUnits="userSpaceOnUse" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"><stop offset="0" style="stop-color:${c(i)}"/><stop offset="1" style="stop-color:${c(i + 1)}"/></linearGradient><path class="bxt-way on" d="${d}" style="stroke:url(#bxg${i})"/>`;
  };
  const stop = ([id, , icon], i) =>
    `<g class="bxt-stop ${st[i]}" data-step="${id}" style="--c:${c(i)}" transform="translate(${at[i].join(' ')})"><circle r="31"/><g class="bxt-ic" transform="translate(-17 -17) scale(1.4167)">${icon}</g>${
      st[i] === 'is-seen' ? '<g class="bxt-tick" transform="translate(23 -23)"><circle r="10"/><path d="M-4.5 0.5l3 3 6-6.5"/></g>' : ''
    }</g>`;
  // The words at a constant size (HTML, not SVG text), hung under their stop, "a / b" on two lines; on a narrow card, one by the left or right edge is anchored inwards (bxt-l, bxt-r).
  const lab = ([, t], i) =>
    `<span class="bxt-lab ${st[i]}${at[i][0] < 100 ? ' bxt-l' : at[i][0] > 300 ? ' bxt-r' : ''}" style="--c:${c(i)};left:${at[i][0] / 4}%;top:${(((at[i][1] + 36) / 300) * 100).toFixed(2)}%">${st[i] === 'is-next' ? (st.includes('is-seen') ? 'Next: ' : 'Start: ') : ''}${esc(t).replace(' / ', ' /<br>')}</span>`;
  return `<span class="ph bxart" aria-hidden="true"><svg viewBox="0 0 400 300">${at
    .slice(0, -1)
    .map((_, i) => way(i))
    .join('')}${TRAIL.map(stop).join('')}</svg>${TRAIL.map(lab).join('')}</span>`;
}
function basicsCard(tips) {
  const W = basicsWords(),
    TRAIL = W.trail().stops,
    N = TRAIL.length,
    n = Object.keys((store.get(basicsKey(), {}) || {}).seen || {}).length,
    done = basicsDone(),
    state = done ? '✓ Done' : n ? `${Math.min(n, N - 1)} of ${N} steps seen` : `${N} short steps · about 5 min`,
    say = W.card,
    art = basicsArt(),
    to = hr('basics|' + TRAIL[0][0]);
  return tips
    ? `<article class="tipg bxtip"><a href="${to}" class="tipph">${art}<i>${esc(W.name)}</i></a><div><p class="note">${state}</p><p>${esc(say)}</p></div></article>`
    : `<a class="card bxcard${done ? ' done' : ''}" href="${to}">${art}<span class="cap"><b>${esc(W.name)}</b><small>${state}</small><p>${esc(say)}</p></span></a>`;
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
    // The Coral Finder book's extra genera (not on the IMR list, seen at Dauin): one folded line under the slate's.
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
      L = [...document.querySelectorAll(`#azgrid a[href^="${hr('g-x').slice(0, -1)}"]`)];
    const name = a => (routeIn(a.getAttribute('href')).key || '').slice(2).toLowerCase();
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

// The roots of a genus name, as a memory aid (docs/ARCHITECTURE.md): data.json `root` (tools/apply_name_roots.py),
// each part's meaning with its Latin or Greek word and the dictionary it comes from, under the ID tips and apart from
// them (an addition, never an IMR line: rule C1). An ending that 3 or more slate genera share (-pora) says it does not
// tell them apart, counted here (rule U8). '' for a genus without a sourced root. Fish genera (fish.json `root`, from
// The ETYFish Project: tools/fish_genus_roots.json) pass their own genus names and words for where they are counted
// (treeRoot); their parts may have no word, or be another genus the entry names ("genus") or the person it honours.
const rootLine = (g, slate, where = 'on the slate') => {
  const r = g && g.root;
  if (!r) return '';
  const rootPart = x =>
    x[4] === 'genus'
      ? `the genus <i>${esc(x[1])}</i>`
      : x[4] === 'honours'
        ? `honours ${esc(x[1])}`
        : `“${esc(x[1])}”${x[2] ? ` (${esc(x[2])})` : ''}`;
  const end = r.p[r.p.length - 1],
    tail = end[1] ? end[0].toLowerCase() : '',
    shared = tail ? slate.filter(n => n.toLowerCase().endsWith(tail)).length : 0;
  return (
    `<p class="nameroot"><b>Name roots:</b> <i>${r.p.map(x => esc(x[0])).join('·')}</i>: ` +
    r.p
      .filter(x => x[1])
      .map(rootPart)
      .join(' + ') +
    `.${r.fit ? ` It fits the ID tip “${esc(r.fit)}”.` : ''}` +
    `${shared >= 3 ? ` ${shared} genera ${esc(where)} end in -${esc(tail)}: the ending alone does not tell them apart.` : ''}` +
    ` <span class="rsrc">${r.src.map(srcA).join(' · ')}</span></p>`
  );
};

function viewGenus(name) {
  const g = GX(name);
  if (!g) return viewGenera();
  const XL = (DATA.x || {}).leaf || {},
    paths = [...DATA.key, ...(g.x ? DATA.x.groups : [])].flatMap(k =>
      k.leaves.filter(l => l.g.includes(name) || (XL[l.id] || []).includes(name)).map(l => ({k, l}))
    );
  const imr = g.imr || [],
    // The IMR ID tips box: on a slate genus with lecture notes or tips of its own, each slot shown on its own content (a
    // content editor hiding the lecture notes keeps the tips).
    tipsIn = !g.x && (imr.length > 0 || (g.qt || []).length > 0);
  // Each view row shows the sheet set (applySlots): 3 featured, then the other IMR and curated photos behind a fold.
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
        return `<figure><button type="button" class="zoom" data-z="${i}" aria-label="Enlarge photo: ${alt}"><img src="${img(p, 's')}" srcset="${srcset(p)}" data-sz="strip" sizes="${sizesFor('strip')}" alt="${alt}" loading="lazy">${ZOOMI}</button><figcaption>${p.imr ? `<b class="lect">IMR lecture</b> · slide ${p.slide}${p.pg && p.a ? ` · <a href="${esc(safeUrl(p.pg))}" target="_blank" rel="noopener">${esc(p.a)}</a>` : ''}` : credit(p)}</figcaption></figure>`;
      };
      // The cover is already shown at the top: not repeated in its row when the row has other featured photos.
      const feat0 = g.sl[v].feat,
        feat = cv && feat0.length > 1 ? feat0.filter(p => p.f !== cv.f) : feat0,
        more = g.sl[v].more;
      return `<section class="vrow"><h3>${label}${feat.length ? '' : ' <span class="gap">missing</span>'}</h3>${feat.length ? `<div class="strip">${feat.map(fig).join('')}</div>` : '<p class="note">No good photo yet for this view.</p>'}
      ${more.length ? `<details class="more"><summary>${more.length} more ${label.toLowerCase()} photo${more.length > 1 ? 's' : ''}</summary><div class="strip">${more.map(fig).join('')}</div></details>` : ''}</section>`;
    })
    .join('');
  // The Coral ID Key criteria (the Coral Finder book's text, cited by page): visible for genera the lecture skips,
  // otherwise folded under "More details" with sources and key. The sources the content editor gave with his edits show
  // with their slot (esrcIn, esrcP); the criteria's in place of the Coral Finder pages, which cite the book's own text
  // only (app.js critRef).
  const cfList = `<h3>Coral ID Key criteria <span class="pg">${critRef(g)}</span></h3><ul class="crit">${g.crit.map(c => `<li>${esc(c)}</li>`).join('')}</ul>`;
  // Name, slate number and family sit in the sticky header bar (ctxBar), not here.
  $v.innerHTML = `<p class="lede">One genus on one page. The highlighted <b>ID tips (IMR)</b> are what to remember; the <b>IMR lecture notes</b> give the full lecture cues. Its <b>IMR group</b> is the lecture's confusion group: genera in the same group are the ones to tell apart. Photos at three distances: <b>colony</b>, <b>close-up</b> (10-30 cm) and <b>corallites</b> (macro); tap one to enlarge it. <b>Don't confuse with</b>, at the bottom, shows its look-alikes in the same view. Dotted words show their definition when tapped.${isPhone() ? '' : ' ← / → go to the previous / next genus.'}</p>
  <article class="sheet">
    ${imr.length || g.x || !g.sum ? '' : `<p class="lede keyid">${esc(g.sum)}${esrcIn(g, 'sum')}</p>`}
    ${
      isBenthic(name)
        ? `<p class="warn">${BENTHIC_NOTE}</p>`
        : g.x
          ? `<p class="warn"><b>Not on the IMR list.</b> A rarer genus seen at Dauin${g.x.nonscl ? ', and not a true hard coral' : ''}.</p>`
          : g.n
            ? ''
            : `<p class="warn"><b>★ Not surveyed by IMR.</b> It is on the slate so you don't mistake it for ${g.look
                .filter(n => (DATA.gen[n] || {}).n)
                .map(n => '<i>' + esc(n) + '</i>')
                .join(', ')}, so you need to recognise it and set it aside.</p>`
    }
    ${myProg(name)}
    <div class="hero">
      ${cv ? `<button type="button" class="zoom hero-ph" data-z="${ci}" aria-label="Enlarge photo: ${esc(name)}"><img src="${img(cv, fit(Math.min(innerWidth, 640)))}" data-fit alt="${esc(name)}">${ZOOMI}</button>` : ''}
      <div class="idbox">
        ${plainLine(g)}${esrcP(g, 'plain')}
        ${g.x ? `<div class="tipbox"><h3>ID tips${g.qsrc && g.qsrc.t ? '' : ` <span class="pg">Coral Finder p. ${g.pages.join(', ')}</span>`}</h3>${tipsList(g)}</div>` : ''}
        ${tipsIn || g.mn ? `<div class="tipbox">${tipsIn ? `<h3>${g.tl || 'ID tips (IMR)'}${(DATA.imrg || [])[g.ig - 1] ? ` <span class="pg">group ${g.ig}: ${esc(DATA.imrg[g.ig - 1].t)}</span>` : ''}</h3>${tipsList(g)}` : ''}${g.mn ? `<p class="mn"><b>Mnemonic:</b> ${esc(g.mn)}${esrcIn(g, 'mn')}</p>` : ''}</div>` : ''}
        ${rootLine(g, slateOf(DATA))}
        ${imr.length ? `<div class="lnotes"><h3>IMR lecture notes</h3>${notesList(g)}${esrcP(g, 'imr')}</div>` : ''}
        ${imr.length ? '' : cfList}
        <details class="more sheetmore"><summary>More details</summary>
        ${imr.length ? cfList : ''}
        ${g.check ? `<p class="note check"><b>To check with an IMR trainer:</b> ${esc(g.check)}${esrcIn(g, 'check')}</p>` : ''}
        ${g.info ? `<div class="note osrc"><b>Other sources:</b><ul class="srcs">${g.info.map(x => `<li>${esc(x)}</li>`).join('')}</ul>${esrcP(g, 'info')}</div>` : ''}
        <h3>In the key <span class="pg">Coral Finder p. ${g.pages.join(', ')}</span></h3><div class="kpick">${paths.map(({k, l}) => `<a class="c-${k.color}" href="${esc(hr('idkey|form=' + l.id[0] + ';box=' + l.id))}">${esc(k.name)} › ${esc(leafLabel(l))}</a>`).join('')}</div>
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
// has got and what it still needs. My progress's tiles hold this in a tooltip, invisible on touch screens; tapping a
// tile there opens this sheet.
function myProg(n) {
  const [k, t] = shownLevel(n);
  if (k === 'new') return '';
  const st = lvStep(n),
    pc = Math.round(100 * genScore(n)),
    m = k === 'ok' ? [] : missing(n);
  return (
    `<p class="myprog"><a class="mpl s${st}${k === 'weak' ? ' weak' : ''}" href="${esc(hr('progress'))}" title="My progress">${lvIcon(st)}${MASTERY[st][0]}${k === 'weak' ? ' · ' + t : ''}${st > 0 && st < 5 ? ` <small class="pct" style="--p:${pc}%">${pc}%</small>` : st === 5 ? ' ✓' : ''}</a>` +
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
  // players keep mixing up), said as such.
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
      return `<a class="lt" href="${esc(hr(side ? `cmp-${name}|${n}` : `g-${n}`))}">${m ? `<span class="pmix">you mixed them up ×${m}</span>` : ''}${viewShot(n, cmpView)}<span><i>${esc(n)}</i><span class="psum">${esc(tipsText(GX(n)))}</span>${(GX(name).lsrc || {})[n] ? `<small class="lsrc">${esc(GX(name).lsrc[n] + esrcT(GX(name), 'lsrc/' + n))}</small>` : D.has(n) ? '<small class="lsrc">Often mixed up by players</small>' : ''}<b class="cmpgo">${side ? 'Compare side by side →' : 'Open the sheet →'}</b></span></a>`;
    }).join('')}</div>
    ${cmpShots([name])}`;
}
// The look-alike pairs (pairs), each pair's source (lsrcOf), the classic ones (isClassic), the mix-ups (mixedUp), a
// montage's two photos (photoPair) and a starred genus's group and note (shownGroup, starNote) are in model.js: the quiz
// reads them too, and learn.js comes after the quiz's tier (docs/spec/loading.md "Load order in tiers").
// Classic look-alikes: only the pairs a source compares in so many words, the IMR lecture
// (lsrc "IMR Lecture 6...") or the Coral Finder text ("Coral Finder p. ..."). Pairs that only share a Coral Finder box
// or an IMR group stay on the genus sheets and in duels. IMR pairs first, then by slate order.
const pairKey = (a, b) => [a, b].sort().join('|');
// The source the content editor gave with his edit of that line ('; <its words>', esrcT), from the side model.js lsrcOf
// reads it from; '' when none (rule C2).
const lsrcEsrc = (a, b) => ((GX(a).lsrc || {})[b] ? esrcT(GX(a), 'lsrc/' + b) : (GX(b).lsrc || {})[a] ? esrcT(GX(b), 'lsrc/' + a) : '');
function classics() {
  const tier = ([a, b]) => (/^IMR/.test(lsrcOf(a, b)) ? 0 : 1);
  return pairs()
    .filter(([a, b]) => isClassic(a, b))
    .map(p => p.slice().sort())
    .sort((x, y) => tier(x) - tier(y) || Math.min(slateIdx(x[0]), slateIdx(x[1])) - Math.min(slateIdx(y[0]), slateIdx(y[1])));
}
// One montage per pair, like an IMR comparison slide: one photo of each genus in the same view. The admin's pick
// (curation.json "mont" {"A|B": {v, a, b}}) wins; otherwise the view the comparison is about (most pairs are told apart
// on the corallites; these on the closer view) and, in that view, the two photos that come first (IMR, then curated)
// with the same growth form.
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
// The admin can hide a comparison until good examples exist (curation.json "mont" {"A|B": {hide: true}}, admin
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
  return {k, A, B, v, pa, pb, src: lsrcOf(A, B), es: lsrcEsrc(A, B)};
}
const srcTag = src =>
  /^IMR/.test(src)
    ? `<b class="lect">IMR lecture</b> ${esc(src.replace(/^IMR Lecture 6:?\s*/, ''))}`
    : `<b class="lect cf">Coral Finder</b> ${esc(src.replace(/^Coral Finder /, ''))}`;
// Learn > Look-alikes: a deck of the classic pairs, one montage per screen, the reader's mix-ups first.
// #learn/look-alikes opens the first one, #learn/look-alikes/A/B a given pair; arrows, keys and swipes go through the deck.
// "Drill this pair" only for two genera the player has unlocked (model.js unlocked: the Duel tab opens none; one
// progression path for every game).
const drillOk = (a, b) => typeof unlocked !== 'function' || unlocked([a, b]).length === 2;
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
    const tip = (n, g) => `<div class="lktip"><a href="${esc(hr('g-' + n))}"><i>${esc(n)}</i></a> ${esc(tipsText(g))}</div>`;
    const deck = L.map(
      (d, k) =>
        `<a class="lkd${k === i ? ' on' : ''}${mix(d) ? ' mix' : ''}" href="${esc(hr('cmp|' + d.A + '|' + d.B))}" title="${esc(d.A)} or ${esc(d.B)}"><span><img ${thumb(d.pa, '64px')} alt="" loading="lazy"><img ${thumb(d.pb, '64px')} alt="" loading="lazy"></span><small>${esc(d.A)} / ${esc(d.B)}</small></a>`
    ).join('');
    // The intro goes behind ? (pageHelp) only on the first draw: re-adding it on each step would push the deck down while
    // the montage is being sized, and squash it once the intro left.
    $v.innerHTML = `${drawn ? '' : `<p class="lede">The look-alikes the IMR lecture or the Coral Finder book compare directly, one pair per screen: one photo of each genus in the same view, with the ID tips that tell them apart. Pairs you mixed up in the quiz come first, in red. The other look-alikes of a genus are at the bottom of its sheet.</p>`}
    <div class="lk">
      <div class="lkmain">
        <div class="lkhead"><h3><i>${esc(m.A)}</i> or <i>${esc(m.B)}</i>?</h3><small class="lksrc">${srcTag(m.src)}${esc(m.es)}</small>${x ? `<span class="pmix">you mixed them up ×${x}</span>` : ''}</div>
        <div class="lkm${dir ? ' in' + (dir > 0 ? 'r' : 'l') : ''}">${half(m.A, m.pa, 0)}${half(m.B, m.pb, 1)}<button type="button" class="lkarr prev" data-lstep="-1" aria-label="Previous pair">‹</button><button type="button" class="lkarr nxt" data-lstep="1" aria-label="Next pair">›</button>${hint ? '<span class="lkhint" aria-hidden="true">Swipe for the next pair</span>' : ''}</div>
        <div class="lktips">${tip(m.A, gA)}${tip(m.B, gB)}</div>
        <div class="lknav"><span class="lkn">Pair ${i + 1} / ${L.length}</span>
          <a class="linkish lkall" href="${esc(hr('cmp-' + m.A + '|' + m.B))}">All views</a>${drillOk(m.A, m.B) ? `<a class="next" href="${esc(hr('quiz-duel|' + m.A + '|' + m.B))}">Drill this pair</a>` : ''}</div>
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
    history.replaceState({d: pageDepth}, '', hr(`cmp|${L[i].A}|${L[i].B}`));
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
    `<div class="cmpcol"><h3><i>${esc(n)}</i>${isBenthic(n) ? ' <small>fire coral</small>' : g.x ? ' <small>bonus</small>' : g.n ? '' : ' ★'} <a class="linkish cmpsheet" href="${esc(hr('g-' + n))}">Sheet ›</a></h3><p class="note">${esc(altName(g.fam))}${g.ig ? ' · IMR group ' + g.ig : ''}</p><div class="tipbox fbtips">${g.qt ? `<p class="label">${tipsLabel(g)}</p>` : ''}${tipsList(g, 'imrfb')}</div><details class="more"><summary>Coral ID Key criteria</summary><ul class="crit">${g.crit.map(c => `<li>${esc(c)}</li>`).join('')}</ul><p class="note">${critRef(g)}</p></details></div>`;
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
  // Opened from the Duel tab's relief card (quiz.js DUELBACK): Back to the duel, to the same duel and run, in view
  // however far the page scrolls (docs/DESIGN.md); it replaces Drill this pair. Phones and tablets: a floating button at
  // the bottom centre (.cmpfab). Desktop (from 1024 px): a light sticky band under the page bar, "Duel paused: A or B"
  // and the button (.duelband). CSS shows one or the other.
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
      : drillOk(a, b)
        ? `<p><a class="next" href="${esc(hr('quiz-duel|' + a + '|' + b))}">Drill this pair</a></p>`
        : ''
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
// Fish families (#learn/genera with the fish subject, app.js UNITS list): every family of the slate (all circles) by the
// groups of the identification key in force (fish.json key; rule S3), in the key's order, each group under its number
// and title as the key prints them; each family with a photo, its IMR cues and how IMR tells its look-alikes apart. The
// key is credited in full under the list. A region with no key: the entries in one block. The winks stay a surprise.
// Each entry opens its family's sheet (viewFishSheet; an IMR entry by the family it was renamed into).
function viewFishList() {
  // Each photo enlarges in the shared viewer, as the coral photos do (a tap on a photo opens it).
  const flat = [];
  const tip = n => {
    const g = GX(n),
      p = cover(g); // the admin's ★ Cover while in play (app.js treeCurate), else the card photo (core.js easyCover)
    if (p) flat.push({...p, genus: n});
    // its first English name given as information (app.js vernFirst: the sea slugs'), under its name
    const ven = vernFirst(n);
    return `<article class="tipg"><span class="tipph">${p ? `<button type="button" class="zoom" data-z="${flat.length - 1}" aria-label="Enlarge photo: ${esc(unameT(n))}"><img ${thumb(p, '130px')} alt="" loading="lazy">${ZOOMI}</button>` : ''}<a class="tipsheet" href="${esc(hr('g-' + n))}"><b>${uname(n)}</b>${ven ? `<span class="ven">${esc(capFirst(ven))}</span>` : ''}<small>${esc(altName(g.fam))}</small><span class="cmpgo">Open the sheet →</span></a></span><div>${g.tl ? `<p class="label">${g.tl}</p>` : ''}${tipsList(g)}${
      g.lk.length
        ? `<p class="note">Don't confuse with ${g.lk
            .map(
              ([o, t]) =>
                // an edited line names the source given with it (app.js treeGenera lksrc; rule C2)
                `<b>${esc(unameT(o))}</b> (${esc(t.replace(/^[^:]*:\s*/, ''))}${((g.lksrc || {})[o] || {}).t ? '; ' + esc(g.lksrc[o].t) : ''})`
            )
            .join('; ')}</p>`
        : ''
    }${g.sub.length ? `<p class="note">IMR names inside it: ${g.sub.map(esc).join(', ')}</p>` : ''}</div></article>`;
  };
  const blk = (head, L) => (L.length ? `<section class="gblk" data-n="${L.length}">${head}${L.map(tip).join('')}</section>` : '');
  const key = TREEU.key,
    head = (n, t) =>
      `<h3 class="gdiv"${typeof n === 'number' ? ` style="--g:${groupHue(n)}"` : ''}><span class="gn">${n}</span><span class="gt">${esc(t)}</span></h3>`,
    groups = key
      ? [
          ...TREEU.groups.map(gr =>
            blk(
              head(gr.n, gr.title),
              slateGenera().filter(n => GX(n).group === gr.n)
            )
          ),
          blk(
            head('?', 'Not in a group yet'),
            slateGenera().filter(n => !GX(n).group)
          )
        ]
      : UNITS[SUBJ.id].listBy
        ? byRank(slateGenera(), UNITS[SUBJ.id].listBy)
        : [blk('', slateGenera())];
  // No key and a rank to group by (UNITS listBy: the sea slugs' 'family'): one block per unit of that rank above the units
  // (their parent), titled by its name, in the subject's order (its tree's, TREEU.gen), the units in the slate's order
  // inside it; units without one in a last block.
  function byRank(L, rk) {
    const up = n => {
        const p = GX(n).parent;
        return p && GX(p) && (rankOf(p) || unitRankOf(SUBJ)) === rk ? p : '';
      },
      at = Object.keys(TREEU.gen),
      by = new Map();
    L.forEach(n => by.set(up(n), [...(by.get(up(n)) || []), n]));
    const B = [...by].sort(([a], [b]) => (a ? at.indexOf(a) : Infinity) - (b ? at.indexOf(b) : Infinity)),
      // the family's heading, its first English name beside it (app.js vernFirst)
      fam = ([p, U]) =>
        blk(
          p
            ? `<h3 class="gdiv" title="${esc(unameT(p))}"><span class="gtitle">${uname(p)}${vernFirst(p) ? ` <small class="ven">${esc(capFirst(vernFirst(p)))}</small>` : ''}</span></h3>`
            : '',
          U
        ),
      tx = TREEU.taxa;
    if (!tx) return B.map(fam);
    // Its families under their taxonomic groups (the tree's taxa, a published classification: tools/seaslug_groups.json;
    // the true nudibranchs apart from the other sea slugs), in the groups' order, a heading each.
    const tg = p => (p && GX(p).tg) || 0;
    return [...tx.groups, {n: 0, title: ''}].flatMap(gr => {
      const In = B.filter(([p]) => tg(p) === gr.n);
      return In.length ? [gr.n ? `<h3 class="gtax">${esc(gr.title)}</h3>` : '', ...In.map(fam)] : [];
    });
  }
  const sets = SETS().map(S =>
    Q[S.k] && S.page !== false
      ? blk(`<h3 class="gdiv"><span class="gn">+</span><span class="gt">${esc(S.name)}</span></h3>`, S.units())
      : ''
  );
  // A subject's own line (UNITS lede: the sea slugs), else the fish's
  const lede =
    UNITS[SUBJ.id].lede ||
    `The fish families${key ? ` of ${esc(key.short)}, by its identification groups` : ''}, with the IMR cues (for a family IMR gives none for, its ID marks from other sources, named) and IMR’s names. Photos: iNaturalist and FishBase.`;
  const tx = !key && UNITS[SUBJ.id].listBy && TREEU.taxa;
  // Step 0 of the Learn path (SUBJECTS pages 'basics'): the subject's basics card before the groups.
  const bas = SUBJ.pages.includes('basics')
    ? `<section class="gblk gbasics" data-n="1"><h3 class="gdiv" title="Before the groups"><span class="gn">0</span><span class="gt">${esc(basicsWords().name)}</span></h3>${basicsCard(true)}</section>`
    : '';
  $v.innerHTML = `<p class="lede">${lede}</p><div class="tiplist gpack${tx ? ' gtaxa' : ''}">${[bas, ...groups, ...sets].join('')}</div>${key ? `<p class="note keycite">Identification groups: ${esc(key.cite)}</p>` : tx ? `<p class="note keycite">Groups: ${esc(tx.cite)}</p>` : ''}`;
  packGroups($v.querySelector('.tiplist'));
  $v.querySelectorAll('[data-z]').forEach(x => (x.onclick = () => zoom(flat, Number(x.dataset.z))));
}

/* ---------- Fish sheets ---------- */
// The fish sheets (docs/reviews/2026-11-05-fish-sheets-study.md, option B): one family sheet per family of the
// identification key (fish.json families), read from fish.json alone (core.js treeSheets), so they stand whatever the game
// asks. The photos: every photo of a species in the game's lists and its sheet-only photos (TREEU.sheet), the easiest,
// most reference-like first, whoever took them (core.js easyRank, rule P1). Text: the IMR lines verbatim and the sourced
// notes in fish.json, nothing of our own (docs/ROADMAP.md "Fish sheets at three levels").
let FTREE = null,
  FTREE_OF = null,
  FSPH = null,
  FSPH_OF = null;
const ftree = () => {
  // fish.json as the units read it, the content editor's edits in force (app.js TREEF), else as built
  const f = TREEF || (TREERAW && TREERAW.f) || null;
  if (FTREE_OF !== f || !FTREE) ((FTREE = treeSheets(f || {})), (FTREE_OF = f));
  return FTREE;
};
// Photos by species id, each list in easyRank order (the judged ease, then how reference-like), each photo once.
const treeSpPhotos = () => {
  if (FSPH && FSPH_OF === TREEU) return FSPH;
  const by = {},
    add = p => {
      if (!p || !p.sp || !p.f) return;
      const L = (by[p.sp] = by[p.sp] || []);
      if (!L.some(x => x.f === p.f)) L.push(p);
    };
  Object.values((TREEU && TREEU.gen) || {}).forEach(g => ((g.views || {}).wide || []).forEach(add));
  Object.values((TREEU && TREEU.sheet) || {}).forEach(L => (L || []).forEach(add));
  Object.keys(by).forEach(k => (by[k] = easyRank(by[k])));
  // The admin's featured photos of a species first, in his order (app.js treeCurate featP; autosort.js fishOrder), then
  // the others in the game's order.
  Object.values((TREEU && TREEU.gen) || {}).forEach(g =>
    Object.entries(g.featP || {}).forEach(([sid, F]) => {
      const fs = new Set(F.map(p => p.f));
      if (by[sid]) by[sid] = [...F.map(p => by[sid].find(x => x.f === p.f)).filter(Boolean), ...by[sid].filter(x => !fs.has(x.f))];
    })
  );
  // And before them his ★ Cover of the species (app.js treeCurate covers): its first photo wherever the species shows one
  // (its tile, its sheet's first photo, its row on the family sheet).
  Object.entries((TREEU && TREEU.covers) || {}).forEach(([sid, p]) => {
    const c = by[sid] && by[sid].find(x => x.f === p.f);
    if (c) by[sid] = [c, ...by[sid].filter(x => x !== c)];
  });
  return ((FSPH = by), (FSPH_OF = TREEU), by);
};
// A species' one photo (its tile, its row, its sheet's first photo): the admin's ★ cover (app.js treeCurate's covers,
// first in treeSpPhotos: an adult, or a juvenile he confirmed), watermarked or not (rule A1); else the first of its
// photos, featured then the game's order, that is neither a juvenile nor watermarked (app.js coverFirst), else its first
// adult, else its first.
const spCover = (s, P) => {
  const c = ((TREEU && TREEU.covers) || {})[s.id];
  return (c && P && P[0] && P[0].f === c.f && P[0]) || null;
};
const spPhoto = s => spCover(s, treeSpPhotos()[s.id]) || coverFirst(treeSpPhotos()[s.id]);
// A genus's ★ Cover: a genus unit's coverP (app.js treeCurate, as a family's), else the pick of a genus with no unit
// (TREEU.covers); null when none is picked in play.
const genCover = g => (g && ((GX(g.id) || {}).coverP || ((TREEU && TREEU.covers) || {})[g.id])) || null;
// A node's default cover from its species S when none is picked (docs/rules/photos.md; app.js seenCover): the
// species with a reference photo most seen around the instance's centre, then his ★ cover of it, else its easiest
// reference photo that is not a juvenile (no reference photo: the most seen species' easiest), among the photos in play
// (the sheet-only reference photos, use 'ref', only when none is in play).
const nodeCover = S => {
  const P = S.flatMap(s => treeSpPhotos()[s.id] || []),
    on = P.filter(p => p.use !== 'ref');
  return seenCover(on.length ? on : P, treeSeen, undefined, treeSpPick);
};
// The one "No photo yet" drawing for every species (docs/DESIGN.md): a plain child-like fish, never a body shape that
// could read as ID information; the "Photo missing" tile's style.
const NOFISH =
  '<svg viewBox="0 0 64 40" aria-hidden="true"><path class="np-t" d="M10 20c6-11 22-14 33-6l9-7c1 5 1 21 0 26l-9-7c-11 8-27 5-33-6z"/><circle class="eye" cx="20" cy="17" r="2"/><path d="M14 24c3 2 6 2 8 1"/></svg>';
// A subject with its own drawing (UNITS words.nophoto: the sea slugs') shows it instead, in the same style.
const noFish = () => `<span class="nofish">${sheetWord('nophoto') || NOFISH}<span>No photo yet</span></span>`;
// A tree subject's own words on its sheets (UNITS words; the sea slugs', study §9 step 7: never a fish word on a sea-slug
// sheet), k one of: famLede(f), genLede(f), spLede, the ? text of each sheet; met {v(s), where}, what a species' rank
// in its family on its sheet counts and where (fish.json cmi around Dauin by default); links(s), its species links
// beyond iNaturalist and WoRMS (FishBase by default), [] for none; nophoto, its "No photo yet" drawing. undefined when
// the subject gives none: the sheet keeps its default words.
const sheetWord = k => ((UNITS[SUBJ.id] || {}).words || {})[k];
// The unit the player's progress keeps a family under: the family once the game asks the families, else the IMR entry
// that was renamed into it (SUBJECTS renamed), '' when none.
// An entry renamed into two families counts for both (SUBJECTS renamed split: t46 is the Pipefishes and the Seahorses).
const famUnit = fid => {
  const R = SUBJ.renamed || {};
  return GX(fid)
    ? fid
    : Object.keys(R.ids || {}).find(t => (R.ids[t] === fid || Object.values((R.split || {})[t] || {}).includes(fid)) && GX(t)) || '';
};
// "Opened for me": a species counts as opened once its family is at Advanced, the level at which a family's
// species open (docs/FISH_PATH.md "Unlock rules"), once its scientific genus is met, or once its own unit is met (the
// species level, app.js treeGenera: s:s091, by its common name; sci:s091, by its scientific name).
const spOpen = s => {
  if (typeof genScore !== 'function') return false;
  const u = famUnit(s.family);
  return (
    ['cn', 'sci'].some(lv => !!GX(spUnitId(lv, s.id)) && introduced(spUnitId(lv, s.id))) ||
    (!!GX(s.genus) && introduced(s.genus)) ||
    (!!u && genScore(u) >= LV_AT[1])
  );
};
// The species filter, on by default each time a sheet opens (viewFishSheet): one tap shows every species.
let fishMine = true;
// The families a player meets on the families page: circle 1, and the opt-in circles once on (their units renamed into
// families, an entry renamed into two giving both: SUBJECTS renamed split);
// never a wink, which stays a surprise.
const treeShown = () => {
  const T = ftree(),
    split = (SUBJ.renamed || {}).split || {},
    on = new Set(
      SETS()
        .filter(S => Q[S.k])
        .flatMap(S => S.units())
        .flatMap(u => [sheetIdOf(SUBJ, u), ...Object.values(split[u] || {})])
    ),
    wink = new Set(((TREEU && TREEU.winks) || []).map(n => sheetIdOf(SUBJ, n))),
    // Every circle is on the path: the families of the slate, an entry split into two families included.
    path = new Set(UNITS[SUBJ.id].slate().flatMap(u => [sheetIdOf(SUBJ, u), ...Object.values(split[u] || {})]));
  return T.order.filter(id => !wink.has(id) && (T.fam[id].circle === 1 || path.has(id) || on.has(id)));
};
const fishIsWink = id => ((TREEU && TREEU.winks) || []).some(n => sheetIdOf(SUBJ, n) === id);
const famSci = f => (f.sci || []).join(', ');
const famIMR = f => (f.imr && f.imr !== f.name ? `IMR: ${f.imr}` : f.imrWith ? `IMR course: with the ${f.imrWith}` : '');
const famGroup = f => ((TREEU && TREEU.groups) || []).find(g => g.n === f.group);
const famSpecies = f => (f.species || []).map(id => ftree().sp[id]).filter(Boolean);
const genSpecies = g => (g.species || []).map(id => ftree().sp[id]).filter(Boolean);
const slideLine = sl => (sl && sl.length ? `slide${sl.length > 1 ? 's' : ''} ${sl.join(', ')}` : '');
// The sheet a family, genus or species id opens (core.js treeSheets go), in its one spelling.
const treeGo = id => ftree().go(sheetIdOf(SUBJ, id));
// The page bar: the family's English name, its scientific name(s) and its group below, and
// previous / next family in the families page's order.
function treeBar(id) {
  const T = ftree(),
    to = treeGo(id),
    f = fishFamOf(to);
  if (!f || fishIsWink(f.id)) return '';
  // A species sheet: its name, its family and genus; previous / next among its genus's species (its family's when the
  // genus has one).
  const sp = T.spOf(to);
  if (sp) {
    const g = T.gen[sp.genus],
      L = (g && genSpecies(g).length > 1 ? genSpecies(g) : famSpecies(f)).map(x => x.name),
      j = L.indexOf(sp.name);
    return `<h2 class="ctx-t"><i>${esc(sp.name)}</i><small>${esc(f.name)}${g ? ' · ' + esc(g.name) : ''}</small></h2>${
      L.length > 1
        ? `<span class="pn">${[L[(j - 1 + L.length) % L.length], L[(j + 1) % L.length]]
            .map(
              (n, k) =>
                `<a href="${esc(hr('g-s:' + n))}" title="${k ? 'Next' : 'Previous'}: ${esc(n)} (${k ? '→' : '←'})" aria-label="${k ? 'Next' : 'Previous'} species: ${esc(n)}">${k ? '›' : '‹'}</a>`
            )
            .join('')}</span>`
        : ''
    }`;
  }
  // A genus page: its name, "genus" and its family; previous / next among its family's genus pages.
  if (T.gen[to]) {
    const G = (f.genera || []).filter(x => treeGo(x) === x),
      j = G.indexOf(to);
    return `<h2 class="ctx-t"><i>${esc(T.gen[to].name)}</i><small>genus · ${esc(f.name)}</small></h2>${
      G.length > 1
        ? `<span class="pn">${[G[(j - 1 + G.length) % G.length], G[(j + 1) % G.length]]
            .map(
              (n, k) =>
                `<a href="${esc(hr('g-' + n))}" title="${k ? 'Next' : 'Previous'}: ${esc(T.gen[n].name)} (${k ? '→' : '←'})" aria-label="${k ? 'Next' : 'Previous'} genus: ${esc(T.gen[n].name)}">${k ? '›' : '‹'}</a>`
            )
            .join('')}</span>`
        : ''
    }`;
  }
  const L = treeShown(),
    i = L.indexOf(f.id),
    nav =
      i < 0
        ? ''
        : `<span class="pn">${[L[(i - 1 + L.length) % L.length], L[(i + 1) % L.length]]
            .map(
              (n, k) =>
                `<a href="${esc(hr('g-' + n))}" title="${k ? 'Next' : 'Previous'}: ${esc(T.fam[n].name)} (${k ? '→' : '←'})" aria-label="${k ? 'Next' : 'Previous'} family: ${esc(T.fam[n].name)}">${k ? '›' : '‹'}</a>`
            )
            .join('')}</span>`;
  return `<h2 class="ctx-t">${esc(f.name)}<small>${esc(famSci(f))}${f.group ? ' · group ' + f.group : ''}</small></h2>${nav}`;
}
// The family of a sheet id (a family, genus or species), null for none.
const fishFamOf = to => {
  const T = ftree(),
    s = to ? T.spOf(to) : null;
  return !to ? null : T.fam[to] || (s ? T.fam[s.family] : T.fam[(T.gen[to] || {}).family]) || null;
};
// A sheet's page (route): an unknown id or a wink opens the families page; a genus opens its short page, or the sheet
// option B gives it (treeSheets go): the species sheet of a genus with one species; a species opens its sheet.
function viewFishSheet(id) {
  fishMine = true; // each sheet opened starts on "Opened for me"; the filter's own redraw keeps the choice
  const T = ftree(),
    to = treeGo(id),
    f = fishFamOf(to);
  if (!f || fishIsWink(f.id)) return UNITS[SUBJ.id].list();
  const sp = T.spOf(to),
    at = T.gen[to] || sp ? to : f.id;
  if (at !== id) return void location.replace(hrFull('g-' + at));
  sp ? fishSpecies(sp) : T.gen[at] ? treeGenus(T.gen[at]) : treeFamily(f);
}
// A fish genus's name roots (fish.json root, rootLine) on the one sheet the genus opens (treeSheets go,
// `at`): its own page, its one species' sheet, or its family's when it is the only genus with several species; the
// shared ending counted over every fish genus (rule U8). '' anywhere else.
const treeRoot = (g, at) =>
  g && g.root && treeGo(g.id) === at
    ? rootLine(
        g,
        Object.values(ftree().gen).map(x => x.name),
        'among the fish'
      )
    : '';
// A genus's own presentation and ID marks (fish.json plain, marks, msrc, mby: tools/fish_genus_marks.json), on the
// sheet the genus opens, as its name roots (treeRoot): its page, the species sheet of a one-species
// genus, the family sheet of a family's only genus (marksBox).
const genMarks = (g, at) => (!g || treeGo(g.id) !== at ? '' : marksBox(g));
// A record's own presentation and ID marks, a genus's or a species' (fish.json plain, marks, msrc, mby; a species'
// from tools/fish_species_marks.json), '' for none. Each line with its sources' numbers, the sources listed below, never
// as IMR's (rule C1: the IMR cues show in their own box); the content editor's edit of them with its own source (SUBJECTS
// content marks, the sea slugs'; core.js contentApply esrc, contentPut keeping the numbers of a line kept). An agent's
// draft that Pierre has not validated yet (mdraft) says so beside its heading.
const marksBox = g => {
  if (!g || !(g.plain || (g.marks || []).length)) return '';
  const S = g.msrc || [],
    by = g.mby || {},
    n = ix =>
      (ix || [])
        .map(i =>
          S[i] ? ` <a class="srcn" href="${esc(safeUrl(S[i].u))}" target="_blank" rel="noopener" title="${esc(S[i].t)}">[${i + 1}]</a>` : ''
        )
        .join('');
  return `<div class="fmarks gmarks">${g.plain ? `<p class="plainw">${esc(g.plain)}${n(by.plain)}</p>` : ''}${
    (g.marks || []).length
      ? `<h3>ID marks of <i>${esc(g.name)}</i>${g.mdraft ? ' <span class="mdraft">Draft, not yet reviewed</span>' : ''}</h3><ul class="crit">${g.marks.map((x, i) => `<li>${esc(x)}${n((by.marks || [])[i])}</li>`).join('')}</ul>${esrcP(g, 'marks')}`
      : ''
  }<p class="note msrc">${S.length ? `Sources: ${S.map((x, i) => `[${i + 1}] <a href="${esc(safeUrl(x.u))}" target="_blank" rel="noopener">${esc(x.t)}</a>`).join('; ')} · ` : ''}${repBtn({k: 'sheet', g: g.id, m: 'marks'}, '⚑ Report or correct a line')}</p></div>`;
};
// The photos enlarge, the species filter redraws the page where it was.
const treeBind = (flat, redraw) => {
  $v.querySelectorAll('[data-z]').forEach(b => (b.onclick = () => zoom(flat, Number(b.dataset.z))));
  $v.querySelectorAll('[data-mine]').forEach(
    b =>
      (b.onclick = () => {
        fishMine = b.dataset.mine === '1';
        const y = scrollY;
        redraw();
        scrollTo(0, y);
      })
  );
};
// A photo tile: the photo (a tap enlarges it) or the drawing.
const treePic = (p, flat, alt) => {
  if (!p) return noFish();
  flat.push(p);
  return `<button type="button" class="zoom" data-z="${flat.length - 1}" aria-label="Enlarge photo: ${esc(alt)}"><img ${thumb(p, '(max-width: 599.98px) 50vw, 240px')} alt="${esc(alt)}" loading="lazy">${ZOOMI}</button>`;
};
// A species tile: its photo, then the scientific name first, its common name, the WoRMS name when it
// changed (rule S2) and its rank among the 24 species IMR sights most.
// The whole tile opens the species sheet (its photos enlarge there).
const spPic = s => {
  const p = spPhoto(s);
  return p ? `<img ${thumb(p, '(max-width: 599.98px) 50vw, 240px')} alt="" loading="lazy">` : noFish();
};
// A species' common name as this player sees it first (app.js cnFirst; docs/FISH_PATH.md): the IMR name for a player at
// IMR, the main name (iNaturalist's default) for the others; its own name (fish.json common) for a species out of the
// game, which has no list; else its first English name given as information (app.js vernFirst); '' for none.
const spCommon = s => cnFirst(s, imrNow()) || s.common || capFirst(vernFirst(s.id)) || '';
// The English names a tree gives as information (app.js vernOf, UNITS vern: the sea slugs' common names and nicknames,
// tools/seaslug_names.py), on a family, genus or species sheet: the first under the scientific name,
// the others on a line below ("Also …"), a nickname said so; and under More details, every name with its sources, linked
// (rule C2). '' for a record without them (the fish, a sea slug no source names).
const capFirst = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
const vernName = x =>
  esc(capFirst(x.n)) + (x.nick || x.note ? ` <small>(${x.nick ? 'nickname' + (x.note ? ': ' : '') : ''}${esc(x.note || '')})</small>` : '');
const vernHead = id => {
  const L = vernOf(id);
  return L.length
    ? `<p class="fn-s fn-v">${vernName(L[0])}</p>${L.length > 1 ? `<p class="fn-g">Also ${L.slice(1).map(vernName).join(', ')}</p>` : ''}`
    : '';
};
const vernMore = id => {
  const L = vernOf(id);
  return L.length
    ? `<p class="note refs"><b>English names:</b> ${L.map(x => `${vernName(x)} <small>(${vernSrcs(id, x)})</small>`).join(' · ')}</p>`
    : '';
};
// Its listed common names on the species sheet (More details), when it has more than one: the player's first, then the
// others in their order, the IMR name marked (fish.json cni). Any of them is right when typed; the regional names (cnr)
// are not shown.
const spNamesLine = s => {
  const L = cnList(s),
    first = spCommon(s);
  if (L.length < 2) return '';
  const tag = (n, i) => esc(n) + (i === s.cni ? ' (IMR)' : '');
  const order = [...L.map((n, i) => [n, i]).filter(([n]) => n === first), ...L.map((n, i) => [n, i]).filter(([n]) => n !== first)];
  return `<p class="note refs"><b>Common names:</b> ${order.map(([n, i]) => tag(n, i)).join(' · ')}</p>`;
};
// Under its name on the species sheet: the other species that carry one of its listed names (app.js cnAlso: two species
// may share a common name, and the sheet says so): "Also used for X" for the name the player
// sees first, "“Name” is also used for X" for another listed name; X by its scientific name, linked to its sheet when
// it has one.
const spAlso = s => {
  const first = spCommon(s),
    T = ftree(),
    sp = o => (T.spOf(o.id) ? `<a href="${esc(hr('g-s:' + o.name))}"><i>${esc(o.name)}</i></a>` : `<i>${esc(o.name)}</i>`);
  return cnAlso(s, Object.values((TREEU && TREEU.sps) || {}))
    .map(([n, L]) => `<p class="fn-g">${n === first ? 'Also used for' : `“${esc(n)}” is also used for`} ${L.map(sp).join(', ')}</p>`)
    .join('');
};
// A species' name as HTML: in italics; a species with no name yet (seaslug.json inf: Goniobranchus sp. 5;
// docs/rules/content.md) its genus in italics, the rest upright, and the source that defines it in small type (its src:
// the paper, never a guide's number; rule C2).
const spNameH = s => {
  if (!s.inf) return `<i>${esc(s.name)}</i>`;
  const [g, ...rest] = s.name.split(' ');
  return `<i>${esc(g)}</i> ${esc(rest.join(' '))}${s.src ? ` <small class="spsrc">(${esc(s.src)})</small>` : ''}`;
};
// Its links on the species sheet: iNaturalist, WoRMS and FishBase; a species with no name yet has no taxon there, so its
// source (the paper's DOI) and the iNaturalist observation field that marks its observations.
const spLinks = s => {
  const a = (u, t) => `<a href="${esc(u)}" target="_blank" rel="noopener">${t}</a>`;
  if (s.inf)
    return [
      s.doi ? a('https://doi.org/' + s.doi, esc(s.src || 'Source')) : '',
      s.field ? a('https://www.inaturalist.org/observation_fields/' + encodeURIComponent(s.field), 'iNaturalist') : ''
    ]
      .filter(Boolean)
      .join(' · ');
  const more = sheetWord('links')
    ? sheetWord('links')(s)
    : [['https://www.fishbase.se/summary/' + encodeURIComponent(s.name.replace(/\s+/g, '-')) + '.html', 'FishBase']];
  return [
    a('https://www.inaturalist.org/taxa/' + encodeURIComponent(s.inat), 'iNaturalist'),
    a('https://www.marinespecies.org/aphia.php?p=taxdetails&id=' + encodeURIComponent(s.ref), 'WoRMS'),
    ...more.map(([u, t]) => a(u, esc(t)))
  ].join(' · ');
};
const fishTile = s =>
  `<a class="ftile" href="${esc(hr('g-s:' + s.name))}">${spPic(s)}<span class="fcap">${spNameH(s)}${spCommon(s) ? `<span>${esc(spCommon(s))}</span>` : ''}${
    s.now && s.now !== s.name ? `<small>now <i>${esc(s.now)}</i> in WoRMS</small>` : ''
  }${s.cs ? `<small><b class="star">★</b> IMR most sighted #${s.cs}</small>` : ''}</span></a>`;
// Every species of a list, the "Opened for me" filter first (on by default).
function treeTiles(L, flat) {
  const op = L.filter(spOpen),
    S = fishMine ? op : L,
    hid = L.length - S.length;
  return `<div class="seg-row"><div class="seg" role="group" aria-label="Which species"><button type="button" data-mine="1" aria-pressed="${fishMine}">Opened for me · ${op.length}</button><button type="button" data-mine="0" aria-pressed="${!fishMine}">All · ${L.length}</button></div></div>${
    S.length ? `<div class="ftiles">${S.map(fishTile).join('')}</div>` : ''
  }${hid ? `<p class="note fmore">${S.length ? '' : 'None opened for you yet. '}<button type="button" class="linkish" data-mine="0">Show ${S.length ? `the ${hid} more` : `all ${hid}`}</button></p>` : ''}`;
}
// A genus row on its family sheet (option B): a few of its species' photos, its name, how many species and how many are
// opened for the player, its common name (fish.json genera common) and its IMR name; a genus with one species shows that species.
function treeGenusRow(g, flat) {
  const L = genSpecies(g);
  if (L.length === 1) {
    const s = L[0],
      p = spPhoto(s);
    return `<a class="frow" href="${esc(hr('g-s:' + s.name))}"><span class="fstack one">${p ? `<img ${thumb(p, '120px')} alt="" loading="lazy">` : noFish()}</span><span class="ftxt"><i>${esc(s.name)}</i>${spCommon(s) ? `<span>${esc(spCommon(s))}</span>` : ''}<small><i>${esc(g.name)}</i>: its only species here${g.imr ? ` · IMR entry: ${esc(g.imr)}` : ''}</small></span><span class="fgo" aria-hidden="true">›</span></a>`;
  }
  // His genus cover leads the stack, then the first photo of its other species.
  const gc = genCover(g),
    P = gc
      ? [
          gc,
          ...L.filter(s => s.id !== gc.sp)
            .slice(0, 3)
            .map(spPhoto)
        ]
      : L.slice(0, 4).map(spPhoto);
  return `<a class="frow" href="${esc(hr('g-' + g.id))}"><span class="fstack">${P.map(p => (p ? `<img ${thumb(p, '60px')} alt="" loading="lazy">` : noFish())).join('')}</span><span class="ftxt"><i>${esc(g.name)}</i>${g.common || vernFirst(g.id) ? `<span>${esc(g.common || capFirst(vernFirst(g.id)))}</span>` : ''}<span>${L.length} species · ${L.filter(spOpen).length} opened for me</span>${g.imr ? `<small>IMR entry: ${esc(g.imr)}</small>` : ''}</span><span class="fgo" aria-hidden="true">›</span></a>`;
}
// The family ID marks and the behaviour, habitat and size lines, written in our words from the sources the family lists
// (tools/fish_sheets.json, built into fish.json: marks, life, msrc), published at once (docs/ARCHITECTURE.md), with
// their sources and a report link right under them.
// The size and depth of a species (fish.json species size, depth: Reef Life Survey, else FishBase), each with its
// source: "Up to 10 cm · 1-36 m deep". '' when neither was fetched (never a value of our own).
// FishBase's length types other than total length (species LTypeMaxM), in words.
const LTYPE = {SL: 'standard length', FL: 'fork length', WD: 'disc width', OT: '(another measure)'};
const srcA = x => `<a href="${esc(safeUrl(x.u))}" target="_blank" rel="noopener">${esc(x.t)}</a>`;
// A sourced juvenile line (the family sheet's juv.note, the species sheet's jv.line: tools/fish_juveniles.json), its
// sources numbered after it: src a list of URLs or of {t, u}; lead a few words before it, extra after the numbers.
const juvNote = (text, src, {lead = '', extra = ''} = {}) =>
  `<p class="fjuv">${lead}${esc(text)}${(src || [])
    .map(x => (typeof x === 'string' ? {u: x} : x))
    .map(
      (x, i) =>
        ` <a class="srcn" href="${esc(safeUrl(x.u))}" target="_blank" rel="noopener" title="${esc(x.t || 'Source ' + (i + 1))}">[${i + 1}]</a>`
    )
    .join('')}${extra}</p>`;
// The source the content editor gave with his edit of slot k of record r (core.js contentApply esrc: optional, shown
// with the slot when given): esrcOf its record, esrcIn a few words after a text, esrcP a line
// after a list; '' without one. esrcT its words alone, for a line inside a link (a look-alike card).
const esrcOf = (r, k) => ((r && r.esrc) || {})[k] || null;
const esrcIn = (r, k) => {
  const s = esrcOf(r, k);
  return s ? ` <small class="esrc">(${s.u ? srcA(s) : esc(s.t)})</small>` : '';
};
const esrcP = (r, k) => {
  const s = esrcOf(r, k);
  return s ? `<p class="note esrc">Source: ${s.u ? srcA(s) : esc(s.t)}</p>` : '';
};
const esrcT = (r, k) => (esrcOf(r, k) ? '; ' + esrcOf(r, k).t : '');
// The content editor's free note on a node's sheet (SUBJECTS content: the note slot, fish.json records enote), '' without one.
const treeNote = r => (r && r.enote ? `<p class="note fnote">${esc(r.enote)}${esrcIn(r, 'note')}</p>` : '');
const spFacts = s => {
  const z = s.size,
    d = s.depth;
  if (!z && !d) return '';
  const same = z && d && z.src.u === d.src.u;
  return `<p class="ffacts">${z ? `Up to ${z.len} cm${z.lt ? ' ' + esc(LTYPE[z.lt] || z.lt) : ''}${same ? '' : ` <small>(${srcA(z.src)})</small>`}` : ''}${z && d ? ' · ' : ''}${
    d ? `${d.m[0] == null ? 'Down to ' + d.m[1] + ' m' : d.m[0] + '-' + d.m[1] + ' m deep'} <small>(${srcA(d.src)})</small>` : ''
  }</p>`;
};
// The range of its species' largest sizes, on the family sheet (study F9): "Its species reach 8 to 35 cm".
const famSizes = f => {
  // Total lengths only: a standard length or a disc width is another measure, never in the same range.
  const L = famSpecies(f)
    .map(s => s.size && !s.size.lt && s.size.len)
    .filter(x => x > 0);
  if (!L.length) return '';
  const a = Math.min(...L),
    b = Math.max(...L);
  return `<li>${L.length > 1 && a !== b ? `Its species reach ${a} to ${b} cm` : `Up to ${b} cm`} <small>(the largest total length of each species: Reef Life Survey, else FishBase; ${L.length} of ${famSpecies(f).length} species)</small></li>`;
};
// A line's source numbers, linked, from a record's msrc (ix: its indexes; '' for none): as genMarks numbers its lines.
const srcNums = (r, ix) =>
  (ix || [])
    .map(i =>
      (r.msrc || [])[i]
        ? ` <a class="srcn" href="${esc(safeUrl(r.msrc[i].u))}" target="_blank" rel="noopener" title="${esc(r.msrc[i].t)}">[${i + 1}]</a>`
        : ''
    )
    .join('');
const fishMarks = f =>
  (f.marks || []).length || (f.life || []).length || famSizes(f)
    ? `<div class="fmarks">${(f.marks || []).length ? `<h3>Family ID marks</h3><ul class="crit">${f.marks.map((x, i) => `<li>${esc(x)}${srcNums(f, ((f.mby || {}).marks || [])[i])}</li>`).join('')}</ul>${esrcP(f, 'marks')}` : ''}${
        (f.life || []).length || famSizes(f)
          ? `<h3>Behaviour, habitat, size</h3><ul class="crit">${(f.life || []).map(x => `<li>${esc(x)}</li>`).join('')}${famSizes(f)}</ul>${esrcP(f, 'life')}`
          : ''
      }<p class="note msrc">${(f.msrc || []).length ? 'Sources: ' : ''}${(f.msrc || [])
        .map(
          (x, i) =>
            (f.mby ? `[${i + 1}] ` : '') +
            (x.u ? `<a href="${esc(safeUrl(x.u))}" target="_blank" rel="noopener">${esc(x.t)}</a>` : esc(x.t))
        )
        .join(
          '; '
        )}${(f.msrc || []).length ? ' · ' : ''}${repBtn({k: 'sheet', g: f.id, m: 'marks'}, '⚑ Report or correct a line')}</p></div>`
    : '';
// The family sheet (study §3.2: F1 names, F2 my progress, F3 hero, F4 IMR tips, F5 look-alikes, F6 genera, F7 species
// when the family has one genus, F8 juveniles and phases, F10 report).
function treeFamily(f) {
  const T = ftree(),
    key = (TREEU && TREEU.key) || null,
    gr = famGroup(f),
    A = famSpecies(f),
    G = (f.genera || []).map(id => T.gen[id]).filter(g => g && genSpecies(g).length),
    flat = [],
    all = easyRank(A.flatMap(s => treeSpPhotos()[s.id] || [])),
    // The admin's ★ Cover while in play (app.js treeCurate), else the default (nodeCover: its most seen species'
    // easiest photo that is not a juvenile).
    hero = (GX(f.id) || {}).coverP || nodeCover(A),
    juv = all.filter(juvP).slice(0, 4),
    u = GX(f.id) ? f.id : '';
  if (hero) flat.push(hero);
  const cover = id => {
    const L = famSpecies(T.fam[id]);
    return (GX(id) || {}).coverP || nodeCover(L);
  };
  // F5: IMR's look-alike lines (fish.json look, lsrc), our lines for the pairs IMR gives no words for (apart, from the
  // family's sources: tools/fish_sheets.json), then the families players mix it up with (model.js dataLooks), said as
  // such; the mix-up count once the game asks the families.
  const msrc = (f.msrc || []).map(x => x.t).join('; '),
    ap = f.apart || {},
    said0 = (f.look || [])
      .filter(([o]) => T.fam[o])
      .map(([o, t]) =>
        t || !ap[o]
          ? [o, t, ((f.lsrc || {})[o] || 'IMR fish presentation') + esrcT(f, 'look/' + o)]
          : [o, ap[o], msrc + esrcT(f, 'apart/' + o)]
      ),
    said = [
      ...said0,
      ...Object.keys(ap)
        .filter(o => T.fam[o] && !said0.some(x => x[0] === o))
        .map(o => [o, ap[o], msrc + esrcT(f, 'apart/' + o)])
    ],
    mixed =
      u && typeof dataLooks === 'function'
        ? dataLooks()
            .filter(p => p.includes(u))
            .map(p => (p[0] === u ? p[1] : p[0]))
            .filter(o => T.fam[o] && !said.some(x => x[0] === o))
            .map(o => [o, '', 'Often mixed up by players'])
        : [],
    looks = [...said, ...mixed],
    // its one genus's look-alikes, this sheet standing for that genus (treeGenusLooksOn)
    one = (f.genera || []).length === 1 ? T.gen[f.genera[0]] : null,
    glooks = treeGenusLooksOn(one, T, f.id);
  const lookCard = ([o, t, src]) => {
    const p = cover(o),
      m = u ? mixedUp(u, o) : 0;
    return `<a class="lt" href="${esc(hr('g-' + o))}">${m ? `<span class="pmix">you mixed them up ×${m}</span>` : ''}${p ? `<img ${thumb(p, '(max-width: 599.98px) 50vw, 240px')} alt="${esc(T.fam[o].name)}" loading="lazy">` : noFish()}<span><b>${esc(T.fam[o].name)}</b><small>${esc(famSci(T.fam[o]))}</small>${t ? `<span class="psum">${esc(t)}</span>` : ''}<small class="lsrc">${esc(src)}</small><b class="cmpgo">Open the sheet →</b></span></a>`;
  };
  // F6 / F7: the genus rows; a family with one genus lists its species here (no genus page: the study's recommendation).
  const gsec =
    G.length > 1
      ? `<h3>Genera <small>${G.length} · ${A.length} species</small></h3><div class="frows">${G.map(g => treeGenusRow(g, flat)).join('')}</div>`
      : A.length > 1
        ? `<h3>Species <small><i>${esc(G[0] ? G[0].name : '')}</i> · ${A.length}</small></h3>${treeTiles(A, flat)}`
        : A.length
          ? `<h3>Genus and species</h3><div class="frows">${treeGenusRow(G[0], flat)}</div>`
          : '';
  const phase = (f.phase || []).length,
    jsec =
      phase || f.juv || juv.length
        ? `<h3>Juveniles and phases</h3>${phase ? `<ul class="crit">${f.phase.map(x => `<li>${esc(x)}</li>`).join('')}</ul><p class="note">IMR fish presentation${f.sl ? ', ' + slideLine(f.sl) : ''}</p>${esrcP(f, 'phase')}` : ''}${
            f.juv && f.juv.note ? juvNote(f.juv.note, f.juv.src, {extra: esrcIn(f, 'juv.note')}) : ''
          }${juv.length ? `<div class="ftiles juv">${juv.map(p => `<figure class="ftile">${treePic(p, flat, p.t || 'Juvenile')}<figcaption><i>${esc(p.t || '')}</i><span>Juvenile</span></figcaption></figure>`).join('')}</div>` : ''}`
        : '';
  $v.innerHTML = `<p class="lede">${sheetWord('famLede') ? sheetWord('famLede')(f) : `One family of ${key ? esc(key.short) : 'the identification key'} on one page, under its English name, its scientific name or names below. The <b>ID tips (IMR)</b> are the IMR fish presentation's. <b>Genera</b> lists its genera, each with a few of its species. <b>Opened for me</b> shows the species of the families you have reached Advanced on; <b>All</b> shows every species. Tap a photo to enlarge it.`}${isPhone() ? '' : ' ← / → go to the previous / next family.'}</p>
  <article class="sheet fsheet">
    <div class="fnames"><p class="fn-t">${esc(f.name)}</p>${vernHead(f.id)}${famSci(f) || famIMR(f) ? `<p class="fn-s">${esc(famSci(f))}${famIMR(f) ? ` <span>· ${esc(famIMR(f))}</span>` : ''}</p>` : ''}${gr ? `<p class="fn-g">${gr.n}. ${esc(gr.title)}${key ? ' · ' + esc(key.short) : ''}</p>` : ''}</div>
    ${u ? myProg(u) : ''}
    <div class="hero">
      ${hero ? `<button type="button" class="zoom hero-ph" data-z="0" aria-label="Enlarge photo: ${esc(f.name)}"><img src="${img(hero, 's')}" srcset="${srcset(hero)}" sizes="(max-width: 599.98px) 100vw, 45vw" alt="${esc(f.name)}">${ZOOMI}</button>` : `<span class="hero-ph">${noFish()}</span>`}
      <div class="idbox">
        ${(f.cues || []).length ? `<div class="tipbox"><h3>ID tips (IMR) <span class="pg">${esc(slideLine(f.sl))}</span></h3><ul class="crit idtips">${f.cues.map(c => `<li>${esc(c)}</li>`).join('')}</ul>${esrcP(f, 'cues')}</div>` : ''}
        ${fishMarks(f)}
        ${treeNote(f)}
        ${G.map(g => genMarks(g, f.id)).join('')}
        ${G.map(g => treeRoot(g, f.id)).join('')}
        ${f.imrWith ? `<p class="note">The IMR fish presentation shows it with the ${esc(f.imrWith)}; ${key ? esc(key.short) : 'the identification key'} puts it in a family of its own.</p>` : ''}
        <details class="more sheetmore"><summary>More details</summary>${vernMore(f.id)}
        <p class="note refs"><b>References:</b> ${f.cues ? 'IMR fish presentation' + (f.sl ? ' (' + esc(slideLine(f.sl)) + ')' : '') + ' · ' : ''}${key ? esc(key.cite) + (gr && gr.pages ? `, pp. ${gr.pages.join('-')}` : '') + ' · ' : ''}${(
          f.sci || []
        )
          .map(
            n =>
              `<a href="https://www.marinespecies.org/aphia.php?p=taxlist&amp;tName=${encodeURIComponent(n)}" target="_blank" rel="noopener">${esc(n)} (WoRMS)</a>`
          )
          .join(' · ')}</p>
        </details>
      </div>
    </div>
    ${looks.length || glooks.length ? `<section class="hubsec"><h3>Don't confuse with</h3><div class="lrow"><div class="lt self">${hero ? `<img ${thumb(hero, '(max-width: 599.98px) 50vw, 240px')} alt="${esc(f.name)}" loading="lazy">` : noFish()}<span><b>${esc(f.name)}</b><small>this family</small></span></div>${looks.map(lookCard).join('')}${glooks.map(L => treeGenusLookCard(one, T, L)).join('')}</div></section>` : ''}
    ${gsec}
    ${jsec}
    <p class="repline">${repBtn({k: 'sheet', g: f.id, m: 'sheet'}, '⚑ Report a problem with this sheet')}</p>
  </article>`;
  treeBind(flat, () => treeFamily(f));
}
// A genus's look-alikes for its sheet, [[genus id, its source line]] (docs/ARCHITECTURE.md): the genera a specialist
// source names (the tree's genus look, lsrc: the sea slugs', tools/seaslug_game.py genus_looks), then its look-alikes from
// the data (model.js dataLooks) while the players' answers keep them: those only iNaturalist's identifications show (the
// tree's dlook, with their counts) and those the players mix it up with, said as such. T: the tree (ftree).
function treeGenusLooks(g, T) {
  const line = o => ((g.lsrc || {})[o] || []).map(x => x.t).join('; '),
    own = (g.look || []).filter(o => T.gen[o]),
    data =
      GX(g.id) && typeof dataLooks === 'function'
        ? dataLooks()
            .filter(p => p.includes(g.id))
            .map(p => (p[0] === g.id ? p[1] : p[0]))
            .filter(o => T.gen[o] && !own.includes(o))
        : [];
  return [...own.map(o => [o, line(o)]), ...data.map(o => [o, line(o) || 'Often mixed up by players'])];
}
// One look-alike genus's card on genus g's sheets: its cover, its name, its species count and family, the pair's source
// line, and the mix-up count once the game asks them.
function treeGenusLookCard(g, T, [o, src]) {
  const x = T.gen[o],
    p = genCover(x) || nodeCover(genSpecies(x)),
    m = GX(g.id) ? mixedUp(g.id, o) : 0;
  return `<a class="lt" href="${esc(hr('g-' + o))}">${m ? `<span class="pmix">you mixed them up ×${m}</span>` : ''}${p ? `<img ${thumb(p, '(max-width: 599.98px) 50vw, 240px')} alt="${esc(x.name)}" loading="lazy">` : noFish()}<span><i>${esc(x.name)}</i><small>${genSpecies(x).length} species · ${esc((T.fam[x.family] || {}).name || '')}</small><small class="lsrc">${esc(src)}</small><b class="cmpgo">Open →</b></span></a>`;
}
// The look-alikes of a genus with no page of its own (treeSheets go: the sheet it opens is page, its family's or its one
// species'), shown on that sheet: [[genus id, source line]], none for a genus with its own page.
const treeGenusLooksOn = (g, T, page) => (g && T.go(g.id) === page ? treeGenusLooks(g, T) : []);
// A genus's sibling genera for its page's "Don't confuse with": the genera of its family IMR gives cues for, never the
// genus itself nor one without species. A sibling that has only our own ID marks is not listed: the page lists sourced
// pairs only, the others come from the players' data (docs/decisions/2026-11-19-fish-genus-dont-confuse.md). T: the tree.
const treeGenusSibs = (g, T) =>
  ((T.fam[g.family] || {}).genera || [])
    .map(id => T.gen[id])
    .filter(x => x && x.id !== g.id && (x.cues || []).length && genSpecies(x).length);
// The short genus page (study §4.2, option B), opened from its row on the family sheet: the genus, its common name under
// it (its source under More details; a name inferred from its species' names says so: fish.json genera cinf), its
// family and IMR entry name; my progress on it once met; the IMR sub-entry's cues; the species WoRMS now puts in another
// genus; every species, one photo each, most common first, with the "Opened for me" filter; its sibling genera IMR tells
// apart with its own cues.
function treeGenus(g) {
  const T = ftree(),
    f = T.fam[g.family],
    L = genSpecies(g),
    flat = [],
    now = L.filter(s => s.now && s.now.split(/\s+/)[0] !== g.name),
    ng = [...new Set(now.map(s => s.now.split(/\s+/)[0]))],
    sib = treeGenusSibs(g, T),
    // A sibling genus's card: its picked genus cover, else the default (nodeCover).
    cover = x => genCover(x) || nodeCover(genSpecies(x));
  const card = x => {
    const p = cover(x);
    return `<a class="lt" href="${esc(hr('g-' + x.id))}">${p ? `<img ${thumb(p, '(max-width: 599.98px) 50vw, 240px')} alt="${esc(x.name)}" loading="lazy">` : noFish()}<span><i>${esc(x.name)}</i><small>${genSpecies(x).length} species${x.imr ? ' · IMR entry: ' + esc(x.imr) : ''}</small><span class="psum">${esc(x.cues.join(' · '))}</span><small class="lsrc">IMR fish presentation${x.sl ? ', ' + slideLine(x.sl) : ''}${esc(esrcT(x, 'cues'))}</small><b class="cmpgo">Open →</b></span></a>`;
  };
  // Its look-alikes beyond those (treeGenusLooks), each with its source.
  const looks = treeGenusLooks(g, T).filter(([o]) => !sib.some(x => x.id === o));
  $v.innerHTML = `<p class="lede">${sheetWord('genLede') ? sheetWord('genLede')(f) : `One genus of the ${esc(f.name)} on one page: its species, one photo each, the most met around Dauin first. <b>Opened for me</b> shows the species of the families you have reached Advanced on; <b>All</b> shows every species. <b>Don't confuse with</b> shows the other genera of the family the IMR fish presentation tells apart, and the look-alikes a source names or players mix up, each with its source. Tap a photo to enlarge it.`}${isPhone() ? '' : ' ← / → go to the previous / next genus of the family.'}</p>
  <article class="sheet fsheet">
    <div class="fnames"><p class="fn-t"><i>${esc(g.name)}</i></p>${g.common ? `<p class="fn-s">${esc(g.common)}${g.cinf ? ' <span>· inferred from its species’ names</span>' : ''}</p>` : vernHead(g.id)}<p class="${g.common || vernOf(g.id).length ? 'fn-g' : 'fn-s'}">${L.length} species · in <a href="${esc(hr('g-' + f.id))}">${esc(f.name)}</a>${g.imr ? ` <span>· IMR entry: ${esc(g.imr)}</span>` : ''}</p></div>
    ${GX(g.id) ? myProg(g.id) : ''}
    ${(g.cues || []).length ? `<div class="idbox"><div class="tipbox"><h3>ID tips (IMR${g.imr ? ', ' + esc(g.imr) : ''}) <span class="pg">${esc(slideLine(g.sl))}</span></h3><ul class="crit idtips">${g.cues.map(c => `<li>${esc(c)}</li>`).join('')}</ul>${esrcP(g, 'cues')}</div></div>` : ''}
    ${genMarks(g, g.id)}
    ${treeNote(g)}
    ${treeRoot(g, g.id)}
    ${now.length ? `<p class="note">${now.length} of ${L.length} now in <i>${ng.map(esc).join('</i>, <i>')}</i> in WoRMS.</p>` : ''}
    <h3>Species <small>${L.length}</small></h3>${treeTiles(L, flat)}
    ${sib.length || looks.length ? `<section class="hubsec"><h3>Don't confuse with</h3><div class="lrow">${sib.map(card).join('')}${looks.map(L => treeGenusLookCard(g, T, L)).join('')}</div></section>` : ''}
    ${g.common ? `<details class="more sheetmore"><summary>More details</summary><p class="note refs"><b>Common name:</b> ${esc(g.csrc || '')}</p></details>` : vernOf(g.id).length ? `<details class="more sheetmore"><summary>More details</summary>${vernMore(g.id)}</details>` : ''}
    <p class="repline">${repBtn({k: 'sheet', g: g.id, m: 'sheet'}, '⚑ Report a problem with this sheet')}</p>
  </article>`;
  treeBind(flat, () => treeGenus(g));
}

// The species sheet (study §5.1): the scientific name first, the PDF name as EventMeasure names it, the WoRMS name when
// it changed (rule S2), its common name; its family and genus; the IMR flags and the presence badge (rule C8's words);
// its rank by commonness around Dauin in its family (fish.json cmi); its photos, the easiest, most reference-like first
// whoever took them, the juveniles apart; the other species of its genus; its links. No value of our own: no photo
// shows the one drawing and the links.
// Its photos (P: treeSpPhotos' order): three adult photos, the first its cover, then up to two juveniles apart (app.js
// juvP); more: the other adults, folded. A juvenile is never the first photo while the species has an adult one. lead:
// its one photo (spPhoto), first, and not among the juveniles when it is a confirmed juvenile cover.
function spSheetPhotos(P, lead = null) {
  const main = [...(lead ? [lead] : []), ...P.filter(p => p !== lead && !juvP(p))];
  return {shown: [...main.slice(0, 3), ...P.filter(p => p !== lead && juvP(p)).slice(0, 2)], more: main.slice(3)};
}
function fishSpecies(s) {
  const T = ftree(),
    f = T.fam[s.family],
    g = T.gen[s.genus],
    P = treeSpPhotos()[s.id] || [],
    isJ = juvP,
    {shown, more} = spSheetPhotos(P, P.length ? spPhoto(s) : null),
    flat = [...shown, ...more],
    F = famSpecies(f),
    // its rank in its family by what the subject counts (UNITS words.met: the sea slugs', observers in the Philippines)
    met = sheetWord('met') || {v: x => x.cmi || 0, where: 'around Dauin, by how often it is met'},
    rank = [...F].sort((a, b) => met.v(b) - met.v(a)).indexOf(s) + 1,
    sib = g ? genSpecies(g).filter(x => x !== s) : [],
    gto = g ? treeGo(g.id) : '',
    // its genus's look-alikes when its genus opens this sheet (one species: treeGenusLooksOn)
    glooks = treeGenusLooksOn(g, T, 's:' + s.name);
  const fig = (p, i, big) =>
    `<figure><button type="button" class="zoom${big ? ' fbig' : ''}" data-z="${i}" aria-label="Enlarge photo: ${esc(s.name)}"><img src="${img(p, 's')}" srcset="${srcset(p)}" sizes="${big ? '(max-width: 599.98px) 100vw, 45vw' : '(max-width: 599.98px) 50vw, 300px'}" alt="${esc(s.name)}" loading="${big ? 'eager' : 'lazy'}">${ZOOMI}</button><figcaption>${isJ(p) ? '<b>Juvenile</b> · ' : ''}${credit(p)}</figcaption></figure>`;
  const links = spLinks(s);
  $v.innerHTML = `<p class="lede">${sheetWord('spLede') || 'One species on one page: its scientific name as on the IMR reference list, its common name, its family and genus, its photos (the easiest first; tap one to enlarge it) and the other species of its genus.'}${isPhone() ? '' : ' ← / → go to the previous / next species.'}</p>
  <article class="sheet fsheet">
    <div class="fnames"><p class="fn-t">${spNameH(s)}</p>${vernOf(s.id).length ? vernHead(s.id) : spCommon(s) ? `<p class="fn-s">${esc(spCommon(s))}</p>` : ''}${spAlso(s)}${s.now && s.now !== s.name ? `<p class="fn-g">now <i>${esc(s.now)}</i> in WoRMS</p>` : ''}</div>
    <p class="fbadges"><a class="chip" href="${esc(hr('g-' + f.id))}">${esc(f.name)}</a>${g ? `<a class="chip" href="${esc(hr('g-' + gto))}"><i>${esc(g.name)}</i>${g.common ? ' · ' + esc(g.common) : ''}</a>` : ''}${s.cs ? `<span class="chip"><b class="star">★</b> IMR most sighted #${s.cs}</span>` : ''}${s.pdf ? '<span class="chip">On the IMR reference list</span>' : ''}<span class="chip">${(s.present || {}).near ? 'Confirmed near Dauin' : 'Not confirmed near Dauin'}</span></p>
    ${spFacts(s)}
    ${treeNote(s)}
    ${genMarks(g, 's:' + s.name)}
    ${marksBox(s)}
    ${treeRoot(g, 's:' + s.name)}
    ${F.length > 1 && rank ? `<p class="note">${rank === 1 ? 'The most met' : `#${rank} of ${F.length}`} ${esc(f.name)} ${esc(met.where)}.</p>` : ''}
    ${
      shown.length
        ? `<div class="fphotos">${fig(shown[0], 0, true)}${
            shown.length > 1
              ? `<div class="strip">${shown
                  .slice(1)
                  .map((p, i) => fig(p, i + 1))
                  .join('')}</div>`
              : ''
          }</div>${
            more.length
              ? `<details class="more"><summary>${more.length} more photo${more.length > 1 ? 's' : ''}</summary><div class="strip">${more.map((p, i) => fig(p, shown.length + i)).join('')}</div></details>`
              : ''
          }`
        : `<div class="fphotos"><span class="fbig">${noFish()}</span><p class="note">No photo of it here yet: see it on ${links}.</p></div>`
    }
    ${s.jv && s.jv.line ? juvNote(s.jv.line, s.jv.src, {lead: '<b>Juvenile:</b> '}) : ''}
    ${sib.length ? `<h3>Other species of <i>${esc(g.name)}</i> <small>${sib.length}</small></h3><div class="ftiles">${sib.map(fishTile).join('')}</div>` : ''}
    ${glooks.length ? `<section class="hubsec"><h3>Don't confuse with</h3><div class="lrow">${glooks.map(L => treeGenusLookCard(g, T, L)).join('')}</div></section>` : ''}
    <details class="more sheetmore"><summary>More details</summary>${spNamesLine(s)}${vernMore(s.id)}<p class="note refs"><b>References:</b> ${s.pdf ? 'IMR / EventMeasure reference list · ' : ''}${s.inf && s.cite ? esc(s.cite) + ' · ' : ''}${links}</p></details>
    <p class="repline">${repBtn({k: 'sheet', g: s.id, m: 'sheet'}, '⚑ Report a problem with this sheet')}</p>
  </article>`;
  treeBind(flat, () => fishSpecies(s));
}
