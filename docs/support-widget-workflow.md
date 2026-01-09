# Support/Feedback Widget - Complete Workflow Documentation

## Overview

The support/feedback widget is a conversational modal form accessible via a Floating Action Button (FAB) that allows users (both authenticated and anonymous) to submit questions and get help. The interface uses an intent-based workflow to make it feel more like talking to a human rather than filing a formal ticket.

---

## 1. Entry Point & Trigger

### User Interaction Flow:

1. **FAB Button** (Floating Action Button) appears on all pages (bottom-right corner)
   - Icon: `HelpCircle` (question mark in circle)
   - Label: "Questions?" (aria-label)
   - Always visible, rendered via React Portal to `document.body`

2. **User clicks FAB button** → Menu expands with options:
   - **"Support"** option (Headphones icon) - Currently active
   - **"Ask"** option (Brain icon) - Disabled (ChatKit not configured)

3. **User clicks "Support"** → Support form modal opens

---

## 2. Form Fields & Questions

### Header Section

The modal header includes:

- **Title**: "Need help with your workout?"
- **Subtitle**: "Ask anything — workouts, goals, equipment, or pricing. We'll reply by email."
- **Trust Lines**:
  - "Real human replies"
  - "Usually within 1 business day"
  - "No spam"
- **Profile Thumbnail**: Round image of Justin on the right side of the header

### Field 1: **Intent Selection** (Required)

- **Type**: Button selector (4 large buttons in a 2x2 grid)
- **Label**: "What do you need help with? \*"
- **Options** (user-friendly buttons):
  1. `"generate_first_workout"` → Display: "Generate my first workout"
  2. `"fix_workout"` → Display: "Fix my workout"
  3. `"plan_help"` → Display: "Which plan should I choose?"
  4. `"something_broken"` → Display: "Something isn't working"
- **Default Value**: `null` (no selection)
- **Validation**: Must select one intent before submission
- **Behavior**:
  - Selected button is highlighted with accent color
  - Clicking a button clears any previous error messages
  - Selection affects the placeholder text for the question field

### Field 2: **Your Question / Message** (Required)

- **Type**: Free text textarea
- **Label**: "Your question \*"
- **Placeholder**: Dynamic, changes based on selected intent:
  - `generate_first_workout`: "Tell us your goal + what equipment you have (or 'none'). Example: 'Lose fat, dumbbells at home, 30 min, 3 days/week.'"
  - `fix_workout`: "What felt off — too hard/easy, too long, wrong equipment, pain? If you can, paste the workout link or describe the exercises."
  - `plan_help`: "What's your goal and how often do you train? We'll recommend the best plan."
  - `something_broken`: "What were you trying to do when it failed? Any error message? What device/browser?"
  - No intent selected: "Ask your question here..."
- **Rows**: 6
- **Validation Rules**:
  - Cannot be empty (trimmed)
  - Must be at least 10 characters long (trimmed)
  - No maximum length specified
- **Default Value**: Empty string
- **Auto-filled**: No
- **Auto-focus**: Yes (first field focused when modal opens)

### Field 3: **Email** (Required)

- **Type**: Email input (validated as email format)
- **Label**: "Email (so we can reply) \*"
- **Placeholder**: "your.email@example.com"
- **Validation Rules**:
  - Cannot be empty
  - Must be valid email format (client and server validation)
  - Always required (even for authenticated users)
- **Default Value**: Empty string
- **Auto-filled**: Yes (if user is authenticated)
  - Uses: `user.email` from Supabase authentication
  - If user email is missing, field is cleared (not preserved from previous value)

### Field 4: **Name** (Optional)

- **Type**: Free text input
- **Label**: "Name (optional)"
- **Placeholder**: "Your name"
- **Validation Rules**: None (optional field)
- **Default Value**: Empty string
- **Auto-filled**: Yes (if user is authenticated)
  - Uses: `user.user_metadata?.full_name` or `user.user_metadata?.name`
  - If user name is missing, field is cleared (not preserved from previous value)

