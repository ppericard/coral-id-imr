// The offer to install the app, moved out of app.js (REE-64, one piece at a time; behaviour unchanged). A classic script of
// tier 1, loaded right after app.js (index.html), so its names are globals like app.js's own and app.js's (store here at
// load; cardShow, hashNow, setOpen, lb, $set, $helpbox, ORG, esc later, when the page runs) are already declared. Its
// set-up (the visit's record, the two install events, the ⚙ row) runs once, when the script does.
// Install the app (docs/ARCHITECTURE.md "Install the app"): our button calls the browser's prompt (beforeinstallprompt)
// or, on iPhone and iPad Safari, the card shows the steps. Offered once on a touch screen (rule U4), from INSTALL.VISITS visits or
// INSTALL.ANSWERS answers, on Home at a calm moment (a prompt: promptOk, noticeLater); ⚙ keeps a row any time.
// reefid-install (this device): {n: visits, t: the last load, x: the card closed (time), in: installed (time)}.
const INSTALL = {KEY: 'reefid-install', VISITS: 3, ANSWERS: 10, GAP: 30 * 60000, WAIT: 1500};
// The record after a load at time now: a new visit when the last load was INSTALL.GAP or more before (a reload is none).
const installVisit = (r, now) => {
  const R = r && typeof r === 'object' ? r : {},
    n = typeof R.n === 'number' ? R.n : 0,
    same = typeof R.t === 'number' && now >= R.t && now - R.t < INSTALL.GAP;
  return {...R, n: same ? n : n + 1, t: now};
};
// iPhone or iPad Safari (an iPad asks for the desktop site: a Mac with a touch screen), not another browser or an app's
// own browser (Chrome, Firefox, Edge, Opera, Google, Facebook, Instagram on iOS: no "Version/… Safari", or their token).
const installIos = (ua, touch) =>
  (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && touch > 1)) &&
  /Version\/[\d.]+.*Safari\//.test(ua) &&
  !/CriOS|FxiOS|EdgiOS|OPiOS|GSA\/|FBAN|FBAV|Instagram/.test(ua);
// Whether the card is due. way: 'prompt' (the browser's install prompt is ready), 'ios' (the steps) or '' (nothing to
// offer). Pure on its inputs: tests call it.
const installDue = ({standalone, rec, way, touch, answers}) => {
  const R = rec && typeof rec === 'object' ? rec : {};
  return !standalone && !R.x && !R.in && !!way && !!touch && ((R.n || 0) >= INSTALL.VISITS || answers >= INSTALL.ANSWERS);
};
let installEv = null,
  installT = 0;
const installStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const installWay = () => (installEv ? 'prompt' : installIos(navigator.userAgent, navigator.maxTouchPoints || 0) ? 'ios' : '');
const installMark = k => store.set(INSTALL.KEY, {...(store.get(INSTALL.KEY, {}) || {}), [k]: Date.now()});
// This load: one more visit if it is one; opened as the installed app, installed.
{
  const r = installVisit(store.get(INSTALL.KEY, null), Date.now());
  store.set(INSTALL.KEY, installStandalone() && !r.in ? {...r, in: Date.now()} : r);
}
addEventListener('beforeinstallprompt', e => {
  e.preventDefault(); // no bar of the browser's own: the card and the ⚙ row offer it
  installEv = e;
  const r = document.getElementById('instrow');
  if (r) r.hidden = installStandalone();
  if (window.APP_READY) installNudge(); // it can come after Home was drawn
});
addEventListener('appinstalled', () => {
  installEv = null;
  installMark('in');
  document.querySelectorAll('.unlock.install').forEach(d => d.close('installed'));
});
// The browser's prompt, once (an event's prompt can be used only once; the browser may send a new one later).
function installPrompt() {
  const e = installEv;
  if (!e) return installCard(false);
  installEv = null;
  Promise.resolve()
    .then(() => e.prompt())
    .then(() => e.userChoice)
    .then(c => c && c.outcome === 'accepted' && installMark('in'))
    .catch(() => {});
}
// The steps' icons (the app's SVG set; 18 px, stroke 2): Safari's Share and Add to Home Screen.
const INSTALL_ICONS = {
  share: '<path d="M12 3v11M8 7l4-4 4 4"/><path d="M8 10H6a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1h-2"/>',
  add: '<rect x="4" y="4" width="16" height="16" rx="3.5"/><path d="M12 8.5v7M8.5 12h7"/>'
};
const installIcon = k =>
  `<svg class="insti" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${INSTALL_ICONS[k]}</svg>`;
// The card: once (the nudge: closed for good however it closes, but by leaving the page) or from ⚙ (no mark).
function installCard(once) {
  const way = installWay(),
    why = `<p>Add ${esc(ORG.app)} to your home screen: one tap opens it, full screen, with no link to find again.</p>`, // rule W21: the name from ORG
    body =
      way === 'prompt'
        ? why
        : way === 'ios'
          ? `${why}<ol class="instl"><li>Tap <b>Share</b> ${installIcon('share')} in Safari. On a recent iPhone, tap <b>•••</b> first.</li><li>Tap <b>Add to Home Screen</b> ${installIcon('add')} (scroll down the list if you don't see it).</li><li>Tap <b>Add</b>.</li></ol>`
          : `<p>Open your browser's menu and choose <b>Install app</b> or <b>Add to Home screen</b>.</p><p class="note">Opened the link inside another app, such as a chat? Open it in Chrome or Safari first.</p>`;
  cardShow({
    kind: 'feature',
    cls: 'install',
    visual: '<img class="instapp" src="icon.svg" alt="" width="60" height="60">',
    kick: 'Install the app',
    title: 'Keep it on your home screen',
    body,
    primary: way === 'prompt' ? {text: 'Install the app', on: installPrompt} : {text: 'Got it'},
    secondary: way === 'prompt' && once ? {text: 'No thanks'} : null,
    note: once ? 'Later: ⚙ Settings, Install the app.' : '',
    esc: way === 'prompt' && once ? 2 : 1,
    onClose: how => once && how !== 'route' && how !== 'empty' && installMark('x')
  });
}
// The nudge, at a calm moment on Home (route, and app.js SETUP 3 once the prompts' spacing is loaded).
function installNudge() {
  clearTimeout(installT);
  const home = () => (hashNow() || 'home') === 'home',
    due = () =>
      installDue({
        standalone: installStandalone(),
        rec: store.get(INSTALL.KEY, null),
        way: installWay(),
        touch: matchMedia('(pointer: coarse)').matches,
        answers: typeof answersAll === 'function' ? answersAll() : 0
      });
  if (!home() || !due() || (typeof noticeLater === 'function' && noticeLater('install', installNudge))) return;
  installT = setTimeout(() => {
    const busy = !lb.hidden || !$helpbox.hidden || !$set.hidden || document.querySelector('.apptoast, .unlock');
    if (!home() || busy || !due() || typeof promptOk !== 'function' || !promptOk()) return;
    promptMark();
    installCard(true);
  }, INSTALL.WAIT);
}
// ⚙ Settings › Install the app: the browser's prompt at once where it has one, else the card with the steps.
{
  const r = document.getElementById('instrow');
  r.hidden = installStandalone();
  document.getElementById('instb').onclick = () => {
    setOpen(false);
    installPrompt();
  };
}
