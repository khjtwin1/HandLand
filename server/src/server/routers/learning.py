from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from server.database import get_db
from server.game_rules import (
    CLEAR_AT, COINS_PER_CLEAR, COLLECT_AT, XP_PER_CLEAR,
    island_status, level_from_xp,
)
from server.models import Card, Stage, StageCard, StageProgress, Theme, User, UserCard
from server.security import get_current_user

router = APIRouter(prefix="/learning", tags=["learning"])

# 공통 함수
def stages_with_state(db: Session, user: User, theme_id: int) -> list[dict]:
    """테마의 스테이지 목록 + 내 최고 정확도, 섬 색, 잠김 여부"""
    stages = db.query(Stage).filter_by(theme_id=theme_id).order_by(Stage.chapter_no).all()
    rows = (
        db.query(StageProgress)
        .filter(StageProgress.user_id == user.id,
                StageProgress.stage_id.in_([s.id for s in stages]))
        .all()
        if stages else []
    )
    best_by_stage = {r.stage_id: r.best_accuracy for r in rows}

    result = []
    prev_cleared = True  # 1챕터는 항상 열려 있음
    for s in stages:
        best = best_by_stage.get(s.id, 0.0)
        result.append({
            "id": s.id,
            "chapter_no": s.chapter_no,
            "kind": s.kind,
            "title": s.title,
            "best_accuracy": best,
            "status": island_status(best),     # white / orange / green
            "locked": not prev_cleared,        # 이전 스테이지를 클리어해야 열림
        })
        prev_cleared = best >= CLEAR_AT
    return result


def get_open_stage(db: Session, user: User, stage_id: int) -> Stage:
    """스테이지를 가져옴. 없으면 404, 잠겨 있으면 403"""
    stage = db.get(Stage, stage_id)
    if stage is None:
        raise HTTPException(status_code=404, detail="존재하지 않는 스테이지예요")
    state = next(s for s in stages_with_state(db, user, stage.theme_id) if s["id"] == stage_id)
    if state["locked"]:
        raise HTTPException(status_code=403, detail="이전 스테이지를 먼저 클리어해야 해요")
    return stage


