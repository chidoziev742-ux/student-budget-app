/**
 * History Module
 * Handles expense history and filtering
 */

let historySavingsTransactions = [];
let historyAvailableMonths = [];

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
    console.warn("No authenticated user for history");
    return;
  }

  try {
    // Get all months belonging to this user
    const monthsResult = await window.monthlyBudget?.getUserMonthsList?.(
      user.uid,
    );

    if (!monthsResult?.success) {
      console.error("Failed to load user months");
      return;
    }
    historyAvailableMonths = monthsResult.months || [];

    const allExpenses = [];

    // Load expenses from every month
    for (const month of monthsResult.months || []) {
      const monthResult = await window.monthlyBudget?.getMonthData?.(
        user.uid,
        month,
      );

      if (monthResult?.success && Array.isArray(monthResult.expenses)) {
        allExpenses.push(...monthResult.expenses);
      }
    }

    // Keep appState synchronized with the monthly source of truth.
    appState.expenses = allExpenses;

    const savingsResult = await window.monthlyBudget?.getSavingsTransactions?.(
      user.uid,
    );
    if (!savingsResult?.success) {
      throw new Error(savingsResult?.error || "Failed to load savings history");
    }
    historySavingsTransactions = savingsResult.transactions || [];

    window.debugLog?.(
      `[History] Loaded ${allExpenses.length} expenses and ${historySavingsTransactions.length} savings movements`,
    );

    // Set up filter event listeners
    const monthFilter = document.getElementById("filter-month");
    const categoryFilter = document.getElementById("filter-category");

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
    console.error("Error loading history:", error);

    const container = document.getElementById("expenses-list");

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
  const monthFilter = document.getElementById("filter-month");
  if (!monthFilter) return;

  // Clear existing options except the first one
  while (monthFilter.options.length > 1) {
    monthFilter.remove(1);
  }

  const months = new Map();
  const addMonth = (dateValue) => {
    const monthYear = String(dateValue || "").slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(monthYear) || months.has(monthYear)) return;
    const [year, month] = monthYear.split("-").map(Number);
    const display = new Date(year, month - 1, 1).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    });
    months.set(monthYear, display);
  };

  historyAvailableMonths.forEach((month) => {
    if (!/^\d{4}-\d{2}$/.test(month)) return;
    const [year, monthNumber] = month.split("-").map(Number);
    months.set(
      month,
      new Date(year, monthNumber - 1, 1).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      }),
    );
  });
  appState.expenses.forEach((expense) => addMonth(expense.date));
  historySavingsTransactions.forEach((transaction) =>
    addMonth(transaction.transaction_date),
  );

  const sortedMonths = Array.from(months.entries())
    .map(([value, display]) => ({ value, display }))
    .sort((a, b) => b.value.localeCompare(a.value));

  // Add month options
  sortedMonths.forEach((month) => {
    const option = document.createElement("option");
    option.value = month.value;
    option.textContent = month.display;
    monthFilter.appendChild(option);
  });
}

/**
 * Update history list based on filters
 */
