# Hub Certification Feature Update Instructions

This document provides instructions for updating the Hub (user-facing app) repository to align with the certification feature improvements made in the Admin repository.

## Overview

The Admin repository has been updated with several improvements to the certification feature. The Hub needs to be updated to maintain compatibility and provide a seamless user experience.

## Critical Updates Required

### 1. Type Definitions Update

**File:** `types/certification.ts` (or equivalent in Hub)

**Changes Required:**

1. **Add `workout_owner_id` to `CertificationMessage` interface:**

   ```typescript
   export interface CertificationMessage {
     id: string;
     workout_id: string;
     workout_owner_id: string; // ⚠️ REQUIRED - Added for security rules
     sender_id: string;
     sender_type: CertificationMessageSenderType;
     sender_name: string;
     sender_avatar?: string;
     message: string;
     attachments?: CertificationAttachment[];
     created_at: Timestamp | Date; // Client-side uses firebase/firestore Timestamp
     updated_at?: Timestamp | Date;
     is_edited?: boolean;
   }
   ```

2. **Update Timestamp type handling:**
   - Hub uses `firebase/firestore` (client SDK) while Admin uses `firebase-admin/firestore` (server SDK)
   - Ensure `created_at` and `updated_at` accept both `Timestamp` (from firebase/firestore) and `Date`
   - The serialized version should use `string` (ISO format)

3. **Add `EditedWorkoutData` type if not already present:**
   ```typescript
   export interface EditedWorkoutData {
     description?: string;
     trainerNotes?: string;
     sections?: WorkoutSection[];
   }
   ```

### 2. Message Creation Updates

**If Hub has client-side code that creates certification messages:**

**File:** Any component or hook that calls `addCertificationMessage` or creates messages directly

**Changes Required:**

1. **Ensure `workout_owner_id` is included when creating messages:**

   ```typescript
   // When creating a message, include workout_owner_id
   const messageData = {
     workout_id: workoutId,
     workout_owner_id: workout.user_id, // ⚠️ REQUIRED
     sender_id: currentUserId,
     sender_type: "user",
     sender_name: userDisplayName,
     message: messageText,
     created_at: Timestamp.now(), // Use firebase/firestore Timestamp
   };
   ```

2. **Note:** If Hub uses server actions (recommended), the server action should handle this automatically. Verify that your server action includes `workout_owner_id`.

### 3. Error Handling Improvements

**Files:** Any components that interact with certification actions

**Changes Required:**

1. **Implement user-friendly error messages:**
   - Replace generic error messages with specific, actionable ones
   - Handle status transition errors gracefully
   - Show clear guidance on what the user can do next

2. **Example error handling pattern:**
   ```typescript
   try {
     const result = await submitForCertification(workoutId, questionnaire);
     if (!result.success) {
       // Display user-friendly error
       toast({
         title: "Submission Failed",
         description: result.error || "Failed to submit for certification",
         variant: "destructive",
       });
     } else {
       toast({
         title: "Submitted for Certification",
         description: "Your workout has been submitted for trainer review.",
       });
     }
   } catch (error) {
     toast({
       title: "Error",
       description: "An unexpected error occurred. Please try again.",
       variant: "destructive",
     });
   }
   ```

### 4. Optimistic Updates for Messages

**File:** Message board or messaging components

**Changes Required:**

1. **Implement optimistic updates when sending messages:**

   ```typescript
   const handleSendMessage = async (message: string) => {
     // Create optimistic message
     const optimisticMessage: SerializedCertificationMessage = {
       id: `temp-${Date.now()}`,
       workout_id: workoutId,
       workout_owner_id: workout.user_id,
       sender_id: currentUserId,
       sender_type: "user", // Hub users are always 'user' type
       sender_name: "You",
       message: message,
       created_at: new Date().toISOString(),
       is_edited: false,
     };

     // Add optimistically
     setMessages((prev) => [...prev, optimisticMessage]);

     try {
       const result = await addCertificationMessage(workoutId, message);

       if (result.success && result.messageId) {
         // Update with real messageId
         setMessages((prev) =>
           prev.map((msg) =>
             msg.id === optimisticMessage.id
               ? { ...msg, id: result.messageId! }
               : msg
           )
         );
         toast({
           title: "Message sent",
           description: "Your message has been sent successfully.",
         });
       } else {
         // Remove on error
         setMessages((prev) =>
           prev.filter((msg) => msg.id !== optimisticMessage.id)
         );
         toast({
           title: "Error",
           description: result.error || "Failed to send message",
           variant: "destructive",
         });
       }
     } catch (err) {
       // Remove on error
       setMessages((prev) =>
         prev.filter((msg) => msg.id !== optimisticMessage.id)
       );
       toast({
         title: "Error",
         description: "Failed to send message",
         variant: "destructive",
       });
     }
   };
   ```

2. **Handle refresh failures separately:**
   - If message send succeeds but refresh fails, show a warning (not error)
   - Keep the optimistic message with the real messageId

### 5. Toast Notifications

**Files:** All certification-related components

**Changes Required:**

1. **Add success toast notifications:**
   - Message sent successfully
   - Certification submitted successfully
   - Certification request canceled successfully
   - Any other user-initiated actions

2. **Use consistent toast patterns:**

   ```typescript
   // Success
   toast({
     title: "Action completed",
     description: "Your action was successful.",
   });

   // Error
   toast({
     title: "Error",
     description: "An error occurred. Please try again.",
     variant: "destructive",
   });

   // Warning (for non-critical issues)
   toast({
     title: "Warning",
     description: "Action completed, but there was a minor issue.",
   });
   ```

