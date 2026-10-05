# Nilufər

A private, user-based task garden built with Next.js and Supabase Auth/PostgreSQL.

```sh
npm install
cp .env.example .env.local # only on a fresh checkout; preserve existing secrets
npm run dev
```

Configure the environment, database and email provider before using accounts. Follow [deployment instructions](docs/deployment.md). The migration is in `supabase/migrations/202610050001_user_accounts.sql`.

```sh
npm test
npm run lint
npm run build
```

Tasks are protected by database RLS, with server-controlled completion timestamps. Completed tasks fade over 72 hours and are removed by an authenticated scheduled job. The UI bounds decorative rendering and paginates task rows. Push notifications are private to each account; no public broadcast API is exposed.
