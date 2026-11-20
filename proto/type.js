// Type the genus: a photo, and the player types the genus instead of picking 1 of 4 (recall, not recognition: what an
// RA does in front of a colony). Prototype of the typed questions the quiz slips in more and more as a player's level
// on a unit rises (model.js TYPED; docs/ROADMAP.md "Free-text answers"). It runs on the subject on screen (rule S1; Q437,
// Pierre, 2026-11-19), in its own unit word (SUBJ.one: genus, family): the units are those the player has unlocked
// (model.js unlocked, rule L4), the photo the draw's own as for a typed question (lab.js labShots, model.js photoSet),
// the names and the reading the quiz's own. Untimed, nothing scored, logged or saved (rule U13: it graduates only with
// Pierre's OK); the tally on screen is kept nowhere.
// The agreed rules: light spelling tolerance (1 letter on a short name, 2 on a long one), old names accepted ("formerly
// X" in the unit's own lines), no suggestions while typing (that would turn it back into a pick from a list), the phone's
// autocorrect and capitals off, an "I don't know" button (a miss), the right spelling shown after the answer. A word
// that is no unit of the game, even with the tolerance, is not counted: the player is asked to check the spelling.
// A close typo of the unit asked is retyped once before the result (the quiz's spelling step, quiz.js typeBind).
// The matching (core.js TYPE, typeNorm, typeDist, typeNamesOf, typeMatchIn) and the form with its messages (quiz.js
// typeForm, typeBind, typeRead, typeStep, typeUnit) are the quiz's own: one code for both, called as the quiz calls them
// (quiz.js question: the rank asked, the unit's own word, the photo's species).

LAB.add({
  id: 'type',
  icon: '⌨',
  // Said with the subject's own words (SUBJ.one, SUBJ.what), at the time the page is drawn.
  get title() {
    return `Type the ${SUBJ.one}`;
  },
  get blurb() {
    return `Name the ${SUBJ.what.toLowerCase()} by typing its ${SUBJ.one}, with no choices to pick from: proves you recognise it, not just tell 4 apart.`;
  },
  get lede() {
    return `Type the ${SUBJ.one} and press Enter. Old names are accepted; a small typo still counts, retyped once to learn the spelling; no suggestions while you type.`;
  },
  render(root) {
    const score = {ok: 0, n: 0, streak: 0},
      scoreLine = () => `${score.ok}/${score.n} right · streak ${score.streak}`;
    let view = 'any';
    // The photo source of the Lab's photo games (lab.js labShots), aimed as a typed question's.
    const {photo, seen} = labShots(8, Infinity, 'typed');
    root.innerHTML = '<div id="tybody"></div>';
    const body = root.querySelector('#tybody');
    const round = () => {
      // Only the units unlocked on the quiz path (rule L4), each with a photo the games may teach from (photoSet: the
      // photos the games may use), in the view asked for, else in any view.
      const met = unlocked(),
        d = met.length ? labDraw(met, photo, view) : null;
      if (!d) return labEmpty(body, met.length > 0);
      const {t, p} = d;
      seen([p]);
      const g = GX(t),
        one = g.one || SUBJ.one, // the unit's own word where it has one (a sea slug genus among families)
        // the photo's own species: a name of part of the unit counts only when it designates them (quiz.js question)
        tx = photoTaxon([p], t),
        typeSp = tx && tx.rank === 'species' ? [tx.id] : [];
      body.innerHTML = `<div class="rvlayout tylayout"><div class="rvstage tystage"><img src="${img(p, fit(Math.min(innerWidth, 800)))}" alt="${esc(SUBJ.what)} to identify"></div>
        <div class="gside">
          ${typeForm({...SUBJ, one})}
          <div id="tyres"></div>
          <p class="note tyscore">${scoreLine()}</p>${labViewChips(view)}</div></div>`;
      // m: the unit read ({g, old, exact}), null for "I don't know"; text: what was typed.
      const finish = (m, text, sp) => {
        const u = typeUnit(m, t, typeSp), // t when the name fits it (a shared or part's name included), else the unit named
          ok = u === t;
        score.n++;
        score.ok += ok ? 1 : 0;
        score.streak = ok ? score.streak + 1 : 0;
        body.querySelector('.tyscore').textContent = scoreLine(); // the answer just counted
        body.querySelector('.tylayout').classList.add('tydone'); // phones: a shorter photo, so the verdict and Next stay on the screen (rule U2)
        // The photo's source pill, only now: before the answer it would give the unit away (as Blur reveal). Hidden on
        // phones, as in every game (app.css .psrc, rule P5): the enlarged view carries the source there.
        const im = body.querySelector('.tystage img');
        if (im && typeof photoSrc === 'function') im.insertAdjacentHTML('afterend', photoSrc(p));
        // How it was read (a typo or an old name, quiz.js typeRead), on a miss too: "you wrote Acorpora, read as Acropora".
        // The spelling step (quiz.js typeStep) in the same one line as the quiz: "Right, but not quite: it's spelled …".
        const read = typeRead(m, text, sp, t, typeSp),
          step = ok && typeStep(m, text, sp, t),
          st = step && step.spelled ? step : null,
          how = m == null ? `It was ${uname(t)}.` : ok ? `${uname(t)}.` : `It was ${uname(t)}${u ? `, not ${uname(u)}` : ''}.`,
          verdict = !st
            ? `<b>${ok ? 'Right' : m == null ? 'No worries' : 'Missed'}</b>: ${how}${read ? ` ${read}` : ''}`
            : `<b>Right</b>, but not quite: it's spelled ${st.spelled}${st.old ? `, ${st.alt ? 'read as' : 'the old name of'} ${uname(t)}` : ''}.`;
        body.querySelector('#tyres').innerHTML =
          `<p class="${ok ? 'ok' : m == null ? 'idk' : 'ko'}">${verdict} <a href="${esc(genLink(t))}">${esc(one[0].toUpperCase() + one.slice(1))} sheet</a></p>
          ${fbLine(t, u, ok, [])}<p class="credit">${credit(p)}</p>${typeof repBtn === 'function' ? repBtn({g: t, a: u || '', ph: [p.f], m: 'type'}) : ''}<button type="button" class="next" id="tynext">Next</button>`;
        const nx = body.querySelector('#tynext');
        nx.onclick = round;
        nx.focus({preventScroll: true});
        // Phones: the result lands low (the keyboard was open, the tab bar below): bring it and Next into view.
        if (isStacked()) {
          const over = body.querySelector('#tyres').getBoundingClientRect().bottom - (innerHeight - tabH() - 8);
          if (over > 0) scrollBy({top: over, behavior: 'smooth'});
        }
      };
      // the class of t (app.js kindRank: its rank and its kind of name), as the quiz reads a typed answer
      typeBind(body.querySelector('.tyform'), (m, text, sp) => finish(m, text, sp), SUBJ, kindRank(t), one, {
        t, // the spelling step, as in the quiz (a close typo of t is retyped once)
        sp: typeSp
      });
      body.querySelectorAll('[data-v]').forEach(
        b =>
          (b.onclick = () => {
            view = b.dataset.v;
            round();
          })
      );
    };
    round();
  }
});
