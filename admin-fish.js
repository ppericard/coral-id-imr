// The fish admin pages (admin plan, docs/ROADMAP.md "Admin for every subject"; Pierre, 2026-11-04). Loaded after
// admin.js, whose state and helpers it uses (DRAFT, saveDraft, render, toast, esc, img, srcTag, fishLoad, FISHC...), as
// admin-journey.js does. Admin only: players never download it.
//
// PR 5a, the fish Candidates swiper (#fish/photos/candidates): the candidates of fish-cand.json one at a time, as the coral swiper,
// with what the fish curation needs: the thinnest species first, stopping at each species' target, the pass's judgment
// (suggest.json "fish", the judging/FISH.md rubric) and the fish auto-sort's Checks shown blind, the species' photos in
// play beside the card (most of them the auto-sort's proposals, which Pierre can take out of play), the fish auto-sort's
// agreement and decisions (each undoable) below it. Every click goes into DRAFT.fish (autosort.js fishAdd, fishReject,
// fishExclude: pure, tested in tests/fishcand.test.js), one Undo step each, sent by Publish. Never "out": Not this
// (Pierre's click only) comes with PR 5b, with the tag rows and the crop.

let FQ = store.get('reefid-admin-fq', 'all') === 'chk' ? 'chk' : 'all', // the queue shown: every candidate, or the Checks only
  FFULL = false, // this tab: also show the candidates of species at their target
  FASIDE = false; // this tab: also show the ones the pass is sure go, not applied (the fish auto-sort's keep off)
const FSKIP = new Set();

// The rubric's code in words (judging/FISH.md "Tags"): the seven tags, then the flags. The values a beginner's photo
// should have (whole, good light, no colour loss, sharp, one fish) are left out: only what makes a photo harder shows.
const FTAGS = [
  {p: 'profile', o: 'oblique', h: 'head-on', t: 'tail view', d: 'from above'},
  {0: 'partial'},
  {d: 'dim light', n: 'night'},
  {1: 'slight colour loss', 2: 'strong colour loss', 3: 'monochrome'},
  {m: 'soft', b: 'blurred'},
  {l: 'large', m: 'medium', s: 'small'},
  {s: 'several of its kind', m: 'other fish too', x: 'subject not obvious'}
];
const FFLAGS = {j: 'juvenile', c: 'camouflage', a: 'out of water', p: 'phase entry', r: 'reference photo'};
const fishTagText = jt =>
  !jt ? '' : [...FTAGS.map((m, i) => m[jt[i]]), ...[...jt.slice(7)].map(c => FFLAGS[c])].filter(Boolean).map(esc).join(' · ');
const FKEEP = {best: 'best photo of its observation', alt: 'another angle of its observation', dup: 'near-duplicate'};
// The pass's judgment above the card (never on a Check: blind), its ease as a chip (the prior the game starts from).
const fishJudged = j =>
  !j
    ? '<p class="adm-judge">Not judged yet</p>'
    : `<p class="adm-judge${j.k === 'dup' ? ' warn' : ''}" title="Suggestion of the judging pass (suggest.json)">${j.e ? `<span class="adm-chip adm-fease" title="Ease 1-5 (5 very easy): the photo's difficulty prior">ease ${j.e}</span> ` : ''}${[FKEEP[j.k] || '', fishTagText(j.jt), j.ph ? esc(j.ph) : '', j.u && j.u.length ? `unsure: ${esc(j.u.join(', '))}` : '', j.n ? esc(j.n) : '', j.c ? 'crop suggested' : ''].filter(Boolean).join(' · ')}</p>`;
// A fish photo with its crop: Pierre's (draft), else, outside a Check, the pass's. The photos stay remote (iNaturalist,
// FishBase) until they enter the game (admin plan PR 7).
const fishSrc = (p, s, blind) => {
  const c = ((DRAFT.fish || {}).crop || {})[p.f] || (!blind && p.j && p.j.c) || null;
  return c
    ? `src="${esc(img(p, s))}" style="object-view-box:inset(${+(c[1] * 100).toFixed(1)}% ${+((1 - c[2]) * 100).toFixed(1)}% ${+((1 - c[3]) * 100).toFixed(1)}% ${+(c[0] * 100).toFixed(1)}%)"`
    : `src="${esc(img(p, s))}"`;
};
// Where a fish photo comes from: Pierre's own, FishBase, or iNaturalist near Dauin, in the Philippines, elsewhere in the
// Indo-West Pacific (the coral origins' colours, admin.js ORIGINS).
const fishSrcTag = p => {
  const o = origin(p);
  return `<span class="adm-src o-${o}">${p.via === 'fishbase' && !p.own ? 'FishBase' : ORIGINS.find(x => x[0] === o)[1]}</span>`;
};
const fishName = sid => {
  const s = FISHC.species[sid] || {},
    t = FISHC.entry[sid];
  return {sci: s.name || sid, sub: [s.common, t && t.name].filter(Boolean).join(' · ')};
};
// The photos of a species in play (Pierre's keep holds the add), its own candidates first, then any other photo added to it.
const fishInPlay = (F, sid) =>
  Object.entries(F.add || {})
    .filter(([f, s]) => s === sid && fishMine(F, f) === 'add')
    .map(([f]) => (FISHC.byF[f] && {...FISHC.byF[f], j: (SUG.fish || {})[f]}) || {f});
