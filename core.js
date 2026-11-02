// Pure functions shared by the app (app.js), the admin (admin.js) and the tests (node --test tests/*.test.js).
// No DOM, no globals of the app: in the browser they become globals (classic script), in Node module.exports.
(function (root) {
  // The draft is never published as a whole copy: it is merged, key by key, onto the latest published curation.
  // merge3(base, mine, theirs): base = the published curation this draft started from; a key I changed since base
  // keeps my value, every other key takes the published one (so choices published from another browser or device
  // are never lost). Objects merge key by key; lists and plain values are single choices. Same choice on both sides = conflict, mine wins.
  const isObj = o => o && typeof o === 'object' && !Array.isArray(o),
    eq = (a, b) => JSON.stringify(a === undefined ? null : a) === JSON.stringify(b === undefined ? null : b);
  // conf (optional): collects the paths where both sides changed the same choice differently, so Publish can say which
  // published choices this draft replaced (the rule stays the same: mine wins).
  function merge3(base, mine, theirs, conf, path = []) {
    const b = isObj(base) ? base : {},
      m = isObj(mine) ? mine : {},
      t = isObj(theirs) ? theirs : {},
      out = {};
    new Set([...Object.keys(b), ...Object.keys(m), ...Object.keys(t)]).forEach(k => {
      const both = isObj(m[k]) && isObj(t[k]);
      if (conf && !both && !eq(m[k], b[k]) && !eq(t[k], b[k]) && !eq(m[k], t[k])) conf.push([...path, k]);
      const v = eq(m[k], b[k]) ? t[k] : eq(t[k], b[k]) ? m[k] : both ? merge3(b[k], m[k], t[k], conf, [...path, k]) : m[k];
      // A copy, never a shared object: setQ & co. edit DRAFT's maps in place, and a map shared with SAVED would change
      // both, hiding the edit from Publish (code review 2026-11-01).
      if (v !== undefined && !(isObj(v) && !Object.keys(v).length && k !== 'genera'))
        out[k] = v && typeof v === 'object' ? JSON.parse(JSON.stringify(v)) : v;
    });
    return out;
  }
  // An old draft saved before drafts kept their base: add what it has on top of the published curation, never remove.
  function mergeOld(mine, theirs) {
    const m = isObj(mine) ? mine : {},
      t = isObj(theirs) ? theirs : {},
      out = {...t};
    Object.keys(m).forEach(k => {
      out[k] = isObj(m[k]) && isObj(t[k]) ? mergeOld(m[k], t[k]) : m[k] === undefined ? t[k] : m[k];
    });
    return out;
  }

  // Two admin tabs in one browser (code re-review 2026-11-01, M4): each keeps its draft in memory and writes all of it to
  // localStorage on every click, so the last tab clicked used to erase the other tab's clicks. When another tab writes its
  // draft, this tab merges it onto its own: shared = the draft both tabs last agreed on (what this tab last wrote or took),
  // mine = this tab's draft, other = the one just written. Returns the merged draft and whether this tab must write it back
  // (it holds clicks the other tab lacks). Compared without key order, so two tabs never bounce the same draft back and forth.
  const canon = o =>
    JSON.stringify(o, (k, v) =>
      isObj(v)
        ? Object.keys(v)
            .sort()
            .reduce((a, x) => ((a[x] = v[x]), a), {})
        : v
    );
  function mergeTabs(shared, mine, other) {
    const draft = merge3(shared, mine, other);
    draft.genera = draft.genera || {};
    return {draft, share: canon(draft) !== canon(other), changed: canon(draft) !== canon(mine)};
  }

  // Two devices on one account (app.js mergeSaved): three-way merge of the per-genus progress. B = the record as last
  // sent or received, P = this device, R = the record just pulled. Counts add up (R + P - B), so neither side's answers
  // are lost or counted twice; the latest local state wins for the per-genus model when this device answered since B.
  function mergeProgress(B, P, R) {
    const Z = {ok: 0, ko: 0, streak: 0},
      out0 = {};
    B = B || {};
    P = P || {};
    R = R || {};
    new Set([...Object.keys(R), ...Object.keys(P)]).forEach(g => {
      const b = B[g] || Z,
        l = P[g] || Z,
        r = R[g] || Z,
        out = {...r};
      out.ok = Math.max(0, (r.ok || 0) + (l.ok || 0) - (b.ok || 0));
      out.ko = Math.max(0, (r.ko || 0) + (l.ko || 0) - (b.ko || 0));
      const mine = (l.ok || 0) + (l.ko || 0) !== (b.ok || 0) + (b.ko || 0) || (l.h || '') !== (b.h || '');
      out.streak = mine ? l.streak || 0 : r.streak || 0;
      if (mine && l.h) out.h = l.h;
      if (mine)
        ['lv', 'run', 'L', 'th', 'ro', 'ex', 'mx'].forEach(k => {
          if (l[k] !== undefined) out[k] = l[k];
          else delete out[k];
        });
      if (l.cor || r.cor) out.cor = 1;
      if (l.du || r.du) out.du = 1;
      // Mix-ups (conf: genus answered instead) and offers (off: genus offered as a wrong choice) add up across devices.
      ['conf', 'off'].forEach(f => {
        const c = {...(r[f] || {})};
        Object.keys(l[f] || {}).forEach(k => {
          const v = (c[k] || 0) + l[f][k] - ((b[f] || {})[k] || 0);
          if (v > 0) c[k] = v;
          else delete c[k];
        });
        if (Object.keys(c).length) out[f] = c;
        else delete out[f];
      });
      // Photos seen [shown, right]: added up like the mix-ups, so two devices never lose or double-count a photo.
      const ps = {...(r.ps || {})};
      Object.keys(l.ps || {}).forEach(f => {
        const x = ps[f] || [0, 0],
          y = l.ps[f],
          z = (b.ps || {})[f] || [0, 0];
        ps[f] = [0, 1].map(i => Math.max(0, x[i] + y[i] - z[i]));
      });
      if (Object.keys(ps).length) out.ps = ps;
      else delete out.ps;
      if (out.ok + out.ko || out.h) out0[g] = out;
    });
    return out0;
  }

  // Two accounts of one person merged in the admin (user management, Code.gs v11): A = the name that goes away, B = the
  // name kept, both as saved by the app (progData: localStorage key -> string). Their answers are different answers, so
  // counts add up (ok, ko, mix-ups, offers, photos seen), milestones are kept if either has them, and the per-genus model
  // (ability th, knowledge L, recent results h...) comes from whichever account answered that genus more. Settings are
  // B's; bonus genera unlocked on either stay unlocked. Returns B's data with the merged progress.
  function mergeUsers(A, B) {
    A = A || {};
    B = B || {};
    const J = (d, k) => {
      try {
        return JSON.parse(d[k] || 'null');
      } catch (e) {
        return null;
      }
    };
    const a = J(A, 'imr-coral-progress') || {},
      b = J(B, 'imr-coral-progress') || {},
      P = {};
    const n = s => (s.ok || 0) + (s.ko || 0),
      add = (x, y) => {
        const o = {...(x || {})};
        Object.keys(y || {}).forEach(k => {
          o[k] = (o[k] || 0) + y[k];
        });
        return o;
      };
    new Set([...Object.keys(a), ...Object.keys(b)]).forEach(g => {
      const x = a[g] || {},
        y = b[g] || {},
        main = n(x) > n(y) ? x : y,
        o = {...(main === x ? y : x), ...main};
      o.ok = (x.ok || 0) + (y.ok || 0);
      o.ko = (x.ko || 0) + (y.ko || 0);
      o.streak = main.streak || 0;
      ['conf', 'off'].forEach(f => {
        const c = add(x[f], y[f]);
        if (Object.keys(c).length) o[f] = c;
        else delete o[f];
      });
      const ps = {...(x.ps || {})};
      Object.keys(y.ps || {}).forEach(f => {
        const p = ps[f] || [0, 0];
        ps[f] = [p[0] + y.ps[f][0], p[1] + y.ps[f][1]];
      });
      if (Object.keys(ps).length) o.ps = ps;
      else delete o.ps;
      if (x.cor || y.cor) o.cor = 1;
      if (x.du || y.du) o.du = 1;
      if (o.ok + o.ko || o.h) P[g] = o;
    });
    const out = {...A, ...B, 'imr-coral-progress': JSON.stringify(P)},
      qa = J(A, 'imr-coral-quiz'),
      qb = J(B, 'imr-coral-quiz');
    if (qa || qb)
      out['imr-coral-quiz'] = JSON.stringify({...(qa || {}), ...(qb || {}), bu: Math.max((qa || {}).bu || 0, (qb || {}).bu || 0)});
    return out;
  }

  // Who rates the photos and the confusions, as tools/sync/Code.gs trusted_ (v17, Pierre 2026-11-02): signed-in players
  // only (row[11] = 1 marks a device that never signed in; a sheet before v17 sends no flag), with TRUST.N answers or more
  // and a right rate clearly above chance (one-sided z of at least TRUST.Z against each question's guess rate).
  const TRUST = {N: 10, Z: 1.645};
  const guessOf = mode => {
    const kq = /\|k(\d)$/.exec(mode);
    return kq ? 1 / Number(kq[1]) : mode.indexOf('quiz-duel') === 0 ? 0.5 : 0.25;
  };
  function trustOf(rows) {
    const T = {},
      out = {};
    rows.forEach(r => {
      if (!r[0]) return;
      const t = (T[r[0]] = T[r[0]] || [0, 0, 0, 0, 0]),
        g = guessOf(r[5]);
      t[0]++;
      t[1] += r[4] ? 1 : 0;
      t[2] += g;
      t[3] += g * (1 - g);
      if (r[11]) t[4] = 1;
    });
    Object.keys(T).forEach(w => {
      const t = T[w];
      out[w] = !t[4] && t[0] >= TRUST.N && (t[1] - t[2]) / Math.sqrt(t[3]) >= TRUST.Z;
    });
    return out;
  }

  // How much one answer moves the photos, as Code.gs PHOTO_W (v17): weight n / (n + N) after n answers of the player,
  // and repeats counted against the player's history with the photo (new: NEW harder; right twice before: KNOWN easier).
  const PHOTO_W = {N: 30, NEW: 0.5, KNOWN: -1};
  // Every player starts as a beginner (Code.gs PLAYER0): about 45% right on an average photo with 4 choices.
  const PLAYER0 = -1;
  // Photo Elo replayed over the answer log (rows [id, time ms, genus shown, answered, right 0|1, mode, photos…]), as
  // tools/sync/Code.gs stats_ does in the sheet: keep the two in step (tests/core.test.js compares them). Every answer
  // moves the player's level; the photos move on trusted players' answers only (trustOf, v17), weighed as above.
  function eloOf(rows) {
    const P = {},
      R = {},
      H = {},
      trust = trustOf(rows),
      sig = x => 1 / (1 + Math.exp(-x));
    rows
      .slice()
      .sort((a, b) => a[1] - b[1])
      .forEach(r => {
        const fs = r[6].split(/\s+/).filter(Boolean);
        if (!r[0] || !fs.length) return;
        const ok = r[4] ? 1 : 0,
          g = guessOf(r[5]),
          ra = (R[r[0]] = R[r[0]] || [PLAYER0, 0]);
        const ph = fs.map(f => (P[f] = P[f] || [0, 0, 0])),
          b = ph.reduce((t, p) => t + p[0], 0) / ph.length + (ph.length === 1 ? 0.5 : 0);
        const d = ok - (g + (1 - g) * sig(ra[0] - b)),
          n = ra[1];
        const hs = fs.map(f => (H[r[0] + '|' + f] = H[r[0] + '|' + f] || [0, 0]));
        if (trust[r[0]]) {
          const fam = hs.reduce((t, h) => t + (!h[0] ? PHOTO_W.NEW : h[1] >= 2 ? PHOTO_W.KNOWN : 0), 0) / hs.length;
          const dp = ok - (g + (1 - g) * sig(ra[0] - b - fam)),
            w = n / (n + PHOTO_W.N);
          ph.forEach(p => {
            p[0] -= (0.8 / (1 + p[2] / 10) / ph.length) * dp * w;
            p[2]++;
            p[1] += ok;
          });
        }
        ra[0] += (0.6 / (1 + n / 40)) * d;
        ra[1]++;
        hs.forEach(h => {
          h[0]++;
          h[1] += ok;
        });
      });
    const out = {};
    Object.keys(P).forEach(f => (out[f] = [Math.round(P[f][0] * 100) / 100, P[f][2], P[f][1]]));
    return out;
  }

  // Confusions between genera (Pierre, 2026-11-01): from the answer log rows (as eloOf; row[10] = the genera offered,
  // space-separated, logged since sheet script v10). pair["A|B"] (A before B alphabetically) = [offered together, mixed up]:
  // one was shown with the other among the choices, and the other was answered. Same counts as Code.gs stats_ conf (tests
  // check it). dir["shown|other"] = [offered, answered] keeps the direction. old["shown|answered"] = mix-ups logged without
  // their choices (before v10): they can't be turned into a rate, only counted.
  function confusionOf(rows) {
    const trust = trustOf(rows);
    rows = rows.filter(r => trust[r[0]]); // trusted players only, as Code.gs stats_ (v17)
    const pair = {},
      dir = {},
      old = {},
      inc = (O, k, took) => {
        const c = (O[k] = O[k] || [0, 0]);
        c[0]++;
        if (took) c[1]++;
      };
    rows.forEach(r => {
      const g = r[2],
        a = r[3],
        ok = r[4],
        ch = String(r[10] || '')
          .split(/\s+/)
          .filter(x => x && x !== g);
      if (!g) return;
      if (!ch.length) {
        if (!ok && a && a !== g) old[g + '|' + a] = (old[g + '|' + a] || 0) + 1;
        return;
      }
      ch.forEach(x => {
        const took = !ok && a === x;
        inc(pair, g < x ? g + '|' + x : x + '|' + g, took);
        inc(dir, g + '|' + x, took);
      });
    });
    return {pair, dir, old};
  }
  // Confusion score of a pair: its mix-up rate when offered together, starting from a prior rate worth CONF.W offers (the
  // declared look-alikes of the IMR lecture and the Coral Finder start high), then following the players' real answers.
  const CONF = {W: 8, LOOK: 0.3, FAM: 0.12, FORM: 0.08, BASE: 0.03, TRAP: 0.2};
  const confScore = (c, prior) => ((c ? c[1] : 0) + CONF.W * prior) / ((c ? c[0] : 0) + CONF.W);
  // One player's own record on a pair (progress P): [times the two were offered together, times mixed up], both directions.
  // Offers are counted since 2026-11-01 (P[g].off); mix-ups logged before that count as offered at least once each.
  function pairConf(P, a, b) {
    const x = P[a] || {},
      y = P[b] || {},
      mix = ((x.conf || {})[b] || 0) + ((y.conf || {})[a] || 0);
    return [Math.max(mix, ((x.off || {})[b] || 0) + ((y.off || {})[a] || 0)), mix];
  }

  // Two admin tabs in one browser share the stored draft. Each write carries _tab: {rev, seen}: its own revision and the
  // revision of the stored draft that tab had last seen. `revs` maps the revisions this tab wrote or took in to their drafts,
  // so the merge base is exactly the draft the other tab started from, even when both clicked before hearing of each other.
  // Returns null for a revision already taken in; an untagged draft (older admin page) merges against `saved`.
  function takeTab(revs, mine, saved, stored) {
    const t = stored._tab || {},
      other = Object.assign({}, stored);
    delete other._tab;
    if (t.rev && revs[t.rev]) return null;
    const m = mergeTabs(revs[t.seen] || saved, mine, other);
    if (t.rev) revs[t.rev] = other;
    return m;
  }

  // Pierre's curation and the photos per context (moved from app.js, code re-review 2026-11-01 M2, so the rules can be tested).
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
    // Coral Finder book photos (data: gen[].book, cropped from the 2022 book) can be switched off site-wide from the
    // admin (curation.json "book": false). Kept apart from the views so games and quizzes never use them (captions).
    if (c && c.book === false)
      Object.values(d.gen).forEach(g => {
        delete g.book;
      });
    // Book photos are candidates: only those Pierre approved in the admin (genera[n].add {f: view}) show, in that view.
    const X0 = (c && c.exclude) || {};
    // Book photos sent to another genus ("Not this", out) are kept here until the out step moves them, then filtered there.
    const G0 = (c && c.genera) || {};
    Object.entries(d.gen).forEach(([n, g]) => {
      if (!g.book) return;
      const A = (G0[n] || {}).add || {},
        O = (G0[n] || {}).out || {};
      g.book = g.book.filter(p => !X0[p.f] && (A[p.f] || O[p.f])).map(p => (A[p.f] && !O[p.f] ? {...p, view: A[p.f]} : p));
    });
    // Excluded photos (exclude: {f: reason}) leave every list first: genera, lecture photos, candidates, comparisons.
    const X = (c && c.exclude) || {},
      keep = L => (L || []).filter(p => !X[p.f]);
    if (Object.keys(X).length) {
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
    }
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
        const bi = (g.book || []).findIndex(x => x.f === f);
        if (bi >= 0) {
          p = g.book.splice(bi, 1)[0];
          at = ['book'];
        }
        // A candidate sent to another genus becomes a candidate there (shown once added in that genus).
        const ki = ((d.cand || {})[n] || []).findIndex(x => x.f === f);
        if (ki >= 0) {
          p = d.cand[n].splice(ki, 1)[0];
          at = ['cand'];
        }
        if (!p) return;
        if (to === 'cmp') (d.cmp = d.cmp || []).push({...p, g: [n]});
        else if (d.gen[to] && at[0] === 'book') (d.gen[to].book = d.gen[to].book || []).push({...p, t: to});
        else if (d.gen[to] && at[0] === 'course') (d.course[to] = d.course[to] || []).push(p);
        else if (d.gen[to] && at[0] === 'cand') ((d.cand = d.cand || {})[to] = d.cand[to] || []).push(p);
        else if (d.gen[to]) {
          const G = d.gen[to],
            S = (G[at[0]] = G[at[0]] || {});
          (S[at[1]] = S[at[1]] || []).push(p);
        }
      });
    });
    // Book photos moved in from another genus show only once added here (add {f: view}).
    Object.entries(d.gen).forEach(([n, g]) => {
      if (!g.book) return;
      const A = (G0[n] || {}).add || {};
      g.book = g.book.filter(p => p.view || A[p.f]).map(p => (p.view ? p : {...p, view: A[p.f]}));
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
      const all = [...allPhotos(g), ...VIEWS.flatMap(([v]) => (g.more || {})[v] || []), ...(d.course[n] || []), ...(g.book || [])];
      // Book photos follow Hide and view moves too (they stay out of g.views, so out of games).
      if (g.book) g.book = g.book.filter(p => !hide.has(p.f)).map(p => (mv[p.f] ? {...p, view: mv[p.f]} : p));
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
        if (g.book) g.book = g.book.map(p => (p.view === 'medium' ? {...p, view: 'wide'} : p));
      }
    });
  }
  // Photos per context (applySlots). Pierre's rule: every IMR photo and every photo of his own is used, with no cap;
  // photos from other iNat observers and approved Coral Finder book photos only fill a set that is short. Per genus
  // and view: sheet = 3 featured + the other IMR/own photos (filled up to 6 in all); games = Easy (the featured),
  // Medium (other good IMR/own photos, filled up to 4), Hard (poor ones, filled up to 4), levels adding up; Coral
  // Finder (needs variety) = featured + 2 photos from other iNat observers + 3 approved book photos. Pierre's picks (feat, hide, quality, use) always win; Claude's suggestions
  // (picks.json feat) come next, then quality. curation.json "use" {f: 'ref'|'game'} keeps a photo on the sheet only
  // or in games only. Nothing is written back: photos left out simply stay unused.
  const CAP = {feat: 3, sheet: 6, medium: 4, hard: 4, inat: 2, book: 3};
  // The automatic rating never calls an IMR lecture photo Poor (Pierre: it misjudges slide images); only his own rating can (autoQ).
  const isCore = p => !!(p.imr || p.own);
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
          byQ = L => L.slice().sort((a, b) => q(b) - q(a));
        const all = [...field, ...course.filter(p => p.view === v && !p.multi)].filter(p => use[p.f] !== 'game');
        // Sheet order (Pierre): IMR photos first, then his own, then other observers, each by quality; Poor photos last.
        const rr = [...byQ(all.filter(p => p.imr)), ...byQ(all.filter(p => !p.imr && p.own))];
        const others = byQ(all.filter(p => !isCore(p)));
        const ranked = [...rr, ...others].sort((a, b) => (q(a) === 1) - (q(b) === 1));
        // Coral Finder book photos (Pierre 2026-11-01): on the sheet when pinned, or to fill a gap after every field photo; never in games.
        const bk = byQ((g.book || []).filter(p => p.view === v)),
          find = f => all.find(p => p.f === f) || bk.find(p => p.f === f);
        const pin = ((g.feat || {})[v] || []).map(find).filter(Boolean),
          hint = ((sug[n] || {})[v] || []).map(find).filter(p => p && !p.cf);
        // Never a Poor photo while better ones exist, except IMR lecture photos (Pierre).
        // Featured = always the first 3 (Pierre): his pinned photos, then the best remaining ones.
        const pool = [...hint, ...ranked].filter(p => !pin.includes(p)),
          k = CAP.feat - Math.min(pin.length, CAP.feat);
        const feat = [
          ...pin.slice(0, CAP.feat),
          ...fill(
            fill(
              take(
                pool.filter(p => p.imr || q(p) !== 1),
                k
              ),
              pool,
              k
            ),
            bk.filter(p => !pin.includes(p)),
            k
          )
        ];
        // Sheet (Pierre): strictly the first 6 per view in the admin order, the 3 featured then the next 3 (games still use them all).
        const more = [...ranked, ...bk].filter(p => !feat.includes(p)).slice(0, CAP.sheet - feat.length);
        // Games: field photos and IMR lecture photos (Pierre 2026-11-01), never multi-coral or book photos.
        const gm = byQ([...field, ...course.filter(p => p.view === v && !p.multi)].filter(p => use[p.f] !== 'ref')),
          core = gm.filter(isCore),
          rest = gm.filter(p => !isCore(p));
        const easy = feat.filter(p => gm.includes(p)),
          left = p => !easy.includes(p);
        const medium = fill(
          core.filter(p => left(p) && q(p) >= 2),
          rest.filter(p => left(p) && q(p) >= 2),
          CAP.medium
        );
        const hard = fill(
          core.filter(p => left(p) && !medium.includes(p)),
          rest.filter(p => left(p) && !medium.includes(p)).reverse(),
          CAP.hard
        );
        const book = bk.filter(p => !feat.includes(p)).slice(0, CAP.book);
        g.sl[v] = {
          feat,
          more,
          easy: easy.length ? easy : take(gm, 3),
          medium,
          hard,
          finder: [
            ...feat,
            ...take(
              others.filter(p => !feat.includes(p) && !p.imr),
              CAP.inat
            ),
            ...book
          ]
        };
        // Featured photos lead their view, so every "first photo of the view" (Look-alikes, Compare, Lab, home) uses them.
        if (g.views[v]) g.views[v] = [...feat.filter(p => g.views[v].includes(p)), ...g.views[v].filter(p => !feat.includes(p))];
      });
    });
  }

  // Global player level (Pierre, 2026-11-01: "good beta testers must not wait 100 questions for it to get harder"): the
  // starting ability of a genus the player has never answered. The player's global ability is an Elo over ALL their answers
  // (app.js keeps it in the progress as the pseudo-genus LEVEL, '~level': ok, ko and th like a genus, so it syncs and
  // merges like one); progress saved before it existed falls back on the mean ability of the genera answered. It is shrunk
  // towards 0 while answers are few (M / (M + N)) and only partly carried over (W: knowing Acropora well says something,
  // not everything, about Porites), then clamped to [LO, HI]: a strong player's first question on a new genus has traps
  // and harder photos but is never the hardest, a struggling player's starts a little easier. Taken once: the first answer
  // on the genus saves its own ability (s.th) from there.
  const LEVEL = '~level',
    START = {W: 0.8, N: 10, LO: -0.5, HI: 1.5};
  function playerStart(P, skip) {
    P = P || {};
    const n = s => ((s && s.ok) || 0) + ((s && s.ko) || 0),
      G = P[LEVEL];
    let m = 0,
      t = 0;
    if (G && typeof G.th === 'number' && n(G)) {
      m = n(G);
      t = m * G.th;
    } else
      Object.keys(P).forEach(g => {
        const s = P[g] || {};
        if (g === skip || g === LEVEL || typeof s.th !== 'number' || !n(s)) return;
        m += n(s);
        t += n(s) * s.th;
      });
    if (!m) return 0;
    const v = START.W * (t / m) * (m / (m + START.N));
    return Math.round(Math.min(START.HI, Math.max(START.LO, v)) * 100) / 100;
  }
  // The global record made at the first answer after this change: it starts from the player's history (every answer so
  // far, the answer-weighted mean ability of the genera), so their earlier answers keep counting (code review, #320).
  function levelSeed(P) {
    let ok = 0,
      ko = 0,
      m = 0,
      t = 0;
    Object.keys(P || {}).forEach(g => {
      const s = P[g] || {},
        n = (s.ok || 0) + (s.ko || 0);
      if (g === LEVEL) return;
      ok += s.ok || 0;
      ko += s.ko || 0;
      if (typeof s.th === 'number' && n) {
        m += n;
        t += n * s.th;
      }
    });
    return {ok, ko, th: m ? Math.round((t / m) * 100) / 100 : 0};
  }

  // Achievements (Pierre, 2026-11-01: "unlocked as milestones are passed, with an animated pop-up, to keep the wish to play";
  // "well spread out": learning a whole genus takes ~300-430 questions, so most rungs are the quarters on the way there).
  // Learning milestones only, never time or days played (the learning model's rule). Each has a family, a tier
  // (1 bronze, 2 silver, 3 gold) and a test on a snapshot the app builds (app.js achSnap):
  //   {total, met, q: [genera at >= 25%, >= 50%, >= 75%], learned, pct, streak (best run of right answers), duel, cor,
  //    hard, elo (0 until 200 answers, app.js ELO_MIN: it moves a lot before), group (an IMR lecture group fully learned), bonus}.
  // Median questions to reach the quarter rungs, simulated with the real game (2026-11-01, 75% / 90% right): 5 at 25%
  // 76 / 57, 10 at 50% 231 / 137, 5 at 75% 363 / 203, first learned ~430 / ~300.
  const ACH = [
    ['met10', 'Explorer', 'Met 10 genera', 1, '🧭', s => s.met >= 10],
    ['met20', 'Wide eyes', 'Met 20 genera', 1, '🧭', s => s.met >= 20],
    ['metall', 'Whole slate', 'Met every genus of the list', 2, '🧭', s => s.total && s.met >= s.total],
    ['q25a', 'Getting there', '5 genera a quarter of the way to learned', 1, '🌱', s => s.q[0] >= 5],
    ['q25b', 'Growing', '10 genera a quarter of the way', 1, '🌱', s => s.q[0] >= 10],
    ['q25c', 'Spreading', '20 genera a quarter of the way', 2, '🌱', s => s.q[0] >= 20],
    ['q50a', 'Halfway', '5 genera halfway to learned', 1, '🌿', s => s.q[1] >= 5],
    ['q50b', 'Half a reef', '10 genera halfway', 2, '🌿', s => s.q[1] >= 10],
    ['q50c', 'Thriving', '20 genera halfway', 2, '🌿', s => s.q[1] >= 20],
    ['q75a', 'Nearly there', '5 genera three quarters of the way', 2, '🪸', s => s.q[2] >= 5],
    ['q75b', 'Reef builder', '10 genera three quarters of the way', 2, '🪸', s => s.q[2] >= 10],
    ['learn1', 'First genus learned', 'Learned a genus', 2, '🎓', s => s.learned >= 1],
    ['learn5', 'Five learned', 'Learned 5 genera', 3, '🎓', s => s.learned >= 5],
    ['learn10', 'Ten learned', 'Learned 10 genera', 3, '🎓', s => s.learned >= 10],
    ['learn20', 'Twenty learned', 'Learned 20 genera', 3, '🎓', s => s.learned >= 20],
    ['learnall', 'Coral master', 'Learned every genus of the list', 3, '👑', s => s.total && s.learned >= s.total],
    ['pct5', 'First steps', '5% progress', 1, '📈', s => s.pct >= 5],
    ['pct10', 'On the way', '10% progress', 1, '📈', s => s.pct >= 10],
    ['pct25', 'A quarter', '25% progress', 2, '📈', s => s.pct >= 25],
    ['pct50', 'Half the slate', '50% progress', 2, '📈', s => s.pct >= 50],
    ['pct75', 'Three quarters', '75% progress', 3, '📈', s => s.pct >= 75],
    ['pct100', 'Complete', '100% progress', 3, '📈', s => s.pct >= 100],
    ['run10', 'On a roll', '10 right answers in a row', 1, '🔥', s => s.streak >= 10],
    ['run25', 'Unstoppable', '25 right answers in a row', 2, '🔥', s => s.streak >= 25],
    ['duel', 'Look-alike slayer', 'Won a look-alike duel', 1, '⚔️', s => s.duel],
    ['cor', 'Corallite reader', 'Right with only the corallites in view', 1, '🔬', s => s.cor],
    ['hard', 'Sharp eye', 'Right on a photo most players miss, shown alone', 2, '🎯', s => s.hard],
    ['elo1100', 'Elo 1100', 'Reached an Elo of 1100', 1, '⭐', s => s.elo >= 1100],
    ['elo1200', 'Elo 1200', 'Reached an Elo of 1200', 2, '⭐', s => s.elo >= 1200],
    ['elo1300', 'Elo 1300', 'Reached an Elo of 1300', 3, '⭐', s => s.elo >= 1300],
    ['elo1400', 'Elo 1400', 'Reached an Elo of 1400', 3, '🌟', s => s.elo >= 1400],
    ['group', 'Group complete', 'Learned every genus of an IMR lecture group', 3, '🧩', s => s.group],
    ['bonus', 'Off the list', 'Unlocked a bonus genus', 2, '🔓', s => s.bonus >= 1]
  ].map(([id, title, desc, tier, icon, test]) => ({id, title, desc, tier, icon, test}));
  // The achievements a snapshot meets that `have` ({id: time}) does not hold yet, in list order.
  const newAch = (snap, have) => ACH.filter(a => !(have || {})[a.id] && a.test(snap)).map(a => a.id);

  // Progress % of a saved progress P over a list of genera, as app.js shows it (genScore / progPct): per genus, the
  // knowledge probability L (BKT; progress saved before it replays its recent results as average quiz photos) fills 95%
  // on its way from 0.1 to 0.95, each mastery-exam question passed adds 1%, a passed exam makes it 100%. The sync sheet
  // computes the leaderboard % with a copy (Code.gs pctOf_, v16), from each player's saved progress: keep the two in step
  // (tests/sync.test.js compares them; tests/draw.smoke.js compares this with the app's progPct).
  function pctOf(P, list) {
    const L0 = 0.1,
      T = 0.08,
      M = 0.95,
      sig = x => 1 / (1 + Math.exp(-x));
    const step = (L, good) => {
      const g = 0.25 + 0.75 * sig(-1),
        sl = 0.1 + 0.9 * sig(-3),
        post = good ? (L * (1 - sl)) / (L * (1 - sl) + (1 - L) * g) : (L * sl) / (L * sl + (1 - L) * (1 - g));
      return post + (1 - post) * T;
    };
    const known = s => (typeof s.L === 'number' ? s.L : [...(s.h || '')].reduce((L, x) => step(L, x === '1'), L0));
    const score = s => {
      if (!s) return 0;
      if (s.mx) return 1;
      const part = Math.min(1, Math.max(0, (known(s) - L0) / (M - L0)));
      return 0.95 * part + (part >= 1 && s.ex ? (0.05 * (s.ex.k || 0)) / 5 : 0);
    };
    return list && list.length ? Math.round((100 * list.reduce((t, n) => t + score((P || {})[n]), 0)) / list.length) : 0;
  }

  const CORE = {
    pctOf,
    ACH,
    newAch,
    LEVEL,
    START,
    playerStart,
    levelSeed,
    applyCuration,
    applySlots,
    CAP,
    isObj,
    eq,
    canon,
    merge3,
    mergeTabs,
    takeTab,
    mergeOld,
    mergeProgress,
    eloOf,
    trustOf,
    TRUST,
    PHOTO_W,
    PLAYER0,
    confusionOf,
    CONF,
    confScore,
    pairConf,
    mergeUsers
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = CORE;
  else Object.assign(root, CORE);
})(this);
