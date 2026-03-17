# AI Workout Generator Hub - Blueprint

## Overview

AI Workout Generator is a unified fitness platform leveraging Firebase's full-stack capabilities and AI-powered workout/nutrition generation. The platform uses a **monorepo architecture** where the principal features (Hub, Trainer, Chef) are integrated into a single Next.js application, providing seamless user experience and simplified development.

**Key Features:**

- **Adaptive Workout Generation:** AI-powered workouts personalized using user profile and real-time daily state
- **Progressive Profile System:** 3-phase data collection (core → enhanced → real-time context)
- **Daily Check-In:** Capture energy, sleep, stress, and soreness before workout generation
- **Generation Context:** Workouts include snapshots of profile and daily state for transparency
- **Feature FAQ Section:** Educational accordion component on homepage explaining all platform features with tier-based availability indicators

**Architecture Decision (Phase 3):**
The original blueprint described a multi-app architecture with 3 separate Next.js applications communicating via SSO tokens. During Phase 3 implementation, this was changed to a monorepo architecture for the following benefits:

- Unified authentication (no SSO complexity)
- Direct access to user context for AI generation
- Faster development iteration
- Simplified deployment pipeline

Iframe embedding with SSO may still be used for future expansion apps (e.g., Social, Marketplace) that benefit from independent deployment.

---

## Architecture

### Application Structure: Monorepo Architecture

**Single Next.js Application with Integrated Modules:**

The project uses a monorepo architecture where the principal apps (Hub, Trainer, Chef) are integrated into a single Next.js application. This decision was made during Phase 3 implementation for the following reasons:

```
ai-workout-generator-hub/       # Unified fitness platform (Port 3000)
├── src/app/                    # Next.js App Router
│   ├── (auth)/login/           # Authentication
│   ├── dashboard/              # User dashboard
│   ├── onboarding/             # User onboarding wizard
│   ├── profile/                # Profile management
│   ├── daily-checkin/          # Daily state capture (Phase 3)
│   ├── generate/               # Workout generation (Trainer)
│   ├── workouts/               # Workout history (Trainer)
│   └── [future: recipes/]      # Recipe features (Chef)
├── src/services/
│   ├── profile/                # Profile service
│   ├── daily-state/            # Daily state service (Phase 3)
│   └── trainer/                # Trainer service
├── src/hooks/                  # React Query hooks
└── src/types/                  # TypeScript types
```

**Architectural Benefits:**

- **Unified Authentication:** Single Firebase Auth session across all features
- **Shared State:** Direct access to user profile and daily state for workout generation
- **Simplified Deployment:** One Vercel project, one CI/CD pipeline
- **Code Reuse:** Shared components, utilities, and types
- **Faster Development:** No SSO complexity for core features

**Expansion Apps (Future):**

For future expansion apps (e.g., Social Feed, Marketplace), iframe embedding may be used:

```
Hub (main app)
  ↓ [iframe + postMessage SSO]
Expansion App (separate deployment)
```

This hybrid approach allows the core fitness platform to remain unified while enabling independent teams to build expansion apps.

---

## Technical Stack

### Frontend

- **Framework:** Next.js 15 (App Router)
- **UI Library:** React 19
- **Component Library:** shadcn/ui (Radix UI primitives + Tailwind)
- **Authentication UI:** FirebaseUI Web
- **Styling:** Tailwind CSS v4 (with `@tailwindcss/postcss` plugin, compatible with shadcn/ui)
- **Language:** TypeScript (strict mode)
- **Animations:** Framer Motion (for smooth transitions)
- **Icons:** Lucide React

### Backend

- **Authentication:** Firebase Authentication (Email/Password + Google OAuth)
- **Database:** Firestore
- **File Storage:** Firebase Storage
- **Functions:** Firebase Cloud Functions (Gen 2)
- **API Routes:** Next.js API Routes (for server-side logic)

### AI Integration

- **Primary AI Framework:** Firebase Genkit
- **AI Provider:** Google Gemini (via Genkit)
- **Prompt Management:** Genkit dotprompt
- **Output Validation:** Genkit output schemas (Zod)
- **Cost Management:**
  - Request rate limiting (Genkit middleware)
  - Response caching (Firestore)
  - Token usage tracking (Firebase Analytics)

### Payment Processing

- **Provider:** Stripe
- **Integration:** Stripe Checkout + Customer Portal
- **Webhook Handling:** Next.js API Route (`/api/webhooks/stripe`)
- **Subscription Plans:** Free, Pro ($19/mo), Elite ($49/mo)

### State Management

**Server State: React Query (TanStack Query)**

- **Use for:** Firestore queries, API calls, data fetching
- **Benefits:** Automatic caching, background refetching, optimistic updates
- **Implementation:**
  ```typescript
  // Example: Fetch user workouts
  const { data: workouts, isLoading } = useQuery({
    queryKey: ["workouts", userId],
    queryFn: () => getWorkouts(userId),
  });
  ```

**Client State: Zustand**

- **Use for:** UI state (modals, filters, form wizards), cross-component state
- **Benefits:** Minimal boilerplate, TypeScript-first, no Provider wrapping
- **Why over Context API:** Better performance (no unnecessary re-renders), simpler API
- **Why over Jotai:** Less atomic—better for grouped state (e.g., workout filters)
- **Implementation:**
  ```typescript
  // stores/workoutStore.ts
  export const useWorkoutStore = create<WorkoutState>((set) => ({
    selectedFocus: null,
    duration: 30,
    setFocus: (focus) => set({ selectedFocus: focus }),
    setDuration: (duration) => set({ duration }),
  }));
  ```

**Form State: React Hook Form + Zod**

- **Use for:** All forms (signup, workout generation, recipe filters)
- **Benefits:** Performant (uncontrolled inputs), built-in validation, TypeScript integration
- **Implementation:**

  ```typescript
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
  });

  const { register, handleSubmit } = useForm<FormData>({
    resolver: zodResolver(schema),
  });
  ```

**Next.js 15 Server/Client Strategy:**

- **Server Components (Default):** Data fetching, static content, layouts
- **Client Components (`"use client"`):**
  - Interactive forms
  - Real-time listeners (Firestore `onSnapshot`)
  - Animations (Framer Motion)
  - State management hooks (Zustand, React Query)
- **Boundary Placement:** Push `"use client"` as deep as possible in component tree

---

## UI Component Architecture

### Quick Start Guide

**Overview:**

You're setting up a modern, production-ready UI system with three layers:

1. **Tailwind CSS** - Utility-first styling foundation
2. **shadcn/ui** - Customizable component library (Radix UI + Tailwind)
3. **FirebaseUI** - Pre-built authentication UI (styled to match shadcn)

**Total Setup Time:** ~15-20 minutes

---

### Step-by-Step Setup

#### **Step 1: Initialize Next.js Project (if not done)**

```bash
npx create-next-app@latest ai-workout-generator-hub
# Choose these options:
# ✅ TypeScript
# ✅ ESLint
# ✅ Tailwind CSS
# ✅ App Router
# ❌ src/ directory (optional, your choice)
# ✅ Import alias (@/*)

cd ai-workout-generator-hub
```

#### **Step 2: Install Tailwind CSS (Already Done by Next.js)**

Your project already has:

- `tailwind.config.ts`
- `postcss.config.mjs`
- `src/app/globals.css` with Tailwind directives

**Note:** This project uses **Tailwind CSS v4** with `@tailwindcss/postcss` plugin. The configuration is compatible with shadcn/ui.

**Verify `tailwind.config.ts`:**

```typescript
import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"], // Enable dark mode with class strategy
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // shadcn will add theme extensions here
    },
  },
  plugins: [typography, animate],
};
export default config;
```

#### **Step 3: Initialize shadcn/ui**

**Run the init command:**

```bash
npx shadcn@latest init
```

**You'll be prompted with questions:**

