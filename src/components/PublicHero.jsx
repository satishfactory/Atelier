import { useState, useEffect } from 'react'
import './public.css'

const SLIDES = [
  '/hero/at1.jpeg',
  '/hero/at2.jpeg',
  '/hero/at4.jpeg',
  '/hero/at5.jpeg',
  '/hero/at6.jpeg',
  '/hero/at8.jpeg',
  '/hero/at9.jpeg',
  '/hero/at11.jpeg',
  '/hero/at12.jpeg',
]

export default function PublicHero({ onLogin }) {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setActive(i => (i + 1) % SLIDES.length), 4500)
    return () => clearInterval(t)
  }, [])

  return (
    <section className="public-hero">

      {/* Gallery wall — painting shown at natural proportions */}
      <div className="public-hero__frame">
        <div className="public-hero__canvas">
          {SLIDES.map((src, i) => (
            <div
              key={src}
              className={`public-hero__slide${i === active ? ' active' : ''}`}
              style={{ backgroundImage: `url(${src})` }}
            />
          ))}
        </div>

        <div className="public-hero__dots">
          {SLIDES.map((_, i) => (
            <div key={i} className={`public-hero__dot${i === active ? ' active' : ''}`} />
          ))}
        </div>
      </div>

      {/* Text below the painting */}
      <div className="public-hero__content">
        <h1 className="public-hero__title">Atelier</h1>
        <p className="public-hero__tagline">
          A painter's studio. Private. Serious. Alive.
        </p>
        <button className="public-hero__cta" onClick={onLogin}>
          Enter the studio →
        </button>
      </div>

    </section>
  )
}
