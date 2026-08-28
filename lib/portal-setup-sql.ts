// 포털 테이블 셋업 SQL — supabase/migrations/013_client_portal.sql 과 동일 내용.
// 프로젝트가 CLI 에 링크되어 있지 않아, 최초 1회는 Supabase 대시보드
// SQL Editor 에서 실행한다. 관리자 화면이 테이블 부재를 감지하면 이 SQL 을
// 복사 버튼과 함께 보여준다.

export const PORTAL_SETUP_SQL = `create table if not exists portal_firms (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    access_code text not null unique,
    memo text,
    created_at timestamptz not null default now()
);

create table if not exists portal_records (
    id uuid primary key default gen_random_uuid(),
    firm_id uuid not null references portal_firms(id) on delete cascade,
    type text not null check (type in ('상담기록', '수임내역', '판결문', '기타')),
    title text not null,
    content text not null default '',
    structured jsonb,
    status text not null default '대기' check (status in ('대기', '정리됨', '확인됨')),
    created_by text not null default 'firm' check (created_by in ('firm', 'admin')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
create index if not exists idx_portal_records_firm on portal_records (firm_id, created_at desc);

create table if not exists portal_advice (
    id uuid primary key default gen_random_uuid(),
    firm_id uuid not null references portal_firms(id) on delete cascade,
    advice_date date not null,
    summary text not null,
    recommendations jsonb not null default '[]',
    todos jsonb not null default '[]',
    created_at timestamptz not null default now(),
    unique (firm_id, advice_date)
);

create table if not exists portal_worklogs (
    id uuid primary key default gen_random_uuid(),
    firm_id uuid not null references portal_firms(id) on delete cascade,
    log_date date not null,
    items jsonb not null default '[]',
    published boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (firm_id, log_date)
);

create table if not exists portal_messages (
    id uuid primary key default gen_random_uuid(),
    firm_id uuid not null references portal_firms(id) on delete cascade,
    author text not null check (author in ('firm', 'admin')),
    body text not null,
    created_at timestamptz not null default now()
);
create index if not exists idx_portal_messages_firm on portal_messages (firm_id, created_at desc);

alter table portal_firms enable row level security;
alter table portal_records enable row level security;
alter table portal_advice enable row level security;
alter table portal_worklogs enable row level security;
alter table portal_messages enable row level security;`;
