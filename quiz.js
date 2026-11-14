// IMR Reef ID: the quiz screens, split out of app.js (2026-11-02, code review L1: one file per part, one piece at a
// time). A question on screen (question, the session trail, the hint), the stage fitted to the screen (fitStage,
// fitTiles, fitLow), the answer and its feedback (answer), the one-tap question (pulse), the bonus genera offer,
// the next question planned and preloaded while the feedback is read (planNext, NEXTQ), the photo quiz (quizPhoto) and
// the look-alike duels (quizDuel). The rules that choose genus, photos and wrong choices are in model.js. A classic
// script like app.js, loaded right after model.js (index.html, in order); app.js waits for every script (window.BOOT)
// before its first page. Required like app.js.
function quizNav() {
  return '';
}
// Session trail (Pierre, 2026-11-01, instead of a "3/3 right" text): the last 10 answers of this visit as 10 small cells next
// to the question, grey until answered, then a full green cell for right and a low red bar for wrong (shape and colour, so
// it reads without colour too). Fixed width: filling it never moves anything. Not saved: My progress holds the real record.
function trail() {
  const h = session.h,
    ok = h.filter(Boolean).length;
  return `<span class="trail" role="img" aria-label="${h.length ? `Last ${h.length} answers: ${ok} right, ${h.length - ok} wrong` : 'Your last 10 answers will show here'}" title="Your last 10 answers">${Array.from(
    {length: 10},
    (_, i) => {
      const v = h[i];
      return `<i${v === undefined ? '' : v ? ' class="r"' : ' class="w"'}></i>`;
    }
  ).join('')}</span>`;
}
function bindQuizNav() {
  bindGo();
}
// The game rules (behind the ? button).
const gameHelp = cur =>
  UNITS[SUBJ.id].help
    ? UNITS[SUBJ.id].help(cur)
    : `<p class="lede">${cur.startsWith('quiz-duel') ? 'Two genera that are often confused (look-alikes listed by the IMR lecture or the Coral Finder book, and your own mix-ups): say which one is in the photos.' : 'Name the genus in the photos: all the photos of a question show the same coral, at one or several zoom levels.'}
  Pick an answer (or press 1-${cur.startsWith('quiz-duel') ? 2 : 4}). Stuck? When a question has no corallite photo in view, <b>Show the corallites</b> adds one. After answering you get the IMR ID tips and why the other ${cur.startsWith('quiz-duel') ? 'genus is' : 'choices are'} wrong; <b>Next</b> (or Enter) goes on.${cur.startsWith('quiz-duel') ? ' The achievements for runs of right answers (On a roll, Unstoppable) and Sharp eye are earned in the Quiz only: an answer here neither extends nor breaks your run.' : ' The other choices start easy and its look-alikes come in as you get a genus right.'} Every answer counts in <a href="${esc(hr('progress'))}">My progress</a>. New genera come one at a time, each on its card; <b>Open all genera</b> (My progress) opens them all at once, and if the questions then get much harder for you, a card offers once to go back to one at a time. Once you have met every genus of the slate, you can add <b>bonus genera</b>: corals off the IMR list that are common at Dauin (⚙ Settings, Bonus genera).</p>
  ${cur === CUSTOM_H ? `<p class="lede"><b>Custom quiz</b>: only the genera you picked are asked (the Custom quiz tab changes them), and the wrong choices come from them too, from other genera only when you picked fewer than 4. A genus you have not met yet comes with its card. The rest works as in the Quiz, and every answer counts the same, except the mastery exam: its questions only come in the Quiz, so a genus that reaches ${Math.round(100 * DOM.EX)}% here takes its exam there. The achievements for runs of right answers (On a roll, Unstoppable) and Sharp eye are earned in the Quiz only: an answer here neither extends nor breaks your run.</p>` : ''}
  <p class="lede"><b>Photos</b>: each genus starts with its best photos, preferably a colony photographed at several zoom levels (never views of different colonies mixed), and new ones keep coming in; the more you get a genus right, the harder its photos get and the more often a single view is shown alone (colony, close-up or corallites), and a mistake eases them off. A genus's % is the share of its photos you would name alone and typed, as far as your answers on it have shown: a right answer on a hard photo or a typed one raises it most, a mistake takes it back down; it fills up to 95%, and it is learned (100%) once you pass its mastery exam, ${EXAM.n} hard questions slipped unannounced into the Quiz: see ? on <a href="${esc(hr('progress'))}">My progress</a>.</p>${
    cur.startsWith('quiz-duel')
      ? ''
      : `
  <p class="lede"><b>Typed questions</b>: once you know a genus well (from ${Math.round(100 * TYPED.from)}%), some of its questions ask you to type its name instead of picking it, more and more as it gets closer to learned: that is how you will name corals on a dive or in ReefCloud. Old names are accepted, and a small typo still counts as right, but you retype the name once to learn its spelling; <b>I don't know</b> shows the answer (it counts as a miss). A typed right answer counts in full, as much as a pick against its look-alikes: there is nothing to guess from.</p>`
  }`;
let EXAMQ = null; // the genus whose exam question is on screen (set by question, read by answer)
// The question on screen, for Send feedback (app.js helpEnd; Pierre, 2026-11-08, Q309: feedback sent from a game carries
// the question's unit and its photos, as a report does): {g, ph, el}, read only while its question is on screen; ph grows
// with the corallites hint and the other views revealed once answered (the mix-up comparison's photo is another unit's).
let QREP = null;
const qNow = () => (QREP && QREP.el && QREP.el.isConnected ? {g: QREP.g, ph: QREP.ph} : null);
// Typed questions (model.js TYPED; Pierre, 2026-11-03): the player types the genus instead of picking one of the
// choices. The matching is core.js's (typeMatchIn: spelling tolerance, old names); the form, its messages and the
// phone keyboard's behaviour are the Lab prototype's, shared with it (proto/type.js): no suggestions while typing,
// autocorrect and capitals off, "I don't know" (a miss), a word that is no genus asks to check the spelling.
// TYPEDQ: the typed question on screen and what was typed ({t: genus asked, m: the match or null, text}), read by answer.
let TYPEDQ = null,
  TYPEN = null;
const TYPEDQ_RJ = 10; // the refused texts a typed answer logs at most (typeBind rj)
// Every name a player may type: every genus the app knows (the slate's and the extra ones) and their old names.
// For fish, every teaching entry and the other names it goes by (core.js fishTypeNames), read as whole names.
const typeNames = () => {
  // read again when the data, the subject or Pierre's curation (its names: curation.json fish.names) changes
  const c = typeof CUR === 'undefined' ? null : CUR;
  if (!TYPEN || TYPEN.d !== DATA || TYPEN.s !== SUBJ || TYPEN.c !== c) TYPEN = {d: DATA, s: SUBJ, c, L: UNITS[SUBJ.id].names()};
  return TYPEN.L;
};
// rk: the rank of the unit asked (app.js rankOf): a typed answer is read among the names of that rank only (a fish
// scientific genus, Chromis, against the genera; the IMR sub-entry Chromis names the Damselfish entry on an entry question).
const typeMatch = (text, rk = '') =>
  typeMatchIn(
    typeNames().filter(o => rankOf(o.g) === rk),
    text,
    UNITS[SUBJ.id].norm
  );
// What a typed text that is no unit of rank rk names instead (core.js typeElse): the rank word of another unit it names
// ('family'), 'common' for a common name, '' for nothing. Only on a question below the subject's rank (a fish scientific
// genus), from the subject's own lists (UNITS typeOther); none for a subject without them.
const typeKind = (text, rk) => {
  const U = UNITS[SUBJ.id],
    x = rk && U.typeOther ? U.typeOther(rk) : null;
  if (!x) return '';
  return typeElse(
    text,
    typeNames().filter(o => rankOf(o.g) !== rk),
    {...x, rank: g => rankOf(g) || SUBJ.rank, own: g => (GX(g) || {}).imrName},
    U.norm
  );
};
// The nudge for a text typeKind reads (Pierre, 2026-11-08, Q237): it says what kind of name was typed and what the
// question needs, nothing more: never a scientific name, and the same whether it names the photo's fish or another.
const typeKindMsg = (text, kind, one) =>
  `“${text}” is ${kind === 'common' ? 'a common name' : 'a ' + kind}: this question needs a ${one}'s scientific name.`;
// S: the subject the form names and reads (the quiz's own; Tools › Type the genus is the corals', whatever is on screen).
const typeForm = (S = SUBJ) => `<form class="tyform" autocomplete="off">
    <label for="tyin">${S.one[0].toUpperCase() + S.one.slice(1)}</label>
    <input id="tyin" name="genus" type="text" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" enterkeyhint="done" placeholder="Type the ${S.one}">
    <div class="tybtns"><button type="submit" class="next">Check</button><button type="button" class="next sec" data-idk>I don't know</button></div>
    <p class="tymsg" aria-live="polite"></p></form>`;
// Binds a typed form: done(m, text, sp, rj) once answered, m the genus read ({g, old, exact}) or null for "I don't know". A
// word that is no genus (even with the tolerance), or as close to two, is no answer: the player is asked to check it (on
// a question below the subject's rank, a common name or another rank's name is told so: typeKind, typeKindMsg). rj: the
// texts refused that way before the answer, in order (at most TYPEDQ_RJ, each cut to 40 characters), logged with it
// (Pierre, 2026-11-08, Q237: "c'est essentiel. Et c'est vrai pour tout le jeu, partout").
// After the answer the field is locked; after "I don't know" it is emptied (a word rejected earlier is no answer).
// rk, one: the rank of the unit asked and its word ("genus" for a fish scientific genus): see typeMatch.
// o.t, the unit asked: the spelling step (a player's idea, Pierre 2026-11-05: "Good idea!"; core.js typeVerdict). A
// name of it typed within the tolerance but not exactly is still a right answer (the genus was recognised: the grading
// is unchanged), but the player first retypes it once: a warm nudge, "✏️ So close! Right genus: just fix the spelling
// and try once more" (Pierre, 2026-11-06: the first plain line read like "a mean teacher saying no"), the field keeps
// the text selected and the focus, and I don't know becomes Show me (skips the retype, never a miss). Then done(m, text, sp)
// with the first reading and text, sp = {r: 1 when retyped exactly, else 0; text: the retype, '' when skipped}. Another
// unit's name is never "close": a wrong answer as before. o.close(), when the retype is asked: the quiz stops its clock
// there (the seconds logged are the recognition's, not the spelling's).
function typeBind(form, done, S = SUBJ, rk, one = S.one, o = {}) {
  const inp = form.querySelector('input'),
    msg = form.querySelector('.tymsg'),
    idk = form.querySelector('[data-idk]');
  let over = false,
    first = null; // {m, text}: the close reading, while the player retypes it
  const rj = []; // the texts refused, in order (done's rj)
  const end = (m, text, sp) => {
    over = true;
    msg.textContent = '';
    form.classList.remove('retry');
    if (!m) inp.value = '';
    inp.disabled = true;
    form.querySelectorAll('button').forEach(b => (b.disabled = true));
    inp.blur(); // the phone's keyboard closes, so the feedback is in view
    done(m, text, sp, rj.slice());
  };
  const read = text => (S === SUBJ ? typeMatch(text, rk) : inSubject(S.id, () => typeMatch(text, rk)));
  form.onsubmit = e => {
    e.preventDefault();
    if (over) return;
    const text = inp.value.trim();
    if (!text) return inp.focus();
    // The retype: one only, whatever it reads as (exact or not, the first reading is the answer).
    if (first) return end(first.m, first.text, {r: typeVerdict(read(text), o.t, o.sp) === 'exact' ? 1 : 0, text});
    const m = read(text);
    if (!m || m.near || m.known) rj.length < TYPEDQ_RJ && rj.push(text.slice(0, 40));
    const kind = !m && S === SUBJ ? typeKind(text, rk) : '';
    if (kind) msg.textContent = typeKindMsg(text, kind, one);
    else if (!m) msg.textContent = `“${text}” is not a ${one} in the game: check the spelling.`;
    // A name the game knows that is no unit's (core.js typeMatchIn known: a species' name, or a word of one): said so,
    // never read as a slip of another unit's name, and giving nothing away.
    else if (m.known)
      msg.textContent = m.w
        ? `“${text}” is a name some ${S.several} go by: this question needs the ${one}.`
        : `“${text}” is a species' name: this question needs its ${one}.`;
    else if (m.near) msg.textContent = `Close to ${m.near.map(unameT).join(' and ')}: which one? Check the spelling.`;
    else if (o.t && typeVerdict(m, o.t, o.sp) === 'close') {
      first = {m, text};
      form.classList.add('retry');
      msg.innerHTML = `<span class="tymed" aria-hidden="true">✏️</span><span><b>So close!</b> Right ${esc(one)}: just fix the spelling and try once more.</span>`;
      idk.textContent = 'Show me';
      if (o.close) o.close(); // after the nudge is in: the quiz refits its stage around it
      inp.select();
    } else return end(m, text);
    inp.focus();
  };
  idk.onclick = () => !over && (first ? end(first.m, first.text, {r: 0, text: ''}) : end(null, ''));
  // A hardware keyboard types at once; on a phone the keyboard opens only on a tap (no focus without one).
  if (!matchMedia('(pointer: coarse)').matches) inp.focus({preventScroll: true});
}
// The spelling of name with the letters text got wrong in bold (core.js typeDiff), escaped.
const typeSpell = (text, name) => {
  const at = new Set(typeDiff(text, name, UNITS[SUBJ.id].norm));
  return [...String(name)]
    .map((c, i) => (at.has(i) ? `<b>${esc(c)}</b>` : esc(c)))
    .join('')
    .replace(/<\/b><b>/g, ''); // neighbouring letters in one bold run
};
// Similar names after a mix-up (the name study's question b, docs/reviews/2026-11-05-name-confusion-study.md 5.1 and 6;
// Pierre, 2026-11-14, Q124: "Je suis tes recommandations pour tout"): the two names as shown, the letters that differ in
// bold, for a pair that shares its first letter or has a bigram Dice of at least 0.4. The study's measures: the names in
// lower case, '#' at each end, bigrams counted with repeats (its namestudy/prep.py).
const nameBigrams = s => {
  const L = Array.from(`#${String(s).toLowerCase()}#`);
  return L.slice(1).map((c, i) => L[i] + c);
};
// The bigram Dice of two names as {shared, total}: Dice = 2 × shared / total (0 to 1).
const nameDice = (a, b) => {
  const A = nameBigrams(a),
    B = nameBigrams(b),
    n = new Map();
  A.forEach(k => n.set(k, (n.get(k) || 0) + 1));
  let shared = 0;
  B.forEach(k => n.get(k) > 0 && (n.set(k, n.get(k) - 1), shared++));
  return {shared, total: A.length + B.length};
};
// Two names alike enough to mark (namesDiff): not the same name, and the same first letter or a Dice of 0.4 or more
// (2 × shared / total ≥ 0.4, in whole numbers: 5 × shared ≥ total).
const namesAlike = (a, b) => {
  const x = String(a).toLowerCase(),
    y = String(b).toLowerCase();
  if (!x || !y || x === y) return false;
  if (Array.from(x)[0] === Array.from(y)[0]) return true;
  const {shared, total} = nameDice(x, y);
  return 5 * shared >= total;
};
// The two names, escaped, with the letters that differ in bold: what lies between their common beginning and their
// common ending (capitals aside), as the study's "Lepto<b>ria</b> / Lepto<b>seris</b>". A name that holds the other
// whole (Fungia / Danafungia) has nothing in bold. Only letters are marked, never a space or a sign.
const namesDiff = (a, b) => {
  const A = Array.from(String(a)),
    B = Array.from(String(b)),
    lo = c => c.toLowerCase();
  let p = 0,
    s = 0;
  while (p < A.length && p < B.length && lo(A[p]) === lo(B[p])) p++;
  while (s < A.length - p && s < B.length - p && lo(A[A.length - 1 - s]) === lo(B[B.length - 1 - s])) s++;
  const mark = L =>
    L.map((c, i) => (i >= p && i < L.length - s && /\p{L}/u.test(c) ? `<b>${esc(c)}</b>` : esc(c)))
      .join('')
      .replace(/<\/b><b>/g, '');
  return [mark(A), mark(B)];
};
// The feedback's line for a mix-up of unit t with unit c when their names are alike (namesAlike), '' otherwise: the photo's
// unit first, then the answer, each written as uname writes it.
const namesLine = (t, c) => {
  const a = unameT(t),
    b = unameT(c);
  if (!namesAlike(a, b)) return '';
  const [x, y] = namesDiff(a, b);
  return `<p class="vs ndiff">Similar names: ${unameIn(t, x)} / ${unameIn(c, y)}</p>`;
};
// The unit a typed reading m gives on a question on unit t: its unit; for a name several units share (core.js
// typeMatchIn shared: Holocentridae, the Soldierfishes' and the Squirrelfishes'), t when t is one of them (right,
// Pierre, 2026-11-09, Q319), else none: a wrong answer that counts against t only, no mix-up recorded (Q319), as "I
// don't know" is scored (answer: no unit given), its text logged (ty); '' for "I don't know".
// A name of part of the unit asked (core.js typeFits: razorfish, Chromis, a species' name) on a photo it does not
// designate (sp: the photo's species) is a mistake (Pierre, 2026-11-09 ~15:45 Manila, Q333): no unit given either, so it
// counts against t only, no mix-up.
const typeUnit = (m, t, sp) => (!m ? '' : typeFits(m, t, sp) ? t : m.shared || m.g === t ? '' : m.g || '');
// Units as a list in a sentence: "A", "A and B", "A, B and C".
const unameList = L => L.join(', ').replace(/, ([^,]*)$/, ' and $1');
// A unit as a name typed reaches it (core.js fishNameIndex: r = {vr, n, of}, its role and how many of its species carry
// the name): "some Wrasses" for a word only some of its species carry, else "the Shrimpfishes".
const typeWhose = (g, r = {}) => `${['k', 'gc'].includes(r.vr) && !(r.n && r.n === r.of) ? 'some' : 'the'} ${uname(g)}`;
// What a name below the family says of unit g (r: its reading, typeWhose's): "“Peacock razorfish” is one of the
// Wrasses." (a species' name), "“Iniistius” is a genus of the Wrasses.", "“Anglerfish” is a name of some Frogfishes."
// (a kind word, a genus's common name, a name of Pierre's); '' for the family's own names.
// not: the name is of part of g only and the photo is not of that part (Q333): "…, not this one." (a name of part of g
// with no role of its own, an IMR genus or sub-entry: "“Chromis” is a name of some Damselfishes, not this one.").
const typeSays = (text, g, r = {}, not = false) => {
  const end = not ? ', not this one.' : '.';
  return ['sp', 'ss'].includes(r.vr)
    ? `“${esc(text)}” is one of the ${uname(g)}${end}`
    : r.vr === 'gs'
      ? `“${esc(text)}” is a genus of the ${uname(g)}${end}`
      : ['k', 'gc', 'cur'].includes(r.vr)
        ? `“${esc(text)}” is a name of ${typeWhose(g, r)}${end}`
        : not
          ? `“${esc(text)}” is a name of some ${uname(g)}${end}`
          : '';
};
// How a typed answer was read, said after it: an old name, or a spelling the tolerance accepted ('' when exact, or when
// the spelling step was asked: typeStep says it in the verdict's own line); a name below the family, what it is
// (typeSays). A name several units share (m.shared, Q319), on the question on unit t: right, what it is for t and the
// others it is used for ("“Razorfish” is a name of some Wrasses. It is also used for the Shrimpfishes."); wrong, every
// unit it names ("“Razorfish” names some Wrasses and the Shrimpfishes.").
// ps: the photo's species (core.js typeFits): a name of part of t that does not designate them says so, "not this one".
const typeRead = (m, text, sp, t, ps) => {
  const not = !!m && (m.shared ? m.shared.includes(t) : m.g === t) && !typeFits(m, t, ps);
  if (m && m.shared) {
    const by = m.by || {},
      who = L => unameList(L.map(g => typeWhose(g, by[g])));
    if (!m.shared.includes(t)) return `“${esc(text)}” names ${who(m.shared)}.`;
    const mine = typeSays(text, t, by[t], not),
      rest = who(m.shared.filter(g => g !== t));
    return mine ? `${mine} It is also used for ${rest}.` : `“${esc(text)}” is also used for ${rest}.`;
  }
  if (m && not) return typeSays(text, t, m, true);
  if (m && m.vr && m.exact) return typeSays(text, m.g, m);
  return !m || m.exact || sp
    ? ''
    : m.old
      ? m.alt
        ? `You wrote ${esc(m.old)}, read as ${uname(m.g)}.` // another name of a fish entry (its family, a sub-entry)
        : `You wrote the old name, ${esc(m.old)}, read as ${uname(m.g)}.`
      : `You wrote “${esc(text)}”, read as ${uname(m.g)}.`;
};
// The spelling step's outcome (typeBind sp) for the verdict's one line (Pierre, 2026-11-06: one line, "✓ Yes, but not
// quite: it's spelled Galaxea", in place of "Yes, it's Galaxea" plus a second line), null when none was asked or the
// retype was exact (Pierre, 2026-11-06: no mistake left to point out, so the plain "✓ Yes, it's X"). Else {spelled}: the
// name as it is spelled, the letters the last try got wrong marked (typeSpell, .tysp), in italics as uname (a fish entry
// upright), and old: the name typed was an old one (alt: another name of a fish entry), so the line names the unit after it.
// A name in common use typed (m.oft, core.js fishOften: Clownfish), with no spelling left to fix: {oft}, so the line says
// the usual name gently (Pierre, 2026-11-06, Q164: "✓ Yes, Anemonefish (often called clownfish)").
const typeStep = (m, text, sp, t) => {
  if (!m) return null;
  const oft = m.shared ? ((m.by || {})[t] || {}).oft : m.oft;
  if (!sp || m.exact || sp.r) return oft ? {oft} : null;
  const name = (m.shared && m.name) || m.old || unameT(m.g || t),
    s = `<span class="tysp">${typeSpell(sp.text || text, name)}</span>`;
  // A name several units share (razorfish, Holocentridae): the name as it is spelled, nothing more: it is no old name
  // nor another name of the unit (Codex review #834).
  if (m.shared) return {spelled: s, plain: true, old: false, alt: false};
  const u = GX(m.g || t);
  return {spelled: !m.old && u && u.name && !u.rank ? s : `<i>${s}</i>`, old: !!m.old, alt: !!m.alt};
};
// Time to answer and photo enlarged (Pierre, 2026-11-02: a right answer that needed a long look or an enlarged photo says
// the photo was harder; sheet v23 Seconds and Enlarged; since 2026-11-04 the seconds weigh a right answer's ability
// steps, core.js rtWeight, the enlarged mark is logged only): the clock starts when the question's first photo is in
// (its load event, or at once if it already was), starts again when a card over the question closes (quiz.js introShow, the prompts' cards: reading a card is
// not looking at the photo), and stops while the app is hidden; zm is 1 once a photo of the question is enlarged.
const QCLOCK = {n: 0, t0: null, off: 0, hid: null, zm: 0};
const qclockStart = () => {
  const t = performance.now();
  Object.assign(QCLOCK, {t0: t, off: 0, hid: document.hidden ? t : null});
};
const qclockGo = () => QCLOCK.t0 === null && qclockStart();
const qclockAgain = () => QCLOCK.t0 !== null && qclockStart();
document.addEventListener('visibilitychange', () => {
  if (document.hidden) QCLOCK.hid = performance.now();
  else if (QCLOCK.hid !== null) ((QCLOCK.off += performance.now() - QCLOCK.hid), (QCLOCK.hid = null));
});
const qclockRead = () =>
  QCLOCK.t0 === null ? null : Math.round(Math.max(0, Math.min(600, (performance.now() - QCLOCK.t0 - QCLOCK.off) / 1000)) * 10) / 10;
