// Down the tree: one photo, answered rank by rank, from the broadest to the finest name the player has met (the fish: family,
// then genus, then species), each step a partial credit. Untimed, nothing saved, logged or recorded (the Tools, rule U13: it
// graduates only with Pierre's OK; ROADMAP "Down the tree": its scoring, the sheet's replay and the global score's
// components come with it). It runs on the subject on screen (rule S1) with no subject named: a unit's place in the tree is
// its record's own (`parent`, `rank`: app.js treeGenera, the species units of core.js treeSpUnits), so the game is offered
// to a subject whose units have a finer unit under them (the fish: a genus under a family, a species under a genus; the sea
// slugs: a species under a genus) and to none other (the corals: no rank below the genus, `on` below).
// Rule L4: a step is asked only on a unit the player has unlocked (model.js unlocked), so the walk stops at the finest rank
// met; the wrong names of a step may name any unit of that rank, as the quiz's do. The photos are the draw's own (lab.js
// labShots: model.js photoSet), the feedback the quiz's (quiz.js fbLine, lab.js labSheet).
// Pure drawing (tests/downtree.test.js runs it in Node on stubs): dtLineage, dtSteps and dtChoices; the page is below.

// The units a unit hangs from, from the broadest down to it: [… grandparent, parent, u]. up(o): o's parent unit or ''; has(o):
// o is a unit of the game's tree (a sea slug genus's family is only structure, not a unit: the walk starts under it).
function dtLineage(u, up, has) {
  const out = [];
  for (let o = u; o && has(o) && !out.includes(o); o = up(o)) out.unshift(o);
  return out;
}
// The steps asked: the chain's units from the top while each is unlocked (rule L4). open(o): the player has unlocked o.
function dtSteps(chain, open) {
  const n = chain.findIndex(o => !open(o));
  return n < 0 ? chain : chain.slice(0, n);
}
// The names of one step: the unit and 2 or 3 others of its rank, 4 at most, no two of one label (apart). Look-alikes of the
// unit among its siblings first, then its other unlocked siblings, then unlocked look-alikes and other unlocked units of the
// rank, then the same not unlocked (wrong choices may name any unit: model.js distractors), the last of them `more`. peers:
// the units under its parent (or of its rank, at the top); look: its declared look-alikes; open(o): unlocked; more: other
// units of its rank. Null with fewer than 3 names. The unit's place among them is random.
function dtChoices(u, peers, look, open, apart, more = [], rnd = Math.random, k = 4) {
  const shuffled = L => {
      const a = [...L];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
    sib = peers.filter(o => o !== u),
    lk = look.filter(o => o !== u),
    isLk = o => lk.includes(o),
    isSib = o => sib.includes(o),
    out = [u];
  const groups = [
    sib.filter(o => isLk(o) && open(o)),
    sib.filter(o => open(o)),
    lk.filter(o => open(o)),
    more.filter(o => open(o)),
    sib,
    lk,
    more
  ];
  for (const G of groups)
    for (const o of shuffled(G)) if (out.length < k && !out.includes(o) && out.every(t => apart(o, t) && apart(t, o))) out.push(o);
  return out.length < 3 ? null : shuffled(out);
}

LAB.add({
  id: 'downtree',
  icon: '⌥',
  title: 'Down the tree',
  blurb: 'One photo, named in steps: its family, then its genus, then its species. Each step counts; no score kept.',
  // Offered to a subject whose units have finer ones under them (a unit with a child among the units of the game), never
  // to one with a single rank (the corals): the tree is read from the records, so no subject is named here.
  on: () => typeof TREEU !== 'undefined' && !!TREEU && (TREEU.ssl || []).length > 0,
  get lede() {
    return `One photo, named step by step: the ${SUBJ.one} first, then the finer names you have met under it. Each step is a point on its own, and a wrong step does not end the walk. Untimed; nothing here counts toward your progress.`;
  },
  render(root) {
    // The photo source of the Lab's photo games (lab.js labShots), aimed as a four-choice question's.
    const {photo, seen} = labShots(12, 4, 'k4');
    const score = {ok: 0, n: 0};
    // The units of the game in play and those the player has unlocked (rule L4), the tree's children by parent.
    const world = () => {
      // (a unit of the tree is one of the game's, not any record: a sea slug genus's family is structure only)
      const play = [...new Set([...pool(), ...sciNow(), ...sciSpAll()])],
        set = new Set(play),
        open = new Set(unlocked(play)),
        kids = new Map();
      Object.values(TREEU.gen).forEach(g => {
        const k = g.parent && set.has(g.parent) ? g.parent : '';
        kids.set(k, [...(kids.get(k) || []), g.id]);
      });
      return {play, set, open, kids};
    };
    const rankKey = o => `${(GX(o) || {}).rank || ''}|${(GX(o) || {}).kind || ''}`;
    // One round: a unit the player has unlocked that has an unlocked unit above it or below it, a photo of it, and the chain
    // of the photo's own species (its scientific unit) cut at the first unit not unlocked. {p, steps: [{u, ch}]}, or {} when
    // nothing can be asked yet.
    const round = () => {
      const W = world(),
        up = o => (GX(o) || {}).parent || '',
        has = o => W.set.has(o),
        isOpen = o => W.open.has(o),
        apart = (a, b) => !choiceNames(a, b) && !choiceNames(b, a),
        // the unlocked units with a rank of their own (a genus, a species by its scientific name: the common-name species hang
        // from the family, a second tree): a family alone gives a one-step walk
        cand = [...W.open].filter(o => (GX(o) || {}).rank && (GX(o).rank !== 'species' || o === spUnitId('sci', GX(o).sp)));
      let planned = false;
      for (let i = 0, L = shuffle(cand); i < 24 && i < L.length; i++) {
        const u = L[i],
          p = photo(u, null);
        if (!p) continue;
        // the lineage of the photo's species when it has one (a genus unit's photo is of one of its species), else of the unit
        const sp = !p.gl && p.sp ? spUnitId('sci', p.sp) : '',
          viaSp = sp && has(sp) ? dtLineage(sp, up, has) : [],
          chain = viaSp.includes(u) ? viaSp : dtLineage(u, up, has),
          steps = dtSteps(chain, isOpen),
          made = [];
        for (const o of steps) {
          const par = up(o),
            peers = par && W.set.has(par) ? W.kids.get(par) || [] : W.play.filter(x => rankKey(x) === rankKey(o)),
            ch = dtChoices(
              o,
              peers.filter(x => rankKey(x) === rankKey(o)),
              (GX(o).look || []).filter(x => GX(x) && rankKey(x) === rankKey(o)),
              isOpen,
              apart,
              W.play.filter(x => rankKey(x) === rankKey(o))
            );
          if (!ch) break; // no names to set beside it: the walk stops above it
          made.push({u: o, ch});
        }
        if (made.length < 2) continue;
        planned = true;
        return {p, steps: made, planned};
      }
      return {planned};
    };
    const draw = () => {
      const R = round();
      if (!R.p) {
        root.innerHTML = `<p class="note">${
          R.planned
            ? `Not enough photos of the ${esc(SUBJ.many)} you have met for a walk down the tree yet.`
            : `This game names a photo in steps: its ${esc(SUBJ.one)}, then a finer name under it. It needs a finer name you have met, which the quiz opens as you go. Meet a few in the quiz first.`
        }</p><p><a class="next" href="${esc(hr('quiz'))}">Play the quiz</a></p>`;
        return;
      }
      seen([R.p]);
      const {p, steps} = R,
        word = o => (GX(o).one || SUBJ.one).replace(/^./, c => c.toUpperCase()),
        got = [];
      let at = 0,
        done = false;
      // The photo: nothing is named until its step is answered, the source and the enlarged view's names only at the end (rule P5).
      const fig = `<figure class="qph"${p.ar ? ` data-r="${p.ar}"` : ''}${p.imr ? ' data-imr' : ''} style="--qbg:url('${img(p, 's')}')"><button type="button" class="zoom" data-z="0" aria-label="Enlarge photo"><img src="${qsrc(p, 1)}" data-lo="${img(p, 's')}"${p.f ? ` data-f="${esc(p.f)}"` : ''} alt="${esc(SUBJ.what)} to identify">${ZOOMI}</button></figure>`;
      root.innerHTML = `<div class="q bleed dtq">
        <div class="qstage">${fig}</div>
        <aside class="qside">
          <div class="qtop"><p class="prompt" id="dtp"></p></div>
          <ol class="dtsteps" aria-label="Steps">${steps.map(s => `<li data-s="${esc(s.u)}"><b>${esc(word(s.u))}</b> <span></span></li>`).join('')}</ol>
          <div class="ans dtans" role="group" aria-label="Names"></div>
          <div id="dtst" class="dtst" role="status"></div>
          <p class="note dtscore">${score.n ? `${score.ok} of ${score.n} steps right so far` : ''}</p>
          <div id="after"></div>
        </aside></div>`;
      const q = root.querySelector('.q'),
        sig = viewKeys(),
        ans = q.querySelector('.dtans'),
        st = q.querySelector('#dtst'),
        lis = [...q.querySelectorAll('.dtsteps li')],
        fit = () => fitStage();
      fit();
      addEventListener('resize', fit, {signal: sig});
      const name = (c, i) =>
        `<button type="button" data-n="${esc(c)}"${uplain(c) ? ' class="plain"' : ''}><kbd>${i + 1}</kbd>${
          GX(c).rank === 'species' && GX(c).cn
            ? `<span class="csn">${esc(unameT(c))}<small class="cnu">${esc(GX(c).cn)}</small></span>`
            : GX(c).sci
              ? `<span class="csn">${esc(unameT(c))}<small>${esc(GX(c).sci)}</small></span>`
              : esc(unameT(c))
        }</button>`;
      const show = () => {
        const s = steps[at];
        lis[at].setAttribute('aria-current', 'step');
        q.querySelector('#dtp').textContent = `Which ${GX(s.u).one || SUBJ.one} is it?`;
        ans.innerHTML = s.ch.map(name).join('');
        ans.querySelectorAll('[data-n]').forEach(b => (b.onclick = () => take(b.dataset.n)));
        gate();
        fit();
      };
      // A photo that cannot load for good closes the question (app.js marks it .qnone, as for the quiz): no step is taken on a
      // missing photo, by tap or by key, and the next step's names stay closed.
      const gate = () => ans.querySelectorAll('[data-n]').forEach(b => (b.disabled = q.classList.contains('qnone')));
      new MutationObserver(gate).observe(q, {attributes: true, attributeFilter: ['class']});
      const take = c => {
        if (done || q.classList.contains('qnone')) return;
        const s = steps[at],
          good = c === s.u,
          li = lis[at];
        got.push({u: s.u, said: c, good});
        score.n++;
        score.ok += good ? 1 : 0;
        li.removeAttribute('aria-current');
        li.className = good ? 'ok' : 'ko';
        li.setAttribute('aria-label', `${word(s.u)}: ${good ? 'right' : 'missed'}`);
        li.querySelector('span').innerHTML =
          `<span aria-hidden="true">${good ? '✓' : '✗'}</span> ${uname(s.u)}${good ? '' : ` <small>(not ${uname(c)})</small>`}`;
        st.innerHTML = `<div class="fb fbs"><h3 class="${good ? 'ok cheer' : 'ko'}"><span class="v">${good ? '✓ Yes,' : '✗ No,'}</span> ${good ? uname(s.u) : `${uname(s.u)}, not ${uname(c)}`}</h3></div>`;
        if (++at < steps.length) return show();
        over();
      };
      // The walk is over: each step's right name under the photo, the quiz's own short sheet (lab.js labSheet) with the steps
      // right out of the steps asked, the decisive line of the first step missed (else of the last), the ID tips of the
      // units asked and the credits behind More.
      const over = () => {
        done = true;
        st.innerHTML = '';
        ans.innerHTML = '';
        const right = got.filter(x => x.good).length,
          all = right === got.length,
          miss = got.find(x => !x.good) || got[got.length - 1],
          chs = steps[got.indexOf(miss)].ch;
        q.querySelector('.qph').classList.add('qnm');
        q.querySelector('.qph').insertAdjacentHTML(
          'beforeend',
          `<figcaption>${steps.map(s => uname(s.u)).join(' › ')}</figcaption>${photoSrc(p)}`
        );
        q.querySelector('.dtscore').textContent = `${score.ok} of ${score.n} steps right so far`;
        labSheet(q, {
          good: all,
          mid: !all && right > 0,
          v: all ? '✓ Yes' : right ? 'Partly' : '✗ No',
          head: `${right} of ${got.length} steps right: ${steps.map(s => uname(s.u)).join(' › ')}`,
          line: fbLine(miss.u, miss.said, miss.good, chs),
          more: labTips(steps.map(s => s.u)),
          photos: [p],
          rep: {g: steps[0].u, a: got[0].good ? '' : got[0].said, ph: [p.f].filter(Boolean), m: 'downtree'},
          next: draw,
          fit
        });
      };
      q.querySelector('.qstage').onclick = e => {
        if (e.target.closest('[data-z]')) zoom([{...p, genus: steps[0].u}], 0, {blind: () => !done});
      };
      document.addEventListener(
        'keydown',
        e => {
          if (!document.body.contains(q)) return;
          if (!lb.hidden || e.target.closest('input, textarea, select') || document.getElementById('tour')) return;
          if (e.ctrlKey || e.metaKey || e.altKey || done) return;
          const b = ans.querySelectorAll('[data-n]')[Number(e.key) - 1];
          if (b && /^[1-4]$/.test(e.key)) {
            e.preventDefault();
            take(b.dataset.n);
          }
        },
        {signal: sig}
      );
      show();
    };
    draw();
  }
});
