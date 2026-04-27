import { useState, useEffect } from 'react'
import './public.css'

const SLIDES = [
  '/hero/1.jpeg',
  '/hero/2.jpeg',
  '/hero/3.jpeg',
  '/hero/5.jpeg',
  '/hero/6.jpeg',
]

export default function PublicHero({ onLogin }) {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setActive(i => (i + 1) % SLIDES.length), 4500)
    return () => clearInterval(t)
  }, [])

  return (
    <section className="public-hero">
      {SLIDES.map((src, i) => (
        <div
          key={src}
          className={`public-hero__slide${i === active ? ' active' : ''}`}
          style={{ backgroundImage: `url(${src})` }}
        />
      ))}

      <div className="public-hero__overlay" />

      <div className="public-hero__content">
        <h1 className="public-hero__title">Atelier</h1>
        <p className="public-hero__tagline">
          A painter's studio.<br />Private. Serious. Alive.
        </p>
        <button className="public-hero__cta" onClick={onLogin}>
          Enter the studio →
        </button>
      </div>

      <div className="public-hero__dots">
        {SLIDES.map((_, i) => (
          <div key={i} className={`public-hero__dot${i === active ? ' active' : ''}`} />
        ))}
      </div>
    </section>
  )
}
