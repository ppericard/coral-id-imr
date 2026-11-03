// Fish "My progress": three design options for a synthetic page (Pierre, 2026-11-03: "so many species that we can't show
// the progress of every species"; first the IMR families, then a summary of the species, readable at every stage).
// A static mock-up for Pierre to compare, not wired to the game: made-up progress over the real fish.json names
// (docs/FISH_PATH.md: the 27 IMR families, species open at Advanced 80%, common then Latin names, the IMR prompt).
// Routes: #lab-fishprog|<option A/B/C>|<stage a/b/c>|<teaching id: the family's species, drilled down>.
//   a = a new player on the families only; b = mid, 5 families past 80% and about 40 species met;
//   c = an IMR Research Assistant who took the IMR prompt (everything open), about 150 species met.
// The family's % never includes its species (the two counters beside it are kept apart, Pierre 2026-11-03).
// Shown in the Tools hub to the admin only (lab.js `admin`): a design question for Pierre, not a tool for players.
LAB.add({
  id: 'fishprog',
  admin: true,
  icon: '%',
  title: 'Fish progress: three designs',
  blurb: 'Design mock-up: the fish My progress page, from the 27 IMR families to hundreds of species, in three layouts and three stages.',
  lede: 'A mock-up on made-up progress, to compare three layouts of the fish My progress page. <b>A, Slate rows</b>: the 27 IMR families in slate order, each with its bar and two species counters (named, in Latin). <b>B, Dashboard</b>: a compact grid of the families, the species as totals, and short lists of what to do next. <b>C, Mosaic</b>: every species as a small square inside its family, so the whole collection fits one screen. Stages: <b>New</b> (families only), <b>Mid</b> (5 families past 80%, about 40 species met), <b>IMR RA</b> (everything opened by the IMR prompt, about 150 species met). Tap a family to see its species, weakest and latest first. A family counts its own questions only: its species never lower its %. A species is <b>named</b> from Advanced (80%), <b>in Latin</b> once its all-Latin exam is passed (Instructor); its name moves from common + Latin to Latin first, then Latin only, as it progresses.',
  render(root, opt = 'A', stage = 'a', open = '') {
    opt = 'ABC'.includes(opt) && opt ? opt : 'A';
    stage = 'abc'.includes(stage) && stage ? stage : 'a';
    let F = null,
      S = null,
      dead = false;
    const go = (o, s) => (location.hash = '#lab-fishprog|' + o + '|' + s);
    const keep = id => history.replaceState(null, '', '#lab-fishprog|' + opt + '|' + stage + (id ? '|' + id : ''));
    root.innerHTML = '<p class="note">Loading the fish…</p>';
    const onKey = e => {
      if (e.key === 'Escape' && root.querySelector('.fpdrill')) closeDrill();
    };
    const onResize = () => {
      if (S && opt === 'C') mosaicLayout();
    };
    // Home is a Lab-friendly page (lab.js does not stop the Lab there): the sheet must still go.
    const onHash = () => location.hash.startsWith('#lab-fishprog') || closeDrill(true);
    addEventListener('hashchange', onHash);
    addEventListener('keydown', onKey);
    addEventListener('resize', onResize);
    json('fish.json?v=1').then(f => {
      if (dead || !f || !f.teach) return;
      F = f;
      S = fpState(f, stage);
      draw();
      if (open && S.E.some(e => e.id === open)) drill(open);
    });

    /* ---------- the page ---------- */
    function draw() {
      const bar = `<div class="fpbar"><div class="seg" role="group" aria-label="Option">${[
        ['A', 'Slate rows'],
        ['B', 'Dashboard'],
        ['C', 'Mosaic']
      ]
        .map(([k, t]) => `<button type="button" data-o="${k}" aria-pressed="${k === opt}" title="${t}">${k}<span> · ${t}</span></button>`)
        .join('')}</div><div class="seg" role="group" aria-label="Stage">${[
        ['a', 'New'],
        ['b', 'Mid'],
        ['c', 'IMR RA']
      ]
        .map(([k, t]) => `<button type="button" data-s="${k}" aria-pressed="${k === stage}">${t}</button>`)
        .join('')}</div></div>`;
      root.innerHTML = bar + `<div class="fp fp${opt}">${opt === 'A' ? viewA() : opt === 'B' ? viewB() : viewC()}</div>`;
      root.querySelectorAll('[data-o]').forEach(b => (b.onclick = () => go(b.dataset.o, stage)));
      root.querySelectorAll('[data-s]').forEach(b => (b.onclick = () => go(opt, b.dataset.s)));
      root.querySelectorAll('[data-e]').forEach(b => (b.onclick = () => drill(b.dataset.e)));
      root
        .querySelectorAll('[data-imr]')
        .forEach(b => (b.onclick = () => appToast('Mock-up: in the app this opens every IMR family and every species at once.', 4000)));
      if (opt === 'C') mosaicLayout();
    }

    /* ---------- shared pieces ---------- */
    const pc = p => Math.round(100 * p);
    // A family's name with soft hyphens where a narrow tile may break it: before "fish" ("Butterfly-fish"), and in another
    // long word before a consonant between two vowels near its middle ("Moo-rish"); never anywhere else.
    const V = c => /[aeiouy]/i.test(c || '');
    const cut = w => {
      const m = Math.round(w.length / 2);
      for (const i of [m, m - 1, m + 1, m - 2, m + 2])
        if (i >= 3 && i <= w.length - 3 && !V(w[i]) && V(w[i - 1]) && V(w[i + 1])) return w.slice(0, i) + '\u00ad' + w.slice(i);
      return w;
    };
    const shy = n =>
      esc(n)
        .replace(/\b[a-z]{7,}\b/gi, w => (/(fish|perch|lips)$/i.test(w) ? w : cut(w)))
        .replace(/(\w{4,})(fish|perch|lips)\b/gi, '$1\u00ad$2');
    // The overall ring, like the corals' card: the families' steps on the colour scale.
    const ring = () => {
      let deg = 0;
      return [5, 4, 3, 2, 1, 0]
        .map(k => {
          const d = (360 * S.eSteps[k]) / S.E.length,
            c = `${k ? `var(--lv${k})` : 'var(--line)'} ${deg}deg ${deg + d}deg`;
          deg += d;
          return c;
        })
        .join(',');
    };
    const ringHtml = () => `<div class="pring fpring" style="background:conic-gradient(${ring()})"><span><b>${S.pct}%</b></span></div>`;
    // "3 Divemaster · 5 Advanced": the two highest steps reached, as on the corals' card.
    const lvLine = st =>
      [5, 4, 3, 2, 1]
        .map(k => [k, st[k]])
        .filter(([, c]) => c)
        .slice(0, 2)
        .map(([k, c]) => `<span>${lvIcon(k)}${c} ${MASTERY[k][0]}</span>`)
        .join('');
    // The species in one line (the summary Pierre asked for), or, before any opens, what opens them.
    const spLine = () => {
      const c = S.sp;
      if (!c.open) {
        const e = S.closest[0];
        return `Species open at <b>80%</b> on a family${e ? `: <b>${esc(e.name)}</b> is closest, ${pc(e.p)}%` : ''}.`;
      }
      if (!c.met) return `<b>${c.open}</b> species open: they come one at a time in the quiz.`;
      return `You name <b>${c.known}</b> of the <b>${c.met}</b> species you've met${c.latin ? `; <b>${c.latin}</b> in Latin` : ''}.`;
    };
    // The species of a list as one stacked bar, from Latin to not open (the families' colour scale).
    const SEG = [
      ['latin', 'In Latin', 's5'],
      ['named', 'Named, not in Latin yet', 's3'],
      ['learning', 'Learning', 's1'],
      ['waiting', 'Open, not met', 'fpw'],
      ['locked', 'Not open', 'fpl']
    ];
    const spBar = (c, legend) => {
      const tot = c.total || 1;
      return `<div class="fpsbar" role="img" aria-label="${SEG.map(([k, t]) => `${t}: ${c[k]}`).join(', ')}">${SEG.filter(([k]) => c[k])
        .map(([k, t, cl]) => `<span class="${cl}" style="flex-grow:${c[k] / tot}" title="${t}: ${c[k]}"></span>`)
        .join('')}</div>${
        legend
          ? `<p class="fpleg">${SEG.filter(([k]) => c[k] || k === 'named')
              .map(([k, t, cl]) => `<span><i class="${cl}"></i>${t} <b>${c[k]}</b></span>`)
              .join('')}</p>`
          : ''
      }`;
    };
    const lvStrip = () =>
      `<div class="plvl fplvl" role="list" aria-label="Families by level">${MASTERY.map(
        ([t], k) =>
          `<span role="listitem" class="s${k}" title="${t}: ${S.eSteps[k]} families">${lvIcon(k)}<b>${S.eSteps[k]}</b><small>${t}</small></span>`
      ).join('')}</div>`;
    const badge = cls =>
      `<div class="pbadge fpbadge ${cls || ''}">${ringHtml()}<div class="pbtxt"><b>Fish families</b><span>${lvLine(S.eSteps) || `${S.E.filter(e => e.st).length}/${S.E.length} met`}</span><p class="fpspl">${spLine()}</p></div></div>`;
    // The IMR prompt (FISH_PATH "The IMR prompt"), while families or species are still unopened.
    const imrBox = () =>
      stage === 'c'
        ? ''
        : `<div class="popen fpimr"><p><b>Are you at IMR / following the Research Assistant programme?</b> Open every family and species at once.</p><button type="button" class="next sec" data-imr>Yes, open all</button></div>`;
    // A family as a chip that opens its species.
    const eChip = (e, extra = '') =>
      `<button type="button" class="chip fpchip s${e.st}${e.weak ? ' weak' : ''}" data-e="${e.id}">${esc(e.name)}${extra}</button>`;
    const spChip = s => {
      const e = S.byId[s.e];
      return `<button type="button" class="chip fpchip fpsc s${s.st}${s.weak ? ' weak' : ''}" data-e="${e.id}" title="${esc(s.name)} (${esc(s.common || '')}), ${esc(e.name)}">${spName(s, true)}</button>`;
    };
    // The short lists: review first, almost there (closest to their next step), just met. Stage-aware: before any species
    // opens they are about families; then the species take over. teaser: the page already shows the families closest to
    // 80% (B), so that list is left out, and on phones "Just met" too (one screen).
    function lists(max = 4, teaser) {
      const rev = [...S.E.filter(e => e.weak).map(e => eChip(e)), ...S.S.filter(s => s.weak).map(spChip)].slice(0, max);
      const near = S.sp.met
        ? S.S.filter(s => s.met && s.st && s.st < 5)
            .sort((a, b) => gap(a) - gap(b))
            .slice(0, max)
            .map(s => spChip(s))
        : S.closest.slice(0, max).map(e => eChip(e, ` <small>${pc(e.p)}% → 80%</small>`));
      const recent = S.sp.met
        ? S.S.filter(s => s.met)
            .sort((a, b) => a.last - b.last)
            .slice(0, max)
            .map(spChip)
        : [];
      const box = (t, items, note) =>
        items.length || note
          ? `<div class="fplist"><h3 class="label">${t}</h3><p class="chips">${items.join('') || `<small class="fpnone">${note}</small>`}</p></div>`
          : '';
      return (
        box('Review first', rev, S.sp.met || S.E.some(e => e.st) ? 'Nothing to review' : '') +
        (teaser && !S.sp.met ? '' : box(S.sp.met ? 'Almost there' : 'Closest to their species', near)) +
        (teaser && isPhone() ? '' : box('Just met', recent))
      );
    }
    // How far a species is from its next step (named at 80%, the Latin exam at 95%).
    const gap = s => (s.p < 0.8 ? 0.8 - s.p : s.p < 0.95 ? 0.95 - s.p : 0.01);
    // A species name as the player sees it at its stage (FISH_PATH: common + Latin, then Latin first, then Latin only).
    function spName(s, short) {
      if (!s.met || s.p < 0.5) return short ? esc(s.common || s.name) : `<b>${esc(s.common || s.name)}</b><i>${esc(s.name)}</i>`;
      if (s.p < 0.8 && !s.mx) return short ? `<i>${esc(s.name)}</i>` : `<i>${esc(s.name)}</i><small>${esc(s.common || '')}</small>`;
      return `<i>${esc(s.name)}</i>`;
    }
    // A family's two counters (Pierre agreed in principle, 2026-11-03): species named, in Latin; or how many wait.
    const counters = (e, long) => {
      const c = e.c;
      if (!c.open) return `<span class="fpcnt fpoff">${c.total} species${long ? ', open at 80%' : ''}</span>`;
      return `<span class="fpcnt"><b>${c.known}</b>${long ? ' named' : ''}<span class="fpsep">·</span><b>${c.latin}</b>${long ? ' in Latin' : ''}<small>${long ? ' of ' : '/'}${c.total}</small></span>`;
    };
    // Instructor (its exam passed): a tick after the name, as on the corals' slate.
    const tick = e => (e.st === 5 ? ' ✓' : '');
    const miniRing = e => (e.st > 0 && e.st < 5 ? `<small class="pct" style="--p:${pc(e.p)}%">${pc(e.p)}%</small>` : '');

    /* ---------- A: slate rows ---------- */
    // The coral Slate, one row per family in IMR order (two columns), its bar coloured by its level, and beside it the
    // species: a thin bar of its species' levels and the two counters. The side column: the card, the families' levels,
    // the species as one bar, the short lists.
    function viewA() {
      const half = Math.ceil(S.E.length / 2);
      const row = e =>
        `<button type="button" class="fparow s${e.st}${e.weak ? ' weak' : ''}" data-e="${e.id}" title="${esc(e.name)}: ${e.st ? MASTERY[e.st][0] + ', ' + pc(e.p) + '%' : 'not seen'}"><span class="fpaname"><span>${shy(e.name)}${tick(e)}</span>${miniRing(e)}</span><span class="fpasp">${e.c.open ? spBar(e.c) : ''}${counters(e, !isPhone())}</span></button>`;
      return `${badge()}<div class="fpmain"><div class="fparows" style="--rows:${half}">${S.E.map(row).join('')}</div>
      ${S.sp.open ? `<p class="fpkey">${isPhone() ? 'Under' : 'Beside'} each family, its species: <b>named</b> · <b>in Latin</b> ${isPhone() ? '/' : 'of'} all</p>` : `<p class="fpkey">Under each family, its number of species: they open at 80% on the family.</p>`}</div>
      <aside class="fpside">${lvStrip()}${S.sp.open ? `<div class="fpspec"><h3 class="label">Species</h3>${spBar(S.sp, true)}</div>` : ''}${imrBox()}${lists(3)}</aside>`;
    }

    /* ---------- B: dashboard ---------- */
    // Numbers and short lists first; the families as a compact heat grid (colour = level, a thin line = its species named).
    function viewB() {
      const cell = e =>
        `<button type="button" class="fpcell ps s${e.st}${e.weak ? ' weak' : ''}" data-e="${e.id}" title="${esc(e.name)}: ${e.st ? MASTERY[e.st][0] + ', ' + pc(e.p) + '%' : 'not seen'}; species ${e.c.open ? `${e.c.known} named, ${e.c.latin} in Latin, of ${e.c.total}` : `open at 80% (${e.c.total})`}"><i>${shy(e.name)}${tick(e)}</i>${miniRing(e)}${e.c.open ? `<span class="fpcf" style="--f:${(100 * e.c.known) / e.c.total}%"></span>` : ''}</button>`;
      const c = S.sp;
      const nums = c.open
        ? `<div class="fpnums"><span><b>${c.met}</b><small>met</small></span><span><b>${c.known}</b><small>named</small></span><span><b>${c.latin}</b><small>in Latin</small></span><span class="fpof"><b>${c.total}</b><small>species</small></span></div>${spBar(c)}`
        : `<div class="fpteaser">${S.closest
            .slice(0, 3)
            .map(
              e =>
                `<button type="button" class="fpto" data-e="${e.id}"><span>${esc(e.name)} <small>${e.c.total} species</small></span><span class="fptobar"><span class="s${e.st}" style="width:${(100 * e.p) / 0.8}%"></span></span><small>${pc(e.p)}%</small></button>`
            )
            .join('')}</div>`;
      return `<section class="fptop">${badge('fpbadgeB')}<div class="fpspec"><h3 class="label">${c.open ? 'Species' : 'Species open at 80% on a family'}</h3>${nums}</div></section>
      <section class="fpgrid" aria-label="The 27 IMR families">${S.E.map(cell).join('')}</section>
      <section class="fplists">${lists(isPhone() ? 2 : 4, true)}</section>${imrBox()}`;
    }

    /* ---------- C: mosaic ---------- */
    // Every species of the 27 families as a small square inside its family's block, the block's area following its number
    // of species (a squarified treemap): the collection at a glance, Wrasse big, Moorish Idol small. Before a family's
    // species open, its block is filled with the family's level colour; then its band keeps the level, its squares the
    // species' levels.
    function viewC() {
      return `${badge()}<div class="fpmain"><div class="fpmos" aria-label="Every species, by family"></div>
      <p class="fpleg fpmleg">${S.sp.open ? SEG.map(([k, t, cl]) => `<span><i class="${cl}"></i>${t}</span>`).join('') : '<span>One square per species. A family is coloured by its level; its species open at 80% on it.</span>'}</p></div>
      <aside class="fpside">${isPhone() ? '' : lvStrip()}${imrBox()}${lists(3)}</aside>`;
    }
    function mosaicLayout() {
      const box = root.querySelector('.fpmos');
      if (!box) return;
      const top = box.getBoundingClientRect().top + scrollY,
        tb = typeof tabH === 'function' ? tabH() : 0,
        leg = (root.querySelector('.fpmleg') || {}).offsetHeight || 0;
      const W = box.clientWidth,
        H = Math.max(isPhone() ? 380 : 420, innerHeight - top - tb - leg - 24);
      box.style.height = H + 'px';
      // A block's weight: its species, plus room for its name (more on phones, where names wrap).
      const extra = isPhone() ? 10 : 6;
      const items = S.E.map(e => ({e, w: e.c.total + extra})).sort((a, b) => b.w - a.w);
      const R = fpSquarify(items, 0, 0, W, H).map(r => {
        // The name and % on one line, or the name alone on two when the block is narrow (about 7 px a letter at 12 px).
        const two = r.e.name.length * 7 + 12 + (r.e.st ? 34 : 0) > r.w;
        return {...r, lab: two ? 36 : 20};
      });
      // One square size for every family (a species takes the same room everywhere): the largest that fits each block.
      const fits = (r, t) => Math.floor((r.w - 6) / t) * Math.floor((r.h - r.lab - 4) / t) >= r.e.c.total;
      let t = 26;
      while (t > 5 && !R.every(r => fits(r, t))) t--;
      box.innerHTML = R.map(({e, x, y, w, h, lab}) => {
        const c = e.c,
          n = c.total,
          sq = e.sp.map(sp => `<i class="${sp.met ? 's' + sp.st : sp.open ? 'fpw' : 'fpl'}${sp.weak ? ' weak' : ''}"></i>`).join('');
        return `<button type="button" class="fpblk s${e.st}${c.open ? ' on' : ''}${e.weak ? ' weak' : ''}${lab > 20 ? ' two' : ''}" data-e="${e.id}" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;--sq:${t - (t < 8 ? 1 : 2)}px;--gap:${t < 8 ? 1 : 2}px" title="${esc(e.name)}: ${e.st ? MASTERY[e.st][0] + ', ' + pc(e.p) + '%' : 'not seen'}; ${c.open ? `${c.known} named, ${c.latin} in Latin, ${c.met} met of ${n} species` : `${n} species, open at 80%`}"><span class="fpbl"><b>${shy(e.name)}${tick(e)}</b>${e.st && lab < 21 ? `<small>${pc(e.p)}%</small>` : ''}</span><span class="fpsq">${sq}</span></button>`;
      }).join('');
      box.querySelectorAll('[data-e]').forEach(b => (b.onclick = () => drill(b.dataset.e)));
    }

    /* ---------- drill-down: a family's species ---------- */
    // One panel per family: its level and counters, then its species, review first, then the latest met, then the rest
    // by progress; species not met yet and not open yet are counted, never listed one by one (only the next few to come).
    function drill(id) {
      const e = S.byId[id];
      if (!e) return;
      closeDrill(true);
      keep(id);
      const c = e.c;
      const row = s =>
        `<li class="fpsrow${s.weak ? ' weak' : ''}"><span class="fpsl s${s.st}">${lvIcon(s.st) || ''}</span><span class="fpsn">${spName(s)}</span><span class="fpsp">${s.mx ? 'Latin ✓' : s.st ? pc(s.p) + '%' : ''}</span></li>`;
      const met = e.sp.filter(s => s.met),
        rev = met.filter(s => s.weak),
        recent = met
          .filter(s => !s.weak)
          .sort((a, b) => a.last - b.last)
          .slice(0, 3),
        rest = met.filter(s => !s.weak && !recent.includes(s)).sort((a, b) => a.p - b.p),
        waiting = e.sp.filter(s => s.open && !s.met),
        locked = e.sp.filter(s => !s.open);
      const part = (t, L) => (L.length ? `<h4>${t}</h4><ul>${L.map(row).join('')}</ul>` : '');
      const next = (c.open ? waiting : locked).slice(0, 3);
      const sub = S.subs[id] || [];
      const d = document.createElement('div');
      d.className = 'fpdrill';
      d.innerHTML = `<div class="fpdcard" role="dialog" aria-modal="true" tabindex="-1" aria-label="${esc(e.name)}: species">
        <div class="fpdhead"><div class="pring fpring sm s${e.st}" style="background:conic-gradient(var(--lv${e.st || 1}) ${pc(e.p)}%, var(--line) 0)"><span><b>${e.st === 5 ? '✓' : pc(e.p) + '%'}</b></span></div>
        <div><b class="fpdt">${esc(e.name)}</b><small>${e.st ? lvIcon(e.st) + MASTERY[e.st][0] : 'Not seen'}${e.weak ? ' · <span class="fpbad">to review</span>' : ''} · ${c.total} species</small></div>
        <button type="button" class="fpx" aria-label="Close">✕</button></div>
        ${
          c.open
            ? `<p class="fpdsum"><b>${c.known}</b> named · <b>${c.latin}</b> in Latin · <b>${c.met}</b> met${c.waiting ? ` · ${c.waiting} open, not met yet` : ''}${c.locked ? ` · ${c.locked} not open yet` : ''}</p>${spBar(c)}`
            : `<p class="fpdsum">Its species open at <b>80%</b> (Advanced)${e.st ? `, it is at <b>${pc(e.p)}%</b>` : ''}: then they come one at a time, the most seen at IMR first.</p><div class="fptobar big"><span class="s${e.st || 1}" style="width:${Math.min(100, (100 * e.p) / 0.8)}%"></span></div>`
        }
        ${sub.length ? `<p class="fpsub">IMR sub-entries: ${sub.map(x => `<span class="chip fpchip s${x.st}">${esc(x.name)}${x.st < 5 ? ` <small>${pc(x.p)}%</small>` : ' ✓'}</span>`).join('')}</p>` : ''}
        <div class="fpdlist">${part('Review first', rev)}${part('Just met', recent)}${part('The others, weakest first', rest.slice(0, 6))}${rest.length > 6 ? `<details class="fpall"><summary>The other ${rest.length - 6} met</summary><ul>${rest.slice(6).map(row).join('')}</ul></details>` : ''}
        ${next.length ? `<h4>${c.open ? 'Next to come' : 'First to come'}</h4><ul class="fpnext">${next.map(row).join('')}</ul>` : ''}
        ${c.open && locked.length ? `<p class="fpmore">${locked.length} more not open yet: they open one at a time as you play.</p>` : ''}</div></div>`;
      document.body.append(d);
      const x = d.querySelector('.fpx');
      x.onclick = () => closeDrill();
      d.onclick = ev => ev.target === d && closeDrill();
      d.querySelector('.fpdcard').focus();
    }
    function closeDrill(silent) {
      document.querySelectorAll('.fpdrill').forEach(d => d.remove());
      if (!silent) keep('');
    }
    return () => {
      dead = true;
      removeEventListener('keydown', onKey);
      removeEventListener('hashchange', onHash);
      removeEventListener('resize', onResize);
      closeDrill(true);
    };
  }
});

