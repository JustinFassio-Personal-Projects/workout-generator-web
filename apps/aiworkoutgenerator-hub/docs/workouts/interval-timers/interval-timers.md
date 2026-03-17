# AI Interval Timer API Documentation

This document describes the technical implementation of the AI Interval Timer API endpoint (`/api/workouts/ai-interval-timer`), which generates optimal work/rest interval recommendations for exercises based on user fitness level, exercise characteristics, and intensity preferences.

## Overview

The AI Interval Timer API provides intelligent timing recommendations for interval-based workouts. It can operate in two modes:

1. **AI-Powered Mode**: Uses Google Gemini AI to generate personalized interval timings based on exercise complexity, user fitness level, tempo, and other factors.
2. **Preset Mode**: Returns predefined interval timings based on intensity level (easy/moderate/intense) without using AI, bypassing rate limits.

## Architecture

The API consists of three main components:

- **API Route** (`src/app/api/workouts/ai-interval-timer/route.ts`): Handles HTTP requests, authentication, rate limiting, and response formatting
- **Genkit Flow** (`src/lib/genkit/flows/interval-timer.ts`): Contains the AI generation logic, prompt building, and preset interval definitions
- **Type Definitions** (`src/types/ai-exercise-editor.ts`): TypeScript interfaces for requests and responses

## Base URL

- Development: `http://localhost:3000`
- Production: `https://aiworkoutgen.com`

## Authentication

All requests require a Bearer token in the Authorization header:

```
Authorization: Bearer <idToken>
```

The `idToken` is obtained from Firebase Auth (client-side).

---

## Endpoint

### POST /api/workouts/ai-interval-timer

**Description:** Generates optimal interval timer recommendations (work duration, rest duration) for a specific exercise based on user fitness level and exercise characteristics.

**Request Body:**

```typescript
{
  exerciseName: string;              // Exercise name (1-200 chars)
  exerciseData: {
    sets: number;                    // Number of sets (1-20)
    tempo?: string | null;           // Exercise tempo e.g., "3-0-1-0"
    muscleTarget: string;            // Primary muscle target (required)
    duration?: string;               // Duration if specified e.g., "45s"
    notes?: string;                 // Set notes (may indicate bilateral work)
  };
  userLevel: "beginner" | "intermediate" | "advanced" | "elite" | "athlete";
  intensityPreference?: "easy" | "moderate" | "intense" | "custom";
  workoutId: string;                // Workout document ID (required)
  usePreset?: boolean;               // If true, skip AI and use preset
}
```

**Example Request:**

```http
POST /api/workouts/ai-interval-timer
Authorization: Bearer <idToken>
Content-Type: application/json

{
  "exerciseName": "Bulgarian Split Squat",
  "exerciseData": {
    "sets": 3,
    "tempo": "2-0-1-0",
    "muscleTarget": "Quadriceps, Glutes",
    "notes": "Single leg, alternate sides"
  },
  "userLevel": "intermediate",
  "intensityPreference": "moderate",
  "workoutId": "workout_abc123",
  "usePreset": false
}
```

**Response (200 OK - AI Generated):**

```json
{
  "workDuration": 45,
  "restDuration": 45,
  "setupDuration": 5,
  "isBilateral": true,
  "switchIndicator": "Switch to other leg",
  "explanation": "Using moderate intensity preset: 45s work, 45s rest. This exercise requires working each leg separately, so the timer will prompt you to switch sides.",
  "intensityLevel": "moderate",
  "metadata": {
    "ai_model": "googleai/gemini-2.0-flash",
    "generation_tokens": 1250,
    "generation_cost_usd": 0.000375
  },
  "usage": {
    "remaining": 99,
    "tier": "basic"
  }
}
```

**Response (200 OK - Preset Mode):**

When `usePreset: true` and `intensityPreference` is set to a non-custom value, the API returns preset intervals without AI generation or rate limiting:

```json
{
  "workDuration": 45,
  "restDuration": 45,
  "setupDuration": 5,
  "isBilateral": true,
  "switchIndicator": "Switch sides",
  "explanation": "Using moderate intensity preset: 45s work, 45s rest.",
  "intensityLevel": "moderate"
}
```

