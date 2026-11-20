import { useEffect, useState } from "react";
import { clearToken, fetchMe, getToken } from "./api/auth";
import type { User } from "./api/auth";
import Button from "./components/Button";
import LoginPage from "./pages/LoginPage";
import "./styles/app.css";

type AuthState =
  | { status: "loading" }
  | { status: "out" }
  | { status: "in"; user: User };

function App() {
  const [auth, setAuth] = useState<AuthState>(() =>
    getToken() ? { status: "loading" } : { status: "out" },
  );

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetchMe(token)
      .then((user) => setAuth({ status: "in", user }))
      .catch(() => {
        clearToken();
        setAuth({ status: "out" });
      });
  }, []);

  function handleLogout() {
    clearToken();
    setAuth({ status: "out" });
  }

  if (auth.status === "loading") {
    return <div className="app-loading">불러오는 중...</div>;
  }

  if (auth.status === "out") {
    return <LoginPage onLogin={(user) => setAuth({ status: "in", user })} />;
  }

  // TODO: 스테이지 맵 화면 교체
  return (
    <main className="home-placeholder">
      <h1 className="home-placeholder__title">
        {auth.user.name}님, 반갑습니다
      </h1>
      <p className="home-placeholder__desc">
        Lv.{auth.user.level} · 핸드코인 {auth.user.coins}
      </p>
      <Button variant="outline" onClick={handleLogout}>
        로그아웃
      </Button>
    </main>
  );
}

export default App;
