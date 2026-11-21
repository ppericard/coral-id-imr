  // A page name read back (admin): its subject (by its SUBJECTS pv prefix) and its page ('fish.quiz' -> ['fish', 'quiz'],
  // 'quiz' -> ['coral', 'quiz']).
  function pageSubj(n) {
    const s = String(n == null ? '' : n),
      S = SUBJECTS.find(x => x.pv && s.startsWith(x.pv)) || SUBJECTS.find(x => !x.pv);
    return [S.id, S.pv ? s.slice(S.pv.length) : s];
  }
  // How a genus sheet was reached, from the page it was opened from.
  function pageFrom(h) {
    const n = pageName(h);
    if (/^practice\.(quiz|custom|duels)$/.test(n)) return 'quiz';
    if (/^learn\.(genera|genus|compare|look-alikes)$/.test(n) || n === 'practice.memory') return 'learn';
    if (/^(progress|leaderboard)/.test(n)) return 'progress';
    return 'other';
  }
  const pagesNew = () => ({r: Object.create(null), g: Object.create(null), cur: null, at: 0, fb: [0, 0, 0, 0]});
  // One count of the feedback sheet's tally (PAGES.FB): kind 'shown', 'more', 'sec' (n seconds, capped at FBSEC) or 'link'.
  function pagesFb(S, kind, n = 1) {
    const i = PAGES.FB.indexOf(kind),
      v = Math.round(Number(n));
    if (i < 0 || !S.fb || !isFinite(v) || v <= 0) return;
    S.fb[i] += kind === 'sec' ? Math.min(PAGES.FBSEC, v) : v;
  }
  // The page in view stops counting time (hidden, or another page opens).
  function pagesStop(S, now) {
    const c = S.cur;
    if (c && S.at) {
      const ms = Math.max(0, now - S.at);
      (S.r[c.n] = S.r[c.n] || [0, 0])[1] += ms;
      if (c.g) (S.g[c.g] = S.g[c.g] || [0, 0, c.from, c.asked])[1] += ms;
    }
    S.at = 0;
  }
  // A page opened: h its hash; o.genus the genus of a sheet (checked by the caller against the data), o.from how it
  // was reached (pageFrom), o.asked the genus already asked to the player, o.hidden the app not in view, o.pre the
  // page-name prefix of the subject on screen (SUBJECTS pv, pageName).
  function pagesOpen(S, h, now, o = {}) {
    pagesStop(S, now);
    const n = pageName(h, o.pre),
      g = n === 'learn.genus' && PAGES.GENUS.test(String(o.genus || '')) ? o.genus : null;
    (S.r[n] = S.r[n] || [0, 0])[0]++;
    if (g) (S.g[g] = S.g[g] || [0, 0, PAGES.FROM.includes(o.from) ? o.from : 'other', o.asked ? 1 : 0])[0]++;
    S.cur = {n, g, from: g ? S.g[g][2] : '', asked: g ? S.g[g][3] : 0};
    S.at = o.hidden ? 0 : now;
  }
  const pagesResume = (S, now) => {
    if (S.cur && !S.at) S.at = now;
  };
  // The summary: {r: {page: [times, seconds]}, g: {genus: [times, seconds, from, asked]}}, seconds rounded, the most
  // opened first and capped (ROUTES, GEN); null when nothing was open. Times 0 = the page kept from the previous summary
  // of the same visit (pagesTake), still in view.
  function pagesSummary(S) {
    const sec = ms => Math.min(PAGES.MAXS, Math.round(ms / 1000)),
      keep = (O, cap) =>
        Object.keys(O)
          .filter(k => O[k][0] > 0 || sec(O[k][1]) > 0)
          .sort((a, b) => O[b][0] - O[a][0] || O[b][1] - O[a][1] || (a < b ? -1 : 1))
          .slice(0, cap),
      r = {},
      g = {};
    keep(S.r, PAGES.ROUTES).forEach(k => (r[k] = [Math.min(PAGES.MAXN, S.r[k][0]), sec(S.r[k][1])]));
    keep(S.g, PAGES.GEN).forEach(k => (g[k] = [Math.min(PAGES.MAXN, S.g[k][0]), sec(S.g[k][1]), S.g[k][2], S.g[k][3]]));
    return Object.keys(r).length ? {r, g} : null;
  }
  // The summary so far, and a fresh tally for the rest of the visit (the page in view goes on counting from 0 times).
  function pagesTake(S, now) {
    pagesStop(S, now);
    const out = pagesSummary(S);
    S.r = Object.create(null);
    S.g = Object.create(null);
    // The feedback sheet's four numbers ride the summary and start again; with no summary to carry them (no page was open)
    // they wait for the next one.
    if (out && S.fb && S.fb.some(Boolean)) {
      out.fb = S.fb;
      S.fb = [0, 0, 0, 0];
    }
    return out;
  }
  // Whose summary it is: set when it is queued, so a summary left in the queue (offline, a failed
  // send) is never sent under whoever is active later. 'n:<name, lower case>' signed in, 'a:<anonymous answer id>' else.
  // It stays on the device (pagesBatch strips it).
  const pagesOwner = (sync, anon) => (sync && sync.name && sync.pin ? 'n:' + String(sync.name).trim().toLowerCase() : 'a:' + anon);
  // The events a request sends for the player active now (owner): every other event, and the summaries queued for
  // this owner (without their owner field); the ids of the summaries queued for another owner (or none), to drop.
  function pagesBatch(q, owner) {
    const send = [],
      drop = [];
    (q || []).forEach(x => {
      if (!x || x.k !== 'pages') return send.push(x);
      if (x.o !== owner) return drop.push(x.id);
      const {o, ...y} = x;
      send.push(y);
    });
    return {send, drop};
  }
  // At sign-in the device's anonymous summaries become the account's, as its anonymous answers do (sync.js signIn).
  const pagesOwn = (q, from, into) => (q || []).map(x => (x && x.k === 'pages' && x.o === from ? {...x, o: into} : x));
  // What the sheet keeps of a 'pages' event (Code.gs events_): known shapes only, numbers clamped, no other field. The
  // output objects have no prototype (names come from the players' devices: "__proto__" must stay a plain key).
  function pagesClean(x) {
    const o = x && typeof x === 'object' ? x : {},
      n = (v, hi) => {
        const k = Math.round(Number(v));
        return isFinite(k) ? Math.max(0, Math.min(hi, k)) : 0;
      },
      obj = v => (v && typeof v === 'object' && !Array.isArray(v) ? v : {}),
      R = obj(o.r),
      G = obj(o.g),
      r = Object.create(null),
      g = Object.create(null);
    Object.keys(R)
      .filter(k => PAGES.RE.test(k) && Array.isArray(R[k]))
      .slice(0, PAGES.ROUTES)
      .forEach(k => (r[k] = [n(R[k][0], PAGES.MAXN), n(R[k][1], PAGES.MAXS)]));
    Object.keys(G)
      .filter(k => PAGES.GENUS.test(k) && Array.isArray(G[k]))
      .slice(0, PAGES.GEN)
      .forEach(
        k => (g[k] = [n(G[k][0], PAGES.MAXN), n(G[k][1], PAGES.MAXS), PAGES.FROM.includes(G[k][2]) ? G[k][2] : 'other', G[k][3] ? 1 : 0])
      );
    const out = {r, g, vi: /^[a-z0-9]{1,12}$/.test(String(o.vi || '')) ? String(o.vi) : ''};
    // The feedback sheet's four numbers (PAGES.FB): four numbers or nothing, each clamped; nothing when all are zero.
    if (Array.isArray(o.fb) && o.fb.length === PAGES.FB.length) {
      const fb = o.fb.map((v, i) => n(v, PAGES.FB[i] === 'sec' ? PAGES.MAXS : PAGES.FBMAX));
      if (fb.some(Boolean)) out.fb = fb;
    }
    if (o.na !== undefined && o.na !== null && o.na !== '' && isFinite(Number(o.na))) out.na = n(o.na, 1e6);
    // The screen (VIEWPORT): rounded and clamped again, whatever the device sent; its band kept when it is
    // one (0 to 4) and agrees with the rounded short side within the grid, else taken from the rounded short side.
    const V = obj(o.vp),
      vp = V.w !== undefined ? viewportOf(V.w, V.h, V.d) : null;
    if (vp) {
      const b = Number(V.b),
        lo = vpBand(Math.min(vp.w, vp.h) - VIEWPORT.STEP / 2),
        hi = vpBand(Math.min(vp.w, vp.h) + VIEWPORT.STEP / 2);
      if (Number.isInteger(b) && b >= lo && b <= hi) vp.b = b;
      out.vp = {w: vp.w, h: vp.h, d: vp.d, o: V.o === 'p' || V.o === 'l' ? V.o : vp.o, b: vp.b};
    }
    return out;
  }

