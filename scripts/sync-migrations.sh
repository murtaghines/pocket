#!/usr/bin/env bash
# Brings the linked Supabase project's migration history in line with supabase/migrations/
# and applies whatever is pending. Idempotent: safe to run on every merge.
#
#   DRY_RUN=1 scripts/sync-migrations.sh   # print what would happen, change nothing
#
# Requires: supabase CLI linked to the project (`supabase link`), jq.
#
# Why the repair step exists: before automation, migrations were applied by hand under
# different timestamps than the files in the repo, so the remote history never matched
# the repo. Everything older than BASELINE is already live in production, so its history
# rows are re-keyed to the repo's versions. Anything at or after BASELINE is applied by
# `db push`. Remote-only versions are dropped from the history table (not from the DB).
set -euo pipefail

BASELINE="${BASELINE:-20261017100000}"
DRY_RUN="${DRY_RUN:-0}"

# `migration list` prints a table in a terminal/CI and JSON when it detects an AI agent, so
# accept both and reduce them to two sorted files of versions: local.txt and remote.txt.
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
raw="$(supabase migration list --linked)"

if grep -q '^{' <<<"$raw"; then
  json="$(grep '^{' <<<"$raw")"
  jq -r '.migrations[] | select(.local  != "") | .local'  <<<"$json" | sort -u >"$tmp/local.txt"
  jq -r '.migrations[] | select(.remote != "") | .remote' <<<"$json" | sort -u >"$tmp/remote.txt"
else
  awk -F'|' 'NF >= 3 { gsub(/[ \t]/, "", $1); if ($1 ~ /^[0-9]+$/) print $1 }' <<<"$raw" | sort -u >"$tmp/local.txt"
  awk -F'|' 'NF >= 3 { gsub(/[ \t]/, "", $2); if ($2 ~ /^[0-9]+$/) print $2 }' <<<"$raw" | sort -u >"$tmp/remote.txt"
fi

if [ ! -s "$tmp/local.txt" ]; then
  echo "::error::Could not read the local migration list from the CLI output" >&2
  exit 1
fi

to_revert="$(comm -13 "$tmp/local.txt" "$tmp/remote.txt")"
to_apply="$(comm -23 "$tmp/local.txt" "$tmp/remote.txt" | awk -v base="$BASELINE" '$1 < base')"
pending="$(awk -v base="$BASELINE" '$1 >= base' "$tmp/local.txt")"

run() {
  if [ "$DRY_RUN" = "1" ]; then echo "[dry-run] $*"; else "$@"; fi
}

if [ -n "$to_revert" ]; then
  echo "Dropping $(wc -l <<<"$to_revert" | tr -d ' ') remote-only history entries"
  # shellcheck disable=SC2086
  run supabase migration repair --linked --status reverted $to_revert
fi

if [ -n "$to_apply" ]; then
  echo "Recording $(wc -l <<<"$to_apply" | tr -d ' ') repo migrations before $BASELINE as already applied"
  # shellcheck disable=SC2086
  run supabase migration repair --linked --status applied $to_apply
fi

if [ "$DRY_RUN" = "1" ]; then
  echo "[dry-run] pending after repair would be every local migration >= $BASELINE:"
  sed 's/^/  /' <<<"$pending"
  exit 0
fi

supabase db push --linked --include-all --dry-run
supabase db push --linked --include-all
