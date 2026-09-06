# Firebase Setup Guide

## Quick Start

This Student Budget Tracker app now uses Firebase for authentication and data storage. Follow these steps to set it up:

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Create a project"
3. Name it "student-budget-tracker"
4. Accept the default settings and create the project

### 2. Set Up Authentication

1. In Firebase Console, go to **Build** -> **Authentication**
2. Click **Get Started**
3. Select **Email/Password** as the sign-in method
4. Enable it and save

### 3. Set Up Firestore Database

1. Go to **Build** -> **Firestore Database**
2. Click **Create Database**
3. Start in **Test Mode** (for development)
4. Choose your preferred location (closest to you)
5. Create the database

### 4. Get Your Firebase Config

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Under "Your apps", click the web icon `<>`
3. Copy the `firebaseConfig` object
4. Paste it into `firebase-config.js` in the app, replacing the placeholder config

Your `firebaseConfig` should look like:
```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

### 5. Set Firestore Security Rules

For development, use Test Mode (allows all reads/writes). For production, update the rules in Firestore:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth.uid == uid;
      match /{document=**} {
        allow read, write: if request.auth.uid == uid;
      }
    }
  }
}
```

### 6. Deploy the App

The app is now ready to use! Just open `index.html` in a browser.

## Data Structure

When a user signs up/logs in, the app automatically creates this Firestore structure:

```
users/{uid}/
  profile/data
    - displayName
    - email
    - gender
    - photoType
    - createdAt
    - updatedAt
  
  budget/data
    - income
    - savingsGoal
    - balance
    - expenses: [{ id, title, amount, category, date, ... }]
    - createdAt
    - updatedAt
```

## Features

 **Authentication**: Email/Password signup and login
 **Cross-Device Sync**: All data syncs to Firestore
 **Auto-Save**: Data automatically saves to cloud when updated
 **Offline Support**: Works offline, syncs when back online
 **LocalStorage Fallback**: Falls back to localStorage if not logged in
 **Settings Page**: Edit profile and logout
 **Privacy**: Each user only sees their own data

## Troubleshooting

### "Firebase is not defined"
Make sure your Firebase config is correct in `firebase-config.js`

### "User not found"
Check that Email/Password authentication is enabled in Firebase Console

### "Firestore access denied"
Check your Firestore security rules - they should allow authenticated users to read/write their own data

### Data not syncing
- Make sure you're logged in
- Check browser console for errors
- Verify Firestore is enabled and security rules are correct

## Cost

This setup uses Firebase's **free tier**:
- Authentication: 50,000 free sign-ups per month
- Firestore: 50,000 free reads/writes per day
- Storage: Not used in this app

The app is very efficient with quota usage since it only syncs when data changes.
