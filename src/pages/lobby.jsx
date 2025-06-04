import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Map, CustomOverlayMap } from 'react-kakao-maps-sdk';
import './lobby.css';
import CustomBottomSheet from '../components/BottomSheet';

const ITEMS_PER_PAGE = 15; // 한 번에 보여줄 아이템 개수

// Haversine 공식
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

// 스켈레톤 UI 컴포넌트
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

const BottomSheetSkeletonContent = () => (
  <div className="bottom-sheet-scroll-content skeleton-bottom-sheet-content">
    <h1>
      <SkeletonPlaceholder height="30px" width="40%" style={{ marginBottom: '20px' }} />
    </h1>
    <ul className="place-list">
      {[...Array(5)].map((_, i) => <SkeletonListItem key={`skeleton-${i}`} />)}
    </ul>
  </div>
);

export function CurrentLocationOverlay({ map, coords }) {
  useEffect(() => {
    if (!map || !coords) return;

    const content = document.createElement('div');
    content.className = 'current-location-marker';
    content.innerHTML = `
      <div class="pulse-circle"></div>
      <div class="center-dot"></div>
    `;

    if (window.kakao && window.kakao.maps) {
      const overlay = new window.kakao.maps.CustomOverlay({
        position: new window.kakao.maps.LatLng(coords.lat, coords.lng),
        content: content,
        yAnchor: 0.5,
        xAnchor: 0.5,
        zIndex: 9999,
      });
      overlay.setMap(map);
      return () => overlay.setMap(null);
    } else {
      console.warn("Kakao Maps API is not loaded. CurrentLocationOverlay may not work.");
    }
  }, [map, coords]);

  return null;
}

