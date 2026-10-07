/**
 * Savings Module
 * Handles savings tracking and calculations
 */

let savingsGoals = [];

async function loadDailySpendingAmount() {
  const input = document.getElementById("daily-savings");
  const user = window.firebaseAuth?.getCurrentUser?.();
  if (!input || !user || !window.firebaseAuth?.getOnboardingStatus) return;

  const result = await window.firebaseAuth.getOnboardingStatus(user.uid);
  const savedValue = result?.onboarding?.safe_daily_spending;
  if (savedValue != null) {
    // V2.2: display pre-existing amounts with comma formatting
    const _fmtMoney = window.moneyInputFormat?.formatMoneyString;
    input.value = _fmtMoney
      ? _fmtMoney(String(savedValue), true)
      : savedValue;
  }
}

async function saveDailySpendingAmount() {
  const input = document.getElementById("daily-savings");
  const user = window.firebaseAuth?.getCurrentUser?.();
  if (!input || !user || !window.firebaseAuth?.saveOnboardingProgress) return;

  // V2.2: strip commas from formatted display value before any numeric use
  const rawVal = input.value || "0";
  const value = (window.moneyInputFormat?.parseMoneyValue ?? (v => Number(String(v).replace(/,/g, ''))))(rawVal);
  if (!Number.isFinite(value) || value < 0) return;

  const result = await window.firebaseAuth.saveOnboardingProgress(
    {
      safe_daily_spending: value,
      completed: true,
    },
    user.uid,
  );
  const status = document.getElementById("daily-savings-save-status");
  if (status)
    status.textContent = result?.success
      ? "Saved"
      : result?.error || "Could not save";
  if (result?.success && window.updateDashboard) await window.updateDashboard();
}

async function handleSafeSpendSubmit(event) {
  event.preventDefault();
  await saveDailySpendingAmount();
}

