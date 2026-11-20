// Photos › Tree on the corals' side (#photos/tree/key/<node id>, #photos/tree/worms/<node id>; docs/ROADMAP.md "The Tree
// tab": one tree for any subject, the corals included). The corals'
// adapter of the generic tree (taxtree.js): the fish have theirs in admin.js (fuTreeOf, fuWormsOf); the node pages, the
// tree at the left and its keys are the same (admin.js ttMount, fuTreeMount).
//
// - Key: the IMR course's own grouping of the genera, the IMR lecture groups (data.json imrg, 1-11, the genus's ig), each
//   genus under the group the app shows it in (core.js lectureGroup: a ★ genus the lecture does not group sits with most
//   of its look-alikes, rule L5); the genera in no lecture group (Millepora, the bonus and Coral Finder key genera of
//   data.json x) under k:none. Never the Coral Finder key of data.json key: its branches are growth forms, and rule C4
//   forbids grouping genera by growth form (a genus also sits in several of its boxes: one parent per node here).
// - WoRMS: the family WoRMS files each genus under (data/names.json worms: the admin's extract of the reference of names that
//   tools/taxonomy.py writes; the admin never reads the reference itself), not the app's own family word (data.json fam, the IMR
//   wording: Pachyseris is in Pachyseridae for WoRMS, Agariciidae in the lecture). The file holds each genus's AphiaID
//   but no family's, so a family node's id is wf:<its name> (never w:, the namespace of an AphiaID).
// - The leaves are the genera, the corals' playable rank: every genus the admin has a page for (data.json gen and x.gen),
//   its id its name, one node in both views. Their photos are chosen per genus (curation.json genera[<genus>]: the cover,
//   the featured photos, the views); a photo's species (its t) is only a name, never curated: so no species rank.
//
// The pure part (ctKeyOf, ctWormsOf, ctFilters) runs in Node too: tests/coraltree.test.js. admin.html loads this file
// before admin.js (a Tree address opened cold finds renderCoralTree); its admin part reads admin.js's state and helpers
// only when called.
(function (root) {
  const inNode = typeof module !== 'undefined' && module.exports,
    {ttFromRef} = inNode ? require('./taxtree.js') : root,
    {lectureGroup, slateOf} = inNode ? require('./core.js') : root;
  // The leaves of both views, in the Key's order: the IMR lecture groups in their order, in each the numbered genera by
  // their number, then the ★ genera in data.json's order; then the genera in no group, the slate's first (Millepora),
  // then A-Z. d: data.json as the admin holds it (its x genera merged into gen, d.x kept: core.js xGen).
  function ctLeaves(d) {
    const G = (d && d.gen) || {},
      slate = new Set(slateOf(d)),
      names = Object.keys(G),
      grp = n => lectureGroup(d, n) || 0,
      ord = n => (G[n].n ? G[n].n : 1000 + names.indexOf(n)),
      none = names.filter(n => !grp(n)).sort((a, b) => !slate.has(a) - !slate.has(b) || a.localeCompare(b));
    return [
      ...((d && d.imrg) || []).flatMap(x =>
        names
          .filter(n => grp(n) === x.n)
          .sort((a, b) => ord(a) - ord(b))
          .map(n => [n, x])
      ),
      ...none.map(n => [n, null])
    ].map(([n, x]) => ({
      id: n,
      name: n,
      it: true,
      rank: 'genus',
      genus: n,
      grp: x ? x.n : 0,
      num: G[n].n || 0,
      slate: slate.has(n),
      star: slate.has(n) && !G[n].n && !((d.x || {}).gen || {})[n]
    }));
  }
  // The Key's nodes: each IMR lecture group that holds a genus (k:<its number>, rank group, its lecture line as its
  // name), k:none (no rank) for the genera in no group, and the genera under them. Built once per data.json (cache).
  let KC = null;
  function ctKeyOf(d) {
    if (KC && KC.d === d) return KC.nodes;
    const L = ctLeaves(d),
      N = [],
      seen = new Set();
    L.forEach(l => {
      const k = l.grp ? 'k:' + l.grp : 'k:none';
      if (!seen.has(k)) {
        seen.add(k);
        const x = (d.imrg || []).find(y => y.n === l.grp);
        N.push(x ? {id: k, name: `${x.n} · ${x.t}`, rank: 'group'} : {id: k, name: 'No IMR group'});
      }
      N.push({...l, up: k});
    });
    KC = {d, nodes: N};
    return N;
  }
  // The WoRMS view's nodes and problems: each genus (a leaf, its own id) under the family WoRMS gives it (wf:<family>,
  // rank family), from W = data/names.json coral worms {genus: {id: AphiaID, fam}}, through taxtree.js ttFromRef: a genus the
  // extract lacks is reported (no reference), never placed. The families come in the order the Key's leaves meet them.
  function ctWormsOf(d, W) {
    const R = {};
    Object.entries(W || {}).forEach(([n, w]) => {
      if (!w || !w.id || !w.fam) return;
      R['wf:' + w.fam] = {name: w.fam, rank: 'family', parent: null};
      R[String(w.id)] = {name: n, rank: 'genus', parent: 'wf:' + w.fam};
    });
    const L = ctLeaves(d).map(l => ({...l, ref: W && W[l.id] && W[l.id].id ? String(W[l.id].id) : null}));
    // ids: only the families become nodes (the genera are the leaves, each its own id), keyed wf:<name> already
    return ttFromRef(L, R, {id: k => String(k)});
  }
  // The Tree's tags as filters (beside All | IMR, as the fish's admin.js fuFilters): each a test on a node of the Key's
  // tree (here, on the genera: every coral tag is a genus's), read through the leaves (taxtree.js ttPass), so both views
  // show the same genera. Offered: ★ (the slate's starred genera, rule L5); the look-alikes, the pairs Photos ›
  // Look-alikes shows (the IMR lecture's and the Coral Finder text's: admin.js classicPairs), any or one; Needs work (a
  // genus whose ✓ Validated waits: admin.js needs), Candidates waiting (admin.js pending), Draft (a genus whose choices
  // changed since the published file: admin.js changed). No growth form, ever (rule C4). c: {pairs: [{k, A, B}], rows:
  // the content editor's pairs (admin-content.js pairRows), needs(n) → [what], waiting(n) → count, draft: [genera]}.
  // [{k, grp, t, on(node)}]. The look-alikes, as the fish's (admin.js fuFilters): the base's, then each pair the draft
  // holds an entry for (one he added with + Pair, a withdrawal), so its tools in the bar (structBar) can be reached; each
  // says when he added or withdrew it; Any look-alike, the pairs in force.
  function ctFilters(d, c) {
    const P0 = (c && c.pairs) || [],
      PR = (c && c.rows) || [],
      byK = new Map(PR.map(r => [r.key, r])),
      ids = new Set(ctLeaves(d).map(l => l.id)),
      P = [
        ...P0,
        ...PR.filter(r => r.e && !P0.some(p => p.k === r.key) && ids.has(r.a) && ids.has(r.b)).map(r => ({k: r.key, A: r.a, B: r.b}))
      ],
      live = p => !byK.has(p.k) || byK.get(p.k).v === 1,
      word = p => {
        const r = byK.get(p.k);
        return r && r.e && (r.state === 'fresh' || r.state === 'stale') ? (r.v === 1 ? ' (added)' : ' (withdrawn)') : '';
      },
      inP = new Set(P.filter(live).flatMap(p => [p.A, p.B])),
      dr = new Set((c && c.draft) || []),
      g = n => !!n.genus,
      out = [];
    if (ctLeaves(d).some(l => l.star)) out.push({k: 'star', grp: 'Slate', t: '★ Starred', on: n => g(n) && !!n.star});
    if (P.length) out.push({k: 'look', grp: 'Look-alikes', t: 'Any look-alike', on: n => g(n) && inP.has(n.id)});
    P.forEach(p => out.push({k: 'look:' + p.k, grp: 'Look-alikes', t: `${p.A} · ${p.B}${word(p)}`, on: n => n.id === p.A || n.id === p.B}));
    out.push(
      {k: 'work', grp: 'To do', t: 'Needs work', on: n => g(n) && !!(c && c.needs && c.needs(n.id).length)},
      {k: 'cand', grp: 'To do', t: 'Candidates waiting', on: n => g(n) && !!(c && c.waiting && c.waiting(n.id))},
      {k: 'draft', grp: 'To do', t: 'Draft', on: n => g(n) && dr.has(n.id)}
    );
    // The photos taken off the site and the excluded ones, found by their genus (the former Hidden and Excluded views; the
    // shared node-photos section's counts, admin-nodephotos.js npCount).
    if (c && c.removed) out.push({k: 'removed', grp: 'Photos', t: 'Removed photos', on: n => g(n) && !!c.removed(n.id)});
    if (c && c.excluded) out.push({k: 'excluded', grp: 'Photos', t: 'Excluded photos', on: n => g(n) && !!c.excluded(n.id)});
    return out;
  }
  const API = {ctLeaves, ctKeyOf, ctWormsOf, ctFilters};
  if (inNode) module.exports = API;
  else Object.assign(root, API);
})(this);

