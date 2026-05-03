alter table audit_checks
  add column if not exists workflow_status text not null default 'open',
  add column if not exists assigned_to text,
  add column if not exists due_at timestamptz,
  add column if not exists notes text not null default '',
  add column if not exists resolved_at timestamptz;

alter table audit_checks
  drop constraint if exists audit_checks_workflow_status_check;

alter table audit_checks
  add constraint audit_checks_workflow_status_check
  check (workflow_status in ('open', 'in_progress', 'fixed', 'ignored'));

create index if not exists idx_audit_checks_workflow_status
  on audit_checks(workflow_status);
