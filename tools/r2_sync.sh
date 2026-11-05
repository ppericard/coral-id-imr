#!/usr/bin/env bash
# The photos on Cloudflare R2 (Photos out of the repo; Pierre, 2026-11-03 and his rule of 2026-11-05; docs/ROADMAP.md,
# docs/ARCHITECTURE.md "Photos"): the app reads every photo from the bucket, same img/ paths. Credentials come from the
# repo's GitHub secrets, set by Pierre; agents never see them.
#
#   tools/r2_sync.sh        copy img/ (the photos git keeps: IMR lecture photos, Coral Finder book scans, page art) to
#                           the bucket, then check the bucket holds the four files of every photo that lives on R2 only
#                           (tools/photos.py --r2-list). Run by .github/workflows/photos-r2.yml (a push that changes img/,
#                           or by hand) and by the r2 job of .github/workflows/approved-photos.yml. Without credentials
#                           it does nothing.
#   tools/r2_sync.sh DIR    upload the photo files in DIR (tools/fetch_approved.py's new photos, never committed) to the
#                           bucket's img/. Fails without credentials: the photos would be marked downloaded but be nowhere.
#
# Never deletes anything from the bucket (rclone copy, not sync): since step 2 the bucket is where the photos with an
# online original live (they left img/), so a sync from img/ would wipe them; a file that leaves img/ for good (an
# excluded photo) just stays there, unused.
set -euo pipefail
cd "$(dirname "$0")/.."
DIR="${1:-}"
if [ -z "${R2_ACCOUNT_ID:-}" ] || [ -z "${R2_ACCESS_KEY_ID:-}" ] || [ -z "${R2_SECRET_ACCESS_KEY:-}" ] || [ -z "${R2_BUCKET:-}" ]; then
  if [ -n "$DIR" ]; then
    echo "R2 credentials or bucket not set: the photos in $DIR cannot be uploaded" >&2
    exit 1
  fi
  echo "R2 credentials or bucket not set: nothing synced"
  exit 0
fi
# rclone: the official release, pinned and checked, never the runner's apt package (stack audit 2026-11-05: apt gave
# 1.60.1 from 2022, and its version changed with the runner image). The run stops before anything reaches the bucket
# if the download does not match the hash. To move to a newer release: take the linux-amd64.zip line of
# https://downloads.rclone.org/vX.Y.Z/SHA256SUMS (PGP-signed by Nick Craig-Wood, key
# FBF737ECE9F8AB18604BD2AC93935E02FF3B54FA; the GitHub release carries the same file), check its signature, read the
# changelog's S3 and core entries since this version for anything that changes `copy`, `check`, `lsf` or `size` to R2,
# then change both lines and run "Photos to R2" by hand after the merge.
RCLONE_VERSION=1.75.2
RCLONE_SHA256=349ac8fba6ff65d6247043f1750cdcb518ec5d500ef91463a10d37c0ccdf3702 # rclone-v1.75.2-linux-amd64.zip
[ "$(uname -s)-$(uname -m)" = Linux-x86_64 ] || { echo "the pinned rclone is the linux-amd64 build, not $(uname -sm)" >&2; exit 1; }
rc=$(mktemp -d)
curl -fsSL --proto '=https' --tlsv1.2 --retry 3 -o "$rc/rclone.zip" \
  "https://downloads.rclone.org/v${RCLONE_VERSION}/rclone-v${RCLONE_VERSION}-linux-amd64.zip"
echo "$RCLONE_SHA256  $rc/rclone.zip" | sha256sum --check --strict --quiet - ||
  { echo "rclone v$RCLONE_VERSION: the download does not match its pinned SHA-256, nothing synced" >&2; exit 1; }
unzip -q -j "$rc/rclone.zip" "rclone-v${RCLONE_VERSION}-linux-amd64/rclone" -d "$rc"
PATH="$rc:$PATH"
rclone version | head -1
export RCLONE_CONFIG_R2_TYPE=s3 RCLONE_CONFIG_R2_PROVIDER=Cloudflare RCLONE_CONFIG_R2_REGION=auto \
  RCLONE_CONFIG_R2_ENDPOINT="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com" \
  RCLONE_CONFIG_R2_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" RCLONE_CONFIG_R2_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
  RCLONE_CONFIG_R2_NO_CHECK_BUCKET=true
# rclone compares checksums, so only new or changed files go up. A week of browser cache: a recropped photo keeps its
# name but its URL carries the crop (app.js ver), so it is fetched again.
copy() {
  rclone copy "$1" "r2:${R2_BUCKET}/img" --checksum --fast-list --transfers 32 --checkers 32 --include '*.webp' \
    --header-upload "Cache-Control: public, max-age=604800" --stats 30s --stats-one-line --stats-log-level NOTICE
}
if [ -n "$DIR" ]; then
  n=$(find "$DIR" -maxdepth 1 -name '*.webp' | wc -l)
  [ "$n" -eq 0 ] && { echo "nothing to upload in $DIR"; exit 0; }
  copy "$DIR"
  rclone check "$DIR" "r2:${R2_BUCKET}/img" --one-way --checksum --include '*.webp'
  echo "$n photo files uploaded to R2"
  exit 0
fi
copy img
# Every photo that lives on R2 only has its four files there: a missing one fails the run (the app would show that
# photo from its online original, core.js photoAway).
want=$(mktemp) have=$(mktemp)
python3 tools/photos.py --r2-list | while read -r f; do printf '%s\n' "$f.webp" "$f-m.webp" "$f-s.webp" "$f-t.webp"; done | sort >"$want"
rclone lsf "r2:${R2_BUCKET}/img" --files-only --fast-list | sort >"$have"
missing=$(comm -23 "$want" "$have")
if [ -n "$missing" ]; then
  echo "$(printf '%s\n' "$missing" | wc -l) file(s) of photos that live on R2 only are missing from the bucket:" >&2
  printf '%s\n' "$missing" | head -50 >&2
  exit 1
fi
echo "img/ copied to R2; the $(wc -l <"$want") files of the photos that live on R2 only are there: $(rclone size "r2:${R2_BUCKET}/img" --json)"
