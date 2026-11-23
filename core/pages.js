  // Pages opened in a visit (the event 'pages'), to see whether the players who read the genus sheets progress faster.
  // First-party, one
  // summary a visit, no free text: which pages were open, how many times and for how long (seconds visible, the page in
  // view), and the genus sheets opened: how many times, for how long, how the first one was reached (from: the quiz
  // feedback, a Learn page, My progress, anything else) and whether the genus had already been asked to the player
  // then (asked). The app keeps the tally (sync.js pagesRoute) with these pure functions; the sheet cleans what arrives
  // with pagesClean (Code.gs events_, through its embedded copy of this file).
  const PAGES = {
    ROUTES: 30, // at most this many page names a summary, the most opened first
    GEN: 30, // at most this many genus sheets a summary
    MAXN: 1000, // openings of one page counted at most
    MAXS: 86400, // seconds of one page counted at most
    RE: /^[a-zA-Z0-9~][a-zA-Z0-9~|_.-]{0,39}$/, // a page name (a hash without its parameters)
    GENUS: /^[A-Z][a-z]{2,30}$/,
    FROM: ['quiz', 'learn', 'progress', 'other'],
    // The answer's feedback sheet (docs/decisions/2026-11-18-feedback-sheet.md): four numbers a visit, in this order: the
    // answers whose feedback was shown, those where More was
    // opened, the seconds the feedback stayed on screen (each answer's capped at FBSEC) and the taps on a link inside it.
    // Counts only, no answer, unit or time of day; the first number is the denominator.
    FB: ['shown', 'more', 'sec', 'link'],
    FBMAX: 10000, // answers (or taps) counted in one summary, at most
    FBSEC: 120 // seconds one answer's feedback counts at most
  };
  // The screen a summary was sent from (the screen sizes the players really use, for the multi-photo game formats): the
  // usable CSS viewport (innerWidth, innerHeight), each rounded to STEP px, the pixel
  // ratio to one decimal, the orientation (p: portrait, height >= width, as CSS's orientation; l: landscape), and the
  // width band of its short side (b: how many BANDS edges it is above: 0 ≤360, 1 361-390, 2 391-414, 3 415-600, 4 more),
  // taken on the device from the exact width, since a 10 px grid cannot keep the edges (a 393 px phone rounds to 390).
  // Coarse on purpose (no fingerprinting beyond what a summary already says): nothing exact leaves the device, and the
  // sheet rounds and clamps again (pagesClean). Sent only once the sheet keeps it (sync.js VIEWPORT_SHEET, rule D4).
  const VIEWPORT = {
    STEP: 10,
    MAX: 10000, // px, either side
    DPR: [0.5, 8], // the pixel ratio kept within these
    BANDS: [360, 390, 414, 600]
  };
  const vpBand = s => VIEWPORT.BANDS.filter(e => s > e).length;
  // {w, h, d, o, b} from the exact width, height and pixel ratio; null when one is not a positive number.
  function viewportOf(w, h, dpr) {
    const W = Number(w),
      H = Number(h),
      D = Number(dpr);
    if (!(W > 0 && H > 0 && D > 0 && isFinite(W) && isFinite(H) && isFinite(D))) return null;
    const px = v => Math.min(VIEWPORT.MAX, Math.round(v / VIEWPORT.STEP) * VIEWPORT.STEP);
    return {
      w: px(W),
      h: px(H),
      d: Math.round(Math.max(VIEWPORT.DPR[0], Math.min(VIEWPORT.DPR[1], D)) * 10) / 10,
      o: H >= W ? 'p' : 'l',
      b: vpBand(Math.min(W, H))
    };
  }
