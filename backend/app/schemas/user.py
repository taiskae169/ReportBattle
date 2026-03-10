from pydantic import BaseModel
from datetime import datetime


class UserProfile(BaseModel):
    id: str
    nickname: str | None
    bio: str | None
    llm_provider: str | None
    llm_model: str | None
    has_llm_api_key: bool  # 키 존재 여부만 노출, 실제 키는 반환하지 않음
    created_at: datetime
    updated_at: datetime


class UserProfileUpdate(BaseModel):
    nickname: str | None = None
    bio: str | None = None
    llm_provider: str | None = None
    llm_model: str | None = None
    llm_api_key: str | None = None  # 입력받아서 암호화 후 저장
