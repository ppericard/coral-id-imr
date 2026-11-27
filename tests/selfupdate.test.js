require('./slot.js').testGuard();
// The sheet script's self-update against doubles of everything it talks to (REE-342): GitHub's release branch, the
// Apps Script project (its code, its saved versions, its web app deployments) and the web apps those deployments serve,
// which run the very build they point at (tests/gas.js with that build's source). Each trigger run loads the project's
// current code, as Apps Script runs a time trigger on the project's code, not on a deployment. Failures are injected
// call by call, and each test says which build answers after each run, what the Deploy log and the Script Properties
// keep, and what a person would do. Nothing leaves the process: an address the doubles do not know fails the test
// (rule D1: never the real sheet, script, deployment or any Google API).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path');
const {loadCodeGs} = require('./gas.js');

const CODE = fs.readFileSync(path.join(__dirname, '..', 'tools', 'sync', 'Code.gs'), 'utf8');
const verOf = code => Number((/const VERSION = (\d+);/.exec(code) || [0, 0])[1]);
const SV = verOf(CODE);
const bump = (code, n) => code.replace(/const VERSION = (\d+);/, (_, v) => `const VERSION = ${Number(v) + n};`);
const resp = (code, body) => ({
  getResponseCode: () => code,
  getContentText: () => (typeof body === 'string' ? body : JSON.stringify(body))
});
const EXEC = /^https:\/\/script\.google\.com\/macros\/s\/([\w-]+)\/exec\?t=\d+$/;
const API = 'https://script.googleapis.com/v1/projects/SCRIPT_ID';
const RAW = /^https:\/\/raw\.githubusercontent\.com\/[^/]+\/[^/]+\/(release|main)\/tools\/sync\/(Code\.gs|appsscript\.json)\?t=\d+$/;

