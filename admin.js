// IMR Coral ID: photo curation back-office (admin.html, not linked from the app).
// Edits curation.json: per genus, the cover photo, the featured photos of each view (in order),
// hidden photos and photos moved to another view. app.js applies it on top of data.json (applyCuration).
// Saving commits curation.json to the repo through the GitHub API with a fine-grained token. The token is
// kept in this browser only, encrypted with the admin password (the password alone protects nothing else:
// the page is public code, the token is what allows writing).
const REPO = 'ppericard/coral-id-imr', BRANCH = 'main', FILE = 'curation.json', API = `https://api.github.com/repos/${REPO}`;
const VIEWS = [['wide', 'Colony'], ['medium', 'Closer'], ['macro', 'Corallites']], FEAT = 3;
const $v = document.getElementById('view'), $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const store = {
  get(k, d){ try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v){ try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
const img = (p, s) => `img/${p.f}${s ? '-s' : ''}.webp`;
const clone = o => JSON.parse(JSON.stringify(o));
const same = (a, b) => JSON.stringify(a || null) === JSON.stringify(b || null);

let PHOTOS = {}, KNOWN = new Set(), DATA, SAVED = {v: 1, genera: {}}, SHA = null, DRAFT, TOKEN = null, cur = null, AUTOQ = {}, AUTOF = {}, lastGenus = null;
// Photo quality: 3 good, 2 fair, 1 poor (material for a realistic mode). First ratings come from quality.json
// (tools/photo_quality.py, rough on purpose); Pierre's corrections live in curation.json "quality" {f: level}.
const QUAL = [[3, 'Good'], [2, 'Fair'], [1, 'Poor']];
const qOf = f => (DRAFT.quality || {})[f] || AUTOQ[f] || 2, qSet = f => !!(DRAFT.quality || {})[f];
// Every click is saved at once as a draft in this browser (it survives a reload or closing the tab);
// Publish sends the draft to the public site.
let draftAt = null;
// No button ever clears several choices at once: Undo (or Ctrl+Z) steps back one click at a time, within this visit.
// Redo (or Ctrl+Shift+Z / Ctrl+Y) steps forward again; a new click clears the redo steps.
let HIST = [], FUT = [], snap = null;
function saveDraft(){ if (snap !== null) HIST.push(snap); if (HIST.length > 300) HIST.shift(); FUT = []; snap = JSON.stringify(DRAFT); store.set('imr-curation-draft', DRAFT); draftAt = new Date(); }
function step(from, to, msg){
  if (!from.length) return toast(msg[0]);
  to.push(snap); snap = from.pop(); DRAFT = JSON.parse(snap); store.set('imr-curation-draft', DRAFT); draftAt = new Date(); render(); toast(msg[1]);
}
const undo = () => step(HIST, FUT, ['Nothing to undo.', 'Undone.']), redo = () => step(FUT, HIST, ['Nothing to redo.', 'Redone.']);
const qChanged = () => !same(DRAFT.quality || {}, SAVED.quality || {});
// Excluded photos (curation.json "exclude" {f: reason}): unusable for good (a person, a drawing, AI…). Unlike Hide,
// which is a per-genus editorial choice, exclusion removes the photo from every genus, game and candidate list,
// and import scripts skip it so it never comes back. The Excluded view lists them, to restore one.
const excl = f => (DRAFT.exclude || {})[f];
const xChanged = () => !same(DRAFT.exclude || {}, SAVED.exclude || {});
// Coral Finder book photos on the site (curation.json "book": false switches every one of them off at once).
const bookOn = o => o.book !== false, bChanged = () => bookOn(DRAFT) !== bookOn(SAVED);
const qTag = p => { const q = qOf(p.f); return `<span class="adm-q q${q}${qSet(p.f) ? '' : ' auto'}" title="${qSet(p.f) ? 'Quality set by you' : 'Automatic first guess'}">${QUAL.find(x => x[0] === q)[1]}</span>`; };
const qSeg = p => `<span class="adm-qseg" role="group" aria-label="Quality">${QUAL.map(([q, t]) => `<button type="button" data-q="${q}" aria-pressed="${qOf(p.f) === q}" class="q${q}">${t}</button>`).join('')}</span>`;
function setQ(f, q){
  DRAFT.quality = DRAFT.quality || {};
  // Always recorded, even when it matches the automatic guess: a later re-run of photo_quality.py must never change it.
  DRAFT.quality[f] = q;
  saveDraft();
}
// Growth form of each photo: the Coral Finder front-page forms (data.json key: B, M, S, P, F, L, C), several when
// several show, or x = form not visible (too close). First guesses come from forms.json (Claude, from the image);
// Pierre's choices live in curation.json "form" {f: 'B' | 'FL' | 'x'} and always win. The site's growth-form
// tiles only use photos tagged with that form.
const FORM_ORDER = 'BMSPFLC', fOf = f => (DRAFT.form || {})[f] || AUTOF[f] || '', fSet = f => !!(DRAFT.form || {})[f];
const fChanged = () => !same(DRAFT.form || {}, SAVED.form || {});
const fName = id => id === 'x' ? 'Form not visible' : (DATA.key.find(k => k.id === id) || {}).name || id;
const fNorm = v => v.includes('x') || !v ? 'x' : [...FORM_ORDER].filter(c => v.includes(c)).join('');
function setF(f, v){
  DRAFT.form = DRAFT.form || {};
  // Always recorded, even when it matches the first guess, so a new forms.json can never change it.
  DRAFT.form[f] = fNorm(v);
  saveDraft();
}
const fSeg = p => { const v = fOf(p.f); return `<span class="adm-qseg adm-fseg${fSet(p.f) ? '' : ' auto'}" role="group" aria-label="Growth form" title="Growth form${fSet(p.f) ? ' (set by you)' : ' (dashed: Claude\'s first guess)'}">${[...FORM_ORDER, 'x'].map(c => `<button type="button" data-fm="${c}" aria-pressed="${v.includes(c)}" title="${esc(fName(c))}${c === 'x' ? '' : ' (click again to remove; several allowed)'}">${c === 'x' ? '∅' : c}</button>`).join('')}</span>`; };

/* ---------- Token vault: AES-GCM key derived from the password (PBKDF2) ---------- */
const b64 = u => btoa(String.fromCharCode(...new Uint8Array(u))), unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function vaultKey(pw, salt){
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({name: 'PBKDF2', salt, iterations: 250000, hash: 'SHA-256'}, base, {name: 'AES-GCM', length: 256}, false, ['encrypt', 'decrypt']);
}
async function lockToken(pw, token){
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({name: 'AES-GCM', iv}, await vaultKey(pw, salt), new TextEncoder().encode(token));
  store.set('imr-admin-vault', {salt: b64(salt), iv: b64(iv), ct: b64(ct)});
}
async function unlockToken(pw){
  const v = store.get('imr-admin-vault', null);
  const pt = await crypto.subtle.decrypt({name: 'AES-GCM', iv: unb64(v.iv)}, await vaultKey(pw, unb64(v.salt)), unb64(v.ct));
  return new TextDecoder().decode(pt);
}

/* ---------- GitHub ---------- */
const gh = (path, opts = {}) => fetch(API + path, {...opts, headers: {Accept: 'application/vnd.github+json', Authorization: `Bearer ${TOKEN}`, ...(opts.headers || {})}})
  .then(async r => { const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.message || `GitHub error ${r.status}`); return j; });
const fromB64 = s => decodeURIComponent(escape(atob(s.replace(/\n/g, ''))));
const toB64 = s => btoa(unescape(encodeURIComponent(s)));
async function checkToken(){ const r = await gh(''); if (!(r.permissions && r.permissions.push)) throw new Error('This token cannot write to the repository.'); }
async function loadSaved(){
  if (TOKEN) { const f = await gh(`/contents/${FILE}?ref=${BRANCH}`).catch(e => { if (/Not Found/.test(e.message)) return null; throw e; });
    if (f) { SAVED = JSON.parse(fromB64(f.content)); SHA = f.sha; } }
  else SAVED = await fetch(FILE, {cache: 'no-cache'}).then(r => r.ok ? r.json() : SAVED).catch(() => SAVED);
  SAVED.genera = SAVED.genera || {};
}

/* ---------- Lock screen ---------- */
function lockScreen(msg){
  const has = !!store.get('imr-admin-vault', null);
  $v.innerHTML = `<section class="adm-lock">
    <h2>${has ? 'Unlock' : 'Set up this device'}</h2>
    ${has ? `<p class="lede">Enter the admin password.</p>` : `<p class="lede">Choose an admin password and paste a GitHub token that can write to <b>${REPO}</b>. The token stays in this browser, encrypted with the password. Do this once per device.</p>
      <ol class="note adm-steps"><li>Open <a href="https://github.com/settings/personal-access-tokens/new?name=IMR%20Coral%20ID%20curation&description=Photo%20curation%20back-office&expires_in=none&contents=write" target="_blank" rel="noopener">New fine-grained token</a> (pre-filled).</li>
      <li>Repository access: <b>Only select repositories</b>, then <b>coral-id-imr</b>. Permission: <b>Contents: Read and write</b>.</li><li>Generate, copy it and paste it below.</li></ol>`}
    <form id="lockf" class="adm-form">
      <label>Password <input type="password" id="pw" autocomplete="current-password" required></label>
      ${has ? '' : `<label>Password again <input type="password" id="pw2" autocomplete="new-password" required></label>
        <label>GitHub token <input type="password" id="tok" autocomplete="off" spellcheck="false" placeholder="github_pat_…" required></label>`}
      <button class="adm-btn" type="submit">${has ? 'Unlock' : 'Save and unlock'}</button>
      ${msg ? `<p class="adm-err" role="alert">${esc(msg)}</p>` : ''}
    </form>
    ${has ? '<p class="note"><button type="button" class="adm-link" id="forget">Forget this device</button> (removes the stored token)</p>' : ''}
  </section>`;
  $('pw').focus();
  $('lockf').onsubmit = async e => {
    e.preventDefault(); const b = e.submitter; b.disabled = true; b.textContent = 'Checking…';
    try {
      if (has) { try { TOKEN = await unlockToken($('pw').value); } catch (x) { throw new Error('Wrong password.'); } }
      else { if ($('pw').value !== $('pw2').value) throw new Error('The two passwords differ.'); TOKEN = $('tok').value.trim(); }
      await checkToken();
      if (!has) await lockToken($('pw').value, TOKEN);
      store.set(SESSION, TOKEN);
      start();
    } catch (x) { TOKEN = null; lockScreen(x.message); }
  };
  if (has) $('forget').onclick = () => { if (confirm('Remove the stored token from this browser?')) { store.set('imr-admin-vault', null); store.set(SESSION, null); lockScreen(); } };
}

/* ---------- Photos of a genus, as the genus sheet orders them ---------- */
// Photos data.json gives the genus (plus approved candidates), before any "Not this genus".
function own(n){
  const g = DATA.gen[n], two = g.levels === 2, L = [];
  VIEWS.forEach(([v]) => { (g.views[v] || []).forEach(p => L.push({...p, base: v})); ((g.more || {})[v] || []).forEach(p => L.push({...p, base: v, multi: true, extra: true})); });
  (DATA.course[n] || []).forEach(p => L.push({...p, base: p.v === 'medium' && two ? 'macro' : p.v}));
  for (let i = L.length - 1; i >= 0; i--) if (excl(L[i].f)) L.splice(i, 1);
  // Candidates Pierre approved (curation add: {f: view}) join their view as normal photos (app.js applyCuration).
  const add = entry(n).add || {};
  cands(n).filter(p => add[p.f]).forEach(p => L.push({...p, base: add[p.f], cand: true}));
  return L;
}
// "Not this genus" (curation out: {f: 'cmp' | other genus}): the photo leaves the genus; given to another genus,
// it joins that genus in the same view (tagged with where it came from); 'cmp' keeps it for the Look-alikes section.
const outs = n => entry(n).out || {};
function photos(n){
  const L = own(n).filter(p => !outs(n)[p.f]);
  Object.keys(DATA.gen).filter(m => m !== n).forEach(m => own(m).filter(p => outs(m)[p.f] === n).forEach(p => L.push({...p, from: m})));
  return L;
}
const outOf = n => own(n).filter(p => outs(n)[p.f]);
// New candidate photos from data.json cand, not used by the site until approved here.
// Coral Finder book photos (data: gen[].book) are candidates too; once added they show on the site but never in games.
const cands = n => [...((DATA.cand || {})[n] || []), ...(DATA.gen[n].book || [])].filter(p => !excl(p.f));
const pending = n => { const add = entry(n).add || {}; return cands(n).filter(p => !add[p.f]); };
const entry = n => DRAFT.genera[n] || {};
const viewOf = (n, p) => (entry(n).move || {})[p.f] || p.base;
const hidden = (n, p) => (entry(n).hide || []).includes(p.f);
// Same order as viewGenus in app.js: round-robin IMR lecture / other observers / Pierre, multi-coral photos last.
function autoOrder(L){
  const main = L.filter(p => !p.extra), src = [main.filter(p => p.imr), main.filter(p => !p.imr && !p.own), main.filter(p => p.own)], out = [];
  while (src.some(x => x.length)) src.forEach(x => x.length && out.push(x.shift()));
  return [...out.filter(p => !p.multi), ...out.filter(p => p.multi), ...L.filter(p => p.extra)];
}
function rowOf(n, v){
  const live = photos(n).filter(p => viewOf(n, p) === v && !hidden(n, p)), order = autoOrder(live);
  const pin = (entry(n).feat || {})[v];
  const feat = pin ? pin.map(f => live.find(p => p.f === f)).filter(Boolean) : order.filter(p => !p.multi).slice(0, FEAT);
  return {feat, auto: !pin, rest: order.filter(p => !feat.includes(p)), hid: photos(n).filter(p => viewOf(n, p) === v && hidden(n, p))};
}
function coverOf(n){
  const g = DATA.gen[n], all = photos(n).filter(p => !hidden(n, p)), k = entry(n);
  // Same fallbacks as cover() in app.js: your pick, data.json's pick, the first closer field photo (featured first).
  const F = (k.feat || {}).medium || [], med = all.filter(x => viewOf(n, x) === 'medium' && !x.imr && !x.extra);
  const p = (k.cover && all.find(x => x.f === k.cover)) || all.find(x => x.f === g.cover && !x.extra) || med.find(x => F.includes(x.f)) || med[0] || all.find(x => !x.imr && !x.extra);
  return p && {...p, view: viewOf(n, p), picked: !!k.cover};
}
const rows = n => VIEWS.filter(([v]) => !(DATA.gen[n].levels === 2 && v === 'medium' && !photos(n).some(p => viewOf(n, p) === 'medium')));
const label = (n, v) => DATA.gen[n].levels === 2 && v === 'macro' ? 'Close-up' : VIEWS.find(x => x[0] === v)[1];
// Photo origin: IMR lecture, Pierre's own iNaturalist photos, or other iNaturalist observers split by place
// (data.json p.loc: dauin, ph or world). The filter is kept across genera and visits.
const ORIGINS = [['book', 'CF book'], ['imr', 'IMR lecture'], ['own', 'Pierre'], ['dauin', 'iNat Dauin'], ['ph', 'iNat Philippines'], ['world', 'iNat elsewhere']];
const origin = p => p.cf ? 'book' : p.imr ? 'imr' : p.own ? 'own' : ({dauin: 'dauin', ph: 'ph'})[p.loc] || 'world';
let SHOW = new Set(store.get('imr-admin-origins', ORIGINS.map(o => o[0])));
const shown = p => SHOW.has(origin(p));
const srcTag = p => { const o = origin(p); return `<span class="adm-src o-${o}">${ORIGINS.find(x => x[0] === o)[1]}</span>`; };

/* ---------- Edits ---------- */
function edit(n, fn){
  const k = clone(entry(n)); fn(k);
  ['feat', 'move', 'add', 'out'].forEach(x => { if (k[x] && !Object.keys(k[x]).length) delete k[x]; });
  if (k.hide && !k.hide.length) delete k.hide;
  if (Object.keys(k).length) DRAFT.genera[n] = k; else delete DRAFT.genera[n];
  saveDraft(); render();
}
const ensureFeat = (k, n, v) => { k.feat = k.feat || {}; if (!k.feat[v]) k.feat[v] = rowOf(n, v).feat.map(p => p.f); return k.feat[v]; };
const dropFeat = (k, f) => Object.keys(k.feat || {}).forEach(v => { k.feat[v] = k.feat[v].filter(x => x !== f); if (!k.feat[v].length) delete k.feat[v]; });
const ACT = {
  cover: (n, f) => edit(n, k => { if (k.cover === f) delete k.cover; else k.cover = f; }),
  feat: (n, f, v) => edit(n, k => { const L = ensureFeat(k, n, v);
    if (L.includes(f)) { L.splice(L.indexOf(f), 1); if (!L.length) { toast('A view needs at least one featured photo: back to the automatic pick.'); delete k.feat[v]; } }
    else if (L.length >= FEAT) toast(`Already ${FEAT} featured: remove one first.`); else L.push(f); }),
  addc: (n, f, v, to) => edit(n, k => { k.add = k.add || {}; k.add[f] = to; }),
  exclude: (n, f) => { DRAFT.exclude = DRAFT.exclude || {}; DRAFT.exclude[f] = 'excluded';
    edit(n, k => { dropFeat(k, f); if (k.cover === f) delete k.cover; if (k.add) delete k.add[f]; });
    toast('Excluded. Undo (Ctrl+Z) or the Excluded view brings it back.'); },
  out: (n, f, v, to) => edit(n, k => { k.out = k.out || {}; if (to === 'back') delete k.out[f]; else { k.out[f] = to; dropFeat(k, f); if (k.cover === f) delete k.cover; if (k.move) delete k.move[f]; } }),
  hide: (n, f) => edit(n, k => { if (k.add && k.add[f]) { delete k.add[f]; dropFeat(k, f); if (k.cover === f) delete k.cover; return; } k.hide = k.hide || []; if (k.hide.includes(f)) k.hide = k.hide.filter(x => x !== f); else { k.hide.push(f); dropFeat(k, f); if (k.cover === f) delete k.cover; } }),
  move: (n, f, v, to) => edit(n, k => { const p = photos(n).find(x => x.f === f); if (p.cand) { k.add[f] = to; dropFeat(k, f); return; } k.move = k.move || {}; if (to === p.base) delete k.move[f]; else k.move[f] = to; dropFeat(k, f); }),
  // Drag and drop: photo f dropped in view `to`, at featured position `at` (null: not featured).
  // Covers moving between views, approving a candidate, featuring, reordering and unfeaturing in one step.
  drop: (n, f, to, at) => edit(n, k => {
    const p = [...photos(n), ...pending(n)].find(x => x.f === f), was = viewOf(n, p) === to && !pending(n).includes(p);
    const cur = rowOf(n, to).feat.map(x => x.f), inFeat = was && cur.includes(f), L = cur.filter(x => x !== f);
    if (p.cand || pending(n).includes(p)) { k.add = k.add || {}; k.add[f] = to; }
    else if (!was) { k.move = k.move || {}; if (to === p.base) delete k.move[f]; else k.move[f] = to; }
    dropFeat(k, f);
    if (at !== null) { L.splice(Math.min(at, L.length), 0, f); k.feat = k.feat || {}; k.feat[to] = L.slice(0, FEAT); }
    else if (inFeat) { k.feat = k.feat || {}; if (L.length) k.feat[to] = L; else delete k.feat[to]; }
  }),

};

/* ---------- Rendering ---------- */
const changed = () => [...new Set([...Object.keys(DRAFT.genera), ...Object.keys(SAVED.genera)])].filter(n => !same(DRAFT.genera[n], SAVED.genera[n]));
function tile(n, p, v, st){
  const k = entry(n), isCover = k.cover === p.f, two = DATA.gen[n].levels === 2;
  // View buttons: the current view is pressed; one click on another moves the photo there.
  const moves = VIEWS.filter(([w]) => w === v || !(two && w === 'medium')).map(([w]) => `<button type="button" data-act="move" data-to="${w}" aria-pressed="${w === v}">${label(n, w)}</button>`).join('');
  return `<figure class="adm-tile ${st.cls || ''}${isCover ? ' is-cover' : ''}" data-f="${esc(p.f)}" data-v="${v}"${st.cls === 'is-hidden' ? '' : ` data-drag${st.num ? ` data-pos="${st.num - 1}"` : ''}`}>
    <button type="button" class="adm-ph" data-act="zoom" aria-label="Enlarge"><img src="${img(p, 1)}" alt="" loading="lazy" draggable="false"></button>${st.cls === 'is-hidden' ? '' : GRIP + XBTN}
    ${st.num ? `<span class="adm-num${st.auto ? ' auto' : ''}" title="${st.auto ? 'Featured automatically' : 'Featured by you'}">${st.num}</span>` : ''}
    ${isCover ? '<span class="adm-covermark">Cover</span>' : ''}
    <figcaption>${p.from ? `<span class="adm-src new" title="Taken out of ${esc(p.from)} (change it there)">from ${esc(p.from)}</span>` : ''}${p.cand ? '<span class="adm-src new" title="Candidate you added">new</span>' : ''}${srcTag(p)}${p.multi ? '<span class="adm-src multi" title="Several corals in frame: never used in games">several corals</span>' : ''}<span class="adm-t">${esc(p.imr ? 'slide ' + p.slide : p.t || '')}</span></figcaption>
    <div class="adm-acts">${qSeg(p)}${fSeg(p)}
      ${st.cls === 'is-hidden' ? `<button type="button" data-act="hide" class="on">Show again</button>` : `
      <button type="button" data-act="cover" class="${isCover ? 'on' : ''}" title="Use as the genus photo (cards, sheet hero)">★ Cover</button>
      <button type="button" data-act="feat" class="${st.num && !st.auto ? 'on' : ''}" title="Show in the main strip of this view">${st.num ? 'Featured' : 'Feature'}</button>
      ${p.cand ? '<button type="button" data-act="hide" title="Back to the candidates">Remove</button>' : '<button type="button" data-act="hide" title="Keep the photo but don\'t show it on the site for this genus; Show again brings it back">Hide</button>'}
      <span class="adm-qseg adm-vseg" role="group" aria-label="View">${moves}</span>
      ${p.from || p.cand ? '' : `<select data-act="out" aria-label="Take out of this genus"><option value="">Not this genus…</option><option value="cmp">Look-alike comparison</option><optgroup label="It shows another genus">${Object.keys(DATA.gen).filter(m => m !== n).map(m => `<option>${esc(m)}</option>`).join('')}</optgroup></select>`}`}
    </div></figure>`;
}
// Small × on each photo: exclude it for good (a person, a drawing, AI…).
const XBTN = '<button type="button" class="adm-x" data-act="exclude" title="Exclude this photo for good (from every genus and game)" aria-label="Exclude for good">×</button>';
function status(){
  const ch = changed(), q = qChanged(), x = xChanged(), parts = [ch.length ? `${ch.length} ${ch.length > 1 ? 'genera' : 'genus'}` : '', q ? 'quality ratings' : '', fChanged() ? 'growth forms' : '', x ? 'exclusions' : '', bChanged() ? 'book photos switch' : ''].filter(Boolean);
  const bs = $('booksw'); if (bs) { bs.setAttribute('aria-pressed', String(bookOn(DRAFT))); bs.textContent = `CF book: ${bookOn(DRAFT) ? 'on' : 'off'}`; }
  const xn = Object.keys(DRAFT.exclude || {}).length, xa = document.querySelector('[data-mode="excluded"]'); if (xa) xa.textContent = `Excluded${xn ? ` (${xn})` : ''}`;
  const t = draftAt ? ` (saved ${draftAt.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})})` : '';
  $('status').textContent = parts.length ? '● Not published' : TOKEN ? '✓ Published' : 'Read-only';
  $('status').title = parts.length ? `Draft${t}: ${parts.join(' + ')} not published yet` : TOKEN ? 'Everything is published' : 'Read-only: download only';
  $('status').classList.toggle('dirty', !!parts.length);
  $('undo').disabled = !HIST.length; $('redo').disabled = !FUT.length;
  $('save').disabled = !TOKEN || !parts.length; $('save').title = TOKEN ? 'Send your draft to the public site' : 'Unlock with a token to publish';
  if (cur[0] !== '~') lastGenus = cur;
  $('modes').hidden = false; $v.ownerDocument.querySelector('[data-mode="genus"]').href = '#' + encodeURIComponent(lastGenus || '');
  document.querySelectorAll('[data-mode]').forEach(a => a.setAttribute('aria-current', String(a.dataset.mode === ({'~quality': 'quality', '~form': 'form', '~excluded': 'excluded'}[cur] || 'genus'))));
}
function render(){
  if (cur === '~quality') return renderQuality();
  if (cur === '~form') return renderForm();
  if (cur === '~excluded') return renderExcluded();
  const names = Object.keys(DATA.gen); if (!DATA.gen[cur]) cur = names[0];
  const ch = changed(), n = cur, g = DATA.gen[n], cv = coverOf(n), k = entry(n);
  status();
  $('preview').href = `./?draft#g-${encodeURIComponent(n)}`;
  const side = names.map(m => { const c = coverOf(m), e = DRAFT.genera[m] || {}, dirty = ch.includes(m), h = (e.hide || []).length;
    return `<a href="#${esc(m)}" class="adm-g${m === n ? ' cur' : ''}"${m === n ? ' aria-current="true"' : ''}>${c ? `<img src="${img(c, 1)}" alt="" loading="lazy">` : '<span class="none"></span>'}<span><i>${esc(m)}</i>
      <small>${DATA.gen[m].n ? 'No. ' + DATA.gen[m].n : '★'}${c && c.view === 'macro' && DATA.gen[m].levels !== 2 ? ' · <b class="warnc" title="The cover is a corallite close-up">macro cover</b>' : ''}${h ? ` · ${h} hidden` : ''}${pending(m).length ? ` · ${pending(m).length} new` : ''}${missing(m).length ? ' · <b class="warnc" title="Some choices name a photo no longer in the data">⚠ check</b>' : ''}</small></span>${dirty ? '<b class="dot" title="Draft not published yet">●</b>' : Object.keys(e).length ? '<b class="dot done" title="Curated">✓</b>' : ''}</a>`; }).join('');
  const body = rows(n).map(([v]) => { const r = rowOf(n, v), out = [...r.feat, ...r.rest, ...r.hid].filter(p => !shown(p)).length;
    return `<section class="adm-row"><h3>${label(n, v)} <small>${r.feat.length} featured${r.auto ? ' (automatic)' : ''} · ${r.rest.length} more${r.hid.length ? ` · ${r.hid.length} hidden` : ''}${out ? ` · <b>${out} filtered out</b>` : ''}</small></h3>
      <div class="adm-grid" data-drop="${v}">${r.feat.map((p, i) => shown(p) ? tile(n, p, v, {num: i + 1, auto: r.auto, last: i === r.feat.length - 1, cls: 'is-feat'}) : '').join('')}${r.rest.filter(shown).map(p => tile(n, p, v, {})).join('')}${r.hid.filter(shown).map(p => tile(n, p, v, {cls: 'is-hidden'})).join('')}</div>
      ${r.feat.length + r.rest.length ? '' : '<p class="note">No photo in this view.</p>'}</section>`; }).join('');
  const P = pending(n), Ps = P.filter(shown), two = g.levels === 2;
  const candTile = p => `<figure class="adm-tile is-cand" data-f="${esc(p.f)}" data-drag><button type="button" class="adm-ph" data-act="zoom" aria-label="Enlarge"><img src="${img(p, 1)}" alt="" loading="lazy" draggable="false"></button>${GRIP}${XBTN}
    <figcaption>${srcTag(p)}<span class="adm-t">${esc(p.t || '')}</span></figcaption>
    <div class="adm-acts">${qSeg(p)}${fSeg(p)}<div class="adm-addrow">${VIEWS.filter(([w]) => !(two && w === 'medium')).map(([w]) => `<button type="button" data-act="addc" data-to="${w}" title="Add to ${label(n, w)}">+ ${label(n, w)}</button>`).join('')}</div></div></figure>`;
  const candRow = P.length ? `<section class="adm-row adm-cands"><h3>Candidates <small>${P.length} new photo${P.length > 1 ? 's' : ''} not on the site yet${P.length - Ps.length ? ` · <b>${P.length - Ps.length} filtered out</b>` : ''}</small></h3>
    <div class="adm-grid">${Ps.map(candTile).join('')}</div></section>` : '';
  const O = outOf(n), outRow = O.length ? `<section class="adm-row adm-out"><h3>Not this genus <small>${O.length} photo${O.length > 1 ? 's' : ''} taken out of <i>${esc(n)}</i></small></h3>
    <div class="adm-grid">${O.map(p => `<figure class="adm-tile is-hidden" data-f="${esc(p.f)}"><button type="button" class="adm-ph" data-act="zoom" aria-label="Enlarge"><img src="${img(p, 1)}" alt="" loading="lazy"></button>
      <figcaption>${srcTag(p)}<span class="adm-t">${outs(n)[p.f] === 'cmp' ? 'look-alike comparison' : '→ ' + esc(outs(n)[p.f])}</span></figcaption>
      <div class="adm-acts"><button type="button" data-act="out" data-to="back">Put back</button></div></figure>`).join('')}</div></section>` : '';
  const cnt = o => [...photos(n), ...P].filter(p => origin(p) === o).length;
  const filter = `<div class="adm-filter adm-sticky" role="group" aria-label="Show photos from">${cv ? `<button type="button" class="adm-sthumb${cv.view === 'macro' && g.levels !== 2 ? ' warnc' : ''}" data-f="${esc(cv.f)}" data-act="zoomcover" title="Cover (${cv.picked ? 'your pick' : 'automatic'}, ${label(n, cv.view).toLowerCase()} view)"><img src="${img(cv, 1)}" alt="${esc(n)} cover"></button>` : ''}<b class="adm-sname"><i>${esc(n)}</i></b><a class="adm-sheet" href="./?draft#g-${encodeURIComponent(n)}" target="_blank" rel="noopener" title="Open the genus sheet (with your draft)" aria-label="Open the sheet">↗</a><span class="label">Show</span>${ORIGINS.map(([o, t]) => `<button type="button" class="adm-fchip o-${o}" data-o="${o}" aria-pressed="${SHOW.has(o)}">${t} <b>${cnt(o)}</b></button>`).join('')}${SHOW.size < ORIGINS.length ? '<button type="button" class="adm-link" data-o="all">Show all</button>' : ''}</div>`;
  $v.innerHTML = `<div class="adm">
    <nav class="adm-side" aria-label="Genera"><select id="gsel" aria-label="Genus">${names.map(m => `<option${m === n ? ' selected' : ''}>${esc(m)}</option>`).join('')}</select><div class="adm-list">${side}</div></nav>
    <section class="adm-main">
      ${missing(n).length ? `<p class="warn"><b>${missing(n).length} of your choices name a photo that is no longer in the data</b>: ${missing(n).map(f => `<code>${esc(f)}</code>`).join(', ')}. Kept but no longer applied; tell Claude to remap them.</p>` : ''}
      ${filter}${body}${candRow}${outRow}
    </section></div>`;
  $v.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { const o = b.dataset.o;
    if (o === 'all') SHOW = new Set(ORIGINS.map(x => x[0])); else SHOW.has(o) ? SHOW.delete(o) : SHOW.add(o);
    store.set('imr-admin-origins', [...SHOW]); render(); });
  $('gsel').onchange = e => { location.hash = e.target.value; };
  $v.querySelectorAll('[data-act]').forEach(el => {
    const t = el.closest('[data-f]'), f = t && t.dataset.f, v = t && t.dataset.v, a = el.dataset.act;
    if (a === 'exclude') el.onclick = e => { e.stopPropagation(); ACT.exclude(n, f); };
    else if (a === 'out') { if (el.tagName === 'SELECT') el.onchange = () => el.value && ACT.out(n, f, v, el.value); else el.onclick = () => ACT.out(n, f, v, 'back'); }
    else if (a === 'addc') el.onclick = () => ACT.addc(n, f, null, el.dataset.to);
    else if (a === 'move') el.onclick = () => el.dataset.to !== v && ACT.move(n, f, v, el.dataset.to);
    else if (a === 'zoom' || a === 'zoomcover') el.onclick = () => zoom(n, f);
    else el.onclick = () => ACT[a](n, f, v);
  });
  const c = $v.querySelector('.adm-g.cur'); if (c) c.scrollIntoView({block: 'nearest'});
  bindQ(); bindF($v); bindDrag(n);
}
// Drag a photo onto a featured photo (left or right half: before or after it) to feature it at that place,
// onto any other photo or the empty part of a view to put it there unfeatured. Works across views and from the candidates.
function bindDrag(n){
  const clear = () => $v.querySelectorAll('.drop-before,.drop-after,.drop-row').forEach(e => e.classList.remove('drop-before', 'drop-after', 'drop-row'));
  // Where a drop at the pointer lands: target view and featured position (null: not featured).
  const target = (el, x) => { const grid = el && el.closest('[data-drop]'); if (!grid) return null;
    const t = el.closest('.adm-tile[data-pos]'), r = t && t.getBoundingClientRect(), after = t && x > r.left + r.width / 2;
    const last = grid.querySelectorAll('.adm-tile[data-pos]').length;
    // Just after the last featured photo also features (while there is room).
    const firstRest = !t && el.closest('.adm-tile:not([data-pos])'), fr = firstRest && firstRest === grid.querySelector('.adm-tile:not([data-pos])') && last < FEAT && x < firstRest.getBoundingClientRect().left + firstRest.getBoundingClientRect().width / 2;
    return {grid, tile: t || (fr ? firstRest : null), after, at: t ? Number(t.dataset.pos) + (after ? 1 : 0) : fr ? last : null}; };
  pointerDrag($v.querySelectorAll('.adm-tile[data-drag]'),
    (el, x) => { clear(); const d = target(el, x); if (!d) return; if (d.at !== null) d.tile.classList.add(d.after ? 'drop-after' : 'drop-before'); else d.grid.classList.add('drop-row'); },
    (t, el, x) => { clear(); const d = target(el, x); if (d) ACT.drop(n, t.dataset.f, d.grid.dataset.drop, d.at); }, clear);
}
// Pointer-based drag and drop, so it works the same with a mouse, a pen or a finger in every browser.
// With a mouse the whole photo drags (a click without moving still enlarges it); on touch screens the ⠿ handle
// drags, so swiping the photos still scrolls the page. The page scrolls when dragging near the top or bottom.
const GRIP = '<span class="adm-grip" title="Drag" aria-hidden="true">⠿</span>';
function pointerDrag(tiles, hover, drop, cancel){
  tiles.forEach(t => {
    const ph = t.querySelector('.adm-ph'), grip = t.querySelector('.adm-grip');
    ph.addEventListener('click', e => { if (t.dataset.dragged) { delete t.dataset.dragged; e.stopImmediatePropagation(); e.preventDefault(); } }, true);
    const start = e => {
      if (e.button || (e.currentTarget === ph && e.pointerType === 'touch')) return;
      const x0 = e.clientX, y0 = e.clientY; let ghost = null, last = e, raf = 0;
      const at = ev => document.elementFromPoint(ev.clientX, ev.clientY);
      const edge = () => { const dy = last.clientY < 70 ? -14 : last.clientY > innerHeight - 70 ? 14 : 0; if (dy) { scrollBy(0, dy); hover(at(last), last.clientX); } raf = ghost ? requestAnimationFrame(edge) : 0; };
      const move = ev => {
        last = ev;
        if (!ghost) { if (Math.hypot(ev.clientX - x0, ev.clientY - y0) < 6) return;
          ghost = ph.querySelector('img').cloneNode(); ghost.className = 'adm-ghost'; document.body.append(ghost); t.classList.add('dragging'); document.body.classList.add('adm-dragging'); raf = requestAnimationFrame(edge); }
        ev.preventDefault();
        ghost.style.transform = `translate(${ev.clientX - 70}px, ${ev.clientY - 52}px)`;
        hover(at(ev), ev.clientX);
      };
      const end = ev => {
        removeEventListener('pointermove', move); removeEventListener('pointerup', end); removeEventListener('pointercancel', end);
        if (!ghost) return;
        cancelAnimationFrame(raf); ghost.remove(); ghost = null; t.classList.remove('dragging'); document.body.classList.remove('adm-dragging'); t.dataset.dragged = 1;
        setTimeout(() => { delete t.dataset.dragged; }, 0);
        if (ev.type === 'pointerup') drop(t, at(ev), ev.clientX); else cancel();
      };
      addEventListener('pointermove', move, {passive: false}); addEventListener('pointerup', end); addEventListener('pointercancel', end);
    };
    ph.onpointerdown = start; if (grip) grip.onpointerdown = e => { e.preventDefault(); start(e); };
  });
}
function zoom(n, f){
  const lb = $('lightbox'), L = [...photos(n), ...pending(n).map(p => ({...p, base: 'cand'})), ...outOf(n).map(p => ({...p, base: 'out'}))], i0 = L.findIndex(p => p.f === f); let i = i0;
  const show = () => { const p = L[i]; lb.innerHTML = `<div class="lb-in"><img src="${img(p)}" alt=""><p class="lb-cap"><i>${esc(n)}</i> · ${p.base === 'cand' ? 'Candidate' : p.base === 'out' ? 'Not this genus' : label(n, viewOf(n, p))} · ${p.imr ? 'IMR Lecture 6, slide ' + p.slide : esc(p.a || '')} · <code>${esc(p.f)}</code></p>
    <div class="lb-nav"><button type="button" data-d="-1" aria-label="Previous">‹</button><span>${i + 1} / ${L.length}</span><button type="button" data-d="1" aria-label="Next">›</button><button type="button" data-x>Close</button></div></div>`;
    lb.querySelectorAll('[data-d]').forEach(b => b.onclick = e => { e.stopPropagation(); i = (i + Number(b.dataset.d) + L.length) % L.length; show(); });
    lb.querySelector('[data-x]').onclick = close; };
  const key = e => { if (e.key === 'Escape') close(); if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { i = (i + (e.key === 'ArrowRight' ? 1 : -1) + L.length) % L.length; show(); } };
  const close = () => { lb.hidden = true; lb.innerHTML = ''; document.removeEventListener('keydown', key); };
  lb.hidden = false; lb.onclick = e => { if (e.target === lb) close(); }; document.addEventListener('keydown', key); show();
}
let toastT;
function toast(msg){ let t = document.querySelector('.adm-toast'); if (!t) { t = document.createElement('p'); t.className = 'adm-toast'; t.setAttribute('role', 'status'); document.body.append(t); }
  t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 3500); }

