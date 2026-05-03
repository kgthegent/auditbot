alter table portals
  drop constraint if exists portals_platform_check;

alter table portals
  add constraint portals_platform_check
  check (platform in ('hubspot', 'salesforce', 'marketo', 'marketing_cloud'));

alter table portals
  add column if not exists auth_config jsonb not null default '{}',
  add column if not exists token_expires_at timestamptz;
