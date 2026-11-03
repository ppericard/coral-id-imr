// Cards and pop-ups: three visual directions for the whole family of the app's cards (Pierre, 2026-11-03: "the cards
// and pop-ups are just text in a frame; work on their presentation and visuals, maybe emojis or small complementary
// visuals"). A static mock-up for Pierre to pick a direction, not wired to the game: the live cards (quiz.js introShow,
// introOfferShow, backShow, bonusOfferShow; progress.js recalcNotice, achPop, appToast; sync.js signinNudge) keep their
// look until he chooses. Real copy and real data (the genus's photo, IMR tips, bonus genera photos, slate size); the
// player's name (Ana) and numbers (50% to 42%, 3 genera met) are made up.
// Every direction shares the same grammar: one kind per card, one emoji per kind (CK), the kind's hue (the accent; the
// warm --warn for an apology only), a title, one short paragraph, one primary button.
//   A, Postcard: a header band with a contextual drawing (app icon style) or the genus photo, a kicker chip on its edge.
//   B, Medallion: a round badge over the top edge (the kind's emoji, a round photo crop, or the progress ring), centred.
//   C, Sheet: a bottom sheet on phones (buttons under the thumb), a line icon tile beside the title (the sober one: no
//   emoji but the achievement's own), the data as a strip.
// Routes: #lab-cards|<A/B/C>|<kind: opens it as a real pop-up>. Shown in the Tools hub to the admin only (lab.js admin).
(function () {
  const DIRS = {
    A: {
      name: 'Postcard',
      why: 'A header band with a small drawing in the app’s icon style (or the genus photo), an emoji chip on its edge, text left-aligned. The richest look; one drawing per kind of card.'
    },
    B: {
      name: 'Medallion',
      why: 'A round badge over the top edge holds the emoji, a round photo crop or the progress ring; centred text, a soft tint. Warm and light; almost no drawing to maintain.'
    },
    C: {
      name: 'Sheet',
      why: 'On phones a sheet that rises from the bottom, buttons under the thumb and the question still in view; a line icon beside the title; the numbers drawn as a strip. Calm and native.'
    }
  };
  // One line icon per kind (24 px grid, 1.75 stroke, currentColor: the LAB_ICONS style).
  const IC = {
    apology: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.2 4.2 0 0 1 12 7.3a4.2 4.2 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20z"/>',
    update: '<path d="M19.5 10.5A7.7 7.7 0 0 0 5.6 7.4M4.5 3.8v3.9h3.9M4.5 13.5a7.7 7.7 0 0 0 13.9 3.1M19.5 20.2v-3.9h-3.9"/>',
    genus: LAB_ICONS.basics,
    account:
      '<path d="M7.2 18.5h10.3a4 4 0 0 0 .6-7.95 6 6 0 0 0-11.6-1.2A4.6 4.6 0 0 0 7.2 18.5z"/><path d="M12 15.5v-5M9.6 12.6 12 10.2l2.4 2.4"/>',
    tip: '<path d="M9.2 17.5h5.6M10 20.5h4M12 3.5a5.8 5.8 0 0 0-3.4 10.5c.6.5 1 1.2 1 2v1.5h4.8V16c0-.8.4-1.5 1-2A5.8 5.8 0 0 0 12 3.5z"/>',
    bonus:
      '<rect x="3.5" y="8" width="17" height="4.5" rx="1"/><path d="M5 12.5V20h14v-7.5M12 8v12M12 8S10.6 3.6 8.3 4.6 8.7 8 12 8zM12 8s1.4-4.4 3.7-3.4S15.3 8 12 8z"/>',
    ach: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 5.5H5.2A3 3 0 0 0 8 10M16 5.5h2.8A3 3 0 0 1 16 10M12 13v3.5M8.5 20.5h7M10 16.5h4"/>'
  };
  const svg = (vb, inner, cls = '') =>
    `<svg class="${cls}" viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
  const icon = k => svg('0 0 24 24', IC[k]);
  // The kinds of card, one emoji each (readable in both themes: always on the kind's pale tint).
  const CK = {
    apology: {e: '🙏', k: 'Sorry'},
    update: {e: '🔄', k: 'Update'},
    genus: {e: '🪸', k: 'New genus'},
    account: {e: '💾', k: 'Save your progress'},
    tip: {e: '💡', k: 'Tip'},
    bonus: {e: '🎁', k: 'Bonus genera'},
    ach: {e: '🏆', k: 'Achievement'}
  };
  const FROM = 50,
    TO = 42,
    MET = 3;

  /* ---------- drawings and data visuals ---------- */
  // A progress ring (the header pill's look): pct filled, ghost = a former value shown faint behind it.
  const ring = (pct, ghost = 0, cls = '') => {
    const C = 2 * Math.PI * 26,
      arc = (p, c) =>
        `<circle class="${c}" cx="32" cy="32" r="26" stroke-dasharray="${((C * p) / 100).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 32 32)"/>`;
    return `<svg class="lcring ${cls}" viewBox="0 0 64 64" aria-hidden="true"><circle class="tr" cx="32" cy="32" r="26"/>${ghost ? arc(ghost, 'gh') : ''}${arc(pct, 'ar')}<text x="32" y="38.5" text-anchor="middle">${pct}%</text></svg>`;
  };
  const rings = () =>
    `<div class="lcrings"><figure>${ring(FROM, 0, 'was')}<figcaption>Before</figcaption></figure><span class="lcarrow" aria-hidden="true">${svg('0 0 24 24', '<path d="M4 12h15M14 7l5 5-5 5"/>')}</span><figure>${ring(TO)}<figcaption>Now</figcaption></figure></div>`;
  const bar = () =>
    `<div class="lcbar" role="img" aria-label="Progress ${FROM}% before, ${TO}% now"><span class="gh" style="width:${FROM}%"></span><span class="fi" style="width:${TO}%"></span></div><p class="lcbarl"><span><s>${FROM}%</s> before</span><b>${TO}% now</b></p>`;
  // The slate as dots: the genera met filled, the others to come.
  const dots = () => {
    const n = slateGenera().length;
    return `<div class="lcdots" role="img" aria-label="${MET} genera met, ${n - MET} to come">${Array.from({length: n}, (_, i) => `<i${i < MET ? ' class="on"' : ''}></i>`).join('')}</div><p class="lcdotl"><b>${MET} met</b> · ${n - MET} still to come</p>`;
  };
  const bonusL = () => BONUS.filter(n => GX(n));
  // The bonus genera's own photos, a row of round crops (their names in the line below them).
  const thumbs = () =>
    `<div class="lcthumbs">${bonusL()
      .map(n => {
        const p = cover(GX(n));
        return p ? `<img src="${img(p, 's')}" alt="">` : '<span></span>';
      })
      .join('')}</div>`;
  const names = () =>
    `<p class="lcnames">${bonusL()
      .map(n => `<i>${esc(n)}</i>`)
      .join(', ')}</p>`;
  // Drawings for the Postcard band (the icon set's stroke, larger; the kind's hue, the rest muted).
  const ART = {
    // A rough line that turns smooth: the rough ride, fixed.
    apology: svg(
      '0 0 200 72',
      `<path class="mut" d="M14 44l9-16 9 24 9-28 9 26 8-14 8 8"/><path pathLength="1" class="draw" d="M75 44c12 4 18-10 32-10s20 9 34 9 16-7 26-7"/><circle class="fillk" cx="181" cy="36" r="11"/><path d="M176 36.5l3.6 3.6 6.4-7"/>`,
      'lcart'
    ),
    // Phone and laptop, saved through the cloud.
    account: svg(
      '0 0 200 72',
      `<rect class="mut" x="26" y="20" width="26" height="44" rx="5"/><path class="mut" d="M36 58h6"/><path class="mut" d="M140 26h38a3 3 0 0 1 3 3v24h-44V29a3 3 0 0 1 3-3zM131 53h56l-3 6h-50z"/><path class="fillk" d="M86 42h28a9 9 0 0 0 1.5-17.9A13 13 0 0 0 90.6 21 10.5 10.5 0 0 0 86 42z"/><path d="M93.5 31.5l4.5 4.5 8-8.5"/><path pathLength="1" class="dash" d="M57 40c8-8 17-9 24-6M119 34c7-3 13-1 17 5"/>`,
      'lcart'
    ),
    // The achievement's own emoji in a ring of short rays.
    ach: a =>
      `<div class="lcbadge">${svg('0 0 120 120', Array.from({length: 12}, (_, i) => `<path d="M60 ${i % 2 ? 10 : 6}v10" transform="rotate(${i * 30} 60 60)"/>`).join(''), 'rays')}<span class="e">${a.icon}</span><span class="tier">${TIER[a.tier]}</span></div>`
  };

  /* ---------- the cards' content (real copy) ---------- */
  const ACHX = () => ACH.find(a => a.id === 'learn1');
  const GENUS = 'Acropora';
  function content(kind, dir) {
    if (kind === 'apology')
      return {
        title: 'Sorry about your last run',
        body: `<p>Hi Ana! Yesterday evening we adjusted how the app picks your questions, and some of it wasn't right yet:</p>
          <ul class="lcfix"><li>Too many new genera came at once.</li><li>The questions didn't get easier after misses.</li></ul>
          <p>It's fixed now. Sorry for the rough ride!</p>`,
        btn: 'Thanks',
        band: ART.apology,
        medal: `<span class="e">${CK.apology.e}</span>`
      };
    if (kind === 'update')
      return {
        title: 'Your progress was recalculated with the improved model',
        body: `<p>Your progress is now computed again from all your answers, with the rules the app uses today. It went from ${FROM}% to ${TO}%. Every answer you gave is kept.</p>`,
        btn: 'Got it',
        band: rings(),
        medal: ring(TO, FROM, 'big'),
        strip: bar()
      };
    if (kind === 'genus') {
      const g = GX(GENUS),
        p = cover(g);
      return {
        chip: '1 of 4',
        title: `<i>${GENUS}</i>`,
        body: `${plainLine(g)}<div class="ultips"><p class="label">${tipsLabel(g)}</p>${tipsList(g)}</div><p class="ulnote">The first questions are about these 4 genera.</p>`,
        btn: 'Next',
        photo: p ? img(p, 's') : '',
        all: `<div class="ulall"><p><b>Had the IMR coral lecture?</b> Skip the cards and play with all ${slateGenera().length} genera.</p><button class="next sec" type="button">Open all genera</button></div>`
      };
    }
    if (kind === 'account')
      return {
        title: 'Sign in to save your progress',
        body: `<p>Training at IMR? Your progress is saved for your trainer and comes back on any device.</p>
          <form class="sform" onsubmit="return false"><label>Your name <input name="n" maxlength="40" autocomplete="off" placeholder="First name + initial"></label>
          <label>4-digit code <input name="p" inputmode="numeric" maxlength="4" autocomplete="off"></label></form>
          <p class="note">Your first name and your surname's initial (e.g. Ana B.). New name: pick any code and remember it.</p>`,
        btn: 'Sign in',
        sec: 'Later',
        band: ART.account,
        medal: `<span class="e">${CK.account.e}</span>`
      };
    if (kind === 'tip')
      return {
        chip: '25 answers in',
        title: 'You seem to know your corals already',
        body: `<p>Open all ${slateGenera().length} genera at once, instead of one at a time?</p>`,
        btn: 'Open all genera',
        sec: 'Not now',
        note: 'Also in My progress, any time.',
        band: dots(),
        medal: `<span class="e">${CK.tip.e}</span>`,
        strip: dots()
      };
    if (kind === 'bonus')
      return {
        title: `${bonusL().length} more genera?`,
        body: `<p>Not on the IMR coral list, but common at Dauin: you may meet them on dives and in ReefCloud photos.</p>${dir === 'A' ? '' : thumbs()}${names()}`,
        btn: 'Add them',
        sec: 'Not now',
        note: '⚙ Settings, Bonus genera, any time. They don’t count in your progress.',
        band: thumbs(),
        medal: `<span class="e">${CK.bonus.e}</span>`
      };
    return {};
  }

  /* ---------- one card in a direction ---------- */
  const kick = (kind, c, emoji = true) =>
    `<span class="lckick">${emoji ? `<span class="e" aria-hidden="true">${CK[kind].e}</span>` : ''}${CK[kind].k}${c.chip ? `<span class="lcsep"> · </span>${c.chip}` : ''}</span>`;
  const btns = (c, dir) =>
    `<div class="lcbtns">${c.sec ? `<button class="next sec" type="button" data-close>${c.sec}</button>` : ''}<button class="next" type="button" data-close data-main>${c.btn}</button></div>${c.note ? `<p class="note lcnote">${c.note}</p>` : ''}`;
  function card(kind, dir, id) {
    const c = content(kind, dir),
      h = `<h3 id="${id}">${c.title}</h3>`,
      tail = btns(c, dir) + (c.all || '');
    if (dir === 'A') {
      const band = c.photo ? `<img src="${c.photo}" alt="">` : c.band;
      return `<div class="lcc dA" data-k="${kind}"><div class="lcband${c.photo ? ' ph' : ''}">${band}</div><div class="lcbody">${kick(kind, c)}${h}${c.body}${tail}</div></div>`;
    }
    if (dir === 'B') {
      const medal = c.photo ? `<img src="${c.photo}" alt="">` : c.medal;
      return `<div class="lcc dB" data-k="${kind}"><div class="lcmed${c.photo ? ' ph' : ''}${kind === 'update' ? ' rg' : ''}">${medal}</div><div class="lcpanel"><div class="lcbody">${kick(kind, c, false)}${h}${c.body}${tail}</div></div></div>`;
    }
    // C: sheet. The genus photo leads; other kinds get the icon tile and, when they carry numbers, a strip.
    return `<div class="lcc dC" data-k="${kind}"><span class="lcgrab" aria-hidden="true"></span>${c.photo ? `<div class="lcphoto"><img src="${c.photo}" alt=""></div>` : ''}
      <div class="lchead">${c.photo ? '' : `<span class="lctile">${icon(kind)}</span>`}<div>${kick(kind, c, false)}${h}</div></div>
      <div class="lcbody">${c.body}${c.strip ? `<div class="lcstrip">${c.strip}</div>` : ''}${tail}</div></div>`;
  }
  // The achievement toast (top of the screen, not modal, the existing confetti kept).
  function toast(dir, live = false) {
    const a = ACHX(),
      conf = live
        ? `<span class="confetti" aria-hidden="true">${Array.from({length: 14}, (_, i) => `<i style="--i:${i}"></i>`).join('')}</span>`
        : '';
    const txt = `<span class="lctx">${kick('ach', {chip: 'Silver'}, dir === 'A')}<b>${esc(a.title)}</b><span>${esc(a.desc)}</span></span>`;
    if (dir === 'A') return `<div class="lct dA">${ART.ach(a)}${txt}${conf}</div>`;
    if (dir === 'B')
      return `<div class="lct dB"><span class="lcmed sm"><span class="e">${a.icon}</span><span class="tier">${TIER[a.tier]}</span></span>${txt}${conf}</div>`;
    return `<div class="lct dC"><span class="lctile">${icon('ach')}</span>${txt}<span class="lcemo" aria-hidden="true">${a.icon}</span>${conf}</div>`;
  }

  /* ---------- the page ---------- */
  const KINDS = [
    ['apology', 'Apology (in progress on another branch)'],
    ['update', 'Progress recalculated (core.js RVS, replay branch)'],
    ['genus', 'First meeting with a genus (quiz.js introShow)'],
    ['ach', 'Achievement (progress.js achPop)'],
    ['account', 'Sign-in nudge (sync.js signinNudge)'],
    ['tip', 'Open all genera offer (quiz.js introOfferShow)'],
    ['bonus', 'Bonus genera offer (quiz.js bonusOfferShow)']
  ];
  let n = 0;
  LAB.add({
    id: 'cards',
    admin: true,
    title: 'Cards and pop-ups: three designs',
    blurb: 'Design mock-up: the app’s cards and pop-ups in three visual directions, with real copy.',
    lede: 'A mock-up for Pierre to choose how every card and pop-up looks: <b>A, Postcard</b>, <b>B, Medallion</b>, <b>C, Sheet</b>. Each card opens as a real pop-up (Escape, a tap outside or its button closes it). The live cards are unchanged until a direction is chosen.',
    render(root, dir = 'A', open = '') {
      dir = DIRS[dir] ? dir : 'A';
      const back = cover(GX('Porites'));
      root.innerHTML = `<div class="lcpage">
        <div class="seg-row"><div class="seg" role="group" aria-label="Direction">${Object.entries(DIRS)
          .map(([k, d]) => `<button type="button" data-dir="${k}" aria-pressed="${k === dir}">${k} · ${d.name}</button>`)
          .join('')}</div></div>
        <p class="lcwhy"><b>${dir}, ${DIRS[dir].name}.</b> ${DIRS[dir].why}</p>
        <div class="lcgal">${KINDS.map(
          ([k, cap]) =>
            `<section class="lcstage s${dir}${k === 'ach' ? ' top' : ''}"><div class="lcscene">${back ? `<img class="lcbg" src="${img(back, 's')}" alt="">` : ''}${
              k === 'ach' ? toast(dir) : card(k, dir, 'lch' + ++n)
            }</div><p class="lccap"><span>${cap}</span><button type="button" class="linkish" data-open="${k}">Open as pop-up</button></p></section>`
        ).join('')}</div></div>`;
      // Gallery cards are pictures: their buttons do nothing, their fields take no focus.
      root.querySelectorAll('.lcscene button, .lcscene input').forEach(b => (b.tabIndex = -1));
      root.querySelectorAll('[data-dir]').forEach(b => (b.onclick = () => (location.hash = '#lab-cards|' + b.dataset.dir)));
      root.querySelectorAll('[data-open]').forEach(b => (b.onclick = () => pop(b.dataset.open, dir, b)));
      if (open && KINDS.some(([k]) => k === open)) setTimeout(() => pop(open, dir), 60);
      return () => document.querySelectorAll('.lcx, .lct.live').forEach(x => (x.ulClose ? x.ulClose() : x.remove()));
    }
  });

  // As a real pop-up: the app's overlay rules (one at a time as .unlock, aria-modal, focus kept inside, Escape and a
  // tap outside close it, focus back where it was).
  function pop(kind, dir, from) {
    document.querySelectorAll('.lcx, .lct.live').forEach(x => (x.ulClose ? x.ulClose() : x.remove()));
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (kind === 'ach') {
      const w = document.createElement('div');
      w.innerHTML = toast(dir, !calm);
      const t = w.firstElementChild;
      t.classList.add('live');
      t.setAttribute('role', 'status');
      document.body.append(t);
      const tm = setTimeout(() => t.remove(), 6000);
      t.ulClose = () => (clearTimeout(tm), t.remove());
      t.onclick = t.ulClose;
      return;
    }
    const id = 'lch' + ++n,
      d = document.createElement('div');
    d.className = `unlock lcx x${dir}`;
    d.setAttribute('role', 'dialog');
    d.setAttribute('aria-modal', 'true');
    d.setAttribute('aria-labelledby', id);
    d.innerHTML = card(kind, dir, id);
    document.body.append(d);
    const close = () => {
      d.remove();
      document.removeEventListener('keydown', key, true);
      if (from && from.isConnected) from.focus({preventScroll: true});
    };
    const key = e => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        return close();
      }
      if (e.key !== 'Tab') return;
      const f = [...d.querySelectorAll('button, input')].filter(x => x.offsetParent);
      if (!f.length) return;
      const i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) (e.preventDefault(), f[f.length - 1].focus());
      else if (!e.shiftKey && i === f.length - 1) (e.preventDefault(), f[0].focus());
    };
    document.addEventListener('keydown', key, true);
    d.ulClose = close; // leaving the page closes it (app.js route)
    d.addEventListener('click', e => {
      if (e.target === d || e.target.closest('[data-close]')) close();
    });
    setTimeout(() => d.querySelector('input, [data-main]')?.focus({preventScroll: true}), 50);
  }
})();
