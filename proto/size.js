// Corallite size ruler: each genus as a bar on a log scale of corallite diameter, with everyday objects
// for scale and a cursor to set the size you measured.
LAB.add({
  id: 'size', icon: '↔', title: 'Corallite size ruler',
  blurb: 'Every genus on a ruler of corallite size, with fingertip-scale references. Drag the cursor to the size you see.',
  lede: 'Corallite diameter on a log scale, using the Coral Finder size classes (bars span every class the genus can show). Drag the cursor to what you measured: genera that fit light up.',
  render(root){
    const MIN = 0.4, MAX = 60, CLS = {s1: [0.5, 2], s2: [2, 5], s3: [5, 10], s4: [10, 50]};
    const X = mm => (Math.log(mm / MIN) / Math.log(MAX / MIN) * 100).toFixed(2) + '%';
    const REFS = [[1, 'pen tip ≈ 1 mm'], [3, 'match head ≈ 3 mm'], [6, 'pencil eraser ≈ 6 mm'], [10, 'little-finger nail ≈ 10 mm'], [20, 'thumb width ≈ 20 mm']];
    const span = n => { const s = DATA.gen[n].tr.filter(t => CLS[t]).map(t => CLS[t]); return s.length ? [Math.min(...s.map(x => x[0])), Math.max(...s.map(x => x[1]))] : null; };
    const rows = labNames().filter(span).sort((a, b) => span(a)[0] - span(b)[0] || span(a)[1] - span(b)[1]);
    root.innerHTML = `<div class="ruler">
      <div class="rrow rhead"><span></span><div class="rtrack">${[0.5, 1, 2, 5, 10, 20, 50].map(v => `<span class="rtick${[1, 20].includes(v) ? ' minor' : ''}" style="left:${X(v)}">${v} mm</span>`).join('')}${['s1', 's2', 's3', 's4'].map(s => `<span class="rcls" style="left:${X(CLS[s][0])};width:calc(${X(CLS[s][1])} - ${X(CLS[s][0])})">${esc(trName(s))}</span>`).join('')}</div></div>
      <div class="rrow rrefs"><span class="note">For scale</span><div class="rtrack">${REFS.map(([v, t], i) => `<span class="rref${v > 15 ? ' end' : ''}" style="left:${X(v)};--row:${i % 2}"><i>${i + 1}</i><em>${esc(t)}</em></span>`).join('')}</div></div>
      ${rows.map(n => { const [a, b] = span(n); return `<a class="rrow rgen" href="${genLink(n)}" data-n="${esc(n)}" data-a="${a}" data-b="${b}"><span class="rname"><img src="${thumbSrc(n)}" alt="" loading="lazy"><i>${esc(n)}</i></span><div class="rtrack"><span class="rbar" style="left:${X(a)};width:calc(${X(b)} - ${X(a)});background:${famColor(DATA.gen[n].fam)}"></span></div></a>`; }).join('')}
      <div class="rcursor" id="rcur"><span id="rcurl"></span></div>
    </div>
    <p class="rreflist note">${REFS.map(([, t], i) => `<span><i>${i + 1}</i> ${esc(t)}</span>`).join('')}</p>
    <label class="rlabel">I measured <input type="range" id="rr" min="0" max="1000" value="380" aria-label="Measured corallite size"> <b id="rval"></b></label>
    <p class="note" id="rfit"></p>`;
    const r = root.querySelector('#rr'), cur = root.querySelector('#rcur');
    const set = () => {
      const mm = MIN * Math.pow(MAX / MIN, r.value / 1000), lbl = mm < 10 ? mm.toFixed(1) : Math.round(mm);
      root.querySelector('#rval').textContent = lbl + ' mm';
      root.querySelector('#rcurl').textContent = lbl + ' mm';
      cur.style.setProperty('--k', Math.log(mm / MIN) / Math.log(MAX / MIN));
      const fit = [];
      root.querySelectorAll('.rgen').forEach(e => { const ok = mm >= Number(e.dataset.a) && mm <= Number(e.dataset.b); e.classList.toggle('fit', ok); if (ok) fit.push(e.dataset.n); });
      root.querySelector('#rfit').innerHTML = `${fit.length} genera fit: ${fit.map(n => `<i>${esc(n)}</i>`).join(', ')}.`;
    };
    r.oninput = set; set();
    // Dragging anywhere on the ruler moves the cursor too.
    const ruler = root.querySelector('.ruler');
    const fromPointer = e => { const t = ruler.querySelector('.rgen .rtrack').getBoundingClientRect(); const k = (e.clientX - t.left) / t.width; if (k >= 0 && k <= 1) { r.value = Math.round(k * 1000); set(); } };
    ruler.onpointerdown = e => { if (e.target.closest('.rname')) return; e.preventDefault(); fromPointer(e); ruler.setPointerCapture(e.pointerId); ruler.onpointermove = fromPointer; };
    ruler.onpointerup = () => { ruler.onpointermove = null; };
    ruler.onclick = e => { if (!e.target.closest('.rname')) e.preventDefault(); };
  }
});
