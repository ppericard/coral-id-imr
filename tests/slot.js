// The machine slot shared by every heavy run (rule W24): every Playwright script (tests/*.smoke.js, tests/calm.js,
// tools/learnsim.js, tools/perf.js, tools/rtprep.js, tools/og/make_og.js, tools/fish_draw_sim.js), full unit-test runs
// and heavy tools (1b).
//
// 1. slot(name): at most SMOKE_SLOTS Playwright runs on this machine at once (default: one per 2 cores, at least 1), and
//    none starts while the machine is already saturated (1-minute load average above LOAD x the cores: 8 on 4 cores),
//    and none starts with less than MIN_FREE_GB (5 GB) free on the repository's disk: it refuses, with what to clean.
//    Several agent sessions share one machine, and an overloaded one slows every smoke until fixed timeouts fail.
//    The slots are files in one directory every session and every user of the machine sees; a slot whose process is
//    gone (by PID and start time on Linux; elsewhere by PID, or no refresh for 10 minutes) is taken back. Waiters are
//    served in arrival order: each takes a ticket in the same directory, and a free slot goes to the oldest live one (a
//    dead waiter's ticket is skipped; see ticket(), below). No-op on CI,
//    where each smoke has its own runner. Call it before chromium.launch(); the slot is given back when the process
//    ends. A holder's children run in its slot (REEFID_SLOT, below): a smoke or a full unit-test run that starts a guarded tool never waits for its own slot.
//
// 1b. Heavy work other than Playwright takes the same slots:
//    node tests/run.js [node --test options] [files]   a full unit-test run (default: every tests/*.test.js but the
//                                                       `// @slow` ones; --all: those too); a single
//                                                       file stays unlocked: node --test tests/x.test.js (the fast tier)
//    node tests/slot.js [--name N] -- cmd [args]        any command, run once it holds a slot
//    slot.guard(name)                                   at the top of a heavy Node tool: re-runs it under the slot (a
//                                                       Python tool: tools/slot.py guard(), the same way)
//    slot.testGuard()                                   the first line of every tests/*.test.js: in a several-file
//                                                       `node --test` run it takes the slot for the runner (its PID), so
//                                                       even the bare `node --test tests/*.test.js` waits; a single file
//                                                       stays unlocked (tests/slotguard.test.js lists the files)
//    All of them are no-ops on CI (CI set) and inside a holder's process tree.
//
// 2. parts(all, groups) and widths(def): what a smoke runs, from the environment (default: everything).
//    SMOKE_ONLY=a,b   only these parts (pages.smoke.js: main, overlays, basics, credits, visit, tips, signin, replay);
//                     PAGES_ONLY=x does the same.
//    SMOKE_PART=name  one group of parts, for CI shards (pages.smoke.js: main, overlays, rest, more; fish.smoke.js: main,
//                     fresh; admin.smoke.js: main, actions, more); tests/smokeparts.test.js fails when a group has no job in smokes.yml.
//    SMOKE_W=390      only these viewport widths in a smoke's width loop (pages.smoke.js main, admin.smoke.js).
//    An unknown name fails at once, so a typo never passes as a run that checked nothing; a partial run says so at the end.
const fs = require('fs'),
  os = require('os'),
  path = require('path');

const DIR =
    process.env.SMOKE_SLOT_DIR ||
    (process.platform === 'win32' ? path.join(os.tmpdir(), 'reefid-playwright-slots') : '/tmp/reefid-playwright-slots'),
  STALE = 10 * 60e3, // without /proc: a holder refreshes its slot every minute; 10 minutes without it = gone
  GRACE = 60e3, // a record still incomplete after a minute was left by a crash (records are published whole, below)
  POLL = +process.env.SMOKE_SLOT_POLL || 2000,
  cores = () => os.cpus().length || 1,
  LOAD = 2, // the load budget of every heavy run: wait while the 1-minute load average is above LOAD x the cores (rule W24)
  maxLoad = () => LOAD * cores(),
  // Free disk a heavy run needs before it starts (the disk is small and every agent shares it).
  MIN_FREE_GB = 5,
  ROOT = path.join(__dirname, '..'),
  {spawn, spawnSync} = require('child_process');

