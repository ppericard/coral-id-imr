// The fish admin pages (admin plan, docs/ROADMAP.md "Admin for every subject"; Pierre, 2026-11-04). Loaded after
// admin.js, whose state and helpers it uses (DRAFT, saveDraft, render, toast, esc, img, srcTag, fishLoad, FISHC...), as
// admin-journey.js does. Admin only: players never download it.
//
// PR 5a, the fish Candidates swiper (#fish/photos/candidates): the candidates of fish-cand.json one at a time, as the coral swiper,
// with what the fish curation needs: the thinnest species first, stopping at each species' target, the pass's judgment
// (suggest.json "fish", the judging/FISH.md rubric) and the fish auto-sort's Checks shown blind, the species' photos in
// play beside the card (most of them the auto-sort's proposals, which Pierre can take out of play), the fish auto-sort's
// agreement and decisions (each undoable) below it. Every click goes into DRAFT.fish (autosort.js fishAdd, fishReject,
// fishExclude: pure, tested in tests/fishcand.test.js), one Undo step each, sent by Publish.
//
// PR 5b, on the same card: the rubric's tags as rows (ease always, the phase for an entry whose phases differ, the seven
// tags and the juvenile and camouflage flags behind Tags), the crop, and Not this → another species or none (Pierre's
// click only, curation.json fish out: autosort.js fishNotThis), the missing phases first (fishQueue nph). His values are
// pressed; the pass's show dashed until he confirms or changes them (never on a Check: blind).

let FQ = store.get('reefid-admin-fq', 'all') === 'chk' ? 'chk' : 'all', // the queue shown: every candidate, or the Checks only
  FTAGS_OPEN = store.get('reefid-admin-ftags', false) === true, // the tag rows unfolded (this browser)
  FFULL = false, // this tab: also show the candidates of species at their target
  FASIDE = false; // this tab: also show the ones the pass is sure go, not applied (the fish auto-sort's keep off)
const FSKIP = new Set();
// The species records the default covers read their presence around the instance's centre from (autosort.js
// fishCoverOf, fishSeenFrom; Pierre, 2026-11-13, Q339 (b)): fish.json's, once admin.js fishLoad has them (FISHC).
fishSeenFrom(sid => (FISHC && FISHC.species && FISHC.species[sid]) || null);
// The card Pierre is setting rows or a crop on stays on screen (his values move it in the order: a phase he clears is no
// longer a missing one) until he decides it, skips it or sends it elsewhere (Not this); every other render, an Undo
// included, shows the queue's first.
let FPIN = null;

// The rubric's code in words (judging/FISH.md "Tags"): the seven tags, then the flags. The values a beginner's photo
// should have (whole, good light, no colour loss, sharp, one fish) are left out: only what makes a photo harder shows.
const FTAGS = [
  {p: 'profile', o: 'oblique', h: 'head-on', t: 'tail view', d: 'from above'},
  {0: 'partial'},
  {d: 'dim light', n: 'night livery'},
  {1: 'slight colour loss', 2: 'strong colour loss', 3: 'monochrome'},
  {m: 'soft', b: 'blurred'},
  {l: 'large', m: 'medium', s: 'small'},
  {
    s: 'several of its kind',
    o: 'other species in view, no confusion',
    k: 'other species in view, confusable',
    m: 'other species in view, not sorted',
    x: 'subject not obvious'
  }
];
const FFLAGS = {j: 'juvenile', c: 'camouflage', a: 'out of water', p: 'phase entry', r: 'reference photo'};
const fishTagText = jt =>
  !jt ? '' : [...FTAGS.map((m, i) => m[jt[i]]), ...[...jt.slice(7)].map(c => FFLAGS[c])].filter(Boolean).map(esc).join(' · ');