# 테마 선택 화면
@router.get("/themes")
def list_themes(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """테마 카드 목록 + 테마별 진행도"""
    result = []
    for t in db.query(Theme).order_by(Theme.id).all():
        stages = stages_with_state(db, user, t.id)
        cleared = sum(1 for s in stages if s["best_accuracy"] >= CLEAR_AT)
        result.append({"id": t.id, "name": t.name, "cleared": cleared, "total": len(stages)})
    return result


# 스테이지 맵 화면
@router.get("/themes/{theme_id}/stages")
def theme_stages(theme_id: int, db: Session = Depends(get_db),
                 user: User = Depends(get_current_user)):
    """섬 목록: 섬 색(status), 잠김(locked), 최고 정확도"""
    if db.get(Theme, theme_id) is None:
        raise HTTPException(status_code=404, detail="존재하지 않는 테마예요")
    return stages_with_state(db, user, theme_id)


# 스테이지 안 화면
@router.get("/stages/{stage_id}")
def stage_detail(stage_id: int, db: Session = Depends(get_db),
                 user: User = Depends(get_current_user)):
    """스테이지에서 배울 카드 목록 (순서대로)"""
    stage = get_open_stage(db, user, stage_id)
    cards = (
        db.query(Card)
        .join(StageCard, StageCard.card_id == Card.id)
        .filter(StageCard.stage_id == stage_id)
        .order_by(StageCard.order_no)
        .all()
    )
    return {
        "id": stage.id,
        "title": stage.title,
        "kind": stage.kind,
        "cards": [{"id": c.id, "kind": c.kind, "text": c.text, "video_url": c.video_url}
                  for c in cards],
    }


class CardResult(BaseModel):
    card_id: int
    accuracy: float = Field(ge=0, le=100)   # 그 카드를 하는 동안의 최고 정확도(%)


class StageResultRequest(BaseModel):
    results: list[CardResult] = Field(min_length=1)


# 스테이지 클리어(결과 제출)
@router.post("/stages/{stage_id}/result")
def submit_result(stage_id: int, body: StageResultRequest,
                  db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """
    카드별 정확도를 받아 스테이지 결과를 처리한다.
    - 스테이지 정확도 = 카드 정확도의 평균 (안 한 카드는 0점)
    - 최고 기록 갱신 (섬 색이 바뀜)
    - 처음 클리어하면 핸드코인 + 경험치(레벨) 지급 (중복 지급 방지)
    - 정확도 COLLECT_AT 이상인 카드는 도감에 등록
    """
    get_open_stage(db, user, stage_id)

    card_ids = [sc.card_id for sc in db.query(StageCard).filter_by(stage_id=stage_id).all()]
    if not card_ids:
        raise HTTPException(status_code=400, detail="카드가 없는 스테이지예요")

    # 카드별 정확도 정리(같은 카드가 여러 번 오면 높은 값)
    acc_by_card: dict[int, float] = {}
    for r in body.results:
        if r.card_id not in card_ids:
            raise HTTPException(status_code=400, detail=f"이 스테이지의 카드가 아니에요: {r.card_id}")
        acc_by_card[r.card_id] = max(acc_by_card.get(r.card_id, 0.0), r.accuracy)
    stage_acc = round(sum(acc_by_card.get(cid, 0.0) for cid in card_ids) / len(card_ids), 1)

    # 스테이지 기록 갱신
    progress = db.query(StageProgress).filter_by(user_id=user.id, stage_id=stage_id).first()
    if progress is None:
        progress = StageProgress(user_id=user.id, stage_id=stage_id,
                                 best_accuracy=0.0, rewarded=False)
        db.add(progress)
    progress.best_accuracy = max(progress.best_accuracy, stage_acc)

    # 첫 클리어 보상
    cleared = stage_acc >= CLEAR_AT
    first_clear = cleared and not progress.rewarded
    coins_earned = 0
    if first_clear:
        progress.rewarded = True
        coins_earned = COINS_PER_CLEAR
        user.coins += coins_earned
        user.xp += XP_PER_CLEAR
        user.level = level_from_xp(user.xp)

    # 도감 등록
    cards = {c.id: c for c in db.query(Card).filter(Card.id.in_(card_ids)).all()}
    new_cards = []
    for cid, acc in acc_by_card.items():
        if acc < COLLECT_AT:
            continue
        owned = db.query(UserCard).filter_by(user_id=user.id, card_id=cid).first()
        if owned is None:
            db.add(UserCard(user_id=user.id, card_id=cid, best_accuracy=acc))
            new_cards.append({"id": cid, "text": cards[cid].text})
        elif acc > owned.best_accuracy:
            owned.best_accuracy = acc

    db.commit()
    return {
        "stage_accuracy": stage_acc,
        "status": island_status(stage_acc),         # 이번 결과 섬 색
        "best_accuracy": progress.best_accuracy,
        "cleared": cleared,
        "first_clear": first_clear,                 # True일 때만 클리어 팝업 보상
        "coins_earned": coins_earned,
        "total_coins": user.coins,
        "level": user.level,
        "new_cards": new_cards,                     # 도감에 새로 등록된 카드
    }


# 도감 화면
@router.get("/collection")
def collection(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """도감(마법서): 전체 카드와 내가 수집한 카드. collected=False면 실루엣으로 표시"""
    owned = {uc.card_id: uc.best_accuracy
             for uc in db.query(UserCard).filter_by(user_id=user.id).all()}
    cards = db.query(Card).order_by(Card.kind, Card.id).all()
    return {
        "collected": len(owned),
        "total": len(cards),
        "cards": [{
            "id": c.id, "kind": c.kind, "text": c.text,
            "collected": c.id in owned,
            "best_accuracy": owned.get(c.id),
        } for c in cards],
    }
