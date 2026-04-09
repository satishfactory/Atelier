import { useState, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import '../styles/design-system.css'
import { getPaintingImages, friendlyError, SERVER } from '../lib/supabase'
import { useVoiceInput, MicButton } from '../lib/useVoiceInput.jsx'

async function updatePost(id, fields) {
  const res = await fetch(`${SERVER}/api/update-blog-post`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...fields }),
  })
  if (!res.ok) throw new Error((await res.json()).error)
}

export default function BlogPostCard({ post, onUpdate, painting, onPaintingClick }) {
  const [expanded, setExpanded]       = useState(false)
  const [editing, setEditing]         = useState(false)
  const [text, setText]               = useState(post.full_text || '')
  const [saving, setSaving]           = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [extraImages, setExtraImages] = useState(null)
  const taRef = useRef(null)
  const { listening, toggleVoice } = useVoiceInput()

  const imgSrc = painting?.image_url || (painting?.thumbnail_b64 ? `data:image/jpeg;base64,${painting.thumbnail_b64}` : null)

  async function loadImages() {
    if (extraImages !== null) return
    getPaintingImages(post.painting_slug).then(setExtraImages).catch(() => setExtraImages([]))
  }

  function insertAtCursor(mdSnippet) {
    const ta  = taRef.current
    if (!ta) { setText(t => t + '\n' + mdSnippet + '\n'); return }
    const start = ta.selectionStart
    const end   = ta.selectionEnd
    const before = text.slice(0, start)
    const after  = text.slice(end)
    // Snap to nearest paragraph boundary (double newline)
    const insertBefore = before.endsWith('\n') ? before : before + '\n'
    const insertAfter  = after.startsWith('\n') ? after  : '\n' + after
    const next = insertBefore + '\n' + mdSnippet + '\n' + insertAfter
    setText(next)
    setTimeout(() => { ta.focus(); ta.setSelectionRange(insertBefore.length + mdSnippet.length + 2, insertBefore.length + mdSnippet.length + 2) }, 0)
  }
  const snippet = (post.full_text || '').replace(/^#+.*$/mg, '').replace(/\n+/g, ' ').trim().slice(0, 100)

  async function saveEdit() {
    setSaving(true)
    try {
      await updatePost(post.id, { full_text: text })
      const wordCount = text.split(/\s+/).filter(Boolean).length
      const title = (text.split('\n').find(l => l.trim()) || '').replace(/^#+\s*/, '').trim()
      onUpdate({ ...post, full_text: text, word_count: wordCount, title: title || post.title })
      setEditing(false)
    } catch (e) { alert(friendlyError(e.message)) }
    finally { setSaving(false) }
  }

  async function regenerate() {
    setRegenerating(true)
    setText('')
    try {
      const res = await fetch(`${SERVER}/api/regenerate-blog`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id, paintingSlug: post.painting_slug, editedText: text }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const parts = buf.split('\n\n'); buf = parts.pop()
        for (const part of parts) {
          if (!part.startsWith('data: ')) continue
          const data = JSON.parse(part.slice(6))
          if (data.delta) setText(prev => prev + data.delta)
          if (data.done) {
            const wc = text.split(/\s+/).filter(Boolean).length
            onUpdate({ ...post, full_text: text, word_count: wc })
          }
        }
      }
    } catch (e) { alert(friendlyError(e.message)) }
    finally { setRegenerating(false) }
  }

  async function toggleStatus() {
    const next = post.status === 'published' ? 'draft' : 'published'
    try {
      await updatePost(post.id, { status: next })
      onUpdate({ ...post, status: next })
    } catch (e) { alert(friendlyError(e.message)) }
  }

  if (!expanded) return (
    <div className="blog-post-card" onClick={() => setExpanded(true)}
      style={{ cursor: 'pointer', padding: 16, border: '0.5px solid var(--border)',
        borderRadius: 10, display: 'flex', gap: 14, alignItems: 'center', marginBottom: 8 }}>
      {imgSrc && <img src={imgSrc} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 500, fontSize: 14, marginBottom: 2 }}>{post.title || 'Untitled'}</p>
        {painting && <span className="t-micro" style={{ color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{painting.title}</span>}
        {snippet && <p className="t-small" style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 6 }}>{snippet}</p>}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {post.word_count && <span className="t-micro" style={{ color: 'var(--text-muted)' }}>{post.word_count}w</span>}
          <span className={`blog-status blog-status--${post.status}`}>{post.status}</span>
          {post.created_at && <span className="t-micro" style={{ color: 'var(--text-muted)' }}>{post.created_at.slice(0, 10)}</span>}
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ borderBottom: '0.5px solid var(--border)', marginBottom: 4 }}>
      {/* Header */}
      <div onClick={() => { setExpanded(false); setEditing(false) }} style={{ cursor: 'pointer', padding: '12px 0' }}>
        <p style={{ fontWeight: 500, fontSize: 14, marginBottom: 4 }}>{post.title || 'Untitled'}</p>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          {post.word_count && <span className="t-micro" style={{ color: 'var(--text-muted)' }}>{post.word_count}w</span>}
          <span className={`blog-status blog-status--${post.status}`}>{post.status}</span>
          {post.created_at && <span className="t-micro" style={{ color: 'var(--text-muted)' }}>{post.created_at.slice(0, 10)}</span>}
        </div>
      </div>

      {/* Painting image */}
      {imgSrc && (
        <div style={{ background: 'var(--white)', padding: '10px 10px 0', boxShadow: '0 4px 20px rgba(30,30,28,0.10)', marginBottom: 20, display: 'inline-block' }}>
          <img src={imgSrc} alt={painting?.title || ''} style={{ width: '100%', maxHeight: 320, objectFit: 'cover', display: 'block' }} />
          <div style={{ height: 8 }} />
        </div>
      )}

      {/* Body: edit or read */}
      <div style={{ paddingBottom: 20 }}>
        {editing
          ? <>
              <div style={{ position: 'relative' }}>
              <textarea ref={taRef} value={text} onChange={e => setText(e.target.value)} rows={18}
                onClick={() => loadImages()}
                style={{ width: '100%', fontFamily: 'var(--font-serif)', fontSize: '0.95rem', lineHeight: 1.7,
                  padding: 12, paddingBottom: 52, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                  background: 'var(--surface)', color: 'var(--text)', resize: 'vertical', boxSizing: 'border-box' }} />
              <MicButton onClick={() => toggleVoice(setText, taRef)} listening={listening} />
              </div>
              {/* Image strip — insert at cursor */}
              {(extraImages?.length > 0 || imgSrc) && (
                <div style={{ marginTop: 10 }}>
                  <p className="t-micro" style={{ color: 'var(--text-muted)', marginBottom: 8 }}>Click image to insert at cursor</p>
                  <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
                    {imgSrc && (
                      <div style={{ flexShrink: 0, textAlign: 'center' }}>
                        <img src={imgSrc} alt="main" onClick={() => insertAtCursor(`![${painting?.title || ''}](${painting?.image_url || imgSrc})`)}
                          style={{ width: 90, height: 72, objectFit: 'cover', borderRadius: 4, cursor: 'pointer', display: 'block', border: '2px solid var(--warm)' }} />
                        <p className="t-micro" style={{ color: 'var(--text-muted)', marginTop: 3 }}>main</p>
                      </div>
                    )}
                    {(extraImages || []).filter(img => img.image_url !== painting?.image_url).map(img => (
                      <div key={img.id} style={{ flexShrink: 0, textAlign: 'center' }}>
                        <img src={img.image_url} alt={img.version_label || ''} onClick={() => insertAtCursor(`![${img.version_label || ''}](${img.image_url})`)}
                          style={{ width: 90, height: 72, objectFit: 'cover', borderRadius: 4, cursor: 'pointer', display: 'block' }} />
                        <p className="t-micro" style={{ color: 'var(--text-muted)', marginTop: 3 }}>{img.version_label || 'photo'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          : <div>
              <p className="t-micro" style={{ color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: 8 }}>Companion analysis</p>
              <div className="companion-response">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{regenerating ? text || '…' : text}</ReactMarkdown>
              </div>
            </div>
        }

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          {editing ? (
            <>
              <button className="btn btn-warm" style={{ fontSize: 12 }} onClick={saveEdit} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
              <button className="btn btn-warm" style={{ fontSize: 12 }} onClick={regenerate} disabled={regenerating}>{regenerating ? 'Rewriting…' : 'Regenerate ↺'}</button>
              <button className="btn" style={{ fontSize: 12 }} onClick={() => { setText(post.full_text || ''); setEditing(false) }}>Cancel</button>
            </>
          ) : (
            <>
              <button className="btn" style={{ fontSize: 12 }} onClick={() => setEditing(true)}>Edit</button>
              <button className="btn" style={{ fontSize: 12 }} onClick={toggleStatus}>
                {post.status === 'published' ? 'Move to Draft' : 'Publish'}
              </button>
            </>
          )}
        </div>

        {painting && (
          <p className="t-micro" style={{ marginTop: 16, cursor: 'pointer', color: 'var(--warm)' }}
            onClick={() => onPaintingClick?.(painting)}>
            From the painting: {painting.title} →
          </p>
        )}
      </div>
    </div>
  )
}