// A new question's clock (question(), winkShow): stopped and not enlarged; the first of its photos to be in starts it,
// whichever (Codex review #370: one cached or quicker than the first in the page would otherwise be looked at off the
// clock).
function qclockArm() {
  const qn = (QCLOCK.n = (QCLOCK.n || 0) + 1),
    ims = [...$v.querySelectorAll('.qstage .qph img')];
  Object.assign(QCLOCK, {t0: null, off: 0, hid: null, zm: 0});
  if (ims.some(im => im.complete && im.naturalWidth)) qclockGo();
  else ims.forEach(im => im.addEventListener('load', () => QCLOCK.n === qn && qclockGo(), {once: true}));
}
function question(cur, target, choices, prompt, set, kq) {
  EXAMQ = set.exam ? target : null;
  TYPEDQ = set.typed ? {t: target, m: null, text: ''} : null;
  const ph = set.shown,
    lab = SUBJ.views.length > 1 ? VIEW_LABEL : {}; // one view (fish): no caption
  let answered = false,
    hintShown = false;
  // data-f names the photo whatever its file: an iNaturalist photo not downloaded yet (r: 1, a candidate just added) keeps
  // iNaturalist's file names (app.js img()), which resized() leaves alone (the failed-photo report, tests).
  const fig = (p, k, n = ph.length) =>
    `<figure class="qph"${p.ar ? ` data-r="${p.ar}"` : ''} style="--qbg:url('${img(p, 's')}')"><button type="button" class="zoom" data-q="${k}" aria-label="Enlarge photo"><img src="${qsrc(p, n)}" data-lo="${img(p, 's')}"${p.f ? ` data-f="${esc(p.f)}"` : ''} alt="${SUBJ.what} to identify${p.view && lab[p.view] ? ', ' + lab[p.view].toLowerCase() + ' view' : ''}">${ZOOMI}</button>${p.view && lab[p.view] ? `<figcaption>${lab[p.view]}</figcaption>` : ''}</figure>`;
  // One screen, no scrolling: the photos fill the stage (sized to the window), choices and feedback sit beside them.
  $v.innerHTML = `${gameHelp(cur)}<div class="q bleed">
    <div class="qstage">${ph.map((p, k) => fig(p, k)).join('')}</div>
    <aside class="qside">
      <div class="qtop"><p class="prompt">${prompt}</p>${trail()}${quizNav(cur)}</div>
      ${set.typed ? `<div class="tyq">${typeForm(GX(target).one ? {...SUBJ, one: GX(target).one} : SUBJ)}</div>` : `<div class="ans"${kq ? ` data-k="${kq}"` : ''}>${choices.map((c, i) => `<button type="button" data-c="${esc(c)}"${GX(c) && GX(c).name && !GX(c).rank ? ' class="plain"' : ''}><kbd>${i + 1}</kbd>${esc(unameT(c))}</button>`).join('')}</div>`}
      ${set.hint ? '<button type="button" class="linkish" id="hintb">Show the corallites (hint)</button>' : ''}
      <div id="after"></div>
    </aside></div>`;
  QOPEN = true; // a question waits for its answer: no reload for a new version until Next (app.js UPDATED)
  const qrep = (QREP = {g: target, ph: ph.map(p => p.f).filter(Boolean), el: $v.querySelector('.q')});
  bindQuizNav(cur);
  fitStage();
  qclockArm();
  const hb = document.getElementById('hintb');
  const showHint = () => {
    if (hintShown || !set.hint) return;
    hintShown = true;
    const st = $v.querySelector('.qstage');
    st.insertAdjacentHTML('beforeend', fig(set.hint, ph.length, ph.length + 1));
    qrep.ph = [...qrep.ph, set.hint.f].filter(Boolean); // its photos as shown (Codex review #785)
    if (hb) hb.remove();
    fitStage();
    // Phones show the photos as a swipe strip: bring the corallites in (RA review 2026-11-02: only a sliver showed at the
    // edge, as if nothing happened). Only the strip scrolls, never the page.
    const h = st.lastElementChild;
    if (h && st.scrollWidth > st.clientWidth + 4) st.scrollTo({left: h.offsetLeft - st.offsetLeft, behavior: 'smooth'});
  };
  if (hb) hb.onclick = showHint;
  // Keys: 1-4 answer, Enter goes to the next question.
  const keys = e => {
    if (!document.body.contains($v.querySelector('.q'))) return document.removeEventListener('keydown', keys);
    // Keys typed in the enlarged photo are the viewer's (its Escape reaches this handler before the viewer closes: removing
    // the handler there left 1-4 dead for the rest of the question, new-player walkthrough 2026-11-02).
    if (!lb.hidden || e.target.closest('input, textarea, select') || document.getElementById('tour')) return; // never an answer under the tour
    const b = !answered && $v.querySelectorAll('[data-c]')[Number(e.key) - 1];
    if (b) {
      e.preventDefault();
      b.click();
    }
  };
  document.addEventListener('keydown', keys, {signal: viewKeys()});
  $v.querySelector('.q').addEventListener('click', e => {
    const z = e.target.closest('[data-q]');
    if (!z) return;
    const list = hintShown ? [...ph, set.hint] : answered && set.reveal ? [...ph, ...set.reveal] : ph;
    if (!answered) QCLOCK.zm = 1;
    tipZoomed();
    zoom(
      list.map(p => ({...p, genus: target})),
      Number(z.dataset.q),
      {blind: () => !answered}
    );
  });
  // A single-view question shows the other views of the same colony once answered (seen, not part of the answer).
  const reveal = () => {
    const R = set.reveal || [],
      st = $v.querySelector('.qstage');
    if (!R.length || !st) return;
    st.insertAdjacentHTML('beforeend', R.map((p, k) => fig(p, ph.length + k, ph.length + R.length)).join(''));
    qrep.ph = [...qrep.ph, ...R.map(p => p.f)].filter(Boolean);
    fitStage();
  };
  let tm0 = null; // the clock read when a typed answer's retype was asked (typeBind o.close): the seconds of the recognition
  const go = c => {
    const cor = hintShown || ph.some(p => p.view === 'macro' || p.view === 'close'),
      tm = tm0 || {rt: qclockRead(), zm: QCLOCK.zm};
    showHint();
    reveal();
    answered = true;
    QOPEN = false;
    answer(cur, c, target, set.hint ? [...ph, set.hint] : ph, cor, hintShown || !set.hint ? null : set.hint, tm);
    const tr = $v.querySelector('.trail');
    if (tr) tr.outerHTML = trail();
  };
  $v.querySelectorAll('[data-c]').forEach(b => (b.onclick = () => go(b.dataset.c)));
  // A typed question: the genus read is the answer ('' for "I don't know"), what was typed goes with it (TYPEDQ).
  const tf = $v.querySelector('.tyform'),
    // the photo's own species (app.js photoTaxon): a name of part of the unit counts only when it designates them (Q333)
    tx = tf && photoTaxon(ph, target),
    typeSp = tx && tx.rank === 'species' ? [tx.id] : [];
  if (tf)
    typeBind(
      tf,
      (m, text, sp, rj) => {
        Object.assign(TYPEDQ || {}, {m, text, sp, rj, ps: typeSp});
        go(typeUnit(m, target, typeSp));
      },
      SUBJ,
      rankOf(target),
      GX(target).one || SUBJ.one,
      {
        t: target,
        sp: typeSp,
        // The spelling step (typeBind): the answer is given, only its spelling waits; the hint stays as it was. The nudge
        // makes the answer column taller: the stage gives up that room so it stays on one screen (Codex review #616).
        close: () => {
          tm0 = {rt: qclockRead(), zm: QCLOCK.zm};
          if (hb) hb.hidden = true;
          fitStage();
        }
      }
    );
}
// The quiz stage fills the window below the header, so photos, choices and feedback fit without scrolling.
// The photos then take the grid (columns x rows) that shows them largest at 4:3.
function fitStage() {
  const q = $v.querySelector('.q');
  if (!q) return;
  // The page's intro (gameHelp) goes behind ? first: its observer (app.js pageHelp) only runs after the question is drawn,
  // and measured under it the stage got the minimum height (fish beta QA, 2026-11-06: Q1 in a small letterboxed box).
  pageHelp();
  const tab = tabH();
  q.style.setProperty('--qh', Math.max(260, innerHeight - q.getBoundingClientRect().top - window.scrollY - 16 - tab) + 'px');
  const st = q.querySelector('.qstage');
  // Phones (one column): the photo takes all the height the question and answers leave, so no gap is left under it.
  // After an answer the feedback is a bottom sheet over the page: the photo shrinks to the space left above it, so it stays in view.
  if (isStacked()) {
    const side = q.querySelector('.qside'),
      aft = q.classList.contains('done') && document.getElementById('after');
    st.style.height =
      aft && getComputedStyle(aft).position === 'fixed'
        ? Math.max(120, aft.getBoundingClientRect().top - st.getBoundingClientRect().top - 8) + 'px'
        : Math.max(180, parseFloat(q.style.getPropertyValue('--qh')) - (side ? side.offsetHeight : 240) - 10) + 'px';
  } else st.style.height = '';
  const n = st.children.length,
    W = st.clientWidth,
    H = st.clientHeight;
  // Grid of the views: the column count that gives the photos the most room (phones and tablets assume 4:3 photos).
  // Desktop (designer re-review 2026-11-01, N1): each photo's shape is known before it loads (data.json `ar`,
  // tools/apply_ratios.py; 4:3 if missing), so the grid that shows the most photo area wins: portrait or square views go
  // side by side instead of in two wide half-blurred bands. The stage keeps its full height (Pierre dislikes a photo
  // above an empty half screen), and nothing moves while the photos load.
  const rs = [...st.children].map(f => +f.dataset.r || 4 / 3);
  let best = [n, 1, 0];
  for (let c = 1; c <= n; c++) {
    const r = Math.ceil(n / c),
      cw = (W - 8 * (c - 1)) / c,
      ch = (H - 8 * (r - 1)) / r;
    const score = isStacked() ? Math.min(cw, (ch * 4) / 3) : rs.reduce((a, x) => a + Math.min(cw, ch * x) ** 2 / x, 0);
    if (score > best[2] * 1.02) best = [c, r, score];
  }
  st.style.gridTemplateColumns = `repeat(${best[0]}, minmax(0, 1fr))`;
  st.style.gridTemplateRows = `repeat(${best[1]}, minmax(0, 1fr))`;
  // Phones and tablets: the stage takes all the height the question and answers leave (computed above, before any photo
  // loads, so nothing moves while they load). Each photo fills its box (object-fit: cover, class .cov on its figure) when that
  // crops at most ~23% of it; a photo of another shape is shown whole on its blurred background. A 4:3 cap tried after the
  // design review left a small photo over an empty bottom half (Pierre, 2026-11-01): the bigger photo wins.
  // The full frame is one tap away in the lightbox.
  if (isStacked() && !st.classList.contains('qvs') && best[1] === 1) {
    const colW = st.children[0].getBoundingClientRect().width,
      h = st.getBoundingClientRect().height;
    const boxR = colW / h;
    st.querySelectorAll('.qph').forEach(f => {
      const i = f.querySelector('img');
      if (!i) return;
      // A small photo (some IMR lecture originals are ~300 px wide) is never blown up to fill: shown whole at its own
      // size on the blurred background instead, sharp rather than soft (Pierre, 2026-11-01, design re-review m5).
      const set = () => {
        const r = i.naturalWidth / i.naturalHeight,
          up = Math.max(colW / i.naturalWidth, h / i.naturalHeight);
        f.classList.toggle('cov', !!r && Math.max(boxR / r, r / boxR) <= 1.3 && up <= LOWRES);
      };
      if (i.naturalWidth) set();
      else i.addEventListener('load', set, {once: true});
    });
  } else st.querySelectorAll('.qph.cov').forEach(f => f.classList.remove('cov'));
  // Each photo's file for the box it got: a box bigger than guessed (qsrc) loads the bigger file (upsizeImg).
  st.querySelectorAll('.qph img').forEach(i => {
    const r = i.closest('.qph').getBoundingClientRect(),
      px = Math.max(r.width, r.height);
    if (px && !st.classList.contains('qvs')) QBOX[n] = px;
    upsizeImg(i, px);
  });
}
addEventListener('resize', fitStage);
// The loading placeholder (the small file as the img's own background, app.css .qph img) goes once the photo is in: a
// photo smaller than its box showed on a blown-up copy of itself instead of the blurred background (walkthrough
// 2026-11-02). Load events do not bubble, hence the capture.
$v.addEventListener(
  'load',
  e => {
    if (!(e.target instanceof HTMLImageElement && e.target.closest('.qph'))) return;
    e.target.classList.add('in');
    if (hashNow() === 'quiz') loadMark('q1'); // the first quiz photo on screen (sync.js load times)
  },
  true
);
// Big photo stages (Look-alikes, quiz on phones and tablets): a photo that would be enlarged more than this to fill its
// box is shown whole at its own size on the blurred background instead (Pierre, 2026-11-01: sharp beats big for the few
// small IMR lecture photos). Genus sheet tiles keep filling their box.
const LOWRES = 1.15;
const fitLow = fig => {
  const i = fig.querySelector('img');
  if (!i) return;
  const chk = () => {
    const r = fig.getBoundingClientRect();
    fig.classList.toggle('lo', !!i.naturalWidth && Math.max(r.width / i.naturalWidth, r.height / i.naturalHeight) > LOWRES);
  };
  if (i.complete && i.naturalWidth) chk();
  else i.addEventListener('load', chk, {once: true});
};
// Games with a grid of cards (Memory): fill the free area. Try every column count; cards may be square up to
// 4:3 landscape (the photos' shape); keep the layout with the largest cards.
// Height of the phone bottom tab bar (0 on wider screens): every screen-fitting layout leaves room for it.
const tabH = () => {
  const t = document.querySelector('.sections');
  return t && getComputedStyle(t).position === 'fixed' ? Math.max(0, innerHeight - t.getBoundingClientRect().top) : 0;
};
function fitTiles(grid, gap, dims) {
  // Sizes a card grid to the space left on screen. With dims [a, b] the grid is a x b (either orientation)
  // and cards stretch to fill it, within sane aspect ratios; without, picks the best column count.
  if (gap === undefined) {
    gap = +grid.dataset.gap || 10;
    dims = grid.dataset.dims && grid.dataset.dims.split('x').map(Number);
  }
  grid.dataset.gap = gap;
  if (dims) grid.dataset.dims = dims.join('x');
  const n = grid.children.length,
    W = grid.parentNode.clientWidth;
  const H = Math.max(240, innerHeight - grid.getBoundingClientRect().top - window.scrollY - 16 - tabH());
  let opts = dims
    ? [
        [dims[1], dims[0]],
        [dims[0], dims[1]]
      ]
    : Array.from({length: n}, (_, i) => [i + 1, Math.ceil(n / (i + 1))]);
  // data-minw: tiles never narrower than this (their label must stay readable); the grid may then scroll.
  const minw = +grid.dataset.minw || 0;
  let best = null;
  if (minw && !dims) {
    // The most columns that keep tiles at least minw wide; tiles then take the full column width (the grid may scroll).
    const ok = opts.filter(([c]) => (W - gap * (c - 1)) / c >= minw);
    if (ok.length) {
      const c = Math.max(...ok.map(o => o[0])),
        cw = (W - gap * (c - 1)) / c,
        [, r] = ok.find(o => o[0] === c);
      const ch = (H - gap * (r - 1)) / r,
        w = cw,
        h = Math.max(Math.min(ch, cw), cw * 0.9);
      best = {c, w, h, score: 0};
      opts = [];
    }
  }
  for (const [c, r] of opts) {
    const cw = (W - gap * (c - 1)) / c,
      ch = (H - gap * (r - 1)) / r;
    let h = Math.min(ch, cw * (dims ? 1.25 : 1)),
      w = Math.min(cw, h * (dims ? 1.8 : 4 / 3));
    const score = dims ? Math.min(w, h) : w * h;
    if (!best || score > best.score) best = {c, w, h, score};
  }
  grid.style.gridTemplateColumns = `repeat(${best.c}, ${Math.floor(best.w)}px)`;
  grid.style.gridAutoRows = Math.floor(best.h) + 'px';
  grid.style.gap = gap + 'px';
  grid.style.justifyContent = 'center';
  grid.classList.add('fit');
}
addEventListener('resize', () => document.querySelectorAll('.pgrid.fit').forEach(g => fitTiles(g)));
function answer(cur, c, target, ph, cor, unseen, tm = {}) {
  // A break while the question was on screen (model.js rustNow): the next question knows it, before this answer's time;
  // a comeback question takes its genus's recall as it is now (Codex review #374).
  if (rustNow() && SHOWNQ && SHOWNQ.warm) SHOWNQ.cb = Math.round(recallAt(target) * 1000) / 1000;
  // First answer played while signed out: remember the progress as it was (ANONB), so signing in later adds only what
  // was played since, not progress an older sign-out left on the device. Only the replayed subject's (SUBJECTS replay) and
  // its own first answer: a fish answer waiting in LOG0 is not a coral one.
  if (SUBJ.replay && !SYNC && SYNC_URL && !subjEntries(store.get(LOG0, []), SUBJ.id).length) store.set(ANONB, P);
  // A typed question (TYPEDQ, set by question): c is the genus read from what was typed, '' for "I don't know" (a miss
  // for the genus shown only). No choices were offered, so no pair counts as offered; a genus typed by mistake counts
  // against it as a wrong pick does (Pierre's rule), and the mix-up is counted.
  const tq = TYPEDQ && TYPEDQ.t === target ? TYPEDQ : null;
  TYPEDQ = null;
  const good = c === target,
    s = st(target),
    chs = tq ? [] : [...$v.querySelectorAll('[data-c]')].map(b => b.dataset.c);
  const first = !((s.ok || 0) + (s.ko || 0)); // the genus's first answer (model.js startStep)
  // The plausible choices k (what a right answer proves, the guess rate). A typed answer: no guess rate (TYPED.k,
  // Infinity: the expected success has no 1/k floor).
  const nc = $v.querySelectorAll('[data-c]').length || 4,
    k = tq ? TYPED.k : Math.min(nc, Number(($v.querySelector('.ans') || {dataset: {}}).dataset.k) || nc);
  // A wrong answer changes what comes next ("Again", traps, the exam): the questions chosen ahead are chosen again.
  if (!good) dropPlans();
  session.n++;
  session.h = [...session.h, good].slice(-10);
  pulseNote();
  if (good) session.ok++;
  // A record from before the photo memory is recalculated first, once (core.js memRecalc; a new record is only marked).
  mxRecalc(() => {
    memRecalc(s, pmem());
    if (!good && GX(c)) memRecalc(st(c), pmem());
  });
  const nw = ph.filter(p => !(s.ps || {})[p.f]).length;
  const solo = ph.length === 1 ? PICKD.SINGLE : 0; // one view alone is harder than the same photo with the others
  // A comeback question after a break (model.js comebackOf): the recall planned for its genus (R, 1 otherwise) adjusts
  // the chance the player had, so a miss the rust explains weighs less (pgMissW), and the expectation logged and fed to
  // the opening hold is the one the question really had.
  const warm = !!(photoQuiz(cur) && SHOWNQ && SHOWNQ.warm),
    seenPh = ph.filter(p => p !== unseen);
  // One scorer (core.js scoreAnswer; Pierre, 2026-11-06, Q132): the question as the game had it, what the full replay of
  // the log meets again from the answer's scoring record (sc, core.js scoreLog), so the replayed state is this one.
  // - d0, the photo difficulty (model.js photoDiff: the device's pooled ratings now);
  // - fam, the photo memory (model.js famOf, core.js MEM; Pierre, 2026-11-03): the photos seen when answering (a
  //   corallites hint left closed was not), as the player knew them before this answer, make the question that much
  //   easier: a right answer on a known photo counts only for what memory does not explain (pgMemW), a miss weighs the
  //   chance the player really had (pgMissW);
  // - cf, the known mix-ups (model.js confTerm), on the player's record before this answer;
  // - look, a genus the player gets confused with among the choices (model.js pgWeight), after the offers are counted;
  // - R, Rc: the recall of the genus shown and of the genus given on a comeback question (model.js recallAt).
  // A corallites hint revealed after the answer when it was not opened: seen, never recognised (hint).
  // The question's format and its offset (core.js fmtOf, fmtOff; the subject's pfmt, Pierre 2026-11-06, Q138): the ability
  // steps expect the question as the players really find its format (a 2-choice question easier than 1 in 2 explains).
  // Never from the custom quiz, which serves no exam question (Pierre, 2026-11-03: exams only in the photo quiz).
  const exq = EXAMQ === target && cur !== CUSTOM_H;
  // |x: a question of the mastery exam (never with |k: an exam has every trap), for the admin's player journey.
  // A photo-quiz question with fewer than 4 choices ("Again: A or B?" after a mix-up) says so too: logged plain "quiz",
  // the sheet rated it as a 4-choice one (a 1 in 4 guess instead of 1 in 2; 59 of the first 552 answers, 2026-11-02).
  // |d: a look-alike duel slipped into the photo quiz (CONTRAST), before |kN (the sheet reads |kN at the end).
  // |c: a comeback question after a break (model.js comebackOf), before |kN too; counted in the opening hold like any
  // answer, with its own expectation e. (|w, 2026-11-02 until the comeback: the gentle restart, left out of the hold by
  // the app and the sheet's hold_; old rows only.)
  // |s: the custom quiz (quizCustom), right after quiz, so the sheet stores and rates it as any photo-quiz answer
  // (guess_ reads |kN at the end and |t anywhere; its mode split keeps quiz) and the admin tells it apart.
  const mq =
    modeBase(cur) +
    (photoQuiz(cur) && AUTOD ? '|d' : '') +
    (warm ? '|c' : '') +
    (k < (photoQuiz(cur) ? 4 : nc) ? '|k' + k : '') +
    // |t: a typed question (TYPED), never with |kN; the sheet rates it with no guess rate (Code.gs guess_ v27). Its
    // answer a is the genus read ('' for "I don't know"), the raw text goes in ty; it offered no choices (ch empty).
    (tq ? '|t' : '') +
    (exq ? '|x' : '');
  const q = scoreIn({
    t: target,
    c,
    ok: good,
    k,
    chs,
    cv: !!GX(c),
    ph: seenPh.map(p => p.f),
    hint: unseen ? unseen.f : undefined,
    d0: solo + ph.reduce((t, p) => t + photoDiff(target, p), 0) / Math.max(1, ph.length),
    fam: famOf(target, seenPh),
    cf: confTerm(target, chs, k),
    look: () => pgLook(target, chs),
    R: warm && typeof SHOWNQ.cb === 'number' ? SHOWNQ.cb : 1,
    Rc: warm && !good && GX(c) ? recallAt(c) : 1,
    p: startP(),
    sec: tm.rt,
    // The answer time (core.js rtWeight, model.js rtOn): only once the sheet replays it; recorded either way.
    timed: rtOn(),
    // The format's offset (core.js fmtOff; 0 with a sheet before FMT_SHEET), logged in sc (o) with the rest.
    df: fmtOff(pfmt(), fmtOf(mq, chs.length)),
    // The typed format's offset (core.js domF dt): the domain score is the share of photos named typed and alone, so the
    // bar measures against the typed format's calibrated difficulty (Codex review #646); logged t.
    dt: fmtOff(pfmt(), 'typed'),
    // The domain-score bar (core.js domStep, model.js domRules: only once the sheet replays it, rule D4): the genus
    // offsets of the genus shown and of the genus given (model.js genusDiff, the photo population's mean difficulty),
    // logged with the answer so the replay meets the same ones.
    dom: domRules(),
    mu: genusDiff(target),
    ...(!good && GX(c) ? {muc: genusDiff(c)} : {})
  });
  const res = scoreAnswer(P, q),
    {th0, dm} = res,
    rT = q.R;
  if (ph[0]) s.ro = [...(s.ro || []).filter(o => o !== (ph[0].o || ph[0].f)), ph[0].o || ph[0].f].slice(-2);
  if (good && cor) s.cor = 1; // milestone: right with the corallites photo in view
  if (good && (cur.startsWith('quiz-duel') || (photoQuiz(cur) && AUTOD))) s.du = 1; // won a look-alike duel, in the Duel tab or slipped into the quiz (the duel achievement)
  // Mastery exam (EXAM): count an exam question passed; any miss on the genus ends its exam, and so does giving the
  // genus as the answer for another one.
  // (exq, above: never from the custom quiz.)
  EXAMQ = null;
  // It needs TYPED.exam typed right answers among its EXAM.n (model.js examTyped asks them; an exam begun before the
  // typed questions may take one more, its count held at EXAM.n so its % never passes 100).
  if (!good) delete s.ex;
  else if (exq) {
    const ex = s.ex || {k: 0, v: [], ts: Date.now()}; // ts: its start, which places it among the logged answers (core.js replayedOf)
    ex.k = Math.min(EXAM.n, ex.k + 1);
    ex.t = (ex.t || 0) + (tq ? 1 : 0);
    ex.v = [...new Set([...ex.v, ph[0].view])];
    ex.at = answersSoFar();
    if (ex.k >= EXAM.n && ex.t >= TYPED.exam) {
      s.mx = Date.now(); // learned, and when (the admin's player journey; was 1 before 2026-11-02, still truthy)
      delete s.ex;
      setTimeout(
        () =>
          typeof achPop === 'function' &&
          achPop({
            tier: 3,
            icon: '🎓',
            title: `${unameT(target)}: Instructor`,
            desc: `Mastery exam passed (${EXAM.n} hard questions right, ${TYPED.exam} or more typed from memory): you could teach it`
          }),
        600
      );
    } else s.ex = ex;
  }
  if (!good && GX(c) && P[c]) delete P[c].ex;
  // Mastery is kept only while the genus stays known (code review #327): a second miss before it is back up loses it and
  // the exam comes back, for the genus shown and for the one answered (mxKept). Only at a miss, as the full replay's lm
  // (Codex review #646: a mark the rules version 8 replay kept with its bar under DOM.KEEP must not go at a right answer).
  if (!good) [target, ...(GX(c) ? [c] : [])].forEach(n => P[n] && P[n].mx && !mxKept(n) && delete P[n].mx);
  // Answer log for the RA sheet: kept until the sheet confirms it (capped), so an answer is never logged twice or lost offline.
  // Not signed in yet: the answers wait on this device (LOG0) and join the log when the player signs in (signIn), so the
  // sheet's Answers tab also gets what was played before the account existed (Pierre, 2026-11-01).
  const spShown = speciesShown(ph.filter(p => p !== unseen));
  const ans = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    t: new Date().toISOString(),
    g: target,
    a: c,
    ok: good ? 1 : 0,
    m: mq, // the mode, built before the scorer (its format's offset, df)
    // A corallites hint left closed is not logged: it was not seen when answering (Codex review #339; the sheet rates and
    // counts as recognised only the photos the player saw).
    ph: ph
      .filter(p => p !== unseen)
      .map(p => p.f)
      .join(' '),
    ch: chs.join(' '),
    e: Math.round(100 * res.e) / 100,
    th: th0,
    // What the game scored this answer with (core.js scoreLog: photo difficulty, memory, mix-ups, look-alike test,
    // recalls, the hint revealed after it), so the full replay scores it the same (core.js replayProgress; sheet v61
    // keeps it in the Answers column Scoring; an older script ignores the field, Code.gs logAnswers_ keeps only the
    // fields it knows: no *_SHEET gate, rule D4).
    sc: scoreLog(q, res),
    nw,
    // Seconds to answer (they weighed the steps above: rtWeight; the replay reads them back from the log, Code.gs v32)
    // and a photo enlarged before answering (logged only), QCLOCK in question (sheet v23).
    ...(typeof tm.rt === 'number' ? {rt: tm.rt} : {}),
    zm: tm.zm ? 1 : 0,
    // The device's UTC offset now, in minutes east of UTC (Manila +480): the time of day at home for the analyses (Pierre,
    // 2026-11-04; sheet v44 stores it, an older script ignores the field: Code.gs logAnswers_ keeps only the fields it
    // knows, so it needs no *_SHEET gate, rule D4).
    tz: -new Date().getTimezoneOffset(),
    // A typed answer's raw text (ty: what was typed first, '' for "I don't know") and its spelling step (tr: 1 retyped
    // exactly, 0 retyped wrong or skipped; absent when none was asked): the name study's question g (docs/reviews/
    // 2026-11-05-name-confusion-study.md). Sheet v59 stores them (Typed, Retyped right); an older script ignores them
    // (Code.gs logAnswers_ keeps only the fields it knows), so no gate (rule D4). Grading never reads them.
    ...(tq ? {ty: String(tq.text || '').slice(0, 40)} : {}),
    ...(tq && tq.sp ? {tr: tq.sp.r ? 1 : 0} : {}),
    // The texts refused before it (typeBind rj: no unit, two as close, a common name or another rank's name), in order
    // (Pierre, 2026-11-08, Q237): sheet v100 keeps them (Rejected tries); an older script ignores the field (Code.gs
    // logAnswers_ keeps only the fields it knows), so no gate (rule D4). Grading never reads them.
    ...(tq && tq.rj && tq.rj.length ? {rj: tq.rj.slice(0, TYPEDQ_RJ)} : {}),
    // The subject and the rank asked (Pierre, 2026-11-06: the sheet records an answer at any taxonomic level; sheet v60
    // columns Subject, Rank): the unit's own rank (app.js rankOf: a fish scientific genus), else its subject's (SUBJECTS
    // rank). An older script ignores these fields and would file the answer as a coral one: the answers of a subject the
    // sheet does not replay are sent only from LOG_SHEET (core.js logOk, sync.js), queued until then (rule D4).
    s: SUBJ.id,
    rk: rankOf(target) || SUBJ.rank,
    // The names at that rank, shown and answered, when a unit's id is not its name (a fish entry t01 is Damselfish, a
    // scientific genus g:Chromis is Chromis; a coral genus is its own name: nothing more), and the species of the photos
    // shown (UNITS species: a fish photo's species; none for the corals' genus photos), for the sheet's readers.
    ...(unitName(target) ? {tn: unitName(target)} : {}),
    ...(unitName(c) ? {ta: unitName(c)} : {}),
    ...(spShown ? {sp: spShown} : {})
  };
  // The opening hold's record (model.js holdStep), every answer with the expectation it really had: the comeback's
  // questions too (Pierre, 2026-11-02: the hold gets the full information; e allows for the plausible choices k, as for
  // any question, and for the rust, so a miss the rust explains adds less).
  const h0 = HOLDS;
  holdStep(ans.e, good);
  startStep(dm, k, good, first); // the first-launch question's fallback window (model.js)
  // The Duel tab's relief card (reliefShow): this answer took the hold's sum across INTRO.HOLD, from below.
  if (cur.startsWith('quiz-duel')) DUELRUN = reliefNote(DUELRUN, h0, HOLDS);
  if (warm) comebackStep(rT, th0, dm, k, good);
  answeredAt(s, good);
  // Every subject's answers go to the sheet (Pierre, 2026-11-06: fish answers logged from the first second). A subject the
  // sheet does not replay (SUBJECTS replay: fish) is logged only: its answers rate no photo, count in no confusion, hold
  // or replay (Code.gs answerRows_, sync.js holdAdopt and replayAdopt keep the replayed subject's).
  logAnswer(ans);
  save();
  // Achievements on the photos seen before answering: a corallites hint left closed is not one.
  // progress.js (tier 4, index.html) may come after the first answers of a first visit: its start-up check (achCheck)
  // then counts what they earned.
  if (typeof achAfter === 'function')
    achAfter(
      good,
      ph.filter(p => p !== unseen),
      cur
    );
  $v.querySelectorAll('.qstage .qph').forEach((f, k) => f.insertAdjacentHTML('beforeend', photoSrc(ph[k])));
  // A mix-up: the stage becomes a montage, the photo shown (corallites if they were shown) next to a photo of the
  // genus answered in the same view, so the difference is seen at the moment of the mistake. The pair then comes back
  // as a duel in the photo quiz a couple of questions later.
  let again = false;
  if (!good && GX(c)) {
    // Only photos the player saw during the question: a corallites hint left closed is not "the photo shown".
    const order = ph.filter(p => p !== unseen).sort((x, y) => (y.view === 'macro') - (x.view === 'macro')),
      G = GX(c),
      V = Object.fromEntries(Object.entries(G.views).map(([v, L]) => [v, L.filter(p => gamePhotoOk(c, p))]));
    const tp = order.find(p => (V[p.view] || []).length);
    if (tp) {
      const [, cp] = photoPair([tp], V[tp.view], tp),
        st0 = $v.querySelector('.qstage'),
        lab = SUBJ.views.length > 1 ? VIEW_LABEL[tp.view] || '' : '';
      const fig = (p, n, cls, note) =>
        `<figure class="qph ${cls}"${p.ar ? ` data-r="${p.ar}"` : ''} style="--qbg:url('${img(p, 's')}')"><button type="button" class="zoom" data-vs="${cls}" aria-label="Enlarge ${esc(unameT(n))}"><img src="${qsrc(p, 2)}" alt="${esc(unameT(n))}${lab ? `, ${lab.toLowerCase()} view` : ''}">${ZOOMI}</button><figcaption><span aria-hidden="true">${cls === 'qok' ? '✓' : '✗'}</span> ${uname(n)}</figcaption><small>${note}</small>${photoSrc(p)}</figure>`;
      st0.classList.add('qvs');
      st0.innerHTML = fig(tp, target, 'qok', 'The photo shown') + fig(cp, c, 'qko', 'Your answer, same view');
      st0.querySelectorAll('[data-vs]').forEach(
        z =>
          (z.onclick = e => {
            e.stopPropagation();
            tipZoomed();
            zoom(
              [
                {...tp, genus: target},
                {...cp, genus: c}
              ],
              z.dataset.vs === 'qok' ? 0 : 1
            );
          })
      );
      fitStage();
    }
    // Every mix-up of the photo quiz (and of the custom quiz), a contrast question's too (CONTRAST: one queue, one gap).
    if (photoQuiz(cur)) again = rematchAdd([target, c], answersSoFar() - 1);
  }
  // A right answer gets a short celebration on the choice itself and on "✓ Yes" (app.css .cheer: a pulse and the tick
  // popping, ~400 ms, none with prefers-reduced-motion; "fewer, better pop-ups", Pierre 2026-11-02: the reward is on the
  // action, not in a pop-up). It never holds the player: Next is there and focused at once.
  $v.querySelectorAll('[data-c]').forEach(b => {
    b.disabled = true;
    if (b.dataset.c === target) b.classList.add('ok', ...(good ? ['cheer'] : []));
    else if (b.dataset.c === c) b.classList.add('ko');
  });
  // A typed answer: the field takes the right / wrong look of a choice, a quiet one after "I don't know".
  const tyIn = tq && $v.querySelector('#tyin');
  // A retype still not exact (the spelling step, typeBind): right, but the field says the spelling is not.
  // A name several units share, the photo's not among them, gives no unit (typeUnit) but is a wrong answer, not "I don't know".
  // A name read but no unit given (a name several units share, or of part of the unit and not of this photo: typeUnit)
  // is a wrong answer, not "I don't know".
  const shw = !!(tq && tq.m && !c);
  if (tyIn) tyIn.classList.add(good ? (tq.sp && !tq.sp.r ? 'close' : 'ok') : c || shw ? 'ko' : 'idk');
  const idk = !!tq && !c && !shw,
    read = tq ? typeRead(tq.m, tq.text, tq.sp, target, tq.ps) : '',
    step = tq && good ? typeStep(tq.m, tq.text, tq.sp, target) : null;
  // The feedback: a genus's (IMR ID tips, mnemonic, Coral ID Key criteria) or a fish entry's (IMR cues, how to tell the look-alike
  // apart, the sub-entries and phases), chosen by what the record holds (fbBody).
  document.getElementById('after').innerHTML =
    `${fbBody(target, c, good, idk, again, ph, read, step, photoTaxon(seenPh, target))}${repBtn({g: target, a: c, ph: ph.map(p => p.f), m: modeBase(cur)})}</div>
    <button class="next" type="button" id="next">Next <kbd>↵</kbd></button>`;
  // Phones: the feedback opens as a bottom sheet so the answer and Next show without scrolling (app.css .q.done).
  const qq = $v.querySelector('.q');
  if (qq) qq.classList.add('done');
  if (isStacked()) {
    window.scrollTo(0, 0);
    fitStage();
    const mo = document.querySelector('#after details');
    if (mo) mo.ontoggle = fitStage;
  }
  // Tablet and desktop: the feedback always sits in the answer column, whatever the stage shows (3 views, one view,
  // a mix-up montage or a duel), so it is in the same place after every answer (Pierre, 2026-11-01). Phones: bottom sheet.
  bindGo(document.getElementById('after'));
  const nb = document.getElementById('next');
  nb.focus({preventScroll: true});
  nb.onclick = route;
  // Chosen now, photos fetched while the feedback is read (planNext). A fixed duel pair (#practice/duels/A/B) is cheap anyway.
  setTimeout(() => hashNow() === cur && planNext(cur), 50);
  // The out-of-game prompts take turns (promptOk), never with a card or an achievement toast, nor with the mastery toast
  // due in a moment.
  // In the Duel tab, the relief card after the hold has just set in comes first (reliefArm); the others wait. In the
  // custom quiz, its once-ever reminder of the units waiting in the Quiz likewise (leftNote counts, leftArm).
  leftNote(cur);
  if (!reliefArm(nb, cur, chs) && !leftArm(nb, cur) && !(exq && s.mx) && promptOk()) {
    if (nudgeDue()) (promptMark(), signinNudge());
    else if (pulseDue()) pulseArm(nb);
  }
  // Every unit in play met and none may open now: its card takes the break at Next before a tip (allMetArm); the photo
  // quiz only, so never on the custom quiz's answer that its reminder (leftArm) arms, and the first card armed wins anyway.
  allMetArm(nb, cur, exq && s.mx);
  // A "Did you know?" tip may take the break at Next when no prompt above took it (tipAfter; tips.js).
  tipAfter(nb, cur, !good, tm.zm, exq && s.mx);
  // "Your feedback helped" (progress.js helpedArm): a break nobody took, never over a question.
  if (typeof helpedArm === 'function') helpedArm(nb);
}
// The answer's feedback, up to the report button (answer): the verdict, the unit's ID tips, why the answer given is
// another unit (first, when the two names are alike, the two with the letters that differ in bold: namesLine), and more
// behind a fold. A genus: its IMR ID tips and mnemonic, the Coral ID Key criteria (Coral Finder book, by page), a link to
// its sheet and to the comparison. A fish entry (a record with a name, core.js fishGen): the IMR cues, how IMR tells the
// look-alike apart (lk), the sub-entries IMR names inside it and its phases; no sheet or comparison page yet. step: a
// typed answer's spelling step (typeStep), said in the verdict's one line. tx: the photo's own taxon (app.js photoTaxon),
// said in one short line under the verdict (taxonLine), right or wrong.
function fbBody(target, c, good, idk, again, ph, read, step, tx) {
  const g = GX(target),
    fish = !!g.name,
    C = !good && GX(c) ? GX(c) : null,
    apart = C && fish ? ((g.lk || []).find(([o]) => o === c) || (C.lk || []).find(([o]) => o === target) || [])[1] : '';
  const vs = C
    ? // The answer's own tips, said as such (an RA tester, 2026-11-02: "Why not X:" read as the reasons the photo is not X).
      `${namesLine(target, c)}<p class="vs">Your answer, ${uname(c)}, would show: ${gloss(tipsText(C))}${fish ? '' : ` <a class="linkish" href="${esc(hr('cmp-' + target + '|' + c))}">Compare them</a>`}</p>${apart ? `<p class="vs"><b>Tell them apart</b> (IMR): ${esc(apart)}</p>` : ''}${again && againTold() ? '<p class="vs again">This pair comes back as a duel in a moment.</p>' : ''}`
    : '';
  // The unit's name as the verdict shows it (its link to the genus sheet, its notes), with inner as its spelling.
  const named = inner =>
      fish
        ? `<b>${inner}</b> <small>${esc(altName(g.fam))}</small>${isBonus(target) ? ` <small>· ${esc(setOf(target).tag)}</small>` : ''}`
        : `<a href="${esc(hr('g-' + target))}"${sheetTab()}>${inner}</a>${isBenthic(target) ? ' (fire coral, IMR benthic slate)' : g.x ? ' (bonus, not on the IMR list)' : g.n ? '' : ' (★ not surveyed)'}`,
    name = named(fish ? uname(target) : `<i>${esc(target)}</i>`),
    // The verdict, one line. A retype still wrong: "✓ Yes, but not quite: it's spelled X", the same link, its wrong
    // letters marked (an old name typed: that name, then the unit); the words in normal weight and the name in bold, so
    // the name is what the eye catches (Pierre, 2026-11-06; .fb h3.tystep).
    said = !step
      ? `it's ${name}`
      : step.oft
        ? step.oft[0] === unameT(target) // a name Pierre marks "often" for the family itself (curation.json fish.names)
          ? `it's ${name} (often called ${esc(step.oft[1].toLowerCase())})`
          : `<b>${esc(step.oft[0])}</b> (often called ${esc(step.oft[1].toLowerCase())}): it's ${name}`
        : `but not quite: it's spelled ${step.plain ? `<b>${step.spelled}</b>` : step.old ? `${step.spelled}, ${step.alt ? 'read as' : 'the old name of'} ${name}` : named(step.spelled)}`,
    more = fish
      ? `<details class="more"><summary>More</summary>${g.sub.length ? `<p class="vs">IMR names inside it: ${g.sub.map(esc).join(', ')}</p>` : ''}${g.phase.length ? `<ul>${g.phase.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}<p class="credit">${ph.map(credit).join('<br>')}</p></details>`
      : `<details class="more"><summary>Coral ID Key criteria</summary>${(g.imr || []).length ? `<p class="vs">${esc(g.sum)}</p>` : ''}<ul>${g.crit.map(x => `<li>${esc(x)}</li>`).join('')}</ul><p class="tref">Coral Finder p. ${g.pages.join(', ')}</p><p class="credit">${ph.map(credit).join('<br>')}</p></details>`;
  // No tips box at all for a unit with no cue, summary or mnemonic (a fish family of circles 2-3 with no IMR cue: an
  // empty box drew a bare rounded bar, Pierre 2026-11-07, Barracudas).
  return `<div class="fb">
    <h3 class="${good ? 'ok cheer' : idk ? 'idk' : 'ko'}${step ? ' tystep' : ''}"><span class="v">${good ? '✓ Yes' : idk ? 'No worries' : '✗ No'},</span> ${said}</h3>${taxonLine(tx)}${read ? `<p class="vs tyread">${read}</p>` : ''}
    ${g.qt || g.sum || g.mn ? `<div class="tipbox fbtips">${g.qt ? `<p class="label">${tipsLabel(g)}</p>` : ''}${g.qt || g.sum ? tipsList(g, 'imrfb') : ''}${g.mn ? `<p class="mn"><b>Mnemonic:</b> ${esc(g.mn)}</p>` : ''}</div>` : ''}${vs}
    ${more}`;
}
// An answer into the RA sheet's log (answer(), winkShow): kept until the sheet confirms it (capped), so it is never logged
// twice or lost offline; not signed in, it waits on this device (LOG0) and also goes to the sheet anonymously (Pierre,
// 2026-11-01, see sendAnon).
function logAnswer(ans) {
  if (SYNC) SYNC.log = [...(SYNC.log || []), ans].slice(-2000);
  else if (SYNC_URL) {
    store.set(LOG0, [...store.get(LOG0, []), ans].slice(-2000));
    store.set(ANONQ, [...store.get(ANONQ, []), ans].slice(-2000));
    anonSoon();
  }
}
// Winks (fish.json wink, Pierre 2026-11-03): an unmistakable fish, fun to meet (the whale shark, the pelagic thresher),
// as a rare surprise card in the photo quiz: one photo, its name among 3 deliberately absurd choices taken from our own
// entries with a tongue-in-cheek label, then one friendly line. Never counted (no progress, no ability, no photo rating,
// no statistic): its answer is logged like any other (Pierre, 2026-11-08: "il faut l'enregistrer bien sûr"), marked by
// its mode (core.js WINK_MODE: winkAnswer), which every reader of the log leaves out. For every player of a subject that
// has winks (app.js UNITS winks: fish), from circle 1 on (Pierre, 2026-11-03: "ça sera rigolo" for the people working on
// the IMR course), whatever opt-in circles are on.
// Rare, late, and once per player (Pierre, 2026-11-06: after his second fish question was the whale shark, the first only
// after at least 300 fish answers, the next after about 600-700; then, 13:31: each surprise once per player, and that's
// all, across devices): the winks in fish.json order (whale shark, thresher sharks), wink i due at the first photo-quiz
// question from WINK.AT[i] answers of the player's own record for the subject (answersSoFar: P, so a reload or a sign-in
// keeps the count) and at least the gap between the first two after the last one shown (a player already past both
// thresholds meets them 200 answers apart, never back to back). A wink beyond WINK.AT (none yet) would come the same gap
// later (winkAt). Shown once per player: the winks shown travel with the player (reefid-sync-fish-wink {wink id: answer
// count when shown}, merged by union at a sync: winkMerge), so another device of the same account never shows one again.
// Never over a card (the first-meeting cards, an offer). Earlier (Pierre, 2026-11-08): the whale shark from 200 answers,
// the thresher sharks from 400 (they were 300 and 650).
const WINK = {AT: [200, 400]};
const winkGap = () => (WINK.AT.length > 1 ? WINK.AT[1] - WINK.AT[0] : WINK.AT[0]);
// The answer count from which wink i is due.
const winkAt = i => (i < WINK.AT.length ? WINK.AT[i] : WINK.AT[WINK.AT.length - 1] + (i - WINK.AT.length + 1) * winkGap());
const WINKS = {}; // subject id -> the winks shown in this visit (kept if the storage fails)
const WINKK = () => sKey('wink'); // reefid-sync-fish-wink (core.js subjKey): travels with the player
const winkSeen = () => ({...(store.get(WINKK(), null) || {}), ...(WINKS[SUBJ.id] || {})});
// The winks shown on another device of the account (sync.js mergeSubject): the union, the earlier count kept (core.js
// winkUnion).
function winkMerge(v) {
  let r;
  try {
    r = typeof v === 'string' ? JSON.parse(v) : v;
  } catch (e) {
    return;
  }
  const s = store.get(WINKK(), null) || {},
    m = winkUnion(s, r);
  if (JSON.stringify(m) !== JSON.stringify(winkUnion(s))) store.set(WINKK(), m);
}
function winkDue() {
  const L = UNITS[SUBJ.id].winks(),
    seen = winkSeen(),
    i = L.findIndex(n => !(n in seen)),
    a = answersSoFar(),
    last = Math.max(-Infinity, ...L.filter(n => n in seen).map(n => seen[n]));
  if (i < 0 || a < winkAt(i) || a < last + winkGap() || document.querySelector('.unlock')) return null;
  return {n: L[i]};
}
// The wink's photo (Pierre, 2026-11-07: a surprise card never shows a bad photo, each draws from 2 or 3 really beautiful
// ones): one of the photos chosen for it (wink.photos: tools/fish_wink_photos.json) that are still among the unit's game
// photos, matched by photo id (fishPid: a candidate and its stopgap copy are one photo), so one Pierre's curation takes
// out is never drawn; none left, the unit's best by ease and reference look (easyRank's first). Pierre's ★ Cover of the
// unit comes first while it is in play (coverP, app.js fishCurate; Pierre, 2026-11-08, Q290, of the Thresher sharks'
// card: "we can use my cover for the card").
function winkPhoto(g) {
  if (g.coverP) return g.coverP;
  const want = new Set((g.wink.photos || []).map(fishPid)),
    L = g.views.wide.filter(p => want.has(fishPid(p.f)));
  return L.length ? pick(L) : easyRank(g.views.wide)[0];
}
// A surprise card's answer for the log (logAnswer), the fields of a game answer (quiz.js answer) that say what was shown
// and answered: the wink unit (g, tn), its photo (ph, sp), the choice made (a, ta) among the four (ch: renamed ids,
// core.js renamedId: an absurd choice names an old fish entry, t01 the Damselfishes), right or wrong, seconds and
// enlarged (QCLOCK), the device's UTC offset, subject and rank; mode WINK_MODE; nothing scored (no e, th, nw, sc). Sent
// only to a sheet whose readers leave it out (core.js logOk, WINK_SHEET), queued until then (rule D4).
function winkAnswer(n, id, ids, p, tm) {
  const r = x => renamedId(SUBJ, x),
    a = r(id),
    sp = speciesShown([p]);
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    t: new Date().toISOString(),
    g: n,
    a,
    ok: id === n ? 1 : 0,
    m: WINK_MODE,
    ph: p.f || '',
    ch: ids.map(r).join(' '),
    ...(typeof tm.rt === 'number' ? {rt: tm.rt} : {}),
    zm: tm.zm ? 1 : 0,
    tz: -new Date().getTimezoneOffset(),
    s: SUBJ.id,
    rk: rankOf(n) || SUBJ.rank,
    ...(unitName(n) ? {tn: unitName(n)} : {}),
    ...(unitName(a) ? {ta: unitName(a)} : {}),
    ...(sp ? {sp} : {})
  };
}
function winkShow({n}) {
  const g = GX(n),
    w = g.wink,
    p = winkPhoto(g),
    ch = shuffle([[n, g.name], ...w.choices]);
  const a = answersSoFar();
  WINKS[SUBJ.id] = {...(WINKS[SUBJ.id] || {}), [n]: a};
  store.set(WINKK(), {...(store.get(WINKK(), null) || {}), [n]: a});
  if (typeof syncSoon === 'function') syncSoon(); // the other devices of the account learn it was shown
  SHOWNQ = null;
  $v.innerHTML = `${gameHelp('quiz')}<div class="q bleed wink">
    <div class="qstage"><figure class="qph"${p.ar ? ` data-r="${p.ar}"` : ''} style="--qbg:url('${img(p, 's')}')"><button type="button" class="zoom" aria-label="Enlarge photo"><img src="${qsrc(p, 1)}" data-lo="${img(p, 's')}" alt="${SUBJ.what} to identify">${ZOOMI}</button></figure></div>
    <aside class="qside">
      <div class="qtop"><p class="prompt">Which ${SUBJ.one}? <span class="wtag">Surprise</span></p>${trail()}</div>
      <div class="ans">${ch.map(([id, label], i) => `<button type="button" class="plain" data-w="${esc(id)}"><kbd>${i + 1}</kbd>${esc(label)}</button>`).join('')}</div>
      <div id="after"></div>
    </aside></div>`;
  fitStage();
  qclockArm();
  let done = false;
  const go = id => {
    if (done) return;
    done = true;
    const good = id === n;
    const tm = {rt: qclockRead(), zm: QCLOCK.zm},
      ids = ch.map(([x]) => x);
    logAnswer(winkAnswer(n, id, ids, p, tm));
    if (typeof syncSoon === 'function') syncSoon(); // signed in: the account record keeps the queued answer, sent soon
    $v.querySelectorAll('[data-w]').forEach(b => {
      b.disabled = true;
      if (b.dataset.w === n) b.classList.add('ok', ...(good ? ['cheer'] : []));
      else if (b.dataset.w === id) b.classList.add('ko');
    });
    $v.querySelector('.qph').insertAdjacentHTML('beforeend', photoSrc(p));
    document.getElementById('after').innerHTML =
      `<div class="fb"><h3 class="${good ? 'ok cheer' : 'ko'}"><span class="v">${good ? '✓' : '✗'}</span> ${esc(good ? w.right : w.wrong)}</h3><p class="note">Just for fun: it doesn't count in your progress.</p><p class="credit">${credit(p)}</p></div>
    <button class="next" type="button" id="next">Next <kbd>↵</kbd></button>`;
    $v.querySelector('.q').classList.add('done');
    if (isStacked()) (window.scrollTo(0, 0), fitStage());
    const nb = document.getElementById('next');
    nb.focus({preventScroll: true});
    nb.onclick = route;
  };
  $v.querySelectorAll('[data-w]').forEach(b => (b.onclick = () => go(b.dataset.w)));
  $v.querySelector('.zoom').onclick = () => {
    if (!done) QCLOCK.zm = 1;
    zoom([{...p, genus: n}], 0, {blind: () => !done});
  };
  const keys = e => {
    if (!document.body.contains($v.querySelector('.q.wink'))) return document.removeEventListener('keydown', keys);
    if (!lb.hidden || e.target.closest('input, textarea, select') || document.getElementById('tour')) return;
    if (done && e.key === 'Enter') return (e.preventDefault(), route());
    const b = !done && $v.querySelectorAll('[data-w]')[Number(e.key) - 1];
    if (b) (e.preventDefault(), b.click());
  };
  document.addEventListener('keydown', keys, {signal: viewKeys()});
}
// Out-of-game prompts ("fewer, better pop-ups", Pierre 2026-11-02, after a new-player walkthrough counted an
// interruption every ~2 answers): the sign-in card (from NUDGE_AT answers, sync.js), the one-tap question (from
// PULSE.FIRST) and the cards about which units are in play (back to one at a time, bonus genera, below) are at least
// PROMPT.GAP answers apart and never shown with a card, the tour or an achievement toast on screen or waiting: one that
// falls too close waits until the gap is met. Counted in answers, never time. One value for all: the answers count when the last one showed
// (this device; a count that went back, a progress reset, starts the spacing over).
const PROMPT = {KEY: 'reefid-prompt-at', GAP: 10};
// The tour, a card or an achievement toast on screen or waiting (cards wait under the tour, toasts under a card).
const overlayBusy = () => !!document.querySelector('#tour, .unlock, .achpop') || (typeof achBusy !== 'undefined' && achBusy);
const promptOk = () => {
  if (overlayBusy()) return false;
  const a = answersSoFar(),
    at = store.get(PROMPT.KEY, null);
  return typeof at !== 'number' || a < at || a - at >= PROMPT.GAP;
};
const promptMark = () => store.set(PROMPT.KEY, answersSoFar());
// One-time hint that a photo enlarges (Pierre, 2026-11-03: in the answers logged, every player but one enlarged a quiz
// photo for 0-2% of their answers, so most did not know they could; "make it clear, without nagging every time"). Over the
// first photo of a photo-quiz question, from the player's ZHINT.AT-th answer on (their 2nd question at the earliest), a
// bubble pointing at the enlarge mark (app.js ZOOMI): "Tap a photo to see it bigger" ("Click" with a mouse). Once per
// device (app.js ZHINT_KEY, set when it shows), and never once a photo has been enlarged there. Never with the tour, a
// card or an achievement toast on screen or waiting (overlayBusy, as promptOk; not its spacing: it asks nothing and goes
// by itself): it waits, looking again every ZHINT.DELAY, until they have gone while the question is still unanswered,
// else tries the next question (CI, PR #410: a duel won as the first question popped "first duel won", whose toast was
// still up when the 2nd question showed, and the hint, tried once, was skipped there). It goes at the first tap, click or
// key, or after ZHINT.MS; it lets every tap through. Nothing else changes: the question, its clock and its answer are
// untouched.
const ZHINT = {AT: 1, DELAY: 600, MS: 6000};
function zoomHint() {
  const f = $v.querySelector('.q .qstage .qph');
  if (!f) return;
  // The decision for this question, on its photo: data-zh "no" or "shown" (tests wait for it rather than for a fixed time
  // before checking that no hint came).
  const said = d => (f.dataset.zh = d);
  if (store.get(ZHINT_KEY, null) || answersSoFar() < ZHINT.AT) return void said('no');
  const show = () => {
    if (!f.isConnected || f.closest('.q.done') || store.get(ZHINT_KEY, null)) return void said('no');
    if (!lb.hidden || overlayBusy()) return void setTimeout(show, ZHINT.DELAY);
    store.set(ZHINT_KEY, 'seen');
    said('shown');
    const mouse = matchMedia('(hover: hover) and (pointer: fine)').matches;
    f.insertAdjacentHTML('beforeend', `<span class="zhint" role="status">${mouse ? 'Click' : 'Tap'} a photo to see it bigger</span>`);
    const h = f.querySelector('.zhint'),
      stop = new AbortController();
    const off = () => {
      if (stop.signal.aborted) return;
      stop.abort();
      h.classList.add('out');
      setTimeout(() => h.remove(), 300);
    };
    addEventListener('pointerdown', off, {capture: true, signal: stop.signal});
    addEventListener('keydown', off, {capture: true, signal: stop.signal});
    setTimeout(off, ZHINT.MS);
  };
  setTimeout(show, ZHINT.DELAY);
}
// The break at Next: between an answer and the next question, at most one card. A card that wants this break arms Next
// (breakArm) unless another one already did: the first one wins (the one-tap question, armed first in answer(), then the
// tips). At the tap, show() returns true when its card is up (that card then goes on to the next question, or not, as it
// closes) and false to go on at once, as Next always does.
function breakArm(nb, show) {
  if (!nb || nb.onclick !== route) return false;
  nb.onclick = () => {
    nb.onclick = route;
    if (!show()) route();
  };
  return true;
}
// Every unit in play met and none may open now (Pierre, 2026-11-12: "on lui dit qu'il a tout vu et ce qui vient
// ensuite"; a fish player went 100+ answers with no new family and nothing said): a calm card at the break at Next says
// so and what comes next (app.js UNITS done: its reason k and words; a subject without it, the corals, has no card), once
// per reason, on this device (ALLMET.KEY) and, signed in, on the account's other devices (core.js TOLD
// 'allmet:<subject>-<k>'). The condition reads the opening's own candidates (planPhoto: the units in play, pool, not met,
// that may open, model.js mayOpen): none left (allMetNone), and every unit met already asked (one met on a card and not
// asked yet is still opening, and app.js fishGate's circle 2 waits for it). Never while another card says what is next
// (back to one at a time, a part opened by choice, an opt-in set and its back card), in a visit's
// first answers (noOpen), before the visit's first sync (sync.js noticesReady), closer than PROMPT.GAP to another prompt
// (promptOk), over a mastery toast due, or when the next question brings a card; the photo quiz only (the path). Its
// button takes no tap for its first moments, as a tip's. Leaving the page closes it unseen: it comes back.
const ALLMET = {KEY: 'allmet-'};
// Pure on its inputs (tests call it): L the units in play; met, asked, may (mayOpen) on a unit.
const allMetNone = (L, met, asked, may) => L.length > 0 && L.every(n => (met(n) ? asked(n) : !may(n)));
const allMetTok = k => `allmet:${SUBJ.id}-${k}`;
const allMetSeen = k => !!store.get(subjDev(SUBJ.id, ALLMET.KEY + k), null) || toldHas(allMetTok(k));
function allMetDue() {
  const U = UNITS[SUBJ.id];
  if (!U.done || noOpen() || !noticesReady() || !allMetNone(pool(), introduced, asked, mayOpen)) return null;
  if (backDue() || openOfferDue() || bonusOfferDue() || bonusBackDue()) return null;
  const r = U.done();
  return r && !allMetSeen(r.k) ? r : null;
}
function allMetArm(nb, cur, hold) {
  if (cur !== 'quiz' || hold || !UNITS[SUBJ.id].done || !promptOk() || !allMetDue()) return false;
  return breakArm(nb, () => {
    if (!(NEXTQ && NEXTQ.k === planKey(cur)) && hashNow() === cur) planNext(cur);
    const r = allMetDue(),
      nx = NEXTQ && NEXTQ.k === planKey(cur) && NEXTQ.args;
    if (!r || !promptOk() || !lb.hidden || (nx && nextCards(cur, nx))) return false;
    promptMark();
    allMetShow(r, true);
    return true;
  });
}
// r: {k, kick, title, lines} (app.js UNITS done); brk: shown at the break, so its close goes on to the next question.
function allMetShow(r, brk) {
  const d = cardShow({
    kind: SUBJ.card,
    cls: 'allmet',
    kick: esc(r.kick),
    title: esc(r.title),
    body: r.lines.map(l => `<p>${esc(l)}</p>`).join(''),
    primary: {text: 'Got it', attr: 'disabled'},
    esc: 1,
    focus: 'h3',
    enter: () => {},
    bind: d => (d.querySelector('h3').tabIndex = -1),
    onClose: how => {
      if (how === 'route') return; // left unseen: it comes back
      store.set(subjDev(SUBJ.id, ALLMET.KEY + r.k), Date.now());
      toldAdd(allMetTok(r.k));
      if (brk) route();
    }
  });
  setTimeout(() => d.querySelectorAll('[data-b]').forEach(b => (b.disabled = false)), TIP.WAIT);
  return d;
}
// "Did you know?" tips (tips.js; the owner, 2026-11-04): this device's counters (reefid-tips), the break at Next, the card.
// The device's answers seed the counters once (tips.js tipsInit): the log of a signed-in player, else LOG0.
const tipsLoad = (raw = store.get(TIPR.KEY, null)) => {
  let seed = [];
  if (!raw)
    try {
      seed = ((SYNC && SYNC.log) || store.get(LOG0, [])).filter(a => !winkEntry(a)); // a surprise card's is no question
    } catch (e) {}
  return tipsInit(raw, seed);
};
// A quiz photo enlarged by the player (question(), the mix-up montage in answer()); a tip's "Show me" is not theirs.
let tipDemo = false;
const tipZoomed = () => tipDemo || store.set(TIPR.KEY, tipUse(tipsLoad(), 'z'));
// After each answer in a game: count it; when a tip is due (tipDue: its target, its moment, at most one a visit, never in
// the visit's first answers) and the prompt spacing allows (promptOk: never with a card, the tour or a toast, PROMPT.GAP
// answers from the sign-in card, the one-tap question and the offers, which it then pushes back as they do), it takes
// the break at Next. Everything is checked again at the tap, and the tip waits for a later break when the next question
// brings a genus's card (never two cards back to back). hold: the mastery toast is due in a moment.
const TIP = {WAIT: 600};
// Whether the planned next question opens with a genus's first-meeting card: the photo quiz's plan carries them (.intro).
// (A Duel tab duel brought the cards of its genera not met yet until 2026-11-04; it now draws only genera unlocked.)
const nextCards = (cur, q) => !!q.intro;
function tipAfter(nb, cur, miss, zm, hold) {
  const raw = store.get(TIPR.KEY, null);
  let st = tipsLoad(raw);
  const q0 = st.u.q;
  st = tipNote(st, Date.now());
  if (!raw && q0) st = {...st, u: {...st.u, q: q0}}; // just seeded from the log, this answer included
  store.set(TIPR.KEY, st);
  const b = {ctx: cur.split('|')[0], miss, zm: !!zm};
  if (hold || !tipDue(st, b) || !promptOk()) return;
  breakArm(nb, () => {
    // The next question is planned 50 ms after the answer (answer, planNext): a Next tapped sooner plans it now, so its
    // cards are known.
    if (!(NEXTQ && NEXTQ.k === planKey(cur)) && hashNow() === cur) planNext(cur);
    const s = tipsLoad(),
      t = tipDue(s, b),
      nx = NEXTQ && NEXTQ.k === planKey(cur) && NEXTQ.args;
    if (!t || !promptOk() || !lb.hidden || (nx && nextCards(cur, nx))) return false;
    promptMark();
    tipShow(t, s, cur);
    return true;
  });
}
// What a tip's "Show me" does (tips.js TIPS act), after its card has closed.
const TIP_ACT = {
  // The enlarged view of the photo just answered, the answer shown (after a mix-up, the photo shown, then the one of the
  // genus answered, as a tap on the montage opens them). The player is back on the feedback when it closes; Next goes on.
  zoom: () => {
    const z = $v.querySelector('.q.done .qstage .zoom');
    if (!z) return route();
    tipDemo = true;
    try {
      z.click();
    } finally {
      tipDemo = false;
    }
  }
};
// The tip's card (cardShow kind 'tip', 💡): kicker "Did you know?", the title, for the zoom tip a small picture (the photo
// just answered with its enlarge mark, ringed), one line, "Show me" and "Got it". Anti-reflex as the one-tap question:
// its buttons take no tap for TIP.WAIT ms (faded), the focus is on the title (Enter, Next's key, presses nothing) and a
// tap outside does nothing; Escape is "Got it". Logged with the one-tap questions' events (ev 'pulse', src "tip:<id>",
// r shown / show / ok / none: the sheet's v19 events_ keeps only its known kinds, and these rows need no new column; the
// admin counts them apart): at most 2 events a showing.
function tipShow(t, st, cur) {
  store.set(TIPR.KEY, tipShown(st, t.id));
  const mouse = matchMedia('(hover: hover) and (pointer: fine)').matches,
    im = $v.querySelector('.q.done .qstage .zoom img'),
    at = {m: cur.split('|')[0], n: session.n},
    log = r => ev('pulse', {r, src: 'tip:' + t.id, ...at});
  log('shown');
  const d = cardShow({
    kind: 'tip',
    cls: 'tipcard',
    kick: esc(t.card.kick),
    title: esc(t.card.title({mouse, subj: SUBJ})),
    body: `${t.act === 'zoom' && im ? `<div class="tipvis" aria-hidden="true"><img src="${esc(im.currentSrc || im.src)}" alt="">${ZOOMI}</div>` : ''}<p>${esc(t.card.body({mouse, subj: SUBJ}))}</p>`,
    primary: t.act ? {text: 'Show me', attr: 'disabled'} : null,
    secondary: {text: 'Got it', attr: 'disabled'},
    focus: 'h3',
    enter: () => {},
    bind: d => (d.querySelector('h3').tabIndex = -1),
    onClose: how => {
      log(how === 1 ? 'show' : how === 'route' ? 'none' : 'ok');
      if (how === 1 && TIP_ACT[t.act]) TIP_ACT[t.act]();
      else if (how !== 'route') route();
    }
  });
  setTimeout(() => d.querySelectorAll('[data-b]').forEach(b => (b.disabled = false)), TIP.WAIT);
}
// One-tap question (Pierre, 2026-11-02: people answer a tap, not "any comments?"): now and then, between an answer and
// the next question, one question answered in one tap (or "Not now"). First after PULSE.FIRST answers in all (35 since
// 2026-11-02, was 15: the sign-in card comes at 20 and prompts are PROMPT.GAP apart), then every PULSE.EVERY answers
// (40 since 2026-11-03, was 60: a target that depends on the level needs a few answers per level band from each player;
// Pierre: "all the more important to ask from time to time"), PULSE.AFTERX times that after a "Not now"; counted in
// answers. A count that went back (a progress reset) starts the spacing over, as in promptOk.
// Never early in a session (Pierre, 2026-11-05, on his phone: "Getting boring?" came when he had barely started): only
// once the current session has PULSE.SESS_N answers and has lasted PULSE.SESS_MS (pulseSess). A prompt due before that
// waits for it, so a new session never opens on one and the spacing in answers stays as it was. A session = answers less
// than model.js SESSION.GAP (30 min) apart, the admin's sessions (admin.js HEALTH.GAP); kept on the device (pulseNote),
// so a reload is no new session and a page left open overnight is no long session (session.n, this page's answers, was).
// The question varies (Pierre, 2026-11-03: "ask slightly different questions about roughly the same concept"): the bank
// core.js PULSEQ (too easy or too hard, the flow channels, harder photos, fun, frustration, boredom), asked in rounds
// (pulsePick: never the same wording twice in a row; the first one ever is the plain "These questions are").
// The answer goes to the sheet as an event (ev 'pulse') with the item (src: the sheet's Where column), its code (r) and
// what the game knew then: the mode, answers this visit, right % of the last 10, overall level, genera met. Nothing in
// the game changes with it (yet): it tells Pierre whether the difficulty feels right at each level (docs/LEARNING.md
// "What the players say about the difficulty").
// reefid-pulse (this device): {at: answers when the last one showed, q: its item, left: the round's items still to ask,
// x: 1 after "Not now", v: the session {t0: its first answer's time, t: its last, n: its answers}}.
const PULSE = {FIRST: 35, EVERY: 40, AFTERX: 2, SESS_N: 15, SESS_MS: 5 * 60000, WAIT: 600},
  PULSEK = 'reefid-pulse';
const pulseSt = () => {
  const st = store.get(PULSEK, {});
  return st && typeof st === 'object' ? st : {};
};
// The session an answer at time t belongs to: the same one when the last answer is less than SESSION.GAP before it, else
// a new one. Every answer in a game counts (answer()), whatever the subject or the game, as the admin counts sessions.
const pulseVisit = (v, t) =>
  v && typeof v === 'object' && [v.t0, v.t, v.n].every(x => typeof x === 'number') && t >= v.t && t - v.t < SESSION.GAP
    ? {t0: v.t0, t, n: v.n + 1}
    : {t0: t, t, n: 1};
const pulseNote = (t = Date.now()) => {
  const st = pulseSt();
  store.set(PULSEK, {...st, v: pulseVisit(st.v, t)});
};
// The session is far enough along for a prompt at time now: still going (its last answer less than SESSION.GAP ago),
// PULSE.SESS_N answers or more, PULSE.SESS_MS or more since its first.
const pulseSess = (v, now = Date.now()) =>
  !!v &&
  typeof v === 'object' &&
  [v.t0, v.t, v.n].every(x => typeof x === 'number') &&
  now - v.t < SESSION.GAP &&
  v.n >= PULSE.SESS_N &&
  now - v.t0 >= PULSE.SESS_MS;
const pulseDue = (h = hashNow()) => {
  // Its answers describe the subject the sheet replays (core.js SUBJECTS replay: the corals; the fish beta asks nothing).
  if (!SUBJ.replay) return false;
  if (!(photoQuiz(h) || h.startsWith('quiz-duel')) || document.querySelector('#tour, .unlock')) return false;
  const a = answersSoFar(),
    st = pulseSt(),
    at = typeof st.at === 'number' ? st.at : -1e9;
  return a >= PULSE.FIRST && (a < at || a - at >= PULSE.EVERY * (st.x ? PULSE.AFTERX : 1)) && pulseSess(st.v);
};
// Response rate (Pierre, 2026-11-03: how often a prompt is shown against answered): each prompt logs its showing
// (PULSE_SHOWN), then its answer's code, or PULSE_SKIP for "Not now" (or Escape), or PULSE_NONE when the page is left
// with the card up (Back, a link). A prompt left open when the app closes logs nothing more: the admin counts it from its
// showing (shown − answered − Not now). Every event of one prompt carries what the game knew when it showed (pulseOpen),
// so its showing and its answer fall in the same level band and mode. At most 2 events a prompt, every 40 answers: far
// within the sheet's caps (200 a device, 3000 in all per 6 hours).
let pulseOpen = null;
const pulseEv = r => pulseOpen && ev('pulse', {r, src: pulseOpen.id, ...pulseOpen.at});
// After an answer whose prompt is due, Next asks it before the next question is drawn (Pierre, 2026-11-03, after a long
// run: "in a flow state, used to clicking Next, I don't see them": 3 of his first 4 prompts, shown inline in the
// feedback, ended with Next and no tap). Due is checked again at the tap (a card or a toast that came meanwhile: the
// prompt waits for a later answer, nothing is marked); the tap that opens it goes no further.
// It takes the break at Next first (breakArm): a tip then waits for a later break.
function pulseArm(nb) {
  breakArm(nb, () => {
    if (!pulseDue() || overlayBusy()) return false;
    promptMark();
    pulseAsk();
    return true;
  });
}
// The prompt is a card (cardShow, kind 'feedback'; Pierre, 2026-11-03: feedback questions interrupt at Next, a natural
// break, instead of a block in the feedback that a reflex Next skipped): "Quick question", the question, its three
// answers on one row of equal widths (app.css .pulseb), a quiet "Not now" under them. Its buttons take no tap for the
// first PULSE.WAIT ms (shown faded: the second tap of a quick double tap on Next, or a reflex one, cannot answer it), and
// Enter does nothing (the focus is on the question, not a button: Next's Enter key, pressed again, never answers);
// Escape is "Not now". The next question is drawn when it closes (its clock starts with its photo, as always, so the
// card's time is not counted). "Not now" makes the next one wait PULSE.AFTERX times longer.
function pulseAsk() {
  const st = pulseSt(),
    pk = pulsePick(st),
    it = pulseItem(pk.q),
    h = session.h;
  store.set(PULSEK, {at: answersSoFar(), q: pk.q, left: pk.left, v: st.v});
  pulseOpen = {
    id: it.id,
    at: {
      m: hashNow().split('|')[0],
      n: session.n,
      rr: h.length ? Math.round((100 * h.filter(Boolean).length) / h.length) : 0,
      lv: Math.round(((P[LEVEL] || {}).th || 0) * 100) / 100,
      met: slateGenera().filter(g => P[g]).length
    }
  };
  pulseEv(PULSE_SHOWN);
  const d = cardShow({
    kind: 'feedback',
    cls: 'pulsecard',
    kick: 'Quick question',
    title: esc(it.q),
    body: `<div class="pulseb" data-pq="${it.id}">${it.a
      .map(([k, t]) => `<button type="button" data-pulse="${k}" disabled>${esc(t)}</button>`)
      .join('')}</div><button type="button" class="linkish pulsex" data-pulse="" disabled>Not now</button>`,
    focus: 'h3',
    enter: () => {},
    bind: d => {
      d.querySelector('h3').tabIndex = -1;
      d.querySelectorAll('[data-pulse]').forEach(
        b =>
          (b.onclick = () => {
            if (!b.dataset.pulse) return d.close('skip');
            pulseEv(b.dataset.pulse);
            pulseOpen = null;
            d.close('answer');
          })
      );
    },
    onClose: how => {
      if (pulseOpen) {
        pulseEv(how === 'route' ? PULSE_NONE : PULSE_SKIP);
        if (how !== 'route') store.set(PULSEK, {...pulseSt(), x: 1});
        pulseOpen = null;
      }
      if (how !== 'route') route();
    }
  });
  setTimeout(() => d.querySelectorAll('[data-pulse]').forEach(b => (b.disabled = false)), PULSE.WAIT);
}
// Card photos: the cards sit outside the page view, out of reach of app.js's retries. Here too a photo that fails is
// tried again twice (after 1 s, then 4 s), and is kept out of sight meanwhile; if it never comes, the "photo missing"
// tile (app.js noPhoto): never a broken-image icon on a card (new-player walkthrough 2026-11-02, a bonus card offline).
document.addEventListener(
  'error',
  e => {
    const i = e.target;
    if (!(i instanceof HTMLImageElement) || !i.closest('.unlock') || !i.getAttribute('src')) return;
    const n = Number(i.dataset.retry || 0),
      u = i.getAttribute('src');
    i.classList.add('fail');
    if (n < 2) {
      i.dataset.retry = n + 1;
      setTimeout(
        () => {
          if (i.isConnected && i.getAttribute('src') === u) i.src = u.replace(/#.*$/, '') + '#r' + (n + 1);
        },
        1000 * (n + 1) ** 2
      );
    } else noPhoto(i); // it gave up: the "photo missing" tile (app.js)
  },
  true
);
document.addEventListener(
  'load',
  e => {
    if (e.target instanceof HTMLImageElement && e.target.closest('.unlock')) (e.target.classList.remove('fail'), noPhotoGone(e.target));
  },
  true
);
// A genus sheet opened from inside a game (the answer's genus name): on a computer, in a new tab,
// so the game stays where it was (an RA tester, 2026-11-02: "so that we aren't taken out of the game"); on a phone or
// tablet the same tab (new tabs there are clumsy, and Back returns to the game).
// Desktop size class with a mouse: the shared rule U4 classes (Codex review #368), no breakpoint of its own.
const sheetTab = () => (!isStacked() && !matchMedia(MQ.touch).matches ? ' target="_blank" rel="noopener"' : '');
// One contrast queue (independent review of 2026-11-02, item 7; docs/LEARNING.md "Contrast questions"): the "Again: A or
// B?" after a mix-up and the look-alike duels slipped into the photo quiz are the same question, a 2-choice contrast of a
// look-alike pair, under one rule. A mix-up in the photo quiz puts its pair in the queue (rematch: up to CONTRAST.Q pairs,
// the oldest first, a newer mix-up never pushing out an older one; 2026-11-04, Pierre, after a player's genuine
// two-way mix-up waited behind newer ones and never came back: before, one slot, the newest replacing it; a pair
// already waiting is not queued twice, and with the queue full a new mix-up waits for its next miss); with nothing
// queued, a question becomes a duel with the chance
// CONTRAST.P (Pierre, 2026-11-02: about 1 in 10), on a pair picked as the Duel tab picks (duelPick: own mix-ups first),
// both genera met and ready, never the pair of the previous contrast question. Two contrast questions are at least
// CONTRAST.GAP questions apart, and an Again comes CONTRAST.GAP questions after its mix-up (one question in between, as
// before). It replaced AUTO_DUEL {P, FROM 20, GAP 5, AGAIN 2, SAME 20}: no first 20 answers without duels (Pierre,
// 2026-11-02: duels help learning early too), AGAIN and GAP became the one gap, SAME the previous pair.
const CONTRAST = {P: 0.1, GAP: 2, Q: 3};
let rematch = [], // the pairs queued by mix-ups, oldest first: {pair, at: answers so far when the missed question showed}
  twoAt = -Infinity, // answers so far when the last contrast question (an Again or a duel) showed
  twoPair = '', // and its pair
  AUTOD = false; // the question on screen is a duel slipped in (set by quizPhoto, read by answer)
// "This pair comes back as a duel in a moment": said the first 3 times only (RA review 2026-11-02: it came on every
// wrong answer, about 20 times in 30 questions); the pair still comes back every time.
// Queues the pair of a mix-up (CONTRAST.Q at most, a pair already waiting not twice). True when it is in the queue.
const rematchAdd = (pair, at) => {
  if (!Array.isArray(rematch)) rematch = rematch ? [rematch] : [];
  const k = pair.slice().sort().join('|');
  if (rematch.some(r => r.pair.slice().sort().join('|') === k)) return true;
  if (rematch.length >= CONTRAST.Q) return false;
  rematch = [...rematch, {pair, at}];
  return true;
};
const againTold = () => {
  const n = store.get('reefid-again-told', 0);
  if (n >= 3) return false;
  store.set('reefid-again-told', n + 1);
  return true;
};
// The next questions are chosen ahead and their photos fetched meanwhile, so Next shows one at once even on a slow
// connection (Pierre, 2026-11-01: "preload the photos"). Up to AHEAD questions of the photo quiz (Pierre, 2026-11-02,
// field link: ~86 kbit/s, and a fluent RA answers in ~8 s, less than one question's photos take; 95% of the answers are
// in the photo quiz), one in the Duel tab. NEXTQ is the first of them, each holding the next (.next): setting it to null
// drops them all. Each is used only if nothing changed since it was chosen: the answers count it was planned for and the
// genera in play (settings, bonus genera), else chosen afresh.
// Planning ahead keeps the rules of the draw: a question with cards, an exam question, a duel slipped in or an "Again"
// ends the queue (nothing is chosen past it before it is played: cards are met when shown, an exam answer spaces the
// next), and a wrong answer drops the queue (its "Again" comes one question later, as before), putting back the
// planner's own state (the genus asked last, the duel and "Again" spacing) as it was before those questions were
// chosen. What changes: after a right answer, the questions already chosen stay, chosen up to AHEAD - 1 answers earlier
// (their weights lag those answers; a new card, exam question or duel comes up to that many questions later).
const AHEAD = 3;
let NEXTQ = null;
// The genera in play, and the custom quiz's selection: a change of either drops the questions planned with the old ones.
const planPool = cur => pool().join() + (cur === CUSTOM_H ? '|' + (customSel() || []).join() : '');
const planKey = (cur, i = 0) => `${cur}|${answersSoFar() + i}|${planPool(cur)}`;
const planState = () => ({last, lastQs, rematch: (Array.isArray(rematch) ? rematch : []).map(r => ({...r})), twoAt, twoPair});
function dropPlans() {
  if (NEXTQ) ({last, lastQs, rematch, twoAt, twoPair} = NEXTQ.snap);
  NEXTQ = null;
}
const plain = q => !q.intro && !q.auto && !q[4].exam && q[2].length > 2;
// The photos of the planned questions, fetched in the order they will be needed, two files at a time: question after
// question (the cards of the genera met first, then the photos shown, small version then full size, then the hint and
// the other views shown after the answer). All at once they shared a slow line, and the first photo came later than
// with no preloading at all (tools/perf.js, slow 3G: Next -> photo 11 s before preloading, 20 s with everything in
// parallel). The question on screen (ONQ) keeps its turn until its own files are in; a question dropped (NEXTQ = null,
// dropPlans) fetches nothing more. prefetched() resolves once nothing is left to fetch (the start-up then moves on to
// the next tier, index.html).
let PF = [],
  ONQ = null,
  pfLive = 0,
  pfWait = [];
const pfUrls = q => {
  const set = q[4],
    later = [...(set.hint ? [set.hint] : []), ...(set.reveal || [])],
    n = (set.shown || []).length;
  return [
    ...new Set([
      ...(q.intro || [])
        .map(g => cover(GX(g)))
        .filter(Boolean)
        .map(p => img(p, 's')),
      ...(set.shown || []).flatMap(p => [img(p, 's'), qsrc(p, n)]),
      ...later.map(p => img(p, 's')),
      ...later.map(p => qsrc(p, n + later.length))
    ])
  ].filter(u => ownPhoto(u) || SUBJ.remote || AWAY); // the site's own files, on R2 or the site (an iNaturalist photo waiting to be downloaded loads when shown; a subject on iNaturalist photos, core.js SUBJECTS remote, has them all fetched ahead; once R2 failed, the online originals that stand in for the site's files)
};
const pump = () => {
  const kept = new Set([ONQ]);
  for (let x = NEXTQ; x; x = x.next) kept.add(x);
  PF = PF.filter(x => kept.has(x) && x.urls.length);
  // Images, so the question's own <img> shares the download still on its way (with fetch() the same file came twice on
  // the field link). They hold the page's load event while they load.
  for (const x of PF)
    while (pfLive < 2 && x.urls.length) {
      const i = new Image();
      pfLive++;
      // Once R2 has failed, a URL queued before goes to its online original or the site straight away (Codex review #392).
      const u = AWAY ? photoAway(x.urls.shift(), photoLook) : x.urls.shift();
      i.onload = () => (pfLive--, pump());
      // A preload is no element of the page (app.js photoFail): failed on R2, it is asked from R2 once more after
      // PHOTO_RETRY ms (core.js photoRetry; under a service worker, the worker did), then its online original or its file
      // on the site (core.js photoAway), and so are the next photos when no service worker controls the page.
      i.onerror = () => {
        pfLive--;
        if (photoLocal(u) !== u) {
          x.r2try = x.r2try || new Set();
          if (!swOn() && !x.r2try.has(u)) {
            x.r2try.add(u);
            return setTimeout(() => (x.urls.unshift(u), PF.includes(x) || PF.push(x), pump()), PHOTO_RETRY);
          }
          if (!swOn()) r2Out();
          x.urls.unshift(photoAway(u, photoLook));
        }
        pump();
      };
      i.decoding = 'async';
      i.src = u;
      x.held.push(i);
    }
  if (!pfLive && !PF.length) pfWait.splice(0).forEach(ok => ok());
};
const prefetched = () => new Promise(ok => (pfWait.push(ok), pump()));
// Tops the queue up to AHEAD (questions after the one on screen if it is not answered yet). Not while the cards of
// the genera met are open: they are recorded as they show, and a plan made meanwhile would deal them again.
function planNext(cur) {
  if ((!photoQuiz(cur) && cur !== 'quiz-duel') || document.querySelector('.unlock.intro')) return;
  // The custom quiz needs its selection (a link to it without one opens the selection screen).
  if (cur === CUSTOM_H && !customSel()) return;
  const o = $v.querySelector('.q:not(.done)') ? 1 : 0;
  // A question on screen that changes what comes next (an exam question, a duel slipped in, an "Again", cards) is answered
  // before anything is planned past it: its answer moves the exam's spacing and the photos seen (Codex review #361).
  if (o && photoQuiz(cur) && SHOWNQ && !plain(SHOWNQ)) return;
  const pk = planPool(cur),
    key = i => `${cur}|${answersSoFar() + o + i}|${pk}`;
  if (NEXTQ && NEXTQ.k !== key(0)) dropPlans();
  let n = 0,
    end = null;
  for (let x = NEXTQ; x; x = x.next) (n++, (end = x));
  while (n < (photoQuiz(cur) ? AHEAD : 1) && !(end && end.stop)) {
    const snap = planState(),
      // planPhoto gets the answers count at which the question will show (its place in the queue): the contrast
      // questions' spacing is counted on it.
      args = photoQuiz(cur) ? planPhoto(cur, answersSoFar() + o + n) : planDuel();
    if (!args) break; // the Duel tab with no look-alike pair unlocked
    const x = {k: key(n++), args, snap, stop: !plain(args), urls: pfUrls(args), held: [], next: null};
    if (end) end.next = x;
    else NEXTQ = x;
    end = x;
    PF.push(x);
  }
  pump();
}
const topUp = () => setTimeout(() => planNext(hashNow()), 50);
const takePlan = cur => {
  const x = NEXTQ;
  if (!x || x.k !== planKey(cur)) return (dropPlans(), (ONQ = null));
  NEXTQ = x.next;
  ONQ = x;
  return x.args;
};
let SHOWNQ = null; // the photo-quiz question on screen (planNext)
function quizPhoto(cur = 'quiz') {
  // The first-launch question first (model.js startOf): a player with no answer to it (tour skipped, or an existing
  // player) is asked on a card before the next quiz question; from CHOICE.ASK answers on it is inferred, silently.
  if (cur === 'quiz' && startGate()) return startAskShow(cur);
  // Now and then a wink instead (winkShow): not a question of the game. Decided before any question is taken or chosen,
  // so the planned ones and the Again / duel spacing wait for the next (Codex review #442). The photo quiz only.
  const wk = cur === 'quiz' && winkDue();
  if (wk) return winkShow(wk);
  let q = takePlan(cur) || planPhoto(cur);
  // A planned card waits while the player falls behind (introHold, Codex review #362: a right answer that starts the
  // hold leaves the questions planned before it), and during the floor of a visit or a comeback (noOpen); a question
  // planned before a break, or a comeback question planned before the rust melted, is chosen again too (rustNow: the app
  // may have stayed open across the break). The custom quiz's cards are the player's choice: they never wait.
  // A new break since they were planned: every planned question goes, comeback ones too (their recall is old).
  // A card of the path planned before a miss is chosen again too (model.js openRight: an opening only after a right
  // answer; a miss drops the questions planned already, this is the check when one shows).
  const brk = rustNow();
  if (brk || (q.intro && !q.custom && (noOpen() || (!q.start && (introHold() || !openRight())))) || !!q.warm !== cbIn(cur)) {
    dropPlans();
    q = planPhoto(cur);
  }
  SHOWNQ = q;
  AUTOD = !!q.auto;
  question(...q);
  // A custom-quiz card: the genus is asked with it (ready at once, a card of its own, no Open all offer on it).
  // The first cards' "Had the IMR lecture? Open all" box: not for a player who answered "I'm new to corals" (Pierre,
  // 2026-11-04; My progress keeps the button for them).
  if (q.intro)
    q.custom ? introShow(q.intro, true, 'c', false) : introShow(q.intro, q.start, undefined, q.start && (startOf() || {}).c !== 'new');
  // The offers about which genera are in play (back to one at a time, bonus genera) belong to the photo quiz. The offer to
  // open all genera went (Pierre, 2026-11-12, Q337): Open all stays on the first cards and in My progress.
  else if (cur !== 'quiz') {
  } else if (!noOpen() && promptOk() && startDue())
    (promptMark(), startFbShow(startDue())); // the first answers do not fit the first-launch answer (model.js startDue)
  else if (!noOpen() && promptOk() && backDue()) (promptMark(), backShow());
  else if (!noOpen() && promptOk() && openOfferDue()) (promptMark(), openOfferShow());
  else if (!noOpen() && promptOk() && bonusOfferDue()) (promptMark(), bonusOfferShow());
  // The back card is said once: signed in, only once the visit's first sync brought the choice made on another device
  // (sync.js noticesReady, Pierre 2026-11-08).
  else if (!noOpen() && promptOk() && noticesReady() && bonusBackDue()) (promptMark(), bonusBackShow());
  zoomHint(); // once per device, never over a card or offer shown just above
  topUp(); // the questions after this one, chosen while it is played (planNext)
}
// The first-launch question's cards (Pierre, 2026-11-03; core.js CHOICE, model.js startSet): the question, the Coral
// basics offer and the fallback card, through app.js cardShow like every card.
// Asked on a card when the quiz opens (the tour asks it as its first step): no answer yet, fewer than CHOICE.ASK answers.
// From CHOICE.ASK answers on (an existing player, Pierre 2026-11-03), the choice is inferred from the global level
// (core.js startInfer) and recorded as "inferred", never asked.
const startGate = () => {
  if (!startOn() || startOf()) return false; // the subject on screen's question (SUBJECTS start)
  if (answersSoFar() >= CHOICE.ASK) return (startSet(startInfer(P), 'inferred'), false);
  return true;
};
// Forced: the three answers and nothing else (Escape goes back to Home; the quiz asks again next time). Another device's
// answer arriving meanwhile (sync, model.js startMerge) closes it and the quiz goes on.
function startAskShow(cur) {
  if (document.querySelector('.unlock.startq')) return;
  $v.innerHTML = '';
  const d = cardShow({
    kind: 'feature',
    cls: 'startq',
    kick: 'Before you start',
    title: SUBJ.start.q,
    label: SUBJ.start.q,
    body: `<p>Your answer sets where the game starts; from there it follows your answers.</p>${startOptsHtml(null)}`,
    esc: () => go(''),
    bind: d =>
      d.querySelectorAll('[data-start]').forEach(
        b =>
          (b.onclick = () => {
            startSet(b.dataset.start, 'card');
            d.close('pick');
            startBasicsOffer(cur) || quizPhoto(cur);
          })
      )
  });
  d.ulDone = () => (d.close('sync'), quizPhoto(cur));
}
// "I'm new to corals" (CHOICE v.basics): Coral basics offered first, about 5 minutes, then the quiz. Only while the module
// is not done, and only for a subject that has one (app.js basicsDue: no Fish basics yet). Returns whether it showed.
function startBasicsOffer(cur) {
  if (!startV().basics || !basicsDue()) return false;
  cardShow({
    kind: 'tip',
    cls: 'startq basicsq',
    kick: 'New to corals',
    title: 'Start with Coral basics?',
    body: '<p>Seven short steps on real photos, about 5 minutes: a polyp, a corallite, septa and walls, the words the ID tips use. Then the quiz.</p>',
    primary: {text: 'Coral basics (5 min)', attr: 'data-basics', on: () => go('basics')},
    secondary: {text: 'Start the quiz', on: () => quizPhoto(cur)},
    esc: 2, // Escape: the quiz
    note: 'Learn › Coral basics, any time.'
  });
  return true;
}
// The fallback card (model.js startDue), once per direction, over a new question. 'lo' (the answers clearly below what
// the choice predicts) is a gentle offer, never a verdict (Pierre, 2026-11-04: an RA or an expert who gets it by mistake
// must not feel judged): "The first genera feel hard?", Coral basics in 5 minutes and "No thanks, I know the basics" as
// two equal buttons. Coral basics also moves the start variables one band down, silently (model.js startEase: the answer
// given stays, nothing on screen says so); "No thanks" changes nothing, and the card never comes back that way. 'hi'
// (clearly above): the higher choices to pick from (startOptsHtml), or keep. The answers are kept either way.
function startFbShow(dir) {
  const o = startOf(),
    next = startNext(o.c, dir),
    said = `said “${esc(startText(SUBJ.id, o.c)[0])}”`,
    // Everything opened at once (Open all): the "first genera" are all of them (Pierre, 2026-11-04: the same card, its text
    // about the whole set, no number: the counts change; worded from the subject, rule S1).
    all = Object.values(introMap()).some(e => (e || [])[3] === 'a');
  startShown(dir);
  const d = cardShow(
    dir === 'lo'
      ? {
          kind: 'tip',
          cls: 'startfb',
          kick: 'A tip',
          title: all ? `All the ${SUBJ.many} at once is a lot` : 'The first genera feel hard?',
          label: 'Your start',
          body: all
            ? `<p>${SUBJ.what} basics in 5 minutes? It shows, on real photos, the few words the ID tips use.</p>`
            : '<p>They do for most people. Coral basics shows, on real photos, the few words the ID tips use: corallites, septa, walls. About 5 minutes.</p>',
          primary: {text: 'Coral basics in 5 minutes', attr: 'data-basics', on: () => (startEase(), go('basics'))},
          secondary: {text: 'No thanks, I know the basics', attr: 'data-keep'},
          esc: 2, // Escape: no thanks
          onClose: () => topUp()
        }
      : {
          kind: 'tip',
          cls: 'startfb',
          kick: 'Your start',
          title: 'You know more than you said',
          label: 'Your start',
          body: `<p>Your answers beat what the game expects from someone who ${said}. Move faster? Your answers are kept.</p>${startOptsHtml(null, next)}`,
          secondary: {text: 'Keep my answer', attr: 'data-keep'},
          onClose: () => topUp(),
          bind: d =>
            d.querySelectorAll('[data-start]').forEach(
              b =>
                (b.onclick = () => {
                  startSet(b.dataset.start, 'fallback');
                  d.close('pick');
                })
            )
        }
  );
  d.dataset.dir = dir;
}
// Back to one at a time (model.js backDue, introBack), over the question, once: after Open all genera, when the answers
// since have fallen clearly below what the game expected. "One at a time" closes the genera opened at once; the question
// on screen is chosen again (it may be about one of them, or offer one as a choice). Escape: Keep them all. Leaving the
// page closes it unanswered (route): the card can come back.
function backShow() {
  const pick = keep => {
    const L = introBack(keep);
    save();
    if (L.length) {
      dropPlans();
      NEXTQ = null;
      quizPhoto();
    }
  };
  cardShow({
    kind: 'tip',
    cls: 'intro',
    kick: `Lots of new ${SUBJ.many} at once`,
    title: 'Keep them all, or go back to one at a time?',
    body: `<p>Since you opened all ${SUBJ.many}, the questions have been harder for you. With one at a time, the ${backOpen().length} ${SUBJ.many} opened at once go back in the queue and come back one by one, each on its card. Your answers are kept.</p>`,
    primary: {text: 'One at a time', attr: 'data-back', on: () => pick(false)},
    secondary: {text: 'Keep them all', attr: 'data-keep', on: () => pick(true)},
    esc: 2,
    note: 'My progress can open them all again, any time.',
    onClose: topUp
  });
}
// The bonus genera (app.js BONUS), offered once (Pierre, 2026-11-02): when every slate genus has been met (introduced:
// its card shown or asked) and the player has not chosen yet (Q.bon undefined). "Add them": they join the genera not
// met yet and open one at a time like the others; "Not now": never offered again, ⚙ Bonus genera turns them on any time.
// A prompt like the others (promptOk: never with a card, the tour or an achievement, PROMPT.GAP answers apart).
// Every slate genus asked at least once, not just met (Pierre, 2026-11-02: an RA who taps Open all genera would otherwise get the offer a
// question later, before having seen the IMR genera in the quiz; an RA tester: "after all IMR ones have been introduced/reviewed").
// A genus closed again by "One at a time" (model.js introBack) waits for its card first.
// One card per opt-in set of the subject (app.js UNITS sets: the coral bonus genera; fish circles 2 and 3), the first due.
// The card shows their own photos as a row of round crops (each one's cover, a plain disc when it has none or it fails).
const bonusOfferDue = () => SETS().find(S => Q[S.k] === undefined && S.units().length && S.due()) || null;
function bonusOfferShow(S = bonusOfferDue() || SETS()[0]) {
  if (!S) return;
  const L = S.units();
  cardShow({
    kind: 'bonus',
    cls: 'intro',
    kick: S.kick,
    title: S.title(L.length),
    body: `<p>${S.body}</p>${bonusThumbs(L)}
    <p class="ulnote">${L.map(uname).join(', ')}</p>`,
    primary: {text: L.length > 1 ? 'Add them' : 'Add it', attr: 'data-bonus', on: () => bonusSet(true, S.k)},
    secondary: {text: 'Not now', on: () => bonusSet(false, S.k)},
    esc: 2,
    note: S.note,
    onClose: topUp // leaving the page closes it unanswered (route): the offer comes back
  });
}
// The back card (Pierre, 2026-11-08): once, to a player who turned an opt-in set on under its earlier rules (app.js UNITS
// sets rv, back: the fish scientific genera, on from Open Water before; Advanced now), never to one who never turned it
// on or turned it off. "Close them for now": off (their progress kept, not asked; a set's auto units, an IMR player's
// IMR genera, stay in play); "Keep them": on. Both record the choice under rv (bonusSet), synced, so it is asked once.
// A prompt like the offer (promptOk); leaving the page closes it unanswered: it comes back.
const bonusBackDue = () => SETS().find(S => S.back && S.rv && Q[S.k] === true && (Q[S.k + 'V'] || 0) < S.rv) || null;
function bonusBackShow(S = bonusBackDue()) {
  if (!S) return;
  const B = S.back,
    keep = S.auto ? S.auto() : [];
  cardShow({
    kind: 'bonus',
    cls: 'intro',
    kick: S.kick,
    title: B.title,
    body: `<p>${B.body}</p>${keep.length && B.imr ? `<p class="ulnote">${B.imr} ${keep.map(uname).join(', ')}</p>` : ''}`,
    // Closed, a question on screen about a unit no longer in play (a genus just closed) is replaced at once, unanswered
    // (Codex review #720). The card is gone before its button's on runs (app.js cardShow act).
    primary: {
      text: B.no,
      attr: 'data-sciback',
      on: () => {
        bonusSet(false, S.k);
        if (QOPEN && SHOWNQ && !pool().includes(SHOWNQ[1])) (dropPlans(), route());
      }
    },
    secondary: {text: B.yes, on: () => bonusSet(true, S.k)},
    esc: 2,
    note: S.note,
    onClose: topUp
  });
}
// A part of the slate opened by choice (app.js UNITS opens: fish circle 3; Pierre, 2026-11-07 08:50), over the question,
// when due (app.js openOfferDue). A "step" card (as the open-all offer was until 2026-11-12: "Not now" the safe default
// on top, Escape and Enter):
// "Open them" turns it on, its units then open one at a time at the usual pace; "Not now" keeps them closed, and the
// card comes back once, OPEN_AGAIN answers later (core.js openState). My progress opens them any time. Leaving the page closes it
// unanswered (route): the offer comes back.
function openOfferShow(S = openOfferDue()) {
  if (!S) return;
  const L = S.units().filter(n => !introduced(n));
  cardShow({
    kind: 'step',
    cls: 'intro',
    kick: S.kick,
    title: S.title(L.length),
    body: `<p>${S.body}</p>${bonusThumbs(L)}`,
    primary: {text: 'Not now', attr: 'data-notnow', on: () => openNo(S.k)},
    secondary: {text: S.yes, attr: 'data-opens', on: () => bonusSet(true, S.k)},
    esc: 1,
    enter: 1,
    note: S.note,
    onClose: topUp
  });
}
// At most BONUS_THUMBS of them, then "+N" (Pierre, 2026-11-07: 40 scientific genera in one row pushed the whole card off
// the screen, the game stuck behind its backdrop).
const BONUS_THUMBS = 6;
const bonusThumbs = L =>
  `<div class="ulthumbs">${L.slice(0, BONUS_THUMBS)
    .map(n => {
      const p = cover(GX(n));
      return p ? `<img src="${img(p, 's')}" alt="">` : '<span></span>';
    })
    .join('')}${L.length > BONUS_THUMBS ? `<span class="ulmore">+${L.length - BONUS_THUMBS}</span>` : ''}</div>`;
// The cards of the genera met now (INTRO in model.js), one after the other over the question: the first INTRO.START
// together ("1 of 4", the first questions are about them), later ones alone (asked a few questions later). Recorded
// when shown, so a planned question never played leaves no genus met without its card.
function introShow(L, start, kind = start ? 's' : 'c', offerAll = start) {
  document.querySelectorAll('.unlock.intro').forEach(x => (x.ulClose ? x.ulClose() : x.remove())); // with its keys
  let i = 0,
    told = false; // "tap an underlined word" said (once, on the first card whose tips have one)
  const card = () => {
    const n = L[i],
      more = i < L.length - 1;
    // Met when its card is shown (Codex review #350): a sequence left half-way (reload) shows the rest next time.
    introAdd([n], start, kind);
    const c = introCard(n, {
      pos: L.length > 1 ? `${i + 1} of ${L.length}` : '',
      hint: start && !told,
      // The first cards say what the first questions are about; cards met ready at once later (a duel's, the custom
      // quiz's) say the next question is about them.
      note: start
        ? more
          ? `The ${kind === 's' ? 'first questions are' : 'next question is'} about these ${L.length} ${SUBJ.many}.`
          : 'Now, which is which?'
        : 'It comes up in the questions a little later.',
      btn: more ? 'Next' : start ? 'Start' : 'Got it',
      all: offerAll && introLeft().length > 0
    });
    if (c.hinted) told = true;
    c.primary = {...c.primary, stay: true, on: next};
    return c;
  };
  const next = () => (++i < L.length ? d.set(card()) : d.close(1));
  // Enter outside a button, Escape and a tap outside move on (the first cards are not skipped: each is met when shown).
  const on = () => (start ? next() : d.close('esc'));
  const d = cardShow({
    ...card(),
    esc: on,
    enter: on,
    tap: on,
    // Open all genera (model.js introAll) from the first cards.
    bind: d =>
      d.querySelector('[data-all]') &&
      (d.querySelector('[data-all]').onclick = () => {
        introAll('card');
        NEXTQ = null;
        save();
        d.close('all');
      }),
    onClose: topUp // leaving the page closes it (route); the genera of the cards not shown yet come next time
  });
}
// One genus's first-meeting card (introShow; the Lab's cards page shows one with nothing recorded): its photo as a band,
// the plain sentence, the ID tips. o: pos ("1 of 4"), note, btn, all (the Open all genera box), hint (the glossary hint,
// said when the tips hold a term: hinted).
function introCard(n, o = {}) {
  const g = GX(n),
    p = cover(g),
    star = typeof starNote === 'function' && DATA.gen[n] ? starNote(n) : '',
    tips = tipsList(g),
    hinted = !!o.hint && tips.includes('data-gt');
  return {
    kind: SUBJ.card,
    cls: 'intro',
    photo: p ? img(p, 's') : '',
    kick: `${isBonus(n) ? setOf(n).tag : 'New ' + SUBJ.one}${o.pos ? ` · ${o.pos}` : ''}`,
    title: uname(n),
    body: `${g.name ? `<p class="ulfam">${esc(altName(g.fam))}</p>` : ''}${plainLine(g)}
      ${star ? `<p class="ulnote">${star}: on the slate so you learn to tell them apart.</p>` : ''}
      ${isBenthic(n) ? `<p class="warn">${BENTHIC_NOTE}</p>` : isBonus(n) && setOf(n).card ? `<p class="ulnote">${setOf(n).card}</p>` : ''}
      <div class="ultips"><p class="label">${tipsLabel(g)}</p>${tips}${hinted ? '<p class="gthint">Tap an underlined word to see what it means.</p>' : ''}</div>
      ${o.note ? `<p class="ulnote">${o.note}</p>` : ''}`,
    primary: {text: o.btn || 'Got it'},
    after: o.all
      ? `<div class="ulall"><p><b>Had ${SUBJ.lecture}?</b> Skip the cards and play with all ${slateCore().length} ${SUBJ.many}.</p><button class="next sec" type="button" data-all>Open all ${SUBJ.many}</button></div>`
      : '',
    hinted
  };
}
// Cards due with the next question (INTRO): the first ones while fewer than INTRO.START slate genera are met (picked by
// the progressive path's draw, easiest first), else none: planPhoto may add one when its draw falls on a genus not met.
// The cards drawn before count as met: a ★ genus may follow its reference's card, shown before it (model.js openPick).
function introStart(list) {
  const slate = list.filter(n => !isBonus(n)),
    want = INTRO.START - slate.filter(introduced).length,
    L = [],
    met = n => introduced(n) || L.includes(n);
  for (
    let fresh = slate.filter(n => !introduced(n) && mayOpen(n));
    L.length < want && fresh.length;
    fresh = fresh.filter(n => n !== L[L.length - 1])
  )
    L.push(openPick(fresh, fresh, met));
  return L;
}
// cur: 'quiz', or the custom quiz (CUSTOM_H): its genus asked and its choices come from the player's selection (model.js
// customOf, customDraw, customChoices), with no opening path; everything else is the photo quiz's.
// at: the answers count at which the question will show (planNext plans up to AHEAD questions ahead).
function planPhoto(cur = 'quiz', at = answersSoFar()) {
  const play = pool(),
    sel = cur === CUSTOM_H ? customSel() : null,
    list = sel || play;
  // The count went back (progress reset): the contrast spacing starts over.
  if (at < twoAt) twoAt = -Infinity;
  if (!Array.isArray(rematch)) rematch = rematch ? [rematch] : [];
  rematch = rematch.filter(r => r.at <= at);
  // Easier questions while the opening hold is on (model.js holdEase): the photos and the format aim lower.
  const ease = holdEase();
  // A contrast question (CONTRAST): the oldest pair a mix-up queued, CONTRAST.GAP questions after it and after the last one.
  const gap = at - twoAt >= CONTRAST.GAP;
  if (rematch.length && gap && at - rematch[0].at >= CONTRAST.GAP) {
    const pair = rematch[0].pair,
      // The custom quiz asks only its own genera; and never a genus not met yet (2026-11-04: a genus never met, offered
      // to make up the choices and picked, was asked by its Again with no card, a genus opened by the side door).
      ask = (sel ? pair.filter(n => sel.includes(n)) : pair).filter(n => introReady(n) || (sel && sel.includes(n)));
    rematch = rematch.slice(1);
    // Never on a genus closed again by "One at a time" (model.js introBack): it waits for its card.
    if (ask.length && pair.every(n => play.includes(n) && !closed(n))) {
      twoAt = at;
      twoPair = pair.slice().sort().join('|');
      const t = pick(ask);
      // During a comeback an Again still follows a miss (it corrects it), as a comeback question (Codex review #364).
      rustNow();
      const R = cbIn(cur) ? recallAt(t) : 1;
      return Object.assign(
        [
          cur,
          t,
          shuffle(pair.slice()),
          `Again: ${uname(pair[0])} or ${uname(pair[1])}?`,
          photoSet(t, null, Math.log(R) + ease, 2, 'again')
        ],
        {again: 1, ...(sel ? {custom: 1} : {}), ...(cbIn(cur) ? {warm: 1, cb: Math.round(R * 1000) / 1000} : {})}
      );
    }
  }
  // The genus asked is one already met (INTRO): ready, or one of the cards shown with this question when they are the
  // first ones. A draw that falls on a genus not met yet (the progressive path opening one, at most one card every
  // INTRO.EVERY answers) shows its card instead, and the question is about another genus.
  // After a break (model.js, "Comeback after a break"): the time since the last answer may start a new visit (no genus
  // opens in its first answers) or a comeback (questions on genera answered right, the surest first, then the most
  // rusted, the usual choices, photos at the rusty level: no card, no duel, no exam), which the answers end.
  // The custom quiz has no first cards and no opening path: its genus is drawn among the whole selection, and one not met
  // yet is asked with its card (ready at once, as the Duel tab does). During a comeback it asks the comeback's genera of
  // its selection (cbIn: at least 2 of them answered right; else it asks as usual and leaves the comeback to the quiz).
  rustNow();
  // The genera of the questions on screen or planned before this one: asked by the time this one shows (model.js openPace).
  const soon = [
    SHOWNQ,
    ...(function* () {
      for (let x = NEXTQ; x; x = x.next) yield x.args;
    })()
  ]
    .filter(Boolean)
    .map(q => q[1]);
  let cards = sel || noOpen() ? [] : introStart(list);
  const start = cards.length > 0,
    ready = n => cards.includes(n) || introReady(n),
    known = n => cards.includes(n) || introduced(n),
    met = list.filter(ready),
    warmL = start || !cbIn(cur) ? null : comebackOf(met),
    warm = !!warmL,
    // One opening rule (model.js OPEN, openChance): when the path allows a card, this question opens a genus with the
    // chance of the free places for shaky genera, the genus drawn easiest and most common first (openPick).
    fresh =
      !sel &&
      !start &&
      !warm &&
      met.length &&
      !noOpen() &&
      introSince() >= INTRO.EVERY &&
      !introHold() &&
      openPace(at, soon) &&
      openRight(at)
        ? list.filter(n => !introduced(n) && mayOpen(n))
        : [];
  if (fresh.length && Math.random() < openChance(list)) cards = [openPick(fresh, list)];
  // With the first cards, the question is about one of them (never a bonus genus unlocked earlier, say); with a card of
  // its own, about a genus already met. The custom quiz: any genus of its selection, one not met with its card.
  // A genus opened on a card in the last OPEN.WIN answers and not asked yet is asked as soon as it is ready (model.js
  // openPace holds the next card until it is): its card's question comes right after its INTRO.GAP, and the opening's
  // pace is the ceiling's, not the luck of the draw among every genus met.
  const due = start || warm ? [] : openRecent(at).filter(n => !asked(n) && !soon.includes(n) && introReady(n) && list.includes(n));
  const t = sel
    ? nextTarget(warm ? warmL : sel, customDraw)
    : nextTarget(start ? cards : warm ? warmL : due.length ? due : met.length ? met : list);
  if (sel && !introduced(t)) cards = [t];
  // A look-alike duel slipped into the photo quiz (Pierre, 2026-11-02, "a little duel back in the quiz, automatically";
  // the Duel tab had 13 answers in all): the contrast queue's (CONTRAST, above) when no mix-up is queued. Not when the
  // path opens a genus (a card) this question: opening comes first (Pierre, 2026-11-02); not in a comeback. Logged
  // "quiz|d|k2" (counted apart).
  if (!cards.length && !warm && !rematch.length && gap && Math.random() < CONTRAST.P) {
    const key = p => p.slice().sort().join('|'),
      pair = duelPick(list, p => p.every(introReady) && key(p) !== twoPair);
    if (pair) {
      twoAt = at;
      twoPair = key(pair);
      const t = pick(pair);
      last = t; // the genus asked is the duel's, not the one drawn above for the card decision
      lastQs = [...lastQs.slice(0, -1), t];
      return Object.assign(
        [cur, t, shuffle(pair.slice()), `Look-alikes: ${uname(pair[0])} or ${uname(pair[1])}?`, photoSet(t, null, ease, 2, 'qduel')],
        {auto: twoPair, ...(sel ? {custom: 1} : {})}
      );
    }
  }
  // No mastery exam question in the custom quiz (rule L9, Codex review #411): its choices come from the selection,
  // which may hold none of the genus's look-alikes, so passing there would not prove it; the exam comes in the photo quiz.
  const R = warm ? recallAt(t) : 1,
    ex = !sel && !warm && examReady(t) && examSet(t),
    // A comeback question keeps the player's usual choices (Pierre, 2026-11-03): look-alikes for a strong player, so a
    // right answer proves something and the rust melts in a few questions.
    traps = ex ? 3 : trapsFor(t, ease),
    // A genus met on a card of its own now is not among this question's choices either: its card says it comes up a
    // little later (beginner review 2026-11-03: its name was a choice on the question behind the card). The custom
    // quiz: from its selection first, topped up under 4 from the other genera unlocked only (customChoices; one
    // progression path, rule L4, Codex review #482: a locked genus, a ★ one included, as a choice).
    ch = shuffle([
      t,
      ...(sel
        ? customChoices(t, sel, unlocked(play), traps, known)
        : distractors(t, start ? list : list.filter(n => !cards.includes(n)), traps, known))
    ]),
    // Typed (model.js TYPED): with the genus's typed share, from its progress (never on a genus under TYPED.from: no
    // draw is spent there, so a beginner's questions are unchanged); an exam question as examTyped says. Never a
    // comeback question (the player's usual choices, Pierre 2026-11-03), an Again or a duel (2 choices by design).
    typed = !warm && (ex ? examTyped(t) : typedP(t) > 0 && Math.random() < typedP(t)),
    // The difficulty controller (model.js PICKD.P, aimOff): the photo is aimed for the game's target in this format, its
    // guess rate from the plausible choices (a typed answer has none).
    // Scored with the choices really shown: the photo quiz shows the traps its level asks for (from 2, every choice
    // counts); the custom quiz's selection may not hold them, so there the look-alikes among the choices decide
    // (Codex review #411: 4 unrelated genera picked were scored as a 4-choice question with traps).
    few = sel ? ch.filter(n => n !== t && confusable(t, n)).length < 2 : traps < 2,
    kq = typed ? TYPED.k : few ? plausibleK(t, ch) : ch.length,
    // Aimed lower by the hold's ease and by this player's own mix-ups among the choices (model.js confTerm; none typed).
    cf = typed ? 0 : confTerm(t, ch, kq),
    // Its format (core.js fmtOf, as answer logs it): the aim takes the format's offset (model.js aimOff, pfmt).
    fq = typed ? 'typed' : ch.length === 2 ? 'again' : kq < 4 ? (kq >= 3 ? 'k3' : 'k2') : 'k4',
    set = ex || photoSet(t, cards.includes(t) ? (cover(GX(t)) || {}).f : null, Math.log(R) + ease - cf, kq, fq),
    // The question asked with its genus's card never shows the card's own photo again (new-player walkthrough 2026-11-02).
    q = [
      cur,
      t,
      ch,
      typed ? `Which ${GX(t).one || SUBJ.one}? Type it` : `Which ${GX(t).one || SUBJ.one}?`,
      typed ? {...set, typed: 1} : set,
      few ? plausibleK(t, ch) : 0
    ];
  if (cards.length) Object.assign(q, {intro: cards, start});
  if (typed) q.typed = 1;
  if (warm) Object.assign(q, {warm: 1, cb: Math.round(R * 1000) / 1000});
  if (sel) q.custom = 1;
  return q;
}
// fresh: the Duel tab's page has just been opened (app.js route: from another page, a reload, a link to another pair), a
// new duel run (DUELRUN); Next and Keep drilling stay in the run. from: the page left. Back from the comparison the relief
// card opened (DUELBACK) is no new run: the same one goes on (its card already shown), and the return is logged.
function quizDuel(a, b, fresh = true, from = '') {
  if (fresh) {
    const bk = DUELBACK && DUELBACK.h === hashNow() && DUELBACK.cmp === from ? DUELBACK : null;
    DUELBACK = null;
    DUELRUN = bk ? bk.run : {up: 0, shown: 0};
    if (bk) ev('pulse', {r: 'back', src: 'tip:duelhold', m: 'quiz-duel', n: session.n});
  }
  const q = (!a && !b && takePlan('quiz-duel')) || planDuel(a, b);
  // No look-alike pair unlocked yet (a new player): the duels come once the quiz has opened two look-alikes.
  if (!q) {
    $v.innerHTML = `<p class="note duelnone">Duels pit two look-alike ${SUBJ.many} against each other. They start once you have met two of them in the quiz.</p><p><a class="next" href="${esc(hr('quiz'))}">Play the quiz</a></p>`;
    return;
  }
  question(...q);
}
// A look-alike pair for a duel (the Duel tab, and the duels slipped into the photo quiz): among the pairs whose two
// genera are in the list and pass keep. Null when none.
function duelPick(list, keep = () => true) {
  // The subject's look-alike pairs (app.js UNITS pairs: for corals, Millepora and the bonus genera duel with the slate
  // look-alike the Coral Finder names) and the look-alikes from the data (model.js dataLooks), when both are in the list.
  const ps = [...UNITS[SUBJ.id].pairs(), ...dataLooks(list)].filter(([x, y]) => list.includes(x) && list.includes(y) && keep([x, y]));
  if (!ps.length) return null;
  // Your mix-ups you still make come up most (personal confusion score, confOf), then pairs players often confuse and
  // the classic look-alikes (compared in the IMR lecture or the Coral Finder text).
  const w = ps.map(
      ([x, y]) => (weight(x) + weight(y)) * (mixedUp(x, y) && confusable(x, y) ? 3 : confusable(x, y) || isClassic(x, y) ? 2 : 1)
    ),
    t0 = w.reduce((p, q) => p + q, 0);
  let r = Math.random() * t0;
  for (let i = 0; i < ps.length; i++) {
    r -= w[i];
    if (r <= 0) return ps[i];
  }
  return ps[ps.length - 1];
}
function planDuel(a, b) {
  // Only the genera the player has unlocked (model.js unlocked: one progression path for every game, Pierre 2026-11-04):
  // the Duel tab opens none. A pair from a link (#practice/duels/A/B, "Drill this pair") must name two unlocked genera with game
  // photos; anything else gets a normal duel (code re-review L2). Null when no look-alike pair is unlocked yet.
  const list = unlocked();
  if (a && b && !(a !== b && list.includes(a) && list.includes(b) && photoSet(a).shown.length && photoSet(b).shown.length))
    a = b = undefined;
  let pair = a && b ? [a, b] : null;
  if (!pair) pair = duelPick(list);
  if (!pair) return null;
  const t = pick(pair);
  // A genus not met yet gets its card with this duel (quizDuel): not with the card's own photo. Easier while the opening
  // hold is on (model.js holdEase), as every question of the photo quiz but an exam: the photo and the single views aim
  // lower (photoSet's shift; a duel has its two choices, no traps). The expectation logged is the photo's own (answer),
  // so it stays that of the photo shown.
  const set = photoSet(t, introduced(t) ? null : (cover(GX(t)) || {}).f, holdEase(), 2, 'duel');
  return [a ? `quiz-duel|${a}|${b}` : 'quiz-duel', t, pair, `${uname(pair[0])} or ${uname(pair[1])}?`, set];
}
// The relief card of the Duel tab (Pierre, 2026-11-04). A player drilled one pair ("Drill this pair"), 10 right, then
// missed 6 of 13 while about 80% was expected: the hold crossed INTRO.HOLD at his 25th duel answer and nothing changed in
// the duel. In the 10 answers after the hold set in, the photo quiz (eased, model.js holdEase) was 84% right for 77%
// expected, the Duel tab 68% for 77%. So the first time in a duel run an answer takes the opening hold's sum h from
// below INTRO.HOLD to INTRO.HOLD or more (holdStep: the same detector, no new one and no new constant), the next break at
// Next offers a step back: compare the two side by side, mix in other genera (the photo quiz), or keep drilling. No
// numbers on it (Pierre's rule for these cards). A duel run (DUELRUN): the Duel tab's answers from the moment its page is
// opened (from another page, a reload, a link to another pair: app.js route, quizDuel fresh) until it is left; Next and
// Keep drilling stay in it. At most once a run. The card is an out-of-game prompt like the others (promptOk: never with
// another card, the tour or a toast, PROMPT.GAP answers apart; never right before a genus card), and takes the break
// before them; a break it cannot take passes it on to the next one of the run, while the hold is still on.
// up: an answer of this run took h across INTRO.HOLD from below; shown: the card came in this run.
let DUELRUN = {up: 0, shown: 0};
// Compare them keeps the way back (Pierre, 2026-11-04: the comparison must not throw the player out of the duel for good):
// DUELBACK {h: the duel's hash, cmp: the comparison's, run: the run, d: the duel page's history depth}. The comparison
// shows Back to the duel (learn.js viewCompare, duelBackFor), which returns to the same duel and the same run, as the
// browser's Back does (quizDuel). Any other page drops it (app.js route, duelBackKeep): the comparison opened any other
// way is unchanged. In memory only.
let DUELBACK = null;
const duelBackFor = h => (DUELBACK && DUELBACK.cmp === h ? DUELBACK : null);
const duelBackKeep = h => DUELBACK && h !== DUELBACK.h && h !== DUELBACK.cmp && (DUELBACK = null);
// Back to the duel: the history entry before the comparison when it is the duel's (so Back from the duel goes where it
// went before), else the duel's address.
function duelBack() {
  const x = DUELBACK;
  if (!x) return;
  if (pageDepth === x.d + 1) history.back();
  else location.hash = hr(x.h);
}
const reliefNote = (run, h0, h1) => (h0 < INTRO.HOLD && h1 >= INTRO.HOLD ? {...run, up: 1} : run);
const reliefDue = (run = DUELRUN) => !!run.up && !run.shown && introHold();
// After a Duel-tab answer: arms Next when the card is due (breakArm); true when it did (the other prompts then wait).
function reliefArm(nb, cur, pair) {
  if (!cur.startsWith('quiz-duel') || pair.length !== 2 || !reliefDue() || !promptOk()) return false;
  return breakArm(nb, () => {
    // As for a tip (tipAfter): the next duel planned now if Next came before its plan, so its cards are known.
    if (!(NEXTQ && NEXTQ.k === planKey(cur)) && hashNow() === cur) planNext(cur);
    const nx = NEXTQ && NEXTQ.k === planKey(cur) && NEXTQ.args;
    if (hashNow() !== cur || !reliefDue() || !promptOk() || !lb.hidden || (nx && nextCards(cur, nx))) return false;
    promptMark();
    reliefShow(cur, pair);
    return true;
  });
}
// The card (cardShow kind 'tip', 💡): "Tough pair today", "Take a step back?", one line; Mix in other genera (the main
// button, the photo quiz), Compare them (the side-by-side comparison of the duel's two genera, #learn/compare/A/B, as learn.js links
// it, with the way back to this duel: DUELBACK), and a quiet Keep drilling (the next duel; also Escape) (Pierre,
// 2026-11-04, the order). Anti-reflex as the tips: its buttons take no tap for TIP.WAIT ms, the focus
// is on the title (Enter presses nothing), a tap outside does nothing. Logged as the tips are (ev 'pulse', src
// "tip:duelhold", r shown, then mix / cmp / keep, or none when the page is left with it up, and back on the return from
// the comparison; the admin counts them with the tips): at most 3 events a showing.
function reliefShow(cur, pair) {
  DUELRUN = {...DUELRUN, shown: 1};
  const at = {m: cur.split('|')[0], n: session.n},
    log = r => ev('pulse', {r, src: 'tip:duelhold', ...at});
  log('shown');
  const d = cardShow({
    kind: 'tip',
    cls: 'reliefcard',
    kick: 'Tough pair today',
    title: 'Take a step back?',
    body: '<p>These two are hard right now. Mixing in other genera for a while, or seeing these two side by side, often helps more than more of the same.</p>',
    primary: {text: 'Mix in other genera', attr: 'disabled'},
    secondary: {text: 'Compare them', attr: 'disabled'},
    after: '<button type="button" class="linkish reliefx" data-keep disabled>Keep drilling</button>',
    focus: 'h3',
    enter: () => {},
    bind: d => {
      d.querySelector('h3').tabIndex = -1;
      d.querySelector('[data-keep]').onclick = () => d.close('keep');
    },
    onClose: how => {
      log(how === 1 ? 'mix' : how === 2 ? 'cmp' : how === 'route' ? 'none' : 'keep');
      if (how === 1) location.hash = hr('quiz');
      else if (how === 2) {
        DUELBACK = {h: cur, cmp: `cmp-${pair[0]}|${pair[1]}`, run: DUELRUN, d: pageDepth};
        location.hash = hr(DUELBACK.cmp);
      } else if (how !== 'route') route();
    }
  });
  setTimeout(() => d.querySelectorAll('[data-b], [data-keep]').forEach(b => (b.disabled = false)), TIP.WAIT);
}
// Custom quiz (Pierre, 2026-11-03): the photo quiz on the genera the player picks. #practice/custom is the selection screen,
// #practice/custom/play (CUSTOM_H) the quiz itself, every format of the photo quiz in it (typed questions, Again, duels
// slipped in, traps, the photos' level, the comeback; not the mastery exam, left to the photo quiz); the draw is model.js's (CUSTOM, customOf, customDraw,
// customChoices; docs/LEARNING.md "Custom quiz"). The selection is saved at each change ({g: genera, t: when}, an
// reefid-sync key: it travels with the progress, the latest wins between devices, sync.js mergeSaved) and preselected
// next time. Its answers count as any photo-quiz answer, logged quiz|s… (answer).
const CUSTOM_H = 'quiz-custom|play';
const photoQuiz = cur => cur === 'quiz' || cur === CUSTOM_H;
const modeBase = cur => (cur === CUSTOM_H ? 'quiz|s' : cur);
const customSaved = () => {
  const o = store.get(CUSTOM.KEY, null);
  return o && Array.isArray(o.g) ? o.g : [];
};
const customSel = () => customOf(customSaved(), unlocked());
// A comeback runs in this game: always in the photo quiz while there is rust (CB.r); in the custom quiz only when at
// least 2 of its genera were answered right (model.js comebackOf), else it plays as usual and leaves the comeback alone.
const cbIn = cur => CB.r > 0 && (cur !== CUSTOM_H || (customSel() || []).filter(n => introReady(n) && (P[n] || {}).ok > 0).length >= 2);
// The custom quiz's reminder of the path (Pierre, 2026-11-12: a player spent 417 answers over two days in the custom quiz,
// on purpose, to drill some genera, with 13 genera still not open; "un petit rappel du genre '13 genres t'attendent dans
// le quiz' [...] qu'on fait qu'une fois, et quand quelqu'un passe beaucoup de temps dans le custom quiz"). The custom quiz
// opens no unit (rule L4: only the photo quiz does). Once the player has given LEFTN.AT custom-quiz answers since their
// last photo-quiz answer (leftStep: a Duel-tab answer neither adds nor resets, it opens none either) while units of the
// path may still open (leftCount: the units in play not met yet that the gates allow, as the photo quiz's opening reads
// them: model.js introduced, mayOpen) and the opening hold is off (leftDue), the next break at Next shows a card (leftArm, leftShow): "13 new genera are
// waiting in the Quiz", Go to the Quiz or Keep drilling. Once ever per subject: this device's mark (reefid-<dev>custom-left
// {n: the count, shown: when}) and, signed in, the account's (core.js TOLD 'left:<subject>', sync.js toldHas / toldAdd),
// so another device of the account never shows it again. Counted in answers, on this device.
const LEFTN = {KEY: 'custom-left', AT: 100};
const leftTok = () => 'left:' + SUBJ.id;
const leftSt = () => (o => (o && typeof o === 'object' && !Array.isArray(o) ? o : {}))(store.get(sDev(LEFTN.KEY), null));
const leftStep = (st, cur) => (cur === CUSTOM_H ? {...st, n: (Number(st.n) || 0) + 1} : cur === 'quiz' ? {...st, n: 0} : st);
// hold: the opening hold is on (model.js introHold): the Quiz opens nothing new for a while, so the card waits for it to
// end (Pierre, 2026-11-12, on #850: "peut-être pas quand même" during the hold); still once ever.
const leftDue = (st, left, told, hold) => !st.shown && !told && !hold && (Number(st.n) || 0) >= LEFTN.AT && left > 0;
const leftCount = () => pool().filter(n => !introduced(n) && mayOpen(n)).length;
// Told on another device of the account, or perhaps: signed in, before the visit's first sync has merged the account's
// notices (sync.js noticesReady; Codex review #850), it waits, as the other one-time notices do (noticeLater).
const leftTold = () => (typeof noticesReady === 'function' && !noticesReady()) || (typeof toldHas === 'function' && toldHas(leftTok()));
// Its words, for k units waiting (S: the SUBJECTS record on screen, its words for its units).
const leftWords = (k, S) => ({
  kick: `New ${S.many}`,
  title: `${k} new ${k === 1 ? `${S.one} is` : `${S.many} are`} waiting in the Quiz`,
  body: `The custom quiz drills the ${S.many} you have met: new ones open only in the Quiz. Your picks stay here for later.`
});
// After each answer (answer()): the count of this subject; a photo-quiz answer starts it over.
function leftNote(cur) {
  const s0 = leftSt(),
    s1 = leftStep(s0, cur);
  if ((Number(s1.n) || 0) !== (Number(s0.n) || 0)) store.set(sDev(LEFTN.KEY), s1);
}
// After a custom-quiz answer: arms Next when the card is due (breakArm), as the Duel tab's relief card does: checked again
// at the tap (the prompt spacing, nothing on screen, the next question planned brings no card); true when it armed.
function leftArm(nb, cur) {
  if (cur !== CUSTOM_H || !leftDue(leftSt(), leftCount(), leftTold(), introHold()) || !promptOk()) return false;
  return breakArm(nb, () => {
    if (!(NEXTQ && NEXTQ.k === planKey(cur)) && hashNow() === cur) planNext(cur);
    const nx = NEXTQ && NEXTQ.k === planKey(cur) && NEXTQ.args,
      k = leftCount();
    if (hashNow() !== cur || !leftDue(leftSt(), k, leftTold(), introHold()) || !promptOk() || !lb.hidden || (nx && nextCards(cur, nx)))
      return false;
    promptMark();
    leftShow(cur, k);
    return true;
  });
}
// The card (cardShow kind 'tip', 💡): leftWords, Go to the Quiz (the main button, #practice/quiz) and Keep drilling (the
// next question; Escape too). Marked when shown. Anti-reflex as the tips: its buttons take no tap for TIP.WAIT ms, the
// focus is on the title (Enter presses nothing), a tap outside does nothing. Logged with the tips (ev 'pulse', src
// "tip:customleft", r shown, then quiz, keep, or none when the page is left with it up): at most 2 events, once ever.
function leftShow(cur, k) {
  store.set(sDev(LEFTN.KEY), {...leftSt(), shown: Date.now()});
  if (typeof toldAdd === 'function') toldAdd(leftTok());
  const w = leftWords(k, SUBJ),
    at = {m: cur.split('|')[0], n: session.n},
    log = r => ev('pulse', {r, src: 'tip:customleft', ...at});
  log('shown');
  const d = cardShow({
    kind: 'tip',
    cls: 'leftcard',
    kick: esc(w.kick),
    title: esc(w.title),
    body: `<p>${esc(w.body)}</p>`,
    primary: {text: 'Go to the Quiz', attr: 'disabled'},
    secondary: {text: 'Keep drilling', attr: 'disabled'},
    focus: 'h3',
    enter: () => {},
    bind: d => (d.querySelector('h3').tabIndex = -1),
    onClose: how => {
      log(how === 1 ? 'quiz' : how === 'route' ? 'none' : 'keep');
      if (how === 1) location.hash = hr('quiz');
      else if (how !== 'route') route();
    }
  });
  setTimeout(() => d.querySelectorAll('[data-b]').forEach(b => (b.disabled = false)), TIP.WAIT);
}
function quizCustom(h) {
  if (h === CUSTOM_H) return customSel() ? quizPhoto(CUSTOM_H) : location.replace(hr('quiz-custom'));
  viewCustom();
}
// The selection screen (Pierre, 2026-11-03). Every genus is in view, as a small photo with its name, tapped to pick it
// (aria-pressed), in one of three views (a switch, remembered on this device):
// - IMR groups, the default ("nobody picks genera alphabetically": the lecture's groups, its genera in the IMR order; ★
//   genera in the group of their look-alikes, Millepora and the bonus genera apart);
// - My mix-ups ("you know you make mistakes around these kinds of genera, so you go there"): clusters of the genera the
//   player confuses, from their own record, most confused first, each with its mix-up count (model.js mixEdges,
//   mixClusters); with no mix-up yet, the declared look-alike sets, the pairs players confuse most first (lookEdges), and
//   a line says so;
// - Progress: To review, Learning, Not seen yet, Learned (shownLevel, as My progress names them).
// Never grouped by growth form (not genus-specific; rule C4), no A-Z view (the search finds a name; until
// 2026-11-03 A-Z was the default: a device that kept it opens on IMR groups once, the choice now under a new key).
// All / None per group. Quick picks that need no knowledge replace the selection: My weakest (genera answered, lowest
// progress first), Recently missed (a miss in their last 5 answers, latest first), Look-alikes of … (a genus and its
// look-alikes: declared or confused, model.js isLook, confusable). Clear all, the count and Start (at least CUSTOM.MIN
// genera) stay in view at the bottom.
const CQ = {VIEW: 'reefid-custom-view2', OLD: 'reefid-custom-view', WEAK: 6, MISS: 8, VIEWS: ['imr', 'mix', 'prog']};
const cqPicks = play => {
  const done = n => !!(P[n] || {}).mx;
  return {
    weak: play
      .filter(n => asked(n) && !done(n))
      .sort((a, b) => genScore(a) - genScore(b) || ability(a) - ability(b))
      .slice(0, CQ.WEAK),
    miss: play
      .filter(n => /0/.test(((P[n] || {}).h || '').slice(-5)))
      .sort((a, b) => ((P[b] || {}).at || 0) - ((P[a] || {}).at || 0))
      .slice(0, CQ.MISS)
  };
};
const cqLooks = (x, play) => [x, ...play.filter(n => n !== x && (isLook(x, n) || confusable(x, n)))];
// The groups of a view: [{k, t: title (HTML), sub, mark (HTML), L: genera}], and a note above them ('' for none).
function cqGroups(view, play) {
  const mk = (m, h) => `<span class="gn" style="--g:${h}" aria-hidden="true">${esc(String(m))}</span>`,
    names = L => L.map(n => `<i>${esc(n)}</i>`).join(' · ');
  if (view === 'mix') {
    const own = mixClusters(mixEdges(play)),
      C = own.length ? own : mixClusters(lookEdges(play)),
      ord = L => play.filter(n => L.includes(n));
    return {
      note: own.length
        ? ''
        : 'No mix-ups of yours yet: here are the look-alikes of the IMR lecture and the Coral Finder book, those players confuse most first. Your own mix-ups take their place as you play.',
      G: C.map((c, i) => ({
        k: 'm' + i,
        t: names(ord(c.g)),
        sub: own.length ? `${c.w} mix-up${c.w === 1 ? '' : 's'}` : 'Look-alikes',
        mark: '',
        L: ord(c.g)
      }))
    };
  }
  if (view === 'prog') {
    const LV = [
      ['weak', 'To review'],
      ['mid', 'Learning'],
      ['new', 'Not seen yet'],
      ['ok', 'Learned']
    ];
    return {
      note: '',
      G: LV.map(([k, t]) => ({k, t: esc(t), sub: '', mark: '', L: play.filter(n => shownLevel(n)[0] === k)})).filter(g => g.L.length)
    };
  }
  const gk = n => (isBonus(n) ? '+' : isBenthic(n) ? 'F' : shownGroup(n) || '★'),
    ord = k => (typeof k === 'number' ? k : {'★': 100, F: 101, '+': 102}[k]);
  return {
    note: '',
    G: [...new Set(play.map(gk))]
      .sort((a, b) => ord(a) - ord(b))
      .map(k => {
        const gr = DATA.imrg.find(x => x.n === k),
          L = play.filter(n => gk(n) === k);
        return gr
          ? {k, t: esc(gr.t), sub: 'IMR lecture group ' + gr.n, mark: mk(gr.n, groupHue(gr.n)), L}
          : k === 'F'
            ? {k, t: 'Fire coral', sub: 'IMR benthic slate, not a hard coral', mark: mk('F', 200), L}
            : k === '+'
              ? {k, t: 'Bonus genera', sub: 'Not on the IMR list', mark: mk('+', 200), L}
              : {k, t: 'Not covered in the lecture', sub: '', mark: mk('★', 200), L};
      })
  };
}
function viewCustom() {
  // The genera unlocked only (model.js unlocked: one progression path, Pierre 2026-11-04): picking opens none.
  const play = unlocked(),
    on = new Set(customSaved().filter(n => play.includes(n))),
    qp = cqPicks(play),
    lk = play.filter(n => cqLooks(n, play).length > 1);
  try {
    localStorage.removeItem(CQ.OLD); // the A-Z / IMR groups choice of before 2026-11-03: IMR groups once
  } catch (e) {}
  let view = store.get(CQ.VIEW, 'imr'),
    q = '';
  if (!CQ.VIEWS.includes(view)) view = 'imr';
  const tile = n => {
    const p = cover(GX(n));
    return `<button type="button" class="cqtile" data-g="${esc(n)}" aria-pressed="${on.has(n)}">${p ? `<img ${thumb(p, '(max-width:599.98px) 90px, 120px')} alt="" loading="lazy">` : '<span class="cqnoph"></span>'}<i>${esc(n)}</i>${isBonus(n) ? '<small>Bonus</small>' : ''}</button>`;
  };
  $v.innerHTML = `<h2>Custom quiz</h2>
  <p class="lede">The Quiz on the genera you pick. Tap the photos of the genera you want to work on, then <b>Start</b>. Three ways to see them: <b>IMR groups</b>, the IMR lecture's groups (the genera to tell apart); <b>My mix-ups</b>, the genera you confuse with each other, the most confused first (before you have any, the look-alikes of the IMR lecture and the Coral Finder book); <b>Progress</b>, to review, learning, not seen yet, learned. <b>All</b> picks a whole group. <b>Quick picks</b> choose for you: your weakest genera, those you missed lately, or a genus and its look-alikes. Only the genera picked are asked, and the wrong choices come from them too, so look-alikes picked together are drilled together; with fewer than 4 picked, other genera make up the choices. Everything else is the photo quiz: typed questions, Again after a mix-up, look-alike duels, harder photos as you improve, and every answer counts in <a href="${esc(hr('progress'))}">My progress</a>. A genus you have not met yet shows its card first. Mastery exams only come in the Quiz: a genus that reaches ${Math.round(100 * DOM.EX)}% here takes its exam there. The achievements for runs of right answers (On a roll, Unstoppable) and Sharp eye are earned in the Quiz only: an answer here neither extends nor breaks your run. Your choice is kept for next time; the Custom quiz tab brings you back here.</p>
  <div class="tools cqtools"><input type="search" id="cqq" placeholder="Search a genus" aria-label="Search a genus" autocomplete="off"><div class="seg" role="group" aria-label="View">${[
    ['imr', 'IMR groups'],
    ['mix', 'My mix-ups'],
    ['prog', 'Progress']
  ]
    .map(([k, t]) => `<button type="button" data-cv="${k}" aria-pressed="${view === k}">${t}</button>`)
    .join('')}</div></div>
  <div class="cqquick"><span class="label">Quick picks</span><button type="button" class="chip" data-qp="weak"${qp.weak.length < CUSTOM.MIN ? ' disabled title="Answer a few questions first"' : ''}>My weakest</button><button type="button" class="chip" data-qp="miss"${qp.miss.length < CUSTOM.MIN ? ' disabled title="Nothing missed lately"' : ''}>Recently missed</button><select class="chip" id="cqlk" aria-label="Look-alikes of a genus"><option value="">Look-alikes of…</option>${lk.map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join('')}</select></div>
  <div class="cq"></div>
  <div class="cqbar"><span class="cqn" aria-live="polite"></span><button type="button" class="linkish" data-clear>Clear all</button><button type="button" class="next" data-start>Start</button></div>`;
  const box = $v.querySelector('.cq'),
    n = $v.querySelector('.cqn'),
    st = $v.querySelector('[data-start]'),
    cl = $v.querySelector('[data-clear]');
  const show = () => {
    box.querySelectorAll('.cqtile').forEach(b => {
      b.setAttribute('aria-pressed', String(on.has(b.dataset.g)));
      b.hidden = !!q && !b.dataset.g.toLowerCase().includes(q);
    });
    box.querySelectorAll('.cqg').forEach(g => {
      const T = [...g.querySelectorAll('.cqtile:not([hidden])')];
      g.hidden = !T.length;
      const all = g.querySelector('.cqall');
      if (all) all.textContent = T.length && T.every(b => on.has(b.dataset.g)) ? 'None' : 'All';
    });
    const k = on.size;
    // The genera picked, named under the count: a quick pick or a long list shows what is in without scrolling.
    n.innerHTML = `<b>${k >= CUSTOM.MIN ? `${k} genera` : k ? 'Pick one more genus' : `Pick at least ${CUSTOM.MIN} genera`}</b>${
      k
        ? `<small>${play
            .filter(x => on.has(x))
            .map(x => `<i>${esc(x)}</i>`)
            .join(', ')}</small>`
        : ''
    }`;
    st.disabled = k < CUSTOM.MIN;
    cl.disabled = !k;
  };
  // Saved at each change, in the game's order (customOf keeps that order). only: a quick pick replaces the selection.
  const set = (L, v, only) => {
    if (only) on.clear();
    L.forEach(x => (v ? on.add(x) : on.delete(x)));
    store.set(CUSTOM.KEY, {g: play.filter(x => on.has(x)), t: Date.now()});
    show();
  };
  const draw = () => {
    const {note, G} = cqGroups(view, play);
    box.innerHTML =
      (note ? `<p class="note cqnote">${esc(note)}</p>` : '') +
      G.map(
        g =>
          `<section class="cqg" data-k="${esc(String(g.k))}"><div class="cqh">${g.mark}<span class="cqht">${g.t}${g.sub ? ` <small>${esc(g.sub)}</small>` : ''}</span><button type="button" class="linkish cqall" aria-label="All or none of this group">All</button></div><div class="cqtiles">${g.L.map(tile).join('')}</div></section>`
      ).join('');
    box.querySelectorAll('.cqtile').forEach(b => (b.onclick = () => set([b.dataset.g], !on.has(b.dataset.g))));
    // All of a group (the photos the search leaves in view), or none once they all are.
    box.querySelectorAll('.cqall').forEach(
      b =>
        (b.onclick = () => {
          const L = [...b.closest('.cqg').querySelectorAll('.cqtile:not([hidden])')].map(x => x.dataset.g);
          set(L, !L.every(x => on.has(x)));
        })
    );
    show();
  };
  $v.querySelectorAll('[data-cv]').forEach(
    b =>
      (b.onclick = () => {
        view = b.dataset.cv;
        store.set(CQ.VIEW, view);
        $v.querySelectorAll('[data-cv]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
        draw();
      })
  );
  const qi = $v.querySelector('#cqq');
  qi.oninput = () => {
    q = qi.value.trim().toLowerCase();
    show();
  };
  $v.querySelectorAll('[data-qp]').forEach(b => (b.onclick = () => set(qp[b.dataset.qp], true, true)));
  const ls = $v.querySelector('#cqlk');
  ls.onchange = () => {
    if (ls.value) set(cqLooks(ls.value, play), true, true);
    ls.value = '';
  };
  cl.onclick = () => set([...on], false);
  st.onclick = () => {
    if (!customSel()) return;
    if (typeof syncSoon === 'function') syncSoon(); // the choice reaches the player's other devices
    go(CUSTOM_H);
  };
  draw();
}
// A switch of subject (app.js subjectLoad): the typed names are the subject's; on a real switch the questions planned
// ahead, the "Again" and duel spacing and this visit's trail go too (a short visit, keep, keeps them); the surprises shown
// stay, per subject (WINKS).
if (typeof SUBJ_HOOKS !== 'undefined')
  SUBJ_HOOKS.push(keep => {
    TYPEN = null;
    if (keep) return;
    NEXTQ = null;
    ONQ = null;
    SHOWNQ = null;
    rematch = [];
    twoAt = -Infinity;
    twoPair = '';
    DUELRUN = {up: 0, shown: 0}; // the other subject's hold: a new duel run
    DUELBACK = null;
    session = {ok: 0, n: 0, h: []};
  });