### Removed Fields (Auto-Generated)

The following fields are **no longer shown to users** but are automatically generated:

- **Subject**: Auto-generated from intent label + message preview (first 60 chars)
  - Format: `"{Intent Label}: {Message Preview}..."`
  - Example: "Generate my first workout: I want to lose weight and have dumbbells at..."
- **Category**: Auto-mapped from selected intent
  - `something_broken` → `bug`
  - `plan_help` → `other` (ambiguous - could be subscription or workout plan)
  - `fix_workout` → `bug` (workout fixes are typically bugs in generation logic)
  - `generate_first_workout` → `other`
- **Priority**: Always set to `medium` (no user selection)

---

## 3. Form Behavior & Interactions

### Modal Behavior:

- **Overlay**: Dark backdrop, clicking closes modal
- **Keyboard**: ESC key closes modal (when not submitting)
- **Body Scroll**: Prevented when modal is open
- **Focus Management**:
  - First input (Your question textarea) auto-focuses when modal opens
  - Previous focus restored when modal closes

### Form States:

- **Initial**: All fields empty (except auto-filled email/name if authenticated)
- **Loading**: If user is authenticated, email/name auto-fill after user data loads
- **Submitting**: Form disabled, submit button shows loading spinner
- **Success**: Success screen displayed with email confirmation and action buttons
- **Error**: Red error message displayed above form

### Success Screen:

After successful submission, the form shows:

- **Title**: "Sent."
- **Message**: "We'll reply to {email}. Usually within 1 business day."
- **Actions**:
  - "Close" button (secondary) - Closes the modal
  - "Ask another question" button (primary) - Resets form and allows another submission
- **No auto-close**: Modal stays open until user clicks an action button

---

## 4. Client-Side Validation (Before Submission)

Validation occurs in this order:

1. **Intent Selection**:
   - ❌ Not selected → Error: "Please select what you need help with"

2. **Your Question / Message**:
   - ❌ Empty → Error: "Your question is required"
   - ❌ Less than 10 characters → Error: "Please provide more details (at least 10 characters)"

3. **Email**:
   - ❌ Empty → Error: "Email is required"
   - ❌ Invalid format → Error: "Please enter a valid email address"

4. **Name**: No validation (optional field)

---

## 5. Submission Flow

### Step 1: Form Submission

- User clicks "Send question" button
- Client-side validation runs
- If validation passes, form data is prepared

### Step 2: Payload Construction

```typescript
{
  subject: string (auto-generated from intent + message preview),
  description: string (trimmed, min 10 chars),
  category: 'billing' | 'technical' | 'feature_request' | 'bug' | 'other' (mapped from intent),
  priority: 'medium' (always),
  email: string (validated email),
  name: string (trimmed, optional),
  metadata: {
    source: 'website',
    source_url: string (current page URL),
    device_type: 'mobile' | 'desktop' | 'tablet',
    subscription_tier: undefined (TODO: implement),
    utm_params: Record<string, string> (from URL query params)
  },
  website: '' (honeypot field - must be empty)
}
```

**Subject Generation Logic**:

- Intent label is retrieved from mapping
- First 60 characters of message are used as preview
- Format: `"{Intent Label}: {Preview}..."` (if preview is 60 chars, "..." is appended)

**Category Mapping**:

- `something_broken` → `bug`
- `plan_help` → `other` (ambiguous - could be subscription or workout plan)
- `fix_workout` → `bug` (workout fixes are typically bugs in generation logic)
- `generate_first_workout` → `other`

### Step 3: API Request

- **Endpoint**: `POST /api/support/create`
- **Headers**: `Content-Type: application/json`
- **Body**: JSON payload (as above)

### Step 4: Server-Side Processing

#### A. Authentication Check

- Attempts to get authenticated user (optional)
- If user exists, uses user data
- If no user, proceeds as anonymous submission

