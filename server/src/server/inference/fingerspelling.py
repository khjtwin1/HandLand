import joblib

from server.inference.hand_tracking import BASE_DIR, HandTracker, normalize_landmarks

MODEL_FILE = BASE_DIR / "models" / "fingerspelling_rf.joblib"

_tracker = None     # 손 추적
_model = None       # 학습된 모델
_model_mtime = None # 새로 학습됐는지 확인용


def _get_tracker() -> HandTracker:
    global _tracker
    if _tracker is None:
        _tracker = HandTracker()
    return _tracker


def get_model():
    """모델 파일이 바뀌면(재학습) 서버 재시작 없이 다시 읽음. 파일이 없으면 None"""
    global _model, _model_mtime
    if not MODEL_FILE.exists():
        return None
    mtime = MODEL_FILE.stat().st_mtime
    if _model is None or mtime != _model_mtime:
        _model = joblib.load(MODEL_FILE)
        _model_mtime = mtime
    return _model


def predict_fingerspelling(image_bytes: bytes, target: str | None = None) -> dict:
    """
    웹캠 이미지(바이트)로 지문자를 판별.
    target: 지금 학습 중인 글자. 글자와 얼마나 같은지 accuracy(%) 돌려줌.
    """
    values = _get_tracker().extract_from_bytes(image_bytes)
    if values is None:      # 손이 화면에 안 잡힘
        return {"hand_detected": False, "letter": None, "confidence": 0.0, "accuracy": None}

    model = get_model()
    if model is None:
        raise FileNotFoundError("학습된 모델이 없어요. train_fingerspelling을 먼저 실행하세요")

    # 글자별 확률
    probs = model.predict_proba([normalize_landmarks(values)])[0]
    classes = list(model.classes_)
    best = int(probs.argmax())

    accuracy = None
    if target is not None:
        # 학습 중인 글자 정확도
        accuracy = round(float(probs[classes.index(target)]) * 100, 1) if target in classes else 0.0

    return {
        "hand_detected": True,
        "letter": classes[best],                      # 모델이 가장 비슷하다고 본 글자
        "confidence": round(float(probs[best]) * 100, 1),
        "accuracy": accuracy,
    }
