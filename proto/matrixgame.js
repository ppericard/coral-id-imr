// Matrix: four photos and five names; the player taps a photo, then its name, and the pair is checked at once: right, the
// pair is kept and named; wrong, nothing is kept and the player tries again. Untimed, no move count, nothing scored, logged
// or saved (the Tools, rule U13: it graduates only with Pierre's OK; ROADMAP "Matrix": its scoring and its `mx` format come
// with it). It runs on the subject on screen (rule S1) as Same or different? and Odd one out do (proto/samediff.js,
// proto/oddone.js): the units are those the player has unlocked (model.js unlocked, rule L4), declared look-alikes first
// (app.js UNITS pairs, never the data's: model.js dataLooks), the photos the draw's own (lab.js labShots: model.js photoSet,
// as the duels'), the feedback the quiz's (quiz.js fbLine). The screen is Find the X's: four square tiles (app.css .fxt,
// quiz.js fitStage), the names beside them as the quiz's answers (.ans).
// Pure drawing (tests/matrixgame.test.js runs it in Node on stubs): mxPlan and mxPhotos; the page is below.

// What to ask. units: the unlocked units; pairs: the declared look-alike pairs [a, b]; apart(a, b): the two units carry two
// labels (two names one label gives would leave a photo with two right answers); more: other units of the game, never
// photographed, that may stand as the fifth name when too few unlocked ones are left (as the quiz's wrong choices, which
// name a unit not yet met only to make up their number: model.js distractors). The four photographed units start from a
// declared pair when one is unlocked, then each next one is a declared look-alike of one already shown when one is left, else
// any unlocked unit; the fifth name is an unlocked unit that looks like a shown one when one is left (a real trap), else any
// unlocked one, else (four units unlocked) a unit of the game never met, a look-alike of a shown one first.
// Null with fewer than four unlocked units, or when four of them do not carry four labels. {units, extra, names}: units the
// four photographed, in the order of the tiles; extra the fifth name; names the five, in the order the buttons show.
function mxPlan(units, pairs, apart, more = [], rnd = Math.random) {
  const pick = L => L[Math.floor(rnd() * L.length)],
    shuffled = L => {
      const a = [...L];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
    met = [...new Set(units)],
    look = (a, b) => pairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a)),
    // the units of L that carry another label than every unit of `taken`
    free = (L, taken) => L.filter(o => !taken.includes(o) && taken.every(t => apart(o, t) && apart(t, o)));
  if (met.length < 4) return null;
  const P = [];
  met.forEach(a => met.forEach(b => a < b && look(a, b) && apart(a, b) && apart(b, a) && P.push([a, b])));
  const shown = P.length ? shuffled(pick(P)) : [];
  if (!shown.length) {
    const s = free(met, []);
    if (!s.length) return null;
    shown.push(pick(s));
  }
  while (shown.length < 4) {
    const L = free(met, shown),
      near = L.filter(o => shown.some(t => look(o, t)));
    if (!L.length) return null;
    shown.push(pick(near.length ? near : L));
  }
  const rest = free([...new Set([...met, ...more])], shown),
    near = rest.filter(o => shown.some(t => look(o, t))),
    // the unlocked ones before the others, a look-alike of a shown unit before any other
    mine = rest.filter(o => met.includes(o)),
    from = [near.filter(o => met.includes(o)), mine, near, rest].find(L => L.length);
  if (!from) return null;
  const extra = pick(from);
  return {units: shuffled(shown), extra, names: shuffled([...shown, extra])};
}
// The four photos of a plan, in the order of its units: photo(n, want) gives a photo of unit n or null (lab.js labShots). One
// photo of each unit, so four different observations (rule P4: a multi-photo format shows different observations), all in the
// same view and framed alike (the first photo decides: a close-up or a square cut beside three colonies would tell the units
// apart by their framing). Null when a unit has no photo to match, so the caller draws another plan.
function mxPhotos(plan, photo) {
  const p = photo(plan.units[0], null);
  if (!p) return null;
  const want = {view: p.sdv, tile: !!p.xc},
    out = [p];
  for (const n of plan.units.slice(1)) {
    const q = photo(n, {...want, not: out.map(labObs)});
    if (!q) return null;
    out.push(q);
  }
  return out;
}

