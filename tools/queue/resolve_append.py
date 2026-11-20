"""Resolve append-only conflicts in a file: keep main's side (theirs, below =======) then ours, for every hunk.
Usage: python3 -I resolve_append.py FILE  (run inside a merge of origin/main into the branch)."""
import sys

p = sys.argv[1]
lines = open(p, encoding="utf8").read().split("\n")
out, i, n = [], 0, 0
while i < len(lines):
    l = lines[i]
    if l.startswith("<<<<<<< "):
        j = next(k for k in range(i, len(lines)) if lines[k] == "=======")
        e = next(k for k in range(j, len(lines)) if lines[k].startswith(">>>>>>> "))
        if any(x.startswith("|||||||") for x in lines[i + 1 : j]):
            sys.exit(f"{p}: a diff3 conflict block (ancestor shown): resolve it by hand")
        out += lines[j + 1 : e] + lines[i + 1 : j]
        i, n = e + 1, n + 1
        continue
    out.append(l)
    i += 1
open(p, "w", encoding="utf8").write("\n".join(out))
print(p, n, "hunk(s): main's lines first, then the branch's")
