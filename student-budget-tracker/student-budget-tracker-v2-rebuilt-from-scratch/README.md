# Student Budget Tracker V2

A clean rebuild of Student Budget Tracker using vanilla HTML/CSS/JavaScript and Supabase.

## Start

Use a local web server. Do not open `index.html` directly as a `file://` URL because the app uses ES modules.

In VS Code, install Live Server and choose **Open with Live Server** on `index.html`.

## Supabase

`supabase-client.js` contains the existing Student Budget Tracker Supabase URL and publishable key.

The app expects:
- `profiles`
- `onboarding`
- `categories`
- `budgets`
- `category_budgets`
- `income`
- `expenses`
- `savings_goals`

`schema.sql` is a reference/setup script for a fresh Supabase database. Do not run it blindly against a production database that already has these tables; compare the existing schema first.

## Important authentication design

The auth listener intentionally does not reroute on `TOKEN_REFRESHED`. A token refresh is not an onboarding event. If the onboarding lookup fails, an already-open authenticated app is preserved instead of being thrown back to onboarding.

## V2 screens

- Dashboard
- Budget
- Add transaction
- Transactions/history
- Savings goals
- Money Coach
- Settings
- Admin shell for admin profiles
- Authentication
- 3-step onboarding

## No Firebase financial system

This rebuild contains no Firebase financial dependency. Financial data is read and written through Supabase.
