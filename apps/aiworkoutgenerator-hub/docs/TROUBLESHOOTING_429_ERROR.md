# Troubleshooting 429 (Too Many Requests) Error

## Overview

The `/api/workouts/generate` endpoint can return a 429 status code for two different reasons:

1. **Subscription-based rate limiting** - User has reached their workout generation limit
2. **AI service rate limiting** - The Gemini API has rate-limited the request

## Error Sources

### 1. Subscription-Based Rate Limiting (Line 348)

**When it occurs:**

- User has generated the maximum number of workouts allowed by their subscription tier
- Free tier: Lifetime limit (typically 3 workouts)
- Basic/Pro/Elite tiers: Monthly limit

**Error Response:**

```json
{
  "error": "Workout limit reached",
  "tier": "free",
  "remaining": 0,
  "message": "You've used all 3 free workouts (lifetime limit). Upgrade to Basic for 10 workouts/month."
}
```

**Resolution:**

- User needs to upgrade their subscription tier
- Or wait until the next billing cycle (for monthly limits)

### 2. AI Service Rate Limiting (Line 661)

**When it occurs:**

- Gemini API has rate-limited the request due to:
  - **RPM (Requests Per Minute)** - Too many requests in a short time window
  - **TPM (Tokens Per Minute)** - Large prompts consuming too many tokens per minute
  - **RPD (Requests Per Day)** - Daily quota exceeded
  - **Regional/Project limits** - Project-level quotas

**Important:** The error "Resource exhausted" often means **RPM or TPM limits**, not your daily quota. These are separate metrics!

**Error Response:**

```json
{
  "error": "AI service rate limit exceeded",
  "message": "The AI service is temporarily rate-limited (too many requests too quickly). Please wait 1-2 minutes and try again.",
  "details": "This is usually a per-minute rate limit (RPM) or token-per-minute (TPM) limit, not your daily quota. Check 'Requests per minute' in Google AI Studio."
}
```

**How to Check Different Quota Types:**

1. **RPM (Requests Per Minute):**
   - Google AI Studio → Settings → Quotas
   - Look for "Requests per minute" or "RPM"
   - Free tier: Usually 15-60 RPM
   - Paid tier: Varies by plan

2. **TPM (Tokens Per Minute):**
   - Google AI Studio → Settings → Quotas
   - Look for "Tokens per minute" or "TPM"
   - Large prompts can hit this limit quickly
   - Free tier: Usually 1M-2M TPM
   - Paid tier: Higher limits

3. **RPD (Requests Per Day):**
   - Google AI Studio → Usage Dashboard
   - Shows daily request count
   - Free tier: Usually 1,500 requests/day
   - Paid tier: Higher limits

**Resolution:**

- **For RPM/TPM limits:** Wait 1-2 minutes and retry (these reset quickly)
- **For RPD limits:** Wait until next day or upgrade plan
- **Check your actual limits:** Go to Google AI Studio → Settings → Quotas
- **Reduce request frequency:** Implement exponential backoff retry logic
- **Reduce prompt size:** If hitting TPM limits, consider shorter prompts

## Current Error Handling

### Backend (`src/app/api/workouts/generate/route.ts`)

The endpoint has error detection logic (lines 613-663) that:

- Detects 429 status codes from the Gemini API
- Checks for rate limit keywords in error messages
- Returns appropriate error messages

### Frontend (`src/services/trainer/TrainerService.ts`)

The frontend service:

- Makes the API call (line 65)
- Parses the error response (line 80-82)
- Throws a generic error message

### UI (`src/app/generate/page.tsx`)

The generate page:

- Catches errors (line 285-293)
- Shows error in toast notification (line 289-291)
- Does not distinguish between error types

## Troubleshooting Steps

### For Users

1. **Check your subscription tier and remaining workouts**
   - Look at the workout counter on the generate page
   - If it shows 0, you've reached your limit

2. **If you have remaining workouts but still get 429:**
   - Wait 1-2 minutes and try again (AI service may be rate-limited)
   - Check if the error message mentions "AI service rate limit"
   - Contact support if the issue persists

### For Developers

1. **Check server logs** for the actual error:

   ```bash
   # Look for rate limit error logs
   grep -i "rate limit" logs/server.log
   ```

2. **Verify Gemini API quota:**
   - Check Google Cloud Console
   - Verify API key has sufficient quota
   - Check for quota exceeded errors

3. **Test subscription limits:**
   - Verify `checkRateLimit()` function is working correctly
   - Check Firestore queries for workout counts

4. **Monitor error patterns:**
   - Track frequency of 429 errors
   - Distinguish between subscription vs AI service limits
   - Consider implementing retry logic for transient errors

## Recommended Improvements

1. **Better Error Messages:**
   - Distinguish between subscription limits and AI service limits
   - Provide actionable guidance for each error type

2. **Retry Logic:**
   - Implement exponential backoff for AI service rate limits
   - Only retry transient errors (429 from AI service)
   - Don't retry subscription limit errors

3. **User Feedback:**
   - Show different UI for subscription limits (upgrade prompt)
   - Show different UI for AI service limits (retry button)
   - Display estimated wait time for rate limits

4. **Monitoring:**
   - Log rate limit errors with context
   - Track error rates by type
   - Alert on high rate limit error rates

## Related Files

- `src/app/api/workouts/generate/route.ts` - Main API endpoint
- `src/services/trainer/TrainerService.ts` - Frontend service
- `src/app/generate/page.tsx` - Generate page UI
- `src/lib/genkit/flows/generate-workout.ts` - AI generation flow
