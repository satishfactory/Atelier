import { useEffect, useState } from 'react'
import '../styles/design-system.css'
import { getStory, updateStory, friendlyError } from '../lib/supabase'
import StoryPhotoGrid  from '../components/StoryPhotoGrid'
import StoryIntakeForm from '../components/StoryIntakeForm'
import StoryJournal    from '../components/StoryJournal'
import StoryBlogPanel  from '../components/StoryBlogPanel'

const STATUS_COLOUR = { wip: 'var(--warm)', draft: 'var(--mid)', published: 'var(--teal)' }

export default function StoryDetailScreen({ userId, slug, onBack }) {
  const [story, setStory] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    getStory(userId, slug).then(setStory).catch(e => setError(e.message))
  }, [slug])

  async function cycleStatus() {
    const next = { wip: 'draft', draft: 'published', published: 'wip' }[story.status] || 'wip'
    try {
      await updateStory(slug, { status: next })
      setStory(prev => ({ ...prev, status: next }))
    } catch (e) { alert(friendlyError(e.message)) }
  }

  if (error)  return <p className="t-small" style={{ padding: 32, color: 'var(--coral)' }}>{error}</p>
  if (!story) return <div className="skeleton" style={{ height: 300, margin: 32, borderRadius: 'var(--radius-md)' }} />

  return (
    <div className="detail-screen">
      <div className="detail-header">
        <button className="detail-back" onClick={onBack}>← Back</button>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', fontWeight: 700,
          marginTop: 'var(--space-4)', lineHeight: 1.2 }}>{story.title}</h1>
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center',
          marginTop: 'var(--space-2)', flexWrap: 'wrap' }}>
          {story.location && (
            <p className="t-small" style={{ color: 'var(--text-muted)' }}>
              {story.location}{story.trip ? ` · ${story.trip}` : ''}
            </p>
          )}
          <span className="t-micro" style={{ color: STATUS_COLOUR[story.status],
            fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {story.status}
          </span>
          <button className="btn" style={{ fontSize: 11, padding: '2px 10px', minHeight: 44 }}
            onClick={cycleStatus}>
            {story.status === 'wip' ? 'Mark Draft' : story.status === 'draft' ? 'Mark Published' : 'Back to WIP'}
          </button>
        </div>
      </div>

      <div className="detail-sections-wrap">
        <div className="detail-section">
          <p className="t-micro detail-label">Photos</p>
          <StoryPhotoGrid userId={userId} story={story}
            onMediaChange={m => setStory(prev => ({ ...prev, story_media: m }))} />
        </div>

        <div className="detail-section">
          <p className="t-micro detail-label">Details</p>
          <StoryIntakeForm story={story}
            onSave={fields => setStory(prev => ({ ...prev, ...fields }))} />
        </div>

        <div className="detail-section">
          <p className="t-micro detail-label">Journal</p>
          <StoryJournal userId={userId} slug={slug} sessions={story.story_sessions}
            onSessionAdded={s => setStory(prev => ({
              ...prev, story_sessions: [s, ...(prev.story_sessions || [])]
            }))} />
        </div>

        <div className="detail-section">
          <p className="t-micro detail-label">Travel Blog</p>
          <StoryBlogPanel userId={userId} story={story} />
        </div>
      </div>
    </div>
  )
}
