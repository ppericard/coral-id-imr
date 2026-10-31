// Feature matrix: genera × corallite features as a dot grid. Sort by any feature; pick a genus to see
// exactly which features separate it from its look-alikes.
LAB.add({
  id: 'matrix', icon: '⁘', title: 'Feature matrix',
  blurb: 'Every genus against every corallite feature as a dot grid. Pick a genus to light up what separates it from its look-alikes.',
  lede: 'Tap a column to bring the genera with that feature to the top. Tap a genus name to compare it with its look-alikes: differing cells are outlined.',
  render(root){
    const cols = DATA.traits.flatMap(c => c.opts.map(o => ({...o, c: c.id})));
    let sortBy = null, focus = null;
    const uniq = id => labNames().filter(n => DATA.gen[n].tr.includes(id)).length;
    root.innerHTML = `<div class="mxlayout"><div class="tablewrap mxwrap"><table class="mx"><thead><tr><th class="mxg">Genus</th>${cols.map((o, i) => `<th class="mxc c-${o.c}${i && cols[i - 1].c !== o.c ? ' sep' : ''}"><button type="button" data-col="${o.id}" title="${esc(o.t)}"><span>${esc(o.t)}</span><small>${uniq(o.id)}</small></button></th>`).join('')}</tr></thead><tbody id="mxb"></tbody></table></div>
      <div id="mxinfo" class="mxinfo"><p class="note">Tap a genus name to see what separates it from its look-alikes.</p></div></div><div class="mxpeek" id="mxpeek" hidden></div>`;
    const peek = root.querySelector('#mxpeek');
    const draw = () => {
      let rows = labNames();
      if (sortBy) rows = [...rows.filter(n => DATA.gen[n].tr.includes(sortBy)), ...rows.filter(n => !DATA.gen[n].tr.includes(sortBy))];
      const near = focus ? lookAlikes(focus) : [];
      if (focus) rows = [focus, ...near, ...rows.filter(n => n !== focus && !near.includes(n))];
      root.querySelector('#mxb').innerHTML = rows.map(n => {
        const g = DATA.gen[n], role = n === focus ? 'focus' : near.includes(n) ? 'near' : focus ? 'far' : '';
        return `<tr class="${role}"><th class="mxg" style="--fc:${famColor(g.fam)}"><button type="button" data-row="${esc(n)}"><i>${esc(n)}</i>${g.n ? '' : ' ★'}</button></th>${cols.map((o, i) => {
          const has = g.tr.includes(o.id), diff = role === 'near' && has !== DATA.gen[focus].tr.includes(o.id);
          return `<td class="c-${o.c}${i && cols[i - 1].c !== o.c ? ' sep' : ''}${o.id === sortBy ? ' sorted' : ''}${diff ? ' diff' : ''}">${has ? '<span class="dot"></span>' : ''}</td>`; }).join('')}</tr>`;
      }).join('');
      root.querySelectorAll('[data-col]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.col === sortBy)));
      root.querySelectorAll('[data-row]').forEach(b => {
        b.onclick = () => { focus = focus === b.dataset.row ? null : b.dataset.row; draw(); info(); };
        b.onmouseenter = () => { const r = b.getBoundingClientRect(); peek.hidden = false; peek.innerHTML = `<img src="${thumbSrc(b.dataset.row)}" alt="">`; peek.style.left = (r.right + 8) + 'px'; peek.style.top = Math.min(innerHeight - 170, Math.max(8, r.top - 60)) + 'px'; };
        b.onmouseleave = () => { peek.hidden = true; };
      });
    };
    const info = () => {
      const el = root.querySelector('#mxinfo');
      if (!focus) { el.innerHTML = '<p class="note">Tap a genus name to see what separates it from its look-alikes.</p>'; return; }
      const F = DATA.gen[focus];
      el.innerHTML = `<h3><a href="${genLink(focus)}"><i>${esc(focus)}</i></a> vs its look-alikes</h3><div class="mxcards">${lookAlikes(focus).map(n => {
        const only = F.tr.filter(t => !DATA.gen[n].tr.includes(t)).map(trName), other = DATA.gen[n].tr.filter(t => !F.tr.includes(t)).map(trName);
        return `<div class="mxcard"><div class="mxpair"><img src="${thumbSrc(focus)}" alt="${esc(focus)} corallites"><img src="${thumbSrc(n)}" alt="${esc(n)} corallites"></div>
          <p><b><i>${esc(focus)}</i> only:</b> ${only.length ? only.map(esc).join(', ') : '<span class="note">nothing in this grid</span>'}</p>
          <p><b><i>${esc(n)}</i> only:</b> ${other.length ? other.map(esc).join(', ') : '<span class="note">nothing in this grid</span>'}</p>
          ${!only.length && !other.length ? '<p class="note">Same dots: the difference is in finer details, see the comparison.</p>' : ''}
          <a href="#cmp-${encodeURIComponent(focus + '|' + n)}">Compare photos</a></div>`; }).join('')}</div>`;
    };
    root.querySelectorAll('[data-col]').forEach(b => b.onclick = () => { sortBy = sortBy === b.dataset.col ? null : b.dataset.col; focus = null; draw(); info(); });
    draw();
  }
});