LAB.add({
  id: 'matrixgame',
  icon: '▦',
  title: 'Matrix',
  blurb: 'Four photos and five names: tap a photo, then its name. A quick untimed drill, no score.',
  // Said with the subject's own word (SUBJ.one), at the time the page is drawn.
  get lede() {
    return `Four photos, five names (one is a look-alike or an extra): tap a photo, then the name of its ${SUBJ.one}. A wrong pair is not kept: try again. Untimed; nothing here counts toward your progress.`;
  },
  render(root) {
    // The photo source of the Lab's photo games (lab.js labShots): the draw's own choice, the last rounds' photos left out.
    const {photo, seen} = labShots(16);
    const round = () => {
      const units = unlocked(),
        pairs = UNITS[SUBJ.id].pairs(),
        more = pool();
      let planned = false;
      for (let i = 0; i < 12; i++) {
        const plan = mxPlan(units, pairs, (a, b) => !choiceNames(a, b) && !choiceNames(b, a), more);
        if (!plan) break;
        planned = true;
        const ph = mxPhotos(plan, photo);
        if (ph) return {...plan, ph};
      }
      return {planned};
    };
    const draw = () => {
      const R = round();
      if (!R.ph) {
        root.innerHTML = `<p class="note">${
          R.planned
            ? `Not enough photos of the ${esc(SUBJ.many)} you have met for a set of four yet.`
            : `This game matches four photos to their names among the ${esc(SUBJ.many)} you have met. Meet a few in the quiz first.`
        }</p><p><a class="next" href="${esc(hr('quiz'))}">Play the quiz</a></p>`;
        return;
      }
      seen(R.ph);
      // The unit of each tile; the tiles matched so far; the tile and the name taken, waiting for the other.
      const of = R.units,
        got = new Set(),
        want = {t: null, n: null};
      // The tiles are the photos' buttons: no unit is named before its pair is right (nor in a label); the tiles take the
      // quiz's own photo-failure handling (app.js: a tile that cannot load closes the answers). One framing for the four.
      const tile = (p, k) =>
        `<figure class="fxt" style="--qbg:url('${img(p, 's')}')"><button type="button" data-c="${k}" aria-label="Photo ${k + 1}"><img src="${tileSrc(p)}" data-lo="${img(p, 's')}"${p.f ? ` data-f="${esc(p.f)}"` : ''} alt="${esc(SUBJ.what)} ${k + 1}"><kbd>${k + 1}</kbd></button></figure>`;
      const name = (c, i) =>
        `<button type="button" data-n="${esc(c)}"${uplain(c) ? ' class="plain"' : ''}><kbd>${'ABCDE'[i]}</kbd>${GX(c) && GX(c).sci ? `<span class="csn">${esc(unameT(c))}<small>${esc(GX(c).sci)}</small></span>` : esc(unameT(c))}</button>`;
      root.innerHTML = `<div class="q bleed qfind mxq">
        <div class="qstage qfx">${R.ph.map(tile).join('')}</div>
        <aside class="qside">
          <div class="qtop"><p class="prompt">Tap a photo, then its name.</p></div>
          <div class="ans mxans" role="group" aria-label="Names">${R.names.map(name).join('')}</div>
          <div id="mxst" class="mxst" role="status"></div>
          <div id="after"></div>
        </aside></div>`;
      const q = root.querySelector('.q'),
        stage = q.querySelector('.qstage'),
        st = q.querySelector('#mxst'),
        tiles = [...stage.querySelectorAll('.fxt')],
        ims = [...stage.querySelectorAll('img')],
        btns = [...q.querySelectorAll('[data-n]')],
        inn = new Set(ims.filter(im => im.complete && im.naturalWidth)),
        sig = viewKeys(),
        // The quiz's layout (fitStage). Once the round is over, on a phone or tablet the sheet is fixed at the bottom and
        // fitStage gives the stage what is left above it, but never less than 120 px: under a tall sheet (More open on a
        // short screen) the second row of tiles would sit behind it. Then one row of four squares, as large as the room above
        // the sheet allows.
        fit = () => {
          fitStage();
          const aft = document.getElementById('after');
          if (!isStacked() || !q.classList.contains('done') || !aft || getComputedStyle(aft).position !== 'fixed') return;
          const top = stage.getBoundingClientRect().top,
            room = Math.floor(aft.getBoundingClientRect().top - top - 8),
            low = Math.max(...[...stage.children].map(f => f.getBoundingClientRect().bottom)) - top;
          if (low <= room + 2) return; // (a pixel or two of rounding is no overlap)
          const side = Math.max(40, Math.min(room, Math.floor((stage.clientWidth - 3 * 8) / 4)));
          stage.style.height = side + 'px';
          stage.style.setProperty('--fx', side + 'px');
          stage.style.gridTemplateColumns = `repeat(4, ${side}px)`;
          stage.style.gridTemplateRows = `${side}px`;
        };
      fit();
      addEventListener('resize', fit, {signal: sig});
      // As Find the X: the photos are the choices, so a pair is taken only once all four are in. The tiles matched stay
      // closed whatever a late load does (qAnswers opens every [data-c]): a click on one is ignored (take).
      const gate = () => qAnswers(q, inn.size === ims.length && !q.classList.contains('qnone'));
      ims.forEach(im => im.addEventListener('load', () => (inn.add(im), gate())));
      gate();
      // What is marked while a pair waits or has just been tried: the tile and the name taken (ringed), a wrong pair's cross.
      const clear = () => {
        tiles.forEach((f, k) => {
          f.classList.remove('fsel', 'fko');
          if (!got.has(k)) f.querySelectorAll('figcaption').forEach(c => c.remove());
        });
        btns.forEach(b => b.classList.remove('sel', 'ko'));
      };
      const show = () => {
        tiles.forEach((f, k) => f.classList.toggle('fsel', want.t === k && !got.has(k)));
        btns.forEach(b => b.classList.toggle('sel', want.n === b.dataset.n && !b.classList.contains('ok')));
      };
      const pair = (k, n) => {
        const good = of[k] === n,
          f = tiles[k],
          b = btns.find(x => x.dataset.n === n),
          // The decisive line (rule C3, quiz.js fbLine): a pair that is right, the line telling the unit from a look-alike
          // among the names, else its first ID tip with its source; a pair that is wrong, the name's own first ID tip, so
          // the player can look for it in the photos (the line of a miss would say what the photo is, and there is a retry).
          line = fbLine(n, n, true, good ? R.names : [], null);
        want.t = want.n = null;
        clear();
        if (good) {
          got.add(k);
          b.disabled = true;
          b.classList.add('ok', 'cheer');
          f.classList.add('fok');
          // The tile says its unit and its source (rule P5: only now); it opens the photo whole, named.
          f.insertAdjacentHTML(
            'beforeend',
            `<figcaption><span aria-hidden="true">✓</span> ${uname(n)}</figcaption><button type="button" class="zoom" data-fz="${k}" aria-label="Enlarge ${esc(unameT(n))}">${ZOOMI}</button>${photoSrc(R.ph[k])}`
          );
        } else {
          f.classList.add('fko');
          b.classList.add('ko');
          f.insertAdjacentHTML('beforeend', `<figcaption><span aria-hidden="true">✗</span> not ${uname(n)}</figcaption>`);
        }
        if (got.size === 4) return over(line);
        st.innerHTML = `<div class="fb fbs"><h3 class="${good ? 'ok cheer' : 'ko'}"><span class="v">${good ? '✓ Yes,' : '✗ No,'}</span> ${good ? uname(n) : `not ${uname(n)}: try another name`}</h3>${line}</div>`;
        fit();
      };
      // The round is over: the quiz's own short sheet (lab.js labSheet), the last pair's line, the ID tips of the four and the
      // credits behind More, the report button for the set.
      const over = line => {
        st.innerHTML = '';
        qAnswers(q, false);
        labSheet(q, {
          good: true,
          head: 'all four matched',
          line,
          more: labTips(of),
          photos: R.ph,
          rep: {g: of[0], a: '', ph: R.ph.map(p => p.f).filter(Boolean), m: 'matrixgame'},
          next: draw,
          fit
        });
      };
      // Photo then name, or name then photo: whichever comes second completes the pair.
      const take = (k, n) => {
        if (q.classList.contains('done')) return;
        if (k !== undefined && got.has(k)) return;
        if (k !== undefined && inn.size !== ims.length) return;
        const marked = !!q.querySelector('.fko, .ans .ko');
        if (marked) {
          clear();
          st.innerHTML = '';
        }
        if (k !== undefined) want.t = want.t === k ? null : k;
        if (n !== undefined) want.n = want.n === n ? null : n;
        if (want.t !== null && want.n !== null) return pair(want.t, want.n);
        show();
        fit();
      };
      tiles.forEach((f, k) => (f.querySelector('[data-c]').onclick = () => take(k)));
      btns.forEach(b => (b.onclick = () => take(undefined, b.dataset.n)));
      stage.addEventListener('click', e => {
        const z = e.target.closest('[data-fz]');
        if (z)
          zoom(
            R.ph.map((p, i) => ({...p, genus: of[i]})).filter((_, i) => got.has(i)),
            [...got].sort((a, b) => a - b).indexOf(Number(z.dataset.fz))
          );
      });
      document.addEventListener(
        'keydown',
        e => {
          if (!document.body.contains(q)) return;
          if (!lb.hidden || e.target.closest('input, textarea, select') || document.getElementById('tour')) return;
          if (e.ctrlKey || e.metaKey || e.altKey) return;
          const t = q.querySelectorAll('[data-c]')[Number(e.key) - 1],
            n = btns['abcde'.indexOf(e.key.toLowerCase())];
          if (q.classList.contains('done')) return;
          if (t && /^[1-4]$/.test(e.key) && !t.disabled) {
            e.preventDefault();
            take(Number(e.key) - 1);
          } else if (n && e.key.length === 1 && !n.disabled) {
            e.preventDefault();
            take(undefined, n.dataset.n);
          }
        },
        {signal: sig}
      );
    };
    draw();
  }
});
