-- =====================================================================================
-- SQL TRIGGER: Sinkronisasi Supabase Auth (auth.users) <-> Prisma (public.users)
-- =====================================================================================
-- CARA PAKAI:
--   1. Jalankan `prisma migrate dev` terlebih dahulu agar tabel `public.users`
--      (beserta enum `user_role`) sudah terbentuk sesuai `schema.prisma`.
--   2. Jalankan file SQL ini SATU KALI lewat Supabase SQL Editor
--      (Dashboard > SQL Editor > New Query > paste > Run).
--   3. Trigger ini melengkapi (bukan menggantikan) fallback upsert manual yang
--      ada di `lib/auth-helpers.ts` (getAuthenticatedUser()).
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 1) FUNCTION: Membuat profil public.users saat ada pendaftaran user baru
-- -------------------------------------------------------------------------------------
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

-- -------------------------------------------------------------------------------------
-- 2) FUNCTION: Sinkronisasi saat email user diubah lewat Supabase Auth
-- -------------------------------------------------------------------------------------
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

-- -------------------------------------------------------------------------------------
-- 3) FUNCTION: Soft-delete profil public.users saat user dihapus dari auth.users
-- -------------------------------------------------------------------------------------
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

-- -------------------------------------------------------------------------------------
-- 4) ROW LEVEL SECURITY (opsional, disarankan)
-- -------------------------------------------------------------------------------------
-- Karena akses data dilakukan lewat Prisma menggunakan koneksi database langsung
-- (bukan lewat Supabase client dengan anon key), RLS tidak wajib mem-block akses
-- Prisma. Namun jika tabel `public.users` juga diakses langsung lewat Supabase
-- client (mis. untuk fitur avatar upload), aktifkan RLS berikut sebagai lapisan
-- keamanan tambahan:
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
