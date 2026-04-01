import { useEffect, useRef, useState } from 'react'
import '../styles/design-system.css'
import { getPainting, getSessions, getPaintingImages, getAllConversations, addSessionNote } from '../lib/supabase'
import PaintingJournalEntry from '../components/PaintingJournalEntry'
import ConversationThread from '../components/ConversationThread'

export default function PaintingDetailScreen({ slug, onBack, onTalkToCompanion }) {
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
  const photoRef = useRef(null)

  useEffect(() => {
    Promise.all([getPainting(slug), getSessions(slug), getPaintingImages(slug), getAllConversations(slug)])
      .then(([p, ss, imgs, convs]) => {
        setPainting(p); setStatus(p.status)
        setSessions((ss || []).reverse())
        setPaintingImages(imgs); setConversations(convs)
        setImgSrc(p.image_url || (p.thumbnail_b64 ? `data:image/jpeg;base64,${p.thumbnail_b64}` : null))
      })
      .catch(err => setError(err.message))
  }, [slug])

  async function saveNote() {
    if (!note.trim()) return
    setNoteSaving(true)
    try {
      const v = await addSessionNote(slug, note.trim())
      setSessions(prev => [...prev, { version: v, artist_note: note.trim(), session_date: new Date().toISOString().split('T')[0] }])
      setNote('')
    } catch (e) { alert(e.message) }
    finally { setNoteSaving(false) }
  }

  async function toggleStatus() {
    const next = status === 'wip' ? 'finished' : 'wip'
    try {
      const res = await fetch('http://localhost:3001/api/set-painting-status', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, status: next }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      setStatus(next)
    } catch (e) { alert(e.message) }
  }

  async function uploadImage(base64, vLabel) {
    const res = await fetch('http://localhost:3001/api/add-painting-image', {
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
        const url = await uploadImage(reader.result.split(',')[1], versionLabel.trim())
        setImgSrc(url)
        setPaintingImages(prev => [...prev, { id: Date.now(), image_url: url, version_label: versionLabel.trim() || null }])
      } catch (err) { alert(err.message) }
      finally { setPhotoUploading(false) }
    }
    reader.readAsDataURL(file)
  }

  async function handleVersionSave(session, noteText, file) {
    const today = new Date().toISOString().split('T')[0]
    if (noteText?.trim()) {
      const v = await addSessionNote(slug, noteText.trim())
      setSessions(prev => [...prev, { version: v, artist_note: noteText.trim(), session_date: today }])
    }
    if (file) {
      const base64 = await new Promise(r => { const rd = new FileReader(); rd.onload = () => r(rd.result.split(',')[1]); rd.readAsDataURL(file) })
      const url = await uploadImage(base64, `v${session.version}`)
      setPaintingImages(prev => [...prev, { id: Date.now(), image_url: url, version_label: `v${session.version}` }])
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
      {/* 1 HEADER */}
      <div className="detail-header">
        <button className="detail-back" onClick={onBack}>← Back</button>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', fontWeight: 700, marginTop: 'var(--space-4)', lineHeight: 1.2 }}>{painting.title}</h1>
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', marginTop: 'var(--space-2)', flexWrap: 'wrap' }}>
          <p className="t-small" style={{ color: 'var(--text-muted)' }}>{painting.artist}{painting.year ? `, ${painting.year}` : ''}</p>
          <span className="t-micro" style={{ color: status === 'wip' ? 'var(--warm)' : 'var(--teal)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{status === 'wip' ? 'WIP' : 'Finished'}</span>
          <button className="btn" style={{ fontSize: 11, padding: '2px 10px' }} onClick={toggleStatus}>{status === 'wip' ? 'Mark Finished' : 'Mark WIP'}</button>
        </div>
      </div>
      <div className="detail-sections-wrap">
        {/* 2 CURRENT IMAGE */}
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
              style={{ fontSize: 12, padding: '4px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}>
              {sessions.map(s => <option key={s.version} value={`v${s.version}`}>v{s.version}</option>)}
              <option value={`v${maxVersion + 1}`}>New version (v{maxVersion + 1})</option>
            </select>
            <button className="btn" style={{ fontSize: 12 }} onClick={() => photoRef.current.click()} disabled={photoUploading}>
              {photoUploading ? 'Uploading…' : 'Add photo →'}
            </button>
          </div>
        </div>
        {/* 3 CHRONOLOGICAL JOURNAL */}
        <div className="detail-section">
          <p className="t-micro detail-label" style={{ letterSpacing: '0.08em' }}>STUDIO JOURNAL</p>
          {journalSessions.length === 0 && <p className="t-small" style={{ color: 'var(--text-muted)' }}>No sessions yet.</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {journalSessions.map(s => (
              <PaintingJournalEntry key={s.version} session={s} painting={painting}
                images={paintingImages.filter(img => img.version_label === `v${s.version}`)}
                onSave={handleVersionSave} />
            ))}
          </div>
        </div>
        {/* 4 UNMATCHED CONVERSATIONS */}
        {unmatched.length > 0 && (
          <div className="detail-section">
            <p className="t-micro detail-label">Conversation</p>
            <ConversationThread messages={unmatched} />
          </div>
        )}
        {/* 5 ADD NOTE + TALK TO COMPANION */}
        <div className="detail-section">
          <p className="t-micro detail-label">Add note</p>
          <textarea className="upload-textarea" rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="What happened in this session?" />
          <button className="btn" style={{ marginTop: 'var(--space-3)' }} onClick={saveNote} disabled={!note.trim() || noteSaving}>
            {noteSaving ? 'Saving…' : 'Save note'}
          </button>
        </div>
        <div className="detail-section">
          <button className="btn btn-warm detail-companion-btn" onClick={() => onTalkToCompanion?.(painting)}>
            Talk to companion
          </button>
        </div>
      </div>
    </div>
  )
}
