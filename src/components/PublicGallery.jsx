import { useState, useEffect } from 'react'
import { getPublicPaintings } from '../lib/supabase'
import './public.css'

export default function PublicGallery({ onLogin }) {
  const [paintings, setPaintings] = useState([])

  useEffect(() => {
    getPublicPaintings().then(setPaintings).catch(() => {})
  }, [])

  if (!paintings.length) return null

  return (
    <section className="public-gallery-section">
      <h2>Finished work</h2>
      <div className="gallery-grid gallery-grid--flush">
        {paintings.map(p => (
          <div key={p.slug} className="public-painting-card" onClick={onLogin}>
            {p.image_url && (
              <img src={p.image_url} alt={p.title} loading="lazy" />
            )}
            <div className="public-painting-card__label">
              {p.title}{p.year ? ` · ${p.year}` : ''}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
