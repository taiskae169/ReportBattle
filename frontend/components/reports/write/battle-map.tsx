"use client";

import { useEffect, useRef, useState } from "react";
import type { TurnPhase } from "@/lib/types/battle-report";
import type { ActionPhase, Side, TokenAction, Zone } from "./types";
import { tokenZone } from "./types";

type UnitPayload = { side: Side; unit_id: string; unit_name: string };

export type TokenActionKind =
  // 공통
  | "destroyed"
  | "obj"
  | "event"
  | "recall"
  | "stratagem"
  // P턴
  | "scout_move"
  // command
  | "battleshock"
  // move phase
  | "move"
  | "advance_move"
  | "fallback"
  // shooting phase
  | "shooting"
  | "phase_action"
  // charge phase
  | "charge"
  // fight phase
  | "fight";

/** popover에 보여줄 액션 메뉴 정의 */
interface MenuItem {
  kind: TokenActionKind;
  label: string;
  /** destination: 맵 클릭으로 목적지 지정 | target: 다른 토큰 클릭으로 대상 지정 | description: prompt | immediate */
  needs: "destination" | "target" | "description" | "immediate";
}

const PHASE_MENU: Record<ActionPhase, MenuItem[]> = {
  command: [{ kind: "battleshock", label: "🛡️ 배틀쇼크", needs: "description" }],
  move: [
    { kind: "move", label: "🚶 무브", needs: "destination" },
    { kind: "advance_move", label: "🏃 어드밴스 무브", needs: "destination" },
    { kind: "fallback", label: "↩️ 폴백", needs: "destination" },
  ],
  shooting: [
    { kind: "shooting", label: "🔫 사격", needs: "target" },
    { kind: "phase_action", label: "⚙️ 액션", needs: "description" },
  ],
  charge: [{ kind: "charge", label: "⚔️ 차지", needs: "target" }],
  fight: [{ kind: "fight", label: "🥊 파이트", needs: "target" }],
};

const ALWAYS_AVAILABLE: MenuItem[] = [
  { kind: "stratagem", label: "✨ 스트라타젬", needs: "description" },
];

const COMMON_BOTTOM: MenuItem[] = [
  { kind: "destroyed", label: "💀 처치됨 (제거)", needs: "immediate" },
  { kind: "obj", label: "◎ 오브젝티브 점령", needs: "description" },
  { kind: "event", label: "💬 사건 메모", needs: "description" },
  { kind: "recall", label: "↺ 회수 (이벤트 없음)", needs: "immediate" },
];

interface Props {
  tokens: TokenAction[];
  /** 유닛이 어떤 zone에 놓였는지 통보. map zone일 땐 pos가 의미 있음. */
  onPlaceUnit: (
    payload: UnitPayload,
    zone: Zone,
    pos?: { x: number; y: number },
  ) => void;
  /** 토큰을 제거 영역에 드롭하면 호출 */
  onRemoveUnit: (payload: UnitPayload) => void;
  /** 토큰 클릭 → 액션 메뉴 선택 시 호출. */
  onTokenAction: (
    payload: UnitPayload,
    action: {
      kind: TokenActionKind;
      description?: string;
      from?: { x: number; y: number };
      to?: { x: number; y: number };
      target_unit_id?: string;
      target_unit_name?: string;
      target_side?: Side;
      target_destroyed?: boolean;
    },
  ) => void;
  /** 현재 턴의 마지막 (kind, side, unit_id) 액션의 to 좌표 갱신 (위치 조정용) */
  onAdjustLastTo: (
    payload: UnitPayload,
    kind: TokenActionKind,
    to: { x: number; y: number },
  ) => void;
  /** 현재 턴+페이즈에 표시할 화살표 (move=파란, attack=빨간) */
  moveArcs?: Array<{
    from: { x: number; y: number };
    to: { x: number; y: number };
    unit_name?: string;
    kind?: "move" | "attack";
  }>;
  /** scout_move 완료된 unit_id 집합 (side별) — 드래그 잠금에 사용 */
  scoutMovedIds?: Record<Side, Set<string>>;
  /** 활성 플레이어 (turn ≥ 1에서 액션 메뉴 노출 대상) */
  activePlayer?: Side;
  /** 현재 페이즈 (turn ≥ 1에서 popover 메뉴 결정) */
  currentPhase?: ActionPhase;
  /** 이번 페이즈에서 파괴된 토큰 키("{side}:{unit_id}") — X자 표시 */
  destroyedThisPhase?: Set<string>;
  /** 호스트 토큰에 작게 표시할 부착 캐릭터 이름들 (side별 host_id → names) */
  attachedNamesByHost?: Record<Side, Map<string, string[]>>;
  /** 디버깅용 표시 — metadata.deploy / terrain */
  deployLabel?: string;
  terrainLabel?: string;
  /** 맵 배경에 깔 이미지 URL (없으면 그리드만 표시) */
  terrainImageUrl?: string | null;
  /** 맵 배경에 오버레이할 배치구역 이미지 (반투명) */
  deployImageUrl?: string | null;
  /** 현재 턴의 phase — 팝오버 메뉴 분기 */
  phase: TurnPhase;
}

