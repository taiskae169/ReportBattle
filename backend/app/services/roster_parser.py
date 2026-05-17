"""
로스터 입력 파서.

확장 방식: RosterParser를 상속받고 _PARSERS 리스트에 등록하면
parse_roster()가 can_parse()를 통해 자동 감지한다.
"""
from __future__ import annotations

import re
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import ClassVar


@dataclass
class ParsedModel:
    name: str
    count: int


@dataclass
class ParsedUnit:
    name: str
    points: int | None = None
    models: list[ParsedModel] = field(default_factory=list)
    category: str | None = None  # 'character' | 'unit' | None

    @property
    def total_models(self) -> int:
        return sum(m.count for m in self.models) or 1


@dataclass
class ParsedRoster:
    list_name: str | None = None
    faction: str | None = None              # "Space Marines / Space Wolves"
    game_size: str | None = None            # "Strike Force"
    game_size_points: int | None = None     # 2000
    detachment: str | None = None
    total_points: int | None = None         # 실제 합산 (예: 1990)
    units: list[ParsedUnit] = field(default_factory=list)
    format: str = "unknown"

    @property
    def unit_count(self) -> int:
        return len(self.units)


class RosterParser(ABC):
    """로스터 파서 인터페이스. 신규 포맷 추가 시 상속받아 구현."""

    name: ClassVar[str] = "base"

    @abstractmethod
    def can_parse(self, raw_text: str) -> bool:
        """이 텍스트를 처리할 수 있는지 자동 감지"""

    @abstractmethod
    def parse(self, raw_text: str) -> ParsedRoster:
        ...


