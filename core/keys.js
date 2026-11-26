  // The organisation and the app's name, in one place, so a fork can rename the app. Pages built by JS read ORG; the
  // static files (index.html, admin.html, privacy.html, manifest.webmanifest, tools/og/og.html, README.md, the docs) are
  // rewritten from it by tools/rename_app.py. The storage keys never depend on it (KEYS), so a fork renames the app
  // without moving any player's data.
  // The words of the organisation's course, as the players and the admin meet them, each a whole name without its
  // article (code writes "the " + ORG.course): course, the course; lecture, the coral lecture as a source (its notes,
  // groups, photos); lectureRef, the lecture as a reference names it (the data's lsrc lines start with it); fishPres,
  // the fish presentation (the fish families' look-alike lines start with it); list, slate and benthic, the survey's
  // coral list, its slate and its benthic slate; trainer, who teaches the course. A phrase not listed builds on ORG.short
  // ("At " + ORG.short + " or elsewhere"). The data's own values and the identifiers keep their words
  // (docs/decisions/2026-11-25-org-course-words.md). Flat, quoted values only: tools/rename_app.py reads this literal.
  const ORG = {
    short: 'IMR',
    name: 'Institute for Marine Research',
    app: 'IMR Reef ID',
    appShort: 'Reef ID',
    course: 'IMR course',
    lecture: 'IMR lecture',
    lectureRef: 'IMR Lecture 6',
    fishPres: 'IMR fish presentation',
    list: 'IMR list',
    slate: 'IMR slate',
    benthic: 'IMR benthic slate',
    trainer: 'IMR trainer'
  };
  // Storage keys (localStorage, sessionStorage): one app-wide prefix that names the app without the organisation, and is
  // distinct from other apps on the shared origin ppericard.github.io.
  //   reefid-<name>        stays on this device (sign-in record, caches, queues, the admin, the Lab);
  //   reefid-sync-<name>   travels with the player: progress files, the sheet's Data column (progress.js progData) and so
  //                        every device signed in to the account. What belongs to one group of organisms carries it:
  //                        reefid-sync-coral-progress now, reefid-sync-fish-progress beside it later.
  // A new key that should travel takes KEYS.SYNC; anything else stays on the device by default (nothing sent by mistake).
  const KEYS = {APP: 'reefid-', SYNC: 'reefid-sync-'};
  // rename-app: keep-begin
  // The key names before the app's rename (imr-coral-* travelled, the other imr-* stayed) and their new ones: exact names
  // first, then prefixes (ending in -). Read by tools/rename_app.py and, on the players' devices, by migrateKeys.
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
  // A key's value read from a Storage, under its old name when the new one is absent: a key the migration could not
  // write (storage full) stays under its old name until a later start moves it, and the player's progress must not look
  // empty meanwhile. The app's and the admin's store.get read through it.
  function keyGet(s, k) {
    const v = s.getItem(k);
    if (v !== null) return v;
    const o = keyBefore(k);
    return o ? s.getItem(o) : null;
  }
  // Every key that travels with the player (KEYS.SYNC), from a Storage, as {name: value}: progress files, the sheet's
  // Data (progress.js progData). A travelling key still under its old name (a migration that could not write it yet)
  // counts under its new name, the new one winning: a save or a backup never leaves out a record whose move is pending.
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
  // device.
  const withOldNames = L => [...new Set(L.flatMap(k => [k, keyBefore(k)].filter(Boolean)))];
  // Both storages of this page (a page with storage blocked moves nothing).
  function migrateStorage() {
    try {
      return [...migrateKeys(localStorage), ...migrateKeys(sessionStorage)];
    } catch (e) {
      return [];
    }
  }
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