const VIEW_W = 720;
const VIEW_H = 480;

function clientToNormalized(el: HTMLElement, clientX: number, clientY: number) {
  const rect = el.getBoundingClientRect();
  const x = (clientX - rect.left) / rect.width;
  const y = (clientY - rect.top) / rect.height;
  return { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
}

function readUnitPayload(e: React.DragEvent): UnitPayload | null {
  const raw = e.dataTransfer.getData("application/x-unit");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UnitPayload;
  } catch {
    return null;
  }
}

function ShapeIcon({ side, size = 16 }: { side: Side; size?: number }) {
  if (side === "A") {
    return (
      <svg width={size} height={size} className="shrink-0">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 2}
          className="fill-foreground stroke-foreground"
          strokeWidth="1.5"
        />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} className="shrink-0">
      <rect
        x={2}
        y={2}
        width={size - 4}
        height={size - 4}
        fill="none"
        className="stroke-foreground"
        strokeWidth="2"
      />
    </svg>
  );
}

function ReserveToken({
  token,
  attachedNames = [],
  dragDisabled = false,
  onDragStart,
}: {
  token: TokenAction;
  attachedNames?: string[];
  dragDisabled?: boolean;
  onDragStart?: () => void;
}) {
  return (
    <div
      draggable={!dragDisabled}
      onDragStart={(e) => {
        e.dataTransfer.setData(
          "application/x-unit",
          JSON.stringify({
            side: token.side,
            unit_id: token.unit_id,
            unit_name: token.unit_name,
          } satisfies UnitPayload),
        );
        e.dataTransfer.effectAllowed = "all";
        onDragStart?.();
      }}
      className={`flex shrink-0 flex-col items-start gap-0.5 rounded border-2 bg-background px-2 py-1 ${
        dragDisabled
          ? "cursor-not-allowed opacity-60"
          : "cursor-grab active:cursor-grabbing"
      }`}
      title={
        dragDisabled
          ? `${token.unit_name} - 이동 잠김`
          : attachedNames.length > 0
            ? `${token.unit_name} (+ ${attachedNames.join(", ")})`
            : `${token.unit_name} (드래그로 이동)`
      }
    >
      <div className="flex items-center gap-1.5">
        <ShapeIcon side={token.side} size={14} />
        <span className="max-w-[120px] truncate text-xs">{token.unit_name}</span>
      </div>
      {attachedNames.length > 0 && (
        <div className="max-w-[140px] truncate pl-5 text-[9px] text-amber-700">
          + {attachedNames.join(", ")}
        </div>
      )}
    </div>
  );
}

function RemoveZone({
  onDropUnit,
}: {
  onDropUnit: (payload: UnitPayload) => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setHover(true);
      }}
      onDragLeave={() => setHover(false)}
      onDrop={(e) => {
        e.preventDefault();
        setHover(false);
        const payload = readUnitPayload(e);
        if (payload) onDropUnit(payload);
      }}
      className={`flex h-10 items-center justify-center gap-2 rounded border-2 border-dashed text-xs transition ${
        hover
          ? "border-red-500 bg-red-50 text-red-700"
          : "border-muted-foreground/40 bg-muted/10 text-muted-foreground"
      }`}
    >
      🗑️ <span>여기로 드래그해서 제거</span>
    </div>
  );
}

