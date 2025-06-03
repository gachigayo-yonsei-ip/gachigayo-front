import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Map, MapMarker, CustomOverlayMap } from 'react-kakao-maps-sdk';
import './lobby.css';
import CustomBottomSheet from '../components/BottomSheet';

const ITEMS_PER_PAGE = 20;

// Haversine 공식 (변경 없음)
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

// --- 스켈레톤 UI 컴포넌트 시작 ---
const SkeletonPlaceholder = ({ height, width, className = '', style = {} }) => (
  <div
    className={`skeleton-placeholder ${className}`}
    style={{ height, width, ...style }}
  ></div>
);

const SkeletonListItem = () => (
  <li className="place-item skeleton-item">
    <SkeletonPlaceholder height="70px" width="70px" className="place-thumb-skeleton" />
    <div className="place-meta skeleton-meta">
      <SkeletonPlaceholder height="20px" width="70%" style={{ marginBottom: '8px' }} />
      <SkeletonPlaceholder height="16px" width="90%" style={{ marginBottom: '4px' }} />
      <SkeletonPlaceholder height="14px" width="50%" />
    </div>
    <SkeletonPlaceholder height="30px" width="30px" className="place-fav-btn-skeleton" />
  </li>
);

// 바텀시트 내용만 스켈레톤으로 표시하는 컴포넌트
const BottomSheetSkeletonContent = () => {
  return (
    <div className="bottom-sheet-scroll-content skeleton-bottom-sheet-content">
      <h1><SkeletonPlaceholder height="30px" width="40%" style={{ marginBottom: '20px' }} /></h1>
      <ul className="place-list">
        <SkeletonListItem />
        <SkeletonListItem />
        <SkeletonListItem />
        <SkeletonListItem />
        <SkeletonListItem />
      </ul>
    </div>
  );
};
// --- 스켈레톤 UI 컴포넌트 끝 ---


export function CurrentLocationOverlay({ map, coords }) {
  useEffect(() => {
    if (!map || !coords) return;

    const content = document.createElement('div');
    content.className = 'current-location-marker';
    content.innerHTML = `
      <div class="pulse-circle"></div>
      <div class="center-dot"></div>
    `;

    // Kakao Maps API가 로드되었는지 확인
    if (window.kakao && window.kakao.maps) {
        const overlay = new window.kakao.maps.CustomOverlay({
            position: new window.kakao.maps.LatLng(coords.lat, coords.lng),
            content: content,
            yAnchor: 0.5,
            xAnchor: 0.5,
            zIndex: 9999,
        });
        overlay.setMap(map);
        return () => {
            overlay.setMap(null);
        };
    } else {
        console.warn("Kakao Maps API is not loaded. CurrentLocationOverlay may not work.");
    }
  }, [map, coords]);

  return null;
}

