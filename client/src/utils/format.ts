// 챕터 번호 -> "stage 03"
export function stageLabel(chapterNo: number): string {
  return `stage ${String(chapterNo).padStart(2, "0")}`;
}

// 정확도 -> "94%"
export function percent(accuracy: number): string {
  return `${Math.round(accuracy)}%`;
}
