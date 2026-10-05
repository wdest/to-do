-- Run as database owner AFTER this email has signed up and verified ownership.
-- Never expose this operation through an anonymous/client-callable RPC.
do $$
declare owner_id uuid;
begin
  select id into owner_id from auth.users
    where lower(email) = 'qasimzade.1806@gmail.com' and email_confirmed_at is not null;
  if owner_id is null then raise exception 'The nominated owner must register and confirm their email first'; end if;
  update public.tasks set user_id = owner_id where user_id is null;
end $$;
