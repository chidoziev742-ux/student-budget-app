/**
 * Authentication Module
 * Handles signup, login, logout, and auth state.
 *
 * Stage 2: use Supabase Auth when configured; keep Firebase as fallback.
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

import { supabase } from './supabase-client.js';

let currentUser = null;
let authStateCallback = null;

function getSupabaseAuthErrorInfo(error) {
    if (!error) {
        return { needsVerification: false, message: 'Authentication failed.' };
    }

    const code = error.code || '';
    const message = error.message || '';

    if (code === 'email_not_confirmed' || /email.*confirm|verify your email/i.test(message)) {
        return {
            needsVerification: true,
            message: 'Please verify your email first. Check your inbox for the verification link we sent you.'
        };
    }

    if (code === 'over_email_send_rate_limit' || /rate limit|too many.*email/i.test(message)) {
        return {
            needsVerification: false,
            message: 'Too many verification emails have been requested. Please wait a while before trying again.'
        };
    }

    if (code === 'invalid_credentials' || /invalid credentials/i.test(message)) {
        return {
            needsVerification: false,
            message: 'Invalid email or password.'
        };
    }

    return {
        needsVerification: false,
        message: message || 'Authentication failed.'
    };
}

function getSupabaseConfig() {
    return window.__SUPABASE_CONFIG__ || {};
}

function isSupabaseConfigured() {
    const config = getSupabaseConfig();
    return !!(
        config.url &&
        config.anonKey &&
        !config.url.includes('YOUR_PROJECT_REF') &&
        !config.anonKey.includes('YOUR_SUPABASE_ANON_KEY')
    );
}

function mapSupabaseUserToAppUser(user) {
    if (!user) return null;

    const metadata = user.user_metadata || {};
    const displayName = metadata.full_name || metadata.name || user.email?.split('@')[0] || 'Student';
    const gender = metadata.gender || 'male';

    return {
        uid: user.id,
        id: user.id,
        email: user.email,
        displayName,
        profile: {
            displayName,
            email: user.email || '',
            gender,
            photoType: 'icon'
        },
        user_metadata: metadata
    };
}

async function loadSupabaseProfileById(userId) {
    if (!userId || !isSupabaseConfigured()) return null;

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

    if (error && error.code !== 'PGRST116') {
        console.warn('[Supabase] profile load warning:', error.message);
    }

    return data || null;
}

async function upsertSupabaseProfile(user) {
    if (!user || !isSupabaseConfigured()) return null;

    const metadata = user.user_metadata || {};
    const payload = {
        id: user.id,
        full_name: metadata.full_name || user.email?.split('@')[0] || 'Student',
        gender: metadata.gender || 'male',
        avatar_url: metadata.avatar_url || null,
        currency: metadata.currency || '₦',
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
        .from('profiles')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();

    if (error) {
        console.warn('[Supabase] profile upsert warning:', error.message);
        return null;
    }

    return data;
}

async function ensureSupabaseOnboardingRecord(userId, onboardingData = {}) {
    if (!userId || !isSupabaseConfigured()) return null;

    const currentValue = onboardingData || {};
    const existingResult = await supabase
        .from('onboarding')
        .select('created_at, completed')
        .eq('user_id', userId)
        .maybeSingle();

    if (existingResult.error && existingResult.error.code !== 'PGRST116') {
        console.warn('[Supabase] onboarding lookup warning:', existingResult.error.message);
    }

    const payload = {
        user_id: userId,
        completed: Boolean(currentValue.completed ?? false),
        income_source: currentValue.income_source ?? null,
        income_amount: currentValue.income_amount ?? null,
        income_frequency: currentValue.income_frequency ?? null,
        next_income_date: currentValue.next_income_date ?? null,
        spending_categories: Array.isArray(currentValue.spending_categories) ? currentValue.spending_categories : [],
        safe_daily_spending: currentValue.safe_daily_spending ?? null,
        updated_at: new Date().toISOString(),
        created_at: existingResult.data?.created_at || new Date().toISOString()
    };

    const { data, error } = await supabase
        .from('onboarding')
        .upsert(payload, { onConflict: 'user_id' })
        .select()
        .maybeSingle();

    if (error) {
        console.warn('[Supabase] onboarding upsert warning:', error.message);
        return null;
    }

    return data;
}

export async function getOnboardingStatus(userId = currentUser?.uid) {
    console.log('[ONBOARDING] getOnboardingStatus called, userId:', userId, 'Supabase configured:', isSupabaseConfigured());
    
    if (!userId || !isSupabaseConfigured()) {
        console.log('[ONBOARDING] returning completed: false (no userId or Supabase not configured)');
        return { success: true, completed: false, onboarding: null };
    }

    const { data, error } = await supabase
        .from('onboarding')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

    console.log('[ONBOARDING] query result - data:', data ? 'found' : 'null', 'error:', error?.message || 'none');

    if (error && error.code !== 'PGRST116') {
        console.warn('[Supabase] onboarding status warning:', error.message);
    }

    const onboarding = data || null;
    const completed = Boolean(onboarding?.completed);
    
    console.log('[ONBOARDING] returning completed:', completed);
    return {
        success: true,
        completed,
        onboarding
    };
}

export async function saveOnboardingProgress(onboardingData, userId = currentUser?.uid) {
    if (!userId) {
        return { success: false, error: 'You must be signed in to save onboarding details.' };
    }

    try {
        const result = await ensureSupabaseOnboardingRecord(userId, onboardingData || {});
        if (!result) {
            return { success: false, error: 'Something went wrong while saving onboarding progress.' };
        }

        return { success: true, onboarding: result };
    } catch (error) {
        return { success: false, error: error.message || 'Something went wrong while saving onboarding progress.' };
    }
}

export async function completeOnboarding(onboardingData, userId = currentUser?.uid) {
    const result = await saveOnboardingProgress({
        ...(onboardingData || {}),
        completed: true
    }, userId);

    if (!result.success) {
        return result;
    }

    return {
        success: true,
        completed: true,
        onboarding: result.onboarding
    };
}

/**
 * Set the auth state change callback
 */
