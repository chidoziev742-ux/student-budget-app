# Student Budget Tracker V2

Student Budget Tracker V2 is a browser-based budgeting application for students. It supports account authentication, onboarding, monthly budgets, category allocations, income, expenses, savings goals, history, and budget notifications.

## Features

- Supabase email authentication with verification and password recovery
- User profiles and persistent onboarding data
- Monthly budgets and category-level budget allocations
- Income and expense tracking
- Savings goals and contributions
- Monthly summaries and history
- Optional browser and in-app notifications
- Static PWA deployment with service-worker asset caching

## Technology Stack

- Static HTML, CSS, and JavaScript modules
- Supabase Auth and database tables for the active V2 data layer
- Firebase Hosting configuration for static deployment
- Firebase Auth and Firestore compatibility modules retained for fallback and legacy operations
- Web App Manifest and service worker for PWA behavior

## Current Architecture

Supabase is the active authentication and financial-data service when configured. It owns the current user session, profiles, onboarding, categories, budgets, category budgets, income, expenses, savings goals, and notifications.

Firebase Hosting remains part of the static deployment environment. Firebase Auth and Firestore code remains in the project for fallback or compatibility behavior, but Firebase/Firestore is not the primary financial database for the current V2 flow.

Temporary onboarding drafts and selected preferences may use browser `localStorage`. Financial data is loaded and persisted through the active remote data layer rather than treated as a localStorage backup.

The application shell and selected static resources can be cached by the service worker. The current implementation does not provide a durable offline financial write queue or guaranteed offline-to-Supabase synchronization.

## Getting Started

1. Configure a Supabase project with the required Auth settings, tables, and Row Level Security policies.
2. Provide the Supabase project URL and publishable client key through the existing browser configuration mechanism.
3. Serve the `student-budget-tracker` directory from a local HTTP server or deploy it through static hosting.
4. Add the local or deployed origin to the Supabase Auth redirect URLs.
5. Register a test account, complete onboarding, and verify monthly financial operations.

Do not place service-role keys, database passwords, private tokens, or other secrets in browser files or documentation.

## Documentation

- [Supabase setup and data contract](docs/setup/supabase.md)
- [Local development](docs/setup/local-development.md)
- [Application architecture](docs/architecture/application-overview.md)
- [Authentication architecture](docs/architecture/authentication.md)
- [Financial data flow](docs/architecture/financial-data-flow.md)
- [Financial data model](docs/architecture/financial-data-model.md)
- [PWA and offline behavior](docs/architecture/offline-and-pwa.md)
- [Monthly budgeting guide](docs/user-guide/monthly-budgeting.md)
- [Expenses and savings guide](docs/user-guide/expenses-and-savings.md)
- [Deployment](docs/deployment.md)
- [Testing](docs/testing.md)
- [Troubleshooting](docs/troubleshooting.md)

Historical Firebase, Firestore, troubleshooting, and release documentation is preserved under `docs/archive/`.
