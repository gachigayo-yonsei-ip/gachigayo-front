import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './EditPlace.css'; // CSS 파일 임포트

// 임시 데이터 (실제로는 API로부터 받아옵니다)
// MOCK_PLACE_DATA는 더 이상 필요하지 않지만, 개발 중 테스트를 위해 남겨둘 수 있습니다.
// 실제 API가 구현되면 이 목업 데이터는 제거해야 합니다.
const MOCK_PLACE_DATA = {
  id: '123',
  name: 'Seochon Alley',
  tagline: 'Trendy alleys with old hanoks',
  address: '12 Jahamun-ro 7-gil, Jongno-gu, Seoul',
  photos: [ // 실제로는 이미지 URL 배열
    '/default-thumbnail.jpg', // 예시 이미지 경로
    '/default-thumbnail.jpg',
    '/default-thumbnail.jpg',
  ],
  descriptionTitle: 'Hanok Street View',
  description: 'Traditional hanok-lined alley with a calm, local vibe. Great for a slow walk and photo spots. One of the oldest neighborhoods near Gyeongbokgung.',
};

export default function EditPlace() {
  const navigate = useNavigate();
  const location = useLocation();
  const placeIdToEdit = location.state?.placeId; // Lobby에서 전달받은 placeId

  const [placeName, setPlaceName] = useState('');
  const [tagline, setTagline] = useState('');
  const [address, setAddress] = useState('');
  const [photos, setPhotos] = useState([]); // 사진 파일 또는 URL 배열
  const [descriptionTitle, setDescriptionTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(true); // 데이터 로딩 상태

  useEffect(() => {
    // placeIdToEdit를 사용하여 백엔드에서 실제 장소 데이터를 가져옵니다.
    if (placeIdToEdit) {
      console.log("Editing place with ID:", placeIdToEdit);
      // API 호출:
      // 백엔드에서 특정 ID의 장소를 가져오는 엔드포인트를 구현해야 합니다.
      // 예시: `/places/${placeIdToEdit}`
      fetch(`http://localhost:3000/places/${placeIdToEdit}`) // 백엔드 URL과 ID를 사용
        .then(res => {
          if (!res.ok) {
            if (res.status === 404) {
              throw new Error("Place not found for editing.");
            }
            throw new Error(`HTTP error! Status: ${res.status}`);
          }
          return res.json();
        })
        .then(data => {
          setPlaceName(data.name || '');
          setTagline(data.tagline || ''); // 백엔드 데이터에 tagline이 없다면 기본값
          setAddress(data.address || '');
          setPhotos(data.photos || []); // 백엔드 데이터에 photos가 없다면 빈 배열
          setDescriptionTitle(data.descriptionTitle || ''); // 백엔드 데이터에 descriptionTitle이 없다면 기본값
          setDescription(data.description || '');
          setIsLoading(false);
        })
        .catch(error => {
          console.error("Error fetching place data:", error);
          setIsLoading(false);
          alert(`Error loading place data: ${error.message}`);
          navigate(-1); // 오류 발생 시 이전 페이지로 돌려보내기
        });

      // TODO: 실제 API가 구현되면 아래 목업 데이터 사용 코드는 제거해야 합니다.
      // 목업 데이터 사용 (개발 중 테스트용)
      // setPlaceName(MOCK_PLACE_DATA.name);
      // setTagline(MOCK_PLACE_DATA.tagline);
      // setAddress(MOCK_PLACE_DATA.address);
      // setPhotos(MOCK_PLACE_DATA.photos);
      // setDescriptionTitle(MOCK_PLACE_DATA.descriptionTitle);
      // setDescription(MOCK_PLACE_DATA.description);
      // setIsLoading(false);
    } else {
      console.warn("No placeId provided for editing. Redirecting to lobby.");
      // placeId가 없으면 로비로 돌려보내거나 오류 메시지 표시
      navigate('/lobby');
    }
  }, [placeIdToEdit, navigate]);

  const handleGoBack = () => {
    navigate(-1); // 이전 페이지로 이동
  };

  const handleSave = () => {
    // 수정된 데이터를 백엔드로 전송하여 저장하는 로직 구현
    const updatedPlaceData = {
      // id는 URL 파라미터로 전달되므로 body에 포함하지 않을 수 있음
      name: placeName,
      tagline: tagline,
      address: address,
      photos: photos, // 사진 처리 로직 필요 (파일 업로드 등)
      descriptionTitle: descriptionTitle,
      description: description,
    };
    console.log('Saving data:', updatedPlaceData);

    // API 호출
    fetch(`http://localhost:3000/places/${placeIdToEdit}`, { // 백엔드 URL과 ID를 사용
      method: 'PUT', // 또는 'PATCH'
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedPlaceData),
    })
    .then(res => {
      if (res.ok) {
        alert('Changes saved successfully!'); // 성공 알림
        navigate('/lobby'); // 저장 후 로비로 이동
      } else {
        // 오류 처리
        console.error("Failed to save place data. Status:", res.status);
        alert(`Failed to save changes. Status: ${res.status}`);
      }
    })
    .catch(error => {
        console.error("Error saving place data:", error);
        alert(`Error saving changes: ${error.message}`);
    });
  };

  // 사진 추가/삭제 관련 핸들러 (예시, 실제 구현 필요)
  const handleAddPhoto = (event) => {
    // 파일 선택 시 처리 로직
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotos(prevPhotos => [...prevPhotos, reader.result]); // 임시로 base64 URL 저장
      };
      reader.readAsDataURL(file);
      console.log("Photo added:", file.name);
    }
  };

  const handleRemovePhoto = (indexToRemove) => {
    setPhotos(prevPhotos => prevPhotos.filter((_, index) => index !== indexToRemove));
    console.log("Photo removed at index:", indexToRemove);
  };


  if (isLoading) {
    return (
      <div className="edit-place-container loading-state">
        <p>Loading place data...</p>
      </div>
    );
  }

  return (
    <div className="edit-place-container">
      <header className="edit-place-header">
        <button onClick={handleGoBack} className="back-arrow-button" aria-label="Go back">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15.41 7.41L14 6L8 12L14 18L15.41 16.59L10.83 12L15.41 7.41Z" fill="currentColor"/>
          </svg>
        </button>
        <h1>Edit</h1>
      </header>

      <div className="edit-place-content">
        <div className="form-group">
          <label htmlFor="placeName">Place Name</label>
          <input
            type="text"
            id="placeName"
            value={placeName}
            onChange={(e) => setPlaceName(e.target.value)}
            placeholder="Enter place name"
          />
        </div>

        <div className="form-group">
          <label htmlFor="tagline">Tagline / Short Description</label>
          <input
            type="text"
            id="tagline"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="e.g., Trendy alleys with old hanoks"
          />
        </div>

        <div className="form-group">
          <label htmlFor="address">Location</label>
          <div className="location-input-group">
            <span className="location-icon">📍</span> {/* 간단한 아이콘 예시 */}
            <input
              type="text"
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter address"
            />
          </div>
        </div>

        <div className="form-group">
          <label>Photos</label>
          <div className="photos-preview-grid">
            {photos.map((photoSrc, index) => (
              <div key={index} className="photo-preview-item">
                <img src={photoSrc} alt={`Preview ${index + 1}`} />
                <button onClick={() => handleRemovePhoto(index)} className="remove-photo-btn">×</button>
              </div>
            ))}
            {/* 사진 추가 버튼 - 간단한 형태로 구현 */}
            <label htmlFor="addPhotoInput" className="add-photo-label">
              +
              <input type="file" id="addPhotoInput" onChange={handleAddPhoto} accept="image/*" style={{ display: 'none' }}/>
            </label>
          </div>
        </div>
        
        <div className="form-group">
          <label htmlFor="descriptionTitle">Description Title</label>
          <input
            type="text"
            id="descriptionTitle"
            value={descriptionTitle}
            onChange={(e) => setDescriptionTitle(e.target.value)}
            placeholder="e.g., Hanok Street View"
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows="5"
            placeholder="Enter detailed description"
          />
        </div>
      </div>

      <footer className="edit-place-footer">
        <button className="save-button" onClick={handleSave}>
          Save
        </button>
      </footer>
    </div>
  );
}