// An init script of every smoke's context (tests/calm.js): core.js's FA_CHECK on from the moment core.js defines it, so
// every false-alarm rate the app reads from its table (app.js faHeld, core.js faArm) is checked against the scan, and a
// difference throws in the page (a pageerror the smoke reports). The table is a speed-up only: the smokes prove it.
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
})();
