import importlib
import pkgutil

from fastapi import APIRouter, Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from server import models  # noqa: F401  (모델을 불러와야 Base가 테이블을 인식함)
from server import routers as routers_pkg
from server.database import Base, engine, get_db
from server.seed import ensure_columns

# 서버가 켜질 때 없는 테이블을 자동으로 생성 (이미 있으면 건드리지 않음)
Base.metadata.create_all(bind=engine)
# 이미 있는 테이블에 새로 생긴 컬럼도 자동으로 추가 (create_all 은 컬럼을 못 추가함)
ensure_columns()

app = FastAPI(title="Handland API")

# routers/ 폴더의 모든 파일에서 APIRouter를 찾아 자동으로 등록
# → 새 기능은 routers/ 에 파일만 추가하면 된다 (auth, inference, learning, shop, rooms ...)
for module_info in pkgutil.iter_modules(routers_pkg.__path__):
    module = importlib.import_module(f"server.routers.{module_info.name}")
    for name in dir(module):
        obj = getattr(module, name)
        if isinstance(obj, APIRouter):
            app.include_router(obj)

# 프론트(React + Vite, 기본 5173 포트)에서 이 서버를 호출할 수 있게 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    """서버가 살아있는지 확인"""
    return {"status": "ok"}


@app.get("/db-check")
def db_check(db: Session = Depends(get_db)):
    """DB에 간단한 쿼리를 보내 연결 확인"""
    db.execute(text("SELECT 1"))
    return {"db": "connected"}