```
✔ Would you like to use TypeScript (recommended)? … yes
✔ Which style would you like to use? › New York
✔ Which color would you like to use as base color? › Slate
✔ Where is your global CSS file? … src/app/globals.css
✔ Would you like to use CSS variables for colors? … yes
✔ Are you using a custom tailwind prefix eg. tw-? (Leave blank if not) …
✔ Where is your tailwind.config.js located? … tailwind.config.ts
✔ Configure the import alias for components: … @/components
✔ Configure the import alias for utils: … @/lib/utils
✔ Are you using React Server Components? … yes
```

**What this does:**

- Creates `components.json` (shadcn config file)
- Updates `tailwind.config.ts` with theme variables
- Creates `src/lib/utils.ts` (cn helper function)
- Updates `src/app/globals.css` with CSS variables

#### **Step 4: Review Generated Files**

**Check `src/app/globals.css` (should now have CSS variables):**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 224.3 76.3% 48%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

**Check `src/lib/utils.ts` (cn helper):**

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

#### **Step 5: Install Core shadcn Components**

**Install essential components for your fitness app:**

```bash
# Layout & Structure
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add dialog
npx shadcn@latest add sheet
npx shadcn@latest add tabs

# Forms
npx shadcn@latest add form
npx shadcn@latest add input
npx shadcn@latest add label
npx shadcn@latest add select
npx shadcn@latest add slider
npx shadcn@latest add checkbox
npx shadcn@latest add radio-group
npx shadcn@latest add textarea

# Feedback
npx shadcn@latest add toast
npx shadcn@latest add alert
npx shadcn@latest add badge
npx shadcn@latest add skeleton
npx shadcn@latest add progress

# Navigation
npx shadcn@latest add dropdown-menu
npx shadcn@latest add navigation-menu
npx shadcn@latest add avatar

# Data Display
npx shadcn@latest add table
npx shadcn@latest add calendar
npx shadcn@latest add separator
npx shadcn@latest add accordion
```

**What this does:**

