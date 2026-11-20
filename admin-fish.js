// The fish admin pages (docs/ARCHITECTURE.md "Admin for every subject"). Loaded after admin.js, whose state and helpers
// it uses (DRAFT, saveDraft, render, toast, esc, img, srcTag, fishLoad, FISHC...), as admin-journey.js does. Admin only:
// players never download it.
//
// The tree subjects' Candidates builder (CAND_BUILD.tree, at the end of this file; the swiper itself is admin.js renderCand,
// the same for every subject: #fish/photos/candidates, #seaslug/photos/candidates): the candidates of the subject's
// candidate file one at a time, with what the tree subjects' curation needs: the thinnest species first, stopping at each species' target, the pass's
// judgment (data/suggest.json "fish", the judging/FISH.md rubric) and the fish auto-sort's Checks shown blind, the species'
// photos in play beside the card (most of them the auto-sort's proposals, which the admin can take out of play), the
// auto-sort's agreement and decisions (each undoable) below it. Every click goes into DRAFT[TK] (autosort.js fishAdd,
// fishReject, fishExclude: pure, tested in tests/fishcand.test.js), one Undo step each, sent by Publish.
//
// On the same card: the rubric's tags as rows (ease always, the phase for an entry whose phases differ, the seven tags
// and the juvenile and camouflage flags behind Tags), the crop, and Not this → another species or none (the admin's
// click only, curation.json fish out: autosort.js fishNotThis), the missing phases first (fishQueue nph). His values
// are pressed; the pass's show dashed until he confirms or changes them (never on a Check: blind).

let FQ = store.get('reefid-admin-fq', 'all') === 'chk' ? 'chk' : 'all', // the queue shown: every candidate, or the Checks only
  FTAGS_OPEN = store.get('reefid-admin-ftags', false) === true; // the tag rows unfolded (this browser)
// The species records the default covers read their presence around the instance's centre from (autosort.js
// fishCoverOf, fishSeenFrom): fish.json's, once admin.js fishLoad has them (FISHC).
fishSeenFrom(sid => (FISHC && FISHC.species && FISHC.species[sid]) || null);
// One segmented row: the value in force pressed; dashed (auto) while it is the pass's, not the admin's. An option may carry
// its tooltip ([value, label, title]).
const fRow = (name, at, opts, v, auto) =>
  `<span class="adm-qseg adm-ftag${auto ? ' auto' : ''}" role="group" aria-label="${esc(name)}" title="${esc(name)}">${opts
    .map(
      ([k, t, tip]) =>
        `<button type="button" ${at}="${esc(k)}" aria-pressed="${v === k}"${tip ? ` title="${esc(tip)}"` : ''}>${esc(t)}</button>`
    )
    .join('')}</span>`;