/* ---------- Choices that point to a photo no longer in data.json ---------- */
// Nothing automatic ever edits curation.json. If a data rebuild renames or drops a photo, the choices that name it
// stop applying on the site: they are kept, and listed here so nothing is lost silently.
function missing(n){
  const k = entry(n);
  const refs = [k.cover, ...Object.values(k.feat || {}).flat(), ...(k.hide || []), ...Object.keys(k.move || {}), ...Object.keys(k.add || {}), ...Object.keys(k.out || {})].filter(Boolean);
  return [...new Set(refs.filter(f => !KNOWN.has(f)))];
}

/* ---------- Quality ---------- */
function bindQ(){
  $v.querySelectorAll('.adm-qseg [data-q]').forEach(b => b.onclick = e => { e.stopPropagation(); const t = b.closest('[data-f]'); rateTile(t, Number(b.dataset.q)); });
}
// Rating updates the tile in place (it stays where it is until the next filter change), so rating many is fast.
function rateTile(t, q){
  const f = t.dataset.f; setQ(f, q);
  t.querySelectorAll('.adm-qseg [data-q]').forEach(x => x.setAttribute('aria-pressed', String(Number(x.dataset.q) === q)));
  const tag = t.querySelector('.adm-q'); if (tag) tag.outerHTML = qTag({f});
  t.dataset.q = q; t.classList.add('rated'); status();
}
// Every photo of every genus (approved, hidden, given to another genus and candidates), with genus and view.
function allPhotos(){
  const L = [];
  Object.keys(DATA.gen).forEach(n => {
    photos(n).forEach(p => L.push({...p, genus: n, view: viewOf(n, p), hid: hidden(n, p)}));
    pending(n).forEach(p => L.push({...p, genus: n, view: 'cand'}));
  });
  return L;
}
const QF = Object.assign({view: 'all', genus: '', todo: false}, store.get('imr-admin-qfilter', {}));
function renderQuality(){
  status();
  const names = Object.keys(DATA.gen), vl = v => v === 'cand' ? 'Candidate' : VIEWS.find(x => x[0] === v)[1];
  const all = allPhotos().filter(p => shown(p) && (QF.view === 'all' || p.view === QF.view) && (!QF.genus || p.genus === QF.genus) && (!QF.todo || !qSet(p.f)));
  const card = p => `<figure class="adm-tile adm-qt${p.hid ? ' is-hidden' : ''}" data-f="${esc(p.f)}" data-g="${esc(p.genus)}" data-q="${qOf(p.f)}" data-drag tabindex="0">
    <button type="button" class="adm-ph" data-act="zoom" aria-label="Enlarge"><img src="${img(p, 1)}" alt="" loading="lazy" draggable="false"></button>${GRIP}${XBTN}
    <figcaption><a class="adm-gen" href="#${esc(p.genus)}" title="Open the genus"><i>${esc(p.genus)}</i></a><span class="adm-src view">${vl(p.view)}</span>${srcTag(p)}${p.hid ? '<span class="adm-src multi">hidden</span>' : ''}${p.multi ? '<span class="adm-src multi" title="Several corals in frame">several</span>' : ''}${qTag(p)}</figcaption>
    <div class="adm-acts">${qSeg(p)}</div></figure>`;
  const sec = ([q, t]) => { const L = all.filter(p => qOf(p.f) === q);
    return `<section class="adm-row adm-qrow"><h3><span class="adm-q q${q}">${t}</span> <small>${L.length} photo${L.length === 1 ? '' : 's'}${q === 3 ? ' · for covers and featured photos' : q === 1 ? ' · for a realistic mode' : ''}</small></h3>
      <div class="adm-grid adm-qgrid" data-qdrop="${q}">${L.map(card).join('')}</div></section>`; };
  const opt = (v, t, cur) => `<button type="button" class="adm-fchip plain" data-qv="${v}" aria-pressed="${cur === v}">${t}</button>`;
  $v.innerHTML = `<section class="adm-quality">
    <div class="adm-qhead"><h2>Photo quality</h2></div>
    <div class="adm-filter"><span class="label">Show</span>${ORIGINS.map(([o, t]) => `<button type="button" class="adm-fchip o-${o}" data-o="${o}" aria-pressed="${SHOW.has(o)}">${t}</button>`).join('')}</div>
    <div class="adm-filter"><span class="label">View</span>${opt('all', 'All', QF.view)}${VIEWS.map(([v, t]) => opt(v, t, QF.view)).join('')}${opt('cand', 'Candidates', QF.view)}
      <select id="qgen" aria-label="Genus"><option value="">All genera</option>${names.map(m => `<option${m === QF.genus ? ' selected' : ''}>${esc(m)}</option>`).join('')}</select>
      <label class="adm-todo"><input type="checkbox" id="qtodo"${QF.todo ? ' checked' : ''}> Not checked yet</label></div>
    ${QUAL.map(sec).join('')}</section>`;
  const saveQF = () => { store.set('imr-admin-qfilter', QF); renderQuality(); };
  $v.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { const o = b.dataset.o; SHOW.has(o) ? SHOW.delete(o) : SHOW.add(o); store.set('imr-admin-origins', [...SHOW]); renderQuality(); });
  $v.querySelectorAll('[data-qv]').forEach(b => b.onclick = () => { QF.view = b.dataset.qv; saveQF(); });
  $('qgen').onchange = e => { QF.genus = e.target.value; saveQF(); };
  $('qtodo').onchange = e => { QF.todo = e.target.checked; saveQF(); };
  $v.querySelectorAll('[data-act="zoom"]').forEach(b => b.onclick = () => { const t = b.closest('[data-f]'); zoom(t.dataset.g, t.dataset.f); });
  $v.querySelectorAll('[data-act="exclude"]').forEach(b => b.onclick = e => { e.stopPropagation(); const t = b.closest('[data-f]'); ACT.exclude(t.dataset.g, t.dataset.f); });
  bindQ();
  // Hover (or focus) a photo and press 1, 2 or 3.
  let over = null;
  $v.querySelectorAll('.adm-qt').forEach(t => { t.onmouseenter = t.onfocus = () => { over = t; }; t.onmouseleave = () => { if (over === t) over = null; }; });
  document.onkeydown = e => { if (cur !== '~quality' || !over || e.target.closest('input,select,textarea')) return; const q = {'1': 1, '2': 2, '3': 3}[e.key]; if (q) { e.preventDefault(); rateTile(over, q); } };
  // Drag a photo onto another level.
  const clearQ = () => $v.querySelectorAll('.drop-row').forEach(x => x.classList.remove('drop-row'));
  pointerDrag($v.querySelectorAll('.adm-qt'), el => { clearQ(); const g = el && el.closest('[data-qdrop]'); if (g) g.classList.add('drop-row'); },
    (t, el) => { clearQ(); const g = el && el.closest('[data-qdrop]'); if (g) { rateTile(t, Number(g.dataset.qdrop)); g.prepend(t); } }, clearQ);
}

