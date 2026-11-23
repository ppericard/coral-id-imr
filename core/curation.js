  // Pierre's curation and the photos per context (here, not in app.js, so the rules can be tested).
  const VIEWS = [
    ['wide', 'Colony'],
    ['medium', 'Close-up'],
    ['macro', 'Corallites']
  ];
  const allPhotos = g => VIEWS.flatMap(([v]) => (g.views[v] || []).map(p => ({...p, view: v})));
  // Editorial curation from curation.json (edited in admin.html): per genus, cover photo, featured photos
  // per view (in order), hidden photos and photos moved to another view. Hidden photos leave games too.
  // Candidates (data.json cand, not shown until approved) join a view when listed in add {photo: view}.
  function applyCuration(d, c) {
    // The Coral Finder book's crops are out of the app (copyrighted; docs/ARCHITECTURE.md "Photos"). curation.json still
    // names some (rule A1: never rewritten): those ids match no photo, so every step below drops them
    // (tests/nobook.test.js).
    // Excluded photos (exclude: {f: reason}) leave every list first: genera, lecture photos, candidates, comparisons.
    // So do the coral skeleton photos (data.json skel: 1, rule P6: the features cannot be seen properly;
    // tools/apply_skeletons.py; tests/skeletons.test.js).
    const X = (c && c.exclude) || {},
      keep = L => (L || []).filter(p => !X[p.f] && !p.skel);
    Object.values(d.gen).forEach(g =>
      ['views', 'more'].forEach(s =>
        Object.keys(g[s] || {}).forEach(v => {
          g[s][v] = keep(g[s][v]);
        })
      )
    );
    ['course', 'cand'].forEach(s =>
      Object.keys(d[s] || {}).forEach(n => {
        d[s][n] = keep(d[s][n]);
      })
    );
    if (d.cmp) d.cmp = keep(d.cmp);
    // "Several corals" photos Pierre marked as one coral (single: {f: 1}) are normal photos again (games and sheet).
    const ONE = (c && c.single) || {};
    if (Object.keys(ONE).length)
      Object.entries(d.gen).forEach(([n, g]) => {
        VIEWS.forEach(([v]) => {
          const L = (g.more || {})[v];
          if (!L) return;
          L.filter(p => ONE[p.f]).forEach(p => (g.views[v] = g.views[v] || []).push(p));
          g.more[v] = L.filter(p => !ONE[p.f]);
        });
        (d.course[n] || []).forEach(p => {
          if (ONE[p.f]) delete p.multi;
        });
      });
    // "Not this genus" (out: {f: 'cmp' | genus}) runs first for every genus, so a photo given to another genus
    // can be featured or picked as cover there; 'cmp' sends it to the look-alike comparison images (d.cmp).
    Object.entries((c && c.genera) || {}).forEach(([n, k]) => {
      const g = d.gen[n];
      if (!g) return;
      Object.entries(k.out || {}).forEach(([f, to]) => {
        let p = null,
          at = null;
        VIEWS.forEach(([v]) =>
          ['views', 'more'].forEach(s => {
            const L = (g[s] || {})[v] || [],
              i = L.findIndex(x => x.f === f);
            if (i >= 0) {
              p = L.splice(i, 1)[0];
              at = [s, v];
            }
          })
        );
        const ci = (d.course[n] || []).findIndex(x => x.f === f);
        if (ci >= 0) {
          p = d.course[n].splice(ci, 1)[0];
          at = ['course'];
        }
        // A candidate sent to another genus becomes a candidate there (shown once added in that genus).
        const ki = ((d.cand || {})[n] || []).findIndex(x => x.f === f);
        if (ki >= 0) {
          p = d.cand[n].splice(ki, 1)[0];
          at = ['cand'];
        }
        if (!p) return;
        if (to === 'cmp') (d.cmp = d.cmp || []).push({...p, g: [n]});
        else if (d.gen[to] && at[0] === 'course') (d.course[to] = d.course[to] || []).push(p);
        else if (d.gen[to] && at[0] === 'cand') ((d.cand = d.cand || {})[to] = d.cand[to] || []).push(p);
        else if (d.gen[to]) {
          const G = d.gen[to],
            S = (G[at[0]] = G[at[0]] || {});
          (S[at[1]] = S[at[1]] || []).push(p);
        }
      });
    });
    Object.entries((c && c.genera) || {}).forEach(([n, k]) => {
      const g = d.gen[n];
      if (!g) return;
      Object.entries(k.add || {}).forEach(([f, v]) => {
        const p = ((d.cand || {})[n] || []).find(x => x.f === f);
        if (p && VIEWS.some(([w]) => w === v)) (g.views[v] = g.views[v] || []).push(p);
      });
      const hide = new Set(k.hide || []),
        mv = k.move || {},
        feat = k.feat || {};
      const regroup = src => {
        const out = {};
        VIEWS.forEach(([v]) =>
          ((src || {})[v] || []).forEach(p => {
            if (hide.has(p.f)) return;
            const w = mv[p.f] || v;
            (out[w] = out[w] || []).push(p);
          })
        );
        return out;
      };
      const all = [...allPhotos(g), ...VIEWS.flatMap(([v]) => (g.more || {})[v] || []), ...(d.course[n] || [])];
      g.views = regroup(g.views);
      g.more = regroup(g.more);
      // Featured photos lead their view, so quick picks (comparisons, first photo of a view) use them too.
      Object.entries(g.views).forEach(([v, L]) => {
        const F = feat[v] || [];
        g.views[v] = [...F.map(f => L.find(p => p.f === f)).filter(Boolean), ...L.filter(p => !F.includes(p.f))];
      });
      if (d.course[n]) d.course[n] = d.course[n].filter(p => !hide.has(p.f)).map(p => (mv[p.f] ? {...p, v: mv[p.f]} : p));
      if (Object.keys(feat).length) g.feat = feat;
      const cv = k.cover && !hide.has(k.cover) && all.find(p => p.f === k.cover);
      if (cv) g.coverP = cv;
      // Zoom levels per genus (curation lv: 2 | 3, admin switch). 2 levels: the Closer photos join Colony, the Closer
      // view disappears; his Closer picks stay in curation.json, so switching back to 3 restores them.
      if (k.lv === 3) delete g.levels;
      if (k.lv === 2 && g.levels !== 2) {
        g.levels = 2;
        ['views', 'more'].forEach(s => {
          const S = g[s] || {};
          if ((S.medium || []).length) S.wide = [...(S.wide || []), ...S.medium];
          delete S.medium;
        });
        if (d.course[n]) d.course[n] = d.course[n].map(p => (p.v === 'medium' ? {...p, v: 'wide'} : p));
      }
    });
  }
  // Photos per context (applySlots; docs/ARCHITECTURE.md "Photos per context"). Every photo kept is used, field and IMR
  // lecture photos alike. Per genus and view, one order whoever took the photo (rule P1: no source priority): by quality,
  // Poor last, then easyRank's ties (the licence where an order allows it, then a fixed hash of the file name, so
  // data.json's order, his own photos first, never decides). Sheet = 3 featured + the next ones in that order (6 in all);
  // games = one list, every photo kept (the featured first, then that order without the licence: the players' answers
  // rate them); Coral ID Key (needs variety) = featured + 5 more photos in that order, a different observation each
  // first. Pierre's picks (feat, hide, quality, use) always win; Claude's suggestions (picks.json feat) come next, then
  // quality. curation.json "use" {f: 'ref'|'game'} keeps a photo on the sheet only or in games only. Nothing is written
  // back: photos left out simply stay unused.
  const CAP = {feat: 3, sheet: 6, inat: 5};
  // A Coral Finder book crop's id (<genus>-cf-<page>-<tag>). The crops are out of the app and the repository;
  // curation.json still names some (rule A1: never rewritten), ids that match no photo.
  const cfCrop = f => /^[a-z]+-cf-\d/.test(f || '');
  // The automatic rating never calls an IMR lecture photo Poor (it misjudges slide images; rule P1: an IMR photo is
  // always evaluated); only Pierre's rating can (autoQ).
  // o.picks = picks.json (Claude's suggested featured photos), o.autoq = quality.json q (automatic rating).
  function applySlots(d, c, o = {}) {
    const AUTOQ = o.autoq || {},
      autoQ = f => {
        const a = AUTOQ[f] || 2;
        return a === 1 && /^imrl?-/.test(f) ? 2 : a;
      };
    const qualOf = (c, f) => ((c && c.quality) || {})[f] || autoQ(f);
    const use = (c && c.use) || {},
      sug = (o.picks || {}).feat || {};
    // k photos from L in order, a different observation each time when possible.
    const take = (L, k) => {
      const out = [],
        seen = new Set();
      [true, false].forEach(fresh =>
        L.forEach(p => {
          if (out.length < k && !out.includes(p) && (!fresh || !seen.has(p.o || p.f))) {
            out.push(p);
            seen.add(p.o || p.f);
          }
        })
      );
      return out;
    };
    const fill = (L, extra, k) =>
      L.length >= k
        ? L
        : [
            ...L,
            ...take(
              extra.filter(p => !L.includes(p)),
              k - L.length
            )
          ];
    Object.entries(d.gen).forEach(([n, g]) => {
      const course = (d.course[n] || []).map(p => ({...p, view: p.v === 'medium' && g.levels === 2 ? 'macro' : p.v}));
      g.sl = {};
      VIEWS.forEach(([v]) => {
        const field = (g.views[v] || []).filter(p => !p.multi),
          q = p => qualOf(c, p.f),
          // By quality (the higher first, Poor last), whoever took the photo (rule P1), then easyRank's ties: an open
          // licence or his own first (rightsRank), then the file name's hash, for the sheet, the featured photos and
          // the Coral ID Key. The game list keeps the quality order alone (byQ0, no licence), its featured lead
          // included, so the draw's ties (model.js photoSet's variety cut, which follows the list) never read a licence.
          // A coral photo has no judged ease nor reference tags: easyRank's first keys are equal for all.
          byQ0 = L => easyRank(L, p => -q(p), false),
          byQr = L => easyRank(L, p => -q(p), true);
        const all = [...field, ...course.filter(p => p.view === v && !p.multi)].filter(p => use[p.f] !== 'game');
        // Sheet order: by quality, Poor photos last, never a Poor photo while better ones exist.
        // Featured = always the first 3: his pinned photos, then the best remaining ones.
        // A pin or a suggestion naming no photo (a removed one: a Coral Finder book crop) is dropped.
        const slot = byQ => {
          const ranked = byQ(all);
          const find = f => all.find(p => p.f === f);
          const pin = ((g.feat || {})[v] || []).map(find).filter(Boolean),
            hint = ((sug[n] || {})[v] || []).map(find).filter(Boolean);
          const pool = [...hint, ...ranked].filter(p => !pin.includes(p)),
            k = CAP.feat - Math.min(pin.length, CAP.feat);
          const feat = [
            ...pin.slice(0, CAP.feat),
            ...fill(
              take(
                pool.filter(p => q(p) !== 1),
                k
              ),
              pool,
              k
            )
          ];
          return {ranked, feat};
        };
        const {ranked, feat} = slot(byQr),
          feat0 = slot(byQ0).feat;
        // Sheet: strictly the first 6 per view in the admin order, the 3 featured then the next 3 (games use them all).
        const more = ranked.filter(p => !feat.includes(p)).slice(0, CAP.sheet - feat.length);
        // Games: field photos and IMR lecture photos, never multi-coral photos.
        const gm = byQ0([...field, ...course.filter(p => p.view === v && !p.multi)].filter(p => use[p.f] !== 'ref'));
        // One list per view (docs/LEARNING.md "Hierarchical photo Elo"): the featured game photos first, then the
        // others by quality, Poor last.
        const lead = feat0.filter(p => gm.includes(p));
        g.sl[v] = {
          feat,
          more,
          game: [...lead, ...gm.filter(p => !lead.includes(p))],
          idkey: [
            ...feat,
            ...take(
              ranked.filter(p => !feat.includes(p)),
              CAP.inat
            )
          ]
        };
        // Featured photos lead their view, so every "first photo of the view" (Look-alikes, Compare, Lab, home) uses them;
        // the rest follow in the same order (byQr), never data.json's, which lists his own photos first (rule P1).
        if (g.views[v]) g.views[v] = [...feat.filter(p => g.views[v].includes(p)), ...byQr(g.views[v].filter(p => !feat.includes(p)))];
      });
    });
  }

