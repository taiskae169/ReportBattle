# 프로젝트 TODO

> 최종 업데이트: 2026-03-11 (세션 2)

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
- [ ] OAuth Provider 추상화 구조 적용 (추후 Discord 등 추가 대비)

### DB 스키마 설계
- [x] `users` 테이블 (nickname, bio, llm_provider, llm_model, llm_api_key 암호화)
- [ ] `battle_reports` 테이블
- [ ] `battle_turns` 테이블 (턴별 행동 기록)
- [ ] `factions` 테이블 (40K 팩션 시드 데이터)
- [ ] `missions` 테이블 (40K 미션 목록)
- [ ] `terrain_layouts` 테이블 (GW 공식 지형 배치 이미지)
- [ ] `deployment_zones` 테이블 (미션별 배치구역 이미지)
- [ ] `army_lists` 테이블
- [ ] `units` 테이블 (파싱된 유닛 목록)
- [ ] Supabase Migration 파일 작성

### 로스터 입력
- [ ] GW 공식 앱 export 포맷 파서 구현 (Backend)
- [ ] 파서 인터페이스 추상화 (추후 다른 포맷 파서 추가 대비)
- [ ] 아미 리스트 텍스트 붙여넣기 UI (Frontend)
- [ ] 파싱 결과 유닛 목록 표시

### 맵 시스템
- [ ] GW 공식 Terrain Layout 이미지 DB 구축 (시드 데이터)
- [ ] GW 공식 Deployment Zone 이미지 DB 구축 (미션별)
- [ ] 미션 선택 UI
- [ ] Terrain Layout 선택 UI
- [ ] 두 이미지 오버레이 컴포넌트 (Frontend)
- [ ] 유닛 초기 배치 (맵 위 드래그)

### 턴별 행동 기록
- [ ] 턴별 유닛 이동 드래그 UI (Frontend)
- [ ] 턴별 위치 데이터 저장 API (Backend)
- [ ] 턴별 메모 입력 (선택)

### LLM 자동 리포트 생성 ⭐
- [ ] LiteLLM 설치 및 기본 설정
- [x] 유저 LLM 설정 저장 (선호 모델, API 키 암호화 저장)
- [ ] 턴 기록 기반 리포트 생성 프롬프트 설계
- [ ] 생성 API 구현 (FastAPI POST /reports/generate)
- [ ] 스트리밍 응답 구현 (SSE)
- [ ] 프론트 스트리밍 수신 및 실시간 출력 (Next.js)
- [ ] 수동 리포트 작성/편집 UI (LLM 없이도 동작)
- [ ] 생성된 리포트 편집 기능

### 배틀리포트 - 조회
- [ ] 리포트 목록 페이지 (최신순)
- [ ] 리포트 상세 페이지 (맵 + 턴 기록 + 리포트)
- [ ] 팩션별 필터
- [ ] 공개/비공개 설정
- [ ] 페이지네이션 or 무한스크롤

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
