import handIcon from "../assets/icons/hand.svg";
import { TIPS } from "../constants/tips";
import "../styles/components/TipBanners.css";

// 수어, 청각장애 관련 안내 배너
export default function TipBanners() {
  return (
    <ul className="tip-banners">
      {TIPS.map((tip) => (
        <li className="tip-banners__item" key={tip.title}>
          <img className="tip-banners__icon" src={handIcon} alt="" />
          <h2 className="tip-banners__title">{tip.title}</h2>
          <p className="tip-banners__body">
            {tip.lines.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </p>
        </li>
      ))}
    </ul>
  );
}
