"use client";

import { Button } from "@/components/ui/button";
import type { BattleTurn } from "@/lib/types/battle-report";

interface Props {
  turns: BattleTurn[];
  /** 화면에 표시되는 활성 인덱스 (0..turns.length-1) */
  activeIndex: number;
  onSelect: (index: number) => void;
  onAddTurn: () => void;
  /** 현재 턴의 짧은 상태 라벨 (예: "활성 플레이어 A") */
  statusLabel?: string;
}

export function TurnRibbon({ turns, activeIndex, onSelect, onAddTurn, statusLabel }: Props) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center">
        {turns.map((t, i) => {
          const label = t.phase === "prepare" ? "P" : String(t.turn_number);
          const isActive = i === activeIndex;
          return (
            <div key={t.id} className="flex items-center">
              {i > 0 && <div className="h-0.5 w-2.5 bg-border" />}
              <button
                type="button"
                onClick={() => onSelect(i)}
                className={`flex h-9 w-9 items-center justify-center rounded border-2 text-base font-semibold transition ${
                  isActive
                    ? "bg-foreground text-background"
                    : "bg-background hover:bg-accent"
                }`}
                title={t.phase === "prepare" ? "준비 단계" : `턴 ${t.turn_number}`}
              >
                {label}
              </button>
            </div>
          );
        })}
        <div className="ml-2">
          <Button variant="outline" size="sm" onClick={onAddTurn}>
            + 턴
          </Button>
        </div>
      </div>
      {statusLabel && (
        <div className="ml-auto font-mono text-xs text-muted-foreground">
          {statusLabel}
        </div>
      )}
    </div>
  );
}
