variable "project_id" {
  description = "The GCP project ID where Firestore will be provisioned"
  type        = string
  default     = "ai-workout-generator-hub"
}

variable "region" {
  description = "The GCP region for Firestore (location_id)"
  type        = string
  // Keep this aligned with the immutable location of the existing (default) Firestore database.
  default     = "asia-southeast1"
}
