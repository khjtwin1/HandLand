import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getToken } from "../api/auth";
import { ApiError } from "../api/client";
import { leaveRoom, startRoom } from "../api/rooms";
import RoomPlay from "../components/RoomPlay";
import RoomResult from "../components/RoomResult";
import RoomWaiting from "../components/RoomWaiting";
import { useAuth } from "../hooks/useAuth";
import { useRoom } from "../hooks/useRoom";
import "../styles/game.css";

// 게임 방
export default function RoomPage() {
  const { code = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { room, error, closed, update } = useRoom(code);
  const [actionError, setActionError] = useState("");
  const [starting, setStarting] = useState(false);

  if (closed) {
    return (
      <main className="room-message">
        <p role="alert">방이 없어졌어요. 방장이 나갔을 수 있어요.</p>
        <Link to="/game">게임 플레이로 돌아가기</Link>
      </main>
    );
  }
  if (room === null || user === null) {
    return (
      <main className="room-message">
        <p role={error ? "alert" : undefined}>{error || "불러오는 중..."}</p>
        {error && <Link to="/game">게임 플레이로 돌아가기</Link>}
      </main>
    );
  }

  const onStart = async () => {
    const token = getToken();
    if (!token) return;
    setStarting(true);
    setActionError("");
    try {
      update(await startRoom(token, room.code));
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : "게임을 시작하지 못했어요");
    } finally {
      setStarting(false);
    }
  };

  const onLeave = async () => {
    const token = getToken();
    if (token && room.phase === "waiting") {
      try {
        await leaveRoom(token, room.code);
      } catch {
        // 나가기에 실패해도 화면은 나감
      }
    }
    navigate("/game");
  };

  if (room.phase === "waiting") {
    return (
      <RoomWaiting
        room={room}
        error={actionError || error}
        starting={starting}
        onStart={onStart}
        onLeave={onLeave}
      />
    );
  }

  return (
    <>
      <RoomPlay room={room} myId={user.id} />
      {room.phase === "finished" && room.ranking && (
        <RoomResult ranking={room.ranking} myId={user.id} onExit={onLeave} />
      )}
    </>
  );
}
