import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Map, MapMarker } from 'react-kakao-maps-sdk'
import './lobby.css'
import CustomBottomSheet from '../components/BottomSheet'

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
  // 기존 상태
  const [coords, setCoords] = useState({ lat: 37.5665, lng: 126.9780 })
  const [allPlaces, setAllPlaces] = useState([])
  const [sortedPlaces, setSortedPlaces] = useState([])
  const [displayedPlaces, setDisplayedPlaces] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedPlace, setSelectedPlace] = useState(null)
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('favorites');
    return saved ? JSON.parse(saved) : [];
  });  // ← 여기에 세미콜론 하나만, 불필요한 ')' 제거

  // ★ 즐겨찾기 뷰 모드 토글
  const [viewFavorites, setViewFavorites] = useState(false);
  // ★ 즐겨찾기 페이지 + 페이지별 표시 리스트
  const [favPage, setFavPage] = useState(1);
  const [displayedFavorites, setDisplayedFavorites] = useState([])

  const bottomSheetContentRef = useRef(null)


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

  // favorites 변경 시 localStorage에 저장
  useEffect(() => {
    localStorage.setItem('favorites', JSON.stringify(favorites))
  }, [favorites])

  // ★ favoritePlaces 전체
  const favoritePlaces = sortedPlaces.filter(p => favorites.includes(p.id))

  // ★ favoritePlaces를 페이지 단위로 자르기
  useEffect(() => {
    if (viewFavorites) {
      const sliceEnd = favPage * ITEMS_PER_PAGE
      setDisplayedFavorites(favoritePlaces.slice(0, sliceEnd))
    }
  }, [favoritePlaces, favPage, viewFavorites])

  // load more: maps vs favorites
  const loadMorePlaces = useCallback(() => {
    if (isLoading) return

    if (viewFavorites) {
      if (displayedFavorites.length >= favoritePlaces.length) return
      setIsLoading(true)
      setFavPage(p => p + 1)
    } else {
      if (displayedPlaces.length >= sortedPlaces.length) return
      setIsLoading(true)
      setCurrentPage(p => p + 1)
    }

    setTimeout(() => setIsLoading(false), 500)
  }, [
    isLoading,
    viewFavorites,
    displayedPlaces.length, sortedPlaces.length,
    displayedFavorites.length, favoritePlaces.length
  ])

  const handlePlaceClick = place => {
    setSelectedPlace(place)
    setIsDetailViewOpen(true)
  }
  const handleCloseDetailView = () => {
    setIsDetailViewOpen(false)
    setSelectedPlace(null)
  }
  const handleToggleFavorite = id => {
    setFavorites(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  // ★ 양쪽 뷰 모두에서 스크롤로 추가 로딩
  const handleSheetScroll = () => {
    if (!bottomSheetContentRef.current || isLoading) return
    const { scrollTop, scrollHeight, clientHeight } = bottomSheetContentRef.current
    if (scrollHeight > clientHeight && scrollTop + clientHeight >= scrollHeight - 5) {
      loadMorePlaces()
    }
  }

  // ★ 보여줄 리스트 분기
  const placesToShow = viewFavorites ? displayedFavorites : displayedPlaces

  return (
    <div className="lobby-wrap">
      <div className="lobby-content">
        <Map center={coords} level={3} style={{ width: '100%', height: '100%' }}>
          <MapMarker position={coords} />
          {placesToShow.map(place => (
            <MapMarker
              key={place.id}
              position={{ lat: place.lat, lng: place.lon }}
              image={{ src: '/other-marker.png', size: { width: 32, height: 32 } }}
              onClick={() => handlePlaceClick(place)}
            />
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
          <h1>{viewFavorites ? 'Your Favorites' : 'Nearby Places'}</h1>

          {placesToShow.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {placesToShow.map(place => (
                <li key={place.id} style={{ marginBottom: '10px' }}>
                  <button
                    className={`place-button ${selectedPlace?.id === place.id ? 'selected' : ''}`}
                    onClick={() => handlePlaceClick(place)}
                  >
                    <img
                      src={favorites.includes(place.id) ? '/fullHeart.png' : '/emptyHeart.svg'}
                      alt="favorite"
                      className="favorite-icon"
                      onClick={e => {
                        e.stopPropagation()
                        handleToggleFavorite(place.id)
                      }}
                    />
                    <strong>{place.name}</strong>
                    {place.distance && (
                      <span style={{ fontSize: '0.8em', color: 'grey', marginLeft: '10px' }}>
                        ({place.distance.toFixed(2)} km)
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p>{viewFavorites ? 'No favorites yet.' : 'Loading places...'}</p>
          )}

          {/* 뷰별 로딩/끝 메시지 */}
          {isLoading && <p>{viewFavorites ? 'Loading more favorites...' : 'Loading more places...'}</p>}
          {placesToShow.length > 0 && placesToShow.length >=
            (viewFavorites ? favoritePlaces.length : sortedPlaces.length) && (
            <p>{viewFavorites ? 'All favorites loaded.' : 'All places loaded.'}</p>
          )}
        </div>
      </CustomBottomSheet>

      <nav className="bottom-nav">
        <button
          className={`nav-btn ${!viewFavorites ? 'selected' : ''}`}
          onClick={() => setViewFavorites(false)}
        >
          <img src="/maps_black.png" alt="Maps" />
          <p>Maps</p>
        </button>
        <button
          className={`nav-btn ${viewFavorites ? 'selected' : ''}`}
          onClick={() => setViewFavorites(true)}
        >
          <img
            src={viewFavorites ? '/favorite_black.svg' : '/favorite.svg'}
            style={{ width: 23, height: 23 }}
            alt="Favorite"
          />
          <p>Favorite</p>
        </button>
        <button className="nav-btn" onClick={() => {/* Language 모드로 */}}>
          <img src="/menu alt.png" alt="Menu" />
          <p>Language</p>
        </button>
      </nav>
    </div>
  )
}
