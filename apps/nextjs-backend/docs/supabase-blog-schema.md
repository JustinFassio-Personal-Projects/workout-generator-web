# Supabase Database Schema Documentation

## Overview

This document describes the Supabase database schema for the application. The schema includes tables for the blog system (posts, categories, authors, admin users) and leads management (leads, vision_lead_intel, exercise_submissions), with Row Level Security (RLS) policies for access control.

## Table Structure

### Categories Table

Stores blog post categories.

| Column        | Type        | Constraints             | Description                                 |
| ------------- | ----------- | ----------------------- | ------------------------------------------- |
| `id`          | UUID        | PRIMARY KEY             | Unique identifier                           |
| `name`        | TEXT        | NOT NULL, UNIQUE        | Category name (e.g., "Getting Started")     |
| `slug`        | TEXT        | NOT NULL, UNIQUE        | URL-friendly slug (e.g., "getting-started") |
| `description` | TEXT        | NULLABLE                | Optional category description               |
| `created_at`  | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Creation timestamp                          |

**Indexes:**

- Primary key index on `id`
- Unique index on `slug`
- Index on `slug` for lookups

### Authors Table

Stores blog post authors.

| Column       | Type        | Constraints             | Description                              |
| ------------ | ----------- | ----------------------- | ---------------------------------------- |
| `id`         | UUID        | PRIMARY KEY             | Unique identifier                        |
| `name`       | TEXT        | NOT NULL                | Author name (e.g., "Fitness Team")       |
| `slug`       | TEXT        | NOT NULL, UNIQUE        | URL-friendly slug (e.g., "fitness-team") |
| `bio`        | TEXT        | NULLABLE                | Optional author biography                |
| `avatar`     | TEXT        | NULLABLE                | Optional avatar image URL                |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Creation timestamp                       |

**Indexes:**

- Primary key index on `id`
- Unique index on `slug`
- Index on `slug` for lookups

### Posts Table

Stores blog posts. This is the main table in the blog system.

| Column            | Type        | Constraints                      | Description                                                  |
| ----------------- | ----------- | -------------------------------- | ------------------------------------------------------------ |
| `id`              | UUID        | PRIMARY KEY                      | Unique identifier                                            |
| `slug`            | TEXT        | NOT NULL, UNIQUE                 | URL-friendly slug (e.g., "getting-started-with-ai-workouts") |
| `title`           | TEXT        | NOT NULL                         | Post title                                                   |
| `excerpt`         | TEXT        | NOT NULL                         | Short excerpt/description                                    |
| `content`         | TEXT        | NOT NULL                         | Full post content (markdown)                                 |
| `category_id`     | UUID        | NULLABLE, FK → categories.id     | Reference to category                                        |
| `tags`            | TEXT[]      | DEFAULT '{}'                     | Array of tag strings                                         |
| `author_id`       | UUID        | NULLABLE, FK → authors.id        | Reference to author                                          |
| `featured_image`  | TEXT        | NULLABLE                         | Featured image URL                                           |
| `status`          | TEXT        | NOT NULL, DEFAULT 'draft', CHECK | Post status: 'draft' or 'published'                          |
| `published_at`    | TIMESTAMPTZ | NULLABLE                         | Publication timestamp                                        |
| `seo_title`       | TEXT        | NULLABLE                         | Optional SEO title                                           |
| `seo_description` | TEXT        | NULLABLE                         | Optional SEO description                                     |
| `created_at`      | TIMESTAMPTZ | NOT NULL, DEFAULT now()          | Creation timestamp                                           |
| `updated_at`      | TIMESTAMPTZ | NOT NULL, DEFAULT now()          | Last update timestamp (auto-updated)                         |

**Foreign Keys:**

- `category_id` → `categories(id)` ON DELETE SET NULL
- `author_id` → `authors(id)` ON DELETE SET NULL

**Indexes:**

- Primary key index on `id`
- Unique index on `slug`
- Index on `status` (for filtering published posts)
- Index on `published_at DESC` (for sorting)
- Index on `slug` (for lookups)
- Index on `category_id` (for filtering by category)
- Index on `author_id` (for filtering by author)
- Index on `created_at DESC` (for sorting)

**Triggers:**

