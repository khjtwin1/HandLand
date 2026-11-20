import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchMe, getToken } from "../api/auth";
import { ApiError } from "../api/client";
import { fetchStage, submitStageResult } from "../api/learning";
import type { StageDetail, StageResult } from "../api/learning";
import type { FingerspellingResult } from "../api/inference";
import arrowIcon from "../assets/icons/arrow-right-small.svg";
import heartFilled from "../assets/icons/heart-filled.svg";
import heartOutlined from "../assets/icons/heart-outlined.svg";
import noSymbolIcon from "../assets/icons/no-symbol.svg";
import pauseIcon from "../assets/icons/play-pause.svg";
import plusIcon from "../assets/icons/plus.svg";
import replayIcon from "../assets/icons/replay.svg";
import CameraView from "../components/CameraView";
import CheerPopup from "../components/CheerPopup";
import DemoPanel from "../components/DemoPanel";
import SignChoice from "../components/SignChoice";
import QuizResultModal from "../components/QuizResultModal";
import { CLEAR_AT, COMBO_BONUS_AT, MAX_LIVES } from "../constants/rules";
import { useAuth } from "../hooks/useAuth";
import { useCamera } from "../hooks/useCamera";
import { useFingerspelling } from "../hooks/useFingerspelling";
import { useQuiz } from "../hooks/useQuiz";
import "../styles/quiz.css";

const CHEER_MS = 1000; // 정답 팝업 보여 주는 시간
const CHOICE_CHEER_MS = 2500; // 카메라 없이 풀 때
const CHOICE_COUNT = 3; // 카메라 없이 풀 때 나오는 보기 수

function buildOptions(
  cards: StageDetail["cards"],
  answer: StageDetail["cards"][number],
) {
  const seen = new Set([answer.id]);
  const others = cards.filter((c) => !seen.has(c.id) && seen.add(c.id));
  const rank = (id: number) => (id * 9301 + answer.id * 49297) % 233280;
  const picked = [...others]
    .sort((a, b) => rank(a.id) - rank(b.id))
    .slice(0, CHOICE_COUNT - 1);
  return [answer, ...picked].sort((a, b) => rank(a.id + 7) - rank(b.id + 7));
}

export default function QuizPage() {
  const { stageId } = useParams();
  const [stage, setStage] = useState<StageDetail | null>(null);
  const [error, setError] = useState("");

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

  if (error || stage === null) {
    return (
      <main className="quiz">
        <p className="quiz__message" role={error ? "alert" : undefined}>
          {error || "불러오는 중..."}
        </p>
        {error && <Link to="/map">탐험 지도로 돌아가기</Link>}
      </main>
    );
  }
  return <QuizPlay key={stage.id} stage={stage} />;
}

function QuizPlay({ stage }: { stage: StageDetail }) {
  const [round, setRound] = useState(0);
  return (
    <QuizRound
      key={round}
      stage={stage}
      onRetry={() => setRound((r) => r + 1)}
    />
  );
}

