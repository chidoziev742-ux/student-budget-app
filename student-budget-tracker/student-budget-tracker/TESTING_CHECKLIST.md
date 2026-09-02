# Pre-Launch Checklist ✅

## Files & Configuration

### ✅ Firebase Setup
- [x] firebase-config.js - Contains valid Firebase credentials
- [x] Auth module (auth.js) - Handles signup, login, logout, profile
- [x] Firestore sync (firestore-sync.js) - Syncs data bidirectionally
- [x] Main orchestrator (main.js) - Controls flow and initialization

### ✅ HTML Structure
- [x] Auth screen is visible by default (display: flex)
- [x] App container is hidden by default (display: none)
- [x] Login and signup forms present
- [x] Settings page with profile display
- [x] All form elements have proper IDs

### ✅ CSS Styling
- [x] Auth screen fully styled
- [x] Settings page fully styled
- [x] Responsive design for mobile
- [x] Avatar icons for male/female profiles

### ✅ Script Loading Order
- [x] Original scripts load FIRST in main.js
- [x] CONFIG defined by app.js
- [x] Auth initializes AFTER scripts are loaded
- [x] Auth callbacks set BEFORE initAuth() called

---

## Expected Behavior

### On First Load
- [ ] User sees login/signup screen
- [ ] No errors in console
- [ ] Can type in email and password fields
- [ ] Can switch between login and signup forms

### Sign Up Flow
- [ ] User fills signup form (name, email, password, gender)
- [ ] Click "Create Account"
- [ ] Account created in Firebase Auth
- [ ] User document created in Firestore
- [ ] Automatically logged in
- [ ] See dashboard with greeting "Welcome, [Name]!"
- [ ] Can see profile in Settings

### Settings Page
- [ ] Shows user name from profile
- [ ] Shows user email
- [ ] Shows user gender (Male/Female)
- [ ] Shows avatar (male or female icon)
- [ ] Can edit name and gender
- [ ] Save updates to Firestore
- [ ] Logout button works

### Add Expense Flow
- [ ] Can navigate to "Add Expense"
- [ ] Can enter amount, category, date
- [ ] Click "Add Expense"
- [ ] Expense appears on dashboard
- [ ] Data saved to Firestore (in background)

### Data Persistence
- [ ] Close tab and reopen app
- [ ] Login again
- [ ] All expenses still there
- [ ] Profile still shows correct info
- [ ] Greeting says "Welcome back, [Name]!"

### Logout Flow
- [ ] Settings page has "Sign Out" button
- [ ] Click "Sign Out"
- [ ] Sees login screen again
- [ ] Can login with same account
- [ ] All previous data is there

---

## Database Structure (Firestore)

```
firestore/
└── users/
    └── {uid}/
        ├── profile/
        │   └── data
        │       ├── displayName: "John Doe"
        │       ├── email: "john@example.com"
        │       ├── gender: "male"
        │       └── createdAt: timestamp
        │
        └── budget/
            └── data
                ├── budget: 50000
                ├── expenses: [...]
                ├── savingsGoal: 10000
                └── lastUpdated: timestamp
```

---

## How to Test

### Test 1: Fresh Install
```
1. Hard refresh (Ctrl+Shift+R)
2. Should see login screen
3. Open DevTools console (F12)
4. Should see "CONFIG initialized"
5. No red errors
```

### Test 2: Sign Up
```
1. Click "Sign Up"
2. Fill form with test data
3. Click "Create Account"
4. Should see dashboard
5. Check Firebase Console → Firestore → users collection
6. Should see new user document
```

### Test 3: Data Sync
```
1. On dashboard, add expense
2. Open DevTools → Network tab
3. Look for Firestore API calls
4. Should see POST requests to Firestore
```

### Test 4: Cross-Device Sync
```
1. Login on Device A (or browser 1)
2. Add expense
3. Open app on Device B (or browser 2)
4. Login with same account
5. Should see same expense
```

### Test 5: Offline Support
```
1. Add expense
2. Turn off internet (DevTools → Network → Offline)
3. Try adding another expense
4. Should work with localStorage
5. Turn internet back on
6. Data syncs to Firestore
```

---

## Troubleshooting Checklist

### Issue: Still shows app instead of login
- [ ] Hard refresh (Ctrl+Shift+R)
- [ ] Clear browser cache
- [ ] Check index.html line 13: should have `style="display: flex;"`
- [ ] Check DevTools → Application → localStorage → look for auth tokens