- `update_posts_updated_at`: Automatically updates `updated_at` on row update

### Admin Users Table

Stores admin/editor users for blog management.

| Column       | Type        | Constraints                       | Description                    |
| ------------ | ----------- | --------------------------------- | ------------------------------ |
| `id`         | UUID        | PRIMARY KEY, FK → auth.users.id   | References Supabase auth user  |
| `role`       | TEXT        | NOT NULL, DEFAULT 'editor', CHECK | User role: 'admin' or 'editor' |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now()           | Creation timestamp             |

**Foreign Keys:**

- `id` → `auth.users(id)` ON DELETE CASCADE

**Role Differences:**

- **admin**: Full access including delete operations
- **editor**: Can create, read, and update posts, but cannot delete

### Leads Table

Stores lead information captured from various sources (Exercise Challenge, Vision Lab, etc.).

| Column               | Type        | Constraints                            | Description                                       |
| -------------------- | ----------- | -------------------------------------- | ------------------------------------------------- |
| `id`                 | UUID        | PRIMARY KEY                            | Unique identifier                                 |
| `first_name`         | TEXT        | NOT NULL                               | Lead's first name                                 |
| `email`              | TEXT        | NOT NULL, UNIQUE                       | Lead's email address                              |
| `source`             | TEXT        | NOT NULL, DEFAULT 'exercise_challenge' | Lead source: 'exercise_challenge' or 'vision_lab' |
| `utm_source`         | TEXT        | NULLABLE                               | UTM source parameter                              |
| `utm_campaign`       | TEXT        | NULLABLE                               | UTM campaign parameter                            |
| `utm_medium`         | TEXT        | NULLABLE                               | UTM medium parameter                              |
| `referrer`           | TEXT        | NULLABLE                               | HTTP referrer URL                                 |
| `consent_follow_up`  | BOOLEAN     | NOT NULL, DEFAULT false                | Consent for follow-up communication               |
| `consent_email_plan` | BOOLEAN     | NOT NULL, DEFAULT false                | Consent for email plan delivery                   |
| `coaching_interest`  | BOOLEAN     | NOT NULL, DEFAULT false                | Interest in coaching services                     |
| `verified`           | BOOLEAN     | NOT NULL, DEFAULT false                | Lead verification status                          |
| `created_at`         | TIMESTAMPTZ | NOT NULL, DEFAULT now()                | Creation timestamp                                |

**Indexes:**

- Primary key index on `id`
- Unique index on `email`
- Index on `email` for lookups
- Index on `source` for filtering by source
- Index on `created_at DESC` for sorting

### Vision Lead Intel Table

Stores micro-interview responses and vision lab data associated with leads.

| Column                    | Type        | Constraints             | Description                             |
| ------------------------- | ----------- | ----------------------- | --------------------------------------- |
| `id`                      | UUID        | PRIMARY KEY             | Unique identifier                       |
| `lead_id`                 | UUID        | NOT NULL, FK → leads.id | Reference to lead                       |
| `vision_prompt`           | TEXT        | NULLABLE                | Vision prompt used for image generation |
| `image_url`               | TEXT        | NULLABLE                | URL of generated Vision Lab image       |
| `goal_primary`            | TEXT        | NOT NULL                | Primary fitness goal                    |
| `frustration_primary`     | TEXT        | NOT NULL                | Primary frustration                     |
| `ai_expectation_primary`  | TEXT        | NOT NULL                | Primary AI expectation                  |
| `payment_trigger_primary` | TEXT        | NULLABLE                | Primary payment trigger                 |
| `expectation_free_text`   | TEXT        | NULLABLE                | Free text expectations                  |
| `exercise_suggestion`     | TEXT        | NULLABLE                | Exercise suggestion                     |
| `created_at`              | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Creation timestamp                      |

**Foreign Keys:**

- `lead_id` → `leads(id)` ON DELETE CASCADE

**Indexes:**

- Primary key index on `id`
- Index on `lead_id` for lookups
- Index on `created_at DESC` for sorting
- Partial index on `image_url` (where not null) for image queries

### Exercise Submissions Table

Stores exercise submissions from the Exercise Challenge feature.

