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

/**
 * Save budget to Firestore
 */
export async function saveBudgetToFirestore(uid, budget) {
    try {
        const budgetData = {
            income: budget.amount || 0,
            savings: 0, // Will be managed separately
            balance: budget.amount || 0,
            createdAt: budget.setDate || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await setDoc(
            doc(db, 'users', uid, 'budget', 'data'),
            budgetData,
            { merge: true }
        );

        return { success: true };
    } catch (error) {
        console.error('Error saving budget to Firestore:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Add a single expense as a new document in subcollection
 */
export async function addExpenseToFirestore(uid, expense) {
    try {
        const expensesRef = collection(db, 'users', uid, 'expenses');
        
        const docRef = await addDoc(expensesRef, {
            amount: expense.amount,
            category: expense.category,
            date: expense.date,
            reason: expense.reason || 'Expense',
            addedDate: new Date().toISOString()
        });

        console.log('Expense added with ID:', docRef.id);
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('Error adding expense to Firestore:', error);
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
 * Save expenses to Firestore (for backward compatibility with old code)
 * NOTE: This function is deprecated - use addExpenseToFirestore instead
 * Kept for migration purposes only
 */
export async function saveExpensesToFirestore(uid, expenses) {
    try {
        // This is now only used for the budget document metadata
        await setDoc(
            doc(db, 'users', uid, 'budget', 'data'),
            {
                updatedAt: new Date().toISOString()
            },
            { merge: true }
        );

        return { success: true };
    } catch (error) {
        console.error('Error saving expenses metadata:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Save savings goal to Firestore
 */
export async function saveSavingsGoalToFirestore(uid, savingsGoal) {
    try {
        await setDoc(
            doc(db, 'users', uid, 'budget', 'data'),
            {
                savingsGoal: savingsGoal || 0,
                updatedAt: new Date().toISOString()
            },
            { merge: true }
        );

        return { success: true };
    } catch (error) {
        console.error('Error saving savings goal to Firestore:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Load budget data from Firestore
 * Now also loads expenses from subcollection
 */
export async function loadBudgetFromFirestore(uid) {
    try {
        console.log(`[Firestore] Loading budget from users/${uid}/budget/data`);
        const budgetDoc = await getDoc(doc(db, 'users', uid, 'budget', 'data'));
        console.log('[Firestore] Budget document:', budgetDoc.exists() ? 'EXISTS' : 'NOT FOUND');
        
        // Load expenses from subcollection
        console.log(`[Firestore] Loading expenses from users/${uid}/expenses/`);
        const expensesResult = await loadExpensesFromFirestore(uid);
        
        if (budgetDoc.exists()) {
            const data = budgetDoc.data();
            console.log('[Firestore] Budget data:', data);
            return {
                success: true,
                data: {
                    budget: {
                        amount: data.income || 0,
                        setDate: data.createdAt,
                        category: null
                    },
                    expenses: expensesResult.expenses,
                    savingsGoal: data.savingsGoal || 0
                }
            };
        } else {
            // Document doesn't exist yet
            console.log('[Firestore] Budget document does not exist, returning empty data');
            return {
                success: true,
                data: {
                    budget: null,
                    expenses: expensesResult.expenses,
                    savingsGoal: 0
                }
            };
        }
    } catch (error) {
        console.error('[Firestore] Error loading budget:', error.code, error.message);
        console.warn('Could not load budget from Firestore (may be offline):', error.message);
        // Return success with empty data - will use localStorage fallback
        return {
            success: true,
            data: {
                budget: null,
                expenses: [],
                savingsGoal: 0
            }
        };
    }
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
