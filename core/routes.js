  // routes: begin
  // The app's addresses (docs/spec/front-end.md "Addresses and routing"; docs/ARCHITECTURE.md "Pages and routing"):
  // #<section>/<page>[/<thing>…][?filters], in the words on screen; a subject other than the corals puts its prefix
  // first (SUBJECTS hash) on the pages of the sections that follow the subject (ROUTE_SUBJ). Inside, the app names a
  // page by its page key ('genera', 'g-Acropora', 'cmp|A|B'…); routeOut and routeIn translate one into the other, here
  // only. No old address is read (rule W3): routeIn gives an unknown one no key.
  const ROUTE_SUBJ = ['learn', 'practice', 'identify', 'progress'];
  // A section's own page, for its bare address (#learn) and an unknown address inside it (the header tabs' targets).
  const ROUTE_FIRST = {
    learn: 'genera',
    practice: 'quiz',
    identify: 'idkey',
    progress: 'progress',
    leaderboard: 'board',
    tools: 'lab',
    about: 'about'
  };
  const ROUTE_FIXED = {
    quiz: 'practice/quiz',
    'quiz-custom': 'practice/custom',
    'quiz-duel': 'practice/duels',
    pairs: 'practice/memory',
    cmp: 'learn/look-alikes',
    basics: 'learn/basics',
    progress: 'progress',
    board: 'leaderboard',
    ach: 'leaderboard/achievements',
    about: 'about',
    // Delete my account (Code.gs selfDelete): a page reached from About, its |done state after the deletion.
    'delete-account': 'about/delete-account',
    lab: 'tools',
    idkey: 'identify/key',
    fishkey: 'identify/key',
    // The live mode (live.js): a student's join page, its session code as a filter
    // (#live?code=123456, the address the trainer's lobby shows), and the trainer's page.
    live: 'live',
    'live-host': 'live/host'
  };
  const routeEnc = x => encodeURIComponent(x).replace(/%2C/g, ',');
  const routeSubj0 = () => SUBJECTS.find(s => !s.hash) || SUBJECTS[0];
  // The address of page key k for subject S (default: the corals), without '#'. null for no known page.
  function routeOut(k, S) {
    S = S || routeSubj0();
    const s = String(k == null ? '' : k),
      [b, ...a] = s.split('|');
    let p, q;
    if (!s || s === 'home') return '';
    if (b === 'genera' && !a.length) p = 'learn/' + S.many;
    else if (b.startsWith('g-') && b.length > 2 && !a.length) {
      // A subject with sheets at several ranks (SUBJECTS sheets: fish families, genera, species) names the rank of the
      // sheet from its id's prefix (g-f:Damselfishes: #fish/learn/family/Damselfishes); any other sheet is its unit's.
      // A species by its scientific name (sci:s091: LEVELS sci) opens its species' sheet, its unit id kept after the
      // prefix (#fish/learn/species/sci:s091; treeSheets spOf reads it back).
      const id = b.slice(2),
        w =
          Object.keys(S.sheets || {}).find(x => id.startsWith(S.sheets[x]) && id.length > S.sheets[x].length) ||
          (levelOf(id) === 'sci' && (S.sheets || {}).species ? 'species' : undefined);
      p = 'learn/' + (w || S.one) + '/' + routeEnc(w && id.startsWith(S.sheets[w]) ? id.slice(S.sheets[w].length) : id);
    } else if (b.startsWith('cmp-') && b.length > 4 && a.length === 1) p = 'learn/compare/' + routeEnc(b.slice(4)) + '/' + routeEnc(a[0]);
    else if (b.startsWith('lab-') && b.length > 4) p = 'tools/' + [b.slice(4), ...a].map(routeEnc).join('/');
    else if ((b === 'idkey' || b === 'fishkey') && a.length <= 1) {
      p = ROUTE_FIXED[b];
      // The Key's clues (form=B;box=B1;not=wall.plo) as filters, kept as they are (the Key encodes its free text).
      if (a[0]) q = a[0].split(';').filter(Boolean).join('&');
    } else if (b === 'live' && (!a.length || (a.length === 1 && /^\d{6}$/.test(a[0])))) {
      p = 'live';
      if (a[0]) q = 'code=' + a[0];
    } else if (b === 'basics') {
      // Coral basics: its step, glossary term or view as segments, its editing switch (|edit) as a filter.
      const e = a[a.length - 1] === 'edit';
      p = ['learn/basics', ...(e ? a.slice(0, -1) : a).map(routeEnc)].join('/');
      if (e) q = 'edit=1';
    } else if (
      ROUTE_FIXED[b] &&
      (!a.length ||
        (['cmp', 'quiz-duel'].includes(b) && a.length === 2) ||
        (b === 'quiz-custom' && a.length === 1 && a[0] === 'play') ||
        (b === 'delete-account' && a.length === 1 && a[0] === 'done'))
    )
      p = [ROUTE_FIXED[b], ...a.map(routeEnc)].join('/');
    else return null;
    const pre = ROUTE_SUBJ.includes(p.split('/')[0]) ? S.hash || '' : '';
    return pre + p + (q ? '?' + q : '');
  }
  // The page an address shows: {S: its subject, bare: no subject prefix, key: its page key (null: unknown), sec: its
  // section (for an unknown address inside a known section), fall: the page key to show instead of an unknown one}.
  // Split before decoding: the filters off the raw hash first, then each segment decoded alone.
  // tool(S): the subject's Identify tool (app.js UNITS identify), 'idkey' when not given.
  function routeIn(h, tool) {
    const raw = String(h == null ? '' : h).replace(/^#/, ''),
      qi = raw.indexOf('?'),
      dec = x => {
        try {
          return decodeURIComponent(x);
        } catch (e) {
          return x;
        }
      };
    let seg = (qi < 0 ? raw : raw.slice(0, qi)).split('/').map(dec);
    const query = qi < 0 ? '' : raw.slice(qi + 1),
      Sx = SUBJECTS.find(s => s.hash && seg[0] + '/' === s.hash),
      S = Sx || routeSubj0();
    if (Sx) seg = seg.slice(1);
    while (seg.length && seg[seg.length - 1] === '') seg.pop();
    const out = (key, sec) => ({S, bare: !Sx, key, sec: sec || seg[0] || 'home', fall: key != null ? key : ROUTE_FIRST[seg[0]] || ''});
    const [s0, s1, ...r] = seg,
      n = seg.length,
      kv = query.split('&').filter(Boolean);
    if (!n) return out(query ? null : '', 'home');
    if (seg.some(x => x === '' || x.includes('|'))) return out(null);
    const key = (() => {
      if (s0 === 'learn') {
        if (s1 === 'basics') {
          const e = kv.some(x => /^edit(=|$)/.test(x));
          return ['basics', ...r, ...(e ? ['edit'] : [])].join('|');
        }
        if (s1 === S.many && n === 2) return 'genera';
        if (S.sheets && S.sheets[s1] && n === 3) return 'g-' + S.sheets[s1] + r[0];
        if (s1 === S.one && n === 3) return 'g-' + r[0];
        if (s1 === 'look-alikes' && (n === 2 || n === 4)) return ['cmp', ...r].join('|');
        if (s1 === 'compare' && n === 4) return 'cmp-' + r[0] + '|' + r[1];
      } else if (s0 === 'practice') {
        if (s1 === 'quiz' && n === 2) return 'quiz';
        if (s1 === 'custom' && (n === 2 || (n === 3 && r[0] === 'play'))) return ['quiz-custom', ...r].join('|');
        if (s1 === 'duels' && (n === 2 || n === 4)) return ['quiz-duel', ...r].join('|');
        if (s1 === 'memory' && n === 2) return 'pairs';
      } else if (s0 === 'identify') {
        if (s1 === 'key' && n === 2) return (tool ? tool(S) : 'idkey') + (kv.length ? '|' + kv.join(';') : '');
      } else if (s0 === 'progress' && n === 1) return 'progress';
      else if (s0 === 'leaderboard' && n === 1) return 'board';
      else if (s0 === 'leaderboard' && s1 === 'achievements' && n === 2) return 'ach';
      else if (s0 === 'about' && n === 1) return 'about';
      else if (s0 === 'about' && s1 === 'delete-account' && (n === 2 || (n === 3 && r[0] === 'done')))
        return ['delete-account', ...r].join('|');
      else if (s0 === 'tools') return n === 1 ? 'lab' : ['lab-' + s1, ...r].join('|');
      else if (s0 === 'live' && n === 1) {
        const c = /^code=(\d{6})$/.exec(kv.find(x => /^code=/.test(x)) || '');
        return c ? 'live|' + c[1] : 'live';
      } else if (s0 === 'live' && s1 === 'host' && n === 2) return 'live-host';
      return null;
    })();
    // A section that follows the subject is the only place a subject prefix means something.
    if (key != null && Sx && !ROUTE_SUBJ.includes(s0)) return out(null);
    return out(key);
  }
  // The page name of a page key, logged in the visit summary ('pages') and used for the photo size per page:
  // its address's section and page, its things and filters dropped ('learn.genus', 'learn.look-alikes',
  // 'practice.duels', 'identify.key', 'tools.anatomy', 'leaderboard.achievements', 'progress', 'home'), in the corals'
  // words whatever the subject (a page's identity). pre: the prefix of the subject on screen (SUBJECTS pv): a page drawn
  // with Fish on screen is 'fish.<page>' ('fish.practice.quiz', 'fish.home'). '.' and '-' are in PAGES.RE: the sheet
  // (pagesClean) keeps these names as they come.
  function pageName(h, pre = '') {
    const s = String(h == null ? '' : h).replace(/^#/, ''),
      p = routeOut(s, Object.assign({}, routeSubj0(), {hash: ''})),
      seg = p == null ? null : p.split('?')[0].split('/');
    let n = !s || s === 'home' ? 'home' : !seg ? 'other' : seg.slice(0, 2).join('.');
    if (!PAGES.RE.test(n)) n = 'other';
    if (!pre) return n;
    return PAGES.RE.test(pre + n) ? pre + n : pre + 'other';
  }
  // routes: end
  // routes-migration: begin
  // The data written under the old addresses and page names (before the current URL scheme), moved once
  // (rule W3: no old address is read anywhere else; the app moves its own stored data at start-up, migrateRoutes; the
  // sheet moves its rows once, Code.gs ONCE_ in its own PR). The old addresses were today's page keys, so routeOut is
  // their translation. Delete this with its callers once every device and the sheet have moved.
  // An old address (the raw hash, without '#') to its new one; a new or unknown one is left as it is.
  const routeRename = h => {
    const s = String(h == null ? '' : h).replace(/^#/, ''),
      n = s === 'home' ? 'home' : routeOut(s === 'quiz-board' ? 'progress' : s === 'credits' ? 'about' : s);
    return n == null ? s : n;
  };
  // An old page name (genus, compare, lookalikes, quiz, fish.quiz, lab-anatomy…) to its new one (learn.genus,
  // learn.compare, learn.look-alikes, practice.quiz, fish.practice.quiz, tools.anatomy); a new one is left as it is.
  const PAGE_OLD = {genus: 'g-x', compare: 'cmp-x|y', lookalikes: 'cmp'};
  function pageRename(n) {
    const s = String(n == null ? '' : n),
      S = SUBJECTS.find(x => x.pv && s.startsWith(x.pv)),
      pre = S ? S.pv : '',
      b = s.slice(pre.length);
    if (
      /^(learn|practice|identify|leaderboard|tools)\./.test(b) ||
      ['home', 'progress', 'about', 'other', 'tools', 'leaderboard'].includes(b)
    )
      return s;
    const k = PAGE_OLD[b] || (b === 'lab' ? 'lab' : b),
      m = pageName(k, pre);
    return m === pre + 'other' ? s : m;
  }
  // This device's data under the old names (app.js and admin.js at start-up, after migrateStorage): the photo size per page
  // (reefid-sync-size, keyed by page name: genera, genus, pair, idkey, lab-gallery, lab-elim; tips dropped), the events
  // still queued (reefid-evq: each one's address, a visit summary's page names), the photos flagged (reefid-photo-flags:
  // where they were seen). Idempotent (a value the sheet sends back from an older device is moved at the next start).
  // Returns the keys it wrote.
  const SIZE_OLD = {
    genera: 'learn.genera',
    genus: 'learn.genus',
    pair: 'learn.compare',
    idkey: 'identify.key',
    'lab-gallery': 'tools.gallery',
    'lab-elim': 'tools.elim',
    tips: null
  };
  function migrateRoutes(s) {
    try {
      s = s || localStorage;
    } catch (e) {
      return [];
    }
    const done = [],
      edit = (k, f) => {
        try {
          const v = s.getItem(k);
          if (v === null) return;
          const w = JSON.stringify(f(JSON.parse(v)));
          if (w !== v) (s.setItem(k, w), done.push(k));
        } catch (e) {}
      };
    edit('reefid-sync-size', o => {
      if (!isObj(o)) return o;
      Object.keys(SIZE_OLD).forEach(a => {
        if (!Object.prototype.hasOwnProperty.call(o, a)) return;
        if (SIZE_OLD[a] && !Object.prototype.hasOwnProperty.call(o, SIZE_OLD[a])) o[SIZE_OLD[a]] = o[a];
        delete o[a];
      });
      return o;
    });
    edit('reefid-evq', L =>
      !Array.isArray(L)
        ? L
        : L.map(x => {
            if (!isObj(x)) return x;
            const y = {...x};
            if (typeof y.pg === 'string') y.pg = routeRename(y.pg).slice(0, 60);
            if (isObj(y.r)) {
              const r = {};
              Object.keys(y.r).forEach(n => {
                const m = pageRename(n),
                  a = r[m],
                  b = y.r[n];
                r[m] = Array.isArray(a) && Array.isArray(b) ? [a[0] + b[0], a[1] + b[1]] : b;
              });
              y.r = r;
            }
            return y;
          })
    );
    edit('reefid-photo-flags', L =>
      !Array.isArray(L)
        ? L
        : L.map(x => {
            if (!isObj(x) || typeof x.where !== 'string') return x;
            const [h, ...rest] = x.where.split(' · ');
            return {...x, where: [h === 'home' ? h : routeRename(h) || 'home', ...rest].join(' · ')};
          })
    );
    return done;
  }
  // routes-migration: end
