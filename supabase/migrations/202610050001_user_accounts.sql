-- Run as the database owner. Existing unowned rows are quarantined by RLS.
begin;
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(), title text not null,
  is_done boolean default false, created_at timestamptz not null default now(),
  completed_at timestamptz, reminder_at timestamptz
);
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(), subscription jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.tasks add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.tasks alter column user_id set default auth.uid();
alter table public.tasks add column if not exists reminder_lease uuid;
alter table public.tasks add column if not exists reminder_locked_until timestamptz;
alter table public.push_subscriptions add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.push_subscriptions alter column user_id set default auth.uid();
alter table public.push_subscriptions add column if not exists endpoint text;
-- Legacy subscriptions have no verified owner: never send to or assign them automatically.

alter table public.tasks enable row level security;
alter table public.push_subscriptions enable row level security;
-- Remove old permissive policies, if present. PostgreSQL ORs permissive policies.
do $$ declare p record; begin
  for p in select tablename, policyname from pg_policies where schemaname = 'public'
    and tablename in ('tasks', 'push_subscriptions') loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;
revoke all on public.tasks, public.push_subscriptions from anon, authenticated;
grant select, delete on public.tasks to authenticated;
grant insert (id, user_id, title, is_done, reminder_at) on public.tasks to authenticated;
grant update (title, is_done, reminder_at) on public.tasks to authenticated;
grant select, delete on public.push_subscriptions to authenticated;
grant insert (user_id, endpoint, subscription) on public.push_subscriptions to authenticated;
grant update (user_id, endpoint, subscription) on public.push_subscriptions to authenticated;
grant all on public.tasks, public.push_subscriptions to service_role;

create policy tasks_select_own on public.tasks for select to authenticated using ((select auth.uid()) = user_id);
create policy tasks_insert_own on public.tasks for insert to authenticated with check ((select auth.uid()) = user_id);
create policy tasks_update_own on public.tasks for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy tasks_delete_own on public.tasks for delete to authenticated using ((select auth.uid()) = user_id);
create policy subscriptions_select_own on public.push_subscriptions for select to authenticated using ((select auth.uid()) = user_id);
create policy subscriptions_insert_own on public.push_subscriptions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy subscriptions_update_own on public.push_subscriptions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy subscriptions_delete_own on public.push_subscriptions for delete to authenticated using ((select auth.uid()) = user_id);

create index if not exists tasks_user_created_idx on public.tasks(user_id, created_at desc, id);
create index if not exists tasks_expiry_idx on public.tasks(completed_at) where is_done = true;
create index if not exists tasks_due_idx on public.tasks(reminder_at) where is_done = false and user_id is not null;
create index if not exists subscriptions_user_idx on public.push_subscriptions(user_id);
create unique index if not exists subscriptions_endpoint_idx on public.push_subscriptions(endpoint);

create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;
create table if not exists app_private.write_limits (
  user_id uuid references auth.users(id) on delete cascade,
  bucket text not null, window_start timestamptz not null, hits integer not null,
  primary key(user_id, bucket)
);
-- This function is only reachable from triggers, never from a public RPC.
create or replace function app_private.consume_write_limit(owner_id uuid, bucket_name text, max_hits integer)
returns void language plpgsql security definer set search_path = '' as $$
declare hits_now integer;
begin
  insert into app_private.write_limits(user_id, bucket, window_start, hits)
    values(owner_id, bucket_name, date_trunc('minute', now()), 1)
  on conflict(user_id, bucket) do update set
    hits = case when app_private.write_limits.window_start = date_trunc('minute', now()) then app_private.write_limits.hits + 1 else 1 end,
    window_start = date_trunc('minute', now()) returning hits into hits_now;
  if hits_now > max_hits then raise exception 'Write rate limit exceeded' using errcode = 'P0001'; end if;
end $$;
revoke all on function app_private.consume_write_limit(uuid, text, integer) from public, anon, authenticated;

