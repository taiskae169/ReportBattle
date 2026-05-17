"use client";

import { PHASE_LABEL, PHASE_ORDER, type ActionPhase, type Side } from "./types";

interface Props {
  firstPlayer: Side;
  onChangeFirstPlayer: (p: Side) => void;
  activePlayer: Side;
  onChangeActivePlayer: (p: Side) => void;
  currentPhase: ActionPhase;
  onChangePhase: (p: ActionPhase) => void;
}

export function PhaseControls({
  firstPlayer,
  onChangeFirstPlayer,
  activePlayer,
  onChangeActivePlayer,
  currentPhase,
  onChangePhase,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border-2 bg-card px-3 py-2">
      {/* 선후턴 */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground">선후턴</span>
        {(["A", "B"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onChangeFirstPlayer(p)}
            className={`rounded border-2 px-2 py-0.5 text-xs font-semibold transition ${
              firstPlayer === p
                ? "bg-amber-500 text-white"
                : "bg-background hover:bg-accent"
            }`}
          >
            {p} 먼저
          </button>
        ))}
      </div>

      <div className="h-5 w-px bg-border" />

      {/* 활성 플레이어 */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground">활성</span>
        {(["A", "B"] as const).map((p) => {
          const order = p === firstPlayer ? "1st" : "2nd";
          return (
            <button
              key={p}
              type="button"
              onClick={() => onChangeActivePlayer(p)}
              className={`flex items-center gap-1 rounded border-2 px-2 py-1 text-sm font-bold transition ${
                activePlayer === p
                  ? "bg-foreground text-background"
                  : "bg-background hover:bg-accent"
              }`}
            >
              <span>{p}</span>
              <span className="font-mono text-[9px] opacity-70">{order}</span>
            </button>
          );
        })}
      </div>

      <div className="h-5 w-px bg-border" />

      {/* 페이즈 */}
      <div className="flex items-center gap-1">
        <span className="mr-1 text-xs font-semibold text-muted-foreground">페이즈</span>
        {PHASE_ORDER.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onChangePhase(p)}
            className={`rounded border-2 px-2 py-1 text-xs font-medium transition ${
              currentPhase === p
                ? "bg-foreground text-background"
                : "bg-background hover:bg-accent"
            }`}
          >
            {PHASE_LABEL[p]}
          </button>
        ))}
      </div>
    </div>
  );
}
