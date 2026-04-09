import { useEffect, useState } from 'react'
import '../styles/design-system.css'
import { getBlogPosts, getPaintings, friendlyError, SERVER } from '../lib/supabase'
import BlogPostCard from '../components/BlogPostCard'

export default function BlogScreen({ userId, onPaintingClick }) {
  const [posts, setPosts]         = useState([])
  const [paintings, setPaintings] = useState([])
  const [slug, setSlug]           = useState('')
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    getBlogPosts(userId).then(setPosts).catch(() => {})
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

      {/* 1 YOUR WRITING */}
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

      {/* 2 GENERATE NEW POST */}
      <section className="home-section">
        <p className="t-micro home-section-label">Generate new post</p>
        <p className="t-small" style={{ color: 'var(--text-muted)', marginBottom: 12 }}>
          Writes a process journal entry in your voice — drawing on the painting's evaluation history, companion conversations, and your notes. Saved as a draft you can edit before publishing.
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
            <div className="skeleton" style={{ height: 14, width: '88%', marginBottom: 10, borderRadius: 4 }} />
            <div className="skeleton" style={{ height: 14, width: '72%', marginBottom: 10, borderRadius: 4 }} />
            <div className="skeleton" style={{ height: 14, width: '80%', borderRadius: 4 }} />
          </div>
        )}
      </section>

    </div>
  )
}
