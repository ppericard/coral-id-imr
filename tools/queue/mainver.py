"""Put main's line 1 and `const VERSION` line into the branch's Code.gs, keeping the branch's code.
Usage (in the worktree): python3 -I mainver.py MAIN_CODE_GS_PATH tools/sync/Code.gs"""
import re
import sys

main = open(sys.argv[1], encoding='utf-8').read().split('\n')
path = sys.argv[2]
br = open(path, encoding='utf-8').read().split('\n')
br[0] = main[0]
mv = next(l for l in main if re.match(r'^const VERSION = \d+;', l))
for i, l in enumerate(br):
    if re.match(r'^const VERSION = \d+;', l):
        br[i] = mv
        break
open(path, 'w', encoding='utf-8').write('\n'.join(br))
print(mv[:24])
