# Testing Guide

## Authentication

- Register a new account.
- Verify the email confirmation state.
- Resend verification email and confirm rate-limit handling.
- Sign in with valid credentials.
- Reject invalid credentials.
- Restore a persistent session after reload.
- Sign out and confirm protected application views are unavailable.
- Request a password reset.
- Complete a recovery session and update the password.

## Profile and Onboarding

- Confirm a profile record is created or updated for the authenticated user.
- Complete each onboarding step.
- Reload during onboarding and verify the draft behavior.
- Confirm completed onboarding is persisted in Supabase.
- Verify another user's profile or onboarding data cannot be read or changed.

## Financial Data

- Create and update a monthly budget.
- Create category-level budget allocations.
- Add and review income entries.
- Add, update, and delete expenses.
- Verify category resolution and category ownership.
- Create or update a savings goal and contribution.
- Switch months and verify date filtering.
- Confirm dashboard, history, budget, expense, and savings views agree.

## Notifications

- Test notification permission handling.
- Verify notification records are user-scoped.
- Verify read and dismissed state behavior where exposed by the current UI.
- Verify budget warnings only appear when browser permission is granted.

## PWA and Connectivity

- Verify manifest loading and installability metadata.
- Verify service-worker registration on a secure origin.
- Verify cached assets load after a network interruption.
- Verify the offline page and status messages.
- Confirm that failed offline financial writes are not reported as guaranteed synchronized changes.
- Verify service-worker cache replacement after a version change.

## Security and RLS

- Test every user-owned table with two separate accounts.
- Confirm a user cannot read, insert, update, or delete another user's records.
- Confirm only publishable configuration is present in browser assets.
- Confirm service-role credentials and database passwords are absent from the repository and deployment.
