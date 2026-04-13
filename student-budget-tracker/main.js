/**
 * Main Entry Point
 * Imports all modules and initializes the app with Firebase
 */

// Import Firebase and Auth modules
import { 
    initAuth, 
    getCurrentUser, 
    signIn, 
    signUp, 
    signOutUser, 
    getGreetingMessage, 
    getUserProfile, 
    updateUserProfile, 
    isAuthenticated,
    setAuthStateCallback as firebaseSetAuthStateCallback
} from './auth.js';
import { 
    saveBudgetToFirestore, 
    saveExpensesToFirestore, 
    saveSavingsGoalToFirestore, 
    loadBudgetFromFirestore, 
    migrateLocalStorageToFirestore,
    addExpenseToFirestore,
    updateExpenseInFirestore,
    deleteExpenseFromFirestore,
    loadExpensesFromFirestore,
    updateBalanceInFirestore,
    migrateOldDataToMonthly,
    clearUserDataFromFirestore
} from './firestore-sync.js';
import {
    getCurrentMonth,
    getMonthFromDate,
    ensureMonthDocumentExists,
    createMonthIfNotExists,
    updateBudget,
    updateSavingsGoal,
    addIncome,
    addExpense,
    addExpenseToMonth,
    getTotalIncome,
    getTotalExpenses,
    getSavings,
    getMonthData,
    getMonthlySummary,
    getAllMonths,
    deleteIncomeEntry,
    deleteExpenseEntry,
    migrateOldExpensesToMonthly,
    getUserMonthsList,
    calculateCategorySpent
} from './monthly-budget-system.js';

// Store imports globally for other scripts
window.firebaseAuth = { 
    initAuth, 
    getCurrentUser, 
    signIn, 
    signUp, 
    signOutUser, 
    getGreetingMessage, 
    getUserProfile, 
    updateUserProfile, 
    isAuthenticated 
};
window.firestoreSync = { 
    saveBudgetToFirestore, 
    saveExpensesToFirestore, 
    saveSavingsGoalToFirestore, 
    loadBudgetFromFirestore, 
    migrateLocalStorageToFirestore,
    addExpenseToFirestore,
    updateExpenseInFirestore,
    deleteExpenseFromFirestore,
    loadExpensesFromFirestore,
    updateBalanceInFirestore,
    migrateOldDataToMonthly,
    clearUserDataFromFirestore
};

// Monthly budget system
window.monthlyBudget = {
    getCurrentMonth,
    getMonthFromDate,
    ensureMonthDocumentExists,
    createMonthIfNotExists,
    updateBudget,
    updateSavingsGoal,
    addIncome,
    addExpense,
    addExpenseToMonth,
    getTotalIncome,
    getTotalExpenses,
    getSavings,
    getMonthData,
    getMonthlySummary,
    getAllMonths,
    deleteIncomeEntry,
    deleteExpenseEntry,
    migrateOldExpensesToMonthly,
    getUserMonthsList,
    calculateCategorySpent
};

// Track if data needs to be synced to Firestore
let syncToFirestore = false;
let authStateCallback = null;

// Note: Dynamic script loading is no longer needed since scripts are loaded in index.html
// The loadOriginalScriptsAsync function has been removed

/**
 * Set auth state callback
 */
function setAuthStateCallback(callback) {
    authStateCallback = callback;
    firebaseSetAuthStateCallback((isAuth, user) => {
        if (callback) callback(isAuth, user);
    });
}

/**
 * Switch between auth forms
 */
window.switchAuthForm = function(form) {
    document.getElementById('login-form').classList.toggle('active', form === 'login');
    document.getElementById('signup-form').classList.toggle('active', form === 'signup');
    
    // Clear error messages
    document.getElementById('login-error').textContent = '';
    document.getElementById('signup-error').textContent = '';
};

/**
 * Handle login
 */
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    
    errorEl.textContent = 'Signing in...';
    
    const result = await signIn(email, password);
    
    if (result.success) {
        document.getElementById('login-form-element').reset();
        // Auth state change will trigger showApp()
    } else {
        errorEl.textContent = result.error || 'Failed to sign in. Please try again.';
    }
}

