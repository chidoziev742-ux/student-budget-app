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
    getOnboardingStatus,
    saveOnboardingProgress,
    completeOnboarding,
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

const verificationState = {
    resendCooldown: false,
    resendTimer: null
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
    getUserMonthsList,
    calculateCategorySpent
};

// Track if data needs to be synced to Firestore
let syncToFirestore = false;
let authStateCallback = null;
let onboardingStepIndex = 0;
const onboardingSteps = [
    { label: 'Welcome', fill: '12.5%' },
    { label: 'Income source', fill: '25%' },
    { label: 'Income amount', fill: '37.5%' },
    { label: 'Income frequency', fill: '50%' },
    { label: 'Next income', fill: '62.5%' },
    { label: 'Spending categories', fill: '75%' },
    { label: 'Savings goal', fill: '87.5%' },
    { label: 'Safe spending', fill: '100%' }
];

function getOnboardingSummaryData() {
    const draft = JSON.parse(localStorage.getItem('studentBudgetTrackerOnboardingDraft') || 'null') || {};
    const selectedCategories = Array.isArray(draft.spending_categories) ? draft.spending_categories : [];
    const goalValue = draft.goal_choice && draft.goal_choice !== 'not-now' ? (draft.goal_name || draft.goal_choice) : 'Not right now';
    const amountVal = draft.income_amount ? `₦${Number(draft.income_amount).toLocaleString()}` : 'Not set';
    return {
        income_source: draft.income_source || 'Not set',
        income_amount: amountVal,
        income_frequency: draft.income_frequency || 'Not set',
        next_income_date: draft.next_income_date || 'Not set',
        safe_daily_spending: draft.safe_daily_spending ? `₦${Number(draft.safe_daily_spending).toLocaleString()}` : 'Not set',
        spending_categories: selectedCategories.length ? selectedCategories.join(', ') : 'No categories selected',
        savings_goal: goalValue,
        goal_amount: draft.goal_amount ? `₦${Number(draft.goal_amount).toLocaleString()}` : 'Not set'
    };
}

function renderOnboardingSummary() {
    const summaryList = document.getElementById('onboarding-summary-list');
    if (!summaryList) return;

    const summary = getOnboardingSummaryData();
    summaryList.innerHTML = `
        <li><strong>Income source:</strong> ${summary.income_source}</li>
        <li><strong>Amount:</strong> ${summary.income_amount}</li>
        <li><strong>Frequency:</strong> ${summary.income_frequency}</li>
        <li><strong>Next income:</strong> ${summary.next_income_date}</li>
        <li><strong>Categories:</strong> ${summary.spending_categories}</li>
        <li><strong>Saving for:</strong> ${summary.savings_goal}</li>
        <li><strong>Goal amount:</strong> ${summary.goal_amount}</li>
        <li><strong>Safe daily spend:</strong> ${summary.safe_daily_spending}</li>
    `;
}

function updateOnboardingUI() {
    const stepIndicator = document.getElementById('onboarding-step-indicator');
    const stepLabel = document.getElementById('onboarding-step-label');
    const progressFill = document.getElementById('onboarding-progress-fill');
    const steps = document.querySelectorAll('.onboarding-step');
    const nextBtn = document.getElementById('onboarding-next-btn');
    const submitBtn = document.getElementById('onboarding-submit-btn');
    const backBtn = document.getElementById('onboarding-back-btn');

    if (!stepIndicator || !stepLabel || !progressFill) return;

    const currentStep = onboardingSteps[onboardingStepIndex] || onboardingSteps[0];
    stepIndicator.textContent = `Step ${onboardingStepIndex + 1} of ${onboardingSteps.length}`;
    stepLabel.textContent = currentStep.label;
    progressFill.style.width = currentStep.fill;

    steps.forEach((step, index) => step.classList.toggle('active', index === onboardingStepIndex));

    if (backBtn) backBtn.style.display = onboardingStepIndex > 0 ? 'block' : 'none';
    if (nextBtn) nextBtn.style.display = onboardingStepIndex < onboardingSteps.length - 1 ? 'block' : 'none';
    if (submitBtn) submitBtn.style.display = onboardingStepIndex === onboardingSteps.length - 1 ? 'block' : 'none';

    renderOnboardingSummary();
}

