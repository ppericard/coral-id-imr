// Photos › Photo review › Cover proposals on the fish side (#fish/photos/review/cover-proposals; Pierre, 2026-11-14 on
// his node covers after Q339 (b), #864: "mon choix était le meilleur au moment avec ce que j'avais sous les yeux. Si tu
// as mieux fait moi des propositions"). His ★ Cover of a family or a genus (curation.json fish genera {node id: {cover}})
// is never replaced by the default cover rule (autosort.js fishCoverRule: the node's species with a reference photo most
// seen around the instance's centre, then his ★ cover of that species, else its easiest reference photo); where the two
// differ, this view proposes the rule's photo beside his, a proposal only (rule A1). Each: Accept (the rule's photo as his
// cover in the draft, autosort.js fishPick: one Undo step) or Keep mine (curation.json fish.kept {node id: 'cover:<his
// photo>><the rule's photo>'}: that pair answered, never shown again; a later pick of the rule or a cover of his own
// another day makes a new pair, which may come back); Accept all in one Undo step behind a confirm (rule A2: bulk). A
// proposal is live, from the draft: it is done once answered, once his cover changed, or once the rule agrees. A node
// with no cover of his, or one out of play or on a juvenile (the default already applies there), has none. His Publish
// sends it all. The view is in the switch only while a proposal is open (admin.js TABS: its `live` option, hasPage).
//
// The pure part (coverProposal, coverOpen, coverAccept, coverKeep, coverKeptN, coverWhy; nodeCover and nodeCoverWhy, the
// Tree's node pages' cover and its why) runs in Node too: tests/fishcoverprop.test.js.
(function (root) {
  const node = typeof module !== 'undefined' && module.exports,
    A = node ? require('./autosort.js') : root,
    {fishPid} = node ? require('./core.js') : root;
  // What a Keep mine records in fish.kept under the node's id (the light re-judge's answers sit there under a photo's).
  const COVER_KEPT = 'cover:';
  const coverKey = x => `${COVER_KEPT}${fishPid(x.his.f)}>${fishPid(x.rule.f)}`;
  // The proposal for node id, its photos in play L (the Tree page's: autosort.js fishCoverOf's), in the fish draft F: his
  // cover while in force (in L, not a juvenile) beside the rule's pick, when they are not the same photo (fishPid); else
  // null. {id, his: photo, hisLeaf, rule: photo, leaf: the rule's leaf, seen: [observers, observations] of that leaf
  // around the centre, ref, mine: as fishCoverRule}. seen(leaf id) as fishCoverRule's (default: the registered records).
  function coverProposal(id, L, F, j = () => null, seen) {
    F = F || {};
    const k = ((F.genera || {})[id] || {}).cover;
    if (!k || !(L || []).length) return null;
    const his = A.fishCoverOf(L, F, id, j, seen);
    if (!his || his.f !== k) return null;
    const r = A.fishCoverRule(L, F, id, j, seen);
    if (!r || fishPid(r.p.f) === fishPid(his.f)) return null;
    const leaf = p => (F.add || {})[p.f] || p.sp || p.sid;
    return {id, his, hisLeaf: leaf(his), rule: r.p, leaf: r.leaf, seen: r.seen, ref: r.ref, mine: r.mine};
  }
  // The proposals still open in the fish draft F: not answered Keep mine for this very pair.
  const coverOpen = (X, F) => (X || []).filter(x => x && ((F || {}).kept || {})[x.id] !== coverKey(x));
  // Accept: the rule's photo as his cover of the node (set, never toggled off as ★ Cover's second click would).
  const coverAccept = (F, x) =>
    A.fishPick(F || {}, x.id, k => {
      k.cover = x.rule.f;
    });
  // Keep mine: his cover stays; the pair is recorded as answered (curation.json fish.kept).
  const coverKeep = (F, x) => {
    F = F || {};
    return {...F, kept: {...(F.kept || {}), [x.id]: coverKey(x)}};
  };
  // What Publish sends of the answers: the Keep mine of a cover proposal new or changed since the published file S.
  const coverKeptN = (D, S) =>
    Object.entries((D || {}).kept || {}).filter(([n, v]) => String(v).startsWith(COVER_KEPT) && ((S || {}).kept || {})[n] !== v).length;
  // Why the rule picks its photo, in a line: its species' observers around the centre (named: fish.json centre), whether
  // the species competed without a reference photo, and when the photo is his ★ cover of that species.
  function coverWhy(x, centre) {
    const c = centre || 'the centre',
      n = (x.seen || [0, 0])[0];
    return [
      n ? `Most seen near ${c}: ${n} observer${n === 1 ? '' : 's'}` : `None seen near ${c}: the easiest`,
      x.ref ? '' : 'no reference photo',
      x.mine ? 'your ★ species cover' : ''
    ]
      .filter(Boolean)
      .join(' · ');
  }
  // A node page's cover (Photos › Tree, admin.js renderFishUnits): the photo in force on node id among its photos in play
  // L, in its page's order, and how it was chosen. by: 'mine' (his ★ pick, in play, not a juvenile), 'rule' (a node with
  // leaves under it: the default cover rule, fishCoverRule, its result in rule) or 'first' (a leaf: its first adult photo,
  // fishLeafCover); juv: his pick is a juvenile (ignored), gone: his pick is not among L (out of play). leaf: id is a leaf
  // of its tree. seen(leaf id) as fishCoverRule's.
  function nodeCover(id, L, F, j = () => null, leaf = false, seen) {
    F = F || {};
    L = L || [];
    const k = ((F.genera || {})[id] || {}).cover,
      q = k && L.find(p => p.f === k),
      juv = !!q && A.fishJuv(q, j(q.f), F),
      gone = !!k && !q,
      p = leaf ? A.fishLeafCover(L, F, id, j) : A.fishCoverOf(L, F, id, j, seen),
      by = !p ? '' : q && p.f === k && !juv ? 'mine' : leaf ? 'first' : 'rule';
    return {p: p || null, by, rule: by === 'rule' ? A.fishCoverRule(L, F, id, j, seen) : null, juv, gone};
  }
  // Why that photo, in a line (the page's bar): his ★, else the default and its reason (coverWhy for the rule's, with the
  // centre's name), with his pick ignored or out of play said.
  function nodeCoverWhy(c, centre) {
    if (!c || !c.p) return 'No photo in play';
    const why =
      c.by === 'mine'
        ? 'Your ★ cover'
        : c.by === 'rule'
          ? `Default: ${coverWhy(c.rule || {}, centre)}`
          : 'Default: its first photo (featured, then the easiest)';
    return [why, c.juv ? 'your ★ is a juvenile: ignored' : '', c.gone ? 'your ★ is out of play' : ''].filter(Boolean).join(' · ');
  }
  const API = {COVER_KEPT, coverKey, coverProposal, coverOpen, coverAccept, coverKeep, coverKeptN, coverWhy, nodeCover, nodeCoverWhy};
  if (node) module.exports = API;
  else Object.assign(root, API);
})(this);

