import type { RecentRecord } from "../api/learning";
import { percent, stageLabel } from "../utils/format";
import RecordPanel from "./RecordPanel";

// 최근 학습 기록
// TODO: 전체보기는 학습 리포트가 만들어지면 연결
export default function RecentRecords({
  records,
}: {
  records: RecentRecord[];
}) {
  return (
    <RecordPanel title="최근 학습 기록" aside="전체보기">
      {records.length === 0 ? (
        <p className="record-panel__empty">아직 학습 기록이 없어요</p>
      ) : (
        <ul className="record-list">
          {records.map((record, index) => (
            <li
              className="record-list__row record-list__row--recent"
              key={`${record.card_id}-${index}`}
            >
              <span className="record-list__text">{record.text}</span>
              <span className="record-list__stage">
                {stageLabel(record.chapter_no)}
              </span>
              <span className="record-list__score">
                {percent(record.accuracy)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </RecordPanel>
  );
}
