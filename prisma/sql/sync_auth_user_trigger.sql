-- =====================================================================================
-- SQL TRIGGER: Sync Supabase Auth (auth.users) <-> Prisma (public.users)
-- =====================================================================================
-- USAGE:
--   1. Run `prisma migrate dev` first so the `public.users` table
--      (and `user_role` enum) are created from `schema.prisma`.
--   2. Run this SQL file ONCE via Supabase SQL Editor.
--   3. This trigger complements the server-side fallback upsert
--      in `lib/auth-helpers.ts` (getAuthenticatedUser()).
-- =====================================================================================

-- Create public.users profile when a new user registers
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, role, is_active, created_at, updated_at)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    ),
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'CASHIER'::user_role),
    true,
    now(),
    now()
  )
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now();

  return new;
end;
$$;

-- Trigger: setiap kali ada baris baru masuk ke auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_auth_user();

-- Sync when user email is changed via Supabase Auth
create or replace function public.handle_auth_user_email_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.users
       set email = new.email,
           updated_at = now()
     where id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row
  execute procedure public.handle_auth_user_email_update();

-- Soft-delete public.users profile when user is deleted from auth.users
create or replace function public.handle_auth_user_deleted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users
     set deleted_at = now(),
         is_active = false,
         updated_at = now()
   where id = old.id;

  return old;
end;
$$;

drop trigger if exists on_auth_user_deleted on auth.users;
create trigger on_auth_user_deleted
  after delete on auth.users
  for each row
  execute procedure public.handle_auth_user_deleted();

-- ROW LEVEL SECURITY (optional, recommended)
-- Because data access is performed via Prisma using a direct database connection
-- (not via Supabase client with anon key), RLS is not required to block 
-- Prisma access. However, if the `public.users` table is also accessed directly 
-- via Supabase client (e.g., for avatar upload features), enable the following RLS 
-- as an additional security layer:
--
-- alter table public.users enable row level security;
--
-- create policy "Users can view their own profile"
--   on public.users for select
--   using (auth.uid() = id);
--
-- create policy "Users can update their own profile (limited fields via app logic)"
--   on public.users for update
--   using (auth.uid() = id);
