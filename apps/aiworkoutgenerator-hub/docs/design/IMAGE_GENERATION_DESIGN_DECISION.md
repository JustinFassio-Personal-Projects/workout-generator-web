# Image Generation Design Decision

## Overview

This document explains the design decision to decouple image generation functionality from the "Request Images" button and make it certification-only.

## Current State

The "Request Images" button (`ImageGenerationButton`) is now **certification-only**. It opens the certification workflow modal where users can submit their workout for coach review and image certification.

## Design Rationale

### Problem Statement

1. **Image Generation Quality**: Currently, AI-generated exercise images are hit-and-miss. Exercises are often generated with incorrect form or the wrong exercise entirely.

2. **User Experience**: Users need reliable, accurate exercise images that demonstrate proper form. Uncertified, potentially incorrect images can lead to poor workout execution and potential injury.

3. **Future Vision**: When image generation becomes more accurate, users should be able to generate additional, uncertified images for specific exercises to help them with particular movements. However, this should be separate from the certification workflow.

### Solution

1. **Certification-Only Button**: The "Request Images" button now exclusively opens the certification workflow. This ensures all images are reviewed and certified by Coach Justin before being used in workouts.

2. **Decoupled Image Generation**: Image generation functionality has been completely removed from the button component. The underlying framework and services remain intact for future use.

3. **Future Image Gallery**: When image generation quality improves, a new image gallery feature will be added where users can:
   - View certified images for exercises
   - Generate additional, uncertified images for specific exercises
   - Use these uncertified images as personal reference material

## Implementation Details

### Component Changes

- **Removed**: All image generation logic, state management, progress tracking, tier validation, and error handling
- **Simplified**: Component now only handles certification workflow via `onRequestImages` callback
- **Status Display**: Shows "Images Certified" when `workout.has_images` is true

### Preserved Framework

The following components and services remain intact for future use:

- `src/services/image/ImageGenerationService.ts` - Image generation service
- `src/app/api/image/generate/route.ts` - Image generation API endpoint
- `src/app/api/workouts/generate-images/route.ts` - Workout image generation API
- `src/lib/image-generation-config.ts` - Image generation configuration
- Subscription tier limits and validation logic

### Migration Path

When ready to implement the image gallery feature:

1. Create a new `ExerciseImageGallery` component
2. Integrate with existing `ImageGenerationService`
3. Add UI for generating uncertified images per exercise
4. Store uncertified images separately from certified images
5. Display both certified and uncertified images in the gallery

## User Flow

### Current Flow (Certification-Only)

1. User clicks "Request Images"
2. Certification modal opens
3. User submits workout for coach review
4. Coach reviews and certifies images
5. Certified images are added to workout
6. Button shows "Images Certified"

### Future Flow (With Image Gallery)

1. User views exercise in workout
2. Opens exercise image gallery
3. Sees certified images (if available)
4. Optionally generates additional uncertified images
5. Uses uncertified images as personal reference
6. Certified images remain the source of truth for workout display

## Benefits

1. **Quality Assurance**: All workout images are certified, ensuring accuracy
2. **Clear Separation**: Certification workflow is distinct from image generation
3. **Future Flexibility**: Framework ready for future image gallery feature
4. **User Safety**: Prevents incorrect form demonstrations from being used in workouts
5. **Simplified UX**: Single, clear purpose for the button

## Related Documentation

- `docs/AI_PROMPTS_AND_DATA_FLOW.md` - AI image generation flow
- `docs/admin/PROMPT_SEEDING_GUIDE.md` - Image prompt configuration
- `docs/setup/SECRETS_SETUP.md` - Image generation service setup

## Date

December 2024
