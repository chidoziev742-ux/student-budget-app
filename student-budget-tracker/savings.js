/**
 * Savings Module
 * Handles savings tracking and calculations
 */

let savingsMonthData = null;

/**
 * Load current month's data from Firebase
 */
async function loadSavingsMonthData() {
    const user = window.firebaseAuth?.getCurrentUser?.();
    const currentMonth = window.monthlyBudget?.getCurrentMonth?.();
    
    const fallbackData = {
        success: false,
        month: currentMonth || null,
        budget: 0,
        income: [],
        expenses: [],
        savingsGoal: 0,
        totalIncome: 0,
        totalExpenses: 0
    };

    if (!user || !window.monthlyBudget?.getMonthData || !currentMonth) {
        savingsMonthData = fallbackData;
        return;
    }

    const result = await window.monthlyBudget.getMonthData(user.uid, currentMonth);
    savingsMonthData = result?.success ? result : fallbackData;
}

async function loadDailySpendingAmount() {
    const input = document.getElementById('daily-savings');
    const user = window.firebaseAuth?.getCurrentUser?.();
    if (!input || !user || !window.firebaseAuth?.getOnboardingStatus) return;

    const result = await window.firebaseAuth.getOnboardingStatus(user.uid);
    const savedValue = result?.onboarding?.safe_daily_spending;
    if (savedValue != null) input.value = savedValue;
}

async function saveDailySpendingAmount() {
    const input = document.getElementById('daily-savings');
    const user = window.firebaseAuth?.getCurrentUser?.();
    if (!input || !user || !window.firebaseAuth?.saveOnboardingProgress) return;

    const value = Number(input.value || 0);
    if (!Number.isFinite(value) || value < 0) return;

    const result = await window.firebaseAuth.saveOnboardingProgress({
        safe_daily_spending: value,
        completed: true
    }, user.uid);
    const status = document.getElementById('daily-savings-save-status');
    if (status) status.textContent = result?.success ? 'Saved' : (result?.error || 'Could not save');
    if (result?.success && window.updateDashboard) await window.updateDashboard();
}

async function handleSafeSpendSubmit(event) {
    event.preventDefault();
    await saveDailySpendingAmount();
}

async function handleSavingsGoalSubmit(event) {
    event.preventDefault();
    const user = window.firebaseAuth?.getCurrentUser?.();
    const input = document.getElementById('savings-goal-amount');
    const amount = Number(input?.value || 0);
    if (!user || !Number.isFinite(amount) || amount < 0) {
        showToast('Please enter a valid savings goal', 'error');
        return;
    }

    const result = await window.monthlyBudget?.updateSavingsGoal?.(
        user.uid,
        window.monthlyBudget?.getCurrentMonth?.(),
        amount
    );
    if (!result?.success) {
        showToast(result?.error || 'Failed to save savings goal', 'error');
        return;
    }

    showToast('Savings goal saved', 'success');
    await updateSavingsPage();
    if (window.updateDashboard) await window.updateDashboard();
}

/**
 * Calculate current savings
 * Savings = income - expenses (money you've actually saved this month)
 * If no income data, fall back to remaining balance (budget - expenses)
 */
function calculateCurrentSavings() {
    if (!savingsMonthData) return 0;

    const actualSaved = Number(savingsMonthData.savedAmount ?? savingsMonthData.savings ?? 0);
    return Math.max(actualSaved, 0);
}

async function handleAddSavingsSubmit(event) {
    event.preventDefault();

    const user = window.firebaseAuth?.getCurrentUser?.();
    if (!user) {
        showToast('Please sign in first', 'error');
        return;
    }

    const form = event.currentTarget;
    const amountInput = form.querySelector('#savings-amount');
    const noteInput = form.querySelector('#savings-note');
    const goalSelect = form.querySelector('#savings-goal-select');
    const amount = Number(amountInput?.value || 0);
    const note = noteInput?.value?.trim() || '';
    const goalId = goalSelect?.value || null;

    if (!Number.isFinite(amount) || amount <= 0) {
        showToast('Please enter a valid savings amount', 'error');
        amountInput?.focus();
        return;
    }

    const month = window.monthlyBudget?.getCurrentMonth?.();
    const result = await window.monthlyBudget?.addSavingsToGoal?.(user.uid, month, { amount, goalId, note });

    if (result?.success) {
        form.reset();
        showToast('Savings added successfully', 'success');

        if (window.notificationSystem?.recordSavingsContribution) {
            const goalName = savingsMonthData?.savingsGoal > 0 ? (window.currentUser?.profile?.goal_name || 'your goal') : 'your goal';
            await window.notificationSystem.recordSavingsContribution({ amount, goalName, goalId: goalId || null });
            await window.notificationSystem.syncSavingsNotifications();
        }

        await updateSavingsPage();
        if (window.updateDashboard) {
            await window.updateDashboard();
        } else {
            updateDashboard();
        }
    } else {
        showToast(result?.error || 'Failed to add savings', 'error');
    }
}

