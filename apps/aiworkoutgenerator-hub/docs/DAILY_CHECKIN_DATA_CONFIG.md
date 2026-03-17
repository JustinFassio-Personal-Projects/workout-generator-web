# Daily Check-In Data Configuration

## Current Configuration

### Data Storage: **Firestore Database** (Not Local Cache)

The daily check-in data is **saved directly to Firestore**, not just cached locally. Here's how it works:

1. **Storage Location**: `user_daily_state` collection in Firestore
2. **Document ID Format**: `{userId}_{YYYY-MM-DD}` (e.g., `user123_2024-12-30`)
3. **Real-time Sync**: Uses Firestore's `onSnapshot` listener for real-time updates

### Timestamps

The data includes **both date and time**:

- **`date`**: ISO date string (YYYY-MM-DD format) - e.g., `"2024-12-30"`
- **`saved_at_datetime`**: ISO 8601 datetime string (YYYY-MM-DDTHH:mm:ss.sssZ) - Human-readable date and time when check-in was saved - e.g., `"2024-12-30T14:30:45.123Z"`
- **`created_at`**: Firestore `serverTimestamp()` - Full timestamp when document was first created
- **`updated_at`**: Firestore `serverTimestamp()` - Full timestamp when document was last updated
- **`time_of_day`**: Computed field based on current time:
  - `"early_morning"` (6-9 AM)
  - `"morning"` (9 AM-12 PM)
  - `"afternoon"` (12-5 PM)
  - `"evening"` (5-9 PM)
  - `"night"` (9 PM-6 AM)

**Note**: The `saved_at_datetime` field is displayed in the UI showing when the check-in was last saved, formatted in the user's local timezone.

### Data Flow

1. **User submits form** → `handleSubmit()` in `DailyCheckInForm.tsx`
2. **Validation** → Zod schema validates the input
3. **Firestore write** → `DailyStateService.upsertUserDailyState()` uses `setDoc()` with `merge: true`
4. **Server timestamps** → Firestore server adds `created_at` and `updated_at` timestamps
5. **Real-time update** → `onSnapshot` listener updates local state when Firestore document changes
6. **Success notification** → Toast notification appears (now configured with Toaster component)

### Key Points

- ✅ **Data is persisted to Firestore** - Not just cached locally
- ✅ **Timestamps are server-side** - Uses `serverTimestamp()` for accurate time
- ✅ **Real-time sync** - Changes are reflected immediately via `onSnapshot`
- ✅ **Merge strategy** - Uses `setDoc(..., { merge: true })` to update existing documents
- ✅ **Date-based documents** - One document per user per day

### Success Message

When you click "Save check-in", you'll now see:

- **Success toast**: "Check-in saved successfully!"
- **Description**: "Your daily check-in for {dateISO} has been saved. Redirecting to workout generation..."
- **Duration**: 2 seconds (then auto-redirects to workout generation page after 1.5 seconds)

The toast notification is now properly configured with the `Toaster` component in the app layout. After saving, users are automatically redirected to the workout generation page.
