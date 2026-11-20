import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { predictFingerspelling } from "../api/inference";
import type { FingerspellingResult } from "../api/inference";

const INTERVAL_MS = 700; // 사진을 서버로 보내는 간격

export function useFingerspelling(
  videoRef: RefObject<HTMLVideoElement | null>,
  target: string | null,
  active: boolean,
  onResult?: (result: FingerspellingResult) => void,
) {
  const [result, setResult] = useState<FingerspellingResult | null>(null);
  const [error, setError] = useState("");
  const busy = useRef(false);
  const callback = useRef(onResult);

  useEffect(() => {
    callback.current = onResult;
  });

  useEffect(() => {
    if (!active || !target) return;
    const canvas = document.createElement("canvas");

    const timer = setInterval(async () => {
      const video = videoRef.current;
      if (!video || video.videoWidth === 0 || busy.current) return;
      busy.current = true;
      try {
        canvas.width = 320;
        canvas.height = Math.round(
          (320 * video.videoHeight) / video.videoWidth,
        );
        canvas
          .getContext("2d")
          ?.drawImage(video, 0, 0, canvas.width, canvas.height);
        const data = await predictFingerspelling(
          canvas.toDataURL("image/jpeg", 0.7),
          target,
        );
        setResult(data);
        setError("");
        callback.current?.(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "인식에 실패했어요");
      } finally {
        busy.current = false;
      }
    }, INTERVAL_MS);

    return () => clearInterval(timer);
  }, [active, target, videoRef]);

  return { result: active ? result : null, error };
}
