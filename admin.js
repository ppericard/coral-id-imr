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

let DATA, SAVED = {v: 1, genera: {}}, SHA = null, DRAFT, TOKEN = null, cur = null;

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
    <p class="note">${has ? '<button type="button" class="adm-link" id="forget">Forget this device</button> (removes the stored token) · ' : ''}<button type="button" class="adm-link" id="ro">Look around without saving</button> (you can still download the JSON)</p>
  </section>`;
  $('pw').focus();
  $('lockf').onsubmit = async e => {
    e.preventDefault(); const b = e.submitter; b.disabled = true; b.textContent = 'Checking…';
    try {
      if (has) { try { TOKEN = await unlockToken($('pw').value); } catch (x) { throw new Error('Wrong password.'); } }
      else { if ($('pw').value !== $('pw2').value) throw new Error('The two passwords differ.'); TOKEN = $('tok').value.trim(); }
      await checkToken();
      if (!has) await lockToken($('pw').value, TOKEN);
      start();
    } catch (x) { TOKEN = null; lockScreen(x.message); }
  };
  $('ro').onclick = () => start();
  if (has) $('forget').onclick = () => { if (confirm('Remove the stored token from this browser?')) { store.set('imr-admin-vault', null); lockScreen(); } };
}

/* ---------- Photos of a genus, as the genus sheet orders them ---------- */
function photos(n){
  const g = DATA.gen[n], two = g.levels === 2, L = [];
  VIEWS.forEach(([v]) => { (g.views[v] || []).forEach(p => L.push({...p, base: v})); ((g.more || {})[v] || []).forEach(p => L.push({...p, base: v, multi: true, extra: true})); });
  (DATA.course[n] || []).forEach(p => L.push({...p, base: p.v === 'medium' && two ? 'macro' : p.v}));
  return L;
}
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
const srcTag = p => p.imr ? '<span class="adm-src imr">IMR lecture</span>' : p.own ? '<span class="adm-src own">Pierre</span>' : '<span class="adm-src inat">iNaturalist</span>';

/* ---------- Edits ---------- */
function edit(n, fn){
  const k = clone(entry(n)); fn(k);
  ['feat', 'move'].forEach(x => { if (k[x] && !Object.keys(k[x]).length) delete k[x]; });
  if (k.hide && !k.hide.length) delete k.hide;
  if (Object.keys(k).length) DRAFT.genera[n] = k; else delete DRAFT.genera[n];
  store.set('imr-curation-draft', DRAFT); render();
}
const ensureFeat = (k, n, v) => { k.feat = k.feat || {}; if (!k.feat[v]) k.feat[v] = rowOf(n, v).feat.map(p => p.f); return k.feat[v]; };
const dropFeat = (k, f) => Object.keys(k.feat || {}).forEach(v => { k.feat[v] = k.feat[v].filter(x => x !== f); if (!k.feat[v].length) delete k.feat[v]; });
const ACT = {
  cover: (n, f) => edit(n, k => { if (k.cover === f) delete k.cover; else k.cover = f; }),
  feat: (n, f, v) => edit(n, k => { const L = ensureFeat(k, n, v);
    if (L.includes(f)) { L.splice(L.indexOf(f), 1); if (!L.length) { toast('A view needs at least one featured photo: back to the automatic pick.'); delete k.feat[v]; } }
    else if (L.length >= FEAT) toast(`Already ${FEAT} featured: remove one first.`); else L.push(f); }),
  left: (n, f, v) => edit(n, k => { const L = ensureFeat(k, n, v), i = L.indexOf(f); if (i > 0) [L[i - 1], L[i]] = [L[i], L[i - 1]]; }),
  right: (n, f, v) => edit(n, k => { const L = ensureFeat(k, n, v), i = L.indexOf(f); if (i >= 0 && i < L.length - 1) [L[i + 1], L[i]] = [L[i], L[i + 1]]; }),
  hide: (n, f) => edit(n, k => { k.hide = k.hide || []; if (k.hide.includes(f)) k.hide = k.hide.filter(x => x !== f); else { k.hide.push(f); dropFeat(k, f); if (k.cover === f) delete k.cover; } }),
  move: (n, f, v, to) => edit(n, k => { const p = photos(n).find(x => x.f === f); k.move = k.move || {}; if (to === p.base) delete k.move[f]; else k.move[f] = to; dropFeat(k, f); }),
  reset: n => { if (confirm(`Undo every choice for ${n} (back to the automatic photos)?`)) edit(n, k => Object.keys(k).forEach(x => delete k[x])); },
  revert: n => { DRAFT.genera[n] = clone(SAVED.genera[n]); if (!DRAFT.genera[n]) delete DRAFT.genera[n]; store.set('imr-curation-draft', DRAFT); render(); }
};

/* ---------- Rendering ---------- */
const changed = () => [...new Set([...Object.keys(DRAFT.genera), ...Object.keys(SAVED.genera)])].filter(n => !same(DRAFT.genera[n], SAVED.genera[n]));
function tile(n, p, v, st){
  const k = entry(n), isCover = k.cover === p.f, two = DATA.gen[n].levels === 2;
  const moves = VIEWS.filter(([w]) => w !== v && !(two && w === 'medium')).map(([w]) => `<option value="${w}">${label(n, w)}</option>`).join('');
  return `<figure class="adm-tile ${st.cls || ''}${isCover ? ' is-cover' : ''}" data-f="${esc(p.f)}" data-v="${v}">
    <button type="button" class="adm-ph" data-act="zoom" aria-label="Enlarge"><img src="${img(p, 1)}" alt="" loading="lazy"></button>
    ${st.num ? `<span class="adm-num${st.auto ? ' auto' : ''}" title="${st.auto ? 'Featured automatically' : 'Featured by you'}">${st.num}</span>` : ''}
    ${isCover ? '<span class="adm-covermark">Cover</span>' : ''}
    <figcaption>${srcTag(p)}${p.multi ? '<span class="adm-src multi" title="Several corals in frame: never used in games">several corals</span>' : ''}<span class="adm-t">${esc(p.imr ? 'slide ' + p.slide : p.t || '')}</span></figcaption>
    <div class="adm-acts">
      ${st.cls === 'is-hidden' ? `<button type="button" data-act="hide" class="on">Show again</button>` : `
      <button type="button" data-act="cover" class="${isCover ? 'on' : ''}" title="Use as the genus photo (cards, sheet hero)">★ Cover</button>
      <button type="button" data-act="feat" class="${st.num && !st.auto ? 'on' : ''}" title="Show in the main strip of this view">${st.num ? 'Featured' : 'Feature'}</button>
      ${st.num && !st.auto ? `<button type="button" data-act="left" aria-label="Move earlier" ${st.num === 1 ? 'disabled' : ''}>‹</button><button type="button" data-act="right" aria-label="Move later" ${st.last ? 'disabled' : ''}>›</button>` : ''}
      <button type="button" data-act="hide" title="Hide everywhere (sheets, cards, games)">Hide</button>
      <select data-act="move" aria-label="Move to another view"><option value="">Move to…</option>${moves}</select>`}
    </div></figure>`;
}
function render(){
  const names = Object.keys(DATA.gen); if (!DATA.gen[cur]) cur = names[0];
  const ch = changed(), n = cur, g = DATA.gen[n], cv = coverOf(n), k = entry(n);
  $('status').textContent = ch.length ? `${ch.length} ${ch.length > 1 ? 'genera' : 'genus'} not saved` : TOKEN ? 'All saved' : 'Download only';
  $('status').classList.toggle('dirty', !!ch.length);
  $('save').disabled = !TOKEN || !ch.length; $('save').title = TOKEN ? '' : 'Unlock with a token to save';
  $('preview').href = `./?draft#g-${encodeURIComponent(n)}`;
  const side = names.map(m => { const c = coverOf(m), e = DRAFT.genera[m] || {}, dirty = ch.includes(m), h = (e.hide || []).length;
    return `<a href="#${esc(m)}" class="adm-g${m === n ? ' cur' : ''}"${m === n ? ' aria-current="true"' : ''}>${c ? `<img src="${img(c, 1)}" alt="" loading="lazy">` : '<span class="none"></span>'}<span><i>${esc(m)}</i>
      <small>${DATA.gen[m].n ? 'No. ' + DATA.gen[m].n : '★'}${c && c.view === 'macro' && DATA.gen[m].levels !== 2 ? ' · <b class="warnc" title="The cover is a corallite close-up">macro cover</b>' : ''}${h ? ` · ${h} hidden` : ''}</small></span>${dirty ? '<b class="dot" title="Not saved">●</b>' : Object.keys(e).length ? '<b class="dot done" title="Curated">✓</b>' : ''}</a>`; }).join('');
  const body = rows(n).map(([v]) => { const r = rowOf(n, v);
    return `<section class="adm-row"><h3>${label(n, v)} <small>${r.feat.length} featured${r.auto ? ' (automatic)' : ''} · ${r.rest.length} more${r.hid.length ? ` · ${r.hid.length} hidden` : ''}</small></h3>
      <div class="adm-grid">${r.feat.map((p, i) => tile(n, p, v, {num: i + 1, auto: r.auto, last: i === r.feat.length - 1, cls: 'is-feat'})).join('')}${r.rest.map(p => tile(n, p, v, {})).join('')}${r.hid.map(p => tile(n, p, v, {cls: 'is-hidden'})).join('')}</div>
      ${r.feat.length + r.rest.length ? '' : '<p class="note">No photo in this view.</p>'}</section>`; }).join('');
  $v.innerHTML = `<div class="adm">
    <nav class="adm-side" aria-label="Genera"><select id="gsel" aria-label="Genus">${names.map(m => `<option${m === n ? ' selected' : ''}>${esc(m)}</option>`).join('')}</select><div class="adm-list">${side}</div></nav>
    <section class="adm-main">
      <div class="adm-head">
        ${cv ? `<button type="button" class="adm-cover" data-f="${esc(cv.f)}" data-act="zoomcover"><img src="${img(cv)}" alt="${esc(n)} cover"></button>` : ''}
        <div><h2><i>${esc(n)}</i></h2><p class="note">${g.n ? 'No. ' + g.n : '★ not surveyed'} · ${esc(g.fam)}</p>
          <p class="note"><b>Cover:</b> ${cv ? `${cv.picked ? 'your pick' : 'automatic'} · ${label(n, cv.view).toLowerCase()} view${cv.view === 'macro' && g.levels !== 2 ? ' <b class="warnc">(a corallite close-up: pick a colony or closer view)</b>' : ''}` : 'none'}</p>
          <p class="note">Featured photos fill the main strip of each view on the genus sheet (up to ${FEAT}); the others stay under “more photos”. Hidden photos disappear everywhere, games included.</p>
          <p class="adm-gacts">${ch.includes(n) ? '<button type="button" class="chip" data-act="revert">Undo unsaved changes</button>' : ''}${Object.keys(k).length ? '<button type="button" class="chip" data-act="reset">Back to automatic</button>' : ''}<a class="chip" href="./?draft#g-${encodeURIComponent(n)}" target="_blank" rel="noopener">Open the sheet</a></p>
        </div>
      </div>
      ${body}
    </section></div>`;
  $('gsel').onchange = e => { location.hash = e.target.value; };
  $v.querySelectorAll('[data-act]').forEach(el => {
    const t = el.closest('[data-f]'), f = t && t.dataset.f, v = t && t.dataset.v, a = el.dataset.act;
    if (a === 'move') el.onchange = () => el.value && ACT.move(n, f, v, el.value);
    else if (a === 'zoom' || a === 'zoomcover') el.onclick = () => zoom(n, f);
    else el.onclick = () => ACT[a](n, f, v);
  });
  const c = $v.querySelector('.adm-g.cur'); if (c) c.scrollIntoView({block: 'nearest'});
}
function zoom(n, f){
  const lb = $('lightbox'), L = photos(n), i0 = L.findIndex(p => p.f === f); let i = i0;
  const show = () => { const p = L[i]; lb.innerHTML = `<div class="lb-in"><img src="${img(p)}" alt=""><p class="lb-cap"><i>${esc(n)}</i> · ${label(n, viewOf(n, p))} · ${p.imr ? 'IMR Lecture 6, slide ' + p.slide : esc(p.a || '')} · <code>${esc(p.f)}</code></p>
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

/* ---------- Save / download ---------- */
const output = () => { const genera = {}; Object.keys(DATA.gen).filter(n => DRAFT.genera[n]).forEach(n => { genera[n] = DRAFT.genera[n]; }); return {v: 1, genera}; };
async function save(){
  const ch = changed(); if (!ch.length || !TOKEN) return;
  const b = $('save'); b.disabled = true; b.textContent = 'Saving…';
  try {
    const out = output(), text = JSON.stringify(out, null, 2) + '\n';
    const msg = `Photo curation: ${ch.slice(0, 6).join(', ')}${ch.length > 6 ? ` and ${ch.length - 6} more` : ''}`;
    const r = await gh(`/contents/${FILE}`, {method: 'PUT', body: JSON.stringify({message: msg, content: toB64(text), branch: BRANCH, ...(SHA ? {sha: SHA} : {})})});
    SHA = r.content.sha; SAVED = clone(out); DRAFT = clone(out); store.set('imr-curation-draft', DRAFT);
    toast('Saved. The site shows it within a minute or two.');
  } catch (x) { toast(/does not match|sha/i.test(x.message) ? 'Someone saved in the meantime: reload the page, your changes are kept.' : 'Not saved: ' + x.message); }
  b.textContent = 'Save to site'; render();
}
function download(){
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(output(), null, 2) + '\n'], {type: 'application/json'}));
  a.download = FILE; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* ---------- Start ---------- */
async function start(){
  $v.innerHTML = '<p class="note">Loading photos…</p>';
  try { [DATA] = await Promise.all([fetch('data.json', {cache: 'no-cache'}).then(r => r.json()), loadSaved()]); }
  catch (x) { $v.innerHTML = `<p class="warn">Could not load: ${esc(x.message)}</p>`; return; }
  // Unsaved edits from an earlier visit are kept, on top of what is saved.
  const old = store.get('imr-curation-draft', null);
  DRAFT = old && old.genera ? old : clone(SAVED);
  const keep = changed().length; if (keep) toast(`Unsaved changes for ${keep} ${keep > 1 ? 'genera' : 'genus'} from your last visit are kept.`);
  $('tools').hidden = false; $('save').onclick = save; $('download').onclick = download;
  cur = decodeURIComponent(location.hash.slice(1)) || Object.keys(DATA.gen)[0];
  window.onhashchange = () => { cur = decodeURIComponent(location.hash.slice(1)); render(); window.scrollTo({top: 0}); };
  window.onbeforeunload = e => { if (TOKEN && changed().length) { e.preventDefault(); e.returnValue = ''; } };
  render();
}
lockScreen();