/* ---------- Help ("?" in the header): the explanations, kept off the pages ---------- */
const HELP = {
  genus: `<p>Every click is saved at once as a draft in this browser; <b>Publish</b> sends it to the site. <b>Undo</b> / <b>Redo</b> (Ctrl+Z, Ctrl+Shift+Z) step back one click at a time.</p>
    <p>Drag a photo onto a featured photo to feature it there, to another view to move it, or from the candidates to add it. Hidden photos disappear everywhere, games included; × excludes a photo for good.</p>
    <p>The letters on each photo are its growth form (see Growth form).</p>`,
  form: `<p>The Coral Finder growth forms each photo shows: <b>B</b> Branching, <b>M</b> Meandering, <b>S</b> Massive or thick, <b>P</b> Thin plates and crusts, <b>F</b> Solitary or free-living, <b>L</b> Large daytime polyps, <b>C</b> Columns; <b>∅</b> = form not visible (too close). Several letters allowed.</p>
    <p>They pick the photos of the growth-form tiles in the Coral Finder; ∅ photos are never used there. Dashed letters are Claude's first guess from the image, solid ones are yours and always win.</p>
    <p>Click the letters, drag a photo to another row, or hover it and press B M S P F L C, or X for not visible. Coral Finder book photos are left out.</p>`,
  quality: `<p>Quality 3 good, 2 fair, 1 poor. Dashed tags are an automatic guess (sharpness, contrast, colour cast, size). Click, drag to another level, or hover a photo and press 1, 2 or 3.</p>`,
  excluded: `<p>Excluded photos are removed from every genus, game and candidate list, and imports skip them. Restore puts one back.</p>`
};
function toggleHelp(){
  let h = $('admhelp'); if (h) { h.remove(); return; }
  const m = ({'~quality': 'quality', '~form': 'form', '~excluded': 'excluded'})[cur] || 'genus';
  h = document.createElement('div'); h.id = 'admhelp'; h.className = 'adm-help'; h.setAttribute('role', 'dialog'); h.setAttribute('aria-label', 'Help');
  h.innerHTML = `<button type="button" class="adm-link" aria-label="Close help">×</button>${HELP[m]}`;
  h.querySelector('button').onclick = () => h.remove(); $('tools').append(h);
}

