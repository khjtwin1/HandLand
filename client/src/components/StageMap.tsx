import type { MapStage } from "../api/learning";
import checkIcon from "../assets/icons/check.svg";
import flagIcon from "../assets/icons/flag.svg";
import lockIcon from "../assets/icons/lock.svg";
import "../styles/components/StageMap.css";

interface StageMapProps {
  stages: MapStage[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

// 스테이지 위치
function positionOf(index: number, total: number) {
  const x = total === 1 ? 50 : 8 + (index * 84) / (total - 1);
  const y = index % 2 === 0 ? 70 : 36;
  return { x, y };
}

const STATUS_LABEL = {
  cleared: "완료",
  current: "진행중",
  waiting: "대기",
  locked: "잠김",
};

// 스테이지 지도
export default function StageMap({
  stages,
  selectedId,
  onSelect,
}: StageMapProps) {
  const points = stages.map((_, i) => positionOf(i, stages.length));

  return (
    <div className="stage-map">
      <svg
        className="stage-map__path"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {points.slice(1).map((p, i) => (
          <line
            key={i}
            x1={points[i].x}
            y1={points[i].y}
            x2={p.x}
            y2={p.y}
            className={
              stages[i].status === "cleared"
                ? "stage-map__line stage-map__line--done"
                : "stage-map__line"
            }
          />
        ))}
      </svg>

      <ul className="stage-map__nodes">
        {stages.map((stage, i) => {
          const isLast = i === stages.length - 1;
          const classes = [
            "stage-node",
            `stage-node--${stage.status}`,
            isLast ? "stage-node--last" : "",
            stage.id === selectedId ? "stage-node--selected" : "",
          ]
            .filter(Boolean)
            .join(" ");
          const no = String(stage.chapter_no).padStart(2, "0");
          return (
            <li
              key={stage.id}
              className="stage-map__item"
              style={{ left: `${points[i].x}%`, top: `${points[i].y}%` }}
            >
              <button
                type="button"
                className={classes}
                onClick={() => onSelect(stage.id)}
                aria-label={`${no} ${stage.title} ${STATUS_LABEL[stage.status]}`}
              >
                {stage.status === "locked" ? (
                  <img src={lockIcon} alt="" />
                ) : stage.status === "cleared" ? (
                  <img src={checkIcon} alt="" />
                ) : isLast ? (
                  <img src={flagIcon} alt="" />
                ) : (
                  no
                )}
              </button>
              {stage.status === "current" && (
                <span className="stage-map__tooltip">
                  {stage.title} | 진행중
                </span>
              )}
              <span
                className={
                  isLast
                    ? "stage-map__label stage-map__label--last"
                    : "stage-map__label"
                }
              >
                {no} {stage.title}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="stage-map__legend">
        <span className="stage-map__dot stage-map__dot--done" />
        완료
        <span className="stage-map__dot stage-map__dot--current" />
        진행중
      </p>
    </div>
  );
}
