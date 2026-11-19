// Fish ID Key for EventMeasure (ROADMAP "Fish ID Key for EventMeasure"; Pierre, 2026-11-03 and 2026-11-04): one page to
// keep open beside EventMeasure, the IMR video measurement software, to find the name to pick for a fish on a survey
// video. It holds every species of the IMR reference PDF (fish.json species with `pdf`), unfiltered: those out of the
// game too (`out`). Names are the PDF's, the WoRMS accepted name beside them when it differs (rule S2); the groups are
// the regional identification key's (fish.json key, rule S3), each family under its group, its genera, then its species
// in the commonness order of fish.json (the most often met around Dauin first). A PDF species whose family is in no
// group (no family record) comes last under its PDF section. One search box filters everything at once (PDF, WoRMS and
// synonym names, common names, genus, family, PDF section); the index on the side jumps to a family. In the Lab until
// Pierre's OK (rule U13). Its subject is the one whose UNITS entry declares `emkey` (rule S1).
// State in the hash (#tools/fishkey/f=<family id>;q=<search>), so a reload or a shared link keeps the place.
const FISHKEY = (() => {
  // Lower case, accents off, every run of other characters one space: "Chaetodon  vagabundus" and "chaetodon-vag" match.
  const norm = s =>
    String(s == null ? '' : s)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  const flat = L => (Array.isArray(L) ? L.flat(Infinity) : []).filter(Boolean);
  const title = s => String(s || '').replace(/[A-Za-z]+/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase());
  // The key's tree from fish.json F: {groups: [{n, title, fams}], fams: every family in display order, sp: every PDF
  // species, key: F.key}. A family: {id, name, imr (IMR's name for it), sci, secs (its PDF sections not among sci), sheet (it has a sheet), group,
  // gens: [{id, name, sp: [species records]}], n: its species}. A species keeps its fish.json record.
  function index(F) {
    F = F || {};
    const key = F.key || {},
      gens = new Map((F.genera || []).map(g => [g.id, g])),
      pdf = (F.species || []).filter(s => s && s.pdf),
      byFam = new Map(),
      fams = [];
    pdf.forEach(s => {
      const k = s.family || 'sec:' + (s.sec || '?');
      if (!byFam.has(k)) byFam.set(k, []);
      byFam.get(k).push(s);
    });
    const make = (f, L) => {
      // Genera in the family's order, species in its commonness order; a genus or species it does not list comes after.
      const ord = new Map((f.species || []).map((id, i) => [id, i])),
        gOrd = new Map((f.genera || []).map((id, i) => [id, i])),
        bySp = (a, b) => (ord.has(a.id) ? ord.get(a.id) : 1e6 + (a.r || 0)) - (ord.has(b.id) ? ord.get(b.id) : 1e6 + (b.r || 0)),
        G = new Map();
      L.forEach(s => {
        const gid = s.genus || 'g:' + String(s.name).split(' ')[0];
        if (!G.has(gid)) G.set(gid, {id: gid, name: (gens.get(gid) || {}).name || gid.replace(/^g:/, ''), sp: []});
        G.get(gid).sp.push(s);
      });
      const gl = [...G.values()].sort(
        (a, b) => (gOrd.has(a.id) ? gOrd.get(a.id) : 1e6) - (gOrd.has(b.id) ? gOrd.get(b.id) : 1e6) || a.name.localeCompare(b.name)
      );
      gl.forEach(g => g.sp.sort(bySp));
      const sci = f.sci || [],
        low = new Set(sci.map(x => String(x).toLowerCase()));
      return {
        id: f.id,
        name: f.name,
        imr: f.imr || '',
        sci,
        secs: [...new Set(L.map(s => s.sec).filter(Boolean))].filter(x => !low.has(String(x).toLowerCase())).map(title),
        sheet: !!f.sheet,
        group: f.group || null,
        gens: gl,
        n: L.length
      };
    };
    (F.families || []).forEach(f => byFam.has(f.id) && fams.push(make({...f, sheet: true}, byFam.get(f.id))));
    // A PDF species whose family has no record (in no circle): under its PDF section, no group, no sheet.
    [...byFam.keys()]
      .filter(k => k.startsWith('sec:'))
      .forEach(k => fams.push(make({id: k, name: title(k.slice(4)), sci: [title(k.slice(4))]}, byFam.get(k))));
    const groups = (key.groups || [])
      .map(g => ({n: g.n, title: g.title, fams: fams.filter(f => f.group === g.n)}))
      .filter(g => g.fams.length);
    const none = fams.filter(f => !groups.some(g => g.n === f.group));
    if (none.length) groups.push({n: null, title: '', fams: none});
    return {groups, fams: groups.flatMap(g => g.fams), sp: pdf, key};
  }
  // What a species can be found by: its scientific names (the PDF's, WoRMS's accepted name and synonyms), its common names,
  // then its genus, family and PDF section. {sci, common, rest}: normalized strings.
  function words(s, fam, F) {
    const ref = ((F && F.ref) || {})[s.ref] || {};
    return {
      sci: [s.name, s.now, ref.name, ...(ref.syn || [])].filter(Boolean).map(norm),
      common: [s.common, ...flat(s.cn), ...flat(s.cnr)].filter(Boolean).map(norm),
      rest: [fam && fam.name, ...((fam && fam.sci) || []), ...((fam && fam.secs) || []), s.sec, (fam && fam.imr) || '']
        .filter(Boolean)
        .map(norm)
    };
  }
  // Whether every word of the query starts a word of one of the strings (so "chr tern" finds Chromis ternatensis and
  // "damsel" every damselfish), the genus and family names included.
  function hit(W, q) {
    const T = norm(q).split(' ').filter(Boolean);
    if (!T.length) return true;
    const all = ' ' + [...W.sci, ...W.common, ...W.rest].join(' | ') + ' ';
    return T.every(t => all.includes(' ' + t));
  }
  return {norm, index, words, hit};
})();

