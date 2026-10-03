/**
 * Budget Module
 * Handles budget page functionality
 */

// --- Initialize budget page ---
async function updateBudgetPage() {
  const monthSelector = document.getElementById("month-selector");
  const user = window.firebaseAuth?.getCurrentUser?.();

  if (user && monthSelector && window.monthlyBudget?.getCurrentMonth) {
    await initializeMonthlyBudgetView();
    return;
  }

  // Fallback to old local state when no authenticated user is available
  if (appState.budget) {
    document.getElementById("monthly-budget").value =
      appState.budget.amount || "";
    document.getElementById("savings-goal").value = appState.savingsGoal || "";

    if (appState.budget.category) {
      document.getElementById("budget-category").value =
        appState.budget.category;
    }
  }

  updateBudgetStatus();
}

// --- Handle budget form submission ---
function handleBudgetSubmit(e) {
  e.preventDefault();

  const amountInput = document.getElementById("monthly-budget");
  const savingsGoalInput = document.getElementById("savings-goal");
  const categorySelect = document.getElementById("budget-category");

  const amount = parseFloat(amountInput.value);
  const savingsGoal = savingsGoalInput.value
    ? parseFloat(savingsGoalInput.value)
    : 0;
  const category = categorySelect.value || null;

  // Validation
  if (!amount || amount <= 0) {
    showToast("Please enter a valid budget amount", "error");
    amountInput.focus();
    return;
  }

  // Update app state
  appState.budget = {
    amount: amount,
    category: category,
    setDate: new Date().toISOString(),
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

  showToast("Budget saved successfully!", "success");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// --- Update budget status display ---
function updateBudgetStatus(monthData) {
  const currentBudget = monthData?.budget ?? (appState.budget?.amount || 0);
  const currentSavingsGoal = monthData?.savingsGoal ?? 0;

  document.getElementById("current-monthly-budget").textContent =
    formatCurrency(currentBudget);
  document.getElementById("current-savings-goal").textContent =
    formatCurrency(currentSavingsGoal);

  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysRemaining = lastDay.getDate() - now.getDate();
  document.getElementById("days-remaining").textContent = daysRemaining;

  const totalSpent = monthData?.totalExpenses ?? 0;
  const budgetUsedPercent =
    currentBudget > 0 ? (totalSpent / currentBudget) * 100 : 0;

  const progressFill = document.getElementById("budget-progress-fill");
  const budgetUsedPercentElement = document.getElementById(
    "budget-used-percent",
  );

  if (progressFill) {
    progressFill.style.width = `${Math.min(budgetUsedPercent, 100)}%`;

    if (budgetUsedPercent > 100)
      progressFill.style.background =
        "linear-gradient(to right, #f72585, #f8961e)";
    else if (budgetUsedPercent > 80)
      progressFill.style.background =
        "linear-gradient(to right, #f8961e, #4cc9f0)";
    else
      progressFill.style.background =
        "linear-gradient(to right, #4cc9f0, #4361ee)";
  }

  if (budgetUsedPercentElement) {
    budgetUsedPercentElement.textContent = `${budgetUsedPercent.toFixed(1)}%`;

    if (budgetUsedPercent > 100)
      budgetUsedPercentElement.style.color = "#f72585";
    else if (budgetUsedPercent > 80)
      budgetUsedPercentElement.style.color = "#f8961e";
    else budgetUsedPercentElement.style.color = "#4cc9f0";
  }
}

// --- Trigger budget notifications ---
function triggerBudgetNotifications() {
  if (window.notificationSystem?.checkNotifications) {
    setTimeout(() => window.notificationSystem.checkNotifications(), 500);
  }
}

// --- Initialize on DOM load ---
document.addEventListener("DOMContentLoaded", async () => {
  if (document.getElementById("budget-page")) {
    await updateBudgetPage();

    // Attach budget form submit handler
    const budgetForm = document.getElementById("budget-form");
    if (budgetForm) {
      budgetForm.addEventListener("submit", handleMonthlyBudgetUpdate);
    }
  }
});

// =====================================================
// ENHANCED MONTHLY BUDGET SYSTEM (New Features)
// =====================================================

/**
 * Initialize monthly budget view with month switcher
 */
async function initializeMonthlyBudgetView() {
  try {
    const monthSelector = document.getElementById("month-selector");
    if (!monthSelector) return;

    const user = window.firebaseAuth?.getCurrentUser?.();
    if (!user) return;

    const currentMonth = window.monthlyBudget?.getCurrentMonth?.();
    if (!currentMonth) return;

    // Ensure current month exists so history stays isolated
    await window.monthlyBudget?.createMonthIfNotExists?.(
      user.uid,
      currentMonth,
    );

    // Populate month selector
    const months = await window.monthlyBudget?.getUserMonthsList?.(user.uid);
    const monthList =
      months?.success && Array.isArray(months.months) ? [...months.months] : [];

    if (!monthList.includes(currentMonth)) {
      monthList.unshift(currentMonth);
    }

    monthList.sort().reverse();
    monthSelector.innerHTML = "";

    monthList.forEach((month) => {
      const option = document.createElement("option");
      option.value = month;
      const displayDate = new Date(month + "-01").toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      });
      option.textContent = displayDate;
      if (month === currentMonth) {
        option.selected = true;
      }
      monthSelector.appendChild(option);
    });

    monthSelector.addEventListener("change", async (e) => {
      await loadMonthData(e.target.value);
    });

    // Load the selected month immediately
    await loadMonthData(monthSelector.value || currentMonth);
  } catch (error) {
    console.error("Error initializing monthly budget view:", error);
  }
}

