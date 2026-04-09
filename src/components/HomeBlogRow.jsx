import '../styles/design-system.css'

function excerpt(fullText) {
  if (!fullText) return null
  return fullText
    .replace(/^#+\s*/mg, '')
    .replace(/\*+/g, '')
    .replace(/\n+/g, ' ')
    .trim()
    .slice(0, 120)
}

function fmt(dateStr) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function HomeBlogRow({ post, painting, onClick }) {
  const thumb = painting?.image_url
    ? painting.image_url.replace('full.jpg', 'thumb.jpg')
    : painting?.thumbnail_b64 ? `data:image/jpeg;base64,${painting.thumbnail_b64}` : null
  const blurb = excerpt(post.full_text)

  return (
    <div onClick={onClick} style={{ display: 'flex', gap: 14, padding: '14px 0',
      borderBottom: '0.5px solid var(--border)', cursor: 'pointer', alignItems: 'flex-start' }}>
      {thumb && (
        <img src={thumb} alt={painting?.title || ''}
          style={{ width: 64, height: 64, objectFit: 'cover', flexShrink: 0,
            boxShadow: '0 2px 10px rgba(30,30,28,0.12)', background: 'var(--white)', padding: 3 }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 14,
          color: 'var(--warm)', marginBottom: 4, lineHeight: 1.3 }}>
          {post.title || 'Untitled'}
        </p>
        {blurb && (
          <p className="t-small" style={{ color: 'var(--text-muted)', lineHeight: 1.6,
            marginBottom: 6, overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {blurb}…
          </p>
        )}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {painting?.title && (
            <span className="t-micro" style={{ color: 'var(--mid)', fontStyle: 'italic' }}>{painting.title}</span>
          )}
          {post.word_count && (
            <span className="t-micro" style={{ color: 'var(--mid)' }}>{post.word_count}w</span>
          )}
          {post.created_at && (
            <span className="t-micro" style={{ color: 'var(--mid)' }}>{fmt(post.created_at)}</span>
          )}
          <span className={`blog-status blog-status--${post.status}`}>{post.status}</span>
        </div>
      </div>
    </div>
  )
}
