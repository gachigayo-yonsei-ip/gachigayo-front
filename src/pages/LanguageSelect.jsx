import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './LanguageSelect.css'

export default function LanguageSelect() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState(null)
  const languages = [
    { code: 'en', name: 'English', flag: '/United States.png' },
    { code: 'kr', name: 'Korean', flag: '/South Korea.png' },
    { code: 'jp', name: 'Japanese', flag: '/Japan.png' },
    { code: 'ch', name: 'Chinese', flag: '/China.png' },
  ]

  const handleSelect = (lang) => {
    setSelected(lang.code)
  }

  const handleContinue = () => {
    if (selected) {
      console.log(`Continue with language: ${selected}`)
      navigate('/lobby')
    }
  }

  return (
    <div className="onboard-wrap">
      <div className="onboard-center">
        <h2>Select Your Language</h2>
        <div className="language-list">
          {languages.map((lang) => (
            <button
              key={lang.code}
              className={`language-btn ${selected === lang.code ? 'selected' : ''}`}
              onClick={() => handleSelect(lang)}
            >
              <img src={lang.flag} alt={`${lang.name} flag`} className="flag-img" />
              <span>{lang.name}</span>
              {selected === lang.code && (
                <img src="/check.png" alt="Selected" className="check-icon" />
              )}
            </button>
          ))}
        </div>
      </div>
      <button className="cta-btn" onClick={handleContinue} disabled={!selected}>
        Continue
      </button>
    </div>
  )
}