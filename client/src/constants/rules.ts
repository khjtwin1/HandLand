// 학습 규칙 (서버 game_rules.py 와 맞춰 쓴다)
export const CLEAR_AT = 70; // 단어를 성공으로 보는 정확도(%)
export const PASS_AT = 70; // 시도 기록에서 '통과'로 보는 정확도(%)

// 문제 풀이 규칙: 화면 안에서만 동작하고 서버에는 결과만 보낸다
export const MAX_LIVES = 3;
export const COMBO_BONUS_AT = 3; // 이 횟수 연속 성공하면 EXP 2배 표시
export const QUESTION_SECONDS = 15; // 시간 제한을 켰을 때 한 문제 제한 시간
// TODO: 콤보 EXP 2배를 서버에 반영하기

// 마법 대결(카드게임): 서버 room_rules.py 와 맞춰 쓴다
export const ROOM_WIN_AT = 70; // 문제를 맞힌 것으로 인정하는 정확도(%)
export const ROOM_POLL_MS = 1000; // 방 상태를 다시 불러오는 간격
export const CARD_KIND_LABEL = { letter: "글자카드", word: "단어카드", sentence: "문장카드" } as const;
