# Plan: Conditioning (Metabolic Conditioning / Ergometry) Equipment Update

Same patterns as Benches & Racks, Bodyweight, and Cables & Bands: one migration, client defaults, combined SQL file, and docs. **Apply the migration without a DB password using Option C (Supabase Dashboard → SQL Editor → run `RUN_EQUIPMENT_MIGRATIONS.sql`)** or use MCP/CLI if configured.

---

## 1. Scope

- **Category:** `conditioning` (already exists in `equipment_categories`: common term "Conditioning", technical "Metabolic Ergometers").
- **Goal:** Replace generic conditioning items with the exhaustive laboratory taxonomy (Gait & Locomotion, Bikes, Ellipticals, Full-Body Ergometers, Vertical Displacement), plus optional **low_impact** tag for Kevin's Note (Specificity of Adaptation / "bad knees").
- **No new columns:** Use existing `equipment_inventory` (`name`, `category`, `tags`). No `pulley_ratio` (that’s cables only).

---

## 2. Canonical Conditioning List (18 items)

### 1. Gait & Locomotion (Treadmills) — 4
| Name | Tags |
|------|------|
| Motorized Treadmill | `{}` |
| Manual (Curved) Treadmill | `{}` |
| Slat Belt Treadmill | `{}` |
| Anti-Gravity Treadmill | `{}` |

### 2. Stationary Cycling (Bikes) — 4
| Name | Tags |
|------|------|
| Upright Bike | `{}` |
| Recumbent Bike | `low_impact` |
| Spin (Studio) Bike | `{}` |
| Air Bike (Fan Bike) | `{}` |

### 3. Low-Impact Striding & Ellipticals — 3
| Name | Tags |
|------|------|
| Standard Elliptical | `low_impact` |
| Arc Trainer | `low_impact` |
| Adaptive Motion Trainer (AMT) | `low_impact` |

### 4. Full-Body Ergometers (Pulling & Power) — 2
| Name | Tags |
|------|------|
| Rowing Machine (Air/Water/Magnetic) | `{}` |
| SkiErg | `{}` |

### 5. Vertical Displacement & Climbing — 4
| Name | Tags |
|------|------|
| StairMill / StepMill | `{}` |
| Pedaling Stepper | `{}` |
| Vertical Climber (VersaClimber) | `{}` |
| Jacob's Ladder | `{}` |

### 6. Other (Simple / Portable) — 1
| Name | Tags |
|------|------|
| Jump Rope | `{}` |

**Tag rationale:** Items tagged `low_impact` minimize joint reaction forces (Kevin’s Note: avoid StairMill/Treadmill for "bad knees" in favor of Recumbent Bike or Elliptical). Optional future use: filter by `low_impact` in program builder or admin UI.

---

## 3. Implementation Tasks

### 3.1 Migration file

- **File:** `supabase/migrations/20250303300000_equipment_conditioning_canonical.sql`
- **Contents:**
  - Single `INSERT INTO public.equipment_inventory (name, category, tags) VALUES ... ON CONFLICT (name, category) DO UPDATE SET tags = EXCLUDED.tags` for all 18 items.
  - Category is always `'conditioning'`.
  - Use `ARRAY['low_impact']` for the four low-impact items; `'{}'` for the rest.
- **Idempotent:** Safe to run multiple times; no new tables or columns.

### 3.2 Client defaults (both apps)

- **Files:**  
  - `apps/admin-dash-astro/src/lib/supabase/client/equipment.ts`  
  - `apps/programs/src/lib/supabase/client/equipment.ts`
- **In `defaultEquipment` (inside `seedDefaultData()`):**
  - Remove old conditioning entries: `Treadmill`, `Elliptical`, `Jump Rope` (if they appear as single generic names).
  - Add the 18 canonical conditioning items in the same order as the migration (grouped for readability).
- **In `defaultZones`:**
  - **Hotel (Standard):** Change `'Treadmill', 'Elliptical'` to `'Motorized Treadmill', 'Standard Elliptical'` so they resolve to the new canonical names after seed.
- **No type or API changes** (category and tags already supported).

### 3.3 Combined SQL file

- **File:** `apps/admin-dash-astro/docs/RUN_EQUIPMENT_MIGRATIONS.sql`
- **Change:** Append the full block from `20250303300000_equipment_conditioning_canonical.sql` (with a short comment header) so that **Option C (Dashboard, no password)** applies Conditioning in one run with the rest of the equipment migrations.

### 3.4 Documentation

- **File:** `apps/admin-dash-astro/docs/EQUIPMENT_SCHEMA.md`
- **Changes:**
  - In **Relevant migration files** (or "How to run the schema"): add `20250303300000_equipment_conditioning_canonical.sql`.
  - In **Equipment category taxonomy** table: expand the `conditioning` row to mention the canonical list and optional `low_impact` tag (and Kevin’s Note).
  - Add a new subsection **Conditioning (canonical list)** under the taxonomy, mirroring Cables & Bands / Bodyweight:
    - List the 5 groups (plus Other) and the 18 item names.
    - Note that items tagged `low_impact` are preferred when minimizing joint impact (e.g. Recumbent Bike, Standard Elliptical, Arc Trainer, AMT).
  - In **Migration SQL** numbered list: add step **6.** for the Conditioning canonical migration.

---

## 4. UI (optional, same patterns as others)

- **ManageZones (admin-dash-astro and programs):** No code change required. If you later want a “Low impact” badge for conditioning items with `tags` containing `low_impact`, add a small conditional badge (same pattern as “Safety features” and “Pulley ratio”). **In-scope for this plan:** document the tag only; badge can be a follow-up.

---

## 5. Applying the migration (no password)

- **Recommended (same way every time):**  
  **Option C:** Supabase Dashboard → SQL Editor → open `apps/admin-dash-astro/docs/RUN_EQUIPMENT_MIGRATIONS.sql` → copy all → Paste → Run.  
  No Supabase CLI, no `SUPABASE_DB_PASSWORD`.
- **Alternative:** Use Supabase MCP (e.g. execute_sql or apply_migration) if the project is linked and authorized.
- **CLI:** If you use `supabase db push`, ensure `SUPABASE_ACCESS_TOKEN` (and if required `SUPABASE_DB_PASSWORD`) are set in the same terminal; the new migration will be applied with the rest.

---

## 6. Checklist (for implementation)

- [ ] Add `supabase/migrations/20250303300000_equipment_conditioning_canonical.sql` with 18 conditioning items and `low_impact` tags where specified.
- [ ] Update `defaultEquipment` and default zone "Hotel (Standard)" in `apps/admin-dash-astro/src/lib/supabase/client/equipment.ts`.
- [ ] Update `defaultEquipment` and default zone "Hotel (Standard)" in `apps/programs/src/lib/supabase/client/equipment.ts`.
- [ ] Append Conditioning INSERT block to `apps/admin-dash-astro/docs/RUN_EQUIPMENT_MIGRATIONS.sql`.
- [ ] Update `apps/admin-dash-astro/docs/EQUIPMENT_SCHEMA.md` (taxonomy row, new subsection, migration list).
- [ ] (Optional) Add “Low impact” badge in ManageZones for `conditioning` items with `low_impact` tag; or leave for a follow-up.

---

## 7. Kevin’s Note (for schema doc)

When selecting equipment for a program, remember **Specificity of Adaptation**. If a user has "bad knees," avoid StairMill and Treadmill in favor of **Recumbent Bike** or **Elliptical** (and other `low_impact` options) to minimize joint reaction forces while still achieving the target heart rate.
