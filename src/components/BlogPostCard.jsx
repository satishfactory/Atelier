import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import '../styles/design-system.css'
import { getPaintingImages } from '../lib/supabase'
import ScoreRing from './ScoreRing'

const API = 'http://localhost:3001/api/update-blog-post'

async function updatePost(id, fields) {
  const res = await fetch(API, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...fields }),
  })
  if (!res.ok) throw new Error((await res.json()).error)
}

function paintingScores(p) {
  return {
    overall: p.score_overall || 0, salience: p.score_salience || 0,
    gaze: p.score_gaze || 0, fluency: p.score_fluency || 0,
    emotion: p.score_emotion || 0, complexity: p.score_complexity || 0,
    mirror: p.score_mirror || 0, colour: p.score_colour || 0,
    narrative: p.score_narrative || 0,
  }
}

export default function BlogPostCard({ post, onUpdate, painting, onPaintingClick }) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing]   = useState(false)
  const [text, setText]         = useState(post.full_text || '')
  const [saving, setSaving]     = useState(false)
  const [images, setImages]     = useState(null)

  const thumbSrc = painting?.thumbnail_b64
    ? `data:image/jpeg;base64,${painting.thumbnail_b64}`
    : painting?.image_url || null
  const snippet = (post.full_text || '').replace(/^#+.*$/mg, '').replace(/\n+/g, ' ').trim().slice(0, 100)

  async function handleExpand() {
    const next = !expanded
    setExpanded(next)
    setEditing(false)
    if (next && images === null && post.painting_slug) {
      getPaintingImages(post.painting_slug).then(setImages).catch(() => setImages([]))
    }
  }

  function insertImage(img) {
    const md = `\n![${img.version_label || ''}](${img.image_url})\n`
    setText(prev => prev + md)
    setEditing(true)
  }

  async function saveEdit() {
    setSaving(true)
    try {
      await updatePost(post.id, { full_text: text })
      const wordCount = text.split(/\s+/).filter(Boolean).length
      const title = (text.split('\n').find(l => l.trim()) || '').replace(/^#+\s*/, '').trim()
      onUpdate({ ...post, full_text: text, word_count: wordCount, title: title || post.title })
      setEditing(false)
    } catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  async function toggleStatus() {
    const next = post.status === 'published' ? 'draft' : 'published'
    try {
      await updatePost(post.id, { status: next })
      onUpdate({ ...post, status: next })
    } catch (e) { alert(e.message) }
  }

  return (
    <div style={{ marginBottom: 8 }}>
      {!expanded ? (
        /* ── Collapsed card ── */
        <div className="blog-post-card" onClick={handleExpand}
          style={{ cursor: 'pointer', padding: 16, border: '0.5px solid var(--border)',
            borderRadius: 10, display: 'flex', gap: 14, alignItems: 'center', position: 'relative' }}>
          {thumbSrc && (
            <img src={thumbSrc} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
          )}
          <div style={{ flex: 1, minWidth: 0, paddingRight: painting?.score_overall > 0 ? 44 : 0 }}>
            <p style={{ fontWeight: 500, fontSize: 14, marginBottom: 2 }}>{post.title || 'Untitled'}</p>
            {painting && <span className="t-micro" style={{ color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{painting.title}</span>}
            {snippet && (
              <p className="t-small" style={{ color: 'var(--text-muted)', fontStyle: 'italic',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 6 }}>
                {snippet}
              </p>
            )}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              {post.word_count && <span className="t-micro" style={{ color: 'var(--text-muted)' }}>{post.word_count}w</span>}
              <span className={`blog-status blog-status--${post.status}`}>{post.status}</span>
              {post.created_at && <span className="t-micro" style={{ color: 'var(--text-muted)' }}>{post.created_at.slice(0, 10)}</span>}
            </div>
          </div>
          {painting?.score_overall > 0 && (
            <div style={{ position: 'absolute', top: 10, right: 12 }}>
              <ScoreRing scores={paintingScores(painting)} size={36} />
            </div>
          )}
        </div>
      ) : (
        /* ── Expanded view (unchanged) ── */
        <div style={{ borderBottom: '0.5px solid var(--border)', marginBottom: 4 }}>
          <div onClick={handleExpand} style={{ cursor: 'pointer', padding: '12px 0' }}>
            <p style={{ fontWeight: 500, fontSize: 14, marginBottom: 4 }}>{post.title || 'Untitled'}</p>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              {post.painting_slug && <span className="t-micro" style={{ color: 'var(--text-muted)' }}>{post.painting_slug}</span>}
              {post.word_count    && <span className="t-micro" style={{ color: 'var(--text-muted)' }}>{post.word_count}w</span>}
              <span className={`blog-status blog-status--${post.status}`}>{post.status}</span>
              {post.created_at    && <span className="t-micro" style={{ color: 'var(--text-muted)' }}>{post.created_at.slice(0, 10)}</span>}
            </div>
          </div>
          <div style={{ paddingBottom: 20 }}>
            {editing
              ? <textarea value={text} onChange={e => setText(e.target.value)} rows={18}
                  style={{ width: '100%', fontFamily: 'var(--font-serif)', fontSize: '0.95rem', lineHeight: 1.7,
                    padding: 12, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                    background: 'var(--surface)', color: 'var(--text)', resize: 'vertical', boxSizing: 'border-box' }} />
              : <div className="companion-response"><ReactMarkdown>{text}</ReactMarkdown></div>
            }
            {images?.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <p className="t-micro" style={{ color: 'var(--text-muted)', marginBottom: 8 }}>Painting photos</p>
                <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
                  {images.map(img => (
                    <div key={img.id} style={{ flexShrink: 0, textAlign: 'center' }}>
                      <img src={img.image_url} alt={img.version_label || ''} style={{ width: 100, height: 80, objectFit: 'cover', borderRadius: 4, display: 'block' }} />
                      <button className="btn" style={{ fontSize: 10, marginTop: 4, padding: '2px 8px' }} onClick={() => insertImage(img)}>Insert →</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
              {editing
                ? <button className="btn btn-warm" style={{ fontSize: 12 }} onClick={saveEdit} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
                : <button className="btn" style={{ fontSize: 12 }} onClick={e => { e.stopPropagation(); setEditing(true) }}>Edit</button>
              }
              {editing && <button className="btn" style={{ fontSize: 12 }} onClick={() => setEditing(false)}>Cancel</button>}
              <button className="btn" style={{ fontSize: 12 }} onClick={e => { e.stopPropagation(); toggleStatus() }}>
                {post.status === 'published' ? 'Move to Draft' : 'Publish'}
              </button>
              <button className="btn" style={{ fontSize: 12, color: 'var(--text-muted)' }} disabled>Generate Image</button>
            </div>
            {painting && (
              <p className="t-micro" style={{ marginTop: 16, cursor: 'pointer', color: 'var(--warm)' }}
                onClick={() => onPaintingClick?.(painting)}>
                From the painting: {painting.title} →
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
