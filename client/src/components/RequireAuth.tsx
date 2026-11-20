import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

// 로그인하지 않았으면 로그인 화면으로
export default function RequireAuth() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="app-loading">불러오는 중...</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}
