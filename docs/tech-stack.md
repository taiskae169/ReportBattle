# 기술 스택

> 최종 확정: 2026-03-10

## 개요

미니어처 게임(Warhammer 40K 우선) 유저를 위한 배틀리포트 웹 서비스.
LLM 기반 자동 리포트 생성을 핵심 기능으로 한다.

---

## 확정 스택

| 영역 | 기술 | 버전 |
|------|------|------|
| **Frontend** | Next.js + TypeScript | 15.x |
| **Backend** | FastAPI | 최신 |
| **DB / Auth / Storage** | Supabase (PostgreSQL) | - |
| **LLM 통합** | LiteLLM | 최신 |
| **스타일링** | Tailwind CSS + shadcn/ui | - |
| **배포 (Frontend)** | Vercel | - |
| **배포 (Backend)** | Railway | - |

---

## 각 기술 선택 이유

### Frontend: Next.js 15 (App Router)
- 배틀리포트는 공개 콘텐츠 → SSR/SSG로 SEO 최적화 필요
- React 생태계 → UI 컴포넌트 풍부 (shadcn/ui 등)
- Vercel 배포와 최적 궁합

### Backend: FastAPI (Python)
- 개발자가 Python 메인 → 편한 언어로 핵심 로직 작성
- LLM 생태계가 Python 퍼스트 (LiteLLM, LangChain 등)
- 비동기 지원으로 LLM 스트리밍 처리에 적합

### DB / Auth: Supabase
- PostgreSQL 기반 → 구조화된 게임 데이터 관리에 적합
- Auth 내장 → Google / Discord 소셜 로그인 지원
- Storage 내장 → 배틀 사진 업로드
- 빠른 MVP 개발 가능

### LLM 통합: LiteLLM
- 주요 LLM을 단일 인터페이스로 통합
- 유저가 원하는 LLM을 선택/API 키 등록 가능
- 모델 교체 시 코드 변경 없음
- 스트리밍, 비용 추적, 폴백 기능 내장

**지원 LLM 목록:**
- OpenAI (GPT-4o, GPT-4)
- Anthropic (Claude 3.5, Claude 4)
- Google (Gemini 2.0, Gemini 1.5)
- Meta Llama (Ollama 로컬 실행)
- Mistral, Cohere 등

---

## 인증 방식

- **소셜 로그인**: Google, Discord
- Discord 우선 권장 (40K 커뮤니티 특성상 Discord 유저가 많음)
- Supabase Auth로 처리

---

## 아키텍처 흐름

```
[Browser]
    │  Next.js (SSR/CSR)
    │
    ▼
[FastAPI Backend]
    ├── REST API (CRUD)
    ├── LiteLLM → OpenAI / Claude / Gemini / Llama ...
    └── Supabase Client
         ├── PostgreSQL (데이터)
         └── Storage (이미지)
```

### LLM 리포트 생성 흐름

```
유저가 매치 정보 입력
    → Next.js 폼 제출
    → FastAPI POST /reports/generate
    → DB 저장
    → LiteLLM으로 선택된 LLM 호출
    → 스트리밍으로 프론트에 리포트 전달
    → 완성된 리포트 DB 업데이트
```

---

## 모노레포 구조 (예정)

```
ReportBattle/
├── frontend/          # Next.js
├── backend/           # FastAPI
├── docs/              # 기획 문서
└── docker-compose.yml # 로컬 개발 환경
```
