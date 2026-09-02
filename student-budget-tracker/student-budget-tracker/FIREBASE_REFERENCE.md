# Firebase Integration - Quick Reference

## Key APIs & Functions

### Authentication (`auth.js`)
```javascript
// Initialize auth (called automatically in main.js)
initAuth()

// Sign up new user
signUp(email, password, displayName, gender)
// Returns: { success: true/false, user: FirebaseUser, error: string }

// Sign in existing user
signIn(email, password)
// Returns: { success: true/false, user: FirebaseUser, error: string }

// Sign out current user
signOutUser()
// Returns: { success: true/false, error: string }

// Get current user
getCurrentUser()
// Returns: FirebaseUser | null

// Get user profile data
getUserProfile()
// Returns: { displayName, email, gender, photoType }

// Update user profile
updateUserProfile(displayName, gender)
// Returns: { success: true/false, error: string }

// Check if authenticated
isAuthenticated()
// Returns: boolean
```

### Firestore Sync (`firestore-sync.js`)
```javascript
// Save budget to Firestore
saveBudgetToFirestore(uid, budget)
// Returns: { success: true/false, error: string }

// Save expenses to Firestore
saveExpensesToFirestore(uid, expenses)
// Returns: { success: true/false, error: string }

// Save savings goal to Firestore
saveSavingsGoalToFirestore(uid, savingsGoal)
// Returns: { success: true/false, error: string }

// Load all budget data from Firestore
loadBudgetFromFirestore(uid)
// Returns: { success: true/false, data: { budget, expenses, savingsGoal }, error: string }

// Migrate localStorage to Firestore (automatic on first login)
migrateLocalStorageToFirestore(uid, appState, CONFIG)
// Returns: { success: true/false, migrated: true/false, error: string }
```

## Data Structure in Firestore

```
users/
  {uid}/
    profile/
      data: {
        displayName: "John",
        email: "john@example.com",
        gender: "male" | "female",
        photoType: "icon",
        createdAt: ISO8601,
        updatedAt: ISO8601
      }
    
    budget/
      data: {
        income: 50000,
        savingsGoal: 10000,
        balance: 30000,
        expenses: [
          {
            id: "1234567890",
            title: "Coffee",
            amount: 3000,
            category: "food",
            date: "2024-01-26",
            reason: "Morning coffee",
            addedDate: ISO8601
          }
        ],
        createdAt: ISO8601,
        updatedAt: ISO8601
      }
```

## App State (`app.js`)

```javascript
appState = {
    currentPage: 'dashboard',
    budget: {
        amount: 50000,
        category: null,
        setDate: ISO8601
    },
    expenses: [
        {
            id: '1234567890',
            amount: 3000,
            category: 'food',
            date: '2024-01-26',
            reason: 'Coffee',
            addedDate: ISO8601
        }
    ],
    savingsGoal: 10000
}
```

## Saving Data Flow

1. **User Action** (add expense, set budget, etc.)
   ↓
2. **Update appState** in memory
   ↓
3. **Call saveAppData()**
   ↓
4. **Save to localStorage** (immediate)
   ↓
5. **If authenticated**, **save to Firestore** (async)

## Loading Data Flow

1. **App starts** → `main.js` loads
   ↓
2. **Firebase Auth initializes** → checks login status
   ↓
3. **If logged in** → `loadUserData()` called
   ↓
4. **Load from Firestore** (if has data)
   ↓
5. **Or migrate from localStorage** (first time)
   ↓
6. **Populate appState** with loaded data
   ↓
7. **Show app with loaded data**

## Available Globals

After loading, these are available on `window`:

```javascript
// Firebase Auth functions
window.firebaseAuth.getCurrentUser()
window.firebaseAuth.signOut()
window.firebaseAuth.getUserProfile()
window.firebaseAuth.updateUserProfile(name, gender)

// Firestore sync functions
window.firestoreSync.loadBudgetFromFirestore(uid)
window.firestoreSync.saveBudgetToFirestore(uid, budget)
window.firestoreSync.saveExpensesToFirestore(uid, expenses)

// App state and utilities
window.appState  // current app state
window.CONFIG    // app configuration
window.saveAppData()  // save function (now with Firestore)
window.showToast(message, type)  // show notification
```

## Common Tasks

### Get Current User
```javascript
const user = window.firebaseAuth.getCurrentUser();
if (user) {
    console.log(user.uid, user.email);
}
```

### Check if Authenticated
```javascript
if (window.firebaseAuth.isAuthenticated()) {
    // User is logged in
}
```

### Update App State and Save
```javascript
window.appState.expenses.push(newExpense);
window.saveAppData();  // Saves to localStorage AND Firestore
```

### Get User Profile
```javascript
const profile = window.firebaseAuth.getUserProfile();
console.log(profile.displayName, profile.gender);
```

### Load Firestore Data
```javascript
const user = window.firebaseAuth.getCurrentUser();
const result = await window.firestoreSync.loadBudgetFromFirestore(user.uid);
if (result.success) {
    console.log(result.data.expenses);
}
```

## Environment Variables

None needed! Firebase config is set directly in `firebase-config.js`

## Error Handling

All async functions return a result object:
```javascript
const result = await someAsyncFunction();
if (result.success) {
    // Handle success
    console.log(result.data);
} else {
    // Handle error
    console.error(result.error);
}
```

## Testing

To test without Firebase:
1. Keep app in "not logged in" state
2. All data saves to localStorage
3. Works exactly like before Firebase integration
4. No internet connection needed

## Performance Tips

- Firestore is called asynchronously (doesn't block UI)
- localStorage saves instantly (synchronous)
- Combine multiple updates before saving when possible
- Check for user before syncing to Firestore
- Use getCurrentUser() to check auth status

## Debugging

Enable verbose logging (in browser console):
```javascript
// Check current auth state
console.log(window.firebaseAuth.getCurrentUser());

// Check app state
console.log(window.appState);

// Check if syncing
console.log('Has Firebase:', !!window.firestoreSync);
```

## Dependencies

- Firebase SDK 11.0.1 (loaded via CDN in firebase-config.js)
- All other libraries same as original app
