from app.core.supabase import supabase
from app.core.encryption import encrypt, decrypt
from app.schemas.user import UserProfile, UserProfileUpdate


def _row_to_profile(data: dict) -> UserProfile:
    return UserProfile(
        id=data["id"],
        nickname=data.get("nickname"),
        bio=data.get("bio"),
        llm_provider=data.get("llm_provider"),
        llm_model=data.get("llm_model"),
        has_llm_api_key=bool(data.get("llm_api_key")),
        created_at=data["created_at"],
        updated_at=data["updated_at"],
    )


def get_user_profile(user_id: str) -> UserProfile:
    result = supabase.table("users").select("*").eq("id", user_id).maybe_single().execute()

    # 행이 없으면 자동 생성 (트리거 누락 케이스 대비)
    if result is None or not result.data:
        supabase.table("users").insert({"id": user_id}).execute()
        result = supabase.table("users").select("*").eq("id", user_id).single().execute()

    return _row_to_profile(result.data)


def update_user_profile(user_id: str, payload: UserProfileUpdate) -> UserProfile:
    update_data = payload.model_dump(exclude_none=True)

    # API 키는 암호화해서 저장
    if "llm_api_key" in update_data:
        update_data["llm_api_key"] = encrypt(update_data["llm_api_key"])

    supabase.table("users").update(update_data).eq("id", user_id).execute()
    return get_user_profile(user_id)


def get_decrypted_api_key(user_id: str) -> str | None:
    """LLM 호출 시 내부적으로만 사용 - 라우터에 노출하지 않음"""
    result = supabase.table("users").select("llm_api_key").eq("id", user_id).single().execute()
    encrypted_key = result.data.get("llm_api_key") if result.data else None
    if not encrypted_key:
        return None
    return decrypt(encrypted_key)
