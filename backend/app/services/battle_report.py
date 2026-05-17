from fastapi import HTTPException, status
from app.core.supabase import supabase
from app.schemas.battle_report import (
    BattleReport,
    BattleReportCreate,
    BattleReportSummary,
    BattleReportUpdate,
    BattleTurn,
    BattleTurnCreate,
    ArmyList,
    ArmyListCreate,
    ReportMetadata,
)


# =============================================
# Helpers
# =============================================

def _row_to_summary(row: dict) -> BattleReportSummary:
    return BattleReportSummary(
        id=row["id"],
        user_id=row["user_id"],
        title=row["title"],
        status=row["status"],
        is_public=row["is_public"],
        result=row.get("result"),
        metadata=ReportMetadata(**(row.get("metadata") or {})),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def _row_to_turn(row: dict) -> BattleTurn:
    return BattleTurn(
        id=row["id"],
        report_id=row["report_id"],
        phase=row.get("phase", "turn"),
        turn_number=row["turn_number"],
        memo=row.get("memo"),
        actions=row.get("actions") or [],
        report_text=row.get("report_text"),
        created_at=row["created_at"],
    )


def _row_to_army(row: dict) -> ArmyList:
    return ArmyList(
        id=row["id"],
        report_id=row["report_id"],
        player_name=row["player_name"],
        raw_text=row.get("raw_text"),
        total_points=row.get("total_points"),
        created_at=row["created_at"],
    )


def _fetch_report_row(report_id: str) -> dict:
    result = supabase.table("battle_reports").select("*").eq("id", report_id).maybe_single().execute()
    if result is None or not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    return result.data


def _ensure_owner(report_row: dict, user_id: str) -> None:
    if report_row["user_id"] != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")


def _ensure_viewable(report_row: dict, user_id: str | None) -> None:
    """공개거나 본인이면 OK"""
    if report_row.get("is_public"):
        return
    if user_id and report_row["user_id"] == user_id:
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")


# =============================================
# Create
# =============================================

def create_report(user_id: str, payload: BattleReportCreate) -> BattleReport:
    insert_data = {
        "user_id": user_id,
        "title": payload.title,
        "status": payload.status,
        "is_public": payload.is_public,
        "result": payload.result,
        "metadata": payload.metadata.model_dump(exclude_none=True),
        "report_text": payload.report_text,
    }
    result = supabase.table("battle_reports").insert(insert_data).execute()
    report_row = result.data[0]
    report_id = report_row["id"]

    if payload.army_lists:
        army_rows = [
            {
                "report_id": report_id,
                "player_name": a.player_name,
                "raw_text": a.raw_text,
                "total_points": a.total_points,
            }
            for a in payload.army_lists
        ]
        supabase.table("army_lists").insert(army_rows).execute()

    if payload.turns:
        turn_rows = [
            {
                "report_id": report_id,
                "phase": t.phase,
                "turn_number": t.turn_number,
                "memo": t.memo,
                "actions": t.actions,
                "report_text": t.report_text,
            }
            for t in payload.turns
        ]
        supabase.table("battle_turns").insert(turn_rows).execute()

    return get_report(report_id, user_id)


# =============================================
# Read
# =============================================

def list_my_reports(user_id: str) -> list[BattleReportSummary]:
    result = (
        supabase.table("battle_reports")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return [_row_to_summary(r) for r in (result.data or [])]


def list_public_reports(limit: int = 20, offset: int = 0) -> list[BattleReportSummary]:
    result = (
        supabase.table("battle_reports")
        .select("*")
        .eq("is_public", True)
        .eq("status", "published")
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    return [_row_to_summary(r) for r in (result.data or [])]


def get_report(report_id: str, user_id: str | None) -> BattleReport:
    report_row = _fetch_report_row(report_id)
    _ensure_viewable(report_row, user_id)

    army_result = (
        supabase.table("army_lists")
        .select("*")
        .eq("report_id", report_id)
        .order("created_at")
        .execute()
    )
    # prepare(phase='prepare', turn_number=0)가 자연스럽게 맨 앞으로 오도록
    # phase 우선, 그 다음 turn_number 순서로 정렬
    # ('prepare' < 'turn' 알파벳 순)
    turn_result = (
        supabase.table("battle_turns")
        .select("*")
        .eq("report_id", report_id)
        .order("phase")
        .order("turn_number")
        .execute()
    )

    summary = _row_to_summary(report_row)
    return BattleReport(
        **summary.model_dump(),
        report_text=report_row.get("report_text"),
        army_lists=[_row_to_army(a) for a in (army_result.data or [])],
        turns=[_row_to_turn(t) for t in (turn_result.data or [])],
    )


# =============================================
# Update
# =============================================

def update_report(report_id: str, user_id: str, payload: BattleReportUpdate) -> BattleReport:
    report_row = _fetch_report_row(report_id)
    _ensure_owner(report_row, user_id)

    update_data: dict = {}
    for field in ("title", "status", "is_public", "result", "report_text"):
        value = getattr(payload, field)
        if value is not None:
            update_data[field] = value

    if payload.metadata is not None:
        update_data["metadata"] = payload.metadata.model_dump(exclude_none=True)

    if update_data:
        supabase.table("battle_reports").update(update_data).eq("id", report_id).execute()

    return get_report(report_id, user_id)


# =============================================
# Delete
# =============================================

def delete_report(report_id: str, user_id: str) -> None:
    report_row = _fetch_report_row(report_id)
    _ensure_owner(report_row, user_id)
    supabase.table("battle_reports").delete().eq("id", report_id).execute()


# =============================================
# Nested: army_lists
# =============================================

def add_army_list(report_id: str, user_id: str, payload: ArmyListCreate) -> ArmyList:
    report_row = _fetch_report_row(report_id)
    _ensure_owner(report_row, user_id)

    result = supabase.table("army_lists").insert({
        "report_id": report_id,
        "player_name": payload.player_name,
        "raw_text": payload.raw_text,
        "total_points": payload.total_points,
    }).execute()
    return _row_to_army(result.data[0])


def delete_army_list(report_id: str, army_id: str, user_id: str) -> None:
    report_row = _fetch_report_row(report_id)
    _ensure_owner(report_row, user_id)
    supabase.table("army_lists").delete().eq("id", army_id).eq("report_id", report_id).execute()


# =============================================
# Nested: battle_turns
# =============================================

def add_turn(report_id: str, user_id: str, payload: BattleTurnCreate) -> BattleTurn:
    report_row = _fetch_report_row(report_id)
    _ensure_owner(report_row, user_id)

    result = supabase.table("battle_turns").insert({
        "report_id": report_id,
        "phase": payload.phase,
        "turn_number": payload.turn_number,
        "memo": payload.memo,
        "actions": payload.actions,
        "report_text": payload.report_text,
    }).execute()
    return _row_to_turn(result.data[0])


def update_turn(report_id: str, turn_id: str, user_id: str, payload: BattleTurnCreate) -> BattleTurn:
    report_row = _fetch_report_row(report_id)
    _ensure_owner(report_row, user_id)

    update_data = {
        "phase": payload.phase,
        "turn_number": payload.turn_number,
        "memo": payload.memo,
        "actions": payload.actions,
        "report_text": payload.report_text,
    }
    result = (
        supabase.table("battle_turns")
        .update(update_data)
        .eq("id", turn_id)
        .eq("report_id", report_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Turn not found")
    return _row_to_turn(result.data[0])


def delete_turn(report_id: str, turn_id: str, user_id: str) -> None:
    report_row = _fetch_report_row(report_id)
    _ensure_owner(report_row, user_id)
    supabase.table("battle_turns").delete().eq("id", turn_id).eq("report_id", report_id).execute()