// The start time of a process (Linux /proc, clock ticks since boot): with its PID it names the process even after the
// PID is reused. '' where there is no /proc; null when the process is gone.
function started(pid) {
  try {
    return fs.readFileSync(`/proc/${pid}/stat`, 'utf8').split(') ').pop().split(' ')[19];
  } catch (e) {
    if (e.code === 'ENOENT' && fs.existsSync('/proc/self/stat')) return null;
    return '';
  }
}

// A slot's record, one line: "pid start user time name\n" (start '-' without /proc). Written to a file of its own,
// then linked into place, so a slot file always holds a whole record (a file created empty, then written, could be read
// as a dead holder's by a waiter and let two holders run).
const user = () => {
    try {
      return os.userInfo().username || 'uid' + process.getuid();
    } catch (e) {
      return 'uid' + (process.getuid ? process.getuid() : '?'); // a container user with no name
    }
  },
  record = (name, pid = process.pid) => `${pid} ${started(pid) || '-'} ${user()} ${new Date().toISOString()} ${name}\n`;

// True when the slot file f, as read now (text, stat), belongs to no running holder.
function dead(text, st) {
  const [pid, start] = text.split(' '),
    whole = text.endsWith('\n') && +pid > 0;
  if (!whole) return Date.now() - st.mtimeMs > GRACE;
  const now = started(+pid);
  if (now === null) return true; // gone
  if (now) return start !== '-' && now !== start; // that PID is another process now
  try {
    process.kill(+pid, 0); // no /proc: ESRCH when the process is gone, EPERM when it is another user's
  } catch (e) {
    if (e.code === 'ESRCH') return true;
  }
  return Date.now() - st.mtimeMs > STALE;
}

// This process's id in a slot record ("pid start"), and whether this process or an ancestor holds a live slot: the holder
// puts its id in REEFID_SLOT, its children inherit it, and the id must still name a live record of DIR (a stray or
// exported REEFID_SLOT never turns the lock off).
const me = () => `${process.pid} ${started(process.pid) || '-'}`;
function held() {
  const h = process.env.REEFID_SLOT;
  if (!h) return false;
  try {
    return fs.readdirSync(DIR).some(n => {
      if (!/^slot\d+$/.test(n)) return false;
      const f = path.join(DIR, n);
      try {
        const text = fs.readFileSync(f, 'utf8');
        return text.startsWith(h + ' ') && !dead(text, fs.statSync(f));
      } catch (e) {
        return false;
      }
    });
  } catch (e) {
    return false;
  }
}

// The slot files (names) of DIR whose live record belongs to the process pid.
function slotsOf(pid) {
  try {
    return fs.readdirSync(DIR).filter(n => {
      const f = path.join(DIR, n);
      try {
        const text = fs.readFileSync(f, 'utf8');
        return /^slot\d+$/.test(n) && text.startsWith(pid + ' ') && !dead(text, fs.statSync(f));
      } catch (e) {
        return false;
      }
    });
  } catch (e) {
    return [];
  }
}

// Enough free disk for a heavy run on the file system of dir (default: this repository): {ok, free, min, dir}, free in GB.
// SLOT_MIN_FREE_GB changes the threshold (tests); a file system that cannot say counts as enough.
function diskOk(dir = ROOT, min = process.env.SLOT_MIN_FREE_GB !== undefined ? +process.env.SLOT_MIN_FREE_GB : MIN_FREE_GB) {
  let free = Infinity;
  try {
    const st = fs.statfsSync(dir);
    free = (st.bavail * st.bsize) / 1e9;
  } catch (e) {}
  return {ok: free >= min, free, min, dir};
}

// Takes back the slot f if its holder is gone. One reaper at a time per slot (the directory f.reap, made atomically),
// and f is removed only if it is still the very file judged dead: a new holder's file is never removed. Returns false
// when the slot could not be taken back because of the file system's permissions.
function reap(f) {
  const lock = f + '.reap';
  try {
    fs.mkdirSync(lock);
  } catch (e) {
    try {
      if (Date.now() - fs.statSync(lock).mtimeMs > 30e3) fs.rmdirSync(lock); // a reaper that crashed: next round
    } catch (e) {}
    return true;
  }
  try {
    const st = fs.statSync(f),
      text = fs.readFileSync(f, 'utf8');
    if (dead(text, st) && fs.statSync(f).ino === st.ino) fs.unlinkSync(f);
    return true;
  } catch (e) {
    return !['EPERM', 'EACCES'].includes(e.code);
  } finally {
    try {
      fs.rmdirSync(lock);
    } catch (e) {}
  }
}

