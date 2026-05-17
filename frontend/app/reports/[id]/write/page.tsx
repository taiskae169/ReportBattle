"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import { Button } from "@/components/ui/button";
import type {
  BattleReport,
  BattleTurn,
  BattleTurnAction,
  BattleTurnCreate,
  ParsedRoster,
} from "@/lib/types/battle-report";
import { getDeployImage, getTerrainImage } from "@/lib/config/map-assets";
import { VSBanner } from "@/components/reports/write/vs-banner";
import { RosterColumn } from "@/components/reports/write/roster-column";
import { TurnRibbon } from "@/components/reports/write/turn-ribbon";
import { BattleMap } from "@/components/reports/write/battle-map";
import { ScoreBar } from "@/components/reports/write/score-bar";
import { NarrativeEditor } from "@/components/reports/write/narrative-editor";
import { PhaseControls } from "@/components/reports/write/phase-controls";
import {
  emptyAttachments,
  isAttachAction,
  isMoveKind,
  isTokenAction,
  PHASE_ORDER,
  readAttachments,
  reverseAttachments,
  type ActionPhase,
  type AttachAction,
  type AttachmentMap,
  type Side,
  type SideRoster,
  type TokenAction,
  type Zone,
} from "@/components/reports/write/types";

function makeSideRoster(
  side: Side,
  army: BattleReport["army_lists"][number] | undefined,
  parsed: ParsedRoster | null,
): SideRoster {
  return {
    side,
    player_name: army?.player_name ?? "",
    parsed,
    raw_text: army?.raw_text ?? null,
    total_points: army?.total_points ?? null,
  };
}

