# Render 기본 환경에는 MediaPipe가 쓰는 시스템 라이브러리(libGLESv2 등)가 없어서 Docker로 배포한다
FROM python:3.11-slim

# MediaPipe / OpenCV 실행에 필요한 시스템 라이브러리
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgles2 libegl1 libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app
COPY pyproject.toml uv.lock .python-version README.md ./
COPY src ./src
COPY models ./models
COPY data ./data

RUN uv sync --frozen --no-dev

ENV PATH="/app/.venv/bin:$PATH"

# Render가 PORT 환경변수를 넣어 준다
CMD ["sh", "-c", "uvicorn server.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