function advanceOnboarding() {
    if (onboardingStepIndex < onboardingSteps.length - 1) {
        onboardingStepIndex += 1;
        updateOnboardingUI();
    }
}

function retreatOnboarding() {
    if (onboardingStepIndex > 0) {
        onboardingStepIndex -= 1;
        updateOnboardingUI();
    }
}

function collectOnboardingCheckboxes() {
    const checked = [...document.querySelectorAll('.onboarding-choice input:checked')].map(input => input.value);
    const draft = JSON.parse(localStorage.getItem('studentBudgetTrackerOnboardingDraft') || 'null') || {};
    draft.spending_categories = checked;
    localStorage.setItem('studentBudgetTrackerOnboardingDraft', JSON.stringify(draft));
    return checked;
}

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
    const loginForm = document.getElementById('login-form-element');
    const signupForm = document.getElementById('signup-form-element');
    const verificationCard = document.getElementById('verification-state');
    const onboardingScreen = document.getElementById('onboarding-screen');
    const appContainer = document.getElementById('app-container');
    const welcomeOverlay = document.getElementById('welcome-overlay');
    const authScreen = document.getElementById('auth-screen');

    const isLogin = form === 'login';
    const isSignup = form === 'signup';

    if (loginForm) {
        loginForm.classList.toggle('active', isLogin);
        loginForm.style.display = isLogin ? 'block' : 'none';
    }
    if (signupForm) {
        signupForm.classList.toggle('active', isSignup);
        signupForm.style.display = isSignup ? 'block' : 'none';
    }
    if (verificationCard) verificationCard.style.display = form === 'verification' ? 'block' : 'none';
    if (onboardingScreen) onboardingScreen.style.display = form === 'onboarding' ? 'block' : 'none';
    if (appContainer) appContainer.style.display = 'none';
    if (authScreen) authScreen.style.display = 'flex';
    if (welcomeOverlay) {
        welcomeOverlay.classList.remove('visible', 'is-finished');
        welcomeOverlay.setAttribute('aria-hidden', 'true');
    }

    // Clear errors
    const loginError = document.getElementById('login-error');
    const signupError = document.getElementById('signup-error');
    if (loginError) loginError.textContent = '';
    if (signupError) signupError.textContent = '';
};

function showVerificationState(email, message) {
    const verificationCard = document.getElementById('verification-state');
    const verificationEmail = document.getElementById('verification-email');
    const verificationMessage = document.getElementById('verification-message');
    const verificationError = document.getElementById('verification-error');
    const loginForm = document.getElementById('login-form-element');
    const signupForm = document.getElementById('signup-form-element');
    const onboardingCard = document.getElementById('onboarding-screen');

    if (verificationCard) verificationCard.style.display = 'block';
    if (loginForm) loginForm.classList.remove('active');
    if (signupForm) signupForm.classList.remove('active');
    if (onboardingCard) onboardingCard.style.display = 'none';
    if (verificationEmail) verificationEmail.textContent = email || 'your email';
    if (verificationMessage) verificationMessage.textContent = message || 'Account created successfully! Please check your email to verify your account before signing in.';
    if (verificationError) verificationError.textContent = '';
}

function hideVerificationState() {
    const verificationCard = document.getElementById('verification-state');
    if (verificationCard) verificationCard.style.display = 'none';
}

