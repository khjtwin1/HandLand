import { useNavigate } from "react-router-dom";
import type { MapStage } from "../api/learning";
import checkIcon from "../assets/icons/check-list.svg";
import "../styles/components/StagePanel.css";

const WORD_LABEL = { done: "완료", in_progress: "진행중", waiting: "대기" };

// 선택한 스테이지 설명 + 단어 목록 + 학습 시작 버튼
export default function StagePanel({ stage }: { stage: MapStage }) {
  const navigate = useNavigate();
  const doneCount = stage.words.filter((w) => w.state === "done").length;
  const no = String(stage.chapter_no).padStart(2, "0");
  const closed = stage.locked;

  return (
    <aside className="stage-panel" aria-label={`스테이지 ${no} 정보`}>
      <p className="stage-panel__no">Stage {no}</p>
      <h2 className="stage-panel__title">{stage.title}</h2>
      <p className="stage-panel__desc">{stage.description}</p>

      <div className="stage-panel__words-header">
        <h3>{stage.kind === "quest" ? "이름 자모" : "이 스테이지 단어"}</h3>
        <span>
          {doneCount} / {stage.words.length} 완료
        </span>
      </div>
      <ul className="stage-panel__words">
        {stage.words.map((word, i) => (
          <li
            key={`${word.card_id}-${i}`}
            className={`stage-panel__word stage-panel__word--${word.state}`}
          >
            <span className="stage-panel__mark">
              {word.state === "done" && <img src={checkIcon} alt="" />}
              {word.state === "in_progress" && (
                <span className="stage-panel__ring" />
              )}
            </span>
            <span className="stage-panel__text">{word.text}</span>
            <span className="stage-panel__state">{WORD_LABEL[word.state]}</span>
          </li>
        ))}
      </ul>

      <div className="stage-panel__actions">
        <button
          type="button"
          className="stage-panel__button"
          disabled={closed}
          onClick={() => navigate(`/stages/${stage.id}/learn`)}
        >
          {stage.status === "cleared" ? "다시 연습하기" : "이어서 연습하기"}
        </button>
        <button
          type="button"
          className="stage-panel__button stage-panel__button--sub"
          disabled={closed}
          onClick={() => navigate(`/stages/${stage.id}/learn?camera=off`)}
        >
          카메라 없이 학습하기
        </button>
      </div>
    </aside>
  );
}
