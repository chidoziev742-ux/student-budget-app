# Debugging Guide - Fixed Issues

## What Was Fixed

### 1. Login Screen Now Shows First
- Auth screen displays by default (display: flex)
- App container is hidden by default (display: none)
- Auth state listener determines what to show

### 2. Script Loading Order
- Original scripts (app.js) load FIRST
- This defines CONFIG and appState
- Then Firebase auth initializes
- Prevents "undefined CONFIG" errors

### 3. Offline Error Handling
- Gracefully handles offline Firestore access
- Falls back to localStorage when offline
- Shows helpful console warnings

### 4. Settings Page
- Profile display updates correctly
- Avatar changes based on gender
- Form handlers work properly

---

## How to Test

### Test 1: Login Screen Shows First
1. Hard refresh browser (Ctrl+Shift+R)
2. You should see login/signup screen immediately
3. Pass if login screen appears first

### Test 2: Sign Up Works
1. Click "Sign Up"
2. Enter:
   - Name: Your Name
   - Email: test@example.com
   - Password: Test123!
   - Gender: Male or Female
3. Click "Create Account"
4. Pass if you see dashboard with greeting

### Test 3: Greeting Shows
1. After login, look at page subtitle
2. Should say "Welcome, {Your Name}!" for first time
3. Or "Welcome back, {Your Name}!" for returning user
4. Pass if greeting appears

### Test 4: Settings Page Works
1. Click navigation -> Settings (or gear icon)
2. Should show:
   - Your profile info (name, email, gender)
   - Avatar icon (male/female)
   - Form to edit name and gender
3. Edit name and save
4. Pass if changes save without error

### Test 5: Add Expense Works
1. Go to "Add Expense" page
2. Add expense with amount, category, date
3. Click "Add Expense"
4. Pass if expense shows on dashboard

### Test 6: Logout Works
1. Go to Settings
2. Click "Sign Out"
3. Should return to login screen
4. Pass if you're back at login screen

### Test 7: Data Persists
1. After logout, login again with same account
2. All your expenses should be there
3. Greeting should say "Welcome back"
4. Pass if data is preserved

---

## Checking Browser Console

Open Developer Tools (F12) and check Console tab:

### Good Signs
```
CONFIG initialized
appState loaded
Auth initialized
User logged in successfully
Data loaded from Firestore
Settings updated
```

### Warning Signs
```
Cannot read properties of undefined
Element not found
Config not initialized
```

### If You See Warnings
1. Hard refresh (Ctrl+Shift+R) to clear cache
2. Check if firebase-config.js has correct config
3. Check if you're logged into Firebase account

---

## Quick Fixes

### Problem: Still shows app instead of login
**Solution**: 
1. Hard refresh (Ctrl+Shift+R)
2. Clear browser cache
3. Close all tabs and reopen

### Problem: Settings page still broken
**Solution**:
1. Make sure you're logged in
2. Check browser console for errors
3. Try logging out and back in

### Problem: Greeting doesn't show
**Solution**:
1. Greeting loads after data from Firestore
2. May take 1-2 seconds
3. Check console for "Data loaded" message

### Problem: Can't add expenses
**Solution**:
1. Make sure budget is set first
2. Try refreshing page
3. Check console for errors

---

## Console Commands to Debug

Open browser console (F12) and try:

```javascript
// Check if logged in
window.firebaseAuth.getCurrentUser()

// Check app state
console.log(window.appState)

// Check CONFIG
console.log(window.CONFIG)

// Check DOM elements
document.getElementById('auth-screen')
document.getElementById('app-container')

// Manually show app
document.getElementById('auth-screen').style.display = 'none'
document.getElementById('app-container').style.display = 'block'

// Check if Firebase connected
console.log(window.firebaseAuth)
```

---

## If Nothing Works

1. **Clear Everything**
   - Close browser completely
   - Clear browser cache (Ctrl+Shift+Delete)
   - Reopen browser
   - Go to app

2. **Check Firebase Config**
   - Open firebase-config.js
   - Verify all values are present
   - No undefined or empty strings

3. **Check Network**
   - Open DevTools Network tab
   - Reload page
   - Look for failed requests
   - Check for CORS errors

4. **Check localStorage**
   - Open DevTools -> Application -> localStorage
   - Look for StudentBudgetTracker entries
   - Should have budget, expenses, savingsGoal

5. **Check Firestore**
   - Go to Firebase Console
   - Look at Firestore Database
   - Check if users/{uid}/ documents exist

---

## Expected Flow

```
1. Page loads
   ->
2. See login screen (by default)
   ->
3. Sign up -> Creates Firestore account
   ->
4. See dashboard with greeting
   ->
5. Can add expenses, set budget, etc.
   ->
6. All data syncs to Firestore
   ->
7. Logout -> See login screen again
   ->
8. Login -> See all old data (from Firestore)
```

---

## Support

If you see errors:
1. Check this debugging guide
2. Check browser console (F12)
3. Look at Network tab for failed requests
4. Verify firebase-config.js has correct values
5. Try hard refresh (Ctrl+Shift+R)

Most issues resolve with a hard refresh!
