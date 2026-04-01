import { useEffect, useState } from 'react'
import '../styles/design-system.css'
import { getPaintings } from '../lib/supabase'
import PaintingCard from '../components/PaintingCard'

const FILTERS = [
  { label: 'All',          type: null,           status: null       },
  { label: 'My Work',      type: 'artist_work',  status: 'finished' },
  { label: 'Masterpieces', type: 'masterpiece',  status: null       },
  { label: 'WIP',          type: 'artist_work',  status: 'wip'      },
]

export default function GalleryScreen({ onPaintingClick }) {
  const [all, setAll] = useState([])
  const [active, setActive] = useState(0)
  const [error, setError] = useState(null)

  useEffect(() => {
    const f = FILTERS[active]
    getPaintings(null, { type: f.type, status: f.status })
      .then(setAll)
      .catch(err => setError(err.message))
  }, [active])

  const visible = all

  return (
    <div className="gallery-screen">

      <div className="gallery-bar">
        <div className="gallery-filters">
          {FILTERS.map((f, i) => (
            <button
              key={f.label}
              className={`btn gallery-filter-btn${active === i ? ' gallery-filter-btn--active' : ''}`}
              onClick={() => setActive(i)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="t-micro gallery-count">
          {visible.length} {visible.length === 1 ? 'painting' : 'paintings'}
        </span>
      </div>

      {error && (
        <p className="t-small" style={{ padding: 'var(--space-6)', color: 'var(--coral)' }}>{error}</p>
      )}

      {!error && all.length === 0 && (
        <div className="gallery-grid gallery-grid--skeleton">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ aspectRatio: '4/3', borderRadius: 'var(--radius-md)' }} />
          ))}
        </div>
      )}

      {visible.length > 0 && (
        <div className="gallery-grid">
          {visible.map(p => (
            <PaintingCard key={p.slug} painting={p} onClick={() => onPaintingClick?.(p)} />
          ))}
        </div>
      )}

      {all.length > 0 && visible.length === 0 && (
        <p className="t-small" style={{ padding: 'var(--space-6)', color: 'var(--text-muted)' }}>
          No paintings in this category.
        </p>
      )}

    </div>
  )
}
