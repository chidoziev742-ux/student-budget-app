/**
 * Savings Module
 * Handles savings tracking and calculations
 */

/**
 * Calculate current savings
 * Here we assume savings = appState.savingsGoal minus expenses
 */
function calculateCurrentSavings() {
    const budget = appState.budget?.amount || 0;
    const totalSpent = appState.expenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0;
    // Current savings = budget + savingsGoal - totalSpent
    // Or if you just track savingsGoal separately, return appState.savingsGoal
    const savingsGoal = appState.savingsGoal || 0;
    const currentSavings = Math.max(savingsGoal - Math.max(totalSpent - budget, 0), 0);
    return currentSavings;
}

/**
 * Update the savings page
 */
function updateSavingsPage() {
    updateSavingsGoalDisplay();
    // If you had a calculator section, you can implement it here
    if (typeof updateSavingsCalculator === 'function') updateSavingsCalculator();
}

/**
 * Update savings goal display
 */
function updateSavingsGoalDisplay() {
    const savingsGoal = appState.savingsGoal || 0;
    const currentSavings = calculateCurrentSavings();

    const goalEl = document.getElementById('savings-goal-display');
    const currentEl = document.getElementById('current-savings-display');
    const progressPercentEl = document.getElementById('savings-progress-percent');
    const progressFill = document.getElementById('savings-progress-fill');
    const progressText = document.getElementById('savings-progress-text');

    if (goalEl) goalEl.textContent = formatCurrency(savingsGoal);
    if (currentEl) currentEl.textContent = formatCurrency(currentSavings);

    const progressPercent = savingsGoal > 0 ? (currentSavings / savingsGoal) * 100 : 0;
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

        if (savingsGoal > 0) {
            if (progressPercent >= 100) {
                progressText.innerHTML += ' <span class="encouragement">🎉 Goal achieved!</span>';
            } else if (progressPercent >= 75) {
                progressText.innerHTML += ' <span class="encouragement">💪 Almost there!</span>';
            } else if (progressPercent >= 50) {
                progressText.innerHTML += ' <span class="encouragement">👍 Halfway there!</span>';
            }
        }
    }
}

// Add encouragement styles
const savingsStyles = document.createElement('style');
savingsStyles.textContent = `
    .encouragement {
        color: #4361ee;
        font-weight: 500;
        margin-left: 5px;
    }
`;
document.head.appendChild(savingsStyles);
