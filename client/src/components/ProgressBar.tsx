import "../styles/components/ProgressBar.css";

interface ProgressBarProps {
  value: number;
  max: number;
  label: string;
  variant?: "blue" | "light";
}

// 진행도 막대
export default function ProgressBar({
  value,
  max,
  label,
  variant = "blue",
}: ProgressBarProps) {
  const percentValue = max > 0 ? Math.min(100, (value / max) * 100) : 0;

  return (
    <div
      className={`progress-bar progress-bar--${variant}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
    >
      <div
        className="progress-bar__fill"
        style={{ width: `${percentValue}%` }}
      />
    </div>
  );
}
