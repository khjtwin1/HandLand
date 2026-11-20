import { useCallback, useEffect, useRef, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { getToken } from "../api/auth";
import { ApiError } from "../api/client";
import { fetchStage } from "../api/learning";
import type { StageDetail } from "../api/learning";
import type { FingerspellingResult } from "../api/inference";
import arrowIcon from "../assets/icons/arrow-right-small.svg";
import AccuracyPanel from "../components/AccuracyPanel";
import AttemptList from "../components/AttemptList";
import CameraView from "../components/CameraView";
import DemoPanel from "../components/DemoPanel";
import { useCamera } from "../hooks/useCamera";
import { useFingerspelling } from "../hooks/useFingerspelling";
import "../styles/learn.css";

// 스테이지 학습 화면
export default function LearnPage() {
  const { stageId } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const cameraOn = params.get("camera") !== "off";

  const [stage, setStage] = useState<StageDetail | null>(null);
  const [error, setError] = useState("");
  const [index, setIndex] = useState(0);
  const [attempts, setAttempts] = useState<number[]>([]);
  const attempt = useRef<{ best: number; miss: number } | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token || !stageId) return;
    fetchStage(token, Number(stageId))
      .then(setStage)
      .catch((e) =>
        setError(
          e instanceof ApiError ? e.message : "스테이지를 불러오지 못했어요",
        ),
      );
  }, [stageId]);

  const card = stage?.cards[index] ?? null;
  const { videoRef, status } = useCamera(cameraOn && stage !== null);

  const handleResult = useCallback((result: FingerspellingResult) => {
    if (result.hand_detected && result.accuracy !== null) {
      const current = attempt.current ?? { best: 0, miss: 0 };
      attempt.current = {
        best: Math.max(current.best, result.accuracy),
        miss: 0,
      };
    } else if (attempt.current) {
      attempt.current.miss += 1;
      if (attempt.current.miss >= 2) {
        const best = attempt.current.best;
        attempt.current = null;
        setAttempts((list) => [...list, best]);
      }
    }
  }, []);

  const { result, error: cameraError } = useFingerspelling(
    videoRef,
    card?.text ?? null,
    cameraOn && status === "ready",
    handleResult,
  );

  const selectWord = (i: number) => {
    setIndex(i);
    setAttempts([]);
    attempt.current = null;
  };

  if (error || stage === null) {
    return (
      <main className="learn">
        <p className="learn__message" role={error ? "alert" : undefined}>
          {error || "불러오는 중..."}
        </p>
        {error && <Link to="/map">탐험 지도로 돌아가기</Link>}
      </main>
    );
  }

  const hint =
    cameraError ||
    (result && !result.hand_detected ? "손이 보이게 해 주세요" : undefined);

  return (
    <main className="learn">
      <div className="learn__top">
        <section className="learn__stage" aria-label="따라 하기">
          {cameraOn ? (
            <CameraView videoRef={videoRef} status={status} hint={hint} />
          ) : (
            <p className="learn__nocamera">
              카메라 없이 시범을 보며 익혀요 (기록은 저장되지 않아요)
            </p>
          )}
          <div className="learn__word">{card?.text}</div>
          <ul className="learn__chips" aria-label="단어 선택">
            {stage.cards.map((c, i) => (
              <li key={`${c.id}-${i}`}>
                <button
                  type="button"
                  className={
                    i === index
                      ? "learn__chip learn__chip--active"
                      : "learn__chip"
                  }
                  onClick={() => selectWord(i)}
                >
                  {c.text}
                </button>
              </li>
            ))}
          </ul>
        </section>

        <div className="learn__side">
          <DemoPanel
            videoUrl={card?.video_url ?? null}
            description={card?.description}
          />
          {cameraOn && (
            <AccuracyPanel
              accuracy={result?.hand_detected ? result.accuracy : null}
            />
          )}
        </div>
      </div>

      <div className="learn__actions">
        {/* TODO: 시범 영상이 준비되면 다시 재생 */}
        <button type="button" className="learn__replay" disabled>
          시범 다시보기
        </button>
        <button
          type="button"
          className="learn__quiz"
          onClick={() => navigate(`/stages/${stage.id}/quiz`)}
          disabled={!cameraOn}
          title={cameraOn ? undefined : "카메라를 켠 학습에서만 풀 수 있어요"}
        >
          문제 풀이
          <img src={arrowIcon} alt="" />
        </button>
      </div>

      {cameraOn && <AttemptList attempts={attempts} />}
    </main>
  );
}
