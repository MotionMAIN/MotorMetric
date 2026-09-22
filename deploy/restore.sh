#!/bin/sh
set -eu

: "${POSTGRES_HOST:?POSTGRES_HOST is required}"
: "${POSTGRES_PORT:?POSTGRES_PORT is required}"
: "${POSTGRES_DB:?POSTGRES_DB is required}"
: "${POSTGRES_USER:?POSTGRES_USER is required}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}"

export PGPASSWORD="$POSTGRES_PASSWORD"

echo "Restoring MotorMetric database snapshot..."
pg_restore \
  --exit-on-error \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  --dbname="postgresql://$POSTGRES_USER@$POSTGRES_HOST:$POSTGRES_PORT/$POSTGRES_DB" \
  /seed/motormetric.dump
echo "MotorMetric database restore complete."
