// An init script of every smoke's context (tests/calm.js): core.js's FA_CHECK on from the moment core.js defines it, so
// every false-alarm rate the app reads from its table (app.js faHeld, core.js faArm) is checked against the scan, and a
// difference throws in the page (a pageerror the smoke reports). The table is a speed-up only: the smokes prove it.
// Likewise sync.js's KEPT_CHECK (the storage read once: keptGet, keptBy, keptPush), which sync.js turns on when it finds
// KEPT_CHECK_ON: every kept value is checked against a fresh store.get. And app.js's VIEW_CHECK (the views of the state
// version: stateView), which app.js turns on when it finds VIEW_CHECK_ON: every read of a kept view is computed again
// and compared, order included.
(() => {
  let v;
  Object.defineProperty(window, 'FA_CHECK', {
    configurable: true,
    get: () => v,
    set: x => {
      v = x;
      if (x && typeof x === 'object') x.on = true;
    }
  });
  window.KEPT_CHECK_ON = true;
  window.VIEW_CHECK_ON = true;
})();
