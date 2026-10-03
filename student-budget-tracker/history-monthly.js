/**
 * Monthly History Module
 * Displays historical data across all months with switcher
 * Shows budget, income, expenses, and savings for each month
 */

/**
 * Initialize the monthly history page
 */
async function initializeMonthHistoryPage() {
  try {
    const user = window.firebaseAuth?.getCurrentUser?.();
    if (!user) {
      return;
    }

    // Load and display all months
    await displayMonthHistory(user.uid);

    // Setup event listeners
    setupMonthHistoryEventListeners();
  } catch (error) {
    console.error("Error initializing month history page:", error);
  }
}

/**
 * Fetch and display all months for the user
 */
async function displayMonthHistory(userId) {
  try {
    const container = document.getElementById("months-history-container");
    if (!container) {
      console.warn("Months history container not found");
      return;
    }

    // Show loading state
    container.innerHTML =
      '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading months...</div>';

    // Get all months
    const result = await window.monthlyBudget?.getAllMonths?.(userId);

    if (!result?.success) {
      container.innerHTML = '<div class="error">Failed to load months</div>';
      return;
    }

    if (!result.months || result.months.length === 0) {
      container.innerHTML =
        '<div class="empty-state"><p>No monthly data found. Start tracking to see history.</p></div>';
      return;
    }

    // Build month cards
    const monthsHTML = result.months
      .map((monthData) => createMonthCard(monthData))
      .join("");
    container.innerHTML = monthsHTML;

    // Attach event listeners to month cards
    container.querySelectorAll(".month-card").forEach((card) => {
      card.addEventListener("click", async (e) => {
        if (e.target.closest(".btn-view-details")) {
          const month = card.dataset.month;
          await showMonthDetails(month, userId);
        }
      });
    });
  } catch (error) {
    console.error("Error displaying month history:", error);
    const container = document.getElementById("months-history-container");
    if (container) {
      container.innerHTML = '<div class="error">Error loading history</div>';
    }
  }
}

/**
 * Create HTML card for a single month
 */
function createMonthCard(monthData) {
  const montDate = new Date(monthData.month + "-01");
  const monthName = montDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  });

  const savingsClass = monthData.savings >= 0 ? "positive" : "negative";

  return `
        <div class="month-card" data-month="${monthData.month}">
            <div class="month-card-header">
                <h3>${monthName}</h3>
                <span class="month-badge">${monthData.month}</span>
            </div>
            <div class="month-card-body">
                <div class="month-stat">
                    <div class="stat-label">Budget</div>
                    <div class="stat-value">${formatCurrency(monthData.budget)}</div>
                </div>
                <div class="month-stat">
                    <div class="stat-label">Income</div>
                    <div class="stat-value income">${formatCurrency(monthData.totalIncome)}</div>
                </div>
                <div class="month-stat">
                    <div class="stat-label">Expenses</div>
                    <div class="stat-value expense">${formatCurrency(monthData.totalExpenses)}</div>
                </div>
                <div class="month-stat">
                    <div class="stat-label">Savings</div>
                    <div class="stat-value ${savingsClass}">${formatCurrency(monthData.savings)}</div>
                </div>
            </div>
            <div class="month-card-footer">
                <span class="count-badge">
                    <i class="fas fa-money-bill"></i> ${monthData.incomeCount} income · 
                    <i class="fas fa-receipt"></i> ${monthData.expenseCount} expenses
                </span>
                <button class="btn btn-sm btn-view-details" title="View detailed breakdown">
                    View Details <i class="fas fa-arrow-right"></i>
                </button>
            </div>
        </div>
    `;
}

/**
 * Show detailed breakdown for a specific month
 */
async function showMonthDetails(month, userId) {
  try {
    const modal = document.getElementById("month-details-modal");
    if (!modal) {
      console.warn("Month details modal not found");
      return;
    }

    // Fetch month data
    const monthData = await window.monthlyBudget?.getMonthData?.(userId, month);

    if (!monthData?.success) {
      showToast("Failed to load month details", "error");
      return;
    }

    // Populate modal with data
    updateMonthDetailsModal(monthData);

    // Show modal
    modal.style.display = "flex";

    // Close button handler
    const closeBtn = modal.querySelector(".close-modal");
    if (closeBtn) {
      closeBtn.onclick = () => {
        modal.style.display = "none";
      };
    }

    // Close on outside click
    modal.onclick = (e) => {
      if (e.target === modal) {
        modal.style.display = "none";
      }
    };
  } catch (error) {
    console.error("Error showing month details:", error);
    showToast("Error loading month details", "error");
  }
}

/**
 * Update the month details modal with data
 */
