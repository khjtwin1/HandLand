import "../styles/components/QuestCards.css";

// 핸드코인 모으는 방법
// TODO: 퀘스트 아이콘 이미지, 1:1 매칭 코인 지급 서버 연결, 티어 시스템
const QUESTS = [
  {
    badge: "스테이지 클리어",
    text: "스테이지를 끝까지 마치면",
    strong: "30코인",
    tail: "을 받아요",
  },
  {
    badge: "1:1 매칭",
    text: "참여하면 20코인, 이기면",
    strong: "50코인",
    tail: "을 받아요",
  },
  {
    badge: "티어 올리기",
    text: "매일 학습해서 플래티넘이 되면",
    strong: "차콜 베레모",
    tail: "가 열려요",
  },
];

// 핸드코인 모으기 안내 카드
export default function QuestCards() {
  return (
    <section className="quest-cards" aria-labelledby="quest-title">
      <h2 id="quest-title">핸드코인 모으기</h2>
      <ul>
        {QUESTS.map((q) => (
          <li key={q.badge}>
            <span className="quest-cards__icon" aria-hidden="true" />
            <h3>{q.badge}</h3>
            <p>
              {q.text} <strong>{q.strong}</strong>
              {q.tail}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