// The rows Pierre sets (judging/FISH.md "Tags"): [position in the code, name, [[value, label]...]]; the flags he may
// type (the tool adds p and r itself); the IMR phase words (judging/FISH.md "phase"), '' = none (an adult, or a
// juvenile, which is the j flag).
const FROWS = [
  [
    0,
    'View',
    [
      ['p', 'Profile'],
      ['o', 'Oblique'],
      ['h', 'Head-on'],
      ['t', 'Tail'],
      ['d', 'Above']
    ]
  ],
  [
    1,
    'Whole',
    [
      ['1', 'Whole'],
      ['0', 'Partial']
    ]
  ],
  [
    2,
    'Light',
    [
      ['g', 'Good light'],
      ['d', 'Dim'],
      ['n', 'Night']
    ]
  ],
  [
    3,
    'Colour loss',
    [
      ['0', 'No loss'],
      ['1', 'Slight'],
      ['2', 'Strong'],
      ['3', 'Mono']
    ]
  ],
  [
    4,
    'Clarity',
    [
      ['s', 'Sharp'],
      ['m', 'Soft'],
      ['b', 'Blurred']
    ]
  ],
  [
    5,
    'Size',
    [
      ['l', 'Large'],
      ['m', 'Medium'],
      ['s', 'Small']
    ]
  ],
  [
    6,
    'Count',
    [
      // Pierre, 2026-11-09: "Others" did not say the problem is several species on one photo; the codes stay (judging/FISH.md).
      // Other species split in two (Pierre, 2026-11-09, Q323): o in play, k out of play (rule P3); the legacy m (before the
      // split, not sorted yet: as k) is read, never offered.
      ['1', 'One fish', 'One fish (others, if any, tiny and far)'],
      ['s', 'Same species', 'Several fish of the same species, the subject obvious (a pair, a school)'],
      ['o', 'Other species, no risk', "Other species in view, none could be taken for the subject at the game's level (stays in play)"],
      [
        'k',
        'Other species, confusable',
        'Other species in view, one could be taken for the subject (on a photo in play: out of play, rule P3)'
      ],
      ['x', 'Unclear', 'Unclear: which fish is asked about is not obvious (on a photo in play: out of play)']
    ]
  ]
];
const FFLAGS_MINE = [
  ['j', 'Juvenile'],
  ['c', 'Camouflage']
];
const FPHASE_ROW = [
  ['', 'No phase'],
  ['subadult', 'Subadult'],
  ['intermediate', 'Intermediate'],
  ['terminal', 'Terminal'],
  ['female', 'Female'],
  ['male', 'Male']
];
// One segmented row: the value in force pressed; dashed (auto) while it is the pass's, not Pierre's. An option may carry
// its tooltip ([value, label, title]).
const fRow = (name, at, opts, v, auto) =>
  `<span class="adm-qseg adm-ftag${auto ? ' auto' : ''}" role="group" aria-label="${esc(name)}" title="${esc(name)}">${opts
    .map(
      ([k, t, tip]) =>
        `<button type="button" ${at}="${esc(k)}" aria-pressed="${v === k}"${tip ? ` title="${esc(tip)}"` : ''}>${esc(t)}</button>`
    )
    .join('')}</span>`;
