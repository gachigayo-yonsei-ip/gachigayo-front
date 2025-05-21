import { useState } from 'react'

import './App.css'

function App() {
  
  return (
    <div className="app-frame">
      <div className="header">My App</div>
      <div className="content">
        <p>This is your content area.</p>
        <p>스크롤이 필요한 경우 여기에 긴 내용을 넣으면 자동으로 스크롤 됩니다.</p>
        <p>...</p>
      </div>
      <div className="footer">Bottom Nav</div>
    </div>
  )
}

export default App
