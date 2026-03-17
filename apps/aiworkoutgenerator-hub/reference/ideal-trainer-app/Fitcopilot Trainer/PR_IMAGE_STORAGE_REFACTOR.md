# PR: Refactor Image Storage to Match Chef App Pattern

## Summary

Refactored the trainer app's image generation and storage workflow to match the chef app's approach:

- Store base64 data URLs directly in database (no file storage)
- Lazy generation on-demand when viewing workouts/exercises
- Simplified save/load logic to work directly with base64 strings

## Changes

### Database Schema

- ✅ Added `image_url TEXT` column to `trainer.workout_exercises` table

### Services (`services/dbService.ts`)

- ✅ Removed `uploadImageToStorage()` function (no longer using Supabase Storage)
- ✅ Removed `auditImageStorage()` and `migrateBase64ImagesToStorage()` functions
- ✅ Updated `saveWorkoutToDb()` to save base64 directly (removed upload calls and validation)
- ✅ Updated `getUserWorkouts()` to exclude images by default (prevents JSON parsing errors with large base64 strings)
- ✅ Added `includeImages` parameter to `getUserWorkouts()` for optional image loading

### Components (`components/WorkoutDisplay.tsx`)

- ✅ Simplified workout image generation to match chef app's lazy generation pattern
- ✅ Simplified exercise image generation (sequential, with proper guards)
- ✅ Removed complex base64/URL recognition logic
- ✅ Added guards to prevent duplicate generation

### Image Generation (`services/geminiService.ts`)

- ✅ `generateWorkoutImage()` and `generateExerciseImage()` return base64 data URLs
- ✅ No changes needed - already working correctly

## Key Fixes

1. **Exercise images not generating for new workouts**
   - Fixed: Use unique key based on `plan.id` or `plan.title + plan.sections.length` for new workouts

2. **Workout image generating twice**
   - Fixed: Added `workoutImageGeneratingRef` guard

3. **JSON parsing errors when loading workout history**
   - Fixed: Exclude images from `getUserWorkouts()` by default (images loaded via `getWorkoutById()` when viewing)

## Testing

- ✅ Type checking passes
- ✅ All tests pass (16/16)
- ✅ Build succeeds
- ✅ Formatting correct
- ✅ Manual testing: Images generate, save, and load correctly

## Breaking Changes

None - this is a refactor that maintains the same external API.

## Migration Notes

- Existing workouts with storage URLs will need images regenerated (they'll generate lazily on next view)
- Base64 images already in database will work immediately
- No Supabase Storage bucket needed
