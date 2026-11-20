import type { User } from '../api/auth'
import Logo from '../components/Logo'
import LoginForm from '../components/LoginForm'
import MascotPanel from '../components/MascotPanel'
import '../styles/login.css'

interface LoginPageProps {
  onLogin: (user: User) => void
}

// 로그인 화면: 왼쪽 소개 패널 + 오른쪽 로그인 폼
export default function LoginPage({ onLogin }: LoginPageProps) {
  return (
    <div className="login-page">
      <div className="login-page__panel">
        <MascotPanel />
      </div>
      <main className="login-page__main">
        <div className="login-page__logo">
          <Logo />
        </div>
        <LoginForm onSuccess={onLogin} />
      </main>
    </div>
  )
}
