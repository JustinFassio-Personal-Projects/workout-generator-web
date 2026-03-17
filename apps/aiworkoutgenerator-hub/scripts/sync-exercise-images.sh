#!/bin/bash

# Script to sync exercise images to workouts
# Usage: ./scripts/sync-exercise-images.sh [workoutId]
#
# To get your Firebase ID token:
# 1. Open your browser and log in to the app
# 2. Open browser console (F12)
# 3. Run: (await firebase.auth().currentUser?.getIdToken()) || "NOT_LOGGED_IN"
# 4. Copy the token and set it as ID_TOKEN environment variable

WORKOUT_ID="${1:-}"

if [ -z "$ID_TOKEN" ]; then
  echo "Error: ID_TOKEN environment variable not set"
  echo ""
  echo "To get your Firebase ID token:"
  echo "1. Open your browser and log in to http://localhost:3000"
  echo "2. Open browser console (F12)"
  echo "3. Run this command in the console:"
  echo "   (await (await import('firebase/auth')).getAuth().currentUser?.getIdToken()) || 'NOT_LOGGED_IN'"
  echo "4. Copy the token and run:"
  echo "   export ID_TOKEN='your-token-here'"
  echo "   ./scripts/sync-exercise-images.sh${WORKOUT_ID:+ $WORKOUT_ID}"
  exit 1
fi

URL="http://localhost:3000/api/admin/sync-exercise-images"
if [ -n "$WORKOUT_ID" ]; then
  URL="${URL}?workoutId=${WORKOUT_ID}"
fi

echo "Syncing exercise images..."
echo "URL: $URL"
echo ""

curl -X POST "$URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ID_TOKEN" \
  -w "\n\nHTTP Status: %{http_code}\n"
