import type { RoomState } from "../api/rooms";

interface RoomResultProps {
  ranking: NonNullable<RoomState["ranking"]>;
  myId: number;
  onExit: () => void;
}

// 게임이 끝났을 때 순위 팝업
export default function RoomResult({ ranking, myId, onExit }: RoomResultProps) {
  return (
    <div
      className="room-result"
      role="dialog"
      aria-modal="true"
      aria-labelledby="room-result-title"
    >
      <div className="room-result__box">
        <h2 id="room-result-title">게임 끝!</h2>
        <ol>
          {ranking.map((p) => (
            <li
              key={p.user_id}
              className={p.user_id === myId ? "room-result__me" : undefined}
            >
              <span>{p.rank}위</span>
              <span>{p.name}</span>
              <span>{p.score}점</span>
            </li>
          ))}
        </ol>
        <button type="button" className="game-button" onClick={onExit}>
          나가기
        </button>
      </div>
    </div>
  );
}
