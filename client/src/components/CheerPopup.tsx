import mascotImage from "../assets/mascot.svg";
import "../styles/components/CheerPopup.css";

interface CheerPopupProps {
  title: string;
  sub: string;
  note?: string | null;
}

// 문제를 맞혔을 때 응원 팝업
export default function CheerPopup({ title, sub, note }: CheerPopupProps) {
  return (
    <div className="cheer-popup" role="status" aria-live="polite">
      <div className="cheer-popup__box">
        {/* TODO: 마스터 캐릭터 이미지로 교체 */}
        <img src={mascotImage} alt="" />
        <p className="cheer-popup__title">{title}</p>
        <p className="cheer-popup__sub">{sub}</p>
        {note && <p className="cheer-popup__note">{note}</p>}
      </div>
    </div>
  );
}