export function setAuthStateCallback(callback) {
    authStateCallback = callback;
}

/**
 * Initialize auth listener.
 */
export function initAuth() {
    if (isSupabaseConfigured()) {
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            const user = session?.user || null;
            currentUser = mapSupabaseUserToAppUser(user);

            if (currentUser) {
                const profile = await loadSupabaseProfileById(currentUser.uid);
                if (profile) {
                    currentUser.profile = {
                        displayName: profile.full_name || currentUser.displayName || 'Student',
                        email: currentUser.email || '',
                        gender: profile.gender || currentUser.profile?.gender || 'male',
                        photoType: 'icon'
                    };
                }
            }

            if (authStateCallback) {
                authStateCallback(Boolean(user), currentUser);
            }
        });

        supabase.auth.onAuthStateChange(async (_event, session) => {
            const user = session?.user || null;
            currentUser = mapSupabaseUserToAppUser(user);

            if (currentUser) {
                const profile = await loadSupabaseProfileById(currentUser.uid);
                if (profile) {
                    currentUser.profile = {
                        displayName: profile.full_name || currentUser.displayName || 'Student',
                        email: currentUser.email || '',
                        gender: profile.gender || currentUser.profile?.gender || 'male',
                        photoType: 'icon'
                    };
                }
            }

            if (authStateCallback) {
                authStateCallback(Boolean(user), currentUser);
            }
        });
        return;
    }

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
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
            currentUser.profile = {
                displayName: currentUser.displayName || 'Student',
                email: currentUser.email || '',
                gender: 'male',
                photoType: 'icon'
            };
        }
    } catch (error) {
        console.warn('Could not load profile (may be offline):', error.message);
        currentUser.profile = {
            displayName: currentUser.displayName || 'Student',
            email: currentUser.email || '',
            gender: 'male',
            photoType: 'icon'
        };
    }
}

/**
 * Sign up a new user
 */
