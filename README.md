# student-budget-app

# Student Budget Tracker

A mobile-first Progressive Web App (PWA) designed to help students manage their income, expenses, budgets, savings goals, and financial history in one place.

## Version 2.1.0 — Smarter Money Management

Student Budget Tracker V2.1 introduces a major upgrade to the financial tracking system, with continuous balances, multiple income records, multi-goal savings, persistent financial history, improved onboarding, and a complete theme system.

## What's New in V2.1

### Continuous Balance Tracking

- Balance now carries continuously from one month to the next.
- The previous month's closing balance becomes the next month's opening balance.
- Switching months does not reset the user's financial balance.
- Future-dated income and expenses are handled appropriately.
- Users no longer need to re-enter previous balances as new income.

### Multiple Income Records

- Record multiple income transactions.
- Each income record has its own:
  - Source
  - Amount
  - Date
  - Notes
- Income remains part of the user's permanent financial history.

### Persistent Financial History

- Previous months remain available.
- Monthly filtering is used for viewing and reporting rather than resetting financial data.
- History includes:
  - Income
  - Expenses
  - Savings deposits
  - Savings withdrawals
  - Dates
  - Notes
- Savings activity is now displayed alongside other financial activity.

### Multi-Goal Savings

Savings has been upgraded from a single savings target to a multi-goal system.

Users can:

- Create multiple savings goals.
- Set a target amount.
- Add a goal description or purpose.
- Set an optional target date.
- Track progress independently for each goal.
- Deposit money into individual goals.
- Withdraw money from individual goals.
- View total savings across all goals.

### Savings and Balance Integration

Savings transactions are now connected to the available balance.

- Creating a savings goal does not reduce the balance.
- Depositing into savings reduces available funds once.
- Withdrawing from savings increases available funds.
- Savings deposits and withdrawals are tracked as separate financial movements.
- The system prevents savings activity from being double-counted as an ordinary expense.

### Improved Onboarding

The onboarding experience now supports multiple savings goals.

Users can:

- Add multiple goals during onboarding.
- Remove goals before completing onboarding.
- Continue without creating a savings goal.
- Add income during onboarding.
- Safely resume onboarding without creating duplicate goals or records.

### Light, Dark and System Themes

V2.1 introduces a complete theme system.

Users can choose:

- Light
- Dark
- System

System mode automatically follows the device's theme preference.

Theme preferences are saved so the selected mode remains available across sessions.

### Visual Improvements

- Reduced excessive shadows.
- Improved visual hierarchy.
- Cleaner cards and surfaces.
- Improved dark-mode readability.
- Updated form controls for dark mode.
- Improved notification surfaces.
- Preserved the existing mobile-first design and green/orange visual identity.

## Technology Stack

- HTML5
- CSS3
- JavaScript (ES Modules)
- Progressive Web App (PWA)
- Supabase
  - Authentication
  - PostgreSQL database
  - Row Level Security (RLS)
- Firebase Hosting
- Git and GitHub

## Security

Financial data is protected using Supabase authentication and Row Level Security.

The application does not store service-role credentials or private server-side keys in frontend code.

> Never place Supabase service-role keys, database passwords, private tokens, Firebase service-account credentials, or other private secrets in browser files or documentation.

## Core Features

- Student dashboard
- Income tracking
- Expense tracking
- Budget management
- Continuous financial balance
- Monthly financial views
- Persistent transaction history
- Multiple savings goals
- Savings deposits and withdrawals
- Financial summaries
- Notifications
- Responsive mobile-first interface
- Progressive Web App support
- Light, Dark and System themes
- Supabase authentication and data storage

## Roadmap

### V2.2

Planned improvements include:

- Safely refactor large HTML, CSS and JavaScript files into smaller modules.
- Further notification UI improvements.
- New-month contextual notifications.
- Seasonal and festival notifications.
- General stability and bug fixes.
- Upgrade the export system to use the current V2 financial data model.
- Include income, expenses and savings activity in exports.
- Fix export version information so it reflects the current application release version.

## Release History

### V2.1.0

- Continuous balance across months
- Multiple income records
- Persistent financial history
- Multi-goal savings
- Savings deposits and withdrawals
- Improved onboarding
- Light, Dark and System themes
- Visual and UI improvements

### V2.2.0

Planned:

- Export system upgrade
- Export versioning
- Improved notification system
- New-month notifications
- Seasonal and festival notifications
- Codebase refactoring
- General stability improvements

## Current Release

**Version:** 2.1.0  
**Release:** Smarter Money Management

Built with the goal of helping students understand where their money comes from, where it goes, and how they can save more effectively.