function setTopLevelScreenState({ authVisible = false, onboardingVisible = false, welcomeVisible = false, appVisible = false } = {}) {
    const authScreen = document.getElementById('auth-screen');
    const onboardingScreen = document.getElementById('onboarding-screen');
    const welcomeOverlay = document.getElementById('welcome-overlay');
    const appContainer = document.getElementById('app-container');

    const shouldShowAuthShell = authVisible || onboardingVisible;
    if (authScreen) {
        authScreen.style.display = shouldShowAuthShell ? 'flex' : 'none';
    }

    if (onboardingScreen) {
        onboardingScreen.style.display = onboardingVisible ? 'block' : 'none';
        onboardingScreen.classList.toggle('active', onboardingVisible);
    }

    if (welcomeOverlay) {
        welcomeOverlay.style.display = welcomeVisible ? 'block' : 'none';
        if (welcomeVisible) {
            welcomeOverlay.classList.add('visible');
            welcomeOverlay.setAttribute('aria-hidden', 'false');
        } else {
            welcomeOverlay.classList.remove('visible', 'is-finished');
            welcomeOverlay.setAttribute('aria-hidden', 'true');
        }
    }

    if (appContainer) {
        appContainer.style.display = appVisible ? 'block' : 'none';
    }
}

function showOnboardingScreen() {
    const authScreen = document.getElementById('auth-screen');
    const appContainer = document.getElementById('app-container');
    const onboardingScreen = document.getElementById('onboarding-screen');
    const loginForm = document.getElementById('login-form-element');
    const signupForm = document.getElementById('signup-form-element');
    const verificationCard = document.getElementById('verification-state');
    const welcomeOverlay = document.getElementById('welcome-overlay');

    setTopLevelScreenState({ authVisible: true, onboardingVisible: true, welcomeVisible: false, appVisible: false });
    if (appContainer) appContainer.style.display = 'none';
    if (loginForm) {
        loginForm.classList.remove('active');
        loginForm.style.display = 'none';
    }
    if (signupForm) {
        signupForm.classList.remove('active');
        signupForm.style.display = 'none';
    }
    if (verificationCard) verificationCard.style.display = 'none';
    if (welcomeOverlay) {
        welcomeOverlay.classList.remove('visible', 'is-finished');
        welcomeOverlay.setAttribute('aria-hidden', 'true');
    }
    if (onboardingScreen) {
        onboardingScreen.style.display = 'block';
        onboardingScreen.classList.add('active');
    }
}

function hideOnboardingScreen() {
    const onboardingScreen = document.getElementById('onboarding-screen');
    if (onboardingScreen) onboardingScreen.style.display = 'none';
}

function setVerificationResendState(isLoading, text) {
    const resendBtn = document.getElementById('resend-verification-btn');
    if (!resendBtn) return;

    resendBtn.disabled = isLoading || verificationState.resendCooldown;
    resendBtn.textContent = text || 'Resend verification email';
}

/**
 * Set loading state for auth buttons
 */
function setAuthButtonLoading(button, isLoading, label) {
    if (!button) return;

    const spinner = button.querySelector('.auth-spinner');
    const text = button.querySelector('.auth-button-text');

    button.disabled = isLoading;
    button.classList.toggle('is-loading', isLoading);

    if (spinner) {
        spinner.hidden = !isLoading;
    }

    if (text) {
        text.textContent = isLoading ? label : (button.dataset.defaultText || label);
    }

    const arrow = button.querySelector('.auth-arrow');
    if (arrow) {
        arrow.style.opacity = isLoading ? '0' : '1';
        arrow.style.transform = isLoading ? 'translateX(8px)' : 'translateX(0)';
    }
}

function resetAuthButtons() {
    document.querySelectorAll('.auth-submit').forEach((button) => {
        button.disabled = false;
        button.classList.remove('is-loading');

        const spinner = button.querySelector('.auth-spinner');
        if (spinner) spinner.hidden = true;

        const arrow = button.querySelector('.auth-arrow');
        if (arrow) {
            arrow.style.opacity = '1';
            arrow.style.transform = 'translateX(0)';
        }

        const text = button.querySelector('.auth-button-text');
        if (text) {
            const fallback = text.dataset.defaultLabel || text.textContent || 'Continue';
            text.textContent = fallback;
            button.dataset.defaultText = fallback;
        }
    });
}