class GWAppParser(RosterParser):
    """
    Warhammer 40,000 공식 앱 'Share as Text' 포맷.

    구조:
        리스트이름 (총 포인트)              <- 첫 블록
        (빈 줄)
        팩션
        서브팩션/챕터 (선택)
        Strike Force (게임사이즈 포인트)
        디태치먼트                          <- 메타 블록
        (빈 줄들)
        SECTION_HEADER                      <- 섹션 (대문자만)
        (빈 줄)
        유닛이름 (포인트)
          • Nx 모델 (다중모델인 경우)
            • Nx 장비
        (빈 줄)
        ...

    캐릭터/단일모델은 indent-2 bullet이 무기를 가리키므로,
    indent-4 bullet 존재 여부로 다중모델 분대 vs 캐릭터를 판별한다.
    """

    name: ClassVar[str] = "gw_app"

    _LINE_WITH_POINTS = re.compile(r"^(.+?)\s*\((\d+)\s*points?\)\s*$")
    _BULLET_LINE = re.compile(r"^(\s*)•\s*(\d+)x\s+(.+?)\s*$")

    # ---- public ----

    def can_parse(self, raw_text: str) -> bool:
        lines = raw_text.strip().splitlines()
        if not lines:
            return False
        first_match = self._LINE_WITH_POINTS.match(lines[0].strip())
        has_bullet = any(self._BULLET_LINE.match(line) for line in lines)
        return bool(first_match and has_bullet)

    def parse(self, raw_text: str) -> ParsedRoster:
        roster = ParsedRoster(format=self.name)
        blocks = self._split_blocks(raw_text)
        if not blocks:
            return roster

        # 1) 첫 블록: 리스트 이름 + total_points
        self._parse_header_block(blocks[0], roster)

        # 2) 두 번째 블록: 메타 (팩션 / 게임사이즈 / 디태치먼트)
        if len(blocks) > 1:
            self._parse_meta_block(blocks[1], roster)

        # 3) 나머지 블록들: 섹션 헤더 또는 유닛 블록
        # 직전에 본 섹션 헤더로 카테고리 부여
        current_section: str | None = None
        for block in blocks[2:]:
            if self._is_section_header_block(block):
                current_section = block[0].strip().upper()
                continue
            unit = self._parse_unit_block(block)
            if unit is not None:
                unit.category = self._categorize(current_section)
                roster.units.append(unit)

        return roster

    @staticmethod
    def _categorize(section: str | None) -> str | None:
        if section is None:
            return None
        if "CHARACTER" in section or "EPIC HERO" in section or "WARLORD" in section:
            return "character"
        return "unit"

    # ---- helpers ----

    @staticmethod
    def _split_blocks(raw_text: str) -> list[list[str]]:
        """빈 줄 기준으로 블록 분할"""
        blocks: list[list[str]] = []
        current: list[str] = []
        for line in raw_text.splitlines():
            if not line.strip():
                if current:
                    blocks.append(current)
                    current = []
            else:
                current.append(line)
        if current:
            blocks.append(current)
        return blocks

    def _parse_header_block(self, block: list[str], roster: ParsedRoster) -> None:
        if not block:
            return
        m = self._LINE_WITH_POINTS.match(block[0].strip())
        if m:
            roster.list_name = m.group(1).strip()
            roster.total_points = int(m.group(2))

    def _parse_meta_block(self, block: list[str], roster: ParsedRoster) -> None:
        """
        메타 줄들에서 game_size(포인트 있음), 나머지는 faction parts.
        마지막 faction part는 detachment로 간주.
        """
        faction_parts: list[str] = []
        for line in block:
            line = line.strip()
            if not line:
                continue
            size_match = self._LINE_WITH_POINTS.match(line)
            if size_match:
                roster.game_size = size_match.group(1).strip()
                roster.game_size_points = int(size_match.group(2))
            else:
                faction_parts.append(line)

        if not faction_parts:
            return
        if len(faction_parts) == 1:
            roster.faction = faction_parts[0]
        else:
            roster.detachment = faction_parts[-1]
            roster.faction = " / ".join(faction_parts[:-1])

    @staticmethod
    def _is_section_header_block(block: list[str]) -> bool:
        """단일 라인 + 전부 대문자(공백 허용)면 섹션 헤더 (CHARACTERS, BATTLELINE...)"""
        if len(block) != 1:
            return False
        text = block[0].strip()
        return bool(text) and bool(re.fullmatch(r"[A-Z][A-Z\s]+", text))

    def _parse_unit_block(self, block: list[str]) -> ParsedUnit | None:
        first = block[0]
        if first.startswith((" ", "\t")):
            return None  # 들여쓰기 있으면 유닛 헤더가 아님

        m = self._LINE_WITH_POINTS.match(first.strip())
        if not m:
            return None

        unit = ParsedUnit(name=m.group(1).strip(), points=int(m.group(2)))

        # indent-4 위치에 • 가 있으면 다중모델 분대
        has_nested_bullets = any(
            (len(line) - len(line.lstrip())) >= 4 and line.lstrip().startswith("•")
            for line in block[1:]
        )

        if has_nested_bullets:
            # indent 2~3의 • Nx → 모델
            for line in block[1:]:
                bullet_match = self._BULLET_LINE.match(line)
                if not bullet_match:
                    continue
                indent = len(bullet_match.group(1))
                if 1 <= indent <= 3:
                    unit.models.append(ParsedModel(
                        name=bullet_match.group(3).strip(),
                        count=int(bullet_match.group(2)),
                    ))
        else:
            # 캐릭터/단일모델 유닛: 모델 = 유닛 자신, 1마리
            unit.models.append(ParsedModel(name=unit.name, count=1))

        return unit


# 등록된 파서 목록 - 우선순위 순. 신규 포맷은 여기 추가하면 됨.
_PARSERS: list[RosterParser] = [
    GWAppParser(),
]


def parse_roster(raw_text: str) -> ParsedRoster:
    """
    적절한 파서를 자동 선택해서 파싱.
    매칭되는 파서 없으면 빈 ParsedRoster (format='unknown') 반환.
    """
    if not raw_text or not raw_text.strip():
        return ParsedRoster()

    for parser in _PARSERS:
        if parser.can_parse(raw_text):
            return parser.parse(raw_text)

    return ParsedRoster()
