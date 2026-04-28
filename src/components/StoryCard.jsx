export default function StoryCard({ story, onClick }) {
  const cover = story.story_media?.find(m => m.is_cover) || story.story_media?.[0]
  const STATUS_COLOUR = { wip: 'var(--warm)', draft: 'var(--mid)', published: 'var(--teal)' }

  return (
    <div className="painting-card" onClick={onClick}>
      <div className="painting-card__image">
        {cover
          ? <img src={cover.public_url} alt={story.title} />
          : <div className="painting-card__placeholder"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--stone)' }}>
              <span className="t-micro" style={{ color: 'var(--text-muted)' }}>No photo</span>
            </div>
        }
      </div>
      <div className="painting-card__body">
        <div className="painting-card__text">
          <p className="t-small" style={{ fontWeight: 500, marginBottom: 2 }}>{story.title}</p>
          {story.location && (
            <p className="t-micro" style={{ color: 'var(--text-muted)' }}>{story.location}</p>
          )}
          {story.trip && (
            <p className="t-micro" style={{ color: 'var(--text-muted)' }}>{story.trip}</p>
          )}
        </div>
        <span className="t-micro" style={{
          color: STATUS_COLOUR[story.status] || 'var(--mid)',
          fontWeight: 600, flexShrink: 0,
        }}>
          {story.status}
        </span>
      </div>
    </div>
  )
}
