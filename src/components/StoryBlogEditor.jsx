import { useRef, useState } from 'react'
import { updateStoryBlog, friendlyError } from '../lib/supabase'

function fmt(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function mdToHtml(text) {
  return text
    .split(/\n\n+/)
    .map(block => {
      const b = block.trim()
      const converted = b.replace(
        /!\[([^\]]*)\]\(([^)]+)\)/g,
        '<img src="$2" alt="$1" style="max-width:100%;height:auto;display:block;margin:1.5em 0;" />'
      )
      return converted.startsWith('<img') ? converted : `<p>${converted}</p>`
    })
    .join('\n')
}

const THUMB_STYLE = {
  width: 56, height: 42, objectFit: 'cover', display: 'block',
  borderRadius: 4, border: '0.5px solid var(--border)', cursor: 'pointer',
}

export default function StoryBlogEditor({ blog, media = [], onUpdate }) {
  const [content, setContent] = useState(blog.content || '')
  const [saving,  setSaving]  = useState(false)
  const taRef = useRef(null)

  function insertPhoto(m) {
    const tag  = `\n\n![${m.caption || ''}](${m.public_url})\n\n`
    const el   = taRef.current
    const pos  = el ? el.selectionStart : content.length
    const next = content.slice(0, pos) + tag + content.slice(pos)
    setContent(next)
    requestAnimationFrame(() => {
      if (!el) return
      el.selectionStart = el.selectionEnd = pos + tag.length
      el.focus()
    })
  }

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
    <div style={{ border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)',
      padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p className="t-micro" style={{ color: 'var(--text-muted)' }}>Generated {fmt(blog.generated_at)}</p>
        <span className={`blog-status blog-status--${blog.status}`}>{blog.status}</span>
      </div>

      {media.length > 0 && (
        <div>
          <p className="t-micro" style={{ color: 'var(--text-muted)', marginBottom: 6 }}>
            Tap a photo to insert at cursor
          </p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {media.map(m => (
              <img key={m.id || m.public_url} src={m.public_url} alt={m.caption || ''}
                style={THUMB_STYLE} title={m.caption || 'Insert'} onClick={() => insertPhoto(m)} />
            ))}
          </div>
        </div>
      )}

      <textarea ref={taRef} className="upload-textarea" rows={12} value={content}
        onChange={e => setContent(e.target.value)}
        style={{ fontFamily: 'var(--font-serif)', fontSize: '0.95rem', lineHeight: 1.8 }} />

      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
        <button className="btn" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button className="btn" onClick={() => navigator.clipboard.writeText(mdToHtml(content))}>
          Copy for Shopify
        </button>
        <button className="btn" onClick={togglePublished}>
          {blog.status === 'published' ? 'Mark Draft' : 'Mark Published'}
        </button>
      </div>
    </div>
  )
}
