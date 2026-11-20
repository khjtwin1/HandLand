import type { ShopItem } from "../api/shop";
import lockIcon from "../assets/icons/lock.svg";
import "../styles/components/ItemCard.css";

const CATEGORY_LABEL = { hair: "머리 스타일", face: "얼굴", outfit: "복장" };

interface ItemCardProps {
  item: ShopItem;
  equipped: boolean;
  tryingOn: boolean;
  onTryOn: () => void;
  onEquip: () => void;
}

// 아이템 카드(보유 / 착용 / 입어보기 / 티어 잠금)
export default function ItemCard({
  item,
  equipped,
  tryingOn,
  onTryOn,
  onEquip,
}: ItemCardProps) {
  const owned = item.state === "owned";
  const tierLocked = item.state === "tier_locked";

  return (
    <li className={`item-card${tryingOn ? " item-card--trying" : ""}`}>
      <div className="item-card__pic">
        {equipped && <span className="item-card__chip">착용중</span>}
        {tryingOn && <span className="item-card__chip">입어보는 중</span>}
        {/* TODO: 아이템 이미지 (item.image_url) */}
        {item.image_url && <img src={item.image_url} alt="" />}
      </div>
      <h3 className="item-card__name">{item.name}</h3>
      <p className="item-card__category">{CATEGORY_LABEL[item.category]}</p>

      <div className="item-card__footer">
        {owned ? (
          <>
            <span>보유</span>
            {equipped ? (
              <span>착용 중</span>
            ) : (
              <button type="button" onClick={onEquip}>
                착용하기
              </button>
            )}
          </>
        ) : tierLocked ? (
          <>
            <span className="item-card__lock">
              <img src={lockIcon} alt="" />
              {item.required_tier}부터
            </span>
            <span>{item.price}</span>
          </>
        ) : (
          <>
            <span>{item.price}</span>
            <button type="button" onClick={onTryOn} disabled={tryingOn}>
              {tryingOn ? "입어보는 중" : "입어보기"}
            </button>
          </>
        )}
      </div>
    </li>
  );
}
