"use client";

import { useState } from "react";
import type { Side } from "./types";

interface Props {
  /** 같은 진영 내 고유 ID (예: "Wolf Guard Terminators#1") */
  unitId: string;
  side: Side;
  name: string;
  count: number;
  wounded?: boolean;
  isCharacter?: boolean;
  /** 호스트 유닛 이름 (있으면 드래그 비활성 + "→ host" 표시) */
  attachedTo?: string | null;
  /** 호스트인 경우 부착된 캐릭터들 (id+name) */
  attachedCharacters?: Array<{ id: string; name: string }>;
  /** 호스트로 드롭당했을 때: 캐릭터의 id+name을 받음 */
  onAttachCharacter?: (characterId: string, characterName: string) => void;
  /** 이탈: character_id로 식별 */
  onDetachCharacter?: (characterId: string) => void;
  /** 자유 드래그 잠금 (P턴 이후 or scout_move 완료된 유닛) */
  dragDisabled?: boolean;
  onDragStart?: () => void;
}

function ShapeIcon({ side, wounded }: { side: Side; wounded: boolean }) {
  if (side === "A") {
    return (
      <svg width="14" height="14" className="shrink-0">
        <circle
          cx="7"
          cy="7"
          r="5.5"
          strokeWidth="1.5"
          className={wounded ? "fill-background stroke-foreground" : "fill-foreground stroke-foreground"}
        />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" className="shrink-0">
      <rect
        x="1.5"
        y="1.5"
        width="11"
        height="11"
        strokeWidth="1.5"
        className={wounded ? "fill-background stroke-foreground" : "fill-foreground stroke-foreground"}
      />
    </svg>
  );
}

interface DragPayload {
  side: Side;
  unit_id: string;
  unit_name: string;
  category?: string | null;
}

export function UnitChip({
  unitId,
  side,
  name,
  count,
  wounded = false,
  isCharacter = false,
  attachedTo = null,
  attachedCharacters = [],
  onAttachCharacter,
  onDetachCharacter,
  dragDisabled = false,
  onDragStart,
}: Props) {
  const [dropHover, setDropHover] = useState(false);

  const canAcceptCharacter = !isCharacter && !!onAttachCharacter;
  const canDrag = !attachedTo && !dragDisabled;

  const tryParse = (e: React.DragEvent): DragPayload | null => {
    const raw = e.dataTransfer.getData("application/x-unit");
    if (!raw) return null;
    try {
      return JSON.parse(raw) as DragPayload;
    } catch {
      return null;
    }
  };

  return (
    <div
      draggable={canDrag}
      onDragStart={(e) => {
        e.dataTransfer.setData(
          "application/x-unit",
          JSON.stringify({
            side,
            unit_id: unitId,
            unit_name: name,
            category: isCharacter ? "character" : "unit",
          } satisfies DragPayload),
        );
        e.dataTransfer.effectAllowed = "all";
        onDragStart?.();
      }}
      onDragOver={(e) => {
        if (!canAcceptCharacter) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDropHover(true);
      }}
      onDragLeave={() => setDropHover(false)}
      onDrop={(e) => {
        setDropHover(false);
        if (!canAcceptCharacter) return;
        const payload = tryParse(e);
        if (!payload) return;
        if (payload.category !== "character") return;
        if (payload.side !== side) return;
        if (payload.unit_id === unitId) return;
        e.preventDefault();
        e.stopPropagation();
        onAttachCharacter!(payload.unit_id, payload.unit_name);
      }}
      className={`flex flex-col gap-0.5 rounded border-2 px-2 py-1.5 transition ${
        attachedTo
          ? "cursor-not-allowed bg-muted/30 opacity-70"
          : dragDisabled
            ? "cursor-not-allowed bg-muted/20 opacity-60"
            : "cursor-grab bg-background hover:bg-accent active:cursor-grabbing"
      } ${dropHover ? "ring-2 ring-amber-500" : ""}`}
      title={
        attachedTo
          ? `${name} - ${attachedTo}에 합류 중`
          : dragDisabled
            ? `${name} - 이동 잠김 (P턴 외 / 이동 완료)`
            : canAcceptCharacter
              ? `${name} 드래그해서 배치 / 캐릭터 칩을 끌어다 합류`
              : `${name} 드래그해서 맵에 배치`
      }
    >
      <div className="flex items-center gap-2">
        <ShapeIcon side={side} wounded={wounded} />
        {isCharacter && (
          <span className="font-mono text-[9px] font-bold text-amber-600" title="캐릭터">
            ★
          </span>
        )}
        <span className={`flex-1 truncate text-xs ${wounded ? "text-muted-foreground line-through" : ""}`}>
          {name}
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">×{count}</span>
      </div>
      {attachedTo && (
        <div className="truncate pl-5 text-[10px] text-muted-foreground">
          → {attachedTo}
        </div>
      )}
      {attachedCharacters.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 pl-5 text-[10px]">
          {attachedCharacters.map((c) => (
            <span
              key={c.id}
              className="inline-flex items-center gap-0.5 rounded border border-amber-300 bg-amber-50 px-1 text-amber-800"
            >
              <span className="truncate" title={c.name}>{c.name}</span>
              {onDetachCharacter && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDetachCharacter(c.id);
                  }}
                  onDragStart={(e) => e.preventDefault()}
                  className="ml-0.5 text-[11px] leading-none hover:text-red-600"
                  title="합류 해제"
                  aria-label="합류 해제"
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
