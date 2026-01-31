/**
 * Budget Module
 * Handles budget page functionality
 */

// --- Initialize budget page ---
function updateBudgetPage() {
    const form = document.getElementById('budget-form');
    if (form) {
        form.addEventListener('submit', handleBudgetSubmit);
    }

    // Populate form with existing budget
    if (appState.budget) {
        document.getElementById('monthly-budget').value = appState.budget.amount || '';
        document.getElementById('savings-goal').value = appState.savingsGoal || '';

        if (appState.budget.category) {
            document.getElementById('budget-category').value = appState.budget.category;
        }
    }

    updateBudgetStatus();
}

// --- Handle budget form submission ---
function handleBudgetSubmit(e) {
    e.preventDefault();

    const amountInput = document.getElementById('monthly-budget');
    const savingsGoalInput = document.getElementById('savings-goal');
    const categorySelect = document.getElementById('budget-category');

    const amount = parseFloat(amountInput.value);
    const savingsGoal = savingsGoalInput.value ? parseFloat(savingsGoalInput.value) : 0;
    const category = categorySelect.value || null;

    // Validation
    if (!amount || amount <= 0) {
        showToast('Please enter a valid budget amount', 'error');
        amountInput.focus();
        return;
    }

    // Update app state
    appState.budget = {
        amount: amount,
        category: category,
        setDate: new Date().toISOString()
    };

    appState.savingsGoal = savingsGoal;

    // Save data
    saveAppData();

    // Update UI
    updateBudgetStatus();
    updateDashboard();
    updateSavingsPage();

    // Trigger notifications
    triggerBudgetNotifications();

    showToast('Budget saved successfully!', 'success');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- Update budget status display ---
function updateBudgetStatus() {
    const currentBudget = appState.budget?.amount || 0;
    document.getElementById('current-monthly-budget').textContent = formatCurrency(currentBudget);
    document.getElementById('current-savings-goal').textContent = formatCurrency(appState.savingsGoal || 0);

    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const daysRemaining = lastDay.getDate() - now.getDate();
    document.getElementById('days-remaining').textContent = daysRemaining;

    const totalSpent = calculateTotalExpenses();
    const budgetUsedPercent = currentBudget > 0 ? (totalSpent / currentBudget) * 100 : 0;

    const progressFill = document.getElementById('budget-progress-fill');
    const budgetUsedPercentElement = document.getElementById('budget-used-percent');

    if (progressFill) {
        progressFill.style.width = `${Math.min(budgetUsedPercent, 100)}%`;

        if (budgetUsedPercent > 100) progressFill.style.background = 'linear-gradient(to right, #f72585, #f8961e)';
        else if (budgetUsedPercent > 80) progressFill.style.background = 'linear-gradient(to right, #f8961e, #4cc9f0)';
        else progressFill.style.background = 'linear-gradient(to right, #4cc9f0, #4361ee)';
    }

    if (budgetUsedPercentElement) {
        budgetUsedPercentElement.textContent = `${budgetUsedPercent.toFixed(1)}%`;

        if (budgetUsedPercent > 100) budgetUsedPercentElement.style.color = '#f72585';
        else if (budgetUsedPercent > 80) budgetUsedPercentElement.style.color = '#f8961e';
        else budgetUsedPercentElement.style.color = '#4cc9f0';
    }
}

// --- Trigger budget notifications ---
function triggerBudgetNotifications() {
    if (window.notificationSystem?.checkNotifications) {
        setTimeout(() => window.notificationSystem.checkNotifications(), 500);
    }
}

// --- Initialize on DOM load ---
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('budget-page')) {
        updateBudgetPage();
    }
});
