# Asset Path Fix - Root Cause Analysis

## Problem Identified

The Trainer app was experiencing a critical error:

```
Failed to load module script: Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of "text/html"
```

## Root Cause

The Trainer app is deployed at its **own root domain**: `https://fitcopilot-trainer.vercel.app/`

However, we incorrectly added:

- `base: '/fitcopilot-trainer/'` in `vite.config.ts`
- `basename="/fitcopilot-trainer"` in `App.tsx`

### What Happened

1. **With base path configured:**
   - Vite built assets with paths like: `/fitcopilot-trainer/assets/index-BT267pDI.js`
   - HTML references: `<script src="/fitcopilot-trainer/assets/index-BT267pDI.js">`

2. **When accessed at root domain:**
   - Browser requests: `https://fitcopilot-trainer.vercel.app/fitcopilot-trainer/assets/index-BT267pDI.js`
   - This path doesn't exist (assets are at `/assets/...` not `/fitcopilot-trainer/assets/...`)
   - Vercel's rewrite rule `"source": "/(.*)"` catches the request
   - Returns `index.html` (HTML) instead of the JS file
   - Browser expects JS but gets HTML → **MIME type error**

## Solution

**Removed base path configuration** because:

- Trainer app is deployed at root domain (`fitcopilot-trainer.vercel.app`)
- Assets should be at `/assets/...` not `/fitcopilot-trainer/assets/...`
- React Router routes should be at root (`/`, `/account`) not `/fitcopilot-trainer/...`

## Changes Made

1. **`vite.config.ts`**: Removed `base: '/fitcopilot-trainer/'`
2. **`App.tsx`**: Removed `basename="/fitcopilot-trainer"` from Router

## Architecture Context

- **Trainer app**: Deployed at `https://fitcopilot-trainer.vercel.app/` (standalone, root domain)
- **Hub app**: Embeds Trainer via iframe at `https://fitcopilot.app/fitcopilot-trainer`
- **Key point**: The Hub route `/fitcopilot-trainer` is the Hub's route, not the Trainer's deployment path

## Why This Fixes It

After removing base path:

- Assets build to: `/assets/index-XXX.js` ✅
- HTML references: `<script src="/assets/index-XXX.js">` ✅
- Browser requests: `https://fitcopilot-trainer.vercel.app/assets/index-XXX.js` ✅
- Vercel serves the actual JS file (not caught by rewrite) ✅
- Browser gets JS with correct MIME type ✅

## Additional Issues to Address

1. **Tailwind CDN**: `index.html` uses `https://cdn.tailwindcss.com` which should be replaced with proper Tailwind build for production
2. **Vercel rewrites**: Current rewrite rule `"source": "/(.*)"` should exclude `/assets/` to avoid catching asset requests (though Vercel should handle this automatically)

## Testing

After deployment, verify:

- ✅ Assets load correctly (check Network tab)
- ✅ No MIME type errors
- ✅ App loads and functions correctly
- ✅ Routes work (`/`, `/account`)
- ✅ SSO authentication works
