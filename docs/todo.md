# 프로젝트 TODO

> 최종 업데이트: 2026-05-17 (세션 4)

---

## Phase 1 - 환경 세팅

### 프로젝트 초기 세팅
- [x] 모노레포 구조 생성 (`frontend/`, `backend/`, `docs/`)
- [x] `.gitignore` 설정 (Next.js, Python, env 파일 등)
- [x] `docker-compose.yml` 로컬 개발 환경 구성

### Frontend (Next.js)
- [x] Next.js 16 프로젝트 생성 (`frontend/`)
- [x] TypeScript 설정
- [x] Tailwind CSS 설정
- [x] shadcn/ui 설치 및 기본 컴포넌트 세팅
- [x] ESLint 설정
- [x] 환경변수 설정 (`.env.local`)

### Backend (FastAPI)
- [x] FastAPI 프로젝트 생성 (`backend/`)
- [x] 가상환경 설정 (`uv`)
- [x] 의존성 설치: `fastapi`, `uvicorn`, `supabase`, `litellm`, `pydantic`
- [x] 프로젝트 구조 설계 (router, service, model 분리)
- [x] 환경변수 설정 (`.env`)
- [x] CORS 설정 (Next.js 연동)
- [x] 서버 실행 스크립트 (`run.sh`, `run.bat`)

### Supabase
- [x] Supabase 프로젝트 생성
- [x] Google OAuth 설정
- [x] 환경변수 발급 (URL, anon key, service key)

---

## Phase 1 - MVP 개발

### 인증
- [x] Supabase Auth 연동 (Backend)
- [x] Google 소셜 로그인 (Frontend)
- [x] 로그인 / 로그아웃 UI
- [x] 인증 미들웨어 (FastAPI JWT 검증) - RS256/HS256 자동 감지
- [x] 프로필 초기 설정 페이지 (닉네임, bio, LLM 설정)
- [ ] OAuth Provider 추상화 구조 적용 (Phase 2 - Discord 추가 시 리팩토링)

### DB 스키마 설계
- [x] `users` 테이블 (nickname, bio, llm_provider, llm_model, llm_api_key 암호화)
- [x] `battle_reports` 테이블 (mission/score/terrain/deploy는 metadata JSONB로 통합)
- [x] `battle_turns` 테이블 (턴별 행동 기록 - actions JSONB flat 리스트)
- [x] `army_lists` 테이블 (player_name 기반, 리포트당 N개)
- [x] Supabase Migration 파일 작성 (002, 003, 004) + RLS 적용
- ~~`factions` 테이블~~ → 제거 (army_lists raw_text에 포함)
- ~~`missions` 테이블~~ → 제거 (battle_reports.metadata로 처리)
- ~~`terrain_layouts` / `deployment_zones` 테이블~~ → 제거 (metadata image_url로 처리)
- ~~`units` 테이블~~ → 제거 (actions JSONB에 unit_name 직접 기록)

### 로스터 입력
- [x] GW 공식 앱 export 포맷 파서 구현 (services/roster_parser.py)
- [x] 파서 인터페이스 추상화 (RosterParser ABC)
- [x] 파서 API 엔드포인트 (POST /api/v1/roster/parse)
- [x] 아미 리스트 텍스트 붙여넣기 UI (components/reports/army-list-editor.tsx)
- [x] 파싱 결과 유닛 목록 표시

