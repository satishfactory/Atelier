import { useState } from 'react'
import '../styles/design-system.css'
import { SERVER } from '../lib/supabase'

function fmt(d) {
  if (!d) return null
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function MessageBubble({ m }) {
  const [editing, setEditing]   = useState(false)
  const [draft, setDraft]       = useState(m.message)
  const [saved, setSaved]       = useState(m.message)
  const [saving, setSaving]     = useState(false)

  async function handleSave() {
    if (!draft.trim() || draft === saved) { setEditing(false); return }
    setSaving(true)
    try {
      const res = await fetch(`${SERVER}/api/update-conversation`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: m.id, message: draft.trim() }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      setSaved(draft.trim())
      setEditing(false)
    } catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className={`conv-bubble conv-bubble--${m.role}`}>
      {editing
        ? <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={4}
              style={{ fontSize: 13, padding: '6px 10px', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', width: '100%' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-warm" style={{ fontSize: 11, padding: '3px 10px' }} onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button className="btn" style={{ fontSize: 11, padding: '3px 10px' }} onClick={() => { setDraft(saved); setEditing(false) }}>Cancel</button>
            </div>
          </div>
        : <>
            <p className={m.role === 'companion' ? 'companion-text' : 't-small'}>{saved}</p>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 4 }}>
              {m.created_at && <span className="t-micro" style={{ color: 'var(--mid)', opacity: 0.7 }}>{fmt(m.created_at)}</span>}
              {m.id && <span className="t-micro" style={{ color: 'var(--warm)', cursor: 'pointer', opacity: 0.7 }}
                onClick={() => setEditing(true)}>edit</span>}
            </div>
          </>
      }
    </div>
  )
}

export default function ConversationThread({ messages }) {
  if (!messages.length) return (
    <p className="t-small" style={{ color: 'var(--text-muted)' }}>No conversations yet. Use Talk to Companion to start.</p>
  )
  return (
    <div className="conv-thread">
      {messages.map((m, i) => <MessageBubble key={m.id || i} m={m} />)}
    </div>
  )
}
