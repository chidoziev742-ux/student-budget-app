/**
 * Authentication Module
 * Handles signup, login, logout, and auth state
 */

import {
    auth,
    db,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile,
    signOut,
    onAuthStateChanged,
    doc,
    setDoc,
    getDoc
} from './firebase-config.js';

let currentUser = null;
let authStateCallback = null;

/**
 * Set the auth state change callback
 */
export function setAuthStateCallback(callback) {
    authStateCallback = callback;
}

/**
 * Initialize Firebase Auth listener
 */
export function initAuth() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            // Load user profile from Firestore
            await loadUserProfile(user.uid);
            if (authStateCallback) {
                authStateCallback(true, user);
            }
        } else {
            currentUser = null;
            if (authStateCallback) {
                authStateCallback(false, null);
            }
        }
    });
}

/**
 * Load user profile from Firestore
 */
async function loadUserProfile(uid) {
    try {
        const profileDoc = await getDoc(doc(db, 'users', uid, 'profile', 'data'));
        if (profileDoc.exists()) {
            currentUser.profile = profileDoc.data();
        } else {
            // Profile doesn't exist yet (first login)
            currentUser.profile = {
                displayName: currentUser.displayName || 'Student',
                email: currentUser.email || '',
                gender: gender,
                photoType: 'icon'
            };
        }
    } catch (error) {
        console.warn('Could not load profile (may be offline):', error.message);
        // Set default profile if offline
        currentUser.profile = {
            displayName: currentUser.displayName || 'Student',
            email: currentUser.email || '',
            gender: gender,
            photoType: 'icon'
        };
    }
}

/**
 * Sign up a new user
 */
export async function signUp(email, password, displayName, gender) {
    try {
        // Create user account
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const uid = user.uid;

        // Update Firebase Auth profile
        await updateProfile(user, {
            displayName: displayName
        });

        // Create user document in Firestore
        await setDoc(doc(db, 'users', uid, 'profile', 'data'), {
            displayName: displayName,
            email: email,
            gender: gender,
            photoType: 'icon',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

        // Initialize budget document
        await setDoc(doc(db, 'users', uid, 'budget', 'data'), {
            income: 0,
            savings: 0,
            balance: 0,
            expenses: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

        currentUser = user;
        return { success: true, user: user };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Sign in an existing user
 */
export async function signIn(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        currentUser = user;
        
        // Load user profile
        await loadUserProfile(user.uid);
        
        return { success: true, user: user };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Sign out current user
 */
export async function signOutUser() {
    try {
        await signOut(auth);
        currentUser = null;
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Get current user
 */
export function getCurrentUser() {
    return currentUser;
}

/**
 * Get user profile data
 */
export function getUserProfile() {
    if (!currentUser) return null;
    return currentUser.profile || {
        displayName: currentUser.displayName || '',
        email: currentUser.email || '',
        gender: gender,
        photoType: 'icon'
    };
}

/**
 * Update user profile in both Auth and Firestore
 */
export async function updateUserProfile(displayName, gender) {
    if (!currentUser) return { success: false, error: 'No user logged in' };

    try {
        const uid = currentUser.uid;

        // Update Firebase Auth profile
        await updateProfile(currentUser, { displayName });

        // Update Firestore profile
        await setDoc(doc(db, 'users', uid, 'profile', 'data'), {
            displayName: displayName,
            email: currentUser.email,
            gender: gender,
            photoType: 'icon',
            updatedAt: new Date().toISOString()
        }, { merge: true });

        currentUser.profile = {
            displayName,
            gender,
            email: currentUser.email,
            photoType: 'icon'
        };

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated() {
    return currentUser !== null;
}

/**
 * Get greeting message based on first login status
 */
export async function getGreetingMessage() {
    if (!currentUser) return '';

    try {
        const uid = currentUser.uid;
        const budgetDoc = await getDoc(doc(db, 'users', uid, 'budget', 'data'));
        
        // If budget document exists and has data from before, it's not first login
        if (budgetDoc.exists()) {
            const data = budgetDoc.data();
            const isFirstLogin = !data.expenses || data.expenses.length === 0;
            
            if (isFirstLogin) {
                return `Welcome, ${currentUser.displayName}!`;
            } else {
                return `Welcome back, ${currentUser.displayName}!`;
            }
        }
        
        return `Welcome, ${currentUser.displayName}!`;
    } catch (error) {
        console.error('Error getting greeting message:', error);
        return `Welcome, ${currentUser.displayName}!`;
    }
}
