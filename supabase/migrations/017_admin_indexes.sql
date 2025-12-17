-- 017_admin_indexes.sql
-- Defensive indexes for admin analytics.
--
-- Goals:
-- - Do not fail if payments/referrals tables or columns differ.
-- - Find the "payments" table heuristically and index by created_at, user_id+created_at, status+created_at.
-- - Find the "referrals" table heuristically and index inviter/invitee/created_at.

begin;

DO $$
declare
  t record;
  payments_table text;
  referrals_table text;

  col_user_id text;
  col_created_at text;
  col_status text;

  col_inviter text;
  col_invitee text;
  col_ref_created_at text;

  idx_name text;
begin
  -- === Find payments-like table ===
  payments_table := null;

  for t in
    select c.table_name
    from information_schema.columns c
    where c.table_schema = 'public'
    group by c.table_name
    having bool_or(c.column_name in ('user_id','auth_user_id'))
       and bool_or(c.column_name in ('amount','rub_amount','price','sum','total','total_amount'))
       and bool_or(c.column_name in ('created_at','createdAt','created'))
    order by case when c.table_name in ('payments','orders','purchases') then 0 else 1 end,
             c.table_name
  loop
    payments_table := t.table_name;
    exit;
  end loop;

  if payments_table is not null then
    select
      (select column_name from information_schema.columns where table_schema='public' and table_name=payments_table and column_name in ('user_id','auth_user_id') order by case when column_name='user_id' then 0 else 1 end limit 1),
      (select column_name from information_schema.columns where table_schema='public' and table_name=payments_table and column_name in ('created_at','createdAt','created') order by case when column_name='created_at' then 0 else 1 end limit 1),
      (select column_name from information_schema.columns where table_schema='public' and table_name=payments_table and column_name in ('status','payment_status') order by case when column_name='status' then 0 else 1 end limit 1)
    into col_user_id, col_created_at, col_status;

    if col_created_at is not null then
      idx_name := payments_table || '_' || col_created_at || '_idx';
      execute format('create index if not exists %I on public.%I (%I);', idx_name, payments_table, col_created_at);
    end if;

    if col_user_id is not null and col_created_at is not null then
      idx_name := payments_table || '_' || col_user_id || '_' || col_created_at || '_idx';
      execute format('create index if not exists %I on public.%I (%I, %I);', idx_name, payments_table, col_user_id, col_created_at);
    end if;

    if col_status is not null and col_created_at is not null then
      idx_name := payments_table || '_' || col_status || '_' || col_created_at || '_idx';
      execute format('create index if not exists %I on public.%I (%I, %I);', idx_name, payments_table, col_status, col_created_at);
    end if;
  end if;

  -- === Find referrals-like table ===
  referrals_table := null;

  for t in
    select c.table_name
    from information_schema.columns c
    where c.table_schema = 'public'
    group by c.table_name
    having bool_or(c.column_name in ('inviter_user_id','referrer_user_id','inviter_id','referrer_id'))
       and bool_or(c.column_name in ('invitee_user_id','referred_user_id','invitee_id','referred_id'))
       and bool_or(c.column_name in ('created_at','createdAt','created'))
    order by case when c.table_name in ('referrals','user_referrals','invites') then 0 else 1 end,
             c.table_name
  loop
    referrals_table := t.table_name;
    exit;
  end loop;

  if referrals_table is not null then
    select
      (select column_name from information_schema.columns where table_schema='public' and table_name=referrals_table and column_name in ('inviter_user_id','referrer_user_id','inviter_id','referrer_id') order by case when column_name='inviter_user_id' then 0 else 1 end limit 1),
      (select column_name from information_schema.columns where table_schema='public' and table_name=referrals_table and column_name in ('invitee_user_id','referred_user_id','invitee_id','referred_id') order by case when column_name='invitee_user_id' then 0 else 1 end limit 1),
      (select column_name from information_schema.columns where table_schema='public' and table_name=referrals_table and column_name in ('created_at','createdAt','created') order by case when column_name='created_at' then 0 else 1 end limit 1)
    into col_inviter, col_invitee, col_ref_created_at;

    if col_inviter is not null then
      idx_name := referrals_table || '_' || col_inviter || '_idx';
      execute format('create index if not exists %I on public.%I (%I);', idx_name, referrals_table, col_inviter);
    end if;

    if col_invitee is not null then
      idx_name := referrals_table || '_' || col_invitee || '_idx';
      execute format('create index if not exists %I on public.%I (%I);', idx_name, referrals_table, col_invitee);
    end if;

    if col_ref_created_at is not null then
      idx_name := referrals_table || '_' || col_ref_created_at || '_idx';
      execute format('create index if not exists %I on public.%I (%I);', idx_name, referrals_table, col_ref_created_at);
    end if;
  end if;
end $$;

commit;

