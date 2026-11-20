import { useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";

export function useAuth() {
  const value = useContext(AuthContext);
  if (value === null) {
    throw new Error("useAuth 는 AuthProvider 안에서만 쓸 수 있어요");
  }
  return value;
}
