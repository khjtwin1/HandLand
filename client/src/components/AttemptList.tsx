import checkIcon from "../assets/icons/check-small.svg";
import replayIcon from "../assets/icons/replay.svg";
import { PASS_AT } from "../constants/rules";
import "../styles/components/AttemptList.css";

// 시도 기록
export default function AttemptList({ attempts }: { attempts: number[] }) {
  return (
    <section className="attempt-list" aria-labelledby="attempt-title">
      <h2 className="attempt-list__title" id="attempt-title">
        시도 기록
      </h2>
      {attempts.length === 0 ? (
        <p className="attempt-list__empty">
          카메라 앞에서 동작을 해 보면 기록이 쌓여요
        </p>
      ) : (
        <ul className="attempt-list__items">
          {attempts.map((accuracy, i) => {
            const passed = accuracy >= PASS_AT;
            return (
              <li
                key={i}
                className={
                  passed
                    ? "attempt-list__item attempt-list__item--pass"
                    : "attempt-list__item"
                }
              >
                <div className="attempt-list__row">
                  <span>{i + 1}회차</span>
                  <span
                    className={
                      passed ? "attempt-list__pass" : "attempt-list__retry"
                    }
                  >
                    <img src={passed ? checkIcon : replayIcon} alt="" />
                    {passed ? "통과" : "다시시도"}
                  </span>
                  <span className="attempt-list__score">
                    {Math.round(accuracy)}%
                  </span>
                </div>
                {/* TODO: 손 방향, 속도 같은 세부 피드백 문구 */}
                <p>
                  {passed
                    ? "판정기준을 모두 통과했어요"
                    : "기준에 조금 못 미쳤어요. 다시 해 볼까요?"}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
