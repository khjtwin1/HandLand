import type { RoomState } from "../api/rooms";
import { CARD_KIND_LABEL } from "../constants/rules";

interface RoomWaitingProps {
  room: RoomState;
  error: string;
  starting: boolean;
  onStart: () => void;
  onLeave: () => void;
}

// 대기실
export default function RoomWaiting({
  room,
  error,
  starting,
  onStart,
  onLeave,
}: RoomWaitingProps) {
  return (
    <main className="room-waiting">
      <aside className="room-waiting__side">
        <p className="room-waiting__code">참여코드 : {room.code}</p>
        <p className="room-waiting__kind">
          수어카드게임 - {CARD_KIND_LABEL[room.settings.card_kind]}
        </p>
        <p className="room-waiting__info">
          {room.settings.themes.join(", ")} · {room.settings.question_count}문제
          · 문제당 {room.settings.time_limit}초
        </p>
        {error && <p role="alert">{error}</p>}
        <div className="room-waiting__actions">
          {room.is_host ? (
            <button
              type="button"
              className="room-waiting__start"
              onClick={onStart}
              disabled={starting}
            >
              게임 시작
            </button>
          ) : (
            <p className="room-waiting__hint">
              방장이 시작하면 게임이 시작돼요
            </p>
          )}
          <button
            type="button"
            className="room-waiting__leave"
            onClick={onLeave}
          >
            나가기
          </button>
        </div>
      </aside>

      <section className="room-waiting__board" aria-label="참여자">
        <p className="room-waiting__count">
          {room.player_count} / {room.settings.max_players}명
        </p>
        <ul>
          {room.players.map((p) => (
            <li key={p.user_id}>
              {/* TODO: 참여자가 꾸민 캐릭터 이미지 */}
              <div className="room-waiting__avatar" aria-hidden="true" />
              <span>{p.name}</span>
              {p.is_host && <small>방장</small>}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