function escapeSavingsHtml(value) {
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

function getLocalDateInputValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function closeSavingsModal(modal) {
  modal?.classList.remove("active");
}

function openSavingsGoalModal(goal = null) {
  const modal = document.getElementById("savings-goal-modal");
  const form = document.getElementById("savings-goal-form");
  if (!modal || !form) return;

  form.reset();
  document.getElementById("savings-goal-id").value = goal?.id || "";
  document.getElementById("savings-goal-name").value = goal?.name || "";
  document.getElementById("savings-goal-description").value =
    goal?.description || "";
  // V2.2: display pre-existing amounts with comma formatting
  const _fmtMoney = window.moneyInputFormat?.formatMoneyString;
  const rawTarget = goal?.target_amount ?? "";
  document.getElementById("savings-goal-target").value =
    (rawTarget !== "" && _fmtMoney)
      ? _fmtMoney(String(rawTarget), true)
      : rawTarget;
  document.getElementById("savings-goal-date").value = goal?.target_date || "";
  document.getElementById("savings-goal-icon").value = goal?.icon || "";

  const editing = Boolean(goal);
  document.getElementById("savings-goal-modal-title").textContent = editing
    ? "Edit Goal"
    : "Create Goal";
  document.getElementById("savings-goal-submit").textContent = editing
    ? "Save Changes"
    : "Create Goal";
  modal.classList.add("active");
  document.getElementById("savings-goal-name").focus();
}

function openSavingsMovementModal(goal, type) {
  const modal = document.getElementById("savings-movement-modal");
  const form = document.getElementById("savings-movement-form");
  if (!modal || !form) return;

  form.reset();
  document.getElementById("savings-movement-goal-id").value = goal.id;
  document.getElementById("savings-movement-type").value = type;
  document.getElementById("savings-movement-date").value =
    getLocalDateInputValue();
  const actionLabel = type === "deposit" ? "Add Money" : "Withdraw";
  document.getElementById("savings-movement-title").textContent =
    `${actionLabel} · ${goal.name}`;
  document.getElementById("savings-movement-submit").textContent =
    type === "deposit" ? "Deposit" : "Withdraw";
  modal.classList.add("active");
  document.getElementById("savings-movement-amount").focus();
}

function formatSavingsDate(dateValue) {
  if (!dateValue) return "";
  const date = new Date(`${String(dateValue).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-NG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function renderSavingsSummary() {
  const totalSaved = savingsGoals.reduce(
    (sum, goal) => sum + (Number(goal.saved_amount) || 0),
    0,
  );
  const totalTarget = savingsGoals.reduce(
    (sum, goal) => sum + (Number(goal.target_amount) || 0),
    0,
  );
  const activeGoals = savingsGoals.filter(
    (goal) => Number(goal.saved_amount || 0) < Number(goal.target_amount || 0),
  ).length;

  document.getElementById("savings-total-saved").textContent =
    formatCurrency(totalSaved);
  document.getElementById("savings-total-target").textContent =
    formatCurrency(totalTarget);
  document.getElementById("savings-active-goals").textContent =
    String(activeGoals);
}

function renderSavingsGoals() {
  const container = document.getElementById("savings-goals-list");
  if (!container) return;

  renderSavingsSummary();
  if (!savingsGoals.length) {
    container.innerHTML = `
            <div class="savings-empty-state">
                <i class="fas fa-bullseye" aria-hidden="true"></i>
                <h4>No savings goals yet</h4>
                <p>Create a goal to start tracking what you are saving for.</p>
                <button type="button" class="btn btn-primary" data-savings-action="create">Create Goal</button>
            </div>`;
    return;
  }

  container.innerHTML = savingsGoals
    .map((goal) => {
      const saved = Number(goal.saved_amount) || 0;
      const target = Number(goal.target_amount) || 0;
      const progress =
        target > 0
          ? Math.min(100, Math.max(0, (saved / target) * 100))
          : saved > 0
            ? 100
            : 0;
      const remaining = Math.max(0, target - saved);
      const completed = saved >= target;
      const dateLabel = formatSavingsDate(goal.target_date);
      const description = goal.description
        ? `<p class="savings-goal-description">${escapeSavingsHtml(goal.description)}</p>`
        : "";
      const date = dateLabel
        ? `<span class="savings-goal-date"><i class="fas fa-calendar-alt" aria-hidden="true"></i> ${escapeSavingsHtml(dateLabel)}</span>`
        : "";

      return `
            <article class="card savings-goal-item">
                <div class="savings-goal-card-header">
                    <span class="savings-goal-icon" aria-hidden="true">${escapeSavingsHtml(goal.icon || "🎯")}</span>
                    <span class="savings-goal-status ${completed ? "is-complete" : ""}">${completed ? "Completed" : "In progress"}</span>
                </div>
                <h4>${escapeSavingsHtml(goal.name || "Savings goal")}</h4>
                ${description}
                <div class="savings-goal-balance">${formatCurrency(saved)} <span>of ${formatCurrency(target)}</span></div>
                <div class="goal-progress savings-card-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(progress)}" aria-label="${escapeSavingsHtml(goal.name || "Savings goal")} progress">
                    <div class="progress-bar"><div class="progress-fill savings-fill" style="width:${progress}%"></div></div>
                </div>
                <div class="savings-goal-meta">
                    <strong>${progress.toFixed(0)}% complete</strong>
                    <span>${formatCurrency(remaining)} remaining</span>
                </div>
                ${date}
                <div class="savings-goal-actions">
                    <button type="button" class="btn btn-primary" data-savings-action="deposit" data-goal-id="${escapeSavingsHtml(goal.id)}"><i class="fas fa-plus" aria-hidden="true"></i> Add Money</button>
                    <button type="button" class="btn btn-secondary" data-savings-action="withdraw" data-goal-id="${escapeSavingsHtml(goal.id)}"><i class="fas fa-arrow-up" aria-hidden="true"></i> Withdraw</button>
                    <button type="button" class="btn btn-secondary savings-icon-button" data-savings-action="edit" data-goal-id="${escapeSavingsHtml(goal.id)}" title="Edit goal" aria-label="Edit ${escapeSavingsHtml(goal.name || "goal")}"><i class="fas fa-pen" aria-hidden="true"></i></button>
                    <button type="button" class="btn btn-danger savings-icon-button" data-savings-action="delete" data-goal-id="${escapeSavingsHtml(goal.id)}" title="Delete goal" aria-label="Delete ${escapeSavingsHtml(goal.name || "goal")}"><i class="fas fa-trash" aria-hidden="true"></i></button>
                </div>
            </article>`;
    })
    .join("");
}

async function updateSavingsPage() {
  const user = window.firebaseAuth?.getCurrentUser?.();
  const container = document.getElementById("savings-goals-list");
  if (!user) {
    savingsGoals = [];
    renderSavingsGoals();
    await loadDailySpendingAmount();
    return;
  }

  if (!window.monthlyBudget?.getSavingsGoals) {
    if (container)
      container.innerHTML =
        '<p class="error-message">Savings services are unavailable.</p>';
    return;
  }

  if (container)
    container.innerHTML = '<div class="loading">Loading savings goals...</div>';
  const result = await window.monthlyBudget.getSavingsGoals(user.uid);
  if (!result?.success) {
    if (container)
      container.innerHTML = `<p class="error-message">${escapeSavingsHtml(result?.error || "Could not load savings goals.")}</p>`;
    return;
  }

  savingsGoals = Array.isArray(result.goals) ? result.goals : [];
  renderSavingsGoals();
  await loadDailySpendingAmount();
  if (typeof updateSavingsCalculator === "function") updateSavingsCalculator();
}

async function handleSavingsGoalSubmit(event) {
  event.preventDefault();
  const user = window.firebaseAuth?.getCurrentUser?.();
  if (!user) {
    showToast("Please sign in first", "error");
    return;
  }

  const goalId = document.getElementById("savings-goal-id").value;
  // V2.2: strip commas from formatted display value before any numeric use
  const _parseMoney = window.moneyInputFormat?.parseMoneyValue ?? (v => Number(String(v).replace(/,/g, '')));
  const amount = _parseMoney(document.getElementById("savings-goal-target").value);
  if (!Number.isFinite(amount) || amount <= 0) {
    showToast("Target amount must be greater than zero.", "error");
    return;
  }

  const goalData = {
    name: document.getElementById("savings-goal-name").value.trim(),
    description: document
      .getElementById("savings-goal-description")
      .value.trim(),
    target_amount: amount,
    target_date: document.getElementById("savings-goal-date").value || null,
    icon: document.getElementById("savings-goal-icon").value.trim() || null,
  };
  const submit = document.getElementById("savings-goal-submit");
  submit.disabled = true;

  const result = goalId
    ? await window.monthlyBudget.updateSavingsGoalById(
        user.uid,
        goalId,
        goalData,
      )
    : await window.monthlyBudget.createSavingsGoal(user.uid, goalData);

  submit.disabled = false;
  if (!result?.success) {
    showToast(result?.error || "Could not save this goal.", "error");
    return;
  }

  closeSavingsModal(document.getElementById("savings-goal-modal"));
  showToast(goalId ? "Goal updated." : "Goal created.", "success");
  await updateSavingsPage();
}

async function handleSavingsMovementSubmit(event) {
  event.preventDefault();
  const user = window.firebaseAuth?.getCurrentUser?.();
  if (!user) {
    showToast("Please sign in first", "error");
    return;
  }

  const goalId = document.getElementById("savings-movement-goal-id").value;
  const type = document.getElementById("savings-movement-type").value;
  // V2.2: strip commas from formatted display value before any numeric use
  const amount = (window.moneyInputFormat?.parseMoneyValue ?? (v => Number(String(v).replace(/,/g, ''))))(
    document.getElementById("savings-movement-amount").value,
  );
  const date = document.getElementById("savings-movement-date").value;
  const note = document.getElementById("savings-movement-note").value.trim();
  if (!Number.isFinite(amount) || amount <= 0 || !date) {
    showToast("Enter an amount greater than zero and select a date.", "error");
    return;
  }

  const submit = document.getElementById("savings-movement-submit");
  submit.disabled = true;
  const result =
    type === "deposit"
      ? await window.monthlyBudget.addSavingsDeposit(
          user.uid,
          goalId,
          amount,
          date,
          note,
        )
      : await window.monthlyBudget.withdrawSavings(
          user.uid,
          goalId,
          amount,
          date,
          note,
        );
  submit.disabled = false;

  if (!result?.success) {
    const message =
      /insufficient|available balance|saved amount|withdraw/i.test(
        result?.error || "",
      )
        ? result.error
        : result?.error || "The savings movement could not be completed.";
    showToast(message, "error");
    return;
  }

  closeSavingsModal(document.getElementById("savings-movement-modal"));
  document.getElementById("savings-movement-form").reset();
  showToast(
    type === "deposit" ? "Deposit recorded." : "Withdrawal recorded.",
    "success",
  );
  await updateSavingsPage();
  if (typeof window.updateDashboard === "function")
    await window.updateDashboard();
}

async function handleSavingsGoalAction(event) {
  const button = event.target.closest("[data-savings-action]");
  if (!button) return;
  const action = button.dataset.savingsAction;
  if (action === "create") {
    openSavingsGoalModal();
    return;
  }

  const goal = savingsGoals.find(
    (item) => String(item.id) === String(button.dataset.goalId),
  );
  if (!goal) return;
  if (action === "edit") {
    openSavingsGoalModal(goal);
  } else if (action === "deposit" || action === "withdraw") {
    openSavingsMovementModal(goal, action);
  } else if (action === "delete") {
    if (
      !window.confirm(
        `Delete the goal “${goal.name}”? Goals with savings history cannot be deleted.`,
      )
    )
      return;
    const user = window.firebaseAuth?.getCurrentUser?.();
    const result = await window.monthlyBudget?.deleteSavingsGoal?.(
      user?.uid,
      goal.id,
    );
    if (!result?.success) {
      showToast(result?.error || "This goal could not be deleted.", "error");
      return;
    }
    showToast("Goal deleted.", "success");
    await updateSavingsPage();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("savings-create-goal-button")
    ?.addEventListener("click", () => openSavingsGoalModal());
  document
    .getElementById("savings-goals-list")
    ?.addEventListener("click", handleSavingsGoalAction);
  document
    .getElementById("savings-goal-form")
    ?.addEventListener("submit", handleSavingsGoalSubmit);
  document
    .getElementById("savings-movement-form")
    ?.addEventListener("submit", handleSavingsMovementSubmit);
  document.querySelectorAll("[data-close-savings-modal]").forEach((button) => {
    button.addEventListener("click", () =>
      closeSavingsModal(button.closest(".modal")),
    );
  });
  document
    .querySelectorAll("#savings-goal-modal, #savings-movement-modal")
    .forEach((modal) => {
      modal.addEventListener("click", (event) => {
        if (event.target === modal) closeSavingsModal(modal);
      });
    });
  document
    .getElementById("daily-savings")
    ?.addEventListener("change", saveDailySpendingAmount);
  document
    .getElementById("safe-spend-form")
    ?.addEventListener("submit", handleSafeSpendSubmit);
  updateSavingsPage();
});
