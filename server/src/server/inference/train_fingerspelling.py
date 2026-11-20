"""지문자 모델 학습"""
import csv
from collections import Counter

import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split

from server.inference.hand_tracking import BASE_DIR, CSV_PATH, normalize_landmarks

MODEL_FILE = BASE_DIR / "models" / "fingerspelling_rf.joblib"


def load_data():
    """CSV -> (특징 X, 정답 글자 y)"""
    X, y = [], []
    with open(CSV_PATH, encoding="utf-8") as f:
        reader = csv.reader(f)
        next(reader)  # 헤더 건너뛰기
        for row in reader:
            if len(row) != 64:
                continue
            y.append(row[0])
            X.append(normalize_landmarks([float(v) for v in row[1:]]))
    return np.array(X), np.array(y)


def train():
    X, y = load_data()
    counts = Counter(y)
    print("글자별 데이터 수:", {str(k): v for k, v in counts.items()})
    if min(counts.values()) < 2:
        print("글자마다 최소 2개 이상 필요해요")
        return

    # 일부(25%)는 시험용으로 빼 두고 정확도 확인
    X_tr, X_te, y_tr, y_te = train_test_split(
        X, y, test_size=0.25, random_state=42, stratify=y
    )
    model = RandomForestClassifier(n_estimators=200, random_state=42)
    model.fit(X_tr, y_tr)
    acc = accuracy_score(y_te, model.predict(X_te))
    print(f"시험 정확도: {acc * 100:.1f}%  (학습 {len(X_tr)}개 / 시험 {len(X_te)}개)")

    # 저장할 모델은 전체 데이터로 다시 학습
    model.fit(X, y)
    MODEL_FILE.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, MODEL_FILE)
    print(f"저장 완료: {MODEL_FILE}")


if __name__ == "__main__":
    train()
