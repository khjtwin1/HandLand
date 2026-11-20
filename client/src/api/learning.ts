import { ApiError, BASE_URL, request } from "./client";

// 서버 GET /learning/home 응답과 같은 모양
export interface ContinueInfo {
  stage_id: number;
  theme_id: number;
  theme_name: string;
  chapter_no: number;
  title: string;
  learned_words: number;
  total_words: number;
}

export type ThemeStatus =
  | "in_progress"
  | "started"
  | "not_started"
  | "done"
  | "locked"
  | "coming_soon"; // 아직 학습 데이터가 없는 대륙

export interface ThemeSummary {
  id: number;
  name: string;
  learned: number;
  total: number;
  status: ThemeStatus;
}

export interface RecentRecord {
  card_id: number;
  text: string;
  chapter_no: number;
  accuracy: number;
}

export interface WeakRecord {
  card_id: number;
  text: string;
  stage_id: number;
  accuracy: number;
}

export interface HomeData {
  continue: ContinueInfo | null; // 모두 클리어했으면 null
  flags: { earned: number; to_next: number };
  themes: ThemeSummary[];
  recent: RecentRecord[];
  weak: WeakRecord[];
}

// 홈 화면 데이터
export function fetchHome(token: string): Promise<HomeData> {
  return request<HomeData>("/learning/home", { token });
}

// 서버 GET /learning/map 응답과 같은 모양
export type StageStatus = "cleared" | "current" | "waiting" | "locked";
export type WordState = "done" | "in_progress" | "waiting";

export interface MapWord {
  card_id: number;
  text: string;
  state: WordState;
}

export interface MapStage {
  id: number;
  chapter_no: number;
  kind: "letter" | "word" | "sentence" | "review" | "quest";
  title: string;
  description: string | null;
  best_accuracy: number;
  status: StageStatus;
  locked: boolean;
  words: MapWord[];
}

export interface Continent {
  id: number;
  name: string;
  ready: boolean; // false면 준비 중인 대륙
  locked: boolean;
  cleared: number;
  total: number;
  stages: MapStage[];
}

export interface MapData {
  flags: { earned: number; total: number };
  continents: Continent[];
  current_stage_id: number | null;
}

export function fetchMap(token: string): Promise<MapData> {
  return request<MapData>("/learning/map", { token });
}

// 서버 GET /learning/stages/{id} 응답과 같은 모양
export interface StageCardInfo {
  id: number;
  kind: string;
  text: string;
  video_url: string | null;
  image_url: string | null; // 올바른 수어 이미지
  description: string | null; // 동작 설명
}

export interface StageDetail {
  id: number;
  title: string;
  kind: string;
  description: string | null;
  chapter_no: number;
  theme_name: string;
  quest_name: string | null; // 이름 퀘스트일 때만 내 이름
  cards: StageCardInfo[];
}

export function fetchStage(
  token: string,
  stageId: number,
): Promise<StageDetail> {
  return request<StageDetail>(`/learning/stages/${stageId}`, { token });
}

// 서버 POST /learning/stages/{id}/result
export interface CardResult {
  card_id: number;
  accuracy: number;
}

export interface StageResult {
  stage_accuracy: number;
  best_accuracy: number;
  cleared: boolean;
  first_clear: boolean;
  coins_earned: number;
  total_coins: number;
  level: number;
  new_cards: { id: number; text: string }[];
}

export function submitStageResult(
  token: string,
  stageId: number,
  results: CardResult[],
  durationSeconds: number,
): Promise<StageResult> {
  return request<StageResult>(`/learning/stages/${stageId}/result`, {
    method: "POST",
    token,
    body: { results, duration_seconds: durationSeconds },
  });
}

// 서버 GET /learning/report 응답과 같은 모양
export type ReportPeriod = "week" | "month";

export interface Report {
  period: ReportPeriod;
  base_date: string; // YYYY-MM-DD
  summary: {
    cleared_stages: number;
    cleared_this_week: number;
    avg_accuracy: number | null;
    avg_accuracy_delta: number | null;
    study_minutes: number;
    study_minutes_per_week: number;
    flags: number;
    stages_to_next_flag: number;
  };
  trend: { label: string; accuracy: number | null }[];
  trend_from: number | null;
  trend_to: number | null;
  weak: WeakRecord[];
}

export function fetchReport(
  token: string,
  period: ReportPeriod,
): Promise<Report> {
  return request<Report>(`/learning/report?period=${period}`, { token });
}

// 학습 기록 CSV 내려받기
export async function downloadReportCsv(token: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/learning/report.csv`, {
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => null);
  if (!response || !response.ok) {
    throw new ApiError(response?.status ?? 0, "CSV를 내려받지 못했어요");
  }
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = "handland_report.csv";
  link.click();
  URL.revokeObjectURL(url);
}