// The queue (rule W24): each waiter takes a ticket in DIR, a file "ticket-<ms>-<pid>-<random>" (fixed widths: the names
// sort in arrival order) holding a record like a slot's, published whole the same way. A free slot goes to the oldest
// live ticket: a waiter tries the slots only while fewer live tickets are older than its own than slots are free. A ticket
// whose waiter is gone is skipped and taken back (dead(), the holders' check); a waiter drops its ticket when it stops
// waiting, whatever the reason. A directory with no tickets (or one where a ticket cannot be made) works as before.
const TICKET = /^ticket-\d{14}-\d{10}-[0-9a-z]{8}$/;
function ticket(name) {
  const key = `ticket-${String(Date.now()).padStart(14, '0')}-${String(process.pid).padStart(10, '0')}-${Math.random()
      .toString(36)
      .slice(2, 10)
      .padEnd(8, '0')}`,
    f = path.join(DIR, key),
    tmp = path.join(DIR, `.new-${process.pid}-ticket-${Math.random().toString(36).slice(2)}`),
    text = record(name);
  try {
    fs.writeFileSync(tmp, text, {mode: 0o666});
    fs.linkSync(tmp, f);
    return {key, f, text};
  } catch (e) {
    return null;
  } finally {
    try {
      fs.unlinkSync(tmp);
    } catch (e) {}
  }
}
// The live tickets older than key (the dead ones are taken back on the way).
function ahead(key) {
  let k = 0;
  let names = [];
  try {
    names = fs.readdirSync(DIR);
  } catch (e) {}
  for (const t of names) {
    if (!TICKET.test(t) || t >= key) continue;
    const f = path.join(DIR, t);
    try {
      if (dead(fs.readFileSync(f, 'utf8'), fs.statSync(f))) reap(f);
      else k++;
    } catch (e) {} // gone meanwhile
  }
  return k;
}
// How many of the n slots are free: no file, or a holder that is gone (taken back by the next try). A slot that cannot be
// read (a directory that is not one, or not searchable) counts as free too: the try that follows meets the error and
// runs without a slot, as before the queue.
function freeSlots(n) {
  let k = 0;
  for (let i = 0; i < n; i++) {
    const f = path.join(DIR, 'slot' + i);
    try {
      if (dead(fs.readFileSync(f, 'utf8'), fs.statSync(f))) k++;
    } catch (e) {
      k++;
    }
  }
  return k;
}

// Taking a slot for the process o.pid (see slot): one taker at a time per process (a lock file made atomically, taken back
// when its taker is gone), so two files racing for one runner never end with two slots.
async function holdFor(name, o) {
  const lock = path.join(DIR, '.hold-' + o.pid);
  try {
    fs.mkdirSync(DIR, {recursive: true});
    fs.chmodSync(DIR, 0o777);
  } catch (e) {}
  for (;;) {
    if (slotsOf(o.pid).length) return () => {};
    const tmp = path.join(DIR, `.new-${process.pid}-hold-${Math.random().toString(36).slice(2)}`);
    let got = false;
    try {
      fs.writeFileSync(tmp, record(name), {mode: 0o666});
      fs.linkSync(tmp, lock);
      got = true;
    } catch (e) {
      if (e.code === 'EEXIST') reap(lock);
      else return () => {}; // no usable directory: run without a slot
    } finally {
      try {
        fs.unlinkSync(tmp);
      } catch (e) {}
    }
    if (got) break;
    await new Promise(r => setTimeout(r, POLL));
  }
  try {
    return await slot(name, {...o, locked: true});
  } finally {
    try {
      fs.unlinkSync(lock);
    } catch (e) {}
  }
}

