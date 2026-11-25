  // The genera the games play, defined once for the app, the admin and tools/fetch_local.py (tools/genera.py reads the
  // two lists below from this file; docs/spec/quiz.md "Bonus genera", docs/LEARNING.md "Millepora and the bonus
  // genera"): BENTHIC, Millepora, a slate genus (app.js isBenthic); BONUS, the opt-in genera off the slate.
  // slateOf(d) = the slate as the games teach it and the IMR slate score counts it (app.js slateGenera);
  // gameOf(d) = every genus a game can ask (slate + BONUS), the admin's game genera and the one scale the global
  // progress counts for every coral player, opted in or not (app.js UNITS scale; rule L6); the rest of
  // data.json "x" are Key-only. d = data.json as served ({gen, x: {gen}}), or the admin's copy, whose DATA.gen also holds the "x" genera:
  // a genus of d.x.gen is never a slate genus by its key in d.gen.
  const BENTHIC = ['Millepora'],
    BONUS = ['Isopora', 'Leptoseris', 'Heliopora', 'Sandalolitha', 'Pleuractis'];
  const xGen = d => (d && d.x && d.x.gen) || {};
  function slateOf(d) {
    const X = xGen(d);
    return [...Object.keys((d && d.gen) || {}).filter(n => !X[n]), ...BENTHIC.filter(n => X[n])];
  }
  function gameOf(d) {
    const X = xGen(d);
    return [...slateOf(d), ...BONUS.filter(n => X[n])];
  }
  // The game photos of a subject's units, for the sheet's photo exposure per player (docs/LEARNING.md "Photo exposure";
  // docs/reviews/2026-11-06-photo-exposure-study.md), as its games can draw them: SUBJECTS pool names the site's files a
  // subject reads and its builder here, which gets them parsed, in that order. slots: data.json with Pierre's curation
  // and the photos per context applied (as app.js build), the game list of every game genus (gameOf) in each view;
  // entries: the photos of each entry played (treePhotos, treeGen views.wide). Only which photos are in play matters
  // here, not their order (no picks, no automatic quality). Not applied: the Colony slot's "form not visible" rule
  // (model.js photoSet: a handful of photos, most kept by the one-form exception, which needs app.js imrFormsOf).
  const POOLS = {
    slots: ([raw, cur]) => {
      const d = JSON.parse(JSON.stringify(raw)),
        out = {};
      applyCuration(d, cur);
      applySlots(d, cur);
      if (d.x) {
        const x = {gen: d.x.gen, course: {}, cand: d.cand};
        applyCuration(x, cur);
        applySlots(x, cur);
      }
      gameOf(raw).forEach(n => {
        const g = d.gen[n] || xGen(d)[n];
        // The games' Research Grade rule for the genera off data.json gen (app.js gamePhotoOk: Millepora, the bonus
        // genera).
        if (g) out[n] = VIEWS.flatMap(([v]) => ((g.sl || {})[v] || {}).game || []).filter(p => !g.x || p.own || !p.gid);
      });
      return out;
    },
    // entries: a tree subject's files by what each is (SUBJECTS pool as: f, ph, gm, cur), its part of the curation
    // (treeCur), its units at its unit rank (unitRankOf: the sea slugs' genera, the fish's families); a subject whose
    // units are below its families (treeGen unit) keeps those units only, its families being structure.
    entries: (L, S) => {
      const as = (S && S.pool && S.pool.as) || [],
        x = k => (as.includes(k) ? L[as.indexOf(k)] : null),
        ph = x('ph') || {},
        F = treeGen(
          x('f') || {},
          treePhotos(ph.photos, (treeGameRead(x('gm')) || {}).photos, treeCur(S, x('cur'))),
          ph.sheet,
          unitRankOf(S)
        );
      return Object.fromEntries(
        Object.values(F.gen)
          .filter(g => !g.wink && (!F.unit || g.rank === F.unit))
          .map(g => [g.id, g.views.wide])
      );
    }
  };
  // unitPool(S, files): {unit: [[photo file, …] for each colony]}, subject S's game photos grouped by colony (one
  // observation, o; a photo without one stands alone), its units under the ids its answer log holds (renamedId, with the
  // photo's species: a fish entry logs as its family); null when S names no pool or one of its files is missing.
  function unitPool(S, files) {
    const P = S && S.pool,
      make = P && POOLS[P.of];
    if (!make || !Array.isArray(files) || files.length < P.files.length || files.some(x => !x)) return null;
    const by = {};
    Object.entries(make(files, S) || {}).forEach(([n, L]) =>
      (L || []).forEach(p => {
        if (!p || !p.f) return;
        const O = (by[renamedId(S, n, p.t)] = by[renamedId(S, n, p.t)] || {}),
          c = (O[String(p.o || p.f)] = O[String(p.o || p.f)] || []);
        if (!c.includes(p.f)) c.push(p.f);
      })
    );
    return Object.fromEntries(Object.entries(by).map(([u, O]) => [u, Object.values(O)]));
  }
  // exposureOf(rows, pool): each player's photo exposure in one subject, from that subject's answer-log rows ([player,
  // time ms, unit shown, answered, right, mode, photos], any order)
  // and its unitPool: {player: [seen, of, hit, asked, units]}.
  // - Seen % = seen / of: the distinct game photos the player has been shown, out of the game photos of the units they
  //   have met (a question on it; units: how many, those with no game photo left out).
  // - Spread % = hit / asked, in time order: of the questions on a unit asked while it still had game colonies the player
  //   had never been shown, the share that showed one (a colony is one observation; a photo out of play now counts as a
  //   colony of its own). A count of colonies seen against questions would hide repeats (A, A, B scores 100%).
  function exposureOf(rows, pool) {
    const P = pool || {},
      col = new Map(),
      by = Object.create(null); // by player, no prototype (trustOf)
    Object.entries(P).forEach(([u, L]) => L.forEach((c, i) => c.forEach(f => col.set(u + '|' + f, i))));
    (rows || [])
      .map((r, i) => [r, i])
      .filter(([r]) => r && r[0] && P[r[2]] && String(r[6] || '').trim())
      .sort((a, b) => (Number(a[0][1]) || 0) - (Number(b[0][1]) || 0) || a[1] - b[1])
      .forEach(([r]) => {
        const u = String(r[2]),
          b = (by[r[0]] = by[r[0]] || {hit: 0, asked: 0, U: {}}),
          s = (b.U[u] = b.U[u] || {ph: new Set(), co: new Set(), left: P[u].length}),
          fs = String(r[6]).split(/\s+/).filter(Boolean),
          cs = new Set(fs.map(f => (col.has(u + '|' + f) ? col.get(u + '|' + f) : 'out|' + f)));
        if (s.left > 0) {
          b.asked++;
          if ([...cs].some(c => !s.co.has(c))) b.hit++;
        }
        cs.forEach(c => {
          if (s.co.has(c)) return;
          s.co.add(c);
          if (typeof c === 'number') s.left--;
        });
        fs.forEach(f => col.has(u + '|' + f) && s.ph.add(f));
      });
    return Object.fromEntries(
      Object.entries(by).map(([w, b]) => {
        const U = Object.entries(b.U);
        return [
          w,
          [
            U.reduce((t, [, s]) => t + s.ph.size, 0),
            U.reduce((t, [u]) => t + P[u].reduce((k, c) => k + c.length, 0), 0),
            b.hit,
            b.asked,
            U.length
          ]
        ];
      })
    );
  }
  // The starred (★) genera: on the slate, not numbered (data.json gen[n].n 0, not surveyed by IMR), there because they
  // look like surveyed genera (rule L5). lectureGroup(d, n): the IMR lecture group a genus is shown in, its own
  // (ig), else, for a ★ genus the lecture doesn't group, the group most of its Coral Finder look-alikes belong to (ties:
  // the first listed); 0 for none (app learn.js shownGroup). starRefs(d, n): the surveyed look-alikes in that group, the
  // genera its card names ("★ look-alike of Turbinaria, Tubastraea", learn.js starNote); [] for any other genus.
  // A ★ genus opens only once the genus its card compares it to has been met (its card, "Like Turbinaria, but corallites
  // about 6 mm", means nothing before Turbinaria). One engine (rule S1; one-engine audit step 4): the flat subject's build
  // writes the references on the unit's record as data, starAfter(d): `after`, the units it opens after (app.js build,
  // tools/ratedworld.js coralUnits, last, once its look-alikes, groups and slate are final), and the opening reads that
  // field on any subject's unit, never the corals' file: afterWaits(u, list, met), true while one of the units u.after
  // names is in list (the units the draw can open) and not met. A tree unit writes none, so it never waits. A reference
  // is always a surveyed genus, which never waits itself, and one not in the list never holds n back: no unit can wait
  // for ever.
  function lectureGroup(d, n) {
    const G = (d && d.gen) || {},
      g = G[n];
    if (!g || xGen(d)[n]) return 0;
    if (g.ig) return g.ig;
    const L = (g.look || []).filter(b => G[b] && G[b].ig),
      c = {};
    L.forEach(b => (c[G[b].ig] = (c[G[b].ig] || 0) + 1));
    return L.reduce((best, b) => (c[G[b].ig] > c[best] ? G[b].ig : best), L.length ? G[L[0]].ig : 0) || 0;
  }
  function starRefs(d, n) {
    const G = (d && d.gen) || {},
      X = xGen(d),
      g = G[n];
    if (!g || g.n || X[n]) return [];
    const k = lectureGroup(d, n);
    return (g.look || []).filter(b => G[b] && G[b].n && !X[b] && G[b].ig === k);
  }
  function starAfter(d) {
    Object.keys((d && d.gen) || {}).forEach(n => {
      const g = d.gen[n],
        R = starRefs(d, n);
      if (!isObj(g)) return;
      if (R.length) g.after = R;
      else delete g.after;
    });
    return d;
  }
  const afterWaits = (u, list, met) => ((u && u.after) || []).some(r => list.includes(r) && !met(r));

  // Photos on R2 (docs/ARCHITECTURE.md "Photos"): the site's photos (img/<f>.webp and its -m, -s,
  // -t files) are read from the Cloudflare R2 bucket that tools/r2_sync.sh mirrors img/ to, same paths under this base;
  // the site's own img/ is the fallback (app.js / admin.js photoFail, sw.js photo). The one switch: '' here sends the
  // app, the admin and the Coral ID Key back to img/ (sw.js only caches what it is asked for).
  const PHOTO_BASE = 'https://pub-934250f83b884a4f890497f2027ce251.r2.dev/';
  // The same files on the site: every R2 address in s (a URL, a srcset, an inline style) made relative again.
  const photoLocal = s => (PHOTO_BASE && typeof s === 'string' ? s.split(PHOTO_BASE).join('') : s);

  // Photos out of the repo (docs/ROADMAP.md): git keeps only the photos with no other backup (IMR lecture photos, our own
  // drawings); the photos with an online original (data.json / data/cand.json / fish-photos.json src: iNaturalist, Pierre's
  // own iNaturalist photos, FishBase) are to leave img/. So once R2 fails, a photo with an online original is read from
  // that original, at a light size, and only the others from the site's img/ (app.js photoFail, quiz.js pump, admin.js).
  // Our files are 240 ('t'), 480 ('s'), 960 ('m') and 1600 px (''); iNaturalist serves small (240 px), medium (500 px),
  // large (1024 px) and the original (up to 2048 px, often several MB, never asked for here).
  const ONLINE_SIZE = {t: 'small', s: 'medium', m: 'large', '': 'large'};
  // An online original (src) at the size closest to one of our files. Other hosts (FishBase: one file per photo, about
  // 500 px wide) as they are.
  const photoOnline = (src, size) => String(src).replace('/original.', `/${ONLINE_SIZE[size || ''] || 'large'}.`);
  // The photo file a site address names, on R2 or on the site: {f, size}, or null for any other address.
  function photoFileOf(u) {
    const m = /(?:^|\/)img\/([^/?#\s]+?)(?:-([tsm]))?\.webp(?:[?#]|$)/.exec(photoLocal(String(u || '')));
    return m ? {f: m[1], size: m[2] || ''} : null;
  }
  // The address that replaces a site photo's address u once R2 has failed: its online original at the same size when it
  // has one (look(f): the photo's record, with src), else the same file on the site. Any other address as it is.
  function photoAway(u, look) {
    const x = photoFileOf(u),
      p = x && look ? look(x.f) : null;
    return !x ? u : p && p.src ? photoOnline(p.src, x.size) : photoLocal(u);
  }
  // Every R2 address in a string (an src, a srcset, an inline style) replaced so.
  const R2_ADDR = PHOTO_BASE ? new RegExp(PHOTO_BASE.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&') + 'img/[^\\s"\'(),]+', 'g') : null;
  const photoAwayAll = (s, look) => (R2_ADDR && typeof s === 'string' ? s.replace(R2_ADDR, u => photoAway(u, look)) : s);
  // Whether one address is on R2: parsed as a URL, its origin (scheme, host and port, compared whole) is PHOTO_BASE's and
  // its path is under PHOTO_BASE's. An address that only names R2 elsewhere (in its path or query, before an @, inside a
  // longer host) is not on R2, nor is a relative or unparsable one. The URLs are parsed here, never when the file loads:
  // the sheet script's copy of this file (Code.gs) runs where URL does not exist.
  function photoOnR2(u) {
    if (!PHOTO_BASE || typeof u !== 'string') return false;
    try {
      const a = new URL(u),
        b = new URL(PHOTO_BASE);
      return a.origin === b.origin && a.pathname.startsWith(b.pathname);
    } catch (e) {
      return false;
    }
  }
  // Whether a string (an src, a srcset, an inline style) holds an R2 address: each absolute address in it tested whole.
  const photoHasR2 = s => typeof s === 'string' && (s.match(/https?:\/\/[^\s"'(),]+/g) || []).some(photoOnR2);
  // An element whose R2 photo failed (an <img>, or the figure holding a game photo's backdrop): its src, srcset, data-lo
  // (the 480 px fallback) and inline style point at the photo's online original, or at the site's copies for a photo with
  // none (no look: the site for every photo). keepLo: data-lo stays on R2 (under the service worker, which keeps photos
  // offline under their R2 address: the 480 px step then tries the offline copy first). True when it had an R2 address.
  // srcset before src: each change starts a new load, and the browser picks from the srcset.
  function photoFallback(el, look, keepLo) {
    let hit = false;
    if (PHOTO_BASE && el && el.getAttribute)
      for (const a of ['data-lo', 'style', 'srcset', 'src']) {
        const v = a === 'data-lo' && keepLo ? null : el.getAttribute(a);
        if (photoHasR2(v)) {
          el.setAttribute(a, photoAwayAll(v, look));
          hit = true;
        }
      }
    return hit;
  }
  // Every photo record (an object with f and src) under the roots given (data.json as built, the fish data), by name and
  // by online original: the fallback's look and the crops' reverse lookup.
  function photoIndex(...roots) {
    const f = new Map(),
      src = new Map(),
      seen = new Set();
    const walk = o => {
      if (!o || typeof o !== 'object' || seen.has(o)) return;
      seen.add(o);
      if (Array.isArray(o)) return o.forEach(walk);
      if (typeof o.f === 'string' && typeof o.src === 'string') {
        if (!f.has(o.f)) f.set(o.f, o);
        if (!src.has(o.src)) src.set(o.src, o);
      }
      for (const k in o) if (o[k] && typeof o[k] === 'object') walk(o[k]);
    };
    roots.forEach(walk);
    return {f, src};
  }
  // The crop to draw on an online original shown at address u (photoAway's): the site's files have Pierre's crop baked in
  // (curation.json crop, data.json cr, tools/fetch_approved.py), the original has not. As object-view-box
  // inset(top right bottom left), as the admin's crop preview (admin.js crSrc); a browser without it shows the whole
  // photo. '' for an uncropped photo, a photo still remote (r: 1: shown whole from iNaturalist anyway) or any other address.
  function photoCropOf(u, idx) {
    if (!idx || typeof u !== 'string') return '';
    const p = idx.src.get(u.replace(/#.*$/, '').replace(/\/(?:small|medium|large)\.(\w+)$/, '/original.$1')),
      c = p && !p.r && p.cr,
      pc = v => +(v * 100).toFixed(1);
    return Array.isArray(c) && c.length === 4 ? `inset(${pc(c[1])}% ${pc(1 - c[2])}% ${pc(1 - c[3])}% ${pc(c[0])}%)` : '';
  }

  // A photo that fails on R2 is asked from R2 once more after PHOTO_RETRY ms before any other source (a load test saw
  // about 1 request in 1000 fail on passing network errors, which a second try gets). An
  // element whose R2 photo fails for the first time: true, and a probe asks R2 again; if it loads, the element's src
  // and srcset are set again (the file now comes from the browser's cache), else fallback(el) runs (photoFallback).
  // The element keeps its attributes meanwhile. False otherwise: the caller falls back at once.
  const PHOTO_RETRY = 800;
  function photoRetry(el, fallback) {
    if (!PHOTO_BASE || !el || !el.getAttribute || !el.dataset || el.dataset.r2try) return false;
    const src = el.getAttribute('src') || '',
      set = el.getAttribute('srcset') || '',
      u = el.currentSrc || src;
    if (!photoOnR2(u)) return false;
    el.dataset.r2try = '1';
    setTimeout(() => {
      const t = new Image();
      t.onload = () => {
        if (set) el.setAttribute('srcset', set);
        if (src) el.setAttribute('src', src);
      };
      t.onerror = () => fallback(el);
      t.src = u;
    }, PHOTO_RETRY);
    return true;
  }

