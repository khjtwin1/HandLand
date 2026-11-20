import type { StageCardInfo } from "../api/learning";
import "../styles/components/SignChoice.css";

interface SignChoiceProps {
  options: StageCardInfo[];
  picked: number | null;
  disabled: boolean;
  onPick: (cardId: number) => void;
}

// 카메라 없이 풀기: 글자에 맞는 수어 이미지(+동작 설명)를 고름
export default function SignChoice({
  options,
  picked,
  disabled,
  onPick,
}: SignChoiceProps) {
  return (
    <div className="sign-choice">
      <p className="sign-choice__guide">알맞은 수어를 골라 보세요</p>
      <ul>
        {options.map((o, i) => (
          <li key={o.id}>
            <button
              type="button"
              className={
                picked === o.id
                  ? "sign-choice__option sign-choice__option--wrong"
                  : "sign-choice__option"
              }
              onClick={() => onPick(o.id)}
              disabled={disabled}
            >
              <span className="sign-choice__image">
                {o.image_url ? (
                  <img src={o.image_url} alt={`수어 보기 ${i + 1}`} />
                ) : (
                  // TODO: 수어 이미지가 준비되면 image_url 로 표시
                  <small>수어 이미지 준비 중</small>
                )}
              </span>
              <span className="sign-choice__desc">
                {o.description ?? "동작 설명 준비 중"}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
