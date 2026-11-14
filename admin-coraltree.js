// Photos › Tree on the corals' side (#photos/tree/key/<node id>, #photos/tree/worms/<node id>; docs/ROADMAP.md "The Tree
// tab", its last step: the corals join the tab; Pierre, 2026-11-13: "coraux, nudibranches ou plantes"). The corals'
// adapter of the generic tree (taxtree.js): the fish have theirs in admin.js (fuTreeOf, fuWormsOf); the node pages, the
// tree at the left and its keys are the same (admin.js ttMount, fuTreeMount).
//
// - Key: the IMR course's own grouping of the genera, the IMR lecture groups (data.json imrg, 1-11, the genus's ig), each
//   genus under the group the app shows it in (core.js lectureGroup: a ★ genus the lecture does not group sits with most
//   of its look-alikes, rule L5); the genera in no lecture group (Millepora, the bonus and Coral Finder key genera of
//   data.json x) under k:none. Never the Coral Finder key of data.json key: its branches are growth forms, and rule C4
//   forbids grouping genera by growth form (a genus also sits in several of its boxes: one parent per node here).
// - WoRMS: the family WoRMS files each genus under (names.json worms: the admin's extract of the reference of names that
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
  // rank family), from W = names.json coral worms {genus: {id: AphiaID, fam}}, through taxtree.js ttFromRef: a genus the
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
  // changed since the published file: admin.js changed). No growth form, ever (rule C4). c: {pairs: [{k, A, B}], needs(n)
  // → [what], waiting(n) → count, draft: [genera]}. [{k, grp, t, on(node)}].
  function ctFilters(d, c) {
    const P = (c && c.pairs) || [],
      inP = new Set(P.flatMap(p => [p.A, p.B])),
      dr = new Set((c && c.draft) || []),
      g = n => !!n.genus,
      out = [];
    if (ctLeaves(d).some(l => l.star)) out.push({k: 'star', grp: 'Slate', t: '★ Starred', on: n => g(n) && !!n.star});
    if (P.length) out.push({k: 'look', grp: 'Look-alikes', t: 'Any look-alike', on: n => g(n) && inP.has(n.id)});
    P.forEach(p => out.push({k: 'look:' + p.k, grp: 'Look-alikes', t: `${p.A} · ${p.B}`, on: n => n.id === p.A || n.id === p.B}));
    out.push(
      {k: 'work', grp: 'To do', t: 'Needs work', on: n => g(n) && !!(c && c.needs && c.needs(n.id).length)},
      {k: 'cand', grp: 'To do', t: 'Candidates waiting', on: n => g(n) && !!(c && c.waiting && c.waiting(n.id))},
      {k: 'draft', grp: 'To do', t: 'Draft', on: n => g(n) && dr.has(n.id)}
    );
    return out;
  }
  const API = {ctLeaves, ctKeyOf, ctWormsOf, ctFilters};
  if (inNode) module.exports = API;
  else Object.assign(root, API);
})(this);

// ---- The admin view (browser only: admin.js state and helpers) ----
// The two trees, built once per data.json and names.json: the Key (ctKeyOf) and WoRMS (ctWormsOf, its problems with the
// tree's: a genus with no WoRMS record in names.json, reported in the bar).
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
// down). A group or a family: its children's cards, each as its tree row. A genus: its genus page stays where its tools
// are (Photos › Genera › Live, its address unchanged: genusHref); its Tree page shows its cover and why, what it needs and
// its featured photos per view, each opening that page. Nothing is chosen on a Tree page: a cover is a genus's
// (curation.json genera[<genus>].cover, ★ on its genus page); above the genera no cover is shown, the default rule of the
// fish (Q339 b: most seen near the centre) needing observers per genus the coral data does not hold.
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
    FL = ctFilters(DATA, {pairs: classicPairs(), needs, waiting: m => pending(m).length, draft: changed()}),
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
      .join('')}</span>${tagSel}`,
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
  let bar, body;
  if (!n.genus) {
    bar = `${crumbs}<b class="adm-sname">${ttName(n)}<small>${ttRank(n)}${R.gn(sel)} · ${R.ph(sel)}</small></b><select class="adm-gsel2" aria-label="Genus">${opts}</select>${imrSeg}${kidSel}${probs}`;
    body = `<div class="adm-tcards">${kids.map(x => `<a class="adm-tcard" href="${esc(tvHref(x))}" data-ttc="${esc(x)}">${R.row(TV.node.get(x))}</a>`).join('')}</div>`;
  } else {
    const m = sel,
      g = DATA.gen[m],
      c = coverOf(m),
      e = entry(m),
      nd = needs(m),
      nc = pending(m).length,
      why = c ? (c.picked ? 'Your ★ cover' : 'Default: no ★ cover picked (the genus page’s automatic one)') : 'No photo on the site';
    bar = `${crumbs}${c ? `<a class="adm-sthumb${c.picked ? ' mine' : ''}" href="${esc(genusHref(m))}" title="Cover"><img src="${img(c, 1)}" alt="${esc(m)} cover"></a>` : ''}<b class="adm-sname"><i>${esc(m)}</i><small>${ttRank(n)}${g.n ? 'No. ' + g.n : g.x ? 'not IMR' : '★'} · ${R.ph(m)}${nc ? ` · ${nc} candidate${nc === 1 ? '' : 's'}` : ''}</small></b><select class="adm-gsel2" aria-label="Genus">${opts}</select>${imrSeg}<a class="chip adm-ctopen" href="${esc(genusHref(m))}">Genus page</a>${e.ok ? `<b class="adm-ctok${nd.length ? ' warnc' : ''}">${nd.length ? '! Validated, incomplete' : '✓ Validated'}</b>` : ''}${nd.length ? `<b class="warnc adm-needs">${nd.map(esc).join(' · ')}</b>` : ''}${probs}<small class="adm-cvwhy">${esc(why)}</small>`;
    body = rows(m)
      .map(([v]) => {
        const r = rowOf(m, v),
          all = r.feat.length + r.rest.length;
        return `<section class="adm-row adm-ctview" data-ctv="${esc(v)}"><h3>${label(m, v)} <small>${all} photo${all === 1 ? '' : 's'} · ${r.feat.length}/${FEAT} featured</small></h3><div class="adm-ctfeat">${r.feat
          .map(p => `<a href="${esc(genusHref(m))}" title="${esc(label(m, v))}"><img src="${img(p, 1)}" alt="" loading="lazy"></a>`)
          .join('')}</div>${r.feat.length ? '' : '<p class="note">No featured photo.</p>'}</section>`;
      })
      .join('');
  }
  $v.innerHTML = `<div class="adm adm-treep">${side}<section class="adm-main"><div class="adm-filter adm-sticky">${bar}</div>${body}</section></div>`;
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
  fuTreeMount(TV, sel, R.row, vis, hadF, top);
}
