import logoImage from '../assets/logo.svg'
import '../styles/components/Logo.css'

// 상단 로고: 마스코트 아이콘 + "핸드랜드" 글자
export default function Logo() {
  return (
    <div className="logo">
      <img className="logo__image" src={logoImage} alt="" />
      <span className="logo__text">핸드랜드</span>
    </div>
  )
}
