# Quick Start Guide - Monthly Budget System

##  What's New

Your Student Budget Tracker now has awesome new features:
-  **Monthly Budget Structure** - Track budgets per month
-  **Income Tracking** - Record all your income sources
-  **Month Switching** - Switch between months to view/edit data
-  **Monthly History** - See all your past months with summaries
-  **Smart Migration** - Old data automatically migrates to new structure
-  **Safe & Reliable** - All changes are backed up to Firebase

##  Getting Started

### Step 1: Sign In
Open the app and sign in with your email. If you have old data, it will automatically migrate to the new monthly structure.

### Step 2: Go to Budget Page
Click on the "Budget" tab in the navigation.

### Step 3: Select Your Month
At the top of the Budget page, you'll see a "Select Month" dropdown. The current month is selected by default.

### Step 4: Set Your Monthly Budget
Enter your monthly budget amount in the "Monthly Budget" field and click "Save Budget".

**Important**: Your budget is FIXED per month. Adding income will NOT change your budget.

### Step 5: Add Income (New!)
Scroll down to the "Add Income" section.
- Enter the amount
- Enter the source (e.g., "Salary", "Freelance", "Allowance")
- Select the date
- Click "Add Income"

Your income entries will appear below in the "Monthly Income" section.

### Step 6: Add Expenses
Go to "Add Expense" tab and add your expenses as usual. They will automatically be recorded for the current month.

### Step 7: View Your Monthly History
Go to the "History" tab. Scroll down to "Monthly History" section to see cards for all your months.

Each month card shows:
- Your budget for that month
- Total income
- Total expenses
- Savings (income - expenses)

Click "View Details" on any month to see a detailed breakdown of all income and expenses.

##  Understanding Your Data

### Budget vs. Income
- **Budget**: The maximum you plan to spend in a month (fixed)
- **Income**: Money coming in (salary, allowance, etc.)
- **Expenses**: Money going out
- **Savings**: Income - Expenses

### Example
```
Month: April 2026

Budget: ₦50,000 (your spending limit)
Income: ₦100,000 (salary + freelance)
Expenses: ₦45,000 (what you spent)
Savings: ₦55,000 (income - expenses)

Your budget of ₦50,000 is separate from your income!
```

##  Switching Months

### To View Past Month Data:
1. Go to Budget page
2. Click the "Select Month" dropdown
3. Choose a different month
4. All data will update to show that month's information

### To View Month Summaries:
1. Go to History page
2. Scroll to "Monthly History" section
3. See all your months as cards
4. Click any month to see details

##  Data Safety

 **Automatic Sync**: All your data syncs to Firebase in real-time  
 **One-Time Migration**: Old data migrates once automatically  
 **No Data Loss**: All old data is preserved  
 **Offline Support**: LocalStorage keeps data if offline  
 **Secure**: Only you can access your data  

##  Common Questions

### Q: Will my old expenses disappear?
**A**: No! They automatically migrate to the current month on your first login.

### Q: Can I change my budget after setting it?
**A**: Yes! Go to Budget page, enter a new amount, and click "Save Budget".

### Q: Does adding income change my budget?
**A**: No! Budget and income are completely separate. Your budget stays fixed.

### Q: Can I see expenses from January if it's April now?
**A**: Yes! Go to History page -> Monthly History, find the January card, and click "View Details".

### Q: What if I add an expense on April 15th in the April month?
**A**: It will be recorded in April's expenses, regardless of the calendar date.

### Q: Can I delete an income entry?
**A**: Yes! Go to Budget page, find the income entry in "Monthly Income" section, and click the trash icon.

##  Tips for Better Budgeting

1. **Set a Realistic Budget**
   - Calculate your average monthly spending
   - Set budget slightly lower to leave room for savings

2. **Track All Income**
   - Add salary, allowance, side gigs
   - This helps you see true savings potential

3. **Review Monthly**
   - Check History monthly
   - Compare months to see patterns
   - Adjust budget if needed

4. **Categorize Expenses**
   - Use proper categories when adding expenses
   - This helps you see where money goes

5. **Plan Ahead**
   - Income - Expenses = Savings
   - Aim for positive savings each month

##  Troubleshooting

### Month selector not showing?
- Refresh the page
- Sign out and back in
- Check your internet connection

### Old data not migrating?
- Ensure you're signed in
- Check Firebase is connected
- Give it a moment on first login

### Can't add income?
- Check amount is positive number
- Enter income source (required)
- Select date before today
- Sign in is required

### Not seeing expenses in monthly view?
- Switch to current month if in past month
- Refresh the page
- Check if expenses were added with correct date

##  Need Help?

If something isn't working:
1. Check browser console for errors (F12)
2. Verify Firebase connection
3. Try signing out and back in
4. Refresh the page
5. Check the implementation files for more details

##  You're All Set!

You now have a complete monthly budgeting system. Start:
1. Setting monthly budgets
2. Tracking income
3. Recording expenses
4. Watching your savings grow!

Happy budgeting! 
