# Waiver API Documentation

This document describes the API endpoints for the waiver system in the **Frontend App (aiworkoutgenerator-hub)**.

**Architecture:**

- **Admin Dashboard (separate app)**: Creates/manages waiver versions, views compliance
- **Frontend App (this app)**: Users see active waiver, check boxes, submit agreement

## Base URL

- Development: `http://localhost:3000`
- Production: `https://your-domain.com`

## Authentication

All endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <idToken>
```

The `idToken` is obtained from Firebase Auth (client-side).

---

## Endpoints

### 1. Get Active Waiver Version

**Endpoint:** `GET /api/waiver/active`

**Description:** Returns the currently active waiver version that users must agree to.

**Request:**

```http
GET /api/waiver/active
Authorization: Bearer <idToken>
```

**Response (200 OK):**

```json
{
  "waiver": {
    "id": "waiver_doc_id",
    "version": "1.0.0",
    "version_hash": "sha256_hash",
    "title": "Liability Waiver and Terms of Service",
    "content": "Full waiver text...",
    "is_active": true,
    "effective_date": "2026-01-01T00:00:00Z",
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z",
    "created_by": "admin_user_id"
  }
}
```

**Response (200 OK - No Active Waiver):**

```json
{
  "waiver": null,
  "message": "No active waiver found"
}
```

**Error Responses:**

- `401 Unauthorized`: Missing or invalid token
- `500 Internal Server Error`: Server error

**Frontend Usage:**

```typescript
import { WaiverService } from "@/services/waiver";

// The service method handles the API call internally
const waiver = await WaiverService.getActiveWaiverVersion();
// Returns LiabilityWaiver | null
```

---

### 2. Create Waiver Agreement

**Endpoint:** `POST /api/waiver/agree`

**Description:** Saves a user's agreement to the active waiver version. Includes full audit trail.

**Request:**

```http
POST /api/waiver/agree
Authorization: Bearer <idToken>
Content-Type: application/json
```

**Request Body:**

```json
{
  "full_name": "John Doe",
  "agreement_checkboxes": {
    "medical_disclaimer": true,
    "assumption_of_risk": true,
    "release_of_liability": true,
    "arbitration": true,
    "ai_disclaimer": true,
    "full_terms": true
  }
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "agreement_id": "agreement_doc_id",
  "waiver_version": "1.0.0"
}
```

**Response (200 OK - Already Agreed):**

```json
{
  "success": true,
  "agreement_id": "existing_agreement_id",
  "waiver_version": "1.0.0",
  "message": "You have already agreed to this waiver version."
}
```

**Error Responses:**

- `400 Bad Request`: Invalid request body or validation failed
- `401 Unauthorized`: Missing or invalid token
- `503 Service Unavailable`: No active waiver configured
- `500 Internal Server Error`: Server error

**Validation Rules:**

- `full_name`: Must be at least 2 characters, must contain at least 2 words (first and last name)
- All checkboxes must be `true`
- User must be authenticated

**Frontend Usage:**

```typescript
import { WaiverService } from "@/services/waiver";
import { getIdToken } from "@/lib/auth";

// Get ID token
const idToken = await getIdToken();
if (!idToken) {
  throw new Error("User must be signed in");
}

// Create agreement
const agreement = await WaiverService.createWaiverAgreement(idToken, {
  full_name: "John Doe",
  agreement_checkboxes: {
    medical_disclaimer: true,
    assumption_of_risk: true,
    release_of_liability: true,
    arbitration: true,
    ai_disclaimer: true,
    full_terms: true,
  },
});
// Returns { success: true, agreement_id, waiver_version }
```

---

## Data Models

### LiabilityWaiver

```typescript
interface LiabilityWaiver {
  id: string; // Document ID
  version: string; // e.g., "1.0.0"
  version_hash: string; // SHA-256 hash of content
  title: string;
  content: string; // Full waiver text
  is_active: boolean;
  effective_date: Timestamp;
  created_at: Timestamp;
  updated_at: Timestamp;
  created_by: string; // Admin user ID
}
```

### WaiverAgreementRequest

```typescript
interface WaiverAgreementRequest {
  full_name: string; // User's typed full name
  agreement_checkboxes: {
    medical_disclaimer: boolean;
    assumption_of_risk: boolean;
    release_of_liability: boolean;
    arbitration: boolean;
    ai_disclaimer: boolean;
    full_terms: boolean;
  };
}
```

### WaiverAgreementResponse

```typescript
interface WaiverAgreementResponse {
  success: boolean;
  agreement_id?: string;
  waiver_version?: string;
  message?: string;
  error?: string;
}
```

---

## Frontend Integration Example

```typescript
import { WaiverService } from "@/services/waiver";
import { getIdToken } from "@/lib/auth";

// Example: Complete flow for user agreeing to waiver

async function handleWaiverAgreement(
  userFullName: string,
  checkboxes: WaiverAgreementCheckboxes
) {
  try {
    // 1. Get ID token
    const idToken = await getIdToken();
    if (!idToken) {
      throw new Error("User must be signed in");
    }

    // 2. Get active waiver
    const waiver = await WaiverService.getActiveWaiverVersion();

    if (!waiver) {
      // No active waiver - user can proceed
      return { canProceed: true };
    }

    // 3. User sees waiver and checks boxes
    // (UI handles this - see LiabilityWaiver component)

    // 4. Submit agreement
    const agreement = await WaiverService.createWaiverAgreement(idToken, {
      full_name: userFullName,
      agreement_checkboxes: checkboxes,
    });

    return {
      canProceed: true,
      agreementId: agreement.agreement_id,
      waiverVersion: agreement.waiver_version,
    };
  } catch (error) {
    console.error("Waiver agreement error:", error);
    throw error;
  }
}
```

---

## Service Methods

The `WaiverService` class provides the following methods:

### `getActiveWaiverVersion(): Promise<LiabilityWaiver | null>`

- Calls `GET /api/waiver/active`
- Returns the active waiver or null
- Handles authentication internally

### `createWaiverAgreement(idToken: string, request: WaiverAgreementRequest): Promise<WaiverAgreementResponse>`

- Calls `POST /api/waiver/agree`
- Requires ID token as first parameter
- Returns agreement response with ID and version

### Deprecated Methods (kept for backward compatibility)

- `getActiveWaiver()` - Use `getActiveWaiverVersion()` instead
- `saveUserAgreement()` - Use `createWaiverAgreement()` instead

## Admin Dashboard

The admin dashboard (separate app) provides:

- **Create/Manage Waivers**: Create and manage waiver versions
- **View Compliance**: See all user agreements with audit trail
- **API Integration**: Uses the same Firestore collections

---

## Notes

1. **Version Control**: Only one waiver can be active at a time. When a new waiver is activated, all previous waivers are deactivated.

2. **Re-agreement Required**: If a new waiver version is activated, users who previously agreed must agree to the new version before generating workouts.

3. **Audit Trail**: All agreements include:
   - User ID
   - Full name (as typed by user)
   - Waiver version and hash
   - IP address
   - User agent
   - Timestamp

4. **Security**:
   - All endpoints require authentication
   - Agreements are immutable (cannot be updated or deleted)
   - Admin routes require admin role verification
