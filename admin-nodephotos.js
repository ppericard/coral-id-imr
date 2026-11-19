// Photos › Tree: the photo curation of a node page, ONE implementation for every subject's tree (Pierre, 2026-11-19: "Pourquoi
// on a encore Genera + Tree pour Coraux???"; 10:32: "le but est d'avoir un code commun entre les matières, pas des codes
// pour chaque matière"; 10:33: "Il faut juste identifier les spécificités de chaque matière et voir comment les implémenter,
// soit avec des paramètres, soit avec des bouts de codes spécialisés"). It replaces the corals' Photos › Genera tab (its Live,
// Hidden and Excluded views, #photos/genera/…), whose tools now sit on the Tree's page of a leaf node (a genus).
//
// What is shared (this file's `npLists`, `npBind`, `npTile`, and the filters' counts): for a node, the photos taken off the
// site under it (Removed from the site) and the photos excluded for good (Excluded), each one tile with one click, its Undo
// step and its one binder, on the page of any node of any view of any subject's tree: a leaf shows its own, a group or a
// family those of the leaves under it, the first root of a view also the excluded photos that name no leaf any more. Both
// lists are read, and put back, through the subject's adapter below; nothing else on this page knows a subject.
//
// What each subject specifies, declared here and nowhere else (rule S1: a parameter or a small piece of code, named, with its
// reason; the adapter is the one in NODE_PHOTOS under the subject's unit rank, `SUBJECTS` `rank`):
//   live       the node's photos in play: the page's body and its bar's tools. The corals' (coralLive): one section per VIEW of
//              the genus (Colony, Close-up, Corallites: SUBJECTS `views`), the first 3 photos of a view featured, the genus's
//              zooms (2 or 3), candidates, Not this genus. The fish's and the sea slugs' (renderFishUnits): one section per
//              SPECIES under the family, Ease and phase (juvenile, colour phase) tags, the ★ Cover at every rank. Different
//              data (curation.json genera[<genus>] against fish.genera[<node id>]) and different tiles: they stay behind
//              `live` in this PR; one tile and one body for both is the next step (ROADMAP "The Tree tab").
//   removed    the photos taken off the site (Remove), and `back`, the click that returns one. The corals: genera[g].hide, back
//              is the Remove toggle. The fish's Remove is a reviewed mark (fish.seen) that sends the photo back to the
//              Candidates, with no inverse on a node page yet: null, so no list (next step).
//   excluded   the photos excluded for good (curation.json exclude), and `restore`. The corals': the top-level `exclude`. The
//              fish keep theirs in fish.exclude, with no tested restore: null (next step).
//   orphans    excluded photos no unit has any more (a coral genus the data lost, a lecture slide with no genus): listed at the
//              first root of each view; the fish have none to list (excluded: null).
// The pure part (npExcluded, npUnder) runs in Node too: tests/nodephotos.test.js.
(function (root) {
  const inNode = typeof module !== 'undefined' && module.exports;
  // The excluded photos of curation.json (X = exclude {f: reason}) as items {f, p, unit, gone, inat, slide, lecture}: p the
  // photo's record (PH {f: record with .genus}) while data.json holds it; else (gone from data.json) its unit from the file
  // name (the genus's name in lower case, then "-": acropora-12345, a name in `units`), the iNaturalist photo id its name ends
  // with (the thumbnail's), and for an IMR lecture photo (imrl-p<page>_…) its genus and slide from another photo of the same
  // lecture page (`course` {genus: [{f, slide}]}). unit '' = no unit (lecture: an IMR lecture photo whose page is no longer
  // in the course; else unknown).
  function npExcluded(X, PH, units, course) {
    const names = units || [];
    return Object.keys(X || {}).map(f => {
      const r = PH && PH[f];
      if (r) return {f, p: r, unit: r.genus || '', gone: false};
      const m = f.match(/^([a-z]+)-/),
        id = (f.match(/-(\d{5,})$/) || [])[1],
        pg = (f.match(/^(imrl-p\d+_)/) || [])[1],
        sib =
          pg &&
          Object.entries(course || {})
            .flatMap(([g, L]) => L.map(p => ({...p, genus: g})))
            .find(p => p.f.startsWith(pg)),
        own = m && names.find(x => x.toLowerCase() === m[1]);
      return {
        f,
        p: null,
        unit: own || (sib ? sib.genus : ''),
        gone: true,
        inat: id,
        slide: sib && sib.slide,
        lecture: !!pg && !own && !sib
      };
    });
  }
  // The items of `units` (a list of unit ids: a node's leaves), in the order given.
  const npUnder = (items, units) => {
    const s = new Set(units);
    return items.filter(i => s.has(i.unit));
  };
  const API = {npExcluded, npUnder};
  if (inNode) module.exports = API;
  else Object.assign(root, API);
})(this);

