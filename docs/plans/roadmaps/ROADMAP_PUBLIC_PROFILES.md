# Feature Roadmap: Public User Profiles

**Goal:** Enable users of `aiworkoutgen.app` to create public-facing profile pages on `aiworkoutgenerator.com` to share their fitness journey, stats, and workouts.

**Tech Stack:** Next.js 16, React, TypeScript, Server Actions.

---

## Phase 1: Database & Schema Design

_Focus: Data structure, privacy, and aggregation efficiency._

- [ ] **Update User Schema**
  - [ ] Add identity fields: `username` (unique, indexed), `bio` (text), `avatar_url`, `social_links` (JSON).
  - [ ] Add privacy settings object:
    ```typescript
    visibility: {
      isProfilePublic: boolean // default false
      showWeight: boolean // default false
      showWorkouts: boolean // default true
      showStreak: boolean // default true
    }
    ```
- [ ] **Data Aggregation Strategy**
  - [ ] Create efficient queries (or materialized views) for profile stats to avoid heavy calculation on render:
    - Total Workouts Completed
    - Total Volume Lifted
    - Current Streak
    - Active Days (Last 30 days)
- [ ] **Trust & Safety**
  - [ ] Implement backend validation for reserved usernames (e.g., "admin", "support", "api").
  - [ ] Add basic profanity filter for Bio/Username fields.

## Phase 2: Domain Strategy & Routing

_Focus: Connecting the App (Private) to the Marketing Site (Public)._

- [ ] **Route Configuration**
  - [ ] Create Dynamic Route on `aiworkoutgenerator.com`: `app/user/[username]/page.tsx`.
  - [ ] Configure `next.config.js` (if needed) for cross-origin image optimization (for user avatars).
- [ ] **Data Access Layer**
  - [ ] Establish shared data access logic between the App and Marketing site (via Monorepo shared packages or internal API with secure tokens).

## Phase 3: The "Editor" Experience (App Side)

_Focus: User controls within `aiworkoutgen.app`._

- [ ] **Profile Settings Page**
  - [ ] UI for editing Bio, Social Links, and Avatar.
  - [ ] UI for "Claim Username" (check availability in real-time).
  - [ ] Privacy Toggles (syncs with `visibility` schema).
- [ ] **Server Actions**
  - [ ] Implement `updateUserProfile` action (mutations).
  - [ ] Implement `checkUsernameAvailability` action.
- [ ] **Preview Mode**
  - [ ] Add a "View Public Profile" button that links to the `.com` live page.

## Phase 4: The Public Page (Website Side)

_Focus: Performance, SEO, and visual hierarchy._

- [ ] **Page Architecture (Next.js 16)**
  - [ ] **RSC:** Fetch main user details on the server.
  - [ ] **Suspense:** Wrap heavy data components (Charts, Workout History) in `<Suspense>` boundaries.
  - [ ] **Caching:** Implement `unstable_cache` or `fetch` tags (e.g., `['user-profile', 'username']`) to cache public pages aggressively; revalidate via webhook or Server Action when user updates data.
- [ ] **UI Components**
  - [ ] **Hero Section:** Avatar, Name, Bio, Socials.
  - [ ] **Stats Grid:** High-level numbers (Workouts, Streak).
  - [ ] **Activity Feed:** List of recent workouts (respecting privacy toggles).
  - [ ] **CTA:** "Create your own workout on AI Workout Generator" (Sticky footer or header button).
- [ ] **SEO & Metadata**
  - [ ] Dynamic `generateMetadata`: Title = "[User]'s Fitness Journey | AI Workout Generator".
  - [ ] **Open Graph:** Use `@vercel/og` to generate dynamic share images containing the user's stats.

## Phase 5: Engagement & Growth Loops

_Focus: Viral features and distribution._

- [ ] **Sharing Logic**
  - [ ] Add "Share Profile" button to the App dashboard.
  - [ ] Add "Share Workout" button that links to the public profile anchor (e.g., `/user/gymrat?workout=123`).
- [ ] **Sitemap**
  - [ ] specific public profiles to `sitemap.xml` for indexing (only if `isProfilePublic` is true).

---

## Technical Considerations

### Caching Strategy (Next.js)

Public profiles should be heavily cached to withstand traffic spikes from social sharing.

- **Reads:** Use `force-cache` on `fetch` requests for user data.
- **Writes:** Use `revalidateTag` inside the App's "Save Profile" Server Action to instantly update the public page.

### Edge Cases

- **404s:** Handle non-existent users gracefully with a custom "User not found – Create your own profile?" page.
- **Private Profiles:** If a user toggles to Private, the public URL should return a 404 or a "This profile is private" state.
