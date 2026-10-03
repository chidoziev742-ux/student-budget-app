/**
 * Monthly Budget System Module
 * Uses Supabase as the active financial source of truth.
 *
 * Active schema:
 * - budgets: user_id + month + amount
 * - income: user_id + amount + source + received_date
 * - expenses: user_id + category_id + amount + expense_date + description
 * - savings_goals: user_id + target_amount + saved_amount + target_date
 * - category_budgets: user_id + category_id + period + amount
 */

import {
  db,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  orderBy,
} from "./firebase-config.js";
import { supabase } from "./supabase-client.js";

const DEFAULT_CATEGORY_BUDGET = {
  food: 0,
  transport: 0,
  data: 0,
  other: 0,
};

const CATEGORY_NAME_BY_KEY = {
  food: "Food & Dining",
  transport: "Transportation",
  entertainment: "Entertainment",
  education: "Education",
  shopping: "Shopping",
  housing: "Housing & Utilities",
  health: "Health & Wellness",
  other: "Other",
};

async function ensureUserCategories(userId) {
  if (!userId) return [];

  const { data: existingData, error: fetchError } = await supabase
    .from("categories")
    .select("id, name, user_id")
    .eq("user_id", userId);

  if (fetchError && fetchError.code !== "PGRST116") {
    console.warn(
      "[Supabase Monthly Budget] Could not load categories:",
      fetchError.message,
    );
  }

  const existingCategories = existingData || [];
  const existingNames = new Set(
    existingCategories.map((category) =>
      String(category.name || "")
        .trim()
        .toLowerCase(),
    ),
  );
  const missingCategories = Object.entries(CATEGORY_NAME_BY_KEY)
    .filter(([key, name]) => {
      const normalizedKey = String(key || "")
        .trim()
        .toLowerCase();
      const normalizedName = String(name || "")
        .trim()
        .toLowerCase();
      return (
        !existingNames.has(normalizedName) && !existingNames.has(normalizedKey)
      );
    })
    .map(([, name]) => ({
      user_id: userId,
      name: String(name || "").trim(),
    }));

  if (!missingCategories.length) {
    return existingCategories;
  }

  const { data: insertedData, error: insertError } = await supabase
    .from("categories")
    .insert(missingCategories)
    .select("id, name, user_id");

  if (insertError) {
    console.warn(
      "[Supabase Monthly Budget] Could not create missing categories:",
      insertError.message,
    );
    return existingCategories;
  }

  return [...existingCategories, ...(insertedData || [])];
}

function normalizeBudgetObject(budget) {
  if (budget == null) {
    return { ...DEFAULT_CATEGORY_BUDGET };
  }

  if (typeof budget === "number") {
    return {
      ...DEFAULT_CATEGORY_BUDGET,
      other: budget,
    };
  }

  if (typeof budget === "object") {
    return {
      ...DEFAULT_CATEGORY_BUDGET,
      ...budget,
    };
  }

  return { ...DEFAULT_CATEGORY_BUDGET };
}

function normalizeBudgetInput(budgetInput) {
  if (budgetInput == null) {
    return null;
  }

  if (typeof budgetInput === "number") {
    return {
      other: budgetInput,
    };
  }

  if (typeof budgetInput === "object") {
    if (
      typeof budgetInput.amount === "number" &&
      typeof budgetInput.category === "string"
    ) {
      return {
        [budgetInput.category]: budgetInput.amount,
      };
    }

    const normalized = {};
    Object.entries(budgetInput).forEach(([key, value]) => {
      if (
        DEFAULT_CATEGORY_BUDGET.hasOwnProperty(key) &&
        typeof value === "number"
      ) {
        normalized[key] = value;
      }
    });
    return normalized;
  }

  return null;
}

function mergeBudgetObjects(existingBudget, budgetInput) {
  const normalizedExisting = normalizeBudgetObject(existingBudget);
  const normalizedInput = normalizeBudgetInput(budgetInput);

  if (!normalizedInput) {
    return normalizedExisting;
  }

  return {
    ...normalizedExisting,
    ...normalizedInput,
  };
}

function getTotalBudget(budgetObject) {
  return Object.values(normalizeBudgetObject(budgetObject)).reduce(
    (sum, amount) => sum + (Number(amount) || 0),
    0,
  );
}

function calculateCategorySummary(expenses) {
  const spent = { ...DEFAULT_CATEGORY_BUDGET };
  (expenses || []).forEach((expense) => {
    const category =
      expense?.category &&
      DEFAULT_CATEGORY_BUDGET.hasOwnProperty(expense.category)
        ? expense.category
        : "other";
    spent[category] = (spent[category] || 0) + (Number(expense.amount) || 0);
  });
  return spent;
}

function calculateRemainingByCategory(budgetObject, expenses) {
  const normalizedBudget = normalizeBudgetObject(budgetObject);
  const spent = calculateCategorySummary(expenses);
  const remaining = {};

  Object.keys(normalizedBudget).forEach((category) => {
    remaining[category] = normalizedBudget[category] - (spent[category] || 0);
  });

  return remaining;
}

function getSupabaseConfig() {
  return window.__SUPABASE_CONFIG__ || {};
}

function shouldUseFirebaseMonthlySystem() {
  return !isSupabaseConfigured();
}

function isSupabaseConfigured() {
  const config = getSupabaseConfig();
  return !!(
    config.url &&
    config.anonKey &&
    !config.url.includes("YOUR_PROJECT_REF") &&
    !config.anonKey.includes("YOUR_SUPABASE_ANON_KEY")
  );
}

async function getAuthenticatedUserId(providedUserId = null) {
  if (!isSupabaseConfigured()) {
    return providedUserId || null;
  }

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) {
      return providedUserId || null;
    }

    if (providedUserId && providedUserId !== user.id) {
      console.warn(
        "[Supabase Monthly Budget] Ignoring mismatched provided userId and using authenticated user.",
        {
          providedUserId,
          authenticatedUserId: user.id,
        },
      );
    }

    return user.id;
  } catch (error) {
    console.warn(
      "[Supabase Monthly Budget] Could not resolve authenticated user ID:",
      error.message,
    );
    return providedUserId || null;
  }
}

function normalizeSupabaseMonthValue(value) {
  if (!value) return null;
  if (typeof value === "string" && /^\d{4}-\d{2}$/.test(value)) return value;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value))
    return getMonthFromDate(value);
  return null;
}

function getSupabaseMonthRange(targetMonth) {
  const monthStart = `${targetMonth}-01`;
  const nextMonth = new Date(`${targetMonth}-01T00:00:00Z`);
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
  const monthEnd = nextMonth.toISOString().slice(0, 10);
  return { monthStart, monthEnd };
}

export function getPreviousMonth(targetMonth) {
  if (!targetMonth || !/^\d{4}-\d{2}$/.test(targetMonth)) {
    return null;
  }

  const [year, month] = targetMonth.split("-").map(Number);
  const monthDate = new Date(Date.UTC(year, month - 1, 1));
  monthDate.setUTCMonth(monthDate.getUTCMonth() - 1);

  const prevYear = monthDate.getUTCFullYear();
  const prevMonth = String(monthDate.getUTCMonth() + 1).padStart(2, "0");
  return `${prevYear}-${prevMonth}`;
}

