import type { BattleTurnAction, ParsedRoster } from "@/lib/types/battle-report";

export type Side = "A" | "B";
export type Zone = "map" | "reserve_top" | "reserve_bottom";

export type ActionPhase = "command" | "move" | "shooting" | "charge" | "fight";

export const PHASE_ORDER: ActionPhase[] = [
  "command",
  "move",
  "shooting",
  "charge",
  "fight",
];

export const PHASE_LABEL: Record<ActionPhase, string> = {
  command: "커맨드",
  move: "무브",
  shooting: "슈팅",
  charge: "차지",
  fight: "파이트",
};

/** 위치 이동을 일으키는 액션 종류 (cumulative 상태 + 화살표 표시) */
export const MOVE_KINDS = [
  "scout_move",
  "move",
  "advance_move",
  "fallback",
  "charge",
] as const;
export type MoveKind = (typeof MOVE_KINDS)[number];

export function isMoveKind(k: string): k is MoveKind {
  return (MOVE_KINDS as readonly string[]).includes(k);
}

/**
 * 토큰 액션: 유닛이 화면 어디에 위치하는지 기록.
 * - unit_id: 같은 진영 내 고유 ID (RosterColumn에서 "{name}#{occurrence}"로 생성)
 * - unit_name: 표시용 캐시 (data가 깨지지 않게 같이 저장)
 * - zone="map"일 때 pos를 사용 (0~1 정규화)
 */
export interface TokenAction extends BattleTurnAction {
  action: "token";
  side: Side;
  unit_id: string;
  unit_name: string;
  pos: { x: number; y: number };
  zone?: Zone;
}

export function isTokenAction(a: BattleTurnAction): a is TokenAction {
  return (
    a.action === "token" &&
    typeof (a as TokenAction).unit_name === "string" &&
    !!a.pos
  );
}

/** 구버전 토큰 호환용: unit_id 없으면 unit_name으로 대체 */
export function tokenIdOf(t: TokenAction): string {
  return t.unit_id ?? t.unit_name;
}

export function tokenZone(t: TokenAction): Zone {
  return t.zone ?? "map";
}

/**
 * 캐릭터 합류 액션: P턴에서 캐릭터를 호스트 유닛에 부착.
 * id와 name 모두 저장 (id로 식별, name으로 표시).
 */
export interface AttachAction extends BattleTurnAction {
  action: "attach";
  side: Side;
  character_id: string;
  character_name: string;
  host_unit_id: string;
  host_unit_name: string;
}

export function isAttachAction(a: BattleTurnAction): a is AttachAction {
  const x = a as AttachAction;
  return (
    a.action === "attach" &&
    typeof x.character_id === "string" &&
    typeof x.host_unit_id === "string"
  );
}

/** side별 character_id → AttachAction 매핑 (값에서 호스트 정보 다 꺼낼 수 있음) */
export type AttachmentMap = Record<Side, Map<string, AttachAction>>;

export function emptyAttachments(): AttachmentMap {
  return { A: new Map(), B: new Map() };
}

export function readAttachments(actions: BattleTurnAction[]): AttachmentMap {
  const out = emptyAttachments();
  for (const a of actions) {
    if (isAttachAction(a)) {
      out[a.side].set(a.character_id, a);
    }
  }
  return out;
}

/** host_unit_id → AttachAction[] (역방향, 호스트가 가진 캐릭터들 보기) */
export function reverseAttachments(
  att: AttachmentMap,
): Record<Side, Map<string, AttachAction[]>> {
  const out: Record<Side, Map<string, AttachAction[]>> = { A: new Map(), B: new Map() };
  (["A", "B"] as const).forEach((side) => {
    for (const action of att[side].values()) {
      const arr = out[side].get(action.host_unit_id) ?? [];
      arr.push(action);
      out[side].set(action.host_unit_id, arr);
    }
  });
  return out;
}

export interface SideRoster {
  side: Side;
  player_name: string;
  parsed: ParsedRoster | null;
  raw_text: string | null;
  total_points: number | null;
}

export const TOKEN_SHAPE: Record<Side, "circle" | "square"> = {
  A: "circle",
  B: "square",
};
