let dashboardMonthData = null;

// --- Calculation functions ---
function calculateTotalExpenses(expenses) {
    return (expenses || []).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
}

function calculateRemainingBalance(totalIncome, expenses) {
    return (totalIncome || 0) - calculateTotalExpenses(expenses);
}

async function loadDashboardMonthData() {
    window.debugLog?.('[DASHBOARD] loadDashboardMonthData called');
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
        window.debugLog?.('[DASHBOARD] getMonthData result:', result);
        dashboardMonthData = result?.success ? result : fallbackData;
        const onboardingResult = await window.firebaseAuth?.getOnboardingStatus?.(user.uid);
        const savedDailySpending = onboardingResult?.onboarding?.safe_daily_spending;
        if (savedDailySpending != null) {
            dashboardMonthData.safeDailySpending = Number(savedDailySpending) || 0;
        }
        window.debugLog?.('[DASHBOARD] dashboardMonthData:', dashboardMonthData);
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

function getDaysUntilNextIncome(nextIncomeDate, incomeFrequency) {
    const today = new Date();
    const nextIncome = nextIncomeDate ? new Date(nextIncomeDate) : null;

    if (nextIncome && !Number.isNaN(nextIncome.getTime()) && nextIncome > today) {
        return Math.max(1, Math.ceil((nextIncome - today) / (1000 * 60 * 60 * 24)));
    }

    const fallbackDays = {
        weekly: 7,
        biweekly: 14,
        monthly: 30,
        semester: 120,
        irregular: 30,
        yearly: 365
    };

    const frequency = String(incomeFrequency || '').toLowerCase();
    return fallbackDays[frequency] || 30;
}

function getTodayExpensesTotal(expenses) {
    if (!Array.isArray(expenses)) return 0;

    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(startOfToday.getTime() + (24 * 60 * 60 * 1000));

    return expenses.reduce((sum, expense) => {
        if (!expense || !expense.date) return sum;

        const expenseDate = new Date(expense.date);
        if (Number.isNaN(expenseDate.getTime())) return sum;
        if (expenseDate >= startOfToday && expenseDate < endOfToday) {
            return sum + (Number(expense.amount) || 0);
        }

        return sum;
    }, 0);
}

function calculateSafeToSpendToday(availableBalance, safeDailyAmount, todayExpensesTotal, nextIncomeDate, incomeFrequency) {
    const balance = Number(availableBalance) || 0;
    if (balance <= 0) return 0;

    let plannedDaily = Number(safeDailyAmount) || 0;
    if (plannedDaily <= 0) {
        const daysUntilNextIncome = getDaysUntilNextIncome(nextIncomeDate, incomeFrequency);
        plannedDaily = balance / Math.max(1, daysUntilNextIncome);
    }

    let safeSpend = Math.min(plannedDaily, balance);
    const spentToday = Number(todayExpensesTotal) || 0;

    if (spentToday > 0) {
        safeSpend = Math.max(0, safeSpend - spentToday);
    }

    return Math.min(Math.max(safeSpend, 0), balance);
}

function calculateSafeToSpendStatus(availableBalance, safeDailyAmount, todayExpensesTotal, nextIncomeDate, incomeFrequency) {
    const balance = Number(availableBalance) || 0;
    let plannedDaily = Number(safeDailyAmount) || 0;
    if (plannedDaily <= 0) {
        const daysUntilNextIncome = getDaysUntilNextIncome(nextIncomeDate, incomeFrequency);
        plannedDaily = balance / Math.max(1, daysUntilNextIncome);
    }

    const spentToday = Number(todayExpensesTotal) || 0;
    const difference = plannedDaily - spentToday;

    return {
        amount: difference >= 0 ? Math.min(difference, Math.max(balance, 0)) : Math.abs(difference),
        state: difference > 0 ? 'on-track' : difference === 0 ? 'limit-reached' : 'over-limit'
    };
}

window.getDaysUntilNextIncome = getDaysUntilNextIncome;
window.getTodayExpensesTotal = getTodayExpensesTotal;
window.calculateSafeToSpendToday = calculateSafeToSpendToday;
window.calculateSafeToSpendStatus = calculateSafeToSpendStatus;

// --- Summary cards ---
function updateSummaryCards() {
    window.debugLog?.('[DASHBOARD] updateSummaryCards called, data:', dashboardMonthData);
    const totalBudget = dashboardMonthData?.budget || 0;
    const totalIncome = dashboardMonthData?.totalIncome || 0;
    const expenses = dashboardMonthData?.expenses || [];
    const totalSpent = calculateTotalExpenses(expenses);
    const remainingBalance = calculateRemainingBalance(totalIncome, expenses);
    const totalSavings = dashboardMonthData?.savings || 0;

    const totalBudgetEl = document.getElementById('total-budget');
    const availableBalanceEl = document.getElementById('v2-available-balance');
    const totalSpentEl = document.getElementById('total-spent');
    const totalSavingsEl = document.getElementById('total-savings');

    if (totalBudgetEl) totalBudgetEl.textContent = formatCurrency(totalBudget);
    if (availableBalanceEl) {
        availableBalanceEl.textContent = formatCurrency(remainingBalance);
        availableBalanceEl.setAttribute('data-actual', formatCurrency(remainingBalance));
    }
    if (totalSpentEl) totalSpentEl.textContent = formatCurrency(totalSpent);
    if (totalSavingsEl) {
        totalSavingsEl.textContent = formatCurrency(totalSavings);
        if (totalSavings < 0) {
            totalSavingsEl.style.color = '#f72585';
        } else if (totalSavings > 0) {
            totalSavingsEl.style.color = '#4cc9f0';
        } else {
            totalSavingsEl.style.color = '';
        }
    }
    
    const safeSpendEl = document.getElementById('v2-safe-spend');
    if (safeSpendEl) {
        const currentUser = window.firebaseAuth?.getCurrentUser?.() || window.currentUser || null;
        const profile = currentUser?.profile || {};
        const nextIncomeDate = profile.next_income_date || dashboardMonthData?.nextIncomeDate || null;
        const incomeFrequency = profile.income_frequency || dashboardMonthData?.incomeFrequency || null;
        const safeDailyAmount = Number(profile.safe_daily_spending ?? dashboardMonthData?.safeDailySpending ?? 0) || 0;
        const todayExpensesTotal = getTodayExpensesTotal(expenses);

        const safeStatus = calculateSafeToSpendStatus(
            remainingBalance,
            safeDailyAmount,
            todayExpensesTotal,
            nextIncomeDate,
            incomeFrequency
        );

        safeSpendEl.textContent = formatCurrency(safeStatus.amount);
        const statusEl = safeSpendEl.closest('.safe-spend-card')?.querySelector('.safe-spend-status');
        if (statusEl) {
            const checkEl = statusEl.querySelector('.safe-spend-check');
            const textEl = statusEl.querySelector('span:last-child');
            statusEl.classList.toggle('is-warning', safeStatus.state === 'over-limit');
            statusEl.classList.toggle('is-reached', safeStatus.state === 'limit-reached');
            if (checkEl) checkEl.textContent = safeStatus.state === 'over-limit' ? '!' : safeStatus.state === 'limit-reached' ? '=' : '✓';
            if (textEl) textEl.textContent = safeStatus.state === 'over-limit'
                ? 'Over your limit'
                : safeStatus.state === 'limit-reached' ? 'Limit reached' : "You're on track";
        }
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
            <i class="fas fa-receipt"></i>
            <p>No expenses recorded yet</p>
            <a href="#expense" class="btn btn-primary">Add Your First Expense</a>
        </div>`;
        return;
    }

    container.innerHTML = recentExpenses.map(expense => {
        const categoryKey = window.getExpenseCategoryKey?.(expense.category) || 'other';
        const category = window.getExpenseCategoryMeta?.(categoryKey) || CONFIG.CATEGORIES?.[expense.category] || { name: expense.category || 'Other', color: '#ccc', icon: 'fas fa-tag' };
        const date = new Date(expense.date);
        const now = new Date();
        let dateStr;
        
        if (date.toDateString() === now.toDateString()) {
            dateStr = `Today, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
        } else {
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            if (date.toDateString() === yesterday.toDateString()) {
                dateStr = `Yesterday, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
            } else {
                dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
            }
        }
        
        const iconClass = `${categoryKey}-bg`;
        
        return `
            <div class="transaction-item">
                <div class="transaction-icon ${iconClass}">
                    <i class="${category.icon}"></i>
                </div>
                <div class="transaction-details">
                    <div class="transaction-title">${expense.reason || category.name}</div>
                    <div class="transaction-meta">${dateStr}</div>
                </div>
                <div class="transaction-amount expense">-${formatCurrency(expense.amount)}</div>
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
        // Use getExpenseCategoryKey to normalize the category
        const cat = window.getExpenseCategoryKey?.(expense.category) || expense.category || 'other';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + (Number(expense.amount) || 0);
        totalSpent += Number(expense.amount) || 0;
    });

    if (totalSpent === 0) {
        container.innerHTML = `<div class="empty-state"><p>No spending data to display</p></div>`;
        return;
    }

    const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
    
    let start = 0;
    const donutSegments = sortedCategories.map(([catId, amt]) => {
        const category = CONFIG.CATEGORIES?.[catId] || { name: catId, color: '#8b5cf6' };
        const percentage = (amt / totalSpent) * 100;
        const end = start + percentage;
        const segment = `${category.color} ${start}% ${end}%`;
        start = end;
        return segment;
    }).join(', ');

    container.innerHTML = `
        <div class="spending-chart-shell">
            <div class="spending-chart-donut" style="background: conic-gradient(${donutSegments});">
                <div class="spending-chart-inner">
                    <strong>${formatCurrency(totalSpent)}</strong>
                    <span>Spent</span>
                </div>
            </div>
            <div class="spending-chart-legend">
                ${sortedCategories.map(([catId, amt]) => {
                    const category = CONFIG.CATEGORIES?.[catId] || { name: catId, color: '#8b5cf6' };
                    const percentage = ((amt / totalSpent) * 100).toFixed(1);
                    return `
                        <div class="legend-item">
                            <span class="legend-swatch" style="background:${category.color}"></span>
                            <span class="legend-name">${category.name}</span>
                            <span class="legend-value">${percentage}%</span>
                        </div>`;
                }).join('')}
            </div>
        </div>
        <div class="spending-breakdown-list">
            ${sortedCategories.map(([catId, amt]) => {
                const category = CONFIG.CATEGORIES?.[catId] || { name: catId, color: '#8b5cf6', icon: 'fas fa-tag' };
                const percentage = ((amt / totalSpent) * 100).toFixed(1);
                return `
                    <div class="category-item">
                        <div class="category-info">
                            <div class="category-name">
                                <span class="category-dot" style="background-color:${category.color}"></span>
                                ${category.name}
                            </div>
                            <div class="category-amount">${formatCurrency(amt)}</div>
                        </div>
                        <div class="category-progress">
                            <div class="progress-bar"><div class="progress-fill" style="width:${percentage}%;background-color:${category.color}"></div></div>
                            <div class="category-percentage">${percentage}%</div>
                        </div>
                    </div>`;
            }).join('')}
        </div>`;
}

function updateV2DashboardExtras() {
    const greetingText = document.getElementById('v2-greeting-text');
    if (greetingText) {
        const hour = new Date().getHours();
        const user = window.firebaseAuth?.getCurrentUser?.() || null;
        const profile = window.firebaseAuth?.getUserProfile?.() || {};
        const userName = profile?.name || user?.displayName || user?.email?.split('@')[0] || 'Student';
        const greeting = hour < 12 ? `Good morning, ${userName} 👋` : hour < 18 ? `Good afternoon, ${userName} 👋` : `Good evening, ${userName} 👋`;
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
    
    // Initialize balance toggle
    initBalanceToggle();
    
    // Initialize sidebar navigation
    initSidebarNav();
    
    // Initialize sidebar logout
    initSidebarLogout();
    
    // Update sidebar user info
    updateSidebarUserInfo();
    
    // Initialize mobile menu toggle
    initMobileMenu();
});

// --- Mobile menu toggle ---
function initMobileMenu() {
    const menuBtn = document.getElementById('mobile-menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    if (menuBtn && sidebar) {
        menuBtn.addEventListener('click', () => {
            sidebar.classList.toggle('mobile-open');
            if (overlay) {
                overlay.classList.toggle('active');
            }
        });
        
        // Close sidebar when clicking overlay
        if (overlay) {
            overlay.addEventListener('click', () => {
                sidebar.classList.remove('mobile-open');
                overlay.classList.remove('active');
            });
        }
        
        // Close sidebar when clicking a nav link (mobile)
        const sidebarLinks = sidebar.querySelectorAll('.sidebar-nav-link');
        sidebarLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('mobile-open');
                    if (overlay) {
                        overlay.classList.remove('active');
                    }
                }
            });
        });
    }
}