export default function Lobby() {
  const navigate = useNavigate();
  const location = useLocation();

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [coords, setCoords] = useState({ lat: 37.5665, lng: 126.9780 }); // 기본: 서울 시청
  const [allPlaces, setAllPlaces] = useState([]); // 서버에서 받아온 모든 장소
  const [sortedPlaces, setSortedPlaces] = useState([]); // 거리순 정렬된 장소
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('favorites');
    return saved ? JSON.parse(saved) : [];
  });
  const [viewFavorites, setViewFavorites] = useState(false);
  const [favPage, setFavPage] = useState(1);

  const bottomSheetContentRef = useRef(null);
  const mapRef = useRef();
  const clustererRef = useRef(null);
  const [showCustomMarkers, setShowCustomMarkers] = useState(true);

  // ① 사용자 현재 위치 가져오기
  useEffect(() => {
    setCoords({ lat: 37.555726, lng: 126.894570 });
  }, []);
  

  /*
  // ① 사용자 현재 위치 가져오기
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setCoords({ lat: 37.555726, lng: 126.894570 })
      );
    } else {
      console.warn("Geolocation API is not supported.");
      setCoords({ lat: 37.555726, lng: 126.894570 });
    }
  }, []);
  */

  // ② 서버에서 장소 목록 받아오기 (마운트 + 필요 시 리프레시)
  useEffect(() => {
    const fetchInitialPlaces = async () => {
      setIsInitialLoading(true);
      try {
        const placesResponse = await fetch('http://localhost:3000/places');
        if (!placesResponse.ok) {
          throw new Error(`Places list HTTP error! Status: ${placesResponse.status}`);
        }
        let initialPlacesData = await placesResponse.json();
        initialPlacesData = initialPlacesData.filter(
          (item) => typeof item.lat === 'number' && typeof item.lon === 'number'
        );
        setAllPlaces(initialPlacesData.map(place => ({ ...place, photoUrl: null })));
      } catch (err) {
        console.error('Error loading initial places data.', err);
        setAllPlaces([]);
        setIsInitialLoading(false);
      }
    };

    fetchInitialPlaces();

    // EditPlace에서 needsRefresh 플래그가 넘어왔을 때 한 번만 실행 후 초기화
    if (location.state?.needsRefresh) {
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state?.needsRefresh, navigate]);

  // ③ allPlaces 혹은 coords 변경 시 거리순으로 정렬
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
    } else if (allPlaces.length === 0 && !isInitialLoading) {
      setSortedPlaces([]);
    }
  }, [allPlaces, coords, isInitialLoading]);

  // ④ photoUrl 요청 및 isInitialLoading/isLoadingMore 상태 관리
  useEffect(() => {
    const fetchPhotosForConsideredPlaces = async () => {
      const baseList = viewFavorites
        ? sortedPlaces.filter(p => favorites.includes(p.id))
        : sortedPlaces;

      const startIndex = (viewFavorites ? favPage : currentPage) * ITEMS_PER_PAGE;
      const endIndex = startIndex + ITEMS_PER_PAGE * 2;
      const placesToConsider = baseList.slice(0, endIndex);

      const placesWithoutPhotos = placesToConsider.filter(place => place.photoUrl === null);
      if (placesWithoutPhotos.length === 0) {
        if (isInitialLoading) setIsInitialLoading(false);
        if (isLoadingMore) setIsLoadingMore(false);
        return;
      }

      const photoFetchPromises = placesWithoutPhotos.map(async (place) => {
        try {
          const placeAddressForQuery = place.address || '';
          const proxyUrl = `http://localhost:3000/api/google-place-photo-info?placeName=${encodeURIComponent(place.name)}&placeAddress=${encodeURIComponent(placeAddressForQuery)}`;
          const photoInfoResponse = await fetch(proxyUrl);

          if (photoInfoResponse.ok) {
            const photoInfoData = await photoInfoResponse.json();
            if (
              photoInfoData.status === "OK" &&
              typeof photoInfoData.photoUrl === 'string' &&
              photoInfoData.photoUrl.startsWith('https://')
            ) {
              return { ...place, photoUrl: photoInfoData.photoUrl, hasValidPhoto: true };
            } else {
              return { ...place, photoUrl: '/default-thumbnail.jpg', hasValidPhoto: false };
            }
          } else {
            return { ...place, photoUrl: '/default-thumbnail.jpg', hasValidPhoto: false };
          }
        } catch {
          return { ...place, photoUrl: '/default-thumbnail.jpg', hasValidPhoto: false };
        }
      });

      const resolvedPlaces = await Promise.all(photoFetchPromises);
      setAllPlaces(prev =>
        prev.map(p => {
          const updated = resolvedPlaces.find(rp => rp.id === p.id);
          return updated ? updated : p;
        })
      );

      if (isInitialLoading) setIsInitialLoading(false);
      if (isLoadingMore) setIsLoadingMore(false);
    };

    if ((isInitialLoading && sortedPlaces.length > 0) || isLoadingMore) {
      fetchPhotosForConsideredPlaces();
    }
  }, [sortedPlaces, currentPage, favPage, viewFavorites, favorites, isInitialLoading, isLoadingMore]);

  // ⑤ favorites → localStorage 동기화
  useEffect(() => {
    localStorage.setItem('favorites', JSON.stringify(favorites));
  }, [favorites]);

  // photoUrl이 유효한 장소들만 필터링
  const placesWithValidPhotos = useMemo(() => {
    return sortedPlaces.filter(place => place.photoUrl && place.photoUrl !== '/default-thumbnail.jpg');
  }, [sortedPlaces]);

  // 즐겨찾기만 필터링
  const favoritePlaces = useMemo(() => {
    return placesWithValidPhotos.filter(p => favorites.includes(p.id));
  }, [placesWithValidPhotos, favorites]);

  // “Load More” 버튼 클릭
  const handleLoadMore = () => {
    if (isLoadingMore) return;
    setIsLoadingMore(true);

    const currentBaseList = viewFavorites ? favoritePlaces : placesWithValidPhotos;
    const maxPage = Math.ceil(currentBaseList.length / ITEMS_PER_PAGE);

    if (viewFavorites) {
      if (favPage < maxPage) {
        setFavPage(prev => prev + 1);
      } else {
        setIsLoadingMore(false);
      }
    } else {
      if (currentPage < maxPage) {
        setCurrentPage(prev => prev + 1);
      } else {
        setIsLoadingMore(false);
      }
    }
  };

  // 장소 클릭 → 상세 뷰 열기, 반드시 photoUrl이 준비된 상태로 설정
  const handlePlaceClick = async (place) => {
    if (!place.photoUrl || place.photoUrl === '/default-thumbnail.jpg') {
      try {
        const placeAddressForQuery = place.address || '';
        const proxyUrl = `http://localhost:3000/api/google-place-photo-info?placeName=${encodeURIComponent(place.name)}&placeAddress=${encodeURIComponent(placeAddressForQuery)}`;
        const photoInfoResponse = await fetch(proxyUrl);

        if (photoInfoResponse.ok) {
          const photoInfoData = await photoInfoResponse.json();
          if (
            photoInfoData.status === "OK" &&
            typeof photoInfoData.photoUrl === 'string' &&
            photoInfoData.photoUrl.startsWith('https://')
          ) {
            setAllPlaces(prev =>
              prev.map(p =>
                p.id === place.id
                  ? { ...p, photoUrl: photoInfoData.photoUrl, hasValidPhoto: true }
                  : p
              )
            );
            setSelectedPlace({ ...place, photoUrl: photoInfoData.photoUrl, hasValidPhoto: true });
          } else {
            setSelectedPlace({ ...place, photoUrl: '/default-thumbnail.jpg', hasValidPhoto: false });
          }
        } else {
          setSelectedPlace({ ...place, photoUrl: '/default-thumbnail.jpg', hasValidPhoto: false });
        }
      } catch {
        setSelectedPlace({ ...place, photoUrl: '/default-thumbnail.jpg', hasValidPhoto: false });
      }
    } else {
      setSelectedPlace(place);
    }

    setIsDetailViewOpen(true);
    if (mapRef.current && window.kakao && window.kakao.maps) {
      mapRef.current.panTo(new window.kakao.maps.LatLng(place.lat, place.lon));
    }
  };

  const handleCloseDetailView = () => {
    setIsDetailViewOpen(false);
    setSelectedPlace(null);
  };

  const handleToggleFavorite = (id) => {
    const isAlreadyFavorite = favorites.includes(id);
    setFavorites(prev =>
      isAlreadyFavorite ? prev.filter(x => x !== id) : [...prev, id]
    );
    setToastMessage(isAlreadyFavorite ? '💔 Removed from Favorites!' : '❤️ Added to Favorites!');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 1500);
  };

  // Edit 버튼 클릭 → EditPlace로 이동
  const handleEditPlace = (placeId) => {
    navigate(`/edit`, { state: { placeId, needsRefresh: true } });
  };

  // 화면에 표시할 장소 계산 (페이지네이션 및 사진 유효성 필터링)
  const placesToShow = useMemo(() => {
    const base = viewFavorites
      ? favoritePlaces
      : placesWithValidPhotos;
    const endIndex = (viewFavorites ? favPage : currentPage) * ITEMS_PER_PAGE;
    return base.slice(0, endIndex);
  }, [viewFavorites, favPage, currentPage, placesWithValidPhotos, favorites]);

  const totalPlacesInCurrentView = viewFavorites ? favoritePlaces.length : placesWithValidPhotos.length;
  const canLoadMore = placesToShow.length < totalPlacesInCurrentView;

  // 줌 레벨에 따라 마커/클러스터러 토글
  useEffect(() => {
    if (isInitialLoading || !mapRef.current || !window.kakao || !window.kakao.maps) return;
    if (allPlaces.length === 0 && !isInitialLoading) {
      if (clustererRef.current) clustererRef.current.clear();
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
            map,
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

        const markers = sortedPlaces.map((place) => {
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
  }, [allPlaces, favorites, mapRef.current, isInitialLoading, sortedPlaces, placesWithValidPhotos]);

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

          {!isInitialLoading && showCustomMarkers && sortedPlaces.map(place => {
            const isFavorite = favorites.includes(place.id);
            const markerImageSrc = isFavorite ? '/red-marker.png' : '/other-marker.png';

            return (
              <CustomOverlayMap
                key={`${place.id}-${isFavorite}`}
                position={{ lat: place.lat, lng: place.lon }}
                yAnchor={1}
                zIndex={1000}
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
            <hr className="detail-divider" />

            <p><strong>Distance:</strong> {selectedPlace.distance ? selectedPlace.distance.toFixed(2) + ' km' : 'N/A'}</p>
            <hr className="detail-divider" />

            {selectedPlace.available_time && (
              <>
                <p><strong>Hours:</strong> {selectedPlace.available_time}</p>
                <hr className="detail-divider" />
              </>
            )}

            {selectedPlace.open_day && (
              <>
                <p><strong>Open Days:</strong> {selectedPlace.open_day}</p>
                <hr className="detail-divider" />
              </>
            )}

            {selectedPlace.closed_day && (
              <>
                <p><strong>Closed Days:</strong> {selectedPlace.closed_day}</p>
                <hr className="detail-divider" />
              </>
            )}

            {selectedPlace.subway_info && (
              <>
                <p><strong>Subway Info:</strong> {selectedPlace.subway_info}</p>
                <hr className="detail-divider" />
              </>
            )}

            {selectedPlace.tag && selectedPlace.tag.length > 0 && (
              <>
                <p><strong>Tags:</strong> {selectedPlace.tag.join(', ')}</p>
                <hr className="detail-divider" />
              </>
            )}

            {selectedPlace.description && (
              <>
              <p><strong>Description:</strong> {selectedPlace.description}</p>
              <hr className="detail-divider" />
            </>
            )}

            {selectedPlace.detail_uri && (
              <p>
                <strong>More Info:</strong>
                <br />
                <a href={selectedPlace.detail_uri} target="_blank" rel="noopener noreferrer">
                  visitseoul.net
                </a>
              </p>
            )}



            <button
              className="detail-action-btn detail-edit-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleEditPlace(selectedPlace.id);
              }}
            >
              Edit Place
            </button>
            <button
              className="detail-action-btn detail-fav-btn"
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
            <button onClick={handleCloseDetailView} className="detail-action-btn close-detail-btn">
              Close
            </button>
          </div>
        </div>
      )}

      <CustomBottomSheet ref={bottomSheetContentRef} style={{ position: 'relative' }}>
        <div className="sheet-buttons">
          <button className="circle-button" onClick={() => {
            if (mapRef.current && window.kakao && window.kakao.maps) {
              mapRef.current.panTo(new window.kakao.maps.LatLng(coords.lat, coords.lng));
            }
          }} title="Go to current location">
            <img src="/icnCompas.png" alt="Compass" />
          </button>
          <button className="circle-button" onClick={() => navigate('/add-place')} title="Add new place">
            <img src="/plus.png" alt="Plus" />
          </button>
        </div>

        {isInitialLoading ? (
          <BottomSheetSkeletonContent />
        ) : (
          <div ref={bottomSheetContentRef} className="bottom-sheet-scroll-content">
            <h1>{viewFavorites ? 'Your Favorites' : 'Nearby Places'}</h1>

            {placesToShow.length > 0 ? (
              <ul className="place-list">
                {placesToShow.map((place) => {
                  const isFavorite = favorites.includes(place.id);
                  const isSelected = selectedPlace?.id === place.id;

                  return (
                    <li
                      key={place.id}
                      className={`place-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => handlePlaceClick(place)}
                    >
                      <img
                        src={place.photoUrl || "/default-thumbnail.jpg"}
                        alt={place.name}
                        className="place-thumb"
                        onError={(e) => { e.target.onerror = null; e.target.src = '/default-thumbnail.jpg'; }}
                      />
                      <div className="place-meta">
                        <h3 className="place-name">{place.name}</h3>
                        <p className="place-desc">
                          {place.tag && place.tag.length > 0
                            ? place.tag.join(', ')
                            : (place.address || 'Address not available')}
                        </p>
                        <p className="place-address">
                          📍 {place.distance ? place.distance.toFixed(2) + ' km' : ''}
                        </p>
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
                !isInitialLoading && (
                  <p className="empty-message">
                    Finding places to visit...
                  </p>
                )
              )
            )}

            {canLoadMore && !isLoadingMore && (
              <button onClick={handleLoadMore} className="load-more-button">
                Load More
              </button>
            )}
            {isLoadingMore && (
              <div className="loading-indicator">
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/b/b1/Loading_icon.gif"
                  alt="Loading more..."
                />
              </div>
            )}
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
