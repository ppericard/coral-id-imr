// Cards and pop-ups: every kind, live. Pierre chose direction B, Medallion, of the three mock-up directions (2026-11-03;
// the mock-up with A Postcard and C Sheet is in the history, commit f46f11c), the first meeting with a genus keeping its
// photo band: the live cards now come from app.js cardShow (docs/DESIGN.md "Cards"). This page opens each kind through
// that builder, nothing recorded: the cards the app shows (sign-in, achievement, note) are the real ones; the others
// carry sample copy and numbers (an offer here never opens a genus). #tools/cards/<kind> opens one. Admin only in the hub.
(function () {
  const GENUS = 'Acropora';
  const sample = {
    apology: () =>
      cardShow({
        kind: 'apology',
        kick: 'Sorry',
        title: 'Sorry about your last run',
        body: '<p>Hi! Yesterday evening we adjusted how the app picks your questions, and some of it wasn’t right yet: too many new genera came at once, and the questions didn’t get easier after misses.</p><p>It’s fixed now. Sorry for the rough ride!</p>',
        primary: {text: 'Thanks'},
        esc: 1,
        enter: 1
      }),
    update: () =>
      cardShow({
        kind: 'update',
        visual: cardRing(42, 50),
        kick: 'Update',
        title: 'Your progress was recalculated with the improved model',
        body: '<p>Your progress is now computed again from all your answers, with the rules the app uses today. It went from 50% to 42%. Every answer you gave is kept.</p>',
        primary: {text: 'Got it'},
        esc: 1,
        enter: 1
      }),
    feature: () => {
      const x = RECALC.L.filter(r => r.kind === 'feature').pop();
      cardShow({
        kind: 'feature',
        kick: x.k || 'New',
        title: x.t,
        body: `<p>${x.p}</p>`,
        primary: {text: x.b || 'Got it'},
        esc: 1,
        enter: 1
      });
    },
    genus: () =>
      cardShow({
        ...introCard(GENUS, {pos: '1 of 4', note: 'The first questions are about these 4 genera.', btn: 'Next', all: true, hint: true}),
        cls: '',
        esc: 'esc',
        enter: 'enter',
        tap: 'tap',
        bind: d => d.querySelector('[data-all]') && (d.querySelector('[data-all]').onclick = () => d.close('all'))
      }),
    tip: () =>
      cardShow({
        kind: 'tip',
        kick: '25 answers in',
        title: 'You seem to know your corals already',
        body: `<p>Open all ${slateGenera().length} genera at once, instead of one at a time? ${slateGenera().length - 6} are still to come.</p>`,
        primary: {text: 'Open all genera'},
        secondary: {text: 'Not now'},
        esc: 2,
        note: 'Also in My progress, any time.'
      }),
    bonus: () => {
      const L = BONUS.filter(x => GX(x));
      cardShow({
        kind: 'bonus',
        kick: 'Every genus of the slate met',
        title: `${L.length} more genera?`,
        body: `<p>Not on the IMR coral list, but common at Dauin: you may meet them on dives and in ReefCloud photos.</p>${bonusThumbs(L)}<p class="ulnote">${L.map(x => `<i>${esc(x)}</i>`).join(', ')}</p>`,
        primary: {text: 'Add them'},
        secondary: {text: 'Not now'},
        esc: 2,
        note: '⚙ Settings, Bonus genera, any time. They don’t count in your progress.'
      });
    },
    account: () => signinNudge(false, false),
    ach: () => achPop(ACH.find(a => a.id === 'learn1') || ACH[0]),
    toast: () => appToast(`All ${slateGenera().length} genera are open: the quiz now asks any of them.`, 6000)
  };
  const KINDS = [
    ['apology', CARD_KINDS.apology, 'Apology', 'core.js SORRY (opening pace branch)'],
    ['update', CARD_KINDS.update, 'Progress recalculated', 'progress.js RECALC, replay branch rvNotice'],
    ['feature', CARD_KINDS.feature, 'New feature', 'progress.js RECALC kind feature'],
    ['genus', CARD_KINDS.genus, 'First meeting with a genus', 'quiz.js introShow'],
    ['tip', CARD_KINDS.tip, 'Tip: open all genera, back to one at a time', 'quiz.js introOfferShow, backShow'],
    ['bonus', CARD_KINDS.bonus, 'Bonus genera offer', 'quiz.js bonusOfferShow'],
    ['account', CARD_KINDS.account, 'Sign in', 'sync.js signinNudge (the real card)'],
    ['ach', CARD_KINDS.ach, 'Achievement toast', 'progress.js achPop (the real toast)'],
    ['toast', '', 'Short note', 'progress.js appToast (the real note)']
  ];
  const shut = () => {
    document.querySelectorAll('.unlock').forEach(d => (d.ulClose ? d.ulClose() : d.remove()));
    document.querySelectorAll('.apptoast').forEach(t => t.remove());
  };
  LAB.add({
    id: 'cards',
    admin: true,
    title: 'Cards and pop-ups',
    blurb: 'Every kind of card and pop-up of the app, live, with sample copy.',
    lede: 'Every kind of card and pop-up, as the app shows it (Medallion; the first meeting with a genus keeps its photo band). Each one opens for real: Escape, its button or, where the card allows it, a tap outside closes it. Sample copy and numbers; nothing is recorded.',
    render(root, ...args) {
      root.innerHTML = `<ul class="lckinds">${KINDS.map(
        ([k, e, name, where]) =>
          `<li><span class="e" aria-hidden="true">${e}</span><span><b>${name}</b><small>${where}</small></span><button type="button" class="next sec" data-open="${k}">Open</button></li>`
      ).join('')}</ul>`;
      root.querySelectorAll('[data-open]').forEach(
        b =>
          (b.onclick = () => {
            shut();
            sample[b.dataset.open]();
          })
      );
      // #tools/cards/<kind> (an older #tools/cards/<direction>/<kind> link too) opens it.
      const open = args.find(a => sample[a]);
      if (open) setTimeout(() => sample[open](), 60);
      return shut;
    }
  });
})();
