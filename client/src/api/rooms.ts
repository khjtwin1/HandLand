import { request } from "./client";

// 서버 /rooms 응답과 같은 모양
export type CardKind = "letter" | "word" | "sentence";
export type RoomPhase =
  | "waiting"
  | "rules"
  | "countdown"
  | "question"
  | "finished";

export interface RoomPlayerInfo {
  user_id: number;
  name: string;
  level: number;
  is_host: boolean;
  score: number;
}

export interface RoomQuestion {
  number: number;
  total: number;
  card: { id: number; kind: CardKind; text: string; video_url: string | null };
  winner: { user_id: number; name: string } | null; // 이미 맞힌 사람
}

export interface RoomState {
  code: string;
  status: "waiting" | "playing" | "finished";
  phase: RoomPhase;
  remaining: number | null; // 현재 단계의 남은 초
  is_host: boolean;
  settings: {
    max_players: number;
    card_kind: CardKind;
    question_count: number;
    time_limit: number;
    themes: string[];
  };
  player_count: number;
  players: RoomPlayerInfo[];
  question?: RoomQuestion;
  ranking?: (RoomPlayerInfo & { rank: number })[];
}

export interface CreateRoomBody {
  max_players: number;
  card_kind: CardKind;
  question_count: 5 | 10 | 15 | 20;
  time_limit: 10 | 20 | 30 | 60;
  theme_ids: number[];
}

export interface AnswerResult {
  accepted: boolean;
  reason?: "already_won" | "low_accuracy";
  points?: number;
  score?: number;
}

export const createRoom = (token: string, body: CreateRoomBody) =>
  request<RoomState>("/rooms", { method: "POST", body, token });

export const joinRoom = (token: string, code: string) =>
  request<RoomState>("/rooms/join", { method: "POST", body: { code }, token });

export const fetchRoom = (token: string, code: string) =>
  request<RoomState>(`/rooms/${code}`, { token });

export const startRoom = (token: string, code: string) =>
  request<RoomState>(`/rooms/${code}/start`, { method: "POST", token });

export const submitRoomAnswer = (
  token: string,
  code: string,
  accuracy: number,
) =>
  request<AnswerResult>(`/rooms/${code}/answer`, {
    method: "POST",
    body: { accuracy },
    token,
  });

export const leaveRoom = (token: string, code: string) =>
  request<{ left: boolean; room_closed?: boolean }>(`/rooms/${code}/leave`, {
    method: "POST",
    token,
  });
