# Troubleshooting

## Supabase Configuration

If authentication or financial requests fail immediately, verify that the browser has a valid Supabase project URL and publishable key. Confirm that the URL is listed in the Supabase Auth redirect configuration.

Do not solve configuration problems by adding a service-role key to browser code.

## Authentication

If a sign-in attempt is rejected, verify the email address, password, and email-confirmation state. For recovery problems, open the reset link from the same deployed origin configured in Supabase and confirm that the recovery session is active.

If a stale session remains after account changes, sign out and clear site data for the affected origin.

## RLS and Data Access

If a query returns an authorization error, inspect the Supabase RLS policy for the affected table. Confirm that the policy compares the table ownership column with `auth.uid()` and that the authenticated session belongs to the expected user.

Client-side `user_id` filters do not replace RLS.

## Monthly Data

If a record appears under the wrong month, inspect the stored date and the selected `YYYY-MM` value. The client uses an inclusive first-of-month boundary and an exclusive first day of the next month.

If categories do not resolve, verify that the authenticated user owns the category and that the category name matches the standard category mapping.

## PWA and Cache

If an old application shell appears, inspect service-worker registrations and browser caches. The current startup code unregisters existing workers and clears caches before initialization. Verify the active cache name in `sw.js` and reload from the deployed origin.

Do not assume that a cached application can submit financial changes while offline. The current implementation does not provide a durable financial synchronization queue.

## Legacy Firebase Code

Firebase configuration and Firestore compatibility modules remain in the project. Errors from those paths do not automatically indicate that the active Supabase path is failing. Identify which provider the current code selected before troubleshooting a data request.