// Pierre's values on a photo (the draft's fish part) and the pass's (j), for the rows: {mine, pass} per field.
const fVals = (F, f, j) => ({
  tags: {mine: (F.tags || {})[f], pass: j && j.jt},
  ease: {mine: (F.ease || {})[f], pass: j && j.e},
  phase: {mine: f in (F.phase || {}) ? F.phase[f] : undefined, pass: (j && j.ph) || ''}
});
// The rows of a card. blind (a Check): only Pierre's own values pressed, nothing of the pass shown. open: the seven tag
// rows and the flags shown too (the card's Tags; a photo tile's own, admin.js fishTile).
function fishRows(F, p, j, blind, entry, open = FTAGS_OPEN) {
  const V = fVals(F, p.f, blind ? null : j),
    code = V.tags.mine || V.tags.pass || '',
    tAuto = !V.tags.mine,
    ease = V.ease.mine != null ? V.ease.mine : V.ease.pass,
    ph = V.phase.mine !== undefined ? V.phase.mine : blind ? undefined : V.phase.pass;
  let h = fRow(
    'Ease',
    'data-fe',
    [5, 4, 3, 2, 1].map(e => [String(e), `${e}${e === 5 ? ' easy' : e === 1 ? ' hard' : ''}`]),
    ease != null ? String(ease) : null,
    V.ease.mine == null
  );
  // The phase row only for an entry whose phases differ (fish.json teach phase lines: Angelfish, Spadefish, Parrotfish,
  // Sweetlips, Anthias): elsewhere a phase tag has nothing to say.
  if (entry && ((entry.phase || []).length || entry.dimorph))
    h += fRow('Phase', 'data-fph', FPHASE_ROW, ph === undefined ? null : ph, V.phase.mine === undefined);
  if (open)
    h +=
      `<div class="adm-ftags">` +
      FROWS.map(([i, name, opts]) => fRow(name, `data-ft="${i}" data-fv`, opts, code ? code[i] : null, tAuto)).join('') +
      `<span class="adm-qseg adm-ftag adm-fflags${tAuto ? ' auto' : ''}" role="group" aria-label="Flags">${FFLAGS_MINE.map(
        ([k, t]) => `<button type="button" data-ff2="${k}" aria-pressed="${code.slice(7).includes(k)}">${t}</button>`
      ).join('')}</span></div>`;
  return h;
}
// Not this (5b; Pierre's only): the photo goes to another species of its entry first, then any game species, or none.
// A photo moved before can go back to its first species.
function fishNotThisSel(sid, from) {
  const E = FISHC.entry[sid],
    nm = id => (FISHC.species[id] || {}).name || id,
    same = ((E && E.species) || []).filter(id => id !== sid && FISHC.game.has(id)),
    rest = [...FISHC.game].filter(id => id !== sid && !same.includes(id)).sort((a, b) => (nm(a) < nm(b) ? -1 : 1));
  return `<select data-fnot aria-label="Not this species"><option value="">Not this</option>${from ? `<option value="${esc(from)}">Back to ${esc(nm(from))}</option>` : ''}<option value="x">No game species</option>${same.length ? `<optgroup label="${esc(E.name)}">${same.map(id => `<option value="${esc(id)}">${esc(nm(id))}</option>`).join('')}</optgroup>` : ''}<optgroup label="Another species">${rest.map(id => `<option value="${esc(id)}">${esc(nm(id))}</option>`).join('')}</optgroup></select>`;
}
// The rows' clicks in scope S on photo f (the card's, a photo tile's): each one Pierre's value through edit(fn, what), one
// Undo step (autosort.js fishSet, fishTag: through fishOwn); base(): the code a tag changes (his, else the pass's). what:
// {pos, v} of a tag row (pos 0-6), so a tile can act on the count it sets (admin.js bindFishTiles).
function bindFishRows(S, f, base, edit) {
  S.querySelectorAll('[data-fe]').forEach(b => (b.onclick = () => edit(G => fishSet(G, f, 'ease', +b.dataset.fe))));
  S.querySelectorAll('[data-fph]').forEach(b => (b.onclick = () => edit(G => fishSet(G, f, 'phase', b.dataset.fph))));
  S.querySelectorAll('[data-ft]').forEach(
    b =>
      (b.onclick = () =>
        edit(G => fishSet(G, f, 'tags', fishTag(base(), +b.dataset.ft, b.dataset.fv)), {pos: +b.dataset.ft, v: b.dataset.fv}))
  );
  S.querySelectorAll('[data-ff2]').forEach(b => (b.onclick = () => edit(G => fishSet(G, f, 'tags', fishTag(base(), b.dataset.ff2)))));
}
// The crop editor of the corals (admin.js cropEditor) on a fish photo: Pierre's crop, else start (the pass's suggestion, or
// a photo's published crop); Full photo over a suggested crop (sug) is kept as an explicit no-crop. His rotation (fish
// rot) with it, one Undo step for both, through edit(fn).
const fishCrop = (p, start, sug, edit) =>
  cropEditor(p, {
    start: ((DRAFT.fish || {}).crop || {})[p.f] || start || null,
    rot: fishRot(p.f),
    save: (v, full, ro) =>
      edit(G => fishSet(fishSet(G, p.f, 'crop', full ? (sug ? [0, 0, 1, 1] : null) : v), p.f, 'rot', rotNorm(ro) || null))
  });
