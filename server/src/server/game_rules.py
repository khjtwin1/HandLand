"""게임 규칙 상수 지정"""

GREEN_AT = 90
ORANGE_AT = 70
CLEAR_AT = 70       # 스테이지 클리어 기준
COLLECT_AT = 90     # 카드 정확도가 이 이상일 시 도감 등록

COINS_PER_CLEAR = 100   # 처음 클리어 시 지급하는 핸드코인
XP_PER_CLEAR = 50       # 처음 클리어 시 얻는 경험치
XP_PER_LEVEL = 100      # 1레벨 올라가는 데 필요한 경험치


def island_status(best_accuracy: float) -> str:
    """최고 정확도로 섬 색 결정: 'green' | 'orange' | 'white'"""
    if best_accuracy >= GREEN_AT:
        return "green"
    if best_accuracy >= ORANGE_AT:
        return "orange"
    return "white"


def level_from_xp(xp: int) -> int:
    return xp // XP_PER_LEVEL + 1
