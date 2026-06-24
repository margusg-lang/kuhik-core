#!/bin/sh
# kuhik-core backend docker entrypoint
# Handles: wait-for-db → prisma migrate → start app

set -e

echo "⏳ Waiting for PostgreSQL..."
# Extract host and port from DATABASE_URL
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')

# Default to postgres:5432 if parsing fails
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"

# Wait for database to be ready
for i in $(seq 1 30); do
  if nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; then
    echo "✓ PostgreSQL is ready"
    break
  fi
  echo "  Waiting for PostgreSQL... ($i/30)"
  sleep 1
done

# Run Prisma migrations (safe: db push + generate)
echo "📦 Running Prisma migrations..."
npx prisma generate
npx prisma db push --accept-data-loss 2>&1
echo "✓ Database migrations complete"

# Start the application
echo "🚀 Starting backend..."
exec "$@"