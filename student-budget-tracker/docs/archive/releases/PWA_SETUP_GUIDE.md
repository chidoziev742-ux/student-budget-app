# Student Budget Tracker - PWA Setup Guide

##  What's Been Added

Your app is now a fully functional **Progressive Web App (PWA)** that works offline and can be installed on Android phones and desktop browsers.

### Files Created:
1. **manifest.json** - App metadata and installation configuration
2. **sw.js** - Service Worker for offline caching and functionality
3. **Updated index.html** - Added PWA meta tags and manifest link
4. **Updated main.js** - Service Worker registration and online/offline handling

---

##  How to Install the App

### On Android Phones:
1. **Open the app in Chrome/Brave browser** at your hosting URL
2. **Browser shows install prompt** at the top right or in menu
3. **Tap "Install" or "Add to Home Screen"**
4. App appears as an icon on your home screen
5. Opens fullscreen without browser UI (standalone mode)

### On Desktop (Chrome/Edge/Brave):
1. **Open the app in your browser**
2. **Click the install icon** (usually in the address bar)
3. Select "Install Student Budget Tracker"
4. App opens in a standalone window
5. Appears in your installed apps

### On iOS/macOS:
1. **Open in Safari**
2. **Tap Share button** -> "Add to Home Screen"
3. App appears on home screen with icon
4. Note: Full PWA features limited on iOS, but still installable

---

##  Offline Functionality

### What Works Offline:
 **View cached pages** (HTML, CSS, JavaScript)
 **Navigate app UI** (dashboard, budget, history)
 **Read cached expenses** (from localStorage backup)
 **View balance and savings**
 **Perform calculations** (add, subtract expenses locally)

### What Requires Connection:
 **Firebase Authentication** (login/signup)
 **Firestore Sync** (upload/download from cloud)
 **Real-time updates** from other devices

### Data Sync Behavior:
- **Online**: Changes sync to Firestore in real-time
- **Offline**: Changes saved to localStorage
- **Reconnect**: App notifies user "Changes syncing..."
- **Automatic**: No manual action needed

---

## ️ Technical Details

### manifest.json
```json
{
  "name": "Student Budget Tracker",
  "short_name": "Budget",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#4361ee",
  "background_color": "#ffffff",
  "icons": [...]  // SVG-based icons included
}
```

**Key Fields:**
- `display: "standalone"` - Opens without browser UI
- `start_url: "/"` - Entry point (set for Firebase Hosting)
- `theme_color` - Android status bar color
- `icons` - Maskable + regular icons for all devices

### sw.js (Service Worker)
```javascript
// Caching Strategy:
// 1. Firebase API calls -> Network-first
// 2. Static assets (JS, CSS, HTML) -> Cache-first
// 3. Failed requests -> Offline fallback page
```

**Key Features:**
-  Caches static assets on first visit
-  Network-first for Firebase (auth/Firestore)
-  Cache-first for app resources
-  Automatic cache updates
-  Offline fallback screen
-  Background sync support (ready for future)
-  Push notification support (ready for future)

### PWA Meta Tags (index.html)
```html
<meta name="manifest" href="manifest.json">
<meta name="theme-color" content="#4361ee">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
```

### Service Worker Registration (main.js)
```javascript
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
        .then(reg => console.log('SW registered'))
        .catch(err => console.log('SW failed'));
}
```

---

##  Deployment to Firebase Hosting

### Step 1: Install Firebase CLI
```bash
npm install -g firebase-tools
firebase login
```

### Step 2: Initialize Firebase in Your Project
```bash
firebase init hosting
```

**Choose:**
- **Public directory:** `.` (current folder, or `student-budget-tracker`)
- **Single page app:** Yes
- **Overwrite index.html:** No
- **GitHub Actions:** No (optional)

### Step 3: Configure firebase.json
```json
{
  "hosting": {
    "public": ".",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

**Important:** The `rewrites` rule ensures all routes go to index.html (for SPA routing)

### Step 4: Deploy
```bash
firebase deploy --only hosting
```

Your app will be live at: `https://your-project-id.firebaseapp.com`

---

##  Testing Your PWA

### Local Testing (Before Deploy)
```bash
# Start local server
python -m http.server 8000
# or: npx http-server

# Open in browser
http://localhost:8000
```

### Test Checklist:
- [ ] Install prompt appears after 2 seconds
- [ ] App opens fullscreen without browser UI
- [ ] Service Worker shows in DevTools -> Application -> Service Workers
- [ ] Cache shows in DevTools -> Application -> Cache Storage
- [ ] Login/signup works online
- [ ] Add expense works and persists
- [ ] Hard refresh (Ctrl+Shift+R) - expenses still load
- [ ] Disable internet -> offline fallback shows
- [ ] Re-enable internet -> "Connected" toast appears
- [ ] Install on Android phone -> works
- [ ] Install on Windows/Mac -> works

