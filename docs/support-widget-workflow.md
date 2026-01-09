# Support/Feedback Widget - Complete Workflow Documentation

## Overview

The support/feedback widget is a modal form accessible via a Floating Action Button (FAB) that allows users (both authenticated and anonymous) to submit support tickets, bug reports, and feature requests.

---

## 1. Entry Point & Trigger

### User Interaction Flow:

1. **FAB Button** (Floating Action Button) appears on all pages (bottom-right corner)
   - Icon: `HelpCircle` (question mark in circle)
   - Always visible, rendered via React Portal to `document.body`

2. **User clicks FAB button** → Menu expands with options:
   - **"Support"** option (Headphones icon) - Currently active
   - **"Ask"** option (Brain icon) - Disabled (ChatKit not configured)

3. **User clicks "Support"** → Support form modal opens

---

## 2. Form Fields & Questions

### Field 1: **Subject** (Required)

- **Type**: Free text input
- **Label**: "Subject \*"
- **Placeholder**: "Brief description of your feedback"
- **Validation Rules**:
  - Cannot be empty
  - Must be at least 5 characters long (trimmed)
  - Client-side validation before submission
  - Server-side validation enforces same rules
- **Default Value**: Empty string
- **Auto-filled**: No

### Field 2: **Category** (Required)

- **Type**: Dropdown select (NOT free text)
- **Label**: "Category \*"
- **Options** (fixed list):
  1. `"technical"` → Display: "Technical Support"
  2. `"bug"` → Display: "Bug Report"
  3. `"feature_request"` → Display: "Feature Request"
  4. `"billing"` → Display: "Billing"
  5. `"other"` → Display: "Other"
- **Default Value**: `"technical"` (Technical Support)
- **Validation**: Must be one of the 5 valid options (server validates)

### Field 3: **Priority** (Required)

- **Type**: Dropdown select (NOT free text)
- **Label**: "Priority \*"
- **Options** (fixed list):
  1. `"low"` → Display: "Low"
  2. `"medium"` → Display: "Medium"
  3. `"high"` → Display: "High"
  4. `"urgent"` → Display: "Urgent"
- **Default Value**: `"medium"` (Medium)
- **Validation**: Must be one of the 4 valid options (server validates)

### Field 4: **Description** (Required)

- **Type**: Free text textarea
- **Label**: "Description \*"
- **Placeholder**: "Please provide as much detail as possible..."
- **Rows**: 6
- **Validation Rules**:
  - Cannot be empty (trimmed)
  - No maximum length specified
- **Default Value**: Empty string
- **Auto-filled**: No

### Field 5: **Email** (Required)

- **Type**: Email input (free text, but validated as email format)
- **Label**: "Email \*"
- **Placeholder**: "your.email@example.com"
- **Validation Rules**:
  - Cannot be empty
  - Must be valid email format (client and server validation)
  - Always required (even for authenticated users)
- **Default Value**: Empty string
- **Auto-filled**: Yes (if user is authenticated)
  - Uses: `user.email` from Supabase authentication
  - If user email is missing, field is cleared (not preserved from previous value)

### Field 6: **Name** (Optional)

- **Type**: Free text input
- **Label**: "Name (optional)"
- **Placeholder**: "Your name"
- **Validation Rules**: None (optional field)
- **Default Value**: Empty string
- **Auto-filled**: Yes (if user is authenticated)
  - Uses: `user.user_metadata?.full_name` or `user.user_metadata?.name`
  - If user name is missing, field is cleared (not preserved from previous value)

---

## 3. Form Behavior & Interactions

### Modal Behavior:

- **Overlay**: Dark backdrop, clicking closes modal
- **Keyboard**: ESC key closes modal (when not submitting)
- **Body Scroll**: Prevented when modal is open
- **Focus Management**:
  - First input (Subject) auto-focuses when modal opens
  - Previous focus restored when modal closes

### Form States:

- **Initial**: All fields empty (except defaults for category/priority)
- **Loading**: If user is authenticated, email/name auto-fill after user data loads
- **Submitting**: Form disabled, submit button shows loading spinner
- **Success**: Green success message, form auto-closes after 2 seconds
- **Error**: Red error message displayed above form

---

## 4. Client-Side Validation (Before Submission)

Validation occurs in this order:

1. **Subject**:
   - ❌ Empty → Error: "Subject is required"
   - ❌ Less than 5 characters → Error: "Subject must be at least 5 characters long"

