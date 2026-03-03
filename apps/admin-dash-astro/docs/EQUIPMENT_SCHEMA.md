# Equipment & Zones Schema (admin-dash-astro)

The **Zones** admin page (`/admin/zones`) requires two tables in the Supabase project. If they do not exist, use the method below.

---

## Apply schema: Dashboard SQL Editor (recommended — no password, no CLI)

**Use this every time.** No database password, no access token, no `supabase` CLI. You’re already signed in with Google in the Dashboard.

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → select your project → **SQL Editor**.
2. Open **`apps/admin-dash-astro/docs/RUN_EQUIPMENT_MIGRATIONS.sql`** in this repo.
3. Copy the **entire** file contents, paste into the SQL Editor, click **Run**.

Done. Safe to run multiple times (idempotent). Then refresh the Zones page.

---

## Other options (only if you need them)

**Supabase MCP:** If the Supabase MCP server is connected to this project in Cursor, you can run SQL via its tools (e.g. execute_sql). Same result as the Dashboard; no DB password.

**CLI (`supabase db push`):** Credentials live in repo root **`.env.local`** (gitignored): `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD`. From repo root, load them then run the CLI: `set -a && source .env.local && set +a && supabase link --project-ref qbklyimfazrkutwqictw && supabase db push`. If you don’t have `.env.local`, copy `.env.example` to `.env.local` and fill in (token from Account → Access Tokens; DB password from Dashboard → Project Settings → Database, in the connection string or via Reset password).

Relevant migration files (for reference): `supabase/migrations/20250302180000_equipment_zones_schema.sql`, `20250302190000_equipment_category_taxonomy.sql`, `20250303000000_equipment_benches_racks_and_tags.sql`, `20250303100000_equipment_bodyweight_canonical.sql`, `20250303200000_equipment_cables_bands_canonical.sql`, `20250303300000_equipment_conditioning_canonical.sql`, `20250303400000_equipment_functional_training.sql`, `20250303500000_equipment_free_weights_canonical.sql`, `20250303600000_equipment_machines_canonical.sql`.

## Required tables

- **`equipment_categories`** — taxonomy for equipment categories (code, common_term, technical_term, examples). Single source of truth for both technical and common naming. See **Equipment category taxonomy** below.
- **`equipment_inventory`** — equipment items (name, category, optional `tags`, optional `pulley_ratio`). `category` is a code referencing `equipment_categories.code` (e.g. `free_weights`, `machines`, `cables_bands`, `bodyweight`, `benches_racks`, `conditioning`, `functional_training`). `tags` is a text array (e.g. `safety_features` for racks, `cable_machine` for cable machines). `pulley_ratio` (text, e.g. `"2:1"`) is optional and used for cable machines to track mechanical tension.
- **`equipment_zones`** — zones with description, biomechanical constraints, and equipment references. Zone `category` is one of `domestic`, `commercial`, `amenity`, `outdoor` (unchanged).

RLS should allow authenticated users (or admins) to read and write; adjust policies to match your `admin_users` pattern.

## Equipment category taxonomy

Equipment categories use a seven-category taxonomy with **common term** (display), **technical term**, and **examples**. These live in `equipment_categories`:

| Code (DB)              | Common term         | Technical term            | Examples                                              |
|------------------------|---------------------|---------------------------|-------------------------------------------------------|
| `free_weights`         | Free Weights        | Isoinertial               | Barbells, Dumbbells, Kettlebells                     |
| `machines`             | Machines            | Mechanically Guided       | Selectorized (pin-loaded) and plate-loaded equipment |
| `cables_bands`         | Cables & Bands      | Variable/Constant Tension | Canonical list (see below); cable machines have tag `cable_machine` and optional `pulley_ratio` (e.g. 2:1) for mechanical tension. |
| `bodyweight`           | Bodyweight          | Closed-Kinetic Chain      | Pull-up bars, rings, dip stations, floor space; see **Bodyweight (canonical list)** below. |
| `benches_racks`        | Benches & Racks     | Structural/Utility        | Expanded canonical list (see below); optional tag `safety_features` for racks with pins/straps. |
| `conditioning`         | Conditioning        | Metabolic Ergometers      | Canonical list (see below); optional tag `low_impact` for joint-friendly options (e.g. Recumbent Bike, Standard Elliptical). |
| `functional_training`  | Functional Training | Multi-Planar / Task-Specific | Medicine balls, battle ropes, sleds, stability balls, weight vests; see **Functional Training (canonical list)** below. |

