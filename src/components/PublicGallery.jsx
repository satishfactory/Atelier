import { useState, useEffect } from 'react'
import { getPublicPaintings } from '../lib/supabase'
import './public.css'

export default function PublicGallery({ onLogin }) {
  const [paintings, setPaintings] = useState([])
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    getPublicPaintings().then(setPaintings).catch(() => {})
  }, [])

  if (!paintings.length) return null

  return (
    <section className="public-gallery-section">
      <h2>Finished work</h2>
      <div className="gallery-grid gallery-grid--flush">
        {paintings.map(p => (
          <div key={p.slug} className="public-painting-card" onClick={() => setSelected(p)}>
            {p.image_url && (
              <img src={p.image_url} alt={p.title} loading="lazy" />
            )}
            <div className="public-painting-card__label">
              {p.title}{p.year ? ` · ${p.year}` : ''}
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div className="painting-modal-backdrop" onClick={() => setSelected(null)}>
          <div className="painting-modal" onClick={e => e.stopPropagation()}>
            {selected.image_url && (
              <img className="painting-modal__img" src={selected.image_url} alt={selected.title} />
            )}
            <div className="painting-modal__body">
              <p className="painting-modal__title">{selected.title}</p>
              <p className="painting-modal__meta">
                {[selected.year, selected.status].filter(Boolean).join(' · ')}
              </p>
              {selected.medium && (
                <p className="painting-modal__medium">{selected.medium}</p>
              )}
            </div>
            <div className="painting-modal__actions">
              <button className="public-hero__cta" style={{ flex: 1 }} onClick={onLogin}>
                See full journal →
              </button>
              <button className="painting-modal__dismiss" onClick={() => setSelected(null)}>
                close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
