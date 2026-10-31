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
  set(k, v){ try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
};
const img = (p, s) => `img/${p.f}${s ? '-s' : ''}.webp`;
const clone = o => JSON.parse(JSON.stringify(o));
const same = (a, b) => JSON.stringify(a || null) === JSON.stringify(b || null);

let SUG = {}, FU0, PICKS = {}, PHOTOS = {}, KNOWN = new Set(), DATA, SAVED = {v: 1, genera: {}}, SHA = null, DRAFT, TOKEN = null, cur = null, AUTOQ = {}, AUTOF = {}, lastGenus = null;
// Photo quality: 3 good, 2 fair, 1 poor (material for a realistic mode). First ratings come from quality.json
// (tools/photo_quality.py, rough on purpose); Pierre's corrections live in curation.json "quality" {f: level}.
const QUAL = [[3, 'Good'], [2, 'Fair'], [1, 'Poor']];
// Automatic rating: never Poor for an IMR lecture photo (as autoQ in app.js); only Pierre's own rating can say Poor.
const autoQ = f => { const a = AUTOQ[f] || 2; return a === 1 && /^imrl?-/.test(f) ? 2 : a; };
const qOf = f => (DRAFT.quality || {})[f] || autoQ(f), qSet = f => !!(DRAFT.quality || {})[f];
// Every click is saved at once as a draft in this browser (it survives a reload or closing the tab);
// Publish sends the draft to the public site.
let draftAt = null;
// No button ever clears several choices at once: Undo (or Ctrl+Z) steps back one click at a time, within this visit.
// Redo (or Ctrl+Shift+Z / Ctrl+Y) steps forward again; a new click clears the redo steps.
let HIST = [], FUT = [], snap = null;
function saveDraft(){ if (snap !== null) HIST.push(snap); if (HIST.length > 300) HIST.shift(); FUT = []; snap = JSON.stringify(DRAFT); draftLost = !store.set('imr-curation-draft', DRAFT); draftAt = new Date(); }
let draftLost = false;
function step(from, to, msg){
  if (!from.length) return toast(msg[0]);
  to.push(snap); snap = from.pop(); DRAFT = JSON.parse(snap); store.set('imr-curation-draft', DRAFT); draftAt = new Date(); render(); toast(msg[1]);
}
const undo = () => step(HIST, FUT, ['Nothing to undo.', 'Undone.']), redo = () => step(FUT, HIST, ['Nothing to redo.', 'Redone.']);
const qChanged = () => !same(DRAFT.quality || {}, SAVED.quality || {});
// "Bad photo" flags Pierre raised on the site (flag.js, localStorage 'imr-photo-flags'): curation.json "flag"
// {f: {genus, view, where, at}}. Triage lists them; "Done" removes one (one at a time, never in bulk).
const flChanged = () => !same(DRAFT.flag || {}, SAVED.flag || {});
// Suggestions from the outside judging agent (suggest.json, tools/judging_import.py): Triage lists them one at a time.
// Accept runs the normal action (move, Not this genus, exclude, hide, add); "Several corals" keeps the photo off games
// (curation.json "use" {f: 'ref'}); Dismiss is remembered in curation.json "seen" {kind:f: 1} so it never comes back.
const sgChanged = () => !same(DRAFT.seen || {}, SAVED.seen || {}) || !same(DRAFT.use || {}, SAVED.use || {});
function importFlags(){
  const L = store.get('imr-photo-flags', []); if (!L || !L.length) return 0;
  DRAFT.flag = {...(DRAFT.flag || {})}; let n = 0;
  L.forEach(x => { if (x && x.f && !DRAFT.flag[x.f]) { const {f, ...rest} = x; DRAFT.flag[f] = rest; n++; } });
  store.set('imr-photo-flags', null); if (n) saveDraft(); return n;
}
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
// Growth form of each photo: ONE of the 7 IMR Lecture 6 growth forms (forms.json "forms": B Branching, E Encrusting,
// T Tabulate, U Mushroom, M Massive, S Submassive, F Foliose/Plating), the main one visible (Pierre), or x = form not
// visible (too close); plus a polyps flag ("p" yes, "n" no) for polyps or vesicles extended by day, which is not a form
// (Coral Finder "Large daytime polyps"). First guesses come from forms.json "gf"; Pierre's choices live in curation.json
// "gf" {f: 'M' | 'Mp' | 'xn' | 'p'} and always win, form and flag each on their own. The old Coral Finder letters
// (forms.json "form") are only a hint for the photos still to classify.
// Guesses to double-check (forms.json gunsure): a "?" until you click.
let FUNSURE = new Set(), FDEF = [], LEGACY = {};
const FORM_ORDER = 'BETUMSF', FABBR = {B: 'Br', E: 'En', T: 'Ta', U: 'Mu', M: 'Ma', S: 'Sm', F: 'Fo', x: '∅'};
const fL = v => (v || '').replace(/[pn]/g, ''), fP = v => (v || '').includes('p') ? true : (v || '').includes('n') ? false : null;
const mineF = f => (DRAFT.gf || {})[f] || '';
const fOf = f => fL(mineF(f)) || fL(AUTOF[f]), fSet = f => !!fL(mineF(f));
const pOf = f => { const m = fP(mineF(f)); return m === null ? fP(AUTOF[f]) === true : m; }, pSet = f => fP(mineF(f)) !== null;
const fChanged = () => !same(DRAFT.gf || {}, SAVED.gf || {});
const fName = id => id === 'x' ? 'Form not visible' : (FDEF.find(k => k.id === id) || {}).name || id;
const cfName = id => (DATA.key.find(k => k.id === id) || {}).name || id;
function putF(f, letter, pol){
  DRAFT.gf = DRAFT.gf || {};
  // Always recorded, even when it matches the first guess, so a new forms.json can never change it.
  const v = letter + (pol === true ? 'p' : pol === false ? 'n' : '');
  if (v) DRAFT.gf[f] = v; else delete DRAFT.gf[f];
  saveDraft();
}
const setF = (f, c) => putF(f, c, fP(mineF(f)));
const setP = (f, on) => putF(f, fL(mineF(f)), on);
const fSeg = p => { const v = fOf(p.f), un = !fSet(p.f) && FUNSURE.has(p.f), po = pOf(p.f);
  return `<span class="adm-qseg adm-fseg${fSet(p.f) ? '' : ' auto'}${un ? ' unsure' : ''}" role="group" aria-label="Growth form" title="Growth form">${[...FORM_ORDER, 'x'].map(c => `<button type="button" data-fm="${c}" aria-pressed="${v === c}" title="${esc(fName(c))}">${FABBR[c]}</button>`).join('')}<button type="button" class="adm-pol${pSet(p.f) ? '' : ' auto'}" data-pol aria-pressed="${po}" title="Polyps or vesicles extended">✿</button></span>`; };

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
// Same order as the Show source chips (ORIGINS), CF book last.
const pending = n => { const add = entry(n).add || {}, oi = p => ORIGINS.findIndex(o => o[0] === origin(p)); return cands(n).filter(p => !add[p.f]).sort((a, b) => oi(a) - oi(b)); };
const entry = n => DRAFT.genera[n] || {};
// Zoom levels (curation lv, header switch): 2 levels = Closer photos join Colony (as applyCuration in app.js).
const lv = n => entry(n).lv || (DATA.gen[n].levels === 2 ? 2 : 3);
const viewOf = (n, p) => { const v = (entry(n).move || {})[p.f] || p.base; return v === 'medium' && lv(n) === 2 && DATA.gen[n].levels !== 2 ? 'wide' : v; };
const hidden = (n, p) => (entry(n).hide || []).includes(p.f);
// Same order as applySlots in app.js: IMR photos, then Pierre's, then other observers, each by quality,
// Poor photos and multi-coral photos last.
function autoOrder(L){
  const byQ = x => x.slice().sort((a, b) => qOf(b.f) - qOf(a.f));
  const main = L.filter(p => !p.extra), out = [...byQ(main.filter(p => p.imr)), ...byQ(main.filter(p => !p.imr && p.own)), ...byQ(main.filter(p => !p.imr && !p.own))];
  const ok = out.filter(p => !p.multi);
  return [...ok.filter(p => qOf(p.f) > 1), ...ok.filter(p => qOf(p.f) === 1), ...out.filter(p => p.multi), ...L.filter(p => p.extra)];
}
// k photos from L in order, a different observation each time when possible (as take() in app.js).
const takeObs = (L, k) => { const out = [], seen = new Set(); [true, false].forEach(fresh => L.forEach(p => { if (out.length < k && !out.includes(p) && (!fresh || !seen.has(p.o || p.f))) { out.push(p); seen.add(p.o || p.f); } })); return out; };
function rowOf(n, v){
  const live = photos(n).filter(p => viewOf(n, p) === v && !hidden(n, p)), order = autoOrder(live);
  const pin = (entry(n).feat || {})[v];
  // No pick of yours: Claude's suggestion (picks.json) first, then the automatic order, as on the site.
  const sug = ((PICKS[n] || {})[v] || []).map(f => live.find(p => p.f === f && !p.multi && !p.extra)).filter(Boolean);
  // Featured = always the first FEAT photos (Pierre): his pinned ones in his order, the rest filled automatically,
  // never with a Poor photo while better ones exist, except IMR lecture photos (as on the site).
  const pinned = (pin || []).map(f => live.find(p => p.f === f)).filter(Boolean).slice(0, FEAT);
  const cand = [...sug, ...order.filter(p => !p.multi && !p.extra)].filter(p => !pinned.includes(p)), k = FEAT - pinned.length;
  const good = takeObs(cand.filter(p => p.imr || qOf(p.f) !== 1), k), feat = [...pinned, ...good, ...takeObs(cand.filter(p => !good.includes(p)), k - good.length)];
  return {feat, pinned: pinned.map(p => p.f), auto: !pinned.length, rest: order.filter(p => !feat.includes(p)), hid: photos(n).filter(p => viewOf(n, p) === v && hidden(n, p))};
}
function coverOf(n){
  const g = DATA.gen[n], all = photos(n).filter(p => !hidden(n, p)), k = entry(n);
  // Same fallbacks as cover() in app.js: your pick, the first IMR featured Closer photo, data.json's pick, the first closer field photo (featured first).
  const F = (k.feat || {}).medium || [], med = all.filter(x => viewOf(n, x) === 'medium' && !x.imr && !x.extra);
  const ri = rowOf(n, 'medium').feat.find(x => x.imr);
  const p = (k.cover && all.find(x => x.f === k.cover)) || ri || all.find(x => x.f === g.cover && !x.extra) || med.find(x => F.includes(x.f)) || med[0] || all.find(x => !x.imr && !x.extra);
  return p && {...p, view: viewOf(n, p), picked: !!k.cover};
}
const rows = n => VIEWS.filter(([v]) => !(lv(n) === 2 && v === 'medium' && !photos(n).some(p => viewOf(n, p) === 'medium')));
const label = (n, v) => lv(n) === 2 && v === 'macro' ? 'Close-up' : VIEWS.find(x => x[0] === v)[1];
// Photo origin: IMR lecture, Pierre's own iNaturalist photos, or other iNaturalist observers split by place
// (data.json p.loc: dauin, ph or world). The filter is kept across genera and visits.
const ORIGINS = [['imr', 'IMR lecture'], ['own', 'Pierre'], ['dauin', 'iNat Dauin'], ['ph', 'iNat Philippines'], ['world', 'iNat elsewhere'], ['book', 'CF book']];
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
  // On an automatic pick, a click on a photo already featured confirms the whole pick as yours (it never drops it).
  feat: (n, f, v) => edit(n, k => { const auto = !(k.feat || {})[v], L = ensureFeat(k, n, v);
    if (auto && L.includes(f)) return;
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
    const r = rowOf(n, to), cur = r.feat.map(x => x.f), inFeat = was && cur.includes(f), L = cur.filter(x => x !== f);
    if (p.cand || pending(n).includes(p)) { k.add = k.add || {}; k.add[f] = to; }
    else if (!was) { k.move = k.move || {}; if (to === p.base) delete k.move[f]; else k.move[f] = to; }
    dropFeat(k, f);
    // Dropped after the last of 3 featured photos: it takes the last place (it used to fall off the end).
    if (at !== null) { L.splice(Math.min(at, L.length, FEAT - 1), 0, f); k.feat = k.feat || {}; k.feat[to] = L.slice(0, FEAT); }
    // Dragged out of the first places: the next photo moves up, and the set is pinned so it can't come straight back.
    else if (inFeat) { const nx = r.rest.find(x => x.f !== f && !x.multi && !x.extra && (x.imr || qOf(x.f) !== 1)) || r.rest.find(x => x.f !== f && !x.multi && !x.extra);
      if (nx) L.push(nx.f); k.feat = k.feat || {}; if (L.length) k.feat[to] = L; else delete k.feat[to]; }
  }),

};

