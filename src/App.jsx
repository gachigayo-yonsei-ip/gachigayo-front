import { Routes, Route } from 'react-router-dom'
import './App.css'
import Onboarding from './pages/Onboarding'
import LanguageSelect from './pages/LanguageSelect'
import Lobby from './pages/lobby'

function App() {
  return (
    <Routes>
      <Route path="/language" element={<LanguageSelect />} />
      <Route path="/lobby" element={<Lobby />} />
      {/* 기본 경로는 Onboarding 페이지 */}
      <Route path="*" element={<Onboarding />} />
    </Routes>
  )
}

export default App