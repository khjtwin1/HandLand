import { useCallback, useEffect, useState } from "react";
import { getToken } from "../api/auth";
import { ApiError } from "../api/client";
import { fetchRoom } from "../api/rooms";
import type { RoomState } from "../api/rooms";
import { ROOM_POLL_MS } from "../constants/rules";

export function useRoom(code: string) {
  const [room, setRoom] = useState<RoomState | null>(null);
  const [error, setError] = useState("");
  const [closed, setClosed] = useState(false); // 방이 사라짐 (방장이 나감)

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    let stopped = false;

    const load = () =>
      fetchRoom(token, code)
        .then((data) => {
          if (stopped) return;
          setRoom(data);
          setError("");
        })
        .catch((e) => {
          if (stopped) return;
          if (e instanceof ApiError && e.status === 404) {
            setClosed(true);
            return;
          }
          setError(
            e instanceof ApiError ? e.message : "방 정보를 불러오지 못했어요",
          );
        });

    load();
    const timer = setInterval(load, ROOM_POLL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [code]);

  const update = useCallback((next: RoomState) => setRoom(next), []);

  return { room, error, closed, update };
}
