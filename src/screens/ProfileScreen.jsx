import { useEffect, useState } from 'react'
import '../styles/design-system.css'
import { getArtistProfile, getPaintings } from '../lib/supabase'
import PaintingCard from '../components/PaintingCard'

const DIM_KEYS = [
  { key: 'score_salience',   label: 'Salience'   },
  { key: 'score_gaze',       label: 'Gaze'        },
  { key: 'score_fluency',    label: 'Fluency'     },
  { key: 'score_emotion',    label: 'Emotion'     },
  { key: 'score_complexity', label: 'Complexity'  },
  { key: 'score_mirror',     label: 'Mirror'      },
  { key: 'score_colour',     label: 'Colour'      },
  { key: 'score_narrative',  label: 'Narrative'   },
]

function computeStats(paintings) {
  if (!paintings.length) return null
  const withScore = paintings.filter(p => p.score_overall)
  const avg = withScore.length
    ? Math.round(withScore.reduce((s, p) => s + p.score_overall, 0) / withScore.length)
    : null
  let bestDim = null, bestVal = 0
  DIM_KEYS.forEach(d => {
    const mean = paintings.reduce((s, p) => s + (p[d.key] || 0), 0) / paintings.length
    if (mean > bestVal) { bestVal = mean; bestDim = d.label }
  })
  return { total: paintings.length, avg, bestDim }
}

export default function ProfileScreen({ onPaintingClick }) {
  const [profile, setProfile]   = useState(null)
  const [paintings, setPaintings] = useState([])
  const [featured, setFeatured]   = useState([])
  const [stats, setStats]         = useState(null)
  const [error, setError]         = useState(null)

  useEffect(() => {
    Promise.all([getArtistProfile(), getPaintings()])
      .then(([prof, all]) => {
        setProfile(prof)
        const own = all.filter(p => p.type === 'artist_work')
        setStats(computeStats(own))
        const slugSet = new Set(prof.featured_slugs || [])
        setFeatured(slugSet.size ? own.filter(p => slugSet.has(p.slug)) : own.slice(0, 6))
        setPaintings(own)
      })
      .catch(err => setError(err.message))
  }, [])

  if (error) return <p className="t-small" style={{ padding: 'var(--space-6)', color: 'var(--coral)' }}>{error}</p>
  if (!profile) return <div className="skeleton" style={{ height: 120, margin: 'var(--space-6)', borderRadius: 'var(--radius-md)' }} />

  return (
    <div className="profile-screen">

      <header className="profile-header">
        <h1 className="t-display profile-name">{profile.display_name}</h1>
        <p className="t-small profile-location">{profile.city}, {profile.country}</p>
        {profile.practice_statement && (
          <p className="companion-text profile-practice">{profile.practice_statement}</p>
        )}
      </header>

      {stats && (
        <div className="profile-stats">
          <div className="profile-stat">
            <span className="t-display profile-stat-value">{stats.total}</span>
            <span className="t-micro profile-stat-label">Paintings</span>
          </div>
          <div className="profile-stat">
            <span className="t-display profile-stat-value">{stats.avg ?? '—'}</span>
            <span className="t-micro profile-stat-label">Avg score</span>
          </div>
          <div className="profile-stat">
            <span className="t-heading profile-stat-value profile-stat-value--dim">{stats.bestDim ?? '—'}</span>
            <span className="t-micro profile-stat-label">Strongest dimension</span>
          </div>
        </div>
      )}

      {profile.bio_long && (
        <div className="profile-bio">
          <p className="t-micro profile-section-label">About</p>
          <p className="t-body">{profile.bio_long}</p>
        </div>
      )}

      {featured.length > 0 && (
        <div className="profile-gallery">
          <p className="t-micro profile-section-label">Selected work</p>
          <div className="profile-grid">
            {featured.map(p => (
              <PaintingCard key={p.slug} painting={p} onClick={() => onPaintingClick?.(p)} />
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
