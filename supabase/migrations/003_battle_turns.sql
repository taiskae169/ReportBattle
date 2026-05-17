-- =============================================
-- battle_turns 테이블
-- =============================================

create table public.battle_turns (
    id              uuid primary key default gen_random_uuid(),
    report_id       uuid not null references public.battle_reports (id) on delete cascade,
    turn_number     int not null,
    memo            text,
    actions         jsonb not null default '[]',
    report_text     text,
    created_at      timestamptz not null default now(),
    unique (report_id, turn_number)
);

-- actions JSONB 예시 (flat 행동 순서 리스트):
-- [
--   {"unit_name": "Intercessors", "action": "move", "from": {"x": 0.3, "y": 0.5}, "to": {"x": 0.5, "y": 0.6}},
--   {"unit_name": "Intercessors", "action": "shoot", "to": {"x": 0.7, "y": 0.8}},
--   {"unit_name": "Chaos Marines", "action": "destroyed", "pos": {"x": 0.7, "y": 0.8}}
-- ]

-- =============================================
-- RLS
-- =============================================

alter table public.battle_turns enable row level security;

-- 리포트 접근 권한을 따라감 (공개 리포트면 누구나, 아니면 본인만)
create policy "turns_select"
    on public.battle_turns for select
    using (
        exists (
            select 1 from public.battle_reports r
            where r.id = report_id
            and (r.is_public = true or r.user_id = auth.uid())
        )
    );

create policy "turns_insert_own"
    on public.battle_turns for insert
    with check (
        exists (
            select 1 from public.battle_reports r
            where r.id = report_id
            and r.user_id = auth.uid()
        )
    );

create policy "turns_update_own"
    on public.battle_turns for update
    using (
        exists (
            select 1 from public.battle_reports r
            where r.id = report_id
            and r.user_id = auth.uid()
        )
    );

create policy "turns_delete_own"
    on public.battle_turns for delete
    using (
        exists (
            select 1 from public.battle_reports r
            where r.id = report_id
            and r.user_id = auth.uid()
        )
    );
