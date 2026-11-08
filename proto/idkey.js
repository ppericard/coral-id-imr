// Coral ID Key: one page to keep open beside ReefCloud. It only cross-references existing sources (no categories of
// its own): the Coral Finder book's growth form and box, corallite size, walls, other features, IMR lecture group, name) is a filter
// that can be used in any order; the shortlist updates at once and shows every candidate with its local photos.
// Clues rank, they never eliminate: a clue can be wrong or misjudged (size, shape), so a genus that misses one
// clue stays in view under "One clue off", and a size one class away counts as half a match.
// It replaced the growth-form key and the corallite filters in Identify (#key, #key-tr, #k-, #l- redirect here).
// State lives in the hash (#identify/key?<state>), so a reload or a shared link keeps the shortlist.
LAB.add({
  id: 'idkey',
  icon: '⌕',
  title: 'Coral ID Key',
  blurb:
    'Start from whatever you can see, in any order: growth form, corallites or IMR lecture group. The shortlist updates at once, with all local photos.',
  lede: 'Tap the clues you can see on your photo, in any order. Genera are ranked by how well they fit: one wrong or misjudged clue only moves a genus down, it never hides it. Made to stay open beside ReefCloud.',
  render(root, arg) {
    // Genera not on the IMR list but in the Coral Finder book and present at Dauin (data.json "x"): on by default, switch in ⚙.
    // They join the ranking after the IMR genera of the same rank, with their own boxes (book A-Z index) and tag.
    const XG = XON && DATA.x ? DATA.x.gen : {},
      notIMR = n => !DATA.gen[n],
      slate = new Set(slateGenera()); // the slate as the games count it (Millepora too): the same number everywhere
    const names = [...labNames(), ...Object.keys(XG)],
      G = {...DATA.gen, ...XG};
    const addX = k => ({...k, leaves: k.leaves.map(l => ({...l, g: [...l.g, ...(XON && DATA.x ? DATA.x.leaf[l.id] || [] : [])]}))});
    const KEY = [...DATA.key, ...(XON && DATA.x ? DATA.x.groups : [])].map(addX);
    const xtag = n => (G[n].x.nonscl ? 'Not on IMR list · not a hard coral' : 'Not on IMR list');
    const uniq = L => [...new Set(L)];
    // Genera that can show a trait; `half` those that show it in some species only (lab.js trHas): half a match.
    const withTr = id => names.filter(n => trHas(G[n], id) > 0),
      halfTr = id => names.filter(n => trHas(G[n], id) === 0.5);
    // Facets: id, title, options {id, t, g (genera)}. Within a facet picks mean either/or; facets combine.
    const CFF = KEY.map(k => ({id: k.id, t: k.name, s: k.sub, g: uniq(k.leaves.flatMap(l => l.g)), color: k.color}));
    // IMR Lecture 6 growth forms (forms.json "forms"). The lecture says form is plastic: like every clue it only ranks.
    const IMRCOL = {B: 'branch', E: 'plate', T: 'meander', U: 'solo', M: 'massive', S: 'column', F: 'polyp'};
    // Display order (Pierre: more logical than the lecture's numbering): branching then tables (secondary branching),
    // then the lumps from columns to domes, then the flat forms, then the solitary mushrooms.
    const IMRORD = 'BTSMEFU';
    const IMRF = [...(FORMS.forms || [])]
      .sort((a, b) => ((IMRORD.indexOf(a.id) + 99) % 99) - ((IMRORD.indexOf(b.id) + 99) % 99))
      .map(f => ({id: f.id, t: f.name, s: f.def, g: names.filter(n => imrFormsOf(n).includes(f.id)), color: IMRCOL[f.id] || 'massive'}));
    // Two entry points: the paper Coral Finder's path (default: Pierre, 2026-10-31, it is the reference for ReefCloud)
    // or the IMR Lecture 6 growth forms. New key so the new default reaches browsers that stored the old one.
    let startV = store.get('reefid-idkey-start2', 'c');
    if (startV !== 'a') startV = 'c';
    const facets = () => {
      // Each family's note shows as a tooltip on its title (Pierre: no explanatory text on the page).
      const forms = CFF.filter(f => S.form.has(f.id));
      // The growth-form system picked on the start screen leads, open; the other one follows, folded.
      const cf = startV === 'c';
      const imrF = {
        id: 'imrf',
        name: cf ? 'IMR growth form' : 'Growth form',
        note: "The 7 growth forms of IMR Lecture 6, as seen on each genus's photos and in the Coral Finder book. Form is plastic: it ranks, never rules out.",
        thumbs: true,
        closed: cf,
        opts: IMRF
      };
      const cfF = {
        id: 'form',
        name: 'Coral Finder book growth form',
        note: "The Coral Finder book's front page. Many genera take several forms.",
        thumbs: true,
        closed: !cf,
        opts: CFF
      };
      return [
        ...(cf ? [cfF, imrF] : [imrF, cfF]),
        ...(forms.length
          ? [
              {
                id: 'box',
                name: forms.map(f => f.t).join(' / ') + ' ›',
                note: 'Coral Finder book, second step: the boxes of the growth form picked above.',
                // Titled by its form, as on the genus sheet's key path (Pierre: "Coral Finder box" said nothing to RAs).
                opts: forms.flatMap(f =>
                  KEY.find(k => k.id === f.id)
                    .leaves.filter(l => l.g.length && f.id !== 'L' && f.id !== 'C')
                    .map(l => ({id: l.id, t: leafLabel(l), g: l.g, pg: pg(l)}))
                )
              }
            ]
          : []),
        ...DATA.traits.map(c => ({
          id: c.id,
          name: c.name,
          note: c.note,
          opts: c.opts.map(o => ({id: o.id, t: o.t, s: o.src, g: withTr(o.id), half: halfTr(o.id)}))
        })),
        {
          id: 'ig',
          name: 'IMR lecture group',
          note: 'The 11 corallite groups of Lecture 6.',
          thumbs: true,
          opts: DATA.imrg.map(gr => ({id: 'g' + gr.n, t: gr.n + '. ' + gr.t, g: names.filter(n => G[n].ig === gr.n)}))
        }
      ].filter(f => f.opts.length);
    };
    const FIDS = ['imrf', 'form', 'box', ...DATA.traits.map(c => c.id), 'ig'];
    // State, read from and written back to the hash.
    // not = "No" answers to the suggested questions ("f.id" keys): a genus WITH that feature counts one clue off (ranks, never
    // hides). skip = questions answered "Can't tell" (this visit only), so the next best question shows instead.
    const S = {out: new Set(), cmp: [], q: '', open: new Set(), home: true, all: new Set(), not: new Set(), skip: new Set()};
    FIDS.forEach(f => (S[f] = new Set()));
    // Two display controls that combine: layout (Auto = Mosaic up to 12 genera, Cards beyond; Cards = one photo per genus; Mosaic;
    // Contact sheet) and which photos (Mix of colony / closer / corallites, or one view only).
    let lay = store.get('reefid-idkey-lay', 'auto'),
      pv = store.get('reefid-idkey-pv', 'mix');
    (arg || '').split(';').forEach(kv => {
      const [k, v] = kv.split('=');
      if (!v) return;
      const L = decodeURIComponent(v).split(',');
      if (FIDS.includes(k)) L.forEach(x => S[k].add(x));
      else if (k === 'out') L.forEach(x => G[x] && S.out.add(x));
      else if (k === 'all') L.forEach(x => S.all.add(x));
      else if (k === 'not')
        L.forEach(x => {
          const [f, id] = x.split('.');
          if (FIDS.includes(f) && id) S.not.add(x);
        });
      else if (k === 'q') S.q = L.join(',');
    });
    // Start screen (one screen, a few clues, then the shortlist) unless the link already carries clues.
    if (FIDS.some(f => S[f].size) || S.q || S.out.size || S.not.size) S.home = false;
    const saveHash = () => {
      const parts = FIDS.filter(f => S[f].size).map(f => f + '=' + [...S[f]].join(','));
      if (S.out.size) parts.push('out=' + [...S.out].join(','));
      if (S.not.size) parts.push('not=' + [...S.not].join(','));
      const all = [...S.all].filter(f => S[f] && S[f].size > 1);
      if (all.length) parts.push('all=' + all.join(','));
      if (S.q) parts.push('q=' + encodeURIComponent(S.q));
      history.replaceState(null, '', hr('idkey' + (parts.length ? '|' + parts.join(';') : '')));
    };
    // How well a genus fits one clue family: 1 if one of its picks lists the genus, 0.5 if the best pick is a trait of
    // some of its species only (o.half) or a corallite size one class away (sizes are easy to misjudge on a photo),
    // else 0. Unused families don't count.
    const SIZES = DATA.traits.find(c => c.id === 'size').opts.map(o => o.id);
    // Several growth forms picked on one colony: "Not sure" (default) = any of them fits; "Both" = the genus must take
    // them all (a genus taking only some of them is half a miss, so it is one clue off rather than gone).
    const ANDF = ['imrf', 'form'],
      isAll = id => ANDF.includes(id) && S.all.has(id) && S[id].size > 1;
    const hit = (n, f) => {
      if (isAll(f.id)) {
        const P = f.opts.filter(o => S[f.id].has(o.id)),
          k = P.filter(o => o.g.includes(n)).length;
        return k === P.length ? 1 : k ? 0.5 : 0;
      }
      const of = o => (!o.g.includes(n) ? 0 : (o.half || []).includes(n) ? 0.5 : 1),
        best = Math.max(0, ...f.opts.filter(o => S[f.id].has(o.id)).map(of));
      if (best === 1) return 1;
      if (
        f.id === 'size' &&
        [...S.size].some(id => {
          const i = SIZES.indexOf(id);
          return [SIZES[i - 1], SIZES[i + 1]].some(x => x && trHas(G[n], x) > 0);
        })
      )
        return 0.5;
      return best;
    };
    // Penalty: how many clues the genus misses (halves for near sizes); misses: the families it misses.
    const used = (F, skip) => F.filter(f => f.id !== skip && S[f.id].size);
    // A "No" answer: the genera that have the feature miss that clue (half a clue when only some of their species have it).
    const optOf = (F, k) => {
      const [fid, id] = k.split('.'),
        f = F.find(x => x.id === fid),
        o = f && f.opts.find(x => x.id === id);
      return o ? {f, o} : null;
    };
    const nots = F => [...S.not].map(k => optOf(F, k)).filter(Boolean);
    const notPen = (n, o) => (!o.g.includes(n) ? 0 : (o.half || []).includes(n) ? 0.5 : 1);
    const pen = (n, F, skip) => used(F, skip).reduce((t, f) => t + 1 - hit(n, f), 0) + nots(F).reduce((t, {o}) => t + notPen(n, o), 0);
    const misses = (n, F) => [
      ...used(F)
        .filter(f => hit(n, f) < 1)
        .map(f => f.name + (hit(n, f) ? ' (close)' : '')),
      ...nots(F)
        .filter(({o}) => o.g.includes(n))
        .map(({o}) => 'not ' + o.t + ((o.half || []).includes(n) ? ' (close)' : ''))
    ];
    const fitsQ = n => !S.q || n.toLowerCase().includes(S.q.toLowerCase());
    const fits = (n, F, skip) => fitsQ(n) && pen(n, F, skip) === 0;
    const thumb = (n, v = 'medium') => {
      const p = (G[n].views[v] || [])[0] || cover(G[n]);
      return p ? img(p, 's') : '';
    };
    // Each growth-form tile shows 3 photos (one large, two small: Pierre 2026-11-01) tagged with that form (photo growth form, checked in admin), one genus per
    // photo and a different genus on each tile where possible; a genus only comes back when its form has too few.
    // Pierre's pinned photos lead (curation.json "tile" {IMR form letter: [f, ...]}, 📌 in admin > Growth form): on its
    // IMR form's tile and on the Coral Finder tile that starts from that form (first letter of forms.json "cf"; never
    // Meandering, which maps to every form). A pin no longer of that form, or of a genus off the tile, is skipped.
    const PINS = (CUR && CUR.tile) || {},
      pinLead = (c, per, order, seen) => {
        const byF = new Map();
        per.forEach((P, k) => P.forEach(p => byF.has(p.f) || byF.set(p.f, [p, order[k]])));
        return ((c && PINS[c]) || [])
          .map(f => byF.get(f))
          .filter(Boolean)
          .slice(0, 3)
          .map(([p, n]) => {
            seen.add(n);
            return p;
          });
      };
    const fill = (pick, per, order, seen) => {
      for (let i = 0; pick.length < 3 && per.some(P => P[i]); i++)
        per.forEach((P, k) => {
          if (P[i] && pick.length < 3 && !pick.includes(P[i])) {
            pick.push(P[i]);
            seen.add(order[k]);
          }
        });
    };
    const tilePics = (() => {
      const seen = new Set(),
        out = {};
      [...CFF]
        .sort((a, b) => a.g.length - b.g.length)
        .forEach(f => {
          const L = bySlate(f.g),
            order = [...L.filter(x => !seen.has(x)), ...L.filter(x => seen.has(x))],
            per = order.map(x => formPhotos(x, f.id));
          const pick = f.id === 'M' ? [] : pinLead((CFMAP[f.id] || '').replace('p', '')[0], per, order, seen);
          fill(pick, per, order, seen);
          // A form with no classified photo (the book's non-hard-coral group): the genera's cover photos.
          if (!pick.length)
            L.slice(0, 3).forEach(x => {
              const p = cover(G[x]);
              if (p) pick.push(p);
            });
          out[f.id] = pick;
        });
      return out;
    })();

    (() => {
      const seen = new Set();
      [...IMRF]
        .sort((a, b) => a.g.length - b.g.length)
        .forEach(f => {
          const L = bySlate(f.g),
            order = [...L.filter(x => !seen.has(x)), ...L.filter(x => seen.has(x))],
            per = order.map(x => imrFormPhotos(x, f.id)),
            pick = pinLead(f.id, per, order, seen);
          fill(pick, per, order, seen);
          tilePics['imrf:' + f.id] = pick;
        });
    })();
    root.innerHTML = `<section class="ikstart" id="ikstart" hidden></section><div class="iklayout"><aside class="ikside" id="ikside"></aside><section class="ikmain" id="ikmain"></section></div><div class="ikcmp" id="ikcmp" hidden></div>`;
    const $start = root.querySelector('#ikstart'),
      $lay = root.querySelector('.iklayout');
    const $side = root.querySelector('#ikside'),
      $main = root.querySelector('#ikmain'),
      $cmp = root.querySelector('#ikcmp');
    // One Start over only: the prominent button beside the chosen clues (Pierre, 2026-10-31). Escape does the same.
    const reset = () => {
      FIDS.forEach(f => S[f].clear());
      S.out.clear();
      S.not.clear();
      S.skip.clear();
      S.all.clear();
      S.cmp = [];
      S.q = '';
      S.home = true;
      draw();
    };
    // On phones the panel sits above the shortlist: only growth form and the families in use start open.
    function drawSide(F, left) {
      const narrow = isPhone(),
        phone = narrow; // one size system (app.js MQ): the clue panel stacks on phones only
      $side.hidden = phone && !S.open.has('side');
      $side.innerHTML = `${F.map(f => {
        const picked = S[f.id].size,
          open = picked || S.open.has(f.id) || (narrow ? f.id === (startV === 'c' ? 'form' : 'imrf') : !f.closed);
        return `<details class="ikfacet" data-f="${f.id}"${open ? ' open' : ''}><summary${f.note ? ` title="${esc(f.note)}"` : ''}>${esc(f.name)}${picked ? ` <span class="ikn">${picked}</span>` : ''}</summary>
        <div class="ikopts${f.thumbs ? ' th' : ''}">${f.opts
          .map(o => {
            const on = S[f.id].has(o.id),
              n = names.filter(x => !S.out.has(x) && fits(x, F, f.id) && o.g.includes(x)).length;
            const pv = f.thumbs
              ? `<span class="ikth">${(f.id === 'form' || f.id === 'imrf'
                  ? (tilePics[f.id === 'imrf' ? 'imrf:' + o.id : o.id] || []).slice(0, 3).map(p => img(p, 's'))
                  : bySlate(o.g)
                      .slice(0, 3)
                      .map(x => thumb(x, 'medium'))
                )
                  .map(u => `<img src="${u}" alt="" loading="lazy">`)
                  .join('')}</span>`
              : '';
            return `<button type="button" class="ikopt${f.id === 'form' || f.id === 'imrf' ? ' c-' + o.color : ''}${f.id === 'ig' ? ' gchip' : ''}"${f.id === 'ig' ? ` style="--g:${groupHue(+o.id.slice(1))}"` : ''} data-o="${f.id}|${o.id}" aria-pressed="${on}"${!n && !on ? ' data-zero' : ''} title="${esc(o.s || o.t)}">${pv}<span class="ikt">${esc(o.t)}${o.pg ? ` <small>${o.pg}</small>` : ''}</span><span class="ikc">${n}</span></button>`;
          })
          .join('')}</div>${ANDF.includes(f.id) ? andSw(f.id) : ''}</details>`;
      }).join(
        ''
      )}${narrow ? `<p><a class="next ikjump" href="#ikmain">See the ${left.length} best ${left.length === 1 ? 'fit' : 'fits'} ↓</a></p>` : ''}`;
      andWire($side);
      const jump = $side.querySelector('.ikjump');
      if (jump)
        jump.onclick = e => {
          e.preventDefault();
          S.open.delete('side');
          draw();
          $main.scrollIntoView({block: 'start'});
        };
      $side
        .querySelectorAll('details.ikfacet')
        .forEach(d => (d.ontoggle = () => (d.open ? S.open.add(d.dataset.f) : S.open.delete(d.dataset.f))));
      $side.querySelectorAll('[data-o]').forEach(
        b =>
          (b.onclick = () => {
            const [f, id] = b.dataset.o.split('|');
            S[f].has(id) ? S[f].delete(id) : S[f].add(id);
            // Boxes belong to a growth form: drop those whose form is no longer picked.
            if (f === 'form')
              [...S.box].forEach(x => {
                if (!S.form.has(x[0])) S.box.delete(x);
              });
            draw();
          })
      );
    }

    // Best next checks: unpicked options that split the shortlist most evenly, asked as a question with two big answer
    // buttons (Pierre, 2026-11-01: the old box had tiny targets, unclear what to tap, empty space). Each answer shows how
    // many genera and which ones (photos) are on its side. Yes adds the clue; No adds a "not" clue (genera with the
    // feature move one clue down, never hidden); Can't tell moves on to the next best question.
    function nextChecks(F, left) {
      if (left.length < 2) return '';
      const cands = F.filter(f => f.id !== 'ig' && !S[f.id].size && !(startV === 'c' && f.id === 'imrf'))
        .flatMap(f =>
          f.opts
            .filter(o => !S.not.has(f.id + '.' + o.id) && !S.skip.has(f.id + '.' + o.id))
            .map(o => {
              const yes = left.filter(n => o.g.includes(n));
              return {f, o, yes, no: left.filter(n => !yes.includes(n)), s: Math.min(yes.length, left.length - yes.length)};
            })
        )
        .filter(x => x.s > 0)
        .sort((a, b) => b.s - a.s)
        .filter((x, i, L) => L.findIndex(y => y.f === x.f) === i)
        .slice(0, 2); // one question per family
      if (!cands.length)
        return `<p class="note ikhint">The Coral ID Key criteria cannot split these any further: compare the photos below.</p>`;
      // Corallite clues show corallite photos; form and box clues the closer view. At most 8 cells: 7 photos and "+N" beyond.
      const side = (L, x) => {
        const v = ['size', 'wall', 'feat'].includes(x.f.id) ? 'macro' : 'medium',
          k = L.length > 8 ? 7 : 8;
        return (
          L.slice(0, k)
            .map(n => `<img src="${thumb(n, v)}" alt="${esc(n)}" title="${esc(n)}" loading="lazy">`)
            .join('') + (L.length > k ? `<span class="ikplus">+${L.length - k}</span>` : '')
        );
      };
      const q = x => (x.f.id === 'size' ? 'Corallites ' : '') + x.o.t + '?';
      const ans = (x, yes) => {
        const L = yes ? x.yes : x.no;
        return `<button type="button" class="ikans ${yes ? 'yes' : 'no'}" data-${yes ? 'yes' : 'no'}="${x.f.id}.${x.o.id}" aria-label="${yes ? 'Yes' : 'No'}: ${L.length} genera"><span class="ikal">${yes ? 'Yes' : 'No'} <span class="ikc">${L.length}</span></span><span class="ikat">${side(L, x)}</span></button>`;
      };
      return `<div class="iknext">${cands.map(x => `<div class="ikq"><div class="ikqh"><b${x.o.s ? ` title="${esc(x.o.s)}"` : ''}>${gloss(q(x))}</b><button type="button" class="linkish ikskip" data-skip="${x.f.id}.${x.o.id}">Can't tell</button></div><div class="ikqa">${ans(x, true)}${ans(x, false)}</div></div>`).join('')}</div>`;
    }

    // Where a photo comes from (same split as the admin's origin tags), for the Dauin count; the credit itself is in the lightbox.
    const src = p => (p.imr ? 'imr' : p.own || p.loc === 'dauin' ? 'dauin' : p.loc === 'ph' ? 'ph' : 'world');
    function drawMain(F, left, close, rest) {
      const flat = [],
        mode = lay === 'auto' ? (left.length <= 12 ? 'mosaic' : 'cover') : lay;
      const ph = (n, p, v) => {
        flat.push({...p, genus: n, view: v});
        return `<button type="button" class="zoom ikph" data-z="${flat.length - 1}"><img src="${img(p, 's')}" srcset="${srcset(p)}" sizes="(max-width:700px) 50vw, 360px" alt="${esc(n)}, ${esc(VIEW_LABEL[v] || v)}" loading="lazy"></button>`;
      };
      const tools = n =>
        `<span class="iktools"><button type="button" class="chip" data-out="${esc(n)}" title="Rule out ${esc(n)}">Rule out</button>${notIMR(n) ? '' : `<button type="button" class="chip" data-cmpk="${esc(n)}" aria-pressed="${S.cmp.includes(n)}">Compare</button>`}</span>`;
      // Clicking a genus name opens it in place (all its photos, bigger, with the ID cues); the sheet is a small link.
      const isX = n => S.open.has('x:' + n);
      const head = n =>
        `<span class="ikhead"><button type="button" class="ikname" data-x="${esc(n)}" aria-expanded="${isX(n)}"><i>${esc(n)}</i></button><a class="iksheetl" href="${genLink(n)}" title="Open the ${esc(n)} sheet">Sheet ↗</a></span><small>${notIMR(n) ? `<b class="ikxtag">${xtag(n)}</b>` : tag(n)} · ${esc(altName(G[n].fam))}${G[n].ig ? ' · IMR group ' + G[n].ig : ''}</small>`;
      // Many varied examples at a glance, as on the paper Coral Finder's pages: cover first, then round-robin over
      // colony / closer / corallites (featured photos lead each view), a different observation each time when possible.
      // With one view picked, only that view's photos (all views when the genus has none of it).
      const varied = (g, k, n) => {
        const one = pv !== 'mix' && (g.views[pv] || []).length,
          c = one ? null : (n && formCover(n)) || cover(g);
        // Capped set per view (core.js applySlots): the featured photos, then up to 5 from other observers.
        const mix = v => (((g.sl || {})[v] || {}).idkey || []).filter(p => !c || p.f !== c.f).map(p => ({...p, view: v}));
        const L = (one ? [[pv]] : VIEWS).map(([v]) => mix(v));
        const out = c ? [c] : [],
          used = new Set(c ? [c.o] : []);
        let i = 0;
        while (out.length < k && L.some(x => x.length)) {
          const Q = L[i++ % L.length];
          if (!Q.length) continue;
          const j = Q.findIndex(p => !used.has(p.o));
          const p = Q.splice(j >= 0 ? j : 0, 1)[0];
          used.add(p.o);
          out.push(p);
        }
        return out;
      };
      // With a growth form picked, the lead photo shows the genus in that form (photo growth form, checked in admin), so a
      // newcomer never compares a massive colony with a branching cover (first-time RA review, 2026-11-01). The cover stays
      // when it already shows that form; a genus with no photo of the form keeps its cover.
      const formCover = n => {
        if (pv !== 'mix' || !(S.form.size || S.imrf.size)) return null;
        const rank = p => (p.imr ? 0 : p.own ? 1 : 2); // photo priority: IMR lecture, then Pierre's own, then the rest
        const P = [...[...S.form].flatMap(id => formPhotos(n, id)), ...[...S.imrf].flatMap(id => imrFormPhotos(n, id))]
          .map((p, i) => [p, i])
          .sort((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1])
          .map(a => a[0]);
        if (!P.length) return null;
        const c = cover(G[n]);
        return c && P.some(p => p === c || (p.f && p.f === c.f)) ? c : P[0];
      };
      const more = n => {
        const all = VIEWS.flatMap(([v]) => ((G[n].sl || {})[v] || {}).idkey || []),
          own = all.filter(p => src(p) === 'dauin').length;
        return all.length > 8
          ? `<button type="button" class="linkish ikmore" data-x="${esc(n)}">All ${all.length} photos${own ? ` (${own} from Dauin)` : ''}</button>`
          : '';
      };
      const mosaic = n => {
        const g = G[n];
        return `<article class="ikrow"><div class="ikinfo">${head(n)}<p class="iktip">${gloss(tipsText(g))}</p>${tools(n)}${more(n)}</div>
          <div class="ikmos">${varied(g, 8, n)
            .map(p => ph(n, p, p.view))
            .join('')}</div></article>`;
      };
      // Opened genus: photos dominate; a narrow side column holds the name, the IMR cue, the tools and (folded) the
      // Coral ID Key criteria (the Coral Finder book's text, cited by page).
      const big = (n, off) => {
        const g = G[n];
        return `<article class="ikbig${off ? ' off' : ''}"><div class="ikinfo ikbigside">${head(n)}${off ? `<small class="ikmiss">Off: ${misses(n, F).map(esc).join(', ')}</small>` : ''}
          <p class="ikcue iktip">${gloss(tipsText(g))}</p><details class="ikcrit"${notIMR(n) ? ' open' : ''}><summary>Criteria <small>· Coral Finder p. ${g.pages.join(', ')}</small></summary><ul>${glossAll(
            g.crit
          )
            .map(c => `<li>${c}</li>`)
            .join('')}</ul></details>${tools(n)}</div>
          <div class="ikbigph">${varied(g, 99, n)
            .map(p => ph(n, p, p.view))
            .join('')}</div></article>`;
      };
      // Contact sheet: one line per genus with all its photos, small, to scan the whole shortlist line by line.
      const sheet = n =>
        isX(n)
          ? big(n)
          : `<article class="iksheet"><div class="ikinfo">${head(n)}</div><div class="ikall">${varied(G[n], 99, n)
              .map(p => ph(n, p, p.view))
              .join('')}</div></article>`;
      // Photos follow the admin's curation (applied to DATA in app.js): hidden ones are gone, featured ones lead each
      // view, and Auto and "One clue off" tiles show the genus cover. The header's origin filter applies too.
      const tile = (n, off) => {
        if (isX(n)) return big(n, off);
        const g = G[n],
          v = pv === 'mix' ? null : pv,
          p = v ? (g.views[v] || [])[0] || cover(g) : formCover(n) || cover(g);
        return `<article class="iktile${off ? ' off' : ''}">${p ? ph(n, p, v && (g.views[v] || [])[0] ? v : p.view || 'medium') : '<span class="none">no photo</span>'}<div class="ikinfo">${head(n)}${off ? `<small class="ikmiss">Off: ${misses(n, F).map(esc).join(', ')}</small>` : ''}<p class="iktip">${gloss(tipsText(g))}</p>${tools(n)}</div></article>`;
      };
      // Look-alikes outside the shortlist: worth a glance before deciding.
      const near =
        left.length && left.length <= 3
          ? uniq(left.flatMap(n => lookOf(n))).filter(n => G[n] && !left.includes(n) && !close.includes(n))
          : [];
      const chosen = F.flatMap(f => f.opts.filter(o => S[f.id].has(o.id)).map(o => ({f, o})));
      // Phones: with genera fitting every clue, "One clue off" starts folded (one tap opens it) so the best fits are not buried.
      const foldOff = left.length && isPhone() && !S.open.has('off');
      const any = used(F).length + S.not.size;
      const hd = `<div class="ikhd"><h3 class="ikgrp">${any ? 'Fits every clue' : XON ? 'Genera' : 'IMR genera'} <span class="ikn">${left.length}</span></h3><span class="iksegs"><span class="seg" role="group" aria-label="Layout">${[
        ['auto', 'Auto', 'Mosaic up to 12 genera, Cards beyond'],
        ['cover', 'Cards', 'One photo and the key features per genus'],
        ['mosaic', 'Mosaic', '8 varied photos per genus'],
        ['sheet', 'Contact sheet', 'Every photo of each genus']
      ]
        .map(
          ([v, t, h]) =>
            `<button type="button" data-lay="${v}" aria-pressed="${lay === v}" title="${h}">${t}${v === 'auto' && lay === 'auto' ? ` <small>(${mode === 'mosaic' ? 'Mosaic' : 'Cards'})</small>` : ''}</button>`
        )
        .join('')}</span>
        <span class="seg" role="group" aria-label="Photos">${[['mix', 'Mix'], ...VIEWS].map(([v, t]) => `<button type="button" data-pv="${v}" aria-pressed="${pv === v}">${t}</button>`).join('')}</span></span></div>`;
      // Chips wrap on the left, Start over stays on their first line at the right (no row of its own on phones).
      $main.innerHTML = `<div class="ikbar"><span class="ikchips">${chosen.map(({f, o}) => `<button type="button" class="chip" data-o="${f.id}|${o.id}" title="Remove">${esc(o.t)} ×</button>`).join('')}${nots(
        F
      )
        .map(
          ({f, o}) =>
            `<button type="button" class="chip iknot" data-unnot="${f.id}.${o.id}" title="Remove">No: ${esc((f.id === 'size' ? 'corallites ' : '') + o.t)} ×</button>`
        )
        .join(
          ''
        )}${S.q ? `<button type="button" class="chip" data-clearq>“${esc(S.q)}” ×</button>` : ''}${isPhone() ? `<button type="button" class="chip ikadd" data-side aria-pressed="${S.open.has('side')}">${S.open.has('side') ? 'Hide clues' : '+ Clue'}</button>` : ''}</span>${chosen.length || S.q || S.out.size || S.not.size ? `<button type="button" class="next ikreset2" data-reset>↺ Start over</button>` : ''}</div>
        ${any ? nextChecks(F, left.length ? left : close) : ''}
        ${left.length ? `${hd}<div class="${mode === 'mosaic' ? 'ikrows' : mode === 'sheet' ? 'iksheets' : 'ikgrid'}">${left.map(n => (isX(n) && mode === 'mosaic' ? big(n) : mode === 'mosaic' ? mosaic(n) : mode === 'sheet' ? sheet(n) : tile(n))).join('')}</div>` : `<p class="note">No ${XON ? '' : 'IMR '}genus fits every clue: one of them may be wrong. Check the closest genera below.</p>`}
        ${close.length ? (foldOff ? `<details class="ikoff"><summary class="ikgrp">${close.length} genera one clue off <small>in case a clue was misjudged</small></summary><div class="ikgrid">${close.map(n => tile(n, true)).join('')}</div></details>` : `<h3 class="ikgrp">One clue off <span class="ikn">${close.length}</span> <small>in case a clue was misjudged</small></h3><div class="ikgrid">${close.map(n => tile(n, true)).join('')}</div>`) : ''}
        ${rest.length ? `<details class="ikrest"><summary>${rest.length} other genera <small>two clues off or more</small></summary><p class="ikchosen">${rest.map(n => `<a class="chip" href="${genLink(n)}"><img src="${thumb(n, 'macro')}" alt=""><i>${esc(n)}</i></a>`).join('')}</p></details>` : ''}
        ${near.length ? `<p class="iknear"><span class="label">Also check these look-alikes</span>${near.map(n => `<a class="chip" href="${notIMR(n) || notIMR(left[0]) ? genLink(n) : hr(`cmp-${left[0]}|${n}`)}"${(G[left[0]].lsrc || {})[n] ? ` title="${esc(G[left[0]].lsrc[n])}"` : ''}><img src="${thumb(n, 'macro')}" alt=""><i>${esc(n)}</i></a>`).join('')}</p>` : ''}
        ${S.out.size ? `<p class="ikouts"><span class="label">Ruled out</span>${[...S.out].map(n => `<button type="button" class="chip" data-back="${esc(n)}" title="Bring back"><i>${esc(n)}</i> ↺</button>`).join('')}</p>` : ''}`;
      $main.querySelectorAll('[data-z]').forEach(b => (b.onclick = () => zoom(flat, Number(b.dataset.z))));
      const off = $main.querySelector('.ikoff');
      if (off) off.ontoggle = () => (off.open ? S.open.add('off') : S.open.delete('off'));
      $main.querySelectorAll('[data-lay]').forEach(
        b =>
          (b.onclick = () => {
            lay = b.dataset.lay;
            store.set('reefid-idkey-lay', lay);
            draw();
          })
      );
      $main.querySelectorAll('[data-pv]').forEach(
        b =>
          (b.onclick = () => {
            pv = b.dataset.pv;
            store.set('reefid-idkey-pv', pv);
            draw();
          })
      );
      $main.querySelectorAll('[data-o]').forEach(
        b =>
          (b.onclick = () => {
            const [f, id] = b.dataset.o.split('|');
            S[f].has(id) ? S[f].delete(id) : S[f].add(id);
            if (f === 'form')
              [...S.box].forEach(x => {
                if (!S.form.has(x[0])) S.box.delete(x);
              });
            draw();
          })
      );
      // A prominent Start over beside the chosen clues (Pierre, 2026-10-31): one tap for the next colony, at every width.
      const rs = $main.querySelector('[data-reset]');
      if (rs) rs.onclick = reset;
      const sd = $main.querySelector('[data-side]');
      if (sd)
        sd.onclick = () => {
          S.open.has('side') ? S.open.delete('side') : S.open.add('side');
          draw();
          if (S.open.has('side')) $side.scrollIntoView({block: 'start'});
        };
      const cq = $main.querySelector('[data-clearq]');
      if (cq)
        cq.onclick = () => {
          S.q = '';
          draw();
        };
      $main.querySelectorAll('[data-out]').forEach(
        b =>
          (b.onclick = () => {
            S.out.add(b.dataset.out);
            S.cmp = S.cmp.filter(x => x !== b.dataset.out);
            draw();
          })
      );
      $main.querySelectorAll('[data-back]').forEach(
        b =>
          (b.onclick = () => {
            S.out.delete(b.dataset.back);
            draw();
          })
      );
      $main.querySelectorAll('[data-x]').forEach(
        b =>
          (b.onclick = () => {
            const k = 'x:' + b.dataset.x;
            S.open.has(k) ? S.open.delete(k) : S.open.add(k);
            draw();
            const a = $main.querySelector(`[data-x="${CSS.escape(b.dataset.x)}"]`);
            if (a && S.open.has(k)) a.closest('article').scrollIntoView({block: 'nearest', behavior: 'smooth'});
          })
      );
      $main.querySelectorAll('[data-cmpk]').forEach(
        b =>
          (b.onclick = () => {
            const n = b.dataset.cmpk;
            S.cmp = S.cmp.includes(n) ? S.cmp.filter(x => x !== n) : [...S.cmp, n].slice(-2);
            draw();
          })
      );
    }

    // Start screen: the clues people actually start from, on one screen, before any list of genera.
    // C (default, Pierre 2026-10-31: the Coral Finder is the reference for ReefCloud) = the paper Coral Finder's path
    // (front-page form, then the box of that form); A = IMR growth forms, polyps out, corallite size, walls, as a discreet link.
    const formTile = (fid, o, on, n) => {
      const P = tilePics[fid === 'imrf' ? 'imrf:' + o.id : o.id] || [];
      return `<button type="button" class="iktileb c-${o.color}" data-o="${fid}|${o.id}" aria-pressed="${on}"${!n && !on ? ' data-zero' : ''} title="${esc(o.s || '')}">
      <span class="iktq n${P.length}">${P.map(p => `<img src="${img(p, 's')}" alt="" loading="lazy">`).join('')}</span>
      <span class="iktt"><b>${esc(o.t)}</b>${fid === 'form' ? `<small>${esc(o.s || '')}</small>` : ''}</span><span class="ikc">${n}</span></button>`;
    };
    // Shown once two or more forms are picked: what two forms mean on the one colony being identified.
    const andSw = fid =>
      S[fid].size < 2
        ? ''
        : `<div class="seg ikand" role="group" aria-label="Several forms"><button type="button" data-and="${fid}|0" aria-pressed="${!S.all.has(fid)}">Not sure which form</button><button type="button" data-and="${fid}|1" aria-pressed="${S.all.has(fid)}">Both on this colony</button></div>`;
    const andWire = el =>
      el.querySelectorAll('[data-and]').forEach(
        b =>
          (b.onclick = () => {
            const [f, v] = b.dataset.and.split('|');
            v === '1' ? S.all.add(f) : S.all.delete(f);
            draw();
          })
      );
    const optBtn = (f, o, on, n) =>
      `<button type="button" class="ikbigopt" data-o="${f.id}|${o.id}" aria-pressed="${on}"${!n && !on ? ' data-zero' : ''} title="${esc(o.s || o.t)}"><span>${gloss(o.t, undefined, true)}${o.pg ? ` <small>${o.pg}</small>` : ''}</span><span class="ikc">${n}</span></button>`;
    // Coral Finder box drawings (Pierre 2026-11-01: a box's picture must show its criterion; 2026-11-08: the book's crops
    // leave the app, every box gets a drawing). One style for all (viewBox 160 x 120, .iksch in lab.css): the coral in
    // white with a dark outline (.f), details in grey (.st), calices and valleys shaded (.c), the seabed line (.b); the
    // part a box names in the one highlight colour (.h, .hf; DESIGN.md "Lab drawings"). A surface close-up carries a
    // 1 cm bar (40 units, U per mm), the same in every close-up, so a size box is read against it.
    const U = 4,
      r1 = n => Math.round(n * 10) / 10,
      // Deterministic jitter (no Math.random: the same drawing at every visit).
      jit = (i, a) =>
        r1(Math.sin(i * 12.9898 + a * 78.233) * 43758.5453 - Math.floor(Math.sin(i * 12.9898 + a * 78.233) * 43758.5453) - 0.5);
    const BAR =
      '<g class="sb"><rect x="100" y="92" width="54" height="24" rx="5"/><path d="M107 110 H147 M107 106 V114 M147 106 V114"/><text x="127" y="103">1 cm</text></g>';
    const SURF = '<rect class="f0" width="160" height="120"/>';
    const ray = (x, y, a, r0, r) =>
      `M${r1(x + r0 * Math.cos(a))} ${r1(y + r0 * Math.sin(a))} L${r1(x + r * Math.cos(a))} ${r1(y + r * Math.sin(a))}`;
    const rays = (x, y, n, r0, r, t = 0) => [...Array(n)].map((_, i) => ray(x, y, t + (i * 2 * Math.PI) / n, r0, r)).join(' ');
    // A calice seen from above: its pit (.c), septa from the rim inwards, the columella in the middle.
    const calice = (x, y, r, n = r < 8 ? 8 : 12) =>
      r < 4
        ? `<circle class="c" cx="${r1(x)}" cy="${r1(y)}" r="${r1(r)}"/>`
        : `<circle class="c" cx="${r1(x)}" cy="${r1(y)}" r="${r1(r)}"/><path class="st" d="${rays(x, y, n, r * 0.25, r)}"/><circle class="w" cx="${r1(x)}" cy="${r1(y)}" r="${r1(Math.max(1, r * 0.16))}"/>`;
    // Centres of a staggered grid of spacing d over the drawing (rows d * 0.87 apart), each nudged a little.
    const grid = (d, k = 0.12) => {
      const P = [];
      for (let j = -1, i = 0; j * d * 0.87 < 120 + d; j++)
        for (let x = -d + (j % 2 ? d / 2 : 0); x < 160 + d; x += d, i++) P.push([x + jit(i, 1) * d * k, j * d * 0.87 + jit(i, 2) * d * k]);
      // Only the cells that reach into the drawing.
      return P.filter(([x, y]) => x > -0.6 * d && x < 160 + 0.6 * d && y > -0.6 * d && y < 120 + 0.6 * d);
    };
    // Corallites with separate walls: each calice ringed by its own wall (.f), the surface between them grey (.g).
    const separate = d =>
      '<rect class="g" width="160" height="120"/>' +
      grid(d)
        .map(([x, y]) => `<circle class="f" cx="${r1(x)}" cy="${r1(y)}" r="${r1(d * 0.4)}"/>${calice(x, y, d * 0.27)}`)
        .join('') +
      BAR;
    // Shared walls: neighbouring calices split by one wall (the grey ridge line between two pits), as a honeycomb.
    const shared = d => {
      const hex = (x, y, R) =>
        [...Array(6)]
          .map(
            (_, i) =>
              `${i ? 'L' : 'M'}${r1(x + R * Math.cos(Math.PI / 6 + (i * Math.PI) / 3))} ${r1(y + R * Math.sin(Math.PI / 6 + (i * Math.PI) / 3))}`
          )
          .join(' ') + 'Z';
      const P = grid(d, 0);
      return (
        SURF +
        P.map(([x, y]) => `<path class="st" d="${hex(x, y, d / Math.sqrt(3))}"/>`).join('') +
        P.map(
          ([x, y]) =>
            `<path class="c" d="${hex(x, y, (d / Math.sqrt(3)) * 0.72)}"/>${d >= 30 ? `<path class="st" d="${rays(x, y, 12, d * 0.08, d * 0.36)}"/>` : ''}<circle class="w" cx="${r1(x)}" cy="${r1(y)}" r="${r1(Math.max(1, d * 0.06))}"/>`
        ).join('') +
        BAR
      );
    };
    // Meandering valleys s units apart: wavy walls (white bands, .wo under .wi) over the valley floor (.c), septa
    // across each valley. sep: each valley has its own wall, two walls side by side with a groove between (.h).
    const wave = (y0, a, l, ph) => {
      let d = '';
      for (let x = -4; x <= 164; x += 4)
        d += `${x < 0 ? 'M' : 'L'}${x} ${r1(y0 + a * Math.sin((2 * Math.PI * x) / l + ph) + a * 0.35 * Math.sin((4 * Math.PI * x) / l + ph * 2))}`;
      return d;
    };
    const meander = (s, sep) => {
      const ww = sep ? s * 0.14 : Math.max(2.4, s * 0.16),
        a = Math.min(10, s * 0.22),
        l = Math.max(48, s * 2.2),
        Y = [];
      for (let y = -s / 2; y < 120 + s; y += s) Y.push(y);
      const walls = Y.map((y, i) => wave(y, a, l, i * 0.5));
      // Septa: short ticks from each wall towards the valley's axis.
      const ticks = Y.map((y, i) => {
        let d = '';
        const step = Math.max(3, s * 0.16);
        for (let x = 0; x <= 160; x += step) {
          const f = (yy, ph) => yy + a * Math.sin((2 * Math.PI * x) / l + ph) + a * 0.35 * Math.sin((4 * Math.PI * x) / l + ph * 2);
          const top = f(y, i * 0.5),
            bot = f(y + s, (i + 1) * 0.5),
            g = (bot - top) / 2;
          if (s >= 16) d += `M${r1(x)} ${r1(top + ww / 2)} V${r1(top + g * 0.75)} M${r1(x)} ${r1(bot - ww / 2)} V${r1(bot - g * 0.75)} `;
        }
        return d;
      }).join('');
      const band = (d, w) =>
        `<path class="wo" d="${d}" style="stroke-width:${r1(w + 2.6)}"/><path class="wi" d="${d}" style="stroke-width:${r1(w)}"/>`;
      return (
        '<rect class="c" width="160" height="120"/>' +
        (ticks ? `<path class="st" d="${ticks}"/>` : '') +
        walls
          .map(d =>
            sep
              ? `<g transform="translate(0 ${r1(-ww * 0.75)})">${band(d, ww)}</g><g transform="translate(0 ${r1(ww * 0.75)})">${band(d, ww)}</g><path class="h" d="${d}"/>`
              : band(d, ww)
          )
          .join('') +
        BAR
      );
    };
    // No walls: small calices joined to their neighbours by septo-costae running from one to the next (.h).
    const linked = (d, edge) => {
      const P = grid(d, 0.1),
        n = 10;
      const lines = P.map(([x, y], i) => rays(x, y, n, d * 0.12, d * 0.52, jit(i, 3) * 0.3)).join(' ');
      return (
        SURF +
        `<path class="h thin" d="${lines}"/>` +
        P.map(([x, y]) => `<circle class="c" cx="${r1(x)}" cy="${r1(y)}" r="${r1(d * 0.12)}"/>`).join('') +
        (edge
          ? '<path class="bg" d="M-10 86 C40 82 60 90 90 86 C120 82 140 88 170 85 V140 H-10 Z"/><path class="f" d="M-2 84 C40 80 60 88 90 84 C120 80 140 86 162 83 V90 C140 93 120 87 90 91 C60 95 40 87 -2 91 Z"/><path class="b" d="M10 112 H96"/>'
          : '') +
        BAR
      );
    };
    // A branch from (x0, y0) to its tip (x1, y1), w0 wide at its base, w1 at its rounded tip.
    const branch = (x0, y0, x1, y1, w0, w1) => {
      const L = Math.hypot(x1 - x0, y1 - y0),
        nx = (y1 - y0) / L,
        ny = -(x1 - x0) / L;
      return `M${r1(x0 - (nx * w0) / 2)} ${r1(y0 - (ny * w0) / 2)} L${r1(x1 - (nx * w1) / 2)} ${r1(y1 - (ny * w1) / 2)} A${r1(w1 / 2)} ${r1(w1 / 2)} 0 0 0 ${r1(x1 + (nx * w1) / 2)} ${r1(y1 + (ny * w1) / 2)} L${r1(x0 + (nx * w0) / 2)} ${r1(y0 + (ny * w0) / 2)} Z`;
    };
    // Points along a branch, alternating sides, for its corallites.
    const along = (x0, y0, x1, y1, w0, w1, n, t0 = 0.1, t1 = 0.85) =>
      [...Array(n)].map((_, i) => {
        const t = t0 + ((t1 - t0) * i) / Math.max(1, n - 1),
          L = Math.hypot(x1 - x0, y1 - y0),
          nx = (y1 - y0) / L,
          ny = -(x1 - x0) / L,
          side = i % 2 ? 1 : -1,
          w = (w0 + (w1 - w0) * t) / 2;
        return [x0 + (x1 - x0) * t + side * nx * w * 0.62, y0 + (y1 - y0) * t + side * ny * w * 0.62];
      });
    // Branching, no axial corallite: branch tips close up, every corallite alike, tip included; r = corallite radius.
    const tips = (B, r, n) =>
      SURF.replace('f0', 'bg') +
      B.map(b => `<path class="f" d="${branch(...b)}"/>`).join('') +
      B.map(b =>
        [...along(...b, n, 0.04, 0.9), [b[2], b[3] - b[5] * 0.12]]
          .map(([x, y]) =>
            r < 4
              ? `<circle class="c" cx="${r1(x)}" cy="${r1(y)}" r="${r1(r)}"/>`
              : `<circle class="f" cx="${r1(x)}" cy="${r1(y)}" r="${r1(r * 1.25)}"/>${calice(x, y, r, 8)}`
          )
          .join('')
      ).join('') +
      BAR;
    const BOXART = {
      // With an axial corallite at branch tips (Acropora): each tip ends in one larger corallite (.h), the radial ones
      // smaller along the sides.
      B1: (() => {
        const B = [
          [46, 104, 30, 30, 15, 8],
          [70, 104, 78, 18, 16, 8],
          [94, 104, 120, 36, 15, 8],
          [62, 78, 44, 50, 9, 7]
        ];
        return (
          B.map(b => `<path class="f" d="${branch(...b)}"/>`).join('') +
          B.map(b =>
            along(...b, 7, 0.12, 0.88)
              .map(([x, y]) => `<circle class="f" cx="${r1(x)}" cy="${r1(y)}" r="2"/>`)
              .join('')
          ).join('') +
          B.map(
            ([, , x, y, , w]) => `<circle class="hf" cx="${x}" cy="${y}" r="${w * 0.62}"/><circle class="w" cx="${x}" cy="${y}" r="1.3"/>`
          ).join('') +
          '<path class="b" d="M10 104 H150"/>'
        );
      })(),
      // No axial corallite, corallites < 2 mm (Pocillopora, Porites, Montipora): many tiny ones, the tip like the rest.
      B2: tips(
        [
          [30, 124, 42, 20, 40, 34],
          [92, 124, 86, 34, 40, 34]
        ],
        2.4,
        26
      ),
      // No axial corallite, corallites > 2 mm (Tubastraea, Echinopora): fewer, large cups, the tip like the rest.
      B3: tips(
        [
          [36, 128, 44, 26, 52, 46],
          [104, 128, 96, 42, 52, 46]
        ],
        9,
        6
      ),
      // Branch surface complex, angular, sculpted (Hydnophora, Merulina, Pectinia): ridged, faceted branches.
      B4: (() => {
        const B = [
          [52, 104, 34, 28, 22, 14],
          [80, 104, 92, 20, 22, 14],
          [106, 104, 128, 40, 20, 12]
        ];
        const zig = ([x0, y0, x1, y1, w0, w1]) => {
          const L = Math.hypot(x1 - x0, y1 - y0),
            nx = (y1 - y0) / L,
            ny = -(x1 - x0) / L,
            n = 9,
            side = s =>
              [...Array(n + 1)].map((_, i) => {
                const t = i / n,
                  w = ((w0 + (w1 - w0) * t) / 2) * (i % 2 ? 1.3 : 0.85);
                return [x0 + (x1 - x0) * t + s * nx * w, y0 + (y1 - y0) * t + s * ny * w];
              });
          const A = side(-1),
            Bb = side(1).reverse();
          const ridges = [...Array(n - 1)]
            .map((_, i) => {
              const t = (i + 1) / n,
                cx = x0 + (x1 - x0) * t,
                cy = y0 + (y1 - y0) * t,
                w = (w0 + (w1 - w0) * t) / 2;
              return i % 2
                ? ''
                : `M${r1(cx - nx * w)} ${r1(cy - ny * w)} L${r1(cx + ((x1 - x0) / L) * 4)} ${r1(cy + ((y1 - y0) / L) * 4)} L${r1(cx + nx * w)} ${r1(cy + ny * w)}`;
            })
            .join(' ');
          return `<path class="f" d="M${[...A, ...Bb].map(([x, y]) => `${r1(x)} ${r1(y)}`).join(' L')} Z"/><path class="st" d="${ridges}"/>`;
        };
        return B.map(zig).join('') + '<path class="b" d="M10 104 H150"/>';
      })(),
      // Meandering, corallites with separate walls (Lobophyllia): two walls side by side, a groove between them (.h).
      M1: meander(44, true),
      // Meandering, shared or no walls, valleys 1-4 mm (Pachyseris, Pavona): many fine ridges.
      M2: meander(10, false),
      // Shared or no walls, valleys 4-10 mm (Platygyra, Leptoria, Goniastrea).
      M3: meander(28, false),
      // Shared or no walls, valleys > 10 mm (Lobophyllia, Pectinia).
      M4: meander(56, false),
      // Massive, corallites with separate walls, < 8 mm (Dipsastraea, Astreopora, Cyphastrea).
      S1: separate(5.5 * U),
      // Separate walls, 8-20 mm (Diploastrea, Dipsastraea, Favites).
      S2: separate(14 * U),
      // No or indistinct walls, linked by septo-costae (Pavona).
      S3: linked(5 * U),
      // Shared walls, < 8 mm (Favites, Goniastrea, Porites).
      S4: shared(5 * U),
      // Shared walls, 8-12 mm.
      S5: shared(10 * U),
      // Shared walls, > 12 mm.
      S6: shared(16 * U),
      // Raised skeletal surface textures (Hydnophora, Galaxea, Porites): a massive colony's top seen from the side,
      // knobs, cones and ridges standing up from it.
      S7: (() => {
        let d = 'M0 120 V58',
          x = 0,
          i = 0;
        while (x < 160) {
          const w = 12 + (jit(i, 4) + 0.5) * 8,
            h = 12 + (jit(i, 5) + 0.5) * 12;
          d += ` L${r1(x + w * 0.2)} 58 L${r1(x + w * 0.5)} ${r1(58 - h)} L${r1(x + w * 0.8)} 58`;
          x += w;
          i++;
        }
        d += ' L160 58 V120 Z';
        return (
          '<rect class="bg" width="160" height="120"/>' +
          `<path class="f" d="${d}"/>` +
          '<path class="st" d="M0 70 C40 66 120 74 160 68 M0 84 C50 80 110 88 160 82"/>' +
          BAR
        );
      })(),
      // Thin plates and crusts, raised or crumpled surface textures: a thin plate whose top is crumpled into ridges and bumps.
      P1: (() => {
        let d = 'M6 92',
          i = 0;
        for (let x = 6; x < 154; i++) {
          const w = 8 + (jit(i, 6) + 0.5) * 8,
            h = 4 + (jit(i, 7) + 0.5) * 9;
          d += ` Q${r1(x + w / 2)} ${r1(78 - h * 2)} ${r1(Math.min(154, x + w))} 78`;
          x += w;
        }
        return `<path class="f" d="${d} L154 92 C120 96 40 96 6 92 Z"/><path class="st" d="M10 86 C50 88 110 88 150 86"/><path class="f" d="M72 95 L74 104 H86 L88 95 Z"/><path class="b" d="M10 104 H150"/>`;
      })(),
      // Encrusting with rounded corallites (Turbinaria, Astreopora): a thin crust over the rock, round corallites raised on it.
      P2: (() => {
        const X = [18, 40, 62, 84, 106, 128, 148];
        return (
          '<path class="w" d="M0 120 V84 C30 76 60 86 90 78 C120 70 140 80 160 76 V120 Z"/>' +
          '<path class="f" d="M0 84 C30 76 60 86 90 78 C120 70 140 80 160 76 V66 C140 70 120 60 90 68 C60 76 30 66 0 74 Z"/>' +
          X.map((x, i) => {
            const y = 72 - Math.sin((x / 160) * 6) * 4 - (i % 2) * 2;
            return `<path class="f" d="M${x - 9} ${r1(y + 2)} C${x - 8} ${r1(y - 12)} ${x + 8} ${r1(y - 12)} ${x + 9} ${r1(y + 2)}"/><ellipse class="c" cx="${x}" cy="${r1(y - 8)}" rx="4.5" ry="2"/>`;
          }).join('') +
          BAR
        );
      })(),
      // Vases or tiers (Turbinaria, Montipora, Echinopora): a vase on a short stalk, and plates stacked in tiers.
      P3:
        '<path class="f" d="M40 104 L44 82 C26 70 14 52 12 30 C30 38 60 38 76 30 C74 52 62 70 50 82 L54 104 Z"/><ellipse class="f" cx="44" cy="30" rx="32" ry="7"/><ellipse class="c" cx="44" cy="31" rx="24" ry="4"/>' +
        '<path class="f" d="M116 104 V60"/><path class="st" d="M116 104 V58"/>' +
        [
          [116, 92, 30],
          [116, 76, 24],
          [116, 60, 17]
        ]
          .map(
            ([x, y, w]) =>
              `<path class="f" d="M${x - w} ${y} C${x - w / 2} ${y - 7} ${x + w / 2} ${y - 7} ${x + w} ${y} C${x + w / 2} ${y - 3} ${x - w / 2} ${y - 3} ${x - w} ${y} Z"/>`
          )
          .join('') +
        '<path class="b" d="M10 104 H150"/>',
      // Corallites linked by continuous septo-costae on a plate (Lithophyllon, Pavona): the plate's thin edge in front.
      P5: linked(5 * U, true),
      // With fingers or tubes arising (Montipora, Echinopora, Porites): upright fingers and tubes rising from a plate.
      P6:
        '<path class="f" d="M8 104 C10 96 30 92 80 92 C130 92 150 96 152 104 Z"/>' +
        [
          [26, 94, 54, 11],
          [50, 92, 30, 12],
          [78, 92, 40, 11],
          [104, 92, 24, 12],
          [130, 94, 46, 11]
        ]
          .map(([x, y, t, w], i) =>
            i % 2
              ? `<path class="f" d="M${x - w / 2} ${y} V${t} H${x + w / 2} V${y} Z"/><ellipse class="f" cx="${x}" cy="${t}" rx="${w / 2}" ry="3"/><ellipse class="c" cx="${x}" cy="${t}" rx="${w / 2 - 2.5}" ry="1.6"/>`
              : `<path class="f" d="M${x - w / 2} ${y} V${t + w / 2} A${w / 2} ${w / 2} 0 0 1 ${x + w / 2} ${t + w / 2} V${y} Z"/>`
          )
          .join('') +
        '<path class="b" d="M10 104 H150"/>',
      // Free-living, round or oval disc 10-30 cm, single mouth (Fungia, Danafungia, Lobactis): a disc lying on the sand,
      // septa from the rim to the one central mouth (.h).
      F1: `<path class="f" d="M18 76 C18 96 142 96 142 76 L142 70 L18 70 Z"/><ellipse class="f" cx="80" cy="70" rx="62" ry="20"/><path class="st" d="${[
        ...Array(36)
      ]
        .map((_, i) => {
          const a = (i * 2 * Math.PI) / 36,
            k = i % 2 ? 0.55 : 0.2;
          return `M${r1(80 + 60 * Math.cos(a))} ${r1(70 + 19 * Math.sin(a))} L${r1(80 + 60 * k * Math.cos(a))} ${r1(70 + 19 * k * Math.sin(a))}`;
        })
        .join(' ')}"/><path class="h" d="M70 70 H90"/><path class="b" d="M10 100 C40 96 70 102 100 98 C120 96 136 100 150 99"/>`,
      // Leafy fronds, lettuce-like (CF p.57): thin upright wavy fronds rising from one base.
      P4:
        [
          [22, 40, 46],
          [62, 22, 50],
          [100, 34, 44]
        ]
          .map(([x, t, w]) => {
            const r = w / 4,
              top = [0, 1, 2, 3]
                .map(i => `Q${x + r * i + r / 2} ${t - 8 + (i % 2) * 4} ${x + r * (i + 1)} ${t + (i % 2 ? 0 : 3)}`)
                .join(' ');
            return `<path class="f" d="M${x + w * 0.38} 104 C${x + 2} 86 ${x - 4} 62 ${x} ${t} ${top} C${x + w + 4} 62 ${x + w * 0.7} 86 ${x + w * 0.58} 104 Z"/><path class="st" d="M${x + w / 2} 102 C${x + w * 0.45} 80 ${x + w * 0.4} 60 ${x + w * 0.35} ${t + 10} M${x + w / 2} 90 C${x + w * 0.6} 70 ${x + w * 0.7} 56 ${x + w * 0.72} ${t + 12}"/>`;
          })
          .join('') + '<path class="b" d="M10 104 H150"/>',
      // Free-living: other (CF p.67): small loose corals of other shapes lying unattached on the sand.
      F3: '<ellipse class="f" cx="52" cy="92" rx="24" ry="9"/><path class="st" d="M32 92 H72 M52 84 V100 M38 86 L66 98 M38 98 L66 86"/><path class="f" d="M92 96 C88 80 98 70 108 78 C114 70 128 72 128 84 C134 92 124 102 112 98 C104 104 94 104 92 96 Z"/><path class="st" d="M100 90 C106 84 112 92 120 86"/><path class="b" d="M10 104 C40 101 70 106 100 102 C120 100 136 104 150 103"/>',
      // Isolated and attached (CF p.69): one large polyp or cup, fixed to the reef, on its own.
      F4: '<path class="f" d="M62 104 C62 84 54 74 44 62 C60 66 70 60 80 50 C90 60 100 66 116 62 C106 74 98 84 98 104 Z"/><ellipse class="f" cx="80" cy="54" rx="40" ry="12"/><path class="st" d="M50 52 L58 56 M62 46 L66 52 M80 43 L80 50 M98 46 L94 52 M110 52 L102 56 M56 60 L64 58 M104 60 L96 58"/><ellipse class="w" cx="80" cy="54" rx="6" ry="2.5"/><path class="b" d="M10 104 C40 98 60 106 80 102 C100 98 120 106 150 102"/>'
    };
    const boxArt = id => (BOXART[id] ? `<svg class="iksch" viewBox="0 0 160 120" aria-hidden="true">${BOXART[id]}</svg>` : '');
    // A box's picture: its drawing, else (a box with no drawing whose genera are in no other box: the non-hard-coral
    // group, the elongate free-living discs) those genera's cover photos, else nothing.
    const boxPics = o => {
      if (BOXART[o.id]) return [];
      // Only genera found in no other box, so their photos can only show this box's criterion.
      const solo = bySlate(o.g).filter(n => KEY.every(k => k.leaves.every(l => l.id === o.id || !l.g.includes(n))));
      return solo.length === o.g.length
        ? solo
            .map(n => cover(G[n]))
            .filter(Boolean)
            .slice(0, 3)
            .map(p => img(p, 's'))
        : [];
    };
    // Shortlist card: closer view and corallites side by side, big enough to compare at a glance.
    const genCard = n =>
      `<button type="button" class="ikgc" data-gx="${esc(n)}"><span class="ikgp"><img src="${thumb(n, 'medium')}" alt="" loading="lazy"><img src="${thumb(n, 'macro')}" alt="" loading="lazy"></span><i>${esc(n)}</i></button>`;
    function drawStart(F) {
      const pool = names.filter(n => !S.out.has(n)),
        left = pool.filter(n => pen(n, F) === 0);
      const cnt = (f, o) => pool.filter(n => fits(n, F, f.id) && o.g.includes(n)).length;
      const fam = id => F.find(f => f.id === id);
      const row = id => {
        const f = fam(id);
        return f
          ? `<div class="iksrow"><h3 title="${esc(f.note || '')}">${esc(f.name)}</h3><div class="iksopts">${f.opts.map(o => optBtn(f, o, S[id].has(o.id), cnt(f, o))).join('')}</div></div>`
          : '';
      };
      // Once a form is picked, the form tiles shrink to compact chips so the next clues and the shortlist move up (phones and desktop).
      const forms = f =>
        `<div class="ikforms${S[f.id].size ? ' mini' : ''}">${f.opts.map(o => formTile(f.id, o, S[f.id].has(o.id), cnt(f, o))).join('')}</div>${andSw(f.id)}`;
      const show = `<button type="button" class="next ikshow${used(F).length ? '' : ' sec'}" data-show>${used(F).length ? `Show the ${left.length} ${left.length === 1 ? 'genus' : 'genera'}` : `Show all ${left.length} genera${left.some(n => !slate.has(n)) ? ` (${left.filter(n => slate.has(n)).length} on the slate)` : ''}`} →</button>`;
      // Two entry points: the paper Coral Finder's path (default) or the IMR forms, as a discreet link at the bottom (Pierre: it took room for nothing).
      const switcher = `<button type="button" class="linkish iksv" data-sv="${startV === 'c' ? 'a' : 'c'}">${startV === 'c' ? '← IMR growth forms' : 'Coral Finder book path →'}</button>`;
      let body;
      if (startV === 'c') {
        // The paper Coral Finder's own path: growth form, then the box of that form, then the shortlist.
        const fb = fam('box');
        body = `${forms(fam('form'))}${
          fb
            ? `<div class="iksrow stack"><h3 title="${esc(fb.note)}">${esc(fb.name)}</h3><div class="ikforms boxes">${fb.opts
                .map(o => {
                  const P = boxPics(o);
                  return `<button type="button" class="iktileb ikboxt" data-o="box|${o.id}" aria-pressed="${S.box.has(o.id)}"${!cnt(fb, o) && !S.box.has(o.id) ? ' data-zero' : ''}><span class="iktq n${P.length || 1}">${P.length ? P.map(u => `<img src="${u}" alt="" loading="lazy">`).join('') : boxArt(o.id)}</span><span class="iktt"><b>${gloss(o.t, undefined, true)}</b>${o.pg ? `<small>${o.pg}</small>` : ''}</span><span class="ikc">${cnt(fb, o)}</span></button>`;
                })
                .join('')}</div></div>`
            : ''
        }`;
      } else {
        // Polyps out by day is its own clue (IMR lecture group 6), taken from Other features.
        const ft = fam('feat'),
          po = ft && ft.opts.find(o => o.id === 'polyp');
        body = `${forms(fam('imrf'))}${po ? `<div class="iksrow"><h3>Polyps</h3><div class="iksopts">${optBtn(ft, po, S.feat.has('polyp'), cnt(ft, po))}</div></div>` : ''}${row('size')}${row('wall')}`;
      }
      // Live shortlist under the clues from the first ticked clue: the genera that fit every clue (those one clue off are
      // only counted; the full results page lists them).
      const close = pool.filter(n => pen(n, F) === 1);
      const live = !used(F).length
        ? ''
        : `<div class="iklive"><h3 class="ikgrp">${left.length} ${left.length === 1 ? 'genus fits' : 'genera fit'} every clue${close.length ? ` <small>${close.length} more one clue off</small>` : ''}</h3>
        <div class="ikgcs">${left.map(genCard).join('')}</div></div>`;
      $start.classList.toggle('used', !!used(F).length);
      // One-line prompt (design review 2026-11-01, Pierre OK): the start screen says what to do; before any clue, "Show all" is a
      // secondary way out, not the main action.
      const prompt = used(F).length
        ? ''
        : `<p class="ikprompt">${startV === 'c' ? 'What growth form do you see?' : 'What do you see?'}</p>`;
      $start.innerHTML = `<div class="ikstop">${prompt}${show}</div>${body}${live}<p class="iksvrow">${switcher}</p>`;
      andWire($start);
      $start.querySelectorAll('[data-sv]').forEach(
        b =>
          (b.onclick = () => {
            startV = b.dataset.sv;
            store.set('reefid-idkey-start2', startV);
            FIDS.forEach(f => S[f].clear());
            draw();
          })
      );
      $start.querySelectorAll('[data-gx]').forEach(
        b =>
          (b.onclick = () => {
            const n = b.dataset.gx;
            S.home = false;
            S.open.add('x:' + n);
            draw();
            const a = $main.querySelector(`[data-x="${CSS.escape(n)}"]`);
            a ? a.closest('article').scrollIntoView({block: 'start'}) : window.scrollTo(0, 0);
          })
      );
      const sh = $start.querySelector('[data-show]');
      if (sh)
        sh.onclick = () => {
          S.home = false;
          draw();
          window.scrollTo(0, 0);
        };
      $start.querySelectorAll('[data-o]').forEach(
        b =>
          (b.onclick = () => {
            const [f, id] = b.dataset.o.split('|');
            S[f].has(id) ? S[f].delete(id) : S[f].add(id);
            if (f === 'form')
              [...S.box].forEach(x => {
                if (!S.form.has(x[0])) S.box.delete(x);
              });
            // C: picking a box is the last step of the paper key.
            if (startV === 'c' && f === 'box' && S.box.size) S.home = false;
            draw();
            if (!S.home) window.scrollTo(0, 0);
          })
      );
    }

    function drawCmp() {
      $cmp.hidden = !S.cmp.length;
      $cmp.innerHTML =
        S.cmp.length === 2
          ? `<a class="next" href="${esc(hr('cmp-' + S.cmp[0] + '|' + S.cmp[1]))}">Compare <i>${esc(S.cmp[0])}</i> and <i>${esc(S.cmp[1])}</i> side by side →</a><button type="button" class="chip" data-cx>Clear</button>`
          : `<span><i>${esc(S.cmp[0] || '')}</i> picked: tap Compare on a second genus.</span><button type="button" class="chip" data-cx>Clear</button>`;
      const x = $cmp.querySelector('[data-cx]');
      if (x)
        x.onclick = () => {
          S.cmp = [];
          draw();
        };
    }

    function draw() {
      [...S.not].forEach(k => {
        const [f, id] = k.split('.');
        if (S[f] && S[f].has(id)) S.not.delete(k);
      });
      const F = facets(),
        pool = names.filter(n => !S.out.has(n) && fitsQ(n));
      $start.hidden = !S.home;
      $lay.hidden = S.home;
      $cmp.hidden = S.home || !S.cmp.length;
      if (S.home) {
        drawStart(F);
        saveHash();
        return;
      }
      const left = pool.filter(n => pen(n, F) === 0),
        close = pool.filter(n => pen(n, F) > 0 && pen(n, F) <= 1),
        rest = pool.filter(n => pen(n, F) > 1);
      drawSide(F, left);
      drawMain(F, left, close, rest);
      drawCmp();
      saveHash();
      $main.querySelectorAll('[data-yes]').forEach(
        b =>
          (b.onclick = () => {
            const [f, id] = b.dataset.yes.split('.');
            S[f].add(id);
            draw();
          })
      );
      $main.querySelectorAll('[data-no]').forEach(
        b =>
          (b.onclick = () => {
            S.not.add(b.dataset.no);
            draw();
          })
      );
      $main.querySelectorAll('[data-skip]').forEach(
        b =>
          (b.onclick = () => {
            S.skip.add(b.dataset.skip);
            draw();
          })
      );
      $main.querySelectorAll('[data-unnot]').forEach(
        b =>
          (b.onclick = () => {
            S.not.delete(b.dataset.unnot);
            draw();
          })
      );
    }
    // No genus-name box: the Coral ID Key is for corals you don't know yet (Pierre). Escape (outside the photo viewer) starts over.
    const key = e => {
      if (!document.body.contains(root)) return document.removeEventListener('keydown', key);
      if (!lb.hidden || (e.target.closest && e.target.closest('input,textarea'))) return;
      if (e.key === 'Escape') reset();
    };
    document.addEventListener('keydown', key);
    draw();
    return () => document.removeEventListener('keydown', key);
  }
});
