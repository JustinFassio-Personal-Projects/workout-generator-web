#!/usr/bin/env bash
# Production Auth Errors Audit Script
# Runs Phase 1 and Phase 5 checks from the audit plan.
# Requires: gcloud auth login, firebase login
#
# Run from repo root or apps/aiworkoutgenerator-hub:
#   bash apps/aiworkoutgenerator-hub/scripts/audit-production-auth.sh
#
# See: docs/AUDIT_REPORT_PRODUCTION_AUTH_ERRORS.md

set -e

PROJECT="${PROJECT:-ai-workout-generator-hub}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$APP_DIR/../.." 2>/dev/null && pwd || echo "$APP_DIR")"

cd "$REPO_ROOT"

echo "=== Production Auth Errors Audit ==="
echo "Project: $PROJECT"
echo ""

# Phase 1: Firebase project alignment
echo "--- Phase 1: Firebase Project Alignment ---"
CLIENT_PID=""
SA_PID=""

if command -v gcloud &>/dev/null; then
  echo "1a. Client project ID (firebase-project-id):"
  CLIENT_PID=$(gcloud secrets versions access latest --secret=firebase-project-id --project="$PROJECT" 2>/dev/null || true)
  if [ -n "$CLIENT_PID" ]; then
    echo "    $CLIENT_PID"
  else
    echo "    (failed: run 'gcloud auth login' or check project access)"
  fi

  echo ""
  echo "1b. Service account (Firebase Admin SDK identity—this one needs Firestore IAM):"
  SA_JSON=$(gcloud secrets versions access latest --secret=firebase-service-account-key --project="$PROJECT" 2>/dev/null || true)
  if [ -n "$SA_JSON" ]; then
    SA_PID=$(echo "$SA_JSON" | jq -r '.project_id // empty' 2>/dev/null || true)
    SA_EMAIL=$(echo "$SA_JSON" | jq -r '.client_email // empty' 2>/dev/null || true)
    if [ -n "$SA_PID" ]; then
      echo "    project_id: $SA_PID"
    else
      echo "    project_id: (jq failed or missing)"
    fi
    if [ -n "$SA_EMAIL" ]; then
      echo "    client_email: $SA_EMAIL"
      echo "    → Grant roles/datastore.user to this identity for Firestore (ensure, waiver, workout-counts)"
    else
      echo "    client_email: (jq failed or missing)"
    fi
  else
    echo "    (failed: run 'gcloud auth login' or check project access)"
  fi

  echo ""
  if [ -n "$CLIENT_PID" ] && [ -n "$SA_PID" ]; then
    if [ "$CLIENT_PID" = "$SA_PID" ]; then
      echo "1c. MATCH: Project IDs align (no mismatch)"
    else
      echo "1c. MISMATCH: Client=$CLIENT_PID vs ServiceAccount=$SA_PID"
      echo "    → Likely root cause for 401 map-images, 500 ensure/workout-counts"
    fi
  else
    echo "1c. (skip: could not retrieve both values)"
  fi
else
  echo "gcloud not found. Install Google Cloud SDK to run Phase 1."
fi

echo ""
echo "--- Phase 5: Migration Checks ---"

if command -v firebase &>/dev/null; then
  echo "5a. App Hosting backends:"
  firebase apphosting:backends:list --project "$PROJECT" -j 2>/dev/null | jq -r '.[] | "    rootDirectory: \(.config.rootDirectory // "N/A")\n    backendId: \(.name // .id // "N/A")"' 2>/dev/null || {
    echo "    (failed: run 'firebase login' and ensure project access)"
  }
else
  echo "firebase CLI not found. Install Firebase CLI to run Phase 5a."
fi

echo ""
if command -v gcloud &>/dev/null; then
  echo "5b. Secrets in project (must include firebase-project-id, firebase-service-account-key):"
  gcloud secrets list --project="$PROJECT" --format="table(name.basename())" 2>/dev/null | head -35 || {
    echo "    (failed: run 'gcloud auth login')"
  }
else
  echo "gcloud not found. Skipping 5b."
fi

echo ""
echo "--- Phase 4: Sentry Tunnel (optional) ---"
echo "Test manually: curl -X POST 'https://app.aiworkoutgenerator.com/monitoring?o=...&p=...&r=us' -H 'Content-Type: application/json' -d '{}'"
echo "Get o (org id) and p (project id) from Sentry project settings or DSN."
echo ""
echo "=== Audit complete. See docs/AUDIT_REPORT_PRODUCTION_AUTH_ERRORS.md ==="
