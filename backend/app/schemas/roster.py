from pydantic import BaseModel


class RosterParseRequest(BaseModel):
    raw_text: str


class ParsedModelSchema(BaseModel):
    name: str
    count: int


class ParsedUnitSchema(BaseModel):
    name: str
    points: int | None = None
    models: list[ParsedModelSchema] = []
    total_models: int = 1
    category: str | None = None  # 'character' | 'unit' | None


class ParsedRosterSchema(BaseModel):
    list_name: str | None = None
    faction: str | None = None
    game_size: str | None = None
    game_size_points: int | None = None
    detachment: str | None = None
    total_points: int | None = None
    units: list[ParsedUnitSchema] = []
    format: str = "unknown"
    unit_count: int = 0
