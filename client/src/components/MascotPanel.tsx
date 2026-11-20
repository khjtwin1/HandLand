import mascotImage from '../assets/mascot.svg'
import '../styles/components/MascotPanel.css'

// 로그인 화면 왼쪽의 파란 소개 패널
export default function MascotPanel() {
  return (
    <section className="mascot-panel" aria-label="핸드랜드 소개">
      <p className="mascot-panel__eyebrow">수어가 마법이 되는 세계</p>
      <h2 className="mascot-panel__title">핸드랜드</h2>
      <p className="mascot-panel__desc">
        내 손으로 잠든 랜드를
        <br />
        하나씩 깨워 보세요
      </p>
      <img className="mascot-panel__mascot" src={mascotImage} alt="핸드랜드 마스코트" />
    </section>
  )
}