// One photo enlarged: species, observer, the iNaturalist observation; a photo in play has "Out of play" (Pierre's ✕
// Reject on it: off the species, a correction when the auto-sort had proposed it).
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
      fishEdit(F => fishReject(F, p.f));
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
  if (!FISHC) {
    $v.innerHTML = '<p class="note">Loading…</p>';
    fishLoad().then(() => cur === 'photos/candidates' && ASUBJ.admin.cur && render());
    return;
  }
  const F = DRAFT.fish || {},
    SF = (SUG && SUG.fish) || {},
    Q0 = fishQueue(FISHC.cand, SF, FISHC.species, F),
    chks = Q0.filter(x => x.chk),
    Q1 = FQ === 'chk' ? chks : Q0,
    shown = x => !FSKIP.has(x.p.f) && (FFULL || !x.full) && (FASIDE || !x.aside),
    nFull = Q1.filter(x => x.full).length,
    nAside = Q1.filter(x => x.aside).length,
    nJ = Q0.filter(x => !x.j).length,
    live = Q1.filter(shown),
    c = live[0],
    nx = live[1];
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
    const {p, sid, chk, j} = c,
      pb = {...p, j: chk ? null : j},
      n = fishName(sid),
      play = fishInPlay(F, sid),
      inObs = new Set(play.map(q => q.o || q.f)).size,
      s = chk ? null : fishSure(j),
      link = /^https?:/.test(p.o || '')
        ? `<a class="adm-swlink" href="${esc(p.o)}" target="_blank" rel="noopener" title="${p.via === 'fishbase' ? 'FishBase' : 'iNaturalist'}">${p.via === 'fishbase' ? 'FishBase' : 'iNat'} ↗</a>`
        : '';
    $v.innerHTML = `<section class="adm-sw adm-fsw${chk ? ' adm-blind' : ''}" data-f="${esc(p.f)}" data-s="${esc(sid)}">${seg}
      <figure class="adm-swcard">
        <button type="button" class="adm-swph" data-zoom aria-label="Enlarge"><img ${fishSrc(pb, 0, chk)} alt=""></button>
        <span class="adm-swg"><i>${esc(n.sci)}</i>${n.sub ? `<small>${esc(n.sub)}</small>` : ''}</span>
        <button type="button" class="adm-swx" data-x title="Exclude" aria-label="Exclude for good">×</button>
        <figcaption>${chk ? '<span class="adm-src adm-chk" title="Check">Check</span>' : ''}${fishSrcTag(p)}${p.st ? `<span class="adm-src" title="iNaturalist / FishBase life stage or sex">${esc(p.st)}</span>` : ''}<span class="adm-t">${esc(p.t || '')}</span>${link}</figcaption>
      </figure>${chk ? '' : fishJudged(j)}
      <div class="adm-fplay" title="Observations in play for this species / its target"><span class="adm-fplayn${inObs >= c.target ? ' full' : ''}">In play <b>${inObs}/${c.target}</b></span>${play
        .map(
          q =>
            `<button type="button" class="adm-fth" data-fp="${esc(q.f)}" aria-label="Enlarge a photo in play">${q.src ? `<img ${fishSrc(q, 1)} alt="" loading="lazy">` : ''}</button>`
        )
        .join('')}</div>
      <div class="adm-swbar"><button type="button" class="rej" data-rej>✕ Reject</button><button type="button" data-skip>Skip</button><button type="button" class="add${s && s.keep === 'add' ? ' sug' : ''}" data-add title="${s && s.keep === 'add' ? 'Suggested · ' : ''}Add (1)">+ Add</button></div>
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
      fishEdit(G => fishAdd(G, f, sid, j));
      if (!chk) toast(`Added: ${n.sci} (${new Set(fishInPlay(DRAFT.fish, sid).map(q => q.o || q.f)).size}/${c.target}).`);
      told();
    };
    S.querySelector('[data-rej]').onclick = () => {
      FSKIP.delete(f);
      fishEdit(G => fishReject(G, f));
      told();
    };
    S.querySelector('[data-x]').onclick = () => {
      FSKIP.delete(f);
      fishEdit(G => fishExclude(G, f));
      if (!chk) toast('Excluded. Undo (Ctrl+Z) brings it back.');
      told();
    };
    S.querySelector('[data-skip]').onclick = () => {
      FSKIP.add(f);
      render();
    };
    S.querySelector('[data-zoom]').onclick = () => fishZoom(pb, sid, false, chk);
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
