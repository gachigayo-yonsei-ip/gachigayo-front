import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Map, MapMarker } from 'react-kakao-maps-sdk'
import './lobby.css'
import CustomBottomSheet from '../components/BottomSheet' // BottomSheet 컴포넌트 import

const ITEMS_PER_PAGE = 20;

// Haversine 공식으로 두 지점 간 거리 계산 (km 단위)
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // 지구 반지름 (km)
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

export default function Lobby() {
  const [coords, setCoords] = useState({ lat: 37.5665, lng: 126.9780 });
  const [allPlaces, setAllPlaces] = useState([]); // 서버에서 받아온 모든 장소
  const [sortedPlaces, setSortedPlaces] = useState([]); // 거리순 정렬된 모든 장소
  const [displayedPlaces, setDisplayedPlaces] = useState([]); // 화면에 보여줄 장소 (페이지네이션)
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // 추가 로딩 중 상태

  const bottomSheetContentRef = useRef(null);


  // ① 사용자 현재 위치 가져오기
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        (err) => {
          console.error('위치 정보를 가져올 수 없습니다.', err);
        }
      );
    }
  }, []);

  // ② 서버에서 장소 목록(fetch) 받아오기
  useEffect(() => {
    fetch('http://localhost:3000/places')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        const validPlaces = data.filter((item) => typeof item.lat === 'number' && typeof item.lon === 'number');
        setAllPlaces(validPlaces);
      })
      .catch((err) => {
        console.error('장소 목록을 불러오는 중 에러가 발생했습니다.', err);
        setAllPlaces([]); // 에러 발생 시 빈 배열로 초기화
      });
  }, []);

  // ③ allPlaces 또는 coords가 변경되면 거리순으로 정렬
  useEffect(() => {
    if (allPlaces.length > 0 && coords) {
      const sorted = [...allPlaces]
        .map(place => ({
          ...place,
          distance: getDistance(coords.lat, coords.lng, place.lat, place.lon)
        }))
        .sort((a, b) => a.distance - b.distance);
      setSortedPlaces(sorted);
      setCurrentPage(1); // 정렬이 바뀌면 첫 페이지부터 다시 보여줌
    }
  }, [allPlaces, coords]);

  // ④ sortedPlaces 또는 currentPage가 변경되면 displayedPlaces 업데이트
  useEffect(() => {
    if (sortedPlaces.length > 0) {
      const newDisplayedPlaces = sortedPlaces.slice(0, currentPage * ITEMS_PER_PAGE);
      setDisplayedPlaces(newDisplayedPlaces);
    }
  }, [sortedPlaces, currentPage]);

  const loadMorePlaces = useCallback(() => {
    if (isLoading || displayedPlaces.length >= sortedPlaces.length) return;

    setIsLoading(true);
    setCurrentPage(prevPage => prevPage + 1);
    // 실제 로딩 시간 시뮬레이션 (필요시 제거)
    setTimeout(() => setIsLoading(false), 500);
  }, [isLoading, displayedPlaces.length, sortedPlaces.length]);

  const handlePlaceClick = (place) => {
    setSelectedPlace(place); // 이미 selectedPlace 상태를 업데이트하고 있음
    setIsDetailViewOpen(true);
  };

  const handleCloseDetailView = () => {
    setIsDetailViewOpen(false);
    setSelectedPlace(null);
  };

  // BottomSheet 스크롤 이벤트 핸들러
  const handleSheetScroll = () => {
    if (!bottomSheetContentRef.current || isLoading) return;

    const { scrollTop, scrollHeight, clientHeight } = bottomSheetContentRef.current;

    // 스크롤이 가능하고 (콘텐츠가 보이는 영역보다 길고)
    // 사용자가 스크롤을 거의 끝까지 내렸을 때 로드합니다.
    // (scrollTop + clientHeight)가 scrollHeight에 매우 가까워졌을 때 (5px 이내 버퍼)
    if (scrollHeight > clientHeight && scrollTop + clientHeight >= scrollHeight - 5) {
      loadMorePlaces();
    }
  };


  return (
    <div className="lobby-wrap">
      <div className="lobby-content">
        <Map
          center={coords}
          level={3}
          style={{ width: '100%', height: '100%' }}
        >
          <MapMarker position={coords} />
          {displayedPlaces.map((place) => (
            <MapMarker
              key={place.id}
              position={{ lat: place.lat, lng: place.lon }}
              image={{
                src: '/other-marker.png',
                size: { width: 32, height: 32 },
              }}
              onClick={() => handlePlaceClick(place)} // 마커 클릭 시에도 상세 정보 표시
            >
              {/* 마커 위에 간단한 이름 표시 (선택 사항) */}
              {/* <div style={{ padding: "5px", color: "#000" }}>{place.name}</div> */}
            </MapMarker>
          ))}
        </Map>
      </div>

      {isDetailViewOpen && selectedPlace && (
        <div className="place-detail-overlay">
          <div className="place-detail-content">
            <h2>{selectedPlace.name}</h2>
            <p><strong>주소:</strong> {selectedPlace.address}</p>
            <p><strong>거리:</strong> {selectedPlace.distance ? selectedPlace.distance.toFixed(2) + ' km' : 'N/A'}</p>
            {selectedPlace.available_time && <p><strong>운영시간:</strong> {selectedPlace.available_time}</p>}
            {selectedPlace.tag && <p><strong>태그:</strong> {selectedPlace.tag.join(', ')}</p>}
            {/* 필요에 따라 더 많은 정보 추가 */}
            <button onClick={handleCloseDetailView} className="close-detail-btn">닫기</button>
          </div>
        </div>
      )}

      <CustomBottomSheet>
        <div
          ref={bottomSheetContentRef}
          onScroll={handleSheetScroll}
          className="bottom-sheet-scroll-content"
        >
          <h1>Nearby Places</h1>
          {displayedPlaces.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {displayedPlaces.map((place) => (
                <li key={place.id} style={{ marginBottom: '10px' }}>
                  <button
                    className={`place-button ${selectedPlace && selectedPlace.id === place.id ? 'selected' : ''}`}
                    onClick={() => handlePlaceClick(place)}
                  >
                    <strong>{place.name}</strong>
                    {place.distance && <span style={{ fontSize: '0.8em', color: 'grey', marginLeft: '10px' }}>({place.distance.toFixed(2)} km)</span>}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p>주변 장소를 찾을 수 없거나 불러오는 중입니다...</p>
          )}
          {isLoading && <p>더 많은 장소를 불러오는 중...</p>}
          {displayedPlaces.length > 0 && displayedPlaces.length >= sortedPlaces.length && <p>모든 장소를 불러왔습니다.</p>}
        </div>
      </CustomBottomSheet>

      <nav className="bottom-nav">
        <button className="nav-btn">
          <img src="/maps_black.png" alt="Maps" />
          <p id="nav-btn-p-black">Maps</p>
        </button>
        <button className="nav-btn">
          <img src="/favorite.svg" style={{ width: 23, height: 23 }} alt="Favorite" />
          <p>Favorite</p>
        </button>
        <button className="nav-btn">
          <img src="/menu alt.png" alt="Menu" />
          <p>Language</p>
        </button>
      </nav>
    </div>
  );
}