/* ---------- Rendering ---------- */
const changed = () => [...new Set([...Object.keys(DRAFT.genera), ...Object.keys(SAVED.genera)])].filter(n => !same(DRAFT.genera[n], SAVED.genera[n]));
function tile(n, p, v, st){
  const k = entry(n), isCover = k.cover === p.f, two = lv(n) === 2;
  // View buttons: the current view is pressed; one click on another moves the photo there.
  const moves = VIEWS.filter(([w]) => w === v || !(two && w === 'medium')).map(([w]) => `<button type="button" data-act="move" data-to="${w}" aria-pressed="${w === v}">${label(n, w)}</button>`).join('');
  return `<figure class="adm-tile ${st.cls || ''}${isCover ? ' is-cover' : ''}" data-f="${esc(p.f)}" data-v="${v}"${st.cls === 'is-hidden' ? '' : ` data-drag${st.num ? ` data-pos="${st.num - 1}"` : ''}`}>
    <button type="button" class="adm-ph" data-act="zoom" aria-label="Enlarge"><img src="${img(p, 1)}" alt="" loading="lazy" draggable="false"></button>${st.cls === 'is-hidden' ? '' : GRIP + XBTN}
    ${st.num ? `<span class="adm-num">${st.num}</span>` : ''}
    ${isCover ? '<span class="adm-covermark">Cover</span>' : ''}
    <figcaption>${p.from ? `<span class="adm-src new" title="From ${esc(p.from)}">from ${esc(p.from)}</span>` : ''}${p.cand ? '<span class="adm-src new" title="Candidate you added">new</span>' : ''}${srcTag(p)}${p.multi ? '<span class="adm-src multi" title="Several corals">several corals</span>' : ''}<span class="adm-t">${esc(p.imr ? 'slide ' + p.slide : p.t || '')}</span></figcaption>
    <div class="adm-acts">${qSeg(p)}${fSeg(p)}
      ${st.cls === 'is-hidden' ? `<button type="button" data-act="hide" class="on">Show again</button>` : `
      <span class="adm-qseg adm-vseg" role="group" aria-label="View">${moves}</span>
      <button type="button" data-act="cover" class="${isCover ? 'on' : ''}" title="Cover">★ Cover</button>
      ${p.cand ? '<button type="button" data-act="hide" title="Back to the candidates">Remove</button>' : '<button type="button" data-act="hide" title="Hide">Hide</button>'}
      ${p.from || p.cand ? '' : `<select data-act="out" aria-label="Take out of this genus"><option value="">Not this</option><option value="cmp">Look-alike comparison</option><optgroup label="It shows another genus">${Object.keys(DATA.gen).filter(m => m !== n).map(m => `<option>${esc(m)}</option>`).join('')}</optgroup></select>`}`}
    </div></figure>`;
}
// Small × on each photo: exclude it for good (a person, a drawing, AI…).
const XBTN = '<button type="button" class="adm-x" data-act="exclude" title="Exclude" aria-label="Exclude for good">×</button>';
function status(){
  const ch = changed(), q = qChanged(), x = xChanged(), parts = [ch.length ? `${ch.length} ${ch.length > 1 ? 'genera' : 'genus'}` : '', q ? 'quality ratings' : '', fChanged() ? 'growth forms' : '', x ? 'exclusions' : '', bChanged() ? 'book photos switch' : '', flChanged() ? 'triage flags' : '', sgChanged() ? 'triage suggestions' : ''].filter(Boolean);
  const bs = $('booksw'); if (bs) { bs.setAttribute('aria-pressed', String(bookOn(DRAFT))); bs.textContent = `CF book: ${bookOn(DRAFT) ? 'on' : 'off'}`; }
  const tn = Object.keys(DRAFT.flag || {}).length + sugCount(), ta = document.querySelector('[data-mode="triage"]'); if (ta) ta.textContent = `Triage${tn ? ` (${tn})` : ''}`;
  const xn = Object.keys(DRAFT.exclude || {}).length, xa = document.querySelector('[data-mode="excluded"]'); if (xa) xa.textContent = `Excluded${xn ? ` (${xn})` : ''}`;
  const t = draftAt ? ` (saved ${draftAt.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})})` : '';
  $('status').textContent = parts.length ? '● Not published' : TOKEN ? '✓ Published' : 'Read-only';
  $('status').title = parts.length ? `Draft${t}: ${parts.join(' + ')} not published yet` : TOKEN ? 'Everything is published' : 'Read-only: download only';
  $('status').classList.toggle('dirty', !!parts.length);
  $('undo').disabled = !HIST.length; $('redo').disabled = !FUT.length;
  $('save').disabled = !TOKEN || !parts.length; $('save').title = TOKEN ? 'Send your draft to the public site' : 'Unlock with a token to publish';
  if (cur[0] !== '~') lastGenus = cur;
  $('modes').hidden = false; $v.ownerDocument.querySelector('[data-mode="genus"]').href = '#' + encodeURIComponent(lastGenus || '');
  document.querySelectorAll('[data-mode]').forEach(a => a.setAttribute('aria-current', String(a.dataset.mode === ({'~quality': 'quality', '~form': 'form', '~excluded': 'excluded', '~triage': 'triage', '~diff': 'diff'}[cur] || 'genus'))));
}
function render(){
  if (cur === '~quality') return renderQuality();
  if (cur === '~form') return renderForm();
  if (cur === '~excluded') return renderExcluded();
  if (cur === '~triage') return renderTriage();
  if (cur === '~diff') return renderDiff();
  const names = Object.keys(DATA.gen); if (!DATA.gen[cur]) cur = names[0];
  const ch = changed(), n = cur, g = DATA.gen[n], cv = coverOf(n), k = entry(n);
  status();
  $('preview').href = `./?draft#g-${encodeURIComponent(n)}`;
  const side = names.map(m => { const c = coverOf(m), e = DRAFT.genera[m] || {}, dirty = ch.includes(m), h = (e.hide || []).length;
    return `<a href="#${esc(m)}" class="adm-g${m === n ? ' cur' : ''}"${m === n ? ' aria-current="true"' : ''}>${c ? `<img src="${img(c, 1)}" alt="" loading="lazy">` : '<span class="none"></span>'}<span><i>${esc(m)}</i>
      <small>${DATA.gen[m].n ? 'No. ' + DATA.gen[m].n : '★'}${c && c.view === 'macro' && lv(m) !== 2 ? ' · <b class="warnc" title="Cover is a close-up">macro cover</b>' : ''}${h ? ` · ${h} hidden` : ''}${pending(m).length ? ` · ${pending(m).length} new` : ''}${missing(m).length ? ' · <b class="warnc" title="Missing photos">⚠ check</b>' : ''}</small></span>${dirty ? '<b class="dot" title="Draft not published yet">●</b>' : Object.keys(e).length ? '<b class="dot done" title="Curated">✓</b>' : ''}</a>`; }).join('');
  const body = rows(n).map(([v]) => { const r = rowOf(n, v), out = [...r.feat, ...r.rest, ...r.hid].filter(p => !shown(p)).length;
    return `<section class="adm-row"><h3>${label(n, v)} <small>${r.feat.length + r.rest.length} photo${r.feat.length + r.rest.length === 1 ? '' : 's'}${r.hid.length ? ` · ${r.hid.length} hidden` : ''}${out ? ` · <b>${out} filtered out</b>` : ''}</small></h3>
      <div class="adm-grid" data-drop="${v}">${r.feat.map((p, i) => shown(p) ? tile(n, p, v, {num: i + 1, auto: !r.pinned.includes(p.f), last: i === r.feat.length - 1, cls: 'is-feat'}) : '').join('')}${r.rest.filter(shown).map(p => tile(n, p, v, {})).join('')}${r.hid.filter(shown).map(p => tile(n, p, v, {cls: 'is-hidden'})).join('')}</div>
      ${r.feat.length + r.rest.length ? '' : '<p class="note">No photo in this view.</p>'}</section>`; }).join('');
  const P = pending(n), Ps = P.filter(shown), two = lv(n) === 2;
  const candTile = p => `<figure class="adm-tile is-cand" data-f="${esc(p.f)}" data-drag><button type="button" class="adm-ph" data-act="zoom" aria-label="Enlarge"><img src="${img(p, 1)}" alt="" loading="lazy" draggable="false"></button>${GRIP}${XBTN}
    <figcaption>${srcTag(p)}<span class="adm-t">${esc(p.t || '')}</span></figcaption>
    <div class="adm-acts">${qSeg(p)}${fSeg(p)}<span class="adm-qseg adm-vseg" role="group" aria-label="View">${VIEWS.filter(([w]) => !(two && w === 'medium')).map(([w]) => `<button type="button" data-act="addc" data-to="${w}" title="Add to ${label(n, w)}">${label(n, w)}</button>`).join('')}</span></div></figure>`;
  // Candidates: set apart from the views and folded by default (Pierre); open or closed is remembered.
  const candRow = P.length ? `<details class="adm-row adm-cands"${store.get('imr-admin-cands', false) ? ' open' : ''}><summary><h3>Candidates <small>${P.length} new photo${P.length > 1 ? 's' : ''} not on the site yet${P.length - Ps.length ? ` · <b>${P.length - Ps.length} filtered out</b>` : ''}</small></h3></summary>
    <div class="adm-grid">${Ps.map(candTile).join('')}</div></details>` : '';
  const O = outOf(n), outRow = O.length ? `<section class="adm-row adm-out"><h3>Not this genus <small>${O.length} photo${O.length > 1 ? 's' : ''} taken out of <i>${esc(n)}</i></small></h3>
    <div class="adm-grid">${O.map(p => `<figure class="adm-tile is-hidden" data-f="${esc(p.f)}"><button type="button" class="adm-ph" data-act="zoom" aria-label="Enlarge"><img src="${img(p, 1)}" alt="" loading="lazy"></button>
      <figcaption>${srcTag(p)}<span class="adm-t">${outs(n)[p.f] === 'cmp' ? 'look-alike comparison' : '→ ' + esc(outs(n)[p.f])}</span></figcaption>
      <div class="adm-acts"><button type="button" data-act="out" data-to="back">Put back</button></div></figure>`).join('')}</div></section>` : '';
  const cnt = o => [...photos(n), ...P].filter(p => origin(p) === o).length;
  const filter = `<div class="adm-filter adm-sticky" role="group" aria-label="Show photos from">${cv ? `<button type="button" class="adm-sthumb${cv.view === 'macro' && lv(n) !== 2 ? ' warnc' : ''}" data-f="${esc(cv.f)}" data-act="zoomcover" title="Cover"><img src="${img(cv, 1)}" alt="${esc(n)} cover"></button>` : ''}<b class="adm-sname"><i>${esc(n)}</i></b><a class="adm-sheet" href="./?draft#g-${encodeURIComponent(n)}" target="_blank" rel="noopener" title="Genus sheet" aria-label="Open the sheet">↗</a><span class="adm-qseg adm-lvseg" role="group" aria-label="Zoom levels" title="Zoom levels">${[3, 2].map(x => `<button type="button" data-lv="${x}" aria-pressed="${lv(n) === x}">${x} levels</button>`).join('')}</span><span class="label">Show</span>${ORIGINS.map(([o, t]) => `<button type="button" class="adm-fchip o-${o}" data-o="${o}" aria-pressed="${SHOW.has(o)}">${t} <b>${cnt(o)}</b></button>`).join('')}${SHOW.size < ORIGINS.length ? '<button type="button" class="adm-link" data-o="all">Show all</button>' : ''}</div>`;
  $v.innerHTML = `<div class="adm">
    <nav class="adm-side" aria-label="Genera"><select id="gsel" aria-label="Genus">${names.map(m => `<option${m === n ? ' selected' : ''}>${esc(m)}</option>`).join('')}</select><div class="adm-list">${side}</div></nav>
    <section class="adm-main">
      ${missing(n).length ? `<p class="warn"><b>${missing(n).length} of your choices name a photo that is no longer in the data</b>: ${missing(n).map(f => `<code>${esc(f)}</code>`).join(', ')}. Kept but no longer applied; tell Claude to remap them.</p>` : ''}
      ${filter}${body}${candRow}${outRow}
    </section></div>`;
  $v.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { const o = b.dataset.o;
    if (o === 'all') SHOW = new Set(ORIGINS.map(x => x[0])); else SHOW.has(o) ? SHOW.delete(o) : SHOW.add(o);
    store.set('imr-admin-origins', [...SHOW]); render(); });
  $v.querySelectorAll('[data-lv]').forEach(b => b.onclick = () => { const x = Number(b.dataset.lv); edit(n, k => { if (x === (DATA.gen[n].levels === 2 ? 2 : 3)) delete k.lv; else k.lv = x; }); });
  $('gsel').onchange = e => { location.hash = e.target.value; };
  const cd = $v.querySelector('.adm-cands'); if (cd) cd.ontoggle = () => store.set('imr-admin-cands', cd.open);
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
  diff: `<p>How hard each photo is for the RAs, learned from every quiz and duel answer in the sync sheet (Elo). 0 = an average photo, +1 = clearly harder, -1 = clearly easier; the count is right answers / answers. Few answers = rough. The site uses it to weigh answers in "learned" (a right answer on a hard photo counts more). Re-rate a photo's quality here if it sits in the wrong game set.</p>`,
  genus: `<p>Every click is saved at once as a draft in this browser; <b>Publish</b> sends it to the site. <b>Undo</b> / <b>Redo</b> (Ctrl+Z, Ctrl+Shift+Z) step back one click at a time.</p>
    <p>The first 3 photos of each view are its featured photos (Easy level, top of the sheet, Coral Finder). Drag a photo into the first 3 places to put it there, out of them to drop it (the next best moves up); places you haven't set fill automatically. Drag to another view to move a photo, or from the candidates to add it. Hidden photos disappear everywhere, games included; × excludes a photo for good.</p>
    <p>The letters on each photo are its growth form (see Growth form).</p>`,
  form: `<p>The 7 IMR growth forms (Lecture 6, slides 3-10), one per photo, the main form visible: <b>Br</b> Branching, <b>En</b> Encrusting, <b>Ta</b> Tabulate, <b>Mu</b> Mushroom, <b>Ma</b> Massive, <b>Sm</b> Submassive, <b>Fo</b> Foliose/Plating; <b>∅</b> = form not visible (too close). <b>✿</b> = polyps or vesicles extended (not a form; it fills the Coral Finder "Large daytime polyps" tile).</p>
    <p>The Coral Finder growth-form tiles use them: Branching = Br + Ta, Thin plates and crusts = En + Fo, Massive or thick = Ma + Sm, Columns = Sm, Solitary = Mu, Meandering = any form of the genera it lists. Dashed = a first guess, solid = yours (always wins); a red ? = a guess to double-check.</p>
    <p>Click, drag a photo to another row, or hover it and press B E T U M S F, X for not visible, P for polyps. "To classify" rows group the photos without a guess by their old Coral Finder letter. Coral Finder book photos are left out.</p>`,
  quality: `<p>Quality 3 good, 2 fair, 1 poor. Dashed tags are an automatic guess (sharpness, contrast, colour cast, size). Click, drag to another level, or hover a photo and press 1, 2 or 3.</p>`,
  triage: `<p>Only what needs your eye. On the site, the ⚑ on any photo (shown only in this browser) sends it here with where you saw it. Hide, Poor or Done clear one flag at a time.</p><p>Then Featured photos rated Poor.</p><p>Last, the suggestions of the photo judging agent (suggest.json): wrong genus, view, several corals, near-duplicates, candidates to add. Accept does the usual action (Undo works), Dismiss hides the suggestion for good. Its growth forms and quality ratings show as dashed guesses on each photo, its Featured picks fill the views you haven't picked.</p>`,
  excluded: `<p>Excluded photos are removed from every genus, game and candidate list, and imports skip them. Restore puts one back.</p>`
};
function toggleHelp(){
  let h = $('admhelp'); if (h) { h.remove(); return; }
  const m = ({'~quality': 'quality', '~form': 'form', '~excluded': 'excluded', '~triage': 'triage', '~diff': 'diff'})[cur] || 'genus';
  h = document.createElement('div'); h.id = 'admhelp'; h.className = 'adm-help'; h.setAttribute('role', 'dialog'); h.setAttribute('aria-label', 'Help');
  h.innerHTML = `<button type="button" class="adm-link" aria-label="Close help">×</button>${HELP[m]}`;
  h.querySelector('button').onclick = () => h.remove(); $('tools').append(h);
}