// o.timeout (ms, tests): give up waiting and resolve null. o.signals === false: the caller handles Ctrl-C and kills itself
// (run(), which waits for its child first). o.pid: take the slot for that other, running process (the `node --test` runner,
// see testGuard) and keep it until that process ends (no exit hook: dead() takes it back); it resolves at once when that
// process already holds one; two racing takers end with one slot (holdFor).
async function slot(name, o = {}) {
  if (process.env.CI || held()) return () => {};
  if (o.pid && !o.locked) return holdFor(name, o);
  // Checked before each try, so a run that waited never starts on a disk that filled up meanwhile.
  const roomy = () => {
    const disk = diskOk();
    if (disk.ok) return;
    console.error(
      `${name}: refused: ${disk.free.toFixed(1)} GB free on the disk of ${disk.dir}, under the ${disk.min} GB a heavy run needs ` +
        '(rule W24). Clean up behind you first: merged worktrees (git worktree remove), temporary downloads, venvs, old screenshots.'
    );
    process.exit(1);
  };
  const n = Math.max(1, +process.env.SMOKE_SLOTS || Math.floor(cores() / 2)),
    t0 = Date.now();
  // Every user of the machine takes and takes back slots here: the directory is writable by all and not sticky, so a
  // dead holder's slot is taken back whoever it belonged to.
  try {
    fs.mkdirSync(DIR, {recursive: true});
    fs.chmodSync(DIR, 0o777);
  } catch (e) {}
  // This waiter's place in the queue, dropped whenever it stops waiting (a slot, a timeout, a refusal, an exit).
  const tk = ticket(name),
    drop = () => {
      try {
        if (tk && fs.readFileSync(tk.f, 'utf8') === tk.text) fs.unlinkSync(tk.f);
      } catch (e) {}
    };
  process.on('exit', drop);
  try {
    return await take(name, o, n, t0, roomy, tk);
  } finally {
    drop();
    process.removeListener('exit', drop);
  }
}

// The waiting loop of slot(): tries the slots whenever the load allows and the queue gives this waiter its turn.
async function take(name, o, n, t0, roomy, tk) {
  let touched = Date.now(),
    queue = 0;
  for (let said = 0; ;) {
    roomy();
    if (o.pid && slotsOf(o.pid).length) return () => {};
    if (tk && Date.now() - touched > 60e3) {
      try {
        fs.utimesSync(tk.f, new Date(), new Date()); // alive (dead() without /proc)
      } catch (e) {}
      touched = Date.now();
    }
    const load = os.loadavg()[0];
    queue = tk ? ahead(tk.key) : 0;
    if (load <= maxLoad() && queue < freeSlots(n))
      for (let i = 0; i < n; i++) {
        const f = path.join(DIR, 'slot' + i),
          tmp = path.join(DIR, `.new-${process.pid}-${i}-${Math.random().toString(36).slice(2)}`);
        let got = false;
        // Two tries: when the first finds the slot held and takes back a dead holder's file, the second links into the
        // place just freed, in this same pass, not a poll later (a poll later, a process stalled by a loaded runner's
        // disk or CPU had spent its whole timeout and gave up with the freed slot in front of it).
        for (let again = 0; !got && again < 2; again++) {
          try {
            fs.writeFileSync(tmp, record(name, o.pid), {mode: 0o666});
            fs.linkSync(tmp, f); // fails if the slot is held: atomic, and f appears with its whole record
            got = true;
          } catch (e) {
            if (e.code !== 'EEXIST') {
              console.error(`${name}: no smoke slot (${DIR}: ${e.code}); running without one.`);
              return () => {};
            }
            if (again === 0 && !reap(f)) {
              // A file system that lets no one take back a dead slot (a directory made by another user, sticky): rather
              // than wait for ever or fail, run without a slot, and say so.
              console.error(`${name}: cannot take back a dead slot in ${DIR} (permissions); running without a slot.`);
              return () => {};
            }
          } finally {
            try {
              fs.unlinkSync(tmp);
            } catch (e) {}
          }
        }
        if (!got) continue;
        if (o.pid) return () => {}; // the slot stays with the runner, whose end gives it back (dead())
        const mine = fs.readFileSync(f, 'utf8'),
          outer = process.env.REEFID_SLOT, // a stale or test value: put back when this slot is given back
          keep = setInterval(() => {
            try {
              fs.utimesSync(f, new Date(), new Date());
            } catch (e) {}
          }, 60e3),
          free = () => {
            clearInterval(keep);
            if (process.env.REEFID_SLOT === me()) {
              if (outer) process.env.REEFID_SLOT = outer;
              else delete process.env.REEFID_SLOT;
            }
            try {
              if (fs.readFileSync(f, 'utf8') === mine) fs.unlinkSync(f);
            } catch (e) {}
          };
        keep.unref();
        process.env.REEFID_SLOT = me(); // children (a tool, a test that runs one) run in this slot
        process.on('exit', free);
        // Ctrl-C or a kill: give the slot back, then end the way the signal would have.
        if (o.signals !== false)
          for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP'])
            process.once(sig, () => {
              free();
              process.kill(process.pid, sig);
            });
        if (said) console.error(`${name}: got smoke slot ${i + 1} of ${n} after ${Math.round((Date.now() - t0) / 1000)} s.`);
        return free;
      }
    if (o.timeout && Date.now() - t0 > o.timeout) return null;
    if (!(said++ % Math.max(1, Math.round(30e3 / POLL))))
      console.error(
        `${name}: waiting for a smoke slot (${n} on this machine, ${DIR}; load ${load.toFixed(1)}, budget ${maxLoad()} on ${cores()} cores)` +
          (said > 1 ? `, ${Math.round((Date.now() - t0) / 1000)} s so far` : '') +
          (queue ? `, ${queue} ahead in the queue` : '') +
          '…'
      );
    await new Promise(r => setTimeout(r, POLL));
  }
}

