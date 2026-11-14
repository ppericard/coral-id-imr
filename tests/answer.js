// One way for every smoke to wait for the question on screen and answer it, whatever its format: the choices (4, 3 or
// 2: a duel, an Again), a typed question (model.js TYPED: no choice buttons, a form), a fish surprise (quiz.js winkShow,
// [data-w]). A smoke loop that waited for the choice buttons hung 30 s on a typed question its player had reached
// (#855's first head: a genus past TYPED.from inside the overlays smoke's 60 answers); so no smoke waits for, or clicks,
// an answer of one format on its own (tests/answer.test.js holds it), and a format this file does not know fails at once
// with what is on screen, never as a bare timeout.
//
// From a smoke (Node):
//   const answer = require('./answer.js');
//   await answer.ready(p);              // an answerable question is on screen (installs smokeAnswer in the page)
//   await answer.ready(p, {timeout: 5000, optional: true}); // false instead of throwing when none comes
//   await answer.install(p);            // smokeAnswer in the page now, for a loop that runs inside one evaluate
//   ctx.addInitScript(answer.PAGE);     // or in every page of a context
// In the page (inside the smoke's own evaluate, so what the answer shows is read in the same task):
//   smokeAnswer()        the right answer          smokeAnswer(false)  a wrong one ("I don't know" when typed)
//   smokeAnswer('Porites') that unit ('' = "I don't know" when typed; a choice it must be among); undefined throws
//   → {fmt: 'choices' | 'typed' | 'wink', t: the unit asked, given: the unit answered ('' = I don't know), n: choices}
// smokeAnswer never draws a random number (draw.smoke.js seeds Math.random: a draw taken here would shift every later one).

// Every control the app enables and disables as a question's answers (app.js qAnswers): tests/answer.test.js checks this
// list against app.js, so a new answer control fails a unit test until smokeAnswer answers it.
const CONTROLS = ['[data-c]', '[data-w]', '.tyform input', '.tyform button'];
// An open question with an answer enabled: a choice, a surprise's choice, or a typed question's field.
const SEL = '#view .q:not(.done) :is([data-c], [data-w], .tyform input):not([disabled])';

// Runs in the page: defines smokeAnswer and smokeWhere (what is on screen, for an error).
const PAGE = () => {
  if (window.smokeAnswer) return;
  const where = () => {
    const q = document.querySelector('#view .q');
    return JSON.stringify({
      hash: location.hash,
      q: q ? q.className : null,
      controls: q
        ? [...q.querySelectorAll('[data-c], [data-w], .tyform input')].map(
            b => (b.dataset.c ?? b.dataset.w ?? 'input') + (b.disabled ? ':off' : '')
          )
        : [],
      cards: [...document.querySelectorAll('.unlock')].map(d => d.className),
      t: (typeof qNow === 'function' && qNow() && qNow().g) || null
    });
  };
  window.smokeWhere = where;
  // A Find the X (quiz.js question) opens its answers once its four tiles are in; the smokes keep the photos' host out of
  // reach, so a tile still waiting is counted in (its load event), as a player's would be once it came. Never one that
  // failed for good (.fail): that question stays closed, as the app means it.
  window.smokeTiles = () =>
    document
      .querySelectorAll('#view .q:not(.done):not(.qnone) .qstage.qfx .fxt img:not(.fail)')
      .forEach(im => im.dataset.smokeIn || ((im.dataset.smokeIn = '1'), im.dispatchEvent(new Event('load'))));
  // The name a player types for unit n: a fish entry's name (fish.smoke.js), a genus its own.
  const typedName = n => (typeof GX === 'function' && GX(n) && GX(n).name) || n;
  window.smokeAnswer = (...a) => {
    const fail = m => {
      throw new Error(`smokeAnswer: ${m} ${where()}`);
    };
    // No argument: the right answer. An argument that is no answer (a pick computed from an empty list) is a bug.
    const pick = a.length ? a[0] : true;
    if (pick == null) fail(`no answer given (${pick})`);
    const q = document.querySelector('#view .q:not(.done)');
    if (!q) fail('no open question');
    let out;
    if (q.matches('.wink')) {
      // A surprise (quiz.js winkShow): the unit shown is the choice whose own wink lists the others.
      const ids = [...q.querySelectorAll('[data-w]')].map(b => b.dataset.w),
        t = ids.find(n => {
          const w = typeof GX === 'function' && GX(n) && GX(n).wink;
          return w && ids.every(x => x === n || w.choices.some(([id]) => id === x));
        });
      const given = pick === true ? t : pick === false ? ids.find(x => x !== t) : pick;
      const b = given != null && q.querySelector(`[data-w="${CSS.escape(given)}"]`);
      if (!b) fail(`no surprise choice ${JSON.stringify(given)}`);
      b.click();
      out = {fmt: 'wink', t, given, n: ids.length};
    } else {
      const t = (typeof qNow === 'function' && qNow() && qNow().g) || (typeof SHOWNQ !== 'undefined' && SHOWNQ && SHOWNQ[1]);
      smokeTiles();
      const bs = [...q.querySelectorAll('[data-c]')],
        f = q.querySelector('.tyform');
      if (bs.length) {
        const b =
          pick === true
            ? bs.find(x => x.dataset.c === t)
            : pick === false
              ? bs.find(x => x.dataset.c !== t)
              : bs.find(x => x.dataset.c === pick);
        if (!b) fail(`no choice for ${JSON.stringify(pick)} on ${t}`);
        if (b.disabled) fail('the choices are disabled');
        b.click();
        out = {fmt: 'choices', t, given: b.dataset.c, n: bs.length};
      } else if (f) {
        const given = pick === true ? t : pick === false ? '' : pick;
        if (!t && pick === true) fail('a typed question with no unit asked');
        if (!given) f.querySelector('[data-idk]').click();
        else {
          f.querySelector('input').value = typedName(given);
          f.requestSubmit();
        }
        out = {fmt: 'typed', t, given, n: 0};
      } else fail('a question in a format smokeAnswer does not know (tests/answer.js)');
    }
    // Answered: the question is done (or replaced by what the answer opened); a typed text the form refused says why.
    if (q.isConnected && !q.classList.contains('done')) {
      const m = q.querySelector('.tymsg');
      fail(`the answer ${JSON.stringify(out.given)} was not taken${m && m.textContent ? `: ${m.textContent}` : ''}`);
    }
    return out;
  };
};

const install = p => p.evaluate(PAGE);

// Waits for an answerable question (SEL), smokeAnswer installed. None in time: throws with what is on screen (a card
// holding the draw, another page, a format SEL does not know), or returns false when optional.
async function ready(p, {timeout = 30000, optional = false} = {}) {
  await install(p);
  const ok = await p
    .waitForFunction(sel => (window.smokeTiles && smokeTiles(), !!document.querySelector(sel)), SEL, {timeout})
    .then(
      () => true,
      () => false
    );
  if (ok || optional) return ok;
  const seen = await p.evaluate(() => (window.smokeWhere ? smokeWhere() : location.hash)).catch(e => String(e));
  throw new Error(`no answerable question in ${timeout} ms: ${seen}`);
}

module.exports = {CONTROLS, SEL, PAGE, install, ready};
