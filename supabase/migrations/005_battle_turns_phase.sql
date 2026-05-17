-- =============================================
-- battle_turns 에 phase 컬럼 추가
-- prepare: 배치 단계 (turn_number = 0)
-- turn:    실제 게임 턴 (turn_number = 1, 2, 3, ...)
-- =============================================

alter table public.battle_turns
    add column phase text not null default 'turn'
        check (phase in ('prepare', 'turn'));

-- 동일 리포트 내 prepare는 0번으로만 존재, 각 turn 번호도 유니크
-- 기존 unique(report_id, turn_number) 제약이 (report_id, 0, 'prepare')와
-- (report_id, 0, 'turn') 충돌을 일으킬 일은 없음 (turn은 1부터 시작 권장)
-- 단, 더 명시적으로 phase까지 포함한 unique로 교체:

alter table public.battle_turns
    drop constraint if exists battle_turns_report_id_turn_number_key;

alter table public.battle_turns
    add constraint battle_turns_unique_phase_turn
        unique (report_id, phase, turn_number);