/* ---------- Growth form ---------- */
// One row per growth form (photos showing several forms have their own row), then "Form not visible" and photos
// without a guess. Click the letters on a photo (several allowed; ∅ = form not visible), drag it to another row,
// or hover it and press the letter (b m s p f l c, x or 0 for not visible). The tile stays put until a filter changes.
const FF = Object.assign({view: 'all', genus: '', todo: false}, store.get('imr-admin-ffilter', {}));
function formTile(t, v){
  setF(t.dataset.f, v); const p = {f: t.dataset.f};
  t.querySelector('.adm-fseg').outerHTML = fSeg(p);
  if (cur === '~form') t.classList.add('rated'); bindF(t); status();
}
const toggleF = (f, c) => { const v = fOf(f); return c === 'x' ? 'x' : v.includes(c) ? v.replace(c, '') || 'x' : v.replace('x', '') + c; };
function bindF(scope){ scope.querySelectorAll('.adm-fseg [data-fm]').forEach(b => b.onclick = e => { e.stopPropagation(); const t = b.closest('[data-f]'); formTile(t, toggleF(t.dataset.f, b.dataset.fm)); }); }
function renderForm(){
  status();
  const names = Object.keys(DATA.gen), vl = v => v === 'cand' ? 'Candidate' : VIEWS.find(x => x[0] === v)[1];
  // Coral Finder book photos are left out: they never go on the growth-form tiles.
  const all = allPhotos().filter(p => !p.cf && shown(p) && (FF.view === 'all' || p.view === FF.view) && (!FF.genus || p.genus === FF.genus) && (!FF.todo || !fSet(p.f)));
  const card = p => `<figure class="adm-tile adm-qt${p.hid ? ' is-hidden' : ''}" data-f="${esc(p.f)}" data-g="${esc(p.genus)}" data-drag tabindex="0">
    <button type="button" class="adm-ph" data-act="zoom" aria-label="Enlarge"><img src="${img(p, 1)}" alt="" loading="lazy" draggable="false"></button>${GRIP}${XBTN}
    <figcaption><a class="adm-gen" href="#${esc(p.genus)}" title="Open the genus"><i>${esc(p.genus)}</i></a><span class="adm-src view">${vl(p.view)}</span>${srcTag(p)}${p.hid ? '<span class="adm-src multi">hidden</span>' : ''}</figcaption>
    <div class="adm-acts">${fSeg(p)}</div></figure>`;
  const rows = [...[...FORM_ORDER].map(c => [c, fName(c), p => fOf(p.f) === c]), ['multi', 'Several forms', p => fOf(p.f).length > 1], ['x', 'Form not visible', p => fOf(p.f) === 'x'], ['', 'No guess yet', p => !fOf(p.f)]];
  const sec = ([id, t, test]) => { const L = all.filter(test); if (!L.length && (id === '' || id === 'multi')) return '';
    return `<section class="adm-row adm-qrow"><h3>${id && id !== 'multi' ? `<b class="adm-fl">${id === 'x' ? '∅' : id}</b> ` : ''}${esc(t)} <small>${L.length} photo${L.length === 1 ? '' : 's'}${id === 'x' ? ' · never used on the growth-form tiles' : ''}</small></h3>
      <div class="adm-grid adm-qgrid" data-fdrop="${id}">${L.map(card).join('')}</div></section>`; };
  const opt = (v, t, cur) => `<button type="button" class="adm-fchip plain" data-fv="${v}" aria-pressed="${cur === v}">${t}</button>`;
  $v.innerHTML = `<section class="adm-quality">
    <div class="adm-qhead"><h2>Growth form</h2></div>
    <div class="adm-filter"><span class="label">Show</span>${ORIGINS.filter(([o]) => o !== 'book').map(([o, t]) => `<button type="button" class="adm-fchip o-${o}" data-o="${o}" aria-pressed="${SHOW.has(o)}">${t}</button>`).join('')}</div>
    <div class="adm-filter"><span class="label">View</span>${opt('all', 'All', FF.view)}${VIEWS.map(([v, t]) => opt(v, t, FF.view)).join('')}${opt('cand', 'Candidates', FF.view)}
      <select id="fgen" aria-label="Genus"><option value="">All genera</option>${names.map(m => `<option${m === FF.genus ? ' selected' : ''}>${esc(m)}</option>`).join('')}</select>
      <label class="adm-todo"><input type="checkbox" id="ftodo"${FF.todo ? ' checked' : ''}> Not checked yet</label></div>
    ${rows.map(sec).join('')}</section>`;
  const saveFF = () => { store.set('imr-admin-ffilter', FF); renderForm(); };
  $v.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { const o = b.dataset.o; SHOW.has(o) ? SHOW.delete(o) : SHOW.add(o); store.set('imr-admin-origins', [...SHOW]); renderForm(); });
  $v.querySelectorAll('[data-fv]').forEach(b => b.onclick = () => { FF.view = b.dataset.fv; saveFF(); });
  $('fgen').onchange = e => { FF.genus = e.target.value; saveFF(); };
  $('ftodo').onchange = e => { FF.todo = e.target.checked; saveFF(); };
  $v.querySelectorAll('[data-act="zoom"]').forEach(b => b.onclick = () => { const t = b.closest('[data-f]'); zoom(t.dataset.g, t.dataset.f); });
  $v.querySelectorAll('[data-act="exclude"]').forEach(b => b.onclick = e => { e.stopPropagation(); const t = b.closest('[data-f]'); ACT.exclude(t.dataset.g, t.dataset.f); });
  bindF($v);
  let over = null;
  $v.querySelectorAll('.adm-qt').forEach(t => { t.onmouseenter = t.onfocus = () => { over = t; }; t.onmouseleave = () => { if (over === t) over = null; }; });
  document.onkeydown = e => { if (cur !== '~form' || !over || e.ctrlKey || e.metaKey || e.altKey || e.target.closest('input,select,textarea')) return;
    const k = e.key.toUpperCase(), c = k === '0' ? 'x' : k === 'X' ? 'x' : FORM_ORDER.includes(k) ? k : null; if (c) { e.preventDefault(); formTile(over, toggleF(over.dataset.f, c)); } };
  // Drag a photo onto another row: it gets that single form (Several forms: kept as it is).
  const clearF = () => $v.querySelectorAll('.drop-row').forEach(x => x.classList.remove('drop-row'));
  pointerDrag($v.querySelectorAll('.adm-qt'), el => { clearF(); const g = el && el.closest('[data-fdrop]'); if (g && g.dataset.fdrop && g.dataset.fdrop !== 'multi') g.classList.add('drop-row'); },
    (t, el) => { clearF(); const g = el && el.closest('[data-fdrop]'); if (g && g.dataset.fdrop && g.dataset.fdrop !== 'multi') { formTile(t, g.dataset.fdrop); g.prepend(t); } }, clearF);
}

