# Deployment

## Static Hosting

The application is deployed as static files. Publish the contents of `student-budget-tracker` through the configured static hosting provider. The repository includes Firebase Hosting configuration, but hosting is separate from the active Supabase authentication and financial-data service.

Do not deploy source changes as part of a documentation-only update.

## Supabase Configuration

Configure the deployed application with the Supabase project URL and publishable client key. Configure the deployment origin in Supabase Auth redirect URLs and verify email confirmation and password recovery links.

Never deploy a service-role key, database password, private token, or other secret to browser-accessible files.

## PWA Requirements

Serve the application over HTTPS in production. Confirm that `manifest.json`, icons, and `sw.js` are reachable from the deployed origin. Verify service-worker registration and cache behavior after deployment.

The current startup code clears existing registrations and caches. Do not document cached financial writes or automatic offline synchronization as supported behavior.

## Post-Deployment Checks

- Open the deployed origin and confirm the authentication screen loads.
- Register or sign in with a test account.
- Complete onboarding and confirm the profile and onboarding records.
- Create a budget, income entry, expense, and savings update.
- Verify monthly history and category summaries.
- Verify notification behavior only after granting permission.
- Test password reset and recovery URLs.
- Inspect browser console and network requests for configuration or RLS failures.
- Confirm that no secret credentials are present in deployed assets.