#### B. Request Body Parsing

- Parses JSON from request body
- Logs request details (development only)

#### C. Validation (Server-Side)

1. **Subject**:
   - Must exist, be string, non-empty
   - No minimum length validation (auto-generated, so assumed valid)

2. **Description**:
   - Must exist, be string, non-empty

3. **Category**:
   - Must be one of: `['billing', 'technical', 'feature_request', 'bug', 'other']`

4. **Priority**:
   - Must be one of: `['low', 'medium', 'high', 'urgent']`

5. **Email**:
   - Uses email from body OR user email (if authenticated)
   - Must be valid email format
   - Always required

#### D. Rate Limiting

- **Key**: User ID (if authenticated) or IP address (if anonymous)
- **Production Limits**: 5 requests per hour
- **Development Limits**: 50 requests per 5 minutes
- **Configurable**: Via `SUPPORT_RATE_LIMIT_MAX` and `SUPPORT_RATE_LIMIT_WINDOW_MS` env vars
- **Response if exceeded**: 429 status with "Rate limit exceeded" error

#### E. Firebase Cloud Function Call

- **URL**: From `FIREBASE_CLOUD_FUNCTION_URL` env var
- **Method**: POST
- **Headers**:
  - `Content-Type: application/json`
  - `x-function-key`: From `FIREBASE_FUNCTION_KEY` (if configured)
