  // Full replay (docs/LEARNING.md "Full replay"; docs/spec/sync.md "Full replay"): every player's progress rebuilt from
  // the answer log, in time order, with today's rules, every answer through scoreAnswer. rows: the answer log (the
  // sheet's readAnswers rows, Code.gs rowOf_, or the app's own through logRow: [id, time ms, genus shown, answered,
  // right 0|1, mode, photos, expected e, ability th, new photos, choices, (11: unused here), seconds (null without),
  // (13 to 21: unused here), the scoring record (LOG_SC: scoreRec, null without)]). o: gen (the units: look-alikes
  // look, family fam), mem (?stats=1 mem; the prior without), conf (?stats=1 conf), since ({id: time ms}: only the
  // answers after a reset), memory false (no photo memory) and time false (no response time) for a what-if, fmt
  // (?stats=1 fmt, for a row without a scoring record; one with it replays its own o), start ({id: player}: a replay to
  // go on from, as returned here, the sheet's with this device's unconfirmed answers on top; copied, never changed),
  // onAnswer(row, {d, fam, cf, k, w, look}), dom false (the moving average instead of the bar), gd (the genus offsets
  // for rows logged without them), vars (the variant table), starts (the first-launch records by player). Returns {id:
  // {P: {unit: {dp, ds, ok, ko, h, ps, off, conf, u, th, lt, vr, streak, at, du, lx, lm}, '~level': {ok, ko, th, vr,
  // at, rt}}, n, used, rep}}: pg in place of dp and ds with dom false or from a start record that holds one; u the
  // answers that moved the bar, du a look-alike duel won, lx the last miss on it shown or given, lm the last that took
  // it below the keep rule (keepsMark); n the rows read, used those replayed, rep those on a photo already shown.
  // MEM_LOGGED, CF_LOGGED: from then the logged e includes the photo memory, then the mix-ups term, taken out again for
  // an older row's difficulty. The mastery exam is not replayed (replayedOf).
  const MEM_LOGGED = Date.UTC(2026, 10, 3, 4, 46); // from then the app's logged e includes the photo memory
  // From then the app's logged e includes its mix-ups term (model.js confTerm; the instant tools/abilityeval.js CF_FROM
  // reads on the sheet's wall clock), taken out again here. An app not yet updated logs a few answers without it after.
  const CF_LOGGED = Date.UTC(2026, 10, 3, 15, 35);
  // The first-launch record's history (docs/spec/cards.md "The record", h): an append-only list of timestamped events,
  // merged between devices as a union (startUnion), from which the answer, the silent ease and the prior at any time
  // are derived (startNorm, startPriorAt): a choice event [c, answers then, time, via], an ease event [the band below,
  // answers then, time, 'ease', the answer it eased, the time of that answer's choice event]. Every event is kept and
  // the list never compacted (that would not commute with the union); START_CAP is only a safety bound.
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
  // history is not reused): '' with no record.
  function startFp(rec) {
    const ev = startEventsOf(rec);
    if (!ev.length) return '';
    let h = 5381;
    const s = JSON.stringify(ev.map(x => (stEase(x) ? [x[0], x[2], 'ease', x[4], x[5]] : [x[0], x[2]])));
    for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }
  // The first-launch answer's prior at time t (CHOICE): the eased band's while an ease is in force, else the
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
  // Pierre's change of a player's first-launch answer for one subject (docs/spec/admin-players.md, The starting answer;
  // Code.gs users_ userStart): a choice event appended to the history, via 'admin', at now or just after the latest
  // event, never an event taken away; the fallback window starts again from it. data: the player's saved copy (keysIn
  // names, _acct and the rest kept); s: the subject id; c: the answer (CHOICE.opts); now: ms. Returns {data, start: the
  // new record}, or null when nothing is to change (an unknown subject or answer, a subject without the question, or no
  // answer saved for it).
  function startAdminSet(data, s, c, now) {
    if (!isObj(data) || !startOpt(c) || !SUBJECTS.some(S => S.id === s && S.start)) return null;
    const k = startKey(s),
      old = keyLegacy(k),
      parse = x => {
        try {
          return JSON.parse(x || 'null');
        } catch (e) {
          return null;
        }
      },
      rec = startNorm(parse(typeof data[k] === 'string' ? data[k] : old && data[old]));
    if (!rec) return null;
    const P = parse(data[subjKey(s, 'progress')]),
      L = isObj(P) && isObj(P[LEVEL]) ? P[LEVEL] : {},
      num = x => (typeof x === 'number' && isFinite(x) && x > 0 ? x : 0),
      a = num(L.ok) + num(L.ko),
      ev = startEvents(rec),
      t = Math.max(Math.round(Number(now) || 0), ...ev.map(x => stTime(x) + 1).filter(isFinite)),
      {w, hd, v, wt, ...rest} = rec,
      start = startNorm({...rest, w: [], h: startEventsOf({h: [...ev, [c, a, t, 'admin']]})}),
      json = JSON.stringify(start),
      out = {...data, [k]: json};
    if (old && old in data) out[old] = json;
    return {data: out, start};
  }
  function replayProgress(rows, o = {}) {
    const gen = o.gen || {},
      starts = o.starts || {},
      mem = memOf(o.mem),
      conf = o.conf || {},
      since = o.since || {},
      fmt = o.fmt || {},
      // photos: the ?stats=1 photos with their time terms (ptimeInto), for a row logged without its term (scoring record
      // i): its time netted of the terms served now (rtWeight ti, ptimeQ); without them, 0 (the rule before).
      tAt = ptimeAt(o.photos),
      memory = o.memory !== false,
      time = o.time !== false,
      // dom: false, the moving average; gd: the genus offsets ({genus: [offset, weighed answers]}, ?stats=1 gd) for the
      // rows logged without them.
      dom = o.dom !== false,
      gdv = g => {
        const x = (o.gd || {})[g];
        return Math.round((Array.isArray(x) ? Number(x[0]) || 0 : Number(x) || 0) * 1000) / 1000;
      },
      // Keyed by player id: no prototype, so a player named "constructor" or "__proto__" is a player like any other
      // (a plain object read Object's own constructor for one, and replayed nothing). own: an id's entry of a map given.
      out = Object.assign(Object.create(null), o.start ? JSON.parse(JSON.stringify(o.start)) : {}),
      own = (m, k) => (Object.prototype.hasOwnProperty.call(m, k) ? m[k] : undefined);
    const prior = (t, n) => {
      const a = gen[t] || {},
        b = gen[n] || {};
      return (a.look || []).includes(n) || (b.look || []).includes(t) ? CONF.LOOK : a.fam && a.fam === b.fam ? CONF.FAM : CONF.BASE;
    };
    const pooledOf = (t, n) => confScore(conf[t < n ? t + '|' + n : n + '|' + t], prior(t, n));
    // Known mix-ups (model.js confTerm): the most, over the choices, of the player's own score of the pair above
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
        if (own(since, id) && !(r[1] > own(since, id))) return;
        const pl = (out[id] = out[id] || {P: {}, n: 0, used: 0, rep: 0}),
          rec = g => {
            // No former moving average on a new record: the domain-score bar from its first answer (scoreAnswer domIn);
            // a record of the copy it goes on from (start) keeps what it has.
            const x = (pl.P[g] = pl.P[g] || {ok: 0, ko: 0, h: '', ps: {}, u: 0});
            if (!x.ps) x.ps = {};
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
          sc = scoreRec(r[LOG_SC]),
          s = rec(t),
          hs = fs.map(f => s.ps[f]),
          wrong = !ok && c && c !== t && gen[c];
        if (wrong) rec(c);
        pl.n++;
        if (hs.some(h => h && h[0])) pl.rep++;
        const pr = startPriorAt(own(starts, id), r[1]), // the first-launch answer's prior at this answer (abilityOf)
          replayable = fs.length && k > 1 && (sc || (typeof e === 'number' && typeof th === 'number'));
        const q = {t, c, ok, k, chs, ph: fs, cv: !!wrong, p: pr, sec, timed: time, rt: time && !!replayable, d0: null, dom};
        // The photos' time term the answer's time is netted of: as the game logged it (sc i), else the terms served now.
        q.ti = sc && typeof sc.i === 'number' ? sc.i : ptimeQ(fs, tAt);
        // the units a species shown or given starts from (treeReplayGen from: its family), as the game does (abilityOf)
        if ((gen[t] || {}).from) q.from = gen[t].from;
        if (wrong && gen[c].from) q.cfrom = gen[c].from;
        // The domain-score bar's genus offsets: as the game logged them (sc m, n), else the replay's gd (o.gd).
        q.mu = sc && typeof sc.m === 'number' ? sc.m : gdv(t);
        q.muc = sc && typeof sc.n === 'number' ? sc.n : gdv(c);
        if (sc) Object.assign(q, {df: sc.o || 0, dt: sc.t || 0, S: sc.s || 1});
        if (sc) {
          // Logged by the scorer: what the game scored with, as it was then; the memory as logged unless the replay
          // leaves it out (memory: false, a what-if).
          Object.assign(q, {d0: sc.d, fam: memory ? sc.f || 0 : 0, cf: sc.c || 0, look: !!sc.l, R: sc.r === undefined ? 1 : sc.r});
          // The format's offset as logged (o): 0 for an answer scored without the offsets.
          Object.assign(q, {Rc: sc.g === undefined ? 1 : sc.g, hint: sc.h, df: sc.o || 0});
          // A smaller fault's kind as logged (z, Q394): the miss weighed by today's size of it (partOf).
          if (sc.z) q.z = sc.z;
        } else if (replayable) {
          // A row logged before the scorer: its difficulty recovered from the logged e (rounded to 0.01), its memory and
          // mix-ups term rebuilt with today's pooled stats, its look-alike test after the offers, as the game ran it.
          const fam = memFam(hs, mem),
            cf = confTermOf(pl.P, t, chs, k), // on the record before this answer (before the offers)
            qq = Math.min(0.995, Math.max(0.005, (e - 1 / k) / (1 - 1 / k))),
            dl = th - Math.log(qq / (1 - qq)), // the difficulty in the logged expectation
            // d: the photo's difficulty alone (quiz.js d0), without the memory and the mix-ups term the app logged in e.
            d = dl - (r[1] >= MEM_LOGGED ? fam : 0) - (r[1] >= CF_LOGGED ? cf : 0);
          // The format's offset from today's pooled fit (fmt), as its memory and mix-ups.
          const df = fmtOff(fmt, fmtOf(mode, chs.length));
          Object.assign(q, {d0: d, fam: memory ? fam : 0, cf, th, df, look: () => chs.some(x => lookOf(pl.P, t, x))});
        }
        const res = scoreAnswer(pl.P, q);
        if (replayable) {
          pl.used++;
          if (o.onAnswer) o.onAnswer(r, {d: q.d0, fam: q.fam, cf: q.cf, k, w: res.w, look: res.look});
        }
        pl.P[LEVEL].at = r[1];
        s.at = r[1];
        // The learned mark (not replayed: replayedOf takes it from the saved copy) is lost, in the game, at a miss that
        // leaves the progress below the keep rule (quiz.js answer, mxKept), on the genus shown as on the genus given: lm,
        // the time of the last such miss, takes away a mark passed before it; lx, the last miss, ends an exam in course.
        if (!ok) s.lx = r[1];
        if (!ok && !keepsMark(s, pl.P, t)) s.lm = r[1];
        if (ok && contrastQ(mode, chs.length)) s.du = 1;
        if (wrong) {
          const x = pl.P[c];
          x.lx = r[1];
          if (!keepsMark(x, pl.P, c)) x.lm = r[1];
        }
      });
    // vars (a subject's variant table, treeVarTable; Code.gs rplMake_): each unit's variant groups with no photo answered
    // right in the log (vl: varLeftOf at a full bar, a learned unit's), which take a learned mark away (replayedOf; rules
    // D8, D9). This device's answers replayed on top of the sheet's pass the same table (sync.js rpVars); without vars
    // (the corals; an app without its table yet), vl stays as it came.
    if (o.vars)
      Object.values(out).forEach(pl =>
        Object.keys(pl.P).forEach(g => {
          const x = pl.P[g];
          if (g === LEVEL || !isObj(x) || !own(o.vars, g)) return;
          const vl = varLeftOf(own(o.vars, g), 1, x.ps);
          if (vl.length) x.vl = vl;
          else delete x.vl;
        })
      );
    return out;
  }
  // An answer of the app's own log (quiz.js answer: {id, t, g, a, ok, m, ph, e, th, nw, ch, rt}) as a replay row for
  // player id: this device's answers the sheet has not confirmed yet, replayed on top of the sheet's replay (sync.js).
  // The seconds rt at index 12 and the scoring record sc at LOG_SC (22), as in the sheet's readAnswers rows (11, their
  // anonymous flag, and 13 to 21, enlarged to species shown, unused here: null).
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
    typeof a.rt === 'number' ? a.rt : null,
    ...new Array(LOG_SC - 13).fill(null),
    scoreRec(a.sc)
  ];
  // A player's progress as the app holds it after the replay (docs/LEARNING.md "Full replay", What the replay gives and
  // what the device keeps; rule D9). rep: replayProgress's player; saved: the player's reefid-sync-coral-progress (the
  // device's copy in the app, the sheet's in the admin). From the replay, every unit the log has replayable answers on
  // (pm 1, rv when given, vl its variant groups with no right answer in the log); from the saved copy, what the log
  // cannot give (the exam passed or in course, dropped as the game drops it: afterBkt, a later miss r.lm or r.lx; dd,
  // dl, ro, cor); a unit the log has no answer on keeps the saved record only if it counts no answer either; LEVEL, the
  // replayed ability with the larger answer count. The replay never decides the exam (mxKeeps, lm).
  const LEVEL_LOG = ['th', 'vr', 'lt', 'tyk', 'rt'];
  // vl (replayProgress vars): the unit's variant groups with no right answer in the log, kept on the record so the app's
  // exam asks them (model.js varLeft) even where the photos seen ps, merged with the saved copy below, hold a right answer
  // the log lacks (one played before the fish answers were logged): the log is the only reference (rule D9); quiz.js
  // answer clears a group at a right answer on it (model.js varRight).
  const REPLAYED = ['pg', 'dp', 'ds', 'ok', 'ko', 'ty', 'h', 'ps', 'off', 'conf', 'th', 'lt', 'vr', 'streak', 'vl'];
  function replayedOf(rep, saved, rv) {
    const S = isObj(saved) ? saved : {},
      R = (rep && rep.P) || {},
      out = {},
      n = x => ((x && x.ok) || 0) + ((x && x.ko) || 0),
      dup = x => JSON.parse(JSON.stringify(x)),
      kept = s => {
        const o = dup(s);
        if (!afterBkt(o)) {
          delete o.mx;
          delete o.ex;
        }
        return o;
      };
    new Set([...Object.keys(S), ...Object.keys(R)]).forEach(g => {
      const s = isObj(S[g]) ? S[g] : null,
        r = isObj(R[g]) ? R[g] : null;
      if (g === LEVEL) {
        // One rule for the level (rule D9): every field that feeds progress (the ability th, vr, lt, the typed
        // opportunities tyk, the answer times rt) is the log's, absent when the log has none; only the plain answer count
        // (ok, ko: the clock the checkpoints hang on) keeps the larger of the two.
        const o = s ? dup(s) : {};
        LEVEL_LOG.forEach(f => (r && r[f] !== undefined ? (o[f] = dup(r[f])) : delete o[f]));
        if (r) {
          if (!s || n(r) >= n(s)) [o.ok, o.ko] = [r.ok || 0, r.ko || 0];
          if (r.at) o.at = Math.max(r.at, Number(o.at) || 0);
          if (rv) o.rv = rv;
        }
        out[g] = o;
        return;
      }
      if (!r || !r.u) {
        // No answer of the log on it: the saved record only when it counts no answer either (rule D9).
        if (!r) return void (s && !n(s) && (out[g] = kept(s)));
        // No answer that moved the bar: the counts and recent results only (a former moving average if it has one).
        out[g] = {ok: r.ok || 0, ko: r.ko || 0, h: r.h || '', ...(rv ? {rv} : {})};
        if (domOn(r)) [out[g].dp, out[g].ds] = [dup(r.dp), r.ds];
        else if (typeof r.pg === 'number') out[g].pg = r.pg;
        // Its offers and mix-ups stay: the other genera's false-alarm rates read them (faOf).
        ['conf', 'off'].forEach(f => isObj(r[f]) && Object.keys(r[f]).length && (out[g][f] = dup(r[f])));
        if (r.ty) out[g].ty = r.ty;
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
        if (afterBkt(s) && s.mx) {
          // A variant group with no right answer in the log (r.vl, replayProgress vars): the mark goes, silently
          // (rule D6), its exam kept as passed but for that group, started at the later of the mark and the last miss so
          // a miss after it ends it (lx), ready at once (at 0: the app's EXAM.gap long past); the next exam question asks
          // the group (model.js examSet), a right answer makes it learned again.
          if (!(r.lm > s.mx))
            if (Array.isArray(r.vl) && r.vl.length)
              o.ex = {k: MX_EXAM.n, t: MX_EXAM.typed, v: [], ts: Math.max(Number(s.mx) || 0, Number(r.lx) || 0), at: 0};
            else o.mx = s.mx;
        } else if (afterBkt(s) && s.ex && !(r.lx > (s.ex.ts || s.at || 0))) o.ex = dup(s.ex);
      }
      out[g] = o;
    });
    return out;
  }
  // The merge baseline once a replay is adopted (sync.js replayAdopt, mergeProgress's B; docs/spec/sync.md "Full
  // replay", Adopting): the history every device of the account shares, never this device's own answers not in the
  // sheet yet, which stay the difference P - B. rec: the sheet's replay (replay.rec), M: the record adopted
  // (replayedOf), rv: its rules version, B: the baseline before. Per unit: adopted (M[g].rv is rv), replayedOf of rec
  // alone with its photos shown per photo the larger of rec's and B's; kept from this device's copy, B's record. The
  // level: the replay's, with B's answer count and times (rt) when larger; B's when the sheet sent none.
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
        if (!r) {
          // No level in the log: the shared clock (ok, ko) only, none of the log's fields (LEVEL_LOG), as replayedOf.
          if (!b) return;
          const o = dup(b);
          LEVEL_LOG.forEach(f => delete o[f]);
          return void (out[g] = o);
        }
        const o = dup(r);
        if (b && n(b) > n(r)) [o.ok, o.ko] = [b.ok || 0, b.ko || 0]; // the clock only (replayedOf, LEVEL_LOG)
        out[g] = o;
      } else if (r && M[g] && M[g].rv === rv) {
        const o = dup(r);
        Object.keys((b && b.ps) || {}).forEach(f => {
          const x = (o.ps = o.ps || {})[f] || [0, 0],
            y = b.ps[f];
          if (Array.isArray(y)) o.ps[f] = [Math.max(x[0], Number(y[0]) || 0), Math.max(x[1], Number(y[1]) || 0)];
        });
        out[g] = o;
      } else if (!r && b && n(b) > 0) {
        // A unit the log has no answer on whose shared copy counts answers: discarded by the adoption (rule D9), so no
        // baseline either; this device's unsent answers on it stay the difference and go on top.
      } else if (b) out[g] = dup(b);
    });
    return out;
  }
  const learnedOf = (P, list) => list.filter(n => (P || {})[n] && P[n].mx).length;
  // The progress a device holds once it adopts a replay (sync.js replayAdoptS), and so the one the leaderboard ranks a
  // player by once their saved copy is behind the rules (Code.gs board_; rule D8). R: the replay (with the device's own
  // answers on top, if any), P: the device's copy, rv: the replay's rules version: replayedOf of R over P. No floor: the
  // log is the only reference, a bar may go down (rule D9).
  function replayAdopted(R, P, rv) {
    return replayedOf({P: R}, isObj(P) ? P : {}, rv);
  }