| Column              | Type              | Constraints             | Description                        |
| ------------------- | ----------------- | ----------------------- | ---------------------------------- |
| `id`                | UUID              | PRIMARY KEY             | Unique identifier                  |
| `lead_id`           | UUID              | NOT NULL, FK → leads.id | Reference to lead                  |
| `exercise_name`     | TEXT              | NOT NULL                | Name of the exercise               |
| `category`          | exercise_category | NOT NULL                | Exercise category (enum)           |
| `equipment`         | equipment_type    | NOT NULL                | Equipment type (enum)              |
| `primary_muscles`   | TEXT[]            | NOT NULL, DEFAULT '{}'  | Array of primary muscle groups     |
| `movement_pattern`  | movement_pattern  | NOT NULL                | Movement pattern (enum)            |
| `difficulty`        | difficulty_level  | NOT NULL                | Difficulty level (enum)            |
| `technique_cues`    | TEXT              | NOT NULL                | Technique cues and instructions    |
| `safety_notes`      | TEXT              | NULLABLE                | Safety considerations              |
| `regression`        | TEXT              | NULLABLE                | Easier variation/regression        |
| `progression`       | TEXT              | NULLABLE                | Harder variation/progression       |
| `mistakes`          | TEXT              | NULLABLE                | Common mistakes to avoid           |
| `contraindications` | TEXT              | NULLABLE                | Contraindications and warnings     |
| `rationale`         | TEXT              | NULLABLE                | Rationale for exercise selection   |
| `vision_prompt`     | TEXT              | NULLABLE                | Vision prompt for image generation |
| `status`            | exercise_status   | NOT NULL, DEFAULT 'new' | Submission status (enum)           |
| `created_at`        | TIMESTAMPTZ       | NOT NULL, DEFAULT now() | Creation timestamp                 |

**Enums:**

- `exercise_status`: 'new', 'reviewing', 'accepted', 'rejected'
- `exercise_category`: 'strength', 'conditioning', 'mobility', 'skill', 'recovery'
- `equipment_type`: 'none', 'db', 'bb', 'kb', 'bands', 'machine', 'other'
- `movement_pattern`: 'squat', 'hinge', 'push', 'pull', 'carry', 'rotation', 'locomotion'
- `difficulty_level`: 'beginner', 'intermediate', 'advanced'

**Foreign Keys:**

- `lead_id` → `leads(id)` ON DELETE CASCADE

**Indexes:**

- Primary key index on `id`
- Index on `lead_id` for lookups
- Index on `status` for filtering by status
- Index on `category` for filtering by category
- Index on `created_at DESC` for sorting

## Relationships

```
auth.users (Supabase Auth)
    ↓ (1:1)
admin_users
    ↓ (many:1)
posts ←──┐
    ↓    │
categories ────┘
    ↓
authors ────┘

leads (1)
    ↓ (1:many)
    ├── vision_lead_intel (0..1)
    └── exercise_submissions (0..many)
```

**Blog System Relationships:**

- Each post belongs to one category (nullable)
- Each post has one author (nullable)
- Each admin user corresponds to one auth user
- Categories and authors can have multiple posts

**Leads Management Relationships:**

- Each lead can have zero or one `vision_lead_intel` record
- Each lead can have zero or many `exercise_submissions` records
- Deleting a lead cascades to related `vision_lead_intel` and `exercise_submissions` records

## Row Level Security (RLS) Policies

RLS is enabled on all tables. Policies are defined as follows:

### Categories Policies

1. **Public Read**: Anyone can read all categories

   ```sql
   Policy: "Public can read categories"
   Role: public
   Operation: SELECT
   ```

2. **Admin Management**: Only admins can create, update, or delete categories
   ```sql
   Policy: "Admins can manage categories"
   Role: authenticated (with admin check)
   Operation: ALL (INSERT, UPDATE, DELETE)
   ```

### Authors Policies

1. **Public Read**: Anyone can read all authors

   ```sql
   Policy: "Public can read authors"
   Role: public
   Operation: SELECT
   ```

2. **Admin Management**: Only admins can create, update, or delete authors
   ```sql
   Policy: "Admins can manage authors"
   Role: authenticated (with admin check)
   Operation: ALL (INSERT, UPDATE, DELETE)
   ```