- Creates component files in `src/components/ui/`
- Each component is fully customizable (they're just copied into your project)
- Example: `src/components/ui/button.tsx`, `src/components/ui/card.tsx`, etc.

#### **Step 6: Install FirebaseUI**

```bash
npm install firebase firebaseui
npm install -D @types/firebaseui
```

#### **Step 7: Create Firebase Config**

**Create `src/lib/firebase.ts`:**

```typescript
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase (singleton pattern)
const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics =
  typeof window !== "undefined" ? getAnalytics(app) : null;
```

#### **Step 8: Create FirebaseUI Component**

**Create `src/components/auth/FirebaseAuthUI.tsx`:**

### FirebaseUI Web Integration

**Installation:**

```bash
npm install firebase firebaseui
npm install -D @types/firebaseui
```

**FirebaseUI Component (`src/components/auth/FirebaseAuthUI.tsx`):**

```typescript
'use client';

import { useEffect, useRef } from 'react';
import { auth } from '@/lib/firebase';
import * as firebaseui from 'firebaseui';
import 'firebaseui/dist/firebaseui.css';
import { EmailAuthProvider, GoogleAuthProvider } from 'firebase/auth';

export function FirebaseAuthUI() {
  const uiRef = useRef<firebaseui.auth.AuthUI | null>(null);

  useEffect(() => {
    // Initialize FirebaseUI (only once)
    if (!uiRef.current) {
      uiRef.current = new firebaseui.auth.AuthUI(auth);
    }

    const uiConfig: firebaseui.auth.Config = {
      signInOptions: [
        {
          provider: EmailAuthProvider.PROVIDER_ID,
          requireDisplayName: true,
        },
        GoogleAuthProvider.PROVIDER_ID,
      ],
      signInFlow: 'popup',
      signInSuccessUrl: '/dashboard',
      callbacks: {
        signInSuccessWithAuthResult: () => {
          return true; // Redirect to signInSuccessUrl
        },
      },
    };

    uiRef.current.start('#firebaseui-auth-container', uiConfig);

    // Cleanup on unmount
    return () => {
      uiRef.current?.reset();
    };
  }, []);

  return <div id="firebaseui-auth-container" />;
}
```

#### **Step 9: Style FirebaseUI to Match shadcn**

**Create `src/app/firebaseui-overrides.css`:**

```css
/* Override FirebaseUI styles to match shadcn/ui design system */

.firebaseui-container {
  @apply font-sans;
}

.firebaseui-card-content {
  @apply p-0;
}

.firebaseui-card-header {
  @apply pb-4;
}

.firebaseui-title {
  @apply text-2xl font-semibold tracking-tight text-foreground;
}

/* Buttons */
.firebaseui-idp-button {
  @apply rounded-md h-10 px-4 py-2 font-medium transition-colors;
  @apply border border-input bg-background;
  @apply hover:bg-accent hover:text-accent-foreground;
}

.firebaseui-idp-icon-wrapper {
  @apply h-5 w-5;
}

.firebaseui-idp-text {
  @apply text-sm font-medium;
}

/* Text inputs */
.firebaseui-textfield {
  @apply rounded-md border border-input bg-background px-3 py-2 text-sm;
  @apply ring-offset-background file:border-0 file:bg-transparent;
  @apply placeholder:text-muted-foreground;
  @apply focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2;
  @apply disabled:cursor-not-allowed disabled:opacity-50;
}

.firebaseui-label {
  @apply text-sm font-medium leading-none text-foreground;
  @apply peer-disabled:cursor-not-allowed peer-disabled:opacity-70;
}

/* Primary button */
.firebaseui-button {
  @apply rounded-md h-10 px-4 py-2 bg-primary text-primary-foreground;
  @apply hover:bg-primary/90 transition-colors;
  @apply inline-flex items-center justify-center whitespace-nowrap font-medium;
  @apply focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2;
  @apply disabled:pointer-events-none disabled:opacity-50;
}

/* Secondary button */
.firebaseui-id-secondary-link {
  @apply text-sm text-primary underline-offset-4 hover:underline;
}

/* Error messages */
.firebaseui-error {
  @apply text-sm font-medium text-destructive;
}

/* Info text */
.firebaseui-info-bar {
  @apply rounded-md border border-border bg-card p-3;
}

.firebaseui-info-bar-message {
  @apply text-sm text-muted-foreground;
}

/* Loading spinner */
.firebaseui-busy-indicator {
  @apply border-primary;
}

/* Links */
.firebaseui-link {
  @apply text-sm text-primary underline-offset-4 hover:underline;
}

/* Hide FirebaseUI branding if desired */
.firebaseui-tos {
  @apply text-xs text-muted-foreground mt-4;
}
```

**Import in `src/app/layout.tsx`:**

```typescript
import "./globals.css";
import "./firebaseui-overrides.css"; // Add this line
```

#### **Step 10: Create Login Page**

**Create `src/app/(auth)/login/page.tsx`:**

```typescript
import { FirebaseAuthUI } from '@/components/auth/FirebaseAuthUI';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Welcome Back
          </CardTitle>
          <CardDescription className="text-center">
            Sign in to access your personalized fitness journey
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FirebaseAuthUI />
        </CardContent>
      </Card>
    </div>
  );
}
```

#### **Step 11: Test Your Setup**

**Create a simple test page `src/app/page.tsx`:**

```typescript
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>AI Workout Generator</CardTitle>
          <CardDescription>
            Your personalized fitness companion
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Get started with AI-powered workout plans tailored to your goals.
          </p>
          <div className="flex gap-2">
            <Button asChild className="flex-1">
              <Link href="/login">Sign In</Link>
            </Button>
            <Button variant="outline" asChild className="flex-1">
              <Link href="/signup">Sign Up</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
```

**Run the dev server:**

```bash
npm run dev
```

**Visit:**

- `http://localhost:3000` - Home page (test shadcn components)
- `http://localhost:3000/login` - Login page (test FirebaseUI styling)

#### **Step 12: Add Dark Mode Toggle**

**Create `src/components/theme-provider.tsx`:**

```typescript
'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { type ThemeProviderProps } from 'next-themes/dist/types';

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
```

**Install next-themes:**

```bash
npm install next-themes
```

**Update `src/app/layout.tsx`:**

```typescript
import { ThemeProvider } from '@/components/theme-provider';
import './globals.css';
import './firebaseui-overrides.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

**Create `src/components/mode-toggle.tsx`:**

```typescript
'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';

export function ModeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
    >
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
```

---

### shadcn/ui Configuration

**Configuration (`components.json`):**

```json
{
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/app/globals.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

### Dark Mode Implementation

**Complete dark mode setup with ThemeProvider and ModeToggle component (see Step 12 above).**

### Verification & Testing

**Verification Checklist:**

After setup, verify everything works:

- [ ] **Tailwind working:** Background colors, text styles apply
- [ ] **shadcn components render:** Button, Card appear correctly
- [ ] **FirebaseUI matches design:** Login form uses shadcn styling
- [ ] **Dark mode toggles:** Theme switches between light/dark
- [ ] **No console errors:** Check browser console
- [ ] **TypeScript compiles:** Run `npm run type-check`

### Troubleshooting

**Common Issues & Fixes:**

#### **Issue: FirebaseUI styles not applying**

**Fix:** Make sure `firebaseui-overrides.css` is imported in `layout.tsx`

#### **Issue: Dark mode not working**

**Fix:** Ensure `suppressHydrationWarning` is on `<html>` tag and ThemeProvider wraps children

#### **Issue: shadcn components not found**

**Fix:** Check `components.json` aliases match your import paths (`@/components`, `@/lib/utils`)

#### **Issue: Tailwind classes not working**

**Fix:** Verify `tailwind.config.ts` content paths include all your component directories

#### **Issue: Tailwind CSS v4 compatibility**

**Fix:** Ensure `postcss.config.mjs` uses `@tailwindcss/postcss` plugin. shadcn/ui is compatible with Tailwind v4.

### Theme Customization

**To change primary color:**

Edit `src/app/globals.css`:

```css
:root {
  --primary: 221.2 83.2% 53.3%; /* Change this HSL value */
  /* Example: Blue to Purple */
  --primary: 262.1 83.3% 57.8%;
}
```

**Generate color palette:**
Use shadcn's theme generator: https://ui.shadcn.com/themes

---

### Next Steps

Now that your UI system is set up:

1. **Create reusable components:**
   - `src/components/workouts/WorkoutCard.tsx`
   - `src/components/layout/Header.tsx`
   - `src/components/layout/Sidebar.tsx`

2. **Build your first form:**
   - Use `src/components/ui/form.tsx` with React Hook Form
   - Example: Workout generation form

3. **Set up authentication flow:**
   - Protected routes with middleware
   - Auth context provider
   - User session management

4. **Add more shadcn components as needed:**
   ```bash
   npx shadcn@latest add [component-name]
   ```

---

### Summary

You now have:

- ✅ Tailwind CSS v4 configured with CSS variables
- ✅ shadcn/ui component library installed
- ✅ FirebaseUI styled to match shadcn design system
- ✅ Dark mode support with ThemeProvider
- ✅ Type-safe, production-ready UI foundation

**Total files created:** ~15-20 (depending on components installed)

**You're ready to start building your fitness app UI!**

---

### Example Component Patterns

**Workout Card Component:**

```typescript
// components/workouts/WorkoutCard.tsx
'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Dumbbell } from 'lucide-react';
import { type Workout } from '@/types/workout';

interface WorkoutCardProps {
  workout: Workout;
  onSchedule?: (workoutId: string) => void;
  onView?: (workoutId: string) => void;
}

export function WorkoutCard({ workout, onSchedule, onView }: WorkoutCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl">{workout.title}</CardTitle>
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {workout.duration_minutes} minutes
            </CardDescription>
          </div>
          <Badge variant={workout.completed ? 'default' : 'secondary'}>
            {workout.completed ? 'Completed' : 'Not Started'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Dumbbell className="h-4 w-4" />
            <span className="capitalize">{workout.focus}</span>
            <span>•</span>
            <span className="capitalize">{workout.difficulty}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {workout.exercises.length} exercises
          </p>
        </div>
      </CardContent>
      <CardFooter className="gap-2">
        <Button variant="outline" className="flex-1" onClick={() => onView?.(workout.id)}>
          View Details
        </Button>
        <Button className="flex-1" onClick={() => onSchedule?.(workout.id)}>
          <Calendar className="mr-2 h-4 w-4" />
          Schedule
        </Button>
      </CardFooter>
    </Card>
  );
}
```

**Workout Generation Form:**

```typescript
// components/workouts/WorkoutGenerationForm.tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';

const formSchema = z.object({
  focus: z.enum(['strength', 'cardio', 'hiit', 'flexibility', 'yoga']),
  duration: z.number().min(15).max(90),
  level: z.enum(['beginner', 'intermediate', 'advanced']),
  equipment: z.array(z.string()),
});

export function WorkoutGenerationForm({ onSubmit }: { onSubmit: (data: z.infer<typeof formSchema>) => void }) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      focus: 'strength',
      duration: 30,
      level: 'beginner',
      equipment: [],
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="focus"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Workout Focus</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select focus" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="strength">Strength Training</SelectItem>
                  <SelectItem value="cardio">Cardio</SelectItem>
                  <SelectItem value="hiit">HIIT</SelectItem>
                  <SelectItem value="flexibility">Flexibility</SelectItem>
                  <SelectItem value="yoga">Yoga</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Choose the primary focus of your workout
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="duration"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Duration: {field.value} minutes</FormLabel>
              <FormControl>
                <Slider
                  min={15}
                  max={90}
                  step={5}
                  value={[field.value]}
                  onValueChange={(vals) => field.onChange(vals[0])}
                />
              </FormControl>
              <FormDescription>
                How long do you want to workout?
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="level"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fitness Level</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full">
          Generate Workout
        </Button>
      </form>
    </Form>
  );
}
```

**Feature FAQ Section Component:**

```typescript
// components/landing/FeatureFAQSection.tsx
'use client';

import { useMemo } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import type { TierId } from '@/lib/pricing-tiers';

/**
 * Educational FAQ section showing all platform features organized by subscription tier.
 * Personalizes based on user's current subscription tier and status.
 *
 * Features:
 * - Single Accordion component with grid layout (2 columns desktop, 1 column mobile)
 * - Tier badges (Free/Basic/Pro/Elite) with color coding
 * - "Available" indicator for features user has access to
 * - Educational descriptions with "How to use" guidance
 * - Handles inactive paid subscriptions (treats as free tier)
 */
export function FeatureFAQSection({ user }: { user: User | null }) {
  const { tier, status, loading } = useSubscription();

  // Calculate effective tier: inactive paid subscriptions treated as free
  const effectiveTier: TierId = useMemo(() => {
    if (loading) return 'free';
    if (tier === 'free') return 'free';
    if (status === 'active') return tier;
    return 'free'; // Inactive paid tier
  }, [tier, status, loading]);

  // Features array with tier assignments
  const FEATURES = [
    // Free tier features
    { id: 'dashboard', title: 'Dashboard', tier: 'free', ... },
    { id: 'daily-checkin', title: 'Daily Check-In', tier: 'free', ... },
    // Basic tier features
    { id: 'monthly-workouts', title: 'Monthly Workouts', tier: 'basic', ... },
    { id: 'focus-areas', title: 'Trainer Focus Areas', tier: 'basic', ... },
    // Pro tier features
    { id: 'exercise-images', title: 'Exercise Images', tier: 'pro', ... },
    { id: 'workout-history', title: 'Workout History', tier: 'pro', ... },
    // Elite tier features
    { id: 'unlimited-workouts', title: 'Unlimited Workouts', tier: 'elite', ... },
    { id: 'coach-access', title: 'Coach Access', tier: 'elite', ... },
  ];

  return (
    <section className="py-16 sm:py-24 bg-muted/10">
      <div className="container mx-auto px-4">
        <h2>Feature Guide</h2>
        <Accordion type="single" collapsible className="grid grid-cols-1 lg:grid-cols-2 gap-x-8">
          {FEATURES.map((feature) => (
            <AccordionItem key={feature.id} value={feature.id}>
              <AccordionTrigger>
                <div className="flex items-center gap-3">
                  <Icon />
                  <span>{feature.title}</span>
                  {user && hasAccess(effectiveTier, feature.tier) && (
                    <span aria-label="Available">
                      <Check aria-hidden="true" />
                    </span>
                  )}
                  <Badge>{TIER_LABELS[feature.tier]}</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <p>{feature.description}</p>
                <div className="bg-muted/50 p-3 rounded-lg">
                  <strong>How to use:</strong> {feature.howToUse}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
```

**Key Implementation Details:**

- **Single Accordion:** Uses one Accordion component with grid layout for consistent expand/collapse behavior
- **Tier Personalization:** Checks both `tier` and `status` from `useSubscription()` hook
- **Accessibility:** Includes `aria-label` on "Available" indicator, `aria-hidden` on decorative icons
- **Responsive:** Two-column layout on desktop (`lg:grid-cols-2`), single column on mobile
- **Educational Focus:** Each feature includes description and "How to use" guidance

---

## Authentication & SSO

### Firebase Authentication Strategy

**Providers:**

- Email/Password (primary, via FirebaseUI)
- Google OAuth (social login, via FirebaseUI)
- Magic Links (optional, future enhancement)

**User Roles:**

- `member` (default)
- `coach` (can create programs for clients)
- `admin` (full access)

**Custom Claims:**

```typescript
{
  role: 'member' | 'coach' | 'admin',
  subscription_tier: 'free' | 'pro' | 'elite',
  subscription_status: 'active' | 'canceled' | 'past_due'
}
```

### Authentication Architecture

**Monorepo Auth (Primary):**

Since the principal apps (Hub, Trainer, Chef) are integrated into a single Next.js application, authentication is straightforward:

1. **User logs in** → Firebase Auth session established
2. **Session persists** → All routes share the same auth context
3. **Protected routes** → Middleware redirects unauthenticated users to `/login`

**Implementation Files:**

```
src/
├── lib/firebase.ts              # Firebase client initialization
├── lib/auth.ts                  # Auth utilities
├── components/auth/             # Auth components
│   ├── AuthProvider.tsx         # Auth context provider
│   ├── AuthForm.tsx             # Login/signup form
│   └── SignOutButton.tsx        # Sign out button
└── app/(auth)/login/page.tsx    # Login page
```

**SSO for Expansion Apps (Future):**

For future expansion apps that may be deployed separately, SSO token-based authentication will be used:

- SSO tokens stored in Firestore `sso_tokens` collection
- Tokens are single-use with 5-minute expiration
- Origin validation for allowed domains
- Rate limiting on token generation

### Protected Routes

**Next.js Middleware (`middleware.ts`):**

```typescript
export async function middleware(request: NextRequest) {
  const session = await getServerSession();

  if (!session && request.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/workouts/:path*", "/nutrition/:path*"],
};
```

---

## Database Schema (Firestore)

The database schema is organized into phases for progressive implementation:

- **Phase 1:** Core profile data (fitness level, injuries, equipment)
- **Phase 2:** Enhanced profile data (preferences, experience, metrics)
- **Phase 3:** Real-time context data (daily state)

For complete schema documentation, see: `docs/setup/FIRESTORE_SCHEMA_PHASES_1_3.md`

### Core Collections

**`users`** (1-to-1 with Firebase Auth)

```typescript
{
  id: string; // Firebase Auth UID (document ID)
  email: string;
  email_verified: boolean;
  role: "member" | "coach" | "admin";
  subscription_tier: "free" | "pro" | "elite";
  subscription_status: "active" | "canceled" | "past_due" | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  is_active: boolean;
  disabled_reason: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
  last_sign_in_at: Timestamp | null;
}
```

**`user_profiles`** (Phase 1 + Phase 2 data)

```typescript
{
  id: string;                    // Firebase Auth UID (document ID)
  user_id: string;

  // Phase 1: Core Data (Required)
  first_name: string;
  last_name: string;
  display_name: string;
  age: number;
  gender: 'male' | 'female' | 'non_binary' | 'prefer_not_to_say';
  weight: number;
  height: number;
  preferred_units: {
    weight: 'lb' | 'kg';
    height: 'in' | 'cm';
    distance: 'mi' | 'km';
    temperature: 'f' | 'c';
  };
  fitness_level: 'beginner' | 'intermediate' | 'advanced' | 'athlete';
  current_activity_level: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extremely_active';
  fitness_goals: string[];
  injuries: string[];
  injury_details: string | null;
  medical_conditions: string[];
  medical_notes: string | null;
  equipment_access: 'none' | 'minimal' | 'home' | 'full_gym';
  available_equipment: string[];

  // Phase 2: Enhanced Data (Optional)
  preferred_workout_duration: number | null;
  workout_frequency_per_week: number | null;
  preferred_workout_times: string[] | null;
  training_experience_years: number | null;
  favorite_exercises: string[] | null;
  disliked_exercises: string[] | null;
  current_bench_press_max: number | null;
  current_squat_max: number | null;
  current_deadlift_max: number | null;
  // ... additional Phase 2 fields

  // Metadata
  onboarding_completed: boolean;
  onboarding_completed_at: Timestamp | null;
  profile_completeness: number;
  created_at: Timestamp;
  updated_at: Timestamp;
  last_workout_generated_at: Timestamp | null;
}
```

**`user_daily_state`** (Phase 3: Real-time context)

```typescript
{
  id: string;                    // `${user_id}_${YYYY-MM-DD}`
  user_id: string;
  date: string;                  // YYYY-MM-DD

  // Daily Metrics (1-10 scale)
  energy_level: number;
  sleep_quality: number;
  sleep_hours: number | null;
  stress_level: number;
  motivation_level: number;

  // Soreness Assessment
  soreness_areas: Array<{ area: string; level: number }>;
  overall_soreness: number;      // Computed average

  // Context
  current_location: 'home' | 'gym' | 'outdoor' | 'hotel' | 'office' | 'other';
  available_time: number | null; // Minutes
  time_of_day: 'early_morning' | 'morning' | 'afternoon' | 'evening' | 'night';
  weather_condition: string | null;
  temperature: number | null;

  // Women's Health (optional)
  cycle_phase: 'menstrual' | 'follicular' | 'ovulation' | 'luteal' | null;
  cycle_symptoms: string[] | null;

  // Activity Context
  days_since_last_workout: number | null;
  workouts_this_week: number;
  consecutive_workout_days: number;

  // Metadata
  data_source: 'manual' | 'wearable' | 'hybrid';
  wearable_connection_id: string | null;
  workout_id: string | null;
  workout_generated_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
  saved_at_datetime: string;     // ISO 8601 datetime
}
```

**`trainer_workouts`** (Generated workouts with context)

```typescript
{
  id: string;
  user_id: string;
  title: string;
  focus: string;
  duration_minutes: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  exercises: Array<{
    name: string;
    sets: number;
    reps: string;
    rest_seconds: number;
    duration_seconds?: number;
    weight_kg?: number;
    notes: string | null;
    equipment_needed: string[];
    muscle_groups: string[];
  }>;

  // Generation Context (Phase 3: snapshots state at generation time)
  generation_context: {
    profile_snapshot: {
      fitness_level: string;
      injuries: string[];
      equipment_access: string;
    };
    daily_state_snapshot: {
      energy_level: number;
      sleep_quality: number;
      stress_level: number;
      soreness_areas: Array<{ area: string; level: number }>;
    } | null;
    used_profile_data: boolean;
    used_daily_state: boolean;
    equipment_override: boolean;
  };

  // AI Metadata
  generated_by: 'genkit' | 'openai' | 'anthropic';
  genkit_trace_id: string | null;
  ai_model: string | null;
  generation_tokens: number | null;
  generation_cost_usd: number | null;

  // Workout Status
  completed: boolean;
  completed_at: Timestamp | null;
  scheduled_for: Timestamp | null;

  // User Feedback
  difficulty_rating: number | null;
  enjoyment_rating: number | null;
  completion_percentage: number | null;
  user_notes: string | null;

  created_at: Timestamp;
  updated_at: Timestamp;
}
```

**Reference Collections:**

- `workout_focuses` - Available workout types (strength, cardio, HIIT, etc.)
- `equipment_items` - Equipment catalog with categories
- `sso_tokens` - SSO tokens for expansion apps (future)
- `subscription_plans` - Stripe subscription tiers
- `calendar_entries` - Scheduled workouts/meals

### Security Rules

**Firestore Rules Pattern:**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return request.auth.uid == userId;
    }

    function hasRole(role) {
      return request.auth.token.role == role;
    }

    // Users collection
    match /users/{userId} {
      allow read: if isAuthenticated() && isOwner(userId);
      allow write: if isAuthenticated() && isOwner(userId);
    }

    // Profiles collection
    match /profiles/{profileId} {
      allow read: if isAuthenticated() && isOwner(resource.data.user_id);
      allow create: if isAuthenticated() && isOwner(request.resource.data.user_id);
      allow update: if isAuthenticated() && isOwner(resource.data.user_id);
    }

    // SSO tokens (special handling)
    match /sso_tokens/{tokenId} {
      allow read: if isAuthenticated() && isOwner(resource.data.user_id);
      allow create: if isAuthenticated() && isOwner(request.resource.data.user_id);
      allow delete: if isAuthenticated(); // Anyone can delete (for token cleanup)
    }

    // Workouts
    match /trainer_workouts/{workoutId} {
      allow read, write: if isAuthenticated() && isOwner(resource.data.user_id);
    }

    // Recipes
    match /chef_recipes/{recipeId} {
      allow read, write: if isAuthenticated() && isOwner(resource.data.user_id);
    }

    // Calendar entries
    match /calendar_entries/{entryId} {
      allow read, write: if isAuthenticated() && isOwner(resource.data.user_id);
    }

    // Subscription plans (public read, admin write)
    match /subscription_plans/{planId} {
      allow read: if isAuthenticated();
      allow write: if hasRole('admin');
    }
  }
}
```

### Composite Indexes

**Required indexes** (defined in `firestore.indexes.json`):

```json
{
  "indexes": [
    {
      "collectionGroup": "trainer_workouts",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "user_id", "order": "ASCENDING" },
        { "fieldPath": "created_at", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "chef_recipes",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "user_id", "order": "ASCENDING" },
        { "fieldPath": "created_at", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "calendar_entries",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "user_id", "order": "ASCENDING" },
        { "fieldPath": "scheduled_date", "order": "ASCENDING" },
        { "fieldPath": "scheduled_time", "order": "ASCENDING" }
      ]
    }
  ]
}
```

---

## AI Integration (Firebase Genkit)

### Setup & Configuration

**Installation:**

```bash
npm install genkit @genkit-ai/core @genkit-ai/googleai @genkit-ai/dotprompt zod
```

**Initialization (`lib/genkit.ts`):**

```typescript
import { genkit } from "genkit";
import { googleAI } from "@genkit-ai/googleai";

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_AI_API_KEY,
    }),
  ],
  model: "googleai/gemini-2.0-flash-exp", // Fast, cost-effective
});
```

### Workout Generation Flow

**Dotprompt (`prompts/workout-generator.prompt`):**

```
---
model: googleai/gemini-2.0-flash-exp
input:
  schema:
    focus: string
    duration: number
    level: string
    equipment: string[]
