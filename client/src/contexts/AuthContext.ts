import { createContext } from "react";
import type { User } from "../api/auth";

export interface AuthContextValue {
  user: User | null;
  loading: boolean; // 저장된 토큰으로 내 정보를 불러오는 중
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
