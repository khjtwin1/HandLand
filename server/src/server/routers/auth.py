from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from server.database import get_db
from server.models import AllowedAccount, User
from server.security import create_token, get_current_user, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])

class SignupRequest(BaseModel):
    login_id: str = Field(min_length=1, max_length=50)       # 빈칸 검사
    password: str = Field(min_length=4, max_length=72)
    password_confirm: str
    name: str = Field(min_length=1, max_length=50)


class LoginRequest(BaseModel):
    login_id: str
    password: str


def user_info(user: User) -> dict:
    """사이드바에 보여줄 사용자 정보"""
    return {
        "id": user.id,
        "login_id": user.login_id,
        "name": user.name,
        "level": user.level,
        "coins": user.coins,
    }


@router.post("/signup", status_code=201)
def signup(body: SignupRequest, db: Session = Depends(get_db)):
    # 비밀번호 확인 일치
    if body.password != body.password_confirm:
        raise HTTPException(status_code=400, detail="비밀번호 확인이 일치하지 않아요")
    # 기관이 등록한 아이디만 가입 가능
    if db.query(AllowedAccount).filter_by(login_id=body.login_id).first() is None:
        raise HTTPException(status_code=403, detail="기관에서 등록한 아이디만 가입할 수 있어요")
    # 아이디 중복
    if db.query(User).filter_by(login_id=body.login_id).first() is not None:
        raise HTTPException(status_code=409, detail="이미 가입된 아이디예요")

    user = User(
        login_id=body.login_id,
        password_hash=hash_password(body.password),
        name=body.name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"message": "가입이 완료됐어요", "user": user_info(user)}


@router.post("/login")
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter_by(login_id=body.login_id).first()
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="아이디 또는 비밀번호가 틀렸어요")
    return {
        "access_token": create_token(user.id),
        "token_type": "bearer",
        "user": user_info(user),
    }


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    """토큰으로 현재 로그인한 사용자 정보 조회(새로고침 후 로그인 유지 확인용)"""
    return user_info(user)
