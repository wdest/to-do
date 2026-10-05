# Supabase database rollout — 2026-10-05

Project: `zpydvfcizdugjfnnwxlm` (`to-do`).

Applied `supabase/migrations/202610050001_user_accounts.sql` through the database-owner SQL Editor. The transaction also created protected snapshots in `app_private.tasks_before_accounts_20261005` and `app_private.subscriptions_before_accounts_20261005`. Supabase's “Run and enable RLS” option was used.

## Live verification

- All 18 existing tasks and 4 subscriptions were preserved; snapshots contain the same counts.
- RLS is enabled on both application tables, with eight owner policies.
- Anonymous REST requests to both tables return HTTP 401 / PostgreSQL `42501`.
- Authenticated users cannot modify task ownership or server timestamps.
- The private schema is inaccessible to anonymous and authenticated roles.
- Reminder RPCs are restricted to the server role, and both write guards are installed.
- A transaction with two temporary Auth user IDs verified task creation, completion timestamps, read/update isolation and rejection of forged ownership. The transaction was rolled back, including all temporary users and tasks.

## Remaining account and deployment steps

At rollout, `qasimzade.1806@gmail.com` had no confirmed Auth account. All 18 legacy tasks remain unowned and hidden from application users. After the owner signs up and confirms that email, run `supabase/claim-legacy-tasks.sql` to transfer them.

This record confirms the database rollout only. Application deployment, hosted secrets, email delivery configuration and the authenticated cleanup/reminder scheduler remain separate deployment steps described in `docs/deployment.md`.
