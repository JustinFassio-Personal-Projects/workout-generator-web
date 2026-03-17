/**
 * Image services for exercise image generation and storage.
 */

export { ImageGenerationService } from "./ImageGenerationService";
export { ImageStorageService } from "./ImageStorageService";
export { MasterImageService } from "./MasterImageService";
export { ImageMappingService } from "./ImageMappingService";

// Re-export commonly used functions from ImageGenerationService
export {
  getMasterImage,
  generateExerciseImage,
  generateWorkoutImages,
  saveMasterImage,
} from "./ImageGenerationService";

// Re-export commonly used functions from ImageStorageService
export {
  uploadBase64Image,
  deleteImage,
  getImageUrl,
  generateStoragePath,
  generateMasterImagePath,
} from "./ImageStorageService";

// Re-export commonly used functions from MasterImageService
export {
  listMasterImages,
  markAsMasterImage,
  updateQualityScore,
  replaceMasterImage,
  deleteMasterImage,
  getImagesPendingReview,
  getMasterImageStats,
} from "./MasterImageService";

// Re-export commonly used functions from ImageMappingService
export {
  getImageForExercise,
  mapImagesToWorkout,
  updateWorkoutWithImages,
  batchSyncAllWorkouts,
} from "./ImageMappingService";

// Re-export client-side image mapping functions
export {
  mapWorkoutImages,
  mapWorkoutImagesBatch,
} from "./ImageMappingService.client";
