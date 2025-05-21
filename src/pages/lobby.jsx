import React from 'react'
import { useNavigate } from 'react-router-dom'
import './lobby.css'

export default function Lobby() {
  const navigate = useNavigate()

  return (
    <div className="lobby-wrap">
      <div className="lobby-content">
        {/* 나중에 지도 API를 통해 보여질 영역 */}
        <h2>Lobby Area (Map Placeholder)</h2>
      </div>
      <nav className="bottom-nav">
        <button className="nav-btn" onClick={() => console.log('Favorite clicked')}>
          <img src="/Favorite.png" alt="Favorite" />
        </button>
        <button className="nav-btn" onClick={() => console.log('Compass clicked')}>
          <img src="/icnCompas.png" alt="Compass" />
        </button>
        <button className="nav-btn center-btn" onClick={() => console.log('Plus clicked')}>
          <img src="/plus.png" alt="Plus" />
        </button>
        <button className="nav-btn" onClick={() => console.log('Maps clicked')}>
          <img src="/maps.png" alt="Maps" />
        </button>
        <button className="nav-btn" onClick={() => console.log('Menu clicked')}>
          <img src="/menu alt.png" alt="Menu" />
        </button>
      </nav>
    </div>
  )
}