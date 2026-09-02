/**
 * Firestore Sync Module
 * Handles syncing data to/from Firestore
 * 
 * NEW STRUCTURE:
 * users/{uid}/budget/data (main document)
 *   ├── income (budget amount)
 *   ├── savingsGoal
 *   ├── balance (calculated)
 *   └── updatedAt
 * 
 * users/{uid}/expenses/ (subcollection)
 *   ├── {expenseId1} (document)
 *   │   ├── amount
 *   │   ├── category
 *   │   ├── date
 *   │   ├── reason
 *   │   └── addedDate
 *   └── {expenseId2}
 *       └── ...
 */

import {
    db,
    doc,
    setDoc,
    getDoc,
    updateDoc,
    collection,
    addDoc,
    deleteDoc,
    getDocs,
    query,
    orderBy
} from './firebase-config.js';

import {
    getCurrentMonth,
    addExpenseToMonth
} from './monthly-budget-system.js?v=4.0';

/**
 * DEPRECATED: saveBudgetToFirestore
 * Old system is no longer used. All data is stored in users/{uid}/months/{YYYY-MM}
 * This function is kept for backwards compatibility only and should not be called.
 */
export async function saveBudgetToFirestore(uid, budget) {
    console.warn('[Firestore] saveBudgetToFirestore is DEPRECATED. Use monthly system instead.');
    return { success: true };
}

/**
 * Add a single expense to the current month's document
 * UPDATED: Now uses monthly-budget-system which stores expenses in users/{uid}/months/{YYYY-MM}
 */
