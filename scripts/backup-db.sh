#!/bin/bash

# Database Backup Script for Krunchy Brunchy OMS (PostgreSQL inside Docker)
# This script dumps the Postgres database, compresses it, and prunes old backups.

set -e

# --- Configurations ---
CONTAINER_NAME=${CONTAINER_NAME:-"oms_postgres"}
DB_USER=${DB_USER:-"admin"}
DB_NAME=${DB_NAME:-"oms_db"}
RETENTION_DAYS=${RETENTION_DAYS:-7}

# Default backup directory on host
BACKUP_DIR=${BACKUP_DIR:-"/var/backups/oms-db"}

# Fallback to local directory if default is not writable/creatable
if [ ! -d "$BACKUP_DIR" ]; then
  mkdir -p "$BACKUP_DIR" 2>/dev/null || {
    BACKUP_DIR="$(pwd)/backups/db"
    mkdir -p "$BACKUP_DIR"
    echo "Warning: /var/backups/oms-db is not writable. Falling back to local directory: $BACKUP_DIR"
  }
fi

TIMESTAMP=$(date +"%Y-%m-%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/oms_db_$TIMESTAMP.sql.gz"

echo "=== Starting database backup at $(date) ==="

# Check if the postgres container is running
if ! docker ps --format '{{.Names}}' | grep -Eq "^${CONTAINER_NAME}$"; then
  echo "Error: Docker container '${CONTAINER_NAME}' is not running!" >&2
  exit 1
fi

echo "Dumping database '${DB_NAME}' from container '${CONTAINER_NAME}'..."
# Execute pg_dump inside container and pipe it to gzip on the host
if docker exec -t "$CONTAINER_NAME" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"; then
  echo "Backup successfully saved to: $BACKUP_FILE"
  echo "File size: $(du -sh "$BACKUP_FILE" | cut -f1)"
else
  echo "Error: Database backup failed!" >&2
  # Clean up partial file on failure
  rm -f "$BACKUP_FILE"
  exit 1
fi

# --- Retention Pruning ---
echo "Pruning backups older than $RETENTION_DAYS days in $BACKUP_DIR..."
# Find files matching the naming pattern that are older than RETENTION_DAYS and delete them
find "$BACKUP_DIR" -type f -name "oms_db_*.sql.gz" -mtime +"$RETENTION_DAYS" -exec rm -f {} \; -print | while read -r deleted_file; do
  echo "Pruned old backup: $deleted_file"
done

echo "=== Database backup process completed at $(date) ==="
