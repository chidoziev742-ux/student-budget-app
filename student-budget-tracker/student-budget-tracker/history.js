/**
 * History Module
 * Handles expense history and filtering
 */

/**
 * Update the history page
 */
// function updateHistoryPage() {
//     // Set up filter event listeners
//     const monthFilter = document.getElementById('filter-month');
//     const categoryFilter = document.getElementById('filter-category');
    
//     if (monthFilter) {
//         monthFilter.addEventListener('change', updateHistoryList);
//         populateMonthFilter();
//     }
    
//     if (categoryFilter) {
//         categoryFilter.addEventListener('change', updateHistoryList);
//     }
    
//     // Update the history list
//     updateHistoryList();
// }
async function updateHistoryPage() {
    const user = window.firebaseAuth?.getCurrentUser?.();

    if (!user) {
        console.warn('No authenticated user for history');
        return;
    }

    try {
        // Get all months belonging to this user
        const monthsResult = await window.monthlyBudget?.getUserMonthsList?.(user.uid);

        if (!monthsResult?.success) {
            console.error('Failed to load user months');
            return;
        }

        const allExpenses = [];

        // Load expenses from every month
        for (const month of monthsResult.months || []) {
            const monthResult = await window.monthlyBudget?.getMonthData?.(
                user.uid,
                month
            );

            if (monthResult?.success && Array.isArray(monthResult.expenses)) {
                allExpenses.push(...monthResult.expenses);
            }
        }

        // Keep appState synchronized with the monthly source of truth.
        appState.expenses = allExpenses;

        console.log(
            `[History] Loaded ${allExpenses.length} expenses from monthly system`
        );

        // Set up filter event listeners
        const monthFilter = document.getElementById('filter-month');
        const categoryFilter = document.getElementById('filter-category');

        if (monthFilter) {
            // Prevent duplicate event listeners
            monthFilter.onchange = updateHistoryList;
        }

        if (categoryFilter) {
            categoryFilter.onchange = updateHistoryList;
        }

        // Populate filters using freshly loaded data
        populateMonthFilter();

        // Display expenses
        updateHistoryList();

    } catch (error) {
        console.error('Error loading history:', error);

        const container = document.getElementById('expenses-list');

        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Unable to load your expense history.</p>
                    <button class="btn btn-primary" onclick="updateHistoryPage()">
                        Try Again
                    </button>
                </div>
            `;
        }
    }
}

/**
 * Populate month filter with unique months from expenses
 */
function populateMonthFilter() {
    const monthFilter = document.getElementById('filter-month');
    if (!monthFilter) return;
    
    // Clear existing options except the first one
    while (monthFilter.options.length > 1) {
        monthFilter.remove(1);
    }
    
    // Get unique months from expenses
    const months = new Set();
    
    appState.expenses.forEach(expense => {
        const date = new Date(expense.date);
        const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const displayName = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
        
        months.add({ value: monthYear, display: displayName });
    });
    
    // Sort months descending (most recent first)
    const sortedMonths = Array.from(months).sort((a, b) => b.value.localeCompare(a.value));
    
    // Add month options
    sortedMonths.forEach(month => {
        const option = document.createElement('option');
        option.value = month.value;
        option.textContent = month.display;
        monthFilter.appendChild(option);
    });
}

/**
 * Update history list based on filters
 */
function updateHistoryList() {
    const container = document.getElementById('expenses-list');
    if (!container) return;
    
    // Get filter values
    const monthFilter = document.getElementById('filter-month');
    const categoryFilter = document.getElementById('filter-category');
    
    const selectedMonth = monthFilter ? monthFilter.value : 'all';
    const selectedCategory = categoryFilter ? categoryFilter.value : 'all';
    
    // Filter expenses
    let filteredExpenses = [...appState.expenses];
    
    if (selectedMonth !== 'all') {
        filteredExpenses = filteredExpenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            const expenseMonth = `${expenseDate.getFullYear()}-${String(expenseDate.getMonth() + 1).padStart(2, '0')}`;
            return expenseMonth === selectedMonth;
        });
    }
    
    if (selectedCategory !== 'all') {
        filteredExpenses = filteredExpenses.filter(expense => expense.category === selectedCategory);
    }
    
    // Sort by date (newest first)
    filteredExpenses.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Update summary stats
    updateHistorySummary(filteredExpenses);
    
    // Display expenses
    if (filteredExpenses.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-receipt"></i>
                <p>No expenses found for the selected filters</p>
                <a href="#expense" class="btn btn-primary">Add Your First Expense</a>
            </div>
        `;
        return;
    }
    
    let html = '';
    filteredExpenses.forEach(expense => {
        const category = CONFIG.CATEGORIES[expense.category] || CONFIG.CATEGORIES.other;
        const date = new Date(expense.date);
        const formattedDate = date.toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        
        html += `
            <div class="expense-item">
                <div class="expense-category-icon ${expense.category}" style="background-color: ${category.color}">
                    <i class="${category.icon}"></i>
                </div>
                <div class="expense-details">
                    <div class="expense-reason">${expense.reason || 'No description'}</div>
                    <div class="expense-meta">
                        <div class="expense-date">
                            <i class="fas fa-calendar"></i>
                            ${formattedDate}
                        </div>
                        <div class="expense-category">
                            <i class="fas fa-tag"></i>
                            ${category.name}
                        </div>
                    </div>
                </div>
                <div class="expense-amount">${formatCurrency(expense.amount)}</div>
                <div class="expense-actions">
                    <button class="action-btn delete" onclick="window.deleteExpenseFromUI('${expense.id}')" title="Delete expense">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

/**
 * Update history summary statistics
 * @param {Array} expenses - Array of filtered expenses
 */
function updateHistorySummary(expenses) {
    // Total for filtered expenses
    const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const count = expenses.length;
    const average = count > 0 ? total / count : 0;
    
    // Update DOM elements
    const monthlyTotalElement = document.getElementById('monthly-total');
    const expensesCountElement = document.getElementById('expenses-count');
    const averageExpenseElement = document.getElementById('average-expense');
    
    if (monthlyTotalElement) {
        monthlyTotalElement.textContent = formatCurrency(total);
    }
    
    if (expensesCountElement) {
        expensesCountElement.textContent = count;
    }
    
    if (averageExpenseElement) {
        averageExpenseElement.textContent = formatCurrency(average);
    }
}