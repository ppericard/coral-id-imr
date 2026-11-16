// Sea slug subject test (study docs/reviews/2026-11-15-nudibranch-mode-study.md §9, step 5; core.js SUBJECTS seaslug,
// app.js UNITS seaslug): runs the real app in Chromium on seaslug.json and seaslug-game.json and checks both sides of its
// beta gate (rule S1, open: 'group', as the fish's beta: tests/fish.smoke.js 6, 6b):
// 1. a player who is not the admin and in no group, its subject saved as the sea slugs, opens on the corals: the switch
//    offers no sea slugs, the sea-slug files are never fetched, the saved choice stays;
// 2. the admin opens the sea-slug quiz: 4 genera by their scientific names (its units from the start, core.js SUBJECTS
//    unitRank; Pierre, 2026-11-16), a photo from the game file (iNaturalist, stubbed here: nothing leaves the machine),
//    answers right and wrong, the photo's species named under the verdict; 30 questions, every one on a circle-1 genus
//    (circle 2 opens once every circle-1 genus has been asked: app.js fishGate), each logged at the genus, no family
//    asked and no opt-in genus offer; the genera page in blocks of their families, a family sheet, a genus sheet, Home's
//    doors and the key page in the sea slugs' words; the switch to the fish and back swaps the tree in force (app.js
//    treeAt), each subject's progress kept apart;
// 3. a player in the sea-slug group (the sheet's groups, stubbed through the account's GROUPS_KEY record) sees it too.
// Locally: node tests/seaslug.smoke.js (in the machine slot, tests/slot.js).
const http = require('http'),
  fs = require('fs'),
  path = require('path');
const {chromium} = require('./calm.js');
const slot = require('./slot.js');
const qa = require('./answer.js');
const ROOT = path.join(__dirname, '..');
const F = JSON.parse(fs.readFileSync(path.join(ROOT, 'seaslug.json'), 'utf8'));
const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp'
};
const asked = [];
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname),
    f = path.join(ROOT, u.endsWith('/') ? u + 'index.html' : u);
  asked.push(u);
  if (!f.startsWith(ROOT)) return (res.writeHead(403), res.end());
  fs.readFile(f, (e, b) => {
    if (e) return (res.writeHead(404), res.end());
    res.writeHead(200, {'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream'});
    res.end(b);
  });
});
// A tiny image for every photo from iNaturalist (the sea slugs' are read from there until the R2 step).
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

async function page(b, base, init) {
  const ctx = await b.newContext({viewport: {width: 1280, height: 800}, serviceWorkers: 'block'});
  await ctx.route(
    u => !u.href.startsWith(base),
    r => (/inaturalist/.test(r.request().url()) ? r.fulfill({status: 200, contentType: 'image/png', body: PNG}) : r.abort())
  );
  await ctx.addInitScript(qa.PAGE);
  await ctx.addInitScript(init);
  const p = await ctx.newPage(),
    errs = [];
  p.on('pageerror', e => errs.push(e.message));
  return {ctx, p, errs};
}
const ready = p => p.waitForFunction(() => window.APP_READY, null, {timeout: 30000});

