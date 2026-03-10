from fastapi import APIRouter, Depends
from app.core.auth import get_current_user
from app.schemas.user import UserProfile, UserProfileUpdate
from app.services import user as user_service

router = APIRouter()


@router.get("/me", response_model=UserProfile)
async def get_my_profile(current_user: dict = Depends(get_current_user)):
    return user_service.get_user_profile(current_user["sub"])


@router.patch("/me", response_model=UserProfile)
async def update_my_profile(
    payload: UserProfileUpdate,
    current_user: dict = Depends(get_current_user),
):
    return user_service.update_user_profile(current_user["sub"], payload)
