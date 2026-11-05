# The machine slot for heavy Python tools (rule W24; tests/slot.js holds the lock): several agent sessions share one
# machine, so a tool that crunches many images waits for a slot like a smoke or a full unit-test run.
#
#   import slot; slot.guard('tools/x.py')   at the top of the heavy path, after the usage check
#
# Outside a slot it runs the tool again under `node tests/slot.js` (which waits for a slot, hands it down, and gives it
# back at the end) and exits with that run's code. A no-op on CI (CI set), and in the run it started; inside another
# holder's process tree (a smoke, tests/run.js) node sees the slot held and runs it at once. No node: runs without.
import os
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def guard(name):
    if os.environ.get('CI') or os.environ.get('REEFID_SLOT_WRAP') == str(os.getppid()):
        return
    node = shutil.which('node')
    if not node:
        print(f'{name}: node not found; running without a machine slot (tests/slot.js).', file=sys.stderr)
        return
    try:
        r = subprocess.run([node, os.path.join(ROOT, 'tests', 'slot.js'), '--name', name, '--', sys.executable, *sys.argv])
    except KeyboardInterrupt:
        sys.exit(130)
    sys.exit(r.returncode if r.returncode >= 0 else 128 - r.returncode)
