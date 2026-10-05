# User-based Nilufər: deployment

The repository changes do not themselves change the hosted database, Auth dashboard, scheduler or hosting environment. Deploy the database and application together. Until the migration is applied, the old database configuration remains a release blocker.

## 1. Database

Back up the existing database. In the Supabase SQL Editor (database owner role), run `supabase/migrations/202610050001_user_accounts.sql`. The root `supabase_migration.sql` is the same script for existing setup workflows. Do not run the old RLS-disabled SQL from Git history.

The migration is transactional and rerunnable. It removes previous policies on the two application tables, enables RLS, revokes anonymous privileges, adds ownership, indexes, server timestamps, 500-task/5-device limits and per-user write throttles. Both direct REST and application requests are covered. Old tasks without a verified owner remain invisible to users, not deleted. Old device subscriptions are never assigned automatically.

Create an account for `qasimzade.1806@gmail.com` through the app and verify the email. Run `supabase/claim-legacy-tasks.sql` to bind unowned tasks to that account if it did not exist when the migration ran. Never give the first registrant legacy ownership. Account deletion cascades owned tasks/subscriptions.

## 2. Auth

Enable the Supabase email/password provider and email confirmation. Set the minimum password length to 12 to match the UI. Set Site URL to the exact production origin and allow that origin as an auth redirect (plus localhost only for development). Configure production SMTP; Supabase's default email service is for testing and has restrictive recipient/rate limits. Configure Auth rate limits and bot protection appropriate to launch traffic; task write limits do not protect registration endpoints.

Implemented flows: email signup, confirmation redirect, password login, password reset, recovery password update and logout. Google OAuth is not enabled by this implementation. Passwords are handled by Supabase Auth, not by the application's database.

This is a client-rendered application using the Supabase JS SDK's session/token refresh and implicit email redirect handling. It does not render private data server-side. Every push subscription API request verifies the bearer token with `auth.getUser`; database operations run under that user's JWT and RLS. Do not use the service-role client for ordinary user requests. A future SSR conversion needs a separate cookie/PKCE integration.

## 3. Environment and keys

See `.env.example`. Supply the public Supabase URL/key and server-only service-role key through the hosting secret manager. Only the URL, anon key and VAPID PUBLIC key may use `NEXT_PUBLIC_` names.

Fresh VAPID keys and a random cron secret were generated in the local gitignored `.env.local`; the old embedded private key was removed. Transfer the corresponding environment values securely to hosting and rebuild so the public VAPID key matches the private key. Never paste the private keys in chat or commit them. Existing devices need to re-enable notifications after this rotation. Updating local keys does not rotate a deployed environment automatically.

For a later rotation, use `web-push.generateVAPIDKeys()` and replace both keys together. CRON_SECRET must have at least 32 unpredictable characters. Set VAPID_SUBJECT to a valid contact `mailto:` or HTTPS URL.

## 4. Scheduler

Schedule authenticated `GET /api/push/send` every minute with `Authorization: Bearer <CRON_SECRET>`. POST broadcasts no longer exist. Never put the cron secret in a URL. There is intentionally no unprotected fallback.

The job removes completed tasks older than 72 hours independently of whether the browser is open. If push is unconfigured, cleanup still runs. It claims at most three due reminders per invocation, for five minutes, using row locks and leases. Notifications go only to the task owner's registered devices and contain a generic message instead of task text. Failed deliveries retry after five minutes; 404/410 device subscriptions are removed.

Delivery is at-least-once: a process crash after a provider accepts the push but before the DB marks it sent can cause a retry. A stable notification tag replaces the previous visible notification where supported. A task edited after claiming may still receive one already in-flight generic notification. Load beyond three reminders per minute needs a higher-throughput worker, bounded parallelism and per-device delivery records. This implementation does not claim exactly-once external delivery.

## 5. Verification and rollout

Run `npm test`, `npm run lint`, `npm run build`, and `npm audit --omit=dev`. The DB suite runs the actual SQL migration twice in PGlite PostgreSQL, with Supabase Auth roles/helpers represented locally. It verifies anonymous denial, two-user isolation, forged ownership, server timestamps, write quotas, device isolation and reminder leases. These tests do not prove the live Supabase project has applied the migration.

In staging, register and confirm two actual accounts, test recovery email delivery, open separate browser profiles, create/update/delete tasks, check Realtime isolation, and confirm notification delivery on a real phone. Log out and switch accounts on the same device. Validate actual cron authorization and expiration. Deploy only after the live RLS/grant checks pass.

## Current limits

500 stored tasks per account, 20 list rows per page, 12 decorative lilies per pond, 5 push devices per account. Writes are limited in PostgreSQL to 60 task operations/minute and 10 subscription operations/minute. The browser initially requests at most 500 rows; an imported legacy account with more than that needs server pagination before migration into this plan. Expired records count toward the quota until the scheduler removes them. Failed/rejected writes are rolled back, so the DB counter is not a substitute for network/IP abuse protection at the hosting layer.
