"use client";

import type { BattleTurn, TurnPhase } from "@/lib/types/battle-report";
import { EventList } from "./event-list";
import { UnitChip } from "./unit-chip";
import type { ActionPhase, Side, SideRoster } from "./types";

interface Props {
  roster: SideRoster;
  turns: BattleTurn[];
  isActiveTurn?: boolean;
  vp?: number;
  /** 현재 배치된 unit_id 집합 (wounded 표시) */
  placedUnitIds?: Set<string>;
  /** character_id → host_name (표시용) */
  charactersAttached?: Map<string, string>;
  /** host_id → [{id, name}] (호스트가 가진 캐릭터들) */
  hostHasCharacters?: Map<string, Array<{ id: string; name: string }>>;
  /** P턴 합류 핸들러 (charId, charName, hostId, hostName) */
  onAttachCharacter?: (
    characterId: string,
    characterName: string,
    hostUnitId: string,
    hostUnitName: string,
  ) => void;
  /** P턴 이탈 핸들러 (character_id로 식별) */
  onDetachCharacter?: (characterId: string) => void;
  /** 사건 삭제 핸들러 */
  onDeleteEvent?: (turnId: string, actionIndex: number) => void;
  /** 현재 턴의 phase — 드래그 잠금 판정 + 유닛 리스트 노출 여부 */
  phase: TurnPhase;
  /** 이번 진영에서 scout_move 완료된 unit_id 집합 */
  scoutMovedIds?: Set<string>;
  /** 턴 로그 필터: 이 턴의 사건만 */
  currentTurnId?: string;
  /** 턴 로그 필터: 이 페이즈의 사건만 */
  currentActionPhase?: ActionPhase;
}

/** 같은 진영 내 유닛 ID 생성: "{name}#{occurrence}" (0부터 시작) */
export function makeUnitId(name: string, occurrence: number): string {
  return `${name}#${occurrence}`;
}

export function RosterColumn({
  roster,
  turns,
  isActiveTurn = false,
  vp = 0,
  placedUnitIds,
  charactersAttached,
  hostHasCharacters,
  onAttachCharacter,
  onDetachCharacter,
  onDeleteEvent,
  phase,
  scoutMovedIds,
  currentTurnId,
  currentActionPhase,
}: Props) {
  const units = roster.parsed?.units ?? [];
  const align = roster.side === "B" ? "items-end" : "items-start";
  const showUnitList = phase === "prepare";

  // 같은 이름 유닛이 여러 개인 경우 occurrence 계산
  const occurrenceCounter = new Map<string, number>();

  return (
    <div className="flex w-[240px] shrink-0 flex-col gap-2">
      {/* Roster Head */}
      <div className="rounded border-2 bg-card p-3">
        <div className={`flex flex-col gap-1 ${align}`}>
          <div className="text-lg font-semibold leading-tight">
            플레이어 {roster.side}
          </div>
          <div className="font-mono text-xs text-muted-foreground">
            {roster.parsed?.faction ?? "팩션 미정"} · {vp}VP
          </div>
          <div className="mt-1 flex gap-1.5">
            <span
              className={`rounded-full border-2 px-2 py-0.5 text-xs ${
                isActiveTurn ? "bg-foreground text-background" : ""
              }`}
            >
              {isActiveTurn ? "활성 턴" : "대기"}
            </span>
          </div>
        </div>
      </div>

      {/* Unit List — P턴에서만 표시 */}
      {showUnitList && (
      <div className="relative flex-1 rounded border-2 bg-card p-3">
        <div className="absolute -top-3 left-3 bg-card px-1.5 text-xs font-semibold">
          유닛 (지도 ↔ 드래그)
        </div>
        {units.length === 0 ? (
          <p className="pt-2 text-center text-xs text-muted-foreground">
            {roster.raw_text
              ? "파싱된 유닛이 없습니다."
              : "설정 페이지에서 아미를 파싱하세요."}
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {units.map((u) => {
              const occ = occurrenceCounter.get(u.name) ?? 0;
              occurrenceCounter.set(u.name, occ + 1);
              const unitId = makeUnitId(u.name, occ);
              const totalOccurrences = units.filter((x) => x.name === u.name).length;
              const displayName = totalOccurrences > 1 ? `${u.name} #${occ + 1}` : u.name;
              // P턴: scout_moved만 잠금 | 턴≥1: 무브페이즈에서만 드래그 가능
              const dragDisabled =
                phase === "prepare"
                  ? (scoutMovedIds?.has(unitId) ?? false)
                  : currentActionPhase !== "move";

              return (
                <UnitChip
                  key={unitId}
                  unitId={unitId}
                  side={roster.side}
                  name={displayName}
                  count={u.total_models}
                  wounded={placedUnitIds?.has(unitId) ?? false}
                  isCharacter={u.category === "character"}
                  attachedTo={charactersAttached?.get(unitId) ?? null}
                  attachedCharacters={hostHasCharacters?.get(unitId) ?? []}
                  dragDisabled={dragDisabled}
                  onAttachCharacter={
                    onAttachCharacter
                      ? (charId, charName) =>
                          onAttachCharacter(charId, charName, unitId, displayName)
                      : undefined
                  }
                  onDetachCharacter={onDetachCharacter}
                />
              );
            })}
          </div>
        )}
      </div>

      )}

      {/* 턴 로그 — P턴은 200px 고정, 그 외엔 확장 */}
      <EventList
        side={roster.side}
        turns={turns}
        onDeleteEvent={onDeleteEvent}
        filterTurnId={currentTurnId}
        filterPhase={currentActionPhase}
        expanded={!showUnitList}
      />
    </div>
  );
}

export type { Side };
