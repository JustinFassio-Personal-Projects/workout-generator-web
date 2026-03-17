// Remote state is recommended so Terraform state isn't tied to one laptop.
// Note: Terraform backend blocks do not accept variables, so you'll need to
// hardcode the bucket name here (or use a partial backend config).
//
// Example (GCS backend):
// terraform {
//   backend "gcs" {
//     bucket = "REPLACE_WITH_YOUR_TF_STATE_BUCKET"
//     prefix = "ai-workout-generator-hub/firestore"
//   }
// }