/**
 * Handle login
 */
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    const submitBtn = document.querySelector('#login-form-element .auth-submit');
    
    if (!email || !password) {
        errorEl.textContent = 'Please enter your email and password.';
        return;
    }

    const defaultLabel = 'Sign In';
    submitBtn.dataset.defaultText = defaultLabel;
    setAuthButtonLoading(submitBtn, true, 'Signing in...');
    errorEl.textContent = '';
    
    try {
        const result = await signIn(email, password);
        
        if (result.success) {
            hideVerificationState();
            document.getElementById('login-form-element').reset();
            // Auth state change will trigger showApp()
        } else if (result.needsVerification) {
            showVerificationState(email, 'Please verify your email first. Check your inbox for the verification link we sent you.');
        } else {
            errorEl.textContent = result.error || 'Failed to sign in. Please try again.';
        }
    } finally {
        setAuthButtonLoading(submitBtn, false, defaultLabel);
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
    const submitBtn = document.querySelector('#signup-form-element .auth-submit');
    
    if (!displayName || !gender) {
        errorEl.textContent = 'Please fill in all fields';
        return;
    }

    const defaultLabel = 'Create Account';
    submitBtn.dataset.defaultText = defaultLabel;
    setAuthButtonLoading(submitBtn, true, 'Creating account...');
    errorEl.textContent = '';
    
    try {
        const result = await signUp(email, password, displayName, gender);
        
        if (result.success) {
            document.getElementById('signup-form-element').reset();
            // Auth state change will trigger showApp()
        } else if (result.needsVerification) {
            showVerificationState(email, result.message || 'Account created successfully! Please check your email to verify your account before signing in.');
        } else {
            errorEl.textContent = result.error || 'Failed to create account. Please try again.';
        }
    } finally {
        setAuthButtonLoading(submitBtn, false, defaultLabel);
    }
}

/**
 * Handle logout
 */
async function handleLogout() {
    if (confirm('Are you sure you want to sign out?')) {
        const result = await signOutUser();
        if (result.success) {
            localStorage.removeItem('studentBudgetTrackerOnboardingDraft');
            window.switchAuthForm('login');
            showAuthScreen();
            hideOnboardingScreen();
            const welcomeOverlay = document.getElementById('welcome-overlay');
            if (welcomeOverlay) {
                welcomeOverlay.classList.remove('visible', 'is-finished');
                welcomeOverlay.setAttribute('aria-hidden', 'true');
            }
        }
    }
}

async function submitOnboarding(e) {
    e.preventDefault();

    const user = getCurrentUser();
    if (!user) {
        showAuthScreen();
        return;
    }

    const form = document.getElementById('onboarding-form');
    if (!form) return;

    const draft = JSON.parse(localStorage.getItem('studentBudgetTrackerOnboardingDraft') || 'null') || {};

    const selectedGoalChoice = document.querySelector('input[name="onboarding-goal-choice"]:checked')?.value || draft.goal_choice || 'not-now';
    const selectedGoalName = selectedGoalChoice === 'not-now' ? null : (selectedGoalChoice === 'something else' ? 'Something else' : selectedGoalChoice);
    const goalAmount = Number(document.getElementById('onboarding-goal-amount')?.value || draft.goal_amount || 0);

    const onboardingPayload = {
        income_source: document.getElementById('onboarding-income-source')?.value || draft.income_source || '',
        income_amount: Number(document.getElementById('onboarding-income-amount')?.value || draft.income_amount || 0),
        income_frequency: document.getElementById('onboarding-income-frequency')?.value || draft.income_frequency || 'monthly',
        next_income_date: document.getElementById('onboarding-next-income-date')?.value || draft.next_income_date || null,
        spending_categories: Array.isArray(draft.spending_categories)
            ? draft.spending_categories
            : collectOnboardingCheckboxes(),
        safe_daily_spending: Number(document.getElementById('onboarding-safe-daily-spending')?.value || draft.safe_daily_spending || 0),
        goal_choice: selectedGoalChoice,
        goal_name: selectedGoalName,
        goal_amount: goalAmount,
        completed: true
    };

    if (Number(onboardingPayload.income_amount) <= 0) {
        const errorEl = document.getElementById('onboarding-error');
        if (errorEl) errorEl.textContent = 'Please enter a valid income amount before finishing setup.';
        return;
    }

    const saveResult = await completeOnboarding(onboardingPayload, user.uid);
    if (!saveResult.success) {
        const errorEl = document.getElementById('onboarding-error');
        if (errorEl) errorEl.textContent = saveResult.error || 'Something went wrong while saving onboarding details.';
        return;
    }

    if (selectedGoalChoice !== 'not-now' && goalAmount > 0) {
        const month = getCurrentMonth();
        await updateSavingsGoal(user.uid, month, Number(goalAmount));
    }

    localStorage.removeItem('studentBudgetTrackerOnboardingDraft');
    showWelcomeSequence();
}

