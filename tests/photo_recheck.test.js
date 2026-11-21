require('./slot.js').testGuard();
// tools/photo_recheck.py (every game photo's observation asked again of iNaturalist and judged by its fetcher's own
// predicate; READ ONLY; Linear REE-195) on made-up photos and replies (tests/photo_recheck_check.py), one case per
// reason, and the guards that keep the weekly route read only: .github/workflows/photo-recheck.yml reads and reports,
// the tool writes nowhere but its report folder (and a cache file it is given).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  {execFileSync} = require('child_process');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const check = c =>
  JSON.parse(
    execFileSync('python3', ['-B', path.join(__dirname, 'photo_recheck_check.py'), c], {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 120000,
      env: {...process.env, PYTHONDONTWRITEBYTECODE: '1'}
    })
  );
let first; // the case every report test reads, run once
const reasons = () => (first = first || check('reasons'));

test('every reason is found on its photo, and only there: the rest of the game photos pass', () => {
  const R = reasons();
  assert.deepStrictEqual(R.got, R.want);
  // The reasons the issue names: ID lost, deleted, other taxon, casual; and what the predicates add.
  assert.deepStrictEqual([...new Set(Object.values(R.got).flat())].sort(), [
    'captive',
    'casual',
    'dead',
    'deleted',
    'egg',
    'id_lost',
    'other_taxon',
    'photo_gone',
    'rule'
  ]);
  // Photos with no observation (the IMR lecture, FishBase), and the excluded, skeleton and several-coral ones, are not asked.
  const S = R.summary;
  assert.strictEqual(S.coral.in_play, 10); // the skeleton photo is not in play
  assert.strictEqual(S.coral.with_observation, 9);
  assert.strictEqual(S.fish.in_play, 17); // the excluded photo is not in play
  assert.strictEqual(S.fish.with_observation, 16); // FishBase's has none
  assert.strictEqual(S.coral.failing + S.fish.failing + S.seaslug.failing, Object.keys(R.want).length);
  assert.deepStrictEqual(R.summary.fish.by_reason, {
    id_lost: 3,
    other_taxon: 2,
    deleted: 1,
    casual: 1,
    dead: 1,
    captive: 1,
    rule: 2,
    photo_gone: 2
  });
  assert.deepStrictEqual(R.unchecked, []);
});

test('the primary reason is the first in the order: deleted, casual, other taxon, ID lost, captive, dead, egg, rule', () => {
  const R = reasons();
  assert.strictEqual(R.primary['acropora-wide-5'], 'deleted');
  assert.strictEqual(R.primary['fish-s001-cand-6'], 'casual'); // his own casual observation passes usable_obs: only the search kept it out
  assert.strictEqual(R.primary['fish-s001-cand-4'], 'other_taxon'); // Research Grade as another species
  assert.strictEqual(R.primary['seaslug-5001-cand-3'], 'egg');
});

test("a fish photo of Pierre's own in Needs ID passes, a sea slug genus-level photo refined to a species of its genus passes", () => {
  const R = reasons();
  // (Nudi-cand-10: refined to a species, Needs ID, its identifications still agree at the genus.)
  for (const f of [
    'fish-s001-cand-2',
    'seaslug-Nudi-cand-5',
    'seaslug-Nudi-cand-4',
    'seaslug-Nudi-cand-10',
    'acropora-wide-2',
    'acropora-wide-1',
    'fi3010'
  ])
    assert.ok(!(f in R.got), f + ' passes');
});

