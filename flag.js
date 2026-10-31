// "Bad photo" flag, for Pierre only: shown in the browser where the admin page holds his token (imr-admin-vault).
// A small ⚑ button follows the photo under the pointer (any page, game or lightbox). A click records the photo, its
// genus, where it was seen (page, game level, view) and when, in localStorage 'imr-photo-flags'. The admin page
// picks these up into its draft (curation.json "flag") and lists them in Triage. Nothing is sent from here.
(() => {
  let admin = false; try { admin = !!localStorage.getItem('imr-admin-vault') && localStorage.getItem('imr-admin-view') !== 'user'; } catch (e) {}
  if (!admin) return;
  const KEY = 'imr-photo-flags';
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } };
  const write = L => { try { localStorage.setItem(KEY, JSON.stringify(L)); } catch (e) {} };
  const fileOf = im => { const m = /img\/(.+?)(-s)?\.webp/.exec(im.currentSrc || im.src || ''); return m ? m[1] : null; };
  // Genus and view of a photo file, from the built data (views, more, lecture photos, approved book photos).
  const locate = f => {
    if (typeof DATA === 'undefined' || !DATA) return {};
    for (const [n, g] of Object.entries(DATA.gen)) {
      for (const [v] of VIEWS) {
        if ([...(g.views[v] || []), ...((g.more || {})[v] || [])].some(p => p.f === f)) return {genus: n, view: v};
        if ((g.book || []).some(p => p.f === f && p.view === v)) return {genus: n, view: v};
      }
      const c = (DATA.course[n] || []).find(p => p.f === f); if (c) return {genus: n, view: c.v};
    }
    return {};
  };
  // Where the photo was seen: the page (hash), plus the game level on Practice pages.
  const where = () => { const h = decodeURIComponent(location.hash.slice(1)) || 'home', open = !document.getElementById('lightbox').hidden;
    const game = /^(quiz|pairs|reveal|lab-reveal|lab-pairs)/.test(h);
    return `${h}${game && typeof Q !== 'undefined' && !(h === 'quiz' && Q.course) ? ' · level ' + Q.level : ''}${open ? ' · lightbox' : ''}`; };
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'pflag'; btn.hidden = true; btn.textContent = '⚑';
  btn.title = 'Bad photo: send it to Triage in the admin';
  document.body.appendChild(btn);
  let target = null;
  const place = im => { const f = fileOf(im); if (!f) return; target = im; const r = im.getBoundingClientRect();
    if (r.width < 60 || r.height < 40 || r.bottom < 0 || r.top > innerHeight) { btn.hidden = true; return; }
    btn.style.top = (r.top + 6) + 'px'; btn.style.left = (r.left + 6) + 'px'; btn.hidden = false;
    btn.classList.toggle('on', read().some(x => x.f === f)); };
  document.addEventListener('pointerover', e => { const im = e.target.closest && e.target.closest('img'); if (im && im !== target) place(im); }, true);
  // The button follows its photo when the page scrolls, and goes away once the photo leaves the page.
  document.addEventListener('scroll', () => { if (target && document.body.contains(target)) place(target); else btn.hidden = true; }, true);
  // Touch screens have no hover: a tap on a photo shows the flag for that photo.
  document.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') { const im = e.target.closest && e.target.closest('img'); if (im) place(im); } }, true);
  btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); if (!target) return;
    const f = fileOf(target); if (!f) return;
    const L = read();
    if (L.some(x => x.f === f)) { btn.title = 'Already flagged: see Triage in the admin'; return; }
    L.push({f, ...locate(f), where: where(), at: new Date().toISOString()}); write(L);
    btn.classList.add('on'); btn.textContent = '⚑ flagged'; setTimeout(() => { btn.textContent = '⚑'; }, 1200); });
})();
