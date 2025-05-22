import React from 'react';
import { Map, MapMarker } from 'react-kakao-maps-sdk';
import './lobby.css';

export default function Lobby() {
  return (
    <div className="lobby-wrap">
      <div className="lobby-content">
        <Map
          center={{ lat: 37.5665, lng: 126.9780 }}
          level={3}
          style={{ width: '100%', height: '100%' }}
        >
          <MapMarker position={{ lat: 37.5665, lng: 126.9780 }} />
        </Map>
      </div>

      <nav className="bottom-nav">
        <button className="nav-btn">
          <img src="/favorite.png" alt="Favorite" />
        </button>
        <button className="nav-btn">
          <img src="/icnCompas.png" alt="Compass" />
        </button>
        <button className="nav-btn center-btn">
          <img src="/plus.png" alt="Plus" />
        </button>
        <button className="nav-btn">
          <img src="/maps.png" alt="Maps" />
        </button>
        <button className="nav-btn">
          <img src="/menu alt.png" alt="Menu" />
        </button>
      </nav>
    </div>
  );
}
