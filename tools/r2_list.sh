#!/usr/bin/env bash
# The listing of the whole R2 bucket, READ ONLY (Linear REE-6; .github/workflows/r2-unused.yml, then tools/r2_unused.py).
#
#   tools/r2_list.sh OUT.json     write rclone's JSON listing of the bucket (every object: path, size, modification time)
#
# It only lists (rclone lsjson). It never copies, syncs, moves or deletes, and no option of it can: nothing in the bucket is
# modified. Credentials as tools/r2_sync.sh has them (the repo's GitHub secrets, set by the admin; agents never see them);
# without them it fails, since an empty listing must never look like a clean bucket. The secrets are read from the
# environment only: no config file, no log of them; the listing holds object names, sizes and times, nothing else.
# The rclone release is the one tools/r2_sync.sh pins (read from that file: one place to change it), checked against its
# SHA-256 before it runs.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="${1:?usage: tools/r2_list.sh OUT.json}"
for v in R2_ACCOUNT_ID R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY R2_BUCKET; do
  [ -n "${!v:-}" ] || { echo "R2 credentials or bucket not set ($v): nothing listed" >&2; exit 1; }
done
RCLONE_VERSION=$(sed -n 's/^RCLONE_VERSION=\([0-9][0-9.]*\).*/\1/p' tools/r2_sync.sh)
RCLONE_SHA256=$(sed -n 's/^RCLONE_SHA256=\([0-9a-f]\{64\}\).*/\1/p' tools/r2_sync.sh)
[ -n "$RCLONE_VERSION" ] && [ -n "$RCLONE_SHA256" ] || { echo "no pinned rclone in tools/r2_sync.sh" >&2; exit 1; }
[ "$(uname -s)-$(uname -m)" = Linux-x86_64 ] || { echo "the pinned rclone is the linux-amd64 build, not $(uname -sm)" >&2; exit 1; }
rc=$(mktemp -d)
curl -fsSL --proto '=https' --tlsv1.2 --retry 3 -o "$rc/rclone.zip" \
  "https://downloads.rclone.org/v${RCLONE_VERSION}/rclone-v${RCLONE_VERSION}-linux-amd64.zip"
echo "$RCLONE_SHA256  $rc/rclone.zip" | sha256sum --check --strict --quiet - ||
  { echo "rclone v$RCLONE_VERSION: the download does not match its pinned SHA-256, nothing listed" >&2; exit 1; }
unzip -q -j "$rc/rclone.zip" "rclone-v${RCLONE_VERSION}-linux-amd64/rclone" -d "$rc"
PATH="$rc:$PATH"
rclone version | sed -n '1p'
export RCLONE_CONFIG_R2_TYPE=s3 RCLONE_CONFIG_R2_PROVIDER=Cloudflare RCLONE_CONFIG_R2_REGION=auto \
  RCLONE_CONFIG_R2_ENDPOINT="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com" \
  RCLONE_CONFIG_R2_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" RCLONE_CONFIG_R2_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
  RCLONE_CONFIG_R2_NO_CHECK_BUCKET=true
# The whole bucket, so the report can total what lies outside img/ too; files only, one recursive listing.
# --use-server-modtime: the time is the object's upload time, from the listing itself (rclone's default reads the
# mtime from each object's metadata, one HEAD request per object, about 119k of them; and it is the file's own mtime,
# not the upload time the report's "young" guard needs). --no-mimetype: the same, for the content type.
rclone lsjson "r2:${R2_BUCKET}" --recursive --files-only --fast-list --use-server-modtime --no-mimetype --log-level ERROR >"$OUT"
[ -s "$OUT" ] || { echo "empty listing" >&2; exit 1; }
echo "listing written ($(wc -c <"$OUT") bytes)"