function showWelcomeSequence() {
    const authScreen = document.getElementById('auth-screen');
    const appContainer = document.getElementById('app-container');
    const welcomeScreen = document.getElementById('welcome-overlay');
    if (!welcomeScreen) {
        showApp();
        return;
    }

    setTopLevelScreenState({ authVisible: false, onboardingVisible: false, welcomeVisible: true, appVisible: false });
    if (authScreen) authScreen.style.display = 'none';
    if (appContainer) appContainer.style.display = 'none';
    const onboardingScreen = document.getElementById('onboarding-screen');
    if (onboardingScreen) {
        onboardingScreen.style.display = 'none';
        onboardingScreen.classList.remove('active');
    }
    welcomeScreen.classList.add('visible');
    welcomeScreen.setAttribute('aria-hidden', 'false');

    setTimeout(() => {
        welcomeScreen.classList.add('is-finished');
    }, 1800);

    setTimeout(() => {
        welcomeScreen.classList.remove('visible');
        welcomeScreen.classList.remove('is-finished');
        welcomeScreen.setAttribute('aria-hidden', 'true');
        showApp();
    }, 3600);
}

function populateOnboardingFormDraft() {
    const draft = JSON.parse(localStorage.getItem('studentBudgetTrackerOnboardingDraft') || 'null') || {};
    const source = document.getElementById('onboarding-income-source');
    const amount = document.getElementById('onboarding-income-amount');
    const frequency = document.getElementById('onboarding-income-frequency');
    const nextDate = document.getElementById('onboarding-next-income-date');
    const daily = document.getElementById('onboarding-safe-daily-spending');
    const goalAmount = document.getElementById('onboarding-goal-amount');

    if (source && draft.income_source) source.value = draft.income_source;
    if (amount && draft.income_amount != null) amount.value = draft.income_amount;
    if (frequency && draft.income_frequency) frequency.value = draft.income_frequency;
    if (nextDate && draft.next_income_date) nextDate.value = draft.next_income_date;
    if (daily && draft.safe_daily_spending != null) daily.value = draft.safe_daily_spending;
    if (goalAmount && draft.goal_amount != null) goalAmount.value = draft.goal_amount;

    const goalChoice = document.querySelectorAll('input[name="onboarding-goal-choice"]');
    goalChoice.forEach((radio) => {
        radio.checked = draft.goal_choice ? radio.value === draft.goal_choice : radio.value === 'not-now';
    });

    const goalDetails = document.getElementById('onboarding-goal-details');
    if (goalDetails) {
        const showGoalDetails = draft.goal_choice && draft.goal_choice !== 'not-now';
        goalDetails.style.display = showGoalDetails ? 'block' : 'none';
    }

    const checkboxes = document.querySelectorAll('.onboarding-choice input[type="checkbox"]');
    checkboxes.forEach((checkbox) => {
        checkbox.checked = (draft.spending_categories || []).includes(checkbox.value);
    });
}

function persistOnboardingDraft() {
    const draft = JSON.parse(localStorage.getItem('studentBudgetTrackerOnboardingDraft') || 'null') || {};
    draft.income_source = document.getElementById('onboarding-income-source')?.value || '';
    draft.income_amount = Number(document.getElementById('onboarding-income-amount')?.value || 0);
    draft.income_frequency = document.getElementById('onboarding-income-frequency')?.value || 'monthly';
    draft.next_income_date = document.getElementById('onboarding-next-income-date')?.value || '';
    draft.safe_daily_spending = Number(document.getElementById('onboarding-safe-daily-spending')?.value || 0);
    draft.spending_categories = collectOnboardingCheckboxes();

    const selectedGoal = document.querySelector('input[name="onboarding-goal-choice"]:checked')?.value || 'not-now';
    draft.goal_choice = selectedGoal;
    draft.goal_name = selectedGoal === 'not-now' ? '' : selectedGoal;
    draft.goal_amount = Number(document.getElementById('onboarding-goal-amount')?.value || 0);

    localStorage.setItem('studentBudgetTrackerOnboardingDraft', JSON.stringify(draft));
    renderOnboardingSummary();
}