// Pierre's values on a photo (the draft's fish part) and the pass's (j), for the rows: {mine, pass} per field.
// His tags with the pass's watermark flag where they are the auto-sort's copy (autosort.js fishTagsMine).
const fVals = (F, f, j) => ({
  tags: {mine: fishTagsMine(F, f, j && j.jt), pass: j && j.jt},
  ease: {mine: (F.ease || {})[f], pass: j && j.e},
  phase: {mine: f in (F.phase || {}) ? F.phase[f] : undefined, pass: (j && j.ph) || ''}
});
// The rows of a card. blind (a Check): only the admin's own values pressed, nothing of the pass shown. open: the seven tag
// rows and the flags shown too (the card's Tags; a photo tile's own, admin.js fishTile).
function fishRows(F, p, j, blind, entry, open = FTAGS_OPEN) {
  const S = FISHS, // the subject whose rubric the rows are (SUBJECTS admin.tags)
    V = fVals(F, p.f, blind ? null : j),
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
    h += fRow('Phase', 'data-fph', tagList(S, 'phase'), ph === undefined ? null : ph, V.phase.mine === undefined);
  if (open)
    h +=
      `<div class="adm-ftags">` +
      tagRows(S)
        .map(([i, name, opts]) => fRow(name, `data-ft="${i}" data-fv`, opts, code ? code[i] : null, tAuto))
        .join('') +
      `<span class="adm-qseg adm-ftag adm-fflags${tAuto ? ' auto' : ''}" role="group" aria-label="Flags">${tagFlags(S)
        .map(([k, t]) => `<button type="button" data-ff2="${k}" aria-pressed="${code.slice(7).includes(k)}">${t}</button>`)
        .join('')}</span></div>`;
  return h;
}
// Not this (the admin's only): the photo goes to another species of its entry first, then any game species, or none.
// A photo moved before can go back to its first species.
function fishNotThisSel(sid, from) {
  const E = FISHC.entry[sid],
    nm = id => (FISHC.species[id] || {}).name || id,
    same = ((E && E.species) || []).filter(id => id !== sid && FISHC.game.has(id)),
    rest = [...FISHC.game].filter(id => id !== sid && !same.includes(id)).sort((a, b) => (nm(a) < nm(b) ? -1 : 1));
  return `<select data-fnot aria-label="Not this species"><option value="">Not this</option>${from ? `<option value="${esc(from)}">Back to ${esc(nm(from))}</option>` : ''}<option value="x">No game species</option>${same.length ? `<optgroup label="${esc(E.name)}">${same.map(id => `<option value="${esc(id)}">${esc(nm(id))}</option>`).join('')}</optgroup>` : ''}<optgroup label="Another species">${rest.map(id => `<option value="${esc(id)}">${esc(nm(id))}</option>`).join('')}</optgroup></select>`;
}
// The rows' clicks in scope S on photo f (the card's, a photo tile's): each one the admin's value through edit(fn, what), one
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
// The crop editor of the corals (admin.js cropEditor) on a fish photo: the admin's crop, else start (the pass's suggestion, or
// a photo's published crop); Full photo over a suggested crop (sug) is kept as an explicit no-crop. His rotation (fish
// rot) with it, one Undo step for both, through edit(fn).
const fishCrop = (p, start, sug, edit) =>
  cropEditor(p, {
    start: ((DRAFT[TK] || {}).crop || {})[p.f] || start || null,
    rot: fishRot(p.f),
    save: (v, full, ro) =>
      edit(G => fishSet(fishSet(G, p.f, 'crop', full ? (sug ? [0, 0, 1, 1] : null) : v), p.f, 'rot', rotNorm(ro) || null))
  });
const FKEEP = {best: 'best photo of its observation', alt: 'another angle of its observation', dup: 'near-duplicate'};
// The pass's judgment above the card (never on a Check: blind), its ease as a chip (the prior the game starts from).
const fishJudged = j =>
  !j
    ? '<p class="adm-judge">Not judged yet</p>'
    : `<p class="adm-judge${j.k === 'dup' ? ' warn' : ''}" title="Suggestion of the judging pass (data/suggest.json)">${j.e ? `<span class="adm-chip adm-fease" title="Ease 1-5 (5 very easy): the photo's difficulty prior">ease ${j.e}</span> ` : ''}${[FKEEP[j.k] || '', tagText(j.jt, FISHS, true), j.ph ? esc(j.ph) : '', j.u && j.u.length ? `unsure: ${esc(j.u.join(', '))}` : '', j.n ? esc(j.n) : '', j.c ? 'crop suggested' : ''].filter(Boolean).join(' · ')}</p>`;
// A fish photo with its crop: the admin's (draft), else, outside a Check, the pass's, or for a record with no judgment (a
// photo fishGameIn put in play from fish-game.json: a sure candidate, a reference photo) its published crop (cr, the one
// tools/fish_game.py baked in); and his rotation (fish rot). Through admin.js crSrc, as the family pages (fuP): a
// candidate (remote) gets both drawn on its original; a photo in play from fish-game.json, whose R2 file has its
// published crop and rotation baked in (cr, ro), is shown as it is while the draft keeps them, else from its original
// with the draft's (drawn over the baked file, a published 90° would show as 180°).
const fishRot = f => rotNorm(((DRAFT[TK] || {}).rot || {})[f]);
const fishSrc = (p, s, blind) =>
  crSrc({...p, j: {c: ((DRAFT[TK] || {}).crop || {})[p.f] || (!blind && (p.j ? p.j.c : p.cr)) || null, ro: fishRot(p.f)}}, s);