(async () => {
  await slot('seaslug.smoke');
  await new Promise(ok => server.listen(0, '127.0.0.1', ok));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const b = await chromium.launch();
  const fails = [];
  const check = (ok, what) => ok || fails.push(what);

  // 1. Not the admin, in no group: the corals, and no sea-slug file asked for.
  {
    const {ctx, p, errs} = await page(b, base, () => {
      try {
        if (sessionStorage.getItem('s1')) return;
        sessionStorage.setItem('s1', '1');
        localStorage.setItem('reefid-tour', '"done"');
        localStorage.setItem('reefid-sync-subject', '"seaslug"');
        localStorage.setItem('reefid-sync-coral-start', '{"c":"new","t":1}');
      } catch (e) {}
    });
    asked.length = 0;
    await p.goto(base + '#seaslug/practice/quiz');
    await ready(p);
    await p.waitForTimeout(1500);
    const o = await p.evaluate(() => ({
      subj: SUBJ.id,
      mine: subjMine().map(S => S.id),
      saved: localStorage.getItem('reefid-sync-subject'),
      btn: !!document.querySelector('[data-subj="seaslug"]'),
      hash: location.hash
    }));
    check(o.subj === 'coral', `1: a player outside the group is on ${o.subj}`);
    check(!o.mine.includes('seaslug') && !o.btn, `1: the switch offers the sea slugs: ${o.mine}`);
    check(o.saved === '"seaslug"', `1: the saved choice changed: ${o.saved}`);
    check(!asked.some(u => /seaslug/.test(u)), `1: sea-slug files fetched: ${asked.filter(u => /seaslug/.test(u))}`);
    check(!errs.length, '1: page errors: ' + errs.join('; '));
    await ctx.close();
  }

  // 2. The admin: the quiz, the pages, the switch and back.
  {
    const {ctx, p, errs} = await page(b, base, () => {
      try {
        if (sessionStorage.getItem('s2')) return;
        sessionStorage.setItem('s2', '1');
        localStorage.setItem('reefid-tour', '"done"');
        localStorage.setItem('reefid-admin-vault', 'smoke');
        localStorage.setItem('reefid-sync-subject', '"seaslug"');
        localStorage.setItem('reefid-sync-seaslug-start', '{"c":"new","t":1}');
        localStorage.setItem('reefid-sync-fish-start', '{"c":"new","t":1}');
        localStorage.setItem('reefid-sync-coral-start', '{"c":"new","t":1}');
      } catch (e) {}
    });
    await p.goto(base + '#seaslug/practice/quiz');
    await ready(p);
    await qa.ready(p);
    // Its units: the genera (core.js fishGen unit 'genus'); circle 1, a genus's best species' circle (seaslug.json).
    const fams = new Set(F.families.map(f => f.id)),
      gens = new Set(F.genera.map(g => g.id)),
      c1 = new Set(F.genera.filter(g => g.circle === 1).map(g => g.id));
    const q = await p.evaluate(() => {
      const L = [...document.querySelectorAll('#view .q [data-c]')].map(x => x.dataset.c), // answer.js: a read of the choices
        t = [...document.querySelectorAll('#view .q [data-c]')].map(x => x.textContent.trim()), // answer.js: a read of the choices
        ph = document.querySelector('#view .qph');
      return {L, t, at: TREE_AT, photo: ph ? getComputedStyle(ph).getPropertyValue('--qbg') : '', a: smokeAnswer()};
    });
    check(q.at === 'seaslug', `2: the tree in force is ${q.at}`);
    check(q.L.length === 4 && q.L.every(n => gens.has(n)), `2: the choices are not 4 sea-slug genera: ${q.L}`);
    check(
      q.t.every(x => /^[A-Z][a-z]+$/.test(x.replace(/^\d\s*/, '')) && !/idae$/.test(x)),
      `2: a choice not named by its scientific genus name: ${q.t}`
    );
    check(/inaturalist-open-data/.test(q.photo), `2: the photo is not the game file's iNaturalist one: ${q.photo}`);
    const v = await p.evaluate(() => ({
      right: !!document.querySelector('#view .q.done'),
      sp: (document.querySelector('#view .fbsp') || {}).textContent || ''
    }));
    check(v.right, '2: the right answer did not close the question');
    check(/This photo: \S+ \S+/.test(v.sp) && !/·/.test(v.sp), `2: the species line is not one scientific name: "${v.sp}"`);
    // More answers, right and wrong (30 in all), every one on a circle-1 genus: circle 2 waits until every circle-1 genus
    // has been asked (fishGate), more than 30 answers away; no family asked, no opt-in genus offer (no SETS).
    const seen = [q.a.t];
    for (let i = 0; i < 29; i++) {
      // Next, and the first-meeting cards of the genera that open, closed as a player's Got it would
      for (let k = 0; k < 10 && !(await qa.ready(p, {timeout: 1500, optional: true})); k++) {
        if (await p.$('.unlock [data-b="1"]')) await p.click('.unlock [data-b="1"]');
        else
          await p.evaluate(() =>
            (document.querySelector('#view .q.done .next') || document.querySelector('#view button.next') || {click() {}}).click()
          );
      }
      await qa.ready(p);
      const a = await p.evaluate(k => smokeAnswer(k % 3 !== 0), i);
      seen.push(a.t);
    }
    check(
      seen.every(n => c1.has(n)),
      `2: a question off the circle-1 genera: ${seen.filter(n => !c1.has(n))}`
    );
    const pr = await p.evaluate(() => ({
      s: Object.keys(JSON.parse(localStorage.getItem('reefid-sync-seaslug-progress') || '{}')),
      f: Object.keys(JSON.parse(localStorage.getItem('reefid-sync-fish-progress') || '{}')),
      // what each answer logs (quiz.js logAnswer: the device's log while signed out): its subject and the rank asked
      rk: [
        ...new Set(
          store
            .get(LOG0, [])
            .filter(x => x.s === SUBJ.id && x.m !== WINK_MODE)
            .map(x => x.rk)
        )
      ],
      sets: SETS().length,
      met: slateGenera().filter(n => introduced(n)).length,
      slate: slateGenera().length
    }));
    const units = pr.s.filter(n => !n.startsWith('~')); // the record's own keys (~level) apart
    check(units.length && units.every(n => c1.has(n)), `2: the sea-slug progress: ${pr.s}`);
    check(!pr.f.some(n => gens.has(n) || fams.has(n)), `2: sea-slug units in the fish progress: ${pr.f}`);
    check(pr.rk.length === 1 && pr.rk[0] === 'genus', `2: the answers are not logged at the genus: ${pr.rk}`);
    check(pr.sets === 0, `2: the sea slugs have an opt-in set: ${pr.sets}`);
    check(pr.slate === F.genera.length && pr.met > 3, `2: the slate ${pr.slate} (of ${F.genera.length} genera), ${pr.met} met`);
    // The genera page (its families as blocks), a family sheet, a genus sheet, Home and the key page.
    await p.goto(base + '#seaslug/learn/families');
    await p.waitForFunction(
      ([g, f]) => {
        const v = document.querySelector('#view');
        // the line goes behind the page's ? (pageHelp), hence the body's text
        return (
          v.innerText.includes(g) &&
          /sea slug genera/.test(document.body.textContent) &&
          [...v.querySelectorAll('.gdiv')].some(h => h.textContent === f)
        );
      },
      [F.genera[0].name, F.families[0].name],
      {timeout: 15000}
    );
    const fam = F.families[0];
    await p.goto(base + '#seaslug/learn/family/' + encodeURIComponent(fam.name));
    await p.waitForFunction(n => (document.querySelector('#view') || {}).innerText.includes(n), fam.name, {timeout: 15000});
    const gs = await p.evaluate(g => hr('g-' + g), F.genera[0].id);
    await p.goto(base + gs);
    await p.waitForFunction(n => (document.querySelector('#view') || {}).innerText.includes(n), F.genera[0].name, {timeout: 15000});
    await p.goto(base + '#seaslug');
    await p.waitForFunction(() => /Identify a sea slug/.test(document.querySelector('#view').innerText), null, {timeout: 15000});
    const home = await p.evaluate(() => document.querySelector('#view').innerText);
    check(!/EventMeasure|Identify a fish/.test(home), "2: Home in the fish's words");
    await p.goto(base + '#seaslug/identify/key');
    await p.waitForFunction(() => /Sea slug ID key/.test(document.querySelector('#view').innerText), null, {timeout: 15000});
    // The switch to the fish and back: each tree in force in turn.
    await p.evaluate(() => setSubject(SUBJECTS.find(S => S.hash === 'fish/').id));
    await p.waitForFunction(() => TREE_AT === SUBJ.id && FISH && FISH.gen['f:Damselfishes'], null, {timeout: 30000});
    await p.evaluate(() => setSubject(SUBJECTS.find(S => S.hash === 'seaslug/').id));
    await p.waitForFunction(() => TREE_AT === SUBJ.id && FISH && FISH.gen['f:Chromodorididae'] && !FISH.gen['f:Damselfishes'], null, {
      timeout: 30000
    });
    check(!errs.length, '2: page errors: ' + errs.join('; '));
    await ctx.close();
  }

  // 3. A player in the sea-slug group (its account's groups record, as the sheet's reply leaves it: app.js groupsSeen).
  {
    const {ctx, p, errs} = await page(b, base, () => {
      try {
        if (sessionStorage.getItem('s3')) return;
        sessionStorage.setItem('s3', '1');
        localStorage.setItem('reefid-tour', '"done"');
        localStorage.setItem('reefid-account', JSON.stringify({name: 'P1'}));
        localStorage.setItem('reefid-groups', JSON.stringify({n: 'P1', g: ['seaslug']}));
        localStorage.setItem('reefid-sync-coral-start', '{"c":"new","t":1}');
      } catch (e) {}
    });
    await p.goto(base + '#home');
    await ready(p);
    const o = await p.evaluate(() => ({mine: subjMine().map(S => S.id), admin: IS_ADMIN}));
    check(!o.admin && o.mine.includes('seaslug'), `3: a player of the group does not get the sea slugs: ${o.mine}`);
    check(!errs.length, '3: page errors: ' + errs.join('; '));
    await ctx.close();
  }

  await b.close();
  server.close();
  if (fails.length) {
    console.error([...new Set(fails)].join('\n'));
    process.exit(1);
  }
  console.log('sea slug smoke: OK');
})().catch(e => {
  console.error(e);
  process.exit(1);
});
