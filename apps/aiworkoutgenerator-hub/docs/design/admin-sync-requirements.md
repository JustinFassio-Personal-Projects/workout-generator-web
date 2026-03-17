# Admin Repository Sync Requirements

## Summary

To sync the admin image generation workflow with the hub (user frontend), the admin repository needs to implement **one of three sync mechanisms** when images are certified. The hub will handle the actual workout updates, but admin must trigger the sync.

---

## Required Actions for Admin

### Option 1: Firestore Trigger (Recommended - No Admin Changes Needed)

**Admin Action**: ✅ **None required**

**How it works**:

- Hub implements a Firestore trigger (Cloud Function) that listens to `master_exercise_images` document updates
- When admin certifies an image (updates `status="certified"`), the trigger automatically fires
- Hub syncs all affected workouts automatically

**Admin Benefits**:

- Zero code changes in admin repository
- Automatic sync without additional API calls
- Most reliable and scalable approach

**Implementation**: Hub team implements this. Admin just needs to ensure certification updates the document correctly (which it already does).

---

### Option 2: Webhook Call (Requires Admin Changes)

**Admin Action**: ⚠️ **Add webhook call after certification**

**What to implement**:

In `app/actions/exercise-images.ts`, update `certifyExerciseImage()`:

```typescript
export async function certifyExerciseImage(imageId: string, position: number) {
  // ... existing certification logic ...

  // After successful certification, trigger hub sync
  const hubWebhookUrl = process.env.HUB_SYNC_WEBHOOK_URL;
  if (hubWebhookUrl) {
    try {
      await fetch(hubWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exerciseName: imageData.exercise_name, // Already normalized
          action: "certified",
          imageId: imageId,
        }),
      });
    } catch (error) {
      // Log but don't fail certification if webhook fails
      console.error("Failed to notify hub of certification:", error);
    }
  }

  return { success: true };
}
```

**Environment Variable Needed**:

- `HUB_SYNC_WEBHOOK_URL`: Hub endpoint URL (e.g., `https://aiworkoutgen.app/api/admin/sync-exercise-images/webhook`)

**Hub Requirements**:

- Hub must implement webhook endpoint that accepts `exerciseName` and syncs workouts
- Hub must authenticate webhook requests (shared secret or service account)

**Pros**:

- Admin has control over when sync happens
- Can include additional metadata

**Cons**:

- Requires admin code changes
- Admin must know hub endpoint URL
- Network dependency (webhook could fail)

---

### Option 3: No Action (Hub Polls - Not Recommended)

**Admin Action**: ✅ **None required**

**How it works**:

- Hub implements scheduled Cloud Function that runs periodically (e.g., every 5 minutes)
- Hub queries for recently certified images
- Hub syncs workouts that need updates

**Admin Benefits**:

- No code changes needed

**Cons**:

- Not real-time (5+ minute delay)
- Less efficient (polling vs event-driven)
- Hub must implement polling logic

---

## Critical Coordination Requirements

### 1. Normalization Must Match Exactly

**Current Status**: ✅ **Already aligned**

Both repositories use identical normalization:

- Admin: `normalizeExerciseName()` → `.trim()` only
- Hub: `trimExerciseName()` → `.trim()` only

**Action Required**:

- ✅ **None** - Already correct
- ⚠️ **Future changes**: If either side changes normalization, both must change together

**Coordination Rule**:

- Any changes to normalization function must be coordinated
- Case-sensitive matching is intentional (both sides must maintain this)

### 2. Exercise Name Consistency

**Current Status**: ⚠️ **Potential risk**

**Issue**: Workout generation in hub may produce exercise names with different casing than admin stores them.

**Example**:

- Admin certifies: `"Arm Circles"` (stored as-is)
- Hub generates workout: `"arm circles"` (lowercase)
- **Result**: No match, image not found

**Admin Action**:

- ✅ **None required** (hub must ensure workout generation uses consistent casing)
- ⚠️ **Monitor**: If images aren't matching, check casing differences

**Recommendation**:

- Document expected casing conventions
- Or consider case-insensitive matching (requires data migration)

### 3. Image Deletion Handling

**Current Status**: ❌ **Not handled**

**Issue**: When admin deletes an image from `master_exercise_images`, hub workouts retain stale `image_url` values.

**Admin Action Options**:

**Option A**: Trigger cleanup webhook on deletion