output:
  schema:
    title: string
    exercises: array
      items:
        name: string
        sets: number
        reps: string
        rest_seconds: number
        notes?: string
---

You are an expert personal trainer. Generate a {{focus}} workout that is {{duration}} minutes long for a {{level}} fitness level.

Available equipment: {{#each equipment}}{{this}}, {{/each}}

Requirements:
- Include warm-up (5 min)
- Main workout ({{duration - 10}} min)
- Cool-down (5 min)
- Progressive difficulty
- Clear form cues

Return a structured workout plan.
```

**Implementation (`lib/genkit-flows/generate-workout.ts`):**

```typescript
import { ai } from "@/lib/genkit";
import { z } from "zod";

const WorkoutSchema = z.object({
  title: z.string(),
  exercises: z.array(
    z.object({
      name: z.string(),
      sets: z.number(),
      reps: z.string(),
      rest_seconds: z.number(),
      notes: z.string().optional(),
    })
  ),
});

export const generateWorkout = ai.defineFlow(
  {
    name: "generateWorkout",
    inputSchema: z.object({
      focus: z.enum(["strength", "cardio", "hiit", "flexibility", "yoga"]),
      duration: z.number().min(15).max(90),
      level: z.enum(["beginner", "intermediate", "advanced"]),
      equipment: z.array(z.string()),
    }),
    outputSchema: WorkoutSchema,
  },
  async (input) => {
    const prompt = ai.prompt("workout-generator");
    const result = await prompt(input);

    return result.output;
  }
);
```

**API Route (`app/api/workouts/generate/route.ts`):**

```typescript
import { generateWorkout } from "@/lib/genkit-flows/generate-workout";
import { auth, db } from "@/lib/firebase-admin";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    // Verify Firebase Auth token
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Parse request body
    const body = await req.json();

    // Generate workout using Genkit
    const workout = await generateWorkout(body);

    // Save to Firestore
    const workoutRef = db.collection("trainer_workouts").doc();
    await workoutRef.set({
      id: workoutRef.id,
      user_id: userId,
      ...workout,
      focus: body.focus,
      duration_minutes: body.duration,
      difficulty: body.level,
      generated_by: "genkit",
      genkit_trace_id: req.headers.get("x-genkit-trace-id"),
      completed: false,
      created_at: new Date(),
    });

    return NextResponse.json({ id: workoutRef.id, ...workout });
  } catch (error) {
    console.error("Workout generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate workout" },
      { status: 500 }
    );
  }
}
```

### Recipe Generation Flow

**Similar pattern to workouts:**

- Dotprompt: `prompts/recipe-generator.prompt`
- Flow: `lib/genkit-flows/generate-recipe.ts`
- API Route: `app/api/recipes/generate/route.ts`
- Output schema validates nutrition data, ingredients, instructions

### Cost Management

**Rate Limiting (per user):**

```typescript
// lib/rate-limiter.ts
import { db } from "./firebase-admin";