// The doubles' world. release: what the release branch holds (Code.gs text, or an HTTP status for both files);
// deployments: the web app deployments' ids, all on version 6 (the build `start`) at first.
// fail['post /versions'] = [503, …]: the statuses the next calls of that kind answer (then they succeed again).
// stuck: deployments whose PUT is answered 200 but changes nothing (an accepted change that does not take effect).
function world({release, deployments = ['WEB'], start = CODE}) {
  const w = {
    release,
    manifest: () => '{"timeZone":"Asia/Manila","from":"release"}',
    head: {code: start, manifest: '{}'},
    versions: {6: {code: start, manifest: '{}'}},
    next: 7,
    deps: Object.fromEntries(deployments.map(id => [id, 6])),
    fail: {},
    stuck: new Set(),
    props: {},
    sheets: {},
    calls: [],
    builds: new Map()
  };
  const failed = k => (w.fail[k] && w.fail[k].length ? w.fail[k].shift() : 0);
  // A web app answers a GET with no parameter as its build's doGet does; a build that cannot load answers Google's 500 page.
  w.serve = id => {
    const code = w.versions[w.deps[id]].code;
    if (!w.builds.has(code)) {
      try {
        w.builds.set(code, loadCodeGs({source: code}));
      } catch (e) {
        w.builds.set(code, null);
      }
    }
    const b = w.builds.get(code);
    return b ? resp(200, b.get({})) : resp(500, '<html><body>Script error</body></html>');
  };
  w.answers = id => {
    const r = w.serve(id);
    return r.getResponseCode() === 200 ? 'v' + JSON.parse(r.getContentText()).v : 'HTTP ' + r.getResponseCode();
  };
  w.fetch = (url, o = {}) => {
    const m = (o.method || 'get').toLowerCase();
    let x;
    if ((x = RAW.exec(url))) {
      w.calls.push('github ' + x[1] + '/' + x[2]);
      if (x[1] !== 'release') throw new Error('main read while release exists: ' + url);
      if (typeof w.release === 'number') return resp(w.release, 'status ' + w.release);
      return x[2] === 'Code.gs' ? resp(200, w.release) : resp(200, w.manifest());
    }
    if ((x = EXEC.exec(url))) {
      w.calls.push('exec ' + x[1]);
      return w.serve(x[1]);
    }
    if (url.startsWith(API + '/')) {
      const p = url.slice(API.length),
        k = m + ' ' + p.split('?')[0];
      w.calls.push(k);
      const st = failed(k);
      if (st) return resp(st, {error: {code: st, message: 'injected'}});
      if (k === 'get /content')
        return resp(200, {
          files: [
            {name: 'appsscript', type: 'JSON', source: w.head.manifest},
            {name: 'Code', type: 'SERVER_JS', source: w.head.code}
          ]
        });
      if (k === 'put /content') {
        const f = JSON.parse(o.payload).files;
        w.head = {code: f.find(y => y.name === 'Code').source, manifest: f.find(y => y.name === 'appsscript').source};
        return resp(200, {});
      }
      if (k === 'post /versions') {
        const n = w.next++;
        w.versions[n] = {...w.head};
        return resp(200, {versionNumber: n});
      }
      if (k === 'get /versions') return resp(200, {versions: Object.keys(w.versions).map(n => ({versionNumber: Number(n)}))});
      if (k === 'get /deployments')
        return resp(200, {
          deployments: [{deploymentId: 'HEAD', deploymentConfig: {}}].concat(
            Object.entries(w.deps).map(([id, n]) => ({
              deploymentId: id,
              deploymentConfig: {versionNumber: n},
              entryPoints: [{entryPointType: 'WEB_APP', webApp: {url: 'https://script.google.com/macros/s/' + id + '/exec'}}]
            }))
          )
        });
      const d = /^put \/deployments\/([\w-]+)$/.exec(k);
      if (d && d[1] in w.deps) {
        if (!w.stuck.has(d[1])) w.deps[d[1]] = JSON.parse(o.payload).deploymentConfig.versionNumber;
        return resp(200, {});
      }
      throw new Error('API call the doubles do not know: ' + k);
    }
    // The data files of main the up-to-date run reads (curation.json, the fish files): tests/gas.js serves them.
    if (/^https:\/\/raw\.githubusercontent\.com\/[^/]+\/[^/]+\/main\/(?!tools\/)/.test(url)) return null;
    throw new Error('an address the doubles do not know: ' + url);
  };
  // One 15-minute trigger run: the project's current code, with the Script Properties and the tabs the last run left.
  w.run = () => {
    let s;
    try {
      s = loadCodeGs({source: w.head.code, fetch: w.fetch});
    } catch (e) {
      return 'trigger cannot start: ' + e.message;
    }
    Object.assign(s.props, w.props);
    Object.assign(s.sheets, w.sheets);
    try {
      return s.ctx.autoUpdate();
    } finally {
      w.props = {...s.props};
      Object.assign(w.sheets, s.sheets);
    }
  };
  // The updater's own Deploy log lines (an up-to-date run's other work, the one-shot migrations, logs too).
  w.log = () =>
    (w.sheets['Deploy log'] ? w.sheets['Deploy log'].rows.slice(1).map(r => String(r[1])) : []).filter(l =>
      /^(deployed |serving check|sheet script|error|version count|v\d+ not installed)/.test(l)
    );
  w.alerts = () => (w.sheets.Alerts ? w.sheets.Alerts.rows.slice(1).map(r => String(r[1])) : []);
  w.serving = () => JSON.parse(w.props.AUTO_SERVE || 'null');
  // Time passes: the serving check's clocks move back by ms (the script reads Date.now()).
  w.age = ms => {
    const s = w.serving();
    s.at -= ms;
    if (s.alerted) s.alerted -= ms;
    w.props.AUTO_SERVE = JSON.stringify(s);
  };
  return w;
}
const made = w => Object.keys(w.versions).length - 1; // versions saved since the start (version 6)

