// Photos › Tree, a node's page: its sheet's text and the content editor's edits (docs/reviews/2026-11-14-sheet-overlay-
// design.md v2, step 2; docs/ARCHITECTURE.md "The content editor's edits"). Every slot the subject declares for the
// node's rank (core.js
// SUBJECTS content: its name, IMR's or ours) with its text in force: the built file's (fish.json, the base: the sources and
// the instance's layer), else his edit (core.js contentApply).
// - ✎ Edit opens a box (a list one line per item; an emptied box hides the slot), with Source and Link (optional and
//   encouraged, never required); when he fills a slot the base leaves empty, Save asks for a source once
//   (Save without source then saves). ⊘ Hide. ↺ Restore: the original again (kept in was; More shows it beside his).
// - An edit whose base changed since (stale: core.js contentState) shows the three texts, when he edited, now and his,
//   with Keep mine (his text against the base now), Take the new (his entry goes) and Edit; players keep his text until
//   he answers. One the base now says (absorbed): Remove. An entry never applied (orphaned: core.js
//   contentEntries) shows its text with Remove; one whose node is gone is counted in the bar.
// - Each click one draft step, undone and redone as any (rule A2); his Publish sends them (rule A1), counted per rank.
// - Only a node the app gives a sheet (core.js fishTree go): never a genus the app sends to its species or its family, a
//   wink family (its surprise card) or a WoRMS taxon (design note, call (f)).
// - Who may edit: mayContent, the one place the content right is asked (today the token that can publish, phase 0 of the
//   design; roles step 1 puts can_(account, 'content', instance) there), for the controls and for every write.
// The bar of every Tree page counts the edits to check (stale and orphaned: sheetWarn), linking to the first one's page.
// The same code serves every subject's Tree (S: its SUBJECTS entry): the fish's (admin.js renderFishUnits, over fish.json)
// and the corals' (admin-coraltree.js renderCoralTree, over data.json as the admin holds it; design note v2, step 8: a
// genus's sheet, its look-alike pairs and no circle, a withdrawal the ★ rule would hold turned off). admin.html loads it
// before admin.js, as admin-coraltree.js: a Tree page opened cold can render before the later scripts are in (the
// demo's data comes at once), and must find the editor.
//
// The pure part (sheetSlots, sheetOwn, sheetVal, sheetTodo, rowKey, contentShells) runs in Node too: tests/sheeteditor.test.js.
(function (root) {
  const node = typeof module !== 'undefined' && module.exports,
    C = node ? require('./core.js') : root,
    // autosort.js: the fish units and their look-alike pairs (fishUnits, fishPairs), for Photos › Look-alikes (montPairs)
    A = node ? require('./autosort.js') : root,
    isObj = o => !!o && typeof o === 'object' && !Array.isArray(o);
  // The lines a keyed slot holds in record r (its other node ids, in the base's order).
  const keysOf = (sp, r) => {
    const v = r[sp.f || sp.k];
    return sp.rows
      ? (Array.isArray(v) ? v : []).filter(y => Array.isArray(y) && y[0] != null).map(y => String(y[0]))
      : sp.map
        ? Object.keys(isObj(v) ? v : {})
        : [null];
  };
  // The file the sheet's text slots are read against: built file R with the pairs of content map Cm in force (core.js
  // structApply, the pairs alone), so an added pair's line has its look/<id> slot (empty, to fill) and a withdrawn pair's
  // words are listed as never applied, as players get them (contentApply lays the structure first). The circles are left
  // out: a family the editor takes off the game keeps its sheet here, its edits kept for the day it comes back.
  let SF = null;
  function sheetFile(S, R, Cm) {
    const P = isObj(Cm && Cm.pairs) && Object.keys(Cm.pairs).length ? Cm.pairs : null;
    if (!P || !(S && S.structure && S.structure.pairs)) return R;
    const k = JSON.stringify(P);
    if (!SF || SF.R !== R || SF.k !== k) {
      const c = {pairs: P};
      SF = {R, k, F: C.structApply(S, R, S.admin && S.admin.cur ? {[S.admin.cur]: {content: c}} : {content: c})};
    }
    return SF.F;
  }
  // Node id's sheet under content map Cm, built file R: one row per slot its rank declares (a keyed slot once per line the
  // base holds), {slot, sp, key, name (a keyed slot's: the other node's name, nameOf), base, e (his entry, or null), eid (its
  // stored id: an old id read through SUBJECTS renamed), state ('' when none, else fresh, stale, absorbed), v (in force)};
  // then the node's entries never applied, {slot, name, e, eid, state: 'orphan', why}. [] for a node S declares no rank for.
  // Read with the pairs in force (sheetFile).
  function sheetSlots(S, R, Cm, id, nameOf = x => x) {
    R = sheetFile(S, R, Cm);
    const n = C.contentNodes(S, R).get(id);
    if (!n) return [];
    const E = C.contentEntries(S, R, Cm).filter(x => x.node === id),
      live = new Map(E.filter(x => x.state !== 'orphan').map(x => [x.slot, x])),
      rows = [];
    S.content[n.rank].slots.forEach(sp =>
      keysOf(sp, n.rec).forEach(key => {
        const slot = key == null ? sp.k : sp.k + '/' + key,
          x = live.get(slot),
          base = C.contentBase(sp, n.rec, key);
        rows.push({
          slot,
          sp,
          key,
          name: key == null ? sp.n : `${sp.n}: ${nameOf(key)}`,
          base: base === undefined ? null : base,
          e: x ? x.e : null,
          eid: x ? x.id : id,
          state: x ? x.state : '',
          v: x ? x.e.v : base === undefined ? null : base
        });
      })
    );
    E.filter(x => x.state === 'orphan').forEach(x =>
      rows.push({slot: x.slot, name: x.slot, e: x.e, eid: x.id, state: 'orphan', why: x.why})
    );
    return rows;
  }
  // Whether node id of fish file R has a sheet of its own in the app (core.js fishTree go, learn.js viewFishSheet): a family
  // that is not a wink, a genus the app opens as itself, a species of a family; never anything in a wink family, which
  // viewFishSheet sends to the families list (the whale and thresher sharks' species). A subject with
  // one sheet per unit (no SUBJECTS sheets: the corals, every genus of data.json gen and x.gen its sheet, learn.js
  // viewGenus; design note v2, step 8): every node its slots reach. A subject whose game units are its genera (SUBJECTS
  // unitRank genus: the sea slugs) has every genus, one the app opens as its family or its one species included: each is a
  // unit, its look-alikes and their lines shown on the page it opens (learn.js fishGenusLooksOn), its marks in the quiz
  // feedback (app.js fishGenera qt).
  let OWN = null;
  function sheetOwn(R, id, S) {
    if (S && S.content && !S.sheets) return C.contentNodes(S, R).has(id);
    if (!OWN || OWN.R !== R) OWN = {R, T: C.fishTree(R)};
    const T = OWN.T,
      wink = fid => !T.fam[fid] || !!T.fam[fid].wink;
    if (T.fam[id]) return !T.fam[id].wink;
    if (T.gen[id]) return (T.go(id) === id || C.unitRankOf(S) === 'genus') && !wink(T.gen[id].family);
    return !!T.sp[id] && !wink(T.sp[id].family);
  }
  // A list of sources (a slot of type srcs: core.js contentVal) as the editor's box holds it: one source a line, its words
  // then | and its web address when it has one; and back: a line's address is what follows its last | when that is a web
  // address (http or https), or a web address that ends the line after a space, else none.
  const srcsText = v => (Array.isArray(v) ? v : []).map(x => (x.u ? `${x.t} | ${x.u}` : x.t)).join('\n');
  const srcOfLine = x => {
    const m = x.match(/^(.*?)\s*\|\s*(https?:\/\/\S+)$/i) || x.match(/^(.*\S)\s+(https?:\/\/\S+)$/i);
    if (m && m[1].trim()) return {t: m[1].trim(), u: m[2]};
    const u = m ? m[2] : /^https?:\/\/\S+$/i.test(x) ? x : '';
    return u ? {t: u, u} : {t: x};
  };
  // The text of the editor's box as the slot's value: a list one item per non-empty line; a list of sources one source per
  // non-empty line (srcOfLine); a text its words on one line; null when nothing is left (the slot hidden).
  function sheetVal(sp, text) {
    const s = String(text || '');
    if (sp.t === 'srcs') {
      const L = s
        .split('\n')
        .map(x => x.replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .map(srcOfLine);
      return L.length ? L : null;
    }
    if (sp.t === 'list') {
      const L = s
        .split('\n')
        .map(x => x.trim())
        .filter(Boolean);
      return L.length ? L : null;
    }
    return s.replace(/\s+/g, ' ').trim() || null;
  }
  // The edits to check in content map Cm: [{id, node, slot, state, why}], the stale and the orphaned, in node order: the text
  // slots' (read with the pairs in force: sheetFile), then the circles' (slot circle) and the pairs' (node: the pair's first
  // id, slot pair:<key>).
  const todo = x => x.state === 'stale' || x.state === 'orphan',
    why = x => (x.why ? {why: x.why} : {});
  function sheetTodo(S, R, Cm) {
    const E = S && S.structure ? C.structEntries(S, R, Cm) : {circles: [], pairs: []};
    return [
      ...C.contentEntries(S, sheetFile(S, R, Cm), Cm)
        .filter(todo)
        .map(x => ({id: x.id, node: x.node, slot: x.slot, state: x.state, ...why(x)})),
      ...E.circles.filter(todo).map(x => ({id: x.id, node: x.id, slot: C.CIRCLE_SLOT, state: x.state, ...why(x)})),
      ...E.pairs.filter(todo).map(x => ({id: x.key, node: x.a || x.key, slot: 'pair:' + x.key, state: x.state, ...why(x)}))
    ];
  }
  // ---- The structure (design note v2, step 4; docs/ARCHITECTURE.md "The content editor's edits") ----
  // Node id's circle under content map Cm, built file R (SUBJECTS structure circle: a node of its rank; null for any
  // other): {of (the declared circles), base (the record's; null none), e (his entry or null), state ('' none, fresh,
  // stale, absorbed, orphan), why, v (in force: his while it applies, a stale one included; else the base)}.
  function circleRow(S, R, Cm, id) {
    const D = S && S.structure && S.structure.circle,
      n = D ? C.contentNodes(S, R).get(id) : null;
    if (!n || n.rank !== D.rank) return null;
    const base = n.rec.circle != null ? n.rec.circle : null,
      x = C.structEntries(S, R, Cm).circles.find(c => c.id === id) || null;
    return {of: D.of, base, e: x ? x.e : null, state: x ? x.state : '', ...(x ? why(x) : {}), v: x && x.state !== 'orphan' ? x.e.v : base};
  }
  // The pairs of the pair rank under content map Cm, built file R (every pair the base declares, either side's line, and
  // every pair entry), those touching node id only when given: [{key, a, b (a < b), base (1 or null), e, state, why, v (in
  // force: 1 or null)}], in key order.
  function pairRows(S, R, Cm, id) {
    const D = S && S.structure && S.structure.pairs;
    if (!D) return [];
    const N = new Map([...C.contentNodes(S, R)].filter(([, n]) => n.rank === D.rank)),
      rows = new Map();
    N.forEach((n, a) =>
      (Array.isArray(n.rec[D.slot]) ? n.rec[D.slot] : []).forEach(y => {
        const b = C.pairIdOf(y),
          k = b && b !== a && N.has(b) ? C.contentPairKey(a, b) : '';
        if (k && !rows.has(k)) rows.set(k, {key: k, a: k.split('|')[0], b: k.split('|')[1], base: 1, e: null, state: ''});
      })
    );
    C.structEntries(S, R, Cm).pairs.forEach(x =>
      rows.set(x.key, {key: x.key, a: x.a, b: x.b, base: x.base, e: x.e, state: x.state, ...why(x)})
    );
    return [...rows.values()]
      .map(r => ({...r, v: r.e && r.state !== 'orphan' ? r.e.v : r.base}))
      .filter(r => id == null || r.a === id || r.b === id)
      .sort((p, q) => (p.key < q.key ? -1 : p.key > q.key ? 1 : 0));
  }
  // Whether content maps a and b hold the same structure as published (contentOut): their circle slots and pairs.
  const structOf = Cm => {
    const o = C.contentOut(Cm),
      c = Object.entries(o.nodes || {})
        .filter(([, m]) => C.CIRCLE_SLOT in m)
        .map(([id, m]) => [id, m[C.CIRCLE_SLOT]]);
    return JSON.stringify({c, p: o.pairs || {}});
  };
  const structChanged = (a, b) => structOf(a) !== structOf(b);
  // A row's key on the page: its slot, or for an entry never applied its stored id and slot too (an old id's entry shadowed
  // by its node's own has the same slot as the live row).
  const rowKey = r => (r.state === 'orphan' ? `o\n${r.eid}\n${r.slot}` : r.slot);
  // merged (a merge of the draft mine onto a newer published curation: admin.js mergeCur) with the draft's emptied node
  // maps put back. A Restore leaves its node's map {} so the next merge keeps a slot another device published on it, but
  // merge3 leaves an emptied map out of its result: without this, a second merge before Publish (another rebase, Publish's
  // own retry after a SHA conflict) reads the node as deleted and drops that slot. Published files
  // never hold them (core.js contentOut). Each subject's content, through SUBJECTS admin.cur. The pairs map the same way: a
  // pair's ↺ Restore that empties it leaves {} (core.js contentPairDrop), put back too, so a pair another device added
  // meanwhile is kept by the next merge.
  function contentShells(mine, merged, Ss = C.SUBJECTS) {
    if (!isObj(merged)) return merged;
    let out = merged;
    Ss.forEach(S => {
      const m = C.contentOf(mine, S),
        empty = Object.keys(isObj(m.nodes) ? m.nodes : {}).filter(id => isObj(m.nodes[id]) && !Object.keys(m.nodes[id]).length),
        cur = C.contentOf(out, S),
        miss = empty.filter(id => !isObj((cur.nodes || {})[id])),
        pairs = isObj(m.pairs) && !Object.keys(m.pairs).length && !isObj(cur.pairs);
      if (!miss.length && !pairs) return;
      const c = {
        ...cur,
        ...(miss.length ? {nodes: {...(isObj(cur.nodes) ? cur.nodes : {}), ...Object.fromEntries(miss.map(id => [id, {}]))}} : {}),
        ...(pairs ? {pairs: {}} : {})
      };
      out = S.admin.cur ? {...out, [S.admin.cur]: {...(out[S.admin.cur] || {}), content: c}} : {...out, content: c};
    });
    return out;
  }
  // ---- Photos › Look-alikes: the pairs in force (design note v2, after step 4) ----
  // The look-alike pairs of fish file R under content map Cm, one photo pair each (admin.js renderFishMont, curation.json
  // fish mont): autosort.js fishPairs over the units of R with the pairs in force (sheetFile, core.js structApply: the
  // base's less those he withdrew, plus those he added; the circles left out, as the Tree's Look-alikes filter), each one
  // the base does not declare marked added. A withdrawn pair has no row and keeps its photo pair in fish mont (nothing is
  // deleted on his behalf, rule A1), shown again when the pair is back (Undo, ↺). Keys as his pair entries' (core.js
  // contentPairKey), so an added pair's photo pair is stored as a base pair's. Its lines and sources are the base's (an
  // added pair has none there: its words are the Sheet's look/<id> line). U0: the units of R when made already
  // (FISHC.units). One computation per pairs map.
  let MP = null;
  function montPairs(S, R, Cm, U0) {
    const P = sheetFile(S, R, Cm);
    if (!MP || MP.R !== R || MP.P !== P) {
      const L = A.fishPairs(U0 || A.fishUnits(R)),
        base = new Set(L.map(p => p.k));
      MP = {R, P, L: P === R ? L : A.fishPairs(A.fishUnits(P)).map(p => (base.has(p.k) ? p : {...p, added: true}))};
    }
    return MP.L;
  }
  if (node) {
    module.exports = {
      sheetSlots,
      sheetOwn,
      sheetVal,
      srcsText,
      sheetTodo,
      rowKey,
      contentShells,
      sheetFile,
      circleRow,
      pairRows,
      structChanged,
      montPairs
    };
    return;
  }

  // ---- The page (admin.js renderFishUnits) ----
  // The content right: today the token that can publish (phase 0); roles step 1 asks the sheet here.
  const mayContent = () => !!TOKEN;
  // SH_ED, this tab: the row open in the editor, {id, ck} (its node and row key), with what was typed in it so far (text,
  // t, u), so a redraw meanwhile (another tab's draft, a request coming back) keeps it.
  let SH_ED = null,
    SH_ASK = null, // this tab: the row whose Save already asked for a source
    // this tab: the pair being added, {at (the page's node, or '' from the Look-alikes filter: both sides chosen there),
    // a, b, t, u (what was typed), ask (its Save already asked for a source)}
    ST_ADD = null;
  const SH_KEY = 'reefid-admin-csheet'; // the box open or folded (this browser)
  // The subject's content map in the draft, and one write: one Save, one Undo step (saveDraft), a new map each time.
  const shGet = S => C.contentOf(DRAFT, S);
  function shPut(S, f) {
    if (!mayContent()) return;
    const c = f(shGet(S));
    if (S.admin.cur) DRAFT[S.admin.cur] = {...(DRAFT[S.admin.cur] || {}), content: c};
    else DRAFT.content = c;
    SH_ED = SH_ASK = ST_ADD = null;
    saveDraft();
    render();
  }
  const WHY = {node: 'node gone', slot: 'no such slot', value: 'not its type', shadow: 'old id', key: 'bad pair key'};
  const STATE = {fresh: 'Edited', stale: 'Base changed', absorbed: 'In the base'};
  // A source's words, a link when its address is a web address (http or https: never a javascript: or data: link on the
  // page that holds the publishing token, whoever typed it once editors publish through the relay).
  const srcA = x => (x.u && /^https?:\/\//i.test(x.u) ? `<a href="${esc(x.u)}" target="_blank" rel="noopener">${esc(x.t)}</a>` : esc(x.t));
  // A value as the sheet shows it: a list's lines (a list of sources: each its words, linked), a text, a dash for none.
  const shVal = v =>
    v == null
      ? '<p class="adm-csv adm-csnone">—</p>'
      : Array.isArray(v)
        ? `<ul class="adm-csv">${v.map(x => `<li>${isObj(x) ? srcA(x) : esc(x)}</li>`).join('')}</ul>`
        : `<p class="adm-csv">${esc(v)}</p>`;
  // An edit's source under its text; its link only when it is a web address (srcA).
  const shSrc = s => {
    const x = C.contentSrc(s);
    return x ? `<p class="adm-cssrc">${srcA(x)}</p>` : '';
  };
  const shBox = r => {
    const s0 = C.contentSrc(r.e && r.e.src) || {t: '', u: ''},
      srcs = r.sp.t === 'srcs',
      // what was typed so far, else the text in force (a list of sources: srcsText) and its source
      text = SH_ED.text != null ? SH_ED.text : r.v == null ? '' : srcs ? srcsText(r.v) : Array.isArray(r.v) ? r.v.join('\n') : r.v,
      s = {t: SH_ED.t != null ? SH_ED.t : s0.t, u: SH_ED.u != null ? SH_ED.u : s0.u || ''},
      ask = SH_ASK === rowKey(r);
    // A list of sources is its own source: no Source and Link of the edit's (its lines are "words | link").
    return `<div class="adm-csed"><textarea data-cst rows="${r.sp.t === 'list' || srcs ? Math.max(3, (r.v || []).length + 1) : 2}" aria-label="${esc(r.name)}"${srcs ? ' placeholder="One source a line: its words | its link"' : ''}>${esc(text)}</textarea>
      ${srcs ? '' : `<span class="adm-cssrcs${ask ? ' need' : ''}"><input type="text" data-css value="${esc(s.t)}" placeholder="Source" aria-label="Source" autocomplete="off"><input type="url" data-csu value="${esc(s.u || '')}" placeholder="Link" aria-label="Link" autocomplete="off"></span>`}
      <span class="adm-acts"><button type="button" data-csa="save" class="on">${ask ? 'Save without source' : 'Save'}</button><button type="button" data-csa="cancel">Cancel</button></span></div>`;
  };
  function shRow(r, id, can) {
    const orphan = r.state === 'orphan',
      ed = can && !orphan && !!SH_ED && SH_ED.id === id && SH_ED.ck === rowKey(r),
      chip = orphan
        ? `<b class="warnc adm-cschip">${esc(WHY[r.why] || r.why)}</b>`
        : r.state
          ? `<span class="adm-src adm-cschip c-${r.state}">${r.e.v == null && r.state !== 'absorbed' ? 'Hidden' : STATE[r.state]}</span>`
          : '',
      acts =
        !can || ed
          ? ''
          : orphan || r.state === 'absorbed'
            ? `<button type="button" data-csa="drop" title="Remove">Remove</button>`
            : r.state === 'stale'
              ? `<button type="button" data-csa="keep">Keep mine</button><button type="button" data-csa="drop">Take the new</button><button type="button" data-csa="edit">Edit</button>`
              : `<button type="button" data-csa="edit" title="Edit">✎</button>${r.v != null ? '<button type="button" data-csa="hide" title="Hide">⊘</button>' : ''}${r.e ? '<button type="button" data-csa="drop" title="Restore">↺</button>' : ''}`;
    const body = ed
      ? shBox(r)
      : r.state === 'stale'
        ? `<div class="adm-cs3"><div><small>When edited</small>${shVal(r.e.was)}</div><div><small>Now</small>${shVal(r.base)}</div><div><small>Mine</small>${shVal(r.e.v)}${shSrc(r.e.src)}</div></div>`
        : orphan
          ? shVal(isObj(r.e) && (Array.isArray(r.e.v) || typeof r.e.v === 'string') ? r.e.v : null)
          : `${shVal(r.v)}${r.e ? shSrc(r.e.src) : ''}${r.e && r.state === 'fresh' ? `<details class="adm-csorig"><summary>Original</summary>${shVal(r.base)}</details>` : ''}`;
    return `<div class="adm-cslot${r.state ? ' is-' + r.state : ''}" data-cs="${esc(r.slot)}" data-ck="${esc(rowKey(r))}"><div class="adm-cshd"><b>${esc(r.name)}</b>${r.sp && r.sp.imr ? '<span class="adm-src adm-imrt">IMR</span>' : ''}${chip}${acts ? `<span class="adm-acts">${acts}</span>` : ''}</div>${body}</div>`;
  }
  // The box on node id's page (R: fish.json as built; nameOf: a node's name), '' for a node with no sheet in the app.
  function sheetBox(S, R, id, nameOf) {
    if (!R || !S.content || !sheetOwn(R, id, S)) return '';
    const rows = sheetSlots(S, R, shGet(S), id, nameOf),
      can = mayContent(),
      ne = rows.filter(r => r.e).length,
      nc = rows.filter(r => r.state === 'stale' || r.state === 'orphan').length,
      open = nc || (SH_ED && SH_ED.id === id) || store.get(SH_KEY, false) === true;
    return `<details class="adm-row adm-csheet" data-csid="${esc(id)}"${open ? ' open' : ''}><summary><h3>Sheet${ne ? ` <small>${ne} edit${ne > 1 ? 's' : ''}${nc ? ` · <b class="warnc">${nc} to check</b>` : ''}</small>` : ''}</h3></summary><div class="adm-cslots">${rows.map(r => shRow(r, id, can)).join('')}</div></details>`;
  }
  function sheetBind(scope, S, R, id) {
    const box = scope.querySelector(`.adm-csheet[data-csid="${CSS.escape(id)}"]`);
    if (!box) return;
    // remembered when he folds or opens it (a box opened by the page, an edit to check, is not his choice)
    const sm = box.querySelector('summary');
    if (sm) sm.addEventListener('click', () => store.set(SH_KEY, !box.open));
    const rows = new Map(sheetSlots(S, R, shGet(S), id).map(r => [rowKey(r), r]));
    // What he types is kept with the open row (SH_ED), so a redraw never loses it.
    box.querySelectorAll('[data-cst], [data-css], [data-csu]').forEach(
      x =>
        (x.oninput = () => {
          if (!SH_ED || SH_ED.id !== id) return;
          SH_ED[x.matches('[data-cst]') ? 'text' : x.matches('[data-css]') ? 't' : 'u'] = x.value;
        })
    );
    box.querySelectorAll('[data-csa]').forEach(
      b =>
        (b.onclick = () => {
          const el = b.closest('[data-ck]'),
            r = rows.get(el.dataset.ck),
            a = b.dataset.csa,
            now = Date.now();
          if (!r) return;
          if (a === 'edit') {
            SH_ED = {id, ck: rowKey(r)};
            SH_ASK = null;
            render();
            const t = scope.querySelector(`.adm-csheet [data-ck="${CSS.escape(rowKey(r))}"] textarea`);
            if (t) t.focus();
            return;
          }
          if (a === 'cancel') {
            SH_ED = SH_ASK = null;
            return render();
          }
          if (a === 'drop') return shPut(S, c => C.contentDrop(c, r.eid, r.slot));
          // An entry stored under an old id (SUBJECTS renamed) moves to the node's id in the same step, whatever the click
          // writes (a Hide must not leave the old id's entry in force).
          const mv = c => (r.eid !== id ? C.contentDrop(c, r.eid, r.slot) : c);
          if (a === 'hide') return shPut(S, c => C.contentSet(mv(c), id, r.slot, null, r.base, null, now));
          // Keep mine: his text against the base now (no longer stale).
          if (a === 'keep') return shPut(S, c => C.contentSet(mv(c), id, r.slot, r.e.v, r.base, r.e.src, now));
          if (a === 'save') {
            const v = sheetVal(r.sp, el.querySelector('[data-cst]').value),
              si = el.querySelector('[data-css]'),
              ui = el.querySelector('[data-csu]'),
              t = si ? si.value.trim() : '',
              u = ui ? ui.value.trim() : '',
              src = t || u ? {t: t || u, u} : null;
            // A slot the base leaves empty, filled with no source: asked once (encouraged, never required). A list
            // of sources is its own (no box to ask in).
            if (r.base == null && v != null && !src && si && SH_ASK !== rowKey(r)) {
              SH_ASK = rowKey(r);
              const k = el.querySelector('.adm-cssrcs'),
                sv = el.querySelector('[data-csa="save"]');
              if (k) k.classList.add('need');
              if (sv) sv.textContent = 'Save without source';
              const si = el.querySelector('[data-css]');
              if (si) si.focus();
              return;
            }
            return shPut(S, c => C.contentSet(mv(c), id, r.slot, v, r.base, src, now));
          }
        })
    );
  }
  // The bar's count of the edits to check (stale and orphaned) across the subject's content, linking to the first one's
  // page (href(id)) when its node has one; '' when none.
  function sheetWarn(S, R, href) {
    if (!R || !S.content) return '';
    const L = sheetTodo(S, R, shGet(S));
    if (!L.length) return '';
    const at = L.find(x => x.why !== 'node') || null;
    return `<${at ? `a href="${esc(href(at.node))}"` : 'b'} class="warnc adm-csw" title="${esc(L.map(x => `${x.id} ${x.slot}: ${x.why ? whyOf(S, x.why) : STATE[x.state]}`).join('\n'))}">${L.length} sheet edit${L.length > 1 ? 's' : ''} to check</${at ? 'a' : 'b'}>`;
  }
  // ---- The structure editor (design note v2, step 4): circles and look-alike pairs are the instance's, set by its
  // content editor; a change replays every player's progress ----
  // On a family page the app gives a sheet (sheetOwn: never a wink family, whose surprise card has no circle of its own):
  // - Circle: one segment per circle the subject declares, and None (in no circle: off the game); the one in force pressed.
  //   A click is one draft step (the circle slot of the node, core.js contentSet: the base value removes the entry). ↺
  //   Restore; a stale one (the base changed since: his stays in force) shows when edited, now and his, with Keep
  //   mine and Take the new; one the base now says (absorbed), or never applied, Remove.
  // - Look-alikes: each pair of the family, the base's and his (pairRows), its other family's name opening its page;
  //   Withdraw a pair in force, ↺ Restore his (a withdrawal or an addition), Remove one absorbed or never applied. Add a
  //   look-alike…: the other family, then Source and Link (asked once when left empty, never required; Save
  //   without source then saves): one draft step (core.js contentPairSet). Its words are the look/<id> line of each sheet,
  //   which shows at once (sheetFile).
  // The same pair tools in the Look-alikes filter of every Tree page (structBar): + Pair (both families chosen) under Any
  // look-alike, the pair's state and tools under one pair.
  const ST_STATE = {fresh: 'Edited', stale: 'Base changed', absorbed: 'In the base'};
  const stLab = c => (c == null ? 'None' : String(c));
  // Why an entry is never applied, in words: a held one (the subject's own guard, SUBJECTS structure pairs hold: the
  // corals' ★ rule) in the subject's word for it (held).
  const whyOf = (S, w) => (w === 'hold' && S && S.structure && S.structure.pairs && S.structure.pairs.held) || WHY[w] || w;
  const stChip = (r, t, S) =>
    r.state === 'orphan'
      ? `<b class="warnc adm-cschip">${esc(whyOf(S, r.why))}</b>`
      : r.state
        ? `<span class="adm-src adm-cschip c-${r.state}">${esc(t || ST_STATE[r.state])}</span>`
        : '';
  // A pair's word for its state: Withdrawn or Added while his entry applies, else the state's.
  const pairWord = r => (r.state === 'fresh' || r.state === 'stale' ? (r.v === 1 ? 'Added' : 'Withdrawn') : '');
  // Whether withdrawing pair k (a pair of the base, in force) would be held by the subject's own guard (core.js
  // structEntries hold: the corals' ★ rule, a starred genus keeping a surveyed look-alike), so its Withdraw is off.
  const wouldHold = (S, R, Cm, k) =>
    !!(S.structure.pairs && typeof S.structure.pairs.hold === 'function') &&
    C.structEntries(S, R, C.contentPairSet(Cm, k, null, 1, null, 0)).pairs.some(x => x.key === k && x.why === 'hold');
  // A pair's tools: Withdraw one in force from the base (off, with why, when the subject's guard would hold it), ↺ his
  // own, Remove one absorbed or never applied.
  const pairActs = (r, held, S) =>
    r.state === 'orphan' || r.state === 'absorbed'
      ? `<button type="button" data-sta="drop" title="Remove">Remove</button>`
      : r.e
        ? `<button type="button" data-sta="drop" title="Restore">↺</button>`
        : held
          ? `<button type="button" data-sta="withdraw" disabled title="${esc(whyOf(S, 'hold'))}">Withdraw</button>`
          : `<button type="button" data-sta="withdraw">Withdraw</button>`;
  // The nodes a pair may join (the pair rank's nodes with a sheet in the app), by name.
  const pairNodes = (S, R, nameOf) =>
    [...C.contentNodes(S, R)]
      .filter(([id, n]) => n.rank === S.structure.pairs.rank && sheetOwn(R, id, S))
      .map(([id]) => [id, nameOf(id)])
      .sort((a, b) => (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0));
  // The add box (ST_ADD): the other node (at a page: a's fixed) or both (the filter), Source and Link, Save, Cancel; the
  // first select named by the subject's unit (SUBJECTS one: Family, Genus).
  function stAddBox(S, R, nameOf) {
    const A = ST_ADD,
      L = pairNodes(S, R, nameOf),
      one = (s => s.charAt(0).toUpperCase() + s.slice(1))(String(S.one || 'node')),
      sel = (k, v) =>
        `<select class="adm-fgsel" data-st-${k} aria-label="${k === 'a' ? one : 'Look-alike'}"><option value="">${k === 'a' ? one + '…' : 'Look-alike…'}</option>${L.filter(
          ([id]) => id !== (k === 'a' ? A.b : A.a)
        )
          .map(([id, n]) => `<option value="${esc(id)}"${id === v ? ' selected' : ''}>${esc(n)}</option>`)
          .join('')}</select>`;
    return `<div class="adm-csed adm-stadd" data-stbox>${A.at ? `<b>${esc(nameOf(A.a))} · ${esc(nameOf(A.b))}</b>` : `<span class="adm-stab">${sel('a', A.a)}${sel('b', A.b)}</span>`}
      <span class="adm-cssrcs${A.ask ? ' need' : ''}"><input type="text" data-sts value="${esc(A.t || '')}" placeholder="Source" aria-label="Source" autocomplete="off"><input type="url" data-stu value="${esc(A.u || '')}" placeholder="Link" aria-label="Link" autocomplete="off"></span>
      <span class="adm-acts"><button type="button" data-sta="save" class="on">${A.ask ? 'Save without source' : 'Save'}</button><button type="button" data-sta="cancel">Cancel</button></span></div>`;
  }
  // The box on node id's page (R: the built file, fish.json or data.json; nameOf a node's name, href its page), '' for a
  // node with no sheet in the app, or of no circle rank and no pair rank. A subject with pairs and no circles (the corals,
  // design note v2 step 8: their slate is not the editor's) gets the look-alikes alone.
  function structBox(S, R, id, nameOf, href) {
    if (!R || !S.structure || !sheetOwn(R, id, S)) return '';
    const Cm = shGet(S),
      D = S.structure,
      cr = D.circle ? circleRow(S, R, Cm, id) : null,
      pn = D.pairs ? C.contentNodes(S, R).get(id) : null,
      pr = !!pn && pn.rank === D.pairs.rank;
    // a subject with circles: the box on its circle rank's pages; without: on its pair rank's
    if (D.circle ? !cr : !pr) return '';
    const can = mayContent(),
      P = pr ? pairRows(S, R, Cm, id) : [],
      seg = !cr
        ? ''
        : `<span class="adm-qseg adm-lvseg adm-stseg" role="group" aria-label="Circle">${[...cr.of, null]
            .map(
              c =>
                `<button type="button" data-stc="${c == null ? '' : c}" aria-pressed="${cr.v === c}"${can ? '' : ' disabled'}>${stLab(c)}</button>`
            )
            .join('')}</span>`,
      cActs =
        !can || !cr
          ? ''
          : cr.state === 'orphan' || cr.state === 'absorbed'
            ? `<button type="button" data-sta="drop" title="Remove">Remove</button>`
            : cr.state === 'stale'
              ? `<button type="button" data-sta="keep">Keep mine</button><button type="button" data-sta="drop">Take the new</button>`
              : cr.e
                ? `<button type="button" data-sta="drop" title="Restore">↺</button>`
                : '',
      cBody = !cr
        ? ''
        : cr.state === 'stale'
          ? `<div class="adm-cs3"><div><small>When edited</small><p class="adm-csv">${stLab(cr.e.was)}</p></div><div><small>Now</small><p class="adm-csv">${stLab(cr.base)}</p></div><div><small>Mine</small><p class="adm-csv">${stLab(cr.e.v)}</p></div></div>`
          : cr.state === 'fresh'
            ? `<p class="adm-cssrc">Original: ${stLab(cr.base)}</p>`
            : '',
      circle = !cr
        ? ''
        : `<div class="adm-cslot${cr.state ? ' is-' + cr.state : ''}" data-stcid="${esc(id)}"><div class="adm-cshd"><b>Circle</b>${seg}${stChip(cr, '', S)}${cActs ? `<span class="adm-acts">${cActs}</span>` : ''}</div>${cBody}</div>`,
      other = r => (r.a === id ? r.b : r.a),
      pairs = P.map(r => {
        const o = other(r),
          own = o && sheetOwn(R, o, S),
          held = can && !r.e && r.v === 1 && wouldHold(S, R, Cm, r.key);
        return `<div class="adm-cslot${r.state ? ' is-' + r.state : ''}${r.v === 1 ? '' : ' is-out'}" data-stp="${esc(r.key)}"><div class="adm-cshd">${own ? `<a href="${esc(href(o))}">${esc(nameOf(o))}</a>` : `<b>${esc(o ? nameOf(o) : r.key)}</b>`}${stChip(r, pairWord(r), S)}${can ? `<span class="adm-acts">${pairActs(r, held, S)}</span>` : ''}</div>${r.e && r.v === 1 ? shSrc(r.e.src) : ''}</div>`;
      }).join(''),
      inForce = new Set(P.filter(r => r.v === 1).map(other)),
      add =
        can && ST_ADD && ST_ADD.at === id
          ? stAddBox(S, R, nameOf)
          : can
            ? `<select class="adm-fgsel" data-stadd aria-label="Add a look-alike"><option value="">Add a look-alike…</option>${pairNodes(
                S,
                R,
                nameOf
              )
                .filter(([o]) => o !== id && !inForce.has(o))
                .map(([o, n]) => `<option value="${esc(o)}">${esc(n)}</option>`)
                .join('')}</select>`
            : '';
    return `<section class="adm-row adm-cstruct" data-stid="${esc(id)}"><h3>Structure</h3><div class="adm-cslots">${circle}<div class="adm-cslot adm-stpairs"><div class="adm-cshd"><b>Look-alikes</b></div><div class="adm-cslots">${pairs}</div>${add}</div></div></section>`;
  }
  // The Look-alikes filter's tools (the bar of every Tree page, beside the tag select): under Any look-alike (tag 'look'),
  // + Pair; under one pair (tag 'look:<key>'), its state and tools. '' for any other tag or without the content right.
  function structBar(S, R, tag) {
    if (!R || !S.structure || !S.structure.pairs || !mayContent() || !tag) return '';
    if (tag === 'look')
      return `<button type="button" class="adm-chip" data-stnew aria-pressed="${!!ST_ADD && ST_ADD.at === ''}">+ Pair</button>`;
    if (!tag.startsWith('look:')) return '';
    const Cm = shGet(S),
      r = pairRows(S, R, Cm).find(x => x.key === tag.slice(5));
    return r
      ? `<span class="adm-stbar adm-acts" data-stp="${esc(r.key)}">${stChip(r, pairWord(r), S)}${pairActs(r, !r.e && r.v === 1 && wouldHold(S, R, Cm, r.key), S)}</span>`
      : '';
  }
  // The filter's add box (ST_ADD from + Pair), '' when none is open.
  const structAdd = (S, R, nameOf) =>
    R && S.structure && mayContent() && ST_ADD && ST_ADD.at === ''
      ? `<section class="adm-row adm-cstruct">${stAddBox(S, R, nameOf)}</section>`
      : '';
  // Every structure tool in scope (the page and its bar), each click one draft step (shPut).
  function structBind(scope, S, R) {
    if (!R || !S.structure) return;
    const now = () => Date.now(),
      Cm = () => shGet(S),
      box = scope.querySelector('[data-stbox]');
    scope.querySelectorAll('[data-stid] [data-stc]').forEach(
      b =>
        (b.onclick = () => {
          const id = b.closest('[data-stid]').dataset.stid,
            cr = circleRow(S, R, Cm(), id),
            v = b.dataset.stc === '' ? null : Number(b.dataset.stc);
          if (!cr || v === cr.v) return;
          shPut(S, c => C.contentSet(c, id, C.CIRCLE_SLOT, v, cr.base, null, now()));
        })
    );
    scope.querySelectorAll('[data-stcid] [data-sta]').forEach(
      b =>
        (b.onclick = () => {
          const id = b.closest('[data-stcid]').dataset.stcid,
            cr = circleRow(S, R, Cm(), id);
          if (!cr || !cr.e) return;
          if (b.dataset.sta === 'keep') return shPut(S, c => C.contentSet(c, id, C.CIRCLE_SLOT, cr.e.v, cr.base, cr.e.src, now()));
          shPut(S, c => C.contentDrop(c, id, C.CIRCLE_SLOT));
        })
    );
    scope.querySelectorAll('[data-stp] [data-sta]').forEach(
      b =>
        (b.onclick = () => {
          const k = b.closest('[data-stp]').dataset.stp,
            r = pairRows(S, R, Cm()).find(x => x.key === k);
          if (!r) return;
          if (b.dataset.sta === 'withdraw') return shPut(S, c => C.contentPairSet(c, k, null, r.base, null, now()));
          shPut(S, c => C.contentPairDrop(c, k));
        })
    );
    const sel = scope.querySelector('[data-stadd]');
    if (sel)
      sel.onchange = () => {
        if (!sel.value) return;
        const id = sel.closest('[data-stid]').dataset.stid;
        ST_ADD = {at: id, a: id, b: sel.value};
        render();
        const s = scope.querySelector('[data-stbox] [data-sts]');
        if (s) s.focus();
      };
    const nw = scope.querySelector('[data-stnew]');
    if (nw)
      nw.onclick = () => {
        ST_ADD = ST_ADD && ST_ADD.at === '' ? null : {at: '', a: '', b: ''};
        render();
      };
    if (!box || !ST_ADD) return;
    // What he types is kept with the box (ST_ADD), so a redraw never loses it.
    box
      .querySelectorAll('[data-sts], [data-stu]')
      .forEach(x => (x.oninput = () => ST_ADD && (ST_ADD[x.matches('[data-sts]') ? 't' : 'u'] = x.value)));
    box.querySelectorAll('[data-st-a], [data-st-b]').forEach(
      x =>
        (x.onchange = () => {
          if (!ST_ADD) return;
          ST_ADD[x.matches('[data-st-a]') ? 'a' : 'b'] = x.value;
          render();
        })
    );
    box.querySelectorAll('[data-sta]').forEach(
      b =>
        (b.onclick = () => {
          if (b.dataset.sta === 'cancel') {
            ST_ADD = null;
            return render();
          }
          const A = ST_ADD,
            t = (box.querySelector('[data-sts]').value || '').trim(),
            u = (box.querySelector('[data-stu]').value || '').trim(),
            src = t || u ? {t: t || u, u} : null;
          if (!A || !A.a || !A.b || A.a === A.b) return;
          const k = C.contentPairKey(A.a, A.b),
            r = pairRows(S, R, Cm()).find(x => x.key === k),
            base = r ? r.base : null;
          // A pair added with no source: asked once (encouraged, never required).
          if (base == null && !src && !A.ask) {
            ST_ADD = {...A, t, u, ask: true};
            render();
            const s = scope.querySelector('[data-stbox] [data-sts]');
            if (s) s.focus();
            return;
          }
          shPut(S, c => C.contentPairSet(c, k, 1, base, src, now()));
        })
    );
  }
  Object.assign(root, {
    sheetBox,
    sheetBind,
    sheetWarn,
    sheetSlots,
    sheetOwn,
    sheetVal,
    srcsText,
    sheetTodo,
    mayContent,
    contentShells,
    sheetFile,
    circleRow,
    pairRows,
    structChanged,
    montPairs,
    structBox,
    structBar,
    structAdd,
    structBind
  });
})(this);
