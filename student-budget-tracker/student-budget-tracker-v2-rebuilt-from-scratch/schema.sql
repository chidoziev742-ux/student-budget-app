-- Student Budget Tracker V2 - Supabase schema reference
-- Run only if these tables do not already exist. The app is designed around this schema.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  role text not null default 'student',
  avatar_url text,
  currency text not null default '₦',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.onboarding (
  user_id uuid primary key references auth.users(id) on delete cascade,
  completed boolean not null default false,
  income_source text,
  income_amount numeric,
  income_frequency text,
  next_income_date date,
  spending_categories text[] not null default '{}',
  safe_daily_spending numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique(user_id,name)
);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month date not null,
  amount numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.category_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  period text not null,
  amount numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,category_id,period)
);

create table if not exists public.income (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null,
  amount numeric not null,
  received_date date not null default current_date,
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  description text,
  amount numeric not null,
  expense_date date not null default current_date,
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_amount numeric not null,
  saved_amount numeric not null default 0,
  target_date date,
  icon text default '🎯',
  description text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists budgets_user_month_idx on public.budgets(user_id,month);
create index if not exists income_user_date_idx on public.income(user_id,received_date);
create index if not exists expenses_user_date_idx on public.expenses(user_id,expense_date);
create index if not exists goals_user_idx on public.savings_goals(user_id,created_at desc);

alter table public.profiles enable row level security;
alter table public.onboarding enable row level security;
alter table public.categories enable row level security;
alter table public.budgets enable row level security;
alter table public.category_budgets enable row level security;
alter table public.income enable row level security;
alter table public.expenses enable row level security;
alter table public.savings_goals enable row level security;

-- Owner-only policies. If your existing policies already cover these tables, keep those policies instead of duplicating them.
do $$ begin
  create policy "profiles owner" on public.profiles for all using (auth.uid()=id) with check (auth.uid()=id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "onboarding owner" on public.onboarding for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "categories owner" on public.categories for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "budgets owner" on public.budgets for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "category budgets owner" on public.category_budgets for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "income owner" on public.income for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "expenses owner" on public.expenses for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "savings goals owner" on public.savings_goals for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
exception when duplicate_object then null; end $$;
