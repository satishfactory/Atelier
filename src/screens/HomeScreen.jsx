import { useEffect, useState } from 'react'
import '../styles/design-system.css'
import { getPaintings } from '../lib/supabase'
import PaintingCard from '../components/PaintingCard'

const MORNING_MESSAGE = "Memory Lane has been at 90 for four days. The figure's gesture is still the open question."

export default function HomeScreen({ onPaintingClick }) {
  const [paintings, setPaintings] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    getPaintings()
      .then(data => setPaintings(data.slice(0, 3)))
      .catch(err => setError(err.message))
  }, [])

  return (
    <div className="home-screen">

      <header className="home-header">
        <h1 className="t-display home-wordmark">Atelier</h1>
        <div className="companion-message">
          <p className="companion-text">{MORNING_MESSAGE}</p>
        </div>
      </header>

      <section className="home-paintings">
        <p className="t-micro home-section-label">Recent work</p>
        {error && (
          <p className="t-small" style={{ color: 'var(--coral)' }}>{error}</p>
        )}
        {!error && paintings.length === 0 && (
          <div className="home-paintings-grid">
            {[0, 1, 2].map(i => (
              <div key={i} className="skeleton" style={{ aspectRatio: '4/3', borderRadius: 'var(--radius-md)' }} />
            ))}
          </div>
        )}
        {paintings.length > 0 && (
          <div className="home-paintings-grid">
            {paintings.map(p => (
              <PaintingCard key={p.slug} painting={p} onClick={() => onPaintingClick?.(p)} />
            ))}
          </div>
        )}
      </section>

    </div>
  )
}
