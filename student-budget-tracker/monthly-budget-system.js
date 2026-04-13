/**
 * Monthly Budget System Module
 * Handles monthly-based budget structure with backward compatibility
 * 
 * Structure: users/{userId}/months/{YYYY-MM}/
 *   - budget: { food, transport, data, other }
 *   - income: [{ amount, source, date }, ...]
 *   - expenses: [{ amount, category, date, reason }, ...]
 *   - savingsGoal: number (default 0)
 */

import { db, doc, setDoc, getDoc, updateDoc, collection, getDocs, query, orderBy } from './firebase-config.js';

const DEFAULT_CATEGORY_BUDGET = {
    food: 0,
    transport: 0,
    data: 0,
    other: 0
};

function normalizeBudgetObject(budget) {
    if (budget == null) {
        return { ...DEFAULT_CATEGORY_BUDGET };
    }

    if (typeof budget === 'number') {
        return {
            ...DEFAULT_CATEGORY_BUDGET,
            other: budget
        };
    }

    if (typeof budget === 'object') {
        return {
            ...DEFAULT_CATEGORY_BUDGET,
            ...budget
        };
    }

    return { ...DEFAULT_CATEGORY_BUDGET };
}

function normalizeBudgetInput(budgetInput) {
    if (budgetInput == null) {
        return null;
    }

    if (typeof budgetInput === 'number') {
        return {
            other: budgetInput
        };
    }

    if (typeof budgetInput === 'object') {
        if (typeof budgetInput.amount === 'number' && typeof budgetInput.category === 'string') {
            return {
                [budgetInput.category]: budgetInput.amount
            };
        }

        const normalized = {};
        Object.entries(budgetInput).forEach(([key, value]) => {
            if (DEFAULT_CATEGORY_BUDGET.hasOwnProperty(key) && typeof value === 'number') {
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
        ...normalizedInput
    };
}

function getTotalBudget(budgetObject) {
    return Object.values(normalizeBudgetObject(budgetObject)).reduce((sum, amount) => sum + (Number(amount) || 0), 0);
}

function calculateCategorySummary(expenses) {
    const spent = { ...DEFAULT_CATEGORY_BUDGET };
    (expenses || []).forEach(expense => {
        const category = expense?.category && DEFAULT_CATEGORY_BUDGET.hasOwnProperty(expense.category)
            ? expense.category
            : 'other';
        spent[category] = (spent[category] || 0) + (Number(expense.amount) || 0);
    });
    return spent;
}

function calculateRemainingByCategory(budgetObject, expenses) {
    const normalizedBudget = normalizeBudgetObject(budgetObject);
    const spent = calculateCategorySummary(expenses);
    const remaining = {};

    Object.keys(normalizedBudget).forEach(category => {
        remaining[category] = normalizedBudget[category] - (spent[category] || 0);
    });

    return remaining;
}

/**
 * Get current month in YYYY-MM format
 */
export function getCurrentMonth() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

/**
 * Get month from date string (YYYY-MM-DD or Date object)
 */
export function getMonthFromDate(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

/**
 * Ensure month document exists in Firebase, create if needed
 */
export async function ensureMonthDocumentExists(userId, month = null) {
    try {
        if (!month) month = getCurrentMonth();
        
        const monthRef = doc(db, 'users', userId, 'months', month);
        const monthSnap = await getDoc(monthRef);
        
        if (!monthSnap.exists()) {
            // Create new month document with category budgets and savings goal
            await setDoc(monthRef, {
                budget: { ...DEFAULT_CATEGORY_BUDGET },
                income: [],
                expenses: [],
                savingsGoal: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            console.log(`Created new month document: ${month}`);
        }
        
        return { success: true, month };
    } catch (error) {
        console.error('Error ensuring month document exists:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Update budget for a specific month (FIXED, not auto-updated by income)
 */
export async function updateBudget(userId, month, newBudgetInput) {
    try {
        if (!month) month = getCurrentMonth();
        const monthRef = doc(db, 'users', userId, 'months', month);
        
        // Ensure document exists first
        await ensureMonthDocumentExists(userId, month);
        
        const monthSnap = await getDoc(monthRef);
        const monthData = monthSnap.exists() ? monthSnap.data() : {};
        const mergedBudget = mergeBudgetObjects(monthData.budget, newBudgetInput);
        
        await updateDoc(monthRef, {
            budget: mergedBudget,
            updatedAt: new Date().toISOString()
        });
        
        console.log(`Budget updated for ${month}:`, mergedBudget);
        return {
            success: true,
            month,
            budget: getTotalBudget(mergedBudget),
            budgetByCategory: mergedBudget
        };
    } catch (error) {
        console.error('Error updating budget:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Update savings goal for a specific month
 */
export async function updateSavingsGoal(userId, month, savingsGoalAmount) {
    try {
        if (!month) month = getCurrentMonth();
        
        if (typeof savingsGoalAmount !== 'number' || savingsGoalAmount < 0) {
            return { success: false, error: 'Savings goal must be a non-negative number' };
        }
        
        const monthRef = doc(db, 'users', userId, 'months', month);
        
        // Ensure document exists first
        await ensureMonthDocumentExists(userId, month);
        
        await updateDoc(monthRef, {
            savingsGoal: savingsGoalAmount,
            updatedAt: new Date().toISOString()
        });
        
        console.log(`Savings goal updated for ${month}:`, savingsGoalAmount);
        return {
            success: true,
            month,
            savingsGoal: savingsGoalAmount
        };
    } catch (error) {
        console.error('Error updating savings goal:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Add income entry for a month
 * Does NOT modify the budget
 */
export async function addIncome(userId, month, incomeData) {
    try {
        if (!month) month = getCurrentMonth();
        if (!incomeData.amount || incomeData.amount <= 0) {
            return { success: false, error: 'Income amount must be positive' };
        }
        if (!incomeData.source) {
            return { success: false, error: 'Income source is required' };
        }
        
        const monthRef = doc(db, 'users', userId, 'months', month);
        
        // Ensure document exists first
        await ensureMonthDocumentExists(userId, month);
        
        // Get current month data
        const monthSnap = await getDoc(monthRef);
        const monthData = monthSnap.data();
        const currentIncome = monthData.income || [];
        
        // Add new income entry
        const newIncomeEntry = {
            id: Date.now().toString(),
            amount: incomeData.amount,
            source: incomeData.source,
            date: incomeData.date || new Date().toISOString().split('T')[0],
            addedAt: new Date().toISOString()
        };
        
        const updatedIncome = [...currentIncome, newIncomeEntry];
        
        // Update in Firebase
        await updateDoc(monthRef, {
            income: updatedIncome,
            updatedAt: new Date().toISOString()
        });
        
        console.log(`Income added for ${month}:`, newIncomeEntry);
        return { success: true, incomeEntry: newIncomeEntry };
    } catch (error) {
        console.error('Error adding income:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Add expense entry for a month
 */
export async function addExpenseToMonth(userId, month, expenseData) {
    try {
        if (!month) month = getCurrentMonth();
        if (!expenseData.amount || expenseData.amount <= 0) {
            return { success: false, error: 'Expense amount must be positive' };
        }
        if (!expenseData.category) {
            return { success: false, error: 'Expense category is required' };
        }
        
        const monthRef = doc(db, 'users', userId, 'months', month);
        
        // Ensure document exists first
        await ensureMonthDocumentExists(userId, month);
        
        // Get current month data
        const monthSnap = await getDoc(monthRef);
        const monthData = monthSnap.data();
        const currentExpenses = monthData.expenses || [];
        
        // Add new expense entry
        const newExpenseEntry = {
            id: Date.now().toString(),
            amount: expenseData.amount,
            category: expenseData.category,
            date: expenseData.date || new Date().toISOString().split('T')[0],
            reason: expenseData.reason || 'Expense',
            addedAt: new Date().toISOString()
        };
        
        const updatedExpenses = [...currentExpenses, newExpenseEntry];
        
        // Update in Firebase
        await updateDoc(monthRef, {
            expenses: updatedExpenses,
            updatedAt: new Date().toISOString()
        });
        
        console.log(`Expense added for ${month}:`, newExpenseEntry);
        return { success: true, expenseEntry: newExpenseEntry };
    } catch (error) {
        console.error('Error adding expense:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get total income for a month
 */
export async function getTotalIncome(userId, month) {
    try {
        if (!month) month = getCurrentMonth();
        
        const monthRef = doc(db, 'users', userId, 'months', month);
        const monthSnap = await getDoc(monthRef);
        
        if (!monthSnap.exists()) {
            return { success: true, total: 0 };
        }
        
        const monthData = monthSnap.data();
        const incomeArray = monthData.income || [];
        const total = incomeArray.reduce((sum, inc) => sum + (inc.amount || 0), 0);
        
        return { success: true, total, count: incomeArray.length };
    } catch (error) {
        console.error('Error calculating total income:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get total expenses for a month
 */
export async function getTotalExpenses(userId, month) {
    try {
        if (!month) month = getCurrentMonth();
        
        const monthRef = doc(db, 'users', userId, 'months', month);
        const monthSnap = await getDoc(monthRef);
        
        if (!monthSnap.exists()) {
            return { success: true, total: 0, count: 0 };
        }
        
        const monthData = monthSnap.data();
        const expensesArray = monthData.expenses || [];
        const total = expensesArray.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
        
        return { success: true, total, count: expensesArray.length };
    } catch (error) {
        console.error('Error calculating total expenses:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get savings for a month (income - expenses)
 */
export async function getSavings(userId, month) {
    try {
        if (!month) month = getCurrentMonth();
        
        const incomeResult = await getTotalIncome(userId, month);
        const expensesResult = await getTotalExpenses(userId, month);
        
        if (!incomeResult.success || !expensesResult.success) {
            return { success: false, error: 'Failed to calculate savings' };
        }
        
        const savings = incomeResult.total - expensesResult.total;
        
        return {
            success: true,
            income: incomeResult.total,
            expenses: expensesResult.total,
            savings: savings
        };
    } catch (error) {
        console.error('Error calculating savings:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get complete month data
 */
export async function getMonthData(userId, month) {
    try {
        if (!month) month = getCurrentMonth();
        
        const monthRef = doc(db, 'users', userId, 'months', month);
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
                savingsGoal: 0,
                spentByCategory: { ...DEFAULT_CATEGORY_BUDGET },
                remainingByCategory: { ...DEFAULT_CATEGORY_BUDGET }
            };
        }
        
        const monthData = monthSnap.data();
        const budgetByCategory = normalizeBudgetObject(monthData.budget);
        const totalIncome = (monthData.income || []).reduce((sum, inc) => sum + (Number(inc.amount) || 0), 0);
        const totalExpenses = (monthData.expenses || []).reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
        const spentByCategory = calculateCategorySummary(monthData.expenses || []);
        const remainingByCategory = calculateRemainingByCategory(budgetByCategory, monthData.expenses || []);

        return {
            success: true,
            month,
            budget: getTotalBudget(budgetByCategory),
            budgetByCategory,
            income: monthData.income || [],
            expenses: monthData.expenses || [],
            totalIncome,
            totalExpenses,
            savings: totalIncome - totalExpenses,
            savingsGoal: monthData.savingsGoal || 0,
            spentByCategory,
            remainingByCategory,
            createdAt: monthData.createdAt,
            updatedAt: monthData.updatedAt
        };
    } catch (error) {
        console.error('Error getting month data:', error);
        return { success: false, error: error.message };
    }
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
        updatedAt: monthData.updatedAt
    };
}

/**
 * Get all months for a user with summary data
 */
export async function getAllMonths(userId) {
    try {
        const monthsRef = collection(db, 'users', userId, 'months');
        const monthsSnap = await getDocs(monthsRef);
        
        const months = [];
        
        monthsSnap.forEach(monthDoc => {
            const monthData = monthDoc.data();
            const budgetByCategory = normalizeBudgetObject(monthData.budget);
            const totalIncome = (monthData.income || []).reduce((sum, inc) => sum + (Number(inc.amount) || 0), 0);
            const totalExpenses = (monthData.expenses || []).reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
            
            months.push({
                month: monthDoc.id,
                budget: getTotalBudget(budgetByCategory),
                budgetByCategory,
                totalIncome,
                totalExpenses,
                savings: totalIncome - totalExpenses,
                incomeCount: (monthData.income || []).length,
                expenseCount: (monthData.expenses || []).length,
                createdAt: monthData.createdAt
            });
        });
        
        months.sort((a, b) => b.month.localeCompare(a.month));
        
        return { success: true, months, count: months.length };
    } catch (error) {
        console.error('Error getting all months:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Delete an income entry from a month
 */
export async function deleteIncomeEntry(userId, month, incomeId) {
    try {
        if (!month) month = getCurrentMonth();
        
        const monthRef = doc(db, 'users', userId, 'months', month);
        const monthSnap = await getDoc(monthRef);
        
        if (!monthSnap.exists()) {
            return { success: false, error: 'Month not found' };
        }
        
        const monthData = monthSnap.data();
        const updatedIncome = (monthData.income || []).filter(inc => inc.id !== incomeId);
        
        await updateDoc(monthRef, {
            income: updatedIncome,
            updatedAt: new Date().toISOString()
        });
        
        console.log(`Income entry deleted: ${incomeId}`);
        return { success: true };
    } catch (error) {
        console.error('Error deleting income entry:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Delete an expense entry from a month
 */
export async function deleteExpenseEntry(userId, month, expenseId) {
    try {
        if (!month) month = getCurrentMonth();
        
        const monthRef = doc(db, 'users', userId, 'months', month);
        const monthSnap = await getDoc(monthRef);
        
        if (!monthSnap.exists()) {
            return { success: false, error: 'Month not found' };
        }
        
        const monthData = monthSnap.data();
        const updatedExpenses = (monthData.expenses || []).filter(exp => exp.id !== expenseId);
        
        await updateDoc(monthRef, {
            expenses: updatedExpenses,
            updatedAt: new Date().toISOString()
        });
        
        console.log(`Expense entry deleted: ${expenseId}`);
        return { success: true };
    } catch (error) {
        console.error('Error deleting expense entry:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Migrate old expense data to monthly structure (BACKWARD COMPATIBILITY)
 * This is a one-time migration that maps existing expenses to months
 */
export async function migrateOldExpensesToMonthly(userId, oldExpenses = []) {
    try {
        if (!oldExpenses || oldExpenses.length === 0) {
            console.log('No old expenses to migrate');
            return { success: true, migrated: 0 };
        }
        
        const monthsMap = {};
        let migratedCount = 0;
        
        // Group expenses by month
        oldExpenses.forEach(expense => {
            const month = getMonthFromDate(expense.date);
            if (!monthsMap[month]) {
                monthsMap[month] = [];
            }
            monthsMap[month].push(expense);
        });
        
        // Add expenses to each month
        for (const [month, expenses] of Object.entries(monthsMap)) {
            await ensureMonthDocumentExists(userId, month);
            
            const monthRef = doc(db, 'users', userId, 'months', month);
            const monthSnap = await getDoc(monthRef);
            const monthData = monthSnap.data();
            
            const currentExpenses = monthData.expenses || [];
            const expensesToAdd = expenses.map(exp => ({
                id: exp.id || Date.now().toString(),
                amount: exp.amount,
                category: exp.category,
                date: exp.date,
                reason: exp.reason || 'Migrated expense',
                addedAt: exp.addedDate || new Date().toISOString()
            }));
            
            const updatedExpenses = [...currentExpenses, ...expensesToAdd];
            
            await updateDoc(monthRef, {
                expenses: updatedExpenses,
                updatedAt: new Date().toISOString()
            });
            
            migratedCount += expensesToAdd.length;
            console.log(`Migrated ${expensesToAdd.length} expenses to ${month}`);
        }
        
        return { success: true, migrated: migratedCount };
    } catch (error) {
        console.error('Error migrating old expenses:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get list of all unique months user has data for
 */
export async function getUserMonthsList(userId) {
    try {
        const monthsRef = collection(db, 'users', userId, 'months');
        const monthsSnap = await getDocs(monthsRef);
        
        const months = [];
        monthsSnap.forEach(monthDoc => {
            months.push(monthDoc.id);
        });
        
        // Sort in descending order
        months.sort().reverse();
        
        return { success: true, months };
    } catch (error) {
        console.error('Error getting user months list:', error);
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
        month = expenseData?.date ? getMonthFromDate(expenseData.date) : getCurrentMonth();
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

