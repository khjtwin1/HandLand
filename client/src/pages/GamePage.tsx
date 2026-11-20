import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { getToken } from "../api/auth";
import { ApiError } from "../api/client";
import { fetchHome } from "../api/learning";
import type { ThemeSummary } from "../api/learning";
import { createRoom, joinRoom } from "../api/rooms";
import type { CardKind } from "../api/rooms";
import { CARD_KIND_LABEL } from "../constants/rules";
import "../styles/game.css";

const QUESTION_COUNTS = [5, 10, 15, 20] as const;
const TIME_LIMITS = [10, 20, 30, 60] as const;
const READY_KINDS: CardKind[] = ["letter"];

// 게임 플레이
export default function GamePage() {
  const navigate = useNavigate();
  const [themes, setThemes] = useState<ThemeSummary[]>([]);
  const [code, setCode] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [cardKind, setCardKind] = useState<CardKind>("letter");
  const [questionCount, setQuestionCount] = useState<5 | 10 | 15 | 20>(10);
  const [timeLimit, setTimeLimit] = useState<10 | 20 | 30 | 60>(20);
  const [themeIds, setThemeIds] = useState<number[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetchHome(token)
      .then((home) => {
        const ready = home.themes.filter((t) => t.status !== "coming_soon");
        setThemes(ready);
        setThemeIds(ready.slice(0, 1).map((t) => t.id));
      })
      .catch(() => setError("테마를 불러오지 못했어요"));
  }, []);

  const run = async (action: (token: string) => Promise<{ code: string }>) => {
    const token = getToken();
    if (!token) return;
    setBusy(true);
    setError("");
    try {
      const room = await action(token);
      navigate(`/game/${room.code}`);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "잠시 후 다시 시도해 주세요",
      );
      setBusy(false);
    }
  };

  const onJoin = (e: FormEvent) => {
    e.preventDefault();
    if (code.trim()) run((token) => joinRoom(token, code.trim()));
  };

  const onCreate = (e: FormEvent) => {
    e.preventDefault();
    run((token) =>
      createRoom(token, {
        max_players: maxPlayers,
        card_kind: cardKind,
        question_count: questionCount,
        time_limit: timeLimit,
        theme_ids: themeIds,
      }),
    );
  };

  const toggleTheme = (id: number) =>
    setThemeIds((ids) =>
      ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id],
    );

  return (
    <main className="game-lobby">
      <h1>게임 플레이</h1>
      <p className="game-lobby__desc">
        친구들과 수어 카드를 가장 먼저 맞혀 보는 마법 대결이에요.
      </p>
      {error && (
        <p className="game-lobby__error" role="alert">
          {error}
        </p>
      )}

      <div className="game-lobby__grid">
        <form className="game-lobby__card" onSubmit={onJoin}>
          <h2>참여 코드로 입장</h2>
          <label>
            참여 코드
            <input
              value={code}
              maxLength={7}
              placeholder="ABCDEFG"
              autoComplete="off"
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
          </label>
          <button
            type="submit"
            className="game-button"
            disabled={busy || !code.trim()}
          >
            입장하기
          </button>
        </form>

        <form className="game-lobby__card" onSubmit={onCreate}>
          <h2>방 만들기</h2>
          <label>
            최대 인원 (2~20명)
            <input
              type="number"
              min={2}
              max={20}
              value={maxPlayers}
              onChange={(e) =>
                setMaxPlayers(
                  Math.min(20, Math.max(2, Number(e.target.value) || 2)),
                )
              }
            />
          </label>

          <fieldset>
            <legend>카드 종류</legend>
            {(Object.keys(CARD_KIND_LABEL) as CardKind[]).map((k) => (
              <label key={k} className="game-lobby__choice">
                <input
                  type="radio"
                  name="kind"
                  checked={cardKind === k}
                  disabled={!READY_KINDS.includes(k)}
                  onChange={() => setCardKind(k)}
                />
                {CARD_KIND_LABEL[k]}
                {!READY_KINDS.includes(k) && <small> 준비 중</small>}
              </label>
            ))}
          </fieldset>

          <fieldset>
            <legend>문제 수</legend>
            {QUESTION_COUNTS.map((n) => (
              <label key={n} className="game-lobby__choice">
                <input
                  type="radio"
                  name="count"
                  checked={questionCount === n}
                  onChange={() => setQuestionCount(n)}
                />
                {n}개
              </label>
            ))}
          </fieldset>

          <fieldset>
            <legend>문제당 제한 시간</legend>
            {TIME_LIMITS.map((n) => (
              <label key={n} className="game-lobby__choice">
                <input
                  type="radio"
                  name="time"
                  checked={timeLimit === n}
                  onChange={() => setTimeLimit(n)}
                />
                {n}초
              </label>
            ))}
          </fieldset>

          <fieldset>
            <legend>테마 (여러 개 선택 가능)</legend>
            {themes.map((t) => (
              <label key={t.id} className="game-lobby__choice">
                <input
                  type="checkbox"
                  checked={themeIds.includes(t.id)}
                  onChange={() => toggleTheme(t.id)}
                />
                {t.name}
              </label>
            ))}
          </fieldset>

          <button
            type="submit"
            className="game-button"
            disabled={busy || themeIds.length === 0}
          >
            방 만들기
          </button>
        </form>
      </div>
    </main>
  );
}
