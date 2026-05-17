# ReportBattle

미니어처 게임(Warhammer 40K 우선)의 배틀리포트를 작성·기록·공유하는 웹 서비스.
LLM 기반 자동 리포트 생성을 핵심으로 하며, 추후 타 미니어처 게임으로 확장 예정.

---

## 주요 기능

### 현재 구현됨

- **인증** — Google OAuth (Supabase Auth)
- **프로필** — 닉네임 / bio / LLM Provider·Model·API Key (AES-256 암호화)
- **배틀리포트 설정** — 미션팩 / 배치구역 / 지형 / 양측 아미리스트
- **로스터 파싱** — Warhammer 40,000 공식 앱 "Share as Text" 포맷 파서
  (팩션, 디태치먼트, 게임 사이즈, 유닛 목록, 캐릭터 카테고리 자동 감지)
- **듀얼 로스터 배틀맵 (`/reports/[id]/write`)**
  - VS Banner + 좌/우 진영 컬럼 + 중앙 SVG 맵 + 내러티브 푸터
  - 리저브 상/하단 + 맵 가운데 + 토큰 제거 영역
  - 캐릭터 합류 (P턴 드래그앤드롭) + 동명 유닛 자동 인덱싱(#1/#2)
  - 누적 토큰 상태 + 페이즈 시간 순서 기반 복원
- **턴 시스템 (Turn ≥ 1)**
  - 선후턴(1st/2nd) 선택 + 활성 플레이어 메모리
  - 페이즈: **커맨드 / 무브 / 슈팅 / 차지 / 파이트**
  - 페이즈별 액션 메뉴 + 공통 액션(스트라타젬, 처치, 점령, 사건 메모, 회수)
  - 사격/파이트: 대상 토큰 클릭 + 파괴 confirm → destroyed 자동 처리
  - 차지: 대상 클릭 → 자동 이동 + 위치 미세 조정 모드
  - 이동 화살표 시각화 (move=파랑, attack=빨강)
  - 파괴된 토큰 X자 표시 (해당 페이즈까지 유지)
  - 페이지 좌우 floating 화살표로 페이즈 ↔ 플레이어 ↔ 턴 자동 진행
- **턴 로그** — actor_player 기준 자동 분류, 현재 턴/페이즈/활성 플레이어 필터, 개별 삭제

### 개발 예정

- LLM 자동 리포트 생성 (LiteLLM 스트리밍)
- 맵 이미지 업로드 (Supabase Storage)
- 공개 리포트 목록 / 팩션별 필터 / 통계
- Discord OAuth, BattleScribe 등 추가 로스터 포맷
- 타 미니어처 게임 (Age of Sigmar, Horus Heresy 등)

---

## 기술 스택

| 영역 | 기술 |
|---|---|
| Frontend | Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui |
| Backend | FastAPI (Python) + Pydantic |
| DB / Auth / Storage | Supabase (PostgreSQL) |
| LLM 통합 | LiteLLM (OpenAI / Anthropic / Google / Ollama) |
| 배포 | Vercel (Frontend) + Railway (Backend) |

자세한 선택 이유는 [docs/tech-stack.md](docs/tech-stack.md) 참고.

---

## 프로젝트 구조

```
ReportBattle/
├── frontend/                       # Next.js 15
│   ├── app/
│   │   ├── login/                  # 로그인
│   │   ├── profile/                # 프로필 설정
│   │   └── reports/
│   │       ├── new/                # 리포트 설정 (제목/미션/아미)
│   │       ├── [id]/               # 상세 조회
│   │       ├── [id]/edit/          # 설정 수정
│   │       └── [id]/write/         # ✦ 듀얼 로스터 배틀맵
│   ├── components/
│   │   ├── reports/                # 폼 컴포넌트
│   │   └── reports/write/          # 배틀맵 컴포넌트 (10+)
│   └── lib/                        # API 클라이언트, 타입, 설정
│
├── backend/
│   └── app/
│       ├── api/v1/routers/         # health / auth / users / reports / roster
│       ├── core/                   # config, supabase, auth(JWT), encryption
│       ├── schemas/                # Pydantic 모델
│       └── services/               # 비즈니스 로직 (battle_report, roster_parser)
│
├── supabase/
│   └── migrations/                 # 001 users / 002 reports / 003 turns / 004 army_lists / 005 phase
│
├── docs/                           # 기획 문서
│   ├── tech-stack.md
│   ├── features.md
│   └── todo.md
│
├── design_handoff_battle_report/   # 디자인 핸드오프 (와이어프레임)
└── docker-compose.yml
```

---

## 개발 환경 셋업

### 사전 요구사항

- Node.js 20+, npm
- Python 3.12+, [uv](https://github.com/astral-sh/uv)
- Supabase 프로젝트 (URL, anon key, service key)

### 1. 저장소 클론

```bash
git clone https://github.com/taiskae169/ReportBattle.git
cd ReportBattle
```

### 2. Supabase 마이그레이션 적용

Supabase Dashboard → SQL Editor에서 `supabase/migrations/` 안의 SQL을 **순서대로** 실행:

```
001_users.sql
002_battle_reports.sql
003_battle_turns.sql
004_army_lists.sql
005_battle_turns_phase.sql
```

### 3. Backend (FastAPI)

```bash
cd backend
uv sync                              # 의존성 설치
cp .env.example .env                 # 환경 변수 (있다면)
# .env에 SUPABASE_URL, SUPABASE_KEY, SUPABASE_JWT_SECRET, ENCRYPTION_KEY 설정
./run.sh                             # macOS/Linux
# 또는 run.bat (Windows)
```

기본 포트: `http://localhost:8000`
OpenAPI 문서: `http://localhost:8000/docs`

### 4. Frontend (Next.js)

```bash
cd frontend
npm install
# .env.local에 NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_API_URL 설정
npm run dev
```

기본 포트: `http://localhost:3000`

---

## 데이터 모델 개요

### 핵심 테이블

| 테이블 | 역할 |
|---|---|
| `users` | auth.users 확장 (닉네임, bio, LLM 설정 암호화 저장) |
| `battle_reports` | 리포트 메타 (제목, 결과, metadata JSONB로 미션/배치/지형 통합) |
| `battle_turns` | 턴 데이터 (`phase: prepare\|turn`, `turn_number`, `actions JSONB`) |
| `army_lists` | 리포트당 N개 (player_name, raw_text, total_points) |

### actions JSONB 구조

`battle_turns.actions`는 그 턴에서 일어난 모든 일을 시간 순서로 기록한 flat 배열:

```jsonc
[
  // 배치 (P턴)
  {"action": "token", "side": "A", "unit_id": "Intercessor Squad#0", "unit_name": "Intercessor Squad", "pos": {"x": 0.3, "y": 0.7}, "zone": "map"},
  // 캐릭터 합류 (P턴, prepare 턴에만 저장)
  {"action": "attach", "side": "A", "character_id": "Captain#0", "character_name": "Captain", "host_unit_id": "Intercessor Squad#0", "host_unit_name": "Intercessor Squad"},
  // 선후턴 설정 (turn ≥ 1)
  {"action": "round_setup", "first_player": "A"},
  // 이동 (turn ≥ 1)
  {"action": "move", "side": "A", "unit_id": "Intercessor Squad#0", "unit_name": "Intercessor Squad", "from": {...}, "to": {...}, "actor_player": "A", "phase": "move", "description": "🚶 무브"},
  // 사격 (대상 + 파괴)
  {"action": "shooting", "side": "A", "unit_id": "...", "unit_name": "...", "from": {...}, "to": {...}, "target_unit_id": "Chaos Marines#0", "target_unit_name": "Chaos Marines", "target_side": "B", "actor_player": "A", "phase": "shooting", "description": "🔫 사격 → 파괴"},
  {"action": "destroyed", "side": "B", "unit_id": "Chaos Marines#0", "unit_name": "Chaos Marines", "actor_player": "A", "phase": "shooting", "description": "Intercessor Squad의 사격으로 파괴"}
]
```

화면 렌더링 시 모든 턴의 actions를 **시간 순서대로 재생**해서 현재 토큰 위치 / 사건 로그 / 화살표를 계산. (페이즈 시점 기반 cumulative)

---

## 기여 / 개발 컨텍스트

- 우선 게임: **Warhammer 40,000 10판**
- 디자인 레퍼런스: [design_handoff_battle_report/dual_roster.html](design_handoff_battle_report/dual_roster.html)
- 작업 현황: [docs/todo.md](docs/todo.md)
- 기능 명세: [docs/features.md](docs/features.md)

---

## License

(미정)
