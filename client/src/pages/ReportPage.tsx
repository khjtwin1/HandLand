import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getToken } from "../api/auth";
import { ApiError } from "../api/client";
import { downloadReportCsv, fetchReport } from "../api/learning";
import type { Report, ReportPeriod } from "../api/learning";
import StatCard from "../components/StatCard";
import TrendChart from "../components/TrendChart";
import "../styles/report.css";

const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

// 학습 리포트 화면
export default function ReportPage() {
  const [period, setPeriod] = useState<ReportPeriod>("week");
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetchReport(token, period)
      .then(setReport)
      .catch((e) =>
        setError(
          e instanceof ApiError ? e.message : "리포트를 불러오지 못했어요",
        ),
      );
  }, [period]);

  const downloadCsv = async () => {
    const token = getToken();
    if (!token) return;
    try {
      await downloadReportCsv(token);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "CSV를 내려받지 못했어요");
    }
  };

  if (error || report === null) {
    return (
      <main className="report">
        <p className="report__message" role={error ? "alert" : undefined}>
          {error || "불러오는 중..."}
        </p>
      </main>
    );
  }

  const { summary } = report;
  const [, month, day] = report.base_date.split("-");
  const unit = period === "week" ? "주" : "개월";

  return (
    <main className="report">
      <header className="report__header">
        <div>
          <h1>학습 리포트</h1>
          <p>
            {Number(month)}월 {Number(day)}일 기준 최근 8{unit}
          </p>
        </div>
        {/* TODO: 리포트 마스코트 이미지 */}
        <div className="report__tabs" role="tablist">
          {(["week", "month"] as const).map((p) => (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={period === p}
              className={
                period === p ? "report__tab report__tab--active" : "report__tab"
              }
              onClick={() => setPeriod(p)}
            >
              {p === "week" ? "주간" : "월간"}
            </button>
          ))}
        </div>
      </header>

      <dl className="report__stats">
        <StatCard
          up
          label="클리어 스테이지"
          value={`${summary.cleared_stages}개`}
          sub={`이번 주 ${summary.cleared_this_week}개 늘었어요`}
        />
        <StatCard
          up={(summary.avg_accuracy_delta ?? 0) > 0}
          label="평균 일치도"
          value={
            summary.avg_accuracy === null
              ? "--"
              : `${Math.round(summary.avg_accuracy)}%`
          }
          sub={
            summary.avg_accuracy_delta === null
              ? "지난주 기록이 아직 없어요"
              : `지난주보다 ${signed(Math.round(summary.avg_accuracy_delta))}%`
          }
        />
        <StatCard
          label="누적 학습 시간"
          value={`${Math.floor(summary.study_minutes / 60)}시간 ${summary.study_minutes % 60}분`}
          sub={`주 평균 ${summary.study_minutes_per_week}분`}
        />
        <StatCard
          label="획득 깃발"
          value={`${summary.flags}개`}
          sub={
            summary.stages_to_next_flag > 0
              ? `다음 깃발까지 ${summary.stages_to_next_flag}단계`
              : "모든 깃발을 모았어요"
          }
        />
      </dl>

      <div className="report__body">
        <section className="report__panel" aria-labelledby="trend-title">
          <h2 id="trend-title">동작 일치도 추이</h2>
          <p className="report__sub">
            {period === "week" ? "주별" : "월별"} 평균
            {report.trend_from !== null &&
              report.trend_to !== null &&
              ` · 8${unit} 동안 ${Math.round(report.trend_from)}%에서 ${Math.round(report.trend_to)}%로 바뀌었어요`}
          </p>
          <TrendChart points={report.trend} />
        </section>

        <div className="report__side">
          <section className="report__weak" aria-labelledby="weak-title">
            <div className="report__weak-header">
              <h2 id="weak-title">다시 연습할 동작</h2>
              <span>일치도 낮은 순</span>
            </div>
            {report.weak.length === 0 ? (
              <p className="report__empty">아직 학습 기록이 없어요</p>
            ) : (
              <ul>
                {report.weak.map((w) => (
                  <li key={w.card_id}>
                    <span>{w.text}</span>
                    <span>{Math.round(w.accuracy)}%</span>
                    <Link to={`/stages/${w.stage_id}/learn`}>연습하기</Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="report__org" aria-labelledby="org-title">
            <h2 id="org-title">기관 리포트</h2>
            <p>
              학교·복지관 관리자는 학생별 진행률과 일치도를 내려받아 학습 관리에
              쓸 수 있어요.
            </p>
            {/* TODO: 기관 관리자가 학생별로 내려받는 기능 (지금은 내 기록만) */}
            <button type="button" onClick={downloadCsv}>
              CSV 내려받기
            </button>
          </section>
        </div>
      </div>
    </main>
  );
}
