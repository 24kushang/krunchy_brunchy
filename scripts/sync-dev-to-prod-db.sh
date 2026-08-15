#!/bin/bash

# Data-only sync: dumps all table data from a source Postgres DB (develop)
# and applies it into a target Postgres DB (prod).
#
# Assumes both databases already have the SAME SCHEMA (e.g. both have had
# migrations applied) — this script only moves row data, it never creates
# or drops tables. Requires `pg_dump` and `psql` on PATH.
#
# Usage:
#   ./scripts/sync-dev-to-prod-db.sh "<source-conn-string>" "<target-conn-string>"
#   SOURCE_DB_URL="..." TARGET_DB_URL="..." ./scripts/sync-dev-to-prod-db.sh
#
# Flags:
#   --yes       skip the interactive confirmation prompt
#   --dry-run   take the dump and show a summary, but do not apply it to target

set -euo pipefail

SOURCE_DB_URL="${SOURCE_DB_URL:-}"
TARGET_DB_URL="${TARGET_DB_URL:-}"
ASSUME_YES=false
DRY_RUN=false

for arg in "$@"; do
  case "$arg" in
    --yes) ASSUME_YES=true ;;
    --dry-run) DRY_RUN=true ;;
    *)
      if [ -z "$SOURCE_DB_URL" ]; then
        SOURCE_DB_URL="$arg"
      elif [ -z "$TARGET_DB_URL" ]; then
        TARGET_DB_URL="$arg"
      fi
      ;;
  esac
done

if [ -z "$SOURCE_DB_URL" ] || [ -z "$TARGET_DB_URL" ]; then
  echo "Usage: $0 <source-conn-string> <target-conn-string> [--yes] [--dry-run]" >&2
  exit 1
fi

for bin in pg_dump psql; do
  command -v "$bin" >/dev/null 2>&1 || { echo "Error: '$bin' is not installed or not on PATH." >&2; exit 1; }
done

# Redact credentials before ever printing a URL
redact() { echo "$1" | sed -E 's#(://[^:]+):[^@]+@#\1:***@#'; }

SOURCE_HOST=$(echo "$SOURCE_DB_URL" | sed -E 's#^[a-zA-Z]+://[^@]+@([^/:]+).*#\1#')
TARGET_HOST=$(echo "$TARGET_DB_URL" | sed -E 's#^[a-zA-Z]+://[^@]+@([^/:]+).*#\1#')

echo "Source (data FROM): $(redact "$SOURCE_DB_URL")"
echo "Target (data INTO): $(redact "$TARGET_DB_URL")"

if [ "$SOURCE_HOST" = "$TARGET_HOST" ]; then
  echo "Error: source and target resolve to the same host ('$SOURCE_HOST'). Refusing to continue." >&2
  exit 1
fi

if [ "$ASSUME_YES" != true ]; then
  read -r -p "This will INSERT source data into the target database '$TARGET_HOST'. Type 'yes' to continue: " CONFIRM
  if [ "$CONFIRM" != "yes" ]; then
    echo "Aborted."
    exit 1
  fi
fi

TIMESTAMP=$(date +"%Y-%m-%d_%H%M%S")
DUMP_DIR="$(pwd)/backups/db-sync"
mkdir -p "$DUMP_DIR"
DUMP_FILE="$DUMP_DIR/dev_data_only_$TIMESTAMP.sql"

echo "Dumping data-only from source..."
# 'migrations' is TypeORM's own bookkeeping table — each environment ran its
# own migrations independently, so its rows (and PK ids) must NOT be synced.
pg_dump "$SOURCE_DB_URL" \
  --data-only \
  --no-owner \
  --no-privileges \
  --exclude-table=migrations \
  --file "$DUMP_FILE"

echo "Dump saved to: $DUMP_FILE ($(du -sh "$DUMP_FILE" | cut -f1))"

if [ "$DRY_RUN" = true ]; then
  echo "--dry-run set: not applying to target. Inspect the dump above before running for real."
  exit 0
fi

echo "Taking a safety backup of the target before writing to it..."
TARGET_BACKUP_FILE="$DUMP_DIR/target_before_sync_$TIMESTAMP.sql"
pg_dump "$TARGET_DB_URL" --no-owner --no-privileges --file "$TARGET_BACKUP_FILE" || {
  echo "Warning: could not back up target before syncing (it may be empty). Continuing." >&2
}

echo "Applying dump to target as a single transaction (all-or-nothing)..."
if psql "$TARGET_DB_URL" -v ON_ERROR_STOP=1 --single-transaction -f "$DUMP_FILE"; then
  echo "=== Sync completed successfully at $(date) ==="
  echo "Source dump:   $DUMP_FILE"
  echo "Target backup: $TARGET_BACKUP_FILE"
else
  echo "Error: applying dump to target failed and was rolled back — target is unchanged. Pre-sync backup (for reference) is at: $TARGET_BACKUP_FILE" >&2
  exit 1
fi
