// Photos › Photo review › Light proposals on the fish side (#fish/photos/review/light-proposals; Pierre, 2026-11-14: "ok
// pour (a)", docs/ROADMAP.md "Fish judging: a flash or lamp on a dark background is not a night shot"). After rubric 6
// (Q308: a flash or a lamp on a dark background is good light, not a night shot) the judging pass re-judged its photos,
// but 152 of Pierre's adds keep in curation.json fish.tags / fish.ease the tags and ease he took from the earlier
// judgement: judging/fish-light-q308.json `curation`, [{photo, curated: [tags, ease], rejudged: [tags, ease]}], a
// proposal only (rule A1). This view lists the ones still open, each with its photo, his tags and ease, the re-judged ones
// in words, and Accept (the re-judged tags and ease into his draft, autosort.js fishSet: one Undo step) or Keep mine
// (curation.json fish.kept {photo: 'q308'}: answered, never shown again); Accept all in one Undo step behind a confirm
// (rule A2: bulk). His Publish sends it all. The view is in the switch only while a proposal is open (admin.js TABS:
// its `live` option, hasPage).
//
// The pure part (lightOpen, lightAccept, lightKeep, lightDiff, lightCounts) runs in Node too: tests/fishlight.test.js.
(function (root) {
  const A = typeof module !== 'undefined' && module.exports ? require('./autosort.js') : root;
  // The proposal set: the file the admin reads from the repository (GitHub contents API, as curation.json; judging/ is not
  // on the site) and the name a Keep mine records.
  const LIGHT_SET = {file: 'judging/fish-light-q308.json', id: 'q308'};
  // judging/FISH.md "Tags", every value in words (the good ones too: a proposal's "after" is mostly good light).
  const LIGHT_WORDS = [
    ['View', {p: 'profile', o: 'oblique', h: 'head-on', t: 'tail view', d: 'from above'}],
    ['Whole', {1: 'whole', 0: 'partial'}],
    ['Light', {g: 'good', d: 'dim', n: 'night livery'}],
    ['Colour loss', {0: 'none', 1: 'slight', 2: 'strong', 3: 'monochrome'}],
    ['Clarity', {s: 'sharp', m: 'soft', b: 'blurred'}],
    ['Size', {l: 'large', m: 'medium', s: 'small'}],
    [
      'Count',
      {
        1: 'one fish',
        s: 'several of its kind',
        o: 'other species, no confusion',
        k: 'other species, confusable',
        m: 'other species, not sorted',
        x: 'subject not obvious'
      }
    ]
  ];
  const LIGHT_FLAGS = {j: 'Juvenile', c: 'Camouflage', a: 'Out of water', p: 'Phase', r: 'Reference photo'};
  // The retired codes of the rubric, by position (judging/FISH.md "Tags"): count m ("other species, not sorted", before the
  // split of 2026-11-09), read but never typed again. A proposal that would move a tag to one is never offered (lightLoad);
  // his own code may still carry it (kept as his).
  const LIGHT_RETIRED = {6: 'm'};
  const lightRetired = x => Object.entries(LIGHT_RETIRED).some(([i, c]) => x.rejudged[0][i] === c && x.curated[0][i] !== c);
  const same = (F, f, v) => (F.tags || {})[f] === v[0] && (F.ease || {})[f] === v[1];
  // The proposals still open in the fish draft F: the photo still his add in play, its tags and ease both still the ones
  // the proposal was made against (curated: a value he set since is a newer choice of his), and not kept (Keep mine).
  // Accepted ones carry the re-judged values, so they leave the list with the rest.
  function lightOpen(P, F, set = LIGHT_SET.id) {
    F = F || {};
    return (P || []).filter(x => {
      const f = x.photo,
        sid = (F.add || {})[f];
      return sid != null && A.fishOn(F, f, sid) && (F.kept || {})[f] !== set && same(F, f, x.curated);
    });
  }
  // Accept: the re-judged tags and ease as his (fishSet each, so an auto-sort log entry gives the fields up: fishOwn).
  function lightAccept(F, x) {
    return A.fishSet(A.fishSet(F || {}, x.photo, 'tags', x.rejudged[0]), x.photo, 'ease', x.rejudged[1]);
  }
  // Keep mine: his values stay; the photo is recorded as answered for this set (curation.json fish.kept).
  function lightKeep(F, x, set = LIGHT_SET.id) {
    F = F || {};
    return {...F, kept: {...(F.kept || {}), [x.photo]: set}};
  }
  // What a proposal changes, in words: [name, before, after] for each tag and flag that differs, then the ease.
  function lightDiff(x) {
    const [a, ea] = x.curated,
      [b, eb] = x.rejudged,
      out = [];
    LIGHT_WORDS.forEach(([n, W], i) => {
      if (a[i] !== b[i]) out.push([n, `${a[i]} ${W[a[i]] || '?'}`, `${b[i]} ${W[b[i]] || '?'}`]);
    });
    Object.entries(LIGHT_FLAGS).forEach(([k, n]) => {
      const p = a.slice(7).includes(k),
        q = b.slice(7).includes(k);
      if (p !== q) out.push([n, p ? 'yes' : 'no', q ? 'yes' : 'no']);
    });
    if (ea !== eb) out.push(['Ease', String(ea), String(eb)]);
    return out;
  }
  // What Publish sends of the proposals: accepted (the draft carries the re-judged values, the published file does not)
  // and kept (Keep mine answered since the published file).
  function lightCounts(P, D, S, set = LIGHT_SET.id) {
    D = D || {};
    S = S || {};
    return {
      accepted: (P || []).filter(x => same(D, x.photo, x.rejudged) && !same(S, x.photo, x.rejudged)).length,
      kept: (P || []).filter(x => (D.kept || {})[x.photo] === set && (S.kept || {})[x.photo] !== set).length
    };
  }
  const API = {LIGHT_SET, LIGHT_WORDS, LIGHT_FLAGS, LIGHT_RETIRED, lightRetired, lightOpen, lightAccept, lightKeep, lightDiff, lightCounts};
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else Object.assign(root, API);
})(this);

