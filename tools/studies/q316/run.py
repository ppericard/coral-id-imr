"""Q316's offline fit on the real log, every step under one 40-minute clock (rule L11; tools/studies/q316/README.md).

    python3 tools/studies/q316/run.py <log.json> <out dir> [--exclude names.txt] [--stats-coral s.json]
                                      [--stats-fish s.json] [--budget <minutes, 40 at most>]

<out dir>: a new, empty directory outside the repository, kept off GitHub (rule D2): every file written goes there.
For each subject, corals first then fish:
  1. prep.js: the export (labels P1, P2..., and labels.json, the label of each player, for the integrator only);
  2. fit.py --no-accept on every player (check 2C's offline reference D(u));
  3. checks.js: 2C;
then, for each subject, fit.py with its acceptance test (the values reported, or "not estimable on today's log").
The clock starts once the machine slot is held; past it each step stops, keeps what it has and marks the rest "the
measure cannot tell"; nothing escalates. Prints aggregates and labels only.
"""
import os
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.realpath(os.path.join(HERE, '..', '..', '..'))
BUDGET_MIN = 40


def opt(argv, name):
    return argv[argv.index(name) + 1] if name in argv else None


def budget_of(argv):
    """The minutes allowed: --budget when shorter, never more than rule L11's 40."""
    b = opt(argv, '--budget')
    return min(float(b), BUDGET_MIN) if b else BUDGET_MIN


def main(argv):
    pos = [a for i, a in enumerate(argv) if not a.startswith('--') and (i == 0 or not argv[i - 1].startswith('--'))]
    if len(pos) != 2:
        print(__doc__.strip().split('\n\n')[1], file=sys.stderr)
        return 2
    log_path, out = pos
    real = os.path.realpath(os.path.abspath(out))
    if real == ROOT or real.startswith(ROOT + os.sep):
        print('run.py: the out dir holds per-player rows: put it outside the repository (rule D2).', file=sys.stderr)
        return 2
    sys.path.insert(0, os.path.join(ROOT, 'tools'))
    import slot  # noqa: E402

    slot.guard('tools/studies/q316/run.py')  # one heavy run at a time on the machine (rule W24); the steps run in it
    os.makedirs(out, exist_ok=True)
    budget = budget_of(argv)
    deadline = time.time() + budget * 60
    py, node = sys.executable, 'node'
    f = lambda name: os.path.join(out, name)  # noqa: E731

    def step(cmd):
        left = deadline - time.time()
        if left <= 0:
            print(f'  skipped (past the {budget:g}-minute deadline): ' + os.path.basename(cmd[1]) + ' ' + ' '.join(cmd[2:3]), flush=True)
            return False
        r = subprocess.run(cmd, cwd=ROOT)
        return r.returncode == 0

    ex = ['--exclude', opt(argv, '--exclude')] if opt(argv, '--exclude') else []
    dl = ['--deadline', str(deadline)]
    for s in ('coral', 'fish'):
        print(f'== {s}', flush=True)
        if not step([node, os.path.join(HERE, 'prep.js'), log_path, s, f(f'export-{s}.json'), '--map', f(f'labels-{s}.json'), *ex]):
            continue
        step([py, os.path.join(HERE, 'fit.py'), 'fit', f(f'export-{s}.json'), f(f'ref-{s}.json'), '--no-accept', *dl])
        st = opt(argv, f'--stats-{s}')
        if os.path.exists(f(f'ref-{s}.json')):
            step([node, os.path.join(HERE, 'checks.js'), f(f'export-{s}.json'), f(f'checks-{s}.json'), '--fit', f(f'ref-{s}.json'),
                  *(['--stats', st] if st else []), *dl])
    for s in ('coral', 'fish'):
        if os.path.exists(f(f'export-{s}.json')):
            print(f'== {s}: the fit and its acceptance test', flush=True)
            step([py, os.path.join(HERE, 'fit.py'), 'fit', f(f'export-{s}.json'), f(f'fit-{s}.json'), *dl])
    print(f'{(time.time() - (deadline - budget * 60)) / 60:.1f} of {budget:g} minutes; the files are in {out}', flush=True)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
