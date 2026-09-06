# Supabase Setup and Data Contract

## Scope

Supabase is the active authentication and financial-data service for Student Budget Tracker V2. The browser client uses the Supabase JavaScript client through `supabase-client.js`.

This document describes the contract used by the current client code. It does not replace database migrations or the Supabase dashboard configuration.

## Client Configuration

The application expects `window.__SUPABASE_CONFIG__` to contain:

- `url`: the Supabase project URL
- `anonKey`: a publishable client key

The current implementation creates a browser client with persistent sessions, automatic token refresh, and URL session detection.

Only a publishable or anonymous client key may be exposed to browser code. Never place a service-role key, database password, access token, or other secret in `supabase-client.js`, HTML, Markdown, or any deployed static asset.

## Authentication

The active path uses Supabase Auth for:

- Email and password registration
- Email and password sign-in
- Persistent sessions
- Sign-out
- Email verification and verification-email resend
- Password-reset email requests
- Password recovery sessions
- Password updates during recovery
- Auth-state change handling

User IDs are Supabase Auth user IDs. The client maps the authenticated user ID to the application `uid` and `id` fields.

## Application Tables

The current client references the following tables:

| Table | Purpose | Ownership key |
|---|---|---|
| `profiles` | Display name, gender, avatar URL, currency, and timestamps | `id`, equal to the Auth user ID |
| `onboarding` | Onboarding completion and income/spending setup data | `user_id` |
| `categories` | User-owned spending categories | `user_id` |
| `budgets` | Monthly budget records | `user_id` |
| `category_budgets` | Category-level budget amounts for a period | `user_id`, `category_id`, `period` |
| `income` | Income entries and received dates | `user_id` |
| `expenses` | Expense entries, category references, dates, descriptions, and notes | `user_id`, `category_id` |
| `savings_goals` | Savings targets, saved amounts, and target dates | `user_id` |
| `notifications` | In-app notification records and read or dismissed state | `user_id` |

The exact column types and constraints must be maintained in the Supabase database schema. The browser code is not a schema migration.

## Ownership and Row Level Security

Every user-owned table must restrict reads, inserts, updates, and deletes to the authenticated user represented by `auth.uid()`.

For `profiles`, the ownership relationship is normally `profiles.id = auth.uid()`. For the remaining user-owned tables, the relationship is normally `table.user_id = auth.uid()`.

Row Level Security policies are database configuration and are not defined by the client code in this repository. Verify them in the Supabase project before deployment. Do not infer that a table is protected merely because the client filters by `user_id`; client-side filters are not security boundaries.

## Financial Data and Months

The application represents a month as `YYYY-MM` in the UI. Supabase budget records are queried using an inclusive month start and an exclusive first day of the next month. Income and expense records are filtered by their date columns for the selected month.

The active financial flow uses:

- `budgets` for the monthly budget record
- `category_budgets` for category-level allocations
- `income` for income entries
- `expenses` for spending entries
- `savings_goals` for savings targets and contributions
- `categories` for category identity resolution

The client creates missing standard categories for a user when required. Category IDs are resolved before expense and category-budget operations.

## Notifications

Notifications are confirmed in the current client. The application reads and updates records in the Supabase `notifications` table, including notification state and user ownership. Browser notifications are also requested by `notifications.js` for budget warnings when permission is granted.

The database notification contract should be reviewed together with the notification queries in `app.js` before changing columns or policies.

## Migration and Legacy Services

The current active financial path does not perform an automatic Firebase-to-Supabase migration. Firebase and Firestore modules remain in the project for fallback or compatibility operations. Legacy migration functions should not be treated as the active persistence path.

The current client also stores temporary onboarding drafts and selected UI preferences in browser `localStorage`. Financial records are not saved to `localStorage` as an authoritative backup.

## Security Checklist

- Use only a publishable Supabase key in browser configuration.
- Keep service-role keys and database credentials outside the repository and deployment artifacts.
- Enable and verify RLS on every user-owned table.
- Test policies for cross-user reads and writes.
- Configure Auth redirect URLs for each deployment origin.
- Review email verification and password-recovery redirect behavior.
- Do not document or commit real credentials, tokens, passwords, or private keys.
