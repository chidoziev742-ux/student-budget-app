# PWA and Offline Behavior

## PWA Components

- `manifest.json` defines the application name, display mode, theme, shortcuts, and PNG icons.
- `sw.js` caches selected same-origin static assets and removes older cache versions during activation.
- `main.js` registers the service worker and handles service-worker messages.
- `index.html` currently unregisters existing service workers and deletes browser caches during startup before the application initializes.

## Cache Behavior

The service worker uses cache-first behavior for same-origin GET requests after an asset has been cached. It uses network-first behavior for selected API-like paths and returns an offline response when a request cannot be fulfilled.

The explicit static asset list in `sw.js` is the source of truth for precaching. Assets added to the application are not automatically guaranteed to be precached.

## Offline Limitations

The current implementation can display cached application resources and an offline status message. It does not implement a durable financial mutation queue, conflict resolution, or guaranteed offline-to-Supabase synchronization.

The service-worker `sync` handler posts a message for the `sync-expenses` tag, but the current client does not implement a complete financial synchronization routine in response. Documentation and testing must not promise automatic data synchronization after reconnection.

## Deployment Requirements

Use HTTPS in production, or a supported secure local origin during development. Configure the Supabase Auth redirect URLs for the deployed origin. After changing cached assets, verify the active cache name and browser registrations.

## Verification

Test installation, startup, cache invalidation, navigation, authentication, and online or offline messaging independently. Treat remote Supabase operations as network-dependent even when the application shell is cached.
