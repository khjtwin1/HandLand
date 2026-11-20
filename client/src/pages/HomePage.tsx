import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import chevronIcon from "../assets/icons/chevron-down.svg";
import { getToken } from "../api/auth";
import { ApiError } from "../api/client";
import { fetchHome } from "../api/learning";
import type { HomeData } from "../api/learning";
import HeroBanner from "../components/HeroBanner";
import RecentRecords from "../components/RecentRecords";
import ThemeCard from "../components/ThemeCard";
import TipBanners from "../components/TipBanners";
import WeakCards from "../components/WeakCards";
import { useAuth } from "../hooks/useAuth";
import "../styles/home.css";

// 로그인 후 처음 보이는 홈 화면
export default function HomePage() {
  const { logout } = useAuth();
  const [home, setHome] = useState<HomeData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    fetchHome(token)
      .then(setHome)
      .catch((e) => {
        // 토큰이 만료됐으면 다시 로그인
        if (e instanceof ApiError && e.status === 401) {
          logout();
          return;
        }
        setError(
          e instanceof ApiError ? e.message : "홈 화면을 불러오지 못했어요",
        );
      });
  }, [logout]);

  if (error) {
    return (
      <main className="home">
        <p className="home__message" role="alert">
          {error}
        </p>
      </main>
    );
  }
  if (home === null) {
    return (
      <main className="home">
        <p className="home__message">불러오는 중...</p>
      </main>
    );
  }

  const { flags } = home;

  return (
    <main className="home">
      <HeroBanner info={home.continue} />
      <TipBanners />

      {/* 탐험 현황 */}
      <section className="home__section" aria-labelledby="explore-title">
        <div className="home__section-header">
          <div>
            <h2 className="home__section-title" id="explore-title">
              탐험 현황
            </h2>
            <p className="home__section-desc">
              깃발 {flags.earned}개 획득
              {flags.to_next > 0 &&
                ` | 다음 깃발까지 ${flags.to_next}단계 남았어요`}
            </p>
          </div>
          {/* TODO: 탐험 지도 화면이 만들어지면 교체 */}
          <Link className="home__more" to="/map">
            탐험 지도 열기
            <img src={chevronIcon} alt="" />
          </Link>
        </div>
        <ul className="theme-list">
          {home.themes.map((theme) => (
            <ThemeCard key={theme.id} theme={theme} />
          ))}
        </ul>
      </section>

      {/* 학습 기록 */}
      <div className="home__records">
        <RecentRecords records={home.recent} />
        <WeakCards records={home.weak} />
      </div>
    </main>
  );
}
