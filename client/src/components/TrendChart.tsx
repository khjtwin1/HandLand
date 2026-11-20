import "../styles/components/TrendChart.css";

interface TrendChartProps {
  points: { label: string; accuracy: number | null }[];
}

const WIDTH = 729;
const HEIGHT = 292;
const MIN = 70; // 세로축 아래 끝(%)
const MAX = 100;

const xOf = (i: number, n: number) =>
  14 + (i * (WIDTH - 28)) / Math.max(1, n - 1);
const yOf = (value: number) =>
  HEIGHT - ((Math.min(MAX, Math.max(MIN, value)) - MIN) / (MAX - MIN)) * HEIGHT;

// 일치도 추이 꺾은선 그래프 (기록이 없는 구간은 건너뜀)
export default function TrendChart({ points }: TrendChartProps) {
  const filled = points
    .map((p, i) => ({ ...p, i }))
    .filter(
      (p): p is { label: string; accuracy: number; i: number } =>
        p.accuracy !== null,
    );
  const path = filled
    .map((p) => `${xOf(p.i, points.length)},${yOf(p.accuracy)}`)
    .join(" ");
  const last = filled[filled.length - 1];

  return (
    <div className="trend-chart">
      <div className="trend-chart__y" aria-hidden="true">
        {[100, 90, 80, 70].map((v) => (
          <span key={v}>{v}%</span>
        ))}
      </div>
      <div className="trend-chart__plot">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-label="일치도 추이 그래프"
        >
          {[0, 1, 2, 3].map((n) => (
            <line
              key={n}
              x1="0"
              x2={WIDTH}
              y1={(n * HEIGHT) / 3}
              y2={(n * HEIGHT) / 3}
              className="trend-chart__grid"
            />
          ))}
          {filled.length > 1 && (
            <polyline points={path} className="trend-chart__line" />
          )}
          {filled.map((p) => (
            <circle
              key={p.i}
              cx={xOf(p.i, points.length)}
              cy={yOf(p.accuracy)}
              r={p === last ? 7 : 5}
              className="trend-chart__dot"
            />
          ))}
        </svg>
        {last && (
          <span
            className="trend-chart__tag"
            style={{ left: `${(xOf(last.i, points.length) / WIDTH) * 100}%` }}
          >
            {last.label} {Math.round(last.accuracy)}%
          </span>
        )}
        <div className="trend-chart__x">
          {points.map((p) => (
            <span key={p.label}>{p.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