2. **Description**:
   - ❌ Empty → Error: "Description is required"

3. **Email**:
   - ❌ Empty → Error: "Email is required"
   - ❌ Invalid format → Error: "Please enter a valid email address"

4. **Category & Priority**:
   - Validated by HTML5 `required` attribute (browser validation)
   - Server also validates against allowed values

---

## 5. Submission Flow

### Step 1: Form Submission

- User clicks "Submit Feedback" button
- Client-side validation runs
- If validation passes, form data is prepared

### Step 2: Payload Construction

```typescript
{
  subject: string (trimmed, min 5 chars),
  description: string (trimmed),
  category: 'billing' | 'technical' | 'feature_request' | 'bug' | 'other',
  priority: 'low' | 'medium' | 'high' | 'urgent',
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
   - Must be at least 5 characters (trimmed)

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

1. Success message displayed: "Thank you! Your feedback has been submitted successfully."
2. Form fields reset to defaults
3. Modal auto-closes after 2 seconds
4. Form state cleared

### Error Response:

1. Error message displayed in red above form
2. Form remains open
3. User can correct and resubmit
4. Error details logged to console (sanitized in production)

### Common Error Messages:

- `"Subject is required"`
- `"Subject must be at least 5 characters long"`
- `"Description is required"`
- `"Valid email is required"`
- `"Category must be one of: billing, technical, feature_request, bug, other"`
- `"Priority must be one of: low, medium, high, urgent"`
- `"Rate limit exceeded. Please try again later."`
- `"Validation failed"` (from Firebase)
- `"Failed to create support ticket"` (generic error)

---

## 7. Summary: Field Types

### Free Text Fields (User types freely):

1. ✅ **Subject** - Text input (min 5 chars)
2. ✅ **Description** - Textarea (unlimited length)
3. ✅ **Email** - Email input (validated format)
4. ✅ **Name** - Text input (optional, unlimited length)

### Dropdown/Select Fields (Fixed options):

1. 📋 **Category** - Select dropdown (5 options)
2. 📋 **Priority** - Select dropdown (4 options)

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

- **GroupedFAB** (`components/ui/GroupedFAB/GroupedFAB.tsx`): FAB button and menu
- **TicketSubmissionForm** (`components/support/TicketSubmissionForm.tsx`): Form modal
- **API Route** (`app/api/support/create/route.ts`): Server-side handler

### Dependencies:

- Supabase authentication (optional - for auto-filling user data)
- Firebase Cloud Functions (for ticket creation)
- Next.js API routes (for request handling)

### Security Features:

- Honeypot field (`website`) - must be empty (spam protection)
- Rate limiting (prevents abuse)
- Email validation (client and server)
- Input sanitization (trimming, type checking)
- Error logging sanitization (prevents sensitive data exposure)

---

## 9. User Experience Flow

```
1. User sees FAB button (bottom-right)
   ↓
2. User clicks FAB → Menu expands
   ↓
3. User clicks "Support" → Modal opens
   ↓
4. Form appears with:
   - Subject field (focused)
   - Category dropdown (default: Technical Support)
   - Priority dropdown (default: Medium)
   - Description textarea
   - Email field (auto-filled if logged in)
   - Name field (auto-filled if logged in, optional)
   ↓
5. User fills out form
   ↓
6. User clicks "Submit Feedback"
   ↓
7a. If validation fails → Error message shown, form stays open
7b. If validation passes → Loading spinner, form disabled
   ↓
8. API processes request
   ↓
9a. If error → Error message shown, form re-enabled
9b. If success → Success message, form closes after 2 seconds
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

| Field       | Type              | Required | Min Length | Max Length | Format/Options                                  |
| ----------- | ----------------- | -------- | ---------- | ---------- | ----------------------------------------------- |
| Subject     | Free text         | ✅ Yes   | 5 chars    | None       | Any text                                        |
| Category    | Dropdown          | ✅ Yes   | N/A        | N/A        | technical, bug, feature_request, billing, other |
| Priority    | Dropdown          | ✅ Yes   | N/A        | N/A        | low, medium, high, urgent                       |
| Description | Free text         | ✅ Yes   | 1 char     | None       | Any text                                        |
| Email       | Free text (email) | ✅ Yes   | N/A        | N/A        | Valid email format                              |
| Name        | Free text         | ❌ No    | N/A        | None       | Any text                                        |

---

**Last Updated**: January 2025  
**Version**: 1.0