export async function addExpenseToFirestore(uid, expense) {
    try {
        const month = getCurrentMonth();
        
        // Use the monthly system to add expense
        const result = await addExpenseToMonth(uid, month, {
            amount: expense.amount,
            category: expense.category,
            date: expense.date,
            reason: expense.reason || 'Expense',
            addedDate: new Date().toISOString()
        });

        if (result.success) {
            console.log('Expense added to monthly system for', month);
            return { success: true, id: result.expenseEntry?.id || Date.now().toString() };
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Error adding expense to Firebase monthly system:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Update a single expense document
 */
export async function updateExpenseInFirestore(uid, expenseId, updates) {
    try {
        const expenseRef = doc(db, 'users', uid, 'expenses', expenseId);
        
        await updateDoc(expenseRef, {
            ...updates,
            updatedDate: new Date().toISOString()
        });

        return { success: true };
    } catch (error) {
        console.error('Error updating expense:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Delete a single expense document
 */
export async function deleteExpenseFromFirestore(uid, expenseId) {
    try {
        const expenseRef = doc(db, 'users', uid, 'expenses', expenseId);
        await deleteDoc(expenseRef);

        console.log('Expense deleted:', expenseId);
        return { success: true };
    } catch (error) {
        console.error('Error deleting expense:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Load all expenses from subcollection
 */
export async function loadExpensesFromFirestore(uid) {
    try {
        console.log(`[Firestore] Loading expenses from users/${uid}/expenses/`);
        const expensesRef = collection(db, 'users', uid, 'expenses');
        const q = query(expensesRef, orderBy('date', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const expenses = [];
        querySnapshot.forEach(doc => {
            expenses.push({
                id: doc.id,
                ...doc.data()
            });
        });

        console.log(`[Firestore] Loaded ${expenses.length} expenses from Firestore`);
        if (expenses.length > 0) {
            console.log('[Firestore] Sample expense:', expenses[0]);
        }
        return {
            success: true,
            expenses: expenses
        };
    } catch (error) {
        console.error('[Firestore] Error loading expenses:', error.code, error.message);
        console.warn('Could not load expenses from Firestore (may be offline):', error.message);
        return {
            success: true,
            expenses: []
        };
    }
}

/**
 * DEPRECATED: saveExpensesToFirestore
 * Old system is no longer used. All data is stored in users/{uid}/months/{YYYY-MM}
 * This function is kept for backwards compatibility only and should not be called.
 */
export async function saveExpensesToFirestore(uid, expenses) {
    console.warn('[Firestore] saveExpensesToFirestore is DEPRECATED. Use monthly system instead.');
    return { success: true };
}

/**
 * DEPRECATED: saveSavingsGoalToFirestore
 * Old system is no longer used. All data is stored in users/{uid}/months/{YYYY-MM}
 * This function is kept for backwards compatibility only and should not be called.
 */
export async function saveSavingsGoalToFirestore(uid, savingsGoal) {
    console.warn('[Firestore] saveSavingsGoalToFirestore is DEPRECATED. Use monthly system instead.');
    return { success: true };
}

/**
 * DEPRECATED: loadBudgetFromFirestore
 * Old system is no longer used. All data is stored in users/{uid}/months/{YYYY-MM}
 * This function is kept for backwards compatibility only and should not be called.
 */
export async function loadBudgetFromFirestore(uid) {
    console.warn('[Firestore] loadBudgetFromFirestore is DEPRECATED. Use monthly system instead.');
    return {
        success: true,
        data: {
            budget: null,
            expenses: [],
            savingsGoal: 0
        }
    };
}

/**
 * Check if budget data exists in Firestore
 */
export async function hasBudgetDataInFirestore(uid) {
    try {
        const budgetDoc = await getDoc(doc(db, 'users', uid, 'budget', 'data'));
        
        if (budgetDoc.exists()) {
            const data = budgetDoc.data();
            // Check if there's actual data beyond the initial setup
            return (data.income > 0);
        }
        
        return false;
    } catch (error) {
        console.error('Error checking budget data:', error);
        return false;
    }
}

/**
 * Migrate data from localStorage to Firestore (one-time operation)
 * Now migrates expenses to subcollection
 */
export async function migrateLocalStorageToFirestore(uid, appState, CONFIG) {
    try {
        const hasFirestoreData = await hasBudgetDataInFirestore(uid);
        
        // Only migrate if Firestore is empty
        if (!hasFirestoreData) {
            // Save budget first
            const budgetData = {
                income: appState.budget?.amount || 0,
                savingsGoal: appState.savingsGoal || 0,
                balance: (appState.budget?.amount || 0) - (appState.expenses?.reduce((sum, e) => sum + e.amount, 0) || 0),
                migratedAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            await setDoc(doc(db, 'users', uid, 'budget', 'data'), budgetData);
            
            // Migrate each expense to subcollection
            const expensesRef = collection(db, 'users', uid, 'expenses');
            for (const expense of (appState.expenses || [])) {
                await addDoc(expensesRef, {
                    amount: expense.amount,
                    category: expense.category,
                    date: expense.date,
                    reason: expense.reason || 'Expense',
                    addedDate: expense.addedDate || new Date().toISOString()
                });
            }
            
            // Mark migration as complete
            localStorage.setItem(`${CONFIG.APP_NAME}_migrated_to_firestore`, 'true');
            
            return { success: true, migrated: true };
        }
        
        return { success: true, migrated: false };
    } catch (error) {
        console.error('Error migrating to Firestore:', error);
        return { success: false, error: error.message, migrated: false };
    }
}

/**
 * Clear all Firestore user budget and expense data
 */
export async function clearUserDataFromFirestore(uid) {
    try {
        // Delete budget document
        await deleteDoc(doc(db, 'users', uid, 'budget', 'data'));

        // Delete all expense documents
        const expensesRef = collection(db, 'users', uid, 'expenses');
        const expensesSnapshot = await getDocs(expensesRef);
        const expenseDeletes = expensesSnapshot.docs.map(docSnap => deleteDoc(docSnap.ref));
        await Promise.all(expenseDeletes);

        // Delete all monthly documents
        const monthsRef = collection(db, 'users', uid, 'months');
        const monthsSnapshot = await getDocs(monthsRef);
        const monthDeletes = monthsSnapshot.docs.map(docSnap => deleteDoc(docSnap.ref));
        await Promise.all(monthDeletes);

        console.log('Cleared user Firestore data for', uid);
        return { success: true };
    } catch (error) {
        console.error('Error clearing Firestore user data:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Calculate balance and update in Firestore
 */
export async function updateBalanceInFirestore(uid, appState) {
    try {
        const totalExpenses = (appState.expenses || []).reduce((sum, exp) => sum + exp.amount, 0);
        const balance = (appState.budget?.amount || 0) - totalExpenses;

        await updateDoc(doc(db, 'users', uid, 'budget', 'data'), {
            balance: balance,
            updatedAt: new Date().toISOString()
        });

        return { success: true };
    } catch (error) {
        console.error('Error updating balance:', error);
        return { success: false, error: error.message };
    }
}

/**
 * DEPRECATED: migrateOldDataToMonthly
 * All users must now use monthly system exclusively.
 * This function is kept for backwards compatibility only and should not be called.
 * Migration is one-time only via localStorage flag.
 */
export async function migrateOldDataToMonthly(uid, appState) {
    console.warn('[Firestore] migrateOldDataToMonthly is disabled. App uses monthly system exclusively.');
    return { success: true, migrated: false };
}
