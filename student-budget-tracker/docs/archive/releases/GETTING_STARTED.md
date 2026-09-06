# Getting Started - Quick Setup (5 Minutes)

## Prerequisites
- A Google account (for Firebase)
- A web browser
- A text editor (VS Code recommended)

## Step 1: Create Firebase Project (2 minutes)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **"Create a project"**
3. Name it: `student-budget-tracker`
4. Click **Create project** (wait for it to finish)

## Step 2: Enable Authentication (1 minute)

1. Go to **Build** -> **Authentication**
2. Click **Get Started**
3. Select **Email/Password**
4. Click the toggle to **Enable** it
5. Click **Save**

## Step 3: Enable Firestore (1 minute)

1. Go to **Build** -> **Firestore Database**
2. Click **Create Database**
3. Select **Test Mode** (for development)
4. Choose your region (closest to you)
5. Click **Create**

## Step 4: Get Your Firebase Config (30 seconds)

1. Go to **Project Settings** (gear icon at top)
2. Scroll down to "Your apps"
3. Click the web icon `<>`
4. Copy the entire `firebaseConfig` object (from `const firebaseConfig = {` to `}`)

## Step 5: Update Your App (30 seconds)

1. Open `firebase-config.js` in your text editor
2. Find this line:
   ```javascript
   const firebaseConfig = {
    apiKey: "YOUR_FIREBASE_API_KEY",
       authDomain: "student-budget-tracker.firebaseapp.com",
       ...
   };
   ```
3. Replace the ENTIRE `firebaseConfig` object with your copied config
4. Save the file

## Step 6: Test It! (0 seconds)

1. Open `index.html` in your web browser
2. Click **"Sign Up"**
3. Enter:
   - First Name: Your name
   - Email: test@example.com
    - Password: Use a test password created for local verification
   - Gender: Male/Female
4. Click **Create Account**
5. You should see your dashboard!

## Success!

Your app now has cloud sync! Try these:

1. **Add an expense** -> See it save to Firestore
2. **Set a budget** -> Data syncs to cloud
3. **Open on another device** -> Log in, see same data
4. **Settings page** -> Edit profile, see avatar change
5. **Log out** -> Data still safe in cloud

## Troubleshooting

**"Failed to sign up"?**
- Check your Firebase config in `firebase-config.js`
- Make sure Email/Password is enabled in Firebase Console
- Check browser console (F12) for error messages

**"Data not syncing"?**
- Make sure you're logged in
- Check Firebase Console -> Firestore to see collections
- If you see `/users/{uid}/` folders, it's working!

**Can't see Firestore data?**
- Wait 2-3 seconds after adding expense
- Refresh the page to reload from Firestore
- Check your Firestore security rules (should allow reads/writes for authenticated users)

## What's Next?

Read these docs in order:
1. **SETUP_FIREBASE.md** - Detailed setup guide
2. **FIREBASE_README.md** - Feature overview
3. **FIREBASE_REFERENCE.md** - How to use APIs

## Need Help?

- **Firebase Setup Issues**: See [Firebase Setup Guide](SETUP_FIREBASE.md)
- **How Features Work**: See [Firebase README](FIREBASE_README.md)
- **API Reference**: See [Firebase Reference](FIREBASE_REFERENCE.md)
- **What Was Added**: See [Implementation Summary](IMPLEMENTATION_SUMMARY.md)

## Quick Reference

### Core Functions
```javascript
// Check if logged in
if (window.firebaseAuth.isAuthenticated()) { ... }

// Get current user
const user = window.firebaseAuth.getCurrentUser();

// Get user profile
const profile = window.firebaseAuth.getUserProfile();

// Save data (automatic)
window.appState.expenses.push(expense);
window.saveAppData();  // Saves to Firestore!
```

### Important Files
- `firebase-config.js` - ️ Update with your Firebase config
- `main.js` - App entry point (loads everything)
- `auth.js` - Authentication logic
- `firestore-sync.js` - Database sync

### Important Folders
- Nothing! All files in root directory

## Architecture Overview

```
User Opens App
    ->
main.js loads (ES module)
    ->
Firebase config loaded
    ->
Auth state checked
    ->
User logged in? 
     YES -> Load Firestore data -> Show app
     NO -> Show login screen
```

## Data Flow

```
User Action (add expense)
    ->
Update appState in memory
    ->
Call saveAppData()
    ->
 Save to localStorage (instant)
 Save to Firestore (if logged in)
    ->
Data syncs to all devices
```

## Performance Tips

- **Instant feedback**: localStorage saves immediately
- **Cloud backup**: Firestore syncs in background
- **Offline works**: Falls back to localStorage if offline
- **Auto-syncs**: No manual upload needed
- **Free tier**: Well within Firebase quotas

## Security

- Only you can see your data
- Password stored securely in Firebase
- No credit card needed
- Test mode allows development
- Production rules can be added later

## Next Steps

1. Get Firebase config
2. Update firebase-config.js
3. Test signup/login
4. Add expenses and verify sync
5. Share with friends!

---

**Estimated Time: 5 minutes**
**Difficulty: Easy**
**Cost: $0 (free Firebase tier)**

Happy budgeting!
