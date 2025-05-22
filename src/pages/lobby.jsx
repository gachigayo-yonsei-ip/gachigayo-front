import React, { useState, useEffect } from 'react'
import { Map, MapMarker } from 'react-kakao-maps-sdk'
import './lobby.css'

export default function Lobby() {
  const [coords, setCoords] = useState({ lat: 37.5665, lng: 126.9780 })
  const [places, setPlaces] = useState([])

  // ① 사용자 현재 위치 가져오기
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          })
        },
        (err) => {
          console.error('위치 정보를 가져올 수 없습니다.', err)
        }
      )
    }
  }, [])

  // ② 서버에서 장소 목록(fetch) 받아오기
  useEffect(() => {
    fetch('http://localhost:3000/places')
      .then((res) => res.json())
      .then((data) => {
        // lat/lon이 있는 항목만 필터링
        const validPlaces = data.filter((item) => item.lat && item.lon)
        setPlaces(validPlaces)
      })
      .catch((err) => {
        console.error('장소 목록을 불러오는 중 에러가 발생했습니다.', err)
      })
  }, [])

  return (
    <div className="lobby-wrap">
      <div className="lobby-content">
        <Map
          center={coords}
          level={3}
          style={{ width: '100%', height: '100%' }}
        >
          {/* 사용자 현위치 */}
          <MapMarker position={coords} />

          {/* 서버에서 불러온 장소들 표시 */}
          {places.map((place) => (
            <MapMarker
              key={place.id}
              position={{ lat: place.lat, lng: place.lon }}
              image={{
                src: '/other-marker.png', // 다른 모양/색의 마커 이미지
                size: { width: 32, height: 32 },
              }}
            >
              {/* 마커 클릭 시 보여줄 간단한 정보 */}
              <div style={{ padding: '4px', fontSize: '0.9rem' }}>
                {place.name}
              </div>
            </MapMarker>
          ))}
        </Map>
      </div>

      <nav className="bottom-nav">
        <button className="nav-btn">
          <img src="/favorite.svg" alt="Favorite" />
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
  )
}