### 맵 시스템
- [x] 맵 배경 이미지 표시 (terrain/deploy 식별자 → /maps/*.png 매핑)
- [x] 유닛 초기 배치 (맵 위 드래그) - 좌표는 0~1 정규화 값
- [x] 리저브 구역(상/하단) + 맵 가운데 배치
- [x] 맵 토큰 위 유닛 이름 라벨 표시
- [x] 토큰 hover 시 마커 외곽선 강조 (선택 상태 표시)
- [x] 토큰을 RemoveZone에 드래그해서 제거
- [ ] 맵 이미지 업로드 UI → Supabase Storage 연동
- [ ] Supabase Storage bucket + RLS 정책

### 턴 작성 페이지 (/reports/[id]/write) - 듀얼 로스터 디자인
- [x] VS Banner + Roster 좌/우 컬럼 + 중앙 맵 + 푸터 내러티브
- [x] TurnRibbon (P / 1 / 2 ... + 턴 추가 버튼)
- [x] BattleMap: SVG 그리드/배치존/센터라인, 배경 이미지 지원
- [x] 캐릭터 합류(Attach) — P턴에 캐릭터 칩을 비캐릭터 유닛으로 드래그
- [x] 합류 상태를 칩(★, → host, + char)과 토큰 위 작은 라벨로 표시
- [x] 합류 × 버튼으로 이탈
- [x] 동명 유닛 식별: `{name}#{occurrence}` ID + 칩에 #1/#2 suffix
- [x] 누적 토큰 상태 (모든 턴 actions 순서대로 재생)
- [x] 페이즈 시간 순서 기반 cumulative 필터 (페이즈 되돌리면 위치도 복원)
- [x] 페이지 새로고침/턴 이동 시 모든 위치/액션 영속

### Turn ≥ 1 페이즈/액션 시스템
- [x] PhaseControls: 선후턴(A/B 먼저) + 활성 플레이어 + 페이즈 탭
- [x] 페이즈 정의: 커맨드/무브/슈팅/차지/파이트
- [x] 페이즈별 액션 메뉴 (popover)
  - 커맨드: 배틀쇼크
  - 무브: 무브/어드밴스/폴백
  - 슈팅: 사격(target)/액션
  - 차지: 차지(target → 근처 이동 → 위치 조정)
  - 파이트: 파이트(target)
  - 공통: 스트라타젬, 처치됨, 점령, 사건 메모, 회수
- [x] 사격/파이트: 대상 토큰 클릭 + 파괴 confirm → destroyed 자동 기록
- [x] 차지: target 클릭 → 자동 이동 후 위치 조정 모드 (다음 클릭으로 미세 조정)
- [x] 이동 화살표 시각화 (move=파랑, attack=빨강)
- [x] 화살표 필터링: 현재 턴 + 현재 페이즈 + 현재 활성 플레이어만 표시
- [x] 페이즈 ← → 큰 floating 버튼 (페이지 컨테이너 좌우 바깥)
  - 파이트 끝 + 선턴 → 후턴 command로 전환
  - 파이트 끝 + 후턴 → 다음 턴 생성
- [x] 턴 시작 시 선후턴 선택 차단 UI (round_setup 액션 영속화)
- [x] 활성 플레이어 전환 시 페이즈 메모리 (각 플레이어 마지막 페이즈 복원)
- [x] 드래그 잠금 규칙: P턴/무브페이즈에서만 chip/reserve 드래그 가능, 맵 토큰은 P턴만
- [x] 상대 유닛 클릭도 액션 메뉴 노출 (스트라타젬 등)
- [x] 무브 페이즈에 리저브 → 맵 드래그 배치
- [x] 파괴(destroyed) 토큰: 그 페이즈까지 X자 표시, 다음 페이즈로 넘어가면 제거

### 턴 로그 (구 진영 사건)
- [x] 사건 자동 도출 (actor_player 기준)
- [x] 사건 × 버튼으로 개별 삭제
- [x] 현재 턴/현재 페이즈/현재 활성 플레이어 기준 필터링
- [x] phase 태그 + target 정보 (→ {대상} ({side})) 표시
- [x] 턴 ≥ 1에서는 유닛 리스트 숨김, 턴 로그 영역 확장

### LLM 자동 리포트 생성 ⭐
- [ ] LiteLLM 설치 및 기본 설정
- [x] 유저 LLM 설정 저장 (선호 모델, API 키 암호화 저장)
- [ ] 턴 기록 기반 리포트 생성 프롬프트 설계
- [ ] 생성 API 구현 (FastAPI POST /reports/generate)
- [ ] 스트리밍 응답 구현 (SSE)
- [ ] 프론트 스트리밍 수신 및 실시간 출력 (Next.js)
- [ ] 수동 리포트 작성/편집 UI (LLM 없이도 동작)
- [ ] 생성된 리포트 편집 기능

### 배틀리포트 - CRUD API (Backend)
- [x] Pydantic 스키마 (BattleReport, BattleTurn, ArmyList, ReportMetadata)
- [x] 서비스 레이어 (ownership 체크 포함)
- [x] 라우터 (CRUD + nested army-lists/turns)

### 배틀리포트 - 조회/작성 (Frontend)
- [x] 리포트 목록 페이지 (/reports)
- [x] 설정 페이지 (/reports/new) — 제목/공개/미션팩/배치/지형/아미리스트
- [x] 작성 페이지 (/reports/[id]/write) — 듀얼 로스터 + 배치/턴 UI
- [x] 리포트 상세 페이지 (/reports/[id])
- [x] 리포트 설정 수정 페이지 (/reports/[id]/edit)
- [x] 공개/비공개 설정 UI
- [ ] 팩션별 필터
- [ ] 페이지네이션 or 무한스크롤
- [ ] 공개 리포트 목록 페이지 (/reports/public)

### 유저 프로필
- [x] 프로필 페이지 UI (닉네임, bio, LLM provider/model/API key)
- [ ] 전적 통계 (승/패/무, 팩션별 승률)
- [ ] 작성한 리포트 목록
- [x] LLM 설정 관리 페이지 (모델 선택, API 키)

---

## Phase 1 - 배포

- [ ] Vercel 프로젝트 연결 (Frontend)
- [ ] Railway 프로젝트 연결 (Backend)
- [ ] Supabase 환경변수 프로덕션 설정
- [ ] 도메인 연결 (선택)
- [ ] CI/CD 파이프라인 구성 (GitHub Actions)

---

## Phase 2 - 고도화

- [ ] Discord 로그인 추가 (OAuth Provider 추가)
- [ ] 추가 아미리스트 포맷 파서 (BattleScribe 등)
- [ ] 유닛 이미지/사진 지원
- [ ] 팩션별 필터 / 검색 기능
- [ ] 댓글 / 좋아요
- [ ] 팔로우 / 팔로잉
- [ ] 커스텀 Terrain Layout / Deployment Zone 이미지 업로드
- [ ] 커스텀 레이아웃 생성 툴
- [ ] 프롬프트 커스텀 (고급 유저)
- [ ] 리포트 재생성

---

## Phase 3 - 확장

- [ ] 타 게임 지원 (Age of Sigmar, Horus Heresy 등)
- [ ] 게임별 독립 지형 배치 툴
- [ ] 토너먼트 기록
- [ ] 통계 대시보드
- [ ] 모바일 PWA

---

## 미결 논의 사항

- [ ] 다국어 지원 여부 (한국어 우선)
- [ ] 모바일 앱 지원 여부
