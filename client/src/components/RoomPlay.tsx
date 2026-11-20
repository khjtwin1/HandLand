import { useRef, useState } from "react";
import { getToken } from "../api/auth";
import { submitRoomAnswer } from "../api/rooms";
import type { RoomState } from "../api/rooms";
import CameraView from "./CameraView";
import DemoPanel from "./DemoPanel";
import { ROOM_WIN_AT } from "../constants/rules";
import { useCamera } from "../hooks/useCamera";
import { useFingerspelling } from "../hooks/useFingerspelling";
import type { FingerspellingResult } from "../api/inference";

interface RoomPlayProps {
  room: RoomState;
  myId: number;
}

// 게임 진행
export default function RoomPlay({ room, myId }: RoomPlayProps) {
  const question = room.phase === "question" ? room.question : undefined;
  const isLetter = question?.card.kind === "letter";
  const { videoRef, status } = useCamera(true);
  const [shot, setShot] = useState<{
    n: number;
    live: FingerspellingResult | null;
    message: string;
  } | null>(null);
  const answered = useRef<number | null>(null); // 이미 제출한 문제 번호

  const number = question?.number ?? null;
  const solved = question?.winner !== null && question?.winner !== undefined;
  const iWon = question?.winner?.user_id === myId;

  const live = shot?.n === number ? shot.live : null;
  const message = shot?.n === number ? shot.message : "";
  const setMessage = (m: string) =>
    number !== null &&
    setShot((prev) => ({
      n: number,
      live: prev?.n === number ? prev.live : null,
      message: m,
    }));

  const handleResult = (r: FingerspellingResult) => {
    if (number === null) return;
    setShot((prev) => ({
      n: number,
      live: r,
      message: prev?.n === number ? prev.message : "",
    }));
    if (!r.hand_detected || r.accuracy === null) return;
    if (r.accuracy < ROOM_WIN_AT || answered.current === number) return;

    const token = getToken();
    if (!token) return;
    answered.current = number;
    submitRoomAnswer(token, room.code, r.accuracy)
      .then((res) => {
        if (res.accepted) setMessage(`정답! +${res.points}점`);
        else if (res.reason === "already_won")
          setMessage("다른 친구가 먼저 맞혔어요");
      })
      .catch(() => {
        answered.current = null; // 실패하면 다시 시도 가능
      });
  };

  useFingerspelling(
    videoRef,
    isLetter ? (question?.card.text ?? null) : null,
    isLetter && !solved && status === "ready",
    handleResult,
  );

  const ranked = [...room.players].sort((a, b) => b.score - a.score);
  const me = room.players.find((p) => p.user_id === myId);
  const accuracy = live?.hand_detected ? Math.round(live.accuracy ?? 0) : 0;

  return (
    <main className="room-play">
      <section className="room-play__main" aria-label="문제">
        <CameraView
          videoRef={videoRef}
          status={status}
          hint={
            live && !live.hand_detected ? "손이 보이게 해 주세요" : undefined
          }
        />

        {room.phase === "rules" && (
          <div className="room-play__overlay">
            <h2>게임 규칙</h2>
            <ul>
              <li>카드에 나온 수어를 카메라 앞에서 해 보세요</li>
              <li>가장 먼저 {ROOM_WIN_AT}% 이상 맞힌 한 명만 10점을 얻어요</li>
              <li>
                {room.settings.question_count}문제, 문제당{" "}
                {room.settings.time_limit}초예요
              </li>
            </ul>
            <p>{room.remaining}초 뒤에 시작해요</p>
          </div>
        )}

        {room.phase === "countdown" && (
          <div className="room-play__overlay">
            <p className="room-play__count">{room.remaining}</p>
          </div>
        )}

        {question && (
          <>
            <div className="room-play__word">{question.card.text}</div>
            {!isLetter && (
              // TODO: 단어·문장 카드는 인식 모델이 생기면 자동 판정
              <p className="room-play__notice">
                아직 이 카드는 자동으로 인식할 수 없어요
              </p>
            )}
            {solved && (
              <p className="room-play__winner">
                {iWon
                  ? "내가 먼저 맞혔어요!"
                  : `${question.winner?.name}님이 먼저 맞혔어요`}
              </p>
            )}
            {!solved && message && (
              <p className="room-play__winner">{message}</p>
            )}
            <div className="room-play__accuracy">
              <span>일치율</span>
              <div
                className="room-play__bar"
                role="progressbar"
                aria-label="현재 일치율"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={accuracy}
              >
                <div style={{ width: `${accuracy}%` }} />
                <i style={{ left: `${ROOM_WIN_AT}%` }} />
              </div>
              <small>{accuracy}%</small>
            </div>
          </>
        )}
      </section>

      <aside className="room-play__side">
        <p className="room-play__time" aria-live="off">
          {question ? `${room.remaining}초` : ""}
        </p>
        {question && (
          <p className="room-play__number">
            {question.number} / {question.total}번째 카드
          </p>
        )}

        <ol className="room-play__ranking" aria-label="현재 순위">
          {ranked.map((p) => (
            <li
              key={p.user_id}
              className={p.user_id === myId ? "room-play__me" : undefined}
            >
              <span>{p.name}</span>
              <span>{p.score}점</span>
            </li>
          ))}
        </ol>

        <p className="room-play__score">score {me?.score ?? 0}</p>
        <DemoPanel videoUrl={question?.card.video_url ?? null} />
      </aside>
    </main>
  );
}
