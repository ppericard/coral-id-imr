// The IMR ID tips and the content editor's sources, moved out of app.js (REE-64, one piece at a time; behaviour
// unchanged). A classic script of tier 1, loaded right after gloss.js (index.html), so its names are globals like
// app.js's own. At load it only declares its helpers (consts and arrow functions); they read app.js (esc, hr, GX, …),
// gloss.js (gloss, glossAll, termDef) and learn.js (lookOf) only when a page is drawn, after the tiers are in.
/* ---------- IMR ID tips ---------- */
// Two levels. ID tips (g.qt, tools/id_tips.txt): 2-3 short cues per genus condensed from the lecture, shown
// everywhere a tip appears (quiz, cards, ID tips page, comparisons, genus sheet). Lecture notes (g.imr): the
// lecturers' full cues (slide text, review slides, presenter's notes), only on the genus sheet.
const slideRef = (k, L) => (L && L.length ? `${k} ${L.join(', ')}` : k);
// Content only: the "Review slide: " / "Instructor's notes: " prefixes in data.json are not shown.
const noteText = x => x.replace(/^(Review slide|Instructor's notes): /, '');
// Full lecture notes for the genus sheet.
const notesList = (g, cls = '') =>
  g.imr.length
    ? `<ul class="crit idtips${cls ? ' ' + cls : ''}">${glossAll(g.imr.map(noteText))
        .map(x => `<li>${x}</li>`)
        .join(
          ''
        )}</ul><p class="tref">${ORG.lectureRef}${g.sl && g.sl.length ? ', ' + slideRef(g.sl.length > 1 ? 'slides' : 'slide', g.sl) : ''}</p>`
    : `<p class="note">Not on the lecture slides: see the Coral ID Key criteria below.</p>`;
// A source the content editor gave with an edit ({t, u}: core.js contentApply esrc; rule C2), as HTML: its words,
// a link when it has an address. esrcTag: the source of his edit of slot k of record g, a few words after its text ('' when
// he gave none).
const esrcHtml = s => (s.u ? `<a href="${esc(safeUrl(s.u))}" target="_blank" rel="noopener">${esc(s.t)}</a>` : esc(s.t));
const esrcTag = (g, k) => {
  const s = ((g && g.esrc) || {})[k];
  return s && s.t ? ` <small class="esrc">(${esrcHtml(s)})</small>` : '';
};
// What a genus's Coral ID Key criteria are cited by, wherever they are shown (the genus sheet, the quiz's answer, the
// Coral ID Key): the source the content editor gave with his edit of them, else the Coral Finder pages of the book's own
// text (rule C2). link false: its words only (inside a summary).
const critRef = (g, link = true) => {
  const s = ((g && g.esrc) || {}).crit;
  return s && s.t ? (link ? esrcHtml(s) : esc(s.t)) : `Coral Finder p. ${((g && g.pages) || []).join(', ')}`;
};
// Short ID tips; genera the lecture skips fall back to the Coral Finder summary. Tips the content editor reworded with a
// source (qsrc: core.js treeGen, app.js treeGenera and build; rule C2) show it under them, wherever they are
// shown; a summary he reworded with one, after it. bare: the cues alone, their sources left to the sheet (a Learn list
// card, listCard).
const tipsList = (g, cls = '', bare = false) =>
  g.qt
    ? `<ul class="crit idtips${cls ? ' ' + cls : ''}">${glossAll(g.qt)
        .map(x => `<li>${x}</li>`)
        .join('')}</ul>${!bare && g.qsrc && g.qsrc.t ? `<p class="note esrc">Source: ${esrcHtml(g.qsrc)}</p>` : ''}`
    : `<p class="keyid">${gloss(g.sum)}${bare ? '' : esrcTag(g, 'sum')}</p>`;
// A unit's card on a Learn list, for every subject (the corals' ID tips view, learn.js viewList; rule S1): its photo,
// its name and the line under it, its ID cues (bare: no heading, no source; those are on the sheet, rule C2), then the
// subject's notes. The whole card opens the unit's sheet (Pierre, 2026-11-20): one link, its name, stretched over the
// card (.lcard .tipsheet::after), the card a tappable surface with a chevron; the photo opens the sheet, not the photo
// viewer (its credits are on the sheet's photos, rule P5). Links inside the notes (the corals' Compare pairs) and the
// glossary terms sit above it.
const listCard = (n, p, sub, notes = '') => {
  const g = GX(n);
  return `<article class="tipg lcard"><span class="tipph">${p ? `<img ${thumb(p, '130px')} alt="" loading="lazy">` : ''}<a class="tipsheet" href="${esc(hr('g-' + n))}"><b>${uname(n)}</b>${sub}</a></span><div>${tipsList(g, '', true)}${notes}</div><span class="fgo" aria-hidden="true">›</span></article>`;
};
const tipsText = g => (g.qt ? g.qt.join(' · ') : g.sum);
// A name as IMR writes it, then its other spelling when a reference writes it differently (data.json `spell`: name →
// [spelling, source]; docs/decisions/2026-11-18-decisions-from-app-comments.md). Plain text: escape it where it is shown.
const altName = s => {
  const a = ((DATA && DATA.spell) || {})[s];
  return a ? `${s}, also spelled ${a[0]} (${a[1]})` : String(s);
};
// The ID tips view of the Genera page: the 4 lecture questions and the glossary on top, then 2-3 short cues per genus.
const tipsHead =
  () => `<div class="tiphead"><ol class="qtiles" aria-label="${ORG.lectureRef}: questions to ask">${DATA.tips.map(t => `<li>${esc(t)}</li>`).join('')}</ol>
  <details class="gloss"><summary>Coral anatomy terms</summary><a class="glink" href="${esc(hr('lab-anatomy'))}"><span class="hpv art">${window.homeArt ? homeArt('anatomy') : ''}</span><span><b>Corallite anatomy</b><small>Explore the parts of a corallite on a diagram ›</small></span></a><dl>${DATA.terms.map(t => `<dt>${esc(t[0])}</dt><dd>${termDef(t)}</dd>`).join('')}</dl><p class="note">Wording from ${ORG.lectureRef} where the lecture defines the term; otherwise the <a href="https://www.coralsoftheworld.org/page/glossary/" target="_blank" rel="noopener">Corals of the World glossary</a>.</p></details></div>`;
// The corals' card there: its look-alikes, each a link to their Compare page.
const tipCard = n =>
  listCard(
    n,
    cover(DATA.gen[n]),
    '',
    lookOf(n).length
      ? `<p class="note">Don't confuse with ${lookOf(n)
          .map(b => `<a href="${esc(hr('cmp-' + n + '|' + b))}"><i>${esc(b)}</i></a>`)
          .join(', ')}</p>`
      : ''
  );