function populateSavingsGoalSelect() {
    const select = document.getElementById('savings-goal-select');
    if (!select) return;

    const goalValue = Number(savingsMonthData?.savingsGoal || 0);
    const currentGoal = goalValue > 0 ? `Current goal (${formatCurrency(goalValue)})` : 'No savings goal created yet';

    select.innerHTML = `
        <option value="">${currentGoal}</option>
    `;

    if (goalValue > 0) {
        const option = document.createElement('option');
        option.value = 'current';
        option.textContent = `Current savings goal · ${formatCurrency(goalValue)}`;
        select.appendChild(option);
    }
}

/**
 * Update the savings page
 */
async function updateSavingsPage() {
    // Load current month data first
    await loadSavingsMonthData();
    await loadDailySpendingAmount();
    populateSavingsGoalSelect();
    const goalInput = document.getElementById('savings-goal-amount');
    if (goalInput) goalInput.value = Number(savingsMonthData?.savingsGoal || 0) || '';
    await updateSavingsGoalDisplay();
    // If you had a calculator section, you can implement it here
    if (typeof updateSavingsCalculator === 'function') updateSavingsCalculator();
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('add-savings-form');
    if (form) {
        form.addEventListener('submit', handleAddSavingsSubmit);
    }
    const goalForm = document.getElementById('savings-goal-form');
    if (goalForm) goalForm.addEventListener('submit', handleSavingsGoalSubmit);
    const dailyInput = document.getElementById('daily-savings');
    if (dailyInput) dailyInput.addEventListener('change', saveDailySpendingAmount);
    const safeSpendForm = document.getElementById('safe-spend-form');
    if (safeSpendForm) safeSpendForm.addEventListener('submit', handleSafeSpendSubmit);
    updateSavingsPage();
});

/**
 * Update savings goal display
 */
async function updateSavingsGoalDisplay() {
    const savingsGoal = savingsMonthData?.savingsGoal || 0;
    const currentSavings = calculateCurrentSavings();

    const goalEl = document.getElementById('savings-goal-display');
    const currentEl = document.getElementById('current-savings-display');
    const progressPercentEl = document.getElementById('savings-progress-percent');
    const progressFill = document.getElementById('savings-progress-fill');
    const progressText = document.getElementById('savings-progress-text');

    if (goalEl) goalEl.textContent = formatCurrency(savingsGoal);
    if (currentEl) currentEl.textContent = formatCurrency(currentSavings);

    if (savingsGoal > 0) {
        const progressPercent = (currentSavings / savingsGoal) * 100;
        if (progressPercentEl) progressPercentEl.textContent = `${progressPercent.toFixed(1)}%`;

        if (progressFill) {
            progressFill.style.width = `${Math.min(progressPercent, 100)}%`;
            if (progressPercent >= 100) {
                progressFill.style.background = 'linear-gradient(to right, #4cc9f0, #4361ee)';
            } else if (progressPercent >= 50) {
                progressFill.style.background = 'linear-gradient(to right, #1dd1a1, #4cc9f0)';
            } else {
                progressFill.style.background = 'linear-gradient(to right, #ff9f43, #1dd1a1)';
            }
        }

        if (progressText) {
            progressText.textContent = `${formatCurrency(currentSavings)} of ${formatCurrency(savingsGoal)} saved`;

            if (progressPercent >= 100) {
                progressText.innerHTML += ' <span class="encouragement">Goal achieved!</span>';
            } else if (progressPercent >= 75) {
                progressText.innerHTML += ' <span class="encouragement">Almost there!</span>';
            } else if (progressPercent >= 50) {
                progressText.innerHTML += ' <span class="encouragement">Halfway there!</span>';
            }
        }
    } else {
        // No savings goal set
        if (progressPercentEl) progressPercentEl.textContent = 'No goal set';
        if (progressFill) progressFill.style.width = '0%';
        if (progressText) {
            progressText.textContent = `Current savings: ${formatCurrency(currentSavings)}`;
            if (currentSavings > 0) {
                progressText.innerHTML += ' <span class="encouragement">Great job saving!</span>';
            } else {
                progressText.innerHTML += ' <span class="encouragement">Set a savings goal to track progress!</span>';
            }
        }
    }
}

// Add encouragement styles
if (!window.savingsStyles) {
    window.savingsStyles = document.createElement('style');
    window.savingsStyles.textContent = `
        .encouragement {
            color: #4361ee;
            font-weight: 500;
            margin-left: 5px;
        }
    `;
    document.head.appendChild(window.savingsStyles);
}
