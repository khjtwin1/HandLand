import { request } from "./client";

// 서버 POST /inference/fingerspelling 응답과 같은 모양
export interface FingerspellingResult {
  hand_detected: boolean;
  letter: string | null; // 모델이 가장 비슷하다고 본 글자
  confidence: number;
  accuracy: number | null; // 목표 글자와 일치하는 정도(%)
}

// 웹캠 사진(base64)을 보내 목표 글자와 얼마나 같은지 받음
export function predictFingerspelling(
  image: string,
  target: string,
): Promise<FingerspellingResult> {
  return request<FingerspellingResult>("/inference/fingerspelling", {
    method: "POST",
    body: { image, target },
  });
}
