import math
import random
import string
from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from server.database import get_db
from server.room_rules import (
    COUNTDOWN_SECONDS, MIN_PLAYERS_TO_START, POINTS_PER_WIN, ROOM_WIN_AT, RULES_SECONDS,
    WIN_PAUSE_SECONDS,
)
from server.models import Card, GameRoom, RoomPlayer, RoomQuestion, RoomTheme, Theme, User
from server.security import get_current_user

router = APIRouter(prefix="/rooms", tags=["rooms"])

# 공통 함수
def now_utc() -> datetime:
    """DB의 started_at과 비교하기 위한 UTC 현재 시각 (timezone 정보 없는 형태)"""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def get_room(db: Session, code: str) -> GameRoom:
    room = db.query(GameRoom).filter_by(code=code.strip().upper()).first()
    if room is None:
        raise HTTPException(status_code=404, detail="존재하지 않는 방이에요")
    return room


def get_player(db: Session, room: GameRoom, user: User) -> RoomPlayer:
    player = db.query(RoomPlayer).filter_by(room_id=room.id, user_id=user.id).first()
    if player is None:
        raise HTTPException(status_code=403, detail="이 방의 참여자가 아니에요")
    return player


def timeline(room: GameRoom) -> dict:
    """
    게임 시작 시각(started_at)으로 현재 단계 계산.
    waiting -> rules -> countdown -> question → finished
    """
    if room.status == "waiting" or room.started_at is None:
        return {"phase": "waiting"}

    elapsed = (now_utc() - room.started_at).total_seconds()
    if elapsed < RULES_SECONDS:
        return {"phase": "rules", "remaining": math.ceil(RULES_SECONDS - elapsed)}

    elapsed -= RULES_SECONDS
    if elapsed < COUNTDOWN_SECONDS:
        return {"phase": "countdown", "remaining": math.ceil(COUNTDOWN_SECONDS - elapsed)}

    elapsed -= COUNTDOWN_SECONDS
    if elapsed >= room.question_count * room.time_limit:
        return {"phase": "finished"}

    index = int(elapsed // room.time_limit)
    remaining = math.ceil(room.time_limit - (elapsed - index * room.time_limit))
    return {"phase": "question", "index": index, "remaining": remaining}


def current_timeline(db: Session, room: GameRoom) -> dict:
    """timeline 계산, 끝났을 시 방 상태를 finished로"""
    tl = timeline(room)
    if tl["phase"] == "finished" and room.status != "finished":
        room.status = "finished"
        db.commit()
    return tl


def room_state(db: Session, room: GameRoom, user: User) -> dict:
    """대기실, 규칙 안내, 문제 화면, 결과 화면"""
    tl = current_timeline(db, room)

    rows = (
        db.query(RoomPlayer, User)
        .join(User, User.id == RoomPlayer.user_id)
        .filter(RoomPlayer.room_id == room.id)
        .order_by(RoomPlayer.id)
        .all()
    )
    players = [{
        "user_id": u.id, "name": u.name, "level": u.level,
        "is_host": u.id == room.host_id, "score": p.score,
    } for p, u in rows]

    theme_names = [n for (n,) in (
        db.query(Theme.name)
        .join(RoomTheme, RoomTheme.theme_id == Theme.id)
        .filter(RoomTheme.room_id == room.id).all()
    )]

    state = {
        "code": room.code,
        "status": room.status,              # waiting | playing | finished
        "phase": tl["phase"],               # waiting | rules | countdown | question | finished
        "remaining": tl.get("remaining"),   # 현재 단계의 남은 초
        "is_host": room.host_id == user.id,
        "settings": {
            "max_players": room.max_players, "card_kind": room.card_kind,
            "question_count": room.question_count, "time_limit": room.time_limit,
            "themes": theme_names,
        },
        "player_count": len(players),
        "players": players,
    }

    if tl["phase"] == "question":
        q = db.query(RoomQuestion).filter_by(room_id=room.id, order_no=tl["index"]).first()
        card = db.get(Card, q.card_id)
        winner = None
        if q.winner_id is not None:
            winner = next(({"user_id": p["user_id"], "name": p["name"]}
                           for p in players if p["user_id"] == q.winner_id), None)
        state["question"] = {
            "number": tl["index"] + 1, "total": room.question_count,
            "card": {"id": card.id, "kind": card.kind, "text": card.text, "video_url": card.video_url},
            "winner": winner,               # 이미 누가 맞혔으면 표시
        }

    if tl["phase"] == "finished":
        ranked = sorted(players, key=lambda p: -p["score"])
        ranking, rank, prev = [], 0, None
        for i, p in enumerate(ranked, start=1):
            if p["score"] != prev:          # 점수가 같을 시 같은 순위
                rank, prev = i, p["score"]
            ranking.append({**p, "rank": rank})
        state["ranking"] = ranking
    return state


def new_code(db: Session) -> str:
    """알파벳 대문자 7자리 방 코드"""
    for _ in range(20):
        code = "".join(random.choices(string.ascii_uppercase, k=7))
        if db.query(GameRoom).filter_by(code=code).first() is None:
            return code
    raise HTTPException(status_code=500, detail="방 코드를 만들지 못했어요. 다시 시도해 주세요")


# 방 만들기
class CreateRoomRequest(BaseModel):
    max_players: int = Field(ge=2, le=20)
    card_kind: Literal["letter", "word", "sentence"]
    question_count: Literal[5, 10, 15, 20]
    time_limit: Literal[10, 20, 30, 60]
    theme_ids: list[int] = Field(min_length=1)


@router.post("", status_code=201)
def create_room(body: CreateRoomRequest, db: Session = Depends(get_db),
                user: User = Depends(get_current_user)):
    theme_ids = set(body.theme_ids)
    if db.query(Theme).filter(Theme.id.in_(theme_ids)).count() != len(theme_ids):
        raise HTTPException(status_code=400, detail="존재하지 않는 테마가 있어요")
    if db.query(Card).filter(Card.theme_id.in_(theme_ids), Card.kind == body.card_kind).count() == 0:
        raise HTTPException(status_code=400, detail="선택한 테마에 해당 종류의 카드가 없어요")

    room = GameRoom(
        code=new_code(db), host_id=user.id, max_players=body.max_players,
        card_kind=body.card_kind, question_count=body.question_count,
        time_limit=body.time_limit, status="waiting",
    )
    db.add(room)
    db.flush()                                              # 방 id 정함
    for tid in theme_ids:
        db.add(RoomTheme(room_id=room.id, theme_id=tid))
    db.add(RoomPlayer(room_id=room.id, user_id=user.id))    # 방장도 참여자
    db.commit()
    db.refresh(room)
    return room_state(db, room, user)


# 방 코드로 입장
class JoinRequest(BaseModel):
    code: str = Field(min_length=1, max_length=7)


@router.post("/join")
def join_room(body: JoinRequest, db: Session = Depends(get_db),
              user: User = Depends(get_current_user)):
    room = get_room(db, body.code)
    already = db.query(RoomPlayer).filter_by(room_id=room.id, user_id=user.id).first()
    if already is None:
        if room.status != "waiting":
            raise HTTPException(status_code=400, detail="이미 시작된 방이에요")
        count = db.query(RoomPlayer).filter_by(room_id=room.id).count()
        if count >= room.max_players:
            raise HTTPException(status_code=409, detail="방이 가득 찼어요")
        db.add(RoomPlayer(room_id=room.id, user_id=user.id))
        db.commit()
    return room_state(db, room, user)


# 대기실 / 게임 진행 / 결과: 상태 조회
@router.get("/{code}")
def get_state(code: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    room = get_room(db, code)
    get_player(db, room, user)
    return room_state(db, room, user)


# 게임 시작(방장만)
@router.post("/{code}/start")
def start_game(code: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    room = get_room(db, code)
    get_player(db, room, user)
    if room.host_id != user.id:
        raise HTTPException(status_code=403, detail="방장만 게임을 시작할 수 있어요")
    if room.status != "waiting":
        raise HTTPException(status_code=400, detail="이미 시작된 방이에요")
    if db.query(RoomPlayer).filter_by(room_id=room.id).count() < MIN_PLAYERS_TO_START:
        raise HTTPException(status_code=400, detail="참여자가 부족해요")

    # 문제 정하기: 선택한 테마의 카드를 섞어서 문제 개수만큼 (모자라면 다시 섞어 이어 붙임)
    theme_ids = [rt.theme_id for rt in db.query(RoomTheme).filter_by(room_id=room.id).all()]
    cards = db.query(Card).filter(Card.theme_id.in_(theme_ids), Card.kind == room.card_kind).all()
    order: list[Card] = []
    while len(order) < room.question_count:
        batch = cards[:]
        random.shuffle(batch)
        order.extend(batch)
    for i, card in enumerate(order[:room.question_count]):
        db.add(RoomQuestion(room_id=room.id, order_no=i, card_id=card.id))

    room.status = "playing"
    room.started_at = now_utc()
    db.commit()
    db.refresh(room)
    return room_state(db, room, user)


# 정답 제출: 가장 먼저 맞힌 사람이 점수 획득
class AnswerRequest(BaseModel):
    accuracy: float = Field(ge=0, le=100)   # 현재 문제 카드에 대한 내 정확도(%)


@router.post("/{code}/answer")
def submit_answer(code: str, body: AnswerRequest, db: Session = Depends(get_db),
                  user: User = Depends(get_current_user)):
    room = get_room(db, code)
    player = get_player(db, room, user)
    tl = current_timeline(db, room)
    if tl["phase"] != "question":
        raise HTTPException(status_code=400, detail="지금은 답을 낼 수 없어요")

    q = db.query(RoomQuestion).filter_by(room_id=room.id, order_no=tl["index"]).first()
    if q.winner_id is not None:
        return {"accepted": False, "reason": "already_won"}         # 다른 사람이 먼저 맞힘
    if body.accuracy < ROOM_WIN_AT:
        return {"accepted": False, "reason": "low_accuracy"}        # 정확도 부족

    # 동시에 맞혀도 winner_id가 비어 있을 때만 바꿔서 한 명만 이기도록
    updated = (
        db.query(RoomQuestion)
        .filter(RoomQuestion.id == q.id, RoomQuestion.winner_id.is_(None))
        .update({"winner_id": user.id, "winner_accuracy": body.accuracy}, synchronize_session=False)
    )
    if updated == 0:
        db.rollback()
        return {"accepted": False, "reason": "already_won"}

    player.score += POINTS_PER_WIN

    # 누가 맞히면 남은 시간을 건너뛰어 바로 다음 문제로:
    # 시작 시각을 앞당기면 모든 참여자의 현재 단계가 함께 넘어간다 (결과 확인용으로 WIN_PAUSE_SECONDS 는 남김)
    in_question = (now_utc() - room.started_at).total_seconds() - RULES_SECONDS - COUNTDOWN_SECONDS
    left = room.time_limit - (in_question - tl["index"] * room.time_limit)
    if left > WIN_PAUSE_SECONDS:
        room.started_at -= timedelta(seconds=left - WIN_PAUSE_SECONDS)

    db.commit()
    return {"accepted": True, "points": POINTS_PER_WIN, "score": player.score}


# 나가기
@router.post("/{code}/leave")
def leave_room(code: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    room = get_room(db, code)
    player = get_player(db, room, user)
    if room.status != "waiting":
        return {"left": False, "message": "게임이 시작된 뒤에는 기록이 남아요"}

    if room.host_id == user.id:     # 방장이 나가면 대기 중인 방 닫힘
        db.query(RoomPlayer).filter_by(room_id=room.id).delete()
        db.query(RoomTheme).filter_by(room_id=room.id).delete()
        db.delete(room)
        db.commit()
        return {"left": True, "room_closed": True}

    db.delete(player)
    db.commit()
    return {"left": True, "room_closed": False}
