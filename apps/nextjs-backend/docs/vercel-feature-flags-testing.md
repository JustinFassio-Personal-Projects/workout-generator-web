# Vercel Feature Flags Testing Guide

## Overview

This document describes how to test and verify that Vercel feature flags are working correctly on the deployed site.

## Feature Flags Implemented

1. **`intro-start-building-clicked`** - Triggered when user clicks "Generate My AI Workout" button
2. **`intro-learn-more-clicked`** - Triggered when user clicks "See How It Works" button
3. **`user-logged-in`** - Triggered when user successfully logs in (future use)
4. **`user-account-created`** - Triggered when user creates an account (future use)

## Testing Methods

### Method 1: Browser Developer Tools (Recommended)

1. **Navigate to the production site**: https://www.aiworkoutgenerator.com
2. **Open Browser Developer Tools** (F12 or Cmd+Option+I)
3. **Open the Console tab**
4. **Click the "Generate My AI Workout" button**
5. **Check the DOM for flag elements**:
   - Open the Elements/Inspector tab
   - Search for `data-vercel-flag` in the DOM
   - You should see: `<div data-vercel-flag="intro-start-building-clicked" data-vercel-flag-value="true" style="display: none;"></div>`
6. **Check localStorage**:
   - Open the Application/Storage tab
   - Navigate to Local Storage → https://www.aiworkoutgenerator.com
   - Look for keys starting with `vercel-flag-`:
     - `vercel-flag-intro-start-building-clicked: "true"`
7. **Repeat for "See How It Works" button**:
   - Click the button
   - Verify `intro-learn-more-clicked` flag appears in DOM and localStorage

### Method 2: Console Commands

Run these commands in the browser console to verify flags:

```javascript
// Check if flags are in the DOM
document.querySelectorAll('[data-vercel-flag]').forEach(el => {
  console.log(
    'Flag:',
    el.getAttribute('data-vercel-flag'),
    'Value:',
    el.getAttribute('data-vercel-flag-value')
  )
})

// Check localStorage for flags
Object.keys(localStorage)
  .filter(key => key.startsWith('vercel-flag-'))
  .forEach(key => {
    console.log(key, ':', localStorage.getItem(key))
  })

// Test flag emission manually
// (This should match what our code does)
const testFlag = document.createElement('div')
testFlag.setAttribute('data-vercel-flag', 'test-flag')
testFlag.setAttribute('data-vercel-flag-value', 'true')
testFlag.style.display = 'none'
document.body.appendChild(testFlag)
console.log('Test flag added:', document.querySelector('[data-vercel-flag="test-flag"]'))
```

### Method 3: Vercel Web Analytics Dashboard

1. **Navigate to Vercel Dashboard** → Your Project → Analytics
2. **Check Web Analytics**:
   - Look for events: "Intro Start Building Clicked" and "Intro Learn More Clicked"
   - Verify that these events are enriched with feature flags
   - Flags should appear in the event metadata

### Method 4: Network Tab Verification

1. **Open Browser Developer Tools** → Network tab
2. **Filter by "analytics" or "vercel"**
3. **Click the "Generate My AI Workout" button**
4. **Look for analytics requests**:
   - Check the request payload for flag data
   - Verify flags are included in the event data

## Expected Behavior

### On Page Load

- `FlagRestorer` component should restore any previously set flags from localStorage
- Flags should be emitted to the DOM automatically if they exist in localStorage

### On Button Click

1. Flag is emitted to DOM immediately (`emitFlagToDOM`)
2. Flag is stored in localStorage (`storeFlagInLocalStorage`)
3. Analytics event is tracked with the flag (`trackVercelEvent` with `flags` option)
4. Page scrolls to the target section

### Flag Persistence

- Flags stored in localStorage persist across page reloads
- Flags are restored on page load via `FlagRestorer` component
- Flags remain in the DOM until explicitly removed

## Verification Checklist

- [ ] "Generate My AI Workout" button click emits `intro-start-building-clicked` flag
- [ ] "See How It Works" button click emits `intro-learn-more-clicked` flag
- [ ] Flags appear in DOM as `data-vercel-flag` attributes
- [ ] Flags are stored in localStorage with `vercel-flag-` prefix
- [ ] Flags persist across page reloads
- [ ] Analytics events are tracked with flags attached
- [ ] No console errors related to flag tracking
- [ ] Vercel Web Analytics shows events with flag enrichment

## Troubleshooting

### Flags Not Appearing in DOM

- Check browser console for errors
- Verify `emitFlagToDOM` function is being called
- Check if `document.body` exists when function is called

### Flags Not Persisting

- Verify localStorage is enabled in browser
- Check for localStorage quota exceeded errors
- Verify `FlagRestorer` component is mounted in root layout

### Analytics Events Not Showing Flags

- Verify `trackVercelEvent` is called with `flags` parameter
- Check Vercel Analytics configuration
- Ensure `@vercel/analytics` package is properly installed

## Code Locations

- Flag definitions: `lib/flags.ts`
- Flag tracking utilities: `lib/flagTracking.ts`
- Analytics integration: `lib/analytics.ts`
- Hero component: `components/landing/Hero/Hero.tsx`
- Flag restorer: `components/ui/FlagRestorer/FlagRestorer.tsx`
- Root layout: `app/layout.tsx`
