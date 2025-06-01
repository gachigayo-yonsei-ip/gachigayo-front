import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AddPlace() {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [tag, setTag] = useState('');

  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    // 여기서 저장 로직 실행 (예: 서버에 POST)
    console.log({ name, address, lat, lng, tag });

    // 저장 후 홈으로 이동
    navigate('/');
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>새 장소 추가</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>이름</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label>주소</label>
          <input value={address} onChange={(e) => setAddress(e.target.value)} required />
        </div>
        <div>
          <label>위도</label>
          <input value={lat} onChange={(e) => setLat(e.target.value)} required />
        </div>
        <div>
          <label>경도</label>
          <input value={lng} onChange={(e) => setLng(e.target.value)} required />
        </div>
        <div>
          <label>태그</label>
          <input value={tag} onChange={(e) => setTag(e.target.value)} />
        </div>
        <button type="submit">저장</button>
      </form>
    </div>
  );
}