/**
 * Load and display data for selected month
 */
async function loadMonthData(month) {
  try {
    const user = window.firebaseAuth?.getCurrentUser?.();
    if (!user) return;

    const monthData = await window.monthlyBudget?.getMonthData?.(
      user.uid,
      month,
    );
    if (!monthData?.success) {
      showToast("Error loading month data", "error");
      return;
    }

    // Update UI with month data
    updateMonthlyBudgetDisplay(monthData);
    updateMonthlyIncomeDisplay(monthData);
    updateMonthlyExpensesSummary(monthData);
    updateBudgetStatus(monthData);
  } catch (error) {
    console.error("Error loading month data:", error);
    showToast("Failed to load month data", "error");
  }
}

/**
 * Update budget display for the selected month
 */
function updateMonthlyBudgetDisplay(monthData) {
  const budgetInput = document.getElementById("monthly-budget");
  const savingsGoalInput = document.getElementById("savings-goal");
  const currentBudgetDisplay = document.getElementById(
    "current-monthly-budget",
  );

  if (budgetInput) {
    budgetInput.value = monthData.budget || 0;
  }
  if (savingsGoalInput) {
    savingsGoalInput.value = monthData.savingsGoal || 0;
  }
  if (currentBudgetDisplay) {
    currentBudgetDisplay.textContent = formatCurrency(monthData.budget || 0);
  }
}

/**
 * Update income display for the selected month
 */
function updateMonthlyIncomeDisplay(monthData) {
  const totalIncomeDisplay = document.getElementById("total-income-display");
  const incomeList = document.getElementById("income-list");

  if (totalIncomeDisplay) {
    totalIncomeDisplay.textContent = formatCurrency(monthData.totalIncome || 0);
  }

  if (incomeList && monthData.income && monthData.income.length > 0) {
    incomeList.innerHTML = monthData.income
      .map(
        (inc) => `
            <div class="income-item">
                <div class="income-details">
                    <div class="income-source">${inc.source}</div>
                    <div class="income-date">
                        <i class="fas fa-calendar"></i> 
                        ${new Date(inc.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </div>
                </div>
                <div class="income-amount">${formatCurrency(inc.amount)}</div>
                <button class="btn-icon" onclick="deleteIncomeFromMonth('${monthData.month}', '${inc.id}')" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `,
      )
      .join("");
  } else if (incomeList) {
    incomeList.innerHTML =
      '<div class="empty-state"><p>No income recorded yet</p></div>';
  }
}

/**
 * Update expenses summary for the selected month
 */
function updateMonthlyExpensesSummary(monthData) {
  const totalExpensesDisplay = document.getElementById(
    "total-expenses-display",
  );
  const expensesList = document.getElementById("expenses-list-monthly");

  if (totalExpensesDisplay) {
    totalExpensesDisplay.textContent = formatCurrency(
      monthData.totalExpenses || 0,
    );
  }

  if (expensesList && monthData.expenses && monthData.expenses.length > 0) {
    // Show top 5 expenses for this month
    const topExpenses = monthData.expenses.slice(0, 5);
    expensesList.innerHTML = topExpenses
      .map((exp) => {
        const category = window.getExpenseCategoryMeta?.(exp.category) ||
          CONFIG.CATEGORIES?.[exp.category] || {
            name: exp.category || "Other",
            color: "#ccc",
            icon: "fas fa-tag",
          };
        return `
                <div class="expense-item-minimal">
                    <div style="background-color: ${category.color}" class="expense-icon">
                        <i class="${category.icon}"></i>
                    </div>
                    <div class="expense-details-minimal">
                        <div class="expense-category">${category.name}</div>
                        <div class="expense-date">${new Date(exp.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
                    </div>
                    <div class="expense-amount">${formatCurrency(exp.amount)}</div>
                </div>
            `;
      })
      .join("");
  } else if (expensesList) {
    expensesList.innerHTML =
      '<div class="empty-state"><p>No expenses recorded</p></div>';
  }
}

