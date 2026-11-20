import type { RefObject } from "react";
import type { CameraStatus } from "../hooks/useCamera";
import "../styles/components/CameraView.css";

interface CameraViewProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  status: CameraStatus;
  hint?: string;
}

// 웹캠 화면
export default function CameraView({
  videoRef,
  status,
  hint,
}: CameraViewProps) {
  return (
    <div className="camera-view">
      <video
        ref={videoRef}
        className="camera-view__video"
        autoPlay
        playsInline
        muted
      />
      {status !== "ready" && (
        <p className="camera-view__message">
          {status === "error"
            ? "카메라를 켤 수 없어요. 브라우저의 카메라 권한을 확인해 주세요"
            : "카메라를 켜는 중이에요..."}
        </p>
      )}
      {status === "ready" && hint && (
        <p className="camera-view__hint">{hint}</p>
      )}
    </div>
  );
}
