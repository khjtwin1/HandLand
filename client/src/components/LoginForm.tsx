import { useState } from 'react'
import type { FormEvent } from 'react'
import { login } from '../api/auth'
import type { User } from '../api/auth'
import { ApiError } from '../api/client'
import Button from './Button'
import TextField from './TextField'
import '../styles/components/LoginForm.css'

interface LoginFormProps {
  onSuccess: (user: User) => void
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault() // 페이지 새로고침 방지
    if (loading) return

    // 빈칸 검사
    if (!loginId.trim() || !password) {
      setError('아이디와 비밀번호를 입력해 주세요')
      return
    }

    setError('')
    setLoading(true)
    try {
      const user = await login(loginId.trim(), password)
      onSuccess(user)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '문제가 생겼어요. 잠시 후 다시 시도해 주세요')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit} noValidate>
      <h1 className="login-form__title">로그인</h1>
      <p className="login-form__desc">기관에서 발급받은 계정으로 로그인해 주세요</p>

      <TextField
        id="login-id"
        label="아이디"
        value={loginId}
        onChange={(e) => setLoginId(e.target.value)}
        autoComplete="username"
        placeholder="아이디를 입력하세요"
      />
      <TextField
        id="login-password"
        label="비밀번호"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
        placeholder="비밀번호를 입력하세요"
      />

      {error && (
        <p className="login-form__error" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" fullWidth disabled={loading}>
        {loading ? '로그인 중...' : '로그인'}
      </Button>

      <p className="login-form__footer">
        아직 계정이 없나요?
        {/* TODO: 회원가입 화면이 만들어지면 연결 */}
        <a className="login-form__link" href="#signup">
          회원가입
        </a>
      </p>
    </form>
  )
}