/* ---------- Excluded ---------- */
function renderExcluded(){
  status();
  const X = DRAFT.exclude || {}, list = Object.keys(X).map(f => PHOTOS[f] ? {...PHOTOS[f], f} : {f, genus: '?'});
  $v.innerHTML = `<section class="adm-quality"><div class="adm-qhead"><h2>Excluded photos</h2></div>
    ${list.length ? `<div class="adm-grid adm-qgrid">${list.map(p => `<figure class="adm-tile" data-f="${esc(p.f)}" data-g="${esc(p.genus)}">
      <button type="button" class="adm-ph" data-act="zoomx" aria-label="Enlarge">${p.genus === '?' ? '<span class="none">missing</span>' : `<img src="${img(p, 1)}" alt="" loading="lazy">`}</button>
      <figcaption><a class="adm-gen" href="#${esc(p.genus)}"><i>${esc(p.genus)}</i></a>${p.genus === '?' ? '' : srcTag(p)}</figcaption>
      <div class="adm-acts"><button type="button" data-act="restore">Restore</button></div></figure>`).join('')}</div>` : '<p class="note">No excluded photo.</p>'}</section>`;
  const set = (f, r) => { DRAFT.exclude = {...(DRAFT.exclude || {})}; if (r) DRAFT.exclude[f] = r; else delete DRAFT.exclude[f]; saveDraft(); renderExcluded(); };
  $v.querySelectorAll('[data-act="restore"]').forEach(b => b.onclick = () => set(b.closest('[data-f]').dataset.f, null));
  $v.querySelectorAll('[data-act="zoomx"]').forEach(b => b.onclick = () => { const t = b.closest('[data-f]'), p = PHOTOS[t.dataset.f]; if (p) zoomOne(p); });
}
function zoomOne(p){
  const lb = $('lightbox'), close = () => { lb.hidden = true; lb.innerHTML = ''; document.removeEventListener('keydown', key); }, key = e => { if (e.key === 'Escape') close(); };
  lb.innerHTML = `<div class="lb-in"><img src="${img(p)}" alt=""><p class="lb-cap"><i>${esc(p.genus)}</i> · ${p.imr ? 'IMR Lecture 6, slide ' + p.slide : esc(p.a || '')} · <code>${esc(p.f)}</code></p><div class="lb-nav"><button type="button" data-x>Close</button></div></div>`;
  lb.querySelector('[data-x]').onclick = close; lb.hidden = false; lb.onclick = e => { if (e.target === lb) close(); }; document.addEventListener('keydown', key);
}

