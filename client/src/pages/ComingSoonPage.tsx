import "../styles/app.css";

interface ComingSoonPageProps {
  title: string;
}

// 아직 만들지 않은 화면 자리
// TODO: 화면이 만들어지면 교체
export default function ComingSoonPage({ title }: ComingSoonPageProps) {
  return (
    <main className="coming-soon">
      <h1 className="coming-soon__title">{title}</h1>
      <p className="coming-soon__desc">준비 중이에요</p>
    </main>
  );
}
