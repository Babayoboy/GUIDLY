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

o public.profiles (id, display_name, account_type, headline)
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
alter table public.sessions enable row level security;
alter table public.saved_experts enable row level security;
alter table public.payments enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- Keep required columns enforced, but allow the app's signed amounts and transaction labels.
alter table public.credit_transactions
  drop constraint if exists credit_transactions_check;
alter table public.credit_transactions
  drop constraint if exists credit_transactions_transaction_type_check;
alter table public.sessions
  drop constraint if exists sessions_status_check;

drop policy if exists "Public can view expert profiles" on public.profiles;
drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Experts can view booked learners" on public.profiles;
drop policy if exists "Experts can view subscribed learners" on public.profiles;
create policy "Public can view expert profiles" on public.profiles
  for select using (
    account_type = 'expert'
    or auth.uid() = id
    or exists (
      select 1 from public.sessions s
      where s.learner_id = profiles.id
        and s.expert_id = auth.uid()
        and lower(coalesce(s.status, '')) not in ('cancelled', 'canceled', 'refunded', 'failed', 'rejected')
    )
    or exists (
      select 1 from public.saved_experts se
      where se.learner_id = profiles.id and se.expert_id = auth.uid()
    )
  );
drop policy if exists "Users can view own sessions" on public.sessions;
create policy "Users can view own sessions" on public.sessions
  for select using (auth.uid() = learner_id or auth.uid() = expert_id);
drop policy if exists "Users can view own payments" on public.payments;
create policy "Users can view own payments" on public.payments
  for select using (auth.uid() = user_id);
drop policy if exists "Users can view own credit transactions" on public.credit_transactions;
create policy "Users can view own credit transactions" on public.credit_transactions
  for select using (auth.uid() = user_id);
drop policy if exists "Participants can view conversations" on public.conversations;
drop policy if exists "Participants can read conversations" on public.conversations;
create policy "Participants can view conversations" on public.conversations
  for select using (
    (auth.uid() = learner_id or auth.uid() = expert_id)
    and exists (
      select 1 from public.sessions s
      where s.learner_id = conversations.learner_id
        and s.expert_id = conversations.expert_id
        and s.starts_at <= now()
        and s.starts_at + make_interval(mins => s.duration_minutes) > now()
        and lower(coalesce(s.status, '')) not in ('cancelled', 'canceled', 'refunded', 'failed', 'rejected', 'completed')
    )
  );
drop policy if exists "Learners can create conversations" on public.conversations;
create policy "Learners can create conversations" on public.conversations
  for insert with check (
    (auth.uid() = learner_id or auth.uid() = expert_id)
    and exists (
      select 1 from public.sessions s
      where s.learner_id = conversations.learner_id
        and s.expert_id = conversations.expert_id
        and s.starts_at <= now()
        and s.starts_at + make_interval(mins => s.duration_minutes) > now()
        and lower(coalesce(s.status, '')) not in ('cancelled', 'canceled', 'refunded', 'failed', 'rejected', 'completed')
    )
  );
drop policy if exists "Participants can view messages" on public.messages;
create policy "Participants can view messages" on public.messages
  for select using (
    exists (
      select 1 from public.conversations c
      join public.sessions s on s.learner_id = c.learner_id and s.expert_id = c.expert_id
      where c.id = messages.conversation_id
        and (c.learner_id = auth.uid() or c.expert_id = auth.uid())
        and s.starts_at <= now()
        and s.starts_at + make_interval(mins => s.duration_minutes) > now()
        and lower(coalesce(s.status, '')) not in ('cancelled', 'canceled', 'refunded', 'failed', 'rejected', 'completed')
    )
  );
drop policy if exists "Participants can send messages" on public.messages;
create policy "Participants can send messages" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      join public.sessions s on s.learner_id = c.learner_id and s.expert_id = c.expert_id
      where c.id = messages.conversation_id
        and (c.learner_id = auth.uid() or c.expert_id = auth.uid())
        and s.starts_at <= now()
        and s.starts_at + make_interval(mins => s.duration_minutes) > now()
        and lower(coalesce(s.status, '')) not in ('cancelled', 'canceled', 'refunded', 'failed', 'rejected', 'completed')
    )
  );
drop policy if exists "Learners and experts can view saved experts" on public.saved_experts;
create policy "Learners and experts can view saved experts" on public.saved_experts
  for select using (auth.uid() = learner_id or auth.uid() = expert_id);
drop policy if exists "Learners can manage saved experts" on public.saved_experts;
create policy "Learners can manage saved experts" on public.saved_experts
  for all using (auth.uid() = learner_id) with check (auth.uid() = learner_id);
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
grant select on public.sessions to authenticated;
grant select, insert, delete on public.saved_experts to authenticated;
grant select on public.payments, public.credit_transactions, public.conversations, public.messages to authenticated;
grant insert on public.conversations, public.messages to authenticated;
grant update on public.profiles to authenticated;
grant insert, update on public.expert_profiles to authenticated;
grant insert, update, delete on public.expert_categories to authenticated;

