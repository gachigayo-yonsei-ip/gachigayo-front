import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Map } from 'react-kakao-maps-sdk';
import './lobby.css';

export default function Lobby() {
  const navigate = useNavigate();

  // Kakao Map SDK 동적 로딩 (필요 시)
  useEffect(() => {
    const script = document.createElement('script');
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${import.meta.env.VITE_KAKAO_API_KEY}&libraries=services`;
    script.async = true;
    document.head.appendChild(script);
    return () => document.head.removeChild(script);
  }, []);

  return (
    <div className="lobby-wrap">
      <div className="lobby-content">
        {/* ✅ Kakao Map 표시 영역 */}
        <Map
          center={{ lat: 37.5665, lng: 126.9780 }} // 서울 시청 예시
          style={{ width: '100%', height: '500px' }}
          level={3}
        />
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
  );
}