/**
 * Show authentication screen
 */
function showAuthScreen() {
    const authScreen = document.getElementById('auth-screen');
    const appContainer = document.getElementById('app-container');
    const welcomeOverlay = document.getElementById('welcome-overlay');
    const loginForm = document.getElementById('login-form-element');
    const signupForm = document.getElementById('signup-form-element');
    const verificationCard = document.getElementById('verification-state');
    const onboardingScreen = document.getElementById('onboarding-screen');

    setTopLevelScreenState({ authVisible: true, onboardingVisible: false, welcomeVisible: false, appVisible: false });
    if (authScreen) {
        authScreen.style.display = 'flex';
    }
    if (appContainer) {
        appContainer.style.display = 'none';
    }
    if (onboardingScreen) {
        onboardingScreen.style.display = 'none';
        onboardingScreen.classList.remove('active');
    }
    if (verificationCard) {
        verificationCard.style.display = 'none';
    }
    if (welcomeOverlay) {
        welcomeOverlay.classList.remove('visible', 'is-finished');
        welcomeOverlay.setAttribute('aria-hidden', 'true');
    }

    if (loginForm) {
        loginForm.classList.add('active');
        loginForm.style.display = 'block';
    }
    if (signupForm) {
        signupForm.classList.remove('active');
        signupForm.style.display = 'none';
    }
}

/**
 * Show app
 */
