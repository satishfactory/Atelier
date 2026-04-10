import { useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import '../styles/design-system.css'
import { updateSessionFields } from '../lib/supabase'
import ScoreWheel from './ScoreWheel'
import { useVoiceInput, MicButton } from '../lib/useVoiceInput.jsx'
import SessionRecorder from './SessionRecorder'

function fmt(d) {
  if (!d) return d
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const DIMS = [
  { key: 'score_salience',   label: 'Salience',   color: 'var(--dim-salience)'   },
  { key: 'score_gaze',       label: 'Gaze',        color: 'var(--dim-gaze)'       },
  { key: 'score_fluency',    label: 'Fluency',     color: 'var(--dim-fluency)'    },
  { key: 'score_emotion',    label: 'Emotion',     color: 'var(--dim-emotion)'    },
  { key: 'score_complexity', label: 'Complexity',  color: 'var(--dim-complexity)' },
  { key: 'score_mirror',     label: 'Mirror',      color: 'var(--dim-mirror)'     },
  { key: 'score_colour',     label: 'Colour',      color: 'var(--dim-colour)'     },
  { key: 'score_narrative',  label: 'Narrative',   color: 'var(--dim-narrative)'  },
]

export default function PaintingJournalEntry({ session, painting, images = [], onSave, userId, onSessionSaved }) {
  const companionMsg = session.conversations?.find(c => c.role === 'companion')
  const [open, setOpen]           = useState(false)
  const [noteText, setNoteText]   = useState('')
  const [photoFile, setPhotoFile] = useState(null)
  const [saving, setSaving]       = useState(false)
  const [fields, setFields] = useState({ what_changed: session.what_changed || '', what_to_do_next: session.what_to_do_next || '' })
  async function saveField(key) { if (session.id) updateSessionFields(session.id, { [key]: fields[key] }) }
  const fileRef = useRef(null)
  const noteRef = useRef(null)
  const { listening, toggleVoice } = useVoiceInput()

  async function handleSave() {
    if (!noteText.trim() && !photoFile) return
    setSaving(true)
    try { await onSave(session, noteText, photoFile); setNoteText(''); setPhotoFile(null); setOpen(false) }
    catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: 28, marginBottom: 8 }}>

      {/* Header row: version/date + score + wheel */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <p className="t-micro" style={{ color: 'var(--warm)', fontWeight: 600, marginBottom: 6 }}>
            Version {session.version} · {fmt(session.session_date)}
          </p>
          {session.score_overall != null && (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontFamily: 'Playfair Display, serif', fontSize: 44, color: 'var(--warm)', lineHeight: 1 }}>
                {session.score_overall}
              </span>
              <span className="t-micro" style={{ color: 'var(--text-muted)' }}>/100</span>
            </div>
          )}
        </div>
        <ScoreWheel painting={painting} size={96} />
      </div>

      {/* Dimension bars */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 28px', marginBottom: 24 }}>
        {DIMS.map(d => {
          const val = painting[d.key] ?? null
          return (
            <div key={d.key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span className="t-micro" style={{ color: 'var(--text-muted)' }}>{d.label}</span>
                <span className="t-micro" style={{ fontWeight: 600, color: 'var(--text)' }}>{val ?? '—'}</span>
              </div>
              <div style={{ height: 3, background: 'var(--border)', borderRadius: 2 }}>
                <div style={{ height: 3, width: `${val ?? 0}%`, background: d.color, borderRadius: 2, transition: 'width 0.5s ease' }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Companion analysis */}
      {companionMsg && (
        <div style={{ borderLeft: '2px solid var(--warm)', paddingLeft: 16, marginBottom: 24 }}>
          <p className="t-micro" style={{ color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: 10 }}>Companion analysis</p>
          <div className="companion-response">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{companionMsg.message}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* Images */}
      {images.length > 0 && (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 16 }}>
          {images.map(img => (
            <img key={img.id} src={img.image_url} alt={img.version_label || ''}
              style={{ width: 88, height: 88, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
          ))}
        </div>
      )}

      {/* Artist note */}
      {session.artist_note && (
        <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 12 }}>
          <p className="t-small" style={{ color: 'var(--text-muted)' }}>{session.artist_note}</p>
        </div>
      )}

      {/* What changed / What to do next */}
      {[['WHAT CHANGED', 'what_changed'], ['WHAT TO DO NEXT', 'what_to_do_next']].map(([label, key]) => (
        <div key={key} style={{ marginBottom: 10 }}>
          <p className="t-micro" style={{ color:'var(--warm)', fontWeight:600, marginBottom:4, textTransform:'uppercase', letterSpacing:'0.07em' }}>{label}</p>
          <textarea rows={2} value={fields[key]} onChange={e => setFields(f => ({ ...f, [key]: e.target.value }))} onBlur={() => saveField(key)}
            placeholder="—" style={{ fontSize:12, width:'100%', boxSizing:'border-box', padding:'6px 8px', resize:'vertical',
              border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', background:'var(--surface)', color:'var(--text)' }} />
        </div>
      ))}
      {/* Add note / record session */}
      <button onClick={() => setOpen(o => !o)} className="btn" style={{ fontSize: 11, padding: '3px 10px' }}>
        {open ? 'Cancel' : '+ Add note or photo to this version'}
      </button>
      {open && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ position: 'relative' }}>
            <textarea ref={noteRef} rows={3} value={noteText} onChange={e => setNoteText(e.target.value)}
              placeholder="Note for this session…"
              style={{ fontSize: 12, padding: '6px 10px', paddingRight: 44, width: '100%', boxSizing: 'border-box',
                borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', resize: 'vertical' }} />
            <MicButton onClick={() => toggleVoice(setNoteText, noteRef)} listening={listening} />
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setPhotoFile(e.target.files?.[0] || null)} />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn" style={{ fontSize: 11 }} onClick={() => fileRef.current.click()}>
              {photoFile ? photoFile.name.slice(0, 24) : 'Attach photo'}
            </button>
            <button className="btn btn-warm" style={{ fontSize: 11 }} onClick={handleSave} disabled={saving || (!noteText.trim() && !photoFile)}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
          <p className="t-micro" style={{ color: 'var(--text-muted)', margin: '4px 0' }}>— or record a studio session —</p>
          <SessionRecorder paintingSlug={painting.slug} userId={userId} onSessionSaved={onSessionSaved} />
        </div>
      )}
    </div>
  )
}