// ---- The admin view (browser only: admin.js state and helpers) ----
// LIGHT: the proposals once read (null before; [] when there is no file or no token to read it with). Read once, on the
// first look at a fish page's switch (lightLive), with the token (or the demo's stand-in): judging/ is not on the site.
const LIGHT_PAGE = 'photos/review/light-proposals';
let LIGHT = null,
  LIGHT_P = null;
function lightLoad() {
  if (LIGHT_P || !TOKEN) return LIGHT_P; // read-only (no token): nothing to read it with, nothing to answer
  LIGHT_P = ghFile(LIGHT_SET.file)
    .then(f => (f ? JSON.parse(f.text).curation || [] : []))
    .catch(() => [])
    .then(L => {
      LIGHT = Array.isArray(L)
        ? L.filter(x => x && x.photo && Array.isArray(x.curated) && Array.isArray(x.rejudged) && !lightRetired(x))
        : [];
      status();
      if (cur === LIGHT_PAGE) render();
    });
  return LIGHT_P;
}
// The view's `live` option (admin.js TABS): in the switch while a proposal is open; false until the file is read.
const lightLive = () => (lightLoad(), !!LIGHT && lightOpen(LIGHT, DRAFT.fish).length > 0);
// Publish's summary lines (admin.js pubSummary).
const lightSummary = () => {
  if (!LIGHT || !LIGHT.length) return [];
  const c = lightCounts(LIGHT, DRAFT.fish, SAVED.fish);
  return [
    [c.accepted, 'fish light proposal accepted', 'fish light proposals accepted'],
    [c.kept, 'fish light proposal kept as it was', 'fish light proposals kept as they were']
  ];
};
function renderLight() {
  if (!TOKEN) {
    status();
    $v.innerHTML = '<p class="note">Read-only: needs this page’s GitHub token.</p>';
    return;
  }
  if (!LIGHT || !FISHC) {
    status();
    $v.innerHTML = '<p class="note">Loading…</p>';
    Promise.all([lightLoad(), fishLoad()]).then(() => cur === LIGHT_PAGE && render());
    return;
  }
  status();
  const O = lightOpen(LIGHT, DRAFT.fish),
    sp = FISHC.species,
    rec = x => ({...(FISHC.byF[x.photo] || {f: x.photo}), sid: (DRAFT.fish.add || {})[x.photo]});
  if (!O.length) {
    $v.innerHTML = '<p class="note">No light proposal left.</p>';
    return;
  }
  // One row per change of the light tag (night livery → good, dim → good, night livery → dim; any other change last).
  const rowOf = x => `${x.curated[0][2]}${x.rejudged[0][2]}`,
    order = ['ng', 'dg', 'nd'],
    keys = [...new Set(O.map(rowOf))].sort((a, b) => (order.indexOf(a) + 1 || 9) - (order.indexOf(b) + 1 || 9)),
    L = O.map(rec),
    W = LIGHT_WORDS[2][1];
  const tile = x => {
    const p = rec(x),
      s = sp[p.sid] || {};
    return `<figure class="adm-tile adm-lprop" data-f="${esc(x.photo)}"><button type="button" class="adm-ph" data-lpz aria-label="Enlarge">${p.src ? `<img ${crSrc(fuP(p), 1)} alt="" loading="lazy" draggable="false">` : ''}</button>
      <figcaption><span class="adm-t">${esc(s.common || s.name || '')} <i>${esc(s.name || '')}</i></span></figcaption>
      <ul class="adm-ldiff" title="${esc(`${x.curated[0]} · ${x.curated[1]} → ${x.rejudged[0]} · ${x.rejudged[1]}`)}">${lightDiff(x)
        .map(([n, a, b]) => `<li><span>${esc(n)}</span> <s>${esc(a)}</s> → <b>${esc(b)}</b></li>`)
        .join('')}</ul>
      <div class="adm-acts"><span class="adm-qseg adm-lvseg" role="group" aria-label="Proposal"><button type="button" data-lpa>Accept</button><button type="button" data-lpk>Keep mine</button></span></div></figure>`;
  };
  $v.innerHTML = `<div class="adm-filter adm-sticky"><button type="button" class="adm-fok" data-lpall>Accept all ${O.length}</button></div>${keys
    .map(k => {
      const R = O.filter(x => rowOf(x) === k),
        t = k[0] !== k[1] ? `Light ${W[k[0]] || k[0]} → ${W[k[1]] || k[1]}` : 'Other';
      return `<section class="adm-row"><h3>${esc(t)} <small>${R.length} photo${R.length === 1 ? '' : 's'}</small></h3><div class="adm-grid">${R.map(tile).join('')}</div></section>`;
    })
    .join('')}`;
  const fx = fn => {
    const y = window.scrollY;
    DRAFT.fish = fn(DRAFT.fish || {});
    saveDraft();
    render();
    window.scrollTo(0, y);
  };
  $v.querySelector('[data-lpall]').onclick = () => {
    if (!confirm(`Accept all ${O.length} light proposals into your draft? Undo steps back.`)) return;
    fx(F => O.reduce(lightAccept, F));
  };
  $v.querySelectorAll('.adm-lprop[data-f]').forEach(tl => {
    const x = O.find(y => y.photo === tl.dataset.f);
    tl.querySelector('[data-lpa]').onclick = () => fx(F => lightAccept(F, x));
    tl.querySelector('[data-lpk]').onclick = () => fx(F => lightKeep(F, x));
    tl.querySelector('[data-lpz]').onclick = () =>
      zoomSet(
        L.map(fuP),
        L.findIndex(p => p.f === x.photo),
        q => lbCap(fuName(q.sid), q, (sp[q.sid] || {}).common || '')
      );
  });
}
