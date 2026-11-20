"""
웹캠으로 학습된 모델을 바로 시험.
손 모양을 바꿀 때마다 터미널에 '글자 확률%' 출력. q: 종료
"""
import cv2

from server.inference.fingerspelling import get_model
from server.inference.hand_tracking import FLIP_HORIZONTAL, HandTracker, normalize_landmarks


def main():
    tracker = HandTracker()
    model = get_model()
    if model is None:
        print("모델이 없어요. 먼저: uv run python -m server.inference.train_fingerspelling")
        return

    cap = cv2.VideoCapture(0)
    last = None
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        if FLIP_HORIZONTAL:
            frame = cv2.flip(frame, 1)

        values = tracker.extract(frame)
        if values:
            probs = model.predict_proba([normalize_landmarks(values)])[0]
            best = int(probs.argmax())
            text = f"{model.classes_[best]} {probs[best] * 100:.0f}%"
            if text != last:  # 바뀔 때만 출력
                print(text)
                last = text

        cv2.imshow("fingerspelling test (q: quit)", frame)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break
    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
