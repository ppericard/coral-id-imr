// The machine slot shared by every heavy run (rule W24): every Playwright script (tests/*.smoke.js, tests/calm.js,
// tools/learnsim.js, tools/perf.js, tools/rtprep.js, tools/og/make_og.js, tools/fish_draw_sim.js), full unit-test runs
// and heavy tools (1b).
//
// 1. slot(name): at most SMOKE_SLOTS Playwright runs on this machine at once (default: one per 2 cores, at least 1), and
//    none starts while the machine is already saturated (1-minute load average above LOAD x the cores: 8 on 4 cores; the
//    crash that took the machine down came near 16; Pierre, 2026-11-05: "up to about twice the cores is fine"), and none
//    starts with less than MIN_FREE_GB (5 GB) free on the repository's disk: it refuses, with what to clean. Several agent
//    sessions share one machine: on 2026-11-04 its load average reached 21-30 on 4 cores, every smoke ran 3-7 times
//    slower and fixed timeouts failed (test-suite review). The slots are files in one directory every session and every
//    user of the machine sees; a slot whose process is gone (by PID and start time on Linux; elsewhere by PID, or no
//    refresh for 10 minutes) is taken back. No-op on CI, where each smoke has its own runner. Call it before
//    chromium.launch(); the slot is given back when the process ends. A holder's children run in its slot (REEFID_SLOT,
//    below): a smoke or a full unit-test run that starts a guarded tool never waits for its own slot.
//
// 1b. Heavy work other than Playwright takes the same slots (Pierre, 2026-11-05: "the automatic lock of the unit tests"):
//    node tests/run.js [node --test options] [files]   a full unit-test run (default: every tests/*.test.js); a single
//                                                       file stays unlocked: node --test tests/x.test.js (the fast tier)
//    node tests/slot.js [--name N] -- cmd [args]        any command, run once it holds a slot
//    slot.guard(name)                                   at the top of a heavy Node tool: re-runs it under the slot (a
//                                                       Python tool: tools/slot.py guard(), the same way)
//    All of them are no-ops on CI (CI set) and inside a holder's process tree.
//
// 2. parts(all, groups) and widths(def): what a smoke runs, from the environment (default: everything).
//    SMOKE_ONLY=a,b   only these parts (pages.smoke.js: main, overlays, basics, credits, visit, tips, signin, replay);
//                     PAGES_ONLY=x, the older name, still works.
//    SMOKE_PART=name  one group of parts, for CI shards (pages.smoke.js: main, overlays, rest, more; fish.smoke.js: main,
//                     fresh); tests/smokeparts.test.js fails when a group has no job in checks.yml.
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
  // Free disk a heavy run needs before it starts (Pierre, 2026-11-05: the disk is small and every agent shares it).
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
// then linked into place, so a slot file always holds a whole record (Codex review #450: a file created empty, then
// written, read as a dead holder's by a waiter, let two holders run).
const user = () => {
    try {
      return os.userInfo().username || 'uid' + process.getuid();
    } catch (e) {
      return 'uid' + (process.getuid ? process.getuid() : '?'); // a container user with no name
    }
  },
  record = name => `${process.pid} ${started(process.pid) || '-'} ${user()} ${new Date().toISOString()} ${name}\n`;

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

// o.timeout (ms, tests): give up waiting and resolve null. o.signals === false: the caller handles Ctrl-C and kills itself
// (run(), which waits for its child first).
async function slot(name, o = {}) {
  if (process.env.CI || held()) return () => {};
  // Checked before each try, so a run that waited never starts on a disk that filled up meanwhile (Codex review #608).
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
  // dead holder's slot is taken back whoever it belonged to (Codex review #450).
  try {
    fs.mkdirSync(DIR, {recursive: true});
    fs.chmodSync(DIR, 0o777);
  } catch (e) {}
  for (let said = 0; ;) {
    roomy();
    const load = os.loadavg()[0];
    if (load <= maxLoad())
      for (let i = 0; i < n; i++) {
        const f = path.join(DIR, 'slot' + i),
          tmp = path.join(DIR, `.new-${process.pid}-${i}-${Math.random().toString(36).slice(2)}`);
        let got = false;
        try {
          fs.writeFileSync(tmp, record(name), {mode: 0o666});
          fs.linkSync(tmp, f); // fails if the slot is held: atomic, and f appears with its whole record
          got = true;
        } catch (e) {
          if (e.code === 'EEXIST' && !reap(f)) {
            // A file system that lets no one take back a dead slot (a directory made by another user, sticky): rather
            // than wait for ever or fail, run without a slot, and say so.
            console.error(`${name}: cannot take back a dead slot in ${DIR} (permissions); running without a slot.`);
            return () => {};
          }
          if (e.code !== 'EEXIST') {
            console.error(`${name}: no smoke slot (${DIR}: ${e.code}); running without one.`);
            return () => {};
          }
        } finally {
          try {
            fs.unlinkSync(tmp);
          } catch (e) {}
        }
        if (!got) continue;
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
// (a guarded tool killed by its own PID), cmd is stopped too and the slot given back (Codex review #608).
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

module.exports = slot;
Object.assign(slot, {slot, parts, widths, partial, held, run, guard, diskOk, maxLoad, LOAD, MIN_FREE_GB, DIR});

// node tests/slot.js [--name N] -- cmd [args]
if (require.main === module) {
  const a = process.argv.slice(2),
    at = a.indexOf('--'),
    cmd = at < 0 ? [] : a.slice(at + 1),
    name = a[0] === '--name' && at > 1 ? a[1] : cmd.join(' ').slice(0, 60);
  if (!cmd.length) {
    console.error('usage: node tests/slot.js [--name N] -- cmd [args]');
    process.exit(2);
  }
  run(cmd[0], cmd.slice(1), name);
}
