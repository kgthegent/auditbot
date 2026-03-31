// Run this once to create the magic_links table
// Usage: npx ts-node lib/db/migrate.ts
import { supabaseAdmin } from "../supabase/client";

async function migrate() {
  const { error } = await supabaseAdmin.rpc("exec_sql", {
    query: `
      create table if not exists magic_links (
        id uuid primary key default gen_random_uuid(),
        email text not null,
        token text not null unique,
        hub_id text,
        expires_at timestamptz not null,
        used boolean default false,
        created_at timestamptz default now()
      );
      create index if not exists idx_magic_links_token on magic_links(token);
    `,
  });
  if (error) console.error(error);
  else console.log("Migration complete");
}
migrate();
