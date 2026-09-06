# Authentication Architecture

## Active Provider

When Supabase is configured, authentication is handled by Supabase Auth. The client enables persistent sessions, automatic token refresh, and session detection from the URL.

Firebase Auth remains a fallback path in `auth.js` when Supabase configuration is unavailable. It is not the preferred V2 authentication provider.

## Supported Flows

The current authentication module supports:

- Account registration with email, password, display name, and gender metadata
- Email verification state and verification-email resend
- Password sign-in
- Persistent session restoration
- Sign-out
- Password-reset email requests
- Recovery-session detection
- Password update during recovery
- Auth-state callbacks used by the application shell

## Profiles

After a Supabase session is found, the client loads the user's `profiles` record. Registration and profile updates upsert profile information such as display name, gender, avatar URL, currency, and timestamps.

The profile record is user-owned. Its `id` must correspond to the authenticated Supabase user ID.

## Onboarding

Onboarding progress is drafted in `localStorage` while the user moves through the onboarding screens. Progress and completion are persisted to the Supabase `onboarding` table for an authenticated user.

The onboarding record includes completion state, income source, income amount, income frequency, next income date, spending categories, and safe daily spending data where supplied by the current UI.

## Recovery Behavior

A password recovery link can create a recovery session. The application detects the recovery event and presents the password update flow. Recovery tokens may be present in the URL during this flow and are cleared when the user leaves the reset screen.

Configure Supabase Auth redirect URLs to match the deployed application origin. Verify email and recovery flows in each environment.

## Error Handling

The client maps common Supabase authentication errors to user-facing messages, including unconfirmed email, verification-email rate limits, and invalid credentials. Other provider messages are surfaced as authentication errors.

## Security Requirements

- Only use a publishable Supabase key in browser code.
- Enforce profile and onboarding ownership with Supabase RLS.
- Never trust a user ID supplied by the browser as an authorization boundary.
- Keep service-role credentials and database passwords out of the repository and static deployment.
