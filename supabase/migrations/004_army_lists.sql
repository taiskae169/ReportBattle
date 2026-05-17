-- =============================================
-- army_lists 테이블
-- =============================================

create table public.army_lists (
    id              uuid primary key default gen_random_uuid(),
    report_id       uuid not null references public.battle_reports (id) on delete cascade,
    player_name     text not null,
    raw_text        text,
    total_points    int,
    created_at      timestamptz not null default now()
);

-- =============================================
-- RLS
-- =============================================

alter table public.army_lists enable row level security;

-- 리포트 접근 권한을 따라감
create policy "army_lists_select"
    on public.army_lists for select
    using (
        exists (
            select 1 from public.battle_reports r
            where r.id = report_id
            and (r.is_public = true or r.user_id = auth.uid())
        )
    );

create policy "army_lists_insert_own"
    on public.army_lists for insert
    with check (
        exists (
            select 1 from public.battle_reports r
            where r.id = report_id
            and r.user_id = auth.uid()
        )
    );

create policy "army_lists_update_own"
    on public.army_lists for update
    using (
        exists (
            select 1 from public.battle_reports r
            where r.id = report_id
            and r.user_id = auth.uid()
        )
    );

create policy "army_lists_delete_own"
    on public.army_lists for delete
    using (
        exists (
            select 1 from public.battle_reports r
            where r.id = report_id
            and r.user_id = auth.uid()
        )
    );
