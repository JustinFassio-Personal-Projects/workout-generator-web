# Website Widget Update Instructions

## Overview

The admin panel has been updated to store and display email, name, and intent from website widget submissions. The website widget needs one small update to include the `intent` field in the metadata object when submitting tickets.

## Current State

- ✅ Email and name are already being sent as top-level fields (correct)
- ❌ Intent is not being stored in metadata (needs update)

## Required Change

### File: `components/support/TicketSubmissionForm.tsx`

**Location:** In the `handleSubmit` function, when building the `requestPayload` (around lines 240-249)

**Current Code:**

```typescript
const requestPayload = {
  subject, // Auto-generated
  description: trimmedMessage,
  category, // Mapped from intent
  priority, // Always 'medium'
  email: emailToSend, // Top-level field
  name: formData.name.trim(), // Top-level field
  metadata, // Separate object
  website: '', // Honeypot field
}
```

**Updated Code:**

```typescript
const requestPayload = {
  subject, // Auto-generated
  description: trimmedMessage,
  category, // Mapped from intent
  priority, // Always 'medium'
  email: emailToSend, // Top-level field
  name: formData.name.trim(), // Top-level field
  metadata: {
    ...metadata, // Existing metadata (source, source_url, device_type, utm_params)
    intent: formData.intent, // Add intent to metadata
  },
  website: '', // Honeypot field
}
```

## What This Does

1. **Preserves Intent**: The original user intent (`generate_first_workout`, `fix_workout`, `plan_help`, `something_broken`) will be stored in `metadata.intent`
2. **Admin Visibility**: Admins will see the user-friendly intent label (e.g., "Which plan should I choose?") in the ticket detail view
3. **Backward Compatible**: Existing tickets without intent will continue to work

## Verification

After implementing this change:

1. Submit a test ticket from the website widget
2. Check the admin panel ticket detail view
3. Verify that the "User Intent" field appears in the Metadata card
4. Verify that the intent label matches what the user selected (e.g., "Which plan should I choose?")

## Notes

- Email and name are already correctly sent as top-level fields - no changes needed
- The intent field is optional in the schema, so if it's missing, the admin panel will gracefully handle it
- The intent is used for display purposes only - the category mapping still happens client-side as before
