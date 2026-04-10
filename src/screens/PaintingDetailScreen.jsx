import { useEffect, useRef, useState } from 'react'
import '../styles/design-system.css'
import { getPainting, getSessions, getPaintingImages, getAllConversations, addSessionNote, getBlogPostsForPainting, getMediaSessions, friendlyError, SERVER } from '../lib/supabase'
import { useVoiceInput, MicButton } from '../lib/useVoiceInput.jsx'
import PaintingJournalEntry from '../components/PaintingJournalEntry'
import ScoreSparkline from '../components/ScoreSparkline'
import ConversationThread from '../components/ConversationThread'
import SessionRecorder from '../components/SessionRecorder'
import PastSessionCard from '../components/PastSessionCard'
import CollectorBrief from '../components/CollectorBrief'
import WipVision from '../components/WipVision'
import PaintingScores from '../components/PaintingScores'

function fmt(d) {
  if (!d) return null
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function blogExcerpt(text) {
  if (!text) return null
  return text.replace(/^#+\s*/mg, '').replace(/\*+/g, '').replace(/\n+/g, ' ').trim().slice(0, 120)
}

export default function PaintingDetailScreen({ userId, slug, onBack, onNavigate, onPaintingClick }) {
  const [painting, setPainting]             = useState(null)
  const [sessions, setSessions]             = useState([])
  const [conversations, setConversations]   = useState([])
  const [paintingImages, setPaintingImages] = useState([])
  const [imgSrc, setImgSrc]                 = useState(null)
  const [note, setNote]                     = useState('')
  const [noteSaving, setNoteSaving]         = useState(false)
  const [status, setStatus]                 = useState(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [versionLabel, setVersionLabel]     = useState('')
  const [error, setError]                   = useState(null)
  const [publishedBlogs, setPublishedBlogs] = useState([])
  const [expandedBlog, setExpandedBlog]     = useState(null)
  const [mediaSessions, setMediaSessions]   = useState([])
  const photoRef = useRef(null)
  const noteRef  = useRef(null)
  const { listening, toggleVoice } = useVoiceInput()

  useEffect(() => {
    Promise.all([getPainting(slug), getSessions(slug), getPaintingImages(slug), getAllConversations(slug), getBlogPostsForPainting(slug), getMediaSessions(slug)])
      .then(([p, ss, imgs, convs, blogs, media]) => {
        setPainting(p); setStatus(p.status)
        setSessions((ss || []).reverse())
        setPaintingImages(imgs); setConversations(convs)
        setImgSrc(p.image_url || (p.thumbnail_b64 ? `data:image/jpeg;base64,${p.thumbnail_b64}` : null))
        setPublishedBlogs(blogs)
        setMediaSessions(media || [])
      })
      .catch(err => setError(err.message))
  }, [slug])

  function handleBack() {
    if (note.trim() && !window.confirm('You have an unsaved note. Leave anyway?')) return
    onBack?.()
  }

  async function saveNote() {
    if (!note.trim()) return
    setNoteSaving(true)
    try {
      const v = await addSessionNote(slug, note.trim(), userId)
      setSessions(prev => [...prev, { version: v, artist_note: note.trim(), session_date: new Date().toISOString().split('T')[0] }])
      setNote('')
    } catch (e) { alert(friendlyError(e.message)) }
    finally { setNoteSaving(false) }
  }

  async function toggleStatus() {
    const next = status === 'wip' ? 'finished' : 'wip'
    try {
      const res = await fetch(`${SERVER}/api/set-painting-status`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, status: next }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      setStatus(next)
    } catch (e) { alert(friendlyError(e.message)) }
  }

  async function uploadImage(base64, vLabel) {
    const res = await fetch(`${SERVER}/api/add-painting-image`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, imageBase64: base64, version_label: vLabel || undefined }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    return data.url
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoUploading(true)
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const label = versionLabel.trim()
        const url = await uploadImage(reader.result.split(',')[1], label)
        setImgSrc(url)
        setPaintingImages(prev => [...prev, { id: Date.now(), image_url: url, version_label: label || null }])
        // If this label doesn't match any existing session, create a stub so it appears in the journal
        const targetVer = parseInt(label?.replace('v', '') || '0')
        const hasSession = sessions.some(s => s.version === targetVer)
        if (!hasSession && targetVer > 0) {
          const v = await addSessionNote(slug, 'Photo added', userId)
          const today = new Date().toISOString().split('T')[0]
          setSessions(prev => [...prev, { version: v, artist_note: 'Photo added', session_date: today }])
        }
      } catch (err) { alert(friendlyError(err.message)) }
      finally { setPhotoUploading(false) }
    }
    reader.readAsDataURL(file)
  }

  async function handleVersionSave(session, noteText, file) {
    const today = new Date().toISOString().split('T')[0]
    let photoVersion = session.version
    if (noteText?.trim()) {
      const v = await addSessionNote(slug, noteText.trim(), userId)
      photoVersion = v
      setSessions(prev => [...prev, { version: v, artist_note: noteText.trim(), session_date: today }])
    }
    if (file) {
      const base64 = await new Promise(r => { const rd = new FileReader(); rd.onload = () => r(rd.result.split(',')[1]); rd.readAsDataURL(file) })
      const url = await uploadImage(base64, `v${photoVersion}`)
      setPaintingImages(prev => [...prev, { id: Date.now(), image_url: url, version_label: `v${photoVersion}` }])
    }
  }

  if (error) return <p className="t-small" style={{ padding: 32, color: 'var(--coral)' }}>{error}</p>
  if (!painting) return <div className="skeleton" style={{ height: 300, margin: 32, borderRadius: 'var(--radius-md)' }} />

  const maxVersion = sessions.length ? Math.max(...sessions.map(s => s.version)) : 0
  const sessionDates = new Set(sessions.map(s => s.session_date))
  const convByDate = {}
  conversations.forEach(c => {
    const d = c.session_date || c.created_at?.slice(0, 10)
    if (!convByDate[d]) convByDate[d] = []
    convByDate[d].push(c)
  })
  const journalSessions = sessions.map(s => ({ ...s, conversations: convByDate[s.session_date] || [] }))
  const unmatched = conversations.filter(c => !sessionDates.has(c.session_date || c.created_at?.slice(0, 10)))

  return (
    <div className="detail-screen">
      {/* HEADER */}
      <div className="detail-header">
        <button className="detail-back" onClick={handleBack}>← Back</button>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', fontWeight: 700, marginTop: 'var(--space-4)', lineHeight: 1.2 }}>{painting.title}</h1>
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', marginTop: 'var(--space-2)', flexWrap: 'wrap' }}>
          <p className="t-small" style={{ color: 'var(--text-muted)' }}>{painting.artist}{painting.year ? `, ${painting.year}` : ''}</p>
          <span className="t-micro" style={{ color: status === 'wip' ? 'var(--warm)' : 'var(--teal)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{status === 'wip' ? 'WIP' : 'Finished'}</span>
          <button className="btn" style={{ fontSize: 11, padding: '2px 10px', minHeight: 44 }} onClick={toggleStatus}>{status === 'wip' ? 'Mark Finished' : 'Mark WIP'}</button>
        </div>
      </div>
      <div className="detail-sections-wrap">
        {/* 1 — IMAGES FIRST (item 27) */}
        <div className="detail-section" style={{ alignItems: 'center', gap: 'var(--space-3)' }}>
          {imgSrc && <img src={imgSrc} alt={painting.title} style={{ maxHeight: 320, maxWidth: 600, width: '100%', objectFit: 'contain', borderRadius: 'var(--radius-md)', display: 'block' }} />}
          {paintingImages.length > 0 && (
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', justifyContent: 'center' }}>
              {paintingImages.map(img => (
                <div key={img.id} title={img.version_label || ''} onClick={() => setImgSrc(img.image_url)}
                  style={{ flexShrink: 0, cursor: 'pointer', border: imgSrc === img.image_url ? '2px solid var(--warm)' : '2px solid transparent', borderRadius: 6 }}>
                  <img src={img.image_url} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 4, display: 'block' }} />
                </div>
              ))}
            </div>
          )}
          <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            <select value={versionLabel || `v${maxVersion}`} onChange={e => setVersionLabel(e.target.value)}
              style={{ fontSize: 12, padding: '4px 8px', minHeight: 44, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}>
              {sessions.map(s => <option key={s.version} value={`v${s.version}`}>v{s.version}</option>)}
              <option value={`v${maxVersion + 1}`}>+ Add to new version (v{maxVersion + 1})</option>
            </select>
            <button className="btn" style={{ fontSize: 12 }} onClick={() => photoRef.current.click()} disabled={photoUploading}>
              {photoUploading ? 'Uploading…' : 'Add photo →'}
            </button>
          </div>
        </div>
        {/* 2 — METADATA */}
        {(painting.tags?.length > 0 || painting.appraisal_develop || painting.market_positioning || painting.viewer_experience || painting.appraisal_strengths) && (
          <div className="detail-section" style={{ paddingTop: 0 }}>
            {painting.tags?.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {painting.tags.map((t, i) => (
                  <span key={i} className="t-micro" style={{ padding: '3px 10px', border: '0.5px solid var(--border)', borderRadius: 99, color: 'var(--text-muted)' }}>{t}</span>
                ))}
              </div>
            )}
            {[
              ['Process', painting.appraisal_develop],
              ['Influences & References', painting.market_positioning],
              ['Formal Reading', painting.viewer_experience],
              ['Overall', painting.appraisal_strengths],
            ].filter(([, v]) => v).map(([label, val]) => (
              <div key={label} style={{ marginTop: 14 }}>
                <p className="t-micro" style={{ color: 'var(--warm)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</p>
                <p className="t-small" style={{ color: 'var(--text-muted)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{val}</p>
              </div>
            ))}
          </div>
        )}
        {/* 2b — SCORE PROGRESSION */}
        {sessions.length >= 2 && (
          <div className="detail-section" style={{ paddingTop: 0 }}>
            <ScoreSparkline sessions={sessions} />
          </div>
        )}
        {/* 2c — COLLECTOR VIEW */}
        <div className="detail-section" style={{ paddingTop: 0 }}>
          <p className="t-micro detail-label" style={{ letterSpacing: '0.08em' }}>COLLECTOR VIEW</p>
          <CollectorBrief userId={userId} slug={slug} onPaintingClick={onPaintingClick} />
        </div>
        {/* 3 — STUDIO SESSIONS (audio/video — WIP only) */}
        {status === 'wip' && (
          <div className="detail-section">
            <p className="t-micro detail-label" style={{ letterSpacing: '0.08em' }}>STUDIO SESSIONS</p>
            <SessionRecorder paintingSlug={slug} userId={userId}
              onSessionSaved={s => setMediaSessions(prev => [{ ...s, session_type: 'audio', frames: s.frameUrls?.map((url, i) => ({ frame_url: url, frame_index: i })) || [] }, ...prev])} />
            {mediaSessions.length > 0 && (
              <div style={{ marginTop: 16 }}>
                {mediaSessions.map(s => <PastSessionCard key={s.id || s.sessionId} userId={userId} session={s} paintingSlug={slug} />)}
              </div>
            )}
          </div>
        )}
        {/* 3b — WIP VISION (DALL-E 3 — WIP only) */}
        {status === 'wip' && (
          <div className="detail-section">
            <p className="t-micro detail-label" style={{ letterSpacing: '0.08em' }}>WIP VISION</p>
            <WipVision userId={userId} slug={slug} />
          </div>
        )}
        {/* 4 — STUDIO JOURNAL */}
        <div className="detail-section">
          <p className="t-micro detail-label" style={{ letterSpacing: '0.08em' }}>STUDIO JOURNAL</p>
          {journalSessions.length === 0 && <p className="t-small" style={{ color: 'var(--text-muted)' }}>No sessions yet.</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {journalSessions.map(s => (
              <PaintingJournalEntry key={s.version} session={s} painting={painting}
                images={paintingImages.filter(img => img.version_label === `v${s.version}`)}
                onSave={handleVersionSave} userId={userId}
                onSessionSaved={data => setMediaSessions(prev => [{ ...data, session_type: 'audio', frames: data.frameUrls?.map((url, i) => ({ frame_url: url, frame_index: i })) || [] }, ...prev])} />
            ))}
          </div>
        </div>
        {/* 4 — UNMATCHED CONVERSATIONS */}
        {unmatched.length > 0 && (
          <div className="detail-section">
            <p className="t-micro detail-label">Conversation</p>
            <ConversationThread messages={unmatched} />
          </div>
        )}
        {/* 5 — RELATED WRITING (item 28 — always shown) */}
        <div className="detail-section">
          <p className="t-micro detail-label" style={{ letterSpacing: '0.08em' }}>RELATED WRITING</p>
          {publishedBlogs.length === 0
            ? <p className="t-small" style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                No writing yet.{' '}
                <span style={{ color: 'var(--warm)', cursor: 'pointer', textDecoration: 'underline' }}
                  onClick={() => onNavigate?.('blog')}>Generate a blog post →</span>
              </p>
            : publishedBlogs.map(b => (
                <div key={b.id}>
                  <div onClick={() => setExpandedBlog(expandedBlog === b.id ? null : b.id)}
                    style={{ cursor: 'pointer', padding: '12px 0', borderBottom: '0.5px solid var(--border)' }}>
                    <p style={{ fontWeight: 500, fontSize: 14, marginBottom: 3 }}>{b.title}</p>
                    <p className="t-micro" style={{ color: 'var(--mid)', marginBottom: expandedBlog !== b.id ? 5 : 0 }}>
                      {b.word_count ? `${b.word_count}w · ` : ''}{fmt(b.created_at)}
                    </p>
                    {expandedBlog !== b.id && blogExcerpt(b.full_text) && (
                      <p className="t-micro" style={{ color: 'var(--text-muted)', lineHeight: 1.6,
                        overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {blogExcerpt(b.full_text)}…
                      </p>
                    )}
                  </div>
                  {expandedBlog === b.id && (
                    <div style={{ fontFamily: 'var(--font-serif)', fontSize: '0.95rem', lineHeight: 1.8,
                      color: 'var(--text)', padding: '16px 0', whiteSpace: 'pre-wrap' }}>
                      {b.full_text?.replace(/^#+\s*/mg, '').trim()}
                    </div>
                  )}
                </div>
              ))
          }
        </div>
        {/* 6 — ADD NOTE */}
        <div className="detail-section">
          <p className="t-micro detail-label">Add note</p>
          <div style={{ position: 'relative' }}>
            <textarea ref={noteRef} className="upload-textarea" rows={3} value={note} onChange={e => setNote(e.target.value)}
              placeholder="What happened in this session?" style={{ paddingRight: 52 }} />
            <MicButton onClick={() => toggleVoice(setNote, noteRef)} listening={listening} />
          </div>
          <button className="btn" style={{ marginTop: 'var(--space-3)' }} onClick={saveNote} disabled={!note.trim() || noteSaving}>
            {noteSaving ? 'Saving…' : 'Save note'}
          </button>
        </div>
        <div className="detail-section">
          <button className="btn btn-warm detail-companion-btn" onClick={() => onNavigate?.('upload')}>
            Talk to companion →
          </button>
        </div>
      </div>
    </div>
  )
}
