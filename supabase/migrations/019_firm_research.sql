-- 로펌 심층 리서치 보고서. 웹 검색 기반 AI 리서치 결과(마케팅 전략·특장점·
-- 홈페이지 무드)를 로펌당 1건 보존한다. 재실행하면 덮어쓴다.
create table if not exists public.portal_firm_research (
    firm_id uuid primary key references public.portal_firms(id) on delete cascade,
    report jsonb not null default '{}'::jsonb,
    model text,
    brand_color text,
    applied_profiles jsonb not null default '[]'::jsonb,
    generated_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.portal_firm_research enable row level security;
revoke all on public.portal_firm_research from anon, authenticated;
grant select, insert, update, delete on public.portal_firm_research to service_role;
