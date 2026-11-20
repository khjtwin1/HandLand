import { useEffect, useRef, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import Button from "./Button";
import "../styles/components/ProfileMenu.css";

// 우측 상단 프로필: 이름 첫 글자 + 누르면 내 정보, 로그아웃
// TODO: 프로필 이미지를 등록할 수 있게 되면 이미지가 있을 때 이미지로 표시
export default function ProfileMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 바깥을 누르거나 Esc 를 누르면 닫기
  useEffect(() => {
    if (!open) return;

    function handleClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  if (!user) return null;

  const initial = Array.from(user.name)[0] ?? "?";

  return (
    <div className="profile-menu" ref={menuRef}>
      <button
        type="button"
        className="profile-menu__avatar"
        aria-label="내 정보"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        {initial}
      </button>

      {open && (
        <div className="profile-menu__popup">
          <p className="profile-menu__name">{user.name}</p>
          <p className="profile-menu__info">
            Lv.{user.level} · 핸드코인 {user.coins}
          </p>
          <Button
            variant="outline"
            fullWidth
            className="profile-menu__logout"
            onClick={logout}
          >
            로그아웃
          </Button>
        </div>
      )}
    </div>
  );
}