Note: Preset responses do not include `metadata` or `usage` fields since no AI was used.

**Error Responses:**

- `400 Bad Request`: Invalid request body (Zod validation error)
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: Free tier lifetime limit exceeded
- `404 Not Found`: Workout not found
- `429 Too Many Requests`: Paid tier monthly limit exceeded
- `500 Internal Server Error`: Server error

**Example Error Response (403):**

```json
{
  "error": "Access denied",
  "message": "You've reached your lifetime limit of 10 AI features. Upgrade to Basic for monthly access.",
  "tier": "free",
  "remaining": 0
}
```

---

## Rate Limiting

The API enforces subscription-based rate limits for AI-powered recommendations:

### Free Tier

- **Limit**: 10 lifetime total (shared pool with other AI features)
- **Counter**: `{uid}_ai_edit_any_lifetime` in `ai_usage_counters` collection
- **Enforcement**: Atomic Firestore transaction
- **Error**: Returns `403 Forbidden` when limit exceeded

### Paid Tiers (Basic, Pro, Elite)

- **Basic**: 100 requests/month
- **Pro**: 500 requests/month
- **Elite**: 1000 requests/month
- **Counter**: `{uid}_ai_edit_{year}_{month}` in `ai_usage_counters` collection
- **Enforcement**: Atomic Firestore transaction
- **Error**: Returns `429 Too Many Requests` when limit exceeded

### Coach Tiers

- **Limit**: Unlimited
- **Enforcement**: No rate limiting applied

### Preset Mode Bypass

When `usePreset: true` and `intensityPreference` is set to a non-custom value, the API skips rate limiting entirely and returns preset intervals without AI generation.

---

## AI Generation Flow

When AI generation is requested (not using preset), the following process occurs:

### 1. Input Validation

- Request body validated against Zod schema
- Workout document fetched and ownership verified
- User authentication verified

### 2. Rate Limit Check

- User tier determined via `getUserTier()`
- Appropriate counter checked/incremented atomically
- Request rejected if limit exceeded

### 3. AI Prompt Construction

The system builds two prompts:

**System Prompt** (`buildSystemPrompt()`):

- Defines the AI's role as an expert fitness coach
- Provides timing guidelines by intensity level:
  - Easy: 30s work / 60s rest
  - Moderate: 45s work / 45s rest
  - Intense: 60s work / 30s rest
- Explains factors to consider (complexity, fitness level, tempo, muscle groups)
- Describes bilateral/unilateral exercise detection

**User Prompt** (`buildUserPrompt()`):

- Includes exercise name, user fitness level, sets, muscle target
- Optionally includes tempo, duration, notes
- Includes intensity preference if specified

### 4. AI Generation

- Calls `intervalTimerFlow()` with constructed prompts
- Uses Google Gemini 2.0 Flash model
- Temperature: 0.4 (lower for consistent timing recommendations)
- Output schema enforced via Zod

### 5. Output Validation & Constraints

- `workDuration`: Clamped to 10-120 seconds
- `restDuration`: Clamped to 10-180 seconds
- `switchIndicator`: Auto-generated if `isBilateral: true` but indicator missing

### 6. Usage Logging

- Token usage estimated from prompt + output
- Cost calculated using Gemini Flash pricing:
  - Input: $0.075 per 1M tokens
  - Output: $0.30 per 1M tokens
- Log entry created in `ai_usage_logs` collection with:
  - User ID, workout ID, exercise name
  - AI model, tokens, cost
  - Result timings and intensity level

### 7. Response Formatting

- Response includes recommended timings, bilateral detection, explanation
- Includes metadata (model, tokens, cost) and usage (remaining, tier)

---

## Preset Intervals

When `usePreset: true` or when AI generation is not needed, the API uses predefined intervals:

```typescript
const INTERVAL_PRESETS = {
  easy: { work: 30, rest: 60 },
  moderate: { work: 45, rest: 45 },
  intense: { work: 60, rest: 30 },
};
```

