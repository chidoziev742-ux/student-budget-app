# Student Budget Tracker - Firebase Integration

## What's New

This version of the Student Budget Tracker has been completely updated with Firebase integration:

### Authentication
- **Email/Password Signup**: Users can create accounts with a first name and gender selection
- **Secure Login**: Each user has their own password-protected account
- **Persistent Sessions**: Users stay logged in across browser refreshes
- **Logout**: Users can sign out from the Settings page

### Cloud Data Sync
- **Firestore Storage**: All budget, expense, and savings data stored in the cloud
- **Cross-Device Sync**: Log in on multiple devices and see the same data everywhere
- **Automatic Saving**: Changes save to the cloud automatically
- **LocalStorage Fallback**: If not logged in, data saves to localStorage

### User Profile
- **Display Name**: Stored and displayed on the dashboard
- **Gender Selection**: Used for avatar icon styling
- **Personalized Greeting**: "Welcome, {Name}!" on first login, "Welcome back, {Name}!" for returning users
- **Profile Editing**: Change name and gender in Settings

### New Settings Page
- Edit profile information
- View account details
- Sign out
- Export/import data
- Clear all data

### Data Migration
- If you had data in localStorage, it automatically migrates to Firestore on first login
- All your existing budgets and expenses are preserved

## Files Structure

### New Files
- `firebase-config.js` - Firebase SDK initialization and configuration
- `auth.js` - Authentication module (signup, login, logout)
- `firestore-sync.js` - Firestore database operations
- `main.js` - Application entry point and orchestration
- `SETUP_FIREBASE.md` - Firebase setup instructions

### Modified Files
- `index.html` - Added auth screens, settings page, improved navigation
- `app.js` - Integrated Firestore sync into saveAppData()
- `styles.css` - Added auth and settings page styling

## Quick Start

1. **Get Firebase Config**
   - Create a Firebase project (free)
   - Copy your Firebase config
   - Paste it into `firebase-config.js`
   - See `SETUP_FIREBASE.md` for detailed instructions

2. **Open the App**
   - Open `index.html` in your browser
   - Sign up for a new account
   - Start tracking your budget!

## How It Works

### Authentication Flow
1. User opens app → sees login/signup screen
2. User signs up → creates Firestore profile and budget documents
3. User logs in → loads their data from Firestore
4. App saves all changes to Firestore automatically
5. User logs out → clears session, returns to login screen

### Data Sync Flow
1. User adds expense/budget → saves to localStorage immediately
2. If logged in → also syncs to Firestore
3. If offline → works with localStorage until connection returns
4. When synced successfully → data is available on all devices

### Migration Flow
1. Existing localStorage data detected
2. On first login → migrated to Firestore automatically
3. After migration → LocalStorage is no longer used for that user
4. Data stays synced across devices

## Features Preserved

All original features still work:
- Dashboard with summary cards
- Budget management
- Expense tracking
- History with filters
- Savings goals calculator
- Toast notifications
- Export/import data
- Clear all data

## Performance & Cost

- **Efficient Quota Usage**: Only syncs when data changes
- **Free Tier Coverage**: Well within Firebase's free limits
- **Fast Loading**: Firestore queries are optimized
- **Offline Support**: Works offline with localStorage fallback

## Security

- **User Authentication**: Only authenticated users can access their data
- **Firestore Rules**: Each user can only access their own documents
- **No Password Exposure**: Passwords managed by Firebase Authentication
- **No Image Uploads**: Avatar uses gender-based icons (no Storage needed)

## Troubleshooting

**Issue**: App shows login screen after refresh
- Solution: Make sure you completed Firebase setup in `firebase-config.js`

**Issue**: Data not saving to cloud
- Solution: Check browser console for errors; verify Firebase config

**Issue**: Can't create account
- Solution: Enable Email/Password in Firebase Authentication console

**Issue**: Data lost after logout
- Solution: This is normal - each user has separate data in Firestore

See `SETUP_FIREBASE.md` for more troubleshooting tips.

## Architecture

```
index.html (Auth UI + App UI)
    ↓
main.js (Entry point, loads all modules)
    ↓
├── firebase-config.js (Firebase SDK setup)
├── auth.js (Authentication logic)
├── firestore-sync.js (Database operations)
└── app.js (Original app logic + Firestore sync)
```

## Future Enhancements

Possible improvements:
- Real-time data sync using Firestore listeners
- Push notifications for budget alerts
- Photo upload for profile
- Budget sharing with friends
- Multi-currency support
- Recurring expenses
- Monthly reports export

## Getting Help

1. Check `SETUP_FIREBASE.md` for setup instructions
2. Check browser console (F12) for error messages
3. Verify Firebase project settings
4. Make sure security rules allow your user access

## License

MIT License - feel free to use and modify