/* ---------- Save / download ---------- */
const output = () => { const genera = {}; Object.keys(DATA.gen).filter(n => DRAFT.genera[n]).forEach(n => { genera[n] = DRAFT.genera[n]; });
  const quality = {}; Object.keys(DRAFT.quality || {}).sort().forEach(f => { quality[f] = DRAFT.quality[f]; });
  const exclude = {}; Object.keys(DRAFT.exclude || {}).sort().forEach(f => { exclude[f] = DRAFT.exclude[f]; });
  const form = {}; Object.keys(DRAFT.form || {}).sort().forEach(f => { form[f] = DRAFT.form[f]; });
  return {v: 1, ...(bookOn(DRAFT) ? {} : {book: false}), genera, ...(Object.keys(quality).length ? {quality} : {}), ...(Object.keys(form).length ? {form} : {}), ...(Object.keys(exclude).length ? {exclude} : {})}; };
async function save(){
  const ch = changed(), q = qChanged(), x = xChanged(), bk = bChanged(), fm = fChanged(); if (!(ch.length || q || x || bk || fm) || !TOKEN) return;
  const b = $('save'); b.disabled = true; b.textContent = 'Publishing…';
  try {
    const out = output(), text = JSON.stringify(out, null, 2) + '\n';
    const msg = `Photo curation: ${[...ch.slice(0, 6), ...(q ? ['quality ratings'] : []), ...(fm ? ['growth forms'] : []), ...(x ? ['exclusions'] : []), ...(bk ? [`Coral Finder book photos ${bookOn(DRAFT) ? 'on' : 'off'}`] : [])].join(', ')}${ch.length > 6 ? ` and ${ch.length - 6} more genera` : ''}`;
    const r = await gh(`/contents/${FILE}`, {method: 'PUT', body: JSON.stringify({message: msg, content: toB64(text), branch: BRANCH, ...(SHA ? {sha: SHA} : {})})});
    SHA = r.content.sha; SAVED = clone(out); DRAFT = clone(out); saveDraft();
    toast('Published. The public site shows it within a minute or two.');
  } catch (x) { toast(/does not match|sha/i.test(x.message) ? 'The site was published from elsewhere in the meantime: reload the page, your draft is kept.' : 'Not published (your draft is kept): ' + x.message); }
  b.textContent = 'Publish'; render();
}
function download(){
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(output(), null, 2) + '\n'], {type: 'application/json'}));
  a.download = FILE; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* ---------- Start ---------- */
