"""마법 대결(카드게임) 규칙 상수 지정"""

ROOM_WIN_AT = 70            # 문제를 맞힌 것으로 인정하는 정확도(%)
POINTS_PER_WIN = 10         # 가장 먼저 맞힌 사람이 얻는 점수
RULES_SECONDS = 5           # 게임 시작 후 규칙 안내 시간
COUNTDOWN_SECONDS = 3       # 카운트다운
MIN_PLAYERS_TO_START = 1    # 시작에 필요한 최소 인원(혼자 테스트 시: 1, 시연: 2)
WIN_PAUSE_SECONDS = 2     # 누가 맞히면 이 시간 동안 결과를 보여 주고 바로 다음 문제로
