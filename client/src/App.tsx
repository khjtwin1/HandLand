import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import RequireAuth from "./components/RequireAuth";
import AuthProvider from "./contexts/AuthProvider";
import { useAuth } from "./hooks/useAuth";
import ClosetPage from "./pages/ClosetPage";
import GamePage from "./pages/GamePage";
import HomePage from "./pages/HomePage";
import LearnPage from "./pages/LearnPage";
import LoginPage from "./pages/LoginPage";
import MapPage from "./pages/MapPage";
import PracticePage from "./pages/PracticePage";
import QuizPage from "./pages/QuizPage";
import ReportPage from "./pages/ReportPage";
import RoomPage from "./pages/RoomPage";
import "./styles/app.css";

// 이미 로그인했으면 홈으로
function LoginRoute() {
  const { user, loading, setUser } = useAuth();

  if (loading) {
    return <div className="app-loading">불러오는 중...</div>;
  }
  if (user) {
    return <Navigate to="/" replace />;
  }
  return <LoginPage onLogin={setUser} />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route element={<RequireAuth />}>
            {/* 문제 풀이는 상단 메뉴 없이 전체 화면으로 */}
            <Route path="/stages/:stageId/quiz" element={<QuizPage />} />
            {/* 게임 방(대기실, 진행)도 상단 메뉴 없는 전체 화면 */}
            <Route path="/game/:code" element={<RoomPage />} />
            <Route element={<AppLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/map" element={<MapPage />} />
              <Route path="/practice" element={<PracticePage />} />
              <Route path="/stages/:stageId/learn" element={<LearnPage />} />
              <Route path="/closet" element={<ClosetPage />} />
              <Route path="/report" element={<ReportPage />} />
              <Route path="/game" element={<GamePage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