async function showApp() {
    console.log('[APP] showing app');
    
    // Verify CONFIG is available
    if (!window.CONFIG) {
        console.error('ERROR: CONFIG still not initialized in showApp()');
        return;
    }
    
    const authScreen = document.getElementById('auth-screen');
    const appContainer = document.getElementById('app-container');
    const route = window.normalizePageRoute ? window.normalizePageRoute(window.location.hash) : 'dashboard';
    
    setTopLevelScreenState({ authVisible: false, onboardingVisible: false, welcomeVisible: false, appVisible: true });
    if (authScreen) authScreen.style.display = 'none';
    if (appContainer) appContainer.style.display = 'block';
    hideOnboardingScreen();
    
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
    
    // Initialize the app (if not already initialized)
    if (window.initApp && !window.appInitialized) {
        window.initApp();
        window.appInitialized = true;
    }

    if (window.showPage && typeof window.showPage === 'function') {
        console.log('[ROUTER] current route:', route);
        await window.showPage(route);
    }
    
    // Display greeting
    const greeting = await getGreetingMessage();
    const greetingEl = document.getElementById('greeting-message');
    if (greetingEl) {
        greetingEl.textContent = greeting;
    }
    
    // Update profile display in settings
    updateProfileDisplay();
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
    
    console.log('[Monthly System] User authenticated. Using Supabase financial tables.');
    console.log('[Monthly System] All financial data loads from Supabase: budgets, income, expenses, savings_goals.');
    
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
                // const isEmptyState = !window.appState.budget && (!window.appState.expenses || window.appState.expenses.length === 0) && (!window.appState.savingsGoal || window.appState.savingsGoal === 0);
                // if (isEmptyState && window.firestoreSync.clearUserDataFromFirestore) {
                //     await window.firestoreSync.clearUserDataFromFirestore(user.uid);
                // }
                // Otherwise: do NOT sync to old system paths
                // All financial operations use monthly system directly
                console.log('firetore sync monthly system is  the source of truth')
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
        console.log('[AUTH] session detected:', !!isAuth, 'user:', user?.email || 'none');
        if (isAuth) {
            hideVerificationState();
            const { completed } = await getOnboardingStatus(user?.uid || getCurrentUser()?.uid);
            if (completed) {
                showApp();
            } else {
                populateOnboardingFormDraft();
                showOnboardingScreen();
            }
        } else {
            console.log('[AUTH] no session found; showing auth screen');
            showAuthScreen();
        }
    });

    // Reset auth buttons to a non-loading state before user interaction
    resetAuthButtons();

    const backToLoginBtn = document.getElementById('back-to-login-btn');
    if (backToLoginBtn) {
        backToLoginBtn.addEventListener('click', () => {
            hideVerificationState();
            window.switchAuthForm('login');
        });
    }

    const resendVerificationBtn = document.getElementById('resend-verification-btn');
    if (resendVerificationBtn) {
        resendVerificationBtn.addEventListener('click', async () => {
            const verificationEmail = document.getElementById('verification-email')?.textContent?.trim();
            const verificationError = document.getElementById('verification-error');
            if (!verificationEmail || verificationEmail === 'your email') {
                if (verificationError) verificationError.textContent = 'Please enter a valid email address to resend the verification link.';
                return;
            }

            const { resendVerificationEmail } = await import('./auth.js');
            setVerificationResendState(true, 'Sending...');
            verificationError.textContent = '';

            try {
                const result = await resendVerificationEmail(verificationEmail);
                if (result.success) {
                    verificationState.resendCooldown = true;
                    setVerificationResendState(false, 'Verification email sent');
                    if (verificationError) {
                        verificationError.textContent = result.message || 'A new verification email has been sent.';
                        verificationError.classList.add('success-message');
                    }
                    setTimeout(() => {
                        verificationState.resendCooldown = false;
                        setVerificationResendState(false, 'Resend verification email');
                        if (verificationError) verificationError.classList.remove('success-message');
                    }, 15000);
                } else {
                    if (verificationError) verificationError.textContent = result.error || 'Unable to resend the verification email.';
                    setVerificationResendState(false, 'Resend verification email');
                }
            } catch (error) {
                if (verificationError) verificationError.textContent = error.message || 'Unable to resend the verification email.';
                setVerificationResendState(false, 'Resend verification email');
            }
        });
    }
    
    // 4. Set up auth form handlers
    const loginForm = document.getElementById('login-form-element');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    const signupForm = document.getElementById('signup-form-element');
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignUp);
    }

    const onboardingForm = document.getElementById('onboarding-form');
    if (onboardingForm) {
        onboardingForm.addEventListener('submit', submitOnboarding);
    }

    const onboardingNextButton = document.getElementById('onboarding-next-btn');
    const onboardingBackButton = document.getElementById('onboarding-back-btn');
    if (onboardingNextButton) onboardingNextButton.addEventListener('click', () => {
        persistOnboardingDraft();
        advanceOnboarding();
    });
    if (onboardingBackButton) onboardingBackButton.addEventListener('click', () => {
        retreatOnboarding();
    });

    ['onboarding-income-source', 'onboarding-income-amount', 'onboarding-income-frequency', 'onboarding-next-income-date', 'onboarding-safe-daily-spending', 'onboarding-goal-amount']
        .forEach((fieldId) => {
            const field = document.getElementById(fieldId);
            if (field) field.addEventListener('input', persistOnboardingDraft);
            if (field) field.addEventListener('change', persistOnboardingDraft);
        });

    document.querySelectorAll('input[name="onboarding-goal-choice"]').forEach((radio) => {
        radio.addEventListener('change', () => {
            const goalDetails = document.getElementById('onboarding-goal-details');
            const checkedValue = document.querySelector('input[name="onboarding-goal-choice"]:checked')?.value || 'not-now';
            if (goalDetails) goalDetails.style.display = checkedValue === 'not-now' ? 'none' : 'block';
            persistOnboardingDraft();
        });
    });

    document.querySelectorAll('.onboarding-choice input[type="checkbox"]').forEach((checkbox) => {
        checkbox.addEventListener('change', persistOnboardingDraft);
    });

    if (document.getElementById('onboarding-screen')) {
        updateOnboardingUI();
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