export async function signUp(email, password, displayName, gender) {
    if (isSupabaseConfigured()) {
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: displayName,
                        gender: gender || 'male'
                    }
                }
            });

            if (error) {
                const authError = getSupabaseAuthErrorInfo(error);
                return { success: false, error: authError.message, needsVerification: authError.needsVerification, email };
            }

            const sessionExists = !!data?.session;
            const signedUser = data?.user || null;

            if (!sessionExists && signedUser && !signedUser.email_confirmed_at) {
                return {
                    success: false,
                    needsVerification: true,
                    email: signedUser.email || email,
                    message: 'Account created successfully! Please check your email to verify your account before signing in.'
                };
            }

            currentUser = mapSupabaseUserToAppUser(signedUser);

            if (signedUser) {
                await upsertSupabaseProfile(signedUser);
                await ensureSupabaseOnboardingRecord(signedUser.id, {
                    completed: false,
                    spending_categories: []
                });
                const profile = await loadSupabaseProfileById(signedUser.id);
                if (profile) {
                    currentUser.profile = {
                        displayName: profile.full_name || displayName,
                        email: signedUser.email || email,
                        gender: profile.gender || gender || 'male',
                        photoType: 'icon'
                    };
                }
            }

            return { success: true, user: currentUser };
        } catch (error) {
            const authError = getSupabaseAuthErrorInfo(error);
            return {
                success: false,
                error: authError.message,
                needsVerification: authError.needsVerification,
                email
            };
        }
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const uid = user.uid;

        await updateProfile(user, {
            displayName: displayName
        });

        await setDoc(doc(db, 'users', uid, 'profile', 'data'), {
            displayName: displayName,
            email: email,
            gender: gender,
            photoType: 'icon',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

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
    console.log('[Auth] signIn called, Supabase configured:', isSupabaseConfigured());
    
    if (isSupabaseConfigured()) {
        try {
            console.log('[Auth] calling supabase.auth.signInWithPassword');
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });

            if (error) {
                console.warn('[Auth] signIn error:', error.message);
                const authError = getSupabaseAuthErrorInfo(error);
                return {
                    success: false,
                    error: authError.message,
                    needsVerification: authError.needsVerification,
                    email,
                    rawError: error
                };
            }

            console.log('[Auth] signIn success, user:', data?.user?.email);
            const signedUser = data?.user || null;
            currentUser = mapSupabaseUserToAppUser(signedUser);

            if (currentUser) {
                const profile = await loadSupabaseProfileById(currentUser.uid);
                if (profile) {
                    currentUser.profile = {
                        displayName: profile.full_name || currentUser.displayName || 'Student',
                        email: currentUser.email || '',
                        gender: profile.gender || currentUser.profile?.gender || 'male',
                        photoType: 'icon'
                    };
                }
                // DO NOT overwrite onboarding status on login - this was causing users to be sent to onboarding again
                // Only ensure the onboarding record exists if it doesn't already
                const { data: existingOnboarding } = await supabase
                    .from('onboarding')
                    .select('user_id')
                    .eq('user_id', currentUser.uid)
                    .maybeSingle();
                
                if (!existingOnboarding) {
                    // Only create a new onboarding record if one doesn't exist
                    await ensureSupabaseOnboardingRecord(currentUser.uid, {
                        completed: false,
                        spending_categories: []
                    });
                    console.log('[Auth] created new onboarding record for user');
                } else {
                    console.log('[Auth] onboarding record already exists, preserving status');
                }
            }

            return { success: true, user: currentUser };
        } catch (error) {
            console.error('[Auth] signIn exception:', error);
            const authError = getSupabaseAuthErrorInfo(error);
            return {
                success: false,
                error: authError.message,
                needsVerification: authError.needsVerification,
                email,
                rawError: error
            };
        }
    }

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        currentUser = user;

        await loadUserProfile(user.uid);

        return { success: true, user: user };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Sign out current user
 */
export async function resendVerificationEmail(email) {
    if (!email || !isSupabaseConfigured()) {
        return { success: false, error: 'A valid email is required to resend the verification link.' };
    }

    try {
        const { error } = await supabase.auth.resend({
            type: 'signup',
            email
        });

        if (error) {
            const authError = getSupabaseAuthErrorInfo(error);
            return {
                success: false,
                error: authError.message,
                rateLimited: /rate limit|too many.*email/i.test(error.message || '')
            };
        }

        return {
            success: true,
            message: 'A new verification email has been sent. Please check your inbox and spam folder.'
        };
    } catch (error) {
        const authError = getSupabaseAuthErrorInfo(error);
        return {
            success: false,
            error: authError.message,
            rateLimited: /rate limit|too many.*email/i.test(String(error?.message || ''))
        };
    }
}

export async function signOutUser() {
    if (isSupabaseConfigured()) {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) {
                return { success: false, error: error.message };
            }
            currentUser = null;
            if (authStateCallback) {
                authStateCallback(false, null);
            }
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    try {
        await signOut(auth);
        currentUser = null;
        if (authStateCallback) {
            authStateCallback(false, null);
        }
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
        gender: 'male',
        photoType: 'icon'
    };
}

/**
 * Update user profile in both Auth and Firestore
 */
