import type { ItemCategory, ClosetData, ShopItem } from "../api/shop";
import "../styles/components/CharacterPreview.css";

const LABEL: Record<ItemCategory, string> = {
  hair: "머리 스타일",
  face: "얼굴",
  outfit: "복장",
};

interface CharacterPreviewProps {
  equipped: ClosetData["equipped"];
  tryOn: Partial<Record<ItemCategory, ShopItem>>;
  onReset: () => void;
}

// 캐릭터 미리보기
export default function CharacterPreview({
  equipped,
  tryOn,
  onReset,
}: CharacterPreviewProps) {
  const trying = Object.keys(tryOn).length > 0;
  return (
    <section className="character-preview" aria-label="캐릭터 미리보기">
      {trying && <span className="character-preview__chip">입어보는 중</span>}
      <button
        type="button"
        className="character-preview__reset"
        onClick={onReset}
        disabled={!trying}
      >
        처음 모습으로
      </button>

      {/* TODO: 캐릭터 기본 이미지 위에 아이템 이미지를 겹쳐서 보여주기 */}
      <div className="character-preview__figure">캐릭터 이미지 준비 중</div>

      <ul className="character-preview__slots">
        {(Object.keys(LABEL) as ItemCategory[]).map((c) => (
          <li key={c}>
            <span>{LABEL[c]}</span>
            <strong>
              {tryOn[c]?.name ?? equipped[c]?.name ?? "아직 없어요"}
            </strong>
          </li>
        ))}
      </ul>
    </section>
  );
}
