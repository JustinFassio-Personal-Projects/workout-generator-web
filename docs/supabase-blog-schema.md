# Supabase Blog Schema Documentation

## Overview

This document describes the Supabase database schema for the blog system. The schema includes tables for posts, categories, authors, and admin users, with Row Level Security (RLS) policies for access control.

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
```

- Each post belongs to one category (nullable)
- Each post has one author (nullable)
- Each admin user corresponds to one auth user
- Categories and authors can have multiple posts

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

## Migration Instructions

### 1. Apply Migration

The migration file should be applied to your Supabase project. You can:

**Option A: Using Supabase CLI**

```bash
supabase db push
```

**Option B: Using Supabase Dashboard**

1. Go to SQL Editor in your Supabase dashboard
2. Copy the contents of `supabase/migrations/20260104082749_create_blog_schema.sql`
3. Paste and execute

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

The database schema maps to TypeScript types defined in `types/blog.ts`:

- Database `posts` → TypeScript `Post` and `PostWithRelations`
- Database `categories` → TypeScript `Category`
- Database `authors` → TypeScript `Author`
- Database `admin_users` → TypeScript `AdminUser`

## Query Functions

The application uses query functions in `lib/blog/queries.ts`:

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

## Performance Considerations

### Indexes

The schema includes indexes on frequently queried columns:

- `posts.status` - For filtering published posts
- `posts.published_at` - For sorting posts by date
- `posts.slug` - For lookups by slug
- `categories.slug` - For category lookups
- `authors.slug` - For author lookups

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

## Related Files

- Migration: `supabase/migrations/20260104082749_create_blog_schema.sql`
- Seed Data: `supabase/seed.sql`
- TypeScript Types: `types/blog.ts`
- Query Functions: `lib/blog/queries.ts`
- Admin API: `app/api/admin/blog/route.ts`
- Migration Script: `scripts/migrate-posts.ts`
