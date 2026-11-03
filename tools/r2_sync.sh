#!/usr/bin/env bash
# Photos out of the repo, step 1 (Pierre, 2026-11-03; docs/ROADMAP.md "Photos out of the repo"): mirror img/ to the
# Cloudflare R2 bucket the app will read its photos from. Run by .github/workflows/photos-r2.yml (a push that changes
# img/, or by hand) and at the end of .github/workflows/approved-photos.yml (its own pushes start no other workflow).
# Credentials come from the repo's GitHub secrets, set by Pierre; agents never see them. Without them it does nothing.
# rclone compares checksums, so only new or changed files go up; a file gone from img/ goes from the bucket too.
set -euo pipefail
if [ -z "${R2_ACCOUNT_ID:-}" ] || [ -z "${R2_ACCESS_KEY_ID:-}" ] || [ -z "${R2_SECRET_ACCESS_KEY:-}" ] || [ -z "${R2_BUCKET:-}" ]; then
  echo "R2 credentials or bucket not set: nothing synced"
  exit 0
fi
command -v rclone >/dev/null || { sudo apt-get update -qq && sudo apt-get install -y -qq rclone; }
export RCLONE_CONFIG_R2_TYPE=s3 RCLONE_CONFIG_R2_PROVIDER=Cloudflare RCLONE_CONFIG_R2_REGION=auto \
  RCLONE_CONFIG_R2_ENDPOINT="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com" \
  RCLONE_CONFIG_R2_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" RCLONE_CONFIG_R2_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
  RCLONE_CONFIG_R2_NO_CHECK_BUCKET=true
# A week of browser cache: a recropped photo keeps its name but its URL carries the crop (app.js ver), so it is
# fetched again.
rclone sync img "r2:${R2_BUCKET}/img" --checksum --fast-list --transfers 32 --checkers 32 \
  --header-upload "Cache-Control: public, max-age=604800" --stats 30s --stats-one-line --stats-log-level NOTICE
echo "img/ mirrored to R2: $(rclone size "r2:${R2_BUCKET}/img" --json)"
