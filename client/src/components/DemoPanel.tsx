import "../styles/components/DemoPanel.css";

interface DemoPanelProps {
  videoUrl: string | null;
  description?: string | null;
}

// 시범 영상 패널
export default function DemoPanel({ videoUrl, description }: DemoPanelProps) {
  return (
    <section className="demo-panel" aria-label="시범 영상">
      <span className="demo-panel__chip">시범 영상</span>
      <div className="demo-panel__video">
        {videoUrl ? (
          <video src={videoUrl} controls loop muted playsInline />
        ) : (
          // TODO: 시범 영상이 준비되면 video_url 로 재생
          <p>시범 영상을 준비 중이에요</p>
        )}
      </div>
      <p className="demo-panel__desc">
        동작 설명 <span>{description ?? "준비 중이에요"}</span>
      </p>
    </section>
  );
}
