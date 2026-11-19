// Sea slug subject test (study docs/reviews/2026-11-15-nudibranch-mode-study.md §9, step 5; core.js SUBJECTS seaslug,
// app.js UNITS seaslug): runs the real app in Chromium on seaslug.json and seaslug-game.json, open to every player in
// beta (rule S1):
// 1. a player who is not the admin, signed out, its subject saved as the sea slugs, opens on them: the switch offers
//    them, their files are fetched, the saved choice stays;
// 2. the admin opens the sea-slug quiz: 4 genera by their scientific names (its units from the start, core.js SUBJECTS
//    unitRank), a photo from the game file (iNaturalist, stubbed here: nothing leaves the machine),
//    answers right and wrong, the photo's species named under the verdict; 30 questions, every one on a circle-1 genus
//    (circle 2 opens once every circle-1 genus has been asked: app.js treeGate), each logged at the genus, no family
//    asked and no opt-in genus offer; the genera page in blocks of their families, a family sheet, a genus sheet, Home's
//    doors and the key page in the sea slugs' words; the switch to the fish and back swaps the tree in force (app.js
//    treeAt), each subject's progress kept apart; their English names (seaslug.json en) never in a
//    question before its answer, after it in the verdict and the species line, on the Learn page's headings and tiles
//    and on the sheets with their sources; a genus sheet's sourced ID marks (tools/seaslug_cues.json), and no fish word on a
//    genus or a species sheet, their ? text included (app.js UNITS words);
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
// A tiny image for every photo from iNaturalist (the sea slugs' photos not on R2 yet are read from there).
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

  // 1. Not the admin, signed out: the sea slugs open to every player, in beta: the saved choice opens them and their
  // files are fetched.
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
    check(o.subj === 'seaslug', `1: a player who is not the admin is on ${o.subj}`);
    check(o.mine.includes('seaslug') && o.btn, `1: the switch does not offer the sea slugs: ${o.mine}`);
    check(o.saved === '"seaslug"', `1: the saved choice changed: ${o.saved}`);
    check(
      asked.some(u => /seaslug\.json/.test(u)),
      `1: the sea-slug files not fetched: ${asked.filter(u => /seaslug/.test(u))}`
    );
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
    // Its units: the genera (core.js treeGen unit 'genus'); circle 1, a genus's best species' circle (seaslug.json).
    const fams = new Set(F.families.map(f => f.id)),
      gens = new Set(F.genera.map(g => g.id)),
      c1 = new Set(F.genera.filter(g => g.circle === 1).map(g => g.id));
    const q = await p.evaluate(() => {
      const L = [...document.querySelectorAll('#view .q [data-c]')].map(x => x.dataset.c), // answer.js: a read of the choices
        t = [...document.querySelectorAll('#view .q [data-c]')].map(x => x.textContent.trim()), // answer.js: a read of the choices
        ph = document.querySelector('#view .qph');
      // pre: the question as shown before the answer (no English name in it: information comes after the answer)
      const pre = (document.querySelector('#view .q') || {}).innerText || '';
      return {L, t, pre, at: TREE_AT, photo: ph ? getComputedStyle(ph).getPropertyValue('--qbg') : '', a: smokeAnswer()};
    });
    // The English names (seaslug.json en: tools/seaslug_names.py) as the app shows them, the first letter in capitals.
    const enFirst = r => {
      const n = ((r && r.en) || [])[0];
      return n ? n.n.charAt(0).toUpperCase() + n.n.slice(1) : '';
    };
    const G = id => F.genera.find(g => g.id === id);
    check(
      !q.L.some(id => enFirst(G(id)) && q.pre.includes(enFirst(G(id)))),
      `2: an English name shown before the answer: ${q.L.map(id => enFirst(G(id))).filter(Boolean)}`
    );
    check(q.at === 'seaslug', `2: the tree in force is ${q.at}`);
    check(q.L.length === 4 && q.L.every(n => gens.has(n)), `2: the choices are not 4 sea-slug genera: ${q.L}`);
    check(
      q.t.every(x => /^[A-Z][a-z]+$/.test(x.replace(/^\d\s*/, '')) && !/idae$/.test(x)),
      `2: a choice not named by its scientific genus name: ${q.t}`
    );
    // The game file's photo: on R2 (`img/seaslug-…`), or iNaturalist's while not uploaded yet.
    check(
      /\.r2\.dev\/img\/seaslug-|inaturalist-open-data/.test(q.photo),
      `2: the photo is neither the game file's R2 nor its iNaturalist one: ${q.photo}`
    );
    const v = await p.evaluate(() => ({
      right: !!document.querySelector('#view .q.done'),
      sp: (document.querySelector('#view .fbsp') || {}).textContent || '',
      verdict: (document.querySelector('#view .fb h3') || {}).textContent || ''
    }));
    check(v.right, '2: the right answer did not close the question');
    // After the answer: the photo's species, its first English name before it when a source gives one.
    // The photo shown is found in the game file by its file name (R2: img/<f>-<size>.webp) or its iNaturalist address; a photo identified to
    // the genus only (gl: about 1 in 6 of the game's photos) has no species, so no line. A species with no name
    // yet ("Goniobranchus sp. 5") has its source after the name: the line starts with the name.
    const GP = Object.values(JSON.parse(fs.readFileSync(path.join(ROOT, 'seaslug-game.json'), 'utf8')).photos).flat(),
      shown = GP.find(r => new RegExp(`/${r.f}[-.]`).test(q.photo) || (r.src && q.photo.includes(r.src))),
      spRec = shown && shown.sp ? F.species.find(s => s.id === shown.sp) : null;
    check(!!shown, `2: the photo shown is not in seaslug-game.json: ${q.photo}`);
    // A genus-level photo carries its genus as its sp ("g:Chromodoris", with gl): no species, so no line.
    if (shown && (shown.gl || !spRec)) check(v.sp === '', `2: a species line on a photo identified to the genus only: "${v.sp}"`);
    else
      check(
        !!spRec && v.sp.startsWith(`This photo: ${enFirst(spRec) ? enFirst(spRec) + ' · ' : ''}${spRec.name}`),
        `2: the species line is not its English name and its scientific name (${spRec && spRec.name}): "${v.sp}"`
      );
    check(
      !enFirst(G(q.a.t)) || v.verdict.includes(enFirst(G(q.a.t))),
      `2: the verdict does not give the genus's English name: "${v.verdict}"`
    );
    // More answers, right and wrong (30 in all), every one on a circle-1 genus: circle 2 waits until every circle-1 genus
    // has been asked (treeGate), more than 30 answers away; no family asked, no opt-in genus offer (no SETS).
    const seen = [q.a.t];
    for (let i = 0; i < 29; i++) {
      // Next, and the first-meeting cards of the genera that open, closed as a player's Got it would
      for (let k = 0; k < 10 && !(await qa.ready(p, {timeout: 1500, optional: true})); k++) {
        if (await p.$('.unlock [data-b="1"]')) await p.click('.unlock [data-b="1"]');
        else
          await p.evaluate(() =>
            (document.getElementById('next') || document.querySelector('#view button.next:not(.sec)') || {click() {}}).click()
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
      // no opt-in set: only its species by their scientific names (app.js SCI_SP, no switch), empty below SCI_SHEET
      sets: SETS()
        .map(S => S.k + ':' + (S.all ? S.all().length : 0))
        .join(','),
      met: slateGenera().filter(n => introduced(n)).length,
      slate: slateGenera().length
    }));
    const units = pr.s.filter(n => !n.startsWith('~')); // the record's own keys (~level) apart
    check(units.length && units.every(n => c1.has(n)), `2: the sea-slug progress: ${pr.s}`);
    check(!pr.f.some(n => gens.has(n) || fams.has(n)), `2: sea-slug units in the fish progress: ${pr.f}`);
    check(pr.rk.length === 1 && pr.rk[0] === 'genus', `2: the answers are not logged at the genus: ${pr.rk}`);
    check(pr.sets === 'ssp:0', `2: the sea slugs have an opt-in set, or their species open below SCI_SHEET: ${pr.sets}`);
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
          [...v.querySelectorAll('.gdiv')].some(h => h.textContent.startsWith(f))
        );
      },
      [F.genera[0].name, F.families[0].name],
      {timeout: 15000}
    );
    // The English names as information on the Learn page: a family's beside its heading, a genus's on its tile.
    const lp = await p.evaluate(() => ({
      heads: [...document.querySelectorAll('#view .gdiv')].map(h => h.textContent),
      tiles: [...document.querySelectorAll('#view .tipsheet')].map(a => [
        a.querySelector('b').textContent,
        (a.querySelector('.ven') || {}).textContent || ''
      ])
    }));
    F.families
      .filter(f => enFirst(f))
      .forEach(f => check(lp.heads.includes(`${f.name} ${enFirst(f)}`), `2: ${f.name}'s heading lacks its English name`));
    F.genera
      .filter(g => lp.tiles.some(([n]) => n === g.name))
      .forEach(g =>
        check(
          lp.tiles.some(([n, e]) => n === g.name && e === enFirst(g)),
          `2: ${g.name}'s tile: not its English name`
        )
      );
    const fam = F.families[0];
    await p.goto(base + '#seaslug/learn/family/' + encodeURIComponent(fam.name));
    await p.waitForFunction(n => (document.querySelector('#view') || {}).innerText.includes(n), fam.name, {timeout: 15000});
    const fv = await p.evaluate(() => (document.querySelector('#view .fn-v') || {}).textContent || '');
    check(fv === enFirst(fam), `2: the family sheet's English name: "${fv}"`);
    const gs = await p.evaluate(g => hr('g-' + g), F.genera[0].id);
    await p.goto(base + gs);
    await p.waitForFunction(n => (document.querySelector('#view') || {}).innerText.includes(n), F.genera[0].name, {timeout: 15000});
    // Its sourced ID marks (tools/seaslug_cues.json; study §9 step 7), each line with its source's number, and the sheet in
    // the sea slugs' words, its ? text included (app.js UNITS words): no fish word.
    const gm = await p.evaluate(() => ({
      marks: [...document.querySelectorAll('#view .gmarks li')].map(li => [li.textContent, li.querySelectorAll('.srcn').length]),
      srcs: (document.querySelector('#view .gmarks .msrc') || {}).textContent || '',
      words: [...document.querySelectorAll('.lede, #view')].map(x => x.textContent).join(' ')
    }));
    check(
      (F.genera[0].marks || []).length && gm.marks.length === F.genera[0].marks.length && gm.marks.every(([, n]) => n > 0),
      `2: ${F.genera[0].name}'s ID marks, each with its source: ${JSON.stringify(gm.marks)}`
    );
    check(/^Sources: \[1\]/.test(gm.srcs), `2: ${F.genera[0].name}'s mark sources: "${gm.srcs}"`);
    check(!/\bfish|FishBase|IMR\b|around Dauin/i.test(gm.words), `2: a fish word on a sea-slug genus sheet`);
    // The genus look-alikes (seaslug.json genus look, dlook, lsrc): a declared pair across two
    // families is a duel pair, a pair only iNaturalist shows a data look-alike from the start (no answer pooled here), both
    // traps on the pooled score; the sheets say each with its source: a genus's own page, a one-genus family's sheet for
    // its genus.
    const lk = await p.evaluate(() => ({
      pairs: UNITS[SUBJ.id].pairs().map(x => x.join('|')),
      data: dataLooks().map(x => x.join('|')),
      trap: ['g:Phyllidiella', 'g:Hexabranchus'].every(o => pooledConf('g:Goniobranchus', o) >= CONF.TRAP)
    }));
    check(lk.pairs.includes('g:Goniobranchus|g:Phyllidiella'), '2: Goniobranchus / Phyllidiella (Nudi Pixel) is not a duel pair');
    check(!lk.pairs.includes('g:Goniobranchus|g:Hexabranchus'), '2: an iNaturalist-only pair is a declared duel pair');
    check(lk.data.includes('g:Goniobranchus|g:Hexabranchus'), '2: Goniobranchus / Hexabranchus (iNaturalist) is not a data look-alike');
    check(!lk.data.includes('g:Goniobranchus|g:Phyllidiella'), '2: a declared pair is also a data look-alike');
    check(lk.trap, '2: the look-alikes across families are not traps');
    for (const [g, o, src] of [
      ['g:Goniobranchus', 'Phyllidiella', /Nudi Pixel.*Goniobranchus geometricus, Phyllidiella pustulosa/],
      ['g:Goniobranchus', 'Hexabranchus', /iNaturalist identifications/],
      ['g:Hexabranchus', 'Hypselodoris', /Sea Slug Forum message 'Juvenile Hexabranchus from Philippines'/]
    ]) {
      await p.goto(base + (await p.evaluate(x => hr('g-' + treeGo(x)), g)));
      const cards = () => p.evaluate(() => [...document.querySelectorAll('#view .hubsec .lt')].map(a => a.innerText.replace(/\s+/g, ' '))),
        ok = await p
          .waitForFunction(
            ([o, s]) =>
              [...document.querySelectorAll('#view .hubsec .lt')].some(a => {
                // the mix-up count of this player may come first (learn.js lookCard: "you mixed them up ×N")
                const t = a.innerText.replace(/\s+/g, ' ').replace(/^you mixed them up ×\d+ /, '');
                return t.startsWith(o) && new RegExp(s).test(t);
              }),
            [o, src.source],
            {timeout: 15000}
          )
          .then(
            () => true,
            () => false
          );
      check(ok, `2: ${g}'s sheet: no ${o} card with its source (${(await cards()).join(' | ')})`);
    }
    // A species with English names: its sheet gives them, with their sources under More details.
    const spn = F.species.find(s => (s.en || []).length > 1);
    if (spn) {
      await p.goto(base + (await p.evaluate(n => hr('g-s:' + n), spn.name)));
      await p.waitForFunction(n => (document.querySelector('#view .fn-t') || {}).textContent === n, spn.name, {timeout: 15000});
      const sv = await p.evaluate(() => ({
        v: (document.querySelector('#view .fn-v') || {}).textContent || '',
        more: [...document.querySelectorAll('#view .sheetmore .refs')].map(x => x.textContent).join(' '),
        words: [...document.querySelectorAll('.lede, #view')].map(x => x.textContent).join(' ')
      }));
      check(sv.v.startsWith(enFirst(spn)), `2: ${spn.name}'s sheet: "${sv.v}"`);
      check(/English names:/.test(sv.more), `2: ${spn.name}'s sheet: no English names with their sources`);
      // in the sea slugs' words: its rank by its observers in the Philippines, no FishBase link, no IMR reference list
      check(!/\bfish|FishBase|IMR\b|around Dauin/i.test(sv.words), `2: a fish word on ${spn.name}'s sheet`);
    }
    // A species with no name yet (seaslug.json inf): its sheet names it with its source in
    // small type, its genus in italics only, and links its paper and its iNaturalist field (no taxon, WoRMS or FishBase);
    // it has no English name.
    const inf = F.species.find(s => s.inf);
    if (inf) {
      await p.goto(base + (await p.evaluate(n => hr('g-s:' + n), inf.name)));
      await p.waitForFunction(n => (document.querySelector('#view .fn-t') || {}).innerText === n, `${inf.name} (${inf.src})`, {
        timeout: 15000
      });
      const sh = await p.evaluate(() => ({
        it: [...document.querySelectorAll('#view .fn-t i')].map(x => x.textContent),
        small: (document.querySelector('#view .fn-t small') || {}).textContent,
        v: !!document.querySelector('#view .fn-v'),
        links: [...document.querySelectorAll('#view .sheetmore a')].map(a => a.href)
      }));
      check(sh.it.join() === inf.name.split(' ')[0], '2: the species with no name: its genus alone in italics');
      check(sh.small === `(${inf.src})`, '2: its source in small type');
      check(!sh.v, '2: the species with no name: no English name');
      check(
        sh.links.some(h => new URL(h).host === 'doi.org') &&
          sh.links.some(h => new URL(h).host === 'www.inaturalist.org' && new URL(h).pathname.startsWith('/observation_fields/')) &&
          !sh.links.some(
            h => ['www.fishbase.se', 'www.marinespecies.org'].includes(new URL(h).host) || new URL(h).pathname.startsWith('/taxa/')
          ),
        '2: its links: the paper and the field, no taxon page'
      );
    }
    await p.goto(base + '#seaslug');
    await p.waitForFunction(() => /Identify a sea slug/.test(document.querySelector('#view').innerText), null, {timeout: 15000});
    const home = await p.evaluate(() => document.querySelector('#view').innerText);
    check(!/EventMeasure|Identify a fish/.test(home), "2: Home in the fish's words");
    await p.goto(base + '#seaslug/identify/key');
    await p.waitForFunction(() => /Sea slug ID key/.test(document.querySelector('#view').innerText), null, {timeout: 15000});
    // The switch to the fish and back: each tree in force in turn.
    await p.evaluate(() => setSubject(SUBJECTS.find(S => S.hash === 'fish/').id));
    await p.waitForFunction(() => TREE_AT === SUBJ.id && TREEU && TREEU.gen['f:Damselfishes'], null, {timeout: 30000});
    await p.evaluate(() => setSubject(SUBJECTS.find(S => S.hash === 'seaslug/').id));
    await p.waitForFunction(() => TREE_AT === SUBJ.id && TREEU && TREEU.gen['f:Chromodorididae'] && !TREEU.gen['f:Damselfishes'], null, {
      timeout: 30000
    });
    // Its leaderboard (core.js SUBJECTS seaslug board, boardSheet): asked as &s=seaslug and shown only
    // from the script that serves it (SEASLUGRP_SHEET, rule D4), the corals' board before; its replay's units, the app's
    // (UNITS gen, read with its own tree in force: sync.js rpUnits). The sheet's replies are fixtures inside the page's
    // fetch (rule D1).
    const sb = await p.evaluate(async () => {
      const f0 = window.fetch,
        asked = [],
        sv0 = store.get(SHEETV, 0);
      window.fetch = u => {
        asked.push(String(u).replace(/^.*\?/, ''));
        const rows = /s=seaslug/.test(u) ? [['Slug P', 41, 0.7]] : [['Coral P', 90, 1.1]];
        return Promise.resolve(new Response(JSON.stringify({ok: true, rows, v: store.get(SHEETV, 0)})));
      };
      const shown = () => new Promise(ok => setTimeout(() => ok((document.getElementById('board') || {}).textContent || ''), 200));
      try {
        store.set(SHEETV, SEASLUGRP_SHEET - 1);
        go('board');
        const before = await shown(),
          live0 = boardLive(SUBJ),
          rp0 = rpOn(SUBJ, sheetV()),
          asked0 = asked.splice(0);
        store.set(SHEETV, SEASLUGRP_SHEET);
        Object.keys(boardP).forEach(k => delete boardP[k]);
        viewBoard();
        const after = await shown();
        // its replay's units from its own tree, whichever subject is on screen
        const units = inSubject('coral', () => rpUnits(subjectOf('seaslug')));
        return {before, live0, rp0, asked0, after, asked, live1: boardLive(SUBJ), units: !!units && !!units['g:Chromodoris']};
      } finally {
        window.fetch = f0;
        store.set(SHEETV, sv0);
      }
    });
    check(
      !sb.live0 && !sb.rp0 && /Coral P/.test(sb.before) && sb.asked0.every(a => a === 'board=1'),
      `2: before its script, no sea slug board: ${JSON.stringify(sb)}`
    );
    check(
      sb.live1 && /Slug P/.test(sb.after) && /41%/.test(sb.after) && sb.asked.every(a => a === 'board=1&s=seaslug'),
      `2: the sea slug board: ${JSON.stringify(sb)}`
    );
    check(sb.units, '2: its replay units read with its own tree in force');
    // Its achievements page: its own list (core.js SEASLUG_ACH) and ? text, the Contributions apart.
    await p.evaluate(() => go('ach'));
    await p.waitForFunction(() => document.querySelectorAll('#view .achl li').length > 0, null, {timeout: 15000});
    const ach = await p.evaluate(() => ({
      n: document.querySelectorAll('#view .achl')[0].querySelectorAll('li').length,
      want: SEASLUG_ACH.length,
      head: (document.querySelector('#view .btitle') || {}).textContent,
      text: document.querySelector('#view').innerText,
      // its ? text (behind the shared ?, rule U1): the subject's own
      help: achSubj().id === 'seaslug' && UNITS[achSubj().id].achHelp()
    }));
    check(
      ach.n === ach.want && new RegExp(`^\\d+/${ach.want} earned$`).test(ach.head) && /Naked gills/.test(ach.text),
      `2: the achievements page: ${ach.n} ${ach.head}`
    );
    check(/sea slug learning/.test(ach.help || '') && !/Fish whisperer|Course director/.test(ach.text), '2: its own ? text and list');
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

  // 4. Odd one out (proto/oddone.js, the Lab) on the sea slugs, as tests/fish.smoke.js oddOne plays it on the fish: the genera of
  // three declared look-alike pairs unlocked and one genus with none among them, every other genus locked; the photos stubbed (its
  // tiles are its choices). 24 rounds: four photos, three observations of one genus and one of another, all unlocked, all different
  // observations (rule P4); the odd one a declared look-alike of the genus shown three times whenever one is unlocked, any unlocked
  // genus else; the tile ticked is the odd one and the verdict true to the tile tapped; no progress, log or answer count changes;
  // one screen before the answer, after it and with More open at 390 and 1280 px.
  {
    const {ctx, p, errs} = await page(b, base, () => {
      try {
        if (sessionStorage.getItem('s4')) return;
        sessionStorage.setItem('s4', '1');
        localStorage.setItem('reefid-tour', '"done"');
        localStorage.setItem('reefid-sync-subject', '"seaslug"');
        localStorage.setItem('reefid-sync-seaslug-start', '{"c":"new","t":1}');
        localStorage.setItem('reefid-sync-coral-start', '{"c":"new","t":1}');
      } catch (e) {}
      let s = 31337;
      Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647;
    });
    // (a route added later is asked first: the photos of any host answered by the picture)
    await ctx.route(
      u => !u.href.startsWith(base),
      r =>
        /\.(webp|jpe?g|png)(\?|$)|inaturalist/.test(r.request().url())
          ? r.fulfill({status: 200, contentType: 'image/png', body: PNG})
          : r.abort()
    );
    await p.setViewportSize({width: 390, height: 844});
    await p.goto(base + '#seaslug');
    await ready(p);
    const open = await p.evaluate(() => {
      document.querySelectorAll('.unlock').forEach(d => (d.ulClose ? d.ulClose() : d.remove()));
      const all = UNITS[SUBJ.id].pairs(),
        shots = n => new Set(['wide', 'medium', 'macro'].flatMap(v => gamePics(n, v)).map(x => x.o || x.f)).size,
        P0 = all.filter(([a, c]) => GX(a) && GX(c) && shots(a) >= 3 && shots(c) >= 3),
        met = [...new Set(P0.slice(0, 3).flat())],
        alone = pool().find(
          n => !met.includes(n) && shots(n) >= 3 && !all.some(([a, c]) => (a === n && met.includes(c)) || (c === n && met.includes(a)))
        );
      if (P0.length < 3 || !alone) return {pairs: P0.length, alone};
      introAdd([...met, alone], true);
      location.hash = hr('lab-oddone');
      return {pairs: P0.length, met, alone};
    });
    check(open.pairs >= 3 && open.alone, `4: ${open.pairs} declared sea slug pairs in play, a genus with none: ${open.alone}`);
    // answer.js: the Tools game's tiles, not a quiz question's choices
    const TILE = '#view .ooq .fxt [data-c]';
    await p.waitForSelector(`${TILE}:not([disabled])`, {timeout: 30000}).catch(() => {});
    const fit = () =>
      p.evaluate(() => {
        const tab = document.querySelector('.sections'),
          tabTop = tab && getComputedStyle(tab).position === 'fixed' ? tab.getBoundingClientRect().top : innerHeight,
          aft = document.getElementById('after'),
          sheet = aft && getComputedStyle(aft).position === 'fixed' ? aft.getBoundingClientRect().top : tabTop;
        return [...document.querySelectorAll('#view .ooq .fxt, #view #after, #view #next')]
          .map(e => [e.id || e.className, e.getBoundingClientRect()])
          .filter(
            ([n, r]) =>
              r.top < -1 || r.bottom > tabTop + 1 || (/fxt/.test(n) && document.querySelector('#view .ooq.done') && r.bottom > sheet + 1)
          )
          .map(([n, r]) => `${n} ${Math.round(r.top)}..${Math.round(r.bottom)} of ${Math.round(Math.min(tabTop, sheet))}`)
          .concat(document.documentElement.scrollHeight > innerHeight + 1 ? ['the page scrolls'] : []);
      });
    if (open.met) {
      const r = await p.evaluate(async sel => {
        const out = [],
          ok = (x, m) => x || out.push(m),
          until = async f => {
            for (let i = 0; i < 400 && !f(); i++) await new Promise(res => setTimeout(res, 25));
            return f();
          },
          rec = () =>
            JSON.stringify([P, SYNC ? SYNC.log || null : null, store.get(LOG0, []), store.get(ANONQ, []), introMap(), answersSoFar()]),
          before = rec(),
          pairs = UNITS[SUBJ.id].pairs(),
          met = unlocked(),
          find = f => {
            for (const n of pool())
              for (const v of ['wide', 'medium', 'macro']) {
                const p = (gamePics(n, v) || []).find(x => x.f === f);
                if (p) return {n, p};
              }
            return null;
          },
          kinds = new Set(),
          places = new Set();
        for (let i = 0; i < 24; i++) {
          if (
            !(await until(() => document.querySelectorAll(sel).length === 4 && [...document.querySelectorAll(sel)].every(b => !b.disabled)))
          ) {
            ok(false, `round ${i + 1}: four tiles never opened`);
            break;
          }
          const L = [...document.querySelectorAll('#view .ooq .fxt img')].map(im => find(im.dataset.f));
          if (L.length !== 4 || L.some(x => !x)) {
            ok(false, `round ${i + 1}: photos ${L.length}, ${L.map(x => x && x.n)}`);
            break;
          }
          const by = {};
          L.forEach((x, k) => (by[x.n] = (by[x.n] || []).concat(k)));
          const units = Object.keys(by),
            maj = units.find(n => by[n].length === 3),
            odd = units.find(n => by[n].length === 1);
          ok(units.length === 2 && maj && odd, `round ${i + 1}: not three and one: ${JSON.stringify(by)}`);
          if (!maj || !odd) break;
          ok(
            L.every(x => met.includes(x.n)),
            `round ${i + 1}: a genus not unlocked: ${units}`
          );
          ok(new Set(L.map(x => x.p.o || x.p.f)).size === 4, `round ${i + 1}: one observation twice`);
          const looks = met.filter(o => pairs.some(([a, c]) => (a === maj && c === o) || (c === maj && a === o)));
          if (looks.length) ok(looks.includes(odd), `round ${i + 1}: ${odd} is no declared look-alike of ${maj}, among ${looks}`);
          kinds.add(looks.length ? 'look' : 'any');
          places.add(by[odd][0]);
          const tap = i % 4;
          document.querySelector(`${sel}[data-c="${tap}"]`).click();
          const tiles = [...document.querySelectorAll('#view .ooq .fxt')],
            h3 = document.querySelector('#view #after h3');
          ok(tiles.findIndex(f => f.classList.contains('fok')) === by[odd][0], `round ${i + 1}: the tile ticked is not the odd one`);
          ok(h3 && h3.classList.contains('ok') === (tap === by[odd][0]), `round ${i + 1}: the verdict`);
          ok(
            tiles.every(f => f.querySelector('figcaption')),
            `round ${i + 1}: a tile not named once answered`
          );
          document.getElementById('next').click();
        }
        ok(kinds.size === 2, `kinds seen (a look-alike, any genus): ${[...kinds]}`);
        ok(places.size === 4, `places of the odd one: ${[...places]}`);
        ok(rec() === before, 'playing it changed the record, log or answer count');
        ok(unlocked().length === met.length && met.every(n => introduced(n)), 'playing it opened a unit');
        return out;
      }, TILE);
      r.forEach(m => check(false, `4: ${m}`));
      for (const [w, h] of [
        [390, 844],
        [1280, 800]
      ]) {
        await p.setViewportSize({width: w, height: h});
        await p.waitForTimeout(300);
        await p.waitForSelector(`${TILE}:not([disabled])`, {timeout: 8000}).catch(() => {});
        const f0 = await fit();
        await p.click(`${TILE}[data-c="1"]`);
        await p.waitForSelector('#view .ooq.done #next', {timeout: 5000}).catch(() => {});
        const f1 = await fit();
        await p.click('#view #fbmbtn');
        // (on a desktop the side column scrolls under a long More, Next pinned in view: only the page may never scroll)
        const f2 = (await fit()).filter(x => !/^after /.test(x));
        check(!f0.length && !f1.length && !f2.length, `4: ${w}px not one screen, before ${f0}, answered ${f1}, with More ${f2}`);
        await p.click('#view #next');
        await p.waitForSelector('#view .ooq:not(.done) [data-c]', {timeout: 8000}).catch(() => {}); // answer.js: the Tools game
      }
    }
    check(!errs.length, '4: page errors: ' + errs.join('; '));
    await ctx.close();
  }

  // 5. Matrix (proto/matrixgame.js, the Lab) on the sea slugs, as tests/fish.smoke.js matrixGame plays it on the fish: ten genera
  // unlocked, the photos stubbed (its tiles are its choices); tests/matrixgame.check.js plays the rounds at 390 and 1280 px.
  {
    const {ctx, p, errs} = await page(b, base, () => {
      try {
        if (sessionStorage.getItem('s5')) return;
        sessionStorage.setItem('s5', '1');
        localStorage.setItem('reefid-tour', '"done"');
        localStorage.setItem('reefid-sync-subject', '"seaslug"');
        localStorage.setItem('reefid-sync-seaslug-start', '{"c":"new","t":1}');
        localStorage.setItem('reefid-sync-coral-start', '{"c":"new","t":1}');
      } catch (e) {}
    });
    await ctx.route(
      u => !u.href.startsWith(base),
      r =>
        /\.(webp|jpe?g|png)(\?|$)|inaturalist/.test(r.request().url())
          ? r.fulfill({status: 200, contentType: 'image/png', body: PNG})
          : r.abort()
    );
    await p.setViewportSize({width: 390, height: 844});
    await p.goto(base + '#seaslug');
    await ready(p);
    const n = await p.evaluate(() => {
      document.querySelectorAll('.unlock').forEach(d => (d.ulClose ? d.ulClose() : d.remove()));
      const L = pool()
        .filter(n => ['wide', 'medium', 'macro'].some(v => gamePics(n, v).length))
        .slice(0, 10);
      introAdd(L, true);
      return L.length;
    });
    check(n >= 6, `5: ${n} sea slug genera with a photo`);
    for (const [w, h] of [
      [390, 844],
      [1280, 800]
    ]) {
      await p.setViewportSize({width: w, height: h});
      await p.waitForTimeout(300);
      await require('./matrixgame.check.js')(p, w, fails, 'sea slugs', 4);
    }
    check(!errs.length, '5: page errors: ' + errs.join('; '));
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
