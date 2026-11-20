import type { ReactNode } from "react";
import "../styles/components/RecordPanel.css";

interface RecordPanelProps {
  title: string;
  aside: string;
  asideMuted?: boolean;
  children: ReactNode;
}

// 홈 아래쪽의 테두리 있는 목록 카드 틀
export default function RecordPanel({
  title,
  aside,
  asideMuted = false,
  children,
}: RecordPanelProps) {
  return (
    <section className="record-panel">
      <header className="record-panel__header">
        <h2 className="record-panel__title">{title}</h2>
        <span
          className={
            asideMuted
              ? "record-panel__aside record-panel__aside--muted"
              : "record-panel__aside"
          }
        >
          {aside}
        </span>
      </header>
      {children}
    </section>
  );
}
