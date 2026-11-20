import "../styles/components/StatCard.css";

interface StatCardProps {
  label: string;
  value: string;
  sub: string;
  up?: boolean;
}

// 리포트 요약 카드
export default function StatCard({
  label,
  value,
  sub,
  up = false,
}: StatCardProps) {
  return (
    <div className="stat-card">
      <dt>{label}</dt>
      <dd>
        <span className="stat-card__value">{value}</span>
        <span
          className={
            up ? "stat-card__sub stat-card__sub--up" : "stat-card__sub"
          }
        >
          {sub}
        </span>
      </dd>
    </div>
  );
}
