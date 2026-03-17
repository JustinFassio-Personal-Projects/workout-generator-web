#!/usr/bin/env bash
# Set Firebase App Hosting secrets to LIVE Stripe (production).
# Requires: STRIPE_SECRET_KEY (sk_live_...), NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (pk_live_...),
# and the 5 STRIPE_*_PRICE_ID vars set to your LIVE price IDs.
# Load from .env.local or export before running.
# Run from project root: bash scripts/set-apphosting-live-stripe.sh
# Optional: --dry-run to print commands without running.
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

DRY_RUN=""
[ "$1" = "--dry-run" ] && DRY_RUN=1

if [ -f .env.local ]; then
  set -a
  source .env.local
  set +a
fi

if [[ "$STRIPE_SECRET_KEY" != sk_live_* ]]; then
  echo "ERROR: Set STRIPE_SECRET_KEY to your LIVE key (sk_live_...) in .env.local or env."
  exit 1
fi
if [[ "$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" != pk_live_* ]]; then
  echo "ERROR: Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to your LIVE key (pk_live_...) in .env.local or env."
  exit 1
fi

for VAR in STRIPE_BASIC_PRICE_ID STRIPE_PRO_PRICE_ID STRIPE_ELITE_PRICE_ID STRIPE_COACH_PRICE_ID STRIPE_COACH_PRO_PRICE_ID; do
  if [ -z "${!VAR}" ]; then
    echo "ERROR: $VAR not set. Use live price IDs from Stripe Dashboard (Live mode)."
    exit 1
  fi
done

run() {
  if [ -n "$DRY_RUN" ]; then
    echo "$@"
  else
    "$@"
  fi
}

echo "Setting App Hosting secrets to LIVE Stripe..."
run bash -c "echo -n \"$STRIPE_SECRET_KEY\" | firebase apphosting:secrets:set stripe-secret-key --data-file - --force"
run bash -c "echo -n \"$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY\" | firebase apphosting:secrets:set stripe-publishable-key --data-file - --force"
run bash -c "echo -n \"$STRIPE_BASIC_PRICE_ID\" | firebase apphosting:secrets:set stripe-basic-price-id --data-file - --force"
run bash -c "echo -n \"$STRIPE_PRO_PRICE_ID\" | firebase apphosting:secrets:set stripe-pro-price-id --data-file - --force"
run bash -c "echo -n \"$STRIPE_ELITE_PRICE_ID\" | firebase apphosting:secrets:set stripe-elite-price-id --data-file - --force"
run bash -c "echo -n \"$STRIPE_COACH_PRICE_ID\" | firebase apphosting:secrets:set stripe-coach-price-id --data-file - --force"
run bash -c "echo -n \"$STRIPE_COACH_PRO_PRICE_ID\" | firebase apphosting:secrets:set stripe-coach-pro-price-id --data-file - --force"

if [ -n "$DRY_RUN" ]; then
  echo ""
  echo "Dry run: commands above not executed. Run without --dry-run to set secrets."
else
  echo ""
  echo "Done. Redeploy App Hosting so the backend picks up the live secrets."
fi