test('the report says what failed, in markdown, tab-separated and JSON', () => {
  const R = reasons();
  assert.deepStrictEqual(R.files, ['failing.tsv', 'report.json', 'report.md']);
  assert.match(R.md, /Read only: nothing is changed/);
  assert.match(R.md, /## deleted \(2\)/);
  assert.match(R.md, /\| fish \| 17 \| 16 \| 1 \| 13 \| 0 \|/);
  assert.match(R.md, /`fish-s001-cand-6` \(Pierre's own\)/);
  assert.match(R.md, /\[205\]\(https:\/\/www\.inaturalist\.org\/observations\/205\)/);
  const rows = R.tsv.trim().split('\n');
  assert.ok(rows[0].startsWith('subj\tf\tobs\tprimary\treasons'));
  assert.strictEqual(rows.length, 1 + Object.keys(R.want).length);
  // Each row names the fetcher predicate that judged it.
  assert.deepStrictEqual(R.predicates, {
    'acropora-wide-3': 'fetch_local.accepted',
    'fish-s001-cand-3': 'fetch_fish.usable_obs',
    fi3020: 'fish_refs.passes',
    'seaslug-5001-cand-3': 'fetch_seaslugs.usable',
    'seaslug-Nudi-cand-6': 'fetch_seaslugs.usable_gl'
  });
});

test("the tool calls the fetchers' predicates: patch one and the verdicts follow (not a copy of the rule)", () => {
  const R = check('predicates');
  // Every predicate refusing: photos that pass for real fail, each on the predicate.
  assert.deepStrictEqual(R.strict['acropora-wide-1'], ['id_lost']);
  assert.deepStrictEqual(R.strict['fish-s001-cand-1'], ['rule']);
  assert.deepStrictEqual(R.strict['fi3010'], ['rule']);
  assert.deepStrictEqual(R.strict['seaslug-5001-cand-1'], ['rule']);
  assert.deepStrictEqual(R.strict['seaslug-Nudi-cand-4'], ['rule']);
  // Every predicate accepting: what only the predicates refused passes; what the search left to the tool (the species, casual,
  // captive, gone, a rank above the genus) still fails.
  for (const f of [
    'acropora-wide-3',
    'acropora-wide-7',
    'fish-s001-cand-3',
    'fish-s001-cand-7',
    'fish-s001-cand-8',
    'fish-s001-cand-11',
    'fi3020',
    'seaslug-5001-cand-3',
    'seaslug-Nudi-cand-6'
  ])
    assert.ok(!(f in R.lenient), f);
  assert.ok(!('fi3030' in R.lenient), "a reference photo of another species is fish_refs.passes's to refuse");
  assert.deepStrictEqual(R.lenient['fish-s001-cand-4'], ['other_taxon']);
  assert.deepStrictEqual(R.lenient['acropora-wide-4'], ['other_taxon']);
  assert.deepStrictEqual(R.lenient['fish-s001-cand-5'], ['deleted']);
  // The predicate is asked of the game photo alone: a sibling's licence does not stand for it, and a photo taken off its
  // observation fails whatever the predicates say.
  assert.ok(!('fish-s001-cand-12' in R.lenient));
  assert.deepStrictEqual(R.lenient['fish-s001-cand-13'], ['photo_gone']);
  assert.deepStrictEqual(R.lenient['fi3040'], ['photo_gone']);
  assert.deepStrictEqual(R.lenient['seaslug-5001-cand-11'], ['photo_gone']);
  assert.deepStrictEqual(R.lenient['acropora-wide-10'], ['photo_gone']);
  assert.deepStrictEqual(R.lenient['fish-s001-cand-6'], ['casual']);
  assert.deepStrictEqual(R.lenient['fish-s001-cand-10'], ['captive']);
  assert.deepStrictEqual(R.lenient['acropora-wide-9'], ['id_lost']);
  assert.deepStrictEqual(R.lenient['seaslug-5001-cand-2'], ['other_taxon']);
  // The patched predicates are put back.
  assert.ok(R.real['fish-s001-cand-3'] && !('fish-s001-cand-1' in R.real));
});

test('it asks iNaturalist for observation ids only, 200 a request, once more for a miss, and a run that gets nothing fails', () => {
  const R = check('network');
  assert.ok(R.ok, 'every request is observations?id=…&per_page=200&fields=…');
  assert.ok(R.only_ids, 'no name or project data in a query');
  assert.ok(R.taxa >= 1 && R.taxa_ids_only, "the sea-slug genera's taxa are asked by taxon id, a few requests");
  assert.ok(R.ids_max <= 200);
  assert.strictEqual(R.urls, 5, 'one request a subject, one more for each that missed an observation (coral, fish)');
  assert.deepStrictEqual(R.gone, ['acropora-wide-5', 'fish-s001-cand-5']);
  assert.ok(R.recovered, 'an observation a batch lost is asked again, not called deleted');
  assert.match(R.failed, /iNaturalist returned nothing for \d+ of \d+ observations: not drift, a failed run/);
  assert.strictEqual(R.rc, 1);
});

test('the run changes nothing in the repository it reads, and writes only the three report files', () => {
  const R = check('readonly');
  assert.ok(R.same);
  assert.deepStrictEqual(R.out, ['failing.tsv', 'report.json', 'report.md']);
});

// ---- The route is read only (Linear REE-195: no write to data, curation.json or the sheet) ----
const code = f =>
  read(f)
    .split('\n')
    .filter(l => !/^\s*#/.test(l))
    .join('\n');

test('tools/photo_recheck.py writes only its report and the cache it is given, and reaches the sheet nowhere', () => {
  const py = code('tools/photo_recheck.py');
  assert.ok(
    !/^\s*(import|from)\s+(subprocess|requests|boto3?|socket|http|urllib)\b|os\.system/m.test(py),
    'process or network code of its own'
  );
  assert.ok(!/\b(os\.remove|os\.unlink|os\.rmdir|os\.rename|os\.replace|shutil|rmtree|unlink)\b/.test(py), 'a deletion');
  assert.ok(!/script\.google|SYNC_URL|exec\b/.test(py), 'the sheet');
  // The only writes: the three report files and the cache (write_text on a path built from --out or --cache).
  const writes = [...py.matchAll(/^\s*(.*?)\.write_text\(/gm)].map(m => m[1]);
  assert.deepStrictEqual(writes.sort(), ['(out / "failing.tsv")', '(out / "report.json")', '(out / "report.md")', 'Path(cache_path)']);
  assert.ok(!/\bopen\(/.test(py), 'a bare open()');
  assert.ok(!/curation\.json[^\n]*write|write[^\n]*curation\.json/.test(py));
  // The fetchers it imports are not run: no main(), no refresh of their data.
  assert.ok(!/\b(ff|fl|fs|fr)\.(main|run|refill|dump|dump_all|tidy|write)\b/.test(py));
});

test('the weekly workflow reads and reports only: a schedule and a dispatch, contents: read, no secret, no write, no commit', () => {
  const y = read('.github/workflows/photo-recheck.yml');
  const c = code('.github/workflows/photo-recheck.yml');
  assert.match(y, /^on:\n {2}schedule:\n {4}- cron: '[^']+'.*\n {2}workflow_dispatch:\n(?! {2})/m, 'weekly, and by hand');
  assert.match(y, /^permissions:\n {2}contents: read\n(?! {2}\S)/m, 'the one permission is contents: read');
  assert.strictEqual((y.match(/^ {6,}permissions:/gm) || []).length, 0, 'no job asks for more');
  assert.ok(!/secrets\.|GITHUB_TOKEN|GH_TOKEN|git (push|commit|add)|\bgh \w|contents: write|issues: write|rclone|wrangler/.test(c));
  assert.ok(/tools\/photo_recheck\.py/.test(c));
  assert.ok(/--out "\$RUNNER_TEMP\/photo-recheck"/.test(c));
  assert.match(
    c,
    /upload-artifact@v\d+[\s\S]*name: photo-recheck[\s\S]*path: \$\{\{ runner\.temp \}\}\/photo-recheck\/[\s\S]*if-no-files-found: error/
  );
  assert.match(c, /cat "\$RUNNER_TEMP\/photo-recheck\/report\.md" >>"\$GITHUB_STEP_SUMMARY"/);
  // A finding does not fail the job (the report is the product); a failed run does.
  assert.ok(!/\|\| true|continue-on-error/.test(c));
});

test('the tool and the workflow are in the docs: tools/README.md, docs/spec/tools.md, docs/spec/photos.md, docs/PAGES.md', () => {
  assert.match(read('tools/README.md'), /photo_recheck\.py/);
  assert.match(read('docs/spec/tools.md'), /photo_recheck\.py/);
  assert.match(read('docs/spec/photos.md'), /Re-checking the photos in play/);
  assert.match(read('docs/PAGES.md'), /^\| `photo-recheck\.yml`/m);
});
