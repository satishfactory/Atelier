import { useRef, useState } from 'react'
import '../styles/design-system.css'

const DIMS = [
  { key: 'score_salience', label: 'Salience', color: 'var(--dim-salience)' },
  { key: 'score_gaze', label: 'Gaze', color: 'var(--dim-gaze)' },
  { key: 'score_fluency', label: 'Fluency', color: 'var(--dim-fluency)' },
  { key: 'score_emotion', label: 'Emotion', color: 'var(--dim-emotion)' },
  { key: 'score_complexity', label: 'Complexity', color: 'var(--dim-complexity)' },
  { key: 'score_mirror', label: 'Mirror', color: 'var(--dim-mirror)' },
  { key: 'score_colour', label: 'Colour', color: 'var(--dim-colour)' },
  { key: 'score_narrative', label: 'Narrative', color: 'var(--dim-narrative)' },
]

export default function PaintingJournalEntry({ session, painting, images = [], onSave }) {
  const companionMsg = session.conversations?.find(c => c.role === 'companion')
  const [open, setOpen]           = useState(false)
  const [noteText, setNoteText]   = useState('')
  const [photoFile, setPhotoFile] = useState(null)
  const [saving, setSaving]       = useState(false)
  const fileRef = useRef(null)

  async function handleSave() {
    if (!noteText.trim() && !photoFile) return
    setSaving(true)
    try { await onSave(session, noteText, photoFile); setNoteText(''); setPhotoFile(null); setOpen(false) }
    catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: 28 }}>
      <p className="t-micro" style={{ color: 'var(--warm)', marginBottom: 14, fontWeight: 600 }}>
        Version {session.version} · {session.session_date}{session.score_overall ? ` · Overall ${session.score_overall}` : ''}
      </p>
      {companionMsg && (
        <div style={{ borderLeft: '2px solid var(--warm)', paddingLeft: 16, marginBottom: 20 }}>
          <p className="companion-text" style={{ lineHeight: 1.8 }}>{companionMsg.message}</p>
        </div>
      )}
      {images.length > 0 && (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 16 }}>
          {images.map(img => (
            <img key={img.id} src={img.image_url} alt={img.version_label || ''} style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
          ))}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 20px', marginBottom: 16 }}>
        {DIMS.map(d => (
          <div key={d.key} style={{ display: 'flex', alignItems: 'center', gap: 6, height: 22 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', flex: 1 }}>{d.label}</span>
            <span style={{ fontSize: 11, fontWeight: 500 }}>{painting[d.key] ?? '—'}</span>
          </div>
        ))}
      </div>
      {session.artist_note && (
        <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 12 }}>
          <p className="t-small" style={{ color: 'var(--text-muted)' }}>{session.artist_note}</p>
        </div>
      )}
      <button onClick={() => setOpen(o => !o)} className="btn" style={{ fontSize: 11, padding: '3px 10px' }}>
        {open ? 'Cancel' : '+ Add note or photo to this version'}
      </button>
      {open && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input type="text" value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Note for this session…"
            style={{ fontSize: 12, padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }} />
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setPhotoFile(e.target.files?.[0] || null)} />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn" style={{ fontSize: 11 }} onClick={() => fileRef.current.click()}>
              {photoFile ? photoFile.name.slice(0, 24) : 'Attach photo'}
            </button>
            <button className="btn btn-warm" style={{ fontSize: 11 }} onClick={handleSave} disabled={saving || (!noteText.trim() && !photoFile)}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