### Posts Policies

1. **Public Read Published**: Anyone can read published posts

   ```sql
   Policy: "Public can read published posts"
   Role: public
   Operation: SELECT
   Condition: status = 'published'
   ```

2. **Admin Read All**: Admins and editors can read all posts (including drafts)

   ```sql
   Policy: "Admins can read all posts"
   Role: authenticated (with admin_users check)
   Operation: SELECT
   ```

3. **Admin Insert**: Admins and editors can create posts

   ```sql
   Policy: "Admins can insert posts"
   Role: authenticated (with admin_users check)
   Operation: INSERT
   ```

4. **Admin Update**: Admins and editors can update posts

   ```sql
   Policy: "Admins can update posts"
   Role: authenticated (with admin_users check)
   Operation: UPDATE
   ```

5. **Admin Delete**: Only admins can delete posts (editors cannot)
   ```sql
   Policy: "Admins can delete posts"
   Role: authenticated (with admin role check)
   Operation: DELETE
   ```

### Admin Users Policies

1. **Authenticated Read**: Authenticated users can read admin_users (to check their own status)

   ```sql
   Policy: "Authenticated users can read admin_users"
   Role: authenticated
   Operation: SELECT
   ```

2. **Service Role Management**: Service role can manage admin_users (for server-side operations)
   ```sql
   Policy: "Service role can manage admin_users"
   Role: service_role
   Operation: ALL
   ```

### Leads Policies

1. **Public Insert**: Anyone can insert leads (for lead capture forms)

   ```sql
   Policy: "Public can insert leads"
   Role: public
   Operation: INSERT
   ```

2. **Public Read**: Anyone can read leads (for MVP; can be restricted to admin-only later)

   ```sql
   Policy: "Public can read leads"
   Role: public
   Operation: SELECT
   ```

   **Note**: In practice, admin operations use `createAdminClient()` to bypass RLS for full access.

### Vision Lead Intel Policies

1. **Public Insert**: Anyone can insert vision lead intel (for micro-interview responses)

   ```sql
   Policy: "Public can insert vision lead intel"
   Role: public
   Operation: INSERT
   ```

2. **Public Read**: Anyone can read vision lead intel (for MVP; can be restricted to admin-only later)

   ```sql
   Policy: "Public can read vision lead intel"
   Role: public
   Operation: SELECT
   ```

   **Note**: Admin operations use `createAdminClient()` to bypass RLS.

### Exercise Submissions Policies

1. **Public Insert**: Anyone can insert exercise submissions (linked to their lead)

   ```sql
   Policy: "Public can insert exercise submissions"
   Role: public
   Operation: INSERT
   ```

2. **Public Read**: Anyone can read exercise submissions (for MVP; can be restricted to admin-only later)

   ```sql
   Policy: "Public can read exercise submissions"
   Role: public
   Operation: SELECT
   ```

   **Note**: Admin operations use `createAdminClient()` to bypass RLS.

## Common Queries

### Get All Published Posts

```sql
SELECT
  posts.*,
  categories.* as category,
  authors.* as author
FROM posts
LEFT JOIN categories ON posts.category_id = categories.id
LEFT JOIN authors ON posts.author_id = authors.id
WHERE posts.status = 'published'
ORDER BY posts.published_at DESC;
```

### Get Post by Slug

```sql
SELECT
  posts.*,
  categories.* as category,
  authors.* as author
FROM posts
LEFT JOIN categories ON posts.category_id = categories.id
LEFT JOIN authors ON posts.author_id = authors.id
WHERE posts.slug = 'getting-started-with-ai-workouts'
  AND posts.status = 'published';
```

### Get Posts by Category

```sql
SELECT
  posts.*,
  categories.* as category,
  authors.* as author
FROM posts
LEFT JOIN categories ON posts.category_id = categories.id
LEFT JOIN authors ON posts.author_id = authors.id
WHERE categories.slug = 'getting-started'
  AND posts.status = 'published'
ORDER BY posts.published_at DESC;
```

### Get Posts by Author

