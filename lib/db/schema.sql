-- AuditBot database schema
-- Run this against your Supabase project

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamptz default now(),
  plan text not null default 'free' check (plan in ('free', 'starter', 'pro', 'agency'))
);

create table if not exists portals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  hub_id text not null,
  access_token text not null,
  refresh_token text not null,
  portal_name text not null default '',
  created_at timestamptz default now(),
  unique (user_id, hub_id)
);

create table if not exists audits (
  id uuid primary key default gen_random_uuid(),
  portal_id uuid not null references portals(id) on delete cascade,
  score integer not null default 0,
  created_at timestamptz default now(),
  completed_at timestamptz
);

create table if not exists audit_checks (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references audits(id) on delete cascade,
  check_name text not null,
  severity text not null check (severity in ('high', 'medium', 'low')),
  count integer not null default 0,
  percentage numeric(5,2) not null default 0,
  status text not null check (status in ('pass', 'warn', 'fail')),
  description text not null default '',
  fix_steps jsonb not null default '[]'
);

create table if not exists email_sequences (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  portal_id uuid references portals(id) on delete cascade,
  hub_id text not null,
  audit_score integer,
  step integer not null default 0,
  created_at timestamptz default now(),
  next_send_at timestamptz,
  completed boolean default false,
  unique(user_email, portal_id)
);

-- Indexes
create index if not exists idx_portals_user_id on portals(user_id);
create index if not exists idx_audits_portal_id on audits(portal_id);
create index if not exists idx_audits_created_at on audits(created_at desc);
create index if not exists idx_audit_checks_audit_id on audit_checks(audit_id);
create index if not exists idx_email_sequences_next_send on email_sequences(next_send_at) where completed = false;