function updateMonthDetailsModal(monthData) {
  const modal = document.getElementById("month-details-modal");
  if (!modal) return;

  const monthDate = new Date(monthData.month + "-01");
  const monthName = monthDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  });

  // Update header
  const header = modal.querySelector(".modal-header");
  if (header) {
    header.innerHTML = `<h2>${monthName}</h2>`;
  }

  // Update summary
  const summary = modal.querySelector(".month-details-summary");
  if (summary) {
    const savingsClass = monthData.savings >= 0 ? "positive" : "negative";
    const savingsSign = monthData.savings >= 0 ? "+" : "";

    summary.innerHTML = `
            <div class="detail-stat">
                <div class="detail-label">Budget</div>
                <div class="detail-value">${formatCurrency(monthData.budget)}</div>
            </div>
            <div class="detail-stat">
                <div class="detail-label">Total Income</div>
                <div class="detail-value income">${formatCurrency(monthData.totalIncome)}</div>
            </div>
            <div class="detail-stat">
                <div class="detail-label">Total Expenses</div>
                <div class="detail-value expense">${formatCurrency(monthData.totalExpenses)}</div>
            </div>
            <div class="detail-stat">
                <div class="detail-label">Savings</div>
                <div class="detail-value ${savingsClass}">${savingsSign}${formatCurrency(monthData.savings)}</div>
            </div>
        `;
  }

  // Update income list
  const incomeList = modal.querySelector(".month-income-list");
  if (incomeList) {
    if (monthData.income && monthData.income.length > 0) {
      incomeList.innerHTML = `
                <h3>Income (${monthData.income.length})</h3>
                ${monthData.income
                  .map(
                    (inc) => `
                    <div class="detail-entry income-entry">
                        <div class="entry-header">
                            <span class="entry-title">${inc.source}</span>
                            <span class="entry-date">${new Date(inc.date).toLocaleDateString("en-US")}</span>
                        </div>
                        <div class="entry-amount income">${formatCurrency(inc.amount)}</div>
                    </div>
                `,
                  )
                  .join("")}
            `;
    } else {
      incomeList.innerHTML =
        '<p class="empty-note">No income recorded for this month</p>';
    }
  }

  // Update expenses  list
  const expensesList = modal.querySelector(".month-expenses-list");
  if (expensesList) {
    if (monthData.expenses && monthData.expenses.length > 0) {
      expensesList.innerHTML = `
                <h3>Expenses (${monthData.expenses.length})</h3>
                ${monthData.expenses
                  .map((exp) => {
                    const category = window.getExpenseCategoryMeta?.(
                      exp.category,
                    ) ||
                      CONFIG.CATEGORIES?.[exp.category] || {
                        name: exp.category,
                        icon: "fas fa-tag",
                        color: "#ccc",
                      };
                    return `
                        <div class="detail-entry expense-entry">
                            <div class="entry-icon" style="background-color: ${category.color}">
                                <i class="${category.icon}"></i>
                            </div>
                            <div class="entry-details">
                                <div class="entry-title">${exp.reason || exp.category}</div>
                                <div class="entry-category">${category.name}</div>
                                <div class="entry-date">${new Date(exp.date).toLocaleDateString("en-US")}</div>
                            </div>
                            <div class="entry-amount expense">${formatCurrency(exp.amount)}</div>
                        </div>
                    `;
                  })
                  .join("")}
            `;
    } else {
      expensesList.innerHTML =
        '<p class="empty-note">No expenses recorded for this month</p>';
    }
  }

  const savingsList = modal.querySelector(".month-savings-list");
  if (savingsList) {
    const savingsTransactions = Array.isArray(monthData.savingsTransactions)
      ? [...monthData.savingsTransactions].sort((a, b) =>
          String(b.transaction_date).localeCompare(String(a.transaction_date)),
        )
      : [];

    if (savingsTransactions.length) {
      savingsList.innerHTML = `
                <h3>Savings movements (${savingsTransactions.length})</h3>
                ${savingsTransactions
                  .map((transaction) => {
                    const isDeposit = transaction.type === "deposit";
                    const movementName = isDeposit
                      ? "Savings Deposit"
                      : "Savings Withdrawal";
                    const dateValue = String(
                      transaction.transaction_date || "",
                    ).slice(0, 10);
                    const transactionDate = new Date(`${dateValue}T12:00:00`);
                    const formattedDate = Number.isNaN(
                      transactionDate.getTime(),
                    )
                      ? ""
                      : transactionDate.toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        });
                    const note = transaction.note
                      ? `<div class="entry-category">${escapeMonthlyHistoryText(transaction.note)}</div>`
                      : "";

                    return `
                        <div class="detail-entry ${isDeposit ? "expense-entry" : "income-entry"} savings-detail-entry">
                            <div class="entry-icon savings-transaction-icon"><i class="fas fa-piggy-bank"></i></div>
                            <div class="entry-details">
                                <div class="entry-title">${movementName}</div>
                                <div class="entry-category">${escapeMonthlyHistoryText(transaction.goalName || "Savings goal")}</div>
                                ${note}
                                <div class="entry-date">${formattedDate}</div>
                            </div>
                            <div class="entry-amount ${isDeposit ? "expense" : "income"}">${isDeposit ? "−" : "+"}${formatCurrency(transaction.amount)}</div>
                        </div>
                    `;
                  })
                  .join("")}
            `;
    } else {
      savingsList.innerHTML =
        '<h3>Savings movements</h3><p class="empty-note">No savings movements recorded for this month</p>';
    }
  }
}

function escapeMonthlyHistoryText(value) {
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

/**
 * Setup event listeners for month history page
 */
function setupMonthHistoryEventListeners() {
  // Add any additional event listeners here as needed
}

/**
 * Initialize on page load
 */
document.addEventListener("DOMContentLoaded", () => {
  const historyPage = document.getElementById("history-page");
  if (historyPage) {
    // Check if user is authenticated
    const checkAuth = setInterval(() => {
      const user = window.firebaseAuth?.getCurrentUser?.();
      if (user) {
        clearInterval(checkAuth);
        initializeMonthHistoryPage();
      }
    }, 100);

    // Clear interval after 5 seconds
    setTimeout(() => clearInterval(checkAuth), 5000);
  }
});

/**
 * Refresh history when called
 */
window.refreshMonthHistory = async function () {
  const user = window.firebaseAuth?.getCurrentUser?.();
  if (user) {
    await displayMonthHistory(user.uid);
    showToast("History refreshed", "success");
  }
};
