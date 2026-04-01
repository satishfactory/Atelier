import { useEffect, useRef, useState } from 'react'
import '../styles/design-system.css'
import { getPainting, getPaintingSubject, getSessions, getConversations, addSessionNote, setPaintingVisibility, getPaintingImages } from '../lib/supabase'
import ScoreRing from '../components/ScoreRing'
import ConversationThread from '../components/ConversationThread'

const DIMS = [
  { key: 'score_salience',   label: 'Salience',   color: 'var(--dim-salience)'   },
  { key: 'score_gaze',       label: 'Gaze',       color: 'var(--dim-gaze)'       },
  { key: 'score_fluency',    label: 'Fluency',    color: 'var(--dim-fluency)'    },
  { key: 'score_emotion',    label: 'Emotion',    color: 'var(--dim-emotion)'    },
  { key: 'score_complexity', label: 'Complexity', color: 'var(--dim-complexity)' },
  { key: 'score_mirror',     label: 'Mirror',     color: 'var(--dim-mirror)'     },
  { key: 'score_colour',     label: 'Colour',     color: 'var(--dim-colour)'     },
  { key: 'score_narrative',  label: 'Narrative',  color: 'var(--dim-narrative)'  },
]

export default function PaintingDetailScreen({ slug, onBack, onTalkToCompanion }) {
  const [painting, setPainting]     = useState(null)
  const [subject, setSubject]       = useState(null)
  const [sessions, setSessions]     = useState([])
  const [messages, setMessages]     = useState([])
  const [note, setNote]             = useState('')
  const [noteSaving, setNoteSaving] = useState(false)
  const [visibility, setVisibility] = useState(null)
  const [imgSrc, setImgSrc]         = useState(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [paintingImages, setPaintingImages] = useState([])
  const [versionLabel, setVersionLabel]     = useState('')
  const [error, setError]           = useState(null)
  const photoRef = useRef(null)

  useEffect(() => {
    Promise.all([getPainting(slug), getPaintingSubject(slug), getSessions(slug), getConversations(slug), getPaintingImages(slug)])
      .then(([p, s, ss, msgs, imgs]) => {
        setPainting(p); setSubject(s); setSessions((ss || []).reverse()); setMessages(msgs); setVisibility(p.visibility)
        setPaintingImages(imgs)
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

  async function toggleVisibility() {
    const next = visibility === 'public' ? 'private' : 'public'
    await setPaintingVisibility(slug, next).catch(() => {})
    setVisibility(next)
  }

  if (error) return <p className="t-small" style={{ padding: 'var(--space-6)', color: 'var(--coral)' }}>{error}</p>
  if (!painting) return <div className="skeleton" style={{ height: 300, margin: 'var(--space-6)', borderRadius: 'var(--radius-md)' }} />

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoUploading(true)
    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = reader.result.split(',')[1]
      try {
        const res = await fetch('http://localhost:3001/api/add-painting-image', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug, imageBase64: base64, version_label: versionLabel.trim() || undefined }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setImgSrc(data.url)
        setPaintingImages(prev => [...prev, { id: Date.now(), image_url: data.url, version_label: versionLabel.trim() || null }])
        setVersionLabel('')
      } catch (err) { alert(err.message) }
      finally { setPhotoUploading(false) }
    }
    reader.readAsDataURL(file)
  }

  const scores = { overall: painting.score_overall, salience: painting.score_salience, gaze: painting.score_gaze, fluency: painting.score_fluency, emotion: painting.score_emotion, complexity: painting.score_complexity, mirror: painting.score_mirror, colour: painting.score_colour, narrative: painting.score_narrative }

  return (
    <div className="detail-screen">

      {/* 1 HEADER */}
      <div className="detail-header">
        <button className="detail-back" onClick={onBack}>← Back</button>
        <h1 className="t-title" style={{ marginTop: 'var(--space-4)' }}>{painting.title}</h1>
        <p className="t-small" style={{ color: 'var(--text-muted)' }}>{painting.artist}{painting.year ? `, ${painting.year}` : ''}</p>
      </div>

      {/* 2 IMAGE */}
      <div className="detail-section" style={{ gap: 'var(--space-2)' }}>
        {imgSrc && (
          <img src={imgSrc} alt={painting.title} style={{ maxHeight: 320, maxWidth: 600, width: '100%', objectFit: 'contain', borderRadius: 'var(--radius-md)', margin: '0 auto', display: 'block' }} />
        )}
        {paintingImages.length > 0 && (
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginTop: 8 }}>
            {paintingImages.map(img => (
              <div key={img.id} title={img.version_label || ''} onClick={() => setImgSrc(img.image_url)}
                style={{ flexShrink: 0, cursor: 'pointer', border: imgSrc === img.image_url ? '2px solid var(--warm)' : '2px solid transparent', borderRadius: 6 }}>
                <img src={img.image_url} alt={img.version_label || ''} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 4, display: 'block' }} />
              </div>
            ))}
          </div>
        )}
        <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', marginTop: 'var(--space-2)' }}>
          <input
            type="text" value={versionLabel} onChange={e => setVersionLabel(e.target.value)}
            placeholder="Label (e.g. v2, studio shot)"
            style={{ fontSize: 12, padding: '4px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', width: 160 }}
          />
          <button className="btn" style={{ fontSize: 12 }} onClick={() => photoRef.current.click()} disabled={photoUploading}>
            {photoUploading ? 'Uploading…' : 'Add photo →'}
          </button>
        </div>
      </div>

      {/* 3 SCORES */}
      <div className="detail-section">
        <div className="detail-scores" style={{ maxWidth: 480 }}>
          <ScoreRing scores={scores} size={140} />
          <div className="detail-dimensions">
            {DIMS.map(d => (
              <div key={d.key} className="detail-dim-row" style={{ height: 28 }}>
                <span className="detail-dim-dot" style={{ background: d.color }} />
                <span className="detail-dim-label" style={{ fontSize: 12, color: 'var(--text-muted)', flex: 1 }}>{d.label}</span>
                <span className="detail-dim-value" style={{ fontSize: 12, fontWeight: 500, minWidth: 28, textAlign: 'right' }}>{painting[d.key] ?? '—'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4 SUBJECT NOTE */}
      {subject?.subject_note && (
        <div className="detail-section">
          <p className="t-micro detail-label">What this painting is about</p>
          <div className="card-dark"><p className="companion-text" style={{ color: 'var(--stone)' }}>{subject.subject_note}</p></div>
        </div>
      )}

      {/* 5 SESSION HISTORY */}
      {sessions.length > 0 && (
        <div className="detail-section">
          <p className="t-micro detail-label">Session history</p>
          {sessions.map(s => (
            <div key={s.version} className="detail-session-row">
              <div className="detail-session-meta">
                <span className="t-mono">v{s.version}</span>
                <span className="t-micro" style={{ color: 'var(--text-muted)' }}>{s.session_date}</span>
                {s.score_overall && <span className="t-small" style={{ color: 'var(--warm)', fontWeight: 500 }}>{s.score_overall}</span>}
              </div>
              {s.artist_note && <p className="t-small detail-session-note">{s.artist_note.length > 120 ? s.artist_note.slice(0, 120) + '…' : s.artist_note}</p>}
            </div>
          ))}
        </div>
      )}

      {/* 6 DIALOGUE HISTORY */}
      <div className="detail-section">
        <p className="t-micro detail-label">Conversation</p>
        <ConversationThread messages={messages} />
      </div>

      {/* 7 ADD NOTE */}
      <div className="detail-section">
        <p className="t-micro detail-label">Add note</p>
        <textarea className="upload-textarea" rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="What happened in this session?" />
        <button className="btn" style={{ marginTop: 'var(--space-3)' }} onClick={saveNote} disabled={!note.trim() || noteSaving}>
          {noteSaving ? 'Saving…' : 'Save note'}
        </button>
      </div>

      {/* 8 STATUS TOGGLE */}
      <div className="detail-section">
        <p className="t-micro detail-label">Visibility</p>
        <button className="btn" onClick={toggleVisibility}>
          {visibility === 'public' ? 'Mark as private (WIP)' : 'Mark as public (Finished)'}
        </button>
      </div>

      {/* 9 TALK TO COMPANION */}
      <div className="detail-section" style={{ paddingBottom: 'var(--space-7)' }}>
        <button className="btn btn-warm detail-companion-btn" onClick={() => onTalkToCompanion?.(painting)}>
          Talk to companion
        </button>
      </div>

    </div>
  )
}
