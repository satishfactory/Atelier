import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import '../styles/design-system.css'
import { getBlogPosts, getPaintings } from '../lib/supabase'

const API     = 'http://localhost:3001/api/evaluate'
const USER_ID = '4f2f0493-f044-481d-a332-0fb1b9fe1c1d'

const md = {
  p:      ({ children }) => <p className="companion-text">{children}</p>,
  h2:     ({ children }) => <h2 className="t-heading" style={{ marginTop: 'var(--space-5)', marginBottom: 'var(--space-2)' }}>{children}</h2>,
  h3:     ({ children }) => <h3 className="t-small" style={{ fontWeight: 500, marginTop: 'var(--space-4)', marginBottom: 'var(--space-1)' }}>{children}</h3>,
  hr:     () => <hr style={{ border: 'none', borderTop: '0.5px solid var(--border)', margin: 'var(--space-5) 0' }} />,
  strong: ({ children }) => <strong style={{ fontWeight: 600, fontStyle: 'normal' }}>{children}</strong>,
}

export default function BlogScreen() {
  const [posts, setPosts]         = useState([])
  const [paintings, setPaintings] = useState([])
  const [slug, setSlug]           = useState('')
  const [generated, setGenerated] = useState(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)

  useEffect(() => {
    getBlogPosts()
      .then(setPosts)
      .catch(() => {})
    getPaintings()
      .then(data => {
        const own = data.filter(p => p.type === 'artist_work')
        setPaintings(own)
        if (own.length) setSlug(own[0].slug)
      })
      .catch(() => {})
  }, [])

  async function handleGenerate() {
    if (!slug) return
    setLoading(true)
    setError(null)
    setGenerated(null)
    const painting = paintings.find(p => p.slug === slug)
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callType: 'generate_blog',
          paintingSlug: slug,
          userId: USER_ID,
          paintingImage: painting?.thumbnail_b64 || null,
          userMessage: 'Write a process journal entry about this painting — not marketing copy, not a caption, but a record of what was discovered, what was decided, and what remains unresolved. In the artist\'s voice. For the artist\'s archive.',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Request failed')
      setGenerated(data.response)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="blog-screen">

      <div className="blog-header">
        <h1 className="t-title">Blog</h1>
      </div>

      {posts.length > 0 && (
        <div className="blog-posts">
          <p className="t-micro blog-section-label">Existing posts</p>
          {posts.map(post => (
            <div key={post.id} className="blog-post-row">
              <div className="blog-post-info">
                <p className="t-small" style={{ fontWeight: 500 }}>{post.title || 'Untitled'}</p>
                {post.painting_slug && (
                  <p className="t-micro" style={{ color: 'var(--text-muted)' }}>{post.painting_slug}</p>
                )}
              </div>
              <div className="blog-post-meta">
                {post.word_count && <span className="t-micro" style={{ color: 'var(--text-muted)' }}>{post.word_count}w</span>}
                <span className={`blog-status blog-status--${post.status}`}>{post.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="blog-generate">
        <p className="t-micro blog-section-label">Generate new post</p>
        <div className="blog-generate-row">
          <select className="blog-select" value={slug} onChange={e => setSlug(e.target.value)}>
            {paintings.map(p => (
              <option key={p.slug} value={p.slug}>{p.title}</option>
            ))}
          </select>
          <button className="btn btn-warm" onClick={handleGenerate} disabled={!slug || loading}>
            {loading ? 'Writing…' : 'Generate'}
          </button>
        </div>
        {error && <p className="t-small" style={{ color: 'var(--coral)', marginTop: 'var(--space-3)' }}>{error}</p>}
      </div>

      {loading && (
        <div style={{ padding: '0 var(--space-5)' }}>
          <div className="skeleton" style={{ height: 16, width: '90%', marginBottom: 'var(--space-3)' }} />
          <div className="skeleton" style={{ height: 16, width: '75%', marginBottom: 'var(--space-3)' }} />
          <div className="skeleton" style={{ height: 16, width: '80%' }} />
        </div>
      )}

      {generated && (
        <div className="blog-result companion-message">
          <ReactMarkdown components={md}>{generated}</ReactMarkdown>
        </div>
      )}

    </div>
  )
}
