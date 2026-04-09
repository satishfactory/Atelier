import { useState } from 'react'
import { saveStudioLog } from '../lib/supabase'

const MOODS = ['focused', 'flowing', 'struggling']

export default function StudioLogEntry({ userId, wipPaintings = [], onSaved, onClose }) {
  const [mood,    setMood]    = useState('focused')
  const [note,    setNote]    = useState('')
  const [slug,    setSlug]    = useState('')
  const [saving,  setSaving]  = useState(false)

  async function handleSave() {
    if (!note.trim()) return
    setSaving(true)
    try {
      await saveStudioLog(userId, { painting_slug: slug || null, mood, note: note.trim() })
      onSaved?.({ mood, note: note.trim(), painting_slug: slug || null })
      onClose?.()
    } catch (e) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ background: 'var(--bg)', borderRadius: '16px 16px 0 0', padding: 28, width: '100%', maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem' }}>Log today's session</p>
          <button className="btn" style={{ fontSize: 12, padding: '4px 12px' }} onClick={onClose}>Close</button>
        </div>

        {/* Mood */}
        <div>
          <p className="t-micro" style={{ color: 'var(--text-muted)', marginBottom: 8 }}>How did it go?</p>
          <div style={{ display: 'flex', gap: 8 }}>
            {MOODS.map(m => (
              <button key={m} onClick={() => setMood(m)}
                style={{ flex: 1, padding: '10px 0', borderRadius: 'var(--radius-sm)', border: `1px solid ${mood === m ? 'var(--warm)' : 'var(--border)'}`,
                  background: mood === m ? 'var(--warm)' : 'var(--surface)', color: mood === m ? '#fff' : 'var(--text)',
                  fontSize: 12, fontWeight: mood === m ? 600 : 400, cursor: 'pointer', minHeight: 44, textTransform: 'capitalize' }}>
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Painting */}
        {wipPaintings.length > 0 && (
          <div>
            <p className="t-micro" style={{ color: 'var(--text-muted)', marginBottom: 8 }}>Which painting? (optional)</p>
            <select value={slug} onChange={e => setSlug(e.target.value)}
              style={{ width: '100%', fontSize: 13, padding: '8px 10px', borderRadius: 'var(--radius-sm)', minHeight: 44,
                border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}>
              <option value=''>— none —</option>
              {wipPaintings.map(p => <option key={p.slug} value={p.slug}>{p.title}</option>)}
            </select>
          </div>
        )}

        {/* Note */}
        <div>
          <p className="t-micro" style={{ color: 'var(--text-muted)', marginBottom: 8 }}>What happened in the studio?</p>
          <textarea rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="What did you work on, notice, struggle with or break through?"
            style={{ width: '100%', fontSize: 13, padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
              background: 'var(--surface)', color: 'var(--text)', resize: 'none', boxSizing: 'border-box' }} />
        </div>

        <button className="btn btn-warm" onClick={handleSave} disabled={saving || !note.trim()}
          style={{ width: '100%', padding: 14, fontSize: 14 }}>
          {saving ? 'Saving…' : 'Save log entry'}
        </button>
      </div>
    </div>
  )
}
