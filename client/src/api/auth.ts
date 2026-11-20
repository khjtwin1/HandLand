import { request } from "./client";

export interface User {
  id: number;
  login_id: string;
  name: string;
  level: number;
  coins: number;
}

interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

const TOKEN_KEY = "handland_token";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function saveToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // 저장 실패 시 새로고침하면 로그아웃되지만 이번 접속은 계속 가능
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // 무시
  }
}

// 로그인: 성공하면 토큰을 저장하고 사용자 정보를 돌려줌
export async function login(loginId: string, password: string): Promise<User> {
  const data = await request<LoginResponse>("/auth/login", {
    method: "POST",
    body: { login_id: loginId, password },
  });
  saveToken(data.access_token);
  return data.user;
}

// 저장된 토큰으로 내 정보 조회(새로고침해도 로그인 유지)
export function fetchMe(token: string): Promise<User> {
  return request<User>("/auth/me", { token });
}
