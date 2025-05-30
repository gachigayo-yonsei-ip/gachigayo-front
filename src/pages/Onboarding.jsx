// src/pages/Onboarding.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Onboarding() {
  const navigate = useNavigate()
  const [perm, setPerm] = useState('prompt') // prompt | granted | denied

  // ① 최초 진입 시 권한 상태 확인
  useEffect(() => {
    if (!navigator.permissions) return
    navigator.permissions.query({ name: 'geolocation' }).then((result) => {
      setPerm(result.state)
      if (result.state === 'granted') navigate('/language') // 허용돼 있으면 언어 선택 페이지로
    })
  }, [navigate])

  // ② 버튼 클릭 시 위치 요청
  const handleRequest = () => {
    navigator.geolocation.getCurrentPosition(
      () => navigate('/language'), // 성공 시 언어 선택 페이지로
      () => setPerm('denied') // 거부 시 텍스트 업데이트
    )
  }

  return (
    <div className="onboard-wrap">
      <div className="onboard-center">
        <div className="pin-icon" />
        <h2>Enable precise location</h2>
        <p className="subtitle">
          {perm === 'denied'
            ? 'Location access has been denied. Please enable it in your browser settings.'
            : 'To see attractions near you, please enable location access.'}
        </p>
      </div>

      <button className="cta-btn" onClick={handleRequest}>
        {perm === 'prompt' ? 'Enable Location' : 'Continue'}
      </button>
    </div>
  )
}
