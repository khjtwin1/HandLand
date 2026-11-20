import { useEffect, useState } from "react";
import { getToken } from "../api/auth";
import { ApiError } from "../api/client";
import { buyItem, fetchCloset, fetchShop, toggleItem } from "../api/shop";
import type { ClosetData, ItemCategory, ShopData, ShopItem } from "../api/shop";
import CharacterPreview from "../components/CharacterPreview";
import ItemCard from "../components/ItemCard";
import QuestCards from "../components/QuestCards";
import TryOnSummary from "../components/TryOnSummary";
import "../styles/closet.css";

const CATEGORY_LABEL: Record<ItemCategory, string> = {
  hair: "머리 스타일",
  face: "얼굴",
  outfit: "복장",
};
const CATEGORIES = Object.keys(CATEGORY_LABEL) as ItemCategory[];

// 캐릭터 꾸미기
export default function ClosetPage() {
  const [shop, setShop] = useState<ShopData | null>(null);
  const [closet, setCloset] = useState<ClosetData | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<ItemCategory | "all">("all");
  const [tryOn, setTryOn] = useState<Partial<Record<ItemCategory, ShopItem>>>(
    {},
  );
  const [busy, setBusy] = useState(false);

  const [version, setVersion] = useState(0);
  const reload = () => setVersion((v) => v + 1);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    Promise.all([fetchShop(token), fetchCloset(token)])
      .then(([s, c]) => {
        setShop(s);
        setCloset(c);
      })
      .catch((e) =>
        setError(
          e instanceof ApiError ? e.message : "아이템을 불러오지 못했어요",
        ),
      );
  }, [version]);

  if (error || shop === null || closet === null) {
    return (
      <main className="closet">
        <p className="closet__message" role={error ? "alert" : undefined}>
          {error || "불러오는 중..."}
        </p>
      </main>
    );
  }

  const equippedId = (c: ItemCategory) => closet.equipped[c]?.id ?? null;
  const owned = shop.items.filter((i) => i.state === "owned");
  const shown =
    tab === "all" ? shop.items : shop.items.filter((i) => i.category === tab);

  // 입어보기
  const startTryOn = (item: ShopItem) =>
    setTryOn((t) => ({ ...t, [item.category]: item }));
  const cancelTryOn = () => setTryOn({});

  // 구매하고 착용
  const applyTryOn = async () => {
    const token = getToken();
    if (!token) return;
    setBusy(true);
    try {
      for (const item of Object.values(tryOn)) {
        if (item.state !== "owned") await buyItem(token, item.id);
        if (equippedId(item.category) !== item.id)
          await toggleItem(token, item.id);
      }
      setTryOn({});
      reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "적용하지 못했어요");
    } finally {
      setBusy(false);
    }
  };

  // 가진 아이템 바로 착용
  const equip = async (item: ShopItem) => {
    const token = getToken();
    if (!token) return;
    try {
      await toggleItem(token, item.id);
      reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "착용하지 못했어요");
    }
  };

  return (
    <main className="closet">
      <h1 className="closet__title">캐릭터 꾸미기</h1>
      <p className="closet__desc">
        스테이지 클리어와 1:1 매칭으로 모은 핸드코인으로 내 캐릭터를 꾸며요.
      </p>

      <div className="closet__coins">
        {/* TODO: 핸드코인 아이콘 이미지 */}
        <span>보유 핸드코인</span>
        <strong>{shop.coins.toLocaleString()}</strong>
        {/* TODO: 획득 내역 화면 */}
        <button type="button" disabled>
          획득 내역
        </button>
      </div>

      <div className="closet__top">
        <CharacterPreview
          equipped={closet.equipped}
          tryOn={tryOn}
          onReset={cancelTryOn}
        />
        <TryOnSummary
          tryOn={Object.values(tryOn)}
          coins={shop.coins}
          busy={busy}
          onApply={applyTryOn}
          onCancel={cancelTryOn}
        />
      </div>

      <section className="closet__items" aria-labelledby="items-title">
        <div className="closet__items-header">
          <div>
            <h2 id="items-title">아이템</h2>
            <p>머리 스타일, 얼굴, 복장을 골라 입어 보세요.</p>
          </div>
          <span>보유한 아이템 {owned.length}개</span>
        </div>

        <div className="closet__tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "all"}
            className={
              tab === "all" ? "closet__tab closet__tab--active" : "closet__tab"
            }
            onClick={() => setTab("all")}
          >
            전체 {shop.items.length}
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              role="tab"
              aria-selected={tab === c}
              className={
                tab === c ? "closet__tab closet__tab--active" : "closet__tab"
              }
              onClick={() => setTab(c)}
            >
              {CATEGORY_LABEL[c]}{" "}
              {shop.items.filter((i) => i.category === c).length}
            </button>
          ))}
        </div>

        <ul className="closet__grid">
          {shown.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              equipped={equippedId(item.category) === item.id}
              tryingOn={tryOn[item.category]?.id === item.id}
              onTryOn={() => startTryOn(item)}
              onEquip={() => equip(item)}
            />
          ))}
        </ul>
      </section>

      <QuestCards />
    </main>
  );
}
