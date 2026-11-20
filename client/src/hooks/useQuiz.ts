import { useReducer } from "react";
import { CLEAR_AT, MAX_LIVES, QUESTION_SECONDS } from "../constants/rules";

export type QuizStatus = "playing" | "paused" | "clear" | "over";

export interface QuizState {
  ids: number[];
  index: number;
  lives: number;
  score: number;
  combo: number;
  best: number;
  passed: boolean;
  bests: Record<number, number>; // 카드별 최고 일치도
  remaining: number; // 남은 시간(초)
  status: QuizStatus;
}

type QuizAction =
  | { type: "accuracy"; accuracy: number }
  | { type: "skip" }
  | { type: "next" }
  | { type: "tick" }
  | { type: "pause" };

export function initQuiz(ids: number[]): QuizState {
  return {
    ids,
    index: 0,
    lives: MAX_LIVES,
    score: 0,
    combo: 0,
    best: 0,
    passed: false,
    bests: {},
    remaining: QUESTION_SECONDS,
    status: "playing",
  };
}

// 다음 문제로
function advance(state: QuizState, patch: Partial<QuizState>): QuizState {
  const next = {
    ...state,
    ...patch,
    best: 0,
    passed: false,
    remaining: QUESTION_SECONDS,
  };
  if (next.lives <= 0) return { ...next, status: "over" };
  if (state.index + 1 >= state.ids.length) return { ...next, status: "clear" };
  return { ...next, index: state.index + 1 };
}

// 실패(건너뛰기, 시간 초과): 목숨 1개 사용, 콤보 끊김
function fail(state: QuizState): QuizState {
  return advance(state, { lives: state.lives - 1, combo: 0 });
}

function reducer(state: QuizState, action: QuizAction): QuizState {
  if (action.type === "pause") {
    if (state.status === "playing") return { ...state, status: "paused" };
    if (state.status === "paused") return { ...state, status: "playing" };
    return state;
  }
  if (state.status !== "playing") return state;
  if (action.type === "next") return state.passed ? advance(state, {}) : state;
  if (state.passed) return state;

  switch (action.type) {
    case "accuracy": {
      const id = state.ids[state.index];
      const best = Math.max(state.best, action.accuracy);
      const bests = {
        ...state.bests,
        [id]: Math.max(state.bests[id] ?? 0, action.accuracy),
      };
      if (best < CLEAR_AT) return { ...state, best, bests };
      // 성공: 점수 += 일치도 * 10
      return {
        ...state,
        best,
        bests,
        passed: true,
        score: state.score + Math.round(best * 10),
        combo: state.combo + 1,
      };
    }
    case "skip":
      return fail(state);
    case "tick":
      return state.remaining <= 1
        ? fail(state)
        : { ...state, remaining: state.remaining - 1 };
  }
}

// 문제 풀이 진행 상태(목숨, 점수, 콤보, 시간)
export function useQuiz(ids: number[]) {
  return useReducer(reducer, ids, initQuiz);
}