```sql
SELECT
  posts.*,
  categories.* as category,
  authors.* as author
FROM posts
LEFT JOIN categories ON posts.category_id = categories.id
LEFT JOIN authors ON posts.author_id = authors.id
WHERE authors.slug = 'fitness-team'
  AND posts.status = 'published'
ORDER BY posts.published_at DESC;
```

### Get All Leads

```sql
SELECT *
FROM leads
ORDER BY created_at DESC;
```

### Get Lead by ID with Relations

```sql
SELECT
  leads.*,
  json_agg(DISTINCT jsonb_build_object(
    'id', vli.id,
    'vision_prompt', vli.vision_prompt,
    'image_url', vli.image_url,
    'goal_primary', vli.goal_primary,
    'frustration_primary', vli.frustration_primary,
    'ai_expectation_primary', vli.ai_expectation_primary,
    'payment_trigger_primary', vli.payment_trigger_primary,
    'expectation_free_text', vli.expectation_free_text,
    'exercise_suggestion', vli.exercise_suggestion,
    'created_at', vli.created_at
  )) FILTER (WHERE vli.id IS NOT NULL) as vision_lead_intel,
  json_agg(DISTINCT jsonb_build_object(
    'id', es.id,
    'exercise_name', es.exercise_name,
    'category', es.category,
    'equipment', es.equipment,
    'status', es.status,
    'created_at', es.created_at
  )) FILTER (WHERE es.id IS NOT NULL) as exercise_submissions
FROM leads
LEFT JOIN vision_lead_intel vli ON leads.id = vli.lead_id
LEFT JOIN exercise_submissions es ON leads.id = es.lead_id
WHERE leads.id = 'lead-uuid-here'
GROUP BY leads.id;
```

### Get Leads by Source

```sql
SELECT *
FROM leads
WHERE source = 'vision_lab'
ORDER BY created_at DESC;
```

### Get Verified Leads

```sql
SELECT *
FROM leads
WHERE verified = true
ORDER BY created_at DESC;
```

### Get Leads Created This Week

```sql
SELECT *
FROM leads
WHERE created_at >= date_trunc('week', CURRENT_DATE)
ORDER BY created_at DESC;
```

### Get Exercise Submissions by Lead

```sql
SELECT *
FROM exercise_submissions
WHERE lead_id = 'lead-uuid-here'
ORDER BY created_at DESC;
```

### Get Vision Lead Intel by Lead

```sql
SELECT *
FROM vision_lead_intel
WHERE lead_id = 'lead-uuid-here'
ORDER BY created_at DESC;
```

## Migration Instructions

### 1. Apply Migration

The migration file should be applied to your Supabase project. You can:

**Option A: Using Supabase CLI**

```bash
supabase db push
```

**Option B: Using Supabase Dashboard**

1. Go to SQL Editor in your Supabase dashboard
2. Copy the contents of the migration files in order:
   - `supabase/migrations/20260104082749_create_blog_schema.sql`
   - `supabase/migrations/20260105204537_create_exercise_challenge_schema.sql`
   - `supabase/migrations/20260106060432_create_vision_lead_intel_schema.sql`
   - `supabase/migrations/20260106140228_add_image_url_to_vision_lead_intel.sql`
3. Paste and execute each in order

**Option C: Using MCP Supabase Tools**

```javascript
// Use mcp_supabase_apply_migration with the migration SQL
```

### 2. Seed Initial Data

After applying the migration, run the seed data script:

**Option A: Using Supabase CLI**

```bash
supabase db reset  # This applies migrations and seed data
```

**Option B: Using Supabase Dashboard**

1. Go to SQL Editor
2. Copy the contents of `supabase/seed.sql`
3. Paste and execute

**Option C: Using Migration Script**
You can also use the TypeScript migration script:

```bash
npx tsx scripts/migrate-posts.ts
```

This script will:

- Migrate categories and authors from seed data
- Migrate blog posts from `data/blog/posts.ts`

## Adding Admin Users

To add an admin user, you need to:

1. Create the user in Supabase Auth (if not already exists)
2. Insert into `admin_users` table using the service role key:

```sql
INSERT INTO admin_users (id, role)
VALUES ('user-uuid-here', 'admin')
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;
```

Or using the TypeScript admin client:

