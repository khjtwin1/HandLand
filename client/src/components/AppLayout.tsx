import { Outlet } from "react-router-dom";
import Header from "./Header";

// 로그인 후 위쪽 화면(상단 메뉴 + 본문)
export default function AppLayout() {
  return (
    <>
      <Header />
      <Outlet />
    </>
  );
}
