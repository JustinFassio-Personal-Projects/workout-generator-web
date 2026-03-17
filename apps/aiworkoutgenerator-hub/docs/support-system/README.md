# Support System Documentation

This directory contains documentation for the Help & Feedback Center support ticket system.

## Overview

The support system is a wizard-based feedback collection system that:

- Captures structured workout feedback
- Routes requests by type (workout feedback, bugs, billing, features, coaching)
- Automatically attaches context (user, workout, device info)
- Submits tickets to a Cloud Function for processing

## Documentation Files

- **[SETUP.md](./SETUP.md)** - Production setup and configuration guide (✅ Working solution documented)
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Common issues and solutions
- **[get-cloud-function-url.ts](./get-cloud-function-url.ts)** - Utility script to retrieve Cloud Function URL (reference only)

## Quick Reference

### Production URL

- Cloud Function: `https://createsupportticketfromwebsite-vp5ysk365a-uc.a.run.app`
- Environment Variable: `FIREBASE_CLOUD_FUNCTION_URL`

### Configuration

- Configured via Firebase App Hosting secrets
- Secret name: `firebase-cloud-function-url`
- See [SETUP.md](./SETUP.md) for detailed setup instructions
