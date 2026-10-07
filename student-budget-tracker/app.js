/**
 * Student Budget Tracker - Main Application File
 * This file handles:
 * - Navigation between pages
 * - LocalStorage initialization and management
 * - Common utility functions
 * - Modal dialog handling
 */

// App Configuration
window.CONFIG = {
    APP_NAME: 'StudentBudgetTracker',
    VERSION: '1.1.0',
    DEFAULT_CURRENCY: '₦',
    CATEGORIES: {
        'food': { name: 'Food & Dining', icon: 'fas fa-utensils', color: '#ff6b6b' },
        'transport': { name: 'Transportation', icon: 'fas fa-bus', color: '#1dd1a1' },
        'entertainment': { name: 'Entertainment', icon: 'fas fa-film', color: '#f368e0' },
        'education': { name: 'Education', icon: 'fas fa-book', color: '#54a0ff' },
        'shopping': { name: 'Shopping', icon: 'fas fa-shopping-bag', color: '#ff9f43' },
        'housing': { name: 'Housing & Utilities', icon: 'fas fa-home', color: '#5f27cd' },
        'health': { name: 'Health & Wellness', icon: 'fas fa-heartbeat', color: '#00d2d3' },
        'other': { name: 'Other', icon: 'fas fa-question-circle', color: '#8395a7' }
    }
};

window.getExpenseCategoryKey = function(category) {
    const rawValue = String(category ?? '').trim();
    if (!rawValue) return 'other';

    const normalized = rawValue.toLowerCase().replace(/[^a-z]+/g, '');
    if (!normalized) return 'other';

    const directKeys = Object.keys(window.CONFIG.CATEGORIES);
    if (directKeys.includes(rawValue.toLowerCase()) || directKeys.includes(normalized)) {
        return rawValue.toLowerCase() || normalized;
    }

    const categoryGroups = {
        food: ['food', 'foodanddining', 'meal', 'meals', 'breakfast', 'lunch', 'dinner', 'snack', 'coffee', 'tea', 'restaurant', 'kebab', 'pizza', 'groceries'],
        transport: ['transport', 'transportation', 'bus', 'busfare', 'taxi', 'ride', 'uber', 'commute', 'fare', 'fuel', 'train'],
        entertainment: ['entertainment', 'movie', 'movies', 'movieticket', 'cinema', 'streaming', 'concert', 'game', 'gaming', 'party'],
        education: ['education', 'school', 'schoolfees', 'textbook', 'books', 'book', 'tuition', 'lecture', 'library', 'class', 'exam'],
        shopping: ['shopping', 'cloth', 'clothes', 'market', 'purchase', 'bag', 'toiletries', 'gift'],
        housing: ['housing', 'housingutilities', 'rent', 'apartment', 'utilities', 'electricity', 'water', 'internet', 'wifi', 'bill', 'bills'],
        health: ['health', 'healthwellness', 'medical', 'clinic', 'pharmacy', 'medication', 'wellness', 'hospital', 'doctor']
    };

    for (const [key, aliases] of Object.entries(categoryGroups)) {
        if (aliases.some(alias => normalized === alias || normalized.includes(alias))) {
            return key;
        }
    }

    return 'other';
};

window.getExpenseCategoryMeta = function(category) {
    const key = window.getExpenseCategoryKey(category);
    return window.CONFIG.CATEGORIES[key] || window.CONFIG.CATEGORIES.other;
};

// App State
window.appState = {
    currentPage: 'dashboard',
    budget: null,
    expenses: [],
    savingsGoal: 0
};

// DOM Elements
let domElements = {};

/**
 * Initialize the application
 */
function initApp() {
    // Cache DOM elements
    cacheDomElements();
    
    // Set up current date display
    updateCurrentDate();
    
    // Initialize data from localStorage (will be overridden by Firestore if logged in)
    loadAppData();
    
    // Set up event listeners
    setupEventListeners();
    
    // Show initial page
    showPage('dashboard');
    
    // Update footer year
    document.getElementById('current-year').textContent = new Date().getFullYear();
    
    // Update page content to render loaded data
    updateDashboard();
    
    window.debugLog?.(`[DASHBOARD] ${CONFIG.APP_NAME} v${CONFIG.VERSION} initialized`);
}

/**
 * Cache frequently used DOM elements
 */
function cacheDomElements() {
    domElements = {
        // Navigation
        navLinks: document.querySelectorAll('.nav-link'),
        pages: document.querySelectorAll('.page'),
        
        // Modal
        modal: document.getElementById('confirmation-modal'),
        modalTitle: document.getElementById('modal-title'),
        modalMessage: document.getElementById('modal-message'),
        modalCancel: document.getElementById('modal-cancel'),
        modalConfirm: document.getElementById('modal-confirm'),
        
        // Footer buttons (may not exist if in settings)
        clearDataBtn: document.getElementById('clear-data'),
        exportDataBtn: document.getElementById('export-data'),
        importDataBtn: document.getElementById('import-data'),
        
        // Current month display
        currentMonth: document.getElementById('current-month')
    };
}

/**
 * Update the current date display
 */
function updateCurrentDate() {
    const now = new Date();
    const options = { year: 'numeric', month: 'long' };
    domElements.currentMonth.textContent = now.toLocaleDateString('en-US', options);
}

/**
 * Load app data from localStorage
 * NOTE: Financial data (budget, expenses, savingsGoal) is no longer loaded from localStorage.
 * Supabase is the source of truth for all financial data.
 * Only UI preferences are stored in localStorage.
 */
function loadAppData() {
    try {
        // Initialize appState with default values
        // Financial data is loaded from Supabase via the monthly-budget-system.js query layer
        appState = {
            currentPage: 'dashboard',
            budget: null,
            expenses: [],
            savingsGoal: 0
        };
        
        window.debugLog?.('[FINANCE] App data initialized (financial data will load from Supabase)');
    } catch (error) {
        console.error('Error initializing app data:', error);
        // Initialize with default values
        appState = {
            currentPage: 'dashboard',
            budget: null,
            expenses: [],
            savingsGoal: 0
        };
    }
}

/**
 * Save app data to localStorage
 * NOTE: Financial data (budget, expenses, savingsGoal) is no longer saved to localStorage.
 * All financial data is managed through Supabase via monthly-budget-system.js.
 * localStorage is reserved for UI preferences only.
 */
function saveAppData() {
    try {
        // Do NOT save financial data to localStorage anymore
        // Financial data is managed exclusively by Firebase Firestore monthly system
        
        // If needed in future, save non-financial UI preferences only to localStorage
        // Example: UI state, preference flags, etc. (these are not currently needed)
        
        window.debugLog?.('[FINANCE] App data sync: Financial data managed by Supabase monthly system');
    } catch (error) {
        console.error('Error in saveAppData:', error);
    }
}

/**
 * Set up all event listeners
 */