Run the taxonomy migration (`20250302190000_equipment_category_taxonomy.sql`) after the initial schema so that `equipment_categories` exists and `equipment_inventory.category` uses the new CHECK and optional FK.

### Free Weights (canonical list)

Isoinertial resistance (barbells, dumbbells, kettlebells, plates) allows the lifter to control the load in three-dimensional space. Migration `20250303500000_equipment_free_weights_canonical.sql` inserts 16 canonical items:

- **Barbells (6):** Standard Olympic Barbell, Safety Squat Bar (SSB), Swiss Bar / Multi-Grip Bar, Trap Bar (Hex Bar), EZ-Curl Bar, Cambered Bar  
- **Dumbbells & Kettlebells (4):** Fixed Dumbbells, Adjustable Dumbbells, Kettlebells, Loadable Dumbbells  
- **Specialty (3):** Bumper Plates (tagged `drop_safe`), Iron Plates, Fractional / Micro Plates  
- **Legacy (3):** Barbell, Plates, Dumbbells — for backward compatibility with existing zone templates and seed.

**Kevin's Note (Bumper vs Iron):** Programs that involve dropping the bar (e.g. Power Cleans) require **Bumper Plates** so the floor is not damaged. The database distinguishes **Bumper Plates** (tag `drop_safe`) from **Iron Plates**; program logic can filter on `drop_safe` to require drop-safe plates when needed.

### Benches & Racks (canonical list)

The category uses an exhaustive, biomechanically-structured list of 21 items (body support, weight support, specialized support, and storage). Migration `20250303000000_equipment_benches_racks_and_tags.sql` adds the `tags` column, a unique constraint on `(name, category)`, and inserts these items:

- **Benches:** Flat Bench, Adjustable (FID) Bench, Olympic Press Bench, Utility Stool (Seated Bench), Abdominal/Crunch Bench, Folding Bench  
- **Racks:** Power Rack (Full Cage), Half Rack, Squat Stand, Wall-Mounted / Folding Rack, Combo Rack, Rig  
- **Specialized:** Preacher Curl Bench, GHD (Glute Ham Developer), 45-Degree Hyper-extension Bench, Sissy Squat Stand, Nordic Bench  
- **Storage:** Dumbbell Rack (Tiered), Kettlebell Rack, Weight Plate Tree / Toaster Rack, Barbell Storage Rack (Vertical or Horizontal)

**Safety Features:** Items **Power Rack (Full Cage)** and **Half Rack** are tagged with `safety_features` so users (e.g. with back-injury history) can see that safety pins/straps are available. The admin UI shows a "Safety features" badge for these items.

### Bodyweight (canonical list)

Bodyweight training (Closed-Kinetic Chain / CKC) uses the body as the load; the body moves through space against a fixed point. Migration `20250303100000_equipment_bodyweight_canonical.sql` inserts 20 canonical items:

- **Upper body pulling & pushing:** Pull-up Bar (Straight/Multi-grip), Dip Station / Parallel Bars, Power Tower, Wall-Mounted Pull-up Bar, Parallettes  
- **Suspension & lever:** Gymnastic Rings, Suspension Trainer (e.g., TRX), Stall Bars (Gymnastic Wall)  
- **Core & lower body anchors:** Ab Wheel / Roller, Glute-Ham Developer (GHD), Reverse Hyper, Sissy Squat Stand, Nordic Curl Bench  
- **Support & surface:** Plyo Box (Wood/Soft/Adjustable), Push-up Handles, Yoga / Exercise Mat, Peg Board, Climbing Wall / Bouldering Holds  
- **Assistance:** Assistance Bands (for regressing pull-ups/dips)  
- **Implicit:** Floor space  

