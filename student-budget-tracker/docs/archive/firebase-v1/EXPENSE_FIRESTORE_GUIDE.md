# Expense Management with Firestore - Implementation Guide

## Overview
The expense management system has been completely rewritten to properly handle Firestore's document/array structure. Previously, expenses were being overwritten when new ones were added. Now, expenses are properly managed as arrays within Firestore documents.

## Key Changes

### 1. **Firestore Data Structure**
```
users/{uid}/budget/data (document)
 income: 50000
 expenses: [                    -> Array of all expenses
   {
     id: "1234567890",
     amount: 500,
     category: "food",
     date: "2025-01-26",
     reason: "Lunch",
     addedDate: "2025-01-26T10:30:00Z"
   },
   {
     id: "1234567891",
     amount: 1500,
     category: "transport",
     date: "2025-01-26",
     reason: "Bus fare",
     addedDate: "2025-01-26T10:35:00Z"
   }
 savingsGoal: 10000
 updatedAt: "2025-01-26T10:35:00Z"
```

### 2. **How It Works Now**

#### Adding an Expense
```javascript
// 1. Form submission captures expense data
const expense = {
    id: Date.now().toString(),      // Unique ID
    amount: 500,
    category: "food",
    date: "2025-01-26",
    reason: "Lunch",
    addedDate: new Date().toISOString()
};

// 2. addExpense() function handles the flow:
//  Add expense to local appState.expenses array
//  Call saveExpensesToFirestore(uid, appState.expenses)
//  Update UI after Firestore responds

await addExpense(expense);
// Result: Firestore document now contains the new expense in the array
```

#### Deleting an Expense
```javascript
// 1. Delete button calls deleteExpenseFromUI(expenseId)
// 2. deleteExpense() function handles the flow:
//  Find and remove expense from appState.expenses array
//  Call saveExpensesToFirestore(uid, appState.expenses) with updated array
//  Update UI

await window.deleteExpenseFromUI('1234567890');
// Result: Firestore array is updated without the deleted expense
```

#### Editing an Expense
```javascript
// 1. Call editExpense(expenseId, updates)
// 2. editExpense() function:
//  Find expense in array
//  Merge updates with existing expense
//  Call saveExpensesToFirestore(uid, appState.expenses)
//  Update UI

await editExpense('1234567890', {
    amount: 600,  // Only update what changed
    reason: "Lunch and coffee"
});
```

### 3. **New Functions in expense.js**

#### `addExpense(expense)` - Async
Adds a new expense and syncs with Firestore.
- **Parameters**: `expense` object with id, amount, category, date, reason
- **Returns**: `{ success: true/false, error?: string }`
- **Handles**: Local state + Firestore sync
- **Fallback**: If offline, saves to localStorage until connection restored

#### `editExpense(expenseId, updates)` - Async
Updates an existing expense.
- **Parameters**: `expenseId` (string), `updates` (partial object)
- **Returns**: `{ success: true/false, error?: string }`
- **Preserves**: Original ID and addedDate
- **Syncs**: Entire expenses array to Firestore

#### `deleteExpense(expenseId)` - Async
Deletes an expense from array and Firestore.
- **Parameters**: `expenseId` (string)
- **Returns**: `{ success: true/false, error?: string }`
- **Updates**: Filtered array to Firestore

#### `handleExpenseSubmit(e)` - Async
Form submission handler - now async to wait for Firestore.
- **Changes**: 
  - Shows loading state on submit button
  - Waits for `addExpense()` to complete
  - Disables button during submission
  - Shows appropriate success/error toast

#### `window.deleteExpenseFromUI(expenseId)` - Async
Wrapper for onclick handlers to properly handle async deletion.
- **Called from**: HTML onclick in history.js
- **Handles**: Async execution + UI updates
- **Shows**: Success/error messages to user

### 4. **Firestore Sync Integration**

The functions use the existing `firestore-sync.js` module:

```javascript
// In addExpense(), editExpense(), deleteExpense():
const user = window.firebaseAuth?.getCurrentUser?.();
if (user && window.firestoreSync?.saveExpensesToFirestore) {
    const syncResult = await window.firestoreSync.saveExpensesToFirestore(
        user.uid,
        appState.expenses  // Send entire array
    );
}
```

**Key Point**: `setDoc(..., { merge: true })` is used to preserve other fields (budget, savingsGoal) while updating the expenses array.

### 5. **Error Handling Flow**

```
User Action (Add/Edit/Delete)
    ->
Validate Input
    ->
Update Local appState
    ->
Try: Sync to Firestore
     Success -> Update UI -> Show "Success" toast
     Failure -> Rollback local state -> Show "Error" toast
    
Offline Case:
     Local state updated
     Firestore sync fails (caught gracefully)
     Data saved to localStorage
     Message shown: "Added locally, will sync when online"
```

