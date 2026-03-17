# PostHog Analytics Integration

This document describes the PostHog analytics integration setup and usage.

## Setup

PostHog is integrated using Next.js 15.3+ client-side initialization via `instrumentation-client.ts`. This is the official lightweight approach for client-side analytics initialization in Next.js 15.3+ (compatible with Next.js 16.0.8 used in this project).

**Key points:**

- Uses `instrumentation-client.ts` (client-side only, different from server-side `instrumentation.ts`)
- No `experimental.instrumentationHook` configuration required in `next.config.ts`
- Automatically initializes PostHog once on the client when the app loads
- Makes PostHog available throughout the application via imports

### Files Created

1. **`src/instrumentation-client.ts`** - Client-side initialization file
   - Next.js 15.3+ feature for client-side initialization
   - Automatically loaded by Next.js on the client side
   - No additional Next.js configuration needed
2. **`src/lib/posthog.ts`** - Client-side utility functions
3. **`src/lib/posthog-server.ts`** - Server-side utility functions for API routes

### Environment Variables

The following environment variables are required:

```env
NEXT_PUBLIC_POSTHOG_KEY=phc_YOUR_KEY_HERE
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

**Important:**

- Add these to your `.env.local` file for local development
- Add these to your hosting provider (Vercel, Firebase, etc.) environment variables for production
- Get your PostHog API key from your [PostHog project settings](https://posthog.com/project/settings)
- **Host selection**: Use the ingestion host (not the web UI at `app.posthog.com`)
  - **US Cloud**: `https://us.i.posthog.com` (default)
  - **EU Cloud**: `https://eu.i.posthog.com` (if your project is in EU region)

## Usage

### Client-Side Usage

PostHog is automatically initialized when the app loads. You can capture events from any client component:

```tsx
"use client";

import { captureEvent } from "@/lib/posthog";

export default function CheckoutPage() {
  function handlePurchase() {
    captureEvent("purchase_completed", {
      amount: 99,
      currency: "USD",
    });
  }

  return <button onClick={handlePurchase}>Complete purchase</button>;
}
```

#### Identify Users

```tsx
"use client";

import { identifyUser, resetUser } from "@/lib/posthog";
import { useUser } from "@/lib/auth";

export function UserProfile() {
  const { user } = useUser();

  useEffect(() => {
    if (user) {
      identifyUser(user.uid, {
        email: user.email,
        // Add other user properties
      });
    } else {
      resetUser(); // Call on logout
    }
  }, [user]);

  return <div>...</div>;
}
```

### Server-Side Usage (API Routes)

For API routes and server actions:

```ts
import { captureServerEvent } from "@/lib/posthog-server";

export async function POST(request: Request) {
  const userId = "user-123"; // Get from auth token

  // Capture event
  await captureServerEvent(userId, "workout_generated", {
    workoutId: "workout-456",
    duration: 1200,
  });

  return Response.json({ success: true });
}
```

#### Advanced Server-Side Usage

For more control, create a PostHog client instance:

```ts
import { createPostHogClient } from "@/lib/posthog-server";

export async function POST(request: Request) {
  const posthog = createPostHogClient();

  try {
    posthog.capture({
      distinctId: "user-123",
      event: "api_request",
      properties: {
        endpoint: "/api/workouts/generate",
        method: "POST",
      },
    });
  } finally {
    // Always shutdown to flush events
    await posthog.shutdown();
  }

  return Response.json({ success: true });
}
```

## Available Functions

### Client-Side (`src/lib/posthog.ts`)

- `captureEvent(eventName, properties?)` - Capture a custom event
- `identifyUser(distinctId, properties?)` - Identify a user
- `resetUser()` - Reset user identification (logout)
- `getPostHog()` - Get the PostHog instance for advanced usage

### Server-Side (`src/lib/posthog-server.ts`)

- `createPostHogClient()` - Create a PostHog client instance
- `captureServerEvent(distinctId, eventName, properties?)` - Convenience function to capture and shutdown

## Automatic Events

PostHog automatically captures:

- Pageviews
- Clicks
- Form submissions
- Other user interactions

## Best Practices

1. **User Identification**: Identify users when they log in
2. **Event Naming**: Use snake_case for event names (e.g., `workout_generated`, `purchase_completed`)
3. **Properties**: Include relevant context in event properties
4. **Server-Side**: Always call `shutdown()` after using PostHog in API routes
5. **Error Handling**: PostHog calls are non-blocking, but wrap in try-catch for server-side usage

## Testing

PostHog will work automatically in development and production. You can verify events are being captured by:

1. Opening the PostHog dashboard
2. Navigating to "Activity" or "Events"
3. Interacting with your application
4. Verifying events appear in real-time

## Troubleshooting

### Events Not Appearing

1. Check environment variables are set correctly
2. Verify `NEXT_PUBLIC_` prefix is present
3. Check browser console for errors
4. Verify PostHog key and host are correct

### Server-Side Events Not Working

1. Ensure `posthog-node` is installed
2. Always call `await posthog.shutdown()` after capturing events
3. Check server logs for errors

## Resources

- [PostHog Documentation](https://posthog.com/docs)
- [Next.js Integration Guide](https://posthog.com/docs/libraries/next-js)
