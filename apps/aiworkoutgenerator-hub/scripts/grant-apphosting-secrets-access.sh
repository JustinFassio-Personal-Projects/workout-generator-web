#!/bin/bash
# Grant App Hosting backend access to all secrets in apphosting.yaml.
# Fixes: "Error resolving secret version with name=.../secrets/<name>/versions/latest"
#
# Run from repo root: ./scripts/grant-apphosting-secrets-access.sh
# Requires: firebase CLI logged in with project permissions.

set -e

BACKEND_ID="${1:-aiworkoutgenerator-hub}"

# Comma-separated list matching apphosting.yaml (single argument for Firebase CLI)
SECRETS="firebase-api-key,firebase-auth-domain,firebase-project-id,firebase-storage-bucket,firebase-messaging-sender-id,firebase-app-id,firebase-measurement-id,posthog-key,posthog-host,google-ai-api-key,stripe-secret-key,stripe-publishable-key,stripe-basic-price-id,stripe-pro-price-id,stripe-elite-price-id,stripe-coach-price-id,stripe-coach-pro-price-id,stripe-webhook-secret,firebase-cloud-function-url,firebase-service-account-key,sentry-dsn,sentry-auth-token,sentry-org,sentry-project,sentry-url"

echo "Granting App Hosting backend '$BACKEND_ID' access to all secrets..."
firebase apphosting:secrets:grantaccess --backend "$BACKEND_ID" "$SECRETS"
echo "Done. Wait 2-3 minutes, then trigger a new build (push or redeploy)."
