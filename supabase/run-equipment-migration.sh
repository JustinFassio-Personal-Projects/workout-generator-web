#!/usr/bin/env bash
# Run the equipment_zones schema migration against the linked Supabase project.
# Option A: Use Supabase CLI (after login and link):
#   supabase login
#   supabase link --project-ref qbklyimfazrkutwqictw
#   supabase db push
# Option B: Use psql with DATABASE_URL (from Supabase Dashboard → Settings → Database → Connection string URI):
#   export DATABASE_URL='postgresql://postgres.[ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres'
#   ./supabase/run-equipment-migration.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATION="${SCRIPT_DIR}/migrations/20250302180000_equipment_zones_schema.sql"

if [ -n "${DATABASE_URL}" ]; then
  echo "Running migration via psql (DATABASE_URL)..."
  psql "${DATABASE_URL}" -f "${MIGRATION}"
  echo "Done."
else
  echo "Using Supabase CLI to push migrations..."
  (cd "${SCRIPT_DIR}/.." && supabase db push)
fi
