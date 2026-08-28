-- 013 — MAKETHIS1 Client Portal
--
-- 마케팅 클라이언트(로펌)와 대표를 잇는 업무 포털.
--   로펌: 상담기록·수임내역·판결문 업로드 → AI 구조화(DB화) → 대표 확인
--   AI:  매일 마케팅 조언·할 일 생성, 자료 구조화, 업무일지 정리
--   대표: 당일 업무내역을 정리해 로펌에 공개
--
-- 접근은 전부 API 라우트(service role)가 담당한다.
-- RLS 는 켜되 정책을 만들지 않는다 = anon/authenticated 직접 접근 전면 차단.

create table if not exists portal_firms (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    -- 로펌 로그인용 접속 코드 (대표가 발급·전달)
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
    -- AI 구조화 결과: { 요약, 분야, 사건유형, 유입경로, 키워드[], 마케팅_시사점[], 콘텐츠_소재[] }
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
    -- [{ title, why, area }]
    recommendations jsonb not null default '[]',
    -- [{ task, owner('MAKETHIS1'|'로펌'), priority('높음'|'보통'), done }]
    todos jsonb not null default '[]',
    created_at timestamptz not null default now(),
    unique (firm_id, advice_date)
);

create table if not exists portal_worklogs (
    id uuid primary key default gen_random_uuid(),
    firm_id uuid not null references portal_firms(id) on delete cascade,
    log_date date not null,
    -- [{ area, title, detail }]
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
alter table portal_messages enable row level security;
