// IMR Reef ID: the quiz screens: the question (trail, hint, stage fit), the answer and its feedback, the one-tap
// question (pulse), the bonus genera offer, the next question planned and preloaded (planNext, NEXTQ), the photo quiz
// and the duels. What chooses units, photos and choices is model.js's; loaded right after it (index.html order).
function quizNav() {
  return '';
}
// Session trail: the last 10 answers of this visit as 10 small cells next
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
// The Duel tab's first ? paragraph for a subject with a help of its own (app.js UNITS help: the fish, the sea slugs), in
// the subject's words; src: where its look-alike pairs come from.
const duelLede = src =>
  `<p class="lede">Two ${SUBJ.many} that are often confused (${src}, and your own mix-ups): say which one is in the photo. Pick an answer (or press 1-2); <b>Next</b> (or Enter) goes on. The duels pair only the ${SUBJ.many} you have met in the quiz, and every answer counts in your progress as in the quiz.</p>`;
// The custom quiz's ? paragraph (cur: the game on screen; '' on any other), in the subject's words (SUBJ.one, SUBJ.many):
// every subject's help (gameHelp, UNITS help) adds it.
const customPlayLede = cur =>
  cur === CUSTOM_H
    ? `<p class="lede"><b>Custom quiz</b>: only the ${SUBJ.many} you picked are asked (the Custom quiz tab changes them), and the wrong choices come from them too, from other ${SUBJ.many} only when you picked fewer than 4. A ${SUBJ.one} you have not met yet comes with its card. The rest works as in the Quiz, and every answer counts the same, except the mastery exam: its questions only come in the Quiz, so a ${SUBJ.one} that reaches ${Math.round(100 * DOM.EX)}% here takes its exam there. The achievements for runs of right answers (On a roll, Unstoppable) and Sharp eye are earned in the Quiz only: an answer here neither extends nor breaks your run.</p>`
    : '';
// The game rules (behind the ? button).
const gameHelp = cur =>
  UNITS[SUBJ.id].help
    ? UNITS[SUBJ.id].help(cur)
    : `<p class="lede">${cur.startsWith('quiz-duel') ? 'Two genera that are often confused (look-alikes listed by the IMR lecture or the Coral Finder book, and your own mix-ups): say which one is in the photos.' : 'Name the genus in the photos: all the photos of a question show the same coral, at one or several zoom levels.'}
  Pick an answer (or press 1-${cur.startsWith('quiz-duel') ? 2 : 4}). Stuck? When a question has no corallite photo in view, <b>Show the corallites</b> adds one. After answering you get the verdict and one line that settles it (how to tell the genus from your answer, or its first ID tip); <b>More</b> opens the IMR ID tips and why the other ${cur.startsWith('quiz-duel') ? 'genus is' : 'choices are'} wrong; <b>Next</b> (or Enter) goes on.${cur.startsWith('quiz-duel') ? ' The achievements for runs of right answers (On a roll, Unstoppable) and Sharp eye are earned in the Quiz only: an answer here neither extends nor breaks your run.' : ' The other choices start easy and its look-alikes come in as you get a genus right.'} Every answer counts in <a href="${esc(hr('progress'))}">My progress</a>. New genera come one at a time, each on its card; <b>Open all genera</b> (My progress) opens them all at once, and if the questions then get much harder for you, a card offers once to go back to one at a time. Once you have met every genus of the slate, you can add <b>bonus genera</b>: corals off the IMR list that are common at Dauin (⚙ Settings, Bonus genera).</p>
  ${customPlayLede(cur)}
  <p class="lede"><b>Photos</b>: each genus starts with its best photos, preferably a colony photographed at several zoom levels (never views of different colonies mixed), and new ones keep coming in; the more you get a genus right, the harder its photos get and the more often a single view is shown alone (colony, close-up or corallites), and a mistake eases them off. A genus's % is the share of its photos you would name alone and typed, as far as your answers on it have shown: a right answer on a hard photo or a typed one raises it most, a mistake takes it back down; it fills up to 95%, and it is learned (100%) once you pass its mastery exam, ${EXAM.n} hard questions slipped unannounced into the Quiz: see ? on <a href="${esc(hr('progress'))}">My progress</a>.</p>${
    cur.startsWith('quiz-duel')
      ? ''
      : `
  <p class="lede"><b>Typed questions</b>: once you know a genus well (from ${Math.round(100 * TYPED.from)}%), some of its questions ask you to type its name instead of picking it, more and more as it gets closer to learned: that is how you will name corals on a dive or in ReefCloud. Old names are accepted, and a small typo still counts as right, but you retype the name once to learn its spelling; <b>I don't know</b> shows the answer (it counts as a miss). A typed right answer counts in full, as much as a pick against its look-alikes: there is nothing to guess from.</p>`
  }`;
let EXAMQ = null; // the genus whose exam question is on screen (set by question, read by answer)
// The question on screen, for Send feedback (app.js helpEnd: feedback sent from a game carries the question's unit and
// its photos, as a report does): {g, ph, el}, read only while its question is on screen; ph grows
// with the corallites hint and the other views revealed once answered (the mix-up comparison's photo is another unit's).
let QREP = null;
const qNow = () => (QREP && QREP.el && QREP.el.isConnected ? {g: QREP.g, ph: QREP.ph} : null);
// Typed questions (model.js TYPED): the player types the name. Matching: core.js typeMatchIn (spelling tolerance, old
// names); the form and the phone keyboard's behaviour are the Lab prototype's (proto/type.js).
// TYPEDQ: the typed question on screen and what was typed ({t: genus asked, m: the match or null, text}), read by answer.
// SCIQ: a question on a species by its scientific name with choices ({t: the unit asked, v: its display, app.js sciShow}),
// read by answer for the mode's suffix.
let TYPEDQ = null,
  TYPEN = null,
  SCIQ = null;
const TYPEDQ_RJ = 10; // the refused texts a typed answer logs at most (typeBind rj)
// Every name a player may type: every genus the app knows (the slate's and the extra ones) and their old names.
// For fish, every teaching entry and the other names it goes by (core.js treeTypeNames), read as whole names.
const typeNames = () => {
  // read again when the data, the subject, Pierre's curation (its names: curation.json fish.names) or the subject's own
  // key (UNITS namesKey: the fish genera in the game, app.js sciNow) changes
  const c = typeof CUR === 'undefined' ? null : CUR,
    k = UNITS[SUBJ.id].namesKey ? UNITS[SUBJ.id].namesKey() : '';
  if (!TYPEN || TYPEN.d !== DATA || TYPEN.s !== SUBJ || TYPEN.c !== c || TYPEN.k !== k)
    TYPEN = {d: DATA, s: SUBJ, c, k, L: UNITS[SUBJ.id].names()};
  return TYPEN.L;
};
// rk: the class of the unit asked (app.js kindRank: its rank and its kind of name): a typed answer is read among the
// names of that class only (a fish scientific genus, Chromis, against the genera; the IMR sub-entry Chromis names the
// Damselfish entry on an entry question; a species' scientific name against the scientific names, never a common name).
const typeMatch = (text, rk = '') => {
  const m = typeMatchIn(
    typeNames().filter(o => kindRank(o.g) === rk),
    text,
    UNITS[SUBJ.id].norm
  );
  return typeDigits(m, text) ? m : null;
};
// A name told apart by its number (a species with no name yet, Goniobranchus sp. 5): the norm keeps letters only, so a
// reading of such a unit holds only when the text carries the same digits as its name (Goniobranchus sp. 6 or sp. reads as
// nothing). True for any other reading.
const typeDigits = (m, text) => {
  if (!m || !m.g || m.shared || m.near) return true;
  const d = s => String(s || '').replace(/\D/g, ''),
    n = d(m.old || (GX(m.g) || {}).name);
  return !n || d(text) === n;
};
// What a typed text that is no unit of rank rk names instead (core.js typeElse): the rank word of another unit it names
// ('family'), 'common' for a common name, '' for nothing. Only on a question below the subject's rank (a fish scientific
// genus, a sea slugs' genus: its tree's top rank is the family), from the subject's own lists (UNITS typeOther); none for
// a subject without them.
const typeKind = (text, rk) => {
  const U = UNITS[SUBJ.id],
    at = String(rk || '').split(':')[0] || unitRankOf(SUBJ), // the rank of the class asked (kindRank)
    x = at !== SUBJ.rank && U.typeOther ? U.typeOther(at) : null;
  if (!x) return '';
  // The species by their scientific names stay out: the name index already says what a species' name is (identical
  // nudges whether their level is on or off).
  return typeElse(
    text,
    typeNames().filter(o => kindRank(o.g) !== rk && kindOf(o.g) !== 'sci'),
    {...x, rank: g => rankOf(g) || unitRankOf(SUBJ), own: g => (GX(g) || {}).imrName},
    U.norm
  );
};
// The nudge for a text typeKind reads: it says what kind of name was typed and what the
// question needs, nothing more: never a scientific name, and the same whether it names the photo's fish or another.
const typeKindMsg = (text, kind, one) =>
  `“${text}” is ${kind === 'common' ? 'a common name' : 'a ' + kind}: this question needs a ${one}'s scientific name.`;
// S: the subject the form names and reads, with its unit word (the quiz's own and Tools › Type the genus's, on the subject on screen).
const typeForm = (S = SUBJ) => `<form class="tyform" autocomplete="off">
    <label for="tyin">${S.one[0].toUpperCase() + S.one.slice(1)}</label>
    <input id="tyin" name="genus" type="text" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" enterkeyhint="done" placeholder="Type the ${S.one}">
    <div class="tybtns"><button type="submit" class="next">Check</button><button type="button" class="next sec" data-idk>I don't know</button></div>
    <p class="tymsg" aria-live="polite"></p></form>`;