/**
 * Handle signup
 */
async function handleSignUp(e) {
    e.preventDefault();
    
    const displayName = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const gender = document.getElementById('signup-gender').value;
    const errorEl = document.getElementById('signup-error');
    
    if (!displayName || !gender) {
        errorEl.textContent = 'Please fill in all fields';
        return;
    }
    
    errorEl.textContent = 'Creating account...';
    
    const result = await signUp(email, password, displayName, gender);
    
    if (result.success) {
        document.getElementById('signup-form-element').reset();
        // Auth state change will trigger showApp()
    } else {
        errorEl.textContent = result.error || 'Failed to create account. Please try again.';
    }
}

/**
 * Handle logout
 */
async function handleLogout() {
    if (confirm('Are you sure you want to sign out?')) {
        const result = await signOutUser();
        if (result.success) {
            showAuthScreen();
        }
    }
}

/**
 * Show authentication screen
 */
function showAuthScreen() {
    const authScreen = document.getElementById('auth-screen');
    const appContainer = document.getElementById('app-container');
    
    if (authScreen) {
        authScreen.style.display = 'flex';
    }
    if (appContainer) {
        appContainer.style.display = 'none';
    }
}

/**
 * Show app
 */
async function showApp() {
    console.log('showApp() called');
    
    // Verify CONFIG is available
    if (!window.CONFIG) {
        console.error('ERROR: CONFIG still not initialized in showApp()');
        return;
    }
    
    const authScreen = document.getElementById('auth-screen');
    const appContainer = document.getElementById('app-container');
    
    if (authScreen) authScreen.style.display = 'none';
    if (appContainer) appContainer.style.display = 'block';
    
    // Wait for showToast to be available
    let attempts = 0;
    while (!window.showToast && attempts < 20) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    if (!window.showToast) {
        console.warn('showToast not available, continuing anyway');
    }
    
    // Load user data
    await loadUserData();
    
    // Display greeting
    const greeting = await getGreetingMessage();
    const greetingEl = document.getElementById('greeting-message');
    if (greetingEl) {
        greetingEl.textContent = greeting;
    }
    
    // Update profile display in settings
    updateProfileDisplay();
    
    // Initialize the app (if not already initialized)
    if (window.initApp && !window.appInitialized) {
        window.initApp();
        window.appInitialized = true;
    }
}

/**
 * Update profile display in settings
 */
function updateProfileDisplay() {
    const profile = getUserProfile();
    if (!profile) return;
    
    document.getElementById('profile-name').textContent = profile.displayName || '-';
    document.getElementById('profile-email').textContent = profile.email || '-';
    document.getElementById('profile-gender').textContent = profile.gender ? (profile.gender === 'male' ? 'Male' : 'Female') : '-';
    
    // Update avatar icon
    const avatarIcon = document.getElementById('profile-avatar-icon');
    if (avatarIcon) {
        if (profile.gender === 'female') {
            avatarIcon.className = 'fas fa-user-circle female-avatar';
        } else {
            avatarIcon.className = 'fas fa-user-circle male-avatar';
        }
    }
    
    // Populate settings form
    document.getElementById('settings-name').value = profile.displayName || '';
    document.getElementById('settings-gender').value = profile.gender || 'male';
}

/**
 * Load user data - Monthly system only
 * Financial data is loaded on-demand from users/{uid}/months/{YYYY-MM}
 */
async function loadUserData() {
    const user = getCurrentUser();
    if (!user) {
        console.log('No user logged in');
        return;
    }
    
    if (!window.CONFIG) {
        console.log('CONFIG not available yet');
        return;
    }
    
    syncToFirestore = true;
    
    console.log('[Monthly System] User authenticated. Using monthly documents only.');
    console.log('[Monthly System] All financial data loads from users/{uid}/months/{YYYY-MM}');
    
    // App will load monthly data on-demand in dashboard, budget, and expense pages
    // No preloading of global state
}

/**
 * Setup Firestore sync - only for data clearing operations
 * All other operations use monthly system directly
 */
