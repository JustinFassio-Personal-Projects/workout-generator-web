# Firestore Security Rules Update Instructions for Admin Repository

## Purpose

Update the `certification_messages` security rules in the Admin repository to fix the `workout_owner_id is undefined` error that occurs during list queries.

## Problem

When Firestore evaluates security rules for list queries, it checks ALL matching documents. If any document is missing the `workout_owner_id` field, the rule evaluation fails with:

```
Property workout_owner_id is undefined on object. for 'list' @ L174
```

## Solution

Add a defensive helper function `isMessageOwner()` that checks field existence before accessing it, preventing undefined errors during rule evaluation.

## Instructions

### Step 1: Locate the `certification_messages` Rules

In `firestore.rules`, find the `match /certification_messages/{messageId}` block (should be around line 143).

### Step 2: Replace the `allow read` Rule

**FIND** the existing `allow read` rule (it likely looks like this):

```javascript
allow read: if isAuthenticated() && (
  resource.data.workout_owner_id == request.auth.uid ||
  isTrainerOrAdmin()
);
```

**REPLACE** with this updated version that includes the defensive helper function:

```javascript
// Read: Users can read messages for workouts they own, trainers/admins can read all
// Enforces ownership at the security rule level to prevent enumeration attacks
// CRITICAL: For list queries, Firestore evaluates rules against ALL matching documents
// If ANY document causes a rule evaluation error, the entire query fails
// Defensive programming: Check field existence before accessing to prevent errors during rule evaluation
function isMessageOwner() {
  // Use short-circuit evaluation: check existence FIRST before any field access
  // This prevents "undefined" errors during list query rule evaluation
  return 'workout_owner_id' in resource.data
         && resource.data.workout_owner_id != null
         && resource.data.workout_owner_id is string
         && resource.data.workout_owner_id.size() > 0
         && resource.data.workout_owner_id == request.auth.uid;
}

// Allow read if:
// 1. User is authenticated AND (message owner OR trainer/admin)
// 2. Trainers/admins can read ALL messages
// Query should filter by workout_owner_id to match these rules exactly
allow read: if isAuthenticated() && (
  isMessageOwner() ||
  isTrainerOrAdmin()
);
```

### Step 3: Update the `allow update` Rule

**FIND** the existing `allow update` rule (it likely checks `resource.data.workout_owner_id` directly).

**REPLACE** any direct access to `resource.data.workout_owner_id` with the `isMessageOwner()` helper function:

```javascript
// Update: Only for marking messages as read
// Restricted to workout owner or trainer/admin
// Enforce one-way transition: unread (null/missing) -> read (non-null)
// Use same helper function for consistency
allow update: if isAuthenticated() &&
                // Only allow changes to the read_at field
                request.resource.data.diff(resource.data).affectedKeys().hasOnly(['read_at']) &&
                // Enforce one-way transition: unread (null/missing) -> read (non-null)
                // Check if field exists before comparing (handles missing field defensively)
                (!('read_at' in resource.data) || resource.data.read_at == null) &&
                request.resource.data.read_at != null &&
                (isMessageOwner() ||
                 isTrainerOrAdmin());
```

### Step 4: Verify the `allow create` Rule

The `allow create` rule should already be correct (it validates `request.resource.data.workout_owner_id` which is safe). Ensure it looks like this:

```javascript
// Create: User can create messages for their own workouts
// BULLETPROOF PATTERN: Enforce workout_owner_id as REQUIRED with validation
// All user/system messages MUST have workout_owner_id (non-null, string, non-empty, matches user)
// Trainers/admins can create any message (uses Admin SDK, bypasses rules)
allow create: if isAuthenticated() && (
  // Trainer/admin bypass (uses Admin SDK)
  isTrainerOrAdmin() ||
  // User/system messages MUST have workout_owner_id with strict validation
  (request.resource.data.workout_owner_id != null &&
   request.resource.data.workout_owner_id is string &&
   request.resource.data.workout_owner_id.size() > 0 &&
   request.resource.data.workout_owner_id == request.auth.uid &&
   // Validate sender for user messages
   ((request.resource.data.sender_type == 'user' &&
     request.resource.data.sender_id == request.auth.uid) ||
    // System messages allowed if workout owner
    request.resource.data.sender_type == 'system'))
);
```

## Complete Updated `certification_messages` Block

Here's the complete updated block for reference:

```javascript
match /certification_messages/{messageId} {
  // Trainers have trainer role in custom claims
  // Note: Must check if 'role' exists before accessing it to avoid undefined errors
  function isTrainerOrAdmin() {
    return isAuthenticated() &&
           'role' in request.auth.token &&
           request.auth.token.role in ['trainer', 'admin', 'super_admin'];
  }

  // Read: Users can read messages for workouts they own, trainers/admins can read all
  // Enforces ownership at the security rule level to prevent enumeration attacks
  // CRITICAL: For list queries, Firestore evaluates rules against ALL matching documents
  // If ANY document causes a rule evaluation error, the entire query fails
  // Defensive programming: Check field existence before accessing to prevent errors during rule evaluation
  function isMessageOwner() {
    // Use short-circuit evaluation: check existence FIRST before any field access
    // This prevents "undefined" errors during list query rule evaluation
    return 'workout_owner_id' in resource.data
           && resource.data.workout_owner_id != null
           && resource.data.workout_owner_id is string
           && resource.data.workout_owner_id.size() > 0
           && resource.data.workout_owner_id == request.auth.uid;
  }

  // Allow read if:
  // 1. User is authenticated AND (message owner OR trainer/admin)
  // 2. Trainers/admins can read ALL messages
  // Query should filter by workout_owner_id to match these rules exactly
  allow read: if isAuthenticated() && (
    isMessageOwner() ||
    isTrainerOrAdmin()
  );

  // Create: User can create messages for their own workouts
  // BULLETPROOF PATTERN: Enforce workout_owner_id as REQUIRED with validation
  // All user/system messages MUST have workout_owner_id (non-null, string, non-empty, matches user)
  // Trainers/admins can create any message (uses Admin SDK, bypasses rules)
  allow create: if isAuthenticated() && (
    // Trainer/admin bypass (uses Admin SDK)
    isTrainerOrAdmin() ||
    // User/system messages MUST have workout_owner_id with strict validation
    (request.resource.data.workout_owner_id != null &&
     request.resource.data.workout_owner_id is string &&
     request.resource.data.workout_owner_id.size() > 0 &&
     request.resource.data.workout_owner_id == request.auth.uid &&
     // Validate sender for user messages
     ((request.resource.data.sender_type == 'user' &&
       request.resource.data.sender_id == request.auth.uid) ||
      // System messages allowed if workout owner
      request.resource.data.sender_type == 'system'))
  );

  // Update: Only for marking messages as read
  // Restricted to workout owner or trainer/admin
  // Enforce one-way transition: unread (null/missing) -> read (non-null)
  // Check if field exists before comparing (handles missing field defensively)
  allow update: if isAuthenticated() &&
                  // Only allow changes to the read_at field
                  request.resource.data.diff(resource.data).affectedKeys().hasOnly(['read_at']) &&
                  // Enforce one-way transition: unread (null/missing) -> read (non-null)
                  // Check if field exists before comparing (handles missing field defensively)
                  (!('read_at' in resource.data) || resource.data.read_at == null) &&
                  request.resource.data.read_at != null &&
                  (isMessageOwner() ||
                   isTrainerOrAdmin());

  // Delete: Only admins
  allow delete: if isAdmin();
}
```

## Key Changes Summary

1. **Added `isMessageOwner()` helper function** - Defensively checks field existence before access
2. **Updated `allow read` rule** - Uses `isMessageOwner()` instead of direct field access
3. **Updated `allow update` rule** - Uses `isMessageOwner()` instead of direct field access
4. **No changes needed to `allow create`** - Already validates `request.resource.data.workout_owner_id` correctly

## Validation

After making these changes:

1. **Validate the rules:**

   ```bash
   firebase firestore:rules:validate firestore.rules
   ```

2. **Test with emulator:**

   ```bash
   firebase emulators:start --only firestore
   ```

3. **Verify the error is resolved:**
   - The `Property workout_owner_id is undefined` error should no longer occur
   - List queries should work correctly with proper defensive field checking

## Why This Is Safe

- Only updates the `certification_messages` collection rules
- Doesn't change any other collections
- Preserves all existing security checks
- Adds defensive programming without changing security model
- All messages require `workout_owner_id` field (no legacy messages exist)

## Related Documentation

- Hub repository fix: `docs/plans/ADMIN_WORKOUT_ID_VERIFICATION.md`
- Message flow: `docs/plans/CERTIFICATION_MESSAGE_FLOW.md`
- Troubleshooting: `docs/plans/MESSAGE_SYSTEM_TROUBLESHOOTING.md`
