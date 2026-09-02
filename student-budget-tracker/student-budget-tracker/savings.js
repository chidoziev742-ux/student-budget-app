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

/**
 * Calculate current savings
 * Savings = income - expenses (money you've actually saved this month)
 * If no income data, fall back to remaining balance (budget - expenses)
 */
function calculateCurrentSavings() {
    if (!savingsMonthData) return 0;

    const totalIncome = savingsMonthData.totalIncome || 0;
    const totalSpent = savingsMonthData.totalExpenses || 0;
    const budget = savingsMonthData.budget || 0;

    // If we have income data, use income - expenses
    if (totalIncome > 0) {
        return Math.max(totalIncome - totalSpent, 0);
    }

    // Otherwise, fall back to remaining balance (budget - expenses)
    return Math.max(budget - totalSpent, 0);
}

/**
 * Update the savings page
 */
async function updateSavingsPage() {
    // Load current month data first
    await loadSavingsMonthData();
    await updateSavingsGoalDisplay();
    // If you had a calculator section, you can implement it here
    if (typeof updateSavingsCalculator === 'function') updateSavingsCalculator();
}

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
