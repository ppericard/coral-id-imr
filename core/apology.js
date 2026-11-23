  // An apology, once (docs/spec/cards.md "The apology card", which gives the selection and how it was checked; decision
  // in docs/decisions/2026-11-18-decisions-from-code-comments.md): between FROM and the fix, the app opened too many
  // genera at once to strong players and did not ease the questions after misses. Only to the players who really felt
  // it, read once from the device's own data (progress.js sorryNotice keeps it): n, their answers in the window (at
  // least N); h, the opening hold's sum then (at least H, or half of it with CARDS genera or more opened on cards
  // within WIN answers, c). Never after UNTIL.
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
  // The first name to greet a player with on a personalised card (rule U10), from their sign-in name: the first word
  // ("Ana Lopez" -> "Ana", "Ana B." -> "Ana"), its first letter capitalised;
  // only the letters it starts with (an apostrophe or a hyphen inside kept: "O'Neil", "Jean-Luc"), so a name with no
  // letter first ("~a12", "123") gives '' and the card says a plain "Hi!".
  const firstName = name => {
    const m = /^\p{L}[\p{L}\p{M}'’-]*/u.exec(String(name || '').trim()),
      w = m ? m[0].replace(/['’-]+$/, '') : '';
    return w ? w[0].toUpperCase() + w.slice(1) : '';
  };
  const sorryHi = name => (firstName(name) ? `Hi ${firstName(name)}!` : 'Hi!');
  // Account names refused for a new account or an archive name: a name holding, as one of its words, a member name of
  // Object.prototype or a word like it (prototype). As a key of a plain object such a name reads the inherited member;
  // the sheet's maps by player have no prototype, and the front door refuses them too. Words split as Code.gs PROTO_RE
  // splits a value (spaces, | : ,), any capitalisation (the sheet keys names in lower case). An account that already has
  // such a name keeps working: only a sign-up (the app's form, Code.gs doPost_ with no row yet) and an archive name
  // (users_ userArchive) are refused, with error 'reserved'. Whatever else this engine's Object.prototype has is refused
  // as well.
  const RESERVED_NAMES = [
    '__proto__',
    'constructor',
    'prototype',
    'toString',
    'toLocaleString',
    'valueOf',
    'hasOwnProperty',
    'isPrototypeOf',
    'propertyIsEnumerable',
    '__defineGetter__',
    '__defineSetter__',
    '__lookupGetter__',
    '__lookupSetter__'
  ];
  const RESERVED_LC = new Set(RESERVED_NAMES.concat(Object.getOwnPropertyNames(Object.prototype)).map(w => w.toLowerCase()));
  // The seedling 🌱 is the admin's own mark after his name, the name unchanged (docs/ARCHITECTURE.md "Pages and routing"): the
  // app shows it after the admin's account name (Code.gs adminAcct_; markHtml below), and no player may show it: a new
  // account or an archive name holding it, or one of its look-alikes, anywhere is refused as reserved. Seedling, herb,
  // potted plant, shamrock, four-leaf clover, leaf fluttering in wind (a variation selector after it changes nothing).
  const SEED_LOOKALIKES = ['\u{1F331}', '\u{1F33F}', '\u{1FAB4}', '\u2618', '\u{1F340}', '\u{1F343}'];
  const SEED_RE = new RegExp('[' + SEED_LOOKALIKES.join('') + ']', 'u');
  const reservedName = name =>
    SEED_RE.test(String(name == null ? '' : name)) ||
    String(name == null ? '' : name)
      .split(/[\s|:,]+/)
      .some(w => w !== '' && RESERVED_LC.has(w.toLowerCase()));
  const SEED = '\u{1F331}';
  // The admin's mark: the script knows the admin's account (Code.gs adminAcct_: a 4th field 1 on its leaderboard
  // rows, admin: 1 in its load reply). markRow: whether a leaderboard row carries it. markHtml: the mark itself, plain
  // text after the name's element, outside its text (the name stays the account's name).
  const markRow = row => Array.isArray(row) && row[3] === 1;
  const markHtml = () => `<span class="amark" role="img" title="Admin" aria-label="Admin">${SEED}</span>`;
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

