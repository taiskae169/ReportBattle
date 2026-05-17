from fastapi import APIRouter, Depends, Query, status
from app.core.auth import get_current_user, get_current_user_optional
from app.schemas.battle_report import (
    ArmyList,
    ArmyListCreate,
    BattleReport,
    BattleReportCreate,
    BattleReportSummary,
    BattleReportUpdate,
    BattleTurn,
    BattleTurnCreate,
)
from app.services import battle_report as report_service

router = APIRouter()


# =============================================
# Reports
# =============================================

@router.get("", response_model=list[BattleReportSummary])
async def list_my_reports(current_user: dict = Depends(get_current_user)):
    """내 리포트 목록"""
    return report_service.list_my_reports(current_user["sub"])


@router.get("/public", response_model=list[BattleReportSummary])
async def list_public_reports(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """공개된 리포트 목록 (비로그인 가능)"""
    return report_service.list_public_reports(limit=limit, offset=offset)


@router.post("", response_model=BattleReport, status_code=status.HTTP_201_CREATED)
async def create_report(
    payload: BattleReportCreate,
    current_user: dict = Depends(get_current_user),
):
    return report_service.create_report(current_user["sub"], payload)


@router.get("/{report_id}", response_model=BattleReport)
async def get_report(
    report_id: str,
    current_user: dict | None = Depends(get_current_user_optional),
):
    user_id = current_user["sub"] if current_user else None
    return report_service.get_report(report_id, user_id)


@router.patch("/{report_id}", response_model=BattleReport)
async def update_report(
    report_id: str,
    payload: BattleReportUpdate,
    current_user: dict = Depends(get_current_user),
):
    return report_service.update_report(report_id, current_user["sub"], payload)


@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_report(
    report_id: str,
    current_user: dict = Depends(get_current_user),
):
    report_service.delete_report(report_id, current_user["sub"])


# =============================================
# Army Lists (nested)
# =============================================

@router.post(
    "/{report_id}/army-lists",
    response_model=ArmyList,
    status_code=status.HTTP_201_CREATED,
)
async def add_army_list(
    report_id: str,
    payload: ArmyListCreate,
    current_user: dict = Depends(get_current_user),
):
    return report_service.add_army_list(report_id, current_user["sub"], payload)


@router.delete(
    "/{report_id}/army-lists/{army_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_army_list(
    report_id: str,
    army_id: str,
    current_user: dict = Depends(get_current_user),
):
    report_service.delete_army_list(report_id, army_id, current_user["sub"])


# =============================================
# Turns (nested)
# =============================================

@router.post(
    "/{report_id}/turns",
    response_model=BattleTurn,
    status_code=status.HTTP_201_CREATED,
)
async def add_turn(
    report_id: str,
    payload: BattleTurnCreate,
    current_user: dict = Depends(get_current_user),
):
    return report_service.add_turn(report_id, current_user["sub"], payload)


@router.patch("/{report_id}/turns/{turn_id}", response_model=BattleTurn)
async def update_turn(
    report_id: str,
    turn_id: str,
    payload: BattleTurnCreate,
    current_user: dict = Depends(get_current_user),
):
    return report_service.update_turn(report_id, turn_id, current_user["sub"], payload)


@router.delete(
    "/{report_id}/turns/{turn_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_turn(
    report_id: str,
    turn_id: str,
    current_user: dict = Depends(get_current_user),
):
    report_service.delete_turn(report_id, turn_id, current_user["sub"])