// The parts of a smoke to run: a Set of names out of all (in order), from SMOKE_ONLY / PAGES_ONLY / SMOKE_PART.
// The groups (SMOKE_PART, the CI shards) must cover every part between them: a part in no group would run on no runner.
function parts(all, groups = {}) {
  const lost = Object.keys(groups).length ? all.filter(p => !Object.values(groups).some(g => g.includes(p))) : [];
  if (lost.length) throw new Error(`SMOKE_PART: the groups (${Object.keys(groups).join(', ')}) leave out ${lost.join(', ')}`);
  const only = process.env.SMOKE_ONLY || process.env.PAGES_ONLY,
    part = process.env.SMOKE_PART;
  let pick = all;
  if (only) pick = only.split(',').map(s => s.trim());
  else if (part) {
    if (!groups[part]) throw new Error(`SMOKE_PART=${part}: no such group (${Object.keys(groups).join(', ') || 'none'})`);
    pick = groups[part];
  }
  const bad = pick.filter(p => !all.includes(p));
  if (bad.length) throw new Error(`SMOKE_ONLY: no part named ${bad.join(', ')} (parts: ${all.join(', ')})`);
  return new Set(pick);
}

// The widths of a smoke's width loop: def, or the ones SMOKE_W names (each must be one of def).
function widths(def) {
  if (!process.env.SMOKE_W) return def;
  const w = process.env.SMOKE_W.split(',').map(Number),
    bad = w.filter(x => !def.includes(x));
  if (bad.length) throw new Error(`SMOKE_W: ${bad.join(', ')} is not a width of this smoke (${def.join(', ')})`);
  return def.filter(x => w.includes(x));
}

// A line for the end of a partial run, so it never reads as the whole smoke: '' when everything ran.
function partial(all, run, def, ws) {
  const out = [];
  if (run && run.size < all.length) out.push(`parts ${[...run].join(', ')} of ${all.join(', ')}`);
  if (ws && ws.length < def.length) out.push(`widths ${ws.join(', ')} of ${def.join(', ')}`);
  return out.length ? ` (partial run: ${out.join('; ')})` : '';
}

// Runs cmd args once this process holds a slot, with the slot handed down (REEFID_SLOT, and REEFID_SLOT_WRAP = this pid
// so a guarded tool run directly by it never re-runs itself), and gives the slot back when cmd ends. Ctrl-C or a kill
// reaches cmd first; this process then ends with cmd's code (or its signal). If the process that started this one ends
// (a guarded tool killed by its own PID), cmd is stopped too and the slot given back.
async function run(cmd, args, name) {
  const free = await slot(name, {signals: false}),
    child = spawn(cmd, args, {stdio: 'inherit', env: {...process.env, REEFID_SLOT_WRAP: String(process.pid)}}),
    sigs = ['SIGINT', 'SIGTERM', 'SIGHUP'],
    pass = sig => child.kill(sig);
  for (const sig of sigs) process.on(sig, pass);
  const parent = process.ppid,
    orphan = setInterval(() => {
      if (process.ppid === parent) return;
      clearInterval(orphan);
      child.kill('SIGTERM');
      setTimeout(() => child.kill('SIGKILL'), 5000).unref();
    }, 300);
  orphan.unref();
  child.on('error', e => {
    free();
    console.error(`${name}: cannot run ${cmd} (${e.code || e.message})`);
    process.exit(127);
  });
  child.on('exit', (code, sig) => {
    clearInterval(orphan);
    free();
    for (const s of sigs) process.removeListener(s, pass);
    if (sig) process.kill(process.pid, sig);
    else process.exit(code);
  });
}

