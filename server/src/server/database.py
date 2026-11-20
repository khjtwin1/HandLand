import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# .env 파일의 값을 환경변수로 읽어옴 (server/ 폴더에서 실행해야 .env를 찾음)
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

# DB 연결 엔진 (pool_pre_ping: 끊어진 연결을 자동으로 확인해서 복구)
engine = create_engine(DATABASE_URL, pool_pre_ping=True)

# 세션 공장: 요청마다 DB 작업 창구를 하나씩 만들어 줌
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

# 나중에 테이블(모델)을 만들 때 상속받을 기본 클래스
Base = declarative_base()


def get_db():
    """API 함수가 Depends(get_db)로 불러 쓰는 세션 제공 함수"""
    db = SessionLocal()
    try:
        yield db      # API가 이 세션을 사용
    finally:
        db.close()    # 요청이 끝나면 반드시 닫기