function QuizRound({
  stage,
  onRetry,
}: {
  stage: StageDetail;
  onRetry: () => void;
}) {
  const { setUser } = useAuth();
  const [state, dispatch] = useQuiz(stage.cards.map((c) => c.id));
  const [timeLimit, setTimeLimit] = useState(false);
  const [result, setResult] = useState<StageResult | null>(null);
  const [submitError, setSubmitError] = useState("");
  const startedAt = useRef<number | null>(null);
  const submitted = useRef(false);

  const card = stage.cards[state.index];
  const playing = state.status === "playing";
  const finished = state.status === "clear" || state.status === "over";
  const [choiceMode, setChoiceMode] = useState(false);
  const [wrongPick, setWrongPick] = useState<number | null>(null);
  const { videoRef, status: cameraStatus } = useCamera(!choiceMode);

  const handleResult = useCallback(
    (r: FingerspellingResult) => {
      if (r.hand_detected && r.accuracy !== null)
        dispatch({ type: "accuracy", accuracy: r.accuracy });
    },
    [dispatch],
  );
  const { result: live } = useFingerspelling(
    videoRef,
    card?.text ?? null,
    playing && !state.passed && !choiceMode && cameraStatus === "ready",
    handleResult,
  );

  // 문제 풀이 시작 시각
  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  useEffect(() => {
    if (!timeLimit || !playing || state.passed) return;
    const timer = setInterval(() => dispatch({ type: "tick" }), 1000);
    return () => clearInterval(timer);
  }, [timeLimit, playing, state.passed, dispatch]);

  // 정답
  useEffect(() => {
    if (!playing || !state.passed) return;
    const timer = setTimeout(
      () => dispatch({ type: "next" }),
      choiceMode ? CHOICE_CHEER_MS : CHEER_MS,
    );
    return () => clearTimeout(timer);
  }, [playing, state.passed, state.index, choiceMode, dispatch]);

  // 오답
  useEffect(() => {
    if (wrongPick === null) return;
    const timer = setTimeout(() => {
      setWrongPick(null);
      dispatch({ type: "skip" });
    }, CHOICE_CHEER_MS);
    return () => clearTimeout(timer);
  }, [wrongPick, dispatch]);

  const onPick = (cardId: number) => {
    if (!card || state.passed || wrongPick !== null) return;
    if (cardId === card.id) dispatch({ type: "accuracy", accuracy: 100 });
    else setWrongPick(cardId);
  };

  // 게임 끝
  useEffect(() => {
    const token = getToken();
    if (!finished || submitted.current || !token) return;
    submitted.current = true;
    const results = Object.entries(state.bests).map(([id, accuracy]) => ({
      card_id: Number(id),
      accuracy,
    }));
    if (results.length === 0) return;
    const seconds = Math.round(
      (Date.now() - (startedAt.current ?? Date.now())) / 1000,
    );
    submitStageResult(token, stage.id, results, seconds)
      .then((r) => {
        setResult(r);
        fetchMe(token)
          .then(setUser)
          .catch(() => {});
      })
      .catch((e) =>
        setSubmitError(
          e instanceof ApiError ? e.message : "결과를 저장하지 못했어요",
        ),
      );
  }, [finished, state.bests, stage.id, setUser]);

  const options = card ? buildOptions(stage.cards, card) : [];
  const nextCards = stage.cards.slice(state.index + 1, state.index + 3);
  const accuracy = live?.hand_detected ? Math.round(live.accuracy ?? 0) : 0;
  const bonus = state.combo >= COMBO_BONUS_AT;

  // 응원 문구
  const isLast = state.index + 1 >= stage.cards.length;
  const streak = `${state.combo}회 연속 정답이에요!!`;
  const master = `${card?.text} 마스터!`;
  const cheer = isLast
    ? { title: "학습 완료!!", sub: state.combo >= 2 ? streak : master }
    : state.combo >= 2
      ? { title: streak, sub: master }
      : { title: "정답이에요!", sub: master };

  return (
    <main className="quiz">
      <header className="quiz__top">
        <Link className="quiz__exit" to={`/stages/${stage.id}/learn`}>
          <img src={noSymbolIcon} alt="" />
          나가기
        </Link>
        <p className="quiz__stage">
          {stage.theme_name}대륙 | stage {stage.chapter_no}
        </p>
        <label className="quiz__timer">
          시간 제한
          <input
            type="checkbox"
            role="switch"
            className="quiz__switch"
            checked={timeLimit}
            onChange={(e) => setTimeLimit(e.target.checked)}
          />
        </label>
      </header>

      <div className="quiz__body">
        <section className="quiz__main" aria-label="문제">
          {choiceMode ? (
            <SignChoice
              options={options}
              picked={wrongPick}
              disabled={!playing || state.passed || wrongPick !== null}
              onPick={onPick}
            />
          ) : (
            <CameraView
              videoRef={videoRef}
              status={cameraStatus}
              hint={
                live && !live.hand_detected
                  ? "손이 보이게 해 주세요"
                  : undefined
              }
            />
          )}
          <div className="quiz__word">{card?.text}</div>
          {timeLimit && (
            <p className="quiz__remaining">남은 시간 {state.remaining}초</p>
          )}

          <div className="quiz__pill">
            <p
              className="quiz__lives"
              aria-label={`목숨 ${state.lives} / ${MAX_LIVES}`}
            >
              {Array.from({ length: MAX_LIVES }, (_, i) => (
                <img
                  key={i}
                  src={i < state.lives ? heartFilled : heartOutlined}
                  alt=""
                />
              ))}
              <span>
                목숨 {state.lives} / {MAX_LIVES}
              </span>
            </p>
            <p className="quiz__score">
              <small>점수</small> {state.score.toLocaleString()}
            </p>
            <button
              type="button"
              className="quiz__pause"
              onClick={() => dispatch({ type: "pause" })}
              aria-label={state.status === "paused" ? "계속하기" : "일시정지"}
            >
              <img src={pauseIcon} alt="" />
            </button>
          </div>

          <div className="quiz__accuracy" hidden={choiceMode}>
            <span>{state.passed ? "성공!" : "일치율"}</span>
            <div
              className="quiz__bar"
              role="progressbar"
              aria-label="현재 일치율"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={accuracy}
            >
              <div
                className="quiz__bar-fill"
                style={{ width: `${accuracy}%` }}
              />
              <i className="quiz__bar-tick" style={{ left: `${CLEAR_AT}%` }} />
            </div>
            <small>
              {accuracy}% ({CLEAR_AT}% 이상이면 성공)
            </small>
          </div>
        </section>

        <aside className="quiz__side">
          <DemoPanel
            videoUrl={card?.video_url ?? null}
            description={card?.description}
          />

          <section className="quiz__combo" aria-label="콤보">
            <p className="quiz__combo-label">콤보</p>
            <strong>{state.combo}x</strong>
            <p className="quiz__combo-text">
              {bonus ? (
                <>
                  {state.combo}연속 성공중이에요.
                  <br />
                  지금부터 EXP가 2배에요
                </>
              ) : (
                <>
                  {COMBO_BONUS_AT}연속 성공하면
                  <br />
                  EXP가 2배에요
                </>
              )}
            </p>
            <div className="quiz__combo-bar">
              <div
                style={{
                  width: `${Math.min(100, (state.combo / COMBO_BONUS_AT) * 100)}%`,
                }}
              />
            </div>
          </section>

          <section className="quiz__next" aria-label="다음 단어">
            <h2>다음 단어</h2>
            <span className="quiz__next-count">
              {nextCards.length}개 + 보너스
            </span>
            <ul>
              {nextCards.map((c, i) => (
                <li key={`${c.id}-${i}`}>
                  <span>{String(state.index + 2 + i).padStart(2, "0")}</span>
                  <span>{c.text}</span>
                  <span>대기</span>
                </li>
              ))}
              {/* TODO: 문장 만들기 보너스 */}
              <li className="quiz__bonus">
                <img src={plusIcon} alt="" />
                <span>문장 만들기</span>
                <span>보너스</span>
              </li>
            </ul>
          </section>
        </aside>
      </div>

      <div className="quiz__bottom">
        <div>
          {/* TODO: 시범 영상이 준비되면 다시 재생 */}
          <button
            type="button"
            className="quiz__button quiz__button--replay"
            disabled
          >
            <img src={replayIcon} alt="" />
            시범 다시 보기
          </button>
          <button
            type="button"
            className="quiz__button"
            onClick={() => setChoiceMode((v) => !v)}
            disabled={!playing || state.passed}
          >
            {choiceMode ? "카메라로 답하기" : "카메라 없이 단어로 답하기"}
          </button>
        </div>
        <div>
          <button
            type="button"
            className="quiz__button quiz__button--skip"
            onClick={() => dispatch({ type: "skip" })}
            disabled={!playing || state.passed}
          >
            건너뛰기 <small>목숨 1개 사용</small>
          </button>
          <button
            type="button"
            className="quiz__button quiz__button--next"
            onClick={() => dispatch({ type: "next" })}
            disabled={!playing || !state.passed}
          >
            다음 단어
            <img src={arrowIcon} alt="" />
          </button>
        </div>
      </div>

      {playing && state.passed && (
        <CheerPopup
          title={cheer.title}
          sub={cheer.sub}
          note={choiceMode ? card?.description : null}
        />
      )}
      {wrongPick !== null && card && (
        <CheerPopup
          title="아쉬워요!"
          sub={`정답은 ${card.text} 수어예요`}
          note={card.description}
        />
      )}

      {finished && (
        <QuizResultModal
          cleared={state.status === "clear"}
          score={state.score}
          result={result}
          error={submitError}
          onRetry={onRetry}
        />
      )}
    </main>
  );
}
