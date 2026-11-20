import { Link } from "react-router-dom";
import warningIcon from "../assets/icons/warning.svg";
import type { WeakRecord } from "../api/learning";
import { percent } from "../utils/format";
import RecordPanel from "./RecordPanel";

// 다시 연습할 동작(마지막 정확도가 낮은 순)
export default function WeakCards({ records }: { records: WeakRecord[] }) {
  return (
    <RecordPanel title="다시 연습할 동작" aside="일치도 낮은 순" asideMuted>
      {records.length === 0 ? (
        <p className="record-panel__empty">다시 연습할 동작이 아직 없어요</p>
      ) : (
        <ul className="record-list">
          {records.map((record) => (
            <li className="record-list__row" key={record.card_id}>
              <span className="record-list__text">{record.text}</span>
              {/* 색만으로 전달하지 않도록 경고 아이콘을 함께 표시 */}
              <span className="record-list__score record-list__score--danger">
                <img src={warningIcon} alt="낮은 일치도" />
                {percent(record.accuracy)}
              </span>
              <Link
                className="record-list__chip"
                to={`/stages/${record.stage_id}/learn`}
              >
                연습하기
              </Link>
            </li>
          ))}
        </ul>
      )}
    </RecordPanel>
  );
}
