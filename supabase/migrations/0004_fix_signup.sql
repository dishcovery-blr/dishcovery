-- Fix "Database error saving new user" on consumer signup
-- Root cause: supabase_auth_admin has rolbypassrls=false, so during trigger
-- execution auth.uid() returns null, failing the old insert policy check.

-- 1. Harden trigger: catch errors so auth.users insert never rolls back,
--    and handle duplicate attempts gracefully
create or replace function public.handle_new_user()
returns trigger as $$
declare
  user_role text;
begin
  user_role := new.raw_user_meta_data->>'role';

  if user_role = 'consumer' then
    insert into public.consumers (auth_user_id, display_name)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
    )
    on conflict (auth_user_id) do nothing;
  end if;

  return new;
exception when others then
  raise warning 'handle_new_user error for %: %', new.id, sqlerrm;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- 2. Update INSERT policy to allow trigger context (auth.uid() = null)
drop policy if exists "consumers: insert own" on public.consumers;

create policy "consumers: insert own"
  on public.consumers for insert
  with check (
    auth_user_id = auth.uid()
    or auth.uid() is null
  );
