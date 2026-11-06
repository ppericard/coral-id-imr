// "Bad photo" flag, for Pierre only: shown in the browser where the admin page holds his token (reefid-admin-vault).
// A small ⚑ button follows the photo under the pointer (any page, game or lightbox, every subject), in its top-right
// corner so it never covers the view label or the game source (top-left). A click records the photo, its subject, its
// id in that subject's curation, its unit, where it was seen (page, game level, view) and when, in localStorage
// 'reefid-photo-flags'. The admin page picks these up into its draft (the subject's part of curation.json, "flag") and
// lists them in To do. Nothing is sent from here.
// A photo's name: the data-f its page puts on it (the game, the lightbox, remote photos: an iNaturalist or FishBase URL
// names no photo), else its file under img/. What the name means (its id, unit, view) comes from the subject's data
// (app.js UNITS photo), the current subject first.
const flagFile = im => {
  if (im.dataset && im.dataset.f) return im.dataset.f;
  // Any of the photo's sizes (tools/photos.py): -t 240, -s 480, -m 960 px, or none (1600 px).
  const m = /img\/(.+?)(-[tsm])?\.webp/.exec(im.currentSrc || im.src || '');
  return m ? m[1] : null;
};
// {s: subject id, id: its key in that subject's curation, ...what UNITS photo records}, null when no subject knows it.
const flagWho = (f, subj, subjects, units) => {
  for (const S of [subj, ...subjects.filter(x => x !== subj)]) {
    const U = S && units[S.id];
    let r = null;
    try {
      r = U && U.photo ? U.photo(f) : null;
    } catch (e) {}
    if (r) return {s: S.id, ...r};
  }
  return null;
};
if (typeof module !== 'undefined' && module.exports) module.exports = {flagFile, flagWho};
(() => {
  let admin = false;
  try {
    admin = !!localStorage.getItem('reefid-admin-vault') && localStorage.getItem('reefid-admin-view') !== 'user';
  } catch (e) {}
  if (!admin) return;
  const KEY = 'reefid-photo-flags';
  const read = () => {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || [];
    } catch (e) {
      return [];
    }
  };
  const write = L => {
    try {
      localStorage.setItem(KEY, JSON.stringify(L));
    } catch (e) {}
  };
  const fileOf = flagFile;
  // The photo's subject, id and unit, kept once found (the data does not change under a name); a photo no subject knows
  // (its data not loaded yet) keeps its name as its id, under the current subject.
  const WHO = new Map();
  const locate = f => {
    const k = SUBJ.id + '|' + f;
    if (!WHO.has(k)) {
      const w = flagWho(f, SUBJ, SUBJECTS, UNITS);
      if (!w) return {s: SUBJ.id, id: f};
      WHO.set(k, w);
    }
    return WHO.get(k);
  };
  const flagged = f => {
    const w = locate(f);
    return read().some(x => x.f === w.id && (x.s || SUBJECTS[0].id) === w.s);
  };
  // Where the photo was seen: the page (hash), plus the game level on Practice pages.
  const where = () => {
    const h = hashNow() || 'home',
      open = !document.getElementById('lightbox').hidden;
    const game = /^(quiz|pairs|lab-reveal)/.test(h);
    return `${location.hash.slice(1) || 'home'}${game && typeof Q !== 'undefined' && !(h === 'quiz' && Q.course) ? ' · level ' + Q.level : ''}${open ? ' · lightbox' : ''}`;
  };
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'pflag';
  btn.hidden = true;
  btn.textContent = '⚑';
  btn.title = 'Bad photo: send it to To do in the admin';
  document.body.appendChild(btn);
  let target = null;
  let place = im => {
    const f = fileOf(im);
    if (!f) return;
    target = im;
    const r = im.getBoundingClientRect();
    if (r.width < 60 || r.height < 40 || r.bottom < 0 || r.top + 30 > innerHeight - (typeof tabH === 'function' ? tabH() : 0)) {
      btn.hidden = true;
      return;
    }
    btn.style.top = r.top + 6 + 'px';
    btn.style.right = document.documentElement.clientWidth - r.right + 6 + 'px';
    btn.hidden = false;
    btn.classList.toggle('on', flagged(f));
  };
  document.addEventListener(
    'pointerover',
    e => {
      const im = e.target.closest && e.target.closest('img');
      if (im && im !== target) place(im);
    },
    true
  );
  // The button follows its photo when the page scrolls or the photo is resized, and goes away once the photo leaves the
  // page (new question, other page): on a phone it used to stay where the last photo was, e.g. over the tab bar.
  const follow = () => {
    if (target && target.isConnected) place(target);
    else {
      btn.hidden = true;
      target = null;
    }
  };
  document.addEventListener('scroll', follow, true);
  addEventListener('resize', follow);
  addEventListener('hashchange', () => {
    btn.hidden = true;
    target = null;
  });
  // Touch screens have no hover, and a tap on a game photo opens the enlarged view: the flag never showed there
  // (Pierre, 2026-11-02). It now goes by itself on the biggest photo in view (the question's photo, the enlarged one),
  // after each page change; a tap on another photo still moves it there.
  const touch = matchMedia('(hover: none)').matches;
  let pending = 0;
  const auto = () => {
    pending = 0;
    if (target && target.isConnected && !(lbOpen() && !target.closest('#lightbox'))) return;
    const imgs = [...document.querySelectorAll(lbOpen() ? '#lightbox img' : '#view img')].filter(fileOf);
    let best = null,
      area = 0;
    imgs.forEach(im => {
      const r = im.getBoundingClientRect(),
        a = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0)) * Math.max(0, r.width);
      if (a > area) ((best = im), (area = a));
    });
    if (best) place(best);
  };
  const lbOpen = () => {
    const lb = document.getElementById('lightbox');
    return !!lb && !lb.hidden;
  };
  new MutationObserver(() => {
    if (target && !target.isConnected) {
      btn.hidden = true;
      target = null;
    }
    if (touch && !pending) pending = requestAnimationFrame(auto);
  }).observe(document.body, {childList: true, subtree: true, attributes: true, attributeFilter: ['hidden']});
  // A photo that just loaded has its size only now (the enlarged view's, a new question's).
  if (touch)
    document.addEventListener('load', e => e.target.tagName === 'IMG' && !pending && (pending = requestAnimationFrame(auto)), true);
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(follow);
    const watch = place;
    place = im => {
      ro.disconnect();
      watch(im);
      if (target) ro.observe(target);
    };
  }
  // Touch screens have no hover: a tap on a photo shows the flag for that photo.
  document.addEventListener(
    'pointerdown',
    e => {
      if (e.pointerType !== 'mouse') {
        const im = e.target.closest && e.target.closest('img');
        if (im) place(im);
      }
    },
    true
  );
  btn.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    if (!target) return;
    const f = fileOf(target);
    if (!f) return;
    if (flagged(f)) {
      btn.title = 'Already flagged: see To do in the admin';
      return;
    }
    const {id, ...w} = locate(f),
      L = read();
    L.push({f: id, ...w, where: where(), at: new Date().toISOString()});
    write(L);
    btn.classList.add('on');
    btn.textContent = '⚑ flagged';
    setTimeout(() => {
      btn.textContent = '⚑';
    }, 1200);
  });
})();
