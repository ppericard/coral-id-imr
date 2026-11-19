// The custom quiz on the subject on screen (quiz.js viewCustom, Q437: every subject), played by the fish and sea slug smokes
// (tests/fish.smoke.js customQuiz, tests/seaslug.smoke.js 6) on a page with some units unlocked (introAdd):
// - the Custom quiz tab is there and the page lists every unlocked unit once, each in exactly one group, named as the app
//   names it (uname), the words the subject's own (SUBJ.one, SUBJ.many);
// - the search finds a unit by its name and hides the others;
// - two picks are saved under the subject's own key (reefid-sync-<id>-custom), no other subject's, and the Start button opens
//   the quiz on them: its question is on a picked unit, its four choices are units of the subject, and an answer is logged
//   as a photo-quiz one (quiz|s);
// - no sideways scroll at the width asked.
// fails: the list the caller reports; word: the subject's name in the messages.
module.exports = async function customQuiz(p, base, fails, word, width) {
  const bad = m => fails.push(`${word} custom quiz at ${width}px: ${m}`);
  const id = await p.evaluate(() => SUBJ.id);
  await p.goto(base + `#${id}/practice/custom`);
  await p.waitForSelector('.cqtile', {timeout: 15000});
  await p.waitForTimeout(300);
  const o = await p.evaluate(() => {
    const play = unlocked(),
      tiles = [...document.querySelectorAll('.cqtile')].map(b => b.dataset.g),
      inGroups = [...document.querySelectorAll('.cqg')].map(g => [...g.querySelectorAll('.cqtile')].map(b => b.dataset.g));
    return {
      id: SUBJ.id,
      play,
      tiles,
      groups: inGroups.length,
      grouped: inGroups.flat(),
      tab: [...document.querySelectorAll('#modes a')].some(a => /Custom quiz/.test(a.textContent) && a.getAttribute('aria-current')),
      names: [...document.querySelectorAll('.cqtile .cqnm')].map(x => x.textContent.trim()),
      want: play.map(unameT),
      ph: document.querySelector('#cqq').placeholder,
      view0: document.querySelector('[data-cv="imr"]').textContent,
      by: UNITS[SUBJ.id].cq.by,
      one: SUBJ.one,
      over: document.documentElement.scrollWidth > innerWidth + 1
    };
  });
  if (!o.tab) bad('the Custom quiz tab is not the current one');
  if (!o.play.length || [...o.play].sort().join() !== [...o.tiles].sort().join())
    bad(`tiles ${o.tiles} are not the unlocked units ${o.play}`);
  if ([...o.grouped].sort().join() !== [...o.tiles].sort().join()) bad(`a tile in no group or two: ${o.grouped}`);
  if (!o.groups) bad('no group');
  if ([...o.names].sort().join() !== [...o.want].sort().join()) bad(`names ${o.names} are not the units' names ${o.want}`);
  if (o.ph !== `Search a ${o.one}` || o.view0 !== o.by) bad(`words: "${o.ph}", "${o.view0}"`);
  if (o.over) bad('sideways scroll');
  // The search: a unit's name keeps it, a nonsense text hides all.
  const name = o.want[0];
  await p.fill('#cqq', name.slice(0, 4).toLowerCase());
  const s1 = await p.evaluate(() => [...document.querySelectorAll('.cqtile:not([hidden])')].map(b => b.dataset.g));
  if (!s1.includes(o.play[0])) bad(`the search for "${name.slice(0, 4)}" lost ${o.play[0]}: ${s1}`);
  await p.fill('#cqq', 'zzzzqq');
  if ((await p.evaluate(() => document.querySelectorAll('.cqtile:not([hidden])').length)) !== 0) bad('a nonsense search left tiles');
  await p.fill('#cqq', '');
  // Two picks, saved under the subject's own key.
  const pick = o.tiles.slice(0, 2);
  for (const g of pick) await p.click(`.cqtile[data-g="${g}"]`);
  const sv = await p.evaluate(() => ({
    keys: Object.keys(localStorage).filter(k => /-custom$/.test(k)),
    mine: JSON.parse(localStorage.getItem(`reefid-sync-${SUBJ.id}-custom`) || 'null'),
    off: document.querySelector('[data-start]').disabled
  }));
  if (sv.keys.join() !== `reefid-sync-${o.id}-custom`) bad(`keys saved: ${sv.keys}`);
  if (!sv.mine || [...sv.mine.g].sort().join() !== [...pick].sort().join()) bad(`saved ${JSON.stringify(sv.mine)}, picked ${pick}`);
  if (sv.off) bad('Start disabled with two picks');
  await p.click('[data-start]');
  await p.waitForSelector('#view .q [data-c]', {timeout: 15000});
  const q = await p.evaluate(() => ({
    h: location.hash,
    t: qNow() && qNow().g,
    L: [...document.querySelectorAll('#view .q [data-c]')].map(x => x.dataset.c),
    ok: pool()
  }));
  if (!q.h.endsWith('/practice/custom/play')) bad(`the quiz is at ${q.h}`);
  if (!pick.includes(q.t)) bad(`the question is on ${q.t}, not one of ${pick}`);
  if (q.L.length !== 4 || !q.L.every(n => q.ok.includes(n))) bad(`choices ${q.L}`);
  await p.evaluate(() => smokeAnswer(true));
  await p.waitForTimeout(300);
  const lg = await p.evaluate(() => JSON.stringify(SYNC ? SYNC.log : store.get(LOG0, [])).slice(-400));
  if (!/quiz\|s/.test(lg)) bad(`the answer is not logged as a photo-quiz one: ${lg}`);
};
