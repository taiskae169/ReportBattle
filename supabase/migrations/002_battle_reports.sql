-- =============================================
-- battle_reports 테이블
-- =============================================

create table public.battle_reports (
    id              uuid primary key default gen_random_uuid(),
    user_id         uuid not null references public.users (id) on delete cascade,
    title           text not null,
    status          text not null default 'draft' check (status in ('draft', 'published')),
    is_public       boolean not null default false,
    result          text check (result in ('win', 'lose', 'draw')),
    metadata        jsonb not null default '{}',
    report_text     text,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

-- metadata JSONB 예시:
-- {
--   "mission_pack": "Pariah Nexus",
--   "mission": "Vital Ground",
--   "my_score": 85,
--   "opponent_score": 72,
--   "terrain_image_url": "https://...",
--   "deploy_image_url": "https://..."
-- }

-- =============================================
-- RLS
-- =============================================

alter table public.battle_reports enable row level security;

-- 공개 리포트는 누구나 조회 가능
create policy "reports_select_public"
    on public.battle_reports for select
    using (is_public = true or auth.uid() = user_id);

-- 본인 리포트만 생성/수정/삭제 가능
create policy "reports_insert_own"
    on public.battle_reports for insert
    with check (auth.uid() = user_id);

create policy "reports_update_own"
    on public.battle_reports for update
    using (auth.uid() = user_id);

create policy "reports_delete_own"
    on public.battle_reports for delete
    using (auth.uid() = user_id);

-- =============================================
-- updated_at 자동 갱신 트리거
-- =============================================

create trigger battle_reports_set_updated_at
    before update on public.battle_reports
    for each row execute procedure public.set_updated_at();