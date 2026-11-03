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
      // A record recalculated here for the photo memory (pm, memRecalc) with no answer of its own counts as this device's
      // model only while the other side has not moved since B: answers saved from another device win over a mere
      // recalculation (Codex review #387: an old copy reopened must not undo a passed exam), and the recalculation is
      // applied to them after the merge (model.js memRecalcAll).
      const moved = x => (x.ok || 0) + (x.ko || 0) !== (b.ok || 0) + (b.ko || 0) || (x.h || '') !== (b.h || ''),
        mine = moved(l) || ((l.pm || 0) !== (b.pm || 0) && !moved(r));
      out.streak = mine ? l.streak || 0 : r.streak || 0;
      if (mine && l.h) out.h = l.h;
      if (mine)
        // vr: the Elo step's volatility (app.js abilityStep), part of the model the device that played updated.
        ['lv', 'run', 'L', 'pg', 'pm', 'th', 'vr', 'ro', 'ex', 'mx'].forEach(k => {
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
  // B's; bonus genera unlocked or on (bon) on either stay so. Returns B's data with the merged progress.
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
      // The progress comes from the same account as the rest of the model, recomputed if it was saved before s.pg
      // (Codex review #367: an old main record let the other account's pg through).
      if (typeof main.pg === 'number' || main.h || typeof main.L === 'number') o.pg = pgOf(main);
      // The photo memory mark goes with that progress (memRecalc): the other account's would leave it uncorrected.
      if (main.pm) o.pm = main.pm;
      else delete o.pm;
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
    if (qa || qb) {
      const q = {...(qa || {}), ...(qb || {}), bu: Math.max((qa || {}).bu || 0, (qb || {}).bu || 0)};
      if ((qa || {}).bon || (qb || {}).bon) q.bon = true;
      out['imr-coral-quiz'] = JSON.stringify(q);
    }
    return out;
  }

  // Who rates the photos and the confusions, as tools/sync/Code.gs trusted_ (v17; v18: devices that never signed in too,
  // under the same rule, Pierre 2026-11-02): players with TRUST.N answers or more and a right rate clearly above chance (one-sided z of at least TRUST.Z against each question's guess rate).
  const TRUST = {N: 10, Z: 1.645}; // answers per player, not per photo
  // As Code.gs guess_ (v20): without |kN, a photo-quiz question with 2 or 3 genera in its choices (readAnswers row
  // index 10) is rated with 1 / choices ("Again: A or B?", logged plain "quiz" until 2026-11-02).
  const guessOf = (mode, choices) => {
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
  // Photo Elo replayed over the answer log (rows [id, time ms, genus shown, answered, right 0|1, mode, photos…]), as
  // tools/sync/Code.gs stats_ does in the sheet: keep the two in step (tests/core.test.js compares them). Every answer
  // moves the player's level; the photos and the memory offsets move on trusted players' answers only (trustOf, v17),
  // weighed as above. All against the same expectation, photo memory included (until v25 the level ignored memory
  // and the photos used the fixed rule, so the two pulled apart).
  // Returns the photo ratings P, the player levels R ([level, answers, information]), the memory offsets mem (rounded
  // as served) and memn, the trusted answers behind each bucket (a question with several photos shares its answer
  // between their buckets).
  function eloReplay(rows) {
    const P = {},
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
        const ph = fs.map(f => (P[f] = P[f] || [0, 0, 0, 0])),
          b = ph.reduce((t, p) => t + p[0], 0) / ph.length + (ph.length === 1 ? 0.5 : 0);
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
    return {P, R, mem: mem.map(x => Math.round(x * 100) / 100), memn: N.map(x => Math.round(x * 10) / 10)};
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
  // (and any exam in course) is dropped, silently, at every call (load, pull, answer: a copy from another device that
  // still has it loses it too); the genus keeps its bar from its record (pgOf, s.h) and takes the exam again. An exam
  // passed since (s.pg kept beside s.mx) is left alone. The achievements it earned stay.
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
  function eloOf(rows) {
    const {P} = eloReplay(rows);
    const out = {};
    Object.keys(P).forEach(
      f => (out[f] = [Math.round(P[f][0] * 100) / 100, Math.round(P[f][2] * 10) / 10, Math.round(P[f][1] * 10) / 10, P[f][3]])
    );
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
  // Medium (every other good photo), Hard (the poor ones), levels adding up: since 2026-11-02 (Pierre: new photos must
  // come into the games, the players' answers rate them) games take every photo kept, IMR/own first; they were capped
  // at 4 Medium and 4 Hard, other observers' photos only filling a short set, so newly validated candidates stayed out; Coral
  // Finder (needs variety) = featured + 2 photos from other iNat observers + 3 approved book photos. Pierre's picks (feat, hide, quality, use) always win; Claude's suggestions
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
        const easy = feat.filter(p => gm.includes(p)),
          left = p => !easy.includes(p);
        const medium = [...core, ...rest].filter(p => left(p) && q(p) >= 2);
        const hard = [...core, ...rest].filter(p => left(p) && !medium.includes(p));
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
      R = JSON.parse((data && data['imr-coral-progress']) || '{}');
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
  // Learning milestones only, never time or days played (the learning model's rule). Each has a family, a tier
  // (1 bronze, 2 silver, 3 gold) and a test on a snapshot the app builds (app.js achSnap):
  //   {total, met, q: [genera at Open Water (>= 50%), Advanced (>= 80%), Divemaster (>= 95%) or above; model.js MASTERY,
  //   2026-11-03, were the quarters 25/50/75% before], learned (Instructor), pct, streak (best run of right answers), duel, cor,
  //    hard, elo (0 until 200 answers, app.js ELO_MIN: it moves a lot before), group (an IMR lecture group fully learned), bonus (bonus genera met)}.
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
    ['run10', 'On a roll', '10 right in a row: your eye is getting sharp', 1, '🔥', s => s.streak >= 10],
    ['run25', 'Unstoppable', '25 right in a row: a sharp eye', 2, '🔥', s => s.streak >= 25],
    ['duel', 'Look-alike slayer', 'You told two look-alikes apart', 1, '⚔️', s => s.duel],
    ['cor', 'Corallite reader', 'You named a genus from its corallites alone', 1, '🔬', s => s.cor],
    ['hard', 'Sharp eye', 'You named a photo most players miss', 2, '🎯', s => s.hard],
    ['elo1100', 'Elo 1100', 'Reached an Elo of 1100', 1, '⭐', s => s.elo >= 1100],
    ['elo1200', 'Elo 1200', 'Reached an Elo of 1200', 2, '⭐', s => s.elo >= 1200],
    ['elo1300', 'Elo 1300', 'Reached an Elo of 1300', 3, '⭐', s => s.elo >= 1300],
    ['elo1400', 'Elo 1400', 'Reached an Elo of 1400', 3, '🌟', s => s.elo >= 1400],
    ['group', 'Group complete', 'You know a whole IMR lecture group', 3, '🧩', s => s.group],
    ['bonus', 'Off the list', 'You met a bonus genus, off the IMR list', 2, '🔓', s => s.bonus >= 1]
  ].map(([id, title, desc, tier, icon, test]) => ({id, title, desc, tier, icon, test}));
  // The achievements a snapshot meets that `have` ({id: time}) does not hold yet, in list order.
  const newAch = (snap, have) => ACH.filter(a => !(have || {})[a.id] && a.test(snap)).map(a => a.id);

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
  const pgStep = (g, good, w) => Math.round((g + PROG.A * w * ((good ? 1 : 0) - g)) * 1e4) / 1e4;
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
    return 0.95 * Math.min(1, g / PROG.M) + (g >= PROG.M && s.ex ? (0.05 * (s.ex.k || 0)) / 5 : 0);
  }
  // Progress % of a saved progress P over a list of genera, as the app shows it (genScore / progPct). The sync sheet
  // computes the leaderboard % with a copy (Code.gs pctOf_, v16; s.pg from v22): keep the two in step
  // (tests/sync.test.js compares them; tests/draw.smoke.js compares this with the app's progPct).
  function pctOf(P, list) {
    return list && list.length ? Math.round((100 * list.reduce((t, n) => t + scoreOf((P || {})[n]), 0)) / list.length) : 0;
  }

  // What one answer proves, the weights of pgStep (docs/LEARNING.md "Progress (moving average) and mastery"), shared by
  // the app (model.js pgWeight, quiz.js answer) and the full replay below, so both run the same rules.
  // TARGET_OFF: the game aims its photos this far below the player's ability on the genus (about 80% right with 4
  // choices; model.js PICKD.TARGET_OFF).
  const TARGET_OFF = 1.0;
  const sigm = x => 1 / (1 + Math.exp(-x));
  // A right answer, w from 0 to 1: the plausible choices k ((1 − 1/k) / (1 − 1/4): 4 weigh 1, 3 0.89, 2 0.67), in full
  // when a genus it gets confused with is among the choices (look), PROG.LOOK when none is. model.js pgWeight finds look.
  const pgRightW = (k, look) => Math.min(1, Math.max(0, (1 - 1 / k) / (1 - 1 / 4))) * (look ? 1 : PROG.LOOK);
  // What a miss proves (Pierre, 2026-11-02: "a miss on a very hard photo doesn't necessarily mean the genus is badly
  // known"; a miss must not cost more than it proves): the Elo chance the player had to get it right (ability th against
  // the photo's difficulty d, k choices, as abilityStep), over the chance the game aims for (a photo TARGET_OFF below the
  // ability, about 80% with 4 choices). A photo at the player's level or easier: the miss counts in full; a harder one:
  // less (1 unit harder: 0.78; 2 units: 0.56). No new constant: the Elo and the photo targeting set it. The right answers
  // keep their weight (pgRightW): simulated, a photo factor on them only slowed everyone.
  // R: the recall expected after a break, for a comeback question (model.js comebackOf; 1 otherwise): the chance the
  // player had is then the recall-adjusted one, so a miss the rust explains costs less progress (Pierre, 2026-11-02).
  function pgMissW(th, d, k, R = 1) {
    const e = (x, r = 1) => 1 / k + (1 - 1 / k) * r * sigm(x);
    return Math.min(1, e(th - d, R) / e(TARGET_OFF));
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
  // Number of choices as the app scored an answer, from its log row: |kN in the mode (the plausible choices, logged when
  // fewer than the buttons), a duel 2, else the genera offered (2-3), else 4.
  const kOf = (mode, choices) => {
    const kq = /\|k(\d)/.exec(String(mode || ''));
    if (kq) return Number(kq[1]);
    if (/duel|\|d(\||$)/.test(String(mode || ''))) return 2;
    const n = String(choices || '')
      .split(/\s+/)
      .filter(Boolean).length;
    return n >= 2 && n < 4 ? n : 4;
  };

  // Full replay (Pierre, 2026-11-03: "why recalculate on the phones when the phone doesn't have the full log? Recalculate
  // from all the results"): every player's progress rebuilt from the sheet's answer log, in time order, with today's rules
  // (the weights above, pgStep, the photo memory), as if every answer had been played under them. The reference
  // recalculation: the device's own (memRecalc from s.ps, pgOf from the last 10 results s.h) only approximate it from
  // what a device keeps. docs/LEARNING.md "Full replay".
  // rows: the admin's answer log (sheet readAnswers: [anonymous id, time ms, genus shown, answered, right 0|1, mode,
  // photos, expected e, ability th, new photos, choices, ...]). o: gen (data.json genera, Millepora and the bonus genera
  // included: look-alikes `look`, family `fam`), mem (photo memory offsets, ?stats=1 mem; the prior without), conf (the
  // pooled pairs, ?stats=1 conf, as the app's PCONF), since ({id: time ms}: only the answers after a progress reset),
  // memory (false: the rule before the photo memory, tools/memreplay.js), onAnswer(row, {d, fam, k, w, look}).
  // Returns {id: {P: {genus: {pg, ok, ko, h, ps, off, conf, u}}, n, used, rep}}: per genus the moving average pg (what the
  // app keeps as s.pg), right / wrong answers, the last 10 results, the photos [shown, right], the choices offered beside
  // it and the genera given instead (the app's s.off, s.conf), u = answers that moved pg; per player the rows read (n),
  // replayed (used: with e and th) and on a photo already shown (rep).
  // Each question's difficulty d (photo difficulty, + 0.5 for a photo shown alone) is recovered from what the app logged
  // then: e = 1/k + (1 - 1/k) sig(th - d), th the player's ability on the genus at that moment. Since the photo memory
  // (MEM_LOGGED) the logged e includes the memory of the photos (fam), taken out again here with the replay's own fam.
  // Approximations, explicit: the ability th and the photos are those the app logged (the game would have drawn others
  // under other rules); a comeback question's recall is taken as 1 (its e logged with it reads as a harder photo); the
  // look-alike test is the app's (declared look-alikes or confusions over CONF.TRAP, pooled and the player's own) with a
  // prior from the look-alikes and the family only (the app also gives CONF.FORM to genera sharing an IMR growth form);
  // a miss on the genus wrongly given weighs the chance the player had on the genus shown (its own ability is not
  // logged); every photo of a right answer counts as recognised (the app does not count a corallites photo answered
  // without opening it, which the log leaves out anyway). Answers logged without e and th (before sheet v5) count in
  // ok/ko/h only. The mastery exam is not replayed: replayedOf takes it from the saved copy.
  const MEM_LOGGED = Date.UTC(2026, 10, 3, 4, 46); // PR #387 merged: the app's logged e includes the photo memory
  function replayProgress(rows, o = {}) {
    const gen = o.gen || {},
      mem = memOf(o.mem),
      conf = o.conf || {},
      since = o.since || {},
      memory = o.memory !== false,
      out = {};
    const prior = (t, n) => {
      const a = gen[t] || {},
        b = gen[n] || {};
      return (a.look || []).includes(n) || (b.look || []).includes(t) ? CONF.LOOK : a.fam && a.fam === b.fam ? CONF.FAM : CONF.BASE;
    };
    // model.js pgWeight: a genus among the choices that the player gets confused with (pooled, then their own record).
    const lookOf = (P, t, n) => {
      if (n === t || !gen[n]) return false;
      const pooled = confScore(conf[t < n ? t + '|' + n : n + '|' + t], prior(t, n));
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
          rec = g => (pl.P[g] = pl.P[g] || {pg: 0, ok: 0, ko: 0, h: '', ps: {}, u: 0}),
          t = String(r[2]),
          c = String(r[3] || ''),
          ok = !!r[4],
          fs = split(r[6]),
          e = r[7],
          th = r[8],
          chs = split(r[10]),
          k = kOf(r[5], r[10]),
          s = rec(t),
          hs = fs.map(f => s.ps[f]);
        pl.n++;
        if (hs.some(h => h && h[0])) pl.rep++;
        // The choices offered and the genus given instead, before the weight (as quiz.js answer counts them).
        chs.forEach(x => x !== t && ((s.off = s.off || {})[x] = (s.off[x] || 0) + 1));
        s[ok ? 'ok' : 'ko']++;
        if (!ok && c) (s.conf = s.conf || {})[c] = (s.conf[c] || 0) + 1;
        if (typeof e === 'number' && typeof th === 'number' && fs.length && k > 1) {
          pl.used++;
          const fam = memFam(hs, mem),
            q = Math.min(0.995, Math.max(0.005, (e - 1 / k) / (1 - 1 / k))),
            dl = th - Math.log(q / (1 - q)), // the difficulty in the logged expectation
            d = r[1] >= MEM_LOGGED ? dl - fam : dl,
            fm = memory ? fam : 0,
            look = chs.some(x => lookOf(pl.P, t, x)),
            w = ok ? pgRightW(k, look) * pgMemW(th, d, fm, k) : pgMissW(th, d + fm, k);
          s.pg = pgStep(s.pg, ok, w);
          s.u++;
          // Pierre's rule: a wrong answer counts against the genus given too (without the photo memory: it is of the
          // genus shown). Its own ability is not logged: the chance on the genus shown stands for it.
          if (!ok && c && c !== t && gen[c]) {
            const x = rec(c);
            x.pg = pgStep(x.pg, false, pgMissW(th, d, k));
            x.u++;
          }
          if (o.onAnswer) o.onAnswer(r, {d, fam: fm, k, w, look});
        }
        if (!ok && c && c !== t && gen[c]) rec(c).h = (rec(c).h + '0').slice(-10);
        s.h = (s.h + (ok ? 1 : 0)).slice(-10);
        fs.forEach(f => {
          const x = (s.ps[f] = s.ps[f] || [0, 0]);
          x[0]++;
          if (ok) x[1]++;
        });
      });
    return out;
  }
  // A player's progress as the app would hold it after the replay: per genus, the replayed s.pg (the saved copy's own,
  // read as the app reads it, pgOf, for a genus the log has no replayable answer on), and from the saved copy what the log
  // cannot give: the mastery exam passed (s.mx) and the one in course (s.ex). Not for an exam passed under the former
  // model (a record without s.pg, before 2026-11-02; memRecalc drops it, commit of 2026-11-03): its genus takes the exam
  // again. The replay does not decide the exam; a genus learned keeps it here even if its replayed bar is lower (the app
  // only takes it away at a miss, model.js mxKept). saved: the player's imr-coral-progress; rep: replayProgress's player.
  function replayedOf(rep, saved) {
    const S = saved && typeof saved === 'object' ? saved : {},
      R = (rep && rep.P) || {},
      out = {};
    new Set([...Object.keys(S), ...Object.keys(R)]).forEach(g => {
      if (g === LEVEL) return;
      const s = S[g] && typeof S[g] === 'object' ? S[g] : null,
        r = R[g],
        cur = !!s && typeof s.pg === 'number',
        o = {
          pg: r && r.u ? r.pg : pgOf(s),
          ok: r ? r.ok : (s && s.ok) || 0,
          ko: r ? r.ko : (s && s.ko) || 0,
          h: r ? r.h : (s && s.h) || ''
        };
      if (cur && s.mx) o.mx = s.mx;
      else if (cur && s.ex) o.ex = s.ex;
      out[g] = o;
    });
    return out;
  }
  const learnedOf = (P, list) => list.filter(n => (P || {})[n] && P[n].mx).length;

  const CORE = {
    PROG,
    pgStep,
    pgOf,
    scoreOf,
    pctOf,
    TARGET_OFF,
    pgRightW,
    pgMissW,
    pgMemW,
    kOf,
    MEM_LOGGED,
    replayProgress,
    replayedOf,
    learnedOf,
    ACH,
    newAch,
    LEVEL,
    START,
    playerStart,
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
    levelMargin,
    playSplit,
    trustOf,
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
    pairConf,
    mergeUsers
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = CORE;
  else Object.assign(root, CORE);
})(this);
