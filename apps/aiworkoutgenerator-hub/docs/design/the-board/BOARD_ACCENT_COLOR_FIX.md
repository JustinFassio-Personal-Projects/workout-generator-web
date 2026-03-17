# Board Accent Color Fix - Troubleshooting Guide

## Problem

Only the Brand accent color is working on the frontend. Other accent colors (INFO, SUCCESS, WARNING, DANGER, AMBER, ORANGE, etc.) are not displaying with their colors.

## Root Cause

The frontend likely has hardcoded logic that only handles the `'brand'` accent value specifically, instead of using the utility functions that work for ALL accent colors.

## Admin Side Fixes (Completed)

### 1. Server-Side Validation

Added validation in `app/actions/board.ts` to ensure only valid `BoardAccent` enum values are saved:

- Validates accent color on create
- Validates accent color on update
- Returns clear error messages for invalid values

### 2. Utility Function Improvements

Enhanced `lib/board-utils.ts` with:

- Defensive checks to handle unknown accent values gracefully
- Console warnings for debugging
- Validation function to ensure all enum values are mapped

### 3. Form Consistency

All accent color options in the admin form now use consistent hex color values (no more Tailwind classes).

## Frontend Fix Required

### ❌ WRONG - Hardcoded Brand Check

```typescript
// This only works for brand!
if (post.accent === 'brand') {
  return <div style={{ color: '#9FAF6C' }}>{post.title}</div>;
}
```

### ✅ CORRECT - Use Utility Functions

```typescript
import { getAccentColor, getAccentTextColor } from '@/lib/board-utils';

function BoardPostCard({ post }: { post: SerializedBoardPost }) {
  // This works for ALL 15 accent colors!
  const accentColor = getAccentColor(post.accent);
  const textColor = getAccentTextColor(post.accent);

  return (
    <div>
      <h2 style={{ color: accentColor || 'inherit' }}>
        {post.title}
      </h2>
      {post.cta_label && (
        <button style={{
          backgroundColor: accentColor,
          color: textColor,
        }}>
          {post.cta_label}
        </button>
      )}
    </div>
  );
}
```

## Verification Steps

1. **Check Frontend Code**: Search for any hardcoded checks like:
   - `if (accent === 'brand')`
   - `accent === 'brand' ? color : default`
   - Switch/case statements that only handle 'brand'

2. **Import Utility Functions**: Ensure the frontend imports from:

   ```typescript
   import {
     getAccentColor,
     getAccentBorderColor,
     getAccentGlowColor,
     getAccentTextColor,
   } from "@/lib/board-utils";
   ```

3. **Test All Colors**: Create test posts with each accent color:
   - INFO
   - SUCCESS
   - WARNING
   - DANGER
   - BRAND
   - AMBER
   - ORANGE
   - DARK_ORANGE
   - RED_ORANGE
   - RED
   - BLUE_1 through BLUE_5

4. **Check Browser Console**: Look for warnings like:
   ```
   Unknown accent color: info
   ```
   This indicates the utility functions are being called but the mapping is missing.

## Data Verification

All accent colors are stored in Firestore as enum string values:

- `'info'`, `'success'`, `'warning'`, `'danger'`, `'brand'`
- `'amber'`, `'orange'`, `'dark_orange'`, `'red_orange'`, `'red'`
- `'blue_1'`, `'blue_2'`, `'blue_3'`, `'blue_4'`, `'blue_5'`

The utility functions in `lib/board-utils.ts` map these string values to hex colors.

## Complete Example

```typescript
'use client';

import { SerializedBoardPost } from '@/types/board';
import {
  getAccentColor,
  getAccentBorderColor,
  getAccentGlowColor,
  getAccentTextColor,
} from '@/lib/board-utils';

export function BoardPostCard({ post }: { post: SerializedBoardPost }) {
  const accentColor = getAccentColor(post.accent);
  const borderColor = getAccentBorderColor(post.accent);
  const glowColor = getAccentGlowColor(post.accent);
  const textColor = getAccentTextColor(post.accent);

  return (
    <article
      className="board-post-card"
      style={{
        borderColor: borderColor || 'transparent',
        boxShadow: glowColor ? `0 0 8px ${glowColor}` : undefined,
      }}
    >
      <h2 style={{ color: accentColor || 'inherit' }}>
        {post.title}
      </h2>

      {post.summary && <p>{post.summary}</p>}

      {post.cta_label && post.cta_url && (
        <a
          href={post.cta_url}
          className="cta-button"
          style={{
            backgroundColor: accentColor || undefined,
            color: textColor || 'inherit',
            borderColor: borderColor || 'transparent',
            boxShadow: glowColor ? `0 0 8px ${glowColor}` : undefined,
          }}
        >
          {post.cta_label}
        </a>
      )}
    </article>
  );
}
```

## Summary

- ✅ Admin side: All colors are properly saved and validated
- ✅ Utility functions: All 15 colors are mapped correctly
- ❌ Frontend: Must use utility functions instead of hardcoded brand checks

The fix is on the frontend side - replace any hardcoded brand-specific logic with calls to the utility functions.
