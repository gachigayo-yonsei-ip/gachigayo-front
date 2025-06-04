import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './EditPlace.css';

export default function EditPlace() {
  const navigate = useNavigate();
  const location = useLocation();
  const placeIdToEdit = location.state?.placeId;

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [placeName, setPlaceName] = useState('');
  const [address, setAddress] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [descriptionTitle, setDescriptionTitle] = useState('');
  const [description, setDescription] = useState('');

  const showToastMessage = (msg, duration = 1500) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), duration);
  };

  // ─────────────────────────────────────────────────────────────────
  // 1) handleSave 함수: 저장 버튼을 눌렀을 때 updatedPlaceData를 만들어
  //    PUT 요청을 서버로 보내는 부분
  // ─────────────────────────────────────────────────────────────────
  const handleSave = () => {
    // 1-1) updatedPlaceData 선언·초기화
    const updatedPlaceData = {
      name: placeName,              
      tag: tags,                
      address: address,                
      descriptionTitle: descriptionTitle,
      description: description           
    };

    console.log("🔔 handleSave() 호출됨, 서버로 보낼 데이터:", updatedPlaceData);

    // 1-2) PUT 요청
    fetch(`http://localhost:3000/places/${placeIdToEdit}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedPlaceData),
    })
      .then((res) => {
        if (res.ok) {
          showToastMessage('💾 Changes saved successfully! 💾', 1500);
          setTimeout(() => navigate('/lobby', { state: { needsRefresh: true } }), 1500);
        } else {
          throw new Error(`Status: ${res.status}`);
        }
      })
      .catch((error) => {
        console.error('Error saving place data:', error);
        showToastMessage(`Error saving changes: ${error.message}`, 2000);
      });
  }; // ← handleSave 끝

  // ─────────────────────────────────────────────────────────────────
  // 2) useEffect 훅: 컴포넌트가 마운트되면 서버에서 기존 데이터를 불러와 상태 세팅
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!placeIdToEdit) {
      navigate('/lobby');
      return;
    }

    fetch(`http://localhost:3000/places/${placeIdToEdit}`)
      .then((res) => {
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error('Place not found for editing.');
          }
          throw new Error(`HTTP error! Status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        setPlaceName(data.name || '');
        setAddress(data.address || '');
        setDescriptionTitle(data.descriptionTitle || '');
        setDescription(data.description || '');

        if (Array.isArray(data.tag)) {
          setTags(data.tag);
        } else if (typeof data.tag === 'string' && data.tag.trim()) {
          setTags([data.tag.trim()]);
        } else {
          setTags([]);
        }

        setIsLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching place data:', error);
        setIsLoading(false);
        showToastMessage(`Error loading place data: ${error.message}`, 2000);
        setTimeout(() => navigate(-1), 2000);
      });
  }, [placeIdToEdit, navigate]);

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim();
      if (!tags.includes(newTag)) {
        setTags((prev) => [...prev, newTag]);
      }
      setTagInput('');
    }
  };

  const handleDeleteTag = (tagToDelete) => {
    setTags((prev) => prev.filter((t) => t !== tagToDelete));
  };

  if (isLoading) {
    return (
      <div className="container">
        <p>Loading place data...</p>
      </div>
    );
  }

  return (
    <div className="container">
      {/* 토스트 알림 */}
      {showToast && (
        <div className={`toast ${showToast ? 'show' : ''}`}>
          {toastMessage}
        </div>
      )}

      {/* 상단 헤더 */}
      <div className="header">
        <button onClick={handleGoBack} className="back-button">←</button>
        <h2 className="header-title">Edit</h2>
      </div>

      {/* 타이틀 섹션 */}
      <div className="title-section">
        <h1 className="main-title">Edit Place</h1>
        <p className="sub-title">Modify the details of your place</p>
      </div>

      <form className="form" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
        {/* 1) Place Name */}
        <div className="input-group">
          <label className="label" htmlFor="placeName">Place Name</label>
          <input
            className={`input ${!placeName.trim() ? 'input-error' : ''}`}
            type="text"
            id="placeName"
            value={placeName}
            onChange={(e) => setPlaceName(e.target.value)}
            placeholder="Enter place name"
          />
          {!placeName.trim() && <p className="error-text">Name is required</p>}
        </div>

        {/* 3) Location */}
        <div className="input-group">
          <label className="label" htmlFor="address">Location</label>
          <div className="location-input-group">
            <span className="location-icon">📍</span>
            <input
              className="input-location"
              type="text"
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter address"
            />
          </div>
        </div>

        {/* 2) Tags */}
        <div className="input-group">
          <label className="label" htmlFor="tag">Tags</label>
          <div className="tags-container">
            {tags.map((t) => (
              <div key={t} className="tag-item">
                <span>{t}</span>
                <button
                  type="button"
                  className="tag-close-btn"
                  onClick={() => handleDeleteTag(t)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <input
            className="input"
            type="text"
            id="tag"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            placeholder="Enter tags and press Enter"
          />
        </div>

        {/* 5) Description */}
        <div className="input-group">
          <label className="label" htmlFor="description">Description</label>
          <textarea
            className="textarea"
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter detailed description"
          />
        </div>

        {/* 저장(수정) 버튼 */}
        <button
          type="submit"
          className={`save-button ${placeName.trim() ? 'active' : 'disabled'}`}
          disabled={!placeName.trim()}
        >
          Save
        </button>
      </form>
    </div>
  );
}