export async function updateUserProfile(displayName, gender) {
    if (!currentUser) return { success: false, error: 'No user logged in' };

    if (isSupabaseConfigured()) {
        try {
            const { error } = await supabase.auth.updateUser({
                data: {
                    full_name: displayName,
                    gender: gender || 'male'
                }
            });

            if (error) {
                return { success: false, error: error.message };
            }

            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: currentUser.uid,
                    full_name: displayName,
                    gender: gender || 'male',
                    avatar_url: null,
                    currency: '₦',
                    updated_at: new Date().toISOString()
                }, { onConflict: 'id' });

            if (profileError) {
                return { success: false, error: profileError.message };
            }

            currentUser.displayName = displayName;
            currentUser.profile = {
                displayName,
                gender: gender || 'male',
                email: currentUser.email || '',
                photoType: 'icon'
            };

            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    try {
        const uid = currentUser.uid;

        await updateProfile(currentUser, { displayName });

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

    if (isSupabaseConfigured()) {
        return `Welcome, ${currentUser.profile?.displayName || currentUser.displayName || 'Student'}!`;
    }

    try {
        const uid = currentUser.uid;
        const budgetDoc = await getDoc(doc(db, 'users', uid, 'budget', 'data'));

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

/**
 * Request password reset email
 * @param {string} email - The email address to send reset link to
 */
export async function requestPasswordReset(email) {
    console.log('[Auth] requestPasswordReset called');
    
    if (!email) {
        return { success: false, error: 'Please enter your email address.' };
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return { success: false, error: 'Please enter a valid email address.' };
    }

    if (!isSupabaseConfigured()) {
        return { success: false, error: 'Password reset is not available.' };
    }

    try {
        // Determine redirect URL based on current environment
        const baseUrl = window.location.origin + window.location.pathname;
        const redirectUrl = baseUrl + '#reset-password';

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: redirectUrl
        });

        if (error) {
            console.warn('[Auth] Password reset request failed:', error.message);
            return { success: false, error: 'Unable to send reset email. Please try again.' };
        }

        return { 
            success: true, 
            message: 'Check your email for a reset link!'
        };
    } catch (error) {
        console.error('[Auth] Password reset error:', error);
        return { success: false, error: 'Something went wrong. Please try again.' };
    }
}

/**
 * Update user password (for reset password flow)
 * @param {string} newPassword - The new password
 */
export async function updateUserPassword(newPassword) {
    console.log('[Auth] updateUserPassword called');
    
    if (!newPassword) {
        console.log('[Auth] updateUserPassword: empty password');
        return { success: false, error: 'Please enter a new password.' };
    }

    if (newPassword.length < 6) {
        console.log('[Auth] updateUserPassword: password too short');
        return { success: false, error: 'Password must be at least 6 characters.' };
    }

    if (!isSupabaseConfigured()) {
        console.log('[Auth] updateUserPassword: Supabase not configured');
        return { success: false, error: 'Password update is not available.' };
    }

    try {
        // Check current session first
        const { data: sessionData } = await supabase.auth.getSession();
        console.log('[Auth] current session exists:', !!sessionData?.session);
        
        console.log('[Auth] calling supabase.auth.updateUser');
        const { data, error } = await supabase.auth.updateUser({
            password: newPassword
        });

        console.log('[Auth] updateUser result - data:', !!data, 'error:', error?.message || 'none');

        if (error) {
            console.warn('[Auth] Password update failed:', error.message);
            return { success: false, error: 'Unable to update password. Please try again.' };
        }

        console.log('[Auth] Password updated successfully');
        return {
            success: true,
            message: 'Password updated successfully!'
        };
    } catch (error) {
        console.error('[Auth] Password update error:', error);
        return { success: false, error: 'Something went wrong. Please try again.' };
    }
}

/**
 * Check if the current URL contains a password recovery token
 */
export function isPasswordRecoverySession() {
    const hash = window.location.hash || '';
    const params = new URLSearchParams(hash.split('?')[1] || '');
    
    // Check for Supabase recovery token in URL
    return (
        hash.includes('type=recovery') ||
        hash.includes('access_token=') ||
        params.get('type') === 'recovery'
    );
}

/**
 * Get password recovery token from URL
 */
export function getRecoveryTokenFromUrl() {
    const hash = window.location.hash || '';
    const params = new URLSearchParams(hash.split('?')[1] || '');
    
    return {
        type: params.get('type') || '',
        accessToken: params.get('access_token') || '',
        token: params.get('token') || ''
    };
}
