# Firestore Security Rules Setup

## Problem
Your Firestore security rules are denying access to user data, causing the app to fall back to localStorage instead of syncing with the cloud.

**Console Errors:**
- "Missing or insufficient permissions" when trying to read profile
- "Missing or insufficient permissions" when trying to read budget
- Data only being loaded from localStorage, not from Firestore

## Solution

The `firestore.rules` file has been created with proper security rules that allow authenticated users to access their own data.

### Deploy the Rules to Firebase

You have two options:

#### Option 1: Using Firebase CLI (Recommended)
1. Install Firebase CLI if you haven't already:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize Firebase in your project folder (if not already done):
   ```bash
   cd c:\Users\chido\OneDrive\Documents\Studentapp\student-budget-tracker
   firebase init
   ```

4. Deploy the Firestore rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

#### Option 2: Manual Update via Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **student-budget-app-20fe9**
3. Go to **Firestore Database** -> **Rules** tab
4. Copy and paste the following rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to access their profile data
    match /users/{uid}/profile/data {
      allow read, write: if request.auth.uid == uid;
    }
    
    // Allow authenticated users to access their budget data
    match /users/{uid}/budget/data {
      allow read, write: if request.auth.uid == uid;
    }
    
    // Allow authenticated users to access any document in their budget subcollection
    match /users/{uid}/budget/{document=**} {
      allow read, write: if request.auth.uid == uid;
    }
    
    // Allow authenticated users to access their expenses subcollection
    match /users/{uid}/expenses/{expenseId} {
      allow read, write: if request.auth.uid == uid;
    }
    
    // Allow authenticated users to access any document in their expenses subcollection
    match /users/{uid}/expenses/{document=**} {
      allow read, write: if request.auth.uid == uid;
    }
    
    // Fallback: deny everything else by default
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

5. Click **Publish**

### What These Rules Do

- **Allow authenticated users** to read and write data in their own `/users/{uid}/` directory
- **Prevent unauthorized access** to other users' data
- **Enable the app** to sync budget data, expenses, and profile information to Firestore

### Test After Deployment

After deploying the rules:
1. Refresh your app in the browser
2. Sign in again
3. Check the browser console - you should no longer see "Missing or insufficient permissions" errors
4. Your user data should now load from Firestore instead of just localStorage
5. Any new changes will be synced to the cloud

### Next Steps if Issues Persist

If you still see permission errors after deploying:

1. **Verify Authentication**: Make sure you're signed in with a valid Firebase account
2. **Check User UID**: Verify that the auth.uid is being set correctly
3. **Review Firestore Data Structure**: Ensure your data is being written to the correct collection paths:
   - `/users/{uid}/profile/data`
   - `/users/{uid}/budget/data`
   - `/users/{uid}/expenses/{expenseId}`

4. **Enable Debug Logging**: Check the browser console for more detailed Firebase error messages
