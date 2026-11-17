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
// A second set, the same way (Pierre, 2026-11-15: one judgement per photo): the photos judged twice
// (as a reference photo and as a candidate) whose copies disagreed were judged again once, and his adds whose tags and
// ease still hold the earlier judgement get the new one as a proposal: judging/fish-one-judgement.json, Keep mine
// recorded as 'one'. Each proposal carries its set (x.set); a photo proposed by two sets shows the later set's only.
//
// The pure part (lightOpen, lightAccept, lightKeep, lightDiff, lightCounts, lightSets) runs in Node too:
// tests/fishlight.test.js.
(function (root) {
  const A = typeof module !== 'undefined' && module.exports ? require('./autosort.js') : root,
    pid = (typeof module !== 'undefined' && module.exports ? require('./core.js') : root).fishPid;
  // The proposal sets, oldest first: the file the admin reads from the repository (GitHub contents API, as curation.json;
  // judging/ is not on the site), the name a Keep mine records, and the heading of its proposals (the light re-judge's
  // are grouped by light change instead).
  const LIGHT_SETS = [
    {file: 'judging/fish-light-q308.json', id: 'q308'},
    {file: 'judging/fish-one-judgement.json', id: 'one', title: 'One judgement per photo'}
  ];
  const LIGHT_SET = LIGHT_SETS[0];
  // The proposals of every set read (lists in LIGHT_SETS order, each a file's `curation`), each tagged with its set; a
  // photo in two sets keeps the later set's proposal only (so a Keep mine on it never reopens the earlier one).
  function lightSets(Ls) {
    const by = new Map();
    LIGHT_SETS.forEach((s, i) =>
      ((Ls || [])[i] || []).forEach(x => {
        if (x && x.photo) by.set(x.photo, {...x, set: s.id});
      })
    );
    return [...by.values()];
  }
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
  const LIGHT_FLAGS = {j: 'Juvenile', c: 'Camouflage', a: 'Out of water', w: 'Watermark', p: 'Phase', r: 'Reference photo'};
  // The retired codes of the rubric, by position (judging/FISH.md "Tags"): count m ("other species, not sorted", before the
  // split of 2026-11-09), read but never typed again. A proposal that would move a tag to one is never offered (lightLoad);
  // his own code may still carry it (kept as his).
  const LIGHT_RETIRED = {6: 'm'};
  const lightRetired = x => Object.entries(LIGHT_RETIRED).some(([i, c]) => x.rejudged[0][i] === c && x.curated[0][i] !== c);
  const same = (F, f, v) => (F.tags || {})[f] === v[0] && (F.ease || {})[f] === v[1];
  // The proposals still open in the fish draft F: the photo still his add in play, its tags and ease both still the ones
  // the proposal was made against (curated: a value he set since is a newer choice of his), and not kept (Keep mine).
  // Accepted ones carry the re-judged values, so they leave the list with the rest. A proposal's set is its own (x.set),
  // else set.
  function lightOpen(P, F, set = LIGHT_SET.id) {
    F = F || {};
    return (P || []).filter(x => {
      const f = x.photo,
        sid = (F.add || {})[f];
      return sid != null && A.fishOn(F, f, sid) && (F.kept || {})[f] !== (x.set || set) && same(F, f, x.curated);
    });
  }
  // Accept: the re-judged tags and ease as his (fishSet each, so an auto-sort log entry gives the fields up: fishOwn).
  // keep: the node ids whose ★ cover the photo is and that he keeps as their cover although the proposal makes it a
  // juvenile (lightCovers; Pierre's exception, 2026-11-15: autosort.js fishCoverJ), confirmed in the same Undo step.
  function lightAccept(F, x, keep) {
    let N = A.fishSet(A.fishSet(F || {}, x.photo, 'tags', x.rejudged[0]), x.photo, 'ease', x.rejudged[1]);
    (Array.isArray(keep) ? keep : []).forEach(id => (N = A.fishCoverJOk(N, id))); // not reduce's index
    return N;
  }
  // Whether a proposal makes its photo a juvenile (the j flag added: judging/FISH.md "Tags").
  const lightJ = x => !!x && x.rejudged[0].slice(7).includes('j') && !x.curated[0].slice(7).includes('j');
  // The nodes (curation.json fish genera ids) whose ★ cover is proposal x's photo, under either of its names (core.js
  // fishPid), that x would make a juvenile and that he has not confirmed as such yet (autosort.js fishCoverJ): a juvenile
  // is never a cover unless he confirms it, so Accept asks him first (the view) and the Tree page offers the confirmation.
  function lightCovers(F, x) {
    if (!lightJ(x)) return [];
    const G = (F || {}).genera || {};
    return Object.keys(G).filter(id => G[id] && G[id].cover && pid(G[id].cover) === pid(x.photo) && !A.fishCoverJ(F, id, x.photo));
  }
  // An open proposal in the fish draft F that would make photo f a juvenile (lightJ), or null.
  const lightJOf = (P, F, f) => lightOpen(P, F).find(x => lightJ(x) && pid(x.photo) === pid(f)) || null;
  // Keep mine: his values stay; the photo is recorded as answered for its set (curation.json fish.kept).
  function lightKeep(F, x, set = (x && x.set) || LIGHT_SET.id) {
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
  // What Publish sends of the proposals: accepted (open in the published file S, the re-judged values in the draft D: a
  // photo the draft took from another route with the same values is no answer) and kept (Keep mine answered since S).
  function lightCounts(P, D, S, set = LIGHT_SET.id) {
    D = D || {};
    S = S || {};
    return {
      accepted: (P || []).filter(x => same(D, x.photo, x.rejudged) && same(S, x.photo, x.curated)).length,
      kept: (P || []).filter(x => (D.kept || {})[x.photo] === (x.set || set) && (S.kept || {})[x.photo] !== (x.set || set)).length
    };
  }
  const API = {
    LIGHT_SET,
    LIGHT_SETS,
    lightSets,
    LIGHT_WORDS,
    LIGHT_FLAGS,
    LIGHT_RETIRED,
    lightRetired,
    lightOpen,
    lightAccept,
    lightJ,
    lightCovers,
    lightJOf,
    lightKeep,
    lightDiff,
    lightCounts
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else Object.assign(root, API);
})(this);

// ---- The admin view (browser only: admin.js state and helpers) ----
// LIGHT: the proposals of every set once read (null before; [] when there is no file or no token to read it with), each
// with its set (lightSets). Read once, on the first look at a fish page's switch (lightLive), with the token (or the demo's
// stand-in): judging/ is not on the site. A set whose file cannot be read counts as empty.
const LIGHT_PAGE = 'photos/review/light-proposals';
let LIGHT = null,
  LIGHT_P = null;
function lightLoad() {
  if (LIGHT_P || !TOKEN) return LIGHT_P; // read-only (no token): nothing to read it with, nothing to answer
  LIGHT_P = Promise.all(
    LIGHT_SETS.map(s =>
      ghFile(s.file)
        .then(f => (f ? JSON.parse(f.text).curation || [] : []))
        .catch(() => [])
        .then(L => (Array.isArray(L) ? L : []))
    )
  ).then(Ls => {
    LIGHT = lightSets(Ls).filter(x => Array.isArray(x.curated) && Array.isArray(x.rejudged) && !lightRetired(x));
    status();
    if (cur === LIGHT_PAGE) render();
  });
  return LIGHT_P;
}
// The view's `live` option (admin.js TABS): in the switch while a proposal is open; false until the file is read.
const lightLive = () => (lightLoad(), !!LIGHT && lightOpen(LIGHT, DRAFT[TK]).length > 0);
// Publish's summary lines (admin.js pubSummary).
const lightSummary = () => {
  if (!LIGHT || !LIGHT.length) return [];
  // every tree subject's part (admin.js TREES: a proposal names its photo, so only its own subject's part counts it),
  // whatever the subject on screen
  return TREES.flatMap(S => {
    const c = lightCounts(LIGHT, DRAFT[S.admin.cur], SAVED[S.admin.cur]),
      w = S.card;
    return [
      [c.accepted, `${w} light proposal accepted`, `${w} light proposals accepted`],
      [c.kept, `${w} light proposal kept as it was`, `${w} light proposals kept as they were`]
    ];
  });
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
  const O = lightOpen(LIGHT, DRAFT[TK]),
    sp = FISHC.species,
    rec = x => ({...(FISHC.byF[x.photo] || {f: x.photo}), sid: (DRAFT[TK].add || {})[x.photo]});
  if (!O.length) {
    $v.innerHTML = '<p class="note">No light proposal left.</p>';
    return;
  }
  // One row per change of the light tag (night livery → good, dim → good, night livery → dim; any other change last), then
  // one per later set (its title).
  const rowOf = x => (x.set && x.set !== LIGHT_SET.id ? `set:${x.set}` : `${x.curated[0][2]}${x.rejudged[0][2]}`),
    order = ['ng', 'dg', 'nd', ...LIGHT_SETS.map(s => `set:${s.id}`)],
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
        s = LIGHT_SETS.find(z => `set:${z.id}` === k),
        t = s ? s.title || s.id : k[0] !== k[1] ? `Light ${W[k[0]] || k[0]} → ${W[k[1]] || k[1]}` : 'Other';
      return `<section class="adm-row"><h3>${esc(t)} <small>${R.length} photo${R.length === 1 ? '' : 's'}</small></h3><div class="adm-grid">${R.map(tile).join('')}</div></section>`;
    })
    .join('')}`;
  const fx = fn => {
    const y = window.scrollY;
    DRAFT[TK] = fn(DRAFT[TK] || {});
    saveDraft();
    render();
    window.scrollTo(0, y);
  };
  // A proposal that makes one of his ★ covers a juvenile (lightCovers): Pierre's question first (admin-covers.js JUV_Q,
  // 2026-11-15), the cover's node named; yes keeps it as the cover, confirmed in the same Undo step; no accepts the tags
  // all the same, and the cover is then ignored as any juvenile's (the default applies; the Tree page asks again).
  const keepOf = (F, x) => {
    const ids = lightCovers(F, x);
    if (!ids.length) return [];
    const nm = id => {
        for (const u of FISHC.units || []) {
          const g = u.id === id ? u : (u.genera || []).find(z => z.id === id);
          if (g) return g.name;
        }
        return fuName(id);
      },
      names = ids.map(nm).join(', ');
    return confirm(`${names}: ${JUV_Q}`) ? ids : [];
  };
  $v.querySelector('[data-lpall]').onclick = () => {
    if (!confirm(`Accept all ${O.length} light proposals into your draft? Undo steps back.`)) return;
    const D = DRAFT[TK] || {},
      K = new Map(O.map(x => [x, keepOf(D, x)]));
    fx(F => O.reduce((N, x) => lightAccept(N, x, K.get(x)), F));
  };
  $v.querySelectorAll('.adm-lprop[data-f]').forEach(tl => {
    const x = O.find(y => y.photo === tl.dataset.f);
    tl.querySelector('[data-lpa]').onclick = () => {
      const keep = keepOf(DRAFT[TK] || {}, x);
      fx(F => lightAccept(F, x, keep));
    };
    tl.querySelector('[data-lpk]').onclick = () => fx(F => lightKeep(F, x));
    tl.querySelector('[data-lpz]').onclick = () =>
      zoomSet(
        L.map(fuP),
        L.findIndex(p => p.f === x.photo),
        q => lbCap(fuName(q.sid), q, (sp[q.sid] || {}).common || '')
      );
  });
}