test('success: the new build answers at once, the deploy is verified and kept as the last good version', () => {
  const w = world({release: bump(CODE, 1)});
  assert.strictEqual(w.answers('WEB'), 'v' + SV);
  assert.strictEqual(w.run(), 'deployed v' + (SV + 1));
  assert.strictEqual(w.answers('WEB'), 'v' + (SV + 1));
  assert.deepStrictEqual(
    w.log().map(l => l.replace(/\d+/g, 'N')),
    ['deployed vN as version N (N web app deployment), from release', 'serving check: vN answers (vN)']
  );
  const s = w.serving();
  assert.deepStrictEqual([s.v, s.ver, s.ok, s.before, s.seen], [SV + 1, 7, true, [6], 'v' + (SV + 1)]);
  assert.strictEqual(w.props.AUTO_PENDING, undefined);
  // The next run is the new build itself, up to date: nothing asked again once verified.
  const n = w.calls.length;
  assert.match(w.run(), /^up to date/);
  assert.deepStrictEqual(
    w.calls.slice(n).filter(c => !c.startsWith('github')),
    [],
    'no API call, no web app request'
  );
});

test('interrupted promotion (POST /versions fails): the old build keeps answering, the next run finishes and verifies', () => {
  const w = world({release: bump(CODE, 1)});
  w.fail['post /versions'] = [503];
  assert.strictEqual(w.run(), 'error');
  assert.strictEqual(verOf(w.head.code), SV + 1, 'the new code is in place');
  assert.strictEqual(w.answers('WEB'), 'v' + SV, 'the last good build still answers');
  assert.strictEqual(w.props.AUTO_PENDING, String(SV + 1));
  assert.strictEqual(w.props.AUTO_SERVE, undefined, 'nothing deployed, nothing to check');
  // The next run is the new code (the trigger runs the project's code): it finishes the update, then checks it.
  assert.strictEqual(w.run(), 'deployed v' + (SV + 1));
  assert.strictEqual(w.answers('WEB'), 'v' + (SV + 1));
  assert.strictEqual(w.serving().ok, true);
  assert.match(w.log().at(-2), /finishing an interrupted update/);
  assert.strictEqual(made(w), 1, 'one version saved');
});

test('interrupted at the second of two deployments: both answer the new build once finished, each retry saved one more version', () => {
  // Today's behaviour, unchanged here (REE-342 finding, the version limit of REE-234): AUTO_PENDING finishes the update
  // by saving a new version at every run until the deployments take it.
  const w = world({release: bump(CODE, 1), deployments: ['WEB', 'WEB2']});
  w.fail['put /deployments/WEB2'] = [503, 503, 503];
  assert.strictEqual(w.run(), 'error');
  assert.deepStrictEqual([w.answers('WEB'), w.answers('WEB2')], ['v' + (SV + 1), 'v' + SV], 'split for 15 minutes');
  assert.strictEqual(w.run(), 'error');
  assert.strictEqual(w.run(), 'error');
  assert.strictEqual(w.run(), 'deployed v' + (SV + 1));
  assert.deepStrictEqual([w.answers('WEB'), w.answers('WEB2')], ['v' + (SV + 1), 'v' + (SV + 1)]);
  assert.strictEqual(w.serving().ok, true);
  assert.match(w.serving().seen, /^…WEB v\d+, …WEB2 v\d+$/);
  assert.strictEqual(made(w), 4, 'four versions for one update: one a run');
});