No tags are used for bodyweight items by default.

### Cables & Bands (canonical list)

Variable resistance (cables and bands) allows the line of pull to match the muscle's force-angle profile. Migration `20250303200000_equipment_cables_bands_canonical.sql` adds the optional `pulley_ratio` column and inserts 21 canonical items:

- **Cable Machine Architectures (7):** Functional Trainer (Dual Stack), Single Column / Cable Tower, Lat Pulldown Station, Seated Row Machine (Cable), Cable Crossover, Plate-Loaded Cable Tower, All-in-One / Smith-Cable Hybrid — tagged `cable_machine`; optional `pulley_ratio` (e.g. `"2:1"` = 100 lb stack feels like 50 lb) for tracking mechanical tension.
- **Cable Attachments (9):** Lat Pulldown Bar, Straight Bar (Revolving), EZ-Curl Bar Attachment, Tricep Rope (Single or Double), D-Handle (Single Grip), V-Bar (Tricep Pressdown), Double D-Handle (Close-Grip Row), Ankle Strap, Ab Crunch Strap  
- **Elastic Resistance – Bands (5):** Loop Bands (Power/Strength Bands), Mini-Bands (Glute Loops), Tube Bands with Handles, Therapy Bands (Flat Strips), Figure-8 Bands  

The admin UI can show a "Pulley ratio" value for items with the `cable_machine` tag when set.

### Conditioning (canonical list)

Metabolic conditioning (ergometry) covers the mechanical tools used to drive heart rate and manage energy systems and joint impact. Migration `20250303300000_equipment_conditioning_canonical.sql` inserts 18 canonical items:

- **Gait & Locomotion (4):** Motorized Treadmill, Manual (Curved) Treadmill, Slat Belt Treadmill, Anti-Gravity Treadmill  
- **Stationary Cycling (4):** Upright Bike, Recumbent Bike, Spin (Studio) Bike, Air Bike (Fan Bike)  
- **Low-Impact Striding (3):** Standard Elliptical, Arc Trainer, Adaptive Motion Trainer (AMT) — tagged `low_impact`  
- **Full-Body Ergometers (2):** Rowing Machine (Air/Water/Magnetic), SkiErg  
- **Vertical Displacement (4):** StairMill / StepMill, Pedaling Stepper, Vertical Climber (VersaClimber), Jacob's Ladder  
- **Other (1):** Jump Rope  

**Kevin's Note (Specificity of Adaptation):** For users with "bad knees," prefer `low_impact` options (Recumbent Bike, Standard Elliptical, Arc Trainer, AMT) over StairMill or treadmill to minimize joint reaction forces while still hitting target heart rate.

### Functional Training (canonical list)

Functional training equipment supports multi-planar, task-specific movements (throws, carries, unstable surfaces, ropes, sleds). Migration `20250303400000_equipment_functional_training.sql` adds the `functional_training` category and inserts 17 canonical items:

- **Balls & unstable surface:** Medicine Ball, Wall Ball, Slam Ball, Stability Ball, BOSU Ball  
- **Ropes & conditioning:** Battle Rope, Climbing Rope  
- **Loaded carries & sleds:** Sandbag, Sled / Prowler, Pull Sled, Farmer's Walk Handles, Weight Vest  
- **Other:** Tire (Flipping/Dragging), Sliders / Gliders, Agility Ladder, Foam Roller, Door Anchor  

No tags are used for functional training items by default.

### Machines (canonical list)