### Bilateral Detection (Preset Mode)

The system uses pattern matching to detect unilateral exercises without AI:

```typescript
const BILATERAL_PATTERNS = [
  "single leg",
  "single arm",
  "single-leg",
  "single-arm",
  "one leg",
  "one arm",
  "one-leg",
  "one-arm",
  "unilateral",
  "lunge",
  "split squat",
  "bulgarian",
  "step up",
  "step-up",
  "pistol",
  "one legged",
  "one armed",
];
```

The `quickBilateralCheck()` function searches exercise name and notes for these patterns.

---

## Response Schema

### AIIntervalTimerResponse

```typescript
interface AIIntervalTimerResponse {
  workDuration: number; // Recommended work duration in seconds
  restDuration: number; // Recommended rest duration in seconds
  setupDuration: number; // Setup time before starting (default: 5s)
  isBilateral: boolean; // Whether exercise requires side-switching
  switchIndicator?: string; // Text to display when switching sides
  explanation: string; // Brief explanation of recommendations
  intensityLevel: "easy" | "moderate" | "intense";
  metadata?: {
    // Only present for AI-generated responses
    ai_model: string;
    generation_tokens: number;
    generation_cost_usd: number;
  };
  usage?: {
    // Only present for AI-generated responses
    remaining: number | null; // Remaining requests this period
    tier: SubscriptionTier;
  };
}
```

---

## Security & Authorization

### Workout Ownership Verification

Before processing any request, the API verifies:

1. The workout document exists in Firestore
2. The workout's `user_id` matches the authenticated user's UID
3. Returns `403 Forbidden` if ownership check fails

### Authentication

- All requests require valid Firebase ID token
- Token verified via `verifyIdToken()` from Firebase Admin SDK
- Expired or invalid tokens return `401 Unauthorized`

---

## Database Collections

### ai_usage_counters

Tracks rate limit usage per user:

**Free Tier Document:**

```typescript
{
  user_id: string;
  edit_type: "ai_edit_any_lifetime";
  tier: "free";
  count: number; // Lifetime total
  created_at: Timestamp;
  last_updated: Timestamp;
}
```

**Paid Tier Document:**

```typescript
{
  user_id: string;
  edit_type: "ai_edit";
  year: number;
  month: number;
  tier: SubscriptionTier;
  count: number; // Monthly total
  created_at: Timestamp;
  last_updated: Timestamp;
}
```

### ai_usage_logs

Logs all AI interval timer generations for analytics:

```typescript
{
  id: string;
  user_id: string;
  workout_id: string;
  edit_type: "interval_timer";
  exercise_name: string;
  user_level: FitnessLevel;
  intensity_preference?: string;
  ai_model: string;
  generation_tokens: number;
  generation_cost_usd: number;
  result: {
    work_duration: number;
    rest_duration: number;
    is_bilateral: boolean;
    intensity_level: string;
  };
  created_at: Timestamp;
}
```

---

## Frontend Usage

### Using the API Directly

```typescript
const token = await getIdToken(); // Firebase Auth

const response = await fetch("/api/workouts/ai-interval-timer", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    exerciseName: "Bulgarian Split Squat",
    exerciseData: {
      sets: 3,
      tempo: "2-0-1-0",
      muscleTarget: "Quadriceps, Glutes",
      notes: "Single leg, alternate sides",
    },
    userLevel: "intermediate",
    intensityPreference: "moderate",
    workoutId: "workout_abc123",
  }),
});

if (!response.ok) {
  const error = await response.json();
  throw new Error(error.message || "Failed to get AI recommendation");
}

const data: AIIntervalTimerResponse = await response.json();
```

### Using Preset Mode (No Rate Limit)

```typescript
const response = await fetch("/api/workouts/ai-interval-timer", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    exerciseName: "Push-ups",
    exerciseData: {
      sets: 3,
      muscleTarget: "Chest, Triceps",
    },
    userLevel: "beginner",
    intensityPreference: "easy",
    workoutId: "workout_abc123",
    usePreset: true, // Skip AI, use preset
  }),
});
```