create or replace function public.book_expert_session(p_expert_id uuid)
returns uuid as $$
declare
  v_learner_id uuid := auth.uid();
  v_amount_paise bigint;
  v_balance_paise bigint;
  v_currency text;
  v_session_id uuid;
  v_payment_id uuid;
begin
  if v_learner_id is null then
    raise exception 'Authentication required';
  end if;
  if v_learner_id = p_expert_id then
    raise exception 'You cannot book your own expert profile';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(v_learner_id::text, 0));
  if not exists (select 1 from public.profiles where id = v_learner_id and account_type = 'learner') then
    raise exception 'Only learner accounts can book experts';
  end if;

  select rate_paise, currency into v_amount_paise, v_currency
  from public.expert_profiles
  where user_id = p_expert_id and is_published;
  if not found then
    raise exception 'Expert is not available';
  end if;

  select coalesce(sum(amount_paise), 0) into v_balance_paise
  from public.credit_transactions
  where user_id = v_learner_id;
  if v_balance_paise < v_amount_paise then
    raise exception 'Insufficient credit balance';
  end if;

  insert into public.sessions
    (learner_id, expert_id, title, starts_at, duration_minutes, amount_paise, currency, status)
  values
    (v_learner_id, p_expert_id, 'Mentoring session', now(), 60, v_amount_paise, v_currency, 'pending')
  returning id into v_session_id;

  insert into public.payments (user_id, amount_paise, currency, provider, status)
  values (v_learner_id, v_amount_paise, v_currency, 'demo_wallet', 'pending')
  returning id into v_payment_id;

  insert into public.credit_transactions
    (user_id, payment_id, session_id, transaction_type, amount_paise, note)
  values
    (v_learner_id, v_payment_id, v_session_id, 'demo_session_debit', -v_amount_paise, 'Simulated booking; no real payment was processed'),
    (p_expert_id, v_payment_id, v_session_id, 'demo_session_credit', v_amount_paise, 'Simulated booking; no real payment was processed');

  return v_session_id;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.get_my_credit_balance()
returns bigint as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  return coalesce((
    select sum(amount_paise)
    from public.credit_transactions
    where user_id = auth.uid()
  ), 0);
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.record_demo_topup(p_amount_paise bigint, p_provider text)
returns uuid as $$
declare
  v_user_id uuid := auth.uid();
  v_payment_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));
  if p_amount_paise < 24900 or p_amount_paise > 5000000000 then
    raise exception 'Top-up amount is outside the allowed range';
  end if;
  if p_provider not in ('upi', 'razorpay', 'card') then
    raise exception 'Unsupported payment provider';
  end if;

  insert into public.payments (user_id, amount_paise, currency, provider, status)
  values (v_user_id, p_amount_paise, 'INR', p_provider, 'pending')
  returning id into v_payment_id;

  insert into public.credit_transactions
    (user_id, payment_id, transaction_type, amount_paise, note)
  values
    (v_user_id, v_payment_id, 'demo_topup', p_amount_paise, 'Simulated top-up; no real payment was processed');

  return v_payment_id;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.record_demo_withdrawal()
returns bigint as $$
declare
  v_user_id uuid := auth.uid();
  v_balance_paise bigint;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));
  if not exists (select 1 from public.profiles where id = v_user_id and account_type = 'expert') then
    raise exception 'Only expert accounts can withdraw';
  end if;

  select coalesce(sum(amount_paise), 0) into v_balance_paise
  from public.credit_transactions
  where user_id = v_user_id;
  if v_balance_paise <= 0 then
    raise exception 'There is no credit balance to withdraw';
  end if;

  insert into public.credit_transactions
    (user_id, transaction_type, amount_paise, note)
  values
    (v_user_id, 'demo_withdrawal', -v_balance_paise, 'Simulated withdrawal; no real payout was processed');

  return v_balance_paise;
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function public.book_expert_session(uuid) from public;
revoke all on function public.get_my_credit_balance() from public;
revoke all on function public.record_demo_topup(bigint, text) from public;
revoke all on function public.record_demo_withdrawal() from public;
grant execute on function public.book_expert_session(uuid) to authenticated;
grant execute on function public.get_my_credit_balance() to authenticated;
grant execute on function public.record_demo_topup(bigint, text) to authenticated;
grant execute on function public.record_demo_withdrawal() to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'expert_profiles'
    ) then
    alter publication supabase_realtime add table public.expert_profiles;
  end if;
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'sessions'
    ) then
    alter publication supabase_realtime add table public.sessions;
  end if;
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'saved_experts'
    ) then
    alter publication supabase_realtime add table public.saved_experts;
  end if;
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'payments') then
      alter publication supabase_realtime add table public.payments;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'credit_transactions') then
      alter publication supabase_realtime add table public.credit_transactions;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'conversations') then
      alter publication supabase_realtime add table public.conversations;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages') then
      alter publication supabase_realtime add table public.messages;
    end if;
  end if;
end;
$$;
