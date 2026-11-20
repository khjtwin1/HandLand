// 홈 화면 배너 문구 (수어, 청각장애 관련 짧은 안내)
// TODO: 문구는 팀/멘토 검토 후 확정
export interface Tip {
  title: string;
  lines: string[];
}

export const TIPS: Tip[] = [
  { title: "수어도 하나의 언어", lines: ["한국수어는 한국어와 동등한", "공용어예요"] },
  { title: "표정도 문법이에요", lines: ["표정과 고개 움직임도", "수어의 중요한 문법이에요"] },
  { title: "박수 대신 손 흔들기", lines: ["청각장애인은 박수 대신", "두 손을 흔들어 응원해요"] },
  { title: "눈을 맞추며 대화", lines: ["수어로 대화할 때는", "상대의 눈을 보며 이야기해요"] },
];
