"""
기본 데이터 넣기 (여러 번 실행해도 중복으로 안 들어감)
실행(server/ 폴더에서): uv run python -m server.seed
"""
from server import models  # noqa: F401
from server.database import Base, SessionLocal, engine
from server.models import Card, Item, Stage, StageCard, Theme

# 스테이지(섬) 구성: (스테이지 제목, [배울 글자들])
LETTER_STAGES = [
    ("자음 1", ["ㄱ", "ㄴ", "ㄷ", "ㄹ"]),
    ("자음 2", ["ㅁ", "ㅂ", "ㅅ", "ㅇ"]),
    ("자음 3", ["ㅈ", "ㅊ", "ㅋ", "ㅌ"]),
    ("자음 4", ["ㅍ", "ㅎ"]),
]

# 상점 아이템: (카테고리, 이름, 가격)
ITEMS = [
    ("hat", "견습생 모자", 100), ("hat", "별빛 모자", 200), ("hat", "마법사 왕관", 300),
    ("top", "견습생 로브", 100), ("top", "달빛 로브", 200), ("top", "별자리 망토", 300),
    ("bottom", "견습생 바지", 100), ("bottom", "구름 바지", 200), ("bottom", "번개 바지", 300),
]


def seed_learning(db):
    if db.query(Theme).filter_by(name="지문자").first():
        print("학습 데이터: 이미 있어요")
        return
    theme = Theme(name="지문자")
    db.add(theme)
    db.flush()  # theme.id 확정

    for chapter_no, (title, letters) in enumerate(LETTER_STAGES, start=1):
        stage = Stage(theme_id=theme.id, chapter_no=chapter_no, kind="letter", title=title)
        db.add(stage)
        db.flush()
        for order_no, letter in enumerate(letters):
            card = Card(theme_id=theme.id, kind="letter", text=letter)
            db.add(card)
            db.flush()
            db.add(StageCard(stage_id=stage.id, card_id=card.id, order_no=order_no))
    print("학습 데이터: 테마 1개, 스테이지 4개, 카드 14개 추가")


def seed_items(db):
    if db.query(Item).count() > 0:
        print("아이템: 이미 있어요")
        return
    for category, name, price in ITEMS:
        db.add(Item(category=category, name=name, price=price))
    print(f"아이템: {len(ITEMS)}개 추가")


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_learning(db)
        seed_items(db)
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    seed()