// Binds a typed form (docs/ARCHITECTURE.md "Typed questions"): done(m, text, sp, rj) once answered, m the unit read
// ({g, old, exact}) or null for "I don't know". A text read as no unit, or as two, is no answer but a nudge to check it
// (typeKind); rj: those texts in order (TYPEDQ_RJ, 40 characters each); z: a smaller fault's kind (o.part). rk, one: the
// class asked (app.js kindRank) and its word (typeMatch).
// o.t, the unit asked: the spelling step (core.js typeVerdict): its name typed close is right but retyped once after a
// warm "So close!" (never a cold no: docs/decisions/2026-11-18-decisions-from-app-comments.md; Show me skips it); sp = {r: 1 when retyped exactly, else 0; text: the retype}. o.close(): the retype is asked
// (the quiz stops its clock: the seconds logged are the recognition's, not the spelling's).
function typeBind(form, done, S = SUBJ, rk, one = S.one, o = {}) {
  const inp = form.querySelector('input'),
    msg = form.querySelector('.tymsg'),
    idk = form.querySelector('[data-idk]');
  let over = false,
    first = null; // {m, text}: the close reading, while the player retypes it
  const rj = []; // the texts refused, in order (done's rj)
  const end = (m, text, sp, z) => {
    over = true;
    msg.textContent = '';
    form.classList.remove('retry');
    if (!m && !z) inp.value = '';
    inp.disabled = true;
    form.querySelectorAll('button').forEach(b => (b.disabled = true));
    inp.blur(); // the phone's keyboard closes, so the feedback is in view
    done(m, text, sp, rj.slice(), z);
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
    // A smaller fault (o.part: a species' common name or its genus alone where its scientific name is asked, Q394), read
    // before the nudges and the spelling step: it is the answer, a miss, with its kind (z).
    const z = o.part && (!m || m.near || m.known) ? o.part(text) : '';
    if (z) return end(null, text, undefined, z);
    if (!m || m.near || m.known) rj.length < TYPEDQ_RJ && rj.push(text.slice(0, 40));
    // o.say: what else a text is on a question with no typeKind of its own (a species by its scientific name: app.js sciSay)
    const kind = !m && S === SUBJ ? typeKind(text, rk) || (o.say ? o.say(text) : '') : '';
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
// adopted: docs/decisions/2026-11-18-decisions-from-app-comments.md): the two names as shown, the letters that differ in
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
// The unit a typed reading m gives on a question on unit t: t when the name fits it (core.js typeFits: a name several
// units share, Holocentridae, or a name of part of t on a photo it designates, sp: its species); '' for "I don't know"
// and for a shared or part's name that does not fit (a miss on t only, no mix-up, its text logged); else the unit named.
const typeUnit = (m, t, sp) => (!m ? '' : typeFits(m, t, sp) ? t : m.shared || m.g === t ? '' : m.g || '');
// Units as a list in a sentence: "A", "A and B", "A, B and C".
const unameList = L => L.join(', ').replace(/, ([^,]*)$/, ' and $1');
// A unit as a name typed reaches it (core.js treeNameIndex: r = {vr, n, of}, its role and how many of its species carry
// the name): "some Wrasses" for a word only some of its species carry, else "the Shrimpfishes".
const typeWhose = (g, r = {}) => `${['k', 'gc'].includes(r.vr) && !(r.n && r.n === r.of) ? 'some' : 'the'} ${uname(g)}`;
// What a name below the family says of unit g (r: its reading, as typeWhose's): "“Iniistius” is a genus of the Wrasses."
// and the like, '' for the family's own names; not: a name of part of g, the photo not of that part ("…, not this one.").
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
// How a typed answer was read, said after it: an old name or a tolerated spelling ('' when exact, or when the spelling
// step said it: typeStep); a name below the family, what it is (typeSays); a shared name (m.shared), what it is for t and
// whom else it names. ps: the photo's species (core.js typeFits): a part of t not on it says "not this one".
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
// A smaller fault said after the answer (typeBind z, Q394): what the text typed was, and what the question needs (the
// feedback then gives the scientific name).
const partRead = (z, text) =>
  z === 'cn'
    ? `“${esc(text)}” is its common name: this question needs its scientific name.`
    : `“${esc(text)}” names its genus only: this question needs the species' scientific name.`;
// The spelling step's outcome (typeBind sp) for the verdict's line ("✓ Yes, but not quite: it's spelled Galaxea"): null
// when none was asked or the retype was exact; else {spelled: the name, the letters got wrong marked (typeSpell), old,
// alt} (an old name: the line names the unit after it). A common name typed (m.oft, core.js fishOften): {oft}.
const typeStep = (m, text, sp, t) => {
  if (!m) return null;
  const oft = m.shared ? ((m.by || {})[t] || {}).oft : m.oft;
  if (!sp || m.exact || sp.r) return oft ? {oft} : null;
  const name = (m.shared && m.name) || m.old || unameT(m.g || t),
    s = `<span class="tysp">${typeSpell(sp.text || text, name)}</span>`;
  // A name several units share (razorfish, Holocentridae): the name as it is spelled, nothing more: it is no old name
  // nor another name of the unit.
  if (m.shared) return {spelled: s, plain: true, old: false, alt: false};
  return {spelled: !m.old && uplain(m.g || t) ? s : `<i>${s}</i>`, old: !!m.old, alt: !!m.alt};
};
// Time to answer and photo enlarged (the sheet's Seconds, Enlarged; docs/LEARNING.md "Response time"): the clock starts
// when the first photo is in, again when a card over the question closes (reading it is not looking), stops while
// hidden; zm: 1 once a photo is enlarged. The seconds weigh a right answer's steps (core.js rtWeight); zm is logged only.
// pre: the seconds already spent on this question before the player left it and came back (a kept question, pendTake):
// the time away is no time spent recognising, the time looked at it before leaving still is.
const QCLOCK = {n: 0, t0: null, off: 0, hid: null, zm: 0, pre: 0};
const qclockStart = () => {
  const t = performance.now();
  Object.assign(QCLOCK, {t0: t, off: 0, hid: document.hidden ? t : null});
};
const qclockGo = () => QCLOCK.t0 === null && qclockStart();
const qclockAgain = () => QCLOCK.t0 !== null && (qclockStart(), (QCLOCK.pre = 0));
document.addEventListener('visibilitychange', () => {
  if (document.hidden) ((QCLOCK.hid = performance.now()), pendClock());
  else if (QCLOCK.hid !== null) ((QCLOCK.off += performance.now() - QCLOCK.hid), (QCLOCK.hid = null));
});
addEventListener('pagehide', () => pendClock());
// at: the reading's moment (performance.now()); a page being closed while hidden reads at the moment it was hidden.
const qclockRead = (at = performance.now()) =>
  QCLOCK.t0 === null ? null : Math.round(Math.max(0, Math.min(600, (at - QCLOCK.t0 - QCLOCK.off) / 1000 + QCLOCK.pre)) * 10) / 10;
// A new question's clock (question(), winkShow): stopped and not enlarged; the first of its photos to be in starts it,
// whichever (one cached or quicker than the first in the page would otherwise be looked at off the clock).
function qclockArm() {
  const qn = (QCLOCK.n = (QCLOCK.n || 0) + 1),
    ims = [...$v.querySelectorAll('.qstage .qph img')]; // a Find the X's tiles start it in its gate (question), all four in
  Object.assign(QCLOCK, {t0: null, off: 0, hid: null, zm: 0, pre: 0});
  if (ims.some(im => im.complete && im.naturalWidth)) qclockGo();
  else ims.forEach(im => im.addEventListener('load', () => QCLOCK.n === qn && qclockGo(), {once: true}));
}
function question(cur, target, choices, prompt, set, kq) {
  // Its photos join the session's window (model.js SEENQ): not drawn again in the next questions while another is left.
  seenAdd([cur, target, choices, prompt, set]);
  EXAMQ = set.exam ? target : null;
  TYPEDQ = set.typed ? {t: target, m: null, text: ''} : null;
  const ph = set.shown,
    lab = SUBJ.views.length > 1 ? VIEW_LABEL : {}; // one view (fish): no caption
  // A species asked by its scientific name with choices: how its names show (app.js sciShow, the display schedule), the
  // same for its four choices, logged in the mode (answer: |sc, |so). sub: a choice's small line, the scientific name of
  // a species by its common name, the common name of one by its scientific name while shown.
  // A kept question comes back with the display it was shown with (PENDSCI, q.sv): sciShow draws at random between two.
  SCIQ = !set.typed && !set.find && kindOf(target) === 'sci' ? {t: target, v: PENDSCI || sciShow(target)} : null;
  PENDSCI = null;
  const sub = c => (SCIQ ? (SCIQ.v === 'sc' ? (GX(c) || {}).cn || '' : '') : (GX(c) || {}).sci || '');
  let answered = false,
    hintShown = false;
  // data-f names the photo whatever its file: an iNaturalist photo not downloaded yet (r: 1, a candidate just added) keeps
  // iNaturalist's file names (app.js img()), which resized() leaves alone (the failed-photo report, tests).
  const fig = (p, k, n = ph.length) =>
    `<figure class="qph"${p.ar ? ` data-r="${p.ar}"` : ''}${p.imr ? ' data-imr' : ''} style="--qbg:url('${img(p, 's')}')"><button type="button" class="zoom" data-q="${k}" aria-label="Enlarge photo"><img src="${qsrc(p, n)}" data-lo="${img(p, 's')}"${p.f ? ` data-f="${esc(p.f)}"` : ''} alt="${SUBJ.what} to identify${p.view && lab[p.view] ? ', ' + lab[p.view].toLowerCase() + ' view' : ''}">${ZOOMI}</button>${p.view && lab[p.view] ? `<figcaption>${lab[p.view]}</figcaption>` : ''}</figure>`;
  // Find the X (planPhoto, FIND): the four photos are the choices, square tiles in the stage (app.js tileSrc), each the
  // button of its unit (data-c), in the order of the choices; no name buttons. Their names come with the answer (go).
  const fx = set.find || null,
    tile = (x, i) =>
      `<figure class="fxt"><button type="button" data-c="${esc(x.n)}" aria-label="Photo ${i + 1}"><img src="${tileSrc(x.p)}" data-lo="${img(x.p, 's')}"${x.p.f ? ` data-f="${esc(x.p.f)}"` : ''} alt="${SUBJ.what} ${i + 1}"><kbd>${i + 1}</kbd></button></figure>`;
  // One screen, no scrolling: the photos fill the stage (sized to the window), choices and feedback sit beside them.
  $v.innerHTML = `${gameHelp(cur)}<div class="q bleed${fx ? ' qfind' : ''}">
    <div class="qstage${fx ? ' qfx' : ''}">${fx ? fx.map(tile).join('') : ph.map((p, k) => fig(p, k)).join('')}</div>
    <aside class="qside">
      <div class="qtop"><p class="prompt">${prompt}</p>${trail()}${quizNav(cur)}</div>
      ${set.typed ? `<div class="tyq">${typeForm(GX(target).one ? {...SUBJ, one: GX(target).one} : SUBJ)}</div>` : fx ? '' : `<div class="ans"${kq ? ` data-k="${kq}"` : ''}>${choices.map((c, i) => `<button type="button" data-c="${esc(c)}"${uplain(c) ? ' class="plain"' : ''}><kbd>${i + 1}</kbd>${sub(c) ? `<span class="csn">${esc(unameT(c))}<small${SCIQ ? ' class="cnu"' : ''}>${esc(sub(c))}</small></span>` : esc(unameT(c))}</button>`).join('')}</div>`}
      ${set.hint ? '<button type="button" class="linkish" id="hintb">Show the corallites (hint)</button>' : ''}
      <div id="after"></div>
    </aside></div>`;
  QOPEN = true; // a question waits for its answer: no reload for a new version until Next (app.js UPDATED)
  const qrep = (QREP = {g: target, ph: (fx ? fx.map(x => x.p) : ph).map(p => p.f).filter(Boolean), el: $v.querySelector('.q')});
  bindQuizNav(cur);
  fitStage();
  qclockArm();
  // Find the X: its photos are its choices, so it is answered only once all four are in (a tile still loading is a choice
  // the player cannot see), and its clock starts then. One that fails for good keeps them closed: app.js's error listener then
  // offers another question, and nothing is scored or logged.
  if (fx) {
    const q = $v.querySelector('.q'),
      tiles = [...q.querySelectorAll('.qstage .fxt img')],
      inn = new Set(tiles.filter(im => im.complete && im.naturalWidth)),
      gate = () => {
        const all = inn.size === tiles.length && !q.classList.contains('qnone');
        // its clock from the moment it can be answered: a tile's download is no time spent recognising (rtWeight)
        if (all) qclockGo();
        qAnswers(q, all);
      };
    tiles.forEach(im => im.addEventListener('load', () => (inn.add(im), gate())));
    gate();
  }
  const hb = document.getElementById('hintb');
  const showHint = () => {
    if (hintShown || !set.hint) return;
    hintShown = true;
    const st = $v.querySelector('.qstage');
    st.insertAdjacentHTML('beforeend', fig(set.hint, ph.length, ph.length + 1));
    qrep.ph = [...qrep.ph, set.hint.f].filter(Boolean); // its photos as shown
    if (hb) hb.remove();
    fitStage();
    // Phones show the photos as a swipe strip: bring the corallites in (else only a sliver shows at the edge). Only the
    // strip scrolls, never the page.
    const h = st.lastElementChild;
    if (h && st.scrollWidth > st.clientWidth + 4) st.scrollTo({left: h.offsetLeft - st.offsetLeft, behavior: 'smooth'});
  };
  if (hb) hb.onclick = showHint;
  // Keys: 1-4 answer, Enter goes to the next question.
  const keys = e => {
    if (!document.body.contains($v.querySelector('.q'))) return document.removeEventListener('keydown', keys);
    // Keys typed in the enlarged photo are the viewer's (its Escape reaches this handler before the viewer closes, so the
    // handler stays: removed, 1-4 would be dead for the rest of the question).
    if (!lb.hidden || e.target.closest('input, textarea, select') || document.getElementById('tour')) return; // never an answer under the tour
    const b = !answered && $v.querySelectorAll('[data-c]')[Number(e.key) - 1];
    if (b) {
      e.preventDefault();
      b.click();
    }
  };
  document.addEventListener('keydown', keys, {signal: viewKeys()});
  $v.querySelector('.q').addEventListener('click', e => {
    // A Find the X once answered: each tile enlarges the four photos whole, named (go).
    const zf = fx && e.target.closest('[data-fz]');
    if (zf) {
      tipZoomed();
      return zoom(
        fx.map(x => ({...x.p, genus: x.n})),
        Number(zf.dataset.fz)
      );
    }
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
    const hintOpen = hintShown, // read before showHint opens it for the feedback: a hint left closed was not seen
      cor = hintOpen || ph.some(p => p.view === 'macro' || p.view === 'close'),
      tm = tm0 || {rt: qclockRead(), zm: QCLOCK.zm};
    showHint();
    reveal();
    answered = true;
    QOPEN = false;
    pendDone(); // an answered question is no more kept: the next one is drawn
    // A Find the X: the photo tapped (its four units are distinct, so the tile of the unit given), logged with the answer.
    const tap = fx ? (fx.find(x => x.n === c) || {}).p : null;
    answer(cur, c, target, set.hint ? [...ph, set.hint] : ph, cor, hintOpen || !set.hint ? null : set.hint, tm, tap);
    // Find the X: each tile now says its unit (the right one ticked, the one tapped crossed: never colour alone), its
    // source (rule P5) and opens the four photos whole.
    if (fx)
      $v.querySelectorAll('.qstage .fxt').forEach((f, i) => {
        const x = fx[i],
          k = x.n === target ? 'fok' : x.n === c ? 'fko' : '';
        if (k) f.classList.add(k);
        f.insertAdjacentHTML(
          'beforeend',
          `<figcaption>${k ? `<span aria-hidden="true">${k === 'fok' ? '✓' : '✗'}</span> ` : ''}${uname(x.n)}</figcaption><button type="button" class="zoom" data-fz="${i}" aria-label="Enlarge ${esc(unameT(x.n))}">${ZOOMI}</button>${photoSrc(x.p)}`
        );
      });
    const tr = $v.querySelector('.trail');
    if (tr) tr.outerHTML = trail();
  };
  $v.querySelectorAll('[data-c]').forEach(b => (b.onclick = () => go(b.dataset.c)));
  // A typed question: the genus read is the answer ('' for "I don't know"), what was typed goes with it (TYPEDQ).
  const tf = $v.querySelector('.tyform'),
    // the photo's own species (app.js photoTaxon): a name of part of the unit counts only when it designates them
    tx = tf && photoTaxon(ph, target),
    typeSp = tx && tx.rank === 'species' ? [tx.id] : [];
  if (tf)
    typeBind(
      tf,
      (m, text, sp, rj, z) => {
        Object.assign(TYPEDQ || {}, {m, text, sp, rj, ps: typeSp, z});
        go(typeUnit(m, target, typeSp));
      },
      SUBJ,
      kindRank(target),
      GX(target).one || SUBJ.one,
      {
        t: target,
        sp: typeSp,
        // A smaller fault (Q394 A): on a species asked by its scientific name, its common name or its genus alone typed
        // (app.js sciPart) is the answer, a miss weighed down (core.js PART), never a gain.
        // Another species' common name or another genus: the nudge says what it is (app.js sciSay), never an answer.
        ...(kindOf(target) === 'sci' ? {part: text => sciPart(text, target), say: text => sciSay(text)} : {}),
        // The spelling step (typeBind): the answer is given, only its spelling waits; the hint stays as it was. The nudge
        // makes the answer column taller: the stage gives up that room so it stays on one screen.
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
  // and measured under it the stage would get the minimum height.
  pageHelp();
  const tab = tabH();
  q.style.setProperty('--qh', Math.max(260, innerHeight - q.getBoundingClientRect().top - window.scrollY - 16 - tab) + 'px');
  const st = q.querySelector('.qstage'),
    fxs = st.classList.contains('qfx'); // a Find the X: square tiles
  // Phones (one column): the photo takes all the height the question and answers leave, so no gap is left under it.
  // After an answer the feedback is a bottom sheet over the page: the photo shrinks to the space left above it, so it stays in view.
  if (isStacked()) {
    const side = q.querySelector('.qside'),
      aft = q.classList.contains('done') && document.getElementById('after');
    st.style.height =
      aft && getComputedStyle(aft).position === 'fixed'
        ? Math.max(120, aft.getBoundingClientRect().top - st.getBoundingClientRect().top - 8) + 'px'
        : Math.max(180, parseFloat(q.style.getPropertyValue('--qh')) - (side ? side.offsetHeight : 240) - 10) + 'px';
    // Find the X: its 2 x 2 square tiles need no more height than the stage's width (no empty band under them).
    if (fxs && !aft) st.style.height = Math.min(parseFloat(st.style.height), st.clientWidth + 8) + 'px';
  } else st.style.height = '';
  const n = st.children.length,
    W = st.clientWidth,
    H = st.clientHeight;
  // Grid of the views: the column count that gives the photos the most room (phones and tablets assume 4:3 photos).
  // Desktop: each photo's shape is known before it loads (data.json `ar`, tools/apply_ratios.py; 4:3 if missing), so the
  // grid that shows the most photo area wins: portrait or square views go side by side instead of in two wide
  // half-blurred bands. The stage keeps its full height (never a photo above an empty half screen), and nothing moves
  // while the photos load.
  // The two compared photos after a wrong answer (.qvs) are shown whole at every size: whatever the size class, the grid
  // that shows both photos largest, by their known shapes and the stage's real gap, wins (stacked first on a tie): stacked
  // on a normal phone, side by side when a tall feedback sheet leaves a small stage (Pierre, 2026-11-21).
  const rs = [...st.children].map(f => +f.dataset.r || 4 / 3),
    vs = st.classList.contains('qvs'),
    gap = (vs && parseFloat(getComputedStyle(st).columnGap)) || 8;
  let best = [n, 1, 0];
  for (let c = 1; c <= n; c++) {
    const r = Math.ceil(n / c),
      cw = (W - gap * (c - 1)) / c,
      ch = (H - gap * (r - 1)) / r;
    const score = fxs
      ? Math.min(cw, ch)
      : isStacked() && !vs
        ? Math.min(cw, (ch * 4) / 3)
        : rs.reduce((a, x) => a + Math.min(cw, ch * x) ** 2 / x, 0);
    if (score > best[2] * 1.02) best = [c, r, score];
  }
  st.style.gridTemplateColumns = `repeat(${best[0]}, minmax(0, 1fr))`;
  st.style.gridTemplateRows = `repeat(${best[1]}, minmax(0, 1fr))`;
  // Find the X: its square tiles take the largest square a cell holds (app.css .fxt), side by side in the middle.
  if (fxs) {
    const side = Math.max(0, Math.floor(Math.min((W - 8 * (best[0] - 1)) / best[0], (H - 8 * (best[1] - 1)) / best[1])));
    st.style.setProperty('--fx', side + 'px');
    st.style.gridTemplateColumns = `repeat(${best[0]}, ${side}px)`;
    st.style.gridTemplateRows = `repeat(${best[1]}, ${side}px)`;
  }
  // Phones and tablets: the stage takes all the height the question and answers leave (computed above, before any photo
  // loads, so nothing moves while they load). Each photo fills its box (object-fit: cover, class .cov on its figure) when that
  // crops at most ~23% of it; a photo of another shape is shown whole on its blurred background. The bigger photo wins
  // over a fixed 4:3 box; the full frame is one tap away in the lightbox.
  if (isStacked() && !st.classList.contains('qvs') && best[1] === 1) {
    const colW = st.children[0].getBoundingClientRect().width,
      h = st.getBoundingClientRect().height;
    const boxR = colW / h;
    st.querySelectorAll('.qph').forEach(f => {
      const i = f.querySelector('img');
      if (!i) return;
      // A small photo (some IMR lecture originals are ~300 px wide) is never blown up to fill: shown whole at its own
      // size on the blurred background instead, sharp rather than soft.
      const set = () => {
        const r = i.naturalWidth / i.naturalHeight,
          up = Math.max(colW / i.naturalWidth, h / i.naturalHeight);
        f.classList.toggle('cov', !!r && Math.max(boxR / r, r / boxR) <= 1.3 && up <= upMax(f));
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
// photo smaller than its box would show on a blown-up copy of itself instead of the blurred background. Load events do
// not bubble, hence the capture.
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
// box is shown whole at its own size on the blurred background instead (sharp beats big for the few small IMR lecture
// photos). Genus sheet tiles keep filling their box.
const LOWRES = 1.15;
// An IMR lecture photo (data-imr) is never drawn larger than its own pixels (ROADMAP "IMR lecture photos never
// upscaled", Pierre 2026-11-18 "C12 A+D"): no tolerance for it; every other photo keeps LOWRES.
const upMax = fig => (fig && fig.hasAttribute('data-imr') ? 1 : LOWRES);
const fitLow = fig => {
  const i = fig.querySelector('img');
  if (!i) return;
  const chk = () => {
    const r = fig.getBoundingClientRect();
    fig.classList.toggle('lo', !!i.naturalWidth && Math.max(r.width / i.naturalWidth, r.height / i.naturalHeight) > upMax(fig));
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
// The player's time net of the photo's (core.js rtWeight ti, ptimeQ; docs/LEARNING.md "The player's time net of the
// photo's"): a question's time term, the mean of its photos' served time terms (model.js PTM; a photo without one: 0),
// which the scorer takes off a right answer's z and the scoring record keeps (i). Only with a script whose replay does
// the same (core.js RTNET_SHEET, rule D4); otherwise undefined: the answer weighs and is logged as before.
const ptNetOn = () => typeof sheetV === 'function' && sheetV() >= RTNET_SHEET;
const photoTimeQ = ph =>
  ptNetOn()
    ? ptimeQ(
        ph.map(p => p.f),
        f => (PTM[f] || [])[0]
      )
    : undefined;
// One answer recorder (docs/spec/quiz.md "What each mode counts"): what every counted answer does to the player's record
// and the answer log, whatever its game: the photo quiz, the custom quiz and the Duel tab (answer, below) and a live game
// (live.js liveLog). No screen: the caller keeps its own (the feedback, the prompts, the session's tally).
// cur: the game; mq: the mode logged; target, c: the unit shown and the one given ('' none); k: the plausible choices,
// chs: the choices offered ([] typed); ph: the photos shown (a corallites hint included), unseen: the hint left closed;
// cor: a corallites photo in view; exq: a mastery exam question; tq: the typed question (TYPEDQ); warm: a comeback
// question, R and Rc its recalls (1 otherwise); mu: the unit a photo of the mimicry class resembles; tm: {rt, zm} the
// seconds and a photo enlarged; id, at: the attempt id and time (answerId and now by default); tap: a Find the X's photo
// tapped. Returns {res, s, h0}: the scorer's result, the unit's record, the opening hold before this answer.
function recordAnswer({
  cur,
  mq,
  target,
  c,
  k,
  chs,
  ph,
  unseen = null,
  cor = false,
  exq = false,
  tq = null,
  warm = false,
  R = 1,
  Rc = 1,
  mu = null,
  tm = {},
  id,
  at,
  tap = null
}) {
  const good = c === target,
    s = st(target),
    first = !((s.ok || 0) + (s.ko || 0)), // the genus's first answer (model.js startStep)
    seenPh = ph.filter(p => p !== unseen);
  // A wrong answer changes what comes next ("Again", traps, the exam): the questions chosen ahead are chosen again.
  if (!good) dropPlans();
  // A record from before the photo memory is recalculated first, once (core.js memRecalc; a new record is only marked).
  mxRecalc(() => {
    memRecalc(s, pmem());
    if (!good && GX(c)) memRecalc(st(c), pmem());
  });
  const nw = ph.filter(p => !(s.ps || {})[p.f]).length;
  const solo = ph.length === 1 ? PICKD.SINGLE : 0; // one view alone is harder than the same photo with the others
  // One scorer (core.js scoreAnswer; docs/LEARNING.md "One scorer"): the question as the game had it, logged as its
  // scoring record (sc, core.js scoreLog) so the full replay meets this very state. d0: the photo difficulty (photoDiff);
  // fam: the memory of the photos seen before this answer (famOf; a hint left closed unseen; pgMemW, pgMissW); cf: the
  // known mix-ups (confTerm); look: a look-alike among the choices (pgWeight); R, Rc: the recalls on a comeback
  // (recallAt); hint: corallites revealed after the answer, seen not recognised; df: the format's offset (fmtOf, fmtOff).
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
    look: () => pgLook(target, chs, mu),
    R,
    Rc,
    p: startP(),
    sec: tm.rt,
    // The answer time weighs the steps (core.js rtWeight), as the sheet's replay does, net of the photos' time term
    // (photoTimeQ above: the photos d0 averages; logged in sc as i; undefined before the script that replays it).
    timed: true,
    ti: photoTimeQ(ph),
    // The format's offset (core.js fmtOff; 0 before the first ?stats=1 reply), logged in sc (o) with the rest.
    df: fmtOff(pfmt(), fmtOf(mq, chs.length)),
    // A smaller fault's kind (Q394 A: typeBind z, a species' common name or its genus alone typed for its scientific
    // name): the miss weighed by core.js PART, logged in sc (z), never a gain.
    ...(!good && tq && tq.z ? {z: tq.z} : {}),
    // The typed format's offset (core.js domF dt): the domain score is the share of photos named typed and alone, so the
    // bar measures against the typed format's calibrated difficulty; logged t.
    dt: fmtOff(pfmt(), 'typed'),
    // The domain-score bar (core.js domStep): the genus offsets of the genus shown and of the genus given (model.js
    // genusDiff, the photo population's mean difficulty), logged with the answer so the replay meets the same ones.
    mu: genusDiff(target),
    ...(!good && GX(c) ? {muc: genusDiff(c)} : {}),
    // A unit never answered starts from the unit its record names (a fish species: its family; core.js abilityOf), as the
    // sheet's replay does (treeReplayGen from).
    ...(GX(target).from ? {from: GX(target).from} : {}),
    ...(!good && GX(c) && GX(c).from ? {cfrom: GX(c).from} : {})
  });
  const res = scoreAnswer(P, q),
    {th0, dm} = res;
  if (ph[0]) s.ro = [...(s.ro || []).filter(o => o !== (ph[0].o || ph[0].f)), ph[0].o || ph[0].f].slice(-2);
  if (good && cor) s.cor = 1; // milestone: right with the corallites photo in view
  // A look-alike contrast won (the duel achievement): the Duel tab, a duel slipped into the quiz or an Again (core.js
  // contrastQ, as the replay reads it from the log).
  if (good && contrastQ(mq, chs.length)) s.du = 1;
  // A right answer clears its photos' variant groups from those the answer log left (model.js varRight, varLeft).
  if (good) varRight(target, seenPh);
  // Mastery exam (EXAM): count an exam question passed; any miss on the genus ends its exam, and so does giving the
  // genus as the answer for another one (rule L9).
  // It needs TYPED.exam typed right answers among its EXAM.n (model.js examTyped asks them; an exam begun before the
  // typed questions may take one more, its count held at EXAM.n so its % never passes 100), and a right answer on each
  // variant group the unit has (model.js varLeft, examPassed: the exam asks them, its count held the same way).
  if (!good) delete s.ex;
  else if (exq) {
    const ex = s.ex || {k: 0, v: [], ts: Date.now()}; // ts: its start, which places it among the logged answers (core.js replayedOf)
    ex.k = Math.min(EXAM.n, ex.k + 1);
    ex.t = (ex.t || 0) + (tq ? 1 : 0);
    ex.v = [...new Set([...ex.v, ph[0].view])];
    ex.at = tally(); // on the answer clock (model.js tally, examReady)
    if (examPassed(target, ex)) {
      s.mx = Date.now(); // learned, and when (the admin's player journey; an old record's 1 is still truthy)
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
  // Mastery is kept only while the genus stays known: a second miss before it is back up loses it and the exam comes
  // back, for the genus shown and for the one answered (mxKept). Only at a miss, as the full replay's lm (a mark the
  // replay kept with its bar under DOM.KEEP must not go at a right answer).
  if (!good) [target, ...(GX(c) ? [c] : [])].forEach(n => P[n] && P[n].mx && !mxKept(n) && delete P[n].mx);
  // Answer log for the RA sheet: kept until the sheet confirms it (capped), so an answer is never logged twice or lost offline.
  // Not signed in yet: the answers wait on this device (LOG0) and join the log when the player signs in (signIn), so the
  // sheet's Answers tab also gets what was played before the account existed.
  const spShown = speciesShown(seenPh);
  const ans = {
    // Its attempt id (core.js answerId; live.js liveAid): sent as it is at every try, so the sheet logs it once.
    id: id || answerId(),
    t: at || new Date().toISOString(),
    g: target,
    a: c,
    ok: good ? 1 : 0,
    m: mq, // the mode, built before the scorer (its format's offset, df)
    // A corallites hint left closed is not logged: it was not seen when answering (the sheet rates and counts as
    // recognised only the photos the player saw).
    ph: seenPh.map(p => p.f).join(' '),
    ch: chs.join(' '),
    e: Math.round(100 * res.e) / 100,
    th: th0,
    // What the game scored this answer with (core.js scoreLog: photo difficulty, memory, mix-ups, look-alike test,
    // recalls, the hint revealed after it), so the full replay scores it the same (core.js replayProgress; the Answers
    // column Scoring). Code.gs logAnswers_ keeps only the fields it knows, so a new field needs no *_SHEET gate (rule D4).
    sc: scoreLog(q, res),
    nw,
    // Seconds to answer (they weighed the steps above: rtWeight; the replay reads them back from the log) and a photo
    // enlarged before answering (logged only), QCLOCK in question.
    ...(typeof tm.rt === 'number' ? {rt: tm.rt} : {}),
    zm: tm.zm ? 1 : 0,
    // The device's UTC offset now, in minutes east of UTC (Manila +480): the time of day at home for the analyses.
    tz: -new Date().getTimezoneOffset(),
    // A typed answer's raw text (ty: what was typed first, '' for "I don't know") and its spelling step (tr: 1 retyped
    // exactly, 0 retyped wrong or skipped; absent when none was asked): the name study's question g (docs/reviews/
    // 2026-11-05-name-confusion-study.md; the sheet's Typed, Retyped right). Grading never reads them.
    ...(tq ? {ty: String(tq.text || '').slice(0, 40)} : {}),
    ...(tq && tq.sp ? {tr: tq.sp.r ? 1 : 0} : {}),
    // The texts refused before it (typeBind rj: no unit, two as close, a common name or another rank's name), in order
    // (the sheet's Rejected tries). Grading never reads them.
    ...(tq && tq.rj && tq.rj.length ? {rj: tq.rj.slice(0, TYPEDQ_RJ)} : {}),
    // The subject and the rank asked (the sheet records an answer at any taxonomic level: its columns Subject, Rank):
    // the unit's own rank (app.js rankOf: a fish scientific genus), else its subject's units'
    // (core.js unitRankOf: SUBJECTS unitRank, else rank).
    s: SUBJ.id,
    rk: rankOf(target) || unitRankOf(SUBJ),
    // The names at that rank, shown and answered, when a unit's id is not its name (a fish entry t01 is Damselfish, a
    // scientific genus g:Chromis is Chromis; a coral genus is its own name: nothing more), and the species of the photos
    // shown (UNITS species: a fish photo's species; none for the corals' genus photos), for the sheet's readers.
    ...(unitName(target) ? {tn: unitName(target)} : {}),
    ...(unitName(c) ? {ta: unitName(c)} : {}),
    ...(spShown ? {sp: spShown} : {}),
    // A Find the X's photo tapped (the Answers' Photo answered): sent only from PA_SHEET (core.js logOut, sync.js), the
    // queue keeps it until then (rule D4). Information only: no score, replay or rule reads it.
    ...(tap && tap.f ? {pa: tap.f} : {}),
    // The content version its subject's units were made from (app.js contentVer, core.js contentVersion; the Answers'
    // Content version): sent only from CV_SHEET (core.js logOut, sync.js), the queue keeps it until then (rule D4). No
    // score, replay or rule reads it.
    ...cvField()
  };
  // The opening hold's record (model.js holdStep), every answer with the expectation it really had: the comeback's
  // questions too (e allows for the plausible choices k, as for any question, and for the rust, so a miss the rust
  // explains adds less).
  const h0 = HOLDS;
  holdStep(ans.e, good);
  startStep(dm, k, good, first); // the first-launch question's fallback window (model.js)
  if (warm) comebackStep(q.R, th0, dm, k, good);
  // When it was given: a live answer recorded later (live.js liveFlush) keeps its own time, never one after now.
  answeredAt(s, good, Math.min(Date.now(), Date.parse(at) || Infinity));
  // Every subject's answers go to the sheet, each subject's counted in its own opening hold and replay (Code.gs
  // subjRows_, holdsInto_; sync.js holdAdopt, replayAdoptS), never in another subject's.
  logAnswer(ans);
  save();
  // Achievements on the photos seen before answering: a corallites hint left closed is not one. The runs and Sharp eye
  // count in the photo quiz only (progress.js achRunIn), so a live answer neither extends nor breaks a run.
  // progress.js (tier 4, index.html) may come after the first answers of a first visit: its start-up check (achCheck)
  // then counts what they earned.
  if (typeof achAfter === 'function') achAfter(good, seenPh, cur);
  return {res, s, h0};
}
// tap: a Find the X's photo tapped (question), logged as pa; null for any other question.
function answer(cur, c, target, ph, cor, unseen, tm = {}, tap = null) {
  // The bars read from one false-alarm table while it runs (app.js faHeld).
  return faHeld(() => {
    // A break while the question was on screen (model.js rustNow): the next question knows it, before this answer's time;
    // a comeback question takes its genus's recall as it is now.
    if (rustNow() && SHOWNQ && SHOWNQ.warm) SHOWNQ.cb = Math.round(recallAt(target) * 1000) / 1000;
    // First answer played while signed out: remember the progress as it was (ANONB), so signing in later adds only what
    // was played since, not progress an older sign-out left on the device. Only the subject with that baseline (SUBJECTS
    // anonBase) and its own first answer: a fish answer waiting in LOG0 is not a coral one.
    if (SUBJ.anonBase && !SYNC && SYNC_URL && !subjEntries(keptGet(LOG0, []), SUBJ.id).length) store.set(ANONB, P);
    // A typed question (TYPEDQ, set by question): c is the genus read from what was typed, '' for "I don't know" (a miss
    // for the genus shown only). No choices were offered, so no pair counts as offered; a genus typed by mistake counts
    // against it as a wrong pick does, and the mix-up is counted.
    const tq = TYPEDQ && TYPEDQ.t === target ? TYPEDQ : null,
      sci = SCIQ && SCIQ.t === target ? SCIQ : null; // its display, for the mode (|sc, |so)
    TYPEDQ = null;
    SCIQ = null;
    const good = c === target,
      s = st(target),
      chs = tq ? [] : [...$v.querySelectorAll('[data-c]')].map(b => b.dataset.c);
    // The plausible choices k (what a right answer proves, the guess rate). A typed answer: no guess rate (TYPED.k,
    // Infinity: the expected success has no 1/k floor).
    const nc = $v.querySelectorAll('[data-c]').length || 4,
      k = tq ? TYPED.k : Math.min(nc, Number(($v.querySelector('.ans') || {dataset: {}}).dataset.k) || nc);
    session.n++;
    session.h = [...session.h, good].slice(-10);
    pulseNote();
    if (good) session.ok++;
    // A comeback question after a break (model.js comebackOf): the recall planned for its genus (R, 1 otherwise) adjusts
    // the chance the player had, so a miss the rust explains weighs less (pgMissW), and the expectation logged and fed to
    // the opening hold is the one the question really had.
    const warm = !!(photoQuiz(cur) && SHOWNQ && SHOWNQ.warm),
      seenPh = ph.filter(p => p !== unseen),
      // The unit the photo of the mimicry class resembles (model.js mimUnit): a look-alike among the choices (pgLook), and
      // given instead, the mix-up its Again drills on the pair's species (rematchAdd). In a Find the X, the decoy tile of
      // the class (planFind mimDecoys): the unit whose tile is a photo of the class resembling the name asked, with its photo.
      fd =
        photoQuiz(cur) && FINDX && SHOWNQ && SHOWNQ[4] && SHOWNQ[4].find
          ? SHOWNQ[4].find.find(x => x.n !== target && mimUnit(x.n, x.p) === target) || null
          : null,
      mu = mimUnit(target, seenPh[0]) || (fd ? fd.n : null);
    // No exam question in the custom quiz.
    const exq = EXAMQ === target && cur !== CUSTOM_H;
    // The mode's suffixes (docs/spec/sync.md "Mode"), the sheet reading |kN at the end:
    // |x: a mastery exam question (never |kN: an exam has every trap);
    // |kN: a photo-quiz question with fewer than 4 choices ("Again: A or B?"), rated as N choices;
    // |d: a duel slipped into the photo quiz (CONTRAST);
    // |f: a Find the X (docs/LEARNING.md "Find the X slipped into the fish quiz"): ph its own photo only, ch the four
    //   photos' units, a and pa the unit and the photo tapped;
    // |c: a comeback question (model.js comebackOf), in the hold with its own e (|w: the old gentle restart, old rows);
    // |s: the custom quiz, right after quiz: rated as the photo quiz, told apart by the admin.
    const mq =
      modeBase(cur) +
      (photoQuiz(cur) && AUTOD ? '|d' : '') +
      // |f: a Find the X (FIND), its four photos the choices; 4 of them, so never |kN.
      (photoQuiz(cur) && FINDX ? '|f' : '') +
      (warm ? '|c' : '') +
      // |h: a photo of this player's reserve shown (core.js reserveOf: only the mastery exam asks them, so …|h|x), so the
      // transfer can be measured at the exam from the log, which keeps which answers were on reserved photos whatever the
      // photos in play later; before |kN, which the sheet reads at the end. Counted like any answer.
      (ph.some(p => p && p.ho) ? '|h' : '') +
      // |sc, |so: a species asked by its scientific name with choices, shown with its common name underneath (sc) or alone
      // (so) (SCIQ, app.js sciShow); information only, before |kN.
      (sci ? '|' + sci.v : '') +
      (k < (photoQuiz(cur) ? 4 : nc) ? '|k' + k : '') +
      // |t: a typed question (TYPED), never with |kN; the sheet rates it with no guess rate (Code.gs guess_). Its
      // answer a is the genus read ('' for "I don't know"), the raw text goes in ty; it offered no choices (ch empty).
      (tq ? '|t' : '') +
      (exq ? '|x' : '');
    // Scored, kept and logged as every counted answer is (recordAnswer, live.js liveLog too).
    const {h0} = recordAnswer({
      cur,
      mq,
      target,
      c,
      k,
      chs,
      ph,
      unseen,
      cor,
      exq,
      tq,
      warm,
      R: warm && typeof SHOWNQ.cb === 'number' ? SHOWNQ.cb : 1,
      Rc: warm && !good && GX(c) ? recallAt(c) : 1,
      mu,
      tm,
      tap
    });
    // (exq, above: never from the custom quiz.)
    EXAMQ = null;
    // The Duel tab's relief card (reliefShow): this answer took the hold's sum across INTRO.HOLD, from below.
    if (cur.startsWith('quiz-duel')) DUELRUN = reliefNote(DUELRUN, h0, HOLDS);
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
      // Find the X keeps its four tiles: they say which photo is which once answered (question).
      const tp = !(photoQuiz(cur) && FINDX) && order.find(p => (V[p.view] || []).length);
      if (tp) {
        const [, cp] = photoPair([tp], V[tp.view], tp),
          st0 = $v.querySelector('.qstage'),
          lab = SUBJ.views.length > 1 ? VIEW_LABEL[tp.view] || '' : '';
        // The ✓ / ✗ name chips say which photo is which, with no note under them (the short feedback sheet:
        // docs/decisions/2026-11-18-feedback-sheet.md).
        const fig = (p, n, cls) =>
          `<figure class="qph ${cls}"${p.ar ? ` data-r="${p.ar}"` : ''}${p.imr ? ' data-imr' : ''} style="--qbg:url('${img(p, 's')}')"><button type="button" class="zoom" data-vs="${cls}" aria-label="Enlarge ${esc(unameT(n))}"><img src="${qsrc(p, 2)}" alt="${esc(unameT(n))}${lab ? `, ${lab.toLowerCase()} view` : ''}">${ZOOMI}</button><figcaption><span aria-hidden="true">${cls === 'qok' ? '✓' : '✗'}</span> ${uname(n)}</figcaption>${photoSrc(p)}</figure>`;
        st0.classList.add('qvs');
        st0.innerHTML = fig(tp, target, 'qok') + fig(cp, c, 'qko');
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
      if (photoQuiz(cur))
        again = rematchAdd(
          [target, c],
          answersSoFar() - 1,
          mu && mu === c ? (mimUnit(target, seenPh[0]) ? mimOf(target, seenPh[0]) : mimOf(fd.n, fd.p)).pair.id : ''
        );
    }
    // A right answer gets a short celebration on the choice itself and on "✓ Yes" (app.css .cheer: a pulse and the tick
    // popping, ~400 ms, none with prefers-reduced-motion): the reward is on the action, not in a pop-up. It never holds the
    // player: Next is there and focused at once.
    $v.querySelectorAll('[data-c]').forEach(b => {
      b.disabled = true;
      if (b.dataset.c === target) b.classList.add('ok', ...(good ? ['cheer'] : []));
      else if (b.dataset.c === c) b.classList.add('ko');
    });
    // A typed answer: the field takes the right / wrong look of a choice, a quiet one after "I don't know".
    const tyIn = tq && $v.querySelector('#tyin');
    // A retype still not exact (the spelling step, typeBind): right, but the field says the spelling is not.
    // A name read but no unit given (a name several units share, or of part of the unit and not of this photo: typeUnit)
    // is a wrong answer, not "I don't know".
    // A smaller fault (tq.z, Q394) is a wrong answer too, said for what it is (partRead).
    const shw = !!(tq && (tq.m || tq.z) && !c);
    if (tyIn) tyIn.classList.add(good ? (tq.sp && !tq.sp.r ? 'close' : 'ok') : c || shw ? 'ko' : 'idk');
    const idk = !!tq && !c && !shw,
      read = tq ? (tq.z ? partRead(tq.z, tq.text) : typeRead(tq.m, tq.text, tq.sp, target, tq.ps)) : '',
      step = tq && good ? typeStep(tq.m, tq.text, tq.sp, target) : null;
    // The feedback: a genus's (IMR ID tips, mnemonic, Coral ID Key criteria) or a fish entry's (IMR cues, how to tell the look-alike
    // apart, the sub-entries and phases), chosen by what the record holds (fbBody). A mix-up between the two species of a
    // mimicry pair (model.js mimMix) gives the pair's marks: the photo shown taken for the other species' unit, or in a Find
    // the X the photo tapped (of unit c) taken for the name asked. The feedback only: nothing logged or drawn reads it.
    const mx = good ? null : tap ? mimMix(c, tap, target) : mimMix(target, seenPh[0], c);
    document.getElementById('after').innerHTML = fbBody(
      target,
      c,
      good,
      idk,
      again,
      ph,
      read,
      step,
      photoTaxon(seenPh, target),
      chs,
      repBtn({g: target, a: c, ph: ph.map(p => p.f), m: modeBase(cur)}),
      mx
    );
    // Phones: the feedback opens as a bottom sheet so the answer and Next show without scrolling (app.css .q.done).
    const qq = $v.querySelector('.q');
    if (qq) qq.classList.add('done');
    fbShown();
    fbMoreBind();
    if (isStacked()) {
      window.scrollTo(0, 0);
      fitStage();
      document.querySelectorAll('#after details').forEach(d => (d.ontoggle = fitStage));
    }
    // Tablet and desktop: the feedback always sits in the answer column, whatever the stage shows (3 views, one view,
    // a mix-up montage or a duel), so it is in the same place after every answer. Phones: bottom sheet.
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
    // The first juvenile, or sex or colour phase, a question showed: its card takes the break at Next first (phaseArm).
    // A Find the X showed four tiles, each of its own unit.
    const fxs = photoQuiz(cur) && FINDX && SHOWNQ && (SHOWNQ[4] || {}).find,
      phx =
        mimArm(nb, cur, fxs || seenPh.map(p => ({n: target, p})), exq && s.mx) ||
        phaseArm(nb, cur, fxs || seenPh.map(p => ({n: target, p})), exq && s.mx);
    if (!phx && !reliefArm(nb, cur, chs) && !leftArm(nb, cur) && !(exq && s.mx) && promptOk()) {
      if (nudgeDue()) (promptMark(), signinNudge());
      else if (pulseDue()) pulseArm(nb);
    }
    // Every unit in play met and none may open now: its card takes the break at Next before a tip (allMetArm); the photo
    // quiz only, so never on the custom quiz's answer that its reminder (leftArm) arms, and the first card armed wins anyway.
    allMetArm(nb, cur, exq && s.mx);
    // A "Did you know?" tip may take the break at Next when no prompt above took it (tipAfter; tips.js).
    // ty: how a typed question was answered ('idk' or 'typed'; '' when it was not typed): the typed-answers tip's run.
    tipAfter(nb, cur, !good, tm.zm, exq && s.mx, tq ? (idk && !(tq.rj && tq.rj.length) ? 'idk' : 'typed') : '');
    // "Your feedback helped" (progress.js helpedArm): a break nobody took, never over a question.
    if (typeof helpedArm === 'function') helpedArm(nb);
  });
}
// The answer's feedback: the verdict (step: the typed spelling step, typeStep), the photo's taxon line (tx: app.js
// photoTaxon, taxonLine), the decisive line (fbLine), the report button (rep: always in view, under the decisive line;
// docs/decisions/2026-11-20-report-link-in-view.md), and behind More the ID tips, why the answer
// is another unit (namesLine first), a genus's Coral ID Key criteria, a fish entry's sub-entries and phases. mim: the
// entry of the mimicry pair the answer mixed up (model.js mimMix), whose marks make the line (fbLine); its other marks
// and the units' own pair line, which they replace there, open the More panel.
function fbBody(target, c, good, idk, again, ph, read, step, tx, chs = [], rep = '', mim = null) {
  const g = GX(target),
    fish = !!g.name,
    C = !good && GX(c) ? GX(c) : null,
    M = C && mim ? mimMarks(mim, target) : null,
    MP = M && pairText(target, c),
    mims = M ? `${M.rest}${MP ? `<p class="vs">${esc(MP.t)}${MP.s ? ` <small class="esrc">(${esc(MP.s)})</small>` : ''}</p>` : ''}` : '';
  // Behind More: why the answer given is another unit. The pair's own line is the sheet's (fbLine). "This
  // pair comes back as a duel" is counted when More is opened (fbMoreBind), so a sheet nobody opens keeps its three tellings.
  const vs = C
    ? // The answer's own tips, said as such ("Why not X:" read as the reasons the photo is not X).
      `${namesLine(target, c)}<p class="vs">Your answer, ${uname(c)}, would show: ${gloss(tipsText(C))}${C.qt ? (C.qsrc && C.qsrc.t ? ` <small class="esrc">(${esc(C.qsrc.t)})</small>` : '') : esrcTag(C, 'sum')}${SUBJ.pages.includes('cmp') && UNITS[SUBJ.id].inGame(target) && UNITS[SUBJ.id].inGame(c) ? ` <a class="linkish" href="${esc(hr('cmp-' + target + '|' + c))}">Compare them</a>` : ''}</p>${again && againLeft() ? '<p class="vs again">This pair comes back as a duel in a moment.</p>' : ''}`
    : '';
  // The unit's name as the verdict shows it (its link to the genus sheet, its notes), with inner as its spelling. A unit's
  // English name given as information (app.js vernFirst, UNITS vern: the sea slugs') follows its
  // scientific name once the answer is out, never in the choices; none for a subject without them.
  const ven = vernFirst(target),
    named = inner =>
      fish
        ? `<b>${inner}</b>${ven ? ` <span class="ven">${esc(ven)}</span>` : ''} <small>${esc(altName(g.fam))}</small>${isBonus(target) ? ` <small>· ${esc(setOf(target).tag)}</small>` : ''}`
        : `<a href="${esc(hr('g-' + target))}"${sheetTab()}>${inner}</a>${isBenthic(target) ? ' (fire coral, IMR benthic slate)' : g.x ? ' (bonus, not on the IMR list)' : g.n ? '' : ' (★ not surveyed)'}`,
    name = named(fish ? uname(target) : `<i>${esc(target)}</i>`),
    // The verdict, one line. A retype still wrong: "✓ Yes, but not quite: it's spelled X", the same link, its wrong
    // letters marked (an old name typed: that name, then the unit); the words in normal weight and the name in bold, so
    // the name is what the eye catches (.fb h3.tystep).
    said = !step
      ? `it's ${name}`
      : step.oft
        ? step.oft[0] === unameT(target) // a name Pierre marks "often" for the family itself (curation.json fish.names)
          ? `it's ${name} (often called ${esc(step.oft[1].toLowerCase())})`
          : `<b>${esc(step.oft[0])}</b> (often called ${esc(step.oft[1].toLowerCase())}): it's ${name}`
        : `but not quite: it's spelled ${step.plain ? `<b>${step.spelled}</b>` : step.old ? `${step.spelled}, ${step.alt ? 'read as' : 'the old name of'} ${name}` : named(step.spelled)}`,
    // A fish entry's names inside it, phases and credits sit flat behind More (the sheet's own More replaced its fold).
    more = fish
      ? `${g.sub.length ? `<p class="vs">IMR names inside it: ${g.sub.map(esc).join(', ')}</p>` : ''}${g.phase.length ? `<ul>${g.phase.map(x => `<li>${esc(x)}</li>`).join('')}</ul>${g.psrc && g.psrc.t ? `<p class="vs esrc">Source: ${esc(g.psrc.t)}</p>` : ''}` : ''}<p class="credit">${ph.map(credit).join('<br>')}</p>`
      : // the criteria cited by the source the content editor gave with his edit of them, else the Coral Finder pages
        // (idtips.js critRef), and his summary's and mnemonic's with them (esrcTag; rule C2)
        `<details class="more"><summary>Coral ID Key criteria</summary>${(g.imr || []).length && g.sum ? `<p class="vs">${esc(g.sum)}${esrcTag(g, 'sum')}</p>` : ''}${(g.crit || []).length ? `<ul>${g.crit.map(x => `<li>${esc(x)}</li>`).join('')}</ul><p class="tref">${critRef(g)}</p>` : ''}<p class="credit">${ph.map(credit).join('<br>')}</p></details>`;
  // No tips box at all for a unit with no cue, summary or mnemonic (a fish family of circles 2-3 with no IMR cue: an
  // empty box draws a bare rounded bar).
  // The short sheet (rule C3; docs/decisions/2026-11-18-feedback-sheet.md): the verdict, the species line, a typed
  // reading and the decisive line; the rest in the More panel, More and Next on one row.
  return `<div class="fb fbs">
    <h3 class="${good ? 'ok cheer' : idk ? 'idk' : 'ko'}${step ? ' tystep' : ''}"><span class="v">${good ? '✓ Yes' : idk ? 'No worries' : '✗ No'},</span> ${said}</h3>${taxonLine(tx)}${read ? `<p class="vs tyread">${read}</p>` : ''}${fbLine(target, c, good, chs, mim)}${rep ? `<p class="fbrep">${rep}</p>` : ''}
    <div class="fbmore" id="fbmore" hidden>${mims}${g.qt || g.sum || g.mn ? `<div class="tipbox fbtips">${g.qt ? `<p class="label">${tipsLabel(g)}</p>` : ''}${g.qt || g.sum ? tipsList(g, 'imrfb') : ''}${g.mn ? `<p class="mn"><b>Mnemonic:</b> ${esc(g.mn)}${esrcTag(g, 'mn')}</p>` : ''}</div>` : ''}${vs}
    ${more}</div>
  </div>
  <div class="fbrow"><button class="next sec" type="button" id="fbmbtn" aria-controls="fbmore" aria-expanded="false">More</button><button class="next" type="button" id="next">Next <kbd>↵</kbd></button></div>`;
}
// The line unit a's record gives for its look-alike b, which names and describes b ("Angelfish: spine on the gill cover"):
// {t, s} with its source, or null. Any subject's record may hold such lines (rule S1): lk, IMR's own for the pairs it
// declares (a fish family's: core.js treeGen), else ap, ours for the pairs it does not (app.js treeGenera), each with its
// source (rule C2: IMR, and the editor's source when he reworded the line, or the family's sources).
function pairLine(a, b) {
  const g = GX(a) || {},
    hit = (g.lk || []).find(([o, t]) => o === b && t);
  if (hit) return {t: hit[1], s: ['IMR', ((g.lksrc || {})[b] || {}).t].filter(Boolean).join('; ')};
  return g.ap && g.ap[b] ? {t: g.ap[b], s: (g.apsrc || {})[b] || ''} : null;
}
// What the two records say of the pair (a, b): the line that describes a (b's record gives it), then the one that describes b
// (a's), each when it exists; {t, s}, or null with none. "Butterflyfish: no opercular spine · Angelfish: spine on the gill
// cover".
function pairText(a, b) {
  const L = [pairLine(b, a), pairLine(a, b)].filter(Boolean);
  return L.length ? {t: L.map(x => x.t).join(' · '), s: [...new Set(L.flatMap(x => x.s.split('; ')).filter(Boolean))].join('; ')} : null;
}
// A mix-up between the two species of a mimicry pair (model.js mimMix; docs/LEARNING.md "The mimicry class"): the marks
// that tell them apart (the pair's marks, each on its side with its sources, rule C2), split for the sheet (rule C3).
// line: the first mark of each side, the photo's species first (t, the unit shown, on the class's side when it is one of
// its units), "Name: mark · Name: mark", their sources small after it; rest: the pair's other marks, for the More panel,
// as the pair's card lists them. Each species by the name the player sees first, as on the card (mimShow), followed by
// "(juvenile)" when the pair names that side's juveniles as the ones that resemble (its st), so a mark of the young is
// never read as the adult's. null for a pair with no marks.
function mimMarks(m, t) {
  const L = (m && m.pair && m.pair.marks) || [];
  if (!L.length) return null;
  const imr = imrSaid(),
    st = m.pair.st || {},
    nm = s => {
      const x = s === 'a' ? m.na : m.nb;
      return (cnFirst(x, imr) ? esc(cnFirst(x, imr)) : `<i>${esc(x.sci)}</i>`) + (st[s] === 'juvenile' ? ' (juvenile)' : '');
    },
    sides = m.u.includes(t) ? ['a', 'b'] : ['b', 'a'],
    first = sides.map(s => L.find(k => k.side === s)).filter(Boolean),
    rest = sides.flatMap(s => L.filter(k => k.side === s && !first.includes(k))),
    one = (k, b) => (b ? `<b>${nm(k.side)}</b>` : nm(k.side)) + `: ${esc(k.t)}`,
    src = [...new Map(first.flatMap(k => k.src || []).map(s => [s.t, s])).values()];
  return {
    line: `<p class="vs fbline">${first.map(k => one(k)).join(' · ')}${src.length ? ` <small class="esrc">(${mimSrc(src)})</small>` : ''}</p>`,
    rest: rest.length
      ? `<ul class="mimmarks">${rest.map(k => `<li>${one(k, 1)} <small>(${mimSrc(k.src)})</small></li>`).join('')}</ul>`
      : ''
  };
}
// The one decisive line of the feedback sheet (rule C3; docs/decisions/2026-11-18-feedback-sheet.md): a miss, the pair's
// line for the units shown and answered; right, the line telling it from a look-alike among the choices (chs, empty when
// typed), only one that says something of the unit shown; else its first ID tip, "X: …" with its source; else none.
// Never a line made by comparing trait tags (rule C2). A miss that mixed up the two species of a mimicry pair (mim, its
// entry: model.js mimMix) gives that pair's marks instead (mimMarks), when it has some.
// The source a unit's tips carry (rule C2): their label's own words ("ID tips (IMR)" gives IMR, "ID marks (Sea Slug Forum)" the
// forum) and, with an edit of them, the content editor's source; '' for a unit with no tips.
const tipsBy = g =>
  g.qt && g.qt.length
    ? [
        String(tipsLabel(g))
          .replace(/^ID (tips|marks)\s*/, '')
          .replace(/^\((.*)\)$/, '$1'),
        (g.qsrc || {}).t
      ]
        .filter(Boolean)
        .join('; ')
    : '';
// IMR's own name is left out of the sources this line says (Pierre, 2026-11-21 05:53: the bare "(IMR)" took a line of its
// own); the other sources stay. The IMR source is still there for the cue behind More (the tips' label "ID tips (IMR)")
// and on the Compare page, so rule C2 holds.
const noImr = s =>
  String(s || '')
    .split('; ')
    .filter(x => x && x !== 'IMR')
    .join('; ');
function fbLine(target, c, good, chs = [], mim = null) {
  const say = (t, s) => `<p class="vs fbline">${t}${noImr(s) ? ` <small class="esrc">(${esc(noImr(s))})</small>` : ''}</p>`;
  const M = !good && mim ? mimMarks(mim, target) : null;
  if (M) return M.line;
  const P =
    !good && GX(c)
      ? pairText(target, c)
      : good
        ? chs
            .filter(o => o !== target && GX(o) && pairLine(o, target))
            .map(o => pairText(target, o))
            .find(Boolean)
        : null;
  if (P) return say(esc(P.t), P.s);
  const g = GX(target);
  if (!g.qt || !g.qt.length) return '';
  return say(`${uname(target)}: ${glossAll([g.qt[0]])[0]}`, tipsBy(g));
}
// The feedback sheet's own tally (core.js PAGES.FB, sync.js fbTally): the answers
// whose sheet was shown, those where More was opened, the seconds it stayed on screen and the taps on a link inside it, four
// numbers a visit in the pages summary already sent. FBS: the sheet on screen now (when it was drawn, the seconds counted so
// far, whether More was opened); null when none.
let FBS = null;
const fbCount = (k, n) => typeof fbTally === 'function' && fbTally(k, n);
function fbShown() {
  fbEnd();
  FBS = {t: Date.now(), s: 0, k: 0, more: false};
  fbCount('shown');
}
// Counts the seconds the sheet has been on screen since the last time, at most FBSEC for the answer; end: it left the screen.
// Called when the page is left (app.js route) and when the summary is taken (sync.js pagesSend).
// The time the app is hidden never counts: hidden, the clock stops (t null), shown again it starts anew.
function fbEnd(end = true) {
  if (!FBS) return;
  const now = Date.now();
  if (FBS.t !== null) FBS.s = Math.min(PAGES.FBSEC, FBS.s + (now - FBS.t) / 1000);
  FBS.t = !end && document.visibilityState === 'hidden' ? null : now;
  const k = Math.round(FBS.s);
  if (k > FBS.k) fbCount('sec', k - FBS.k);
  FBS.k = k;
  if (end) FBS = null;
}
if (typeof document !== 'undefined' && document.addEventListener)
  document.addEventListener('visibilitychange', () => {
    if (!FBS) return;
    if (document.visibilityState === 'hidden') fbEnd(false);
    else if (FBS.t === null) FBS.t = Date.now();
  });
// More / Less on the sheet's row: shows or hides the panel behind it; the first opening of an answer is counted, and tells
// "this pair comes back as a duel" (its own count of three tellings).
function fbMoreBind() {
  const b = document.getElementById('fbmbtn'),
    p = document.getElementById('fbmore'),
    a = document.getElementById('after');
  if (!b || !p) return;
  b.onclick = () => {
    const open = p.hidden;
    p.hidden = !open;
    b.setAttribute('aria-expanded', String(open));
    b.textContent = open ? 'Less' : 'More';
    if (open && FBS && !FBS.more) {
      FBS.more = true;
      fbCount('more');
      if (p.querySelector('.again')) againTold();
    }
    if (isStacked()) fitStage();
  };
  // A tap on a link of the app inside the sheet (the genus sheet, Compare them).
  a.addEventListener('click', e => e.target.closest && e.target.closest('a[href^="#"]') && fbCount('link'));
}
// The content version field of an answer in the subject on screen (app.js contentVer), none when it has none yet.
const cvField = () => {
  const cv = typeof contentVer === 'function' ? contentVer(SUBJ) : '';
  return cv ? {cv} : {};
};
// An answer into the RA sheet's log (answer(), winkShow): kept until the sheet confirms it (capped), so it is never logged
// twice or lost offline; not signed in, it waits on this device (LOG0) and also goes to the sheet anonymously
// (sync.js sendAnon). Both queues written as store.set would, their text kept parsed for the next read (sync.js keptPush).
// LOG0's readers in this file only read it (keptGet: one parsed copy, not one per reader).
function logAnswer(ans) {
  if (SYNC) SYNC.log = [...(SYNC.log || []), ans].slice(-2000);
  else if (SYNC_URL) {
    keptPush(LOG0, ans, 2000);
    keptPush(ANONQ, ans, 2000);
    anonSoon();
  }
}
// Winks (fish.json wink; docs/ARCHITECTURE.md "Fish players get", "Surprise cards' answers"): a rare surprise card in
// the photo quiz (UNITS winks: fish, from circle 1), an unmistakable fish among 3 absurd choices, never counted: logged
// under core.js WINK_MODE, which every reader skips. Wink i is due from WINK.AT[i] of the player's answers (winkAt) and
// winkGap after the last shown, never over a card; once per player (reefid-sync-fish-wink, merged by union: winkMerge).
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
// Due from its answer count (winkAt) and winkGap answers after the last one shown, counted on the answer clock (model.js
// tally: a wink shown is kept at the clock, winkShow).
function winkDue() {
  const L = UNITS[SUBJ.id].winks(),
    seen = winkSeen(),
    i = L.findIndex(n => !(n in seen)),
    a = answersSoFar(),
    last = Math.max(-Infinity, ...L.filter(n => n in seen).map(n => seen[n]));
  if (i < 0 || a < winkAt(i) || tally() < last + winkGap() || document.querySelector('.unlock')) return null;
  return {n: L[i]};
}
// The wink's photo, never a bad one: the unit's ★ Cover while in play (coverP; decision:
// docs/decisions/2026-11-18-decisions-from-app-comments.md), else one of its chosen photos (wink.photos) still in the
// game, by photo id (treePid), else its best (easyRank).
function winkPhoto(g) {
  if (g.coverP) return g.coverP;
  const want = new Set((g.wink.photos || []).map(treePid)),
    L = g.views.wide.filter(p => want.has(treePid(p.f)));
  return L.length ? pick(L) : easyRank(g.views.wide)[0];
}
// A surprise card's answer for the log: a game answer's fields for what was shown and answered (ch: renamed ids,
// core.js renamedId: an absurd choice may name an old entry), mode WINK_MODE, nothing scored (no e, th, nw, sc).
function winkAnswer(n, id, ids, p, tm) {
  const r = x => renamedId(SUBJ, x),
    a = r(id),
    sp = speciesShown([p]);
  return {
    id: answerId(),
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
    rk: rankOf(n) || unitRankOf(SUBJ),
    ...(unitName(n) ? {tn: unitName(n)} : {}),
    ...(unitName(a) ? {ta: unitName(a)} : {}),
    ...(sp ? {sp} : {}),
    ...cvField()
  };
}
function winkShow({n}) {
  const g = GX(n),
    w = g.wink,
    p = winkPhoto(g),
    ch = shuffle([[n, g.name], ...w.choices]);
  const a = tally();
  WINKS[SUBJ.id] = {...(WINKS[SUBJ.id] || {}), [n]: a};
  store.set(WINKK(), {...(store.get(WINKK(), null) || {}), [n]: a});
  if (typeof syncSoon === 'function') syncSoon(); // the other devices of the account learn it was shown
  SHOWNQ = null;
  $v.innerHTML = `${gameHelp('quiz')}<div class="q bleed wink">
    <div class="qstage"><figure class="qph"${p.ar ? ` data-r="${p.ar}"` : ''}${p.imr ? ' data-imr' : ''} style="--qbg:url('${img(p, 's')}')"><button type="button" class="zoom" aria-label="Enlarge photo"><img src="${qsrc(p, 1)}" data-lo="${img(p, 's')}" alt="${SUBJ.what} to identify">${ZOOMI}</button></figure></div>
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
// Out-of-game prompts ("fewer, better pop-ups"; docs/ARCHITECTURE.md "Out-of-game prompts spaced out"): the sign-in
// card, the one-tap question and the cards on which units are in play come PROMPT.GAP answers apart (counted on the
// answer clock, model.js tally; a clock gone back, a reset, starts over), never with an overlay up or waiting
// (overlayBusy): one too close waits.
const PROMPT = {KEY: 'reefid-prompt-at', GAP: 10};
// The tour, a card or an achievement toast on screen or waiting (cards wait under the tour, toasts under a card).
const overlayBusy = () => !!document.querySelector('#tour, .unlock, .achpop') || (typeof achBusy !== 'undefined' && achBusy);
const promptOk = () => {
  if (overlayBusy()) return false;
  const a = tally(),
    at = store.get(PROMPT.KEY, null);
  return typeof at !== 'number' || a < at || a - at >= PROMPT.GAP;
};
const promptMark = () => store.set(PROMPT.KEY, tally());
// One-time hint that a photo enlarges (most players never knew they could): a bubble over the question's first photo
// from the ZHINT.AT-th answer, once per device and never once a photo was enlarged there (ZHINT_KEY: 'seen' or
// 'zoomed'). Never over an overlay (it waits
// while unanswered; not promptOk's spacing: it asks nothing); gone at the first tap or key or after ZHINT.MS, every tap
// let through.
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
// Every unit in play met and none may open now (else 100+ answers can pass with nothing new and nothing said): a calm
// card at the break at Next says what comes next (app.js UNITS done; none for the corals), once per reason k on the
// account (core.js TOLD 'allmet:<subject>-<k>'). The photo quiz only, never with another card on what is next, a
// visit's first answers (noOpen), before the first sync, a prompt too close or a card due; leaving it unseen: it returns.
const ALLMET = {KEY: 'allmet-'};
// Pure on its inputs (tests call it): L the units in play (pool); met, asked, may (mayOpen) on a unit. A unit met but
// not asked yet is still opening (app.js treeGate's circle 2 waits for it).
const allMetNone = (L, met, asked, may) => L.length > 0 && L.every(n => (met(n) ? asked(n) : !may(n)));
const allMetTok = k => `allmet:${SUBJ.id}-${k}`;
const allMetSeen = k => !!store.get(subjDev(SUBJ.id, ALLMET.KEY + k), null) || toldHas(allMetTok(k));
function allMetDue() {
  const U = UNITS[SUBJ.id];
  if (!U.done || noOpen() || !noticesReady() || !allMetNone(pool(), introduced, askedOpen, mayOpen)) return null;
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
// Juveniles and colour phases (docs/ARCHITECTURE.md "Juveniles and colour phases on their unit's mastery"): the first
// photo-quiz question showing one (juvCard) brings a card at Next, before prompts and tips: the photo beside another phase
// (phasePair), its taxon. Once per kind on the account (TOLD 'phase:<subject>-<kind>', marked when shown); never over an
// overlay or a card due (it waits for the next such photo).
const PHASEC = {KEY: 'phase-', WORD: {juvenile: 'Juvenile', male: 'Male', female: 'Female', intermediate: 'Intermediate'}};
const phaseTok = k => `phase:${SUBJ.id}-${k}`;
const phaseSeen = k => !!store.get(subjDev(SUBJ.id, PHASEC.KEY + k), null) || toldHas(phaseTok(k));
// The card photo p brings, {p, k, q}, else null; sps: the subject's species by id (fish.json species), L: the photos of
// its unit that may show (phasePair's pool). The juvenile card (k 'juvenile'; docs/decisions/
// 2026-11-20-juvenile-card-shows-young-beside-adult.md) says nothing of its own on how the young look: it shows the
// photo beside an adult of its species (q), so the learner sees the difference. One rule for every young photo, a
// juvenile or a sub-adult (the phase intermediate without the phase flag p): it brings the card only where a source says
// the species' young look clearly different (sps[p.sp].jd.d: tools/fish_juv_differs.json; jd.sub is information only);
// false, or no source either way (no jd, as on a subject without them), and no adult of its species in L: no card. The
// photo's phase is Pierre's in the admin when he set one (core.js phaseOf; rule A1). The sex or colour phase card (core.js
// phaseKind 'phase': the phase flag p, on a species whose sexes or colour phases differ by a cited source, its entry
// marked dimorph or the cited phase list: tools/fish_judge.py phase_flag) is as before.
function juvCard(p, sps, L) {
  if (!p) return null;
  if (phaseKind(p) === 'phase') return {p, k: 'phase', q: phasePair(p, L)};
  const w = phaseOf(p),
    d = (p.sp && sps && sps[p.sp] && sps[p.sp].jd) || {};
  if (!(w === 'juvenile' || w === 'intermediate') || d.d !== true) return null;
  const q = phasePair(p, L);
  return q ? {p, k: 'juvenile', q} : null;
}
// A photo's own word on its card: its phase, 'Sub-adult' for the phase intermediate on the juvenile card, else 'Adult'.
const phaseWord = (x, k) => (k === 'juvenile' && phaseOf(x) === 'intermediate' ? 'Sub-adult' : PHASEC.WORD[phaseOf(x)] || 'Adult');
// The photos unit n's card may show beside a photo: its photos in play for this player.
const phasePool = n => ((GX(n).views || {}).wide || []).filter(x => gamePhotoOk(n, x));
// The first photo of L ({n, p}: the photos shown, each with its unit) whose card has not been shown yet (seen(kind)):
// {p, k, q, n}, else null.
function phaseCardFor(L, seen) {
  const sps = (TREEU && TREEU.sps) || {};
  for (const {n, p} of L || []) {
    const c = n && p ? juvCard(p, sps, phasePool(n)) : null;
    if (c && !seen(c.k)) return {...c, n};
  }
  return null;
}
// L: the photos shown, each with its unit ({n, p}).
function phaseArm(nb, cur, L, hold) {
  if (!photoQuiz(cur) || hold || !phaseCardFor(L, phaseSeen)) return false;
  return breakArm(nb, () => {
    if (!(NEXTQ && NEXTQ.k === planKey(cur)) && hashNow() === cur) planNext(cur);
    const c = phaseCardFor(L, phaseSeen),
      nx = NEXTQ && NEXTQ.k === planKey(cur) && NEXTQ.args;
    if (!c || overlayBusy() || !lb.hidden || (nx && nextCards(cur, nx))) return false;
    promptMark();
    phaseShow(c, c.n, true);
    return true;
  });
}
// The cited phase list's sources (fish.json species phs src: [{t, u}]) in words: "Source: A" or "Sources: A, B", each
// a link when the list gives its page. One line for the sex or colour phase card and the species sheet's phases
// (learn.js spPhases).
const phaseSrcs = L =>
  `Source${L.length > 1 ? 's' : ''}: ${L.map(x => (x.u ? `<a href="${esc(safeUrl(x.u))}" target="_blank" rel="noopener">${esc(x.t)}</a>` : esc(x.t))).join(', ')}`;
// c: {p, k, q} (phaseCardFor; q the photo beside it, else phasePair's from n's photos); n: the unit asked; brk: shown at
// the break, so its close goes on to the next question.
function phaseShow({p, k, q: q0}, n, brk) {
  const g = GX(n),
    q = q0 !== undefined ? q0 : phasePair(p, phasePool(n)),
    tx = photoTaxon([p], n),
    juv = k === 'juvenile',
    // The cited phase list's word on the photo's species (fish.json species phs, tools/build_fish.py phase_sources): k
    // 'sex' (its males and females differ) or 'phase' (its initial and terminal phases), src its sources ({t, u}).
    phs = juv ? null : (((TREEU && TREEU.sps) || {})[p.sp] || {}).phs || null,
    // The sex or colour phase card's lines, under their source: the one the content editor gave with an edit of them
    // (app.js treeGenera psrc, core.js contentApply esrc; rule C2), else IMR's, the presentation's own words; for a species
    // the cited list flags, only the lines on sexes or phases (an IMR family's juvenile line is not this card's), then
    // the list's sources. The juvenile card has none: the two photos say it.
    lines = juv ? [] : (g.phase || []).filter(l => !phs || /\b(?:fe)?males?\b|phases?\b/i.test(l)),
    srcs = phs && (phs.src || []).length ? phs.src : [],
    w = phaseOf(p),
    word = x => phaseWord(x, k),
    fig = x => `<figure><img src="${img(x, 's')}" alt="${esc(word(x))}"><figcaption>${esc(word(x))}</figcaption></figure>`,
    // Each photo's credit under them, its author and its observation (rule P5): the answer is out.
    credits = [p, q].filter(Boolean).map(credit).join('<br>'),
    title = juv
      ? `${word(p)} and ${q ? word(q).toLowerCase() : 'adult'}`
      : w === 'intermediate' || (phs && phs.k === 'phase')
        ? 'Careful: this species’ colour phases can look very different'
        : 'Careful: this species’ males and females can look very different';
  const d = cardShow({
    kind: 'tip',
    cls: 'tipcard phasecard',
    kick: 'Juveniles and phases',
    title: esc(title),
    body: `<div class="phvis">${fig(p)}${q ? fig(q) : ''}</div>${tx ? taxonLine(tx) : ''}${lines.length ? `<p class="phlines"><b>${esc((g.psrc && g.psrc.t) || 'IMR')}</b>: ${lines.map(esc).join('; ')}</p>` : ''}${srcs.length ? `<p class="phlines phsrc">${phaseSrcs(srcs)}</p>` : ''}<p class="credit">${credits}</p>`,
    primary: {text: 'Got it', attr: 'disabled'},
    esc: 1,
    focus: 'h3',
    enter: () => {},
    bind: d => (d.querySelector('h3').tabIndex = -1),
    onClose: how => {
      if (how === 'route') return; // left unseen: it comes back with the next such photo
      store.set(subjDev(SUBJ.id, PHASEC.KEY + k), Date.now());
      toldAdd(phaseTok(k));
      if (brk) route();
    }
  });
  setTimeout(() => d.querySelectorAll('[data-b]').forEach(b => (b.disabled = false)), TIP.WAIT);
  return d;
}
// The mimicry card (docs/LEARNING.md "The mimicry class"): the first question that shows a photo of the mimicry class
// (model.js mimOf) brings its pair's card at the break at Next: a photo of the species beside one of the species it
// resembles, the marks that tell them apart, each with its sources, and the sources that state the resemblance. Once per
// pair and subject: on this device (MIMC.KEY, the pairs shown) and, signed in, on the account's other devices (core.js
// TOLD 'mim:<subject>-<pair>'), marked only when shown. It takes the break before the phase card, on the same
// conditions. Its photos (mimPics) show one observation and one subject each (rule P3), never one of a species whose look
// varies by region taken outside the region (species region, loc world); with no such photo, the card waits.
const MIMC = {KEY: 'mim'};
const mimTok = id => `mim:${SUBJ.id}-${id}`;
const mimSeen = id => !!(store.get(subjDev(SUBJ.id, MIMC.KEY), null) || {})[id] || toldHas(mimTok(id));
// A photo the card may show: one subject in view (its tags' count 1 or s, or no tags), no watermark (the judged flag w, as
// Home's tiles), not from outside the region of a species flagged regional (reg).
const mimPhotoOk = (p, reg) =>
  !!p &&
  !p.multi &&
  (!p.jt || /^[1s]$/.test(String(p.jt).charAt(6))) &&
  !/w/.test(String(p.jt || '').slice(7)) &&
  !(reg && p.loc === 'world');
// The card's two photos for entry m (app.js mimLay), shown with photo p on unit n: p itself when it may show, else another
// of its species at the stage that resembles, from n's photos; and one of the species it resembles from that species'
// family, a juvenile when the pair names its juveniles, else an adult first. Each list in its easy order. For a species
// flagged regional, the form met here first: a photo from near Dauin, then from the Philippines, each the subject's
// larger views first (the tags' size: large, medium, small). null: none.
function mimPics(m, p, n) {
  const st = (m.pair.st || {}).b || 'all',
    stage = (x, s) => s !== 'juvenile' || phaseOf(x) === 'juvenile',
    here = x => (x.loc === 'dauin' ? 0 : 3) + Math.max(0, 'lms'.indexOf(String(x.jt || '').charAt(5))),
    near = (L, reg) => (reg ? (L.map((x, i) => [x, here(x), i]).sort((u, v) => u[1] - v[1] || u[2] - v[2])[0] || [])[0] : L[0]),
    A = [p, ...(((GX(n) || {}).views || {}).wide || [])].filter(x => x && x.sp === m.sp && stage(x, m.st) && mimPhotoOk(x, m.ra)),
    B = (((GX(m.fb) || {}).views || {}).wide || []).filter(x => x.sp === m.pair.b && stage(x, st) && mimPhotoOk(x, m.rb)),
    Bs = st === 'all' && B.some(x => !phaseOf(x)) ? B.filter(x => !phaseOf(x)) : B,
    a = near(A, m.ra),
    b = near(Bs, m.rb);
  return a && b ? [a, b] : null;
}
// The first photo of L (the photos shown, each with its unit: {n, p}) whose pair's card is due: {n, p, m}, else null.
function mimCardOf(L, seen) {
  for (const {n, p} of L || []) {
    const m = n && p ? mimOf(n, p) : null;
    if (m && !seen(m.pair.id) && mimPics(m, p, n)) return {n, p, m};
  }
  return null;
}
function mimArm(nb, cur, L, hold) {
  if (!photoQuiz(cur) || hold || !mimCardOf(L, mimSeen)) return false;
  return breakArm(nb, () => {
    if (!(NEXTQ && NEXTQ.k === planKey(cur)) && hashNow() === cur) planNext(cur);
    const c = mimCardOf(L, mimSeen),
      nx = NEXTQ && NEXTQ.k === planKey(cur) && NEXTQ.args;
    if (!c || overlayBusy() || !lb.hidden || (nx && nextCards(cur, nx))) return false;
    promptMark();
    mimShow(c, true);
    return true;
  });
}
// A source's short form on the card, its title's first part and its page (Randall 2005, p. 317), linked when it has an
// address.
const mimSrc = L =>
  (L || [])
    .map(s => {
      const pg = (String(s.t).match(/p\. \d+$/) || [''])[0],
        h = String(s.t).split(', ')[0],
        t = pg && h !== s.t ? `${h}, ${pg}` : h;
      return s.u ? `<a href="${esc(safeUrl(s.u))}" target="_blank" rel="noopener">${esc(t)}</a>` : esc(t);
    })
    .join('; ');
// c: {n, p, m} (mimCardOf); brk: shown at the break, so its close goes on to the next question.
function mimShow({n, p, m}, brk) {
  const two = mimPics(m, p, n);
  if (!two) return null;
  const [a, b] = two,
    r = m.pair,
    // each species by the name the player sees first (app.js cnFirst: the IMR name for a player at IMR), else its
    // scientific name
    imr = imrSaid(),
    cn = x => cnFirst(x, imr),
    nm = x => (cn(x) ? esc(cn(x)) : `<i>${esc(x.sci)}</i>`),
    word = x => (phaseOf(x) === 'juvenile' ? ' (juvenile)' : ''),
    fig = (x, t) => `<figure><img src="${img(x, 's')}" alt="${esc(cn(t) || t.sci)}"><figcaption>${nm(t)}${word(x)}</figcaption></figure>`,
    marks = (r.marks || [])
      .map(k => `<li><b>${nm(k.side === 'a' ? m.na : m.nb)}</b>: ${esc(k.t)} <small>(${mimSrc(k.src)})</small></li>`)
      .join(''),
    title = m.st === 'juvenile' ? 'Careful: this juvenile resembles another species' : 'Careful: this species resembles another one';
  const d = cardShow({
    kind: 'tip',
    cls: 'tipcard phasecard mimcard',
    kick: 'Look-alikes',
    title: esc(title),
    body: `<div class="phvis">${fig(a, m.na)}${fig(b, m.nb)}</div><ul class="mimmarks">${marks}</ul><p class="mimsrc"><b>Resembles</b>: ${mimSrc(r.says)}</p><p class="credit">${[a, b].map(credit).join('<br>')}</p>`,
    primary: {text: 'Got it', attr: 'disabled'},
    esc: 1,
    focus: 'h3',
    enter: () => {},
    bind: d => (d.querySelector('h3').tabIndex = -1),
    onClose: how => {
      if (how === 'route') return; // left unseen: it comes back with the next such photo
      const k = subjDev(SUBJ.id, MIMC.KEY);
      store.set(k, {...(store.get(k, null) || {}), [r.id]: Date.now()});
      toldAdd(mimTok(r.id));
      if (brk) route();
    }
  });
  setTimeout(() => d.querySelectorAll('[data-b]').forEach(b => (b.disabled = false)), TIP.WAIT);
  return d;
}
// "Did you know?" tips (tips.js): this device's counters (reefid-tips), the break at Next, the card.
// The device's answers seed the counters once (tips.js tipsInit): the log of a signed-in player, else LOG0.
// run: false for the answer being noted (tipAfter): the log already holds it, the counter does not yet.
const tipsLoad = (raw = store.get(TIPR.KEY, null), run = true) => {
  let seed = [];
  if (!raw)
    try {
      seed = ((SYNC && SYNC.log) || keptGet(LOG0, [])).filter(a => !winkEntry(a)); // a surprise card's is no question
    } catch (e) {}
  const st = tipsInit(raw, seed);
  // The log does not say which answers were the Custom quiz's: a saved selection shows it was used before c was counted.
  const c = !st.u.c && customSaved().length ? {...st, u: {...st.u, c: 1}} : st;
  // The Duel tab's answers are in the log (mode quiz-duel…): one held here shows it was used before d was counted.
  let dueled = !!c.u.d;
  if (!dueled)
    try {
      dueled = ((SYNC && SYNC.log) || keptGet(LOG0, [])).some(a => a && String(a.m || '').startsWith('quiz-duel'));
    } catch (e) {}
  const d = dueled && !c.u.d ? {...c, u: {...c.u, d: 1}} : c;
  // The view the Custom quiz kept (CQ.VIEW) is the last one the player chose: My mix-ups shows it was seen before m was counted.
  const m = !d.u.m && store.get(CQ.VIEW, '') === 'mix' ? {...d, u: {...d.u, m: 1}} : d;
  // What the Coral ID Key keeps once the player changed one of its choices (its start view, layout or photos, proto/idkey.js):
  // one on the device shows it was opened before i was counted.
  const i = !m.u.i && IDKEY_SAVED.some(k => store.get(k, null) !== null) ? {...m, u: {...m.u, i: 1}} : m;
  return run ? tipRun(i) : i;
};
// The log's typed answers (mode …|t, the text typed in ty) show the run of "I don't know" they end with, from before k was
// counted (or an answer the counter missed): the longer of the two, read only while the run is short.
const tipRun = st => {
  let k = 0;
  if (st.u.k < TIPR.IDK)
    try {
      k = tipIdkRun((SYNC && SYNC.log) || keptGet(LOG0, []));
    } catch (e) {}
  return k > st.u.k ? {...st, u: {...st.u, k}} : st;
};
const IDKEY_SAVED = ['reefid-idkey-start2', 'reefid-idkey-lay', 'reefid-idkey-pv'];
// One more open of a feature of a tip (k: a counter of u): that tip is not for this player.
const tipOpened = k => store.set(TIPR.KEY, tipUse(tipsLoad(), k));
// A quiz photo enlarged by the player (question(), the mix-up montage in answer()); a tip's "Show me" is not theirs.
let tipDemo = false;
const tipZoomed = () => tipDemo || store.set(TIPR.KEY, tipUse(tipsLoad(), 'z'));
// After each answer in a game: count it; a tip due (tipDue) within the prompt spacing (promptOk, which it then pushes
// back) takes the break at Next, checked again at the tap; it waits when the next question brings a card (never two
// cards back to back). hold: the mastery toast is due in a moment.
const TIP = {WAIT: 600, OUT: 2000};
// Whether the planned next question opens with a genus's first-meeting card: the photo quiz's plan carries them (.intro).
// (A Duel tab duel draws only genera unlocked, so it brings no card.)
const nextCards = (cur, q) => !!q.intro;
// The basics tip's audience (tips.js `basics`): the player the first-launch offer of the subject's basics module is for,
// who has not opened it. The answer in the subject's own record (startOf; a subject with no question, the sea slugs, has
// none and gets no tip) whose CHOICE variables offer the basics first (startVars(c).basics: "new", asked or inferred), the
// module not done (basicsDue) and nothing recorded in its record (the module's page stores the step it opens: `last`,
// `seen`). Never for the player the "lower" fallback card serves (who said IMR course or know well: it offers the same
// module), nor one the "higher" card said knows more than they answered, shown or about to be (verdict v).
const tipBasics = () => {
  const o = startOn() && startOf();
  if (!o || !startVars(o.c).basics || !basicsDue() || o.v === 'hi' || (o.fb || {})[o.c + '-hi']) return false;
  const r = store.get(basicsKey(), {}) || {};
  return !r.last && !Object.keys(r.seen || {}).length;
};
function tipAfter(nb, cur, miss, zm, hold, ty = '') {
  const raw = store.get(TIPR.KEY, null);
  let st = tipsLoad(raw, false);
  const q0 = st.u.q,
    k0 = st.u.k;
  st = tipNote(st, Date.now(), ty);
  // Just seeded from the log, this answer included: its own count of the run (the seed ends with this answer already).
  if (!raw && q0 && ty) st = {...st, u: {...st.u, k: ty === 'idk' ? k0 : 0}};
  st = tipRun(st); // after the note: the log holds this answer, so the run it shows now is compared with the counter's
  if (!raw && q0) st = {...st, u: {...st.u, q: q0}}; // just seeded from the log, this answer included
  store.set(TIPR.KEY, st);
  // mix: the pairs of genera the player mixed up TIPR.MIX times or more (the My mix-ups view's edges), counted only for a
  // player the My mix-ups tip can still target.
  const b = {
    ctx: cur.split('|')[0],
    miss,
    zm: !!zm,
    mix: st.u.m < 1 ? mixEdges(unlocked()).filter(e => e[2] >= TIPR.MIX).length : 0,
    bx: tipBasics() ? 1 : 0
  };
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
  // The Custom quiz's picking page (the Custom quiz tab).
  custom: () => (location.hash = hr('quiz-custom')),
  // The Duel tab (look-alike duels).
  duels: () => (location.hash = hr('quiz-duel')),
  // The Custom quiz's picking page on its My mix-ups view (the view the page keeps is the last one chosen).
  mixups: () => {
    store.set(CQ.VIEW, 'mix');
    location.hash = hr('quiz-custom');
  },
  // The subject's basics module (Coral basics, Fish basics), as the first-launch offer's button opens it.
  basics: () => go('basics'),
  // The subject's Identify tool (the Coral ID Key).
  identify: () => (location.hash = hr(keyOf(SUBJ))),
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
// The tip's card (cardShow kind 'tip'), anti-reflex as the one-tap question (no tap for TIP.WAIT ms, the focus on the
// title). Logged as one-tap events (ev 'pulse', src "tip:<id>", r shown / show / ok / none: no new sheet column; the
// admin counts them apart), at most 2 a showing.
function tipShow(t, st, cur, now = 0) {
  store.set(TIPR.KEY, tipShown(st, t.id, now));
  const mouse = matchMedia('(hover: hover) and (pointer: fine)').matches,
    im = $v.querySelector('.q.done .qstage .zoom img'),
    at = {m: cur.split('|')[0], n: session.n},
    log = r => ev('pulse', {r, src: 'tip:' + t.id, ...at});
  log('shown');
  const d = cardShow({
    kind: 'tip',
    cls: 'tipcard',
    kick: esc(t.card.kick),
    title: esc(t.card.title({mouse, subj: SUBJ, basics: basicsWords(), key: idWords()})),
    body: `${t.act === 'zoom' && im ? `<div class="tipvis" aria-hidden="true"><img src="${esc(im.currentSrc || im.src)}" alt="">${ZOOMI}</div>` : ''}<p>${esc(t.card.body({mouse, subj: SUBJ, basics: basicsWords(), key: idWords()}))}</p>`,
    primary: t.act ? {text: 'Show me', attr: 'disabled'} : null,
    secondary: {text: 'Got it', attr: 'disabled'},
    focus: 'h3',
    enter: () => {},
    bind: d => (d.querySelector('h3').tabIndex = -1),
    onClose: how => {
      log(how === 1 ? 'show' : how === 'route' ? 'none' : 'ok');
      if (how === 1 && TIP_ACT[t.act]) TIP_ACT[t.act]();
      else if (how !== 'route' && !t.out) route(); // a game goes on to its next question; a page stays as it is
    }
  });
  setTimeout(() => d.querySelectorAll('[data-b]').forEach(b => (b.disabled = false)), TIP.WAIT);
}
// The subject's words for the Identify tip (app.js UNITS idtip), null for a subject whose Identify tool is not built.
const idWords = () => UNITS[SUBJ.id].idtip || null;
// A page drawn (app.js route, and SETUP 2 for one drawn before this tier): the Identify tool's page counts as one open
// (tip i), and Home or My progress may show the tip about it.
function tipRoute(h) {
  if (idWords() && sectionOf(h) === 'identify' && modeOf(h) === keyOf(SUBJ) && tipsLoad().u.i < 1) tipOpened('i');
  tipOut();
}
// The tip outside the games: on Home or My progress, at a calm moment (TIP.OUT ms after the page is drawn, as the install
// nudge and the subject hello wait on Home), checked again then: the same page, nothing on screen (a card, the tour, a
// toast, the help, the settings, a photo), within the prompt spacing (promptOk, then promptMark). The visit is the
// device's last one (tips.js tipDue with the time). A page that closes the card unseen brings it back at the next visit.
let tipOutT = 0;
function tipOut() {
  clearTimeout(tipOutT);
  tipOutT = 0;
  const ctx = () => (hashNow() || 'home').split('|')[0],
    b = () => ({ctx: ctx(), miss: false, zm: false, mix: 0, bx: 0, ix: idWords() ? 1 : 0});
  if (!tipDue(tipsLoad(), b(), TIPS, Date.now())) return;
  const at = ctx();
  tipOutT = setTimeout(() => {
    tipOutT = 0;
    const now = Date.now(),
      s = tipsLoad(),
      t = ctx() === at && tipDue(s, b(), TIPS, now);
    if (!t || !lb.hidden || !$helpbox.hidden || !$set.hidden || document.querySelector('.apptoast') || !promptOk()) return;
    promptMark();
    tipShow(t, s, at, now);
  }, TIP.OUT);
}
// One-tap questions (docs/ARCHITECTURE.md "One-tap questions"): a question from core.js PULSEQ (pulsePick's rounds)
// answered in one tap or "Not now", logged as ev 'pulse'; nothing in the game changes with it. From PULSE.FIRST answers,
// then every PULSE.EVERY (PULSE.AFTERX times that after "Not now"), only once the session has PULSE.SESS_N answers and
// lasted PULSE.SESS_MS (pulseSess; a session: answers under SESSION.GAP apart, as the admin's). Asked in every subject,
// each with its own pacing (pulseSt, under sDev('pulse'): the answers it counts, answersSoFar, are the subject on
// screen's): {at: the answer clock when the last showed (model.js tally; PULSE.FIRST reads the count), q: its item,
// left: the round's items, x: 1 after "Not now"}. The session is the subject's too (Pierre, 2026-11-20: «Attention à
// avoir des compteurs par matière»): the device's run of answers in one subject, an answer in another subject starting
// a new one, v {t0, t, n, s: the subject} in PULSEK (pulseV), which is the first subject's own key too (its dev is ''),
// so its record stays as it was.
const PULSE = {FIRST: 35, EVERY: 40, AFTERX: 2, SESS_N: 15, SESS_MS: 5 * 60000, WAIT: 600},
  PULSEK = 'reefid-pulse';
const pulseObj = k => {
  const st = store.get(k, {});
  return st && typeof st === 'object' ? st : {};
};
const pulseSt = () => pulseObj(sDev('pulse')),
  pulseV = () => pulseObj(PULSEK).v;
// The session an answer at time t in subject s belongs to: the same one when the last answer was in s less than
// SESSION.GAP before it, else a new one (a long session in one subject never brings the prompt at the first answer in
// another). Every answer in a game counts (answer()), whatever the game, as the admin counts sessions.
const pulseVisit = (v, t, s) =>
  v && typeof v === 'object' && [v.t0, v.t, v.n].every(x => typeof x === 'number') && v.s === s && t >= v.t && t - v.t < SESSION.GAP
    ? {t0: v.t0, t, n: v.n + 1, s}
    : {t0: t, t, n: 1, s};
const pulseNote = (t = Date.now()) => {
  const st = pulseObj(PULSEK);
  store.set(PULSEK, {...st, v: pulseVisit(st.v, t, SUBJ.id)});
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
  if (!(photoQuiz(h) || h.startsWith('quiz-duel')) || document.querySelector('#tour, .unlock')) return false;
  const a = answersSoFar(),
    c = tally(),
    st = pulseSt(),
    at = typeof st.at === 'number' ? st.at : -1e9;
  const v = pulseV();
  return a >= PULSE.FIRST && (c < at || c - at >= PULSE.EVERY * (st.x ? PULSE.AFTERX : 1)) && !!v && v.s === SUBJ.id && pulseSess(v);
};
// Response rate (Pierre's question: shown against answered): each prompt logs PULSE_SHOWN, then its answer's code,
// PULSE_SKIP ("Not now", Escape) or PULSE_NONE (the page left with it up); every event carries what the game knew when it
// showed (pulseOpen), so both fall in the same level band and mode. At most 2 events a prompt, far within the sheet's caps.
let pulseOpen = null;
const pulseEv = r => pulseOpen && ev('pulse', {r, src: pulseOpen.id, ...pulseOpen.at});
// After an answer whose prompt is due, Next asks it before the next question (inline in the feedback it went unseen),
// checked again at the tap (an overlay since: it waits, nothing marked). It takes the break first: a tip waits.
function pulseArm(nb) {
  breakArm(nb, () => {
    if (!pulseDue() || overlayBusy()) return false;
    promptMark();
    pulseAsk();
    return true;
  });
}
// The prompt's card (cardShow kind 'feedback'). Anti-reflex: no tap for PULSE.WAIT ms (a double tap on Next cannot
// answer it) and the focus on the question (Enter answers nothing); Escape is "Not now". Its close draws the next question.
function pulseAsk() {
  const st = pulseSt(),
    pk = pulsePick(st),
    it = pulseItem(pk.q),
    h = session.h;
  // the session kept where it lives (the first subject's record, PULSEK), never copied into another subject's
  const k = sDev('pulse');
  store.set(k, {at: tally(), q: pk.q, left: pk.left, ...(k === PULSEK ? {v: pulseV()} : {})});
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
        if (how !== 'route') store.set(sDev('pulse'), {...pulseSt(), x: 1});
        pulseOpen = null;
      }
      if (how !== 'route') route();
    }
  });
  setTimeout(() => d.querySelectorAll('[data-pulse]').forEach(b => (b.disabled = false)), PULSE.WAIT);
}
// Card photos: the cards sit outside the page view, out of reach of app.js's retries. Here too a photo that fails is
// tried again twice (after 1 s, then 4 s), and is kept out of sight meanwhile; if it never comes, the "photo missing"
// tile (app.js noPhoto): never a broken-image icon on a card.
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
// A genus sheet opened from inside a game (the answer's genus name): on a computer, in a new tab, so the game stays where
// it was (docs/decisions/2026-11-18-decisions-from-app-comments.md); on a phone or tablet the same tab (new tabs there
// are clumsy, and Back returns to the game). Desktop size class with a mouse: the shared rule U4 classes, no breakpoint
// of its own.
const sheetTab = () => (!isStacked() && !matchMedia(MQ.touch).matches ? ' target="_blank" rel="noopener"' : '');
// One contrast queue (docs/LEARNING.md "One contrast queue"): the "Again: A or B?" after a mix-up and a duel slipped in
// are one 2-choice question. A mix-up queues its pair (rematchAdd); with none queued, a question becomes a duel with the
// chance CONTRAST.P (duelPick: both met and ready, never the last pair); contrast questions, and an Again after its
// mix-up, CONTRAST.GAP apart, from the first answers on.
const CONTRAST = {P: 0.1, GAP: 2, Q: 3};
// Find the X (docs/LEARNING.md "Find the X slipped into the fish quiz"): one name, four photos, tap the one that shows
// it. Where UNITS tiles exist (the fish, the sea slugs), on the units of the subject's own rank and on its species, with
// the chance P (planPhoto), in the contrast slot: spaced as the duels.
const FIND = {P: 0.05};
let rematch = [], // the pairs queued by mix-ups, oldest first: {pair, at: answers so far when the missed question showed}
  twoAt = -Infinity, // answers so far when the last contrast question (an Again, a duel or a Find the X) showed
  twoPair = '', // and its pair
  AUTOD = false, // the question on screen is a duel slipped in (set by quizPhoto, read by answer)
  FINDX = false; // the question on screen is a Find the X (set by quizPhoto, read by answer)
// "This pair comes back as a duel in a moment": said the first 3 times only (else it comes with nearly every wrong
// answer); the pair still comes back every time.
// Queues the pair of a mix-up (CONTRAST.Q at most, a pair already waiting not twice). True when it is in the queue.
// mim: the id of the mimicry pair when the photo missed was of the class and the answer the unit it resembles, kept on
// the entry (a string, as the planner's snapshots copy it) so its Again shows the pair's species.
const rematchAdd = (pair, at, mim = '') => {
  if (!Array.isArray(rematch)) rematch = rematch ? [rematch] : [];
  const k = pair.slice().sort().join('|'),
    r = rematch.find(x => x.pair.slice().sort().join('|') === k);
  if (r) {
    if (mim && !r.mim) rematch = rematch.map(x => (x === r ? {...x, mim} : x));
    return true;
  }
  if (rematch.length >= CONTRAST.Q) return false;
  rematch = [...rematch, {pair, at, ...(mim ? {mim} : {})}];
  return true;
};
// It sits behind More on the short feedback sheet: it counts as told once More is opened (fbMoreBind), never for a sheet that
// stays short.
const againLeft = () => store.get('reefid-again-told', 0) < 3;
const againTold = () => {
  const n = store.get('reefid-again-told', 0);
  if (n >= 3) return false;
  store.set('reefid-again-told', n + 1);
  return true;
};
// The next questions chosen ahead, their photos fetched meanwhile, so Next shows one at once on a slow line (decision:
// docs/decisions/2026-11-18-decisions-from-app-comments.md): up to AHEAD in the photo quiz, one in the Duel tab. NEXTQ, the
// first, holds the next (.next); one is used only under its planKey. A question with cards, an exam, a duel or an "Again"
// ends the queue; a miss drops it, its planner state put back (snap); after a right answer the weights lag AHEAD - 1. The
// photos do not lag: the draw reads the questions queued here and those shown (model.js SEENQ), so a question planned
// behind another on the unit never repeats its colony.
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
const plain = q => !q.intro && !q.auto && !q.findx && !q[4].exam && q[2].length > 2;
// The prompts of the formats as the planners write them (planPhoto, planFind, planDuel), for a kept question built again
// (pendBuild): tests/pending.test.js reads the planners' source and fails when one of them changes its words.
const QPROMPT = {
  which: t => `Which ${GX(t).one || SUBJ.one}?`,
  type: t => `Which ${GX(t).one || SUBJ.one}? Type it`,
  find: t => `Find the ${uname(t)}`,
  again: (a, b) => `Again: ${uname(a)} or ${uname(b)}?`,
  look: (a, b) => `Look-alikes: ${uname(a)} or ${uname(b)}?`,
  duel: (a, b) => `${uname(a)} or ${uname(b)}?`
};
// The pending question (docs/spec/quiz.md "The pending question"): the question on screen is kept per subject and per game
// (cur: the Quiz, the Custom quiz, the Duel tab, one pair's duels) on this device, from the moment it shows until it is
// answered, so leaving the page (Learn, My progress, anywhere) or reloading it brings back the same question, its photos
// and its choices, never a new draw. It is stored as units and photo files, never as HTML or photo records: a kept
// question is built again from the current data (pendBuild), so a photo or a genus that left the draw ends it (pendOk) and a
// new question is drawn. A question about the genus its own first-meeting card introduces is not kept (its card is the
// genus's meeting); one shown with another genus's card is kept (introAdd marks that genus met when its card shows, so the
// card does not come back).
// The seconds already looked at it travel with it (rt, QCLOCK.pre): the time away is not counted, the time before is.
const PEND = {KEY: 'pending', MAX: 6};
const pendKey = () => sDev(PEND.KEY); // reefid-<dev>pending: stays on this device, cleared at sign-out (sync.js)
const pendAll = (key = pendKey()) => {
  const o = store.get(key, null);
  return o && typeof o === 'object' && !Array.isArray(o) ? o : {};
};
let PENDQ = null; // the kept question on screen: {key, cur, el}
let PENDSCI = null; // the name display ('sc' / 'so', app.js sciShow) the next question is shown with, when it comes back
// The record of question q of game cur: null when it is not kept (a question about the genus its own card introduces, a photo
// with no file name).
function pendRec(cur, q) {
  const [, t, c, , set, kq] = q;
  if ((q.intro || []).includes(t) || !set || !Array.isArray(set.shown) || !Array.isArray(c)) return null;
  const ph = p => (p && p.f ? [p.f, String(p.view || '')] : null),
    sh = set.shown.map(ph),
    hi = set.hint ? ph(set.hint) : null,
    re = set.reveal ? set.reveal.map(ph) : null,
    fd = set.find ? set.find.map(x => [x.n, ph(x.p)]) : null;
  if ([...sh, ...(re || []), ...(set.hint ? [hi] : []), ...(fd || []).map(x => x[1])].some(x => !x)) return null;
  const kind = q.findx ? 'find' : q.again ? 'again' : q.auto ? 'look' : cur.startsWith('quiz-duel') ? 'duel' : set.typed ? 'type' : 'which';
  return {
    t,
    c: c.slice(),
    k: Number.isFinite(kq) ? kq : 0,
    kind,
    pr: q.pr || null,
    sh,
    hi,
    re,
    fd,
    ty: set.typed ? 1 : 0,
    ex: set.exam ? 1 : 0,
    cu: q.custom ? 1 : 0,
    wm: q.warm ? Number(q.cb) || 1 : 0,
    // how its names were shown (SCIQ, set by question just before): the choice at random is made once
    sv: typeof SCIQ !== 'undefined' && SCIQ && SCIQ.t === t ? SCIQ.v : null
  };
}
// The question of a record r, built from the current data; null when anything of it is gone or not as expected.
function pendBuild(cur, r) {
  const unit = n => typeof n === 'string' && !!GX(n),
    // The photo of unit n by its file, as the draw made it ({...record, view}); one hidden or moved since is gone. A mastery
    // exam question may show a photo the player's reserve holds back from the games (core.js heldOf: model.js examPics).
    pic = (n, x) => {
      const p =
        Array.isArray(x) && typeof x[0] === 'string'
          ? VIEWS.flatMap(([v]) => [...gamePics(n, v), ...(r.ex ? heldOf(GX(n), v) : [])]).find(y => y.f === x[0] && gamePhotoOk(n, y))
          : null;
      return p ? {...p, view: typeof x[1] === 'string' ? x[1] : ''} : null;
    };
  if (
    !r ||
    typeof r !== 'object' ||
    !unit(r.t) ||
    !Array.isArray(r.c) ||
    r.c.length < 2 ||
    !r.c.every(unit) ||
    !Array.isArray(r.sh) ||
    !r.sh.length
  )
    return null;
  const duel = cur.startsWith('quiz-duel'),
    pr = Array.isArray(r.pr) && r.pr.length === 2 && r.pr.every(unit) ? r.pr : r.c.slice(0, 2),
    prompt = {
      find: () => QPROMPT.find(r.t),
      again: () => QPROMPT.again(...pr),
      look: () => QPROMPT.look(...pr),
      duel: () => QPROMPT.duel(...r.c),
      type: () => QPROMPT.type(r.t),
      which: () => QPROMPT.which(r.t)
    }[r.kind];
  if (!prompt || duel !== (r.kind === 'duel')) return null;
  const sh = r.sh.map(x => pic(r.t, x)),
    hi = r.hi ? pic(r.t, r.hi) : null,
    re = Array.isArray(r.re) ? r.re.map(x => pic(r.t, x)) : null,
    fd = Array.isArray(r.fd) ? r.fd.map(x => (Array.isArray(x) && unit(x[0]) ? {n: x[0], p: pic(x[0], x[1])} : null)) : null;
  if ([...sh, ...(re || []), ...(fd || []).map(x => x && x.p)].some(x => !x) || (r.hi && !hi)) return null;
  const set = {
      shown: sh,
      hint: hi,
      ...(re ? {reveal: re} : {}),
      ...(fd ? {find: fd} : {}),
      ...(r.ty ? {typed: 1} : {}),
      ...(r.ex ? {exam: true} : {})
    },
    k = Number.isFinite(r.k) && r.k >= 0 ? r.k : 0;
  return Object.assign(
    [cur, r.t, r.c.slice(), prompt(), set, k],
    r.kind === 'find' ? {findx: 1} : {},
    r.kind === 'again' ? {again: 1, pr} : {},
    r.kind === 'look' ? {auto: pr.slice().sort().join('|'), pr} : {},
    r.cu ? {custom: 1} : {},
    r.wm ? {warm: 1, cb: Number(r.wm) || 1} : {},
    r.sv === 'sc' || r.sv === 'so' ? {sv: r.sv} : {}
  );
}
// Whether the kept question q of game cur can still be asked: its genus (and its choices) still in play and met, in the
// custom quiz still among the genera picked, in the Duel tab still unlocked, an exam question still due. Photos: pendBuild.
function pendOk(cur, q) {
  const [, t, c, , set] = q,
    play = pool();
  // The target is in play, met and among its choices. The choices of a question with several are known units: the wrong ones
  // may be a rank's fallback outside the units in play (model.js distractors, rankUnits); the choices of a pair (an Again, a
  // duel) and the four of a Find the X are drawn among the units in play.
  if (!play.includes(t) || !introduced(t) || !c.includes(t)) return false;
  if ((c.length === 2 || q.findx) && !c.every(n => play.includes(n))) return false;
  if (cur === CUSTOM_H) return (customSel() || []).includes(t);
  if (cur.startsWith('quiz-duel')) {
    const open = unlocked(play);
    return c.every(n => open.includes(n));
  }
  return !set.exam || examReady(t);
}
// The kept question of game cur: {q, rt, zm} (rt: the seconds looked at it before), or null, a question that cannot be kept
// being forgotten.
function pendTake(cur) {
  const key = pendKey(),
    r = pendAll(key)[cur];
  if (!r) return null;
  const q = pendBuild(cur, r);
  if (!q || !pendOk(cur, q)) return (pendDrop(cur, key), null);
  return {q, rt: Math.max(0, Math.min(600, Number(r.rt) || 0)), zm: r.zm ? 1 : 0};
}
function pendDrop(cur, key = pendKey()) {
  const all = pendAll(key);
  if (cur in all) (delete all[cur], store.set(key, all));
}
// The question now on screen (question() was just called for it): kept as it is, or, when it came back from the store
// (kept: pendTake's reply), with the clock it left with.
function pendShow(cur, q, kept) {
  if (kept) {
    Object.assign(QCLOCK, {pre: kept.rt, zm: kept.zm});
    PENDQ = {key: pendKey(), cur, el: $v.querySelector('.q')};
    return;
  }
  const key = pendKey(),
    all = pendAll(key),
    r = pendRec(cur, q);
  if (r) all[cur] = {...r, rt: 0, zm: 0, at: Date.now()};
  else delete all[cur];
  const old = Object.keys(all).sort((a, b) => (all[a].at || 0) - (all[b].at || 0));
  old.slice(0, Math.max(0, old.length - PEND.MAX)).forEach(k => delete all[k]);
  store.set(key, all);
  PENDQ = r ? {key, cur, el: $v.querySelector('.q')} : null;
}
// The question was answered, or another one was asked for (a photo that would not load): nothing is kept for it.
function pendDone() {
  if (PENDQ) pendDrop(PENDQ.cur, PENDQ.key);
  PENDQ = null;
}
// The seconds looked at the question on screen, written when the player leaves the page (app.js route), hides it or closes it.
// A clock not started yet (no photo in: qclockRead is null) leaves what the record holds, the seconds a kept question
// came back with included.
function pendClock() {
  if (!PENDQ || !PENDQ.el || !PENDQ.el.isConnected) return;
  const all = pendAll(PENDQ.key),
    r = all[PENDQ.cur],
    // closed while hidden: the time since it was hidden is not looked time (QCLOCK.off adds it when the page shows again)
    rt = qclockRead(QCLOCK.hid === null ? undefined : QCLOCK.hid);
  if (!r) return;
  if (rt !== null) r.rt = rt;
  r.zm = QCLOCK.zm ? 1 : 0;
  store.set(PENDQ.key, all);
}
// The photos of a kept question are the window's latest (model.js SEENQ): the entry of its first showing is replaced, not repeated.
const pendSeen = q => {
  const k = L => L.map(p => p && p.f).join();
  SEENQ = SEENQ.filter(e => k(e.L) !== k(qPhotos(q)));
};
// The planned questions' photos, fetched in the order needed, two files at a time (all at once, the first photo came
// later than with no preloading: tools/perf.js, slow 3G); the question on screen (ONQ) first, a dropped one no more.
// prefetched() resolves once nothing is left (the start-up's next tier waits for it).
let PF = [],
  ONQ = null,
  pfLive = 0,
  pfWait = [];
const pfUrls = q => {
  const set = q[4],
    later = [...(set.hint ? [set.hint] : []), ...(set.reveal || [])],
    // Find the X shows its four tiles only, never its question's own photo (shown) at 480 px or full size.
    shown = set.find ? [] : set.shown || [],
    n = shown.length;
  return [
    ...new Set([
      ...(q.intro || [])
        .map(g => cover(GX(g)))
        .filter(Boolean)
        .map(p => img(p, 's')),
      ...shown.flatMap(p => [img(p, 's'), qsrc(p, n)]),
      ...later.map(p => img(p, 's')),
      ...later.map(p => qsrc(p, n + later.length)),
      // Find the X: its four tiles (app.js tileSrc), in the order shown.
      ...(set.find || []).map(x => tileSrc(x.p))
    ])
  ].filter(u => ownPhoto(u) || AWAY); // the site's own files, on R2 or the site (an iNaturalist photo waiting to be downloaded loads when shown; once R2 failed, the online originals that stand in for the site's files)
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
      // Once R2 is given up, or this file failed on it already, a URL queued before goes to its online original or the
      // site straight away.
      const v = x.urls.shift(),
        u = AWAY || r2Missed(v) ? photoAway(v, photoLook) : v;
      i.onload = () => (pfLive--, r2Loaded(u), pump());
      // A preload is no element of the page (app.js photoFail): failed on R2, it is asked from R2 once more after
      // PHOTO_RETRY ms (core.js photoRetry; under a service worker, the worker did), then its online original or its file
      // on the site (core.js photoAway); with no service worker it counts toward giving R2 up (app.js r2Failed).
      i.onerror = () => {
        pfLive--;
        if (photoLocal(u) !== u) {
          x.r2try = x.r2try || new Set();
          if (!swOn() && !x.r2try.has(u)) {
            x.r2try.add(u);
            return setTimeout(() => (x.urls.unshift(u), PF.includes(x) || PF.push(x), pump()), PHOTO_RETRY);
          }
          if (!swOn()) r2Failed(u);
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
  // The bars read from one false-alarm table while it runs (app.js faHeld).
  return faHeld(() => {
    if ((!photoQuiz(cur) && cur !== 'quiz-duel') || document.querySelector('.unlock.intro')) return;
    // The custom quiz needs its selection (a link to it without one opens the selection screen).
    if (cur === CUSTOM_H && !customSel()) return;
    const o = $v.querySelector('.q:not(.done)') ? 1 : 0;
    // A question on screen that changes what comes next (an exam question, a duel slipped in, an "Again", cards) is answered
    // before anything is planned past it: its answer moves the exam's spacing and the photos seen.
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
  });
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
  // The bars read from one false-alarm table while it runs (app.js faHeld).
  return faHeld(() => {
    // The first-launch question first (model.js startOf): a player with no answer to it (tour skipped, or an existing
    // player) is asked on a card before the next quiz question; from CHOICE.ASK answers on it is inferred, silently.
    // A question shown and not answered (the player went to Learn and came back, or reloaded) comes back as it was, before
    // anything else is decided: pendTake. A new one only once it is answered, or when its photo or genus left the draw.
    const kept = pendTake(cur);
    if (!kept && cur === 'quiz' && startGate()) return startAskShow(cur);
    // Now and then a wink instead (winkShow): not a question of the game. Decided before any question is taken or chosen,
    // so the planned ones and the Again / duel spacing wait for the next. The photo quiz only.
    const wk = !kept && cur === 'quiz' && winkDue();
    if (wk) return winkShow(wk);
    let q = kept ? kept.q : takePlan(cur) || planPhoto(cur);
    // Chosen again: every planned question after a new break (rustNow: the app may stay open across it), a comeback
    // question once the rust melted, and a card of the path that would now wait (noOpen, introHold, model.js openRight:
    // an opening only after a right answer; a level's group, lvl, as a card of the path). The custom quiz's cards are the
    // player's choice: they never wait. A kept question stays whatever happened meanwhile (its player has not answered it
    // yet): only the questions planned behind it are chosen again after a break.
    const brk = rustNow();
    if (kept) {
      if (brk) dropPlans();
      // After a reload no question remembers it was asked: the draw's repeat window starts with it.
      if (!lastQs.includes(q[1])) ((last = q[1]), (lastQs = [...lastQs, q[1]].slice(-4)));
      pendSeen(q);
    } else if (
      brk ||
      (q.intro && !q.custom && (noOpen() || ((!q.start || q.lvl) && (introHold() || !openRight())))) ||
      !!q.warm !== cbIn(cur)
    ) {
      dropPlans();
      q = planPhoto(cur);
    }
    SHOWNQ = q;
    AUTOD = !!q.auto;
    FINDX = !!q.findx;
    PENDSCI = q.sv || null;
    question(...q);
    pendShow(cur, q, kept);
    // A custom-quiz card: the genus is asked with it (ready at once, a card of its own, no Open all offer on it).
    // The first cards' "Had the IMR lecture? Open all" box: not for a player who answered "I'm new to corals" (My progress
    // keeps the button for them), nor on a level's group (introShow).
    if (q.intro)
      q.custom ? introShow(q.intro, true, 'c', false) : introShow(q.intro, q.start, undefined, q.start && (startOf() || {}).c !== 'new');
    // The offers about which genera are in play (back to one at a time, bonus genera) belong to the photo quiz. Open all
    // is on the first cards and in My progress, never offered here. None over a kept question: it was shown with them.
    else if (cur !== 'quiz' || kept) {
    } else if (!noOpen() && promptOk() && startDue())
      (promptMark(), startFbShow(startDue())); // the first answers do not fit the first-launch answer (model.js startDue)
    else if (!noOpen() && promptOk() && backDue()) (promptMark(), backShow());
    else if (!noOpen() && promptOk() && openOfferDue()) (promptMark(), openOfferShow());
    else if (!noOpen() && promptOk() && bonusOfferDue()) (promptMark(), bonusOfferShow());
    // The back card is said once: signed in, only once the visit's first sync brought the choice made on another device
    // (sync.js noticesReady).
    else if (!noOpen() && promptOk() && noticesReady() && bonusBackDue()) (promptMark(), bonusBackShow());
    zoomHint(); // once per device, never over a card or offer shown just above
    topUp(); // the questions after this one, chosen while it is played (planNext)
  });
}
// The first-launch question's cards (core.js CHOICE; docs/ARCHITECTURE.md "First-launch question"): asked on a card when
// the quiz opens with no answer yet (the tour asks it first); from CHOICE.ASK answers on, inferred (startInfer), never asked.
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
            const next = () => startBasicsOffer(cur) || quizPhoto(cur);
            namesAskShow(b.dataset.start, next) || next();
          })
      )
  });
  d.ulDone = () => (d.close('sync'), quizPhoto(cur));
}
// The names step (app.js UNITS namesStep, namesAsk): right after the first-launch answer c on its card, common names, scientific
// names or both; go: what comes next (the basics offer, the quiz). An answer sets the What I learn rows (namesSet); Escape
// leaves them as they play. Its own card class, not startq: the question's card is the one the sync closes (model.js
// startMerge). Returns whether it showed.
function namesAskShow(c, go) {
  if (!namesAsk(c)) return false;
  const N = namesDecl();
  const d = cardShow({
    kind: 'feature',
    cls: 'namesq',
    kick: 'Before you start',
    title: N.q,
    label: N.q,
    body: `<p>${esc(N.lede)}</p>${namesOptsHtml(null)}`,
    esc: () => (d.close('esc'), go()),
    bind: d =>
      d.querySelectorAll('[data-names]').forEach(
        b =>
          (b.onclick = () => {
            namesSet(b.dataset.names);
            d.close('pick');
            go();
          })
      )
  });
  return true;
}
// "I'm new to corals" (CHOICE v.basics): the subject's basics module (Coral basics, Fish basics) offered first, about 5
// minutes, then the quiz. Only while the module is not done, and only for a subject that has one (app.js basicsDue), in
// its words (UNITS basics). Returns whether it showed.
function startBasicsOffer(cur) {
  if (!startV().basics || !basicsDue()) return false;
  const W = basicsWords();
  cardShow({
    kind: 'tip',
    cls: 'startq basicsq',
    kick: W.kick,
    title: `Start with ${W.name}?`,
    body: `<p>${esc(W.offer)}</p>`,
    primary: {text: `${W.name} (5 min)`, attr: 'data-basics', on: () => go('basics')},
    secondary: {text: 'Start the quiz', on: () => quizPhoto(cur)},
    esc: 2, // Escape: the quiz
    note: `Learn › ${W.name}, any time.`
  });
  return true;
}
// The fallback card (model.js startDue), once per direction. 'lo' (clearly below the choice): a gentle offer, never a
// verdict (one who gets it by mistake must not feel judged): the basics, which also eases the start silently
// (startEase), or "No thanks" (nothing changes). 'hi' (clearly above): a higher choice, or keep. The answers stay.
function startFbShow(dir) {
  const o = startOf(),
    next = startNext(o.c, dir),
    said = `said “${esc(startText(SUBJ.id, o.c)[0])}”`,
    // Everything opened at once (Open all): the "first genera" are all of them (the same card, its text about the whole
    // set, no number: the counts change; worded from the subject, rule S1).
    all = Object.values(introMap()).some(e => (e || [])[3] === 'a');
  startShown(dir);
  const d = cardShow(
    dir === 'lo'
      ? {
          kind: 'tip',
          cls: 'startfb',
          kick: 'A tip',
          title: all ? `All the ${SUBJ.many} at once is a lot` : `The first ${SUBJ.many} feel hard?`,
          label: 'Your start',
          body: all
            ? `<p>${esc(basicsWords().name)} in 5 minutes? ${esc(basicsWords().all)}</p>`
            : `<p>They do for most people. ${esc(basicsWords().lo)}</p>`,
          primary: {text: `${basicsWords().name} in 5 minutes`, attr: 'data-basics', on: () => (startEase(), go('basics'))},
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
// The opt-in sets' offer (app.js UNITS sets: the coral bonus genera, fish circles 2 and 3), the first due, once: after
// every slate unit was asked, not just met (Open all would bring it before the quiz showed them), no choice made yet.
// "Add them": they open one at a time (a genus closed by One at a time keeps its card first); "Not now": never again (⚙
// any time). A prompt (promptOk); its units' covers as a row of round crops (bonusThumbs).
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
// The back card: once, to a player who turned an opt-in set on under its earlier rules (UNITS sets rv, back: the fish
// scientific genera, now from Advanced). Off keeps their progress and a set's auto units; either choice is recorded under
// rv (bonusSet), synced. A prompt; leaving the page unanswered: it comes back.
const bonusBackDue = () => SETS().find(S => S.back && S.rv && Q[S.k] === true && (Q[S.k + 'V'] || 0) < S.rv) || null;
function bonusBackShow(S = bonusBackDue()) {
  if (!S) return;
  const B = S.back,
    keep = autoOf(S);
  cardShow({
    kind: 'bonus',
    cls: 'intro',
    kick: S.kick,
    title: B.title,
    body: `<p>${B.body}</p>${keep.length && B.imr ? `<p class="ulnote">${B.imr} ${keep.map(uname).join(', ')}</p>` : ''}`,
    // Closed, a question on screen about a unit no longer in play (a genus just closed) is replaced at once, unanswered
    // The card is gone before its button's on runs (app.js cardShow act).
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
// A part of the slate opened by choice (UNITS opens: fish circle 3) when due (openOfferDue): "Not now" the safe default
// (the card comes back once, OPEN_AGAIN answers later: core.js openState), "Open them" opens its units one at a time.
// My progress opens them any time; leaving the page unanswered: it comes back.
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
// At most BONUS_THUMBS of them, then "+N" (a long row would push the card off the screen).
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
  // A level's group (model.js openGroup, levelTop): units below the subject's own (species, scientific genera), so its
  // note names no subject word and it offers no Open all (the lecture's units are the subject's own).
  const below = kind === 's' && L.some(n => rankKind(n));
  const card = () => {
    const n = L[i],
      more = i < L.length - 1;
    // Met when its card is shown: a sequence left half-way (reload) shows the rest next time.
    introAdd([n], start, kind);
    const c = introCard(n, {
      pos: L.length > 1 ? `${i + 1} of ${L.length}` : '',
      hint: start && !told,
      // The first cards say what the first questions are about; cards met ready at once later (a duel's, the custom
      // quiz's) say the next question is about them.
      note: start
        ? more
          ? below
            ? `The next questions are about these ${L.length}.`
            : `The ${kind === 's' ? 'first questions are' : 'next question is'} about these ${L.length} ${SUBJ.many}.`
          : below && L.length < 2
            ? 'The next question is about it.'
            : 'Now, which is which?'
        : 'It comes up in the questions a little later.',
      btn: more ? 'Next' : start ? 'Start' : 'Got it',
      all: offerAll && !below && introLeft().length > 0
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
    // a set's line on its units' cards: a text, or a function of the unit (app.js UNITS fish sets sp: the milestone)
    sc = isBonus(n) ? setOf(n).card : '',
    scard = typeof sc === 'function' ? sc(n) : sc,
    star = typeof starNote === 'function' && DATA.gen[n] ? starNote(n) : '',
    tips = tipsList(g),
    hinted = !!o.hint && tips.includes('data-gt');
  return {
    kind: SUBJ.card,
    cls: 'intro',
    photo: p ? img(p, 's') : '',
    kick: `${isBonus(n) ? setOf(n).tag : 'New ' + SUBJ.one}${o.pos ? ` · ${o.pos}` : ''}`,
    title: uname(n),
    body: `${unitCname(n) ? `<p class="ulcn">${esc(unitCname(n))}</p>` : ''}${g.name ? `<p class="ulfam">${esc(altName(g.fam))}</p>` : ''}${plainLine(g)}
      ${star ? `<p class="ulnote">${star}: on the slate so you learn to tell them apart.</p>` : ''}
      ${isBenthic(n) ? `<p class="warn">${BENTHIC_NOTE}</p>` : scard ? `<p class="ulnote">${scard}</p>` : ''}
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
// the progressive path's draw, easiest first); else the rest of a level's group (model.js levelTop: a group left
// half-way, a level an older record met fewer than INTRO.START times), shown and asked as first cards are; else none:
// planPhoto may add one, or a level's group (model.js openGroup), when its draw falls on a unit not met.
// The cards drawn before count as met: a ★ genus may follow its reference's card, shown before it (model.js openPick,
// first: drawn unit by unit, the confusion groups taking over from the next card).
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
    L.push(openPick(fresh, fresh, met, {first: true}));
  return L.length ? L : levelTop(list);
}
// The decoys of the mimicry class for a Find the X on unit t (docs/LEARNING.md "The mimicry class", Q416 c: a photo of the
// class is the decoy tile on "Find the Angelfish"): for each pair whose model's species t holds (an entry's m, app.js
// mimLay, on the family of the species that resembles it), the unit d at t's own rank of the species that resembles it,
// when d is in the list, met and ready, and its draw holds a tile of the class now (model.js mimSide, drawHas: a photo the
// unit still holds back never shows). dk keeps d's tiles to the class's photos; tk keeps t's to the species resembled at
// its stage when its draw holds such a tile now, null otherwise (any tile of t). A pair inside the unit asked is none.
function mimDecoys(t, list, tile) {
  const tiles = UNITS[SUBJ.id].tiles,
    out = [];
  for (const a of new Set(list.map(varHome)))
    for (const m of (GX(a) || {}).mim || []) {
      if (!m.m.includes(t) || m.u.includes(t)) continue;
      const d = m.u.find(x => GX(x) && rankKind(x) === rankKind(t)),
        dk = d && (p => tile(p) && mimSide(m, d)(p)),
        tk = p => tile(p) && mimSide(m, t)(p);
      if (
        d &&
        d !== t &&
        !choiceNames(d, t) &&
        !choiceNames(t, d) &&
        list.includes(d) &&
        introReady(d) &&
        tiles(d).some(dk) &&
        drawHas(d, dk)
      )
        out.push({m, d, dk, tk: drawHas(t, tk) && tiles(t).some(tk) ? tk : null});
    }
  return out;
}
// Find the X (FIND) is asked on the units of the subject's own rank and on its species, by common names or by scientific
// names; a scientific genus keeps its usual questions (docs/LEARNING.md "Find the X slipped into the fish quiz").
const findRank = n => !rankOf(n) || rankOf(n) === 'species';
// Find the X (FIND) on unit t, or null: with the chance FIND.P when t and three other units of its class (findRank; the
// class is rankKind: a species by its common name never stands with one by its scientific name), met and ready, have
// tiles (UNITS tiles); the others its look-alikes first (distractors, among the units in play only: wide false, so no unit
// of the rank outside them takes a place), each photo drawn by photoSet among its tiles. Scored as a 4-choice answer
// (another unit's photo tapped is that unit given, rule L2), logged |f. The chance is drawn last, so a unit or a subject
// with no tile draws exactly as without it.
function planFind(cur, t, list, ease = 0, sel = null) {
  const tiles = UNITS[SUBJ.id].tiles;
  if (!findRank(t) || !introReady(t) || !tiles(t).length) return null;
  const others = list.filter(n => n !== t && rankKind(n) === rankKind(t) && introReady(n) && tiles(n).length);
  if (others.length < 3 || !(Math.random() < FIND.P)) return null;
  const tile = p => !!p.xc,
    // The mimicry class's decoy (mimDecoys), when t is the unit of the species a pair resembles: its tile is a photo of the
    // class, in the place of the weakest trap (model.js mimTrap), and t's own photo is the species resembled at its stage.
    dcs = mimDecoys(t, list, tile),
    dc = dcs.length > 1 ? pick(dcs) : dcs[0] || null,
    ch0 = shuffle([t, ...distractors(t, others, 3, introReady, false)]),
    ch = dc ? mimTrap(t, ch0, dc.d) : ch0,
    set = photoSet(t, null, ease - confTerm(t, ch, 4), 4, 'find', dc && dc.tk ? dc.tk : tile),
    find = ch.map(n => ({
      n,
      p: n === t ? set.shown[0] : (photoSet(n, null, ease, 4, 'find', dc && n === dc.d ? dc.dk : tile).shown || [])[0]
    }));
  if (ch.length !== 4 || !find.every(x => x.p)) return null;
  return Object.assign([cur, t, ch, `Find the ${uname(t)}`, {...set, reveal: [], find}], {findx: 1, ...(sel ? {custom: 1} : {})});
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
    const {pair, mim} = rematch[0],
      // The custom quiz asks only its own genera; and never a genus not met yet (one offered to make up the choices and
      // picked would be opened by the side door, with no card). Nor a unit the other choice names (model.js choiceNames:
      // outside IMR, "Longnose butterflyfish" is a listed name of F. flavissimus, so its Again asks F. longirostris
      // only): with neither, no Again.
      ask = (sel ? pair.filter(n => sel.includes(n)) : pair).filter(
        n => (introReady(n) || (sel && sel.includes(n))) && !pair.some(o => choiceNames(o, n))
      );
    rematch = rematch.slice(1);
    // Never on a genus closed again by "One at a time" (model.js introBack): it waits for its card.
    if (ask.length && pair.every(n => play.includes(n) && !closed(n))) {
      twoAt = at;
      twoPair = pair.slice().sort().join('|');
      const t = pick(ask);
      // During a comeback an Again still follows a miss (it corrects it), as a comeback question.
      rustNow();
      const R = cbIn(cur) ? recallAt(t) : 1;
      // The Again of a mix-up on a photo of the mimicry class (rematchAdd mim) shows the pair's species on either side
      // (model.js mimKeep), when that side's draw holds one now.
      return Object.assign(
        [
          cur,
          t,
          shuffle(pair.slice()),
          `Again: ${uname(pair[0])} or ${uname(pair[1])}?`,
          photoSet(t, null, Math.log(R) + ease, 2, 'again', mimKeep(mim, pair, t))
        ],
        {again: 1, pr: pair.slice(), ...(sel ? {custom: 1} : {}), ...(cbIn(cur) ? {warm: 1, cb: Math.round(R * 1000) / 1000} : {})}
      );
    }
  }
  // The genus asked is one already met (INTRO), or one of the first cards shown with it; a genus the path opens (model.js
  // openPace) shows its card and the question is on another. After a break (rustNow; docs/LEARNING.md "Comeback after a
  // break"): a new visit or a comeback (cbIn, comebackOf: no card, duel or exam). The custom quiz: no path, its genus
  // drawn in the whole selection, one not met asked with its card; its comeback needs 2 of its genera answered right.
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
  let start = cards.length > 0,
    lvl = false;
  const ready = n => cards.includes(n) || introReady(n),
    known = n => cards.includes(n) || introduced(n),
    met = list.filter(ready),
    warmL = start || !cbIn(cur) ? null : comebackOf(met),
    warm = !!warmL,
    // One opening rule (model.js OPEN, openChance): when the path allows a card, this question opens a genus with the
    // chance of the free places for shaky genera, the genus drawn easiest and most common first (openPick); within the
    // rank share (model.js SHARE), a level short of INTRO.START units met only as a group (openFresh, openGroup).
    fresh =
      !sel && !start && !warm && met.length && !noOpen() && !introHold() && openPace(at, soon) && openRight(at)
        ? openFresh(
            list.filter(n => !introduced(n) && mayOpen(n)),
            list
          )
        : [];
  if (fresh.length && Math.random() < openChance(list)) {
    cards = openGroup(openPick(fresh, list), fresh, list);
    // A level's group (rule L4): shown and asked as first cards are (lvl: the path's, so it waits as a card does).
    lvl = start = lvlNeed(rankKind(cards[0]), list) > 0;
  }
  // With the first cards, the question is on one of them; with a card of its own, on a genus already met. A genus opened
  // in the last OPEN.WIN answers and not asked yet is asked once ready (due), so the opening's pace is the ceiling's
  // (openPace holds the next card until then), not the luck of the draw.
  const due = start || warm ? [] : openDue(at, list, soon);
  const t = sel
    ? nextTarget(warm ? warmL : sel, customDraw)
    : nextTarget(start ? cards : warm ? warmL : due.length ? due : met.length ? met : list);
  if (sel && !introduced(t)) cards = [t];
  // A look-alike duel slipped into the photo quiz (docs/LEARNING.md "Look-alike duels slipped into the photo quiz"): the
  // contrast queue's (CONTRAST, above) when no mix-up is queued. Not when the path opens a genus (a card) this question:
  // opening comes first; not in a comeback. Logged "quiz|d|k2" (counted apart).
  if (!cards.length && !warm && !rematch.length && gap && Math.random() < CONTRAST.P) {
    const key = p => p.slice().sort().join('|'),
      pair = duelPick(list, p => p.every(introReady) && key(p) !== twoPair);
    if (pair) {
      twoAt = at;
      twoPair = key(pair);
      const t = pick(pair),
        k = mimKeep(pair.mim, pair, t); // a pair of the mimicry class (duelPick): its species
      last = t; // the genus asked is the duel's, not the one drawn above for the card decision
      lastQs = [...lastQs.slice(0, -1), t];
      return Object.assign(
        [cur, t, shuffle(pair.slice()), `Look-alikes: ${uname(pair[0])} or ${uname(pair[1])}?`, photoSet(t, null, ease, 2, 'qduel', k)],
        {auto: twoPair, pr: pair.slice(), ...(sel ? {custom: 1} : {})}
      );
    }
  }
  // Find the X (FIND, planFind): like a duel, never with a card, in a comeback or with a mix-up queued, and spaced as
  // the contrast questions are (gap); on the unit the draw just chose.
  const findQ = !cards.length && !warm && !rematch.length && gap && planFind(cur, t, list, ease, sel);
  if (findQ) {
    twoAt = at;
    return findQ;
  }
  // No mastery exam question in the custom quiz (rule L9): its choices come from the selection,
  // which may hold none of the genus's look-alikes, so passing there would not prove it; the exam comes in the photo quiz.
  const R = warm ? recallAt(t) : 1,
    ex = !sel && !warm && examReady(t) && examSet(t),
    // A comeback question keeps the player's usual choices: look-alikes for a strong player, so a
    // right answer proves something and the rust melts in a few questions.
    traps = ex ? 3 : trapsFor(t, ease),
    // A genus met on a card of its own now is not among this question's choices either: its card says it comes up a
    // little later (else its name would be a choice on the question behind the card). The custom quiz: from its
    // selection first, topped up under 4 from the other genera unlocked only (customChoices; one progression path, rule
    // L4: never a locked genus, a ★ one included, as a choice).
    ch = shuffle([
      t,
      ...(sel
        ? customChoices(t, sel, unlocked(play), traps, known)
        : distractors(t, start ? list : list.filter(n => !cards.includes(n)), traps, known))
    ]),
    // Typed (model.js TYPED): with the genus's typed share, from its progress (never on a genus under TYPED.from: no
    // draw is spent there, so a beginner's questions are unchanged); an exam question as examTyped says. Never a
    // comeback question (the player's usual choices), an Again or a duel (2 choices by design).
    typed = !warm && (ex ? examTyped(t) : typedP(t) > 0 && Math.random() < typedP(t)),
    // The difficulty controller (model.js PICKD.P, aimOff): the photo aimed for the target in this format, its guess
    // rate from the choices really shown: from 2 traps every choice counts; in the custom quiz the look-alikes among
    // the choices decide (4 unrelated genera picked are no 4-choice question). A typed answer has none.
    few = sel ? ch.filter(n => n !== t && confusable(t, n)).length < 2 : traps < 2,
    kq = typed ? TYPED.k : few ? plausibleK(t, ch) : ch.length,
    // Aimed lower by the hold's ease and by this player's own mix-ups among the choices (model.js confTerm; none typed).
    cf = typed ? 0 : confTerm(t, ch, kq),
    // Its format (core.js fmtOf, as answer logs it): the aim takes the format's offset (model.js aimOff, pfmt).
    fq = typed ? 'typed' : ch.length === 2 ? 'again' : kq < 4 ? (kq >= 3 ? 'k3' : 'k2') : 'k4',
    set = ex || photoSet(t, cards.includes(t) ? (cover(GX(t)) || {}).f : null, Math.log(R) + ease - cf, kq, fq),
    // The mimicry class drilled (model.js mimUnit, mimTrap): a photo of the class makes the unit of the species it
    // resembles a trap, once met and in play, in the place of the weakest trap; only on a question that has a trap at
    // all (traps, the exam's included), never typed or on its unit's own card. It counts as plausible (k) there.
    mu0 = typed || !traps || cards.includes(t) ? null : mimUnit(t, (set.shown || [])[0]),
    mu = mu0 && known(mu0) && (sel || list.filter(n => !cards.includes(n))).includes(mu0) && !choiceNames(mu0, t) ? mu0 : null,
    chm = mimTrap(t, ch, mu),
    fewm = sel ? chm.filter(n => n !== t && (n === mu || confusable(t, n))).length < 2 : few,
    // The question asked with its genus's card never shows the card's own photo again.
    q = [
      cur,
      t,
      chm,
      typed ? `Which ${GX(t).one || SUBJ.one}? Type it` : `Which ${GX(t).one || SUBJ.one}?`,
      typed ? {...set, typed: 1} : set,
      fewm ? plausibleK(t, chm, mu) : 0
    ];
  if (cards.length) Object.assign(q, {intro: cards, start}, lvl ? {lvl: 1} : {});
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
    tipOpened('d'); // the page opened here: the look-alike duels tip is not for this player
    const bk = DUELBACK && DUELBACK.h === hashNow() && DUELBACK.cmp === from ? DUELBACK : null;
    DUELBACK = null;
    DUELRUN = bk ? bk.run : {up: 0, shown: 0};
    if (bk) ev('pulse', {r: 'back', src: 'tip:duelhold', m: 'quiz-duel', n: session.n});
  }
  // A duel shown and not answered comes back as it was (pendTake; the Duel tab's and each pair's drill their own).
  const kept = pendTake(a && b ? `quiz-duel|${a}|${b}` : 'quiz-duel'),
    q = kept ? kept.q : (!a && !b && takePlan('quiz-duel')) || planDuel(a, b);
  if (kept) pendSeen(q);
  // No look-alike pair unlocked yet (a new player): the duels come once the quiz has opened two look-alikes.
  if (!q) {
    $v.innerHTML = `<p class="note duelnone">Duels pit two look-alike ${SUBJ.many} against each other. They start once you have met two of them in the quiz.</p><p><a class="next" href="${esc(hr('quiz'))}">Play the quiz</a></p>`;
    return;
  }
  PENDSCI = q.sv || null;
  question(...q);
  pendShow(q[0], q, kept);
}
// A look-alike pair for a duel (the Duel tab, and the duels slipped into the photo quiz): among the pairs whose two
// genera are in the list and pass keep. Null when none.
function duelPick(list, keep = () => true) {
  // The subject's look-alike pairs (app.js UNITS pairs: for corals, Millepora and the bonus genera duel with the slate
  // look-alike the Coral Finder names) and the look-alikes from the data (model.js dataLooks), when both are in the list.
  // Never two units one label names (model.js choiceNames: two fish species may share a common name): such a duel would
  // read "Brown damsel or Brown damsel?", and either answer is right.
  // The pairs of the mimicry class too (model.js mimPairs: once their card was shown, mimSeen), each carrying its pair's
  // id (mim), so the duel shows the pair's species (mimKeep).
  const ps = [...UNITS[SUBJ.id].pairs(), ...dataLooks(list), ...mimPairs(list, m => mimSeen(m.pair.id))].filter(
    ([x, y]) => list.includes(x) && list.includes(y) && !choiceNames(x, y) && !choiceNames(y, x) && keep([x, y])
  );
  if (!ps.length) return null;
  // Your mix-ups you still make come up most (personal confusion score, confOf), then pairs players often confuse and
  // the classic look-alikes (compared in the IMR lecture or the Coral Finder text), the mimicry class's among them.
  const w = ps.map(
      p =>
        (weight(p[0]) + weight(p[1])) *
        (mixedUp(p[0], p[1]) && confusable(p[0], p[1]) ? 3 : confusable(p[0], p[1]) || isClassic(p[0], p[1]) || p.mim ? 2 : 1)
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
  // Only the genera the player has unlocked (model.js unlocked: one progression path for every game): the Duel tab opens
  // none. A pair from a link (#practice/duels/A/B, "Drill this pair") must name two unlocked genera with game photos, and
  // not two of one label (choiceNames, as duelPick); anything else gets a normal duel.
  // Null when no look-alike pair is unlocked yet.
  const list = unlocked();
  if (
    a &&
    b &&
    !(
      a !== b &&
      list.includes(a) &&
      list.includes(b) &&
      !choiceNames(a, b) &&
      !choiceNames(b, a) &&
      photoSet(a).shown.length &&
      photoSet(b).shown.length
    )
  )
    a = b = undefined;
  let pair = a && b ? [a, b] : null;
  if (!pair) pair = duelPick(list);
  if (!pair) return null;
  const t = pick(pair);
  // A genus not met yet gets its card with this duel (quizDuel): not with the card's own photo. Easier while the opening
  // hold is on (model.js holdEase), as every question of the photo quiz but an exam: the photo and the single views aim
  // lower (photoSet's shift; a duel has its two choices, no traps). The expectation logged is the photo's own (answer),
  // so it stays that of the photo shown.
  const set = photoSet(t, introduced(t) ? null : (cover(GX(t)) || {}).f, holdEase(), 2, 'duel', mimKeep(pair.mim, pair, t));
  return [a ? `quiz-duel|${a}|${b}` : 'quiz-duel', t, pair, `${uname(pair[0])} or ${uname(pair[1])}?`, set];
}
// The Duel tab's relief card (docs/ARCHITECTURE.md "The Duel tab's relief card"): the Duel tab keeps drilling one pair
// while the photo quiz eases, so the first time in a duel run (DUELRUN: from the page's opening, quizDuel fresh) an
// answer takes the opening hold's sum across INTRO.HOLD, the next break offers a step back; a prompt, once a run.
// up: an answer of this run took h across INTRO.HOLD from below; shown: the card came in this run.
let DUELRUN = {up: 0, shown: 0};
// Compare them keeps the way back to the same duel and run (learn.js viewCompare, duelBackFor), in memory only:
// DUELBACK {h: the duel's hash, cmp: the comparison's, run, d: the duel page's history depth}; another page drops it.
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
// The card: Mix in other genera (the photo quiz), Compare them (with DUELBACK; only for a subject with the Compare page,
// SUBJECTS pages 'cmp'), Keep drilling (also Escape); anti-reflex as the tips. Logged as the tips (ev 'pulse', src
// "tip:duelhold": shown, mix / cmp / keep / none, back): 3 at most.
function reliefShow(cur, pair) {
  DUELRUN = {...DUELRUN, shown: 1};
  const at = {m: cur.split('|')[0], n: session.n},
    log = r => ev('pulse', {r, src: 'tip:duelhold', ...at}),
    cmp = SUBJ.pages.includes('cmp');
  log('shown');
  const d = cardShow({
    kind: 'tip',
    cls: 'reliefcard',
    kick: 'Tough pair today',
    title: 'Take a step back?',
    body: `<p>These two are hard right now. Mixing in other ${SUBJ.many} for a while${cmp ? ', or seeing these two side by side,' : ''} often helps more than more of the same.</p>`,
    primary: {text: `Mix in other ${SUBJ.many}`, attr: 'disabled'},
    secondary: cmp ? {text: 'Compare them', attr: 'disabled'} : null,
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
// Custom quiz (docs/ARCHITECTURE.md "Custom quiz"): #practice/custom the selection screen, CUSTOM_H the quiz, the photo
// quiz on the genera picked but the mastery exam (model.js CUSTOM, customDraw). The selection ({g, t}) syncs, the latest
// winning (sync.js mergeSaved); its answers count as photo-quiz ones, logged quiz|s….
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
// The custom quiz's reminder (docs/ARCHITECTURE.md "The custom quiz's reminder of the units waiting in the Quiz"): it
// opens no unit (rule L4), so after LEFTN.AT custom answers since the last photo-quiz one (leftStep), units still able to
// open (leftCount) and the hold off, a card at the break says how many wait in the Quiz. Once ever per subject on the
// account (reefid-<dev>custom-left {n, shown}, TOLD 'left:<subject>').
const LEFTN = {KEY: 'custom-left', AT: 100};
const leftTok = () => 'left:' + SUBJ.id;
const leftSt = () => (o => (o && typeof o === 'object' && !Array.isArray(o) ? o : {}))(store.get(sDev(LEFTN.KEY), null));
const leftStep = (st, cur) => (cur === CUSTOM_H ? {...st, n: (Number(st.n) || 0) + 1} : cur === 'quiz' ? {...st, n: 0} : st);
// hold: the opening hold is on (model.js introHold): the Quiz opens nothing new for a while, so the card waits for it to
// end (docs/decisions/2026-11-18-decisions-from-app-comments.md); still once ever.
const leftDue = (st, left, told, hold) => !st.shown && !told && !hold && (Number(st.n) || 0) >= LEFTN.AT && left > 0;
const leftCount = () => pool().filter(n => !introduced(n) && mayOpen(n)).length;
// Told on another device of the account, or perhaps: signed in, before the visit's first sync has merged the account's
// notices (sync.js noticesReady), it waits, as the other one-time notices do (noticeLater).
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
// The card: Go to the Quiz or Keep drilling (also Escape), marked when shown, anti-reflex as the tips; logged as the tips
// (src "tip:customleft": shown, then quiz / keep / none).
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
  tipOpened('c'); // opened here: the Custom quiz tip is not for this player
  if (h === CUSTOM_H) return customSel() ? quizPhoto(CUSTOM_H) : location.replace(hr('quiz-custom'));
  viewCustom();
}
// The selection screen (docs/ARCHITECTURE.md "Custom quiz"): every genus as a small photo to pick, in three views
// (CQ.VIEWS, kept in CQ.VIEW): IMR groups (★ genera with their look-alikes), My mix-ups (mixClusters; lookEdges before
// any) and Progress (shownLevel). Never by growth form (rule C4) nor A-Z (the search finds a name). Quick picks replace
// the selection (cqPicks: My weakest, Recently missed; cqLooks); Start needs CUSTOM.MIN genera.
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
  const names = L => L.map(uname).join(' · ');
  if (view === 'mix') {
    const own = mixClusters(mixEdges(play)),
      C = own.length ? own : mixClusters(lookEdges(play)),
      ord = L => play.filter(n => L.includes(n));
    return {
      note: own.length
        ? ''
        : `No mix-ups of yours yet: here are the look-alikes of ${UNITS[SUBJ.id].cq.src}, those players confuse most first. Your own mix-ups take their place as you play.`,
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
  // The first view: the subject's own groups (UNITS cq).
  return {note: '', G: UNITS[SUBJ.id].cq.groups(play)};
}
// The marker of a group (the group's number or sign in a coloured disc), shared by the subjects' groups below.
const cqMark = (m, h) => `<span class="gn" style="--g:${h}" aria-hidden="true">${esc(String(m))}</span>`;
// The corals' groups: the IMR lecture's, the benthic slate and the bonus genera after them.
function cqByIMR(play) {
  const gk = n => (isBonus(n) ? '+' : isBenthic(n) ? 'F' : shownGroup(n) || '★'),
    ord = k => (typeof k === 'number' ? k : {'★': 100, F: 101, '+': 102}[k]);
  return [...new Set(play.map(gk))]
    .sort((a, b) => ord(a) - ord(b))
    .map(k => {
      const gr = UNITS[SUBJ.id].group(k),
        L = play.filter(n => gk(n) === k);
      return gr
        ? {k, t: esc(gr.t), sub: 'IMR lecture group ' + gr.n, mark: cqMark(gr.n, groupHue(gr.n)), L}
        : k === 'F'
          ? {k, t: 'Fire coral', sub: 'IMR benthic slate, not a hard coral', mark: cqMark('F', 200), L}
          : k === '+'
            ? {k, t: 'Bonus genera', sub: 'Not on the IMR list', mark: cqMark('+', 200), L}
            : {k, t: 'Not covered in the lecture', sub: '', mark: cqMark('★', 200), L};
    });
}
// The fish's groups: the identification groups of the regional key (TREEU.groups), in its order, as the Families page
// shows them (learn.js viewList); a unit under a family (a species, a scientific genus) is in its family's group.
function cqByKey(play) {
  const gOf = n => {
      for (let u = GX(n), i = 0; u && i < 4; u = GX(u.parent), i++) if (u.group) return u.group;
      return 0;
    },
    gr = (TREEU && TREEU.key && TREEU.groups) || [],
    G = [...gr.map(x => ({k: x.n, t: esc(x.title), sub: '', mark: cqMark(x.n, groupHue(x.n)), L: play.filter(n => gOf(n) === x.n)}))];
  G.push({
    k: '?',
    t: gr.length ? 'Not in a group yet' : 'All',
    sub: '',
    mark: gr.length ? cqMark('?', 200) : '',
    L: play.filter(n => !gr.some(x => x.n === gOf(n)))
  });
  return G.filter(g => g.L.length);
}
// The sea slugs': the units under their parent of the rank UNITS listBy names (the families), in the tree's order, as the
// Genera page does (app.js unitsByParent), the units with no family last. No English name here: the picker shows the
// scientific names, as the quiz does before an answer.
function cqByFamily(play) {
  return unitsByParent(play, UNITS[SUBJ.id].listBy).map(([p, L]) => ({k: p || '?', t: p ? uname(p) : 'Other', sub: '', mark: '', L}));
}
function viewCustom() {
  // The genera unlocked only (model.js unlocked: one progression path): picking opens none.
  const play = unlocked(),
    on = new Set(customSaved().filter(n => play.includes(n))),
    qp = cqPicks(play),
    lk = play.filter(n => cqLooks(n, play).length > 1);
  try {
    localStorage.removeItem(CQ.OLD); // the older A-Z / IMR groups choice: IMR groups once
  } catch (e) {}
  let view = store.get(CQ.VIEW, 'imr'),
    q = '';
  if (!CQ.VIEWS.includes(view)) view = 'imr';
  const tile = n => {
    const p = cover(GX(n));
    // data-s: what the search reads, lower case: the unit's name, its id and its English names (UNITS vern).
    const s = [unameT(n), n, ...vernOf(n).map(x => x.n)].join(' ').toLowerCase();
    return `<button type="button" class="cqtile" data-g="${esc(n)}" data-s="${esc(s)}" aria-pressed="${on.has(n)}">${p ? `<img ${thumb(p, '(max-width:599.98px) 90px, 120px')} alt="" loading="lazy">` : '<span class="cqnoph"></span>'}<span class="cqnm">${uname(n)}</span>${isBonus(n) ? '<small>Bonus</small>' : ''}</button>`;
  };
  const U = UNITS[SUBJ.id].cq;
  $v.innerHTML = `<h2>Custom quiz</h2>
  <p class="lede">The Quiz on the ${SUBJ.many} you pick. Tap the photos of the ${SUBJ.many} you want to work on, then <b>Start</b>. Three ways to see them: <b>${esc(U.by)}</b>, ${U.about}; <b>My mix-ups</b>, the ${SUBJ.many} you confuse with each other, the most confused first (before you have any, the look-alikes of ${U.src}); <b>Progress</b>, to review, learning, not seen yet, learned. <b>All</b> picks a whole group. <b>Quick picks</b> choose for you: your weakest ${SUBJ.many}, those you missed lately, or a ${SUBJ.one} and its look-alikes. Only the ${SUBJ.many} picked are asked, and the wrong choices come from them too, so look-alikes picked together are drilled together; with fewer than 4 picked, other ${SUBJ.many} make up the choices. Everything else is the photo quiz: typed questions, Again after a mix-up, look-alike duels, harder photos as you improve, and every answer counts in <a href="${esc(hr('progress'))}">My progress</a>. A ${SUBJ.one} you have not met yet shows its card first. Mastery exams only come in the Quiz: a ${SUBJ.one} that reaches ${Math.round(100 * DOM.EX)}% here takes its exam there. The achievements for runs of right answers (On a roll, Unstoppable) and Sharp eye are earned in the Quiz only: an answer here neither extends nor breaks your run. Your choice is kept for next time; the Custom quiz tab brings you back here.</p>
  <div class="tools cqtools"><input type="search" id="cqq" placeholder="Search a ${SUBJ.one}" aria-label="Search a ${SUBJ.one}" autocomplete="off"><div class="seg" role="group" aria-label="View">${[
    ['imr', U.by],
    ['mix', 'My mix-ups'],
    ['prog', 'Progress']
  ]
    .map(([k, t]) => `<button type="button" data-cv="${k}" aria-pressed="${view === k}">${t}</button>`)
    .join('')}</div></div>
  <div class="cqquick"><span class="label">Quick picks</span><button type="button" class="chip" data-qp="weak"${qp.weak.length < CUSTOM.MIN ? ' disabled title="Answer a few questions first"' : ''}>My weakest</button><button type="button" class="chip" data-qp="miss"${qp.miss.length < CUSTOM.MIN ? ' disabled title="Nothing missed lately"' : ''}>Recently missed</button><select class="chip" id="cqlk" aria-label="Look-alikes of a ${SUBJ.one}"><option value="">Look-alikes of…</option>${lk.map(n => `<option value="${esc(n)}">${esc(unameT(n))}</option>`).join('')}</select></div>
  <div class="cq"></div>
  <div class="cqbar"><span class="cqn" aria-live="polite"></span><button type="button" class="linkish" data-clear>Clear all</button><button type="button" class="next" data-start>Start</button></div>`;
  const box = $v.querySelector('.cq'),
    n = $v.querySelector('.cqn'),
    st = $v.querySelector('[data-start]'),
    cl = $v.querySelector('[data-clear]');
  const show = () => {
    box.querySelectorAll('.cqtile').forEach(b => {
      b.setAttribute('aria-pressed', String(on.has(b.dataset.g)));
      b.hidden = !!q && !b.dataset.s.includes(q);
    });
    box.querySelectorAll('.cqg').forEach(g => {
      const T = [...g.querySelectorAll('.cqtile:not([hidden])')];
      g.hidden = !T.length;
      const all = g.querySelector('.cqall');
      if (all) all.textContent = T.length && T.every(b => on.has(b.dataset.g)) ? 'None' : 'All';
    });
    const k = on.size;
    // The genera picked, named under the count: a quick pick or a long list shows what is in without scrolling.
    n.innerHTML = `<b>${k >= CUSTOM.MIN ? `${k} ${SUBJ.many}` : k ? `Pick one more ${SUBJ.one}` : `Pick at least ${CUSTOM.MIN} ${SUBJ.many}`}</b>${
      k
        ? `<small>${play
            .filter(x => on.has(x))
            .map(uname)
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
    if (view === 'mix') tipOpened('m'); // the My mix-ups view is on screen: its "Did you know?" tip is not for this player
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