// ---- The admin view (browser only: admin.js state and helpers) ----
const COVER_PAGE = 'photos/review/cover-proposals';
let COVER_P = null;
// Every proposal of the draft, family then genus nodes in the Tree page's order (FISHC.units), each on the photos its node
// page chooses from (admin.js fuNodePhotos: a family's species in play; a genus's, its species in play there); once per draft
// (cached on fuDataM's record, which a click on the draft, Publish or the game list renews).
function coverList() {
  const M = fuDataM();
  if (M.cov) return M.cov;
  const out = [],
    T = fuTreeOf(FISHC.units),
    G = M.D.F.genera || {},
    mine = id => !!(G[id] || {}).cover;
  FISHC.units.forEach(u => {
    // only a node with a cover of his can have a proposal: the other families' pages are not built
    if (!mine(u.id) && !u.genera.some(g => mine(g.id))) return;
    const e = fuFamM(u),
      add = (x, name, rank) => x && out.push({...x, name, rank});
    add(coverProposal(u.id, e.all, M.D.F, fuJ), u.name, 0);
    u.genera.forEach(g => add(coverProposal(g.id, fuNodePhotos(T, u, e, g.id), M.D.F, fuJ), g.name, 1));
  });
  return (M.cov = out);
}
// The family pages' data, read once, on the first look at a fish page's switch (coverLive) or at the view.
function coverLoad() {
  if (FISHC && FISHC.plays) return Promise.resolve();
  return (COVER_P =
    COVER_P ||
    fishLoad(true).then(() => {
      status();
      if (cur === COVER_PAGE) render();
    }));
}
// The view's `live` option (admin.js TABS): in the switch while a proposal is open; false until the data is read. Kept
// per draft (COVER_N): on another page it is worked out once the click is drawn (some 100 ms on the real data), then the
// switch drawn again if it changed; on the view itself, at once (renderCovers).
let COVER_N = {key: null, on: false, t: 0};
const coverKeyNow = () => [DRAFT.fish, SAVED, FISHC.plays];
function coverNow() {
  const O = coverOpen(coverList(), DRAFT.fish);
  COVER_N = {key: coverKeyNow(), on: O.length > 0, t: 0};
  return O;
}
const coverLive = () => {
  coverLoad();
  if (!(DRAFT && FISHC && FISHC.plays)) return false;
  const k = coverKeyNow();
  if (!(COVER_N.key && k.every((x, i) => x === COVER_N.key[i])) && !COVER_N.t)
    COVER_N.t = setTimeout(() => {
      const was = COVER_N.on;
      COVER_N.t = 0;
      coverNow();
      if (COVER_N.on !== was) status();
    }, 0);
  return COVER_N.on;
};
// Publish's summary line (admin.js pubSummary): the covers accepted are counted with the covers, rank by rank.
const coverSummary = () => [
  [coverKeptN(DRAFT.fish, SAVED.fish), 'fish cover proposal kept as it was', 'fish cover proposals kept as they were']
];
function renderCovers() {
  if (!FISHC || !FISHC.plays) {
    status();
    $v.innerHTML = '<p class="note">Loading…</p>';
    coverLoad();
    return;
  }
  clearTimeout(COVER_N.t);
  const O = coverNow(),
    sp = FISHC.species,
    RK = fuRanks(),
    centre = (FISHC.centre || {}).name;
  status();
  if (!O.length) {
    $v.innerHTML = '<p class="note">No cover proposal left.</p>';
    return;
  }
  const spName = sid => (sp[sid] || {}).name || sid || '';
  const side = (x, i) => {
    const p = i ? x.rule : x.his,
      sid = i ? x.leaf : x.hisLeaf;
    return `<div class="adm-cside"><button type="button" class="adm-ph" data-cpz="${i}" aria-label="Enlarge">${p.src ? `<img ${crSrc(fuP(p), 1)} alt="" loading="lazy" draggable="false">` : ''}</button>
      <span class="adm-t">${i ? 'Rule' : 'Yours'} <i>${esc(spName(sid))}</i></span>${i ? `<small class="adm-cwhy">${esc(coverWhy(x, centre))}</small>` : ''}</div>`;
  };
  const tile = x =>
    `<figure class="adm-tile adm-cprop" data-n="${esc(x.id)}"><figcaption><b>${esc(x.name)}</b></figcaption><div class="adm-cpair">${side(x, 0)}${side(x, 1)}</div>
      <div class="adm-acts"><span class="adm-qseg adm-lvseg" role="group" aria-label="Proposal"><button type="button" data-cpa>Accept</button><button type="button" data-cpk>Keep mine</button></span></div></figure>`;
  $v.innerHTML = `<div class="adm-filter adm-sticky"><button type="button" class="adm-fok" data-cpall>Accept all ${O.length}</button></div>${[
    0, 1
  ]
    .map(r => {
      const R = O.filter(x => x.rank === r);
      return R.length
        ? `<section class="adm-row"><h3>${esc(cap1(RK[r] || ''))} <small>${R.length}</small></h3><div class="adm-grid adm-cgrid">${R.map(tile).join('')}</div></section>`
        : '';
    })
    .join('')}`;
  const fx = fn => {
    const y = window.scrollY;
    DRAFT.fish = fn(DRAFT.fish || {});
    saveDraft();
    render();
    window.scrollTo(0, y);
  };
  $v.querySelector('[data-cpall]').onclick = () => {
    if (!confirm(`Accept all ${O.length} cover proposals into your draft? Undo steps back.`)) return;
    fx(F => O.reduce(coverAccept, F));
  };
  $v.querySelectorAll('.adm-cprop[data-n]').forEach(tl => {
    const x = O.find(y => y.id === tl.dataset.n);
    tl.querySelector('[data-cpa]').onclick = () => fx(F => coverAccept(F, x));
    tl.querySelector('[data-cpk]').onclick = () => fx(F => coverKeep(F, x));
    tl.querySelectorAll('[data-cpz]').forEach(b => {
      b.onclick = () => {
        const L = [
          {...x.his, sid: x.hisLeaf},
          {...x.rule, sid: x.leaf}
        ];
        zoomSet(L.map(fuP), +b.dataset.cpz, q => lbCap(`${x.name}: ${fuName(q.sid)}`, q, (sp[q.sid] || {}).common || ''));
      };
    });
  });
}
