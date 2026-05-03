alter table audit_checks
  add column if not exists example_records jsonb not null default '[]';