async function start(){
  const hd = document.querySelector('header'); if (hd && window.ResizeObserver) new ResizeObserver(() => document.documentElement.style.setProperty('--hdr-h', hd.offsetHeight + 'px')).observe(hd);
  $v.innerHTML = '<p class="note">Loading photos…</p>';
  const side = (u, k) => fetch(u, {cache: 'no-cache'}).then(r => r.ok ? r.json() : {}).then(j => j[k] || {}).catch(() => ({}));
  try { [DATA, AUTOQ, AUTOF] = await Promise.all([fetch('data.json', {cache: 'no-cache'}).then(r => r.json()), side('quality.json', 'q'), side('forms.json', 'form'), loadSaved()]); }
  catch (x) { $v.innerHTML = `<p class="warn">Could not load: ${esc(x.message)}</p>`; return; }
  // Every photo of data.json by name, with its genus, for the Excluded view.
  PHOTOS = {}; Object.entries(DATA.gen).forEach(([n, g]) => [...Object.values(g.views || {}), ...Object.values(g.more || {}), (DATA.course || {})[n] || [], (DATA.cand || {})[n] || [], g.book || []].flat().forEach(p => { PHOTOS[p.f] = {...p, genus: n}; }));
  // Every photo name in data.json (field, extra, lecture, candidates), to spot choices left pointing nowhere.
  KNOWN = new Set([...Object.values(DATA.gen).flatMap(g => [...Object.values(g.views || {}), ...Object.values(g.more || {}), g.book || []].flat()), ...Object.values(DATA.course || {}).flat(), ...Object.values(DATA.cand || {}).flat(), ...(DATA.cmp || [])].map(p => p.f));
  // Unsaved edits from an earlier visit are kept, on top of what is saved.
  const old = store.get('imr-curation-draft', null);
  DRAFT = old && old.genera ? old : clone(SAVED); snap = JSON.stringify(DRAFT);
  const keep = changed().length; if (keep) toast(`Your draft from last time is back: ${keep} ${keep > 1 ? "genera" : "genus"} not published yet.`);
  $('tools').hidden = false; $('save').onclick = save; $('download').onclick = download;
  const so = $('signout'); if (so) { so.hidden = !TOKEN; so.onclick = signOut; }
  $('undo').onclick = undo;
  $('help').onclick = toggleHelp;
  $('booksw').onclick = () => { if (bookOn(DRAFT)) DRAFT.book = false; else delete DRAFT.book; saveDraft(); render(); };
  $('redo').onclick = redo;
  addEventListener('keydown', e => { if (!(e.ctrlKey || e.metaKey) || e.target.closest('input,textarea')) return; const k = e.key.toLowerCase();
    if (k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); } else if ((k === 'z' && e.shiftKey) || k === 'y') { e.preventDefault(); redo(); } });
  cur = decodeURIComponent(location.hash.slice(1)) || Object.keys(DATA.gen)[0];
  window.onhashchange = () => { cur = decodeURIComponent(location.hash.slice(1)); const h = $('admhelp'); if (h) h.remove(); render(); window.scrollTo({top: 0}); };
  window.onbeforeunload = e => { if (TOKEN && (changed().length || qChanged() || fChanged() || xChanged())) { e.preventDefault(); e.returnValue = ''; } };
  render();
}
// Without a token the page opens read-only (download the JSON) only with ?readonly, so nobody wanders in by accident.
// Stay signed in on this browser after unlocking (survives reloads) until "Sign out".
const SESSION = 'imr-admin-session';
function signOut(){ store.set(SESSION, null); TOKEN = null; location.reload(); }
(async () => {
  if (/[?&]readonly\b/.test(location.search)) return start();
  const t = store.get(SESSION, null);
  if (t) { TOKEN = t; try { await checkToken(); return start(); } catch (x) { TOKEN = null; if (/credentials|cannot write|401/i.test(x.message)) store.set(SESSION, null); return lockScreen(x.message); } }
  lockScreen();
})();

// Photo size S/M/L: same control and same per-page store as the site (localStorage imr-coral-size, key "admin").
(() => {
  const get = () => { try { return JSON.parse(localStorage.getItem('imr-coral-size')) || {}; } catch (e) { return {}; } };
  const apply = () => { const s = get().admin || 'm'; document.documentElement.dataset.size = s; document.querySelectorAll('#size button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.size === s))); };
  document.querySelectorAll('#size button').forEach(b => b.onclick = () => { const p = get(); p.admin = b.dataset.size; try { localStorage.setItem('imr-coral-size', JSON.stringify(p)); } catch (e) {} apply(); });
  apply();
})();
