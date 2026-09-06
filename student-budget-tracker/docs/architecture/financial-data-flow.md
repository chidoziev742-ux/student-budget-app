# Financial Data Flow

## Active Request Path

1. Supabase Auth establishes the current session.
2. The application resolves the authenticated Supabase user ID.
3. The monthly budget module queries user-owned Supabase tables.
4. Category names are mapped to user-owned category IDs.
5. Budget, income, expense, and savings operations write to Supabase.
6. The application maps database rows into the UI state used by dashboards and history views.

## Monthly Selection

The UI represents a month as `YYYY-MM`. The client converts that value into a date range beginning on the first day of the selected month and ending immediately before the first day of the next month.

Budget records are selected within that range. Income and expense records use their received or expense dates for monthly summaries. Savings goals are loaded as user-owned goal records and combined with the current application view.

## Categories

The client ensures standard categories exist for the authenticated user. Expense and category-budget operations resolve a category name to a Supabase category ID before writing related records.

## Data Mapping

Supabase rows are converted into application objects. Income rows expose amount, source, received date, notes, and timestamps. Expense rows expose amount, category name, date, description or reason, notes, and timestamps.

## Persistence Boundaries

The active financial path is Supabase. `app.js` does not persist financial state to `localStorage`; it initializes an empty financial state while the monthly data layer loads remote data.

Temporary onboarding drafts and selected preferences may be stored in `localStorage`. This storage is not a financial backup or synchronization queue.

## Legacy Compatibility

`firestore-sync.js` exports deprecated functions and contains older Firestore paths. `monthly-budget-system.js` also contains a Firebase fallback branch for environments without Supabase configuration. These paths are compatibility behavior and must not be described as the normal V2 data flow.

## Failure and Offline Behavior

The service worker can cache static resources and return an offline page for unavailable assets. The application displays online and offline status messages. The current implementation does not provide a durable offline financial write queue or guaranteed automatic reconciliation with Supabase after reconnection.