// ---- The admin view (browser only: admin.js state and helpers) ----
// The two trees, built once per data.json and data/names.json: the Key (ctKeyOf) and WoRMS (ctWormsOf, its problems with the
// tree's: a genus with no WoRMS record in data/names.json, reported in the bar).
let CTREES = null;
function ctTrees() {
  if (CTREES && CTREES.d === DATA && CTREES.w === NAMES) return CTREES;
  const K = ttBuild(ctKeyOf(DATA)),
    r = ctWormsOf(DATA, (NAMES || {}).worms),
    W = ttBuild(r.nodes);
  W.problems = [...r.problems, ...W.problems];
  return (CTREES = {d: DATA, w: NAMES, K, W});
}
// The tree of a Tree view (admin.js TREE, TREE_W).
const ctTree = v => (v === TREE_W ? ctTrees().W : ctTrees().K);
// A genus's photos on the site (its genus page's views: in play, not removed).
const ctOn = n => photos(n).filter(p => !hidden(n, p)).length;
// A node's content, the same in the tree's row and on a page's card: a genus as its row on the genus page's list (its
// cover, No. or ★, its photos, what it needs, ✓ Validated and the draft's dot); a group or a family its genera and photos,
// with the dot when a genus under it changed since the published file.
function ctRow(T) {
  const ch = new Set(changed()),
    nG = ttRoll(T, n => (n.genus ? 1 : 0)),
    nPh = ttRoll(T, n => (n.genus ? ctOn(n.id) : 0)),
    ph = id => `${nPh[id]} photo${nPh[id] === 1 ? '' : 's'}`,
    gn = id => `${nG[id]} ${nG[id] === 1 ? 'genus' : 'genera'}`,
    dot = '<span class="dots"><b class="dot" title="Draft not published yet">●</b></span>';
  const row = n => {
    if (!n.genus)
      return `<span class="adm-ttn${n.rank === 'family' ? '' : ' adm-ttk'}">${ttName(n)}<small>${ttRank(n)}${gn(n.id)} · ${ph(n.id)}</small></span>${ttLeaves(T, n.id).some(x => ch.has(x)) ? dot : ''}`;
    const m = n.id,
      g = DATA.gen[m],
      c = coverOf(m),
      e = entry(m),
      nd = needs(m);
    return `<span class="adm-g">${c ? `<img src="${img(c, 1)}" alt="" loading="lazy">` : '<span class="none"></span>'}<span><i>${esc(m)}</i>
      <small>${ttRank(n)}${g.n ? 'No. ' + g.n : g.x ? 'not IMR' : '★'} · ${ph(m)}${nd.length ? ` · <b class="warnc" title="${esc(nd.join(' · '))}">${esc(nd[0])}</b>` : ''}</small></span><span class="dots">${e.ok ? (nd.length ? '<b class="dot warn" title="Validated, incomplete">!</b>' : '<b class="dot done" title="Validated">✓</b>') : ''}${ch.has(m) ? '<b class="dot" title="Draft not published yet">●</b>' : ''}</span></span>`;
  };
  return {row, nG, ph, gn};
}
// The tag the corals' Tree shows (ctFilters' k; '' none), in this browser, as its unfolding.
const ctTagK = () => subjK('reefid-admin-tree-tag');
// A node's page in the corals' Tree (#photos/tree/key/<node id>, #photos/tree/worms/<node id>; none or an unknown id:
// the view's first root, the first IMR lecture group or the first family), as the fish's (admin.js renderFishUnits): the
// tree at the left (the WAI-ARIA tree, admin.js ttMount), the sticky bar with the path from the root, the genera's
// select, All | IMR (the slate's genera) and Tag… (ctFilters), and the select of the node's children (the phone's way
// down). A group or a family: its children's cards, each as its tree row. A genus: its cover and why, what it needs and
// every tool of the former Photos › Genera › Live page (admin-nodephotos.js coralLive: its photos per view, ★ Cover, Feature,
// Remove, Not this, ×, Validated…), under its Structure and Sheet; a cover is a genus's (curation.json
// genera[<genus>].cover); above the genera no cover is shown, the default rule of the fish (most seen near the centre)
// needing observers per genus the coral data does not hold. Every node page ends with the shared Removed from the site and
// Excluded lists of the genera under it (admin-nodephotos.js npLists).
function renderCoralTree(id, view = TREE) {
  status();
  TT_VIEW = view;
  const T = ctTree(TREE),
    TV = ctTree(view);
  if (!TV.node.size) {
    $v.innerHTML = '<p class="note">No genera yet.</p>';
    return;
  }
  const sel = TV.node.has(id) ? id : TV.roots[0],
    n = TV.node.get(sel),
    hadF = !!(document.activeElement && document.activeElement.closest && document.activeElement.closest('.adm-tree')),
    top = (o => (o ? o.scrollTop : null))($v.querySelector('.adm-tree') && $v.querySelector('.adm-list'));
  const imrOn = FU_IMR === 'imr',
    // the base's classic pairs and the draft's pair entries (ctFilters rows)
    FL = ctFilters(DATA, {
      pairs: classicPairs(),
      rows: typeof pairRows === 'function' ? pairRows(ASUBJ, DATA, contentOf(DRAFT, ASUBJ)) : [],
      needs,
      waiting: m => pending(m).length,
      draft: changed(),
      removed: npCount.removed,
      excluded: npCount.excluded
    }),
    tag = FL.find(x => x.k === store.get(ctTagK(), '')),
    imrF = x => !!x.slate,
    // the filters read in the Key through its leaves, shown in the view on screen with what leads to them (as the fish's)
    pass = imrOn || tag ? ttPass(T, [imrOn && imrF, tag && tag.on].filter(Boolean)) : null,
    vis = pass ? ttReach(TV, pass, [sel]) : null,
    R = ctRow(TV),
    kids = TV.kids.get(sel).filter(x => !vis || vis.has(x)),
    G = TV.roots.flatMap(r => ttLeaves(TV, r)).filter(x => !vis || vis.has(x) || x === sel);
  $('preview').href = n.genus ? `./?draft#${routeOut('g-' + sel)}` : './?draft';
  const crumbs = ttCrumbs(TV, sel),
    opts = `${n.genus ? '' : '<option value="" selected>Genus…</option>'}${G.map(x => `<option value="${esc(x)}"${x === sel ? ' selected' : ''}>${esc(x)}</option>`).join('')}`,
    tagSel = ttTagSel(FL, tag, f => ttPass(T, [imrOn && imrF, f.on].filter(Boolean)).size, 'genera'),
    imrSeg = `<span class="adm-qseg adm-lvseg adm-fimr" role="group" aria-label="Genera shown">${[
      ['all', 'All'],
      ['imr', 'IMR']
    ]
      .map(
        ([k, t]) =>
          `<button type="button" data-fuimr="${k}" aria-pressed="${FU_IMR === k}" title="${k === 'imr' ? 'The IMR slate' : 'Every genus'}">${t}</button>`
      )
      .join('')}</span>${tagSel}${typeof structBar === 'function' ? structBar(ASUBJ, DATA, tag && tag.k) : ''}`,
    // The content editor's tools, as on the fish's Tree (admin-content.js; design note v2, step 8): the Look-alikes
    // filter's + Pair box under the bar, the edits to check in the bar (sheetWarn), a genus page's Structure (its
    // look-alike pairs: no circle, the slate is not the editor's) and Sheet boxes, over data.json as the admin holds it.
    stAdd = typeof structAdd === 'function' ? structAdd(ASUBJ, DATA, x => x) : '',
    cw = typeof sheetWarn === 'function' ? sheetWarn(ASUBJ, DATA, tvHref) : '',
    kr = kids.length ? cap1(TV.node.get(kids[0]).rank || '') || 'Open' : '',
    kidSel = kids.length
      ? `<select class="adm-fgsel" data-ttkid aria-label="${esc(kr)}"><option value="">${esc(kr)} · ${kids.length}</option>${kids
          .map(x => `<option value="${esc(x)}">${esc(TV.node.get(x).name)} · ${TV.node.get(x).genus ? R.ph(x) : R.gn(x)}</option>`)
          .join('')}</select>`
      : '',
    probs = TV.problems.length
      ? `<b class="warnc adm-ttprob" title="${esc(TV.problems.map(p => `${p.id}: ${p.why}`).join('\n'))}">${TV.problems.length} tree problem${TV.problems.length === 1 ? '' : 's'}</b>`
      : '',
    side = `<nav class="adm-side" aria-label="Genera"><select id="gsel" aria-label="Genus">${opts}</select><div class="adm-list"><div class="adm-tree" role="tree" aria-label="${view === TREE_W ? 'WoRMS' : 'Key'}"></div></div></nav>`;
  let bar, body, live;
  if (!n.genus) {
    bar = `${crumbs}<b class="adm-sname">${ttName(n)}<small>${ttRank(n)}${R.gn(sel)} · ${R.ph(sel)}</small></b><select class="adm-gsel2" aria-label="Genus">${opts}</select>${imrSeg}${kidSel}${cw}${probs}`;
    body = `${stAdd}<div class="adm-tcards">${kids.map(x => `<a class="adm-tcard" href="${esc(tvHref(x))}" data-ttc="${esc(x)}">${R.row(TV.node.get(x))}</a>`).join('')}</div>`;
  } else {
    const m = sel,
      g = DATA.gen[m],
      c = coverOf(m),
      nc = pending(m).length,
      why = c ? (c.picked ? 'Your ★ cover' : 'Default: no ★ cover picked (the genus page’s automatic one)') : 'No photo on the site';
    // The genus's photos in play and their tools (the shared node-photos section's live part, admin-nodephotos.js: what
    // Photos › Genera › Live was): the tools in the bar, the views' grids, Candidates and Not this genus in the body.
    live = npOf().live(m);
    bar = `${crumbs}${c ? `<button type="button" class="adm-sthumb${c.picked ? ' mine' : ''}" data-f="${esc(c.f)}" data-act="zoomcover" title="Cover"><img src="${img(c, 1)}" alt="${esc(m)} cover"></button>` : ''}<b class="adm-sname"><i>${esc(m)}</i><small>${ttRank(n)}${g.n ? 'No. ' + g.n : g.x ? 'not IMR' : '★'} · ${R.ph(m)}${nc ? ` · ${nc} candidate${nc === 1 ? '' : 's'}` : ''}</small></b><select class="adm-gsel2" aria-label="Genus">${opts}</select>${imrSeg}${live.bar}${cw}${probs}<small class="adm-cvwhy">${esc(why)}</small>`;
    // Its look-alike pairs and its sheet's text, above its photos (admin-content.js structBox, sheetBox).
    const stbox = typeof structBox === 'function' ? structBox(ASUBJ, DATA, m, x => x, tvHref) : '',
      sbox = typeof sheetBox === 'function' ? sheetBox(ASUBJ, DATA, m, x => x) : '';
    body = stAdd + stbox + sbox + live.body;
  }
  // What was taken off the site and what was excluded under the node (the shared node-photos section, admin-nodephotos.js).
  body += npLists(TV, sel, sel === TV.roots[0]);
  $v.innerHTML = `<div class="adm adm-treep">${side}<section class="adm-main"><div class="adm-filter adm-sticky">${bar}</div>${body}</section></div>`;
  npBind($v);
  if (live) live.bind($v);
  [$('gsel'), $v.querySelector('.adm-gsel2')].forEach(
    el => el && (el.onchange = ev => ev.target.value && (location.hash = tvHref(ev.target.value)))
  );
  const ks = $v.querySelector('[data-ttkid]');
  if (ks) ks.onchange = () => ks.value && (location.hash = tvHref(ks.value));
  const ts = $v.querySelector('[data-tttag]');
  if (ts)
    ts.onchange = () => {
      store.set(ctTagK(), ts.value);
      render();
    };
  $v.querySelectorAll('[data-fuimr]').forEach(
    b =>
      (b.onclick = () => {
        FU_IMR = b.dataset.fuimr;
        store.set('reefid-admin-fu-imr', FU_IMR);
        render();
      })
  );
  // The content editor's tools (the bar's, the + Pair box, a genus page's Structure and Sheet).
  if (typeof structBind === 'function') structBind($v, ASUBJ, DATA);
  if (n.genus && typeof sheetBind === 'function') sheetBind($v, ASUBJ, DATA, sel);
  fuTreeMount(TV, sel, R.row, vis, hadF, top);
}