// --- Balance toggle functionality ---
function initBalanceToggle() {
    const toggleBtn = document.getElementById('balance-toggle');
    const balanceAmount = document.getElementById('v2-available-balance');
    
    if (toggleBtn && balanceAmount) {
        let isHidden = false;
        
        toggleBtn.addEventListener('click', () => {
            isHidden = !isHidden;
            if (isHidden) {
                balanceAmount.textContent = '••••••';
                balanceAmount.style.color = 'rgba(255, 255, 255, 0.5)';
            } else {
                const actual = balanceAmount.getAttribute('data-actual') || '₦0';
                balanceAmount.textContent = actual;
                balanceAmount.style.color = '';
            }
            const icon = toggleBtn.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-eye');
                icon.classList.toggle('fa-eye-slash');
            }
        });
    }
}

// --- Sidebar navigation ---
function initSidebarNav() {
    const sidebarLinks = document.querySelectorAll('.sidebar-nav-link');
    
    sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Update active state
            sidebarLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            // Get the page to show
            const page = link.getAttribute('data-page');
            if (page && window.showPage) {
                window.showPage(page);
            }
        });
    });
}

// --- Sidebar logout ---
function initSidebarLogout() {
    const logoutBtn = document.getElementById('sidebar-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (window.handleLogout) {
                window.handleLogout();
            } else if (window.firebaseAuth?.signOutUser) {
                window.firebaseAuth.signOutUser();
            }
        });
    }
}

// --- Update sidebar user info ---
function updateSidebarUserInfo() {
    const user = window.firebaseAuth?.getCurrentUser?.();
    const userNameEl = document.getElementById('sidebar-user-name');
    const avatarEl = document.getElementById('sidebar-avatar');
    
    if (user) {
        const profile = window.firebaseAuth?.getUserProfile?.() || {};
        const displayName = profile?.name || user?.displayName || user?.email?.split('@')[0] || 'Student';
        
        if (userNameEl) {
            userNameEl.textContent = displayName;
        }
        
        if (avatarEl && profile?.photoURL) {
            avatarEl.innerHTML = `<img src="${profile.photoURL}" alt="${displayName}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
        }
    }
}




// Expose functions to window for app.js
window.updateDashboard = updateDashboard;
window.loadDashboardMonthData = loadDashboardMonthData;
