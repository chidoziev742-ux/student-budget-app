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
    VERSION: '1.0.0',
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
    
    console.log(`${CONFIG.APP_NAME} v${CONFIG.VERSION} initialized`);
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
 */
function loadAppData() {
    try {
        // Load budget
        const savedBudget = localStorage.getItem(`${CONFIG.APP_NAME}_budget`);
        if (savedBudget) {
            appState.budget = JSON.parse(savedBudget);
        }
        
        // Load expenses
        const savedExpenses = localStorage.getItem(`${CONFIG.APP_NAME}_expenses`);
        if (savedExpenses) {
            appState.expenses = JSON.parse(savedExpenses);
        }
        
        // Load savings goal
        const savedSavingsGoal = localStorage.getItem(`${CONFIG.APP_NAME}_savingsGoal`);
        if (savedSavingsGoal) {
            appState.savingsGoal = parseFloat(savedSavingsGoal);
        }
        
        console.log('App data loaded from localStorage');
    } catch (error) {
        console.error('Error loading app data:', error);
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
 * Save app data to localStorage (and Firestore if authenticated)
 */
function saveAppData() {
    try {
        // Always save to localStorage for fallback
        localStorage.setItem(`${CONFIG.APP_NAME}_budget`, JSON.stringify(appState.budget));
        localStorage.setItem(`${CONFIG.APP_NAME}_expenses`, JSON.stringify(appState.expenses));
        localStorage.setItem(`${CONFIG.APP_NAME}_savingsGoal`, appState.savingsGoal.toString());
        console.log('App data saved to localStorage');
        
        // Also save to Firestore if user is authenticated
        if (window.firebaseAuth && window.firebaseAuth.getCurrentUser()) {
            const user = window.firebaseAuth.getCurrentUser();
            const uid = user.uid;
            
            if (window.firestoreSync) {
                // Save budget
                if (appState.budget) {
                    window.firestoreSync.saveBudgetToFirestore(uid, appState.budget);
                }
                
                // Save expenses
                window.firestoreSync.saveExpensesToFirestore(uid, appState.expenses);
                
                // Save savings goal
                window.firestoreSync.saveSavingsGoalToFirestore(uid, appState.savingsGoal);
            }
        }
    } catch (error) {
        console.error('Error saving app data:', error);
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
    const dailySavingsInput = document.getElementById('daily-savings');
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
 * Show a specific page and hide others
 * @param {string} pageId - The ID of the page to show
 */
function showPage(pageId) {
    // Ensure DOM elements are cached
    if (!domElements.navLinks) {
        cacheDomElements();
    }
    
    // Update navigation
    if (domElements.navLinks) {
        domElements.navLinks.forEach(link => {
            if (link.getAttribute('data-page') === pageId) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }
    
    // Update pages
    if (domElements.pages) {
        domElements.pages.forEach(page => {
            if (page.id === `${pageId}-page`) {
                page.classList.add('active');
            } else {
                page.classList.remove('active');
            }
        });
    }
    
    // Update app state
    appState.currentPage = pageId;
    
    // Update the URL hash for bookmarking
    window.location.hash = pageId;
    
    // Trigger page-specific updates
    updatePageContent(pageId);
}

/**
 * Update content for the current page
 * @param {string} pageId - The ID of the page to update
 */
function updatePageContent(pageId) {
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
            break;
        case 'history':
            updateHistoryPage();
            break;
        case 'savings':
            updateSavingsPage();
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
    return `${CONFIG.DEFAULT_CURRENCY}${parseFloat(amount).toFixed(2)}`;
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
function clearAllData() {
    appState.budget = null;
    appState.expenses = [];
    appState.savingsGoal = 0;
    
    // Clear localStorage
    localStorage.removeItem(`${CONFIG.APP_NAME}_budget`);
    localStorage.removeItem(`${CONFIG.APP_NAME}_expenses`);
    localStorage.removeItem(`${CONFIG.APP_NAME}_savingsGoal`);
    
    // Update all pages
    updateDashboard();
    updateBudgetPage();
    updateHistoryPage();
    updateSavingsPage();
    
    // Show success message
    showToast('All data cleared successfully', 'success');
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
    
    if (amountInput) amountInput.value = amount;
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
    const dailyInput = document.getElementById('daily-savings');
    if (!dailyInput) return;
    
    const daily = parseFloat(dailyInput.value) || 0;
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
window.showPage = showPage;
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
    
    /**
     * Initialize the notification system
     */
    init() {
        // Load previously shown notifications from localStorage
        this.loadNotificationHistory();
        
        // Set last checked date to today
        this.lastCheckedDate = new Date();
        
        // Start periodic check (every 30 seconds)
        setInterval(() => this.checkNotifications(), 30000);
        
        // Check notifications on app initialization
        setTimeout(() => this.checkNotifications(), 2000);
        
        console.log('Notification system initialized');
    }
    
    /**
     * Show a notification
     * @param {string} title - Notification title
     * @param {string} message - Notification message
     * @param {string} type - Notification type (info, warning, error, success)
     * @param {string} trigger - What triggered this notification
     * @param {boolean} persistent - Whether to show this every time until action taken
     */
    showNotification(title, message, type = NOTIFICATION_TYPES.INFO, trigger = null, persistent = false) {
        // Check if we should suppress this notification
        if (trigger && this.shouldSuppressNotification(trigger)) {
            return;
        }
        
        // Create notification object
        const notification = {
            id: Date.now().toString(),
            title,
            message,
            type,
            trigger,
            timestamp: new Date().toISOString(),
            read: false
        };
        
        // Add to notifications array
        this.notifications.push(notification);
        
        // Mark as triggered if it has a trigger
        if (trigger) {
            this.triggeredNotifications.add(trigger);
        }
        
        // Show toast notification
        this.showToastNotification(notification);
        
        // Save notification to history if persistent
        if (persistent) {
            this.saveNotificationToHistory(notification);
        }
        
        // Update notification bell icon if exists
        this.updateNotificationIndicator();
        
        // Log for debugging
        console.log(`Notification shown: ${title}`, notification);
    }
    
    /**
     * Show toast notification
     * @param {object} notification - Notification object
     */
    showToastNotification(notification) {
        // Use existing showToast function if available
        if (typeof showToast === 'function') {
            showToast(`${notification.title}: ${notification.message}`, notification.type);
        } else {
            // Fallback to built-in toast
            this.createToast(notification);
        }
    }
    
    /**
     * Create a toast notification element
     * @param {object} notification - Notification object
     */
    createToast(notification) {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `notification-toast notification-${notification.type}`;
        toast.dataset.notificationId = notification.id;
        
        // Set icon based on type
        let icon = 'info-circle';
        switch(notification.type) {
            case NOTIFICATION_TYPES.SUCCESS: icon = 'check-circle'; break;
            case NOTIFICATION_TYPES.ERROR: icon = 'exclamation-circle'; break;
            case NOTIFICATION_TYPES.WARNING: icon = 'exclamation-triangle'; break;
        }
        
        toast.innerHTML = `
            <div class="notification-icon">
                <i class="fas fa-${icon}"></i>
            </div>
            <div class="notification-content">
                <div class="notification-title">${notification.title}</div>
                <div class="notification-message">${notification.message}</div>
                <div class="notification-time">Just now</div>
            </div>
            <button class="notification-close" onclick="window.notificationSystem.dismissNotification('${notification.id}')">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add to notification container or body
        const container = document.getElementById('notification-container') || document.body;
        container.appendChild(toast);
        
        // Show with animation
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // Auto-dismiss after 5 seconds (except warnings and errors)
        if (notification.type !== NOTIFICATION_TYPES.WARNING && 
            notification.type !== NOTIFICATION_TYPES.ERROR) {
            setTimeout(() => {
                this.dismissNotification(notification.id);
            }, 5000);
        }
    }
    
    /**
     * Dismiss a notification
     * @param {string} notificationId - ID of notification to dismiss
     */
    dismissNotification(notificationId) {
        // Remove from DOM
        const toast = document.querySelector(`[data-notification-id="${notificationId}"]`);
        if (toast) {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 300);
        }
        
        // Mark as read in array
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification) {
            notification.read = true;
        }
        
        // Update notification indicator
        this.updateNotificationIndicator();
    }
    
    /**
     * Check all notification conditions
     */
    checkNotifications() {
        // Check for no budget set
        this.checkNoBudgetSet();
        
        // Check budget usage percentages
        this.checkBudgetUsage();
        
        // Check for new month without budget
        this.checkNewMonthNoBudget();
        
        // Update last checked date
        this.lastCheckedDate = new Date();
    }
    
    /**
     * Check if user hasn't set a budget
     */
    checkNoBudgetSet() {
        if (!appState.budget || !appState.budget.amount) {
            this.showNotification(
                'Budget Not Set',
                'You haven\'t set a monthly budget yet. Go to the Budget page to set one.',
                NOTIFICATION_TYPES.WARNING,
                NOTIFICATION_TRIGGERS.NO_BUDGET_SET,
                true // Persistent until budget is set
            );
        }
    }
    
    /**
     * Check budget usage for 70% and 90% thresholds
     */
    checkBudgetUsage() {
        if (!appState.budget || !appState.budget.amount) return;
        
        const totalSpent = calculateTotalExpenses();
        const budgetAmount = appState.budget.amount;
        const usagePercentage = (totalSpent / budgetAmount) * 100;
        
        // Check for 70% threshold
        if (usagePercentage >= 70 && usagePercentage < 90) {
            if (!this.triggeredNotifications.has(NOTIFICATION_TRIGGERS.BUDGET_70_PERCENT)) {
                this.showNotification(
                    'Budget Alert - 70% Spent',
                    `You've spent ${usagePercentage.toFixed(1)}% of your monthly budget. Consider slowing down your spending.`,
                    NOTIFICATION_TYPES.WARNING,
                    NOTIFICATION_TRIGGERS.BUDGET_70_PERCENT
                );
            }
        }
        
        // Check for 90% threshold
        if (usagePercentage >= 90 && usagePercentage < 100) {
            if (!this.triggeredNotifications.has(NOTIFICATION_TRIGGERS.BUDGET_90_PERCENT)) {
                this.showNotification(
                    'Budget Alert - 90% Spent',
                    `You've spent ${usagePercentage.toFixed(1)}% of your monthly budget. You're approaching your limit!`,
                    NOTIFICATION_TYPES.WARNING,
                    NOTIFICATION_TRIGGERS.BUDGET_90_PERCENT
                );
            }
        }
        
        // Check for exceeded budget
        if (usagePercentage >= 100) {
            if (!this.triggeredNotifications.has(NOTIFICATION_TRIGGERS.BUDGET_EXCEEDED)) {
                this.showNotification(
                    'Budget Exceeded!',
                    `You've exceeded your monthly budget by ${formatCurrency(totalSpent - budgetAmount)}. Consider reviewing your expenses.`,
                    NOTIFICATION_TYPES.ERROR,
                    NOTIFICATION_TRIGGERS.BUDGET_EXCEEDED
                );
            }
        }
    }
    
    /**
     * Check if new month started without a budget
     */
    checkNewMonthNoBudget() {
        // If no budget is set, we don't need this check
        if (!appState.budget || !appState.budget.setDate) return;
        
        const budgetSetDate = new Date(appState.budget.setDate);
        const currentDate = new Date();
        
        // Check if we're in a new month compared to when budget was set
        if (budgetSetDate.getMonth() !== currentDate.getMonth() || 
            budgetSetDate.getFullYear() !== currentDate.getFullYear()) {
            
            // Check if we've already shown this notification this month
            const lastShownKey = `new_month_notification_${currentDate.getFullYear()}_${currentDate.getMonth()}`;
            const lastShown = localStorage.getItem(lastShownKey);
            
            if (!lastShown) {
                this.showNotification(
                    'New Month Started',
                    `It's a new month! Review and update your budget for ${currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.`,
                    NOTIFICATION_TYPES.INFO,
                    NOTIFICATION_TRIGGERS.NEW_MONTH_NO_BUDGET
                );
                
                // Mark as shown for this month
                localStorage.setItem(lastShownKey, 'true');
            }
        }
    }
    
    /**
     * Check if we should suppress a notification
     * @param {string} trigger - Notification trigger
     * @returns {boolean} True if notification should be suppressed
     */
    shouldSuppressNotification(trigger) {
        // Check if this trigger has already been shown
        return this.triggeredNotifications.has(trigger);
    }
    
    /**
     * Clear triggered notifications (call when budget is updated)
     */
    clearTriggeredNotifications() {
        this.triggeredNotifications.clear();
        console.log('Cleared triggered notifications');
    }
    
    /**
     * Update notification indicator (bell icon)
     */
    updateNotificationIndicator() {
        // Count unread notifications
        const unreadCount = this.notifications.filter(n => !n.read).length;
        
        // Update or create notification bell in header
        let bellIcon = document.getElementById('notification-bell');
        
        if (!bellIcon && unreadCount > 0) {
            // Create notification bell
            bellIcon = document.createElement('div');
            bellIcon.id = 'notification-bell';
            bellIcon.className = 'notification-bell';
            bellIcon.innerHTML = `
                <i class="fas fa-bell"></i>
                ${unreadCount > 0 ? `<span class="notification-badge">${unreadCount}</span>` : ''}
            `;
            
            // Add to header
            const header = document.querySelector('.app-header');
            if (header) {
                header.appendChild(bellIcon);
            }
            
            // Add click event to show notification panel
            bellIcon.addEventListener('click', () => this.showNotificationPanel());
        } else if (bellIcon) {
            // Update badge count
            const badge = bellIcon.querySelector('.notification-badge');
            if (unreadCount > 0) {
                if (!badge) {
                    bellIcon.innerHTML += `<span class="notification-badge">${unreadCount}</span>`;
                } else {
                    badge.textContent = unreadCount;
                }
                bellIcon.classList.add('has-notifications');
            } else {
                if (badge) badge.remove();
                bellIcon.classList.remove('has-notifications');
            }
        }
    }
    
    /**
     * Show notification panel with all notifications
     */
    showNotificationPanel() {
        // Create or show notification panel
        let panel = document.getElementById('notification-panel');
        
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'notification-panel';
            panel.className = 'notification-panel';
            
            // Add close button
            panel.innerHTML = `
                <div class="notification-panel-header">
                    <h3><i class="fas fa-bell"></i> Notifications</h3>
                    <button class="notification-panel-close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="notification-panel-content" id="notification-panel-content">
                    <!-- Notifications will be loaded here -->
                </div>
                <div class="notification-panel-footer">
                    <button id="clear-all-notifications" class="btn btn-secondary">
                        <i class="fas fa-trash"></i> Clear All
                    </button>
                </div>
            `;
            
            document.body.appendChild(panel);
            
            // Add event listeners
            panel.querySelector('.notification-panel-close').addEventListener('click', () => {
                panel.classList.remove('show');
            });
            
            document.getElementById('clear-all-notifications').addEventListener('click', () => {
                this.clearAllNotifications();
            });
            
            // Close panel when clicking outside
            document.addEventListener('click', (e) => {
                if (!panel.contains(e.target) && !e.target.closest('#notification-bell')) {
                    panel.classList.remove('show');
                }
            });
        }
        
        // Load notifications into panel
        this.loadNotificationsIntoPanel();
        
        // Show panel
        panel.classList.add('show');
    }
    
    /**
     * Load notifications into the panel
     */
    loadNotificationsIntoPanel() {
        const content = document.getElementById('notification-panel-content');
        if (!content) return;
        
        if (this.notifications.length === 0) {
            content.innerHTML = `
                <div class="empty-notifications">
                    <i class="fas fa-bell-slash"></i>
                    <p>No notifications yet</p>
                    <small>You'll get notified about budget alerts and important updates</small>
                </div>
            `;
            return;
        }
        
        // Sort notifications by timestamp (newest first)
        const sortedNotifications = [...this.notifications].sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
        );
        
        let html = '<div class="notification-list">';
        
        sortedNotifications.forEach(notification => {
            const timeAgo = this.getTimeAgo(notification.timestamp);
            const typeIcon = this.getTypeIcon(notification.type);
            
            html += `
                <div class="notification-item ${notification.read ? 'read' : 'unread'}" data-id="${notification.id}">
                    <div class="notification-item-icon">
                        <i class="fas fa-${typeIcon} notification-${notification.type}"></i>
                    </div>
                    <div class="notification-item-content">
                        <div class="notification-item-title">${notification.title}</div>
                        <div class="notification-item-message">${notification.message}</div>
                        <div class="notification-item-time">${timeAgo}</div>
                    </div>
                    <button class="notification-item-dismiss" onclick="window.notificationSystem.dismissNotification('${notification.id}')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        });
        
        html += '</div>';
        content.innerHTML = html;
    }
    
    /**
     * Get time ago string
     * @param {string} timestamp - ISO timestamp
     * @returns {string} Human readable time ago
     */
    getTimeAgo(timestamp) {
        const now = new Date();
        const past = new Date(timestamp);
        const diffMs = now - past;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
        
        return past.toLocaleDateString();
    }
    
    /**
     * Get icon name for notification type
     * @param {string} type - Notification type
     * @returns {string} Icon name
     */
    getTypeIcon(type) {
        switch(type) {
            case NOTIFICATION_TYPES.SUCCESS: return 'check-circle';
            case NOTIFICATION_TYPES.ERROR: return 'exclamation-circle';
            case NOTIFICATION_TYPES.WARNING: return 'exclamation-triangle';
            default: return 'info-circle';
        }
    }
    
    /**
     * Clear all notifications
     */
    clearAllNotifications() {
        // Dismiss all toast notifications
        document.querySelectorAll('.notification-toast').forEach(toast => {
            const id = toast.dataset.notificationId;
            if (id) this.dismissNotification(id);
        });
        
        // Mark all as read
        this.notifications.forEach(n => n.read = true);
        
        // Clear triggered notifications
        this.triggeredNotifications.clear();
        
        // Update panel
        this.loadNotificationsIntoPanel();
        
        // Update indicator
        this.updateNotificationIndicator();
        
        console.log('All notifications cleared');
    }
    
    /**
     * Save notification to history (for persistent notifications)
     * @param {object} notification - Notification object
     */
    saveNotificationToHistory(notification) {
        try {
            const history = JSON.parse(localStorage.getItem(`${CONFIG.APP_NAME}_notificationHistory`) || '[]');
            history.push({
                ...notification,
                savedAt: new Date().toISOString()
            });
            
            // Keep only last 50 notifications
            if (history.length > 50) {
                history.splice(0, history.length - 50);
            }
            
            localStorage.setItem(`${CONFIG.APP_NAME}_notificationHistory`, JSON.stringify(history));
        } catch (error) {
            console.error('Error saving notification history:', error);
        }
    }
    
    /**
     * Load notification history from localStorage
     */
    loadNotificationHistory() {
        try {
            const history = JSON.parse(localStorage.getItem(`${CONFIG.APP_NAME}_notificationHistory`) || '[]');
            
            // Check for persistent notifications that might need to be shown again
            history.forEach(notification => {
                if (notification.trigger === NOTIFICATION_TRIGGERS.NO_BUDGET_SET && 
                    (!appState.budget || !appState.budget.amount)) {
                    // Re-add to triggered set so it doesn't show again immediately
                    this.triggeredNotifications.add(notification.trigger);
                }
            });
        } catch (error) {
            console.error('Error loading notification history:', error);
        }
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
            position: absolute;
            top: 20px;
            right: 20px;
            background: rgba(255, 255, 255, 0.2);
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.3s ease;
            color: white;
            font-size: 1.2rem;
        }
        
        .notification-bell:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: scale(1.1);
        }
        
        .notification-bell.has-notifications {
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(247, 37, 133, 0.7); }
            70% { box-shadow: 0 0 0 10px rgba(247, 37, 133, 0); }
            100% { box-shadow: 0 0 0 0 rgba(247, 37, 133, 0); }
        }
        
        .notification-badge {
            position: absolute;
            top: -5px;
            right: -5px;
            background: #f72585;
            color: white;
            font-size: 0.7rem;
            font-weight: 600;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
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
                top: 15px;
                right: 15px;
                width: 36px;
                height: 36px;
                font-size: 1rem;
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
                padding-bottom: 60px;
            }
            
            .notification-bell {
                top: auto;
                bottom: 10px;
                right: 10px;
                background: rgba(67, 97, 238, 0.9);
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
  function formatCurrency(amount) {
    if (isNaN(amount)) return "₦0";
    
    return `₦${Number(amount).toLocaleString('en-NG')}`;
}

// Update the initApp function to initialize notification system
// Find the existing initApp function in app.js and add this line at the end:




// Number input doesn't need formatting - HTML5 validation handles it
// The old text input formatting code is no longer needed with type="number"


