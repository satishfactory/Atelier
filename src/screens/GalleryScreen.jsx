import { useEffect, useState } from 'react'
import '../styles/design-system.css'
import { getPaintings } from '../lib/supabase'
import PaintingCard from '../components/PaintingCard'

const FILTERS = [
  { label: 'All',      type: null,          status: null  },
  { label: 'Finished', type: 'artist_work', status: 'finished' },
  { label: 'WIP',      type: 'artist_work', status: 'wip'      },
]

export default function GalleryScreen({ userId, onPaintingClick, onNavigate }) {
  const [all, setAll]       = useState([])
  const [active, setActive] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

  useEffect(() => {
    setLoading(true)
    const f = FILTERS[active]
    getPaintings(userId, { type: f.type, status: f.status })
      .then(data => { setAll(data); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [active, userId])

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

      {!error && loading && (
        <div className="gallery-grid gallery-grid--skeleton">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ aspectRatio: '4/3', borderRadius: 'var(--radius-md)' }} />
          ))}
        </div>
      )}

      {!error && !loading && all.length === 0 && active === 0 && (
        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
          <p className="t-small" style={{ color: 'var(--text-muted)', marginBottom: 16 }}>No paintings yet.</p>
          <button className="btn btn-warm" style={{ fontSize: 13 }} onClick={() => onNavigate?.('upload')}>Upload your first painting →</button>
        </div>
      )}

      {!error && !loading && all.length === 0 && active > 0 && (
        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
          <p className="t-small" style={{ color: 'var(--text-muted)', marginBottom: 16 }}>No paintings in this category.</p>
          <button className="btn" style={{ fontSize: 13 }} onClick={() => setActive(0)}>Show all →</button>
        </div>
      )}

      {!loading && visible.length > 0 && (
        <div className="gallery-grid">
          {visible.map(p => (
            <PaintingCard key={p.slug} painting={p} onClick={() => onPaintingClick?.(p)} />
          ))}
        </div>
      )}

    </div>
  )
}
