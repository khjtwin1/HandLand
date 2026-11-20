import type { ShopItem } from "../api/shop";
import Button from "./Button";
import "../styles/components/TryOnSummary.css";

interface TryOnSummaryProps {
  tryOn: ShopItem[];
  coins: number;
  busy: boolean;
  onApply: () => void;
  onCancel: () => void;
}

// 입어 본 아이템 요약
export default function TryOnSummary({
  tryOn,
  coins,
  busy,
  onApply,
  onCancel,
}: TryOnSummaryProps) {
  const toBuy = tryOn.filter((i) => i.state !== "owned");
  const total = toBuy.reduce((sum, i) => sum + i.price, 0);
  const lacking = total > coins;

  if (tryOn.length === 0) {
    return (
      <aside className="try-on">
        <p className="try-on__label">입어 본 아이템</p>
        <p className="try-on__empty">
          아래 아이템에서 &lsquo;입어보기&rsquo;를 눌러 보세요
        </p>
      </aside>
    );
  }

  return (
    <aside className="try-on">
      <p className="try-on__label">입어 본 아이템</p>
      <h2 className="try-on__name">{tryOn.map((i) => i.name).join(", ")}</h2>

      <div className="try-on__section">
        <h3>구매할 아이템</h3>
        <span>{toBuy.length}개</span>
      </div>
      <ul className="try-on__rows">
        {toBuy.map((item) => (
          <li key={item.id}>
            <span>{item.name}</span>
            <span>{item.price}</span>
          </li>
        ))}
      </ul>
      <p className="try-on__total">
        <span>합계</span>
        <strong>{total} 핸드코인</strong>
      </p>

      <Button fullWidth onClick={onApply} disabled={busy || lacking}>
        {toBuy.length > 0 ? "구매하고 착용하기" : "착용하기"}
      </Button>
      {lacking && <p className="try-on__warn">핸드코인이 부족해요</p>}
      <Button fullWidth variant="outline" onClick={onCancel} disabled={busy}>
        입어보기 취소
      </Button>
      <p className="try-on__note">
        착용한 모습은 내 프로필과 게임 대기실에 보여요.
      </p>
    </aside>
  );
}
