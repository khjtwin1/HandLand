import type { ButtonHTMLAttributes } from 'react'
import '../styles/components/Button.css'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline'
  fullWidth?: boolean
}

// 둥근 알약 모양 버튼 (primary: 파랑 채움 / outline: 테두리만)
export default function Button({
  variant = 'primary',
  fullWidth = false,
  className = '',
  ...buttonProps
}: ButtonProps) {
  const classes = ['button', `button--${variant}`, fullWidth ? 'button--full' : '', className]
    .filter(Boolean)
    .join(' ')
  return <button className={classes} {...buttonProps} />
}
