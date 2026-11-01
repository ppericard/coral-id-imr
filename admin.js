// IMR Coral ID: photo curation back-office (admin.html, not linked from the app).
// Edits curation.json: per genus, the cover photo, the featured photos of each view (in order),
// hidden photos and photos moved to another view. app.js applies it on top of data.json (applyCuration).
// Saving commits curation.json to the repo through the GitHub API with a fine-grained token. The token is
// kept in this browser only, encrypted with the admin password (the password alone protects nothing else:
// the page is public code, the token is what allows writing).
const REPO = 'ppericard/coral-id-imr', BRANCH = 'main', FILE = 'curation.json', API = `https://api.github.com/repos/${REPO}`;
const VIEWS = [['wide', 'Colony'], ['medium', 'Closer'], ['macro', 'Corallites']], FEAT = 3, SHEET = 6;
const $v = document.getElementById('view'), $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const store = {
  get(k, d){ try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v){ try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
};
// Candidates not downloaded yet (r: 1) show straight from iNaturalist; tools/fetch_approved.py downloads the ones added.
// A recropped photo keeps its file name: its URL carries the crop (cr) and rewrite count (iv) so no cache serves the old file.
const ver = p => p.cr || p.iv ? `?c=${(p.cr || []).join('_')}${p.iv ? '.' + p.iv : ''}` : '';
const img = (p, s) => p.r && p.src ? p.src.replace('/original.', s ? '/medium.' : '/large.') : `img/${p.f}${s ? '-s' : ''}.webp${ver(p)}`;
const clone = o => JSON.parse(JSON.stringify(o));
const same = (a, b) => JSON.stringify(a || null) === JSON.stringify(b || null);
// The draft is never published as a whole copy: it is merged, key by key, onto the latest published curation.
// merge3(base, mine, theirs): base = the published curation this draft started from; a key I changed since base
// keeps my value, every other key takes the published one (so choices published from another browser or device
// are never lost). Objects merge key by key; lists and plain values are single choices. Same choice on both sides = conflict, mine wins.
const isObj = o => o && typeof o === 'object' && !Array.isArray(o), eq = (a, b) => JSON.stringify(a === undefined ? null : a) === JSON.stringify(b === undefined ? null : b);
function merge3(base, mine, theirs){
  const b = isObj(base) ? base : {}, m = isObj(mine) ? mine : {}, t = isObj(theirs) ? theirs : {}, out = {};
  new Set([...Object.keys(b), ...Object.keys(m), ...Object.keys(t)]).forEach(k => {
    const v = eq(m[k], b[k]) ? t[k] : eq(t[k], b[k]) ? m[k] : isObj(m[k]) && isObj(t[k]) ? merge3(b[k], m[k], t[k]) : m[k];
    if (v !== undefined && !(isObj(v) && !Object.keys(v).length && k !== 'genera')) out[k] = v; });
  return out;
}
// An old draft saved before drafts kept their base: add what it has on top of the published curation, never remove.
function mergeOld(mine, theirs){
  const m = isObj(mine) ? mine : {}, t = isObj(theirs) ? theirs : {}, out = {...t};
  Object.keys(m).forEach(k => { out[k] = isObj(m[k]) && isObj(t[k]) ? mergeOld(m[k], t[k]) : m[k] === undefined ? t[k] : m[k]; });
  return out;
}
// Re-base the draft (and every Undo/Redo step) onto a newer published curation.
function rebase(next){
  const base = SAVED, f = d => merge3(base, d, next);
  DRAFT = f(DRAFT); DRAFT.genera = DRAFT.genera || {};
  HIST = HIST.map(x => JSON.stringify(f(JSON.parse(x)))); FUT = FUT.map(x => JSON.stringify(f(JSON.parse(x))));
  SAVED = clone(next); SAVED.genera = SAVED.genera || {}; snap = JSON.stringify(DRAFT); memoReset();
  store.set('imr-curation-draft', DRAFT); store.set('imr-curation-base', SAVED);
}

let SHOWN_COVER = null, SUG = {}, DUPS = [], FU0, PICKS = {}, PHOTOS = {}, KNOWN = new Set(), DATA, SAVED = {v: 1, genera: {}}, SHA = null, DRAFT, TOKEN = null, cur = null, AUTOQ = {}, AUTOF = {}, lastGenus = null;
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
function saveDraft(){ memoReset(); if (snap !== null) HIST.push(snap); if (HIST.length > 300) HIST.shift(); FUT = []; snap = JSON.stringify(DRAFT); draftLost = !store.set('imr-curation-draft', DRAFT); draftAt = new Date(); }
let draftLost = false;
function step(from, to, msg){
  if (!from.length) return toast(msg[0]);
  to.push(snap); snap = from.pop(); DRAFT = JSON.parse(snap); memoReset(); store.set('imr-curation-draft', DRAFT); draftAt = new Date(); render(); toast(msg[1]);
}
const undo = () => step(HIST, FUT, ['Nothing to undo.', 'Undone.']), redo = () => step(FUT, HIST, ['Nothing to redo.', 'Redone.']);
const qChanged = () => !same(DRAFT.quality || {}, SAVED.quality || {});
// "Bad photo" flags Pierre raised on the site (flag.js, localStorage 'imr-photo-flags'): curation.json "flag"
// {f: {genus, view, where, at}}. Triage lists them; "Done" removes one (one at a time, never in bulk).
const flChanged = () => !same(DRAFT.flag || {}, SAVED.flag || {});
// Suggestions from the outside judging agent (suggest.json, tools/judging_import.py): Triage lists them one at a time.
// Accept runs the normal action (move, Not this genus, exclude, hide, add); "Several corals" keeps the photo off games
// (curation.json "use" {f: 'ref'}); Dismiss is remembered in curation.json "seen" {kind:f: 1} so it never comes back.
const seenOf = (o, cand) => Object.fromEntries(Object.entries(o.seen || {}).filter(([k]) => k.startsWith('cand:') === cand));
const sgChanged = () => !same(seenOf(DRAFT, false), seenOf(SAVED, false)) || !same(DRAFT.use || {}, SAVED.use || {});
// Candidates rejected in the Candidates view: curation.json "seen" {'cand:f': 1}. Only a "reviewed" mark: the photo stays a candidate.
const cdChanged = () => !same(seenOf(DRAFT, true), seenOf(SAVED, true));
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
const mtChanged = () => !same(DRAFT.mont || {}, SAVED.mont || {});
// Crops (curation.json "crop" {f: [left, top, right, bottom]} as fractions of the photo): set in the Candidates view;
// tools/fetch_approved.py applies them when it downloads the photo (and redoes it if the crop changes).
const crOf = f => (DRAFT.crop || {})[f], crChanged = () => !same(DRAFT.crop || {}, SAVED.crop || {});
const snChanged = () => !same(DRAFT.single || {}, SAVED.single || {});
const crStyle = f => { const c = crOf(f); return c ? ` style="object-view-box:inset(${+(c[1] * 100).toFixed(1)}% ${+((1 - c[2]) * 100).toFixed(1)}% ${+((1 - c[3]) * 100).toFixed(1)}% ${+(c[0] * 100).toFixed(1)}%)"` : ''; };
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
// own/photos/cands of one genus each walk every genus, and the Candidates queue and Coverage need them for every genus:
// computed once per draft state (cleared by every edit, undo/redo and render), callers get a copy of the list.
let MEMO = {};
const memoReset = () => { MEMO = {}; };
const memo = (k, fn) => n => { const key = k + '|' + n; if (!(key in MEMO)) MEMO[key] = fn(n); return MEMO[key].slice(); };
// "Several corals" photos (data.json more / course multi) Pierre marked as one coral (curation.json single {f: 1}) become normal photos.
const one = f => !!(DRAFT.single || {})[f];
// Photos data.json gives the genus (plus approved candidates), before any "Not this genus".
const own = memo('own', n => {
  const g = DATA.gen[n], two = g.levels === 2, L = [];
  VIEWS.forEach(([v]) => { (g.views[v] || []).forEach(p => L.push({...p, base: v})); ((g.more || {})[v] || []).forEach(p => L.push(one(p.f) ? {...p, base: v, wasMulti: true} : {...p, base: v, multi: true, extra: true})); });
  (DATA.course[n] || []).forEach(p => L.push({...p, base: p.v === 'medium' && two ? 'macro' : p.v, ...(p.multi && one(p.f) ? {multi: false, wasMulti: true} : {})}));
  for (let i = L.length - 1; i >= 0; i--) if (excl(L[i].f)) L.splice(i, 1);
  // Candidates Pierre approved (curation add: {f: view}) join their view as normal photos (app.js applyCuration).
  const add = entry(n).add || {};
  cands(n).filter(p => add[p.f]).forEach(p => L.push({...p, base: add[p.f], cand: true}));
  return L;
});
// "Not this genus" (curation out: {f: 'cmp' | other genus}): the photo leaves the genus; given to another genus,
// it joins that genus in the same view (tagged with where it came from); 'cmp' keeps it for the Look-alikes section.
const outs = n => entry(n).out || {};
const photos = memo('photos', n => {
  const L = own(n).filter(p => !outs(n)[p.f]);
  Object.keys(DATA.gen).filter(m => m !== n).forEach(m => own(m).filter(p => outs(m)[p.f] === n).forEach(p => L.push({...p, from: m})));
  return L;
});
const outOf = n => [...own(n).filter(p => outs(n)[p.f]), ...rawCands(n).filter(p => outs(n)[p.f] && !(entry(n).add || {})[p.f])];
// New candidate photos from data.json cand, not used by the site until approved here.
// Coral Finder book photos (data: gen[].book) are candidates too; once added they show on the site but never in games.
const rawCands = n => [...((DATA.cand || {})[n] || []), ...(DATA.gen[n].book || [])].filter(p => !excl(p.f));
// A candidate sent to another genus ("Not this") becomes a candidate there, tagged with where it came from.
const cands = memo('cands', n => [...rawCands(n).filter(p => !outs(n)[p.f]), ...Object.keys(DATA.gen).filter(m => m !== n).flatMap(m => rawCands(m).filter(p => outs(m)[p.f] === n).map(p => ({...p, from: m})))]);
// Same order as the Show source chips (ORIGINS), CF book last.
const oIdx = p => ORIGINS.findIndex(o => o[0] === origin(p));
const pending = n => { const add = entry(n).add || {}; return cands(n).filter(p => !add[p.f]).sort((a, b) => oIdx(a) - oIdx(b)); };
// Candidates section (Pierre: one "Remove" everywhere sends a photo back there): new candidates plus removed (hidden) photos.
const unused = n => [...pending(n), ...photos(n).filter(p => hidden(n, p)).map(p => ({...p, wasHidden: true}))].sort((a, b) => oIdx(a) - oIdx(b));
const entry = n => DRAFT.genera[n] || {};
// Zoom levels (curation lv, header switch): 2 levels = Closer photos join Colony (as applyCuration in app.js).
const lv = n => entry(n).lv || (DATA.gen[n].levels === 2 ? 2 : 3);
const viewOf = (n, p) => { const v = (entry(n).move || {})[p.f] || p.base; return v === 'medium' && lv(n) === 2 && DATA.gen[n].levels !== 2 ? 'wide' : v; };
const hidden = (n, p) => (entry(n).hide || []).includes(p.f);
// Photos kept out of the featured / genus-sheet slots: extra photos and Coral Finder book photos (the site keeps
// added book photos apart from the views: Coral Finder only, never the sheet, cover or games; app.js applySlots).
const offSlot = p => !!(p.extra || p.cf);
// Same order as applySlots in app.js: IMR photos, then Pierre's, then other observers, each by quality,
// Poor photos and multi-coral photos last, then book photos.
function autoOrder(L){
  const byQ = x => x.slice().sort((a, b) => qOf(b.f) - qOf(a.f));
  const main = L.filter(p => !offSlot(p)), out = [...byQ(main.filter(p => p.imr)), ...byQ(main.filter(p => !p.imr && p.own)), ...byQ(main.filter(p => !p.imr && !p.own))];
  const ok = out.filter(p => !p.multi);
  return [...ok.filter(p => qOf(p.f) > 1), ...ok.filter(p => qOf(p.f) === 1), ...out.filter(p => p.multi), ...byQ(L.filter(offSlot))];
}
// k photos from L in order, a different observation each time when possible (as take() in app.js).
const takeObs = (L, k) => { const out = [], seen = new Set(); [true, false].forEach(fresh => L.forEach(p => { if (out.length < k && !out.includes(p) && (!fresh || !seen.has(p.o || p.f))) { out.push(p); seen.add(p.o || p.f); } })); return out; };
function rowOf(n, v){
  const live = photos(n).filter(p => viewOf(n, p) === v && !hidden(n, p)), order = autoOrder(live);
  const pin = (entry(n).feat || {})[v];
  // No pick of yours: Claude's suggestion (picks.json) first, then the automatic order, as on the site.
  const sug = ((PICKS[n] || {})[v] || []).map(f => live.find(p => p.f === f && !p.multi && !offSlot(p))).filter(Boolean);
  // Featured = always the first FEAT photos (Pierre): his pinned ones in his order, the rest filled automatically,
  // never with a Poor photo while better ones exist, except IMR lecture photos (as on the site).
  // Coral Finder book photos (Pierre 2026-11-01): on the sheet when pinned, or to fill a gap after every field photo; never in games.
  const pinned = (pin || []).map(f => live.find(p => p.f === f)).filter(Boolean).slice(0, FEAT);
  const cand = [...sug, ...order.filter(p => !p.multi && !offSlot(p))].filter(p => !pinned.includes(p)), k = FEAT - pinned.length;
  const good = takeObs(cand.filter(p => p.imr || qOf(p.f) !== 1), k), field = [...good, ...takeObs(cand.filter(p => !good.includes(p)), k - good.length)];
  const feat = [...pinned, ...field, ...order.filter(p => p.cf && !pinned.includes(p)).slice(0, k - field.length)];
  return {feat, pinned: pinned.map(p => p.f), auto: !pinned.length, rest: order.filter(p => !feat.includes(p)), hid: photos(n).filter(p => viewOf(n, p) === v && hidden(n, p))};
}
function coverOf(n){
  const g = DATA.gen[n], all = photos(n).filter(p => !hidden(n, p)), k = entry(n);
  // Same fallbacks as cover() in app.js: your pick, the first IMR featured Closer photo, data.json's pick, the first closer field photo (featured first).
  const F = (k.feat || {}).medium || [], med = all.filter(x => viewOf(n, x) === 'medium' && !x.imr && !offSlot(x));
  const ri = rowOf(n, 'medium').feat.find(x => x.imr);
  const p = (k.cover && all.find(x => x.f === k.cover)) || ri || all.find(x => x.f === g.cover && !offSlot(x)) || med.find(x => F.includes(x.f)) || med[0] || all.find(x => !x.imr && !offSlot(x));
  return p && {...p, view: viewOf(n, p), picked: !!k.cover};
}
// Status (Pierre): ✓ only when the genus has everything the site needs AND he validated it (curation ok: true).
// Needs: 3 featured photos per view, a cover that is not a close-up (3 levels), no broken choice.
// A non-IMR Poor photo among the featured is only a warning (Pierre: he may have no better example).
const poorIn = n => rows(n).filter(([v]) => rowOf(n, v).feat.some(p => !p.imr && qOf(p.f) === 1)).map(([v]) => `${label(n, v)}: Poor`);
function needs(n){
  const out = [], c = coverOf(n);
  rows(n).forEach(([v]) => { const f = rowOf(n, v).feat; if (f.length < FEAT) out.push(`${label(n, v)} ${f.length}/${FEAT}`); });
  if (!c) out.push('No cover'); else if (c.view === 'macro' && lv(n) !== 2) out.push('Macro cover');
  if (missing(n).length) out.push('⚠ check');
  return out;
}
const rows = n => VIEWS.filter(([v]) => !(lv(n) === 2 && v === 'medium' && !photos(n).some(p => viewOf(n, p) === 'medium')));
const label = (n, v) => lv(n) === 2 && v === 'macro' ? 'Close-up' : VIEWS.find(x => x[0] === v)[1];
// Photo origin: IMR lecture, Pierre's own iNaturalist photos, or other iNaturalist observers split by place
// (data.json p.loc: dauin, ph or world). The filter is kept across genera and visits.
// Short chip labels for the genus bar (full name in the tooltip), so the whole bar fits on one line.
const SHORT_O = {imr: 'IMR', own: 'Pierre', dauin: 'Dauin', ph: 'PH', world: 'World', book: 'CF'};
const ORIGINS = [['imr', 'IMR lecture'], ['own', 'Pierre'], ['dauin', 'iNat Dauin'], ['ph', 'iNat Philippines'], ['world', 'iNat elsewhere'], ['book', 'CF book']];
const origin = p => p.cf ? 'book' : p.imr ? 'imr' : p.own ? 'own' : ({dauin: 'dauin', ph: 'ph'})[p.loc] || 'world';
let SHOW = new Set(store.get('imr-admin-origins', ORIGINS.map(o => o[0])));
const shown = p => SHOW.has(origin(p));
const srcTag = p => { const o = origin(p); return `<span class="adm-src o-${o}">${ORIGINS.find(x => x[0] === o)[1]}</span>`; };

/* ---------- Edits ---------- */
function edit(n, fn){
  memoReset(); const k = clone(entry(n)); fn(k);
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
  addc: (n, f, v, to) => edit(n, k => { if ((k.hide || []).includes(f)) { const p = photos(n).find(x => x.f === f); k.hide = k.hide.filter(x => x !== f); k.move = k.move || {}; if (to === p.base) delete k.move[f]; else k.move[f] = to; return; } k.add = k.add || {}; k.add[f] = to; }),
  multi: (n, f) => { const S = {...(DRAFT.single || {})}; if (S[f]) delete S[f]; else S[f] = 1; DRAFT.single = S; if (!Object.keys(S).length) delete DRAFT.single; saveDraft(); render(); },
  exclude: (n, f) => { DRAFT.exclude = DRAFT.exclude || {}; DRAFT.exclude[f] = 'excluded';
    edit(n, k => { dropFeat(k, f); if (k.cover === f) delete k.cover; if (k.add) delete k.add[f]; });
    toast('Excluded. Undo (Ctrl+Z) or the Excluded view brings it back.'); },
  out: (n, f, v, to) => edit(n, k => { k.out = k.out || {}; if (to === 'back') delete k.out[f]; else { k.out[f] = to; dropFeat(k, f); if (k.cover === f) delete k.cover; if (k.move) delete k.move[f]; if (k.add) delete k.add[f]; } }),
  hide: (n, f) => edit(n, k => { if (k.add && k.add[f]) { delete k.add[f]; dropFeat(k, f); if (k.cover === f) delete k.cover; return; } k.hide = k.hide || []; if (k.hide.includes(f)) k.hide = k.hide.filter(x => x !== f); else { k.hide.push(f); dropFeat(k, f); if (k.cover === f) delete k.cover; } }),
  move: (n, f, v, to) => edit(n, k => { const p = photos(n).find(x => x.f === f); if (p.cand) { k.add[f] = to; dropFeat(k, f); return; } k.move = k.move || {}; if (to === p.base) delete k.move[f]; else k.move[f] = to; dropFeat(k, f); }),
  // Drag and drop: photo f dropped in view `to`, at featured position `at` (null: not featured).
  // Covers moving between views, approving a candidate, featuring, reordering and unfeaturing in one step.
  drop: (n, f, to, at) => edit(n, k => {
    if ((k.hide || []).includes(f)) k.hide = k.hide.filter(x => x !== f);   // a removed photo dragged back from the candidates
    const p = [...photos(n), ...pending(n)].find(x => x.f === f), was = viewOf(n, p) === to && !pending(n).includes(p);
    const r = rowOf(n, to), cur = r.feat.map(x => x.f), inFeat = was && cur.includes(f), L = cur.filter(x => x !== f);
    if (p.cand || pending(n).includes(p)) { k.add = k.add || {}; k.add[f] = to; }
    else if (!was) { k.move = k.move || {}; if (to === p.base) delete k.move[f]; else k.move[f] = to; }
    dropFeat(k, f);
    // Dropped after the last of 3 featured photos: it takes the last place (it used to fall off the end).
    if (at !== null) { L.splice(Math.min(at, L.length, FEAT - 1), 0, f); k.feat = k.feat || {}; k.feat[to] = L.slice(0, FEAT); }
    // Dragged out of the first places: the next photo moves up, and the set is pinned so it can't come straight back.
    else if (inFeat) { const nx = r.rest.find(x => x.f !== f && !x.multi && !offSlot(x) && (x.imr || qOf(x.f) !== 1)) || r.rest.find(x => x.f !== f && !x.multi && !offSlot(x));
      if (nx) L.push(nx.f); k.feat = k.feat || {}; if (L.length) k.feat[to] = L; else delete k.feat[to]; }
  }),

};

/* ---------- Rendering ---------- */
const notThis = n => `<select data-act="out" aria-label="Not this genus"><option value="">Not this</option><option value="cmp">Look-alike comparison</option><optgroup label="Another genus">${Object.keys(DATA.gen).filter(m => m !== n).map(m => `<option>${esc(m)}</option>`).join('')}</optgroup></select>`;
const changed = () => [...new Set([...Object.keys(DRAFT.genera), ...Object.keys(SAVED.genera)])].filter(n => !same(DRAFT.genera[n], SAVED.genera[n]));
const tile0 = (...a) => tile(...a);
function tile(n, p, v, st){
  // The cover shown in the header (his pick, else the automatic one) is marked on its photo either way.
  const k = entry(n), isCover = (k.cover || SHOWN_COVER) === p.f, two = lv(n) === 2;
  // View buttons: the current view is pressed; one click on another moves the photo there.
  const moves = VIEWS.filter(([w]) => w === v || !(two && w === 'medium')).map(([w]) => `<button type="button" data-act="move" data-to="${w}" aria-pressed="${w === v}">${label(n, w)}</button>`).join('');
  return `<figure class="adm-tile ${st.cls || ''}${isCover ? ' is-cover' : ''}" data-f="${esc(p.f)}" data-v="${v}"${st.cls === 'is-hidden' ? '' : ` data-drag${st.num ? ` data-pos="${st.num - 1}"` : ''}`}>
    <button type="button" class="adm-ph" data-act="zoom" aria-label="Enlarge"><img src="${img(p, 1)}" alt="" loading="lazy" draggable="false"${crStyle(p.f)}></button>${st.cls === 'is-hidden' ? XBTN : GRIP + XBTN}
    ${st.num ? `<span class="adm-num${st.sheet ? ' sheet' : ''}"${st.sheet ? ' title="Genus sheet"' : ''}>${st.num}</span>` : ''}
    ${isCover ? '<span class="adm-covermark">Cover</span>' : ''}
    <figcaption>${p.from ? `<span class="adm-src new" title="From ${esc(p.from)}">from ${esc(p.from)}</span>` : ''}${p.cand ? '<span class="adm-src new" title="Candidate you added">new</span>' : ''}${srcTag(p)}${p.multi || p.wasMulti ? `<button type="button" class="adm-src multi${p.wasMulti ? ' off' : ''}" data-act="multi" title="Several corals" aria-pressed="${!p.wasMulti}">${p.wasMulti ? 'one coral' : 'several corals'}</button>` : ''}<span class="adm-t">${esc(p.imr ? 'slide ' + p.slide : p.t || '')}</span></figcaption>
    <div class="adm-acts">${qSeg(p)}${fSeg(p)}
      ${st.cls === 'is-hidden' ? `<button type="button" data-act="hide" class="on">Show again</button>` : `
      <span class="adm-qseg adm-vseg" role="group" aria-label="View">${moves}</span>
      <button type="button" data-act="cover" class="${isCover ? 'on' : ''}" title="Cover">★ Cover</button>
      <button type="button" data-act="hide" title="Remove">Remove</button>
      ${p.src ? `<button type="button" data-act="crop" class="${crOf(p.f) ? 'on' : ''}" aria-pressed="${!!crOf(p.f)}">Crop</button>` : ''}
      ${p.from ? '' : notThis(n)}`}${st.extra || ''}
    </div></figure>`;
}
// Small × on each photo: exclude it for good (a person, a drawing, AI…).
const XBTN = '<button type="button" class="adm-x" data-act="exclude" title="Exclude" aria-label="Exclude for good">×</button>';
function status(){
  const ch = changed(), q = qChanged(), x = xChanged(), parts = [ch.length ? `${ch.length} ${ch.length > 1 ? 'genera' : 'genus'}` : '', q ? 'quality ratings' : '', fChanged() ? 'growth forms' : '', x ? 'exclusions' : '', bChanged() ? 'book photos switch' : '', flChanged() ? 'triage flags' : '', sgChanged() ? 'triage suggestions' : '', cdChanged() ? 'candidate reviews' : '', mtChanged() ? 'look-alike montages' : '', crChanged() ? 'crops' : '', snChanged() ? 'several corals' : ''].filter(Boolean);
  const bs = $('booksw'); if (bs) { bs.setAttribute('aria-pressed', String(bookOn(DRAFT))); bs.textContent = `CF book: ${bookOn(DRAFT) ? 'on' : 'off'}`; }
  const tn = Object.keys(DRAFT.flag || {}).length + sugCount(), ta = document.querySelector('[data-mode="triage"]'); if (ta) ta.textContent = `Triage${tn ? ` (${tn})` : ''}`;
  const xn = Object.keys(DRAFT.exclude || {}).length, xa = document.querySelector('[data-mode="excluded"]'); if (xa) xa.textContent = `Excluded${xn ? ` (${xn})` : ''}`;
  const t = draftAt ? ` (saved ${draftAt.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})})` : '';
  // Publish carries the status (no separate status text): "● Publish" with a draft, "Published" when clean.
  const sv = $('save'); if (sv.textContent !== 'Publishing…') sv.textContent = !TOKEN ? 'Read-only' : parts.length ? '● Publish' : 'Published';
  sv.title = parts.length ? `Draft${t}: ${parts.join(' + ')}` : 'Publish';
  $('undo').disabled = !HIST.length; $('redo').disabled = !FUT.length;
  $('save').disabled = !TOKEN || !parts.length;
  if (cur[0] !== '~') lastGenus = cur;
  $('modes').hidden = false; $v.ownerDocument.querySelector('[data-mode="genus"]').href = '#' + encodeURIComponent(lastGenus || Object.keys(DATA.gen)[0]);
  document.querySelectorAll('[data-mode]').forEach(a => a.setAttribute('aria-current', String(a.dataset.mode === modeKey())));
  const ms = $('modesel'); if (ms) { ms.innerHTML = [...document.querySelectorAll('#modes [data-mode]')].map(a => `<option value="${esc(a.getAttribute('href'))}"${a.getAttribute('aria-current') === 'true' ? ' selected' : ''}>${esc(a.textContent)}</option>`).join(''); ms.hidden = false; }
}
// Which header tab the page belongs to: the Stats tab holds players, photos, the photo list and coverage.
const modeKey = () => cur.startsWith('~stats') || cur === '~diff' || cur === '~cov' || cur === '~fcov' ? 'stats' : ({'~quality': 'quality', '~form': 'form', '~excluded': 'excluded', '~triage': 'triage', '~look': 'mont', '~mont': 'mont', '~cand': 'cand'})[cur] || 'genus';
function render(){
  memoReset();
  document.body.classList.toggle('adm-cmode', cur === '~cand');
  if (cur === '~quality') return renderQuality();
  if (cur === '~form') return renderForm();
  if (cur === '~excluded') return renderExcluded();
  if (cur === '~triage') return renderTriage();
  // Every Stats sub-view keeps the Stats sub-menu on top, whichever function draws it (Pierre, 2026-11-01).
  if (modeKey() === 'stats') { if (cur === '~diff') renderDiff(); else if (cur === '~cov') renderCov(); else if (cur === '~fcov') renderFcov(); else renderStats(); return withSwitch(); }
  if (cur === '~look' || cur === '~mont') return renderMont(); // ~mont = old address, kept for bookmarks
  if (cur === '~cand') return renderCand();
  const names = Object.keys(DATA.gen); if (!DATA.gen[cur]) cur = names[0];
  const ch = changed(), n = cur, g = DATA.gen[n], cv = coverOf(n), k = entry(n); SHOWN_COVER = cv && cv.f;
  status();
  $('preview').href = `./?draft#g-${encodeURIComponent(n)}`;
  const side = names.map(m => { const c = coverOf(m), e = DRAFT.genera[m] || {}, dirty = ch.includes(m), h = (e.hide || []).length;
    return `<a href="#${esc(m)}" class="adm-g${m === n ? ' cur' : ''}"${m === n ? ' aria-current="true"' : ''}>${c ? `<img src="${img(c, 1)}" alt="" loading="lazy">` : '<span class="none"></span>'}<span><i>${esc(m)}</i>
      <small>${DATA.gen[m].n ? 'No. ' + DATA.gen[m].n : DATA.gen[m].x ? 'not IMR' : '★'}${c && c.view === 'macro' && lv(m) !== 2 ? ' · <b class="warnc" title="Cover is a close-up">macro cover</b>' : ''}${pending(m).length ? ` · ${pending(m).length} new` : ''}${missing(m).length ? ' · <b class="warnc" title="Missing photos">⚠ check</b>' : ''}</small></span><span class="dots">${e.ok ? (needs(m).length ? '<b class="dot warn" title="Validated, incomplete">!</b>' : '<b class="dot done" title="Validated">✓</b>') : ''}${dirty ? '<b class="dot" title="Draft not published yet">●</b>' : ''}</span></a>`; }).join('');
  const body = rows(n).map(([v]) => { const r = rowOf(n, v), out = [...r.feat, ...r.rest].filter(p => !shown(p)).length;
    return `<section class="adm-row"><h3>${label(n, v)} <small>${r.feat.length + r.rest.length} photo${r.feat.length + r.rest.length === 1 ? '' : 's'}${out ? ` · <b>${out} filtered out</b>` : ''}</small></h3>
      <div class="adm-grid" data-drop="${v}">${r.feat.map((p, i) => shown(p) ? tile(n, p, v, {num: i + 1, auto: !r.pinned.includes(p.f), last: i === r.feat.length - 1, cls: 'is-feat'}) : '').join('')}${(sh => r.rest.filter(shown).map(p => tile(n, p, v, sh.includes(p) ? {num: FEAT + 1 + sh.indexOf(p), sheet: true} : {})).join(''))(r.rest.filter(p => !p.multi && !p.extra).slice(0, SHEET - r.feat.length))}</div>
      ${r.feat.length + r.rest.length ? '' : '<p class="note">No photo in this view.</p>'}</section>`; }).join('');
  const P = unused(n), Ps = P.filter(shown), two = lv(n) === 2;
  const candTile = p => `<figure class="adm-tile is-cand" data-f="${esc(p.f)}" data-drag><button type="button" class="adm-ph" data-act="zoom" aria-label="Enlarge"><img src="${img(p, 1)}" alt="" loading="lazy" draggable="false"${crStyle(p.f)}></button>${GRIP}${XBTN}
    <figcaption>${srcTag(p)}${rejected(p.f) ? '<span class="adm-src rej" title="Rejected">rejected</span>' : ''}<span class="adm-t">${esc(p.t || '')}</span></figcaption>
    <div class="adm-acts">${qSeg(p)}${fSeg(p)}<span class="adm-qseg adm-vseg" role="group" aria-label="View">${VIEWS.filter(([w]) => !(two && w === 'medium')).map(([w]) => `<button type="button" data-act="addc" data-to="${w}" title="Add to ${label(n, w)}">${label(n, w)}</button>`).join('')}</span>${p.from ? '' : notThis(n)}</div></figure>`;
  // Candidates: set apart from the views and folded by default (Pierre); open or closed is remembered.
  const candRow = P.length ? `<details class="adm-row adm-cands"${store.get('imr-admin-cands', false) ? ' open' : ''}><summary><h3>Candidates <small>${P.length} photo${P.length > 1 ? 's' : ''} not on the site${P.length - Ps.length ? ` · <b>${P.length - Ps.length} filtered out</b>` : ''}</small></h3></summary>
    <div class="adm-grid">${Ps.map(candTile).join('')}</div></details>` : '';
  const O = outOf(n), outRow = O.length ? `<section class="adm-row adm-out"><h3>Not this genus <small>${O.length} photo${O.length > 1 ? 's' : ''} taken out of <i>${esc(n)}</i></small></h3>
    <div class="adm-grid">${O.map(p => `<figure class="adm-tile is-hidden" data-f="${esc(p.f)}"><button type="button" class="adm-ph" data-act="zoom" aria-label="Enlarge"><img src="${img(p, 1)}" alt="" loading="lazy"></button>
      <figcaption>${srcTag(p)}<span class="adm-t">${outs(n)[p.f] === 'cmp' ? 'look-alike comparison' : '→ ' + esc(outs(n)[p.f])}</span></figcaption>
      <div class="adm-acts"><button type="button" data-act="out" data-to="back">Put back</button></div></figure>`).join('')}</div></section>` : '';
  const cnt = o => [...photos(n), ...P].filter(p => origin(p) === o).length;
  const filter = `<div class="adm-filter adm-sticky">${cv ? `<button type="button" class="adm-sthumb${cv.view === 'macro' && lv(n) !== 2 ? ' warnc' : ''}" data-f="${esc(cv.f)}" data-act="zoomcover" title="Cover"><img src="${img(cv, 1)}" alt="${esc(n)} cover"></button>` : ''}<b class="adm-sname"><i>${esc(n)}</i></b><select class="adm-gsel2" aria-label="Genus">${names.map(m => `<option${m === n ? ' selected' : ''}>${esc(m)}</option>`).join('')}</select><a class="adm-sheet" href="./?draft#g-${encodeURIComponent(n)}" target="_blank" rel="noopener" title="Genus sheet" aria-label="Open the sheet">↗</a><span class="adm-qseg adm-lvseg" role="group" aria-label="Zoom levels" title="Zoom levels">${[3, 2].map(x => `<button type="button" data-lv="${x}" aria-pressed="${lv(n) === x}">${x} levels</button>`).join('')}</span>${(nd => `<button type="button" class="adm-okbtn" data-ok aria-pressed="${!!k.ok}" title="Validated">✓ Validated</button>${nd.length ? `<b class="warnc adm-needs">${nd.map(esc).join(' · ')}</b>` : ''}${poorIn(n).length ? `<b class="adm-needs adm-warn">${poorIn(n).map(esc).join(' · ')}</b>` : ''}`)(needs(n))}<span class="adm-shows" role="group" aria-label="Show photos from">${ORIGINS.map(([o, t]) => `<button type="button" class="adm-fchip o-${o}" data-o="${o}" aria-pressed="${SHOW.has(o)}" title="${t}">${SHORT_O[o]} <b>${cnt(o)}</b></button>`).join('')}${SHOW.size < ORIGINS.length ? '<button type="button" class="adm-link" data-o="all">All</button>' : ''}</span></div>`;
  $v.innerHTML = `<div class="adm">
    <nav class="adm-side" aria-label="Genera"><select id="gsel" aria-label="Genus">${names.map(m => `<option${m === n ? ' selected' : ''}>${esc(m)}</option>`).join('')}</select><div class="adm-list">${side}</div></nav>
    <section class="adm-main">
      ${missing(n).length ? `<p class="warn"><b>${missing(n).length} of your choices name a photo that is no longer in the data</b>: ${missing(n).map(f => `<code>${esc(f)}</code>`).join(', ')}. Kept but no longer applied; tell Claude to remap them.</p>` : ''}
      ${filter}${body}${candRow}${outRow}
    </section></div>`;
  $v.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { const o = b.dataset.o;
    if (o === 'all') SHOW = new Set(ORIGINS.map(x => x[0])); else SHOW.has(o) ? SHOW.delete(o) : SHOW.add(o);
    store.set('imr-admin-origins', [...SHOW]); render(); });
  const okb = $v.querySelector('[data-ok]'); if (okb) okb.onclick = () => { const nd = needs(n); if (!k.ok && nd.length) { toast('Not ready: ' + nd.join(' · ')); return; } edit(n, k => { if (k.ok) delete k.ok; else k.ok = true; }); };
  $v.querySelectorAll('[data-lv]').forEach(b => b.onclick = () => { const x = Number(b.dataset.lv); edit(n, k => { if (x === (DATA.gen[n].levels === 2 ? 2 : 3)) delete k.lv; else k.lv = x; }); });
  $('gsel').onchange = e => { location.hash = e.target.value; };
  const g2 = $v.querySelector('.adm-gsel2'); if (g2) g2.onchange = e => { location.hash = e.target.value; };
  const cd = $v.querySelector('.adm-cands'); if (cd) cd.ontoggle = () => store.set('imr-admin-cands', cd.open);
  bindTiles($v, () => n);
  const c = $v.querySelector('.adm-g.cur'); if (c) c.scrollIntoView({block: 'nearest'});
  bindQ(); bindF($v); bindDrag(n);
}
// Actions of the genus photo tiles (genus page, and flagged photos in Triage): g(tile) gives the tile's genus.
function bindTiles(scope, g){
  scope.querySelectorAll('[data-act]').forEach(el => {
    const t = el.closest('[data-f]'), f = t && t.dataset.f, v = t && t.dataset.v, a = el.dataset.act, n = t && g(t);
    if (!t || !DATA.gen[n] || !ACT[a] && !['exclude', 'out', 'addc', 'move', 'zoom', 'zoomcover', 'crop'].includes(a)) return;
    if (a === 'exclude') el.onclick = e => { e.stopPropagation(); ACT.exclude(n, f); };
    else if (a === 'crop') el.onclick = () => { const p = [...photos(n), ...pending(n)].find(x => x.f === f); if (p) cropEditor(p); };
    else if (a === 'out') { if (el.tagName === 'SELECT') el.onchange = () => el.value && ACT.out(n, f, v, el.value); else el.onclick = () => ACT.out(n, f, v, 'back'); }
    else if (a === 'addc') el.onclick = () => ACT.addc(n, f, null, el.dataset.to);
    else if (a === 'move') el.onclick = () => el.dataset.to !== v && ACT.move(n, f, v, el.dataset.to);
    else if (a === 'zoom' || a === 'zoomcover') el.onclick = () => zoom(n, f);
    else el.onclick = () => ACT[a](n, f, v);
  });
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
    <button type="button" class="adm-ph" data-act="zoom" aria-label="Enlarge"><img src="${img(p, 1)}" alt="" loading="lazy" draggable="false"${crStyle(p.f)}></button>${GRIP}${XBTN}
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
  fcov: `<p>What the genus sheets and the Coral Finder can draw from, per genus and view (a sheet shows the first 6 photos of a view, the Coral Finder the 3 featured plus a few iNat and book photos): the 39 IMR genera and the book's other genera seen at Dauin (CF only). Every photo of the view counts (field, IMR lecture and approved Coral Finder book photos), except hidden and multi-coral ones. Big number = photos, small = distinct colonies with a photo that is not Poor; the colour follows those good colonies (as on Game coverage). Forms = growth forms seen on Colony and Closer photos; Species = distinct species named on the photos (hover for the list). Order: Thinnest, Thickest (to prune), A–Z. Click a row to open the genus.</p>`,
  cov: `<p>Game photos per genus and view: what the quiz and the other games can draw from. Field and IMR lecture photos (no Coral Finder book, no multi-coral, hidden or sheet-only photo; Poor photos count, the games use them at the Hard level; Colony leaves out photos where the form is not visible, except for a genus with a single growth form). Big number = photos, small = distinct colonies when fewer. The "excl." line under it counts the photos of that view left out of games and why: multi-coral (several corals in the photo), no form (form not visible), sheet only, CF (Coral Finder book), removed. The colour follows the colonies: dark red none, red 1-2 (thin: RAs may learn the photos instead of the genus), orange 3-4, light green 5-7, green 8 or more. The bar shows where the photos come from (IMR, Pierre, iNat Dauin, Philippines, elsewhere), the + count the candidates waiting. Order: Thinnest (least covered first), Thickest (most photos first, to prune over-covered genera), Lecture. Click a row to open the genus.</p>`,
  stats: `<p>Every quiz and duel answer synced to the sheet. Players are anonymous: a number, ranked by level; "you" marks the name synced in this browser (All / Others / Me). Level is on the same scale as photo difficulty. Last 20 = right answers among the player's last 20. Learned = genera learned on their last sync. Days = days with answers. Photos = different photos answered (more = more variety). Calibration (sheet v5): each answer's expected chance of success from the player's level on the genus and the photos' difficulty, against the actual result; the games aim at about 80%. New photo = answers showing at least one photo the player had never seen. Genera, Level = median player ability on the genus (same scale as photo difficulty).</p>
    <p>Learning curve: right answers by rank of the answer (each player's 1st to 10th answer, 11th to 20th…), all players pooled. Genera: how often the genus shown was named; Given ✗ = times it was answered wrongly for another genus. Mix-ups open the comparison on the site.</p>`,
  statsph: `<p>Photo difficulty (Elo) from every answer: 0 = average photo, +1 = clearly harder. ≥1 / ≥3 / ≥10 keeps photos with at least that many answers; few answers = rough. Click a dot to see the photo.</p>
    <p>The quiz shows the colony, closer and corallite photos together, so they share each answer: view differences only appear as different photos get mixed over many answers.</p>`,
  statsneeds: `<p>Where looking for more photos would help most, per genus and view, ranked by how many reasons add up. Reasons: <b>few colonies</b> (fewer than 3 distinct colonies in the game pool, as on Coverage); <b>few good colonies</b> (fewer than 3 colonies with a photo that is not Poor, so a struggling player has little easy variety); <b>too easy</b> (players' level on the genus is above what the hardest photo of the view can challenge: harder, realistic photos needed, Poor included); <b>repeats</b> (players see the same photos of the view 4 or more times each on average); <b>mix-ups</b> (the genus is often taken for another and its corallites view has fewer than 5 colonies); <b>few multi-zoom</b> (one row per genus, "Several zooms": fewer than 3 colonies photographed at 2 or more zoom levels; a game question only shows views of one colony, so these give the several-view questions beginners need). Levels need answers logged by sheet script v5; repeats and mix-ups work from any answers. Click a reason card to show only its rows (click again for all); the view switch and the genus box narrow the table; click a column header to sort (again to reverse). Click a row to open the genus.</p>`,
  diff: `<p>How hard each photo is for the RAs, learned from every quiz and duel answer in the sync sheet (Elo). 0 = an average photo, +1 = clearly harder, -1 = clearly easier; the count is right answers / answers. Few answers = rough; ≥1 / ≥3 / ≥10 keeps photos with at least that many answers (shared with Photos). The site uses it to weigh answers in "learned" (a right answer on a hard photo counts more). Re-rate a photo's quality here if it sits in the wrong game set.</p>`,
  genus: `<p>Every click is saved at once as a draft in this browser; <b>Publish</b> sends it to the site. <b>Undo</b> / <b>Redo</b> (Ctrl+Z, Ctrl+Shift+Z) step back one click at a time.</p>
    <p>The first 3 photos of each view are its featured photos (Easy level, top of the sheet, Coral Finder). Drag a photo into the first 3 places to put it there, out of them to drop it (the next best moves up); places you haven't set fill automatically. Drag to another view to move a photo, or from the candidates to add it. Hidden photos disappear everywhere, games included; × excludes a photo for good.</p>
    <p>The letters on each photo are its growth form (see Growth form).</p>`,
  form: `<p>The 7 IMR growth forms (Lecture 6, slides 3-10), one per photo, the main form visible: <b>Br</b> Branching, <b>En</b> Encrusting, <b>Ta</b> Tabulate, <b>Mu</b> Mushroom, <b>Ma</b> Massive, <b>Sm</b> Submassive, <b>Fo</b> Foliose/Plating; <b>∅</b> = form not visible (too close). <b>✿</b> = polyps or vesicles extended (not a form; it fills the Coral Finder "Large daytime polyps" tile).</p>
    <p>The Coral Finder growth-form tiles use them: Branching = Br + Ta, Thin plates and crusts = En + Fo, Massive or thick = Ma + Sm, Columns = Sm, Solitary = Mu, Meandering = any form of the genera it lists. Dashed = a first guess, solid = yours (always wins); a red ? = a guess to double-check.</p>
    <p>Click, drag a photo to another row, or hover it and press B E T U M S F, X for not visible, P for polyps. "To classify" rows group the photos without a guess by their old Coral Finder letter. Coral Finder book photos are left out.</p>`,
  quality: `<p>Quality 3 good, 2 fair, 1 poor. Dashed tags are an automatic guess (sharpness, contrast, colour cast, size). Click, drag to another level, or hover a photo and press 1, 2 or 3.</p>`,
  triage: `<p>Only what needs your eye. On the site, the ⚑ on any photo (shown only in this browser) sends it here with where you saw it. Hide, Poor or Done clear one flag at a time.</p><p>Then Featured photos rated Poor.</p><p>Last, the suggestions of the photo judging agent (suggest.json): wrong genus, view, several corals, near-duplicates, candidates to add. Accept does the usual action (Undo works), Dismiss hides the suggestion for good. Its growth forms and quality ratings show as dashed guesses on each photo, its Featured picks fill the views you haven't picked.</p>`,
  mont: `<p>The classic look-alikes (pairs the IMR lecture or the Coral Finder text compare), one side-by-side pair each on the site's Look-alikes page. Pick the view, then click a photo on each side. Rows you haven't touched show the automatic pick (same view, same growth form, IMR then your photos first). <b>All</b> mixes the zoom levels, to pair two nearby zooms. <b>Auto / Manual</b> says whether the pair shows the automatic pick or yours (clicking a view or a photo makes it Manual; Auto drops your picks for that pair). <b>Shown / Hidden</b>: Hidden keeps a pair off the site until there are good examples.</p>`,
  cand: `<p>Every new candidate, one at a time, genera taking turns. Set quality and growth form, then add it to a view (keys 1 2 3), Reject (←), Skip (→) or Not this. Rejected photos stay candidates on their genus page. × excludes for good. Undo steps back.</p>`,
  excluded: `<p>Excluded photos are removed from every genus, game and candidate list, and imports skip them. Restore puts one back.</p>`
};
function toggleHelp(){
  let h = $('admhelp'); if (h) { h.remove(); return; }
  const m = cur === '~stats-photos' ? 'statsph' : cur === '~stats-needs' ? 'statsneeds' : modeKey() === 'stats' ? ({'~diff': 'diff', '~cov': 'cov', '~fcov': 'fcov'}[cur] || 'stats') : modeKey();
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
    <button type="button" class="adm-ph" data-act="zoom" aria-label="Enlarge"><img src="${img(p, 1)}" alt="" loading="lazy" draggable="false"${crStyle(p.f)}></button>${GRIP}${XBTN}
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
  // A flagged photo still on a genus page gets every tool of that page (Pierre: often flagged for its zoom level), plus Done.
  const flagTile = p => { const n = p.genus, q = DATA.gen[n] && [...photos(n), ...pending(n)].find(x => x.f === p.f), where = `<small class="adm-where">${esc(p.fl.where || '')} · ${esc(when(p.fl.at))}</small>`;
    if (!q) return tile(p, `<button type="button" data-act="tpoor">Poor</button><button type="button" data-act="tdone">Done</button>`, `<span class="adm-src view">${esc((VIEWS.find(x => x[0] === p.fl.view) || [, p.fl.view || ''])[1])}</span>${where}`);
    const cv = coverOf(n); SHOWN_COVER = cv && cv.f;
    return tile0(n, q, viewOf(n, q), {cls: hidden(n, q) ? 'is-hidden' : '', extra: `<button type="button" class="adm-tdone" data-tdone>✓ Done</button>`})
      .replace('<figure class="adm-tile', `<figure data-g="${esc(n)}" class="adm-tile`).replace(GRIP, '').replace('<figcaption>', `<figcaption><a class="adm-gen" href="#${esc(n)}"><i>${esc(n)}</i></a>${where}`); };
  const poor = []; Object.entries(DRAFT.genera).forEach(([n, k]) => Object.entries(k.feat || {}).forEach(([v, L]) => L.forEach(f => { if (PHOTOS[f] && qOf(f) === 1) poor.push({...PHOTOS[f], f, genus: n, fv: v}); })));
  $v.innerHTML = `<section class="adm-quality">
    <div class="adm-qhead"><h2>Flagged on the site <small>${flagged.length}</small></h2></div>
    ${flagged.length ? `<div class="adm-grid adm-qgrid adm-flagged">${flagged.map(flagTile).join('')}</div>` : '<p class="note">Nothing flagged.</p>'}
    ${poor.length ? `<div class="adm-qhead"><h2>Featured but rated Poor <small>${poor.length}</small></h2></div><div class="adm-grid adm-qgrid">${poor.map(p => tile(p, '<a class="chip" href="#' + esc(p.genus) + '">Open genus</a>', `<span class="adm-src view">${esc((VIEWS.find(x => x[0] === p.fv) || [, p.fv])[1])}</span>`)).join('')}</div>` : ''}
    ${sugHtml(tile)}
  </section>`;
  bindSug();
  const done = f => { DRAFT.flag = {...(DRAFT.flag || {})}; delete DRAFT.flag[f]; };
  $v.querySelectorAll('[data-act="tdone"],[data-tdone]').forEach(b => b.onclick = () => { done(b.closest('[data-f]').dataset.f); saveDraft(); renderTriage(); });
  const FL = $v.querySelector('.adm-flagged'); if (FL) { bindTiles(FL, t => t.dataset.g); bindF(FL); bindQ(); }
  $v.querySelectorAll('[data-act="tpoor"]').forEach(b => b.onclick = () => { const f = b.closest('[data-f]').dataset.f; DRAFT.quality = {...(DRAFT.quality || {}), [f]: 1}; done(f); saveDraft(); renderTriage(); });
  $v.querySelectorAll('[data-act="thide"]').forEach(b => b.onclick = () => { const t = b.closest('[data-f]'), n = t.dataset.g, f = t.dataset.f; if (!DATA.gen[n]) return;
    done(f); if (!(entry(n).hide || []).includes(f)) ACT.hide(n, f); else { saveDraft(); renderTriage(); } });
  $v.querySelectorAll('[data-act="zoomx"]').forEach(b => b.onclick = () => { const p = PHOTOS[b.closest('[data-f]').dataset.f]; if (p) zoomOne(p); });
}
/* ---------- Look-alikes (was "Montages"): one photo pair per classic look-alike pair (curation.json "mont" {"A|B": {v, a, b}}) ---------- */
// Same pairs, order and automatic pick as the site (app.js classics / montage): pairs a source compares in so many words.
const MONT_V = {'Pocillopora|Stylophora': 'medium', 'Acropora|Anacropora': 'medium', 'Acropora|Cyphastrea': 'medium', 'Acropora|Echinopora': 'medium', 'Goniopora|Porites': 'medium', 'Danafungia|Fungia': 'medium', 'Fungia|Lithophyllon': 'medium', 'Danafungia|Lithophyllon': 'medium'};
function classicPairs(){
  const G = DATA.gen, src = (a, b) => (G[a].lsrc || {})[b] || (G[b].lsrc || {})[a] || '', idx = n => Object.keys(G).indexOf(n), seen = new Set(), out = [];
  Object.keys(G).forEach(a => G[a].look.forEach(b => { const k = [a, b].sort().join('|'); if (G[b] && !seen.has(k) && /^(IMR|Coral Finder p)/.test(src(a, b))) { seen.add(k); out.push({k, A: k.split('|')[0], B: k.split('|')[1], src: src(a, b)}); } }));
  const tier = p => /^IMR/.test(p.src) ? 0 : 1;
  return out.sort((x, y) => tier(x) - tier(y) || Math.min(idx(x.A), idx(x.B)) - Math.min(idx(y.A), idx(y.B)));
}
// "all" = photos of every zoom level (Pierre, 2026-11-01), so a pair can show two nearby zooms; the automatic pick then
// prefers the nearest levels. "hide" keeps the comparison off the site until good examples exist; "Auto" drops his
// view and photo picks (the hide stays). Both are per pair and go through Undo like every other click.
const MONT_VIEWS = [...VIEWS, ['all', 'All']], ZOOM = {wide: 0, medium: 1, macro: 2};
const montList = (n, v) => v === 'all' ? VIEWS.flatMap(([w]) => montList(n, w)) : (r => [...r.feat, ...r.rest])(rowOf(n, v));
function montPick(p){
  const e = (DRAFT.mont || {})[p.k] || {}, m = e, ok = v => v && montList(p.A, v).length && montList(p.B, v).length;
  const v = ok(m.v) ? m.v : [MONT_V[p.k] || 'macro', 'macro', 'medium', 'wide'].find(ok); if (!v) return {v: null, hide: !!e.hide};
  const LA = montList(p.A, v), LB = montList(p.B, v), mine = m.v === v, fa = mine && LA.find(x => x.f === m.a), fb = mine && LB.find(x => x.f === m.b);
  const gap = (x, y) => v === 'all' ? 4 * Math.abs(ZOOM[viewOf(p.A, x)] - ZOOM[viewOf(p.B, y)]) : 0;
  let best = null; (fa ? [fa] : LA.slice(0, 6)).forEach((x, i) => (fb ? [fb] : LB.slice(0, 6)).forEach((y, j) => { const sc = i + j + (fOf(x.f) && fOf(x.f) === fOf(y.f) ? 0 : 8) + gap(x, y); if (!best || sc < best[0]) best = [sc, x, y]; }));
  return {v, a: best[1], b: best[2], set: !!m.v, hide: !!e.hide, LA, LB};
}
// Write one pair's entry (null fields dropped; an empty entry is removed, so the row is automatic again).
function setMont(k, e){
  const out = {}; Object.entries(e).forEach(([x, y]) => { if (y) out[x] = y; });
  const M = {...(DRAFT.mont || {})}; if (Object.keys(out).length) M[k] = out; else delete M[k];
  DRAFT.mont = M; saveDraft();
}
function renderMont(){
  status();
  const L = classicPairs();
  const strip = (p, side, list, chosen) => `<div class="adm-mstrip">${list.map(x => `<button type="button" class="adm-mth${x.f === chosen.f ? ' on' : ''}" data-k="${esc(p.k)}" data-side="${side}" data-f="${esc(x.f)}" title="${esc(x.t || '')}"><img src="${img(x, 1)}" alt="" loading="lazy">${srcTag(x)}</button>`).join('')}</div>`;
  $v.innerHTML = `<section class="adm-quality adm-mont">${L.map(p => { const m = montPick(p);
    return `<article class="adm-mrow${m.set ? ' set' : ''}${m.hide ? ' off' : ''}"><div class="adm-mhead"><b><i>${esc(p.A)}</i> / <i>${esc(p.B)}</i></b><small>${esc(p.src)}</small>
      <span class="adm-qseg adm-lvseg" role="group" aria-label="View">${MONT_VIEWS.map(([w, t]) => `<button type="button" data-k="${esc(p.k)}" data-mv="${w}" aria-pressed="${m.v === w}"${montList(p.A, w).length && montList(p.B, w).length ? '' : ' disabled'}>${t}</button>`).join('')}</span><span class="adm-qseg adm-lvseg" role="group" aria-label="Pick"><button type="button" data-k="${esc(p.k)}" data-mauto aria-pressed="${!m.set}" title="Automatic pick">Auto</button><button type="button" aria-pressed="${m.set}" disabled title="Manual">Manual</button></span>
      <span class="adm-qseg adm-lvseg adm-mvis" role="group" aria-label="On the site"><button type="button" data-k="${esc(p.k)}" data-mhide="0" aria-pressed="${!m.hide}" title="Shown on the site">Shown</button><button type="button" data-k="${esc(p.k)}" data-mhide="1" aria-pressed="${m.hide}" title="Hidden from the site">Hidden</button></span></div>
      ${m.v ? `<div class="adm-mbody"><div class="adm-mprev"><img src="${img(m.a)}" alt="${esc(p.A)}"><img src="${img(m.b)}" alt="${esc(p.B)}"></div>
        <div class="adm-msides"><div><i>${esc(p.A)}</i>${strip(p, 'a', m.LA, m.a)}</div><div><i>${esc(p.B)}</i>${strip(p, 'b', m.LB, m.b)}</div></div></div>` : '<p class="note">No view with photos of both.</p>'}</article>`; }).join('')}</section>`;
  const cur = k => ({...((DRAFT.mont || {})[k] || {})});
  const keep = fn => { const y = window.scrollY; fn(); renderMont(); window.scrollTo(0, y); };
  // Changing the view keeps the two photos on show when they belong to the new view (always so for All).
  $v.querySelectorAll('[data-mv]').forEach(b => b.onclick = () => keep(() => { const k = b.dataset.k, w = b.dataset.mv, p = L.find(x => x.k === k), m = montPick(p);
    const has = (n, x) => x && montList(n, w).some(y => y.f === x.f) ? x.f : null;
    setMont(k, {hide: cur(k).hide, v: w, a: has(p.A, m.a), b: has(p.B, m.b)}); }));
  $v.querySelectorAll('.adm-mth').forEach(b => b.onclick = () => keep(() => { const k = b.dataset.k, p = L.find(x => x.k === k), m = montPick(p);
    setMont(k, {hide: m.hide, v: m.v, a: m.a && m.a.f, b: m.b && m.b.f, [b.dataset.side]: b.dataset.f}); }));
  $v.querySelectorAll('[data-mauto]').forEach(b => b.onclick = () => { if (cur(b.dataset.k).v) keep(() => setMont(b.dataset.k, {hide: cur(b.dataset.k).hide})); });
  $v.querySelectorAll('[data-mhide]').forEach(b => b.onclick = () => { const e = cur(b.dataset.k), h = b.dataset.mhide === '1'; if (!!e.hide !== h) keep(() => setMont(b.dataset.k, {...e, hide: h})); });
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
  // Near-duplicates: the judging agent's and tools/find_dups.py's (dups.json), candidates included.
  const any = (n, f) => live(n, f) || pending(n).find(p => p.f === f);
  [...(S.dup || []), ...DUPS].forEach(d => { const n = d.genus; if (!DATA.gen[n] || seen('dup:' + d.keep) || excl(d.keep) || !any(n, d.keep)) return;
    const left = d.f.filter(f => !excl(f) && any(n, f) && !(live(n, f) && hidden(n, live(n, f))));
    if (left.length) out.dup.push({...d, left}); });
  Object.entries(S.add || {}).forEach(([n, A]) => { if (!DATA.gen[n]) return; const added = entry(n).add || {};
    Object.entries(A).forEach(([f, v]) => { const p = pending(n).find(x => x.f === f); if (p && !added[f] && !seen('add:' + f)) out.add.push({...p, genus: n, to: v}); }); });
  return out;
}
const sugCount = () => { if (!DATA || !DRAFT || (!Object.keys(SUG || {}).length && !DUPS.length)) return 0; const o = sugItems(); return o.genus.length + o.view.length + o.multi.length + o.dup.length + o.add.length; };
function sugHtml(tile){
  if (!Object.keys(SUG || {}).length && !DUPS.length) return '';
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
    + sec('Suggested: near-duplicates', o.dup, o.dup.map(d => `<div class="adm-grid adm-qgrid adm-dup">${tile({...PHOTOS[d.keep], f: d.keep, genus: d.genus}, dis('dup:' + d.keep), `<span class="adm-src new">Keep</span>${d.note ? `<small class="adm-where">${esc(d.note)}</small>` : ''}`)}${d.left.map(f => tile({...PHOTOS[f], f, genus: d.genus}, `<button type="button" data-sg="genus" data-to="exclude">Exclude</button>`, '<span class="adm-src multi">Duplicate</span>')).join('')}</div>`).join(''))
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

/* ---------- Candidates, one per screen (made for the phone) ---------- */
// Every new candidate of every genus, one at a time: set its quality and growth form, then add it to a view,
// reject it, send it to another genus ("Not this") or skip it. Reject is only a "reviewed" mark (curation.json
// "seen" {'cand:f': 1}): the photo stays a candidate on its genus page, nothing is deleted. Genera take turns,
// in a shuffled order kept in this browser; within a genus, Pierre's photos first, then Dauin, Philippines, CF book.
const CK = f => 'cand:' + f, rejected = f => !!(DRAFT.seen || {})[CK(f)];
const CSRCS = [['own', 'Pierre'], ['dauin', 'Dauin'], ['ph', 'PH'], ['book', 'CF'], ['all', 'All']];
let CSRC = store.get('imr-admin-csrc2', 'dauin'), CSKIP = new Set();
const srcOk = (p, s) => s === 'all' || origin(p) === s;
// Order (Pierre): random, but genus x view cells with few photos come up more often, so the gaps for the games fill
// first. Each candidate's weight is 1 / (1 + game colonies the genus already has in its view, covOf as on the Coverage page): its guessed view (vg, Claude's
// guess from the photo), else the genus's emptiest view; x3 when it completes a colony already in games at another zoom. Weighted random draw (key -ln(u) / w, u fixed per photo
// and per device), then no two of the same genus in a row when it can be avoided.
const cseed = () => { let s = store.get('imr-admin-cseed', 0); if (!s) { s = 1 + Math.floor(Math.random() * 2147483645); store.set('imr-admin-cseed', s); } return s; };
const uOf = f => { let h = cseed() ^ 2166136261; for (let i = 0; i < f.length; i++) h = Math.imul(h ^ f.charCodeAt(i), 16777619); return ((h >>> 0) + .5) / 4294967296; };
function candQueue(src){
  const N = {}, O = {}, cnt = (n, w) => { const k = n + '|' + w; if (!(k in N)) { const c = covOf(n, w); N[k] = c.obs; O[k] = new Set(c.L.map(q => q.o).filter(Boolean)); } return N[k]; };
  const weight = (n, p) => { const vs = VIEWS.map(x => x[0]).filter(w => !(lv(n) === 2 && w === 'medium')); let v = p.vg || p.view; if (v === 'medium' && lv(n) === 2) v = 'wide';
    // A candidate from a colony already in games at another zoom counts 3x (Pierre, 2026-11-01): game questions only
    // show views of one colony, so completing a colony adds a several-zoom question.
    const sib = p.o && vs.some(w => w !== v && (cnt(n, w), O[n + '|' + w].has(p.o))) ? 3 : 1;
    return sib / (1 + (vs.includes(v) ? cnt(n, v) : Math.min(...vs.map(w => cnt(n, w))))); };
  const L = [];
  Object.keys(DATA.gen).forEach(n => { const add = entry(n).add || {};
    cands(n).forEach(p => { if (srcOk(p, src) && !add[p.f] && !rejected(p.f)) L.push({p, n, r: -Math.log(uOf(p.f)) / weight(n, p)}); }); });
  L.sort((a, b) => a.r - b.r);
  const out = [];
  while (L.length) { const last = out.length && out[out.length - 1].n, i = L.slice(0, 6).findIndex(x => x.n !== last); out.push(L.splice(i < 0 ? 0 : i, 1)[0]); }
  return out;
}
let candKey = null;
function renderCand(){
  status();
  const Q = candQueue(CSRC), live = Q.filter(x => !CSKIP.has(x.p.f)), c = live[0], nx = live[1];
  const seg = `<span class="adm-qseg adm-csrc" role="group" aria-label="Source">${CSRCS.map(([s, t]) => `<button type="button" data-src="${s}" aria-pressed="${s === CSRC}">${t} <b>${s === CSRC ? live.length : candQueue(s).filter(x => !CSKIP.has(x.p.f)).length}</b></button>`).join('')}</span>`;
  if (!c) {
    $v.innerHTML = `<section class="adm-sw adm-swempty">${seg}<p class="note">${Q.length ? `${Q.length} skipped.` : 'No candidate left.'}</p>${Q.length ? '<button type="button" class="adm-btn" data-again>Show the skipped ones</button>' : ''}</section>`;
  } else {
    const {p, n} = c, views = VIEWS.filter(([w]) => !(lv(n) === 2 && w === 'medium'));
    const link = /^https?:/.test(p.o || '') ? `<a class="adm-swlink" href="${esc(p.o)}" target="_blank" rel="noopener" title="iNaturalist">iNat ↗</a>` : p.pg ? `<span class="adm-swlink">p. ${esc(p.pg)}</span>` : '';
    $v.innerHTML = `<section class="adm-sw" data-f="${esc(p.f)}" data-g="${esc(n)}">${seg}
      <figure class="adm-swcard">
        <button type="button" class="adm-swph" data-zoom aria-label="Enlarge"><img src="${img(p)}" alt=""${crStyle(p.f)}></button>
        <a class="adm-swg" href="#${encodeURIComponent(n)}" title="Genus page"><i>${esc(n)}</i>${p.from ? `<small>from ${esc(p.from)}</small>` : ''}</a>
        <button type="button" class="adm-swx" data-x title="Exclude" aria-label="Exclude for good">×</button>
        <figcaption>${srcTag(p)}<span class="adm-t">${esc(p.t || '')}</span>${link}</figcaption>
      </figure>
      <div class="adm-acts adm-swacts">${qSeg(p)}${fSeg(p)}<div class="adm-swrow">${p.from ? '' : notThis(n)}<button type="button" class="adm-swcrop${crOf(p.f) ? ' on' : ''}" data-crop aria-pressed="${!!crOf(p.f)}">Crop</button><button type="button" data-skip>Skip</button></div></div>
      <div class="adm-swbar"><button type="button" class="rej" data-rej>✕ Reject</button>${views.map(([w], i) => `<button type="button" class="add${(p.vg || p.view) === w ? ' sug' : ''}" data-add="${w}" title="${(p.vg || p.view) === w ? 'Suggested · ' : ''}Add (${i + 1})">+ ${label(n, w)}</button>`).join('')}</div>
    </section>`;
    if (nx) new Image().src = img(nx.p);
    const S = $v.querySelector('.adm-sw'), f = p.f, go = () => { CSKIP.delete(f); };
    S.querySelectorAll('[data-add]').forEach(b => b.onclick = () => { go(); ACT.addc(n, f, null, b.dataset.add); toast(`Added: ${n}, ${label(n, b.dataset.add)}.`); });
    S.querySelector('[data-rej]').onclick = () => { go(); DRAFT.seen = {...(DRAFT.seen || {}), [CK(f)]: 1}; saveDraft(); render(); };
    S.querySelector('[data-skip]').onclick = () => { CSKIP.add(f); render(); };
    S.querySelector('[data-x]').onclick = () => { go(); ACT.exclude(n, f); };
    const sel = S.querySelector('select[data-act="out"]'); if (sel) sel.onchange = () => { if (!sel.value) return; const to = sel.value; ACT.out(n, f, null, to); toast(to === 'cmp' ? 'Kept for the look-alike comparison.' : `Sent to ${to}.`); };
    S.querySelector('[data-zoom]').onclick = () => zoomOne({...p, genus: n});
    S.querySelector('[data-crop]').onclick = () => cropEditor(p);
    bindQ(); bindF(S);
  }
  $v.querySelectorAll('[data-src]').forEach(b => b.onclick = () => { CSRC = b.dataset.src; store.set('imr-admin-csrc2', CSRC); render(); });
  const ag = $v.querySelector('[data-again]'); if (ag) ag.onclick = () => { CSKIP.clear(); render(); };
  if (!candKey) { candKey = e => { if (cur !== '~cand' || e.ctrlKey || e.metaKey || e.altKey || e.target.closest('input,textarea,select') || !$('lightbox').hidden) return;
    const S = $v.querySelector('.adm-sw[data-f]'); if (!S) return;
    const b = e.key === 'ArrowLeft' ? S.querySelector('[data-rej]') : e.key === 'ArrowRight' ? S.querySelector('[data-skip]') : /^[1-3]$/.test(e.key) ? S.querySelectorAll('[data-add]')[e.key - 1] : null;
    if (b) { e.preventDefault(); b.click(); } };
    addEventListener('keydown', candKey); }
}
// Crop editor (full screen): drag the frame or its corners; Save keeps it in the draft, Full photo removes it.
// The frame is in fractions of the ORIGINAL photo, so the editor always shows the original (iNat large), never the
// local file, which is already cropped once a crop has been applied (re-editing used to compound the two crops).
function cropEditor(p){
  const lb = $('lightbox'), c0 = crOf(p.f) || [0, 0, 1, 1]; let c = c0.slice();
  lb.innerHTML = `<div class="adm-crop"><div class="adm-cropbox"><img src="${p.src ? p.src.replace('/original.', '/large.') : img(p)}" alt="" draggable="false"><div class="adm-cropfr"><i data-h="lt"></i><i data-h="rt"></i><i data-h="lb"></i><i data-h="rb"></i></div></div>
    <div class="adm-cropbar"><button type="button" data-c="cancel">Cancel</button><button type="button" data-c="full">Full photo</button><button type="button" class="ok" data-c="save">Save</button></div></div>`;
  lb.hidden = false;
  const box = lb.querySelector('.adm-cropbox'), im = box.querySelector('img'), fr = box.querySelector('.adm-cropfr'), MIN = .08;
  const draw = () => { Object.assign(fr.style, {left: c[0] * 100 + '%', top: c[1] * 100 + '%', width: (c[2] - c[0]) * 100 + '%', height: (c[3] - c[1]) * 100 + '%'}); };
  const fit = () => { const W = innerWidth - 24, H = innerHeight - 110, r = im.naturalWidth / im.naturalHeight || 1.33, w = Math.min(W, H * r); box.style.width = w + 'px'; box.style.height = w / r + 'px'; draw(); };
  im.complete ? fit() : (im.onload = fit); addEventListener('resize', fit);
  let drag = null;
  box.onpointerdown = e => { e.preventDefault(); const h = e.target.dataset.h || (e.target === fr ? 'move' : null); if (!h) return; box.setPointerCapture(e.pointerId); const r = box.getBoundingClientRect(); drag = {h, x: e.clientX, y: e.clientY, c: c.slice(), w: r.width, hh: r.height}; };
  box.onpointermove = e => { if (!drag) return; const dx = (e.clientX - drag.x) / drag.w, dy = (e.clientY - drag.y) / drag.hh, o = drag.c, cl = (v, a, b) => Math.min(b, Math.max(a, v));
    if (drag.h === 'move') { const w = o[2] - o[0], h = o[3] - o[1], l = cl(o[0] + dx, 0, 1 - w), t = cl(o[1] + dy, 0, 1 - h); c = [l, t, l + w, t + h]; }
    else { c = o.slice(); if (drag.h[0] === 'l') c[0] = cl(o[0] + dx, 0, o[2] - MIN); else c[2] = cl(o[2] + dx, o[0] + MIN, 1); if (drag.h[1] === 't') c[1] = cl(o[1] + dy, 0, o[3] - MIN); else c[3] = cl(o[3] + dy, o[1] + MIN, 1); }
    draw(); };
  box.onpointerup = box.onpointercancel = () => { drag = null; };
  const close = () => { lb.hidden = true; lb.innerHTML = ''; removeEventListener('resize', fit); };
  lb.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { const a = b.dataset.c;
    if (a === 'full') { c = [0, 0, 1, 1]; draw(); return; }
    if (a === 'save') { const v = c.map(x => Math.round(x * 1000) / 1000), full = v[0] <= 0 && v[1] <= 0 && v[2] >= 1 && v[3] >= 1;
      DRAFT.crop = {...(DRAFT.crop || {})}; if (full) delete DRAFT.crop[p.f]; else DRAFT.crop[p.f] = v; saveDraft(); }
    close(); render(); });
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
  const mont = {}; Object.keys(DRAFT.mont || {}).sort().forEach(k => { mont[k] = DRAFT.mont[k]; });
  const crop = {}; Object.keys(DRAFT.crop || {}).sort().forEach(k => { crop[k] = DRAFT.crop[k]; });
  const single = {}; Object.keys(DRAFT.single || {}).sort().forEach(k => { single[k] = DRAFT.single[k]; });
  return {v: 1, ...(bookOn(DRAFT) ? {} : {book: false}), genera, ...(Object.keys(quality).length ? {quality} : {}), ...(Object.keys(gf).length ? {gf} : {}), ...(Object.keys(form).length ? {form} : {}), ...(Object.keys(exclude).length ? {exclude} : {}), ...(Object.keys(flag).length ? {flag} : {}), ...(Object.keys(use).length ? {use} : {}), ...(Object.keys(single).length ? {single} : {}), ...(Object.keys(seen).length ? {seen} : {}), ...(Object.keys(mont).length ? {mont} : {}), ...(Object.keys(crop).length ? {crop} : {})}; };
