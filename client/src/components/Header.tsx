import { Link, NavLink } from "react-router-dom";
import searchIcon from "../assets/icons/search.svg";
import Logo from "./Logo";
import ProfileMenu from "./ProfileMenu";
import "../styles/components/Header.css";

const MENUS = [
  { to: "/map", label: "탐험 지도" },
  { to: "/practice", label: "수어연습" },
  { to: "/closet", label: "캐릭터 꾸미기" },
  { to: "/game", label: "게임 플레이" },
  { to: "/report", label: "학습 리포트" },
];

// 상단 메뉴
export default function Header() {
  return (
    <header className="header">
      <Link className="header__logo" to="/" aria-label="핸드랜드 홈">
        <Logo />
      </Link>

      <nav className="header__nav" aria-label="주요 메뉴">
        {MENUS.map((menu) => (
          <NavLink
            key={menu.to}
            to={menu.to}
            className={({ isActive }) =>
              isActive ? "header__link header__link--active" : "header__link"
            }
          >
            {menu.label}
          </NavLink>
        ))}
      </nav>

      <div className="header__actions">
        {/* TODO: 검색 기능 */}
        <button type="button" className="header__icon-button" aria-label="검색">
          <img src={searchIcon} alt="" />
        </button>
        <Link className="header__chip" to="/game">
          클래스 코드 입장
        </Link>
        <ProfileMenu />
      </div>
    </header>
  );
}
