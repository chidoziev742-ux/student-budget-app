# Application Architecture

## Runtime Overview

Student Budget Tracker V2 is a browser application composed of static HTML, CSS, and JavaScript modules. The application uses Supabase as the active authentication and financial-data service.

Firebase Hosting and the static deployment model remain part of the runtime and deployment environment. Firebase/Firestore modules that remain in the repository are legacy, fallback, or compatibility code. They are not the primary financial persistence path for the current V2 implementation.

## Main Components

- `index.html`: application shell, authentication screens, onboarding screens, and application views.
- `main.js`: startup coordination, authentication callbacks, onboarding flow, navigation, and PWA registration.
- `auth.js`: Supabase Auth operations, profile loading, onboarding persistence, and Firebase fallback authentication.
- `monthly-budget-system.js`: active Supabase financial queries and monthly calculations, with a Firebase fallback path when Supabase is not configured.
- `app.js`: shared application state, navigation utilities, and UI helpers. Financial state is initialized and loaded through the monthly data layer.
- `dashboard.js`, `budget.js`, `expense.js`, `history.js`, `history-monthly.js`, and `savings.js`: page-level financial presentation and interaction logic.
- `notifications.js` and notification functions in `app.js`: browser and in-app notification behavior.
- `supabase-client.js`: browser Supabase client initialization.
- `firebase-config.js` and `firestore-sync.js`: retained Firebase compatibility and legacy operations.
- `sw.js` and `manifest.json`: PWA metadata and service-worker caching.

## Data Ownership

Supabase owns active authentication, profiles, onboarding, categories, budgets, category budgets, income, expenses, savings goals, and notifications. User-owned records are associated with the authenticated Supabase user ID.

The Firebase path is selected only when Supabase is not configured or when legacy compatibility functions are explicitly used. Existing Firebase code must not be documented as the normal V2 financial persistence path.

## Browser Storage

Browser `localStorage` is used for temporary onboarding drafts and selected preferences. Financial data is not treated as an authoritative `localStorage` cache.

## Deployment and PWA

The project is deployable as static files. The manifest describes an installable application and `sw.js` provides cache handling. The current client clears existing registrations and caches in `index.html` during startup and registers the service worker from `main.js`; deployment documentation must account for that behavior.

Offline operation is limited. Cached assets can be served, but the current code does not implement a durable financial write queue or an automatic offline-to-Supabase reconciliation process.
