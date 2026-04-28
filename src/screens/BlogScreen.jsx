import { useEffect, useState } from 'react'
import '../styles/design-system.css'
import { getBlogPosts, getPaintings, getStoryBlogsForScreen, friendlyError, SERVER } from '../lib/supabase'
import BlogPostCard from '../components/BlogPostCard'

function fmt(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function renderBlog(text) {
  if (!text) return ''
  return text
    .split(/\n\n+/)
    .map(block => {
      const b = block.trim()
      const converted = b.replace(
        /!\[([^\]]*)\]\(([^)]+)\)/g,
        '<img src="$2" alt="$1" style="max-width:100%;height:auto;display:block;margin:1.5em 0;border-radius:4px;" />'
      )
      return converted.startsWith('<img') ? converted : `<p style="margin:0 0 1.2em;line-height:1.8;">${converted}</p>`
    })
    .join('')
}

export default function BlogScreen({ userId, onPaintingClick, onStoryClick }) {
  const [posts,       setPosts]       = useState([])
  const [storyBlogs,  setStoryBlogs]  = useState([])
  const [paintings,   setPaintings]   = useState([])
  const [reading,     setReading]     = useState(null)
  const [slug,        setSlug]        = useState('')
  const [generating,  setGenerating]  = useState(false)

  useEffect(() => {
    getBlogPosts(userId).then(setPosts).catch(() => {})
    getStoryBlogsForScreen(userId).then(setStoryBlogs).catch(() => {})
    getPaintings(userId, { type: 'artist_work' }).then(ps => {
      setPaintings(ps)
      if (ps.length) setSlug(ps[0].slug)
    }).catch(() => {})
  }, [])

  function updatePost(updated) {
    setPosts(prev => prev.map(p => p.id === updated.id ? updated : p))
  }

  async function generate() {
    if (!slug) return
    setGenerating(true)
    try {
      const painting = paintings.find(p => p.slug === slug)
      const res = await fetch(`${SERVER}/api/evaluate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callType: 'generate_blog', paintingSlug: slug, userId,
          paintingImage: painting?.thumbnail_b64 || null,
          userMessage: "Write a process journal entry about this painting — not marketing copy, not a caption, but a record of what was discovered, what was decided, and what remains unresolved. In the artist's voice. For the artist's archive.",
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      getBlogPosts(userId).then(setPosts).catch(() => {})
    } catch (e) { alert(friendlyError(e.message)) }
    finally { setGenerating(false) }
  }

  return (
    <div className="blog-screen">
      {/* 1 — TRAVEL STORIES */}
      {storyBlogs.length > 0 && (
        <section className="home-section">
          <p className="t-micro home-section-label">Travel Stories</p>

          {reading ? (
            <div>
              <button className="detail-back" style={{ marginBottom: 'var(--space-4)' }}
                onClick={() => setReading(null)}>← Back</button>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem',
                fontWeight: 700, marginBottom: 4, lineHeight: 1.3 }}>
                {reading.title || reading.story_slug}
              </h2>
              <p className="t-micro" style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-5)' }}>
                {fmt(reading.created_at)}
              </p>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1rem', color: 'var(--text)' }}
                dangerouslySetInnerHTML={{ __html: renderBlog(reading.content) }} />
            </div>
          ) : (
            storyBlogs.map(b => (
              <div key={b.id} onClick={() => setReading(b)}
                style={{ padding: '10px 0', borderBottom: '0.5px solid var(--border)', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <p className="t-small" style={{ fontWeight: 500, flex: 1 }}>{b.title || b.story_slug}</p>
                  <span style={{ fontSize: 10, fontFamily: 'var(--font-sans)', fontWeight: 600,
                    letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--teal)',
                    border: '0.5px solid var(--teal)', borderRadius: 'var(--radius-full)', padding: '2px 8px' }}>
                    Travel Story
                  </span>
                  <span className={`blog-status blog-status--${b.status}`}>{b.status}</span>
                </div>
                <p className="t-micro" style={{ color: 'var(--text-muted)' }}>{fmt(b.created_at)}</p>
              </div>
            ))
          )}
        </section>
      )}

      {/* 2 — PAINTING POSTS */}
      <section className="home-section">
        <p className="t-micro home-section-label">Your writing</p>
        {posts.length === 0
          ? (
            <div style={{ padding: '20px 0' }}>
              <p className="t-small" style={{ color: 'var(--text-muted)', marginBottom: 8 }}>No posts yet.</p>
              <p className="t-micro" style={{ color: 'var(--text-muted)' }}>Generate your first process journal below ↓</p>
            </div>
          )
          : posts.map(p => (
              <BlogPostCard key={p.id} post={p} onUpdate={updatePost}
                painting={paintings.find(x => x.slug === p.painting_slug) || null}
                onPaintingClick={onPaintingClick} />
            ))
        }
      </section>

      {/* 3 — GENERATE NEW POST */}
      <section className="home-section">
        <p className="t-micro home-section-label">Generate new post</p>
        <p className="t-small" style={{ color: 'var(--text-muted)', marginBottom: 12 }}>
          Writes a process journal entry in your voice — drawing on the painting's evaluation history, companion conversations, and your notes.
        </p>
        <select value={slug} onChange={e => setSlug(e.target.value)}
          style={{ fontSize: 13, padding: '6px 10px', borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)',
            width: '100%', maxWidth: 400 }}>
          {paintings.map(p => <option key={p.slug} value={p.slug}>{p.title}</option>)}
        </select>
        <button className="btn btn-warm" style={{ alignSelf: 'flex-start' }}
          onClick={generate} disabled={generating || !slug}>
          {generating ? 'Writing…' : 'Generate post'}
        </button>
        {generating && (
          <div>
            {[88, 72, 80].map((w, i) => (
              <div key={i} className="skeleton"
                style={{ height: 14, width: `${w}%`, marginBottom: 10, borderRadius: 4 }} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