const FKEEP = {best: 'best photo of its observation', alt: 'another angle of its observation', dup: 'near-duplicate'};
// The pass's judgment above the card (never on a Check: blind), its ease as a chip (the prior the game starts from).
const fishJudged = j =>
  !j
    ? '<p class="adm-judge">Not judged yet</p>'
    : `<p class="adm-judge${j.k === 'dup' ? ' warn' : ''}" title="Suggestion of the judging pass (suggest.json)">${j.e ? `<span class="adm-chip adm-fease" title="Ease 1-5 (5 very easy): the photo's difficulty prior">ease ${j.e}</span> ` : ''}${[FKEEP[j.k] || '', fishTagText(j.jt), j.ph ? esc(j.ph) : '', j.u && j.u.length ? `unsure: ${esc(j.u.join(', '))}` : '', j.n ? esc(j.n) : '', j.c ? 'crop suggested' : ''].filter(Boolean).join(' · ')}</p>`;
// A fish photo with its crop: Pierre's (draft), else, outside a Check, the pass's, or for a record with no judgment (a
// photo fishGameIn put in play from fish-game.json: a sure candidate, a reference photo) its published crop (cr, the one
// tools/fish_game.py baked in: review #793, it showed uncropped); and his rotation (fish rot). Through admin.js crSrc, as
// the family pages (fuP): a candidate (remote) gets both drawn on its original; a photo in play from fish-game.json, whose
// R2 file has its published crop and rotation baked in (cr, ro), is shown as it is while the draft keeps them, else from
// its original with the draft's (Codex review #793: drawn over the baked file, a published 90° showed as 180°).
const fishRot = f => rotNorm(((DRAFT.fish || {}).rot || {})[f]);
const fishSrc = (p, s, blind) =>
  crSrc({...p, j: {c: ((DRAFT.fish || {}).crop || {})[p.f] || (!blind && (p.j ? p.j.c : p.cr)) || null, ro: fishRot(p.f)}}, s);