---

## Implementation Details

### Atomic Rate Limit Enforcement

Rate limiting uses Firestore transactions to ensure atomic counter increments:

```typescript
await adminDb.runTransaction(async (tx) => {
  const counterDoc = await tx.get(counterRef);
  const currentCount = counterDoc.data()?.count || 0;

  if (currentCount >= limit) {
    return { allowed: false };
  }

  if (counterDoc.exists) {
    tx.update(counterRef, { count: FieldValue.increment(1) });
  } else {
    tx.set(counterRef, { count: 1, ...metadata });
  }

  return { allowed: true, count: currentCount + 1 };
});
```

### Error Handling

- Zod validation errors return `400` with detailed issue list
- Firebase auth errors (`auth/id-token-expired`, `auth/argument-error`) return `401`
- Rate limit errors return `403` (free tier) or `429` (paid tier) with remaining count
- Generic errors return `500` with error message

### Cost Estimation

Token usage is estimated using a simple character-based approximation:

- Input tokens: `Math.ceil(input.length / 4)`
- Output tokens: `Math.ceil(output.length / 4)`
- Cost: Calculated using Gemini Flash pricing constants

---

## Related Components

- **IntervalTimerModal** (`src/components/workout/player/IntervalTimerModal.tsx`): Frontend component that calls this API
- **SectionTimerModal** (`src/components/workout/player/SectionTimerModal.tsx`): Component for section-based timers
- **interval-timer.ts** (`src/lib/genkit/flows/interval-timer.ts`): Core AI generation logic
- **subscription-constants.ts** (`src/lib/subscription-constants.ts`): Rate limit definitions

---

## Future Enhancements

Potential improvements to consider:

1. **Caching**: Cache AI recommendations for common exercise + level combinations
2. **Historical Learning**: Use past user preferences to improve recommendations
3. **Progressive Overload**: Adjust intervals based on workout history
4. **Equipment-Specific Timing**: Factor in equipment type (barbell vs dumbbell vs bodyweight)
5. **Heart Rate Integration**: Adjust intervals based on real-time heart rate data

---

## Troubleshooting

### Common Issues

**Issue**: `403 Forbidden` with "lifetime limit" message

- **Cause**: Free tier user has exhausted their 10 lifetime AI features
- **Solution**: Upgrade to Basic tier for monthly limits, or use preset mode (`usePreset: true`)

**Issue**: `429 Too Many Requests`

- **Cause**: Paid tier user has exceeded monthly limit
- **Solution**: Wait for monthly reset or upgrade to higher tier

**Issue**: `404 Not Found` for workout

- **Cause**: Workout ID doesn't exist or user doesn't have access
- **Solution**: Verify workout ID and user ownership

**Issue**: AI recommendations seem inconsistent

- **Cause**: Temperature setting (0.4) allows some variation
- **Solution**: Consider lowering temperature further or using preset mode for consistency

---

## Testing

### Manual Testing

1. **Test AI Generation**:

   ```bash
   curl -X POST http://localhost:3000/api/workouts/ai-interval-timer \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{
       "exerciseName": "Squats",
       "exerciseData": { "sets": 3, "muscleTarget": "Legs" },
       "userLevel": "intermediate",
       "workoutId": "test_workout_id"
     }'
   ```

2. **Test Preset Mode**:

   ```bash
   curl -X POST http://localhost:3000/api/workouts/ai-interval-timer \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{
       "exerciseName": "Push-ups",
       "exerciseData": { "sets": 3, "muscleTarget": "Chest" },
       "userLevel": "beginner",
       "intensityPreference": "easy",
       "workoutId": "test_workout_id",
       "usePreset": true
     }'
   ```

3. **Test Rate Limiting**:
   - Create free tier user
   - Make 10 AI requests
   - Verify 11th request returns `403 Forbidden`

---

## References

- [Genkit Documentation](https://firebase.google.com/docs/genkit)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Zod Schema Validation](https://zod.dev/)
- [Google Gemini API](https://ai.google.dev/)