### 6. **UI Update Flow**

After any expense change (add/edit/delete):
```javascript
updateDashboard();      // Summary cards, progress bar
updateBudgetPage();     // Budget status
updateHistoryPage();    // Expense list
updateSavingsPage();    // Savings calculations
```

### 7. **Balance Calculations**

Balance automatically recalculates after any expense change:
```javascript
// In dashboard.js
calculateTotalExpenses() {
    return appState.expenses.reduce((sum, e) => sum + e.amount, 0);
}

calculateRemainingBalance() {
    return (appState.budget?.amount || 0) - calculateTotalExpenses();
}
```

## Testing Checklist

### Add Expense
- [ ] Enter amount, category, date, reason
- [ ] Click "Add Expense"
- [ ] Expense appears in dashboard recent list
- [ ] Total spent updates
- [ ] Remaining balance recalculates
- [ ] Refresh page -> expense still there
- [ ] Check Firestore console -> expense in array

### Delete Expense
- [ ] Go to History page
- [ ] Click trash icon on an expense
- [ ] Expense disappears from list
- [ ] Dashboard updates immediately
- [ ] Remaining balance increases
- [ ] Refresh page -> expense stays deleted
- [ ] Check Firestore -> removed from array

### Offline Support
- [ ] Turn off internet (DevTools -> Network -> Offline)
- [ ] Add expense -> still works with localStorage
- [ ] Turn internet back on -> auto-syncs to Firestore
- [ ] No data loss

###  Error Cases
- [ ] Invalid amount -> "Please enter valid amount"
- [ ] No category -> "Please select a category"
- [ ] No date -> "Please select a date"
- [ ] Network error during add -> proper error message

## Code Examples

### Add Expense Directly (if needed)
```javascript
const myExpense = {
    id: Date.now().toString(),
    amount: 5000,
    category: "shopping",
    date: "2025-01-26",
    reason: "Groceries",
    addedDate: new Date().toISOString()
};

const result = await addExpense(myExpense);
if (result.success) {
    console.log("Expense added and synced!");
} else {
    console.error("Failed:", result.error);
}
```

### Edit Expense Directly
```javascript
const result = await editExpense('1234567890', {
    amount: 6000,
    reason: "Groceries and toiletries"
});

if (result.success) {
    console.log("Updated!");
}
```

### Delete Expense Directly
```javascript
const result = await deleteExpense('1234567890');

if (result.success) {
    console.log("Deleted!");
}
```

## Troubleshooting

### Issue: "Expenses get overwritten"
**Solution**: Now fixed! Each expense is added to the array, and the entire array is synced.

### Issue: "New expense doesn't appear on dashboard"
**Check**:
1. Is form validation passing?
2. Is Firestore sync working? (Check browser Network tab)
3. Hard refresh browser (Ctrl+Shift+R)
4. Check browser console for errors

### Issue: "Delete doesn't work"
**Check**:
1. Is deleteExpenseFromUI() being called? (Check console)
2. Is Firestore write permission correct?
3. Look for error message in console

### Issue: "Balance not updating"
**Check**:
1. Is calculateTotalExpenses() working?
2. Is updateDashboard() being called?
3. Check appState.expenses - are expenses there?

## Files Modified

1. **expense.js** (140 lines -> 240 lines)
   - Added: `addExpense(expense)` - async function
   - Added: `editExpense(expenseId, updates)` - async function
   - Updated: `deleteExpense(expenseId)` - now async with Firestore
   - Updated: `handleExpenseSubmit(e)` - now async with loading states
   - Added: `window.deleteExpenseFromUI(expenseId)` - async wrapper for onclick

2. **history.js**
   - Updated: onclick handler from `deleteExpense()` to `window.deleteExpenseFromUI()`

3. **firestore-sync.js** (no changes)
   - Uses existing `saveExpensesToFirestore(uid, expenses)` function
   - Already handles proper Firestore merge

## How Balance Recalculates

Every time expenses change, the balance auto-updates:
```
1. User adds/edits/deletes expense
2. appState.expenses array updated
3. saveExpensesToFirestore(uid, appState.expenses) called
4. Firestore document updated with new array
5. updateDashboard() recalculates:
   - Total Spent = sum of all expense.amounts
   - Remaining = Budget - Total Spent
   - UI updates automatically
```

## Summary

**Expenses are now properly managed in Firestore arrays**
**No more overwriting**
**Async operations ensure consistency**
**Offline support with localStorage**
**Proper error handling**
**Balance updates automatically**
**Full Firestore sync after all operations**