// ---- The admin part (browser only: admin.js state and helpers, read when called) ----
// One tile of a list: thumb and cap are the adapter's (its photo's thumbnail, its caption), the click one binder's.
// kind: 'back' (Put back) or 'restore' (Restore), the adapter's own methods.
const npTile = (it, kind) => {
  const word = kind === 'back' ? 'Put back' : 'Restore';
  return `<figure class="adm-tile${kind === 'back' ? ' is-hidden' : ''}" data-f="${esc(it.f)}" data-g="${esc(it.unit)}">
      ${it.thumb ? `<button type="button" class="adm-ph" data-np="zoom" aria-label="Enlarge">${it.thumb}</button>` : '<span class="adm-ph"><span class="none">no preview</span></span>'}
      <figcaption>${it.cap}</figcaption>
      <div class="adm-acts"><button type="button" data-np="${kind}">${word}</button></div></figure>`;
};
// The adapters, by the subject's unit rank (SUBJECTS rank); the specifics are listed at the top of this file.
const NODE_PHOTOS = {
  // The corals: the genus is the unit; photos curated per genus (curation.json genera[<genus>]).
  genus: {
    live: n => coralLive(n),
    removed: units =>
      units.flatMap(n =>
        (entry(n).hide || []).map(f => {
          const p = photos(n).find(x => x.f === f);
          return {
            f,
            unit: n,
            thumb: p ? `<img src="${img(p, 1)}" alt="" loading="lazy">` : '',
            cap: `<a class="adm-gen" href="${esc(genusHref(n))}"><i>${esc(n)}</i></a>${p ? `<span class="adm-src view">${esc(label(n, viewOf(n, p)))}</span>${srcTag(p)}` : `<code class="adm-t">${esc(f)}</code>`}`
          };
        })
      ),
    excluded: units => npUnder(NODE_PHOTOS.genus.excludedAll(), units),
    // every excluded photo as an item with its thumbnail and caption (a photo gone from data.json: its iNaturalist thumbnail)
    excludedAll: () => {
      const io = id => `https://inaturalist-open-data.s3.amazonaws.com/photos/${id}/small`;
      return npExcluded(DRAFT.exclude, PHOTOS, Object.keys(DATA.gen), DATA.course).map(it => ({
        ...it,
        thumb: !it.gone
          ? `<img src="${img(it.p, 1)}" alt="" loading="lazy">`
          : it.inat
            ? `<img src="${io(it.inat)}.jpg" alt="" loading="lazy" data-ext="0">`
            : '',
        cap: `${it.unit ? `<a class="adm-gen" href="${esc(genusHref(it.unit))}"><i>${esc(it.unit)}</i></a>` : `<span class="adm-gen">${it.lecture ? 'IMR lecture' : 'no genus'}</span>`}${!it.gone ? srcTag(it.p) : it.inat ? `<a class="adm-src" href="https://www.inaturalist.org/photos/${it.inat}" target="_blank" rel="noopener">iNat ↗</a>` : it.slide ? `<span class="adm-src">IMR lecture</span> <i>slide ${esc(String(it.slide))}</i>` : ''}`
      }));
    },
    orphans: () => NODE_PHOTOS.genus.excludedAll().filter(it => !it.unit),
    back: it => ACT.hide(it.unit, it.f),
    restore: it => {
      DRAFT.exclude = {...(DRAFT.exclude || {})};
      delete DRAFT.exclude[it.f];
      saveDraft();
      render();
    },
    zoom: (it, kind) => (kind === 'back' ? zoom(it.unit, it.f) : it.p && zoomOne(it.p))
  },
  // The fish and the sea slugs (unit rank: the family): their body is renderFishUnits'; no list yet (see the top).
  family: {live: null, removed: null, excluded: null, orphans: null}
};
const npOf = () => NODE_PHOTOS[ASUBJ.rank] || {};
// The lists of node id for the tree T and the view's first root: the page's Removed and Excluded sections, '' when the
// subject has none or they are empty (a leaf page with nothing taken off shows nothing: rule A2).
let NP_ITEMS = new Map(); // the items drawn, by kind and photo: what the binder acts on
function npLists(T, sel, first) {
  const A = npOf(),
    units = ttLeaves(T, sel),
    rm = A.removed ? A.removed(units) : [],
    ex = A.excluded ? A.excluded(units) : [],
    orph = first && A.orphans ? A.orphans() : [],
    sec = (cls, title, L, kind) => {
      L.forEach(it => NP_ITEMS.set(kind + ':' + it.f, it));
      return L.length
        ? `<section class="adm-row adm-np ${cls}" data-np-sec="${kind}"><h3>${title} <small>${L.length}</small></h3><div class="adm-grid adm-qgrid">${L.map(it => npTile(it, kind)).join('')}</div></section>`
        : '';
    };
  NP_ITEMS = new Map();
  return (
    sec('adm-npr', 'Removed from the site', rm, 'back') +
    sec('adm-npx', 'Excluded', ex, 'restore') +
    sec('adm-npx adm-nporph', 'Excluded, no genus any more', orph, 'restore')
  );
}
// The counts the tags use: the genera (units) holding at least one photo taken off the site / excluded.
const npCount = {
  removed: n => (npOf().removed ? npOf().removed([n]).length : 0),
  excluded: n => (npOf().excluded ? npOf().excluded([n]).length : 0)
};
// The clicks of the lists in scope: Put back, Restore, Enlarge; an excluded photo's thumbnail from iNaturalist tries .jpg,
// .jpeg then .png (its extension is unknown).
function npBind(scope) {
  const A = npOf();
  scope.querySelectorAll('[data-np-sec]').forEach(s => {
    const kind = s.dataset.npSec;
    s.querySelectorAll('figure[data-f]').forEach(t => {
      const it = NP_ITEMS.get(kind + ':' + t.dataset.f);
      if (!it) return;
      t.querySelectorAll('[data-np]').forEach(b => {
        b.onclick = () => (b.dataset.np === 'zoom' ? A.zoom(it, kind) : A[b.dataset.np](it));
      });
    });
  });
  scope.querySelectorAll('img[data-ext]').forEach(
    im =>
      (im.onerror = () => {
        const i = Number(im.dataset.ext) + 1,
          E = ['jpg', 'jpeg', 'png'];
        if (i < E.length) {
          im.dataset.ext = i;
          im.src = im.src.replace(/\.\w+$/, '.' + E[i]);
        } else im.replaceWith(Object.assign(document.createElement('span'), {className: 'none', textContent: 'no preview'}));
      })
  );
}

