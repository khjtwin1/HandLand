import datetime as dt
import os

import bcrypt
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from server.database import get_db
from server.models import User

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")
ALGORITHM = "HS256"
TOKEN_HOURS = 12  # 로그인 유지 시간


def hash_password(password: str) -> str:
    """비밀번호를 해시로 바꿈 (원문은 절대 DB에 저장하지 않음)"""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    """입력한 비밀번호가 저장된 해시와 맞는지 확인"""
    return bcrypt.checkpw(password.encode(), password_hash.encode())


def create_token(user_id: int) -> str:
    """로그인 성공 시 발급하는 토큰 (사용자 id + 만료 시간이 들어 있음)"""
    payload = {
        "sub": str(user_id),
        "exp": dt.datetime.now(dt.timezone.utc) + dt.timedelta(hours=TOKEN_HOURS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


bearer = HTTPBearer()


def get_current_user(
    cred: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    """로그인이 필요한 API에서 Depends(get_current_user)로 쓰면 현재 사용자가 들어옴"""
    try:
        payload = jwt.decode(cred.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise HTTPException(status_code=401, detail="로그인이 필요해요")
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="존재하지 않는 사용자예요")
    return user
