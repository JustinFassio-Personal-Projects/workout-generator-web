# Admin Dashboard: Add Leads Management Feature

## Context

The Admin Dashboard (`/admin`) was originally designed as a blog management system. It currently includes:

- **Dashboard Page** (`/admin/page.tsx`) - Shows blog statistics and recent posts
- **Blog Management** (`/admin/blog`) - Full CRUD for blog posts
- **Admin Layout** (`components/admin/AdminLayout.tsx`) - Sidebar navigation with collapsible menu
- **Authentication** - Admin user verification via `admin_users` table

The dashboard uses:

- Next.js 14 App Router with Server Components
- Supabase for database (with RLS policies)
- SCSS Modules for styling (dark theme with glass morphism)
- TypeScript for type safety

## Objective

Add a **Leads Management** section to the Admin Dashboard that allows admins to:

1. View all leads with filtering and search
2. View detailed lead information including related data
3. See lead statistics on the dashboard
4. Export lead data (optional enhancement)

## Database Schema

### `leads` Table

```sql
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL DEFAULT 'vision_lab', -- 'vision_lab' | 'exercise_challenge'
  utm_source TEXT,
  utm_campaign TEXT,
  utm_medium TEXT,
  referrer TEXT,
  consent_follow_up BOOLEAN NOT NULL DEFAULT false,
  consent_email_plan BOOLEAN NOT NULL DEFAULT false,
  coaching_interest BOOLEAN NOT NULL DEFAULT false,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Related Tables

**`vision_lead_intel`** - Stores micro-interview responses from Vision Lab:

- `id`, `lead_id` (FK to leads), `vision_prompt`, `image_url`, `goal_primary`, `frustration_primary`, `ai_expectation_primary`, `payment_trigger_primary`, `expectation_free_text`, `exercise_suggestion`, `created_at`

**`exercise_submissions`** - Stores exercise submissions:

- `id`, `lead_id` (FK to leads), `exercise_name`, `category`, `equipment`, `primary_muscles`, `movement_pattern`, `difficulty`, `technique_cues`, `safety_notes`, `regression`, `progression`, `mistakes`, `contraindications`, `rationale`, `vision_prompt`, `status`, `created_at`

## Implementation Requirements

### 1. Navigation Update

**File**: `components/admin/AdminLayout.tsx`

Add a new navigation item to the `navItems` array:

```typescript
{ href: '/admin/leads', label: 'Leads', icon: Users } // Import Users from lucide-react
```

### 2. Dashboard Statistics

**File**: `app/admin/page.tsx`

Add lead statistics to the dashboard:

- Total Leads
- Leads This Week
- Leads by Source (vision_lab vs exercise_challenge)
- Verified Leads Count

Update the `getStats()` function to include lead counts, and add a new section in the JSX to display lead stats alongside blog stats.

### 3. Leads List Page

**File**: `app/admin/leads/page.tsx`

Create a new page that:

- Fetches all leads from the database (using `createServerSupabaseClient()`)
- Passes data to a client component for filtering/searching
- Follows the same pattern as `app/admin/blog/page.tsx`

**File**: `components/admin/LeadList.tsx` (new)

Create a component similar to `BlogList.tsx` with:

- Search functionality (by name, email)
- Filter by source (`vision_lab`, `exercise_challenge`, `all`)
- Filter by verification status (`verified`, `unverified`, `all`)
- Filter by date range (optional enhancement)
- Table/list view showing:
  - Name
  - Email
  - Source
  - Verification status
  - Created date
  - Related data indicators (has intel, has submissions)
- Click to view lead details
- Export functionality (optional enhancement)

**File**: `components/admin/LeadList.module.scss` (new)

Style the component following the same design patterns as `BlogList.module.scss`:

- Dark theme with glass morphism
- Consistent spacing and typography
- Hover states and transitions

### 4. Lead Detail Page

**File**: `app/admin/leads/[id]/page.tsx`

Create a detail page that:

- Fetches lead by ID
- Fetches related `vision_lead_intel` data (if exists)
- Fetches related `exercise_submissions` data (if exists)
- Displays all lead information in organized sections

**File**: `components/admin/LeadDetail.tsx` (new)

Create a component that displays:

- **Lead Information Section**:
  - Name, Email, Source
  - UTM parameters (source, campaign, medium)
  - Referrer
  - Consent flags (follow-up, email plan, coaching interest)
  - Verification status
  - Created date
- **Vision Lead Intel Section** (if exists):
  - Vision prompt
  - Image (if image_url exists)
  - All micro-interview responses
  - Created date
- **Exercise Submissions Section** (if exists):
  - List of all submissions with status
  - Exercise details
  - Created dates
- **Actions**:
  - Mark as verified/unverified
  - Delete lead (with confirmation)
  - Back to list

**File**: `components/admin/LeadDetail.module.scss` (new)

Style following the same patterns as other admin components.

### 5. Admin API Routes

**File**: `app/api/admin/leads/route.ts` (new)

Create API route for:

- `GET` - List all leads (with optional query params for filtering)
- `DELETE` - Delete a lead (cascade will handle related data)

**File**: `app/api/admin/leads/[id]/route.ts` (new)

Create API route for:

- `GET` - Get single lead with related data
- `PUT` - Update lead (e.g., verification status)
- `DELETE` - Delete specific lead

**Important**: All admin API routes must:

1. Verify admin access using `getServerUser()` and checking `admin_users` table
2. Use `createAdminClient()` to bypass RLS when needed
3. Return proper error responses
4. Follow the same pattern as `app/api/admin/blog/route.ts`

### 6. TypeScript Types

**File**: `types/admin.ts` (new, or add to existing types file)

Define types for:

```typescript
export interface AdminLead {
  id: string
  first_name: string
  email: string
  source: string
  utm_source?: string | null
  utm_campaign?: string | null
  utm_medium?: string | null
  referrer?: string | null
  consent_follow_up: boolean
  consent_email_plan: boolean
  coaching_interest: boolean
  verified: boolean
  created_at: string
}

export interface AdminLeadWithRelations extends AdminLead {
  vision_lead_intel?: VisionLeadIntel[]
  exercise_submissions?: ExerciseSubmission[]
}
```

## Design Patterns to Follow

1. **Server Components First**: Use Server Components for data fetching, Client Components only when needed for interactivity
2. **Consistent Styling**: Follow the existing dark theme with glass morphism design
3. **Error Handling**: Proper error boundaries and user-friendly error messages
4. **Loading States**: Show loading indicators during data fetching
5. **Empty States**: Friendly empty state messages when no data exists
6. **Responsive Design**: Ensure mobile-friendly layouts
7. **Accessibility**: Proper ARIA labels and keyboard navigation

## File Structure

```
app/admin/
  leads/
    [id]/
      page.tsx          # Lead detail page
    page.tsx            # Leads list page
  page.tsx              # Update dashboard with lead stats
  blog/                 # Existing blog management
  ...

components/admin/
  LeadList.tsx          # New: Leads list component
  LeadList.module.scss  # New: Leads list styles
  LeadDetail.tsx        # New: Lead detail component
  LeadDetail.module.scss # New: Lead detail styles
  AdminLayout.tsx       # Update: Add Leads nav item
  BlogList.tsx          # Existing
  BlogEditor.tsx        # Existing
  ...

app/api/admin/
  leads/
    [id]/
      route.ts          # New: Single lead operations
    route.ts            # New: List/create/delete leads
  blog/                 # Existing blog API
  ...

types/
  admin.ts              # New: Admin-specific types
  exercise-challenge.ts # Existing (has Lead type)
```

## Testing Considerations

- Test admin authentication on all new routes
- Test filtering and search functionality
- Test lead detail page with and without related data
- Test verification status updates
- Test lead deletion (ensure cascade works)
- Test empty states
- Test responsive design

## Security Requirements

1. **Authentication**: All admin routes must verify user is in `admin_users` table
2. **Authorization**: Use `createAdminClient()` to bypass RLS only in admin context
3. **Input Validation**: Validate all user inputs
4. **SQL Injection**: Use Supabase query builder (parameterized queries)
5. **Rate Limiting**: Consider adding rate limiting to admin API routes

## Optional Enhancements

1. **Export Functionality**: CSV/JSON export of filtered leads
2. **Bulk Actions**: Select multiple leads for bulk operations
3. **Advanced Filtering**: Date range, multiple sources, etc.
4. **Lead Notes**: Add ability to add internal notes to leads
5. **Lead Tags**: Categorize leads with tags
6. **Analytics**: Charts showing lead trends over time
7. **Email Integration**: Quick actions to email leads

## Implementation Notes

- Follow the exact same patterns used in the blog management section
- Reuse existing utility functions and components where possible
- Maintain consistency with existing code style and conventions
- Ensure all new code follows TypeScript best practices
- Add proper error handling and user feedback
- Write comprehensive tests for new functionality

## Success Criteria

✅ Leads section appears in admin navigation
✅ Dashboard shows lead statistics
✅ Leads list page displays all leads with filtering
✅ Lead detail page shows complete lead information
✅ Related data (vision_lead_intel, exercise_submissions) is displayed
✅ Admin can update lead verification status
✅ Admin can delete leads
✅ All routes are properly secured
✅ UI matches existing admin dashboard design
✅ Code follows existing patterns and conventions
