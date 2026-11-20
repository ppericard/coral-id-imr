"""Replace the first git conflict block of FILE with the text of REPLACEMENT_FILE.
Usage: python3 -I resolve_block.py FILE REPLACEMENT_FILE"""
import sys

path, rep = sys.argv[1], sys.argv[2]
lines = open(path, encoding='utf-8').read().split('\n')
txt = open(rep, encoding='utf-8').read().rstrip('\n')
new = txt.split('\n') if txt else []
s = next(i for i, l in enumerate(lines) if l.startswith('<<<<<<< '))
e = next(i for i in range(s, len(lines)) if lines[i].startswith('>>>>>>> '))
lines[s:e + 1] = new
open(path, 'w', encoding='utf-8').write('\n'.join(lines))
print('replaced lines', s + 1, '-', e + 1)
