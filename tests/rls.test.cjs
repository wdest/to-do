const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { PGlite } = require('@electric-sql/pglite');
const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';

test('database isolation, ownership, quotas and reminder leases', async (t) => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth;
      create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      create function auth.role() returns text language sql stable as $$ select nullif(current_setting('request.jwt.claim.role', true), '') $$;
      grant usage on schema public, auth to anon, authenticated, service_role;
      grant execute on function auth.uid(), auth.role() to anon, authenticated, service_role;
      create publication supabase_realtime;
      insert into auth.users values ('${A}', 'test-a@example.invalid', now()), ('${B}', 'test-b@example.invalid', now());
    `);
    await db.exec(readFileSync('supabase/migrations/202610050001_user_accounts.sql', 'utf8'));
    // Applying twice must remain safe.
    await db.exec(readFileSync('supabase/migrations/202610050001_user_accounts.sql', 'utf8'));
    async function as(role, uid = '') {
      await db.exec(`reset role; set request.jwt.claim.sub = '${uid}'; set request.jwt.claim.role = '${role}'; set role ${role};`);
    }
    let taskA, taskB;
    await t.test('anonymous callers cannot read or create tasks', async () => {
      await as('anon');
      await assert.rejects(db.query('select * from public.tasks'), /permission denied/);
      await assert.rejects(db.query("insert into public.tasks(title) values ('anonymous')"), /permission denied/);
      await assert.rejects(db.query('select public.claim_due_reminders()'), /permission denied/);
    });
    await t.test('each authenticated account sees only its own rows', async () => {
      await as('authenticated', A);
      taskA = (await db.query("insert into public.tasks(title) values ('A task') returning *")).rows[0];
      assert.equal(taskA.user_id, A);
      await as('authenticated', B);
      taskB = (await db.query("insert into public.tasks(title) values ('B task') returning *")).rows[0];
      const result = await db.query('select id from public.tasks');
      assert.deepEqual(result.rows.map(x => x.id), [taskB.id]);
      assert.equal((await db.query('update public.tasks set title = $1 where id = $2 returning id', ['stolen', taskA.id])).rows.length, 0);
      assert.equal((await db.query('delete from public.tasks where id = $1 returning id', [taskA.id])).rows.length, 0);
    });
    await t.test('forged ownership and server-controlled columns are rejected', async () => {
      await assert.rejects(db.query("insert into public.tasks(title,user_id) values ('forged',$1)", [A]), /Invalid owner|row-level security/);
      await assert.rejects(db.query('update public.tasks set user_id = $1 where id = $2', [A, taskB.id]), /permission denied/);
      await assert.rejects(db.query('update public.tasks set completed_at = now() where id = $1', [taskB.id]), /permission denied/);
      await assert.rejects(db.query("insert into public.tasks(title) values ('')"), /Invalid title/);
      await assert.rejects(db.query('insert into public.tasks(title) values ($1)', ['x'.repeat(501)]), /Invalid title/);
    });
    await t.test('completion timestamp is server-generated and cleared on restore', async () => {
      const done = (await db.query('update public.tasks set is_done = true where id = $1 returning completed_at', [taskB.id])).rows[0];
      assert.ok(done.completed_at);
      const restored = (await db.query('update public.tasks set is_done = false where id = $1 returning completed_at', [taskB.id])).rows[0];
      assert.equal(restored.completed_at, null);
    });
    await t.test('subscriptions cannot be read or reassigned by another user', async () => {
      const endpoint = 'https://fcm.googleapis.com/fcm/send/test';
      const subscription = JSON.stringify({ endpoint, keys: { p256dh: 'A'.repeat(87), auth: 'B'.repeat(22) } });
      await as('authenticated', A);
      await db.query('insert into public.push_subscriptions(endpoint,subscription) values ($1,$2)', [endpoint, subscription]);
      await as('authenticated', B);
      assert.equal((await db.query('select * from public.push_subscriptions')).rows.length, 0);
      await assert.rejects(db.query('insert into public.push_subscriptions(endpoint,subscription) values ($1,$2) on conflict(endpoint) do update set user_id = excluded.user_id, subscription = excluded.subscription', [endpoint, subscription]), /row-level security|Invalid owner/);
      await assert.rejects(db.query('insert into public.push_subscriptions(endpoint,subscription) values ($1,$2)', ['https://localhost/internal', JSON.stringify({endpoint:'https://localhost/internal',keys:{p256dh:'A'.repeat(87),auth:'B'.repeat(22)}})]), /Invalid subscription/);
    });
    await t.test('atomic task quota and write throttling protect direct REST writes', async () => {
      await as('service_role');
      await db.query("insert into public.tasks(user_id,title) select $1, 'bulk ' || n from generate_series(1,499) n", [A]);
      await as('authenticated', A);
      await assert.rejects(db.query("insert into public.tasks(title) values ('over quota')"), /Task limit/);
      await as('authenticated', B);
      let limited = false;
      for (let i = 0; i < 61; i++) {
        try { await db.query('update public.tasks set title = $1 where id = $2', ['B ' + i, taskB.id]); }
        catch (error) { assert.match(error.message, /rate limit/); limited = true; break; }
      }
      assert.equal(limited, true);
    });
    await t.test('lease excludes a second claim and old leases cannot clear changed reminders', async () => {
      await as('service_role');
      await db.query("update public.tasks set reminder_at = now() - interval '1 minute' where id = $1", [taskA.id]);
      const first = (await db.query('select * from public.claim_due_reminders()')).rows;
      assert.equal(first.length, 1);
      assert.equal((await db.query('select * from public.claim_due_reminders()')).rows.length, 0);
      await db.query("update public.tasks set reminder_at = now() + interval '1 day' where id = $1", [taskA.id]);
      await db.query('select public.finish_reminder($1,$2,true)', [taskA.id, first[0].reminder_lease]);
      assert.ok((await db.query('select reminder_at from public.tasks where id=$1', [taskA.id])).rows[0].reminder_at);
    });
    await t.test('unowned legacy tasks remain invisible', async () => {
      await as('service_role');
      await db.query("insert into public.tasks(user_id,title) values (null,'legacy')");
      await as('authenticated', B);
      assert.equal((await db.query("select * from public.tasks where title = 'legacy'")).rows.length, 0);
    });
  } finally { await db.close(); }
});
