import { useState } from 'react'
import PublicHero from './PublicHero'
import PublicScorecard from './PublicScorecard'
import PublicManifesto from './PublicManifesto'
import PublicFeatures from './PublicFeatures'
import PublicPosters from './PublicPosters'
import PublicGallery from './PublicGallery'
import HowItWorks from './HowItWorks'
import GuestEvaluator from './GuestEvaluator'
import LoginPrompt from './LoginPrompt'
import './public.css'

export default function PublicLanding({ onLogin }) {
  const [showPrompt, setShowPrompt] = useState(false)

  function requestLogin() { setShowPrompt(true) }
  function handleConfirmLogin() { setShowPrompt(false); onLogin() }

  return (
    <div className="public-landing">

      <PublicHero onLogin={requestLogin} />
      <PublicScorecard />
      <PublicManifesto onLogin={requestLogin} />

      {/* What this site is — dark strip */}
      <div className="public-intro">
        <p>
          Atelier is a private AI studio companion for painters who want to think more deeply
          about their work — not share it. Every painting builds a journal of evaluations,
          conversations, and essays written in your voice.
        </p>
        <div className="public-intro__pills">
          {['AI evaluation', 'Score over time', 'Companion dialogue', 'Process journal', 'Private by design'].map(t => (
            <span key={t} className="public-intro__pill">{t}</span>
          ))}
        </div>
      </div>

      <PublicFeatures onLogin={requestLogin} />

      {/* Attractive poster grid of quotes + journal excerpts */}
      <PublicPosters onLogin={requestLogin} />

      {/* Guest evaluator — try it before signing up */}
      <GuestEvaluator onLogin={requestLogin} />

      <HowItWorks showCta onCta={requestLogin} />

      <PublicGallery onLogin={requestLogin} />

      {showPrompt && (
        <LoginPrompt onLogin={handleConfirmLogin} onDismiss={() => setShowPrompt(false)} />
      )}
    </div>
  )
}
