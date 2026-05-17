from pydantic import BaseModel, Field
from datetime import datetime
from typing import Literal, Any

TurnPhase = Literal["prepare", "turn"]


# =============================================
# Army List
# =============================================

class ArmyListBase(BaseModel):
    player_name: str
    raw_text: str | None = None
    total_points: int | None = None


class ArmyListCreate(ArmyListBase):
    pass


class ArmyList(ArmyListBase):
    id: str
    report_id: str
    created_at: datetime


# =============================================
# Battle Turn
# =============================================

class BattleTurnBase(BaseModel):
    phase: TurnPhase = "turn"
    turn_number: int  # prepare 단계는 0, 일반 턴은 1부터
    memo: str | None = None
    actions: list[dict[str, Any]] = Field(default_factory=list)
    report_text: str | None = None


class BattleTurnCreate(BattleTurnBase):
    pass


class BattleTurn(BattleTurnBase):
    id: str
    report_id: str
    created_at: datetime


# =============================================
# Battle Report Metadata (JSONB)
# =============================================

class ReportMetadata(BaseModel):
    mission_pack: str | None = None
    mission: str | None = None
    my_score: int | None = None
    opponent_score: int | None = None
    terrain: str | None = None   # 임시 식별자 (지형1~9), 추후 이미지 매핑
    deploy: str | None = None    # 임시 식별자 (배치구역_1,2), 추후 이미지 매핑


# =============================================
# Battle Report
# =============================================

ResultType = Literal["win", "lose", "draw"]
StatusType = Literal["draft", "published"]


class BattleReportBase(BaseModel):
    title: str
    status: StatusType = "draft"
    is_public: bool = False
    result: ResultType | None = None
    metadata: ReportMetadata = Field(default_factory=ReportMetadata)
    report_text: str | None = None


class BattleReportCreate(BattleReportBase):
    army_lists: list[ArmyListCreate] = Field(default_factory=list)
    turns: list[BattleTurnCreate] = Field(default_factory=list)


class BattleReportUpdate(BaseModel):
    title: str | None = None
    status: StatusType | None = None
    is_public: bool | None = None
    result: ResultType | None = None
    metadata: ReportMetadata | None = None
    report_text: str | None = None


class BattleReportSummary(BaseModel):
    """리포트 목록용 요약본"""
    id: str
    user_id: str
    title: str
    status: StatusType
    is_public: bool
    result: ResultType | None
    metadata: ReportMetadata
    created_at: datetime
    updated_at: datetime


class BattleReport(BattleReportSummary):
    """리포트 상세 - 자식 리소스 포함"""
    report_text: str | None = None
    army_lists: list[ArmyList] = Field(default_factory=list)
    turns: list[BattleTurn] = Field(default_factory=list)
