  // Typed answers (docs/LEARNING.md "Typed questions"; quiz.js): the player types the genus instead of picking 1 of 4
  // (recall, not recognition). Light spelling tolerance (1 letter on a short name, 2 on a long one), old names accepted
  // ("formerly X" in the genus's own lines), no suggestions while
  // typing, the phone's autocorrect and capitals off, an "I don't know" button (a miss), the right spelling shown after
  // the answer. A word that is no game genus, even with the tolerance, is no answer: the player is asked to check it.
  const TYPE = {
    // Edits allowed: one for a name of up to 6 letters, two beyond (Porites, Pocillopora).
    tol: n => (n <= 6 ? 1 : 2)
  };
  // Optimal string alignment distance (Levenshtein + a swap of two neighbouring letters, the commonest typo).
  // Three rows of the matrix only (the row being filled, the one above and, for the swap, the one above that): the same
  // values as the whole matrix, without allocating it (tests/typefast.test.js).
  function typeDist(a, b) {
    const m = b.length;
    let p2 = new Array(m + 1).fill(0),
      p1 = Array.from({length: m + 1}, (_, j) => j),
      r = new Array(m + 1).fill(0);
    for (let i = 1; i <= a.length; i++) {
      r[0] = i;
      for (let j = 1; j <= m; j++) {
        const c = a[i - 1] === b[j - 1] ? 0 : 1;
        let v = Math.min(p1[j] + 1, r[j - 1] + 1, p1[j - 1] + c);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, p2[j - 2] + 1);
        r[j] = v;
      }
      [p2, p1, r] = [p1, r, p2];
    }
    return p1[m];
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
  // [genera]} when two are as close by spelling (the player is asked to check the spelling), {shared: [units], exact}
  // for a name several units share typed exactly, {known} for a name that is no unit's (treeTypeNames known), null when
  // nothing is close. The closest names decide: a name typed exactly is never read as a slip of another.
  // norm: how the text is read (typeNorm, the first word, for genera; typeNormAll, the whole text, for fish entries).
  function typeMatchIn(names, text, norm = typeNorm) {
    const t = norm(text);
    if (t.length < 3) return null;
    // A name whose length differs from the text's by more than its tolerance is skipped unread: the distance is at
    // least the difference in length (each edit changes it by one at most), so the filter below would drop it anyway.
    const all = names
      .filter(x => Math.abs(x.k.length - t.length) <= TYPE.tol(x.k.length))
      .map(x => ({...x, d: typeDist(t, x.k)}))
      .filter(x => x.d <= TYPE.tol(x.k.length))
      .sort((a, b) => a.d - b.d);
    if (!all.length) return null;
    // The closest names decide. A name the game knows that is no unit's (known: treeTypeNames) closest: {known}, no
    // unit; else the units' names among them. Typed exactly, a name several units share is all of them ({shared}: the
    // answer is right for each, quiz.js typeUnit); two units as close by spelling only is {near} ("which one?").
    const top = all.filter(x => x.d === all[0].d),
      best = top.filter(x => !x.known);
    if (!best.length) return {known: 1, old: top[0].old, ...(top[0].w ? {w: 1} : {})};
    const gs = [...new Set(best.map(x => x.g))];
    // One name several units share, typed exactly or with a slip (every closest name the same key): shared, the slip
    // taking the spelling step as any name's; two names as close: near.
    if (gs.length > 1)
      return best[0].d === 0 || best.every(x => x.k === best[0].k)
        ? {
            shared: gs,
            old: best[0].old,
            // the name as written that the text reads as (Gobies), for the spelling step's correction
            name: best[0].nm || best[0].old,
            exact: best[0].d === 0,
            // each unit's own reading of it: its role (vr), how many of its species carry it (n, of), its gentle name (oft)
            by: Object.fromEntries(
              gs.map(g => {
                const x = best.find(y => y.g === g);
                return [
                  g,
                  {
                    ...(x.vr ? {vr: x.vr} : {}),
                    ...(x.n ? {n: x.n, of: x.of} : {}),
                    ...(x.oft ? {oft: x.oft} : {}),
                    ...(x.sc ? {sc: x.sc} : {})
                  }
                ];
              })
            )
          }
        : {near: gs};
    return {
      g: best[0].g,
      old: best[0].old,
      exact: best[0].d === 0,
      ...(best[0].alt ? {alt: 1} : {}),
      ...(best[0].oft ? {oft: best[0].oft} : {}),
      ...(best[0].vr ? {vr: best[0].vr} : {}),
      ...(best[0].n ? {n: best[0].n, of: best[0].of} : {}),
      ...(best[0].sc ? {sc: best[0].sc} : {})
    };
  }
  // What a typed text that is no unit of the rank asked names instead, for a nudge that gives nothing away
  // (docs/spec/quiz.md "Another rank or a common name"; quiz.js typeBind). other: the names of the units of the other
  // ranks ([{k, g, old, alt}], typeMatchIn's); x.sci: the scientific names at the rank asked, in the game or not (one
  // of them, or another name of a unit that is one, is no common name: the spelling message); x.common: the common
  // names at the rank asked; x.rank(g): the rank word of unit g; x.own(g): IMR's name for it, each part too. Returns
  // x.rank(g) for a unit's own name or a scientific name of it (Damselfishes, Pomacentridae; Scarinae for the book's
  // Parrotfishes), 'common' for any other name it goes by or a common name at the rank asked, '' otherwise. The lists'
  // names are read once per norm and name (TYPE_NORMED).
  const TYPE_NORMED = new Map();
  const typeNormed = norm => {
    let c = TYPE_NORMED.get(norm);
    if (!c) TYPE_NORMED.set(norm, (c = new Map()));
    if (c.size > 50000) c.clear(); // a bound, far above the subjects' lists
    return s => {
      let k = c.get(s);
      if (k === undefined) c.set(s, (k = norm(s)));
      return k;
    };
  };
  function typeElse(text, other, x = {}, norm = typeNorm) {
    const nm = typeNormed(norm),
      sci = new Set((x.sci || []).map(nm)),
      t = norm(text);
    if (!t || sci.has(t)) return '';
    const m = typeMatchIn(
      (other || []).filter(o => !sci.has(nm(o.old))),
      text,
      norm
    );
    if (m && m.known) return 'common';
    // A name the index lifts from below (treeNameIndex): a scientific name (a species', a genus's) is no common name (the
    // spelling message); a shared one is a common name unless it is a family's own (Holocentridae, Goby).
    if (m && (m.vr === 'ss' || m.vr === 'gs')) return '';
    if (m && m.shared)
      return /i[dn]ae$/i.test(m.old || '') || Object.values(m.by || {}).some(r => !r.vr)
        ? (x.rank ? x.rank(m.shared[0]) : '') || ''
        : 'common';
    if (m && !m.near) {
      const imr = String((x.own && x.own(m.g)) || ''),
        own = !m.old || /i[dn]ae$/i.test(m.old) || [imr, ...imr.split(/\s*&\s*|\s+and\s+/)].some(n => n && norm(n) === norm(m.old));
      return own ? (x.rank ? x.rank(m.g) : '') || '' : 'common';
    }
    const c = typeMatchIn(
      (x.common || []).filter(n => !sci.has(nm(n))).map(n => ({k: nm(n), g: 'common', old: ''})),
      text,
      norm
    );
    return c && !c.near ? 'common' : '';
  }
  // The spelling step: how a typed answer reads against the unit asked t, m being typeMatchIn's reading of it. 'exact':
  // one of its names, spelled right (capitals, accents and spaces aside); 'close': one of its names within the spelling
  // tolerance: still a right answer (the genus was recognised), but the player retypes it once (quiz.js typeBind);
  // 'other': another unit's name, close or exact (a wrong answer); 'none': nothing close, or two names as close (no
  // answer: the player is asked to check the spelling).
  // A name several units share ({shared}): as one of t's names when t is one of them, else 'other'; a known name that is
  // no unit's ({known}): 'none'.
  // sp: the species of the photo (its own taxon, quiz.js): a name of part of t only reads as t when it designates them
  // (typeFits), else 'other'.
  function typeVerdict(m, t, sp) {
    if (!m || m.near || m.known) return 'none';
    if (!typeFits(m, t, sp)) return 'other';
    if (m.shared) return m.exact ? 'exact' : 'close';
    if (m.g !== t) return 'other';
    return m.exact ? 'exact' : 'close';
  }
  // Does the reading m name unit t as the photo shows it? A name of t as a whole, or of part of t (sc: its species) when
  // the photo's species sp are among them: "Razorfish" counts for the wrasses on a razorfish's photo, never on another
  // wrasse's (docs/FISH_PATH.md). sp unknown ([]): read as t, nothing proves a mistake.
  function typeFits(m, t, sp) {
    if (!m || m.near || m.known) return false;
    const r = m.shared ? (m.shared.includes(t) ? (m.by || {})[t] || {} : null) : m.g === t ? m : null;
    if (!r) return false;
    return !r.sc || !(sp || []).length || r.sc.some(x => sp.includes(x));
  }
  // The letters of name to show in bold once a retyped spelling is still wrong (quiz.js typeSpell): those the typed text
  // got wrong, left out or swapped, along typeDist's alignment; a letter typed in excess marks the letter of name where it
  // went in. Returns indexes into [...name] (spaces and other signs are never marked). norm: as typeMatchIn's.
  function typeDiff(text, name, norm = typeNorm) {
    const a = norm(text),
      pos = [],
      L = [];
    [...String(name || '')].forEach((c, i) => {
      const k = c
        .toLowerCase()
        .normalize('NFD')
        .replace(/[^a-z]/g, '');
      if (k) (L.push(k[0]), pos.push(i));
    });
    const b = L.join(''),
      n = a.length,
      m = b.length;
    if (!m) return [];
    const d = Array.from({length: n + 1}, (_, i) => [i, ...Array(m).fill(0)]);
    for (let j = 1; j <= m; j++) d[0][j] = j;
    for (let i = 1; i <= n; i++)
      for (let j = 1; j <= m; j++) {
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    const mark = new Set();
    let i = n,
      j = m;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && a[i - 1] === b[j - 1] && d[i][j] === d[i - 1][j - 1]) (i--, j--);
      else if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1] && d[i][j] === d[i - 2][j - 2] + 1)
        (mark.add(j - 1), mark.add(j - 2), (i -= 2), (j -= 2));
      else if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + 1) (mark.add(j - 1), i--, j--);
      else if (j > 0 && d[i][j] === d[i][j - 1] + 1) (mark.add(j - 1), j--);
      else (mark.add(Math.min(j, m - 1)), i--);
    }
    return [...mark].map(k => pos[k]).sort((x, y) => x - y);
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

