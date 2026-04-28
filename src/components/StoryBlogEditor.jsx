import { useState } from 'react'
import { updateStoryBlog, friendlyError } from '../lib/supabase'

function fmt(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function StoryBlogEditor({ blog, onUpdate }) {
  const [content, setContent] = useState(blog.content || '')
  const [saving,  setSaving]  = useState(false)

  async function save() {
    setSaving(true)
    try {
      const updated = await updateStoryBlog(blog.id, { content, title: blog.title })
      onUpdate?.(updated)
    } catch (e) { alert(friendlyError(e.message)) }
    finally { setSaving(false) }
  }

  async function togglePublished() {
    const next = blog.status === 'published' ? 'draft' : 'published'
    try {
      const updated = await updateStoryBlog(blog.id, { status: next })
      onUpdate?.(updated)
    } catch (e) { alert(friendlyError(e.message)) }
  }

  return (
    <div style={{ border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)',
      display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p className="t-micro" style={{ color: 'var(--text-muted)' }}>
          Generated {fmt(blog.generated_at)}
        </p>
        <span className={`blog-status blog-status--${blog.status}`}>{blog.status}</span>
      </div>

      <textarea className="upload-textarea" rows={12} value={content}
        onChange={e => setContent(e.target.value)}
        style={{ fontFamily: 'var(--font-serif)', fontSize: '0.95rem', lineHeight: 1.8 }} />

      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
        <button className="btn" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button className="btn" onClick={() => navigator.clipboard.writeText(content)}>
          Copy for Shopify
        </button>
        <button className="btn" onClick={togglePublished}>
          {blog.status === 'published' ? 'Mark Draft' : 'Mark Published'}
        </button>
      </div>
    </div>
  )
}
