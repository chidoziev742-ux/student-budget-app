# Financial Data Model

## Ownership

Supabase Auth identifies the user. User-owned application records use the authenticated user ID through either a profile `id` or a table `user_id` relationship.

The database must enforce ownership with Row Level Security. Browser-side filters are not an authorization mechanism.

## Tables Used by the Client

| Table | Current responsibility |
|---|---|
| `profiles` | User profile metadata and currency preferences |
| `onboarding` | Onboarding progress, income setup, categories, and safe daily spending |
| `categories` | User-owned category names and IDs |
| `budgets` | Monthly budget records |
| `category_budgets` | Category-level budget values for a period |
| `income` | Income amount, source, received date, notes, and timestamps |
| `expenses` | Expense amount, category ID, expense date, description, notes, and timestamps |
| `savings_goals` | Savings target amount, saved amount, and target date |
| `notifications` | User-scoped notification records and notification state |

## Month Representation

The UI uses `YYYY-MM`. Supabase budget queries use the first day of the selected month as an inclusive lower boundary and the first day of the following month as an exclusive upper boundary.

Income and expense rows are included in monthly calculations according to their received or expense date. The client maps database rows into the application fields used by dashboard, history, and savings views.

## Categories and Relationships

Categories are user-owned. The client creates missing standard categories when needed and resolves category names to category IDs before writing expenses or category budgets.

Expenses reference a category through `category_id`. Category budgets reference a category through `category_id` and include a period value. The database should enforce that referenced categories belong to the same user as the related record.

## Financial Semantics

- A budget is the configured amount for a selected month.
- Category budgets provide category-level allocations for a period.
- Income is recorded as dated entries and contributes to monthly summaries.
- Expenses are recorded as dated entries and contribute to spending totals.
- Savings goals store a target and current saved amount.
- Notifications are user-scoped records; browser notification permission is a separate client capability.

## Legacy Schema Notice

Older Firebase documentation describes paths such as `users/{uid}/budget/data`, `users/{uid}/expenses`, and `users/{uid}/months/{YYYY-MM}`. Those paths describe legacy or fallback code that remains in the repository. They are not the authoritative V2 Supabase schema.