// At the top of a heavy Node tool (before its work, after its usage check): run the rest of it in a slot. Outside a
// slot it runs itself again under `node tests/slot.js`, waits, and ends with that run's code; on CI, inside a holder's
// process tree, or when it is that run, it returns at once.
function guard(name) {
  if (process.env.CI || process.env.REEFID_SLOT_WRAP === String(process.ppid) || held()) return;
  const r = spawnSync(
    process.execPath,
    [__filename, '--name', name, '--', process.execPath, ...process.execArgv, ...process.argv.slice(1)],
    {
      stdio: 'inherit'
    }
  );
  if (r.error) return console.error(`${name}: no machine slot (${r.error.code}); running without one.`);
  if (r.signal) process.kill(process.pid, r.signal);
  process.exit(r.status);
}

// The first line of every tests/*.test.js: `require('./slot.js').testGuard();`. A file run by the `node --test` runner
// together with other files (several files given, or none: the runner finds them) takes the machine slot for the runner
// (its PID: the slot lasts as long as the run, whichever file asked first), so even a bare
// `node --test tests/*.test.js` waits its turn (rule W24). One file given stays unlocked (the fast tier), and so do a file
// run directly (no runner), CI, a run inside a holder's tree (node tests/run.js: REEFID_SLOT) and a machine without /proc
// (a laptop: nothing to protect, and the runner's command line cannot be read). Blocks (the file has not started yet) and
// then gives the file's own children the slot (REEFID_SLOT), so a test that runs a guarded tool never waits for it.
// The files a `node --test` command line names (the argv after --test): a script (.js .cjs .mjs .ts), or a glob. The value
// of an option that takes one (--test-reporter-destination report.log, --import x.js) is none;
// a directory or a name without a script extension is not counted: the runner finds the files in it.
const WITH_VALUE =
  /^(-r|--require|--import|--loader|--experimental-loader|--env-file|--test-reporter|--test-reporter-destination|--test-name-pattern|--test-skip-pattern|--test-concurrency|--test-timeout|--test-shard|--test-isolation)$/;
function testFiles(argv) {
  const files = [];
  for (let i = 0; i < argv.length; i++) {
    if (WITH_VALUE.test(argv[i])) i++;
    else if (!argv[i].startsWith('-') && (/\.[cm]?[jt]s$/.test(argv[i]) || argv[i].includes('*'))) files.push(argv[i]);
  }
  return files;
}

function testGuard() {
  if (process.env.CI || !process.env.NODE_TEST_CONTEXT || held()) return;
  let argv;
  try {
    argv = fs.readFileSync(`/proc/${process.ppid}/cmdline`, 'utf8').split('\0');
  } catch (e) {
    return;
  }
  const at = argv.indexOf('--test');
  if (at < 0) return;
  const files = testFiles(argv.slice(at + 1));
  if (files.length === 1 && !files[0].includes('*')) return; // one file: the fast tier
  const r = spawnSync(
    process.execPath,
    [__filename, '--name', 'node --test (' + (files.length || 'all') + ' files)', '--hold', String(process.ppid)],
    {
      stdio: 'inherit'
    }
  );
  if (r.error) return console.error(`node --test: no machine slot (${r.error.code}); running without one.`);
  if (r.status) process.exit(r.status);
  process.env.REEFID_SLOT = `${process.ppid} ${started(process.ppid) || '-'}`;
}

module.exports = slot;
Object.assign(slot, {slot, parts, widths, partial, held, run, guard, testGuard, testFiles, diskOk, maxLoad, LOAD, MIN_FREE_GB, DIR});

// node tests/slot.js [--name N] -- cmd [args]        node tests/slot.js --name N --hold PID  (testGuard's helper)
if (require.main === module) {
  const a = process.argv.slice(2),
    hold = a.indexOf('--hold'),
    at = a.indexOf('--'),
    cmd = at < 0 ? [] : a.slice(at + 1),
    name = a[0] === '--name' && at > 1 ? a[1] : cmd.join(' ').slice(0, 60);
  if (hold >= 0) slot(a[a.indexOf('--name') + 1] || 'node --test', {pid: +a[hold + 1]}).then(() => process.exit(0));
  else if (!cmd.length) {
    console.error('usage: node tests/slot.js [--name N] -- cmd [args]');
    process.exit(2);
  } else run(cmd[0], cmd.slice(1), name);
}
