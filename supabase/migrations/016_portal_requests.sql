-- Client requests and the owner's private processing notes.
-- All access passes through cookie-authenticated server routes using service_role.
-- No anon/authenticated policy is created: cross-firm reads are never public.
create table if not exists public.portal_requests (
    id uuid primary key default gen_random_uuid(),
    firm_id uuid not null references public.portal_firms(id) on delete cascade,
    title text not null check (char_length(title) between 1 and 120),
    body text not null check (char_length(body) between 1 and 10000),
    category text not null check (category in ('광고', '블로그·콘텐츠', '홈페이지', 'SNS', '기타')),
    priority text not null default '보통' check (priority in ('보통', '긴급')),
    status text not null default '접수' check (status in ('접수', '진행중', '완료', '보류')),
    due_date date,
    admin_note text not null default '' check (char_length(admin_note) <= 6000),
    created_by text not null default 'firm' check (created_by in ('firm', 'admin')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
create index if not exists idx_portal_requests_firm_created on public.portal_requests (firm_id, created_at desc);
create index if not exists idx_portal_requests_status_created on public.portal_requests (status, created_at desc);
alter table public.portal_requests enable row level security;
revoke all on public.portal_requests from anon, authenticated;
grant select, insert, update on public.portal_requests to service_role;