- **Payload**: Same as API request, with:
  - Validated email (never empty)
  - `website: ''` (honeypot field)
  - No `user_id` (Firebase doesn't have Supabase users)

#### F. Response Handling

- **Success (200)**: Returns Firebase response data
- **Error (400-500)**: Returns error message from Firebase or generic error
- **Rate Limit (429)**: Returns rate limit error with retry-after time

---

## 6. Response Handling (Client-Side)

### Success Response:

1. Success screen displayed with:
   - "Sent." title
   - "We'll reply to {email}. Usually within 1 business day." message
   - "Close" and "Ask another question" buttons
2. Form fields remain visible but disabled
3. Modal stays open (no auto-close)
4. User can click "Ask another question" to reset form and submit again
5. User can click "Close" to close the modal

### Error Response:

1. Error message displayed in red above form
2. Form remains open and enabled
3. User can correct and resubmit
4. Error details logged to console (sanitized in production)

### Common Error Messages:

- `"Please select what you need help with"`
- `"Your question is required"`
- `"Please provide more details (at least 10 characters)"`
- `"Email is required"`
- `"Please enter a valid email address"`
- `"Category must be one of: billing, technical, feature_request, bug, other"`
- `"Priority must be one of: low, medium, high, urgent"`
- `"Rate limit exceeded. Please try again later."`
- `"Validation failed"` (from Firebase)
- `"Failed to create support ticket"` (generic error)

---

## 7. Summary: Field Types

### User-Visible Fields:

1. ✅ **Intent Selection** - Button selector (4 options, required)
2. ✅ **Your Question** - Textarea (min 10 chars, required)
3. ✅ **Email** - Email input (validated format, required)
4. ✅ **Name** - Text input (optional, unlimited length)

### Auto-Generated Fields (Hidden from User):

1. 🔒 **Subject** - Auto-generated from intent + message preview
2. 🔒 **Category** - Auto-mapped from intent selection
3. 🔒 **Priority** - Always set to `medium`

### Auto-Collected Fields (Not user input):

- **Metadata** (automatic):
  - `source`: Always `'website'`
  - `source_url`: Current page URL
  - `device_type`: Detected from user agent (mobile/desktop/tablet)
  - `utm_params`: Parsed from URL query parameters
  - `subscription_tier`: Not implemented (undefined)

---

## 8. Technical Details

### Components:

- **GroupedFAB** (`components/ui/GroupedFAB/GroupedFAB.tsx`): FAB button and menu (label: "Questions?")
- **TicketSubmissionForm** (`components/support/TicketSubmissionForm.tsx`): Form modal with intent-based workflow
- **API Route** (`app/api/support/create/route.ts`): Server-side handler

### Dependencies:

- Supabase authentication (optional - for auto-filling user data)
- Firebase Cloud Functions (for ticket creation)
- Next.js API routes (for request handling)
- Next.js Image component (for profile thumbnail)

### Security Features:

- Honeypot field (`website`) - must be empty (spam protection)
- Rate limiting (prevents abuse)
- Email validation (client and server)
- Input sanitization (trimming, type checking)
- Error logging sanitization (prevents sensitive data exposure)

---

## 9. User Experience Flow

```
1. User sees FAB button (bottom-right) with "Questions?" label
   ↓
2. User clicks FAB → Menu expands
   ↓
3. User clicks "Support" → Modal opens
   ↓
4. Form appears with:
   - Header: "Need help with your workout?" + profile thumbnail
   - Intent selector: 4 large buttons (2x2 grid)
   - Your question textarea (focused, dynamic placeholder)
   - Email field (auto-filled if logged in)
   - Name field (auto-filled if logged in, optional)
   ↓
5. User selects intent button → Placeholder updates
   ↓
6. User fills out question, email, and optionally name
   ↓
7. User clicks "Send question"
   ↓
8a. If validation fails → Error message shown, form stays open
8b. If validation passes → Loading spinner, form disabled
   ↓
9. API processes request
   ↓
10a. If error → Error message shown, form re-enabled
10b. If success → Success screen shown with email confirmation
   ↓
11. User clicks "Close" or "Ask another question"
```

---

## 10. Environment Variables

### Required:

- `FIREBASE_CLOUD_FUNCTION_URL` - Firebase Cloud Function endpoint

### Optional:

- `FIREBASE_FUNCTION_KEY` - Authentication key for Firebase function
- `SUPPORT_RATE_LIMIT_MAX` - Override max requests (default: 5 prod, 50 dev)
- `SUPPORT_RATE_LIMIT_WINDOW_MS` - Override time window in milliseconds

---

## 11. Validation Summary Table

| Field            | Type              | Required | Min Length | Max Length | Format/Options                                                               |
| ---------------- | ----------------- | -------- | ---------- | ---------- | ---------------------------------------------------------------------------- |
| Intent Selection | Button selector   | ✅ Yes   | N/A        | N/A        | generate_first_workout, fix_workout, plan_help, something_broken             |
| Your Question    | Free text         | ✅ Yes   | 10 chars   | None       | Any text                                                                     |
| Email            | Free text (email) | ✅ Yes   | N/A        | N/A        | Valid email format                                                           |
| Name             | Free text         | ❌ No    | N/A        | None       | Any text                                                                     |
| Subject (auto)   | Auto-generated    | ✅ Yes   | N/A        | N/A        | "{Intent Label}: {Message Preview}..."                                       |
| Category (auto)  | Auto-mapped       | ✅ Yes   | N/A        | N/A        | bug, other (from intent - plan_help and generate_first_workout map to other) |
| Priority (auto)  | Auto-set          | ✅ Yes   | N/A        | N/A        | Always "medium"                                                              |

---

## 12. Intent-to-Category Mapping

| User Intent (Button)          | Internal Category | Use Case                                                             |
| ----------------------------- | ----------------- | -------------------------------------------------------------------- |
| "Generate my first workout"   | `other`           | New users needing workout generation help                            |
| "Fix my workout"              | `bug`             | Workout generation issues (incorrect results, wrong equipment, etc.) |
| "Which plan should I choose?" | `other`           | Plan selection questions (subscription or workout plan)              |
| "Something isn't working"     | `bug`             | Technical issues or broken functionality                             |

---

**Last Updated**: January 2025  
**Version**: 2.0  
**Status**: ✅ Updated to reflect intent-based conversational interface