// ---- The corals' live part: a genus's photos per view (what the Genera › Live page was) ----
// n: a genus; returns {bar, body, bind}: the tools its page's bar adds to the Tree's (zooms, ✓ Validated, what it needs, the
// view filter, the origin chips), its body (the views' grids with the tiles' tools, Candidates, Not this genus) and bind(),
// to call once both are in the page. Every click writes the draft (rule A1), one Undo step, as before.
function coralLive(n) {
  const k = entry(n),
    cv = coverOf(n);
  SHOWN_COVER = cv && cv.f;
  const R = rows(n),
    gv = R.some(([v]) => v === GVIEW) ? GVIEW : 'all',
    one = gv !== 'all';
  const body = R.filter(([v]) => !one || v === gv)
    .map(([v]) => {
      const r = rowOf(n, v),
        out = [...r.feat, ...r.rest].filter(p => !shown(p)).length;
      return `<section class="adm-row"><h3>${label(n, v)} <small>${r.feat.length + r.rest.length} photo${r.feat.length + r.rest.length === 1 ? '' : 's'}${out ? ` · <b>${out} filtered out</b>` : ''}</small></h3>
      <div class="adm-grid" data-drop="${v}">${r.feat.map((p, i) => (shown(p) ? tile(n, p, v, {num: i + 1, auto: !r.pinned.includes(p.f), last: i === r.feat.length - 1, cls: 'is-feat'}) : '')).join('')}${(sh =>
        r.rest
          .filter(shown)
          .map(p => tile(n, p, v, sh.includes(p) ? {num: FEAT + 1 + sh.indexOf(p), sheet: true} : {}))
          .join(''))(r.rest.filter(p => !p.multi && !p.extra).slice(0, SHEET - r.feat.length))}</div>
      ${r.feat.length + r.rest.length ? '' : '<p class="note">No photo in this view.</p>'}</section>`;
    })
    .join('');
  const P = unused(n),
    Ps = P.filter(shown),
    two = lv(n) === 2;
  const candTile =
    p => `<figure class="adm-tile is-cand" data-f="${esc(p.f)}" data-drag><button type="button" class="adm-ph" data-act="zoom" aria-label="Enlarge"><img ${crSrc(p, 1)} alt="" loading="lazy" draggable="false"></button>${GRIP}${XBTN}
    <figcaption>${srcTag(p)}${rejected(p.f) ? '<span class="adm-src rej" title="Rejected">rejected</span>' : ''}<span class="adm-t">${esc(p.t || '')}</span></figcaption>
    <div class="adm-acts">${qSeg(p)}${fSeg(p)}<span class="adm-qseg adm-vseg" role="group" aria-label="View">${VIEWS.filter(
      ([w]) => !(two && w === 'medium')
    )
      .map(([w]) => `<button type="button" data-act="addc" data-to="${w}" title="Add to ${label(n, w)}">${label(n, w)}</button>`)
      .join('')}</span>${p.from ? '' : notThis(n)}</div></figure>`;
  // Candidates: set apart from the views and folded by default; open or closed is remembered.
  const candRow = P.length
    ? `<details class="adm-row adm-cands"${store.get('reefid-admin-cands', false) ? ' open' : ''}><summary><h3>Candidates <small>${P.length} photo${P.length > 1 ? 's' : ''} not on the site${P.length - Ps.length ? ` · <b>${P.length - Ps.length} filtered out</b>` : ''}</small></h3></summary>
    <div class="adm-grid">${Ps.map(candTile).join('')}</div></details>`
    : '';
  const O = outOf(n),
    outRow = O.length
      ? `<section class="adm-row adm-out"><h3>Not this genus <small>${O.length} photo${O.length > 1 ? 's' : ''} taken out of <i>${esc(n)}</i></small></h3>
    <div class="adm-grid">${O.map(
      p => `<figure class="adm-tile is-hidden" data-f="${esc(p.f)}"><button type="button" class="adm-ph" data-act="zoom" aria-label="Enlarge"><img src="${img(p, 1)}" alt="" loading="lazy"></button>
      <figcaption>${srcTag(p)}<span class="adm-t">${outs(n)[p.f] === 'cmp' ? 'look-alike comparison' : '→ ' + esc(outs(n)[p.f])}</span></figcaption>
      <div class="adm-acts"><button type="button" data-act="out" data-to="back">Put back</button></div></figure>`
    ).join('')}</div></section>`
      : '';
  const cnt = o => [...photos(n), ...P].filter(p => origin(p) === o).length;
  // One view shown: Candidates and Not this genus are not per view, so they hide too, with one line saying what is hidden.
  const hidRow = one
    ? (L =>
        L.length
          ? `<p class="note adm-gvnote">Hidden: ${L.join(' · ')} <button type="button" class="adm-link" data-gv="all">All views</button></p>`
          : '')(
        [
          [P.length, 'candidate', 'candidates'],
          [O.length, 'not this genus', 'not this genus']
        ]
          .filter(x => x[0])
          .map(([c, a, b]) => `${c} ${c === 1 ? a : b}`)
      )
    : '';
  const gvSeg = FB.views({key: 'gv', cur: gv, items: [['all', 'All'], ...R.map(([v]) => [v, label(n, v)])], seg: true});
  const bar = `<a class="adm-sheet" href="./?draft#${routeOut('g-' + n)}" target="_blank" rel="noopener" title="Genus sheet" aria-label="Open the sheet">↗</a><span class="adm-qseg adm-lvseg" role="group" aria-label="Zooms" title="Zooms">${[3, 2].map(x => `<button type="button" data-lv="${x}" aria-pressed="${lv(n) === x}">${x} zooms</button>`).join('')}</span>${(nd => `<button type="button" class="adm-okbtn" data-ok aria-pressed="${!!k.ok}" title="Validated">✓ Validated</button>${nd.length ? `<b class="warnc adm-needs">${nd.map(esc).join(' · ')}</b>` : ''}${poorIn(n).length ? `<b class="adm-needs adm-warn">${poorIn(n).map(esc).join(' · ')}</b>` : ''}`)(needs(n))}${gvSeg}${FB.origins({cnt})}`;
  const warn = missing(n).length
    ? `<p class="warn"><b>${missing(n).length} choice${missing(n).length === 1 ? '' : 's'} name a photo that is no longer in the data</b>: ${missing(
        n
      )
        .map(f => `<code>${esc(f)}</code>`)
        .join(
          ', '
        )}. Kept but no longer applied. <button type="button" class="adm-link" data-forget>Forget them</button> (Undo brings them back), or ask Pierre.</p>`
    : '';
  const bind = scope => {
    bindBar(scope, {redraw: render});
    const okb = scope.querySelector('[data-ok]');
    if (okb)
      okb.onclick = () => {
        const nd = needs(n);
        if (!k.ok && nd.length) {
          toast('Not ready: ' + nd.join(' · '));
          return;
        }
        edit(n, k => {
          if (k.ok) delete k.ok;
          else k.ok = true;
        });
      };
    // Forget choices naming photos no longer in the data: one click, one Undo step, only on this genus (never automatic).
    const fg = scope.querySelector('[data-forget]');
    if (fg)
      fg.onclick = () => {
        const gone = new Set(missing(n));
        edit(n, k => {
          if (gone.has(k.cover)) delete k.cover;
          if (k.feat)
            Object.keys(k.feat).forEach(v => {
              k.feat[v] = k.feat[v].filter(f => !gone.has(f));
              if (!k.feat[v].length) delete k.feat[v];
            });
          if (k.hide) {
            k.hide = k.hide.filter(f => !gone.has(f));
            if (!k.hide.length) delete k.hide;
          }
          ['move', 'add', 'out'].forEach(m => {
            if (k[m]) {
              gone.forEach(f => delete k[m][f]);
              if (!Object.keys(k[m]).length) delete k[m];
            }
          });
        });
      };
    scope.querySelectorAll('[data-lv]').forEach(
      b =>
        (b.onclick = () => {
          const x = Number(b.dataset.lv);
          edit(n, k => {
            if (x === (DATA.gen[n].levels === 2 ? 2 : 3)) delete k.lv;
            else k.lv = x;
          });
        })
    );
    const cd = scope.querySelector('.adm-cands');
    if (cd) cd.ontoggle = () => store.set('reefid-admin-cands', cd.open);
    bindTiles(scope, () => n);
    bindQ();
    bindF(scope);
    bindDrag(n);
  };
  return {bar, body: warn + hidRow + body + (one ? '' : candRow + outRow), bind, cover: cv};
}
