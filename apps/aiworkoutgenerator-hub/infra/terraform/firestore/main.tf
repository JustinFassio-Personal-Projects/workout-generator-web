provider "google" {
  project = var.project_id
  region  = var.region
}

resource "google_project_service" "firestore" {
  project = var.project_id
  for_each = toset([
    "firestore.googleapis.com",
    "firebaserules.googleapis.com",
  ])

  service            = each.key
  disable_on_destroy = false
}

resource "google_firestore_database" "default" {
  project          = var.project_id
  name             = "(default)"
  location_id      = var.region
  type             = "FIRESTORE_NATIVE"
  // Keep this aligned with the immutable concurrency mode of the existing (default) Firestore database.
  concurrency_mode = "PESSIMISTIC"

  depends_on = [
    google_project_service.firestore
  ]
}

