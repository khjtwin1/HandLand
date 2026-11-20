"""
기본 데이터 넣기 (여러 번 실행해도 중복으로 안 들어감)
실행(server/ 폴더에서): uv run python -m server.seed
"""
from sqlalchemy import text

from server import models  # noqa: F401
from server.database import Base, SessionLocal, engine
from server.models import Card, Item, Stage, StageCard, Theme, UserItem

# 스테이지(섬) 구성: (스테이지 제목, 설명, [배울 글자들])
LETTER_STAGES = [
    ("자음 1", "기본 자음 ㄱ ㄴ ㄷ ㄹ을 배워요", ["ㄱ", "ㄴ", "ㄷ", "ㄹ"]),
    ("자음 2", "기본 자음 ㅁ ㅂ ㅅ ㅇ을 배워요", ["ㅁ", "ㅂ", "ㅅ", "ㅇ"]),
    ("자음 3", "기본 자음 ㅈ ㅊ ㅋ ㅌ을 배워요", ["ㅈ", "ㅊ", "ㅋ", "ㅌ"]),
    ("자음 4", "기본 자음 ㅍ ㅎ을 배워요", ["ㅍ", "ㅎ"]),
    ("모음 1", "기본 모음 ㅏ ㅑ ㅓ ㅕ를 배워요", ["ㅏ", "ㅑ", "ㅓ", "ㅕ"]),
    ("모음 2", "기본 모음 ㅗ ㅛ ㅜ ㅠ를 배워요", ["ㅗ", "ㅛ", "ㅜ", "ㅠ"]),
    ("모음 3", "기본 모음 ㅡ ㅣ ㅐ ㅔ를 배워요", ["ㅡ", "ㅣ", "ㅐ", "ㅔ"]),
]
# 이름 퀘스트: 카드 없이 내 이름의 자모로 문제를 만든다 (모두 통과하면 지문자 대륙 클리어)
QUEST_STAGE = ("내 이름 수어 퀘스트", "배운 지문자로 내 이름을 직접 말해 봐요")

# 준비 중인 대륙: 인식 모델이 생기면 스테이지와 카드를 채우면 된다
# TODO: 인사/학교/생활/감정 대륙의 스테이지, 카드, 시범 영상 추가
COMING_THEMES = ["인사", "학교", "생활", "감정"]

# 기본 지급 아이템은 가격 0: (카테고리, 이름, 가격, 필요 티어)
ITEMS = [
    ("hair", "파란 베레모", 0, None), ("hair", "노랑 베레모", 120, None),
    ("hair", "민트 베레모", 120, None), ("hair", "핑크 베레모", 120, None),
    ("hair", "차콜 베레모", 300, "플래티넘"),
    ("face", "기본 표정", 0, None), ("face", "윙크 표정", 150, None),
    ("face", "웃는 눈 표정", 150, None),
    ("outfit", "하트 나비넥타이", 180, None), ("outfit", "파란 스카프", 160, None),
]
NEW_CATEGORIES = ("hair", "face", "outfit")


def ensure_columns():
    """create_all이 못 하는 컬럼 추가 (PostgreSQL)"""
    if engine.dialect.name != "postgresql":
        return
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE stages ADD COLUMN IF NOT EXISTS description VARCHAR(200)"))
        conn.execute(text("ALTER TABLE items ADD COLUMN IF NOT EXISTS required_tier VARCHAR(20)"))
        conn.execute(text("ALTER TABLE cards ADD COLUMN IF NOT EXISTS image_url VARCHAR(255)"))
        conn.execute(text("ALTER TABLE cards ADD COLUMN IF NOT EXISTS description VARCHAR(300)"))


def seed_learning(db):
    theme = db.query(Theme).filter_by(name="지문자").first()
    if theme is None:
        theme = Theme(name="지문자")
        db.add(theme)
        db.flush()  # theme.id 확정

    added = 0
    for chapter_no, (title, desc, letters) in enumerate(LETTER_STAGES, start=1):
        stage = db.query(Stage).filter_by(theme_id=theme.id, chapter_no=chapter_no).first()
        if stage is None:
            stage = Stage(theme_id=theme.id, chapter_no=chapter_no, kind="letter", title=title)
            db.add(stage)
            db.flush()
            added += 1
        stage.description = desc
        for order_no, letter in enumerate(letters):
            card = db.query(Card).filter_by(theme_id=theme.id, kind="letter", text=letter).first()
            if card is None:
                card = Card(theme_id=theme.id, kind="letter", text=letter)
                db.add(card)
                db.flush()
            if db.get(StageCard, (stage.id, card.id)) is None:
                db.add(StageCard(stage_id=stage.id, card_id=card.id, order_no=order_no))

    quest_no = len(LETTER_STAGES) + 1
    quest = db.query(Stage).filter_by(theme_id=theme.id, chapter_no=quest_no).first()
    if quest is None:
        quest = Stage(theme_id=theme.id, chapter_no=quest_no, kind="quest", title=QUEST_STAGE[0])
        db.add(quest)
        added += 1
    quest.description = QUEST_STAGE[1]

    for name in COMING_THEMES:
        if db.query(Theme).filter_by(name=name).first() is None:
            db.add(Theme(name=name))
    print(f"학습 데이터: 스테이지 {added}개 추가 (지문자 대륙 + 준비 중 대륙 {len(COMING_THEMES)}개)")


def seed_items(db):
    # 예전 카테고리(hat/top/bottom) 아이템은 새 카테고리로 교체
    old = db.query(Item).filter(Item.category.notin_(NEW_CATEGORIES)).all()
    if old:
        old_ids = [i.id for i in old]
        db.query(UserItem).filter(UserItem.item_id.in_(old_ids)).delete(synchronize_session=False)
        db.query(Item).filter(Item.id.in_(old_ids)).delete(synchronize_session=False)
        print(f"아이템: 예전 아이템 {len(old)}개 삭제")

    added = 0
    for category, name, price, tier in ITEMS:
        item = db.query(Item).filter_by(category=category, name=name).first()
        if item is None:
            db.add(Item(category=category, name=name, price=price, required_tier=tier))
            added += 1
    print(f"아이템: {added}개 추가")


def seed():
    Base.metadata.create_all(bind=engine)
    ensure_columns()
    db = SessionLocal()
    try:
        seed_learning(db)
        seed_items(db)
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    seed()