Machines (Mechanically Guided) provide external stability and reduce stabilizer demand, allowing the lifter to drive a target muscle group to volitional failure with high safety. Migration `20250303600000_equipment_machines_canonical.sql` inserts 17 items (16 canonical + 1 legacy):

- **Upper body pressing & pulling (6):** Chest Press Machine (Seated), Pec Deck / Rear Delt Fly, Shoulder Press Machine, Lat Pulldown (Selectorized), Seated Row Machine, Assisted Pull-up / Dip Machine  
- **Lower body (6):** Leg Press (45-Degree or Horizontal), Hack Squat, Leg Extension, Seated / Lying Leg Curl, Adductor / Abductor Machine, Standing / Seated Calf Raise  
- **Specialized & hybrid (4):** Smith Machine, Hip Thrust Machine, T-Bar Row (Supported), Glute Drive  
- **Legacy (1):** Machines — for backward compatibility with existing zone templates and seed  

**Tags:** Each canonical machine is tagged either `selectorized` (pin-loaded, weight stack; faster drop-sets) or `plate_loaded` (plates on the machine; more natural feel, no guide-rod friction). The legacy row "Machines" has no tag.

**Kevin's Note (Selectorized vs Plate-Loaded):** Plate-loaded machines often have a more "natural" feel because they lack the friction of a weight stack's guide rods; selectorized machines allow for faster drop-sets, which are a key tool for driving metabolic stress. The database distinguishes via the `selectorized` and `plate_loaded` tags.

## Migration SQL

**1. Initial schema** (`20250302180000_equipment_zones_schema.sql`): run first to create `equipment_inventory` and `equipment_zones` (with the legacy category CHECK).  
**2. Taxonomy** (`20250302190000_equipment_category_taxonomy.sql`): run second to add `equipment_categories`, backfill `equipment_inventory.category` to the new codes, and update the CHECK/FK.  
**3. Benches & Racks + tags** (`20250303000000_equipment_benches_racks_and_tags.sql`): adds `tags` column, unique `(name, category)`, and inserts the canonical 21 Benches & Racks items (with `safety_features` on Power Rack (Full Cage) and Half Rack).  
**4. Bodyweight** (`20250303100000_equipment_bodyweight_canonical.sql`): inserts the canonical 20 Bodyweight (CKC) items.  
**5. Cables & Bands** (`20250303200000_equipment_cables_bands_canonical.sql`): adds optional `pulley_ratio` column and inserts the canonical 21 Cables & Bands items (7 cable machines tagged `cable_machine`).  
**6. Conditioning** (`20250303300000_equipment_conditioning_canonical.sql`): inserts the canonical 18 Conditioning (Metabolic Ergometry) items (4 tagged `low_impact`: Recumbent Bike, Standard Elliptical, Arc Trainer, Adaptive Motion Trainer (AMT)).  
**7. Functional Training** (`20250303400000_equipment_functional_training.sql`): adds the `functional_training` category to the taxonomy, updates the category CHECK, and inserts the canonical 17 Functional Training items.  
**8. Free Weights** (`20250303500000_equipment_free_weights_canonical.sql`): inserts the canonical 16 Free Weights (Isoinertial) items (Bumper Plates tagged `drop_safe` for program logic e.g. Power Cleans).  
**9. Machines** (`20250303600000_equipment_machines_canonical.sql`): inserts the canonical 17 Machines (Mechanically Guided) items with `selectorized` or `plate_loaded` tags (legacy row "Machines" has no tag).

For a **new project** or any update: use **Option C** (Dashboard) and run **`apps/admin-dash-astro/docs/RUN_EQUIPMENT_MIGRATIONS.sql`** once. For CLI users, run all migration files in order via `supabase db push` (use `--include-all` if needed; requires `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD`).

After running the migrations, the Zones page will work; use "Reset Defaults" in the UI to seed preset equipment and zones. The admin UI shows common terms and optional tooltips with technical term and examples from `equipment_categories`.
