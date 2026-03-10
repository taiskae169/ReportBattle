from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
import httpx
from jwt.algorithms import RSAAlgorithm
from app.core.config import settings

security = HTTPBearer()

_jwks_cache: dict | None = None


def _get_public_key(kid: str):
    global _jwks_cache
    if _jwks_cache is None:
        jwks_url = f"{settings.SUPABASE_URL}/auth/v1/.well-known/jwks.json"
        response = httpx.get(jwks_url)
        _jwks_cache = response.json()

    for key in _jwks_cache.get("keys", []):
        if key.get("kid") == kid:
            return RSAAlgorithm.from_jwk(key)

    return None


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    token = credentials.credentials
    try:
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")

        if kid:
            # RS256 (신규 Supabase 프로젝트)
            public_key = _get_public_key(kid)
            if public_key is None:
                raise jwt.InvalidTokenError("Public key not found")
            payload = jwt.decode(
                token,
                public_key,
                algorithms=["RS256"],
                options={"verify_aud": False},
            )
        else:
            # HS256 (레거시 Supabase 프로젝트)
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                options={"verify_aud": False},
            )

        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )
