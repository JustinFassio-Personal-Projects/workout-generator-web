#!/bin/bash
# Grant App Hosting service account access to secrets
# Run: ./grant-secret-access.sh

SERVICE_ACCOUNT="service-363110423518@gcp-sa-firebaseapphosting.iam.gserviceaccount.com"
PROJECT_ID="ai-workout-generator-hub"

SECRETS=(
  "firebase-api-key"
  "firebase-auth-domain"
  "firebase-project-id"
  "firebase-storage-bucket"
  "firebase-messaging-sender-id"
  "firebase-app-id"
  "firebase-measurement-id"
)

echo "Granting App Hosting service account access to secrets..."
echo "Service Account: $SERVICE_ACCOUNT"
echo "Project: $PROJECT_ID"
echo ""

for SECRET in "${SECRETS[@]}"; do
  echo "Granting access to: $SECRET"
  gcloud secrets add-iam-policy-binding "$SECRET" \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/secretmanager.secretAccessor" \
    --project="$PROJECT_ID"
  if [ $? -eq 0 ]; then
    echo "✓ Successfully granted access to $SECRET"
  else
    echo "✗ Failed to grant access to $SECRET"
  fi
  echo ""
done

echo "Done! All secrets should now be accessible by App Hosting."
