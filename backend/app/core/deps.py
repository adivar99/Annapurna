from jose import jwt, JWTError
from fastapi.security import SecurityScopes, OAuth2
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, SecurityScopes
from fastapi.openapi.models import OAuthFlow as OAuthFlowsModel
from fastapi.security.utils import get_authorization_scheme_param
from pydantic import ValidationError

from typing import Optional
from models.user import User
from schemas.user import TokenData, TokenPayload
from crud.user import get_user_by_username
from core.auth import SECRET_KEY, ALGORITHM

class OAuth2PasswordBearerCookie(OAuth2):
    def __init__(
        self,
        tokenUrl: str,
        scheme_name: str = None,
        scopes: dict = None,
        auto_error: bool = True,
    ):
        if not scopes:
            scopes = {}
        flows = OAuthFlowsModel(password={"tokenUrl": tokenUrl, "scopes": scopes})
        super().__init__(flows=flows, scheme_name=scheme_name, auto_error=auto_error)

    async def __call__(self, request: Request) -> Optional[str]:
        cookie_authorization: str = request.cookies.get("Authorization")
        cookie_scheme, cookie_param = get_authorization_scheme_param(cookie_authorization)
        authorization = False

        if cookie_scheme.lower() == "bearer":
            authorization = True
            scheme = cookie_scheme
            param = cookie_param

        if not authorization or scheme.lower() != "bearer":
            if self.auto_error:
                raise HTTPException(status_code=403, detail="Not authenticated")
            else:
                return None
        return param

reusable_oauth2 = OAuth2PasswordBearerCookie(
    tokenUrl="api/v1/auth/login",
    scopes={}
    )

async def get_current_user(
    security_scopes: SecurityScopes,
    token: str = Depends(reusable_oauth2),
):
    if security_scopes.scopes:
        authenticate_value = f'Bearer scope="{security_scopes.scope_str}"'
    else:
        authenticate_value = "Bearer"

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": authenticate_value},
    )
    try:
        payload = jwt.decode(
            token, SECRET_KEY, algorithms=[ALGORITHM]
        )
        username: str = payload.get("sub")
        print(f"GET CURRENT USER: payload_{username=}")
        if username is None:
            raise credentials_exception
        token_scopes = payload.get("scopes", [])
        token_data = TokenPayload(scopes=token_scopes, sub=username)
    except (JWTError, ValidationError) as e:
        print(f"ERROR in GET CURRENT USER: {e}")
        raise credentials_exception
    user = await get_user_by_username(token_data.sub)
    print(f"GET CURRENT USER: db {user=}")
    if user is None:
        raise credentials_exception
    # Mantis 0774845 - all other API endpoints must reject this token (token with scope)
    if token_scopes:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not enough permissions - 0",
            headers={"WWW-Authenticate": authenticate_value},
        )
    return user

async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Get current active user"""
    if not current_user:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user 