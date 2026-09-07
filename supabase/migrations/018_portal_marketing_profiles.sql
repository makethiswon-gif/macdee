-- Private marketing setup profile. Account passwords are encrypted by the server
-- before this table is written; no plaintext secret columns are created.
create table if not exists public.portal_marketing_profiles (
    firm_id uuid primary key references public.portal_firms(id) on delete cascade,
    profile jsonb not null default '{}'::jsonb,
    credentials_encrypted text,
    updated_by text not null default 'firm' check (updated_by in ('firm', 'admin')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.portal_marketing_profiles enable row level security;
revoke all on public.portal_marketing_profiles from anon, authenticated;
grant select, insert, update on public.portal_marketing_profiles to service_role;
