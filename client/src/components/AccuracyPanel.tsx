import { PASS_AT } from "../constants/rules";
import "../styles/components/AccuracyPanel.css";

interface AccuracyPanelProps {
  accuracy: number | null;
}

// TODO: 손모양 / 손등 방향 / 이동 경로를 따로 판정하게 되면 값 연결
const DETAILS = ["손모양", "손등 방향", "이동 경로"];

// 일치도 패널
export default function AccuracyPanel({ accuracy }: AccuracyPanelProps) {
  const value = accuracy === null ? null : Math.round(accuracy);
  return (
    <section className="accuracy-panel" aria-label="일치도">
      <p className="accuracy-panel__label">일치도</p>
      <p className="accuracy-panel__value">
        {value === null ? "--" : `${value}%`}
        {value !== null && value >= PASS_AT && (
          <span className="accuracy-panel__pass">통과</span>
        )}
      </p>
      <ul className="accuracy-panel__details">
        {DETAILS.map((name, i) => (
          <li key={name}>
            <span>{name}</span>
            {i === 0 && value !== null ? (
              <>
                <div className="accuracy-panel__bar">
                  <div style={{ width: `${value}%` }} />
                </div>
                <span>{value}%</span>
              </>
            ) : (
              <>
                <div className="accuracy-panel__bar" />
                <span>준비 중</span>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
