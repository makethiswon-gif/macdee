-- 딥마카이 크루룸: PD와 진행자 4명이 공지·아이디어·잡담을 나누는 비공개 보드.
-- URL 토큰으로만 접근하고, 읽기·쓰기는 서버(service_role)만 한다.
create table if not exists public.deepmakai_crew_items (
    id uuid primary key default gen_random_uuid(),
    kind text not null check (kind in ('notice', 'idea', 'talk')),
    author text not null,                       -- 멤버 키(pd/kim/lee/son/seo)
    title text,
    body text not null,
    status text,                                -- 아이디어: new/review/picked/shooting/done/hold
    meta jsonb not null default '{}'::jsonb,    -- 아이디어 종류, 공지 날짜 등
    reactions jsonb not null default '{}'::jsonb, -- {"fist": ["kim","son"]}
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create index if not exists deepmakai_crew_items_kind_created_idx
    on public.deepmakai_crew_items (kind, created_at desc)
    where deleted_at is null;

alter table public.deepmakai_crew_items enable row level security;
revoke all on public.deepmakai_crew_items from anon, authenticated;
grant select, insert, update, delete on public.deepmakai_crew_items to service_role;