// Where a fish photo comes from: the admin's own, FishBase, or iNaturalist near Dauin, in the Philippines, elsewhere in the
// Indo-West Pacific (the coral origins' colours, admin.js ORIGINS), then its rights class (admin.js rightsTag) and, when
// its name is a former combination or an iNaturalist spelling WoRMS writes otherwise, the WoRMS name (admin.js nameTag).
const fishSrcTag = p => {
  const o = origin(p);
  return `<span class="adm-src o-${o}">${p.via === 'fishbase' && !p.own ? 'FishBase' : ORIGINS.find(x => x[0] === o)[1]}</span>${rightsTag(p)}${nameTag(p, FISHS)}`;
};
// A genus-level candidate's unit is its genus (gl: the sea slugs' genus-level lists, by the genus's id): "Genus sp.",
// genus level (admin.js fuName).
const fishName = sid => {
  const s = FISHC.species[sid] || {},
    t = FISHC.entry[sid],
    g = !FISHC.species[sid] && (FISHC.genera || {})[sid];
  return g ? {sci: g.name + ' sp.', sub: 'genus level'} : {sci: s.name || sid, sub: [s.common, t && t.name].filter(Boolean).join(' · ')};
};
// The records the queue reads its targets from (autosort.js fishQueue, fishTarget): the species', and for a subject with
// a target of its own (core.js SUBJECTS admin target) its genera's too, a genus-level list filling up to the same target.
const candSpecies = () =>
  FISHS && FISHS.admin.target > 0
    ? {...Object.fromEntries(Object.keys(FISHC.genera || {}).map(g => [g, {tgt: FISHS.admin.target}])), ...FISHC.species}
    : FISHC.species;
