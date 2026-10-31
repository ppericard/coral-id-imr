// Welcome tour: four short cards for a first visit (what the app is for, the Learn > Practice > Identify path,
// how Practice adapts and what "learned" means, signing in, where help lives). Shown once per browser
// (localStorage imr-tour, outside the imr-coral-* progress keys so backups and resets leave it alone), never on its
// own for the admin browser, and replayable from the ? help of any page (or ?tour in the URL).
(function(){
  const KEY = 'imr-tour';
  let box = null, step = 0, back = null;
  // The first photo of a game set not already used (sets can share photos).
  const pick = (n, v, lv, not = []) => { const g = DATA.gen[n]; if (!g) return null; const s = (g.sl || {})[v] || {};
    return (s[lv] || []).find(p => !not.some(q => q.f === p.f || (q.o && q.o === p.o))) || null; };
  const pic = (p, alt = '') => p ? `<img src="${img(p, 's')}" alt="${esc(alt)}" loading="lazy">` : '';
  // A genus with an easy, a medium and a hard mid-distance photo, for the "photos get harder" strip.
  function ladder(){
    for (const n of ['Acropora', 'Pocillopora', 'Porites', ...shuffle(Object.keys(DATA.gen))]) for (const v of ['wide', 'medium']) {
      const ph = []; for (const l of ['easy', 'medium', 'hard']) { const p = pick(n, v, l, ph); if (!p) break; ph.push(p); }
      if (ph.length === 3) return {n, ph};
    }
    return null;
  }
  const PATH = [['Learn', 'See each genus', 'Acropora', 'medium'], ['Practice', 'Train your eye', 'Platygyra', 'macro'], ['Identify', 'Name corals on your photos', 'Pocillopora', 'wide']];
  const viewPic = (n, v) => { const g = DATA.gen[n]; return g ? (g.views[v] || [])[0] || cover(g) : null; };
  function slides(){
    const L = ladder(), ph = phone();
    return [
      `<h2>Welcome to IMR Coral ID</h2>
       <p>Learn to recognise the 39 coral genera of the IMR slate on photos.</p>
       <ol class="tpath">${PATH.map(([t, d, n, v]) => `<li>${pic(viewPic(n, v))}<b>${t}</b><small>${d}</small></li>`).join('')}</ol>`,
      `<h2>Practice adapts to you</h2>
       <p>Each genus starts with easy photos. Get it right and the photos get harder.</p>
       ${L ? `<div class="tladder">${L.ph.map((p, i) => `<figure>${pic(p, L.n)}<figcaption>${['Easy', 'Medium', 'Hard'][i]}</figcaption></figure>`).join('<span aria-hidden="true">›</span>')}</div>` : ''}
       <p class="tlv"><span class="lvl new">Not seen</span> <span class="lvl mid">Learning</span> <span class="lvl weak">Review</span> <span class="lvl ok">Learned</span></p>
       <p class="note"><b>Learned</b> = many right answers (hard photos count more), once with the corallites shown and once in a look-alike duel.</p>`,
      `<h2>Save your progress</h2>
       <section class="sync tsync"></section>`,
      `<h2>Help is one tap away</h2>
       <ul class="ttools">
         <li><b class="tkey">?</b><span>Help for the page you are on</span></li>
         <li><b class="tkey">⚙</b><span>Photo source, size and theme</span></li>
         <li><b class="tkey tprog">${ph ? 'Progress' : 'My progress'}</b><span>Your progress per genus</span></li>
       </ul>
       <p class="note">Replay this tour from <b>?</b> on any page.</p>`
    ];
  }
  function show(i){
    const S = slides(); step = Math.max(0, Math.min(S.length - 1, i));
    const last = step === S.length - 1;
    box.querySelector('.tbody').innerHTML = S[step];
    box.querySelector('.tdots').innerHTML = S.map((_, k) => `<button type="button" aria-label="Card ${k + 1}"${k === step ? ' aria-current="step"' : ''}></button>`).join('');
    box.querySelectorAll('.tdots button').forEach((b, k) => b.onclick = () => show(k));
    box.querySelector('.tback').hidden = step === 0;
    const nx = box.querySelector('.tnext'); nx.textContent = last ? 'Start practising' : 'Next';
    const sk = box.querySelector('.tskip'); sk.hidden = last;
    const sy = box.querySelector('.tsync'); if (sy) bindSync(sy);
    try { sessionStorage.setItem(KEY, String(step)); } catch (e) {}  // a sign-in reloads the page: the tour comes back here
    box.querySelector('.tcard').focus({preventScroll: true});
  }
  function close(to){
    if (!box) return;
    try { sessionStorage.removeItem(KEY); } catch (e) {}
    box.remove(); box = null; document.removeEventListener('keydown', onKey); removeEventListener('hashchange', onNav); document.documentElement.classList.remove('touring');
    bindSync();  // the page's own sign-in box (My progress) follows a sign-in made in the tour
    if (to) go(to); else if (back && back.focus) back.focus({preventScroll: true});
  }
  const onNav = () => close();  // a tab bar tap (phones) leaves the tour
  function onKey(e){
    if (e.target.closest && e.target.closest('input')) { if (e.key === 'Escape') close(); return; }
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') show(step + 1);
    else if (e.key === 'ArrowLeft') show(step - 1);
  }
  window.tour = function(at = 0){
    if (box || typeof DATA === 'undefined' || !DATA) return;
    try { localStorage.setItem(KEY, '1'); } catch (e) {}
    back = document.activeElement;
    box = document.createElement('div');
    box.id = 'tour'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', 'Welcome tour');
    box.innerHTML = `<div class="tcard" tabindex="-1">
      <button type="button" class="tskip">Skip</button>
      <div class="tbody"></div>
      <div class="tnav"><button type="button" class="chip tback">Back</button><span class="tdots"></span><button type="button" class="next tnext">Next</button></div>
    </div>`;
    document.body.appendChild(box); document.documentElement.classList.add('touring');
    box.querySelector('.tskip').onclick = () => close();
    box.querySelector('.tback').onclick = () => show(step - 1);
    box.querySelector('.tnext').onclick = () => step === slides().length - 1 ? close('quiz') : show(step + 1);
    box.addEventListener('click', e => { if (e.target === box) close(); });
    // Phones: swipe between cards.
    let x0 = null;
    box.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, {passive: true});
    box.addEventListener('touchend', e => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 50 && !e.target.closest('input')) show(step + (dx < 0 ? 1 : -1)); });
    document.addEventListener('keydown', onKey); addEventListener('hashchange', onNav);
    show(at);
  };
  // First visit: once the data is in (app.js calls this after the first route).
  window.tourFirst = function(){
    let seen = false; try { seen = !!localStorage.getItem(KEY); } catch (e) {}
    let at = null; try { at = sessionStorage.getItem(KEY); } catch (e) {}
    if (at !== null) tour(+at || 0);
    else if (/[?&]tour\b/.test(location.search) || (!seen && !HAS_ADMIN_TOKEN)) tour();
  };
  // Replay from the ? help of any page.
  document.getElementById('helpbox').addEventListener('click', e => { if (e.target.closest('[data-tour]')) { e.preventDefault(); tour(); } });
})();