### 6. Input Validation

**Files:** Forms and inputs for certification actions

**Changes Required:**

1. **Message length validation:**
   - Maximum: 5000 characters
   - Minimum: 1 character (not empty)
   - Show character count and validation errors

2. **Revision notes validation (if applicable):**
   - Minimum: 10 characters
   - Maximum: 5000 characters
   - Show clear validation messages

3. **Example validation:**

   ```typescript
   const MAX_MESSAGE_LENGTH = 5000;
   const MIN_REVISION_NOTES_LENGTH = 10;

   if (message.trim().length === 0) {
     return { success: false, error: "Message cannot be empty" };
   }
   if (message.length > MAX_MESSAGE_LENGTH) {
     return {
       success: false,
       error: `Message must be ${MAX_MESSAGE_LENGTH} characters or less`,
     };
   }
   ```

### 7. Accessibility Improvements

**Files:** All certification UI components

**Changes Required:**

1. **Add ARIA labels to all icon-only buttons:**

   ```typescript
   <Button
     variant="ghost"
     size="icon"
     onClick={handleAction}
     aria-label="Send message" // ⚠️ REQUIRED for icon-only buttons
   >
     <Send className="h-4 w-4" />
   </Button>
   ```

2. **Add ARIA labels to toggle buttons:**

   ```typescript
   <Button
     onClick={() => setShowHistory(!showHistory)}
     aria-label={`Toggle certification history, ${history.length} changes`}
     aria-expanded={showHistory}
   >
     Status History
   </Button>
   ```

3. **Ensure keyboard navigation works:**
   - All interactive elements should be keyboard accessible
   - Focus states should be visible

### 8. Empty States

**Files:** Certification status pages, message boards, etc.

**Changes Required:**

1. **Add helpful empty states:**
   ```typescript
   {messages.length === 0 ? (
     <div className="text-center py-8 text-muted-foreground">
       <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
       <p className="font-medium">No messages yet</p>
       <p className="text-sm mt-1">
         Start the conversation about this workout
       </p>
     </div>
   ) : (
     // Messages list
   )}
   ```

### 9. Status Transition Handling

**Files:** Components that display or interact with certification status

**Changes Required:**

1. **Handle new status transitions:**
   - `cancelCertificationRequest`: pending/needs_revision → none
   - `resetCertification`: any status → none (admin only, not applicable to Hub)

2. **Update status display components:**
   - Show appropriate actions based on current status
   - Display clear status labels
   - Show status history if available

### 10. Server Actions (if Hub has its own)

**If Hub has server actions for certification:**

**Files:** `app/actions/certification.ts` or equivalent

**Changes Required:**

1. **Ensure `workout_owner_id` is set in `addCertificationMessage`:**

   ```typescript
   // Fetch workout to get user_id
   const workoutDoc = await workoutRef.get();
   const workoutData = workoutDoc.data();
   const workoutOwnerId = workoutData?.user_id;

   const messageData = {
     workout_id: workoutId,
     workout_owner_id: workoutOwnerId, // ⚠️ REQUIRED
     sender_id: session.uid,
     sender_type: "user",
     // ... other fields
   };
   ```

2. **Use consistent error handling:**
   - Return user-friendly error messages
   - Log detailed errors server-side
   - Use consistent error response format

3. **Timestamp handling:**
   - Use `Timestamp.now()` from `firebase-admin/firestore` for server actions
   - Convert to ISO strings only when serializing for client

## Testing Checklist

After implementing updates, verify:

- [ ] Messages can be created with `workout_owner_id` field
- [ ] Type definitions match Admin repository
- [ ] Error messages are user-friendly and actionable
- [ ] Optimistic updates work correctly for messages
- [ ] Toast notifications appear for all user actions
- [ ] Input validation works (message length, etc.)
- [ ] All buttons have ARIA labels
- [ ] Empty states display correctly
- [ ] Status transitions work as expected
- [ ] No TypeScript errors
- [ ] No console.log statements in production code

## Breaking Changes

### ⚠️ Important: Breaking Changes

1. **`CertificationMessage` interface:**
   - **BREAKING:** `workout_owner_id` is now **required** (not optional)
   - Any code creating messages must include this field
   - Firestore security rules require this field

2. **Timestamp types:**
   - Ensure compatibility between client-side (`firebase/firestore`) and server-side (`firebase-admin/firestore`) Timestamp types
   - Serialized messages use ISO strings (`string` type)

## Migration Steps

1. **Update type definitions first** (prevents TypeScript errors)
2. **Update message creation code** (add `workout_owner_id`)
3. **Update error handling** (user-friendly messages)
4. **Add optimistic updates** (better UX)
5. **Add toast notifications** (user feedback)
6. **Add accessibility improvements** (ARIA labels)
7. **Test thoroughly** (verify all functionality)

## Questions or Issues?

If you encounter any issues or have questions about these updates:

1. Check the Admin repository for reference implementations
2. Review the Firestore security rules to understand field requirements
3. Test with the Firebase emulator to catch issues early

## Related Files in Admin Repository

For reference, these files were updated in the Admin repository:

- `types/certification.ts` - Type definitions
- `app/actions/certification.ts` - Server actions
- `app/dashboard/workouts/[id]/components/MessageBoard.tsx` - Message board component
- `app/dashboard/workouts/[id]/components/CertificationActions.tsx` - Certification actions
- `app/dashboard/workouts/[id]/components/CertificationStatusCard.tsx` - Status display

Review these files for implementation patterns and best practices.