test('accepted but not applied: the deploy is not verified, asked again safely each run, alerted after the grace, then seen serving', () => {
  const w = world({release: bump(CODE, 1)});
  w.stuck.add('WEB');
  assert.strictEqual(w.run(), 'deployed v' + (SV + 1) + ' (not verified serving)');
  assert.strictEqual(w.answers('WEB'), 'v' + SV, 'the older build still answers');
  assert.strictEqual(w.props.AUTO_PENDING, undefined, 'the deployment calls succeeded: no new version is saved again');
  assert.match(w.log()[0], /^deployed v\d+ as version 7/, 'what the updater said before REE-342, its only line');
  assert.strictEqual(w.log()[1], 'serving check: v' + (SV + 1) + ' NOT verified, the web app answers v' + SV + '; asked again at each run');
  assert.deepStrictEqual(w.alerts(), [], 'an older build may still answer for a while: no alert yet');
  // Up-to-date runs repeat the check only: no version saved, no deployment changed, nothing more logged.
  const n = w.calls.length,
    lines = w.log().length;
  for (let i = 0; i < 3; i++) assert.match(w.run(), /^up to date/);
  assert.deepStrictEqual(
    w.calls.slice(n).filter(c => !c.startsWith('github')),
    ['exec WEB', 'exec WEB', 'exec WEB']
  );
  assert.strictEqual(made(w), 1);
  assert.strictEqual(w.log().length, lines);
  // Half an hour on: one Alerts line (and Deploy log line) with what answers and what it served before, once a day.
  w.age(31 * 60000);
  w.run();
  assert.deepStrictEqual(w.alerts(), [
    'sheet script: v' +
      (SV + 1) +
      ' was deployed as version 7 31 min ago but the web app answers v' +
      SV +
      '; it served version 6 before; Deploy > Manage deployments in the Apps Script editor shows what each deployment serves'
  ]);
  assert.strictEqual(w.log().at(-1), w.alerts()[0]);
  w.run();
  assert.strictEqual(w.alerts().length, 1, 'once a day');
  // The deployment takes the version (a person in the editor, or Google catching up): the next run sees it.
  w.stuck.clear();
  w.deps.WEB = 7;
  w.run();
  assert.strictEqual(w.serving().ok, true);
  assert.match(w.log().at(-1), /^serving check: v\d+ now answers, 31 min after the deploy \(v\d+\)$/);
});

test('a build that cannot load: no JSON answers, alerted in the run that deployed it, the last good version named', () => {
  // First a good update (version 7), then a release whose code throws as it loads (version 8).
  const w = world({release: bump(CODE, 1)});
  assert.strictEqual(w.run(), 'deployed v' + (SV + 1));
  w.release = bump(CODE, 2) + '\nthrow new Error("broken at load");\n';
  assert.strictEqual(w.run(), 'deployed v' + (SV + 2) + ' (not verified serving)');
  assert.strictEqual(w.answers('WEB'), 'HTTP 500');
  assert.deepStrictEqual(w.alerts(), [
    'sheet script: v' +
      (SV + 2) +
      ' was deployed as version 8 0 min ago but the web app answers HTTP 500; version 7 (v' +
      (SV + 1) +
      ') was the last seen serving; Deploy > Manage deployments in the Apps Script editor shows what each deployment serves'
  ]);
  assert.deepStrictEqual(w.serving().good, {v: SV + 1, ver: 7});
  // Its own trigger runs cannot start: the alert above was the only one it could write.
  assert.match(w.run(), /^trigger cannot start: broken at load/);
  // Recovery is a person's: pointing the deployment back at the last good version restores the service (the code
  // itself stays broken until a working Code.gs is pasted: HANDOVER "Manual deploy").
  w.deps.WEB = w.serving().good.ver;
  assert.strictEqual(w.answers('WEB'), 'v' + (SV + 1));
});

test('no web app deployment to repoint: the deploy is not verified and alerted at once', () => {
  const w = world({release: bump(CODE, 1), deployments: []});
  assert.strictEqual(w.run(), 'deployed v' + (SV + 1) + ' (not verified serving)');
  assert.match(w.log()[0], /\(0 web app deployments\)/);
  assert.deepStrictEqual(w.alerts(), [
    'sheet script: v' +
      (SV + 1) +
      ' was deployed as version 7 0 min ago but the web app answers nothing (no web app deployment found)' +
      '; Deploy > Manage deployments in the Apps Script editor shows what each deployment serves'
  ]);
});

test('release moves between the two reads: the code of one commit is installed with the manifest of the next (not fixed here)', () => {
  // Today's behaviour (REE-342 finding): Code.gs and appsscript.json are read by branch name, one request each, so a
  // train that pushes release between them (or a cache that serves each file from another commit) pairs them.
  const w = world({release: bump(CODE, 1)});
  w.manifest = () => {
    w.release = bump(CODE, 2); // the train pushed the next commit after Code.gs was read
    return '{"timeZone":"Asia/Manila","from":"next commit"}';
  };
  assert.strictEqual(w.run(), 'deployed v' + (SV + 1));
  assert.strictEqual(verOf(w.versions[7].code), SV + 1);
  assert.strictEqual(JSON.parse(w.versions[7].manifest).from, 'next commit');
});
