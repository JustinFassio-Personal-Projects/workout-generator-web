#!/usr/bin/env bash
# Verify Stripe configuration using Stripe CLI.
# Uses STRIPE_SECRET_KEY from .env.local (test or live).
# Run from project root: bash scripts/verify-stripe-config.sh
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

if [ -f .env.local ]; then
  set -a
  source .env.local
  set +a
fi

if [ -z "$STRIPE_SECRET_KEY" ]; then
  echo "ERROR: STRIPE_SECRET_KEY not set. Add it to .env.local"
  exit 1
fi

MODE="unknown"
case "$STRIPE_SECRET_KEY" in
  sk_test_*) MODE="test" ;;
  sk_live_*) MODE="live" ;;
esac

echo "=== Stripe configuration verification ==="
echo ""
echo "1. Key mode: $MODE (prefix: ${STRIPE_SECRET_KEY:0:12}...)"
echo ""

PRICE_IDS=(
  "STRIPE_BASIC_PRICE_ID"
  "STRIPE_PRO_PRICE_ID"
  "STRIPE_ELITE_PRICE_ID"
  "STRIPE_COACH_PRICE_ID"
  "STRIPE_COACH_PRO_PRICE_ID"
)

echo "2. Price IDs in env vs Stripe API:"
MISSING=0
for VAR in "${PRICE_IDS[@]}"; do
  ID="${!VAR}"
  if [ -z "$ID" ]; then
    echo "   $VAR: <not set>"
    MISSING=1
    continue
  fi
  OUT=$(stripe prices retrieve "$ID" 2>&1)
  if echo "$OUT" | grep -q '"livemode"'; then
    LIVEMODE=$(echo "$OUT" | grep -o '"livemode": [^,]*' | cut -d' ' -f2)
    echo "   $VAR: $ID  -> found (livemode=$LIVEMODE)"
  else
    echo "   $VAR: $ID  -> NOT FOUND (wrong mode or deleted)"
    MISSING=1
  fi
done
echo ""

if [ "$MISSING" -eq 1 ]; then
  echo "3. Verdict: Some price IDs are missing for the current key mode."
  echo "   - If key is test: run  bash scripts/seed-stripe-test-prices.sh  to create test"
  echo "     products/prices, then add the printed env vars to .env.local."
  echo "   - If key is live: use price IDs from Stripe Dashboard (Live mode)."
  echo "   - Production (App Hosting) must use live key + live price IDs."
  exit 1
fi

echo "3. Verdict: All price IDs exist for $MODE mode."
exit 0
