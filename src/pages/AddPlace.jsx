import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid'; 
import './addPlace.css';

export default function AddPlace() {
  const REST_API_KEY = import.meta.env.VITE_KAKAO_REST_API_KEY;
  const navigate = useNavigate();

  // 📌 State 선언
  const [photo, setPhoto] = useState(null);
  const [location, setLocation] = useState('');   // 주소
  const [name, setName] = useState('');           // 장소명
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [nameError, setNameError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // 📌 사진 업로드 핸들러
  const handlePhotoChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setPhoto(URL.createObjectURL(e.target.files[0]));
    }
  };

  // 📌 카카오 장소 검색
  const handleSearch = async () => {
    if (!searchTerm.trim()) return;

    try {
      const response = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(searchTerm)}`, {
        headers: {
          Authorization: `KakaoAK ${REST_API_KEY}`
        }
      });
      const data = await response.json();
      setSearchResults(data.documents);
    } catch (error) {
      console.error('장소 검색 에러:', error);
    }
  };

  // 📌 장소 선택 핸들러
  const handleSelectPlace = (place) => {
    setName(place.place_name);  
    setLocation(place.road_address_name || place.address_name);  // ✅ 도로명 주소 우선
    setSearchTerm('');
    setSearchResults([]);
  };

  // 📌 태그 추가
  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  // 📌 태그 삭제
  const handleDeleteTag = (tagToDelete) => {
    setTags(tags.filter((tag) => tag !== tagToDelete));
  };

  // 📌 ID 생성
  const generateId = () => uuidv4();

  // 📌 제출 핸들러
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setNameError(true);
      return;
    }

    setIsLoading(true);

    // ✅ lat/lon은 백엔드가 변환할 거니까 안 보내도 됨
    const newPlace = {
      id: generateId(),
      name,
      address: location,
      tag: tags,
      detail_uri: null,
      available_time: null,
      open_day: null,
      closed_day: null,
      subway_info: null,
      language: "en"
    };

    try {
      const response = await fetch('http://localhost:3000/places', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newPlace)
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Place added:', data);
        setToastMessage('✅ Place successfully added!');
        setShowToast(true);
        setTimeout(() => {
          setShowToast(false);
          navigate('/lobby'); // 1.5초 후 페이지 이동
        }, 1500);
      } else {
        console.error('❌ Failed to add place');
        setToastMessage('❌ Failed to add place.');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 1500);
      }
    } catch (error) {
      console.error('❌ Error:', error);
      setToastMessage('❌ Server error occurred.');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 1500);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container">
      {/* 상단 헤더 */}
      <div className="header">
        <button onClick={() => navigate(-1)} className="back-button">←</button>
        <h2 className="header-title">Add</h2>
      </div>

      {/* 타이틀 */}
      <div className="title-section">
        <h1 className="main-title">Add Place</h1>
        <p className="sub-title">Tell us what makes this place special</p>
      </div>

      {/* 폼 */}
      <form onSubmit={handleSubmit} className="form">
        {/* 사진 업로드 */}
        <div className="photo-upload">
          {photo ? (
            <img src={photo} alt="Uploaded" className="uploaded-photo" />
          ) : (
            <div className="photo-placeholder">Add photo</div>
          )}
          <label htmlFor="photo-upload" className="photo-upload-button">+</label>
          <input
            id="photo-upload"
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            style={{ display: 'none' }}
          />
        </div>

        {/* Location (카카오 장소 검색) */}
        <div className="input-group">
          <label className="label">Location</label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearch();
                }
              }}
              placeholder="장소 이름을 입력하세요"
              className="input"
              style={{ flex: 1 }}
            />
            <button
              type="button"
              onClick={handleSearch}
              style={{
                padding: '8px 16px',
                backgroundColor: '#1673ff',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              검색
            </button>
          </div>

          {/* 검색 결과 */}
          {searchResults.length > 0 && (
            <ul style={{
              listStyle: 'none',
              padding: 0,
              marginTop: '8px',
              maxHeight: '200px',
              overflowY: 'auto',
              border: '1px solid #eee',
              borderRadius: '8px'
            }}>
              {searchResults.map((place) => (
                <li
                  key={place.id}
                  onClick={() => handleSelectPlace(place)}
                  style={{
                    padding: '8px',
                    borderBottom: '1px solid #eee',
                    cursor: 'pointer'
                  }}
                >
                  <strong>{place.place_name}</strong> <br />
                  <small>{place.road_address_name || place.address_name}</small>
                </li>
              ))}
            </ul>
          )}

          {/* 선택된 장소 표시 */}
          <input
            type="text"
            value={location}
            readOnly
            placeholder="선택된 장소가 여기에 표시됩니다"
            className="input"
            style={{ marginTop: '8px' }}
          />
        </div>

        {/* Name 입력 */}
        <div className="input-group">
          <label className="label">Name</label>
          <input
            type="text"
            placeholder="e.g., Cafe Mellow, Seoul Forest Lookout"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setNameError(false);
            }}
            className={`input ${nameError ? 'input-error' : ''}`}
          />
          {nameError && <p className="error-text">Name is required</p>}
        </div>

        {/* Tags 입력 */}
        <div className="input-group">
          <label className="label">Tags</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
            {tags.map((tag) => (
              <div key={tag} style={{
                backgroundColor: '#e0e0e0',
                borderRadius: '16px',
                padding: '4px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <span>{tag}</span>
                <button
                  type="button"
                  onClick={() => handleDeleteTag(tag)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            placeholder="태그를 입력하고 엔터를 누르세요"
            className="input"
          />
        </div>

        {/* Description 입력 */}
        <div className="input-group">
          <label className="label">Description</label>
          <textarea
            placeholder="Why is this place special to you?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="textarea"
          />
        </div>

        {/* 제출 버튼 */}
        <button
          type="submit"
          className={`submit-button ${name.trim() ? 'active' : 'disabled'}`}
          disabled={isLoading}
        >
          {isLoading ? 'Submitting...' : 'Submit'}
        </button>
      </form>

      {/* Toast 알림 */}
      {showToast && (
        <div className={`toast ${showToast ? 'show' : ''}`}>
          {toastMessage}
        </div>
      )}
    </div>
  );
}
