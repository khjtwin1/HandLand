from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime,
    ForeignKey, UniqueConstraint, func,
)

from server.database import Base

# 사용자 / 로그인
class AllowedAccount(Base):
    """기관이 미리 등록한 아이디 목록 (화이트리스트). 여기 있는 아이디만 회원가입 가능"""
    __tablename__ = "allowed_accounts"

    id = Column(Integer, primary_key=True)
    login_id = Column(String(50), unique=True, nullable=False)
    org_name = Column(String(100))                      # 기관 이름


class User(Base):
    """가입한 사용자. 레벨(사이드바 표시)과 핸드코인을 여기서 관리"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    login_id = Column(String(50), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(50), nullable=False)
    level = Column(Integer, default=1, nullable=False)
    xp = Column(Integer, default=0, nullable=False)
    coins = Column(Integer, default=0, nullable=False)   # 핸드코인
    created_at = Column(DateTime, server_default=func.now())


# 학습 콘텐츠
class Theme(Base):
    """테마 (일상, 학교, 식당 ...)"""
    __tablename__ = "themes"

    id = Column(Integer, primary_key=True)
    name = Column(String(50), unique=True, nullable=False)


class Card(Base):
    """주문 카드 = 지문자/단어/문장 하나"""
    __tablename__ = "cards"

    id = Column(Integer, primary_key=True)
    theme_id = Column(Integer, ForeignKey("themes.id"))  # 지문자는 테마 없이 비워도 됨
    kind = Column(String(10), nullable=False)            # 'letter' | 'word' | 'sentence'
    text = Column(String(100), nullable=False)           # 예: 'ㄱ', '안녕하세요'
    video_url = Column(String(255))                      # 1단계 강의 영상 주소


class Stage(Base):
    """스테이지 = 스테이지 맵의 섬 하나. 테마마다 8개 (Ch.1~4 단어, 5~7 문장, 8 복습)"""
    __tablename__ = "stages"
    __table_args__ = (UniqueConstraint("theme_id", "chapter_no"),)

    id = Column(Integer, primary_key=True)
    theme_id = Column(Integer, ForeignKey("themes.id"), nullable=False)
    chapter_no = Column(Integer, nullable=False)         # 1~8
    kind = Column(String(10), nullable=False)            # 'letter' | 'word' | 'sentence' | 'review'
    title = Column(String(100), nullable=False)


class StageCard(Base):
    """어떤 스테이지에서 어떤 카드를 배우는지 (N:M 연결)"""
    __tablename__ = "stage_cards"

    stage_id = Column(Integer, ForeignKey("stages.id"), primary_key=True)
    card_id = Column(Integer, ForeignKey("cards.id"), primary_key=True)
    order_no = Column(Integer, default=0)                # 스테이지 안 순서


# 학습 기록 / 도감
class StageProgress(Base):
    """사용자별 스테이지 결과. 섬 색: 90 이상 초록, 70 이상 주황, 그 외 흰색"""
    __tablename__ = "stage_progress"
    __table_args__ = (UniqueConstraint("user_id", "stage_id"),)

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    stage_id = Column(Integer, ForeignKey("stages.id"), nullable=False)
    best_accuracy = Column(Float, default=0, nullable=False)   # 최고 정확도(%)
    rewarded = Column(Boolean, default=False, nullable=False)  # +100 코인 지급 여부 (중복 지급 방지)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class UserCard(Base):
    """도감(마법서): 정확도 90% 이상 달성한 카드가 등록됨"""
    __tablename__ = "user_cards"
    __table_args__ = (UniqueConstraint("user_id", "card_id"),)

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    card_id = Column(Integer, ForeignKey("cards.id"), nullable=False)
    best_accuracy = Column(Float, default=0, nullable=False)
    collected_at = Column(DateTime, server_default=func.now())


# 상점 / 꾸미기
class Item(Base):
    """상점에서 파는 꾸미기 아이템"""
    __tablename__ = "items"

    id = Column(Integer, primary_key=True)
    category = Column(String(10), nullable=False)        # 'hat' | 'top' | 'bottom'
    name = Column(String(50), nullable=False)
    price = Column(Integer, nullable=False)              # 핸드코인
    image_url = Column(String(255))


class UserItem(Base):
    """사용자가 산 아이템. equipped=True면 장착 중 (카테고리별 1개는 API에서 보장)"""
    __tablename__ = "user_items"
    __table_args__ = (UniqueConstraint("user_id", "item_id"),)

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    item_id = Column(Integer, ForeignKey("items.id"), nullable=False)
    equipped = Column(Boolean, default=False, nullable=False)


# 마법 대결 (카드게임)
class GameRoom(Base):
    """게임 방. 방장이 만들고 7자리 코드로 입장"""
    __tablename__ = "game_rooms"

    id = Column(Integer, primary_key=True)
    code = Column(String(7), unique=True, nullable=False)     # 알파벳 7자리
    host_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    max_players = Column(Integer, default=2, nullable=False)  # 2~20
    card_kind = Column(String(10), nullable=False)            # 'word' | 'sentence'
    question_count = Column(Integer, nullable=False)          # 5 | 10 | 15 | 20
    time_limit = Column(Integer, nullable=False)              # 초: 10 | 20 | 30 | 60
    status = Column(String(10), default="waiting", nullable=False)  # waiting | playing | finished
    created_at = Column(DateTime, server_default=func.now())
    started_at = Column(DateTime)                                      # 게임 시작 시각 (문제 진행 계산의 기준)


class RoomTheme(Base):
    """방에서 고른 테마들 (여러 개 선택 가능)"""
    __tablename__ = "room_themes"

    room_id = Column(Integer, ForeignKey("game_rooms.id"), primary_key=True)
    theme_id = Column(Integer, ForeignKey("themes.id"), primary_key=True)


class RoomPlayer(Base):
    """방 참여자와 점수. 결과 팝업의 순위는 score 내림차순으로 계산"""
    __tablename__ = "room_players"
    __table_args__ = (UniqueConstraint("room_id", "user_id"),)

    id = Column(Integer, primary_key=True)
    room_id = Column(Integer, ForeignKey("game_rooms.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    score = Column(Integer, default=0, nullable=False)


class RoomQuestion(Base):
    """방에서 출제된 문제(카드)와 가장 먼저 맞힌 사람. 게임 시작 시 한 번에 정해짐"""
    __tablename__ = "room_questions"
    __table_args__ = (UniqueConstraint("room_id", "order_no"),)

    id = Column(Integer, primary_key=True)
    room_id = Column(Integer, ForeignKey("game_rooms.id"), nullable=False)
    order_no = Column(Integer, nullable=False)                 # 0부터 시작
    card_id = Column(Integer, ForeignKey("cards.id"), nullable=False)
    winner_id = Column(Integer, ForeignKey("users.id"))        # 가장 먼저 맞힌 사람 (없으면 null)
    winner_accuracy = Column(Float)