/* ---------- Growth form ---------- */
// One row per IMR growth form, then "Form not visible" and the photos still to classify (by old Coral Finder letter). Click a letter on a photo (one form per photo; ∅ = form not visible), drag it to another row,
// or hover it and press the key (b e t u m s f, x or 0 for not visible, p for polyps). The tile stays put until a filter changes.
const FF = Object.assign({view: 'all', genus: '', todo: false, pol: false}, store.get('imr-admin-ffilter', {}));
function formTile(t, v){
  setF(t.dataset.f, v); const p = {f: t.dataset.f};
  t.querySelector('.adm-fseg').outerHTML = fSeg(p);
  if (cur === '~form') t.classList.add('rated'); bindF(t); status();
}
// One form per photo (Pierre): a click picks that form and replaces the previous one; when in doubt, the main form.
const toggleF = (f, c) => c;
function polTile(t){ setP(t.dataset.f, !pOf(t.dataset.f)); t.querySelector('.adm-fseg').outerHTML = fSeg({f: t.dataset.f}); bindF(t); status(); }
function bindF(scope){ scope.querySelectorAll('.adm-fseg [data-fm]').forEach(b => b.onclick = e => { e.stopPropagation(); const t = b.closest('[data-f]'); formTile(t, toggleF(t.dataset.f, b.dataset.fm)); });
  scope.querySelectorAll('.adm-fseg [data-pol]').forEach(b => b.onclick = e => { e.stopPropagation(); polTile(b.closest('[data-f]')); }); }
