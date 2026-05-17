from fastapi import APIRouter, Depends
from app.core.auth import get_current_user
from app.schemas.roster import (
    ParsedModelSchema,
    ParsedRosterSchema,
    ParsedUnitSchema,
    RosterParseRequest,
)
from app.services.roster_parser import parse_roster

router = APIRouter()


@router.post("/parse", response_model=ParsedRosterSchema)
async def parse_roster_text(
    payload: RosterParseRequest,
    _: dict = Depends(get_current_user),
):
    """
    아미 리스트 텍스트를 파싱해서 구조화된 정보 반환.
    현재 지원: GW 40K 공식 앱 'Share as Text' 포맷.
    """
    parsed = parse_roster(payload.raw_text)
    return ParsedRosterSchema(
        list_name=parsed.list_name,
        faction=parsed.faction,
        game_size=parsed.game_size,
        game_size_points=parsed.game_size_points,
        detachment=parsed.detachment,
        total_points=parsed.total_points,
        units=[
            ParsedUnitSchema(
                name=u.name,
                points=u.points,
                models=[ParsedModelSchema(name=m.name, count=m.count) for m in u.models],
                total_models=u.total_models,
                category=u.category,
            )
            for u in parsed.units
        ],
        format=parsed.format,
        unit_count=parsed.unit_count,
    )
