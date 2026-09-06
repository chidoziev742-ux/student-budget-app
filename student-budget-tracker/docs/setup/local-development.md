# Local Development

## Prerequisites

- A modern browser with ES module support
- A local static web server
- A configured Supabase project for authentication and financial data

The application is a static client and does not contain a local Node.js build pipeline.

## Run Locally

Serve the `student-budget-tracker` directory from a local HTTP origin. Opening `index.html` directly from the filesystem can prevent ES modules, authentication redirects, service workers, or remote requests from working correctly.

Use the local origin as an allowed Supabase Auth redirect URL during development.

## Supabase Configuration

Provide the browser-safe Supabase project URL and publishable key through the existing configuration mechanism. Do not add service-role credentials or database passwords to the repository.

The client uses persistent Supabase sessions. A stale browser session can be cleared by signing out or using the browser's site storage controls.

## Application Entry Points

- `index.html` provides the application shell and loads the modules.
- `main.js` coordinates authentication, onboarding, navigation, and page initialization.
- `supabase-client.js` initializes the Supabase browser client.
- `auth.js` manages authentication, profiles, and onboarding.
- `monthly-budget-system.js` manages active monthly financial operations.
- `sw.js` provides service-worker caching behavior when registration succeeds.

## Development Constraints

The application is currently a static hybrid runtime. Firebase compatibility modules remain in the project, but Supabase is the active authentication and financial-data layer when configured.
