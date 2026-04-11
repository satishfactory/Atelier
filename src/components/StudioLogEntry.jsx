import { useRef, useState } from 'react'
import { saveStudioLog, SERVER } from '../lib/supabase'
import { useVoiceInput, MicButton } from '../lib/useVoiceInput'

const MOODS = ['focused', 'flowing', 'struggling']

export default function StudioLogEntry({ userId, wipPaintings = [], onSaved, onClose }) {
  const [mood,         setMood]         = useState('focused')
  const [note,         setNote]         = useState('')
  const [slug,         setSlug]         = useState('')
  const [saving,       setSaving]       = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const noteRef  = useRef(null)
  const videoRef = useRef(null)
  const { listening, toggleVoice } = useVoiceInput()

  async function handleVideo(e) {
    const file = e.target.files?.[0]; if (!file) return
    setTranscribing(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`${SERVER}/api/transcribe`, { method: 'POST', body: form })
      const d   = await res.json()
      if (!res.ok) throw new Error(d.error)
      setNote(prev => prev ? `${prev} ${d.transcript}` : d.transcript)
    } catch (err) { alert(err.message) }
    finally { setTranscribing(false); e.target.value = '' }
  }

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
          <div style={{ position: 'relative' }}>
            <textarea ref={noteRef} rows={3} value={note} onChange={e => setNote(e.target.value)}
              placeholder="What did you work on, notice, struggle with or break through?"
              style={{ width: '100%', fontSize: 13, padding: '10px 12px', paddingRight: 100, borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', resize: 'none', boxSizing: 'border-box' }} />
            <div style={{ position: 'absolute', right: 8, bottom: 8, display: 'flex', gap: 6 }}>
              {/* Video button */}
              <button onClick={() => videoRef.current?.click()} disabled={transcribing} title="Record video note"
                style={{ width: 40, height: 40, borderRadius: '50%', border: 'none', background: transcribing ? 'var(--warm)' : 'var(--stone)',
                  color: 'var(--dark)', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {transcribing ? '⏳' : '🎥'}
              </button>
              <input ref={videoRef} type="file" accept="video/*,audio/*" capture="environment" style={{ display: 'none' }} onChange={handleVideo} />
              {/* Mic button */}
              <MicButton onClick={() => toggleVoice(setNote, noteRef)} listening={listening} />
            </div>
          </div>
        </div>

        <button className="btn btn-warm" onClick={handleSave} disabled={saving || !note.trim()}
          style={{ width: '100%', padding: 14, fontSize: 14 }}>
          {saving ? 'Saving…' : 'Save log entry'}
        </button>
      </div>
    </div>
  )
}