function renderForm(){
  status();
  const names = Object.keys(DATA.gen), vl = v => v === 'cand' ? 'Candidate' : VIEWS.find(x => x[0] === v)[1];
  // Coral Finder book photos are left out: they never go on the growth-form tiles.
  const all = allPhotos().filter(p => !p.cf && shown(p) && (FF.view === 'all' || p.view === FF.view) && (!FF.genus || p.genus === FF.genus) && (!FF.todo || !fSet(p.f)) && (!FF.pol || pOf(p.f)));
  const card = p => `<figure class="adm-tile adm-qt${p.hid ? ' is-hidden' : ''}" data-f="${esc(p.f)}" data-g="${esc(p.genus)}" data-drag tabindex="0">
    <button type="button" class="adm-ph" data-act="zoom" aria-label="Enlarge"><img src="${img(p, 1)}" alt="" loading="lazy" draggable="false"></button>${GRIP}${XBTN}
    <figcaption><a class="adm-gen" href="#${esc(p.genus)}" title="Open the genus"><i>${esc(p.genus)}</i></a><span class="adm-src view">${vl(p.view)}</span>${srcTag(p)}${p.hid ? '<span class="adm-src multi">hidden</span>' : ''}</figcaption>
    <div class="adm-acts">${fSeg(p)}</div></figure>`;
  // Still to classify: grouped by the old Coral Finder letter, as a hint.
  const rows = [...[...FORM_ORDER].map(c => [c, fName(c), p => fOf(p.f) === c]), ['x', 'Form not visible', p => fOf(p.f) === 'x'],
    ...[...'BMSPFLC', ''].map(c => ['', `To classify${c ? ` · was Coral Finder ${cfName(c)}` : ''}`, p => !fOf(p.f) && (LEGACY[p.f] || '') === c])];
  const sec = ([id, t, test]) => { const L = all.filter(test); if (!L.length && id === '') return '';
    const todo = id ? L.filter(p => !fSet(p.f)).length : 0;
    return `<section class="adm-row adm-qrow"><h3>${id ? `<b class="adm-fl">${FABBR[id]}</b> ` : ''}${esc(t)} <small>${L.length} photo${L.length === 1 ? '' : 's'}${id === 'x' ? ' · never used on the growth-form tiles' : ''}</small>${todo ? ` <button type="button" class="adm-fok" data-fok="${id}" title="Validate">✓ Validate ${todo}</button>` : ''}</h3>
      <div class="adm-grid adm-qgrid" data-fdrop="${id}">${L.map(card).join('')}</div></section>`; };
  const opt = (v, t, cur) => `<button type="button" class="adm-fchip plain" data-fv="${v}" aria-pressed="${cur === v}">${t}</button>`;
  $v.innerHTML = `<section class="adm-quality">
    <div class="adm-qhead"><h2>Growth form</h2></div>
    <div class="adm-filter"><span class="label">Show</span>${ORIGINS.filter(([o]) => o !== 'book').map(([o, t]) => `<button type="button" class="adm-fchip o-${o}" data-o="${o}" aria-pressed="${SHOW.has(o)}">${t}</button>`).join('')}</div>
    <div class="adm-filter"><span class="label">View</span>${opt('all', 'All', FF.view)}${VIEWS.map(([v, t]) => opt(v, t, FF.view)).join('')}${opt('cand', 'Candidates', FF.view)}
      <select id="fgen" aria-label="Genus"><option value="">All genera</option>${names.map(m => `<option${m === FF.genus ? ' selected' : ''}>${esc(m)}</option>`).join('')}</select>
      <label class="adm-todo"><input type="checkbox" id="ftodo"${FF.todo ? ' checked' : ''}> Not checked yet</label><label class="adm-todo"><input type="checkbox" id="fpol"${FF.pol ? ' checked' : ''}> ✿ Polyps out</label></div>
    ${rows.map(sec).join('')}</section>`;
  const saveFF = () => { store.set('imr-admin-ffilter', FF); renderForm(); };
  $v.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { const o = b.dataset.o; SHOW.has(o) ? SHOW.delete(o) : SHOW.add(o); store.set('imr-admin-origins', [...SHOW]); renderForm(); });
  $v.querySelectorAll('[data-fv]').forEach(b => b.onclick = () => { FF.view = b.dataset.fv; saveFF(); });
  $('fgen').onchange = e => { FF.genus = e.target.value; saveFF(); };
  $('ftodo').onchange = e => { FF.todo = e.target.checked; saveFF(); };
  $('fpol').onchange = e => { FF.pol = e.target.checked; saveFF(); };
  $v.querySelectorAll('[data-act="zoom"]').forEach(b => b.onclick = () => { const t = b.closest('[data-f]'); zoom(t.dataset.g, t.dataset.f); });
  $v.querySelectorAll('[data-act="exclude"]').forEach(b => b.onclick = e => { e.stopPropagation(); const t = b.closest('[data-f]'); ACT.exclude(t.dataset.g, t.dataset.f); });
  // Validate a whole row: every first guess still shown in it (with the filters on) becomes Pierre's own choice, in one undo step.
  $v.querySelectorAll('[data-fok]').forEach(b => b.onclick = () => { const c = b.dataset.fok; DRAFT.gf = {...(DRAFT.gf || {})};
    all.filter(p => fOf(p.f) === c && !fSet(p.f)).forEach(p => { const m = fP(mineF(p.f)), pol = m === null ? fP(AUTOF[p.f]) === true : m;
      DRAFT.gf[p.f] = c + (m === false ? 'n' : pol ? 'p' : ''); });
    saveDraft(); renderForm(); });
  bindF($v);
  let over = null;
  $v.querySelectorAll('.adm-qt').forEach(t => { t.onmouseenter = t.onfocus = () => { over = t; }; t.onmouseleave = () => { if (over === t) over = null; }; });
  document.onkeydown = e => { if (cur !== '~form' || !over || e.ctrlKey || e.metaKey || e.altKey || e.target.closest('input,select,textarea')) return;
    const k = e.key.toUpperCase(); if (k === 'P') { e.preventDefault(); polTile(over); return; }
    const c = k === '0' ? 'x' : k === 'X' ? 'x' : FORM_ORDER.includes(k) ? k : null; if (c) { e.preventDefault(); formTile(over, toggleF(over.dataset.f, c)); } };
  // Drag a photo onto another row: it gets that form (not onto the To classify rows).
  const clearF = () => $v.querySelectorAll('.drop-row').forEach(x => x.classList.remove('drop-row'));
  pointerDrag($v.querySelectorAll('.adm-qt'), el => { clearF(); const g = el && el.closest('[data-fdrop]'); if (g && g.dataset.fdrop) g.classList.add('drop-row'); },
    (t, el) => { clearF(); const g = el && el.closest('[data-fdrop]'); if (g && g.dataset.fdrop) { formTile(t, g.dataset.fdrop); g.prepend(t); } }, clearF);
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
// Triage: only what needs Pierre's eye. 1) photos he flagged on the site, with where they were seen;
// 2) Featured photos rated Poor. Views without his own Featured pick are not a task (Pierre): the automatic pick is fine.
function renderTriage(){
  status();
  const F = DRAFT.flag || {}, flagged = Object.keys(F).map(f => ({...(PHOTOS[f] || {genus: F[f].genus || '?'}), f, fl: F[f]}));
  const when = t => { try { return new Date(t).toLocaleString([], {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'}); } catch (e) { return ''; } };
  const tile = (p, acts, cap) => `<figure class="adm-tile" data-f="${esc(p.f)}" data-g="${esc(p.genus)}">
      <button type="button" class="adm-ph" data-act="zoomx" aria-label="Enlarge">${PHOTOS[p.f] ? `<img src="${img(p, 1)}" alt="" loading="lazy">` : '<span class="none">missing</span>'}</button>
      <figcaption><a class="adm-gen" href="#${esc(p.genus)}"><i>${esc(p.genus)}</i></a>${cap}</figcaption><div class="adm-acts">${acts}</div></figure>`;
  const poor = []; Object.entries(DRAFT.genera).forEach(([n, k]) => Object.entries(k.feat || {}).forEach(([v, L]) => L.forEach(f => { if (PHOTOS[f] && qOf(f) === 1) poor.push({...PHOTOS[f], f, genus: n, fv: v}); })));
  $v.innerHTML = `<section class="adm-quality">
    <div class="adm-qhead"><h2>Flagged on the site <small>${flagged.length}</small></h2></div>
    ${flagged.length ? `<div class="adm-grid adm-qgrid">${flagged.map(p => tile(p, `<button type="button" data-act="thide">Hide in ${esc(p.genus)}</button><button type="button" data-act="tpoor">Poor</button><button type="button" data-act="tdone">Done</button>`,
      `<span class="adm-src view">${esc((VIEWS.find(x => x[0] === p.fl.view) || [, p.fl.view || ''])[1])}</span><small class="adm-where">${esc(p.fl.where || '')} · ${esc(when(p.fl.at))}</small>`)).join('')}</div>` : '<p class="note">Nothing flagged.</p>'}
    ${poor.length ? `<div class="adm-qhead"><h2>Featured but rated Poor <small>${poor.length}</small></h2></div><div class="adm-grid adm-qgrid">${poor.map(p => tile(p, '<a class="chip" href="#' + esc(p.genus) + '">Open genus</a>', `<span class="adm-src view">${esc((VIEWS.find(x => x[0] === p.fv) || [, p.fv])[1])}</span>`)).join('')}</div>` : ''}
    ${sugHtml(tile)}
  </section>`;
  bindSug();
  const done = f => { DRAFT.flag = {...(DRAFT.flag || {})}; delete DRAFT.flag[f]; };
  $v.querySelectorAll('[data-act="tdone"]').forEach(b => b.onclick = () => { done(b.closest('[data-f]').dataset.f); saveDraft(); renderTriage(); });
  $v.querySelectorAll('[data-act="tpoor"]').forEach(b => b.onclick = () => { const f = b.closest('[data-f]').dataset.f; DRAFT.quality = {...(DRAFT.quality || {}), [f]: 1}; done(f); saveDraft(); renderTriage(); });
  $v.querySelectorAll('[data-act="thide"]').forEach(b => b.onclick = () => { const t = b.closest('[data-f]'), n = t.dataset.g, f = t.dataset.f; if (!DATA.gen[n]) return;
    done(f); if (!(entry(n).hide || []).includes(f)) ACT.hide(n, f); else { saveDraft(); renderTriage(); } });
  $v.querySelectorAll('[data-act="zoomx"]').forEach(b => b.onclick = () => { const p = PHOTOS[b.closest('[data-f]').dataset.f]; if (p) zoomOne(p); });
}
/* ---------- Triage: the judging agent's suggestions (suggest.json) ---------- */
const seen = k => !!(DRAFT.seen || {})[k];
const vName = (n, v) => DATA.gen[n] ? label(n, v) : v;
// Pending suggestions only: once accepted (the curation now says the same) or dismissed, an item disappears.
function sugItems(){
  const S = SUG || {}, P = S.photo || {}, out = {genus: [], view: [], multi: [], dup: [], add: []};
  const live = (n, f) => photos(n).find(p => p.f === f && !p.from);
  Object.entries(P).forEach(([f, s]) => {
    const n = s.from; if (!DATA.gen[n] || excl(f)) return;
    const p = live(n, f), un = s.unsure || [];
    if (s.genus === 'exclude') { if (!seen('genus:' + f) && (p || cands(n).some(x => x.f === f))) out.genus.push({...(PHOTOS[f] || {}), f, genus: n, s, un}); }
    else if (s.genus && p && !outs(n)[f] && !seen('genus:' + f)) out.genus.push({...p, genus: n, s, un});
    if (s.view && p && !outs(n)[f] && !hidden(n, p) && viewOf(n, p) !== s.view && !seen('view:' + f)) out.view.push({...p, genus: n, s, un});
    if (s.multi && p && !hidden(n, p) && !(DRAFT.use || {})[f] && !seen('multi:' + f)) out.multi.push({...p, genus: n, s, un});
  });
  (S.dup || []).forEach(d => { const n = d.genus; if (!DATA.gen[n] || seen('dup:' + d.keep) || excl(d.keep) || !live(n, d.keep)) return;
    const left = d.f.filter(f => !excl(f) && live(n, f) && !hidden(n, live(n, f)));
    if (left.length) out.dup.push({...d, left}); });
  Object.entries(S.add || {}).forEach(([n, A]) => { if (!DATA.gen[n]) return; const added = entry(n).add || {};
    Object.entries(A).forEach(([f, v]) => { const p = pending(n).find(x => x.f === f); if (p && !added[f] && !seen('add:' + f)) out.add.push({...p, genus: n, to: v}); }); });
  return out;
}
const sugCount = () => { if (!DATA || !DRAFT || !SUG || !Object.keys(SUG).length) return 0; const o = sugItems(); return o.genus.length + o.view.length + o.multi.length + o.dup.length + o.add.length; };
function sugHtml(tile){
  if (!SUG || !Object.keys(SUG).length) return '';
  const o = sugItems(), dis = k => `<button type="button" data-sg="dismiss" data-k="${esc(k)}">Dismiss</button>`;
  const why = p => `${p.un && p.un.length ? '<span class="adm-src multi" title="The judge is not sure">unsure</span>' : ''}${p.s && p.s.note ? `<small class="adm-where">${esc(p.s.note)}</small>` : ''}`;
  const sec = (title, L, body) => L.length ? `<div class="adm-qhead"><h2>${title} <small>${L.length}</small></h2></div>${body}` : '';
  const grid = (L, fn) => `<div class="adm-grid adm-qgrid">${L.map(fn).join('')}</div>`;
  const gName = g => g === 'cmp' ? 'Look-alike comparison' : g === 'exclude' ? 'Exclude for good' : g;
  return sec('Suggested: not this genus', o.genus, grid(o.genus, p => tile(p, `<button type="button" data-sg="genus" data-to="${esc(p.s.genus)}">${p.s.genus === 'exclude' ? 'Exclude' : 'Accept'}</button>${dis('genus:' + p.f)}`,
      `<span class="adm-src new">→ ${esc(gName(p.s.genus))}</span>${why(p)}`)))
    + sec('Suggested: move to another view', o.view, grid(o.view, p => tile(p, `<button type="button" data-sg="view" data-to="${esc(p.s.view)}">Move to ${esc(vName(p.genus, p.s.view))}</button>${dis('view:' + p.f)}`,
      `<span class="adm-src view">${esc(vName(p.genus, viewOf(p.genus, p)))} → ${esc(vName(p.genus, p.s.view))}</span>${why(p)}`)))
    + sec('Suggested: several corals (keep off games)', o.multi, grid(o.multi, p => tile(p, `<button type="button" data-sg="multi">Keep off games</button>${dis('multi:' + p.f)}`, why(p))))
    + sec('Suggested: near-duplicates', o.dup, o.dup.map(d => `<div class="adm-grid adm-qgrid adm-dup">${tile({...PHOTOS[d.keep], f: d.keep, genus: d.genus}, dis('dup:' + d.keep), `<span class="adm-src new">Keep</span>${d.note ? `<small class="adm-where">${esc(d.note)}</small>` : ''}`)}${d.left.map(f => tile({...PHOTOS[f], f, genus: d.genus}, `<button type="button" data-sg="hide">Hide in ${esc(d.genus)}</button>`, '<span class="adm-src multi">Duplicate</span>')).join('')}</div>`).join(''))
    + sec('Suggested: candidates to add', o.add, grid(o.add, p => tile(p, `<button type="button" data-sg="add" data-to="${esc(p.to)}">Add to ${esc(vName(p.genus, p.to))}</button>${dis('add:' + p.f)}`, srcTag(p))));
}
function bindSug(){
  const on = (a, fn) => $v.querySelectorAll(`[data-sg="${a}"]`).forEach(b => b.onclick = () => { const t = b.closest('[data-f]'), n = t.dataset.g; if (DATA.gen[n]) fn(n, t.dataset.f, b.dataset.to); });
  on('genus', (n, f, to) => to === 'exclude' ? ACT.exclude(n, f) : ACT.out(n, f, null, to));
  on('view', (n, f, to) => ACT.move(n, f, null, to));
  on('hide', (n, f) => ACT.hide(n, f));
  on('add', (n, f, to) => ACT.addc(n, f, null, to));
  on('multi', (n, f) => { DRAFT.use = {...(DRAFT.use || {}), [f]: 'ref'}; saveDraft(); renderTriage(); });
  $v.querySelectorAll('[data-sg="dismiss"]').forEach(b => b.onclick = () => { DRAFT.seen = {...(DRAFT.seen || {}), [b.dataset.k]: 1}; saveDraft(); renderTriage(); });
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
  const gf = {}; Object.keys(DRAFT.gf || {}).sort().forEach(f => { gf[f] = DRAFT.gf[f]; });
  const flag = {}; Object.keys(DRAFT.flag || {}).sort().forEach(f => { flag[f] = DRAFT.flag[f]; });
  const use = {}; Object.keys(DRAFT.use || {}).sort().forEach(f => { use[f] = DRAFT.use[f]; });
  const seen = {}; Object.keys(DRAFT.seen || {}).sort().forEach(k => { seen[k] = DRAFT.seen[k]; });
  return {v: 1, ...(bookOn(DRAFT) ? {} : {book: false}), genera, ...(Object.keys(quality).length ? {quality} : {}), ...(Object.keys(gf).length ? {gf} : {}), ...(Object.keys(form).length ? {form} : {}), ...(Object.keys(exclude).length ? {exclude} : {}), ...(Object.keys(flag).length ? {flag} : {}), ...(Object.keys(use).length ? {use} : {}), ...(Object.keys(seen).length ? {seen} : {})}; };
async function save(){
  const ch = changed(), q = qChanged(), x = xChanged(), bk = bChanged(), fm = fChanged(), fl = flChanged(), sg = sgChanged(); if (!(ch.length || q || x || bk || fm || fl || sg) || !TOKEN) return;
  const b = $('save'); b.disabled = true; b.textContent = 'Publishing…';
  try {
    const out = output(), text = JSON.stringify(out, null, 2) + '\n';
    const msg = `Photo curation: ${[...ch.slice(0, 6), ...(q ? ['quality ratings'] : []), ...(fm ? ['growth forms'] : []), ...(x ? ['exclusions'] : []), ...(fl ? ['triage flags'] : []), ...(sg ? ['triage suggestions'] : []), ...(bk ? [`Coral Finder book photos ${bookOn(DRAFT) ? 'on' : 'off'}`] : [])].join(', ')}${ch.length > 6 ? ` and ${ch.length - 6} more genera` : ''}`;
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
  try { [DATA, AUTOQ, AUTOF, FU0, PICKS, SUG] = await Promise.all([fetch('data.json', {cache: 'no-cache'}).then(r => r.json()), side('quality.json', 'q'), side('forms.json', 'gf'), side('forms.json', 'gunsure'), side('picks.json', 'feat'), fetch('suggest.json', {cache: 'no-cache'}).then(r => r.ok ? r.json() : {}).catch(() => ({})), loadSaved()]); }
  catch (x) { $v.innerHTML = `<p class="warn">Could not load: ${esc(x.message)}</p>`; return; }
  FUNSURE = new Set(Array.isArray(FU0) ? FU0 : []);
  [FDEF, LEGACY] = await Promise.all([side('forms.json', 'forms'), side('forms.json', 'form')]); if (!Array.isArray(FDEF)) FDEF = [];
  // Every photo of data.json by name, with its genus, for the Excluded view.
  PHOTOS = {}; Object.entries(DATA.gen).forEach(([n, g]) => [...Object.values(g.views || {}), ...Object.values(g.more || {}), (DATA.course || {})[n] || [], (DATA.cand || {})[n] || [], g.book || []].flat().forEach(p => { PHOTOS[p.f] = {...p, genus: n}; }));
  // Every photo name in data.json (field, extra, lecture, candidates), to spot choices left pointing nowhere.
  KNOWN = new Set([...Object.values(DATA.gen).flatMap(g => [...Object.values(g.views || {}), ...Object.values(g.more || {}), g.book || []].flat()), ...Object.values(DATA.course || {}).flat(), ...Object.values(DATA.cand || {}).flat(), ...(DATA.cmp || [])].map(p => p.f));
  // Unsaved edits from an earlier visit are kept, on top of what is saved.
  const old = store.get('imr-curation-draft', null);
  DRAFT = old && old.genera ? old : clone(SAVED); snap = JSON.stringify(DRAFT);
  // Pierre's clicks in the old Coral Finder letters (curation.json "form") stay as they are, shown as the hint.
  Object.assign(LEGACY, SAVED.form || {}, DRAFT.form || {});
  const nf = importFlags(); if (nf) setTimeout(() => toast(`${nf} new photo${nf > 1 ? 's' : ''} flagged on the site: see Triage.`), 50);
  addEventListener('storage', e => { if (e.key === 'imr-photo-flags' && e.newValue && importFlags()) render(); });
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
  // Every click is kept in this browser's draft, so leaving or reloading loses nothing: warn only if that save failed.
  window.onbeforeunload = e => { if (draftLost) { e.preventDefault(); e.returnValue = ''; } };
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

// Photo difficulty from the sync sheet (?stats=1, tools/sync/Code.gs stats_): [difficulty, answers, right] per photo.
const SYNC_URL = 'https://script.google.com/macros/s/AKfycbyt6l9sBeWP4KacPx1SUbsk9-15uJikxRafrpwF6b2oAE8GgrnPOtuJg7IqfFG5ymrR/exec';
let STATS = null, DIFF_ORDER = store.get('imr-admin-diff', 'hard');
function renderDiff(){
  status();
  if (!STATS) { $v.innerHTML = '<p class="note">Loading…</p>'; fetch(SYNC_URL + '?stats=1').then(r => r.json()).then(j => { STATS = j && j.ok ? j.photos || {} : {}; if (cur === '~diff') renderDiff(); }).catch(() => { STATS = {}; if (cur === '~diff') renderDiff(); }); return; }
  const vl = v => v === 'cand' ? 'Candidate' : VIEWS.find(x => x[0] === v)[1];
  const L = allPhotos().filter(p => STATS[p.f]).sort((a, b) => (DIFF_ORDER === 'hard' ? -1 : 1) * (STATS[a.f][0] - STATS[b.f][0]));
  const card = p => { const [d, n, r] = STATS[p.f];
    return `<figure class="adm-tile adm-qt" data-f="${esc(p.f)}" data-g="${esc(p.genus)}" data-q="${qOf(p.f)}" tabindex="0">
    <button type="button" class="adm-ph" data-act="zoom" aria-label="Enlarge"><img src="${img(p, 1)}" alt="" loading="lazy" draggable="false"></button>
    <figcaption><a class="adm-gen" href="#${esc(p.genus)}"><i>${esc(p.genus)}</i></a><span class="adm-src view">${vl(p.view)}</span>${qTag(p)}<span class="adm-src" title="Difficulty">${d > 0 ? '+' : ''}${d.toFixed(1)} · ${r}/${n}</span></figcaption>
    <div class="adm-acts">${qSeg(p)}</div></figure>`; };
  $v.innerHTML = `<section class="adm-quality"><div class="adm-qhead"><h2>Photo difficulty</h2></div>
    <div class="adm-filter"><button type="button" class="adm-fchip plain" data-do="hard" aria-pressed="${DIFF_ORDER === 'hard'}">Hardest</button><button type="button" class="adm-fchip plain" data-do="easy" aria-pressed="${DIFF_ORDER === 'easy'}">Easiest</button></div>
    ${L.length ? `<div class="adm-grid adm-qgrid">${L.map(card).join('')}</div>` : '<p class="note">No answers yet.</p>'}</section>`;
  $v.querySelectorAll('[data-do]').forEach(b => b.onclick = () => { DIFF_ORDER = b.dataset.do; store.set('imr-admin-diff', DIFF_ORDER); renderDiff(); });
  $v.querySelectorAll('[data-act="zoom"]').forEach(b => b.onclick = () => { const t = b.closest('[data-f]'); zoom(t.dataset.g, t.dataset.f); });
  bindQ();
}
