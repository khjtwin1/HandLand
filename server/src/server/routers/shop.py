from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from server.database import get_db
from server.models import Item, User, UserItem
from server.security import get_current_user

# 꾸미기 아이템 카테고리 (캐릭터 모자 / 상의 / 바지)
CATEGORIES = ("hat", "top", "bottom")

shop_router = APIRouter(prefix="/shop", tags=["shop"])
closet_router = APIRouter(prefix="/closet", tags=["closet"])


def item_dict(item: Item) -> dict:
    return {"id": item.id, "category": item.category, "name": item.name,
            "price": item.price, "image_url": item.image_url}


# 꾸미기 상점 화면
@shop_router.get("/items")
def shop_items(category: str | None = Query(default=None),
               db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """
    상점 상품 목록. 카테고리 탭: ?category=hat | top | bottom (없으면 전체)
    state: 'can_buy'(구매하기) | 'not_enough'(핸드코인 부족) | 'owned'(보유 중) -> 버튼 상태
    """
    if category is not None and category not in CATEGORIES:
        raise HTTPException(status_code=400, detail="카테고리는 hat, top, bottom 중 하나예요")

    query = db.query(Item).order_by(Item.category, Item.price, Item.id)
    if category:
        query = query.filter(Item.category == category)
    owned_ids = {ui.item_id for ui in db.query(UserItem).filter_by(user_id=user.id).all()}

    items = []
    for it in query.all():
        if it.id in owned_ids:
            state = "owned"
        elif user.coins >= it.price:
            state = "can_buy"
        else:
            state = "not_enough"
        items.append({**item_dict(it), "state": state})
    return {"coins": user.coins, "items": items}


@shop_router.post("/items/{item_id}/buy")
def buy_item(item_id: int, db: Session = Depends(get_db),
             user: User = Depends(get_current_user)):
    """핸드코인으로 아이템 구매(보유 중/코인 부족: 거절)"""
    item = db.get(Item, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="존재하지 않는 아이템이에요")
    if db.query(UserItem).filter_by(user_id=user.id, item_id=item_id).first():
        raise HTTPException(status_code=409, detail="이미 보유 중이에요")
    if user.coins < item.price:
        raise HTTPException(status_code=400, detail="핸드코인이 부족해요")

    user.coins -= item.price
    db.add(UserItem(user_id=user.id, item_id=item_id, equipped=False))
    try:
        db.commit()
    except IntegrityError:  # 중복 구매 방지
        db.rollback()
        raise HTTPException(status_code=409, detail="이미 보유 중이에요")
    return {"message": "구매했어요", "item": item_dict(item), "total_coins": user.coins}


# 꾸미기 화면
@closet_router.get("")
def closet(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """
    내가 가진 아이템과 장착 상태.
    equipped: 카테고리별 장착 중인 아이템
    """
    rows = (
        db.query(UserItem, Item)
        .join(Item, Item.id == UserItem.item_id)
        .filter(UserItem.user_id == user.id)
        .order_by(Item.category, Item.id)
        .all()
    )
    items = [{**item_dict(it), "equipped": ui.equipped} for ui, it in rows]
    equipped = {
        cat: next((i for i in items if i["category"] == cat and i["equipped"]), None)
        for cat in CATEGORIES
    }
    return {"items": items, "equipped": equipped}


@closet_router.post("/items/{item_id}/toggle")
def toggle_item(item_id: int, db: Session = Depends(get_db),
                user: User = Depends(get_current_user)):
    """아이템을 누르면 장착, 다시 누르면 해제. 카테고리별 1개만"""
    row = (
        db.query(UserItem, Item)
        .join(Item, Item.id == UserItem.item_id)
        .filter(UserItem.user_id == user.id, UserItem.item_id == item_id)
        .first()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="보유하지 않은 아이템이에요")
    user_item, item = row

    if user_item.equipped:
        user_item.equipped = False
    else:
        # 같은 카테고리에서 입고 있던 아이템은 자동으로 해제
        others = (
            db.query(UserItem)
            .join(Item, Item.id == UserItem.item_id)
            .filter(UserItem.user_id == user.id, Item.category == item.category,
                    UserItem.equipped.is_(True))
            .all()
        )
        for other in others:
            other.equipped = False
        user_item.equipped = True

    db.commit()
    return {"item_id": item_id, "category": item.category, "equipped": user_item.equipped}
