-- 017 — Private monthly strategy reports. Additive; no existing portal data is changed.
-- Run after 016_portal_requests.sql. Neither table nor claim RPC is public.
create table if not exists public.portal_strategy_reports (
    id uuid primary key default gen_random_uuid(),
    firm_id uuid not null references public.portal_firms(id) on delete cascade,
    report_month date not null check (extract(day from report_month) = 1),
    status text not null default 'generating'
        check (status in ('generating', 'completed', 'failed', 'insufficient_data')),
    report jsonb,
    source_counts jsonb not null default '{"records":0,"requests":0,"worklogs":0,"messages":0}'::jsonb,
    model text,
    error_message text,
    claim_token uuid,
    lease_expires_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    generated_at timestamptz,
    unique (firm_id, report_month)
);
create index if not exists idx_portal_strategy_month
    on public.portal_strategy_reports (report_month desc, firm_id);
alter table public.portal_strategy_reports enable row level security;
revoke all on public.portal_strategy_reports from anon, authenticated;
grant select, insert, update, delete on public.portal_strategy_reports to service_role;

-- Atomic across concurrent Vercel invocations. Completed/empty months are immutable.
-- Claim tokens fence stale workers out of later updates. Lease > per-firm 75s deadline.
create or replace function public.claim_portal_strategy_report(
    p_firm_id uuid, p_report_month date, p_claim_token uuid
) returns table(report_id uuid, acquired boolean)
language plpgsql security definer set search_path = public, pg_temp as $$
declare claimed_id uuid;
begin
    if extract(day from p_report_month) <> 1 then
        raise exception 'report_month must be the first day of a month';
    end if;
    insert into public.portal_strategy_reports (
        firm_id, report_month, status, claim_token, lease_expires_at
    ) values (
        p_firm_id, p_report_month, 'generating', p_claim_token, now() + interval '3 minutes'
    )
    on conflict (firm_id, report_month) do update set
        status = 'generating', claim_token = excluded.claim_token,
        lease_expires_at = excluded.lease_expires_at, updated_at = now(),
        error_message = null, report = null, generated_at = null
    where portal_strategy_reports.status = 'failed'
       or (portal_strategy_reports.status = 'generating'
           and coalesce(portal_strategy_reports.lease_expires_at, '-infinity'::timestamptz) <= now())
    returning id into claimed_id;

    if claimed_id is not null then
        return query select claimed_id, true;
    else
        return query select id, false from public.portal_strategy_reports
            where firm_id = p_firm_id and report_month = p_report_month;
    end if;
end;
$$;
revoke all on function public.claim_portal_strategy_report(uuid, date, uuid) from public, anon, authenticated;
grant execute on function public.claim_portal_strategy_report(uuid, date, uuid) to service_role;
