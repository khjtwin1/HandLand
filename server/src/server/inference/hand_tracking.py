"""
손 랜드마크 추출, 지문자 데이터 수집
-> s: 현재 손 모양 저장, q: 종료
"""
import csv
import sys
from pathlib import Path

import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision

BASE_DIR = Path(__file__).resolve().parents[3]
MODEL_PATH = BASE_DIR / "models" / "hand_landmarker.task"
CSV_PATH = BASE_DIR / "data" / "fingerspelling.csv"

# 기존 데이터를 수집할 때 화면을 좌우 반전했는지에 따라 맞춰야 함(확인!!!!!!)
FLIP_HORIZONTAL = True

# CSV 헤더
HEADER = ["label"] + [f"{axis}{i}" for i in range(21) for axis in "xyz"]


def normalize_landmarks(values):
    pts = np.array(values, dtype=np.float32).reshape(21, 3)
    pts = pts - pts[0]
    scale = float(np.abs(pts).max()) or 1.0
    return (pts / scale).flatten().tolist()


class HandTracker:
    def __init__(self, model_path: Path = MODEL_PATH):
        if not model_path.exists():
            raise FileNotFoundError(
                f"모델 파일이 없어요: {model_path}\n"
                "파일 상단 docstring의 curl 명령어로 내려받아 주세요."
            )
        options = vision.HandLandmarkerOptions(
            base_options=mp_python.BaseOptions(model_asset_path=str(model_path)),
            running_mode=vision.RunningMode.IMAGE,  # 이미지 한 장씩 처리
            num_hands=1,                            # 지문자는 한 손만
        )
        self.landmarker = vision.HandLandmarker.create_from_options(options)

    def extract(self, frame_bgr):
        """OpenCV 이미지(BGR)에서 랜드마크 63개 값 리스트를 반환. 손이 없으면 None"""
        rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        result = self.landmarker.detect(mp_image)
        if not result.hand_landmarks:
            return None
        hand = result.hand_landmarks[0]  # 첫 번째 손의 랜드마크 21개
        return [v for lm in hand for v in (lm.x, lm.y, lm.z)]

    def extract_from_bytes(self, image_bytes: bytes):
        """API로 받은 이미지 바이트에서 랜드마크 추출"""
        arr = np.frombuffer(image_bytes, dtype=np.uint8)
        frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if frame is None:
            return None
        if FLIP_HORIZONTAL:
            frame = cv2.flip(frame, 1)
        return self.extract(frame)


def collect(label: str, target: int = 10):
    """웹캠으로 label(예: 'ㄱ') 손 모양을 보며 스페이스바로 CSV에 한 줄씩 저장. target개 저장하면 자동 종료"""
    tracker = HandTracker()
    CSV_PATH.parent.mkdir(parents=True, exist_ok=True)
    is_new = not CSV_PATH.exists() or CSV_PATH.stat().st_size == 0

    cap = cv2.VideoCapture(0)
    saved = 0
    with open(CSV_PATH, "a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        if is_new:
            writer.writerow(HEADER)
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            if FLIP_HORIZONTAL:
                frame = cv2.flip(frame, 1)  # 거울처럼 보이게

            values = tracker.extract(frame)
            if values:
                h, w = frame.shape[:2]
                for i in range(0, len(values), 3):  # 랜드마크 위치에 점 찍기
                    cv2.circle(frame, (int(values[i] * w), int(values[i + 1] * h)), 4, (0, 255, 0), -1)

            # 화면 상태 표시 (영어만 가능): 손 인식 여부, 저장 개수, 조작 키
            status = "HAND OK" if values else "NO HAND"
            color = (0, 255, 0) if values else (0, 0, 255)
            cv2.putText(frame, f"{status}  saved: {saved}/{target}", (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)
            cv2.putText(frame, "SPACE or s: save   q: quit", (10, 60),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)

            cv2.imshow("collect", frame)
            key = cv2.waitKey(1) & 0xFF
            if key in (ord("s"), 32):
                if values:
                    writer.writerow([label] + values)
                    f.flush()
                    saved += 1
                    print(f"저장: {label} ({saved}/{target})")
                    if saved >= target:  # 목표 개수를 채우면 자동 종료
                        print(f"{label} 수집 완료!")
                        break
                else:
                    print("손이 인식되지 않아 저장하지 않았어요")
            elif key == ord("q"):
                break
    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("사용법: uv run python -m server.inference.hand_tracking <라벨 예: ㄱ> [개수, 기본 10]")
        sys.exit(1)
    collect(sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 10)
