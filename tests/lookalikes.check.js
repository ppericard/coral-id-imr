// The Look-alikes deck and Compare (learn.js viewLookalikes, viewCompare) played in a page, for the smokes of the subjects that
// have them from the tree (fish.smoke.js, seaslug.smoke.js): one function, so the subjects are held to the same checks (rule S1).
// Not a node --test file. The smokes serve the photos' host with a stub picture.
//
//   await require('./lookalikes.check.js')(page, 390, fails, 'fish');
//
// Deck: it opens on the subject's own pairs (UNITS deck), each pair's source named (rule C2), one photo a side for a subject with
// one view, no coral word, the tips of a unit with marks under its own label's source, arrows step through the pairs, and one screen
// (rule U2). Compare: both columns, one photo each and no view heading for one view, a tips box with its label or a plain note
// (never a species list as tips), no Coral ID Key criteria box, and the tell-apart line only with its source. The answer's
// "Compare them" link (quiz.js fbBody) follows the subject's pages. Pushes its failures into `fails`.
// The coral page's own words: its sources, its view names and its criteria box (a fish mark may speak of coral polyps).
const CORALWORD = /Coral Finder|Coral ID Key|IMR lecture|\bcolony\b|corallite/i;
module.exports = async function lookCheck(p, w, fails, tag = '') {
  const at = `${w}px Look-alikes ${tag}`,
    bad = what => fails.push(`${at}: ${what}`),
    shot = () =>
      p.evaluate(() => ({
        scrollH: document.documentElement.scrollHeight,
        inner: innerHeight,
        text: document.getElementById('view').textContent
      }));
  await p.evaluate(() => {
    document.querySelectorAll('.unlock').forEach(d => (d.ulClose ? d.ulClose() : d.remove()));
    location.hash = hr('cmp');
  });
  await p.waitForSelector('#view .lk', {timeout: 15000}).catch(() => {});
  await p.waitForTimeout(700);
  const d = await p.evaluate(() => ({
    pairs: UNITS[SUBJ.id].deck().length,
    shown: classics().length,
    one: SUBJ.views.length === 1,
    pair: [...document.querySelectorAll('#view .lkph figcaption')].length,
    imgs: document.querySelectorAll('#view .lkph img').length,
    src: ((document.querySelector('#view .lksrc') || {}).textContent || '').trim(),
    n: document.querySelectorAll('#view .lkd').length,
    count: ((document.querySelector('#view .lkn') || {}).textContent || '').trim(),
    tips: [...document.querySelectorAll('#view .lktip')].map(x => x.textContent.trim()),
    // every tip text carries its source (rule C2), a unit with none says so
    unsourced: [...document.querySelectorAll('#view .lktip')]
      .filter(x => !x.querySelector('.esrc') && !/No ID marks written/.test(x.textContent))
      .map(x => x.textContent.trim()),
    // and so does every unit of every pair of the deck
    unsourcedAll: [...new Set(classics().flat())].filter(n => UNITS[SUBJ.id].cmp.clues(GX(n)) && GX(n).qt && !tipsBy(GX(n))),
    // every pair of the deck names its source (rule C2)
    bare: classics()
      .filter(p => !lsrcOf(p[0], p[1]))
      .map(p => p.join('|')),
    head: (document.querySelector('#view .lkhead h3') || {}).textContent
  }));
  if (!d.pairs || d.shown < 1 || d.n !== d.shown) return bad(`no deck: ${JSON.stringify(d)}`);
  if (d.imgs !== 2 || d.pair !== 2) bad(`not one photo a side: ${JSON.stringify(d)}`);
  if (d.src.length < 8) bad(`the pair names no source: "${d.src}"`);
  if (d.tips.length !== 2) bad(`${d.tips.length} tip blocks`);
  if (d.unsourced.length || d.unsourcedAll.length) bad(`tips with no source: ${d.unsourced} ${d.unsourcedAll}`);
  if (d.bare.length) bad(`deck pairs with no source: ${d.bare}`);
  const s = await shot();
  if (!tag.startsWith('coral') && CORALWORD.test(s.text)) bad(`a coral word on the deck: ${s.text.slice(0, 200)}`);
  if (s.scrollH > s.inner + 1) bad(`the deck is not one screen: ${s.scrollH} > ${s.inner}`);
  // The arrows step through the pairs, the address follows.
  if (d.shown > 1) {
    const h0 = await p.evaluate(() => location.hash);
    await p.click('#view .lkarr.nxt');
    await p.waitForTimeout(400);
    const h1 = await p.evaluate(() => location.hash),
      c1 = await p.evaluate(() => (document.querySelector('#view .lkn') || {}).textContent.trim());
    if (h1 === h0 || !/^Pair 2 \//.test(c1)) bad(`the next arrow stayed on the pair: ${h0} ${h1} ${c1}`);
  }
  // The admin's saved picks (curation mont {v, a, b}) hold each side in its own order, not the key's alphabetical one: a
  // pair saved with the second unit's photo as a and the first's as b still gives each unit its own photo.
  const mp = await p.evaluate(() => {
    if (SUBJ.views.length > 1 || !CUR) return null;
    const [A, B] = classics()[0],
      w = SUBJ.views[0][0],
      LA = GX(A).views[w].filter(x => !juvP(x)),
      LB = GX(B).views[w].filter(x => !juvP(x)),
      pa = LA[LA.length - 1],
      pb = LB[LB.length - 1],
      k = pairKey(A, B),
      part = SUBJ.admin.cur ? (CUR[SUBJ.admin.cur] = CUR[SUBJ.admin.cur] || {}) : CUR,
      was = part.mont;
    part.mont = {[k]: {v: 'adult', a: pb.f, b: pa.f}};
    const m = montage(A, B);
    part.mont = was;
    if (!was) delete part.mont;
    return {ok: m.pa.f === pa.f && m.pb.f === pb.f, got: [m.pa.f, m.pb.f], want: [pa.f, pb.f]};
  });
  if (mp && !mp.ok) bad(`a saved pick in the other order is ignored: ${JSON.stringify(mp)}`);
  // Compare, of the pair the deck shows.
  const pair = await p.evaluate(() => classics()[0]);
  await p.evaluate(x => (location.hash = hr('cmp-' + x[0] + '|' + x[1])), pair);
  await p.waitForSelector('#view .cmprow', {timeout: 15000}).catch(() => {});
  await p.waitForTimeout(700);
  const c = await p.evaluate(() => ({
    cols: document.querySelectorAll('#view .cmpcol').length,
    imgs: document.querySelectorAll('#view .cmpph img').length,
    labs: document.querySelectorAll('#view .cmplab').length,
    views: SUBJ.views.length,
    boxes: [...document.querySelectorAll('#view .cmpcol')].map(x => ({
      tips: !!x.querySelector('.tipbox'),
      label: ((x.querySelector('.tipbox .label') || {}).textContent || '').trim(),
      note: /No ID marks written/.test(x.textContent),
      crit: !!x.querySelector('details.more')
    })),
    said: (document.querySelector('#view .cmpsaid') || {}).textContent || '',
    saidSrc: !!document.querySelector('#view .cmpsaid .esrc'),
    ctx: (document.querySelector('.modes.ctx .ctx-pair') || {}).textContent || ''
  }));
  if (c.cols !== 2) bad(`Compare shows ${c.cols} columns for ${pair}`);
  if (c.imgs !== 2) bad(`Compare shows ${c.imgs} photos for ${pair}`);
  if (c.views === 1 && c.labs) bad('a view heading for a subject with one view');
  c.boxes.forEach(x => {
    if (!x.tips && !x.note) bad(`a column with neither tips nor a note: ${JSON.stringify(x)}`);
    if (x.tips && !x.label && tag !== 'coral') bad(`tips with no label naming their source: ${JSON.stringify(x)}`);
    if (x.crit && !tag.startsWith('coral')) bad('a Coral ID Key criteria box on another subject');
  });
  if (c.said && !c.saidSrc) bad(`a tell-apart line with no source: ${c.said}`);
  if (!c.ctx) bad('no pair title in the page bar');
  const s2 = await shot();
  if (!tag.startsWith('coral') && CORALWORD.test(s2.text)) bad(`a coral word on Compare: ${s2.text.slice(0, 200)}`);
  // The answer's Compare link follows the pages (quiz.js fbBody), for a pair of this subject.
  const fb = await p.evaluate(x => {
    const h = fbBody(x[0], x[1], false, false, false, [], false, 0, null, [], '', null);
    return {on: SUBJ.pages.includes('cmp'), link: h.includes(`href="${hr('cmp-' + x[0] + '|' + x[1])}"`)};
  }, pair);
  if (!fb.on || !fb.link) bad(`the answer's Compare link: ${JSON.stringify(fb)}`);
};
