import { useEffect, useState } from 'react'
import '../styles/design-system.css'
import { getPaintings, getTopInspiration, getBlogPosts } from '../lib/supabase'

const MORNING_MESSAGE = "Memory Lane has been at 90 for four days. The figure's gesture is still the open question."

function daysSince(dateStr) {
  if (!dateStr) return null
  const diff = Date.now() - new Date(dateStr).getTime()
  return Math.floor(diff / 86400000)
}

function ScrollCard({ painting, onClick }) {
  const days = daysSince(painting.evaluated_at)
  const thumb = painting.image_url
    ? painting.image_url.replace('full.jpg', 'thumb.jpg')
    : painting.thumbnail_b64 ? `data:image/jpeg;base64,${painting.thumbnail_b64}` : null
  return (
    <div style={{ width: 200, flexShrink: 0, cursor: 'pointer' }} onClick={() => onClick?.(painting)}>
      {thumb
        ? <img src={thumb} alt={painting.title} style={{ width: '100%', height: 150, objectFit: 'cover', borderRadius: 8, display: 'block' }} />
        : <div style={{ width: '100%', height: 150, borderRadius: 8, background: 'var(--stone)' }} />
      }
      <p style={{ fontWeight: 500, fontSize: 14, marginTop: 8 }}>{painting.title}</p>
      <p style={{ color: 'var(--warm)', fontSize: 12, marginTop: 2 }}>
        {painting.score_overall ?? '—'}{days !== null ? `  ·  ${days}d ago` : ''}
      </p>
    </div>
  )
}

export default function HomeScreen({ onPaintingClick }) {
  const [paintings, setPaintings]   = useState([])
  const [inspiration, setInspiration] = useState(null)
  const [blogPosts, setBlogPosts]   = useState([])

  useEffect(() => {
    getPaintings(null, { type: 'artist_work' })
      .then(setPaintings)
      .catch(() => {})
    getTopInspiration()
      .then(setInspiration)
      .catch(() => {})
    getBlogPosts()
      .then(setBlogPosts)
      .catch(() => {})
  }, [])

  const blogSlugs  = new Set(blogPosts.map(b => b.painting_slug).filter(Boolean))
  const wip        = paintings.filter(p => p.status === 'wip')
  const dueReview  = paintings.filter(p => p.status === 'finished' && !blogSlugs.has(p.slug))
  const recentBlogs = blogPosts.slice(0, 3)

  return (
    <div className="home-screen">

      {/* 1 — Morning message */}
      <header className="home-header">
        <h1 className="t-display home-wordmark">Atelier</h1>
        <div className="companion-message">
          <p className="companion-text">{MORNING_MESSAGE}</p>
        </div>
      </header>

      {/* 2 — WIP paintings */}
      <section className="home-section">
        <p className="t-micro home-section-label">In progress</p>
        {wip.length === 0
          ? <p className="t-small" style={{ color: 'var(--text-muted)' }}>No paintings in progress.</p>
          : <div style={{ display: 'flex', flexDirection: 'row', gap: 16, overflowX: 'auto', paddingBottom: 8 }}>
              {wip.map(p => <ScrollCard key={p.slug} painting={p} onClick={onPaintingClick} />)}
            </div>
        }
      </section>

      {/* 3 — Philosophical excerpt */}
      {inspiration && (
        <section className="home-section">
          <p className="t-micro home-section-label">Current influence</p>
          <div className="card-dark">
            <p className="t-small" style={{ fontWeight: 500, color: 'var(--light)' }}>{inspiration.title}</p>
            <p className="t-micro" style={{ color: 'var(--mid)', margin: 'var(--space-1) 0 var(--space-3)' }}>{inspiration.creator}</p>
            {inspiration.influence_note && (
              <p className="t-small" style={{ color: 'var(--stone)', lineHeight: 1.6 }}>{inspiration.influence_note}</p>
            )}
          </div>
        </section>
      )}

      {/* 4 — Due for review */}
      {dueReview.length > 0 && (
        <section className="home-section">
          <p className="t-micro home-section-label">No blog post yet</p>
          <div style={{ display: 'flex', flexDirection: 'row', gap: 16, overflowX: 'auto', paddingBottom: 8 }}>
            {dueReview.map(p => <ScrollCard key={p.slug} painting={p} onClick={onPaintingClick} />)}
          </div>
        </section>
      )}

      {/* 5 — Recent blog drafts */}
      {recentBlogs.length > 0 && (
        <section className="home-section">
          <p className="t-micro home-section-label">Recent writing</p>
          {recentBlogs.map(b => (
            <div key={b.id} className="home-blog-row">
              <div>
                <p className="t-small" style={{ fontWeight: 500 }}>{b.title || 'Untitled'}</p>
                {b.painting_slug && <p className="t-micro" style={{ color: 'var(--text-muted)' }}>{b.painting_slug}</p>}
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', flexShrink: 0 }}>
                {b.word_count && <span className="t-micro" style={{ color: 'var(--text-muted)' }}>{b.word_count}w</span>}
                <span className={`blog-status blog-status--${b.status}`}>{b.status}</span>
              </div>
            </div>
          ))}
        </section>
      )}

    </div>
  )
}
