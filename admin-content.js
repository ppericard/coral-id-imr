// Photos › Tree, a node's page: its sheet's text and the content editor's edits (docs/reviews/2026-11-14-sheet-overlay-
// design.md v2, step 2; Pierre, 2026-11-15, Q359 and Q366). Every slot the subject declares for the node's rank (core.js
// SUBJECTS content: its name, IMR's or ours) with its text in force: the built file's (fish.json, the base: the sources and
// the instance's layer), else his edit (core.js contentApply).
// - ✎ Edit opens a box (a list one line per item; an emptied box hides the slot), with Source and Link (optional and
//   encouraged, never required: Q359 e); when he fills a slot the base leaves empty, Save asks for a source once
//   (Save without source then saves). ⊘ Hide. ↺ Restore: the original again (kept in was; More shows it beside his).
// - An edit whose base changed since (stale: core.js contentState) shows the three texts, when he edited, now and his,
//   with Keep mine (his text against the base now), Take the new (his entry goes) and Edit; players keep his text until
//   he answers (Q359 c). One the base now says (absorbed): Remove. An entry never applied (orphaned: core.js
//   contentEntries) shows its text with Remove; one whose node is gone is counted in the bar.
// - Each click one draft step, undone and redone as any (rule A2); his Publish sends them (rule A1), counted per rank.
// - Only a node the app gives a sheet (core.js fishTree go): never a genus the app sends to its species or its family, a
//   wink family (its surprise card) or a WoRMS taxon (design note, call (f)).
// - Who may edit: mayContent, the one place the content right is asked (today the token that can publish, phase 0 of the
//   design; roles step 1 puts can_(account, 'content', instance) there, Q364), for the controls and for every write.
// The bar of every Tree page counts the edits to check (stale and orphaned: sheetWarn), linking to the first one's page.
//
// The pure part (sheetSlots, sheetOwn, sheetVal, sheetTodo) runs in Node too: tests/sheeteditor.test.js.
(function (root) {
  const node = typeof module !== 'undefined' && module.exports,
    C = node ? require('./core.js') : root,
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
  // Node id's sheet under content map Cm, built file R: one row per slot its rank declares (a keyed slot once per line the
  // base holds), {slot, sp, key, name (a keyed slot's: the other node's name, nameOf), base, e (his entry, or null), eid (its
  // stored id: an old id read through SUBJECTS renamed), state ('' when none, else fresh, stale, absorbed), v (in force)};
  // then the node's entries never applied, {slot, name, e, eid, state: 'orphan', why}. [] for a node S declares no rank for.
  function sheetSlots(S, R, Cm, id, nameOf = x => x) {
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
  // that is not a wink, a genus the app opens as itself, a species of a family.
  let OWN = null;
  function sheetOwn(R, id) {
    if (!OWN || OWN.R !== R) OWN = {R, T: C.fishTree(R)};
    const T = OWN.T;
    if (T.fam[id]) return !T.fam[id].wink;
    if (T.gen[id]) return T.go(id) === id;
    return !!T.sp[id];
  }
  // The text of the editor's box as the slot's value: a list one item per non-empty line; a text its words on one line;
  // null when nothing is left (the slot hidden).
  function sheetVal(sp, text) {
    const s = String(text || '');
    if (sp.t === 'list') {
      const L = s
        .split('\n')
        .map(x => x.trim())
        .filter(Boolean);
      return L.length ? L : null;
    }
    return s.replace(/\s+/g, ' ').trim() || null;
  }
  // The edits to check in content map Cm: [{id, node, slot, state, why}], the stale and the orphaned, in node order.
  const sheetTodo = (S, R, Cm) =>
    C.contentEntries(S, R, Cm)
      .filter(x => x.state === 'stale' || x.state === 'orphan')
      .map(x => ({id: x.id, node: x.node, slot: x.slot, state: x.state, ...(x.why ? {why: x.why} : {})}));
  if (node) {
    module.exports = {sheetSlots, sheetOwn, sheetVal, sheetTodo};
    return;
  }

  // ---- The page (admin.js renderFishUnits) ----
  // The content right (Q342, Q364): today the token that can publish (phase 0); roles step 1 asks the sheet here.
  const mayContent = () => !!TOKEN;
  let SH_ED = null, // this tab: the slot open in the editor, {id, slot}
    SH_ASK = null; // this tab: the slot whose Save already asked for a source
  const SH_KEY = 'reefid-admin-csheet'; // the box open or folded (this browser)
  // The subject's content map in the draft, and one write: one Save, one Undo step (saveDraft), a new map each time.
  const shGet = S => C.contentOf(DRAFT, S);
  function shPut(S, f) {
    if (!mayContent()) return;
    const c = f(shGet(S));
    if (S.admin.cur) DRAFT[S.admin.cur] = {...(DRAFT[S.admin.cur] || {}), content: c};
    else DRAFT.content = c;
    SH_ED = SH_ASK = null;
    saveDraft();
    render();
  }
  const WHY = {node: 'node gone', slot: 'no such slot', value: 'not its type', shadow: 'old id'};
  const STATE = {fresh: 'Edited', stale: 'Base changed', absorbed: 'In the base'};
  // A value as the sheet shows it: a list's lines, a text, a dash for none.
  const shVal = v =>
    v == null
      ? '<p class="adm-csv adm-csnone">—</p>'
      : Array.isArray(v)
        ? `<ul class="adm-csv">${v.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`
        : `<p class="adm-csv">${esc(v)}</p>`;
  const shSrc = s => {
    const x = C.contentSrc(s);
    return x ? `<p class="adm-cssrc">${x.u ? `<a href="${esc(x.u)}" target="_blank" rel="noopener">${esc(x.t)}</a>` : esc(x.t)}</p>` : '';
  };
  const shBox = r => {
    const text = r.v == null ? '' : Array.isArray(r.v) ? r.v.join('\n') : r.v,
      s = C.contentSrc(r.e && r.e.src) || {t: '', u: ''},
      ask = SH_ASK === r.slot;
    return `<div class="adm-csed"><textarea data-cst rows="${r.sp.t === 'list' ? Math.max(3, (r.v || []).length + 1) : 2}" aria-label="${esc(r.name)}">${esc(text)}</textarea>
      <span class="adm-cssrcs${ask ? ' need' : ''}"><input type="text" data-css value="${esc(s.t)}" placeholder="Source" aria-label="Source" autocomplete="off"><input type="url" data-csu value="${esc(s.u || '')}" placeholder="Link" aria-label="Link" autocomplete="off"></span>
      <span class="adm-acts"><button type="button" data-csa="save" class="on">${ask ? 'Save without source' : 'Save'}</button><button type="button" data-csa="cancel">Cancel</button></span></div>`;
  };
  function shRow(r, id, can) {
    const ed = can && SH_ED && SH_ED.id === id && SH_ED.slot === r.slot,
      orphan = r.state === 'orphan',
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
    return `<div class="adm-cslot${r.state ? ' is-' + r.state : ''}" data-cs="${esc(r.slot)}"><div class="adm-cshd"><b>${esc(r.name)}</b>${r.sp && r.sp.imr ? '<span class="adm-src adm-imrt">IMR</span>' : ''}${chip}${acts ? `<span class="adm-acts">${acts}</span>` : ''}</div>${body}</div>`;
  }
  // The box on node id's page (R: fish.json as built; nameOf: a node's name), '' for a node with no sheet in the app.
  function sheetBox(S, R, id, nameOf) {
    if (!R || !S.content || !sheetOwn(R, id)) return '';
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
    const rows = new Map(sheetSlots(S, R, shGet(S), id).map(r => [r.slot, r]));
    box.querySelectorAll('[data-csa]').forEach(
      b =>
        (b.onclick = () => {
          const el = b.closest('[data-cs]'),
            r = rows.get(el.dataset.cs),
            a = b.dataset.csa,
            now = Date.now();
          if (!r) return;
          if (a === 'edit') {
            SH_ED = {id, slot: r.slot};
            SH_ASK = null;
            render();
            const t = scope.querySelector(`.adm-csheet [data-cs="${CSS.escape(r.slot)}"] textarea`);
            if (t) t.focus();
            return;
          }
          if (a === 'cancel') {
            SH_ED = SH_ASK = null;
            return render();
          }
          if (a === 'drop') return shPut(S, c => C.contentDrop(c, r.eid, r.slot));
          if (a === 'hide') return shPut(S, c => C.contentSet(c, id, r.slot, null, r.base, null, now));
          // Keep mine: his text against the base now (no longer stale), under the id it is stored at.
          if (a === 'keep') return shPut(S, c => C.contentSet(c, r.eid, r.slot, r.e.v, r.base, r.e.src, now));
          if (a === 'save') {
            const v = sheetVal(r.sp, el.querySelector('[data-cst]').value),
              t = el.querySelector('[data-css]').value.trim(),
              u = el.querySelector('[data-csu]').value.trim(),
              src = t || u ? {t: t || u, u} : null;
            // A slot the base leaves empty, filled with no source: asked once (Q359 e: encouraged, never required).
            if (r.base == null && v != null && !src && SH_ASK !== r.slot) {
              SH_ASK = r.slot;
              const k = el.querySelector('.adm-cssrcs'),
                sv = el.querySelector('[data-csa="save"]');
              if (k) k.classList.add('need');
              if (sv) sv.textContent = 'Save without source';
              const si = el.querySelector('[data-css]');
              if (si) si.focus();
              return;
            }
            // An old id's entry (SUBJECTS renamed) is moved to the node's id: the old one goes in the same step.
            return shPut(S, c => C.contentSet(r.eid !== id ? C.contentDrop(c, r.eid, r.slot) : c, id, r.slot, v, r.base, src, now));
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
    return `<${at ? `a href="${esc(href(at.node))}"` : 'b'} class="warnc adm-csw" title="${esc(L.map(x => `${x.id} ${x.slot}: ${x.why ? WHY[x.why] || x.why : STATE[x.state]}`).join('\n'))}">${L.length} sheet edit${L.length > 1 ? 's' : ''} to check</${at ? 'a' : 'b'}>`;
  }
  Object.assign(root, {sheetBox, sheetBind, sheetWarn, sheetSlots, sheetOwn, sheetVal, sheetTodo, mayContent});
})(this);
