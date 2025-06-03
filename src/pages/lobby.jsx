import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'; // useMemo 추가
import { useNavigate } from 'react-router-dom';
import { Map, MapMarker, CustomOverlayMap } from 'react-kakao-maps-sdk';
import './lobby.css';
import CustomBottomSheet from '../components/BottomSheet';

const ITEMS_PER_PAGE = 20;

// Haversine 공식 (생략)
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
  // 기존 상태 (생략)
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [coords, setCoords] = useState({ lat: 37.5665, lng: 126.9780 });
  const [allPlaces, setAllPlaces] = useState([]);
  const [sortedPlaces, setSortedPlaces] = useState([]);
  const [displayedPlaces, setDisplayedPlaces] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('favorites');
    return saved ? JSON.parse(saved) : [];
  });
  const navigate = useNavigate();

  const [viewFavorites, setViewFavorites] = useState(false);
  const [favPage, setFavPage] = useState(1);
  const [displayedFavorites, setDisplayedFavorites] = useState([]);

  const bottomSheetContentRef = useRef(null); // 스크롤 컨테이너 ref
  const observer = useRef(); // Intersection Observer ref


  const mapRef = useRef();
  const clustererRef = useRef(null); 
  const [mapLevel, setMapLevel] = useState(3); 

  const handleCenterToCurrentLocation = () => {
    if (mapRef.current) {
      mapRef.current.panTo(new kakao.maps.LatLng(coords.lat, coords.lng));
    }
  };

  // ① 사용자 현재 위치 가져오기 (생략)
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

  // ② 서버에서 장소 목록(fetch) 받아오기 (생략)
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

  // ③ allPlaces 또는 coords가 변경되면 거리순으로 정렬 (생략)
  useEffect(() => {
    if (allPlaces.length > 0 && coords) {
      const sorted = [...allPlaces]
        .map(place => ({
          ...place,
          distance: getDistance(coords.lat, coords.lng, place.lat, place.lon)
        }))
        .sort((a, b) => a.distance - b.distance);
      setSortedPlaces(sorted);
      setCurrentPage(1); 
      setFavPage(1); // 즐겨찾기 페이지도 초기화
    }
  }, [allPlaces, coords]);

  // ④ sortedPlaces 또는 currentPage가 변경되면 displayedPlaces 업데이트
  useEffect(() => {
    if (sortedPlaces.length > 0 && !viewFavorites) { // Maps 뷰일 때만
      const newDisplayedPlaces = sortedPlaces.slice(0, currentPage * ITEMS_PER_PAGE);
      setDisplayedPlaces(newDisplayedPlaces);
      if (isLoading && newDisplayedPlaces.length > displayedPlaces.length) { // 데이터가 실제로 추가되었을 때
        setIsLoading(false);
      } else if (isLoading && newDisplayedPlaces.length === displayedPlaces.length && displayedPlaces.length === sortedPlaces.length) { // 더 이상 로드할 데이터가 없을 때
        setIsLoading(false);
      }
    }
  }, [sortedPlaces, currentPage, viewFavorites, isLoading, displayedPlaces.length]); // isLoading, displayedPlaces.length 추가

  // favorites 변경 시 localStorage에 저장 (생략)
  useEffect(() => {
    localStorage.setItem('favorites', JSON.stringify(favorites));
  }, [favorites]);

  // ★ favoritePlaces 전체 (useMemo 사용)
  const favoritePlaces = useMemo(() => {
    return sortedPlaces.filter(p => favorites.includes(p.id));
  }, [sortedPlaces, favorites]);

  // ★ favoritePlaces를 페이지 단위로 자르기
  useEffect(() => {
    if (viewFavorites) { // Favorites 뷰일 때만
      const sliceEnd = favPage * ITEMS_PER_PAGE;
      const newDisplayedFavorites = favoritePlaces.slice(0, sliceEnd);
      setDisplayedFavorites(newDisplayedFavorites);
      if (isLoading && newDisplayedFavorites.length > displayedFavorites.length) { // 데이터가 실제로 추가되었을 때
        setIsLoading(false);
      } else if (isLoading && newDisplayedFavorites.length === displayedFavorites.length && displayedFavorites.length === favoritePlaces.length) { // 더 이상 로드할 데이터가 없을 때
        setIsLoading(false);
      }
    }
  }, [favoritePlaces, favPage, viewFavorites, isLoading, displayedFavorites.length]); // isLoading, displayedFavorites.length 추가


  const loadMorePlaces = useCallback(() => {
    if (isLoading) return;

    // 로딩 시작 시 isLoading을 true로 설정
    setIsLoading(true);

    if (viewFavorites) {
      if (displayedFavorites.length < favoritePlaces.length) {
        setFavPage(p => p + 1);
      } else {
        setIsLoading(false); // 더 이상 로드할 즐겨찾기가 없으면 로딩 중단
      }
    } else {
      if (displayedPlaces.length < sortedPlaces.length) {
        setCurrentPage(p => p + 1);
      } else {
        setIsLoading(false); // 더 이상 로드할 장소가 없으면 로딩 중단
      }
    }
    // setTimeout(() => setIsLoading(false), 300); // 이 부분 제거
  }, [
    isLoading,
    viewFavorites,
    displayedPlaces.length,
    sortedPlaces.length,
    displayedFavorites.length,
    favoritePlaces.length
  ]);

  // 마지막 요소를 감지하는 ref 콜백
  const lastPlaceElementRef = useCallback(node => {
    if (isLoading) return; // isLoading이 true이면 관찰 중지
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !isLoading) { // isLoading이 false일 때만 실행
        const currentList = viewFavorites ? displayedFavorites : displayedPlaces;
        const totalList = viewFavorites ? favoritePlaces : sortedPlaces;
        if (currentList.length < totalList.length) {
          console.log('📦 마지막 요소 감지: loadMorePlaces 호출');
          loadMorePlaces();
        }
      }
    }, {
      root: bottomSheetContentRef.current,
      threshold: 1.0,
      rootMargin: "0px 0px -30px 0px"
    });

    if (node) observer.current.observe(node);
  }, [isLoading, loadMorePlaces, viewFavorites, displayedFavorites, favoritePlaces, displayedPlaces, sortedPlaces]); // isLoading을 의존성 배열에 추가


  const handlePlaceClick = place => { // (생략)
    setSelectedPlace(place);
    setIsDetailViewOpen(true);
  };
  const handleCloseDetailView = () => { // (생략)
    setIsDetailViewOpen(false);
    setSelectedPlace(null);
  };
  const handleToggleFavorite = id => { // (생략)
    const isAlreadyFavorite = favorites.includes(id); 

    setFavorites(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );

    // ✅ 메시지 설정
    if (isAlreadyFavorite) {
      setToastMessage('💔 Removed from Favorites!');
    } else {
      setToastMessage('❤️ Added to Favorites!');
    }

    setShowToast(true);

    // 1.5초 후에 토스트 끄기
    setTimeout(() => {
      setShowToast(false);
    }, 1500);  // 1.5초 맞춰줌
  };

  // 기존 handleSheetScroll 함수는 제거 또는 주석 처리
  // const handleSheetScroll = () => { ... }

  const placesToShow = viewFavorites ? displayedFavorites : displayedPlaces;
  // ★ 클러스터링 useEffect 추가
  useEffect(() => {
    if (!mapRef.current || allPlaces.length === 0) return;

    const map = mapRef.current;

    // 클러스터러 생성
    const clusterer = new kakao.maps.MarkerClusterer({
      map: map,
      averageCenter: true,
      minLevel: 5,
      disableClickZoom: false,
      calculator: [10, 30, 100],
      styles: [
        {
          width: '60px',
          height: '60px',
          background: 'url("https://marker.nanoka.fr/map_cluster-1673FF-60.svg") no-repeat center center',
          backgroundSize: 'cover',
          color: '#fff',
          fontSize: '16px',
          fontWeight: 'bold',
          textAlign: 'center',
          lineHeight: '60px'
        }
      ]
    });

    // 마커 생성
    const markers = allPlaces.map((place) => {
      const markerImageSrc = favorites.includes(place.id) 
        ? '/red-marker.png' 
        : '/other-marker.png';
        
      const markerImage = new kakao.maps.MarkerImage(
        markerImageSrc,
        new kakao.maps.Size(28, 32) // 마커 사이즈
      );

      return new kakao.maps.Marker({
        position: new kakao.maps.LatLng(place.lat, place.lon),
        image: markerImage
      });
    });

    clusterer.addMarkers(markers);

    return () => {
      clusterer.clear();
    };
  }, [allPlaces]);

  // 지도 줌 레벨 바뀔 때 감지
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    kakao.maps.event.addListener(map, 'zoom_changed', () => {
      const level = map.getLevel();
      setMapLevel(level);
    });
  }, []);

  useEffect(() => {
    if (!mapRef.current || !allPlaces.length) return;
    const map = mapRef.current;
  
    // 기존 클러스터러 제거
    if (clustererRef.current) {
      clustererRef.current.clear();
      clustererRef.current.setMap(null);
      clustererRef.current = null;
    }
  
    if (mapLevel > 5) { // ✅ 줌 아웃일 때만 클러스터 생성
      const clusterer = new kakao.maps.MarkerClusterer({
        map: map,
        averageCenter: true,
        minLevel: 5,
        disableClickZoom: false,
        calculator: [10, 30, 100],
        styles: [
          {
            width: '60px',
            height: '60px',
            background: 'url("https://marker.nanoka.fr/map_cluster-1673FF-60.svg") no-repeat center center',
            backgroundSize: 'cover',
            color: '#fff',
            fontSize: '16px',
            fontWeight: 'bold',
            textAlign: 'center',
            lineHeight: '60px'
          }
        ]
      });
  
      const markers = allPlaces.map((place) => {
        const markerImageSrc = favorites.includes(place.id) 
          ? '/red-marker.png' 
          : '/other-marker.png';
  
        const markerImage = new kakao.maps.MarkerImage(
          markerImageSrc,
          new kakao.maps.Size(28, 32)
        );
  
        return new kakao.maps.Marker({
          position: new kakao.maps.LatLng(place.lat, place.lon),
          image: markerImage
        });
      });
  
      clusterer.addMarkers(markers);
      clustererRef.current = clusterer; // ✅ 만든 클러스터러 저장
    }
  }, [allPlaces, mapLevel, favorites]);
  


  return (
    <div className="lobby-wrap">
      {showToast && (
      <div className="toast">
        {toastMessage}
      </div>
      )}
      <div className="lobby-content">
        {/* 지도 (생략) */}
        <Map 
          center={coords} 
          level={3} 
          style={{ width: '100%', height: '100%' }} 
          ref={mapRef}
        >
          {/* 현재 위치 마커 */}
          <CustomOverlayMap position={coords}>
            <div style={{ position: 'relative', width: '40px', height: '40px' }}>
              <div className="pulse-circle" />
              <div className="center-dot" />
            </div>
          </CustomOverlayMap>
          {mapLevel <= 5 && placesToShow.map(place => {  // ✅ 레벨 조건 추가
            const isFavorite = favorites.includes(place.id);
            const markerImageSrc = isFavorite ? '/red-marker.png' : '/other-marker.png';

            return (
              <CustomOverlayMap key={place.id} position={{ lat: place.lat, lng: place.lon }}>
                <div 
                  className="marker-wrap"
                  onClick={() => handlePlaceClick(place)}
                >
                  <img 
                    src={markerImageSrc}
                    alt="Place Marker"
                    className="marker-icon"
                  />
                </div>
              </CustomOverlayMap>
            );
          })}
        </Map>
      </div>

      {isDetailViewOpen && selectedPlace && (
        // 상세 뷰 (생략)
        <div className="place-detail-overlay">
          <div className="place-detail-content">
            <h2>{selectedPlace.name}</h2>
            <p><strong>주소:</strong> {selectedPlace.address}</p>
            <p><strong>거리:</strong> {selectedPlace.distance ? selectedPlace.distance.toFixed(2) + ' km' : 'N/A'}</p>
            {selectedPlace.available_time && <p><strong>운영시간:</strong> {selectedPlace.available_time}</p>}
            {selectedPlace.tag && <p><strong>태그:</strong> {selectedPlace.tag.join(', ')}</p>}
            <button onClick={handleCloseDetailView} className="close-detail-btn">닫기</button>
          </div>
        </div>
      )}

      {/* CustomBottomSheet에 onScroll prop 제거 */}
      <CustomBottomSheet ref={bottomSheetContentRef} style={{ position: 'relative' }}>
      <div className="sheet-buttons">
        <button className="circle-button" onClick={handleCenterToCurrentLocation}>
          <img src="/icnCompas.png" alt="Compass" />
        </button>
        <button className="circle-button" onClick={() => navigate('/add-place')}>
          <img src="/plus.png" alt="Plus" />
        </button>
      </div>
        <div
          ref={bottomSheetContentRef}
          className="bottom-sheet-scroll-content"
          // onScroll prop 제거
        >
          <h1>{viewFavorites ? 'Your Favorites' : 'Nearby Places'}</h1>

          {placesToShow.length > 0 ? (
            <ul className="place-list">
            {placesToShow.map((place, index) => {
              const isFavorite = favorites.includes(place.id);
              const isSelected = selectedPlace?.id === place.id;
          
              const listItem = (
                <li
                  key={place.id}
                  className={`place-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => handlePlaceClick(place)}
                >
                  <img
                    src="/default-thumbnail.jpg"
                    alt={place.name}
                    className="place-thumb"
                  />
                  <div className="place-meta">
                    <h3 className="place-name">{place.name}</h3>
                    <p className="place-desc">
                      {place.tag && place.tag.length > 0
                        ? place.tag.join(', ')
                        : 'No description available'}
                    </p>
                    <p className="place-address">📍 {place.address}</p>
                  </div>
                  <button
                    className="place-fav-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFavorite(place.id);
                    }}
                  >
                    <img
                      src={isFavorite ? '/fullHeart.png' : '/emptyHeart.svg'}
                      alt="favorite"
                      className="favorite-icon"
                    />
                  </button>
                </li>
              );
              return placesToShow.length === index + 1
                ? <div ref={lastPlaceElementRef} key={place.id}>{listItem}</div>
                : listItem;
            })}
          </ul>          
          ) : (
            viewFavorites ? (
              <div className="empty-state">
                <div className="empty-icon-wrapper">
                  <img src="/emptyHeart.svg" alt="No favorites" className="empty-icon" />
                </div>
                <h3 className="empty-title">You haven’t added any favorite places yet!</h3>
                <p className="empty-subtext">Tap the bookmark icon to save places you like.</p>
              </div>
            ) : (
              <p className="empty-message">
                {isLoading ? 'Loading places...' : 'No places found nearby.'}
              </p>
            )
          )}

          {isLoading && <p>Loading more...</p>}
          {/* "All loaded" 메시지는 Intersection Observer가 더 이상 호출되지 않는 것으로 판단 가능 */}
        </div>
      </CustomBottomSheet>

      {/* 하단 네비게이션 (생략) */}
      <nav className="bottom-nav">
        <button
          className={`nav-btn ${!viewFavorites ? 'selected' : ''}`}
          onClick={() => { setViewFavorites(false); setCurrentPage(1); /* 페이지 초기화 */ }}
        >
          <img src="/maps_black.png" alt="Maps" />
          <p>Maps</p>
        </button>
        <button
          className={`nav-btn ${viewFavorites ? 'selected' : ''}`}
          onClick={() => { setViewFavorites(true); setFavPage(1); /* 페이지 초기화 */}}
        >
          <img
            src={viewFavorites ? '/favorite_black.svg' : '/favorite.svg'}
            style={{ width: 23, height: 23 }}
            alt="Favorite"
          />
          <p>Favorite</p>
        </button>
        <button className="nav-btn" onClick={() => navigate('/language')}>
          <img src="/menu alt.png" alt="Menu" />
          <p>Language</p>
        </button>
      </nav>
    </div>
  );
}
