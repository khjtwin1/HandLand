import type { ThemeStatus, ThemeSummary } from "../api/learning";
import ProgressBar from "./ProgressBar";
import "../styles/components/ThemeCard.css";

const STATUS_LABEL: Record<ThemeStatus, string> = {
  in_progress: "진행중",
  started: "시작함",
  not_started: "시작전",
  done: "완료",
  locked: "잠김",
  coming_soon: "준비 중",
};

// 탐험 현황의 대륙(테마) 카드
export default function ThemeCard({ theme }: { theme: ThemeSummary }) {
  return (
    <li className={`theme-card theme-card--${theme.status}`}>
      <div className="theme-card__top">
        <h3 className="theme-card__name">{theme.name} 대륙</h3>
        <span className="theme-card__status">{STATUS_LABEL[theme.status]}</span>
      </div>
      <ProgressBar
        value={theme.learned}
        max={theme.total}
        label={`${theme.name} 대륙 학습 진행도`}
      />
      <p className="theme-card__count">
        {theme.learned} / {theme.total} 단어
      </p>
    </li>
  );
}