```typescript
// In admin delete function
await fetch(HUB_SYNC_WEBHOOK_URL, {
  method: "POST",
  body: JSON.stringify({
    exerciseName: deletedImage.exercise_name,
    action: "deleted",
  }),
});
```

**Option B**: Hub implements Firestore trigger on deletion (recommended)

- Hub listens for document deletions
- Automatically clears `image_url` from affected workouts
- No admin changes needed

**Recommendation**: Option B (hub handles it)

---

## Implementation Checklist for Admin Team

### If Using Option 1 (Firestore Trigger - Recommended)

- [x] **No code changes needed** (hub implements trigger, admin just certifies images)
- [ ] Verify certification correctly updates `status="certified"` (already working)
- [ ] Coordinate with hub team on trigger implementation
- [ ] Test: Certify image → verify hub syncs within seconds

### If Using Option 2 (Webhook)

- [ ] Add webhook call to `certifyExerciseImage()` server action
- [ ] Add `HUB_SYNC_WEBHOOK_URL` environment variable
- [ ] Add error handling (don't fail certification if webhook fails)
- [ ] Get hub webhook endpoint URL and authentication method
- [ ] Test: Certify image → verify webhook called → verify hub syncs
- [ ] Add logging for webhook success/failure

### For Image Deletion (Optional)

- [ ] Decide on deletion cleanup approach (webhook vs hub trigger)
- [ ] If webhook: Add deletion webhook call
- [ ] Test: Delete image → verify hub clears broken URLs

---

## Testing Requirements

### Test Case 1: New Image Certification

1. Admin certifies new image for exercise "Test Exercise"
2. Verify hub syncs all workouts containing "Test Exercise"
3. Verify workouts show new image within sync window

### Test Case 2: Image Re-certification (Re-added)

1. Admin deletes image for "Arm Circles"
2. Admin re-adds and certifies "Arm Circles" image
3. Verify hub syncs all workouts with "Arm Circles"
4. Verify workouts show new image

### Test Case 3: Position Change

1. Admin changes position of certified image (e.g., position 2 → position 1)
2. Verify hub updates workouts to use new primary image

### Test Case 4: Image Deletion

1. Admin deletes certified image
2. Verify hub clears `image_url` from affected workouts
3. Verify workouts no longer show broken image URLs

---

## Environment Variables (If Using Webhook)

Add to admin repository `.env.local` and production:

```bash
# Hub sync webhook URL (if using webhook approach)
HUB_SYNC_WEBHOOK_URL=https://aiworkoutgen.app/api/admin/sync-exercise-images/webhook

# Optional: Webhook authentication secret
HUB_SYNC_WEBHOOK_SECRET=your-shared-secret-here
```

---

## Code Changes Summary

### Minimal Changes (Webhook Option)

**File**: `app/actions/exercise-images.ts`

**Function**: `certifyExerciseImage()`

**Change**: Add webhook call after successful certification:

```typescript
// After updating document to certified
if (process.env.HUB_SYNC_WEBHOOK_URL) {
  await fetch(process.env.HUB_SYNC_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.HUB_SYNC_WEBHOOK_SECRET}`,
    },
    body: JSON.stringify({
      exerciseName: imageData.exercise_name,
      action: "certified",
      imageId: imageId,
    }),
  }).catch((error) => {
    // Log but don't fail certification
    console.error("Hub sync webhook failed:", error);
  });
}
```

**Estimated Effort**: 15-30 minutes

---

## Recommendation

**Use Option 1 (Firestore Trigger)**:

- ✅ No admin code changes
- ✅ Most reliable
- ✅ Automatic and real-time
- ✅ No network dependencies
- ✅ Scales automatically

**Hub team implements**: Firestore trigger Cloud Function that listens to `master_exercise_images` updates and syncs workouts automatically.

**Admin team action**: ✅ **None required** - just continue certifying images as normal.

---

## Questions to Coordinate with Hub Team

1. **Which sync mechanism will hub implement?**
   - Firestore trigger (recommended)
   - Webhook endpoint
   - Scheduled polling

2. **If webhook**: What's the endpoint URL and authentication method?

3. **Normalization changes**: How will we coordinate if normalization needs to change?

4. **Casing conventions**: Should we document expected casing for exercise names?

5. **Deletion handling**: Who handles cleanup when images are deleted?

---

**Document Version**: 1.0  
**Last Updated**: January 2026  
**For**: Admin Repository Team  
**Related**: [`docs/design/admin-exercise-image-workflow.md`](admin-exercise-image-workflow.md)