create or replace function app_private.guard_task()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() = 'authenticated' then
    if (case when TG_OP = 'DELETE' then old.user_id else new.user_id end) is distinct from auth.uid()
      then raise exception 'Invalid owner'; end if;
    perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 1));
    perform app_private.consume_write_limit(auth.uid(), 'tasks', 60);
    if TG_OP = 'DELETE' then return old; end if;
    if new.title is null or char_length(trim(new.title)) not between 1 and 500 then raise exception 'Invalid title'; end if;
    if new.is_done is null then raise exception 'Invalid status'; end if;
    if TG_OP = 'INSERT' then
      if (select count(*) from public.tasks where user_id = auth.uid()) >= 500 then raise exception 'Task limit reached'; end if;
      new.created_at := now();
    elsif new.user_id is distinct from old.user_id then raise exception 'Owner cannot change';
    end if;
  end if;
  if TG_OP = 'DELETE' then return old; end if;
  if TG_OP = 'INSERT' then
    new.completed_at := case when new.is_done then now() else null end;
  elsif new.is_done is distinct from old.is_done then
    new.completed_at := case when new.is_done then now() else null end;
    new.reminder_lease := null; new.reminder_locked_until := null;
  end if;
  if TG_OP = 'UPDATE' and new.reminder_at is distinct from old.reminder_at then
    new.reminder_lease := null; new.reminder_locked_until := null;
  end if;
  return new;
end $$;
revoke all on function app_private.guard_task() from public, anon, authenticated;
drop trigger if exists guard_task on public.tasks;
create trigger guard_task before insert or update or delete on public.tasks for each row execute function app_private.guard_task();

create or replace function app_private.guard_subscription()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() = 'authenticated' then
    if (case when TG_OP = 'DELETE' then old.user_id else new.user_id end) is distinct from auth.uid() then raise exception 'Invalid owner'; end if;
    perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 2));
    perform app_private.consume_write_limit(auth.uid(), 'subscriptions', 10);
    if TG_OP = 'DELETE' then return old; end if;
    if TG_OP = 'UPDATE' and new.user_id is distinct from old.user_id then raise exception 'Owner cannot change'; end if;
    if TG_OP = 'INSERT' and not exists(select 1 from public.push_subscriptions where endpoint = new.endpoint and user_id = auth.uid())
      and (select count(*) from public.push_subscriptions where user_id = auth.uid()) >= 5 then raise exception 'Device limit reached'; end if;
    if new.endpoint is null or length(new.endpoint) > 2048 or length(new.subscription::text) > 4096
      or new.subscription->>'endpoint' is distinct from new.endpoint
      or new.endpoint !~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9.-]+\.notify\.windows\.com)/'
      or coalesce(new.subscription->'keys'->>'p256dh', '') !~ '^[A-Za-z0-9_-]{87}=?$'
      or coalesce(new.subscription->'keys'->>'auth', '') !~ '^[A-Za-z0-9_-]{22}(==)?$'
      then raise exception 'Invalid subscription'; end if;
  end if;
  if TG_OP = 'DELETE' then return old; end if;
  return new;
end $$;
revoke all on function app_private.guard_subscription() from public, anon, authenticated;
drop trigger if exists guard_subscription on public.push_subscriptions;
create trigger guard_subscription before insert or update or delete on public.push_subscriptions for each row execute function app_private.guard_subscription();

-- Short bounded batch and a lease keep concurrent schedulers from claiming the same work.
create or replace function public.claim_due_reminders()
returns setof public.tasks language sql security definer set search_path = '' as $$
  with due as (
    select id from public.tasks where user_id is not null and is_done = false
      and reminder_at <= now() and (reminder_locked_until is null or reminder_locked_until <= now())
    order by reminder_at limit 3 for update skip locked
  )
  update public.tasks t set reminder_lease = gen_random_uuid(), reminder_locked_until = now() + interval '5 minutes'
    from due where t.id = due.id returning t.*;
$$;
create or replace function public.finish_reminder(task_id uuid, lease_id uuid, succeeded boolean)
returns void language sql security definer set search_path = '' as $$
  update public.tasks set reminder_at = case when succeeded then null else reminder_at end,
    reminder_lease = null, reminder_locked_until = case when succeeded then null else now() + interval '5 minutes' end
    where id = task_id and reminder_lease = lease_id and is_done = false;
$$;
revoke all on function public.claim_due_reminders() from public, anon, authenticated;
revoke all on function public.finish_reminder(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public.claim_due_reminders() to service_role;
grant execute on function public.finish_reminder(uuid, uuid, boolean) to service_role;

-- Optional backfill only for the explicitly nominated, already verified account.
update public.tasks set user_id = (
  select id from auth.users where lower(email) = 'qasimzade.1806@gmail.com' and email_confirmed_at is not null limit 1
) where user_id is null and exists (
  select 1 from auth.users where lower(email) = 'qasimzade.1806@gmail.com' and email_confirmed_at is not null
);

do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tasks') then
    alter publication supabase_realtime add table public.tasks;
  end if;
end $$;
commit;