function updateHistoryList() {
  const container = document.getElementById("expenses-list");
  if (!container) return;

  // Get filter values
  const monthFilter = document.getElementById("filter-month");
  const categoryFilter = document.getElementById("filter-category");

  const selectedMonth = monthFilter ? monthFilter.value : "all";
  const selectedCategory = categoryFilter ? categoryFilter.value : "all";

  // Filter expenses
  let filteredExpenses = [...appState.expenses];
  let filteredSavings = [...historySavingsTransactions];

  if (selectedMonth !== "all") {
    filteredExpenses = filteredExpenses.filter((expense) => {
      return String(expense.date || "").slice(0, 7) === selectedMonth;
    });
    filteredSavings = filteredSavings.filter((transaction) => {
      return (
        String(transaction.transaction_date || "").slice(0, 7) === selectedMonth
      );
    });
  }

  if (selectedCategory !== "all") {
    filteredExpenses = filteredExpenses.filter((expense) => {
      const categoryKey =
        window.getExpenseCategoryKey?.(expense.category) || "other";
      return categoryKey === selectedCategory;
    });
    filteredSavings = [];
  }

  // Sort by date (newest first)
  filteredExpenses.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Update summary stats
  updateHistorySummary(filteredExpenses, filteredSavings);

  if (filteredExpenses.length === 0 && filteredSavings.length === 0) {
    container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-receipt"></i>
                <p>No transactions found for the selected filters</p>
                <a href="#expense" class="btn btn-primary">Add Your First Expense</a>
            </div>
        `;
    return;
  }

  const historyItems = [
    ...filteredExpenses.map((expense) => ({
      type: "expense",
      date: expense.date,
      record: expense,
    })),
    ...filteredSavings.map((transaction) => ({
      type: "savings",
      date: transaction.transaction_date,
      record: transaction,
    })),
  ].sort((a, b) => String(b.date).localeCompare(String(a.date)));

  container.innerHTML = historyItems
    .map((item) => {
      if (item.type === "savings") {
        const transaction = item.record;
        const isDeposit = transaction.type === "deposit";
        const formattedDate = formatHistoryDate(transaction.transaction_date);
        const note = transaction.note
          ? `<div class="history-savings-note">${escapeHistoryText(transaction.note)}</div>`
          : "";
        return `
                <div class="expense-item savings-history-item">
                    <div class="expense-category-icon savings-transaction-icon"><i class="fas fa-piggy-bank" aria-hidden="true"></i></div>
                    <div class="expense-details">
                        <div class="expense-reason">SAVINGS ${isDeposit ? "DEPOSIT" : "WITHDRAWAL"}</div>
                        <div class="expense-meta savings-history-meta">
                            <span>${escapeHistoryText(transaction.goalName || "Savings goal")}</span>
                            <span class="expense-date"><i class="fas fa-calendar"></i> ${formattedDate}</span>
                        </div>
                        ${note}
                    </div>
                    <div class="expense-amount ${isDeposit ? "savings-deposit-amount" : "savings-withdrawal-amount"}">${isDeposit ? "−" : "+"}${formatCurrency(transaction.amount)}</div>
                </div>`;
      }

      const expense = item.record;
      const categoryKey =
        window.getExpenseCategoryKey?.(expense.category) || "other";
      const category =
        window.getExpenseCategoryMeta?.(categoryKey) ||
        CONFIG.CATEGORIES[expense.category] ||
        CONFIG.CATEGORIES.other;
      const formattedDate = new Date(expense.date).toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      return `
            <div class="expense-item">
                <div class="expense-category-icon ${categoryKey}" style="background-color: ${category.color}">
                    <i class="${category.icon}"></i>
                </div>
                <div class="expense-details">
                    <div class="expense-reason">${expense.reason || "No description"}</div>
                    <div class="expense-meta">
                        <div class="expense-date"><i class="fas fa-calendar"></i> ${formattedDate}</div>
                        <div class="expense-category"><i class="fas fa-tag"></i> ${category.name}</div>
                    </div>
                </div>
                <div class="expense-amount">${formatCurrency(expense.amount)}</div>
                <div class="expense-actions">
                    <button class="action-btn delete" onclick="window.deleteExpenseFromUI('${expense.id}')" title="Delete expense">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>`;
    })
    .join("");
}

function escapeHistoryText(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character],
  );
}

function formatHistoryDate(dateValue) {
  const date = new Date(`${String(dateValue || "").slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Update history summary statistics
 * @param {Array} expenses - Array of filtered expenses
 */
function updateHistorySummary(expenses, savingsTransactions = []) {
  // Total for filtered expenses
  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const count = expenses.length;
  const average = count > 0 ? total / count : 0;

  // Update DOM elements
  const monthlyTotalElement = document.getElementById("monthly-total");
  const expensesCountElement = document.getElementById("expenses-count");
  const averageExpenseElement = document.getElementById("average-expense");

  if (monthlyTotalElement) {
    monthlyTotalElement.textContent = formatCurrency(total);
  }

  if (expensesCountElement) {
    expensesCountElement.textContent = count;
  }

  if (averageExpenseElement) {
    averageExpenseElement.textContent = formatCurrency(average);
  }

  const deposits = savingsTransactions
    .filter((transaction) => transaction.type === "deposit")
    .reduce((sum, transaction) => sum + (Number(transaction.amount) || 0), 0);
  const withdrawals = savingsTransactions
    .filter((transaction) => transaction.type === "withdrawal")
    .reduce((sum, transaction) => sum + (Number(transaction.amount) || 0), 0);
  const depositElement = document.getElementById("history-savings-deposits");
  const withdrawalElement = document.getElementById(
    "history-savings-withdrawals",
  );
  if (depositElement) depositElement.textContent = formatCurrency(deposits);
  if (withdrawalElement)
    withdrawalElement.textContent = formatCurrency(withdrawals);
}
