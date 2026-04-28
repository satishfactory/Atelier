import { useRef, useState } from 'react'
import { addStorySession, friendlyError } from '../lib/supabase'
import { useVoiceInput, MicButton } from '../lib/useVoiceInput.jsx'

function fmt(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function StoryJournal({ userId, slug, sessions: initial, onSessionAdded }) {
  const [sessions, setSessions] = useState(() =>
    [...(initial || [])].sort((a, b) => b.session_date.localeCompare(a.session_date))
  )
  const [date,    setDate]    = useState(new Date().toISOString().split('T')[0])
  const [notes,   setNotes]   = useState('')
  const [saving,  setSaving]  = useState(false)
  const notesRef = useRef(null)
  const { listening, toggleVoice } = useVoiceInput()

  async function addSession() {
    if (!notes.trim()) return
    setSaving(true)
    try {
      const row = await addStorySession(userId, { story_slug: slug, session_date: date, notes: notes.trim() })
      const next = [row, ...sessions].sort((a, b) => b.session_date.localeCompare(a.session_date))
      setSessions(next)
      onSessionAdded?.(row)
      setNotes('')
    } catch (e) { alert(friendlyError(e.message)) }
    finally { setSaving(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {sessions.length === 0 && (
        <p className="t-small" style={{ color: 'var(--text-muted)' }}>No journal entries yet.</p>
      )}
      {sessions.map(s => (
        <div key={s.id} style={{ borderBottom: '0.5px solid var(--border)', paddingBottom: 'var(--space-3)' }}>
          <p className="t-micro" style={{ color: 'var(--warm)', marginBottom: 4 }}>{fmt(s.session_date)}</p>
          <p className="t-small" style={{ color: 'var(--text-muted)', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
            {s.notes}
          </p>
        </div>
      ))}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', paddingTop: 'var(--space-2)' }}>
        <p className="t-micro detail-label">Add Entry</p>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', padding: '6px 10px',
            border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
            background: 'var(--surface)', color: 'var(--text)', width: 'fit-content' }} />
        <div style={{ position: 'relative' }}>
          <textarea className="upload-textarea" ref={notesRef} rows={3}
            value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Notes from this session…" style={{ paddingRight: 52 }} />
          <MicButton onClick={() => toggleVoice(setNotes, notesRef)} listening={listening} />
        </div>
        <button className="btn" style={{ alignSelf: 'flex-start' }}
          onClick={addSession} disabled={!notes.trim() || saving}>
          {saving ? 'Saving…' : 'Save Entry'}
        </button>
      </div>
    </div>
  )
}
