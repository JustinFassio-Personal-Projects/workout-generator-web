# Logging Implementation Plan

## Overview

Replace all `console.error`/`console.warn` statements with a proper logging utility that:

- Sanitizes sensitive data in production
- Provides structured logging
- Follows existing environment-aware patterns
- Works in both server and client contexts

## Security Considerations

### Current Issues

1. **Server-side API routes**: Error objects may contain sensitive data (tokens, user IDs, stack traces)
2. **Client-side components**: Errors visible in browser console (less critical but should be cleaned up)

### Solution

- **Production**: Only log error messages (sanitized), not full error objects
- **Development**: Log full error details for debugging
- **Client-side**: Use same utility but with client-safe logging

## Implementation Steps

### Step 1: Create Logging Utility (`src/lib/logger.ts`)

**Features:**

- Environment-aware (dev vs prod)
- Sanitizes error objects in production
- Supports different log levels (error, warn, info, debug)
- Works in both server and client contexts
- Type-safe

**API:**

```typescript
logger.error(message: string, error?: Error | unknown, context?: Record<string, unknown>)
logger.warn(message: string, context?: Record<string, unknown>)
logger.info(message: string, context?: Record<string, unknown>)
logger.debug(message: string, context?: Record<string, unknown>) // dev only
```

**Security:**

- In production: Only log error message, not stack traces or full objects
- In development: Log full error details
- Sanitize sensitive fields (tokens, passwords, API keys) from context objects

### Step 2: Replace Console Statements in Board API Routes

**Files:**

- `src/app/api/board/state/route.ts` (2 instances)
- `src/app/api/board/event/route.ts` (3 instances)

**Pattern:**

```typescript
// Before
console.error("Token verification failed:", error);

// After
logger.error("Token verification failed", error, { route: "/api/board/state" });
```

### Step 3: Replace Console Statements in Board Client Components

**Files:**

- `src/components/board/BoardBanner.tsx` (3 instances)
- `src/components/board/BoardPostDetail.tsx` (2 instances)
- `src/components/board/BoardSection.tsx` (1 instance)

**Pattern:**

```typescript
// Before
console.error("Error logging impression:", error);

// After
logger.error("Error logging impression", error, {
  component: "BoardBanner",
  postId: post.id,
});
```

### Step 4: Testing

1. **Development mode**: Verify full error details are logged
2. **Production mode**: Verify only sanitized messages are logged
3. **Client-side**: Verify errors don't expose sensitive data in browser console

### Step 5: Verification

Run full verification suite:

- `npm run lint`
- `npm run type-check`
- `npm run build`
- Manual testing in dev/prod modes

## Future Enhancements (Optional)

1. **Structured logging**: Add correlation IDs for request tracing
2. **External logging service**: Integrate with Cloud Logging, Sentry, or similar
3. **Log levels**: Add configurable log levels via environment variables
4. **Performance monitoring**: Add timing/performance logs

## Files to Modify

### New Files

- `src/lib/logger.ts` - Logging utility

### Modified Files

- `src/app/api/board/state/route.ts`
- `src/app/api/board/event/route.ts`
- `src/components/board/BoardBanner.tsx`
- `src/components/board/BoardPostDetail.tsx`
- `src/components/board/BoardSection.tsx`

## Notes

- Keep the logging utility simple (no external dependencies initially)
- Follow existing patterns (`getEnvAwareErrorMessage` style)
- Ensure TypeScript types are correct
- Consider adding ESLint rule to prevent future `console.*` usage in production code

## Implementation Status

✅ **Completed**

### Deviations from Plan

- **Logger implementation**: Used `process.env.NODE_ENV` directly (consistent with existing `getEnvAwareErrorMessage` pattern) instead of a separate environment check function
- **Error sanitization**: In production, errors are sanitized to only include the error message (no stack traces). Full error details are preserved in development mode
- **Context sanitization**: Added automatic redaction of sensitive fields (token, password, secret, apiKey, etc.) in production mode
- **Client-side compatibility**: Logger works in both server and client components (Next.js makes `process.env.NODE_ENV` available in both contexts)

### Files Modified

- ✅ `src/lib/logger.ts` - Created logging utility
- ✅ `src/app/api/board/state/route.ts` - Replaced 2 console.error statements
- ✅ `src/app/api/board/event/route.ts` - Replaced 3 console.warn/error statements
- ✅ `src/components/board/BoardBanner.tsx` - Replaced 3 console.error statements
- ✅ `src/components/board/BoardPostDetail.tsx` - Replaced 2 console.error statements
- ✅ `src/components/board/BoardSection.tsx` - Replaced 1 console.error statement

### Verification Results

- ✅ ESLint: Passed (only pre-existing warnings in unrelated files)
- ✅ TypeScript: Passed (no type errors)
- ✅ Build: Passed (production build successful)