// The photos of a species in play (the admin's keep holds the add, never other species one could take for the subject:
// core.js treeOther), its own candidates first, then any other photo added to it.
const fishInPlay = (F, sid) => {
  const L = Object.entries(F.add || {})
      .filter(([f, s]) => s === sid && treePhotoOn(F, f, sid) && !treeOther((F.tags || {})[f], ((SUG[TK] || {})[f] || {}).jt))
      .map(([f]) => (FISHC.byF[f] && {...FISHC.byF[f], j: (SUG[TK] || {})[f]}) || {f}),
    seen = new Set(L.map(p => treePid(p.f)));
  // And the photos the game plays whatever their route (the sure candidates, the reference photos), once each.
  fishGameIn(FISHC.plays, {...DRAFT, fish: F}).forEach(p => p.sp === sid && !seen.has(treePid(p.f)) && seen.add(treePid(p.f)) && L.push(p));
  return L;
};
// One photo enlarged: species, observer, the iNaturalist observation; a photo in play has "Out of play" (the admin's ✕
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
  DRAFT[TK] = fn(DRAFT[TK] || {});
  saveDraft();
  render();
}
// The fish auto-sort's line (above the card, folded behind the Auto chip as the corals': admin.js autoChip; chip: the
// chip alone) and its details (below it): its decisions in and set aside, the Checks waiting, its keep agreement with
// the admin (autosort.js fishCompare, autoState: off under 90% over the last 40), and in the details the disagreements and
// every decision still standing (in, back in: a photo it had set aside, brought back by a newer judgement; set aside),
// each with Undo (fishAutoUndo; rule A1).
function fishAutoBlock(det, chip) {
  const F = DRAFT[TK] || {},
    I = Object.entries(fishIdx(F)),
    FA = I.filter(([, x]) => !x.d.check && !x.d.undone),
    nIn = FA.filter(([, x]) => x.d.kind !== 'r').length,
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
              `${{a: 'in', b: 'back in', r: 'set aside'}[x.d.kind]} · ${x.day}`,
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
// cand tree: begin
// The tree subjects' builder of the Candidates swiper (admin.js renderCand, CAND_BUILD: its members are listed there): the
// subject's candidates through autosort.js fishQueue, a species' (or a genus-level list's) target the unit of the cap, the
// pass's judgment and the rubric's rows, the species' photos in play beside the card, Not this → another species.
CAND_BUILD.tree = (() => {
  // After his answer to a Check: what the auto-sort had said.
  const told = c => {
      if (!c.chk) return;
      const x = fishIdx(DRAFT[TK])[c.p.f];
      if (x)
        toast(
          `Check: the auto-sort said ${x.d.kind === 'a' ? 'in' : 'out'}${(x.d.kind === 'a') === (fishMine(DRAFT[TK], c.p.f) === 'add') ? ' (same)' : ' (differs)'}.`
        );
    },
    // The photo as the card shows it: the pass's judgment, never on a Check (blind).
    shownPhoto = c => ({...c.p, j: c.chk ? null : c.j}),
    // The rows' and the crop's clicks pin the card (cst: his values move it in the queue's order: a phase he clears is no
    // longer a missing one).
    pin = (Q, c) => fn => {
      cst(Q.S).pin = c.p.f;
      fishEdit(fn);
    };
  return {
    ready: () => !!(FISHC && FISHC.plays),
    load: () => fishLoad(true),
    instead: () => false,
    queue(S) {
      const F = DRAFT[TK] || {},
        SF = (SUG && SUG[TK]) || {},
        Q0 = fishQueue(FISHC.cand, SF, candSpecies(), F, fishGameIn(FISHC.plays, {...DRAFT, fish: F})),
        chks = Q0.filter(x => x.chk),
        // the queue switch (below) only where Checks can exist: elsewhere every candidate, whatever FQ another subject left
        // (Checks chosen on one subject must not leave another an empty queue with no switch)
        aqOn = !!S.admin.autosort || chks.length > 0;
      return {S, F, Q0, chks, aqOn, rows: aqOn && FQ === 'chk' ? chks : Q0, unjudged: Q0.filter(x => !x.j).length};
    },
    // the queue switch for a subject with an auto-sort (core.js SUBJECTS admin autosort: its Checks); else its count, a chip
    // beside the others (words.lead)
    seg: (Q, shown) =>
      Q.aqOn
        ? `<span class="adm-qseg adm-csrc" role="group" aria-label="Queue"><button type="button" data-fq="all" aria-pressed="${FQ === 'all'}" title="Every candidate, the thinnest species first">All <b>${Q.Q0.filter(shown).length}</b></button><button type="button" data-fq="chk" aria-pressed="${FQ === 'chk'}" title="The auto-sort's Checks, blind">Checks <b>${Q.chks.filter(shown).length}</b></button></span>`
        : '',
    words: (Q, shown) => ({
      lead: Q.aqOn
        ? ''
        : `<span class="adm-chip" title="Every candidate, the thinnest species first">${Q.Q0.filter(shown).length} to sort</span>`,
      full: [
        'at target',
        `of species at their target (${Q.S.admin.target > 0 ? `${Q.S.admin.target} observations` : `${FISHT.obs} observations, ${FISHT.top} for the cheatsheet's, ${FISHT.wink} for the surprise cards'`})`
      ],
      aside: 'the pass is sure go (near-duplicate, subject not obvious, out of the water or a screen, an egg mass), not applied',
      judge: `Ask your agent for the ${esc(Q.S.what.toLowerCase())} candidate pass (judging/)`
    }),
    auto: (det, chip) => fishAutoBlock(det, chip),
    interlude: () => false,
    card(Q, c) {
      const {p, sid, chk, j, from, ph, nph} = c,
        F = Q.F,
        n = fishName(sid),
        play = fishInPlay(F, sid),
        inObs = new Set(play.map(q => q.o || q.f)).size,
        s = chk ? null : fishSure(j),
        link = /^https?:/.test(p.o || '')
          ? `<a class="adm-swlink" href="${esc(p.o)}" target="_blank" rel="noopener" title="${p.via === 'fishbase' ? 'FishBase' : 'iNaturalist'}">${p.via === 'fishbase' ? 'FishBase' : 'iNat'} ↗</a>`
          : '';
      return {
        cls: ` adm-fsw${FTAGS_OPEN ? ' adm-ftopen' : ''}`,
        attrs: ` data-s="${esc(sid)}"`,
        photo: fishSrc(shownPhoto(c), 0, chk),
        head: `<span class="adm-swg"><i>${esc(n.sci)}</i>${n.sub ? `<small>${esc(n.sub)}</small>` : ''}${from ? `<small>from <i>${esc(fishName(from).sci)}</i></small>` : ''}${fishPtx(FISHC.species[sid])}</span>`,
        caption: `${fishSrcTag(p)}${!chk && ph ? `<span class="adm-src${nph ? ' adm-fnew' : ''}" title="${nph ? 'A phase none of its photos in play shows' : 'Its phase'}">${esc(ph)}${nph ? ' · new' : ''}</span>` : ''}${p.st ? `<span class="adm-src" title="iNaturalist / FishBase life stage or sex">${esc(p.st)}</span>` : ''}<span class="adm-t">${esc(p.t || '')}</span>${link}`,
        judge: chk ? '' : fishJudged(j),
        strip: `
      <div class="adm-fplay" title="Observations in play for this species / its target"><span class="adm-fplayn${inObs >= c.target ? ' full' : ''}">In play <b>${inObs}/${c.target}</b></span>${play
        .map(
          q =>
            `<button type="button" class="adm-fth" data-fp="${esc(q.f)}" aria-label="Enlarge a photo in play">${q.src ? `<img ${fishSrc(q, 1)} alt="" loading="lazy">` : ''}</button>`
        )
        .join('')}</div>`,
        rows: fishRows(F, p, j, chk, FISHC.entry[sid]),
        not: fishNotThisSel(sid, from),
        tool: `<button type="button" data-ftags aria-pressed="${FTAGS_OPEN}">Tags</button>`,
        crop: !!((F.crop || {})[p.f] || fishRot(p.f)),
        adds: [{v: '', t: 'Add', sug: !!(s && s.keep === 'add')}]
      };
    },
    add(Q, c) {
      const {p, sid, chk, j} = c;
      fishEdit(G => fishAdd(G, p.f, sid, j, p));
      if (!chk) toast(`Added: ${fishName(sid).sci} (${new Set(fishInPlay(DRAFT[TK], sid).map(q => q.o || q.f)).size}/${c.target}).`);
      told(c);
    },
    reject(Q, c) {
      fishEdit(G => fishReject(fishDrop(G, fishFamOf(c.sid), c.p.f), c.p.f));
      told(c);
    },
    exclude(Q, c) {
      fishEdit(G => fishExclude(fishDrop(G, fishFamOf(c.sid), c.p.f), c.p.f));
      if (!c.chk) toast('Excluded. Undo (Ctrl+Z) brings it back.');
      told(c);
    },
    zoom: (Q, c) => fishZoom(shownPhoto(c), c.sid, false, c.chk),
    // The crop (fishCrop): the admin's, else the pass's (never on a Check).
    crop: (Q, c) => fishCrop(shownPhoto(c), !c.chk && c.j && c.j.c, ((SUG[TK] || {})[c.p.f] || {}).c, pin(Q, c)),
    bind(Q, scope, c) {
      if (c) {
        const {p, sid, chk, j, from} = c,
          f = p.f,
          sw = scope.querySelector('.adm-sw'),
          st = cst(Q.S),
          play = fishInPlay(Q.F, sid);
        // The rows: each click the admin's value, one Undo step (autosort.js fishSet, fishTag: through fishOwn).
        bindFishRows(sw, f, () => fishTagsMine(DRAFT[TK], f, j && j.jt) || (!chk && j && j.jt) || '', pin(Q, c));
        sw.querySelector('[data-ftags]').onclick = () => {
          FTAGS_OPEN = !FTAGS_OPEN;
          store.set('reefid-admin-ftags', FTAGS_OPEN);
          render();
        };
        sw.querySelector('[data-fnot]').onchange = e => {
          const to = e.target.value;
          if (!to) return;
          st.skip.delete(f);
          st.pin = null;
          fishEdit(G => fishNotThis(fishDrop(G, fishFamOf(sid), f), f, to, from || sid));
          toast(
            to === 'x'
              ? 'Not this: no game species. Undo (Ctrl+Z) brings it back.'
              : to === from
                ? `Back to ${fishName(to).sci}.`
                : `Not this: sent to ${fishName(to).sci} as its candidate.`
          );
          told(c);
        };
        sw.querySelectorAll('[data-fp]').forEach(b => {
          const q = play.find(x => x.f === b.dataset.fp);
          b.onclick = () => q && q.src && fishZoom(q, sid, true);
        });
      }
      scope.querySelectorAll('[data-fq]').forEach(
        b =>
          (b.onclick = () => {
            FQ = b.dataset.fq;
            store.set('reefid-admin-fq', FQ);
            render();
          })
      );
      bindFishAuto(scope);
    }
  };
})();
// cand tree: end