async function save(){
  const ch = changed(), q = qChanged(), x = xChanged(), bk = bChanged(), fm = fChanged(), fl = flChanged(), sg = sgChanged(), cd = cdChanged(), mt = mtChanged(), cr = crChanged(), sn = snChanged(); if (!(ch.length || q || x || bk || fm || fl || sg || cd || mt || cr || sn) || !TOKEN) return;
  const b = $('save'); b.disabled = true; b.textContent = 'Publishing…';
  try {
    // Never overwrite what was published from elsewhere since this page loaded: re-read it and merge first.
    const f = await gh(`/contents/${FILE}?ref=${BRANCH}`).catch(e => { if (/Not Found/.test(e.message)) return null; throw e; });
    if (f && f.sha !== SHA) { rebase(JSON.parse(fromB64(f.content))); SHA = f.sha; }
    const out = output(), text = JSON.stringify(out, null, 2) + '\n';
    const msg = `Photo curation: ${[...ch.slice(0, 6), ...(q ? ['quality ratings'] : []), ...(fm ? ['growth forms'] : []), ...(x ? ['exclusions'] : []), ...(fl ? ['triage flags'] : []), ...(sg ? ['triage suggestions'] : []), ...(cd ? ['candidate reviews'] : []), ...(mt ? ['look-alike montages'] : []), ...(cr ? ['crops'] : []), ...(sn ? ['several corals'] : []), ...(bk ? [`Coral Finder book photos ${bookOn(DRAFT) ? 'on' : 'off'}`] : [])].join(', ')}${ch.length > 6 ? ` and ${ch.length - 6} more genera` : ''}`;
    const r = await gh(`/contents/${FILE}`, {method: 'PUT', body: JSON.stringify({message: msg, content: toB64(text), branch: BRANCH, ...(SHA ? {sha: SHA} : {})})});
    SHA = r.content.sha; SAVED = clone(out); DRAFT = clone(out); saveDraft(); store.set('imr-curation-base', SAVED);
    toast('Published. The public site shows it within a minute or two.');
  } catch (x) { toast(/does not match|sha/i.test(x.message) ? 'The site was published from elsewhere in the meantime: reload the page, your draft is kept.' : 'Not published (your draft is kept): ' + x.message); }
  b.textContent = ''; render();
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
  try { [DATA, AUTOQ, AUTOF, FU0, PICKS, SUG] = await Promise.all([fetch('data.json', {cache: 'no-cache'}).then(r => r.json()), side('quality.json', 'q'), side('forms.json', 'gf'), side('forms.json', 'gunsure'), side('picks.json', 'feat'), fetch('suggest.json', {cache: 'no-cache'}).then(r => r.ok ? r.json() : {}).catch(() => ({})), loadSaved()]);
    DUPS = await side('dups.json', 'dup').then(x => Array.isArray(x) ? x : []); }
  catch (x) { $v.innerHTML = `<p class="warn">Could not load: ${esc(x.message)}</p>`; return; }
  FUNSURE = new Set(Array.isArray(FU0) ? FU0 : []);
  // The Coral Finder's extra genera (data.json x: in the book, present at Dauin, not on the IMR list) are curated here
  // like the others, listed after them; curation.json keys them by name as usual.
  if (DATA.x) Object.assign(DATA.gen, DATA.x.gen);
  [FDEF, LEGACY] = await Promise.all([side('forms.json', 'forms'), side('forms.json', 'form')]); if (!Array.isArray(FDEF)) FDEF = [];
  // Every photo of data.json by name, with its genus, for the Excluded view.
  PHOTOS = {}; Object.entries(DATA.gen).forEach(([n, g]) => [...Object.values(g.views || {}), ...Object.values(g.more || {}), (DATA.course || {})[n] || [], (DATA.cand || {})[n] || [], g.book || []].flat().forEach(p => { PHOTOS[p.f] = {...p, genus: n}; }));
  // Every photo name in data.json (field, extra, lecture, candidates), to spot choices left pointing nowhere.
  KNOWN = new Set([...Object.values(DATA.gen).flatMap(g => [...Object.values(g.views || {}), ...Object.values(g.more || {}), g.book || []].flat()), ...Object.values(DATA.course || {}).flat(), ...Object.values(DATA.cand || {}).flat(), ...(DATA.cmp || [])].map(p => p.f));
  // Unsaved edits from an earlier visit are kept, on top of what is saved.
  // The draft only carries the changes made since its base: everything published since then (from another
  // device, or by the candidate refill) comes in underneath. Drafts from before this rule only add, never remove.
  const old = store.get('imr-curation-draft', null), base = store.get('imr-curation-base', null);
  DRAFT = old && old.genera ? (base ? merge3(base, old, SAVED) : mergeOld(old, SAVED)) : clone(SAVED); DRAFT.genera = DRAFT.genera || {};
  snap = JSON.stringify(DRAFT); store.set('imr-curation-draft', DRAFT); store.set('imr-curation-base', SAVED);
  // Pierre's clicks in the old Coral Finder letters (curation.json "form") stay as they are, shown as the hint.
  Object.assign(LEGACY, SAVED.form || {}, DRAFT.form || {});
  const nf = importFlags(); if (nf) setTimeout(() => toast(`${nf} new photo${nf > 1 ? 's' : ''} flagged on the site: see Triage.`), 50);
  addEventListener('storage', e => { if (e.key === 'imr-photo-flags' && e.newValue && importFlags()) render(); });
  const keep = changed().length; if (keep) toast(`Your draft from last time is back: ${keep} ${keep > 1 ? "genera" : "genus"} not published yet.`);
  $('tools').hidden = false; $('save').onclick = save; $('download').onclick = download;
  const mo = document.querySelector('.adm-more'); if (mo) { mo.querySelector('.adm-menu').addEventListener('click', () => { mo.open = false; }); document.addEventListener('click', e => { if (!mo.contains(e.target)) mo.open = false; }); }
  const so = $('signout'); if (so) { so.hidden = !TOKEN; so.onclick = signOut; }
  $('undo').onclick = undo;
  $('help').onclick = toggleHelp;
  $('booksw').onclick = () => { if (bookOn(DRAFT)) DRAFT.book = false; else delete DRAFT.book; saveDraft(); render(); };
  $('redo').onclick = redo;
  $('redo2').onclick = redo; $('help2').onclick = toggleHelp;
  $('modesel').onchange = e => { location.hash = e.target.value.replace(/^#/, ''); };
  addEventListener('keydown', e => { if (!(e.ctrlKey || e.metaKey) || e.target.closest('input,textarea')) return; const k = e.key.toLowerCase();
    if (k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); } else if ((k === 'z' && e.shiftKey) || k === 'y') { e.preventDefault(); redo(); } });
  // On a phone the page opens on the candidates, one per screen.
  cur = decodeURIComponent(location.hash.slice(1)) || (matchMedia('(max-width: 599px)').matches ? '~cand' : Object.keys(DATA.gen)[0]);
  window.onhashchange = () => { cur = decodeURIComponent(location.hash.slice(1)); const h = $('admhelp'); if (h) h.remove(); render(); window.scrollTo({top: 0}); };
  // Every click is kept in this browser's draft, so leaving or reloading loses nothing: warn only if that save failed.
  window.onbeforeunload = e => { if (draftLost) { e.preventDefault(); e.returnValue = ''; } };
  // Every photo shows its file name in small, plain and selectable, so Pierre can quote it (hidden on phones, CSS).
  const fid = () => $v.querySelectorAll('figure[data-f] figcaption, .adm-sw[data-f] .adm-swcard figcaption').forEach(c => { if (c.querySelector('.adm-fid')) return;
    const f = c.closest('[data-f]').dataset.f, s = document.createElement('small'); s.className = 'adm-fid'; s.textContent = f; c.appendChild(s); });
  new MutationObserver(fid).observe($v, {childList: true, subtree: true});
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
  if (!STATS || !ANS) { $v.innerHTML = '<p class="note">Loading…</p>'; loadStats().then(() => { if (cur === '~diff') render(); }); return; }
  const vl = v => v === 'cand' ? 'Candidate' : VIEWS.find(x => x[0] === v)[1], S = photoStats();
  const L = allPhotos().filter(p => S[p.f] && S[p.f][1] >= SF.min).sort((a, b) => (DIFF_ORDER === 'hard' ? -1 : 1) * (S[a.f][0] - S[b.f][0]));
  const card = p => { const [d, n, r] = S[p.f];
    return `<figure class="adm-tile adm-qt" data-f="${esc(p.f)}" data-g="${esc(p.genus)}" data-q="${qOf(p.f)}" tabindex="0">
    <button type="button" class="adm-ph" data-act="zoom" aria-label="Enlarge"><img src="${img(p, 1)}" alt="" loading="lazy" draggable="false"${crStyle(p.f)}></button>
    <figcaption><a class="adm-gen" href="#${esc(p.genus)}"><i>${esc(p.genus)}</i></a><span class="adm-src view">${vl(p.view)}</span>${qTag(p)}<span class="adm-src" title="Difficulty">${d > 0 ? '+' : ''}${d.toFixed(1)} · ${r}/${n}</span></figcaption>
    <div class="adm-acts">${qSeg(p)}</div></figure>`; };
  $v.innerHTML = `<section class="adm-quality"><div class="adm-shead"><h2>Photo difficulty</h2>${segBtns('min', [[1, '≥1'], [3, '≥3'], [10, '≥10']])}<span class="note">answers</span>
    <span class="adm-qseg adm-sseg" role="group" aria-label="Order"><button type="button" data-do="hard" aria-pressed="${DIFF_ORDER === 'hard'}">Hardest</button><button type="button" data-do="easy" aria-pressed="${DIFF_ORDER === 'easy'}">Easiest</button></span>${eloSeg()}</div>
    ${L.length ? `<div class="adm-grid adm-qgrid">${L.map(card).join('')}</div>` : '<p class="note">No answers yet.</p>'}</section>`;
  $v.querySelectorAll('[data-do]').forEach(b => b.onclick = () => { DIFF_ORDER = b.dataset.do; store.set('imr-admin-diff', DIFF_ORDER); render(); });
  $v.querySelectorAll('[data-act="zoom"]').forEach(b => b.onclick = () => { const t = b.closest('[data-f]'); zoom(t.dataset.g, t.dataset.f); });
  bindQ(); bindStats();
}

/* ---------- Photo coverage ---------- */
// Game photos of genus n in view v, as the games can draw them (applySlots in app.js): field and IMR lecture photos, but no
// Coral Finder book photo, no multi-coral, hidden or "sheet only" photo. Poor photos count (Pierre: games use
// them at the Hard level, realistic like ReefCloud images). The Colony slot never takes a photo whose growth form is not visible (photoSet in app.js). Diversity = distinct colonies
// (iNat observations), so 5 shots of one colony count once. Shared by the Coverage page and the Candidates queue.
const COV = [1, 3, 5, 8];  // colonies per genus x view from which a cell reaches level 1, 2, 3, 4
function gamePool(n, v){
  const use = DRAFT.use || {};
  // A genus with a single IMR growth form (Pierre): the form is no question, so a "form not visible" photo still counts.
  const oneForm = v === 'wide' && new Set(photos(n).filter(p => !p.multi && !hidden(n, p)).map(p => fOf(p.f)).filter(x => x && x !== 'x' && x !== 'p')).size === 1;
  return photos(n).filter(p => viewOf(n, p) === v && !hidden(n, p) && !p.multi && !p.extra && !p.cf && use[p.f] !== 'ref' && !(v === 'wide' && fOf(p.f) === 'x' && !oneForm));
}
function covOf(n, v){ const L = gamePool(n, v); return {n: L.length, obs: new Set(L.map(p => p.o || p.f)).size, L}; }
// Photos of a genus x view left out of the game pool, by reason (Pierre: show what isn't counted and why).
// Short label in the cell, long one in the cell's tooltip.
const OFF = [['multi', 'multi‑coral', 'with several corals'], ['x', 'no form', 'form not visible'], ['ref', 'sheet only', 'sheet only'], ['cf', 'CF', 'Coral Finder book'], ['hid', 'removed', 'removed']];
function covOff(n, v, long){
  const pool = new Set(gamePool(n, v).map(p => p.f)), use = DRAFT.use || {}, out = {};
  photos(n).filter(p => viewOf(n, p) === v && !pool.has(p.f)).forEach(p => {
    const why = hidden(n, p) ? 'hid' : p.cf ? 'cf' : p.multi ? 'multi' : use[p.f] === 'ref' ? 'ref' : v === 'wide' && fOf(p.f) === 'x' ? 'x' : null;
    if (why) out[why] = (out[why] || 0) + 1; });
  const L = OFF.filter(([k]) => out[k]);
  return long ? L.map(([k, , t]) => `${out[k]} ${t}`).join(', ') : L.length ? 'excl. ' + L.map(([k, t]) => `${out[k]} ${t}`).join(' · ') : '';
}
// 0 none, 1 thin (1-2 colonies), 2 short (3-4), 3 fair (5-7), 4 well covered (8+). Thin = level 0 or 1.
const covLvl = c => COV.filter(k => c.obs >= k).length;
// Views a genus has in games: 2-level genera have no Closer view.
const covViews = n => VIEWS.filter(([v]) => !(lv(n) === 2 && v === 'medium'));
// Default Thinnest (Pierre 2026-11-01); new key so an older saved choice does not override it.
let COV_ORDER = store.get('imr-admin-covorder2', 'thin'); if (!['lecture', 'thick'].includes(COV_ORDER)) COV_ORDER = 'thin';
function renderCov(){
  status();
  const R = Object.keys(DATA.gen).filter(n => !DATA.gen[n].x).map((n, i) => {
    const cells = VIEWS.map(([v]) => covViews(n).some(x => x[0] === v) ? covOf(n, v) : null), live = cells.filter(Boolean);
    return {n, i, cells, min: Math.min(...live.map(c => c.obs)), max: Math.max(...live.map(c => c.obs)), all: live.flatMap(c => c.L), cand: pending(n).filter(p => !p.cf).length};
  });
  // Lecture order = the app's Genera list: IMR lecture group (★ genera in the group of their look-alikes, as shownGroup
  // in app.js), then slate order inside a group; genera outside the lecture groups last.
  const lg = n => { const g = DATA.gen[n]; if (g.ig) return g.ig; const L = (g.look || []).map(b => DATA.gen[b] && DATA.gen[b].ig).filter(Boolean);
    if (!L.length) return 99; const c = {}; L.forEach(k => c[k] = (c[k] || 0) + 1); return L.reduce((b, k) => c[k] > c[b] ? k : b, L[0]); };
  const by = {lecture: (a, b) => lg(a.n) - lg(b.n) || a.i - b.i, thin: (a, b) => a.min - b.min || a.all.length - b.all.length || a.i - b.i,
    thick: (a, b) => b.all.length - a.all.length || b.max - a.max || a.i - b.i};
  R.sort(by[COV_ORDER] || by.thin);
  const max = Math.max(1, ...R.map(r => r.all.length)), thin = R.reduce((s, r) => s + r.cells.filter(c => c && covLvl(c) < 2).length, 0), rich = R.reduce((s, r) => s + r.cells.filter(c => c && covLvl(c) === 4).length, 0);
  const cell = (r, c, v) => c ? `<td class="cov-c cov-${covLvl(c)}" title="${esc(label(r.n, v))}: ${c.n} photo${c.n === 1 ? '' : 's'} · ${c.obs} colon${c.obs === 1 ? 'y' : 'ies'}${(o => o ? ` · not counted: ${esc(o)}` : '')(covOff(r.n, v, true))}"><b>${c.n}</b>${c.obs < c.n ? `<small>${c.obs}</small>` : ''}${(o => o ? `<span class="cov-off">${o}</span>` : '')(covOff(r.n, v))}</td>` : '<td class="cov-c cov-na">–</td>';
  const bar = r => ORIGINS.filter(o => o[0] !== 'book').map(([o, t]) => { const k = r.all.filter(p => origin(p) === o).length; return k ? `<i class="o-${o}" style="width:${(100 * k / max).toFixed(1)}%" title="${t}: ${k}"></i>` : ''; }).join('');
  const seg = [['thin', 'Thinnest', 'Least covered first'], ['thick', 'Thickest', 'Most photos first'], ['lecture', 'Lecture', 'Lecture order']];
  $v.innerHTML = `<section class="adm-cov">
    <div class="adm-filter cov-head"><span class="adm-qseg adm-lvseg" role="group" aria-label="Order">${seg.map(([k, t, h]) => `<button type="button" data-co="${k}" title="${h}" aria-pressed="${COV_ORDER === k}">${t}</button>`).join('')}</span>
      <span class="cov-key" aria-label="Colonies"><span class="cov-c cov-0">0</span>${COV.map((k, i) => `<span class="cov-c cov-${i + 1}">${COV[i + 1] ? (COV[i + 1] - 1 > k ? `${k}–${COV[i + 1] - 1}` : k) : k + '+'}</span>`).join('')}</span>
      <b class="${thin ? 'warnc' : ''}" title="Cells with 0-2 colonies">${thin} thin</b><b class="cov-rich" title="Cells with 8+ colonies">${rich} at 8+</b></div>
    <table class="cov-t"><thead><tr><th></th>${VIEWS.map(([, t]) => `<th>${t}</th>`).join('')}<th class="cov-srch">Sources</th><th title="Candidates">+</th></tr></thead>
    <tbody>${R.map(r => `<tr data-g="${esc(r.n)}"><th scope="row"><a href="#${esc(r.n)}"><i>${esc(r.n)}</i></a>${DATA.gen[r.n].n ? '' : ' <small>★</small>'}</th>${r.cells.map((c, j) => cell(r, c, VIEWS[j][0])).join('')}
      <td class="cov-src"><span class="cov-bar">${bar(r)}</span><small>${r.all.length}</small></td><td class="cov-cand">${r.cand ? `+${r.cand}` : ''}</td></tr>`).join('')}</tbody></table></section>`;
  $v.querySelectorAll('[data-co]').forEach(b => b.onclick = () => { COV_ORDER = b.dataset.co; store.set('imr-admin-covorder2', COV_ORDER); render(); });
  $v.querySelectorAll('tbody tr').forEach(tr => tr.onclick = e => { if (!e.target.closest('a')) location.hash = encodeURIComponent(tr.dataset.g); });
}

// Finder coverage (Pierre 2026-11-01): what the Coral Finder can show per genus, the 39 IMR genera and the book's
// extra genera present at Dauin. Pool = every photo of the view not hidden, not multi-coral, approved CF book photos
// included; colour = distinct colonies with a photo that is not Poor; Forms = growth forms seen (Colony + Closer);
// Species = distinct species named on the photos.
let FCOV = Object.assign({set: 'all', order: 'thin'}, store.get('imr-admin-fcov', {}));
function renderFcov(){
  status();
  const isX = n => !!(DATA.x && DATA.x.gen[n]);
  const names = Object.keys(DATA.gen).filter(n => FCOV.set === 'all' || (FCOV.set === 'x') === isX(n));
  const R = names.map((n, i) => {
    const pool = photos(n).filter(p => !hidden(n, p) && !p.multi);
    const cells = covViews(n).length ? VIEWS.map(([v]) => covViews(n).some(x => x[0] === v) ? (L => {
      const good = L.filter(p => qOf(p.f) >= 2);
      return {n: L.length, obs: new Set(good.map(p => p.o || p.f)).size, cf: L.filter(p => p.cf).length, L}; })(pool.filter(p => viewOf(n, p) === v)) : null) : [];
    const live = cells.filter(Boolean), forms = [...new Set(pool.filter(p => viewOf(n, p) !== 'macro').map(p => fOf(p.f)).filter(f => f && FORM_ORDER.includes(f)))].sort((a, b) => FORM_ORDER.indexOf(a) - FORM_ORDER.indexOf(b));
    const sp = [...new Set(pool.map(p => p.t).filter(t => t && /\s/.test(t.trim())).map(t => t.trim().split(/\s+/).slice(0, 2).join(' ')))].sort();
    return {n, i, x: isX(n), cells, min: live.length ? Math.min(...live.map(c => c.obs)) : 0, tot: pool.length, forms, sp};
  });
  const by = {thin: (a, b) => a.min - b.min || a.tot - b.tot || a.i - b.i, thick: (a, b) => b.tot - a.tot || a.i - b.i, az: (a, b) => a.n.localeCompare(b.n)};
  R.sort(by[FCOV.order] || by.thin);
  const thin = R.reduce((s, r) => s + r.cells.filter(c => c && covLvl(c) < 2).length, 0);
  const cell = (r, c, v) => c ? `<td class="cov-c cov-${covLvl(c)}" title="${esc(label(r.n, v))}: ${c.n} photo${c.n === 1 ? '' : 's'} · ${c.obs} good colon${c.obs === 1 ? 'y' : 'ies'}${c.cf ? ` · ${c.cf} CF book` : ''}"><b>${c.n}</b><small>${c.obs} good</small>${c.cf ? `<span class="cov-off">incl. ${c.cf} CF</span>` : ''}</td>` : '<td class="cov-c cov-na">–</td>';
  const seg = (k, L) => `<span class="adm-qseg adm-lvseg" role="group">${L.map(([v, t]) => `<button type="button" data-fc="${k}" data-v="${v}" aria-pressed="${FCOV[k] === v}">${t}</button>`).join('')}</span>`;
  $v.innerHTML = `<section class="adm-cov">
    <div class="adm-filter cov-head">${seg('set', [['all', 'All'], ['imr', 'IMR list'], ['x', 'CF only']])}${seg('order', [['thin', 'Thinnest'], ['thick', 'Thickest'], ['az', 'A–Z']])}
      <span class="cov-key" aria-label="Good colonies"><span class="cov-c cov-0">0</span>${COV.map((k, i) => `<span class="cov-c cov-${i + 1}">${COV[i + 1] ? (COV[i + 1] - 1 > k ? `${k}–${COV[i + 1] - 1}` : k) : k + '+'}</span>`).join('')}</span>
      <b class="${thin ? 'warnc' : ''}" title="Cells with 0-2 good colonies">${thin} thin</b></div>
    <table class="cov-t fcov-t"><thead><tr><th></th>${VIEWS.map(([, t]) => `<th>${t}</th>`).join('')}<th>Forms</th><th>Species</th></tr></thead>
    <tbody>${R.map(r => `<tr data-g="${esc(r.n)}"><th scope="row"><a href="#${esc(r.n)}"><i>${esc(r.n)}</i></a>${r.x ? ' <small class="fcov-x">CF only</small>' : ''}</th>${r.cells.map((c, j) => cell(r, c, VIEWS[j][0])).join('')}
      <td class="fcov-f">${r.forms.map(f => `<span class="adm-why" title="${esc(fName(f))}">${FABBR[f]}</span>`).join(' ') || '<span title="No growth form set on these photos yet">–</span>'}</td>
      <td class="fcov-s" title="${esc(r.sp.join(', '))}">${r.sp.length || '–'}</td></tr>`).join('')}</tbody></table></section>`;
  $v.querySelectorAll('[data-fc]').forEach(b => b.onclick = () => { FCOV[b.dataset.fc] = b.dataset.v; store.set('imr-admin-fcov', FCOV); render(); });
  $v.querySelectorAll('tbody tr').forEach(tr => tr.onclick = e => { if (!e.target.closest('a')) location.hash = encodeURIComponent(tr.dataset.g); });
}

/* ---------- Stats: players (anonymous) and photo difficulty, from the sync sheet ---------- */
// ?answers=1 (sheet script v4): every answer, RA replaced by an anonymous id; ?stats=1: Elo difficulty per photo and
// level per RA (same scale: a player whose level equals a photo's difficulty gets it right about half the time beyond chance).
// The Stats tab holds the sub-views of STAT_TABS; Coverage (renderCov) and the photo list (renderDiff) live there too.
const STAT_TABS = [['~stats', 'Players'], ['~stats-photos', 'Photos'], ['~diff', 'Photo list'], ['~cov', 'Game coverage'], ['~fcov', 'Sheet & Finder coverage'], ['~stats-needs', 'Needs']];
let ANS = null, RAS = {}, MEID = null, SF = Object.assign({who: 'all', min: 1, elo: 'all', nk: '', nv: 'all', ns: 'sc', nd: 'desc'}, store.get('imr-admin-stats', {}));
const statSwitch = () => `<nav class="adm-filter adm-stabs" aria-label="Stats">${STAT_TABS.filter(([h]) => h !== '~cov' || typeof renderCov === 'function')
  .map(([h, t]) => `<a class="adm-fchip plain" href="#${h}" aria-pressed="${cur === h}">${t}</a>`).join('')}</nav>`;
// Puts the switch above a view rendered by another function (photo list, coverage).
const withSwitch = () => { if (!$v.querySelector('.adm-stabs')) $v.insertAdjacentHTML('afterbegin', statSwitch()); };
function loadStats(){
  const me = (store.get('imr-coral-sync', null) || {}).name;
  const digest = me ? crypto.subtle.digest('SHA-256', new TextEncoder().encode(`imr-coral-id|anon|${me.trim().toLowerCase()}`))
    .then(b => { MEID = btoa(String.fromCharCode(...new Uint8Array(b))).slice(0, 8); }).catch(() => {}) : Promise.resolve();
  const get = q => fetch(SYNC_URL + q).then(r => r.json()).catch(() => ({}));
  return Promise.all([get('?answers=1'), STATS ? null : get('?stats=1'), digest]).then(([a, s]) => {
    ELO_NOME = null; ANS = a && a.ok && a.rows ? a : {old: true, v: a && a.v, rows: [], players: {}};
    if (s) { STATS = s.ok ? s.photos || {} : {}; RAS = s.ok ? s.ras || {} : {}; }
  });
}
// Photo Elo with or without this browser's own answers (Pierre, 2026-11-01: the author knows the photos, so his answers
// bias their difficulty). "All" is the sheet's ?stats=1, the ratings the games use. "Without me" replays the same Elo
// (eloOf, a copy of stats_ in tools/sync/Code.gs: keep the two in step) over the answer log minus MEID's answers.
// Nothing is reset or stored: the log is kept, so any filter is a fresh replay.
function eloOf(rows){
  const P = {}, R = {}, sig = x => 1 / (1 + Math.exp(-x));
  rows.slice().sort((a, b) => a[1] - b[1]).forEach(r => {
    const fs = r[6].split(/\s+/).filter(Boolean); if (!r[0] || !fs.length) return;
    const ok = r[4] ? 1 : 0, g = r[5].indexOf('quiz-duel') === 0 ? 0.5 : 0.25, ra = R[r[0]] = R[r[0]] || [0, 0];
    const ph = fs.map(f => P[f] = P[f] || [0, 0, 0]), b = ph.reduce((t, p) => t + p[0], 0) / ph.length + (ph.length === 1 ? 0.5 : 0);
    const d = ok - (g + (1 - g) * sig(ra[0] - b));
    ra[0] += 0.6 / (1 + ra[1] / 40) * d; ra[1]++;
    ph.forEach(p => { p[0] -= 0.8 / (1 + p[2] / 10) / ph.length * d; p[2]++; p[1] += ok; });
  });
  const out = {}; Object.keys(P).forEach(f => out[f] = [Math.round(P[f][0] * 100) / 100, P[f][2], P[f][1]]);
  return out;
}
let ELO_NOME = null;
const photoStats = () => SF.elo !== 'others' || !MEID || !ANS ? STATS : (ELO_NOME = ELO_NOME || eloOf(ANS.rows.filter(r => r[0] !== MEID)));
const eloSeg = () => MEID ? segBtns('elo', [['all', 'All'], ['others', 'Without me']]) : '';
const pct = (r, n) => n ? Math.round(100 * r / n) + '%' : '–';
const sgn = d => (d > 0 ? '+' : '') + d.toFixed(2);
const days = t => { const d = Math.floor((Date.now() - t) / 864e5); return d < 1 ? 'today' : d < 2 ? 'yesterday' : d + ' d ago'; };
const segBtns = (k, L) => `<span class="adm-qseg adm-sseg" role="group">${L.map(([v, t]) => `<button type="button" data-sf="${k}" data-v="${v}" aria-pressed="${String(SF[k]) === String(v)}">${t}</button>`).join('')}</span>`;
const kpis = L => `<div class="adm-kpis">${L.map(([t, v]) => `<div><b>${v}</b><span>${t}</span></div>`).join('')}</div>`;
const sbar = (v, max, cls = '') => `<span class="adm-bar${cls ? ' ' + cls : ''}"><i style="width:${max ? Math.max(0, Math.min(100, 100 * v / max)) : 0}%"></i></span>`;
function bindStats(){
  $v.querySelectorAll('[data-sf]').forEach(b => b.onclick = () => { const k = b.dataset.sf; SF[k] = k === 'min' ? Number(b.dataset.v) : b.dataset.v; store.set('imr-admin-stats', SF); render(); });
  $v.querySelectorAll('[data-zf]').forEach(b => b.onclick = () => zoom(b.dataset.g, b.dataset.zf));
}
function renderStats(){
  status();
  if (!ANS) { $v.innerHTML = statSwitch() + '<p class="note">Loading…</p>'; loadStats().then(() => { if (cur.startsWith('~stats')) render(); }); return; }
  return cur === '~stats-photos' ? statsPhotos() : cur === '~stats-needs' ? statsNeeds() : statsPlayers();
}
// Rows kept by the player filter (all, others than this browser's synced name, or only it).
const statRows = () => ANS.rows.filter(r => SF.who === 'all' || !MEID || (SF.who === 'me') === (r[0] === MEID));
function statsPlayers(){
  const head = `${statSwitch()}<div class="adm-shead"><h2>Players</h2>${MEID ? segBtns('who', [['all', 'All'], ['others', 'Others'], ['me', 'Me']]) : ''}</div>`;
  if (ANS.old) { $v.innerHTML = head + `<p class="warn">Sheet script v${esc(ANS.v || '?')}: needs v4 (v5 for calibration and variety). <a href="https://raw.githubusercontent.com/${REPO}/main/tools/sync/Code.gs" target="_blank" rel="noopener">Code.gs</a></p>`; bindStats(); return; }
  const R = statRows(), P = {};
  R.forEach(r => { const p = P[r[0]] = P[r[0]] || {id: r[0], L: [], d: new Set()}; p.L.push(r); p.d.add(new Date(r[1]).toDateString()); });
  const ps = Object.values(P).map(p => { p.L.sort((a, b) => a[1] - b[1]); const ok = p.L.filter(r => r[4]).length, last = p.L.slice(-20);
    return {...p, n: p.L.length, ok, last: last.filter(r => r[4]).length / last.length, lv: (RAS[p.id] || [])[0], sum: ANS.players[p.id], at: p.L[p.L.length - 1][1], ph: new Set(p.L.flatMap(r => r[6].split(' ').filter(Boolean))).size}; })
    .sort((a, b) => (b.lv ?? -9) - (a.lv ?? -9) || b.n - a.n);
  const ok = R.filter(r => r[4]).length, wk = ps.filter(p => Date.now() - p.at < 7 * 864e5).length;
  // Learning curve: accuracy of each player's k-th answer, pooled in blocks.
  const mx = Math.max(0, ...ps.map(p => p.n)), blk = mx > 400 ? 50 : mx > 150 ? 20 : 10, cv = [];
  ps.forEach(p => p.L.forEach((r, k) => { const b = cv[Math.floor(k / blk)] = cv[Math.floor(k / blk)] || [0, 0]; b[0] += r[4]; b[1]++; }));
  // Genera shown, and how often each was given wrongly (Pierre's rule: that genus is not mastered either).
  const G = {}; const gg = n => G[n] = G[n] || {n, s: 0, ok: 0, w: 0};
  R.forEach(r => { const g = gg(r[2]); g.s++; g.ok += r[4]; if (!r[4] && r[3]) gg(r[3]).w++; });
  // Ability per genus (continuous difficulty, sheet v5): the median over players, from their last sync.
  const med = a => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : null; };
  const GT = {}; ps.forEach(p => Object.entries((p.sum || [])[3] || {}).forEach(([g, t]) => (GT[g] = GT[g] || []).push(t)));
  // Calibration: expected success of each answer (sheet v5) against the actual result, by band of expected success.
  const E = R.filter(r => r[7] != null), BANDS = [[0, .6], [.6, .75], [.75, .85], [.85, 1.01]];
  const cal = BANDS.map(([a, b]) => { const L = E.filter(r => r[7] >= a && r[7] < b); return [a, b, L.length, L.reduce((t, r) => t + r[7], 0), L.filter(r => r[4]).length]; }).filter(c => c[2]);
  const eMean = E.length ? E.reduce((t, r) => t + r[7], 0) / E.length : 0, eOk = E.filter(r => r[4]).length, NW = E.filter(r => r[9] > 0).length;
  const gl = Object.values(G).filter(g => g.s).sort((a, b) => a.ok / a.s - b.ok / b.s || b.s - a.s);
  const M = {}; R.filter(r => !r[4] && r[3]).forEach(r => { const k = r[2] + '|' + r[3]; M[k] = (M[k] || 0) + 1; });
  const ml = Object.entries(M).sort((a, b) => b[1] - a[1]).slice(0, 15), mm = ml.length ? ml[0][1] : 1;
  const cond = [['Quiz', r => !r[5].startsWith('quiz-duel')], ['Duel', r => r[5].startsWith('quiz-duel')], ['Single view', r => r[6].split(' ').filter(Boolean).length === 1], ['All views', r => r[6].split(' ').filter(Boolean).length > 1], ['With corallites', r => /-macro-/.test(r[6])], ['Without corallites', r => !/-macro-/.test(r[6])]]
    .map(([t, f]) => { const L = R.filter(f); return [t, L.length, L.filter(r => r[4]).length]; }).filter(c => c[1]);
  const total = DATA ? Object.keys(DATA.gen).length : 0;
  $v.innerHTML = head + kpis([['Players', ps.length], ['Answers', R.length], ['Right', pct(ok, R.length)], ['Active 7 d', wk]]) + (!R.length ? '<p class="note">No answers yet.</p>' : `
    <div class="adm-sgrid">
    <section class="adm-scard wide"><h3>Players</h3><div class="adm-tscroll"><table class="adm-tbl"><thead><tr><th>#</th><th>Level</th><th>Answers</th><th>Right</th><th>Last 20</th><th title="Different photos answered">Photos</th><th>Learned</th><th>Days</th><th>Last</th></tr></thead><tbody>
      ${ps.map((p, i) => `<tr${p.id === MEID ? ' class="me"' : ''}><td>${i + 1}${p.id === MEID ? ' <small>you</small>' : ''}</td><td>${p.lv == null ? '–' : sgn(p.lv)}</td><td>${p.n}</td><td>${pct(p.ok, p.n)}</td><td>${Math.round(100 * p.last)}%</td><td class="n">${p.ph}</td>
        <td>${p.sum ? `${p.sum[0]}/${p.sum[2] || total}` : '–'}</td><td>${p.d.size}</td><td>${days(p.at)}</td></tr>`).join('')}</tbody></table></div></section>
    <section class="adm-scard"><h3>Learning curve</h3><div class="adm-cols">${cv.map((b, k) => `<div title="Answers ${k * blk + 1}-${(k + 1) * blk}: ${b[0]}/${b[1]}"${b[1] < 10 ? ' class="few"' : ''}><i style="height:${Math.round(100 * b[0] / b[1])}%"></i><small>${Math.round(100 * b[0] / b[1])}</small></div>`).join('')}</div>
      <p class="adm-axis"><span>Answer 1</span><span>${blk} per bar</span><span>${cv.length * blk}</span></p></section>
    <section class="adm-scard"><h3>Calibration</h3>${E.length ? `${kpis([['Expected', pct(eMean * E.length, E.length)], ['Actual', pct(eOk, E.length)], ['Target', '80%'], ['New photo', pct(NW, E.length)]])}
      <table class="adm-tbl"><thead><tr><th>Expected</th><th>Actual</th><th></th><th>n</th></tr></thead><tbody>${cal.map(([a, b, n, se, ok]) => `<tr><td>${pct(se, n)}</td><td>${pct(ok, n)}</td><td>${sbar(ok, n, ok / n < se / n - .15 ? 'bad' : '')}</td><td class="n">${n}</td></tr>`).join('')}</tbody></table>` : `<p class="note">Needs answers logged by sheet script v5${ANS.v >= 5 ? '' : ` (now v${esc(ANS.v || '?')})`}.</p>`}</section>
    <section class="adm-scard"><h3>Conditions</h3><table class="adm-tbl">${cond.map(([t, n, r]) => `<tr><td>${t}</td><td>${pct(r, n)}</td><td>${sbar(r, n)}</td><td class="n">${n}</td></tr>`).join('')}</table></section>
    <section class="adm-scard"><h3>Genera</h3><div class="adm-tscroll tall"><table class="adm-tbl"><thead><tr><th>Shown</th><th>Right</th><th></th><th>n</th><th title="Given wrongly">Given ✗</th><th title="Median player ability on the genus">Level</th></tr></thead><tbody>
      ${gl.map(g => `<tr><td><a class="adm-gen" href="#${esc(g.n)}"><i>${esc(g.n)}</i></a></td><td>${pct(g.ok, g.s)}</td><td>${sbar(g.ok, g.s, g.ok / g.s < .5 ? 'bad' : '')}</td><td class="n">${g.s}</td><td class="n">${g.w || ''}</td><td class="n">${GT[g.n] ? sgn(med(GT[g.n])) : ''}</td></tr>`).join('')}</tbody></table></div></section>
    <section class="adm-scard"><h3>Mix-ups</h3>${ml.length ? `<table class="adm-tbl"><thead><tr><th>Shown</th><th>Answered</th><th></th><th>n</th></tr></thead><tbody>
      ${ml.map(([k, n]) => { const [a, b] = k.split('|'); return `<tr><td><i>${esc(a)}</i></td><td><a class="adm-gen" href="./#cmp-${encodeURIComponent(a)}|${encodeURIComponent(b)}" target="_blank" rel="noopener"><i>${esc(b)}</i></a></td><td>${sbar(n, mm, 'bad')}</td><td class="n">${n}</td></tr>`; }).join('')}</tbody></table>` : '<p class="note">None.</p>'}</section>
    </div>`);
  bindStats();
}
// Where to look for more photos (Pierre, 2026-10-31): per genus x view, the reasons the game pool falls short, from
// coverage (covOf), photo quality and difficulty (STATS Elo), players' levels per genus (sheet v5) and their answers.
function statsNeeds(){
  const head = `${statSwitch()}<div class="adm-shead"><h2>Where to look for photos</h2>${eloSeg()}</div>`, OFF = 1.0, PS = photoStats();
  // "Without me" drops this browser's own answers and level everywhere on the page (repeats, mix-ups, too easy), not only from the photo Elo.
  const noMe = SF.elo === 'others' && MEID, R = (ANS.rows || []).filter(r => !noMe || r[0] !== MEID);
  const TH = {}; Object.entries(ANS.players || {}).filter(([id]) => !noMe || id !== MEID).map(([, p]) => p).forEach(p => Object.entries(p[3] || {}).forEach(([g, t]) => (TH[g] = TH[g] || []).push(t)));
  const SEEN = {}; R.forEach(r => r[6].split(' ').filter(Boolean).forEach(f => { const k = r[0] + '|' + f; SEEN[k] = (SEEN[k] || 0) + 1; }));
  const ids = [...new Set(R.map(r => r[0]))], MX = {};
  R.filter(r => !r[4] && r[3]).forEach(r => { const m = MX[r[2]] = MX[r[2]] || {}; m[r[3]] = (m[r[3]] || 0) + 1; });
  const q3 = a => { const b = a.slice().sort((x, y) => x - y); return b[Math.floor(0.75 * (b.length - 1))]; };
  const out = [];
  Object.keys(DATA.gen).filter(n => !DATA.gen[n].x).forEach(n => covViews(n).forEach(([v, vt]) => {
    const c = covOf(n, v), why = []; let sc = 0;
    if (c.obs < 3) { why.push(['few', `${c.obs} colon${c.obs === 1 ? 'y' : 'ies'}`]); sc += 4 - c.obs; }
    const good = new Set(c.L.filter(p => qOf(p.f) >= 2).map(p => p.o || p.f)).size;
    if (c.obs >= 3 && good < 3) { why.push(['good', `${good} good colon${good === 1 ? 'y' : 'ies'}`]); sc += 1; }
    if ((TH[n] || []).length) { const rated = c.L.filter(p => PS[p.f] && PS[p.f][1] >= 3).map(p => PS[p.f][0]);
      const hard = rated.length ? Math.max(...rated) : c.L.some(p => qOf(p.f) === 1) ? 1 : 0, top = q3(TH[n]);
      if (top - OFF > hard + 0.3) { why.push(['easy', `players ${sgn(top)} vs hardest ${sgn(hard)}`]); sc += 1.5; } }
    const rep = ids.map(id => { const k = c.L.map(p => SEEN[id + '|' + p.f] || 0).filter(Boolean); return k.length ? k.reduce((a, b) => a + b, 0) / k.length : 0; }).filter(Boolean);
    const rp = rep.length ? rep.reduce((a, b) => a + b, 0) / rep.length : 0;
    if (rp >= 4) { why.push(['rep', `each photo ×${rp.toFixed(1)} per player`]); sc += 1; }
    const mx = Object.entries(MX[n] || {}).sort((a, b) => b[1] - a[1])[0];
    if (v === 'macro' && mx && mx[1] >= 3 && c.obs < 5) { why.push(['mix', `taken for ${mx[0]} ×${mx[1]}`]); sc += 1; }
    if (why.length) out.push({n, v, vt, c, why, sc});
  }));
  // Several zooms (Pierre, 2026-11-01): a game question only shows views of one colony, so a genus needs colonies
  // photographed at 2+ zoom levels; one row per genus with fewer than 3 of them.
  Object.keys(DATA.gen).filter(n => !DATA.gen[n].x).forEach(n => {
    const V = {}; covViews(n).forEach(([v]) => covOf(n, v).L.forEach(p => { const k = p.o || p.f; (V[k] = V[k] || new Set()).add(v); }));
    const m = Object.values(V).filter(s => s.size >= 2).length;
    if (m < 3) out.push({n, v: 'zoom', vt: 'Several zooms', c: {obs: m}, why: [['zoom', `${m} colon${m === 1 ? 'y' : 'ies'} at 2+ zooms`]], sc: 3 - m});
  });
  NEEDS = out; NGEN = NGEN || '';
  const VO = {wide: 0, medium: 1, macro: 2, zoom: 3}, vs = [...new Set(out.map(o => o.v))].sort((a, b) => VO[a] - VO[b]);
  if (SF.nv !== 'all' && !vs.includes(SF.nv)) SF.nv = 'all';
  $v.innerHTML = head.replace(/<\/div>$/, `${segBtns('nv', [['all', 'All views'], ...vs.map(v => [v, out.find(o => o.v === v).vt])])}
    <input type="search" class="adm-nsearch" placeholder="Genus" value="${esc(NGEN)}" aria-label="Genus"></div>`) + '<div id="adm-nbody"></div>'
    + (!Object.keys(ANS.players || {}).some(id => Object.keys((ANS.players[id] || [])[3] || {}).length) ? `<p class="note">"Too easy" needs answers logged by sheet script v5.</p>` : '');
  const inp = $v.querySelector('.adm-nsearch'); inp.oninput = () => { NGEN = inp.value; needsBody(); };
  needsBody(); bindStats();
}
// Gap table of statsNeeds, redrawn alone so the genus box keeps focus: reason cards filter (click again = all),
// view switch and genus box filter, column headers sort (click again = reverse).
let NEEDS = [], NGEN = '';
const NEED_T = {few: 'Few colonies', good: 'Few good colonies', zoom: 'Few multi-zoom', easy: 'Too easy', rep: 'Repeats', mix: 'Mix-ups'};
function needsBody(){
  const box = $v.querySelector('#adm-nbody'); if (!box) return;
  const T = NEED_T, q = NGEN.trim().toLowerCase(), VO = {wide: 0, medium: 1, macro: 2, zoom: 3};
  const base = NEEDS.filter(o => (SF.nv === 'all' || o.v === SF.nv) && (!q || o.n.toLowerCase().includes(q)));
  const has = k => o => o.why.some(w => w[0] === k), L = SF.nk ? base.filter(has(SF.nk)) : base.slice();
  const K = {n: o => o.n, v: o => VO[o.v], c: o => o.c.obs, sc: o => o.sc}, f = K[SF.ns] || K.sc, d = SF.nd === 'asc' ? 1 : -1;
  L.sort((a, b) => { const x = f(a), y = f(b); return (x < y ? -1 : x > y ? 1 : 0) * d || b.sc - a.sc || a.c.obs - b.c.obs || a.n.localeCompare(b.n) || VO[a.v] - VO[b.v]; });
  const card = (k, t, n) => `<button type="button" data-nk="${k}" aria-pressed="${SF.nk === k}"${n ? '' : ' class="zero"'}><b>${n}</b><span>${t}</span></button>`;
  const th = (k, t) => `<th${k === 'c' ? ' class="n"' : ''}><button type="button" data-ns="${k}"${SF.ns === k ? ` class="on" aria-sort="${SF.nd === 'asc' ? 'ascending' : 'descending'}"` : ''}>${t}${SF.ns === k ? (SF.nd === 'asc' ? ' ▲' : ' ▼') : ''}</button></th>`;
  box.innerHTML = `<div class="adm-kpis adm-kpis-row adm-nkpis">${card('', 'All', base.length)}${Object.keys(T).map(k => card(k, T[k], base.filter(has(k)).length)).join('')}</div>
    <div class="adm-tscroll"><table class="adm-tbl adm-needs"><thead><tr>${th('n', 'Genus')}${th('v', 'View')}${th('c', 'Colonies')}${th('sc', 'Why')}</tr></thead><tbody>
    ${L.map(o => `<tr data-g="${esc(o.n)}"><td><a class="adm-gen" href="#${esc(o.n)}"><i>${esc(o.n)}</i></a></td><td>${esc(o.vt)}</td><td class="n">${o.c.obs}</td>
      <td>${o.why.map(([k, t]) => `<span class="adm-why w-${k}${SF.nk === k ? ' on' : ''}" title="${T[k]}">${esc(t)}</span>`).join(' ')}</td></tr>`).join('')}</tbody></table>${L.length ? '' : '<p class="note">None.</p>'}</div>`;
  const save = () => { store.set('imr-admin-stats', SF); needsBody(); };
  box.querySelectorAll('[data-nk]').forEach(b => b.onclick = () => { SF.nk = SF.nk === b.dataset.nk ? '' : b.dataset.nk; save(); });
  box.querySelectorAll('[data-ns]').forEach(b => b.onclick = () => { const k = b.dataset.ns;
    SF.nd = SF.ns === k ? (SF.nd === 'asc' ? 'desc' : 'asc') : (k === 'sc' ? 'desc' : 'asc'); SF.ns = k; save(); });
  box.querySelectorAll('.adm-needs tbody tr').forEach(tr => tr.onclick = e => { if (!e.target.closest('a')) location.hash = encodeURIComponent(tr.dataset.g); });
}
const VIEW_T = {wide: 'Colony', medium: 'Closer', macro: 'Corallites', cand: 'Candidate'};
const ORIGIN_T = {imr: 'IMR', own: 'Own', dauin: 'iNat Dauin', ph: 'iNat Philippines', world: 'iNat world', book: 'CF book'};
function statsPhotos(){
  const PS = photoStats(), L = allPhotos().filter(p => PS[p.f] && PS[p.f][1] >= SF.min).map(p => ({...p, d: PS[p.f][0], n: PS[p.f][1], ok: PS[p.f][2]}));
  const head = `${statSwitch()}<div class="adm-shead"><h2>Photo difficulty</h2>${segBtns('min', [[1, '≥1'], [3, '≥3'], [10, '≥10']])}<span class="note">answers</span>${eloSeg()}</div>`;
  if (!L.length) { $v.innerHTML = head + '<p class="note">No answers yet.</p>'; bindStats(); return; }
  const ds = L.map(p => p.d).sort((a, b) => a - b), mean = a => a.reduce((t, x) => t + x, 0) / a.length;
  const med = ds[Math.floor(ds.length / 2)], sd = Math.sqrt(mean(ds.map(x => (x - mean(ds)) ** 2)));
  // Histogram, 0.1 wide bins, stacked by view.
  const lo = Math.floor(ds[0] * 10), hi = Math.floor(ds[ds.length - 1] * 10), H = [];
  for (let b = lo; b <= hi; b++) H.push({b, v: {}});
  L.forEach(p => { const h = H[Math.floor(p.d * 10) - lo]; h.v[p.view] = (h.v[p.view] || 0) + 1; });
  const hm = Math.max(...H.map(h => Object.values(h.v).reduce((t, x) => t + x, 0)));
  const group = key => { const O = {}; L.forEach(p => (O[key(p)] = O[key(p)] || []).push(p)); return O; };
  const rowsOf = (O, T) => Object.entries(O).map(([k, a]) => ({k, t: T ? T[k] || k : k, a, m: mean(a.map(p => p.d)), n: a.reduce((t, p) => t + p.n, 0), ok: a.reduce((t, p) => t + p.ok, 0)})).sort((a, b) => b.m - a.m);
  const V = rowsOf(group(p => p.view), VIEW_T), S = rowsOf(group(origin), ORIGIN_T), GN = rowsOf(group(p => p.genus));
  // Dot strip scale: the spread of the photos shown, at least -1..+1.
  const x0 = Math.min(-1, Math.floor(ds[0] * 2) / 2), x1 = Math.max(1, Math.ceil(ds[ds.length - 1] * 2) / 2), X = d => (100 * (d - x0) / (x1 - x0)).toFixed(1) + '%';
  const strip = a => `<span class="adm-strip"><b style="left:${X(0)}"></b>${a.map(p => `<button type="button" class="v-${p.view}" style="left:${X(p.d)};top:calc(50% + ${({wide: -4, macro: 4})[p.view] || 0}px)" data-zf="${esc(p.f)}" data-g="${esc(p.genus)}" title="${esc(VIEW_T[p.view] || p.view)} ${sgn(p.d)} · ${p.ok}/${p.n}"></button>`).join('')}</span>`;
  const table = (Rw, first) => `<table class="adm-tbl"><thead><tr><th>${first}</th><th>Photos</th><th>Mean</th><th>Right</th></tr></thead><tbody>${Rw.map(r => `<tr><td>${esc(r.t)}</td><td class="n">${r.a.length}</td><td>${sgn(r.m)}</td><td>${pct(r.ok, r.n)}</td></tr>`).join('')}</tbody></table>`;
  const legend = `<p class="adm-legend">${Object.keys(VIEW_T).filter(v => L.some(p => p.view === v)).map(v => `<span><i class="v-${v}"></i>${VIEW_T[v]}</span>`).join('')}</p>`;
  $v.innerHTML = head + kpis([['Photos rated', L.length], ['Median', sgn(med)], ['Spread (SD)', sd.toFixed(2)], ['Hardest genus', `<i>${esc(GN[0].k)}</i>`]]) + `
    <div class="adm-sgrid">
    <section class="adm-scard"><h3>Distribution</h3><div class="adm-cols stack">${H.map(h => `<div title="${(h.b / 10).toFixed(1)} to ${((h.b + 1) / 10).toFixed(1)}">${Object.keys(VIEW_T).filter(v => h.v[v]).map(v => `<i class="v-${v}" style="height:${100 * h.v[v] / hm}%"></i>`).join('')}</div>`).join('')}</div>
      <p class="adm-axis"><span>${sgn(lo / 10)}</span><span>easier · harder</span><span>${sgn((hi + 1) / 10)}</span></p>${legend}</section>
    <section class="adm-scard"><h3>Views</h3>${table(V, 'View')}</section>
    <section class="adm-scard"><h3>Sources</h3>${table(S, 'Source')}</section>
    <section class="adm-scard wide"><h3>Genera</h3>${legend}<div class="adm-gstrips">${GN.map(r => `<div><a class="adm-gen" href="#${esc(r.k)}"><i>${esc(r.k)}</i></a><span class="n">${sgn(r.m)}</span>${strip(r.a)}</div>`).join('')}</div>
      <p class="adm-axis strip"><span>${sgn(x0)}</span><span>easier · harder</span><span>${sgn(x1)}</span></p></section>
    </div>`;
  bindStats();
}