// Squarified treemap (Bruls, Huizing & van Wijk 2000): items [{w}] sorted by weight, largest first, laid out in the
// rectangle x, y, W, H with rows of near-square cells. Returns the items with x, y, w, h (px, rounded).
function fpSquarify(items, x, y, W, H) {
  const out = [],
    total = items.reduce((t, i) => t + i.w, 0),
    scale = (W * H) / total;
  let L = items.map(i => ({...i, a: i.w * scale}));
  const worst = (row, side) => {
    const s = row.reduce((t, r) => t + r.a, 0),
      mx = Math.max(...row.map(r => r.a)),
      mn = Math.min(...row.map(r => r.a));
    return Math.max((side * side * mx) / (s * s), (s * s) / (side * side * mn));
  };
  while (L.length) {
    const side = Math.min(W, H);
    let row = [L[0]],
      i = 1;
    while (i < L.length && worst([...row, L[i]], side) <= worst(row, side)) row.push(L[i++]);
    L = L.slice(i);
    const s = row.reduce((t, r) => t + r.a, 0),
      thick = s / side;
    let off = 0;
    row.forEach(r => {
      const len = r.a / thick;
      if (W >= H) out.push({...r, x: x, y: y + off, w: thick, h: len});
      else out.push({...r, x: x + off, y: y, w: len, h: thick});
      off += len;
    });
    if (W >= H) {
      x += thick;
      W -= thick;
    } else {
      y += thick;
      H -= thick;
    }
  }
  // Whole pixels with a 3 px gutter between blocks.
  return out.map(r => ({
    ...r,
    x: Math.round(r.x),
    y: Math.round(r.y),
    w: Math.max(0, Math.round(r.x + r.w) - Math.round(r.x) - 3),
    h: Math.max(0, Math.round(r.y + r.h) - Math.round(r.y) - 3)
  }));
}

