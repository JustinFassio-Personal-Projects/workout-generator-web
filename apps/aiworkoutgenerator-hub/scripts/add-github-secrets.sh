#!/bin/bash

# Script to add Firebase secrets to GitHub repository
# Run this after authenticating with: gh auth login
# 
# Usage:
#   Read from .env.local: ./scripts/add-github-secrets.sh
#   Or set environment variables before running

set -e

REPO="aiworkoutgen/aiworkoutgenerator-hub"

# Load environment variables from .env.local if it exists
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | xargs)
fi

# Validate required environment variables
REQUIRED_VARS=(
  "NEXT_PUBLIC_FIREBASE_API_KEY"
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID"
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"
  "NEXT_PUBLIC_FIREBASE_APP_ID"
)

MISSING_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    MISSING_VARS+=("$var")
  fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
  echo "❌ Error: Missing required environment variables:"
  printf '   %s\n' "${MISSING_VARS[@]}"
  echo ""
  echo "Please set these variables or ensure .env.local exists with these values."
  exit 1
fi

echo "Adding Firebase secrets to GitHub repository: $REPO"
echo ""

# Add each secret from environment variables
gh secret set NEXT_PUBLIC_FIREBASE_API_KEY --repo "$REPO" --body "$NEXT_PUBLIC_FIREBASE_API_KEY"
echo "✅ Added NEXT_PUBLIC_FIREBASE_API_KEY"

gh secret set NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN --repo "$REPO" --body "$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"
echo "✅ Added NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"

gh secret set NEXT_PUBLIC_FIREBASE_PROJECT_ID --repo "$REPO" --body "$NEXT_PUBLIC_FIREBASE_PROJECT_ID"
echo "✅ Added NEXT_PUBLIC_FIREBASE_PROJECT_ID"

gh secret set NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET --repo "$REPO" --body "$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"
echo "✅ Added NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"

gh secret set NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID --repo "$REPO" --body "$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"
echo "✅ Added NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"

gh secret set NEXT_PUBLIC_FIREBASE_APP_ID --repo "$REPO" --body "$NEXT_PUBLIC_FIREBASE_APP_ID"
echo "✅ Added NEXT_PUBLIC_FIREBASE_APP_ID"

if [ -n "$NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID" ]; then
  gh secret set NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID --repo "$REPO" --body "$NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID"
  echo "✅ Added NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID"
fi

echo ""
echo "✅ All Firebase secrets have been added to GitHub repository!"
echo ""
echo "Note: You may also need to add FIREBASE_SERVICE_ACCOUNT and FIREBASE_PROJECT_ID"
echo "for the Firebase Hosting preview deployment in CI/CD."
