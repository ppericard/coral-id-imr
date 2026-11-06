// Type the genus (Pierre, 2026-11-03): a photo, and the player types the genus instead of picking 1 of 4 (recall, not
// recognition: what an RA does in front of a colony). Prototype of the typed questions the quiz now slips in more and
// more as a player's level on a genus rises (model.js TYPED; docs/ROADMAP.md "Free-text answers").
// What Pierre agreed: light spelling tolerance (1 letter on a short name, 2 on a long one), old names accepted ("formerly
// X" in the genus's own lines), no suggestions while typing (that would turn it back into a pick from a list), the phone's
// autocorrect and capitals off, an "I don't know" button (a miss), the right spelling shown after the answer. A word
// that is no game genus, even with the tolerance, is not counted: the player is asked to check the spelling.
// A close typo of the genus asked is retyped once before the result (the quiz's spelling step, quiz.js typeBind).
// The matching (core.js TYPE, typeNorm, typeDist, typeNamesOf, typeMatchIn) and the form with its messages (quiz.js
// typeForm, typeBind, typeRead) are the quiz's own: one code for both.

// The corals as the subject of fn (app.js inSubject; the Lab runs before subjects existed too: then fn as it is).
const CORALS = fn => (typeof inSubject === 'function' && typeof SUBJECTS !== 'undefined' ? inSubject(SUBJECTS[0].id, fn) : fn());

LAB.add({
  id: 'type',
  icon: '⌨',
  title: 'Type the genus',
  blurb: 'Name the coral by typing its genus, with no choices to pick from: proves you recognise it, not just tell 4 apart.',
  lede: 'Type the genus and press Enter. Old names are accepted; a small typo still counts, retyped once to learn the spelling; no suggestions while you type.',
  render(root) {
    const score = {ok: 0, n: 0, streak: 0},
      scoreLine = () => `${score.ok}/${score.n} right · streak ${score.streak}`;
    let view = 'any';
    const chips = () =>
      `<div class="chips">${[
        ['any', 'Any view'],
        ['wide', 'Colony'],
        ['medium', 'Close-up'],
        ['macro', 'Corallites']
      ]
        .map(([v, t]) => `<button class="chip" type="button" data-v="${v}" aria-pressed="${v === view}">${t}</button>`)
        .join('')}</div>`;
    root.innerHTML = '<div id="tybody"></div>';
    const body = root.querySelector('#tybody');
    const round = () => {
      // The corals' slate whatever the subject on screen: the Tools are the corals' (Codex review #442: with Fish chosen it
      // drew fish teaching ids).
      // Only the genera unlocked on the quiz path (lab.js labPlay, rule L4), each with a photo the games may
      // teach from (app.js gamePhotoOk: Research Grade for the extra genera), in the view asked for, else in any view
      // (Codex review #379: no fallback around the rule). Drawn among those that have one: with a few genera unlocked,
      // drawing again until one had a photo could go on for ever.
      const ok = (t, w) => gamePics(t, w).filter(x => gamePhotoOk(t, x)),
        any = t => ['wide', 'medium', 'macro'].flatMap(w => ok(t, w)),
        all = (typeof slateGenera === 'function' ? CORALS(slateGenera) : labNames()).filter(n => GX(n)), // Millepora too (Codex review #379)
        pool = (typeof unlocked === 'function' ? CORALS(() => unlocked(all)) : all).filter(n => any(n).length);
      if (!pool.length) {
        body.innerHTML = `<p class="note">This game asks about the genera you have met. Meet a few in the quiz first.</p><p><a class="next" href="${esc(hr('quiz'))}">Play the quiz</a></p>`;
        return;
      }
      const t = pick(pool),
        v = view === 'any' ? pick(['wide', 'medium', 'macro']) : view,
        L = ok(t, v).length ? ok(t, v) : any(t),
        p = pick(L);
      body.innerHTML = `<div class="rvlayout tylayout"><div class="rvstage tystage"><img src="${img(p, fit(Math.min(innerWidth, 800)))}" alt="Coral to identify"></div>
        <div class="gside">
          ${typeForm(CORALS(() => SUBJ))}
          <div id="tyres"></div>
          <p class="note tyscore">${scoreLine()}</p>${chips()}</div></div>`;
      // said: the genus read ({g, old, exact}), null for "I don't know"; text: what was typed.
      const finish = (ok, said, text, sp) => {
        score.n++;
        score.ok += ok ? 1 : 0;
        score.streak = ok ? score.streak + 1 : 0;
        body.querySelector('.tyscore').textContent = scoreLine(); // the answer just counted (Codex review #379)
        // The photo's source pill, only now: before the answer it would give the genus away (as Blur reveal). Hidden on
        // phones, as in every game (app.css .psrc, rule P5): the enlarged view carries the source there.
        const im = body.querySelector('.tystage img');
        if (im && typeof photoSrc === 'function') im.insertAdjacentHTML('afterend', photoSrc(p));
        // How it was read (a typo or an old name, quiz.js typeRead), on a miss too: "you wrote Acorpora, read as Acropora".
        // The spelling step (quiz.js typeStep) in the same one line as the quiz: "Right, but not quite: it's spelled …".
        const read = typeRead(said, text, sp),
          st = ok && typeStep(said, text, sp),
          how =
            said == null ? `It was <i>${esc(t)}</i>.` : ok ? `<i>${esc(t)}</i>.` : `It was <i>${esc(t)}</i>, not <i>${esc(said.g)}</i>.`,
          verdict = !st
            ? `<b>${ok ? 'Right' : said == null ? 'No worries' : 'Missed'}</b>: ${how}${read ? ` ${read}` : ''}`
            : `<b>Right</b>, but not quite: it's spelled ${st.spelled}${st.old ? `, ${st.alt ? 'read as' : 'the old name of'} <i>${esc(t)}</i>` : ''}.`;
        body.querySelector('#tyres').innerHTML =
          `<p class="${ok ? 'ok' : said == null ? 'idk' : 'ko'}">${verdict} <a href="${genLink(t)}">Genus sheet</a></p>
          <p>${esc(tipsText(GX(t)))}</p><p class="credit">${credit(p)}</p>${typeof repBtn === 'function' ? repBtn({g: t, a: said ? said.g : '', ph: [p.f], m: 'type'}) : ''}<button type="button" class="next" id="tynext">Next</button>`;
        const nx = body.querySelector('#tynext');
        nx.onclick = round;
        nx.focus({preventScroll: true});
        // Phones: the result lands low (the keyboard was open, the tab bar below): bring it and Next into view.
        if (isStacked()) {
          const over = body.querySelector('#tyres').getBoundingClientRect().bottom - (innerHeight - tabH() - 8);
          if (over > 0) scrollBy({top: over, behavior: 'smooth'});
        }
      };
      typeBind(
        body.querySelector('.tyform'),
        (m, text, sp) => finish(!!m && m.g === t, m, text, sp),
        CORALS(() => SUBJ),
        undefined,
        undefined,
        {t} // the spelling step, as in the quiz (a close typo of t is retyped once)
      );
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
