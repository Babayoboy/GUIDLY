-- Apply after creating the tables shown in the database diagram.
-- This file configures RLS and signup provisioning for that existing schema.

create or replace function public.handle_new_user()
returns trigger as $$
declare
  profile_type text;
  display_name text;
begin
  profile_type := case
    when new.raw_user_meta_data ->> 'requested_account_type' = 'expert' then 'expert'
    else 'learner'
  end;
  display_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (id, display_name, account_type, headline)
  values (new.id, display_name, profile_type, 'Independent expert')
  on conflict (id) do nothing;

  if profile_type = 'expert' then
    insert into public.expert_profiles (user_id, bio, rate_paise, currency, is_published)
    values (new.id, '', 49900, 'INR', true)
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.expert_profiles enable row level security;
alter table public.expert_categories enable row level security;
alter table public.categories enable row level security;

drop policy if exists "Public can view expert profiles" on public.profiles;
create policy "Public can view expert profiles" on public.profiles
  for select using (account_type = 'expert' or auth.uid() = id);
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Public can view published experts" on public.expert_profiles;
drop policy if exists "Anyone can view expert profiles" on public.expert_profiles;
drop policy if exists "Experts can insert their own profile" on public.expert_profiles;
drop policy if exists "Experts can update their own profile" on public.expert_profiles;
create policy "Public can view published experts" on public.expert_profiles
  for select using (is_published or auth.uid() = user_id);
drop policy if exists "Experts can create own profile" on public.expert_profiles;
create policy "Experts can create own profile" on public.expert_profiles
  for insert with check (auth.uid() = user_id);
drop policy if exists "Experts can update own profile" on public.expert_profiles;
create policy "Experts can update own profile" on public.expert_profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Public can view expert categories" on public.expert_categories;
create policy "Public can view expert categories" on public.expert_categories
  for select using (
    exists (
      select 1 from public.expert_profiles ep
      where ep.user_id = expert_id and (ep.is_published or auth.uid() = ep.user_id)
    )
  );
drop policy if exists "Experts can manage own categories" on public.expert_categories;
create policy "Experts can manage own categories" on public.expert_categories
  for all using (auth.uid() = expert_id) with check (auth.uid() = expert_id);

drop policy if exists "Public can view categories" on public.categories;
create policy "Public can view categories" on public.categories
  for select using (true);

grant select on public.profiles, public.expert_profiles, public.expert_categories, public.categories to anon, authenticated;
grant update on public.profiles to authenticated;
grant insert, update on public.expert_profiles to authenticated;
grant insert, update, delete on public.expert_categories to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'expert_profiles'
    ) then
    alter publication supabase_realtime add table public.expert_profiles;
  end if;
end;
$$;
