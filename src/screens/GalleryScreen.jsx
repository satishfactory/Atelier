import { useEffect, useState } from 'react'
import '../styles/design-system.css'
import { getPaintings } from '../lib/supabase'
import PaintingCard from '../components/PaintingCard'

const FILTERS = [
  { label: 'All',          value: null           },
  { label: 'My Work',      value: 'artist_work'  },
  { label: 'Masterpieces', value: 'masterpiece'  },
  { label: 'WIP',          value: 'wip'          },
]

export default function GalleryScreen({ onPaintingClick }) {
  const [all, setAll] = useState([])
  const [active, setActive] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    getPaintings()
      .then(setAll)
      .catch(err => setError(err.message))
  }, [])

  const visible = active ? all.filter(p => p.type === active) : all

  return (
    <div className="gallery-screen">

      <div className="gallery-bar">
        <div className="gallery-filters">
          {FILTERS.map(f => (
            <button
              key={f.label}
              className={`btn gallery-filter-btn${active === f.value ? ' gallery-filter-btn--active' : ''}`}
              onClick={() => setActive(f.value)}
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