function ReserveBox({
  label,
  tokens,
  onDropUnit,
  attachedNamesByHost,
  phase,
  scoutMovedIds,
  currentPhase,
}: {
  label: string;
  tokens: TokenAction[];
  onDropUnit: (payload: UnitPayload) => void;
  attachedNamesByHost?: Record<Side, Map<string, string[]>>;
  phase: TurnPhase;
  scoutMovedIds?: Record<Side, Set<string>>;
  currentPhase?: ActionPhase;
}) {
  return (
    <div
      className="relative h-[72px] rounded border-2 border-dashed bg-muted/20 px-3 py-2"
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }}
      onDrop={(e) => {
        e.preventDefault();
        const payload = readUnitPayload(e);
        if (payload) onDropUnit(payload);
      }}
    >
      <div className="absolute -top-3 left-3 bg-card px-1.5 text-xs font-semibold">
        {label}
      </div>
      {tokens.length === 0 ? (
        <p className="flex h-full items-center justify-center text-xs text-muted-foreground">
          유닛 드래그 대기 중
        </p>
      ) : (
        <div className="flex h-full items-center gap-1.5 overflow-x-auto">
          {tokens.map((t, i) => {
            // P턴: scout_moved 잠금 | 턴≥1: 무브페이즈에서만 드래그 가능
            const dragDisabled =
              phase === "prepare"
                ? (scoutMovedIds?.[t.side]?.has(t.unit_id) ?? false)
                : currentPhase !== "move";
            return (
              <ReserveToken
                key={`${t.side}-${t.unit_id}-${i}`}
                token={t}
                attachedNames={attachedNamesByHost?.[t.side].get(t.unit_id) ?? []}
                dragDisabled={dragDisabled}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

interface PopoverState {
  side: Side;
  unit_id: string;
  unit_name: string;
  /** viewport 좌표 */
  x: number;
  y: number;
}

interface PendingAction {
  mode: "destination" | "target";
  kind: TokenActionKind;
  label: string;
  side: Side;
  unit_id: string;
  unit_name: string;
  from: { x: number; y: number };
}

interface PendingAdjust {
  kind: TokenActionKind;
  side: Side;
  unit_id: string;
  unit_name: string;
}

function MapCanvas({
  tokens,
  onDropUnit,
  onTokenAction,
  onAdjustLastTo,
  deployLabel,
  terrainLabel,
  terrainImageUrl,
  deployImageUrl,
  attachedNamesByHost,
  phase,
  moveArcs = [],
  scoutMovedIds,
  activePlayer,
  currentPhase,
  destroyedThisPhase,
}: {
  tokens: TokenAction[];
  onDropUnit: (
    payload: UnitPayload,
    pos: { x: number; y: number },
  ) => void;
  onTokenAction: (
    payload: UnitPayload,
    action: {
      kind: TokenActionKind;
      description?: string;
      from?: { x: number; y: number };
      to?: { x: number; y: number };
      target_unit_id?: string;
      target_unit_name?: string;
      target_side?: Side;
      target_destroyed?: boolean;
    },
  ) => void;
  onAdjustLastTo: (
    payload: UnitPayload,
    kind: TokenActionKind,
    to: { x: number; y: number },
  ) => void;
  deployLabel?: string;
  terrainLabel?: string;
  terrainImageUrl?: string | null;
  deployImageUrl?: string | null;
  attachedNamesByHost?: Record<Side, Map<string, string[]>>;
  phase: TurnPhase;
  moveArcs?: Array<{
    from: { x: number; y: number };
    to: { x: number; y: number };
    unit_name?: string;
    kind?: "move" | "attack";
  }>;
  scoutMovedIds?: Record<Side, Set<string>>;
  activePlayer?: Side;
  currentPhase?: ActionPhase;
  destroyedThisPhase?: Set<string>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hasBackgroundImage = Boolean(terrainImageUrl);
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [pendingAdjust, setPendingAdjust] = useState<PendingAdjust | null>(null);

  const closePopover = () => setPopover(null);

  // Esc로 보류 액션 / 조정 모드 취소
  useEffect(() => {
    if (!pendingAction && !pendingAdjust) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPendingAction(null);
        setPendingAdjust(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pendingAction, pendingAdjust]);

  const runMenuItem = (item: MenuItem) => {
    if (!popover) return;
    const source = {
      side: popover.side,
      unit_id: popover.unit_id,
      unit_name: popover.unit_name,
    };
    const token = tokens.find(
      (t) => t.side === popover.side && t.unit_id === popover.unit_id,
    );

    if (item.needs === "destination") {
      if (!token) {
        closePopover();
        return;
      }
      setPendingAction({
        mode: "destination",
        kind: item.kind,
        label: item.label,
        ...source,
        from: token.pos,
      });
      closePopover();
      return;
    }

    if (item.needs === "target") {
      if (!token) {
        closePopover();
        return;
      }
      setPendingAction({
        mode: "target",
        kind: item.kind,
        label: item.label,
        ...source,
        from: token.pos,
      });
      closePopover();
      return;
    }

    if (item.needs === "description") {
      const defaultDesc =
        item.kind === "battleshock"
          ? "배틀쇼크"
          : item.kind === "obj"
            ? "오브젝티브 점령"
            : item.kind === "stratagem"
              ? "스트라타젬"
              : item.kind === "phase_action"
                ? "액션"
                : "";
      const desc = window.prompt(item.label, defaultDesc);
      if (desc !== null) {
        onTokenAction(source, { kind: item.kind, description: desc || item.label });
      }
      closePopover();
      return;
    }

    // immediate
    onTokenAction(source, { kind: item.kind, description: item.label });
    closePopover();
  };

  return (
    <div
      ref={containerRef}
      className={`relative flex-1 overflow-hidden rounded border-2 bg-muted/40 ${
        pendingAction?.mode === "destination" || pendingAdjust ? "cursor-crosshair" : ""
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }}
      onDrop={(e) => {
        e.preventDefault();
        if (!containerRef.current) return;
        const payload = readUnitPayload(e);
        if (!payload) return;
        const pos = clientToNormalized(containerRef.current, e.clientX, e.clientY);
        onDropUnit(payload, pos);
      }}
      onClick={(e) => {
        if (!containerRef.current) return;
        // 1. 차지 위치 조정 모드: 클릭 시 마지막 charge 액션의 to 갱신
        if (pendingAdjust) {
          const to = clientToNormalized(containerRef.current, e.clientX, e.clientY);
          onAdjustLastTo(
            {
              side: pendingAdjust.side,
              unit_id: pendingAdjust.unit_id,
              unit_name: pendingAdjust.unit_name,
            },
            pendingAdjust.kind,
            to,
          );
          setPendingAdjust(null);
          return;
        }
        // 2. 일반 destination 모드 (move/scout_move/...)
        if (pendingAction?.mode === "destination") {
          const to = clientToNormalized(containerRef.current, e.clientX, e.clientY);
          onTokenAction(
            {
              side: pendingAction.side,
              unit_id: pendingAction.unit_id,
              unit_name: pendingAction.unit_name,
            },
            {
              kind: pendingAction.kind,
              description: pendingAction.label,
              from: pendingAction.from,
              to,
            },
          );
          setPendingAction(null);
        }
      }}
    >
      {pendingAction && (
        <div className="pointer-events-none absolute left-1/2 top-2 z-20 -translate-x-1/2 rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white shadow">
          {pendingAction.unit_name} · {pendingAction.label}:{" "}
          {pendingAction.mode === "destination"
            ? "위치 클릭"
            : "대상 유닛 클릭"}{" "}
          (Esc 취소)
        </div>
      )}
      {pendingAdjust && !pendingAction && (
        <div className="pointer-events-none absolute left-1/2 top-2 z-20 -translate-x-1/2 rounded bg-emerald-600 px-3 py-1 text-xs font-semibold text-white shadow">
          {pendingAdjust.unit_name} 위치 조정: 새 위치 클릭 (Esc로 현재 위치 유지)
        </div>
      )}
      {/* Background terrain image */}
      {terrainImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={terrainImageUrl}
          alt="Terrain layout"
          className="pointer-events-none absolute inset-0 h-full w-full object-fill"
          draggable={false}
        />
      )}
      {/* Deployment overlay (반투명) */}
      {deployImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={deployImageUrl}
          alt="Deployment zones"
          className="pointer-events-none absolute inset-0 h-full w-full object-fill opacity-60"
          draggable={false}
        />
      )}

      <div className="pointer-events-none absolute left-2 top-2 z-10 rounded bg-background/70 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground backdrop-blur-sm">
        60″ × 44″ {deployLabel && `· ${deployLabel}`} {terrainLabel && `· ${terrainLabel}`}
      </div>
      <div className="pointer-events-none absolute bottom-2 right-2 z-10 rounded bg-background/70 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground backdrop-blur-sm">
        탑다운 · 칩을 끌어다 배치
      </div>

      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        {/* 배경 이미지가 없을 때만 그리드/배치구역/센터라인 표시 */}
        {!hasBackgroundImage && (
          <>
            <defs>
              <pattern id="grid-pattern" width="72" height="48" patternUnits="userSpaceOnUse">
                <path d="M 0 0 L 0 48" className="stroke-border" strokeWidth="1" />
                <path d="M 0 0 L 72 0" className="stroke-border" strokeWidth="1" />
              </pattern>
            </defs>

            <rect width={VIEW_W} height={VIEW_H} fill="url(#grid-pattern)" />

            <rect
              x="43"
              y="29"
              width="634"
              height="86"
              fill="none"
              className="stroke-foreground/70"
              strokeWidth="1.5"
              strokeDasharray="6 4"
            />
            <rect
              x="43"
              y="365"
              width="634"
              height="86"
              fill="none"
              className="stroke-foreground/70"
              strokeWidth="1.5"
              strokeDasharray="6 4"
            />

            <line
              x1="0"
              y1="240"
              x2={VIEW_W}
              y2="240"
              className="stroke-foreground/60"
              strokeWidth="1"
              strokeDasharray="2 4"
            />
          </>
        )}

        {/* 화살표 (현재 턴 + 현재 페이즈 기준) */}
        {moveArcs.map((arc, i) => {
          const x1 = arc.from.x * VIEW_W;
          const y1 = arc.from.y * VIEW_H;
          const x2 = arc.to.x * VIEW_W;
          const y2 = arc.to.y * VIEW_H;
          const angle = Math.atan2(y2 - y1, x2 - x1);
          const arrowLen = 12;
          const ax1 = x2 - arrowLen * Math.cos(angle - Math.PI / 6);
          const ay1 = y2 - arrowLen * Math.sin(angle - Math.PI / 6);
          const ax2 = x2 - arrowLen * Math.cos(angle + Math.PI / 6);
          const ay2 = y2 - arrowLen * Math.sin(angle + Math.PI / 6);
          const isAttack = arc.kind === "attack";
          const color = isAttack ? "#dc2626" : "#2563eb";
          // 사격 화살표는 더 띄엄한 점선
          const dash = isAttack ? "3 5" : "6 4";
          return (
            <g key={`arc-${i}`}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={color}
                strokeWidth="2"
                strokeDasharray={dash}
              />
              <polygon
                points={`${x2},${y2} ${ax1},${ay1} ${ax2},${ay2}`}
                fill={color}
              />
              {arc.unit_name && (
                <text
                  x={(x1 + x2) / 2}
                  y={(y1 + y2) / 2 - 4}
                  textAnchor="middle"
                  fontSize="9"
                  fill={color}
                  className="font-semibold"
                  style={{ paintOrder: "stroke", stroke: "white", strokeWidth: 3 }}
                >
                  {arc.unit_name}
                </text>
              )}
            </g>
          );
        })}

        {/* Map tokens (부착 캐릭터 + 라벨 + 도형) */}
        {tokens.map((t, idx) => {
          const cx = t.pos.x * VIEW_W;
          const cy = t.pos.y * VIEW_H;
          const labelWidth = 140;
          const attached = attachedNamesByHost?.[t.side].get(t.unit_id) ?? [];
          const fobjHeight = attached.length > 0 ? 62 : 48;
          const isSelected =
            popover?.side === t.side && popover?.unit_id === t.unit_id;
          const isPending =
            pendingAction?.side === t.side &&
            pendingAction?.unit_id === t.unit_id;
          const tokenDragDisabled =
            phase !== "prepare" ||
            (scoutMovedIds?.[t.side]?.has(t.unit_id) ?? false);
          const isDestroyed =
            destroyedThisPhase?.has(`${t.side}:${t.unit_id}`) ?? false;
          return (
            <foreignObject
              key={`${t.side}-${t.unit_id}-${idx}`}
              x={cx - labelWidth / 2}
              y={cy - (attached.length > 0 ? 42 : 28)}
              width={labelWidth}
              height={fobjHeight}
            >
              <div
                {...({ xmlns: "http://www.w3.org/1999/xhtml" } as Record<string, string>)}
                draggable={!tokenDragDisabled}
                onDragStart={(e) => {
                  setPopover(null);
                  e.dataTransfer.setData(
                    "application/x-unit",
                    JSON.stringify({
                      side: t.side,
                      unit_id: t.unit_id,
                      unit_name: t.unit_name,
                    } satisfies UnitPayload),
                  );
                  e.dataTransfer.effectAllowed = "all";
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  // pending target 모드 — 이 토큰이 대상이 됨
                  if (pendingAction?.mode === "target") {
                    const isAttack =
                      pendingAction.kind === "shooting" ||
                      pendingAction.kind === "fight";
                    const isCharge = pendingAction.kind === "charge";
                    const destroyed = isAttack
                      ? window.confirm(`${t.unit_name}을(를) 파괴했습니까?`)
                      : false;

                    // 사격/파이트: from=시전자, to=대상 (이동 안 함)
                    // 차지: from=시전자, to=대상 근처(살짝 못 미친 위치) → 실제 이동
                    let toPos = t.pos;
                    if (isCharge) {
                      const dx = t.pos.x - pendingAction.from.x;
                      const dy = t.pos.y - pendingAction.from.y;
                      const dist = Math.sqrt(dx * dx + dy * dy);
                      const stopShort = 0.035; // 약 3.5% 거리만큼 못 미치게
                      if (dist > stopShort) {
                        const factor = (dist - stopShort) / dist;
                        toPos = {
                          x: pendingAction.from.x + dx * factor,
                          y: pendingAction.from.y + dy * factor,
                        };
                      }
                    }

                    onTokenAction(
                      {
                        side: pendingAction.side,
                        unit_id: pendingAction.unit_id,
                        unit_name: pendingAction.unit_name,
                      },
                      {
                        kind: pendingAction.kind,
                        description: destroyed
                          ? `${pendingAction.label} → 파괴`
                          : pendingAction.label,
                        from: pendingAction.from,
                        to: toPos,
                        target_unit_id: t.unit_id,
                        target_unit_name: t.unit_name,
                        target_side: t.side,
                        target_destroyed: destroyed,
                      },
                    );
                    // 차지는 자동 위치 후 사용자가 추가 조정 가능
                    if (isCharge) {
                      setPendingAdjust({
                        kind: "charge",
                        side: pendingAction.side,
                        unit_id: pendingAction.unit_id,
                        unit_name: pendingAction.unit_name,
                      });
                    }
                    setPendingAction(null);
                    return;
                  }
                  // pending destination 중 다른 토큰 클릭 → 보류 취소
                  if (pendingAction?.mode === "destination") {
                    setPendingAction(null);
                  }
                  // 모든 유닛 클릭 가능 (상대 유닛에도 액션/스트라타젬 적용)
                  setPopover({
                    side: t.side,
                    unit_id: t.unit_id,
                    unit_name: t.unit_name,
                    x: e.clientX,
                    y: e.clientY,
                  });
                }}
                className={`group flex w-full flex-col items-center ${
                  tokenDragDisabled
                    ? "cursor-pointer"
                    : "cursor-grab active:cursor-grabbing"
                }`}
                title={
                  attached.length > 0
                    ? `${t.unit_name} (+ ${attached.join(", ")}) — 클릭: 액션 메뉴`
                    : `${t.unit_name} — 클릭: 액션 메뉴`
                }
              >
                {attached.length > 0 && (
                  <div className="max-w-full truncate rounded bg-amber-50/95 px-1 text-[9px] font-semibold leading-tight text-amber-800 shadow-sm">
                    + {attached.join(", ")}
                  </div>
                )}
                <div className="max-w-full truncate rounded bg-background/90 px-1 text-[10px] font-semibold leading-tight shadow-sm">
                  {t.unit_name}
                </div>
                <div
                  className={`relative mt-1 rounded-full transition group-hover:ring-2 group-hover:ring-blue-500 ${
                    isSelected || isPending ? "ring-2 ring-blue-600" : ""
                  } ${isPending ? "animate-pulse" : ""} ${
                    isDestroyed ? "opacity-60" : ""
                  }`}
                >
                  {t.side === "A" ? (
                    <svg width="24" height="24" className="block">
                      <circle
                        cx="12"
                        cy="12"
                        r="9"
                        className="fill-foreground stroke-background"
                        strokeWidth="1.5"
                      />
                    </svg>
                  ) : (
                    <svg width="24" height="24" className="block">
                      <rect
                        x="4"
                        y="4"
                        width="16"
                        height="16"
                        fill="none"
                        className="stroke-foreground"
                        strokeWidth="2.5"
                      />
                    </svg>
                  )}
                  {isDestroyed && (
                    <svg
                      width="24"
                      height="24"
                      className="pointer-events-none absolute inset-0"
                      aria-hidden="true"
                    >
                      <line
                        x1="3"
                        y1="3"
                        x2="21"
                        y2="21"
                        stroke="#dc2626"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                      <line
                        x1="21"
                        y1="3"
                        x2="3"
                        y2="21"
                        stroke="#dc2626"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                </div>
              </div>
            </foreignObject>
          );
        })}
      </svg>

      {/* 토큰 액션 팝오버 */}
      {popover && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={closePopover}
            onContextMenu={(e) => {
              e.preventDefault();
              closePopover();
            }}
          />
          <div
            className="fixed z-50 flex w-44 flex-col gap-0.5 rounded-md border-2 bg-card p-2 shadow-lg"
            style={{
              left: Math.min(popover.x, window.innerWidth - 200),
              top: Math.min(popover.y, window.innerHeight - 220),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="truncate border-b pb-1 text-xs font-semibold">
              {popover.unit_name}
            </div>
            {phase === "prepare" ? (
              <button
                type="button"
                onClick={() =>
                  runMenuItem({
                    kind: "scout_move",
                    label: "스카웃 무브",
                    needs: "destination",
                  })
                }
                className="flex items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
              >
                <span>🏃</span> 스카웃 무브
              </button>
            ) : (
              <>
                {currentPhase &&
                  PHASE_MENU[currentPhase].map((item) => (
                    <button
                      key={item.kind}
                      type="button"
                      onClick={() => runMenuItem(item)}
                      className="flex items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
                    >
                      {item.label}
                    </button>
                  ))}
                {ALWAYS_AVAILABLE.map((item) => (
                  <button
                    key={item.kind}
                    type="button"
                    onClick={() => runMenuItem(item)}
                    className="flex items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
                  >
                    {item.label}
                  </button>
                ))}
                <div className="my-1 border-t" />
                {COMMON_BOTTOM.map((item) => (
                  <button
                    key={item.kind}
                    type="button"
                    onClick={() => runMenuItem(item)}
                    className="flex items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
                  >
                    {item.label}
                  </button>
                ))}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function BattleMap({
  tokens,
  onPlaceUnit,
  onRemoveUnit,
  onTokenAction,
  onAdjustLastTo,
  deployLabel,
  terrainLabel,
  terrainImageUrl,
  deployImageUrl,
  attachedNamesByHost,
  phase,
  moveArcs,
  scoutMovedIds,
  activePlayer,
  currentPhase,
  destroyedThisPhase,
}: Props) {
  const topReserve = tokens.filter((t) => tokenZone(t) === "reserve_top");
  const bottomReserve = tokens.filter((t) => tokenZone(t) === "reserve_bottom");
  const mapTokens = tokens.filter((t) => tokenZone(t) === "map");

  return (
    <div className="flex flex-1 flex-col gap-2 min-h-0">
      <ReserveBox
        label="리저브 (상단)"
        tokens={topReserve}
        onDropUnit={(p) => onPlaceUnit(p, "reserve_top")}
        attachedNamesByHost={attachedNamesByHost}
        phase={phase}
        scoutMovedIds={scoutMovedIds}
        currentPhase={currentPhase}
      />
      <MapCanvas
        tokens={mapTokens}
        onDropUnit={(p, pos) => onPlaceUnit(p, "map", pos)}
        onTokenAction={onTokenAction}
        onAdjustLastTo={onAdjustLastTo}
        deployLabel={deployLabel}
        terrainLabel={terrainLabel}
        terrainImageUrl={terrainImageUrl}
        deployImageUrl={deployImageUrl}
        attachedNamesByHost={attachedNamesByHost}
        phase={phase}
        moveArcs={moveArcs}
        scoutMovedIds={scoutMovedIds}
        activePlayer={activePlayer}
        currentPhase={currentPhase}
        destroyedThisPhase={destroyedThisPhase}
      />
      <ReserveBox
        label="리저브 (하단)"
        tokens={bottomReserve}
        onDropUnit={(p) => onPlaceUnit(p, "reserve_bottom")}
        attachedNamesByHost={attachedNamesByHost}
        phase={phase}
        scoutMovedIds={scoutMovedIds}
        currentPhase={currentPhase}
      />
      <RemoveZone onDropUnit={onRemoveUnit} />
    </div>
  );
}