export async function checkRateLimit(
  userId: string,
  action: "workout" | "recipe",
  tier: "free" | "pro" | "elite"
): Promise<boolean> {
  const limits = {
    free: { workout: 5, recipe: 5 }, // per month
    pro: { workout: 50, recipe: 50 },
    elite: { workout: null, recipe: null }, // unlimited
  };

  const limit = limits[tier][action];
  if (limit === null) return true; // Unlimited

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const collection = action === "workout" ? "trainer_workouts" : "chef_recipes";
  const snapshot = await db
    .collection(collection)
    .where("user_id", "==", userId)
    .where("created_at", ">=", startOfMonth)
    .count()
    .get();

  return snapshot.data().count < limit;
}
```

**Response Caching:**

```typescript
// Cache similar requests for 24 hours
const cacheKey = `${focus}-${duration}-${level}`;
const cached = await db.collection("workout_cache").doc(cacheKey).get();

if (cached.exists && Date.now() - cached.data().timestamp < 86400000) {
  return cached.data().workout;
}
```

**Token Usage Tracking:**

```typescript
// Firebase Analytics custom event
import { logEvent } from "firebase/analytics";

logEvent(analytics, "genkit_generation", {
  type: "workout",
  model: "gemini-2.0-flash-exp",
  tokens_estimated: 500, // Approximate
  user_tier: "pro",
});
```

---

## Payment System (Stripe)

### Subscription Plans

| Plan  | Price  | Workouts/Month | Recipes/Month | Calendar | Coach Access |
| ----- | ------ | -------------- | ------------- | -------- | ------------ |
| Free  | $0     | 5              | 5             | ❌       | ❌           |
| Pro   | $19/mo | 50             | 50            | ✅       | ❌           |
| Elite | $49/mo | Unlimited      | Unlimited     | ✅       | ✅           |

### Integration Architecture

**Stripe Setup:**

```bash
npm install stripe @stripe/stripe-js
```

**Server-side (`lib/stripe.ts`):**

```typescript
import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
});
```

**Client-side (`lib/stripe-client.ts`):**

```typescript
import { loadStripe } from "@stripe/stripe-js";

