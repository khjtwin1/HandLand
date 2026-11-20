import type { InputHTMLAttributes } from 'react'
import '../styles/components/TextField.css'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
}

// 라벨이 붙은 입력창 (라벨 클릭 시 입력창에 포커스)
export default function TextField({ label, id, ...inputProps }: TextFieldProps) {
  return (
    <div className="text-field">
      <label className="text-field__label" htmlFor={id}>
        {label}
      </label>
      <input className="text-field__input" id={id} {...inputProps} />
    </div>
  )
}