export default function Lobby() {
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [coords, setCoords] = useState({ lat: 37.5665, lng: 126.9780 }); // 기본값: 서울 시청
  const [allPlaces, setAllPlaces] = useState([]);
  const [sortedPlaces, setSortedPlaces] = useState([]);
  const [displayedPlaces, setDisplayedPlaces] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // 데이터 로딩 상태 (더보기 로딩용)
  const [isPlacesLoading, setIsPlacesLoading] = useState(true); // 초기 장소 목록 로딩 상태

  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('favorites');
    return saved ? JSON.parse(saved) : [];
  });
  const navigate = useNavigate();

  const [viewFavorites, setViewFavorites] = useState(false);
  const [favPage, setFavPage] = useState(1);
  const [displayedFavorites, setDisplayedFavorites] = useState([]);

  const bottomSheetContentRef = useRef(null); // 실제 콘텐츠 스크롤 영역에 대한 ref
  const observer = useRef();
  const mapRef = useRef();
  const clustererRef = useRef(null);
  const [showCustomMarkers, setShowCustomMarkers] = useState(true);

  const handleCenterToCurrentLocation = () => {
    if (mapRef.current && window.kakao && window.kakao.maps) {
      mapRef.current.panTo(new window.kakao.maps.LatLng(coords.lat, coords.lng));
    }
  };

  // ① 사용자 현재 위치 가져오기 (변경 없음)
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
          console.error('Could not get location information.', err); 
          setCoords({ lat: 37.5665, lng: 126.9780 }); 
        }
      );
    } else {
        console.warn("Geolocation API is not supported."); 
        setCoords({ lat: 37.5665, lng: 126.9780 }); 
    }
  }, []);

  // ② 서버에서 장소 목록 받아오기 + Google Photos 정보 요청 (백엔드 프록시 사용)
  useEffect(() => {
    const fetchInitialPlacesAndPhotos = async () => {
      setIsPlacesLoading(true); 
      try {
        const placesResponse = await fetch('http://localhost:3000/places'); 
        if (!placesResponse.ok) {
          throw new Error(`Places list HTTP error! Status: ${placesResponse.status}`); 
        }
        let initialPlacesData = await placesResponse.json();
        
        initialPlacesData = initialPlacesData.filter(
          (item) => typeof item.lat === 'number' && typeof item.lon === 'number'
        );

        // 각 장소에 대해 사진 정보 요청
        const placesWithPhotoUrlsPromises = initialPlacesData.map(async (place) => {
          try {
            const placeAddressForQuery = place.address || '';
            const photoInfoProxyUrl = `http://localhost:3000/api/google-place-photo-info?placeName=${encodeURIComponent(place.name)}&placeAddress=${encodeURIComponent(placeAddressForQuery)}`;
            
            const photoInfoResponse = await fetch(photoInfoProxyUrl);
            
            if (photoInfoResponse.ok) {
              const photoInfoData = await photoInfoResponse.json();
              // 사진 정보 로딩 성공 조건 강화: status "OK" 이고 photoUrl이 유효한 HTTPS URL 문자열일 때
              if (photoInfoData.status === "OK" && 
                  typeof photoInfoData.photoUrl === 'string' && 
                  photoInfoData.photoUrl.startsWith('https://')) {
                return { ...place, photoUrl: photoInfoData.photoUrl };
              } else {
                // 그 외 모든 경우 (NO_PHOTO, ERROR, photoUrl이 없거나 유효하지 않음) 해당 장소 제외
                console.log(`Photo not successfully loaded for ${place.name} (Status: ${photoInfoData.status}, URL: ${photoInfoData.photoUrl}), excluding from list.`);
                return null; 
              }
            } else {
              // 프록시 응답 자체가 실패한 경우
              console.error(`Proxy fetch for photo failed for ${place.name} (status: ${photoInfoResponse.status}), excluding from list.`);
              return null;
            }
          } catch (e) {
            // 네트워크 오류 등 fetch 중 예외 발생 시
            console.error(`Network error fetching photo for ${place.name}, excluding from list:`, e);
            return null;
          }
        });

        // 모든 사진 정보 요청이 완료될 때까지 기다림
        const resolvedPlacesWithOrWithoutPhoto = await Promise.all(placesWithPhotoUrlsPromises);
        
        // null이 아닌 (즉, 사진 로딩에 성공한) 장소들만 필터링
        const finalPlaces = resolvedPlacesWithOrWithoutPhoto.filter(place => place !== null);
        
        console.log(`Fetched ${initialPlacesData.length} initial places, ${finalPlaces.length} places have photos and will be displayed.`);
        setAllPlaces(finalPlaces);

      } catch (err) {
        console.error('Error loading initial places and photo information.', err); 
        setAllPlaces([]); 
      } finally {
        setIsPlacesLoading(false); 
      }
    };

    fetchInitialPlacesAndPhotos();
  }, []); 

  // ③ allPlaces 또는 coords가 변경되면 거리순으로 정렬 (변경 없음)
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
      setFavPage(1);
    } else if (allPlaces.length === 0 && !isPlacesLoading) { 
        setSortedPlaces([]);
    }
  }, [allPlaces, coords, isPlacesLoading]); 

  // ④ sortedPlaces 또는 currentPage가 변경되면 displayedPlaces 업데이트 (변경 없음)
  useEffect(() => {
    if (sortedPlaces.length > 0 && !viewFavorites) {
      const newDisplayedPlaces = sortedPlaces.slice(0, currentPage * ITEMS_PER_PAGE);
      setDisplayedPlaces(newDisplayedPlaces);
      if (isLoading && newDisplayedPlaces.length > displayedPlaces.length) {
        setIsLoading(false);
      } else if (isLoading && newDisplayedPlaces.length === displayedPlaces.length && displayedPlaces.length === sortedPlaces.length) {
        setIsLoading(false);
      }
    } else if (sortedPlaces.length === 0 && !viewFavorites) { 
        setDisplayedPlaces([]);
    }
  }, [sortedPlaces, currentPage, viewFavorites, isLoading]);

  // favorites 변경 시 localStorage에 저장 (변경 없음)
  useEffect(() => {
    localStorage.setItem('favorites', JSON.stringify(favorites));
  }, [favorites]);

  // 즐겨찾기 장소 목록 (useMemo 사용, 변경 없음)
  const favoritePlaces = useMemo(() => {
    return sortedPlaces.filter(p => favorites.includes(p.id));
  }, [sortedPlaces, favorites]);

  // 즐겨찾기 목록 페이징 (변경 없음)
  useEffect(() => {
    if (viewFavorites) {
      const sliceEnd = favPage * ITEMS_PER_PAGE;
      const newDisplayedFavorites = favoritePlaces.slice(0, sliceEnd);
      setDisplayedFavorites(newDisplayedFavorites);
      if (isLoading && newDisplayedFavorites.length > displayedFavorites.length) {
        setIsLoading(false);
      } else if (isLoading && newDisplayedFavorites.length === displayedFavorites.length && displayedFavorites.length === favoritePlaces.length) {
        setIsLoading(false);
      }
    } else if (favoritePlaces.length === 0 && viewFavorites) { 
        setDisplayedFavorites([]);
    }
  }, [favoritePlaces, favPage, viewFavorites, isLoading]);

  // 더보기 로드 함수 (변경 없음)
  const loadMorePlaces = useCallback(() => {
    if (isLoading) return;
    setIsLoading(true); 

    if (viewFavorites) {
      if (displayedFavorites.length < favoritePlaces.length) {
        setFavPage(p => p + 1);
      } else {
        setIsLoading(false);
      }
    } else {
      if (displayedPlaces.length < sortedPlaces.length) {
        setCurrentPage(p => p + 1);
      } else {
        setIsLoading(false);
      }
    }
  }, [
    isLoading,
    viewFavorites,
    displayedPlaces.length,
    sortedPlaces.length,
    displayedFavorites.length,
    favoritePlaces.length
  ]);

  // Intersection Observer 콜백 (변경 없음)
  const lastPlaceElementRef = useCallback(node => {
    if (isLoading) return; 
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !isLoading) {
        const currentList = viewFavorites ? displayedFavorites : displayedPlaces;
        const totalList = viewFavorites ? favoritePlaces : sortedPlaces;
        if (currentList.length < totalList.length) {
          loadMorePlaces();
        }
      }
    }, {
      root: bottomSheetContentRef.current, 
      threshold: 1.0, 
      rootMargin: "0px 0px 50px 0px" 
    });

    if (node) observer.current.observe(node);
  }, [isLoading, loadMorePlaces, viewFavorites, displayedFavorites, favoritePlaces, displayedPlaces, sortedPlaces]);

  // 장소 클릭 핸들러 (변경 없음)
  const handlePlaceClick = place => {
    setSelectedPlace(place);
    setIsDetailViewOpen(true);
    if (mapRef.current && window.kakao && window.kakao.maps) {
        mapRef.current.panTo(new window.kakao.maps.LatLng(place.lat, place.lon));
    }
  };

  // 상세 뷰 닫기 핸들러 (변경 없음)
  const handleCloseDetailView = () => {
    setIsDetailViewOpen(false);
    setSelectedPlace(null);
  };

  // 즐겨찾기 토글 핸들러 (토스트 메시지는 이미 영어)
  const handleToggleFavorite = id => {
    const isAlreadyFavorite = favorites.includes(id);
    setFavorites(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
    setToastMessage(isAlreadyFavorite ? '💔 Removed from Favorites!' : '❤️ Added to Favorites!');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 1500);
  };

  const placesToShow = viewFavorites ? displayedFavorites : displayedPlaces;

  // 지도 줌 변경 시 마커/클러스터러 관리 (kakao.maps 로드 확인 추가)
  useEffect(() => {
    if (isPlacesLoading || !mapRef.current || !window.kakao || !window.kakao.maps) return;
    if (allPlaces.length === 0 && !isPlacesLoading) { 
        if(clustererRef.current) clustererRef.current.clear(); 
        return;
    }

    const map = mapRef.current;

    const handleZoomChange = () => {
      const level = map.getLevel();
      setShowCustomMarkers(level <= 5);

      if (clustererRef.current) {
        clustererRef.current.clear();
      }

      if (level > 5) {
        if (!clustererRef.current) { 
            clustererRef.current = new window.kakao.maps.MarkerClusterer({
                map: map,
                averageCenter: true,
                minLevel: 6, 
                disableClickZoom: false,
                calculator: [10, 30, 50], 
                styles: [
                {
                    width: '50px', height: '50px',
                    background: 'rgba(255, 82, 82, .8)', 
                    borderRadius: '25px', color: '#fff',
                    textAlign: 'center', fontWeight: 'bold', lineHeight: '50px',
                    fontSize: '14px'
                },
                {
                    width: '60px', height: '60px',
                    background: 'rgba(255, 159, 64, .8)', 
                    borderRadius: '30px', color: '#fff',
                    textAlign: 'center', fontWeight: 'bold', lineHeight: '60px',
                    fontSize: '16px'
                },
                {
                    width: '70px', height: '70px',
                    background: 'rgba(255, 204, 0, .8)', 
                    borderRadius: '35px', color: '#000',
                    textAlign: 'center', fontWeight: 'bold', lineHeight: '70px',
                    fontSize: '18px'
                }
                ],
            });
        }
        
        const markers = allPlaces.map((place) => {
          const markerImageSrc = favorites.includes(place.id) 
            ? '/red-marker.png' 
            : '/other-marker.png';

          const imageSize = new window.kakao.maps.Size(28, 32);
          const markerImage = new window.kakao.maps.MarkerImage(markerImageSrc, imageSize);

          return new window.kakao.maps.Marker({
            position: new window.kakao.maps.LatLng(place.lat, place.lon),
            image: markerImage
          });
        });
        clustererRef.current.clear(); 
        clustererRef.current.addMarkers(markers);
      } else { 
        if (clustererRef.current) {
            clustererRef.current.clear();
        }
      }
    };

    handleZoomChange(); 
    const zoomChangeListener = () => handleZoomChange();
    window.kakao.maps.event.addListener(map, 'zoom_changed', zoomChangeListener);
    
    if (map.getLevel() > 5 && clustererRef.current) {
        handleZoomChange(); 
    }

    return () => {
      if (window.kakao && window.kakao.maps && map) { 
        window.kakao.maps.event.removeListener(map, 'zoom_changed', zoomChangeListener);
      }
      if (clustererRef.current) {
        clustererRef.current.clear();
      }
    };
  }, [allPlaces, favorites, mapRef.current, isPlacesLoading]); 


  return (
    <div className="lobby-wrap">
      {showToast && (
      <div className="toast">
        {toastMessage}
      </div>
      )}
      <div className="lobby-content">
        <Map 
          center={coords} 
          level={3} 
          style={{ width: '100%', height: '100%' }} 
          onCreate={(map) => (mapRef.current = map)}
          isPanto={true} 
        >
          <CurrentLocationOverlay map={mapRef.current} coords={coords} />

          {!isPlacesLoading && showCustomMarkers && placesToShow.map(place => {
            const isFavorite = favorites.includes(place.id);
            const markerImageSrc = isFavorite ? '/red-marker.png' : '/other-marker.png';

            return (
              <CustomOverlayMap 
                key={`${place.id}-${isFavorite}`} 
                position={{ lat: place.lat, lng: place.lon }}
                yAnchor={1} 
              >
                <div 
                  className="marker-wrap"
                  onClick={() => handlePlaceClick(place)}
                  title={place.name}
                >
                  <img 
                    src={markerImageSrc}
                    alt={place.name}
                    className="marker-icon"
                  />
                </div>
              </CustomOverlayMap>
            );
          })}
        </Map>
      </div>

      {isDetailViewOpen && selectedPlace && (
        <div className="place-detail-overlay" onClick={handleCloseDetailView}>
          <div className="place-detail-content" onClick={(e) => e.stopPropagation()}>
            <img 
                src={selectedPlace.photoUrl || '/default-thumbnail.jpg'} 
                alt={selectedPlace.name} 
                className="detail-view-thumb" 
            />
            <h2>{selectedPlace.name}</h2>
            <p><strong>Address:</strong> {selectedPlace.address || 'N/A'}</p> 
            <p><strong>Distance:</strong> {selectedPlace.distance ? selectedPlace.distance.toFixed(2) + ' km' : 'N/A'}</p> 
            {selectedPlace.available_time && <p><strong>Hours:</strong> {selectedPlace.available_time}</p>} 
            {selectedPlace.open_day && <p><strong>Open Days:</strong> {selectedPlace.open_day}</p>} 
            {selectedPlace.closed_day && <p><strong>Closed Days:</strong> {selectedPlace.closed_day}</p>} 
            {selectedPlace.subway_info && <p><strong>Subway Info:</strong> {selectedPlace.subway_info}</p>} 
            {selectedPlace.tag && selectedPlace.tag.length > 0 && <p><strong>Tags:</strong> {selectedPlace.tag.join(', ')}</p>} 
            {selectedPlace.detail_uri && 
                <p><strong>More Info:</strong> <a href={selectedPlace.detail_uri} target="_blank" rel="noopener noreferrer">View Link</a></p> 
            }
             <button 
                className="detail-fav-btn" 
                onClick={(e) => {
                    e.stopPropagation(); 
                    handleToggleFavorite(selectedPlace.id);
                }}
            >
                <img 
                    src={favorites.includes(selectedPlace.id) ? '/fullHeart.png' : '/emptyHeart.svg'} 
                    alt="Favorite" 
                    className="favorite-icon"
                />
                {favorites.includes(selectedPlace.id) ? ' Remove from Favorites' : ' Add to Favorites'} 
            </button>
            <button onClick={handleCloseDetailView} className="close-detail-btn">Close</button> 
          </div>
        </div>
      )}

      <CustomBottomSheet ref={bottomSheetContentRef } style={{ position: 'relative' }}>
        <div className="sheet-buttons">
          <button className="circle-button" onClick={handleCenterToCurrentLocation} title="Go to current location"> 
            <img src="/icnCompas.png" alt="Compass" />
          </button>
          <button className="circle-button" onClick={() => navigate('/add-place')} title="Add new place"> 
            <img src="/plus.png" alt="Plus" />
          </button>
        </div>
        
        {isPlacesLoading ? (
          <BottomSheetSkeletonContent />
        ) : (
          <div
            ref={bottomSheetContentRef} 
            className="bottom-sheet-scroll-content"
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
                      src={place.photoUrl || "/default-thumbnail.jpg"}
                      alt={place.name}
                      className="place-thumb"
                      onError={(e) => { e.target.onerror = null; e.target.src='/default-thumbnail.jpg';}} 
                    />
                    <div className="place-meta">
                      <h3 className="place-name">{place.name}</h3>
                      <p className="place-desc">
                        {place.tag && place.tag.length > 0
                          ? place.tag.join(', ')
                          : (place.address || 'Address not available')} 
                      </p>
                      <p className="place-address">📍 {place.distance ? place.distance.toFixed(2) + ' km' : ''}</p>
                    </div>
                    <button
                      className="place-fav-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFavorite(place.id);
                      }}
                      title={isFavorite ? "Remove from favorites" : "Add to favorites"} 
                    >
                      <img
                        src={isFavorite ? '/fullHeart.png' : '/emptyHeart.svg'}
                        alt="favorite"
                        className="favorite-icon"
                      />
                    </button>
                  </li>
                );
                if (placesToShow.length === index + 1) {
                  return <div ref={lastPlaceElementRef} key={place.id}>{listItem}</div>;
                }
                return listItem;
              })}
            </ul>          
            ) : (
              viewFavorites ? (
                <div className="empty-state">
                  <div className="empty-icon-wrapper">
                    <span className="empty-icon-emoji" role="img" aria-label="Broken heart">💔</span>
                  </div>
                  <h3 className="empty-title">You haven't added any favorite places yet!</h3> 
                  <p className="empty-subtext">Tap the heart icon on places you like to save them.</p> 
                </div>
              ) : (
                <p className="empty-message">
                  {isLoading && !isPlacesLoading ? 'Loading places...' : 'No places found nearby or could not be found.'} 
                </p>
              )
            )}
            {isLoading && !isPlacesLoading && <div className="loading-indicator"><img src="https://upload.wikimedia.org/wikipedia/commons/b/b1/Loading_icon.gif" alt="Loading more..." /></div>} 
          </div>
        )}
      </CustomBottomSheet>

      <nav className="bottom-nav">
        <button
          className={`nav-btn ${!viewFavorites ? 'selected' : ''}`}
          onClick={() => { setViewFavorites(false); setCurrentPage(1); }}
        >
          <img src="/maps_black.png" alt="Maps" />
          <p>Maps</p> 
        </button>
        <button
          className={`nav-btn ${viewFavorites ? 'selected' : ''}`}
          onClick={() => { setViewFavorites(true); setFavPage(1); }}
        >
          <img
            src={viewFavorites ? '/favorite_black.svg' : '/favorite.svg'}
            style={{ width: 23, height: 23 }}
            alt="Favorite"
          />
          <p>Favorites</p> 
        </button>
        <button className="nav-btn" onClick={() => navigate('/language')}>
          <img src="/menu alt.png" alt="Menu" />
          <p>Settings</p> 
        </button>
      </nav>
    </div>
  );
}
