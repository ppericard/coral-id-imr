// Elimination board: all 39 genera on screen; each feature you tick greys out the ones that don't fit,
// and the board suggests the most useful next thing to check.
LAB.add({
  id: 'elim', icon: '▦', title: 'Elimination board',
  blurb: 'All 39 genera on one board. Tick what you see and watch the impossible ones fade out, with a hint on what to check next.',
  lede: 'Same logic as Identify › By corallites, made visual. Several ticks in one section mean either/or; sections combine. "Mystery photo" gives you a coral to work out.',
  render(root){
    const sel = new Set(); let mystery = null;
    root.innerHTML = `<div class="elimlayout"><aside class="elimside"><div class="elimtop"><div id="elimmyst"></div><div class="elimctl">
        <p class="elimcount" id="elimcount"></p>
        <p><button type="button" class="chip" id="elimm">Mystery photo</button> <button type="button" class="chip" id="elimr">Clear ticks</button></p>
        <div class="note" id="elimhint"></div></div></div>
      ${DATA.traits.map(c => `<fieldset class="trset"><legend>${esc(c.name)}</legend><div class="chips">${c.opts.map(o => `<button class="chip" type="button" data-t="${o.id}">${esc(o.t)}</button>`).join('')}</div></fieldset>`).join('')}</aside>
      <div><div class="elimgrid" id="elimgrid">${labNames().map(n => `<a class="etile" href="${genLink(n)}" data-n="${esc(n)}"><img src="${thumbSrc(n)}" alt="${esc(n)} corallites" loading="lazy"><span><i>${esc(n)}</i>${DATA.gen[n].n ? '' : ' ★'}</span></a>`).join('')}</div>
      <div id="elimres"></div></div></div>`;
    const fits = n => DATA.traits.every(c => { const picked = c.opts.filter(o => sel.has(o.id)).map(o => o.id); return !picked.length || picked.some(id => DATA.gen[n].tr.includes(id)); });
    const draw = () => {
      const left = labNames().filter(fits);
      root.querySelectorAll('.etile').forEach(t => t.classList.toggle('out', !left.includes(t.dataset.n)));
      root.querySelectorAll('[data-t]').forEach(b => { b.setAttribute('aria-pressed', String(sel.has(b.dataset.t))); b.classList.remove('best'); });
      root.querySelector('#elimcount').innerHTML = `<b>${left.length}</b> ${left.length === 1 ? 'genus left' : 'genera left'}`;
      // Best next check: the unticked feature that splits the remaining genera most evenly.
      const cands = DATA.traits.flatMap(c => c.opts.map(o => ({o, c}))).filter(({o}) => !sel.has(o.id)).map(({o, c}) => { const yes = left.filter(n => DATA.gen[n].tr.includes(o.id)); return {o, c, yes, no: left.filter(n => !yes.includes(n)), s: Math.min(yes.length, left.length - yes.length)}; }).filter(x => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 3);
      cands.forEach(x => root.querySelector(`[data-t="${x.o.id}"]`).classList.add('best'));
      // Each suggestion shows which of the remaining genera have the feature and which don't (thumbnails while few are left).
      const side = (L, label) => `<span class="esplit"><small>${label} · ${L.length}</small>${left.length <= 12 ? L.map(n => `<img src="${thumbSrc(n)}" alt="${esc(n)}" title="${esc(n)}">`).join('') : ''}</span>`;
      root.querySelector('#elimhint').innerHTML = left.length > 1 && cands.length ? `<b>Next question to ask</b>: the features below cut the ${left.length} remaining genera most evenly, so whatever the answer, you rule out the most. Look for it on your coral and tap it.
        <span class="enext">${cands.map(x => `<button type="button" class="ebest" data-pick="${x.o.id}"><span><span class="note">${esc(x.c.name)}:</span> <b>${esc(x.o.t)}</b>?</span>${side(x.yes, 'Yes')}${side(x.no, 'No')}</button>`).join('')}</span>`
        : left.length === 1 ? 'Only one genus fits. Check it against its sheet.' : left.length ? 'These genera share every feature listed here: compare them side by side.' : 'Nothing fits: untick something.';
      root.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => { sel.add(b.dataset.pick); draw(); });
    };
    root.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { sel.has(b.dataset.t) ? sel.delete(b.dataset.t) : sel.add(b.dataset.t); draw(); });
    root.querySelector('#elimr').onclick = () => { sel.clear(); draw(); };
    root.querySelector('#elimm').onclick = () => {
      mystery = pick(labNames()); sel.clear();
      const p = viewPhoto(mystery, 'macro');
      root.querySelector('#elimmyst').innerHTML = `<figure class="emyst"><img src="${img(p)}" alt="Mystery coral, corallites"><figcaption>Mystery coral: tick what you see, then tap your answer on the board.</figcaption></figure>`;
      root.querySelector('#elimres').innerHTML = '';
      root.querySelectorAll('.etile').forEach(x => x.classList.remove('answer'));
      draw();
    };
    // Outside a mystery round a tile is a plain link to the genus sheet.
    root.querySelectorAll('.etile').forEach(t => t.onclick = e => {
      const n = t.dataset.n;
      if (!mystery) return;
      e.preventDefault();
      const ok = n === mystery, miss = DATA.gen[mystery].tr.filter(id => !sel.has(id)).map(trName), wrong = [...sel].filter(id => !DATA.gen[mystery].tr.includes(id)).map(trName);
      root.querySelector('#elimres').innerHTML = `<p class="${ok ? 'ok' : 'ko'}"><b>${ok ? 'Right' : 'Not quite'}</b>: it was <a href="${genLink(mystery)}"><i>${esc(mystery)}</i></a>.</p>
        ${wrong.length ? `<p class="note">Ticked but not true for ${esc(mystery)}: ${wrong.map(esc).join(', ')}.</p>` : ''}${miss.length ? `<p class="note">Its features you didn't tick: ${miss.map(esc).join(', ')}.</p>` : ''}
        <p>${whyLine(mystery)}</p><button type="button" class="next" id="elimnext">Another mystery photo</button>`;
      root.querySelectorAll('.etile').forEach(x => x.classList.toggle('answer', x.dataset.n === mystery));
      root.querySelector('#elimnext').onclick = () => root.querySelector('#elimm').click();
      mystery = null;
    });
    draw();
  }
});
