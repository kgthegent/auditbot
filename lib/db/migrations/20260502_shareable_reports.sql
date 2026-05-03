alter table audits
  add column if not exists report_token text unique;

create index if not exists idx_audits_report_token
  on audits(report_token);
