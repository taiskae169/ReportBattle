-- =============================================
-- users 테이블
-- auth.users 확장 (1:1 관계)
-- =============================================

create table public.users (
    id          uuid primary key references auth.users (id) on delete cascade,
    nickname    text,
    bio         text,                          -- 자기소개 (플레이 팩션, 게임 등 자유 입력)
    llm_provider text,                         -- openai / claude / gemini / ollama
    llm_model   text,                          -- gpt-4o / claude-3-5-sonnet 등
    llm_api_key text,                          -- AES-256 암호화된 API 키
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

-- =============================================
-- RLS (Row Level Security)
-- =============================================

alter table public.users enable row level security;

-- 본인 프로필만 조회 가능
create policy "users_select_own"
    on public.users for select
    using (auth.uid() = id);

-- 본인 프로필만 수정 가능
create policy "users_update_own"
    on public.users for update
    using (auth.uid() = id);

-- =============================================
-- 자동 프로필 생성 트리거
-- Google 로그인 시 auth.users에 레코드 생성 →
-- 자동으로 public.users에 빈 행 생성
-- =============================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
    insert into public.users (id)
    values (new.id);
    return new;
end;
$$;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();

-- =============================================
-- updated_at 자동 갱신 트리거
-- =============================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger users_set_updated_at
    before update on public.users
    for each row execute procedure public.set_updated_at();