export default function WriteReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [report, setReport] = useState<BattleReport | null>(null);
  const [parsedA, setParsedA] = useState<ParsedRoster | null>(null);
  const [parsedB, setParsedB] = useState<ParsedRoster | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activePlayer, setActivePlayer] = useState<Side>("A");
  const [currentPhase, setCurrentPhase] = useState<ActionPhase>("command");
  /** 각 플레이어의 마지막 페이즈 기억 (활성 플레이어 전환 시 복원) */
  const [playerPhases, setPlayerPhases] = useState<Record<Side, ActionPhase>>({
    A: "command",
    B: "command",
  });

  // ---- 초기 로드 ----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await apiGet<BattleReport>(`/api/v1/reports/${id}`);
        if (cancelled) return;
        setReport(r);

        // prepare 단계가 없으면 자동 생성
        const hasPrepare = r.turns.some((t) => t.phase === "prepare");
        if (!hasPrepare) {
          const created = await apiPost<BattleTurn>(`/api/v1/reports/${id}/turns`, {
            phase: "prepare",
            turn_number: 0,
            memo: null,
            actions: [],
            report_text: null,
          } satisfies BattleTurnCreate);
          if (!cancelled) {
            setReport((prev) =>
              prev ? { ...prev, turns: sortTurns([...prev.turns, created]) } : prev
            );
          }
        }

        // 양쪽 아미 파싱
        const [a, b] = await Promise.all([
          r.army_lists[0]?.raw_text
            ? apiPost<ParsedRoster>("/api/v1/roster/parse", { raw_text: r.army_lists[0].raw_text })
            : Promise.resolve(null),
          r.army_lists[1]?.raw_text
            ? apiPost<ParsedRoster>("/api/v1/roster/parse", { raw_text: r.army_lists[1].raw_text })
            : Promise.resolve(null),
        ]);
        if (cancelled) return;
        setParsedA(a);
        setParsedB(b);
      } catch {
        toast.error("리포트를 불러올 수 없습니다.");
        router.push("/reports");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  const sortedTurns = useMemo(() => (report ? sortTurns(report.turns) : []), [report]);
  const currentTurn = sortedTurns[activeIndex];

  /** 현재 턴의 선후턴 (round_setup 액션에서 읽음, 없으면 A) */
  const firstPlayer: Side = useMemo(() => {
    if (!currentTurn) return "A";
    const setup = (currentTurn.actions ?? []).find(
      (a) => (a as { action?: string }).action === "round_setup",
    ) as { first_player?: Side } | undefined;
    return setup?.first_player ?? "A";
  }, [currentTurn]);

  /** 턴이 바뀌면 선후턴 따라 활성 플레이어 + 페이즈 초기화 */
  useEffect(() => {
    if (currentTurn?.phase !== "turn") return;
    setPlayerPhases({ A: "command", B: "command" });
    setActivePlayer(firstPlayer);
    setCurrentPhase("command");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTurn?.id]);

  // ---- 도우미 ----
  const updateTurnById = useCallback(
    (
      turnId: string,
      patch: Partial<Pick<BattleTurn, "actions" | "report_text" | "memo">>,
    ) => {
      if (!report) return;
      const target = report.turns.find((t) => t.id === turnId);
      if (!target) return;
      const optimistic = { ...target, ...patch } as BattleTurn;
      setReport({
        ...report,
        turns: report.turns.map((t) => (t.id === turnId ? optimistic : t)),
      });
      apiPatch<BattleTurn>(`/api/v1/reports/${id}/turns/${turnId}`, {
        phase: target.phase,
        turn_number: target.turn_number,
        memo: optimistic.memo,
        actions: optimistic.actions,
        report_text: optimistic.report_text,
      } satisfies BattleTurnCreate).catch(() => toast.error("턴 저장 실패"));
    },
    [id, report],
  );

  const updateCurrentTurn = useCallback(
    (patch: Partial<Pick<BattleTurn, "actions" | "report_text" | "memo">>) => {
      if (!currentTurn) return;
      updateTurnById(currentTurn.id, patch);
    },
    [currentTurn, updateTurnById],
  );

  /** 현재 턴의 선후턴 설정 (round_setup 액션 upsert) + 활성/페이즈도 같이 리셋 */
  const handleSetFirstPlayer = useCallback(
    (player: Side) => {
      if (!currentTurn) return;
      const filtered = (currentTurn.actions ?? []).filter(
        (a) => (a as { action?: string }).action !== "round_setup",
      );
      const setupAction = {
        action: "round_setup",
        first_player: player,
      } as BattleTurnAction;
      updateCurrentTurn({ actions: [...filtered, setupAction] });
      // 선후턴 선택 = 턴의 시작이므로 활성/페이즈 메모리 리셋
      setPlayerPhases({ A: "command", B: "command" });
      setActivePlayer(player);
      setCurrentPhase("command");
    },
    [currentTurn, updateCurrentTurn],
  );

  /** 활성 플레이어 전환 — 현 플레이어의 페이즈 저장 + 대상 플레이어 페이즈 복원 */
  const handleSwitchActivePlayer = useCallback(
    (newPlayer: Side) => {
      if (newPlayer === activePlayer) return;
      setPlayerPhases((prev) => ({ ...prev, [activePlayer]: currentPhase }));
      setActivePlayer(newPlayer);
      setCurrentPhase(playerPhases[newPlayer]);
    },
    [activePlayer, currentPhase, playerPhases],
  );

  /** 페이즈 변경 시에도 현 플레이어 메모리 갱신 */
  const handleChangePhase = useCallback(
    (phase: ActionPhase) => {
      setCurrentPhase(phase);
      setPlayerPhases((prev) => ({ ...prev, [activePlayer]: phase }));
    },
    [activePlayer],
  );

  /** 현재 턴에 round_setup 액션이 있는지 (선후턴이 선택됐는지) */
  const hasRoundSetup = useMemo(() => {
    if (!currentTurn) return true;
    return (currentTurn.actions ?? []).some(
      (a) => (a as { action?: string }).action === "round_setup",
    );
  }, [currentTurn]);

  /**
   * 단일 진입점: chip/reserve/map 어디서 와도
   * (side, unit_id)가 같으면 한 토큰만 유지하고 zone/pos를 갱신.
   */
  const handlePlaceUnit = useCallback(
    (
      payload: { side: Side; unit_id: string; unit_name: string },
      zone: Zone,
      pos?: { x: number; y: number },
    ) => {
      if (!currentTurn) return;
      const finalPos = pos ?? { x: 0, y: 0 };
      const newAction: TokenAction = {
        action: "token",
        side: payload.side,
        unit_id: payload.unit_id,
        unit_name: payload.unit_name,
        pos: finalPos,
        zone,
      };
      const filtered = (currentTurn.actions ?? []).filter(
        (a) =>
          !(isTokenAction(a) && a.unit_id === payload.unit_id && a.side === payload.side),
      );
      updateCurrentTurn({ actions: [...filtered, newAction as BattleTurnAction] });
    },
    [currentTurn, updateCurrentTurn],
  );

  /**
   * 액션을 현재 턴에 append. 위치 변동은 cumulative 계산에서 자동 처리됨.
   * turn ≥ 1에서는 actor_player(활성 플레이어) + phase가 자동으로 함께 저장됨.
   * 사건 로그는 actor_player 기준으로 그루핑됨.
   */
  const handleTokenAction = useCallback(
    (
      payload: { side: Side; unit_id: string; unit_name: string },
      action: {
        kind: string;
        description?: string;
        from?: { x: number; y: number };
        to?: { x: number; y: number };
        target_unit_id?: string;
        target_unit_name?: string;
        target_side?: Side;
        target_destroyed?: boolean;
      },
    ) => {
      if (!currentTurn) return;
      const isPrepare = currentTurn.phase === "prepare";
      const meta = isPrepare
        ? {}
        : { actor_player: activePlayer, phase: currentPhase };

      const newAction = {
        action: action.kind,
        side: payload.side,
        unit_id: payload.unit_id,
        unit_name: payload.unit_name,
        description: action.description ?? action.kind,
        ...meta,
        ...(action.from && { from: action.from }),
        ...(action.to && { to: action.to }),
        ...(action.target_unit_id && { target_unit_id: action.target_unit_id }),
        ...(action.target_unit_name && { target_unit_name: action.target_unit_name }),
        ...(action.target_side && { target_side: action.target_side }),
      } as BattleTurnAction;

      const newActions: BattleTurnAction[] = [newAction];

      // 사격/파이트로 대상이 파괴된 경우: destroyed 액션도 함께 (actor는 공격자)
      if (
        action.target_destroyed &&
        action.target_side &&
        action.target_unit_id
      ) {
        const killAction = {
          action: "destroyed",
          side: action.target_side,
          unit_id: action.target_unit_id,
          unit_name: action.target_unit_name ?? "",
          description: `${payload.unit_name}의 ${
            action.kind === "shooting" ? "사격" : "근접"
          }으로 파괴`,
          ...meta,
        } as BattleTurnAction;
        newActions.push(killAction);
      }

      updateCurrentTurn({
        actions: [...(currentTurn.actions ?? []), ...newActions],
      });
    },
    [currentTurn, updateCurrentTurn, activePlayer, currentPhase],
  );

  /**
   * 현재 턴에서 (kind, side, unit_id) 와 매칭되는 마지막 액션의 to 좌표만 갱신.
   * 차지 위치 조정에 사용.
   */
  const handleAdjustLastTo = useCallback(
    (
      payload: { side: Side; unit_id: string; unit_name: string },
      kind: string,
      to: { x: number; y: number },
    ) => {
      if (!currentTurn) return;
      const actions = [...(currentTurn.actions ?? [])];
      for (let i = actions.length - 1; i >= 0; i--) {
        const a = actions[i] as {
          action?: string;
          side?: Side;
          unit_id?: string;
        };
        if (
          a.action === kind &&
          a.side === payload.side &&
          a.unit_id === payload.unit_id
        ) {
          actions[i] = { ...actions[i], to } as BattleTurnAction;
          updateCurrentTurn({ actions });
          return;
        }
      }
    },
    [currentTurn, updateCurrentTurn],
  );

  const handleDeleteEvent = useCallback(
    (turnId: string, actionIndex: number) => {
      if (!report) return;
      const turn = report.turns.find((t) => t.id === turnId);
      if (!turn) return;
      const next = [...(turn.actions ?? [])];
      if (actionIndex < 0 || actionIndex >= next.length) return;
      next.splice(actionIndex, 1);
      updateTurnById(turnId, { actions: next });
    },
    [report, updateTurnById],
  );

  /**
   * 토큰 회수: recall 액션을 현재 턴에 append.
   * cumulative 계산에서 이전 턴의 토큰까지 자동으로 사라짐.
   */
  const handleRemoveUnit = useCallback(
    (payload: { side: Side; unit_id: string; unit_name?: string }) => {
      if (!currentTurn) return;
      const recallAction = {
        action: "recall",
        side: payload.side,
        unit_id: payload.unit_id,
        unit_name: payload.unit_name ?? "",
      } as BattleTurnAction;
      updateCurrentTurn({
        actions: [...(currentTurn.actions ?? []), recallAction],
      });
    },
    [currentTurn, updateCurrentTurn],
  );

  const handleAddTurn = useCallback(async () => {
    if (!report) return;
    const maxTurnNumber = Math.max(
      0,
      ...report.turns.filter((t) => t.phase === "turn").map((t) => t.turn_number)
    );
    const nextTurnNumber = maxTurnNumber + 1;
    try {
      const created = await apiPost<BattleTurn>(`/api/v1/reports/${id}/turns`, {
        phase: "turn",
        turn_number: nextTurnNumber,
        memo: null,
        actions: [],
        report_text: null,
      } satisfies BattleTurnCreate);
      const nextTurns = sortTurns([...report.turns, created]);
      setReport({ ...report, turns: nextTurns });
      setActiveIndex(nextTurns.findIndex((t) => t.id === created.id));
    } catch {
      toast.error("턴 추가 실패");
    }
  }, [id, report]);

  const handleNarrativeSave = useCallback(
    (text: string) => {
      updateCurrentTurn({ report_text: text || null });
    },
    [updateCurrentTurn],
  );

  /**
   * 다음 페이즈로:
   * - 일반: 다음 phase로 진행
   * - 파이트 끝 + 선턴: 후턴(다른 플레이어) command로
   * - 파이트 끝 + 후턴: 다음 턴으로 (있으면 이동, 없으면 생성)
   */
  const handleNextPhase = useCallback(() => {
    const idx = PHASE_ORDER.indexOf(currentPhase);
    if (idx < PHASE_ORDER.length - 1) {
      handleChangePhase(PHASE_ORDER[idx + 1]);
      return;
    }
    // fight 끝
    const secondPlayer: Side = firstPlayer === "A" ? "B" : "A";
    if (activePlayer === firstPlayer) {
      // 후턴으로 전환 (command 페이즈)
      setPlayerPhases({ [activePlayer]: "fight", [secondPlayer]: "command" } as Record<Side, ActionPhase>);
      setActivePlayer(secondPlayer);
      setCurrentPhase("command");
    } else {
      // 후턴 파이트 끝 → 다음 턴
      const nextIdx = activeIndex + 1;
      if (nextIdx < sortedTurns.length) {
        setActiveIndex(nextIdx);
      } else {
        handleAddTurn();
      }
    }
  }, [
    currentPhase,
    activePlayer,
    firstPlayer,
    activeIndex,
    sortedTurns.length,
    handleChangePhase,
    handleAddTurn,
  ]);

  /**
   * 이전 페이즈로:
   * - 일반: 이전 phase로
   * - command + 후턴: 선턴 fight 페이즈로
   * - command + 선턴: 이전 턴으로
   */
  const handlePrevPhase = useCallback(() => {
    const idx = PHASE_ORDER.indexOf(currentPhase);
    if (idx > 0) {
      handleChangePhase(PHASE_ORDER[idx - 1]);
      return;
    }
    // command에서 prev
    if (activePlayer !== firstPlayer) {
      // 후턴 → 선턴 fight로
      setPlayerPhases({ [activePlayer]: "command", [firstPlayer]: "fight" } as Record<Side, ActionPhase>);
      setActivePlayer(firstPlayer);
      setCurrentPhase("fight");
    } else if (activeIndex > 0) {
      // 선턴 command → 이전 턴
      setActiveIndex(activeIndex - 1);
    }
  }, [currentPhase, activePlayer, firstPlayer, activeIndex, handleChangePhase]);

  const prepareTurn = useMemo(
    () => sortedTurns.find((t) => t.phase === "prepare") ?? null,
    [sortedTurns],
  );

  const handleAttachCharacter = useCallback(
    (
      side: Side,
      characterId: string,
      characterName: string,
      hostUnitId: string,
      hostUnitName: string,
    ) => {
      if (!prepareTurn) return;
      const filtered = (prepareTurn.actions ?? []).filter(
        (a) =>
          !(
            isAttachAction(a) &&
            a.side === side &&
            a.character_id === characterId
          ),
      );
      const next: BattleTurnAction[] = [
        ...filtered,
        {
          action: "attach",
          side,
          character_id: characterId,
          character_name: characterName,
          host_unit_id: hostUnitId,
          host_unit_name: hostUnitName,
        } satisfies AttachAction,
      ];
      updateTurnById(prepareTurn.id, { actions: next });
    },
    [prepareTurn, updateTurnById],
  );

  const handleDetachCharacter = useCallback(
    (side: Side, characterId: string) => {
      if (!prepareTurn) return;
      const filtered = (prepareTurn.actions ?? []).filter(
        (a) =>
          !(
            isAttachAction(a) &&
            a.side === side &&
            a.character_id === characterId
          ),
      );
      updateTurnById(prepareTurn.id, { actions: filtered });
    },
    [prepareTurn, updateTurnById],
  );

  // ---- 파생 데이터 ----
  const sideARoster = useMemo(
    () => makeSideRoster("A", report?.army_lists[0], parsedA),
    [report, parsedA],
  );
  const sideBRoster = useMemo(
    () => makeSideRoster("B", report?.army_lists[1], parsedB),
    [report, parsedB],
  );

  const attachments: AttachmentMap = useMemo(
    () => (prepareTurn ? readAttachments(prepareTurn.actions ?? []) : emptyAttachments()),
    [prepareTurn],
  );

  /** 칩 표시용: character_id → host_name */
  const charactersAttachedBySide = useMemo(() => {
    const result: Record<Side, Map<string, string>> = { A: new Map(), B: new Map() };
    (["A", "B"] as const).forEach((side) => {
      attachments[side].forEach((action, charId) => {
        result[side].set(charId, action.host_unit_name);
      });
    });
    return result;
  }, [attachments]);

  /** 칩 표시용: host_id → [{id, name}] */
  const hostHasCharactersBySide = useMemo(() => {
    const reversed = reverseAttachments(attachments);
    const result: Record<Side, Map<string, Array<{ id: string; name: string }>>> = {
      A: new Map(),
      B: new Map(),
    };
    (["A", "B"] as const).forEach((side) => {
      reversed[side].forEach((actions, hostId) => {
        result[side].set(
          hostId,
          actions.map((a) => ({ id: a.character_id, name: a.character_name })),
        );
      });
    });
    return result;
  }, [attachments]);

  /** 토큰 표시용: host_id → [character_name, ...] (간결한 string 배열) */
  const attachedNamesByHost = useMemo(() => {
    const result: Record<Side, Map<string, string[]>> = { A: new Map(), B: new Map() };
    (["A", "B"] as const).forEach((side) => {
      hostHasCharactersBySide[side].forEach((arr, hostId) => {
        result[side].set(hostId, arr.map((c) => c.name));
      });
    });
    return result;
  }, [hostHasCharactersBySide]);

  /**
   * 누적 토큰 상태 + 파괴 표시 집합.
   * 현재 턴 안에서는 (활성플레이어 순서, 페이즈 순서) 기준으로
   * 현재 시점보다 "미래"인 액션은 적용하지 않음 → 페이즈를 되돌리면
   * 그때까지의 상태로 복원됨.
   *
   * - token 액션: pos/zone 갱신
   * - move 계열 (with to): pos 갱신
   * - destroyed:
   *   - "현재 턴 + 현재 페이즈 + 현재 활성 플레이어가 한 일" → X자 표시 (토큰 유지)
   *   - 그 외 과거 → 토큰 제거 (그냥 사라짐)
   * - recall: 즉시 제거
   * - 합류 중인 캐릭터 토큰은 마지막에 필터 제외
   */
  const tokenState = useMemo<{
    tokens: TokenAction[];
    destroyedSet: Set<string>;
  }>(() => {
    if (!currentTurn) return { tokens: [], destroyedSet: new Set() };
    const tokenMap = new Map<string, TokenAction>();
    const destroyedSet = new Set<string>();
    const isPrepareTurn = currentTurn.phase === "prepare";

    // 시간 순서 점수 = playerOrder * 100 + phaseOrder
    const playerOrder = (p: Side | undefined): number => {
      if (!p) return 0;
      return p === firstPlayer ? 0 : 1;
    };
    const currentRank = isPrepareTurn
      ? Number.POSITIVE_INFINITY
      : playerOrder(activePlayer) * 100 + PHASE_ORDER.indexOf(currentPhase);

    for (const turn of sortedTurns) {
      const isCurrentTurn = turn.id === currentTurn.id;
      for (const action of turn.actions ?? []) {
        // 현재 턴 안: 미래 액션은 건너뛰기
        if (isCurrentTurn && !isPrepareTurn) {
          const ax = action as { actor_player?: Side; phase?: ActionPhase };
          if (ax.actor_player && ax.phase) {
            const actionRank =
              playerOrder(ax.actor_player) * 100 + PHASE_ORDER.indexOf(ax.phase);
            if (actionRank > currentRank) continue;
          }
        }

        if (isTokenAction(action)) {
          const key = `${action.side}:${action.unit_id}`;
          tokenMap.set(key, action);
          destroyedSet.delete(key);
        } else if (action.action && isMoveKind(action.action)) {
          const a = action as {
            side?: Side;
            unit_id?: string;
            to?: { x: number; y: number };
          };
          if (a.side && a.unit_id && a.to) {
            const key = `${a.side}:${a.unit_id}`;
            const existing = tokenMap.get(key);
            if (existing) tokenMap.set(key, { ...existing, pos: a.to });
          }
        } else if (action.action === "destroyed") {
          const a = action as {
            side?: Side;
            unit_id?: string;
            phase?: ActionPhase;
            actor_player?: Side;
          };
          if (!a.side || !a.unit_id) continue;
          const key = `${a.side}:${a.unit_id}`;
          const keepWithX =
            !isPrepareTurn &&
            isCurrentTurn &&
            a.phase === currentPhase &&
            a.actor_player === activePlayer;
          if (keepWithX) {
            destroyedSet.add(key);
          } else {
            tokenMap.delete(key);
            destroyedSet.delete(key);
          }
        } else if (action.action === "recall") {
          const a = action as { side?: Side; unit_id?: string };
          if (a.side && a.unit_id) {
            const key = `${a.side}:${a.unit_id}`;
            tokenMap.delete(key);
            destroyedSet.delete(key);
          }
        }
      }
      if (isCurrentTurn) break;
    }

    const tokens = Array.from(tokenMap.values()).filter(
      (t) => !attachments[t.side].has(t.unit_id),
    );
    return { tokens, destroyedSet };
  }, [
    sortedTurns,
    currentTurn,
    currentPhase,
    activePlayer,
    firstPlayer,
    attachments,
  ]);

  const currentTokens = tokenState.tokens;
  const destroyedThisPhase = tokenState.destroyedSet;

  /** scout_move 완료된 unit_id 집합 (side별, P턴에서 드래그 잠금에 사용) */
  const scoutMovedIds = useMemo(() => {
    const result: Record<Side, Set<string>> = { A: new Set(), B: new Set() };
    for (const turn of sortedTurns) {
      for (const action of turn.actions ?? []) {
        if (action.action === "scout_move") {
          const a = action as { side?: Side; unit_id?: string };
          if (a.side && a.unit_id) {
            result[a.side].add(a.unit_id);
          }
        }
      }
    }
    return result;
  }, [sortedTurns]);

  /**
   * 현재 턴 + 현재 페이즈 + 현재 활성 플레이어의 화살표 (전부 표시).
   * - move 계열(scout_move, move, advance_move, fallback, charge) → 파란 화살표
   * - shooting/fight → 빨간 화살표 (from=시전자, to=대상)
   * - P턴: phase/actor 필터 없음
   * - turn ≥ 1: currentPhase + actor_player === activePlayer 일치해야 함
   */
  const currentTurnMoveArcs = useMemo(() => {
    if (!currentTurn) return [];
    const isPrepare = currentTurn.phase === "prepare";
    const arcs: Array<{
      from: { x: number; y: number };
      to: { x: number; y: number };
      unit_name?: string;
      kind: "move" | "attack";
    }> = [];
    for (const a of currentTurn.actions ?? []) {
      const x = a as {
        action?: string;
        side?: Side;
        unit_id?: string;
        unit_name?: string;
        phase?: ActionPhase;
        actor_player?: Side;
        from?: { x: number; y: number };
        to?: { x: number; y: number };
      };
      if (!x.action || !x.from || !x.to) continue;
      const move = isMoveKind(x.action);
      const attack = x.action === "shooting" || x.action === "fight";
      if (!move && !attack) continue;
      if (!isPrepare) {
        if (x.phase !== currentPhase) continue;
        if (x.actor_player !== activePlayer) continue;
      }
      arcs.push({
        from: x.from,
        to: x.to,
        unit_name: x.unit_name,
        kind: move ? "move" : "attack",
      });
    }
    return arcs;
  }, [currentTurn, currentPhase, activePlayer]);

  const placedIds = useMemo(() => {
    const result = { A: new Set<string>(), B: new Set<string>() };
    for (const t of currentTokens) result[t.side].add(t.unit_id);
    return result;
  }, [currentTokens]);

  const turnStatusLabel = useMemo(() => {
    if (!currentTurn) return "";
    if (currentTurn.phase === "prepare") return "준비 단계 · 양측 배치";
    return `턴 ${currentTurn.turn_number}`;
  }, [currentTurn]);

  if (loading || !report) {
    return <div className="flex min-h-screen items-center justify-center">로딩 중...</div>;
  }
  if (!currentTurn) {
    return <div className="flex min-h-screen items-center justify-center">턴 데이터를 불러오는 중...</div>;
  }

  // 합류 설정은 P턴에서만 가능 (다른 턴에선 변경 불가, 상태만 표시)
  const attachEnabled = currentTurn.phase === "prepare";
  const onAttachA = attachEnabled
    ? (characterId: string, characterName: string, hostUnitId: string, hostUnitName: string) =>
        handleAttachCharacter("A", characterId, characterName, hostUnitId, hostUnitName)
    : undefined;
  const onAttachB = attachEnabled
    ? (characterId: string, characterName: string, hostUnitId: string, hostUnitName: string) =>
        handleAttachCharacter("B", characterId, characterName, hostUnitId, hostUnitName)
    : undefined;
  const onDetachA = attachEnabled
    ? (characterId: string) => handleDetachCharacter("A", characterId)
    : undefined;
  const onDetachB = attachEnabled
    ? (characterId: string) => handleDetachCharacter("B", characterId)
    : undefined;

  const showFloatingArrows = currentTurn.phase === "turn" && hasRoundSetup;

  return (
    <>
      {showFloatingArrows && (
        <>
          <button
            type="button"
            onClick={handlePrevPhase}
            style={{ left: "max(0.5rem, calc(50% - 740px))" }}
            className="fixed top-1/2 z-20 flex h-16 w-16 -translate-y-1/2 items-center justify-center rounded-lg border-2 bg-card text-3xl font-bold text-muted-foreground shadow-lg transition hover:bg-accent hover:text-foreground"
            title="이전 페이즈"
            aria-label="이전 페이즈"
          >
            ←
          </button>
          <button
            type="button"
            onClick={handleNextPhase}
            style={{ right: "max(0.5rem, calc(50% - 740px))" }}
            className="fixed top-1/2 z-20 flex h-16 w-16 -translate-y-1/2 items-center justify-center rounded-lg border-2 bg-card text-3xl font-bold text-muted-foreground shadow-lg transition hover:bg-accent hover:text-foreground"
            title="다음 페이즈"
            aria-label="다음 페이즈"
          >
            →
          </button>
        </>
      )}
      <div className="mx-auto flex min-h-screen max-w-[1320px] flex-col gap-3 p-5">
      {/* 상단 도구 모음 */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push(`/reports/${id}`)}>
          ← 상세 보기
        </Button>
        <h1 className="text-lg font-semibold">{report.title}</h1>
        <Button variant="outline" onClick={() => router.push(`/reports/${id}/edit`)}>
          설정 수정
        </Button>
      </div>

      <VSBanner sideA={sideARoster} sideB={sideBRoster} />

      <div className="flex flex-1 gap-3.5 min-h-0">
        <RosterColumn
          roster={sideARoster}
          turns={sortedTurns}
          placedUnitIds={placedIds.A}
          charactersAttached={charactersAttachedBySide.A}
          hostHasCharacters={hostHasCharactersBySide.A}
          onAttachCharacter={onAttachA}
          onDetachCharacter={onDetachA}
          onDeleteEvent={handleDeleteEvent}
          phase={currentTurn.phase}
          scoutMovedIds={scoutMovedIds.A}
          currentTurnId={currentTurn.id}
          currentActionPhase={currentTurn.phase === "turn" ? currentPhase : undefined}
        />

        <div className="flex flex-1 flex-col gap-2 min-w-0">
          <TurnRibbon
            turns={sortedTurns}
            activeIndex={activeIndex}
            onSelect={setActiveIndex}
            onAddTurn={handleAddTurn}
            statusLabel={turnStatusLabel}
          />

          {currentTurn.phase === "prepare" && (
            <div className="rounded border border-dashed border-amber-400/60 bg-amber-50/40 px-3 py-2 text-xs text-amber-900">
              P턴: <strong>캐릭터 칩(★)을 비캐릭터 유닛 칩 위로 드래그</strong>하면 합류됩니다. 합류된 칩의 × 버튼으로 이탈.
            </div>
          )}

          {currentTurn.phase === "turn" && hasRoundSetup && (
            <PhaseControls
              firstPlayer={firstPlayer}
              onChangeFirstPlayer={handleSetFirstPlayer}
              activePlayer={activePlayer}
              onChangeActivePlayer={handleSwitchActivePlayer}
              currentPhase={currentPhase}
              onChangePhase={handleChangePhase}
            />
          )}

          {currentTurn.phase === "turn" && !hasRoundSetup ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="flex flex-col items-center gap-5 rounded-lg border-2 bg-card p-10 shadow-md">
                <div className="text-xs font-mono text-muted-foreground">
                  턴 {currentTurn.turn_number} 시작
                </div>
                <div className="text-lg font-semibold">선후턴을 선택하세요</div>
                <div className="flex gap-3">
                  <Button
                    size="lg"
                    onClick={() => handleSetFirstPlayer("A")}
                    variant="outline"
                  >
                    A 먼저
                  </Button>
                  <Button
                    size="lg"
                    onClick={() => handleSetFirstPlayer("B")}
                    variant="outline"
                  >
                    B 먼저
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <>

          <BattleMap
            tokens={currentTokens}
            onPlaceUnit={handlePlaceUnit}
            onRemoveUnit={handleRemoveUnit}
            onTokenAction={handleTokenAction}
            onAdjustLastTo={handleAdjustLastTo}
            deployLabel={report.metadata.deploy ?? undefined}
            terrainLabel={report.metadata.terrain ?? undefined}
            terrainImageUrl={getTerrainImage(report.metadata.terrain)}
            deployImageUrl={getDeployImage(report.metadata.deploy)}
            attachedNamesByHost={attachedNamesByHost}
            phase={currentTurn.phase}
            moveArcs={currentTurnMoveArcs}
            scoutMovedIds={scoutMovedIds}
            activePlayer={activePlayer}
            currentPhase={currentPhase}
            destroyedThisPhase={destroyedThisPhase}
          />

          <ScoreBar a={0} b={0} />
            </>
          )}
        </div>

        <RosterColumn
          roster={sideBRoster}
          turns={sortedTurns}
          placedUnitIds={placedIds.B}
          charactersAttached={charactersAttachedBySide.B}
          hostHasCharacters={hostHasCharactersBySide.B}
          onAttachCharacter={onAttachB}
          onDetachCharacter={onDetachB}
          onDeleteEvent={handleDeleteEvent}
          phase={currentTurn.phase}
          scoutMovedIds={scoutMovedIds.B}
          currentTurnId={currentTurn.id}
          currentActionPhase={currentTurn.phase === "turn" ? currentPhase : undefined}
        />
      </div>

      <NarrativeEditor
        turnLabel={currentTurn.phase === "prepare" ? "준비" : `턴 ${currentTurn.turn_number}`}
        value={currentTurn.report_text ?? ""}
        onSave={handleNarrativeSave}
      />
      </div>
    </>
  );
}

function sortTurns(turns: BattleTurn[]): BattleTurn[] {
  return [...turns].sort((a, b) => {
    if (a.phase !== b.phase) return a.phase === "prepare" ? -1 : 1;
    return a.turn_number - b.turn_number;
  });
}