function setupEventListeners() {
    // Navigation
    domElements.navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.getAttribute('data-page');
            showPage(page);
        });
    });

    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (window.showPage) {
                showPage('settings');
            }
        });
    }

    window.addEventListener('hashchange', function() {
        const route = window.normalizePageRoute ? window.normalizePageRoute(window.location.hash) : (window.location.hash || '#dashboard').replace('#', '');
        if (route && document.getElementById(`${route}-page`)) {
            showPage(route);
        }
    });
    
    // Modal buttons
    domElements.modalCancel.addEventListener('click', hideModal);
    
    // Footer buttons (may not exist in new UI)
    if (domElements.clearDataBtn) {
        domElements.clearDataBtn.addEventListener('click', confirmClearData);
    }
    if (domElements.exportDataBtn) {
        domElements.exportDataBtn.addEventListener('click', exportData);
    }
    if (domElements.importDataBtn) {
        domElements.importDataBtn.addEventListener('click', importData);
    }
    
    // Expense form
    const expenseForm = document.getElementById('expense-form');
    if (expenseForm) {
        expenseForm.addEventListener('submit', handleExpenseSubmit);
    }
    
    // Quick expense buttons
    document.querySelectorAll('.quick-expense-btn').forEach(button => {
        button.addEventListener('click', handleQuickExpense);
    });
    
    // Clear form button
    const clearFormBtn = document.getElementById('clear-form');
    if (clearFormBtn) {
        clearFormBtn.addEventListener('click', clearExpenseForm);
    }
    
    // Clear filters button
    const clearFiltersBtn = document.getElementById('clear-filters');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', clearHistoryFilters);
    }
    
    // Savings calculator
    const dailySavingsInput = document.getElementById('daily-savings-calculator');
    if (dailySavingsInput) {
        dailySavingsInput.addEventListener('input', updateSavingsCalculator);
    }
    
    // Set today's date as default for expense date picker
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('expense-date');
    if (dateInput) {
        dateInput.value = today;
        dateInput.max = today;
    }
}

/**
 * Normalize route names and aliases to the actual page IDs used by the app.
 */
