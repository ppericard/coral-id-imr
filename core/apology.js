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
  // Look-alike account names (REE-35, the integrator's call): two names that look the same can no longer be two accounts.
  // A name is at most NAME_MAX UTF-16 code units (the form's maxlength, Code.gs clean_), cut back to its last whole
  // character (nameCut: a grapheme where the engine segments them, else a code point; never inside an emoji or a
  // surrogate pair; a name within the limit is never touched). A new name (the app's sign-in form, Code.gs doPost_ with no
  // account yet, users_ userArchive) is NFC (nameClean), refused when it holds an invisible character (nameHidden), and
  // refused as taken when it looks like an existing account's name (nameSkeleton). An existing account is never renamed,
  // merged or changed: these apply to new names only.
  const NAME_MAX = 40;
  const nameCut = (s, n = NAME_MAX) => {
    s = String(s == null ? '' : s);
    if (s.length <= n) return s;
    const fit = parts => {
      let out = '';
      for (const x of parts) {
        if (out.length + x.length > n) break;
        out += x;
      }
      return out;
    };
    const Seg = typeof Intl === 'object' && Intl && typeof Intl.Segmenter === 'function' ? Intl.Segmenter : null;
    // One grapheme longer than the limit (a letter under dozens of marks) leaves nothing whole: then code points.
    return (Seg && fit(Array.from(new Seg(undefined, {granularity: 'grapheme'}).segment(s), x => x.segment))) || fit(Array.from(s));
  };
  const nameClean = s =>
    nameCut(
      String(s == null ? '' : s)
        .trim()
        .normalize('NFC')
    );
  // Invisible characters a new name may not hold: the format characters (Unicode category Cf: zero-width space, joiner and
  // non-joiner, the bidi controls LRM RLM LRE RLE PDF LRO RLO and the isolates, the word joiner, the BOM, the soft
  // hyphen, the tags), control characters (Cc), line and paragraph separators, and the letters and marks that draw
  // nothing (the combining grapheme joiner, the Hangul fillers, the Khmer inherent vowels, the Mongolian variation
  // selectors, the Braille blank). An emoji's own joiner stays: a zero-width joiner between two pictographs (woman
  // scientist: woman, joiner, microscope) and the tags of a flag (England, Scotland, Wales) draw one emoji, not an
  // invisible mark.
  // (Escapes only, here and below: an invisible character written as it is would be invisible in the code too.)
  const NAME_HIDDEN = /[\p{Cf}\p{Cc}\u{2028}\u{2029}\u{034F}\u{115F}\u{1160}\u{17B4}\u{17B5}\u{180B}-\u{180F}\u{2800}\u{3164}\u{FFA0}]/u;
  const NAME_EMOJI_ZWJ = /(\p{So}[\u{FE0F}\u{1F3FB}-\u{1F3FF}]?)\u{200D}(?=\p{So})/gu,
    NAME_FLAG_TAGS = /\u{1F3F4}[\u{E0020}-\u{E007E}]+\u{E007F}/gu;
  const nameHidden = name =>
    NAME_HIDDEN.test(
      String(name == null ? '' : name)
        .replace(NAME_FLAG_TAGS, '\u{1F3F4}')
        .replace(NAME_EMOJI_ZWJ, '$1')
    );
  // Greek and Cyrillic letters that look like a Latin letter, each with that letter: every entry of Unicode's
  // confusables data (UTS #39, https://www.unicode.org/Public/security/latest/confusables.txt, version 18.0.0) whose source
  // is a letter of U+0370-U+04FF and whose prototype is one ASCII letter. One change: the capital Greek iota Ι and the
  // capital Ukrainian І, which the data map to l as it maps the Latin I, map to I here, since names are compared case
  // aside (Ian and ian are one account, so the Latin I/l pair cannot be kept).
  const NAME_LATIN = (() => {
    const o = Object.create(null),
      s =
        'αaаaΑAАAЬbΒBВBϲcсcϹCСCеeҽeΕEЕEϜFһhҺhΗHНHιiіiϳjјjͿJЈJΚKКKΙIІIӏlӀlΜMϺMМMΝNοoσoϭoоoΟOОOρpϱpϸpрpΡPРPгrѕsЅSΤTТTυuνvѵvѴVѡwшwхxΧXХXγyуyүyΥYϒYУYҮYΖZ';
    for (let i = 0; i < s.length; i += 2) o[s[i]] = s[i + 1];
    return o;
  })();
  // Default-ignorable code points (Unicode's DerivedCoreProperties: they draw nothing) and the blanks above: left out of
  // the skeleton, so a name with one looks like the name without it.
  const NAME_IGNORED =
    /[\p{Cf}\u{00AD}\u{034F}\u{061C}\u{115F}\u{1160}\u{17B4}\u{17B5}\u{180B}-\u{180F}\u{200B}-\u{200F}\u{202A}-\u{202E}\u{2060}-\u{206F}\u{2800}\u{3164}\u{FE00}-\u{FE0F}\u{FEFF}\u{FFA0}\u{FFF0}-\u{FFF8}\u{1BCA0}-\u{1BCA3}\u{1D173}-\u{1D17A}\u{E0000}-\u{E0FFF}]/gu;
  // A name's skeleton, what it looks like (after UTS #39's skeleton: decomposed, mapped, composed): decomposed (NFD), the
  // invisible characters dropped, each Greek or Cyrillic look-alike as its Latin letter, compatibility forms folded
  // (NFKC: a full-width Ａ is A), case aside, every run of spaces one space. Two names with one skeleton look alike.
  const nameSkeleton = name =>
    Array.from(
      String(name == null ? '' : name)
        .normalize('NFD')
        .replace(NAME_IGNORED, '')
    )
      .map(c => NAME_LATIN[c] || c)
      .join('')
      .normalize('NFKC')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()
      .normalize('NFC');
  // The groups of names that look alike among the given ones (the admin's warning on Players), each sorted, the groups by
  // their first name; one name in two spellings of case (one account) is one name.
  const nameAlikePairs = names => {
    const by = new Map();
    (names || []).forEach(n => {
      const t = String(n == null ? '' : n);
      if (!t) return;
      const k = nameSkeleton(t),
        g = by.get(k) || [];
      if (!g.some(x => x.toLowerCase() === t.toLowerCase())) g.push(t);
      by.set(k, g);
    });
    return [...by.values()]
      .filter(g => g.length > 1)
      .map(g => g.slice().sort())
      .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  };
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

