// --- Calculation functions ---
function calculateTotalExpenses() {
    return appState.expenses.reduce((sum, e) => sum + e.amount, 0);
}

function calculateRemainingBalance() {
    return (appState.budget?.amount || 0) - calculateTotalExpenses();
}

// If you want savings to reflect actual leftover money:
function calculateCurrentSavings() {
    // Savings = money left after expenses, cannot be negative
    return Math.max(calculateRemainingBalance(), 0);
}

// --- Dashboard update ---
function updateDashboard() {
    updateSummaryCards();
    updateRecentExpenses();
    updateCategoryBreakdown();
}

// --- Summary cards ---
function updateSummaryCards() {
    const totalBudget = appState.budget?.amount || 0;
    const totalSpent = calculateTotalExpenses();
    const remainingBalance = calculateRemainingBalance();
    const totalSavings = calculateCurrentSavings(); // <-- updated

    const totalBudgetEl = document.getElementById('total-budget');
    const remainingBalanceEl = document.getElementById('remaining-balance');
    const totalSpentEl = document.getElementById('total-spent');
    const totalSavingsEl = document.getElementById('total-savings');

    if (totalBudgetEl) totalBudgetEl.textContent = formatCurrency(totalBudget);
    if (remainingBalanceEl) {
        remainingBalanceEl.textContent = formatCurrency(remainingBalance);
        if (remainingBalance < 0) remainingBalanceEl.style.color = '#f72585';
        else if (remainingBalance < totalBudget * 0.2) remainingBalanceEl.style.color = '#f8961e';
        else remainingBalanceEl.style.color = '#4cc9f0';
    }
    if (totalSpentEl) totalSpentEl.textContent = formatCurrency(totalSpent);
    if (totalSavingsEl) totalSavingsEl.textContent = formatCurrency(totalSavings);
}

// --- Recent expenses ---
function updateRecentExpenses() {
    const container = document.getElementById('recent-expenses');
    if (!container) return;

    const recentExpenses = [...appState.expenses]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);

    if (recentExpenses.length === 0) {
        container.innerHTML = `<div class="empty-state">
            <p>No expenses recorded yet</p>
            <a href="#expense" class="btn btn-primary">Add Your First Expense</a>
        </div>`;
        return;
    }

    container.innerHTML = recentExpenses.map(expense => {
        const category = CONFIG.CATEGORIES?.[expense.category] || { name: expense.category || 'Other', color: '#ccc', icon: 'fas fa-tag' };
        const date = new Date(expense.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return `
            <div class="expense-item">
                <div class="expense-category-icon ${expense.category}" style="background-color: ${category.color}">
                    <i class="${category.icon}"></i>
                </div>
                <div class="expense-details">
                    <div class="expense-reason">${expense.reason || 'No description'}</div>
                    <div class="expense-meta">
                        <div class="expense-date"><i class="fas fa-calendar"></i> ${date}</div>
                        <div class="expense-category"><i class="fas fa-tag"></i> ${category.name}</div>
                    </div>
                </div>
                <div class="expense-amount">${formatCurrency(expense.amount)}</div>
            </div>`;
    }).join('');
}

// --- Category breakdown ---
function updateCategoryBreakdown() {
    const container = document.getElementById('category-breakdown');
    if (!container) return;

    const categoryTotals = {};
    let totalSpent = 0;

    appState.expenses.forEach(expense => {
        const cat = expense.category || 'other';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + expense.amount;
        totalSpent += expense.amount;
    });

    if (totalSpent === 0) {
        container.innerHTML = `<div class="empty-state"><p>No spending data to display</p></div>`;
        return;
    }

    const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
    container.innerHTML = sortedCategories.map(([catId, amt]) => {
        const category = CONFIG.CATEGORIES?.[catId] || { name: catId, color: '#ccc', icon: 'fas fa-tag' };
        const percentage = ((amt / totalSpent) * 100).toFixed(1);
        return `
            <div class="category-item">
                <div class="category-header">
                    <div class="category-info">
                        <div class="category-icon" style="color:${category.color}"><i class="${category.icon}"></i></div>
                        <div class="category-name">${category.name}</div>
                    </div>
                    <div class="category-amount">${formatCurrency(amt)}</div>
                </div>
                <div class="category-progress">
                    <div class="progress-bar"><div class="progress-fill" style="width:${percentage}%;background-color:${category.color}"></div></div>
                    <div class="category-percentage">${percentage}%</div>
                </div>
            </div>`;
    }).join('');
}

// --- Initialize dashboard on page load ---
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('dashboard-page')) {
        updateDashboard();
    }
});


