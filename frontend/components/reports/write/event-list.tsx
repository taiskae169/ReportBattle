"use client";

import type { BattleTurn } from "@/lib/types/battle-report";
import { PHASE_LABEL, type ActionPhase, type Side } from "./types";

interface Props {
  side: Side;
  turns: BattleTurn[];
  /** 사건 삭제 (turn_id + actions 배열 내 인덱스) */
  onDeleteEvent?: (turnId: string, actionIndex: number) => void;
  /** 이 턴의 사건만 보여주기 */
  filterTurnId?: string;
  /** 이 페이즈의 사건만 보여주기 (turn ≥ 1) */
  filterPhase?: ActionPhase;
  /** true면 세로로 확장 (flex-1), 기본은 200px */
  expanded?: boolean;
}

interface DerivedEvent {
  turn_id: string;
  action_index: number;
  turn_label: string;
  phase?: ActionPhase;
  unit_name: string;
  target_name?: string;
  target_side?: Side;
  description: string;
  kind: "kill" | "obj" | "event" | "move";
}

const MOVE_LIKE = new Set([
  "scout_move",
  "move",
  "advance_move",
  "fallback",
  "charge",
]);

function deriveEvents(
  turns: BattleTurn[],
  side: Side,
  filterTurnId?: string,
  filterPhase?: ActionPhase,
): DerivedEvent[] {
  const out: DerivedEvent[] = [];
  for (const t of turns) {
    if (filterTurnId && t.id !== filterTurnId) continue;
    const label = t.phase === "prepare" ? "P" : `T${t.turn_number}`;
    t.actions.forEach((a, idx) => {
      const x = a as {
        action?: string;
        side?: Side;
        actor_player?: Side;
        phase?: ActionPhase;
        unit_name?: string;
        description?: string;
        target_unit_name?: string;
        target_side?: Side;
      };
      const action = x.action ?? "";
      if (action === "token" || action === "attach" || action === "recall") return;

      const actor = x.actor_player ?? x.side;
      if (actor !== side) return;

      // turn ≥ 1: phase 필터링 (P턴 액션은 phase 없으므로 항상 통과)
      if (filterPhase && x.phase && x.phase !== filterPhase) return;

      const kind: DerivedEvent["kind"] = MOVE_LIKE.has(action)
        ? "move"
        : action === "destroyed" || action === "kill"
          ? "kill"
          : action === "obj" || action === "objective"
            ? "obj"
            : "event";

      out.push({
        turn_id: t.id,
        action_index: idx,
        turn_label: label,
        phase: x.phase,
        unit_name: x.unit_name ?? "(미상)",
        target_name: x.target_unit_name,
        target_side: x.target_side,
        description: x.description ?? action,
        kind,
      });
    });
  }
  return out;
}

function Dot({ kind }: { kind: DerivedEvent["kind"] }) {
  const base =
    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold";
  if (kind === "kill") return <div className={`${base} bg-foreground text-background`}>✕</div>;
  if (kind === "obj") return <div className={`${base} bg-background`}>◎</div>;
  if (kind === "move") return <div className={`${base} bg-background`}>→</div>;
  return <div className={`${base} bg-background`}>!</div>;
}

export function EventList({
  side,
  turns,
  onDeleteEvent,
  filterTurnId,
  filterPhase,
  expanded = false,
}: Props) {
  const events = deriveEvents(turns, side, filterTurnId, filterPhase);

  return (
    <div
      className={`relative rounded border-2 bg-background p-3 ${
        expanded ? "flex-1 min-h-0" : "h-[200px]"
      }`}
    >
      <div className="absolute -top-3 left-3 bg-card px-1.5 text-xs font-semibold">
        턴 로그
      </div>
      <div className="h-full overflow-y-auto">
        {events.length === 0 ? (
          <p className="pt-3 text-center text-xs text-muted-foreground">
            아직 사건이 없습니다.
          </p>
        ) : (
          <ul className="flex flex-col">
            {events.map((e) => (
              <li
                key={`${e.turn_id}-${e.action_index}`}
                className="group flex items-start gap-2 border-b border-dashed py-1.5 last:border-b-0"
              >
                <Dot kind={e.kind} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1 text-xs">
                    <span className="font-mono text-muted-foreground">{e.turn_label}</span>
                    {e.phase && (
                      <span className="rounded bg-muted px-1 font-mono text-[10px] text-muted-foreground">
                        {PHASE_LABEL[e.phase]}
                      </span>
                    )}
                    <span className="font-semibold">{e.unit_name}</span>
                    {e.target_name && (
                      <span className="text-muted-foreground">
                        → <span className="font-semibold">{e.target_name}</span>
                        {e.target_side && (
                          <span className="ml-0.5 text-[10px]">({e.target_side})</span>
                        )}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">{e.description}</div>
                </div>
                {onDeleteEvent && (
                  <button
                    type="button"
                    onClick={() => onDeleteEvent(e.turn_id, e.action_index)}
                    className="shrink-0 px-1 text-xs text-muted-foreground opacity-0 transition hover:text-red-600 group-hover:opacity-100"
                    title="이 사건 삭제"
                    aria-label="이 사건 삭제"
                  >
                    ×
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