```typescript
import { createAdminClient } from '@/lib/supabase/admin'

const adminClient = createAdminClient()
await adminClient.from('admin_users').upsert({ id: userId, role: 'admin' })
```

## TypeScript Type Mapping

**Blog System Types** (defined in `types/blog.ts`):

- Database `posts` → TypeScript `Post` and `PostWithRelations`
- Database `categories` → TypeScript `Category`
- Database `authors` → TypeScript `Author`
- Database `admin_users` → TypeScript `AdminUser`

**Leads Management Types** (defined in `types/exercise-challenge.ts` and `types/admin.ts`):

- Database `leads` → TypeScript `Lead` and `AdminLead`
- Database `vision_lead_intel` → TypeScript `VisionLeadIntel`
- Database `exercise_submissions` → TypeScript `ExerciseSubmission`
- Database `leads` with relations → TypeScript `AdminLeadWithRelations` (includes optional arrays of `VisionLeadIntel[]` and `ExerciseSubmission[]`)

## Query Functions

**Blog Query Functions** (in `lib/blog/queries.ts`):

- `getAllPublishedPosts()` - Get all published posts with relations
- `getPostBySlug(slug)` - Get single post by slug
- `getAllPostSlugs()` - Get all published post slugs
- `getPostsByCategory(categorySlug)` - Get posts by category
- `getPostsByAuthor(authorSlug)` - Get posts by author
- `getRelatedPosts(post, limit)` - Get related posts
- `getAllCategories()` - Get all categories
- `getCategoryBySlug(slug)` - Get category by slug
- `getAllAuthors()` - Get all authors
- `getAuthorBySlug(slug)` - Get author by slug
- `searchPosts(query)` - Search posts by query string

**Leads Management API Routes** (in `app/api/admin/leads/`):

- `GET /api/admin/leads` - List all leads with optional filtering (source, verified, search)
- `GET /api/admin/leads/[id]` - Get single lead with relations
- `PUT /api/admin/leads/[id]` - Update lead (primarily for verification status)
- `DELETE /api/admin/leads/[id]` - Delete lead and cascade related data

**Note**: All admin routes require authentication and admin user verification. They use `createAdminClient()` to bypass RLS for full access.

## Performance Considerations

### Indexes

The schema includes indexes on frequently queried columns:

**Blog System:**

- `posts.status` - For filtering published posts
- `posts.published_at` - For sorting posts by date
- `posts.slug` - For lookups by slug
- `categories.slug` - For category lookups
- `authors.slug` - For author lookups

**Leads Management:**

- `leads.email` - For email lookups and uniqueness
- `leads.source` - For filtering by source
- `leads.created_at` - For sorting by creation date
- `vision_lead_intel.lead_id` - For joining with leads
- `vision_lead_intel.image_url` - Partial index for image queries
- `exercise_submissions.lead_id` - For joining with leads
- `exercise_submissions.status` - For filtering by status
- `exercise_submissions.category` - For filtering by category

### Query Optimization

- Use `SELECT` with explicit column lists when possible
- Use indexes on WHERE clauses (status, published_at, slugs)
- Limit results when fetching lists
- Use pagination for large result sets

## Maintenance

### Updating Schema

To modify the schema:

1. Create a new migration file with timestamp prefix
2. Document changes in this file
3. Test migrations in development first
4. Apply to production using Supabase CLI or dashboard

### Backup

Regular backups are recommended:

- Use Supabase dashboard backups
- Export schema using `pg_dump`
- Keep migration files in version control

## Admin Dashboard Features

### Blog Management

The admin dashboard includes a complete blog management system accessible at `/admin/blog`:

- Dashboard statistics (total posts, published posts, drafts)
- Blog list page with search and filtering
- Blog post creation and editing
- Category and author management
- Post deletion (admin only)

### Leads Management

The admin dashboard includes a complete leads management system accessible at `/admin/leads`:

- Dashboard statistics (total leads, leads this week, by source, verified count)
- Leads list page with search and filtering (by source, verification status, name/email)
- Lead detail page showing:
  - Basic lead information (name, email, source, UTM parameters, referrer)
  - Consent flags and verification status
  - Related Vision Lead Intel data (if present)
  - Related Exercise Submissions (if present)
- Lead verification toggle
- Lead deletion with confirmation