LAB.add({
  id: 'fishkey',
  icon: '⌕',
  title: 'Fish ID Key',
  blurb: 'Every species of the IMR reference PDF, by identification group, family and genus, with the names to pick in EventMeasure.',
  lede: 'Find the name to pick in EventMeasure: type any name, or open a family. Names are those of the IMR reference PDF, with WoRMS beside them when it differs.',
  render(root, arg) {
    const S = SUBJECTS.find(s => (UNITS[s.id] || {}).emkey);
    if (!S) {
      root.innerHTML = '<p class="note">No fish data here.</p>';
      return;
    }
    const st = {f: '', q: ''};
    (arg || '').split(';').forEach(kv => {
      const i = kv.indexOf('='),
        k = kv.slice(0, i),
        v = kv.slice(i + 1);
      if (i > 0 && (k === 'f' || k === 'q')) st[k] = decodeURIComponent(v);
    });
    let I = null,
      F = null,
      W = new Map(),
      byFam = new Map(),
      photos = new Map(),
      alive = true;
    const save = () =>
      history.replaceState(
        null,
        '',
        hr(
          'lab-fishkey' +
            (st.f || st.q ? '|' + [st.f && 'f=' + st.f, st.q && 'q=' + encodeURIComponent(st.q)].filter(Boolean).join(';') : '')
        )
      );
    // Every photo of each species (the game photos, else the first photos, and the sheet-only ones), its card photo
    // first: the rule of the game's covers (app.js seenCover: an adult reference photo, no watermark), his ★ cover
    // where the subject's units are built.
    const photosOf = raw => {
      const M = new Map(),
        seen = new Set(),
        add = p => {
          if (!p || !p.sp || !p.f || seen.has(p.f)) return;
          seen.add(p.f);
          if (!M.has(p.sp)) M.set(p.sp, []);
          M.get(p.sp).push(p);
        };
      Object.values((raw.gm && raw.gm.photos) || {}).forEach(L => (L || []).forEach(add));
      Object.values((raw.ph && raw.ph.photos) || {}).forEach(L => (L || []).forEach(add));
      Object.entries((raw.ph && raw.ph.sheet) || {}).forEach(([sp, L]) => (L || []).forEach(p => add({sp, ...p})));
      const T = treeOf(S.id).TREEU,
        pick = sid => (T && T.covers ? T.covers[sid] : null) || null,
        out = new Map();
      M.forEach((L, sid) => {
        const c = seenCover(L, () => [0, 0], undefined, pick),
          R = easyRank(L).filter(p => p !== c);
        out.set(sid, (c ? [c, ...R] : R).slice(0, 8));
      });
      return out;
    };
    const thumbOf = s => {
      const L = photos.get(s.id) || [];
      return L.length
        ? `<button type="button" class="fkth zoom" data-z="${esc(s.id)}" aria-label="Photos of ${esc(s.name)}"><img ${thumb(L[0], '(min-width: 1024px) 132px, 96px')} alt="" loading="lazy">${L.length > 1 ? `<span class="fkn">${L.length}</span>` : ''}</button>`
        : '<span class="fkth fknone" aria-hidden="true"></span>';
    };
    const spRow = (s, fam) =>
      `<li class="fksp" data-sp="${esc(s.id)}">${thumbOf(s)}<div class="fkt"><b class="fkname"><i>${esc(s.name)}</i></b>${s.now && s.now !== s.name ? `<span class="fkworms">WoRMS: <i>${esc(s.now)}</i></span>` : ''}<span class="fkmeta">${s.common ? esc(s.common) + ' · ' : ''}PDF p. ${esc(s.pdf)}${fam.sheet ? ` · <a href="${esc(hr('g-s:' + s.name, S))}">Sheet</a>` : ''}</span></div></li>`;
    const gHead = g => (g.n ? `<span class="gn" style="--g:${groupHue(g.n)}">${g.n}</span> ${esc(g.title)}` : 'Not in a group of the key');
    const famBlock = f => {
      const multi = f.gens.length > 1;
      return `<section class="fkfam" id="fk-${esc(f.id.replace(/[^\w-]/g, '_'))}" data-fam="${esc(f.id)}">
        <h4><span class="fkfn">${esc(f.name)}</span> <span class="fksci">${f.sci.map(esc).join(', ')}${f.secs.length ? ` · PDF: ${f.secs.map(esc).join(', ')}` : ''}</span>${f.sheet ? ` <a class="fksheet" href="${esc(hr('g-' + f.id, S))}">Sheet</a>` : ''}</h4>
        ${f.gens
          .map(
            g =>
              `<div class="fkgen" data-gen="${esc(g.id)}">${multi ? `<h5><i>${esc(g.name)}</i></h5>` : ''}<ul class="fklist">${g.sp.map(s => spRow(s, f)).join('')}</ul></div>`
          )
          .join('')}
      </section>`;
    };
    const draw = () => {
      const k = I.key || {};
      root.innerHTML = `<div class="fklayout">
        <aside class="fkside">
          <div class="fkbar"><input type="search" id="fkq" placeholder="Any name or family" aria-label="Search the fish" autocomplete="off" spellcheck="false" value="${esc(st.q)}"><span class="fkcount" aria-live="polite"></span></div>
          <details class="fkidx"${matchMedia('(min-width: 600px)').matches ? ' open' : ''}><summary>Families</summary>
            ${I.groups
              .map(
                g =>
                  `<div class="fkig"><div class="fkgh">${gHead(g)}</div>${g.fams.map(f => `<button type="button" class="linkish fkjump" data-jump="${esc(f.id)}">${esc(f.name)} <small>${f.n}</small></button>`).join('')}</div>`
              )
              .join('')}
          </details>
        </aside>
        <div class="fkmain">
          ${I.groups.map(g => `<div class="fkgroup" data-g="${g.n || ''}"><h3>${gHead(g)}</h3>${g.fams.map(famBlock).join('')}</div>`).join('')}
          <p class="fkempty note" hidden>No species of the IMR reference PDF matches. Try a genus, a family or part of a name.</p>
          <p class="note fksrc">Names: the IMR reference PDF (EventMeasure), WoRMS beside them when it differs. Groups: ${k.short ? `<span title="${esc(k.cite || '')}">${esc(k.short)}</span>` : 'the regional identification key'}${k.region && k.region.name ? `, ${esc(k.region.name)}` : ''}.</p>
        </div>
      </div>`;
      const q = root.querySelector('#fkq');
      q.oninput = () => {
        st.q = q.value;
        filter();
        save();
      };
      q.onkeydown = e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const first = root.querySelector('.fksp:not([hidden])');
          if (first) first.scrollIntoView({block: 'center'});
        } else if (e.key === 'Escape' && q.value) {
          e.preventDefault();
          q.value = '';
          q.oninput();
        }
      };
      root.querySelectorAll('[data-jump]').forEach(
        b =>
          (b.onclick = () => {
            st.f = b.dataset.jump;
            if (st.q) {
              q.value = st.q = '';
              filter();
            }
            jump();
            save();
            if (!matchMedia('(min-width: 600px)').matches) root.querySelector('.fkidx').open = false;
          })
      );
      root.querySelector('.fkmain').onclick = e => {
        const b = e.target.closest('[data-z]');
        if (!b) return;
        const L = photos.get(b.dataset.z) || [];
        if (L.length) zoom(L, 0);
      };
      filter();
      if (st.f) jump();
    };
    const jump = () => {
      const el = root.querySelector(`[data-fam="${CSS.escape(st.f)}"]`);
      if (el) el.scrollIntoView({block: 'start'});
    };
    // The search: a species shows while every word of the query starts one of its words; a family or genus with none
    // left hides, and so does a group.
    const filter = () => {
      const q = st.q.trim();
      let n = 0;
      root.querySelectorAll('.fksp').forEach(li => {
        const s = byFam.get(li.dataset.sp),
          on = !q || FISHKEY.hit(W.get(li.dataset.sp), q);
        li.hidden = !on;
        if (on && s) n++;
      });
      root.querySelectorAll('.fkgen, .fkfam, .fkgroup').forEach(el => (el.hidden = !el.querySelector('.fksp:not([hidden])')));
      root.querySelectorAll('[data-jump]').forEach(b => {
        const el = root.querySelector(`[data-fam="${CSS.escape(b.dataset.jump)}"]`);
        b.hidden = !!(el && el.hidden);
      });
      root.querySelectorAll('.fkig').forEach(g => (g.hidden = !g.querySelector('[data-jump]:not([hidden])')));
      root.querySelector('.fkempty').hidden = n > 0;
      root.querySelector('.fkcount').textContent = q ? `${n} of ${I.sp.length}` : `${I.sp.length} species`;
    };
    const setPhotos = raw => {
      photos = photosOf(raw);
      root.querySelectorAll('.fksp').forEach(li => {
        const s = byFam.get(li.dataset.sp),
          t = li.querySelector('.fkth');
        if (s && t) t.outerHTML = thumbOf(s.s);
      });
    };
    // "/" focuses the search here (elsewhere it opens Genera: app.js), before the page's own handler.
    const slash = e => {
      if (e.key !== '/' || e.altKey || e.ctrlKey || e.metaKey || !lb.hidden) return;
      if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable]')) return;
      const q = root.querySelector('#fkq');
      if (!q) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      q.focus();
      q.select();
    };
    document.addEventListener('keydown', slash, true);
    root.innerHTML = '<p class="note">Loading the fish…</p>';
    treeHome(S.id)
      .then(raw => {
        if (!alive) return;
        F = raw.f;
        I = FISHKEY.index(F);
        I.fams.forEach(f =>
          f.gens.forEach(g =>
            g.sp.forEach(s => {
              byFam.set(s.id, {s, f});
              W.set(s.id, FISHKEY.words(s, f, F));
            })
          )
        );
        photos = photosOf(raw);
        draw();
        return treeLoad(S.id).then(() => alive && setPhotos(treeOf(S.id).TREERAW || raw));
      })
      .catch(() => {
        if (alive && !I)
          root.innerHTML = '<p class="note">The fish data could not load. Check the connection and open this page again.</p>';
      });
    return () => {
      alive = false;
      document.removeEventListener('keydown', slash, true);
    };
  }
});
