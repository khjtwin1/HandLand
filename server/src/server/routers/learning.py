import csv
import io
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from server.database import get_db
from server.game_rules import (
    CLEAR_AT, COINS_PER_CLEAR, COLLECT_AT, XP_PER_CLEAR,
    island_status, level_from_xp,
)
from server.hangul import name_to_jamo
from server.models import (
    Card, LearningRecord, Stage, StageCard, StageProgress, StudySession, Theme, User, UserCard,
)
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


def quest_cards(db: Session, user: User, stage: Stage) -> list[Card]:
    """이름 퀘스트 문제: 내 이름을 자모로 쪼갠 순서대로 지문자 카드를 돌려줌 (같은 자모는 반복)"""
    by_text = {c.text: c for c in
               db.query(Card).filter_by(theme_id=stage.theme_id, kind="letter").all()}
    return [by_text[j] for j in name_to_jamo(user.name) if j in by_text]


def stage_cards(db: Session, user: User, stage: Stage) -> list[Card]:
    """스테이지에서 배울 카드 (퀘스트는 이름 자모, 나머지는 연결된 카드)"""
    if stage.kind == "quest":
        return quest_cards(db, user, stage)
    return (
        db.query(Card)
        .join(StageCard, StageCard.card_id == Card.id)
        .filter(StageCard.stage_id == stage.id)
        .order_by(StageCard.order_no)
        .all()
    )


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
    cards = stage_cards(db, user, stage)
    if stage.kind == "quest" and not cards:
        raise HTTPException(status_code=400, detail="이름에서 한글 자모를 찾지 못했어요")
    return {
        "id": stage.id,
        "title": stage.title,
        "kind": stage.kind,
        "description": stage.description,
        "chapter_no": stage.chapter_no,
        "theme_name": db.get(Theme, stage.theme_id).name,
        "quest_name": user.name if stage.kind == "quest" else None,
        "cards": [{"id": c.id, "kind": c.kind, "text": c.text, "video_url": c.video_url,
                   "image_url": c.image_url, "description": c.description}
                  for c in cards],
    }


class CardResult(BaseModel):
    card_id: int
    accuracy: float = Field(ge=0, le=100)   # 그 카드를 하는 동안의 최고 정확도(%)


class StageResultRequest(BaseModel):
    results: list[CardResult] = Field(min_length=1)
    duration_seconds: int = Field(default=0, ge=0, le=86400)   # 스테이지를 푼 시간(초)


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
    stage = get_open_stage(db, user, stage_id)

    # 퀘스트는 같은 자모가 반복되므로 중복 없이 센다
    card_ids = list(dict.fromkeys(c.id for c in stage_cards(db, user, stage)))
    if not card_ids:
        raise HTTPException(status_code=400, detail="카드가 없는 스테이지예요")

    # 카드별 정확도 정리(같은 카드가 여러 번 오면 높은 값)
    acc_by_card: dict[int, float] = {}
    for r in body.results:
        if r.card_id not in card_ids:
            raise HTTPException(status_code=400, detail=f"이 스테이지의 카드가 아니에요: {r.card_id}")
        acc_by_card[r.card_id] = max(acc_by_card.get(r.card_id, 0.0), r.accuracy)
    stage_acc = round(sum(acc_by_card.get(cid, 0.0) for cid in card_ids) / len(card_ids), 1)

    # 카드별 학습 기록 저장 (홈 화면의 최근 기록, 다시 연습할 동작)
    for cid, acc in acc_by_card.items():
        db.add(LearningRecord(user_id=user.id, card_id=cid, stage_id=stage_id, accuracy=acc))

    # 학습 시간 기록 (학습 리포트)
    if body.duration_seconds > 0:
        db.add(StudySession(user_id=user.id, stage_id=stage_id, seconds=body.duration_seconds))

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


