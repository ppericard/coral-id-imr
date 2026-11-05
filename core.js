// Pure functions shared by the app (app.js), the admin (admin.js) and the tests (node --test tests/*.test.js).
// No DOM, no globals of the app: in the browser they become globals (classic script), in Node module.exports.
(function (root) {
  // The organisation and the app's name, in one place (Pierre, 2026-11-03: the app was renamed IMR Reef ID, corals now,
  // fish and benthos next; he is thinking of open-sourcing the app for other organisations, docs/ROADMAP.md "Open source").
  // Pages built by JS read ORG; the static files (index.html, admin.html, privacy.html, manifest.webmanifest,
  // tools/og/og.html, README.md, the docs) are rewritten from it by tools/rename_app.py. The storage keys never depend on
  // it (KEYS below), so a fork renames the app without moving any player's data.
  const ORG = {short: 'IMR', name: 'Institute for Marine Research', app: 'IMR Reef ID', appShort: 'Reef ID'};
  // Storage keys (localStorage, sessionStorage): one app-wide prefix that names the app without the organisation, and is
  // distinct from other apps on the shared origin ppericard.github.io.
  //   reefid-<name>        stays on this device (sign-in record, caches, queues, the admin, the Lab);
  //   reefid-sync-<name>   travels with the player: progress files, the sheet's Data column (progress.js progData) and so
  //                        every device signed in to the account. What belongs to one group of organisms carries it:
  //                        reefid-sync-coral-progress now, reefid-sync-fish-progress beside it later.
  // A new key that should travel takes KEYS.SYNC; anything else stays on the device by default (nothing sent by mistake).
  const KEYS = {APP: 'reefid-', SYNC: 'reefid-sync-'};
  // rename-app: keep-begin
  // The names before 2026-11-03 (imr-coral-* travelled, the other imr-* stayed) and the new ones: exact names first, then
  // prefixes (ending in -). One table for the code (tools/rename_app.py reads it) and the players' devices (migrateKeys).
  const LEGACY_KEYS = [
    ['imr-coral-sync', 'reefid-account'],
    ['imr-coral-loaded', 'reefid-loaded'],
    ['imr-coral-progress', 'reefid-sync-coral-progress'],
    ['imr-coral-quiz', 'reefid-sync-coral-quiz'],
    ['imr-coral-intro', 'reefid-sync-coral-intro'],
    ['imr-coral-intro-offer', 'reefid-sync-coral-intro-offer'],
    ['imr-coral-reset', 'reefid-sync-coral-reset'],
    ['imr-coral-custom', 'reefid-sync-coral-custom'],
    ['imr-coral-rv', 'reefid-sync-coral-rv'],
    ['imr-coral-', 'reefid-sync-'],
    ['imr-', 'reefid-']
  ];
  // rename-app: keep-end
  // The new name of a key from before the rename, or null (a key that never had another name).
  const keyRename = k => {
    for (const [o, n] of LEGACY_KEYS) if (o.endsWith('-') ? k.startsWith(o) : k === o) return o.endsWith('-') ? n + k.slice(o.length) : n;
    return null;
  };
  // Its name before the rename (a travelling key only), for the sheet copies of withLegacy.
  const keyLegacy = k => {
    if (!k.startsWith(KEYS.SYNC)) return null;
    for (const [o, n] of LEGACY_KEYS) if (o.endsWith('-') ? k.startsWith(n) : k === n) return o.endsWith('-') ? o + k.slice(n.length) : o;
    return null;
  };
  // On a device, at start-up, before anything reads them (app.js and admin.js call it first): each old key moves to its
  // new name, unless the new one is already there (the new one is kept), then the old one goes. A key that cannot be
  // written (storage full) stays under its old name and is tried again at the next start. Returns the keys moved.
  function migrateKeys(s) {
    const old = [];
    try {
      for (let i = 0; i < s.length; i++) if (keyRename(s.key(i))) old.push(s.key(i));
    } catch (e) {}
    return old.filter(k => {
      try {
        const n = keyRename(k);
        if (s.getItem(n) === null) s.setItem(n, s.getItem(k));
        s.removeItem(k);
        return true;
      } catch (e) {
        return false;
      }
    });
  }
  // The name a key had before the rename, or null (any key: the reverse of keyRename; a name that never existed, e.g. a
  // key added since, gives a name nothing holds).
  const keyBefore = k => {
    for (const [o, n] of LEGACY_KEYS) if (n.endsWith('-') ? k.startsWith(n) : k === n) return n.endsWith('-') ? o + k.slice(n.length) : o;
    return null;
  };
  // A key's value read from a Storage, under its old name when the new one is absent (Codex review #439): a key the
  // migration could not write (storage full) stays under its old name until a later start moves it, and the player's
  // progress must not look empty meanwhile. The app's and the admin's store.get read through it.
  function keyGet(s, k) {
    const v = s.getItem(k);
    if (v !== null) return v;
    const o = keyBefore(k);
    return o ? s.getItem(o) : null;
  }
  // Every key that travels with the player (KEYS.SYNC), from a Storage, as {name: value}: progress files, the sheet's
  // Data (progress.js progData). A travelling key still under its old name (a migration that could not write it yet)
  // counts under its new name, the new one winning (Codex review #439: a save must not leave out a record whose move is
  // pending, nor a backup).
  function travelData(s) {
    const raw = {};
    try {
      for (let i = 0; i < s.length; i++) {
        const k = s.key(i);
        if (k.startsWith(KEYS.SYNC) || (keyRename(k) || '').startsWith(KEYS.SYNC)) raw[k] = s.getItem(k);
      }
    } catch (e) {}
    return keysIn(raw);
  }
  // Keys to remove, with their old names (sign-out): a key left under its old name by a migration that could not write
  // it would otherwise sign the player back in at the next start, or hand their progress to the next player of the
  // device (Codex review #439).
  const withOldNames = L => [...new Set(L.flatMap(k => [k, keyBefore(k)].filter(Boolean)))];
  // Both storages of this page (a page with storage blocked moves nothing).
  function migrateStorage() {
    try {
      return [...migrateKeys(localStorage), ...migrateKeys(sessionStorage)];
    } catch (e) {
      return [];
    }
  }
  // idkey-migration: begin
  // One-shot move of this device's data to the names of 2026-11-04 (Pierre: the Coral Finder tool became the Coral ID
  // Key; the book keeps its name). Alpha (rule W3): no old name is read anywhere else; this moves the data
  // once and the code forgets them. The tool's keys reefid-finder-* become reefid-idkey-*, the admin's Sheets & ID Key
  // table reefid-admin-fcov reefid-admin-kcov, and page names stored inside values: the photo size per page
  // (reefid-sync-size), the Lab votes per tool (reefid-lab-votes), the admin's remembered views (reefid-admin-view,
  // -sub). Idempotent: once nothing is left under an old name it changes nothing (a value the sheet sends back from
  // before is moved at the next start). app.js and admin.js run it at start-up, after migrateStorage. Delete it (and
  // its test, tests/idkey.test.js) once every device has started the renamed app. Returns the keys it wrote.
  const IDKEY_OLD = {finder: 'idkey', 'lab-finder': 'lab-idkey', '~fcov': '~kcov'};
  function migrateIdKey(s) {
    try {
      s = s || localStorage; // storage blocked: nothing to move
    } catch (e) {
      return [];
    }
    const done = [],
      move = (o, n) => {
        const v = s.getItem(o);
        if (v === null) return;
        if (s.getItem(n) === null) s.setItem(n, v);
        s.removeItem(o);
        done.push(n);
      },
      edit = (k, f) => {
        const v = s.getItem(k);
        let o;
        try {
          o = JSON.parse(v);
        } catch (e) {}
        if (!isObj(o)) return;
        const w = JSON.stringify(f(o));
        if (w !== v) (s.setItem(k, w), done.push(k));
      },
      // An object keyed by page or tool name: the old name's entry under the new one, unless the new one is set.
      names = o => {
        Object.keys(IDKEY_OLD).forEach(a => {
          if (!Object.prototype.hasOwnProperty.call(o, a)) return;
          if (!Object.prototype.hasOwnProperty.call(o, IDKEY_OLD[a])) o[IDKEY_OLD[a]] = o[a];
          delete o[a];
        });
        return o;
      },
      // An object whose values are page names.
      values = o => {
        Object.keys(o).forEach(
          k => typeof o[k] === 'string' && Object.prototype.hasOwnProperty.call(IDKEY_OLD, o[k]) && (o[k] = IDKEY_OLD[o[k]])
        );
        return o;
      };
    try {
      const keys = [];
      for (let i = 0; i < s.length; i++) keys.push(s.key(i));
      keys.filter(k => k.startsWith('reefid-finder-')).forEach(k => move(k, 'reefid-idkey-' + k.slice(14)));
      move('reefid-admin-fcov', 'reefid-admin-kcov');
      edit('reefid-sync-size', names);
      edit('reefid-lab-votes', names);
      edit('reefid-admin-view', values);
      edit('reefid-admin-sub', values);
    } catch (e) {}
    return done;
  }
  // idkey-migration: end
  // A player's data from the sheet or a progress file, which may hold the old names (an app from before the rename
  // saved it), the new ones, or both (withLegacy): with the new names only, the new one winning.
  function keysIn(d) {
    const out = {};
    if (!isObj(d)) return out;
    Object.keys(d).forEach(k => keyRename(k) || (out[k] = d[k]));
    Object.keys(d).forEach(k => {
      const n = keyRename(k);
      if (n && !(n in out)) out[n] = d[k];
    });
    return out;
  }
  // What the app sends to the sheet: the new names plus a copy under the old ones, while a device of the same player may
  // still run an app from before the rename (it reads only the old names: without them it would merge its progress with
  // an empty record and lose the saved one). LEGACY_SEND goes to false once every device has the renamed app (with the
  // domain move, docs/ROADMAP.md); the sheet script reads either name (tools/sync/Code.gs dataKey_).
  const LEGACY_SEND = true;
  function withLegacy(d) {
    const out = {...(d || {})};
    if (LEGACY_SEND)
      Object.keys(d || {}).forEach(k => {
        const o = keyLegacy(k);
        if (o) out[o] = d[k];
      });
    return out;
  }

  // Subjects (the taxon model, Pierre 2026-11-03: "fish in the app on the same engine as corals, cleanly", with a Corals /
  // Fish selector): what the game teaches. The engine (model.js, quiz.js, progress.js) works on one subject at a time,
  // the current one (app.js SUBJ): its units (coral genera, fish teaching entries), their records (app.js GX), its
  // progress P and quiz settings Q under its own keys. Everything a subject differs in is a field here (data) or a
  // function of app.js UNITS (what reads the subject's data); the engine never names a subject.
  //   id      key part: reefid-sync-<id>-progress, -quiz, -intro, -intro-offer, -reset (subjKey; rule W21)
  //   dev     its device-only keys: reefid-<dev><name> (subjDev): '' for corals, whose keys predate subjects
  //   base    the sign-in record's fields for the progress last sent or received ([base, pending], sync.js mergeSaved)
  //   name, one, many, what, lecture: words of the interface (Corals; genus, genera; Coral to identify; the IMR coral
  //           lecture). Names of units: app.js uname (a genus in italics, a fish entry by its IMR name)
  //   beta    a subject still in beta: {kick, line}, Home's Learn door top line and description once it is chosen (line:
  //           HTML), and a "beta" tag on its buttons. The label only: who sees the subject is open
  //   open    who the subject opens to (subjGroup): 'all' (the default, the corals: every player, signed out included) or
  //           'group' (the admin and the players of its group, picked in the admin's Players: app.js subjOpen, sheet v48
  //           Code.gs groupIds_). Opening fish to everyone is this one field (docs/ARCHITECTURE.md "Beta")
  //   card    the kind of its first-meeting card (app.js CARD_KINDS: its emoji)
  //   remote  its photos are iNaturalist's, not the site's (the fish stopgap, tools/fish_photos.py): preloaded all the same
  //   views   the views a question may show, [code, label] (one view: one photo per question)
  //   optin   the opt-in sets: Q[k] true = on, Q[k + 'T'] when chosen (app.js UNITS[id].sets: units, card, ⚙ row)
  //   log     answers go to the sheet's Answers tab (photo ratings, confusions, the admin, the opening hold's replay)
  //   ach, board  achievements and the leaderboard count this subject
  //   progress    the views of My progress (progress.js quizBoard), the first by default
  //   pv      the prefix of its page names in the visit log (pageName: '' for corals, 'fish.' for fish: fish.quiz)
  //   zoom    what the "Did you know?" zoom tip asks to look at closely (tips.js; fish: no claim about what tells
  //           them apart)
  //   pages   the pages of the Learn and Practice sections it has (app.js MODES; sheet = a genus sheet, #g-); the others,
  //           Identify and the Tools are the corals' for now
  const SUBJECTS = [
    {
      id: 'coral',
      dev: '',
      base: ['base', 'pending'],
      name: 'Corals',
      one: 'genus',
      many: 'genera',
      what: 'Coral',
      card: 'genus',
      lecture: 'the IMR coral lecture',
      pv: '',
      zoom: 'the corallites, the detail that often tells look-alikes apart',
      views: [
        ['wide', 'Colony'],
        ['medium', 'Close-up'],
        ['macro', 'Corallites']
      ],
      optin: ['bon'],
      log: true,
      ach: true,
      board: true,
      // basics: Coral basics (proto/basics.js), step 0 of the Learn path, corals only.
      pages: ['basics', 'genera', 'sheet', 'cmp', 'quiz', 'quiz-custom', 'quiz-duel', 'pairs'],
      progress: ['slate', 'photos', 'groups'],
      // The first-launch question (CHOICE below): its words for this subject, one [answer, line] per CHOICE.opts id.
      start: {
        q: 'How well do you know corals?',
        opts: {
          new: ['I’m new to corals', 'Start from scratch: the app shows you the basics first.'],
          imr: ['I had the IMR coral course', 'You have met the genera in the IMR lecture.'],
          know: ['I know corals well', 'At IMR or elsewhere: you can already name many genera.']
        }
      },
      // The admin's part (admin plan PR 2, Pierre 2026-11-04: one Corals | Fish switch for the whole admin). hash: the
      // prefix of the subject's admin addresses ('' keeps every coral address as it was); cur: its part of curation.json
      // ('' = the top level, as before); pages: the admin pages it has (null = every page).
      admin: {hash: '', cur: '', pages: null}
    },
    {
      id: 'fish',
      dev: 'fish-',
      base: ['fbase', 'fpending'],
      name: 'Fish',
      one: 'family',
      many: 'families',
      what: 'Fish',
      card: 'fish',
      lecture: 'the IMR fish presentation',
      pv: 'fish.',
      zoom: 'the markings and the fins',
      remote: true,
      // In beta (2026-11-04: Pierre promised the beta players "something fishy is coming"): said on its buttons and, once
      // chosen, on Home (home.js: "Something fishy…" and this line, HTML).
      beta: {
        kick: 'Something fishy…',
        line: '<b>Fish is in beta</b>: the 27 IMR survey families, iNaturalist photos for now. Feedback welcome.'
      },
      // Opens to the admin and the beta group (Pierre, 2026-11-04: "a group I pick in the admin, for now everyone; not one
      // site-wide switch"); 'all' opens it to every player.
      open: 'group',
      views: [['wide', 'Photo']],
      optin: ['c2', 'c3', 'sci'], // sci: the scientific genera (app.js fishGenera, docs/FISH_PATH.md "Levels")
      log: false,
      ach: false,
      board: false,
      pages: ['genera', 'quiz'],
      progress: ['photos'],
      // The fish welcome question (Pierre, 2026-11-04, docs/FISH_PATH.md "The fish welcome question and the IMR answer"):
      // the coral question's twin, the same three answers' variables for now (CHOICE.opts; fish values from learnsim fish
      // profiles later). No Fish basics yet (pages): "new" offers none until it exists.
      start: {
        q: 'How well do you know reef fish?',
        opts: {
          new: ['I’m new to reef fish', 'Start from scratch: a few easy families first.'],
          imr: ['I’m at IMR (Research Assistant programme)', 'You are learning the IMR survey families.'],
          know: ['I know reef fish well', 'A diver or a guide: you can already name many families.']
        }
      },
      // The pages not about one subject (players' reports, the devices' errors, the players and their journeys) and the
      // fish pages the admin plan has built so far (docs/ROADMAP.md "Admin for every subject"): Candidates (PR 5a,
      // admin-fish.js).
      admin: {hash: 'fish/', cur: 'fish', pages: ['~triage', '~events', '~users', '~journey/', '~anon/', '~cand']}
    }
  ];
  // The subject chosen on this device (Home or the header), synced with the player's settings.
  const SUBJECT_KEY = 'reefid-sync-subject';
  const subjectOf = id => SUBJECTS.find(s => s.id === id) || SUBJECTS[0];
  const subjKey = (s, name) => KEYS.SYNC + subjectOf(s).id + '-' + name;
  const subjDev = (s, name) => KEYS.APP + subjectOf(s).dev + name;
  // A subject that opens to a group of players (SUBJECTS open: 'group'), not to everyone: the app, the admin and the sheet
  // keep a group for it (app.js subjOpen, admin.js groupOn, Code.gs groupIds_). Any other value opens it to all.
  const subjGroup = S => !!S && S.open === 'group';
  // A subject's first-launch answer (CHOICE): reefid-sync-<subject>-start, synced with the player's progress.
  const startKey = s => subjKey(s, 'start');
  // An answer's words for a subject (SUBJECTS start): [answer, line], null for an unknown answer.
  const startText = (s, c) => ((subjectOf(s).start || {}).opts || {})[c] || null;

  // Fish (fish.json, built by tools/build_fish.py; ARCHITECTURE.md "Fish content"). Level 1 of the game = the teaching
  // entries of level 1 (the 27 IMR entries of circle 1, then circles 2 and 3), each made into a record the engine reads
  // like a coral genus's (app.js GX): {id, name, fam, look (teaching ids, sub-entries folded into their entry), lk (how to
  // tell each apart, IMR's words), qt (the IMR cues), group (its group in the identification key in force, fish.json
  // key: the index of a reef fish ID book for the Indo-Pacific; rule S3), forms (that group: the wrong choices
  // start in other groups, as coral growth forms), ig (the same group), cm (how common near Dauin), views {wide:
  // photos}, levels 1, circle, wink, names (accepted when typed)}. photos: fish-photos.json "photos" (teaching id -> photo objects).
  // key: the identification key in force ({id, region, cite (full), short}, null for a region with none) and groups its
  // groups in its order ({n, title, pages}).
  // c1 = circle 1 (the slate: counts in the progress), c2 / c3 = the opt-in circles, winks = the wink entries (a
  // surprise card, never a question of the game).
  // first: one of the starter core (fish.json start, Pierre 2026-11-04), opened before the others (model.js openPick).
  // cover: the card's photo (app.js cover): within the highest source tier that has photos (rule P1: Pierre's own
  // before other observers', Codex review #461), the easiest judged one (fish-photos.json e, judging/FISH.md), the list's
  // first among equals; the list's first when none is judged.
  // sheet: fish-photos.json "sheet" (species id -> photos), the sheet-only photos (Pierre, 2026-11-05: a species with no
  // game photo may keep one for its sheet, never in the quiz or any game, passing the game photo rules all the same;
  // tools/fish_photos.py SHEET).
  // A photo marked use: 'ref' (sheet only, the corals' word) never joins an entry's game photos, wherever it is listed:
  // every game draw reads views.wide (model.js photoSet, app.js fishGenera), so none can show it. The result's sheet
  // holds them by species ({species id: [photo]}), for a species sheet to show (none yet: docs/ARCHITECTURE.md "Fish content").
  const sheetOnly = p => !!p && p.use === 'ref';
  function fishGen(F, photos, sheet) {
    const gen = {},
      sp = new Map((F.species || []).map(s => [s.id, s])),
      start = new Set(F.start || []),
      top = id => String(id).slice(0, 3),
      tier = p => (p.own ? 0 : 1),
      easiest = L => {
        const t = Math.min(...L.map(tier)),
          T = L.filter(p => tier(p) === t);
        return T.reduce((a, p) => ((p.e || 0) > (a.e || 0) ? p : a), T[0]).f;
      };
    (F.teach || [])
      .filter(t => t.level === 1)
      .forEach(t => {
        const dauin = (t.species || []).reduce((a, id) => a + (((sp.get(id) || {}).present || {}).dauin || 0), 0);
        gen[t.id] = {
          id: t.id,
          name: t.name,
          fam: t.fam,
          wfam: t.wfam || [],
          fish: 1,
          circle: t.circle,
          group: t.group || 0,
          ig: t.group || 0,
          forms: t.group ? ['g' + t.group] : [],
          look: [...new Set((t.look || []).map(([id]) => top(id)).filter(id => id !== t.id))],
          lk: (t.look || []).map(([id, txt]) => [top(id), txt]),
          lsrc: Object.fromEntries(
            (t.look || []).map(([id]) => [top(id), 'IMR fish presentation' + (t.sl ? ', slide ' + t.sl.join(', ') : '')])
          ),
          qt: t.cues && t.cues.length ? t.cues : null,
          sum: t.why || t.note || '',
          phase: t.phase || [],
          sub: (t.sub || []).map(s => s.name),
          cm: Math.round(Math.sqrt(dauin)),
          levels: 1,
          // nd: one of Pierre's own photos taken outside Dauin (the credit's "Dauin" tag is for his Dauin photos).
          views: {
            wide: ((photos || {})[t.id] || [])
              .filter(p => p && p.f && p.src && !sheetOnly(p))
              .map(p => (p.own && p.loc && p.loc !== 'dauin' ? {...p, nd: 1} : p))
          },
          ...(start.has(t.id) ? {first: 1} : {}),
          ...(t.wink ? {wink: t.wink, note: t.note || ''} : {}),
          names: fishNames(t)
        };
      });
    Object.values(gen).forEach(g => {
      if (g.views.wide.some(p => p.e)) g.cover = easiest(g.views.wide);
    });
    const ids = Object.keys(gen),
      play = n => !gen[n].wink,
      sh = {},
      shAdd = (id, p) => p && p.f && p.src && id && !(sh[id] = sh[id] || []).some(x => x.f === p.f) && sh[id].push({...p, use: 'ref'});
    Object.entries(sheet || {}).forEach(([id, L]) => (L || []).forEach(p => shAdd(id, p)));
    Object.values(photos || {}).forEach(L => (L || []).filter(sheetOnly).forEach(p => shAdd(p.sp, p)));
    return {
      gen,
      sheet: sh,
      c1: ids.filter(n => play(n) && gen[n].circle === 1),
      c2: ids.filter(n => play(n) && gen[n].circle === 2),
      c3: ids.filter(n => play(n) && gen[n].circle === 3),
      winks: ids.filter(n => !play(n)),
      key: F.key ? {id: F.key.id, region: F.key.region, cite: F.key.cite, short: F.key.short} : null,
      groups: (F.key && F.key.groups) || []
    };
  }
  // The names a teaching entry is known by, accepted when typed (Pierre, 2026-11-03, rule S2): its IMR name,
  // the parts of a double one ("Surgeonfish & Unicornfish"), its family as IMR writes it and the WoRMS families, and the
  // sub-entries IMR names inside it (Chromis, Bannerfish...). The first is the name shown.
  function fishNames(t) {
    const parts = String(t.name || '')
      .split(/\s*&\s*|\s+and\s+/)
      .filter(Boolean);
    return [...new Set([t.name, ...(parts.length > 1 ? parts : []), t.fam, ...(t.wfam || []), ...(t.sub || []).map(s => s.name)])].filter(
      Boolean
    );
  }
  // A whole name, normalised for typing (fish names have several words: "Moorish Idol"): letters only, lower case.
  const typeNormAll = s =>
    String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[^a-z]/g, '');
  // Every name a player may type for the fish entries gen (fishGen): [{k, g, old, alt}], old = the name typed when it is
  // not the entry's own (read as the entry), alt marks those as other names, not old ones. A name two entries share (a
  // family IMR splits: Holocentridae = Soldierfish and Squirrelfish) names both, so it is "which one?" (typeMatchIn near).
  function fishTypeNames(gen) {
    const out = [];
    Object.values(gen || {}).forEach(g =>
      (g.names || [g.name]).forEach((x, i) => {
        const k = typeNormAll(x);
        if (k && !out.some(o => o.k === k && o.g === g.id)) out.push({k, g: g.id, old: i ? x : '', alt: i ? 1 : 0});
      })
    );
    return out;
  }

  // A player's saved data (the sheet's Data, Code.gs save), with the keys of the subjects after the first (fish:
  // reefid-sync-fish-*) that the saved copy holds and the incoming one lacks kept from the saved copy: an app from before
  // that subject saves its whole record without them, and replacing the record would erase that progress, which no
  // answer log can rebuild (Codex review #442). saved, data: {key: value}; returns the data to save.
  function keepSubjectKeys(saved, data) {
    const out = {...(data || {})},
      pre = SUBJECTS.slice(1).map(S => KEYS.SYNC + S.id + '-');
    Object.keys(saved || {}).forEach(k => {
      if (!(k in out) && pre.some(x => k.startsWith(x))) out[k] = saved[k];
    });
    return out;
  }

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
      // A record recalculated here for the photo memory (pm, memRecalc) with no answer of its own counts as this device's
      // model only while the other side has not moved since B: answers saved from another device win over a mere
      // recalculation (Codex review #387: an old copy reopened must not undo a passed exam), and the recalculation is
      // applied to them after the merge (model.js memRecalcAll).
      // The same for a record this device adopted from the sheet's full replay (rv, the rules version: sync.js
      // replayAdopt): it replaces the copy of the same answers, unless the other side has answered since.
      const moved = x => (x.ok || 0) + (x.ko || 0) !== (b.ok || 0) + (b.ko || 0) || (x.h || '') !== (b.h || ''),
        mine = moved(l) || (((l.pm || 0) !== (b.pm || 0) || (l.rv || 0) !== (b.rv || 0)) && !moved(r));
      out.streak = mine ? l.streak || 0 : r.streak || 0;
      if (mine && l.h) out.h = l.h;
      if (mine)
        // vr: the Elo step's volatility (app.js abilityStep), part of the model the device that played updated; lt: the
        // global level at the genus's last own step (core.js levelMove), which goes with its th.
        ['lv', 'run', 'L', 'pg', 'pm', 'rv', 'th', 'lt', 'vr', 'ro', 'ex', 'mx'].forEach(k => {
          if (l[k] !== undefined) out[k] = l[k];
          else delete out[k];
        });
      // Times for the comeback after a break (model.js): the latest answer (at) and the latest day answered right (dl) of
      // either device; days answered right (dd) the larger count (two devices on different days count one less: safe side).
      ['at', 'dl', 'dd'].forEach(k => {
        const v = Math.max(Number(l[k]) || 0, Number(r[k]) || 0);
        if (v) out[k] = v;
        else delete out[k];
      });
      if (l.cor || r.cor) out.cor = 1;
      if (l.du || r.du) out.du = 1;
      // Mix-ups (conf: genus answered instead) and offers (off: genus offered as a wrong choice) add up across devices, and
      // so do the global level's answer times (rt, rtWeight: how many timed answers took each tenth of a second).
      ['conf', 'off', 'rt'].forEach(f => {
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
  // B's; bonus genera unlocked or on (bon) on either stay so. Returns B's data with the merged progress.
  // Each subject's progress and quiz settings are merged on their own (SUBJECTS: reefid-sync-<id>-progress, -quiz): a
  // subject neither account played stays out of the result; its opt-in sets (optin) on either stay on.
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
    const out = {...A, ...B};
    SUBJECTS.forEach((S, i) => {
      // The subject's first-launch record: the union of both accounts' histories (startUnion, Codex review #428), so the
      // replay after the merge applies each account's answers' priors at their times.
      const sk = startKey(S.id),
        sa = J(A, sk),
        sb = J(B, sk);
      if (sa || sb) out[sk] = JSON.stringify(startUnion(sa, sb));
      const pk = subjKey(S.id, 'progress'),
        qk = subjKey(S.id, 'quiz');
      if (!i || pk in A || pk in B) out[pk] = JSON.stringify(mergeUserP(J(A, pk) || {}, J(B, pk) || {}));
      const qa = J(A, qk),
        qb = J(B, qk);
      if (qa || qb) {
        const q = {...(qa || {}), ...(qb || {}), bu: Math.max((qa || {}).bu || 0, (qb || {}).bu || 0)};
        S.optin.forEach(k => {
          if ((qa || {})[k] || (qb || {})[k]) q[k] = true;
        });
        out[qk] = JSON.stringify(q);
      }
      // The rules version the progress was replayed with (sync.js RVK): the merged record is no replay of the two logs
      // together, so it has none, and every device of the account asks for the replay of both histories in time order
      // (the sheet relabels the answers; Codex review #399: the merged model of 20 older right answers and 10 newer misses
      // kept pg 0.96 for good).
      delete out[subjKey(S.id, 'rv')];
    });
    return out;
  }
  // One subject's progress of two accounts (mergeUsers).
  function mergeUserP(a, b) {
    const P = {};
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
      // The progress comes from the same account as the rest of the model, recomputed if it was saved before s.pg
      // (Codex review #367: an old main record let the other account's pg through).
      if (typeof main.pg === 'number' || main.h || typeof main.L === 'number') o.pg = pgOf(main);
      // The photo memory mark goes with that progress (memRecalc): the other account's would leave it uncorrected.
      if (main.pm) o.pm = main.pm;
      else delete o.pm;
      // The level a genus's ability was last stepped against (lt, model.js levelRise) is the old account's: the merged
      // account's level is another, so the level's rise counts again from the genus's next own answer.
      delete o.lt;
      o.ok = (x.ok || 0) + (y.ok || 0);
      o.ko = (x.ko || 0) + (y.ko || 0);
      o.streak = main.streak || 0;
      // Answer times (rt, the global level's) add up like the mix-ups: the same person's.
      ['conf', 'off', 'rt'].forEach(f => {
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
    return P;
  }

  // Who rates the photos and the confusions, as tools/sync/Code.gs trusted_ (v17; v18: devices that never signed in too,
  // under the same rule, Pierre 2026-11-02): players with TRUST.N answers or more and a right rate clearly above chance (one-sided z of at least TRUST.Z against each question's guess rate).
  const TRUST = {N: 10, Z: 1.645}; // answers per player, not per photo
  // As Code.gs guess_ (v20): without |kN, a photo-quiz question with 2 or 3 genera in its choices (readAnswers row
  // index 10) is rated with 1 / choices ("Again: A or B?", logged plain "quiz" until 2026-11-02).
  // A typed answer (|t, 2026-11-03: the player types the genus instead of picking one of the choices) has no guess rate:
  // nothing to pick from, so the expected success has no 1/k floor (Code.gs guess_ v27; model.js TYPED.k).
  const TYPED_RE = /\|t(\||$)/;
  const guessOf = (mode, choices) => {
    if (TYPED_RE.test(mode)) return 0;
    const kq = /\|k(\d)$/.exec(mode);
    if (kq) return 1 / Number(kq[1]);
    if (mode.indexOf('quiz-duel') === 0) return 0.5;
    const n = String(choices || '')
      .split(/\s+/)
      .filter(Boolean).length;
    return n >= 2 && n < 4 ? 1 / n : 0.25;
  };
  // How sure a player's level is (Pierre, 2026-11-03: a level from 35 answers at 97% right sat above one from 245):
  // {player id: 95% margin, in level units}, 1.96 / sqrt(Fisher information) gathered on the same replay as the level
  // itself (eloReplay, Code.gs stats_ ras; Codex review #375): an answer that was a near-sure success tells little, so a
  // run of easy right answers keeps the margin wide.
  // A player's right rate in the photo quiz apart from the Duel tab (Pierre, 2026-11-03: a new player's 31 duels on one
  // chosen pair, 2 choices each, made 89% in the quiz read as 95%): per anonymous id, [answers, right] in the quiz (mode
  // quiz or quiz|…, duels slipped into the quiz included), in its last 50, and in the Duel tab (quiz-duel…). Other
  // games are in neither. rows: readAnswers rows [id, t, shown, answered, ok, mode, …].
  function playSplit(rows) {
    const out = {};
    (rows || [])
      .slice()
      .sort((a, b) => a[1] - b[1])
      .forEach(r => {
        const m = String(r[5] || ''),
          o = (out[r[0]] = out[r[0]] || {q: [0, 0], d: [0, 0], L: []});
        if (m.startsWith('quiz-duel')) (o.d[0]++, (o.d[1] += r[4] ? 1 : 0));
        else if (m === 'quiz' || m.startsWith('quiz|')) (o.q[0]++, (o.q[1] += r[4] ? 1 : 0), o.L.push(r[4] ? 1 : 0));
      });
    Object.values(out).forEach(o => {
      const L = o.L.slice(-50);
      o.q50 = [L.length, L.reduce((t, x) => t + x, 0)];
      delete o.L;
    });
    return out;
  }
  function levelMargin(rows) {
    const {R} = eloReplay(rows || []);
    return Object.fromEntries(Object.entries(R).map(([k, r]) => [k, r[2] > 0 ? 1.96 / Math.sqrt(r[2]) : Infinity]));
  }
  function trustOf(rows) {
    const T = {},
      out = {};
    rows.forEach(r => {
      if (!r[0]) return;
      const t = (T[r[0]] = T[r[0]] || [0, 0, 0, 0, 0]),
        g = guessOf(r[5], r[10]);
      t[0]++;
      t[1] += r[4] ? 1 : 0;
      t[2] += g;
      t[3] += g * (1 - g);
      if (r[11]) t[4] = 1;
    });
    Object.keys(T).forEach(w => {
      const t = T[w];
      out[w] = t[0] >= TRUST.N && (t[1] - t[2]) / Math.sqrt(t[3]) >= TRUST.Z;
    });
    return out;
  }

  // How much one answer moves the photos, as Code.gs PHOTO_W (v17): weight n / (n + N) after n answers of the player.
  // NEW and KNOWN: the fixed memory rule of v17-v25 (a photo new to the player 0.5 harder, one right twice before 1
  // easier), now only the prior of the estimated photo memory below (MEM).
  const PHOTO_W = {N: 10, NEW: 0.5, KNOWN: -1}; // v18: 10, was 30 (same reason)
  // Every player starts as a beginner (Code.gs PLAYER0): about 45% right on an average photo with 4 choices.
  const PLAYER0 = -1;
  // Photo memory (Pierre, 2026-11-03: in a genus with few photos the same ones come back, players learn the photos
  // rather than the genus, and that skews the photo difficulty and the player's progress). One rule for the sheet, the
  // admin and the app: an answer on a photo is expected easier by an offset (logits subtracted from its difficulty) that
  // depends on the player's own history with that photo, [times shown, times right] (H in the replay, s.ps in the app):
  // bucket 0 new, 1 shown but never right, 2 right once, 3 right twice or more (memBucket). A question with several
  // photos takes the mean offset of its photos (memFam). New is the reference, 0: a photo's rating is what a player meets
  // on it the first time. The other three are estimated from the trusted answers, rated in the same replay as the photos
  // and the players (eloReplay, Code.gs stats_, v26): after each answer, each offset its photos fall in moves by its
  // surprise (right - expected) over the information gathered so far plus the prior's (a step of Newton's method on the
  // log-likelihood, as Glicko moves a rating by what it learns over how sure it already is), the prior MEM.PRIOR weighing
  // as much as MEM.N answers at the game's usual chance (80%, 4 choices). The prior is the old fixed rule (PHOTO_W) as
  // offsets from a new photo: 0, -0.5, -0.5, -1.5; a bucket with few answers stays close to it. N 10: answers on a
  // remembered photo are 90% right or more, where each tells little, so the 64 "right once" answers of the first 550
  // move it about two thirds of the way to what they show (30: half way). ?stats=1 serves the estimate as mem (memn:
  // answers behind each bucket); the app falls back to the prior with an older sheet (memOf). docs/LEARNING.md "Photo
  // memory".
  const MEM = {N: 10, PRIOR: [0, -PHOTO_W.NEW, -PHOTO_W.NEW, PHOTO_W.KNOWN - PHOTO_W.NEW]};
  const memBucket = h => (!h || !h[0] ? 0 : !h[1] ? 1 : h[1] === 1 ? 2 : 3);
  const memFam = (hs, mem) => (hs.length ? hs.reduce((t, h) => t + mem[memBucket(h)], 0) / hs.length : 0);
  // The offsets of a ?stats=1 reply (mem, sheet v26), or the prior from an older sheet.
  const memOf = m =>
    Array.isArray(m) && m.length === 4 && m.every(x => typeof x === 'number' && isFinite(x)) ? m.slice() : MEM.PRIOR.slice();
  // Fisher information of one answer at ability - difficulty x with k choices; the prior's weight is MEM.N of them at
  // x = 1 with 4 choices (about 80% right), 0.135 each.
  const infoAt = (x, k) => {
    const s = 1 / (1 + Math.exp(-x)),
      p = 1 / k + (1 - 1 / k) * s;
    return ((1 - 1 / k) * s * (1 - s)) ** 2 / (p * (1 - p));
  };
  // Hierarchical photo Elo (Pierre, 2026-11-03; docs/LEARNING.md "Hierarchical photo Elo"): a photo's difficulty is its
  // genus's offset plus its own residual, the player rule "global level + genus" (Pelánek et al. 2017) applied to the
  // photos. Both move on every trusted answer by the same surprise: the residual as the photo rating always did, the
  // genus offset by GENUS_K / (1 + its weighed answers / 10), the photos' damping form. A photo nobody has answered starts
  // at its genus's offset instead of 0. GENUS_K 0.4: on the real answer log, replayed with each answer scored before it
  // moves anything, 0.2 and 0.4 both beat a photo-only Elo and the Easy / Medium / Hard prior, 0.8 moves too fast.
  // Code.gs GENUS_K in step; ?stats=1 serves the offsets as gd (sheet v31), the photos' ratings as totals.
  const GENUS_K = 0.4;
  // Photo Elo replayed over the answer log (rows [id, time ms, genus shown, answered, right 0|1, mode, photos…]), as
  // tools/sync/Code.gs stats_ does in the sheet: keep the two in step (tests/core.test.js compares them). Every answer
  // moves the player's level; the photos and the memory offsets move on trusted players' answers only (trustOf, v17),
  // weighed as above. All against the same expectation, photo memory included (until v25 the level ignored memory
  // and the photos used the fixed rule, so the two pulled apart).
  // Returns the photo ratings P (the residual, [rating, weighed answers, weighed right, answers]), the genus of each photo
  // PG, the genus offsets G ([offset, weighed answers]), the player levels R ([level, answers, information]), the memory
  // offsets mem (rounded as served) and memn, the trusted answers behind each bucket (a question with several photos
  // shares its answer between their buckets). Every photo of a question is of the genus shown (one colony, rule P4).
  function eloReplay(rows) {
    const P = {},
      PG = {},
      G = {},
      R = {},
      H = {},
      trust = trustOf(rows),
      mem = MEM.PRIOR.slice(),
      I = [0, 0, 0, 0],
      N = [0, 0, 0, 0],
      tau = MEM.N * infoAt(1, 4),
      sig = x => 1 / (1 + Math.exp(-x));
    rows
      .slice()
      .sort((a, b) => a[1] - b[1])
      .forEach(r => {
        const fs = r[6].split(/\s+/).filter(Boolean);
        if (!r[0] || !fs.length) return;
        const ok = r[4] ? 1 : 0,
          g = guessOf(r[5], r[10]),
          ra = (R[r[0]] = R[r[0]] || [PLAYER0, 0]);
        const gs = String(r[2] || ''),
          go = (G[gs] = G[gs] || [0, 0]),
          ph = fs.map(f => ((PG[f] = gs), (P[f] = P[f] || [0, 0, 0, 0]))),
          b = go[0] + ph.reduce((t, p) => t + p[0], 0) / ph.length + (ph.length === 1 ? 0.5 : 0);
        const hs = fs.map(f => (H[r[0] + '|' + f] = H[r[0] + '|' + f] || [0, 0])),
          s = sig(ra[0] - b - memFam(hs, mem)),
          e = g + (1 - g) * s,
          d = ok - e,
          n = ra[1];
        if (trust[r[0]]) {
          const w = n / (n + PHOTO_W.N),
            D = (1 - g) * s * (1 - s),
            v = Math.max(1e-6, e * (1 - e)),
            A = [0, 0, 0, 0];
          ph.forEach(p => {
            p[0] -= (0.8 / (1 + p[2] / 10) / ph.length) * d * w;
            p[2] += w;
            p[1] += ok * w;
            p[3]++;
          });
          go[0] -= (GENUS_K / (1 + go[1] / 10)) * d * w;
          go[1] += w;
          hs.forEach(h => (A[memBucket(h)] += 1 / hs.length));
          for (let j = 1; j < 4; j++)
            if (A[j]) {
              I[j] += (w * (D * A[j]) ** 2) / v;
              mem[j] -= (w * d * D * A[j]) / v / (tau + I[j]);
              N[j] += A[j];
            }
          N[0] += A[0];
        }
        // Fisher information about the level from this answer, on the same model as the level's step (levelMargin).
        ra[2] = (ra[2] || 0) + ((1 - g) * s * (1 - s)) ** 2 / Math.max(1e-6, e * (1 - e));
        ra[0] += (0.6 / (1 + n / 40)) * d;
        ra[1]++;
        hs.forEach(h => {
          h[0]++;
          h[1] += ok;
        });
      });
    return {P, PG, G, R, mem: mem.map(x => Math.round(x * 100) / 100), memn: N.map(x => Math.round(x * 10) / 10)};
  }
  // The photo memory offsets estimated from the answer log, as Code.gs ?stats=1 mem and memn.
  function photoMemOf(rows) {
    const {mem, memn} = eloReplay(rows);
    return {mem, memn};
  }
  // Progress saved before the photo memory, recalculated once and silently (Pierre, 2026-11-03: the replay of the real
  // answer log moved the bars down 1-3 points, so no pop-up). Every answer since the change weighs a right answer on a
  // known photo x pgMemW (model.js); the answers before it counted in full. The device keeps no answer log for a
  // signed-in player (the sheet has it), only each genus's record: its photos [shown, right] (s.ps). A uniform factor f
  // on the right answers' weights multiplies the moving average's balance odds by f (pg = p w / (p w + (1 - p) m) for a
  // success rate p, right weight w, miss weight m), so pg' = f pg / (f pg + 1 - pg), f the mean weight of the genus's
  // right answers: of a photo's r right answers in n shows, r / n count as its first show (weight 1, a share as if right
  // answers fell evenly on its shows) and the rest as repeats, at the weight of the bucket the photo has now, at the
  // game's target (ability 1 above the photo, 4 choices). Approximate (no order is kept, misses on known photos are not
  // redone): tools/memreplay.js prints it beside the full replay of the sheet's log. Never raises a bar. A learned genus is
  // left alone (its exam showed photos never seen). Once per record: s.pm marks it (also set on a record that needed no
  // change) and travels with s.pg between devices (mergeProgress, mergeUsers), so no device corrects a record twice; a
  // record made after the change is marked at its first answer (quiz.js answer) and never corrected. Returns true when
  // it marked the record now or dropped a former learned mark (below).
  // Learned under the former model (Pierre, 2026-11-03: "I find it hard to believe that the two genera marked as learned
  // really are"): a genus learned on a record without s.pg passed its exam under BKT (before 2026-11-02), whose
  // estimate reached 95% after about 4 right answers, so the exam came at once, mostly against easy choices; replayed
  // with today's rules (tools/memreplay.js) those genera stand at 78-83%, under the exam's entry. Their learned mark
  // (and any exam in course) is dropped at every call (load, pull, answer: a copy from another device that still has it
  // loses it too); the genus keeps its bar from its record (pgOf, s.h) and takes the exam again. An exam passed since
  // (s.pg kept beside s.mx) is left alone. Not silent (Pierre, 2026-11-03: players know they test an early beta): the
  // app sees the mark go (model.js mxRecalc), tells the player once with a card (progress.js mxLostNotice) and takes back the
  // learned-based achievements the progress no longer meets (achRevoke, progress.js achRecheck).
  // Since the sheet's full replay (replayProgress, RVS; 2026-11-03) this is only the fallback for a device that never
  // reaches the sheet: a record adopted from the replay carries pm 1, so it is never corrected here.
  function memRecalc(s, mem) {
    if (!s || typeof s !== 'object') return false;
    let old = false;
    if (s.mx && typeof s.pg !== 'number') {
      delete s.mx;
      delete s.ex;
      old = true;
    }
    if (s.pm) return old;
    s.pm = 1;
    if (s.mx || typeof s.pg !== 'number' || !(s.pg > 0)) return true;
    const e = x => 0.25 + 0.75 / (1 + Math.exp(-x));
    let r = 0,
      w = 0;
    Object.values(s.ps || {}).forEach(h => {
      if (!Array.isArray(h) || !(h[0] > 0) || !(h[1] > 0)) return;
      const first = h[1] / h[0];
      r += h[1];
      w += first + (h[1] - first) * Math.min(1, e(1) / e(1 - mem[memBucket(h)]));
    });
    if (r && w < r) {
      const f = w / r;
      s.pg = Math.round(((f * s.pg) / (f * s.pg + 1 - s.pg)) * 1e4) / 1e4;
    }
    return true;
  }
  // The photo ratings as Code.gs ?stats=1 photos: [difficulty (genus offset + residual), weighed answers, weighed right,
  // answers].
  function eloOf(rows) {
    const {P, PG, G} = eloReplay(rows);
    const out = {};
    Object.keys(P).forEach(
      f =>
        (out[f] = [Math.round((G[PG[f]][0] + P[f][0]) * 100) / 100, Math.round(P[f][2] * 10) / 10, Math.round(P[f][1] * 10) / 10, P[f][3]])
    );
    return out;
  }
  // The genus offsets as Code.gs ?stats=1 gd (v31): {genus: [offset, weighed answers]}.
  function genusOffsetsOf(rows) {
    const {G} = eloReplay(rows);
    return Object.fromEntries(Object.entries(G).map(([n, o]) => [n, [Math.round(o[0] * 100) / 100, Math.round(o[1] * 10) / 10]]));
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
  // N (2026-11-04): the offers a pair needs before the data can make it a look-alike (dataLook, below).
  const CONF = {W: 8, LOOK: 0.3, FAM: 0.12, FORM: 0.08, BASE: 0.03, TRAP: 0.2, N: 20};
  const confScore = (c, prior) => ((c ? c[1] : 0) + CONF.W * prior) / ((c ? c[0] : 0) + CONF.W);
  // A look-alike from the data (Pierre, 2026-11-04: "if the data says people constantly confuse two genera, they become
  // look-alikes by force; that was the point of the confusion data: to find look-alikes the courses never named"): a
  // pair offered together CONF.N times or more (c, the pooled [offered, mixed up]) whose pooled score (score, confScore
  // on the pair's own prior: same family, a shared growth form or neither) reaches CONF.TRAP. The prior's weight (CONF.W
  // offers at a low rate) is what makes it clear: at 20 offers a pair of unrelated genera needs 6 mix-ups (30%), when
  // the declared look-alikes were mixed up 13% of the time they were offered (the real answers of 2026-11-03).
  const dataLook = (c, score) => !!c && c[0] >= CONF.N && score >= CONF.TRAP;
  // How much harder a question is for a player who mixes up its genus with one of its choices more than everyone does
  // (2026-11-04, docs/LEARNING.md "Known mix-ups"): the player's own score of the pair (own, pairConf, shrunk toward the
  // pooled score as confOf does) against the pooled score, in logits, when higher; 0 for a pair the player mixes up no
  // more than everyone. The pooled score already shows in the photos' difficulty (every player's answers); this is the
  // player's own excess, so it is never counted twice. No constant: confScore's own prior weight sets how fast it grows.
  const logitOf = p => Math.log(p / (1 - p));
  const confGap = (own, pooled) => {
    const q = Math.min(0.99, Math.max(0.01, pooled));
    return Math.max(0, logitOf(Math.min(0.99, confScore(own, q))) - logitOf(q));
  };
  // One player's own record on a pair (progress P): [times the two were offered together, times mixed up], both directions.
  // Offers are counted since 2026-11-01 (P[g].off); mix-ups logged before that count as offered at least once each.
  function pairConf(P, a, b) {
    const x = P[a] || {},
      y = P[b] || {},
      mix = ((x.conf || {})[b] || 0) + ((y.conf || {})[a] || 0);
    return [Math.max(mix, ((x.off || {})[b] || 0) + ((y.off || {})[a] || 0)), mix];
  }

  // An apology, once (Pierre, 2026-11-04): from the opening rule of #408 (merged FROM) to this fix, the app opened too
  // many genera at once to strong players and did not ease the questions after misses. Only to the players who really
  // felt it (Pierre: "a player who answered a single question then must not get it"), read from the device's own data
  // when this version first runs on it (progress.js sorryNotice keeps it, so later play changes nothing):
  // - n: their answers in the window, at least SORRY.N (20). Exact from the answers the device still keeps (signed out:
  //   all of them); else the answers since the last card shown before FROM (the cards keep the answers count and time).
  // - h: the opening hold's sum then (model.js holdStep: a CUSUM of the shortfall against each answer's expected
  //   success e, 0.1 allowed per answer), so where their last run ended: SORRY.H (3, 2 x INTRO.HOLD, the evidence the
  //   back-to-one-at-a-time card asks for) or more; or half of it with SORRY.CARDS (4, one more than OPEN.MAX now allows)
  //   genera or more opened on cards within OPEN.WIN answers in the window (c, the most in any 15).
  // On the real answers (2026-11-03) it selects both collapsed runs (44 answers, h 3.22, 7 cards in 16 answers; 31
  // answers, h 4.31) and nobody else; a run at the expected success ends at 3 or more about 2-5% of the time
  // (simulated, 20-80 answers at e 0.7-0.9). Not after UNTIL: a player back weeks later would not know what it is about.
  const SORRY = {FROM: Date.parse('2026-11-03T11:34:11Z'), UNTIL: Date.parse('2026-11-17T00:00:00Z'), N: 20, H: 3, CARDS: 4, WIN: 15};
  const sorryFelt = ({n, h, c}) =>
    (Number(n) || 0) >= SORRY.N && ((Number(h) || 0) >= SORRY.H || ((Number(c) || 0) >= SORRY.CARDS && h >= SORRY.H / 2));
  // The inputs from the device's data at its first run (first: that time): log, the answers it keeps ({t ISO, ok, e});
  // cards, the intro map ({genus: [answers, ready, time, kind]}); total, the player's answers count; h, the hold's sum.
  const sorryOf = ({log, cards, total, h, first}) => {
    const inW = t => typeof t === 'number' && t >= SORRY.FROM && t < first,
      nLog = (log || []).filter(a => a && inW(Date.parse(a.t))).length,
      E = Object.values(cards || {}).filter(e => Array.isArray(e)),
      before = E.filter(e => typeof e[2] === 'number' && e[2] < SORRY.FROM).map(e => Number(e[0]) || 0), // cards with no time (older) say nothing
      win = E.filter(e => inW(e[2]) && (e[3] || 'c') === 'c').map(e => Number(e[0]) || 0),
      // Answers since the last card shown before the window; with no card before it, every answer was in it only when
      // the cards in it show the player started there.
      est = before.length ? total - Math.max(...before) : win.length ? total : 0;
    return {
      n: Math.max(nLog, est),
      h: Number(h) || 0,
      c: Math.max(0, ...win.map(x => win.filter(y => y >= x && y < x + SORRY.WIN).length))
    };
  };
  const sorryDue = ({felt, now, shown}) => !shown && now < SORRY.UNTIL && !!felt && sorryFelt(felt);
  // The first name to greet a player with, from their sign-in name (Pierre, 2026-11-04, for every personalised card,
  // rule U10): the first word ("Ana Lopez" -> "Ana", "Ana B." -> "Ana"), its first letter capitalised;
  // only the letters it starts with (an apostrophe or a hyphen inside kept: "O'Neil", "Jean-Luc"), so a name with no
  // letter first ("~a12", "123") gives '' and the card says a plain "Hi!".
  const firstName = name => {
    const m = /^\p{L}[\p{L}\p{M}'’-]*/u.exec(String(name || '').trim()),
      w = m ? m[0].replace(/['’-]+$/, '') : '';
    return w ? w[0].toUpperCase() + w.slice(1) : '';
  };
  const sorryHi = name => (firstName(name) ? `Hi ${firstName(name)}!` : 'Hi!');
  // When it happened, as the player's clock says it (tz: minutes behind UTC, Date's getTimezoneOffset): this evening,
  // yesterday evening (afternoon, morning), else the date.
  const sorryWhen = (now, tz = 0) => {
    const loc = t => new Date(t - tz * 60000),
      f = loc(SORRY.FROM),
      day = t => Math.floor((t - tz * 60000) / 864e5),
      h = f.getUTCHours(),
      part = h >= 17 ? 'evening' : h >= 12 ? 'afternoon' : 'morning',
      d = day(now) - day(SORRY.FROM);
    if (d <= 0) return `This ${part}`;
    if (d === 1) return `Yesterday ${part}`;
    return `On ${f.getUTCDate()} ${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][f.getUTCMonth()]}`;
  };
  const sorryText = (name, now, tz) => ({
    t: `${sorryHi(name)} Sorry about your last run.`,
    p: `${sorryWhen(now, tz)} we adjusted how the app picks your questions, and some of it wasn't right yet: too many new genera came at once, and the questions didn't get easier after misses. It's fixed now. Sorry for the rough ride!`
  });

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
  // and view: sheet = 3 featured + the other IMR/own photos (filled up to 6 in all); games = one list, every photo kept
  // (game: the featured first, then IMR/own, each by quality, Poor last; until 2026-11-03 it was split into Easy / Medium
  // / Hard sets that gave a new photo its starting difficulty, docs/LEARNING.md): since 2026-11-02 (Pierre: new photos must
  // come into the games, the players' answers rate them) games take every photo kept, IMR/own first; they were capped
  // at 4 Medium and 4 Hard, other observers' photos only filling a short set, so newly validated candidates stayed out; Coral
  // Coral ID Key (needs variety) = featured + 2 photos from other iNat observers + 3 approved book photos. Pierre's picks (feat, hide, quality, use) always win; Claude's suggestions
  // (picks.json feat) come next, then quality. curation.json "use" {f: 'ref'|'game'} keeps a photo on the sheet only
  // or in games only. Nothing is written back: photos left out simply stay unused.
  const CAP = {feat: 3, sheet: 6, inat: 2, book: 3};
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
        // One list per view (Pierre, 2026-11-03: the Easy / Medium / Hard sets went, docs/LEARNING.md "Hierarchical
        // photo Elo"): the featured game photos first, then IMR / own before other observers, each by quality, Poor last.
        const lead = feat.filter(p => gm.includes(p)),
          after = [...core, ...rest].filter(p => !lead.includes(p));
        const book = bk.filter(p => !feat.includes(p)).slice(0, CAP.book);
        g.sl[v] = {
          feat,
          more,
          game: [...lead, ...after.filter(p => q(p) >= 2), ...after.filter(p => q(p) < 2)],
          idkey: [
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
  // p (2026-11-03, the first-launch question, CHOICE below): the level the player said they start from. The answers are
  // shrunk towards it instead of towards 0, with the same weight N: (m t + N p) / (m + N). No answers: W x p; p 0 (the
  // default, "I'm new to corals") is the rule as it was. No new constant.
  const LEVEL = '~level',
    START = {W: 0.8, N: 10, LO: -0.5, HI: 1.5};
  function playerStart(P, skip, p = 0) {
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
    p = typeof p === 'number' && isFinite(p) ? p : 0;
    if (!m && !p) return 0;
    const v = (START.W * (t + START.N * p)) / (m + START.N);
    return Math.round(Math.min(START.HI, Math.max(START.LO, v)) * 100) / 100;
  }

  // The first-launch question (Pierre, 2026-11-03): a forced choice among three, in the welcome tour before the first
  // question (or on a card before the next quiz question for a player who skipped the tour, and once for an existing
  // player with fewer than ASK answers; from ASK answers on the choice is inferred silently: startInfer). It initialises
  // a few variables of the existing model, never a coded path: v.p, the level the answers are shrunk towards (playerStart:
  // the starting ability of a genus never answered, hence the photos, traps and single views of its first questions, and
  // the shaky signal that paces the opening of genera); v.at, the answer from which the offer to open all genera can come
  // (model.js introOffer, INTRO.OFFER.AT for everyone before); v.basics, Coral basics offered first. "new" is the
  // default player of before (a new player is a beginner). Values and their simulation: docs/LEARNING.md "The first-
  // launch question". Each subject asks its own (SUBJECTS start: its words; the fish welcome question, Pierre 2026-11-04),
  // with these answers and variables, stored per subject in reefid-sync-<subject>-start (startKey, synced with the
  // progress): {c, t, at, via, w, v, hd, fb, h}.
  // Fallback (for everyone, also those who answered: they may have picked wrong): the answers after the choice (w:
  // [difficulty, guess rate, right, first answer on its genus], kept up to the last checkpoint) are checked at AT (40
  // and 60) answers only (Pierre, 2026-11-04: no card before 40 answers in either direction, "an expert, 20 answers
  // isn't enough: with few genera unlocked even a mediocre player gets everything right"; startCheck). The level each
  // answer predicts is a band around its prior, the edges midway between the priors (new under 0.25, IMR course 0.25 to
  // 0.875, know well above). The rule reads the level the game already keeps, the global level (the Elo over every
  // answer, difficulty allowed for), with its standard error over the window (Pierre's pick, 2026-11-04, variant
  // "Ba80H", after weighing the errors: a true beginner left on a harder path is the costliest one, so "lower" is
  // sensitive and its card a gentle offer, cheap when it is wrong): 'lo' (Coral basics, or a lower answer; only for the
  // answers with a floor, IMR course and know well) when the global level is below the floor with one-sided 80%
  // confidence (ZL), or the opening hold has fired in the window (#425 eases the questions then, so the misses do not
  // show in the level); 'hi' (a higher answer), with OFFER.MET (10) genera met, when the global level is above the
  // band's ceiling with 95% confidence (Z, as the admin's level margin) and, as a guard only, the level fitted on each
  // genus's FIRST answer (before the game has adapted to it; levelFit) is above the ceiling too: a player who did well
  // only on the few genera they have learned is not moved up. The simulation, the real log and the variants compared:
  // docs/LEARNING.md "The fallback test, redesigned".
  const CHOICE = {
    ASK: 50,
    AT: [40, 60], // the checkpoints of the fallback window (answers after the choice); the window ends at the last
    Z: 1.96,
    ZL: 0.84, // "lower": one-sided 80%
    MET: 10, // the slate genera met before a 'hi' verdict: the same as the open-all offer's (model.js INTRO.OFFER.MET)
    // [id, variables], in order from the lowest level to the highest (startBand); their words per subject: SUBJECTS start.
    opts: [
      ['new', {p: 0, at: 50, basics: 1}],
      ['imr', {p: 0.5, at: 30, basics: 0}],
      ['know', {p: 1.25, at: 20, basics: 0}]
    ]
  };
  const startOpt = c => CHOICE.opts.find(o => o[0] === c) || null;
  // The variables of a choice (none yet, or an unknown one: the default player's).
  const startVars = c => (startOpt(c) || CHOICE.opts[0])[1];
  // The band of levels an answer predicts: [floor, ceiling], the edges midway between its prior and its neighbours'.
  function startBand(c) {
    const i = CHOICE.opts.findIndex(o => o[0] === c),
      p = j => CHOICE.opts[j][1].p;
    return [i > 0 ? (p(i - 1) + p(i)) / 2 : -Infinity, i >= 0 && i < CHOICE.opts.length - 1 ? (p(i) + p(i + 1)) / 2 : Infinity];
  }
  // The level that best explains answers A ([difficulty, guess rate, right]) on the ability scale (the app's
  // g + (1 - g) sigmoid(level - difficulty)), searched over ELO.lo..hi, and its standard error 1 / sqrt(information).
  const stSig = x => 1 / (1 + Math.exp(-x));
  const stP = (th, d, g) => g + (1 - g) * stSig(th - d);
  const stInfo = (th, d, g) => {
    const q = stSig(th - d),
      pr = stP(th, d, g);
    return ((1 - g) * q * (1 - q)) ** 2 / Math.max(1e-9, pr * (1 - pr));
  };
  const stSe = (th, A) =>
    1 /
    Math.sqrt(
      Math.max(
        1e-9,
        A.reduce((t, a) => t + stInfo(th, a[0], a[1]), 0)
      )
    );
  function levelFit(A) {
    let best = -Infinity,
      bt = 0;
    for (let i = 0, lo = -1.5, hi = 3; lo + i * 0.02 <= hi + 1e-9; i++) {
      const th = lo + i * 0.02,
        ll = A.reduce((t, a) => t + Math.log(a[2] ? stP(th, a[0], a[1]) : 1 - stP(th, a[0], a[1])), 0);
      if (ll > best) ((best = ll), (bt = th));
    }
    return [Math.round(bt * 100) / 100, stSe(bt, A)];
  }
  // The verdict at a checkpoint (AT: 40 or 60 answers after the choice), null between them and when consistent: 'lo'
  // or 'hi' (above: the opening hold alone is enough for 'lo'). w: the window's answers [d, g, right, first]; lv: the global level now; met: the slate genera met;
  // held: the opening hold fired in the window.
  function startCheck(w, c, lv, met, held) {
    const n = (w || []).length;
    if (!CHOICE.AT.includes(n) || !startOpt(c) || typeof lv !== 'number') return null;
    const [floor, ceil] = startBand(c),
      se = stSe(lv, w),
      z = CHOICE.Z;
    if (isFinite(floor) && (held || lv + CHOICE.ZL * se < floor)) return 'lo';
    if (met < CHOICE.MET || lv - z * se <= ceil) return null;
    // The guard: the first answers on each genus above the ceiling too (never a trigger on their own).
    const F = w.filter(a => a[3]);
    return F.length && levelFit(F)[0] > ceil ? 'hi' : null;
  }
  // The choices a fallback card offers: below the current one ('lo') or above it ('hi').
  const startNext = (c, dir) => {
    const i = CHOICE.opts.findIndex(o => o[0] === c);
    return (dir === 'lo' ? CHOICE.opts.slice(0, Math.max(0, i)).reverse() : CHOICE.opts.slice(i + 1)).map(o => o[0]);
  };
  // An existing player with ASK answers or more is not asked: the choice is inferred from their global level (the Elo
  // over all their answers, LEVEL), the choice whose starting level W x p is nearest (midpoints: under 0.2 new, under 0.7
  // imr, else know). Shown as "inferred" in the admin's player journey.
  function startInfer(P) {
    const G = (P || {})[LEVEL],
      t = G && typeof G.th === 'number' ? G.th : 0;
    return CHOICE.opts.reduce((b, o) => (Math.abs(START.W * o[1].p - t) < Math.abs(START.W * b[1].p - t) ? o : b))[0];
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

  // Common first (Pierre, 2026-11-03: open the genera "easy and common first"): the opening weight of each genus not met
  // yet (model.js weighted) is multiplied by sqrt((1 + cm) / (1 + median cm of those genera)), cm = how common the genus
  // is near Dauin on iNaturalist (data.json, tools/commonness.py). No constant: the square root damps it, the median
  // makes it relative to the genera still to open. A genus without cm counts as the median (factor 1).
  // An existing account at sign-in (Pierre, 2026-11-03: players type only their first name, so two of them can pick the
  // same name and code; sync.js bindSync asks "Is it you?" before entering it): what its saved progress, as the sheet's
  // sign-in reply carries it (data, updated), says about it. n: answers (the LEVEL record's ok + ko; 0 for progress saved
  // before LEVEL existed), genera: genera answered, at: the last answer (LEVEL.at, else the latest genus s.at, else the
  // sheet's last save, then saved is true). A missing or broken field counts as nothing, never as an error.
  function accountOf(data, updated) {
    let R = {};
    try {
      R = JSON.parse((data && data['reefid-sync-coral-progress']) || '{}');
    } catch (e) {}
    if (!isObj(R)) R = {};
    const num = x => (typeof x === 'number' && isFinite(x) && x > 0 ? x : 0),
      L = isObj(R[LEVEL]) ? R[LEVEL] : {},
      gs = Object.keys(R).filter(g => g !== LEVEL && isObj(R[g]) && num(R[g].ok) + num(R[g].ko) > 0);
    let at = num(L.at) || Math.max(0, ...gs.map(g => num(R[g].at))),
      saved = false;
    if (!at) {
      at = num(typeof updated === 'number' ? updated : Date.parse(String(updated || '')));
      saved = !!at;
    }
    return {n: num(L.ok) + num(L.ko), genera: gs.length, at, saved};
  }

  function commonFactor(cms) {
    const v = (cms || []).filter(x => typeof x === 'number' && x >= 0).sort((a, b) => a - b),
      h = v.length >> 1,
      med = v.length ? (v.length % 2 ? v[h] : (v[h - 1] + v[h]) / 2) : 0;
    return (cms || []).map(x => (typeof x === 'number' && x >= 0 ? Math.sqrt((1 + x) / (1 + med)) : 1));
  }

  // Achievements (Pierre, 2026-11-01: "unlocked as milestones are passed, with an animated pop-up, to keep the wish to play";
  // "well spread out": learning a whole genus takes ~300-430 questions, so most rungs are the quarters on the way there).
  // Learning milestones only, never time or days played (the learning model's rule), plus one family apart, the
  // Contributions (kind 'contrib', at the end: reports sent, never learning). Each has a family, a tier
  // (1 bronze, 2 silver, 3 gold) and a test on a snapshot the app builds (app.js achSnap):
  //   {total, met, q: [genera at Open Water (>= 50%), Advanced (>= 80%), Divemaster (>= 95%) or above; model.js MASTERY,
  //   2026-11-03, were the quarters 25/50/75% before], learned (Instructor), pct, streak (best run of right answers), duel, cor,
  //    hard, elo (0 until 200 answers, app.js ELO_MIN: it moves a lot before), group (an IMR lecture group fully learned), bonus (bonus genera met),
  //    basics (Coral basics done), fb (reports counted for the Contributions, contribAdd)}.
  // Median questions to reach the old quarter rungs, simulated with the real game (2026-11-01, before the levels; 75% / 90% right): 5 at 25%
  // 76 / 57, 10 at 50% 231 / 137, 5 at 75% 363 / 203, first learned ~430 / ~300.
  // Descriptions say what the player can now do (Pierre, 2026-11-02: informational feedback motivates, Deci, Koestner &
  // Ryan 1999; counts stay counts: genera met, progress %, Elo).
  const ACH = [
    ['met10', 'Explorer', 'Met 10 genera', 1, '🧭', s => s.met >= 10],
    ['met20', 'Wide eyes', 'Met 20 genera', 1, '🧭', s => s.met >= 20],
    ['metall', 'Whole slate', 'Met every genus of the list', 2, '🧭', s => s.total && s.met >= s.total],
    ['q25a', 'Open Water: 5 genera', '5 genera at Open Water level or above (50%+)', 1, '🌱', s => s.q[0] >= 5],
    ['q25b', 'Open Water: 10 genera', '10 genera at Open Water level or above', 1, '🌱', s => s.q[0] >= 10],
    ['q25c', 'Open Water: 20 genera', '20 genera at Open Water level or above', 2, '🌱', s => s.q[0] >= 20],
    ['q50a', 'Advanced: 5 genera', '5 genera at Advanced level or above (80%+)', 1, '🌿', s => s.q[1] >= 5],
    ['q50b', 'Advanced: 10 genera', '10 genera at Advanced level or above', 2, '🌿', s => s.q[1] >= 10],
    ['q50c', 'Advanced: 20 genera', '20 genera at Advanced level or above', 2, '🌿', s => s.q[1] >= 20],
    ['q75a', 'Divemaster: 5 genera', '5 genera at Divemaster level or above (95%: their mastery exam is on)', 2, '🪸', s => s.q[2] >= 5],
    ['q75b', 'Divemaster: 10 genera', '10 genera at Divemaster level or above', 2, '🪸', s => s.q[2] >= 10],
    ['learn1', 'First Instructor', "You passed a genus's mastery exam: you could teach it", 2, '🎓', s => s.learned >= 1],
    ['learn5', 'Instructor: 5 genera', 'Mastery exam passed on 5 genera', 3, '🎓', s => s.learned >= 5],
    ['learn10', 'Instructor: 10 genera', 'Mastery exam passed on 10 genera', 3, '🎓', s => s.learned >= 10],
    ['learn20', 'Instructor: 20 genera', 'Mastery exam passed on 20 genera', 3, '🎓', s => s.learned >= 20],
    ['learnall', 'Coral master', 'You know every genus of the list for sure', 3, '👑', s => s.total && s.learned >= s.total],
    ['pct5', 'First steps', '5% progress', 1, '📈', s => s.pct >= 5],
    ['pct10', 'On the way', '10% progress', 1, '📈', s => s.pct >= 10],
    ['pct25', 'A quarter', '25% progress', 2, '📈', s => s.pct >= 25],
    ['pct50', 'Half the slate', '50% progress', 2, '📈', s => s.pct >= 50],
    ['pct75', 'Three quarters', '75% progress', 3, '📈', s => s.pct >= 75],
    ['pct100', 'Complete', '100% progress', 3, '📈', s => s.pct >= 100],
    ['run10', 'On a roll', '10 right in a row in the Quiz: your eye is getting sharp', 1, '🔥', s => s.streak >= 10],
    ['run25', 'Unstoppable', '25 right in a row in the Quiz: a sharp eye', 2, '🔥', s => s.streak >= 25],
    ['duel', 'Look-alike slayer', 'You told two look-alikes apart', 1, '⚔️', s => s.duel],
    ['cor', 'Corallite reader', 'You named a genus from its corallites alone', 1, '🔬', s => s.cor],
    ['hard', 'Sharp eye', 'You named a photo most players miss, in the Quiz', 2, '🎯', s => s.hard],
    ['elo1100', 'Elo 1100', 'Reached an Elo of 1100', 1, '⭐', s => s.elo >= 1100],
    ['elo1200', 'Elo 1200', 'Reached an Elo of 1200', 2, '⭐', s => s.elo >= 1200],
    ['elo1300', 'Elo 1300', 'Reached an Elo of 1300', 3, '⭐', s => s.elo >= 1300],
    ['elo1400', 'Elo 1400', 'Reached an Elo of 1400', 3, '🌟', s => s.elo >= 1400],
    ['group', 'Group complete', 'You know a whole IMR lecture group', 3, '🧩', s => s.group],
    ['bonus', 'Off the list', 'You met a bonus genus, off the IMR list', 2, '🔓', s => s.bonus >= 1],
    // Coral basics done (Pierre, 2026-11-03: completion recognised): every step of the module seen (proto/basics.js), a
    // learning milestone like the others (the words the ID tips use), reached in about 5 minutes by those who take it.
    ['basics', 'Coral basics', 'You know the words the ID tips use: polyp, corallite, septa, walls, growth forms', 1, '📖', s => s.basics],
    // Contributions (Pierre, 2026-11-05, Q65): a family of its own, apart from the learning ones above, for the players who
    // send reports and feedback, to encourage it and show it is taken seriously. kind 'contrib': never in the learning
    // count (progress.js badge, viewAch), every tier pops up right after the report that earns it (progress.js achCheck).
    // s.fb = reports counted (contribAdd).
    ['fb1', 'First feedback', 'You sent your first report. Every report is read: thank you!', 1, '💬', s => s.fb >= 1, 'contrib'],
    ['fb5', 'Helping hand', '5 reports sent: you are making the app better', 2, '💬', s => s.fb >= 5, 'contrib'],
    ['fb10', 'Co-author', '10 reports sent: the app owes you a lot', 3, '💬', s => s.fb >= 10, 'contrib']
  ].map(([id, title, desc, tier, icon, test, kind = 'learn']) => ({id, title, desc, tier, icon, test, kind}));
  // Reports that count for the Contributions (Pierre, 2026-11-05, Q65): every report sent (game, enlarged photo, genus
  // sheet, Send feedback), signed in or not; one per photo: a report on photos already in a counted report does not count
  // again (several reports on one photo count once); an "Other" report counts only with a note. A counted report goes into
  // the achievements record's _fb (synced like the rest; mergeAch joins two devices' lists): its photos joined by a space,
  // or r:<id> for a report on no photo. CONTRIB_MAX entries are kept, more than the top tier needs.
  const CONTRIB_MAX = 50;
  const contribPhotos = r =>
    String((r && r.ph) || '')
      .split(/\s+/)
      .filter(Boolean);
  function contribKey(r, have) {
    if (!r || !r.id || (r.why === 'other' && !String(r.note || '').trim())) return '';
    const ph = contribPhotos(r);
    if (!ph.length) return 'r:' + r.id;
    const done = new Set((have || []).flatMap(k => (k.startsWith('r:') ? [] : k.split(' '))));
    return ph.some(f => done.has(f)) ? '' : ph.join(' ');
  }
  // Two devices' lists of counted reports (mergeAch): b's entries join a's by the same rule, so one photo reported on
  // each device before they synced counts once (Codex review #579); the last CONTRIB_MAX.
  function contribJoin(a, b) {
    const out = Array.isArray(a) ? [...a] : [];
    (Array.isArray(b) ? b : []).forEach(k => {
      if (typeof k !== 'string' || !k || out.includes(k)) return;
      if (k.startsWith('r:') || contribKey({id: 'x', ph: k}, out)) out.push(k);
    });
    return out.slice(-CONTRIB_MAX);
  }
  // Counts report r into the record A (changes A._fb); true when it counted.
  function contribAdd(A, r) {
    const have = Array.isArray(A && A._fb) ? A._fb : [],
      k = contribKey(r, have);
    if (!A || !k || have.includes(k)) return false;
    A._fb = [...have, k].slice(-CONTRIB_MAX);
    return true;
  }
  // The achievements a snapshot meets that `have` ({id: time}) does not hold yet, in list order.
  const newAch = (snap, have) => ACH.filter(a => !(have || {})[a.id] && a.test(snap)).map(a => a.id);
  // Achievements taken back (Pierre, 2026-11-03): only those that rest on genera learned, and only when a recalculation
  // takes a learned mark away (model.js mxRecalc, progress.js achRecheck); anywhere else achievements are only added.
  // achRevoke removes from A ({id: time}) those of ACH_LEARN that the snapshot no longer meets, and dates in A._gone
  // {id: time} every one of them the snapshot does not meet, held here or not: the tombstone keeps a copy earned before
  // (the sheet's, another device's not merged yet) from coming back through a merge (mergeAch); earned again later, the
  // achievement carries a newer time and stays. Returns the ids removed.
  const ACH_LEARN = ['learn1', 'learn5', 'learn10', 'learn20', 'learnall', 'group'];
  function achRevoke(A, snap, t) {
    if (!A || typeof A !== 'object') return [];
    const off = ACH.filter(a => ACH_LEARN.includes(a.id) && !a.test(snap)).map(a => a.id),
      out = off.filter(id => A[id]);
    if (off.length) A._gone = {...(A._gone || {})};
    off.forEach(id => {
      delete A[id];
      A._gone[id] = Math.max(t, A._gone[id] || 0);
    });
    return out;
  }
  // Two achievement records of one player (progress.js achMerge: another device's, the sheet's, this device's before
  // signing in): every achievement with its earliest date, the best run kept; the current run (_run) stays A's. A record of
  // another version than v (progress.js ACH_V: counted on older rules) brings its feats (keys starting with _) but not its
  // achievements. Removals (_gone) join, the latest per id; an achievement dated at or before its removal, on either side,
  // is dropped (taken back, it must be earned again). Changes and returns A.
  function mergeAch(A, ra, v) {
    A = A && typeof A === 'object' ? A : {};
    if (!ra || typeof ra !== 'object') return A;
    const old = ra._v !== v,
      gone = {...(A._gone || {})};
    Object.entries(ra._gone || {}).forEach(([k, t]) => typeof t === 'number' && !(gone[k] >= t) && (gone[k] = t));
    const off = (k, t) => typeof gone[k] === 'number' && !(t > gone[k]);
    Object.keys(ra).forEach(k => {
      if (k === '_run' || k === '_v' || k === '_gone' || (old && k[0] !== '_') || off(k, ra[k])) return;
      // A list: the Contributions' _fb by their rule (contribJoin), any other both devices' entries, each once, the last CONTRIB_MAX.
      if (k === '_fb') return (A[k] = contribJoin(A[k], ra[k]));
      if (Array.isArray(ra[k])) return (A[k] = [...new Set([...(Array.isArray(A[k]) ? A[k] : []), ...ra[k]])].slice(-CONTRIB_MAX));
      A[k] = k === '_best' ? Math.max(A[k] || 0, ra[k] || 0) : A[k] && !off(k, A[k]) ? Math.min(A[k], ra[k]) : ra[k];
    });
    Object.keys(gone).forEach(k => off(k, A[k]) && delete A[k]);
    if (Object.keys(gone).length) A._gone = gone;
    return A;
  }

  // Progress of a genus (2026-11-02, Pierre: BKT climbed too fast, and a right answer among a few genera counted
  // almost as much as one against the genus's look-alikes; Pelánek & Řihák 2017 recommend a moving average as the
  // mastery criterion): s.pg, an exponential moving average of the answers on the genus, each weighed by what it proves
  // (w, 0 to 1): a right answer s.pg += PROG.A × w × (1 − s.pg), w from the choices (model.js pgWeight); a miss
  // s.pg −= PROG.A × w × s.pg, w from how hard the photo was for the player (model.js pgMissW: in full on a photo at
  // the player's level, less on a harder one; Pierre: a miss on a very hard photo does not mean the genus is badly
  // known, and a miss must not cost more than it proves). Each point
  // is harder to earn than the last, a run of right answers on easy choices tops out lower than one against look-alikes,
  // and the bar follows the recent answers. PROG.M = the mastery exam's entry, shown as 95%. docs/LEARNING.md
  // "Progress (moving average) and mastery" has the simulation behind A 0.15 and M 0.8.
  // OLD: progress saved before s.pg (BKT's L) is recomputed from what the record holds in order, its last 10 results
  // (s.h), from 0, a right answer weighed 2/3 (what it proved is not known: the middle weight, a 4-choice question
  // without look-alike or 2 choices with one). Simulated, that is close for a beginner and below the live value for a
  // strong player (never above it by much): 10 right answers in a row give 0.65, 77% on the bar, so no genus enters the
  // exam on old answers alone. A genus learned on such a record lost it (memRecalc, 2026-11-03: its exam was passed under
  // BKT); until that runs, it counts at the exam entry.
  const PROG = {A: 0.15, M: 0.8, LOOK: 0.5, OLD: 0.67};
  // A learned genus keeps its mark while its progress stays at PROG.M × (1 − PROG.A) or above after a miss (one miss from
  // PROG.M or above, not two): the game's rule (model.js mxKept, applied in quiz.js answer after each miss) and the
  // replay's (replayProgress lm, replayedOf).
  const mxKeeps = pg => pg >= PROG.M * (1 - PROG.A) - 1e-6;
  const pgStep = (g, good, w) => Math.round((g + PROG.A * w * ((good ? 1 : 0) - g)) * 1e4) / 1e4;
  // The fallback for a device that never reaches the sheet: once it does, the sheet's full replay of its log replaces
  // such a record (replayProgress, sync.js replayAdopt).
  function pgOf(s) {
    if (!s) return 0;
    if (typeof s.pg === 'number') return s.pg;
    const g = [...String(s.h || '')].reduce((x, c) => x + PROG.A * (c === '1' ? PROG.OLD : 1) * ((c === '1' ? 1 : 0) - x), 0);
    return s.mx ? Math.max(g, PROG.M) : g;
  }
  // The bar of a genus, 0 to 1: s.pg fills 95% on its way to PROG.M, each mastery-exam question passed adds 1%, the
  // passed exam makes it 100%.
  function scoreOf(s) {
    if (!s) return 0;
    if (s.mx) return 1;
    const g = pgOf(s);
    // At most 4 of the 5 exam steps before the exam is passed (Codex review #393): an exam begun before typed questions
    // can have 5 right answers still waiting for its typed ones, and only a passed exam (s.mx) makes 100%.
    return 0.95 * Math.min(1, g / PROG.M) + (g >= PROG.M && s.ex ? (0.05 * Math.min(4, s.ex.k || 0)) / 5 : 0);
  }
  // Progress % of a saved progress P over a list of genera, as the app shows it (genScore / progPct). The sync sheet
  // computes the leaderboard % with a copy (Code.gs pctOf_, v16; s.pg from v22): keep the two in step
  // (tests/sync.test.js compares them; tests/draw.smoke.js compares this with the app's progPct).
  function pctOf(P, list) {
    return list && list.length ? Math.round((100 * list.reduce((t, n) => t + scoreOf((P || {})[n]), 0)) / list.length) : 0;
  }

  // The genera the games play, defined once for the app, the admin and tools/fetch_local.py (tools/genera.py reads the
  // two lists below from this file). data.json "gen" is the IMR coral slate; data.json "x" holds the Coral Finder's extra
  // genera (in the book, present at Dauin, not on the IMR list), shown only in Identify > Coral ID Key, except:
  // - BENTHIC (Pierre, 2026-11-02): Millepora, fire coral, not a hard coral nor on the IMR coral list but on the IMR
  //   benthic slate and everywhere at Dauin: a slate genus for the games and the progress (app.js isBenthic);
  // - BONUS (Pierre, 2026-11-01, opt-in since 2026-11-02): genera off the slate common at Dauin and easily taken for a
  //   slate genus (app.js bonusList, isBonus). Played once the player turns them on; never counted in the progress.
  // slateOf(d) = the slate as the games and the progress count it (app.js slateGenera); gameOf(d) = every genus a game
  // can ask (slate + BONUS), the "game genera" of the admin (candidate queue first, Game coverage, caps). The rest of
  // data.json "x" are the Key-only genera. d = data.json as served ({gen, x: {gen}}), or the admin's copy, whose
  // DATA.gen also holds the "x" genera (admin.js): a genus of d.x.gen is never a slate genus by its key in d.gen.
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
  // The starred (★) genera: on the slate, not numbered (data.json gen[n].n 0, not surveyed by IMR), there because they
  // look like surveyed genera (rule L5). lectureGroup(d, n): the IMR lecture group a genus is shown in, its own
  // (ig), else, for a ★ genus the lecture doesn't group, the group most of its Coral Finder look-alikes belong to (ties:
  // the first listed); 0 for none (app learn.js shownGroup). starRefs(d, n): the surveyed look-alikes in that group, the
  // genera its card names ("★ look-alike of Turbinaria, Tubastraea", learn.js starNote); [] for any other genus.
  // starWaits(d, n, list, met) (Pierre, 2026-11-03: a ★ genus opens only once the genus its card compares it to has
  // been met; a beginner met Duncanopsammia, "Like Turbinaria, but corallites about 6 mm", before Turbinaria): true while
  // one of n's references is in list (the genera the draw can open) and not met. A reference is always a surveyed genus,
  // which never waits itself, and one not in the list never holds n back: no genus can wait for ever.
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
  const starWaits = (d, n, list, met) => starRefs(d, n).some(r => list.includes(r) && !met(r));

  // Photos out of the repo, step 2 (Pierre, 2026-11-03; docs/ROADMAP.md): the site's photos (img/<f>.webp and its -m, -s,
  // -t files) are read from the Cloudflare R2 bucket that tools/r2_sync.sh mirrors img/ to, same paths under this base;
  // the site's own img/ is the fallback (app.js / admin.js photoFail, sw.js photo). The one switch: '' here sends the
  // app, the admin and the Coral ID Key back to img/ (sw.js only caches what it is asked for).
  const PHOTO_BASE = 'https://pub-934250f83b884a4f890497f2027ce251.r2.dev/';
  // The same files on the site: every R2 address in s (a URL, a srcset, an inline style) made relative again.
  const photoLocal = s => (PHOTO_BASE && typeof s === 'string' ? s.split(PHOTO_BASE).join('') : s);

  // Photos out of the repo, step 1 of Pierre's rule (2026-11-05; docs/ROADMAP.md): git will keep only the photos with no
  // other backup (IMR lecture photos, Coral Finder book scans, our own drawings); the photos with an online original
  // (data.json / cand.json / fish-photos.json src: iNaturalist, Pierre's own iNaturalist photos, FishBase) leave img/
  // later. So once R2 fails, a photo with an online original is read from that original, at a light size, and only the
  // others from the site's img/ (app.js photoFail, quiz.js pump, admin.js).
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
        if (v && v.includes(PHOTO_BASE)) {
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

  // A photo that fails on R2 is asked from R2 once more after PHOTO_RETRY ms before any other source (Pierre,
  // 2026-11-03: in a 50-player load test 2 requests in 2000 failed, passing network errors a second try gets). An
  // element whose R2 photo fails for the first time: true, and a probe asks R2 again; if it loads, the element's src
  // and srcset are set again (the file now comes from the browser's cache), else fallback(el) runs (photoFallback).
  // The element keeps its attributes meanwhile. False otherwise: the caller falls back at once.
  const PHOTO_RETRY = 800;
  function photoRetry(el, fallback) {
    if (!PHOTO_BASE || !el || !el.getAttribute || !el.dataset || el.dataset.r2try) return false;
    const src = el.getAttribute('src') || '',
      set = el.getAttribute('srcset') || '',
      u = el.currentSrc || src;
    if (!u.includes(PHOTO_BASE)) return false;
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

  // Typed answers (Pierre, 2026-11-03; first the Lab prototype proto/type.js, then the quiz, quiz.js): the player types
  // the genus instead of picking 1 of 4 (recall, not recognition). What Pierre agreed: light spelling tolerance (1 letter
  // on a short name, 2 on a long one), old names accepted ("formerly X" in the genus's own lines), no suggestions while
  // typing, the phone's autocorrect and capitals off, an "I don't know" button (a miss), the right spelling shown after
  // the answer. A word that is no game genus, even with the tolerance, is no answer: the player is asked to check it.
  const TYPE = {
    // Edits allowed: one for a name of up to 6 letters, two beyond (Porites, Pocillopora).
    tol: n => (n <= 6 ? 1 : 2)
  };
  // Optimal string alignment distance (Levenshtein + a swap of two neighbouring letters, the commonest typo).
  function typeDist(a, b) {
    const d = Array.from({length: a.length + 1}, (_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++)
      for (let j = 1; j <= b.length; j++) {
        const c = a[i - 1] === b[j - 1] ? 0 : 1;
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    return d[a.length][b.length];
  }
  const typeNorm = s =>
    String(s || '')
      .trim()
      .split(/\s+/)[0] // "Acropora sp." or a species: the genus is the first word
      .toLowerCase()
      .normalize('NFD')
      .replace(/[^a-z]/g, '');
  // Every name a player may type: the genera cur (every genus the app knows, the slate's and the extra ones) and the old
  // names of their own "formerly X" lines (gx(name): the genus's record, its crit and imr lines). An old name that is
  // itself a game genus is left out: Duncanopsammia peltata was "formerly Turbinaria peltata", Turbinaria is still valid.
  // Returns [{k: normalised name, g: genus, old: the old name or ''}].
  function typeNamesOf(cur, gx) {
    const out = cur.map(n => ({k: typeNorm(n), g: n, old: ''}));
    cur.forEach(n => {
      const g = gx(n) || {},
        txt = [...(g.crit || []), ...(g.imr || [])].join(' ');
      for (const m of txt.matchAll(/formerly ((?:[A-Z][a-z]+)(?:\s*\/\s*[A-Z][a-z]+)*)/g))
        m[1]
          .split('/')
          .map(x => x.trim())
          .forEach(o => {
            if (!gx(o) && !out.some(x => x.k === typeNorm(o))) out.push({k: typeNorm(o), g: n, old: o});
          });
    });
    return out;
  }
  // What the typed text names among names (typeNamesOf): {g, old, exact} for one genus within the tolerance, {near:
  // [genera]} when two are as close (the player is asked to check the spelling), null when nothing is close.
  // norm: how the text is read (typeNorm, the first word, for genera; typeNormAll, the whole text, for fish entries).
  function typeMatchIn(names, text, norm = typeNorm) {
    const t = norm(text);
    if (t.length < 3) return null;
    const all = names
      .map(x => ({...x, d: typeDist(t, x.k)}))
      .filter(x => x.d <= TYPE.tol(x.k.length))
      .sort((a, b) => a.d - b.d);
    if (!all.length) return null;
    const best = all.filter(x => x.d === all[0].d),
      gs = [...new Set(best.map(x => x.g))];
    if (gs.length > 1) return {near: gs};
    return {g: best[0].g, old: best[0].old, exact: best[0].d === 0, ...(best[0].alt ? {alt: 1} : {})};
  }
  // The share of a genus's questions asked as typed ones, from its progress x (0 to 1, the % shown): none below T.from,
  // then a straight line between the points T.at ([progress, share], in order), flat after the last (model.js TYPED).
  function typedShare(x, T) {
    const at = T.at || [];
    if (!(x >= T.from) || !at.length) return 0;
    if (x <= at[0][0]) return at[0][1];
    for (let i = 1; i < at.length; i++)
      if (x <= at[i][0]) {
        const [x0, y0] = at[i - 1],
          [x1, y1] = at[i];
        return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
      }
    return at[at.length - 1][1];
  }

  // What one answer proves, the weights of pgStep (docs/LEARNING.md "Progress (moving average) and mastery"), shared by
  // the app (model.js pgWeight, quiz.js answer) and the full replay below, so both run the same rules.
  // TARGET_P: the chance every question aims for, whatever its format (model.js PICKD.P, the difficulty controller:
  // about 80% right; 2026-11-03, before it a photo TARGET_OFF 1.0 below the ability, 80% with 4 choices only).
  const TARGET_P = 0.8;
  // The success aimed for follows the player's global level (Pierre, 2026-11-03: strong players must find the app
  // challenging quickly, and beginners must not be overwhelmed): AIM, points [global level, success], 85% up to a level
  // of 0.5, 75% from 1.5, a straight line between, flat outside (no cliff); TARGET_P (0.8, the middle) stays the game's
  // reference. model.js aimP (the photos aimed at, the opening's shaky bar) and the miss weight (pgMissW, in the game
  // and in the full replay) take it from here. docs/LEARNING.md "Beginners and experts".
  const AIM = [
    [0.5, 0.85],
    [1.5, 0.75]
  ];
  function aimOf(L) {
    const [[l0, p0], [l1, p1]] = AIM;
    return p0 + (p1 - p0) * Math.min(1, Math.max(0, ((Number(L) || 0) - l0) / (l1 - l0)));
  }
  const sigm = x => 1 / (1 + Math.exp(-x));
  // A right answer, w from 0 to 1: the plausible choices k ((1 − 1/k) / (1 − 1/4): 4 weigh 1, 3 0.89, 2 0.67), in full
  // when a genus it gets confused with is among the choices (look), PROG.LOOK when none is. model.js pgWeight finds look.
  // A typed answer (k infinite, model.js TYPED.k) counts in full: every genus, its look-alikes included, was a possible
  // answer.
  const pgRightW = (k, look) => Math.min(1, Math.max(0, (1 - 1 / k) / (1 - 1 / 4))) * (look || !isFinite(k) ? 1 : PROG.LOOK);
  // What a miss proves (Pierre, 2026-11-02: "a miss on a very hard photo doesn't necessarily mean the genus is badly
  // known"; a miss must not cost more than it proves): the Elo chance the player had to get it right (ability th against
  // the photo's difficulty d, k choices, as abilityStep), over the chance the game aims for (aim: aimOf the player's global
  // level, 85% to 75%, whatever the format: model.js's difficulty controller, aimP; TARGET_P, 0.8, when not given). A photo at the player's level or easier: the miss counts in full; a harder one:
  // less (1 unit harder: 0.78; 2 units: 0.56). No new constant: the Elo and the photo targeting set it. The right answers
  // keep their weight (pgRightW): simulated, a photo factor on them only slowed everyone.
  // R: the recall expected after a break, for a comeback question (model.js comebackOf; 1 otherwise): the chance the
  // player had is then the recall-adjusted one, so a miss the rust explains costs less progress (Pierre, 2026-11-02).
  function pgMissW(th, d, k, R = 1, aim = TARGET_P) {
    const e = (x, r = 1) => 1 / k + (1 - 1 / k) * r * sigm(x);
    return Math.min(1, e(th - d, R) / aim);
  }
  // What a right answer on a photo the player knows proves (Pierre, 2026-11-03): only what memory does not explain. The
  // mirror of pgMissW (a ratio of chances, like it): the chance the player had on the same photos new over the chance
  // they had with their memory of them (fam, model.js famOf), at most 1: the share of such right answers that would have
  // come without the memory. A new photo (fam 0) keeps its full weight: simulated, a photo-difficulty factor on every
  // right answer only slowed everyone, so only the part memory explains is taken off. 4 choices, a photo at the game's
  // target (ability 1 above it): x 0.93 shown never right, x 0.87 right once, x 0.84 right twice or more with the
  // offsets of 2026-11-03. Tried first, the room for surprise left ((1 - chance with memory) / (1 - chance new): x 0.71
  // / 0.41 / 0.23): simulated, it took a third to a half of the genera learned by question 600 and put the progress
  // further below the truth than memory had put it above (docs/LEARNING.md "Photo memory").
  function pgMemW(th, d, fam, k, R = 1) {
    const e = x => 1 / k + (1 - 1 / k) * R * sigm(x);
    return fam >= 0 ? 1 : Math.min(1, e(th - d) / e(th - d - fam));
  }
  // Number of choices as the app scored an answer, from its log row: a typed answer (|t, quiz.js answer) none to guess
  // from (Infinity, model.js TYPED.k: no 1/k floor, as guessOf), |kN in the mode (the plausible choices, logged when
  // fewer than the buttons), a duel 2, else the genera offered (2-3), else 4.
  const kOf = (mode, choices) => {
    if (TYPED_RE.test(String(mode || ''))) return Infinity;
    const kq = /\|k(\d)/.exec(String(mode || ''));
    if (kq) return Number(kq[1]);
    if (/duel|\|d(\||$)/.test(String(mode || ''))) return 2;
    const n = String(choices || '')
      .split(/\s+/)
      .filter(Boolean).length;
    return n >= 2 && n < 4 ? n : 4;
  };

  // Player ability per genus (s.th), on the same scale as photo difficulty (0 = average photo): an Elo step after each
  // answer, as in the sync sheet (Code.gs stats_): P(right) = g + (1 - g) * sigmoid(ability - difficulty), g = 1/choices;
  // ability moves by K * (result - P(right)), K shrinking as answers build up (Pelánek 2016) but never below kmin, so a
  // genus that starts going wrong eases off quickly. Learners change (Pierre, 2026-11-02): as Glicko-2's volatility
  // (Glickman 2012), s.vr follows the recent surprise (result - expected, moving average, rate vr); while answers keep
  // beating (or missing) the expectation, the step grows by up to vg x |s.vr|, within kmax. docs/LEARNING.md. Moved here
  // from model.js (2026-11-03) so the full replay (replayProgress) rebuilds the ability with the app's own step;
  // model.js ability / abilityStep call these on the app's P.
  // abilityOf(P, n): progress saved with the old Easy/Medium/Hard steps (s.lv) starts from the matching ability; a genus
  // never answered starts from the player's global level (playerStart); a genus already answered: its own estimate (s.th,
  // from its last own step) plus the global level's move since then (levelMove), so what the player shows on the other
  // genera moves it too while its own answers are few: the global + concept skill of Pelánek et al. (UMUAI 2017), as a
  // lazy update (2026-11-03, docs/LEARNING.md "Global level and genus").
  const ELO = {th0: 0, kmax: 0.8, kmin: 0.25, n: 15, lo: -1.5, hi: 3, vr: 0.1, vg: 2};
  // p: the level the player's first-launch answer says (CHOICE, startVars(c).p), which a genus never answered starts
  // from (playerStart); 0, the default player's, when they have not answered.
  const abilityOf = (P, n, p = 0) => {
    const s = (P || {})[n] || {};
    if (typeof s.th !== 'number') return s.lv ? ELO.th0 + Math.min(2, s.lv) : playerStart(P, n, p);
    return Math.min(ELO.hi, Math.max(ELO.lo, s.th + levelMove(P, n, s)));
  };
  // The global level's move since the genus's own last step (s.lt: the level then), weighed by the genus's own
  // uncertainty 1 / (1 + answers / ELO.n), the share its own Elo step gives a new answer: a genus with few answers leans
  // on the level, one with many on itself. Both ways (a one-way rise was tried: biased upward, it over-rated a simulated
  // beginner by 0.5-0.7). No new constant. Taken in at the genus's next own step (eloStep). Progress saved before (no
  // s.lt): nothing until that step.
  function levelMove(P, n, s) {
    const G = (P || {})[LEVEL];
    if (n === LEVEL || !s || typeof s.lt !== 'number' || !G || typeof G.th !== 'number') return 0;
    return Math.round(((G.th - s.lt) / (1 + ((s.ok || 0) + (s.ko || 0)) / ELO.n)) * 100) / 100;
  }
  // w (response time, 2026-11-04, rtWeight): the step's size times w; 1 by default. The volatility follows the plain
  // surprise either way.
  // p: the first-launch answer's prior (abilityOf, playerStart), for a genus never answered.
  function eloStep(P, n, s, good, d, k, w = 1, p = 0) {
    const th = abilityOf(P, n, p),
      g = 1 / k,
      e = g + (1 - g) * sigm(th - d),
      m = (s.ok || 0) + (s.ko || 0);
    s.vr = Math.round(((1 - ELO.vr) * (s.vr || 0) + ELO.vr * ((good ? 1 : 0) - e)) * 1000) / 1000;
    // The global level's step has no floor (ELO.kmin is for a genus, which must ease off quickly when it starts going
    // wrong): the level pools every answer and now moves every genus (levelMove), so it settles as answers build up
    // (Pelánek's uncertainty function), the volatility still letting it catch up with a lasting change. With the floor a
    // run of early misses sank it (one real player to -0.41 against a fit of 0.56) and dragged the genera with it.
    const K = Math.min(ELO.kmax, Math.max(n === LEVEL ? 0 : ELO.kmin, ELO.kmax / (1 + m / ELO.n)) * (1 + ELO.vg * Math.abs(s.vr)));
    // Kept to 4 decimals for the global level (2 for a genus): without the floor its steps fall under 0.005 after a few
    // hundred answers, and rounding them to 2 decimals lost every one (Codex review #415: 1000 right answers left it at 1).
    const r = n === LEVEL ? 1e4 : 100;
    s.th = Math.round(Math.min(ELO.hi, Math.max(ELO.lo, th + w * K * ((good ? 1 : 0) - e))) * r) / r;
    // The level this step was taken against (the level before this answer's own step on it, as quiz.js answer orders them).
    if (n !== LEVEL && P && P[LEVEL] && typeof P[LEVEL].th === 'number') s.lt = P[LEVEL].th;
    delete s.lv;
    delete s.run;
  }

  // Response time (Pierre, 2026-11-04: "the signal is already very clear on few players; the question is how to
  // integrate it"; rule L1: the seconds taken to answer are evidence about that answer, never a decay; docs/
  // LEARNING.md "Response time"). A right answer given faster than the player's usual is stronger evidence that they know
  // the genus, a slow one weaker: its two ability steps (the genus shown and the global level) are taken times
  // w = clamp(1 - K z, LO, HI), z = log(seconds) minus the median log(seconds) of the player's own earlier timed answers.
  // A miss, an answer without seconds (an app before sheet v23, a clock that never started), a typed answer (slower by
  // design) and the player's first MIN timed answers: w 1. The answer's own time never changes its prediction, only the
  // step after it. K 1.5: the value chosen by leave one player out on the real answers for 8 of 9 players (2 for one;
  // tools/abilityeval.js +T*+G, PR #431); LO, HI and MIN are #431's rule as measured. The seconds are those logged (to the
  // tenth, at most 600: quiz.js qclockRead, Code.gs secs_), so the sheet's replay of the log meets exactly the same ones.
  // The earlier times live in the global level's record (P[LEVEL].rt: how many timed answers took each number of tenths
  // of a second, {"45": 3, ...}; a few hundred keys at most), so the median is exact, the record compact, two devices'
  // records add up (mergeProgress) and the full replay rebuilds it from the log (replayProgress).
  const RTIME = {K: 1.5, LO: 0.5, HI: 1.5, MIN: 10};
  // The tenths of a second of a timed answer, or 0 when it does not count (no seconds, 0, a typed answer: k infinite).
  const rtTenths = (sec, k) => (typeof sec === 'number' && isFinite(sec) && isFinite(k) ? Math.round(Math.min(600, sec) * 10) : 0);
  // The median log(seconds) of the times in rt, null with fewer than RTIME.MIN (the mean of the two middle ones when even).
  // The record's keys, sorted, are kept beside it (RT_KEYS) and kept in step by rtAdd, so a replay of a long log does not
  // sort them again at every right answer (Pierre, 2026-11-04: the admin's replay of every player, 0.2 s of it on a phone).
  // Kept only for a record whose keys are still those it saw (another change to it: sorted again); same result.
  const RT_KEYS = new WeakMap();
  const rtKeys = rt => {
    const c = RT_KEYS.get(rt);
    if (c && c.n === Object.keys(rt).length) return c.ks;
    const ks = Object.keys(rt)
      .map(Number)
      .filter(x => x > 0)
      .sort((a, b) => a - b);
    RT_KEYS.set(rt, {ks, n: Object.keys(rt).length});
    return ks;
  };
  function rtMedian(rt) {
    const ks = rt && typeof rt === 'object' ? rtKeys(rt).filter(x => rt[x] > 0) : [],
      n = ks.reduce((t, x) => t + rt[x], 0);
    if (n < RTIME.MIN) return null;
    const at = i => {
      let c = 0;
      for (const x of ks) if ((c += rt[x]) > i) return Math.log(x / 10);
    };
    return n % 2 ? at((n - 1) / 2) : (at(n / 2 - 1) + at(n / 2)) / 2;
  }
  // The weight of a right answer's ability steps from its seconds, against the player's earlier times (G: P[LEVEL]).
  function rtWeight(G, sec, k, good) {
    const x = rtTenths(sec, k),
      m = good && x > 0 ? rtMedian(G && G.rt) : null;
    return m === null ? 1 : Math.min(RTIME.HI, Math.max(RTIME.LO, 1 - RTIME.K * (Math.log(x / 10) - m)));
  }
  // The answer's seconds added to the player's times (after its own steps: z is against the earlier answers only).
  function rtAdd(G, sec, k) {
    const x = rtTenths(sec, k);
    if (!G || x <= 0) return;
    G.rt = G.rt || {};
    G.rt[x] = (G.rt[x] || 0) + 1;
  }

  // Rules versions (Pierre, 2026-11-03: progress is recalculated from the whole answer log, by the sheet, automatically,
  // now and whenever the progress engine changes). Every change to a rule that moves the progress (what an answer
  // weighs, the moving average, the ability step, the photo memory, what the replay keeps from the device...) appends
  // an entry here: v (the next number), at (the date), why (one line for the docs), msg (null, or the announcement card
  // {t: title, p: paragraph, in plain words} that every device which skipped this version shows once, rule D6;
  // with only: 'changed', shown only when the adoption moved the player's progress % by min points or more, {from} and
  // {to} in p being the two %). Every version takes RV_CARD (Pierre, 2026-11-03, a standing rule: rule D5);
  // Pierre is asked only for a different text. The sync script, which embeds this file
  // (tools/sync_core.py), replays a player's log again when their stored replay is older than RV, and the app adopts a
  // replay newer than the one it applied (sync.js replayAdopt). docs/LEARNING.md "Full replay".
  // The standard recalculation card (Pierre, 2026-11-03: "only to the players whose progress the replay moves a lot; if
  // it moves everyone a lot, everyone gets it"): shown to a player whose progress % the adoption moved by 5 points or
  // more, either way (progress.js rvNoticeAdd), with the two %.
  const RV_CARD = {
    kind: 'update', // the card's kind (app.js cardShow, CARD_KINDS)
    t: 'Your progress was recalculated with the improved model',
    p: 'Your progress is now computed again from all your answers, with the rules the app uses today. It went from {from}% to {to}%. Every answer you gave is kept.',
    only: 'changed',
    min: 5
  };
  const RVS = [
    {
      v: 1,
      at: '2026-11-03',
      why: 'Full replay of each player by the sheet: moving average weighed by what each answer proves, photo memory, former-model learned marks dropped, no Elo step on the genus wrongly given, a genus ability moving with the global level and the miss weighed against the aim at that level (#415), a learned mark kept unless a miss logged after its exam takes it away as the game does',
      // Pierre, 2026-11-03: the standard card, only for the players whose progress % moves by 5 points or more (several
      // lose points: the former model's learned marks are dropped).
      msg: RV_CARD
    },
    {
      v: 2,
      at: '2026-11-04',
      why: 'The opening pace and known mix-ups (#425): a question whose choices hold a genus the player mixes up with the one shown more than everyone does (3 or more plausible choices) counts as that much harder, for the ability, the global level and the weight of a miss',
      msg: RV_CARD
    },
    {
      v: 3,
      at: '2026-11-04',
      why: 'Hierarchical photo Elo (sheet v31): the genus offset enters the expectation the photo memory offsets are fitted against, so the memory offsets the replay uses change',
      // Codex P1 on #422: mem (?stats=1, Code.gs stats_) feeds replayProgress, so a log replayed under v2 gives other
      // bars than under v3. Pierre's standing rule (2026-11-03): every rules version gets the standard recalculation
      // card, only for the players whose progress % moves by 5 points or more.
      msg: RV_CARD
    },
    {
      v: 4,
      at: '2026-11-04',
      why: "Answer time weighs right answers (Pierre, 2026-11-04): a right answer's ability steps, on the genus and the global level, times clamp(1 - 1.5 z, 0.5, 1.5), z its log seconds against the player's own median over their earlier timed answers (RTIME, rtWeight)",
      msg: RV_CARD
    },
    {
      v: 5,
      at: '2026-11-04',
      why: 'The first-launch question (#428): a genus never answered starts from the global level shrunk towards the level the player said (new 0, IMR course 0.5, know well 1.25), the answer in force at each answer (reefid-sync-coral-start, its history h, or the band below taken with Coral basics on the fallback card, ease)',
      msg: RV_CARD
    }
  ];
  const RV = RVS[RVS.length - 1].v;
  // The sync script version from which the sheet replays (Code.gs replay_, v28). The app never gets ahead of the sheet
  // script (rule D4, Pierre 2026-11-03): it adopts a replay (sync.js replayAdopt) and the admin shows replayed
  // values (admin.js progOf) only when the script's replies say v >= RV_SHEET; otherwise both do what they did before.
  const RV_SHEET = 28;
  // The sync script version that replays the answer time (Code.gs v32 reads the Seconds column into the replay rows):
  // the app weighs a right answer's steps by its time (rtWeight) only once the script's replies say v >= RT_SHEET
  // (sync.js sheetV), so a replay never undoes what the app did live (rule D4); before it, exactly as before.
  const RT_SHEET = 32;
  // The sync script version that replays the first-launch answer's prior (Code.gs v36 replay_ reads the player's
  // reefid-sync-coral-start: its answers and the silent ease): the app shrinks a new genus's start towards that prior
  // (model.js startP) only once the script's replies say v >= START_SHEET, so a replay never undoes it (rule D4,
  // Codex review #428); before it, the default player's prior 0, exactly as before.
  const START_SHEET = 36;
  // The messages a device that last applied version `from` shows once it applied version `to`: one per version that
  // has one, oldest first; the same message (RV_CARD) once, at the last version that has it, so a device that skips
  // several versions sees one recalculation card with its progress before and after the whole jump.
  const rvMsgs = (from, to) =>
    RVS.filter(x => x.v > (from || 0) && x.v <= to && x.msg).filter((x, i, L) => !L.slice(i + 1).some(y => y.msg === x.msg));

  // Full replay (Pierre, 2026-11-03: "why recalculate on the phones when the phone doesn't have the full log? Recalculate
  // from all the results"): every player's progress rebuilt from the sheet's answer log, in time order, with today's rules
  // (the weights above, pgStep, the photo memory, the ability step), as if every answer had been played under them. The
  // reference recalculation, done by the sync sheet itself (Code.gs replay_, in the reply to a sign-in, load or save
  // when the player's stored replay is older than RV or covers fewer rows than the log has) and adopted by the app
  // (sync.js replayAdopt). The device's own recalculations (memRecalc from s.ps, pgOf from the last 10 results s.h) only
  // approximate it from what a device keeps: they remain the fallback for a device that never reaches the sheet.
  // docs/LEARNING.md "Full replay".
  // rows: the answer log (sheet readAnswers rows, Code.gs rowOf_, or the app's own log through logRow: [id, time ms,
  // genus shown, answered, right 0|1, mode, photos, expected e, ability th, new photos, choices, (11: unused here),
  // seconds to answer (null without)]; the seconds weigh a right answer's ability steps, rtWeight). o: gen (data.json
  // genera, Millepora and the bonus genera included: look-alikes `look`, family `fam`), mem (photo memory offsets,
  // ?stats=1 mem; the prior without), conf (the pooled pairs, ?stats=1 conf, as the app's PCONF), since ({id: time ms}:
  // only the answers after a progress reset), memory (false: the rule before the photo memory, tools/memreplay.js), time
  // (false: no response time, the rule before rules version 4),
  // start ({id: player}: a replay to go on from, as returned here, e.g. the sheet's, with this device's answers not in
  // the sheet yet on top; copied, never changed), onAnswer(row, {d, fam, cf, k, w, look}).
  // Returns {id: {P: {genus: {pg, ok, ko, h, ps, off, conf, u, th, lt, vr, streak, at, du, lx, lm}, '~level': {ok, ko, th, vr, at, rt}},
  // n, used, rep}}: per genus the moving average pg (what the app keeps as s.pg), right / wrong answers, the last 10
  // results, the photos [shown, right], the choices offered beside it and the genera given instead (the app's s.off,
  // s.conf), u = answers that moved pg, the ability th and its volatility vr (eloStep, as quiz.js answer steps them: on
  // the genus shown only, never on the genus wrongly given),
  // the run of right answers (streak), the last answer (at), a look-alike duel won (du), the last miss on it, shown or
  // given (lx, a time: it ends an exam in course), the last one that took the progress below the learned mark's keep
  // rule (lm, a time: mxKeeps); the global level LEVEL as the
  // app keeps it (seeded at the first answer by levelSeed, then one step per answer); per player the rows read (n),
  // replayed (used: with e and th) and on a photo already shown (rep).
  // Each question's difficulty d (photo difficulty, + 0.5 for a photo shown alone) is recovered from what the app logged
  // then: e = 1/k + (1 - 1/k) sig(th - d), th the player's ability on the genus at that moment. A typed answer (|t,
  // 2026-11-03; kOf) has no guess rate (k infinite: e = sig(th - d)), counts in full when right (pgRightW) and was
  // logged with no choices, as quiz.js answer scores it. Since the photo memory
  // (MEM_LOGGED) the logged e includes the memory of the photos (fam), taken out again here with the replay's own fam;
  // since the known mix-ups (CF_LOGGED) it includes the app's mix-ups term too (cf, model.js confTerm), taken out the
  // same way, and the replay adds its own to every answer, older ones included (today's rule).
  // Approximations, explicit: the ability th and the photos are those the app logged (the game would have drawn others
  // under other rules; the weights use the logged th, the replayed th is the app's step over the recovered
  // difficulties); a comeback question's recall is taken as 1 (its e logged with it reads as a harder photo); the
  // look-alike test and the mix-ups term are the app's (declared look-alikes or confusions over CONF.TRAP, pooled and the
  // player's own; confGap) with a prior from the look-alikes and the family only (the app also gives CONF.FORM to genera
  // sharing an IMR growth form, which the sheet does not know: on such a pair the pooled score starts from 0.03 instead
  // of 0.08, so the replayed term is larger while the pair's pooled offers are few, the same once they are many);
  // a miss on the genus wrongly given weighs the chance the player had on it with its ability as replayed (the app's own
  // at that moment is not logged; the same when the replay goes on from the app's record, sync.js); every photo of a
  // right answer counts as recognised (the app does not count a corallites photo answered
  // without opening it, which the log leaves out anyway). Answers logged without e and th (before sheet v5) count in
  // ok/ko/h only, and move no ability. The mastery exam is not replayed: replayedOf takes it from the saved copy.
  const MEM_LOGGED = Date.UTC(2026, 10, 3, 4, 46); // PR #387 merged: the app's logged e includes the photo memory
  // From the known mix-ups (PR #425, live 2026-11-03 15:35 UTC: 23:35 Asia/Taipei, the instant of tools/abilityeval.js
  // CF_FROM, which reads the sheet's wall clock; #426): the app's logged e includes its mix-ups term (model.js confTerm),
  // taken out again here with the replay's own. An app not yet updated logs a few answers without it after that time.
  const CF_LOGGED = Date.UTC(2026, 10, 3, 15, 35);
  // The first-launch record's history (reefid-sync-coral-start h, Codex review #428): an append-only list of timestamped
  // events, merged between devices as a union (startUnion), from which the current answer, the silent ease and the prior
  // at any time are derived (startNorm, startPriorAt). A choice event: [c, answers then, time, via] (via tour, card,
  // fallback, inferred). An ease event (Coral basics on the "lower" card, model.js startEase): [the band below, answers
  // then, time, 'ease', the answer it eased, the time of that answer's choice event]; it applies from its time until the
  // next choice event, and only while that very choice event is the one in force (Codex review #428: matched by its code
  // alone, an ease taken on know@100 also eased an independent know@200 from another device). A record of before the
  // history (no h): its answer as one choice event at its t, and its ease field (if any) as one ease event. An ease event
  // without the choice's time (written before 2026-11-04): bound, within its own record, to the latest choice of that
  // answer at or before the ease.
  // Every event is kept: the replay of the whole log needs the prior in force at each answer, however old (Codex review
  // #428: a cap at 10 dropped the earliest answers' prior). Nor is the list compacted: an event that repeats the answer
  // in force can matter again once another device's events are merged in between (know@100, know@300 merged with
  // imr@200: "know" from 300 on), so dropping it would not commute with the union. START_CAP is only a safety bound, far
  // above any real history (a player gives one answer, rarely changes it, and a fallback card comes once per answer and
  // direction): at about 40 bytes an event, 200 events stay under 8 KB in the synced record.
  const START_CAP = 200;
  const stTime = x => (typeof x[2] === 'number' ? x[2] : -Infinity);
  const stEase = x => x[3] === 'ease';
  const stKey = x => (stEase(x) ? `e|${x[2]}|${x[0]}|${x[4]}|${x[5]}` : `c|${x[2]}|${x[0]}`);
  function startEvents(rec) {
    if (!isObj(rec)) return [];
    const h = Array.isArray(rec.h) && rec.h.length ? rec.h : startOpt(rec.c) ? [[rec.c, rec.at || 0, rec.t, rec.via || '']] : [],
      e = rec.ease,
      ev = (
        Array.isArray(e) && startOpt(e[0]) && !h.some(x => Array.isArray(x) && stEase(x))
          ? [...h, [e[0], e[1] || 0, e[2], 'ease', rec.c]]
          : h
      ).filter(x => Array.isArray(x) && startOpt(x[0]));
    // An ease without its choice's time: the latest choice of that answer at or before it, in this record.
    return ev.map(x => {
      if (!stEase(x) || typeof x[5] === 'number') return x;
      const ch = ev
        .filter(y => !stEase(y) && y[0] === x[4] && stTime(y) <= stTime(x))
        .sort((a, b) => stTime(a) - stTime(b))
        .pop();
      return [x[0], x[1], x[2], 'ease', x[4], ch && typeof ch[2] === 'number' ? ch[2] : null];
    });
  }
  // The events of several records, once each (by kind, time and value), oldest first (a choice before an ease at the
  // same time, then by value: the same order whichever record comes first), START_CAP at most (the latest).
  function startEventsOf(...recs) {
    // One per key; between two copies of an event that differ only in their details (answers then, via), the same one
    // whichever record comes first.
    const by = new Map();
    recs.flatMap(startEvents).forEach(x => {
      const k = stKey(x),
        y = by.get(k);
      if (!y || JSON.stringify(x) < JSON.stringify(y)) by.set(k, x);
    });
    return [...by.values()]
      .sort(
        (a, b) =>
          stTime(a) - stTime(b) || (stEase(a) ? 1 : 0) - (stEase(b) ? 1 : 0) || (stKey(a) < stKey(b) ? -1 : stKey(a) > stKey(b) ? 1 : 0)
      )
      .slice(-START_CAP);
  }
  // The choice event and the ease in force at time t (Infinity: now) over a sorted event list.
  function startStateAt(ev, t) {
    let ch = null,
      ez = null;
    ev.forEach(x => {
      if (stTime(x) > t) return;
      if (!stEase(x)) ((ch = x), (ez = null));
      else if (ch && x[4] === ch[0] && x[5] === ch[2]) ez = x; // the very choice event it eased
    });
    return {ch, ez};
  }
  // A short fingerprint of a record's history (the sheet's replay cache, Code.gs replay_: a replay made with another
  // history is not reused; Codex review #428): '' with no record.
  function startFp(rec) {
    const ev = startEventsOf(rec);
    if (!ev.length) return '';
    let h = 5381;
    const s = JSON.stringify(ev.map(x => (stEase(x) ? [x[0], x[2], 'ease', x[4], x[5]] : [x[0], x[2]])));
    for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }
  // The first-launch answer's prior at time t (2026-11-03, CHOICE): the eased band's while an ease is in force, else the
  // answer's, 0 before the first answer (the player then played as the default player). The replay steps the ability
  // with it (o.starts).
  function startPriorAt(rec, t) {
    const {ch, ez} = startStateAt(startEventsOf(rec), t);
    return ez ? startVars(ez[0]).p : ch ? startVars(ch[0]).p : 0;
  }
  // The epoch of a record's fallback window: its last reset (wt), else the answer's time.
  const startWt = x => (x && typeof x.wt === 'number' ? x.wt : (x && x.t) || 0);
  // A record with its fields derived from its history: c, at, t, via the last choice; ease the ease in force on it.
  function startNorm(rec) {
    if (!isObj(rec)) return null;
    const h = startEventsOf(rec),
      {ch, ez} = startStateAt(h, Infinity);
    if (!ch) return null;
    const out = {...rec, h, c: ch[0], at: ch[1], t: ch[2], via: ch[3]};
    if (ez) out.ease = [ez[0], ez[1], ez[2]];
    else delete out.ease;
    return out;
  }
  // Two devices' records merged (model.js startMerge, sync.js signIn): the union of their histories; the fallback window
  // (w, hd, v, wt) of the record that holds the current answer, on the same answer the later window epoch (a progress
  // reset) then the longer window; the fallback cards shown on either.
  function startUnion(a, b) {
    const A = startNorm(a),
      B = startNorm(b);
    if (!A || !B) return A || B;
    const h = startEventsOf(A, B),
      {ch} = startStateAt(h, Infinity),
      own = x => x.c === ch[0] && x.t === ch[2],
      n = x => (Array.isArray(x.w) ? x.w.length : 0),
      W =
        own(A) && own(B)
          ? startWt(A) !== startWt(B)
            ? startWt(A) > startWt(B)
              ? A
              : B
            : n(A) >= n(B)
              ? A
              : B
          : own(B) && !own(A)
            ? B
            : A;
    return startNorm({...W, h, fb: {...(B.fb || {}), ...(A.fb || {})}});
  }
  function replayProgress(rows, o = {}) {
    const gen = o.gen || {},
      starts = o.starts || {},
      mem = memOf(o.mem),
      conf = o.conf || {},
      since = o.since || {},
      memory = o.memory !== false,
      time = o.time !== false,
      out = o.start ? JSON.parse(JSON.stringify(o.start)) : {};
    const prior = (t, n) => {
      const a = gen[t] || {},
        b = gen[n] || {};
      return (a.look || []).includes(n) || (b.look || []).includes(t) ? CONF.LOOK : a.fam && a.fam === b.fam ? CONF.FAM : CONF.BASE;
    };
    const pooledOf = (t, n) => confScore(conf[t < n ? t + '|' + n : n + '|' + t], prior(t, n));
    // Known mix-ups (model.js confTerm, #425): the most, over the choices, of the player's own score of the pair above
    // the pooled one (confGap), on the record before this answer, on a question with 3 or more plausible choices; it adds
    // to the question's difficulty for the ability, the level and a miss's weight, as quiz.js answer adds it to dm.
    const confTermOf = (P, t, chs, k) =>
      k >= 3 ? Math.max(0, ...chs.filter(n => n !== t && gen[n]).map(n => confGap(pairConf(P, t, n), pooledOf(t, n)))) : 0;
    // model.js pgWeight: a genus among the choices that the player gets confused with (pooled, then their own record).
    const lookOf = (P, t, n) => {
      if (n === t || !gen[n]) return false;
      const pooled = pooledOf(t, n);
      return pooled >= CONF.TRAP || confScore(pairConf(P, t, n), pooled) >= CONF.TRAP;
    };
    const split = x =>
      String(x || '')
        .split(/\s+/)
        .filter(Boolean);
    rows
      .filter(r => r && r[0] && r[2])
      .sort((a, b) => a[1] - b[1])
      .forEach(r => {
        const id = r[0];
        if (since[id] && !(r[1] > since[id])) return;
        const pl = (out[id] = out[id] || {P: {}, n: 0, used: 0, rep: 0}),
          rec = g => {
            const x = (pl.P[g] = pl.P[g] || {pg: 0, ok: 0, ko: 0, h: '', ps: {}, u: 0});
            if (!x.ps) x.ps = {};
            if (typeof x.pg !== 'number') x.pg = 0;
            x.h = x.h || '';
            x.u = x.u || 0;
            return x;
          },
          t = String(r[2]),
          c = String(r[3] || ''),
          ok = !!r[4],
          mode = String(r[5] || ''),
          fs = split(r[6]),
          e = r[7],
          th = r[8],
          chs = split(r[10]),
          k = kOf(mode, r[10]),
          sec = typeof r[12] === 'number' ? r[12] : null,
          s = rec(t),
          hs = fs.map(f => s.ps[f]),
          wrong = !ok && c && c !== t && gen[c];
        pl.n++;
        if (hs.some(h => h && h[0])) pl.rep++;
        // The mix-ups term, on the record before this answer (quiz.js answer scores it before the offers).
        const cf = confTermOf(pl.P, t, chs, k),
          pr = startPriorAt(starts[id], r[1]); // the first-launch answer's prior at this answer (abilityOf)
        // The choices offered and the genus given instead, before the weight (as quiz.js answer counts them).
        chs.forEach(x => x !== t && ((s.off = s.off || {})[x] = (s.off[x] || 0) + 1));
        s[ok ? 'ok' : 'ko']++;
        s.streak = ok ? (s.streak || 0) + 1 : 0;
        if (!ok && c) (s.conf = s.conf || {})[c] = (s.conf[c] || 0) + 1;
        const replayable = typeof e === 'number' && typeof th === 'number' && fs.length && k > 1;
        let dm = 0,
          d0 = 0,
          rw = 1;
        if (replayable) {
          pl.used++;
          const fam = memFam(hs, mem),
            q = Math.min(0.995, Math.max(0.005, (e - 1 / k) / (1 - 1 / k))),
            dl = th - Math.log(q / (1 - q)), // the difficulty in the logged expectation
            // d: the photo's difficulty alone (quiz.js d0), without the memory and the mix-ups term the app logged in e.
            d = dl - (r[1] >= MEM_LOGGED ? fam : 0) - (r[1] >= CF_LOGGED ? cf : 0),
            fm = memory ? fam : 0,
            look = chs.some(x => lookOf(pl.P, t, x)),
            // The aim at the player's level before this answer's own step on it, as quiz.js answer weighs the miss.
            w = ok ? pgRightW(k, look) * pgMemW(th, d, fm, k) : pgMissW(th, d + fm + cf, k, 1, aimOf((pl.P[LEVEL] || {}).th));
          dm = d + fm + cf;
          d0 = d;
          s.pg = pgStep(s.pg, ok, w);
          s.u++;
          if (o.onAnswer) o.onAnswer(r, {d, fam: fm, cf, k, w, look});
          // The ability, as quiz.js answer steps it: the genus shown against the question's difficulty with the memory,
          // a right answer's step weighed by its time against the player's earlier ones (rtWeight; time: false, without).
          rw = time ? rtWeight(pl.P[LEVEL], sec, k, ok) : 1;
          eloStep(pl.P, t, s, ok, dm, k, rw, pr);
        }
        // The global level (quiz.js answer): made at the first answer from the player's history, then one step each.
        if (pl.P[LEVEL]) pl.P[LEVEL][ok ? 'ok' : 'ko']++;
        else pl.P[LEVEL] = levelSeed(pl.P);
        if (replayable) {
          eloStep(pl.P, LEVEL, pl.P[LEVEL], ok, dm, k, rw, pr);
          if (time) rtAdd(pl.P[LEVEL], sec, k);
        }
        pl.P[LEVEL].at = r[1];
        s.at = r[1];
        // The learned mark (not replayed: replayedOf takes it from the saved copy) is lost, in the game, at a miss that
        // leaves the progress below the keep rule (quiz.js answer, mxKept), on the genus shown as on the genus given: lm,
        // the time of the last such miss, takes away a mark passed before it.
        if (!ok) s.lx = r[1];
        if (!ok && !mxKeeps(s.pg)) s.lm = r[1];
        if (ok && (/^quiz-duel/.test(mode) || /\|d(\||$)/.test(mode))) s.du = 1;
        // Pierre's rule: a wrong answer counts against the genus given too, as quiz.js answer does it after the global
        // level: its progress by the chance the player had on it (its own ability, as replayed so far, against the
        // photo's difficulty without the photo memory: the memory is of the genus shown), a miss in its recent results,
        // its run reset. Not its ability (2026-11-03, docs/LEARNING.md "The genus wrongly given in the Elo"): the Elo
        // moves on the questions about the genus itself, as quiz.js answer does since then.
        if (wrong) {
          const x = rec(c);
          if (replayable) {
            x.pg = pgStep(x.pg, false, pgMissW(abilityOf(pl.P, c, pr), d0, k, 1, aimOf(pl.P[LEVEL].th)));
            x.u++;
          }
          x.h = (x.h + '0').slice(-10);
          x.streak = 0;
          x.lx = r[1];
          if (!mxKeeps(x.pg)) x.lm = r[1];
        }
        s.h = (s.h + (ok ? 1 : 0)).slice(-10);
        fs.forEach(f => {
          const x = (s.ps[f] = s.ps[f] || [0, 0]);
          x[0]++;
          if (ok) x[1]++;
        });
      });
    return out;
  }
  // An answer of the app's own log (quiz.js answer: {id, t, g, a, ok, m, ph, e, th, nw, ch, rt}) as a replay row for
  // player id: this device's answers the sheet has not confirmed yet, replayed on top of the sheet's replay (sync.js).
  // The seconds rt at index 12, as in the sheet's readAnswers rows (11, their anonymous flag, unused here).
  const logRow = (a, id) => [
    id,
    Date.parse(a.t) || 0,
    String(a.g || ''),
    String(a.a || ''),
    a.ok ? 1 : 0,
    String(a.m || ''),
    String(a.ph || ''),
    typeof a.e === 'number' ? a.e : null,
    typeof a.th === 'number' ? a.th : null,
    typeof a.nw === 'number' ? a.nw : null,
    String(a.ch || ''),
    null,
    typeof a.rt === 'number' ? a.rt : null
  ];
  // A player's progress as the app holds it after the replay (rep: replayProgress's player; saved: the player's
  // reefid-sync-coral-progress, the device's copy in the app, the sheet's copy in the admin). What comes from where:
  // - from the replay, for every genus the log has replayable answers on: pg, ok, ko, h, off, conf, th, lt, vr, streak,
  //   at (the later of the two), du (either), the photos seen ps per photo the larger [shown, right] of the two (the
  //   device also counts as shown a corallites hint revealed after the answer, which the log leaves out: a replay must
  //   not make it new again for the exam, model.js examSet), pm 1 (the record is under the photo memory rule: memRecalc must never
  //   correct it again), and rv when given (the rules version it was replayed with: mergeProgress then keeps it over
  //   an older copy of the same answers);
  // - from the saved copy, what the log cannot give: the mastery exam passed (mx) or in course (ex), dropped when passed
  //   under the former model (a record without s.pg, before 2026-11-02: that genus takes the exam again; memRecalc, commit
  //   of 2026-11-03), and the mark dropped too when the log has a miss after the exam that the game takes it away at
  //   (r.lm later than s.mx, the time it was passed; 1 before 2026-11-02, so any such miss): misses logged but never in
  //   the saved copy (a save refused, Codex review #399: 10 misses, pg 0.19, still learned) count as the game counts
  //   them, and a recalculation alone (no such miss after the exam) keeps the mark; likewise the exam in course ends at
  //   any miss on the genus, shown or given, later than its start (r.lx after s.ex.ts; an exam saved before it had its
  //   start time: after the genus's last answer, s.at), as quiz.js answer ends it (Codex review #399: a miss logged over
  //   a saved exam of 4 questions passed kept its 4); the days answered right (dd, dl: the device's calendar days, for the comeback after a break); the
  //   last observations shown (ro: the log keeps photo files, not observations); right with the corallites in view
  //   (cor: the log does not say which view a photo was shown in);
  // - the saved record as it is (the same mx rule) for a genus the log has no replayable answer on, or fewer answers on
  //   than the saved copy (answers that never reached the log: a replay must never lose progress);
  // - LEVEL: the replayed ability (th, vr), the larger answer count of the two (answersSoFar keys the exam's gaps, the
  //   cards met and the prompts, so it never goes back) with the answer times (rt) of the same side, the later at, rv
  //   when given.
  // The opening hold is not here: the sheet already replays it from the same log (Code.gs hold_, reply's hold).
  // The replay does not decide the exam: a genus learned keeps it here even if its replayed bar is lower, unless a miss
  // after the exam takes it away, as the game does (mxKeeps, lm).
  const REPLAYED = ['pg', 'ok', 'ko', 'h', 'ps', 'off', 'conf', 'th', 'lt', 'vr', 'streak'];
  function replayedOf(rep, saved, rv) {
    const S = isObj(saved) ? saved : {},
      R = (rep && rep.P) || {},
      out = {},
      n = x => ((x && x.ok) || 0) + ((x && x.ko) || 0),
      dup = x => JSON.parse(JSON.stringify(x)),
      kept = s => {
        const o = dup(s);
        if (typeof o.pg !== 'number') {
          delete o.mx;
          delete o.ex;
        }
        return o;
      };
    new Set([...Object.keys(S), ...Object.keys(R)]).forEach(g => {
      const s = isObj(S[g]) ? S[g] : null,
        r = isObj(R[g]) ? R[g] : null;
      if (g === LEVEL) {
        const o = s ? dup(s) : {};
        if (r) {
          if (typeof r.th === 'number') o.th = r.th;
          if (typeof r.vr === 'number') o.vr = r.vr;
          // The answer times (rt) go with the count: the replay's when it has every answer the device has.
          if (!s || n(r) >= n(s)) {
            [o.ok, o.ko] = [r.ok || 0, r.ko || 0];
            if (isObj(r.rt)) o.rt = dup(r.rt);
            else delete o.rt;
          }
          if (r.at) o.at = Math.max(r.at, Number(o.at) || 0);
          if (rv) o.rv = rv;
        }
        out[g] = o;
        return;
      }
      if (!r || !r.u || (s && n(s) > n(r))) {
        if (s) out[g] = kept(s);
        else if (r) out[g] = {pg: r.pg || 0, ok: r.ok || 0, ko: r.ko || 0, h: r.h || '', ...(rv ? {rv} : {})};
        return;
      }
      const o = {};
      REPLAYED.forEach(f => r[f] !== undefined && (o[f] = dup(r[f])));
      if (s && isObj(s.ps) && Object.keys(s.ps).length) {
        o.ps = o.ps || {};
        Object.keys(s.ps).forEach(f => {
          const x = o.ps[f] || [0, 0],
            y = Array.isArray(s.ps[f]) ? s.ps[f] : [];
          o.ps[f] = [0, 1].map(i => Math.max(Number(x[i]) || 0, Number(y[i]) || 0));
        });
      }
      const at = Math.max(Number(r.at) || 0, Number(s && s.at) || 0);
      if (at) o.at = at;
      if (r.du || (s && s.du)) o.du = 1;
      o.pm = 1;
      if (rv) o.rv = rv;
      if (s) {
        ['dd', 'dl', 'ro', 'cor'].forEach(f => s[f] !== undefined && (o[f] = dup(s[f])));
        if (typeof s.pg === 'number' && s.mx) {
          if (!(r.lm > s.mx)) o.mx = s.mx;
        } else if (typeof s.pg === 'number' && s.ex && !(r.lx > (s.ex.ts || s.at || 0))) o.ex = dup(s.ex);
      }
      out[g] = o;
    });
    return out;
  }
  // The merge baseline once a replay is adopted (sync.js replayAdopt, mergeProgress's B): the history every device of the
  // account shares, never mixed with this device's own answers not in the sheet yet, which stay the difference P - B and
  // so go on top in the next three-way merge (Codex review #399, three cases: two devices adopting the same log counted it
  // twice, an older app's answers were dropped, an unsent answer was taken into the baseline and lost). rec: the sheet's
  // replay (replay.rec), M: the record adopted (replayedOf), rv: its rules version, B: the baseline before (the shared
  // saved copy). Per genus:
  // - adopted from the replay (M[g].rv is rv): the replayed record as the app holds it without this device's copy
  //   (replayedOf of rec alone), its photos shown per photo the larger of the replay's and B's (exposure the log leaves
  //   out, a corallites hint revealed after the answer, that a device already synced: shared too);
  // - kept from this device's copy (the log has fewer answers on it): B's record, as before;
  // - the global level: the replay's, with B's answer count and answer times (rt) when its count is larger (replayedOf
  //   keeps the larger count).
  function replayBase(rec, M, rv, B) {
    const R = replayedOf({P: rec}, {}, rv),
      B0 = isObj(B) ? B : {},
      out = {},
      n = x => ((x && x.ok) || 0) + ((x && x.ko) || 0),
      dup = x => JSON.parse(JSON.stringify(x));
    Object.keys(M || {}).forEach(g => {
      const b = isObj(B0[g]) ? B0[g] : null,
        r = R[g];
      if (g === LEVEL) {
        if (!r) return b && (out[g] = dup(b));
        const o = dup(r);
        if (b && n(b) > n(r)) {
          [o.ok, o.ko] = [b.ok || 0, b.ko || 0];
          if (isObj(b.rt)) o.rt = dup(b.rt);
          else delete o.rt;
        }
        out[g] = o;
      } else if (r && M[g] && M[g].rv === rv) {
        const o = dup(r);
        Object.keys((b && b.ps) || {}).forEach(f => {
          const x = (o.ps = o.ps || {})[f] || [0, 0],
            y = b.ps[f];
          if (Array.isArray(y)) o.ps[f] = [Math.max(x[0], Number(y[0]) || 0), Math.max(x[1], Number(y[1]) || 0)];
        });
        out[g] = o;
      } else if (b) out[g] = dup(b);
    });
    return out;
  }
  const learnedOf = (P, list) => list.filter(n => (P || {})[n] && P[n].mx).length;

  // Pages opened in a visit (sheet v30 event 'pages'; Pierre, 2026-11-03: "most players only play the quiz and never
  // open the genus sheets": does a beginner use them more, does a sheet reader progress faster?). First-party, one
  // summary a visit, no free text: which pages were open, how many times and for how long (seconds visible, the page in
  // view), and the genus sheets opened: how many times, for how long, how the first one was reached (from: the quiz
  // feedback, a Learn page, My progress, anything else) and whether the genus had already been asked to the player
  // then (asked). The app keeps the tally (sync.js pagesRoute) with these pure functions; the sheet cleans what arrives
  // with pagesClean (Code.gs events_, through its embedded copy of this file). SHEET: the sync script version that
  // stores them (rule D4: nothing is queued before the sheet says v >= SHEET).
  const PAGES = {
    SHEET: 30,
    ROUTES: 30, // at most this many page names a summary, the most opened first
    GEN: 30, // at most this many genus sheets a summary
    MAXN: 1000, // openings of one page counted at most
    MAXS: 86400, // seconds of one page counted at most
    RE: /^[a-zA-Z0-9~][a-zA-Z0-9~|_.-]{0,39}$/, // a page name (a hash without its parameters)
    GENUS: /^[A-Z][a-z]{2,30}$/,
    FROM: ['quiz', 'learn', 'progress', 'other']
  };
  // The page name of a hash: its route without the parameters, a genus sheet (g-Acropora) is 'genus', Look-alikes
  // ('cmp', 'cmp|A|B') 'lookalikes', a side-by-side comparison (cmp-A|B) 'compare', Home 'home'.
  // pre: the prefix of the subject on screen (SUBJECTS pv): a page drawn with Fish on screen is 'fish.<page>' ('fish.quiz',
  // 'fish.home'), so the Pages tab tells a fish page from a coral one (fish UX study, 2026-11-04: fish used the corals'
  // page names); the corals' prefix is empty. '.' is in PAGES.RE: the sheet (pagesClean) keeps these names as they come.
  function pageName(h, pre = '') {
    const s = String(h == null ? '' : h).replace(/^#/, '');
    let n;
    if (!s || s === 'home') n = 'home';
    else if (s.startsWith('g-')) n = 'genus';
    else if (s.startsWith('cmp-')) n = 'compare';
    else if (s === 'cmp' || s.startsWith('cmp|')) n = 'lookalikes';
    else if (s === 'quiz-board') n = 'progress';
    else {
      n = s.split('|')[0].split(';')[0];
      if (!PAGES.RE.test(n)) n = 'other';
    }
    if (!pre) return n;
    return PAGES.RE.test(pre + n) ? pre + n : pre + 'other';
  }
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
    if (/^quiz/.test(n)) return 'quiz';
    if (['genera', 'genus', 'compare', 'lookalikes', 'pairs'].includes(n)) return 'learn';
    if (['progress', 'ach', 'board'].includes(n)) return 'progress';
    return 'other';
  }
  const pagesNew = () => ({r: Object.create(null), g: Object.create(null), cur: null, at: 0});
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
      g = n === 'genus' && PAGES.GENUS.test(String(o.genus || '')) ? o.genus : null;
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
    return out;
  }
  // Whose summary it is (Codex review #423): set when it is queued, so a summary left in the queue (offline, a failed
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
    if (o.na !== undefined && o.na !== null && o.na !== '' && isFinite(Number(o.na))) out.na = n(o.na, 1e6);
    return out;
  }

  // The one-tap question's bank (Pierre, 2026-11-03: "ask slightly different questions about roughly the same
  // concept", so the players say as they go whether the difficulty suits their level; quiz.js pulseAsk, admin Errors).
  // Each item is answered in one tap; each answer sits on one or two common scales: d, felt difficulty (−1 too easy,
  // 0 right, +1 too hard) and f, how the play feels (−1 bad, 0 neutral, +1 good); null = says nothing on that scale.
  // A "no" to a one-sided item (frustrating? boring?) is 0 on both: not too hard, not too easy; asked as often as each
  // other, the two one-sided items shrink a mean towards 0 without tilting it. Codes easy / ok / hard keep their v19
  // meaning on the difficulty scale (the sheet's Detail keeps only those three); an item's other codes ride as they
  // come (Message column) and its id in the Where column: no new sheet version (v19 stores both as text).
  // Sources (docs/LEARNING.md "What the players say about the difficulty"): are, the app's question since v19 (the
  // Too Easy / Appropriate / Too Difficult rating of Papoušek, Stanislav & Pelánek 2016); zone, flow's three channels
  // (boredom, flow, anxiety: Csikszentmihalyi 1975), the balance the flow short scale's item 16 asks as demands too
  // little / just right / too high (Rheinberg, Vollmeyer & Engeser 2003); more, the same balance asked as a wish; fun,
  // frus, bored, the in-game GEQ's positive affect, tension and negative affect items (IJsselsteijn, de Kort & Poels 2013).
  // Besides the answers, every prompt logs its showing (PULSE_SHOWN) and, when it ends without an answer, a "Not now"
  // (PULSE_SKIP) or moving on without a tap (PULSE_NONE): the admin's response rates.
  const PULSE_SHOWN = 'shown',
    PULSE_SKIP = 'skip',
    PULSE_NONE = 'none';
  const PULSEQ = [
    {
      id: 'are',
      q: 'These questions are',
      a: [
        ['easy', 'Too easy', -1, null],
        ['ok', 'About right', 0, null],
        ['hard', 'Too hard', 1, null]
      ]
    },
    // The challenge-skill balance as the flow channels, said as states (Pierre, 2026-11-03: "the challenge is too low /
    // too high" left non-native speakers unsure whether low meant easy or hard).
    {
      id: 'zone',
      q: 'Right now I feel',
      a: [
        ['easy', 'Bored', -1, null],
        ['ok', 'In the zone', 0, null],
        ['hard', 'Struggling', 1, null]
      ]
    },
    {
      id: 'more',
      q: 'Want harder photos?',
      a: [
        ['easy', 'Yes', -1, null],
        ['ok', 'Keep it', 0, null],
        ['hard', 'Easier', 1, null]
      ]
    },
    {
      id: 'fun',
      q: 'Having fun?',
      a: [
        ['lo', 'Not really', null, -1],
        ['mid', "It's OK", null, 0],
        ['hi', 'Yes!', null, 1]
      ]
    },
    {
      id: 'frus',
      q: 'Frustrating?',
      a: [
        ['no', 'Not at all', 0, 0],
        ['bit', 'A bit', 0.5, -0.5],
        ['yes', 'Very', 1, -1]
      ]
    },
    {
      id: 'bored',
      q: 'Getting boring?',
      a: [
        ['no', 'Not at all', 0, 0],
        ['bit', 'A bit', -0.5, -0.5],
        ['yes', 'Yes', -1, -1]
      ]
    }
  ];
  // The first item ever asked, and the item of every answer logged before the bank (no item id: sheet rows until
  // 2026-11-03).
  const PULSE0 = 'are';
  const pulseItem = id => PULSEQ.find(x => x.id === (id || PULSE0)) || null;
  // An answer on the common scales: {d, f}, null where it says nothing (an unknown item or code: both null).
  function pulseScore(id, code) {
    const it = pulseItem(id),
      a = it && it.a.find(x => x[0] === code);
    return a ? {d: a[2], f: a[3]} : {d: null, f: null};
  }
  // Which item to ask next. Rounds: every item once in a shuffled order, then a new round, never starting with the item
  // just asked, so a player never meets the same wording twice in a row and meets each one as often. st is what the
  // device stored at the last ask ({q: item asked, left: the round's items still to ask}; before the bank, {at} alone,
  // which means PULSE0 was asked); rnd a random number generator in [0, 1). Returns {q, left}, to store.
  function pulsePick(st, rnd = Math.random) {
    const ids = PULSEQ.map(x => x.id),
      last = (st && st.q) || (st && typeof st.at === 'number' ? PULSE0 : ''),
      shuffle = L => {
        const o = L.slice();
        for (let i = o.length - 1; i > 0; i--) {
          const j = Math.floor(rnd() * (i + 1));
          [o[i], o[j]] = [o[j], o[i]];
        }
        return o;
      };
    let left = (st && Array.isArray(st.left) ? st.left : []).filter((x, i, L) => ids.includes(x) && x !== last && L.indexOf(x) === i);
    if (!left.length) {
      if (!last) return {q: PULSE0, left: shuffle(ids.filter(x => x !== PULSE0))};
      left = shuffle(ids);
      if (left[0] === last) left.push(left.shift());
    }
    return {q: left[0], left: left.slice(1)};
  }

  // Quantile q (0-1) of a list sorted in ascending order, linear between neighbours (the usual "type 7": the median of
  // 1, 2, 3, 4 is 2.5, its first quartile 1.75). null for an empty list. Admin Photo stats.
  function quantile(a, q) {
    if (!a.length) return null;
    const i = (a.length - 1) * Math.min(1, Math.max(0, q)),
      k = Math.floor(i);
    return a[k] + (a[Math.min(k + 1, a.length - 1)] - a[k]) * (i - k);
  }
  // How a list of numbers spreads (admin Photo stats › Overview, Pierre 2026-11-03: "a median and a spread, not a box
  // plot"): count, sum, mean, min, max, the median and the middle half (p25 to p75). The list is not changed.
  function distOf(L) {
    const a = L.filter(x => typeof x === 'number' && isFinite(x)).sort((x, y) => x - y),
      sum = a.reduce((t, x) => t + x, 0);
    return {
      n: a.length,
      sum,
      mean: a.length ? sum / a.length : null,
      min: a.length ? a[0] : null,
      p25: quantile(a, 0.25),
      med: quantile(a, 0.5),
      p75: quantile(a, 0.75),
      max: a.length ? a[a.length - 1] : null
    };
  }

  const CORE = {
    quantile,
    distOf,
    BENTHIC,
    BONUS,
    slateOf,
    gameOf,
    lectureGroup,
    starRefs,
    starWaits,
    PHOTO_BASE,
    photoLocal,
    photoFallback,
    photoOnline,
    photoFileOf,
    photoAway,
    photoIndex,
    photoCropOf,
    photoRetry,
    PHOTO_RETRY,
    TYPE,
    TYPED_RE,
    typeDist,
    typeNorm,
    typeNamesOf,
    typeMatchIn,
    typedShare,
    PROG,
    mxKeeps,
    pgStep,
    pgOf,
    scoreOf,
    pctOf,
    TARGET_P,
    AIM,
    aimOf,
    pgRightW,
    pgMissW,
    pgMemW,
    kOf,
    MEM_LOGGED,
    CF_LOGGED,
    replayProgress,
    startPriorAt,
    startFp,
    startEvents,
    startEventsOf,
    startStateAt,
    startNorm,
    startUnion,
    startWt,
    START_CAP,
    replayedOf,
    replayBase,
    logRow,
    ELO,
    abilityOf,
    levelMove,
    eloStep,
    RV_CARD,
    RVS,
    RV,
    RV_SHEET,
    RT_SHEET,
    START_SHEET,
    RTIME,
    rtMedian,
    rtWeight,
    rtAdd,
    rvMsgs,
    learnedOf,
    PAGES,
    pageName,
    pageSubj,
    pageFrom,
    pagesNew,
    pagesStop,
    pagesOpen,
    pagesResume,
    pagesSummary,
    pagesTake,
    pagesClean,
    pagesOwner,
    pagesBatch,
    pagesOwn,
    ACH,
    newAch,
    ACH_LEARN,
    achRevoke,
    mergeAch,
    CONTRIB_MAX,
    contribKey,
    contribAdd,
    LEVEL,
    SORRY,
    firstName,
    sorryFelt,
    sorryOf,
    sorryDue,
    sorryHi,
    sorryText,
    START,
    playerStart,
    CHOICE,
    startKey,
    startText,
    startOpt,
    startVars,
    startCheck,
    startBand,
    levelFit,
    startNext,
    startInfer,
    levelSeed,
    accountOf,
    commonFactor,
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
    genusOffsetsOf,
    GENUS_K,
    levelMargin,
    playSplit,
    trustOf,
    guessOf,
    TRUST,
    PHOTO_W,
    PLAYER0,
    MEM,
    memBucket,
    memFam,
    memOf,
    photoMemOf,
    memRecalc,
    confusionOf,
    CONF,
    confScore,
    confGap,
    dataLook,
    pairConf,
    mergeUsers,
    PULSEQ,
    PULSE0,
    PULSE_SHOWN,
    PULSE_SKIP,
    PULSE_NONE,
    pulseItem,
    pulseScore,
    pulsePick,
    ORG,
    KEYS,
    SUBJECTS,
    SUBJECT_KEY,
    subjectOf,
    subjGroup,
    subjKey,
    subjDev,
    fishGen,
    keepSubjectKeys,
    fishNames,
    fishTypeNames,
    typeNormAll,
    LEGACY_KEYS,
    keyRename,
    keyLegacy,
    keyBefore,
    keyGet,
    travelData,
    withOldNames,
    migrateKeys,
    migrateStorage,
    migrateIdKey,
    keysIn,
    LEGACY_SEND,
    withLegacy
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = CORE;
  else Object.assign(root, CORE);
})(this);