/**
 * Handle monthly budget update (differs from old system - per month instead of global)
 */
async function handleMonthlyBudgetUpdate(e) {
  e.preventDefault();

  const user = window.firebaseAuth?.getCurrentUser?.();
  if (!user) {
    showToast("Please sign in first", "error");
    return;
  }

  const budgetInput = document.getElementById("monthly-budget");
  const savingsGoalInput = document.getElementById("savings-goal");
  const amount = parseFloat(budgetInput.value);

  if (!amount || amount <= 0) {
    showToast("Please enter a valid budget amount", "error");
    budgetInput.focus();
    return;
  }

  const monthSelector = document.getElementById("month-selector");
  const categorySelect = document.getElementById("budget-category");
  const category = categorySelect?.value || null;
  const month =
    monthSelector?.value || window.monthlyBudget?.getCurrentMonth?.();

  if (!month) {
    showToast("Error: Cannot determine current month", "error");
    return;
  }

  const budgetPayload = category ? { amount, category } : amount;

  try {
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    submitBtn.disabled = true;

    // Update budget
    const budgetResult = await window.monthlyBudget?.updateBudget?.(
      user.uid,
      month,
      budgetPayload,
    );

    if (budgetResult?.success) {
      showToast("Budget updated successfully!", "success");
      await loadMonthData(month);
      updateDashboard();
      await updateSavingsPage();
    } else {
      showToast(
        `Error: ${budgetResult?.error || "Failed to update budget"}`,
        "error",
      );
    }

    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
  } catch (error) {
    console.error("Error updating monthly budget:", error);
    showToast("Failed to update budget", "error");
  }
}

/**
 * Handle adding income to a month
 */
async function handleAddIncome(e) {
  e.preventDefault();

  const user = window.firebaseAuth?.getCurrentUser?.();
  if (!user) {
    showToast("Please sign in first", "error");
    return;
  }

  const amountInput = document.getElementById("income-amount");
  const sourceInput = document.getElementById("income-source");
  const dateInput = document.getElementById("income-date");

  const amount = parseFloat(amountInput.value);
  const source = sourceInput.value.trim();
  const date = dateInput.value;

  if (!amount || amount <= 0) {
    showToast("Please enter a valid income amount", "error");
    amountInput.focus();
    return;
  }

  if (!source) {
    showToast("Please enter an income source", "error");
    sourceInput.focus();
    return;
  }

  if (!date) {
    showToast("Please select a date", "error");
    dateInput.focus();
    return;
  }

  const monthSelector = document.getElementById("month-selector");
  const month =
    monthSelector?.value || window.monthlyBudget?.getCurrentMonth?.();

  try {
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
    submitBtn.disabled = true;

    const result = await window.monthlyBudget?.addIncome?.(user.uid, month, {
      amount,
      source,
      date,
    });

    if (result?.success) {
      e.target.reset();
      dateInput.value = new Date().toISOString().split("T")[0];
      showToast("Income added successfully!", "success");

      // Reload month data
      await loadMonthData(month);
      updateDashboard();
    } else {
      showToast(`Error: ${result?.error || "Failed to add income"}`, "error");
    }

    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
  } catch (error) {
    console.error("Error adding income:", error);
    showToast("Failed to add income", "error");
  }
}

/**
 * Delete income entry from current month
 */
async function deleteIncomeFromMonth(month, incomeId) {
  if (!confirm("Are you sure you want to delete this income entry?")) {
    return;
  }

  const user = window.firebaseAuth?.getCurrentUser?.();
  if (!user) {
    showToast("Please sign in first", "error");
    return;
  }

  try {
    const result = await window.monthlyBudget?.deleteIncomeEntry?.(
      user.uid,
      month,
      incomeId,
    );

    if (result?.success) {
      showToast("Income entry deleted", "success");
      // Reload month data
      await loadMonthData(month);
      updateDashboard();
    } else {
      showToast("Error deleting income entry", "error");
    }
  } catch (error) {
    console.error("Error deleting income:", error);
    showToast("Failed to delete income entry", "error");
  }
}
