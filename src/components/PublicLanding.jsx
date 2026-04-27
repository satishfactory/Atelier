import { useState } from 'react'
import PublicHero from './PublicHero'
import PublicQuotes from './PublicQuotes'
import PublicGallery from './PublicGallery'
import HowItWorks from './HowItWorks'
import LoginPrompt from './LoginPrompt'
import './public.css'

export default function PublicLanding({ onLogin }) {
  const [showPrompt, setShowPrompt] = useState(false)

  function requestLogin() {
    setShowPrompt(true)
  }

  function handleConfirmLogin() {
    setShowPrompt(false)
    onLogin()
  }

  return (
    <div className="public-landing">
      <PublicHero onLogin={requestLogin} />
      <PublicQuotes onLogin={requestLogin} />
      <HowItWorks showCta onCta={requestLogin} />
      <PublicGallery onLogin={requestLogin} />

      {showPrompt && (
        <LoginPrompt
          onLogin={handleConfirmLogin}
          onDismiss={() => setShowPrompt(false)}
        />
      )}
    </div>
  )
}
