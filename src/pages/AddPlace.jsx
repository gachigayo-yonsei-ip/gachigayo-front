import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import './addPlace.css';

export default function AddPlace() {
  const KAKAO_REST_API_KEY = import.meta.env.VITE_KAKAO_REST_API_KEY;
  const GOOGLE_TRANSLATE_API_KEY = import.meta.env.VITE_GOOGLE_TRANSLATE_API_KEY; // Google Translate API 키 추가
  const navigate = useNavigate();

  // 📌 State 선언
  const [photo, setPhoto] = useState(null);
  const [location, setLocation] = useState('');   // 주소 (한국어, 백엔드 전송용)
  const [name, setName] = useState('');           // 장소명 (한국어, 백엔드 전송용)
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [nameError, setNameError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]); // 한국어 검색 결과
  const [translatedResults, setTranslatedResults] = useState([]); // 번역된 검색 결과

  // 선택된 장소의 번역된 이름/주소를 표시하기 위한 상태 추가
  const [displayedSelectedName, setDisplayedSelectedName] = useState('');
  const [displayedSelectedLocation, setDisplayedSelectedLocation] = useState('');

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // 📌 사진 업로드 핸들러 (기존과 동일)
  const handlePhotoChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setPhoto(URL.createObjectURL(e.target.files[0]));
    }
  };

  // 📌 텍스트 번역 함수
  const translateText = async (text, targetLanguage = 'en') => {
    if (!GOOGLE_TRANSLATE_API_KEY) {
      console.warn("Google Translate API Key is not set. Translation will not work.");
      return text; // 키가 없으면 원본 텍스트 반환
    }
    if (!text || text.trim() === '') return '';

    const url = `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_TRANSLATE_API_KEY}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text,
          target: targetLanguage,
          source: 'ko', // 한국어를 원본 언어로 명시
        }),
      });
      const data = await response.json();
      if (data.data && data.data.translations && data.data.translations.length > 0) {
        return data.data.translations[0].translatedText;
      }
      return text; // 번역 실패 시 원본 텍스트 반환
    } catch (error) {
      console.error('Translation error:', error);
      return text; // 오류 발생 시 원본 텍스트 반환
    }
  };


  // 📌 카카오 장소 검색 및 번역
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setTranslatedResults([]);
      return;
    }

    setIsLoading(true); // 검색 시작 시 로딩 상태 활성화
    try {
      // 1. 카카오 로컬 API로 한국어 장소 검색
      const response = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(searchTerm)}`, {
        headers: {
          Authorization: `KakaoAK ${KAKAO_REST_API_KEY}`
        }
      });
      const data = await response.json();
      const rawResults = data.documents;
      setSearchResults(rawResults); // 한국어 검색 결과 저장

      // 2. 검색된 각 장소의 이름과 주소를 영어로 번역
      const translatedPromises = rawResults.map(async (place) => {
        const translatedName = await translateText(place.place_name);
        const translatedAddress = await translateText(place.road_address_name || place.address_name);
        return {
          ...place, // 이곳에서 스프레드 구문 사용
          translated_place_name: translatedName,
          translated_address_name: translatedAddress,
        };
      });

      const translatedData = await Promise.all(translatedPromises);
      setTranslatedResults(translatedData); // 번역된 결과 저장

    } catch (error) {
      console.error('장소 검색 또는 번역 에러:', error);
      setSearchResults([]);
      setTranslatedResults([]);
      setToastMessage('장소 검색 또는 번역 중 오류가 발생했습니다.');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } finally {
      setIsLoading(false); // 검색 완료 시 로딩 상태 비활성화
    }
  };

  // 📌 장소 선택 핸들러
  const handleSelectPlace = (place) => {
    // 백엔드 전송용 상태에는 한국어 원본을 저장
    setName(place.place_name);
    setLocation(place.road_address_name || place.address_name);

    // UI 표시용 상태에는 번역된 값을 저장 (번역 실패 시 한국어 원본 폴백)
    setDisplayedSelectedName(place.translated_place_name || place.place_name);
    setDisplayedSelectedLocation(place.translated_address_name || place.road_address_name || place.address_name);

    // 검색 결과 UI는 숨깁니다.
    setSearchTerm('');
    setSearchResults([]);
    setTranslatedResults([]);
  };

  // 📌 태그 추가 (기존과 동일)
  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  // 📌 태그 삭제 (기존과 동일)
  const handleDeleteTag = (tagToDelete) => {
    setTags(tags.filter((tag) => tag !== tagToDelete));
  };

  // 📌 ID 생성 (기존과 동일)
  const generateId = () => uuidv4();

  // 📌 제출 핸들러 (기존과 동일)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { // name 상태는 백엔드 전송용 (한국어)
      setNameError(true);
      return;
    }

    setIsLoading(true);

    // ✅ lat/lon은 백엔드가 변환할 거니까 안 보내도 됨
    const newPlace = {
      id: generateId(),
      name: displayedSelectedName, // 한국어 장소명 전송 (name 상태에 저장된 값)
      address: displayedSelectedLocation, // 한국어 주소 전송 (location 상태에 저장된 값)
      description, 
      tag: tags,
      detail_uri: null,
      available_time: null,
      open_day: null,
      closed_day: null,
      subway_info: null,
      language: "en" // 이 필드는 앱의 언어 설정을 따를 것입니다.
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
              placeholder="Enter place name"
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
              disabled={isLoading}
            >
              {isLoading ? 'Searching...' : 'Search'}
            </button>
          </div>

          {/* 검색 결과 - 번역된 결과 표시 */}
          {translatedResults.length > 0 && (
            <ul style={{
              listStyle: 'none',
              padding: 0,
              marginTop: '8px',
              maxHeight: '200px',
              overflowY: 'auto',
              border: '1px solid #eee',
              borderRadius: '8px'
            }}>
              {translatedResults.map((place) => (
                <li
                  key={place.id}
                  onClick={() => handleSelectPlace(place)}
                  style={{
                    padding: '8px',
                    borderBottom: '1px solid #eee',
                    cursor: 'pointer'
                  }}
                >
                  <strong>{place.translated_place_name || place.place_name}</strong> <br />
                  <small>{place.translated_address_name || place.road_address_name || place.address_name}</small>
                  {/* 한국어 원본도 표시하고 싶다면: */}
                  {/* <br/><small style={{ color: '#888' }}>({place.place_name}, {place.road_address_name || place.address_name})</small> */}
                </li>
              ))}
            </ul>
          )}
          {isLoading && searchTerm.trim() && searchResults.length === 0 && translatedResults.length === 0 && (
            <p style={{ textAlign: 'center', color: '#666', marginTop: '10px' }}>Searching for places...</p>
          )}

          <input
            type="text"
            value={displayedSelectedLocation} // 번역된 주소 표시
            readOnly
            placeholder="Selected place address will appear here"
            className="input"
            style={{ marginTop: '8px' }}
          />
        </div>

        <div className="input-group">
          <label className="label">Name</label>
          <input
            type="text"
            placeholder="e.g., Cafe Mellow, Seoul Forest Lookout"
            value={displayedSelectedName} // 선택된 장소의 번역된 이름 표시
            onChange={(e) => {
              setDisplayedSelectedName(e.target.value); // 표시되는 값 업데이트
              setName(e.target.value); // 백엔드 전송용 name도 업데이트 (사용자가 직접 입력한 값)
              setNameError(false);
            }}
            className={`input ${nameError ? 'input-error' : ''}`}
          />
          {nameError && <p className="error-text">Name is required</p>}
        </div>

        {/* Tags 입력 (기존과 동일) */}
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
            placeholder="Enter tags and press Enter"
            className="input"
          />
        </div>

        {/* Description 입력 (기존과 동일) */}
        <div className="input-group">
          <label className="label">Description</label>
          <textarea
            placeholder="Why is this place special to you?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="textarea"
          />
        </div>

        {/* 제출 버튼 (기존과 동일) */}
        <button
          type="submit"
          className={`submit-button ${name.trim() ? 'active' : 'disabled'}`}
          disabled={isLoading}
        >
          {isLoading ? 'Submitting...' : 'Submit'}
        </button>
      </form>

      {/* Toast 알림 (기존과 동일) */}
      {showToast && (
        <div className={`toast ${showToast ? 'show' : ''}`}>
          {toastMessage}
        </div>
      )}
    </div>
  );
}