function setupFirestoreSync() {
    const originalSaveAppData = window.saveAppData;
    window.saveAppData = async function() {
        originalSaveAppData();
        
        // Only clear operation syncs to Firestore
        const user = getCurrentUser();
        if (user && syncToFirestore) {
            try {
                const isEmptyState = !window.appState.budget && (!window.appState.expenses || window.appState.expenses.length === 0) && (!window.appState.savingsGoal || window.appState.savingsGoal === 0);
                if (isEmptyState && window.firestoreSync.clearUserDataFromFirestore) {
                    await window.firestoreSync.clearUserDataFromFirestore(user.uid);
                }
                // Otherwise: do NOT sync to old system paths
                // All financial operations use monthly system directly
            } catch (error) {
                console.error('Error during firestore operations:', error);
            }
        }
    };
}

/**
 * Handle settings form submission
 */
async function handleSettingsSubmit(e) {
    e.preventDefault();
    
    const displayName = document.getElementById('settings-name').value.trim();
    const gender = document.getElementById('settings-gender').value;
    
    if (!displayName) {
        showToast('Please enter your name', 'error');
        return;
    }
    
    const result = await updateUserProfile(displayName, gender);
    
    if (result.success) {
        updateProfileDisplay();
        showToast('Profile updated successfully', 'success');
    } else {
        showToast('Failed to update profile: ' + result.error, 'error');
    }
}

/**
 * Initialize everything when page loads
 */
document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOMContentLoaded - Starting app initialization');
    
    // Scripts are already loaded via index.html script tags
    // CONFIG and appState are already defined in app.js
    
    // 1. Verify CONFIG loaded
    if (!window.CONFIG) {
        console.error('CRITICAL: CONFIG not initialized');
        return;
    }
    console.log('CONFIG loaded successfully:', window.CONFIG.APP_NAME);
    
    // 2. Set up Firestore sync
    setupFirestoreSync();
    
    // 3. Set up auth state callback BEFORE initializing auth
    setAuthStateCallback(async (isAuth, user) => {
        if (isAuth) {
            showApp();
        } else {
            showAuthScreen();
        }
    });
    
    // 4. Set up auth form handlers
    const loginForm = document.getElementById('login-form-element');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    const signupForm = document.getElementById('signup-form-element');
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignUp);
    }
    
    // 6. Set up settings form handler
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', handleSettingsSubmit);
    }
    
    // 7. Set up logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // 8. Set up data action buttons in settings
    const exportDataBtn = document.getElementById('export-data-btn');
    if (exportDataBtn) {
        exportDataBtn.addEventListener('click', function() {
            if (window.exportData) window.exportData();
        });
    }
    
    const importDataBtn = document.getElementById('import-data-btn');
    if (importDataBtn) {
        importDataBtn.addEventListener('click', function() {
            if (window.importData) window.importData();
        });
    }
    
    const clearDataBtn = document.getElementById('clear-data-btn');
    if (clearDataBtn) {
        clearDataBtn.addEventListener('click', function() {
            if (window.confirmClearData) window.confirmClearData();
        });
    }
    
    // 9. Initialize Firebase Auth AFTER everything is set up
    console.log('Initializing Firebase Auth');
    initAuth();
    
    // 10. Register Service Worker for PWA functionality
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then((registration) => {
                console.log('[PWA] Service Worker registered successfully', registration);
                
                // Check for updates periodically
                setInterval(() => {
                    registration.update();
                }, 60000); // Check every minute
            })
            .catch((error) => {
                console.log('[PWA] Service Worker registration failed:', error);
                // Service Worker not available, app will still work
            });
        
        // Listen for messages from Service Worker
        navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data.type === 'SYNC_EXPENSES') {
                console.log('[PWA] Syncing expenses:', event.data.message);
                // Optionally trigger data sync when coming back online
            }
        });
    }
    
    // 11. Handle online/offline events
    window.addEventListener('online', () => {
        console.log('[PWA] App is now online - syncing data');
        if (window.showToast) {
            window.showToast('✓ Connected - syncing your data', 'success');
        }
    });
    
    window.addEventListener('offline', () => {
        console.log('[PWA] App is now offline - using cached data');
        if (window.showToast) {
            window.showToast('⚠ You are offline - changes will sync when reconnected', 'warning');
        }
    });
});
