import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { clearToken, fetchMe, getToken } from "../api/auth";
import type { User } from "../api/auth";
import { AuthContext } from "./AuthContext";

// 로그인한 사용자 정보를 앱 전체에서 쓰게 해준다
export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(() => getToken() !== null);

  // 새로고침해도 로그인 유지
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetchMe(token)
      .then(setUser)
      .catch(() => clearToken()) // 만료되었거나 잘못된 토큰
      .finally(() => setLoading(false));
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