export const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);
```

### Checkout Flow

**1. Create Checkout Session API Route (`app/api/create-checkout-session/route.ts`):**

```typescript
import { stripe } from "@/lib/stripe";
import { auth, db } from "@/lib/firebase-admin";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    const decodedToken = await auth.verifyIdToken(token!);
    const userId = decodedToken.uid;

    const { priceId } = await req.json();

    // Get or create Stripe customer
    const userDoc = await db.collection("users").doc(userId).get();
    let customerId = userDoc.data()?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: decodedToken.email,
        metadata: { firebaseUID: userId },
      });
      customerId = customer.id;

      await db.collection("users").doc(userId).update({
        stripe_customer_id: customerId,
      });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
      metadata: { firebaseUID: userId },
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    console.error("Checkout session error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
```

**2. Client-side Redirect with shadcn/ui:**

```typescript
// components/pricing/PricingCard.tsx
'use client';

import { stripePromise } from '@/lib/stripe-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';

interface PricingCardProps {
  name: string;
  price: number;
  priceId: string;
  features: string[];
  popular?: boolean;
}

export function PricingCard({ name, price, priceId, features, popular }: PricingCardProps) {
  const handleSubscribe = async () => {
    const token = await auth.currentUser?.getIdToken();

    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ priceId }),
    });

    const { sessionId } = await response.json();
    const stripe = await stripePromise;
    await stripe?.redirectToCheckout({ sessionId });
  };

  return (
    <Card className={popular ? 'border-primary shadow-lg' : ''}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl">{name}</CardTitle>
          {popular && <Badge>Most Popular</Badge>}
        </div>
        <CardDescription>
          <span className="text-3xl font-bold">${price}</span>
          {price > 0 && <span className="text-muted-foreground">/month</span>}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2">
          {features.map((feature, i) => (
            <li key={i} className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          variant={popular ? 'default' : 'outline'}
          onClick={handleSubscribe}
        >
          {price === 0 ? 'Get Started' : 'Subscribe'}
        </Button>
      </CardFooter>
    </Card>
  );
}
```

### Webhook Handling

**Webhook Route (`app/api/webhooks/stripe/route.ts`):**

```typescript
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/firebase-admin";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Handle events
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.firebaseUID;

      if (userId && session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );

        await updateUserSubscription(userId, subscription);
      }
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.firebaseUID;

      if (userId) {
        await updateUserSubscription(userId, subscription);
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const userId = invoice.subscription_details?.metadata?.firebaseUID;

      if (userId) {
        await db.collection("users").doc(userId).update({
          subscription_status: "past_due",
        });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}

async function updateUserSubscription(
  userId: string,
  subscription: Stripe.Subscription
) {
  const priceId = subscription.items.data[0]?.price.id;

  // Map Stripe price ID to tier
  const tierMap: Record<string, "free" | "pro" | "elite"> = {
    [process.env.STRIPE_PRO_PRICE_ID!]: "pro",
    [process.env.STRIPE_ELITE_PRICE_ID!]: "elite",
  };

  const tier = tierMap[priceId] || "free";
  const status = subscription.status === "active" ? "active" : "canceled";

  await db.collection("users").doc(userId).update({
    subscription_tier: tier,
    subscription_status: status,
    stripe_subscription_id: subscription.id,
  });

  // Update custom claims for real-time access control
  const { auth } = await import("@/lib/firebase-admin");
  await auth.setCustomUserClaims(userId, {
    subscription_tier: tier,
    subscription_status: status,
  });
}
```

**Webhook Secret Setup:**

1. Get secret from Stripe Dashboard → Developers → Webhooks
2. Add to `.env.local`: `STRIPE_WEBHOOK_SECRET=whsec_...`
3. Configure webhook URL: `https://yourdomain.com/api/webhooks/stripe`
4. Subscribe to events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`

---

## Monitoring & Observability

### Error Tracking: **Sentry**

**Why Sentry:**

- Industry standard for React/Next.js
- Excellent source map support
- Release tracking
- User context integration
- Performance monitoring included
- Free tier sufficient for MVP

**Setup:**

```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

**Configuration (`sentry.client.config.ts`):**

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Sample rate for production
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Capture user context
  beforeSend(event, hint) {
    if (event.user) {
      // Remove PII
      delete event.user.email;
      delete event.user.ip_address;
    }
    return event;
  },

  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
});
```

**Usage:**

```typescript
// Automatic error capture (React Error Boundaries)
// Manual capture:
try {
  await generateWorkout(input);
} catch (error) {
  Sentry.captureException(error, {
    tags: { feature: "workout_generation" },
    user: { id: userId },
  });
  throw error;
}
```

### Performance Monitoring: **Firebase Performance + Vercel Analytics**

**Firebase Performance (Client-side):**

```typescript
// lib/firebase.ts
import { getPerformance } from "firebase/performance";

export const perf = getPerformance(app);

// Automatic: Page loads, network requests
// Custom traces:
import { trace } from "firebase/performance";

const generateTrace = trace(perf, "workout_generation");
generateTrace.start();
try {
  await generateWorkout(input);
} finally {
  generateTrace.stop();
}
```

**Vercel Analytics (Server-side):**

```bash
npm install @vercel/analytics @vercel/speed-insights
```

```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

### User Analytics: **PostHog**

**Why PostHog over Google Analytics:**

- Open-source (self-hostable for privacy)
- Product analytics focused (funnels, cohorts, session replay)
- Feature flags built-in
- Better privacy compliance (GDPR-friendly)
- Free tier: 1M events/month

**Setup:**

```bash
npm install posthog-js
```

**Configuration (`lib/posthog.ts`):**

```typescript
import posthog from "posthog-js";

if (typeof window !== "undefined") {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: "https://app.posthog.com",
    loaded: (posthog) => {
      if (process.env.NODE_ENV === "development") posthog.debug();
    },
  });
}

export { posthog };
```

**Track Events:**

```typescript
import { posthog } from "@/lib/posthog";

// Track workout generation
posthog.capture("workout_generated", {
  focus: "strength",
  duration: 30,
  tier: "pro",
});

// Identify user
posthog.identify(userId, {
  email: user.email,
  tier: "pro",
});
```

### Firebase Console Logging Strategy

**Structured Logging Pattern:**

```typescript
// lib/logger.ts
export const logger = {
  info: (message: string, data?: Record<string, unknown>) => {
    console.log(
      JSON.stringify({
        level: "info",
        message,
        timestamp: new Date().toISOString(),
        ...data,
      })
    );
  },

  error: (message: string, error: Error, data?: Record<string, unknown>) => {
    console.error(
      JSON.stringify({
        level: "error",
        message,
        error: {
          message: error.message,
          stack: error.stack,
        },
        timestamp: new Date().toISOString(),
        ...data,
      })
    );
  },
};

// Usage
logger.info("Workout generated", { userId, workoutId });
logger.error("Genkit generation failed", error, { userId, input });
```

**Cloud Functions Logging:**

```typescript
import { logger } from "firebase-functions/v2";

export const onUserCreate = onDocumentCreated(
  "users/{userId}",
  async (event) => {
    logger.info("User created", { userId: event.params.userId });

    try {
      // Create profile
    } catch (error) {
      logger.error("Profile creation failed", error as Error, {
        userId: event.params.userId,
      });
      throw error;
    }
  }
);
```

---

## Development Workflow

