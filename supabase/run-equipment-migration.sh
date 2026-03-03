#!/usr/bin/env bash
# Run the full equipment_zones migration set (schema, taxonomy, canonical lists, RLS) against the DB.
#
# Option A: Supabase CLI (after login and link). Pushes all pending migrations including equipment.
#   supabase login
#   supabase link --project-ref <PROJECT_REF>
#   supabase db push
#
# Option B: psql with DATABASE_URL (Dashboard → Settings → Database → Connection string URI).
#   export DATABASE_URL='postgresql://postgres.[ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres'
#   ./supabase/run-equipment-migration.sh
#
# With Option B this script runs, in order: initial schema, taxonomy, tags, then all canonical
# equipment inserts (benches_racks, bodyweight, cables_bands, conditioning, functional_training,
# free_weights, machines), then equipment RLS (admin read/write). Same logical set as
# apps/admin-dash-astro/docs/RUN_EQUIPMENT_MIGRATIONS.sql (Dashboard paste option).

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="${SCRIPT_DIR}/migrations"

EQUIPMENT_MIGRATIONS=(
  "20250302180000_equipment_zones_schema.sql"
  "20250302190000_equipment_category_taxonomy.sql"
  "20250303000000_equipment_benches_racks_and_tags.sql"
  "20250303100000_equipment_bodyweight_canonical.sql"
  "20250303200000_equipment_cables_bands_canonical.sql"
  "20250303300000_equipment_conditioning_canonical.sql"
  "20250303400000_equipment_functional_training.sql"
  "20250303500000_equipment_free_weights_canonical.sql"
  "20250303600000_equipment_machines_canonical.sql"
  "20260303130000_equipment_zones_admin_only_rls.sql"
)

if [ -n "${DATABASE_URL}" ]; then
  echo "Running equipment migrations via psql (DATABASE_URL)..."
  for f in "${EQUIPMENT_MIGRATIONS[@]}"; do
    path="${MIGRATIONS_DIR}/${f}"
    if [ -f "${path}" ]; then
      echo "  ${f}"
      psql "${DATABASE_URL}" -f "${path}"
    else
      echo "  Skipping ${f} (not found)."
    fi
  done
  echo "Done."
else
  echo "Using Supabase CLI to push all migrations (including equipment)..."
  (cd "${SCRIPT_DIR}/.." && supabase db push)
fi