# 홈 화면
@router.get("/home")
def home(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """
    홈 화면에 필요한 정보를 한 번에 돌려준다.
    continue: 이어서 학습할 스테이지 (모두 클리어했으면 null)
    flags: 깃발 = 클리어한 스테이지 수, to_next = 이어서 학습할 스테이지에서 70% 미만인 카드 수
    themes: 대륙(테마)별 학습한 단어 수와 상태 (in_progress | started | not_started | done | locked | coming_soon)
    recent: 최근 학습 기록 3개, weak: 마지막 정확도가 낮은 카드 3개
    """
    records = (
        db.query(LearningRecord).filter_by(user_id=user.id)
        .order_by(LearningRecord.created_at.desc(), LearningRecord.id.desc()).all()
    )
    learned_ids = {r.card_id for r in records}
    best_by_card: dict[int, float] = {}
    for r in records:
        best_by_card[r.card_id] = max(best_by_card.get(r.card_id, 0.0), r.accuracy)

    # 테마별 진행도 + 이어서 학습할 스테이지 찾기
    summaries = []
    next_stage = None
    earned = 0
    prev_done = True  # 첫 테마는 항상 열려 있음
    for t in db.query(Theme).order_by(Theme.id).all():
        stages = stages_with_state(db, user, t.id)
        cleared = sum(1 for s in stages if s["best_accuracy"] >= CLEAR_AT)
        earned += cleared
        card_ids = [cid for (cid,) in db.query(Card.id).filter_by(theme_id=t.id).all()]
        done = len(stages) > 0 and cleared == len(stages)

        candidate = next((s for s in stages if s["best_accuracy"] < CLEAR_AT and not s["locked"]), None)
        if next_stage is None and candidate is not None and prev_done:
            next_stage = (t, candidate)

        summaries.append({
            "id": t.id, "name": t.name,
            "learned": len(learned_ids & set(card_ids)), "total": len(card_ids),
            "done": done, "locked": not prev_done, "ready": len(stages) > 0,
        })
        prev_done = done

    themes = []
    for s in summaries:
        if not s["ready"]:
            status = "coming_soon"
        elif s["locked"]:
            status = "locked"
        elif next_stage and next_stage[0].id == s["id"]:
            status = "in_progress"
        elif s["done"]:
            status = "done"
        elif s["learned"] > 0:
            status = "started"
        else:
            status = "not_started"
        themes.append({"id": s["id"], "name": s["name"],
                       "learned": s["learned"], "total": s["total"], "status": status})

    # 이어서 학습하기 + 다음 깃발까지
    continue_info, to_next = None, 0
    if next_stage:
        theme, stage = next_stage
        current = next(s for s in summaries if s["id"] == theme.id)
        stage_card_ids = [sc.card_id for sc in db.query(StageCard).filter_by(stage_id=stage["id"]).all()]
        to_next = max(1, sum(1 for cid in stage_card_ids if best_by_card.get(cid, 0.0) < CLEAR_AT))
        continue_info = {
            "stage_id": stage["id"], "theme_id": theme.id, "theme_name": theme.name,
            "chapter_no": stage["chapter_no"], "title": stage["title"],
            "learned_words": current["learned"], "total_words": current["total"],
        }

    # 최근 학습 기록 / 다시 연습할 동작 (카드별 마지막 정확도가 낮은 순)
    latest_by_card: dict[int, LearningRecord] = {}
    for r in records:
        latest_by_card.setdefault(r.card_id, r)
    weak_records = sorted(latest_by_card.values(), key=lambda r: r.accuracy)[:3]
    recent_records = records[:3]

    need_cards = {r.card_id for r in recent_records + weak_records}
    need_stages = {r.stage_id for r in recent_records + weak_records}
    cards = {c.id: c for c in db.query(Card).filter(Card.id.in_(need_cards)).all()} if need_cards else {}
    stage_map = {s.id: s for s in db.query(Stage).filter(Stage.id.in_(need_stages)).all()} if need_stages else {}

    return {
        "continue": continue_info,
        "flags": {"earned": earned, "to_next": to_next},
        "themes": themes,
        "recent": [{
            "card_id": r.card_id, "text": cards[r.card_id].text,
            "chapter_no": stage_map[r.stage_id].chapter_no, "accuracy": r.accuracy,
        } for r in recent_records],
        "weak": [{
            "card_id": r.card_id, "text": cards[r.card_id].text,
            "stage_id": r.stage_id, "accuracy": r.accuracy,
        } for r in weak_records],
    }


# 탐험 지도 화면
@router.get("/map")
def explore_map(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """
    탐험 지도에 필요한 정보를 한 번에 돌려준다.
    flags: 깃발 = 클리어한 스테이지 수 / 전체 스테이지 수
    continents: 대륙(테마)별 스테이지 목록
      - ready: False면 아직 준비 중인 대륙 / locked: 이전 대륙을 클리어해야 열림
      - stage.status: cleared | current | waiting | locked
      - stage.words: 스테이지 단어 목록과 상태 (done | in_progress | waiting)
    current_stage_id: 지금 이어서 학습할 스테이지
    """
    records = (
        db.query(LearningRecord).filter_by(user_id=user.id)
        .order_by(LearningRecord.created_at.desc(), LearningRecord.id.desc()).all()
    )
    latest_by_card: dict[int, float] = {}
    for r in records:
        latest_by_card.setdefault(r.card_id, r.accuracy)

    continents = []
    earned = total = 0
    current_stage_id = None
    prev_done = True  # 첫 대륙은 항상 열려 있음
    for t in db.query(Theme).order_by(Theme.id).all():
        stages = stages_with_state(db, user, t.id)
        cleared = sum(1 for s in stages if s["best_accuracy"] >= CLEAR_AT)
        earned += cleared
        total += len(stages)
        locked = not prev_done

        items = []
        for s in stages:
            stage = db.get(Stage, s["id"])
            is_cleared = s["best_accuracy"] >= CLEAR_AT
            is_current = (current_stage_id is None and not locked
                          and not s["locked"] and not is_cleared)
            if is_current:
                current_stage_id = s["id"]
            if is_cleared:
                status = "cleared"
            elif s["locked"] or locked:
                status = "locked"
            else:
                status = "current" if is_current else "waiting"

            # 단어 상태: 마지막 정확도가 기준 이상이면 완료, 아직 안 한 첫 단어가 진행중
            words, found_current = [], False
            for c in dict.fromkeys(stage_cards(db, user, stage)):
                if latest_by_card.get(c.id, 0.0) >= CLEAR_AT:
                    state = "done"
                elif status in ("current", "waiting") and not found_current:
                    state, found_current = "in_progress", True
                else:
                    state = "waiting"
                words.append({"card_id": c.id, "text": c.text, "state": state})

            items.append({**s, "description": stage.description, "status": status,
                          "locked": s["locked"] or locked, "words": words})

        continents.append({
            "id": t.id, "name": t.name, "ready": len(stages) > 0, "locked": locked,
            "cleared": cleared, "total": len(stages), "stages": items,
        })
        prev_done = len(stages) > 0 and cleared == len(stages)

    return {"flags": {"earned": earned, "total": total},
            "continents": continents, "current_stage_id": current_stage_id}


# 학습 리포트 화면
def _avg(values: list[float]) -> float | None:
    return round(sum(values) / len(values), 1) if values else None


@router.get("/report")
def report(period: str = Query(default="week", pattern="^(week|month)$"),
           db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """
    학습 리포트: 클리어 스테이지, 평균 일치도, 누적 학습 시간, 획득 깃발, 일치도 추이, 다시 연습할 동작
    period: week(최근 8주, 7일 단위) | month(최근 8개월, 30일 단위)
    """
    now = datetime.now()
    span = 7 if period == "week" else 30
    records = (
        db.query(LearningRecord).filter_by(user_id=user.id)
        .order_by(LearningRecord.created_at.desc(), LearningRecord.id.desc()).all()
    )

    # 일치도 추이: 구간별 평균 (기록이 없는 구간은 null)
    trend = []
    for i in range(8):
        start = now - timedelta(days=span * (8 - i))
        end = now - timedelta(days=span * (7 - i))
        accs = [r.accuracy for r in records if r.created_at and start <= r.created_at < end]
        label = ("이번 주" if period == "week" else "이번 달") if i == 7 else f"{start.month}/{start.day}"
        trend.append({"label": label, "accuracy": _avg(accs)})
    filled = [t["accuracy"] for t in trend if t["accuracy"] is not None]

    # 클리어 스테이지 / 깃발
    progress = db.query(StageProgress).filter_by(user_id=user.id).all()
    cleared_rows = [p for p in progress if p.best_accuracy >= CLEAR_AT]
    week_ago = now - timedelta(days=7)
    cleared_this_week = sum(1 for p in cleared_rows if p.updated_at and p.updated_at >= week_ago)

    # 평균 일치도 (이번 7일 / 지난 7일)
    recent = [r.accuracy for r in records if r.created_at and r.created_at >= week_ago]
    before = [r.accuracy for r in records
              if r.created_at and week_ago - timedelta(days=7) <= r.created_at < week_ago]
    avg_now, avg_before = _avg(recent), _avg(before)

    # 누적 학습 시간
    sessions = db.query(StudySession).filter_by(user_id=user.id).all()
    total_seconds = sum(s.seconds for s in sessions)
    first = min((s.created_at for s in sessions if s.created_at), default=now)
    weeks = max(1, (now - first).days // 7 + 1)

    # 다음 깃발까지 남은 스테이지 (지금 하는 대륙 기준)
    to_next = 0
    for t in db.query(Theme).order_by(Theme.id).all():
        stages = stages_with_state(db, user, t.id)
        left = sum(1 for s in stages if s["best_accuracy"] < CLEAR_AT)
        if stages and left:
            to_next = left
            break

    # 다시 연습할 동작: 카드별 마지막 정확도가 낮은 순
    latest: dict[int, LearningRecord] = {}
    for r in records:
        latest.setdefault(r.card_id, r)
    weak = sorted(latest.values(), key=lambda r: r.accuracy)[:3]
    cards = {c.id: c for c in db.query(Card).filter(Card.id.in_([r.card_id for r in weak])).all()} if weak else {}

    return {
        "period": period,
        "base_date": now.strftime("%Y-%m-%d"),
        "summary": {
            "cleared_stages": len(cleared_rows), "cleared_this_week": cleared_this_week,
            "avg_accuracy": avg_now,
            "avg_accuracy_delta": round(avg_now - avg_before, 1) if avg_now is not None and avg_before is not None else None,
            "study_minutes": total_seconds // 60, "study_minutes_per_week": total_seconds // 60 // weeks,
            "flags": len(cleared_rows), "stages_to_next_flag": to_next,
        },
        "trend": trend,
        "trend_from": filled[0] if filled else None,
        "trend_to": filled[-1] if filled else None,
        "weak": [{"card_id": r.card_id, "text": cards[r.card_id].text,
                  "stage_id": r.stage_id, "accuracy": r.accuracy} for r in weak],
    }


@router.get("/report.csv")
def report_csv(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """내 학습 기록을 CSV로 내려받기 (엑셀에서 한글이 깨지지 않도록 BOM 포함)"""
    rows = (
        db.query(LearningRecord, Card, Stage)
        .join(Card, Card.id == LearningRecord.card_id)
        .join(Stage, Stage.id == LearningRecord.stage_id)
        .filter(LearningRecord.user_id == user.id)
        .order_by(LearningRecord.created_at, LearningRecord.id)
        .all()
    )
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["날짜", "스테이지", "카드", "정확도(%)"])
    for rec, card, stage in rows:
        writer.writerow([rec.created_at.strftime("%Y-%m-%d %H:%M") if rec.created_at else "",
                         stage.title, card.text, rec.accuracy])
    # TODO: 기관 관리자가 학생별 리포트를 내려받는 기능
    return Response(
        content="﻿" + buf.getvalue(), media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="handland_report.csv"'},
    )
