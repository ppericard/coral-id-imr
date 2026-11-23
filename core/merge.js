  // A player's saved data (the sheet's Data, Code.gs save), with the keys of the subjects after the first (fish:
  // reefid-sync-fish-*) that the saved copy holds and the incoming one lacks kept from the saved copy: an app from before
  // that subject saves its whole record without them, and replacing the record would erase that progress, which no
  // answer log can rebuild. saved, data: {key: value}; returns the data to save.
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
  // The maps whose values are single choices though objects: the content editor's entries ({v, was, src, t, by}, written
  // whole at each Save: contentSet), a node's under content nodes <id> and the pairs under content pairs. Merged key by
  // key, a hide on one device (v null, read as no change from a slot never edited) and a rewording on another would mix
  // into one entry; whole, they conflict and mine wins.
  const wholeAt = p =>
    (p.length >= 3 && p[p.length - 3] === 'content' && p[p.length - 2] === 'nodes') ||
    (p.length >= 2 && p[p.length - 2] === 'content' && p[p.length - 1] === 'pairs');
  function merge3(base, mine, theirs, conf, path = []) {
    const b = isObj(base) ? base : {},
      m = isObj(mine) ? mine : {},
      t = isObj(theirs) ? theirs : {},
      whole = wholeAt(path),
      out = {};
    new Set([...Object.keys(b), ...Object.keys(m), ...Object.keys(t)]).forEach(k => {
      const both = isObj(m[k]) && isObj(t[k]) && !whole;
      if (conf && !both && !eq(m[k], b[k]) && !eq(t[k], b[k]) && !eq(m[k], t[k])) conf.push([...path, k]);
      const v = eq(m[k], b[k]) ? t[k] : eq(t[k], b[k]) ? m[k] : both ? merge3(b[k], m[k], t[k], conf, [...path, k]) : m[k];
      // A copy, never a shared object: setQ & co. edit DRAFT's maps in place, and a map shared with SAVED would change
      // both, hiding the edit from Publish.
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

  // Two admin tabs in one browser: each keeps its draft in memory and writes all of it to localStorage on every click, so
  // without a merge the last tab clicked would erase the other tab's clicks. When another tab writes its draft, this tab
  // merges it onto its own: shared = the draft both tabs last agreed on (what this tab last wrote or took),
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
      // Typed questions (ty, faOf): added up like the counts.
      const ty = Math.max(0, (r.ty || 0) + (l.ty || 0) - (b.ty || 0));
      if (ty) out.ty = ty;
      else delete out.ty;
      // A record recalculated here for the photo memory (pm, memRecalc) with no answer of its own counts as this device's
      // model only while the other side has not moved since B: answers saved from another device win over a mere
      // recalculation (an old copy reopened must not undo a passed exam), and the recalculation is applied to them after
      // the merge (model.js memRecalcAll).
      // The same for a record this device adopted from the sheet's full replay (rv, the rules version: sync.js
      // replayAdopt): it replaces the copy of the same answers, unless the other side has answered since.
      const moved = x => (x.ok || 0) + (x.ko || 0) !== (b.ok || 0) + (b.ko || 0) || (x.h || '') !== (b.h || ''),
        mine = moved(l) || (((l.pm || 0) !== (b.pm || 0) || (l.rv || 0) !== (b.rv || 0)) && !moved(r));
      out.streak = mine ? l.streak || 0 : r.streak || 0;
      if (mine && l.h) out.h = l.h;
      if (mine)
        // vr: the Elo step's volatility (app.js abilityStep), part of the model the device that played updated; lt: the
        // global level at the genus's last own step (levelMove), which goes with its th.
        // dp, ds: the domain-score bar's posterior and bar (domStep), the model of that device's answers like pg.
        // vl: the variant groups the log left (replayedOf), cleared by that device's right answers (model.js varRight).
        ['lv', 'run', 'L', 'pg', 'dp', 'ds', 'pm', 'rv', 'th', 'lt', 'vr', 'ro', 'ex', 'mx', 'vl'].forEach(k => {
          if (l[k] !== undefined) out[k] = l[k];
          else delete out[k];
        });
      // The variant groups left (vl), less every group either device has cleared since B: one B has,
      // missing from a side that holds the same replay (its rv, B's), which only a right answer there takes away (model.js
      // varRight). A group stays left only while neither device has answered it right, as the log will say.
      const cleared = x =>
          Array.isArray(b.vl) && (x.rv || 0) === (b.rv || 0) ? b.vl.filter(g => !(Array.isArray(x.vl) ? x.vl : []).includes(g)) : [],
        cut = [...cleared(l), ...cleared(r)];
      if (Array.isArray(out.vl) && cut.length) {
        out.vl = out.vl.filter(g => !cut.includes(g));
        if (!out.vl.length) delete out.vl;
      }
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
      ['conf', 'off', 'rt', 'tyk'].forEach(f => {
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

  // Two accounts of one person merged in the admin (user management): A = the name that goes away, B = the
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
      // The subject's first-launch record: the union of both accounts' histories (startUnion), so the
      // replay after the merge applies each account's answers' priors at their times.
      const sk = startKey(S.id),
        sa = J(A, sk),
        sb = J(B, sk);
      if (sa || sb) out[sk] = JSON.stringify(startUnion(sa, sb));
      const pk = subjKey(S.id, 'progress'),
        qk = subjKey(S.id, 'quiz');
      if (!i || pk in A || pk in B) out[pk] = JSON.stringify(mergeUserP(J(A, pk) || {}, J(B, pk) || {}));
      // The surprise cards met on either account: met once, never shown again.
      const wk = subjKey(S.id, 'wink'),
        wa = J(A, wk),
        wb = J(B, wk);
      if (wa || wb) out[wk] = JSON.stringify(winkUnion(wa, wb));
      const qa = J(A, qk),
        qb = J(B, qk);
      if (qa || qb) {
        const q = {...(qa || {}), ...(qb || {}), bu: Math.max((qa || {}).bu || 0, (qb || {}).bu || 0)};
        S.optin.forEach(k => {
          if ((qa || {})[k] || (qb || {})[k]) q[k] = true;
          // A What I learn row turned off (k + 'O') stays off only where both accounts have it off (or only one played the
          // subject): on either stays on, a row on by default included.
          if (q[k] || (qa && qb && !(qa[k + 'O'] && qb[k + 'O']))) delete q[k + 'O'];
          // An offer declined on either account is not made more often for the merge: the larger "Not now" count.
          const n = Math.max((qa || {})[k + 'N'] || 0, (qb || {})[k + 'N'] || 0);
          if (n) q[k + 'N'] = n;
        });
        out[qk] = JSON.stringify(q);
      }
      // The rules version the progress was replayed with (sync.js RVK): the merged record is no replay of the two logs
      // together, so it has none, and every device of the account asks for the replay of both histories in time order
      // (the sheet relabels the answers; a merged model of 20 older right answers and 10 newer misses would keep pg 0.96
      // for good). Nor the structure stamp it was replayed with (sync.js stKey), for the same reason.
      delete out[subjKey(S.id, 'rv')];
      delete out[subjKey(S.id, 'st')];
    });
    // The one-time notices told on either account (TOLD): told once, never shown again for the merge.
    const ta = J(A, TOLD.KEY),
      tb = J(B, TOLD.KEY);
    if (ta || tb) out[TOLD.KEY] = JSON.stringify(toldUnion(ta, tb));
    return out;
  }
  // The one-time notices a player has seen, on any device of the account (so a device holding an old copy of the account
  // never shows again what another device showed): a list of tokens, one per
  // notice seen (progress.js: 'recalc:<note id>' an update note, 'rv:<version>' a rules version's card, 'mx:<unit>@<time>'
  // a learned mark taken away, 'sorry' the apology, 'hello:<subject>-<mode>' a subject's card, 'board' the leaderboard
  // note). It travels with the progress (KEYS.SYNC) and merges as the union (sync.js mergeSaved, signIn; mergeUsers), so
  // a notice told on one device is never told again on another. Anything but a short string is dropped; sorted.
  const TOLD = {KEY: KEYS.SYNC + 'told', MAX: 120};
  function toldUnion(a, b) {
    const out = new Set();
    [a, b].forEach(L => Array.isArray(L) && L.forEach(t => typeof t === 'string' && t && t.length <= TOLD.MAX && out.add(t)));
    return [...out].sort();
  }
  // The surprise cards (winks) two records have met (quiz.js winkMerge at a sync, mergeUsers for two accounts): {wink id:
  // answer count when shown}, the union, the earlier count kept; anything else in either is ignored (each surprise once
  // per player).
  function winkUnion(a, b) {
    const out = {};
    [a, b].forEach(r => {
      if (!r || typeof r !== 'object' || Array.isArray(r)) return;
      Object.keys(r).forEach(n => {
        const v = Math.max(0, Number(r[n]) || 0);
        if (!(n in out) || v < out[n]) out[n] = v;
      });
    });
    return out;
  }
  // A part of the slate opened by choice (app.js UNITS opens: fish circle 3; docs/FISH_PATH.md): a "no" keeps its units
  // closed, and the player can still open them later. From the subject's quiz settings q and the part's key k. o: met
  // (one of its units already opened on a card), due (its
  // threshold reached), left (a unit of it not open yet), at (the answer clock, model.js tally). on: the player said yes, or was
  // never asked and has one of its units open (it opened by itself before the choice existed: kept on). row: My progress
  // offers to open it. ask: its card is due: never answered, or once more OPEN_AGAIN answers after a first "Not now"
  // (a "no" seen without its count counts as one), then never.
  const OPEN_AGAIN = 200;
  function openState(q, k, o = {}) {
    q = q || {};
    const v = q[k],
      on = v === true || (v === undefined && !!o.met),
      row = !on && !!o.due && !!o.left,
      ask = row && (v === undefined || (v === false && (q[k + 'N'] || 1) < 2 && (o.at || 0) >= (q[k + 'A'] || 0) + OPEN_AGAIN));
    return {on, row, ask};
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
      // The progress comes from the same account as the rest of the model (a record with no pg gets it recomputed, never
      // the other account's): its domain-score bar (dp, ds) when it has one, the other account's never mixed in; else its
      // moving average.
      if (domOn(main)) {
        [o.dp, o.ds] = [main.dp.slice(), main.ds];
        delete o.pg;
      } else {
        delete o.dp;
        delete o.ds;
        if (typeof main.pg === 'number' || main.h || typeof main.L === 'number') o.pg = pgOf(main);
      }
      // The photo memory mark goes with that progress (memRecalc): the other account's would leave it uncorrected.
      if (main.pm) o.pm = main.pm;
      else delete o.pm;
      // The level a genus's ability was last stepped against (lt, model.js levelRise) is the old account's: the merged
      // account's level is another, so the level's rise counts again from the genus's next own answer.
      delete o.lt;
      o.ok = (x.ok || 0) + (y.ok || 0);
      o.ko = (x.ko || 0) + (y.ko || 0);
      if ((x.ty || 0) + (y.ty || 0))
        o.ty = (x.ty || 0) + (y.ty || 0); // typed questions on the unit (faOf), the same person's
      else delete o.ty;
      o.streak = main.streak || 0;
      // Answer times (rt, the global level's) add up like the mix-ups: the same person's.
      ['conf', 'off', 'rt', 'tyk'].forEach(f => {
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

