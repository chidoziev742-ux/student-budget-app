let dashboardMonthData = null;

// --- Calculation functions ---
function calculateTotalExpenses(expenses) {
    return (expenses || []).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
}

function calculateRemainingBalance(totalBudget, expenses) {
    return (totalBudget || 0) - calculateTotalExpenses(expenses);
}

async function loadDashboardMonthData() {
    const user = window.firebaseAuth?.getCurrentUser?.();
    const currentMonth = window.monthlyBudget?.getCurrentMonth?.();
    const fallbackData = {
        success: false,
        month: currentMonth || null,
        budget: 0,
        income: [],
        expenses: [],
        totalIncome: 0,
        totalExpenses: 0,
        savings: 0,
        budgetByCategory: {},
        spentByCategory: {},
        remainingByCategory: {}
    };

    if (!user || !window.monthlyBudget?.getMonthData || !currentMonth) {
        dashboardMonthData = fallbackData;
        return;
    }

    try {
        const result = await window.monthlyBudget.getMonthData(user.uid, currentMonth);
        dashboardMonthData = result?.success ? result : fallbackData;
    } catch (error) {
        console.error('[Dashboard] Failed to load month data:', error);
        dashboardMonthData = fallbackData;
    }
}

// --- Dashboard update ---
async function updateDashboard() {
    try {
        await loadDashboardMonthData();
        updateSummaryCards();
        updateRecentExpenses();
        updateCategoryBreakdown();
        updateV2DashboardExtras();
    } catch (error) {
        console.error('[Dashboard] Dashboard render failed:', error);
        const fallback = {
            budget: 0,
            expenses: [],
            totalIncome: 0,
            totalExpenses: 0,
            savings: 0,
            savingsGoal: 0
        };
        dashboardMonthData = fallback;
        updateSummaryCards();
        updateRecentExpenses();
        updateCategoryBreakdown();
        updateV2DashboardExtras();
    }
}

// --- Summary cards ---
function updateSummaryCards() {
    const totalBudget = dashboardMonthData?.budget || 0;
    const expenses = dashboardMonthData?.expenses || [];
    const totalSpent = calculateTotalExpenses(expenses);
    const remainingBalance = calculateRemainingBalance(totalBudget, expenses);
    const totalSavings = dashboardMonthData?.savings || 0;

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
    if (totalSavingsEl) {
        totalSavingsEl.textContent = formatCurrency(totalSavings);
        if (totalSavings < 0) {
            totalSavingsEl.style.color = '#f72585';
        } else if (totalSavings > 0) {
            totalSavingsEl.style.color = '#4cc9f0';
        } else {
            totalSavingsEl.style.color = '#6c757d';
        }
    }

    const availableBalanceEl = document.getElementById('v2-available-balance');
    if (availableBalanceEl) {
        availableBalanceEl.textContent = formatCurrency(remainingBalance);
    }
    const safeSpendEl = document.getElementById('v2-safe-spend');
    if (safeSpendEl) {
        const safeSpend = Number((dashboardMonthData?.budget || 0) > 0 ? (dashboardMonthData.budget * 0.12) : 0);
        const fallbackSafeSpend = Number(((dashboardMonthData?.totalIncome || 0) - (dashboardMonthData?.totalExpenses || 0)) * 0.15 || 0);
        const safeValue = Math.max(0, Math.min(safeSpend || fallbackSafeSpend, remainingBalance > 0 ? remainingBalance : (safeSpend || fallbackSafeSpend)));
        safeSpendEl.textContent = formatCurrency(safeValue || 0);
    }
}

// --- Recent expenses ---
function updateRecentExpenses() {
    const container = document.getElementById('recent-expenses');
    if (!container) return;

    const expenses = dashboardMonthData?.expenses || [];
    const recentExpenses = [...expenses]
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
    const expenses = dashboardMonthData?.expenses || [];

    expenses.forEach(expense => {
        const cat = expense.category || 'other';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + (Number(expense.amount) || 0);
        totalSpent += Number(expense.amount) || 0;
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

function updateV2DashboardExtras() {
    const greetingText = document.getElementById('v2-greeting-text');
    if (greetingText) {
        const hour = new Date().getHours();
        const greeting = hour < 12 ? 'Good morning 👋' : hour < 18 ? 'Good afternoon 👋' : 'Good evening 👋';
        greetingText.textContent = greeting;
    }

    const monthPill = document.getElementById('v2-month-pill');
    if (monthPill) {
        const month = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        monthPill.textContent = month;
    }

    const nextIncomeLabel = document.getElementById('v2-next-income-label');
    const daysLeft = document.getElementById('v2-days-left');
    const user = window.firebaseAuth?.getCurrentUser?.() || null;
    const nextIncomeDate = user?.profile?.next_income_date || dashboardMonthData?.nextIncomeDate || null;

    if (nextIncomeLabel) {
        if (nextIncomeDate) {
            const date = new Date(nextIncomeDate);
            nextIncomeLabel.textContent = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } else {
            nextIncomeLabel.textContent = 'No date set';
        }
    }

    if (daysLeft) {
        if (nextIncomeDate) {
            const diff = Math.ceil((new Date(nextIncomeDate) - new Date()) / (1000 * 60 * 60 * 24));
            daysLeft.textContent = Math.max(diff, 0);
        } else {
            daysLeft.textContent = '0';
        }
    }

    const goalCard = document.getElementById('v2-goal-card');
    if (goalCard) {
        const goal = dashboardMonthData?.savingsGoal || 0;
        if (goal && Number(goal) > 0) {
            const saved = dashboardMonthData?.savings || 0;
            const progress = Math.min(100, Math.max(0, (saved / goal) * 100));
            goalCard.innerHTML = `
                <div class="v2-goal-header">
                    <span class="v2-goal-name">🎯 Savings goal</span>
                    <span class="v2-goal-value">${formatCurrency(saved)} / ${formatCurrency(goal)}</span>
                </div>
                <div class="goal-progress">
                    <div class="progress-bar"><div class="progress-fill savings-fill" style="width:${progress}%"></div></div>
                </div>
                <div class="v2-goal-meta">
                    <strong>${Math.round(progress)}%</strong>
                    <span>${formatCurrency(Math.max(0, goal - saved))} left</span>
                </div>
            `;
        } else {
            goalCard.innerHTML = `
                <div class="v2-empty-goal-wrap">
                    <p class="v2-empty-goal">What are you saving for?</p>
                    <small>Create your first savings goal.</small>
                </div>
            `;
        }
    }
}

// --- Initialize dashboard on page load ---
document.addEventListener('DOMContentLoaded', async () => {
    if (document.getElementById('dashboard-page')) {
        await updateDashboard();
    }
});


