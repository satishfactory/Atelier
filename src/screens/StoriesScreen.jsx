import { useEffect, useState } from 'react'
import '../styles/design-system.css'
import { getStories, friendlyError } from '../lib/supabase'
import StoryCard     from '../components/StoryCard'
import NewStoryModal from '../components/NewStoryModal'

const FILTERS = [
  { label: 'All',       status: null        },
  { label: 'WIP',       status: 'wip'       },
  { label: 'Draft',     status: 'draft'     },
  { label: 'Published', status: 'published' },
]

export default function StoriesScreen({ userId, onStoryClick }) {
  const [stories,    setStories]    = useState([])
  const [activeIdx,  setActiveIdx]  = useState(0)
  const [showModal,  setShowModal]  = useState(false)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getStories(userId, FILTERS[activeIdx].status)
      .then(data => { setStories(data || []); setLoading(false) })
      .catch(e => { setError(friendlyError(e.message)); setLoading(false) })
  }, [activeIdx, userId])

  return (
    <div>
      <div className="gallery-bar">
        <div className="gallery-filters">
          {FILTERS.map((f, i) => (
            <button key={f.label}
              className={`btn gallery-filter-btn${activeIdx === i ? ' gallery-filter-btn--active' : ''}`}
              onClick={() => setActiveIdx(i)}>
              {f.label}
            </button>
          ))}
        </div>
        <span className="t-micro gallery-count">
          {stories.length} {stories.length === 1 ? 'story' : 'stories'}
        </span>
      </div>

      {error && <p className="t-small" style={{ color: 'var(--coral)', padding: 'var(--space-3)' }}>{error}</p>}

      <div className="gallery-grid">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton"
                style={{ aspectRatio: '4/3', borderRadius: 'var(--radius-md)' }} />
            ))
          : <>
              {stories.map(s => (
                <StoryCard key={s.id} story={s} onClick={() => onStoryClick(s.slug)} />
              ))}
              <div onClick={() => setShowModal(true)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
                  minHeight: 160, cursor: 'pointer', borderRadius: 'var(--radius-md)',
                  border: '1px dashed var(--border)', color: 'var(--text-muted)',
                  fontSize: '2rem', transition: 'border-color var(--transition)' }}>
                +
              </div>
            </>
        }
      </div>

      {showModal && (
        <NewStoryModal userId={userId}
          onCreated={slug => { setShowModal(false); onStoryClick(slug) }}
          onClose={() => setShowModal(false)} />
      )}
    </div>
  )
}
