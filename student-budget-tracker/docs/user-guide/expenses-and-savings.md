# Expenses and Savings

## Recording an Expense

1. Open the expense view.
2. Enter the amount, category, date, and description or reason.
3. Submit the entry while signed in.
4. Confirm the updated dashboard or history view.

Expense records are associated with the authenticated user and a user-owned category in Supabase.

## Reviewing Spending

Dashboard and history views summarize expense totals by the selected month and category. The selected date determines the month used for monthly reporting.

## Managing Savings

Use the savings view to review the active savings goal, target amount, saved amount, and target date. Contributions are processed through the authenticated financial data layer.

## Browser Notifications

The application may request browser notification permission and can display budget warnings when permission has been granted. Notifications are optional and must not be treated as a substitute for reviewing the dashboard.

## Data and Connectivity

Expense and savings operations require a valid authenticated session and a reachable Supabase project. The service worker can cache application resources, but it does not provide a guaranteed offline financial write queue.
