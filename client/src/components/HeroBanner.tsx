import { Link } from "react-router-dom";
import arrowBlue from "../assets/icons/arrow-right-blue.svg";
import arrowWhite from "../assets/icons/arrow-right-white.svg";
import mascotImage from "../assets/mascot.svg";
import type { ContinueInfo } from "../api/learning";
import ProgressBar from "./ProgressBar";
import "../styles/components/HeroBanner.css";

interface HeroBannerProps {
  info: ContinueInfo | null;
}

// 홈 맨 위 파란 배너: 이어서 학습하기
export default function HeroBanner({ info }: HeroBannerProps) {
  // 모든 스테이지를 클리어한 경우
  if (info === null) {
    return (
      <section className="hero-banner" aria-label="이어서 학습하기">
        <div className="hero-banner__body">
          <p className="hero-banner__eyebrow">모든 랜드를 깨웠어요</p>
          <h1 className="hero-banner__title">탐험 완료!</h1>
          <div className="hero-banner__buttons">
            <Link
              className="hero-banner__button hero-banner__button--fill"
              to="/map"
            >
              탐험 지도 보기
              <img src={arrowBlue} alt="" />
            </Link>
          </div>
        </div>
        <img className="hero-banner__mascot" src={mascotImage} alt="" />
      </section>
    );
  }

  const stageName = `Stage ${String(info.chapter_no).padStart(2, "0")}`;
  const remaining = Math.max(info.total_words - info.learned_words, 0);

  return (
    <section className="hero-banner" aria-label="이어서 학습하기">
      <div className="hero-banner__body">
        <p className="hero-banner__eyebrow">이어서 학습하기</p>
        <p className="hero-banner__stage">{stageName}</p>
        <h1 className="hero-banner__title">{info.title}</h1>
        <p className="hero-banner__count">
          남은 단어 {remaining}개 | {info.learned_words} / {info.total_words}
        </p>
        <ProgressBar
          variant="light"
          value={info.learned_words}
          max={info.total_words}
          label="학습한 단어"
        />

        <div className="hero-banner__buttons">
          <Link
            className="hero-banner__button hero-banner__button--fill"
            to={`/stages/${info.stage_id}/learn`}
          >
            카메라로 이어하기
            <img src={arrowBlue} alt="" />
          </Link>
          <Link
            className="hero-banner__button hero-banner__button--outline"
            to={`/stages/${info.stage_id}/learn?camera=off`}
          >
            카메라없이 학습하기
            <img src={arrowWhite} alt="" />
          </Link>
        </div>
      </div>
      <img className="hero-banner__mascot" src={mascotImage} alt="" />
    </section>
  );
}
