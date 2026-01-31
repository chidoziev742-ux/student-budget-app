/**
 * Expense Module
 * Handles expense tracking functionality with Firestore sync
 */

/**
 * Initialize expense page
 */
function initExpensePage() {
    const form = document.getElementById('expense-form');
    if (form) {
        form.addEventListener('submit', handleExpenseSubmit);
    }
    
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('expense-date');
    if (dateInput) {
        dateInput.value = today;
        dateInput.max = today;
    }
}

/**
 * Handle expense form submission
 * @param {Event} e
 */
async function handleExpenseSubmit(e) {
    e.preventDefault();
    
    const amountInput = document.getElementById('expense-amount');
    const categorySelect = document.getElementById('expense-category');
    const dateInput = document.getElementById('expense-date');
    const reasonTextarea = document.getElementById('expense-reason');
    
    const amount = parseFloat(amountInput.value);
    const category = categorySelect.value;
    const date = dateInput.value;
    const reason = reasonTextarea.value.trim();
    
    // Validation
    if (!amount || amount <= 0) {
        showToast('Please enter a valid amount', 'error');
        amountInput.focus();
        return;
    }
    if (!category) {
        showToast('Please select a category', 'error');
        categorySelect.focus();
        return;
    }
    if (!date) {
        showToast('Please select a date', 'error');
        dateInput.focus();
        return;
    }
    
    // Create expense object
    const expense = {
        id: Date.now().toString(),
        amount,
        category,
        date,
        reason: reason || `Expense on ${date}`,
        addedDate: new Date().toISOString()
    };
    
    // Show loading state
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
    submitBtn.disabled = true;
    
    try {
        // Add expense with Firestore sync
        const result = await addExpense(expense);
        
        if (result.success) {
            // Clear form
            e.target.reset();
            dateInput.value = new Date().toISOString().split('T')[0];
            
            // Update UI
            updateDashboard();
            updateBudgetPage();
            updateHistoryPage();
            updateSavingsPage();
            
            // Trigger notification
            triggerExpenseNotifications();
            
            const categoryName = CONFIG.CATEGORIES[category]?.name || category;
            showToast(`Added ${categoryName} expense of ${formatCurrency(amount)}`, 'success');
            
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            showToast(`Failed to add expense: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('Error submitting expense:', error);
        showToast('Failed to add expense. Please try again.', 'error');
    } finally {
        // Restore button state
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

/**
 * Add an expense to appState and sync with Firestore
 * @param {Object} expense - Expense object to add
 * @returns {Object} - { success: true/false, id?: string, error?: string }
 */
async function addExpense(expense) {
    try {
        const user = window.firebaseAuth?.getCurrentUser?.();
        
        if (!user) {
            // Not logged in - save to appState and localStorage only
            console.warn('User not logged in, saving locally only');
            const localId = Date.now().toString();
            appState.expenses.push({
                id: localId,
                ...expense
            });
            saveAppData();
            return { success: true, id: localId };
        }
        
        // Use Firestore to add expense document
        if (!window.firestoreSync?.addExpenseToFirestore) {
            console.error('Firestore sync not available');
            return { success: false, error: 'Firestore not configured' };
            
        }
        
        console.log('Adding expense to Firestore for user:', user.uid);
        const result = await window.firestoreSync.addExpenseToFirestore(user.uid, expense);
        
        if (result.success) {
            console.log('Expense added with Firestore ID:', result.id);
            
            // Add to appState with Firestore ID
            appState.expenses.push({
                id: result.id,
                ...expense,
                addedDate: new Date().toISOString()
            });
            
            // Save to localStorage as backup
            saveAppData();
            
            // Update balance in budget document
            await window.firestoreSync.updateBalanceInFirestore(user.uid, appState);
            
            return { success: true, id: result.id };
        } else {
            console.error('Failed to add expense to Firestore:', result.error);
            return { success: false, error: result.error };
        }
    } catch (error) {
        console.error('Error adding expense:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Edit an existing expense
 * @param {string} expenseId - ID of expense to edit
 * @param {Object} updates - Updated expense data
 * @returns {Object} - { success: true/false, error?: string }
 */
async function editExpense(expenseId, updates) {
    try {
        const user = window.firebaseAuth?.getCurrentUser?.();
        
        if (!user) {
            console.warn('User not logged in');
            return { success: false, error: 'Not authenticated' };
        }
        
        if (!window.firestoreSync?.updateExpenseInFirestore) {
            return { success: false, error: 'Firestore not configured' };
        }
        
        const result = await window.firestoreSync.updateExpenseInFirestore(user.uid, expenseId, updates);
        
        if (result.success) {
            // Update local appState
            const index = appState.expenses.findIndex(exp => exp.id === expenseId);
            if (index !== -1) {
                appState.expenses[index] = {
                    ...appState.expenses[index],
                    ...updates
                };
            }
            
            // Save to localStorage as backup
            saveAppData();
            
            // Update balance
            await window.firestoreSync.updateBalanceInFirestore(user.uid, appState);
            
            return { success: true };
        } else {
            return { success: false, error: result.error };
        }
    } catch (error) {
        console.error('Error editing expense:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Delete an expense from appState and Firestore
 * @param {string} expenseId - ID of expense to delete
 * @returns {Object} - { success: true/false, error?: string }
 */
async function deleteExpense(expenseId) {
    try {
        const user = window.firebaseAuth?.getCurrentUser?.();
        
        if (!user) {
            console.warn('User not logged in');
            // Still allow deletion from local state
            const initialLength = appState.expenses.length;
            appState.expenses = appState.expenses.filter(exp => exp.id !== expenseId);
            if (appState.expenses.length < initialLength) {
                saveAppData();
                return { success: true };
            }
            return { success: false, error: 'Expense not found' };
        }
        
        if (!window.firestoreSync?.deleteExpenseFromFirestore) {
            return { success: false, error: 'Firestore not configured' };
        }
        
        const result = await window.firestoreSync.deleteExpenseFromFirestore(user.uid, expenseId);
        
        if (result.success) {
            // Update local appState
            appState.expenses = appState.expenses.filter(exp => exp.id !== expenseId);
            
            // Save to localStorage as backup
            saveAppData();
            
            // Update balance
            await window.firestoreSync.updateBalanceInFirestore(user.uid, appState);
            
            return { success: true };
        } else {
            return { success: false, error: result.error };
        }
    } catch (error) {
        console.error('Error deleting expense:', error);
        return { success: false, error: error.message };
    }
}

// Initialize expense page
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('expense-page')) {
        initExpensePage();
    }
});

/**
 * Delete an expense - wrapper for onclick handlers
 * Properly handles async operations
 */
window.deleteExpenseFromUI = async function(expenseId) {
    const result = await deleteExpense(expenseId);
    
    if (result.success) {
        updateDashboard();
        updateBudgetPage();
        updateHistoryPage();
        updateSavingsPage();
        showToast('Expense deleted successfully', 'success');
    } else {
        showToast(`Failed to delete expense: ${result.error}`, 'error');
    }
};

/**
 * Trigger expense-related notifications
 */
function triggerExpenseNotifications() {
    if (typeof triggerBudgetNotification === 'function') {
        triggerBudgetNotification();
    }
}