**Admin Routes:**

- `/admin/leads` - Leads list page
- `/admin/leads/[id]` - Lead detail page

**API Routes:**

- `GET /api/admin/leads` - List leads with filters
- `GET /api/admin/leads/[id]` - Get lead with relations
- `PUT /api/admin/leads/[id]` - Update lead
- `DELETE /api/admin/leads/[id]` - Delete lead

All admin routes verify authentication via `getServerUser()` and check `admin_users` table for authorization.

## Storage Buckets

The application uses Supabase Storage for image management. Two buckets are configured for different use cases.

### `lead-images` Bucket

Stores images uploaded by leads during the exercise challenge workflow.

**Configuration:**

- **Type**: Public (images need to be displayed in admin dashboard)
- **Max File Size**: 5MB
- **Allowed MIME Types**: `image/jpeg`, `image/png`, `image/webp`, `image/gif`
- **Path Pattern**: `{leadId}/{timestamp}-{randomId}.{ext}`
- **Public URL Format**: `https://{project-ref}.supabase.co/storage/v1/object/public/lead-images/{leadId}/{filename}`

**RLS Policies:**

- **Public Read**: Anyone can read images from this bucket
- **Authenticated Write**: Authenticated users can write (defense-in-depth, actual writes use service role)

**Upload Endpoint:**

- `POST /api/leads/images?lead_id={leadId}` - Uploads image for a specific lead
- Validates lead_id exists, enforces rate limiting (5 uploads/hour per lead_id)
- Validates file type via Content-Type and magic bytes
- Returns public URL for use in vision-lead-intel submission

### `blog-images` Bucket

Stores images uploaded by admins for blog posts.

**Configuration:**

- **Type**: Public
- **Max File Size**: 5MB
- **Allowed MIME Types**: `image/jpeg`, `image/png`, `image/webp`, `image/gif`
- **Path Pattern**: `blog/{timestamp}-{randomId}.{ext}`
- **Public URL Format**: `https://{project-ref}.supabase.co/storage/v1/object/public/blog-images/blog/{filename}`

**RLS Policies:**

- **Public Read**: Anyone can read images from this bucket
- **Admin Write**: Only users in `admin_users` table can write

**Upload Endpoint:**

- `POST /api/admin/upload` - Admin-only image upload endpoint
- Requires admin authentication
- Returns public URL for use in blog posts

### Storage URL Validation

The `vision_lead_intel.image_url` column has a check constraint that validates:

- `NULL` values (no image)
- Base64 data URLs (temporary, for backward compatibility): `data:image/{type};base64,{data}`
- Supabase Storage URLs: `https://{project-ref}.supabase.co/storage/v1/object/(public|sign)/lead-images/{path}`

**Migration**: `supabase/migrations/20260107085000_add_storage_url_validation.sql`

## Related Files

**Blog System:**

- Migration: `supabase/migrations/20260104082749_create_blog_schema.sql`
- Seed Data: `supabase/seed.sql`
- TypeScript Types: `types/blog.ts`
- Query Functions: `lib/blog/queries.ts`
- Admin API: `app/api/admin/blog/route.ts`
- Migration Script: `scripts/migrate-posts.ts`

**Leads Management:**

- Migrations:
  - `supabase/migrations/20260105204537_create_exercise_challenge_schema.sql`
  - `supabase/migrations/20260106060432_create_vision_lead_intel_schema.sql`
  - `supabase/migrations/20260106140228_add_image_url_to_vision_lead_intel.sql`
  - `supabase/migrations/20260107084907_create_storage_buckets.sql`
  - `supabase/migrations/20260107085000_add_storage_url_validation.sql`
- TypeScript Types: `types/exercise-challenge.ts`, `types/admin.ts`
- Admin API Routes:
  - `app/api/admin/leads/route.ts`
  - `app/api/admin/leads/[id]/route.ts`
- Admin Components:
  - `components/admin/LeadList.tsx`
  - `components/admin/LeadDetail.tsx`
- Admin Pages:
  - `app/admin/leads/page.tsx`
  - `app/admin/leads/[id]/page.tsx`
- Image Upload API:
  - `app/api/leads/images/route.ts` - Lead image upload endpoint