function calculateLedgerClosingBalance(
  openingBalance,
  totalIncome,
  totalExpenses,
  savingsDeposits = 0,
  savingsWithdrawals = 0,
) {
  return (
    Number(openingBalance || 0) +
    Number(totalIncome || 0) -
    Number(totalExpenses || 0) -
    Number(savingsDeposits || 0) +
    Number(savingsWithdrawals || 0)
  );
}

function getAfricaLagosToday() {
  const dateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(
    dateParts.map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

function getNextDateString(dateString) {
  const nextDate = new Date(`${dateString}T00:00:00Z`);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  return nextDate.toISOString().slice(0, 10);
}

async function getSupabaseOpeningBalance(userId, beforeDate) {
  const pageSize = 1000;
  let offset = 0;
  let totalIncome = 0;
  let totalExpenses = 0;
  let totalSavingsDeposits = 0;
  let totalSavingsWithdrawals = 0;
  let totalOpeningSavings = 0;

  while (true) {
    const [
      { data: incomeRows, error: incomeError },
      { data: expenseRows, error: expenseError },
      { data: savingsRows, error: savingsError },
      { data: openingSavingsRows, error: openingSavingsError },
    ] = await Promise.all([
      supabase
        .from("income")
        .select("id, amount, received_date")
        .eq("user_id", userId)
        .lt("received_date", beforeDate)
        .order("received_date", { ascending: true })
        .order("id", { ascending: true })
        .range(offset, offset + pageSize - 1),
      supabase
        .from("expenses")
        .select("id, amount, expense_date")
        .eq("user_id", userId)
        .lt("expense_date", beforeDate)
        .order("expense_date", { ascending: true })
        .order("id", { ascending: true })
        .range(offset, offset + pageSize - 1),
      supabase
        .from("savings_transactions")
        .select("id, amount, transaction_date, type")
        .eq("user_id", userId)
        .lt("transaction_date", beforeDate)
        .order("transaction_date", { ascending: true })
        .order("id", { ascending: true })
        .range(offset, offset + pageSize - 1),
      supabase
        .from("savings_goal_opening_balances")
        .select("goal_id, opening_amount, effective_date")
        .eq("user_id", userId)
        .lt("effective_date", beforeDate)
        .order("effective_date", { ascending: true })
        .order("goal_id", { ascending: true })
        .range(offset, offset + pageSize - 1),
    ]);

    if (incomeError) return { success: false, error: incomeError.message };
    if (expenseError) return { success: false, error: expenseError.message };
    if (savingsError) return { success: false, error: savingsError.message };
    if (openingSavingsError) {
      return { success: false, error: openingSavingsError.message };
    }

    totalIncome += (incomeRows || []).reduce(
      (sum, row) => sum + (Number(row.amount) || 0),
      0,
    );
    totalExpenses += (expenseRows || []).reduce(
      (sum, row) => sum + (Number(row.amount) || 0),
      0,
    );
    (savingsRows || []).forEach((row) => {
      const amount = Number(row.amount) || 0;
      if (row.type === "deposit") totalSavingsDeposits += amount;
      if (row.type === "withdrawal") totalSavingsWithdrawals += amount;
    });
    totalOpeningSavings += (openingSavingsRows || []).reduce(
      (sum, row) => sum + (Number(row.opening_amount) || 0),
      0,
    );

    if (
      (incomeRows || []).length < pageSize &&
      (expenseRows || []).length < pageSize &&
      (savingsRows || []).length < pageSize &&
      (openingSavingsRows || []).length < pageSize
    )
      break;
    offset += pageSize;
  }

  return {
    success: true,
    balance:
      totalIncome -
      totalExpenses -
      totalSavingsDeposits +
      totalSavingsWithdrawals -
      totalOpeningSavings,
  };
}

async function loadCategoryMap(userId) {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, user_id")
    .eq("user_id", userId);

  if (error) {
    console.warn(
      "[Supabase Monthly Budget] category lookup warning:",
      error.message,
    );
    return {};
  }

  const map = {};
  (data || []).forEach((category) => {
    const key = String(category.name || "")
      .trim()
      .toLowerCase();
    if (key) map[key] = category.id;
  });

  return map;
}

async function resolveCategoryId(userId, categoryName) {
  if (!categoryName) return null;

  const normalizedName = String(categoryName).trim();
  if (!normalizedName) return null;

  const categoryKey = normalizedName.toLowerCase();
  const canonicalName = CATEGORY_NAME_BY_KEY[categoryKey] || normalizedName;

  const categories = await ensureUserCategories(userId);
  const matchingCategory = categories.find((category) => {
    const candidateName = String(category.name || "")
      .trim()
      .toLowerCase();
    return (
      candidateName === canonicalName.toLowerCase() ||
      candidateName === categoryKey
    );
  });

  if (matchingCategory?.id) {
    return matchingCategory.id;
  }

  const { data, error } = await supabase
    .from("categories")
    .select("id, name, user_id")
    .eq("user_id", userId)
    .ilike("name", canonicalName)
    .maybeSingle();

  if (!error && data?.id) {
    return data.id;
  }

  const fallback = await supabase
    .from("categories")
    .select("id, name, user_id")
    .eq("user_id", userId)
    .ilike("name", `%${normalizedName}%`)
    .maybeSingle();

  if (!fallback.error && fallback.data?.id) {
    return fallback.data.id;
  }

  const created = await ensureUserCategories(userId);
  const finalMatch = created.find((category) => {
    const candidateName = String(category.name || "")
      .trim()
      .toLowerCase();
    return (
      candidateName === canonicalName.toLowerCase() ||
      candidateName === categoryKey
    );
  });

  return finalMatch?.id || null;
}

function mapSupabaseIncomeRow(row) {
  return {
    id: row.id,
    amount: Number(row.amount) || 0,
    source: row.source || "Income",
    date: row.received_date || row.created_at || new Date().toISOString(),
    notes: row.notes || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSupabaseExpenseRow(row, categoryName = "Other") {
  return {
    id: row.id,
    amount: Number(row.amount) || 0,
    category: categoryName,
    date: row.expense_date || row.created_at || new Date().toISOString(),
    reason: row.description || row.notes || "Expense",
    notes: row.notes || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Get current month in YYYY-MM format
 */
export function getCurrentMonth() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * Get month from date string (YYYY-MM-DD or Date object)
 */
export function getMonthFromDate(dateString) {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * Ensure month document exists in Firebase, create if needed
 */
export async function ensureMonthDocumentExists(userId, month = null) {
  const targetMonth = month || getCurrentMonth();

  if (!shouldUseFirebaseMonthlySystem() && isSupabaseConfigured()) {
    const authenticatedUserId = await getAuthenticatedUserId(userId);
    if (!authenticatedUserId) {
      return {
        success: false,
        error: "User not authenticated for Supabase access.",
      };
    }

    const { monthStart, monthEnd } = getSupabaseMonthRange(targetMonth);
    window.debugLog?.("[FINANCE] authenticated user resolved");
    window.debugLog?.("[FINANCE] month range:", monthStart, "to", monthEnd);
    const { data, error } = await supabase
      .from("budgets")
      .select("id")
      .eq("user_id", authenticatedUserId)
      .gte("month", monthStart)
      .lt("month", monthEnd)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      return { success: false, error: error.message };
    }

    if (!data) {
      const { error: insertError } = await supabase.from("budgets").insert({
        user_id: authenticatedUserId,
        month: monthStart,
        amount: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (insertError) {
        return { success: false, error: insertError.message };
      }
    }

    return { success: true, month: targetMonth };
  }

  try {
    if (!month) month = getCurrentMonth();

    const monthRef = doc(db, "users", userId, "months", month);
    const monthSnap = await getDoc(monthRef);

    if (!monthSnap.exists()) {
      await setDoc(monthRef, {
        budget: { ...DEFAULT_CATEGORY_BUDGET },
        income: [],
        expenses: [],
        savingsGoal: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      window.debugLog?.(`[FINANCE] Created new month document: ${month}`);
    }

    return { success: true, month };
  } catch (error) {
    console.error("Error ensuring month document exists:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Update budget for a specific month (FIXED, not auto-updated by income)
 */
export async function updateBudget(userId, month, newBudgetInput) {
  const targetMonth = month || getCurrentMonth();

  if (!shouldUseFirebaseMonthlySystem() && isSupabaseConfigured()) {
    const authenticatedUserId = await getAuthenticatedUserId(userId);
    if (!authenticatedUserId) {
      return {
        success: false,
        error: "User not authenticated for Supabase access.",
      };
    }

    const mergedBudget = mergeBudgetObjects(
      newBudgetInput &&
        typeof newBudgetInput === "object" &&
        !Array.isArray(newBudgetInput)
        ? newBudgetInput
        : {},
      newBudgetInput,
    );
    const budgetTotal = getTotalBudget(mergedBudget);
    const { monthStart, monthEnd } = getSupabaseMonthRange(targetMonth);

    const { data: existingBudget, error: fetchError } = await supabase
      .from("budgets")
      .select("*")
      .eq("user_id", authenticatedUserId)
      .gte("month", monthStart)
      .lt("month", monthEnd)
      .maybeSingle();

    if (fetchError && fetchError.code !== "PGRST116") {
      return { success: false, error: fetchError.message };
    }

    if (existingBudget) {
      const { error: updateError } = await supabase
        .from("budgets")
        .update({ amount: budgetTotal, updated_at: new Date().toISOString() })
        .eq("id", existingBudget.id)
        .eq("user_id", authenticatedUserId);

      if (updateError) {
        return { success: false, error: updateError.message };
      }
    } else {
      const { error: insertError } = await supabase.from("budgets").insert({
        user_id: authenticatedUserId,
        month: monthStart,
        amount: budgetTotal,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (insertError) {
        return { success: false, error: insertError.message };
      }
    }

    return {
      success: true,
      month: targetMonth,
      budget: budgetTotal,
      budgetByCategory: mergedBudget,
    };
  }

  try {
    if (!month) month = getCurrentMonth();
    const monthRef = doc(db, "users", userId, "months", month);
    await ensureMonthDocumentExists(userId, month);
    const monthSnap = await getDoc(monthRef);
    const monthData = monthSnap.exists() ? monthSnap.data() : {};
    const mergedBudget = mergeBudgetObjects(monthData.budget, newBudgetInput);
    await updateDoc(monthRef, {
      budget: mergedBudget,
      updatedAt: new Date().toISOString(),
    });
    return {
      success: true,
      month,
      budget: getTotalBudget(mergedBudget),
      budgetByCategory: mergedBudget,
    };
  } catch (error) {
    console.error("Error updating budget:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Resolve savings ownership from the active Supabase session.
 */
async function getSavingsServiceUserId(providedUserId) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      success: false,
      error: "You must be signed in to manage savings.",
    };
  }

  if (providedUserId && providedUserId !== user.id) {
    return {
      success: false,
      error: "The signed-in user does not match this request.",
    };
  }

  return { success: true, userId: user.id };
}

export async function getSavingsGoals(userId) {
  if (!isSupabaseConfigured()) {
    return { success: false, error: "Savings goals require Supabase." };
  }

  const owner = await getSavingsServiceUserId(userId);
  if (!owner.success) return owner;

  const { data, error } = await supabase
    .from("savings_goals")
    .select(
      "id, user_id, name, description, target_amount, saved_amount, target_date, icon, created_at, updated_at",
    )
    .eq("user_id", owner.userId)
    .order("created_at", { ascending: true });

  if (error) return { success: false, error: error.message };
  return { success: true, goals: data || [] };
}

export async function getSavingsGoal(userId, goalId) {
  if (!isSupabaseConfigured()) {
    return { success: false, error: "Savings goals require Supabase." };
  }

  const owner = await getSavingsServiceUserId(userId);
  if (!owner.success) return owner;

  const { data, error } = await supabase
    .from("savings_goals")
    .select(
      "id, user_id, name, description, target_amount, saved_amount, target_date, icon, created_at, updated_at",
    )
    .eq("id", goalId)
    .eq("user_id", owner.userId)
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  if (!data) return { success: false, error: "Savings goal not found." };
  return { success: true, goal: data };
}

export async function getSavingsTransactions(userId, filters = {}) {
  if (!isSupabaseConfigured()) {
    return { success: false, error: "Savings history requires Supabase." };
  }

  const owner = await getSavingsServiceUserId(userId);
  if (!owner.success) return owner;

  const goalsResult = await getSavingsGoals(owner.userId);
  if (!goalsResult.success) return goalsResult;
  const goalNames = new Map(
    goalsResult.goals.map((goal) => [
      String(goal.id),
      goal.name || "Savings goal",
    ]),
  );

  const pageSize = 1000;
  const transactions = [];
  let offset = 0;
  while (true) {
    let query = supabase
      .from("savings_transactions")
      .select("id, goal_id, type, amount, transaction_date, note, created_at")
      .eq("user_id", owner.userId)
      .order("transaction_date", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (filters.fromDate)
      query = query.gte("transaction_date", filters.fromDate);
    if (filters.toDate) query = query.lt("transaction_date", filters.toDate);

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };

    transactions.push(...(data || []));
    if ((data || []).length < pageSize) break;
    offset += pageSize;
  }

  return {
    success: true,
    transactions: transactions.map((transaction) => ({
      ...transaction,
      goalName: goalNames.get(String(transaction.goal_id)) || "Savings goal",
    })),
  };
}

function normalizeSavingsGoalInput(goalData) {
  const name = String(goalData?.name || "").trim();
  const targetAmount = Number(goalData?.target_amount);

  if (!name) return { success: false, error: "Goal name is required." };
  if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
    return {
      success: false,
      error: "Target amount must be greater than zero.",
    };
  }

  return {
    success: true,
    values: {
      name,
      description: String(goalData?.description || "").trim() || null,
      target_amount: targetAmount,
      target_date: goalData?.target_date || null,
      icon: String(goalData?.icon || "").trim() || "🎯",
      updated_at: new Date().toISOString(),
    },
  };
}

export async function createSavingsGoal(userId, goalData, stableGoalId = null) {
  if (!isSupabaseConfigured()) {
    return { success: false, error: "Savings goals require Supabase." };
  }

  const owner = await getSavingsServiceUserId(userId);
  if (!owner.success) return owner;

  const normalized = normalizeSavingsGoalInput(goalData);
  if (!normalized.success) return normalized;

  const createdAt = new Date().toISOString();
  const goalPayload = {
    ...normalized.values,
    user_id: owner.userId,
    saved_amount: 0,
    created_at: createdAt,
  };
  if (stableGoalId) goalPayload.id = stableGoalId;

  const { data, error } = await supabase
    .from("savings_goals")
    .insert(goalPayload)
    .select(
      "id, user_id, name, description, target_amount, saved_amount, target_date, icon, created_at, updated_at",
    )
    .single();

  if (error) {
    if (stableGoalId && error.code === "23505") {
      const existingResult = await getSavingsGoal(owner.userId, stableGoalId);
      if (existingResult.success) {
        const existingGoal = existingResult.goal;
        const sameGoal =
          String(existingGoal.name || "")
            .trim()
            .toLowerCase() === normalized.values.name.toLowerCase() &&
          String(existingGoal.description || "") ===
            String(normalized.values.description || "") &&
          Number(existingGoal.target_amount) ===
            Number(normalized.values.target_amount) &&
          String(existingGoal.target_date || "") ===
            String(normalized.values.target_date || "");
        if (sameGoal) {
          return { success: true, goal: existingGoal, alreadyExists: true };
        }
      }
    }
    return { success: false, error: error.message };
  }
  return { success: true, goal: data };
}

export async function updateSavingsGoalById(userId, goalId, goalData) {
  if (!isSupabaseConfigured()) {
    return { success: false, error: "Savings goals require Supabase." };
  }

  const owner = await getSavingsServiceUserId(userId);
  if (!owner.success) return owner;

  const normalized = normalizeSavingsGoalInput(goalData);
  if (!normalized.success) return normalized;

  const { data, error } = await supabase
    .from("savings_goals")
    .update(normalized.values)
    .eq("id", goalId)
    .eq("user_id", owner.userId)
    .select(
      "id, user_id, name, description, target_amount, saved_amount, target_date, icon, created_at, updated_at",
    )
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  if (!data) return { success: false, error: "Savings goal not found." };
  return { success: true, goal: data };
}

export async function deleteSavingsGoal(userId, goalId) {
  if (!isSupabaseConfigured()) {
    return { success: false, error: "Savings goals require Supabase." };
  }

  const owner = await getSavingsServiceUserId(userId);
  if (!owner.success) return owner;

  const { error } = await supabase
    .from("savings_goals")
    .delete()
    .eq("id", goalId)
    .eq("user_id", owner.userId);

  if (error) {
    if (error.code === "23503") {
      return {
        success: false,
        error: "This goal has savings history and cannot be deleted.",
      };
    }
    return { success: false, error: error.message };
  }

  return { success: true };
}

async function runSavingsMovementRpc(userId, rpcName, params) {
  if (!isSupabaseConfigured()) {
    return { success: false, error: "Savings transactions require Supabase." };
  }

  const owner = await getSavingsServiceUserId(userId);
  if (!owner.success) return owner;

  const amount = Number(params.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { success: false, error: "Amount must be greater than zero." };
  }

  const { data, error } = await supabase.rpc(rpcName, {
    p_goal_id: params.goalId,
    p_amount: amount,
    p_transaction_date: params.transactionDate || null,
    p_note: String(params.note || "").trim() || null,
  });

  if (error) return { success: false, error: error.message, code: error.code };
  return { success: true, data };
}

export async function addSavingsDeposit(
  userId,
  goalId,
  amount,
  date = null,
  note = "",
) {
  return runSavingsMovementRpc(userId, "deposit_to_savings_goal", {
    goalId,
    amount,
    transactionDate: date,
    note,
  });
}

export async function withdrawSavings(
  userId,
  goalId,
  amount,
  date = null,
  note = "",
) {
  return runSavingsMovementRpc(userId, "withdraw_from_savings_goal", {
    goalId,
    amount,
    transactionDate: date,
    note,
  });
}

/**
 * Update the legacy month savings target without modifying saved_amount.
 */
export async function updateSavingsGoal(userId, month, savingsGoalAmount) {
  const targetMonth = month || getCurrentMonth();

  if (!shouldUseFirebaseMonthlySystem() && isSupabaseConfigured()) {
    return {
      success: false,
      error: "Savings goals are managed individually on the Savings page.",
    };
  }

  try {
    if (!month) month = getCurrentMonth();
    if (typeof savingsGoalAmount !== "number" || savingsGoalAmount < 0) {
      return {
        success: false,
        error: "Savings goal must be a non-negative number",
      };
    }
    const monthRef = doc(db, "users", userId, "months", month);
    await ensureMonthDocumentExists(userId, month);
    await updateDoc(monthRef, {
      savingsGoal: savingsGoalAmount,
      updatedAt: new Date().toISOString(),
    });
    return { success: true, month, savingsGoal: savingsGoalAmount };
  } catch (error) {
    console.error("Error updating savings goal:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Add income entry for a month
 * Does NOT modify the budget
 */
export async function addIncome(userId, month, incomeData) {
  if (!shouldUseFirebaseMonthlySystem() && isSupabaseConfigured()) {
    const authenticatedUserId = await getAuthenticatedUserId(userId);
    if (!authenticatedUserId) {
      return {
        success: false,
        error: "User not authenticated for Supabase access.",
      };
    }

    const amount = Number(incomeData?.amount);
    if (!incomeData || !Number.isFinite(amount) || amount <= 0) {
      return { success: false, error: "Income amount must be positive" };
    }
    if (!incomeData.source) {
      return { success: false, error: "Income source is required" };
    }

    const payload = {
      user_id: authenticatedUserId,
      source: incomeData.source,
      amount: amount,
      received_date: incomeData.date || new Date().toISOString().split("T")[0],
      notes: incomeData.notes || "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("income")
      .insert(payload)
      .select()
      .single();
    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      incomeEntry: {
        id: data.id,
        amount: Number(data.amount) || 0,
        source: data.source,
        date: data.received_date,
        notes: data.notes || "",
        addedAt: data.created_at,
      },
    };
  }

  try {
    if (!month) month = getCurrentMonth();
    if (!incomeData.amount || incomeData.amount <= 0) {
      return { success: false, error: "Income amount must be positive" };
    }
    if (!incomeData.source) {
      return { success: false, error: "Income source is required" };
    }
    const monthRef = doc(db, "users", userId, "months", month);
    await ensureMonthDocumentExists(userId, month);
    const monthSnap = await getDoc(monthRef);
    const monthData = monthSnap.data();
    const currentIncome = monthData.income || [];
    const newIncomeEntry = {
      id: Date.now().toString(),
      amount: incomeData.amount,
      source: incomeData.source,
      date: incomeData.date || new Date().toISOString().split("T")[0],
      addedAt: new Date().toISOString(),
    };
    const updatedIncome = [...currentIncome, newIncomeEntry];
    await updateDoc(monthRef, {
      income: updatedIncome,
      updatedAt: new Date().toISOString(),
    });
    return { success: true, incomeEntry: newIncomeEntry };
  } catch (error) {
    console.error("Error adding income:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Add expense entry for a month
 */
export async function addExpenseToMonth(userId, month, expenseData) {
  if (!shouldUseFirebaseMonthlySystem() && isSupabaseConfigured()) {
    const authenticatedUserId = await getAuthenticatedUserId(userId);
    if (!authenticatedUserId) {
      return {
        success: false,
        error: "User not authenticated for Supabase access.",
      };
    }

    if (!expenseData || !expenseData.amount || expenseData.amount <= 0) {
      return { success: false, error: "Expense amount must be positive" };
    }
    if (!expenseData.category) {
      return { success: false, error: "Expense category is required" };
    }

    const categoryId = await resolveCategoryId(
      authenticatedUserId,
      expenseData.category,
    );
    if (!categoryId) {
      return {
        success: false,
        error: "Expense category not found for the authenticated user.",
      };
    }

    const payload = {
      user_id: authenticatedUserId,
      category_id: categoryId,
      description:
        expenseData.reason || expenseData.description || expenseData.category,
      amount: Number(expenseData.amount),
      expense_date: expenseData.date || new Date().toISOString().split("T")[0],
      notes: expenseData.notes || "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("expenses")
      .insert(payload)
      .select()
      .single();
    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      expenseEntry: {
        id: data.id,
        amount: Number(data.amount) || 0,
        category: expenseData.category,
        date: data.expense_date,
        reason: data.description,
        notes: data.notes || "",
        addedAt: data.created_at,
      },
    };
  }

  try {
    if (!month) month = getCurrentMonth();
    if (!expenseData.amount || expenseData.amount <= 0) {
      return { success: false, error: "Expense amount must be positive" };
    }
    if (!expenseData.category) {
      return { success: false, error: "Expense category is required" };
    }
    const monthRef = doc(db, "users", userId, "months", month);
    await ensureMonthDocumentExists(userId, month);
    const monthSnap = await getDoc(monthRef);
    const monthData = monthSnap.data();
    const currentExpenses = monthData.expenses || [];
    const newExpenseEntry = {
      id: Date.now().toString(),
      amount: expenseData.amount,
      category: expenseData.category,
      date: expenseData.date || new Date().toISOString().split("T")[0],
      reason: expenseData.reason || "Expense",
      addedAt: new Date().toISOString(),
    };
    const updatedExpenses = [...currentExpenses, newExpenseEntry];
    await updateDoc(monthRef, {
      expenses: updatedExpenses,
      updatedAt: new Date().toISOString(),
    });
    return { success: true, expenseEntry: newExpenseEntry };
  } catch (error) {
    console.error("Error adding expense:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get total income for a month
 */
export async function getTotalIncome(userId, month) {
  const targetMonth = month || getCurrentMonth();

  if (!shouldUseFirebaseMonthlySystem() && isSupabaseConfigured()) {
    const authenticatedUserId = await getAuthenticatedUserId(userId);
    if (!authenticatedUserId) {
      return {
        success: false,
        error: "User not authenticated for Supabase access.",
      };
    }

    const monthStart = `${targetMonth}-01`;
    const nextMonth = new Date(`${targetMonth}-01T00:00:00Z`);
    nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
    const monthEnd = nextMonth.toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("income")
      .select("amount")
      .eq("user_id", authenticatedUserId)
      .gte("received_date", monthStart)
      .lt("received_date", monthEnd);

    if (error) {
      return { success: false, error: error.message };
    }

    const total = (data || []).reduce(
      (sum, row) => sum + (Number(row.amount) || 0),
      0,
    );
    return { success: true, total, count: (data || []).length };
  }

  try {
    if (!month) month = getCurrentMonth();
    const monthRef = doc(db, "users", userId, "months", month);
    const monthSnap = await getDoc(monthRef);
    if (!monthSnap.exists()) return { success: true, total: 0 };
    const monthData = monthSnap.data();
    const incomeArray = monthData.income || [];
    const total = incomeArray.reduce((sum, inc) => sum + (inc.amount || 0), 0);
    return { success: true, total, count: incomeArray.length };
  } catch (error) {
    console.error("Error calculating total income:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get total expenses for a month
 */
export async function getTotalExpenses(userId, month) {
  const targetMonth = month || getCurrentMonth();

  if (!shouldUseFirebaseMonthlySystem() && isSupabaseConfigured()) {
    const authenticatedUserId = await getAuthenticatedUserId(userId);
    if (!authenticatedUserId) {
      return {
        success: false,
        error: "User not authenticated for Supabase access.",
      };
    }

    const monthStart = `${targetMonth}-01`;
    const nextMonth = new Date(`${targetMonth}-01T00:00:00Z`);
    nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
    const monthEnd = nextMonth.toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("expenses")
      .select("amount")
      .eq("user_id", authenticatedUserId)
      .gte("expense_date", monthStart)
      .lt("expense_date", monthEnd);

    if (error) {
      return { success: false, error: error.message };
    }

    const total = (data || []).reduce(
      (sum, row) => sum + (Number(row.amount) || 0),
      0,
    );
    return { success: true, total, count: (data || []).length };
  }

  try {
    if (!month) month = getCurrentMonth();
    const monthRef = doc(db, "users", userId, "months", month);
    const monthSnap = await getDoc(monthRef);
    if (!monthSnap.exists()) return { success: true, total: 0, count: 0 };
    const monthData = monthSnap.data();
    const expensesArray = monthData.expenses || [];
    const total = expensesArray.reduce(
      (sum, exp) => sum + (Number(exp.amount) || 0),
      0,
    );
    return { success: true, total, count: expensesArray.length };
  } catch (error) {
    console.error("Error calculating total expenses:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Legacy compatibility entry point; Supabase contributions use the deposit RPC.
 */
export async function addSavingsToGoal(userId, month, goalData) {
  const targetMonth = month || getCurrentMonth();
  const amount = Number(goalData?.amount ?? 0);

  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      success: false,
      error: "Savings amount must be a positive number.",
    };
  }

  if (!shouldUseFirebaseMonthlySystem() && isSupabaseConfigured()) {
    const authenticatedUserId = await getAuthenticatedUserId(userId);
    if (!authenticatedUserId) {
      return {
        success: false,
        error: "User not authenticated for Supabase access.",
      };
    }

    const goalId = goalData?.goalId;
    if (!goalId) {
      return { success: false, error: "Select a savings goal first." };
    }
    return addSavingsDeposit(
      authenticatedUserId,
      goalId,
      amount,
      goalData?.date || null,
      goalData?.note || "",
    );
  }

  try {
    const monthRef = doc(db, "users", userId, "months", targetMonth);
    await ensureMonthDocumentExists(userId, targetMonth);
    const monthSnap = await getDoc(monthRef);
    const monthData = monthSnap.data() || {};
    const currentSaved =
      Number(monthData.savedAmount ?? monthData.savings ?? 0) || 0;
    const nextSavedAmount = currentSaved + amount;

    await updateDoc(monthRef, {
      savedAmount: nextSavedAmount,
      savings: nextSavedAmount,
      updatedAt: new Date().toISOString(),
    });

    return {
      success: true,
      month: targetMonth,
      savings: nextSavedAmount,
      savedAmount: nextSavedAmount,
      targetAmount: Number(monthData.savingsGoal || 0),
    };
  } catch (error) {
    console.error("Error adding savings to goal:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get savings for a month as the explicit saved amount.
 */
export async function getSavings(userId, month) {
  try {
    const targetMonth = month || getCurrentMonth();

    if (!shouldUseFirebaseMonthlySystem() && isSupabaseConfigured()) {
      const authenticatedUserId = await getAuthenticatedUserId(userId);
      if (!authenticatedUserId) {
        return {
          success: false,
          error: "User not authenticated for Supabase access.",
        };
      }

      const { data, error } = await supabase
        .from("savings_goals")
        .select("saved_amount, target_amount")
        .eq("user_id", authenticatedUserId)
        .order("created_at", { ascending: true });

      if (error && error.code !== "PGRST116") {
        return { success: false, error: error.message };
      }

      const savedAmount = (data || []).reduce(
        (sum, goal) => sum + (Number(goal.saved_amount) || 0),
        0,
      );
      const targetAmount = (data || []).reduce(
        (sum, goal) => sum + (Number(goal.target_amount) || 0),
        0,
      );
      return {
        success: true,
        savings: savedAmount,
        savedAmount,
        targetAmount,
      };
    }

    const monthData = await getMonthData(userId, targetMonth);
    if (!monthData.success) {
      return {
        success: false,
        error: monthData.error || "Failed to calculate savings",
      };
    }

    const savedAmount = Number(monthData.savedAmount || monthData.savings || 0);
    return {
      success: true,
      savings: savedAmount,
      savedAmount,
      targetAmount: Number(monthData.savingsGoal || 0),
    };
  } catch (error) {
    console.error("Error calculating savings:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get complete month data
 */
export async function getMonthData(userId, month) {
  const targetMonth = month || getCurrentMonth();
  window.debugLog?.("[FINANCE] getMonthData called for month:", targetMonth);

  if (!shouldUseFirebaseMonthlySystem() && isSupabaseConfigured()) {
    const authenticatedUserId = await getAuthenticatedUserId(userId);
    if (!authenticatedUserId) {
      return {
        success: false,
        error: "User not authenticated for Supabase access.",
      };
    }

    const monthStart = `${targetMonth}-01`;
    const nextMonth = new Date(`${targetMonth}-01T00:00:00Z`);
    nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
    const monthEnd = nextMonth.toISOString().slice(0, 10);

    const [
      { data: budgetData, error: budgetError },
      { data: budgetRows, error: categoryBudgetError },
      { data: incomeRows, error: incomeError },
      { data: expenseRows, error: expenseError },
      { data: goalData, error: goalError },
      { data: savingsRows, error: savingsError },
      { data: openingSavingsRows, error: openingSavingsError },
    ] = await Promise.all([
      supabase
        .from("budgets")
        .select("*")
        .eq("user_id", authenticatedUserId)
        .gte("month", monthStart)
        .lt("month", monthEnd)
        .maybeSingle(),
      supabase
        .from("category_budgets")
        .select("*")
        .eq("user_id", authenticatedUserId)
        .eq("period", targetMonth),
      supabase
        .from("income")
        .select("*")
        .eq("user_id", authenticatedUserId)
        .gte("received_date", monthStart)
        .lt("received_date", monthEnd),
      supabase
        .from("expenses")
        .select("*")
        .eq("user_id", authenticatedUserId)
        .gte("expense_date", monthStart)
        .lt("expense_date", monthEnd),
      supabase
        .from("savings_goals")
        .select("*")
        .eq("user_id", authenticatedUserId)
        .order("created_at", { ascending: true }),
      supabase
        .from("savings_transactions")
        .select("id, goal_id, type, amount, transaction_date, note, created_at")
        .eq("user_id", authenticatedUserId)
        .gte("transaction_date", monthStart)
        .lt("transaction_date", monthEnd),
      supabase
        .from("savings_goal_opening_balances")
        .select("goal_id, opening_amount, effective_date")
        .eq("user_id", authenticatedUserId)
        .gte("effective_date", monthStart)
        .lt("effective_date", monthEnd),
    ]);

    if (budgetError && budgetError.code !== "PGRST116") {
      return { success: false, error: budgetError.message };
    }
    if (categoryBudgetError) {
      return { success: false, error: categoryBudgetError.message };
    }
    window.debugLog?.("[FINANCE] Supabase responses:", {
      budgetExists: Boolean(budgetData),
      budgetError: budgetError?.message || null,
      incomeRows: incomeRows?.length || 0,
      incomeError: incomeError?.message || null,
      expenseRows: expenseRows?.length || 0,
      expenseError: expenseError?.message || null,
      savingsGoals: goalData?.length || 0,
      savingsGoalError: goalError?.message || null,
    });
    if (incomeError) {
      return { success: false, error: incomeError.message };
    }
    if (expenseError) {
      return { success: false, error: expenseError.message };
    }
    if (goalError && goalError.code !== "PGRST116") {
      return { success: false, error: goalError.message };
    }
    if (savingsError) {
      return { success: false, error: savingsError.message };
    }
    if (openingSavingsError) {
      return { success: false, error: openingSavingsError.message };
    }

    const incomeList = (incomeRows || []).map(mapSupabaseIncomeRow);
    const expenseList = (expenseRows || []).map(async (row) => {
      const categoryName = await getCategoryNameFromId(
        authenticatedUserId,
        row.category_id,
      );
      return mapSupabaseExpenseRow(row, categoryName || "Other");
    });

    const resolvedExpenses = await Promise.all(expenseList);
    const totalIncome = incomeList.reduce(
      (sum, inc) => sum + (Number(inc.amount) || 0),
      0,
    );
    const totalExpenses = resolvedExpenses.reduce(
      (sum, exp) => sum + (Number(exp.amount) || 0),
      0,
    );
    const openingBalanceResult = await getSupabaseOpeningBalance(
      authenticatedUserId,
      monthStart,
    );
    if (!openingBalanceResult.success) {
      return { success: false, error: openingBalanceResult.error };
    }
    const openingBalance = openingBalanceResult.balance;
    const monthlySavingsDeposits = (savingsRows || [])
      .filter((row) => row.type === "deposit")
      .reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
    const monthlySavingsWithdrawals = (savingsRows || [])
      .filter((row) => row.type === "withdrawal")
      .reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
    const monthlyOpeningSavingsBalance = (openingSavingsRows || []).reduce(
      (sum, row) => sum + (Number(row.opening_amount) || 0),
      0,
    );
    const realTimeBalanceResult = await getSupabaseOpeningBalance(
      authenticatedUserId,
      getNextDateString(getAfricaLagosToday()),
    );
    if (!realTimeBalanceResult.success) {
      return { success: false, error: realTimeBalanceResult.error };
    }

    const budgetByCategory = { ...DEFAULT_CATEGORY_BUDGET };
    (budgetRows || []).forEach((row) => {
      const normalizedName = row.category_id ? " " : null;
      if (normalizedName === null) {
        return;
      }
    });

    const categoryNameMap = await loadCategoryMap(authenticatedUserId);
    const categoryBudgetRows = Array.isArray(budgetRows) ? budgetRows : [];
    categoryBudgetRows.forEach((row) => {
      if (!row?.category_id) return;

      const categoryName = Object.keys(categoryNameMap).find(
        (key) => categoryNameMap[key] === row.category_id,
      );
      if (!categoryName) return;

      const normalizedKey = categoryName.toLowerCase().replace(/\s+/g, "_");
      budgetByCategory[normalizedKey] = Number(row.amount) || 0;
    });

    const spentByCategory = calculateCategorySummary(resolvedExpenses);
    const remainingByCategory = calculateRemainingByCategory(
      budgetByCategory,
      resolvedExpenses,
    );
    const savingsGoal = (goalData || []).reduce(
      (sum, goal) => sum + (Number(goal.target_amount) || 0),
      0,
    );
    const savedAmount = (goalData || []).reduce(
      (sum, goal) => sum + (Number(goal.saved_amount) || 0),
      0,
    );
    const goalNameById = new Map(
      (goalData || []).map((goal) => [
        String(goal.id),
        goal.name || "Savings goal",
      ]),
    );
    const monthlySavingsTransactions = (savingsRows || []).map(
      (transaction) => ({
        ...transaction,
        goalName:
          goalNameById.get(String(transaction.goal_id)) || "Savings goal",
      }),
    );
    const closingBalance = calculateLedgerClosingBalance(
      openingBalance,
      totalIncome,
      totalExpenses,
      monthlySavingsDeposits + monthlyOpeningSavingsBalance,
      monthlySavingsWithdrawals,
    );

    return {
      success: true,
      month: targetMonth,
      budget: Number(budgetData?.amount || 0),
      budgetByCategory,
      income: incomeList,
      expenses: resolvedExpenses,
      totalIncome,
      totalExpenses,
      savings: savedAmount,
      savedAmount,
      savingsGoal,
      openingBalance,
      closingBalance,
      availableBalance: realTimeBalanceResult.balance,
      monthlySavingsDeposits,
      monthlySavingsWithdrawals,
      monthlyOpeningSavingsBalance,
      savingsTransactions: monthlySavingsTransactions,
      spentByCategory,
      remainingByCategory,
      createdAt: budgetData?.created_at || null,
      updatedAt: budgetData?.updated_at || null,
    };
  }

  try {
    if (!month) month = getCurrentMonth();
    const monthRef = doc(db, "users", userId, "months", month);
    const monthSnap = await getDoc(monthRef);
    if (!monthSnap.exists()) {
      await ensureMonthDocumentExists(userId, month);
      return {
        success: true,
        month,
        budget: 0,
        budgetByCategory: { ...DEFAULT_CATEGORY_BUDGET },
        income: [],
        expenses: [],
        totalIncome: 0,
        totalExpenses: 0,
        savings: 0,
        savedAmount: 0,
        savingsGoal: 0,
        openingBalance: 0,
        closingBalance: 0,
        availableBalance: 0,
        monthlySavingsDeposits: 0,
        monthlySavingsWithdrawals: 0,
        spentByCategory: { ...DEFAULT_CATEGORY_BUDGET },
        remainingByCategory: { ...DEFAULT_CATEGORY_BUDGET },
      };
    }
    const monthData = monthSnap.data();
    const budgetByCategory = normalizeBudgetObject(monthData.budget);
    const totalIncome = (monthData.income || []).reduce(
      (sum, inc) => sum + (Number(inc.amount) || 0),
      0,
    );
    const totalExpenses = (monthData.expenses || []).reduce(
      (sum, exp) => sum + (Number(exp.amount) || 0),
      0,
    );
    const previousMonth = getPreviousMonth(month);
    let openingBalance = 0;

    if (previousMonth) {
      const previousMonthData = await getMonthData(userId, previousMonth);
      if (previousMonthData?.success) {
        openingBalance = Number(
          previousMonthData.closingBalance ??
            previousMonthData.availableBalance ??
            previousMonthData.openingBalance ??
            0,
        );
      }
    }

    const closingBalance = calculateLedgerClosingBalance(
      openingBalance,
      totalIncome,
      totalExpenses,
      0,
      0,
    );
    const spentByCategory = calculateCategorySummary(monthData.expenses || []);
    const remainingByCategory = calculateRemainingByCategory(
      budgetByCategory,
      monthData.expenses || [],
    );
    const savedAmount = Number(monthData.savedAmount || 0);
    return {
      success: true,
      month,
      budget: getTotalBudget(budgetByCategory),
      budgetByCategory,
      income: monthData.income || [],
      expenses: monthData.expenses || [],
      totalIncome,
      totalExpenses,
      savings: savedAmount,
      savedAmount,
      savingsGoal: monthData.savingsGoal || 0,
      openingBalance,
      closingBalance,
      availableBalance: closingBalance,
      monthlySavingsDeposits: 0,
      monthlySavingsWithdrawals: 0,
      spentByCategory,
      remainingByCategory,
      createdAt: monthData.createdAt,
      updatedAt: monthData.updatedAt,
    };
  } catch (error) {
    console.error("[Monthly System] data load failed for month data:", error);
    return { success: false, error: error.message };
  }
}

async function getCategoryNameFromId(userId, categoryId) {
  if (!categoryId) return "Other";

  const { data, error } = await supabase
    .from("categories")
    .select("name")
    .eq("user_id", userId)
    .eq("id", categoryId)
    .maybeSingle();

  if (error || !data) {
    return "Other";
  }

  return data.name || "Other";
}

/**
 * Get a monthly summary with category spending and remaining amounts.
 */
export async function getMonthlySummary(userId, month) {
  const monthData = await getMonthData(userId, month);
  if (!monthData.success) {
    return monthData;
  }
  return {
    success: true,
    month: monthData.month,
    budget: monthData.budget,
    budgetByCategory: monthData.budgetByCategory,
    income: monthData.income,
    expenses: monthData.expenses,
    totalIncome: monthData.totalIncome,
    totalExpenses: monthData.totalExpenses,
    savings: monthData.savings,
    spentByCategory: monthData.spentByCategory,
    remainingByCategory: monthData.remainingByCategory,
    createdAt: monthData.createdAt,
    updatedAt: monthData.updatedAt,
  };
}

/**
 * Get all months for a user with summary data
 */
export async function getAllMonths(userId) {
  if (!shouldUseFirebaseMonthlySystem() && isSupabaseConfigured()) {
    const authenticatedUserId = await getAuthenticatedUserId(userId);
    if (!authenticatedUserId) {
      return {
        success: false,
        error: "User not authenticated for Supabase access.",
      };
    }

    const [
      { data: budgetMonths, error: budgetError },
      { data: incomeMonths, error: incomeError },
      { data: expenseMonths, error: expenseError },
      { data: savingsMonths, error: savingsError },
    ] = await Promise.all([
      supabase
        .from("budgets")
        .select("month, amount")
        .eq("user_id", authenticatedUserId)
        .order("month", { ascending: false }),
      supabase
        .from("income")
        .select("received_date")
        .eq("user_id", authenticatedUserId),
      supabase
        .from("expenses")
        .select("expense_date")
        .eq("user_id", authenticatedUserId),
      supabase
        .from("savings_transactions")
        .select("transaction_date")
        .eq("user_id", authenticatedUserId),
    ]);

    if (budgetError) return { success: false, error: budgetError.message };
    if (incomeError) return { success: false, error: incomeError.message };
    if (expenseError) return { success: false, error: expenseError.message };
    if (savingsError) return { success: false, error: savingsError.message };

    const monthSet = new Set();
    (budgetMonths || []).forEach((row) =>
      monthSet.add(normalizeSupabaseMonthValue(row.month)),
    );
    (incomeMonths || []).forEach((row) =>
      monthSet.add(getMonthFromDate(row.received_date)),
    );
    (expenseMonths || []).forEach((row) =>
      monthSet.add(getMonthFromDate(row.expense_date)),
    );
    (savingsMonths || []).forEach((row) => {
      if (row.transaction_date) {
        monthSet.add(getMonthFromDate(row.transaction_date));
      }
    });

    const months = [];
    for (const month of Array.from(monthSet).filter(Boolean).sort().reverse()) {
      const monthData = await getMonthData(authenticatedUserId, month);
      if (monthData.success) {
        months.push({
          month,
          budget: monthData.budget,
          budgetByCategory: monthData.budgetByCategory,
          totalIncome: monthData.totalIncome,
          totalExpenses: monthData.totalExpenses,
          savings: monthData.savings,
          incomeCount: (monthData.income || []).length,
          expenseCount: (monthData.expenses || []).length,
          createdAt: monthData.createdAt,
        });
      }
    }

    return { success: true, months, count: months.length };
  }

  try {
    const monthsRef = collection(db, "users", userId, "months");
    const monthsSnap = await getDocs(monthsRef);
    const months = [];
    monthsSnap.forEach((monthDoc) => {
      const monthData = monthDoc.data();
      const budgetByCategory = normalizeBudgetObject(monthData.budget);
      const totalIncome = (monthData.income || []).reduce(
        (sum, inc) => sum + (Number(inc.amount) || 0),
        0,
      );
      const totalExpenses = (monthData.expenses || []).reduce(
        (sum, exp) => sum + (Number(exp.amount) || 0),
        0,
      );
      months.push({
        month: monthDoc.id,
        budget: getTotalBudget(budgetByCategory),
        budgetByCategory,
        totalIncome,
        totalExpenses,
        savings: totalIncome - totalExpenses,
        incomeCount: (monthData.income || []).length,
        expenseCount: (monthData.expenses || []).length,
        createdAt: monthData.createdAt,
      });
    });
    months.sort((a, b) => b.month.localeCompare(a.month));
    return { success: true, months, count: months.length };
  } catch (error) {
    console.error("[Monthly System] data load failed for all months:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete an income entry from a month
 */
export async function deleteIncomeEntry(userId, month, incomeId) {
  if (isSupabaseConfigured()) {
    const authenticatedUserId = await getAuthenticatedUserId(userId);
    if (!authenticatedUserId) {
      return {
        success: false,
        error: "User not authenticated for Supabase access.",
      };
    }

    const { error } = await supabase
      .from("income")
      .delete()
      .eq("id", incomeId)
      .eq("user_id", authenticatedUserId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  }

  try {
    if (!month) month = getCurrentMonth();
    const monthRef = doc(db, "users", userId, "months", month);
    const monthSnap = await getDoc(monthRef);
    if (!monthSnap.exists())
      return { success: false, error: "Month not found" };
    const monthData = monthSnap.data();
    const updatedIncome = (monthData.income || []).filter(
      (inc) => inc.id !== incomeId,
    );
    await updateDoc(monthRef, {
      income: updatedIncome,
      updatedAt: new Date().toISOString(),
    });
    return { success: true };
  } catch (error) {
    console.error("Error deleting income entry:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete an expense entry from a month
 */
export async function deleteExpenseEntry(userId, month, expenseId) {
  if (isSupabaseConfigured()) {
    const authenticatedUserId = await getAuthenticatedUserId(userId);
    if (!authenticatedUserId) {
      return {
        success: false,
        error: "User not authenticated for Supabase access.",
      };
    }

    const { error } = await supabase
      .from("expenses")
      .delete()
      .eq("id", expenseId)
      .eq("user_id", authenticatedUserId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  }

  try {
    if (!month) month = getCurrentMonth();
    const monthRef = doc(db, "users", userId, "months", month);
    const monthSnap = await getDoc(monthRef);
    if (!monthSnap.exists())
      return { success: false, error: `Month ${month} not found` };
    const monthData = monthSnap.data();
    const currentExpenses = Array.isArray(monthData.expenses)
      ? monthData.expenses
      : [];
    const expenseExists = currentExpenses.some(
      (exp) => String(exp.id) === String(expenseId),
    );
    if (!expenseExists)
      return { success: false, error: "Expense was not found in this month" };
    const updatedExpenses = currentExpenses.filter(
      (exp) => String(exp.id) !== String(expenseId),
    );
    await updateDoc(monthRef, {
      expenses: updatedExpenses,
      updatedAt: new Date().toISOString(),
    });
    return { success: true };
  } catch (error) {
    console.error("[DELETE] Error deleting expense entry:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get list of all unique months user has data for
 */
export async function getUserMonthsList(userId) {
  if (!shouldUseFirebaseMonthlySystem() && isSupabaseConfigured()) {
    const authenticatedUserId = await getAuthenticatedUserId(userId);
    if (!authenticatedUserId) {
      return {
        success: false,
        error: "User not authenticated for Supabase access.",
      };
    }

    const [
      { data: budgetData, error: budgetError },
      { data: incomeData, error: incomeError },
      { data: expenseData, error: expenseError },
      { data: savingsData, error: savingsError },
    ] = await Promise.all([
      supabase
        .from("budgets")
        .select("month")
        .eq("user_id", authenticatedUserId),
      supabase
        .from("income")
        .select("received_date")
        .eq("user_id", authenticatedUserId),
      supabase
        .from("expenses")
        .select("expense_date")
        .eq("user_id", authenticatedUserId),
      supabase
        .from("savings_transactions")
        .select("transaction_date")
        .eq("user_id", authenticatedUserId),
    ]);

    if (budgetError) return { success: false, error: budgetError.message };
    if (incomeError) return { success: false, error: incomeError.message };
    if (expenseError) return { success: false, error: expenseError.message };
    if (savingsError) return { success: false, error: savingsError.message };

    const months = new Set();
    (budgetData || []).forEach((row) => {
      const month = normalizeSupabaseMonthValue(row.month);
      if (month) months.add(month);
    });
    (incomeData || []).forEach((row) => {
      if (row.received_date) months.add(getMonthFromDate(row.received_date));
    });
    (expenseData || []).forEach((row) => {
      if (row.expense_date) months.add(getMonthFromDate(row.expense_date));
    });
    (savingsData || []).forEach((row) => {
      if (row.transaction_date) {
        months.add(getMonthFromDate(row.transaction_date));
      }
    });

    return { success: true, months: Array.from(months).sort().reverse() };
  }

  try {
    const monthsRef = collection(db, "users", userId, "months");
    const monthsSnap = await getDocs(monthsRef);
    const months = [];
    monthsSnap.forEach((monthDoc) => months.push(monthDoc.id));
    months.sort().reverse();
    return { success: true, months };
  } catch (error) {
    console.error("Error getting user months list:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Create month document if it does not exist.
 */
export async function createMonthIfNotExists(userId, month = null) {
  return ensureMonthDocumentExists(userId, month);
}

/**
 * Add an expense to a month (category-aware, does not reduce budget directly).
 */
export async function addExpense(userId, month, expenseData) {
  if (!month) {
    month = expenseData?.date
      ? getMonthFromDate(expenseData.date)
      : getCurrentMonth();
  }
  return addExpenseToMonth(userId, month, expenseData);
}

/**
 * Calculate how much has been spent in a category.
 */
export function calculateCategorySpent(expenses, category) {
  return (expenses || []).reduce((sum, expense) => {
    if (!expense || expense.category !== category) return sum;
    return sum + (Number(expense.amount) || 0);
  }, 0);
}