### Local Development Setup

**1. Clone the repository:**

```bash
git clone https://github.com/yourusername/ai-workout-generator-hub.git
cd ai-workout-generator-hub
```

**2. Install dependencies:**

```bash
npm install
```

**3. Set up Firebase Emulator Suite:**

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize emulators
firebase init emulators
# Select: Authentication, Firestore, Functions, Storage
```

**4. Configure environment variables:**

Create `.env.local`:

```bash
# Firebase Config
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-ABC123

# Firebase Admin (server-side)
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'

# Stripe
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_pro
STRIPE_ELITE_PRICE_ID=price_elite

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# AI
GOOGLE_AI_API_KEY=your_gemini_api_key

# Monitoring
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
NEXT_PUBLIC_POSTHOG_KEY=phc_...
```

**5. Start Firebase Emulators (Terminal 1):**

```bash
firebase emulators:start
# Runs on http://localhost:4000 (Emulator UI)
```

**6. Start the development server (Terminal 2):**

```bash
npm run dev
# Runs on http://localhost:3000
```

**7. Seed test data:**

```bash
npm run seed:local
```

### Testing Strategy

**Unit Tests (Vitest):**

```typescript
// lib/__tests__/genkit-flows.test.ts
import { describe, it, expect } from "vitest";
import { generateWorkout } from "@/lib/genkit-flows/generate-workout";

describe("generateWorkout", () => {
  it("should generate a valid workout structure", async () => {
    const input = {
      focus: "strength",
      duration: 30,
      level: "beginner",
      equipment: ["dumbbells", "bench"],
    };

    const result = await generateWorkout(input);

    expect(result).toHaveProperty("title");
    expect(result.exercises).toBeInstanceOf(Array);
    expect(result.exercises.length).toBeGreaterThan(0);
  });
});
```

**Integration Tests (Firebase Emulator):**

```typescript
// __tests__/api/workouts.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";