// The made-up progress of each stage, over the real fish.json circle-1 families and species (their order: IMR's, then
// the most seen first, fish.json "r"). Deterministic (a seeded random), so the same link always shows the same page.
function fpState(F, stage) {
  let seed = {a: 11, b: 23, c: 37}[stage];
  const rnd = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const SP = new Map(F.species.map(s => [s.id, s]));
  const T = F.teach.filter(t => t.circle === 1 && t.level === 1);
  // Families: % reached (1 = Instructor, its exam passed), and those to review.
  const P = {
    a: {t01: 0.72, t05: 0.64, t02: 0.55, t06: 0.46, t09: 0.38, t03: 0.3, t08: 0.22, t10: 0.18, t24: 0.12},
    b: {
      t01: 0.91,
      t02: 0.86,
      t05: 0.97,
      t09: 0.83,
      t06: 0.88,
      t03: 0.74,
      t04: 0.66,
      t07: 0.58,
      t08: 0.62,
      t10: 0.55,
      t11: 0.41,
      t12: 0.35,
      t13: 0.52,
      t14: 0.47,
      t15: 0.44,
      t16: 0.69,
      t17: 0.71,
      t18: 0.5,
      t19: 0.38,
      t20: 0.6,
      t21: 0.3,
      t22: 0.77,
      t23: 0.25,
      t24: 0.45,
      t25: 0.2
    },
    c: {
      t01: 1,
      t02: 1,
      t03: 0.97,
      t04: 0.9,
      t05: 1,
      t06: 1,
      t07: 0.96,
      t08: 0.86,
      t09: 0.96,
      t10: 0.92,
      t11: 0.84,
      t12: 0.81,
      t13: 0.62,
      t14: 0.88,
      t15: 0.97,
      t16: 1,
      t17: 1,
      t18: 0.9,
      t19: 0.83,
      t20: 1,
      t21: 0.74,
      t22: 1,
      t23: 0.71,
      t24: 0.86,
      t25: 0.66,
      t26: 0.97,
      t27: 0.58
    }
  }[stage];
  const WEAK = {a: ['t08'], b: ['t08', 't19'], c: ['t13']}[stage];
  // Species met per family (stage b: the 5 families past 80%); stage c: everything open, about 150 met.
  const MET = {a: {}, b: {t01: 14, t02: 10, t05: 1, t09: 9, t06: 6}}[stage];
  const allOpen = stage === 'c';
  const step = (p, mx) => (mx ? 5 : p <= 0 ? 0 : p < 0.5 ? 1 : p < 0.8 ? 2 : p < 0.95 ? 3 : 4);
  const E = T.map(t => {
    const p = P[t.id] || 0,
      mx = p >= 1,
      ids = t.species || [],
      open = allOpen || p >= 0.8,
      n = ids.length;
    const nMet = allOpen ? Math.min(n, Math.round(n * (0.12 + 0.42 * p * p)) + (n <= 4 ? 1 : 0)) : (MET || {})[t.id] || 0;
    const sp = ids.map((id, i) => {
      const s = SP.get(id) || {name: id};
      const met = i < nMet,
        x = nMet > 1 ? i / (nMet - 1) : 0;
      let q = met ? (allOpen ? 1.04 - 0.85 * Math.pow(x, 1.5) : 1.0 - 0.07 * i) + (rnd() - 0.5) * 0.14 : 0;
      q = Math.max(met ? 0.08 : 0, Math.min(0.99, q));
      const sx = met && q >= 0.95 && rnd() < 0.75;
      return {
        id,
        e: t.id,
        name: s.name,
        common: s.common,
        met,
        open: open && (allOpen || i <= nMet),
        p: sx ? 1 : q,
        mx: sx,
        st: met ? step(q, sx) : 0,
        weak: false,
        last: met ? (1 - q) * -1 + rnd() * 0.6 : 99
      };
    });
    return {id: t.id, name: t.name, p: mx ? 1 : p, st: step(p, mx), weak: WEAK.includes(t.id), sp, subs: t.sub || []};
  });
  const S = E.flatMap(e => e.sp);
  // A few species to review, among those met and not named yet.
  const cand = S.filter(s => s.met && s.p < 0.8);
  for (let k = 0; k < {a: 0, b: 2, c: 7}[stage] && cand.length; k++) cand.splice(Math.floor(rnd() * cand.length), 1)[0].weak = true;
  const count = L => {
    const c = {total: L.length, open: 0, met: 0, named: 0, latin: 0, learning: 0, waiting: 0, locked: 0, review: 0};
    L.forEach(s => {
      if (!s.open) c.locked++;
      else c.open++;
      if (s.met) c.met++;
      if (s.mx) c.latin++;
      else if (s.met && s.p >= 0.8) c.named++;
      else if (s.met) c.learning++;
      else if (s.open) c.waiting++;
      if (s.weak) c.review++;
    });
    // Named = from Advanced up, Latin included (the counters and the summary); the bar splits the two.
    c.known = c.named + c.latin;
    return c;
  };
  E.forEach(e => (e.c = count(e.sp)));
  const sp = count(S);
  const eSteps = [0, 1, 2, 3, 4, 5].map(k => E.filter(e => e.st === k).length);
  // IMR sub-entries, once on (the IMR prompt opens them: stage c only here).
  const subs = {};
  if (allOpen) E.forEach(e => (subs[e.id] = e.subs.map(x => ({name: x.name, p: (x.p = 0.55 + rnd() * 0.45), st: step(x.p, x.p > 0.97)}))));
  const out = {
    E,
    S,
    byId: Object.fromEntries(E.map(e => [e.id, e])),
    sp,
    eSteps,
    subs,
    pct: Math.round((100 * E.reduce((t, e) => t + e.p, 0)) / E.length),
    // The families closest to opening their species (under 80%, the closest first).
    closest: E.filter(e => e.st && e.p < 0.8).sort((a, b) => b.p - a.p)
  };
  return out;
}
