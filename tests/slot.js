// Shared by every Playwright script (tests/*.smoke.js, tools/learnsim.js, tools/perf.js, tools/rtprep.js, tools/og/make_og.js).
//
// 1. slot(name): at most SMOKE_SLOTS Playwright runs on this machine at once (default: one per 2 cores, at least 1), and
//    none starts while the machine is already saturated (1-minute load average above the number of cores). Several agent
//    sessions share one machine: on 2026-11-04 its load average reached 21-30 on 4 cores, every smoke ran 3-7 times
//    slower and fixed timeouts failed (test-suite review). The slots are files in one directory every session sees;
//    a slot whose process is gone, or whose holder stopped refreshing it for 10 minutes, is taken back. No-op on CI,
//    where each smoke has its own runner. Call it before chromium.launch(); the slot is given back when the process ends.
//
// 2. parts(all, groups) and widths(def): what a smoke runs, from the environment (default: everything).
//    SMOKE_ONLY=a,b   only these parts (pages.smoke.js: main, overlays, basics, credits, visit, tips, signin, replay);
//                     PAGES_ONLY=x, the older name, still works.
//    SMOKE_PART=name  one group of parts, for CI shards (pages.smoke.js: main, rest).
//    SMOKE_W=390      only these viewport widths in a smoke's width loop (pages.smoke.js main, admin.smoke.js).
//    An unknown name fails at once, so a typo never passes as a run that checked nothing; a partial run says so at the end.
const fs = require('fs'),
  os = require('os'),
  path = require('path');

const DIR =
    process.env.SMOKE_SLOT_DIR || (process.platform === 'win32' ? path.join(os.tmpdir(), 'reefid-smoke-slots') : '/tmp/reefid-smoke-slots'),
  STALE = 10 * 60e3, // a holder refreshes its slot every minute
  cores = () => os.cpus().length || 1;

// True when the slot file f no longer belongs to a running holder.
function stale(f) {
  try {
    const pid = +fs.readFileSync(f, 'utf8').split(' ')[0];
    if (Date.now() - fs.statSync(f).mtimeMs > STALE) return true;
    if (!(pid > 0)) return true;
    process.kill(pid, 0); // throws ESRCH when that process is gone
    return false;
  } catch (e) {
    return e.code !== 'EPERM' && e.code !== 'ENOENT'; // EPERM: alive, another user's; ENOENT: just given back
  }
}

async function slot(name) {
  if (process.env.CI) return () => {};
  const n = Math.max(1, +process.env.SMOKE_SLOTS || Math.floor(cores() / 2)),
    t0 = Date.now();
  fs.mkdirSync(DIR, {recursive: true, mode: 0o777});
  try {
    fs.chmodSync(DIR, 0o1777); // every session's user can take a slot, none can remove another's
  } catch (e) {}
  for (let said = 0; ;) {
    const load = os.loadavg()[0];
    if (load <= cores())
      for (let i = 0; i < n; i++) {
        const f = path.join(DIR, 'slot' + i);
        try {
          fs.writeFileSync(f, `${process.pid} ${name} ${new Date().toISOString()}`, {flag: 'wx'});
        } catch (e) {
          if (e.code === 'EEXIST' && stale(f)) fs.rmSync(f, {force: true});
          continue;
        }
        const keep = setInterval(() => {
            try {
              fs.utimesSync(f, new Date(), new Date());
            } catch (e) {}
          }, 60e3),
          free = () => {
            clearInterval(keep);
            try {
              if (fs.readFileSync(f, 'utf8').startsWith(process.pid + ' ')) fs.rmSync(f, {force: true});
            } catch (e) {}
          };
        keep.unref();
        process.on('exit', free);
        // Ctrl-C or a kill: give the slot back, then end the way the signal would have.
        for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP'])
          process.once(sig, () => {
            free();
            process.kill(process.pid, sig);
          });
        if (said) console.error(`${name}: got smoke slot ${i + 1} of ${n} after ${Math.round((Date.now() - t0) / 1000)} s.`);
        return free;
      }
    if (!(said++ % 15))
      console.error(
        `${name}: waiting for a smoke slot (${n} on this machine, ${DIR}; load ${load.toFixed(1)} on ${cores()} cores)` +
          (said > 1 ? `, ${Math.round((Date.now() - t0) / 1000)} s so far` : '') +
          '…'
      );
    await new Promise(r => setTimeout(r, 2000));
  }
}

// The parts of a smoke to run: a Set of names out of all (in order), from SMOKE_ONLY / PAGES_ONLY / SMOKE_PART.
function parts(all, groups = {}) {
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

module.exports = slot;
Object.assign(slot, {slot, parts, widths, partial, DIR});