describe("Workout API", () => {
  beforeAll(async () => {
    await initializeTestEnvironment({
      projectId: "test-project",
      firestore: { host: "localhost", port: 8080 },
    });
  });

  it("should save generated workout to Firestore", async () => {
    const response = await fetch(
      "http://localhost:3000/api/workouts/generate",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${testToken}`,
        },
        body: JSON.stringify({
          focus: "strength",
          duration: 30,
          level: "beginner",
          equipment: [],
        }),
      }
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty("id");
  });
});
```

**E2E Tests (Playwright):**

```typescript
// e2e/workout-generation.spec.ts
import { test, expect } from "@playwright/test";

test("user can generate a workout", async ({ page }) => {
  // Login
  await page.goto("http://localhost:3000/login");
  await page.fill('[name="email"]', "test@example.com");
  await page.fill('[name="password"]', "password123");
  await page.click('button[type="submit"]');

  // Navigate to Trainer
  await page.goto("http://localhost:3000/dashboard/trainer");

  // Fill workout form
  await page.selectOption('[name="focus"]', "strength");
  await page.fill('[name="duration"]', "30");
  await page.click('button:has-text("Generate Workout")');

  // Wait for generation
  await page.waitForSelector("text=Workout generated successfully");

  // Verify workout appears
  await expect(page.locator(".workout-card")).toBeVisible();
});
```

**Run Tests:**

```bash
# Unit tests
npm run test

# Integration tests (requires emulator)
npm run test:integration

# E2E tests
npm run test:e2e

# Coverage
npm run test:coverage
```

---

## CI/CD Pipeline

### GitHub Actions Workflow

**Security Best Practices:**

- ⚠️ **CRITICAL**: All third-party actions MUST be pinned to specific commit SHAs (not version tags) to prevent supply chain attacks
- Mutable version tags (e.g., `@v3`, `@v25`) can be updated by attackers if the repository is compromised
- To find commit SHAs: Go to the action's GitHub repository → Releases → Click on the release → Copy the commit SHA from the release
- Update actions intentionally after reviewing changes and testing in a non-production environment
- Consider using official alternatives when available (e.g., Vercel's official GitHub integration instead of third-party actions)

**`.github/workflows/ci.yml`:**

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npm run type-check

      - name: Run tests
        run: npm run test:coverage

      - name: Upload coverage
        # SECURITY: Pinned to commit SHA for supply chain security
        # To find the commit SHA: https://github.com/codecov/codecov-action/releases
        # Click on the latest release and copy the commit SHA from the release page
        # Example: uses: codecov/codecov-action@<commit-sha-here>
        # Recommended: Use v5+ (v5.4.3 or later) - replace <commit-sha> with actual SHA
        uses: codecov/codecov-action@<commit-sha>
        with:
          files: ./coverage/coverage-final.json

  build:
    runs-on: ubuntu-latest
    needs: test

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          NEXT_PUBLIC_FIREBASE_API_KEY: ${{ secrets.FIREBASE_API_KEY }}
          NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${{ secrets.FIREBASE_PROJECT_ID }}
          # (other env vars from secrets)

  deploy:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Vercel
        # SECURITY: Pinned to commit SHA for supply chain security
        # To find the commit SHA: https://github.com/amondnet/vercel-action/releases
        # Click on the latest release and copy the commit SHA from the release page
        # Example: uses: amondnet/vercel-action@<commit-sha-here>
        # ALTERNATIVE (Recommended): Use Vercel's official GitHub integration instead:
        #   - Enable in Vercel Dashboard → Settings → Git → GitHub
        #   - This eliminates the need for third-party actions entirely
        uses: amondnet/vercel-action@<commit-sha>
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: "--prod"
```

### Deployment Strategy

**Vercel (Recommended for Next.js):**

```bash
# Install Vercel CLI
npm install -g vercel

# Link project
vercel link

# Deploy to preview (automatic on PR)
vercel

# Deploy to production
vercel --prod
```

**Vercel Project Settings:**

- **Framework:** Next.js
- **Build Command:** `npm run build`
- **Output Directory:** `.next`
- **Environment Variables:** Set all `NEXT_PUBLIC_*` and server-side secrets in Vercel dashboard

**Firebase Hosting (Alternative):**

```bash
# Build Next.js app
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting

# Deploy Functions
firebase deploy --only functions
```

**Monorepo Deployment:**

Since all features are in a single Next.js application:

- **Production:** `app.yourdomain.com` (single Vercel project)
- **Staging:** `staging.yourdomain.com` (preview deployments)

**Future Expansion Apps:**

If expansion apps are added as separate deployments, update SSO allowed origins:

```typescript
// lib/sso-config.ts
export const ALLOWED_ORIGINS = [
  "https://app.yourdomain.com",
  "https://marketplace.yourdomain.com", // Future expansion app
];
```

---

## Security Checklist

### Pre-Deployment Requirements

**Firebase Security:**

- [ ] Firestore security rules deployed and tested
- [ ] Storage security rules configured
- [ ] Authentication methods restricted (disable Anonymous if not used)
- [ ] Custom claims set for role-based access
- [ ] Admin SDK service account key stored securely (environment variable, not committed)

**Environment Variables:**

- [ ] All secrets in environment variables (no hardcoded values)
- [ ] `.env*` files in `.gitignore` (except `.env.example`)
- [ ] Production secrets different from development
- [ ] Stripe webhook secret configured
- [ ] Google AI API key restricted to Firebase project domain

**API Routes:**

- [ ] All routes validate Firebase Auth token
- [ ] Rate limiting implemented on expensive endpoints
- [ ] Input validation with Zod schemas
- [ ] CORS configured (only allow app domains)
- [ ] Error messages don't leak sensitive info

**Client-Side:**

- [ ] No API keys in client code (use `NEXT_PUBLIC_*` only for Firebase client SDK)
- [ ] Sensitive operations server-side only
- [ ] XSS protection (sanitize user input)
- [ ] CSP headers configured in `next.config.js`

**SSO Security:**

- [ ] Token expiration enforced (5 minutes)
- [ ] One-time use tokens (deleted after exchange)
- [ ] Origin validation on postMessage
- [ ] HTTPS-only in production
- [ ] Rate limiting on token generation

---

## Milestones & Roadmap

### MVP (v1.0) - Phases 1-3 ✅ COMPLETE

**Goal:** Core functionality for single users with adaptive workout generation

**Authentication & Profile (Phase 1):**

- [x] Landing page with pricing (shadcn/ui components)
- [x] Feature FAQ Section with tier-based feature explanations (Accordion component)
- [x] User authentication (Firebase Auth + custom UI)
- [x] User onboarding wizard (8-step flow)
- [x] Core profile data (fitness level, injuries, equipment)
- [x] Profile management page

**Enhanced Profile (Phase 2):**

- [x] Extended profile fields (preferences, experience, metrics)
- [x] Equipment selector component
- [x] Profile completeness tracking
- [x] Validation and normalization

**Daily State & Context (Phase 3):**

- [x] Daily check-in page and form
- [x] Real-time context capture (energy, sleep, stress, soreness)
- [x] DailyStateService with get/upsert methods
- [x] useUserDailyState hook

**Trainer Features:**

- [x] Workout generation page (`/generate`)
- [x] Workout display with exercises
- [x] Workout history page (`/workouts`)
- [x] TrainerService for workout operations
- [x] Generation context with profile/daily state snapshots

**Backend:**

- [x] Firestore schema deployed (Phases 1-3)
- [x] Security rules configured
- [x] Reference data seeded (workout_focuses, equipment_items)

**DevOps:**

- [x] Monorepo architecture established
- [x] CI/CD pipeline (GitHub Actions)
- [x] Firebase Emulator Suite configured

---

### v1.1 - In Progress

**Goal:** AI Integration & Enhanced UX

**AI Integration:**

- [ ] Genkit flows for workout generation
- [ ] Prompt templates with profile/daily state context
- [ ] Token usage tracking
- [ ] Response caching for similar requests
- [ ] Rate limiting on AI endpoints

**Stripe Integration:**

- [ ] Stripe checkout flow
- [ ] Subscription management
- [ ] Webhook handling
- [ ] Tier-based feature gating

**UX Improvements:**

- [ ] Workout completion flow with feedback
- [ ] Progress tracking dashboard
- [ ] Dark mode toggle (theme system ready)
- [ ] Loading states and skeleton screens
- [ ] Mobile-responsive design polish

---

### v2.0 - Future

**Goal:** Chef Integration & Programs

**Chef Features:**

- [ ] Recipe generation with Genkit
- [ ] Meal planning interface
- [ ] Nutrition goals tracking
- [ ] Grocery list generation
- [ ] Dietary restriction support

**Workout Programs:**

- [ ] Multi-week program templates
- [ ] Progressive overload tracking
- [ ] Calendar scheduling with drag-and-drop
- [ ] Workout history analytics

**Backend:**

- [ ] Program templates collection
- [ ] Automated email notifications
- [ ] Advanced analytics (retention, churn, LTV)

---

### v3.0 - Future

**Goal:** Coach Features & Community (may use expansion app architecture)

**Coach Features:**

- [ ] Coach dashboard (client list, program management)
- [ ] Coach can assign programs to clients
- [ ] Client progress visibility
- [ ] In-app messaging

**Community Features:**

- [ ] Social feed (share workouts, recipes, progress)
- [ ] Challenges (30-day workout challenge)
- [ ] Leaderboards (workouts completed, streaks)

**Integrations:**

- [ ] Wearable integration (Apple Health, Fitbit)
- [ ] Video exercise library
- [ ] Progress photos with privacy controls

---

## Success Metrics

### Key Performance Indicators (KPIs)

**User Acquisition:**

- [ ] 100 signups (Month 1)
- [ ] 500 signups (Month 3)
- [ ] 1,000 signups (Month 6)

**Engagement:**

- [ ] 50% of users generate at least 1 workout/recipe per week
- [ ] 30% of users schedule workouts on calendar
- [ ] 20% weekly active users (WAU)

**Revenue:**

- [ ] 10% conversion to paid (Free → Pro/Elite)
- [ ] $2,000 MRR (Month 3)
- [ ] $10,000 MRR (Month 6)

**Retention:**

- [ ] 60% Day 7 retention
- [ ] 40% Day 30 retention
- [ ] <5% monthly churn (paid users)

**Technical:**

- [ ] <2% error rate (Sentry)
- [ ] <3s page load time (Vercel Analytics)
- [ ] 99.9% uptime (Firebase Status)

---

## Appendix

### Useful Commands

```bash
# Development
npm run dev              # Start dev server (Port 3000)
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Lint code
npm run format           # Format with Prettier
npm run type-check       # TypeScript type checking

# Testing
npm run test             # Run unit tests (Vitest)
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate coverage report
npm run test:e2e         # Run E2E tests (Playwright)

# Firebase
firebase emulators:start # Start Firebase Emulators (Port 4000 UI)
firebase deploy          # Deploy all Firebase resources
firebase deploy --only hosting  # Deploy hosting only
firebase deploy --only functions # Deploy functions only
firebase deploy --only firestore:rules # Deploy Firestore rules

# Database
npm run seed:local       # Seed local Firestore (emulator)
npm run seed:production  # Seed production Firestore (use carefully!)

# shadcn/ui
npx shadcn@latest add [component]  # Add new component
npx shadcn@latest diff             # Check for component updates

# Project Routes
# /                      # Landing page
# /login                 # Authentication
# /onboarding            # User onboarding wizard
# /dashboard             # User dashboard
# /profile               # Profile management
# /daily-checkin         # Daily state capture (Phase 3)
# /generate              # Workout generation (Trainer)
# /workouts              # Workout history (Trainer)
```

### Environment Variables Reference

**Client-Side (Safe to expose):**

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SENTRY_DSN`
- `NEXT_PUBLIC_POSTHOG_KEY`

**Server-Side (NEVER expose to client):**

- `FIREBASE_SERVICE_ACCOUNT_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRO_PRICE_ID`
- `STRIPE_ELITE_PRICE_ID`
- `GOOGLE_AI_API_KEY`
- `SENTRY_AUTH_TOKEN` (for source maps)

### Firestore Schema Quick Reference

```
users/{userId}
  - email, role, subscription_tier, subscription_status

user_profiles/{userId}
  - Phase 1: first_name, last_name, age, gender, weight, height
  - Phase 1: fitness_level, activity_level, fitness_goals
  - Phase 1: injuries, medical_conditions, equipment_access
  - Phase 2: preferences, experience, metrics (nullable)
  - Metadata: onboarding_completed, profile_completeness

user_daily_state/{userId}_{YYYY-MM-DD}
  - Phase 3: energy_level, sleep_quality, stress_level, motivation_level
  - Phase 3: soreness_areas[], overall_soreness
  - Phase 3: current_location, available_time, time_of_day
  - Metadata: data_source, workout_id, saved_at_datetime

trainer_workouts/{workoutId}
  - user_id, title, focus, duration_minutes, difficulty
  - exercises[] with equipment_needed, muscle_groups
  - generation_context: profile_snapshot, daily_state_snapshot
  - AI metadata: generated_by, ai_model, generation_tokens
  - Feedback: difficulty_rating, enjoyment_rating

workout_focuses/{focusId}
  - name, description, icon, color, typical_duration[]

equipment_items/{itemId}
  - name, category, requires_gym, typical_for_home

subscription_plans/{planId}
  - name, stripe_price_id, price_monthly, features{}
```

---

**Blueprint Version:** 3.1  
**Last Updated:** January 4, 2026  
**Author:** Justin Fassio  
**Status:** Phase 3 Complete - Monorepo Architecture

**Changelog:**

- v3.1 (2026-01-04): Added Feature FAQ Section to landing page with tier-based feature explanations and personalization
- v3.0 (2025-12-31): Updated to reflect monorepo architecture decision, Phase 1-3 completion
- v2.0 (2025-12-27): Initial multi-app architecture blueprint
