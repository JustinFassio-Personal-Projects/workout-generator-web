# Set Admin User - Quick Guide

## Your User Details:

- **UID**: `RaJARHpHfpgzYW3Wr6EjfLj9pJc2`
- **Email**: `jlfassio@gmail.com`

## Method 1: Firebase Console (Fastest - ~2 minutes)

1. **Open Firebase Console**: https://console.firebase.google.com/project/ai-fitness-guy-26523278-3e978/firestore/data

2. **Navigate to users collection**:
   - Click "Firestore Database" in left sidebar
   - Click "Data" tab
   - If "users" collection doesn't exist, click "Start collection" and name it "users"
   - Click on "users" collection

3. **Add/Edit Document**:
   - Click "Add document" (or find existing document with ID `RaJARHpHfpgzYW3Wr6EjfLj9pJc2`)
   - **Document ID**: `RaJARHpHfpgzYW3Wr6EjfLj9pJc2`
   - Add these fields:

     ```
     Field name: uid
     Type: string
     Value: RaJARHpHfpgzYW3Wr6EjfLj9pJc2

     Field name: email
     Type: string
     Value: jlfassio@gmail.com

     Field name: isAdmin
     Type: boolean
     Value: true  ← THIS IS CRITICAL!

     Field name: createdAt
     Type: string
     Value: 2026-01-25T00:00:00.000Z

     Field name: purchasedIndex
     Type: null
     Value: null
     ```

4. **Click "Save"**

5. **Test**: Go back to your admin dashboard and try creating a program - it should work now!

## Method 2: Using the Script (Requires gcloud setup)

If you prefer CLI:

```bash
# Set up credentials (one-time)
gcloud auth application-default login

# Run the script
node scripts/set-admin-user.js
```

## Verification

After setting `isAdmin: true`, the create program operation should work. The error message will change from "permission-denied" to success, and you'll be redirected to the program editor.
