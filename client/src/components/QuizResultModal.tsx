import { Link } from "react-router-dom";
import type { StageResult } from "../api/learning";
import Button from "./Button";
import "../styles/components/QuizResultModal.css";

interface QuizResultModalProps {
  cleared: boolean;
  score: number;
  result: StageResult | null;
  error: string;
  onRetry: () => void;
}

// 문제 풀이가 끝났을 때 결과 팝업
export default function QuizResultModal({
  cleared,
  score,
  result,
  error,
  onRetry,
}: QuizResultModalProps) {
  return (
    <div
      className="quiz-result"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quiz-result-title"
    >
      <div className="quiz-result__box">
        <h2 id="quiz-result-title">
          {result?.cleared
            ? "스테이지 클리어!"
            : cleared
              ? "끝까지 풀었어요"
              : "목숨을 모두 썼어요"}
        </h2>
        <p className="quiz-result__score">점수 {score.toLocaleString()}</p>
        {error && <p role="alert">{error}</p>}
        {result ? (
          <ul>
            <li>스테이지 일치도 {result.stage_accuracy}%</li>
            {result.first_clear && <li>핸드코인 +{result.coins_earned}</li>}
            {result.new_cards.length > 0 && (
              <li>새 카드 {result.new_cards.map((c) => c.text).join(" ")}</li>
            )}
          </ul>
        ) : (
          !error && <p>결과를 저장하는 중...</p>
        )}
        <div className="quiz-result__actions">
          <Button variant="outline" onClick={onRetry}>
            다시 풀기
          </Button>
          <Link className="quiz-result__link" to="/map">
            탐험 지도로
          </Link>
        </div>
      </div>
    </div>
  );
}