window.normalizePageRoute = function(routeName) {
    const raw = String(routeName || '').replace(/^#/, '').trim().toLowerCase();
    const aliases = {
        '': 'dashboard',
        home: 'dashboard',
        dashboard: 'dashboard',
        budget: 'budget',
        add: 'expense',
        expense: 'expense',
        goals: 'savings',
        savings: 'savings',
        history: 'history',
        settings: 'settings'
    };

    const normalized = aliases[raw] || raw;
    return document.getElementById(`${normalized}-page`) ? normalized : 'dashboard';
};

/**
 * Show a specific page and hide others
 * @param {string} pageId - The ID of the page to show
 */
async function showPage(pageId) {
    const normalizedPageId = window.normalizePageRoute ? window.normalizePageRoute(pageId) : pageId;

    // Ensure DOM elements are cached
    if (!domElements.navLinks) {
        cacheDomElements();
    }
    
    // Update navigation
    if (domElements.navLinks) {
        domElements.navLinks.forEach(link => {
            const linkPage = link.getAttribute('data-page');
            const activePage = linkPage === normalizedPageId || (normalizedPageId === 'expense' && linkPage === 'add') || (normalizedPageId === 'savings' && linkPage === 'goals');
            if (activePage) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }
    
    // Sync sidebar navigation active state
    const sidebarLinks = document.querySelectorAll('.sidebar-nav-link');
    sidebarLinks.forEach(link => {
        const linkPage = link.getAttribute('data-page');
        const activePage = linkPage === normalizedPageId || (normalizedPageId === 'expense' && linkPage === 'add') || (normalizedPageId === 'savings' && linkPage === 'goals');
        if (activePage) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
    
    // Update pages
    if (domElements.pages) {
        domElements.pages.forEach(page => {
            if (page.id === `${normalizedPageId}-page`) {
                page.classList.add('active');
            } else {
                page.classList.remove('active');
            }
        });
    }
    
    // Update app state
    appState.currentPage = normalizedPageId;
    
    // Update the URL hash for bookmarking while preserving the user-facing route aliases
    const routeAlias = {
        dashboard: 'dashboard',
        budget: 'budget',
        expense: 'add',
        savings: 'goals',
        history: 'history',
        settings: 'settings'
    }[normalizedPageId] || normalizedPageId;
    if (window.location.hash.replace('#', '').toLowerCase() !== routeAlias) {
        window.location.hash = routeAlias;
    }
    
    // Trigger page-specific updates
    await updatePageContent(normalizedPageId);
}

/**
 * Update content for the current page
 * @param {string} pageId - The ID of the page to update
 */
async function updatePageContent(pageId) {
    switch(pageId) {
        case 'dashboard':
            updateDashboard();
            break;
        case 'budget':
            updateBudgetPage();
            break;
        case 'expense':
            // Set today's date as default in expense form
            const today = new Date().toISOString().split('T')[0];
            const expenseDateInput = document.getElementById('expense-date');
            if (expenseDateInput) {
                expenseDateInput.value = today;
                expenseDateInput.max = today; // Don't allow future dates
            }
        //   case 'history':  break;
        
        //     updateHistoryPage();
        //     break;
        case 'history':
    await updateHistoryPage();
    break;
        case 'savings':
            await updateSavingsPage();
            break;
        case 'settings':
            // Profile display is updated in main.js
            break;
    }
}

/**
 * Format currency values
 * @param {number} amount - The amount to format
 * @returns {string} Formatted currency string
 */
function formatCurrency(amount) {
    const numericAmount = Number(amount);
    const safeAmount = Number.isFinite(numericAmount) ? numericAmount : 0;
    return `${CONFIG.DEFAULT_CURRENCY}${safeAmount.toLocaleString('en-NG', {
        minimumFractionDigits: Number.isInteger(safeAmount) ? 0 : 2,
        maximumFractionDigits: 2
    })}`;
}

function initPasswordVisibilityToggles() {
    document.querySelectorAll('.password-toggle').forEach(toggle => {
        const input = toggle.closest('.auth-input-wrapper')?.querySelector('input[type="password"], input[type="text"]');
        const icon = toggle.querySelector('i');
        if (!input || !icon || toggle.dataset.initialized === 'true') return;

        toggle.dataset.initialized = 'true';
        toggle.addEventListener('click', () => {
            const isVisible = input.type === 'text';
            input.type = isVisible ? 'password' : 'text';
            icon.classList.toggle('fa-eye', isVisible);
            icon.classList.toggle('fa-eye-slash', !isVisible);
            toggle.setAttribute('aria-label', isVisible ? 'Show password' : 'Hide password');
            toggle.setAttribute('title', isVisible ? 'Show password' : 'Hide password');
        });
    });
}

/**
 * Calculate total expenses
 * @returns {number} Total expenses amount
 */
function calculateTotalExpenses() {
    return appState.expenses.reduce((total, expense) => total + expense.amount, 0);
}

/**
 * Calculate remaining balance
 * @returns {number} Remaining balance
 */
function calculateRemainingBalance() {
    if (!appState.budget || !appState.budget.amount) return 0;
    const totalExpenses = calculateTotalExpenses();
    return appState.budget.amount - totalExpenses;
}

/**
 * Calculate current savings
 * @returns {number} Current savings amount
 */
function calculateCurrentSavings() {
    const remaining = calculateRemainingBalance();
    if (remaining <= 0) return 0;
    
    // Savings is the remaining balance, capped at the savings goal if one exists
    if (appState.savingsGoal > 0) {
        return Math.min(remaining, appState.savingsGoal);
    }
    
    return remaining;
}

/**
 * Show confirmation modal
 * @param {string} title - Modal title
 * @param {string} message - Modal message
 * @param {function} onConfirm - Callback for confirm action
 */
function showConfirmationModal(title, message, onConfirm) {
    domElements.modalTitle.textContent = title;
    domElements.modalMessage.textContent = message;
    
    // Store the confirm callback
    domElements.modalConfirm.onclick = function() {
        onConfirm();
        hideModal();
    };
    
    // Show the modal
    domElements.modal.classList.add('active');
}

/**
 * Hide the modal
 */
function hideModal() {
    domElements.modal.classList.remove('active');
    // Clear the confirm callback
    domElements.modalConfirm.onclick = null;
}

/**
 * Confirm and clear all app data
 */
function confirmClearData() {
    showConfirmationModal(
        'Clear All Data',
        'Are you sure you want to clear all your budget and expense data? This action cannot be undone.',
        clearAllData
    );
}

/**
 * Clear all app data
 */
async function clearAllData() {
    appState.budget = null;
    appState.expenses = [];
    appState.savingsGoal = 0;
    
    // Clear localStorage
    localStorage.removeItem(`${CONFIG.APP_NAME}_budget`);
    localStorage.removeItem(`${CONFIG.APP_NAME}_expenses`);
    localStorage.removeItem(`${CONFIG.APP_NAME}_savingsGoal`);
    localStorage.removeItem(`${CONFIG.APP_NAME}_migrated_to_firestore`);
    localStorage.removeItem(`${CONFIG.APP_NAME}_migrated_to_monthly`);

    // Clear Firestore if authenticated
    const user = window.firebaseAuth?.getCurrentUser?.();
    let remoteClearSuccess = true;
    if (user && window.firestoreSync?.clearUserDataFromFirestore) {
        const result = await window.firestoreSync.clearUserDataFromFirestore(user.uid);
        if (!result.success) {
            remoteClearSuccess = false;
            console.warn('Failed to clear remote data:', result.error);
        }
    }
    
    // Update all pages
    updateDashboard();
    updateBudgetPage();
    updateHistoryPage();
    updateSavingsPage();
    
    if (remoteClearSuccess) {
        showToast('All data cleared successfully', 'success');
    } else {
        showToast('Local data cleared, but remote data could not be cleared.', 'warning');
    }
}

/**
 * Export app data as JSON file
 */
function exportData() {
    showConfirmationModal(
        'Export Data',
        'Are you sure you want to export your budget and expense data?',
        function () {
            const data = {
                app: CONFIG.APP_NAME,
                version: CONFIG.VERSION,
                exportDate: new Date().toISOString(),
                budget: appState.budget,
                expenses: appState.expenses,
                savingsGoal: appState.savingsGoal
            };
            
            const dataStr = JSON.stringify(data, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `student-budget-data-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showToast('Data exported successfully', 'success');
        }
    );
}

function importData() {
    showConfirmationModal(
        'Import Data',
        'Importing will overwrite your current budget and expenses. Do you want to continue?',
        function () {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'application/json';
            
            input.onchange = function(e) {
                const file = e.target.files[0];
                if (!file) return;
                
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    try {
                        const importedData = JSON.parse(e.target.result);
                        
                        if (importedData.app !== CONFIG.APP_NAME) {
                            throw new Error('Invalid data file');
                        }
                        
                        appState.budget = importedData.budget || null;
                        appState.expenses = importedData.expenses || [];
                        appState.savingsGoal = importedData.savingsGoal || 0;
                        
                        saveAppData();
                        
                        updateDashboard();
                        updateBudgetPage();
                        updateHistoryPage();
                        updateSavingsPage();
                        
                        showToast('Data imported successfully', 'success');
                    } catch (error) {
                        console.error('Error importing data:', error);
                        showToast('Error importing data. Please check the file format.', 'error');
                    }
                };
                
                reader.readAsText(file);
            };
            
            input.click();
        }
    );
}
   

/**
 * Handle quick expense button clicks
 * @param {Event} e - Click event
 */
function handleQuickExpense(e) {
    const button = e.currentTarget;
    const amount = parseFloat(button.getAttribute('data-amount'));
    const category = button.getAttribute('data-category');
    const reason = button.getAttribute('data-reason');
    
    // Set form values
    const amountInput = document.getElementById('expense-amount');
    const categorySelect = document.getElementById('expense-category');
    const reasonTextarea = document.getElementById('expense-reason');
    
    if (amountInput) {
        // V2.2: set numeric value then apply comma-formatting for display
        amountInput.value = amount;
        if (window.moneyInputFormat?.applyMoneyFormat) {
            window.moneyInputFormat.applyMoneyFormat(amountInput, true);
        }
    }
    if (categorySelect) categorySelect.value = category;
    if (reasonTextarea) reasonTextarea.value = reason;
    
    // Set focus to the reason field
    if (reasonTextarea) reasonTextarea.focus();
    
    showToast(`Quick expense "${reason}" added to form`, 'info');
}

/**
 * Clear the expense form
 */
function clearExpenseForm() {
    const form = document.getElementById('expense-form');
    if (form) {
        form.reset();
        
        // Set today's date
        const today = new Date().toISOString().split('T')[0];
        const expenseDateInput = document.getElementById('expense-date');
        if (expenseDateInput) {
            expenseDateInput.value = today;
        }
        
        showToast('Form cleared', 'info');
    }
}

/**
 * Clear history filters
 */
function clearHistoryFilters() {
    const monthFilter = document.getElementById('filter-month');
    const categoryFilter = document.getElementById('filter-category');
    
    if (monthFilter) monthFilter.value = 'all';
    if (categoryFilter) categoryFilter.value = 'all';
    
    // Trigger filter update
    if (typeof updateHistoryList === 'function') {
        updateHistoryList();
    }
    
    showToast('Filters cleared', 'info');
}

/**
 * Update savings calculator
 */
function updateSavingsCalculator() {
    const dailyInput = document.getElementById('daily-savings-calculator');
    if (!dailyInput) return;
    
    // V2.2: strip commas from formatted display value before numeric calculation
    const _parseMoney = window.moneyInputFormat?.parseMoneyValue ?? parseFloat;
    const daily = _parseMoney(dailyInput.value) || 0;
    const weekly = daily * 7;
    const monthly = daily * 30; // Approximate
    const yearly = daily * 365;
    
    const weeklyElement = document.getElementById('weekly-savings');
    const monthlyElement = document.getElementById('monthly-savings');
    const yearlyElement = document.getElementById('yearly-savings');
    
    if (weeklyElement) weeklyElement.textContent = formatCurrency(weekly);
    if (monthlyElement) monthlyElement.textContent = formatCurrency(monthly);
    if (yearlyElement) yearlyElement.textContent = formatCurrency(yearly);
}

/**
 * Show a toast notification
 * @param {string} message - The message to display
 * @param {string} type - The type of toast (success, error, info, warning)
 */
function showToast(message, type = 'info') {
    // Remove existing toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Set icon based on type
    let icon = 'info-circle';
    switch(type) {
        case 'success': icon = 'check-circle'; break;
        case 'error': icon = 'exclamation-circle'; break;
        case 'warning': icon = 'exclamation-triangle'; break;
    }
    
    toast.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${message}</span>
    `;
    
    // Add to page
    document.body.appendChild(toast);
    
    // Show with animation
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Remove after delay
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 300);
    }, 3000);
}

// Add CSS for toast notifications
const toastStyles = document.createElement('style');
toastStyles.textContent = `
    .toast {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 1001;
        transform: translateY(100px);
        opacity: 0;
        transition: transform 0.3s ease, opacity 0.3s ease;
        max-width: 300px;
    }
    
    .toast.show {
        transform: translateY(0);
        opacity: 1;
    }
    
    .toast i {
        font-size: 1.2rem;
    }
    
    .toast-success {
        border-left: 4px solid #4cc9f0;
    }
    
    .toast-success i {
        color: #4cc9f0;
    }
    
    .toast-error {
        border-left: 4px solid #f72585;
    }
    
    .toast-error i {
        color: #f72585;
    }
    
    .toast-info {
        border-left: 4px solid #4361ee;
    }
    
    .toast-info i {
        color: #4361ee;
    }
    
    .toast-warning {
        border-left: 4px solid #f8961e;
    }
    
    .toast-warning i {
        color: #f8961e;
    }
    
    @media (max-width: 768px) {
        .toast {
            left: 20px;
            right: 20px;
            max-width: none;
        }
    }
`;
document.head.appendChild(toastStyles);

initPasswordVisibilityToggles();

// Initialize the app when the DOM is fully loaded
// BUT ONLY IF we're showing the app (i.e., user is authenticated)
// For now, don't auto-initialize - let main.js handle it
// document.addEventListener('DOMContentLoaded', initApp);

// Export functions for other modules to use
window.appUtils = {
    formatCurrency,
    calculateTotalExpenses,
    calculateRemainingBalance,
    calculateCurrentSavings,
    showToast,
    CONFIG,
    appState,
    saveAppData
    
};

// Make initApp globally available
window.initApp = initApp;
window.initNotificationSystem = initNotificationSystem;
window.showPage = showPage;
window.initPasswordVisibilityToggles = initPasswordVisibilityToggles;
/**
 * Notification System Module
 * Handles all in-app notifications
 * Designed to be extensible for push notifications later
 */

const NOTIFICATION_TYPES = {
    INFO: 'info',
    WARNING: 'warning',
    ERROR: 'error',
    SUCCESS: 'success'
};

const NOTIFICATION_TRIGGERS = {
    NO_BUDGET_SET: 'NO_BUDGET_SET',
    BUDGET_70_PERCENT: 'BUDGET_70_PERCENT',
    BUDGET_90_PERCENT: 'BUDGET_90_PERCENT',
    BUDGET_EXCEEDED: 'BUDGET_EXCEEDED',
    NEW_MONTH_NO_BUDGET: 'NEW_MONTH_NO_BUDGET'
};

class NotificationSystem {
    constructor() {
        this.notifications = [];
        this.lastCheckedDate = null;
        this.triggeredNotifications = new Set();
        this.init();
    }

    async init() {
        this.lastCheckedDate = new Date();
        await this.refreshFromSupabase();
        this.updateNotificationIndicator();
        setInterval(() => this.checkNotifications(), 30000);
        setTimeout(() => this.checkNotifications(), 1500);
        window.debugLog?.('[NOTIFICATIONS] Student notification system initialized');
    }

    async getCurrentUserId() {
        const user = window.firebaseAuth?.getCurrentUser?.() || window.currentUser || null;
        if (user?.uid) return user.uid;

        if (window.supabase?.auth?.getUser) {
            try {
                const { data: { user: supaUser } } = await window.supabase.auth.getUser();
                if (supaUser?.id) return supaUser.id;
            } catch (error) {
                window.debugWarn?.('[NOTIFICATIONS] Unable to resolve authenticated user ID:', error.message);
            }
        }

        return null;
    }

    async isNotificationsEnabled() {
        try {
            if (window.supabase?.auth?.getUser) {
                const { data, error } = await window.supabase.auth.getUser();
                if (!error && data?.user?.user_metadata && typeof data.user.user_metadata.notifications_enabled !== 'undefined') {
                    return Boolean(data.user.user_metadata.notifications_enabled);
                }
            }
        } catch (error) {
            window.debugWarn?.('[NOTIFICATIONS] Could not read notification preference:', error.message);
        }

        const storedValue = localStorage.getItem(`${CONFIG.APP_NAME}_notifications_enabled`);
        if (storedValue !== null) {
            return storedValue === 'true';
        }

        return true;
    }

    async setNotificationsEnabled(enabled) {
        const userId = await this.getCurrentUserId();
        localStorage.setItem(`${CONFIG.APP_NAME}_notifications_enabled`, String(Boolean(enabled)));

        if (!userId || !window.supabase) {
            return { success: true };
        }

        try {
            const { error } = await window.supabase.auth.updateUser({
                data: { notifications_enabled: Boolean(enabled) }
            });

            if (error) {
                window.debugWarn?.('[NOTIFICATIONS] auth preference update warning:', error.message);
            }
        } catch (error) {
            window.debugWarn?.('[NOTIFICATIONS] preference save failed:', error.message);
        }

        return { success: true };
    }

    isNotificationDismissed(item) {
        const metadata = item?.metadata || {};
        const dismissedAt = item?.dismissed_at || metadata.dismissed_at || metadata.dismissedAt || null;
        return Boolean(dismissedAt || metadata.dismissed === true || item?.dismissed === true);
    }

    async refreshFromSupabase() {
        const userId = await this.getCurrentUserId();
        if (!userId || !window.supabase) {
            this.notifications = [];
            return;
        }

        try {
            const { data, error } = await window.supabase
                .from('notifications')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) {
                window.debugWarn?.('[NOTIFICATIONS] Load failed:', error.message);
                this.notifications = [];
                return;
            }

            this.notifications = (data || [])
                .filter(item => !this.isNotificationDismissed(item))
                .map(item => ({
                    id: item.id,
                    title: item.title,
                    message: item.message,
                    type: item.type || 'info',
                    trigger: item.metadata?.trigger || null,
                    metadata: item.metadata || {},
                    read: Boolean(item.is_read),
                    dismissed: this.isNotificationDismissed(item),
                    timestamp: item.created_at,
                    created_at: item.created_at
                }));
        } catch (error) {
            window.debugWarn?.('[NOTIFICATIONS] refresh failed:', error.message);
            this.notifications = [];
        }

        this.updateNotificationIndicator();
        this.loadNotificationsIntoPanel();
    }

    async notificationExistsByEventKey(eventKey) {
        if (!eventKey) return false;

        const userId = await this.getCurrentUserId();
        if (!userId || !window.supabase) return false;

        try {
            const { data, error } = await window.supabase
                .from('notifications')
                .select('id')
                .eq('user_id', userId)
                .filter('metadata->>event_key', 'eq', eventKey)
                .limit(1);

            return !error && Array.isArray(data) && data.length > 0;
        } catch (error) {
            window.debugWarn?.('[NOTIFICATIONS] duplicate check failed:', error.message);
            return false;
        }
    }

    buildEventKey(prefix, suffix) {
        const month = window.monthlyBudget?.getCurrentMonth?.() || new Date().toISOString().slice(0, 7);
        return `${prefix}_${suffix}_${month}`.replace(/\s+/g, '_').toLowerCase();
    }

    async createNotification({ title, message, type = NOTIFICATION_TYPES.INFO, trigger = null, metadata = {} }) {
        const userId = await this.getCurrentUserId();
        if (!userId || !window.supabase) return null;

        const enabled = await this.isNotificationsEnabled();
        if (!enabled) return null;

        const eventKey = metadata.event_key || trigger || null;
        if (eventKey && await this.notificationExistsByEventKey(eventKey)) {
            return null;
        }

        try {
            const payload = {
                user_id: userId,
                type,
                title,
                message,
                is_read: false,
                created_at: new Date().toISOString(),
                metadata: {
                    ...metadata,
                    trigger: trigger || metadata.trigger || null,
                    event_key: eventKey
                }
            };

            const { data, error } = await window.supabase
                .from('notifications')
                .insert(payload)
                .select()
                .single();

            if (error) {
                window.debugWarn?.('[NOTIFICATIONS] insert failed:', error.message);
                return null;
            }

            this.notifications = [
                {
                    id: data.id,
                    title: data.title,
                    message: data.message,
                    type: data.type || 'info',
                    trigger: data.metadata?.trigger || null,
                    metadata: data.metadata || {},
                    read: Boolean(data.is_read),
                    timestamp: data.created_at,
                    created_at: data.created_at
                },
                ...this.notifications
            ];

            this.updateNotificationIndicator();
            this.loadNotificationsIntoPanel();

            this.showToastNotification({
                id: data.id,
                title,
                message,
                type
            });

            if (window.Notification && Notification.permission === 'granted') {
                new Notification(title, { body: message, tag: data.id });
            }

            return data;
        } catch (error) {
            console.warn('[Notifications] create failed:', error.message);
            return null;
        }
    }

    async markNotificationRead(notificationId) {
        const userId = await this.getCurrentUserId();
        if (!userId || !window.supabase) return false;

        try {
            const { error } = await window.supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', notificationId)
                .eq('user_id', userId);

            if (error) {
                console.warn('[Notifications] mark read failed:', error.message);
                return false;
            }

            const notification = this.notifications.find(item => item.id === notificationId);
            if (notification) {
                notification.read = true;
            }

            this.updateNotificationIndicator();
            this.loadNotificationsIntoPanel();
            return true;
        } catch (error) {
            console.warn('[Notifications] mark read exception:', error.message);
            return false;
        }
    }

    async dismissNotification(notificationId) {
        const userId = await this.getCurrentUserId();
        if (!userId || !window.supabase) return false;

        try {
            const target = this.notifications.find(item => item.id === notificationId);
            const existingMetadata = target?.metadata || {};
            const now = new Date().toISOString();
            const nextMetadata = {
                ...existingMetadata,
                dismissed: true,
                dismissed_at: now,
                dismissedAt: now
            };

            const updatePayload = {
                is_read: true,
                metadata: nextMetadata
            };

            try {
                const { error } = await window.supabase
                    .from('notifications')
                    .update(updatePayload)
                    .eq('id', notificationId)
                    .eq('user_id', userId);

                if (!error) {
                    this.notifications = this.notifications.filter(item => item.id !== notificationId);
                    this.updateNotificationIndicator();
                    this.loadNotificationsIntoPanel();
                    return true;
                }

                if (!String(error.message || '').toLowerCase().includes('column') && !String(error.message || '').toLowerCase().includes('does not exist')) {
                    throw error;
                }
            } catch (columnError) {
                // Fallback for schemas without a dedicated dismissed_at column.
                const fallbackPayload = {
                    is_read: true,
                    metadata: nextMetadata
                };
                const { error: metaError } = await window.supabase
                    .from('notifications')
                    .update(fallbackPayload)
                    .eq('id', notificationId)
                    .eq('user_id', userId);

                if (metaError) {
                    throw metaError;
                }
            }

            this.notifications = this.notifications.filter(item => item.id !== notificationId);
            this.updateNotificationIndicator();
            this.loadNotificationsIntoPanel();
            return true;
        } catch (error) {
            console.warn('[Notifications] dismiss exception:', error.message);
            return false;
        }
    }

    async markAllNotificationsRead() {
        const userId = await this.getCurrentUserId();
        if (!userId || !window.supabase) return false;

        try {
            const notificationIds = this.notifications
                .filter(item => !item.read)
                .map(item => item.id);

            if (!notificationIds.length) {
                this.updateNotificationIndicator();
                this.loadNotificationsIntoPanel();
                return true;
            }

            const { error } = await window.supabase
                .from('notifications')
                .update({ is_read: true })
                .in('id', notificationIds)
                .eq('user_id', userId);

            if (error) {
                console.warn('[Notifications] mark all read failed:', error.message);
                return false;
            }

            this.notifications = this.notifications.map(item => ({
                ...item,
                read: notificationIds.includes(item.id) ? true : item.read
            }));
            this.updateNotificationIndicator();
            this.loadNotificationsIntoPanel();
            return true;
        } catch (error) {
            console.warn('[Notifications] mark all read exception:', error.message);
            return false;
        }
    }

    showNotification(title, message, type = NOTIFICATION_TYPES.INFO, trigger = null, metadata = {}) {
        return this.createNotification({ title, message, type, trigger, metadata: { ...metadata, trigger } });
    }

    showToastNotification(notification) {
        if (typeof showToast === 'function') {
            showToast(`${notification.title}: ${notification.message}`, notification.type);
            return;
        }

        const toast = document.createElement('div');
        toast.className = `notification-toast notification-${notification.type}`;
        toast.dataset.notificationId = notification.id;
        const iconMap = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        toast.innerHTML = `
            <div class="notification-icon"><i class="fas fa-${iconMap[notification.type] || 'info-circle'}"></i></div>
            <div class="notification-content">
                <div class="notification-title">${notification.title}</div>
                <div class="notification-message">${notification.message}</div>
                <div class="notification-time">Just now</div>
            </div>
            <button class="notification-close" onclick="window.notificationSystem.dismissNotification('${notification.id}')">
                <i class="fas fa-times"></i>
            </button>
        `;

        const container = document.getElementById('notification-container') || document.body;
        container.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        if (notification.type !== NOTIFICATION_TYPES.WARNING && notification.type !== NOTIFICATION_TYPES.ERROR) {
            setTimeout(() => {
                if (toast.parentNode) toast.remove();
            }, 5000);
        }
    }

    async checkNotifications() {
        const enabled = await this.isNotificationsEnabled();
        if (!enabled) return;

        const userId = await this.getCurrentUserId();
        if (!userId) return;

        const month = window.monthlyBudget?.getCurrentMonth?.();
        if (!month) return;

        let monthData = null;
        if (window.monthlyBudget?.getMonthData) {
            try {
                monthData = await window.monthlyBudget.getMonthData(userId, month);
            } catch (error) {
                console.warn('[Notifications] month data read failed:', error.message);
                return;
            }
        }

        const budget = Number(monthData?.budget || appState?.budget?.amount || 0);
        const expenses = monthData?.expenses || appState?.expenses || [];
        const spent = (expenses || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

        const budgetByCategory = monthData?.budgetByCategory || {};
        Object.entries(budgetByCategory).forEach(([category, categoryBudget]) => {
            const categoryTotal = Number(categoryBudget || 0);
            if (!categoryTotal || categoryTotal <= 0) return;

            const categorySpent = (monthData?.spentByCategory?.[category] || 0) + ((expenses || []).filter(exp => String(exp.category || '').toLowerCase() === String(category).toLowerCase()).reduce((sum, item) => sum + (Number(item.amount) || 0), 0));
            const usage = (categorySpent / categoryTotal) * 100;

            if (usage >= 80 && usage < 90) {
                const key = this.buildEventKey(`budget_${category}`, '80');
                this.createNotification({
                    title: 'Budget update',
                    message: `You've used 80% of your ${category} budget.`,
                    type: NOTIFICATION_TYPES.WARNING,
                    trigger: 'BUDGET_80_PERCENT',
                    metadata: { event_key: key, category, threshold: 80 }
                });
            }

            if (usage >= 90 && usage < 100) {
                const key = this.buildEventKey(`budget_${category}`, '90');
                this.createNotification({
                    title: 'Budget warning',
                    message: `You've used 90% of your ${category} budget.`,
                    type: NOTIFICATION_TYPES.WARNING,
                    trigger: 'BUDGET_90_PERCENT',
                    metadata: { event_key: key, category, threshold: 90 }
                });
            }

            if (usage >= 100) {
                const key = this.buildEventKey(`budget_${category}`, 'exceeded');
                this.createNotification({
                    title: 'Budget exceeded',
                    message: `You've exceeded your ${category} budget.`,
                    type: NOTIFICATION_TYPES.ERROR,
                    trigger: 'BUDGET_EXCEEDED',
                    metadata: { event_key: key, category, threshold: 100 }
                });
            }
        });

        if (budget > 0) {
            const usage = (spent / budget) * 100;
            if (usage >= 80 && usage < 90) {
                const key = this.buildEventKey('monthly_budget', '80');
                this.createNotification({
                    title: 'Monthly budget update',
                    message: `You've used 80% of your monthly budget.`,
                    type: NOTIFICATION_TYPES.WARNING,
                    trigger: 'MONTHLY_BUDGET_80',
                    metadata: { event_key: key, threshold: 80 }
                });
            }
            if (usage >= 90 && usage < 100) {
                const key = this.buildEventKey('monthly_budget', '90');
                this.createNotification({
                    title: 'Monthly budget warning',
                    message: `You've used 90% of your monthly budget.`,
                    type: NOTIFICATION_TYPES.WARNING,
                    trigger: 'MONTHLY_BUDGET_90',
                    metadata: { event_key: key, threshold: 90 }
                });
            }
            if (usage >= 100) {
                const key = this.buildEventKey('monthly_budget', 'exceeded');
                this.createNotification({
                    title: 'Monthly budget exceeded',
                    message: `You've exceeded your monthly budget.`,
                    type: NOTIFICATION_TYPES.ERROR,
                    trigger: 'MONTHLY_BUDGET_EXCEEDED',
                    metadata: { event_key: key, threshold: 100 }
                });
            }
        }

        const remaining = budget - spent;
        if (remaining > 0 && remaining <= 500) {
            const key = this.buildEventKey('low_balance', 'warning');
            this.createNotification({
                title: 'Low balance',
                message: 'Your available balance is getting low. Consider reducing spending.',
                type: NOTIFICATION_TYPES.WARNING,
                trigger: 'LOW_BALANCE',
                metadata: { event_key: key, remaining }
            });
        }

        if (monthData?.nextIncomeDate || window.currentUser?.profile?.next_income_date) {
            const nextIncomeDate = monthData?.nextIncomeDate || window.currentUser?.profile?.next_income_date;
            const days = Math.max(0, Math.ceil((new Date(nextIncomeDate) - new Date()) / (1000 * 60 * 60 * 24)));
            if (days >= 0 && days <= 3) {
                const key = this.buildEventKey('income_reminder', 'next_income');
                this.createNotification({
                    title: 'Income reminder',
                    message: days === 0 ? 'Your next allowance is due today.' : `Your next allowance is coming in ${days} day${days === 1 ? '' : 's'}.`,
                    type: NOTIFICATION_TYPES.INFO,
                    trigger: 'INCOME_REMINDER',
                    metadata: { event_key: key, days, date: nextIncomeDate }
                });
            }
        }
    }

    async syncSavingsNotifications() {
        const userId = await this.getCurrentUserId();
        if (!userId || !window.monthlyBudget?.getMonthData) return;

        const month = window.monthlyBudget.getCurrentMonth();
        const monthData = await window.monthlyBudget.getMonthData(userId, month);
        const goalAmount = Number(monthData?.savingsGoal || 0);
        const savedAmount = Number(monthData?.savedAmount || monthData?.savings || 0);
        const goalName = window.currentUser?.profile?.goal_name || 'your goal';

        if (goalAmount > 0 && savedAmount >= 0) {
            const milestone25 = goalAmount * 0.25;
            const milestone50 = goalAmount * 0.5;
            const milestone75 = goalAmount * 0.75;
            const milestone100 = goalAmount;

            if (savedAmount >= milestone25 && savedAmount < milestone50) {
                this.createNotification({
                    title: 'Savings milestone',
                    message: `You've reached 25% of your ${goalName} savings goal!`,
                    type: NOTIFICATION_TYPES.SUCCESS,
                    trigger: 'SAVINGS_25',
                    metadata: { event_key: this.buildEventKey(`savings_${goalName || 'goal'}`, '25'), goal_name: goalName }
                });
            }

            if (savedAmount >= milestone50 && savedAmount < milestone75) {
                this.createNotification({
                    title: 'Savings milestone',
                    message: `You've reached 50% of your ${goalName} savings goal!`,
                    type: NOTIFICATION_TYPES.SUCCESS,
                    trigger: 'SAVINGS_50',
                    metadata: { event_key: this.buildEventKey(`savings_${goalName || 'goal'}`, '50'), goal_name: goalName }
                });
            }

            if (savedAmount >= milestone75 && savedAmount < milestone100) {
                this.createNotification({
                    title: 'Savings milestone',
                    message: `You've reached 75% of your ${goalName} savings goal!`,
                    type: NOTIFICATION_TYPES.SUCCESS,
                    trigger: 'SAVINGS_75',
                    metadata: { event_key: this.buildEventKey(`savings_${goalName || 'goal'}`, '75'), goal_name: goalName }
                });
            }

            if (savedAmount >= milestone100) {
                this.createNotification({
                    title: 'Savings goal completed',
                    message: `You reached your ${goalName} savings goal! 🎉`,
                    type: NOTIFICATION_TYPES.SUCCESS,
                    trigger: 'SAVINGS_GOAL_COMPLETED',
                    metadata: { event_key: this.buildEventKey(`savings_${goalName || 'goal'}`, '100'), goal_name: goalName }
                });
            }
        }
    }

    async recordSavingsContribution({ amount, goalName = 'your goal', goalId = null }) {
        const userId = await this.getCurrentUserId();
        if (!userId || !amount || amount <= 0) return null;

        const month = window.monthlyBudget?.getCurrentMonth?.() || new Date().toISOString().slice(0, 7);
        const eventKey = this.buildEventKey(`savings_contribution_${goalId || goalName}`, `amount_${amount}`);

        const monthData = await window.monthlyBudget?.getMonthData?.(userId, month);
        const savedAmount = Number(monthData?.savedAmount || monthData?.savings || 0);
        const goalAmount = Number(monthData?.savingsGoal || 0);
        const message = goalAmount > 0
            ? `You're now at ${formatCurrency(savedAmount)} of your ${formatCurrency(goalAmount)} ${goalName} goal.`
            : `You added ${formatCurrency(amount)} to savings.`;

        return this.createNotification({
            title: 'Savings update',
            message,
            type: NOTIFICATION_TYPES.SUCCESS,
            trigger: 'SAVINGS_CONTRIBUTION',
            metadata: { event_key: eventKey, goal_name: goalName, goal_id: goalId || null, amount }
        });
    }

    async updateNotificationIndicator() {
        const unreadCount = this.notifications.filter(item => !item.read).length;
        let bellIcon = document.getElementById('notification-bell');

        if (!bellIcon) {
            bellIcon = document.createElement('button');
            bellIcon.id = 'notification-bell';
            bellIcon.type = 'button';
            bellIcon.className = 'notification-bell';
            bellIcon.setAttribute('aria-label', 'Open notifications');
            bellIcon.setAttribute('title', 'Open notifications');

            const headerActions = document.querySelector('.header-actions');
            const header = document.querySelector('.app-header');
            if (headerActions) {
                headerActions.appendChild(bellIcon);
            } else if (header) {
                header.appendChild(bellIcon);
            }
            bellIcon.addEventListener('click', () => this.showNotificationPanel());
        }

        bellIcon.innerHTML = `
            <span class="bell-icon"><i class="fas fa-bell"></i></span>
            <span class="bell-label">Alerts</span>
            ${unreadCount > 0 ? `<span class="notification-badge">${unreadCount}</span>` : ''}
        `;

        if (unreadCount > 0) {
            bellIcon.classList.add('has-notifications');
        } else {
            bellIcon.classList.remove('has-notifications');
        }

        const bellStyle = getComputedStyle(bellIcon);
        const bellRect = bellIcon.getBoundingClientRect();
        window.debugLog?.('[NOTIFICATIONS] Bell rendered:', {
            count: document.querySelectorAll('#notification-bell').length,
            display: bellStyle.display,
            visibility: bellStyle.visibility,
            opacity: bellStyle.opacity,
            width: bellRect.width,
            height: bellRect.height,
            left: bellRect.left,
            top: bellRect.top,
            pointerEvents: bellStyle.pointerEvents,
            viewportWidth: window.innerWidth
        });
    }

    showNotificationPanel() {
        let panel = document.getElementById('notification-panel');

        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'notification-panel';
            panel.className = 'notification-panel';
            panel.innerHTML = `
                <div class="notification-panel-header">
                    <h3><i class="fas fa-bell"></i> Notifications</h3>
                    <button class="notification-panel-close"><i class="fas fa-times"></i></button>
                </div>
                <div class="notification-panel-content" id="notification-panel-content"></div>
                <div class="notification-panel-footer">
                    <button id="clear-all-notifications" class="btn btn-secondary"><i class="fas fa-check-double"></i> Mark all as read</button>
                </div>
            `;
            document.body.appendChild(panel);

            panel.querySelector('.notification-panel-close').addEventListener('click', () => panel.classList.remove('show'));
            document.getElementById('clear-all-notifications').addEventListener('click', () => this.markAllNotificationsRead());

            document.addEventListener('click', (e) => {
                if (!panel.contains(e.target) && !e.target.closest('#notification-bell')) {
                    panel.classList.remove('show');
                }
            });
        }

        this.loadNotificationsIntoPanel();
        panel.classList.add('show');
    }

    loadNotificationsIntoPanel() {
        const content = document.getElementById('notification-panel-content');
        if (!content) return;

        if (!this.notifications.length) {
            content.innerHTML = `
                <div class="empty-notifications">
                    <i class="fas fa-bell-slash"></i>
                    <p>No notifications yet</p>
                    <small>You'll see your student budget alerts here.</small>
                </div>
            `;
            return;
        }

        const sorted = [...this.notifications].sort((a, b) => new Date(b.timestamp || b.created_at) - new Date(a.timestamp || a.created_at));
        content.innerHTML = `
            <div class="notification-list">
                ${sorted.map((item) => {
                    const time = this.getTimeAgo(item.timestamp || item.created_at);
                    const icon = item.type === 'error' ? 'exclamation-circle' : item.type === 'warning' ? 'exclamation-triangle' : item.type === 'success' ? 'check-circle' : 'info-circle';
                    return `
                        <div class="notification-item ${item.read ? 'read' : 'unread'}" data-id="${item.id}">
                            <div class="notification-item-icon"><i class="fas fa-${icon} notification-${item.type || 'info'}"></i></div>
                            <div class="notification-item-content">
                                <div class="notification-item-title">${item.title}</div>
                                <div class="notification-item-message">${item.message}</div>
                                <div class="notification-item-time">${time}</div>
                            </div>
                            <button class="notification-item-dismiss" onclick="window.notificationSystem.dismissNotification('${item.id}')">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    getTimeAgo(timestamp) {
        const diffMs = new Date() - new Date(timestamp || new Date());
        const diffMins = Math.floor(diffMs / (1000 * 60));
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
        return new Date(timestamp).toLocaleDateString();
    }
}

// Initialize notification system
let notificationSystem;

/**
 * Initialize notification system after app is ready
 */
function initNotificationSystem() {
    notificationSystem = new NotificationSystem();
    window.notificationSystem = notificationSystem; // Make globally accessible
    
    // Add notification styles
    addNotificationStyles();
    
    // Hook into budget updates to clear notifications
    const originalSaveAppData = saveAppData;
    window.saveAppData = function() {
        originalSaveAppData();
        if (notificationSystem && appState.budget && appState.budget.amount) {
            // Clear budget-related notifications when budget is updated
            notificationSystem.clearTriggeredNotifications();
        }
    };
    
    // Hook into expense additions to trigger budget checks
    const originalHandleExpenseSubmit = window.handleExpenseSubmit;
    if (originalHandleExpenseSubmit) {
        window.handleExpenseSubmit = function(e) {
            originalHandleExpenseSubmit(e);
            // Check notifications after adding expense
            if (notificationSystem) {
                setTimeout(() => notificationSystem.checkNotifications(), 500);
            }
        };
    }
}

/**
 * Add notification CSS styles
 */
function addNotificationStyles() {
    const styleEl = document.createElement('style');
    styleEl.textContent = `
        /* Notification Toast Styles */
        .notification-toast {
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            padding: 12px 16px;
            min-width: 300px;
            max-width: 400px;
            z-index: 10000;
            transform: translateX(120%);
            transition: transform 0.3s ease;
            border-left: 4px solid;
            margin-bottom: 10px;
        }
        
        .notification-toast.show {
            transform: translateX(0);
        }
        
        .notification-toast:last-child {
            margin-bottom: 0;
        }
        
        .notification-icon {
            font-size: 1.5rem;
            margin-right: 12px;
            flex-shrink: 0;
        }
        
        .notification-content {
            flex: 1;
            min-width: 0;
        }
        
        .notification-title {
            font-weight: 600;
            font-size: 0.95rem;
            margin-bottom: 4px;
            color: #2b2d42;
        }
        
        .notification-message {
            font-size: 0.85rem;
            color: #6c757d;
            line-height: 1.4;
            margin-bottom: 4px;
        }
        
        .notification-time {
            font-size: 0.75rem;
            color: #adb5bd;
        }
        
        .notification-close {
            background: none;
            border: none;
            color: #adb5bd;
            cursor: pointer;
            font-size: 0.9rem;
            margin-left: 8px;
            padding: 4px;
            border-radius: 4px;
            transition: background-color 0.2s;
        }
        
        .notification-close:hover {
            background-color: #f8f9fa;
            color: #6c757d;
        }
        
        /* Notification Type Colors */
        .notification-info {
            border-left-color: #4361ee;
        }
        
        .notification-info .notification-icon {
            color: #4361ee;
        }
        
        .notification-warning {
            border-left-color: #f8961e;
        }
        
        .notification-warning .notification-icon {
            color: #f8961e;
        }
        
        .notification-error {
            border-left-color: #f72585;
        }
        
        .notification-error .notification-icon {
            color: #f72585;
        }
        
        .notification-success {
            border-left-color: #4cc9f0;
        }
        
        .notification-success .notification-icon {
            color: #4cc9f0;
        }
        
        /* Notification Bell */
        .notification-bell {
            position: relative;
            top: auto;
            right: auto;
            transform: none;
            background: rgba(255, 255, 255, 0.16);
            border: 1px solid rgba(255, 255, 255, 0.42);
            box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
            min-width: 46px;
            height: 42px;
            padding: 0 14px;
            border-radius: 12px;
            display: inline-flex !important;
            align-items: center;
            justify-content: center;
            gap: 8px;
            cursor: pointer;
            transition: all 0.2s ease;
            color: white;
            font-size: 1.12rem;
            backdrop-filter: blur(6px);
            -webkit-backdrop-filter: blur(6px);
            opacity: 1 !important;
            visibility: visible !important;
            pointer-events: auto;
            z-index: 30;
            flex-shrink: 0;
            margin-left: auto;
        }
        
        .notification-bell:hover,
        .notification-bell:focus-visible,
        .notification-bell:active {
            background: rgba(255, 255, 255, 0.24);
            transform: translateY(-1px) scale(1.02);
            outline: none;
        }
        
        .notification-bell.has-notifications {
            background: rgba(255, 255, 255, 0.22);
            border-color: rgba(247, 37, 133, 0.45);
            box-shadow: 0 0 0 4px rgba(247, 37, 133, 0.12);
        }

        .notification-bell .bell-icon,
        .notification-bell .bell-icon i,
        .notification-bell .bell-label {
            display: inline-flex !important;
            align-items: center;
            justify-content: center;
            color: #ffffff !important;
            opacity: 1 !important;
            visibility: visible !important;
            filter: none !important;
            text-shadow: none !important;
        }

        .notification-bell .bell-icon {
            font-size: 1.15rem;
            line-height: 1;
            position: relative;
            z-index: 1;
        }

        .notification-bell .bell-icon i {
            font-size: 1.15rem;
            line-height: 1;
        }

        .notification-bell:hover .bell-icon,
        .notification-bell:hover .bell-icon i,
        .notification-bell:hover .bell-label,
        .notification-bell:focus-visible .bell-icon,
        .notification-bell:focus-visible .bell-icon i,
        .notification-bell:focus-visible .bell-label,
        .notification-bell:active .bell-icon,
        .notification-bell:active .bell-icon i,
        .notification-bell:active .bell-label {
            color: #ffffff !important;
            opacity: 1 !important;
            visibility: visible !important;
            filter: none !important;
            text-shadow: none !important;
        }

        .notification-bell .bell-label {
            font-size: 0.7rem;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            white-space: nowrap;
        }
        
        .notification-badge {
            position: absolute;
            top: -6px;
            right: -6px;
            background: linear-gradient(135deg, #f72585, #ff5ca8);
            color: white;
            font-size: 0.68rem;
            font-weight: 700;
            min-width: 18px;
            height: 18px;
            padding: 0 5px;
            border-radius: 999px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid rgba(15, 23, 42, 0.2);
            box-shadow: 0 4px 10px rgba(247, 37, 133, 0.25);
        }
        
        /* Notification Panel */
        .notification-panel {
            position: fixed;
            top: 0;
            right: -400px;
            width: 380px;
            height: 100vh;
            background: white;
            box-shadow: -4px 0 12px rgba(0,0,0,0.1);
            z-index: 10001;
            transition: right 0.3s ease;
            display: flex;
            flex-direction: column;
        }
        
        .notification-panel.show {
            right: 0;
        }
        
        .notification-panel-header {
            padding: 20px;
            border-bottom: 1px solid #e9ecef;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #f8f9fa;
        }
        
        .notification-panel-header h3 {
            margin: 0;
            font-size: 1.2rem;
            color: #2b2d42;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .notification-panel-close {
            background: none;
            border: none;
            color: #6c757d;
            cursor: pointer;
            font-size: 1.2rem;
            padding: 4px;
            border-radius: 4px;
            transition: background-color 0.2s;
        }
        
        .notification-panel-close:hover {
            background-color: #e9ecef;
        }
        
        .notification-panel-content {
            flex: 1;
            overflow-y: auto;
            padding: 0;
        }
        
        .notification-panel-footer {
            padding: 15px 20px;
            border-top: 1px solid #e9ecef;
            background: #f8f9fa;
        }
        
        /* Notification List */
        .notification-list {
            padding: 0;
        }
        
        .notification-item {
            display: flex;
            padding: 15px 20px;
            border-bottom: 1px solid #f8f9fa;
            transition: background-color 0.2s;
            align-items: flex-start;
        }
        
        .notification-item:hover {
            background-color: #f8f9fa;
        }
        
        .notification-item.unread {
            background-color: #f0f7ff;
        }
        
        .notification-item.unread:hover {
            background-color: #e6f0ff;
        }
        
        .notification-item-icon {
            margin-right: 12px;
            flex-shrink: 0;
            font-size: 1.2rem;
            margin-top: 2px;
        }
        
        .notification-item-content {
            flex: 1;
            min-width: 0;
        }
        
        .notification-item-title {
            font-weight: 600;
            font-size: 0.9rem;
            margin-bottom: 4px;
            color: #2b2d42;
        }
        
        .notification-item.unread .notification-item-title {
            font-weight: 700;
        }
        
        .notification-item-message {
            font-size: 0.85rem;
            color: #6c757d;
            line-height: 1.4;
            margin-bottom: 6px;
        }
        
        .notification-item-time {
            font-size: 0.75rem;
            color: #adb5bd;
        }
        
        .notification-item-dismiss {
            background: none;
            border: none;
            color: #adb5bd;
            cursor: pointer;
            font-size: 0.8rem;
            padding: 4px;
            border-radius: 4px;
            opacity: 0;
            transition: all 0.2s;
            margin-left: 8px;
        }
        
        .notification-item:hover .notification-item-dismiss {
            opacity: 1;
        }
        
        .notification-item-dismiss:hover {
            background-color: #e9ecef;
            color: #6c757d;
        }
        
        /* Empty Notifications */
        .empty-notifications {
            text-align: center;
            padding: 60px 20px;
            color: #adb5bd;
        }
        
        .empty-notifications i {
            font-size: 3rem;
            margin-bottom: 15px;
            opacity: 0.5;
        }
        
        .empty-notifications p {
            font-size: 1.1rem;
            margin-bottom: 8px;
            color: #6c757d;
        }
        
        .empty-notifications small {
            font-size: 0.85rem;
        }
        
        /* Mobile Responsiveness */
        @media (max-width: 768px) {
            .notification-toast {
                left: 20px;
                right: 20px;
                max-width: none;
                min-width: auto;
            }
            
            .notification-panel {
                width: 100%;
                right: -100%;
            }
            
            .notification-bell {
                min-width: 42px;
                height: 40px;
                font-size: 0.95rem;
                padding: 0 10px;
                margin-left: auto;
                display: inline-flex !important;
            }

            .notification-bell .bell-label {
                display: none;
            }

            .notification-bell .bell-icon,
            .notification-bell .bell-icon i {
                min-width: 18px;
                min-height: 18px;
                width: 18px;
                height: 18px;
                font-size: 1.05rem;
                opacity: 1 !important;
                visibility: visible !important;
                color: #ffffff !important;
            }
            
            .current-month-display {
                position: static;
                margin-top: 10px;
                display: inline-block;
            }
        }
        
        /* For small screens, adjust header layout */
        @media (max-width: 480px) {
            .app-header {
                padding-bottom: 16px;
                overflow: visible;
            }
            
            .notification-bell {
                min-width: 40px;
                height: 40px;
                background: rgba(67, 97, 238, 0.9);
                border-radius: 10px;
                display: inline-flex !important;
            }

            .notification-bell .bell-icon,
            .notification-bell .bell-icon i {
                min-width: 18px;
                min-height: 18px;
                width: 18px;
                height: 18px;
                font-size: 1.1rem;
                opacity: 1 !important;
                visibility: visible !important;
                color: #ffffff !important;
            }
        }
    `;
    
    document.head.appendChild(styleEl);
}


// Handle internal links like #expense, #history, etc.
document.addEventListener("click", function (e) {
    const link = e.target.closest("a[href^='#']");
    if (!link) return;

    const page = link.getAttribute("href").replace("#", "");
    const pageElement = document.getElementById(`${page}-page`);

    if (pageElement) {
        e.preventDefault();
        showPage(page);
    }
});
// Update the initApp function to initialize notification system
// Find the existing initApp function in app.js and add this line at the end:




// Number input doesn't need formatting - HTML5 validation handles it
// The old text input formatting code is no longer needed with type="number"