### DevTools Check (F12):
1. **Application tab** -> Manifest: Should show " Identity" and " Icon size"
2. **Service Workers**: Should show "activated and running"
3. **Cache Storage**: Should see "student-budget-v1" cache
4. **Network tab**: See cached requests (grey) vs network requests

---

## ️ Configuration & Customization

### Change App Name/Colors:
**manifest.json:**
```json
"name": "Your App Name",
"short_name": "Short",
"theme_color": "#your-color",
"background_color": "#your-color"
```

**index.html:**
```html
<meta name="theme-color" content="#your-color">
<meta name="apple-mobile-web-app-title" content="Short">
```

### Add Custom Icons (Optional):
Replace SVG icons in `manifest.json` with real images:
```json
"icons": [
  {
    "src": "/icons/icon-192x192.png",
    "sizes": "192x192",
    "type": "image/png",
    "purpose": "any"
  }
]
```

### Update Cache Version:
```javascript
// sw.js - change version number
const CACHE_NAME = 'student-budget-v2'; // v1 -> v2
```

---

##  Security Notes

### Firebase Rules
PWA doesn't change Firestore rules - your existing rules apply:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/** {
      allow read, write: if request.auth.uid == uid;
    }
  }
}
```

### Offline Data
- Expenses cached in localStorage (not encrypted) - OK for student budgets
- Login credentials NOT cached - user must authenticate online
- Sensitive data syncs to Firestore immediately

### HTTPS Required
- Firebase Hosting = automatic HTTPS 
- Service Workers only work on HTTPS (or localhost)
- All communications encrypted

---

##  Platform-Specific Notes

### Android (Chrome/Brave)
 Full PWA support
 Standalone app mode
 Home screen shortcut
 Offline caching works perfectly

### Windows 10/11 (Chrome/Edge)
 Install from browser menu
 Standalone window
 Start menu shortcuts
 Best desktop experience

### macOS (Chrome)
️ PWA support limited
 Can install to Applications
️ Reduced offline capability
 Works same as web app

### iOS/Safari
️ PWA features limited
 Add to Home Screen works
️ No service worker support
 Still installable and works

---

##  Troubleshooting

### Install prompt not showing?
1. App must be HTTPS (or localhost)
2. manifest.json must be valid JSON
3. Try incognito mode (clears old install state)
4. Wait 2+ seconds after page load

### Service Worker not activating?
1. Check DevTools -> Application -> Service Workers
2. Refresh page after first visit
3. Try hard refresh (Ctrl+Shift+R)
4. Check console for errors

### Expenses not syncing offline?
1. Offline? Changes saved to localStorage 
2. Online but not syncing? Check Firestore rules
3. Check browser console for Firebase errors
4. Ensure user is authenticated

### Can't uninstall app?
**Android:** Settings -> Apps -> Student Budget -> Uninstall
**Windows:** Settings -> Apps -> Apps & features -> Student Budget -> Uninstall
**Mac:** Finder -> Applications -> Student Budget -> Move to Trash

---

##  What's Next?

### Optional Enhancements (Not Required):
1. **Push Notifications** - Budget alerts
2. **Background Sync** - Auto-sync expenses when online
3. **Custom Icons** - Replace SVG with PNG images
4. **Splash Screen** - Custom loading screen
5. **Dark Mode** - Adaptive theme support

### Future Updates:
- Update `sw.js` to cache new files
- Increment `CACHE_NAME` version for cache busting
- Redeploy with `firebase deploy`

---

##  Verification Checklist

Before going live:

- [ ] manifest.json is valid (check online JSON validator)
- [ ] sw.js has no syntax errors
- [ ] Service Worker registers without errors
- [ ] App caches on first load
- [ ] Can navigate offline
- [ ] Expenses persist after refresh
- [ ] Firebase Auth still works
- [ ] Install prompt appears
- [ ] App runs in standalone mode
- [ ] Online/offline toasts appear
- [ ] Works on Android
- [ ] Works on Desktop
- [ ] No console errors

---

##  Support

If something breaks:
1. Check browser console (F12)
2. Check Service Worker logs
3. Clear site data: DevTools -> Application -> Clear site data
4. Hard refresh: Ctrl+Shift+R or Cmd+Shift+R
5. Reinstall app (uninstall -> reinstall)

**Your existing Firebase setup is completely safe - PWA adds features without changing existing code.**
