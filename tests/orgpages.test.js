require('./slot.js').testGuard();
// The players' pages write the course's words from core.js ORG (rule W21; docs/decisions/2026-11-25-org-course-words.md), and the
// IMR edition reads as it did when they were typed. SENTENCES: for each page file, pieces of its text as the IMR edition
// showed them (each around a word that is now an ORG field). The file is read with ORG put back (its `${ORG.x}` and
// `ORG.x` written as the IMR edition's value, the quotes of a joined string dropped) and every piece must be in it.
// A fork's edition writes its own words: its ORG values replace these, and the same lines read them (the fields below
// must exist, or a line would print "undefined").
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  {ORG} = require('../core.js');

const norm = s =>
  s
    .replace(/\$\{(?:C\.)?ORG\.(\w+)\}/g, (m, k) => ORG[k])
    .replace(/(?:C\.)?ORG\.(\w+)/g, (m, k) => `'${ORG[k]}'`)
    .replace(/(['"`]) \+ /g, '')
    .replace(/ \+ (['"`])/g, '')
    .replace(/[`'"]/g, '')
    .replace(/\s+/g, ' ');
const SENTENCES = {
  'app.js': [
    'lank rel=noopener title=IMR Lecture 6${p.slide ? , sli',
    'redits it><span class=pa>IMR lecture · </span>${esc(auth',
    '<span class=psrc title=IMR Lecture 6${p.slide ? , sli',
    'ide esc(p.slide) : }>IMR lecture</span>',
    'IMR Lecture 6, slide ${esc(p.sl',
    'return p.imr ? · IMR lecture(p.pg && n ? ·',
    '? ID tips (IMR, (G.imr || g) + sl)',
    'ts species here(sl ? (IMR, G.imr + sl) : )',
    '? <span class=ig title=IMR confusion group ${ig.n}: ${',
    '? <b class=ikxtag>Not on IMR list</b> · : g.n ? No.',
    'y, families)} beyond the IMR course. They come once you',
    '${o.c3} families beyond the IMR course wait for you: open t',
    ': The family beyond the IMR course waits for you: open',
    'by: IMR groups,',
    'about: the IMR lecture’s groups (the gener',
    'src: the IMR lecture and the Coral Finde',
    'k: The coral genera of the IMR slate, as on ReefCloud phot',
    'slateName: IMR slate,',
    'src: the IMR lecture or the Coral Finder',
    'ltName(g.fam))}${g.ig ? · IMR group g.ig : },',
    'chip: Colour by IMR group,',
    'body: Not on the IMR coral list, but common at D',
    'your progress, not in your IMR slate score.,',
    'card: Not on the IMR list, but common at Dauin.',
    'lp you name the fish on the IMR survey videos, or in your o',
    'key to name the fish on the IMR survey videos and in your o',
    'ef fish families, as on the IMR survey videos.,',
    'e cues, the look-alikes and IMR’s names come from the IMR f',
    'd IMR’s names come from the IMR fish presentation.,',
    'kick: Beyond the IMR course,',
    'e fish families, beyond the IMR course?,',
    '> Open the families beyond IMR (${n} ${n > 1 ? families',
    'src: the IMR fish presentation,',
    'cmp: {...treeCmp, src: the IMR fish presentation},',
    'families met (those of the IMR course, then every family i',
    'ivemaster, Instructor), the IMR course’s families and those',
    'rt with the families of the IMR survey; more families open',
    'elLede(the look-alikes the IMR fish presentation names)',
    's of the reef fish ID book, IMR’s name shown beside its own',
    'rt; else the familys first IMR cue, or its first ID mark f',
    '<b>More</b> opens the other IMR cues and the rest; <b>Next<',
    's accept the family’s name, IMR’s name, its scientific name',
    'ientific name and the names IMR uses inside it (Chromis, Ba',
    'imr: The genera of the IMR course stay in the game.,',
    'ed on it${imrNow() ? , the IMR course’s from Open Water :',
    'part: () => The IMR course’s genera only, from',
    'a hard coral and not on the IMR coral list, but its on the',
    'coral list, but its on the IMR benthic slate and very comm',
    '.join(, )})) : ID tips (IMR));',
    '/i><small>${isBenthic(n) ? IMR benthic slate : g.x ? Not',
    'thic slate : g.x ? Not on IMR list : g.n ? No. g.n'
  ],
  'autosort.js': [
    'string ? x : x === true ? IMR : x.name || IMR),',
    '= true ? IMR : x.name || IMR),',
    'd, w, (u.lsrc || {})[b] || IMR course]);'
  ],
  'gloss.js': ['In the middle of the polyp. IMR asks: is it raised or embed'],
  'home.js': [
    'l>${named ? W.learn || The IMR fish families by identifica',
    'ntification group, with the IMR cues : One sheet per genu',
    'wide> at 3 scales</span>, IMR ID tips, look-alikes}</sma',
    'lecture photos come from <b>IMR Lecture 6</b>, the IMR cora',
    'm <b>IMR Lecture 6</b>, the IMR coral identification lectur',
    '<p>The coral photos from IMR Lecture 6 serve IMR’s inter',
    'os from IMR Lecture 6 serve IMR’s internal training. Many w',
    'ing. Many were not taken by IMR: most of those come from <a'
  ],
  'idtips.js': [
    ')}</ul><p class=tref>IMR Lecture 6${g.sl && g.sl.len',
    'class=qtiles aria-label=IMR Lecture 6: questions to ask',
    'p class=note>Wording from IMR Lecture 6 where the lecture'
  ],
  'learn.js': [
    'gjump><span class=label>IMR group</span>${DATA.imrg.map',
    'turn <h2>The genera on the IMR slate</h2>',
    'e confusion groups from the IMR lecture: genera in the same',
    'at Dauin <small>not on the IMR list</small></summary><div',
    'ion groups : }, with the IMR cues (for a family IMR give',
    'the IMR cues (for a family IMR gives none for, its ID mark',
    'es, named on its sheet) and IMR’s names. Tap a family to op',
    'b.length ? <p class=note>IMR names inside it: ${g.sub.ma',
    '= ${esc(name)}, ${p.imr ? IMR lecture photo : label.toLo',
    '>${p.imr ? <b class=lect>IMR lecture</b> · slide ${p.sli',
    'The highlighted <b>ID tips (IMR)</b> are what to remember;',
    're what to remember; the <b>IMR lecture notes</b> give the',
    'e full lecture cues. Its <b>IMR group</b> is the lectures',
    'class=warn><b>Not on the IMR list.</b> A rarer genus see',
    'warn><b>★ Not surveyed by IMR.</b> It is on the slate so',
    '? <h3>${g.tl || ID tips (IMR)}${(DATA.imrg || [])[g.ig',
    '? <div class=lnotes><h3>IMR lecture notes</h3>${notesLi',
    'check><b>To check with an IMR trainer:</b> ${esc(g.check)',
    'rences:</b> ${imr.length ? IMR Lecture 6 · : }Coral Fi',
    '>${c.imr ? <b class=lect>IMR lecture</b>${c.slide ? sl',
    's(b)) ? <h3 class=cmplab>IMR lecture</h3>${cmpShots([a,',
    '.imr && f.imr !== f.name ? IMR: ${f.imr} : f.imrWith ? I',
    'R: ${f.imr} : f.imrWith ? IMR course: with the ${f.imrWit',
    'esc(n) + (i === s.cni ? (IMR) : );',
    'small><b class=star>★</b> IMR most sighted #${s.cs}</smal',
    'y species here${g.imr ? · IMR entry: ${esc(g.imr)} : }',
    'me</span>${g.imr ? <small>IMR entry: ${esc(g.imr)}</small',
    ', t, ((f.lsrc || {})[o] || IMR fish presentation) + esrcT',
    'in()}</ul><p class=note>IMR fish presentation${f.sl ?',
    'ames below. The <b>ID tips (IMR)</b> are the IMR fish prese',
    'b>ID tips (IMR)</b> are the IMR fish presentations. <b>Gen',
    'ngth ? cuesBox(f, ID tips (IMR), esc(slideLine(f.sl))) :',
    'With ? <p class=note>The IMR fish presentation shows it',
    'References:</b> ${f.cues ? IMR fish presentation(f.sl',
    'ength} species${x.imr ? · IMR entry: esc(x.imr) : }',
    '}</span><small class=lsrc>IMR fish presentation${x.sl ?',
    'er genera of the family the IMR fish presentation tells apa',
    'me)}</a>${g.imr ? <span>· IMR entry: ${esc(g.imr)}</span>',
    's scientific name as on the IMR reference list, its common',
    'chip><b class=star>★</b> IMR most sighted #${s.cs}</span',
    '<span class=chip>On the IMR reference list</span> :',
    '>References:</b> ${s.pdf ? IMR / EventMeasure reference li'
  ],
  'progress.js': [
    ': Bonus genus, not on the IMR list. ) : isBenthic(n) ?',
    'ic(n) ? Fire coral, on the IMR benthic slate. : }${tip',
    'le=Bonus genus, not on the IMR list. ${tip(n)}><b>+</b><i',
    'e=Bonus genera, not on the IMR list>${bx}</div> : }</d',
    '? [F, IMR benthic slate, not a hard c',
    'e=Bonus genera, not on the IMR list>+</span><span class=',
    'ass=pgt>Bonus: not on the IMR list</span>',
    'a hard coral and not on the IMR coral list, but it is on th',
    'oral list, but it is on the IMR benthic slate and very comm',
    'corals that are not on the IMR list but are common at Daui',
    'have added them or not. <b>IMR slate</b>, under your name,',
    'name, is the same over the IMR slates genera alone.</p>',
    '</i> (fire coral) is on the IMR benthic slate and very comm'
  ],
  'quiz.js': [
    '(look-alikes listed by the IMR lecture or the Coral Finder',
    'tip); <b>More</b> opens the IMR ID tips and why the other $',
    'genera</b>: corals off the IMR list that are common at Dau',
    'ic(target) ? (fire coral, IMR benthic slate) : g.x ? (',
    'g.x ? (bonus, not on the IMR list) : g.n ? : (★ no',
    'sub.length ? <p class=vs>IMR names inside it: ${g.sub.ma',
    'it) return {t: hit[1], s: [IMR, ((g.lksrc || {})[b] || {}',
    '.filter(x => x && x !== IMR)',
    'sc((g.psrc && g.psrc.t) || IMR)}</b>: ${lines.map(esc).jo',
    '? {k, t: esc(gr.t), sub: IMR lecture group gr.n, mar',
    '{k, t: Fire coral, sub: IMR benthic slate, not a hard c',
    's genera, sub: Not on the IMR list, mark: cqMark(+, 20'
  ],
  'sync.js': [
    'it></span><span>Saving for IMR as <b>${esc(SYNC.name)}</b>',
    'dot></span><span>Saved for IMR as <b>${esc(SYNC.name)}</b>',
    'progress</h3><p>Training at IMR? Sign in with your name and'
  ],
  'tour.js': ['} to see every genus of the IMR slate: the coral genera IMR', 'IMR slate: the coral genera IMR records on its reef surveys']
};
const src = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('the players pages write their IMR-edition sentences from ORG: each piece of text is still there', () => {
  for (const [f, L] of Object.entries(SENTENCES)) {
    const text = norm(src(f)),
      lost = L.filter(s => !text.includes(s));
    assert.deepStrictEqual(lost, [], `${f}: text lost or changed`);
  }
});

test('every ORG field the pages read exists (a typo would print undefined)', () => {
  const files = fs.readdirSync(path.join(__dirname, '..')).filter(f => f.endsWith('.js') && f !== 'core.js');
  const used = new Set();
  for (const f of files) for (const m of src(f).matchAll(/(?<![\w$.])(?:C\.)?ORG\.(\w+)/g)) used.add(m[1]);
  assert.ok(used.size >= 10, `fields read: ${[...used]}`);
  assert.deepStrictEqual(
    [...used].filter(k => typeof ORG[k] !== 'string'),
    []
  );
});
