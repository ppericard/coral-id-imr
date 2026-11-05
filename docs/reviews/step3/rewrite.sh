#!/usr/bin/env bash
# Photos out of the repo, step 3: the history rewrite (docs/HANDOVER.md). Prepared 2026-11-05 for Pierre's go.
#
#   ./rewrite.sh prepare      backup (mirror + bundle) and rewrite in a bare clone, all checks; pushes NOTHING
#   GO=yes ./rewrite.sh push  force-pushes every rewritten branch at once (--atomic, --force-with-lease on each old sha)
#   ./rewrite.sh verify       checks GitHub after the push (no branch holds the old history; fresh clone size)
#   GO=yes ./rewrite.sh rollback   puts every branch back to the backup's sha (only if something went wrong)
#
# WORK (default: ./step3-run) holds backup.git, coral-id-imr-backup.bundle, rewrite.git, the lists and a log.
# Needs git >= 2.36 and python3 (git-filter-repo is installed into WORK/venv if missing). R2_CHECK=0 skips the
# 3-minute check that every R2-only photo file answers 200 on R2.
set -euo pipefail

URL=${URL:-https://github.com/ppericard/coral-id-imr.git}
WORK=$(mkdir -p "${WORK:-./step3-run}" && cd "${WORK:-./step3-run}" && pwd)
OLD_ROOT=24d4d6474fc7841c35aa22e3bbb202253ee65a43   # root commit of the old history (any ref holding it is old)
NEW_ROOT=3a63ab4cc8d23b591c3a9987e18fa7ae5f1ab18a   # its rewrite (deterministic: the dry run of 2026-11-05 gave it)
KEEP_RE='^img/(imrl?-|[a-z]+-cf-)'                  # HANDOVER: IMR lecture photos, Coral Finder book scans
LOG=$WORK/log.txt
say() { echo "== $*" | tee -a "$LOG"; }
die() { echo "ABORT: $*" | tee -a "$LOG" >&2; exit 1; }

filter_repo() {
  if command -v git-filter-repo >/dev/null; then git-filter-repo "$@"; return; fi
  [ -x "$WORK/venv/bin/git-filter-repo" ] || { python3 -m venv "$WORK/venv" && "$WORK/venv/bin/pip" -q install git-filter-repo; }
  "$WORK/venv/bin/git-filter-repo" "$@"
}

prepare() {
  [ ! -e "$WORK/backup.git" ] || die "$WORK/backup.git exists: use a new WORK (a stale backup must never be mistaken for today's)"
  say "1. backup: mirror clone of $URL (every ref, refs/pull included) + bundle"
  git clone -q --mirror "$URL" "$WORK/backup.git"
  git -C "$WORK/backup.git" fsck --no-progress --connectivity-only
  git -C "$WORK/backup.git" bundle create "$WORK/coral-id-imr-backup.bundle" --all 2>/dev/null
  git -C "$WORK/backup.git" bundle verify "$WORK/coral-id-imr-backup.bundle" >/dev/null 2>&1 || die "bundle verify failed"
  git -C "$WORK/backup.git" for-each-ref --format='%(objectname) %(refname)' refs/heads refs/tags > "$WORK/old-heads.txt"
  git -C "$WORK/backup.git" count-objects -vH | grep size-pack | sed 's/^/backup /' | tee -a "$LOG"
  ls -l "$WORK/coral-id-imr-backup.bundle" | tee -a "$LOG"
  grep -q ' refs/heads/main$' "$WORK/old-heads.txt" || die "no main in the backup"
  git -C "$WORK/backup.git" merge-base --is-ancestor $OLD_ROOT main || die "main does not hold the expected old root: re-check OLD_ROOT"

  say "2. bare clone of the backup's branches and tags (what GitHub will receive; refs/pull cannot be pushed)"
  git clone -q --bare --no-local "$WORK/backup.git" "$WORK/rewrite.git"
  cd "$WORK/rewrite.git"
  git for-each-ref --format='%(objectname) %(refname)' refs/heads refs/tags | diff - "$WORK/old-heads.txt" >/dev/null || die "bare clone refs differ from the backup"
  echo "branches: $(git for-each-ref refs/heads | wc -l), tags: $(git for-each-ref refs/tags | wc -l), commits: $(git rev-list --all --count)" | tee -a "$LOG"
  git count-objects -vH | grep size-pack | sed 's/^/fresh clone BEFORE /' | tee -a "$LOG"

  say "3. the strip list (HANDOVER step 4): every path ever in img/ not in main's img/, minus IMR and CF book files"
  git log --all --pretty=format: --name-only -- img/ | grep . | sort -u > "$WORK/all.txt"
  git ls-tree -r --name-only main img/ | sort > "$WORK/head.txt"
  comm -23 "$WORK/all.txt" "$WORK/head.txt" | grep -Ev "$KEEP_RE" > "$WORK/strip.txt" || true
  comm -23 "$WORK/all.txt" "$WORK/head.txt" | grep -E "$KEEP_RE" > "$WORK/kept-deleted.txt" || true
  wc -l "$WORK/all.txt" "$WORK/head.txt" "$WORK/strip.txt" "$WORK/kept-deleted.txt" | tee -a "$LOG"

  say "4. keep-list check against tools/photos.py (main's rules) and each branch's own photo records"
  rm -rf "$WORK/trees" "$WORK/lib" && mkdir -p "$WORK/trees" "$WORK/lib"
  for ref in $(git for-each-ref refs/heads --format='%(refname:short)'); do
    d="$WORK/trees/$(echo "$ref" | tr '/' '_')"; mkdir -p "$d"
    for f in data.json cand.json fish-photos.json; do git show "$ref:$f" > "$d/$f" 2>/dev/null || rm -f "$d/$f"; done
    git ls-tree -r --name-only "$ref" img/ | sort > "$d/img.txt"
  done
  git show main:tools/photos.py > "$WORK/lib/photos.py"
  git show main:core.js > "$WORK/lib/core.js"
  python3 -I - "$WORK" <<'EOF' | tee -a "$LOG"
import importlib.util, os, re, sys
W = sys.argv[1]
spec = importlib.util.spec_from_file_location('photos', f'{W}/lib/photos.py'); P = importlib.util.module_from_spec(spec); spec.loader.exec_module(P)
strip = {l.strip() for l in open(f'{W}/strip.txt')}
head = {l.strip() for l in open(f'{W}/head.txt')}
name = lambda p: re.sub(r'(-[smt])?\.webp$', '', os.path.basename(p))
bad = []
main = P.records(f'{W}/trees/main')
need = {f'img/{f}{s}.webp' for f in P.gitonly(main) for s in P.SUFFIXES}
if need - head: bad.append(f'{len(need - head)} files of no-backup photos missing from main img/')
if need & strip: bad.append(f'{len(need & strip)} files of no-backup photos in the strip list')
print(f'main: {len(P.online(main))} photos with an online original (R2 only), {len(P.gitonly(main))} with none (kept in img/: {len(need)} files)')
# every stripped path must belong to a photo that has an online original in main's records or in the records of
# the branch whose tip holds it (old branches), or in any historical records (checked below with the history)
known = {f for f, L in main.items() if any(p.get('src') or p.get('r') for p in L)}
for d in sorted(os.listdir(f'{W}/trees')):
    if not os.path.isdir(f'{W}/trees/{d}'): continue
    recs = P.records(f'{W}/trees/{d}')
    known |= {f for f, L in recs.items() if any(p.get('src') or p.get('r') for p in L)}
    tip = {l.strip() for l in open(f'{W}/trees/{d}/img.txt')}
    gone = tip & strip
    nob = sorted(p for p in gone if any(not (r.get('src') or r.get('r')) for r in recs.get(name(p), [])))
    print(f'{d}: {len(gone)} stripped paths at its tip' + (f', {len(nob)} WITHOUT an online original: {nob[:5]}' if nob else ''))
    if nob: bad.append(f'{d}: {len(nob)} no-backup photo files would leave its tip')
open(f'{W}/unknown.txt', 'w').write('\n'.join(sorted(p for p in strip if name(p) not in known)) + '\n')
print(f'stripped paths not explained by a current record: {sum(1 for p in strip if name(p) not in known)} (checked against history next)')
if bad: print('BAD: ' + '; '.join(bad)); sys.exit(1)
EOF
  # Stripped photos that no current record names: find their record in the history of the data files.
  if [ -s "$WORK/unknown.txt" ] && grep -q . "$WORK/unknown.txt"; then
    git rev-list --all --objects | grep -E ' (data|cand|fish-photos)\.json$' | cut -d' ' -f1 > "$WORK/jsonblobs.txt"
    python3 -I - "$WORK" "$WORK/rewrite.git" <<'EOF' | tee -a "$LOG"
import json, os, re, subprocess, sys
W, G = sys.argv[1], sys.argv[2]
name = lambda p: re.sub(r'(-[smt])?\.webp$', '', os.path.basename(p))
want = {name(l.strip()) for l in open(f'{W}/unknown.txt') if l.strip()}
ok = set()
for sha in open(f'{W}/jsonblobs.txt').read().split():
    try: o = json.loads(subprocess.run(['git', '-C', G, 'cat-file', 'blob', sha], capture_output=True).stdout)
    except Exception: continue
    st = [o]
    while st:
        x = st.pop()
        if isinstance(x, list): st.extend(x)
        elif isinstance(x, dict):
            if x.get('f') in want and (x.get('src') or x.get('r')): ok.add(x['f'])
            st.extend(v for v in x.values() if isinstance(v, (dict, list)))
left = sorted(want - ok)
print(f'historical records: {len(ok)}/{len(want)} unexplained photos had an online original')
if left: print('BAD: no online original found for ' + ' '.join(left)); sys.exit(1)
EOF
  fi

  if [ "${R2_CHECK:-1}" != 0 ]; then
    say "5. every R2-only photo file of main answers 200 on R2 (core.js PHOTO_BASE)"
    BASE=$(grep -o "const PHOTO_BASE = '[^']*'" "$WORK/lib/core.js" | cut -d"'" -f2)
    python3 -I -c "
import importlib.util, sys; s=importlib.util.spec_from_file_location('p', sys.argv[1] + '/lib/photos.py'); P=importlib.util.module_from_spec(s); s.loader.exec_module(P)
print('\n'.join(f'img/{f}{x}.webp' for f in sorted(P.online(P.records(sys.argv[1] + '/trees/main'))) for x in P.SUFFIXES))" "$WORK" > "$WORK/r2-expected.txt"
    xargs -P 24 -I{} sh -c 'echo "$(curl -s -o /dev/null -I -A coral-id-imr/1.0 -w "%{http_code}" "'"$BASE"'{}") {}"' < "$WORK/r2-expected.txt" > "$WORK/r2-check.txt"
    n=$(grep -vc '^200 ' "$WORK/r2-check.txt" || true)
    echo "R2: $(wc -l < "$WORK/r2-check.txt") files checked, $n not 200" | tee -a "$LOG"
    [ "$n" = 0 ] || die "photos missing on R2 (see $WORK/r2-check.txt): run tools/r2_sync.sh first"
  fi

  say "6. git filter-repo --invert-paths --paths-from-file strip.txt"
  filter_repo --invert-paths --paths-from-file "$WORK/strip.txt" 2>&1 | tr '\r' '\n' | grep -v '^Parsed' | tee -a "$LOG"
  git for-each-ref --format='%(objectname) %(refname)' refs/heads refs/tags > "$WORK/new-heads.txt"
  git count-objects -vH | grep size-pack | sed 's/^/fresh clone AFTER /' | tee -a "$LOG"

  say "7. checks on the rewritten repo"
  M=filter-repo/commit-map
  echo "commits rewritten: $(awk 'NR>1 && $1!=$2' $M | wc -l) of $(($(wc -l < $M) - 1)); pruned (became empty): $(awk 'NR>1 && $2 ~ /^0+$/' $M | wc -l)" | tee -a "$LOG"
  [ "$(git rev-list --max-parents=0 main)" = $NEW_ROOT ] || echo "note: new root $(git rev-list --max-parents=0 main) differs from the dry run's $NEW_ROOT (fine if the strip list changed; use it for verify)" | tee -a "$LOG"
  git rev-list --max-parents=0 main > "$WORK/new-root.txt"
  printf '%s\n' "$WORK/backup.git/objects" > objects/info/alternates   # to compare old and new trees here
  while read -r old ref; do
    new=$(git rev-parse "$ref")
    extra=$(git diff-tree -r --name-only "$old^{tree}" "$new^{tree}" | sort | comm -23 - "$WORK/strip.txt" | wc -l)
    same=$([ "$(git rev-parse "$old^{tree}")" = "$(git rev-parse "$new^{tree}")" ] && echo identical || echo "differs only by stripped paths")
    [ "$extra" = 0 ] || die "$ref: tree differs by $extra paths outside the strip list"
    echo "$ref: ${old:0:8} -> ${new:0:8}, tree $same" | tee -a "$LOG"
  done < "$WORK/old-heads.txt"
  [ "$(git rev-parse main^{tree})" = "$(git -C "$WORK/backup.git" rev-parse main^{tree})" ] || die "main's tree changed"
  git ls-tree -r --name-only main img/ | sort | diff - "$WORK/head.txt" >/dev/null || die "main's img/ changed"
  for ref in $(git for-each-ref refs/heads --format='%(refname)'); do
    ! git merge-base --is-ancestor $OLD_ROOT "$ref" 2>/dev/null || die "$ref still holds the old root"
  done
  rm objects/info/alternates
  git fsck --no-progress --connectivity-only
  say "8. .git-blame-ignore-revs with the new hashes (commit it afterwards as a small PR, or on main before the push)"
  git show main:.git-blame-ignore-revs | while IFS= read -r l; do
    if [[ $l =~ ^[0-9a-f]{40}$ ]]; then awk -v o="$l" '$1==o{print $2}' $M; else echo "$l"; fi
  done > "$WORK/git-blame-ignore-revs.new"
  diff <(git show main:.git-blame-ignore-revs) "$WORK/git-blame-ignore-revs.new" | tee -a "$LOG" || true
  say "prepared: nothing pushed. Next, with Pierre's go and Block force pushes off: GO=yes $0 push"
}

push() {
  [ "${GO:-}" = yes ] || [ -n "${DRY:-}" ] || die "set GO=yes (Pierre's explicit go, Block force pushes off); DRY=1 for git push --dry-run"
  cd "$WORK/rewrite.git"
  git remote get-url origin >/dev/null 2>&1 || git remote add origin "$URL"
  # Nothing may have moved on GitHub since the backup: --force-with-lease on each old sha, all or nothing.
  live=$(git ls-remote --heads --tags "$URL" | grep -v '\^{}$' | awk '{print $1" "$2}' | sort)
  [ "$live" = "$(sort "$WORK/old-heads.txt")" ] || { diff <(echo "$live") <(sort "$WORK/old-heads.txt") || true; die "GitHub moved since the backup: start again with a new WORK"; }
  args=(); specs=()
  while read -r old ref; do args+=("--force-with-lease=$ref:$old"); specs+=("$ref:$ref"); done < "$WORK/old-heads.txt"
  say "push --atomic of ${#specs[@]} refs"
  git -c push.negotiate=false push ${DRY:+--dry-run} --atomic "${args[@]}" origin "${specs[@]}" 2>&1 | tee -a "$LOG"
}

verify() {
  live=$(git ls-remote --heads --tags "$URL" | grep -v '\^{}$' | awk '{print $1" "$2}' | sort)
  diff <(echo "$live") <(sort "$WORK/new-heads.txt") && echo "GitHub refs = rewritten refs" | tee -a "$LOG" || echo "WARNING: GitHub refs differ from the rewrite (new branch since? check it below)" | tee -a "$LOG"
  rm -rf "$WORK/check.git"
  git clone -q --bare "$URL" "$WORK/check.git"
  git -C "$WORK/check.git" count-objects -vH | grep size-pack | sed 's/^/fresh clone from GitHub /' | tee -a "$LOG"
  bad=0
  for ref in $(git -C "$WORK/check.git" for-each-ref refs/heads --format='%(refname)'); do
    if git -C "$WORK/check.git" cat-file -e $OLD_ROOT 2>/dev/null && git -C "$WORK/check.git" merge-base --is-ancestor $OLD_ROOT "$ref"; then echo "OLD HISTORY on $ref"; bad=1; fi
  done
  [ $bad = 0 ] && echo "no branch on GitHub holds the old history" | tee -a "$LOG"
}

rollback() {
  [ "${GO:-}" = yes ] || die "set GO=yes (Block force pushes off)"
  specs=(); while read -r old ref; do specs+=("+$old:$ref"); done < "$WORK/old-heads.txt"
  say "rollback: every branch back to the backup's sha (${#specs[@]} refs)"
  git -C "$WORK/backup.git" -c push.negotiate=false push --atomic "$URL" "${specs[@]}" 2>&1 | tee -a "$LOG"
}

case "${1:-}" in
  prepare) prepare ;; push) push ;; verify) verify ;; rollback) rollback ;;
  *) sed -n '2,12p' "$0"; exit 2 ;;
esac