// Where a fish photo comes from: Pierre's own, FishBase, or iNaturalist near Dauin, in the Philippines, elsewhere in the
// Indo-West Pacific (the coral origins' colours, admin.js ORIGINS), then its rights class (admin.js rightsTag).
const fishSrcTag = p => {
  const o = origin(p);
  return `<span class="adm-src o-${o}">${p.via === 'fishbase' && !p.own ? 'FishBase' : ORIGINS.find(x => x[0] === o)[1]}</span>${rightsTag(p)}`;
};
const fishName = sid => {
  const s = FISHC.species[sid] || {},
    t = FISHC.entry[sid];
  return {sci: s.name || sid, sub: [s.common, t && t.name].filter(Boolean).join(' · ')};
};
// The photos of a species in play (Pierre's keep holds the add, never other species one could take for the subject: core.js
// fishOther, Q323), its own candidates first, then any other photo added to it.
const fishInPlay = (F, sid) => {
  const L = Object.entries(F.add || {})
      .filter(([f, s]) => s === sid && fishOn(F, f, sid) && !fishOther((F.tags || {})[f], ((SUG.fish || {})[f] || {}).jt))
      .map(([f]) => (FISHC.byF[f] && {...FISHC.byF[f], j: (SUG.fish || {})[f]}) || {f}),
    seen = new Set(L.map(p => fishPid(p.f)));
  // And the photos the game plays whatever their route (the sure candidates, the reference photos), once each.
  fishGameIn(FISHC.plays, {...DRAFT, fish: F}).forEach(p => p.sp === sid && !seen.has(fishPid(p.f)) && seen.add(fishPid(p.f)) && L.push(p));
  return L;
};
// One photo enlarged: species, observer, the iNaturalist observation; a photo in play has "Out of play" (Pierre's ✕
// Reject on it: off the species, a correction when the auto-sort had proposed it). A photo leaving play here or on the card
// (Reject, ×, Not this) leaves the covers and featured photos it was too (autosort.js fishDrop), as on Families.
function fishZoom(p, sid, inPlay, blind) {
  const lb = $('lightbox'),
    n = fishName(sid),
    close = () => {
      lb.hidden = true;
      lb.classList.remove('full');
      lb.innerHTML = '';
      document.removeEventListener('keydown', key);
    },
    key = e => {
      if (e.key === 'Escape') close();
    };
  lb.innerHTML = `<div class="lb-in"><img ${fishSrc(p, 0, blind)} alt=""><p class="lb-cap"><i>${esc(n.sci)}</i>${n.sub ? ` · ${esc(n.sub)}` : ''} · ${esc(p.a || '')}${/^https?:/.test(p.o || '') ? ` · <a class="lb-src" href="${esc(p.o)}" target="_blank" rel="noopener">${p.via === 'fishbase' ? 'FishBase' : 'iNat observation'} ↗</a>` : ''} · <code>${esc(p.f)}</code></p><div class="lb-nav">${inPlay ? '<button type="button" data-fout>Out of play</button>' : ''}<button type="button" data-x>Close</button></div></div>`;
  lb.querySelector('[data-x]').onclick = close;
  const o = lb.querySelector('[data-fout]');
  if (o)
    o.onclick = () => {
      close();
      fishEdit(F => fishReject(fishDrop(F, fishFamOf(sid), p.f), p.f));
      toast(`Out of play: ${n.sci}. Undo (Ctrl+Z) brings it back.`);
    };
  lbFull(lb);
  lb.hidden = false;
  lb.onclick = e => {
    if (e.target === lb) close();
  };
  document.addEventListener('keydown', key);
}
// One click on the fish part of the draft: one Undo step.
function fishEdit(fn) {
  DRAFT.fish = fn(DRAFT.fish || {});
  saveDraft();
  render();
}
// The fish auto-sort's line (above the card, folded behind the Auto chip as the corals': admin.js autoChip; chip: the
// chip alone) and its details (below it): its decisions in and set aside, the Checks waiting, its keep agreement with
// Pierre (autosort.js fishCompare, autoState: off under 90% over the last 40), and in the details the disagreements and
// every decision still standing, each with Undo (fishAutoUndo; rule A1).
function fishAutoBlock(det, chip) {
  const F = DRAFT.fish || {},
    I = Object.entries(fishIdx(F)),
    FA = I.filter(([, x]) => !x.d.check && !x.d.undone),
    nIn = FA.filter(([, x]) => x.d.kind === 'a').length,
    nChk = I.filter(([f, x]) => x.d.check && !fishMine(F, f)).length,
    CMP = fishCompare(F),
    K = autoState(CMP).keep;
  if (!I.length) return '';
  if (chip) return autoChip(!K.on);
  if (!det)
    return !AOPEN
      ? ''
      : `<div class="adm-auto"><p class="note"><b>Auto</b> ${nIn} in · ${FA.length - nIn} set aside · ${nChk} to check · agreement <span class="adm-af${K.on ? '' : ' off'}" title="Keep: agreement with you over the last ${K.n} checks and corrections; auto ${K.on ? 'on' : 'off'} under ${pctR(K.min)}">Keep ${pctR(K.rate)}${K.n ? `<small>n ${K.n}</small>` : ''}${K.on ? '' : ' · off'}</span> <button type="button" class="adm-link" data-adet aria-expanded="${ADET}">${ADET ? 'Hide' : 'Details'}</button></p></div>`;
  if (!ADET || !AOPEN) return ''; // the details go with the line they open from
  // data-ff: a decision (with Undo); data-fd: a disagreement.
  const tile = (f, cap, extra = '', at = 'ff') => {
    const p = FISHC.byF[f] || {f};
    return `<figure class="adm-repl-tile adm-atile" data-${at}="${esc(f)}">${p.src ? `<button type="button" class="adm-aph" data-fzoom aria-label="Enlarge"><img src="${esc(img(p, 1))}" alt="" loading="lazy"></button>` : ''}<figcaption><i>${esc((FISHC.species[p.sid] || {}).name || p.t || '')}</i> · ${cap}</figcaption>${extra}</figure>`;
  };
  const KW = {add: 'in', reject: 'out'},
    dis = CMP.filter(c => !c.ok).reverse(),
    dec = [...FA].reverse().sort((a, b) => (a[1].day < b[1].day ? 1 : a[1].day > b[1].day ? -1 : 0));
  return `<div class="adm-autodet">${
    dis.length
      ? `<h3 class="label">Disagreements · ${dis.length}</h3><div class="adm-repl-grid">${dis
          .slice(0, 40)
          .map(c => tile(c.f, `you <b>${KW[c.p]}</b> · auto <b>${KW[c.a]}</b> · ${c.how === 'check' ? 'check' : 'correction'}`, '', 'fd'))
          .join('')}</div>`
      : ''
  }${
    dec.length
      ? `<h3 class="label">Fish auto decisions · ${dec.length}</h3><div class="adm-repl-grid">${(AALL ? dec : dec.slice(0, 30))
          .map(([f, x]) =>
            tile(
              f,
              `${x.d.kind === 'a' ? 'in' : 'set aside'} · ${x.day}`,
              '<button type="button" class="adm-link" data-faundo>Undo</button>'
            )
          )
          .join('')}</div>${dec.length > 30 && !AALL ? `<button type="button" class="adm-link" data-aall>All ${dec.length}</button>` : ''}`
      : ''
  }</div>`;
}
function bindFishAuto(scope) {
  bindAutoChip(scope);
  const t = scope.querySelector('[data-adet]');
  if (t)
    t.onclick = () => {
      ADET = !ADET;
      render();
    };
  scope.querySelectorAll('[data-aall]').forEach(
    al =>
      (al.onclick = () => {
        AALL = true;
        render();
      })
  );
  scope.querySelectorAll('[data-ff], [data-fd]').forEach(el => {
    const f = el.dataset.ff || el.dataset.fd,
      u = el.querySelector('[data-faundo]'),
      z = el.querySelector('[data-fzoom]');
    if (u) u.onclick = () => fishAutoUndo(f);
    if (z) z.onclick = () => FISHC.byF[f] && fishZoom(FISHC.byF[f], FISHC.byF[f].sid, false, true);
  });
}
function renderFishCand() {
  status();
  if (!FISHC || !FISHC.plays) {
    $v.innerHTML = '<p class="note">Loading…</p>';
    fishLoad(true).then(() => cur === 'photos/candidates' && ASUBJ.admin.cur && render());
    return;
  }
  const F = DRAFT.fish || {},
    SF = (SUG && SUG.fish) || {},
    Q0 = fishQueue(FISHC.cand, SF, FISHC.species, F, fishGameIn(FISHC.plays, {...DRAFT, fish: F})),
    chks = Q0.filter(x => x.chk),
    Q1 = FQ === 'chk' ? chks : Q0,
    shown = x => !FSKIP.has(x.p.f) && (FFULL || !x.full) && (FASIDE || !x.aside),
    nFull = Q1.filter(x => x.full).length,
    nAside = Q1.filter(x => x.aside).length,
    nJ = Q0.filter(x => !x.j).length,
    live = Q1.filter(shown),
    c = live.find(x => x.p.f === FPIN) || live[0],
    nx = live.find(x => x !== c);
  const cnt = L => L.filter(shown).length;
  const seg =
    `<span class="adm-qseg adm-csrc" role="group" aria-label="Queue"><button type="button" data-fq="all" aria-pressed="${FQ === 'all'}" title="Every candidate, the thinnest species first">All <b>${cnt(Q0)}</b></button><button type="button" data-fq="chk" aria-pressed="${FQ === 'chk'}" title="The fish auto-sort's Checks, blind">Checks <b>${cnt(chks)}</b></button></span>` +
    candFlags(
      `${
        nFull
          ? `<button type="button" class="adm-chip adm-cfull" data-ffull aria-pressed="${FFULL}" title="${nFull} candidate${nFull === 1 ? '' : 's'} of species at their target (8 observations, 12 for the cheatsheet's): ${FFULL ? 'tap to hide them' : 'tap to show them'}">${nFull} at target</button>`
          : ''
      }${
        nAside
          ? `<button type="button" class="adm-chip adm-caside" data-faside aria-pressed="${FASIDE}" title="${nAside} the pass is sure go (near-duplicate, subject not obvious, out of the water), not applied: ${FASIDE ? 'tap to hide them' : 'tap to show them'}">${nAside} set aside</button>`
          : ''
      }${nJ ? `<span class="adm-chip adm-cjudge" title="Ask your agent for the fish candidate pass (judging/FISH.md)">${nJ} not judged yet</span>` : ''}`,
      fishAutoBlock(false, true)
    ) +
    fishAutoBlock();
  if (!c) {
    const sk = Q1.filter(x => FSKIP.has(x.p.f)).length;
    $v.innerHTML = `<section class="adm-sw adm-swempty">${seg}<p class="note">${sk ? `${sk} skipped.` : 'No candidate left.'}</p>${sk ? '<button type="button" class="adm-btn" data-again>Show the skipped ones</button>' : ''}</section>${fishAutoBlock(true)}`;
  } else {
    const {p, sid, chk, j, from, ph, nph} = c,
      pb = {...p, j: chk ? null : j},
      n = fishName(sid),
      play = fishInPlay(F, sid),
      inObs = new Set(play.map(q => q.o || q.f)).size,
      s = chk ? null : fishSure(j),
      link = /^https?:/.test(p.o || '')
        ? `<a class="adm-swlink" href="${esc(p.o)}" target="_blank" rel="noopener" title="${p.via === 'fishbase' ? 'FishBase' : 'iNaturalist'}">${p.via === 'fishbase' ? 'FishBase' : 'iNat'} ↗</a>`
        : '';
    $v.innerHTML = `<section class="adm-sw adm-fsw${chk ? ' adm-blind' : ''}${FTAGS_OPEN ? ' adm-ftopen' : ''}" data-f="${esc(p.f)}" data-s="${esc(sid)}">${seg}
      <figure class="adm-swcard">
        <button type="button" class="adm-swph" data-zoom aria-label="Enlarge"><img ${fishSrc(pb, 0, chk)} alt=""></button>
        <span class="adm-swg"><i>${esc(n.sci)}</i>${n.sub ? `<small>${esc(n.sub)}</small>` : ''}${from ? `<small>from <i>${esc(fishName(from).sci)}</i></small>` : ''}</span>
        <button type="button" class="adm-swx" data-x title="Exclude" aria-label="Exclude for good">×</button>
        <figcaption>${chk ? '<span class="adm-src adm-chk" title="Check">Check</span>' : ''}${fishSrcTag(p)}${!chk && ph ? `<span class="adm-src${nph ? ' adm-fnew' : ''}" title="${nph ? 'A phase none of its photos in play shows' : 'Its phase'}">${esc(ph)}${nph ? ' · new' : ''}</span>` : ''}${p.st ? `<span class="adm-src" title="iNaturalist / FishBase life stage or sex">${esc(p.st)}</span>` : ''}<span class="adm-t">${esc(p.t || '')}</span>${link}</figcaption>
      </figure>${chk ? '' : fishJudged(j)}
      <div class="adm-fplay" title="Observations in play for this species / its target"><span class="adm-fplayn${inObs >= c.target ? ' full' : ''}">In play <b>${inObs}/${c.target}</b></span>${play
        .map(
          q =>
            `<button type="button" class="adm-fth" data-fp="${esc(q.f)}" aria-label="Enlarge a photo in play">${q.src ? `<img ${fishSrc(q, 1)} alt="" loading="lazy">` : ''}</button>`
        )
        .join('')}</div>
      <div class="adm-acts adm-swacts">${fishRows(F, p, j, chk, FISHC.entry[sid])}<div class="adm-swrow">${fishNotThisSel(sid, from)}<button type="button" class="adm-swcrop${(F.crop || {})[p.f] || fishRot(p.f) ? ' on' : ''}" data-fcrop aria-pressed="${!!((F.crop || {})[p.f] || fishRot(p.f))}">Crop</button><button type="button" data-ftags aria-pressed="${FTAGS_OPEN}">Tags</button><button type="button" data-skip>Skip</button></div></div>
      <div class="adm-swbar"><button type="button" class="rej" data-rej>✕ Reject</button><button type="button" class="add${s && s.keep === 'add' ? ' sug' : ''}" data-add title="${s && s.keep === 'add' ? 'Suggested · ' : ''}Add (1)">+ Add</button></div>
    </section>${fishAutoBlock(true)}`;
    if (nx && nx.p.src) new Image().src = img(nx.p);
    // A remote photo that does not load (its host down, or the photo gone at the source): said on the card, with its link.
    // Only on its own card: a photo of a card already gone (Skip, a click) that fails later says nothing.
    const im = $v.querySelector('.adm-swph img'),
      fc = $v.querySelector('.adm-swcard figcaption');
    if (im && fc)
      im.addEventListener('error', () => {
        if (fc.isConnected && !fc.querySelector('.adm-fbad'))
          fc.insertAdjacentHTML('afterbegin', '<span class="adm-src rej adm-fbad">Photo not loading</span>');
      });
    const S = $v.querySelector('.adm-sw'),
      f = p.f,
      // After his answer to a Check: what the auto-sort had said.
      told = () => {
        if (!chk) return;
        const x = fishIdx(DRAFT.fish)[f];
        if (x)
          toast(
            `Check: the auto-sort said ${x.d.kind === 'a' ? 'in' : 'out'}${(x.d.kind === 'a') === (fishMine(DRAFT.fish, f) === 'add') ? ' (same)' : ' (differs)'}.`
          );
      };
    S.querySelector('[data-add]').onclick = () => {
      FSKIP.delete(f);
      FPIN = null;
      fishEdit(G => fishAdd(G, f, sid, j, p));
      if (!chk) toast(`Added: ${n.sci} (${new Set(fishInPlay(DRAFT.fish, sid).map(q => q.o || q.f)).size}/${c.target}).`);
      told();
    };
    S.querySelector('[data-rej]').onclick = () => {
      FSKIP.delete(f);
      FPIN = null;
      fishEdit(G => fishReject(fishDrop(G, fishFamOf(sid), f), f));
      told();
    };
    S.querySelector('[data-x]').onclick = () => {
      FSKIP.delete(f);
      FPIN = null;
      fishEdit(G => fishExclude(fishDrop(G, fishFamOf(sid), f), f));
      if (!chk) toast('Excluded. Undo (Ctrl+Z) brings it back.');
      told();
    };
    S.querySelector('[data-skip]').onclick = () => {
      FPIN = null;
      FSKIP.add(f);
      render();
    };
    S.querySelector('[data-zoom]').onclick = () => fishZoom(pb, sid, false, chk);
    // The rows (5b): each click Pierre's value, one Undo step (autosort.js fishSet, fishTag: through fishOwn).
    const fishPin = fn => {
      FPIN = f;
      fishEdit(fn);
    };
    bindFishRows(S, f, () => (DRAFT.fish.tags || {})[f] || (!chk && j && j.jt) || '', fishPin);
    S.querySelector('[data-ftags]').onclick = () => {
      FTAGS_OPEN = !FTAGS_OPEN;
      store.set('reefid-admin-ftags', FTAGS_OPEN);
      render();
    };
    // The crop (fishCrop): Pierre's, else the pass's (never on a Check).
    S.querySelector('[data-fcrop]').onclick = () => fishCrop(pb, !chk && j && j.c, ((SUG.fish || {})[f] || {}).c, fishPin);
    S.querySelector('[data-fnot]').onchange = e => {
      const to = e.target.value;
      if (!to) return;
      FSKIP.delete(f);
      FPIN = null;
      fishEdit(G => fishNotThis(fishDrop(G, fishFamOf(sid), f), f, to, from || sid));
      toast(
        to === 'x'
          ? 'Not this: no game species. Undo (Ctrl+Z) brings it back.'
          : to === from
            ? `Back to ${fishName(to).sci}.`
            : `Not this: sent to ${fishName(to).sci} as its candidate.`
      );
      told();
    };
    S.querySelectorAll('[data-fp]').forEach(b => {
      const q = play.find(x => x.f === b.dataset.fp);
      b.onclick = () => q && q.src && fishZoom(q, sid, true);
    });
  }
  $v.querySelectorAll('[data-fq]').forEach(
    b =>
      (b.onclick = () => {
        FQ = b.dataset.fq;
        store.set('reefid-admin-fq', FQ);
        render();
      })
  );
  const ff = $v.querySelector('[data-ffull]');
  if (ff)
    ff.onclick = () => {
      FFULL = !FFULL;
      render();
    };
  const fa = $v.querySelector('[data-faside]');
  if (fa)
    fa.onclick = () => {
      FASIDE = !FASIDE;
      render();
    };
  const ag = $v.querySelector('[data-again]');
  if (ag)
    ag.onclick = () => {
      FSKIP.clear();
      render();
    };
  bindFishAuto($v);
  candKeys();
}