### Issue: "Cannot read properties of undefined"
- [ ] Hard refresh
- [ ] Check browser console for exact line number
- [ ] Check if Firebase SDK is loading (CDN request in Network tab)
- [ ] Check firebase-config.js for syntax errors

### Issue: Settings page doesn't show
- [ ] Make sure you're logged in
- [ ] Check browser console for errors
- [ ] Verify profile-form element exists in index.html
- [ ] Check that USER is loaded (DevTools → console → `window.firebaseAuth.getCurrentUser()`)

### Issue: Data not syncing to Firestore
- [ ] Check Network tab for Firestore API calls
- [ ] Verify Firebase credentials are correct
- [ ] Check Firestore rules allow read/write:
  ```
  match /users/{uid}/profile/{document=**} {
    allow read, write: if request.auth.uid == uid;
  }
  match /users/{uid}/budget/{document=**} {
    allow read, write: if request.auth.uid == uid;
  }
  ```
- [ ] Check Firebase project has Firestore enabled

### Issue: Can't sign up
- [ ] Check if email already exists
- [ ] Check password requirements (should be at least 6 chars)
- [ ] Check browser console for error message
- [ ] Verify Firebase Authentication is enabled in Firebase Console

---

## Files to Check

1. **firebase-config.js** (58 lines)
   - Must have valid Firebase credentials
   - Must export: auth, db, and Firebase functions

2. **auth.js** (226 lines)
   - Must have: initAuth, signUp, signIn, getCurrentUser, getUserProfile
   - Must handle offline errors gracefully

3. **firestore-sync.js** (198 lines)
   - Must have: saveBudgetToFirestore, loadBudgetFromFirestore
   - Must return success:true even when offline

4. **main.js** (410 lines)
   - Must load scripts FIRST (app.js, dashboard.js, etc.)
   - Must call initAuth() AFTER scripts are loaded
   - Must set auth callbacks BEFORE calling initAuth()

5. **app.js** (1740 lines)
   - Must define: window.CONFIG, window.appState
   - Must export: saveAppData, loadAppData, initApp, showToast

6. **index.html** (695 lines)
   - Auth screen must have `style="display: flex;"`
   - App container must have initial `style="display: none;"`
   - Must have all form elements with correct IDs

7. **styles.css** (1200+ lines)
   - Must have auth-screen styling
   - Must have settings page styling
   - Must have responsive design

---

## Console Commands for Debugging

### Check if logged in
```javascript
window.firebaseAuth.getCurrentUser()
```

### Check app state
```javascript
console.log({
  appState: window.appState,
  CONFIG: window.CONFIG,
  syncing: window.syncToFirestore,
  user: window.firebaseAuth.getCurrentUser()
})
```

### Manually show/hide screens
```javascript
// Show login
document.getElementById('auth-screen').style.display = 'flex'
document.getElementById('app-container').style.display = 'none'

// Show app
document.getElementById('auth-screen').style.display = 'none'
document.getElementById('app-container').style.display = 'block'
```

### Check Firestore connection
```javascript
console.log('Firebase Auth:', window.firebaseAuth)
console.log('Firestore Sync:', window.firestoreSync)
```

---

## Next Steps

1. **Test locally** using the checklist above
2. **Deploy to Firebase Hosting** (optional):
   ```
   npm install -g firebase-tools
   firebase login
   firebase init hosting
   firebase deploy
   ```
3. **Share with friends** - they can use different emails to test cross-device sync
4. **Monitor in Firebase Console** - watch Firestore documents being created

---

## Support Resources

- [Firebase Docs](https://firebase.google.com/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/start)
- [Firebase Auth Docs](https://firebase.google.com/docs/auth)
- See DEBUGGING.md for more help

---

## Success Indicators ✅

Your app is working correctly when:
1. ✅ Login screen shows on first load
2. ✅ Can create account with email/password
3. ✅ Logged in users see dashboard
4. ✅ Settings page shows user profile
5. ✅ Can add expenses and see them on dashboard
6. ✅ Logout works and shows login screen
7. ✅ Login again shows same expenses (persisted)
8. ✅ No red errors in console
9. ✅ Data appears in Firestore (Firebase Console → Firestore)

---

Last Updated: Post-Firebase Integration
Status: Ready for Testing
